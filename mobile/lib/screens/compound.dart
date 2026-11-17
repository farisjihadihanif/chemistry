import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import '../widgets/result_card.dart';
import 'assistant.dart';

/// Halaman senyawa: dari pustaka (cid) atau struktur bebas (smiles -> dihitung/diprediksi).
class CompoundScreen extends StatefulWidget {
  const CompoundScreen({super.key, this.cid, this.smiles});
  final int? cid;
  final String? smiles;
  @override
  State<CompoundScreen> createState() => _CompoundScreenState();
}

class _CompoundScreenState extends State<CompoundScreen> {
  Json? c;
  String? error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = widget.cid != null ? await api.get('/compounds/${widget.cid}') : await api.post('/compounds/analyze', {'smiles': widget.smiles});
      if (mounted) setState(() => c = r['compound'] as Json);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(c == null ? 'Senyawa' : compoundTitle(c!))),
      body: error != null
          ? EmptyState(title: 'Senyawa tidak bisa dimuat', body: error)
          : c == null
              ? const Center(child: CircularProgressIndicator())
              : ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 32), children: [CompoundBody(c: c!)]),
    );
  }
}

class CompoundBody extends StatelessWidget {
  const CompoundBody({super.key, required this.c});
  final Json c;
  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    final fav = st.favKeys.contains(keyOf(c));
    final props = (c['properties'] as Map?) ?? {};
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Card(child: Padding(padding: const EdgeInsets.all(8), child: StructureImage(c['smiles'] as String, w: 640, h: 480))),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: Text(c['smiles'] as String, style: mono(context, size: 11, color: p.inkMute))),
        IconButton(
          tooltip: 'Salin SMILES',
          icon: const Icon(Icons.copy, size: 18),
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: c['smiles'] as String));
            if (context.mounted) toast(context, 'SMILES disalin.');
          },
        ),
      ]),
      Text(compoundTitle(c), style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
      if ((c['iupac'] ?? '').toString().isNotEmpty && c['iupac'].toString().toLowerCase() != c['name'].toString().toLowerCase()) Muted(c['iupac'] as String),
      const SizedBox(height: 6),
      Row(children: [
        FormulaText(c['formula'] as String?, size: 16),
        if (c['cid'] != null) ...[
          const SizedBox(width: 10),
          TextButton(onPressed: () => launchUrl(Uri.parse('https://pubchem.ncbi.nlm.nih.gov/compound/${c['cid']}'), mode: LaunchMode.externalApplication), child: Text('PubChem CID ${c['cid']}')),
        ],
      ]),
      GroupTags(c['groups'] as List?, max: 10),
      if (c['in_library'] != true)
        Container(
          margin: const EdgeInsets.only(top: 12),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: p.cobaltSoft, borderRadius: BorderRadius.circular(6)),
          child: Text('Struktur ini tidak ada di pustaka. Semua sifat fisiknya prediksi model${c['synth_score'] != null ? ', dengan perkiraan kesulitan sintesis ${c['synth_score']} dari 10' : ''}.', style: const TextStyle(fontSize: 13)),
        ),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        OutlinedButton.icon(onPressed: () async {
          final m = await st.toggleFav(c);
          if (context.mounted) toast(context, m);
        }, icon: Icon(fav ? Icons.favorite : Icons.favorite_border, size: 18, color: fav ? p.danger : null), label: Text(fav ? 'Favorit' : 'Simpan')),
        OutlinedButton.icon(
          onPressed: () {
            final m = st.toggleCompare(c);
            if (m != null) toast(context, m);
          },
          icon: const Icon(Icons.view_column_outlined, size: 18),
          label: Text(st.inCompare(c) ? 'Dibandingkan' : 'Bandingkan'),
        ),
        OutlinedButton.icon(onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AssistantScreen(smiles: c['smiles'] as String?))), icon: const Icon(Icons.chat_bubble_outline, size: 18), label: const Text('Tanya asisten')),
      ]),
      const SizedBox(height: 16),
      for (final k in st.allKeys)
        if (props[k] != null)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: p.line))),
            child: Row(children: [
              Expanded(child: Text(st.label(k), style: TextStyle(color: p.inkSoft, fontSize: 14))),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                PropValue(k: k, p: props[k] as Json, size: 14),
                if (props[k]['source'] == 'prediksi' && props[k]['low'] != null)
                  Text('${fmtValue(asNum(props[k]['low']), k)} – ${fmtValue(asNum(props[k]['high']), k)}', style: mono(context, size: 11, color: p.inkMute)),
              ]),
            ]),
          ),
      const SizedBox(height: 8),
      const Muted('Bulat penuh = data eksperimen PubChem, bulat kosong = prediksi model. Rentang kecil di bawah nilai prediksi = sebaran antar pohon model.', size: 12),
      if (c['cid'] != null) ...[const SizedBox(height: 24), Text('Keselamatan', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)), const SizedBox(height: 8), Hazards(cid: c['cid'] as int)],
      if ((c['similar'] as List?)?.isNotEmpty == true) ...[
        const SizedBox(height: 24),
        Text('Senyawa mirip di pustaka', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        SizedBox(
          height: 150,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: (c['similar'] as List).length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final s = (c['similar'] as List)[i] as Json;
              return SizedBox(
                width: 130,
                child: Card(
                  child: InkWell(
                    onTap: () => openCompound(context, s),
                    child: Padding(
                      padding: const EdgeInsets.all(6),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        StructureImage(s['smiles'] as String, w: 240, h: 180),
                        const SizedBox(height: 4),
                        Text((s['name'] ?? s['formula']).toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                        Text('${((s['similarity'] as num) * 100).round()}% mirip', style: mono(context, size: 11, color: p.inkMute)),
                      ]),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    ]);
  }
}

class Hazards extends StatefulWidget {
  const Hazards({super.key, required this.cid});
  final int cid;
  @override
  State<Hazards> createState() => _HazardsState();
}

class _HazardsState extends State<Hazards> {
  Json? data;
  String? error;
  @override
  void initState() {
    super.initState();
    api.get('/compounds/${widget.cid}/hazards').then((r) {
      if (mounted) setState(() => data = r['hazards'] as Json);
    }).catchError((Object e) {
      if (mounted) setState(() => error = e.toString());
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    if (error != null) return Muted(error!);
    if (data == null) return const LinearProgressIndicator();
    final picto = (data!['pictograms'] as List?) ?? [];
    final stmts = (data!['statements'] as List?) ?? [];
    if (data!['none'] == true || (picto.isEmpty && stmts.isEmpty)) {
      return const Muted('PubChem tidak mencantumkan klasifikasi bahaya GHS untuk senyawa ini. Itu belum tentu berarti aman; periksa SDS dari pemasok.');
    }
    final signal = (data!['signal'] ?? '').toString();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
        if (signal.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: signal == 'Bahaya' ? p.danger : p.indLow, borderRadius: BorderRadius.circular(4)),
            child: Text(signal, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        for (final x in picto)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(border: Border.all(color: p.danger.withValues(alpha: 0.5)), borderRadius: BorderRadius.circular(4)),
            child: Text('${x['code']} · ${x['label']}', style: TextStyle(fontSize: 12, color: p.inkSoft)),
          ),
      ]),
      const SizedBox(height: 8),
      for (final s in stmts.take(10))
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 48, child: Text('${s['code']}', style: mono(context, size: 12, color: p.inkMute))),
            Expanded(child: Text('${s['text']}', style: const TextStyle(fontSize: 13))),
          ]),
        ),
      const SizedBox(height: 4),
      const Muted('Sumber: klasifikasi GHS di PubChem. Pernyataan bahaya ditampilkan dalam bahasa aslinya.', size: 11),
    ]);
  }
}
