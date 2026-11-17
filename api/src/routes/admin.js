// Dasbor admin: ringkasan pemakaian dan kelola akun.
const express = require("express");
const User = require("../models/User");
const Discovery = require("../models/Discovery");
const Favorite = require("../models/Favorite");
const AiUsage = require("../models/AiUsage");
const { requireAdmin } = require("../middleware/auth");
const { HttpError, isId } = require("../middleware/errors");
const { deleteUserData } = require("../services/cleanup");
const { today } = require("../services/quota");
const { str, page, escapeRegex } = require("../util");

const router = express.Router();
router.use(requireAdmin);

router.get("/stats", async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [users, aktif, admins, discoveries, week, favorites, ai, perDay] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ aktif: true }),
    User.countDocuments({ role: "admin" }),
    Discovery.countDocuments(),
    Discovery.countDocuments({ createdAt: { $gte: since } }),
    Favorite.countDocuments(),
    AiUsage.aggregate([{ $match: { day: today() } }, { $group: { _id: null, n: { $sum: "$count" } } }]),
    Discovery.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" } }, n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  res.json({ users, aktif, admins, discoveries, discoveriesWeek: week, favorites, aiToday: ai[0]?.n || 0, perDay });
});

router.get("/users", async (req, res) => {
  const { page: p, limit, skip } = page(req, { def: 20, max: 100 });
  const filter = {};
  const q = str(req.query.q, 100);
  if (q) filter.$or = ["username", "email", "namaLengkap", "institusi"].map((f) => ({ [f]: new RegExp(escapeRegex(q), "i") }));
  if (["user", "admin"].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.status === "nonaktif") filter.aktif = false;
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  const counts = await Discovery.aggregate([{ $match: { user: { $in: items.map((u) => u._id) } } }, { $group: { _id: "$user", n: { $sum: 1 } } }]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({
    items: items.map((u) => ({ ...u.toSelf(), aktif: u.aktif, lastLoginAt: u.lastLoginAt, discoveries: byUser[String(u._id)] || 0 })),
    total,
    page: p,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

async function target(req) {
  if (!isId(req.params.id)) throw new HttpError(404, "Pengguna tidak ditemukan.");
  const u = await User.findById(req.params.id);
  if (!u) throw new HttpError(404, "Pengguna tidak ditemukan.");
  return u;
}

const lastAdmin = async (u) => u.role === "admin" && (await User.countDocuments({ role: "admin", aktif: true })) <= 1;

router.patch("/users/:id", async (req, res) => {
  const u = await target(req);
  const self = String(u._id) === String(req.user._id);
  if ("role" in req.body) {
    if (!["user", "admin"].includes(req.body.role)) throw new HttpError(400, "Peran tidak valid.");
    if (req.body.role === "user" && (await lastAdmin(u))) throw new HttpError(400, "Minimal harus ada satu admin aktif.");
    u.role = req.body.role;
  }
  if ("aktif" in req.body) {
    const aktif = Boolean(req.body.aktif);
    if (!aktif && self) throw new HttpError(400, "Kamu tidak bisa menonaktifkan akunmu sendiri.");
    if (!aktif && (await lastAdmin(u))) throw new HttpError(400, "Minimal harus ada satu admin aktif.");
    if (!aktif) u.tokenVersion = (u.tokenVersion || 0) + 1; // keluarkan dari semua perangkat
    u.aktif = aktif;
  }
  await u.save();
  res.json({ user: { ...u.toSelf(), aktif: u.aktif } });
});

router.delete("/users/:id", async (req, res) => {
  const u = await target(req);
  if (String(u._id) === String(req.user._id)) throw new HttpError(400, "Hapus akunmu sendiri lewat halaman Akun.");
  if (await lastAdmin(u)) throw new HttpError(400, "Minimal harus ada satu admin aktif.");
  await deleteUserData(u._id);
  await u.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
