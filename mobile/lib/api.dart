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

  Uri uri(String path, [Map<String, String>? query]) => Uri.parse('$apiBase/api$path').replace(queryParameters: query);

  String structureUrl(String smiles, {int w = 320, int h = 240, bool dark = false}) =>
      uri('/structure.svg', {'smiles': smiles, 'w': '$w', 'h': '$h', if (dark) 'dark': '1'}).toString();

  Future<dynamic> _send(String method, String path, {Object? body, Map<String, String>? query, Duration timeout = const Duration(seconds: 40)}) async {
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
      throw ApiException(0, 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.');
    }
    dynamic data;
    try {
      data = res.body.isEmpty ? null : jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {
      data = null;
    }
    if (res.statusCode >= 400) {
      final msg = data is Map && data['message'] is String ? data['message'] as String : 'Terjadi kesalahan (${res.statusCode}).';
      throw ApiException(res.statusCode, msg);
    }
    return data;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) => _send('GET', path, query: query);
  Future<dynamic> post(String path, [Object? body, Duration timeout = const Duration(seconds: 40)]) => _send('POST', path, body: body ?? {}, timeout: timeout);
  Future<dynamic> patch(String path, Object body) => _send('PATCH', path, body: body);
  Future<dynamic> put(String path, Object body) => _send('PUT', path, body: body);
  Future<dynamic> delete(String path, [Object? body]) => _send('DELETE', path, body: body);
}

final api = Api.instance;
