import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';
import '../widgets/logo.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool register = false, busy = false, show = false;
  String? error;
  final f = {for (final k in ['identifier', 'password', 'namaLengkap', 'institusi', 'username', 'email']) k: TextEditingController()};

  @override
  void dispose() {
    for (final c in f.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      error = null;
    });
    final st = AppScope.read(context);
    try {
      if (register) {
        await st.register({'namaLengkap': f['namaLengkap']!.text.trim(), 'institusi': f['institusi']!.text.trim(), 'username': f['username']!.text.trim().toLowerCase(), 'email': f['email']!.text.trim(), 'password': f['password']!.text});
      } else {
        await st.login(f['identifier']!.text.trim(), f['password']!.text);
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> forgot() async {
    final email = TextEditingController();
    final msg = await showDialog<String>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Lupa password'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Muted('Masukkan email akunmu. Link untuk membuat password baru dikirim ke email dan dibuka di browser.'),
          const SizedBox(height: 12),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(hintText: 'Email')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('Batal')),
          FilledButton(
            onPressed: () async {
              try {
                final r = await api.post('/auth/forgot', {'email': email.text.trim()});
                if (c.mounted) Navigator.pop(c, r['message'] as String);
              } catch (e) {
                if (c.mounted) Navigator.pop(c, e.toString());
              }
            },
            child: const Text('Kirim link'),
          ),
        ],
      ),
    );
    email.dispose();
    if (msg != null && mounted) toast(context, msg);
  }

  Widget field(String k, String label, {bool pass = false, TextInputType? type, String? hint, Iterable<String>? autofill}) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: f[k],
          obscureText: pass && !show,
          keyboardType: type,
          autocorrect: false,
          autofillHints: autofill,
          decoration: InputDecoration(
            labelText: label,
            hintText: hint,
            suffixIcon: pass ? IconButton(tooltip: show ? 'Sembunyikan password' : 'Tampilkan password', icon: Icon(show ? Icons.visibility_off : Icons.visibility), onPressed: () => setState(() => show = !show)) : null,
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  const Align(alignment: Alignment.centerLeft, child: Logo(size: 34)),
                  const SizedBox(height: 28),
                  Text(register ? 'Buat akun' : 'Mulai dari sifat yang dibutuhkan.', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600, height: 1.2)),
                  const SizedBox(height: 8),
                  Muted(register ? 'Akun yang sama dipakai di aplikasi dan website.' : 'Masuk untuk mencari senyawa dari data PubChem dan prediksi model.', size: 14),
                  const SizedBox(height: 24),
                  if (register) ...[
                    field('namaLengkap', 'Nama lengkap', autofill: const [AutofillHints.name]),
                    field('institusi', 'Institusi / perusahaan (opsional)', autofill: const [AutofillHints.organizationName]),
                    field('username', 'Username', autofill: const [AutofillHints.newUsername]),
                    field('email', 'Email', type: TextInputType.emailAddress, autofill: const [AutofillHints.email]),
                    field('password', 'Password', pass: true, hint: 'Minimal 8 karakter', autofill: const [AutofillHints.newPassword]),
                  ] else ...[
                    field('identifier', 'Username atau email', autofill: const [AutofillHints.username]),
                    field('password', 'Password', pass: true, autofill: const [AutofillHints.password]),
                    Align(alignment: Alignment.centerRight, child: TextButton(onPressed: forgot, child: const Text('Lupa password?'))),
                  ],
                  ErrorText(error),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Memproses…' : register ? 'Daftar' : 'Masuk')),
                  const SizedBox(height: 12),
                  TextButton(onPressed: () => setState(() {
                        register = !register;
                        error = null;
                      }), child: Text(register ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar')),
                  if (register) Padding(padding: const EdgeInsets.only(top: 4), child: Text('Dengan mendaftar, kamu menyetujui Ketentuan dan Kebijakan Privasi Chemistry.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: p.inkMute))),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
