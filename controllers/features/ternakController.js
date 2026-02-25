// ============================================================
//  controllers/features/ternakController.js  (Fixed & Enhanced)
// ============================================================

const db = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');
const { ANIMAL_PRICES, ANIMAL_GROW_TIME_MS, ANIMAL_SELL_PRICE } = require('../../utils/constants');

const MAX_ANIMAL_SLOTS = 8;

/* ── Logger terpusat ── */
const logger = {
  // INFO
  info: (action, username, msg, meta = '') => {
    // const time = new Date().toLocaleString('id-ID');
    // console.log(`[TERNAK][INFO ][${time}] ${action} | User: ${username} | ${msg}${meta ? ' | ' + meta : ''}`);
  },
  
  // WARN
  warn: (action, username, msg, meta = '') => {
    const time = new Date().toLocaleString('id-ID');
    console.warn(`[TERNAK][WARN ][${time}] ${action} | User: ${username} | ${msg}${meta ? ' | ' + meta : ''}`);
  },
  
  // ERROR
  error: (action, username, err, meta = '') => {
    const time = new Date().toLocaleString('id-ID');
    console.error(`[TERNAK][ERROR][${time}] ${action} | User: ${username} | ${err?.message || err}${meta ? ' | ' + meta : ''}`);
    if (err?.stack) console.error(err.stack);
  },
};

/* ── Helper: simpan user data ── */
async function saveU(username, u, source) {
  try {
    const data = db.getData();
    if (source === 'wa') {
      const waId = db.getWebUsers()[username]?.waId;
      if (!waId) throw new Error(`waId tidak ditemukan untuk username: ${username}`);
      data.users[waId] = u;
    } else {
      if (!data.webGameData) data.webGameData = {};
      data.webGameData[username] = u;
    }
    await db.saveData(data);
    logger.info('saveU', username, `Data tersimpan (source: ${source})`);
  } catch (err) {
    logger.error('saveU', username, err);
    throw err;
  }
}

/* ── Helper: normalisasi data animal ── */
function normalizeAnimal(a) {
  const normalized = { ...a };
  // Qty: support field lama (jumlah) & baru (qty)
  normalized.qty = parseInt(a.qty) || parseInt(a.jumlah) || 1;
  // readyAt: konversi detik → milidetik jika perlu
  if (normalized.readyAt != null && normalized.readyAt < 1e12) {
    normalized.readyAt = normalized.readyAt * 1000;
  }
  // Pastikan animal key ada
  if (!normalized.animal && !normalized.type && !normalized.jenis) {
    console.warn('[TERNAK][WARN] Animal tanpa key ditemukan:', a);
  }
  return normalized;
}

/* ── Helper: total slot terpakai ── */
function countSlots(animals = []) {
  return animals.reduce((sum, a) => sum + (parseInt(a.qty) || parseInt(a.jumlah) || 1), 0);
}

/* ============================================================
   GET /features/ternak
   Ambil status kandang + saldo user
============================================================ */
async function getStatus(req, res) {
  const { username } = req.user;
  logger.info('getStatus', username, 'Request masuk');

  try {
    const { data: u } = getUserGameData(username);

    const animals = (u.animals || []).map(normalizeAnimal);
    const balance = Math.floor(u.balance || 0);
    const now = Date.now();
    const ready = animals.filter(a => now >= (a.readyAt || 0)).length;
    const totalSlots = countSlots(animals);

    logger.info('getStatus', username,
      `Berhasil — ${animals.length} batch, ${totalSlots} slot, ${ready} siap jual, saldo Rp${fmt(balance)}`
    );

    // Kirim lastPakanAt agar frontend bisa render cooldown yang akurat
    const lastPakanAt = u.lastPakanAt || 0;

    res.json({ success: true, animals, balance, ready, totalSlots, lastPakanAt });
  } catch (err) {
    logger.error('getStatus', username, err);
    res.status(500).json({ success: false, message: 'Internal Server Error saat memuat data ternak.' });
  }
}

/* ============================================================
   POST /features/ternak/beli
   Body: { animal: string, qty: number }
============================================================ */
async function beli(req, res) {
  const { username } = req.user;
  const { animal, qty = 1 } = req.body;

  logger.info('beli', username, `Request beli ${qty}x "${animal}"`);

  try {
    // Validasi qty
    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      logger.warn('beli', username, `Qty tidak valid: ${qty}`);
      return res.status(400).json({ success: false, message: '❌ Jumlah hewan tidak valid.' });
    }

    // Validasi jenis hewan
    const price = ANIMAL_PRICES[animal];
    if (price == null) {
      logger.warn('beli', username, `Hewan tidak dikenal: "${animal}"`);
      return res.status(400).json({ success: false, message: `❌ Hewan "${animal}" tidak dikenal.` });
    }

    // Validasi grow time tersedia
    const growTime = ANIMAL_GROW_TIME_MS[animal];
    if (growTime == null) {
      logger.warn('beli', username, `ANIMAL_GROW_TIME_MS["${animal}"] tidak tersedia`);
      return res.status(500).json({ success: false, message: '❌ Konfigurasi hewan tidak lengkap, hubungi admin.' });
    }

    const { source, data: u } = getUserGameData(username);
    if (!u.animals) u.animals = [];

    // Cek slot kandang
    const currentSlots = countSlots(u.animals);
    if (currentSlots + parsedQty > MAX_ANIMAL_SLOTS) {
      const slotsLeft = MAX_ANIMAL_SLOTS - currentSlots;
      logger.warn('beli', username,
        `Slot penuh! Terpakai: ${currentSlots}/${MAX_ANIMAL_SLOTS}, mau beli: ${parsedQty}, tersisa: ${slotsLeft}`
      );
      return res.status(400).json({
        success: false,
        message: `❌ Slot kandang penuh! Tersisa ${slotsLeft} slot, kamu mau beli ${parsedQty}.`,
      });
    }

    // Cek saldo
    const total = price * parsedQty;
    const balance = u.balance || 0;
    if (balance < total) {
      logger.warn('beli', username,
        `Saldo kurang! Butuh Rp${fmt(total)}, punya Rp${fmt(balance)}`
      );
      return res.status(400).json({
        success: false,
        message: `❌ Saldo kurang! Butuh Rp${fmt(total)}, saldo kamu Rp${fmt(balance)}.`,
      });
    }

    // Eksekusi beli
    const now = Date.now();
    u.balance -= total;
    u.animals.push({
      animal,
      qty: parsedQty,
      boughtAt: now,
      readyAt: now + growTime,
    });

    await saveU(username, u, source);

    logger.info('beli', username,
      `Beli ${parsedQty}x ${animal} sukses. Total: -Rp${fmt(total)}. Saldo baru: Rp${fmt(u.balance)}.`
    );

    res.json({
      success: true,
      message: `🐄 Beli ${parsedQty}x ${animal} berhasil! -Rp${fmt(total)}`,
      balance: Math.floor(u.balance),
    });
  } catch (err) {
    logger.error('beli', username, err, `animal=${animal} qty=${qty}`);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses pembelian.' });
  }
}

/* ============================================================
   POST /features/ternak/pakan
   Potong 1 jam dari readyAt semua hewan
   ⏱️  Cooldown: 10 menit per user
============================================================ */
const PAKAN_COOLDOWN_MS = 10 * 60 * 1000; // 10 menit

async function pakan(req, res) {
  const { username } = req.user;
  logger.info('pakan', username, 'Request beri pakan');

  try {
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();

    // ── Cek cooldown ──────────────────────────────────────────
    const lastPakanAt = u.lastPakanAt || 0;
    const elapsed     = now - lastPakanAt;
    if (elapsed < PAKAN_COOLDOWN_MS) {
      const sisaMs  = PAKAN_COOLDOWN_MS - elapsed;
      const sisaMen = Math.ceil(sisaMs / 60000);
      const sisaDet = Math.ceil((sisaMs % 60000) / 1000);
      logger.warn('pakan', username,
        `Cooldown aktif! Sisa ${sisaMen}m ${sisaDet}s (lastPakanAt: ${new Date(lastPakanAt).toLocaleString('id-ID')})`
      );
      return res.status(429).json({
        success: false,
        message: `⏳ Pakan baru bisa diberikan ${sisaMen} menit ${sisaDet} detik lagi!`,
        cooldownMs: sisaMs,
        lastPakanAt,
      });
    }

    // ── Validasi kandang ──────────────────────────────────────
    if (!u.animals?.length) {
      logger.warn('pakan', username, 'Kandang kosong');
      return res.status(400).json({ success: false, message: '❌ Tidak ada hewan di kandang.' });
    }

    const ONE_HOUR = 3_600_000;
    let affected    = 0;

    // Pastikan u.animals adalah array sebelum forEach
    const animalList = Array.isArray(u.animals) ? u.animals : [];
    animalList.forEach(a => {
      const oldReadyAt = a.readyAt || now;
      // Jangan percepat hewan yang sudah siap jual
      if (oldReadyAt > now) {
        a.readyAt = Math.max(now, oldReadyAt - ONE_HOUR);
        affected++;
      }
    });

    // ── Simpan waktu pakan terakhir ───────────────────────────
    u.lastPakanAt = now;

    await saveU(username, u, source);

    logger.info('pakan', username,
      `Pakan diberikan. ${affected} hewan dipercepat 1 jam dari ${animalList.length} total batch. ` +
      `Cooldown berikutnya: ${new Date(now + PAKAN_COOLDOWN_MS).toLocaleString('id-ID')}`
    );

    res.json({
      success:     true,
      message:     `🍖 Semua hewan diberi pakan! ${affected} hewan dipercepat 1 jam.`,
      affected,
      lastPakanAt: now,
      nextPakanAt: now + PAKAN_COOLDOWN_MS,
    });
  } catch (err) {
    logger.error('pakan', username, err);
    res.status(500).json({ success: false, message: 'Gagal memberi pakan.' });
  }
}

/* ============================================================
   POST /features/ternak/jual
   Jual semua hewan yang sudah readyAt <= now
============================================================ */
async function jual(req, res) {
  const { username } = req.user;
  logger.info('jual', username, 'Request jual ternak');

  try {
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();

    if (!u.animals?.length) {
      logger.warn('jual', username, 'Kandang kosong');
      return res.status(400).json({ success: false, message: '❌ Tidak ada hewan di kandang.' });
    }

    const readyBatch = u.animals.filter(a => now >= (Number(a.readyAt) || 0));

    if (!readyBatch.length) {
      const earliest = Math.min(...u.animals.map(a => Number(a.readyAt) || Infinity));
      const waitMs = earliest - now;
      const waitMin = Math.max(0, Math.floor(waitMs / 60000));
      logger.warn('jual', username,
        `Tidak ada yang ready. Hewan paling cepat selesai ${waitMin} menit lagi.`
      );
      return res.status(400).json({
        success: false,
        message: `⏳ Belum ada hewan yang siap dijual. Paling cepat ${waitMin} menit lagi.`,
      });
    }

    // Hitung pendapatan
    let income = 0;
    const soldDetails = [];
    readyBatch.forEach(a => {
      const animalKey = a.animal || a.type || a.jenis || '';
      const sellPrice = ANIMAL_SELL_PRICE[animalKey] || 0;
      const qty = parseInt(a.qty) || parseInt(a.jumlah) || 1;
      const subtotal = sellPrice * qty;

      if (sellPrice === 0) {
        logger.warn('jual', username, `ANIMAL_SELL_PRICE["${animalKey}"] = 0 atau tidak ditemukan!`);
      }

      income += subtotal;
      soldDetails.push(`${qty}x ${animalKey} = Rp${fmt(subtotal)}`);
    });

    const oldBalance = u.balance || 0;
    // Pakai perbandingan Number() langsung — hindari || 0 yang bisa hapus animal dengan readyAt tidak valid
    u.animals = u.animals.filter(a => {
      const rAt = Number(a.readyAt);
      return !isNaN(rAt) && rAt > 0 && now < rAt;
    });
    u.balance = oldBalance + income;

    await saveU(username, u, source);

    logger.info('jual', username,
      `Jual sukses! ${readyBatch.length} batch terjual. Income: +Rp${fmt(income)}. ` +
      `Saldo: Rp${fmt(oldBalance)} → Rp${fmt(u.balance)}. Detail: [${soldDetails.join(', ')}]`
    );

    res.json({
      success: true,
      message: `🤑 Jual ternak berhasil! +Rp${fmt(income)}`,
      income,
      soldCount: readyBatch.length,
      balance: Math.floor(u.balance),
    });
  } catch (err) {
    logger.error('jual', username, err);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat menjual ternak.' });
  }
}

module.exports = { getStatus, beli, pakan, jual };