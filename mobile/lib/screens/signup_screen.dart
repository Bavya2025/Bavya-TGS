import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  _SignUpScreenState createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  late VideoPlayerController _videoController;
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;

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
    _videoController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
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
                  // Video Section
                  SizedBox(
                    height: MediaQuery.of(context).size.height * 0.35,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        SizedBox.expand(
                          child: FittedBox(
                            fit: BoxFit.cover,
                            child: SizedBox(
                              width: _videoController.value.size.width,
                              height: _videoController.value.size.height,
                              child: VideoPlayer(_videoController),
                            ),
                          ),
                        ),
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
                          'Create Account',
                          style: GoogleFonts.interTight(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          'Email',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildTextField(
                          controller: _emailController,
                          hintText: 'Enter Email',
                          icon: Icons.email_outlined,
                        ),
                        const SizedBox(height: 15),
                        Text(
                          'Password',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: Colors.black87,
                          ),
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
                        const SizedBox(height: 15),
                        Text(
                          'Confirm Password',
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildTextField(
                          controller: _confirmPasswordController,
                          hintText: 'Confirm Password',
                          isPassword: true,
                          obscureText: _obscureConfirmPassword,
                          onToggleVisibility: () {
                            setState(() {
                              _obscureConfirmPassword = !_obscureConfirmPassword;
                            });
                          },
                          icon: Icons.lock_clock_outlined,
                        ),
                        const SizedBox(height: 30),
                        Center(
                          child: SizedBox(
                            width: 220,
                            height: 50,
                            child: ElevatedButton(
                              onPressed: () {},
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF7C1D1D),
                                foregroundColor: Colors.white,
                                elevation: 2,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                'Sign Up',
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
                              Navigator.pop(context);
                            },
                            child: RichText(
                              text: TextSpan(
                                style: GoogleFonts.inter(
                                  color: Colors.black54,
                                  fontSize: 14,
                                ),
                                children: [
                                  const TextSpan(text: "Already have an account? "),
                                  TextSpan(
                                    text: 'Login',
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
          prefixIcon: icon != null ? Icon(icon, color: Colors.black45, size: 20) : null,
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    obscureText ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: Colors.black45,
                    size: 20,
                  ),
                  onPressed: onToggleVisibility,
                )
              : null,
          hintText: hintText,
          hintStyle: GoogleFonts.inter(
            color: Colors.black38,
            fontSize: 14,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        ),
        style: GoogleFonts.inter(fontSize: 15),
      ),
    );
  }
}
