import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Plus, Search, X } from "lucide-react";
import { api } from "../lib/api";
import { propInfo, useMeta } from "../context/Meta";
import { ErrorBox, PageLoader, Spinner } from "../components/ui";

const WEIGHTS = [
  [1, "Biasa"],
  [2, "Penting"],
  [3, "Sangat penting"],
];
const EXAMPLES = [
  "Pelarut untuk tinta cetak yang tidak terlalu cepat menguap, titik nyala di atas 40 °C, dan tanpa halogen.",
  "Cairan pendingin mesin yang tetap cair sampai -30 °C dan baru mendidih di atas 180 °C.",
  "Ester berat molekul sedang untuk plasticizer PVC yang hampir tidak menguap.",
];
const STEPS = ["Menyaring pustaka senyawa PubChem", "Merancang dan memprediksi kandidat baru", "Menyusun alasan untuk tiap senyawa"];

// Keterangan kecil di tiap baris: berapa data eksperimen & seberapa akurat modelnya.
function modelNote(t, key) {
  if (!t?.experimental) return null;
  const err = t.log ? `±${(10 ** t.mae).toFixed(1)}×` : `±${key === "density" ? t.mae.toFixed(2) : Math.round(t.mae)} ${t.unit}`;
  return `${t.experimental.toLocaleString("id-ID")} data eksperimen · galat prediksi rata-rata ${err}`;
}

function CriterionRow({ meta, k, c, onChange, onRemove }) {
  const info = propInfo(meta, k);
  const note = modelNote(meta.targets[k], k);
  const set = (field) => (e) => onChange({ ...c, [field]: e.target.value });
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {info.label} {info.unit && <span className="font-normal text-ink-mute">({info.unit})</span>}
        </p>
        <button type="button" onClick={onRemove} className="rounded p-1 text-ink-mute hover:bg-sunk hover:text-ink" aria-label={`Hapus kriteria ${info.label}`}>
          <X size={15} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_1fr_1.3fr] gap-2">
        <input className="field num px-2.5 py-1.5 text-sm" inputMode="decimal" placeholder="min" aria-label={`${info.label} minimum`} value={c.min ?? ""} onChange={set("min")} />
        <input className="field num px-2.5 py-1.5 text-sm" inputMode="decimal" placeholder="maks" aria-label={`${info.label} maksimum`} value={c.max ?? ""} onChange={set("max")} />
        <select className="field px-2 py-1.5 text-sm" value={c.weight || 1} onChange={(e) => onChange({ ...c, weight: Number(e.target.value) })} aria-label={`Kepentingan ${info.label}`}>
          {WEIGHTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      {note && <p className="mt-1.5 text-[11px] text-ink-mute">{note}</p>}
    </li>
  );
}

function GroupPicker({ meta, label, value, onChange, disabled = [] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {meta.groups.map((g) => {
          const on = value.includes(g.id);
          const off = disabled.includes(g.id);
          return (
            <button
              type="button"
              key={g.id}
              disabled={off}
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== g.id) : [...value, g.id])}
              className={`rounded-md border px-2 py-1 text-xs ${on ? "border-cobalt bg-cobalt text-cobalt-ink" : "border-line bg-surface text-ink-soft hover:border-ink-mute"} disabled:opacity-35`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Discover() {
  const { meta, error: metaError } = useMeta();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [mode, setMode] = useState(prefill?.mode || "form");
  const [preset, setPreset] = useState(prefill?.preset || "");
  const [criteria, setCriteria] = useState(prefill?.criteria || {});
  const [include, setInclude] = useState(prefill?.includeGroups || []);
  const [exclude, setExclude] = useState(prefill?.excludeGroups || []);
  const [prompt, setPrompt] = useState(prefill?.prompt || "");
  const [novel, setNovel] = useState(true);
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    api.get("/users/me/summary").then((r) => setQuota(r.quota)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!busy) return undefined;
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 2500);
    const t2 = setTimeout(() => setStep(2), 9000);
    return () => [t1, t2].forEach(clearTimeout);
  }, [busy]);

  const allKeys = useMemo(() => (meta ? [...Object.keys(meta.targets), ...Object.keys(meta.computed)] : []), [meta]);
  if (metaError) return <div className="container-page py-12"><ErrorBox>{metaError}</ErrorBox></div>;
  if (!meta) return <PageLoader />;
  const unused = allKeys.filter((k) => !(k in criteria));

  const applyPreset = (p) => {
    setPreset(p.id);
    setCriteria(Object.fromEntries(Object.entries(p.criteria).map(([k, c]) => [k, { min: c.min ?? "", max: c.max ?? "", weight: c.weight || 1 }])));
    setInclude(p.include_groups || []);
    setExclude(p.exclude_groups || []);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = mode === "kalimat" ? { mode, prompt, novel } : { mode, preset, criteria, includeGroups: include, excludeGroups: exclude, novel };
      const { discovery } = await api.post("/discoveries", body);
      navigate(`/temukan/${discovery._id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
      if (err.status === 429) toast.error(err.message);
    }
  };

  const canSubmit = mode === "kalimat" ? prompt.trim().length >= 10 && meta.ai : Object.values(criteria).some((c) => String(c.min ?? "").trim() !== "" || String(c.max ?? "").trim() !== "");

  return (
    <div className="container-page py-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold">Temukan senyawa</h1>
        <p className="mt-2 text-ink-soft">
          Tentukan sifat yang dibutuhkan. Chemistry mencari di <span className="num">{meta.compounds.toLocaleString("id-ID")}</span> senyawa PubChem, lalu merancang kandidat baru yang sifatnya diprediksi model.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div role="tablist" className="inline-flex rounded-md border border-line bg-surface p-0.5 text-sm">
            {[["form", "Isi kriteria"], ["kalimat", "Tulis kebutuhan"]].map(([v, l]) => (
              <button type="button" key={v} role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={`rounded px-3.5 py-1.5 font-medium ${mode === v ? "bg-cobalt text-cobalt-ink" : "text-ink-soft hover:text-ink"}`}>
                {l}
              </button>
            ))}
          </div>

          {mode === "kalimat" ? (
            <div className="mt-5">
              <label className="label" htmlFor="prompt">Ceritakan senyawa yang kamu butuhkan</label>
              <textarea id="prompt" className="field min-h-[140px]" maxLength={2000} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Misalnya: untuk apa senyawanya dipakai, suhu kerja, kekentalan, dan apa yang harus dihindari." />
              {!meta.ai && <p className="mt-2 text-sm text-danger">Mode ini butuh fitur AI yang belum aktif di server. Pakai mode Isi kriteria.</p>}
              <p className="mt-4 text-sm font-semibold">Contoh</p>
              <ul className="mt-2 space-y-1.5">
                {EXAMPLES.map((x) => (
                  <li key={x}>
                    <button type="button" onClick={() => setPrompt(x)} className="text-left text-sm text-ink-soft hover:text-cobalt">
                      {x}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink-mute">Kalimatmu diubah AI menjadi kriteria angka. Kriteria itu ditampilkan di halaman hasil dan bisa kamu ubah lewat mode Isi kriteria.</p>
            </div>
          ) : (
            <>
              <div className="mt-5">
                <p className="text-sm font-semibold">Mulai dari kebutuhan umum</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta.presets.map((p) => (
                    <button type="button" key={p.id} onClick={() => applyPreset(p)} title={p.description} className={`rounded-md border px-3 py-1.5 text-sm ${preset === p.id ? "border-cobalt bg-cobalt-soft text-cobalt" : "border-line bg-surface text-ink-soft hover:border-ink-mute"}`}>
                      {p.name}
                    </button>
                  ))}
                </div>
                {preset && <p className="mt-2 text-sm text-ink-mute">{meta.presets.find((p) => p.id === preset)?.description}</p>}
              </div>

              <div className="panel mt-5 px-4">
                {Object.keys(criteria).length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-mute">Pilih kebutuhan umum di atas, atau tambahkan sifat satu per satu.</p>
                ) : (
                  <ul>
                    {Object.entries(criteria).map(([k, c]) => (
                      <CriterionRow
                        key={k}
                        meta={meta}
                        k={k}
                        c={c}
                        onChange={(nc) => setCriteria((all) => ({ ...all, [k]: nc }))}
                        onRemove={() =>
                          setCriteria((all) => {
                            const { [k]: _omit, ...rest } = all;
                            return rest;
                          })
                        }
                      />
                    ))}
                  </ul>
                )}
                {unused.length > 0 && (
                  <div className="flex items-center gap-2 border-t border-line py-3">
                    <Plus size={15} className="text-ink-mute" />
                    <select
                      className="field max-w-xs px-2 py-1.5 text-sm"
                      value={adding}
                      aria-label="Tambah sifat"
                      onChange={(e) => {
                        const k = e.target.value;
                        if (k) setCriteria((all) => ({ ...all, [k]: { min: "", max: "", weight: 1 } }));
                        setAdding("");
                      }}
                    >
                      <option value="">Tambah sifat…</option>
                      {unused.map((k) => (
                        <option key={k} value={k}>{propInfo(meta, k).label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <GroupPicker meta={meta} label="Harus memiliki gugus" value={include} onChange={setInclude} disabled={exclude} />
                <GroupPicker meta={meta} label="Hindari gugus" value={exclude} onChange={setExclude} disabled={include} />
              </div>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="panel p-4">
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--cobalt))]" checked={novel} onChange={(e) => setNovel(e.target.checked)} />
              <span>
                <span className="font-semibold">Sertakan kandidat senyawa baru</span>
                <span className="mt-0.5 block text-ink-mute">Turunan dari senyawa terbaik{meta.ai ? " dan usulan AI" : ""}. Sifatnya prediksi, bukan hasil uji.</span>
              </span>
            </label>
            <ErrorBox>{error}</ErrorBox>
            <button className="btn-primary mt-4 w-full" disabled={busy || !canSubmit}>
              {busy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <Search size={16} />} {busy ? "Mencari…" : "Cari senyawa"}
            </button>
            {busy && (
              <ol className="mt-4 space-y-1.5 text-sm" aria-live="polite">
                {STEPS.map((s, i) => (
                  <li key={s} className={i < step ? "text-ink-mute line-through decoration-ink-mute/40" : i === step ? "font-medium text-ink" : "text-ink-mute"}>
                    {s}
                  </li>
                ))}
              </ol>
            )}
            {quota?.remaining != null && (
              <p className="mt-3 text-xs text-ink-mute">
                Sisa <span className="num">{quota.remaining}</span> dari <span className="num">{quota.limit}</span> pencarian & pertanyaan hari ini.
              </p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}
