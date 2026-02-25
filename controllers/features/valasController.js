// ============================================================
//  controllers/features/valasController.js
//  Forex (Valas) + Emas Real-time
// ============================================================

const axios = require('axios');
const db    = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');

const CURRENCIES = ['usd', 'eur', 'sgd', 'myr', 'jpy', 'gbp', 'cny', 'sar', 'aud', 'emas'];
const DEFAULT_PRICES = {
    usd: 16200, eur: 17500, sgd: 12000, myr: 3400, jpy: 110,
    gbp: 20000, cny: 2200,  sar: 4300,  aud: 10500, emas: 1350000,
};
const FLAGS = {
    usd: '🇺🇸', eur: '🇪🇺', sgd: '🇸🇬', myr: '🇲🇾', jpy: '🇯🇵',
    gbp: '🇬🇧', cny: '🇨🇳', sar: '🇸🇦', aud: '🇦🇺', emas: '🥇',
};
const UPDATE_MS = 15 * 60 * 1000; // Update tiap 15 menit

async function fetchForexPrices() {
    const allData = db.getData();
    if (!allData.forexMarket) allData.forexMarket = { prices: { ...DEFAULT_PRICES }, lastUpdate: 0 };
    const market = allData.forexMarket;
    const now    = Date.now();

    if (now - market.lastUpdate < UPDATE_MS) return market;

    try {
        const { data } = await axios.get('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
        const rates = data.rates;
        const idr   = rates.IDR;
        market.prices.usd = Math.round(idr);
        market.prices.eur = Math.round(idr / rates.EUR);
        market.prices.sgd = Math.round(idr / rates.SGD);
        market.prices.myr = Math.round(idr / rates.MYR);
        market.prices.jpy = Math.round(idr / rates.JPY);
        market.prices.gbp = Math.round(idr / rates.GBP);
        market.prices.cny = Math.round(idr / rates.CNY);
        market.prices.sar = Math.round(idr / rates.SAR);
        market.prices.aud = Math.round(idr / rates.AUD);
    } catch (e) { /* pakai harga lama */ }

    try {
        const { data: gd } = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=idr',
            { timeout: 8000 }
        );
        if (gd['pax-gold']?.idr) {
            market.prices.emas = Math.floor(gd['pax-gold'].idr / 31.1035);
        }
    } catch (e) { /* pakai harga lama */ }

    market.lastUpdate = now;
    await db.saveData(allData);
    return market;
}

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

// ── GET /valas/market ─────────────────────────────────────────
async function getMarket(req, res) {
    try {
        const market = await fetchForexPrices();
        const list   = CURRENCIES.map(c => ({
            code:  c,
            flag:  FLAGS[c],
            price: market.prices[c] || DEFAULT_PRICES[c],
        }));
        res.json({ success: true, list, lastUpdate: market.lastUpdate });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data valas.' });
    }
}

// ── GET /valas/portfolio ──────────────────────────────────────
async function getPortfolio(req, res) {
    const { username } = req.user;
    const { data: u }  = getUserGameData(username);
    const market       = db.getData().forexMarket || { prices: DEFAULT_PRICES };

    const list = CURRENCIES
        .filter(c => (u.forex?.[c] || 0) > 0)
        .map(c => ({
            code:  c,
            flag:  FLAGS[c],
            qty:   u.forex[c],
            price: market.prices[c] || DEFAULT_PRICES[c],
            value: Math.floor(u.forex[c] * (market.prices[c] || DEFAULT_PRICES[c])),
        }));

    const total = list.reduce((s, i) => s + i.value, 0);
    res.json({ success: true, portfolio: list, total, balance: Math.floor(u.balance || 0) });
}

// ── POST /valas/buy ───────────────────────────────────────────
// body: { code: 'usd', qty: number }
async function buyValas(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    const code = String(req.body.code || '').toLowerCase();
    if (!CURRENCIES.includes(code)) return res.status(400).json({ success: false, message: `❌ Kode tidak valid. Pilih: ${CURRENCIES.join(', ')}` });

    const qty = parseFloat(req.body.qty);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: '❌ Jumlah tidak valid.' });

    const market = await fetchForexPrices();
    const price  = market.prices[code];
    const total  = Math.floor(price * qty);

    if ((u.balance || 0) < total) return res.status(400).json({ success: false, message: `❌ Saldo kurang! Butuh Rp${fmt(total)}.` });

    u.balance -= total;
    if (!u.forex) u.forex = {};
    u.forex[code] = (u.forex[code] || 0) + qty;
    await saveU(username, u, source);

    const unit = code === 'emas' ? 'gram' : code === 'jpy' ? 'yen' : 'lembar';
    res.json({ success: true, message: `✅ Beli ${qty} ${unit} ${code.toUpperCase()} @ Rp${fmt(price)}. Total: Rp${fmt(total)}.`, balance: Math.floor(u.balance) });
}

// ── POST /valas/sell ──────────────────────────────────────────
// body: { code: 'usd', qty: number | 'all' }
async function sellValas(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    const code = String(req.body.code || '').toLowerCase();
    if (!CURRENCIES.includes(code)) return res.status(400).json({ success: false, message: '❌ Kode tidak valid.' });
    if (!(u.forex?.[code] > 0)) return res.status(400).json({ success: false, message: `❌ Kamu tidak punya ${code.toUpperCase()}.` });

    let qty = req.body.qty;
    if (String(qty).toLowerCase() === 'all') qty = u.forex[code];
    else qty = parseFloat(qty);

    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: '❌ Jumlah tidak valid.' });
    if (u.forex[code] < qty)    return res.status(400).json({ success: false, message: `❌ Stok kurang! Punya ${fmt(u.forex[code])}.` });

    const market  = await fetchForexPrices();
    const price   = market.prices[code];
    const receive = Math.floor(price * qty);

    u.forex[code] -= qty;
    u.balance      = (u.balance || 0) + receive;
    u.dailyIncome  = (u.dailyIncome || 0) + receive;
    await saveU(username, u, source);

    const unit = code === 'emas' ? 'gram' : code === 'jpy' ? 'yen' : 'lembar';
    res.json({ success: true, message: `📉 Jual ${qty} ${unit} ${code.toUpperCase()} @ Rp${fmt(price)}. Diterima: Rp${fmt(receive)}.`, balance: Math.floor(u.balance) });
}

module.exports = { getMarket, getPortfolio, buyValas, sellValas };