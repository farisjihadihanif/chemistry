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

router.put("/me/password", async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(String(req.body.passwordLama || ""), user.password))) throw new HttpError(400, "Password lama salah.");
  const baru = String(req.body.passwordBaru || "");
  if (baru.length < 8) throw new HttpError(400, "Password baru minimal 8 karakter.");
  user.password = await bcrypt.hash(baru, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  const token = issueToken(res, user);
  res.json({ ok: true, token });
});

router.delete("/me", async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await bcrypt.compare(String(req.body?.password || ""), user.password))) throw new HttpError(400, "Password salah.");
  if (user.role === "admin" && (await User.countDocuments({ role: "admin", aktif: true })) <= 1) throw new HttpError(400, "Kamu admin terakhir. Jadikan user lain admin dulu.");
  await deleteUserData(user._id);
  await user.deleteOne();
  clearToken(res);
  res.json({ ok: true });
});

module.exports = router;
