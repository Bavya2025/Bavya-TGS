import 'package:flutter/material.dart';

class AdminPolicyUploadScreen extends StatelessWidget {
  const AdminPolicyUploadScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Policy Upload'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_upload_outlined, size: 64, color: Color(0xFF7C1D1D)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C1D1D)),
              child: const Text('Upload New Policy PDF', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
