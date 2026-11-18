import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { api, exportUrl } from "../lib/api";
import { propInfo, useMeta } from "../context/Meta";
import { formatDate, rangeText } from "../lib/format";
import { Legend, ResultRow } from "../components/Results";
import { ConfirmModal, Empty, PageLoader } from "../components/ui";

export default function DiscoveryResult() {
  const { id } = useParams();
  const { meta } = useMeta();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    api.get(`/discoveries/${id}`).then((r) => setD(r.discovery)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container-page py-16"><Empty title="Hasil tidak ditemukan">{error}</Empty></div>;
  if (!d || !meta) return <PageLoader />;
  const glabel = Object.fromEntries(meta.groups.map((g) => [g.id, g.label.toLowerCase()]));
  const editAgain = () =>
    navigate("/temukan", { state: { prefill: { mode: "form", preset: d.preset, criteria: d.criteria, includeGroups: d.includeGroups, excludeGroups: d.excludeGroups } } });

  return (
    <div className="container-page py-8">
      <Link to="/riwayat" className="text-sm text-cobalt hover:underline">Riwayat pencarian</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight">{d.judul}</h1>
          <p className="mt-1 text-sm text-ink-mute">{formatDate(d.createdAt)} · {d.mode === "kalimat" ? "dari kalimat" : "dari kriteria"}</p>
          {d.prompt && <blockquote className="mt-3 border-l-2 border-line pl-3 text-ink-soft">{d.prompt}</blockquote>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline btn-sm" onClick={editAgain}><Pencil size={14} /> Ubah kriteria</button>
          <a className="btn-outline btn-sm" href={exportUrl(d._id, "xlsx")}><Download size={14} /> Laporan Excel</a>
          <a className="btn-outline btn-sm" href={exportUrl(d._id, "json")}><Download size={14} /> JSON</a>
          <button className="btn-ghost btn-sm text-danger" onClick={() => setDel(true)} aria-label="Hapus dari riwayat"><Trash2 size={14} /></button>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold">Kriteria</h2>
          <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {Object.entries(d.criteria).map(([k, c]) => (
              <li key={k} className="flex justify-between gap-3 border-b border-dashed border-line pb-1.5">
                <span className="text-ink-soft">{propInfo(meta, k).label}{c.weight >= 2 && <span className="ml-1 text-xs text-ink-mute">({c.weight >= 3 ? "sangat penting" : "penting"})</span>}</span>
                <span className="num">{rangeText(c, propInfo(meta, k).unit)}</span>
              </li>
            ))}
          </ul>
          {(d.includeGroups.length > 0 || d.excludeGroups.length > 0) && (
            <p className="mt-3 text-sm text-ink-soft">
              {d.includeGroups.length > 0 && <>Harus ada gugus {d.includeGroups.map((g) => glabel[g]).join(", ")}. </>}
              {d.excludeGroups.length > 0 && <>Tanpa gugus {d.excludeGroups.map((g) => glabel[g]).join(", ")}.</>}
            </p>
          )}
        </div>
        <div className="panel p-4">
          <p className="num text-3xl font-semibold text-cobalt">{d.matched.toLocaleString("id-ID")}</p>
          <p className="text-sm text-ink-soft">senyawa di pustaka memenuhi semua kriteria.</p>
        </div>
      </section>

      {d.ringkasan && <p className="mt-6 max-w-3xl leading-relaxed text-ink-soft">{d.ringkasan}</p>}

      <div className="mt-8"><Legend /></div>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Senyawa yang sudah dikenal</h2>
        <p className="mt-1 text-sm text-ink-mute">Diurutkan menurut skor kecocokan.</p>
        <div className="mt-4 space-y-3">
          {d.known.length ? d.known.map((c, i) => <ResultRow key={c.smiles} c={c} meta={meta} criteria={d.criteria} discoveryId={d._id} rank={i} />) : <Empty title="Tidak ada senyawa yang cocok">Coba longgarkan rentang atau kurangi gugus yang dihindari.</Empty>}
        </div>
      </section>

      {d.novel.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Kandidat senyawa baru</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-mute">
            Struktur hasil modifikasi senyawa terbaik{d.novel.some((c) => c.origin === "gemini") ? " dan rancangan otomatis" : ""}. Semua sifatnya nilai perkiraan, jadi perlu dikonfirmasi lewat sintesis dan uji laboratorium.
          </p>
          <div className="mt-4 space-y-3">
            {d.novel.map((c, i) => <ResultRow key={c.smiles} c={c} meta={meta} criteria={d.criteria} discoveryId={d._id} rank={i} />)}
          </div>
        </section>
      )}

      <ConfirmModal
        open={del}
        title="Hapus hasil ini dari riwayat?"
        message="Senyawa yang sudah disimpan ke favorit tidak ikut terhapus."
        onClose={() => setDel(false)}
        onConfirm={async () => {
          await api.del(`/discoveries/${d._id}`).catch((e) => toast.error(e.message));
          navigate("/riwayat");
        }}
      />
    </div>
  );
}
