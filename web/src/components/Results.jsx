import { Link } from "react-router-dom";
import { Columns3, ExternalLink, Heart, MessageSquare, Sparkles } from "lucide-react";
import { compoundTitle, Formula, GroupTags, PropValue, RangeBar, ScoreBadge, Structure } from "./chem";
import { propInfo } from "../context/Meta";
import { keyOf, useCollect } from "../context/Collect";
import { useAuth } from "../context/Auth";

const NOVELTY = {
  belum_terdaftar: { text: "Belum terdaftar di PubChem", cls: "text-ind-mid" },
  terdaftar: { text: "Sudah terdaftar di PubChem, tapi belum ada data sifatnya", cls: "text-ink-mute" },
  tidak_dicek: { text: "Status di PubChem belum bisa dicek", cls: "text-ink-mute" },
};

// eslint-disable-next-line react-refresh/only-export-components
export function detailLink(c) {
  return c.cid ? `/senyawa/${c.cid}` : `/kalkulator?smiles=${encodeURIComponent(c.smiles)}`;
}

export function ResultRow({ c, meta, criteria, discoveryId, rank }) {
  const { user } = useAuth();
  const { favKeys, toggleFav, toggleCompare, inCompare } = useCollect();
  const fav = favKeys.has(keyOf(c));
  const novel = !c.in_library && c.origin !== "pustaka";
  return (
    <article className="panel rise grid grid-cols-[88px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[132px_minmax(0,1fr)] lg:grid-cols-[132px_minmax(0,1fr)_260px]" style={{ animationDelay: `${Math.min(rank, 10) * 40}ms` }}>
      <Link to={detailLink(c)} className="structure block aspect-[4/3] w-full self-start rounded-md bg-sunk/60 p-1" aria-label={`Lihat detail ${compoundTitle(c)}`}>
        <Structure smiles={c.smiles} w={264} h={198} />
      </Link>

      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <ScoreBadge score={c.score} />
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">
              <Link to={detailLink(c)} className="hover:underline">
                {compoundTitle(c)}
              </Link>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
              <Formula value={c.formula} />
              {c.cid && (
                <a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-mute hover:text-cobalt">
                  CID {c.cid} <ExternalLink size={11} />
                </a>
              )}
            </p>
          </div>
        </div>
        {novel && (
          <p className="mt-2 text-xs text-ink-soft">
            {c.origin === "gemini" ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-cobalt" /> Usulan AI
              </span>
            ) : (
              <>Turunan {c.parent?.name || "senyawa induk"}: {c.rule?.toLowerCase()}</>
            )}
            {c.novelty && <span className={`ml-2 ${NOVELTY[c.novelty]?.cls}`}>· {NOVELTY[c.novelty]?.text}</span>}
            {c.synth_score != null && <span className="ml-2 text-ink-mute">· kesulitan sintesis <span className="num">{c.synth_score}</span>/10</span>}
          </p>
        )}
        <p className="mt-2.5 font-mono text-[11px] text-ink-mute break-all">{c.smiles}</p>
        <div className="mt-2">
          <GroupTags meta={meta} groups={c.groups} />
        </div>
        {c.alasan && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.alasan}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {user && (
            <button onClick={() => toggleFav(c, discoveryId)} className={`btn-ghost btn-sm ${fav ? "text-danger" : ""}`} aria-pressed={fav}>
              <Heart size={14} fill={fav ? "currentColor" : "none"} /> {fav ? "Favorit" : "Simpan"}
            </button>
          )}
          <button onClick={() => toggleCompare(c)} className={`btn-ghost btn-sm ${inCompare(c) ? "text-cobalt" : ""}`} aria-pressed={inCompare(c)}>
            <Columns3 size={14} /> {inCompare(c) ? "Dibandingkan" : "Bandingkan"}
          </button>
          {user && (
            <Link to={`/asisten?smiles=${encodeURIComponent(c.smiles)}`} className="btn-ghost btn-sm">
              <MessageSquare size={14} /> Tanya asisten
            </Link>
          )}
        </div>
      </div>

      <dl className="col-span-2 grid content-start gap-3 border-t border-line pt-3 text-sm lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        {Object.entries(criteria).map(([k, crit]) => (
          <div key={k}>
            <dt className="flex items-baseline justify-between gap-2 text-xs text-ink-mute">
              <span>{propInfo(meta, k).label}</span>
              <PropValue meta={meta} k={k} p={c.properties?.[k]} withRange={false} />
            </dt>
            <dd className="mt-1">
              <RangeBar meta={meta} k={k} p={c.properties?.[k]} c={crit} />
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-mute">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border-[1.5px] border-cobalt bg-cobalt" /> data eksperimen PubChem
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border-[1.5px] border-cobalt" /> prediksi model
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-5 rounded-sm bg-cobalt-soft ring-1 ring-cobalt/30" /> rentang target
      </span>
      <span className="inline-flex items-center gap-1.5">
        skor
        <span className="h-2.5 w-3 rounded-sm bg-ind-low" />
        <span className="h-2.5 w-3 rounded-sm bg-ind-mid" />
        <span className="h-2.5 w-3 rounded-sm bg-ind-high" />
        rendah → tinggi
      </span>
    </div>
  );
}
