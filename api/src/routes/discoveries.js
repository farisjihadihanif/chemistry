// Penemuan senyawa: kriteria (form atau kalimat) -> pustaka + kandidat baru -> alasan.
const express = require("express");
const rateLimit = require("express-rate-limit");
const Discovery = require("../models/Discovery");
const ml = require("../services/ml");
const gemini = require("../services/gemini");
const { criteriaText, propertySummary, fallbackReason, label } = require("../services/explain");
const { checkQuota } = require("../services/quota");
const { requireAuth } = require("../middleware/auth");
const { HttpError, isId } = require("../middleware/errors");
const { str, page, escapeRegex } = require("../util");

const router = express.Router();
router.use(requireAuth);
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 10, keyGenerator: (req) => String(req.user._id), standardHeaders: true, legacyHeaders: false, message: { message: "Terlalu cepat. Tunggu sebentar sebelum mencari lagi." } });

function cleanCriteria(raw, meta) {
  const allowed = new Set([...Object.keys(meta.targets), ...Object.keys(meta.computed)]);
  const out = {};
  for (const [k, c] of Object.entries(raw || {})) {
    if (!allowed.has(k) || !c || typeof c !== "object") continue;
    const num = (v) => (v === "" || v == null ? null : Number.isFinite(Number(v)) ? Number(v) : NaN);
    const min = num(c.min);
    const max = num(c.max);
    if (Number.isNaN(min) || Number.isNaN(max)) throw new HttpError(400, `Nilai ${label(k, meta).label} harus berupa angka.`);
    if (min == null && max == null) continue;
    if (min != null && max != null && min > max) throw new HttpError(400, `Batas bawah ${label(k, meta).label} lebih besar dari batas atas.`);
    out[k] = { min, max, weight: Math.min(3, Math.max(1, Number(c.weight) || 1)) };
  }
  return out;
}

const cleanGroups = (list, meta) => {
  const ids = new Set(meta.groups.map((g) => g.id));
  return [...new Set((Array.isArray(list) ? list : []).map(String).filter((g) => ids.has(g)))].slice(0, 10);
};

router.post("/", limiter, checkQuota, async (req, res) => {
  const meta = await ml.meta();
  const mode = req.body.mode === "kalimat" ? "kalimat" : "form";
  let judul = str(req.body.judul, 120);
  let criteria;
  let includeGroups;
  let excludeGroups;
  let catatan = "";
  const prompt = str(req.body.prompt, 2000);
  let aiDipakai = false;

  if (mode === "kalimat") {
    if (prompt.length < 10) throw new HttpError(400, "Tuliskan kebutuhanmu minimal satu kalimat.");
    if (!gemini.enabled()) throw new HttpError(503, "Mode kalimat butuh fitur AI yang belum aktif di server. Pakai mode form.");
    const parsed = await gemini.parseCriteria(prompt, meta);
    aiDipakai = true;
    criteria = parsed.criteria;
    includeGroups = parsed.includeGroups;
    excludeGroups = parsed.excludeGroups;
    catatan = parsed.catatan;
    judul = judul || parsed.judul;
    if (!Object.keys(criteria).length) {
      throw new HttpError(422, "Kebutuhan itu belum bisa diubah jadi kriteria sifat. Sebutkan sifat yang diinginkan, misalnya titik didih, kekentalan, atau ketahanan panas.");
    }
  } else {
    criteria = cleanCriteria(req.body.criteria, meta);
    includeGroups = cleanGroups(req.body.includeGroups, meta);
    excludeGroups = cleanGroups(req.body.excludeGroups, meta);
    if (!Object.keys(criteria).length) throw new HttpError(400, "Isi minimal satu kriteria dengan batas bawah atau atas.");
  }
  const preset = meta.presets.find((p) => p.id === req.body.preset);
  if (!judul) judul = preset?.name || `Pencarian ${Object.keys(criteria).map((k) => label(k, meta).label.toLowerCase()).slice(0, 3).join(", ")}`;
  const wantNovel = req.body.novel !== false;
  const base = { criteria, include_groups: includeGroups, exclude_groups: excludeGroups, known_limit: 10 };
  const text = criteriaText(criteria, meta, includeGroups, excludeGroups);

  // Usulan struktur dari Gemini (bila aktif), berdasarkan senyawa terbaik yang sudah dikenal.
  let extra = [];
  if (wantNovel && gemini.enabled()) {
    try {
      const first = await ml.call("/discover", { method: "POST", body: { ...base, known_limit: 5, novel_limit: 0, check_pubchem: false } });
      extra = await gemini.proposeCompounds(text, first.known);
      aiDipakai = true;
    } catch (e) {
      console.warn("Usulan Gemini dilewati:", e.message);
    }
  }
  const result = await ml.call("/discover", { method: "POST", body: { ...base, novel_limit: wantNovel ? 8 : 0, extra, check_pubchem: true }, timeout: 90000 });

  const items = [...result.known.map((c, i) => ({ c, id: `k${i}` })), ...result.novel.map((c, i) => ({ c, id: `n${i}` }))];
  let ringkasan = "";
  let reasons = {};
  if (gemini.enabled() && items.length) {
    try {
      const out = await gemini.justify(
        text,
        items.map(({ c, id }) => ({ id, label: c.name ? `${c.name} (${c.smiles})` : `kandidat baru ${c.smiles}${c.origin === "turunan" ? `, turunan ${c.parent?.name || ""}` : ""}`, summary: propertySummary(c, criteria, meta) })),
      );
      ringkasan = out.ringkasan;
      reasons = out.alasan;
      aiDipakai = true;
    } catch (e) {
      console.warn("Alasan Gemini dilewati:", e.message);
    }
  }
  for (const { c, id } of items) {
    c.alasan = reasons[id] || fallbackReason(c, criteria, meta);
    c.alasanSumber = reasons[id] ? "ai" : "data";
  }
  const doc = await Discovery.create({
    user: req.user._id,
    judul,
    mode,
    prompt,
    preset: preset?.id || "",
    criteria,
    includeGroups,
    excludeGroups,
    known: result.known,
    novel: result.novel,
    matched: result.matched,
    ringkasan: [catatan, ringkasan].filter(Boolean).join(" "),
    aiDipakai,
  });
  res.status(201).json({ discovery: doc });
});

router.get("/", async (req, res) => {
  const { page: p, limit, skip } = page(req, { def: 12, max: 50 });
  const filter = { user: req.user._id };
  const q = str(req.query.q, 100);
  if (q) filter.judul = new RegExp(escapeRegex(q), "i");
  const [items, total] = await Promise.all([
    Discovery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("judul mode prompt preset criteria matched createdAt known.name known.smiles known.score novel.smiles"),
    Discovery.countDocuments(filter),
  ]);
  res.json({
    items: items.map((d) => ({
      _id: d._id,
      judul: d.judul,
      mode: d.mode,
      prompt: d.prompt,
      preset: d.preset,
      criteria: d.criteria,
      matched: d.matched,
      createdAt: d.createdAt,
      top: d.known.slice(0, 3).map((k) => ({ name: k.name, smiles: k.smiles, score: k.score })),
      knownCount: d.known.length,
      novelCount: d.novel.length,
    })),
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

async function own(req) {
  if (!isId(req.params.id)) throw new HttpError(404, "Riwayat tidak ditemukan.");
  const d = await Discovery.findOne({ _id: req.params.id, user: req.user._id });
  if (!d) throw new HttpError(404, "Riwayat tidak ditemukan.");
  return d;
}

router.get("/:id", async (req, res) => {
  res.json({ discovery: await own(req) });
});

router.delete("/:id", async (req, res) => {
  await (await own(req)).deleteOne();
  res.json({ ok: true });
});

router.get("/:id/export", async (req, res) => {
  const d = await own(req);
  const meta = await ml.meta();
  const name = `chemistry-${d.judul.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${d.createdAt.toISOString().slice(0, 10)}`;
  if (req.query.format === "json") {
    res.set("Content-Disposition", `attachment; filename="${name}.json"`);
    return res.json({ judul: d.judul, dibuat: d.createdAt, kriteria: d.criteria, gugusWajib: d.includeGroups, gugusDihindari: d.excludeGroups, senyawaDikenal: d.known, kandidatBaru: d.novel, ringkasan: d.ringkasan });
  }
  const props = [...Object.keys(meta.targets), ...Object.keys(meta.computed)];
  const head = ["jenis", "skor", "nama", "cid_pubchem", "rumus", "smiles", ...props.flatMap((k) => [`${k}`, `${k}_sumber`]), "alasan"];
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [...d.known.map((c) => ["dikenal", c]), ...d.novel.map((c) => ["kandidat_baru", c])].map(([jenis, c]) => [
    jenis, c.score, c.name, c.cid ?? c.pubchem_cid ?? "", c.formula, c.smiles,
    ...props.flatMap((k) => [c.properties?.[k]?.value != null ? Number(c.properties[k].value.toPrecision(5)) : "", c.properties?.[k]?.source || ""]),
    c.alasan,
  ]);
  res.set("Content-Type", "text/csv; charset=utf-8").set("Content-Disposition", `attachment; filename="${name}.csv"`);
  res.send("﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\n"));
});

module.exports = router;
