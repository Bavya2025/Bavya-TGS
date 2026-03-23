import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import '../services/api_service.dart';
import '../constants/api_constants.dart';

class PolicyCenterScreen extends StatefulWidget {
  const PolicyCenterScreen({super.key});

  @override
  State<PolicyCenterScreen> createState() => _PolicyCenterScreenState();
}

class _PolicyCenterScreenState extends State<PolicyCenterScreen> {
  final ApiService _apiService = ApiService();
  String _selectedLanguage = 'English';
  final TextEditingController _searchController = TextEditingController();
  
  List<dynamic> _allPolicies = [];
  List<dynamic> _filteredPolicies = [];
  bool _isLoading = true;
  bool _isProcessing = false;
  String _searchTerm = '';

  final List<String> _categories = ['HR Policy', 'Travel Guide', 'General'];

  @override
  void initState() {
    super.initState();
    _fetchPolicies();
    _searchController.addListener(() {
      setState(() {
        _searchTerm = _searchController.text.toLowerCase();
        _applyFilters();
      });
    });
  }

  Future<void> _fetchPolicies() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get(ApiConstants.policies);
      
      List<dynamic> list = [];
      if (response is List) {
        list = response;
      } else if (response is Map) {
        list = response['results'] ?? response['value'] ?? [];
      }
      
      setState(() {
        _allPolicies = list;
        _isLoading = false;
        _applyFilters();
      });
    } catch (e) {
      debugPrint("Failed to fetch policies: $e");
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Failed to load policies")),
        );
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredPolicies = _allPolicies.where((p) {
        final title = (p['title'] ?? '').toString().toLowerCase();
        final matchesSearch = title.contains(_searchTerm);
        return matchesSearch;
      }).toList();
    });
  }

  String _getLanguageSuffix() {
    switch (_selectedLanguage) {
      case 'Telugu (తెలుగు)': return 'te';
      case 'Hindi (हिन्दी)': return 'hi';
      default: return 'en';
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _apiService.getUser();
    final isAdmin = (user?['role'] ?? '').toString().toLowerCase().contains('admin');

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      floatingActionButton: isAdmin ? FloatingActionButton.extended(
        onPressed: () => _showUploadModal(),
        backgroundColor: const Color(0xFF0F1E2A),
        elevation: 10,
        icon: const Icon(Icons.upload_file_rounded, color: Colors.white),
        label: Text('UPLOAD POLICY', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 12, letterSpacing: 1)),
      ) : null,
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633)))
        : Stack(
          children: [
            // Executive Mesh Blobs (Ultra-soft atmospheric layers)
            Positioned(
              top: 200,
              right: -100,
              child: Container(
                width: 400,
                height: 400,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [const Color(0xFFA9052E).withOpacity(0.03), Colors.transparent],
                  ),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Positioned(
              bottom: 100,
              left: -100,
              child: Container(
                width: 350,
                height: 350,
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [const Color(0xFF3B82F6).withOpacity(0.02), Colors.transparent],
                  ),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            
            RefreshIndicator(
              onRefresh: _fetchPolicies,
              color: const Color(0xFFBB0633),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildPremiumHeader(),
                    _buildSearchBox(),
                    _buildPolicyContent(isAdmin),
                    const SizedBox(height: 120),
                  ],
                ),
              ),
            ),
            if (_isProcessing)
              Container(
                color: Colors.black.withOpacity(0.1),
                child: const Center(child: CircularProgressIndicator(color: Color(0xFFBB0633))),
              ),
          ],
        ),
    );
  }

  Widget _buildLanguageSelector() {
    return PopupMenuButton<String>(
      onSelected: (val) => setState(() {
        _selectedLanguage = val;
        _applyFilters();
      }),
      offset: const Offset(0, 45),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15), 
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.translate_rounded, size: 16, color: Colors.white),
            const SizedBox(width: 8),
            Text(
              _selectedLanguage == 'English' ? 'EN' : (_selectedLanguage.contains('Telugu') ? 'TE' : 'HI'), 
              style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)
            ),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Colors.white),
          ],
        ),
      ),
      itemBuilder: (ctx) => [
        'English', 
        'Telugu (తెలుగు)', 
        'Hindi (हिन्दी)'
      ].map((l) => PopupMenuItem(
        value: l, 
        child: Row(
          children: [
            Icon(Icons.language_rounded, size: 18, color: l == _selectedLanguage ? const Color(0xFFBB0633) : const Color(0xFF64748B)),
            const SizedBox(width: 12),
            Text(l, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: l == _selectedLanguage ? FontWeight.w800 : FontWeight.w600, color: const Color(0xFF0F172A))),
          ],
        )
      )).toList(),
    );
  }

  Widget _buildPremiumHeader() {
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
        clipBehavior: Clip.none,
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Positioned(
            left: -30,
            bottom: -30,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                shape: BoxShape.circle,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 15, 25, 30),
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.12),
                              blurRadius: 15,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.policy_rounded, color: Color(0xFFBB0633), size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'GOVERNANCE HUB',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: Colors.white.withOpacity(0.7),
                                letterSpacing: 1.5,
                              ),
                            ),
                            Text(
                              'Policy Center',
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
                      _buildLanguageSelector(),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBox() {
    return Container(
      margin: const EdgeInsets.all(24),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      decoration: BoxDecoration(
        color: Colors.white, 
        borderRadius: BorderRadius.circular(20), 
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04), 
            blurRadius: 20, 
            offset: const Offset(0, 8)
          )
        ]
      ),
      child: TextField(
        controller: _searchController,
        style: GoogleFonts.plusJakartaSans(fontSize: 14, color: const Color(0xFF0F172A), fontWeight: FontWeight.w700),
        decoration: InputDecoration(
          hintText: "Search guidelines or policies...",
          hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w500),
          prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFBB0633), size: 22),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 20),
        ),
      ),
    );
  }

  Widget _buildPolicyContent(bool isAdmin) {
    if (_filteredPolicies.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(60.0),
          child: Column(
            children: [
              Icon(Icons.folder_off_rounded, size: 64, color: const Color(0xFFE2E8F0)),
              const SizedBox(height: 16),
              Text('No matching policies found', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF64748B), fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 4),
              Text('Try adjusting your search or language.', style: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 12)),
            ],
          ),
        ),
      );
    }

    Map<String, List<dynamic>> grouped = {};
    for (var cat in [..._categories, 'Other']) {
      grouped[cat] = [];
    }

    for (var p in _filteredPolicies) {
      String cat = (p['category'] ?? 'Other').toString();
      bool found = false;
      for (var predefined in _categories) {
        if (predefined.toLowerCase() == cat.toLowerCase()) {
          grouped[predefined]!.add(p);
          found = true;
          break;
        }
      }
      if (!found) {
        grouped['Other']!.add(p);
      }
    }

    return Column(
      children: grouped.entries.map((entry) {
        if (entry.value.isEmpty) return const SizedBox.shrink();
        return _buildCategoryGroup(entry.key, entry.value, isAdmin);
      }).toList(),
    );
  }

  Widget _buildCategoryGroup(String title, List<dynamic> items, bool isAdmin) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
          child: Row(
            children: [
              Text(
                title.toUpperCase(), 
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, 
                  fontWeight: FontWeight.w900, 
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 1.5
                )
              ),
              const SizedBox(width: 12),
              Expanded(child: Divider(color: const Color(0xFFCBD5E1).withOpacity(0.3))),
            ],
          ),
        ),
        ...items.map((p) => _buildPolicyCard(p, isAdmin)).toList(),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildPolicyCard(dynamic p, bool isAdmin) {
    final suffix = _getLanguageSuffix();
    final fileName = p['file_name_$suffix'] ?? '';
    final fileSize = p['file_size_$suffix'] ?? 'N/A';
    final hasFile = fileName.toString().isNotEmpty;
    
    final dateStr = p['created_at'] != null 
        ? DateFormat('dd MMM yyyy').format(DateTime.parse(p['created_at']))
        : 'Recently';

    return Container(
      margin: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      decoration: BoxDecoration(
        color: Colors.white, 
        borderRadius: BorderRadius.circular(24), 
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03), 
            blurRadius: 15, 
            offset: const Offset(0, 8)
          )
        ]
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(24),
        child: InkWell(
          onTap: hasFile ? () => _handleView(p) : null,
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(14), 
                  decoration: BoxDecoration(
                    color: const Color(0xFFBB0633).withOpacity(0.1), 
                    borderRadius: BorderRadius.circular(16)
                  ), 
                  child: const Icon(Icons.description_rounded, color: Color(0xFFBB0633), size: 28)
                ),
                const SizedBox(width: 18),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['title'] ?? 'Policy', 
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15, 
                          fontWeight: FontWeight.w900, 
                          color: const Color(0xFF0F172A), 
                          height: 1.2,
                          letterSpacing: -0.2
                        )
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.access_time_rounded, size: 12, color: const Color(0xFF94A3B8)),
                          const SizedBox(width: 4),
                          Text(
                            'Updated $dateStr  •  $fileSize', 
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11, 
                              color: const Color(0xFF64748B), 
                              fontWeight: FontWeight.w700
                            )
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_red_eye_rounded, color: Color(0xFF3B82F6), size: 20), 
                        onPressed: hasFile ? () => _handleView(p) : null,
                        tooltip: 'View',
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.all(10),
                      ),
                      if (isAdmin) ...[
                        Container(width: 1, height: 20, color: const Color(0xFFCBD5E1)),
                        IconButton(
                          icon: const Icon(Icons.delete_forever_rounded, color: Color(0xFFEF4444), size: 20), 
                          onPressed: () => _handleDelete(p['id']),
                          tooltip: 'Delete',
                          constraints: const BoxConstraints(),
                          padding: const EdgeInsets.all(10),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleView(dynamic p) async {
    final suffix = _getLanguageSuffix();
    if (p['file_name_$suffix'] == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("This policy is not available in $_selectedLanguage")),
      );
      return;
    }
    
    setState(() => _isProcessing = true);
    try {
      final response = await _apiService.get('${ApiConstants.policies}${p['id']}/');
      final base64String = response['file_content_$suffix']?.toString();
      
      if (base64String == null || base64String.isEmpty) {
        throw Exception("Empty file content");
      }

      // Handle data URL prefix if present
      String cleanBase64 = base64String;
      if (base64String.contains(',')) {
        cleanBase64 = base64String.split(',').last;
      }
      
      final bytes = base64Decode(cleanBase64);
      final tempDir = await getTemporaryDirectory();
      final fileName = p['file_name_$suffix'] ?? 'policy.pdf';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(bytes);
      
      final result = await OpenFilex.open(file.path);
      if (result.type != ResultType.done) {
        throw Exception(result.message);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to open document: $e")));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _handleDownload(dynamic p) async {
    // Similar to view but save to permanent storage or show Toast
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Download logic same as view; opening PDF.")));
    _handleView(p);
  }

  Future<void> _handleDelete(dynamic id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Policy', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w900)),
        content: const Text('Are you sure you want to delete this policy? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: GoogleFonts.inter(color: Colors.grey, fontWeight: FontWeight.w700))),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true), 
            child: Text('Delete', style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontWeight: FontWeight.w700))
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isProcessing = true);
      try {
        await _apiService.delete('${ApiConstants.policies}$id/');
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Policy deleted successfully")));
        _fetchPolicies();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to delete: $e")));
      } finally {
        if (mounted) setState(() => _isProcessing = false);
      }
    }
  }

  // ─── Policy Upload Modal ──────────────────────────────────────────────────

  void _showUploadModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _PolicyUploadModal(onSuccess: () => _fetchPolicies()),
    );
  }
}

class _PolicyUploadModal extends StatefulWidget {
  final VoidCallback onSuccess;
  const _PolicyUploadModal({required this.onSuccess});

  @override
  State<_PolicyUploadModal> createState() => _PolicyUploadModalState();
}

class _PolicyUploadModalState extends State<_PolicyUploadModal> {
  final ApiService _apiService = ApiService();
  final _titleController = TextEditingController();
  String _category = 'General';
  bool _isUploading = false;

  Map<String, dynamic> _files = {
    'en': {'name': null, 'content': null, 'size': null},
    'te': {'name': null, 'content': null, 'size': null},
    'hi': {'name': null, 'content': null, 'size': null},
  };

  Future<void> _pickFile(String lang) async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );

    if (result != null) {
      final file = File(result.files.single.path!);
      final bytes = await file.readAsBytes();
      final base64Content = 'data:application/pdf;base64,${base64Encode(bytes)}';
      final sizeMb = (bytes.length / (1024 * 1024)).toStringAsFixed(1) + ' MB';

      setState(() {
        _files[lang] = {
          'name': result.files.single.name,
          'content': base64Content,
          'size': sizeMb,
        };
      });
    }
  }

  Future<void> _handleUpload() async {
    if (_titleController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please enter a title")));
      return;
    }
    if (_files.values.every((f) => f['content'] == null)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Select at least one language PDF")));
      return;
    }

    setState(() => _isUploading = true);
    try {
      final data = {
        'title': _titleController.text,
        'category': _category,
        'file_content_en': _files['en']!['content'] ?? '',
        'file_name_en': _files['en']!['name'] ?? '',
        'file_size_en': _files['en']!['size'] ?? '',
        'file_content_te': _files['te']!['content'] ?? '',
        'file_name_te': _files['te']!['name'] ?? '',
        'file_size_te': _files['te']!['size'] ?? '',
        'file_content_hi': _files['hi']!['content'] ?? '',
        'file_name_hi': _files['hi']!['name'] ?? '',
        'file_size_hi': _files['hi']!['size'] ?? '',
      };

      await _apiService.post(ApiConstants.policies, body: data, includeAuth: true);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Policy published successfully")));
      widget.onSuccess();
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Upload failed: $e")));
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(36)),
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 30, offset: Offset(0, -10))],
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 45, height: 5, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10)))),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Upload Policy', 
                  style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A), letterSpacing: -0.8)
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
                    child: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            _buildModalLabel('DOCUMENT TITLE'),
            const SizedBox(height: 10),
            TextField(
              controller: _titleController,
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'e.g. Travel Guidelines 2026',
                hintStyle: GoogleFonts.plusJakartaSans(color: const Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFFF1F5F9))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF0F172A), width: 1.5)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
              ),
            ),
            const SizedBox(height: 24),
            _buildModalLabel('CATEGORY'),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC), 
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF1F5F9)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _category,
                  isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                  onChanged: (val) => setState(() => _category = val!),
                  items: ['General', 'HR Policy', 'Travel Guide'].map((c) => DropdownMenuItem(
                    value: c, 
                    child: Text(c, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)))
                  )).toList(),
                ),
              ),
            ),
            const SizedBox(height: 32),
            _buildModalLabel('LANGUAGE VERSIONS (PDF)'),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _buildLangUpload('en', 'English')),
                const SizedBox(width: 12),
                Expanded(child: _buildLangUpload('te', 'Telugu')),
                const SizedBox(width: 12),
                Expanded(child: _buildLangUpload('hi', 'Hindi')),
              ],
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: ElevatedButton(
                onPressed: _isUploading ? null : _handleUpload,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F1E2A), 
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)), 
                  elevation: 8,
                  shadowColor: const Color(0xFF0F1E2A).withOpacity(0.4),
                ),
                child: _isUploading 
                  ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                  : Text('PUBLISH POLICY', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1)),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildModalLabel(String label) {
    return Text(
      label, 
      style: GoogleFonts.plusJakartaSans(
        fontSize: 11, 
        fontWeight: FontWeight.w800, 
        color: const Color(0xFF64748B), 
        letterSpacing: 1.2
      )
    );
  }

  Widget _buildLangUpload(String code, String label) {
    bool hasFile = _files[code]!['name'] != null;
    return GestureDetector(
      onTap: () => _pickFile(code),
      child: Container(
        height: 110,
        decoration: BoxDecoration(
          color: hasFile ? const Color(0xFFBB0633).withOpacity(0.05) : const Color(0xFFF1F5F9).withOpacity(0.5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: hasFile ? const Color(0xFFBB0633) : const Color(0xFFE2E8F0), 
            width: hasFile ? 1.5 : 1,
            style: hasFile ? BorderStyle.solid : BorderStyle.none
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: hasFile ? const Color(0xFFBB0633) : Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  if (!hasFile) BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5)
                ]
              ),
              child: Icon(
                hasFile ? Icons.check_rounded : Icons.add_rounded, 
                size: 16, 
                color: hasFile ? Colors.white : const Color(0xFF64748B)
              ),
            ),
            const SizedBox(height: 12),
            Text(
              label, 
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12, 
                fontWeight: FontWeight.w900, 
                color: hasFile ? const Color(0xFFBB0633) : const Color(0xFF0F172A)
              )
            ),
            if (hasFile) ...[
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  _files[code]!['name'], 
                  maxLines: 1, 
                  overflow: TextOverflow.ellipsis, 
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(fontSize: 8, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
