import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { useAuth } from "../context/Auth";
import { ErrorBox, Modal } from "../components/ui";

export default function Account() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ namaLengkap: user.namaLengkap, institusi: user.institusi });
  const [pw, setPw] = useState({ passwordLama: "", passwordBaru: "" });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState("");
  const [summary, setSummary] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState("");
  useEffect(() => {
    api.get("/users/me/summary").then(setSummary).catch(() => {});
  }, []);
  const act = (key, fn) => async (e) => {
    e.preventDefault();
    setBusy(key);
    setErr({});
    try {
      await fn();
    } catch (e2) {
      setErr({ [key]: e2.message });
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="container-page max-w-2xl space-y-8 py-8">
      <h1 className="text-3xl font-semibold">Akun</h1>
      {summary && (
        <dl className="grid grid-cols-3 gap-3">
          {[["Pencarian", summary.discoveries], ["Favorit", summary.favorites], ["Sisa AI hari ini", summary.quota.remaining ?? "tanpa batas"]].map(([l, v]) => (
            <div key={l} className="panel p-3">
              <dd className="num text-xl font-semibold">{v}</dd>
              <dt className="text-xs text-ink-mute">{l}</dt>
            </div>
          ))}
        </dl>
      )}
      <form
        className="panel space-y-4 p-5"
        onSubmit={act("profil", async () => {
          setUser((await api.patch("/users/me", form)).user);
          toast.success("Profil disimpan.");
        })}
      >
        <h2 className="font-semibold">Profil</h2>
        <div><label className="label" htmlFor="nama">Nama lengkap</label><input id="nama" className="field" value={form.namaLengkap} onChange={(e) => setForm((f) => ({ ...f, namaLengkap: e.target.value }))} /></div>
        <div><label className="label" htmlFor="inst">Institusi / perusahaan</label><input id="inst" className="field" value={form.institusi} onChange={(e) => setForm((f) => ({ ...f, institusi: e.target.value }))} /></div>
        <p className="text-sm text-ink-mute">Email: {user.email} · Username: @{user.username}</p>
        <ErrorBox>{err.profil}</ErrorBox>
        <button className="btn-primary" disabled={busy === "profil"}>Simpan profil</button>
      </form>
      <form
        className="panel space-y-4 p-5"
        onSubmit={act("pw", async () => {
          if (pw.passwordBaru.length < 8) throw new Error("Password baru minimal 8 karakter.");
          await api.put("/users/me/password", pw);
          setPw({ passwordLama: "", passwordBaru: "" });
          toast.success("Password diganti. Perangkat lain otomatis keluar.");
        })}
      >
        <h2 className="font-semibold">Ganti password</h2>
        <div><label className="label" htmlFor="pl">Password lama</label><input id="pl" type="password" className="field" autoComplete="current-password" value={pw.passwordLama} onChange={(e) => setPw((p) => ({ ...p, passwordLama: e.target.value }))} /></div>
        <div><label className="label" htmlFor="pb">Password baru</label><input id="pb" type="password" className="field" autoComplete="new-password" value={pw.passwordBaru} onChange={(e) => setPw((p) => ({ ...p, passwordBaru: e.target.value }))} /></div>
        <ErrorBox>{err.pw}</ErrorBox>
        <button className="btn-primary" disabled={busy === "pw"}>Ganti password</button>
      </form>
      <section className="panel border-danger/30 p-5">
        <h2 className="font-semibold text-danger">Hapus akun</h2>
        <p className="mt-1 text-sm text-ink-soft">Akun, riwayat pencarian, favorit, dan percakapan asisten dihapus permanen.</p>
        <button className="btn-outline mt-3 text-danger" onClick={() => setDelOpen(true)}>Hapus akun</button>
      </section>
      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Hapus akun permanen?">
        <form
          onSubmit={act("del", async () => {
            await api.del("/users/me", { password: delPw });
            setUser(null);
            toast.success("Akun dihapus.");
            navigate("/");
          })}
          className="space-y-4"
        >
          <p className="text-sm text-ink-soft">Masukkan password untuk konfirmasi.</p>
          <input type="password" className="field" value={delPw} onChange={(e) => setDelPw(e.target.value)} aria-label="Password" autoComplete="current-password" />
          <ErrorBox>{err.del}</ErrorBox>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setDelOpen(false)}>Batal</button>
            <button className="btn bg-danger text-white hover:bg-danger/90" disabled={!delPw || busy === "del"}>Hapus akun</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
