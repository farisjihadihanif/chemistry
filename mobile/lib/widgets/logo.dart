import 'package:flutter_svg/flutter_svg.dart';
import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../config.dart';
import '../theme.dart';
import 'art.dart';

String _hex(Color c) =>
    '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}';

/// Logo Chemistry: labu Erlenmeyer dengan rantai molekul, latar transparan.
/// Garis mengikuti warna tinta tema (terang/gelap), cairan biru kobalt.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.size = 28});
  final double size;
  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    final svg = logoSvgTemplate
        .replaceAll('INK', _hex(p.ink))
        .replaceAll('COBALT', _hex(p.cobalt));
    return SvgPicture.string(svg, width: size, height: size);
  }
}

class Logo extends StatelessWidget {
  const Logo({super.key, this.size = 28, this.wordmark = true});
  final double size;
  final bool wordmark;
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        LogoMark(size: size),
        if (wordmark) ...[
          SizedBox(width: size * 0.25),
          Text(
            'Chemistry',
            style: TextStyle(
              fontSize: size * 0.62,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ],
    );
  }
}

/// Maskot Chesty.
class ChestyArt extends StatelessWidget {
  const ChestyArt({super.key, this.width = 64});
  final double width;
  @override
  Widget build(BuildContext context) =>
      SvgPicture.string(chestySvg, width: width, height: width * 140 / 120);
}

/// Chesty mengambang yang melompat pelan; tekan untuk membuka obrolan.
class FloatingChesty extends StatefulWidget {
  const FloatingChesty({super.key, required this.onTap});
  final VoidCallback onTap;
  @override
  State<FloatingChesty> createState() => _FloatingChestyState();
}

class _FloatingChestyState extends State<FloatingChesty>
    with SingleTickerProviderStateMixin {
  late final AnimationController c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2800),
  )..repeat();
  bool label = false;

  @override
  void dispose() {
    c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    final still = MediaQuery.of(context).disableAnimations;
    return Semantics(
      button: true,
      label: 'Tanya Chesty',
      child: GestureDetector(
        onTap: widget.onTap,
        onLongPress: () => setState(() => label = !label),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            AnimatedOpacity(
              opacity: label ? 1 : 0,
              duration: const Duration(milliseconds: 180),
              child: Container(
                margin: const EdgeInsets.only(right: 6),
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: p.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: p.line),
                ),
                child: const Text(
                  'Tanya Chesty',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            AnimatedBuilder(
              animation: c,
              builder: (_, child) {
                // lompatan singkat di awal siklus, lalu diam
                final t = still ? 1.0 : c.value;
                final hop = t < 0.25
                    ? -14 * (1 - ((t / 0.125) - 1) * ((t / 0.125) - 1))
                    : 0.0;
                return Transform.translate(
                  offset: Offset(0, hop),
                  child: child,
                );
              },
              child: const ChestyArt(width: 58),
            ),
          ],
        ),
      ),
    );
  }
}

/// Foto profil atau inisial nama.
class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.user, this.size = 36});
  final Json? user;
  final double size;
  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    final foto = (user?['foto'] ?? '').toString();
    final name = (user?['namaLengkap'] ?? user?['username'] ?? '?').toString();
    final initial = CircleAvatar(
      radius: size / 2,
      backgroundColor: p.cobaltSoft,
      child: Text(
        name.isEmpty ? '?' : name.substring(0, 1).toUpperCase(),
        style: TextStyle(
          color: p.cobalt,
          fontWeight: FontWeight.w600,
          fontSize: size * 0.42,
        ),
      ),
    );
    if (foto.isEmpty) return initial;
    final url = foto.startsWith('/') ? '$apiBase$foto' : foto;
    return ClipOval(
      child: Image.network(
        url,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => initial,
      ),
    );
  }
}
