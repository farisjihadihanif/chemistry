import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:material_ui/material_ui.dart';

import '../api.dart';
import '../format.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets/chem.dart';

const _starters = [
  'Kenapa ester rantai panjang cocok sebagai plasticizer?',
  'Apa beda titik nyala dan suhu penyalaan sendiri?',
  'Bagaimana gugus hidroksil memengaruhi viskositas?',
];

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key, this.smiles});
  final String? smiles;
  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  String? sessionId;
  String? smiles;
  final List<Json> messages = [];
  List<Json> sessions = [];
  final input = TextEditingController();
  final scroll = ScrollController();
  bool busy = false;
  Json? quota;

  @override
  void initState() {
    super.initState();
    smiles = widget.smiles;
    _loadSessions();
    _loadQuota();
  }

  @override
  void dispose() {
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  Future<void> _loadSessions() async {
    try {
      final r = await api.get('/chat');
      if (mounted) setState(() => sessions = ((r['items'] as List?) ?? []).cast<Json>());
    } catch (_) {}
  }

  Future<void> _loadQuota() async {
    try {
      final r = await api.get('/users/me/summary');
      if (mounted) setState(() => quota = r['quota'] as Json?);
    } catch (_) {}
  }

  Future<void> _open(String id) async {
    Navigator.of(context).maybePop();
    final r = await api.get('/chat/$id');
    if (!mounted) return;
    setState(() {
      sessionId = id;
      messages
        ..clear()
        ..addAll(((r['session']['messages'] as List?) ?? []).cast<Json>());
    });
  }

  void _scrollDown() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (scroll.hasClients) scroll.animateTo(scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      });

  Future<void> send(String text) async {
    final msg = text.trim();
    if (msg.isEmpty || busy) return;
    input.clear();
    setState(() {
      messages.add({'role': 'user', 'content': msg, 'smiles': smiles ?? ''});
      busy = true;
    });
    _scrollDown();
    try {
      final r = await api.post('/chat', {'sessionId': sessionId, 'message': msg, if (smiles != null) 'smiles': smiles}, const Duration(seconds: 90));
      if (!mounted) return;
      setState(() {
        sessionId = r['sessionId'] as String;
        messages.add({'role': 'model', 'content': r['reply']});
      });
      _loadSessions();
    } catch (e) {
      if (!mounted) return;
      setState(() => messages.removeLast());
      input.text = msg;
      toast(context, e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
      _loadQuota();
      _scrollDown();
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = Palette.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Asisten kimia'), actions: [
        IconButton(
          tooltip: 'Percakapan baru',
          icon: const Icon(Icons.add_comment_outlined),
          onPressed: () => setState(() {
            sessionId = null;
            messages.clear();
          }),
        ),
        Builder(builder: (c) => IconButton(tooltip: 'Riwayat percakapan', icon: const Icon(Icons.history), onPressed: () => Scaffold.of(c).openEndDrawer())),
      ]),
      endDrawer: Drawer(
        child: SafeArea(
          child: ListView(children: [
            const ListTile(title: Text('Riwayat percakapan', style: TextStyle(fontWeight: FontWeight.w600))),
            if (sessions.isEmpty) const Padding(padding: EdgeInsets.all(16), child: Muted('Belum ada percakapan.')),
            for (final s in sessions)
              ListTile(
                selected: s['_id'] == sessionId,
                title: Text(s['judul'] as String, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(timeAgo(s['updatedAt'] as String)),
                onTap: () => _open(s['_id'] as String),
                trailing: IconButton(
                  tooltip: 'Hapus percakapan',
                  icon: const Icon(Icons.delete_outline, size: 20),
                  onPressed: () async {
                    await api.delete('/chat/${s['_id']}');
                    if (s['_id'] == sessionId) {
                      setState(() {
                        sessionId = null;
                        messages.clear();
                      });
                    }
                    _loadSessions();
                  },
                ),
              ),
          ]),
        ),
      ),
      body: Column(children: [
        Expanded(
          child: ListView(controller: scroll, padding: const EdgeInsets.all(16), children: [
            if (messages.isEmpty) ...[
              const SizedBox(height: 16),
              const Muted('Tanya soal sifat, struktur, keselamatan, atau cara menguji senyawa. Kalau dibuka dari halaman senyawa, data senyawanya ikut dibaca.', size: 14),
              const SizedBox(height: 16),
              for (final s in _starters)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft, padding: const EdgeInsets.all(12)),
                    onPressed: () => send(s),
                    child: Text(s, style: TextStyle(color: p.inkSoft, fontWeight: FontWeight.normal)),
                  ),
                ),
            ],
            for (final m in messages)
              if (m['role'] == 'user')
                Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12, left: 40),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(color: p.cobalt, borderRadius: BorderRadius.circular(8)),
                    child: Text(m['content'] as String, style: TextStyle(color: p.onCobalt)),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.only(bottom: 16, right: 16),
                  child: MarkdownBody(data: m['content'] as String, selectable: true),
                ),
            if (busy) const Padding(padding: EdgeInsets.all(8), child: Align(alignment: Alignment.centerLeft, child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2)))),
          ]),
        ),
        Container(
          decoration: BoxDecoration(color: p.surface, border: Border(top: BorderSide(color: p.line))),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
          child: SafeArea(
            top: false,
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              if (smiles != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: p.sunk, borderRadius: BorderRadius.circular(6)),
                  child: Row(children: [
                    SizedBox(width: 56, child: StructureImage(smiles!, w: 112, h: 84)),
                    const SizedBox(width: 8),
                    Expanded(child: Text('Membahas $smiles', maxLines: 1, overflow: TextOverflow.ellipsis, style: mono(context, size: 12, color: p.inkSoft))),
                    IconButton(tooltip: 'Lepas senyawa', icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => smiles = null)),
                  ]),
                ),
              Row(children: [
                Expanded(child: TextField(controller: input, minLines: 1, maxLines: 4, textInputAction: TextInputAction.send, onSubmitted: send, decoration: const InputDecoration(hintText: 'Tulis pertanyaan'))),
                const SizedBox(width: 8),
                IconButton.filled(onPressed: busy ? null : () => send(input.text), icon: const Icon(Icons.send), tooltip: 'Kirim'),
              ]),
              const SizedBox(height: 4),
              Muted('${quota?['remaining'] != null ? 'Sisa ${quota!['remaining']} permintaan hari ini. ' : ''}Jawaban AI bisa keliru; cek ulang angka penting ke literatur atau SDS.', size: 11),
            ]),
          ),
        ),
      ]),
    );
  }
}
