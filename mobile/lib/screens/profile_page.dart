import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import '../services/frs_service.dart';
import 'frs_enrollment_screen.dart';
import 'change_password_screen.dart';
import 'help_support_screen.dart';
import 'debug_logs_screen.dart';
import '../constants/module_constants.dart';
import '../components/responsive_image.dart';

class ProfilePage extends StatefulWidget {
  final String username;
  const ProfilePage({super.key, required this.username});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _profileData;
  Map<String, dynamic>? _userData;
  final FrsService _frsService = FrsService();

  @override
  void initState() {
    super.initState();
    _userData = _apiService.getUser();
    // Show UI immediately if we have ANY basic data from the session
    if (_userData != null) {
      _isLoading = false;
      if (_userData!['external_profile'] != null) {
        _profileData = _userData!['external_profile'];
      }
    }
    _initProfile();
  }

  Future<void> _initProfile() async {
    // If we already have some data, don't show the blocker loader
    if (_userData != null && mounted) {
      setState(() => _isLoading = false);
    }

    // Perform background refresh without blocking the initial UI render
    _runBackgroundRefresh();
  }

  Future<void> _runBackgroundRefresh() async {
    try {
      final freshUser = await _refreshUserData();
      if (freshUser != null) {
        await _fetchDetailedProfile();
      }
      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      debugPrint("Background refresh failed: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<Map<String, dynamic>?> _refreshUserData() async {
    try {
      final freshUser = await _apiService.fetchFreshUser();
      if (mounted) {
        setState(() {
          _userData = freshUser;
        });
      }
      return freshUser;
    } catch (e) {
      debugPrint("Failed to refresh user data: $e");
      return null;
    }
  }

  Future<void> _fetchDetailedProfile() async {
    // We now get all necessary data from fetchFreshUser in _refreshUserData
    // This method is kept for compatibility but optimized to just use the existing data
    if (_userData != null && _userData!['external_profile'] != null) {
      if (mounted) {
        setState(() {
          _profileData = _userData!['external_profile'];
          _isLoading = false;
        });
      }
      return;
    }

    if (_profileData == null) {
      if (mounted) setState(() => _isLoading = true);
    }
    try {
      // If for some reason we don't have it yet, fetch ONLY this specific employee
      final empId = widget.username;
      final response = await _apiService.get(
        '/api/employees/?employee_id=$empId',
      );

      List<dynamic> results = [];
      if (response is Map && response.containsKey('results')) {
        results = response['results'];
      }

      if (mounted) {
        setState(() {
          _profileData = results.isNotEmpty ? results.first : null;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Profile fetch error: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final employeeName =
        _profileData?['name'] ??
        _profileData?['employee']?['name'] ??
        _userData?['name'] ??
        widget.username;
    final employeeCode =
        _profileData?['employee_code'] ??
        _profileData?['employee']?['employee_code'] ??
        _userData?['username'] ??
        widget.username;
    final photo = _profileData?['photo'] ?? _profileData?['employee']?['photo'];
    final phone =
        _profileData?['phone'] ??
        _profileData?['employee']?['phone'] ??
        _userData?['phone'] ??
        '';
    final email =
        _profileData?['email'] ??
        _profileData?['employee']?['email'] ??
        _userData?['email'] ??
        '';

    final designation =
        _profileData?['role'] ??
        _profileData?['position']?['name'] ??
        _userData?['role'] ??
        '';
    final department =
        _profileData?['department'] ??
        _profileData?['position']?['department'] ??
        '';
    final section =
        _profileData?['section'] ?? _profileData?['position']?['section'] ?? '';
    final List<dynamic> managers =
        _profileData?['reporting_to'] ??
        _profileData?['position']?['reporting_to'] ??
        [];

    final projectName = _profileData?['project']?['name'] ?? '';
    final projectCode = _profileData?['project']?['code'] ?? '';

    final officeName = _profileData?['office']?['name'] ?? '';
    final officeLevel = _profileData?['office']?['level'] ?? '';
    final district =
        _profileData?['office']?['geo_location']?['district'] ?? '';
    final state = _profileData?['office']?['geo_location']?['state'] ?? '';
    final country = _profileData?['office']?['geo_location']?['country'] ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: Colors.black,
                  size: 20,
                ),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: Text(
          'My Profile',
          style: GoogleFonts.interTight(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w900,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C1D1D)),
            )
          : RefreshIndicator(
              onRefresh: _fetchDetailedProfile,
              color: const Color(0xFF7C1D1D),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _buildPremiumIdentityCard(
                      employeeName,
                      designation,
                      employeeCode,
                      department,
                      email,
                      phone,
                      photo,
                    ),
                    const SizedBox(height: 24),
                    _buildInfoSection(
                      title: 'Organization Details',
                      icon: Icons.business_center_rounded,
                      color: const Color(0xFF7C1D1D),
                      children: [
                        _buildInfoItem('Department', department),
                        _buildInfoItem('Section', section),
                        _buildInfoItem('Project Name', projectName),
                        _buildInfoItem('Project Code', projectCode),
                      ],
                      managers: managers,
                    ),
                    const SizedBox(height: 24),
                    _buildInfoSection(
                      title: 'Work Location',
                      icon: Icons.location_on_rounded,
                      color: const Color(0xFF1E293B),
                      children: [
                        _buildInfoItem('Office Name', officeName),
                        _buildInfoItem('Base Level', officeLevel),
                        _buildInfoItem('District', district),
                        _buildInfoItem(
                          'State, Country',
                          '$state${state.isNotEmpty ? ", " : ""}$country',
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    const SizedBox(height: 24),
                    _buildFaceUpdateButton(),
                    const SizedBox(height: 16),
                    if (ModuleConstants.normalizeRole(_userData?['role']) ==
                        'admin') ...[
                      _buildDiagnosticsButton(),
                      const SizedBox(height: 16),
                    ],
                    _buildLogoutButton(),
                    const SizedBox(
                      height: 100,
                    ), // Extra space for bottom navigation
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildPremiumIdentityCard(
    String name,
    String role,
    String code,
    String dept,
    String email,
    String phone,
    String? photo,
  ) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          const SizedBox(height: 40),
          Stack(
            children: [
              Container(
                width: 130,
                height: 130,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF0F172A), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(65),
                  child: ResponsiveImage(
                    imageData: photo,
                    width: 130,
                    height: 130,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                bottom: 5,
                right: 5,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            name,
            style: GoogleFonts.interTight(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            role,
            style: GoogleFonts.inter(
              fontSize: 15,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (code.isNotEmpty) _profileBadge(Icons.tag, code),
              const SizedBox(width: 10),
              if (dept.isNotEmpty) _profileBadge(Icons.business_rounded, dept),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 30, vertical: 24),
            child: Divider(color: Color(0xFFF1F5F9)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 30),
            child: Column(
              children: [
                _contactTile(
                  Icons.alternate_email_rounded,
                  'Email Address',
                  email,
                ),
                const SizedBox(height: 16),
                _contactTile(
                  Icons.phone_android_rounded,
                  'Mobile Phone',
                  phone,
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _profileBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF64748B)),
          const SizedBox(width: 6),
          Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }

  Widget _contactTile(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 20, color: const Color(0xFF64748B)),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                color: Colors.black26,
                letterSpacing: 0.5,
              ),
            ),
            Text(
              value.isEmpty ? '--' : value,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoSection({
    required String title,
    required IconData icon,
    required Color color,
    required List<Widget> children,
    List<dynamic>? managers,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20, color: color),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: GoogleFonts.interTight(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 2.5,
            children: children,
          ),
          if (managers != null && managers.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Divider(color: Color(0xFFF1F5F9)),
            ),
            Text(
              'REPORTING MANAGER(S)',
              style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                color: Colors.black26,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: managers.map((m) => _managerChip(m)).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            color: Colors.black26,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value.isEmpty ? '--' : value,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _managerChip(dynamic m) {
    final name =
        (m is Map ? (m['name'] ?? m['employee_name'] ?? 'Unknown') : 'Unknown')
            .toString();
    final role = (m is Map ? (m['role'] ?? m['position_name'] ?? '') : '')
        .toString();
    return Container(
      padding: const EdgeInsets.fromLTRB(4, 4, 12, 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(50),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 12,
            backgroundColor: const Color(0xFF7C1D1D).withOpacity(0.1),
            child: Text(
              name[0].toUpperCase(),
              style: const TextStyle(
                color: Color(0xFF7C1D1D),
                fontWeight: FontWeight.bold,
                fontSize: 10,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              if (role.isNotEmpty)
                Text(
                  role,
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFaceUpdateButton() {
    final bool isFaceEnrolled = _userData?['is_face_enrolled'] == true;
    final bool isResetAllowed = _userData?['allow_photo_reset'] == true;
    final bool hasManager = _userData?['reporting_manager'] != null;

    // If already enrolled and not specifically allowed to reset, they must request
    final bool needsRequest = isFaceEnrolled && !isResetAllowed && hasManager;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: ElevatedButton(
        onPressed: () => _handleFaceUpdateAction(!needsRequest),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF7C1D1D),
          elevation: 0,
          side: const BorderSide(color: Color(0xFFF1F5F9), width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              !needsRequest
                  ? Icons.camera_front_rounded
                  : Icons.face_retouching_natural_rounded,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              !isFaceEnrolled
                  ? 'START FACE REGISTRATION'
                  : (needsRequest
                        ? 'REQUEST FACE PHOTO UPDATE'
                        : 'RE-ENROLL FACE DATA'),
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleFaceUpdateAction(bool isResetAllowed) async {
    if (isResetAllowed) {
      final result = await Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const FrsEnrollmentScreen()),
      );
      if (result == true) {
        // Update local session data if possible or just refresh
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Face updated successfully')),
        );
      }
    } else {
      final TextEditingController reasonController = TextEditingController();
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
            'Request Face Update',
            style: GoogleFonts.interTight(fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Your face data is locked for security. To update it, please provide a reason for your reporting manager.',
                style: GoogleFonts.inter(fontSize: 14),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                decoration: InputDecoration(
                  hintText: 'e.g., Changed appearance, Glasses, etc.',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF7C1D1D)),
                  ),
                ),
                maxLines: 3,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (reasonController.text.trim().isEmpty) return;
                try {
                  await _frsService.requestPhotoUpdate(reasonController.text);
                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Request sent to manager.')),
                    );
                  }
                } catch (e) {
                  if (mounted)
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(e.toString()),
                        backgroundColor: Colors.red,
                      ),
                    );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C1D1D),
              ),
              child: const Text(
                'Submit Request',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );
    }
  }

  Widget _buildLogoutButton() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: ElevatedButton(
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Confirm Logout'),
              content: const Text(
                'Are you sure you want to sign out from your account?',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () async {
                    await _apiService.clearToken();
                    if (mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                        (route) => false,
                      );
                    }
                  },
                  child: const Text(
                    'Logout',
                    style: TextStyle(color: Colors.red),
                  ),
                ),
              ],
            ),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Colors.redAccent,
          elevation: 0,
          side: const BorderSide(color: Color(0xFFFFE4E6), width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.logout_rounded, size: 20),
            const SizedBox(width: 8),
            Text(
              'LOGOUT FROM SESSION',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiagnosticsButton() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: ElevatedButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const DebugLogsScreen()),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF1E293B),
          elevation: 0,
          side: const BorderSide(color: Color(0xFFF1F5F9), width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.terminal_rounded, size: 20),
            const SizedBox(width: 8),
            Text(
              'VIEW SYSTEM LOGS',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
