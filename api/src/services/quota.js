// Batas pemakaian AI per user per hari, supaya kuota Gemini tidak habis oleh satu orang.
const config = require("../config");
const AiUsage = require("../models/AiUsage");
const { HttpError } = require("../middleware/errors");

const today = (now = new Date()) => new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const unlimited = (user) => !config.aiDailyLimit || user?.role === "admin";

async function usage(user) {
  if (unlimited(user)) return { limit: 0, used: 0, remaining: null };
  const doc = await AiUsage.findOne({ user: user._id, day: today() });
  const used = doc?.count || 0;
  return { limit: config.aiDailyLimit, used, remaining: Math.max(0, config.aiDailyLimit - used) };
}

async function checkQuota(req, res, next) {
  if (unlimited(req.user)) return next();
  const { remaining } = await usage(req.user);
  if (remaining <= 0) throw new HttpError(429, `Batas harian (${config.aiDailyLimit} permintaan) sudah habis. Bisa dipakai lagi besok mulai pukul 00.00 WIB.`);
  res.on("finish", () => {
    if (res.statusCode < 400) AiUsage.updateOne({ user: req.user._id, day: today() }, { $inc: { count: 1 } }, { upsert: true }).catch(() => {});
  });
  next();
}

module.exports = { checkQuota, usage, today };
