// Pustaka senyawa, analisis struktur, gambar struktur, data bahaya.
const express = require("express");
const rateLimit = require("express-rate-limit");
const ml = require("../services/ml");
const hazards = require("../services/hazards");
const config = require("../config");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { str } = require("../util");

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { message: "Terlalu banyak permintaan. Tunggu sebentar." } });

router.get("/meta", async (req, res) => {
  res.json({ ...(await ml.meta()), ai: Boolean(config.geminiApiKey), contactEmail: config.contactEmail });
});

router.get("/compounds/search", limiter, async (req, res) => {
  const q = str(req.query.q, 100);
  if (!q) return res.json({ items: [] });
  res.json(await ml.call(`/search?q=${encodeURIComponent(q)}`));
});

router.get("/compounds/:cid", async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!(cid > 0)) throw new HttpError(404, "Senyawa tidak ditemukan.");
  res.json({ compound: await ml.call(`/compound/${cid}`) });
});

router.get("/compounds/:cid/hazards", async (req, res) => {
  const cid = parseInt(req.params.cid, 10);
  if (!(cid > 0)) throw new HttpError(404, "Senyawa tidak ditemukan.");
  const data = await hazards.forCid(cid);
  if (!data) throw new HttpError(502, "Data keselamatan PubChem sedang tidak bisa diambil. Coba lagi nanti.");
  res.json({ hazards: data });
});

// Kalkulator sifat: SMILES atau nama -> sifat (eksperimen bila ada, kalau tidak prediksi).
router.post("/compounds/analyze", requireAuth, limiter, async (req, res) => {
  const smiles = str(req.body.smiles, 400);
  const name = str(req.body.name, 150);
  if (!smiles && !name) throw new HttpError(400, "Isi SMILES atau nama senyawa.");
  res.json({ compound: await ml.call("/analyze", { method: "POST", body: { smiles: smiles || null, name: name || null } }) });
});

// Gambar struktur (SVG) — disajikan lewat API supaya ml-service tidak perlu dibuka ke publik.
router.get("/structure.svg", async (req, res) => {
  const smiles = str(req.query.smiles, 400);
  if (!smiles) throw new HttpError(400, "SMILES kosong.");
  const q = new URLSearchParams({ smiles, w: String(Math.min(1200, parseInt(req.query.w, 10) || 320)), h: String(Math.min(900, parseInt(req.query.h, 10) || 240)), dark: req.query.dark === "1" ? "true" : "false" });
  const r = await ml.call(`/structure.svg?${q}`, { raw: true });
  if (!r.ok) throw new HttpError(400, "SMILES tidak valid.");
  res.set("Content-Type", "image/svg+xml").set("Cache-Control", "public, max-age=604800").send(await r.text());
});

module.exports = router;
