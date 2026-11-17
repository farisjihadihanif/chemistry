import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';

void main() {
  runApp(const ChemDiscoveryApp());
}

class AppColors {
  // Chemistry Bright Light Palette (Sapphire Blue / Cyan)
  static const lightPrimary = Color(0xFF0284C7);
  static const lightSecondary = Color(0xFF0EA5E9);
  static const lightBg = Color(0xFFF4F8FC);
  static const lightCard = Color(0xFFFFFFFF);
  static const lightSoft = Color(0xFFEEF4FA);
  static const lightBorder = Color(0xFFDBE7F3);
  static const lightText = Color(0xFF0F172A);
  static const lightMuted = Color(0xFF475569);

  // Chemistry Dark Palette (Deep Lab Cobalt / Luminous Cyan)
  static const darkPrimary = Color(0xFF38BDF8);
  static const darkSecondary = Color(0xFF818CF8);
  static const darkBg = Color(0xFF060B14);
  static const darkCard = Color(0xFF0D1525);
  static const darkSoft = Color(0xFF131E33);
  static const darkBorder = Color(0xFF1E2E4A);
  static const darkText = Color(0xFFF8FAFC);
  static const darkMuted = Color(0xFF94A3B8);
}

class ApiClient {
  static String baseUrl =
      Platform.isAndroid ? 'http://10.0.2.2:8087' : 'http://127.0.0.1:8087';

  static Future<Map<String, dynamic>> get(String path) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 6);
    try {
      final req = await client.getUrl(Uri.parse('$baseUrl$path'));
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      return jsonDecode(body) as Map<String, dynamic>;
    } finally {
      client.close();
    }
  }

  static Future<Map<String, dynamic>> post(
      String path, Map<String, dynamic> payload) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 6);
    try {
      final req = await client.postUrl(Uri.parse('$baseUrl$path'));
      req.headers.set('Content-Type', 'application/json; charset=utf-8');
      req.add(utf8.encode(jsonEncode(payload)));
      final res = await req.close();
      final body = await res.transform(utf8.decoder).join();
      return jsonDecode(body) as Map<String, dynamic>;
    } finally {
      client.close();
    }
  }
}

class ChemDiscoveryApp extends StatefulWidget {
  const ChemDiscoveryApp({super.key});

  @override
  State<ChemDiscoveryApp> createState() => _ChemDiscoveryAppState();
}

class _ChemDiscoveryAppState extends State<ChemDiscoveryApp> {
  bool isDark = false;

  ThemeData _buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.lightBg,
      colorScheme: const ColorScheme.light(
        primary: AppColors.lightPrimary,
        secondary: AppColors.lightSecondary,
        surface: AppColors.lightCard,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.lightBg,
        foregroundColor: AppColors.lightText,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.lightCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.lightBorder),
        ),
      ),
    );
  }

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.darkBg,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.darkPrimary,
        secondary: AppColors.darkSecondary,
        surface: AppColors.darkCard,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.darkBg,
        foregroundColor: AppColors.darkText,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: AppColors.darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Chemistry Mobile',
      debugShowCheckedModeBanner: false,
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      theme: _buildLightTheme(),
      darkTheme: _buildDarkTheme(),
      home: MainShell(
        isDark: isDark,
        onToggleTheme: () => setState(() => isDark = !isDark),
      ),
    );
  }
}

class MainShell extends StatefulWidget {
  final bool isDark;
  final VoidCallback onToggleTheme;
  const MainShell({super.key, required this.isDark, required this.onToggleTheme});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _tabIndex = 0;

  void _showServerDialog() {
    final ctrl = TextEditingController(text: ApiClient.baseUrl);
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Alamat Server Backend'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            labelText: 'URL API (mis. http://192.168.1.10:8087)',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              ApiClient.baseUrl = ctrl.text.trim();
              Navigator.pop(context);
              setState(() {});
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      DashboardPage(onNavigate: (i) => setState(() => _tabIndex = i)),
      const DiscoveryPage(),
      const CalculatorPage(),
      const ChatPage(),
      const HistoryPage(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.science_outlined,
                  size: 20, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(width: 10),
            const Text('Chemistry',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _showServerDialog,
            icon: const Icon(Icons.dns_outlined),
            tooltip: 'Pengaturan Server',
          ),
          IconButton(
            onPressed: widget.onToggleTheme,
            icon: Icon(widget.isDark ? Icons.wb_sunny : Icons.nightlight_round),
            tooltip: 'Ganti Tema',
          ),
        ],
      ),
      body: IndexedStack(index: _tabIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (i) => setState(() => _tabIndex = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.science_outlined), label: 'Temukan'),
          NavigationDestination(icon: Icon(Icons.calculate_outlined), label: 'Lipinski'),
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), label: 'Chety'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Riwayat'),
        ],
      ),
    );
  }
}

class DashboardPage extends StatefulWidget {
  final ValueChanged<int> onNavigate;
  const DashboardPage({super.key, required this.onNavigate});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  Map<String, dynamic>? stats;
  bool loading = true;
  String? errorMsg;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() {
      loading = true;
      errorMsg = null;
    });
    try {
      final res = await ApiClient.get('/api/stats');
      setState(() => stats = res['stats'] as Map<String, dynamic>?);
    } catch (e) {
      setState(() => errorMsg = 'Mode offline / backend belum aktif (${ApiClient.baseUrl})');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return RefreshIndicator(
      onRefresh: _loadStats,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Selamat datang, Peneliti',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text('Portal riset & edukasi senyawa kimia aman ramah keluarga.'),
          if (errorMsg != null) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(errorMsg!, style: const TextStyle(fontSize: 12)),
              ),
            ),
          ],
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            children: [
              _statCard('Total Penemuan', '${stats?['totalDiscoveries'] ?? 0}', Icons.biotech, primary),
              _statCard('Senyawa Aman', '${stats?['librarySize'] ?? 9}', Icons.science, primary),
              _statCard('Kepercayaan', '${(((stats?['avgConfidence'] ?? 0.92) as num) * 100).round()}%', Icons.trending_up, primary),
              _statCard('Favorit', '${stats?['totalFavorites'] ?? 0}', Icons.star, primary),
            ],
          ),
          const SizedBox(height: 20),
          Text('Aksi Cepat',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          _quickTile('Mulai Penemuan Baru', 'Cari surfaktan, biopolimer, dan pelarut hijau', () => widget.onNavigate(1)),
          _quickTile('Kalkulator Lipinski', 'Uji notasi SMILES secara instan', () => widget.onNavigate(2)),
          _quickTile('Tanya Chety AI', 'Konsultasi formulasi dan kimia aman', () => widget.onNavigate(3)),
        ],
      ),
    );
  }

  Widget _statCard(String label, String val, IconData icon, Color primary) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(label, style: const TextStyle(fontSize: 12))),
                Icon(icon, color: primary, size: 20),
              ],
            ),
            Text(val,
                style: TextStyle(
                    fontSize: 24, fontWeight: FontWeight.bold, color: primary)),
          ],
        ),
      ),
    );
  }

  Widget _quickTile(String title, String sub, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: ListTile(
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(sub, style: const TextStyle(fontSize: 12)),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: onTap,
        ),
      ),
    );
  }
}

class DiscoveryPage extends StatefulWidget {
  const DiscoveryPage({super.key});

  @override
  State<DiscoveryPage> createState() => _DiscoveryPageState();
}

class _DiscoveryPageState extends State<DiscoveryPage> {
  String category = 'All';
  final promptCtrl = TextEditingController();
  List<dynamic> results = [];
  List<dynamic> templates = [];
  List<String> favIds = [];
  bool loading = false;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  Future<void> _initData() async {
    try {
      final tRes = await ApiClient.get('/api/templates');
      final fRes = await ApiClient.get('/api/favorites');
      setState(() {
        templates = (tRes['templates'] as List?) ?? [];
        favIds = ((fRes['favorite_ids'] as List?) ?? []).map((e) => '$e').toList();
      });
    } catch (_) {}
  }

  Future<void> _runDiscovery({String? customPrompt}) async {
    setState(() => loading = true);
    try {
      final res = await ApiClient.post('/api/discover', {
        'category': category,
        'prompt_text': customPrompt ?? promptCtrl.text,
        'input_mode': (customPrompt ?? promptCtrl.text).isNotEmpty ? 'AI Prompt' : 'Structured Form',
      });
      final disc = res['discovery'] as Map<String, dynamic>;
      setState(() => results = (disc['compounds'] as List?) ?? []);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal terhubung ke server: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _toggleFav(String id) async {
    try {
      final res = await ApiClient.post('/api/favorites/toggle', {'compound_id': id});
      setState(() {
        favIds = ((res['favorite_ids'] as List?) ?? []).map((e) => '$e').toList();
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                DropdownButtonFormField<String>(
                  value: category,
                  decoration: const InputDecoration(labelText: 'Kategori Senyawa', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: 'All', child: Text('Semua Kategori')),
                    DropdownMenuItem(value: 'Surfactant', child: Text('Surfaktan (Pembersih Aman)')),
                    DropdownMenuItem(value: 'Biopolymer', child: Text('Biopolimer & Kemasan')),
                    DropdownMenuItem(value: 'Green Solvent', child: Text('Pelarut Hijau')),
                  ],
                  onChanged: (v) => setState(() => category = v ?? 'All'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: promptCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Kebutuhan Anda (Opsional)',
                    hintText: 'Mis. sabun cuci lembut dan ramah lingkungan...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: loading ? null : () => _runDiscovery(),
                  icon: const Icon(Icons.search),
                  label: Text(loading ? 'Menganalisis...' : 'Jalankan Analisis AI'),
                ),
                if (templates.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: templates.map((t) {
                      return ActionChip(
                        label: Text('${t['title']}', style: const TextStyle(fontSize: 11)),
                        onPressed: () {
                          category = '${t['category'] ?? 'All'}';
                          promptCtrl.text = '${t['prompt'] ?? ''}';
                          _runDiscovery(customPrompt: promptCtrl.text);
                        },
                      );
                    }).toList(),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        ...results.map((c) {
          final id = '${c['id']}';
          final isFav = favIds.contains(id);
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text('${c['name']}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                        IconButton(
                          onPressed: () => _toggleFav(id),
                          icon: Icon(isFav ? Icons.star : Icons.star_border,
                              color: Theme.of(context).colorScheme.primary),
                        ),
                      ],
                    ),
                    Text('${c['category']} • ${c['safety_rating'] ?? 'Aman'}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 6),
                    Text('${c['family_explanation'] ?? c['description'] ?? ''}'),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

class CalculatorPage extends StatefulWidget {
  const CalculatorPage({super.key});

  @override
  State<CalculatorPage> createState() => _CalculatorPageState();
}

class _CalculatorPageState extends State<CalculatorPage> {
  final smilesCtrl = TextEditingController(text: 'CCCCCCOCCOCCO');
  Map<String, dynamic>? result;

  Future<void> _calc() async {
    try {
      final res = await ApiClient.post('/api/calculator', {'smiles': smilesCtrl.text});
      setState(() => result = res);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: smilesCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Notasi SMILES',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 10),
                ElevatedButton.icon(
                  onPressed: _calc,
                  icon: const Icon(Icons.calculate),
                  label: const Text('Hitung Properti Lipinski'),
                ),
              ],
            ),
          ),
        ),
        if (result != null) ...[
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: result!['ok'] == true
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Berat Molekul: ${result!['molecular_weight']} g/mol'),
                        Text('LogP: ${result!['logp']}'),
                        Text('Donor H: ${result!['h_donors']} • Akseptor H: ${result!['h_acceptors']}'),
                        const SizedBox(height: 8),
                        Text(
                          result!['lipinski_pass'] == true
                              ? 'Memenuhi Aturan Lipinski'
                              : 'Melebihi batas Lipinski',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    )
                  : Text('${result!['error']}'),
            ),
          ),
        ],
      ],
    );
  }
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final msgCtrl = TextEditingController();
  final List<Map<String, String>> messages = [
    {'role': 'bot', 'text': 'Halo, saya Chety. Tanyakan apa saja seputar senyawa kimia aman, formulasi skincare, atau parameter molekul.'}
  ];

  Future<void> _send() async {
    final text = msgCtrl.text.trim();
    if (text.isEmpty) return;
    setState(() {
      messages.add({'role': 'user', 'text': text});
      msgCtrl.clear();
    });
    try {
      final res = await ApiClient.post('/api/chat', {'message': text});
      setState(() => messages.add({'role': 'bot', 'text': '${res['reply']}'}));
    } catch (e) {
      setState(() => messages.add({'role': 'bot', 'text': 'Tidak dapat terhubung ke server.'}));
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(14),
            itemCount: messages.length,
            itemBuilder: (_, i) {
              final m = messages[i];
              final isUser = m['role'] == 'user';
              return Align(
                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isUser ? primary : Theme.of(context).cardTheme.color,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(m['text'] ?? '',
                      style: TextStyle(color: isUser ? Colors.white : null)),
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: msgCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Tulis pertanyaan kimia...',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: (_) => _send(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(onPressed: _send, icon: const Icon(Icons.send)),
            ],
          ),
        ),
      ],
    );
  }
}

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key});

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  List<dynamic> history = [];
  List<dynamic> favorites = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final hRes = await ApiClient.get('/api/history');
      final fRes = await ApiClient.get('/api/favorites');
      setState(() {
        history = (hRes['history'] as List?) ?? [];
        favorites = (fRes['favorites'] as List?) ?? [];
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Senyawa Favorit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          if (favorites.isEmpty) const Text('Belum ada senyawa favorit.'),
          ...favorites.map((c) => Card(
                child: ListTile(
                  title: Text('${c['name']}'),
                  subtitle: Text('${c['category']} • ${c['safety_rating'] ?? 'Aman'}'),
                ),
              )),
          const SizedBox(height: 18),
          const Text('Riwayat Penemuan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          if (history.isEmpty) const Text('Belum ada riwayat penemuan.'),
          ...history.map((h) => Card(
                child: ListTile(
                  title: Text('${h['id']} • ${h['category']}'),
                  subtitle: Text('${h['prompt_text']} (${h['createdAt']})'),
                ),
              )),
        ],
      ),
    );
  }
}
