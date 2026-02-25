// ============================================================
//  public/js/reminderHandler.js — Reminder System Frontend
//  Komunikasi ke /api/features/reminder/*
//  Fallback ke localStorage jika offline
// ============================================================

let reminders = [];

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
async function initReminder() {
  if (!requireLogin()) return;
  const user = getUser();
  if (user) {
    document.getElementById('sidebar-username').textContent = user.username;
    document.getElementById('sidebar-avatar').textContent = user.username[0].toUpperCase();
  }
  // Minta izin notifikasi
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  await loadReminders();
  // Refresh tampilan ETA setiap menit
  setInterval(renderList, 60_000);
}

// ══════════════════════════════════════════════════════════════
//  LOAD dari server
// ══════════════════════════════════════════════════════════════
async function loadReminders() {
  try {
    const r = await api.get('/features/reminder');
    if (r && r.success) {
      reminders = r.reminders || [];
      // Jadwalkan notifikasi untuk reminder yang sudah tersimpan di server
      reminders.forEach(rem => scheduleNotification(rem.text, rem.time, rem.id));
    } else {
      // Fallback: ambil dari localStorage
      reminders = getLocalReminders();
    }
  } catch {
    reminders = getLocalReminders();
  }
  renderList();
}

// ══════════════════════════════════════════════════════════════
//  CREATE Reminder
// ══════════════════════════════════════════════════════════════
async function createReminder() {
  const text  = document.getElementById('remind-text').value.trim();
  const tStr  = document.getElementById('remind-time').value.trim();
  const tAbs  = document.getElementById('remind-time-abs').value;

  if (!text) return showToast('error', '⚠️ Isi pesan pengingat dulu!');

  let targetTime = null;
  if (tAbs)  targetTime = new Date(tAbs).getTime();
  else if (tStr) targetTime = parseTimeInput(tStr);

  if (!targetTime || isNaN(targetTime) || targetTime <= Date.now()) {
    return showToast('error', '⚠️ Waktu tidak valid atau sudah lewat!');
  }

  const btn = document.getElementById('btn-create');
  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';

  try {
    const r = await api.post('/features/reminder/create', { text, time: targetTime });
    if (r && r.success) {
      const newRem = r.reminder;
      reminders.push(newRem);
      reminders.sort((a, b) => a.time - b.time);
      scheduleNotification(newRem.text, newRem.time, newRem.id);
      showToast('success', '✅ Reminder berhasil dibuat!');
    } else {
      // Simpan lokal jika server gagal
      const rem = { id: 'local_' + Date.now(), text, time: targetTime, created: Date.now() };
      reminders.push(rem);
      saveLocalReminders(reminders);
      scheduleNotification(rem.text, rem.time, rem.id);
      showToast('info', '📱 Tersimpan lokal (server tidak tersedia)');
    }
  } catch {
    const rem = { id: 'local_' + Date.now(), text, time: targetTime, created: Date.now() };
    reminders.push(rem);
    reminders.sort((a, b) => a.time - b.time);
    saveLocalReminders(reminders);
    scheduleNotification(rem.text, rem.time, rem.id);
    showToast('info', '📱 Tersimpan lokal');
  }

  document.getElementById('remind-text').value = '';
  document.getElementById('remind-time').value = '';
  document.getElementById('remind-time-abs').value = '';
  document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('active'));
  btn.disabled = false; btn.textContent = '➕ Buat Reminder';
  renderList();
}

// ══════════════════════════════════════════════════════════════
//  DELETE
// ══════════════════════════════════════════════════════════════
async function deleteReminder(id) {
  try {
    await api.delete(`/features/reminder/${id}`);
  } catch { /* tetap hapus dari list lokal */ }
  reminders = reminders.filter(r => r.id !== id);
  saveLocalReminders(reminders);
  renderList();
  showToast('info', '🗑️ Reminder dihapus');
}

async function clearAll() {
  if (!confirm('Hapus semua reminder aktif?')) return;
  try { await api.post('/features/reminder/clear', {}); } catch { /* ignore */ }
  reminders = [];
  saveLocalReminders([]);
  renderList();
  showToast('info', '🗑️ Semua reminder dihapus');
}

// ══════════════════════════════════════════════════════════════
//  RENDER LIST
// ══════════════════════════════════════════════════════════════
function renderList() {
  // Hapus yang sudah lewat dari tampilan
  const now = Date.now();
  const active = reminders.filter(r => r.time > now);
  document.getElementById('remind-count').textContent = active.length;

  const el = document.getElementById('remind-list');
  if (!active.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="big">📭</div>
      <p>Belum ada reminder aktif.<br>Buat yang pertama di atas!</p>
    </div>`;
    return;
  }

  el.innerHTML = active.map(r => `
    <div class="reminder-item" id="rem-${r.id}">
      <div class="reminder-icon">⏰</div>
      <div class="reminder-info">
        <div class="reminder-text">${escHtml(r.text)}</div>
        <div class="reminder-time">📅 ${new Date(r.time).toLocaleString('id-ID', {timeZone:'Asia/Jakarta'})}</div>
      </div>
      <div class="reminder-eta">${etaLabel(r.time)}</div>
      <button class="btn-del" onclick="deleteReminder('${r.id}')">🗑️</button>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
//  BROWSER NOTIFICATION SCHEDULER
// ══════════════════════════════════════════════════════════════
const _scheduled = new Set();

function scheduleNotification(text, targetTime, id) {
  if (_scheduled.has(id)) return; // jangan double-schedule
  const delay = targetTime - Date.now();
  if (delay <= 0) return;
  _scheduled.add(id);
  setTimeout(() => {
    // Hapus dari list aktif
    reminders = reminders.filter(r => r.id !== id);
    saveLocalReminders(reminders);
    renderList();
    // Kirim notifikasi
    if (Notification.permission === 'granted') {
      new Notification('⏰ Reminder AlgojoGacor!', { body: text, icon: '/favicon.ico' });
    }
    showToast('success', `🔔 Reminder: ${text}`);
  }, delay);
}

// ══════════════════════════════════════════════════════════════
//  QUICK TIME PICKER
// ══════════════════════════════════════════════════════════════
function setTime(val) {
  document.getElementById('remind-time').value = val;
  document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('active'));
  event.currentTarget.classList.add('active');
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function parseTimeInput(input) {
  const now = Date.now();
  const rel  = input.match(/^(\d+)(s|m|h|d)$/i);
  if (rel) {
    const mult = { s:1000, m:60000, h:3600000, d:86400000 };
    return now + parseInt(rel[1]) * mult[rel[2].toLowerCase()];
  }
  const tod = input.match(/^(\d{1,2}):(\d{2})$/);
  if (tod) {
    const d = new Date(); d.setHours(+tod[1], +tod[2], 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  const dat = input.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dat) {
    const d = new Date(); d.setMonth(+dat[2]-1, +dat[1]); d.setHours(8, 0, 0, 0);
    if (d.getTime() <= now) d.setFullYear(d.getFullYear() + 1);
    return d.getTime();
  }
  return null;
}

function etaLabel(ms) {
  const d = ms - Date.now(); if (d <= 0) return 'Sudah lewat';
  const m = Math.floor(d/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
  if (dy > 0)  return `${dy}h ${h%24}j lagi`;
  if (h > 0)   return `${h}j ${m%60}m lagi`;
  return `${m}m lagi`;
}

function getLocalReminders() {
  const user = getUser();
  const key  = 'reminders_' + (user?.username || 'guest');
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveLocalReminders(arr) {
  const user = getUser();
  const key  = 'reminders_' + (user?.username || 'guest');
  localStorage.setItem(key, JSON.stringify(arr));
}
function escHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }