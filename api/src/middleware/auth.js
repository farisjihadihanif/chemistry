const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { HttpError } = require("./errors");

const COOKIE = "token";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: config.crossSiteCookie ? "none" : "lax",
    secure: config.crossSiteCookie || config.isProduction,
    maxAge: config.jwtDays * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

const sign = (user) => jwt.sign({ sub: String(user._id), v: user.tokenVersion || 0 }, config.jwtSecret, { expiresIn: `${config.jwtDays}d` });

// Web memakai cookie httpOnly; aplikasi mobile memakai token di header Authorization.
function issueToken(res, user) {
  const token = sign(user);
  res.cookie(COOKIE, token, cookieOptions());
  return token;
}

function clearToken(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE, opts);
}

async function loadUser(req, res, next) {
  req.user = null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.[COOKIE];
  if (token) {
    try {
      const p = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(p.sub);
      if (user && user.aktif && (user.tokenVersion || 0) === (p.v || 0)) req.user = user;
    } catch {
      /* token tidak valid: dianggap belum masuk */
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  if (req.user.role !== "admin") throw new HttpError(403, "Khusus admin.");
  next();
}

module.exports = { issueToken, clearToken, loadUser, requireAuth, requireAdmin, sign, COOKIE };
