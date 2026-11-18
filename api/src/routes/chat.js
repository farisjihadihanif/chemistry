// Asisten kimia: tanya jawab, bisa sambil membahas satu senyawa (data dari pustaka/model ikut dikirim).
const express = require("express");
const rateLimit = require("express-rate-limit");
const ChatSession = require("../models/ChatSession");
const gemini = require("../services/gemini");
const ml = require("../services/ml");
const { checkQuota } = require("../services/quota");
const { requireAuth } = require("../middleware/auth");
const { HttpError, isId } = require("../middleware/errors");
const { str } = require("../util");

const router = express.Router();
router.use(requireAuth);
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 15, keyGenerator: (req) => String(req.user._id), standardHeaders: true, legacyHeaders: false, message: { message: "Pelan-pelan, tunggu sebentar sebelum bertanya lagi." } });

router.get("/", async (req, res) => {
  const items = await ChatSession.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(50).select("judul updatedAt");
  res.json({ items });
});

async function own(req) {
  if (!isId(req.params.id)) throw new HttpError(404, "Percakapan tidak ditemukan.");
  const s = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
  if (!s) throw new HttpError(404, "Percakapan tidak ditemukan.");
  return s;
}

router.get("/:id", async (req, res) => res.json({ session: await own(req) }));
router.delete("/:id", async (req, res) => {
  await (await own(req)).deleteOne();
  res.json({ ok: true });
});

function compoundContext(c) {
  const lines = Object.entries(c.properties || {}).map(([k, p]) => `${k}: ${Number(p.value).toPrecision(4)} (${p.source})`);
  return `Senyawa yang sedang dibahas: ${c.name || "kandidat tanpa nama"}, rumus ${c.formula}, SMILES ${c.smiles}.\nData dari aplikasi (eksperimen = data terukur, prediksi = nilai perkiraan):\n${lines.join("\n")}`;
}

router.post("/", limiter, checkQuota, async (req, res) => {
  const message = str(req.body.message, 4000);
  if (!message) throw new HttpError(400, "Pesan kosong.");
  const smiles = str(req.body.smiles, 400);
  const session = isId(req.body.sessionId) ? await ChatSession.findOne({ _id: req.body.sessionId, user: req.user._id }) : null;
  if (req.body.sessionId && !session) throw new HttpError(404, "Percakapan tidak ditemukan.");
  const s = session || new ChatSession({ user: req.user._id, judul: message.slice(0, 80) });
  let context = "";
  if (smiles) {
    try {
      context = compoundContext(await ml.call("/analyze", { method: "POST", body: { smiles } }));
    } catch {
      /* lanjut tanpa data senyawa */
    }
  }
  const history = s.messages.slice(-16).map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
  const contents = [...history, { role: "user", parts: [{ text: context ? `${context}\n\nPertanyaan: ${message}` : message }] }];
  const reply = await gemini.generate(contents, { temperature: 0.5 });
  s.messages.push({ role: "user", content: message, smiles }, { role: "model", content: reply });
  await s.save();
  res.json({ sessionId: s._id, judul: s.judul, reply });
});

module.exports = router;
