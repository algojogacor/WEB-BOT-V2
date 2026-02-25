// ============================================================
//  controllers/features/battleController.js
//  PvP Battle (turn-based) + Duel Taruhan (instant)
// ============================================================

const db  = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');

// ── State in-memory ───────────────────────────────────────────
// activeBattles: { battleId: { ... } }
// activeDuels:   { challengerUsername: { target, amount, ts } }
const activeBattles = {};
const activeDuels   = {};

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

// ════════════════════════════════════════════════════════
//  DUEL TARUHAN
// ════════════════════════════════════════════════════════

// POST /battle/duel/challenge — body: { target, amount }
async function duelChallenge(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);
    const { target, amount: rawAmt } = req.body;

    if (!target || target === username)
        return res.status(400).json({ success: false, message: '❌ Target tidak valid.' });

    const amount = parseInt(rawAmt);
    if (isNaN(amount) || amount < 1000)
        return res.status(400).json({ success: false, message: '❌ Minimal taruhan Rp1.000.' });
    if ((u.balance || 0) < amount)
        return res.status(400).json({ success: false, message: `❌ Saldo kurang. Saldo: Rp${fmt(u.balance)}.` });
    if (activeDuels[username])
        return res.status(400).json({ success: false, message: '❌ Kamu masih punya tantangan pending.' });

    // Cek target ada
    const { data: targetData } = getUserGameData(target);
    if (!targetData) return res.status(404).json({ success: false, message: '❌ Target tidak ditemukan.' });
    if ((targetData.balance || 0) < amount)
        return res.status(400).json({ success: false, message: '❌ Target tidak punya cukup saldo.' });

    activeDuels[username] = { challenger: username, target, amount, ts: Date.now() };

    res.json({
        success: true,
        message: `🔫 Tantangan dikirim ke ${target}! Taruhan: Rp${fmt(amount)}. Tunggu diterima/ditolak.`,
    });
}

// POST /battle/duel/accept — (target menerima)
async function duelAccept(req, res) {
    const { username } = req.user;
    const { source, data: u } = getUserGameData(username);

    const challengerName = Object.keys(activeDuels).find(k => activeDuels[k].target === username);
    if (!challengerName)
        return res.status(400).json({ success: false, message: '❌ Tidak ada tantangan untukmu.' });

    const duel   = activeDuels[challengerName];
    const amount = duel.amount;

    // Validasi ulang saldo
    const { source: cs, data: cData } = getUserGameData(challengerName);
    if ((cData.balance || 0) < amount) {
        delete activeDuels[challengerName];
        return res.status(400).json({ success: false, message: '❌ Penantang saldonya kurang. Duel batal.' });
    }
    if ((u.balance || 0) < amount)
        return res.status(400).json({ success: false, message: '❌ Saldomu kurang untuk menerima taruhan ini.' });

    const tax       = Math.floor(amount * 0.10);
    const winAmount = amount - tax;
    const isChallengerWin = Math.random() < 0.5;
    delete activeDuels[challengerName];

    if (isChallengerWin) {
        cData.balance = (cData.balance || 0) + winAmount;
        u.balance     = (u.balance || 0) - amount;
        await saveU(challengerName, cData, cs);
        await saveU(username, u, source);
        return res.json({
            success: true,
            winner: challengerName,
            loser:  username,
            amount: winAmount,
            tax,
            message: `🔫 DORR! ${challengerName} MENANG! Dapat Rp${fmt(winAmount)} dari ${username}. Pajak: Rp${fmt(tax)}.`,
        });
    } else {
        u.balance     = (u.balance || 0) + winAmount;
        cData.balance = (cData.balance || 0) - amount;
        await saveU(username, u, source);
        await saveU(challengerName, cData, cs);
        return res.json({
            success: true,
            winner: username,
            loser:  challengerName,
            amount: winAmount,
            tax,
            message: `🔫 DORR! ${username} MENANG! Dapat Rp${fmt(winAmount)} dari ${challengerName}. Pajak: Rp${fmt(tax)}.`,
        });
    }
}

// POST /battle/duel/reject
async function duelReject(req, res) {
    const { username } = req.user;

    // Tolak sebagai target
    const challengerName = Object.keys(activeDuels).find(k => activeDuels[k].target === username);
    if (challengerName) {
        delete activeDuels[challengerName];
        return res.json({ success: true, message: `🏳️ Tantangan dari ${challengerName} ditolak.` });
    }
    // Batalkan sebagai penantang
    if (activeDuels[username]) {
        delete activeDuels[username];
        return res.json({ success: true, message: '🏳️ Tantangan dibatalkan.' });
    }
    res.status(400).json({ success: false, message: '❌ Tidak ada duel aktif.' });
}

// GET /battle/duel/status — cek apakah ada tantangan masuk
async function duelStatus(req, res) {
    const { username } = req.user;
    const incoming = Object.values(activeDuels).find(d => d.target === username);
    const outgoing = activeDuels[username];
    res.json({ success: true, incoming: incoming || null, outgoing: outgoing || null });
}

// ════════════════════════════════════════════════════════
//  PVP BATTLE (Turn-based)
// ════════════════════════════════════════════════════════

// POST /battle/pvp/challenge — body: { target }
async function pvpChallenge(req, res) {
    const { username } = req.user;
    const { data: u }  = getUserGameData(username);
    const { target }   = req.body;

    if (!target || target === username)
        return res.status(400).json({ success: false, message: '❌ Target tidak valid.' });

    // Cek target ada
    const { data: tData } = getUserGameData(target);
    if (!tData) return res.status(404).json({ success: false, message: '❌ Target tidak ditemukan.' });

    // Cek sudah ada battle
    const existingId = Object.keys(activeBattles).find(id => {
        const b = activeBattles[id];
        return b.p1 === username || b.p2 === username || b.p1 === target || b.p2 === target;
    });
    if (existingId) return res.status(400).json({ success: false, message: '❌ Salah satu pemain sedang dalam battle.' });

    const battleId = `${username}_${target}_${Date.now()}`;
    activeBattles[battleId] = {
        p1:       username,
        p2:       target,
        p1_hp:    100 + ((u.level || 1) * 10),
        p2_hp:    100 + ((tData.level || 1) * 10),
        p1_maxhp: 100 + ((u.level || 1) * 10),
        p2_maxhp: 100 + ((tData.level || 1) * 10),
        turn:     username,
        status:   'waiting',
        log:      'Pertarungan dimulai!',
        ts:       Date.now(),
    };

    res.json({
        success: true, battleId,
        message: `⚔️ Tantangan PvP dikirim ke ${target}! Tunggu diterima.`,
    });
}

// POST /battle/pvp/accept — body: { battleId }
async function pvpAccept(req, res) {
    const { username } = req.user;
    const { battleId } = req.body;

    const b = activeBattles[battleId];
    if (!b || b.p2 !== username) return res.status(400).json({ success: false, message: '❌ Battle tidak ditemukan.' });
    if (b.status !== 'waiting')  return res.status(400).json({ success: false, message: '❌ Battle sudah dimulai.' });

    b.status = 'playing';
    b.ts     = Date.now();
    res.json({ success: true, battleId, battle: sanitizeBattle(b), message: '⚔️ Battle dimulai!' });
}

// POST /battle/pvp/action — body: { battleId, action: 'attack' | 'heal' }
async function pvpAction(req, res) {
    const { username } = req.user;
    const { battleId, action } = req.body;
    const b = activeBattles[battleId];

    if (!b || b.status !== 'playing')
        return res.status(400).json({ success: false, message: '❌ Battle tidak aktif.' });
    if (b.turn !== username)
        return res.status(400).json({ success: false, message: '❌ Bukan giliranmu.' });
    if (Date.now() - b.ts > 120_000) {
        delete activeBattles[battleId];
        return res.status(400).json({ success: false, message: '⏱️ Battle berakhir (AFK timeout 2 menit).' });
    }

    const isP1 = username === b.p1;
    const self = isP1 ? 'p1' : 'p2';
    const opp  = isP1 ? 'p2' : 'p1';

    if (action === 'attack') {
        const roll = Math.random();
        if (roll < 0.15) {
            b.log = `💨 Serangan ${username} MELESET!`;
        } else if (roll > 0.85) {
            const dmg = Math.floor(Math.random() * 25 + 30);
            b[`${opp}_hp`] -= dmg;
            b.log = `🔥 CRITICAL! -${dmg} HP ke lawan!`;
        } else {
            const dmg = Math.floor(Math.random() * 15 + 15);
            b[`${opp}_hp`] -= dmg;
            b.log = `💥 Serangan masuk: -${dmg} HP`;
        }
    } else if (action === 'heal') {
        const cur = b[`${self}_hp`];
        const max = b[`${self}_maxhp`];
        if (cur >= max) {
            b.log = `🤦 HP sudah penuh! Giliran terbuang.`;
        } else {
            const heal = Math.floor(Math.random() * 20 + 10);
            b[`${self}_hp`] = Math.min(cur + heal, max);
            b.log = `🧪 +${heal} HP (potion)`;
        }
    } else {
        return res.status(400).json({ success: false, message: '❌ Action harus "attack" atau "heal".' });
    }

    b.ts = Date.now();

    // Cek KO
    if (b.p1_hp <= 0 || b.p2_hp <= 0) {
        const winner = b.p1_hp > 0 ? b.p1 : b.p2;
        const loser  = b.p1_hp > 0 ? b.p2 : b.p1;

        // Beri reward
        const { source: ws, data: wd } = getUserGameData(winner);
        wd.balance = (wd.balance || 0) + 500_000;
        wd.xp      = (wd.xp      || 0) + 150;
        await saveU(winner, wd, ws);

        const { source: ls, data: ld } = getUserGameData(loser);
        ld.xp = (ld.xp || 0) + 25;
        await saveU(loser, ld, ls);

        delete activeBattles[battleId];
        return res.json({
            success: true, finished: true,
            winner, loser,
            message: `🏆 ${winner} MENANG! Dapat Rp500.000 & +150 XP.`,
        });
    }

    // Ganti giliran
    b.turn = isP1 ? b.p2 : b.p1;
    res.json({ success: true, finished: false, battle: sanitizeBattle(b) });
}

// GET /battle/pvp/status
async function pvpStatus(req, res) {
    const { username } = req.user;
    const battle = Object.entries(activeBattles).find(([, b]) => b.p1 === username || b.p2 === username);
    if (!battle) return res.json({ success: true, battle: null });
    res.json({ success: true, battleId: battle[0], battle: sanitizeBattle(battle[1]) });
}

// POST /battle/pvp/surrender
async function pvpSurrender(req, res) {
    const { username } = req.user;
    const entry = Object.entries(activeBattles).find(([, b]) => b.p1 === username || b.p2 === username);
    if (!entry) return res.status(400).json({ success: false, message: '❌ Kamu tidak dalam battle.' });
    delete activeBattles[entry[0]];
    res.json({ success: true, message: '🏳️ Kamu menyerah.' });
}

function sanitizeBattle(b) {
    return {
        p1: b.p1, p2: b.p2,
        p1_hp: Math.max(0, b.p1_hp), p1_maxhp: b.p1_maxhp,
        p2_hp: Math.max(0, b.p2_hp), p2_maxhp: b.p2_maxhp,
        turn: b.turn, status: b.status, log: b.log,
    };
}

module.exports = {
    duelChallenge, duelAccept, duelReject, duelStatus,
    pvpChallenge, pvpAccept, pvpAction, pvpStatus, pvpSurrender,
};