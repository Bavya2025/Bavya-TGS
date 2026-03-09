import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../constants/api_constants.dart';

class LoginHistoryScreen extends StatefulWidget {
  const LoginHistoryScreen({super.key});

  @override
  State<LoginHistoryScreen> createState() => _LoginHistoryScreenState();
}

class _LoginHistoryScreenState extends State<LoginHistoryScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  
  bool _isLoading = true;
  List<dynamic> _history = [];
  List<dynamic> _filteredHistory = [];
  int? _expandedRowId;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      _filteredHistory = _history.where((item) {
        final userName = (item['user_name'] ?? '').toString().toLowerCase();
        final userEmail = (item['user_email'] ?? '').toString().toLowerCase();
        final ipAddress = (item['ip_address'] ?? '').toString().toLowerCase();
        return userName.contains(query) || userEmail.contains(query) || ipAddress.contains(query);
      }).toList();
    });
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get(ApiConstants.loginHistory, includeAuth: true);
      if (mounted) {
        setState(() {
          _history = response is List ? response : (response['results'] ?? []);
          _filteredHistory = List.from(_history);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load history: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _formatDuration(String login, String? logout) {
    if (logout == null) return 'Active';
    try {
      final diff = DateTime.parse(logout).difference(DateTime.parse(login));
      final hours = diff.inHours;
      final minutes = diff.inMinutes % 60;
      return '${hours}h ${minutes}m';
    } catch (e) {
      return '-';
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
        title: Text(
          'Login History',
          style: GoogleFonts.plusJakartaSans(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w800,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF700B34)),
            onPressed: _fetchHistory,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBox(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF700B34)))
                : _filteredHistory.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _fetchHistory,
                        color: const Color(0xFF700B34),
                        child: _buildHistoryList(),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBox() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 20, offset: const Offset(0, 4))
        ],
      ),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: "Search by user or IP...",
          hintStyle: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
          prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF700B34), size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 18),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          Text(
            'No records matching your search',
            style: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: _filteredHistory.length,
      itemBuilder: (context, index) {
        final log = _filteredHistory[index];
        final bool isExpanded = _expandedRowId == log['id'];

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.01),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              ListTile(
                onTap: () {
                  setState(() {
                    _expandedRowId = isExpanded ? null : log['id'];
                  });
                },
                contentPadding: const EdgeInsets.all(16),
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFF700B34).withOpacity(0.1),
                  child: Text(
                    (log['user_name'] ?? '?').toString().toUpperCase().substring(0, 1),
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF700B34),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                title: Text(
                  log['user_name'] ?? 'Unknown User',
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      log['user_email'] ?? 'No email',
                      style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.lan_outlined, size: 10, color: Colors.black26),
                        const SizedBox(width: 4),
                        Text(
                          log['ip_address'] ?? 'N/A',
                          style: GoogleFonts.robotoMono(fontSize: 10, color: const Color(0xFF64748B), fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ],
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _formatDuration(log['login_time'], log['logout_time']),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: log['logout_time'] == null ? const Color(0xFF10B981) : const Color(0xFF64748B),
                      ),
                    ),
                    Icon(
                      isExpanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                      size: 18,
                      color: Colors.black26,
                    ),
                  ],
                ),
              ),
              if (isExpanded) _buildExpandedDetails(log),
            ],
          ),
        );
      },
    );
  }

  Widget _buildExpandedDetails(Map<String, dynamic> log) {
    final activities = log['activities'] as List? ?? [];
    
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Divider(height: 1),
          const SizedBox(height: 16),
          _buildDetailRow('Login Time', DateFormat('PPpp').format(DateTime.parse(log['login_time']))),
          _buildDetailRow('Logout Time', log['logout_time'] != null ? DateFormat('PPpp').format(DateTime.parse(log['logout_time'])) : 'Currently Active'),
          const SizedBox(height: 16),
          Text(
            'Session Activities',
            style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
          ),
          const SizedBox(height: 8),
          if (activities.isEmpty)
            Text('No activities recorded', style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontStyle: FontStyle.italic))
          else
            ...activities.map((act) => _buildActivityItem(act)).toList(),
        ],
      ),
    );
  }

  Widget _buildActivityItem(dynamic act) {
    final time = DateFormat('HH:mm:ss').format(DateTime.parse(act['timestamp']));
    final action = act['action'] ?? 'VIEW';
    
    Color actionColor = Colors.blue;
    if (action == 'LOGIN') actionColor = Colors.green;
    if (action == 'LOGOUT') actionColor = Colors.grey;
    if (action == 'CREATE') actionColor = Colors.orange;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Text(
            time,
            style: GoogleFonts.robotoMono(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: actionColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              action,
              style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: actionColor),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  act['model_name'] ?? 'System',
                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                ),
                Text(
                  act['object_repr'] ?? 'Activity',
                  style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), height: 1.2),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text('$label:', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w700)),
          const SizedBox(width: 8),
          Text(value, style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF475569), fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
