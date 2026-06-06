package com.msfamily.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Receives SMS messages in the background even when the app is closed.
 * Saves potential bank SMS to SharedPreferences to be processed by the
 * Capacitor app when it is next opened.
 *
 * Fixes applied:
 * - goAsync() for extended processing time
 * - Dedup check before enqueuing SmsSyncWorker
 * - enqueueUniqueWork to prevent duplicate workers
 * - Comprehensive logging at every stage
 */
public class SmsBackgroundReceiver extends BroadcastReceiver {
    private static final String TAG = "SmsBackgroundReceiver";
    private static final String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";
    private static final String PREF_NAME = "PendingSmsPrefs";
    private static final String KEY_PENDING_SMS = "pending_sms_list";
    private static final String DEDUP_PREF_NAME = "SmsDedupPrefs";
    private static final String KEY_PROCESSED_HASHES = "processed_sms_hashes";
    private static final int MAX_DEDUP_HASHES = 300;

    @Override
    public void onReceive(Context context, Intent intent) {
        // Use goAsync to get more processing time (up to 10s instead of 5s)
        final PendingResult pendingResult = goAsync();

        try {
            if (!SMS_RECEIVED_ACTION.equals(intent.getAction())) {
                Log.d(TAG, "Ignoring non-SMS intent action: " + intent.getAction());
                return;
            }

            Bundle bundle = intent.getExtras();
            if (bundle == null) {
                Log.w(TAG, "Received SMS intent with null extras bundle");
                return;
            }

            Object[] pdus = (Object[]) bundle.get("pdus");
            if (pdus == null || pdus.length == 0) {
                Log.w(TAG, "Received SMS intent with null/empty PDUs");
                return;
            }

            String format = bundle.getString("format");
            StringBuilder fullMessage = new StringBuilder();
            String sender = "";

            for (Object pdu : pdus) {
                SmsMessage sms;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    sms = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    sms = SmsMessage.createFromPdu((byte[]) pdu);
                }

                if (sms != null) {
                    sender = sms.getOriginatingAddress();
                    fullMessage.append(sms.getMessageBody());
                }
            }

            if (sender == null || sender.isEmpty()) {
                Log.w(TAG, "SMS sender address is null/empty. Skipping.");
                return;
            }

            String body = fullMessage.toString();
            if (body.isEmpty()) {
                Log.w(TAG, "SMS body is empty. Skipping.");
                return;
            }

            String lowerBody = body.toLowerCase();
            Log.d(TAG, "━━━ SMS RECEIVED ━━━");
            Log.d(TAG, "  Sender: " + sender);
            Log.d(TAG, "  Body length: " + body.length());
            Log.d(TAG, "  Preview: " + body.substring(0, Math.min(body.length(), 80)) + "...");
            
            // Quick heuristic to filter bank transaction SMS
            boolean looksLikeBank = lowerBody.contains("debited") || lowerBody.contains("credited") || 
                                   lowerBody.contains("spent") || lowerBody.contains("rs.") || 
                                   lowerBody.contains("inr") || lowerBody.contains("a/c") ||
                                   lowerBody.contains("upi") || lowerBody.contains("deducted") ||
                                   lowerBody.contains("trf to") || lowerBody.contains("received") ||
                                   lowerBody.contains("₹") || lowerBody.contains("paid") ||
                                   lowerBody.contains("transferred") || lowerBody.contains("withdrawn") ||
                                   lowerBody.contains("emi") || lowerBody.contains("payment") ||
                                   lowerBody.contains("purchase") || lowerBody.contains("salary") ||
                                   lowerBody.contains("deposited") || lowerBody.contains("refund");
                                   
            boolean looksLikeOtp = lowerBody.contains("otp") || lowerBody.contains("verification code") ||
                                  lowerBody.contains("login") || lowerBody.contains("one time password") ||
                                  lowerBody.contains("security code");

            if (!looksLikeBank) {
                Log.d(TAG, "  ⏭ Skipped: Not a bank SMS (no transaction keywords found)");
                return;
            }

            if (looksLikeOtp) {
                Log.d(TAG, "  ⏭ Skipped: OTP/verification message detected");
                return;
            }

            // Dedup check — prevent processing the same SMS twice
            String smsHash = computeSmsHash(sender, body);
            if (isAlreadyProcessed(context, smsHash)) {
                Log.d(TAG, "  ⏭ Skipped: Duplicate SMS (hash: " + smsHash + ")");
                return;
            }
            markAsProcessed(context, smsHash);

            Log.d(TAG, "  ✅ Bank SMS confirmed. Processing...");
            long timestamp = System.currentTimeMillis();
            
            // 1. Enqueue unique SmsSyncWorker — unique tag prevents duplicate workers
            String uniqueWorkTag = "sms_sync_" + smsHash;
            androidx.work.Data inputData = new androidx.work.Data.Builder()
                    .putString("sender", sender)
                    .putString("body", body)
                    .putLong("timestamp", timestamp)
                    .build();

            androidx.work.OneTimeWorkRequest workRequest = new androidx.work.OneTimeWorkRequest.Builder(SmsSyncWorker.class)
                    .setInputData(inputData)
                    .addTag(uniqueWorkTag)
                    .build();

            androidx.work.WorkManager.getInstance(context.getApplicationContext())
                .enqueueUniqueWork(
                    uniqueWorkTag,
                    androidx.work.ExistingWorkPolicy.KEEP,  // KEEP = skip if already enqueued
                    workRequest
                );
            Log.d(TAG, "  📤 SmsSyncWorker enqueued (tag: " + uniqueWorkTag + ")");
            
            // 2. Save to SharedPreferences for JS layer pickup on next app open
            savePendingSms(context, sender, body, timestamp);
            Log.d(TAG, "  💾 Saved to pending SMS queue");
            
            // 3. Broadcast locally for real-time foreground plugin
            Intent localIntent = new Intent("com.msfamily.app.NEW_SMS_LOCAL");
            localIntent.putExtra("sender", sender);
            localIntent.putExtra("body", body);
            localIntent.putExtra("timestamp", timestamp);
            localIntent.setPackage(context.getPackageName());
            context.sendBroadcast(localIntent);
            Log.d(TAG, "  📡 Local broadcast sent");
            Log.d(TAG, "━━━ SMS PROCESSING COMPLETE ━━━");

        } catch (Exception e) {
            Log.e(TAG, "Critical error in SMS receiver", e);
        } finally {
            pendingResult.finish();
        }
    }

    /**
     * Compute a stable hash for SMS dedup. Uses sender + cleaned body.
     */
    private String computeSmsHash(String sender, String body) {
        String cleanBody = body.replaceAll("\\s+", " ").trim();
        String input = sender + "_" + cleanBody;
        int hash = 0;
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            hash = (hash << 5) - hash + c;
            hash |= 0; // 32-bit
        }
        return Integer.toString(hash, 36);
    }

    /**
     * Check if this SMS hash was already processed recently.
     */
    private boolean isAlreadyProcessed(Context context, String hash) {
        SharedPreferences prefs = context.getSharedPreferences(DEDUP_PREF_NAME, Context.MODE_PRIVATE);
        Set<String> processed = prefs.getStringSet(KEY_PROCESSED_HASHES, new HashSet<>());
        return processed.contains(hash);
    }

    /**
     * Mark this SMS hash as processed.
     */
    private void markAsProcessed(Context context, String hash) {
        SharedPreferences prefs = context.getSharedPreferences(DEDUP_PREF_NAME, Context.MODE_PRIVATE);
        Set<String> processed = new HashSet<>(prefs.getStringSet(KEY_PROCESSED_HASHES, new HashSet<>()));
        processed.add(hash);
        
        // Trim if too large — remove oldest entries by clearing and re-adding tail
        if (processed.size() > MAX_DEDUP_HASHES) {
            String[] arr = processed.toArray(new String[0]);
            processed.clear();
            int start = arr.length - MAX_DEDUP_HASHES;
            for (int i = start; i < arr.length; i++) {
                processed.add(arr[i]);
            }
        }
        
        prefs.edit().putStringSet(KEY_PROCESSED_HASHES, processed).apply();
    }

    private void savePendingSms(Context context, String sender, String body, long timestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
            String currentListStr = prefs.getString(KEY_PENDING_SMS, "[]");
            JSONArray array = new JSONArray(currentListStr);
            
            JSONObject obj = new JSONObject();
            obj.put("sender", sender);
            obj.put("body", body);
            obj.put("timestamp", timestamp);
            
            array.put(obj);
            
            // Limit pending queue to 50 entries to prevent unbounded growth
            while (array.length() > 50) {
                array.remove(0);
            }
            
            prefs.edit().putString(KEY_PENDING_SMS, array.toString()).apply();
            Log.d(TAG, "Saved SMS to pending list. Queue size: " + array.length());
        } catch (JSONException e) {
            Log.e(TAG, "Failed to save pending SMS to SharedPreferences list", e);
        }
    }
}
