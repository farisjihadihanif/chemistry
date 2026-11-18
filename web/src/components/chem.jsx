import { structureUrl } from "../lib/api";
import { fmtValue, formulaParts } from "../lib/format";
import { useTheme } from "../context/Theme";
import { propInfo } from "../context/Meta";

export function Formula({ value, className = "" }) {
  if (!value) return null;
  return (
    <span className={`font-mono ${className}`}>
      {formulaParts(value).map((p, i) => (p.sub ? <sub key={i} className="text-[0.75em]">{p.text}</sub> : <span key={i}>{p.text}</span>))}
    </span>
  );
}

// Gambar struktur 2D dari RDKit (warna mengikuti tema).
export function Structure({ smiles, w = 320, h = 240, className = "", alt = "" }) {
  const { dark } = useTheme();
  if (!smiles) return null;
  return <img src={structureUrl(smiles, { w, h, dark })} alt={alt || `Struktur ${smiles}`} width={w} height={h} loading="lazy" className={`h-auto w-full select-none ${className}`} draggable={false} />;
}

// Warna skor mengikuti indikator bromtimol biru: kuning (< 60) -> hijau (60–84) -> biru (>= 85).
// eslint-disable-next-line react-refresh/only-export-components
export const scoreTone = (s) => (s >= 85 ? "high" : s >= 60 ? "mid" : "low");
const TONE = { high: "bg-ind-high text-white dark:text-paper", mid: "bg-ind-mid text-white dark:text-paper", low: "bg-ind-low text-white dark:text-paper" };

export function ScoreBadge({ score, size = "md" }) {
  if (score == null) return null;
  const s = Math.round(score);
  return (
    <span className={`num inline-flex items-baseline justify-center rounded-md font-medium ${TONE[scoreTone(s)]} ${size === "lg" ? "min-w-[3.5rem] px-2.5 py-1.5 text-xl" : "min-w-[2.75rem] px-2 py-1 text-sm"}`} title={`Skor kecocokan ${s} dari 100`}>
      {s}
    </span>
  );
}

// Penanda sumber angka: bulat penuh = eksperimen, bulat kosong = perkiraan.
export function SourceDot({ source }) {
  if (source === "struktur") return null;
  const exp = source === "eksperimen";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full border-[1.5px] border-cobalt ${exp ? "bg-cobalt" : "bg-transparent"}`}
      title={exp ? "Data eksperimen" : "Nilai perkiraan"}
      aria-label={exp ? "eksperimen" : "prediksi"}
    />
  );
}

export function PropValue({ meta, k, p, withRange = true }) {
  const info = propInfo(meta, k);
  if (!p) return <span className="text-ink-mute">–</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <SourceDot source={p.source} />
      <span className="num">{fmtValue(p.value, k)}</span>
      {info.unit && <span className="text-ink-mute">{info.unit}</span>}
      {withRange && p.source === "prediksi" && p.low != null && (
        <span className="num text-xs text-ink-mute">
          ({fmtValue(p.low, k)}–{fmtValue(p.high, k)})
        </span>
      )}
    </span>
  );
}

// Posisi nilai terhadap rentang target. Skala log untuk viskositas & tekanan uap.
export function RangeBar({ meta, k, p, c }) {
  const log = Boolean(meta?.targets?.[k]?.log);
  const f = (v) => (log ? Math.log10(Math.max(v, 1e-12)) : v);
  if (!p) return null;
  const v = f(p.value);
  const lo = c.min != null ? f(c.min) : null;
  const hi = c.max != null ? f(c.max) : null;
  const pts = [v, lo, hi, p.low != null ? f(p.low) : null, p.high != null ? f(p.high) : null].filter((x) => x != null);
  let a = Math.min(...pts);
  let b = Math.max(...pts);
  const pad = (b - a || Math.abs(v) || 1) * 0.25;
  a -= pad;
  b += pad;
  const pos = (x) => `${((x - a) / (b - a)) * 100}%`;
  const inside = (lo == null || v >= lo) && (hi == null || v <= hi);
  return (
    <div className="relative h-3 w-full" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
      <div className="absolute top-0.5 h-2 rounded-sm bg-cobalt-soft ring-1 ring-cobalt/30" style={{ left: lo == null ? 0 : pos(lo), right: hi == null ? 0 : `calc(100% - ${pos(hi)})` }} />
      {p.source === "prediksi" && p.low != null && <div className="absolute top-1/2 h-px -translate-y-1/2 bg-ink-mute" style={{ left: pos(f(p.low)), width: `calc(${pos(f(p.high))} - ${pos(f(p.low))})` }} />}
      <div
        className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${inside ? "border-cobalt" : "border-ind-low"} ${p.source === "eksperimen" ? (inside ? "bg-cobalt" : "bg-ind-low") : "bg-surface"}`}
        style={{ left: pos(v) }}
      />
    </div>
  );
}

export function GroupTags({ meta, groups = [], max = 4 }) {
  if (!groups.length || !meta) return null;
  const label = Object.fromEntries(meta.groups.map((g) => [g.id, g.label]));
  return (
    <span className="flex flex-wrap gap-1">
      {groups.slice(0, max).map((g) => (
        <span key={g} className="rounded bg-sunk px-1.5 py-0.5 text-[11px] text-ink-soft">
          {label[g] || g}
        </span>
      ))}
      {groups.length > max && <span className="px-1 text-[11px] text-ink-mute">+{groups.length - max}</span>}
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function compoundTitle(c) {
  if (c.name) return c.name;
  return c.origin === "gemini" || c.origin === "turunan" ? "Kandidat baru" : "Senyawa tanpa nama";
}
