import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/splash_screen.dart';
import 'services/logger_service.dart';
import 'services/location_tracking_service.dart';
import 'services/api_service.dart';

void main() async {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    
    // Initialize Local Logging immediately
    LoggerService.log('APP_BOOT: Initializing system services...');

    try {
      // 1. Load Session (Token/User) - Fast & Mandatory
      await ApiService.loadSession().timeout(
        const Duration(seconds: 2),
        onTimeout: () => LoggerService.log('BOOT: Session load timed out', isError: true),
      );
      
      // 2. Initialize Background Engine - Non-blocking startup
      // We don't await this indefinitely to prevent the "Black Screen" watchdog kill
      LocationTrackingService.initializeService().catchError((e) {
        LoggerService.log('BOOT_SERVICE_ERR: $e', isError: true);
      });
      
      LoggerService.log('APP_BOOT: Initial bootstrap sequence triggered.');
    } catch (e, stack) {
      LoggerService.log('BOOT_CRASH: $e\n$stack', isError: true);
    }

    runApp(const MyApp());
  }, (error, stack) {
    LoggerService.log('UNHANDLED_ERROR: $error\n$stack', isError: true);
  });
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
