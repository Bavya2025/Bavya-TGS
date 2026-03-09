import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/trip_model.dart';
import '../services/trip_service.dart';

class ClaimSheet extends StatefulWidget {
  final Trip trip;
  final VoidCallback onUpdate;

  const ClaimSheet({super.key, required this.trip, required this.onUpdate});

  @override
  State<ClaimSheet> createState() => _ClaimSheetState();
}

class _ClaimSheetState extends State<ClaimSheet> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  bool _isSubmitting = false;
  Map<String, dynamic>? _claimData;
  List<Map<String, dynamic>> _expenses = [];
  final TextEditingController _remarksController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchClaimAndExpenses();
  }

  Future<void> _fetchClaimAndExpenses() async {
    setState(() => _isLoading = true);
    try {
      final claims = await _tripService.fetchClaims(tripId: widget.trip.id);
      if (claims.isNotEmpty) {
        _claimData = claims[0];
        _remarksController.text = _claimData!['remarks'] ?? '';
      }

      final expenses = await _tripService.fetchExpenses(tripId: widget.trip.id);
      _expenses = expenses;
      
      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  double get _totalAmount => _expenses.fold(0.0, (sum, item) => sum + (double.tryParse(item['amount'].toString()) ?? 0.0));

  Future<void> _handleSubmitClaim() async {
    if (_expenses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No expenses to claim!')));
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final payload = {
        'trip': widget.trip.id,
        'status': 'Submitted',
        'submitted_at': DateTime.now().toIso8601String(),
        'total_amount': _totalAmount,
        'remarks': _remarksController.text,
      };

      if (_claimData != null) {
        await _tripService.updateClaim(_claimData!['id'], payload);
      } else {
        await _tripService.createClaim(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Claim submitted successfully!'), backgroundColor: Colors.green));
        widget.onUpdate();
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Submission failed: $e'), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = _claimData?['status'] ?? 'Draft';
    final isLocked = !['Draft', 'Rejected'].contains(status);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
      ),
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(status),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(25),
              child: _isLoading 
                ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: Color(0xFF7C1D1D))))
                : _buildContent(isLocked),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(String status) {
    return Container(
      padding: const EdgeInsets.fromLTRB(25, 20, 25, 15),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9)))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                   Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(100)),
                    child: Text(widget.trip.id, style: GoogleFonts.inter(color: Colors.black54, fontSize: 11, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(width: 10),
                  _statusBadge(status),
                ],
              ),
              const SizedBox(height: 8),
              Text('Reimbursement Claim', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
            ],
          ),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded), style: IconButton.styleFrom(backgroundColor: const Color(0xFFF1F5F9))),
        ],
      ),
    );
  }

  Widget _buildContent(bool isLocked) {
    // Note: Trip status restriction removed to match web application behavior
    // and allow users to file claims for their trips consistently.
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _summaryCard(),
        const SizedBox(height: 25),
        _lineItems(),
        const SizedBox(height: 25),
        _remarksField(isLocked),
        const SizedBox(height: 30),
        if (!isLocked) 
          SizedBox(
            width: double.infinity,
            height: 60,
            child: ElevatedButton(
              onPressed: _isSubmitting || _expenses.isEmpty ? null : _handleSubmitClaim,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              child: _isSubmitting ? const CircularProgressIndicator(color: Colors.white) : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                  const SizedBox(width: 10),
                  Text('Submit Claim for Review', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
                ],
              ),
            ),
          )
        else
          _infoCard('Claim is under review', 'This claim has been submitted to your reporting authority. Further updates will be reflected here.'),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _summaryCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Column(
        children: [
          Text('Total Claimable Amount'.toUpperCase(), style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.black38, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Text('₹${NumberFormat('#,##,###').format(_totalAmount)}', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D))),
          const SizedBox(height: 4),
          Text('${_expenses.length} Expense Line items detected', style: GoogleFonts.inter(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w600)),
          const Divider(height: 40),
          _detailRow('Destination', widget.trip.destination),
          const SizedBox(height: 12),
          _detailRow('Travel Dates', widget.trip.dates),
        ],
      ),
    );
  }

  Widget _lineItems() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('LINE ITEM BREAKDOWN', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black38, letterSpacing: 0.5)),
        const SizedBox(height: 12),
        ..._expenses.map((exp) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF1F5F9))),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(exp['category'] ?? 'Other', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14)),
              Text('₹${NumberFormat('#,##,###').format(double.tryParse(exp['amount'].toString()) ?? 0)}', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 14, color: const Color(0xFF0F172A))),
            ],
          ),
        )).toList(),
      ],
    );
  }

  Widget _remarksField(bool isLocked) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('SETTLEMENT REMARKS', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black38, letterSpacing: 0.5)),
        const SizedBox(height: 12),
        TextField(
          controller: _remarksController,
          enabled: !isLocked,
          maxLines: 4,
          decoration: InputDecoration(
            hintText: 'Add notes for finance department...',
            hintStyle: GoogleFonts.inter(color: Colors.black26, fontSize: 14),
            filled: true,
            fillColor: isLocked ? const Color(0xFFF8FAFC) : Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          ),
        ),
      ],
    );
  }

  Widget _statusBadge(String status) {
    Color color;
    switch (status) {
      case 'Submitted': color = Colors.orange; break;
      case 'Approved': color = Colors.green; break;
      case 'Rejected': color = Colors.red; break;
      case 'Paid': color = Colors.blue; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(status.toUpperCase(), style: GoogleFonts.inter(color: color, fontSize: 9, fontWeight: FontWeight.w900)),
    );
  }

  Widget _detailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 13, color: Colors.black45, fontWeight: FontWeight.w600)),
        Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
      ],
    );
  }

  Widget _infoCard(String title, String desc) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: const Color(0xFFF0FDF4), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFDCFCE7))),
      child: Row(
        children: [
          const Icon(Icons.check_circle_rounded, color: Colors.green),
          const SizedBox(width: 15),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF166534))),
            Text(desc, style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF15803D), fontWeight: FontWeight.w500, height: 1.4)),
          ])),
        ],
      ),
    );
  }

  Widget _lockedState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            const Icon(Icons.lock_clock_rounded, size: 60, color: Color(0xFF7C1D1D)),
            const SizedBox(height: 20),
            Text('Settlement Locked', style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            Text('Claims can only be filed once the trip has been Approved or Completed.', textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.black45, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
