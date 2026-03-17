import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../services/trip_service.dart';
import 'trip_expense_form_detailed.dart';

class TripExpenseGridScreen extends StatefulWidget {
  final String tripId;
  const TripExpenseGridScreen({super.key, required this.tripId});

  @override
  _TripExpenseGridScreenState createState() => _TripExpenseGridScreenState();
}

class _TripExpenseGridScreenState extends State<TripExpenseGridScreen> {
  final TripService _tripService = TripService();
  bool _isLoading = true;
  List<dynamic> _expenses = [];

  @override
  void initState() {
    super.initState();
    _fetchExpenses();
  }

  Future<void> _fetchExpenses() async {
    setState(() => _isLoading = true);
    try {
      final trip = await _tripService.fetchTripDetails(widget.tripId);
      setState(() {
        _expenses = trip.expenses ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Trip Expense Grid', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 16)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchExpenses,
          )
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildCategorySection('OUTSTATION TRAVEL', 'Travel', Colors.deepPurple, Icons.flight_takeoff_rounded),
                _buildCategorySection('LOCAL CONVEYANCE', 'Local Travel', Colors.blue, Icons.directions_car_filled_rounded),
                _buildCategorySection('FOOD & REFRESHMENTS', 'Food', Colors.pink, Icons.restaurant_rounded),
                _buildCategorySection('ACCOMMODATION', 'Accommodation', Colors.orange, Icons.hotel_rounded),
                _buildCategorySection('INCIDENTAL / OTHERS', 'Incidental', Colors.grey, Icons.receipt_long_rounded),
                const SizedBox(height: 40),
              ],
            ),
          ),
    );
  }

  Widget _buildCategorySection(String title, String category, Color color, IconData icon) {
    final categoryExpenses = _expenses.where((e) {
      final nature = (e['nature'] ?? e['category'])?.toString().toLowerCase();
      // Logic to match categories
      if (category == 'Local Travel') return nature == 'fuel' || nature == 'local travel';
      if (category == 'Incidental') return nature == 'others' || nature == 'incidental' || nature == 'miscellaneous';
      return nature == category.toLowerCase();
    }).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, color: color, size: 20),
                    const SizedBox(width: 12),
                    Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: color, letterSpacing: 0.5)),
                  ],
                ),
                TextButton.icon(
                  onPressed: () => _openAddForm(category),
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 16),
                  label: const Text('ADD'),
                  style: TextButton.styleFrom(foregroundColor: color, textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 11)),
                )
              ],
            ),
          ),
          if (categoryExpenses.isEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text('No entries yet', style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF94A3B8))),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: categoryExpenses.length,
              separatorBuilder: (context, index) => Container(height: 1, color: const Color(0xFFF1F5F9)),
              itemBuilder: (context, index) {
                final exp = categoryExpenses[index];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  title: Text(
                    _getExpenseMainDisplay(exp),
                    style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text(
                    DateFormat('dd MMM yyyy').format(DateTime.parse(exp['date'])),
                    style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF64748B)),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('₹${exp['amount']}', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, fontSize: 14)),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        onPressed: () => _openEditForm(category, exp),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  String _getExpenseMainDisplay(dynamic exp) {
    try {
      final desc = jsonDecode(exp['description'] ?? '{}');
      if (exp['category']?.toString().toLowerCase() == 'fuel' || exp['category']?.toString().toLowerCase() == 'local travel') {
         return '${desc['mode'] ?? 'Local'} - ${desc['origin']} → ${desc['destination']}';
      }
      if (desc['origin'] != null && desc['destination'] != null) {
        return '${desc['origin']} → ${desc['destination']}';
      }
      return exp['remarks'] ?? exp['category'];
    } catch (e) {
      return exp['remarks'] ?? exp['category'];
    }
  }

  void _openAddForm(String category) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => TripExpenseFormDetailedScreen(category: category, tripId: widget.tripId)),
    );
    if (result == true) _fetchExpenses();
  }

  void _openEditForm(String category, dynamic exp) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => TripExpenseFormDetailedScreen(category: category, tripId: widget.tripId, expenseData: exp)),
    );
    if (result == true) _fetchExpenses();
  }
}
