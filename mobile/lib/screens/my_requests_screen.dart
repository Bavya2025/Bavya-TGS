import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/trip_service.dart';
import '../models/trip_model.dart';
import 'trip_details_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  final bool hideHeader;
  final int? enforceTab;

  const MyRequestsScreen({
    super.key,
    this.hideHeader = false,
    this.enforceTab,
  });

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> with SingleTickerProviderStateMixin {
  final TripService _tripService = TripService();
  
  List<Map<String, dynamic>> _trips = [];
  List<Map<String, dynamic>> _advances = [];
  List<Map<String, dynamic>> _claims = [];
  
  String _viewMode = 'active'; // 'active' or 'historical'
  bool _isLoading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    if (widget.enforceTab != null) {
      _viewMode = widget.enforceTab == 0 ? 'active' : 'historical';
    }
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      // 1. Fetch Trips
      final tripsData = await _tripService.fetchTrips();
      _trips = tripsData.map((t) => {
        'id': t.id,
        'title': t.purpose.isEmpty ? 'Travel Request' : t.purpose,
        'date': '${t.startDate} - ${t.endDate}',
        'amount': double.tryParse(t.costEstimate.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0,
        'status': t.status,
        'type': 'trip',
        'rawObject': t,
      }).toList();

      // 2. Fetch Advances
      final advancesData = await _tripService.fetchUserAdvances();
      _advances = advancesData.map((adv) => {
        'id': 'ADV-${adv['id'] ?? (adv['trip']?.toString().substring(4) ?? 'REQ')}',
        'title': 'Advance for ${adv['trip'] ?? 'Trip'}',
        'date': DateFormat('dd-MM-yyyy').format(DateTime.tryParse(adv['created_at'] ?? '') ?? DateTime.now()),
        'amount': double.tryParse(adv['requested_amount']?.toString() ?? '0') ?? 0.0,
        'status': adv['status'] ?? 'Pending',
        'type': 'advance',
      }).toList();

      // 3. Synthesize Claims from Trips (Match web logic)
      final claimsList = <Map<String, dynamic>>[];
      for (var t in tripsData) {
        final expenses = t.totalExpenses ?? 0.0;
        if (expenses > 0) {
          String claimStatus = 'Submitted';
          if (t.status == 'Settled') {
            claimStatus = 'Settled';
          } else if (['Pending Settlement', 'Finance Review'].contains(t.status)) {
            claimStatus = 'Processing';
          }
          
          claimsList.add({
            'id': 'CLM-${t.id.substring(4)}',
            'title': 'Claim for ${t.purpose}',
            'date': t.startDate,
            'amount': expenses,
            'status': claimStatus,
            'type': 'claim',
          });
        }
      }
      
      // Fallback mocks if empty (match web's demonstration logic)
      if (claimsList.isEmpty) {
        claimsList.addAll([
          {'id': 'CLM-2024-001', 'title': 'Client Visit to Mumbai', 'date': '21-02-2024', 'amount': 15400.0, 'status': 'Settled', 'type': 'claim'},
          {'id': 'CLM-2024-002', 'title': 'Audit in Delhi Office', 'date': '25-02-2024', 'amount': 8200.0, 'status': 'Submitted', 'type': 'claim'},
        ]);
      }
      _claims = claimsList;

      setState(() => _isLoading = false);
    } catch (e) {
      debugPrint('Error fetching requests: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to load requests')));
      }
    }
  }

  bool _isActiveStatus(String status) {
    final s = status.toLowerCase();
    return !['settled', 'rejected', 'cancelled'].contains(s);
  }

  List<Map<String, dynamic>> _filterData(List<Map<String, dynamic>> data) {
    return data.where((item) =>
      _viewMode == 'active' ? _isActiveStatus(item['status']) : !_isActiveStatus(item['status'])
    ).toList();
  }

  String _formatCurrency(double amount) {
    return NumberFormat.simpleCurrency(name: 'INR', decimalDigits: 0).format(amount);
  }

  Color _getStatusColor(String status) {
    final s = status.toLowerCase().replaceAll(' ', '-');
    switch (s) {
      case 'settled': return const Color(0xFF10B981);
      case 'approved': return const Color(0xFF10B981);
      case 'pending': return const Color(0xFFF59E0B);
      case 'rejected': return const Color(0xFFEF4444);
      case 'cancelled': return const Color(0xFF64748B);
      case 'processing': return const Color(0xFF3B82F6);
      default: return const Color(0xFFBB0633);
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeTrips = _filterData(_trips);
    final activeAdvances = _filterData(_advances);
    final activeClaims = _filterData(_claims);

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
              if (!widget.hideHeader) _buildCustomHeader(),
              if (widget.enforceTab == null) _buildFilterSection(),
              _buildTabBarSection(activeTrips.length, activeAdvances.length, activeClaims.length),
              Expanded(
                child: _isLoading 
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        _buildColumn(activeTrips),
                        _buildColumn(activeAdvances),
                        _buildColumn(activeClaims),
                      ],
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
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(36), bottomRight: Radius.circular(36)),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20, top: -20,
            child: Container(width: 130, height: 130, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle)),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 15, 25, 30),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
                    child: const Icon(Icons.assignment_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'GOVERNANCE HUB',
                          style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white.withOpacity(0.7), letterSpacing: 1.5),
                        ),
                        Text(
                          'My Requests',
                          style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5),
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

  Widget _buildFilterSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      child: Row(
        children: [
          Expanded(child: _buildFilterBtn('active', Icons.access_time_filled_rounded, 'Active Queue')),
          const SizedBox(width: 12),
          Expanded(child: _buildFilterBtn('historical', Icons.check_circle_rounded, 'History')),
        ],
      ),
    );
  }

  Widget _buildTabBarSection(int tCount, int aCount, int cCount) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: const Color(0xFFBB0633),
        unselectedLabelColor: const Color(0xFF64748B),
        indicatorColor: const Color(0xFFBB0633),
        indicatorWeight: 3,
        indicatorPadding: const EdgeInsets.symmetric(horizontal: 16),
        dividerColor: Colors.transparent,
        labelStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.3),
        tabs: [
          Tab(text: 'TRIPS ($tCount)'),
          Tab(text: 'ADV ($aCount)'),
          Tab(text: 'CLAIMS ($cCount)'),
        ],
      ),
    );
  }

  Widget _buildFilterBtn(String mode, IconData icon, String label) {
    final isActive = _viewMode == mode;
    return GestureDetector(
      onTap: () => setState(() => _viewMode = mode),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF0F1E2A) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isActive ? const Color(0xFF0F1E2A) : const Color(0xFFF1F5F9)),
          boxShadow: isActive ? [BoxShadow(color: const Color(0xFF0F1E2A).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))] : [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: isActive ? Colors.white : const Color(0xFF64748B)),
            const SizedBox(width: 10),
            Text(label.toUpperCase(), style: GoogleFonts.plusJakartaSans(
              fontSize: 11, 
              fontWeight: FontWeight.w900, 
              color: isActive ? Colors.white : const Color(0xFF64748B),
              letterSpacing: 0.5,
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildColumn(List<Map<String, dynamic>> items) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
              child: const Icon(Icons.description_outlined, size: 40, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 20),
            Text(
              'No journals found', 
              style: GoogleFonts.plusJakartaSans(fontSize: 16, color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)
            ),
            const SizedBox(height: 8),
            Text(
              'No ${_viewMode} requests in this category.', 
              style: GoogleFonts.plusJakartaSans(color: const Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 13)
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchData,
      color: const Color(0xFFBB0633),
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: items.length,
        itemBuilder: (context, index) => _buildCard(items[index]),
      ),
    );
  }

  Widget _buildCard(Map<String, dynamic> item) {
    final statusColor = _getStatusColor(item['status']);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 8)),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(24),
        child: InkWell(
          onTap: () {
            if (item['type'] == 'trip') {
              Navigator.push(context, MaterialPageRoute(builder: (context) => TripDetailsScreen(tripId: item['id'])));
            }
          },
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item['id'], 
                      style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8), letterSpacing: 0.5)
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        item['status'].toUpperCase(),
                        style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: statusColor, letterSpacing: 1.0),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  item['title'], 
                  style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), letterSpacing: -0.3)
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                      child: const Icon(Icons.calendar_today_rounded, size: 12, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      item['date'], 
                      style: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF64748B), fontWeight: FontWeight.w700)
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Last Updated: Today', 
                      style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)
                    ),
                    Text(
                      _formatCurrency(item['amount']), 
                      style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFFBB0633))
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
