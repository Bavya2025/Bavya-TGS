import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../constants/api_constants.dart';
import '../constants/module_constants.dart';
import '../models/module_model.dart';
import '../services/api_service.dart';
import '../services/location_tracking_service.dart';
import '../services/trip_service.dart';
import '../services/expense_reminder_service.dart';
import 'notifications_screen.dart';
import 'frs_enrollment_screen.dart';
import 'profile_page.dart';
import 'help_support_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';

/// Comprehensive role-based dashboard that displays modules as cards
class RoleBasedDashboard extends StatefulWidget {
  final String username;
  final String userRole;
  final String? email;

  const RoleBasedDashboard({
    super.key,
    required this.username,
    required this.userRole,
    this.email,
  });

  @override
  State<RoleBasedDashboard> createState() => _RoleBasedDashboardState();
}

class _RoleBasedDashboardState extends State<RoleBasedDashboard> {
  final ApiService _apiService = ApiService();
  final TripService _tripService = TripService();
  late List<NavigationModule> _mainModules;
  late List<NavigationModule> _managementModules;
  List<NotificationItem> _notifications = [];
  int _currentIndex = 1; // Default to Dashboard (index 1)

  bool _isFaceEnrolled = false;
  Map<String, dynamic>? _dashboardStats;
  bool _isLoadingStats = true;
  String? _empId;
  late String _refinedRole;

  Timer? _tripSyncTimer;

  @override
  void initState() {
    super.initState();
    _initializeSafe();
    // Periodically sync tracking (every 10 mins) in case trip status changes
    _tripSyncTimer = Timer.periodic(const Duration(minutes: 10), (_) {
      LocationTrackingService.syncTrackingWithTrips();
    });
  }

  @override
  void dispose() {
    _tripSyncTimer?.cancel();
    super.dispose();
  }

  Future<void> _initializeSafe() async {
    try {
      _initializeModules();
    } catch (e) {
      debugPrint('INIT_SAFE_MODULES: $e');
    }

    try {
      _fetchNotifications();
    } catch (e) {
      debugPrint('INIT_SAFE_NOTIFS: $e');
    }

    try {
      _syncExpenseReminders();
    } catch (e) {
      debugPrint('INIT_SAFE_REMINDERS: $e');
    }

    // Move location sync to after the tree is built to avoid startup crashes
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await LocationTrackingService.syncTrackingWithTrips();
      } catch (e) {
        debugPrint('INIT_SAFE_LOCATION: $e');
      }
    });

    try {
      _checkFrsStatus();
    } catch (e) {
      debugPrint('INIT_SAFE_FRS: $e');
    }

    try {
      _fetchDashboardData();
    } catch (e) {
      debugPrint('INIT_SAFE_DATA: $e');
    }

    try {
       _verifyAlwaysTrackingPermission();
    } catch (e) {
       debugPrint('INIT_SAFE_PERM_VERIFY: $e');
    }
  }

  /// Verification for background location permissions to comply with Android 10+ strict monitoring
  Future<void> _verifyAlwaysTrackingPermission() async {
    const String lastRemindKey = 'last_location_remind_v2';
    final prefs = await SharedPreferences.getInstance();
    final lastRemindedStr = prefs.getString(lastRemindKey);
    final now = DateTime.now();
    
    // Only remind once every 24 hours to avoid annoyance
    if (lastRemindedStr != null) {
      final lastReminded = DateTime.parse(lastRemindedStr);
      if (now.difference(lastReminded).inHours < 24) return;
    }

    // Check if Always permission is granted
    bool hasAlways = await LocationTrackingService.checkAlwaysPermission();
    if (!hasAlways && mounted) {
      _showTrackingRationaleDialog();
      await prefs.setString(lastRemindKey, now.toIso8601String());
    }
  }

  void _showTrackingRationaleDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.location_on, color: Color(0xFFBB0633)),
            SizedBox(width: 10),
            Text('Background Tracking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'For the "Smart Hub Sync" system to record your activity accurately even when the app is closed, please enable:',
              style: TextStyle(fontSize: 14),
            ),
            SizedBox(height: 15),
            Row(
              children: [
                Icon(Icons.check_circle, size: 16, color: Colors.green),
                SizedBox(width: 8),
                Expanded(child: Text('Location: "Allow all the time"', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
              ],
            ),
            SizedBox(height: 10),
            Text(
              'This is required by Android 10+ for company tracking protocols.',
              style: TextStyle(fontSize: 12, color: Colors.grey, fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Later', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFBB0633),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(context);
              await Geolocator.openAppSettings();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  Future<void> _fetchDashboardData() async {
    setState(() => _isLoadingStats = true);
    try {
      final stats = await _tripService.fetchDashboardStats();
      if (mounted) {
        setState(() {
          _dashboardStats = stats;
          _isLoadingStats = false;
        });
      }
    } catch (e) {
      debugPrint('Failed to fetch dashboard stats: $e');
      if (mounted) setState(() => _isLoadingStats = false);
    }
  }

  void _checkFrsStatus() {
    final user = _apiService.getUser();
    if (user != null) {
      setState(() {
        _isFaceEnrolled = user['is_face_enrolled'] == true;
        _empId = (user['employee_id'] ?? user['emp_id'] ?? user['id'] ?? '')
            .toString();
      });
    }
  }

  Future<void> _enrollFRS() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const FrsEnrollmentScreen()),
    );
    if (result == true) {
      // Refresh status after enrollment
      await _apiService.fetchFreshUser();
      _checkFrsStatus();
    }
  }


  Future<void> _syncExpenseReminders() async {
    try {
      final trips = await _tripService.fetchTrips();
      await ExpenseReminderService.syncTripExpenseReminders(trips);
    } catch (e) {
      debugPrint('Failed to sync expense reminders: $e');
    }
  }

  Future<void> _fetchNotifications() async {
    try {
      final response = await _apiService.get(ApiConstants.notifications);
      if (mounted) {
        setState(() {
          _notifications = response is List
              ? (response)
                    .map(
                      (n) =>
                          NotificationItem.fromJson(n as Map<String, dynamic>),
                    )
                    .toList()
              : [];
        });
      }
    } catch (e) {
      debugPrint("Failed to fetch notifications: $e");
    }
  }

  int get _unreadCount => _notifications.where((n) => n.unread).length;

  void _initializeModules() {
    final user = _apiService.getUser();
    final dept = user?['department']?.toString();
    final desig = user?['designation']?.toString();

    _refinedRole = ModuleConstants.normalizeRole(
      widget.userRole,
      dept: dept,
      desig: desig,
    );

    final allModules = ModuleConstants.getModulesForRole(_refinedRole);

    // Filter main vs management modules based on titles to preserve UI layout
    _mainModules = allModules
        .where(
          (m) =>
              m.title == 'Trips' ||
              m.title == 'My Requests' ||
              m.title == 'FRS Attendance' ||
              m.title == 'My Tracking' ||
              m.title == 'FRS Requests' ||
              m.title == 'Location Tracking' ||
              m.title == 'Job Report',
        )
        .toList();

    _managementModules = allModules
        .where(
          (m) =>
              m.title != 'Trips' &&
              m.title != 'My Requests' &&
              m.title != 'FRS Attendance' &&
              m.title != 'My Tracking' &&
              m.title != 'Location Tracking' &&
              m.title != 'FRS Requests' &&
              m.title != 'Job Report',
        )
        .toList();
  }

  bool _isNavigating = false;
  void _navigateToModule(NavigationModule module) {
    if (_isNavigating) return;

    if (module.title == 'Dashboard') {
      setState(() => _currentIndex = 1);
      return;
    }

    if (module.destinationScreen != null) {
      setState(() => _isNavigating = true);
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => module.destinationScreen!()),
      ).then((_) {
        if (mounted) setState(() => _isNavigating = false);
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${module.title} module coming soon'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentIndex == 1, // Only allow pop if on Dashboard tab
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_currentIndex != 1) {
          setState(() => _currentIndex = 1);
        }
      },
      child: Scaffold(
        backgroundColor: const Color(
          0xFFF3F4F6,
        ), // Slightly darker background to make white cards POP
        body: IndexedStack(
          index: _currentIndex,
          children: [
            const NotificationsScreen(),
            _buildDashboardHome(),
            ProfilePage(username: widget.username),
          ],
        ),
        bottomNavigationBar: _buildBottomNavBar(),
      ),
    );
  }


  Widget _buildDashboardHome() {
    return RefreshIndicator(
      onRefresh: () async {
        await _fetchDashboardData();
        await _fetchNotifications();
        await LocationTrackingService.syncTrackingWithTrips();
      },
      color: const Color(0xFFBB0633),
      child: Stack(
        children: [
          // Executive Mesh Blobs (Ultra-soft atmospheric layers)
          Positioned(
            top: -150,
            right: -100,
            child: Container(
              width: 500,
              height: 500,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFA9052E).withValues(alpha: 0.04),
                    Colors.transparent,
                  ],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            top: 250,
            left: -150,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [Colors.orange.withValues(alpha: 0.03), Colors.transparent],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: 100,
            right: -100,
            child: Container(
              width: 350,
              height: 350,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF3B82F6).withValues(alpha: 0.03),
                    Colors.transparent,
                  ],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ),

          SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                _buildWelcomeSection(),

                if (_isLoadingStats)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(40.0),
                      child: CircularProgressIndicator(
                        color: Color(0xFFBB0633),
                      ),
                    ),
                  )
                else if (_dashboardStats != null) ...[
                  _buildKpiGrid(),
                ],

                // Modules will be shown in ALL SERVICES grid below instead of dedicated header buttons
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
                  child: Text(
                    'ALL SERVICES',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF94A3B8),
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                  child: _buildModulesGrid([
                    ..._mainModules,
                    ..._managementModules,
                  ]),
                ),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeSection() {
    final now = DateTime.now();
    final formatter = DateFormat('EEEE, d MMMM yyyy').format(now);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formatter.toUpperCase(),
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    color: const Color(0xFF94A3B8),
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Hello, ${widget.username}!', // Full username
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F1E2A),
                    letterSpacing: -1.0,
                    height: 1.1,
                  ),
                ),
                if (_empId != null && _empId!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    'EMP ID: $_empId',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Relocated Face Registration icon to the right of welcome message
          if (!_isFaceEnrolled)
            GestureDetector(
              onTap: _enrollFRS,
              child: Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFBB0633).withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.face_retouching_natural,
                      color: Color(0xFFBB0633),
                      size: 28,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFD700),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }


  Widget _buildKpiGrid() {
    final kpis = _dashboardStats?['kpis'] as List? ?? [];
    if (kpis.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'AT A GLANCE',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF334155).withValues(alpha: 0.6),
                  letterSpacing: 1.2,
                ),
              ),
              const Icon(
                Icons.auto_awesome,
                color: Color(0xFF94A3B8),
                size: 18,
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4, // Making cards taller to prevent overflow
            ),
            itemCount: kpis.length,
            itemBuilder: (context, index) {
              final kpi = kpis[index];
              final color = _getKpiColor(kpi['color']);

              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      color,
                      Color.from(
                        alpha: color.a,
                        red: (color.r * 255 - 20).clamp(0, 255) / 255,
                        green: color.g,
                        blue: (color.b * 255 + 20).clamp(0, 255) / 255,
                      ), // Subtle gradient shift
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Stack(
                  clipBehavior: Clip.antiAlias,
                  children: [
                    // Subtle light overlay for glass effect
                    Positioned(
                      top: -20,
                      left: -20,
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.1),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18.0,
                        vertical: 14.0,
                      ), // Reduced vertical padding
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  (kpi['title'] ?? '').toString().toUpperCase(),
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white.withValues(alpha: 0.9),
                                    letterSpacing: 0.5,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  (kpi['value'] ?? '').toString(),
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                    letterSpacing: -1.0,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  (kpi['label'] ?? '').toString(),
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white.withValues(alpha: 0.95),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.1),
                              ),
                            ),
                            child: Icon(
                              _getKpiIcon(kpi['icon']),
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }



  Widget _buildWalletDisplay() {
    // show only the advance balance (wallet removed per request)
    final advance = _dashboardStats?['advance_balance'] ?? 0.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.account_balance_wallet_rounded,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'ADVANCE',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 8,
                  fontWeight: FontWeight.w800,
                  color: Colors.white.withValues(alpha: 0.9),
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                "₹${NumberFormat('#,###').format(advance)}",
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFA9052E),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            child: Container(
              width: 240,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.08),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(160),
                  bottomLeft: Radius.circular(160),
                ),
              ),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              24 + MediaQuery.of(context).padding.top,
              20,
              24,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 15,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/logo.png',
                    height: 42,
                    width: 42,
                    errorBuilder: (context, error, stackTrace) => const Icon(
                      Icons.public_rounded,
                      color: Color(0xFFBB0633),
                      size: 32,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'BTGS',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -1.0,
                        ),
                      ),
                      Text(
                        'Governance Hub',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                _buildWalletDisplay(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: NavigationBarTheme(
        data: NavigationBarThemeData(
          indicatorColor: const Color(0xFFBB0633).withValues(alpha: 0.1),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: const Color(0xFFBB0633),
              );
            }
            return GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            );
          }),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: Color(0xFFBB0633), size: 26);
            }
            return const IconThemeData(color: Color(0xFF64748B), size: 24);
          }),
        ),
        child: NavigationBar(
          height: 70,
          backgroundColor: Colors.white,
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            if (index == 2) {
              // Trigger dropdown/menu for Account
              _showAccountMenu(context);
            } else {
              setState(() {
                _currentIndex = index;
              });
            }
          },
          destinations: [
            NavigationDestination(
              icon: Stack(
                children: [
                  const Icon(Icons.notifications_outlined),
                  if (_unreadCount > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFBB0633),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '$_unreadCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              selectedIcon: Stack(
                children: [
                  const Icon(Icons.notifications_rounded),
                  if (_unreadCount > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFBB0633),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          '$_unreadCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
              ),
              label: 'Alerts',
            ),
            const NavigationDestination(
              icon: Icon(Icons.grid_view_outlined),
              selectedIcon: Icon(Icons.grid_view_rounded),
              label: 'Home',
            ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }

  void _showAccountMenu(BuildContext context) {
    final RenderBox overlay =
        Overlay.of(context).context.findRenderObject() as RenderBox;

    showMenu<String>(
      context: context,
      position: RelativeRect.fromLTRB(
        overlay.size.width - 200,
        overlay.size.height - 180,
        20,
        0,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      elevation: 10,
      color: Colors.white,
      items: [
        PopupMenuItem(
          value: 'profile',
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFBB0633).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.person_rounded,
                    color: Color(0xFFBB0633),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  'My Profile',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ),
        const PopupMenuDivider(height: 1),
        PopupMenuItem(
          value: 'help',
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.help_outline_rounded,
                    color: Colors.blue,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  'Help & Support',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    ).then((value) {
      if (value == 'profile') {
        setState(() {
          _currentIndex = 2;
        });
      } else if (value == 'help') {
        if (!context.mounted) return;
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const HelpSupportScreen()),
        );
      }
    });
  }

  IconData _getKpiIcon(String iconName) {
    switch (iconName) {
      case 'Briefcase':
        return Icons.business_center_rounded;
      case 'CreditCard':
        return Icons.account_balance_wallet_rounded;
      case 'TrendingUp':
        return Icons.analytics_rounded;
      case 'Clock':
        return Icons.hourglass_top_rounded;
      default:
        return Icons.insights_rounded;
    }
  }

  Color _getKpiColor(String colorName) {
    switch (colorName) {
      case 'orange':
        return const Color(0xFFF2994A); // Vibrant orange from image
      case 'red':
        return const Color(0xFFBB0633); // Primary Burgundy
      case 'magenta':
        return const Color(0xFFE91E63); // Vibrant Magenta
      case 'yellow':
        return const Color(0xFFF2C94C); // Soft Golden Yellow
      default:
        return const Color(0xFF3B82F6); // Professional Blue
    }
  }

  Widget _buildModulesGrid(List<NavigationModule> modules) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio:
            0.78, // Taller to accommodate larger icons without overflow
      ),
      itemCount: modules.length,
      itemBuilder: (context, index) {
        final module = modules[index];
        return _buildModuleCard(module);
      },
    );
  }

  Widget _buildModuleCard(NavigationModule module) {
    return GestureDetector(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.antiAlias,
          children: [
            // Decorative Background Gradient (Mesh look)
            Positioned(
              top: -20,
              right: -20,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      module.iconColor.withValues(alpha: 0.06),
                      module.iconColor.withValues(alpha: 0),
                    ],
                  ),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: module.iconColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: module.iconColor.withValues(alpha: 0.05),
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        module.icon,
                        color: module.iconColor,
                        size: 24,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    module.title,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, // Smaller title
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      height: 1.1,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    module.description,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 7, // Smaller description
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _navigateToModule(module),
                  borderRadius: BorderRadius.circular(24),
                  splashColor: module.iconColor.withValues(alpha: 0.1),
                  highlightColor: module.iconColor.withValues(alpha: 0.05),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

}
