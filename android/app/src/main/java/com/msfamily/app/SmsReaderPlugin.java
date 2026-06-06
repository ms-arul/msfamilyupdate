package com.msfamily.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(strings = { Manifest.permission.RECEIVE_SMS }, alias = "receiveSms"),
        @Permission(strings = { Manifest.permission.READ_SMS }, alias = "readSms")
    }
)
public class SmsReaderPlugin extends Plugin {

    private static final String TAG = "SmsReaderPlugin";
    private static final String SMS_RECEIVED_ACTION = "android.provider.Telephony.SMS_RECEIVED";
    private BroadcastReceiver smsReceiver;
    private boolean isListening = false;

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean hasReceive = getPermissionState("receiveSms") == com.getcapacitor.PermissionState.GRANTED;
        boolean hasRead = getPermissionState("readSms") == com.getcapacitor.PermissionState.GRANTED;
        ret.put("receiveSms", hasReceive);
        ret.put("readSms", hasRead);
        ret.put("granted", hasReceive && hasRead);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        requestAllPermissions(call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean hasReceive = getPermissionState("receiveSms") == com.getcapacitor.PermissionState.GRANTED;
        boolean hasRead = getPermissionState("readSms") == com.getcapacitor.PermissionState.GRANTED;
        ret.put("receiveSms", hasReceive);
        ret.put("readSms", hasRead);
        ret.put("granted", hasReceive && hasRead);
        call.resolve(ret);
    }

    @PluginMethod
    public void setConfig(PluginCall call) {
        String url = call.getString("url");
        String key = call.getString("key");        // anon key (apikey header)
        String token = call.getString("token");    // JWT access token (Bearer)
        String refreshToken = call.getString("refreshToken"); // Refresh token for background JWT renewal
        String userId = call.getString("userId");
        
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("SmsConfig", Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        
        if (url != null) editor.putString("url", url);
        if (key != null) editor.putString("anonKey", key);   // stored as 'anonKey' – never expires
        if (key != null) editor.putString("key", key);        // legacy key
        if (token != null) editor.putString("token", token);  // JWT – short-lived, may expire
        if (refreshToken != null) editor.putString("refreshToken", refreshToken); // For background token refresh
        if (userId != null) editor.putString("userId", userId);
        editor.apply();
            
        call.resolve();
    }

    @PluginMethod
    public void setGoldAlertThreshold(PluginCall call) {
        Double price = call.getDouble("price");
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("SmsConfig", Context.MODE_PRIVATE);
        android.content.SharedPreferences.Editor editor = prefs.edit();
        if (price != null && price > 0) {
            editor.putFloat("goldAlertThreshold", price.floatValue());
        } else {
            editor.remove("goldAlertThreshold");
        }
        editor.apply();
        call.resolve();
    }

    private BroadcastReceiver localReceiver;

    @PluginMethod
    public void getAndClearPendingSms(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("PendingSmsPrefs", Context.MODE_PRIVATE);
        String currentListStr = prefs.getString("pending_sms_list", "[]");
        
        JSObject ret = new JSObject();
        try {
            ret.put("messages", new org.json.JSONArray(currentListStr));
        } catch (org.json.JSONException e) {
            ret.put("messages", new org.json.JSONArray());
        }
        
        prefs.edit().remove("pending_sms_list").apply();
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (isListening) {
            call.resolve(new JSObject().put("status", "already_listening"));
            return;
        }

        boolean hasPermission = getPermissionState("receiveSms") == com.getcapacitor.PermissionState.GRANTED;
        if (!hasPermission) {
            call.reject("SMS permission not granted");
            return;
        }

        // Listen for the local broadcast sent by SmsBackgroundReceiver
        localReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.msfamily.app.NEW_SMS_LOCAL".equals(intent.getAction())) {
                    String sender = intent.getStringExtra("sender");
                    String body = intent.getStringExtra("body");
                    long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());

                    JSObject data = new JSObject();
                    data.put("sender", sender);
                    data.put("body", body);
                    data.put("timestamp", timestamp);

                    Log.d(TAG, "Forwarding local SMS broadcast to JS: " + sender);
                    notifyListeners("smsReceived", data);
                }
            }
        };

        IntentFilter localFilter = new IntentFilter("com.msfamily.app.NEW_SMS_LOCAL");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(localReceiver, localFilter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(localReceiver, localFilter);
        }

        isListening = true;
        Log.d(TAG, "Local SMS listening started");
        call.resolve(new JSObject().put("status", "listening"));
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        if (localReceiver != null && isListening) {
            try {
                getContext().unregisterReceiver(localReceiver);
            } catch (Exception e) {
                Log.w(TAG, "Error unregistering local receiver: " + e.getMessage());
            }
            localReceiver = null;
            isListening = false;
            Log.d(TAG, "Local SMS listening stopped");
        }
        call.resolve(new JSObject().put("status", "stopped"));
    }

    @PluginMethod
    public void isListening(PluginCall call) {
        call.resolve(new JSObject().put("listening", isListening));
    }

    @Override
    protected void handleOnDestroy() {
        if (localReceiver != null && isListening) {
            try {
                getContext().unregisterReceiver(localReceiver);
            } catch (Exception e) {
                Log.w(TAG, "Error in handleOnDestroy: " + e.getMessage());
            }
            localReceiver = null;
            isListening = false;
        }
        super.handleOnDestroy();
    }
}
