import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';

class PermissionService {
  static Future<bool> checkMandatoryPermissions() async {
    // 1. Camera
    var cameraStatus = await Permission.camera.status;
    if (!cameraStatus.isGranted && !cameraStatus.isLimited && !cameraStatus.isPermanentlyDenied) {
      await Permission.camera.request();
    }

    // 2. Microphone
    var micStatus = await Permission.microphone.status;
    if (!micStatus.isGranted && !micStatus.isPermanentlyDenied) {
      await Permission.microphone.request();
    }

    // 3. Storage / Media (Android 13+ compatible)
    bool storageGranted = false;
    if (await Permission.storage.isGranted || await Permission.photos.isGranted) {
      storageGranted = true;
    } else {
      // Try photos if storage is blocked (typical for Android 13/14)
      await Permission.storage.request();
      await Permission.photos.request();
      storageGranted = await Permission.storage.isGranted || await Permission.photos.isGranted;
    }

    // 4. Location (Foreground then Always)
    var locStatus = await Permission.location.status;
    if (!locStatus.isGranted && !locStatus.isLimited && !locStatus.isPermanentlyDenied) {
      await Permission.location.request();
    }

    bool alwaysGranted = false;
    if (await Permission.location.isGranted) {
      var alwaysStatus = await Permission.locationAlways.status;
      if (!alwaysStatus.isGranted && !alwaysStatus.isPermanentlyDenied) {
        await Permission.locationAlways.request();
      }
      alwaysGranted = await Permission.locationAlways.isGranted;
    }

    // Final checks
    bool hasCamera = await Permission.camera.isGranted || await Permission.camera.isLimited;
    bool hasMic = await Permission.microphone.isGranted;
    bool hasLoc = await Permission.location.isGranted && alwaysGranted;

    return hasCamera && hasMic && storageGranted && hasLoc;
  }

  static void showPermissionMissingDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.security, color: Color(0xFFBB0633)),
            SizedBox(width: 10),
            Text('Permissions Required', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'To use the Bavya TGS application, the following permissions are mandatory for security and all-day tracking compliance:',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 15),
            const PermissionItem(label: 'Camera Access (for FRS)', isMandatory: true),
            const PermissionItem(label: 'Location Access (SELECT "ALLOW ALL THE TIME")', isMandatory: true),
            const PermissionItem(label: 'Microphone & Media Access', isMandatory: true),
            const SizedBox(height: 15),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
              ),
              child: const Text(
                'CRITICAL: If the app redirects you to App Info, you must manually enable "Location (Allow all the time)", "Camera", "Microphone", and "Storage/Photos" there.',
                style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              // Option to try again
              Navigator.pop(context);
              checkAndNavigate(context);
            },
            child: const Text('Try Again'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFBB0633),
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              await openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  static Future<void> checkAndNavigate(BuildContext context) async {
    bool allGranted = await checkMandatoryPermissions();
    if (!allGranted) {
      if (context.mounted) {
        showPermissionMissingDialog(context);
      }
    }
  }
}

class PermissionItem extends StatelessWidget {
  final String label;
  final bool isMandatory;
  const PermissionItem({super.key, required this.label, required this.isMandatory});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFFBB0633)),
          const SizedBox(width: 8),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13))),
        ],
      ),
    );
  }
}
