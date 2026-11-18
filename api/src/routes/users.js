const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth, issueToken, clearToken } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { deleteUserData } = require("../services/cleanup");
const { usage } = require("../services/quota");
const Discovery = require("../models/Discovery");
const Favorite = require("../models/Favorite");
const { str } = require("../util");
const Avatar = require("../models/Avatar");

const router = express.Router();
router.use(requireAuth);

router.get("/me/summary", async (req, res) => {
  const [discoveries, favorites, quota] = await Promise.all([Discovery.countDocuments({ user: req.user._id }), Favorite.countDocuments({ user: req.user._id }), usage(req.user)]);
  res.json({ discoveries, favorites, quota });
});

router.patch("/me", async (req, res) => {
  const u = req.user;
  if ("namaLengkap" in req.body) {
    const n = str(req.body.namaLengkap, 100);
    if (!n) throw new HttpError(400, "Nama lengkap wajib diisi.");
    u.namaLengkap = n;
  }
  if ("institusi" in req.body) u.institusi = str(req.body.institusi, 150);
  await u.save();
  res.json({ user: u.toSelf() });
});

// Foto profil: badan permintaan berisi gambar (image/jpeg, png, atau webp), maks 1 MB.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
router.put("/me/foto", express.raw({ type: IMAGE_TYPES, limit: "1mb" }), async (req, res) => {
  const mime = String(req.headers["content-type"] || "").split(";")[0];
  if (!IMAGE_TYPES.includes(mime) || !Buffer.isBuffer(req.body) || req.body.length < 100) throw new HttpError(400, "Kirim foto JPG, PNG, atau WebP.");
  const sig = req.body.subarray(0, 12).toString("hex");
  const ok = (mime === "image/jpeg" && sig.startsWith("ffd8ff")) || (mime === "image/png" && sig.startsWith("89504e47")) || (mime === "image/webp" && sig.startsWith("52494646") && req.body.subarray(8, 12).toString() === "WEBP");
  if (!ok) throw new HttpError(400, "File itu bukan gambar yang valid.");
  await Avatar.updateOne({ user: req.user._id }, { mime, data: req.body }, { upsert: true });
  req.user.fotoVersi = (req.user.fotoVersi || 0) + 1;
  await req.user.save();
  res.json({ user: req.user.toSelf() });
});

router.delete("/me/foto", async (req, res) => {
  await Avatar.deleteOne({ user: req.user._id });
  req.user.fotoVersi = 0;
  await req.user.save();
  res.json({ user: req.user.toSelf() });
});

router.put("/me/password", async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(String(req.body.passwordLama || ""), user.password))) throw new HttpError(400, "Password lama salah.");
  const baru = String(req.body.passwordBaru || "");
  if (baru.length < 8) throw new HttpError(400, "Password baru minimal 8 karakter.");
  user.password = await bcrypt.hash(baru, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  const token = issueToken(res, user, req);
  res.json({ ok: true, token, user: user.toSelf() });
});

router.delete("/me", async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(String(req.body?.password || ""), user.password))) throw new HttpError(400, "Password salah.");
  if (user.role === "admin" && (await User.countDocuments({ role: "admin", aktif: true })) <= 1) throw new HttpError(400, "Kamu admin terakhir. Jadikan user lain admin dulu.");
  await deleteUserData(user._id);
  await user.deleteOne();
  clearToken(res, req);
  res.json({ ok: true });
});

module.exports = router;
