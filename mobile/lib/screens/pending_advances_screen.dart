import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';

class PendingAdvancesScreen extends StatefulWidget {
  const PendingAdvancesScreen({super.key});

  @override
  State<PendingAdvancesScreen> createState() => _PendingAdvancesScreenState();
}

class _PendingAdvancesScreenState extends State<PendingAdvancesScreen> {
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
        _tasks = tasks.where((t) => t['type'].toString().contains('Advance')).toList();
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
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Request $verb successfully'), backgroundColor: Colors.green));
      _fetchTasks();
    } catch (e) {
      String message = e.toString();
      if (e is Map && e.containsKey('error')) message = e['error'].toString();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $message'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20), onPressed: () => Navigator.pop(context)),
        title: Text('Advance Requests', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
        centerTitle: true,
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C1D1D)))
        : _tasks.isEmpty 
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _tasks.length,
              itemBuilder: (context, index) => _buildApprovalItem(_tasks[index]),
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.currency_exchange_rounded, size: 64, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          Text('No pending advances', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
          Text('All top-up requests are processed.', style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade400)),
        ],
      ),
    );
  }

  Widget _buildApprovalItem(Map<String, dynamic> task) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15)]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(8)),
                child: Text(task['id'], style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFFE65100), letterSpacing: 0.5)),
              ),
              Text(task['date'], style: GoogleFonts.inter(fontSize: 11, color: Colors.black38, fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 16),
          Text(task['requester'], style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(task['purpose'], style: GoogleFonts.inter(fontSize: 13, color: Colors.black54, height: 1.4)),
          const SizedBox(height: 16),
          _infoRow(Icons.account_balance_wallet_outlined, 'Advance Requested', task['cost'].toString()),
          const Divider(height: 32),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _handleAction(task['id'], 'Reject'),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFFF1F5F9)), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(vertical: 12)),
                  child: Text('Reject', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _handleAction(task['id'], 'Approve'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B), elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)), padding: const EdgeInsets.symmetric(vertical: 12)),
                  child: Text('Disburse', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.black26),
        const SizedBox(width: 8),
        Text(label, style: GoogleFonts.inter(fontSize: 12, color: Colors.black38, fontWeight: FontWeight.w600)),
        const Spacer(),
        Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFFD97706))),
      ],
    );
  }
}
