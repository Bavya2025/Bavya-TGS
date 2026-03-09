import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class LocationCodesScreen extends StatefulWidget {
  const LocationCodesScreen({super.key});

  @override
  State<LocationCodesScreen> createState() => _LocationCodesScreenState();
}

class _LocationCodesScreenState extends State<LocationCodesScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  
  List<dynamic> _locations = [];
  bool _isLoading = false;
  bool _isSyncing = false;
  String _searchQuery = '';

  // Drill-down data
  List<dynamic> _continents = [];
  List<dynamic> _countries = [];
  List<dynamic> _states = [];
  List<dynamic> _districts = [];
  List<dynamic> _mandals = [];
  List<dynamic> _places = [];

  // Selections (External IDs)
  String? _selectedContinent;
  String? _selectedCountry;
  String? _selectedState;
  String? _selectedDistrict;
  String? _selectedMandal;
  String? _selectedPlace;

  @override
  void initState() {
    super.initState();
    _fetchContinents();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text;
      });
      _debounceSearch();
    });
  }

  void _debounceSearch() {
    // Simple debouncing logic could be added here if needed, 
    // but for now we'll trigger on change if length > 2
    if (_searchQuery.length > 2) {
      _fetchDeepLocations();
    }
  }

  Future<void> _fetchContinents() async {
    try {
      final res = await _apiService.get('/api/masters/locations/live_query/?type=Continent');
      setState(() {
        _continents = res is List ? res : (res['results'] ?? []);
      });
    } catch (e) {
      debugPrint("Init fetch failed: $e");
    }
  }

  Future<void> _fetchChildren(String parentId, String type, Function(List<dynamic>) onData) async {
    try {
      final res = await _apiService.get('/api/masters/locations/live_query/?type=$type&parent=$parentId');
      onData(res is List ? res : (res['results'] ?? []));
    } catch (e) {
      debugPrint("Fetch children failed: $e");
    }
  }

  Future<void> _fetchDeepLocations() async {
    setState(() => _isLoading = true);
    try {
      String path = '/api/masters/locations/live_query/?';
      Map<String, String> params = {};

      if (_searchQuery.isNotEmpty) {
        params['search'] = _searchQuery;
      } else if (_selectedPlace != null) {
        params['search'] = _selectedPlace!;
      } else if (_selectedMandal != null) {
        params['search'] = _selectedMandal!;
      } else if (_selectedDistrict != null) {
        params['parent'] = _selectedDistrict!;
        params['type'] = 'Mandal';
      } else if (_selectedState != null) {
        params['parent'] = _selectedState!;
        params['type'] = 'District';
      } else if (_selectedCountry != null) {
        params['parent'] = _selectedCountry!;
        params['type'] = 'State';
      } else if (_selectedContinent != null) {
        params['parent'] = _selectedContinent!;
        params['type'] = 'Country';
      } else {
        setState(() {
          _locations = [];
          _isLoading = false;
        });
        return;
      }

      final queryString = Uri(queryParameters: params).query;
      final response = await _apiService.get(path + queryString);
      
      List<dynamic> list = response is List ? response : (response['results'] ?? []);
      
      setState(() {
        _locations = list;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint("Deep fetch failed: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSync() async {
    setState(() => _isSyncing = true);
    try {
      await _apiService.post('/api/masters/locations/sync/', body: {}, includeAuth: true);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Database synchronized successfully!")));
      _fetchDeepLocations();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Sync failed: $e")));
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Code $text copied!')));
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
        title: Text('Location Codes', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 18)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: _isSyncing 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF700B34)))
              : const Icon(Icons.sync_rounded, color: Color(0xFF700B34)),
            onPressed: _isSyncing ? null : _handleSync,
            tooltip: 'Refresh Sync',
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchAndDrillHeader(),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF700B34)))
              : _buildLocationList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndDrillHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: Column(
        children: [
          _buildSearchBar(),
          const SizedBox(height: 16),
          _buildDrillDownGrid(),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC), 
        borderRadius: BorderRadius.circular(16), 
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: "Search city, airport code, or state...",
          hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
          prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF700B34), size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 18),
        ),
      ),
    );
  }

  Widget _buildDrillDownGrid() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _buildDrillDropdown('Continent', _continents, _selectedContinent, (val) {
              setState(() {
                _selectedContinent = val;
                _selectedCountry = _selectedState = _selectedDistrict = _selectedMandal = _selectedPlace = null;
                _countries = _states = _districts = _mandals = _places = [];
              });
              if (val != null) _fetchChildren(val, 'Country', (data) => setState(() => _countries = data));
              _fetchDeepLocations();
            })),
            const SizedBox(width: 8),
            Expanded(child: _buildDrillDropdown('Country', _countries, _selectedCountry, (val) {
              setState(() {
                _selectedCountry = val;
                _selectedState = _selectedDistrict = _selectedMandal = _selectedPlace = null;
                _states = _districts = _mandals = _places = [];
              });
              if (val != null) _fetchChildren(val, 'State', (data) => setState(() => _states = data));
              _fetchDeepLocations();
            }, enabled: _selectedContinent != null)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: _buildDrillDropdown('State', _states, _selectedState, (val) {
              setState(() {
                _selectedState = val;
                _selectedDistrict = _selectedMandal = _selectedPlace = null;
                _districts = _mandals = _places = [];
              });
              if (val != null) _fetchChildren(val, 'District', (data) => setState(() => _districts = data));
              _fetchDeepLocations();
            }, enabled: _selectedCountry != null)),
            const SizedBox(width: 8),
            Expanded(child: _buildDrillDropdown('District', _districts, _selectedDistrict, (val) {
              setState(() {
                _selectedDistrict = val;
                _selectedMandal = _selectedPlace = null;
                _mandals = _places = [];
              });
              if (val != null) _fetchChildren(val, 'Mandal', (data) => setState(() => _mandals = data));
              _fetchDeepLocations();
            }, enabled: _selectedState != null)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: _buildDrillDropdown('Mandal/Place', _mandals, _selectedMandal, (val) {
              setState(() {
                _selectedMandal = val;
                _selectedPlace = null;
                _places = [];
              });
              if (val != null) {
                // Fetch all children (Village/Landmark)
                _apiService.get('/api/masters/locations/live_query/?parent=$val').then((res) {
                  setState(() => _places = res is List ? res : (res['results'] ?? []));
                });
              }
              _fetchDeepLocations();
            }, enabled: _selectedDistrict != null)),
            const SizedBox(width: 8),
            Expanded(child: _buildDrillDropdown('Landmark', _places, _selectedPlace, (val) {
              setState(() => _selectedPlace = val);
              _fetchDeepLocations();
            }, enabled: _selectedMandal != null)),
          ],
        ),
      ],
    );
  }

  Widget _buildDrillDropdown(String label, List<dynamic> items, String? value, ValueChanged<String?> onChanged, {bool enabled = true}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: enabled ? const Color(0xFFF8FAFC) : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          hint: Text(label, style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
          isExpanded: true,
          style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF0F172A), fontWeight: FontWeight.w700),
          icon: const Icon(Icons.arrow_drop_down, size: 16),
          onChanged: enabled ? onChanged : null,
          items: items.map((i) => DropdownMenuItem<String>(
            value: i['external_id'].toString(),
            child: Text(i['name'] ?? '', overflow: TextOverflow.ellipsis),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildLocationList() {
    if (_locations.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.map_outlined, size: 64, color: const Color(0xFFE2E8F0)),
            const SizedBox(height: 16),
            Text('No results. Try searching or drill-down.', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF94A3B8), fontWeight: FontWeight.w700)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _locations.length,
      itemBuilder: (context, index) {
        final loc = _locations[index];
        final type = (loc['location_type'] ?? 'Site').toString();
        final code = (loc['code'] ?? 'N/A').toString();

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFF700B34).withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.location_on_rounded, color: Color(0xFF700B34), size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(loc['name'] ?? 'Unnamed', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            _buildTypeTag(type),
                            const SizedBox(width: 8),
                            Text('ID: ${loc['external_id']}', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 24, color: Color(0xFFF1F5F9)),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                   Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('System Code', style: GoogleFonts.inter(fontSize: 9, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w700)),
                      Text(code, style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF700B34), fontWeight: FontWeight.w900)),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _copyToClipboard(code),
                    icon: const Icon(Icons.copy_rounded, size: 14),
                    label: const Text('Copy'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTypeTag(String type) {
    Color color = const Color(0xFF64748B);
    if (type.toLowerCase().contains('continent')) color = Colors.indigo;
    if (type.toLowerCase().contains('country')) color = Colors.blue;
    if (type.toLowerCase().contains('state')) color = Colors.orange;
    if (type.toLowerCase().contains('district')) color = Colors.purple;
    if (type.toLowerCase().contains('mandal')) color = Colors.teal;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(type.toUpperCase(), style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w900, color: color)),
    );
  }
}
