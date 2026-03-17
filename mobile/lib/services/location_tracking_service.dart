import 'dart:async';
import 'dart:ui';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'api_service.dart';
import 'trip_service.dart';
import '../models/trip_model.dart';
import 'logger_service.dart';

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
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'location_tracking',
        initialNotificationTitle: 'Trip Tracking Active',
        initialNotificationContent:
            'Your location is being shared with your manager.',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  /// Automatically starts or stops tracking based on approved trip dates
  static Future<void> syncTrackingWithTrips() async {
    try {
      // 1. Safety Check: Verify Permissions before starting background service
      // Starting a foreground service without permissions causes immediate crash on Android 14+
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        // Android 15 Safety: Increase delay to 3 seconds for OS background updates
        await Future.delayed(const Duration(seconds: 3));
        // Force a fresh check from the OS
        permission = await Geolocator.checkPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        debugPrint(
          'SYNC_TRACKING: Permission still denied after wait. Aborting safely.',
        );
        return;
      }

      // Android 11+ requires BACKGROUND_LOCATION ("always" permission)
      // starting a foreground service that uses location while app is in
      // background will crash if only "whileInUse" was granted.  Bail out and
      // let the UI ask the user to upgrade permissions.
      if (permission == LocationPermission.whileInUse) {
        debugPrint(
          'SYNC_TRACKING: Only while-in-use granted; cannot run background service.',
        );
        return;
      }

      final tripService = TripService();
      final trips = await tripService.fetchTrips();
      final now = DateTime.now();
      final nowDay = DateTime(now.year, now.month, now.day);

      Trip? activeTrip;

      for (var trip in trips) {
        final status = trip.status.toLowerCase();

        bool isViableStatus =
            status.contains('approved') ||
            status.contains('ongoing') ||
            status.contains('on-going') ||
            status.contains('started') ||
            status.contains('live') ||
            status == 'ready';

        if (isViableStatus) {
          try {
            final startDateString = trip.startDate;
            final endDateString = trip.endDate;

            if (startDateString.isEmpty || endDateString.isEmpty) continue;

            // Robust date parsing (handles ISO and 'Mar 07, 2026')
            DateTime parseDate(String dateStr) {
              try {
                return DateTime.parse(dateStr);
              } catch (_) {
                return DateFormat('MMM dd, yyyy').parse(dateStr);
              }
            }

            final startDate = parseDate(startDateString);
            final endDate = parseDate(endDateString);

            final tripStart = DateTime(
              startDate.year,
              startDate.month,
              startDate.day,
            );
            final tripEnd = DateTime(endDate.year, endDate.month, endDate.day);

            if ((nowDay.isAfter(tripStart) ||
                    nowDay.isAtSameMomentAs(tripStart)) &&
                (nowDay.isBefore(tripEnd) ||
                    nowDay.isAtSameMomentAs(tripEnd))) {
              activeTrip = trip;
              break;
            }
          } catch (e) {
            debugPrint(
              'SYNC_TRACKING: Date parse error for trip ${trip.tripId}: $e',
            );
          }
        }
      }

      if (activeTrip != null) {
        debugPrint(
          'SYNC_TRACKING: Starting tracking for trip ${activeTrip.tripId} (ID: ${activeTrip.id})',
        );
        try {
          await startTracking(activeTrip.id);
          debugPrint('SYNC_TRACKING: startTracking() invoked successfully');
        } catch (e) {
          debugPrint('SYNC_TRACKING: startTracking failed: $e');
        }
      } else {
        debugPrint(
          'SYNC_TRACKING: No active trip found among ${trips.length} trips. Stopping service.',
        );
        stopTracking();
      }
    } catch (e) {
      debugPrint('SYNC_TRACKING: Fatal error syncing trips: $e');
    }
  }

  static Future<void> startTracking(String tripId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('active_tracking_trip_id', tripId);

    final service = FlutterBackgroundService();

    try {
      // avoid trying to relaunch if the service is already running
      if (!await service.isRunning()) {
        await service.startService();
      }
      // Pass tripId to the background isolate regardless of restart
      service.invoke('setTripId', {"tripId": tripId});
    } catch (e) {
      debugPrint('START_TRACKING_ERROR: $e');
    }
  }

  static void stopTracking() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('active_tracking_trip_id');

    final service = FlutterBackgroundService();
    if (await service.isRunning()) {
      service.invoke("stopService");
    }
  }
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  // 1. IMMEDIATELY tell Android we are a foreground service to avoid SIG:9 kill
  if (service is AndroidServiceInstance) {
    service.setAsForegroundService();
    service.setForegroundNotificationInfo(
      title: "Trip Tracking Active",
      content: "Initializing tracking...",
    );
  }

  // Required for background isolate to use plugins
  DartPluginRegistrant.ensureInitialized();

  // basic sanity checks that often fail silently
  bool enabled = await Geolocator.isLocationServiceEnabled();
  debugPrint('BACKGROUND SERVICE: location service enabled? $enabled');
  LocationPermission perm = await Geolocator.checkPermission();
  debugPrint('BACKGROUND SERVICE: permission status: $perm');

  // Initialize static session for the background isolate
  await ApiService.loadSession();
  final ApiService apiService = ApiService();

  // DEBUG: show the token we recovered (may be empty if load failed)
  LoggerService.log(
    'BACKGROUND SERVICE: auth token = ${apiService.getToken()}',
  );
  final prefs = await SharedPreferences.getInstance();
  String? currentTripId = prefs.getString('active_tracking_trip_id');

  debugPrint(
    'BACKGROUND SERVICE: Started. Current Trip ID from Prefs: $currentTripId',
  );

  service.on('setTripId').listen((event) {
    currentTripId = event?['tripId'];
    debugPrint('BACKGROUND SERVICE: Trip ID set to $currentTripId');
  });

  service.on('stopService').listen((event) {
    debugPrint('BACKGROUND SERVICE: Stopping');
    service.stopSelf();
  });

  // Tracking Logic - Every 30 seconds for a "Live" experience
  Timer.periodic(const Duration(seconds: 30), (timer) async {
    try {
      // Robust location fetch: try current, then last known as fallback
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 20),
        );
      } catch (e) {
        debugPrint(
          'BACKGROUND SERVICE: getCurrentPosition failed: $e. Trying last known...',
        );
        position = await Geolocator.getLastKnownPosition();
      }

      debugPrint('BACKGROUND SERVICE: Loop Start. TripID: $currentTripId');
      if (position != null && currentTripId != null) {
        try {
          final token = apiService.getToken();
          debugPrint(
            'BACKGROUND SERVICE: Syncing. Token present: ${token != null && token.isNotEmpty}',
          );

          final endpoint = '/api/trips/$currentTripId/tracking/';
          await apiService.post(
            endpoint,
            body: {
              'latitude': position.latitude,
              'longitude': position.longitude,
              'timestamp': DateTime.now().toIso8601String(),
              'accuracy': position.accuracy,
              'speed': position.speed,
            },
            includeAuth: true,
          );
          debugPrint('BACKGROUND SERVICE: Sync OK for $currentTripId');

          if (service is AndroidServiceInstance) {
            service.setForegroundNotificationInfo(
              title: "Trip Tracking Active",
              content:
                  "Last Sync: ${DateFormat('HH:mm').format(DateTime.now())}",
            );
          }
        } catch (e) {
          debugPrint('BACKGROUND SERVICE: API Post Error: $e');
          if (e is ForbiddenException || e is UnauthorizedException) {
            debugPrint('BACKGROUND SERVICE: Auth failure, stopping.');
            service.stopSelf();
          }
        }
      } else {
        debugPrint(
          'BACKGROUND SERVICE: Missing data. Position: ${position != null}, TripID: $currentTripId',
        );
        if (service is AndroidServiceInstance) {
          service.setForegroundNotificationInfo(
            title: "Trip Tracking Active",
            content: "Searching for GPS signal...",
          );
        }
      }
    } catch (e) {
      debugPrint('BACKGROUND SERVICE: Fatal loop error: $e');
    }
  });
}

@pragma('vm:entry-point')
bool onIosBackground(ServiceInstance service) {
  return true;
}
