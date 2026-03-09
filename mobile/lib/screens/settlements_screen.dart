import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class SettlementsScreen extends StatefulWidget {
  const SettlementsScreen({super.key});

  @override
  State<SettlementsScreen> createState() => _SettlementsScreenState();
}

class _SettlementsScreenState extends State<SettlementsScreen> {
  bool _isSettled = false;
  
  final Map<String, dynamic> _summary = {
    'advance': 15000,
    'claimTotal': 12450,
    'balance': -2550, 
    'type': 'Recoverable'
  };

  final List<Map<String, dynamic>> _transactions = [
    {
      'title': 'Advance via Bank Transfer',
      'date': 'April 02, 2024',
      'amount': -15000,
      'isPositive': false,
    },
    {
      'title': 'Expense Claim: TRP-9921',
      'date': 'April 10, 2024',
      'amount': 12450,
      'isPositive': true,
    },
  ];

  String _formatCurrency(num amount) {
    return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0).format(amount.abs());
  }

  void _handleSettle() {
    setState(() => _isSettled = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Claim Status updated to Settled. Financial books updated.'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Settlement',
          style: GoogleFonts.interTight(
            color: const Color(0xFF0F172A),
            fontWeight: FontWeight.w900,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Finalize trip accounts and process reimbursements or recoveries.',
              style: GoogleFonts.inter(fontSize: 14, color: const Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 24),
            
            // Settlement Main Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFF1F5F9)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 8)),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _bannerItem('Advance Paid', _formatCurrency(_summary['advance'])),
                      const Icon(Icons.sync_alt_rounded, color: Color(0xFF94A3B8), size: 24),
                      _bannerItem('Total Claims', _formatCurrency(_summary['claimTotal'])),
                    ],
                  ),
                  const Divider(height: 48),
                  Column(
                    children: [
                      Text('Final Balance', style: GoogleFonts.inter(fontSize: 13, color: Colors.black45, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Text(
                        _formatCurrency(_summary['balance']),
                        style: GoogleFonts.inter(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: _summary['balance'] < 0 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_summary['type']} from Employee',
                        style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 30),
                  if (!_isSettled)
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _handleSettle,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F172A),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: Text('Finalize & Settle', style: GoogleFonts.inter(fontWeight: FontWeight.w900, color: Colors.white)),
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFDCFCE7)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.verified_user_rounded, color: Color(0xFF10B981), size: 20),
                          const SizedBox(width: 8),
                          RichText(
                            text: TextSpan(
                              style: GoogleFonts.inter(color: const Color(0xFF166534), fontSize: 13),
                              children: [
                                const TextSpan(text: 'Accounting Status: '),
                                TextSpan(text: 'Settled', style: GoogleFonts.inter(fontWeight: FontWeight.w900)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            Text('Transaction Breakdown', style: GoogleFonts.interTight(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
            const SizedBox(height: 16),
            
            // Breakdown List
            ..._transactions.map((tx) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFF1F5F9)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                        child: Icon(
                          tx['isPositive'] ? Icons.currency_rupee_rounded : Icons.account_balance_wallet_rounded,
                          size: 20,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(tx['title'], style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                            Text(tx['date'], style: GoogleFonts.inter(fontSize: 12, color: Colors.black26, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                      Text(
                        '${tx['isPositive'] ? '+' : '-'}${_formatCurrency(tx['amount'])}',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: tx['isPositive'] ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        ),
                      ),
                    ],
                  ),
                )),
            
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.file_download_rounded, size: 20),
                label: Text('Download Settlement Receipt', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0F172A),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _bannerItem(String label, String value) {
    return Column(
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.black45, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A))),
      ],
    );
  }
}
