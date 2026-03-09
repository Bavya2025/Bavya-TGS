import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/trip_service.dart';
import '../screens/settlements_screen.dart';

class FinanceHubScreen extends StatefulWidget {
  const FinanceHubScreen({super.key});

  @override
  State<FinanceHubScreen> createState() => _FinanceHubScreenState();
}

class _FinanceHubScreenState extends State<FinanceHubScreen> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _records = [];
  String _searchQuery = '';

  // Stats mirroring web
  int _pendingAuditCount = 0;
  double _settledTodayValue = 0.0;
  int _flaggedDisputedCount = 0;
  String _avgAuditTime = '2.4h';

  @override
  void initState() {
    super.initState();
    _fetchFinanceData();
  }

  Future<void> _fetchFinanceData() async {
    setState(() => _isLoading = true);
    try {
      final data = await _tripService.fetchApprovals(tab: 'pending');
      setState(() {
        _records = data;
        _pendingAuditCount = data.length;
        // Reset/Match web state (static until backend provides real sums)
        _settledTodayValue = 0.0; 
        _flaggedDisputedCount = 0;
        _avgAuditTime = '0h';
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load records: $e')));
      }
    }
  }

  List<Map<String, dynamic>> get _filteredRecords {
    if (_searchQuery.isEmpty) return _records;
    final q = _searchQuery.toLowerCase();
    return _records.where((r) =>
      r['id'].toString().toLowerCase().contains(q) ||
      (r['requester'] ?? '').toString().toLowerCase().contains(q) ||
      (r['type'] ?? '').toString().toLowerCase().contains(q)
    ).toList();
  }

  Future<void> _handleUnderProcess(dynamic id) async {
    try {
      await _tripService.performApproval(id, 'UnderProcess');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Marked as Under Process'), backgroundColor: Colors.orange));
        _fetchFinanceData();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action failed: $e'), backgroundColor: Colors.red));
    }
  }

  void _openTransferModal(Map<String, dynamic> rec) {
    String paymentMode = 'NEFT';
    String transactionId = '';
    String paymentDate = DateFormat('yyyy-MM-dd').format(DateTime.now());
    String remarks = '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
          padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Fund Transfer Details', style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
              const SizedBox(height: 8),
              Text('Recording payment for ${rec['requester']}', style: GoogleFonts.inter(color: Colors.grey, fontSize: 13)),
              const Divider(height: 32),
              
              Row(
                children: [
                  Expanded(
                    child: _buildModalField('Amount', rec['cost'] ?? '0', isHighlight: true),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('MODE', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black26)),
                        DropdownButton<String>(
                          value: paymentMode,
                          isExpanded: true,
                          underline: const SizedBox(),
                          items: ['NEFT', 'Bank Transfer', 'UPI', 'Cash'].map((m) => DropdownMenuItem(value: m, child: Text(m, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)))).toList(),
                          onChanged: (v) => setModalState(() => paymentMode = v!),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                onChanged: (v) => transactionId = v,
                decoration: _modalInputDecoration('Transaction ID / Reference', 'Enter ID...'),
              ),
              const SizedBox(height: 16),
              TextField(
                onChanged: (v) => remarks = v,
                decoration: _modalInputDecoration('Remarks', 'Add internal notes...'),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (transactionId.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Transaction ID is required')));
                      return;
                    }
                    Navigator.pop(context);
                    try {
                      await _tripService.performApproval(rec['id'], 'Transfer', extraData: {
                        'payment_mode': paymentMode,
                        'transaction_id': transactionId,
                        'payment_date': paymentDate,
                        'remarks': remarks,
                      });
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Funds transferred successfully'), backgroundColor: Colors.green));
                        _fetchFinanceData();
                      }
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Transfer failed: $e'), backgroundColor: Colors.red));
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: Text('CONFIRM TRANSFER', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openRejectModal(Map<String, dynamic> rec) {
    String reason = '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Reject Financial Request', style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF991B1B))),
            const SizedBox(height: 8),
            Text('Are you sure you want to reject this request for ${rec['requester']}?', style: GoogleFonts.inter(color: Colors.red[300], fontSize: 13)),
            const Divider(height: 32),
            TextField(
              maxLines: 3,
              onChanged: (v) => reason = v,
              decoration: _modalInputDecoration('Reason for Rejection', 'Enter specific reason...'),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: TextButton(onPressed: () => Navigator.pop(context), child: Text('CANCEL', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.grey))),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      if (reason.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Reason is required')));
                        return;
                      }
                      Navigator.pop(context);
                      try {
                        await _tripService.performApproval(rec['id'], 'RejectByFinance', extraData: {'remarks': reason});
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request rejected by Finance'), backgroundColor: Colors.red));
                          _fetchFinanceData();
                        }
                      } catch (e) {
                         if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Rejection failed: $e'), backgroundColor: Colors.red));
                      }
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF991B1B), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                    child: Text('REJECT REQUEST', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 13, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _modalInputDecoration(String label, String hint) {
    return InputDecoration(
      labelText: label,
      labelStyle: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.black26, letterSpacing: 1),
      hintText: hint,
      hintStyle: GoogleFonts.inter(fontSize: 14, color: Colors.grey[300]),
      floatingLabelBehavior: FloatingLabelBehavior.always,
      border: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey[200]!)),
      focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF0F172A))),
    );
  }

  Widget _buildModalField(String label, String value, {bool isHighlight = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black26)),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w900, color: isHighlight ? const Color(0xFF7C1D1D) : const Color(0xFF0F172A))),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20), onPressed: () => Navigator.pop(context)),
        title: Text('FIMS - Financial Information Management', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded, color: Color(0xFF7C1D1D)), onPressed: _fetchFinanceData),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchFinanceData,
        color: const Color(0xFF7C1D1D),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildStatsGrid(),
              _buildSearchBox(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('MASTER FINANCIAL AUDIT LOG (ACTION REQUIRED)', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBE123C), letterSpacing: 0.5)),
                    if (!_isLoading) Text('${_filteredRecords.length} Items', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.black12)),
                  ],
                ),
              ),
              if (_isLoading)
                const Padding(padding: EdgeInsets.only(top: 100), child: Center(child: CircularProgressIndicator(color: Color(0xFF7C1D1D))))
              else if (_filteredRecords.isEmpty)
                _buildEmptyState()
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  itemCount: _filteredRecords.length,
                  itemBuilder: (context, index) => _buildTransactionCard(_filteredRecords[index]),
                ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const SettlementsScreen())),
        backgroundColor: const Color(0xFF0F172A),
        icon: const Icon(Icons.bolt, color: Colors.white, size: 18),
        label: Text('SETTLEMENT RUNS', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 11, color: Colors.white)),
      ),
    );
  }

  Widget _buildStatsGrid() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: ScrollConfiguration(
        behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              _statCard('Pending Audit', _pendingAuditCount.toString(), Icons.access_time_rounded, const Color(0xFFEA580C)),
              const SizedBox(width: 16),
              _statCard('Settled Today', '₹${NumberFormat.compact().format(_settledTodayValue)}', Icons.check_circle_rounded, const Color(0xFF10B981)),
              const SizedBox(width: 16),
              _statCard('Flagged', _flaggedDisputedCount.toString(), Icons.error_outline_rounded, const Color(0xFFEF4444)),
              const SizedBox(width: 16),
              _statCard('Avg. Audit Time', _avgAuditTime, Icons.trending_up_rounded, const Color(0xFF3B82F6)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 16),
          Text(value, style: GoogleFonts.interTight(fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8))),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.north_east_rounded, size: 12, color: color),
              const SizedBox(width: 4),
              Text('0% vs last week', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBox() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: TextField(
        onChanged: (v) => setState(() => _searchQuery = v),
        decoration: InputDecoration(
          hintText: 'Search ID, Trip, or Employee...',
          hintStyle: GoogleFonts.inter(fontSize: 13, color: Colors.black26, fontWeight: FontWeight.w600),
          prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF7C1D1D)),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 18),
        ),
      ),
    );
  }

  Widget _buildTransactionCard(Map<String, dynamic> rec) {
    final status = (rec['status'] ?? 'unknown').toString().toLowerCase();
    Color statusColor = const Color(0xFF94A3B8);
    Color statusBg = const Color(0xFFF1F5F9);

    if (status.contains('pending')) {
      statusColor = const Color(0xFF92400E);
      statusBg = const Color(0xFFFFFBEB);
    } else if (status.contains('success') || status == 'settled' || status == 'transfered') {
      statusColor = const Color(0xFF166534);
      statusBg = const Color(0xFFF0FDF4);
    } else if (status.contains('process')) {
       statusColor = const Color(0xFF1E40AF);
       statusBg = const Color(0xFFEFF6FF);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)), child: Text(rec['id'].toString(), style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)))),
                    Text(rec['cost']?.toString() ?? '₹0', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                  ],
                ),
                const Padding(padding: EdgeInsets.symmetric(vertical: 16), child: Divider(height: 1, color: Color(0xFFF1F5F9))),
                Row(
                  children: [
                    CircleAvatar(radius: 18, backgroundColor: const Color(0xFF7C1D1D).withOpacity(0.1), child: Text((rec['requester']?.toString() ?? 'U')[0].toUpperCase(), style: const TextStyle(color: Color(0xFF7C1D1D), fontWeight: FontWeight.w900, fontSize: 13))),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(rec['requester']?.toString() ?? 'Unknown', style: GoogleFonts.interTight(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                        Row(
                          children: [
                            Text(rec['type']?.toString() ?? 'Request', style: GoogleFonts.inter(fontSize: 11, color: Colors.black45, fontWeight: FontWeight.w700)),
                            const SizedBox(width: 8),
                            if (rec['date'] != null) Text('• ${rec['date']}', style: GoogleFonts.inter(fontSize: 10, color: Colors.black26, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ]),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(30)),
                          child: Text(status.toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: statusColor)),
                        ),
                        if (rec['details']?['trip_id'] != null) ...[
                          const SizedBox(height: 4),
                          Text(rec['details']['trip_id'].toString(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF64748B))),
                        ],
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.vertical(bottom: Radius.circular(24))),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _fAction(Icons.access_time_filled_rounded, 'PROCESS', const Color(0xFF0F172A), () => _handleUnderProcess(rec['id'])),
                _fAction(Icons.currency_exchange_rounded, 'TRANSFER', const Color(0xFF10B981), () => _openTransferModal(rec)),
                _fAction(Icons.cancel_rounded, 'REJECT', const Color(0xFFEF4444), () => _openRejectModal(rec)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _fAction(IconData icon, String label, Color color, VoidCallback onTap) {
     return InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(label, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: color, letterSpacing: 0.5)),
            ],
          ),
        ),
     );
  }

  Widget _buildEmptyState() {
     return Padding(
       padding: const EdgeInsets.only(top: 80),
       child: Center(
         child: Column(mainAxisSize: MainAxisSize.min, children: [
           const Icon(Icons.query_stats_rounded, size: 60, color: Color(0xFFE2E8F0)),
           const SizedBox(height: 16),
           Text('No Pending Transactions', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFFCBD5E1))),
           Text('Financial audit log is clear.', style: GoogleFonts.inter(color: Colors.black12, fontWeight: FontWeight.w600)),
         ]),
       ),
     );
  }
}
