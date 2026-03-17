import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';

class TripApprovalsScreen extends StatefulWidget {
  const TripApprovalsScreen({super.key});

  @override
  State<TripApprovalsScreen> createState() => _TripApprovalsScreenState();
}

class _TripApprovalsScreenState extends State<TripApprovalsScreen> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _tasks = [];

  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  Future<void> _fetchTasks() async {
    setState(() => _isLoading = true);
    try {
      final tasks = await _tripService.fetchApprovals();
      setState(() {
        _tasks = tasks.where((t) => t['type'] == 'Trip').toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _handleAction(String id, String action) async {
    try {
      await _tripService.performApproval(id, action);
      String verb;
      switch (action.toLowerCase()) {
        case 'approve':
          verb = 'approved';
          break;
        case 'reject':
          verb = 'rejected';
          break;
        default:
          verb = '${action.toLowerCase()}ed';
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Trip $verb successfully'), backgroundColor: Colors.green),
      );
      _fetchTasks();
    } catch (e) {
      String message = e.toString();
      if (e is Map && e.containsKey('error')) message = e['error'].toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Action failed: $message'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // Executive Mesh Blobs
          Positioned(
            top: 250,
            right: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                gradient: RadialGradient(colors: [const Color(0xFFA9052E).withOpacity(0.02), Colors.transparent]),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Column(
            children: [
              _buildCustomHeader(),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
                    : _tasks.isEmpty
                        ? _buildEmptyState()
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            itemCount: _tasks.length,
                            itemBuilder: (context, index) => _buildApprovalItem(_tasks[index]),
                          ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCustomHeader() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFFA9052E),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20, top: -20,
            child: Container(width: 130, height: 130, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle)),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 15, 25, 25),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.flight_takeoff_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'FLEET OPERATIONS',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Colors.white.withOpacity(0.7),
                            letterSpacing: 1.5,
                          ),
                        ),
                        Text(
                          'Trip Approvals',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.5,
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
            child: const Icon(Icons.check_circle_outline_rounded, size: 40, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 20),
          Text(
            'All caught up!',
            style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
          ),
          const SizedBox(height: 8),
          Text(
            'No pending trip requests found.',
            style: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildApprovalItem(Map<String, dynamic> task) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFBB0633).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    task['id'] ?? 'N/A',
                    style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBB0633), letterSpacing: 0.5),
                  ),
                ),
                Text(
                  task['date'] ?? '',
                  style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: const Color(0xFFF8FAFC),
                  child: Text(
                    (task['requester']?.toString() ?? '?')[0].toUpperCase(),
                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), fontSize: 14),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task['requester'] ?? 'Requester',
                        style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                      ),
                      Text(
                        'TRIP REQUEST',
                        style: GoogleFonts.plusJakartaSans(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w800, letterSpacing: 1.5),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              task['purpose'] ?? '',
              style: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF475569), height: 1.5, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: _infoRow(Icons.payments_outlined, 'Estimated Budget', '₹${task['cost']}'),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _handleAction(task['id'], 'Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Color(0xFFFFE4E6)),
                      backgroundColor: const Color(0xFFFFF1F2),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Text('REJECT', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _handleAction(task['id'], 'Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F1E2A),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 8,
                      shadowColor: const Color(0xFF0F1E2A).withOpacity(0.4),
                    ),
                    child: Text('APPROVE TRIP', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFFBB0633)),
        const SizedBox(width: 10),
        Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w700)),
        const Spacer(),
        Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
      ],
    );
  }
}
