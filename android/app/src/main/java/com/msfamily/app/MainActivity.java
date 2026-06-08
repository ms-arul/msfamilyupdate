package com.msfamily.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.msfamily.app.BiometricAuthPlugin;

import android.content.Intent;
import android.net.Uri;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import android.util.Log;
import android.webkit.PermissionRequest;

import com.google.firebase.messaging.FirebaseMessaging;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.ExistingPeriodicWorkPolicy;
import java.util.concurrent.TimeUnit;

import androidx.work.Constraints;
import androidx.work.NetworkType;

public class MainActivity extends BridgeActivity {
    public static boolean isAppInForeground = false;

    @Override
    public void onResume() {
        super.onResume();
        isAppInForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isAppInForeground = false;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Request high refresh rate for 120Hz display capability
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
                layoutParams.preferredRefreshRate = 120f;
                getWindow().setAttributes(layoutParams);
            }
        } catch (Exception e) {
            Log.w("MainActivity", "Failed to set 120Hz preferred refresh rate: " + e.getMessage());
        }

        // Enable hardware accelerated rendering
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // Register custom plugins
        registerPlugin(BiometricAuthPlugin.class);
        registerPlugin(MicPermissionPlugin.class);
        registerPlugin(CameraPermissionPlugin.class);
        registerPlugin(SmsReaderPlugin.class);
        registerPlugin(LocationServicePlugin.class);
        registerPlugin(TransactionCachePlugin.class);

        // Log FCM token for debugging (registration is handled by Capacitor JS layer)
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    Log.d("FCM_TOKEN", "Token: " + task.getResult());
                }
            });

        // Schedule periodic GoldRateWorker to run every 15 minutes in the background (survives app kills)
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
            PeriodicWorkRequest goldWorkRequest =
                new PeriodicWorkRequest.Builder(GoldRateWorker.class, 15, TimeUnit.MINUTES)
                    .setConstraints(constraints)
                    .addTag("GoldRateMonitor")
                    .build();
            WorkManager.getInstance(getApplicationContext()).enqueueUniquePeriodicWork(
                "GoldRateMonitorUnique",
                ExistingPeriodicWorkPolicy.KEEP,
                goldWorkRequest
            );
            Log.d("MainActivity", "Successfully scheduled periodic GoldRateWorker background monitor");
        } catch (Exception e) {
            Log.e("MainActivity", "Failed to schedule GoldRateWorker: " + e.getMessage());
        }

        // Schedule periodic LoanReminderWorker to run every 2 hours in the background (survives app kills)
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
            PeriodicWorkRequest loanWorkRequest =
                new PeriodicWorkRequest.Builder(LoanReminderWorker.class, 2, TimeUnit.HOURS)
                    .setConstraints(constraints)
                    .addTag("LoanReminderMonitor")
                    .build();
            WorkManager.getInstance(getApplicationContext()).enqueueUniquePeriodicWork(
                "LoanReminderMonitorUnique",
                ExistingPeriodicWorkPolicy.KEEP,
                loanWorkRequest
            );
            Log.d("MainActivity", "Successfully scheduled periodic LoanReminderWorker background monitor");
        } catch (Exception e) {
            Log.e("MainActivity", "Failed to schedule LoanReminderWorker: " + e.getMessage());
        }

        handlePossibleShareIntent(getIntent());
        super.onCreate(savedInstanceState);

        // Force WebView to grant WebRTC microphone permissions automatically & optimize rendering settings
        try {
            android.webkit.WebView webView = bridge.getWebView();
            webView.getSettings().setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH);
            webView.setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    request.grant(request.getResources());
                }
            });
        } catch (Exception e) {
            Log.w("MainActivity", "Failed to optimize WebView settings: " + e.getMessage());
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        handlePossibleShareIntent(intent);
        super.onNewIntent(intent);
    }

    private void handlePossibleShareIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        
        if (Intent.ACTION_SEND.equals(action) && type != null) {
            Intent deepLinkIntent = new Intent(Intent.ACTION_VIEW);
            
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    Uri deepLink = Uri.parse("msfamily://share?type=text&content=" + Uri.encode(sharedText));
                    deepLinkIntent.setData(deepLink);
                    setIntent(deepLinkIntent);
                    if (intent.getComponent() != null && !MainActivity.class.getName().equals(intent.getComponent().getClassName())) {
                        intent.setAction(Intent.ACTION_VIEW);
                        intent.setData(deepLink);
                    }
                }
            } else if (type.startsWith("image/")) {
                Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (imageUri != null) {
                    Uri fileUri = copyToCache(imageUri, ".jpg");
                    if (fileUri != null) {
                        Uri deepLink = Uri.parse("msfamily://share?type=image&uri=" + Uri.encode(fileUri.toString()));
                        deepLinkIntent.setData(deepLink);
                        setIntent(deepLinkIntent);
                        intent.setAction(Intent.ACTION_VIEW);
                        intent.setData(deepLink);
                    }
                }
            } else if ("application/pdf".equals(type) || type.endsWith("/pdf")) {
                Uri pdfUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (pdfUri != null) {
                    Uri fileUri = copyToCache(pdfUri, ".pdf");
                    if (fileUri != null) {
                        Uri deepLink = Uri.parse("msfamily://share?type=pdf&uri=" + Uri.encode(fileUri.toString()));
                        deepLinkIntent.setData(deepLink);
                        setIntent(deepLinkIntent);
                        intent.setAction(Intent.ACTION_VIEW);
                        intent.setData(deepLink);
                    }
                }
            }
        }
    }

    private Uri copyToCache(Uri contentUri, String extension) {
        try {
            InputStream is = getContentResolver().openInputStream(contentUri);
            if (is == null) return contentUri;
            File extCache = getExternalCacheDir();
            if (extCache == null) extCache = getCacheDir();
            File tempFile = new File(extCache, "shared_upload_" + System.currentTimeMillis() + extension);
            FileOutputStream os = new FileOutputStream(tempFile);
            byte[] buffer = new byte[4096];
            int length;
            while ((length = is.read(buffer)) > 0) {
                os.write(buffer, 0, length);
            }
            os.flush();
            os.close();
            is.close();
            return Uri.fromFile(tempFile);
        } catch (Exception e) {
            e.printStackTrace();
            return contentUri;
        }
    }
}
