// ============================================================
//  routes/features.js — Semua Fitur: Farming, Mining, Games, dll
// ============================================================

const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  gameLimiter,
  externalApiLimiter,
} = require("../middleware/rateLimiter");

router.use(requireAuth);

// ── Farming ──────────────────────────────────────────────────
const farming = require("../controllers/features/farmingController");
router.get("/farming", farming.getStatus);
router.post("/farming/tanam", gameLimiter, farming.tanam);
router.post("/farming/panen", gameLimiter, farming.panen);
router.post("/farming/beli-mesin", farming.beliMesin);
router.post("/farming/proses", gameLimiter, farming.prosesTanaman);

// ── Ternak ───────────────────────────────────────────────────
const ternak = require("../controllers/features/ternakController");
router.get("/ternak", ternak.getStatus);
router.post("/ternak/beli", gameLimiter, ternak.beli);
router.post("/ternak/pakan", gameLimiter, ternak.pakan);
router.post("/ternak/jual", gameLimiter, ternak.jual);

// ── Mining ───────────────────────────────────────────────────
const mining = require("../controllers/features/miningController");
router.get("/mining", mining.getStatus);
router.post("/mining/beli-rig", mining.beliRig);
router.post("/mining/collect", gameLimiter, mining.collectIncome);

// ── Properti ─────────────────────────────────────────────────
const property = require("../controllers/features/propertyController");
router.get("/property", property.getStatus);
router.post("/property/beli", property.beli);
router.post("/property/collect", gameLimiter, property.collect);

// ── Games (Casino, Roulette, Slot, Coinflip) ─────────────────
const games = require("../controllers/features/gamesController");
router.get("/games", games.getStatus);
router.post("/games/casino", gameLimiter, games.casino);
router.post("/games/roulette", gameLimiter, games.roulette);
router.post("/games/slot", gameLimiter, games.slot);
router.post("/games/coinflip", gameLimiter, games.coinflip);
router.post("/games/dadu", gameLimiter, games.dadu);
router.post("/games/minigame-reward", gameLimiter, games.minigameReward);

// ── Trivia (WA Bot port) ─────────────────────────────────────
const trivia = require("../controllers/features/triviaController");
router.get("/trivia/status", trivia.status);
router.post("/trivia/start", gameLimiter, trivia.start);
router.post("/trivia/answer", gameLimiter, trivia.answer);
router.post("/trivia/hint", gameLimiter, trivia.hint);
router.post("/trivia/stop", gameLimiter, trivia.stop);
router.get("/trivia/leaderboard", trivia.leaderboard);

// ── Wordle (WA Bot port) ─────────────────────────────────────
const wordle = require("../controllers/features/wordleController");
router.get("/wordle/status", wordle.status);
router.post("/wordle/start", gameLimiter, wordle.start);
router.post("/wordle/guess", gameLimiter, wordle.guess);
router.post("/wordle/stop", gameLimiter, wordle.stop);
router.get("/wordle/stats", wordle.stats);

// ── AI (via OpenRouter) ──────────────────────────────────────
const aiCtrl = require("../controllers/features/aiController");
router.post("/ai/chat", externalApiLimiter, aiCtrl.chat);
router.post("/ai/imagine", externalApiLimiter, aiCtrl.imagine);

// ── TTS ──────────────────────────────────────────────────────
const ttsCtrl = require("../controllers/features/ttsController");
router.post("/tts", externalApiLimiter, ttsCtrl.generate);

// ── Tools ────────────────────────────────────────────────────
const toolsCtrl = require("../controllers/features/toolsController");
router.post("/tools/remove-bg", externalApiLimiter, toolsCtrl.removeBg);
router.get("/tools/cuaca", toolsCtrl.cuaca);
router.get("/tools/berita", toolsCtrl.berita);

// ── Jobs (Profesi & Karir) ───────────────────────────────────
const jobs = require("../controllers/features/jobsController");
router.get("/jobs", jobs.getStatus);
router.post("/jobs/apply", gameLimiter, jobs.apply);
router.post("/jobs/resign", gameLimiter, jobs.resign);
router.post("/jobs/work", gameLimiter, jobs.work);
router.post("/jobs/skill", gameLimiter, jobs.useSkill);

// ── Crypto (Real-time Market) ────────────────────────────────
const crypto = require("../controllers/features/cryptoController");
router.get("/crypto/market", externalApiLimiter, crypto.getMarket);
router.post("/crypto/buy", gameLimiter, crypto.buyCrypto);
router.post("/crypto/sell", gameLimiter, crypto.sellCrypto);
router.post("/crypto/margin", gameLimiter, crypto.marginCrypto);
router.post("/crypto/paydebt", gameLimiter, crypto.paydeptCrypto);
router.get("/crypto/portfolio", crypto.portofolioCrypto);

// ── Bank ──────────────────────────────────────────────────────
const bank = require('../controllers/features/bankController');
router.get('/bank', bank.getStatus);
router.post('/bank/deposit',  gameLimiter, bank.deposit);
router.post('/bank/withdraw', gameLimiter, bank.withdraw);
router.post('/bank/transfer', gameLimiter, bank.transfer);
router.post('/bank/pinjam',   gameLimiter, bank.pinjam);
router.post('/bank/bayar',    gameLimiter, bank.bayar);
router.post('/bank/rob',      gameLimiter, bank.rob);

// ── Stocks (Saham IDX) ───────────────────────────────────────
const stocks = require('../controllers/features/stocksController');
router.get('/stocks/market',     externalApiLimiter, stocks.getMarket);
router.get('/stocks/portfolio',  stocks.getPortfolio);
router.post('/stocks/buy',       gameLimiter, stocks.buyStock);
router.post('/stocks/sell',      gameLimiter, stocks.sellStock);
router.post('/stocks/dividen',   gameLimiter, stocks.claimDividen);

// ── Valas (Forex + Emas) ─────────────────────────────────────
const valas = require('../controllers/features/valasController');
router.get('/valas/market',     externalApiLimiter, valas.getMarket);
router.get('/valas/portfolio',  valas.getPortfolio);
router.post('/valas/buy',       gameLimiter, valas.buyValas);
router.post('/valas/sell',      gameLimiter, valas.sellValas);

// ── Battle (PvP + Duel) ──────────────────────────────────────
const battle = require('../controllers/features/battleController');
// Duel taruhan
router.get('/battle/duel/status',       battle.duelStatus);
router.post('/battle/duel/challenge',   gameLimiter, battle.duelChallenge);
router.post('/battle/duel/accept',      gameLimiter, battle.duelAccept);
router.post('/battle/duel/reject',      gameLimiter, battle.duelReject);
// PvP turn-based
router.get('/battle/pvp/status',        battle.pvpStatus);
router.post('/battle/pvp/challenge',    gameLimiter, battle.pvpChallenge);
router.post('/battle/pvp/accept',       gameLimiter, battle.pvpAccept);
router.post('/battle/pvp/action',       gameLimiter, battle.pvpAction);
router.post('/battle/pvp/surrender',    gameLimiter, battle.pvpSurrender);

// ── Pabrik (Factory) ─────────────────────────────────────────
const pabrik = require('../controllers/features/pabrikController');
router.get('/pabrik',               pabrik.getStatus);
router.post('/pabrik/buy-machine',  pabrik.buyMachine);
router.post('/pabrik/craft',        gameLimiter, pabrik.craft);
router.post('/pabrik/sell',         gameLimiter, pabrik.sellProduct);
router.post('/pabrik/add-inventory',pabrik.addToInventory);

// ── Reminder ─────────────────────────────────────────────────
const reminder = require('../controllers/features/reminderController');
router.get('/reminder', reminder.getReminders);
router.post('/reminder/create', reminder.createReminder);
router.delete('/reminder/:id', reminder.deleteReminder);
router.post('/reminder/clear', reminder.clearReminders);

// ── Zodiak ───────────────────────────────────────────────────
const zodiak = require('../controllers/features/zodiakController');
router.post('/zodiak/horoskop', zodiak.getHoroskop);

// ── Shortlink ─────────────────────────────────────────────────
const shortlink = require('../controllers/features/shortlinkController');
router.post('/tools/shorten', shortlink.shorten);
router.post('/tools/unshorten', shortlink.unshorten);

module.exports = router;
