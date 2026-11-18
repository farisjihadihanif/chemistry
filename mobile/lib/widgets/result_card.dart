import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../state.dart';
import '../theme.dart';
import '../screens/compound.dart';
import '../screens/assistant.dart';
import 'chem.dart';

const novelty = {
  'belum_terdaftar': 'Struktur baru',
  'terdaftar': 'Struktur sudah dikenal, sifatnya diperkirakan',
  'tidak_dicek': 'Status struktur belum dicek',
};

void openCompound(BuildContext context, Json c) {
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => CompoundScreen(
        cid: c['cid'] as int?,
        smiles: c['cid'] == null ? c['smiles'] as String? : null,
      ),
    ),
  );
}

class ResultCard extends StatelessWidget {
  const ResultCard({super.key, required this.c, required this.criteria});
  final Json c;
  final Map criteria;

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    final fav = st.favKeys.contains(keyOf(c));
    final novel = c['in_library'] != true && c['origin'] != 'pustaka';
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => openCompound(context, c),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 96,
                    decoration: BoxDecoration(
                      color: p.sunk.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    padding: const EdgeInsets.all(2),
                    child: StructureImage(
                      c['smiles'] as String,
                      w: 192,
                      h: 144,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            ScoreBadge(c['score'] as num?),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                compoundTitle(c),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 15,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(children: [FormulaText(c['formula'] as String?)]),
                        const SizedBox(height: 6),
                        GroupTags(c['groups'] as List?, max: 3),
                      ],
                    ),
                  ),
                ],
              ),
              if (novel) ...[
                const SizedBox(height: 8),
                Muted(
                  [
                    c['origin'] == 'gemini'
                        ? 'Rancangan otomatis'
                        : 'Turunan ${c['parent']?['name'] ?? 'senyawa induk'}: ${(c['rule'] ?? '').toString().toLowerCase()}',
                    if (novelty[c['novelty']] != null) novelty[c['novelty']]!,
                    if (c['synth_score'] != null)
                      'kesulitan sintesis ${c['synth_score']}/10',
                  ].join(' · '),
                  size: 12,
                ),
              ],
              const SizedBox(height: 10),
              for (final e in criteria.entries)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              st.label(e.key as String),
                              style: TextStyle(fontSize: 12, color: p.inkMute),
                            ),
                          ),
                          PropValue(
                            k: e.key as String,
                            p: (c['properties'] as Map?)?[e.key] as Json?,
                            size: 12,
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      RangeBar(
                        k: e.key as String,
                        p: (c['properties'] as Map?)?[e.key] as Json?,
                        c: e.value as Map,
                      ),
                    ],
                  ),
                ),
              if ((c['alasan'] ?? '').toString().isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  c['alasan'] as String,
                  style: TextStyle(
                    fontSize: 13.5,
                    height: 1.45,
                    color: p.inkSoft,
                  ),
                ),
              ],
              const SizedBox(height: 4),
              Wrap(
                spacing: 0,
                children: [
                  TextButton.icon(
                    onPressed: () async {
                      final m = await st.toggleFav(c);
                      if (context.mounted) toast(context, m);
                    },
                    icon: Icon(
                      fav ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                      color: fav ? p.danger : null,
                    ),
                    label: Text(
                      fav ? 'Favorit' : 'Simpan',
                      style: TextStyle(color: fav ? p.danger : null),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {
                      final msg = st.toggleCompare(c);
                      if (msg != null) toast(context, msg);
                    },
                    icon: Icon(
                      st.inCompare(c)
                          ? Icons.view_column
                          : Icons.view_column_outlined,
                      size: 18,
                    ),
                    label: Text(
                      st.inCompare(c) ? 'Dibandingkan' : 'Bandingkan',
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) =>
                            AssistantScreen(smiles: c['smiles'] as String?),
                      ),
                    ),
                    icon: const Icon(Icons.chat_bubble_outline, size: 18),
                    label: const Text('Tanya'),
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
