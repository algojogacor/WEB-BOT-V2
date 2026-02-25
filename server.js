// ============================================================
//  server.js — ALGOJO WEB - Entry Point Utama
//  Supports both local development AND Vercel serverless
//  Untuk modifikasi: buka file ini lalu sesuaikan middleware/route
// ============================================================

require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");

const { connectDB } = require("./config/database");
const { globalLimiter } = require("./middleware/rateLimiter");
const routes = require("./routes/index");

const IS_VERCEL = !!process.env.VERCEL;

const app = express();

app.set('trust proxy', 1);

// ── 1. Security Middleware ────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        // Perbaikan: Tambahkan 'blob:' dan 'data:' untuk jaga-jaga render gambar AI di frontend
        imgSrc: ["'self'", "data:", "blob:", "https:"], 
        // Perbaikan: Izinkan koneksi API eksternal jika frontend fetch langsung
        connectSrc: ["'self'", "wss:", "ws:", "https://*.openrouter.ai", "https://*.pollinations.ai"],
      },
    },
  }),
);

app.use(cors({ origin: process.env.APP_URL || "*", credentials: true }));
app.use(mongoSanitize());
app.use(xssClean());
app.use(globalLimiter);

// ── 2. Body Parser ────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ── 3. Static Files (PINDAHKAN KE SINI!) ──────────────────────
// Lakukan ini SEBELUM koneksi DB, agar file statis langsung dikirim tanpa membebani DB
app.use(express.static(path.join(__dirname, "public")));

// ── 4. Database Middleware (KHUSUS API) ───────────────────────
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    // Kirim respons JSON jika DB gagal, bukan error HTML
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

// ── 5. API Routes ─────────────────────────────────────────────
app.use("/api", routes);

// ── 5. Penanganan Error 404 Khusus API ──────────────────────
// Mencegah request API yang salah alamat nyasar ke index.html
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, message: "API Endpoint tidak ditemukan." });
});

// ── 6. SPA Catch-all (Untuk React/Vue/Vanilla Router) ─────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── 7. Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Terjadi kesalahan server.",
  });
});

// ── 8. Boot (Local Development Only) ─────────────────────────
// On Vercel, the app is imported by api/index.js — no need to listen.
if (!IS_VERCEL) {
  const server = http.createServer(app);
  const PORT = process.env.PORT || 3000;

  async function boot() {
    try {
      // Koneksi database
      await connectDB();
      console.log("✅ Database terhubung");

      // Inisialisasi Socket.io untuk Live Chat (local only)
      const initSocket = require("./socket/index");
      initSocket(server);
      console.log("✅ Socket.IO aktif");

      // Mulai cron life system (HP/Lapar/Energi berkurang setiap menit)
      // lifeService.startLifeCron();
      // console.log('✅ Life System (Cron) berjalan');

      server.listen(PORT, () => {
        console.log(`\n🚀 ALGOJO WEB berjalan di http://localhost:${PORT}`);
        console.log(`   Mode: ${process.env.NODE_ENV || "development"}\n`);
      });
    } catch (err) {
      console.error("💥 Gagal boot:", err.message);
      process.exit(1);
    }
  }

  boot();
} else {
  console.log("☁️  Running on Vercel (serverless mode)");
}

// ── Export app for Vercel ─────────────────────────────────────
module.exports = app;
