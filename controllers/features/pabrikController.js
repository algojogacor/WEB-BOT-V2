// ============================================================
//  controllers/features/pabrikController.js
//  Pabrik Pengolahan (Craft dari hasil Ternak)
// ============================================================

const db  = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');

const MACHINES = {
    ayam_1:    { name: '🐔 Pemotong Unggas T1',  cost: 15_000_000,    cooldown: 15*60*1000  },
    ayam_2:    { name: '🍗 Dapur Nugget T2',      cost: 30_000_000,    cooldown: 20*60*1000  },
    gurame_1:  { name: '🐟 Fillet Station T1',    cost: 25_000_000,    cooldown: 30*60*1000  },
    gurame_2:  { name: '🍱 Penggorengan Ikan T2', cost: 50_000_000,    cooldown: 40*60*1000  },
    kambing_1: { name: '🐐 Penggiling Daging T1', cost: 50_000_000,    cooldown: 60*60*1000  },
    kambing_2: { name: '🌯 Kebab Rotisserie T2',  cost: 100_000_000,   cooldown: 90*60*1000  },
    sapi_1:    { name: '🐄 RPH Modern T1',         cost: 100_000_000,   cooldown: 2*60*60*1000},
    sapi_2:    { name: '🥩 Steak House T2',        cost: 200_000_000,   cooldown: 3*60*60*1000},
    kuda_1:    { name: '🐎 Pengolahan Kuda T1',   cost: 250_000_000,   cooldown: 4*60*60*1000},
    unta_1:    { name: '🐫 Ekstraktor Susu T1',   cost: 500_000_000,   cooldown: 6*60*60*1000},
};

const RECIPES = {
    ayam:    { machine: 'ayam_1', input: 'ayam', output: 'nugget', outputName: '🍗 Chicken Nugget', price: 100_000 },
    gurame:  { machine: 'gurame_1', input: 'gurame', output: 'fillet', outputName: '🍣 Fillet Ikan', price: 300_000 },
    kambing: { machine: 'kambing_1', input: 'kambing', output: 'giling', outputName: '🥩 Daging Giling', price: 200_000 },
    sapi:    { machine: 'sapi_1', input: 'sapi', output: 'wagyu', outputName: '🥩 Wagyu Cut', price: 90_000 },
    kuda:    { machine: 'kuda_1', input: 'kuda', output: 'sosis', outputName: '🌭 Sosis Kuda', price: 350_000 },
    unta:    { machine: 'unta_1', input: 'unta', output: 'susu', outputName: '🥛 Susu Unta', price: 400_000 },
    nugget:  { machine: 'ayam_2', input: 'nugget', output: 'burger', outputName: '🍔 Burger Ayam', batch: 5, price: 180_000 },
    fillet:  { machine: 'gurame_2', input: 'fillet', output: 'fishchips', outputName: '🍱 Fish & Chips', batch: 5, price: 550_000 },
    giling:  { machine: 'kambing_2', input: 'giling', output: 'kebab', outputName: '🌯 Kebab Turki', batch: 10, price: 350_000 },
    wagyu:   { machine: 'sapi_2', input: 'wagyu', output: 'steak', outputName: '🍲 Steak House', batch: 10, price: 180_000 },
};

const OPR_COST = 1_000_000; // Biaya listrik per craft

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

// ── GET /pabrik/status ────────────────────────────────────────
async function getStatus(req, res) {
    const { username } = req.user;
    const { data: u }  = getUserGameData(username);
    if (!u.pabrik)          u.pabrik = {};
if (!u.pabrik.machines) u.pabrik.machines = {};
if (!u.pabrik.inventory) u.pabrik.inventory = {};

    const now = Date.now();
    const machineStatus = Object.entries(u.pabrik.machines || {}).map(([id, m]) => ({
        id,
        name:   MACHINES[id]?.name || id,
        ready:  now - m.lastUsed >= MACHINES[id]?.cooldown,
        cooldownLeft: Math.max(0, (MACHINES[id]?.cooldown || 0) - (now - m.lastUsed)),
    }));

    res.json({
        success: true,
        balance:  Math.floor(u.balance || 0),
        machines: machineStatus,
        inventory: u.pabrik.inventory || {},
        allMachines: Object.entries(MACHINES).map(([id, m]) => ({
            id, name: m.name, cost: m.cost,
            owned: !!(u.pabrik.machines?.[id]),
        })),
        recipes: Object.entries(RECIPES).map(([inputCode, r]) => ({
            inputCode,
            machine: r.machine,
            outputName: r.outputName,
            price: r.price,
            batch: r.batch || 1,
        })),
    });
}

// ── POST /pabrik/buy-machine ──────────────────────────────────
// body: { machineId }
async function buyMachine(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const { machineId } = req.body;

    const machine = MACHINES[machineId];
    if (!machine) return res.status(400).json({ success: false, message: '❌ ID mesin tidak valid.' });

if (!u.pabrik)          u.pabrik = {};
if (!u.pabrik.machines) u.pabrik.machines = {};
if (!u.pabrik.inventory) u.pabrik.inventory = {};
    if (u.pabrik.machines[machineId]) return res.status(400).json({ success: false, message: '❌ Mesin sudah dimiliki.' });
    if ((u.balance || 0) < machine.cost) return res.status(400).json({ success: false, message: `❌ Saldo kurang! Butuh Rp${fmt(machine.cost)}.` });

    u.balance -= machine.cost;
    u.pabrik.machines[machineId] = { lastUsed: 0 };
    await saveU(username, u, source);

    res.json({ success: true, message: `✅ Beli ${machine.name} berhasil!`, balance: Math.floor(u.balance) });
}

// ── POST /pabrik/craft ────────────────────────────────────────
// body: { inputCode, qty }
async function craft(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const { inputCode } = req.body;
    const qty = parseInt(req.body.qty) || 1;

    const recipe = RECIPES[inputCode];
    if (!recipe) return res.status(400).json({ success: false, message: '❌ Resep tidak ditemukan.' });

    if (!u.pabrik)          u.pabrik = {};
if (!u.pabrik.machines) u.pabrik.machines = {};
if (!u.pabrik.inventory) u.pabrik.inventory = {};
    if (!u.pabrik.machines[recipe.machine]) return res.status(400).json({ success: false, message: `❌ Kamu belum punya mesin ${MACHINES[recipe.machine]?.name}.` });

    const now = Date.now();
    const m   = u.pabrik.machines[recipe.machine];
    const cd  = MACHINES[recipe.machine].cooldown;
    if (now - m.lastUsed < cd) {
        const sisa = Math.ceil((cd - (now - m.lastUsed)) / 60000);
        return res.status(400).json({ success: false, message: `⏳ Mesin perlu waktu ${sisa} menit lagi.` });
    }

    const inv      = u.pabrik.inventory;
    const inputQty = inv[inputCode] || 0;
    const batch    = recipe.batch || 1;
    const needed   = batch * qty;

    if (inputQty < needed) return res.status(400).json({ success: false, message: `❌ Stok ${inputCode} kurang. Punya ${inputQty}, butuh ${needed}.` });
    if ((u.balance || 0) < OPR_COST) return res.status(400).json({ success: false, message: `❌ Saldo kurang untuk biaya operasional Rp${fmt(OPR_COST)}.` });

    inv[inputCode]     -= needed;
    inv[recipe.output]  = (inv[recipe.output] || 0) + qty;
    u.balance          -= OPR_COST;
    m.lastUsed          = now;
    await saveU(username, u, source);

    res.json({ success: true, message: `⚙️ Craft ${qty}x ${recipe.outputName} berhasil! Biaya operasional: Rp${fmt(OPR_COST)}.`, inventory: inv, balance: Math.floor(u.balance) });
}

// ── POST /pabrik/sell ─────────────────────────────────────────
// body: { outputCode, qty }
async function sellProduct(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const { outputCode } = req.body;
    const qty = parseInt(req.body.qty) || 1;

    if (!u.pabrik?.inventory) return res.status(400).json({ success: false, message: '❌ Inventaris kosong.' });

    const inv   = u.pabrik.inventory;
    const stock = inv[outputCode] || 0;
    if (stock < qty) return res.status(400).json({ success: false, message: `❌ Stok kurang. Punya ${stock}.` });

    const recipe = Object.values(RECIPES).find(r => r.output === outputCode);
    if (!recipe) return res.status(400).json({ success: false, message: '❌ Produk tidak dikenal.' });

    const hour    = new Date().getHours();
    const factor  = Math.cos(hour * 1.5) * (recipe.price * 0.15);
    const price   = Math.floor(recipe.price + factor);
    const tax     = Math.floor(price * qty * 0.05);
    const receive = price * qty - tax;

    inv[outputCode] -= qty;
    u.balance        = (u.balance || 0) + receive;
    u.dailyIncome    = (u.dailyIncome || 0) + receive;
    await saveU(username, u, source);

    res.json({ success: true, message: `💰 Jual ${qty}x ${recipe.outputName} @ Rp${fmt(price)}. Diterima: Rp${fmt(receive)} (pajak 5%).`, balance: Math.floor(u.balance) });
}

// ── POST /pabrik/add-inventory ────────────────────────────────
// Dipakai oleh controller ternak ketika hewan dijual ke pabrik
// body: { itemCode, qty }
async function addToInventory(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const { itemCode, qty: rawQty } = req.body;
    const qty = parseInt(rawQty);

    if (!itemCode || isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: '❌ Data tidak valid.' });

    if (!u.pabrik)          u.pabrik = {};
if (!u.pabrik.machines) u.pabrik.machines = {};
if (!u.pabrik.inventory) u.pabrik.inventory = {};
    u.pabrik.inventory[itemCode] = (u.pabrik.inventory[itemCode] || 0) + qty;
    await saveU(username, u, source);

    res.json({ success: true, message: `📦 +${qty} ${itemCode} ke inventaris pabrik.`, inventory: u.pabrik.inventory });
}

module.exports = { getStatus, buyMachine, craft, sellProduct, addToInventory };