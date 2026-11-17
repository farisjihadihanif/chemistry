import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../theme.dart';

/// Logo Chemistry: cincin heksagon (benzena) dengan inti berwarna indikator.
class Logo extends StatelessWidget {
  const Logo({super.key, this.size = 28, this.wordmark = true});
  final double size;
  final bool wordmark;
  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: p.cobalt, borderRadius: BorderRadius.circular(size * 0.22)),
        child: CustomPaint(painter: _Hex(p.onCobalt)),
      ),
      if (wordmark) ...[SizedBox(width: size * 0.3), Text('Chemistry', style: TextStyle(fontSize: size * 0.62, fontWeight: FontWeight.w600, letterSpacing: -0.3))],
    ]);
  }
}

class _Hex extends CustomPainter {
  _Hex(this.color);
  final Color color;
  @override
  void paint(Canvas canvas, Size s) {
    final c = Offset(s.width / 2, s.height / 2);
    final r = s.width * 0.3;
    final path = Path();
    for (var i = 0; i < 6; i++) {
      final a = math.pi / 3 * i - math.pi / 2;
      final pt = c + Offset(r * math.cos(a), r * math.sin(a));
      i == 0 ? path.moveTo(pt.dx, pt.dy) : path.lineTo(pt.dx, pt.dy);
    }
    path.close();
    canvas.drawPath(path, Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = s.width * 0.065
      ..strokeJoin = StrokeJoin.round);
    canvas.drawCircle(c, s.width * 0.1, Paint()..color = const Color(0xFFE2B33C));
  }

  @override
  bool shouldRepaint(_Hex old) => old.color != color;
}
