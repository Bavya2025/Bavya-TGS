import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'api_service.dart';
import 'trip_service.dart';
import '../models/trip_model.dart';

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
      final tripService = TripService();
      final trips = await tripService.fetchTrips();
      final now = DateTime.now();

      Trip? activeTrip;

      for (var trip in trips) {
        if (trip.status.toLowerCase() == 'approved') {
          try {
            final startDate = DateTime.parse(trip.startDate);
            final endDate = DateTime.parse(
              trip.endDate,
            ).add(const Duration(days: 1)); // Include the end day

            if (now.isAfter(startDate) && now.isBefore(endDate)) {
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
          'SYNC_TRACKING: Starting tracking for trip ${activeTrip.tripId}',
        );
        startTracking(activeTrip.id);
      } else {
        debugPrint(
          'SYNC_TRACKING: No active approved trip found for today. Stopping service if running.',
        );
        stopTracking();
      }
    } catch (e) {
      debugPrint('SYNC_TRACKING: Error syncing trips: $e');
    }
  }

  static void startTracking(String tripId) {
    final service = FlutterBackgroundService();
    service.startService();
    // Pass tripId to the background isolate
    service.invoke('setTripId', {"tripId": tripId});
  }

  static void stopTracking() async {
    final service = FlutterBackgroundService();
    if (await service.isRunning()) {
      service.invoke("stopService");
    }
  }
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  // Required for background isolate to use plugins
  DartPluginRegistrant.ensureInitialized();

  // Initialize static session for the background isolate
  await ApiService.loadSession();

  if (service is AndroidServiceInstance) {
    service.setAsForegroundService();
  }

  final ApiService apiService = ApiService();
  String? currentTripId;

  debugPrint('BACKGROUND SERVICE: Started');

  service.on('setTripId').listen((event) {
    currentTripId = event?['tripId'];
    debugPrint('BACKGROUND SERVICE: Trip ID set to $currentTripId');
  });

  service.on('stopService').listen((event) {
    debugPrint('BACKGROUND SERVICE: Stopping');
    service.stopSelf();
  });

  // Tracking Logic
  Timer.periodic(const Duration(minutes: 5), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        try {
          final position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 30),
          );

          if (currentTripId != null) {
            try {
              // Send to backend
              await apiService.post(
                '/api/trips/$currentTripId/tracking/',
                body: {
                  'latitude': position.latitude,
                  'longitude': position.longitude,
                  'timestamp': DateTime.now().toIso8601String(),
                },
                includeAuth: true,
              );
              debugPrint(
                'BACKGROUND SERVICE: Location sent for trip $currentTripId',
              );
            } catch (e) {
              debugPrint('BACKGROUND SERVICE: Failed to send location: $e');
            }
          }

          service.setForegroundNotificationInfo(
            title: "Trip Tracking Active",
            content: "Last Sync: ${DateFormat('HH:mm').format(DateTime.now())}",
          );
        } catch (e) {
          debugPrint('BACKGROUND SERVICE: Location fetch error: $e');
          // Update notification to show error status if helpful
          service.setForegroundNotificationInfo(
            title: "Trip Tracking Active",
            content: "Waiting for GPS signal...",
          );
        }
      }
    }
  });
}

@pragma('vm:entry-point')
bool onIosBackground(ServiceInstance service) {
  return true;
}
