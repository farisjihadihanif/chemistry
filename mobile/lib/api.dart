import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'config.dart';

class ApiException implements Exception {
  ApiException(this.status, this.message);
  final int status;
  final String message;
  @override
  String toString() => message;
}

typedef Json = Map<String, dynamic>;

/// Klien API. Token login disimpan di penyimpanan aman perangkat (Keychain / Keystore).
class Api {
  Api._();
  static final Api instance = Api._();
  static const _storage = FlutterSecureStorage();
  static const _key = 'token';
  String? _token;

  Future<void> loadToken() async {
    try {
      _token = await _storage.read(key: _key);
    } catch (_) {
      _token = null;
    }
  }

  Future<void> setToken(String? token) async {
    _token = token;
    try {
      if (token == null) {
        await _storage.delete(key: _key);
      } else {
        await _storage.write(key: _key, value: token);
      }
    } catch (_) {
      // penyimpanan tidak tersedia: token tetap dipakai selama aplikasi terbuka
    }
  }

  bool get hasToken => _token != null;
  String? get token => _token;

  // ---- akun tersimpan untuk "Ganti akun" (maks. 5) ----
  static const _accountsKey = 'accounts';

  Future<List<Json>> savedAccounts() async {
    try {
      final raw = await _storage.read(key: _accountsKey);
      if (raw == null) return [];
      return (jsonDecode(raw) as List).cast<Json>();
    } catch (_) {
      return [];
    }
  }

  Future<void> _writeAccounts(List<Json> list) async {
    try {
      await _storage.write(
        key: _accountsKey,
        value: jsonEncode(list.take(5).toList()),
      );
    } catch (_) {}
  }

  /// Simpan/perbarui akun yang sedang masuk di urutan teratas.
  Future<void> rememberAccount(Json user, String token) async {
    final list = (await savedAccounts())
        .where((a) => a['user']?['_id'] != user['_id'])
        .toList();
    list.insert(0, {'user': user, 'token': token});
    await _writeAccounts(list);
  }

  Future<void> forgetAccount(String userId) async {
    await _writeAccounts(
      (await savedAccounts())
          .where((a) => a['user']?['_id'] != userId)
          .toList(),
    );
  }

  /// Unggah foto profil sebagai body mentah.
  Future<dynamic> putBytes(
    String path,
    List<int> bytes,
    String contentType,
  ) async {
    final req = http.Request('PUT', uri(path))
      ..headers.addAll({
        'Accept': 'application/json',
        'Content-Type': contentType,
        if (_token != null) 'Authorization': 'Bearer $_token',
      })
      ..bodyBytes = bytes;
    http.Response res;
    try {
      res = await http.Response.fromStream(
        await req.send().timeout(const Duration(seconds: 40)),
      );
    } catch (_) {
      throw ApiException(
        0,
        'Tidak bisa terhubung ke server. Periksa koneksi internetmu.',
      );
    }
    final data = res.body.isEmpty
        ? null
        : jsonDecode(utf8.decode(res.bodyBytes));
    if (res.statusCode >= 400) {
      throw ApiException(
        res.statusCode,
        data is Map && data['message'] is String
            ? data['message'] as String
            : 'Foto gagal diunggah.',
      );
    }
    return data;
  }

  Uri uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$apiBase/api$path').replace(queryParameters: query);

  String structureUrl(
    String smiles, {
    int w = 320,
    int h = 240,
    bool dark = false,
  }) => uri('/structure.svg', {
    'smiles': smiles,
    'w': '$w',
    'h': '$h',
    if (dark) 'dark': '1',
  }).toString();

  Future<dynamic> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
    Duration timeout = const Duration(seconds: 40),
  }) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
    final req = http.Request(method, uri(path, query))..headers.addAll(headers);
    if (body != null) req.body = jsonEncode(body);
    http.Response res;
    try {
      res = await http.Response.fromStream(await req.send().timeout(timeout));
    } on TimeoutException {
      throw ApiException(0, 'Server terlalu lama menjawab. Coba lagi.');
    } catch (_) {
      throw ApiException(
        0,
        'Tidak bisa terhubung ke server. Periksa koneksi internetmu.',
      );
    }
    dynamic data;
    try {
      data = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      data = null;
    }
    if (res.statusCode >= 400) {
      final msg = data is Map && data['message'] is String
          ? data['message'] as String
          : 'Terjadi kesalahan (${res.statusCode}).';
      throw ApiException(res.statusCode, msg);
    }
    return data;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);
  Future<dynamic> post(
    String path, [
    Object? body,
    Duration timeout = const Duration(seconds: 40),
  ]) => _send('POST', path, body: body ?? {}, timeout: timeout);
  Future<dynamic> patch(String path, Object body) =>
      _send('PATCH', path, body: body);
  Future<dynamic> put(String path, Object body) =>
      _send('PUT', path, body: body);
  Future<dynamic> delete(String path, [Object? body]) =>
      _send('DELETE', path, body: body);
}

final api = Api.instance;
