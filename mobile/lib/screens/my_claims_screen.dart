import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class MyClaimsScreen extends StatelessWidget {
  const MyClaimsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'My Claims',
            style: GoogleFonts.interTight(
              color: Colors.black,
              fontWeight: FontWeight.bold,
            ),
          ),
          centerTitle: true,
          bottom: TabBar(
            isScrollable: true,
            labelColor: const Color(0xFF7C1D1D),
            unselectedLabelColor: Colors.black45,
            indicatorColor: const Color(0xFF7C1D1D),
            indicatorWeight: 3,
            labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
            tabs: const [
              Tab(text: 'Submitted'),
              Tab(text: 'Under Review'),
              Tab(text: 'Clarification'),
              Tab(text: 'Approved'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildClaimsList(),
            const Center(child: Text('No Claims Under Review')),
            const Center(child: Text('No Clarifications Required')),
            const Center(child: Text('No Approved Claims')),
          ],
        ),
      ),
    );
  }

  Widget _buildClaimsList() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildClaimCard('CLM-2023-001', 'Travel Claim - Mumbai Trip', '450.00', '0.00'),
        _buildClaimCard('CLM-2023-002', 'Travel Claim - Mumbai Trip', '450.00', '0.00'),
      ],
    );
  }

  Widget _buildClaimCard(String id, String title, String claimed, String approved) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                id,
                style: GoogleFonts.inter(
                  color: Colors.black45,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE3F2FD),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Submitted',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF1976D2),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: GoogleFonts.interTight(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Claimed: \$$claimed',
                style: GoogleFonts.inter(fontSize: 13, color: Colors.black45, fontWeight: FontWeight.w500),
              ),
              Text(
                'Approved: \$$approved',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFF388E3C),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
