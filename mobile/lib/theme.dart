import 'package:google_fonts/google_fonts.dart';
import 'package:material_ui/material_ui.dart';

/// Warna yang sama dengan versi web: kertas meja lab, tinta slate, biru kobalt,
/// dan skala indikator bromtimol biru untuk skor (kuning -> hijau -> biru).
class Palette {
  const Palette({
    required this.paper,
    required this.surface,
    required this.sunk,
    required this.line,
    required this.ink,
    required this.inkSoft,
    required this.inkMute,
    required this.cobalt,
    required this.cobaltSoft,
    required this.onCobalt,
    required this.indLow,
    required this.indMid,
    required this.indHigh,
    required this.danger,
  });
  final Color paper, surface, sunk, line, ink, inkSoft, inkMute, cobalt, cobaltSoft, onCobalt, indLow, indMid, indHigh, danger;

  static const light = Palette(
    paper: Color(0xFFF3F5F2),
    surface: Color(0xFFFFFFFF),
    sunk: Color(0xFFE9EDE9),
    line: Color(0xFFD6DDD8),
    ink: Color(0xFF16232E),
    inkSoft: Color(0xFF3F4E5A),
    inkMute: Color(0xFF5E6C78),
    cobalt: Color(0xFF1D4E89),
    cobaltSoft: Color(0xFFDFE8F4),
    onCobalt: Color(0xFFFFFFFF),
    indLow: Color(0xFFA67608),
    indMid: Color(0xFF2F7A4D),
    indHigh: Color(0xFF1D4E89),
    danger: Color(0xFFB22222),
  );
  static const dark = Palette(
    paper: Color(0xFF0D161D),
    surface: Color(0xFF142029),
    sunk: Color(0xFF1A2833),
    line: Color(0xFF2C3D4A),
    ink: Color(0xFFE2E9EE),
    inkSoft: Color(0xFFB7C4CE),
    inkMute: Color(0xFF92A2AF),
    cobalt: Color(0xFF78A8E6),
    cobaltSoft: Color(0xFF1C3149),
    onCobalt: Color(0xFF0D161D),
    indLow: Color(0xFFE6B746),
    indMid: Color(0xFF6EC48D),
    indHigh: Color(0xFF78A8E6),
    danger: Color(0xFFF87171),
  );

  static Palette of(BuildContext context) => Theme.of(context).brightness == Brightness.dark ? dark : light;
}

TextStyle mono(BuildContext context, {double? size, Color? color, FontWeight? weight}) =>
    GoogleFonts.ibmPlexMono(fontSize: size, color: color ?? Palette.of(context).ink, fontWeight: weight, fontFeatures: const [FontFeature.tabularFigures()]);

ThemeData buildTheme(Brightness b) {
  final p = b == Brightness.dark ? Palette.dark : Palette.light;
  final scheme = ColorScheme(
    brightness: b,
    primary: p.cobalt,
    onPrimary: p.onCobalt,
    secondary: p.indMid,
    onSecondary: p.onCobalt,
    error: p.danger,
    onError: Colors.white,
    surface: p.surface,
    onSurface: p.ink,
    surfaceContainerHighest: p.sunk,
    outline: p.line,
    outlineVariant: p.line,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, scaffoldBackgroundColor: p.paper, brightness: b);
  final text = GoogleFonts.ibmPlexSansTextTheme(base.textTheme).apply(bodyColor: p.ink, displayColor: p.ink);
  final border = OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: BorderSide(color: p.line));
  return base.copyWith(
    textTheme: text,
    appBarTheme: AppBarTheme(backgroundColor: p.paper, foregroundColor: p.ink, elevation: 0, scrolledUnderElevation: 0, centerTitle: false, titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
    dividerTheme: DividerThemeData(color: p.line, space: 1, thickness: 1),
    cardTheme: CardThemeData(color: p.surface, elevation: 0, margin: EdgeInsets.zero, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8), side: BorderSide(color: p.line))),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(borderSide: BorderSide(color: p.cobalt, width: 1.6)),
      hintStyle: TextStyle(color: p.inkMute),
    ),
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: p.cobalt, foregroundColor: p.onCobalt, minimumSize: const Size(0, 46), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)), textStyle: const TextStyle(fontWeight: FontWeight.w600))),
    outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(foregroundColor: p.ink, side: BorderSide(color: p.line), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)))),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: p.cobalt)),
    chipTheme: ChipThemeData(backgroundColor: p.surface, selectedColor: p.cobalt, side: BorderSide(color: p.line), labelStyle: TextStyle(color: p.inkSoft, fontSize: 13), secondaryLabelStyle: TextStyle(color: p.onCobalt, fontSize: 13), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)), showCheckmark: false),
    navigationBarTheme: NavigationBarThemeData(backgroundColor: p.surface, indicatorColor: p.cobaltSoft, height: 64, labelTextStyle: WidgetStatePropertyAll(TextStyle(fontSize: 12, color: p.inkSoft))),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((st) => st.contains(WidgetState.selected) ? p.cobalt : p.surface),
        foregroundColor: WidgetStateProperty.resolveWith((st) => st.contains(WidgetState.selected) ? p.onCobalt : p.inkSoft),
        side: WidgetStatePropertyAll(BorderSide(color: p.line)),
        shape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.circular(6))),
      ),
    ),
    snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, backgroundColor: p.ink, contentTextStyle: TextStyle(color: p.paper)),
  );
}
