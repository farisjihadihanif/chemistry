import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { useMeta } from "../context/Meta";
import { Formula, GroupTags, Structure } from "../components/chem";
import { detailLink } from "../components/Results";
import { Empty, ErrorBox, Spinner } from "../components/ui";

export default function Library() {
  const { meta } = useMeta();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [input, setInput] = useState(q);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!q) {
      setItems(null);
      return;
    }
    setItems(undefined);
    setError("");
    api.get(`/compounds/search?q=${encodeURIComponent(q)}`).then((r) => setItems(r.items)).catch((e) => {
      setError(e.message);
      setItems(null);
    });
  }, [q]);
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-semibold">Pustaka senyawa</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        {meta ? <span className="num">{meta.compounds.toLocaleString("id-ID")}</span> : "Ribuan"} senyawa organik dengan data sifat eksperimen dari PubChem. Cari dengan nama (bahasa Inggris), rumus molekul, atau nomor CID.
      </p>
      <form
        className="mt-6 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) setParams({ q: input.trim() });
        }}
      >
        <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="mis. glycol, C8H18, 702" aria-label="Cari senyawa" />
        <button className="btn-primary shrink-0"><Search size={16} /> Cari</button>
      </form>
      <div className="mt-4 max-w-xl"><ErrorBox>{error}</ErrorBox></div>
      <div className="mt-8">
        {items === undefined ? (
          <Spinner />
        ) : items === null ? null : items.length === 0 ? (
          <Empty title={`"${q}" tidak ditemukan`}>Coba nama dalam bahasa Inggris (mis. "acetic acid"), atau cari lewat Kalkulator dengan SMILES.</Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <li key={c.cid || c.smiles}>
                <Link to={detailLink(c)} className="panel flex gap-3 p-3 hover:border-ink-mute">
                  <div className="structure aspect-[4/3] w-28 shrink-0 rounded bg-sunk/60"><Structure smiles={c.smiles} w={224} h={168} /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-sm text-ink-soft"><Formula value={c.formula} /></p>
                    {c.cid && <p className="num text-xs text-ink-mute">CID {c.cid}</p>}
                    <div className="mt-1.5"><GroupTags meta={meta} groups={c.groups} max={3} /></div>
                    {!c.in_library && <p className="mt-1 text-xs text-ink-mute">Dari PubChem, sifat diprediksi</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
