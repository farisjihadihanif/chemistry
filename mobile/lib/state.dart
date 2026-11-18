import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';

String keyOf(Json c) =>
    c['cid'] != null ? 'cid:${c['cid']}' : 'smi:${c['smiles'] ?? ''}';

/// Keadaan aplikasi: akun, metadata sifat dari server, favorit, daftar bandingkan, tema.
class AppState extends ChangeNotifier {
  Json? user;
  Json? meta;
  String? metaError;
  bool ready = false;
  Set<String> favKeys = {};
  List<Json> accounts = [];
  final List<Json> compare = [];
  ThemeMode themeMode = ThemeMode.system;

  bool get isAdmin => user?['role'] == 'admin';

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      themeMode = switch (prefs.getString('theme')) {
        'dark' => ThemeMode.dark,
        'light' => ThemeMode.light,
        _ => ThemeMode.system,
      };
    } catch (_) {}
    await api.loadToken();
    await loadMeta();
    if (api.hasToken) {
      try {
        user = (await api.get('/auth/me'))['user'] as Json?;
        if (user == null) await api.setToken(null);
      } catch (_) {
        // offline: tetap tampilkan layar masuk
      }
    }
    if (user != null) {
      await api.rememberAccount(user!, api.token!);
      await loadFavKeys();
    }
    accounts = await api.savedAccounts();
    ready = true;
    notifyListeners();
  }

  Future<void> loadMeta() async {
    try {
      meta = await api.get('/meta') as Json;
      metaError = null;
    } catch (e) {
      metaError = e.toString();
    }
    notifyListeners();
  }

  Future<void> loadFavKeys() async {
    try {
      final r = await api.get('/favorites/keys');
      favKeys = ((r['keys'] as List?) ?? []).map((e) => e.toString()).toSet();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _signedIn(Json r) async {
    await api.setToken(r['token'] as String?);
    user = r['user'] as Json;
    compare.clear();
    if (api.token != null) await api.rememberAccount(user!, api.token!);
    accounts = await api.savedAccounts();
    await loadFavKeys();
    if (meta == null) await loadMeta();
    notifyListeners();
  }

  Future<void> login(String id, String password) async => _signedIn(
    await api.post('/auth/login', {'identifier': id, 'password': password})
        as Json,
  );
  Future<void> register(Json data) async =>
      _signedIn(await api.post('/auth/register', data) as Json);

  /// Keluar dari akun ini. Akun tetap diingat (tanpa token) supaya bisa dipilih lagi,
  /// kecuali [forget] = true.
  Future<void> logout({bool forget = false}) async {
    final id = user?['_id'] as String?;
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    if (id != null) await api.forgetAccount(id);
    accounts = await api.savedAccounts();
    await api.setToken(null);
    user = null;
    favKeys = {};
    compare.clear();
    notifyListeners();
  }

  void setUser(Json u) {
    user = u;
    if (api.token != null) {
      api
          .rememberAccount(u, api.token!)
          .then((_) async => accounts = await api.savedAccounts());
    }
    notifyListeners();
  }

  List<Json> get otherAccounts =>
      accounts.where((a) => a['user']?['_id'] != user?['_id']).toList();

  /// Pindah ke akun tersimpan. Gagal bila sesinya sudah berakhir (akun lalu dilupakan).
  Future<void> switchAccount(Json account) async {
    final previous = api.token;
    await api.setToken(account['token'] as String?);
    try {
      final u = (await api.get('/auth/me'))['user'] as Json?;
      if (u == null) {
        throw ApiException(
          401,
          'Sesi akun itu sudah berakhir. Masuk lagi dengan password-nya.',
        );
      }
      user = u;
      compare.clear();
      favKeys = {};
      await api.rememberAccount(u, api.token!);
      accounts = await api.savedAccounts();
      await loadFavKeys();
      notifyListeners();
    } catch (e) {
      await api.setToken(previous);
      await api.forgetAccount(account['user']?['_id'] as String? ?? '');
      accounts = await api.savedAccounts();
      notifyListeners();
      throw e is ApiException
          ? e
          : ApiException(
              401,
              'Sesi akun itu sudah berakhir. Masuk lagi dengan password-nya.',
            );
    }
  }

  Future<void> forgetAccount(String id) async {
    await api.forgetAccount(id);
    accounts = await api.savedAccounts();
    notifyListeners();
  }

  Future<String> toggleFav(Json c) async {
    final k = keyOf(c);
    final on = favKeys.contains(k);
    on ? favKeys.remove(k) : favKeys.add(k);
    notifyListeners();
    try {
      if (on) {
        await api.post('/favorites/remove', {'compound': c});
      } else {
        await api.post('/favorites', {'compound': c});
      }
      return on ? 'Dihapus dari favorit.' : 'Disimpan ke favorit.';
    } catch (e) {
      on ? favKeys.add(k) : favKeys.remove(k);
      notifyListeners();
      return e.toString();
    }
  }

  bool inCompare(Json c) => compare.any((x) => keyOf(x) == keyOf(c));

  /// Mengembalikan pesan kalau penuh.
  String? toggleCompare(Json c) {
    if (inCompare(c)) {
      compare.removeWhere((x) => keyOf(x) == keyOf(c));
    } else {
      if (compare.length >= 3) return 'Maksimal 3 senyawa untuk dibandingkan.';
      compare.add(c);
    }
    notifyListeners();
    return null;
  }

  Future<void> setTheme(ThemeMode m) async {
    themeMode = m;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        'theme',
        m == ThemeMode.dark
            ? 'dark'
            : m == ThemeMode.light
            ? 'light'
            : 'system',
      );
    } catch (_) {}
  }

  // ---- metadata sifat ----
  String label(String k) =>
      ((meta?['targets']?[k] ?? meta?['computed']?[k])?['label'] ?? k)
          .toString();
  String unit(String k) =>
      ((meta?['targets']?[k] ?? meta?['computed']?[k])?['unit'] ?? '')
          .toString();
  bool isLog(String k) => meta?['targets']?[k]?['log'] == true;
  List<String> get allKeys => [
    ...((meta?['targets'] as Map?)?.keys.cast<String>() ?? const []),
    ...((meta?['computed'] as Map?)?.keys.cast<String>() ?? const []),
  ];
  List<Json> get groups => ((meta?['groups'] as List?) ?? []).cast<Json>();
  String groupLabel(String id) => groups
      .firstWhere((g) => g['id'] == id, orElse: () => {'label': id})['label']
      .toString();
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
    : super(notifier: state);
  static AppState of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
  static AppState read(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}

void toast(BuildContext context, String msg) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg)));
}
