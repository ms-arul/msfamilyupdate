package com.msfamily.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {

    /**
     * Check what security capabilities the device supports.
     * Returns: { hasDeviceLock, hasBiometric, biometricType, canAuthenticate }
     */
    @PluginMethod
    public void checkAvailability(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();

        // Check device lock (PIN/Pattern/Password)
        KeyguardManager keyguardManager = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        boolean hasDeviceLock = keyguardManager != null && keyguardManager.isDeviceSecure();
        result.put("hasDeviceLock", hasDeviceLock);

        // Check biometric availability
        BiometricManager biometricManager = BiometricManager.from(context);
        int canAuth = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);

        boolean hasBiometric = (canAuth == BiometricManager.BIOMETRIC_SUCCESS);
        boolean biometricNotEnrolled = (canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED);
        boolean biometricHardwarePresent = (canAuth != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE &&
                                            canAuth != BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE);

        result.put("hasBiometric", hasBiometric);
        result.put("biometricNotEnrolled", biometricNotEnrolled);
        result.put("biometricHardwarePresent", biometricHardwarePresent);

        // Detect biometric type
        String biometricType = "none";
        if (hasBiometric) {
            // Check fingerprint specifically
            int canFingerprint = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
            if (canFingerprint == BiometricManager.BIOMETRIC_SUCCESS) {
                // Android doesn't easily distinguish face vs fingerprint via BiometricManager,
                // but we can check if the device has fingerprint hardware
                android.content.pm.PackageManager pm = context.getPackageManager();
                if (pm.hasSystemFeature(android.content.pm.PackageManager.FEATURE_FINGERPRINT)) {
                    biometricType = "fingerprint";
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pm.hasSystemFeature(android.content.pm.PackageManager.FEATURE_FACE)) {
                    biometricType = "face";
                } else {
                    biometricType = "biometric";
                }
            }
        }
        result.put("biometricType", biometricType);
        result.put("canAuthenticate", hasBiometric || hasDeviceLock);

        call.resolve(result);
    }

    /**
     * Authenticate using device credential (PIN/Pattern/Password).
     */
    @PluginMethod
    public void authenticateWithDeviceLock(PluginCall call) {
        String title = call.getString("title", "Verify Identity");
        String subtitle = call.getString("subtitle", "Use your device PIN, pattern, or password");

        FragmentActivity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        KeyguardManager keyguardManager = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager == null || !keyguardManager.isDeviceSecure()) {
            call.reject("No device lock configured", "NO_DEVICE_LOCK");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());

        activity.runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        )
                        .build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                JSObject res = new JSObject();
                                res.put("success", true);
                                res.put("method", "deviceLock");
                                call.resolve(res);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                                    errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                                    errorCode == BiometricPrompt.ERROR_CANCELED) {
                                    call.reject("Authentication cancelled", "USER_CANCELLED");
                                } else {
                                    call.reject(errString.toString(), "AUTH_ERROR");
                                }
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                super.onAuthenticationFailed();
                                // Don't reject yet — user can retry
                            }
                        });

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                call.reject("Authentication failed: " + e.getMessage(), "AUTH_EXCEPTION");
            }
        });
    }

    /**
     * Authenticate using biometric (fingerprint/face) with device credential fallback.
     */
    @PluginMethod
    public void authenticateWithBiometric(PluginCall call) {
        String title = call.getString("title", "Biometric Authentication");
        String subtitle = call.getString("subtitle", "Use fingerprint or face to unlock");

        FragmentActivity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        BiometricManager biometricManager = BiometricManager.from(getContext());
        int canAuth = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
        
        if (canAuth == BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED) {
            call.reject("No biometric enrolled", "NO_BIOMETRIC_ENROLLED");
            return;
        }

        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            // Fallback to device lock if biometric hardware not available
            authenticateWithDeviceLock(call);
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());

        activity.runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(
                            BiometricManager.Authenticators.BIOMETRIC_WEAK |
                            BiometricManager.Authenticators.DEVICE_CREDENTIAL
                        )
                        .build();

                BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                                super.onAuthenticationSucceeded(result);
                                JSObject res = new JSObject();
                                res.put("success", true);
                                String method = "biometric";
                                if (result.getAuthenticationType() == BiometricPrompt.AUTHENTICATION_RESULT_TYPE_DEVICE_CREDENTIAL) {
                                    method = "deviceCredential";
                                }
                                res.put("method", method);
                                call.resolve(res);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                                super.onAuthenticationError(errorCode, errString);
                                if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                                    errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
                                    errorCode == BiometricPrompt.ERROR_CANCELED) {
                                    call.reject("Authentication cancelled", "USER_CANCELLED");
                                } else {
                                    call.reject(errString.toString(), "AUTH_ERROR");
                                }
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                super.onAuthenticationFailed();
                                // Don't reject — user can retry via the system prompt
                            }
                        });

                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                call.reject("Biometric authentication failed: " + e.getMessage(), "AUTH_EXCEPTION");
            }
        });
    }

    /**
     * Open device security settings so user can enroll biometrics.
     */
    @PluginMethod
    public void openSecuritySettings(PluginCall call) {
        try {
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                intent = new Intent(Settings.ACTION_BIOMETRIC_ENROLL);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                intent = new Intent(Settings.ACTION_FINGERPRINT_ENROLL);
            } else {
                intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            
            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception e) {
            // Fallback to general security settings
            try {
                Intent fallbackIntent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallbackIntent);
                
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
            } catch (Exception ex) {
                call.reject("Could not open settings: " + ex.getMessage());
            }
        }
    }
}
