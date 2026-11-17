const express = require("express");
const Favorite = require("../models/Favorite");
const { requireAuth } = require("../middleware/auth");
const { HttpError, isId } = require("../middleware/errors");
const { str, page, escapeRegex } = require("../util");

const router = express.Router();
router.use(requireAuth);

const keyOf = (c) => (c?.cid ? `cid:${c.cid}` : c?.smiles ? `smi:${String(c.smiles).slice(0, 400)}` : "");

// Simpan hanya data yang dibutuhkan untuk ditampilkan lagi.
function snapshot(c) {
  const props = {};
  for (const [k, p] of Object.entries(c.properties || {})) {
    if (p && Number.isFinite(Number(p.value))) props[k] = { value: Number(p.value), source: String(p.source || ""), ...(p.low != null ? { low: Number(p.low), high: Number(p.high) } : {}) };
  }
  return {
    cid: c.cid ? Number(c.cid) : null,
    pubchem_cid: c.pubchem_cid ? Number(c.pubchem_cid) : null,
    name: str(c.name, 200),
    formula: str(c.formula, 100),
    smiles: str(c.smiles, 400),
    groups: (c.groups || []).map(String).slice(0, 20),
    properties: props,
    origin: str(c.origin, 20),
    score: Number.isFinite(Number(c.score)) ? Number(c.score) : null,
    alasan: str(c.alasan, 1500),
  };
}

router.get("/", async (req, res) => {
  const { page: p, limit, skip } = page(req, { def: 24, max: 100 });
  const filter = { user: req.user._id };
  const q = str(req.query.q, 100);
  if (q) filter.$or = [{ "compound.name": new RegExp(escapeRegex(q), "i") }, { "compound.formula": new RegExp(`^${escapeRegex(q)}$`, "i") }, { tags: q.toLowerCase() }];
  const [items, total] = await Promise.all([Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), Favorite.countDocuments(filter)]);
  res.json({ items, total, page: p, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get("/keys", async (req, res) => {
  res.json({ keys: await Favorite.find({ user: req.user._id }).distinct("key") });
});

router.post("/", async (req, res) => {
  const c = req.body.compound;
  const key = keyOf(c);
  if (!key) throw new HttpError(400, "Data senyawa tidak lengkap.");
  const doc = await Favorite.findOneAndUpdate(
    { user: req.user._id, key },
    { $setOnInsert: { compound: snapshot(c), discovery: isId(req.body.discovery) ? req.body.discovery : undefined } },
    { upsert: true, new: true },
  );
  res.status(201).json({ favorite: doc });
});

router.patch("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(404, "Favorit tidak ditemukan.");
  const f = await Favorite.findOne({ _id: req.params.id, user: req.user._id });
  if (!f) throw new HttpError(404, "Favorit tidak ditemukan.");
  if ("catatan" in req.body) f.catatan = str(req.body.catatan, 2000);
  if (Array.isArray(req.body.tags)) f.tags = [...new Set(req.body.tags.map((t) => str(t, 30).toLowerCase()).filter(Boolean))].slice(0, 10);
  await f.save();
  res.json({ favorite: f });
});

router.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw new HttpError(404, "Favorit tidak ditemukan.");
  await Favorite.deleteOne({ _id: req.params.id, user: req.user._id });
  res.json({ ok: true });
});

// Hapus berdasarkan kunci senyawa (tombol hati di hasil penemuan).
router.post("/remove", async (req, res) => {
  const key = keyOf(req.body.compound);
  if (key) await Favorite.deleteOne({ user: req.user._id, key });
  res.json({ ok: true });
});

module.exports = router;
module.exports.keyOf = keyOf;
