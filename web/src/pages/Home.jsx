import { Link } from "react-router-dom";
import { useAuth } from "../context/Auth";
import { propInfo, useMeta } from "../context/Meta";
import { Formula, PropValue, RangeBar, ScoreBadge, Structure } from "../components/chem";

// Contoh nyata dari pustaka: etil laktat terhadap kriteria pelarut (data eksperimen PubChem).
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

function ExampleCard({ meta }) {
  return (
    <figure className="panel p-5 shadow-lift">
      <div className="flex items-start gap-4">
        <div className="structure aspect-[4/3] w-36 shrink-0 rounded bg-sunk/60"><Structure smiles={EXAMPLE.smiles} w={288} h={216} alt="Struktur etil laktat" /></div>
        <div className="min-w-0 pt-1">
          <div className="flex items-center gap-2">
            <ScoreBadge score={EXAMPLE.score} />
            <p className="font-semibold">{EXAMPLE.name}</p>
          </div>
          <p className="mt-1 text-sm text-ink-soft"><Formula value={EXAMPLE.formula} /> · CID 7344</p>
          <p className="mt-2 text-sm text-ink-soft">Pelarut dari fermentasi jagung, mudah terurai.</p>
        </div>
      </div>
      {meta && (
        <dl className="mt-5 space-y-3 text-sm">
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
      <figcaption className="mt-4 border-t border-line pt-3 text-xs text-ink-mute">Contoh hasil untuk kebutuhan &ldquo;pelarut serbaguna&rdquo;. Kotak biru muda = rentang target, titik = nilai eksperimen.</figcaption>
    </figure>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const start = user ? "/temukan" : "/daftar?next=/temukan";
  return (
    <>
      <section className="container-page grid items-center gap-12 py-14 md:grid-cols-[1.05fr_1fr] md:py-20">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.1] sm:text-5xl">Mulai dari sifat yang dibutuhkan, bukan dari nama senyawanya.</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Tentukan titik didih, kekentalan, atau titik nyala yang kamu cari. Chemistry menyaring senyawa dengan data eksperimen PubChem, lalu merancang kandidat struktur baru dan memperkirakan sifatnya.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={start} className="btn-primary px-5 py-2.5">Mulai mencari</Link>
            <Link to="/pustaka" className="btn-outline px-5 py-2.5">Lihat pustaka senyawa</Link>
          </div>
        </div>
        <ExampleCard meta={meta} />
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-page py-14">
          <h2 className="text-2xl font-semibold">Cara kerjanya</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              ["Tulis kriteria", "Isi rentang sifat lewat form, atau ceritakan kebutuhanmu dalam satu kalimat dan biarkan AI mengubahnya jadi angka."],
              ["Saring dan rancang", "Senyawa di pustaka dinilai terhadap kriteria. Dari yang terbaik, dibuat turunan baru (rantai, cabang, gugus) yang sifatnya diprediksi model Random Forest."],
              ["Periksa buktinya", "Setiap angka diberi tanda: eksperimen atau prediksi beserta rentangnya. Lengkap dengan data bahaya GHS, senyawa mirip, dan alasan singkat."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[2rem_1fr] gap-x-3">
                <span className="num row-span-2 grid h-8 w-8 place-items-center rounded-full border border-cobalt text-sm text-cobalt">{i + 1}</span>
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {meta && (
        <section className="container-page py-14">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-2xl font-semibold">Dari mana angkanya</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Pustaka berisi <span className="num">{meta.compounds.toLocaleString("id-ID")}</span> senyawa organik yang sifat fisiknya tercatat di PubChem, sebagian besar dari Hazardous Substances Data Bank. Model dilatih dari data itu dan diuji dengan validasi silang 5 lipatan.
              </p>
              <Link to="/data" className="mt-4 inline-block text-sm font-semibold text-cobalt hover:underline">Rincian data dan akurasi model</Link>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-mute">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Sifat</th>
                  <th className="py-2 text-right font-medium">Data eksperimen</th>
                  <th className="py-2 text-right font-medium">R² model</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta.targets).map(([k, t]) => (
                  <tr key={k} className="border-b border-line">
                    <td className="py-2">{t.label}</td>
                    <td className="num py-2 text-right">{t.experimental.toLocaleString("id-ID")}</td>
                    <td className="num py-2 text-right">{t.r2?.toFixed(2)}</td>
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
