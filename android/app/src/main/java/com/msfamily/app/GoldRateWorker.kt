package com.msfamily.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.abs

class GoldRateWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val TAG = "GoldRateWorker"
    private val MIN_CHANGE_THRESHOLD = 50.0 // ₹/gram
    private val ALERT_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Gold Rate background check started")
        
        try {
            // 1. Fetch live data
            val usdToInr = fetchUsdToInr()
            val goldUSD = fetchPriceUSD("XAU")
            val silverUSD = fetchPriceUSD("XAG")

            val gold24 = (goldUSD / 31.1035) * usdToInr
            val gold22 = gold24 * 0.916
            val silver = (silverUSD / 31.1035) * usdToInr

            Log.d(TAG, "Fetched prices: Gold 24K = ₹${gold24.toInt()}, Gold 22K = ₹${gold22.toInt()}, Silver = ₹${silver.toInt()} per gram")

            // 2. Load preferences
            val prefs = applicationContext.getSharedPreferences("SmsConfig", Context.MODE_PRIVATE)
            val threshold = prefs.getFloat("goldAlertThreshold", 0.0f)
            val lastKnown = prefs.getFloat("goldLastKnownPrice", 0.0f)
            val lastFired = prefs.getLong("goldAlertLastFired", 0L)
            
            val currentTime = System.currentTimeMillis()

            // 3. Save current price
            prefs.edit().putFloat("goldLastKnownPrice", gold24.toFloat()).apply()

            if (lastKnown == 0.0f) {
                Log.d(TAG, "First run - setting base price to ₹${gold24.toInt()}/g")
                return@withContext Result.success()
            }

            // Check if cooldown allows alerts
            val canFire = (currentTime - lastFired) > ALERT_COOLDOWN_MS

            if (canFire) {
                val priceDiff = gold24 - lastKnown
                val absDiff = abs(priceDiff)

                // Check 1: Significant price change
                if (absDiff >= MIN_CHANGE_THRESHOLD) {
                    val direction = if (priceDiff > 0) "📈 Increased" else "📉 Decreased"
                    val emoji = if (priceDiff > 0) "🔺" else "🔻"
                    
                    showNotification(
                        "$emoji Gold Price ${if (priceDiff > 0) "Up" else "Down"}!",
                        "Gold 24K: ₹${gold24.toInt()}/g ($direction by ₹${absDiff.toInt()}/g)"
                    )
                    prefs.edit().putLong("goldAlertLastFired", currentTime).apply()
                    return@withContext Result.success()
                }

                // Check 2: Threshold crossing
                if (threshold > 0.0f) {
                    val wasBelow = lastKnown < threshold
                    val isAbove = gold24 >= threshold
                    val wasAbove = lastKnown >= threshold
                    val isBelow = gold24 < threshold

                    if (wasBelow && isAbove) {
                        showNotification(
                            "🎯 Gold Crossed Your Target!",
                            "Gold 24K hit ₹${gold24.toInt()}/g — above your target of ₹${threshold.toInt()}/g."
                        )
                        prefs.edit().putLong("goldAlertLastFired", currentTime).apply()
                    } else if (wasAbove && isBelow) {
                        showNotification(
                            "⚠️ Gold Dropped Below Target!",
                            "Gold 24K dropped to ₹${gold24.toInt()}/g — below your target of ₹${threshold.toInt()}/g."
                        )
                        prefs.edit().putLong("goldAlertLastFired", currentTime).apply()
                    }
                }
            }

            return@withContext Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Failed background gold rate check", e)
            return@withContext Result.retry()
        }
    }

    private fun fetchJsonFromUrl(urlString: String): String {
        var conn: HttpURLConnection? = null
        try {
            val url = URL(urlString)
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.inputStream.use { input ->
                return input.bufferedReader().use { it.readText() }
            }
        } finally {
            conn?.disconnect()
        }
    }

    private fun fetchPriceUSD(symbol: String): Double {
        val jsonStr = fetchJsonFromUrl("https://api.gold-api.com/price/$symbol")
        val json = JSONObject(jsonStr)
        return json.getDouble("price")
    }

    private fun fetchUsdToInr(): Double {
        try {
            val jsonStr = fetchJsonFromUrl("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json")
            val json = JSONObject(jsonStr)
            return json.getJSONObject("usd").getDouble("inr")
        } catch (e: Exception) {
            Log.w(TAG, "Failed fetching currency exchange, fallback to 83.5", e)
            return 83.5
        }
    }

    private fun showNotification(title: String, message: String) {
        val channelId = "gold_alerts_channel"
        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Gold Price Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifies you of significant gold price fluctuations and targets"
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Open app on click
        val intent = applicationContext.packageManager.getLaunchIntentForPackage(applicationContext.packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            0,
            intent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val builder = NotificationCompat.Builder(applicationContext, channelId)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(android.R.drawable.btn_star) // Star/alert icon
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)

        notificationManager.notify(1002, builder.build())
    }
}
