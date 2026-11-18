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

/// Chesty mengambang (animasi WebP seperti LUMA). Saat ditekan/ditahan ia melompat girang
/// dan memunculkan label "Tanya Chesty"; ketukan membuka obrolan.
class FloatingChesty extends StatefulWidget {
  const FloatingChesty({super.key, required this.onTap});
  final VoidCallback onTap;
  @override
  State<FloatingChesty> createState() => _FloatingChestyState();
}

class _FloatingChestyState extends State<FloatingChesty> {
  bool active = false;

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    return Semantics(
      button: true,
      label: 'Tanya Chesty',
      child: GestureDetector(
        onTap: widget.onTap,
        onTapDown: (_) => setState(() => active = true),
        onTapCancel: () => setState(() => active = false),
        onTapUp: (_) => setState(() => active = false),
        onLongPressEnd: (_) => setState(() => active = false),
        onLongPress: () {},
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedOpacity(
              opacity: active ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: Container(
                margin: const EdgeInsets.only(bottom: 4),
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: p.cobalt,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Tanya Chesty',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: p.onCobalt,
                  ),
                ),
              ),
            ),
            Image.asset(
              active ? 'assets/chesty-hover.webp' : 'assets/chesty-idle.webp',
              width: 64,
              gaplessPlayback: true,
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
