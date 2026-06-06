package com.msfamily.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Foreground Service that continues to track the user's location
 * even when the app is swiped closed from the recents menu.
 *
 * It uses Google's FusedLocationProviderClient (efficient, battery-aware)
 * and pushes updates directly to Supabase via REST, bypassing the WebView.
 */
public class LocationForegroundService extends Service {

    private static final String TAG = "LocationFGService";
    private static final String CHANNEL_ID = "ms_family_tracking";
    private static final int NOTIFICATION_ID = 9001;

    // Supabase credentials (same as SupabaseTokenHelper)
    private static final String SUPABASE_URL = "https://clvgaanvuyyvhwrzmguf.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdmdhYW52dXl5dmh3cnptZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTgxMjksImV4cCI6MjA5MTk3NDEyOX0.npoM_ZaqGNhDAiYgRYKTs5bB6SAtFAon2L3WDShlVYk";

    private static final String PREFS_NAME = "ms_family_location_prefs";
    private static final String KEY_USER_ID = "tracking_user_id";

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private ExecutorService executor;
    private String userId;

    @Override
    public void onCreate() {
        super.onCreate();
        executor = Executors.newSingleThreadExecutor();
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Get user ID from intent or SharedPreferences
        if (intent != null && intent.hasExtra("user_id")) {
            userId = intent.getStringExtra("user_id");
            // Persist so we can recover after system restart
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                    .edit()
                    .putString(KEY_USER_ID, userId)
                    .apply();
        } else {
            userId = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                    .getString(KEY_USER_ID, null);
        }

        if (userId == null || userId.isEmpty()) {
            Log.w(TAG, "No user ID provided, stopping service.");
            stopSelf();
            return START_NOT_STICKY;
        }

        // Start as foreground with a persistent notification
        startForeground(NOTIFICATION_ID, buildNotification());

        // Begin location updates
        startLocationUpdates();

        Log.d(TAG, "Location tracking started for user: " + userId);

        // If system kills us, restart with the last intent
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
            locationCallback = null;
        }
        if (executor != null && !executor.isShutdown()) {
            executor.shutdownNow();
        }
        Log.d(TAG, "Location tracking stopped.");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    // ────────────────────────────────────────────────────────
    // Location Updates
    // ────────────────────────────────────────────────────────

    private void startLocationUpdates() {
        // Remove any existing callback first
        if (locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
        }

        LocationRequest request = new LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY, 30_000) // every 30 seconds
                .setMinUpdateIntervalMillis(15_000)       // fastest: 15 seconds
                .setMinUpdateDistanceMeters(10f)           // or if moved 10m
                .setWaitForAccurateLocation(false)
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null || result.getLastLocation() == null) return;
                android.location.Location loc = result.getLastLocation();

                Log.d(TAG, String.format("Location update: %.6f, %.6f (accuracy: %.1fm)",
                        loc.getLatitude(), loc.getLongitude(), loc.getAccuracy()));

                // Push to Supabase on background thread
                executor.execute(() -> upsertToSupabase(loc));
            }
        };

        try {
            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission not granted", e);
            stopSelf();
        }
    }

    // ────────────────────────────────────────────────────────
    // Supabase REST Upsert
    // ────────────────────────────────────────────────────────

    private void upsertToSupabase(android.location.Location loc) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(SUPABASE_URL + "/rest/v1/user_locations");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            // Headers
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates");

            // ISO 8601 timestamp
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("UTC"));

            JSONObject body = new JSONObject();
            body.put("user_id", userId);
            body.put("latitude", loc.getLatitude());
            body.put("longitude", loc.getLongitude());
            body.put("accuracy", loc.hasAccuracy() ? loc.getAccuracy() : JSONObject.NULL);
            body.put("speed", loc.hasSpeed() ? loc.getSpeed() : JSONObject.NULL);
            body.put("heading", loc.hasBearing() ? loc.getBearing() : JSONObject.NULL);
            body.put("altitude", loc.hasAltitude() ? loc.getAltitude() : JSONObject.NULL);
            body.put("battery_level", getBatteryLevel());
            body.put("is_sharing", true);
            body.put("updated_at", sdf.format(new Date()));

            byte[] bodyBytes = body.toString().getBytes(StandardCharsets.UTF_8);
            OutputStream os = conn.getOutputStream();
            os.write(bodyBytes);
            os.flush();
            os.close();

            int code = conn.getResponseCode();
            if (code >= 200 && code < 300) {
                Log.d(TAG, "Location upserted to Supabase (HTTP " + code + ")");
            } else {
                // Read error for debugging
                java.io.InputStream errStream = conn.getErrorStream();
                if (errStream != null) {
                    java.io.BufferedReader reader = new java.io.BufferedReader(
                            new java.io.InputStreamReader(errStream, StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);
                    reader.close();
                    Log.e(TAG, "Supabase error (HTTP " + code + "): " + sb);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to upsert location", e);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    // ────────────────────────────────────────────────────────
    // Battery Level
    // ────────────────────────────────────────────────────────

    private int getBatteryLevel() {
        try {
            IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = registerReceiver(null, filter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    return Math.round(level * 100f / scale);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not read battery level", e);
        }
        return 100;
    }

    // ────────────────────────────────────────────────────────
    // Notification
    // ────────────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Live Location Tracking",
                    NotificationManager.IMPORTANCE_LOW // Low = silent, no sound
            );
            channel.setDescription("Keeps your location shared with family members");
            channel.setShowBadge(false);

            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) mgr.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("MS Family · Live Tracking")
                .setContentText("Sharing your location with family")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }
}
