import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Search, Sparkles } from "lucide-react";
import { useAuth } from "../context/Auth";
import { propInfo, useMeta } from "../context/Meta";
import { Formula, PropValue, RangeBar, ScoreBadge, Structure } from "../components/chem";
import CountUp from "../components/CountUp";
import AtomOrbits from "../components/AtomOrbits";
import ParticleField from "../components/ParticleField";

// Contoh nyata dari pustaka: etil laktat terhadap kriteria pelarut.
const EXAMPLE = {
  name: "Ethyl lactate",
  formula: "C5H10O3",
  smiles: "CCOC(=O)C(C)O",
  score: 100,
  criteria: { boiling_point: { min: 60, max: 160 }, melting_point: { max: 0 }, flash_point: { min: 20 } },
  properties: {
    boiling_point: { value: 154, source: "eksperimen" },
    melting_point: { value: -26, source: "eksperimen" },
    flash_point: { value: 46.1, source: "eksperimen" },
  },
};

function Hero({ start }) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-57px)] items-center overflow-hidden">
      <ParticleField className="absolute inset-0 -z-20 h-full w-full" />
      <AtomOrbits className="-z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_45%_32%_at_center,rgb(var(--paper)/0.92)_0%,rgb(var(--paper)/0.6)_55%,transparent_100%)]" />
      <div className="container-page flex flex-col items-center py-20 text-center">
        <h1 className="hero-title pb-1 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:whitespace-nowrap lg:text-[clamp(2rem,2.6vw,3.2rem)]">
          Mulai dari sifat yang dibutuhkan, bukan dari nama senyawanya.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">Chemistry menyaring senyawa dengan data eksperimen, lalu merancang kandidat struktur baru dan memperkirakan sifatnya.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to={start} className="btn-primary px-6 py-3 text-base">Mulai mencari <ArrowRight size={18} /></Link>
          <Link to="/pustaka" className="btn-outline bg-surface/90 px-6 py-3 text-base backdrop-blur">Lihat pustaka senyawa</Link>
        </div>
      </div>
      <a href="#cara-kerja" className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full p-2 text-ink-mute hover:text-ink" aria-label="Lihat cara kerjanya">
        <ArrowDown size={20} className="animate-bounce motion-reduce:animate-none" />
      </a>
    </section>
  );
}

// ---- ilustrasi tiap langkah ----
function CriteriaVisual() {
  const rows = [
    ["Titik didih", "60", "160", "°C"],
    ["Titik leleh", "", "0", "°C"],
    ["Titik nyala", "20", "", "°C"],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-paper p-4">
        <p className="text-xs text-ink-mute">Tulis kebutuhan</p>
        <p className="mt-1.5 text-[15px] leading-relaxed">&ldquo;Pelarut untuk tinta cetak, cair di suhu ruang, tidak cepat menguap, dan tanpa halogen.&rdquo;</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-mute">
        <Sparkles size={14} className="text-cobalt" /> diubah menjadi kriteria
      </div>
      <div className="divide-y divide-line rounded-lg border border-line bg-paper">
        {rows.map(([label, min, max, unit]) => (
          <div key={label} className="grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2 px-4 py-2.5 text-sm">
            <span className="font-medium">{label} <span className="text-ink-mute">({unit})</span></span>
            <span className="num rounded border border-line bg-surface px-2 py-1 text-center">{min || <span className="text-ink-mute">min</span>}</span>
            <span className="num rounded border border-line bg-surface px-2 py-1 text-center">{max || <span className="text-ink-mute">maks</span>}</span>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 text-xs">
          <span className="text-ink-mute">Hindari:</span>
          {["Halogen", "Nitro"].map((g) => <span key={g} className="rounded bg-cobalt-soft px-2 py-0.5 text-cobalt">{g}</span>)}
        </div>
      </div>
    </div>
  );
}

function FilterVisual({ total }) {
  const candidates = [
    ["Ethyl lactate", "CCOC(=O)C(C)O", "senyawa dikenal"],
    ["Propil laktat", "CCCOC(=O)C(C)O", "rantai diperpanjang"],
    ["Etil 2-metoksipropanoat", "CCOC(=O)C(C)OC", "OH menjadi eter"],
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[[total, "senyawa di pustaka"], [37, "memenuhi kriteria"], [8, "kandidat baru"]].map(([n, l], i) => (
          <div key={l} className={`rounded-lg border p-3 ${i === 2 ? "border-cobalt/40 bg-cobalt-soft/60" : "border-line bg-paper"}`}>
            <p className="num text-xl font-semibold sm:text-2xl"><CountUp value={n} /></p>
            <p className="mt-0.5 text-xs text-ink-mute">{l}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-mute">Contoh untuk kebutuhan &ldquo;pelarut serbaguna&rdquo;.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {candidates.map(([name, smi, note]) => (
          <figure key={smi} className="lift rounded-lg border border-line bg-paper p-2">
            <div className="structure aspect-[4/3] rounded bg-sunk/50"><Structure smiles={smi} w={240} h={180} alt={`Struktur ${name}`} /></div>
            <figcaption className="mt-1.5 text-xs">
              <span className="block truncate font-medium">{name}</span>
              <span className="text-ink-mute">{note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function EvidenceVisual({ meta }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="flex items-start gap-4">
        <div className="structure zoom aspect-[4/3] w-28 shrink-0 rounded bg-sunk/60"><Structure smiles={EXAMPLE.smiles} w={224} h={168} alt="Struktur etil laktat" /></div>
        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-2">
            <ScoreBadge score={EXAMPLE.score} />
            <p className="font-semibold">{EXAMPLE.name}</p>
          </div>
          <p className="mt-1 text-sm text-ink-soft"><Formula value={EXAMPLE.formula} /></p>
          <p className="mt-1.5 text-sm text-ink-soft">Pelarut dari fermentasi jagung, mudah terurai.</p>
        </div>
      </div>
      {meta && (
        <dl className="mt-4 space-y-3 text-sm">
          {Object.entries(EXAMPLE.criteria).map(([k, c]) => (
            <div key={k}>
              <dt className="flex justify-between text-xs text-ink-mute">
                <span>{propInfo(meta, k).label}</span>
                <PropValue meta={meta} k={k} p={EXAMPLE.properties[k]} withRange={false} />
              </dt>
              <dd className="mt-1"><RangeBar meta={meta} k={k} p={EXAMPLE.properties[k]} c={c} /></dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-mute">Kotak biru muda = rentang target, titik = nilai eksperimen.</p>
    </div>
  );
}

// Kartu bertumpuk: setiap kartu menempel di atas saat digulir, kartu sebelumnya mengecil sedikit.
function StackedSteps({ steps }) {
  const refs = useRef([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const cards = refs.current.filter(Boolean);
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const a = card.getBoundingClientRect();
        const b = next.getBoundingClientRect();
        // 0 saat kartu berikutnya masih jauh, 1 saat sudah menutup penuh
        const t = Math.min(1, Math.max(0, (a.bottom - b.top) / a.height));
        card.style.transform = `scale(${1 - t * 0.06})`;
        card.style.filter = `brightness(${1 - t * 0.12})`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <ol className="relative">
      {steps.map((s, i) => (
        <li key={s.title} className="pb-6 lg:sticky lg:pb-8" style={{ top: `calc(5.5rem + ${i * 1.25}rem)` }}>
          <article
            ref={(el) => (refs.current[i] = el)}
            className="step-card lift grid origin-top gap-8 rounded-2xl border border-line bg-surface p-6 shadow-lift sm:p-10 lg:min-h-[30rem] lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
          >
            <div>
              <span className="num grid h-12 w-12 place-items-center rounded-full border-2 border-cobalt text-lg font-semibold text-cobalt">{i + 1}</span>
              <h3 data-reveal="up" className="mt-5 text-2xl font-semibold sm:text-3xl">{s.title}</h3>
              <p className="mt-3 max-w-md leading-relaxed text-ink-soft sm:text-lg">{s.body}</p>
            </div>
            <div data-reveal="right">{s.visual}</div>
          </article>
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const start = user ? "/temukan" : "/daftar?next=/temukan";
  const total = meta ? meta.compounds : 12776;
  const steps = [
    {
      title: "Tulis kriteria",
      body: "Isi rentang sifat lewat form, atau ceritakan kebutuhanmu dalam satu kalimat dan Chemistry mengubahnya jadi angka.",
      visual: <CriteriaVisual />,
    },
    {
      title: "Saring dan rancang",
      body: "Senyawa di pustaka dinilai terhadap kriteria. Dari yang terbaik, dibuat turunan baru (rantai, cabang, gugus) lalu sifatnya diperkirakan dari struktur.",
      visual: <FilterVisual total={total} />,
    },
    {
      title: "Periksa buktinya",
      body: "Setiap angka diberi tanda: eksperimen atau perkiraan beserta rentangnya. Lengkap dengan data bahaya GHS, senyawa mirip, dan alasan singkat.",
      visual: <EvidenceVisual meta={meta} />,
    },
  ];
  return (
    <>
      <Hero start={start} />

      <section id="cara-kerja" className="scroll-mt-16 border-t border-line bg-sunk/40">
        <div className="container-page pb-16 pt-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">Cara kerjanya</h2>
          <p className="mt-2 max-w-xl text-ink-soft">Tiga langkah dari kebutuhan sampai daftar senyawa yang bisa diuji.</p>
          <div className="mt-10">
            <StackedSteps steps={steps} />
          </div>
          <div className="mt-6 flex justify-center">
            <Link to={start} className="btn-primary px-6 py-3 text-base"><Search size={18} /> Coba sekarang</Link>
          </div>
        </div>
      </section>

      {meta && (
        <section className="container-page py-16">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-semibold">Seberapa banyak datanya</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Pustaka berisi <span className="num">{total.toLocaleString("id-ID")}</span> senyawa organik dengan sifat fisik hasil pengukuran. Perkiraan untuk struktur baru diuji terhadap senyawa yang tidak dipakai saat belajar, jadi ketepatannya bisa dilihat di tabel ini.
              </p>
              <Link to="/tentang" className="link-u icon-nudge mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cobalt">Cara Chemistry menghitung <ArrowRight size={15} /></Link>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-mute">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Sifat</th>
                  <th className="py-2 text-right font-medium">Data eksperimen</th>
                  <th className="py-2 text-right font-medium">Ketepatan perkiraan</th>
                </tr>
              </thead>
              <tbody data-reveal="list">
                {Object.entries(meta.targets).map(([k, t]) => (
                  <tr key={k} className="border-b border-line">
                    <td className="py-2">{t.label}</td>
                    <td className="num py-2 text-right"><CountUp value={t.experimental} /></td>
                    <td className="num py-2 text-right">{t.r2 != null ? <CountUp value={Math.round(t.r2 * 100)} format={(n) => `${n}%`} /> : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
