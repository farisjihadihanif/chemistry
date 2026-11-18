import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import '../widgets/result_card.dart';
import 'discover.dart';

class ResultScreen extends StatefulWidget {
  const ResultScreen({super.key, required this.id, this.initial});
  final String id;
  final Json? initial;
  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  Json? d;
  String? error;
  @override
  void initState() {
    super.initState();
    d = widget.initial;
    if (d == null) {
      api
          .get('/discoveries/${widget.id}')
          .then((r) {
            if (mounted) setState(() => d = r['discovery'] as Json);
          })
          .catchError((Object e) {
            if (mounted) setState(() => error = e.toString());
          });
    }
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Hapus hasil ini dari riwayat?'),
        content: const Text(
          'Senyawa yang sudah disimpan ke favorit tidak ikut terhapus.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await api.delete('/discoveries/${widget.id}');
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) toast(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(d?['judul'] as String? ?? 'Hasil'),
        actions: [
          if (d != null)
            PopupMenuButton<String>(
              onSelected: (v) {
                if (v == 'ubah') {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => DiscoverScreen(prefill: d),
                    ),
                  );
                } else {
                  _delete();
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'ubah', child: Text('Ubah kriteria')),
                PopupMenuItem(
                  value: 'hapus',
                  child: Text('Hapus dari riwayat'),
                ),
              ],
            ),
        ],
      ),
      body: error != null
          ? EmptyState(title: 'Hasil tidak ditemukan', body: error)
          : d == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
              children: [
                Muted(
                  '${timeAgo(d!['createdAt'] as String)} · ${d!['mode'] == 'kalimat' ? 'dari kalimat' : 'dari kriteria'}',
                ),
                if ((d!['prompt'] ?? '').toString().isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 10),
                    padding: const EdgeInsets.only(left: 10),
                    decoration: BoxDecoration(
                      border: Border(left: BorderSide(color: p.line, width: 2)),
                    ),
                    child: Text(
                      d!['prompt'] as String,
                      style: TextStyle(color: p.inkSoft),
                    ),
                  ),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Kriteria',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 6),
                        for (final e in (d!['criteria'] as Map).entries)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    st.label(e.key as String),
                                    style: TextStyle(
                                      color: p.inkSoft,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                                Text(
                                  rangeText(
                                    e.value as Map,
                                    st.unit(e.key as String),
                                  ),
                                  style: mono(context, size: 13),
                                ),
                              ],
                            ),
                          ),
                        if ((d!['excludeGroups'] as List).isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Muted(
                              'Tanpa gugus ${(d!['excludeGroups'] as List).map((g) => st.groupLabel(g as String).toLowerCase()).join(', ')}.',
                            ),
                          ),
                        if ((d!['includeGroups'] as List).isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Muted(
                              'Harus ada gugus ${(d!['includeGroups'] as List).map((g) => st.groupLabel(g as String).toLowerCase()).join(', ')}.',
                            ),
                          ),
                        const Divider(height: 20),
                        Row(
                          children: [
                            Text(
                              fmtInt(d!['matched'] as num),
                              style: mono(
                                context,
                                size: 22,
                                color: p.cobalt,
                                weight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Muted(
                                'senyawa di pustaka memenuhi semua kriteria',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                if ((d!['ringkasan'] ?? '').toString().isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: Text(
                      d!['ringkasan'] as String,
                      style: TextStyle(color: p.inkSoft, height: 1.5),
                    ),
                  ),
                const SizedBox(height: 14),
                const _Legend(),
                const SizedBox(height: 18),
                Text(
                  'Senyawa yang sudah dikenal',
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const Muted('Diurutkan menurut skor kecocokan.'),
                const SizedBox(height: 10),
                if ((d!['known'] as List).isEmpty)
                  const EmptyState(
                    title: 'Tidak ada senyawa yang cocok',
                    body: 'Coba longgarkan rentang atau kurangi gugus yang dihindari.',
                  ),
                for (final c in (d!['known'] as List).cast<Json>())
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: ResultCard(c: c, criteria: d!['criteria'] as Map),
                  ),
                if ((d!['novel'] as List).isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(
                    'Kandidat senyawa baru',
                    style: Theme.of(context).textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const Muted(
                    'Semua sifatnya nilai perkiraan, perlu dikonfirmasi lewat sintesis dan uji laboratorium.',
                  ),
                  const SizedBox(height: 10),
                  for (final c in (d!['novel'] as List).cast<Json>())
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ResultCard(c: c, criteria: d!['criteria'] as Map),
                    ),
                ],
              ],
            ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend();
  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    Widget sw(Color c) => Container(
      width: 12,
      height: 10,
      decoration: BoxDecoration(
        color: c,
        borderRadius: BorderRadius.circular(2),
      ),
    );
    return Wrap(
      spacing: 14,
      runSpacing: 6,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            SourceDot('eksperimen'),
            SizedBox(width: 5),
            Muted('eksperimen', size: 12),
          ],
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            SourceDot('prediksi'),
            SizedBox(width: 5),
            Muted('perkiraan', size: 12),
          ],
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Muted('skor ', size: 12),
            sw(p.indLow),
            const SizedBox(width: 2),
            sw(p.indMid),
            const SizedBox(width: 2),
            sw(p.indHigh),
            const Muted(' rendah → tinggi', size: 12),
          ],
        ),
      ],
    );
  }
}
