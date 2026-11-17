import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/Auth";
import { api } from "../lib/api";
import { ErrorBox } from "../components/ui";
import { Logo } from "../components/Logo";

const safeNext = (n) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/temukan");

function Shell({ title, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo size={30} wordmark={false} />
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <div className="mt-6">{children}</div>
        {footer && <p className="mt-6 text-sm text-ink-soft">{footer}</p>}
      </div>
    </div>
  );
}

function PasswordField({ id, value, onChange, autoComplete, label = "Password" }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className="field pr-11" value={value} onChange={onChange} autoComplete={autoComplete} required />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-mute hover:text-ink" aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("next"));
  if (user) return <Navigate to={next} replace />;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.identifier.trim(), form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Shell title="Masuk" footer={<>Belum punya akun? <Link to={`/daftar?next=${encodeURIComponent(next)}`} className="font-semibold text-cobalt hover:underline">Daftar</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="identifier">Username atau email</label>
          <input id="identifier" className="field" autoComplete="username" required value={form.identifier} onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))} />
        </div>
        <PasswordField id="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        <div className="-mt-1 text-right"><Link to="/lupa-password" className="text-sm text-cobalt hover:underline">Lupa password?</Link></div>
        <ErrorBox>{error}</ErrorBox>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Masuk…" : "Masuk"}</button>
      </form>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ namaLengkap: "", institusi: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get("next"));
  if (user) return <Navigate to={next} replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === "username" ? e.target.value.toLowerCase() : e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Shell title="Buat akun" footer={<>Sudah punya akun? <Link to="/masuk" className="font-semibold text-cobalt hover:underline">Masuk</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label" htmlFor="nama">Nama lengkap</label><input id="nama" className="field" required autoComplete="name" value={form.namaLengkap} onChange={set("namaLengkap")} /></div>
        <div><label className="label" htmlFor="inst">Institusi / perusahaan <span className="font-normal text-ink-mute">(opsional)</span></label><input id="inst" className="field" autoComplete="organization" value={form.institusi} onChange={set("institusi")} /></div>
        <div><label className="label" htmlFor="username">Username</label><input id="username" className="field" required autoComplete="username" value={form.username} onChange={set("username")} /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="field" required autoComplete="email" value={form.email} onChange={set("email")} /></div>
        <PasswordField id="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
        <p className="text-xs text-ink-mute">Dengan mendaftar, kamu menyetujui <Link to="/ketentuan" className="underline">Ketentuan</Link> dan <Link to="/privasi" className="underline">Kebijakan Privasi</Link>.</p>
        <ErrorBox>{error}</ErrorBox>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Membuat akun…" : "Daftar"}</button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Lupa password" footer={<Link to="/masuk" className="font-semibold text-cobalt hover:underline">Kembali ke halaman masuk</Link>}>
      {done ? (
        <p className="text-ink-soft">{done}</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              setDone((await api.post("/auth/forgot", { email: email.trim() })).message);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm text-ink-soft">Masukkan email akunmu. Kami kirim link untuk membuat password baru.</p>
          <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <ErrorBox>{error}</ErrorBox>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Mengirim…" : "Kirim link"}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const { setUser } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [pw, setPw] = useState({ a: "", b: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Buat password baru" footer={<Link to="/lupa-password" className="font-semibold text-cobalt hover:underline">Minta link baru</Link>}>
      {!token ? (
        <p className="text-ink-soft">Link tidak lengkap. Buka lagi link dari email, atau minta link baru.</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw.a.length < 8) return setError("Password minimal 8 karakter.");
            if (pw.a !== pw.b) return setError("Kedua password tidak sama.");
            setBusy(true);
            setError("");
            try {
              setUser((await api.post("/auth/reset", { token, password: pw.a })).user);
              navigate("/temukan", { replace: true });
            } catch (err) {
              setError(err.message);
              setBusy(false);
            }
          }}
        >
          <PasswordField id="pw-a" label="Password baru" autoComplete="new-password" value={pw.a} onChange={(e) => setPw((p) => ({ ...p, a: e.target.value }))} />
          <PasswordField id="pw-b" label="Ulangi password baru" autoComplete="new-password" value={pw.b} onChange={(e) => setPw((p) => ({ ...p, b: e.target.value }))} />
          <ErrorBox>{error}</ErrorBox>
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Menyimpan…" : "Simpan password"}</button>
        </form>
      )}
    </Shell>
  );
}
