package com.msfamily.app;

import android.content.Context;
import android.util.Log;
import androidx.work.Data;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMessaging";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        Map<String, String> data = remoteMessage.getData();
        if (data.containsKey("action") && "fetch_location".equals(data.get("action"))) {
            Log.d(TAG, "FCM: fetch_location request received");
            
            // Check user ID from SharedPreferences
            String userId = getSharedPreferences("SmsConfig", Context.MODE_PRIVATE)
                    .getString("userId", null);
                    
            if (userId == null) {
                userId = getSharedPreferences("ms_family_location_prefs", Context.MODE_PRIVATE)
                        .getString("tracking_user_id", null);
            }

            if (userId != null && !userId.isEmpty()) {
                Log.d(TAG, "Enqueuing BackgroundLocationWorker for user: " + userId);
                
                Data inputData = new Data.Builder()
                        .putString("user_id", userId)
                        .build();

                OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(BackgroundLocationWorker.class)
                        .setInputData(inputData)
                        .build();

                WorkManager.getInstance(getApplicationContext()).enqueue(workRequest);
            } else {
                Log.w(TAG, "No user ID found in SharedPreferences, cannot fetch location");
            }
        }
    }
}
