package com.msfamily.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
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
import java.util.TimeZone

class BackgroundLocationWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val supabaseUrl = "https://clvgaanvuyyvhwrzmguf.supabase.co"
    private val supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdmdhYW52dXl5dmh3cnptZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTgxMjksImV4cCI6MjA5MTk3NDEyOX0.npoM_ZaqGNhDAiYgRYKTs5bB6SAtFAon2L3WDShlVYk"

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val userId = inputData.getString("user_id") ?: return@withContext Result.failure()
        
        Log.d("BackgroundLocWorker", "Starting location fetch for user: $userId")
        
        // Promote to foreground service to show "Updating location..." notification
        try {
            setForeground(getForegroundInfo())
        } catch (e: Exception) {
            Log.e("BackgroundLocWorker", "Failed to set worker in foreground: ${e.message}")
        }

        // Fetch precise GPS location
        val location = LocationRepository.getCurrentLocation(applicationContext)
        if (location == null) {
            Log.e("BackgroundLocWorker", "Failed to retrieve location")
            return@withContext Result.failure()
        }

        Log.d("BackgroundLocWorker", "Location fetched: ${location.latitude}, ${location.longitude}")

        // Push to Supabase
        val success = upsertToSupabase(userId, location)
        return@withContext if (success) {
            Result.success()
        } else {
            Result.retry()
        }
    }

    private fun upsertToSupabase(userId: String, loc: android.location.Location): Boolean {
        var conn: HttpURLConnection? = null
        try {
            val url = URL("$supabaseUrl/rest/v1/user_locations")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            // Headers
            conn.setRequestProperty("apikey", supabaseAnonKey)
            conn.setRequestProperty("Authorization", "Bearer $supabaseAnonKey")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates")

            // ISO 8601 timestamp in UTC
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }

            val body = JSONObject().apply {
                put("user_id", userId)
                put("latitude", loc.latitude)
                put("longitude", loc.longitude)
                put("accuracy", if (loc.hasAccuracy()) loc.accuracy else JSONObject.NULL)
                put("speed", if (loc.hasSpeed()) loc.speed else JSONObject.NULL)
                put("heading", if (loc.hasBearing()) loc.bearing else JSONObject.NULL)
                put("altitude", if (loc.hasAltitude()) loc.altitude else JSONObject.NULL)
                put("battery_level", getBatteryLevel())
                put("is_sharing", true)
                put("updated_at", sdf.format(Date()))
            }

            val bodyBytes = body.toString().toByteArray(StandardCharsets.UTF_8)
            val os: OutputStream = conn.outputStream
            os.write(bodyBytes)
            os.flush()
            os.close()

            val code = conn.responseCode
            Log.d("BackgroundLocWorker", "Supabase location update HTTP code: $code")
            return code in 200..299
        } catch (e: Exception) {
            Log.e("BackgroundLocWorker", "Failed to upsert location to Supabase: ${e.message}", e)
            return false
        } finally {
            conn?.disconnect()
        }
    }

    private fun getBatteryLevel(): Int {
        return try {
            val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
            val batteryStatus = applicationContext.registerReceiver(null, filter)
            if (batteryStatus != null) {
                val level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
                if (level >= 0 && scale > 0) {
                    Math.round(level * 100f / scale)
                } else 100
            } else 100
        } catch (e: Exception) {
            Log.w("BackgroundLocWorker", "Could not read battery level: ${e.message}")
            100
        }
    }

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val channelId = "location_fetch_channel"
        val notificationId = 9002

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channel = NotificationChannel(
                channelId,
                "Location Update Requests",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows temporary notification during location updates"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setContentTitle("MS Family")
            .setContentText("Updating location...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

        return ForegroundInfo(notificationId, notification)
    }
}
