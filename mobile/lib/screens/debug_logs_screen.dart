import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/logger_service.dart';

class DebugLogsScreen extends StatefulWidget {
  const DebugLogsScreen({super.key});

  @override
  State<DebugLogsScreen> createState() => _DebugLogsScreenState();
}

class _DebugLogsScreenState extends State<DebugLogsScreen> {
  List<String> _logs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    setState(() => _isLoading = true);
    final logs = await LoggerService.getLogs();
    setState(() {
      _logs = logs.reversed.toList();
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.black,
            size: 20,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'System Logs',
          style: GoogleFonts.interTight(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w900,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep_rounded, color: Colors.red),
            onPressed: () async {
              await LoggerService.clearLogs();
              _loadLogs();
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF7C1D1D)),
            onPressed: _loadLogs,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF7C1D1D)),
            )
          : _logs.isEmpty
          ? Center(
              child: Text(
                'No logs found',
                style: GoogleFonts.inter(color: Colors.black26),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: _logs.length,
              separatorBuilder: (context, index) =>
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
              itemBuilder: (context, index) {
                final log = _logs[index];
                final isError = log.contains('[ERROR]');

                return InkWell(
                  onLongPress: () {
                    Clipboard.setData(ClipboardData(text: log));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Log copied to clipboard')),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 4,
                          height: 40,
                          decoration: BoxDecoration(
                            color: isError ? Colors.red : Colors.blue,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            log,
                            style: GoogleFonts.robotoMono(
                              fontSize: 11,
                              color: isError
                                  ? Colors.red[900]
                                  : const Color(0xFF1E293B),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
