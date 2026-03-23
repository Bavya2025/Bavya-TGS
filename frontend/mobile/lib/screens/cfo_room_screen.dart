import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class CfoRoomScreen extends StatelessWidget {
  const CfoRoomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black), onPressed: () => Navigator.pop(context)),
        title: Text('CFO Room', style: GoogleFonts.interTight(color: Colors.black, fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: const Center(child: Text('CFO War Room - coming soon')),
    );
  }
}
