import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';

class UserManagementScreen extends StatefulWidget {
  const UserManagementScreen({super.key});

  @override
  State<UserManagementScreen> createState() => _UserManagementScreenState();
}

class _UserManagementScreenState extends State<UserManagementScreen> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _employees = [];
  List<Map<String, dynamic>> _filteredEmployees = [];
  String _searchTerm = '';
  String? _processingId;

  @override
  void initState() {
    super.initState();
    _fetchEmployeesAndUsers();
  }

  Future<void> _fetchEmployeesAndUsers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _tripService.fetchEmployees(),
        _tripService.fetchUsers(),
      ]);

      final List<Map<String, dynamic>> employeeList = List<Map<String, dynamic>>.from(results[0]);
      final List<Map<String, dynamic>> userList = List<Map<String, dynamic>>.from(results[1]);

      final processedEmployees = employeeList.map((emp) {
        final code = emp['employee_code'] ?? (emp['employee'] is Map ? emp['employee']['employee_code'] : null);
        final bool isAlreadyUser = userList.any((u) =>
            (u['employee_id']?.toString() == code?.toString()) ||
            (u['username']?.toString() == code?.toString()));
        return {...emp, 'isUser': isAlreadyUser};
      }).toList();

      setState(() {
        _employees = processedEmployees;
        _filteredEmployees = processedEmployees;
        _isLoading = false;
      });
    } catch (err) {
      setState(() {
        _error = 'Failed to load data. Please check connection.';
        _isLoading = false;
      });
    }
  }

  void _applySearch(String value) {
    setState(() {
      _searchTerm = value;
      _filteredEmployees = _employees.where((emp) {
        final searchLower = value.toLowerCase();
        final code = (emp['employee_code'] ?? emp['employee']?['employee_code'] ?? '').toString().toLowerCase();
        final name = (emp['name'] ?? emp['employee']?['name'] ?? '').toString().toLowerCase();
        final dept = (emp['department'] ?? emp['position']?['department'] ?? '').toString().toLowerCase();
        return code.contains(searchLower) || name.contains(searchLower) || dept.contains(searchLower);
      }).toList();
    });
  }

  Future<void> _handleMakeUser(Map<String, dynamic> employee) async {
    final empCode = (employee['employee_code'] ?? employee['employee']?['employee_code'])?.toString();
    final empName = (employee['name'] ?? employee['employee']?['name'])?.toString();

    if (empCode == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Employee Code is missing.')));
      return;
    }

    setState(() => _processingId = empCode);

    try {
      final payload = {
        'employee_id': empCode,
        'password': 'user123',
        'name': empName,
        'role': 'employee'
      };

      await _tripService.makeUser(payload);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User created successfully for $empName ($empCode). Default password: user123'), backgroundColor: Colors.green),
        );
        
        setState(() {
          _employees = _employees.map((e) {
            final code = (e['employee_code'] ?? e['employee']?['employee_code'])?.toString();
            if (code == empCode) {
              return {...e, 'isUser': true};
            }
            return e;
          }).toList();
          _applySearch(_searchTerm);
        });
      }
    } catch (err) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${err.toString()}'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _processingId = null);
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
        title: Text('User Management', style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900)),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded, color: Color(0xFF7C1D1D)), onPressed: _fetchEmployeesAndUsers),
        ],
      ),
      body: Column(
        children: [
        //   _buildHeader(),
          _buildSearchBar(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C1D1D)))
                : _error != null
                    ? _buildErrorState()
                    : _filteredEmployees.isEmpty
                        ? _buildEmptyState()
                        : _buildUserList(),
          ),
        ],
      ),
    );
  }

//   Widget _buildHeader() {
//     return Container(
//       width: double.infinity,
//       padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
//       color: Colors.white,
//       child: Column(
//         crossAxisAlignment: CrossAxisAlignment.start,
//         children: [
//           Text('Manage System Access', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFFBE123C))),
//           const SizedBox(height: 4),
//           Text('Easily create and manage system access for all corporate employees.', style: GoogleFonts.inter(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w500)),
//         ],
//       ),
//     );
//   }

  Widget _buildSearchBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      color: Colors.white,
      child: TextField(
        onChanged: _applySearch,
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.search_rounded, size: 22, color: Color(0xFF7C1D1D)),
          hintText: 'Search by name, ID or department...',
          hintStyle: GoogleFonts.inter(color: Colors.black26, fontWeight: FontWeight.w600),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline_rounded, size: 64, color: Colors.redAccent),
          const SizedBox(height: 16),
          Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.inter(color: Colors.black45, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _fetchEmployeesAndUsers,
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.person_search_rounded, size: 80, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          Text('No employees found', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Widget _buildUserList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemCount: _filteredEmployees.length,
      itemBuilder: (context, index) {
        final emp = _filteredEmployees[index];
        final code = (emp['employee_code'] ?? emp['employee']?['employee_code'] ?? 'N/A').toString();
        final name = (emp['name'] ?? emp['employee']?['name'] ?? 'Unknown').toString();
        final isUser = emp['isUser'] == true;
        final isProcessing = _processingId == code;

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: (isUser ? const Color(0xFF22C55E) : const Color(0xFF7C1D1D)).withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
                child: Center(child: Icon(isUser ? Icons.how_to_reg_rounded : Icons.person_add_rounded, color: isUser ? const Color(0xFF22C55E) : const Color(0xFF7C1D1D), size: 24)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                    const SizedBox(height: 2),
                    Text('ID: $code', style: GoogleFonts.inter(fontSize: 12, color: Colors.black26, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _buildActionButton(emp, code, isUser, isProcessing),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActionButton(Map<String, dynamic> emp, String code, bool isUser, bool isProcessing) {
    if (isProcessing) {
      return const SizedBox(width: 32, height: 32, child: CircularProgressIndicator(strokeWidth: 3, color: Color(0xFF7C1D1D)));
    }

    if (isUser) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: const Color(0xFF22C55E).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF22C55E)),
            const SizedBox(width: 4),
            Text('USER', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF22C55E))),
          ],
        ),
      );
    }

    return ElevatedButton(
      onPressed: () => _handleMakeUser(emp),
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF7C1D1D),
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800),
      ),
      child: const Text('ACTIVATE'),
    );
  }
}
