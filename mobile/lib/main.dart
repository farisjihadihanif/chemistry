import 'package:material_ui/material_ui.dart';

import 'screens/account.dart';
import 'screens/assistant.dart';
import 'screens/auth.dart';
import 'screens/calculator.dart';
import 'screens/discover.dart';
import 'screens/library.dart';
import 'state.dart';
import 'theme.dart';
import 'widgets/logo.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState()..init();
  runApp(AppScope(state: state, child: const ChemistryApp()));
}

class ChemistryApp extends StatelessWidget {
  const ChemistryApp({super.key});
  @override
  Widget build(BuildContext context) {
    final st = AppScope.of(context);
    return MaterialApp(
      title: 'Chemistry',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: st.themeMode,
      home: !st.ready
          ? const Scaffold(body: Center(child: Logo(size: 40)))
          : st.user == null
              ? const AuthScreen()
              : const Shell(),
    );
  }
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int index = 0;
  static const _pages = [DiscoverScreen(), CalculatorScreen(), LibraryScreen(), AssistantScreen(), AccountScreen()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.search), label: 'Temukan'),
          NavigationDestination(icon: Icon(Icons.science_outlined), selectedIcon: Icon(Icons.science), label: 'Kalkulator'),
          NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: 'Pustaka'),
          NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Asisten'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Akun'),
        ],
      ),
    );
  }
}
