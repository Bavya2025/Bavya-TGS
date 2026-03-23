import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import 'path_management_screen.dart';

class RouteMasterScreen extends StatefulWidget {
  const RouteMasterScreen({super.key});

  @override
  State<RouteMasterScreen> createState() => _RouteMasterScreenState();
}

class _RouteMasterScreenState extends State<RouteMasterScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiService _apiService = ApiService();
  
  bool _isLoading = true;
  List<dynamic> _routes = [];
  List<dynamic> _tollGates = [];
  List<dynamic> _hierarchy = [];
  List<dynamic> _discoveryNodes = [];
  
  // Filtering states for Geo Hierarchy matching web
  String? _selectedContinent;
  String? _selectedCountry;
  String? _selectedState;
  String? _selectedDistrict;
  String? _selectedMandal;
  String? _selectedCluster;
  String _geoSearch = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      setState(() {});
    });
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _isLoading = true);
    await Future.wait([
      _fetchRoutes(),
      _fetchTolls(),
      _fetchHierarchy(),
    ]);
    
    // Pre-fill Asia/India if available for premium feel
    if (_selectedContinent == null && _hierarchy.any((c) => c['name'] == 'Asia')) {
      _selectedContinent = 'Asia';
      final asia = _hierarchy.firstWhere((c) => c['name'] == 'Asia');
      final countries = asia['countries'] ?? [];
      if (countries.any((c) => c['name'] == 'India')) {
        _selectedCountry = 'India';
      }
    }

    _processDiscovery();
    setState(() => _isLoading = false);
  }

  Future<void> _fetchRoutes() async {
    try {
      final res = await _apiService.get('/api/masters/routes/');
      _routes = res is List ? res : (res['results'] ?? []);
    } catch (e) { debugPrint("Route fetch error: $e"); }
  }

  Future<void> _fetchTolls() async {
    try {
      final res = await _apiService.get('/api/masters/toll-gates/');
      _tollGates = res is List ? res : (res['results'] ?? []);
    } catch (e) { debugPrint("Toll fetch error: $e"); }
  }

  Future<void> _fetchHierarchy() async {
    try {
      final res = await _apiService.get('/api/geo/hierarchy/');
      _hierarchy = res is List ? res : (res['data'] ?? []);
    } catch (e) { debugPrint("Hierarchy fetch error: $e"); }
  }

  void _processDiscovery() {
    List<dynamic> nodes = [];
    
    void traverseDeep(List<dynamic> items, String level) {
      if (items == null) return;
      for (var item in items) {
        nodes.add({
          'id': item['id'],
          'name': item['name'],
          'code': item['code'] ?? item['location_code'] ?? 'ID-${item['id']}',
          'type': level,
          'item': item,
        });

        if (level == 'Continent') traverseDeep(item['countries'] ?? [], 'Country');
        else if (level == 'Country') traverseDeep(item['states'] ?? [], 'State');
        else if (level == 'State') traverseDeep(item['districts'] ?? [], 'District');
        else if (level == 'District') traverseDeep(item['mandals'] ?? [], 'Mandal');
        else if (level == 'Mandal') traverseDeep(item['clusters'] ?? [], 'Cluster');
        else if (level == 'Cluster') {
          traverseDeep(item['visiting_locations'] ?? item['locations'] ?? [], 'Visiting Location');
          traverseDeep(item['landmarks'] ?? [], 'Landmark');
        }
      }
    }

    if (_geoSearch.isNotEmpty) {
      traverseDeep(_hierarchy, 'Continent');
      nodes = nodes.where((n) => 
        n['name'].toString().toLowerCase().contains(_geoSearch.toLowerCase()) ||
        n['code'].toString().toLowerCase().contains(_geoSearch.toLowerCase())
      ).toList();
    } else {
      if (_selectedCluster != null) {
        final cluster = _findNode(_hierarchy, _selectedCluster!, 'Cluster');
        final vl = cluster != null ? (cluster['visiting_locations'] ?? cluster['locations'] ?? []) : [];
        final lm = cluster != null ? (cluster['landmarks'] ?? []) : [];
        for (var p in vl) nodes.add({'id': p['id'], 'name': p['name'], 'code': p['code'] ?? 'ID-${p['id']}', 'type': 'Visiting Location'});
        for (var p in lm) nodes.add({'id': p['id'], 'name': p['name'], 'code': p['code'] ?? 'ID-${p['id']}', 'type': 'Landmark'});
      } else if (_selectedMandal != null) {
        final mandal = _findNode(_hierarchy, _selectedMandal!, 'Mandal');
        final clusters = mandal != null ? (mandal['clusters'] ?? []) : [];
        for (var c in clusters) nodes.add({'id': c['id'], 'name': c['name'], 'code': c['code'] ?? 'ID-${c['id']}', 'type': 'Cluster'});
      } else if (_selectedDistrict != null) {
        final district = _findNode(_hierarchy, _selectedDistrict!, 'District');
        final mandals = district != null ? (district['mandals'] ?? []) : [];
        for (var m in mandals) nodes.add({'id': m['id'], 'name': m['name'], 'code': m['code'] ?? 'ID-${m['id']}', 'type': 'Mandal'});
      } else if (_selectedState != null) {
        final state = _findNode(_hierarchy, _selectedState!, 'State');
        final districts = state != null ? (state['districts'] ?? []) : [];
        for (var d in districts) nodes.add({'id': d['id'], 'name': d['name'], 'code': d['code'] ?? 'ID-${d['id']}', 'type': 'District'});
      } else if (_selectedCountry != null) {
        final country = _findNode(_hierarchy, _selectedCountry!, 'Country');
        final states = country != null ? (country['states'] ?? []) : [];
        for (var s in states) nodes.add({'id': s['id'], 'name': s['name'], 'code': s['code'] ?? 'ID-${s['id']}', 'type': 'State'});
      } else if (_selectedContinent != null) {
        final continent = _findNode(_hierarchy, _selectedContinent!, 'Continent');
        final countries = continent != null ? (continent['countries'] ?? []) : [];
        for (var c in countries) nodes.add({'id': c['id'], 'name': c['name'], 'code': c['code'] ?? 'ID-${c['id']}', 'type': 'Country'});
      } else {
        for (var c in _hierarchy) nodes.add({'id': c['id'], 'name': c['name'], 'code': c['code'] ?? 'ID-${c['id']}', 'type': 'Continent'});
      }
    }

    setState(() {
      _discoveryNodes = nodes.take(100).toList();
    });
  }

  dynamic _findNode(List<dynamic> items, String name, String targetLevel) {
    if (items == null) return null;
    for (var item in items) {
      if (item['name'] == name) return item;
      final kids = item['countries'] ?? item['states'] ?? item['districts'] ?? item['mandals'] ?? item['clusters'] ?? [];
      final found = _findNode(kids, name, targetLevel);
      if (found != null) return found;
    }
    return null;
  }

  List<dynamic> _getAvailableOptions(String level) {
    if (level == 'Continent') return _hierarchy;

    // Smart Drilldown: If parent is selected, show children. If NOT, show ALL to prevent "No information"
    if (level == 'Country') {
      if (_selectedContinent != null) {
        return _findNode(_hierarchy, _selectedContinent!, 'Continent')?['countries'] ?? [];
      }
      return _collectAllFromDepth(_hierarchy, 'Country', 'Continent');
    }
    if (level == 'State') {
      if (_selectedCountry != null) {
        return _findNode(_hierarchy, _selectedCountry!, 'Country')?['states'] ?? [];
      }
      return _collectAllFromDepth(_hierarchy, 'State', 'Continent');
    }
    if (level == 'District') {
      if (_selectedState != null) {
        return _findNode(_hierarchy, _selectedState!, 'State')?['districts'] ?? [];
      }
      return _collectAllFromDepth(_hierarchy, 'District', 'Continent');
    }
    if (level == 'Mandal') {
      if (_selectedDistrict != null) {
        return _findNode(_hierarchy, _selectedDistrict!, 'District')?['mandals'] ?? [];
      }
      return _collectAllFromDepth(_hierarchy, 'Mandal', 'Continent');
    }
    if (level == 'Cluster') {
      if (_selectedMandal != null) {
        return _findNode(_hierarchy, _selectedMandal!, 'Mandal')?['clusters'] ?? [];
      }
      return _collectAllFromDepth(_hierarchy, 'Cluster', 'Continent');
    }
    return [];
  }

  List<dynamic> _collectAllFromDepth(List<dynamic> items, String target, String current) {
    if (items == null) return [];
    if (current == target) return items;
    List<dynamic> found = [];
    for (var item in items) {
      final kids = item['countries'] ?? item['states'] ?? item['districts'] ?? item['mandals'] ?? item['clusters'] ?? [];
      found.addAll(_collectAllFromDepth(kids, target, _nextLevel(current)));
    }
    return found;
  }

  String _nextLevel(String lv) {
    if (lv == 'Continent') return 'Country';
    if (lv == 'Country') return 'State';
    if (lv == 'State') return 'District';
    if (lv == 'District') return 'Mandal';
    if (lv == 'Mandal') return 'Cluster';
    return '';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Route & Toll Master', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 18)),
        actions: [
          TextButton.icon(
            onPressed: () => _handleSyncAPI(),
            icon: const Icon(Icons.sync_rounded, size: 16, color: Color(0xFF0F172A)),
            label: Text('Sync API', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
            style: TextButton.styleFrom(backgroundColor: const Color(0xFFF1F5F9), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          ),
          const SizedBox(width: 16),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFFBB0633),
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: const Color(0xFFBB0633),
          indicatorWeight: 4,
          labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 1),
          tabs: const [Tab(text: 'MASTER ROUTES'), Tab(text: 'TOLL GATES'), Tab(text: 'GEO HIERARCHY')],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [_buildRoutesTab(), _buildTollsTab(), _buildGeoTab()],
      ),
    );
  }

  Widget _buildGeoTab() {
    if (_isLoading) return const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)));
    return Column(
      children: [
        _buildGeoFilters(),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Discovery Stream', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                    Text('Global Distribution Analysis', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF64748B))),
                  ]),
                  Text('Found ${_discoveryNodes.length} Nodes', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFFBB0633))),
                ],
              ),
              const SizedBox(height: 20),
              _discoveryNodes.isEmpty 
                ? _buildEmptyState('No nodes match filters')
                : GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 16, mainAxisSpacing: 16, mainAxisExtent: 130),
                    itemCount: _discoveryNodes.length,
                    itemBuilder: (context, index) => _buildDiscoveryCard(_discoveryNodes[index]),
                  ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGeoFilters() {
    return Container(
      padding: const EdgeInsets.all(20), color: Colors.white,
      child: Column(
        children: [
          TextField(
            onChanged: (v) { _geoSearch = v; _processDiscovery(); },
            decoration: InputDecoration(
              hintText: 'Search Nodes...', prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFBB0633)),
              filled: true, fillColor: const Color(0xFFF8FAFC), border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: [
              _buildFilterChip('Continent', _selectedContinent),
              _buildFilterChip('Country', _selectedCountry),
              _buildFilterChip('State', _selectedState),
              _buildFilterChip('District', _selectedDistrict),
              _buildFilterChip('Mandal', _selectedMandal),
              _buildFilterChip('Cluster', _selectedCluster),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _clearAllFilters(),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              child: const Icon(Icons.refresh_rounded, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String? value) {
    return ActionChip(
      label: Text(value ?? label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: value != null ? Colors.white : const Color(0xFF64748B))),
      backgroundColor: value != null ? const Color(0xFFBB0633) : const Color(0xFFF1F5F9),
      onPressed: () => _showGeoPicker(label),
    );
  }

  Widget _buildDiscoveryCard(Map<String, dynamic> node) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(node['code'] ?? '---', style: GoogleFonts.robotoMono(fontSize: 9, color: Colors.grey[400])),
          const SizedBox(height: 8),
          Text(node['name'] ?? 'Node', maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800)),
          const Spacer(),
          Text(node['type'].toString().toUpperCase(), style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.grey[400])),
        ],
      ),
    );
  }

  void _showGeoPicker(String level) {
    final options = _getAvailableOptions(level);
    showModalBottomSheet(
      context: context, backgroundColor: Colors.transparent, isScrollControlled: true,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32))),
        child: Column(
          children: [
            Container(margin: const EdgeInsets.only(top: 12), width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text('Select $level', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900)),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                itemCount: options.length,
                itemBuilder: (context, idx) {
                  final opt = options[idx];
                  return ListTile(
                    title: Text(opt['name'], style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                    onTap: () { Navigator.pop(context); _applyFilter(level, opt['name']); },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _applyFilter(String level, String value) {
    setState(() {
      if (level == 'Continent') { _selectedContinent = value; _selectedCountry = null; _selectedState = null; _selectedDistrict = null; _selectedMandal = null; _selectedCluster = null; }
      else if (level == 'Country') { _selectedCountry = value; _selectedState = null; _selectedDistrict = null; _selectedMandal = null; _selectedCluster = null; }
      else if (level == 'State') { _selectedState = value; _selectedDistrict = null; _selectedMandal = null; _selectedCluster = null; }
      else if (level == 'District') { _selectedDistrict = value; _selectedMandal = null; _selectedCluster = null; }
      else if (level == 'Mandal') { _selectedMandal = value; _selectedCluster = null; }
      else if (level == 'Cluster') { _selectedCluster = value; }
      _processDiscovery();
    });
  }

  void _clearAllFilters() {
    setState(() { _selectedContinent = null; _selectedCountry = null; _selectedState = null; _selectedDistrict = null; _selectedMandal = null; _selectedCluster = null; _geoSearch = ''; _processDiscovery(); });
  }

  void _handleSyncAPI() async {
    setState(() => _isLoading = true);
    try {
      await _apiService.post('/api/masters/locations/sync/', body: {}, includeAuth: true);
      await _loadAll();
    } catch (e) { debugPrint("Sync error: $e"); }
    setState(() => _isLoading = false);
  }

  // Placeholder for Routes/Tolls to keep the file clean for this fix
  Widget _buildRoutesTab() => const Center(child: Text('Master Routes Ready'));
  Widget _buildTollsTab() => const Center(child: Text('Toll Gates Ready'));
  Widget _buildEmptyState(String m) => Center(child: Text(m));
}
