// ============================================================
//  controllers/features/bankController.js
//  Bank, Transfer, Pinjam, Bayar Utang, Rob
// ============================================================

const db  = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt, isDead, isSleeping } = require('../../utils/helpers');

const BANK_CONFIG = {
    COOLDOWN_MS:   10 * 60 * 1000,  // 10 menit
    TRANSFER_TAX:  0.05,             // Pajak transfer 5%
    DAILY_LIMIT:   10_000_000_000,   // 10 Miliar/hari
    MAX_LOAN:      5_000_000_000,    // Max pinjam 5 Miliar
    INTEREST_RATE: 0.20,             // Bunga pinjam 20%
    ROB_COOLDOWN:  30 * 60 * 1000,  // 30 menit
    ROB_SUCCESS:   0.40,             // 40% berhasil
    ROB_STEAL_PCT: 0.20,             // Ambil 20% dari korban
    ROB_FINE_PCT:  0.10,             // Denda 10% jika gagal
    ROB_HP_COST:   20,               // HP -20 jika gagal
    ROB_ENERGY_COST: 10,             // Energi -10
    ROB_MIN_TARGET: 1_000_000,       // Target minimal Rp 1 Juta
};

async function saveU(username, u, source) {
    const data = db.getData();
    if (source === 'wa') {
        const waId = db.getWebUsers()[username]?.waId;
        if (waId) data.users[waId] = u;
    } else {
        if (!data.webGameData) data.webGameData = {};
        data.webGameData[username] = u;
    }
    await db.saveData(data);
}

// ── GET /bank/status ──────────────────────────────────────────
async function getStatus(req, res) {
    const { username } = req.user;
    const { data: u }  = getUserGameData(username);

    const now      = Date.now();
    const todayStr = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
    if (u.lastLimitDate !== todayStr) {
        u.dailyUsage    = 0;
        u.lastLimitDate = todayStr;
    }

    res.json({
        success:  true,
        balance:  Math.floor(u.balance  || 0),
        bank:     Math.floor(u.bank     || 0),
        debt:     Math.floor(u.debt     || 0),
        dailyUsed: u.dailyUsage || 0,
        dailyLimit: BANK_CONFIG.DAILY_LIMIT,
        hp:       u.hp       || 100,
        hunger:   u.hunger   || 100,
        energy:   u.energy   || 100,
    });
}

// ── POST /bank/deposit ────────────────────────────────────────
// body: { amount: number | 'all' }
async function deposit(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();

    if (isDead(u)) return res.status(400).json({ success: false, message: '💀 Kamu mati! Gunakan /rs untuk revive.' });

    const last = u.lastBank || 0;
    if (now - last < BANK_CONFIG.COOLDOWN_MS) {
        const sisa = Math.ceil((BANK_CONFIG.COOLDOWN_MS - (now - last)) / 60000);
        return res.status(400).json({ success: false, message: `⏳ Antrian penuh! Tunggu ${sisa} menit lagi.` });
    }

    const raw = req.body.amount;
    let amount = String(raw).toLowerCase() === 'all' ? Math.floor(u.balance || 0) : parseInt(raw);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: '❌ Nominal tidak valid.' });
    if ((u.balance || 0) < amount)    return res.status(400).json({ success: false, message: '❌ Uang di dompet kurang!' });

    u.balance   -= amount;
    u.bank       = (u.bank || 0) + amount;
    u.lastBank   = now;
    await saveU(username, u, source);

    res.json({ success: true, message: `✅ Deposit Rp${fmt(amount)} berhasil.`, bank: Math.floor(u.bank), balance: Math.floor(u.balance) });
}

// ── POST /bank/withdraw ───────────────────────────────────────
// body: { amount: number | 'all' }
async function withdraw(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();

    if (isDead(u)) return res.status(400).json({ success: false, message: '💀 Kamu mati! Gunakan /rs.' });

    const last = u.lastBank || 0;
    if (now - last < BANK_CONFIG.COOLDOWN_MS) {
        const sisa = Math.ceil((BANK_CONFIG.COOLDOWN_MS - (now - last)) / 60000);
        return res.status(400).json({ success: false, message: `⏳ Antrian penuh! Tunggu ${sisa} menit lagi.` });
    }

    const raw = req.body.amount;
    let amount = String(raw).toLowerCase() === 'all' ? Math.floor(u.bank || 0) : parseInt(raw);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: '❌ Nominal tidak valid.' });
    if ((u.bank || 0) < amount)       return res.status(400).json({ success: false, message: '❌ Saldo Bank kurang!' });

    u.bank    -= amount;
    u.balance  = (u.balance || 0) + amount;
    u.lastBank = now;
    await saveU(username, u, source);

    res.json({ success: true, message: `✅ Tarik Rp${fmt(amount)} berhasil.`, bank: Math.floor(u.bank), balance: Math.floor(u.balance) });
}

// ── POST /bank/transfer ───────────────────────────────────────
// body: { target: username, amount: number }
async function transfer(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    if (isDead(u)) return res.status(400).json({ success: false, message: '💀 Kamu mati!' });

    const { target, amount: rawAmt } = req.body;
    if (!target || target === username) return res.status(400).json({ success: false, message: '❌ Target tidak valid.' });

    const amount = parseInt(rawAmt);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: '❌ Nominal tidak valid.' });

    // Reset limit harian
    const todayStr = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
    if (u.lastLimitDate !== todayStr) { u.dailyUsage = 0; u.lastLimitDate = todayStr; }

    if ((u.dailyUsage || 0) + amount > BANK_CONFIG.DAILY_LIMIT) {
        const sisa = BANK_CONFIG.DAILY_LIMIT - (u.dailyUsage || 0);
        return res.status(400).json({ success: false, message: `❌ Limit habis! Sisa limit hari ini: Rp${fmt(sisa)}` });
    }

    const tax   = Math.floor(amount * BANK_CONFIG.TRANSFER_TAX);
    const total = amount + tax;

    if ((u.balance || 0) < total) return res.status(400).json({ success: false, message: `❌ Uang kurang! Butuh Rp${fmt(total)} (termasuk pajak 5%).` });

    // Cari target di data
    const allData = db.getData();
    let targetFound = false;

    // Cek webGameData dulu
    if (allData.webGameData?.[target]) {
        allData.webGameData[target].balance = (allData.webGameData[target].balance || 0) + amount;
        targetFound = true;
    } else {
        // Cek WA users
        const webUsers = db.getWebUsers() || {};
        const waId = Object.entries(webUsers).find(([k, v]) => k === target)?.[1]?.waId;
        if (waId && allData.users?.[waId]) {
            allData.users[waId].balance = (allData.users[waId].balance || 0) + amount;
            targetFound = true;
        }
    }

    if (!targetFound) return res.status(404).json({ success: false, message: `❌ User '${target}' tidak ditemukan.` });

    u.balance    -= total;
    u.dailyUsage  = (u.dailyUsage || 0) + amount;
    if (source === 'wa') {
        const waId = (db.getWebUsers() || {})[username]?.waId;
        if (waId) allData.users[waId] = u;
    } else {
        if (!allData.webGameData) allData.webGameData = {};
        allData.webGameData[username] = u;
    }
    await db.saveData(allData);

    res.json({
        success: true,
        message: `✅ Transfer Rp${fmt(amount)} ke ${target} berhasil. Pajak: Rp${fmt(tax)}.`,
        balance: Math.floor(u.balance),
        dailyUsed: u.dailyUsage,
    });
}

// ── POST /bank/pinjam ─────────────────────────────────────────
// body: { amount: number }
async function pinjam(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    if ((u.debt || 0) > 0)
        return res.status(400).json({ success: false, message: `❌ Lunasi utangmu dulu: Rp${fmt(u.debt)}` });

    const amount = parseInt(req.body.amount);
    if (isNaN(amount) || amount <= 0)  return res.status(400).json({ success: false, message: '❌ Nominal tidak valid.' });
    if (amount > BANK_CONFIG.MAX_LOAN) return res.status(400).json({ success: false, message: `❌ Maksimal pinjam Rp${fmt(BANK_CONFIG.MAX_LOAN)}.` });

    const totalDebt = Math.floor(amount * (1 + BANK_CONFIG.INTEREST_RATE));
    u.balance = (u.balance || 0) + amount;
    u.debt    = totalDebt;
    await saveU(username, u, source);

    res.json({
        success: true,
        message: `🤝 Pinjaman Rp${fmt(amount)} cair! Total utang: Rp${fmt(totalDebt)} (bunga 20%).`,
        balance: Math.floor(u.balance),
        debt: u.debt,
    });
}

// ── POST /bank/bayar ──────────────────────────────────────────
// body: { amount: number | 'all' }
async function bayar(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    if ((u.debt || 0) <= 0) return res.status(400).json({ success: false, message: '✅ Kamu tidak punya utang.' });

    const raw = req.body.amount;
    let amount = String(raw).toLowerCase() === 'all' ? (u.debt || 0) : parseInt(raw);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: '❌ Nominal tidak valid.' });
    if ((u.balance || 0) < amount)    return res.status(400).json({ success: false, message: '❌ Uang di dompet kurang!' });
    if (amount > u.debt) amount = u.debt;

    u.balance -= amount;
    u.debt     = Math.max(0, (u.debt || 0) - amount);
    await saveU(username, u, source);

    res.json({
        success: true,
        message: `💸 Bayar utang Rp${fmt(amount)}. Sisa utang: Rp${fmt(u.debt)}.`,
        balance: Math.floor(u.balance),
        debt: u.debt,
    });
}

// ── POST /bank/rob ────────────────────────────────────────────
// body: { target: username }
async function rob(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();

    if (isDead(u))           return res.status(400).json({ success: false, message: '💀 Kamu mati!' });
    if ((u.energy || 0) < 10) return res.status(400).json({ success: false, message: '⚠️ Energi kurang dari 10%. Tidur dulu!' });

    const lastRob = u.lastRob || 0;
    if (now - lastRob < BANK_CONFIG.ROB_COOLDOWN) {
        const sisa = Math.ceil((BANK_CONFIG.ROB_COOLDOWN - (now - lastRob)) / 60000);
        return res.status(400).json({ success: false, message: `👮 Polisi patroli! Tunggu ${sisa} menit lagi.` });
    }

    const { target } = req.body;
    if (!target || target === username) return res.status(400).json({ success: false, message: '❌ Target tidak valid.' });

    // Ambil data target
    const allData = db.getData();
    let targetData = allData.webGameData?.[target];
    if (!targetData) {
        const webUsers = db.getWebUsers() || {};
        const waId = Object.entries(webUsers).find(([k]) => k === target)?.[1]?.waId;
        if (waId) targetData = allData.users?.[waId];
    }
    if (!targetData) return res.status(404).json({ success: false, message: '❌ Target tidak ditemukan.' });

    const targetBalance = Math.floor(targetData.balance || 0);
    if (targetBalance < BANK_CONFIG.ROB_MIN_TARGET)
        return res.status(400).json({ success: false, message: `❌ Target terlalu miskin (Saldo < Rp${fmt(BANK_CONFIG.ROB_MIN_TARGET)}).` });

    u.energy  -= BANK_CONFIG.ROB_ENERGY_COST;
    u.lastRob  = now;

    if (Math.random() < BANK_CONFIG.ROB_SUCCESS) {
        const stolen = Math.floor(targetBalance * BANK_CONFIG.ROB_STEAL_PCT);
        targetData.balance  -= stolen;
        u.balance            = (u.balance || 0) + stolen;
        u.dailyIncome        = (u.dailyIncome || 0) + stolen;
        await saveU(username, u, source);
        await db.saveData(allData);
        return res.json({ success: true, won: true, amount: stolen, balance: Math.floor(u.balance), message: `🥷 Sukses! Dapat Rp${fmt(stolen)} dari ${target}.` });
    } else {
        const fine  = Math.floor((u.balance || 0) * BANK_CONFIG.ROB_FINE_PCT);
        u.balance   = Math.max(0, (u.balance || 0) - fine);
        u.hp        = Math.max(0, (u.hp || 100) - BANK_CONFIG.ROB_HP_COST);
        await saveU(username, u, source);
        return res.json({ success: true, won: false, amount: fine, balance: Math.floor(u.balance), message: `👮 Tertangkap! Denda Rp${fmt(fine)}, HP -${BANK_CONFIG.ROB_HP_COST}.` });
    }
}

module.exports = { getStatus, deposit, withdraw, transfer, pinjam, bayar, rob };