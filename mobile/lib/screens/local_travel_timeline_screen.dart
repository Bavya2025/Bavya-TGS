import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/trip_model.dart';
import '../services/trip_service.dart';

class LocalTravelTimelineScreen extends StatefulWidget {
  final String tripId;
  const LocalTravelTimelineScreen({super.key, required this.tripId});

  @override
  State<LocalTravelTimelineScreen> createState() => _LocalTravelTimelineScreenState();
}

class _LocalTravelTimelineScreenState extends State<LocalTravelTimelineScreen> {
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
          _buildDynamicTimelineSteps();
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => isLoading = false);
    }
  }

  void _buildDynamicTimelineSteps() {
    if (trip == null) return;

    final List<dynamic> recordedEvents = trip!.lifecycleEvents;
    List<Map<String, dynamic>> builtSteps = [];
    String extractedForwardTo = '';

    final colors = [
      const Color(0xFFF59E0B), // Orange
      const Color(0xFFEF4444), // Red
      const Color(0xFFEC4899), // Pink
      const Color(0xFF84CC16), // Lime
      const Color(0xFF3B82F6), // Blue
    ];

    for (int i = 0; i < recordedEvents.length; i++) {
        final event = recordedEvents[i] as Map<String, dynamic>;
        final String desc = (event['description'] ?? '').trim();
        String smallLabel = event['title'] ?? 'Action';
        String capsuleText = event['date'] ?? 'Mar 24, 2026';
        
        if (i == 0) {
            smallLabel = 'Request Sent';
        } else {
            if (desc.toLowerCase().contains('approved by')) {
                smallLabel = desc; // "approved by Demo SPM"
            } else if (desc.toLowerCase().contains('forwarded to')) {
                final parts = desc.split(RegExp(r'forwarded to', caseSensitive: false));
                smallLabel = 'Forwarded to ${parts[1].trim()}';
                extractedForwardTo = parts[1].trim();
            } else if (desc.toLowerCase().contains('management')) {
                smallLabel = 'Management Approved';
            }
        }

        builtSteps.add({
            'smallLabel': smallLabel,
            'capsuleText': capsuleText,
            'status': 'completed',
            'icon': _getIconForTitle(smallLabel),
            'color': colors[i % colors.length],
        });
    }

    final bool isClosed = ['Approved', 'Settled', 'Rejected', 'Success'].contains(trip!.status);
    if (!isClosed) {
        final String approverName = extractedForwardTo.isNotEmpty 
            ? extractedForwardTo 
            : (trip!.currentApproverName ?? 'Approving Manager');
            
        builtSteps.add({
            'smallLabel': 'Pending Action',
            'capsuleText': approverName,
            'status': 'current',
            'icon': Icons.access_time_rounded,
            'color': const Color(0xFF94A3B8),
        });
    } else if (trip!.status == 'Approved' || trip!.status == 'Success') {
         builtSteps.add({
            'smallLabel': 'Approved by Everyone',
            'capsuleText': 'Success',
            'status': 'completed',
            'icon': Icons.check_circle_rounded,
            'color': const Color(0xFF3B82F6),
        });
    }

    setState(() => timelineSteps = builtSteps);
  }

  IconData _getIconForTitle(String title) {
    final lower = title.toLowerCase();
    if (lower.contains('request')) return Icons.description_rounded;
    if (lower.contains('management')) return Icons.verified_user_rounded;
    if (lower.contains('everyone')) return Icons.stars_rounded;
    return Icons.check_circle_rounded;
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Color(0xFFBB0633))));
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.chevron_left, color: Color(0xFF0F1E2A), size: 30),
          onPressed: () => Navigator.pop(context),
        ),
        title: Image.asset('assets/bavya.png', height: 40, errorBuilder: (c, e, s) => const SizedBox()),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildProfessionalHeader(),
            const SizedBox(height: 20),
            if (trip!.status != 'Approved' && trip!.status != 'Success' && trip!.status != 'Settled')
                _buildActionBox(),
            
            const SizedBox(height: 32),

            // Vertical Alternating Zigzag Timeline
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Stack(
                children: [
                  // Central vertical track
                  Positioned(
                    left: MediaQuery.of(context).size.width / 2 - 21,
                    top: 0,
                    bottom: 0,
                    child: Container(width: 2, color: const Color(0xFFE2E8F0)),
                  ),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: timelineSteps.length,
                    itemBuilder: (context, index) {
                      return _buildVerticalNode(timelineSteps[index], index % 2 == 0);
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildProfessionalHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(32), bottomRight: Radius.circular(32)),
        boxShadow: [BoxShadow(color: const Color(0x0A000000), blurRadius: 20, offset: const Offset(0, 10))],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: const Color(0xFFE11D48).withValues(alpha: 0.05), borderRadius: BorderRadius.circular(6)),
            child: Text(trip?.id ?? '', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFFE11D48))),
          ),
          const SizedBox(height: 16),
          Text('Travel Timeline', style: GoogleFonts.plusJakartaSans(fontSize: 26, fontWeight: FontWeight.w900, color: const Color(0xFF0F1E2A))),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildBadge('STATUS', trip!.status, const Color(0xFF10B981)),
              const SizedBox(width: 20),
              _buildBadge('TRAVEL DATES', trip!.dates, const Color(0xFFE11D48)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBadge(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8))),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
          child: Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: color)),
        ),
      ],
    );
  }

  Widget _buildActionBox() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFDF2F4),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFBB0633).withValues(alpha: 0.1)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline_rounded, color: Color(0xFFBB0633), size: 18),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Action required to proceed to next stage.',
                style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFFBB0633)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerticalNode(Map<String, dynamic> step, bool isLeft) {
    final Color color = step['color'] as Color;
    final halfWidth = (MediaQuery.of(context).size.width - 40) / 2 - 22 - 12;

    return Padding(
      padding: const EdgeInsets.only(bottom: 36),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left side content or empty space
          SizedBox(
            width: halfWidth,
            child: isLeft
                ? _buildNodeCard(step, color, Alignment.centerRight, CrossAxisAlignment.end)
                : const SizedBox.shrink(),
          ),

          const SizedBox(width: 12),

          // Center dot
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Icon(step['icon'] as IconData, size: 20, color: Colors.white),
          ),

          const SizedBox(width: 12),

          // Right side content or empty space
          SizedBox(
            width: halfWidth,
            child: !isLeft
                ? _buildNodeCard(step, color, Alignment.centerLeft, CrossAxisAlignment.start)
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildNodeCard(
    Map<String, dynamic> step,
    Color color,
    Alignment alignment,
    CrossAxisAlignment crossAlign,
  ) {
    return Column(
      crossAxisAlignment: crossAlign,
      children: [
        // Colored capsule (date / status)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(10),
            boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Text(
            step['capsuleText'],
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        // Label below capsule
        Text(
          step['smallLabel'],
          textAlign: crossAlign == CrossAxisAlignment.end ? TextAlign.right : TextAlign.left,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }
}
