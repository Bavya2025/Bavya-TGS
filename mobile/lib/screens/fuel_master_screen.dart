import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

class FuelMasterScreen extends StatefulWidget {
  const FuelMasterScreen({super.key});

  @override
  State<FuelMasterScreen> createState() => _FuelMasterScreenState();
}

class _FuelMasterScreenState extends State<FuelMasterScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  
  List<dynamic> _rates = [];
  List<dynamic> _states = [];
  bool _isLoading = true;
  String _searchQuery = '';

  // Fallback list of Indian states (matches web)
  final List<String> _indiaStatesFallback = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  @override
  void initState() {
    super.initState();
    _fetchData();
    _fetchStates();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.get('/api/masters/fuel-rate-masters/');
      setState(() {
        _rates = res is List ? res : (res['results'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to fetch fuel rates: $e')),
        );
      }
    }
  }

  Future<void> _fetchStates() async {
    try {
      final res = await _apiService.get('/api/masters/locations/?type=State');
      final data = res is List ? res : (res['results'] ?? []);
      setState(() {
        if (data.isNotEmpty) {
          _states = data;
        } else {
          _states = _indiaStatesFallback.map((s) => {'name': s}).toList();
        }
      });
    } catch (e) {
      setState(() {
        _states = _indiaStatesFallback.map((s) => {'name': s}).toList();
      });
    }
  }

  // Helper to compute taken vehicles for a state (matches web's takenVehicles useMemo)
  Set<String> _getTakenVehicles(String stateName, {int? editingId}) {
    return _rates
        .where((r) => 
            r['state']?.toString().toLowerCase() == stateName.toLowerCase() &&
            r['id'] != editingId)
        .map((r) => r['vehicle_type']?.toString() ?? '')
        .toSet();
  }

  void _showForm({Map<String, dynamic>? item}) {
    final bool isEditing = item != null;
    final TextEditingController rateController = TextEditingController(
      text: isEditing ? item['rate_per_km'].toString() : '',
    );
    String? selectedState = isEditing ? item['state'] : null;
    String selectedVehicle = isEditing ? item['vehicle_type'] : '4 Wheeler';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final Set<String> takenVehicles = selectedState != null 
              ? _getTakenVehicles(selectedState!, editingId: item?['id']) 
              : {};

          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(32),
                topRight: Radius.circular(32),
              ),
            ),
            child: SingleChildScrollView(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 32,
                top: 8,
                left: 24,
                right: 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 48,
                      height: 5,
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFDF2F2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.local_gas_station_rounded, color: Color(0xFFBB0633), size: 24),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isEditing ? 'Edit Fuel Rate' : 'Initialize Rate',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'Define per-km pricing policy',
                            style: GoogleFonts.inter(fontSize: 12, color: Colors.grey[500], fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  // Target State
                  _buildLabel('TARGET STATE', Icons.location_on_rounded),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: selectedState,
                        hint: Text('Select State', style: GoogleFonts.inter(fontSize: 14, color: Colors.grey[400])),
                        items: _states.map((s) {
                          final name = s['name'] ?? '';
                          return DropdownMenuItem<String>(
                            value: name,
                            child: Text(name, style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setModalState(() {
                            selectedState = val;
                            // Auto-pick first available vehicle type like web
                            final newTaken = _getTakenVehicles(val!, editingId: item?['id']);
                            if (newTaken.contains(selectedVehicle)) {
                              selectedVehicle = selectedVehicle == '4 Wheeler' ? '2 Wheeler' : '4 Wheeler';
                            }
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  // Vehicle Class
                  _buildLabel('VEHICLE CLASS', Icons.directions_car_rounded),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildVehicleToggleCard(
                          '2 Wheeler',
                          selectedVehicle == '2 Wheeler',
                          takenVehicles.contains('2 Wheeler'),
                          () => setModalState(() => selectedVehicle = '2 Wheeler'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildVehicleToggleCard(
                          '4 Wheeler',
                          selectedVehicle == '4 Wheeler',
                          takenVehicles.contains('4 Wheeler'),
                          () => setModalState(() => selectedVehicle = '4 Wheeler'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Price
                  _buildLabel('PRICE (PER KM)', Icons.currency_rupee_rounded),
                  const SizedBox(height: 12),
                  TextField(
                    controller: rateController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                    decoration: InputDecoration(
                      hintText: '0.00',
                      prefixIcon: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text('₹', style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w900, color: const Color(0xFFBB0633))),
                      ),
                      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
                    ),
                  ),
                  const SizedBox(height: 40),
                  Row(
                    children: [
                      Expanded(
                        child: TextButton(
                          onPressed: () => Navigator.pop(context),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            backgroundColor: const Color(0xFFF1F5F9),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: Text('CANCEL', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: const Color(0xFF64748B), fontSize: 13)),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: () async {
                            if (selectedState == null || rateController.text.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all fields')));
                              return;
                            }
                            final data = {
                              'state': selectedState,
                              'vehicle_type': selectedVehicle,
                              'rate_per_km': double.parse(rateController.text),
                            };
                            try {
                              if (isEditing) {
                                await _apiService.put('/api/masters/fuel-rate-masters/${item['id']}/', body: data);
                              } else {
                                await _apiService.post('/api/masters/fuel-rate-masters/', body: data);
                              }
                              Navigator.pop(context);
                              _fetchData();
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFBB0633),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 0,
                          ),
                          child: Text(
                            isEditing ? 'SAVE UPDATES' : 'CONFIRM RATE',
                            style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLabel(String text, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFFBB0633)),
        const SizedBox(width: 8),
        Text(
          text,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF64748B),
            letterSpacing: 1,
          ),
        ),
      ],
    );
  }

  Widget _buildVehicleToggleCard(String type, bool isSelected, bool isTaken, VoidCallback onTap) {
    Color color = isTaken ? Colors.grey[200]! : isSelected ? const Color(0xFFBB0633) : const Color(0xFF94A3B8);
    Color bgColor = isTaken ? Colors.grey[50]! : isSelected ? const Color(0xFFFDF2F2) : const Color(0xFFF8FAFC);
    
    return InkWell(
      onTap: isTaken ? null : onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFBB0633) : const Color(0xFFF1F5F9),
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(
              type == '2 Wheeler' ? Icons.motorcycle_rounded : Icons.directions_car_rounded,
              color: color,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              type.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                color: color,
              ),
            ),
            if (isTaken)
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(4)),
                child: Text('ALREADY SET', style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.red[400])),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filteredRates = _rates.where((r) {
      final state = (r['state'] ?? '').toString().toLowerCase();
      final type = (r['vehicle_type'] ?? '').toString().toLowerCase();
      return state.contains(_searchQuery.toLowerCase()) || type.contains(_searchQuery.toLowerCase());
    }).toList();

    // Stats like web
    final int totalStates = _rates.map((r) => r['state']).toSet().length;
    final double avg2W = _rates.where((r) => r['vehicle_type'] == '2 Wheeler').fold(0.0, (acc, r) => acc + (double.tryParse(r['rate_per_km'].toString()) ?? 0)) / (_rates.where((r) => r['vehicle_type'] == '2 Wheeler').length.clamp(1, 999999));
    final double avg4W = _rates.where((r) => r['vehicle_type'] == '4 Wheeler').fold(0.0, (acc, r) => acc + (double.tryParse(r['rate_per_km'].toString()) ?? 0)) / (_rates.where((r) => r['vehicle_type'] == '4 Wheeler').length.clamp(1, 999999));

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'mileage Reimbursement',
          style: GoogleFonts.plusJakartaSans(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w900,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFFBB0633)),
            onPressed: () => _showForm(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
          : SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTopHeader(),
                  _buildStatsSection(totalStates, avg2W, avg4W),
                  _buildSearchBox(),
                  _buildListHeader(),
                  if (filteredRates.isEmpty)
                    _buildEmptyState()
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: filteredRates.length,
                      itemBuilder: (context, index) => _buildRateCard(filteredRates[index]),
                    ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
    );
  }

  Widget _buildTopHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFBB0633),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: const Color(0xFFBB0633).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4))],
                ),
                child: const Icon(Icons.local_gas_station_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Price Management',
                      style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                    ),
                    Text(
                      'Configure per-KM rates for dynamic trip expense calculations.',
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsSection(int states, double avg2w, double avg4w) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          _buildStatCard('States Covered', states.toString(), Icons.layers_rounded, Colors.blue),
          const SizedBox(width: 16),
          _buildStatCard('Avg 2Wheeler', '₹${avg2w.toStringAsFixed(2)}', Icons.motorcycle_rounded, Colors.purple),
          const SizedBox(width: 16),
          _buildStatCard('Avg 4Wheeler', '₹${avg4w.toStringAsFixed(2)}', Icons.directions_car_rounded, Colors.green),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 16),
          Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(label.toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8), letterSpacing: 0.5)),
        ],
      ),
    );
  }

  Widget _buildSearchBox() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (v) => setState(() => _searchQuery = v),
          decoration: InputDecoration(
            hintText: "Filter by state or vehicle type...",
            hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFBB0633), size: 20),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 18),
          ),
        ),
      ),
    );
  }

  Widget _buildListHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text('CONFIGURE RATES', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF94A3B8), letterSpacing: 1.2)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: const Color(0xFFBB0633).withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
            child: Text('${_rates.length} Rates', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBB0633))),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(60),
        child: Column(
          children: [
            Icon(Icons.trending_up_rounded, size: 64, color: Colors.grey[200]),
            const SizedBox(height: 16),
            Text('No fuel rates matching search', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: Colors.grey[400])),
          ],
        ),
      ),
    );
  }

  Widget _buildRateCard(Map<String, dynamic> item) {
    String vehicleType = item['vehicle_type'] ?? '4 Wheeler';
    bool is4W = vehicleType == '4 Wheeler';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (is4W ? Colors.indigo : Colors.purple).withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(is4W ? Icons.directions_car_rounded : Icons.motorcycle_rounded, color: is4W ? Colors.indigo : Colors.purple, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['state'] ?? 'Unknown', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (is4W ? Colors.indigo : Colors.purple).withOpacity(0.05),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: (is4W ? Colors.indigo : Colors.purple).withOpacity(0.1)),
                  ),
                  child: Text(vehicleType.toUpperCase(), style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: is4W ? Colors.indigo : Colors.purple)),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                children: [
                  Text('₹', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF94A3B8))),
                  Text(item['rate_per_km']?.toString() ?? '0.00', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.edit_rounded, size: 18, color: Colors.blue[400]),
                    onPressed: () => _showForm(item: item),
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(4),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: Icon(Icons.delete_rounded, size: 18, color: Colors.red[300]),
                    onPressed: () => _handleDelete(item['id']),
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(4),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _handleDelete(int id) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Rate?', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900)),
        content: const Text('Are you sure you want to delete this pricing policy? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('DELETE', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _apiService.delete('/api/masters/fuel-rate-masters/$id/');
        _fetchData();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Delete failed: $e')));
      }
    }
  }
}
