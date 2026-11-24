import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Columns3, Heart, History, LogOut, Menu, Moon, Settings, Shield, Sun, UserPlus, X } from "lucide-react";
import { useAuth } from "../context/Auth";
import { useTheme } from "../context/Theme";
import { useCollect } from "../context/Collect";
import { displayName } from "../lib/format";
import { startReveal } from "../lib/reveal";
import { Avatar, PageLoader } from "./ui";
import { Logo } from "./Logo";
import FloatingChesty from "./FloatingChesty";

const NAV_USER = [
  ["/temukan", "Temukan"],
  ["/kalkulator", "Kalkulator"],
  ["/pustaka", "Pustaka"],
  ["/chesty", "Chesty"],
];
const NAV_GUEST = [
  ["/pustaka", "Pustaka"],
  ["/tentang", "Tentang data"],
];

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} className="rounded-md p-2 text-ink-soft hover:bg-sunk hover:text-ink" aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}>
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function UserMenu() {
  const { user, logout, isAdmin, accounts, switchAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const others = accounts.filter((a) => String(a._id) !== String(user._id));
  const item = "icon-nudge flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-sunk";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="block shrink-0 rounded-full hover:ring-2 hover:ring-line" aria-expanded={open} aria-haspopup="menu" aria-label="Menu akun">
        <Avatar user={user} size={36} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-64 rounded-lg border border-line bg-surface p-1.5 shadow-lift">
          <div className="flex items-center gap-3 border-b border-line px-3 pb-2.5 pt-1.5">
            <Avatar user={user} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName(user)}</p>
              <p className="truncate text-xs text-ink-mute">{user.institusi || `@${user.username}`}</p>
            </div>
          </div>
          {[["/riwayat", "Riwayat", History], ["/favorit", "Favorit", Heart], ["/bandingkan", "Bandingkan", Columns3], ["/akun", "Akun", Settings], ...(isAdmin ? [["/admin", "Admin", Shield]] : [])].map(([to, label, Icon]) => (
            <Link key={to} to={to} role="menuitem" className={item}>
              <Icon size={16} className="text-ink-mute" /> {label}
            </Link>
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <p className="px-3 pb-1 pt-1.5 text-xs text-ink-mute">Ganti akun</p>
            {others.map((a) => (
              <button
                key={a._id}
                role="menuitem"
                className={item}
                onClick={async () => {
                  try {
                    await switchAccount(a._id);
                    setOpen(false);
                  } catch {
                    navigate(`/masuk?tambah=1`);
                  }
                }}
              >
                <Avatar user={a} size={24} />
                <span className="min-w-0 truncate">{displayName(a)} <span className="text-ink-mute">@{a.username}</span></span>
              </button>
            ))}
            <Link to="/masuk?tambah=1" role="menuitem" className={item}>
              <UserPlus size={16} className="text-ink-mute" /> Tambah akun
            </Link>
          </div>
          <button
            role="menuitem"
            onClick={async () => {
              await logout();
              navigate("/masuk");
            }}
            className={`${item} border-t border-line text-danger`}
          >
            <LogOut size={16} /> Keluar dari @{user.username}
          </button>
        </div>
      )}
    </div>
  );
}

function Navbar() {
  const { user, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  const nav = user ? NAV_USER : NAV_GUEST;
  const link = ({ isActive }) => `nav-u rounded-md px-3 py-2 text-sm font-medium ${isActive ? "text-cobalt" : "text-ink-soft hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-page flex h-14 items-center gap-4">
        <Link to="/" className="flex items-center" aria-label="Chemistry, beranda">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <nav className="mr-2 hidden items-center gap-0.5 md:flex" aria-label="Utama">
            {nav.map(([to, label]) => (
              <NavLink key={to} to={to} className={link}>
                {label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
          {ready && (user ? (
            <UserMenu />
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link to="/masuk" className="btn-ghost btn-sm">Masuk</Link>
              <Link to="/daftar" className="btn-primary btn-sm">Daftar</Link>
            </div>
          ))}
          <button className="rounded-md p-2 text-ink-soft hover:bg-sunk md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line bg-paper md:hidden" aria-label="Utama (HP)">
          <div className="container-page flex flex-col py-2">
            {nav.map(([to, label]) => (
              <NavLink key={to} to={to} className={link}>
                {label}
              </NavLink>
            ))}
            {user && (
              <NavLink to="/riwayat" className={link}>
                Riwayat
              </NavLink>
            )}
            {!user && (
              <div className="mt-2 flex gap-2 border-t border-line pt-3">
                <Link to="/masuk" className="btn-outline btn-sm flex-1">Masuk</Link>
                <Link to="/daftar" className="btn-primary btn-sm flex-1">Daftar</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function CompareTray() {
  const { compare, clearCompare } = useCollect();
  const { pathname } = useLocation();
  if (!compare.length || pathname === "/bandingkan") return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 pr-24">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface py-2 pl-4 pr-2 shadow-lift">
        <Columns3 size={16} className="text-cobalt" />
        <span className="text-sm">
          <span className="num">{compare.length}</span> senyawa dipilih
        </span>
        <Link to="/bandingkan" className="btn-primary btn-sm">Bandingkan</Link>
        <button className="btn-ghost btn-sm" onClick={clearCompare}>Kosongkan</button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="container-page grid gap-2 py-5 text-center text-xs text-ink-mute md:grid-cols-3 md:text-left">
        <span>Created by Faris Jihadi Hanif Lubis</span>
        <span className="md:text-center">Chemistry © 2026</span>
        <nav className="flex justify-center gap-4 md:justify-end" aria-label="Informasi">
          <Link to="/tentang" className="link-u hover:text-ink">Tentang data</Link>
          <Link to="/ketentuan" className="link-u hover:text-ink">Ketentuan</Link>
          <Link to="/privasi" className="link-u hover:text-ink">Privasi</Link>
        </nav>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const rootRef = useRef(null);
  const firstPath = useRef(pathname);
  const moved = useRef(false);
  // Transisi halaman hanya saat berpindah, bukan pada tampilan pertama.
  if (pathname !== firstPath.current) moved.current = true;
  // Sebelum rute baru digambar, supaya posisi elemen dihitung dari puncak halaman.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useLayoutEffect(() => startReveal(rootRef.current), []);
  return (
    <div ref={rootRef} className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div key={`${user?._id || "tamu"}:${pathname}`} className={moved.current ? "page-enter" : undefined}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Footer />
      <CompareTray />
      <FloatingChesty />
    </div>
  );
}
