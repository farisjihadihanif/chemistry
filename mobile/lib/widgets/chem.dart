import 'dart:math' as math;

import 'package:flutter_svg/flutter_svg.dart';
import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';

/// Rumus molekul dengan angka sebagai subskrip.
class FormulaText extends StatelessWidget {
  const FormulaText(this.formula, {super.key, this.size = 14, this.color});
  final String? formula;
  final double size;
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final f = formula ?? '';
    final base = mono(context, size: size, color: color ?? Palette.of(context).inkSoft);
    final spans = <InlineSpan>[];
    for (final m in RegExp(r'(\d+)|(\D+)').allMatches(f)) {
      if (m.group(1) != null) {
        spans.add(WidgetSpan(alignment: PlaceholderAlignment.baseline, baseline: TextBaseline.alphabetic, child: Transform.translate(offset: Offset(0, size * 0.25), child: Text(m.group(1)!, style: base.copyWith(fontSize: size * 0.72)))));
      } else {
        spans.add(TextSpan(text: m.group(2), style: base));
      }
    }
    return Text.rich(TextSpan(children: spans));
  }
}

/// Struktur 2D dari RDKit (lewat API), warna mengikuti tema.
class StructureImage extends StatelessWidget {
  const StructureImage(this.smiles, {super.key, this.w = 320, this.h = 240});
  final String smiles;
  final int w, h;
  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return AspectRatio(
      aspectRatio: w / h,
      child: SvgPicture.network(
        api.structureUrl(smiles, w: w, h: h, dark: dark),
        fit: BoxFit.contain,
        semanticsLabel: 'Struktur $smiles',
        placeholderBuilder: (_) => const SizedBox.shrink(),
        errorBuilder: (_, _, _) => Center(child: Text('struktur tidak bisa dimuat', style: TextStyle(fontSize: 11, color: Palette.of(context).inkMute))),
      ),
    );
  }
}

Color scoreColor(BuildContext context, num s) {
  final p = Palette.of(context);
  return s >= 85 ? p.indHigh : s >= 60 ? p.indMid : p.indLow;
}

class ScoreBadge extends StatelessWidget {
  const ScoreBadge(this.score, {super.key, this.large = false});
  final num? score;
  final bool large;
  @override
  Widget build(BuildContext context) {
    if (score == null) return const SizedBox.shrink();
    final p = Palette.of(context);
    return Semantics(
      label: 'Skor kecocokan ${score!.round()} dari 100',
      child: Container(
        constraints: BoxConstraints(minWidth: large ? 52 : 40),
        padding: EdgeInsets.symmetric(horizontal: large ? 10 : 7, vertical: large ? 6 : 3),
        decoration: BoxDecoration(color: scoreColor(context, score!), borderRadius: BorderRadius.circular(6)),
        alignment: Alignment.center,
        child: Text('${score!.round()}', style: mono(context, size: large ? 20 : 14, color: Theme.of(context).brightness == Brightness.dark ? p.paper : Colors.white, weight: FontWeight.w500)),
      ),
    );
  }
}

/// Bulat penuh = eksperimen (PubChem), bulat kosong = prediksi model.
class SourceDot extends StatelessWidget {
  const SourceDot(this.source, {super.key});
  final String? source;
  @override
  Widget build(BuildContext context) {
    if (source == 'struktur' || source == null) return const SizedBox.shrink();
    final p = Palette.of(context);
    final exp = source == 'eksperimen';
    return Semantics(
      label: exp ? 'eksperimen' : 'prediksi',
      child: Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: exp ? p.cobalt : Colors.transparent, border: Border.all(color: p.cobalt, width: 1.5))),
    );
  }
}

class PropValue extends StatelessWidget {
  const PropValue({super.key, required this.k, required this.p, this.size = 13});
  final String k;
  final Json? p;
  final double size;
  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    if (p == null) return Text('–', style: TextStyle(color: Palette.of(context).inkMute));
    return Row(mainAxisSize: MainAxisSize.min, children: [
      SourceDot(p!['source'] as String?),
      const SizedBox(width: 5),
      Text(fmtValue(asNum(p!['value']), k), style: mono(context, size: size)),
      if (st.unit(k).isNotEmpty) ...[const SizedBox(width: 4), Text(st.unit(k), style: TextStyle(fontSize: size - 1, color: Palette.of(context).inkMute))],
    ]);
  }
}

/// Posisi nilai terhadap rentang target (skala log untuk viskositas & tekanan uap).
class RangeBar extends StatelessWidget {
  const RangeBar({super.key, required this.k, required this.p, required this.c});
  final String k;
  final Json? p;
  final Map c;
  @override
  Widget build(BuildContext context) {
    if (p == null) return const SizedBox(height: 12);
    final st = AppScope.of(context);
    return SizedBox(height: 12, width: double.infinity, child: CustomPaint(painter: _RangePainter(Palette.of(context), st.isLog(k), p!, c)));
  }
}

class _RangePainter extends CustomPainter {
  _RangePainter(this.pal, this.log, this.p, this.c);
  final Palette pal;
  final bool log;
  final Json p;
  final Map c;

  double f(num v) => log ? math.log(math.max(v.toDouble(), 1e-12)) / math.ln10 : v.toDouble();

  @override
  void paint(Canvas canvas, Size size) {
    final v = f(asNum(p['value']) ?? 0);
    final lo = asNum(c['min']) != null ? f(asNum(c['min'])!) : null;
    final hi = asNum(c['max']) != null ? f(asNum(c['max'])!) : null;
    final low = asNum(p['low']) != null ? f(asNum(p['low'])!) : null;
    final high = asNum(p['high']) != null ? f(asNum(p['high'])!) : null;
    final pts = [v, lo, hi, low, high].whereType<double>().toList();
    var a = pts.reduce(math.min), b = pts.reduce(math.max);
    final pad = ((b - a) == 0 ? (v.abs() == 0 ? 1 : v.abs()) : (b - a)) * 0.25;
    a -= pad;
    b += pad;
    double x(double t) => (t - a) / (b - a) * size.width;
    final mid = size.height / 2;
    canvas.drawLine(Offset(0, mid), Offset(size.width, mid), Paint()..color = pal.line);
    final r = Rect.fromLTRB(lo == null ? 0 : x(lo), mid - 4, hi == null ? size.width : x(hi), mid + 4);
    canvas.drawRRect(RRect.fromRectAndRadius(r, const Radius.circular(2)), Paint()..color = pal.cobaltSoft);
    canvas.drawRRect(RRect.fromRectAndRadius(r, const Radius.circular(2)), Paint()
      ..color = pal.cobalt.withValues(alpha: 0.3)
      ..style = PaintingStyle.stroke);
    final exp = p['source'] == 'eksperimen';
    if (!exp && low != null && high != null) {
      canvas.drawLine(Offset(x(low), mid), Offset(x(high), mid), Paint()
        ..color = pal.inkMute
        ..strokeWidth = 1);
    }
    final inside = (lo == null || v >= lo) && (hi == null || v <= hi);
    final col = inside ? pal.cobalt : pal.indLow;
    canvas.drawCircle(Offset(x(v), mid), 4.5, Paint()..color = exp ? col : pal.surface);
    canvas.drawCircle(Offset(x(v), mid), 4.5, Paint()
      ..color = col
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2);
  }

  @override
  bool shouldRepaint(_RangePainter old) => old.p != p || old.c != c || old.pal != pal;
}

class GroupTags extends StatelessWidget {
  const GroupTags(this.groups, {super.key, this.max = 4});
  final List? groups;
  final int max;
  @override
  Widget build(BuildContext context) {
    final g = (groups ?? []).map((e) => e.toString()).toList();
    if (g.isEmpty) return const SizedBox.shrink();
    final st = AppScope.of(context);
    final p = Palette.of(context);
    return Wrap(spacing: 4, runSpacing: 4, children: [
      for (final id in g.take(max))
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(color: p.sunk, borderRadius: BorderRadius.circular(4)),
          child: Text(st.groupLabel(id), style: TextStyle(fontSize: 11, color: p.inkSoft)),
        ),
      if (g.length > max) Text('+${g.length - max}', style: TextStyle(fontSize: 11, color: p.inkMute)),
    ]);
  }
}

String compoundTitle(Json c) {
  final n = (c['name'] ?? '').toString();
  if (n.isNotEmpty) return n;
  return (c['origin'] == 'gemini' || c['origin'] == 'turunan') ? 'Kandidat baru' : 'Senyawa tanpa nama';
}

/// Keterangan kecil di bawah judul halaman.
class Muted extends StatelessWidget {
  const Muted(this.text, {super.key, this.size = 13});
  final String text;
  final double size;
  @override
  Widget build(BuildContext context) => Text(text, style: TextStyle(fontSize: size, color: Palette.of(context).inkMute, height: 1.4));
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.body, this.action});
  final String title;
  final String? body;
  final Widget? action;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600), textAlign: TextAlign.center),
        if (body != null) ...[const SizedBox(height: 6), Muted(body!)],
        if (action != null) ...[const SizedBox(height: 16), action!],
      ]),
    );
  }
}

class ErrorText extends StatelessWidget {
  const ErrorText(this.message, {super.key});
  final String? message;
  @override
  Widget build(BuildContext context) {
    if (message == null || message!.isEmpty) return const SizedBox.shrink();
    final p = Palette.of(context);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: p.danger.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(6), border: Border.all(color: p.danger.withValues(alpha: 0.3))),
      child: Text(message!, style: TextStyle(color: p.danger, fontSize: 13)),
    );
  }
}
