import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class LoggerService {
  static const String _logKey = 'app_crash_logs';
  static final List<String> _logs = [];

  static Future<void> log(String message, {bool isError = false}) async {
    final timestamp = DateFormat('yyyy-MM-dd HH:mm:ss').format(DateTime.now());
    final prefix = isError ? '[ERROR]' : '[INFO]';
    final logLine = '$timestamp $prefix $message';

    print(logLine);
    _logs.add(logLine);

    // Keep only last 100 logs
    if (_logs.length > 100) _logs.removeAt(0);

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_logKey, _logs);
    } catch (e) {
      print('Failed to persist log: $e');
    }
  }

  static Future<List<String>> getLogs() async {
    if (_logs.isNotEmpty) return _logs;
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_logKey) ?? [];
  }

  static Future<void> clearLogs() async {
    _logs.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_logKey);
  }
}
