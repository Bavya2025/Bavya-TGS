import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../models/trip_model.dart';

class ExpenseReminderService {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static const String _channelId = 'trip_expense_reminder_channel';
  static const String _channelName = 'Trip Expense Reminders';
  static const String _channelDescription =
      'Reminds users to fill daily trip expenses at 3 PM.';
  static const String _storedIdsKey = 'trip_expense_reminder_ids';
  static const String _sentCatchupKey = 'trip_expense_catchup_sent_keys';
  static const String _submissionReminderIdsKey =
      'trip_submission_reminder_ids';

  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const settings = InitializationSettings(android: androidSettings);
    await _notificationsPlugin.initialize(settings);

    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidImpl?.requestNotificationsPermission();

    tz_data.initializeTimeZones();
    try {
      final localTimeZone = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(localTimeZone));
    } catch (e) {
      debugPrint('Timezone setup failed, using default timezone: $e');
    }

    _initialized = true;
  }

  static Future<void> syncTripExpenseReminders(List<Trip> trips) async {
    if (!_initialized) {
      await initialize();
    }

    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    final enabled = await androidImpl?.areNotificationsEnabled() ?? true;
    if (!enabled) {
      final granted =
          await androidImpl?.requestNotificationsPermission() ?? false;
      if (!granted) {
        debugPrint(
          'Expense reminders skipped: notification permission not granted.',
        );
        return;
      }
    }

    final previousIds = await _getStoredReminderIds();
    for (final id in previousIds) {
      await _notificationsPlugin.cancel(id);
    }

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final nextIds = <int>[];
    final sentCatchupKeys = await _getSentCatchupKeys();
    final activeDateKeys = <String>{};
    int scheduledCount = 0;
    int catchupCount = 0;

    for (final trip in trips) {
      final start = _parseTripDate(trip.startDate);
      final end = _parseTripDate(trip.endDate);
      if (start == null || end == null) continue;

      final startDay = DateTime(start.year, start.month, start.day);
      final endDay = DateTime(end.year, end.month, end.day);
      if (endDay.isBefore(today)) continue;

      DateTime currentDay = startDay.isBefore(today) ? today : startDay;
      int safetyCounter = 0;
      while (!currentDay.isAfter(endDay) && safetyCounter < 180) {
        activeDateKeys.add(_toDateKey(currentDay));
        currentDay = currentDay.add(const Duration(days: 1));
        safetyCounter++;
      }
    }

    for (final dateKey in activeDateKeys) {
      final date = _parseTripDate(dateKey);
      if (date == null) continue;
      final reminderTime = DateTime(date.year, date.month, date.day, 15, 0);

      if (!reminderTime.isBefore(now)) {
        final reminderId = _buildDailyReminderId(dateKey);
        nextIds.add(reminderId);
        scheduledCount++;

        await _notificationsPlugin.zonedSchedule(
          reminderId,
          'Expense Reminder',
          'Please fill the expenses of today',
          tz.TZDateTime.from(reminderTime, tz.local),
          const NotificationDetails(
            android: AndroidNotificationDetails(
              _channelId,
              _channelName,
              channelDescription: _channelDescription,
              importance: Importance.high,
              priority: Priority.high,
            ),
          ),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          payload: 'date:$dateKey',
        );
      } else if (_isSameDay(date, today)) {
        if (!sentCatchupKeys.contains(dateKey)) {
          final catchupId = _buildDailyReminderId('${dateKey}_catchup');
          await _notificationsPlugin.show(
            catchupId,
            'Expense Reminder',
            'Please fill the expenses of today',
            const NotificationDetails(
              android: AndroidNotificationDetails(
                _channelId,
                _channelName,
                channelDescription: _channelDescription,
                importance: Importance.high,
                priority: Priority.high,
              ),
            ),
            payload: 'date:$dateKey|catchup:true',
          );
          sentCatchupKeys.add(dateKey);
          catchupCount++;
        }
      }
    }

    await _storeReminderIds(nextIds);
    await _storeSentCatchupKeys(sentCatchupKeys);

    final pending = await _notificationsPlugin.pendingNotificationRequests();
    debugPrint(
      'Expense reminders sync complete. trips=${trips.length}, scheduled=$scheduledCount, '
      'catchup=$catchupCount, pending=${pending.length}',
    );
  }

  static int _buildDailyReminderId(String dateKey) {
    return 'trip_expense_daily_$dateKey'.hashCode & 0x7fffffff;
  }

  static String _toDateKey(DateTime date) {
    final year = date.year.toString().padLeft(4, '0');
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }

  static DateTime? _parseTripDate(String raw) {
    final value = raw.trim();
    if (value.isEmpty) return null;
    try {
      return DateTime.parse(value);
    } catch (_) {
      if (value.length >= 10) {
        try {
          return DateTime.parse(value.substring(0, 10));
        } catch (_) {
          return null;
        }
      }
      return null;
    }
  }

  static bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  static Future<List<int>> _getStoredReminderIds() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_storedIdsKey) ?? const <String>[];
    return stored.map(int.tryParse).whereType<int>().toList();
  }

  static Future<void> _storeReminderIds(List<int> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      _storedIdsKey,
      ids.map((e) => e.toString()).toList(),
    );
  }

  static Future<Set<String>> _getSentCatchupKeys() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_sentCatchupKey) ?? const <String>[]).toSet();
  }

  static Future<void> _storeSentCatchupKeys(Set<String> keys) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_sentCatchupKey, keys.toList());
  }

  /// Fires an immediate safety push notification based on the vehicle type.
  /// Call this right after the start odometer image is saved as a draft.
  static Future<void> showSafetyNotification(String travelMode) async {
    if (!_initialized) await initialize();

    final mode = travelMode.toLowerCase();

    String title;
    String body;
    String bigText;

    // Professional English applied to the requested messages:
    // Bike / 2-Wheeler
    if (mode.contains('bike') ||
        mode.contains('2 wheeler') ||
        mode.contains('two wheeler') ||
        mode == '2wheeler') {
      title = '🪖 Safety Protocol: Two-Wheeler';
      body = 'Kindly wear your helmet and drive safely.';
      bigText =
          'Safety Awareness: For your protection, please ensure your helmet is securely fastened before commencing your journey. Drive responsibly and stay safe.';
    }
    // Car / 4-Wheeler / Local Conveyance
    else if (mode.contains('car') ||
        mode.contains('4 wheeler') ||
        mode.contains('four wheeler') ||
        mode.contains('cab') ||
        mode.contains('taxi') ||
        mode.contains('conveyance')) {
      title = '🚗 Safety Protocol: Vehicle';
      body = 'Kindly wear your seat belt and drive safely.';
      bigText =
          'Safety Awareness: For your protection, please ensure your seat belt is securely fastened before commencing your journey. Drive responsibly and stay safe.';
    }
    // General Travel
    else {
      title = '🛡️ Safe Journey';
      body = 'Kindly maintain safety standards and drive safely.';
      bigText =
          'Your journey has commenced. Please adhere to all safety regulations and proceed with caution. Wishing you a safe and professional travel experience.';
    }

    final androidDetails = AndroidNotificationDetails(
      'safety_alert_channel',
      'Safety Alerts',
      channelDescription: 'Sends safety reminders when a journey starts.',
      importance: Importance.max,
      priority: Priority.high,
      styleInformation: BigTextStyleInformation(bigText),
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
    );

    await _notificationsPlugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000 % 100000, // unique ID
      title,
      body,
      NotificationDetails(android: androidDetails),
    );

    debugPrint('Safety notification sent for travel mode: $travelMode');
  }

  /// Schedules a reminder 22 hours after end odo is captured, prompting submission before the 24h limit.
  static Future<void> scheduleSubmissionReminder(
    String expenseId,
    String location,
  ) async {
    if (!_initialized) await initialize();

    final reminderId = _buildSubmissionReminderId(expenseId);
    final scheduledTime = tz.TZDateTime.now(
      tz.local,
    ).add(const Duration(hours: 22));

    const androidDetails = AndroidNotificationDetails(
      'submission_deadline_channel',
      'Submission Deadlines',
      channelDescription:
          'Reminds users to submit expenses before the 24h window closes.',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
    );

    await _notificationsPlugin.zonedSchedule(
      reminderId,
      '⏳ Submission Deadline Approaching',
      'Kindly submit your expense form for $location with all bills.',
      scheduledTime,
      const NotificationDetails(android: androidDetails),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: 'submission_reminder:$expenseId',
    );

    debugPrint(
      'Scheduled submission reminder for expense $expenseId at $scheduledTime',
    );
  }

  /// Cancels a pending submission reminder. Call this when "FINISH & SUBMIT" is clicked.
  static Future<void> cancelSubmissionReminder(String expenseId) async {
    if (!_initialized) await initialize();
    final reminderId = _buildSubmissionReminderId(expenseId);
    await _notificationsPlugin.cancel(reminderId);
    debugPrint('Cancelled submission reminder for expense $expenseId');
  }

  static int _buildSubmissionReminderId(String expenseId) {
    return 'submission_deadline_$expenseId'.hashCode & 0x7fffffff;
  }
}
