import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../widgets/chem.dart';
import '../widgets/result_card.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});
  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  final q = TextEditingController();
  List<Json>? items;
  bool busy = false;
  String? error;

  @override
  void dispose() {
    q.dispose();
    super.dispose();
  }

  Future<void> search() async {
    final v = q.text.trim();
    if (v.isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final r = await api.get('/compounds/search', query: {'q': v});
      if (mounted) setState(() => items = ((r['items'] as List?) ?? []).cast<Json>());
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Pustaka senyawa')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
        Muted('${st.meta == null ? 'Ribuan' : fmtInt(st.meta!['compounds'] as num)} senyawa organik dengan data sifat eksperimen dari PubChem. Cari dengan nama (bahasa Inggris), rumus, atau CID.', size: 14),
        const SizedBox(height: 12),
        TextField(
          controller: q,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => search(),
          decoration: InputDecoration(hintText: 'mis. glycol, C8H18, 702', suffixIcon: IconButton(onPressed: search, icon: const Icon(Icons.search), tooltip: 'Cari')),
        ),
        ErrorText(error),
        const SizedBox(height: 12),
        if (busy) const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
        if (!busy && items != null && items!.isEmpty) EmptyState(title: '"${q.text}" tidak ditemukan', body: 'Coba nama dalam bahasa Inggris, atau cari lewat Kalkulator dengan SMILES.'),
        if (!busy && items != null)
          for (final c in items!)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () => openCompound(context, c),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Row(children: [
                      SizedBox(width: 92, child: StructureImage(c['smiles'] as String, w: 184, h: 138)),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text((c['name'] ?? '').toString(), style: const TextStyle(fontWeight: FontWeight.w600), maxLines: 2, overflow: TextOverflow.ellipsis),
                          FormulaText(c['formula'] as String?),
                          if (c['cid'] != null) Muted('CID ${c['cid']}', size: 12),
                          const SizedBox(height: 4),
                          GroupTags(c['groups'] as List?, max: 3),
                        ]),
                      ),
                    ]),
                  ),
                ),
              ),
            ),
      ]),
    );
  }
}
