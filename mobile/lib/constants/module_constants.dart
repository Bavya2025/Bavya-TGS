import '../screens/team_trip_details_screen.dart';
import '../screens/approvals_inbox_screen.dart';
import '../screens/trip_approvals_screen.dart';
import '../screens/finance_hub_screen.dart';
import '../screens/cfo_room_screen.dart';
import '../screens/org_settings_screen.dart';
import '../screens/user_management_screen.dart';
import '../screens/api_management_screen.dart';
import '../screens/dispute_review_screen.dart';
import '../screens/admin_audit_logs_screen.dart';
import '../screens/guest_house_screen.dart';
import '../components/forensic_camera.dart';
import 'package:flutter/material.dart';
import '../models/module_model.dart';
import '../screens/my_trips_screen.dart';
import '../screens/policy_center_screen.dart';
import '../screens/expense_approvals_screen.dart';
import '../screens/admin_vendor_list_screen.dart';
import '../screens/admin_user_list_screen.dart';
import '../screens/login_history_screen.dart';
import '../screens/documents_screen.dart';
import '../screens/settlements_screen.dart';
import '../screens/fleet_management_screen.dart';
import '../screens/frs_attendance_screen.dart';
import '../screens/frs_requests_hub_screen.dart';
import '../screens/my_requests_screen.dart';
import '../screens/my_claims_screen.dart';
import '../screens/my_tracking_screen.dart';

/// Module constants matching the Header.jsx navigation structure
class ModuleConstants {
  /// Main navigation modules (always visible to applicable roles)
  static final List<NavigationModule> mainNavModules = [
    NavigationModule(
      title: 'Location Tracking',
      description: 'Real-time team tracking',
      icon: Icons.gps_fixed_rounded,
      backgroundColor: const Color(0xFFE0F2FE),
      iconColor: const Color(0xFF0369A1),
      allowedRoles: [
        'reporting_authority',
        'reporting_manager',
        'manager',
        'admin',
        'hr',
        'management',
      ],
      destinationScreen: () => const TeamTripDetailsScreen(),
    ),
    NavigationModule(
      title: 'My Tracking',
      description: 'Review tracking status',
      icon: Icons.my_location_rounded,
      backgroundColor: const Color(0xFFF0FDF4),
      iconColor: const Color(0xFF16A34A),
      allowedRoles: ['employee', 'reporting_authority', 'hr', 'management'],
      destinationScreen: () => const MyTrackingScreen(),
    ),
    NavigationModule(
      title: 'Trips',
      description: 'Manage trips',
      icon: Icons.flight_rounded,
      backgroundColor: const Color(0xFFFFF1F2),
      iconColor: const Color(0xFFE11D48),
      allowedRoles: ['employee', 'reporting_authority', 'finance', 'admin'],
      destinationScreen: () => const MyTripsScreen(),
    ),
    NavigationModule(
      title: 'Documents',
      description: 'Document organizer',
      icon: Icons.folder_open_rounded,
      backgroundColor: const Color(0xFFE3F2FD),
      iconColor: const Color(0xFF1976D2),
      allowedRoles: [
        'employee',
        'reporting_authority',
        'finance',
        'admin',
        'cfo',
      ],
      destinationScreen: () => const DocumentsScreen(),
    ),
    NavigationModule(
      title: 'Policy',
      description: 'Travel policies',
      icon: Icons.book_rounded,
      backgroundColor: const Color(0xFFF1F8E9),
      iconColor: const Color(0xFF388E3C),
      allowedRoles: [
        'employee',
        'reporting_authority',
        'finance',
        'admin',
        'cfo',
      ],
      destinationScreen: () => const PolicyCenterScreen(),
    ),
    NavigationModule(
      title: 'My Requests',
      description: 'Journey & Claims',
      icon: Icons.assignment_rounded,
      backgroundColor: const Color(0xFFF3E5F5),
      iconColor: const Color(0xFF7B1FA2),
      allowedRoles: [
        'employee',
        'reporting_authority',
        'finance',
        'admin',
        'cfo',
      ],
      destinationScreen: () => const MyRequestsScreen(),
    ),
    NavigationModule(
      title: 'FRS Requests',
      description: 'Manager Approvals',
      icon: Icons.security_rounded,
      backgroundColor: const Color(0xFFFEE2E2),
      iconColor: const Color(0xFFBB0633),
      allowedRoles: [
        'employee',
        'reporting_authority',
        'hr',
        'finance',
        'cfo',
        'admin',
        'guesthouse_manager',
        'manager',
      ],
      destinationScreen: () => const FrsRequestsHubScreen(),
    ),
    NavigationModule(
      title: 'FRS Attendance',
      description: 'Daily verification',
      icon: Icons.face_unlock_rounded,
      backgroundColor: const Color(0xFFE8EAF6),
      iconColor: const Color(0xFF3F51B5),
      allowedRoles: [
        'employee',
        'reporting_authority',
        'finance',
        'admin',
        'cfo',
        'guesthouse_manager',
      ],
      destinationScreen: () => const FrsAttendanceScreen(),
    ),
  ];

  /// Management modules (accessible via "More" menu in web)
  static final List<NavigationModule> managementNavModules = [
    NavigationModule(
      title: 'Location Tracking',
      description: 'Real-time team tracking',
      icon: Icons.gps_fixed_rounded,
      backgroundColor: const Color(0xFFE0F2FE),
      iconColor: const Color(0xFF0369A1),
      allowedRoles: [
        'reporting_authority',
        'reporting_manager',
        'manager',
        'admin',
        'hr',
        'management',
      ],
      destinationScreen: () => const TeamTripDetailsScreen(),
    ),
    NavigationModule(
      title: 'Approvals',
      description: 'Review requests',
      icon: Icons.bar_chart_rounded,
      backgroundColor: const Color(0xFFE0F2F1),
      iconColor: const Color(0xFF00897B),
      allowedRoles: [
        'employee',
        'reporting_authority',
        'hr',
        'finance',
        'cfo',
        'admin',
      ],
      destinationScreen: () => const ApprovalsInboxScreen(),
    ),
    NavigationModule(
      title: 'Finance Hub',
      description: 'Finance management',
      icon: Icons.account_balance_rounded,
      backgroundColor: const Color(0xFFE8F5E9),
      iconColor: const Color(0xFF2E7D32),
      allowedRoles: ['finance', 'admin'],
      destinationScreen: () => const FinanceHubScreen(),
    ),
    NavigationModule(
      title: 'Settlements',
      description: 'Manage payments',
      icon: Icons.account_balance_wallet_rounded,
      backgroundColor: const Color(0xFFFFF3E0),
      iconColor: const Color(0xFFF57C00),
      allowedRoles: ['finance', 'admin'],
      destinationScreen: () => const SettlementsScreen(),
    ),
    NavigationModule(
      title: 'User Management',
      description: 'Manage users',
      icon: Icons.people_rounded,
      backgroundColor: const Color(0xFFE3F2FD),
      iconColor: const Color(0xFF1976D2),
      allowedRoles: ['admin'],
      destinationScreen: () => const UserManagementScreen(),
    ),
    NavigationModule(
      title: 'Guest Houses',
      description: 'Manage stays',
      icon: Icons.business_rounded,
      backgroundColor: const Color(0xFFFFF9C4),
      iconColor: const Color(0xFFFBC02D),
      allowedRoles: ['admin', 'guesthouse_manager'],
      destinationScreen: () => const GuestHouseScreen(),
    ),
    NavigationModule(
      title: 'Fleet Management',
      description: 'Vehicle management',
      icon: Icons.directions_car_rounded,
      backgroundColor: const Color(0xFFE1F5FE),
      iconColor: const Color(0xFF0288D1),
      allowedRoles: ['admin', 'guesthouse_manager'],
      destinationScreen: () => const FleetManagementScreen(),
    ),
    NavigationModule(
      title: 'Route Masters',
      description: 'Manage routes',
      icon: Icons.map_rounded,
      backgroundColor: const Color(0xFFF1F8E9),
      iconColor: const Color(0xFF388E3C),
      allowedRoles: ['admin'],
      destinationScreen: null, // Coming soon
    ),
    NavigationModule(
      title: 'API Management',
      description: 'Keys & settings',
      icon: Icons.api_rounded,
      backgroundColor: const Color(0xFFE0F2F1),
      iconColor: const Color(0xFF00897B),
      allowedRoles: ['admin'],
      destinationScreen: () => const ApiManagementScreen(),
    ),
    NavigationModule(
      title: 'Login History',
      description: 'Track activities',
      icon: Icons.history_rounded,
      backgroundColor: const Color(0xFFF5F5F5),
      iconColor: const Color(0xFF616161),
      allowedRoles: ['admin'],
      destinationScreen: () => const LoginHistoryScreen(),
    ),
    NavigationModule(
      title: 'Audit Logs',
      description: 'Security records',
      icon: Icons.shield_rounded,
      backgroundColor: const Color(0xFFE8EAF6),
      iconColor: const Color(0xFF3F51B5),
      allowedRoles: ['admin'],
      destinationScreen: () => const AdminAuditLogsScreen(),
    ),
  ];

  /// Get modules for specific category based on role
  static List<NavigationModule> getModulesForRole(
    String userRole, {
    bool mainOnly = false,
  }) {
    final normalizedRole = normalizeRole(userRole);

    if (mainOnly) {
      return mainNavModules
          .where((m) => m.allowedRoles.contains(normalizedRole))
          .toList();
    }

    return managementNavModules
        .where((m) => m.allowedRoles.contains(normalizedRole))
        .toList();
  }

  /// Normalize role name to handle variations
  static String normalizeRole(String role) {
    if (role.toLowerCase().contains('admin')) return 'admin';
    if (role.toLowerCase().contains('hr')) return 'hr';
    if (role.toLowerCase().contains('finance')) return 'finance';

    final normalized = role.toLowerCase().replaceAll(RegExp(r'[^a-z0-9_]'), '');

    if (normalized.contains('reporting') ||
        normalized.contains('manager') ||
        normalized.contains('supervisor') ||
        normalized.contains('lead') ||
        normalized.contains('director') ||
        normalized.contains('head') ||
        normalized.contains('approver') ||
        normalized.contains('officer') ||
        normalized.contains('authority')) {
      return 'reporting_authority';
    }
    if (normalized.contains('employee') || normalized.contains('oe')) {
      return 'employee';
    }
    if (normalized.contains('guesthouse') || normalized.contains('cro')) {
      return 'guesthouse_manager';
    }
    if (normalized.contains('management') || normalized.contains('mgmt')) {
      return 'management';
    }

    return normalized;
  }

  /// Check if role has management/supervision permissions
  static bool isManagementRole(String role) {
    if (role.toLowerCase().contains('admin')) return true;
    if (role.toLowerCase().contains('management')) return true;
    if (role.toLowerCase().contains('manager')) return true;

    final normalized = normalizeRole(role);
    return [
      'admin',
      'reporting_authority',
      'hr',
      'management',
      'manager',
      'reporting_manager',
    ].contains(normalized);
  }
}
