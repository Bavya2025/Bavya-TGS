import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

class ApiManagementScreen extends StatefulWidget {
  const ApiManagementScreen({super.key});

  @override
  State<ApiManagementScreen> createState() => _ApiManagementScreenState();
}

class _ApiManagementScreenState extends State<ApiManagementScreen> with SingleTickerProviderStateMixin {
  final TripService _tripService = TripService();
  final ApiService _apiService = ApiService();
  late TabController _tabController;
  
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _logs = [];
  List<Map<String, dynamic>> _accessKeys = [];
  List<Map<String, dynamic>> _dynamicEndpoints = [];
  
  final TextEditingController _masterApiKeyController = TextEditingController();
  bool _isSavingMasterKey = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_handleTabChange);
    _fetchAllData();
  }

  void _handleTabChange() {
    if (_tabController.indexIsChanging) {
      _fetchAllData();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _masterApiKeyController.dispose();
    super.dispose();
  }

  Future<void> _fetchAllData() async {
    setState(() => _isLoading = true);
    try {
      final statsData = await _tripService.fetchApiDashboardStats();
      final keys = await _tripService.fetchAccessKeys();
      final endpoints = await _tripService.fetchDynamicEndpoints();
      
      setState(() {
        _stats = statsData['stats'] ?? {};
        _logs = List<Map<String, dynamic>>.from(statsData['logs'] ?? []);
        _accessKeys = keys;
        _dynamicEndpoints = endpoints;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load data: $e')));
      }
    }
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
        title: Text('API Management', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF7C1D1D)),
            onPressed: _fetchAllData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: const Color(0xFF7C1D1D),
          unselectedLabelColor: Colors.black26,
          indicatorColor: const Color(0xFF7C1D1D),
          indicatorWeight: 3,
          labelStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800),
          tabs: const [
            Tab(text: 'Dashboard'),
            Tab(text: 'External Integration'),
            Tab(text: 'Access Keys'),
            Tab(text: 'Custom Endpoints'),
          ],
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C1D1D)))
        : TabBarView(
            controller: _tabController,
            children: [
              _buildDashboardTab(),
              _buildExternalIntegrationTab(),
              _buildAccessKeysTab(),
              _buildCustomEndpointsTab(),
            ],
          ),
    );
  }

  Widget _buildDashboardTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildStatsGrid(),
          const SizedBox(height: 32),
          Text('RECENT API LOGS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBE123C), letterSpacing: 0.5)),
          const SizedBox(height: 16),
          _buildLogsTable(),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.2,
      children: [
        _buildStatCard('Total Calls (24h)', _stats['externalCalls']?.toString() ?? '0', Icons.insights_rounded, Colors.blue),
        _buildStatCard('Active Keys', _stats['activeKeys']?.toString() ?? '0', Icons.key_rounded, Colors.purple),
        _buildStatCard('Failed Requests', _stats['failedRequests']?.toString() ?? '0', Icons.warning_amber_rounded, Colors.red),
        _buildStatCard('Avg Latency', _stats['avgLatency']?.toString() ?? '0ms', Icons.speed_rounded, Colors.green),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 12),
          Text(value, style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
          const SizedBox(height: 4),
          Text(label, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  Widget _buildLogsTable() {
    if (_logs.isEmpty) {
      return Center(child: Text('No recent logs found', style: GoogleFonts.inter(color: Colors.black26)));
    }
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _logs.length,
        separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
        itemBuilder: (context, index) {
          final log = _logs[index];
          final timestamp = DateTime.parse(log['timestamp'] ?? DateTime.now().toIso8601String());
          final statusCode = log['status_code'] ?? 200;
          
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(log['endpoint'] ?? '/', style: GoogleFonts.robotoMono(fontSize: 10, color: Colors.blue[700], fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(DateFormat('HH:mm:ss, MMM d').format(timestamp), style: GoogleFonts.inter(fontSize: 10, color: Colors.black26, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (statusCode >= 200 && statusCode < 300) ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    statusCode.toString(),
                    style: GoogleFonts.robotoMono(fontSize: 10, fontWeight: FontWeight.w900, color: (statusCode >= 200 && statusCode < 300) ? Colors.green : Colors.red),
                  ),
                ),
                const SizedBox(width: 12),
                Text('${log['latency_ms'] ?? 0}ms', style: GoogleFonts.inter(fontSize: 10, color: Colors.black26, fontWeight: FontWeight.w700)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildExternalIntegrationTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 20, offset: const Offset(0, 8))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.key_rounded, color: Color(0xFF7C1D1D)),
                    const SizedBox(width: 12),
                    Text('Employee List Configuration', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Enter the API key provided for your enterprise employee database. This key is required to synchronize reporting structures and project allocations.',
                  style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B), height: 1.5, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 32),
                Text('MASTER API KEY', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26, letterSpacing: 1)),
                const SizedBox(height: 8),
                TextField(
                  controller: _masterApiKeyController,
                  obscureText: true,
                  decoration: InputDecoration(
                    hintText: 'sk_live_...',
                    hintStyle: GoogleFonts.inter(color: Colors.black12),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.all(18),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isSavingMasterKey ? null : _saveMasterKey,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C1D1D),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isSavingMasterKey 
                      ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                      : Text('UPDATE CONFIGURATION', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1)),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    const Icon(Icons.shield_rounded, size: 14, color: Colors.black26),
                    const SizedBox(width: 8),
                    Text('This key is securely stored in the server vault.', style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _saveMasterKey() async {
    if (_masterApiKeyController.text.isEmpty) return;
    
    setState(() => _isSavingMasterKey = true);
    try {
      await _tripService.updateMasterApiKey(_masterApiKeyController.text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Configuration saved successfully'), backgroundColor: Colors.green));
        _masterApiKeyController.clear();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save: $e'), backgroundColor: Colors.red));
      }
    } finally {
      setState(() => _isSavingMasterKey = false);
    }
  }

  Widget _buildAccessKeysTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('ACTIVE ACCESS KEYS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBE123C), letterSpacing: 0.5)),
              ElevatedButton.icon(
                onPressed: _showGenerateKeyModal,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text('GENERATE NEW', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _accessKeys.isEmpty
            ? _buildEmptyArea(Icons.key_rounded, 'No access keys found')
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _accessKeys.length,
                itemBuilder: (context, index) => _buildKeyCard(_accessKeys[index]),
              ),
        ),
      ],
    );
  }

  Widget _buildKeyCard(Map<String, dynamic> keyItem) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(keyItem['name'] ?? 'Untitled API Key', style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
              _statusBadge(keyItem['is_active'] == true),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8)),
                  child: Text(keyItem['key'] ?? '...', style: GoogleFonts.robotoMono(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.copy_rounded, size: 18, color: Colors.black26),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: keyItem['key'] ?? ''));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Key copied to clipboard')));
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${keyItem['rate_limit'] ?? 60} req/min', style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontWeight: FontWeight.w700)),
              TextButton(
                onPressed: () => _revokeKey(keyItem['id']),
                child: Text('REVOKE', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.red)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _revokeKey(int id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Revoke Key?'),
        content: const Text('External applications using this key will lose access immediately.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('CANCEL')),
          TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('REVOKE', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    
    if (confirmed == true) {
      try {
        await _tripService.revokeAccessKey(id);
        _fetchAllData();
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to revoke: $e')));
      }
    }
  }

  Widget _buildCustomEndpointsTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('CUSTOM DATA ENDPOINTS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBE123C), letterSpacing: 0.5)),
              ElevatedButton.icon(
                onPressed: _showCreateEndpointModal,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: Text('CREATE NEW', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w900)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _dynamicEndpoints.isEmpty
            ? _buildEmptyArea(Icons.arrow_upward_rounded, 'No custom endpoints created')
            : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _dynamicEndpoints.length,
                itemBuilder: (context, index) => _buildEndpointCard(_dynamicEndpoints[index]),
              ),
        ),
      ],
    );
  }

  Widget _buildEndpointCard(Map<String, dynamic> ep) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(ep['name'] ?? 'Untitled Endpoint', style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFF7C1D1D).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                child: Text(ep['url_path'] ?? '', style: GoogleFonts.robotoMono(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D))),
              ),
              const Spacer(),
              Text(ep['response_type'] ?? 'NONE', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.green)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Inbound data is ingested and processed automatically.',
            style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: isActive ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(isActive ? 'ACTIVE' : 'INACTIVE', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: isActive ? Colors.green : Colors.red)),
    );
  }

  Widget _buildEmptyArea(IconData icon, String label) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 64, color: Colors.grey.shade100),
          const SizedBox(height: 16),
          Text(label, style: GoogleFonts.inter(color: Colors.black12, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }

  void _showGenerateKeyModal() {
    final nameController = TextEditingController();
    final rateLimitController = TextEditingController(text: '60');
    String? selectedEndpoint;
    
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
              Text('Generate Access Key', style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
              const SizedBox(height: 24),
              _buildModalInput('Application Name', 'e.g. Finance Hub', nameController),
              const SizedBox(height: 20),
              _buildModalInput('Rate Limit (req/min)', '60', rateLimitController, isNumeric: true),
              const SizedBox(height: 20),
              Text('AUTO-SELECT ENDPOINT', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26, letterSpacing: 1)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(16)),
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: selectedEndpoint,
                  hint: Text('Select an endpoint', style: GoogleFonts.inter(color: Colors.black12, fontSize: 13)),
                  underline: const SizedBox(),
                  items: _dynamicEndpoints.map((ep) => DropdownMenuItem<String>(value: ep['url_path']?.toString(), child: Text(ep['name'] ?? ep['url_path'].toString(), style: GoogleFonts.inter(fontSize: 14)))).toList(),
                  onChanged: (v) => setModalState(() => selectedEndpoint = v),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (nameController.text.isEmpty) return;
                    
                    final permissions = {};
                    if (selectedEndpoint != null) {
                      permissions['/api/connect/$selectedEndpoint/*'] = ['GET', 'POST'];
                    } else {
                      permissions['*'] = ['GET'];
                    }

                    try {
                      final result = await _tripService.generateAccessKey({
                        'name': nameController.text,
                        'rate_limit': int.tryParse(rateLimitController.text) ?? 60,
                        'permissions': permissions,
                      });
                      if (mounted) {
                        Navigator.pop(context);
                        _showKeyResultModal(result['key']);
                        _fetchAllData();
                      }
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                  child: Text('GENERATE KEY', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showKeyResultModal(String? key) {
    showDialog(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Key Generated!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Please copy this key now. It will not be shown again.'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.yellow[50], borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.yellow[200]!)),
              child: SelectableText(key ?? '', style: GoogleFonts.robotoMono(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.brown)),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('DONE')),
        ],
      ),
    );
  }

  void _showCreateEndpointModal() {
    final nameController = TextEditingController();
    final pathController = TextEditingController();
    
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
            Text('Create Custom Endpoint', style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
            const SizedBox(height: 24),
            _buildModalInput('Endpoint Name', 'e.g. Sales Ingestion', nameController),
            const SizedBox(height: 20),
            _buildModalInput('URL Path', 'e.g. sales-data', pathController),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  if (nameController.text.isEmpty || pathController.text.isEmpty) return;
                  try {
                    await _tripService.createDynamicEndpoint({
                      'name': nameController.text,
                      'url_path': pathController.text,
                      'response_type': 'NONE',
                    });
                    if (mounted) {
                      Navigator.pop(context);
                      _fetchAllData();
                    }
                  } catch (e) {
                    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                  }
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F172A), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                child: Text('CREATE ENDPOINT', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModalInput(String label, String hint, TextEditingController controller, {bool isNumeric = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black26, letterSpacing: 1)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: isNumeric ? TextInputType.number : TextInputType.text,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(color: Colors.black12, fontSize: 13),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.all(18),
          ),
        ),
      ],
    );
  }
}
