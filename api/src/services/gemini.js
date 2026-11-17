// Google Gemini untuk Chemistry. Key hanya dipakai di server.
const config = require("../config");
const { HttpError } = require("../middleware/errors");

const PERSONA = `Kamu asisten riset di Chemistry, alat bantu penemuan senyawa untuk peneliti dan insinyur industri kimia/petrokimia di Indonesia.

Cara menjawab:
- Kalimat pertama langsung menjawab. Tanpa basa-basi pembuka, tanpa mengulang pertanyaan, tanpa penutup klise.
- Bahasa Indonesia yang jelas dan teknis secukupnya; istilah kimia baku (IUPAC) boleh dipakai. Ikuti bahasa pengguna bila ia memakai bahasa Inggris.
- Paragraf pendek. Daftar hanya untuk langkah atau perbandingan.
- Sebut satuan dengan benar (°C, mPa·s, g/cm³). Jangan mengarang angka eksperimen, nomor CAS, atau sumber. Kalau tidak yakin, katakan.
- Bedakan data eksperimen dan perkiraan.
- Untuk pertanyaan keselamatan, sebutkan bahaya utama dan sarankan membaca SDS.
- Tolak membantu sintesis bahan peledak, senjata kimia, racun untuk mencelakai orang, atau narkotika. Jelaskan singkat bahwa itu di luar cakupan.`;

let fetchImpl = (...a) => fetch(...a);
const setFetch = (fn) => {
  fetchImpl = fn;
};
const enabled = () => Boolean(config.geminiApiKey);
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function callModel(model, body, timeout) {
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiApiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  } catch (error) {
    return { status: 0, error };
  }
}

async function generate(contents, { json = null, temperature = 0.4, system = PERSONA, timeout = 60000 } = {}) {
  if (!enabled()) throw new HttpError(503, "Fitur AI belum aktif: GEMINI_API_KEY belum diisi di server.");
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature, ...(json ? { responseMimeType: "application/json", responseSchema: json } : {}) },
  };
  const fb = config.geminiFallbackModel;
  const attempts = [config.geminiModel, config.geminiModel, ...(fb && fb !== config.geminiModel ? [fb] : [])];
  let last;
  for (let i = 0; i < attempts.length; i++) {
    if (i > 0) await wait(i === 1 ? 1200 : 300);
    last = await callModel(attempts[i], body, timeout);
    if (last.status === 200) {
      const cand = last.data?.candidates?.[0];
      const text = cand?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (text) return json ? JSON.parse(text) : text;
      if (cand?.finishReason === "SAFETY" || last.data?.promptFeedback?.blockReason) throw new HttpError(422, "Pertanyaan itu tidak bisa dijawab. Coba ubah kalimatnya.");
      continue;
    }
    const msg = last.error ? last.error.cause?.code || last.error.message : last.data?.error?.message;
    console.error(`Gemini (${attempts[i]}) gagal:`, last.status || "koneksi", String(msg || "").slice(0, 200));
    if (last.status === 400 && /API key/i.test(msg || "")) throw new HttpError(503, "GEMINI_API_KEY di server tidak valid.");
    if (last.status === 403) throw new HttpError(503, "GEMINI_API_KEY ditolak Google.");
    if (last.status && !RETRYABLE.has(last.status) && last.status !== 404) break;
  }
  if (last?.status === 429) throw new HttpError(429, "Layanan AI sedang sibuk. Coba lagi sebentar.");
  throw new HttpError(502, "Layanan AI gagal menjawab. Coba lagi.");
}

// ---------- Kalimat bebas -> kriteria terstruktur ----------
function propertyGuide(meta) {
  const lines = Object.entries(meta.targets).map(([k, t]) => `- ${k}: ${t.label} (${t.unit})`);
  lines.push(...Object.entries(meta.computed).map(([k, t]) => `- ${k}: ${t.label}${t.unit ? ` (${t.unit})` : ""}`));
  return lines.join("\n");
}

const CRITERIA_SCHEMA = {
  type: "OBJECT",
  properties: {
    judul: { type: "STRING", description: "Judul singkat kebutuhan, maks 8 kata, bahasa Indonesia" },
    kriteria: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          sifat: { type: "STRING" },
          min: { type: "NUMBER", nullable: true },
          max: { type: "NUMBER", nullable: true },
          bobot: { type: "NUMBER", description: "1 biasa, 2 penting, 3 sangat penting" },
        },
        required: ["sifat"],
      },
    },
    wajib_gugus: { type: "ARRAY", items: { type: "STRING" } },
    hindari_gugus: { type: "ARRAY", items: { type: "STRING" } },
    catatan: { type: "STRING", description: "Asumsi yang kamu ambil, 1 kalimat" },
  },
  required: ["judul", "kriteria"],
};

async function parseCriteria(prompt, meta) {
  const groups = meta.groups.map((g) => `${g.id} (${g.label})`).join(", ");
  const text = `Ubah kebutuhan pengguna berikut menjadi kriteria sifat senyawa.

Sifat yang tersedia (pakai kunci persis seperti ini, nilai dalam satuan tersebut):
${propertyGuide(meta)}

Gugus fungsi yang tersedia: ${groups}

Aturan:
- Hanya pakai sifat dari daftar. Kebutuhan yang tidak bisa diukur dengan sifat-sifat itu tulis di "catatan".
- Ubah istilah umum jadi angka yang masuk akal secara kimia (mis. "cair pada suhu ruang" = melting_point max 20 dan boiling_point min 40; "tidak mudah terbakar" = flash_point min 60; "kental" = viscosity min 10).
- Viskositas dalam mPa·s (cP), tekanan uap dalam mmHg pada 25 °C.
- Paling banyak 6 kriteria.

Kebutuhan pengguna:
"""${prompt}"""`;
  const out = await generate([{ role: "user", parts: [{ text }] }], { json: CRITERIA_SCHEMA, temperature: 0.2 });
  const allowed = new Set([...Object.keys(meta.targets), ...Object.keys(meta.computed)]);
  const gids = new Set(meta.groups.map((g) => g.id));
  const criteria = {};
  for (const c of out.kriteria || []) {
    if (!allowed.has(c.sifat) || (c.min == null && c.max == null)) continue;
    criteria[c.sifat] = { min: c.min ?? null, max: c.max ?? null, weight: Math.min(3, Math.max(1, Number(c.bobot) || 1)) };
  }
  return {
    judul: String(out.judul || "").slice(0, 120),
    criteria,
    includeGroups: (out.wajib_gugus || []).filter((g) => gids.has(g)),
    excludeGroups: (out.hindari_gugus || []).filter((g) => gids.has(g)),
    catatan: String(out.catatan || "").slice(0, 400),
  };
}

// ---------- Usulan struktur baru ----------
const PROPOSE_SCHEMA = {
  type: "OBJECT",
  properties: { kandidat: { type: "ARRAY", items: { type: "OBJECT", properties: { smiles: { type: "STRING" }, alasan: { type: "STRING" } }, required: ["smiles", "alasan"] } } },
  required: ["kandidat"],
};

async function proposeCompounds(criteriaText, known) {
  const text = `Kamu membantu merancang kandidat senyawa organik BARU yang mungkin memenuhi kriteria berikut. Kandidat akan divalidasi dengan RDKit dan sifatnya diprediksi model, jadi tulis SMILES yang valid.

Kriteria:
${criteriaText}

Senyawa yang sudah dikenal dan cocok (sebagai acuan, jangan diulang):
${known.map((k) => `- ${k.name || "?"}: ${k.smiles}`).join("\n")}

Usulkan 6 struktur berbeda yang masuk akal disintesis (bukan sekadar mengganti satu atom), hanya unsur C, H, N, O, S, P, F, Cl, Br, I, Si, B, maksimal 40 atom berat. Untuk tiap kandidat beri alasan kimia 1 kalimat (gugus apa yang diharapkan memberi sifat apa).`;
  const out = await generate([{ role: "user", parts: [{ text }] }], { json: PROPOSE_SCHEMA, temperature: 0.8 });
  return (out.kandidat || []).slice(0, 8).map((k) => ({ smiles: String(k.smiles).trim(), note: String(k.alasan || "").slice(0, 300) }));
}

// ---------- Alasan per senyawa ----------
const JUSTIFY_SCHEMA = {
  type: "OBJECT",
  properties: {
    ringkasan: { type: "STRING" },
    alasan: { type: "ARRAY", items: { type: "OBJECT", properties: { id: { type: "STRING" }, teks: { type: "STRING" } }, required: ["id", "teks"] } },
  },
  required: ["ringkasan", "alasan"],
};

async function justify(criteriaText, items) {
  const text = `Tulis justifikasi singkat untuk setiap senyawa hasil penyaringan berikut terhadap kriteria pengguna.

Kriteria:
${criteriaText}

Senyawa (id, nama/SMILES, sifat; [E] = data eksperimen PubChem, [P] = prediksi model):
${items.map((x) => `- id=${x.id}: ${x.label}. ${x.summary}`).join("\n")}

Aturan:
- 2 kalimat per senyawa: kenapa cocok dengan menyebut gugus/struktur yang berperan, dan satu hal yang perlu diperhatikan (kriteria yang meleset, nilai yang masih prediksi, atau bahaya umum golongan senyawa itu).
- Hanya pakai angka yang diberikan di atas. Jangan menambah angka baru.
- "ringkasan": 2 kalimat untuk keseluruhan hasil (pola struktur yang menonjol dan saran langkah berikutnya, mis. uji apa yang perlu dilakukan).`;
  const out = await generate([{ role: "user", parts: [{ text }] }], { json: JUSTIFY_SCHEMA, temperature: 0.4, timeout: 90000 });
  return { ringkasan: String(out.ringkasan || ""), alasan: Object.fromEntries((out.alasan || []).map((a) => [String(a.id), String(a.teks)])) };
}

module.exports = { generate, parseCriteria, proposeCompounds, justify, setFetch, enabled, PERSONA };
