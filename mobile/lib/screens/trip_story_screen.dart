import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/trip_model.dart';
import '../services/trip_service.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';
import '../components/trip_wallet_sheet.dart';
import '../components/claim_sheet.dart';
import 'package:image_picker/image_picker.dart';
import '../services/expense_reminder_service.dart';

class TripStoryScreen extends StatefulWidget {
  final String tripId;
  const TripStoryScreen({super.key, required this.tripId});

  @override
  State<TripStoryScreen> createState() => _TripStoryScreenState();
}

class _TripStoryScreenState extends State<TripStoryScreen> {
  final TripService _tripService = TripService();
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  bool _isActionLoading = false;
  Trip? _trip;
  Map<String, dynamic>? _currentUser;
  final Map<String, String> _auditRemarks = {};
  
  // Travel details state
  String _travelMode = 'Airways';
  String _vehicleType = 'Own';
  bool _isEditingTravelDetails = false;

  // Odometer state
  late TextEditingController _startOdometerController;
  late TextEditingController _endOdometerController;
  File? _startOdometerImage;
  File? _endOdometerImage;
  bool _isEditingOdometer = false;
  bool _isSavingOdometer = false;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _startOdometerController = TextEditingController();
    _endOdometerController = TextEditingController();
    _currentUser = _apiService.getUser();
    _fetchTripStory();
  }

  Widget _buildHero() {
    final bool isPayable = (_trip?.walletBalance ?? 0) < 0;
    final status = _trip?.status.toLowerCase() ?? '';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.12),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.fingerprint_rounded, color: Colors.white70, size: 12),
                    const SizedBox(width: 6),
                    Text(
                      _trip?.tripId ?? 'N/A',
                      style: GoogleFonts.plusJakartaSans(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              _buildStatusPill(_trip?.status ?? 'Unknown'),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            _trip?.purpose ?? 'Business Trip',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'OFFICIAL EXECUTED ITINERARY',
            style: GoogleFonts.plusJakartaSans(
              color: Colors.white54,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 28),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'INVESTMENT',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white38,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatCurrency(_trip?.totalExpenses),
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 32, color: Colors.white10),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WALLET STATUS',
                        style: GoogleFonts.plusJakartaSans(
                          color: Colors.white38,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isPayable ? '- ${_formatCurrency(_trip?.walletBalance?.abs())}' : '+ ${_formatCurrency(_trip?.walletBalance)}',
                        style: GoogleFonts.plusJakartaSans(
                          color: isPayable ? const Color(0xFFFB7185) : const Color(0xFF34D399),
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusPill(String status) {
    Color color = _getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: GoogleFonts.plusJakartaSans(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _startOdometerController.dispose();
    _endOdometerController.dispose();
    super.dispose();
  }

  Future<void> _handleAuditAction(String action) async {
    if (_trip == null) return;
    setState(() => _isActionLoading = true);
    try {
      final String taskId = _trip!.claim != null ? 'CLAIM-${_trip!.claim!['id']}' : 'TRIP-${_trip!.tripId}';
      await _tripService.performApproval(taskId, action);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$action Successful')));
      _fetchTripStory();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  Future<void> _handleItemAction(dynamic itemId, String itemStatus) async {
    if (_trip?.claim == null) return;
    final remarks = _auditRemarks[itemId.toString()] ?? "";

    if (itemStatus == 'Rejected' && remarks.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please provide remarks for rejection')));
      return;
    }

    setState(() => _isActionLoading = true);
    try {
      await _tripService.performApproval('CLAIM-${_trip!.claim!['id']}', 'UpdateItem', extraData: {
        'item_id': itemId,
        'item_status': itemStatus,
        'remarks': remarks,
      });
      _fetchTripStory();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Update failed: $e')));
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '₹0';
    
    double? numAmount;
    if (amount is num) {
      numAmount = amount.toDouble();
    } else if (amount is String) {
      numAmount = double.tryParse(amount);
    }
    
    if (numAmount == null) return '₹0';
    
    final formatter = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return formatter.format(numAmount);
  }

  Future<void> _fetchTripStory() async {
    setState(() => _isLoading = true);
    try {
      final trip = await _tripService.fetchTripDetails(widget.tripId);
      
      List<dynamic> expenses = trip.expenses ?? [];
      if (expenses.isEmpty) {
        expenses = await _tripService.fetchExpenses(tripId: widget.tripId);
      }

      List<dynamic> advances = trip.advances ?? [];
      if (advances.isEmpty) {
        final allAdvances = await _apiService.get('${ApiConstants.baseUrl}/api/advances/?trip_id=${widget.tripId}');
        if (allAdvances is List) advances = allAdvances;
      }

      setState(() {
        _trip = Trip(
          id: trip.id, tripId: trip.tripId, userId: trip.userId, purpose: trip.purpose, destination: trip.destination, source: trip.source,
          dates: trip.dates, startDate: trip.startDate, endDate: trip.endDate, status: trip.status,
          costEstimate: trip.costEstimate, travelMode: trip.travelMode, vehicleType: trip.vehicleType,
          employee: trip.employee, title: trip.title, projectCode: trip.projectCode,
          reportingManagerName: trip.reportingManagerName, composition: trip.composition,
          tripLeader: trip.tripLeader, 
          leaderDesignation: trip.leaderDesignation,
          leaderEmployeeId: trip.leaderEmployeeId,
          members: trip.members, lifecycleEvents: trip.lifecycleEvents,
          accommodationRequests: trip.accommodationRequests, odometer: trip.odometer,
          totalApprovedAdvance: trip.totalApprovedAdvance, totalExpenses: trip.totalExpenses,
          walletBalance: trip.walletBalance, advances: advances, expenses: expenses,
          enRoute: trip.enRoute, claim: trip.claim, currentApprover: trip.currentApprover,
          userBankName: trip.userBankName, userAccountNo: trip.userAccountNo,
        );

        // Initialize travel details
        _travelMode = trip.travelMode ?? 'Airways';
        _vehicleType = trip.vehicleType ?? 'Own';
        
        _isLoading = false;
        if (_trip?.expenses != null) {
          final role = _currentUser?['role']?.toString().toLowerCase() ?? '';
          _auditRemarks.clear(); // Clear before refill
          for (var exp in _trip!.expenses!) {
            final String expId = exp['id'].toString();
            if (role.contains('finance')) {
              _auditRemarks[expId] = exp['finance_remarks'] ?? '';
            } else if (role.contains('hr')) {
              _auditRemarks[expId] = exp['hr_remarks'] ?? '';
            } else {
              _auditRemarks[expId] = exp['rm_remarks'] ?? '';
            }
          }
        }
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _updateTravelDetails() async {
    if (_trip == null) return;
    
    setState(() => _isActionLoading = true);
    try {
      final payload = {
        'travel_mode': _travelMode,
        'vehicle_type': ['2 Wheeler', '3 Wheeler', '4 Wheeler'].contains(_travelMode) ? _vehicleType : null,
      };
      
      await _apiService.patch('${ApiConstants.baseUrl}/api/trips/${_trip!.tripId}/', body: payload);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Travel details updated successfully')));
        setState(() => _isEditingTravelDetails = false);
        _fetchTripStory();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error updating travel details: $e'), backgroundColor: Colors.red));
      }
    } finally {
      setState(() => _isActionLoading = false);
    }
  }

  Widget _buildRichDescription(String? desc) {
    if (desc == null || desc.isEmpty) return Text('No description', style: GoogleFonts.inter(fontSize: 12, color: Colors.black26));
    
    if (!desc.startsWith('{')) {
      return Text(desc, style: GoogleFonts.inter(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500));
    }

    try {
      final d = jsonDecode(desc);
      if (d is! Map) return Text(desc, style: GoogleFonts.inter(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500));

      List<Widget> rows = [];
      
      // Booking Details
      final bookingDate = d['bookingDate'] ?? '';
      final bookingTime = d['bookingTime'] ?? '';
      final bookedBy = d['bookedBy'] ?? d['bookingType'] ?? '';
      if (bookingDate.isNotEmpty) {
        rows.add(_descRow(Icons.event_available_rounded, 'Booked: $bookingDate ${bookingTime.isNotEmpty ? '@ $bookingTime' : ''} ${bookedBy.isNotEmpty ? '($bookedBy)' : ''}'));
      }

      // Route
      final origin = d['origin'] ?? '';
      final dest = d['destination'] ?? '';
      final boardingPoint = d['boardingPoint'] ?? '';
      if (origin.isNotEmpty || dest.isNotEmpty) {
        String route = '$origin → $dest';
        if (boardingPoint.isNotEmpty) route += ' (Boarding: $boardingPoint)';
        rows.add(_descRow(Icons.map_outlined, route, isTitle: true));
      }

      // Carrier & Ticket
      final carrier = d['carrierName'] ?? d['provider'] ?? '';
      final travelNo = d['ticketNo'] ?? d['travelNo'] ?? '';
      final pnr = d['pnr'] ?? '';
      final cls = d['class'] ?? '';
      final driver = d['driverName'] ?? '';
      if (carrier.isNotEmpty || pnr.isNotEmpty || driver.isNotEmpty) {
        String info = carrier;
        if (travelNo.isNotEmpty) info += ' ($travelNo)';
        if (cls.isNotEmpty) info += ' | $cls';
        if (pnr.isNotEmpty) info += ' | PNR: $pnr';
        if (driver.isNotEmpty) info += ' | Driver: $driver';
        rows.add(_descRow(Icons.commute_rounded, info));
      }

      // Pax & Vehicle No
      final pax = d['pax'] ?? '';
      final vehicleNo = d['vehicleNo'] ?? '';
      if (pax != null && pax.toString().isNotEmpty && pax != 0) {
        rows.add(_descRow(Icons.groups_outlined, 'Pax: $pax'));
      }
      if (vehicleNo.isNotEmpty) {
        rows.add(_descRow(Icons.directions_car_outlined, 'Vehicle No: $vehicleNo'));
      }

      // Options (Meal, Baggage, Tatkal)
      List<String> options = [];
      if (d['mealIncluded'] == true || d['mealIncluded'] == 'Yes') options.add('Meal Included');
      if (d['excessBaggage'] == true || d['excessBaggage'] == 'Yes') options.add('Excess Baggage');
      if (d['isTatkal'] == true || d['isTatkal'] == 'Yes') options.add('Tatkal Ticket');
      if (options.isNotEmpty) {
        rows.add(_descRow(Icons.verified_outlined, options.join(' • ')));
      }

      // Invoice
      final invNo = d['invoiceNo'] ?? '';
      if (invNo.isNotEmpty) {
        rows.add(_descRow(Icons.description_outlined, 'Invoice: $invNo'));
      }

      // Location
      final loc = d['location'] ?? d['hotelName'] ?? d['hotel_name'] ?? d['restaurant'] ?? '';
      if (loc.isNotEmpty) {
        rows.add(_descRow(Icons.location_on_outlined, loc));
      }

      // Mode/Type
      final mode = d['mode'] ?? d['mealType'] ?? d['roomType'] ?? '';
      final mealCat = d['mealCategory'] ?? '';
      final mealTime = d['mealTime'] ?? '';
      final purpose = d['purpose'] ?? '';
      
      if (mealCat.isNotEmpty) {
        rows.add(_descRow(Icons.restaurant_menu_rounded, 'Category: $mealCat ${mealTime.isNotEmpty ? "@ $mealTime" : ""}'));
      }

      if (mode.isNotEmpty) {
        rows.add(_descRow(Icons.info_outline_rounded, 'Type: $mode'));
      }

      if (purpose.isNotEmpty) {
        rows.add(_descRow(Icons.place_outlined, 'Address: $purpose'));
      }

      // Time (Journey) / Local Times
      final startTime = d['startTime'] ?? '';
      final endTime = d['endTime'] ?? '';
      if (startTime.isNotEmpty || endTime.isNotEmpty) {
        rows.add(_descRow(Icons.access_time_rounded, 'Start: $startTime — End: $endTime'));
      }

      if (d['time'] != null && d['time'] is Map) {
         final t = d['time'];
         final b = t['boardingTime'] ?? '';
         final s = t['scheduledTime'] ?? '';
         final a = t['actualTime'] ?? '';
         final delay = t['delay'] ?? 0;
         if (b.isNotEmpty || s.isNotEmpty) {
            rows.add(_descRow(Icons.access_time_rounded, 'Dep: $b | Arr: $s ${a.isNotEmpty ? '| Act: $a' : ''} ${delay > 0 ? '| Delay: ${delay}m' : ''}'));
         }
      }

      // Toll, Parking, Fuel
      final toll = d['toll']?.toString() ?? '';
      final parking = d['parking']?.toString() ?? '';
      final fuel = d['fuel']?.toString() ?? '';
      if ((toll.isNotEmpty && toll != '0' && toll != '0.00') || 
          (parking.isNotEmpty && parking != '0' && parking != '0.00') || 
          (fuel.isNotEmpty && fuel != '0' && fuel != '0.00')) {
        List<String> finance = [];
        if (toll.isNotEmpty && toll != '0' && toll != '0.00') finance.add('Toll: $toll');
        if (parking.isNotEmpty && parking != '0' && parking != '0.00') finance.add('Pkg: $parking');
        if (fuel.isNotEmpty && fuel != '0' && fuel != '0.00') finance.add('Fuel: $fuel');
        rows.add(_descRow(Icons.payments_outlined, finance.join(' • ')));
      }

      // Remarks
      final remarks = d['remarks'] ?? d['description'] ?? '';
      if (remarks.isNotEmpty && remarks != desc) {
        rows.add(Padding(
          padding: const EdgeInsets.only(top: 4, left: 18),
          child: Text('Note: $remarks', style: GoogleFonts.inter(fontSize: 10, color: Colors.black38, fontStyle: FontStyle.italic)),
        ));
      }

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: rows,
      );
    } catch (e) {
      return Text(desc, style: GoogleFonts.inter(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.w500));
    }
  }

  Widget _descRow(IconData icon, String text, {bool isTitle = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 12, color: isTitle ? const Color(0xFF0F172A) : Colors.black26),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: GoogleFonts.inter(fontSize: 12, color: isTitle ? const Color(0xFF0F172A) : Colors.black54, fontWeight: isTitle ? FontWeight.w800 : FontWeight.w500))),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
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
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
                    : _trip == null
                        ? const Center(child: Text('Story not found'))
                        : _buildContent(),
              ),
            ],
          ),
          if (_isActionLoading)
             Container(
               color: Colors.black26,
               child: const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633))),
             ),
        ],
      ),
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
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.public_rounded, color: Color(0xFFBB0633), size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'OFFICIAL REPORT',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: Colors.white.withOpacity(0.7),
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.verified_rounded, color: Colors.white.withOpacity(0.9), size: 10),
                          ],
                        ),
                        Text(
                          'Trip Story',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () {}, 
                    icon: const Icon(Icons.share_rounded, color: Colors.white, size: 20)
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: _fetchTripStory,
          color: const Color(0xFF7C1D1D),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHero(),
                const SizedBox(height: 30),
                _buildCoreDetails(),
                const SizedBox(height: 30),
                if (_trip?.members != null && _trip!.members.length > 1) ...[
                  _buildTeamSection(),
                  const SizedBox(height: 30),
                ],
                if (_trip?.accommodationRequests != null && _trip!.accommodationRequests!.isNotEmpty) ...[
                  _buildAccommodationSection(),
                  const SizedBox(height: 30),
                ],
                _buildFinancialSummary(),
                const SizedBox(height: 30),
                if (_shouldShowOdometerSection()) ...[
                  _buildOdometerSection(),
                  const SizedBox(height: 30),
                ],
                if (_trip?.lifecycleEvents != null && _trip!.lifecycleEvents.isNotEmpty) ...[
                  _buildJourneyHistory(),
                  const SizedBox(height: 30),
                ],
                _buildExpenseRegistry(),
                const SizedBox(height: 30),
                _buildSettlementLifecycle(),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _bankInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Row(
        children: [
          Icon(icon, size: 10, color: const Color(0xFF64748B)),
          const SizedBox(width: 4),
          Expanded(child: Text(text, style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF334155)))),
        ],
      ),
    );
  }

  Widget _buildJourneyHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(Icons.history_rounded, 'Journey Status History'),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
          ),
          child: Column(
            children: _trip!.lifecycleEvents.map((event) {
              final e = _safe(event);
              final isLast = _trip!.lifecycleEvents.indexOf(event) == _trip!.lifecycleEvents.length - 1;
              final Color statusColor = e['status']?.toString().toLowerCase() == 'completed' ? const Color(0xFF10B981) : const Color(0xFF3B82F6);
              
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2), boxShadow: [BoxShadow(color: statusColor.withOpacity(0.3), blurRadius: 4)]),
                        ),
                        if (!isLast)
                          Expanded(
                            child: Container(width: 2, color: const Color(0xFFF1F5F9), margin: const EdgeInsets.symmetric(vertical: 4)),
                          ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(e['title'] ?? 'Update', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                                Text(e['date'] ?? '', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8))),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(e['description'] ?? '', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B), fontWeight: FontWeight.w500)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildCoreDetails() {
    // PERSONNEL LOGIC matching web app precisely
    String composition = _trip?.composition ?? 'Solo';
    if (composition.toLowerCase().contains('alone') || composition.toLowerCase() == 'solo') {
      composition = 'Alone Travel';
    } else if (composition.toLowerCase().contains('team')) {
      composition = 'Team Travel';
    }

    String leaderName = _trip?.employee ?? 'Employee';
    if (leaderName == 'Employee' && (_trip?.tripLeader?.isNotEmpty ?? false)) {
      leaderName = _trip!.tripLeader!;
    }

    final designation = _trip?.leaderDesignation ?? 'Staff';
    final empId = _trip?.leaderEmployeeId ?? '00000';
    String roleInfo = '$designation ($empId)';

    Widget personnelContent = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          composition,
          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), height: 1.2),
        ),
        const SizedBox(height: 3),
        Text(
          'Leader: $leaderName',
          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF475569), height: 1.2),
        ),
        if (roleInfo.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Text(
              roleInfo,
              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: const Color(0xFF94A3B8), height: 1.2),
            ),
          ),
        if (_trip?.reportingManagerName != null && _trip!.reportingManagerName!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Text(
              'Manager: ${_trip!.reportingManagerName}',
              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B), height: 1.2),
            ),
          ),
        if (_trip?.userBankName != null && _trip!.userBankName!.isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _bankInfoRow(Icons.account_balance_rounded, _trip!.userBankName!),
                if (_trip?.userAccountNo != null) _bankInfoRow(Icons.numbers_rounded, _trip!.userAccountNo!),
              ],
            ),
          ),
        ],
      ],
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(Icons.grid_view_rounded, 'Trip Core Details'),
        const SizedBox(height: 18),
        Column(
          children: [
            // Row 1: Route and Timeline
            Row(
              children: [
                Expanded(
                  child: _detailTile(
                    Icons.location_on_rounded,
                    'ROUTE',
                    content: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_trip?.source} → ${_trip?.destination}',
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B), height: 1.2),
                        ),
                        if (_trip?.enRoute?.isNotEmpty ?? false)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              'via ${_trip!.enRoute}',
                              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: const Color(0xFF94A3B8), height: 1.2),
                            ),
                          ),
                      ],
                    ),
                    iconColor: Colors.orange,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _detailTile(Icons.calendar_today_rounded, 'TIMELINE', value: _trip?.dates ?? '', iconColor: Colors.blue),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Row 2: Personnel and Project
            Row(
              children: [
                Expanded(
                  child: _detailTile(Icons.person_rounded, 'PERSONNEL', content: personnelContent, iconColor: Colors.purpleAccent),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _detailTile(Icons.verified_user_rounded, 'PROJECT', value: _trip?.projectCode ?? 'General Activity', iconColor: Colors.green),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Row 3: Purpose
            Row(
              children: [
                Expanded(
                  child: _detailTile(Icons.business_center_rounded, 'PURPOSE', value: _trip?.purpose ?? '', iconColor: Colors.pinkAccent),
                ),
                const SizedBox(width: 16),
                Expanded(child: Container()), // Spacer to maintain 2-column layout
              ],
            ),
            // Row 4: Vehicle Type (conditional)
            if (['2 Wheeler', '3 Wheeler', '4 Wheeler'].contains(_travelMode)) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildEditableVehicleTypeTile(),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: Container()), // Spacer to maintain 2-column layout
                ],
              ),
            ],
          ],
        ),
      ],
    );
  }

  Map<String, dynamic> _safe(dynamic item) {
    if (item == null) return {};
    if (item is Map) return Map<String, dynamic>.from(item);
    if (item is String) {
      try {
        return jsonDecode(item) as Map<String, dynamic>;
      } catch (_) {
        return {};
      }
    }
    return {};
  }

  Widget _buildTeamSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(Icons.groups_rounded, 'Team Personnel'),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
          ),
          child: Column(
            children: _trip!.members.map((rawM) {
              final m = _safe(rawM);
              final isLast = _trip!.members.indexOf(rawM) == _trip!.members.length - 1;
              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: const Color(0xFFF8FAFC),
                          child: Text(
                            (m['name'] ?? m['username'] ?? '?')[0].toUpperCase(),
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m['name'] ?? m['username'] ?? 'N/A', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                              Text(m['designation'] ?? m['role'] ?? 'Staff', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                          child: Text(m['employee_id'] ?? 'ID', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF64748B))),
                        ),
                      ],
                    ),
                  ),
                  if (!isLast) const Divider(height: 1, color: Color(0xFFF1F5F9)),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildAccommodationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(Icons.hotel_rounded, 'Accommodation Logistics'),
        const SizedBox(height: 18),
        ..._trip!.accommodationRequests!.map((rawAcc) {
          final acc = _safe(rawAcc);
          final bool isGH = acc['type']?.toString().toLowerCase() == 'guest house';
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isGH ? const Color(0xFFF0FDFA) : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: isGH ? const Color(0xFFCCFBF1) : const Color(0xFFF1F5F9)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(isGH ? Icons.house_rounded : Icons.hotel_rounded, size: 18, color: isGH ? const Color(0xFF0D9488) : const Color(0xFF3B82F6)),
                        const SizedBox(width: 10),
                        Text(
                          isGH ? 'GUEST HOUSE' : 'HOTEL BOOKING',
                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: isGH ? const Color(0xFF0D9488) : const Color(0xFF3B82F6), letterSpacing: 0.5),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
                      child: Text(acc['status']?.toString().toUpperCase() ?? 'PENDING', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.blueGrey)),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  acc['hotel_name'] ?? acc['location'] ?? 'Location Specified',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                Text(
                  '${acc['check_in_date'] ?? 'N/A'} to ${acc['check_out_date'] ?? 'N/A'}',
                  style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
                ),
                if (acc['description']?.toString().isNotEmpty ?? false) ...[
                  const SizedBox(height: 12),
                  Text(
                    acc['description']?.toString() ?? '',
                    style: GoogleFonts.inter(fontSize: 11, color: Colors.black45, fontWeight: FontWeight.w500),
                  ),
                ],
              ],
            ),
          );
        }).toList(),
      ],
    );
  }

  Widget _detailTile(IconData icon, String label, {String? value, Widget? content, required Color iconColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: iconColor),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8), letterSpacing: 0.5),
                ),
                const SizedBox(height: 4),
                content ?? Text(
                  value ?? '',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B), height: 1.2),
                  softWrap: true,
                  maxLines: 3,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEditableVehicleTypeTile() {
    return GestureDetector(
      onTap: () => _showTravelDetailsModal(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF1F5F9)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 4))],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(Icons.two_wheeler_rounded, size: 20, color: Colors.indigo),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('VEHICLE OWNERSHIP', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8), letterSpacing: 0.5)),
                  const SizedBox(height: 4),
                  Text(
                    _vehicleType == 'Own' ? 'Own Vehicle' : 
                    _vehicleType == 'Rental' ? 'Rental Bike' :
                    _vehicleType == 'Company' ? 'Company Self Drive' : 'Service / Outsourced',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF1E293B), height: 1.2),
                    softWrap: true,
                    maxLines: 2,
                  ),
                ],
              ),
            ),
            Icon(Icons.edit_rounded, size: 18, color: const Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  void _showTravelDetailsModal() {
    String tempTravelMode = _travelMode;
    String tempVehicleType = _vehicleType;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (mContext) => StatefulBuilder(
        builder: (context, setModalState) => GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(
            color: Colors.transparent,
            child: GestureDetector(
              onTap: () {},
              child: SingleChildScrollView(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
                  ),
                  padding: EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 24,
                    bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Travel Preferences',
                            style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 24),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      // Travel Mode Dropdown
                      Text('Travel Mode *', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                      const SizedBox(height: 10),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: tempTravelMode,
                            items: ['Airways', 'Train', 'Bus', '2 Wheeler', '3 Wheeler', '4 Wheeler']
                                .map((item) => DropdownMenuItem<String>(
                                  value: item,
                                  child: Text(item, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A))),
                                ))
                                .toList(),
                            onChanged: (value) {
                              if (value != null) {
                                setModalState(() {
                                  tempTravelMode = value;
                                  // Auto-reset vehicle type if not applicable
                                  if (!['2 Wheeler', '3 Wheeler', '4 Wheeler'].contains(tempTravelMode)) {
                                    tempVehicleType = 'Own';
                                  }
                                });
                              }
                            },
                            dropdownColor: Colors.white,
                            iconSize: 20,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Vehicle Ownership Dropdown (Conditional)
                      if (['2 Wheeler', '3 Wheeler', '4 Wheeler'].contains(tempTravelMode)) ...[
                        Text('Vehicle Ownership *', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                      const SizedBox(height: 10),
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: (tempVehicleType == 'Own' || tempVehicleType == 'Own Vehicle') 
                                ? 'Own Vehicle' 
                                : tempVehicleType == 'Rental' 
                                    ? 'Rental' 
                                    : tempVehicleType == 'Company' || tempVehicleType == 'Company Self Drive'
                                        ? 'Company Self Drive'
                                        : 'Service / Outsourced',
                            items: (() {
                              List<String> items = ['Own Vehicle'];
                              if (tempTravelMode.toLowerCase().contains('bike') || tempTravelMode.toLowerCase().contains('2 wheeler') || tempTravelMode.toLowerCase().contains('3 wheeler')) {
                                items.add('Rental');
                              } else if (tempTravelMode.toLowerCase().contains('car') || tempTravelMode.toLowerCase().contains('4 wheeler')) {
                                items.add('Company Self Drive');
                              }
                              items.add('Service / Outsourced');
                              return items;
                            })().map((item) => DropdownMenuItem<String>(
                                  value: item,
                                  child: Text(item, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A))),
                                ))
                                .toList(),
                            onChanged: (value) {
                              if (value != null) {
                                setModalState(() {
                                  if (value == 'Own Vehicle') tempVehicleType = 'Own';
                                  else if (value == 'Rental') tempVehicleType = 'Rental';
                                  else if (value == 'Company Self Drive') tempVehicleType = 'Company';
                                  else tempVehicleType = 'Service';
                                });
                              }
                            },
                            dropdownColor: Colors.white,
                            iconSize: 20,
                            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                          ),
                        ),
                      ),
                        const SizedBox(height: 20),
                      ],
                      // Action Buttons
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.pop(context),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              child: Text('Cancel', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: const Color(0xFF64748B))),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _isActionLoading
                                  ? null
                                  : () {
                                      setState(() {
                                        _travelMode = tempTravelMode;
                                        _vehicleType = tempVehicleType;
                                      });
                                      Navigator.pop(context);
                                      _updateTravelDetails();
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0F172A),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: Text(
                                _isActionLoading ? 'Saving...' : 'Save Changes',
                                style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOdometerSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(Icons.speed_rounded, 'Odometer Reading'),
        const SizedBox(height: 18),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF1F5F9)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8)],
          ),
          child: _isEditingOdometer
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Start Odometer Reading
                    Text(
                      'START ODOMETER (KM)',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF64748B), letterSpacing: 0.3),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _startOdometerController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'e.g., 50000',
                        prefixIcon: const Icon(Icons.speed_rounded, color: Colors.orange),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.orange, width: 2)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Start Odometer Image
                    GestureDetector(
                      onTap: () => _pickOdometerImage(true),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            if (_startOdometerImage != null)
                              Container(
                                width: 60,
                                height: 60,
                                decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
                                child: Image.file(_startOdometerImage!, fit: BoxFit.cover),
                              )
                            else
                              const Icon(Icons.camera_alt_rounded, color: Colors.orange, size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Start Odometer Photo',
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _startOdometerImage != null ? 'Photo captured' : 'Tap to capture photo',
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.orange),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // End Odometer Reading
                    Text(
                      'END ODOMETER (KM)',
                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF64748B), letterSpacing: 0.3),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _endOdometerController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'e.g., 50150',
                        prefixIcon: const Icon(Icons.stop_rounded, color: Colors.teal),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.teal, width: 2)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // End Odometer Image
                    GestureDetector(
                      onTap: () => _pickOdometerImage(false),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDFA),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.teal.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            if (_endOdometerImage != null)
                              Container(
                                width: 60,
                                height: 60,
                                decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
                                child: Image.file(_endOdometerImage!, fit: BoxFit.cover),
                              )
                            else
                              const Icon(Icons.camera_alt_rounded, color: Colors.teal, size: 28),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'End Odometer Photo',
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _endOdometerImage != null ? 'Photo captured' : 'Tap to capture photo',
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.teal),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isSavingOdometer
                                ? null
                                : () => setState(() {
                                      _isEditingOdometer = false;
                                      _startOdometerImage = null;
                                      _endOdometerImage = null;
                                      _startOdometerController.clear();
                                      _endOdometerController.clear();
                                    }),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF1F5F9),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: Text(
                              'Cancel',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: const Color(0xFF64748B)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isSavingOdometer ? null : _updateOdometerWithImages,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              disabledBackgroundColor: Colors.grey,
                            ),
                            child: Text(
                              _isSavingOdometer ? 'Saving...' : 'Save Readings',
                              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF7ED),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.orange.withOpacity(0.2)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('START', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.orange, letterSpacing: 0.5)),
                                const SizedBox(height: 8),
                                Text(
                                  _trip?.odometer?['start_odo_reading'] != null
                                      ? '${_trip!.odometer!['start_odo_reading']} KM'
                                      : '-',
                                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDFA),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.teal.withOpacity(0.2)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('END', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.teal, letterSpacing: 0.5)),
                                const SizedBox(height: 8),
                                Text(
                                  _trip?.odometer?['end_odo_reading'] != null
                                      ? '${_trip!.odometer!['end_odo_reading']} KM'
                                      : '-',
                                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Distance Card
                    if (_trip?.odometer?['start_odo_reading'] != null && _trip?.odometer?['end_odo_reading'] != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.withOpacity(0.2)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('DISTANCE', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.green, letterSpacing: 0.5)),
                            const SizedBox(height: 8),
                            Text(
                              '${(_trip!.odometer!['end_odo_reading'] - _trip!.odometer!['start_odo_reading']).toString()} KM',
                              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => setState(() => _isEditingOdometer = true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C1D1D),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        minimumSize: const Size(double.infinity, 0),
                      ),
                      child: Text(
                        'Update Readings',
                        style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.white),
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildFinancialSummary() {
    final status = _trip?.status.toLowerCase() ?? '';
    final canRequestTopUp = ['approved', 'hr approved', 'on-going'].contains(status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _sectionHeader(Icons.currency_rupee_rounded, 'Financial Summary'),
            if (canRequestTopUp)
              TextButton.icon(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => TripWalletSheet(trip: _trip!, onUpdate: _fetchTripStory),
                  );
                },
                icon: const Icon(Icons.add_rounded, size: 14, color: Color(0xFF7C1D1D)),
                label: Text('Top-up / Advance', style: GoogleFonts.inter(color: const Color(0xFF7C1D1D), fontSize: 11, fontWeight: FontWeight.w900)),
              ),
          ],
        ),
        const SizedBox(height: 16),
        _finRow('Approved Advance', _formatCurrency(_trip?.totalApprovedAdvance), 'Funds disbursed by HQ', const Color(0xFFF1F5F9), const Color(0xFF0F172A), Icons.credit_card_rounded),
        const SizedBox(height: 12),
        _finRow('Recorded Expenses', _formatCurrency(_trip?.totalExpenses), 'On-field spending', const Color(0xFFFFF7ED), Colors.orange, Icons.trending_up_rounded),
        const SizedBox(height: 12),
        _finRow('Wallet Balance', _formatCurrency(_trip?.walletBalance), 'Current liquidity', const Color(0xFFF0FDF4), const Color(0xFF10B981), Icons.layers_rounded),
      ],
    );
  }

  Widget _finRow(String label, String value, String desc, Color bgColor, Color accent, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: accent.withOpacity(0.15), width: 1.5),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.white, bgColor.withOpacity(0.5)],
        ),
        boxShadow: [
          BoxShadow(color: accent.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5)],
            ),
            child: Icon(icon, size: 24, color: accent),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF64748B), letterSpacing: 0.5)),
                const SizedBox(height: 2),
                Text(desc, style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                value,
                style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, color: accent),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseRegistry() {
    final bool isApprover = (_currentUser?['id']?.toString() == _trip?.currentApprover?.toString() ||
                             (_trip?.claim != null && _currentUser?['id']?.toString() == _trip?.claim!['current_approver']?.toString()));

    if (isApprover) {
      return _buildAuditRegistry(isApprover);
    }

    final claimStatus = _trip?.claim?['status'] ?? 'Draft';
    final isLocked = !['Draft', 'Rejected'].contains(claimStatus);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _sectionHeader(Icons.description_rounded, 'Detailed Expense Registry'),
            if (!isLocked)
              TextButton.icon(
                onPressed: () {
                   showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => TripWalletSheet(
                      trip: _trip!, 
                      onUpdate: _fetchTripStory,
                      initialView: 'add_expense',
                    ),
                  );
                },
                icon: const Icon(Icons.add_rounded, size: 16, color: Color(0xFF7C1D1D)),
                label: Text('Add Expense', style: GoogleFonts.inter(color: const Color(0xFF7C1D1D), fontWeight: FontWeight.w800, fontSize: 12)),
              ),
          ],
        ),
        const SizedBox(height: 16),
        _buildCategorizedList(),
        if (!isLocked) ...[
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  backgroundColor: Colors.transparent,
                  builder: (_) => ClaimSheet(trip: _trip!, onUpdate: _fetchTripStory),
                );
              },
              icon: const Icon(Icons.send_rounded, size: 18, color: Colors.white),
              label: Text('Submit Full Claim', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C1D1D),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ],
    );
  }


  Widget _buildCategorizedList() {
    final expenses = _trip?.expenses ?? [];
    
    if (expenses.isEmpty) {
      return _emptyBox('No expense entries recorded yet.');
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: expenses.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, idx) {
        return _buildExpenseItem(Map<String, dynamic>.from(expenses[idx]), false);
      },
    );
  }

  Widget _buildAuditRegistry(bool isApprover) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _sectionHeader(Icons.description_rounded, 'Audit Master Registry'),
            Row(
              children: [
                TextButton(
                  onPressed: () => _handleAuditAction('Reject'),
                  child: Text('Reject All', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w800, fontSize: 12)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () => _handleAuditAction('Approve'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0)),
                  child: Text('Final Approve', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        _buildAuditSummaryStrip(),
        const SizedBox(height: 16),
        if (_trip?.expenses?.isEmpty ?? true)
          _emptyBox('No expenses submitted for audit.')
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _trip?.expenses?.length ?? 0,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (ctx, idx) {
              final exp = _trip!.expenses![idx];
              return _buildExpenseItem(exp, isApprover);
            },
          ),
      ],
    );
  }

  Widget _buildAuditSummaryStrip() {
    final total = _trip!.expenses!.fold<double>(0, (sum, e) => sum + (double.tryParse(e['amount'].toString()) ?? 0));
    final approved = _trip!.expenses!.where((e) => e['status'] != 'Rejected').fold<double>(0, (sum, e) => sum + (double.tryParse(e['amount'].toString()) ?? 0));
    final rejected = _trip!.expenses!.where((e) => e['status'] == 'Rejected').fold<double>(0, (sum, e) => sum + (double.tryParse(e['amount'].toString()) ?? 0));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(16)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _sumItem('Total Claimed', _formatCurrency(total), Colors.white),
          _sumItem('Approved (Net)', _formatCurrency(approved), const Color(0xFF10B981)),
          _sumItem('Rejected', _formatCurrency(rejected), const Color(0xFFEF4444)),
        ],
      ),
    );
  }

  Widget _sumItem(String label, String val, Color color) {
    return Column(
      children: [
        Text(label.toUpperCase(), style: GoogleFonts.inter(color: Colors.white38, fontSize: 8, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(val, style: GoogleFonts.inter(color: color, fontSize: 13, fontWeight: FontWeight.w900)),
      ],
    );
  }

  Future<void> _deleteExpense(String id) async {
    if (_isActionLoading) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Expense', style: GoogleFonts.inter(fontWeight: FontWeight.w900)),
        content: const Text('Are you sure you want to delete this expense entry?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel', style: TextStyle(color: Colors.grey))),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            child: const Text('Delete', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isActionLoading = true);
    try {
      await _tripService.deleteExpense(id);
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense deleted successfully'), backgroundColor: Colors.green)
        );
        _fetchTripStory();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to delete: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  Widget _buildExpenseItem(Map<String, dynamic> exp, bool isAudit) {
    final role = _currentUser?['role']?.toString().toLowerCase() ?? '';
    final String currentRemarks = _auditRemarks[exp['id'].toString()] ?? '';
    final claimStatus = _trip?.claim?['status'] ?? 'Draft';
    final isLocked = !['Draft', 'Rejected'].contains(claimStatus);
    
    bool isCompleted = false;
    bool isOdoForm = false;
    try {
      if (exp['description'] != null) {
        final Map<String, dynamic> detail = jsonDecode(exp['description']);
        isCompleted = detail['isCompleted'] ?? false;
        
        final cat = exp['category']?.toString();
        if (cat == 'Fuel' || cat == 'Local') {
           isOdoForm = ['Own Car', 'Company Car', 'Self Drive Rental', 'Own Bike', 'Rental Bike'].contains(detail['subType']);
        }
      }
    } catch(_) {}

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: exp['status'] == 'Rejected' ? const Color(0xFFFEF2F2) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: exp['status'] == 'Rejected' ? const Color(0xFFFECACA) : const Color(0xFFF1F5F9)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                child: Icon(_getIconForCategory(exp['category']), size: 20, color: const Color(0xFF64748B)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_mapCategoryToLabel(exp['category']), style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
                        Row(
                          children: [
                            if (!isLocked && !isAudit && !isCompleted && isOdoForm)
                              IconButton(
                                onPressed: () {
                                  showModalBottomSheet(
                                    context: context,
                                    isScrollControlled: true,
                                    backgroundColor: Colors.transparent,
                                    builder: (_) => TripWalletSheet(
                                      trip: _trip!,
                                      onUpdate: _fetchTripStory,
                                      initialExpense: exp,
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.edit_note_rounded, size: 20, color: Color(0xFF3B82F6)),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            if (!isLocked && !isAudit) ...[
                              const SizedBox(width: 8),
                              IconButton(
                                onPressed: () => _deleteExpense(exp['id'].toString()),
                                icon: const Icon(Icons.delete_outline_rounded, size: 20, color: Colors.redAccent),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                              ),
                            ],
                            if (!isLocked && !isAudit) const SizedBox(width: 8),
                            Text(_formatCurrency(exp['amount']), style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF7C1D1D))),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_rounded, size: 10, color: Colors.black26),
                        const SizedBox(width: 4),
                        Text(exp['date'] ?? '', style: GoogleFonts.inter(fontSize: 11, color: Colors.black26, fontWeight: FontWeight.w700)),
                        if (exp['receipt_image'] != null) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.attachment_rounded, size: 12, color: Color(0xFF10B981)),
                          const SizedBox(width: 2),
                          Text('Receipt Attached', style: GoogleFonts.inter(fontSize: 10, color: const Color(0xFF10B981), fontWeight: FontWeight.w800)),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildRichDescription(exp['description']),
          if (isAudit) ...[
            const SizedBox(height: 16),
            TextField(
              onChanged: (v) => _auditRemarks[exp['id'].toString()] = v,
              controller: TextEditingController(text: currentRemarks)..selection = TextSelection.fromPosition(TextPosition(offset: currentRemarks.length)),
              decoration: InputDecoration(
                hintText: 'Add remarks for ${role.toUpperCase()}...',
                hintStyle: GoogleFonts.inter(fontSize: 12, color: Colors.black26),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              style: GoogleFonts.inter(fontSize: 12),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _handleItemAction(exp['id'], 'Rejected'),
                  icon: const Icon(Icons.close_rounded, size: 16, color: Colors.red),
                  label: Text('Reject Item', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w800, fontSize: 12)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () => _handleItemAction(exp['id'], 'Approved'),
                  icon: const Icon(Icons.check_rounded, size: 16, color: Colors.white),
                  label: Text('Approve Item', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), padding: const EdgeInsets.symmetric(horizontal: 12)),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 12),
            if (exp['rm_remarks']?.isNotEmpty ?? false) _remarkBox('RM', exp['rm_remarks']),
            if (exp['hr_remarks']?.isNotEmpty ?? false) _remarkBox('HR', exp['hr_remarks']),
            if (exp['finance_remarks']?.isNotEmpty ?? false) _remarkBox('Finance', exp['finance_remarks']),
          ],
        ],
      ),
    );
  }

  Widget _remarkBox(String role, String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4)),
            child: Text(role.toUpperCase(), style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w900, color: const Color(0xFF64748B))),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: Colors.black38, fontWeight: FontWeight.w600, fontStyle: FontStyle.italic))),
        ],
      ),
    );
  }




  Widget _buildSettlementLifecycle() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionHeader(Icons.check_circle_outline_rounded, 'Settlement & Payout Lifecycle'),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFFF1F5F9)),
          ),
          child: Column(
            children: [
              _settleItem('Claim Status', _trip?.claimStatus ?? 'No Claim Filed', isBadge: true),
              const Divider(height: 24),
              _settleItem('Transferred By', _trip?.claim?['processed_by']?['name'] ?? 'Waiting'),
              const Divider(height: 24),
              _settleItem('Transaction ID', _trip?.claim?['transaction_id'] ?? 'N/A', isMono: true),
              const Divider(height: 24),
              _settleItem('Payout Date', _trip?.claim?['payment_date'] != null ? DateFormat('dd MMM, yyyy').format(DateTime.parse(_trip!.claim!['payment_date'])) : 'N/A'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _settleItem(String label, String value, {bool isBadge = false, bool isMono = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.black38)),
        if (isBadge)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: value.toLowerCase() == 'approved' ? const Color(0xFFF0FDF4) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(value, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w900, color: value.toLowerCase() == 'approved' ? const Color(0xFF10B981) : Colors.black45)),
          )
        else
          Text(value, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A), letterSpacing: isMono ? 0.5 : 0)),
      ],
    );
  }

  Widget _sectionHeader(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF64748B)),
        const SizedBox(width: 8),
        Text(title, style: GoogleFonts.interTight(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
      ],
    );
  }

  Widget _emptyBox(String msg) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFF1F5F9))),
      child: Center(child: Text(msg, style: GoogleFonts.inter(color: Colors.black26, fontSize: 13, fontWeight: FontWeight.w600))),
    );
  }

  IconData _getIconForCategory(String? cat) {
    switch (cat?.toLowerCase()) {
      case 'travel': return Icons.flight_rounded;
      case 'accommodation': return Icons.hotel_rounded;
      case 'food': return Icons.restaurant_rounded;
      case 'local': return Icons.directions_car_rounded;
      default: return Icons.receipt_long_rounded;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved': return const Color(0xFF10B981);
      case 'completed': return const Color(0xFF3B82F6);
      case 'on-going': return const Color(0xFFF59E0B);
      case 'rejected': return const Color(0xFFEF4444);
      default: return const Color(0xFF64748B);
    }
  }

  String _mapCategoryToLabel(String cat) {
    switch (cat.toLowerCase()) {
      case 'others':
      case 'travel':
        return 'Travel';
      case 'fuel':
      case 'local':
        return 'Local Travel';
      case 'food':
        return 'Food';
      case 'accommodation':
      case 'stay':
        return 'Stay';
      default:
        return cat;
    }
  }

  Future<void> _pickOdometerImage(bool isStart) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );
      
      if (image != null) {
        setState(() {
          if (isStart) {
            _startOdometerImage = File(image.path);
          } else {
            _endOdometerImage = File(image.path);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error picking image: $e')));
      }
    }
  }

  Future<void> _updateOdometerWithImages() async {
    if (_startOdometerController.text.isEmpty || _endOdometerController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter both odometer readings')));
      return;
    }

    if (_startOdometerImage == null || _endOdometerImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please capture both odometer images')));
      return;
    }

    final startValue = int.tryParse(_startOdometerController.text);
    final endValue = int.tryParse(_endOdometerController.text);
    
    if (startValue == null || endValue == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter valid numbers')));
      return;
    }

    if (endValue < startValue) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('End odometer must be greater than start')));
      return;
    }

    setState(() => _isSavingOdometer = true);
    try {
      // Create multipart request for image upload
      final request = http.MultipartRequest(
        'PATCH',
        Uri.parse('${ApiConstants.baseUrl}/api/trips/${widget.tripId}/'),
      );

      // Add token
      final user = _apiService.getUser();
      if (user?['auth_token'] != null) {
        request.headers['Authorization'] = 'Token ${user!['auth_token']}';
      }

      // Add odometer data
      request.fields['odometer[start_odo_reading]'] = startValue.toString();
      request.fields['odometer[end_odo_reading]'] = endValue.toString();

      // Add image files
      request.files.add(
        await http.MultipartFile.fromPath(
          'odometer[start_image]',
          _startOdometerImage!.path,
        ),
      );
      request.files.add(
        await http.MultipartFile.fromPath(
          'odometer[end_image]',
          _endOdometerImage!.path,
        ),
      );

      final response = await request.send();

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Trigger safety notification for the trip mode
        ExpenseReminderService.showSafetyNotification(_trip?.travelMode ?? _travelMode)
            .catchError((e) => debugPrint('Error sending safety notification: $e'));

        setState(() {
          _isEditingOdometer = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Odometer recorded successfully')));
        }
        _fetchTripStory();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${response.statusCode}')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _isSavingOdometer = false);
    }
  }

  bool _shouldShowOdometerSection() {
    final mode = (_trip?.travelMode ?? _travelMode).toString().toLowerCase();
    final vtype = (_trip?.vehicleType ?? _vehicleType).toString().toLowerCase();

    // Bikes: Own or Rental
    if (mode.contains('bike') || mode.contains('2 wheeler') || mode.contains('3 wheeler')) {
      return (vtype == 'own' || vtype.contains('rental'));
    }

    // Cars: Own or Company Self Drive
    if (mode.contains('car') || mode.contains('cab') || mode.contains('4 wheeler')) {
      return (vtype == 'own' || vtype.contains('company') || vtype.contains('self'));
    }

    return false;
  }
}

