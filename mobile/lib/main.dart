import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'services/api_service.dart';
import 'services/expense_reminder_service.dart';
import 'screens/splash_screen.dart';
import 'services/location_tracking_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Move background initialization later to avoid debugger handshake issues
  Future.delayed(const Duration(milliseconds: 500), () async {
    try {
      debugPrint('BOOTSTRAP: Initializing Location Service...');
      await LocationTrackingService.initializeService();
      debugPrint('BOOTSTRAP: Location Service Configured.');
    } catch (e) {
      debugPrint('BOOTSTRAP: Location Service Init Error: $e');
    }
  });

  try {
    debugPrint('BOOTSTRAP: Restoring session...');
    await ApiService.loadSession();
    debugPrint('BOOTSTRAP: Session restored.');
    // Delayed initialization to prevent startup congestion
    Future.delayed(const Duration(milliseconds: 1510), () async {
      debugPrint('BOOTSTRAP: Initializing Expense Reminders...');
      try {
        await ExpenseReminderService.initialize();
        debugPrint('BOOTSTRAP: Expense Reminders Ready.');
      } catch (e) {
        debugPrint('BOOTSTRAP: Expense Reminder Error: $e');
      }
    });
  } catch (e) {
    debugPrint('BOOTSTRAP: Initialization Error: $e');
  }

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
