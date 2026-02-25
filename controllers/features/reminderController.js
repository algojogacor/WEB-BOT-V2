// ============================================================
//  controllers/features/reminderController.js
//  Menyimpan reminder ke database MongoDB (bukan localStorage)
//  Porting dari commands/reminder.js BOT-WA-1
// ============================================================

const db = require('../../config/database');

// ── Helper: dapatkan & simpan data user ─────────────────────
function getUD(username) {
  const data = db.getData();
  if (!data.webGameData) data.webGameData = {};
  if (!data.webGameData[username]) data.webGameData[username] = {};
  const u = data.webGameData[username];
  if (!u.reminders) u.reminders = {};
  return { data, u };
}

async function saveUD(data) { await db.saveData(data); }

// ── Generate ID unik ─────────────────────────────────────────
function genId() { return 'rem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }

// ══════════════════════════════════════════════════════════════
//  GET /api/features/reminder — Ambil semua reminder user
// ══════════════════════════════════════════════════════════════
async function getReminders(req, res) {
  const { username } = req.user;
  const { u } = getUD(username);
  const now = Date.now();

  // Bersihkan yang sudah lewat
  const active = Object.entries(u.reminders || {})
    .filter(([_, r]) => r.time > now)
    .sort(([, a], [, b]) => a.time - b.time)
    .map(([id, r]) => ({ id, ...r }));

  res.json({ success: true, reminders: active });
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/reminder/create — Buat reminder baru
// ══════════════════════════════════════════════════════════════
async function createReminder(req, res) {
  const { username } = req.user;
  const { text, time } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Pesan reminder tidak boleh kosong.' });
  }
  if (!time || typeof time !== 'number' || time <= Date.now()) {
    return res.status(400).json({ success: false, message: 'Waktu tidak valid atau sudah lewat.' });
  }
  if (text.length > 200) {
    return res.status(400).json({ success: false, message: 'Pesan terlalu panjang (maks 200 karakter).' });
  }

  const { data, u } = getUD(username);

  // Batas maks 20 reminder per user
  const total = Object.keys(u.reminders).length;
  if (total >= 20) {
    return res.status(400).json({ success: false, message: 'Maksimal 20 reminder aktif. Hapus yang lama dulu.' });
  }

  const id = genId();
  u.reminders[id] = { text: text.trim(), time, created: Date.now(), sender: username };
  await saveUD(data);

  res.json({ success: true, reminder: { id, text: text.trim(), time, created: u.reminders[id].created } });
}

// ══════════════════════════════════════════════════════════════
//  DELETE /api/features/reminder/:id — Hapus reminder
// ══════════════════════════════════════════════════════════════
async function deleteReminder(req, res) {
  const { username } = req.user;
  const { id } = req.params;
  const { data, u } = getUD(username);

  if (!u.reminders[id]) {
    return res.status(404).json({ success: false, message: 'Reminder tidak ditemukan.' });
  }

  delete u.reminders[id];
  await saveUD(data);
  res.json({ success: true, message: 'Reminder dihapus.' });
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/reminder/clear — Hapus semua reminder
// ══════════════════════════════════════════════════════════════
async function clearReminders(req, res) {
  const { username } = req.user;
  const { data, u } = getUD(username);
  u.reminders = {};
  await saveUD(data);
  res.json({ success: true, message: 'Semua reminder dihapus.' });
}

module.exports = { getReminders, createReminder, deleteReminder, clearReminders };