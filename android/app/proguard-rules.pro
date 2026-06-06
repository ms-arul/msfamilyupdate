# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ─────────────────────────────────────────────────────────────
# Capacitor / WebView
# ─────────────────────────────────────────────────────────────
# Keep JavaScript interface classes for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.msfamily.app.** { *; }
-dontwarn com.getcapacitor.**

# Keep plugin annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ─────────────────────────────────────────────────────────────
# Firebase
# ─────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ─────────────────────────────────────────────────────────────
# Room Database
# ─────────────────────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao interface * { *; }
-dontwarn androidx.room.**

# ─────────────────────────────────────────────────────────────
# Kotlin Coroutines
# ─────────────────────────────────────────────────────────────
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}
-dontwarn kotlinx.coroutines.**

# ─────────────────────────────────────────────────────────────
# AndroidX / Biometric
# ─────────────────────────────────────────────────────────────
-keep class androidx.biometric.** { *; }
-keep class androidx.work.** { *; }
-dontwarn androidx.**

# ─────────────────────────────────────────────────────────────
# JSON / Serialization
# ─────────────────────────────────────────────────────────────
-keep class org.json.** { *; }
-dontwarn org.json.**

# ─────────────────────────────────────────────────────────────
# Apache Cordova (used by capacitor-cordova-android-plugins)
# ─────────────────────────────────────────────────────────────
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# ─────────────────────────────────────────────────────────────
# Keep line numbers for better crash reports
# ─────────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
