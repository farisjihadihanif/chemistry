import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useMeta, propInfo } from "../context/Meta";
import { useCollect } from "../context/Collect";
import { fmtValue } from "../lib/format";
import { compoundTitle, Formula, SourceDot, Structure } from "../components/chem";
import { detailLink } from "../components/Results";
import { Empty, PageLoader } from "../components/ui";

export default function Compare() {
  const { meta } = useMeta();
  const { compare, toggleCompare } = useCollect();
  if (!meta) return <PageLoader />;
  if (!compare.length) {
    return (
      <div className="container-page py-12">
        <Empty title="Belum ada senyawa yang dipilih" action={<Link to="/temukan" className="btn-primary">Cari senyawa</Link>}>
          Tekan Bandingkan pada hasil pencarian atau halaman senyawa. Bisa sampai 3 senyawa.
        </Empty>
      </div>
    );
  }
  const keys = [...Object.keys(meta.targets), ...Object.keys(meta.computed)];
  // nilai terbaik tidak ditandai: "baik" bergantung kebutuhan, jadi hanya disajikan berdampingan
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-semibold">Bandingkan senyawa</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr>
              <th className="w-44" />
              {compare.map((c) => (
                <th key={c.smiles} scope="col" className="px-3 pb-4 text-left align-top font-normal">
                  <div className="structure panel aspect-[4/3] p-1"><Structure smiles={c.smiles} w={320} h={240} /></div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={detailLink(c)} className="font-semibold hover:underline">{compoundTitle(c)}</Link>
                      <p className="text-ink-soft"><Formula value={c.formula} /></p>
                    </div>
                    <button className="rounded p-1 text-ink-mute hover:bg-sunk" onClick={() => toggleCompare(c)} aria-label={`Keluarkan ${compoundTitle(c)}`}>
                      <X size={15} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k} className="border-t border-line">
                <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-soft">
                  {propInfo(meta, k).label} {propInfo(meta, k).unit && <span className="text-ink-mute">({propInfo(meta, k).unit})</span>}
                </th>
                {compare.map((c) => {
                  const p = c.properties?.[k];
                  return (
                    <td key={c.smiles} className="px-3 py-2">
                      {p ? (
                        <span className="inline-flex items-center gap-1.5">
                          <SourceDot source={p.source} />
                          <span className="num">{fmtValue(p.value, k)}</span>
                        </span>
                      ) : (
                        <span className="text-ink-mute">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-mute">Bulat penuh = data eksperimen, bulat kosong = nilai perkiraan.</p>
    </div>
  );
}
