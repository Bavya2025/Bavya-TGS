import 'package:flutter/material.dart';

class AdminUserListScreen extends StatelessWidget {
  const AdminUserListScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('User List'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView.builder(
        itemCount: 10,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) => Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: const CircleAvatar(backgroundColor: Color(0xFF7C1D1D), child: Icon(Icons.person, color: Colors.white)),
            title: Text('Employee Name ${index + 1}'),
            subtitle: const Text('Department: Sales'),
            trailing: const Icon(Icons.chevron_right),
          ),
        ),
      ),
    );
  }
}
