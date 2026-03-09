import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DocumentsScreen extends StatefulWidget {
  const DocumentsScreen({super.key});

  @override
  State<DocumentsScreen> createState() => _DocumentsScreenState();
}

class _DocumentsScreenState extends State<DocumentsScreen> {
  final ImagePicker _picker = ImagePicker();
  bool _isSaving = false;

  Map<String, dynamic> _docs = {
    'aadharId': {'val': '', 'file': null, 'fileName': ''},
    'companyId': {'val': '', 'file': null, 'fileName': ''},
    'drivingLicense': {'val': '', 'file': null, 'fileName': ''},
    'pan': {'val': '', 'file': null, 'fileName': ''},
    'passport': {'val': '', 'file': null, 'fileName': ''},
    'gstNo': {'val': '', 'file': null, 'fileName': ''},
    'travelTickets': {'val': '', 'file': null, 'fileName': ''},
    'accommodationDocs': {'val': '', 'file': null, 'fileName': ''}
  };

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    final prefs = await SharedPreferences.getInstance();
    final savedDocs = prefs.getString('user_documents');
    if (savedDocs != null) {
      try {
        final Map<String, dynamic> parsed = jsonDecode(savedDocs);
        setState(() {
          parsed.forEach((key, value) {
            if (_docs.containsKey(key)) {
              _docs[key] = Map<String, dynamic>.from(value);
            }
          });
        });
      } catch (e) {
        debugPrint("Failed to load documents: $e");
      }
    }
  }

  Future<void> _saveDocuments() async {
    setState(() => _isSaving = true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_documents', jsonEncode(_docs));
    
    // Simulate sync
    await Future.delayed(const Duration(milliseconds: 1500));
    
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            "Document repository synchronized successfully!",
            style: GoogleFonts.inter(fontWeight: FontWeight.w600),
          ),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _pickFile(String key) async {
    final XFile? file = await _picker.pickImage(source: ImageSource.gallery);
    if (file != null) {
      final bytes = await file.readAsBytes();
      final base64File = base64Encode(bytes);
      setState(() {
        _docs[key]['file'] = "data:image/png;base64,$base64File";
        _docs[key]['fileName'] = file.name;
      });
    }
  }

  void _removeFile(String key) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Remove Document', style: GoogleFonts.interTight(fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to remove this document scan? This action cannot be undone.', style: GoogleFonts.inter()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: GoogleFonts.inter(color: Colors.grey, fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _docs[key] = {
                  ..._docs[key],
                  'file': null,
                  'fileName': '',
                };
              });
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Document removed from local cache', style: GoogleFonts.inter()),
                  backgroundColor: const Color(0xFF1E293B),
                  behavior: SnackBarBehavior.floating,
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            child: Text('Remove', style: GoogleFonts.inter(color: const Color(0xFFE11D48), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6), // Dashboard background
      body: Stack(
        children: [
          // Ultra-soft mesh blobs
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
            bottom: 50,
            left: -100,
            child: Container(
              width: 350,
              height: 350,
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
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSection(
                        title: "Mandatory Identification",
                        icon: Icons.shield_outlined,
                        iconColor: const Color(0xFF10B981),
                        children: [
                          _buildDocCard("aadharId", "Aadhar ID", Icons.credit_card_rounded, "12-digit UIDAI Number", true),
                          _buildDocCard("companyId", "Company ID Card", Icons.badge_outlined, "Employee Code", true),
                        ],
                      ),
                      
                      _buildSection(
                        title: "Additional Travel Documents",
                        icon: Icons.description_outlined,
                        iconColor: const Color(0xFF3B82F6),
                        children: [
                          _buildDocCard("drivingLicense", "Driving License", Icons.directions_car_filled_outlined, "License Number", false),
                          _buildDocCard("pan", "PAN Card", Icons.credit_card_rounded, "Alphanumeric PAN", false),
                          _buildDocCard("passport", "Passport", Icons.public_rounded, "Passport Number", false),
                        ],
                      ),
                      
                      _buildSection(
                        title: "Journey & Stay Logistics",
                        icon: Icons.confirmation_number_outlined,
                        iconColor: const Color(0xFF8B5CF6),
                        children: [
                          _buildDocCard("travelTickets", "Travel Tickets", Icons.local_activity_outlined, "Flight/Train PNR or Ref", false),
                          _buildDocCard("accommodationDocs", "Accommodation Vouchers", Icons.hotel_outlined, "Hotel Booking ID", false),
                        ],
                      ),
                      
                      _buildSection(
                        title: "Tax & Compliance",
                        icon: Icons.business_outlined,
                        iconColor: const Color(0xFFF59E0B),
                        children: [
                          _buildDocCard("gstNo", "Personal GSTIN", Icons.business_outlined, "GST Identification Number", false),
                        ],
                      ),
                      
                      const SizedBox(height: 12),
                      _buildFooterNotice(),
                    ],
                  ),
                ),
              ),
            ],
          ),
          
          if (_isSaving)
            Container(
              color: Colors.black.withOpacity(0.1),
              child: const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633))),
            ),
        ],
      ),
      bottomNavigationBar: _buildBottomAction(),
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
                    child: const Icon(Icons.public_rounded, color: Color(0xFFBB0633), size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'GOVERNANCE HUB',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: Colors.white.withOpacity(0.7),
                            letterSpacing: 1.2,
                          ),
                        ),
                        Text(
                          'Document Organizer',
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
                  IconButton(
                    onPressed: _isSaving ? null : _saveDocuments,
                    icon: Icon(Icons.sync_rounded, color: Colors.white.withOpacity(0.8), size: 24),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction() {
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
        onTap: _isSaving ? null : _saveDocuments,
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
            child: _isSaving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(
                    'SAVE & SYNC REPOSITORY',
                    style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 13, letterSpacing: 0.5),
                  ),
          ),
        ),
      ),
    );
  }


  Widget _buildSection({required String title, required IconData icon, required Color iconColor, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 32, 4, 16),
          child: Row(
            children: [
              Icon(icon, size: 16, color: iconColor),
              const SizedBox(width: 10),
              Text(
                title.toUpperCase(),
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
        ),
        ...children,
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildDocCard(String id, String label, IconData icon, String placeholder, bool isMandatory) {
    final doc = _docs[id];
    final bool hasFile = doc['file'] != null;
    final Color statusColor = hasFile ? Colors.green : (isMandatory ? const Color(0xFF10B981) : const Color(0xFF3B82F6));
    final Color bgColor = hasFile ? const Color(0xFFF0FDF4) : (isMandatory ? const Color(0xFFECFDF5) : const Color(0xFFF0F9FF));
    final Color accentColor = isMandatory ? const Color(0xFF10B981) : const Color(0xFF3B82F6);

    final Color activeAccent = accentColor.withOpacity(0.8);

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: IntrinsicHeight(
          child: Row(
            children: [
              Container(width: 6, color: accentColor.withOpacity(0.4)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: accentColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Icon(icon, color: activeAccent, size: 22),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  label,
                                  style: GoogleFonts.plusJakartaSans(
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                    fontSize: 16,
                                  ),
                                ),
                                Text(
                                  doc['fileName'].toString().isNotEmpty ? doc['fileName'] : 'REPOSITORY STATUS',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF94A3B8),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _buildMiniStatus(hasFile, isMandatory, activeAccent),
                        ],
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        initialValue: doc['val'],
                        onChanged: (v) => setState(() => _docs[id]['val'] = v),
                        style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                        decoration: InputDecoration(
                          labelText: 'RECOGNISED ID NUMBER',
                          labelStyle: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF94A3B8), letterSpacing: 0.5),
                          hintText: placeholder,
                          hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, color: const Color(0xFFCBD5E1), fontWeight: FontWeight.w600),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 8),
                          enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey.withOpacity(0.1))),
                          focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFBB0633))),
                          floatingLabelBehavior: FloatingLabelBehavior.always,
                        ),
                      ),
                      const SizedBox(height: 20),
                      if (hasFile)
                        Row(
                          children: [
                            Expanded(child: _actionBtn('PREVIEW', Icons.remove_red_eye_outlined, const Color(0xFFF1F5F9), const Color(0xFF475569), () => _showPreview(doc['file'], label))),
                            const SizedBox(width: 12),
                            Expanded(child: _actionBtn('REMOVE', Icons.delete_outline_rounded, const Color(0xFFFFF1F2), const Color(0xFFE11D48), () => _removeFile(id))),
                          ],
                        )
                      else
                        _actionBtn(
                          'UPLOAD DOCUMENT SCAN', 
                          Icons.cloud_upload_outlined, 
                          const Color(0xFF0F172A).withOpacity(0.04), 
                          const Color(0xFF475569), 
                          () => _pickFile(id)
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMiniStatus(bool hasFile, bool isMandatory, Color color) {
    if (hasFile) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: Text('VERIFIED', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: const Color(0xFF10B981))),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
      child: Text(isMandatory ? 'REQUIRED' : 'OPTIONAL', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: color)),
    );
  }

  Widget _actionBtn(String label, IconData icon, Color bg, Color text, VoidCallback onTap) {
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: text),
              const SizedBox(width: 8),
              Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: text, letterSpacing: 0.5)),
            ],
          ),
        ),
      ),
    );
  }

  void _showPreview(String dataUrl, String title) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.all(20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: GoogleFonts.interTight(fontWeight: FontWeight.bold, fontSize: 18)),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close_rounded)),
                ],
              ),
            ),
            Flexible(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.memory(
                    base64Decode(dataUrl.split(',')[1]),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooterNotice() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF64748B).withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFF64748B)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Documents uploaded here are encrypted and used only for automated pre-filling of travel bookings (Flights, Hotels, Rentals).',
              style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
