import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/permission_service.dart';
import '../services/location_tracking_service.dart';
import 'login_screen.dart';
import 'role_based_dashboard.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/api_constants.dart';
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  Timer? _timer;
  String _version = "";

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    );
    _animationController.forward();

    // Start background services and navigate after a brief pause
    _loadVersion();
    _initializeAndNavigate();
  }

  Future<void> _loadVersion() async {
    final packageInfo = await PackageInfo.fromPlatform();
    if (mounted) {
      setState(() {
        _version =
            "Version ${packageInfo.version} (${packageInfo.buildNumber})";
      });
    }
  }

  Future<void> _initializeAndNavigate() async {
    // 1. Mandatory Permission Check (Non-blocking)
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      await PermissionService.checkMandatoryPermissions()
          .timeout(const Duration(seconds: 3));
    } catch (e) {
      debugPrint('Permission verification timed out or failed: $e');
    }

    // 2. Parallel Background tasks
    _checkUpdates();
    
    // Evaluate if tracking should start (Daily or Trip based)
    try {
      await LocationTrackingService.initializeService();
      LocationTrackingService.syncTrackingWithTrips();
    } catch (e) {
      debugPrint('SPLASH_TRACKING_SYNC_ERROR: $e');
    }

    // Always attempt to move forward
    _timer = Timer(const Duration(seconds: 1), () {
      if (mounted) _navigateAfterSplash();
    });
  }

  Future<void> _checkUpdates() async {
    try {
      final apiService = ApiService();
      final config = await apiService.get(
        ApiConstants.trackingConfig,
        includeAuth: false,
      );

      if (config is Map<String, dynamic>) {
        final latestVersion = config['latest_version']?.toString() ?? "1.0.0";
        final updateUrl = config['update_url']?.toString() ?? "";

        final packageInfo = await PackageInfo.fromPlatform();
        final currentVersion = packageInfo.version;

        if (_isVersionLower(currentVersion, latestVersion) &&
            updateUrl.isNotEmpty) {
          if (mounted) {
            await _showUpdateDialog(updateUrl, latestVersion);
          }
        }
      }
    } catch (e) {
      debugPrint('UPDATE_CHECK: Failed: $e');
    }
  }

  bool _isVersionLower(String current, String latest) {
    try {
      List<int> cArr = current
          .split('.')
          .map((e) => int.tryParse(e) ?? 0)
          .toList();
      List<int> lArr = latest
          .split('.')
          .map((e) => int.tryParse(e) ?? 0)
          .toList();

      for (int i = 0; i < 3; i++) {
        int c = i < cArr.length ? cArr[i] : 0;
        int l = i < lArr.length ? lArr[i] : 0;
        if (l > c) return true;
        if (c > l) return false;
      }
    } catch (e) {
      return current != latest;
    }
    return false;
  }

  Future<void> _showUpdateDialog(String url, String newVersion) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.system_update, color: Color(0xFFBB0633)),
            SizedBox(width: 10),
            Text(
              'Update Available',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'A new version ($newVersion) of the Smart Hub is available for download.',
            ),
            const SizedBox(height: 10),
            const Text(
              'Please install the update to ensure system stability and tracking accuracy.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFBB0633),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 45),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () async {
              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: const Text('Download & Install Now'),
          ),
        ],
      ),
    );
  }

  void _navigateAfterSplash() {
    final apiService = ApiService();

    if (apiService.isAuthenticated) {
      final user = apiService.getUser() ?? {};
      final name = (user['name'] ?? user['username'] ?? '').toString();
      final role = (user['role'] ?? 'employee').toString().trim().toLowerCase();
      final email = (user['email'] ?? '').toString();

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => RoleBasedDashboard(
            username: name,
            userRole: role,
            email: email.isNotEmpty ? email : null,
          ),
        ),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  void dispose() {
    _animationController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image.asset(
                'assets/logo.png',
                height: 120,
                width: 120,
                errorBuilder: (context, error, stackTrace) => const Icon(
                  Icons.business_rounded,
                  color: Color(0xFF7C1D1D),
                  size: 60,
                ),
              ),
              const SizedBox(height: 24),
              const CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFF7C1D1D),
              ),
              const SizedBox(height: 32),
              if (_version.isNotEmpty)
                Text(
                  _version,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
