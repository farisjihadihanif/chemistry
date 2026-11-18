import 'dart:math' as math;

const _sup = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

String _id(num v, int digits) {
  final s = v.toStringAsFixed(digits);
  final parts = s.split('.');
  final buf = StringBuffer();
  final ip = parts[0].replaceFirst('-', '');
  for (var i = 0; i < ip.length; i++) {
    if (i > 0 && (ip.length - i) % 3 == 0) buf.write('.');
    buf.write(ip[i]);
  }
  return '${s.startsWith('-') ? '-' : ''}$buf${parts.length > 1 ? ',${parts[1]}' : ''}';
}

/// Format angka sifat (gaya Indonesia: koma desimal).
String fmtValue(num? v, [String key = '']) {
  if (v == null || v.isNaN) return '–';
  final a = v.abs();
  if (key == 'density') return _id(v, 3);
  if (a != 0 && (a < 0.01 || a >= 1e5)) {
    final e = (math.log(a) / math.ln10).floor();
    final m = v / math.pow(10, e);
    return '${_id(m, 1)} × 10${e.toString().split('').map((c) => _sup[c] ?? c).join()}';
  }
  if (v == v.roundToDouble() &&
      const {'hbd', 'hba', 'rot_bonds'}.contains(key)) {
    return _id(v, 0);
  }
  if (a < 10) {
    final t = _id(v, 2);
    return t.contains(',') ? t.replaceFirst(RegExp(r',?0+$'), '') : t;
  }
  if (a < 100) return _id(v, 1);
  return _id(v.round(), 0);
}

String fmtInt(num v) => _id(v.round(), 0);

String rangeText(Map c, String unit) {
  final u = unit.isEmpty ? '' : ' $unit';
  if (c['min'] != null && c['max'] != null) {
    return '${c['min']} – ${c['max']}$u';
  }
  if (c['min'] != null) return '≥ ${c['min']}$u';
  return '≤ ${c['max']}$u';
}

String timeAgo(String iso) {
  final d = DateTime.tryParse(iso)?.toLocal();
  if (d == null) return '';
  final s = DateTime.now().difference(d).inSeconds;
  if (s < 60) return 'baru saja';
  if (s < 3600) return '${s ~/ 60} menit lalu';
  if (s < 86400) return '${s ~/ 3600} jam lalu';
  if (s < 86400 * 7) return '${s ~/ 86400} hari lalu';
  const bulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return '${d.day} ${bulan[d.month - 1]} ${d.year}';
}

num? asNum(dynamic v) => v is num ? v : (v is String ? num.tryParse(v) : null);
