package com.msfamily.app;

import android.Manifest;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "CameraPermission",
    permissions = {
        @Permission(
            strings = { Manifest.permission.CAMERA },
            alias = "camera"
        )
    }
)
public class CameraPermissionPlugin extends Plugin {

    @PluginMethod
    public void checkPermission(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            call.resolve();
        } else {
            requestPermissionForAlias("camera", call, "permissionCallback");
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            call.resolve();
        } else {
            call.reject("Camera permission denied");
        }
    }
}
