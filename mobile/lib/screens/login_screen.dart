import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';

import '../constants/api_constants.dart';
import '../services/api_service.dart';
import '../constants/module_constants.dart';
import 'role_based_dashboard.dart';
import 'forgot_password_screen.dart';
import 'signup_screen.dart';
import 'frs_enrollment_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  late VideoPlayerController _videoController;
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _videoController = VideoPlayerController.asset('assets/background.mp4')
      ..initialize().then((_) {
        _videoController.play();
        _videoController.setLooping(true);
        setState(() {});
      });
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _videoController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter both username and password'),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final apiService = ApiService();
      final response = await apiService.post(
        ApiConstants.authLogin,
        body: {
          'employee_id':
              username, // Backend accepts both 'username' and 'employee_id'; web uses 'employee_id'
          'password': password,
        },
      );

      final token = response['token']?.toString() ?? '';
      final userDetails = response['user'] is Map
          ? Map<String, dynamic>.from(response['user'] as Map)
          : <String, dynamic>{};

      String role = _extractRole(response, userDetails);
      if (role.isEmpty && token.isNotEmpty) {
        role = _extractRoleFromToken(token);
      }
      role = ModuleConstants.normalizeRole(role);

      if (role == '' || role == 'null') {
        role = 'employee';
      }

      final userName = (userDetails['name'] ?? response['name'] ?? username)
          .toString();
      // Persist token + user to SharedPreferences (mirrors web app's localStorage)
      await apiService.setToken(token);
      await apiService.setUser(userDetails);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Logged in as $userName (Role: $role)'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );

      await Future.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;

      final userEmail = (userDetails['email'] ?? '').toString();
      final isFaceEnrolled = userDetails['is_face_enrolled'] == true;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => RoleBasedDashboard(
            username: userName,
            userRole: role,
            email: userEmail.isNotEmpty ? userEmail : null,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Login Failed: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  String _extractRole(
    Map<String, dynamic> response,
    Map<String, dynamic> userDetails,
  ) {
    final possibleRole =
        userDetails['role'] ??
        response['role'] ??
        userDetails['role_name'] ??
        response['user_role'] ??
        '';

    if (possibleRole == null) return '';
    if (possibleRole is String) return possibleRole;
    if (possibleRole is Map) {
      return (possibleRole['name'] ?? possibleRole['role'] ?? '').toString();
    }
    return possibleRole.toString();
  }

  String _extractRoleFromToken(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return '';
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final decoded = utf8.decode(base64Url.decode(payload));
      final tokenData = jsonDecode(decoded);
      return (tokenData['role'] ?? tokenData['user_role'] ?? '').toString();
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Video Section with Fade Effect
                  SizedBox(
                    height: MediaQuery.of(context).size.height * 0.35,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        if (_videoController.value.isInitialized)
                          SizedBox.expand(
                            child: FittedBox(
                              fit: BoxFit.cover,
                              child: SizedBox(
                                width: _videoController.value.size.width,
                                height: _videoController.value.size.height,
                                child: VideoPlayer(_videoController),
                              ),
                            ),
                          )
                        else
                          Container(color: Colors.white),
                        Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0x00FFFFFF), Colors.white],
                              stops: [0, 0.9],
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Form Section
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 30),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 5),
                        Text(
                          'Welcome Back',
                          style: GoogleFonts.interTight(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'Username',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildTextField(
                          controller: _usernameController,
                          hintText: 'Enter Username',
                          icon: Icons.person_outline,
                        ),
                        const SizedBox(height: 15),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Password',
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                            ),
                            GestureDetector(
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) =>
                                      const ForgotPasswordScreen(),
                                ),
                              ),
                              child: Text(
                                'Forgot Password?',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: const Color(0xFF7C1D1D),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _buildTextField(
                          controller: _passwordController,
                          hintText: 'Enter Password',
                          isPassword: true,
                          obscureText: _obscurePassword,
                          onToggleVisibility: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                          icon: Icons.lock_outline,
                        ),
                        const SizedBox(height: 40),
                        Center(
                          child: SizedBox(
                            width: 220,
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _signIn,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF7C1D1D),
                                foregroundColor: Colors.white,
                                elevation: 2,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: _isLoading
                                  ? const CircularProgressIndicator(
                                      color: Colors.white,
                                    )
                                  : Text(
                                      'Login',
                                      style: GoogleFonts.interTight(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 18,
                                      ),
                                    ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Center(
                          child: GestureDetector(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const SignUpScreen(),
                                ),
                              );
                            },
                            child: RichText(
                              text: TextSpan(
                                style: GoogleFonts.inter(
                                  color: Colors.black54,
                                  fontSize: 14,
                                ),
                                children: [
                                  const TextSpan(
                                    text: "Don't have an account? ",
                                  ),
                                  TextSpan(
                                    text: 'Sign Up',
                                    style: TextStyle(
                                      color: const Color(0xFF7C1D1D),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Logo Section at the very bottom
          Padding(
            padding: const EdgeInsets.only(bottom: 30, top: 10),
            child: Center(
              child: Image.asset(
                'assets/bavya logo.png',
                width: 150,
                fit: BoxFit.contain,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    bool isPassword = false,
    bool obscureText = false,
    VoidCallback? onToggleVisibility,
    IconData? icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFFC69E).withOpacity(0.4),
        borderRadius: BorderRadius.circular(12),
      ),
      child: TextFormField(
        controller: controller,
        obscureText: isPassword ? obscureText : false,
        decoration: InputDecoration(
          prefixIcon: icon != null
              ? Icon(icon, color: Colors.black45, size: 20)
              : null,
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    obscureText
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: Colors.black45,
                    size: 20,
                  ),
                  onPressed: onToggleVisibility,
                )
              : null,
          hintText: hintText,
          hintStyle: GoogleFonts.inter(color: Colors.black38, fontSize: 14),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 15,
          ),
        ),
        style: GoogleFonts.inter(fontSize: 15),
      ),
    );
  }
}
