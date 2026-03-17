import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OrgSettingsScreen extends StatefulWidget {
  const OrgSettingsScreen({super.key});

  @override
  State<OrgSettingsScreen> createState() => _OrgSettingsScreenState();
}

class _OrgSettingsScreenState extends State<OrgSettingsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  final List<Map<String, dynamic>> _eligibilityData = [
    {'grade': 'Grade A', 'category': 'Accommodation', 'limit': '₹5,000', 'cityType': 'Metro'},
    {'grade': 'Grade A', 'category': 'Accommodation', 'limit': '₹3,500', 'cityType': 'Non-Metro'},
    {'grade': 'Grade B', 'category': 'Accommodation', 'limit': '₹3,500', 'cityType': 'Metro'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Admin Masters',
          style: GoogleFonts.interTight(color: const Color(0xFF0F172A), fontWeight: FontWeight.w900),
        ),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFF7C1D1D),
          labelColor: const Color(0xFF7C1D1D),
          unselectedLabelColor: const Color(0xFF94A3B8),
          labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 13),
          tabs: const [
            Tab(text: 'Eligibility'),
            Tab(text: 'Mileage Rates'),
            Tab(text: 'Categories'),
            Tab(text: 'Geo-Fences'),
            Tab(text: 'Jurisdiction'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildToolbar(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildEligibilityTable(),
                _buildEmptyState('Mileage Rates'),
                _buildEmptyState('Categories'),
                _buildEmptyState('Geo-Fences'),
                _buildEmptyState('Jurisdiction'),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: const Color(0xFF0F172A),
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
    );
  }

  Widget _buildToolbar() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search...',
                  hintStyle: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF94A3B8)),
                  border: InputBorder.none,
                  prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.filter_list_rounded, color: Color(0xFF64748B), size: 20),
          ),
        ],
      ),
    );
  }

  Widget _buildEligibilityTable() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          children: [
            _buildTableHeader(),
            ..._eligibilityData.map((data) => _buildTableRow(data)).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildTableHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Row(
        children: [
          Expanded(flex: 2, child: _headerText('GRADE')),
          Expanded(flex: 3, child: _headerText('CATEGORY')),
          Expanded(flex: 2, child: _headerText('LIMIT')),
          _headerText('ACTION'),
        ],
      ),
    );
  }

  Widget _headerText(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 10,
        fontWeight: FontWeight.w900,
        color: const Color(0xFF64748B),
        letterSpacing: 1.5,
      ),
    );
  }

  Widget _buildTableRow(Map<String, dynamic> data) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              data['grade'],
              style: GoogleFonts.interTight(fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
            ),
          ),
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data['category'],
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF334155)),
                ),
                Text(
                  data['cityType'],
                  style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              data['limit'],
              style: GoogleFonts.interTight(fontWeight: FontWeight.w900, color: const Color(0xFF1E293B)),
            ),
          ),
          Row(
            children: [
              _rowAction(Icons.edit_outlined, Colors.blue),
              _rowAction(Icons.delete_outline_rounded, Colors.red),
            ],
          ),
        ],
      ),
    );
  }

  Widget _rowAction(IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: Icon(icon, size: 18, color: color.withOpacity(0.7)),
    );
  }

  Widget _buildEmptyState(String title) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.inventory_2_outlined, size: 48, color: Color(0xFFCBD5E1)),
          const SizedBox(height: 16),
          Text(
            'No data for $title',
            style: GoogleFonts.interTight(fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}
