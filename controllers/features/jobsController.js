// ============================================================
//  controllers/features/jobsController.js
//  Porting dari commands/jobs.js WA Bot — Sistem Profesi & Karir
// ============================================================

const db = require("../../config/database");
const { getUserGameData } = require("../userController");
const { fmt, randInt } = require("../../utils/helpers");
const { JOBS } = require("../../utils/constants");
// ── Konfigurasi Profesi (Adjusted for 20M Economy) ──────────
// const JOBS = {
//   petani: {
//     role: "🌾 Petani Modern",
//     cost: 30_000_000,
//     salary: 3_000_000,
//     cooldown: 60, // menit
//     skillCooldown: 300, // 5 jam (menit)
//     desc: "Ahli bercocok tanam. Skill: Percepat panen tanaman 3 jam!",
//     skillDesc: "Mempercepat waktu panen semua tanaman sebesar 3 jam.",
//   },
//   peternak: {
//     role: "🤠 Juragan Ternak",
//     cost: 75_000_000,
//     salary: 7_500_000,
//     cooldown: 120, // 2 jam
//     skillCooldown: 300,
//     desc: "Pawang hewan. Skill: Bikin hewan langsung lapar (Cepat gemuk)!",
//     skillDesc: "Mengatur ulang waktu makan hewan agar bisa diberi makan lagi.",
//   },
//   polisi: {
//     role: "👮 Polisi Siber",
//     cost: 150_000_000,
//     salary: 10_500_000,
//     cooldown: 120, // 2 jam
//     skillCooldown: 300,
//     desc: "Penegak hukum. Pasif: Kebal dari rob & Skill Razia.",
//     skillDesc:
//       "Menggerebek markas maling dan mendapatkan uang sitaan Rp 5-10 Juta.",
//   },
// };

// ── Helper: save user data ──────────────────────────────────
async function saveU(username, u, source) {
  const data = db.getData();
  if (source === "wa") {
    const waId = db.getWebUsers()[username]?.waId;
    if (waId) data.users[waId] = u;
  } else {
    if (!data.webGameData) data.webGameData = {};
    data.webGameData[username] = u;
  }
  await db.saveData(data);
}

// ── Helper: init job fields ─────────────────────────────────
function ensureJobFields(u) {
  if (u.job === undefined) u.job = null;
  if (!u.lastWork) u.lastWork = 0;
  if (!u.lastSkill) u.lastSkill = 0;
}

// ══════════════════════════════════════════════════════════════
//  GET /api/features/jobs — Status profesi & daftar lowongan
// ══════════════════════════════════════════════════════════════
async function getStatus(req, res) {
  const { username } = req.user;
  const { data: u } = getUserGameData(username);
  ensureJobFields(u);

  const now = Date.now();

  // Current job info
  let currentJob = null;
  if (u.job && JOBS[u.job]) {
    const j = JOBS[u.job];
    const workCdMs = j.cooldown * 60_000;
    const skillCdMs = j.skillCooldown * 60_000;
    const workTimeLeft = Math.max(0, workCdMs - (now - u.lastWork));
    const skillTimeLeft = Math.max(0, skillCdMs - (now - u.lastSkill));

    currentJob = {
      code: u.job,
      role: j.role,
      salary: j.salary,
      cooldown: j.cooldown,
      desc: j.desc,
      skillDesc: j.skillDesc,
      canWork: workTimeLeft <= 0,
      workTimeLeft,
      canSkill: skillTimeLeft <= 0,
      skillTimeLeft,
    };
  }

  // Available jobs list
  const jobsList = Object.entries(JOBS).map(([code, j]) => ({
    code,
    role: j.role,
    cost: j.cost,
    salary: j.salary,
    cooldown: j.cooldown,
    desc: j.desc,
    skillDesc: j.skillDesc,
    isCurrentJob: u.job === code,
  }));

  res.json({
    success: true,
    balance: Math.floor(u.balance || 0),
    currentJob,
    jobs: jobsList,
  });
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/jobs/apply — Melamar kerja
//  Body: { job: "petani" | "peternak" | "polisi" }
// ══════════════════════════════════════════════════════════════
async function apply(req, res) {
  const { username } = req.user;
  const { source, data: u } = getUserGameData(username);
  ensureJobFields(u);

  const { job: targetJob } = req.body;

  if (!targetJob || !JOBS[targetJob]) {
    return res.status(400).json({
      success: false,
      message: `❌ Profesi tidak ditemukan. Pilih: ${Object.keys(JOBS).join(", ")}`,
    });
  }

  if (u.job) {
    return res.status(400).json({
      success: false,
      message: `❌ Kamu sudah jadi ${JOBS[u.job].role}. Resign dulu kalau mau pindah kerja.`,
    });
  }

  const job = JOBS[targetJob];
  if ((u.balance || 0) < job.cost) {
    return res.status(400).json({
      success: false,
      message: `❌ Uang kurang! Butuh Rp ${fmt(job.cost)} untuk sertifikasi ${job.role}.`,
    });
  }

  u.balance -= job.cost;
  u.job = targetJob;
  u.lastWork = 0;
  u.lastSkill = 0;

  await saveU(username, u, source);

  res.json({
    success: true,
    message: `🎉 Selamat! Kamu resmi menjadi ${job.role}.\nSekarang kamu bisa kerja dan pakai skill!`,
    balance: Math.floor(u.balance),
    job: targetJob,
  });
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/jobs/resign — Berhenti kerja
// ══════════════════════════════════════════════════════════════
async function resign(req, res) {
  const { username } = req.user;
  const { source, data: u } = getUserGameData(username);
  ensureJobFields(u);

  if (!u.job) {
    return res.status(400).json({
      success: false,
      message: "❌ Kamu kan pengangguran?",
    });
  }

  const oldJob = JOBS[u.job]?.role || u.job;
  u.job = null;
  u.lastWork = 0;
  u.lastSkill = 0;

  await saveU(username, u, source);

  res.json({
    success: true,
    message: `👋 Kamu telah resign dari ${oldJob}.\nSekarang kamu Pengangguran.`,
  });
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/jobs/work — Ambil gaji (kerja)
// ══════════════════════════════════════════════════════════════
async function work(req, res) {
  const { username } = req.user;
  const { source, data: u } = getUserGameData(username);
  ensureJobFields(u);

  if (!u.job) {
    return res.status(400).json({
      success: false,
      message: "❌ Kamu Pengangguran! Lamar kerja dulu.",
    });
  }

  const now = Date.now();
  const job = JOBS[u.job];
  const cooldownMs = job.cooldown * 60_000;
  const diff = now - u.lastWork;

  if (diff < cooldownMs) {
    const timeLeft = cooldownMs - diff;
    return res.status(400).json({
      success: false,
      message: `⏳ Kamu lelah! Bisa kerja lagi dalam ${Math.ceil(timeLeft / 60_000)} menit.`,
      timeLeft,
    });
  }

  const salary = job.salary;
  u.balance = (u.balance || 0) + salary;
  u.dailyIncome = (u.dailyIncome || 0) + salary;
  u.lastWork = now;
  u.xp = (u.xp || 0) + 50;

  await saveU(username, u, source);

  res.json({
    success: true,
    message: `⚒️ Kerja keras bagai kuda!\nKamu bekerja sebagai ${job.role}.\n💰 Gaji Diterima: Rp ${fmt(salary)}`,
    salary,
    balance: Math.floor(u.balance),
    xp: u.xp,
  });
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/jobs/skill — Gunakan skill spesial
// ══════════════════════════════════════════════════════════════
async function useSkill(req, res) {
  const { username } = req.user;
  const { source, data: u } = getUserGameData(username);
  ensureJobFields(u);

  if (!u.job) {
    return res.status(400).json({
      success: false,
      message: "❌ Pengangguran gak punya skill.",
    });
  }

  const now = Date.now();
  const job = JOBS[u.job];
  const SKILL_CD = job.skillCooldown * 60_000;
  const diff = now - u.lastSkill;

  if (diff < SKILL_CD) {
    const timeLeft = SKILL_CD - diff;
    return res.status(400).json({
      success: false,
      message: `⏳ Skill sedang cooldown! Tunggu ${Math.ceil(timeLeft / (60 * 60_000))} jam lagi.`,
      timeLeft,
    });
  }

  let result = {};

  // ── PETANI: Percepat semua tanaman 3 jam ──────────────────
  if (u.job === "petani") {
    const crops = u.crops || [];
    const farmPlants = u.farm?.plants || [];
    const plants = crops.length ? crops : farmPlants;

    if (!plants.length) {
      return res.status(400).json({
        success: false,
        message: "❌ Ladang kosong. Tanam dulu!",
      });
    }

    const speedupMs = 3 * 60 * 60_000; // 3 jam
    plants.forEach((p) => {
      if (p.readyAt) p.readyAt -= speedupMs;
    });

    u.lastSkill = now;
    await saveU(username, u, source);

    result = {
      success: true,
      message:
        "🌾 Skill Petani Aktif!\nPupuk ajaib disebar. Waktu panen semua tanaman dipercepat 3 jam!",
      effect: "speedup_3h",
      affectedPlants: plants.length,
    };
  }

  // ── PETERNAK: Bikin hewan lapar ───────────────────────────
  else if (u.job === "peternak") {
    const animals = u.ternak || u.animals || [];

    if (!animals.length) {
      return res.status(400).json({
        success: false,
        message: "❌ Kandang kosong.",
      });
    }

    const feedResetMs = 6 * 60 * 60_000; // Mundur 6 jam
    animals.forEach((a) => {
      if (a.lastFeed) a.lastFeed -= feedResetMs;
    });

    u.lastSkill = now;
    await saveU(username, u, source);

    result = {
      success: true,
      message:
        "🤠 Skill Peternak Aktif!\nHewan diajak lari pagi. Sekarang mereka semua LAPAR (Bisa diberi makan lagi)!",
      effect: "hunger_reset",
      affectedAnimals: animals.length,
    };
  }

  // ── POLISI: Razia maling (Dapat uang sitaan) ─────────────
  else if (u.job === "polisi") {
    const bonus = 5_000_000 + randInt(0, 5_000_000); // 5jt - 10jt
    u.balance = (u.balance || 0) + bonus;
    u.dailyIncome = (u.dailyIncome || 0) + bonus;
    u.lastSkill = now;

    await saveU(username, u, source);

    result = {
      success: true,
      message: `👮 Skill Polisi Aktif!\nKamu menggerebek markas maling!\n💰 Barang sitaan: Rp ${fmt(bonus)} masuk ke dompetmu.`,
      effect: "raid_bonus",
      bonus,
      balance: Math.floor(u.balance),
    };
  }

  // ── Fallback ──────────────────────────────────────────────
  else {
    return res.status(400).json({
      success: false,
      message: "❌ Job tidak memiliki skill.",
    });
  }

  res.json(result);
}

module.exports = { getStatus, apply, resign, work, useSkill };
