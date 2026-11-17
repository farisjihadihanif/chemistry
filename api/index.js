const config = require("./src/config");
const { connect } = require("./src/db");
const { createApp } = require("./src/app");
const { ensureAdmin } = require("./src/seed");
const ml = require("./src/services/ml");

process.on("unhandledRejection", (r) => console.error("Kesalahan tak tertangani:", r?.stack || r));
process.on("uncaughtException", (e) => console.error("Kesalahan fatal tertangkap:", e?.stack || e));

async function main() {
  if (!config.jwtSecret || config.jwtSecret.length < 16) throw new Error("JWT_SECRET di .env belum diisi (minimal 16 karakter acak).");
  await connect(config.mongoUrl);
  await ensureAdmin();
  createApp().listen(config.port, () => {
    console.log(`API Chemistry jalan di http://localhost:${config.port}`);
    console.log(`AI (Gemini): ${config.geminiApiKey ? `aktif (${config.geminiModel})` : "belum aktif (GEMINI_API_KEY kosong)"}`);
  });
  ml.meta()
    .then((m) => console.log(`ml-service tersambung: ${m.compounds} senyawa di pustaka.`))
    .catch(() => console.warn(`ml-service belum bisa dihubungi di ${config.mlUrl}. Jalankan dulu: cd ml-service && python -m uvicorn app:app --port 5000`));
}

main().catch((e) => {
  console.error("Server gagal mulai:", e.message);
  process.exit(1);
});
