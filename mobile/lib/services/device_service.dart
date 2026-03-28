import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

class DeviceService {
  static final DeviceService _instance = DeviceService._internal();
  factory DeviceService() => _instance;
  DeviceService._internal();

  String? _deviceId;
  String? _deviceType;

  Future<void> init() async {
    final deviceInfo = DeviceInfoPlugin();
    if (kIsWeb) {
      _deviceId = 'Web-Browser';
      _deviceType = 'Web';
    } else if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      _deviceId = androidInfo.id; // Unique ID on Android
      _deviceType = 'Android';
    } else if (Platform.isIOS) {
      final iosInfo = await deviceInfo.iosInfo;
      _deviceId = iosInfo.identifierForVendor; // Unique ID on iOS
      _deviceType = 'iOS';
    } else {
      _deviceId = 'Unknown';
      _deviceType = 'Other';
    }
  }

  String get deviceId => _deviceId ?? 'Unknown';
  String get deviceType => _deviceType ?? 'Other';
}
