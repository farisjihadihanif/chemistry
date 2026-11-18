const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const config = require("./config");
const { loadUser } = require("./middleware/auth");
const { notFound, errorHandler } = require("./middleware/errors");

function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:", "blob:", "https://pubchem.ncbi.nlm.nih.gov"],
          "connect-src": ["'self'"],
          "object-src": ["'none'"],
          "frame-ancestors": ["'self'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.clientOrigins.includes(origin.replace(/\/+$/, ""))) return cb(null, true);
        // Saat pengembangan, izinkan localhost port berapa pun (flutter run -d chrome memakai port acak).
        if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(loadUser);

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api", require("./routes/compounds"));
  app.use("/api/discoveries", require("./routes/discoveries"));
  app.use("/api/favorites", require("./routes/favorites"));
  app.use("/api/chat", require("./routes/chat"));
  app.use("/api/admin", require("./routes/admin"));
  // Foto profil publik (dipakai web & aplikasi)
  app.get("/api/avatars/:id", async (req, res) => {
    const Avatar = require("./models/Avatar");
    const a = /^[a-f0-9]{24}$/.test(req.params.id) ? await Avatar.findOne({ user: req.params.id }) : null;
    if (!a) return res.status(404).json({ message: "Foto tidak ada." });
    res.set("Content-Type", a.mime).set("Cache-Control", "public, max-age=31536000, immutable").set("X-Content-Type-Options", "nosniff").send(a.data);
  });
  app.use("/api", notFound);

  // Kalau web sudah di-build (web/dist), server ini sekalian menyajikannya.
  const dist = process.env.CLIENT_DIST || path.join(__dirname, "..", "..", "web", "dist");
  if (require("fs").existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
