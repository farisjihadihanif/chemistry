import { Link } from "react-router-dom";
import { useAuth } from "../context/Auth";
import { useMeta } from "../context/Meta";
import MoleculeField from "../components/MoleculeField";

export default function Home() {
  const { user } = useAuth();
  const { meta } = useMeta();
  const start = user ? "/temukan" : "/daftar?next=/temukan";
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <MoleculeField className="absolute inset-0 -z-10 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(var(--paper)/0.92)_0%,rgb(var(--paper)/0.55)_55%,transparent_100%)]" />
        <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:whitespace-nowrap lg:text-[clamp(1.9rem,2.5vw,3rem)]">Mulai dari sifat yang dibutuhkan, bukan dari nama senyawanya.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">Chemistry menyaring senyawa dengan data eksperimen, lalu merancang kandidat struktur baru dan memperkirakan sifatnya.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={start} className="btn-primary px-5 py-2.5">Mulai mencari</Link>
            <Link to="/pustaka" className="btn-outline bg-surface px-5 py-2.5">Lihat pustaka senyawa</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="container-page py-14">
          <h2 className="text-2xl font-semibold">Cara kerjanya</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              ["Tulis kriteria", "Isi rentang sifat lewat form, atau ceritakan kebutuhanmu dalam satu kalimat dan Chemistry mengubahnya jadi angka."],
              ["Saring dan rancang", "Senyawa di pustaka dinilai terhadap kriteria. Dari yang terbaik, dibuat turunan baru (rantai, cabang, gugus) lalu sifatnya diperkirakan dari struktur."],
              ["Periksa buktinya", "Setiap angka diberi tanda: eksperimen atau perkiraan beserta rentangnya. Lengkap dengan data bahaya GHS, senyawa mirip, dan alasan singkat."],
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
              <h2 className="text-2xl font-semibold">Seberapa banyak datanya</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                Pustaka berisi <span className="num">{meta.compounds.toLocaleString("id-ID")}</span> senyawa organik dengan sifat fisik hasil pengukuran. Perkiraan untuk struktur baru diuji terhadap senyawa yang tidak dipakai saat belajar, jadi ketepatannya bisa dilihat di tabel ini.
              </p>
              <Link to="/tentang" className="mt-4 inline-block text-sm font-semibold text-cobalt hover:underline">Cara Chemistry menghitung</Link>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-mute">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Sifat</th>
                  <th className="py-2 text-right font-medium">Data eksperimen</th>
                  <th className="py-2 text-right font-medium">Ketepatan perkiraan</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta.targets).map(([k, t]) => (
                  <tr key={k} className="border-b border-line">
                    <td className="py-2">{t.label}</td>
                    <td className="num py-2 text-right">{t.experimental.toLocaleString("id-ID")}</td>
                    <td className="num py-2 text-right">{t.r2 != null ? `${Math.round(t.r2 * 100)}%` : "–"}</td>
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
