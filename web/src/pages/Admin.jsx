import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/Auth";
import { displayName, formatDate, timeAgo } from "../lib/format";
import CountUp from "../components/CountUp";
import { Avatar, ConfirmModal, Empty, ErrorBox, Pagination, Spinner } from "../components/ui";

function Stats() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then(setS).catch(() => {});
  }, []);
  if (!s) return <Spinner />;
  const max = Math.max(1, ...s.perDay.map((d) => d.n));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <dl data-reveal="list" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Pengguna", s.users],
          ["Akun aktif", s.aktif],
          ["Admin", s.admins],
          ["Total pencarian", s.discoveries],
          ["Pencarian 7 hari", s.discoveriesWeek],
          ["Permintaan Chesty & kalimat hari ini", s.aiToday],
        ].map(([l, v]) => (
          <div key={l} className="panel lift p-3">
            <dd className="num text-2xl font-semibold"><CountUp value={v} /></dd>
            <dt className="text-xs text-ink-mute">{l}</dt>
          </div>
        ))}
      </dl>
      <div className="panel p-4">
        <p className="text-sm font-semibold">Pencarian per hari (7 hari)</p>
        {s.perDay.length ? (
          <ul className="mt-3 space-y-1.5">
            {s.perDay.map((d) => (
              <li key={d._id} className="grid grid-cols-[72px_1fr_32px] items-center gap-2 text-xs">
                <span className="text-ink-mute">{new Date(d._id).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                <span className="h-2 rounded-sm bg-cobalt" style={{ width: `${(d.n / max) * 100}%` }} />
                <span className="num text-right">{d.n}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-mute">Belum ada pencarian minggu ini.</p>
        )}
      </div>
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState({ q: "", role: "", status: "" });
  const [pageNum, setPageNum] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(pageNum), ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) });
    api.get(`/admin/users?${p}`).then(setData).catch((e) => setError(e.message));
  }, [pageNum, filter]);
  useEffect(() => {
    load();
  }, [load]);
  const patch = async (u, body, msg) => {
    try {
      await api.patch(`/admin/users/${u._id}`, body);
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPageNum(1); setFilter((f) => ({ ...f, q: q.trim() })); }}>
          <input className="field w-60" placeholder="Nama, email, institusi" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pengguna" />
          <button className="btn-outline" aria-label="Cari"><Search size={16} /></button>
        </form>
        <select className="field w-auto" value={filter.role} onChange={(e) => { setPageNum(1); setFilter((f) => ({ ...f, role: e.target.value })); }} aria-label="Peran">
          <option value="">Semua peran</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select className="field w-auto" value={filter.status} onChange={(e) => { setPageNum(1); setFilter((f) => ({ ...f, status: e.target.value })); }} aria-label="Status">
          <option value="">Semua status</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
      </div>
      <ErrorBox>{error}</ErrorBox>
      {!data ? (
        <div className="mt-6"><Spinner /></div>
      ) : data.items.length === 0 ? (
        <div className="mt-6"><Empty title="Tidak ada pengguna" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-mute">
              <tr>
                <th className="px-4 py-2.5 font-medium">Pengguna</th>
                <th className="px-4 py-2.5 font-medium">Institusi</th>
                <th className="px-4 py-2.5 font-medium">Pencarian</th>
                <th className="px-4 py-2.5 font-medium">Terakhir masuk</th>
                <th className="px-4 py-2.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id} className={`border-b border-line last:border-0 ${u.aktif ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                      <Avatar user={u} size={34} />
                      <div className="min-w-0">
                      <p className="font-medium">
                        {displayName(u)} {u.role === "admin" && <span className="ml-1 rounded bg-cobalt px-1.5 py-0.5 text-[10px] font-semibold text-cobalt-ink">admin</span>}
                        {!u.aktif && <span className="ml-1 rounded bg-sunk px-1.5 py-0.5 text-[10px]">nonaktif</span>}
                      </p>
                      <p className="text-xs text-ink-mute">@{u.username} · {u.email} · sejak {formatDate(u.createdAt)}</p>
                      </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{u.institusi || "–"}</td>
                    <td className="num px-4 py-3">{u.discoveries}</td>
                    <td className="px-4 py-3 text-ink-soft">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "–"}</td>
                    <td className="px-4 py-3">
                      {self ? (
                        <span className="text-xs text-ink-mute">akunmu</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <button className="btn-outline btn-sm" onClick={() => patch(u, { role: u.role === "admin" ? "user" : "admin" }, u.role === "admin" ? "Dijadikan user." : "Dijadikan admin.")}>
                            {u.role === "admin" ? "Jadikan user" : "Jadikan admin"}
                          </button>
                          <button className="btn-outline btn-sm" onClick={() => patch(u, { aktif: !u.aktif }, u.aktif ? "Akun dinonaktifkan." : "Akun diaktifkan.")}>
                            {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button className="btn-ghost btn-sm text-danger" onClick={() => setConfirm(u)}>Hapus</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPageNum} />}
      <ConfirmModal
        open={Boolean(confirm)}
        title="Hapus akun ini?"
        message={confirm ? `Akun @${confirm.username} beserta riwayat, favorit, dan percakapannya dihapus permanen. Untuk sementara, pertimbangkan Nonaktifkan saja.` : ""}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await api.del(`/admin/users/${confirm._id}`);
            toast.success("Akun dihapus.");
            setConfirm(null);
            load();
          } catch (e) {
            toast.error(e.message);
          }
        }}
      />
    </div>
  );
}

export default function Admin() {
  return (
    <div className="container-page space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-semibold">Admin</h1>
        <div className="mt-6"><Stats /></div>
      </div>
      <section>
        <h2 className="text-xl font-semibold">Pengguna</h2>
        <div className="mt-4"><Users /></div>
      </section>
    </div>
  );
}
