import 'package:flutter/foundation.dart';

/// Alamat API. Saat build rilis isi dengan:
///   flutter build apk --dart-define=API_URL=https://domainmu.id
/// Emulator Android menjangkau laptop lewat 10.0.2.2; web/desktop lewat localhost.
const String _fromEnv = String.fromEnvironment('API_URL');

String get apiBase {
  if (_fromEnv.isNotEmpty) return _fromEnv.replaceAll(RegExp(r'/+$'), '');
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:4100';
  return 'http://localhost:4100';
}
