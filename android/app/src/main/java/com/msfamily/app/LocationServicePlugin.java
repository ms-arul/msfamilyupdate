package com.msfamily.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LocationService")
public class LocationServicePlugin extends Plugin {

    private static final String TAG = "LocationServicePlugin";

    @PluginMethod
    public void startTracking(PluginCall call) {
        String userId = call.getString("userId");
        if (userId == null || userId.isEmpty()) {
            call.reject("userId is required");
            return;
        }

        Context context = getContext();
        // Persist tracking user ID so FCM can retrieve it for on-demand fetches
        context.getSharedPreferences("ms_family_location_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("tracking_user_id", userId)
                .apply();

        Log.d(TAG, "Location tracking registered for on-demand FCM fetch (continuous service disabled) for user: " + userId);
        JSObject ret = new JSObject();
        ret.put("status", "started");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Context context = getContext();
        context.getSharedPreferences("ms_family_location_prefs", Context.MODE_PRIVATE)
                .edit()
                .remove("tracking_user_id")
                .apply();

        // Stop the legacy service if running
        try {
            Intent intent = new Intent(context, LocationForegroundService.class);
            context.stopService(intent);
        } catch (Exception ignored) {}

        Log.d(TAG, "Location tracking disabled");
        JSObject ret = new JSObject();
        ret.put("status", "stopped");
        call.resolve(ret);
    }
}
