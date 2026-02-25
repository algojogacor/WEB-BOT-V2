// ============================================================
//  controllers/features/ternakController.js
// ============================================================

const db = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');
const { ANIMAL_PRICES, ANIMAL_GROW_TIME_MS, ANIMAL_SELL_PRICE } = require('../../utils/constants');

const MAX_ANIMAL_SLOTS = 8;

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

async function getStatus(req, res) {
    const { username } = req.user;
    const { data: u }  = getUserGameData(username);
    
    // Normalize legacy WA: readyAt in seconds -> ms
    let animals = (u.animals || []).map(a => {
        const a2 = { ...a };
        // Pastikan qty selalu memiliki angka fallback jika undenified
        a2.qty = parseInt(a.qty) || parseInt(a.jumlah) || 1;
        if (a2.readyAt != null && a2.readyAt < 1e12) a2.readyAt = a2.readyAt * 1000;
        return a2;
    });
    
    const balance = Math.floor(u.balance || 0);
    const ready = animals.filter(a => Date.now() >= (a.readyAt || 0)).length;
    res.json({ success: true, animals, balance, ready });
}

async function beli(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const { animal, qty = 1 } = req.body;
    
    // 1. Validasi angka Qty agar tidak bisa di-exploit dengan angka minus atau huruf
    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ success: false, message: '❌ Jumlah tidak valid.' });
    }

    const price = ANIMAL_PRICES[animal];
    if (!price) return res.status(400).json({ success: false, message: `❌ Hewan tidak valid. Pilih: ${Object.keys(ANIMAL_PRICES).join(', ')}` });
    
    const total = price * parsedQty;
    if ((u.balance || 0) < total) return res.status(400).json({ success: false, message: `❌ Butuh Rp${fmt(total)}.` });
    
    if (!u.animals) u.animals = [];
    
    // 2. Perbaikan perhitungan slot (menghitung total qty, bukan panjang array)
    const currentTotalAnimals = u.animals.reduce((sum, a) => sum + (parseInt(a.qty) || parseInt(a.jumlah) || 1), 0);
    if (currentTotalAnimals + parsedQty > MAX_ANIMAL_SLOTS) {
        return res.status(400).json({ 
            success: false, 
            message: `❌ Maksimal ${MAX_ANIMAL_SLOTS} slot kandang. Sisa slot kamu: ${MAX_ANIMAL_SLOTS - currentTotalAnimals}.` 
        });
    }

    u.balance -= total;
    u.animals.push({ 
        animal, 
        qty: parsedQty, 
        boughtAt: Date.now(), 
        readyAt: Date.now() + ANIMAL_GROW_TIME_MS[animal] 
    });
    
    await saveU(username, u, source);
    res.json({ success: true, message: `🐄 Beli ${parsedQty}x ${animal} berhasil!` });
}

async function pakan(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();
    if (!u.animals?.length) return res.status(400).json({ success: false, message: '❌ Tidak ada hewan.' });
    
    u.animals.forEach(a => { 
        a.readyAt = Math.max(now, (a.readyAt || now) - 3600_000); 
    });
    
    await saveU(username, u, source);
    res.json({ success: true, message: '🍖 Hewan diberi makan! Waktu siap dipercepat 1 jam.' });
}

async function jual(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const now = Date.now();
    if (!u.animals?.length) return res.status(400).json({ success: false, message: '❌ Tidak ada hewan.' });
    
    const ready = u.animals.filter(a => now >= a.readyAt);
    if (!ready.length) return res.status(400).json({ success: false, message: '⏳ Belum ada hewan yang siap jual.' });
    
    let income = 0;
    ready.forEach(a => { 
        // 3. Pastikan pengali adalah qty asli, jika tidak ada set 1
        const aQty = parseInt(a.qty) || parseInt(a.jumlah) || 1;
        income += (ANIMAL_SELL_PRICE[a.animal] || 0) * aQty; 
    });
    
    u.animals  = u.animals.filter(a => now < a.readyAt);
    u.balance  = (u.balance || 0) + income;
    
    await saveU(username, u, source);
    res.json({ success: true, message: `🤑 Jual ternak! +Rp${fmt(income)}`, income });
}

module.exports = { getStatus, beli, pakan, jual };