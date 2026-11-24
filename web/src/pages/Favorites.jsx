import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Search, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useMeta, propInfo } from "../context/Meta";
import { useCollect, keyOf } from "../context/Collect";
import { fmtValue, timeAgo } from "../lib/format";
import { compoundTitle, Formula, SourceDot, Structure } from "../components/chem";
import { detailLink } from "../components/Results";
import { ConfirmModal, Empty, ErrorBox, Pagination, Spinner } from "../components/ui";

function FavoriteCard({ f, meta, onChange, onDelete }) {
  const c = f.compound;
  const [note, setNote] = useState(f.catatan);
  const [tags, setTags] = useState(f.tags.join(", "));
  const dirty = note !== f.catatan || tags !== f.tags.join(", ");
  const save = async () => {
    try {
      const r = await api.patch(`/favorites/${f._id}`, { catatan: note, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) });
      onChange(r.favorite);
      toast.success("Catatan disimpan.");
    } catch (e) {
      toast.error(e.message);
    }
  };
  const shown = ["boiling_point", "melting_point", "flash_point", "viscosity", "density"].filter((k) => c.properties?.[k]);
  return (
    <li className="panel lift grid gap-4 p-4 sm:grid-cols-[120px_1fr]">
      <Link to={detailLink(c)} className="structure block aspect-[4/3] rounded bg-sunk/60"><Structure smiles={c.smiles} w={240} h={180} /></Link>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={detailLink(c)} className="link-u font-semibold">{compoundTitle(c)}</Link>
            <p className="text-sm text-ink-soft"><Formula value={c.formula} /> <span className="text-xs text-ink-mute">· disimpan {timeAgo(f.createdAt)}</span></p>
          </div>
          <button className="rounded p-1.5 text-ink-mute hover:bg-sunk hover:text-danger" onClick={() => onDelete(f)} aria-label={`Hapus ${compoundTitle(c)} dari favorit`}><Trash2 size={15} /></button>
        </div>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {shown.map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <dt className="text-ink-mute">{propInfo(meta, k).label}</dt>
              <dd className="flex items-center gap-1"><SourceDot source={c.properties[k].source} /><span className="num">{fmtValue(c.properties[k].value, k)}</span> <span className="text-ink-mute">{propInfo(meta, k).unit}</span></dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_200px]">
          <textarea className="field min-h-[60px] text-sm" placeholder="Catatan (mis. rencana uji, pemasok)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Catatan" maxLength={2000} />
          <div>
            <input className="field text-sm" placeholder="Tag, pisahkan koma" value={tags} onChange={(e) => setTags(e.target.value)} aria-label="Tag" />
            {dirty && <button className="btn-primary btn-sm mt-2 w-full" onClick={save}>Simpan catatan</button>}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function Favorites() {
  const { meta } = useMeta();
  const { toggleFav, favKeys } = useCollect();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [del, setDel] = useState(null);
  useEffect(() => {
    setData(null);
    api.get(`/favorites?page=${pageNum}&q=${encodeURIComponent(query)}`).then(setData).catch((e) => setError(e.message));
  }, [pageNum, query, favKeys.size]);
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-semibold">Favorit</h1>
      <form className="mt-6 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); setPageNum(1); setQuery(q.trim()); }}>
        <input className="field" placeholder="Cari nama, rumus, atau tag" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari favorit" />
        <button className="btn-outline" aria-label="Cari"><Search size={16} /></button>
      </form>
      <ErrorBox>{error}</ErrorBox>
      <div className="mt-6">
        {!data || !meta ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <Empty title={query ? "Tidak ada yang cocok" : "Belum ada favorit"}>{!query && "Simpan senyawa dari hasil pencarian atau halaman senyawa untuk dibandingkan dan diberi catatan."}</Empty>
        ) : (
          <ul data-reveal="list" className="space-y-3">
            {data.items.map((f) => (
              <FavoriteCard key={f._id} f={f} meta={meta} onChange={(nf) => setData((d) => ({ ...d, items: d.items.map((x) => (x._id === nf._id ? nf : x)) }))} onDelete={setDel} />
            ))}
          </ul>
        )}
      </div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPageNum} />}
      <ConfirmModal
        open={Boolean(del)}
        title="Hapus dari favorit?"
        message={del ? `${compoundTitle(del.compound)} beserta catatannya akan dihapus.` : ""}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (favKeys.has(keyOf(del.compound))) await toggleFav(del.compound);
          else await api.del(`/favorites/${del._id}`);
          setDel(null);
        }}
      />
    </div>
  );
}
