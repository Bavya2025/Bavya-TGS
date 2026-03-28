import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'travel_story_screen.dart';
import 'trip_story_screen.dart';
import '../models/trip_model.dart';
import '../services/trip_service.dart';

class TravelTimelineScreen extends StatefulWidget {
  final String tripId;
  const TravelTimelineScreen({super.key, required this.tripId});

  @override
  State<TravelTimelineScreen> createState() => _TravelTimelineScreenState();
}

class _TravelTimelineScreenState extends State<TravelTimelineScreen> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  Trip? _trip;
  List<Map<String, dynamic>> _lifecycleSteps = [];

  @override
  void initState() {
    super.initState();
    _fetchTripDetails();
  }

  Future<void> _fetchTripDetails() async {
    setState(() => _isLoading = true);
    try {
      final trip = await _tripService.fetchTripDetails(widget.tripId);
      setState(() {
        _trip = trip;
        _buildLifecycle();
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _buildLifecycle() {
    if (_trip == null) {
      return;
    }

    final recordedEvents = _trip!.lifecycleEvents;
    final standardSteps = [
      {'title': 'Trip Requested', 'required': true, 'icon': Icons.description_rounded, 'color': Colors.red},
      {'title': 'Level 1 Approval', 'required': true, 'icon': Icons.fact_check_rounded, 'color': Colors.amber},
      {'title': 'Level 2 Approval', 'required': false, 'icon': Icons.assignment_ind_rounded, 'color': Colors.blue},
      {'title': 'Level 3 Approval', 'required': false, 'icon': Icons.verified_user_rounded, 'color': Colors.orange},
      {'title': 'Ticket Booking', 'required': true, 'icon': Icons.airplane_ticket_rounded, 'color': Colors.green},
      {'title': 'Journey Started', 'required': true, 'icon': Icons.play_circle_fill_rounded, 'color': Colors.pink},
      {'title': 'Journey Ended', 'required': true, 'icon': Icons.stop_circle_rounded, 'color': Colors.purple},
      {'title': 'Settlement', 'required': true, 'icon': Icons.account_balance_wallet_rounded, 'color': Colors.blueGrey},
    ];

    bool sequenceBroken = false;
    _lifecycleSteps = [];

    for (var s in standardSteps) {
      final title = s['title'] as String;
      
      // Hidden logic for optional steps
      if (s['required'] == false) {
        final hasEvent = recordedEvents.any((e) => e['title'] == title);
        if (!hasEvent && _trip!.hierarchyLevel < (title.contains('2') ? 2 : 3)) {
           continue; 
        }
      }

      final matchingEvent = recordedEvents.firstWhere(
        (e) => e['title'] == title,
        orElse: () => null,
      );

      if (matchingEvent != null && matchingEvent['status'] == 'completed' && !sequenceBroken) {
        _lifecycleSteps.add({
          'title': title,
          'status': 'completed',
          'date': matchingEvent['date'] ?? 'N/A',
          'description': matchingEvent['description'] ?? 'Completed successfully.',
          'icon': s['icon'],
          'color': s['color'],
        });
        continue;
      }

      if (matchingEvent != null && matchingEvent['status'] == 'in-progress' && !sequenceBroken) {
        sequenceBroken = true;
        _lifecycleSteps.add({
          'title': title,
          'status': 'current',
          'date': 'In Progress',
          'description': matchingEvent['description'] ?? 'Currently being processed.',
          'icon': s['icon'],
          'color': s['color'],
        });
        continue;
      }

      if (!sequenceBroken && s['required'] == true) {
        sequenceBroken = true;
        String desc = 'Pending action.';
        if (title == 'Journey Started') {
          desc = 'Ready to start. Please record start odometer.';
        } else if (title == 'Journey Ended') {
          desc = 'Journey in progress. Please record end odometer.';
        } else if (title == 'Settlement') {
          desc = 'Trip completed. Please submit expenses.';
        }
        
        _lifecycleSteps.add({
          'title': title,
          'status': 'current',
          'date': 'Action Required',
          'description': desc,
          'icon': s['icon'],
          'color': s['color'],
        });
        continue;
      }

      _lifecycleSteps.add({
        'title': title,
        'status': 'pending',
        'date': 'Waiting...',
        'description': 'Awaiting previous steps.',
        'icon': s['icon'],
        'color': s['color'],
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('JOURNEY TIMELINE', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1.5)),
            Text(_trip?.id ?? 'Loading...', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.black)),
          ],
        ),
        centerTitle: false,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
          : _trip == null
              ? const Center(child: Text('Trip not found'))
              : _buildWindingTimeline(),
    );
  }

  Widget _buildWindingTimeline() {
    final nextAction = _getNextAction();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        children: [
          _buildTripSummaryHeader(),
          if (nextAction != null) _buildNextActionCard(nextAction),
          const SizedBox(height: 30),
          Stack(
            alignment: Alignment.topCenter,
            children: [
              // The curvy line background
              Positioned.fill(
                child: CustomPaint(
                  painter: WindingLinePainter(stepsCount: _lifecycleSteps.length),
                ),
              ),
              
              Column(
                children: List.generate(_lifecycleSteps.length, (index) {
                  return _buildTimelineStep(index);
                }),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Map<String, dynamic>? _getNextAction() {
    try {
      final currentStep = _lifecycleSteps.firstWhere((s) => s['status'] == 'current');
      
      final actions = {
        'Trip Requested': {'text': 'Awaiting L1 Approval', 'icon': Icons.hourglass_empty_rounded, 'color': Colors.amber},
        'Level 1 Approval': {'text': 'Awaiting L2 Approval', 'icon': Icons.hourglass_empty_rounded, 'color': Colors.amber},
        'Level 2 Approval': {'text': 'Awaiting L3 Approval', 'icon': Icons.hourglass_empty_rounded, 'color': Colors.amber},
        'Level 3 Approval': {'text': 'Awaiting Ticket Booking', 'icon': Icons.airplane_ticket_rounded, 'color': Colors.blue},
        'Ticket Booking': {'text': 'Finalizing Bookings', 'icon': Icons.confirmation_number_rounded, 'color': Colors.green},
        'Journey Started': {'text': 'Record start odometer reading', 'icon': Icons.speed_rounded, 'color': const Color(0xFFBB0633)},
        'Journey Ended': {'text': 'Record arrival odometer reading', 'icon': Icons.flag_rounded, 'color': const Color(0xFFBB0633)},
        'Settlement': {'text': 'Submit final expense claim', 'icon': Icons.account_balance_wallet_rounded, 'color': const Color(0xFFBB0633)},
      };

      return actions[currentStep['title']];
    } catch (e) {
      return null;
    }
  }

  Widget _buildTripSummaryHeader() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('DESTINATION', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white54, letterSpacing: 1)),
                  Text(_trip?.destination ?? 'TBD', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _trip?.status.toUpperCase() ?? 'PENDING',
                  style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _summaryItem(Icons.calendar_today_rounded, _trip?.dates ?? 'N/A'),
              const SizedBox(width: 20),
              _summaryItem(Icons.work_rounded, _trip?.purpose ?? 'N/A'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryItem(IconData icon, String label) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.white54),
        const SizedBox(width: 8),
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
        ),
      ],
    );
  }

  Widget _buildNextActionCard(Map<String, dynamic> action) {
    return InkWell(
      onTap: () {
        if (_trip == null) {
          return;
        }
        if (_trip!.considerAsLocal) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TravelStoryScreen(tripId: _trip!.tripId),
            ),
          );
        } else {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TripStoryScreen(tripId: _trip!.tripId),
            ),
          );
        }
      },
      borderRadius: BorderRadius.circular(24),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 10, 20, 0),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: (action['color'] as Color).withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: (action['color'] as Color).withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (action['color'] as Color).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(action['icon'], color: action['color'], size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CURRENT ACTION REQUIRED',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: Colors.black26,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    action['text'],
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              size: 16,
              color: Colors.black26,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineStep(int index) {
    final step = _lifecycleSteps[index];
    final bool isRight = index % 2 == 0;
    final color = step['color'] as Color;

    return Container(
      height: 180, // Fixed height for alignment with the curvy line
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          // Left side
          Expanded(
            child: !isRight 
              ? _buildContentBox(step, isRight, color) 
              : const SizedBox(),
          ),
          
          // Center Node (Curvy part)
          Container(
            width: 80,
            alignment: Alignment.center,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 10, spreadRadius: 2),
                ],
                border: Border.all(color: color, width: 4),
              ),
              child: Center(
                child: Icon(step['icon'], size: 18, color: color),
              ),
            ),
          ),
          
          // Right side
          Expanded(
            child: isRight 
              ? _buildContentBox(step, isRight, color) 
              : const SizedBox(),
          ),
        ],
      ),
    );
  }

  Widget _buildContentBox(Map<String, dynamic> step, bool isRight, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 15, offset: const Offset(0, 8)),
        ],
        border: Border.all(color: color.withValues(alpha: 0.1), width: 1),
      ),
      child: Column(
        crossAxisAlignment: isRight ? CrossAxisAlignment.start : CrossAxisAlignment.end,
        children: [
          Text(
            step['title'],
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            step['date'],
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            step['description'],
            textAlign: isRight ? TextAlign.left : TextAlign.right,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              color: Colors.black54,
              fontWeight: FontWeight.w500,
              height: 1.4,
            ),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class WindingLinePainter extends CustomPainter {
  final int stepsCount;
  WindingLinePainter({required this.stepsCount});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;

    final double stepHeight = 180.0;
    final double centerX = size.width / 2;
    final double curveWidth = 70.0;

    for (int i = 0; i < stepsCount - 1; i++) {
      final colors = [
        const Color(0xFFEF4444), // Red
        const Color(0xFFFBBF24), // Amber
        const Color(0xFF3B82F6), // Blue
        const Color(0xFFF97316), // Orange
        const Color(0xFF10B981), // Green
        const Color(0xFFDB2777), // Pink
        const Color(0xFF7C3AED), // Purple
        const Color(0xFF475569), // Slate
      ];
      paint.color = colors[i % colors.length];

      Path segmentPath = Path();
      double startY = i * stepHeight + (stepHeight / 2);
      double endY = (i + 1) * stepHeight + (stepHeight / 2);
      bool curveToRight = i % 2 == 0;

      segmentPath.moveTo(centerX, startY);

      if (curveToRight) {
        segmentPath.cubicTo(
          centerX + curveWidth,
          startY + stepHeight * 0.25,
          centerX + curveWidth,
          endY - stepHeight * 0.25,
          centerX,
          endY,
        );
      } else {
        segmentPath.cubicTo(
          centerX - curveWidth,
          startY + stepHeight * 0.25,
          centerX - curveWidth,
          endY - stepHeight * 0.25,
          centerX,
          endY,
        );
      }

      canvas.drawPath(segmentPath, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
