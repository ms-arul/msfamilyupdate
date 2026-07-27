package com.msfamily.app

import android.content.Context
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.io.BufferedReader
import java.io.InputStreamReader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object WidgetRepository {
    private const val TAG = "WidgetRepository"

    data class FinancialData(
        val todayExpenses: Double,
        val monthlyIncome: Double,
        val monthlyExpenses: Double,
        val monthlySavings: Double,
        val budgetLimit: Double,
        val remainingBudget: Double,
        val budgetProgress: Int
    )

    data class BillData(
        val id: String,
        val isDb: Boolean,
        val title: String,
        val amount: Double,
        val dueDate: String,
        val remainingDays: Int,
        val priority: String // "High", "Medium", "Low"
    )

    data class InsightData(
        val title: String,
        val text: String,
        val type: String // "positive", "warning", "info"
    )

    // Helper: Days until due date
    fun daysUntil(dateStr: String?): Int? {
        if (dateStr.isNullOrEmpty()) return null
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val due = sdf.parse(dateStr) ?: return null
            val now = Calendar.getInstance()
            now.set(Calendar.HOUR_OF_DAY, 0)
            now.set(Calendar.MINUTE, 0)
            now.set(Calendar.SECOND, 0)
            now.set(Calendar.MILLISECOND, 0)
            val diffMs = due.time - now.timeInMillis
            (diffMs / (1000 * 60 * 60 * 24)).toInt()
        } catch (e: Exception) {
            null
        }
    }

    // Get cache credentials
    fun getCredentials(context: Context): Map<String, String?> {
        val prefs = context.getSharedPreferences("SmsConfig", Context.MODE_PRIVATE)
        return mapOf(
            "url" to prefs.getString("url", null),
            "anonKey" to prefs.getString("anonKey", null),
            "userId" to prefs.getString("userId", null),
            "token" to prefs.getString("token", null)
        )
    }

    // 1. Get Financial Data from Room DB
    suspend fun getFinancialData(context: Context): FinancialData = withContext(Dispatchers.IO) {
        val db = TransactionDatabase.getDatabase(context)
        val transactions = db.transactionDao().getAllTransactions()

        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val cal = Calendar.getInstance()
        val currentMonth = cal.get(Calendar.MONTH) // 0-indexed
        val currentYear = cal.get(Calendar.YEAR)

        var todayExpenses = 0.0
        var monthlyIncome = 0.0
        var monthlyExpenses = 0.0

        for (tx in transactions) {
            val txDate = tx.date // "YYYY-MM-DD"
            val isExpense = tx.type == "expense"
            val isIncome = tx.type == "income"

            // Today's Expenses
            if (isExpense && txDate == todayStr && tx.category != "Transfer") {
                todayExpenses += tx.amount
            }

            // Parse transaction date month/year
            try {
                val parts = txDate.split("-")
                if (parts.size >= 2) {
                    val y = parts[0].toInt()
                    val m = parts[1].toInt() - 1 // convert 1-based to 0-based
                    if (y == currentYear && m == currentMonth) {
                        if (tx.category != "Transfer") {
                            if (isExpense) monthlyExpenses += tx.amount
                            if (isIncome) monthlyIncome += tx.amount
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore parse errors
            }
        }

        // Load budget limit
        val wPrefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        val budgetLimit = wPrefs.getFloat("budget_limit", 3000f).toDouble()

        val monthlySavings = monthlyIncome - monthlyExpenses
        val remainingBudget = budgetLimit - monthlyExpenses
        val budgetProgress = if (budgetLimit > 0) ((monthlyExpenses / budgetLimit) * 100).toInt() else 0

        FinancialData(
            todayExpenses = todayExpenses,
            monthlyIncome = monthlyIncome,
            monthlyExpenses = monthlyExpenses,
            monthlySavings = monthlySavings,
            budgetLimit = budgetLimit,
            remainingBudget = remainingBudget,
            budgetProgress = budgetProgress
        )
    }

    // 2. Get Upcoming Bills (fetches Supabase, caches in SharedPreferences)
    suspend fun getUpcomingBills(context: Context): List<BillData> = withContext(Dispatchers.IO) {
        val creds = getCredentials(context)
        val urlStr = creds["url"]
        val anonKey = creds["anonKey"]
        val userId = creds["userId"]
        val token = creds["token"]

        var billsJson = ""

        if (!urlStr.isNullOrEmpty() && !anonKey.isNullOrEmpty() && !userId.isNullOrEmpty()) {
            val bearerToken = token ?: anonKey
            val loansUrl = "$urlStr/rest/v1/loans?user_id=eq.$userId&status=eq.active"
            try {
                billsJson = fetchUrl(loansUrl, anonKey, bearerToken)
                // Cache locally
                val wPrefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
                wPrefs.edit().putString("cached_bills", billsJson).apply()
            } catch (e: Exception) {
                Log.w(TAG, "Network bills fetch failed, falling back to local cache", e)
            }
        }

        // Use cache if network failed
        if (billsJson.isEmpty()) {
            val wPrefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
            billsJson = wPrefs.getString("cached_bills", "") ?: ""
        }

        val list = mutableListOf<BillData>()

        if (billsJson.isNotEmpty()) {
            try {
                val array = JSONArray(billsJson)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val id = obj.optString("id")
                    val person = obj.optString("person", "")
                    val category = obj.optString("loan_category", "EMI")
                    val amount = obj.optDouble("amount", 0.0) - obj.optDouble("paid_amount", 0.0)

                    val isEMI = category == "EMI"
                    val isWeekly = category == "Weekly Finance"
                    val targetDate = if (isEMI || isWeekly) {
                        obj.optString("next_due_date", null)
                    } else {
                        obj.optString("due_date", null)
                    }

                    if (targetDate.isNullOrEmpty()) continue
                    val remDays = daysUntil(targetDate) ?: continue

                    val priority = when {
                        remDays <= 2 -> "High"
                        remDays <= 7 -> "Medium"
                        else -> "Low"
                    }

                    list.add(
                        BillData(
                            id = id,
                            isDb = true,
                            title = if (category.isEmpty() || category == "Standard") person else "$category: $person",
                            amount = amount,
                            dueDate = targetDate,
                            remainingDays = remDays,
                            priority = priority
                        )
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse bills JSON", e)
            }
        }

        // If no bills are available, return mock defaults so user widget is populated
        if (list.isEmpty()) {
            val today = Calendar.getInstance()
            val formatOffset = { offset: Int ->
                val c = today.clone() as Calendar
                c.add(Calendar.DAY_OF_YEAR, offset)
                SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.time)
            }

            list.add(BillData("mock-1", false, "Internet (Jio Fiber)", 850.0, formatOffset(1), 1, "High"))
            list.add(BillData("mock-2", false, "Electricity (BESCOM)", 1420.0, formatOffset(3), 3, "Medium"))
            list.add(BillData("mock-3", false, "LIC Life Insurance", 4500.0, formatOffset(10), 10, "Low"))
        }

        // Sort by remaining days: nearest first
        list.sortBy { it.remainingDays }
        list
    }

    // 3. Generate Smart Insights based on local Room transactions
    suspend fun getSmartInsights(context: Context): List<InsightData> = withContext(Dispatchers.IO) {
        val db = TransactionDatabase.getDatabase(context)
        val transactions = db.transactionDao().getAllTransactions()

        val cal = Calendar.getInstance()
        val currentMonth = cal.get(Calendar.MONTH)
        val currentYear = cal.get(Calendar.YEAR)
        val currentDay = cal.get(Calendar.DAY_OF_MONTH)

        val lastMonth = if (currentMonth == 0) 11 else currentMonth - 1
        val lastMonthYear = if (currentMonth == 0) currentYear - 1 else currentYear

        var thisMonthExpenses = 0.0
        var lastMonthExpenses = 0.0

        val categorySpendsThisMonth = mutableMapOf<String, Double>()
        val categorySpendsLastMonth = mutableMapOf<String, Double>()

        for (tx in transactions) {
            val isExpense = tx.type == "expense" && tx.category != "Transfer"
            if (!isExpense) continue

            try {
                val parts = tx.date.split("-")
                if (parts.size >= 2) {
                    val y = parts[0].toInt()
                    val m = parts[1].toInt() - 1
                    if (y == currentYear && m == currentMonth) {
                        thisMonthExpenses += tx.amount
                        categorySpendsThisMonth[tx.category] = (categorySpendsThisMonth[tx.category] ?: 0.0) + tx.amount
                    } else if (y == lastMonthYear && m == lastMonth) {
                        lastMonthExpenses += tx.amount
                        categorySpendsLastMonth[tx.category] = (categorySpendsLastMonth[tx.category] ?: 0.0) + tx.amount
                    }
                }
            } catch (e: Exception) {}
        }

        val insights = mutableListOf<InsightData>()

        // Insight 1: Spending compared to last month
        if (lastMonthExpenses > 0) {
            val diffPct = ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
            if (diffPct < 0) {
                insights.add(
                    InsightData(
                        title = "Spending Decreased",
                        text = "You spent ${Math.abs(diffPct).toInt()}% less than last month at this time. Fantastic job!",
                        type = "positive"
                    )
                )
            } else if (diffPct > 10) {
                insights.add(
                    InsightData(
                        title = "Spending Spike",
                        text = "Your spending increased by ${diffPct.toInt()}% compared to last month.",
                        type = "warning"
                    )
                )
            }
        }

        // Insight 2: Budget runway
        val wPrefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE)
        val budgetLimit = wPrefs.getFloat("budget_limit", 3000f).toDouble()
        if (budgetLimit > 0) {
            val remainingBudget = budgetLimit - thisMonthExpenses
            if (remainingBudget > 0 && thisMonthExpenses > 0) {
                val dailyRate = thisMonthExpenses / currentDay
                val runwayDays = (remainingBudget / dailyRate).toInt()
                if (runwayDays < 5) {
                    insights.add(
                        InsightData(
                            title = "Budget Critical",
                            text = "Your budget is estimated to last only another $runwayDays days at current spending rate.",
                            type = "warning"
                        )
                    )
                } else {
                    insights.add(
                        InsightData(
                            title = "Budget Runway",
                            text = "Your budget should last another $runwayDays days at your current daily spending.",
                            type = "info"
                        )
                    )
                }
            }
        }

        // Insight 3: Category Spike
        var maxIncreaseCat = ""
        var maxIncreasePct = 0.0
        for ((cat, amt) in categorySpendsThisMonth) {
            val lastAmt = categorySpendsLastMonth[cat] ?: 0.0
            if (lastAmt > 200.0 && amt > lastAmt) {
                val incPct = ((amt - lastAmt) / lastAmt) * 100
                if (incPct > maxIncreasePct) {
                    maxIncreasePct = incPct
                    maxIncreaseCat = cat
                }
            }
        }
        if (maxIncreaseCat.isNotEmpty() && maxIncreasePct > 15) {
            insights.add(
                InsightData(
                    title = "Category Alert",
                    text = "$maxIncreaseCat expenses increased by ${maxIncreasePct.toInt()}% compared to last month.",
                    type = "warning"
                )
            )
        }

        // Subscriptions tip
        if (thisMonthExpenses > 10000.0) {
            insights.add(
                InsightData(
                    title = "Savings Tip",
                    text = "You can save approximately ₹2,500 by reducing unused subscriptions.",
                    type = "info"
                )
            )
        }

        // Defaults if none generated
        if (insights.isEmpty()) {
            insights.add(InsightData("Savings Tip", "Consistent saving builds big dreams. Track spends daily.", "info"))
            insights.add(InsightData("Budget Health", "Try setting a strict daily limit to stay under budget.", "info"))
        }

        insights
    }

    // Helper: Network Fetch
    private fun fetchUrl(urlStr: String, anonKey: String?, token: String?): String {
        var connection: HttpURLConnection? = null
        try {
            val url = URL(urlStr)
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.setRequestProperty("apikey", anonKey)
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.connectTimeout = 8000
            connection.readTimeout = 8000

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val sb = StringBuilder()
                var line: String?
                while (reader.readLine().also { line = it } != null) {
                    sb.append(line)
                }
                reader.close()
                return sb.toString()
            }
        } catch (e: Exception) {
            Log.e(TAG, "HTTP fetch failed: ${e.message}")
        } finally {
            connection?.disconnect()
        }
        return ""
    }
}
