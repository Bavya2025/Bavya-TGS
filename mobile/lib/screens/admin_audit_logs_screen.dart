import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/trip_service.dart';

class AdminAuditLogsScreen extends StatefulWidget {
  const AdminAuditLogsScreen({super.key});

  @override
  State<AdminAuditLogsScreen> createState() => _AdminAuditLogsScreenState();
}

class _AdminAuditLogsScreenState extends State<AdminAuditLogsScreen> {
  final TripService _tripService = TripService();
  final TextEditingController _searchController = TextEditingController();
  
  bool _isLoading = true;
  List<Map<String, dynamic>> _logs = [];
  String _selectedAction = '';

  final List<String> _actions = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    setState(() => _isLoading = true);
    try {
      final logs = await _tripService.fetchAuditLogs(
        search: _searchController.text,
        action: _selectedAction,
      );
      setState(() {
        _logs = logs;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load logs: $e'), backgroundColor: Colors.red),
        );
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
        title: Text('Audit Logs', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFFBE123C)),
            onPressed: _fetchLogs,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFBE123C)))
                : _buildLogsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: Column(
        children: [
          TextField(
            controller: _searchController,
            onSubmitted: (v) => _fetchLogs(),
            decoration: InputDecoration(
              hintText: 'Search logs...',
              hintStyle: GoogleFonts.inter(color: Colors.black12, fontSize: 13),
              prefixIcon: const Icon(Icons.search_rounded, color: Colors.black26),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _actions.map((action) {
                bool isSelected = _selectedAction == action;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(action == '' ? 'ALL' : action, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: isSelected ? Colors.white : Colors.black45)),
                    selected: isSelected,
                    selectedColor: const Color(0xFF0F172A),
                    backgroundColor: const Color(0xFFF1F5F9),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _selectedAction = action);
                        _fetchLogs();
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogsList() {
    if (_logs.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment_rounded, size: 64, color: Colors.grey.shade100),
            const SizedBox(height: 16),
            Text('No audit logs found', style: GoogleFonts.inter(color: Colors.black12, fontWeight: FontWeight.w800)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _logs.length,
      itemBuilder: (context, index) => _buildLogItem(_logs[index]),
    );
  }

  Widget _buildLogItem(Map<String, dynamic> log) {
    final timestamp = DateTime.parse(log['timestamp'] ?? DateTime.now().toIso8601String());
    final action = log['action'] ?? 'UNKNOWN';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: ListTile(
        onTap: () => _showLogDetails(log),
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: _getActionColor(action).withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(_getActionIcon(action), color: _getActionColor(action), size: 20),
        ),
        title: Row(
          children: [
            Expanded(child: Text(log['user_name'] ?? 'System', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)))),
            Text(DateFormat('MMM dd, HH:mm').format(timestamp), style: GoogleFonts.inter(fontSize: 10, color: Colors.black26, fontWeight: FontWeight.w600)),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: _getActionColor(action).withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                  child: Text(action, style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w900, color: _getActionColor(action))),
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(log['model_name'] ?? '', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black38), maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
            const SizedBox(height: 4),
            Text(log['object_repr'] ?? '', style: GoogleFonts.inter(fontSize: 11, color: Colors.black26), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
        trailing: const Icon(Icons.chevron_right_rounded, color: Colors.black12),
      ),
    );
  }

  void _showLogDetails(Map<String, dynamic> log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Audit Log Details', style: GoogleFonts.interTight(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
              child: Row(
                children: [
                  _buildDetailTile('ACTION', log['action']),
                  const Spacer(),
                  _buildDetailTile('ENTITY', log['model_name']),
                  const Spacer(),
                  _buildDetailTile('USER', log['user_name'] ?? 'System'),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text('DATA CHANGES', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBE123C), letterSpacing: 0.5)),
            const SizedBox(height: 12),
            Expanded(
              child: _buildDiffView(log['details']),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailTile(String label, String? value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.black26, letterSpacing: 0.5)),
        const SizedBox(height: 2),
        Text(value ?? 'N/A', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
      ],
    );
  }

  Widget _buildDiffView(dynamic details) {
    if (details == null || (details is Map && details.isEmpty)) {
      return Center(child: Text('No meaningful changes recorded.', style: GoogleFonts.inter(color: Colors.black26, fontStyle: FontStyle.italic, fontSize: 13)));
    }

    if (details is! Map) {
      return SingleChildScrollView(child: Text(details.toString(), style: GoogleFonts.robotoMono(fontSize: 12)));
    }

    return ListView.builder(
      itemCount: details.length,
      itemBuilder: (context, index) {
        String field = details.keys.elementAt(index);
        dynamic change = details[field];
        
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFF1F5F9))),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(field.toUpperCase(), style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), letterSpacing: 0.5)),
              const SizedBox(height: 12),
              if (change is Map && (change.containsKey('old') || change.containsKey('new'))) 
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildValueBox('OLD', change['old'])),
                    const Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Icon(Icons.arrow_forward_rounded, size: 14, color: Colors.black12)),
                    Expanded(child: _buildValueBox('NEW', change['new'])),
                  ],
                )
              else
                Text(change.toString(), style: GoogleFonts.inter(fontSize: 12, color: Colors.black54)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildValueBox(String label, dynamic value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.black26)),
        const SizedBox(height: 4),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFF1F5F9))),
          child: Text(
            value == null ? 'null' : value.toString(),
            style: GoogleFonts.robotoMono(fontSize: 11, color: value == null ? Colors.black26 : const Color(0xFF0F172A)),
          ),
        ),
      ],
    );
  }

  Color _getActionColor(String action) {
    switch (action) {
      case 'CREATE': return Colors.green;
      case 'UPDATE': return Colors.orange;
      case 'DELETE': return Colors.red;
      case 'LOGIN': return Colors.blue;
      case 'LOGOUT': return Colors.grey;
      default: return Colors.blueGrey;
    }
  }

  IconData _getActionIcon(String action) {
    switch (action) {
      case 'CREATE': return Icons.add_circle_outline_rounded;
      case 'UPDATE': return Icons.edit_note_rounded;
      case 'DELETE': return Icons.delete_outline_rounded;
      case 'LOGIN': return Icons.login_rounded;
      case 'LOGOUT': return Icons.logout_rounded;
      default: return Icons.info_outline_rounded;
    }
  }
}
