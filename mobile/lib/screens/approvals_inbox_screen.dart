import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/trip_service.dart';
import '../services/api_service.dart';

class ApprovalsInboxScreen extends StatefulWidget {
  const ApprovalsInboxScreen({super.key});

  @override
  State<ApprovalsInboxScreen> createState() => _ApprovalsInboxScreenState();
}

class _ApprovalsInboxScreenState extends State<ApprovalsInboxScreen>
    with SingleTickerProviderStateMixin {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _tasks = [];
  Map<String, dynamic> _counts = {
    'total': 0,
    'advances': 0,
    'trips': 0,
    'claims': 0,
  };
  String _activeTab = 'pending';
  String _filterType = 'all';
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, dynamic>> _filterOptions = [
    {'value': 'all', 'label': 'All'},
    {'value': 'trip', 'label': 'Trip'},
    {'value': 'expense', 'label': 'Expense'},
    {'value': 'advance', 'label': 'Advance'},
    {'value': 'mileage', 'label': 'Mileage'},
    {'value': 'dispute', 'label': 'Dispute'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final counts = await _tripService.fetchApprovalCounts();
      final tasks = await _tripService.fetchApprovals(
        tab: _activeTab,
        type: _filterType,
        search: _searchController.text,
      );
      if (mounted) {
        setState(() {
          _counts = counts;
          _tasks = tasks;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _handleFilterChange(String type) {
    setState(() => _filterType = type);
    _fetchData();
  }

  Future<void> _handleAction(
    String id,
    String action, {
    Map<String, dynamic>? extra,
  }) async {
    try {
      await _tripService.performApproval(id, action, extraData: extra);
      // mirror web toast wording: "Request approved successfully" etc
      String verb;
      switch (action.toLowerCase()) {
        case 'approve':
          verb = 'approved';
          break;
        case 'reject':
        case 'rejectbyfinance':
          verb = 'rejected';
          break;
        case 'pay':
          verb = 'paid';
          break;
        default:
          verb = '${action.toLowerCase()}ed';
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Request $verb successfully'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
      _fetchData();
    } catch (e) {
      // try to extract message from exception if available
      String message = e.toString();
      if (e is Map && e.containsKey('error')) {
        message = e['error'].toString();
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Action failed: $message'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // Executive Mesh Blobs
          Positioned(
            top: 250,
            right: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFA9052E).withOpacity(0.02),
                    Colors.transparent,
                  ],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Column(
            children: [
              _buildCustomHeader(),
              _buildFilterToggleSection(),
              _buildTypeFilterSection(),
              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFFBB0633),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchData,
                        color: const Color(0xFFBB0633),
                        child: _tasks.isEmpty
                            ? _buildEmptyState()
                            : ListView.builder(
                                padding: const EdgeInsets.all(20),
                                itemCount: _tasks.length,
                                itemBuilder: (context, index) =>
                                    _buildTaskCard(_tasks[index]),
                              ),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCustomHeader() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFFA9052E),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 15, 25, 30),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.arrow_back_ios_new_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(
                      Icons.verified_user_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'EXECUTIVE CONTROL',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Colors.white.withOpacity(0.7),
                            letterSpacing: 1.5,
                          ),
                        ),
                        Text(
                          'Approval Inbox',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterToggleSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      child: Row(
        children: [
          Expanded(
            child: _buildToggleBtn(
              'pending',
              Icons.access_time_filled_rounded,
              'Active Queue',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildToggleBtn(
              'history',
              Icons.check_circle_rounded,
              'History',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleBtn(String mode, IconData icon, String label) {
    final isActive = _activeTab == mode;
    return GestureDetector(
      onTap: () {
        setState(() {
          _activeTab = mode;
        });
        _fetchData();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF0F1E2A) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? const Color(0xFF0F1E2A) : const Color(0xFFF1F5F9),
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: const Color(0xFF0F1E2A).withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? Colors.white : const Color(0xFF64748B),
            ),
            const SizedBox(width: 10),
            Text(
              label.toUpperCase(),
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                color: isActive ? Colors.white : const Color(0xFF64748B),
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeFilterSection() {
    return Container(
      height: 50,
      margin: const EdgeInsets.symmetric(horizontal: 20),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _filterOptions.length,
        itemBuilder: (context, index) {
          final filter = _filterOptions[index];
          final bool isSelected = _filterType == filter['value'];
          return GestureDetector(
            onTap: () => _handleFilterChange(filter['value']),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isSelected
                        ? const Color(0xFFBB0633)
                        : Colors.transparent,
                    width: 3,
                  ),
                ),
              ),
              child: Text(
                filter['label'],
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected
                      ? const Color(0xFFBB0633)
                      : const Color(0xFF64748B),
                  letterSpacing: -0.2,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final bool isHistory = _activeTab == 'history';
    final statusColor = task['status'] == 'Approved'
        ? Colors.green
        : (task['status'] == 'Rejected' ? Colors.red : const Color(0xFFF59E0B));

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.03),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(24),
        child: InkWell(
          onTap: () => _showTaskDetails(task),
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      task['id'] ?? 'N/A',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    if (isHistory)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          task['status']?.toString().toUpperCase() ?? '',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            color: statusColor,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: const Color(0xFFF1F5F9),
                      child: Text(
                        (task['requester']?.toString() ?? '?')[0].toUpperCase(),
                        style: GoogleFonts.plusJakartaSans(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task['requester'] ?? 'User',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          Text(
                            task['type']?.toString().toUpperCase() ?? 'REQUEST',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 9,
                              color: const Color(0xFF94A3B8),
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  task['purpose'] ?? '',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    color: const Color(0xFF475569),
                    fontWeight: FontWeight.w600,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.calendar_today_rounded,
                          size: 12,
                          color: Color(0xFF94A3B8),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          task['date'] ?? '',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            color: const Color(0xFF94A3B8),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      task['cost'] ?? '₹0',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFFBB0633),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.verified_user_rounded,
              size: 40,
              color: Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'All caught up!',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'No pending approvals found for your review.',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  void _showTaskDetails(Map<String, dynamic> task) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(32),
              topRight: Radius.circular(32),
            ),
          ),
          child: _TaskDetailsContent(
            task: task,
            isHistory: _activeTab == 'history',
            onAction: (action, {Map<String, dynamic>? extra}) {
              Navigator.pop(context);
              _handleAction(task['id'], action, extra: extra);
            },
          ),
        ),
      ),
    );
  }
}

class _TaskDetailsContent extends StatefulWidget {
  final Map<String, dynamic> task;
  final bool isHistory;
  final Function(String action, {Map<String, dynamic>? extra}) onAction;

  const _TaskDetailsContent({
    required this.task,
    required this.isHistory,
    required this.onAction,
  });

  @override
  State<_TaskDetailsContent> createState() => _TaskDetailsContentState();
}

class _TaskDetailsContentState extends State<_TaskDetailsContent> {
  final TripService _tripService = TripService();
  Map<String, String> itemRemarks = {};
  bool _isActionLoading = false;

  // cached user + roles (mirrors web logic)
  Map<String, dynamic>? _currentUser;
  bool isFinanceHead = false;
  bool isFinanceExec = false;

  // finance-related state for approvals
  String execAmount = '';
  String paymentMode = '';
  String transactionId = '';
  String? receiptFile;

  @override
  void initState() {
    super.initState();
    _currentUser = ApiService().getUser();
    _computeRoles();
    // prefill amount exactly like web did
    execAmount =
        widget.task['details']?['executive_approved_amount']?.toString() ??
        (widget.task['cost']?.toString().replaceAll('₹', '') ?? '');
  }

  void _computeRoles() {
    final role = _currentUser?['role']?.toString().toLowerCase() ?? '';
    final dept = _currentUser?['department']?.toString().toLowerCase() ?? '';
    final desig = _currentUser?['designation']?.toString().toLowerCase() ?? '';
    isFinanceHead =
        (dept.contains('finance') && dept.contains('head')) ||
        (desig.contains('finance') && desig.contains('head')) ||
        role == 'cfo';
    final isFinance =
        dept.contains('finance') ||
        desig.contains('finance') ||
        role == 'finance' ||
        isFinanceHead;
    isFinanceExec = isFinance && !isFinanceHead;
  }

  Future<String?> _showRemarksDialog() async {
    String remark = '';
    return showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Enter remarks'),
          content: TextField(
            autofocus: true,
            onChanged: (v) => remark = v,
            decoration: const InputDecoration(hintText: 'Remarks'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, null),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, remark.trim()),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  void _handleItemAction(dynamic itemId, String status) async {
    setState(() => _isActionLoading = true);
    try {
      await _tripService.performApproval(
        widget.task['id'],
        'UpdateItem',
        extraData: {
          'item_id': itemId,
          'item_status': status,
          'remarks': itemRemarks[itemId.toString()] ?? '',
        },
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Item updated successfully')),
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error updating item: $e')));
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final String type = task['type'] ?? '';
    final details = task['details'] ?? {};

    return Column(
      children: [
        Container(
          width: 40,
          height: 4,
          margin: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFE2E8F0),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFFF1F5F9),
                child: Text(
                  (task['requester']?.toString() ?? '?')[0].toUpperCase(),
                  style: GoogleFonts.plusJakartaSans(
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task['requester'] ?? 'Requester',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    Text(
                      '$type Request',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        color: const Color(0xFF64748B),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
              ),
            ],
          ),
        ),
        const Divider(height: 32),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoGrid(task),
                // finance executives should be able to adjust recommendation similar to web
                if (isFinanceExec &&
                    [
                      'PENDING_EXECUTIVE',
                      'HR Approved',
                      'REJECTED_BY_HEAD',
                    ].contains(widget.task['status'])) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Executive Recommendation',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Text(
                        '₹',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: TextField(
                          keyboardType: TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: InputDecoration(
                            hintText: '0.00',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                          ),
                          controller: TextEditingController(text: execAmount)
                            ..selection = TextSelection.collapsed(
                              offset: execAmount.length,
                            ),
                          onChanged: (v) => execAmount = v,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 32),
                Text(
                  'Request Objective',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  task['purpose'] ?? '',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    color: const Color(0xFF475569),
                    height: 1.6,
                    fontWeight: FontWeight.w600,
                  ),
                ),

                if (type == 'Trip' && details.isNotEmpty) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Trip Itinerary',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildItinerary(details),
                  const SizedBox(height: 32),
                  Text(
                    'Travel Details',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildTravelDetails(details),
                ],

                if (type == 'Money Top-up / Advance' && details.isNotEmpty) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Advance Request',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildAdvanceDetails(details),
                ],

                if (type == 'Dispute' && details.isNotEmpty) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Dispute Details',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildDisputeDetails(details),
                ],

                if (details['expenses'] != null &&
                    (details['expenses'] as List).isNotEmpty) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Expense Breakdown',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildExpenseBreakdown(details['expenses']),
                ],

                if (details['odometer'] != null) ...[
                  const SizedBox(height: 32),
                  Text(
                    'Mileage Log',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildMileageLog(details['odometer']),
                ],

                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFDCFCE7)),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.verified_user_rounded,
                        color: Color(0xFF16A34A),
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Validated against corporate travel policy & grade limits.',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF166534),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
        if (!widget.isHistory) _buildBottomActions(),
      ],
    );
  }

  Widget _buildInfoGrid(Map<String, dynamic> task) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: GridView.count(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        childAspectRatio: 2.5,
        children: [
          _infoBlock('Request Type', task['type'] ?? 'N/A'),
          _infoBlock('Estimated Cost', task['cost'] ?? '0'),
          _infoBlock('Submitted Date', task['date'] ?? 'N/A'),
          _infoBlock('Risk Score', task['risk'] ?? 'Low'),
        ],
      ),
    );
  }

  Widget _infoBlock(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11,
            color: const Color(0xFF94A3B8),
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  void _triggerAction(String action) async {
    Map<String, dynamic> extra = {};
    if (action.toLowerCase().startsWith('reject')) {
      final remarks = await _showRemarksDialog();
      if (remarks == null || remarks.isEmpty) return;
      extra['remarks'] = remarks;
    }
    // include exec/payout data when relevant
    if (action == 'Pay') {
      extra['payment_mode'] = paymentMode;
      extra['transaction_id'] = transactionId;
      if (receiptFile != null) extra['receipt_file'] = receiptFile;
    }
    if (execAmount.isNotEmpty) extra['executive_approved_amount'] = execAmount;

    widget.onAction(action, extra: extra.isEmpty ? null : extra);
  }

  Widget _buildBottomActions() {
    final status = widget.task['status']?.toString() ?? '';
    if (isFinanceExec && status == 'PENDING_FINAL_RELEASE') {
      return _buildPayoutController();
    }

    String rejectLabel = isFinanceExec ? 'Return to HR' : 'Reject';
    String approveLabel;
    if (isFinanceExec &&
        [
          'PENDING_EXECUTIVE',
          'HR Approved',
          'REJECTED_BY_HEAD',
        ].contains(status)) {
      approveLabel = 'Verify & Send to Head (₹$execAmount)';
    } else if (isFinanceHead) {
      approveLabel = 'Authorize Payment (₹$execAmount)';
    } else {
      approveLabel = 'Approve';
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
        border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _triggerAction('Reject'),
              icon: const Icon(Icons.cancel_outlined, size: 20),
              label: Text(
                rejectLabel,
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Color(0xFFFFE4E6)),
                backgroundColor: const Color(0xFFFFF1F2),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () => _triggerAction('Approve'),
              icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
              label: Text(
                approveLabel,
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F1E2A),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
                elevation: 8,
                shadowColor: const Color(0xFF0F1E2A).withOpacity(0.4),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayoutController() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
        border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Release',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: paymentMode.isEmpty ? null : paymentMode,
            items: [
              const DropdownMenuItem(
                value: 'BANK_TRANSFER',
                child: Text('Bank Transfer'),
              ),
              if (double.tryParse(execAmount) != null &&
                  double.parse(execAmount) < 10000)
                const DropdownMenuItem(
                  value: 'CASH',
                  child: Text('Cash Payment'),
                ),
            ],
            decoration: const InputDecoration(
              labelText: 'Payment Mode',
              border: OutlineInputBorder(),
            ),
            onChanged: (v) {
              setState(() => paymentMode = v ?? '');
            },
          ),
          if (paymentMode == 'BANK_TRANSFER') ...[
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Transaction/Reference',
                border: OutlineInputBorder(),
              ),
              onChanged: (v) => setState(() => transactionId = v),
            ),
          ],
          if (paymentMode == 'CASH') ...[
            const SizedBox(height: 12),
            TextButton(
              onPressed: () async {
                // simple file picker: using showModalBottomSheet with file input is complex on mobile; skipping details for now
                // once file picked remember to `setState(() => receiptFile = <data>)` so button state updates
              },
              child: Text(
                receiptFile == null ? 'Upload Receipt' : 'Receipt Attached',
              ),
            ),
          ],
          const SizedBox(height: 20),
          Center(
            child: ElevatedButton.icon(
              onPressed:
                  (paymentMode.isEmpty ||
                      (paymentMode == 'BANK_TRANSFER' && transactionId.isEmpty))
                  ? null
                  : () => _triggerAction('Pay'),
              icon: const Icon(Icons.check_circle_outline_rounded, size: 20),
              label: Text(
                'Release Payment (₹$execAmount)',
                style: GoogleFonts.plusJakartaSans(
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF16A34A),
                padding: const EdgeInsets.symmetric(
                  vertical: 16,
                  horizontal: 24,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItinerary(Map<String, dynamic> details) {
    return Row(
      children: [
        _itineraryPoint('From', details['source'] ?? 'N/A'),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Icon(Icons.arrow_forward_rounded, color: Color(0xFFBB0633)),
        ),
        _itineraryPoint('To', details['destination'] ?? 'N/A'),
      ],
    );
  }

  Widget _itineraryPoint(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              color: const Color(0xFF94A3B8),
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            value,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTravelDetails(Map<String, dynamic> details) {
    return Wrap(
      spacing: 16,
      runSpacing: 16,
      children: [
        _detailBox('Mode', details['travel_mode']),
        _detailBox('Vehicle', details['vehicle_type']),
        _detailBox('Composition', details['composition']),
        _detailBox('Starts', details['start_date']),
        _detailBox('Ends', details['end_date']),
      ],
    );
  }

  Widget _detailBox(String label, dynamic value) {
    if (value == null) return const SizedBox.shrink();
    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              color: const Color(0xFF94A3B8),
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
          Text(
            value.toString(),
            style: GoogleFonts.plusJakartaSans(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvanceDetails(Map<String, dynamic> details) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          Text(
            'Requested Amount',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white60,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '₹${details['requested_amount']}',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.w900,
            ),
          ),
          const Divider(color: Colors.white10, height: 32),
          Text(
            'For Trip: ${details['trip_destination']} (${details['trip_id']})',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white60,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDisputeDetails(Map<String, dynamic> details) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFEE2E2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _infoBlock('Category', details['category'] ?? 'N/A'),
          const SizedBox(height: 16),
          Text(
            'Reason',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              color: const Color(0xFF94A3B8),
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
          Text(
            details['reason'] ?? 'N/A',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              color: const Color(0xFFBB0633),
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseBreakdown(dynamic expensesData) {
    final List expenses = expensesData as List;
    return Column(
      children: expenses
          .map(
            (exp) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          exp['category'] ?? 'Other',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        exp['date'] ?? '',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          color: const Color(0xFF94A3B8),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          exp['description']?.toString() ?? '',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      Text(
                        '₹${exp['amount']}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  if (!widget.isHistory) ...[
                    const SizedBox(height: 16),
                    TextField(
                      onChanged: (v) => itemRemarks[exp['id'].toString()] = v,
                      decoration: InputDecoration(
                        hintText: 'Add justification...',
                        hintStyle: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          color: const Color(0xFFCBD5E1),
                          fontWeight: FontWeight.w600,
                        ),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                      ),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () =>
                                _handleItemAction(exp['id'], 'Rejected'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Color(0xFFFFE4E6)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: Text(
                              'Reject Item',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () =>
                                _handleItemAction(exp['id'], 'Approved'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: Text(
                              'Approve Item',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildMileageLog(Map<String, dynamic> odo) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _odoReading('Start Reading', odo['start_reading']?.toString() ?? '0'),
          const Icon(
            Icons.arrow_forward_rounded,
            color: Color(0xFF94A3B8),
            size: 20,
          ),
          _odoReading('End Reading', odo['end_reading']?.toString() ?? '0'),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFBB0633),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '${odo['total_km'] ?? 0} KM',
              style: GoogleFonts.plusJakartaSans(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _odoReading(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 10,
            color: const Color(0xFF94A3B8),
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5,
          ),
        ),
        Text(
          '$value KM',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }
}
