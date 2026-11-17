import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../config.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import 'lists.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Json? summary;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final r = await api.get('/users/me/summary');
      if (mounted) setState(() => summary = r as Json);
    } catch (_) {}
  }

  Future<void> editProfile(AppState st) async {
    final nama = TextEditingController(text: st.user?['namaLengkap'] as String? ?? '');
    final inst = TextEditingController(text: st.user?['institusi'] as String? ?? '');
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (c) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(c).viewInsets.bottom + 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Profil', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: nama, decoration: const InputDecoration(labelText: 'Nama lengkap')),
          const SizedBox(height: 10),
          TextField(controller: inst, decoration: const InputDecoration(labelText: 'Institusi / perusahaan')),
          const SizedBox(height: 14),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Simpan profil')),
        ]),
      ),
    );
    if (ok == true) {
      try {
        final r = await api.patch('/users/me', {'namaLengkap': nama.text, 'institusi': inst.text});
        st.setUser(r['user'] as Json);
        if (mounted) toast(context, 'Profil disimpan.');
      } catch (e) {
        if (mounted) toast(context, e.toString());
      }
    }
    nama.dispose();
    inst.dispose();
  }

  Future<void> changePassword() async {
    final lama = TextEditingController(), baru = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (c) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(c).viewInsets.bottom + 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Ganti password', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 12),
          TextField(controller: lama, obscureText: true, decoration: const InputDecoration(labelText: 'Password lama')),
          const SizedBox(height: 10),
          TextField(controller: baru, obscureText: true, decoration: const InputDecoration(labelText: 'Password baru (min. 8 karakter)')),
          const SizedBox(height: 14),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Ganti password')),
        ]),
      ),
    );
    if (ok == true) {
      try {
        final r = await api.put('/users/me/password', {'passwordLama': lama.text, 'passwordBaru': baru.text});
        await api.setToken(r['token'] as String?);
        if (mounted) toast(context, 'Password diganti. Perangkat lain otomatis keluar.');
      } catch (e) {
        if (mounted) toast(context, e.toString());
      }
    }
    lama.dispose();
    baru.dispose();
  }

  Future<void> deleteAccount(AppState st) async {
    final pw = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Hapus akun permanen?'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Akun, riwayat pencarian, favorit, dan percakapan asisten dihapus permanen.'),
          const SizedBox(height: 12),
          TextField(controller: pw, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Batal')), TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Hapus akun'))],
      ),
    );
    if (ok == true) {
      try {
        await api.delete('/users/me', {'password': pw.text});
        await st.logout();
      } catch (e) {
        if (mounted) toast(context, e.toString());
      }
    }
    pw.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    final u = st.user ?? {};
    Widget tile(IconData icon, String title, VoidCallback onTap, {String? sub, Color? color}) => ListTile(
          leading: Icon(icon, color: color ?? p.inkSoft),
          title: Text(title, style: TextStyle(color: color)),
          subtitle: sub == null ? null : Text(sub),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        );
    return Scaffold(
      appBar: AppBar(title: const Text('Akun')),
      body: ListView(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Row(children: [
            CircleAvatar(radius: 26, backgroundColor: p.cobaltSoft, child: Text(((u['namaLengkap'] ?? u['username'] ?? '?') as String).substring(0, 1).toUpperCase(), style: TextStyle(color: p.cobalt, fontWeight: FontWeight.w600, fontSize: 20))),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text((u['namaLengkap'] ?? '') as String, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 17)),
                Muted([if ((u['institusi'] ?? '').toString().isNotEmpty) u['institusi'], '@${u['username']}'].join(' · ')),
              ]),
            ),
          ]),
        ),
        if (summary != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              for (final e in [
                ['Pencarian', '${summary!['discoveries']}'],
                ['Favorit', '${summary!['favorites']}'],
                ['Sisa AI hari ini', summary!['quota']?['remaining'] == null ? 'bebas' : '${summary!['quota']['remaining']}'],
              ])
                Expanded(
                  child: Card(
                    margin: const EdgeInsets.only(right: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(e[1], style: mono(context, size: 18, weight: FontWeight.w500)), Muted(e[0], size: 11)]),
                    ),
                  ),
                ),
            ]),
          ),
        const SizedBox(height: 8),
        tile(Icons.history, 'Riwayat pencarian', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HistoryScreen())).then((_) => load())),
        tile(Icons.favorite_border, 'Favorit', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const FavoritesScreen())).then((_) => load())),
        tile(Icons.view_column_outlined, 'Bandingkan', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CompareScreen())), sub: '${st.compare.length} senyawa dipilih'),
        const Divider(),
        tile(Icons.person_outline, 'Ubah profil', () => editProfile(st)),
        tile(Icons.lock_outline, 'Ganti password', changePassword),
        ListTile(
          leading: Icon(Icons.dark_mode_outlined, color: p.inkSoft),
          title: const Text('Tema'),
          trailing: DropdownButton<ThemeMode>(
            value: st.themeMode,
            underline: const SizedBox.shrink(),
            items: const [DropdownMenuItem(value: ThemeMode.system, child: Text('Ikuti sistem')), DropdownMenuItem(value: ThemeMode.light, child: Text('Terang')), DropdownMenuItem(value: ThemeMode.dark, child: Text('Gelap'))],
            onChanged: (m) => st.setTheme(m ?? ThemeMode.system),
          ),
        ),
        tile(Icons.info_outline, 'Data dan model', () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const DataScreen()))),
        tile(Icons.policy_outlined, 'Ketentuan & privasi', () => launchUrl(Uri.parse('$apiBase/privasi'), mode: LaunchMode.externalApplication)),
        const Divider(),
        tile(Icons.logout, 'Keluar', st.logout, color: p.danger),
        tile(Icons.delete_forever_outlined, 'Hapus akun', () => deleteAccount(st), color: p.danger),
        const Padding(padding: EdgeInsets.all(16), child: Muted('Chemistry · Created by Faris Jihadi Hanif Lubis · Data senyawa dari PubChem (NIH)', size: 11)),
      ]),
    );
  }
}

class DataScreen extends StatelessWidget {
  const DataScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    final p = Palette.of(context);
    final t = (st.meta?['targets'] as Map?) ?? {};
    return Scaffold(
      appBar: AppBar(title: const Text('Data dan model')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Pustaka berisi ${fmtInt((st.meta?['compounds'] ?? 0) as num)} senyawa organik dengan data sifat eksperimen dari PubChem (sebagian besar Hazardous Substances Data Bank). Nilai yang meragukan dibuang: batas seperti "> 93 °C", titik didih pada tekanan rendah, dan fase gas.', style: const TextStyle(height: 1.5)),
        const SizedBox(height: 12),
        const Text('Setiap sifat diprediksi model Random Forest dari 19 deskriptor RDKit dan sidik jari Morgan. Akurasi di bawah diukur dengan validasi silang 5 lipatan.', style: TextStyle(height: 1.5)),
        const SizedBox(height: 16),
        for (final e in t.entries)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: p.line))),
            child: Row(children: [
              Expanded(child: Text(e.value['label'] as String)),
              SizedBox(width: 70, child: Text(fmtInt(e.value['experimental'] as num), textAlign: TextAlign.right, style: mono(context, size: 13))),
              SizedBox(width: 60, child: Text('R² ${e.value['r2']}', textAlign: TextAlign.right, style: mono(context, size: 13, color: p.inkSoft))),
            ]),
          ),
        const SizedBox(height: 12),
        const Muted('Kolom tengah: jumlah data eksperimen. Viskositas, tegangan permukaan, dan suhu penyalaan sendiri datanya sedikit, jadi prediksinya kasar. Prediksi bukan pengganti uji laboratorium.'),
      ]),
    );
  }
}
