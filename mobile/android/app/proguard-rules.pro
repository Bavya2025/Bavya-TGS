# Flutter Background & System Services
-keep class id.flutter.flutter_background_service.** { *; }
-keep class com.baseflow.geolocator.** { *; }
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-keep class com.baseflow.permissionhandler.** { *; }
-keep class io.flutter.plugins.packageinfo.** { *; }
-keep class io.flutter.plugins.urllauncher.** { *; }

# General Gson & Reflective Protection
-keep class com.google.gson.** { *; }
-keepattributes Signature, *Annotation*, EnclosingMethod, InnerClasses
-dontwarn com.google.gson.**

# Prevent stripping of MethodChannel handlers
-keep class io.flutter.embedding.engine.plugins.** { *; }
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
