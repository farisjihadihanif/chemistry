// Klasifikasi bahaya GHS dari PubChem (laporan pertama, biasanya ECHA C&L), disimpan 30 hari.
const HazardCache = require("../models/HazardCache");

const PICTO = {
  GHS01: "Bahan peledak", GHS02: "Mudah menyala", GHS03: "Pengoksidasi", GHS04: "Gas bertekanan", GHS05: "Korosif",
  GHS06: "Toksik akut", GHS07: "Iritan / berbahaya", GHS08: "Bahaya kesehatan serius", GHS09: "Berbahaya bagi lingkungan",
};

let fetchImpl = (...a) => fetch(...a);
const setFetch = (fn) => {
  fetchImpl = fn;
};

function parse(json) {
  const out = { pictograms: [], signal: "", statements: [] };
  const visit = (sec) => {
    for (const s of sec.Section || []) {
      if (s.TOCHeading === "GHS Classification") {
        for (const inf of s.Information || []) {
          const swm = inf.Value?.StringWithMarkup || [];
          if (inf.Name === "Pictogram(s)" && !out.pictograms.length) {
            for (const m of swm.flatMap((x) => x.Markup || [])) {
              const code = /GHS\d\d/.exec(m.URL || "")?.[0];
              if (code && !out.pictograms.some((p) => p.code === code)) out.pictograms.push({ code, label: PICTO[code] || m.Extra || code });
            }
          } else if (inf.Name === "Signal" && !out.signal) {
            const v = swm[0]?.String || "";
            out.signal = v === "Danger" ? "Bahaya" : v === "Warning" ? "Peringatan" : v;
          } else if (inf.Name === "GHS Hazard Statements" && !out.statements.length) {
            for (const x of swm) {
              const m = /^(H\d{3}[A-Za-z]*(?:\+H\d{3})*)(?:\s*\(.*?\))?:\s*(.*?)\s*\[/.exec(x.String || "");
              if (m) out.statements.push({ code: m[1], text: m[2] });
            }
          }
        }
        return true;
      }
      if (visit(s)) return true;
    }
    return false;
  };
  visit(json.Record || {});
  return out;
}

async function forCid(cid) {
  const cached = await HazardCache.findOne({ cid });
  if (cached) return cached.data;
  let data = null;
  try {
    const res = await fetchImpl(`https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=GHS%20Classification`, { signal: AbortSignal.timeout(12000) });
    if (res.status === 404) data = { pictograms: [], signal: "", statements: [], none: true };
    else if (res.ok) data = parse(await res.json());
  } catch {
    return null; // jaringan bermasalah: jangan disimpan, coba lagi lain kali
  }
  if (data) await HazardCache.updateOne({ cid }, { data, fetchedAt: new Date() }, { upsert: true });
  return data;
}

module.exports = { forCid, parse, setFetch };
