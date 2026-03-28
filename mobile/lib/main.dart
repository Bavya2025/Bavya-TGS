import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/splash_screen.dart';
import 'services/logger_service.dart';
import 'services/location_tracking_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Background Location Service engine
  try {
    await LocationTrackingService.initializeService();
  } catch (e) {
    debugPrint('BACKGROUND_SERVICE_INIT_ERROR: $e');
  }

  LoggerService.log('APP STARTING: Instant Boot sequence init.');

  // DO NOT add blocking logic here to prevent hangs at startup
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TGS Travel',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.red,
        primaryColor: const Color(0xFFBB0633),
        fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      ),
      home: const SplashScreen(),
    );
  }
}
