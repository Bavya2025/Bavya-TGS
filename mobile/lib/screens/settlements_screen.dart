import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/trip_service.dart';

class SettlementsScreen extends StatefulWidget {
  final String? initialTripId;
  const SettlementsScreen({super.key, this.initialTripId});

  @override
  State<SettlementsScreen> createState() => _SettlementsScreenState();
}

class _SettlementsScreenState extends State<SettlementsScreen> {
  final TripService _tripService = TripService();
  String? _selectedTripId;
  bool _isLoading = false;
  bool _isSettling = false;

  // For List View
  List<dynamic> _allTrips = [];
  String _searchQuery = '';

  // For Detail View
  Map<String, dynamic>? _settlementData;
  bool _isSettled = false;

  @override
  void initState() {
    super.initState();
    _selectedTripId = widget.initialTripId;
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      if (_selectedTripId == null) {
        final data = await _tripService.fetchSettlements();
        setState(() {
          _allTrips = data is List ? data : [];
          _isLoading = false;
        });
      } else {
        final data = await _tripService.fetchSettlements(
          tripId: _selectedTripId,
        );
        setState(() {
          _settlementData = data;
          _isSettled = data['summary']['status'] == 'Settled';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load data: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleSettle() async {
    if (_selectedTripId == null) return;
    setState(() => _isSettling = true);
    try {
      await _tripService.performSettlement(_selectedTripId!);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Trip accounts finalized and settled successfully'),
          backgroundColor: Colors.green,
        ),
      );
      await _fetchData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Settlement failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isSettling = false);
    }
  }

  String _formatCurrency(num amount) {
    return NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: 0,
    ).format(amount.abs());
  }

  List<dynamic> get _filteredTrips {
    if (_searchQuery.isEmpty) return _allTrips;
    final q = _searchQuery.toLowerCase();
    return _allTrips.where((t) {
      return (t['trip_id'] ?? '').toString().toLowerCase().contains(q) ||
          (t['employee'] ?? '').toString().toLowerCase().contains(q) ||
          (t['destination'] ?? '').toString().toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.black,
            size: 20,
          ),
          onPressed: () {
            if (_selectedTripId != null && widget.initialTripId == null) {
              setState(() {
                _selectedTripId = null;
                _settlementData = null;
              });
              _fetchData();
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text(
          _selectedTripId == null
              ? 'Full Settlement Runs'
              : 'Settlement Ledger',
          style: GoogleFonts.interTight(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w900,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF7C1D1D)),
            onPressed: _fetchData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C1D1D)),
            )
          : _selectedTripId == null
          ? _buildListView()
          : _buildDetailView(),
    );
  }

  Widget _buildListView() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Select a trip to finalize accounts and process reimbursements.',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: TextField(
                  onChanged: (v) => setState(() => _searchQuery = v),
                  decoration: InputDecoration(
                    hintText: 'Search Trip ID, Employee or Destination...',
                    hintStyle: GoogleFonts.inter(
                      fontSize: 13,
                      color: Colors.black26,
                    ),
                    prefixIcon: const Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: Color(0xFF64748B),
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _filteredTrips.isEmpty
              ? _buildEmptyState('No trips found awaiting settlement.')
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredTrips.length,
                  itemBuilder: (context, index) =>
                      _buildTripCard(_filteredTrips[index]),
                ),
        ),
      ],
    );
  }

  Widget _buildTripCard(dynamic trip) {
    final double balance = (trip['balance'] ?? 0).toDouble();
    final bool isNegative = balance < 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          setState(() => _selectedTripId = trip['trip_id'].toString());
          _fetchData();
        },
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    trip['trip_id'] ?? '',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(trip['status']).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    (trip['status'] ?? '').toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      color: _getStatusColor(trip['status']),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: const Color(0xFF0F172A).withOpacity(0.05),
                  child: Text(
                    (trip['employee'] ?? 'U')[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        trip['employee'] ?? '',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        trip['destination'] ?? '',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF64748B),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${isNegative ? '-' : '+'}₹${NumberFormat.compact().format(balance.abs())}',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: isNegative
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF10B981),
                      ),
                    ),
                    Text(
                      'Net Balance',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        color: Colors.black26,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const Divider(height: 24, color: Color(0xFFF1F5F9)),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _miniStat('Advance', _formatCurrency(trip['advance'] ?? 0)),
                _miniStat('Claims', _formatCurrency(trip['claim'] ?? 0)),
                const Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 12,
                  color: Color(0xFFCBD5E1),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniStat(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            color: Colors.black26,
            letterSpacing: 0.5,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.interTight(
            fontSize: 13,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailView() {
    if (_settlementData == null) return const SizedBox.shrink();

    final summary = _settlementData!['summary'];
    final breakdown = _settlementData!['breakdown'] as List;
    final trip = _settlementData!['trip'];
    final double balance = (summary['balance'] ?? 0).toDouble();
    final bool isNegative = balance < 0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Trip ID: ${trip['id']}',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    trip['employee'] ?? '',
                    style: GoogleFonts.interTight(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              Text(
                trip['destination'] ?? '',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFF64748B),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Settlement Main Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _bannerItem(
                      'Advance Paid',
                      _formatCurrency(summary['advance'] ?? 0),
                    ),
                    const Icon(
                      Icons.sync_alt_rounded,
                      color: Color(0xFF94A3B8),
                      size: 24,
                    ),
                    _bannerItem(
                      'Total Claims',
                      _formatCurrency(summary['claimTotal'] ?? 0),
                    ),
                  ],
                ),
                const Divider(height: 48),
                Column(
                  children: [
                    Text(
                      'Final Settlement Balance',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.black45,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${isNegative ? '-' : ''}${_formatCurrency(balance.abs())}',
                      style: GoogleFonts.inter(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: isNegative
                            ? const Color(0xFFEF4444)
                            : const Color(0xFF10B981),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isNegative ? 'RECOVERY AMOUNT' : 'NET REIMBURSEMENT',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 30),
                if (!_isSettled)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSettling ? null : _handleSettle,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        _isSettling ? 'PROCESSING...' : 'FINALIZE & SETTLE',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(
                      vertical: 12,
                      horizontal: 20,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFDCFCE7)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.verified_user_rounded,
                          color: Color(0xFF10B981),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        RichText(
                          text: TextSpan(
                            style: GoogleFonts.inter(
                              color: const Color(0xFF166534),
                              fontSize: 13,
                            ),
                            children: [
                              const TextSpan(text: 'Accounting Status: '),
                              TextSpan(
                                text: 'SETTLED & CLOSED',
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Transaction Audit Logs',
                style: GoogleFonts.interTight(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const Icon(
                Icons.history_rounded,
                size: 20,
                color: Color(0xFF94A3B8),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (breakdown.isEmpty)
            _buildEmptyState('No transactions recorded for this trip.')
          else
            ...breakdown.map((tx) => _buildTransactionItem(tx)),

          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                // Feature not implemented yet, just show snackbar
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Download Statement initiated...'),
                  ),
                );
              },
              icon: const Icon(Icons.file_download_rounded, size: 20),
              label: Text(
                'Download Settlement Statement',
                style: GoogleFonts.inter(fontWeight: FontWeight.w800),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF0F172A),
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(dynamic tx) {
    final bool isNegative = tx['is_negative'] ?? false;
    final String type = tx['type'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isNegative
                  ? const Color(0xFFFEF2F2)
                  : const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              type == 'Advance'
                  ? Icons.account_balance_wallet_rounded
                  : Icons.file_present_rounded,
              size: 20,
              color: isNegative
                  ? const Color(0xFFEF4444)
                  : const Color(0xFF10B981),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx['description'] ?? '',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                Row(
                  children: [
                    Text(
                      tx['date'] ?? '',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: Colors.black26,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      tx['id'] ?? '',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        color: Colors.black12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Text(
            '${isNegative ? '-' : '+'}${_formatCurrency(tx['amount'] ?? 0)}',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: isNegative
                  ? const Color(0xFFEF4444)
                  : const Color(0xFF10B981),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bannerItem(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            color: Colors.black45,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const Icon(
              Icons.info_outline_rounded,
              size: 48,
              color: Color(0xFFCBD5E1),
            ),
            const SizedBox(height: 16),
            Text(
              message,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: const Color(0xFF94A3B8),
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String? status) {
    final s = (status ?? '').toLowerCase();
    if (s == 'settled') return const Color(0xFF10B981);
    if (s.contains('pending')) return const Color(0xFFF59E0B);
    return const Color(0xFF64748B);
  }
}
