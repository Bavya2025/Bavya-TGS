import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/trip_model.dart';
import '../services/trip_service.dart';

class TripTimelineScreen extends StatefulWidget {
  final String tripId;
  const TripTimelineScreen({super.key, required this.tripId});

  @override
  State<TripTimelineScreen> createState() => _TripTimelineScreenState();
}

class _TripTimelineScreenState extends State<TripTimelineScreen> {
  final TripService _tripService = TripService();
  Trip? trip;
  bool isLoading = true;
  List<Map<String, dynamic>> timelineSteps = [];

  @override
  void initState() {
    super.initState();
    _fetchTripDetails();
  }

  Future<void> _fetchTripDetails() async {
    try {
      final data = await _tripService.fetchTripDetails(widget.tripId);
      if (mounted) {
        setState(() {
          trip = data;
          _buildTimelineSteps();
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _buildTimelineSteps() {
    if (trip == null) return;

    final recordedEvents = trip!.lifecycleEvents;
    
    final List<Map<String, dynamic>> standardSteps = [
      {'title': 'Trip Requested', 'required': true, 'icon': Icons.description_rounded, 'color': const Color(0xFF10B981)},
      {'title': 'Level 1 Approval', 'required': true, 'icon': Icons.check_circle_outline_rounded, 'color': const Color(0xFF10B981)},
      {
        'title': 'Level 2 Approval', 
        'required': false, 
        'icon': Icons.check_circle_outline_rounded, 
        'color': const Color(0xFF10B981),
        'hide': trip!.hierarchyLevel < 2 && trip!.status != 'Forwarded' && !recordedEvents.any((e) => e['title'] == 'Level 2 Approval')
      },
      {
        'title': 'Level 3 Approval', 
        'required': false, 
        'icon': Icons.check_circle_outline_rounded, 
        'color': const Color(0xFF10B981),
        'hide': trip!.hierarchyLevel < 3 && trip!.status != 'Forwarded' && !recordedEvents.any((e) => e['title'] == 'Level 3 Approval')
      },
      {'title': 'Ticket Booking', 'required': true, 'icon': Icons.airplane_ticket_rounded, 'color': const Color(0xFF10B981)},
      {'title': 'Journey Started', 'required': true, 'icon': Icons.play_circle_fill_rounded, 'color': const Color(0xFF10B981)},
      {'title': 'Journey Ended', 'required': true, 'icon': Icons.stop_circle_rounded, 'color': const Color(0xFF10B981)},
      {'title': 'Settlement', 'required': true, 'icon': Icons.account_balance_wallet_rounded, 'color': const Color(0xFF10B981)},
    ];

    List<Map<String, dynamic>> steps = [];
    bool sequenceBroken = false;

    for (var step in standardSteps) {
      if (step['hide'] == true) continue;

      final matchingEvent = recordedEvents.cast<Map<String, dynamic>>().firstWhere(
        (e) => e['title'] == step['title'],
        orElse: () => {},
      );

      final bool isActuallyCompleted = matchingEvent.isNotEmpty && matchingEvent['status'] == 'completed' && !sequenceBroken;

      if (isActuallyCompleted) {
        // completedTitle was unused because we always show step['title'] in Image 1
        steps.add({
          'title': step['title'],
          'status': 'completed',
          'date': matchingEvent['date'],
          'description': matchingEvent['description'] ?? step['title'],
          'icon': step['icon'],
          'color': const Color(0xFF10B981),
        });
        continue;
      }

      if (matchingEvent.isNotEmpty && matchingEvent['status'] == 'in-progress' && !sequenceBroken) {
        sequenceBroken = true;
        steps.add({
          'title': step['title'],
          'status': 'in-progress',
          'date': matchingEvent['date'],
          'description': matchingEvent['description'] ?? step['title'],
          'icon': Icons.access_time_rounded,
          'color': const Color(0xFF64748B),
        });
        continue;
      }

      if (!sequenceBroken && step['required'] == true) {
        sequenceBroken = true;
        String actionDescription = 'Pending action.';
        if (step['title'] == 'Journey Started') actionDescription = 'Ready to start. Please record start odometer.';
        if (step['title'] == 'Journey Ended') actionDescription = 'Journey in progress. Please record end odometer to finish.';
        if (step['title'] == 'Settlement') actionDescription = 'Trip completed. Please submit expenses and settlement.';
        if (step['title'] == 'Ticket Booking') actionDescription = 'Waiting for ticket details.';
        if (step['title'] == 'Level 1 Approval') actionDescription = 'Awaiting manager approval.';
        if (step['title'] == 'Level 2 Approval') actionDescription = 'Awaiting Senior Manager (L2) approval.';
        if (step['title'] == 'Level 3 Approval') actionDescription = 'Awaiting Director (L3) approval.';
        
        steps.add({
          'title': step['title'],
          'status': 'current',
          'date': 'Action Required',
          'description': actionDescription,
          'icon': Icons.access_time_rounded,
          'color': const Color(0xFF64748B),
        });
        continue;
      }

      steps.add({
        'title': step['title'],
        'status': 'pending',
        'date': step['required'] == false ? 'Optional' : 'Waiting...',
        'description': sequenceBroken ? 'Awaiting completion of previous steps.' : (step['required'] == false ? 'Optional step.' : 'Pending action.'),
        'icon': Icons.access_time_rounded,
        'color': const Color(0xFFE2E8F0),
      });
    }

    setState(() {
      timelineSteps = steps;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Color(0xFFBB0633))));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Color(0xFF0F1E2A), size: 30),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Journey Timeline',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F1E2A),
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildTripHeader(), // Assuming _buildHeroHeader is _buildTripHeader
            if (trip!.status != 'Approved' && trip!.status != 'Success' && trip!.status != 'Settled')
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBB0633).withValues(alpha: 0.1)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.info_outline_rounded, color: Color(0xFFBB0633), size: 18),
                        const SizedBox(width: 12),
                        Text(
                          'Action required to proceed to next stage.',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFBB0633),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            const SizedBox(height: 20),
            _buildTripOverview(),
            const SizedBox(height: 32),
            _buildTimelineList(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTripHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFBB0633).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            trip?.id ?? '',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: const Color(0xFFBB0633),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          trip?.purpose ?? 'Business Trip',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF1E293B),
            height: 1.2,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          trip?.destination ?? '',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }

  Widget _buildTripOverview() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Trip Overview',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: const Color(0xFFE11D48),
            ),
          ),
          const SizedBox(height: 20),
          _buildOverviewItem(Icons.location_on_outlined, 'ROUTE', '${trip!.source} → ${trip!.destination}'),
          _buildOverviewItem(Icons.work_outline_rounded, 'TRAVEL MODE', trip!.travelMode),
          _buildOverviewItem(Icons.trending_up_rounded, 'ESTIMATED COST', '₹${trip!.costEstimate}'),
          _buildOverviewItem(Icons.verified_user_outlined, 'REPORTING MANAGER', trip!.reportingManagerName ?? 'Assigned'),
        ],
      ),
    );
  }

  Widget _buildOverviewItem(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFFE11D48).withValues(alpha: 0.7)),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 1,
                ),
              ),
              Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF334155),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineList() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: List.generate(timelineSteps.length, (index) {
          return _buildTimelineItem(timelineSteps[index], index == timelineSteps.length - 1);
        }),
      ),
    );
  }

  Widget _buildTimelineItem(Map<String, dynamic> step, bool isLast) {
    final bool isCompleted = step['status'] == 'completed';
    final bool isCurrent = step['status'] == 'current' || step['status'] == 'in-progress';
    final Color iconBoxColor = isCompleted ? const Color(0xFFDCFCE7) : (isCurrent ? const Color(0xFFF1F5F9) : const Color(0xFFF8FAFC));
    final Color iconColor = isCompleted ? const Color(0xFF10B981) : (isCurrent ? const Color(0xFFBB0633) : const Color(0xFF94A3B8));

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Column(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBoxColor,
                  shape: BoxShape.circle,
                  border: isCurrent ? Border.all(color: const Color(0xFFBB0633).withValues(alpha: 0.2), width: 3) : null,
                ),
                child: Icon(step['icon'] as IconData, size: 20, color: iconColor),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: const Color(0xFFE2E8F0),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        step['title'] as String,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF1E293B),
                        ),
                      ),
                      _buildStatusPill(step['status'] as String),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          step['description'] as String,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            color: const Color(0xFF64748B),
                            height: 1.4,
                          ),
                        ),
                      ),
                      Text(
                        step['date'] as String,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                  if (isCurrent)
                    Container(
                      margin: const EdgeInsets.only(top: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDF2F4), // Light pink
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBB0633).withValues(alpha: 0.1)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline_rounded, color: Color(0xFFBB0633), size: 18),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Action required to proceed to next stage.',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFBB0633),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusPill(String status) {
    Color color = const Color(0xFF94A3B8);
    String text = status.toUpperCase();
    
    if (status == 'completed') {
      color = const Color(0xFF10B981);
    } else if (status == 'current' || status == 'in-progress') {
      text = 'PENDING';
      color = const Color(0xFFF59E0B);
    } else if (status == 'pending') {
      text = 'PENDING';
      color = const Color(0xFFE2E8F0);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          color: color,
        ),
      ),
    );
  }
}
