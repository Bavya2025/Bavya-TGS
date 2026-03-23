import 'package:flutter/material.dart';

class AdminVendorListScreen extends StatelessWidget {
  const AdminVendorListScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vendor List'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView.builder(
        itemCount: 5,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) => Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            title: Text('Vendor ${index + 1}'),
            subtitle: const Text('Category: Travel Agency'),
            trailing: const Text('Active', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
          ),
        ),
      ),
    );
  }
}
