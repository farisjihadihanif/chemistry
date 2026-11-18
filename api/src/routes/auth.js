const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const config = require("../config");
const User = require("../models/User");
const mail = require("../services/mail");
const jwt = require("jsonwebtoken");
const { issueToken, clearToken, readAccounts, writeAccounts, subOf, cookieOptions, COOKIE } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { str } = require("../util");

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT) || 20, standardHeaders: true, legacyHeaders: false, message: { message: "Terlalu banyak percobaan. Coba lagi 15 menit lagi." } });
const USERNAME = /^[a-z0-9_.]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.post("/register", limiter, async (req, res) => {
  const username = str(req.body.username, 30).toLowerCase();
  const email = str(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || "");
  const namaLengkap = str(req.body.namaLengkap, 100);
  if (!USERNAME.test(username)) throw new HttpError(400, "Username 3–30 karakter: huruf kecil, angka, titik, atau garis bawah.");
  if (!EMAIL.test(email)) throw new HttpError(400, "Format email tidak valid.");
  if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter.");
  if (!namaLengkap) throw new HttpError(400, "Nama lengkap wajib diisi.");
  const user = await User.create({ username, email, namaLengkap, institusi: str(req.body.institusi, 150), password: await bcrypt.hash(password, 10), lastLoginAt: new Date() });
  const token = issueToken(res, user, req);
  res.status(201).json({ user: user.toSelf(), token });
});

router.post("/login", limiter, async (req, res) => {
  const id = str(req.body.identifier ?? req.body.username, 120).toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne(id.includes("@") ? { email: id } : { username: id }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) throw new HttpError(401, "Username/email atau password salah.");
  if (!user.aktif) throw new HttpError(403, "Akun ini dinonaktifkan admin. Hubungi admin untuk mengaktifkannya.");
  user.lastLoginAt = new Date();
  await user.save();
  const token = issueToken(res, user, req);
  res.json({ user: user.toSelf(), token });
});

// Keluar dari akun ini. Akun tetap tersimpan di perangkat untuk "Ganti akun",
// kecuali diminta dilupakan ({ forget: true }).
router.post("/logout", (req, res) => {
  const current = req.cookies?.[COOKIE];
  const keep = !req.body?.forget && req.user && current;
  clearToken(res, req, { forget: !keep });
  if (keep) writeAccounts(res, [...readAccounts(req).filter((t) => subOf(t) !== String(req.user._id)), current]);
  res.json({ ok: true });
});

// Daftar akun yang tersimpan di perangkat ini (token kedaluwarsa, password diganti, atau akun nonaktif otomatis hilang).
async function validAccounts(req) {
  const out = [];
  const current = req.cookies?.[COOKIE];
  const tokens = readAccounts(req);
  if (current && !tokens.some((t) => subOf(t) === subOf(current))) tokens.push(current);
  for (const token of tokens) {
    try {
      const p = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(p.sub);
      if (user && user.aktif && (user.tokenVersion || 0) === (p.v || 0)) out.push({ token, user });
    } catch {
      /* lewati token rusak */
    }
  }
  return out;
}

router.get("/accounts", async (req, res) => {
  const list = await validAccounts(req);
  writeAccounts(res, list.map((a) => a.token));
  res.json({ accounts: list.map(({ user }) => ({ ...user.toPublic(), current: Boolean(req.user && String(req.user._id) === String(user._id)) })) });
});

router.post("/switch", async (req, res) => {
  const id = String(req.body.userId || "");
  const found = (await validAccounts(req)).find((a) => String(a.user._id) === id);
  if (!found) throw new HttpError(401, "Akun itu perlu masuk ulang.");
  res.cookie(COOKIE, found.token, cookieOptions());
  res.json({ user: found.user.toSelf(), token: found.token });
});

// Hapus satu akun dari daftar perangkat.
router.post("/accounts/forget", async (req, res) => {
  const id = String(req.body.userId || "");
  const rest = (await validAccounts(req)).filter((a) => String(a.user._id) !== id);
  writeAccounts(res, rest.map((a) => a.token));
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  res.json({ user: req.user ? req.user.toSelf() : null });
});

// ===== Lupa password =====
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: Number(process.env.RESET_RATE_LIMIT) || 5, standardHeaders: true, legacyHeaders: false, message: { message: "Terlalu banyak permintaan. Coba lagi 1 jam lagi." } });
const RESET_MINUTES = 30;
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

router.post("/forgot", resetLimiter, async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "Format email tidak valid.");
  if (!mail.configured() && config.isProduction) throw new HttpError(503, "Pengiriman email belum diatur. Hubungi admin.");
  const user = await User.findOne({ email });
  if (user && user.aktif) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + RESET_MINUTES * 60 * 1000);
    await user.save();
    const link = `${config.appUrl}/reset-password?token=${token}`;
    const nama = (user.namaLengkap || user.username).split(" ")[0];
    if (mail.configured()) {
      try {
        await mail.send({
          to: user.email,
          subject: "Ganti password Chemistry",
          text: `Halo ${nama},\n\nAda permintaan mengganti password akun Chemistry @${user.username}. Buka link ini dalam ${RESET_MINUTES} menit:\n\n${link}\n\nKalau kamu tidak meminta ini, abaikan email ini. Password-mu tidak berubah.`,
          html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#17212B;max-width:520px"><p>Halo ${nama.replace(/[<>&"]/g, "")},</p><p>Ada permintaan mengganti password akun Chemistry <b>@${user.username}</b>. Link berikut berlaku ${RESET_MINUTES} menit.</p><p><a href="${link}" style="display:inline-block;background:#1D4E89;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Ganti password</a></p><p style="color:#5A6672;font-size:13px">Kalau kamu tidak meminta ini, abaikan email ini.</p></div>`,
        });
      } catch (error) {
        console.error("Gagal kirim email reset:", error.message);
        throw new HttpError(502, "Email gagal dikirim. Coba lagi beberapa saat lagi.");
      }
    } else {
      console.log(`[lupa password] SMTP belum diatur. Link reset untuk @${user.username}: ${link}`);
    }
  }
  res.json({ ok: true, message: `Kalau email itu terdaftar, link ganti password sudah dikirim. Cek juga folder spam. Link berlaku ${RESET_MINUTES} menit.` });
});

router.post("/reset", resetLimiter, async (req, res) => {
  const token = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(400, "Link ganti password tidak valid.");
  if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter.");
  const user = await User.findOne({ resetTokenHash: hashToken(token), resetTokenExpires: { $gt: new Date() } });
  if (!user) throw new HttpError(400, "Link sudah kedaluwarsa atau sudah dipakai. Minta link baru.");
  user.password = await bcrypt.hash(password, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  await user.save();
  const sessionToken = issueToken(res, user, req);
  res.json({ user: user.toSelf(), token: sessionToken });
});

module.exports = router;
