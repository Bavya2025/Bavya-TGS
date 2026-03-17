import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/trip_service.dart';
import '../services/api_service.dart';
import '../models/trip_model.dart';
import 'trip_expense_form_detailed.dart';
import 'job_report_composer_screen.dart';

class TravelExpenseGridScreen extends StatefulWidget {
  final String travelId;
  const TravelExpenseGridScreen({super.key, required this.travelId});

  @override
  _TravelExpenseGridScreenState createState() => _TravelExpenseGridScreenState();
}

class _TravelExpenseGridScreenState extends State<TravelExpenseGridScreen> {
  final TripService _tripService = TripService();
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  bool _isActionLoading = false;
  Trip? _tripData;
  List<dynamic> _expenses = [];
  final Map<String, bool> _isSavingReport = {};

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);
    try {
      final trip = await _tripService.fetchTripDetails(widget.travelId);
      setState(() {
        _tripData = trip;
        _expenses = trip.expenses ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  bool _isOwner() {
    if (_tripData == null) return false;
    final user = _apiService.getUser();
    if (user == null) return false;
    return user['id'].toString() == _tripData!.userId.toString();
  }

  Future<void> _handleAction(String action) async {
    setState(() => _isActionLoading = true);
    try {
      final taskId = (_tripData != null && _tripData!.claim != null)
          ? "CLAIM-${_tripData!.claim!['id']}"
          : widget.travelId;
      await _tripService.performApproval(taskId, action);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('$action successful'), backgroundColor: Colors.green));
      }
      _fetchExpenses();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Failed to $action: $e'), backgroundColor: Colors.red));
      }
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  Map<String, dynamic> _parseDesc(dynamic exp) {
    try {
      if (exp['description'] is String &&
          (exp['description'] as String).startsWith('{')) {
        return Map<String, dynamic>.from(jsonDecode(exp['description']));
      } else if (exp['description'] is Map) {
        return Map<String, dynamic>.from(exp['description'] as Map);
      }
    } catch (_) {}
    return {};
  }

  String _getJobReport(dynamic exp) =>
      (_parseDesc(exp)['jobReport'] ?? '').toString();

  List<String> _getJobReportAttachments(dynamic exp) {
    final attachments = _parseDesc(exp)['jobReportAttachments'];
    if (attachments is List) {
      return List<String>.from(attachments.map((e) => e.toString()));
    }
    return [];
  }

  String _getExpenseMainDisplay(dynamic exp) {
    final desc = _parseDesc(exp);
    if (desc['origin'] != null && desc['destination'] != null) {
      return '${desc['origin']} → ${desc['destination']}';
    }
    return exp['remarks'] ?? 'Expense Entry';
  }

  Future<void> _saveJobReport(dynamic exp, String reportText, List<String> attachments) async {
    final expenseId = exp['id'].toString();
    setState(() => _isSavingReport[expenseId] = true);
    try {
      final desc = _parseDesc(exp);
      desc['jobReport'] = reportText;
      desc['jobReportAttachments'] = attachments;
      await _tripService.patchExpense(expenseId, {'description': jsonEncode(desc)});

      // Optimistic local update
      final idx = _expenses.indexWhere((e) => e['id'].toString() == expenseId);
      if (idx != -1) {
        final updated = Map<String, dynamic>.from(_expenses[idx] as Map);
        updated['description'] = jsonEncode(desc);
        setState(() => _expenses[idx] = updated);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Job report saved.'),
            backgroundColor: Color(0xFF10B981)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Failed to save: $e'), backgroundColor: Colors.red));
      }
    } finally {
      setState(() => _isSavingReport.remove(expenseId));
    }
  }

  // ── Opens the job report bottom sheet ──
  void _openJobReportSheet(dynamic exp) {
    final jobReport = _getJobReport(exp);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => JobReportComposerScreen(
          travelId: widget.travelId,
          initialReport: jobReport,
          initialAttachments: _getJobReportAttachments(exp),
          onSave: (text, attachments) => _saveJobReport(exp, text, attachments),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    double totalAmount = _expenses.fold(
        0.0, (s, e) => s + (double.tryParse(e['amount']?.toString() ?? '0') ?? 0.0));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text('Travel Expense Grid',
            style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w800, fontSize: 16, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            onPressed: _fetchExpenses,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : Stack(children: [
              Container(
                height: 280,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF4F46E5), Color(0xFF818CF8), Color(0xFF6366F1)],
                  ),
                ),
              ),
              SafeArea(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(children: [
                    const SizedBox(height: 20),
                    _buildSummaryHeader(totalAmount),
                    const SizedBox(height: 24),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text('EXPENSE CATEGORIES',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Colors.white.withOpacity(0.9),
                              letterSpacing: 1.2)),
                    ),
                    const SizedBox(height: 12),
                    _buildCategoryCard('LOCAL CONVEYANCE', 'Local Travel',
                        const Color(0xFF4F46E5), Icons.directions_car_filled_rounded),
                    const SizedBox(height: 20),
                    _buildCategoryCard('INCIDENTAL EXPENSES', 'Incidental',
                        const Color(0xFFF59E0B), Icons.receipt_long_rounded),
                    const SizedBox(height: 40),
                    if (_isOwner() &&
                        _tripData != null &&
                        (_tripData!.claim == null ||
                            _tripData!.claim!['status'] == 'Draft' ||
                            _tripData!.claim!['status'] == 'Pending'))
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed:
                              _isActionLoading ? null : () => _handleAction('Submit'),
                          icon: const Icon(Icons.send_rounded, size: 18),
                          label: Text('SUBMIT FOR CLAIM',
                              style: GoogleFonts.plusJakartaSans(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                  letterSpacing: 1)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 20),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20)),
                            elevation: 4,
                          ),
                        ),
                      ),
                    const SizedBox(height: 40),
                  ]),
                ),
              ),
              if (_isActionLoading)
                Container(
                  color: Colors.black.withOpacity(0.3),
                  child: const Center(
                      child: CircularProgressIndicator(color: Colors.white)),
                ),
            ]),
    );
  }

  Widget _buildSummaryHeader(double total) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 40,
              offset: const Offset(0, 20))
        ],
      ),
      child: Column(children: [
        Text('TOTAL CLAIM AMOUNT',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: Colors.white.withOpacity(0.8),
                letterSpacing: 1)),
        const SizedBox(height: 8),
        Text('₹${total.toStringAsFixed(2)}',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 40,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -1)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.confirmation_num_outlined, color: Colors.white, size: 14),
            const SizedBox(width: 8),
            Text('ID: ${widget.travelId.toUpperCase()}',
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
          ]),
        ),
      ]),
    );
  }

  Widget _buildCategoryCard(
      String title, String category, Color color, IconData icon) {
    final categoryExpenses = _expenses.where((e) {
      final cat = e['category']?.toString().toLowerCase();
      if (category == 'Local Travel') return cat == 'fuel' || cat == 'local travel';
      if (category == 'Incidental')
        return cat == 'others' || cat == 'incidental' || cat == 'miscellaneous';
      return cat == category.toLowerCase();
    }).toList();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
              color: const Color(0xFF4F46E5).withOpacity(0.06),
              blurRadius: 30,
              offset: const Offset(0, 10))
        ],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 16, 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14)),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 16),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF1E293B))),
                  Text('${categoryExpenses.length} Entries Logged',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF94A3B8))),
                ]),
              ]),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.add_rounded, color: Color(0xFF4F46E5), size: 18),
                ),
                onPressed: () => _openAddForm(category),
              ),
            ],
          ),
        ),
        if (categoryExpenses.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: Container(
              padding: const EdgeInsets.all(24),
              width: double.infinity,
              decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF1F5F9))),
              child: Column(children: [
                const Icon(Icons.receipt_long_outlined,
                    color: Color(0xFFCBD5E1), size: 32),
                const SizedBox(height: 8),
                Text('No entries found yet',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        color: const Color(0xFF94A3B8),
                        fontWeight: FontWeight.w600)),
              ]),
            ),
          )
        else
          Column(
              children: categoryExpenses
                  .map((exp) => _buildExpenseTile(exp, category))
                  .toList()),
        const SizedBox(height: 12),
      ]),
    );
  }

  Widget _buildExpenseTile(dynamic exp, String category) {
    final desc = _parseDesc(exp);
    final expenseId = exp['id'].toString();
    final jobReport = _getJobReport(exp);
    final odoStart = desc['odoStart']?.toString() ?? '';
    final odoEnd = desc['odoEnd']?.toString() ?? '';
    final odoRate = desc['odoRate']?.toString() ?? '9.0';
    final subType = (desc['subType'] ?? desc['mode'] ?? 'Local').toString();
    final isSaving = _isSavingReport[expenseId] == true;

    double dist = 0;
    if (odoStart.isNotEmpty && odoEnd.isNotEmpty) {
      dist = ((double.tryParse(odoEnd) ?? 0) - (double.tryParse(odoStart) ?? 0)).clamp(0, 99999);
    }
    final odoExpense = dist * (double.tryParse(odoRate) ?? 9.0);

    bool hasReport = jobReport.isNotEmpty;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // ── Expense info row (tap to edit) ──
        Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            onTap: () => _openEditForm(category, exp),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Row(children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFF1F5F9))),
                  child: Center(
                    child: Icon(
                      subType.contains('Car')
                          ? Icons.directions_car_rounded
                          : subType.contains('Bike')
                              ? Icons.directions_bike_rounded
                              : Icons.directions_bus_rounded,
                      size: 20,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(
                      _getExpenseMainDisplay(exp),
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A)),
                    ),
                    if (category == 'Local Travel') ...[
                      const SizedBox(height: 3),
                      Wrap(children: [
                        Text(subType.toUpperCase(),
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF4F46E5))),
                        if (odoStart.isNotEmpty) ...[
                          Text('  •  ',
                              style: TextStyle(
                                  color: Colors.grey.shade400, fontSize: 9)),
                          Text('₹$odoRate/km',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 9,
                                  color: const Color(0xFF10B981),
                                  fontWeight: FontWeight.w800)),
                          Text('  •  ',
                              style: TextStyle(
                                  color: Colors.grey.shade400, fontSize: 9)),
                          Text('${dist.toStringAsFixed(1)} KM',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 9,
                                  color: const Color(0xFF64748B),
                                  fontWeight: FontWeight.w800)),
                        ],
                      ]),
                    ],
                    const SizedBox(height: 2),
                    Text(
                      DateFormat('dd MMM yyyy').format(DateTime.parse(exp['date'])),
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          color: const Color(0xFF94A3B8),
                          fontWeight: FontWeight.w500),
                    ),
                  ]),
                ),
                const SizedBox(width: 8),
                Text('₹${exp['amount']}',
                    style: GoogleFonts.plusJakartaSans(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: const Color(0xFF0F172A))),
              ]),
            ),
          ),
        ),

        // ── Job Report bar (mirrors web "Calc. Odo Expense" + job report button) ──
        Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(children: [
            // ODO calc (mirrors web "Calc. Odo Expense: ₹X")
            Expanded(
              child: RichText(
                text: TextSpan(children: [
                  TextSpan(
                    text: 'Calc. Odo Expense: ',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF475569)),
                  ),
                  TextSpan(
                    text: '₹${odoExpense.toStringAsFixed(2)}',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF4F46E5)),
                  ),
                ]),
              ),
            ),

            // "Job Report Saved" green badge
            if (hasReport) ...[
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                    borderRadius: BorderRadius.circular(20)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.description_rounded,
                      size: 11, color: Color(0xFF16A34A)),
                  const SizedBox(width: 4),
                  Text('Saved',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF15803D))),
                ]),
              ),
            ],

            // Write / Edit Job Report button
            isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => _openJobReportSheet(exp),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: hasReport
                            ? const Color(0xFFF0FDF4)
                            : const Color(0xFFEEF2FF),
                        border: Border.all(
                          color: hasReport
                              ? const Color(0xFFBBF7D0)
                              : const Color(0xFFC7D2FE),
                        ),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(
                          hasReport
                              ? Icons.edit_note_rounded
                              : Icons.article_outlined,
                          size: 13,
                          color: hasReport
                              ? const Color(0xFF15803D)
                              : const Color(0xFF4F46E5),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          hasReport ? 'Edit Report' : 'Write Job Report',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: hasReport
                                  ? const Color(0xFF15803D)
                                  : const Color(0xFF4F46E5)),
                        ),
                      ]),
                    ),
                  ),
          ]),
        ),

        // ── Report snippet preview ──
        if (hasReport)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Text(
              jobReport,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                  height: 1.5),
            ),
          ),
      ]),
    );
  }

  void _openAddForm(String category) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
          builder: (context) => TripExpenseFormDetailedScreen(
              category: category, tripId: widget.travelId)),
    );
    if (result == true) _fetchExpenses();
  }

  void _openEditForm(String category, dynamic exp) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
          builder: (context) => TripExpenseFormDetailedScreen(
              category: category, tripId: widget.travelId, expenseData: exp)),
    );
    if (result == true) _fetchExpenses();
  }
}


