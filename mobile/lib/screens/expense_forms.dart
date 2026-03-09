import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:geolocator/geolocator.dart';

class ExpenseFormScreen extends StatefulWidget {
  final String category;
  const ExpenseFormScreen({super.key, required this.category});

  @override
  _ExpenseFormScreenState createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends State<ExpenseFormScreen> {
  File? _image;
  bool _isProcessing = false;
  final picker = ImagePicker();

  Future<Position?> _determinePosition() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        await showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Location Services Disabled'),
            content: const Text('Please enable location services to capture the GPS watermark on your receipt.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
            ],
          ),
        );
      }
      return null;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }
    
    if (permission == LocationPermission.deniedForever) return null;

    return await Geolocator.getCurrentPosition();
  }

  Future<void> _getImage() async {
    final Position? position = await _determinePosition();
    if (position == null) return;

    final pickedFile = await picker.pickImage(source: ImageSource.camera, imageQuality: 50);

    if (pickedFile != null) {
      setState(() {
        _isProcessing = true;
      });

      try {
        final File imageFile = File(pickedFile.path);
        final String currentTime = DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now());
        final String gpsLocation = "Lat: ${position.latitude.toStringAsFixed(4)}, Long: ${position.longitude.toStringAsFixed(4)}";
        
        // Load image
        final bytes = await imageFile.readAsBytes();
        img.Image? originalImage = img.decodeImage(bytes);

        if (originalImage != null) {
          // Draw watermark background
          img.fillRect(
            originalImage,
            x1: 0,
            y1: originalImage.height - 150,
            x2: originalImage.width,
            y2: originalImage.height,
            color: img.ColorRgba8(0, 0, 0, 150),
          );

          // Draw Text
          img.drawString(
            originalImage,
            'Location: $gpsLocation',
            font: img.arial24,
            x: 20,
            y: originalImage.height - 100,
            color: img.ColorRgba8(255, 255, 255, 255),
          );
          img.drawString(
            originalImage,
            'Time: $currentTime',
            font: img.arial24,
            x: 20,
            y: originalImage.height - 50,
            color: img.ColorRgba8(255, 255, 255, 255),
          );

          // Save watermarked image
          final directory = await getTemporaryDirectory();
          final String fileName = 'watermarked_${p.basename(imageFile.path)}';
          final String filePath = p.join(directory.path, fileName);
          final watermarkedFile = File(filePath)..writeAsBytesSync(img.encodeJpg(originalImage));

          setState(() {
            _image = watermarkedFile;
          });
        }
      } catch (e) {
        debugPrint('Error processing image: $e');
      } finally {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('${widget.category} Expense', style: GoogleFonts.interTight(color: Colors.black, fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildLabel('Date'),
                  _buildTextField('Select Date', suffixIcon: Icons.calendar_today_rounded),
                  const SizedBox(height: 16),
                  _buildLabel('Amount'),
                  _buildTextField('Enter Amount', prefix: '\$'),
                  const SizedBox(height: 16),
                  _buildLabel('Description'),
                  _buildTextField('Enter details', maxLines: 3),
                  const SizedBox(height: 16),
                  _buildLabel('Capture Receipt'),
                  GestureDetector(
                    onTap: _isProcessing ? null : _getImage,
                    child: Container(
                      width: double.infinity,
                      height: 250,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.black12),
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: _isProcessing
                          ? const Center(child: CircularProgressIndicator(color: Color(0xFFEF7139)))
                          : _image != null
                              ? Stack(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Image.file(_image!, width: double.infinity, height: 250, fit: BoxFit.cover),
                                    ),
                                    Positioned(
                                      top: 10,
                                      right: 10,
                                      child: CircleAvatar(
                                        backgroundColor: Colors.white,
                                        radius: 15,
                                        child: IconButton(
                                          padding: EdgeInsets.zero,
                                          icon: const Icon(Icons.close, size: 20, color: Colors.red),
                                          onPressed: () => setState(() => _image = null),
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              : Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.camera_alt_outlined, color: Color(0xFF7C1D1D), size: 40),
                                    const SizedBox(height: 12),
                                    Text('Tap to Open Camera', style: GoogleFonts.inter(fontSize: 14, color: Colors.black54, fontWeight: FontWeight.w500)),
                                    Text('(GPS and Time watermark will be added)', style: GoogleFonts.inter(fontSize: 10, color: Colors.black26)),
                                  ],
                                ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (context) => const ExpenseReviewScreen()));
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C1D1D),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Add to Review', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(label, style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
    );
  }

  Widget _buildTextField(String hint, {IconData? suffixIcon, String? prefix, int maxLines = 1}) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF1F4F8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: TextField(
        maxLines: maxLines,
        decoration: InputDecoration(
          hintText: hint,
          prefixText: prefix,
          suffixIcon: suffixIcon != null ? Icon(suffixIcon, size: 20) : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      ),
    );
  }
}

class ExpenseReviewScreen extends StatelessWidget {
  const ExpenseReviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Expense Review', style: GoogleFonts.interTight(color: Colors.black, fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _buildReviewItem('Travel', '\$120.00', '20 Dec 2023'),
                _buildReviewItem('DA', '\$45.00', '21 Dec 2023'),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Claim Amount', style: TextStyle(fontWeight: FontWeight.w500)),
                    const Text('\$165.00', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFFEF7139))),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEF7139),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Submit Claim', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewItem(String category, String amount, String date) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(category, style: GoogleFonts.interTight(fontWeight: FontWeight.bold, fontSize: 16)),
              Text(date, style: GoogleFonts.inter(fontSize: 12, color: Colors.black38)),
            ],
          ),
          Text(amount, style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
    );
  }
}
