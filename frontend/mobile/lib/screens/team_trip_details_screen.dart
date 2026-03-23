import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import '../services/trip_service.dart';
import '../models/trip_model.dart';

class TeamTripDetailsScreen extends StatefulWidget {
  final String? tripId;
  const TeamTripDetailsScreen({super.key, this.tripId});

  @override
  State<TeamTripDetailsScreen> createState() => _TeamTripDetailsScreenState();
}

class _TeamTripDetailsScreenState extends State<TeamTripDetailsScreen> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  List<Trip> _ongoingTrips = [];
  List<Trip> _allTripsFoundForDebug = [];
  final Map<String, Map<String, dynamic>?> _latestPoints = {};
  final Map<String, String> _geofenceStatus = {};
  final Map<String, List<double>?> _destCoords = {};
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchOngoingTrips();
    // Auto-refresh every 30 seconds for live updates
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (mounted) _fetchOngoingTrips();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOngoingTrips() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final List<Trip> trips = [];

      // 1. Try standard all-trips endpoint
      try {
        final allTrips = await _tripService.fetchTrips(all: true);
        trips.addAll(allTrips);
      } catch (e) {
        debugPrint('FETCH_ALL_TRIPS_FAILED: $e');
      }

      // 2. Supplemental: Fetch from Approvals History (what the manager has approved)
      // This matches the "Approval Flow" consistency the user requested
      try {
        final approvalHistory = await _tripService.fetchApprovals(
          tab: 'history',
          type: 'trip',
        );
        for (var item in approvalHistory) {
          if (item['details'] != null &&
              item['details'] is Map<String, dynamic>) {
            final details = Map<String, dynamic>.from(item['details']);
            // Robustness: Ensure trip_id is present for models
            if (details['trip_id'] == null) {
              details['trip_id'] = item['trip_id'] ?? item['db_id'];
            }
            final t = Trip.fromJson(details);
            // Avoid duplicates
            if (!trips.any((existing) => existing.id == t.id)) {
              trips.add(t);
            }
          }
        }

        // Also check Pending just in case (though ongoing trips are usually approved)
        final pendingApprovals = await _tripService.fetchApprovals(
          tab: 'pending',
          type: 'trip',
        );
        for (var item in pendingApprovals) {
          if (item['details'] != null &&
              item['details'] is Map<String, dynamic>) {
            final details = Map<String, dynamic>.from(item['details']);
            if (details['trip_id'] == null) {
              details['trip_id'] = item['trip_id'] ?? item['db_id'];
            }
            final t = Trip.fromJson(details);
            if (!trips.any((existing) => existing.id == t.id)) {
              trips.add(t);
            }
          }
        }
      } catch (e) {
        debugPrint('FETCH_APPROVALS_FAILED: $e');
      }

      // 3. New Source: Directly check Trip Approvals endpoint
      try {
        final resp = await _tripService.fetchTripApprovals();
        for (var t in resp) {
          if (!trips.any((existing) => existing.id == t.id)) {
            trips.add(t);
          }
        }
      } catch (e) {
        debugPrint('FETCH_TRIP_APPROVALS_FAILED: $e');
      }

      final now = DateTime.now();
      final nowDay = DateTime(now.year, now.month, now.day);

      // Store all trips for debug visualization
      _allTripsFoundForDebug = trips;

      setState(() {
        _ongoingTrips = trips.where((t) {
          final status = t.status.toLowerCase();

          // Include 'pending' so managers can see trips awaiting approval
          bool isViableStatus =
              status.contains('pending') ||
              status.contains('approved') ||
              status.contains('ongoing') ||
              status.contains('on-going') ||
              status.contains('started') ||
              status.contains('live') ||
              status == 'ready';

          if (isViableStatus) {
            try {
              final startDateString = t.startDate;
              final endDateString = t.endDate;

              if (startDateString.isEmpty || endDateString.isEmpty)
                return false;

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
              final tripEnd = DateTime(
                endDate.year,
                endDate.month,
                endDate.day,
              );

              return (nowDay.isAfter(tripStart) ||
                      nowDay.isAtSameMomentAs(tripStart)) &&
                  (nowDay.isBefore(tripEnd) ||
                      nowDay.isAtSameMomentAs(tripEnd));
            } catch (e) {
              debugPrint('DATE_PARSE_ERROR: ${t.tripId} - $e');
              return false;
            }
          }
          return false;
        }).toList();
        _isLoading = false;
      });

      // After fetching trips, fetch latest points for each
      for (var trip in _ongoingTrips) {
        final point = await _tripService.fetchLatestTrackingPoint(trip.id);
        if (mounted && point != null) {
          // Geofencing Check: Try to find coordinates for destination
          if (_destCoords[trip.id] == null) {
            try {
              final locations = await locationFromAddress(trip.destination)
                  .timeout(const Duration(seconds: 5));
              if (locations.isNotEmpty) {
                _destCoords[trip.id] = [
                  locations[0].latitude,
                  locations[0].longitude,
                ];
              }
            } catch (e) {
              debugPrint('GEOFENCING_GEOCODE_ERROR for ${trip.id}: $e');
            }
          }

          // Distance Check Logic
          if (_destCoords[trip.id] != null) {
            final dest = _destCoords[trip.id]!;
            final lat = double.tryParse(point['latitude'].toString()) ?? 0.0;
            final lng = double.tryParse(point['longitude'].toString()) ?? 0.0;

            if (lat != 0.0 && lng != 0.0) {
              final dist = Geolocator.distanceBetween(
                lat,
                lng,
                dest[0],
                dest[1],
              );

              String status = "ON TRACK";
              if (dist < 1000) {
                status = "ARRIVED (AT DEST)";
              } else if (dist > 50000) {
                 status = "OUT OF BOUNDS";
              }

              setState(() {
                _geofenceStatus[trip.id] = status;
              });
            }
          }

          // Attempt reverse geocoding for a "Wow" experience
          try {
            final lat = double.tryParse(point['latitude'].toString()) ?? 0.0;
            final lng = double.tryParse(point['longitude'].toString()) ?? 0.0;

            if (lat != 0.0 && lng != 0.0) {
              // Add timeout to prevent hanging the UI thread if geocoding service is unresponsive
              final placemarks = await placemarkFromCoordinates(
                lat,
                lng,
              ).timeout(const Duration(seconds: 5));

              if (mounted && placemarks.isNotEmpty) {
                final p = placemarks[0];
                setState(() {
                  point['address'] =
                      "${p.name}, ${p.subLocality}, ${p.locality}";
                });
              }
            }
          } catch (e) {
            debugPrint('GEOCODING_ERROR for ${trip.id}: $e');
            // If it times out or fails, just continue without address
          }

          setState(() {
            _latestPoints[trip.id] = point;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F1E2A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.white,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Live Team Operations',
          style: GoogleFonts.plusJakartaSans(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            onPressed: _fetchOngoingTrips,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFBB0633)),
            )
          : _ongoingTrips.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _ongoingTrips.length,
              itemBuilder: (context, index) =>
                  _buildTripCard(_ongoingTrips[index]),
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.map_outlined,
            size: 64,
            color: Colors.white.withOpacity(0.2),
          ),
          const SizedBox(height: 16),
          Text(
            'No Active Trips Found',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Trips must be Approved and active today.',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white60,
              fontSize: 13,
            ),
          ),
          if (_allTripsFoundForDebug.isNotEmpty) ...[
            const SizedBox(height: 32),
            Text(
              'DEBUG: Detected ${_allTripsFoundForDebug.length} possible trips:',
              style: const TextStyle(color: Colors.orange, fontSize: 10),
            ),
            ..._allTripsFoundForDebug
                .take(3)
                .map(
                  (t) => Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'ID: ${t.tripId.isNotEmpty ? t.tripId : (t.id.isNotEmpty ? t.id : 'N/A')} | Status: ${t.status} | Date: ${t.startDate}',
                      style: const TextStyle(
                        color: Colors.orange,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ),
          ],
        ],
      ),
    );
  }

  Widget _buildTripCard(Trip trip) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: const Color(0xFFF1F5F9),
                      child: Text(
                        (trip.employee.isNotEmpty ? trip.employee : 'U')[0]
                            .toUpperCase(),
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            trip.employee.isNotEmpty
                                ? trip.employee
                                : 'Unknown Employee',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            'Trip ID: ${trip.tripId}',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              color: const Color(0xFF64748B),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.circle,
                            size: 8,
                            color: Colors.green,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'LIVE',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF15803D),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_geofenceStatus[trip.id] != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _geofenceStatus[trip.id] == 'ARRIVED (AT DEST)'
                              ? const Color(0xFFEFF6FF)
                              : (_geofenceStatus[trip.id] == 'OUT OF BOUNDS'
                                  ? const Color(0xFFFEF2F2)
                                  : const Color(0xFFF0FDF4)),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          _geofenceStatus[trip.id]!,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: _geofenceStatus[trip.id] ==
                                    'ARRIVED (AT DEST)'
                                ? const Color(0xFF1D4ED8)
                                : (_geofenceStatus[trip.id] == 'OUT OF BOUNDS'
                                    ? Colors.red
                                    : const Color(0xFF15803D)),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 20),
                _buildRouteInfo(trip),
                const SizedBox(height: 20),
                _buildTelemetrySummary(trip),
              ],
            ),
          ),
          _buildMapPlaceholder(trip),
        ],
      ),
    );
  }

  Future<void> _openGoogleMaps(double lat, double lng) async {
    final geoUrl = 'geo:$lat,$lng?q=$lat,$lng';
    final webUrl = 'https://www.google.com/maps/search/?api=1&query=$lat,$lng';

    try {
      // Try native maps first
      debugPrint('LAUNCHING_MAPS: Trying geo scheme');
      await launchUrl(
        Uri.parse(geoUrl),
        mode: LaunchMode.externalApplication,
      );
    } catch (e) {
      debugPrint('GEO_FAILED: $e. Falling back to web URL.');
      try {
        // Fallback to browser
        await launchUrl(
          Uri.parse(webUrl),
          mode: LaunchMode.externalApplication,
        );
      } catch (e2) {
        debugPrint('WEB_FAILED: $e2');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open map application')),
          );
        }
      }
    }
  }

  String _formatLastSeen(String? timestamp) {
    if (timestamp == null || timestamp.isEmpty) return "Unknown";
    try {
      final dt = DateTime.parse(timestamp);
      return DateFormat('HH:mm').format(dt);
    } catch (e) {
      debugPrint('TIMESTAMP_PARSE_ERROR: $e');
      return "Online";
    }
  }

  Widget _buildRouteInfo(Trip trip) {
    return Row(
      children: [
        Expanded(child: _locationItem(trip.source, 'START')),
        const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.grey),
        Expanded(child: _locationItem(trip.destination, 'END')),
      ],
    );
  }

  Widget _locationItem(String location, String label) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF94A3B8),
          ),
        ),
        Text(
          location,
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF1E293B),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildTelemetrySummary(Trip trip) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _telemetryItem('Est. Budget', '₹${trip.costEstimate}'),
          _telemetryItem('Mode', trip.travelMode),
        ],
      ),
    );
  }

  Widget _telemetryItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF64748B),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildMapPlaceholder(Trip trip) {
    final point = _latestPoints[trip.id];
    final hasCoord = point != null && point['latitude'] != null;

    return GestureDetector(
      onTap: hasCoord
          ? () {
              final lat = double.tryParse(point['latitude'].toString()) ?? 0.0;
              final lng = double.tryParse(point['longitude'].toString()) ?? 0.0;
              _openGoogleMaps(lat, lng);
            }
          : null,
      child: Container(
        height: 150,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF0F1E2A),
          borderRadius: const BorderRadius.only(
            bottomLeft: Radius.circular(24),
            bottomRight: Radius.circular(24),
          ),
          image: DecorationImage(
            image: const NetworkImage(
              'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop',
            ),
            fit: BoxFit.cover,
            opacity: 0.3,
            colorFilter: ColorFilter.mode(
              const Color(0xFF0F1E2A).withOpacity(0.5),
              BlendMode.darken,
            ),
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                hasCoord
                    ? Icons.gps_fixed_rounded
                    : Icons.location_searching_rounded,
                color: hasCoord ? Colors.greenAccent : Colors.white70,
                size: 32,
              ),
              const SizedBox(height: 8),
              if (hasCoord) ...[
                Text(
                  'Last Live Sync: ${_formatLastSeen(point['timestamp'])}',
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                // debug coordinates
                Text(
                  'Lat: ${double.tryParse(point['latitude']?.toString() ?? '0')?.toStringAsFixed(4)}  '
                  'Lng: ${double.tryParse(point['longitude']?.toString() ?? '0')?.toStringAsFixed(4)}',
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (point['address'] != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 4,
                    ),
                    child: Text(
                      point['address'],
                      textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.greenAccent,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                Text(
                  'Tap to open Google Maps',
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white60,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ] else
                Text(
                  'Waiting for GPS signal stream...',
                  style: GoogleFonts.plusJakartaSans(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
