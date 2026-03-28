import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/material.dart';

class PermissionService {
  /// Single entry point for all mandatory permissions.
  /// Sequential requests are required for Android 11+ (Foreground then Always).
  static Future<bool> checkMandatoryPermissions() async {
    // 1. Camera (Checked once)
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
    if (!(await Permission.storage.isGranted || await Permission.photos.isGranted)) {
      await Permission.storage.request();
      await Permission.photos.request();
    }

    // 4. Location (The "Double Ask" is a system requirement: Foreground first, then Always)
    var locStatus = await Permission.location.status;
    if (!locStatus.isGranted && !locStatus.isLimited && !locStatus.isPermanentlyDenied) {
      await Permission.location.request();
    }

    // Only if Foreground is granted, we ask for Always (Background)
    bool alwaysGranted = false;
    if (await Permission.location.isGranted) {
      var alwaysStatus = await Permission.locationAlways.status;
      if (!alwaysStatus.isGranted && !alwaysStatus.isPermanentlyDenied) {
        // This is the second system prompt required for tracking
        await Permission.locationAlways.request();
      }
      alwaysGranted = await Permission.locationAlways.isGranted;
    }

    // Final consolidated check
    bool hasCamera = await Permission.camera.isGranted || await Permission.camera.isLimited;
    bool hasMic = await Permission.microphone.isGranted;
    bool hasLoc = await Permission.location.isGranted && alwaysGranted;
    bool hasStorage = await Permission.storage.isGranted || await Permission.photos.isGranted;

    return hasCamera && hasMic && hasStorage && hasLoc;
  }

  static void showPermissionMissingDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.security_rounded, color: Color(0xFFBB0633)),
            SizedBox(width: 12),
            Text('Permissions Required', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bavya TGS requires the following for compliance:',
              style: TextStyle(fontSize: 14, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 18),
            const PermissionItem(label: 'Primary Camera (for FRS verification)'),
            const PermissionItem(label: 'All-Day Location ("Allow all the time")'),
            const PermissionItem(label: 'Mic & Media (for expense evidence)'),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFBB0633).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBB0633).withValues(alpha: 0.2)),
              ),
              child: const Text(
                'CRITICAL: If standard prompts fail, please manually enable "Location (Always)", "Camera", and "Microphone" in App Info.',
                style: TextStyle(fontSize: 12, color: Color(0xFFBB0633), fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              checkAndNavigate(context);
            },
            child: const Text('Retry Check', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFBB0633),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            onPressed: () async {
              await openAppSettings();
            },
            child: const Text('Open Settings', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  static Future<void> checkAndNavigate(BuildContext context) async {
    bool allGranted = await checkMandatoryPermissions();
    if (!allGranted && context.mounted) {
      showPermissionMissingDialog(context);
    }
  }
}

class PermissionItem extends StatelessWidget {
  final String label;
  const PermissionItem({super.key, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFFBB0633)),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)))),
        ],
      ),
    );
  }
}
