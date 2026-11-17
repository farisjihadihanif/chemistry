import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import 'compound.dart';

const _examples = [
  ['Etil laktat', 'ethyl lactate'],
  ['Limonena', 'limonene'],
  ['Triasetin', 'triacetin'],
  ['Dioktil adipat (SMILES)', 'CCCCCCCCOC(=O)CCCCC(=O)OCCCCCCCC'],
];

bool looksSmiles(String v) => !v.contains(' ') && RegExp(r'[=#()\[\]@\d]').hasMatch(v) || RegExp(r'^[CNOcnosSPFI]+$').hasMatch(v) && !RegExp(r'^[a-z]{4,}$', caseSensitive: false).hasMatch(v);

class CalculatorScreen extends StatefulWidget {
  const CalculatorScreen({super.key});
  @override
  State<CalculatorScreen> createState() => _CalculatorScreenState();
}

class _CalculatorScreenState extends State<CalculatorScreen> {
  final input = TextEditingController();
  Json? result;
  String? error;
  bool busy = false;

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> run(String value) async {
    final v = value.trim();
    if (v.isEmpty) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final r = await api.post('/compounds/analyze', looksSmiles(v) ? {'smiles': v} : {'name': v});
      if (mounted) setState(() => result = r['compound'] as Json);
    } catch (e) {
      if (mounted) {
        setState(() {
          result = null;
          error = e.toString();
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Kalkulator sifat')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
        const Muted('Masukkan nama senyawa (bahasa Inggris) atau SMILES. Kalau ada di pustaka, yang tampil data eksperimen; kalau tidak, sifatnya diprediksi model.', size: 14),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: TextField(
              controller: input,
              autocorrect: false,
              textInputAction: TextInputAction.search,
              onSubmitted: run,
              style: mono(context, size: 14),
              decoration: const InputDecoration(hintText: 'ethyl lactate atau CCOC(=O)C(C)O'),
            ),
          ),
          const SizedBox(width: 8),
          FilledButton(onPressed: busy ? null : () => run(input.text), child: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Hitung')),
        ]),
        const SizedBox(height: 8),
        Wrap(spacing: 4, children: [
          for (final e in _examples)
            TextButton(
              onPressed: () {
                input.text = e[1];
                run(e[1]);
              },
              child: Text(e[0]),
            ),
        ]),
        ErrorText(error),
        if (result != null) ...[const SizedBox(height: 12), Divider(color: p.line), const SizedBox(height: 12), CompoundBody(c: result!)],
      ]),
    );
  }
}
