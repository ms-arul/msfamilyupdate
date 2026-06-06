package com.msfamily.app;

import android.util.Log;

import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Helper class to store FCM tokens in Supabase via REST API.
 * Uses HttpURLConnection (no extra dependencies needed).
 */
public class SupabaseTokenHelper {

    private static final String TAG = "SUPABASE_FCM";

    // Supabase project credentials
    private static final String SUPABASE_URL = "https://clvgaanvuyyvhwrzmguf.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdmdhYW52dXl5dmh3cnptZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTgxMjksImV4cCI6MjA5MTk3NDEyOX0.npoM_ZaqGNhDAiYgRYKTs5bB6SAtFAon2L3WDShlVYk";

    /**
     * Sends the FCM token to Supabase fcm_tokens table.
     * Runs on a background thread to avoid blocking the main thread.
     *
     * @param userId The current user's ID (or device ID as fallback)
     * @param fcmToken The FCM registration token
     */
    public static void sendTokenToSupabase(final String userId, final String fcmToken) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                // Use Supabase upsert to avoid duplicates (Prefer: resolution=merge-duplicates)
                URL url = new URL(SUPABASE_URL + "/rest/v1/fcm_tokens");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setDoOutput(true);
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);

                // Set required Supabase headers
                connection.setRequestProperty("apikey", SUPABASE_ANON_KEY);
                connection.setRequestProperty("Authorization", "Bearer " + SUPABASE_ANON_KEY);
                connection.setRequestProperty("Content-Type", "application/json");
                // Upsert: if (user_id, token) already exists, update instead of failing
                connection.setRequestProperty("Prefer", "resolution=merge-duplicates");

                // Build JSON body
                JSONObject body = new JSONObject();
                body.put("user_id", userId);
                body.put("token", fcmToken);

                // Write body
                byte[] bodyBytes = body.toString().getBytes(StandardCharsets.UTF_8);
                OutputStream os = connection.getOutputStream();
                os.write(bodyBytes);
                os.flush();
                os.close();

                // Read response
                int responseCode = connection.getResponseCode();
                if (responseCode >= 200 && responseCode < 300) {
                    Log.d(TAG, "FCM token stored in Supabase successfully (HTTP " + responseCode + ")");
                } else {
                    // Read error stream for debugging
                    java.io.InputStream errorStream = connection.getErrorStream();
                    if (errorStream != null) {
                        java.io.BufferedReader reader = new java.io.BufferedReader(
                                new java.io.InputStreamReader(errorStream, StandardCharsets.UTF_8));
                        StringBuilder errorBody = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            errorBody.append(line);
                        }
                        reader.close();
                        Log.e(TAG, "Supabase error (HTTP " + responseCode + "): " + errorBody.toString());
                    } else {
                        Log.e(TAG, "Supabase error (HTTP " + responseCode + "): No error body");
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to send FCM token to Supabase", e);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }
}
