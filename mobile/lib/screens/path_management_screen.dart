import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

class PathManagementScreen extends StatefulWidget {
  final Map<String, dynamic> route;
  const PathManagementScreen({super.key, required this.route});

  @override
  State<PathManagementScreen> createState() => _PathManagementScreenState();
}

class _PathManagementScreenState extends State<PathManagementScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _paths = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    await _fetchPaths();
    setState(() => _isLoading = false);
  }

  Future<void> _fetchPaths() async {
    try {
      final res = await _apiService.get('/api/masters/routes/${widget.route['id']}/');
      _paths = res['paths'] ?? [];
    } catch (e) { debugPrint("Paths error: $e"); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          children: [
            Text(widget.route['name'] ?? 'Route Paths', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900, fontSize: 16)),
            Text('SEQUENCE REGISTRY', style: GoogleFonts.inter(color: Colors.blue, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1.5)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => _showPathForm(),
            icon: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFFBB0633)),
          ),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
        : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: _paths.length,
            itemBuilder: (context, index) => _buildPathCard(_paths[index], index),
          ),
    );
  }

  Widget _buildPathCard(Map<String, dynamic> path, int index) {
    final List via = path['via_locations_data'] ?? [];
    final List pathTolls = path['path_tolls'] ?? [];

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(36),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(color: const Color(0xFFBB0633), borderRadius: BorderRadius.circular(14)),
                alignment: Alignment.center,
                child: Text(String.fromCharCode(65 + index), style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(path['path_name'] ?? 'Path Variant', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 16)),
                    Text('${path['distance_km']} KM • ${via.length} STOPS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF64748B), letterSpacing: 1)),
                  ],
                ),
              ),
              _buildSmallIconButton(Icons.edit_rounded, Colors.blue, () => _showPathForm(item: path)),
              const SizedBox(width: 8),
              _buildSmallIconButton(Icons.delete_rounded, Colors.red, () => _deletePath(path['id'])),
            ],
          ),
          const SizedBox(height: 24),
          _buildPathVisual(path),
          const SizedBox(height: 24),
          _buildTollRegistryBadge(pathTolls),
        ],
      ),
    );
  }

  Widget _buildPathVisual(Map<String, dynamic> path) {
    final List via = path['via_locations_data'] ?? [];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Column(
        children: [
          _buildStop(widget.route['source_name'], 'ORIGIN', isStart: true),
          ...via.map((v) => _buildStop(v['name'], 'HUB', isVia: true)),
          _buildStop(widget.route['destination_name'], 'TARGET', isEnd: true),
        ],
      ),
    );
  }

  Widget _buildStop(String name, String type, {bool isStart = false, bool isVia = false, bool isEnd = false}) {
    return Row(
      children: [
        Column(
          children: [
            if (!isStart) Container(width: 2, height: 20, color: const Color(0xFFE2E8F0)),
            Container(
              width: 12, height: 12,
              decoration: BoxDecoration(
                color: isStart ? Colors.green : (isEnd ? Colors.indigo : Colors.blue),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)],
              ),
            ),
            if (!isEnd) Container(width: 2, height: 20, color: const Color(0xFFE2E8F0)),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 13, color: const Color(0xFF0F172A))),
              Text(type, style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 8, color: const Color(0xFF94A3B8), letterSpacing: 1)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTollRegistryBadge(List tolls) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: Colors.indigo[50], borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Icon(Icons.toll_rounded, size: 16, color: Colors.indigo[600]),
          const SizedBox(width: 10),
          Text('${tolls.length} REGISTERED TOLLS', style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 10, color: Colors.indigo[700], letterSpacing: 0.5)),
          const Spacer(),
          const Icon(Icons.arrow_right_alt_rounded, size: 16, color: Color(0xFF64748B)),
        ],
      ),
    );
  }

  Widget _buildSmallIconButton(IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle), child: Icon(icon, size: 16, color: color)),
    );
  }

  void _showPathForm({Map<String, dynamic>? item}) {
    // Implement Path Creation/Editing Modal
  }

  Future<void> _deletePath(int id) async {
    // Delete Path Logic
  }
}
