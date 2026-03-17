import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';
import '../services/api_service.dart';
import '../constants/api_constants.dart';
import '../models/trip_model.dart';
import 'package:intl/intl.dart';

class GuestHouseScreen extends StatefulWidget {
  const GuestHouseScreen({super.key});

  @override
  State<GuestHouseScreen> createState() => _GuestHouseScreenState();
}

class _GuestHouseScreenState extends State<GuestHouseScreen> with SingleTickerProviderStateMixin {
  final TripService _tripService = TripService();
  final ApiService _apiService = ApiService();
  
  bool _isLoading = true;
  List<Map<String, dynamic>> _guestHouses = [];
  List<Map<String, dynamic>> _filteredGuestHouses = [];
  Map<String, dynamic>? _selectedGuestHouse;
  String _searchQuery = "";
  
  bool _isAdmin = false;
  bool _isCro = false;
  bool _showRequests = false;
  List<Map<String, dynamic>> _accRequests = [];
  bool _isAccLoading = false;
  Trip? _activeBookingRequest;

  late TabController _tabController;
  DateTime _currentCalendarDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  int _selectedRoomIdx = 0;

  // Added state for expanded booking details under calendar
  Map<String, dynamic>? _expandedBooking;
  Map<String, dynamic>? _expandedRoom;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 7, vsync: this);
    final user = _apiService.getUser();
    final role = user?['role']?.toString().toLowerCase();
    _isAdmin = ['admin', 'manager', 'guesthouse_manager'].contains(role);
    _isCro = (role == 'cro');
    _fetchGuestHouses();
    if (_isAdmin || _isCro) {
      _fetchAccommodationRequests();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _toTitleCase(String? text) {
    if (text == null || text.isEmpty) return "";
    return text.split(' ').map((str) => str.isEmpty ? "" : "${str[0].toUpperCase()}${str.substring(1).toLowerCase()}").join(' ');
  }

  Map<String, dynamic> _normalizeGuestHouse(Map<String, dynamic> gh) {
    final Map<String, dynamic> normalized = Map<String, dynamic>.from(gh);
    normalized['isActive'] = gh['is_active'];
    
    normalized['laundry'] = (gh['laundries'] as List? ?? []).map((l) {
      final lMap = Map<String, dynamic>.from(l as Map);
      return {...lMap, 'name': lMap['name'] ?? 'Laundry Service'};
    }).toList();
    
    normalized['rooms'] = (gh['rooms'] as List? ?? []).map((r) {
      final rMap = Map<String, dynamic>.from(r as Map);
      return {
        ...rMap,
        'name': rMap['number'],
        'type': _toTitleCase(rMap['room_type']?.toString() ?? 'single'),
        'status': _toTitleCase(rMap['status']?.toString() ?? 'available'),
        'bookings': (rMap['bookings'] as List? ?? []).map((b) => Map<String, dynamic>.from(b as Map)).toList()
      };
    }).toList();
    
    normalized['contacts'] = (gh['contacts'] as List? ?? []).map((c) {
      final cMap = Map<String, dynamic>.from(c as Map);
      return {
        ...cMap, 
        'name': cMap['label'] ?? cMap['name'],
        'label': cMap['label'] ?? cMap['name']
      };
    }).toList();

    normalized['kitchens'] = (gh['kitchens'] as List? ?? []).map((k) => Map<String, dynamic>.from(k as Map)).toList();
    normalized['cooks'] = (gh['cooks'] as List? ?? []).map((c) => Map<String, dynamic>.from(c as Map)).toList();

    return normalized;
  }

  Map<String, dynamic> _prepareGhPayload(Map<String, dynamic> data) {
    return {
      'name': data['name'],
      'address': data['address'],
      'location': data['location'] ?? data['address'] ?? '',
      'pincode': data['pincode'],
      'is_active': data['isActive'] ?? data['is_active'],
      'latitude': data['latitude'],
      'longitude': data['longitude'],
      'image': data['image'],
      'description': data['description'] ?? '',
      'rooms': (data['rooms'] as List? ?? []).map((r) => {
        'id': r['id'],
        'number': r['number'] ?? r['name'],
        'room_type': (r['type'] ?? r['room_type'] ?? 'single').toString().toLowerCase(),
        'status': (r['status'] ?? 'available').toString().toLowerCase(),
        'notes': r['notes'] ?? ''
      }).toList(),
      'kitchens': (data['kitchens'] as List? ?? []).map((k) => {
        'id': k['id'],
        'name': k['name'],
        'status': k['status'] ?? 'Available',
        'notes': k['notes'] ?? ''
      }).toList(),
      'cooks': (data['cooks'] as List? ?? []).map((c) => {
        'id': c['id'],
        'name': c['name'],
        'phone': c['phone'],
        'specialty': c['specialty'],
        'status': c['status'] ?? 'Available',
        'availability': c['availability'] ?? 'Available',
        'source': c['source'] ?? 'In House'
      }).toList(),
      'laundries': (data['laundry'] as List? ?? data['laundries'] as List? ?? []).map((l) => {
        'id': l['id'],
        'name': l['name'],
        'phone': l['phone'],
        'status': l['status'] ?? 'Available',
        'notes': l['notes'] ?? ''
      }).toList(),
      'contacts': (data['contacts'] as List? ?? []).map((c) => {
        'id': c['id'],
        'label': c['label'] ?? c['name'],
        'phone': c['phone'],
        'email': c['email'],
        'is_active': c['isActive'] ?? c['is_active'] ?? true
      }).toList()
    };
  }

  Future<void> _fetchGuestHouses() async {
    setState(() => _isLoading = true);
    try {
      final list = await _tripService.fetchGuestHouses();
      setState(() {
        _guestHouses = list.map((gh) => _normalizeGuestHouse(gh)).toList();
        _filteredGuestHouses = _guestHouses;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _fetchAccommodationRequests() async {
    setState(() => _isAccLoading = true);
    try {
      final trips = await _tripService.fetchTrips(all: true);
      if (mounted) {
        setState(() {
          _accRequests = trips.where((t) {
            final requests = t.accommodationRequests ?? [];
            return requests.any((r) => r.toString().toLowerCase().contains('room')) && !t.hasGhBooking;
          }).map((t) => {
            'trip_id': t.tripId,
            'employee_name': t.employee,
            'employee_id': t.id,
            'destination': t.destination,
            'start_date': t.startDate,
            'end_date': t.endDate,
            'original_trip': t,
          }).toList();
          _isAccLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Failed to fetch requests: $e");
      if (mounted) setState(() => _isAccLoading = false);
    }
  }

  void _applySearch(String query) {
    setState(() {
      _searchQuery = query;
      _filteredGuestHouses = _guestHouses.where((gh) {
        final name = gh['name']?.toString().toLowerCase() ?? "";
        final addr = gh['address']?.toString().toLowerCase() ?? "";
        final loc = gh['location']?.toString().toLowerCase() ?? "";
        return name.contains(query.toLowerCase()) || addr.contains(query.toLowerCase()) || loc.contains(query.toLowerCase());
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _selectedGuestHouse == null ? _buildListAppBar() : _buildDetailAppBar(),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C1D1D)))
        : _selectedGuestHouse == null ? _buildListView() : _buildDetailView(),
    );
  }

  PreferredSizeWidget _buildListAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20), onPressed: () => Navigator.pop(context)),
      title: Text('Guest Houses', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
      centerTitle: true,
      actions: [
        if (_isAdmin || _isCro)
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF7C1D1D)),
            onPressed: () => _openAddEditModal(),
          ),
      ],
    );
  }

  PreferredSizeWidget _buildDetailAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(icon: const Icon(Icons.arrow_back_rounded, color: Colors.black), onPressed: () => setState(() {
        _selectedGuestHouse = null;
        _activeBookingRequest = null;
      })),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_selectedGuestHouse!['name'], style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 18)),
          Text(_selectedGuestHouse!['location'] ?? _selectedGuestHouse!['address'], style: GoogleFonts.inter(fontSize: 12, color: Colors.black26, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
      bottom: TabBar(
        controller: _tabController,
        isScrollable: true,
        labelColor: const Color(0xFF7C1D1D),
        unselectedLabelColor: Colors.black26,
        indicatorColor: const Color(0xFF7C1D1D),
        indicatorWeight: 3,
        tabs: const [
          Tab(icon: Icon(Icons.bed_rounded, size: 18), text: 'Rooms'),
          Tab(icon: Icon(Icons.soup_kitchen_rounded, size: 18), text: 'Kitchen'),
          Tab(icon: Icon(Icons.person_rounded, size: 18), text: 'Cooks'),
          Tab(icon: Icon(Icons.local_laundry_service_rounded, size: 18), text: 'Laundry'),
          Tab(icon: Icon(Icons.mail_outline_rounded, size: 18), text: 'Requests'),
          Tab(icon: Icon(Icons.contact_phone_rounded, size: 18), text: 'Contacts'),
          Tab(icon: Icon(Icons.calendar_month_rounded, size: 18), text: 'Calendar'),
        ],
      ),
    );
  }

  Widget _buildListView() {
    return Column(
      children: [
        if (_isAdmin || _isCro)
          Container(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
            color: Colors.white,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: [
                  Expanded(child: _toggleBtn('Properties', !_showRequests, () => setState(() => _showRequests = false))),
                  Expanded(child: _toggleBtn('All Requests', _showRequests, () => setState(() => _showRequests = true))),
                ],
              ),
            ),
          ),
        if (!_showRequests) _buildSearchBar(),
        Expanded(
          child: _showRequests 
            ? _buildRequestsView()
            : _filteredGuestHouses.isEmpty 
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  itemCount: _filteredGuestHouses.length,
                  itemBuilder: (context, index) => _buildGuestHouseCard(_filteredGuestHouses[index]),
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

  Widget _buildRequestsView() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
          child: Row(
            children: [
              Text('Accommodation Requests', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
              const Spacer(),
              if (_isAccLoading) const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF7C1D1D))),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchAccommodationRequests,
            child: _accRequests.isEmpty 
              ? _buildEmptyRequestsState()
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  itemCount: _accRequests.length,
                  itemBuilder: (context, index) => _buildRequestCard(_accRequests[index]),
                ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyRequestsState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.mail_outline_rounded, size: 80, color: Colors.grey.shade100),
          const SizedBox(height: 16),
          Text('No active room requests found.', style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Requests from employees will appear here.', style: GoogleFonts.inter(color: Colors.black12, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildFilteredRequestsView() {
    final filtered = _accRequests.where((req) {
      final dest = (req['destination'] ?? '').toString().toLowerCase();
      final ghName = (_selectedGuestHouse!['name'] ?? '').toString().toLowerCase();
      final ghLoc = (_selectedGuestHouse!['location'] ?? '').toString().toLowerCase();
      return dest.contains(ghName) || dest.contains(ghLoc) || ghName.contains(dest) || ghLoc.contains(dest);
    }).toList();

    return Column(
      children: [
        Expanded(
          child: filtered.isEmpty 
            ? _buildEmptyRequestsState()
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                itemCount: filtered.length,
                itemBuilder: (context, index) => _buildRequestCard(filtered[index]),
              ),
        ),
      ],
    );
  }

  Map<String, dynamic>? _findMatchingGH(String destination) {
    if (destination.isEmpty) return null;
    final dest = destination.toLowerCase();
    for (var gh in _guestHouses) {
      final name = (gh['name'] ?? '').toString().toLowerCase();
      final loc = (gh['location'] ?? '').toString().toLowerCase();
      final addr = (gh['address'] ?? '').toString().toLowerCase();
      
      if (name.contains(dest) || loc.contains(dest) || addr.contains(dest) || 
          dest.contains(name) || dest.contains(loc)) {
        return gh;
      }
    }
    return null;
  }

  Widget _buildRequestCard(Map<String, dynamic> req) {
    final matchingGH = _findMatchingGH(req['destination'] ?? '');
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (matchingGH != null ? const Color(0xFF059669) : const Color(0xFF7C1D1D)).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  matchingGH != null ? 'GH AVAILABLE' : 'NO FACILITY FOUND',
                  style: GoogleFonts.inter(
                    fontSize: 10, 
                    fontWeight: FontWeight.w900, 
                    color: matchingGH != null ? const Color(0xFF059669) : const Color(0xFF7C1D1D)
                  ),
                ),
              ),
              Text(req['trip_id'] ?? '', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black26)),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '${req['employee_name']} has requested a room stayed for their trip to ${req['destination']}.',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A), height: 1.4),
          ),
          const SizedBox(height: 20),
          _reqInfoRow(Icons.calendar_today_rounded, 'Stay Duration', '${req['start_date']} to ${req['end_date']}'),
          const SizedBox(height: 24),
          if (matchingGH != null) ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  setState(() {
                    _selectedGuestHouse = matchingGH;
                    _activeBookingRequest = req['original_trip'];
                    _showRequests = false;
                    _tabController.index = 6; // Go to Calendar tab for booking
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Selected ${matchingGH['name']} for ${req['trip_id']}. Select a room to book.'),
                      backgroundColor: const Color(0xFF0F172A),
                    )
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C1D1D),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                child: Text('BOOK ROOM @ ${matchingGH['name'].toString().toUpperCase()}', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 13)),
              ),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _openAssignRoomModal(req),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  side: const BorderSide(color: Color(0xFFF1F5F9)),
                ),
                child: Text('NOTIFY EMPLOYEE: NO FACILITY', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D), fontSize: 13)),
              ),
            ),
          ],
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

  void _openAssignRoomModal(Map<String, dynamic> req) {
    final TextEditingController locationCtrl = TextEditingController(text: req['destination']);
    final TextEditingController detailsCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(32))),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Assign Room', style: GoogleFonts.interTight(fontSize: 24, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                      Text('Trip ID: ${req['trip_id']}', style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
                ],
              ),
              const SizedBox(height: 32),
              Text('GUEST HOUSE / LOCATION*', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black54)),
              const SizedBox(height: 8),
              TextField(
                controller: locationCtrl,
                decoration: InputDecoration(
                  hintText: 'Enter guest house name or city',
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 24),
              Text('ROOM DETAILS / INSTRUCTIONS*', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black54)),
              const SizedBox(height: 8),
              TextField(
                controller: detailsCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Room number, check-in instructions, etc.',
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (locationCtrl.text.isEmpty || detailsCtrl.text.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields')));
                      return;
                    }
                    try {
                      await _apiService.post('${ApiConstants.baseUrl}/api/notifications/', body: {
                        'title': 'Accommodation Details',
                        'message': 'Guest house stay details for your trip ${req['trip_id']}: ${locationCtrl.text}. Instructions: ${detailsCtrl.text}',
                        'type': 'accommodation_update',
                        'trip_id': req['trip_id'],
                      });
                      if (mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Details sent to employee')));
                        _fetchAccommodationRequests();
                      }
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C1D1D),
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('SEND TO EMPLOYEE', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1)),
                ),
              ),
            ],
          ),
        ),
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
          hintText: 'Search Guest Houses...',
          hintStyle: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.w600),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.apartment_rounded, size: 80, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          Text('No corporate properties found', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Widget _buildGuestHouseCard(Map<String, dynamic> gh) {
    return GestureDetector(
      onTap: () => setState(() {
        _selectedGuestHouse = gh;
        _tabController.index = 0;
        _selectedRoomIdx = 0;
        _expandedBooking = null;
        _expandedRoom = null;
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFF1F5F9)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8))]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Hero(
                  tag: 'gh_img_${gh['id']}',
                  child: Container(
                    height: 180,
                    width: double.infinity,
                    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: const BorderRadius.vertical(top: Radius.circular(24))),
                    child: (gh['image'] != null && gh['image'].toString().isNotEmpty)
                      ? ClipRRect(borderRadius: const BorderRadius.vertical(top: Radius.circular(24)), child: Image.network(gh['image'], fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.apartment_rounded, size: 60, color: Colors.black12))))
                      : const Center(child: Icon(Icons.apartment_rounded, size: 60, color: Colors.black12)),
                  ),
                ),
                Positioned(top: 15, right: 15, child: _statusBadge(gh['isActive'] == true)),
                if (_isAdmin || _isCro)
                  Positioned(
                    top: 15, left: 15,
                    child: Row(
                      children: [
                        _circleAction(Icons.edit_rounded, Colors.blue, () => _openAddEditModal(gh: gh)),
                        const SizedBox(width: 8),
                        _circleAction(Icons.delete_outline_rounded, Colors.red, () => _confirmDelete(gh)),
                      ],
                    ),
                  ),
                Positioned(
                  bottom: 0, right: 15,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFF7C1D1D), borderRadius: const BorderRadius.vertical(top: Radius.circular(12))),
                    child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(gh['name'], style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFF7C1D1D)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(gh['location'] ?? gh['address'], style: GoogleFonts.inter(fontSize: 13, color: Colors.black45, fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _badge(Icons.bed_rounded, '${gh['rooms']?.length ?? 0} Rooms'),
                      const SizedBox(width: 12),
                      _badge(Icons.soup_kitchen_rounded, '${gh['kitchens']?.length ?? 0} Kitchens'),
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

  Widget _badge(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.black26),
          const SizedBox(width: 8),
          Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _statusBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: isActive ? const Color(0xFF22C55E) : const Color(0xFF94A3B8), borderRadius: BorderRadius.circular(100), border: Border.all(color: Colors.white, width: 2)),
      child: Text(isActive ? 'OPERATIONAL' : 'STANDBY', style: GoogleFonts.inter(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
    );
  }

  Widget _circleAction(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10)]),
        child: Icon(icon, size: 18, color: color),
      ),
    );
  }

  Widget _buildDetailView() {
    return TabBarView(
      controller: _tabController,
      children: [
        _buildItemsList('rooms'),
        _buildItemsList('kitchens'),
        _buildItemsList('cooks'),
        _buildItemsList('laundries'), 
        _buildFilteredRequestsView(),
        _buildItemsList('contacts'),
        _buildCalendarView(),
      ],
    );
  }

  Widget _buildItemsList(String type) {
    final list = _selectedGuestHouse![type] ?? [];
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
            ? Center(child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_getIconForType(type), size: 64, color: Colors.grey.shade200),
                    const SizedBox(height: 16),
                    Text('No $type records available.', textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.bold)),
                  ],
                ),
              ))
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: list.length,
                itemBuilder: (context, index) => _buildSubItemCard(type, list[index]),
              ),
        ),
      ],
    );
  }

  Widget _buildSubItemCard(String type, Map<String, dynamic> item) {
    final title = item['name'] ?? item['number'] ?? item['label'] ?? 'Record';
    final subtitle = type == 'rooms' 
        ? (item['type'] ?? item['room_type'] ?? 'Single').toString().toUpperCase() 
        : (item['phone'] ?? item['specialty'] ?? '');
    final status = (item['status']?.toString() ?? 'Available');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(15)),
            child: Icon(_getIconForType(type), color: const Color(0xFF7C1D1D), size: 24),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                const SizedBox(height: 2),
                Text(subtitle, style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _statusChip(status),
              if (_isAdmin)
                Row(
                  children: [
                    IconButton(icon: const Icon(Icons.edit_outlined, size: 20, color: Colors.black12), onPressed: () => _openAddItemModal(type, item: item)),
                    IconButton(icon: const Icon(Icons.delete_outline_rounded, size: 20, color: Colors.black12), onPressed: () => _deleteSubItem(type, item['id'])),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusChip(String status) {
    Color color = Colors.green;
    if (status.toLowerCase().contains('occupied')) color = Colors.orange;
    if (status.toLowerCase().contains('mainten')) color = Colors.red;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(status.toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: color)),
    );
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'rooms': return Icons.bed_rounded;
      case 'kitchens': return Icons.soup_kitchen_rounded;
      case 'cooks': return Icons.restaurant_menu_rounded;
      case 'laundry': return Icons.local_laundry_service_rounded;
      default: return Icons.phone_android_rounded;
    }
  }

  DateTime _safeParse(String? dateStr, {DateTime? fallback}) {
    if (dateStr == null || dateStr.isEmpty) return fallback ?? DateTime.now();
    try {
      return DateTime.parse(dateStr);
    } catch (_) {
      return fallback ?? DateTime.now();
    }
  }

  Widget _buildCalendarView() {
    final rooms = (List.from(_selectedGuestHouse!['rooms'] ?? [])).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    if (rooms.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.calendar_month_rounded, size: 80, color: Colors.grey.shade100),
            const SizedBox(height: 16),
            Text('No rooms found to display in calendar.', style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    final daysInMonth = DateUtils.getDaysInMonth(_currentCalendarDate.year, _currentCalendarDate.month);
    final monthName = DateFormat('MMMM yyyy').format(_currentCalendarDate);
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // UI matches Web: Navigation and Title
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(monthName, style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                Row(
                  children: [
                    _navBtn(Icons.chevron_left, () => setState(() {
                      _currentCalendarDate = DateTime(_currentCalendarDate.year, _currentCalendarDate.month - 1);
                      _expandedBooking = null;
                    })),
                    const SizedBox(width: 8),
                    _navBtn(Icons.chevron_right, () => setState(() {
                      _currentCalendarDate = DateTime(_currentCalendarDate.year, _currentCalendarDate.month + 1);
                      _expandedBooking = null;
                    })),
                  ],
                ),
              ],
            ),
          ),

          // Horizontal Timeline view (The "Match Web" feature)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Dates Header
                  Row(
                    children: [
                      Container(width: 80, height: 40, alignment: Alignment.centerLeft, child: Text("ROOM", style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26))),
                      ...List.generate(daysInMonth, (i) {
                        final d = i + 1;
                        final date = DateTime(_currentCalendarDate.year, _currentCalendarDate.month, d);
                        final isToday = todayOnly.day == d && todayOnly.month == _currentCalendarDate.month && todayOnly.year == _currentCalendarDate.year;
                        return Container(
                          width: 40, height: 40,
                          decoration: isToday ? BoxDecoration(color: const Color(0xFF7C1D1D).withOpacity(0.05), borderRadius: BorderRadius.circular(8)) : null,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('$d', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: isToday ? const Color(0xFF7C1D1D) : Colors.black45)),
                              Text(DateFormat('E').format(date).substring(0, 2), style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.black26)),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                  const SizedBox(height: 10),
                  // Room Rows
                  ...rooms.map((room) {
                    final bookings = List.from(room['bookings'] ?? []);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Container(
                            width: 80, height: 40,
                            alignment: Alignment.centerLeft,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(room['number']?.toString() ?? 'RM', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                                Text((room['room_type'] ?? 'Single').toString().toUpperCase(), style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.black26)),
                              ],
                            ),
                          ),
                          ...List.generate(daysInMonth, (i) {
                            final day = i + 1;
                            final cellDate = DateTime(_currentCalendarDate.year, _currentCalendarDate.month, day);
                            final cellDateOnly = DateTime(cellDate.year, cellDate.month, cellDate.day);
                            final bool isPastDate = cellDateOnly.isBefore(todayOnly);
                            
                            Map<String, dynamic>? active;
                            for (var b in bookings) {
                              final startStr = b['start_date']?.toString();
                              final endStr = b['end_date']?.toString();
                              if (startStr == null || endStr == null) continue;
                              final start = _safeParse(startStr);
                              final end = _safeParse(endStr);
                              final dStart = DateTime(start.year, start.month, start.day);
                              final dEnd = DateTime(end.year, end.month, end.day);
                              if (cellDateOnly.isAtSameMomentAs(dStart) || cellDateOnly.isAtSameMomentAs(dEnd) || (cellDateOnly.isAfter(dStart) && cellDateOnly.isBefore(dEnd))) {
                                active = b;
                                break;
                              }
                            }

                            Color cellColor = Colors.white;
                            if (active != null) {
                              final bType = (active['booking_type'] ?? 'Official').toString().toLowerCase();
                              cellColor = bType == 'maintenance' ? const Color(0xFFEA580C) : const Color(0xFF2563EB);
                            }

                            return GestureDetector(
                              onTap: () {
                                if (isPastDate) return;
                                if (active != null) {
                                  setState(() {
                                    _expandedBooking = active;
                                    _expandedRoom = room;
                                  });
                                } else {
                                  _openBookingModal(room, cellDate);
                                }
                              },
                              child: Container(
                                width: 34, height: 34,
                                margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 3),
                                decoration: BoxDecoration(
                                  color: cellColor,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: active != null ? cellColor : const Color(0xFFF1F5F9)),
                                  boxShadow: active != null ? [BoxShadow(color: cellColor.withOpacity(0.2), blurRadius: 4)] : null,
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),

          _buildLegend(),

          // Details Card
          if (_expandedBooking != null) _buildBookingDetailsTable(),

          // Event Log (Matches Web Aesthetic)
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 30, 20, 10),
            child: Text('MONTHLY EVENT LOG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black38, letterSpacing: 0.5)),
          ),
          _buildEventLog(rooms),
        ],
      ),
    );
  }

  Widget _buildEventLog(List<Map<String, dynamic>> rooms) {
    List<Map<String, dynamic>> allEvents = [];
    for (var r in rooms) {
      final bookings = List.from(r['bookings'] ?? []);
      for (var b in bookings) {
        final startStr = b['start_date']?.toString();
        if (startStr == null) continue;
        final start = _safeParse(startStr);
        if (start.month == _currentCalendarDate.month && start.year == _currentCalendarDate.year) {
          allEvents.add({...b, 'room_number': r['number']});
        }
      }
    }
    allEvents.sort((a, b) => (a['start_date'] ?? '').compareTo(b['start_date'] ?? ''));

    if (allEvents.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Text('No events recorded for this month.', style: GoogleFonts.inter(fontSize: 12, color: Colors.black26, fontWeight: FontWeight.w600)),
      );
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Column(
        children: allEvents.map((e) => Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9)))),
          child: Row(
            children: [
              Container(width: 40, height: 40, decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)), child: Center(child: Text(e['room_number']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)))),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(e['guest_name'] ?? 'Guest', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14)),
                    Text('${e['start_date']} to ${e['end_date']}', style: GoogleFonts.inter(fontSize: 11, color: Colors.black38, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              _statusChip(e['booking_type'] ?? 'Official'),
            ],
          ),
        )).toList(),
      ),
    );
  }

  Widget _buildBookingDetailsTable() {
    final booking = _expandedBooking!;
    final room = _expandedRoom!;

    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Booking Information', style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 20, color: Colors.black26),
                onPressed: () => setState(() {
                  _expandedBooking = null;
                  _expandedRoom = null;
                }),
              ),
            ],
          ),
          const SizedBox(height: 15),
          _tableRow('Room Number', room['number'] ?? '-'),
          _tableRow('Guest Name', booking['guest_name'] ?? '-'),
          _tableRow('Check In', booking['start_date'] ?? '-'),
          _tableRow('Check Out', booking['end_date'] ?? '-'),
          _tableRow('Booking Type', booking['booking_type'] ?? 'Official'),
          if (booking['remarks'] != null && booking['remarks'].toString().isNotEmpty)
            _tableRow('Remarks', booking['remarks']),
          if (booking['trip_id'] != null)
             _tableRow('Linked Trip', booking['trip_id'].toString()),
        ],
      ),
    );
  }

  Widget _tableRow(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF8FAFC)))),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black26)),
          ),
          Expanded(
            flex: 3,
            child: Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthCell(Map<String, dynamic> room, int day) {
    final cellDate = DateTime(_currentCalendarDate.year, _currentCalendarDate.month, day);
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);
    final cellDateOnly = DateTime(cellDate.year, cellDate.month, cellDate.day);
    final bool isPastDate = cellDateOnly.isBefore(todayOnly);
    final bookings = List.from(room['bookings'] ?? []);
    Map<String, dynamic>? activeBooking;
    
    for (var b in bookings) {
      if (b['start_date'] == null || b['end_date'] == null) continue;
      final start = DateTime.parse(b['start_date']);
      final end = DateTime.parse(b['end_date']);
      final dStart = DateTime(start.year, start.month, start.day);
      final dEnd = DateTime(end.year, end.month, end.day);
      final dCell = DateTime(cellDate.year, cellDate.month, cellDate.day);

      if (dCell.isAtSameMomentAs(dStart) || dCell.isAtSameMomentAs(dEnd) || (dCell.isAfter(dStart) && dCell.isBefore(dEnd))) {
        activeBooking = b;
        break;
      }
    }

    Color cellColor = const Color(0xFF059669); // Available (Green)
    Color textColor = Colors.white;

    if (activeBooking != null) {
      final String bookingType = (activeBooking['booking_type'] ?? 'Official').toString().toLowerCase();
      if (bookingType == 'maintenance') {
        cellColor = const Color(0xFFEA580C); // Maintenance (Orange)
      } else {
        cellColor = const Color(0xFF2563EB); // Occupied (Blue)
      }
    } else {
      cellColor = Colors.white; 
      textColor = const Color(0xFF0F172A);
    }

    final bool isToday = DateTime.now().year == cellDate.year && DateTime.now().month == cellDate.month && DateTime.now().day == cellDate.day;
    final bool isExpanded = _expandedBooking != null && _expandedBooking == activeBooking;

    return GestureDetector(
      onTap: () {
        if (isPastDate) return;

        if (activeBooking != null) {
          setState(() {
            if (_expandedBooking == activeBooking) {
              _expandedBooking = null;
              _expandedRoom = null;
            } else {
              _expandedBooking = activeBooking;
              _expandedRoom = room;
            }
          });
        } else {
          _openBookingModal(room, cellDate);
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: cellColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isExpanded ? const Color(0xFF7C1D1D) : (isToday ? const Color(0xFF7C1D1D).withOpacity(0.5) : (activeBooking != null ? cellColor : const Color(0xFFE2E8F0))), 
            width: isExpanded ? 2.5 : (isToday ? 2 : (activeBooking != null ? 0 : 1)),
          ),
          boxShadow: activeBooking != null ? [BoxShadow(color: cellColor.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4))] : null,
        ),
        child: Center(
          child: Text(
            '$day',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLegend() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Wrap(
        spacing: 24,
        runSpacing: 12,
        children: [
          _legendItem(const Color(0xFF2563EB), 'Occupied'),
          _legendItem(const Color(0xFFEA580C), 'Maintenance'),
          // _legendItem(const Color(0xFF059669), 'Available'),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.2),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            color: const Color(0xFF475569),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _navBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)), child: Icon(icon, size: 16)),
    );
  }

  void _showBookingDetails(Map<String, dynamic> room, Map<String, dynamic> booking) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Booking Details - ${room['number']}', style: GoogleFonts.interTight(fontWeight: FontWeight.w900)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _detailRow('Guest', booking['guest_name'] ?? '-'),
            _detailRow('Check In', booking['start_date'] ?? '-'),
            _detailRow('Check Out', booking['end_date'] ?? '-'),
            _detailRow('Type', booking['booking_type'] ?? 'Official'),
            if (booking['remarks'] != null) _detailRow('Remarks', booking['remarks']),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: RichText(text: TextSpan(
        style: GoogleFonts.inter(color: Colors.black, fontSize: 13),
        children: [
          TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.bold)),
          TextSpan(text: value),
        ]
      )),
    );
  }

  // --- Exact Web Form Parity Modals ---

  void _openAddEditModal({Map<String, dynamic>? gh}) {
    final nameCtrl = TextEditingController(text: gh?['name']);
    final addrCtrl = TextEditingController(text: gh?['address']);
    final locCtrl = TextEditingController(text: gh?['location']);
    final pcCtrl = TextEditingController(text: gh?['pincode']);
    final descCtrl = TextEditingController(text: gh?['description']);
    final latCtrl = TextEditingController(text: gh?['latitude']?.toString());
    final lonCtrl = TextEditingController(text: gh?['longitude']?.toString());
    final imgCtrl = TextEditingController(text: gh?['image']);
    bool isActive = gh?['isActive'] ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, sb) => Container(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _modalHeader(gh == null ? 'Add Guest House' : 'Edit Guest House'),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      _inputField('House Title*', nameCtrl),
                      _inputField('Full Address*', addrCtrl, maxLines: 2),
                      Row(
                        children: [
                          Expanded(child: _inputField('City/Location', locCtrl)),
                          const SizedBox(width: 16),
                          Expanded(child: _inputField('Pincode*', pcCtrl)),
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(child: _inputField('Latitude', latCtrl)),
                          const SizedBox(width: 16),
                          Expanded(child: _inputField('Longitude', lonCtrl)),
                        ],
                      ),
                      _inputField('Image URL', imgCtrl),
                      _inputField('Description', descCtrl, maxLines: 2),
                      SwitchListTile(
                        title: Text('Property Operational', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                        value: isActive,
                        activeColor: const Color(0xFF7C1D1D),
                        onChanged: (v) => sb(() => isActive = v),
                      ),
                      const SizedBox(height: 24),
                      _actionBtn('Save Property', () async {
                        if (nameCtrl.text.isEmpty || addrCtrl.text.isEmpty || pcCtrl.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all required fields.')));
                          return;
                        }
                        final data = {
                          'name': nameCtrl.text,
                          'address': addrCtrl.text,
                          'location': locCtrl.text,
                          'pincode': pcCtrl.text,
                          'isActive': isActive,
                          'latitude': latCtrl.text,
                          'longitude': lonCtrl.text,
                          'image': imgCtrl.text,
                          'description': descCtrl.text,
                          'rooms': gh?['rooms'] ?? [],
                          'kitchens': gh?['kitchens'] ?? [],
                          'cooks': gh?['cooks'] ?? [],
                          'laundry': gh?['laundry'] ?? [],
                          'contacts': gh?['contacts'] ?? []
                        };
                        final payload = _prepareGhPayload(data);
                        try {
                          await _tripService.saveGuestHouse(payload, id: gh?['id']);
                          if (mounted) Navigator.pop(context);
                          _fetchGuestHouses();
                        } catch (e) {
                           if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                        }
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openAddItemModal(String type, {Map<String, dynamic>? item}) {
    final nameCtrl = TextEditingController(text: item?['name'] ?? item?['number'] ?? item?['label']);
    final typeCtrl = TextEditingController(text: item?['room_type'] ?? 'single');
    final phoneCtrl = TextEditingController(text: item?['phone']);
    final emailCtrl = TextEditingController(text: item?['email']);
    final specCtrl = TextEditingController(text: item?['specialty']);
    final sourceCtrl = TextEditingController(text: item?['source'] ?? 'In House');
    final statusCtrl = TextEditingController(text: item?['status'] ?? item?['availability'] ?? 'Available');
    final notesCtrl = TextEditingController(text: item?['notes']);
    bool isActive = item?['is_active'] ?? item?['isActive'] ?? true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, sb) => Container(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _modalHeader('${item == null ? 'Add' : 'Edit'} $type'),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      _inputField(type == 'contacts' ? 'Label (e.g. Manager)*' : 'Name/Number*', nameCtrl),
                      if (type == 'rooms') 
                        Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: DropdownButtonFormField<String>(
                            value: typeCtrl.text.toLowerCase(),
                            items: ['single', 'double', 'suite'].map((t) => DropdownMenuItem(value: t, child: Text(t.toUpperCase()))).toList(),
                            onChanged: (v) => sb(() => typeCtrl.text = v!),
                            decoration: _inputDecor('Type'),
                          ),
                        ),
                      if (type == 'cooks' || type == 'contacts' || type == 'laundry') 
                        _inputField('Phone Number*', phoneCtrl),
                      if (type == 'contacts') 
                        _inputField('Email', emailCtrl),
                      if (type == 'cooks') ...[
                        _inputField('Specialty', specCtrl),
                        _inputField('Source (e.g. Agency)', sourceCtrl),
                      ],
                      if (type == 'rooms' || type == 'kitchens' || type == 'laundry')
                        _inputField('Notes', notesCtrl, maxLines: 2),

                      Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: DropdownButtonFormField<String>(
                          value: statusCtrl.text,
                          items: ['Available', 'Occupied', 'Maintenance'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                          onChanged: (v) => sb(() => statusCtrl.text = v!),
                          decoration: _inputDecor(type == 'cooks' ? 'Availability' : 'Status'),
                        ),
                      ),
                      
                      if (type == 'contacts')
                        SwitchListTile(
                          title: Text('Contact Active', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                          value: isActive,
                          onChanged: (v) => sb(() => isActive = v),
                        ),
                      
                      const SizedBox(height: 24),
                      _actionBtn(item == null ? 'Create Item' : 'Update Item', () async {
                        if (nameCtrl.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Name/Label is required.')));
                          return;
                        }
                        
                        final List current = List.from(_selectedGuestHouse![type] ?? []);
                        final Map<String, dynamic> newItem = {
                          'id': item?['id'],
                          'name': nameCtrl.text,
                          'number': nameCtrl.text,
                          'room_type': typeCtrl.text.toLowerCase(),
                          'status': statusCtrl.text,
                          'availability': statusCtrl.text,
                          'phone': phoneCtrl.text,
                          'email': emailCtrl.text,
                          'specialty': specCtrl.text,
                          'source': sourceCtrl.text,
                          'notes': notesCtrl.text,
                          'label': nameCtrl.text,
                          'is_active': isActive,
                        };

                        if (item != null) {
                          final idx = current.indexWhere((i) => i['id'] == item['id']);
                          if (idx != -1) current[idx] = newItem;
                        } else {
                          current.add(newItem);
                        }
                        
                        final Map<String, dynamic> updatedData = Map<String, dynamic>.from(_selectedGuestHouse!);
                        updatedData[type] = current;
                        final payload = _prepareGhPayload(updatedData);
                        
                        try {
                          await _tripService.saveGuestHouse(payload, id: updatedData['id']);
                          if (mounted) Navigator.pop(context);
                          _refreshSelected();
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                        }
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openBookingModal(Map<String, dynamic> room, DateTime date) {
    final nameCtrl = TextEditingController(text: _activeBookingRequest?.employee ?? '');
    final remarksCtrl = TextEditingController(text: _activeBookingRequest?.purpose ?? '');
    final searchCtrl = TextEditingController();
    DateTime checkIn = _activeBookingRequest != null ? _safeParse(_activeBookingRequest!.startDate) : date;
    DateTime checkOut = _activeBookingRequest != null ? _safeParse(_activeBookingRequest!.endDate) : date.add(const Duration(days: 1));
    String bookingTab = _activeBookingRequest != null ? 'Official' : 'Personal';
    
    // Ensure dates are not in the past for fresh bookings
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);
    if (checkIn.isBefore(todayOnly)) checkIn = todayOnly;
    if (checkOut.isBefore(checkIn)) checkOut = checkIn.add(const Duration(days: 1));
    
    List<Trip> searchResults = [];
    Trip? selectedTrip = _activeBookingRequest;
    bool isSearching = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, sb) => Container(
          padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _modalHeader('New Booking - RM ${room['number']}'),
                
                // Tabs Row
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                  child: Row(
                    children: ['Official', 'Personal', 'Maintenance'].map((t) => Expanded(
                      child: GestureDetector(
                        onTap: () => sb(() {
                          bookingTab = t;
                          if (t == 'Maintenance' && !['Painting', 'Electrical', 'Plumbing', 'Cleaning', 'Repair'].contains(nameCtrl.text)) {
                            nameCtrl.text = 'Painting';
                          }
                        }),
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: bookingTab == t ? const Color(0xFF7C1D1D) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(child: Text(t, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: bookingTab == t ? Colors.white : Colors.black45))),
                        ),
                      ),
                    )).toList(),
                  ),
                ),

                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      if (bookingTab == 'Official') ...[
                        _inputField('Search Trip (Trip ID)', searchCtrl, onChanged: (v) async {
                          if (v.length > 2) {
                             sb(() => isSearching = true);
                             final res = await _tripService.fetchTrips(search: v);
                             sb(() { 
                               searchResults = res;
                               isSearching = false;
                             });
                          }
                        }),
                        if (isSearching) const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        if (searchResults.isNotEmpty && selectedTrip == null)
                          Container(
                            constraints: const BoxConstraints(maxHeight: 200),
                            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                            child: ListView.builder(
                              shrinkWrap: true,
                              itemCount: searchResults.length,
                              itemBuilder: (context, idx) => ListTile(
                                title: Text(searchResults[idx].tripId, style: const TextStyle(fontWeight: FontWeight.bold)),
                                subtitle: Text('${searchResults[idx].title} - ${searchResults[idx].employee}'),
                                onTap: () {
                                  sb(() {
                                    selectedTrip = searchResults[idx];
                                    nameCtrl.text = selectedTrip!.employee;
                                    checkIn = _safeParse(selectedTrip!.startDate, fallback: checkIn);
                                    checkOut = _safeParse(selectedTrip!.endDate, fallback: checkOut);
                                    searchResults = [];
                                  });
                                },
                              ),
                            ),
                          ),
                        if (selectedTrip != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.green.withOpacity(0.3))),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle, color: Colors.green, size: 20),
                                const SizedBox(width: 10),
                                Expanded(child: Text('Linked to ${selectedTrip!.tripId}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green))),
                                IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => sb(() => selectedTrip = null))
                              ],
                            ),
                          ),
                      ],
                      
                      if (bookingTab == 'Maintenance')
                        Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: DropdownButtonFormField<String>(
                            value: ['Painting', 'Electrical', 'Plumbing', 'Cleaning', 'Repair'].contains(nameCtrl.text) ? nameCtrl.text : 'Painting',
                            items: ['Painting', 'Electrical', 'Plumbing', 'Cleaning', 'Repair'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                            onChanged: (v) => sb(() => nameCtrl.text = v!),
                            decoration: _inputDecor('Maintenance Type'),
                          ),
                        )
                      else
                        _inputField('Guest Name', nameCtrl),
                      Row(
                        children: [
                          Expanded(child: _dateTile('Check In', checkIn, () async {
                            final d = await showDatePicker(
                              context: context, 
                              initialDate: checkIn, 
                              firstDate: DateTime.now().isBefore(checkIn) ? DateTime.now() : checkIn, 
                              lastDate: DateTime.now().add(const Duration(days: 365))
                            );
                            if (d != null) sb(() {
                              checkIn = d;
                              if (checkOut.isBefore(checkIn)) checkOut = checkIn.add(const Duration(days: 1));
                            });
                          })),
                          const SizedBox(width: 16),
                          Expanded(child: _dateTile('Check Out', checkOut, () async {
                            final d = await showDatePicker(
                              context: context, 
                              initialDate: checkOut, 
                              firstDate: checkIn, 
                              lastDate: DateTime.now().add(const Duration(days: 365))
                            );
                            if (d != null) sb(() => checkOut = d);
                          })),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _inputField('Remarks', remarksCtrl, maxLines: 2),
                      const SizedBox(height: 24),
                      _actionBtn('Confirm Booking', () async {
                        if (nameCtrl.text.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Guest Name is required.')));
                          return;
                        }
                        final data = {
                          'guest_name': nameCtrl.text,
                          'start_date': checkIn.toIso8601String(),
                          'end_date': checkOut.toIso8601String(),
                          'remarks': remarksCtrl.text,
                          'booking_type': bookingTab,
                          'trip': selectedTrip?.id,
                        };
                        try {
                          await _tripService.createRoomBooking(room['id'], data);
                          
                          // If we were booking for a specific request, notify the employee
                          if (_activeBookingRequest != null) {
                            try {
                              final rawUserId = _activeBookingRequest?.userId ?? '';
                              final numericUserId = int.tryParse(rawUserId);
                              if (numericUserId != null) {
                                await _apiService.post('${ApiConstants.baseUrl}/api/notifications/', body: {
                                  'title': 'Accommodation Confirmed',
                                  'message': 'Guest house room has been booked for your trip ${_activeBookingRequest!.tripId} to ${_activeBookingRequest!.destination} at ${_selectedGuestHouse!['name']}.',
                                  'type': 'info',
                                  'user': numericUserId,
                                });
                              }
                            } catch (nErr) {
                              debugPrint("Auto-notify failed: $nErr");
                            }
                            _activeBookingRequest = null;
                          }

                          if (mounted) Navigator.pop(context);
                          _refreshSelected();
                          _fetchAccommodationRequests(); // Refresh requests list
                        } catch (e) {
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                        }
                      }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _deleteSubItem(String type, int itemId) async {
    final List current = List.from(_selectedGuestHouse![type] ?? []);
    current.removeWhere((i) => i['id'] == itemId);
    final Map<String, dynamic> updatedData = Map<String, dynamic>.from(_selectedGuestHouse!);
    updatedData[type] = current;
    final payload = _prepareGhPayload(updatedData);
    try {
      await _tripService.saveGuestHouse(payload, id: updatedData['id']);
      _refreshSelected();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete item.')));
    }
  }

  void _confirmDelete(Map<String, dynamic> gh) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Property?', style: GoogleFonts.interTight(fontWeight: FontWeight.w900)),
        content: Text('Are you sure you want to remove "${gh['name']}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              try {
                await _tripService.deleteGuestHouse(gh['id']);
                if (mounted) Navigator.pop(context);
                _fetchGuestHouses();
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete Guest House.')));
              }
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _refreshSelected() async {
    try {
      final updated = await _tripService.fetchGuestHouseById(_selectedGuestHouse!['id']);
      setState(() {
        _selectedGuestHouse = _normalizeGuestHouse(updated);
        _fetchGuestHouses();
      });
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Refresh failed: $e')));
    }
  }

  // --- Utilities ---

  Widget _modalHeader(String title) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9)))),
      child: Center(child: Text(title.toUpperCase(), style: GoogleFonts.interTight(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), letterSpacing: 1))),
    );
  }

  Widget _inputField(String label, TextEditingController ctrl, {int maxLines = 1, Function(String)? onChanged}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26, letterSpacing: 0.5)),
          const SizedBox(height: 10),
          TextField(
            controller: ctrl,
            maxLines: maxLines,
            onChanged: onChanged,
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.all(18),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecor(String label) {
    return InputDecoration(
      labelText: label.toUpperCase(),
      labelStyle: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.all(18),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
    );
  }

  Widget _dateTile(String label, DateTime date, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label.toUpperCase(), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(18),
            width: double.infinity,
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(15)),
            child: Text(DateFormat('dd MMM yyyy').format(date), style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _actionBtn(String label, VoidCallback onTap) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), foregroundColor: Colors.white, minimumSize: const Size(double.infinity, 60), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)), elevation: 0),
      child: Text(label.toUpperCase(), style: GoogleFonts.inter(fontWeight: FontWeight.w900, letterSpacing: 1)),
    );
  }
}
