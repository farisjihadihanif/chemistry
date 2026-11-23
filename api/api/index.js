// Pintu masuk Vercel (lihat vercel.json). Sama seperti ../index.js tetapi tanpa app.listen:
// MongoDB disambung dan admin dibuat sekali per instance, lalu dipakai ulang.
process.env.NODE_ENV ||= "production";
const config = require("../src/config");
const { connect } = require("../src/db");
const { createApp } = require("../src/app");
const { ensureAdmin } = require("../src/seed");

const MIN_SECRET = 16;
let ready = null;

class ConfigError extends Error {}

function assertConfig() {
  const missing = [];
  if (!config.mongoUrl) missing.push("MONGO_URL");
  if (!config.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) throw new ConfigError(`Variabel belum diisi: ${missing.join(", ")}`);
  if (config.jwtSecret.length < MIN_SECRET) throw new ConfigError(`JWT_SECRET kurang dari ${MIN_SECRET} karakter`);
}

function prepare() {
  ready ??= (async () => {
    assertConfig();
    await connect(config.mongoUrl);
    await ensureAdmin();
    return createApp();
  })().catch((error) => {
    ready = null; // dicoba lagi di permintaan berikutnya
    throw error;
  });
  return ready;
}

// Hanya nama variabel atau jenis kesalahan; pesan asli bisa memuat alamat database.
const SAFE_TYPES = /^(MongoParseError|MongoServerError|MongoNetworkError|MongoServerSelectionError|MongooseServerSelectionError|MongoAPIError|MongoInvalidArgumentError|ValidationError)$/;
function safeReason(error) {
  if (error instanceof ConfigError) return error.message;
  const cause = error?.cause instanceof Error ? error.cause : error;
  if (error?.kind === "auth") return "Login MongoDB ditolak (cek user dan password di MONGO_URL)";
  if (SAFE_TYPES.test(cause?.name)) return `MongoDB: ${cause.name}`;
  if (/^E[A-Z]+$/.test(cause?.code || "")) return `MongoDB: ${cause.code}`;
  return "Kesalahan saat mulai (lihat log server)";
}

module.exports = async function handler(req, res) {
  let app;
  try {
    app = await prepare();
  } catch (error) {
    const reason = safeReason(error);
    console.error("Server gagal mulai:", reason);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(JSON.stringify({ message: "Server belum siap. Coba lagi sebentar lagi.", reason }));
  }
  return app(req, res);
};
module.exports.safeReason = safeReason;
