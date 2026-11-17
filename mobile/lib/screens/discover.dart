import 'dart:async';
import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import 'result.dart';

const _examples = [
  'Pelarut untuk tinta cetak yang tidak terlalu cepat menguap, titik nyala di atas 40 °C, dan tanpa halogen.',
  'Cairan pendingin mesin yang tetap cair sampai -30 °C dan baru mendidih di atas 180 °C.',
  'Ester berat molekul sedang untuk plasticizer PVC yang hampir tidak menguap.',
];
const _steps = ['Menyaring pustaka senyawa PubChem', 'Merancang dan memprediksi kandidat baru', 'Menyusun alasan untuk tiap senyawa'];

class _Crit {
  _Crit({String min = '', String max = '', this.weight = 1}) : min = TextEditingController(text: min), max = TextEditingController(text: max);
  final TextEditingController min, max;
  int weight;
  void dispose() {
    min.dispose();
    max.dispose();
  }
}

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key, this.prefill});
  final Json? prefill;
  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  String mode = 'form';
  String preset = '';
  final Map<String, _Crit> crit = {};
  List<String> include = [], exclude = [];
  final prompt = TextEditingController();
  bool novel = true, busy = false;
  int step = 0;
  String? error;
  Timer? _t1, _t2;

  @override
  void initState() {
    super.initState();
    final p = widget.prefill;
    if (p != null) {
      preset = (p['preset'] ?? '').toString();
      (p['criteria'] as Map?)?.forEach((k, v) => crit[k as String] = _Crit(min: v['min']?.toString() ?? '', max: v['max']?.toString() ?? '', weight: (v['weight'] as num?)?.toInt() ?? 1));
      include = ((p['includeGroups'] as List?) ?? []).cast<String>().toList();
      exclude = ((p['excludeGroups'] as List?) ?? []).cast<String>().toList();
    }
  }

  @override
  void dispose() {
    for (final c in crit.values) {
      c.dispose();
    }
    prompt.dispose();
    _t1?.cancel();
    _t2?.cancel();
    super.dispose();
  }

  void applyPreset(Json p) {
    setState(() {
      preset = p['id'] as String;
      for (final c in crit.values) {
        c.dispose();
      }
      crit.clear();
      (p['criteria'] as Map).forEach((k, v) => crit[k as String] = _Crit(min: v['min']?.toString() ?? '', max: v['max']?.toString() ?? '', weight: (v['weight'] as num?)?.toInt() ?? 1));
      include = ((p['include_groups'] as List?) ?? []).cast<String>().toList();
      exclude = ((p['exclude_groups'] as List?) ?? []).cast<String>().toList();
    });
  }

  String? modelNote(AppState st, String k) {
    final t = st.meta?['targets']?[k];
    if (t == null || t['experimental'] == null) return null;
    final mae = asNum(t['mae']) ?? 0;
    final err = t['log'] == true ? '±${math.pow(10, mae).toStringAsFixed(1).replaceAll('.', ',')}×' : '±${k == 'density' ? fmtValue(mae, k) : mae.round()} ${t['unit']}';
    return '${fmtInt(t['experimental'] as num)} data eksperimen · galat prediksi rata-rata $err';
  }

  bool get canSubmit {
    final st = AppScope.read(context);
    if (mode == 'kalimat') return prompt.text.trim().length >= 10 && st.meta?['ai'] == true;
    return crit.values.any((c) => c.min.text.trim().isNotEmpty || c.max.text.trim().isNotEmpty);
  }

  Future<void> submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
      step = 0;
    });
    _t1 = Timer(const Duration(milliseconds: 2500), () => mounted ? setState(() => step = 1) : null);
    _t2 = Timer(const Duration(seconds: 9), () => mounted ? setState(() => step = 2) : null);
    try {
      final body = mode == 'kalimat'
          ? {'mode': mode, 'prompt': prompt.text.trim(), 'novel': novel}
          : {
              'mode': mode,
              'preset': preset,
              'criteria': {for (final e in crit.entries) e.key: {'min': e.value.min.text.trim().replaceAll(',', '.'), 'max': e.value.max.text.trim().replaceAll(',', '.'), 'weight': e.value.weight}},
              'includeGroups': include,
              'excludeGroups': exclude,
              'novel': novel,
            };
      final r = await api.post('/discoveries', body, const Duration(seconds: 150));
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => ResultScreen(id: r['discovery']['_id'] as String, initial: r['discovery'] as Json)));
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      _t1?.cancel();
      _t2?.cancel();
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    final meta = st.meta;
    if (meta == null) {
      return Scaffold(appBar: AppBar(title: const Text('Temukan senyawa')), body: EmptyState(title: 'Data belum termuat', body: st.metaError, action: OutlinedButton(onPressed: st.loadMeta, child: const Text('Coba lagi'))));
    }
    final unused = st.allKeys.where((k) => !crit.containsKey(k)).toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Temukan senyawa')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        Muted('Cari di ${fmtInt(meta['compounds'] as num)} senyawa PubChem, lalu dapatkan kandidat baru yang sifatnya diprediksi model.', size: 14),
        const SizedBox(height: 14),
        SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'form', label: Text('Isi kriteria')), ButtonSegment(value: 'kalimat', label: Text('Tulis kebutuhan'))],
          selected: {mode},
          showSelectedIcon: false,
          onSelectionChanged: (s) => setState(() => mode = s.first),
        ),
        const SizedBox(height: 16),
        if (mode == 'kalimat') ...[
          TextField(controller: prompt, minLines: 4, maxLines: 8, maxLength: 2000, onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: 'Untuk apa senyawanya dipakai, suhu kerja, kekentalan, dan apa yang harus dihindari.')),
          if (meta['ai'] != true) Text('Mode ini butuh fitur AI yang belum aktif di server. Pakai mode Isi kriteria.', style: TextStyle(color: p.danger, fontSize: 13)),
          const Text('Contoh', style: TextStyle(fontWeight: FontWeight.w600)),
          for (final x in _examples)
            InkWell(
              onTap: () => setState(() => prompt.text = x),
              child: Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text(x, style: TextStyle(color: p.inkSoft, fontSize: 14))),
            ),
        ] else ...[
          const Text('Mulai dari kebutuhan umum', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 6, children: [
            for (final pr in (meta['presets'] as List).cast<Json>())
              ChoiceChip(label: Text(pr['name'] as String), selected: preset == pr['id'], onSelected: (_) => applyPreset(pr)),
          ]),
          if (preset.isNotEmpty) ...[
            const SizedBox(height: 6),
            Muted(((meta['presets'] as List).cast<Json>().firstWhere((x) => x['id'] == preset, orElse: () => {'description': ''})['description'] ?? '').toString()),
          ],
          const SizedBox(height: 14),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Column(children: [
                if (crit.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Muted('Pilih kebutuhan umum di atas, atau tambahkan sifat satu per satu.')),
                for (final e in crit.entries) _row(st, e.key, e.value),
                if (unused.isNotEmpty)
                  Align(
                    alignment: Alignment.centerLeft,
                    child: PopupMenuButton<String>(
                      onSelected: (k) => setState(() => crit[k] = _Crit()),
                      itemBuilder: (_) => [for (final k in unused) PopupMenuItem(value: k, child: Text(st.label(k)))],
                      child: Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.add, size: 18, color: p.cobalt), const SizedBox(width: 6), Text('Tambah sifat', style: TextStyle(color: p.cobalt, fontWeight: FontWeight.w600))])),
                    ),
                  ),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          _groups(st, 'Harus memiliki gugus', include, exclude),
          const SizedBox(height: 12),
          _groups(st, 'Hindari gugus', exclude, include),
        ],
        const SizedBox(height: 12),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: novel,
          onChanged: (v) => setState(() => novel = v ?? true),
          title: const Text('Sertakan kandidat senyawa baru', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text('Sifatnya prediksi, bukan hasil uji.', style: TextStyle(color: p.inkMute, fontSize: 13)),
        ),
        ErrorText(error),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: busy || !canSubmit ? null : submit,
          icon: busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.search),
          label: Text(busy ? 'Mencari…' : 'Cari senyawa'),
        ),
        if (busy) ...[
          const SizedBox(height: 12),
          for (var i = 0; i < _steps.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(_steps[i], style: TextStyle(fontSize: 13, color: i == step ? p.ink : p.inkMute, fontWeight: i == step ? FontWeight.w600 : FontWeight.normal, decoration: i < step ? TextDecoration.lineThrough : null)),
            ),
        ],
      ]),
    );
  }

  Widget _row(AppState st, String k, _Crit c) {
    final p = Palette.of(context);
    final note = modelNote(st, k);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: p.line))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text('${st.label(k)}${st.unit(k).isNotEmpty ? ' (${st.unit(k)})' : ''}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
          IconButton(
            visualDensity: VisualDensity.compact,
            tooltip: 'Hapus kriteria',
            icon: const Icon(Icons.close, size: 18),
            onPressed: () => setState(() => crit.remove(k)?.dispose()),
          ),
        ]),
        Row(children: [
          Expanded(child: TextField(controller: c.min, keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true), decoration: const InputDecoration(hintText: 'min'), style: mono(context, size: 14), onChanged: (_) => setState(() {}))),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: c.max, keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true), decoration: const InputDecoration(hintText: 'maks'), style: mono(context, size: 14), onChanged: (_) => setState(() {}))),
          const SizedBox(width: 8),
          DropdownButton<int>(
            value: c.weight,
            underline: const SizedBox.shrink(),
            items: const [DropdownMenuItem(value: 1, child: Text('Biasa')), DropdownMenuItem(value: 2, child: Text('Penting')), DropdownMenuItem(value: 3, child: Text('Sangat'))],
            onChanged: (v) => setState(() => c.weight = v ?? 1),
          ),
        ]),
        if (note != null) Padding(padding: const EdgeInsets.only(top: 4), child: Muted(note, size: 11)),
      ]),
    );
  }

  Widget _groups(AppState st, String title, List<String> value, List<String> other) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 6),
      Wrap(spacing: 6, runSpacing: 6, children: [
        for (final g in st.groups)
          FilterChip(
            label: Text(g['label'] as String),
            selected: value.contains(g['id']),
            onSelected: other.contains(g['id']) ? null : (on) => setState(() => on ? value.add(g['id'] as String) : value.remove(g['id'])),
          ),
      ]),
    ]);
  }
}
