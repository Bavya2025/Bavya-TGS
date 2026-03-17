import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'frs_face_requests_screen.dart';
import 'frs_approvals_screen.dart';
import 'face_update_requests_screen.dart';

class FrsRequestsHubScreen extends StatelessWidget {
  const FrsRequestsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // Executive Mesh Blobs
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 400,
              height: 400,
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
          Column(
            children: [
              _buildHeader(context),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    _buildSectionTitle('PENDING ACTIONS'),
                    const SizedBox(height: 16),
                    _buildRequestTile(
                      context,
                      title: 'Face Registration Approvals',
                      description: 'Approve new employee face enrollments',
                      icon: Icons.person_add_alt_1_rounded,
                      color: const Color(0xFF3B82F6),
                      screen: const FrsFaceRequestsScreen(),
                    ),
                    const SizedBox(height: 16),
                    _buildRequestTile(
                      context,
                      title: 'Attendance Approvals',
                      description: 'Review mismatched or flagged attendance',
                      icon: Icons.fact_check_rounded,
                      color: const Color(0xFF10B981),
                      screen: const FrsApprovalsScreen(),
                    ),
                    const SizedBox(height: 16),
                    _buildRequestTile(
                      context,
                      title: 'Face Photo Resets',
                      description: 'Review requests to update enrolled photos',
                      icon: Icons.face_retouching_natural_rounded,
                      color: const Color(0xFF8B5CF6),
                      screen: const FaceUpdateRequestsScreen(),
                    ),
                    const SizedBox(height: 40),
                    _buildSecurityNotice(),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        color: Color(0xFFA9052E),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
      ),
      child: SafeArea(
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
                  Icons.security_rounded,
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
                      'GOVERNANCE HUB',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Colors.white.withOpacity(0.7),
                        letterSpacing: 1.5,
                      ),
                    ),
                    Text(
                      'FRS Requests',
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
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: const Color(0xFF64748B),
        letterSpacing: 1.2,
      ),
    );
  }

  Widget _buildRequestTile(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required Widget screen,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(24),
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => screen),
          ),
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        description,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF94A3B8),
                  size: 24,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSecurityNotice() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.gpp_good_rounded,
            color: Color(0xFF64748B),
            size: 32,
          ),
          const SizedBox(height: 12),
          Text(
            'Confidential Data Processing',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Biometric data is processed strictly in accordance with organization policy. Photos visible here are temporary captures for verification purposes only.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
