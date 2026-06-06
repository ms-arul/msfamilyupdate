package com.msfamily.app

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

/**
 * Background worker that parses an incoming bank SMS and syncs it to Supabase.
 *
 * Fixes applied:
 * - Consistent sms_reference format matching JS layer: "SMS-{amount}-{date}-{bankName}"
 * - Skip Supabase sync when userId is empty (RLS would reject it anyway)
 * - Improved logging at every stage
 * - Proper error handling and retry semantics
 */
class SmsSyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "SmsSyncWorker"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val sender = inputData.getString("sender") ?: run {
            Log.e(TAG, "Missing 'sender' in input data. Aborting.")
            return@withContext Result.failure()
        }
        val body = inputData.getString("body") ?: run {
            Log.e(TAG, "Missing 'body' in input data. Aborting.")
            return@withContext Result.failure()
        }
        val timestamp = inputData.getLong("timestamp", System.currentTimeMillis())

        Log.d(TAG, "━━━ SmsSyncWorker STARTED ━━━")
        Log.d(TAG, "  Sender: $sender")
        Log.d(TAG, "  Body preview: ${body.take(80)}...")
        Log.d(TAG, "  Timestamp: $timestamp")

        // 1. Parse the SMS
        val parsed = SmsParserEngine.parse(sender, body)
        if (parsed == null) {
            Log.d(TAG, "  ⏭ SMS is not a valid banking transaction. Worker done.")
            return@withContext Result.success()
        }

        Log.d(TAG, "  ✅ Parsed: Amount=${parsed.amount}, Type=${parsed.transactionType}, Bank=${parsed.bankName}")
        Log.d(TAG, "  Merchant=${parsed.merchantName ?: "N/A"}, Ref=${parsed.referenceNumber ?: "N/A"}")

        // 2. Generate consistent sms_reference (matches JS-side format)
        val sdfDate = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val sdfDateTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        val dateStr = sdfDate.format(Date(timestamp))
        val createdAtStr = sdfDateTime.format(Date(timestamp))
        
        val amountStr = if (parsed.amount % 1.0 == 0.0) parsed.amount.toLong().toString() else parsed.amount.toString()
        val smsReference = parsed.referenceNumber 
            ?: "SMS-${amountStr}-${dateStr}-${parsed.bankName.replace("\\s+".toRegex(), "")}"
        Log.d(TAG, "  🔗 SMS Reference: $smsReference")

        // 3. Cache to Room DB
        val db = TransactionDatabase.getDatabase(applicationContext)
        val transactionId = UUID.randomUUID().toString()

        val entity = TransactionEntity(
            id = transactionId,
            amount = parsed.amount,
            category = parsed.suggestedCategory,
            type = parsed.transactionType,
            date = dateStr,
            notes = "Auto-detected: ${parsed.bankName}${parsed.merchantName?.let { " • $it" } ?: ""}\n---\n$body",
            memberId = "", // Will be populated from config
            memberName = "You",
            proofUrl = null,
            source = "sms",
            bankName = parsed.bankName,
            merchantName = parsed.merchantName,
            smsConfidence = parsed.confidence,
            smsReference = smsReference,
            createdAt = createdAtStr,
            synced = false
        )

        try {
            val insertResult = db.transactionDao().insertIgnore(entity)
            if (insertResult == -1L) {
                Log.d(TAG, "  ⏭ Transaction already exists in Room (smsReference dedup). Skipping.")
                return@withContext Result.success()
            }
            Log.d(TAG, "  💾 Cached transaction in Room DB (id: $transactionId)")
        } catch (e: Exception) {
            Log.e(TAG, "  ❌ Failed to cache transaction in Room: ${e.message}")
        }

        // 4. Load Supabase config
        val prefs = applicationContext.getSharedPreferences("SmsConfig", Context.MODE_PRIVATE)
        val urlStr = prefs.getString("url", null)
        val anonKey = prefs.getString("anonKey", null)
        var token = prefs.getString("token", null)
        val refreshToken = prefs.getString("refreshToken", null)
        val userId = prefs.getString("userId", null)

        if (urlStr.isNullOrEmpty() || anonKey.isNullOrEmpty()) {
            Log.w(TAG, "  ⚠️ SmsConfig not set (no URL or anonKey). Saved to Room only.")
            showNotification(parsed.amount, parsed.transactionType, parsed.bankName)
            return@withContext Result.success()
        }

        if (userId.isNullOrEmpty()) {
            Log.w(TAG, "  ⚠️ userId not set in SmsConfig. Cannot sync to Supabase (RLS would reject).")
            Log.w(TAG, "     Transaction saved to Room cache. Will sync when app opens.")
            showNotification(parsed.amount, parsed.transactionType, parsed.bankName)
            return@withContext Result.success()
        }

        // Update memberId in entity now that we have userId
        val updatedEntity = entity.copy(memberId = userId)
        try {
            db.transactionDao().insertAll(listOf(updatedEntity))
            Log.d(TAG, "  💾 Updated Room entity with memberId=$userId")
        } catch (e: Exception) {
            Log.e(TAG, "  ⚠️ Failed to update member_id in Room: ${e.message}")
        }

        // 5. Refresh JWT token if possible
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

        // 6. Sync to Supabase
        val bearerToken = token ?: anonKey
        Log.d(TAG, "  📤 Syncing to Supabase...")
        var success = doHttpSync(urlStr, anonKey, bearerToken, updatedEntity)
        
        if (!success && token != null && token != anonKey) {
            Log.w(TAG, "  ⚠️ JWT sync failed, retrying with anon key only")
            success = doHttpSync(urlStr, anonKey, anonKey, updatedEntity)
        }

        if (success) {
            Log.d(TAG, "  ✅ Successfully synced transaction to Supabase")
            // Mark as synced in Room
            try {
                db.transactionDao().markSynced(updatedEntity.id)
            } catch (e: Exception) {
                Log.w(TAG, "  ⚠️ Failed to mark as synced in Room: ${e.message}")
            }
        } else {
            Log.e(TAG, "  ❌ Failed to sync to Supabase. Saved in Room for next app open.")
        }

        // Always show notification
        showNotification(parsed.amount, parsed.transactionType, parsed.bankName)
        Log.d(TAG, "━━━ SmsSyncWorker COMPLETE ━━━")

        return@withContext Result.success()
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

    private fun doHttpSync(urlStr: String, apiKey: String, bearerToken: String, entity: TransactionEntity): Boolean {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$urlStr/rest/v1/transactions?on_conflict=sms_reference")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.setRequestProperty("apikey", apiKey)
            conn.setRequestProperty("Authorization", "Bearer $bearerToken")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates,return=minimal")
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("id", entity.id)
                put("amount", entity.amount)
                put("category", entity.category)
                put("type", entity.type)
                put("date", entity.date)
                put("notes", entity.notes)
                put("member_id", entity.memberId)
                put("source", "sms")
                put("bank_name", entity.bankName)
                put("merchant_name", entity.merchantName)
                put("sms_confidence", entity.smsConfidence)
                put("sms_reference", entity.smsReference)
            }

            Log.d(TAG, "  HTTP payload: ${payload.toString().take(200)}...")

            val out = payload.toString().toByteArray(StandardCharsets.UTF_8)
            val os: OutputStream = conn.outputStream
            os.write(out)
            os.close()

            val code = conn.responseCode
            Log.d(TAG, "  Supabase response: HTTP $code")
            
            if (code !in 200..299) {
                val errorBody = try { conn.errorStream?.bufferedReader()?.use { it.readText() } } catch (_: Exception) { "N/A" }
                Log.e(TAG, "  Supabase error body: $errorBody")
            }
            
            return code in 200..299
        } catch (e: Exception) {
            Log.e(TAG, "HTTP sync error", e)
            return false
        } finally {
            conn?.disconnect()
        }
    }

    private fun showNotification(amount: Double, type: String, bankName: String) {
        val groupKey = "com.msfamily.app.SMS_TRANSACTIONS"
        val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
        val timeStr = timeFormat.format(Date())
        val sign = if (type == "income") "+" else "-"
        val categoryLabel = if (type == "income") "Received" else "Spent"

        val compactTitle = "💰 $sign₹${amount.toLong()} · $bankName · $categoryLabel · $timeStr"
        val compactBody = "Transaction auto-recorded from bank SMS"

        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        val channelId = "sms_transaction_channel"

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                channelId,
                "SMS Transactions",
                android.app.NotificationManager.IMPORTANCE_DEFAULT
            )
            notificationManager.createNotificationChannel(channel)
        }

        val intent = android.content.Intent(applicationContext, MainActivity::class.java).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = android.app.PendingIntent.getActivity(
            applicationContext, 0, intent, android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val builder = androidx.core.app.NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(applicationContext.applicationInfo.icon)
            .setContentTitle(compactTitle)
            .setContentText(compactBody)
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setGroup(groupKey)
            .setAutoCancel(true)

        val summaryBuilder = androidx.core.app.NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(applicationContext.applicationInfo.icon)
            .setContentTitle("MS Family SMS Sync")
            .setContentText("New transactions automatically saved")
            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
            .setGroup(groupKey)
            .setGroupSummary(true)
            .setAutoCancel(true)

        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
        notificationManager.notify(groupKey.hashCode(), summaryBuilder.build())
    }
}
