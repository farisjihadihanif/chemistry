// Semua pengaturan dibaca dari .env (lihat .env.example).
require("dotenv").config({ quiet: true });

const list = (v, fallback) =>
  (v || fallback)
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  isProduction,
  port: Number(process.env.PORT) || 4100,
  mongoUrl: process.env.MONGO_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtDays: Number(process.env.JWT_DAYS) || 7,
  clientOrigins: list(process.env.CLIENT_ORIGIN, "http://localhost:5173"),
  crossSiteCookie: process.env.CROSS_SITE_COOKIE === "true",

  adminEmail: process.env.ADMIN_EMAIL || "",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "",

  // Layanan Python (RDKit + model). Hanya API ini yang memanggilnya.
  mlUrl: (process.env.ML_SERVICE_URL || "http://127.0.0.1:5000").replace(/\/+$/, ""),
  mlToken: process.env.ML_SERVICE_TOKEN || "",

  // Google Gemini: ubah kalimat jadi kriteria, usulan senyawa, alasan, asisten kimia.
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-flash-latest",
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-2.5-flash",
  // Batas permintaan AI (penemuan + asisten) per user per hari. Admin bebas. 0 = tanpa batas.
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 30),

  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || "",
    pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    from: process.env.SMTP_FROM || "",
  },
  contactEmail: process.env.CONTACT_EMAIL || process.env.SMTP_USER || "",
  appUrl: (process.env.APP_URL || (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0]).trim().replace(/\/+$/, ""),
};
