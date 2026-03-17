import 'package:flutter/material.dart';

class AdminGuestHouseListScreen extends StatelessWidget {
  const AdminGuestHouseListScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest House List'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView.builder(
        itemCount: 3,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) => Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            title: Text('Guest House ${index + 1}'),
            subtitle: const Text('Location: Bangalore'),
            trailing: const Text('Available', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
          ),
        ),
      ),
    );
  }
}
