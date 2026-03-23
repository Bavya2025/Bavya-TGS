import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'trip_summary_screen.dart';

class TripPlannerScreen extends StatefulWidget {
  final String tripId;
  const TripPlannerScreen({super.key, required this.tripId});

  @override
  _TripPlannerScreenState createState() => _TripPlannerScreenState();
}

class _TripPlannerScreenState extends State<TripPlannerScreen> {
  List<Map<String, String>> members = [
    {'name': 'Siva Kumar', 'role': 'Leader', 'status': 'Confirmed'},
    {'name': 'Anil Rao', 'role': 'Member', 'status': 'Joiner'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      body: Stack(
        children: [
          // Executive mesh blobs
          Positioned(
            top: -150,
            right: -100,
            child: Container(
              width: 500,
              height: 500,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [const Color(0xFFA9052E).withOpacity(0.04), Colors.transparent],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            bottom: 100,
            left: -150,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [const Color(0xFF3B82F6).withOpacity(0.03), Colors.transparent],
                ),
                shape: BoxShape.circle,
              ),
            ),
          ),

          Column(
            children: [
              _buildCustomHeader(),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
                  physics: const BouncingScrollPhysics(),
                  children: [
                    _groupDynamicsCard(),
                    const SizedBox(height: 24),
                    _routePreferencesCard(),
                    const SizedBox(height: 24),
                    _poolingSuggestionsCard(),
                    const SizedBox(height: 24),
                    _logisticsSummaryCard(),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: _buildActionFooter(),
    );
  }

  Widget _buildCustomHeader() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFA9052E),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -30,
            top: -20,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                shape: BoxShape.circle,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 15, 25, 30),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.psychology_rounded, color: Color(0xFFBB0633), size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI-POWERED',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Colors.white.withOpacity(0.7),
                            letterSpacing: 1.2,
                          ),
                        ),
                        Text(
                          'Trip Planner',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 22,
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

  Widget _buildActionFooter() {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.withOpacity(0.1))),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, -5)),
        ],
      ),
      child: InkWell(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (c) => TripSummaryScreen(tripId: widget.tripId))),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1E2A),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F1E2A).withOpacity(0.2),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: Text(
              'GENERATE ITINERARY',
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 13, letterSpacing: 0.5),
            ),
          ),
        ),
      ),
    );
  }

  Widget _groupDynamicsCard() {
    return _plannerCard(
      title: 'Group Dynamics',
      icon: Icons.groups_rounded,
      headerAction: TextButton(
        onPressed: () {}, 
        child: Text('AUTO-DETECT', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 11, color: const Color(0xFFBB0633), letterSpacing: 0.5))
      ),
      child: Column(
        children: [
          ...members.map((m) => _memberRow(m)).toList(),
          const SizedBox(height: 12),
          InkWell(
            onTap: () {},
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade100), 
                borderRadius: BorderRadius.circular(12)
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person_add_alt_1_rounded, size: 18, color: Color(0xFFBB0633)),
                  const SizedBox(width: 8),
                  Text(
                    'Add Joiner / Dropper', 
                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 13, color: const Color(0xFFBB0633))
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _memberRow(Map<String, String> m) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(m['name']!.substring(0, 1), style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 16, color: const Color(0xFF0B2844)))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(m['name']!, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14)), Text(m['role']!, style: GoogleFonts.inter(fontSize: 11, color: Colors.black38, fontWeight: FontWeight.w600))])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade100)),
            child: Text(m['status']!, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.black54)),
          ),
          const SizedBox(width: 10),
          const Icon(Icons.remove_circle_outline_rounded, size: 20, color: Colors.black12),
        ],
      ),
    );
  }

  Widget _routePreferencesCard() {
    return _plannerCard(
      title: 'Route & Preferences',
      icon: Icons.map_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 150,
            width: double.infinity,
            decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
            child: Stack(
              children: [
                Center(child: Icon(Icons.location_on_rounded, size: 40, color: Colors.red.withOpacity(0.1))),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      _routePoint('Origin: Hyderabad', 'HQ - Office', true),
                      Padding(padding: const EdgeInsets.only(left: 10), child: Container(width: 2, height: 30, color: Colors.grey.shade200)),
                      _routePoint('Destination: Vizag', 'Branch Visit', false),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text('ACCOMMODATION PREFERENCE', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.black26, letterSpacing: 0.5)),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              _prefChip('Single Occupancy', true),
              _prefChip('Twin Sharing', false),
              _prefChip('Guest House', false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _routePoint(String title, String subtitle, bool isOrg) {
    return Row(
      children: [
        Icon(Icons.circle, size: 10, color: isOrg ? const Color(0xFF0B2844) : const Color(0xFF7C1D1D)),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 13)), Text(subtitle, style: GoogleFonts.inter(fontSize: 10, color: Colors.black38, fontWeight: FontWeight.w600))]),
      ],
    );
  }

  Widget _prefChip(String label, bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(color: active ? const Color(0xFF0B2844) : Colors.white, borderRadius: BorderRadius.circular(10), border: Border.all(color: active ? const Color(0xFF0B2844) : const Color(0xFFE2E8F0))),
      child: Text(label, style: GoogleFonts.inter(color: active ? Colors.white : Colors.black54, fontWeight: FontWeight.w800, fontSize: 11)),
    );
  }

  Widget _poolingSuggestionsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [const Color(0xFFF5F3FF), Colors.white], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFDDD6FE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome_rounded, color: Color(0xFF8B5CF6), size: 20),
              const SizedBox(width: 8),
              Text('AI Pooling Suggestions', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF5B21B6))),
            ],
          ),
          const SizedBox(height: 12),
          Text('Team Marketing is also traveling to Vizag on the same dates.', style: GoogleFonts.inter(fontSize: 13, height: 1.5, fontWeight: FontWeight.w600, color: const Color(0xFF5B21B6))),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Save 40% on Transport', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF7C3AED))),
              ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))), child: Text('Pool Request', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _logisticsSummaryCard() {
    return _plannerCard(
      title: 'Logistics Overview',
      icon: Icons.analytics_outlined,
      child: Column(
        children: [
          _summaryStat('Total Distance', '620 km'),
          _summaryStat('Travel Mode', 'Pooled SUV'),
          _summaryStat('Est. Carbon Footprint', '12kg CO2', highlight: true),
        ],
      ),
    );
  }

  Widget _summaryStat(String title, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: GoogleFonts.inter(fontSize: 12, color: Colors.black45, fontWeight: FontWeight.w600)),
          Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w900, fontSize: 13, color: highlight ? Colors.green : const Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _plannerCard({required String title, required IconData icon, Widget? headerAction, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 20, offset: const Offset(0, 10))], border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(children: [Icon(icon, size: 20, color: const Color(0xFF0B2844)), const SizedBox(width: 10), Text(title, style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)))]),
              if (headerAction != null) headerAction,
            ],
          ),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }
}
