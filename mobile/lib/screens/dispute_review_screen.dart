import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class DisputeReviewScreen extends StatelessWidget {
  const DisputeReviewScreen({super.key});
  
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
                gradient: RadialGradient(colors: [const Color(0xFFA9052E).withOpacity(0.02), Colors.transparent]),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Column(
            children: [
              _buildCustomHeader(context),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                child: Row(
                  children: [
                    Container(
                      width: 4,
                      height: 16,
                      decoration: BoxDecoration(color: const Color(0xFFBB0633), borderRadius: BorderRadius.circular(2)),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'PENDING DISPUTES',
                      style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8), letterSpacing: 1.5),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  itemCount: 3,
                  itemBuilder: (context, index) {
                    return _buildDisputeItem('DSP-2023-001', 'Robert Brown', 'Expense Mismatch in Fuel Claim', index == 0);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCustomHeader(BuildContext context) {
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
            right: -20, top: -20,
            child: Container(width: 130, height: 130, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle)),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 15, 25, 25),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.gavel_rounded, color: Colors.white, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'COMPLIANCE HUB',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Colors.white.withOpacity(0.7),
                            letterSpacing: 1.5,
                          ),
                        ),
                        Text(
                          'Dispute Review',
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

  Widget _buildDisputeItem(String id, String employee, String issue, bool isUrgent) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15, offset: const Offset(0, 4))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F56B).withOpacity(0.1),
                    border: Border.all(color: const Color(0xFFF1F56B).withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(id, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), letterSpacing: 0.5)),
                ),
                if (isUrgent)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10)),
                    child: Text('URGENT', style: GoogleFonts.plusJakartaSans(color: const Color(0xFFBE123C), fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1)),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: const Color(0xFFBB0633).withOpacity(0.1),
                  child: Text(employee[0].toUpperCase(), style: const TextStyle(color: Color(0xFFBB0633), fontWeight: FontWeight.w900, fontSize: 14)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(employee, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                      Text('EMPLOYEE DISPUTE', style: GoogleFonts.plusJakartaSans(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w800, letterSpacing: 1.5)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(issue, style: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF475569), height: 1.5, fontWeight: FontWeight.w600)),
            const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Divider(height: 1, color: Color(0xFFF1F5F9))),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFBB0633),
                      side: const BorderSide(color: Color(0xFFFEE2E2)),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: Text('VIEW DETAILS', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F1E2A),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 8,
                      shadowColor: const Color(0xFF0F1E2A).withOpacity(0.4),
                    ),
                    child: Text('RESOLVE', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
