package com.msfamily.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class LoanReminderWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val TAG = "LoanReminderWorker"

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "━━━ LoanReminderWorker STARTED ━━━")

        val prefs = applicationContext.getSharedPreferences("SmsConfig", Context.MODE_PRIVATE)
        val urlStr = prefs.getString("url", null)
        val anonKey = prefs.getString("anonKey", null)
        var token = prefs.getString("token", null)
        val refreshToken = prefs.getString("refreshToken", null)
        val userId = prefs.getString("userId", null)

        if (urlStr.isNullOrEmpty() || anonKey.isNullOrEmpty() || userId.isNullOrEmpty()) {
            Log.w(TAG, "  ⚠️ SmsConfig credentials are not fully set up. Aborting worker.")
            return@withContext Result.success()
        }

        // Refresh JWT token if possible
        if (!refreshToken.isNullOrEmpty()) {
            val refreshedToken = refreshJwtToken(urlStr, anonKey, refreshToken)
            if (refreshedToken != null) {
                token = refreshedToken
                prefs.edit().putString("token", refreshedToken).apply()
                Log.d(TAG, "  🔑 JWT token refreshed successfully")
            } else {
                Log.w(TAG, "  ⚠️ JWT token refresh failed, trying with existing token")
            }
        }

        val bearerToken = token ?: anonKey
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

        try {
            // Fetch active loans for user
            val loansUrl = "$urlStr/rest/v1/loans?user_id=eq.$userId&status=eq.active"
            val responseJson = fetchJsonFromUrl(loansUrl, anonKey, bearerToken)
            val loansArray = JSONArray(responseJson)
            Log.d(TAG, "  📥 Fetched ${loansArray.length()} active loans from Supabase")

            for (i in 0 until loansArray.length()) {
                val loan = loansArray.getJSONObject(i)
                val loanId = loan.optString("id")
                val person = loan.optString("person", "")
                val type = loan.optString("type", "")
                val loanCategory = loan.optString("loan_category", "Standard")
                val amount = loan.optDouble("amount", 0.0)
                val paidAmount = loan.optDouble("paid_amount", 0.0)
                val lastNotificationSent = loan.optString("last_notification_sent", "")

                // Prevent duplicate notifications on the same day
                if (lastNotificationSent == todayStr) {
                    continue
                }

                val isEMI = loanCategory == "EMI"
                val isWeekly = loanCategory == "Weekly Finance"
                
                // Determine target due date
                val targetDate = if (isEMI || isWeekly) {
                    loan.optString("next_due_date", null)
                } else {
                    loan.optString("due_date", null)
                }

                if (targetDate.isNullOrEmpty()) continue

                val diff = daysUntil(targetDate) ?: continue
                Log.d(TAG, "  Loan: $person, Target: $targetDate, Diff: $diff days")

                var title = ""
                var body = ""
                val verbTamil = if (type == "lent") "${person}-இடமிருந்து பெற வேண்டிய" else "${person}-இடத்திற்கு செலுத்த வேண்டிய"
                val balanceAmount = amount - paidAmount
                val amountStr = formatFullCurrency(balanceAmount)

                if (diff < 0) {
                    title = "காலக்கெடு முடிந்தது! ⚠️"
                    body = "தாமதக் கட்டணம்: $verbTamil $amountStr காலக்கெடு முடிந்துவிட்டது. உடனே தொடர்பு கொள்ளவும்."
                } else if (diff == 0L) {
                    title = "தவணை நினைவூட்டல் (இன்று) 🔔"
                    body = "இன்று செலுத்த வேண்டிய தவணை: $verbTamil $amountStr."
                } else if (diff == 2L) {
                    title = "தவணை நினைவூட்டல் (2 நாட்களில்) 📅"
                    body = "இன்னும் 2 நாட்களில்: $verbTamil $amountStr செலுத்த வேண்டும்."
                }

                if (title.isNotEmpty() && body.isNotEmpty()) {
                    Log.d(TAG, "  🔔 Triggering notification alert for: $person ($loanId)")
                    // 1. Show native Android notification
                    showNotification(title, body, loanId)

                    // 2. Log in persistent notifications table (for notifications screen feed)
                    insertNotificationRecord(urlStr, anonKey, bearerToken, userId, title, body)

                    // 3. Update last_notification_sent in database to prevent duplicates today
                    updateLastNotificationSent(urlStr, anonKey, bearerToken, loanId, todayStr)
                }
            }
            Log.d(TAG, "━━━ LoanReminderWorker COMPLETE ━━━")
            return@withContext Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "  ❌ Error in LoanReminderWorker execution", e)
            return@withContext Result.retry()
        }
    }

    private fun fetchJsonFromUrl(urlString: String, apiKey: String, bearerToken: String): String {
        var conn: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $bearerToken")
            conn.inputStream.use { input ->
                return input.bufferedReader().use { it.readText() }
            }
        } finally {
            conn?.disconnect()
        }
    }

    private fun refreshJwtToken(urlStr: String, apiKey: String, refreshToken: String): String? {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$urlStr/auth/v1/token?grant_type=refresh_token")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("refresh_token", refreshToken)
            }

            val out = payload.toString().toByteArray(StandardCharsets.UTF_8)
            val os: OutputStream = conn.outputStream
            os.write(out)
            os.close()

            val code = conn.responseCode
            if (code in 200..299) {
                val response = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonResponse = JSONObject(response)
                val newAccessToken = jsonResponse.optString("access_token", "")
                val newRefreshToken = jsonResponse.optString("refresh_token", "")
                
                if (newRefreshToken.isNotEmpty()) {
                    val prefs = applicationContext.getSharedPreferences("SmsConfig", Context.MODE_PRIVATE)
                    prefs.edit().putString("refreshToken", newRefreshToken).apply()
                }
                
                return if (newAccessToken.isNotEmpty()) newAccessToken else null
            } else {
                val errorBody = try { conn.errorStream?.bufferedReader()?.use { it.readText() } } catch (_: Exception) { "N/A" }
                Log.e(TAG, "Token refresh failed: HTTP $code — $errorBody")
                return null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Token refresh error", e)
            return null
        } finally {
            conn?.disconnect()
        }
    }

    private fun insertNotificationRecord(
        urlStr: String,
        apiKey: String,
        bearerToken: String,
        userId: String,
        title: String,
        body: String
    ) {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$urlStr/rest/v1/notifications")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $bearerToken")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("user_id", userId)
                put("type", "warning")
                put("title", title)
                put("message", body)
                put("is_read", false)
            }

            conn.outputStream.use { os ->
                os.write(payload.toString().toByteArray(StandardCharsets.UTF_8))
            }
            val code = conn.responseCode
            Log.d(TAG, "  Notifications feed insert response: HTTP $code")
        } catch (e: Exception) {
            Log.e(TAG, "  Failed to insert notification record", e)
        } finally {
            conn?.disconnect()
        }
    }

    private fun updateLastNotificationSent(
        urlStr: String,
        apiKey: String,
        bearerToken: String,
        loanId: String,
        todayStr: String
    ) {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$urlStr/rest/v1/loans?id=eq.$loanId")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "PATCH"
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $bearerToken")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("last_notification_sent", todayStr)
            }

            conn.outputStream.use { os ->
                os.write(payload.toString().toByteArray(StandardCharsets.UTF_8))
            }
            val code = conn.responseCode
            Log.d(TAG, "  Updated last_notification_sent for loan $loanId: HTTP $code")
        } catch (e: Exception) {
            Log.e(TAG, "  Failed to update last_notification_sent", e)
        } finally {
            conn?.disconnect()
        }
    }

    private fun daysUntil(dateStr: String?): Long? {
        if (dateStr.isNullOrEmpty()) return null
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val dueDate = sdf.parse(dateStr) ?: return null
            
            val localCal = Calendar.getInstance()
            val year = localCal.get(Calendar.YEAR)
            val month = localCal.get(Calendar.MONTH)
            val day = localCal.get(Calendar.DAY_OF_MONTH)
            
            val utcCal = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
                clear()
                set(year, month, day, 0, 0, 0)
            }
            val todayDate = utcCal.time
            
            val diffMs = dueDate.time - todayDate.time
            diffMs / (1000 * 60 * 60 * 24)
        } catch (e: Exception) {
            null
        }
    }

    private fun formatFullCurrency(amount: Double): String {
        return try {
            val format = java.text.NumberFormat.getNumberInstance(Locale("en", "IN"))
            "₹${format.format(amount.toLong())}"
        } catch (e: Exception) {
            "₹${amount.toLong()}"
        }
    }

    private fun showNotification(title: String, message: String, loanId: String) {
        val channelId = "ms_family_notifications"
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "MS Family Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Custom notification alerts for MS Family"
                enableVibration(true)
                enableLights(true)
                lightColor = android.graphics.Color.parseColor("#6366f1")
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Open app on click and route to Loans
        val intent = applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)?.apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("msfamily://loans")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            loanId.hashCode(),
            intent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE else PendingIntent.FLAG_UPDATE_CURRENT
        )

        val builder = NotificationCompat.Builder(applicationContext, channelId)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(applicationContext.applicationInfo.icon)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        notificationManager.notify(loanId.hashCode(), builder.build())
    }
}
