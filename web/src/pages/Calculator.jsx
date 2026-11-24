import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { api } from "../lib/api";
import CompoundView from "../components/CompoundView";
import { ErrorBox, Spinner } from "../components/ui";

const EXAMPLES = [
  ["Etil laktat", "ethyl lactate"],
  ["Limonena", "limonene"],
  ["Triasetin", "triacetin"],
  ["Dioktil adipat (SMILES)", "CCCCCCCCOC(=O)CCCCC(=O)OCCCCCCCC"],
];

export default function Calculator() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("smiles") || params.get("nama") || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (value) => {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    setError("");
    // SMILES tidak mengandung spasi dan biasanya memuat simbol struktur; selain itu dianggap nama.
    const looksSmiles = !/\s/.test(v) && /[=#()[\]@\d]|^[CNOcnosSPFIBrl]+$/.test(v) && !/^[a-z]{4,}$/i.test(v);
    try {
      const r = await api.post("/compounds/analyze", looksSmiles ? { smiles: v } : { name: v });
      setResult(r.compound);
      setParams(looksSmiles ? { smiles: r.compound.smiles } : { nama: v }, { replace: true });
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (input) run(input);
    // hanya saat halaman dibuka dari tautan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-semibold">Kalkulator sifat</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Masukkan nama senyawa atau SMILES. Kalau senyawanya ada di pustaka, yang tampil adalah data eksperimen; kalau tidak, sifatnya diperkirakan dari strukturnya.</p>
      <form
        className="mt-6 flex max-w-2xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(input);
        }}
      >
        <input className="field font-mono" value={input} onChange={(e) => setInput(e.target.value)} placeholder="mis. ethyl lactate atau CCOC(=O)C(C)O" aria-label="Nama atau SMILES" autoCapitalize="off" spellCheck={false} />
        <button className="btn-primary shrink-0" disabled={busy || !input.trim()}>
          {busy ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : <FlaskConical size={16} />} Hitung
        </button>
      </form>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-mute">
        Coba:
        {EXAMPLES.map(([label, value]) => (
          <button
            key={label}
            className="link-u text-cobalt"
            onClick={() => {
              setInput(value);
              run(value);
            }}
          >
            {label}
          </button>
        ))}
      </p>
      <div className="mt-4 max-w-2xl"><ErrorBox>{error}</ErrorBox></div>
      {result && <div className="mt-8"><CompoundView c={result} /></div>}
    </div>
  );
}
