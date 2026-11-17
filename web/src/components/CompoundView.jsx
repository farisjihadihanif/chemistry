import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Columns3, Copy, ExternalLink, Heart, MessageSquare } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../lib/api";
import { useMeta, propInfo } from "../context/Meta";
import { keyOf, useCollect } from "../context/Collect";
import { useAuth } from "../context/Auth";
import { fmtValue } from "../lib/format";
import { compoundTitle, Formula, GroupTags, SourceDot, Structure } from "./chem";
import { detailLink } from "./Results";
import { Spinner } from "./ui";

function Hazards({ cid }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    api.get(`/compounds/${cid}/hazards`).then((r) => setState({ data: r.hazards })).catch((e) => setState({ error: e.message }));
  }, [cid]);
  if (state.loading) return <Spinner />;
  if (state.error) return <p className="text-sm text-ink-mute">{state.error}</p>;
  const h = state.data;
  if (h.none || (!h.pictograms.length && !h.statements.length)) return <p className="text-sm text-ink-mute">PubChem tidak mencantumkan klasifikasi bahaya GHS untuk senyawa ini. Itu belum tentu berarti aman; periksa SDS dari pemasok.</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {h.signal && <span className={`rounded px-2 py-0.5 text-sm font-semibold ${h.signal === "Bahaya" ? "bg-danger text-white" : "bg-ind-low text-white"}`}>{h.signal}</span>}
        {h.pictograms.map((p) => (
          <span key={p.code} className="flex items-center gap-1.5 text-sm text-ink-soft" title={p.code}>
            <img src={`https://pubchem.ncbi.nlm.nih.gov/images/ghs/${p.code}.svg`} alt="" className="h-8 w-8" /> {p.label}
          </span>
        ))}
      </div>
      {h.statements.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {h.statements.slice(0, 10).map((s) => (
            <li key={s.code}>
              <span className="num mr-2 text-ink-mute">{s.code}</span>
              {s.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-mute">Sumber: klasifikasi GHS di PubChem (laporan pertama). Pernyataan bahaya ditampilkan dalam bahasa aslinya.</p>
    </div>
  );
}

export default function CompoundView({ c }) {
  const { meta } = useMeta();
  const { user } = useAuth();
  const { favKeys, toggleFav, toggleCompare, inCompare } = useCollect();
  if (!meta) return null;
  const fav = favKeys.has(keyOf(c));
  const keys = [...Object.keys(meta.targets), ...Object.keys(meta.computed)];
  const novel = !c.in_library;
  return (
    <div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <div className="structure panel aspect-[4/3] p-3">
            <Structure smiles={c.smiles} w={640} h={480} />
          </div>
          <div className="mt-3 flex items-start gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-xs text-ink-mute">{c.smiles}</p>
            <button
              className="rounded p-1 text-ink-mute hover:bg-sunk hover:text-ink"
              onClick={() => navigator.clipboard.writeText(c.smiles).then(() => toast.success("SMILES disalin."))}
              aria-label="Salin SMILES"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight">{compoundTitle(c)}</h1>
          {c.iupac && c.iupac.toLowerCase() !== c.name?.toLowerCase() && <p className="mt-1 text-sm text-ink-soft">{c.iupac}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-3 text-ink-soft">
            <Formula value={c.formula} className="text-lg" />
            {c.cid && (
              <a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-cobalt hover:underline">
                PubChem CID {c.cid} <ExternalLink size={13} />
              </a>
            )}
          </p>
          <div className="mt-3"><GroupTags meta={meta} groups={c.groups} max={10} /></div>
          {novel && (
            <p className="mt-4 rounded-md bg-cobalt-soft px-3 py-2 text-sm text-ink">
              Struktur ini tidak ada di pustaka. Semua sifat fisiknya prediksi model{c.synth_score != null && <>, dengan perkiraan kesulitan sintesis <span className="num">{c.synth_score}</span> dari 10</>}.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {user && (
              <button onClick={() => toggleFav(c)} className={`btn-outline btn-sm ${fav ? "text-danger" : ""}`} aria-pressed={fav}>
                <Heart size={14} fill={fav ? "currentColor" : "none"} /> {fav ? "Favorit" : "Simpan"}
              </button>
            )}
            <button onClick={() => toggleCompare(c)} className="btn-outline btn-sm" aria-pressed={inCompare(c)}>
              <Columns3 size={14} /> {inCompare(c) ? "Dibandingkan" : "Bandingkan"}
            </button>
            {user && (
              <Link to={`/asisten?smiles=${encodeURIComponent(c.smiles)}`} className="btn-outline btn-sm">
                <MessageSquare size={14} /> Tanya asisten
              </Link>
            )}
          </div>

          <table className="mt-6 w-full text-sm">
            <caption className="sr-only">Sifat senyawa</caption>
            <tbody>
              {keys.map((k) => {
                const p = c.properties?.[k];
                if (!p) return null;
                const info = propInfo(meta, k);
                return (
                  <tr key={k} className="border-b border-line">
                    <th scope="row" className="py-2 pr-4 text-left font-normal text-ink-soft">{info.label}</th>
                    <td className="py-2 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <SourceDot source={p.source} />
                        <span className="num">{fmtValue(p.value, k)}</span>
                        <span className="w-14 text-left text-ink-mute">{info.unit}</span>
                      </span>
                    </td>
                    <td className="hidden py-2 pl-3 text-right text-xs text-ink-mute sm:table-cell">
                      {p.source === "eksperimen" ? "eksperimen" : p.source === "prediksi" ? <span className="num">{fmtValue(p.low, k)} – {fmtValue(p.high, k)}</span> : "dari struktur"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink-mute">Rentang di samping nilai prediksi adalah sebaran ±1 simpangan baku antar pohon model.</p>
        </div>
      </div>

      {c.cid && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Keselamatan</h2>
          <div className="mt-3"><Hazards cid={c.cid} /></div>
        </section>
      )}

      {c.similar?.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Senyawa mirip di pustaka</h2>
          <p className="mt-1 text-sm text-ink-mute">Kemiripan struktur (Tanimoto, sidik jari Morgan).</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {c.similar.map((s) => (
              <li key={s.cid}>
                <Link to={detailLink(s)} className="panel block p-2 hover:border-ink-mute">
                  <div className="structure aspect-[4/3]"><Structure smiles={s.smiles} w={240} h={180} /></div>
                  <p className="mt-1 truncate text-sm font-medium">{s.name || s.formula}</p>
                  <p className="num text-xs text-ink-mute">{Math.round(s.similarity * 100)}% mirip</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
