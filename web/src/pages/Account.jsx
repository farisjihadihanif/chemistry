import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api, uploadAvatar } from "../lib/api";
import { useAuth } from "../context/Auth";
import { Avatar, ErrorBox, Modal } from "../components/ui";
import AvatarCropper from "../components/AvatarCropper";

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
  const [cropFile, setCropFile] = useState(null);
  const fileRef = useRef(null);
  const pickPhoto = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error("Pilih gambar JPG, PNG, atau WebP.");
    if (f.size > 8 * 1024 * 1024) return toast.error("Ukuran gambar maksimal 8 MB.");
    setCropFile(f);
  };
  const savePhoto = async (file) => {
    setCropFile(null);
    setBusy("foto");
    try {
      setUser((await uploadAvatar(file)).user);
      toast.success("Foto profil diperbarui.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
  const removePhoto = async () => {
    setBusy("foto");
    try {
      setUser((await api.del("/users/me/foto")).user);
      toast.success("Foto profil dihapus.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };
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
          {[["Pencarian", summary.discoveries], ["Favorit", summary.favorites], ["Sisa kuota Chesty hari ini", summary.quota.remaining ?? "tanpa batas"]].map(([l, v]) => (
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
        <div className="flex items-center gap-4">
          <Avatar user={user} size={72} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline btn-sm" disabled={busy === "foto"} onClick={() => fileRef.current?.click()}>
              {user.foto ? "Ganti foto" : "Unggah foto"}
            </button>
            {user.foto && (
              <button type="button" className="btn-ghost btn-sm text-danger" disabled={busy === "foto"} onClick={removePhoto}>Hapus foto</button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickPhoto} />
          </div>
        </div>
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
        <p className="mt-1 text-sm text-ink-soft">Akun, riwayat pencarian, favorit, foto, dan percakapan dengan Chesty dihapus permanen.</p>
        <button className="btn-outline mt-3 text-danger" onClick={() => setDelOpen(true)}>Hapus akun</button>
      </section>
      {cropFile && <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={savePhoto} />}
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
