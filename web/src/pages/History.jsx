import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { propInfo, useMeta } from "../context/Meta";
import { timeAgo } from "../lib/format";
import { ScoreBadge } from "../components/chem";
import { Empty, ErrorBox, Pagination, Spinner } from "../components/ui";

export default function History() {
  const { meta } = useMeta();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [pageNum, setPageNum] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    api.get(`/discoveries?page=${pageNum}&q=${encodeURIComponent(query)}`).then(setData).catch((e) => setError(e.message));
  }, [pageNum, query]);
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-semibold">Riwayat pencarian</h1>
      <form
        className="mt-6 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPageNum(1);
          setQuery(q.trim());
        }}
      >
        <input className="field" placeholder="Cari judul" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari riwayat" />
        <button className="btn-outline" aria-label="Cari"><Search size={16} /></button>
      </form>
      <ErrorBox>{error}</ErrorBox>
      <div className="mt-6">
        {!data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <Empty title={query ? "Tidak ada yang cocok" : "Belum ada pencarian"} action={!query && <Link to="/temukan" className="btn-primary">Mulai mencari</Link>}>
            {!query && "Setiap pencarian tersimpan di sini lengkap dengan hasilnya."}
          </Empty>
        ) : (
          <ul data-reveal="list" className="space-y-3">
            {data.items.map((d) => (
              <li key={d._id}>
                <Link to={`/temukan/${d._id}`} className="panel lift grid gap-2 px-4 py-4 hover:border-ink-mute sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-semibold">{d.judul}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-mute">
                      {meta ? Object.keys(d.criteria).map((k) => propInfo(meta, k).label).join(" · ") : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink-mute">
                      {timeAgo(d.createdAt)} · {d.knownCount} dikenal{d.novelCount ? `, ${d.novelCount} kandidat baru` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    {d.top.slice(0, 2).map((t) => (
                      <span key={t.smiles} className="flex items-center gap-1.5">
                        <ScoreBadge score={t.score} /> <span className="max-w-[10rem] truncate">{t.name}</span>
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {data && <Pagination page={data.page} pages={data.pages} onChange={setPageNum} />}
    </div>
  );
}
