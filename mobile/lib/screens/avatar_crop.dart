import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:material_ui/material_ui.dart';

import '../theme.dart';

/// Atur foto profil: geser dan cubit untuk zoom, lalu simpan sebagai PNG persegi.
class AvatarCropScreen extends StatefulWidget {
  const AvatarCropScreen({super.key, required this.bytes});
  final Uint8List bytes;
  @override
  State<AvatarCropScreen> createState() => _AvatarCropScreenState();
}

class _AvatarCropScreenState extends State<AvatarCropScreen> {
  final boundary = GlobalKey();
  bool busy = false;

  Future<void> save(double side) async {
    setState(() => busy = true);
    final ro =
        boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final img = await ro.toImage(pixelRatio: 400 / side);
    final data = await img.toByteData(format: ui.ImageByteFormat.png);
    if (!mounted) return;
    Navigator.pop(context, data!.buffer.asUint8List());
  }

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Atur foto profil')),
      body: LayoutBuilder(
        builder: (context, box) {
          final side = (box.maxWidth - 48).clamp(200.0, 360.0);
          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: SizedBox(
                  width: side,
                  height: side,
                  child: Stack(
                    children: [
                      RepaintBoundary(
                        key: boundary,
                        child: ClipRect(
                          child: InteractiveViewer(
                            minScale: 1,
                            maxScale: 5,
                            constrained: false,
                            boundaryMargin: EdgeInsets.zero,
                            child: SizedBox(
                              width: side,
                              height: side,
                              child: Image.memory(
                                widget.bytes,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                        ),
                      ),
                      IgnorePointer(
                        child: CustomPaint(
                          size: Size(side, side),
                          painter: _Ring(p.paper),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Geser foto untuk mengatur posisi, cubit untuk memperbesar.',
                textAlign: TextAlign.center,
                style: TextStyle(color: p.inkMute, fontSize: 13),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: busy ? null : () => save(side),
                child: Text(busy ? 'Menyimpan…' : 'Simpan foto'),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Menggelapkan sudut di luar lingkaran supaya terlihat hasil akhirnya.
class _Ring extends CustomPainter {
  _Ring(this.color);
  final Color color;
  @override
  void paint(Canvas canvas, Size s) {
    final outer = Path()..addRect(Offset.zero & s);
    final inner = Path()..addOval(Offset.zero & s);
    canvas.drawPath(
      Path.combine(PathOperation.difference, outer, inner),
      Paint()..color = color.withValues(alpha: 0.75),
    );
  }

  @override
  bool shouldRepaint(_Ring old) => old.color != color;
}
