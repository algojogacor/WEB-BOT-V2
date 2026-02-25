// ============================================================
//  controllers/features/stocksController.js
//  Saham IDX Real-time (Yahoo Finance)
// ============================================================

const axios = require('axios');
const db    = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');

const STOCK_MAP = {
    BBCA: 'BBCA.JK', BBRI: 'BBRI.JK', BMRI: 'BMRI.JK',
    TLKM: 'TLKM.JK', ASII: 'ASII.JK', UNTR: 'UNTR.JK',
    GOTO: 'GOTO.JK', ANTM: 'ANTM.JK', ADRO: 'ADRO.JK', BREN: 'BREN.JK',
};
const CACHE_MS = 60_000; // Update tiap 1 menit

async function fetchMarketPrices() {
    const allData = db.getData();
    if (!allData.stockMarket) allData.stockMarket = { prices: {}, lastUpdate: 0 };
    const market = allData.stockMarket;
    const now    = Date.now();

    if (now - market.lastUpdate < CACHE_MS) return market;

    const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' };
    for (const [ticker, symbol] of Object.entries(STOCK_MAP)) {
        try {
            const { data } = await axios.get(
                `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
                { headers, timeout: 5000 }
            );
            const meta = data.chart.result[0].meta;
            if (meta) {
                const cp  = meta.regularMarketPrice;
                const pc  = meta.chartPreviousClose;
                market.prices[ticker] = {
                    price:  cp,
                    change: ((cp - pc) / pc) * 100 || 0,
                };
            }
        } catch (e) { /* pakai harga lama */ }
    }
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

// ── GET /stocks/market ────────────────────────────────────────
async function getMarket(req, res) {
    try {
        const market = await fetchMarketPrices();
        const list   = Object.entries(STOCK_MAP).map(([ticker]) => ({
            ticker,
            price:  market.prices[ticker]?.price  || 0,
            change: market.prices[ticker]?.change || 0,
        }));
        res.json({ success: true, list, lastUpdate: market.lastUpdate });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data pasar.' });
    }
}

// ── GET /stocks/portfolio ─────────────────────────────────────
async function getPortfolio(req, res) {
    const { username } = req.user;
    const { data: u }  = getUserGameData(username);
    const market       = db.getData().stockMarket || { prices: {} };

    const list = Object.entries(u.stockPortfolio || {})
        .filter(([, d]) => d.qty > 0)
        .map(([ticker, d]) => {
            const cur  = market.prices[ticker]?.price || d.avg;
            const gross= cur * d.qty;
            const net  = gross - gross * 0.003;
            const gain = net - d.avg * d.qty;
            return { ticker, qty: d.qty, avg: d.avg, currentPrice: cur, gain: Math.floor(gain) };
        });

    res.json({ success: true, portfolio: list, balance: Math.floor(u.balance || 0) });
}

// ── POST /stocks/buy ──────────────────────────────────────────
// body: { ticker, qty: number | 'all' }
async function buyStock(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    const ticker  = String(req.body.ticker || '').toUpperCase();
    if (!STOCK_MAP[ticker]) return res.status(400).json({ success: false, message: `❌ Saham '${ticker}' tidak ada. List: ${Object.keys(STOCK_MAP).join(', ')}` });

    const market = await fetchMarketPrices();
    const price  = market.prices[ticker]?.price;
    if (!price) return res.status(400).json({ success: false, message: '⏳ Data pasar belum siap, coba 5 detik lagi.' });

    let qty = req.body.qty;
    if (String(qty).toLowerCase() === 'all' || String(qty).toLowerCase() === 'max') {
        qty = Math.floor((u.balance || 0) / (price * 1.003));
    } else {
        qty = parseInt(qty);
    }
    if (isNaN(qty) || qty < 1) return res.status(400).json({ success: false, message: '❌ Jumlah lembar tidak valid.' });

    const rawCost = price * qty;
    const fee     = Math.floor(rawCost * 0.0015);
    const total   = rawCost + fee;

    if ((u.balance || 0) < total) return res.status(400).json({ success: false, message: `❌ Saldo kurang! Butuh Rp${fmt(total)}` });

    if (!u.stockPortfolio) u.stockPortfolio = {};
    const p = u.stockPortfolio[ticker] || { qty: 0, avg: 0 };
    p.avg   = Math.floor((p.qty * p.avg + rawCost) / (p.qty + qty));
    p.qty  += qty;
    u.stockPortfolio[ticker] = p;
    u.balance -= total;
    await saveU(username, u, source);

    res.json({ success: true, message: `✅ Beli ${fmt(qty)} lembar ${ticker} @ Rp${fmt(price)}. Fee: Rp${fmt(fee)}.`, balance: Math.floor(u.balance) });
}

// ── POST /stocks/sell ─────────────────────────────────────────
// body: { ticker, qty: number | 'all' }
async function sellStock(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    const ticker = String(req.body.ticker || '').toUpperCase();
    const p      = u.stockPortfolio?.[ticker];
    if (!p || p.qty <= 0) return res.status(400).json({ success: false, message: `❌ Kamu tidak punya saham ${ticker}.` });

    const market = await fetchMarketPrices();
    const price  = market.prices[ticker]?.price || p.avg;

    let qty = req.body.qty;
    if (String(qty).toLowerCase() === 'all') qty = p.qty;
    else qty = parseInt(qty);
    if (isNaN(qty) || qty < 1 || qty > p.qty) return res.status(400).json({ success: false, message: `❌ Jumlah tidak valid (maks ${p.qty}).` });

    const gross = price * qty;
    const tax   = Math.floor(gross * 0.003);
    const net   = gross - tax;
    const pl    = net - p.avg * qty;

    p.qty -= qty;
    if (p.qty === 0) delete u.stockPortfolio[ticker];
    u.balance = (u.balance || 0) + net;
    u.dailyIncome = (u.dailyIncome || 0) + net;
    await saveU(username, u, source);

    res.json({
        success: true,
        message: `${pl >= 0 ? '📈 CUAN' : '📉 BONCOS'} Jual ${fmt(qty)} ${ticker} @ Rp${fmt(price)}. Net: Rp${fmt(net)}. P/L: ${pl >= 0 ? '+' : ''}Rp${fmt(pl)}.`,
        balance: Math.floor(u.balance),
    });
}

// ── POST /stocks/dividen ──────────────────────────────────────
async function claimDividen(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const now    = Date.now();
    const COOLDOWN = 3600_000; // 1 jam

    if (now - (u.lastDividend || 0) < COOLDOWN) {
        const sisa = Math.ceil((COOLDOWN - (now - (u.lastDividend || 0))) / 60000);
        return res.status(400).json({ success: false, message: `⏳ Tunggu ${sisa} menit untuk klaim dividen.` });
    }

    const market = db.getData().stockMarket || { prices: {} };
    let total = 0;
    for (const [ticker, data] of Object.entries(u.stockPortfolio || {})) {
        if (data.qty > 0 && market.prices[ticker]?.price) {
            total += market.prices[ticker].price * data.qty;
        }
    }
    if (total === 0) return res.status(400).json({ success: false, message: '❌ Kamu tidak punya saham.' });

    const amount = Math.floor(total * 0.01);
    u.balance    = (u.balance || 0) + amount;
    u.lastDividend = now;
    await saveU(username, u, source);

    res.json({ success: true, message: `💸 Dividen 1% cair! Total aset: Rp${fmt(total)} → Dividen: Rp${fmt(amount)}.`, balance: Math.floor(u.balance) });
}

module.exports = { getMarket, getPortfolio, buyStock, sellStock, claimDividen };