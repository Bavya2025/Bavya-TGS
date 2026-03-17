import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';
import '../services/api_service.dart';
import '../constants/api_constants.dart';
import '../models/trip_model.dart';
import 'package:intl/intl.dart';

class FleetManagementScreen extends StatefulWidget {
  const FleetManagementScreen({super.key});

  @override
  State<FleetManagementScreen> createState() => _FleetManagementScreenState();
}

class _FleetManagementScreenState extends State<FleetManagementScreen> with SingleTickerProviderStateMixin {
  final TripService _tripService = TripService();
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  List<Map<String, dynamic>> _hubs = [];
  List<Map<String, dynamic>> _filteredHubs = [];
  Map<String, dynamic>? _selectedHub;
  String _searchQuery = "";

  bool _isAdmin = false;
  bool _showRequests = false;
  List<Map<String, dynamic>> _fleetRequests = [];
  bool _isReqLoading = false;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    final user = _apiService.getUser();
    final role = user?['role']?.toString().toLowerCase();
    _isAdmin = ['admin', 'manager', 'guesthouse_manager'].contains(role);
    _fetchHubs();
    if (_isAdmin) {
      _fetchFleetRequests();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Map<String, dynamic> _normalizeHub(Map<String, dynamic> data) {
    return {
      'id': data['id'],
      'name': data['name'],
      'address': data['address'],
      'location': data['location'] ?? data['address'],
      'pincode': data['pincode'],
      'isActive': data['is_active'] ?? true,
      'latitude': data['latitude'],
      'longitude': data['longitude'],
      'image': data['image'],
      'description': data['description'] ?? '',
      'vehicles': (data['vehicles'] as List? ?? []).map<Map<String, dynamic>>((v) {
        final Map<String, dynamic> vMap = Map<String, dynamic>.from(v as Map);
        final live = _getVehicleLiveStatus(vMap);
        return {
          ...vMap,
          'plate_number': vMap['plate_number'],
          'model_name': vMap['model_name'],
          'vehicle_type': (vMap['vehicle_type'] ?? 'sedan').toString().toLowerCase(),
          'status': live['status'],
          'activePeriod': live['activePeriod'],
          'requesterName': live['requesterName'],
          'fuel_type': (vMap['fuel_type'] ?? 'diesel').toString().toLowerCase(),
        };
      }).toList(),
      'drivers': (data['drivers'] as List? ?? []).map<Map<String, dynamic>>((d) {
        final Map<String, dynamic> dMap = Map<String, dynamic>.from(d as Map);
        return {
          'id': dMap['id'],
          'name': dMap['name'],
          'phone': dMap['phone'],
          'license_number': dMap['license_number'],
          'status': (dMap['status'] ?? 'Available').toString(),
        };
      }).toList(),
    };
  }

  Map<String, dynamic> _getVehicleLiveStatus(Map<String, dynamic> vehicle) {
    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final List bookings = vehicle['bookings'] ?? [];

    String fmt(String d) {
      if (d.isEmpty) return '';
      final date = DateTime.parse(d);
      return DateFormat('d MMM').format(date);
    }

    // 1. Active booking
    final active = bookings.firstWhere((b) {
      final start = b['start_date']?.toString().substring(0, 10);
      final end = b['end_date']?.toString().substring(0, 10);
      return start != null && end != null && todayStr.compareTo(start) >= 0 && todayStr.compareTo(end) <= 0;
    }, orElse: () => null);

    if (active != null) {
      return {
        'status': 'Occupied',
        'activePeriod': '${fmt(active['start_date'])} – ${fmt(active['end_date'])}',
        'requesterName': active['requester_name'] ?? ''
      };
    }

    // 2. Upcoming
    final upcomingList = bookings.where((b) {
      final start = b['start_date']?.toString().substring(0, 10);
      return start != null && start.compareTo(todayStr) > 0;
    }).toList();
    
    if (upcomingList.isNotEmpty) {
      upcomingList.sort((a, b) => a['start_date'].compareTo(b['start_date']));
      final up = upcomingList.first;
      return {
        'status': 'Booked',
        'activePeriod': 'From ${fmt(up['start_date'])} – ${fmt(up['end_date'])}',
        'requesterName': up['requester_name'] ?? ''
      };
    }

    return {'status': 'Available', 'activePeriod': null, 'requesterName': null};
  }

  Future<void> _fetchHubs() async {
    setState(() => _isLoading = true);
    try {
      final list = await _tripService.fetchFleetHubs();
      setState(() {
        _hubs = list.map((h) => _normalizeHub(h)).toList();
        _filteredHubs = _hubs;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchFleetRequests() async {
    setState(() => _isReqLoading = true);
    try {
      final trips = await _tripService.fetchTrips(all: true);
      setState(() {
        _fleetRequests = trips.where((t) => 
          (t.accommodationRequests?.contains('Request for Company Vehicle') ?? false) && 
          !t.hasVehicleBooking
        ).map((t) => {
          'trip_id': t.tripId,
          'trip_leader': t.employee,
          'destination': t.destination,
          'purpose': t.title,
          'start_date': t.startDate,
          'end_date': t.endDate,
          'original_trip': t,
        }).toList();
        _isReqLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isReqLoading = false);
    }
  }

  void _applySearch(String query) {
    setState(() {
      _searchQuery = query;
      _filteredHubs = _hubs.where((h) {
        final name = h['name']?.toString().toLowerCase() ?? "";
        final loc = h['location']?.toString().toLowerCase() ?? "";
        return name.contains(query.toLowerCase()) || loc.contains(query.toLowerCase());
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _selectedHub == null ? _buildListAppBar() : _buildDetailAppBar(),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C1D1D)))
        : _selectedHub == null ? _buildListView() : _buildDetailView(),
    );
  }

  PreferredSizeWidget _buildListAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20), onPressed: () => Navigator.pop(context)),
      title: Text('Fleet Management', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
      centerTitle: true,
      actions: [
        if (_isAdmin)
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF7C1D1D)),
            onPressed: () => _openAddEditHubModal(),
          ),
      ],
    );
  }

  PreferredSizeWidget _buildDetailAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(icon: const Icon(Icons.arrow_back_rounded, color: Colors.black), onPressed: () => setState(() => _selectedHub = null)),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_selectedHub!['name'], style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 18)),
          Text(_selectedHub!['location'], style: GoogleFonts.inter(fontSize: 12, color: Colors.black26, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
      bottom: TabBar(
        controller: _tabController,
        labelColor: const Color(0xFF7C1D1D),
        unselectedLabelColor: Colors.black26,
        indicatorColor: const Color(0xFF7C1D1D),
        indicatorWeight: 3,
        tabs: const [
          Tab(icon: Icon(Icons.directions_car_rounded, size: 18), text: 'Vehicles'),
          Tab(icon: Icon(Icons.person_rounded, size: 18), text: 'Drivers'),
          Tab(icon: Icon(Icons.mail_outline_rounded, size: 18), text: 'Requests'),
        ],
      ),
    );
  }

  Widget _buildListView() {
    return Column(
      children: [
        if (_isAdmin)
          Container(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
            color: Colors.white,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: [
                  Expanded(child: _toggleBtn('Fleet Hubs', !_showRequests, () => setState(() => _showRequests = false))),
                  Expanded(child: _toggleBtn('All Requests', _showRequests, () => setState(() => _showRequests = true))),
                ],
              ),
            ),
          ),
        if (!_showRequests) _buildSearchBar(),
        Expanded(
          child: _showRequests 
            ? _buildRequestsView()
            : _filteredHubs.isEmpty 
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  itemCount: _filteredHubs.length,
                  itemBuilder: (context, index) => _buildHubCard(_filteredHubs[index]),
                ),
        ),
      ],
    );
  }

  Widget _toggleBtn(String label, bool active, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: active ? Colors.white : Colors.transparent, borderRadius: BorderRadius.circular(12), boxShadow: active ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 2))] : null),
        child: Center(child: Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, color: active ? const Color(0xFF7C1D1D) : Colors.black26))),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
      color: Colors.white,
      child: TextField(
        onChanged: _applySearch,
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.search_rounded, size: 22, color: Color(0xFF7C1D1D)),
          hintText: 'Search Fleet Hubs...',
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
        ),
      ),
    );
  }

  Widget _buildHubCard(Map<String, dynamic> hub) {
    return GestureDetector(
      onTap: () => setState(() {
        _selectedHub = hub;
        _tabController.index = 0;
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFF1F5F9)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8))]),
        child: Column(
          children: [
            Stack(
              children: [
                Container(
                  height: 160,
                  width: double.infinity,
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
                  child: (hub['image'] != null && hub['image'].toString().isNotEmpty)
                    ? ClipRRect(borderRadius: const BorderRadius.vertical(top: Radius.circular(24)), child: Image.network(hub['image'], fit: BoxFit.cover))
                    : const Center(child: Icon(Icons.location_city_rounded, size: 50, color: Colors.black12)),
                ),
                Positioned(top: 15, right: 15, child: _hubStatusBadge(hub['isActive'])),
                if (_isAdmin) Positioned(top: 15, left: 15, child: Row(children: [
                  _circleAction(Icons.edit_rounded, Colors.blue, () => _openAddEditHubModal(hub: hub)),
                  const SizedBox(width: 8),
                  _circleAction(Icons.delete_outline_rounded, Colors.red, () => _confirmDeleteHub(hub)),
                ])),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(hub['name'], style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF7C1D1D)),
                      const SizedBox(width: 6),
                      Expanded(child: Text(hub['location'], style: GoogleFonts.inter(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w700))),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _statBadge(Icons.directions_car_rounded, '${hub['vehicles']?.length ?? 0}'),
                      const SizedBox(width: 12),
                      _statBadge(Icons.person_rounded, '${hub['drivers']?.length ?? 0}'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _hubStatusBadge(bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: active ? const Color(0xFF22C55E) : const Color(0xFF94A3B8), borderRadius: BorderRadius.circular(10)),
      child: Text(active ? 'OPERATIONAL' : 'STANDBY', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white)),
    );
  }

  Widget _statBadge(IconData icon, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF7C1D1D)),
          const SizedBox(width: 8),
          Text(value, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _circleAction(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
        child: Icon(icon, color: color, size: 18),
      ),
    );
  }

  Widget _buildRequestsView({List<Map<String, dynamic>>? customList}) {
    final list = customList ?? _fleetRequests;
    return RefreshIndicator(
      onRefresh: _fetchFleetRequests,
      child: list.isEmpty 
        ? _buildEmptyRequestsState()
        : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: list.length,
            itemBuilder: (context, index) => _buildRequestCard(list[index]),
          ),
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> req) {
    final Map<String, dynamic>? matchingHub = _hubs.cast<Map<String, dynamic>?>().firstWhere((h) => 
      h!['location'].toLowerCase().contains(req['destination'].toLowerCase()) ||
      req['destination'].toLowerCase().contains(h['name'].toLowerCase()),
      orElse: () => null
    );

    final hasAvailable = matchingHub != null && (matchingHub['vehicles'] as List).any((v) => v['status'] == 'Available');

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF7C1D1D).withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Text('VEHICLE REQUEST', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D))),
              ),
              Text(req['trip_id'], style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black45)),
            ],
          ),
          const SizedBox(height: 16),
          _reqInfoRow(Icons.person_rounded, 'Employee', req['trip_leader']),
          _reqInfoRow(Icons.map_rounded, 'Destination', req['destination']),
          _reqInfoRow(Icons.calendar_month_rounded, 'Dates', '${fmtDate(req['start_date'])} to ${fmtDate(req['end_date'])}'),
          if (matchingHub != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: hasAvailable ? const Color(0xFF22C55E).withOpacity(0.1) : const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  Icon(hasAvailable ? Icons.check_circle_rounded : Icons.info_rounded, size: 16, color: hasAvailable ? const Color(0xFF22C55E) : const Color(0xFFEF4444)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(hasAvailable ? 'VEHICLE AVAILABLE @ ${matchingHub['name']}' : 'NO VEHICLE FOUND AT DESTINATION', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: hasAvailable ? const Color(0xFF22C55E) : const Color(0xFFEF4444)))),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          if (hasAvailable) 
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _openAssignModal(req, matchingHub),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), elevation: 0),
                child: Text('ASSIGN VEHICLE', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 13)),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _notifyNoVehicle(req),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), side: const BorderSide(color: Color(0xFFF1F5F9))),
                child: Text('NOTIFY EMPLOYEE: NO VEHICLE', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D), fontSize: 13)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _reqInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.black26),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.inter(fontSize: 10, color: Colors.black26, fontWeight: FontWeight.bold)),
              Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
            ],
          ),
        ],
      ),
    );
  }

  String fmtDate(String? d) {
    if (d == null) return '-';
    return DateFormat('d MMM').format(DateTime.parse(d));
  }

  Widget _buildEmptyState() {
    return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.directions_car_rounded, size: 80, color: Colors.grey.shade100),
      const SizedBox(height: 16),
      Text('No fleet hubs found.', style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.bold)),
    ]));
  }

  Widget _buildEmptyRequestsState() {
    return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.mail_outline_rounded, size: 80, color: Colors.grey.shade100),
      const SizedBox(height: 16),
      Text('No active vehicle requests.', style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.bold)),
    ]));
  }

  Widget _buildDetailView() {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildItemsList('vehicles'),
        _buildItemsList('drivers'),
        _buildFilteredRequestsView(),
      ],
    );
  }

  Widget _buildItemsList(String type) {
    final list = _selectedHub![type] ?? [];
    return Column(
      children: [
        if (_isAdmin)
          Padding(
            padding: const EdgeInsets.all(20),
            child: InkWell(
              onTap: () => _openAddItemModal(type),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: const Color(0xFF7C1D1D), borderRadius: BorderRadius.circular(16)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_rounded, color: Colors.white),
                    const SizedBox(width: 8),
                    Text('ADD NEW ${type.substring(0, type.length - 1).toUpperCase()}', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w900)),
                  ],
                ),
              ),
            ),
          ),
        Expanded(
          child: list.isEmpty 
            ? _buildEmptyState()
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: list.length,
                itemBuilder: (context, index) {
                  final Map<String, dynamic> item = Map<String, dynamic>.from(list[index] as Map);
                  // Vehicle item vs Driver item
                  if (type == 'vehicles') return _buildVehicleItem(item);
                  return _buildDriverItem(item);
                },
              ),
        ),
      ],
    );
  }

  Widget _buildVehicleItem(Map<String, dynamic> v) {
    final status = v['status'].toString().toLowerCase();
    final Color statusColor = status == 'occupied' ? const Color(0xFFEF4444) : (status == 'booked' ? const Color(0xFFF59E0B) : const Color(0xFF22C55E));
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Row(
        children: [
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(14)), child: Icon(Icons.directions_car_rounded, color: statusColor)),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(v['plate_number'], style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
            Text(v['model_name'], style: GoogleFonts.inter(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.bold)),
            if (v['activePeriod'] != null) ...[
              const SizedBox(height: 4),
              Text(v['activePeriod'], style: GoogleFonts.inter(fontSize: 11, color: statusColor, fontWeight: FontWeight.w800)),
              Text(v['requesterName'], style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontWeight: FontWeight.bold)),
            ],
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)), child: Text(v['status'].toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: statusColor))),
            if (_isAdmin) Row(children: [
              IconButton(icon: const Icon(Icons.edit_rounded, size: 18, color: Colors.black26), onPressed: () => _openAddItemModal('vehicles', item: v)),
              IconButton(icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.redAccent), onPressed: () => _confirmDeleteItem('vehicles', v)),
            ]),
          ]),
        ],
      ),
    );
  }

  Widget _buildDriverItem(Map<String, dynamic> d) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Row(
        children: [
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFF7C1D1D).withOpacity(0.1), borderRadius: BorderRadius.circular(14)), child: const Icon(Icons.person_pin_rounded, color: Color(0xFF7C1D1D))),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(d['name'], style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
            Text(d['phone'], style: GoogleFonts.inter(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.bold)),
          ])),
          if (_isAdmin) Row(children: [
            IconButton(icon: const Icon(Icons.edit_rounded, size: 18, color: Colors.black26), onPressed: () => _openAddItemModal('drivers', item: d)),
            IconButton(icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.redAccent), onPressed: () => _confirmDeleteItem('drivers', d)),
          ]),
        ],
      ),
    );
  }

  Widget _buildFilteredRequestsView() {
    final filtered = _fleetRequests.where((req) {
      final dest = req['destination'].toString().toLowerCase();
      final hubName = _selectedHub!['name'].toString().toLowerCase();
      final hubLoc = _selectedHub!['location'].toString().toLowerCase();
      return dest.contains(hubName) || dest.contains(hubLoc) || hubName.contains(dest) || hubLoc.contains(dest);
    }).toList();

    return _buildRequestsView(customList: filtered);
  }

  // Modals Implementation
  void _openAddEditHubModal({Map<String, dynamic>? hub}) {
    final nameCtrl = TextEditingController(text: hub?['name']);
    final addrCtrl = TextEditingController(text: hub?['address']);
    final pinCtrl = TextEditingController(text: hub?['pincode']);
    bool active = hub?['isActive'] ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(builder: (context, sb) => Container(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
        child: SingleChildScrollView(padding: const EdgeInsets.all(32), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(hub == null ? 'New Fleet Hub' : 'Edit Hub', style: GoogleFonts.interTight(fontSize: 24, fontWeight: FontWeight.w900)),
            IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
          ]),
          const SizedBox(height: 24),
          _inputLabel('HUB NAME*'),
          TextField(controller: nameCtrl, decoration: _inputDecor('e.g. Mumbai Main Hub')),
          const SizedBox(height: 20),
          _inputLabel('ADDRESS*'),
          TextField(controller: addrCtrl, maxLines: 2, decoration: _inputDecor('Street, Local Area...')),
          const SizedBox(height: 20),
          _inputLabel('PINCODE*'),
          TextField(controller: pinCtrl, keyboardType: TextInputType.number, decoration: _inputDecor('6-digit code')),
          const SizedBox(height: 20),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Operational Status', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            Switch(value: active, onChanged: (v) => sb(() => active = v), activeColor: const Color(0xFF7C1D1D)),
          ]),
          const SizedBox(height: 32),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.isEmpty || addrCtrl.text.isEmpty || pinCtrl.text.isEmpty) return;
              await _tripService.saveFleetHub({
                'name': nameCtrl.text,
                'address': addrCtrl.text,
                'location': addrCtrl.text,
                'pincode': pinCtrl.text,
                'is_active': active,
              }, id: hub?['id']);
              Navigator.pop(context);
              _fetchHubs();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), padding: const EdgeInsets.symmetric(vertical: 18), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
            child: Text('SAVE HUB', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.white)),
          )),
        ])),
      )),
    );
  }

  void _openAddItemModal(String type, {Map<String, dynamic>? item}) {
    final plateCtrl = TextEditingController(text: item?['plate_number']);
    final modelCtrl = TextEditingController(text: item?['model_name'] ?? item?['name']);
    final phoneCtrl = TextEditingController(text: item?['phone']);
    final licCtrl = TextEditingController(text: item?['license_number']);
    String vType = item?['vehicle_type'] ?? 'sedan';
    String fuel = item?['fuel_type'] ?? 'diesel';
    String status = item?['status'] ?? 'Available';
    dynamic targetHubId = _selectedHub!['id'];
    int capacity = item?['capacity'] ?? 4;

    // Search & Transfer state
    String hubSearchQuery = "";
    Map<String, dynamic>? suggestedHub;
    bool showCreateHubPrompt = false;
    final newHubNameCtrl = TextEditingController();
    final newHubAddrCtrl = TextEditingController();
    final newHubPinCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(builder: (context, sb) => Container(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
          _modalHeader(item == null ? 'ADD ${type.substring(0, type.length-1).toUpperCase()}' : 'EDIT'),
          if (type == 'vehicles') ...[
            _inputField('Plate Number*', plateCtrl),
            _inputField('Model Name*', modelCtrl),
            _dropdownField('Vehicle Type', vType, ['sedan', 'suv', 'pickup'], (v) => sb(() => vType = v!)),
            _dropdownField('Fuel Type', fuel, ['diesel', 'petrol', 'ev'], (v) => sb(() => fuel = v!)),
          ] else ...[
            _inputField('Driver Name*', modelCtrl),
            _inputField('Phone Number*', phoneCtrl),
            _inputField('License Number', licCtrl),
          ],
          _dropdownField('Status', status, ['Available', 'Maintenance', 'Inactive'], (v) => sb(() => status = v!)),
          
          if (type == 'vehicles' && item != null) ...[
            const SizedBox(height: 16),
            _inputLabel('LOCATION / HUB'),
            TextField(
              onChanged: (query) => sb(() {
                hubSearchQuery = query;
                showCreateHubPrompt = false;
                suggestedHub = null;
                if (query.trim().isEmpty) {
                  targetHubId = _selectedHub!['id'];
                  return;
                }
                final match = _hubs.cast<Map<String, dynamic>? >().firstWhere(
                  (h) => h!['name'].toString().toLowerCase().contains(query.toLowerCase()),
                  orElse: () => null
                );
                if (match != null) {
                  suggestedHub = match;
                  targetHubId = match['id'];
                } else {
                  showCreateHubPrompt = true;
                  newHubNameCtrl.text = query;
                }
              }),
              decoration: _inputDecor('Current: ${_selectedHub!['name']} — type to change'),
            ),
            if (suggestedHub != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.blue.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.blue.withOpacity(0.2))),
                child: Row(
                  children: [
                    const Icon(Icons.location_on_rounded, size: 16, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(child: Text('Will be moved to: ${suggestedHub!['name']} — ${suggestedHub!['location']}', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue))),
                  ],
                ),
              ),
            ],
            if (showCreateHubPrompt) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF7C1D1D).withOpacity(0.2), style: BorderStyle.solid),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('No hub found for "$hubSearchQuery". Create one?', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D), fontSize: 13)),
                    const SizedBox(height: 12),
                    TextField(controller: newHubNameCtrl, decoration: _inputDecor('Hub Name*')),
                    const SizedBox(height: 8),
                    TextField(controller: newHubAddrCtrl, decoration: _inputDecor('Address*')),
                    const SizedBox(height: 8),
                    TextField(controller: newHubPinCtrl, keyboardType: TextInputType.number, decoration: _inputDecor('Pincode*')),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                        onPressed: () async {
                          if (newHubNameCtrl.text.isEmpty || newHubAddrCtrl.text.isEmpty || newHubPinCtrl.text.isEmpty) return;
                          try {
                            // In a real app, we'd need to get the ID back from saveFleetHub
                            // For this UI flow, we'll assume the fetch updates everything
                            await _tripService.saveFleetHub({
                              'name': newHubNameCtrl.text,
                              'address': newHubAddrCtrl.text,
                              'location': newHubAddrCtrl.text,
                              'pincode': newHubPinCtrl.text,
                              'is_active': true,
                            });
                            // Re-fetch to get the new hub
                            await _fetchHubs();
                            final newHub = _hubs.firstWhere((h) => h['name'] == newHubNameCtrl.text);
                            sb(() {
                              targetHubId = newHub['id'];
                              suggestedHub = newHub;
                              showCreateHubPrompt = false;
                            });
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hub "${newHub['name']}" created and vehicle scheduled for transfer!')));
                          } catch (e) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                          }
                        },
                        child: Text('CREATE HUB & TRANSFER', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
          
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              final data = type == 'vehicles' ? {
                'plate_number': plateCtrl.text,
                'model_name': modelCtrl.text,
                'vehicle_type': vType,
                'fuel_type': fuel,
                'status': status.toLowerCase(),
                'capacity': capacity,
                'hub': targetHubId,
              } : {
                'name': modelCtrl.text,
                'phone': phoneCtrl.text,
                'license_number': licCtrl.text,
                'status': status,
                'hub': _selectedHub!['id'],
              };
              await _tripService.saveFleetItem(type, data, id: item?['id']);
              Navigator.pop(context);
              _refreshSelectedHub();
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('SAVE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          )),
        ])),
      )),
    );
  }

  void _openAssignModal(Map<String, dynamic> req, Map<String, dynamic> hub) {
    Map<String, dynamic>? selectedV;
    Map<String, dynamic>? selectedD;
    final remarksCtrl = TextEditingController();

    final availableVehicles = (hub['vehicles'] as List).where((v) => v['status'] == 'Available').toList();
    final availableDrivers = (hub['drivers'] as List).where((d) => d['status'] == 'Available').toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(builder: (context, sb) => Container(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
          _modalHeader('ASSIGN VEHICLE'),
          _inputLabel('SELECT VEHICLE*'),
          DropdownButtonFormField<Map<String, dynamic>>(
            value: selectedV,
            items: availableVehicles.map<DropdownMenuItem<Map<String, dynamic>>>((v) => DropdownMenuItem(value: v, child: Text('${v['plate_number']} - ${v['model_name']}'))).toList(),
            onChanged: (v) => sb(() => selectedV = v),
            decoration: _inputDecor('Choose available vehicle'),
          ),
          const SizedBox(height: 16),
          _inputLabel('ASSIGN DRIVER (OPTIONAL)'),
          DropdownButtonFormField<Map<String, dynamic>>(
            value: selectedD,
            items: availableDrivers.map<DropdownMenuItem<Map<String, dynamic>>>((d) => DropdownMenuItem(value: d, child: Text('${d['name']} (${d['phone']})'))).toList(),
           onChanged: (d) => sb(() => selectedD = d),
            decoration: _inputDecor('Choose available driver'),
          ),
          const SizedBox(height: 16),
          _inputLabel('REMARKS'),
          TextField(controller: remarksCtrl, decoration: _inputDecor('Special instructions...')),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () async {
              if (selectedV == null) return;
              await _tripService.assignVehicle(selectedV!['id'], {
                'trip': req['trip_id'],
                'driver': selectedD?['id'],
                'booking_type': 'Official',
                'start_date': req['start_date'],
                'end_date': req['end_date'],
                'requester_name': req['trip_leader'],
                'remarks': remarksCtrl.text,
              });
              Navigator.pop(context);
              _fetchFleetRequests();
              _fetchHubs();
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vehicle assigned and employee notified!')));
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('CONFIRM ASSIGNMENT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          )),
        ])),
      )),
    );
  }

  void _notifyNoVehicle(Map<String, dynamic> req) async {
    try {
      await _apiService.post('${ApiConstants.baseUrl}/api/notifications/', body: {
        'title': 'No Vehicle Available',
        'message': 'No company vehicle is available at your destination (${req['destination']}) for trip ${req['trip_id']}. Please arrange alternate transport.',
        'type': 'info',
        'trip_id': req['trip_id'],
        'user': req['original_trip'].userId,
      });

      // Clear the request from the trip object permanently
      final Trip originalTrip = req['original_trip'];
      final List<dynamic> updatedRequests = List.from(originalTrip.accommodationRequests ?? [])
        ..remove('Request for Company Vehicle');

      await _tripService.patchTrip(req['trip_id'], {
        'accommodation_requests': updatedRequests,
      });

      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Employee notified and request cleared.')));
      _fetchFleetRequests();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  void _refreshSelectedHub() async {
    if (_selectedHub == null) return;
    _fetchHubs(); // Update all
    // Just refresh local selection logic is fine as _fetchHubs updates _hubs and we just need to re-find it
    // But for now, we'll wait for _fetchHubs to finish and we can re-map if needed.
    // Simplest is to just re-fetch the list.
  }

  void _confirmDeleteHub(Map<String, dynamic> hub) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: const Text('Delete Hub?'),
      content: Text('Are you sure you want to delete "${hub['name']}"? All associated data will be lost.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
        TextButton(onPressed: () async {
          await _tripService.deleteFleetHub(hub['id']);
          Navigator.pop(ctx);
          _fetchHubs();
        }, child: const Text('DELETE', style: TextStyle(color: Colors.red))),
      ],
    ));
  }

  void _confirmDeleteItem(String type, Map<String, dynamic> item) {
    showDialog(context: context, builder: (ctx) => AlertDialog(
      title: Text('Delete ${type.substring(0, type.length-1)}?'),
      content: Text('Confirm deletion of ${item['plate_number'] ?? item['name']}?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
        TextButton(onPressed: () async {
          await _tripService.deleteFleetItem(type, item['id']);
          Navigator.pop(ctx);
          _refreshSelectedHub();
        }, child: const Text('DELETE', style: TextStyle(color: Colors.red))),
      ],
    ));
  }

  // Helpers
  Widget _modalHeader(String title) {
    return Padding(padding: const EdgeInsets.only(bottom: 20), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(title, style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900)),
      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
    ]));
  }

  Widget _inputLabel(String label) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Align(alignment: Alignment.centerLeft, child: Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black54))));

  InputDecoration _inputDecor(String hint) => InputDecoration(hintText: hint, filled: true, fillColor: const Color(0xFFF8FAFC), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none), contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14));

  Widget _inputField(String label, TextEditingController ctrl) => Column(children: [_inputLabel(label), TextField(controller: ctrl, decoration: _inputDecor('')), const SizedBox(height: 16)]);

  Widget _dropdownField(String label, String value, List<String> items, Function(String?) onChanged) {
    final bool valueExists = items.contains(value);
    return Column(children: [
      _inputLabel(label),
      DropdownButtonFormField<String>(
        value: valueExists ? value : items.first,
        items: items.map((i) => DropdownMenuItem(value: i, child: Text(i.toUpperCase()))).toList(),
        onChanged: onChanged,
        decoration: _inputDecor(''),
      ),
      const SizedBox(height: 16)
    ]);
  }
}
