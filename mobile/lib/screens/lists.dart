import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import '../widgets/result_card.dart';
import 'result.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Json>? items;
  String? error;
  int page = 1, pages = 1;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load({bool more = false}) async {
    try {
      final r = await api.get(
        '/discoveries',
        query: {'page': '${more ? page + 1 : 1}'},
      );
      if (!mounted) return;
      setState(() {
        final list = ((r['items'] as List?) ?? []).cast<Json>();
        items = more ? [...?items, ...list] : list;
        page = r['page'] as int;
        pages = r['pages'] as int;
      });
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat pencarian')),
      body: error != null
          ? EmptyState(title: 'Riwayat tidak bisa dimuat', body: error)
          : items == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: load,
              child: items!.isEmpty
                  ? ListView(
                      children: const [
                        EmptyState(
                          title: 'Belum ada pencarian',
                          body: 'Setiap pencarian tersimpan di sini lengkap dengan hasilnya.',
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: items!.length + (page < pages ? 1 : 0),
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (_, i) {
                        if (i == items!.length) {
                          return OutlinedButton(
                            onPressed: () => load(more: true),
                            child: const Text('Muat lebih banyak'),
                          );
                        }
                        final d = items![i];
                        return Card(
                          child: ListTile(
                            title: Text(
                              d['judul'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            subtitle: Text(
                              '${(d['criteria'] as Map).keys.map((k) => st.label(k as String)).join(' · ')}\n${timeAgo(d['createdAt'] as String)} · ${d['knownCount']} dikenal${(d['novelCount'] as int) > 0 ? ', ${d['novelCount']} kandidat baru' : ''}',
                            ),
                            isThreeLine: true,
                            trailing: (d['top'] as List).isNotEmpty
                                ? ScoreBadge(
                                    (d['top'] as List).first['score'] as num?,
                                  )
                                : null,
                            onTap: () async {
                              final deleted = await Navigator.of(context)
                                  .push<bool>(
                                    MaterialPageRoute(
                                      builder: (_) =>
                                          ResultScreen(id: d['_id'] as String),
                                    ),
                                  );
                              if (deleted == true) load();
                            },
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});
  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Json>? items;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final r = await api.get('/favorites', query: {'limit': '100'});
      if (mounted) {
        setState(() => items = ((r['items'] as List?) ?? []).cast<Json>());
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  Future<void> edit(Json f) async {
    final note = TextEditingController(text: f['catatan'] as String? ?? '');
    final tags = TextEditingController(
      text: ((f['tags'] as List?) ?? []).join(', '),
    );
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (c) => Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          MediaQuery.of(c).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Catatan untuk ${compoundTitle(f['compound'] as Json)}',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: note,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(
                hintText: 'Rencana uji, pemasok, dll.',
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: tags,
              decoration: const InputDecoration(hintText: 'Tag, pisahkan koma'),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Simpan catatan'),
            ),
          ],
        ),
      ),
    );
    if (ok == true) {
      try {
        await api.patch('/favorites/${f['_id']}', {
          'catatan': note.text,
          'tags': tags.text
              .split(',')
              .map((t) => t.trim())
              .where((t) => t.isNotEmpty)
              .toList(),
        });
        await load();
      } catch (e) {
        if (mounted) toast(context, e.toString());
      }
    }
    note.dispose();
    tags.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Favorit')),
      body: error != null
          ? EmptyState(title: 'Favorit tidak bisa dimuat', body: error)
          : items == null
          ? const Center(child: CircularProgressIndicator())
          : items!.isEmpty
          ? const EmptyState(
              title: 'Belum ada favorit',
              body: 'Simpan senyawa dari hasil pencarian atau halaman senyawa.',
            )
          : RefreshIndicator(
              onRefresh: load,
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: items!.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final f = items![i];
                  final c = f['compound'] as Json;
                  return Card(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () => openCompound(context, c),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 88,
                              child: StructureImage(
                                c['smiles'] as String,
                                w: 176,
                                h: 132,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    compoundTitle(c),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  FormulaText(c['formula'] as String?),
                                  if ((f['catatan'] ?? '')
                                      .toString()
                                      .isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        f['catatan'] as String,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: p.inkSoft,
                                        ),
                                      ),
                                    ),
                                  if ((f['tags'] as List).isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Muted(
                                        (f['tags'] as List)
                                            .map((t) => '#$t')
                                            .join(' '),
                                        size: 12,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Column(
                              children: [
                                IconButton(
                                  tooltip: 'Catatan',
                                  icon: const Icon(Icons.edit_note),
                                  onPressed: () => edit(f),
                                ),
                                IconButton(
                                  tooltip: 'Hapus dari favorit',
                                  icon: Icon(
                                    Icons.delete_outline,
                                    color: p.danger,
                                  ),
                                  onPressed: () async {
                                    await st.toggleFav(c);
                                    load();
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}

class CompareScreen extends StatelessWidget {
  const CompareScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    final list = st.compare;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bandingkan'),
        actions: [
          if (list.isNotEmpty)
            TextButton(
              onPressed: () {
                for (final c in [...list]) {
                  st.toggleCompare(c);
                }
              },
              child: const Text('Kosongkan'),
            ),
        ],
      ),
      body: list.isEmpty
          ? const EmptyState(
              title: 'Belum ada senyawa yang dipilih',
              body: 'Tekan Bandingkan pada hasil pencarian atau halaman senyawa. Bisa sampai 3 senyawa.',
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              scrollDirection: Axis.vertical,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Table(
                  defaultColumnWidth: const FixedColumnWidth(120),
                  columnWidths: const {0: FixedColumnWidth(130)},
                  border: TableBorder(
                    horizontalInside: BorderSide(color: p.line),
                  ),
                  children: [
                    TableRow(
                      children: [
                        const SizedBox.shrink(),
                        for (final c in list)
                          Padding(
                            padding: const EdgeInsets.only(right: 8, bottom: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                StructureImage(
                                  c['smiles'] as String,
                                  w: 240,
                                  h: 180,
                                ),
                                Text(
                                  compoundTitle(c),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                FormulaText(c['formula'] as String?, size: 12),
                              ],
                            ),
                          ),
                      ],
                    ),
                    for (final k in st.allKeys)
                      TableRow(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              st.label(k),
                              style: TextStyle(fontSize: 13, color: p.inkSoft),
                            ),
                          ),
                          for (final c in list)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: PropValue(
                                k: k,
                                p: (c['properties'] as Map?)?[k] as Json?,
                                size: 13,
                              ),
                            ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
    );
  }
}
