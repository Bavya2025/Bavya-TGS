import 'package:flutter/material.dart';

class AdminRoleAssignmentScreen extends StatelessWidget {
  const AdminRoleAssignmentScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Role Assignment'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: const Center(child: Text('Role Management Interface')),
    );
  }
}
