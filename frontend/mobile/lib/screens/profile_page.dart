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

    try {
      // Use employee_id from session for the API filter, exactly like Profile.jsx
      final empId = _userData?['employee_id'] ?? _userData?['username'] ?? widget.username;
      final response = await _apiService.get(
        '/api/employees/?employee_code=$empId',
      );

      List<dynamic> results = [];
      if (response is Map && response.containsKey('results')) {
        results = response['results'];
      }

      // Matching logic similar to Profile.jsx find()
      dynamic matchedEmployee;
      if (results.isNotEmpty) {
        final searchId = empId.toString().toLowerCase();
        final searchName = (_userData?['name'] ?? widget.username).toString().toLowerCase();

        for (var emp in results) {
          final code = (emp['employee_code'] ?? emp['employee']?['employee_code'] ?? '').toString().toLowerCase();
          final name = (emp['name'] ?? emp['employee']?['name'] ?? '').toString().toLowerCase();

          if ((searchId.isNotEmpty && code == searchId) || (searchName.isNotEmpty && name == searchName)) {
            matchedEmployee = emp;
            break;
          }
        }
        // Fallback to first if no exact match found
        matchedEmployee ??= results.first;
      }

      if (mounted) {
        setState(() {
          _profileData = matchedEmployee;
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
        _userData?['external_profile']?['position']?['name'] ??
        _userData?['designation'] ??
        _userData?['role'] ??
        '';
    final department =
        _profileData?['department'] ??
        _profileData?['position']?['department'] ??
        _userData?['external_profile']?['position']?['department'] ??
        _userData?['department'] ??
        '';
    final section =
        _profileData?['section'] ??
        _profileData?['position']?['section'] ??
        _userData?['external_profile']?['position']?['section'] ??
        '';
    List<dynamic> managers =
        _profileData?['positions_details']?[0]?['reporting_to'] ??
        _profileData?['reporting_to'] ??
        _profileData?['position']?['reporting_to'] ??
        _userData?['external_profile']?['positions_details']?[0]?['reporting_to'] ??
        _userData?['external_profile']?['reporting_to'] ??
        _userData?['external_profile']?['position']?['reporting_to'] ??
        [];

    // Fallback to top-level manager names if list is empty
    if (managers.isEmpty) {
      if (_userData?['reporting_manager'] != null) {
        managers.add({'name': _userData!['reporting_manager'], 'role': 'Reporting Manager'});
      }
      if (_userData?['senior_manager'] != null) {
        managers.add({'name': _userData!['senior_manager'], 'role': 'Senior Manager'});
      }
      if (_userData?['hod_director'] != null) {
        managers.add({'name': _userData!['hod_director'], 'role': 'HOD / Director'});
      }
    }

    final projectName =
        _profileData?['project']?['name'] ??
        _userData?['external_profile']?['project']?['name'] ??
        '';

    // Derive project code if missing, matching Profile.jsx logic
    String derivedProjectCode =
        _profileData?['project']?['code'] ??
        _userData?['external_profile']?['project']?['code'] ??
        '';

    if (derivedProjectCode.isEmpty && projectName.isNotEmpty) {
      final numMatch = RegExp(r'(\d+)').firstMatch(projectName);
      derivedProjectCode = numMatch != null
          ? 'PROJ-${numMatch.group(1)}'
          : projectName.length > 6
              ? projectName.substring(0, 6).toUpperCase()
              : projectName.toUpperCase();
    }

    final projectCode = derivedProjectCode;

    final officeName =
        _profileData?['office']?['name'] ??
        _userData?['external_profile']?['office']?['name'] ??
        '';
    final officeLevel =
        _profileData?['office']?['level']?.toString() ??
        _userData?['external_profile']?['office']?['level']?.toString() ??
        _userData?['office_level']?.toString() ??
        '';
    final district =
        _profileData?['office']?['geo_location']?['district'] ??
        _userData?['external_profile']?['office']?['geo_location']?['district'] ??
        '';
    final state =
        _profileData?['office']?['geo_location']?['state'] ??
        _userData?['external_profile']?['office']?['geo_location']?['state'] ??
        '';
    final country =
        _profileData?['office']?['geo_location']?['country'] ??
        _userData?['external_profile']?['office']?['geo_location']?['country'] ??
        '';

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: Color(0xFF0F172A),
                  size: 20,
                ),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: Text(
          'My Profile',
          style: GoogleFonts.outfit(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w800,
            fontSize: 20,
            letterSpacing: -0.5,
          ),
        ),
        centerTitle: true,
      ),
      extendBodyBehindAppBar: true,
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFBB0633)),
            )
          : Stack(
              children: [
                Positioned(
                  top: -150,
                  right: -100,
                  child: Container(
                    width: 500,
                    height: 500,
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        colors: [
                          const Color(0xFFA9052E).withOpacity(0.04),
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
                        colors: [Colors.orange.withOpacity(0.03), Colors.transparent],
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
                          const Color(0xFF3B82F6).withOpacity(0.03),
                          Colors.transparent,
                        ],
                      ),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                
                RefreshIndicator(
                  onRefresh: _runBackgroundRefresh,
                  color: const Color(0xFFBB0633),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 100, 20, 20),
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
                          color: const Color(0xFFBB0633),
                          children: [
                            _buildInfoItem('Department', department),
                            _buildInfoItem('Section', section),
                            _buildInfoItem('Project Name', projectName),
                            _buildInfoItem('Project Code', projectCode),
                          ],
                          managers: managers,
                        ),
                        const SizedBox(height: 16),
                        _buildInfoSection(
                          title: 'Work Location',
                          icon: Icons.location_on_rounded,
                          color: const Color(0xFF0F172A),
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
                        _buildFaceUpdateButton(),
                        const SizedBox(height: 16),
                        if (ModuleConstants.normalizeRole(_userData?['role']) ==
                            'admin') ...[
                          _buildDiagnosticsButton(),
                          const SizedBox(height: 16),
                        ],
                        _buildLogoutButton(),
                        const SizedBox(height: 120),
                      ],
                    ),
                  ),
                ),
              ],
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
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          const SizedBox(height: 40),
          Stack(
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFF1F5F9), width: 4),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(60),
                  child: ResponsiveImage(
                    imageData: photo,
                    width: 120,
                    height: 120,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                bottom: 8,
                right: 8,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            name,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            role,
            style: GoogleFonts.inter(
              fontSize: 14,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (code.isNotEmpty) _profileBadge(Icons.assignment_ind_rounded, code),
              const SizedBox(width: 8),
              if (dept.isNotEmpty) _profileBadge(Icons.business_rounded, dept),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Divider(color: Color(0xFFF1F5F9), height: 1),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                _contactTile(
                  Icons.email_outlined,
                  'EMAIL ADDRESS',
                  email,
                ),
                const SizedBox(height: 16),
                _contactTile(
                  Icons.phone_iphone_rounded,
                  'MOBILE PHONE',
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
      padding: const EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 18, color: color),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          LayoutBuilder(builder: (context, constraints) {
            final double itemWidth = (constraints.maxWidth - 20) / 2;
            return Wrap(
              spacing: 20,
              runSpacing: 16,
              children: children.map((c) => SizedBox(width: itemWidth, child: c)).toList(),
            );
          }),
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
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.2,
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
