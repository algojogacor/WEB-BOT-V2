// ============================================================
//  controllers/features/nationController.js
//  🌍 SISTEM NATION v3.0 — Port lengkap dari BOT-WA-1
//  Semua fitur: bangun, militer, diplomasi, spionase, dll
// ============================================================

'use strict';
const db  = require('../../config/database');
const { getUserGameData } = require('../userController');
const { fmt } = require('../../utils/helpers');

// ═══════════════════════════════════════════════════════════════
// ⚙️  KONFIGURASI LENGKAP (sama persis dengan WA Bot)
// ═══════════════════════════════════════════════════════════════
const CFG = {
    BIAYA_BERDIRI:    5_000_000_000,
    BIAYA_TENTARA:    50_000_000,
    PAJAK_DASAR:      100_000,
    BIAYA_PROPAGANDA: 500_000_000,
    BIAYA_PERISAI:    5_000_000_000,
    BIAYA_SENSUS:     100_000_000,
    BIAYA_BLOKADE:    2_000_000_000,
    BIAYA_GENCATAN:   1_000_000_000,

    CD_PAJAK:         60 * 60 * 1000,
    CD_SERANG:        30 * 60 * 1000,
    CD_SPY:           15 * 60 * 1000,
    CD_BLOKADE:       2 * 60 * 60 * 1000,
    CD_PROPAGANDA:    3 * 60 * 60 * 1000,
    CD_GENCATAN:      24 * 60 * 60 * 1000,
    PERISAI_DURASI:   2 * 60 * 60 * 1000,
    BLOKADE_DURASI:   4 * 60 * 60 * 1000,

    MAX_ALIANSI:      3,
    MAX_RUDAL:        20,
    MAX_BOM_NUKLIR:   3,

    BANGUNAN: {
        bank:    { nama: '🏦 Bank Sentral',       harga: 10_000_000_000, efek: 'Pajak +15%/lv | Max Lv.5' },
        benteng: { nama: '🏰 Benteng',            harga: 25_000_000_000, efek: 'Defense +25%/lv | Max Lv.5' },
        rs:      { nama: '🏥 Rumah Sakit',        harga:  5_000_000_000, efek: 'Populasi +2%/lv | Kurangi korban perang' },
        intel:   { nama: '🕵️ Markas Intelijen',  harga: 15_000_000_000, efek: 'Buka misi rahasia | Counter-intel +10%/lv' },
        silo:    { nama: '🚀 Silo Rudal',         harga: 50_000_000_000, efek: 'Produksi & simpan rudal' },
        radar:   { nama: '📡 Radar & Pertahanan', harga: 30_000_000_000, efek: 'Tangkis rudal 15%/lv | Kurangi sabotase' },
        nuklir:  { nama: '☢️ Lab Nuklir',         harga: 80_000_000_000, efek: 'Produksi bom nuklir | Rudal +50% damage' },
        kilang:  { nama: '🏭 Kilang Industri',    harga: 20_000_000_000, efek: 'Pajak +10%/lv | Populasi tumbuh lebih cepat' },
        dermaga: { nama: '⚓ Dermaga Militer',    harga: 35_000_000_000, efek: 'Blokade lebih efektif | Bonus serangan 10%' },
        univ:    { nama: '🎓 Universitas Riset',  harga: 12_000_000_000, efek: 'Buka riset teknologi | Unlock bonus spesial' },
        kebun:   { nama: '🌿 Kebun Rakyat',       harga:  3_000_000_000, efek: 'Stabilitas +1/jam | Populasi hepi' },
        penjara: { nama: '⛓️ Penjara Negara',     harga:  8_000_000_000, efek: 'Tangkap agen musuh +20% | Kurangi teror' },
    },
    MAX_BANGUNAN: { bank:5, benteng:5, rs:5, intel:3, silo:2, radar:3, nuklir:1, kilang:3, dermaga:2, univ:2, kebun:5, penjara:2 },

    RISET: {
        rudal_pintar: { nama:'🎯 Rudal Pintar',     biaya:10_000_000_000, efek:'Rudal 30% lebih akurat', univ_min:1 },
        agen_elite:   { nama:'🕵️‍♂️ Agen Elite',    biaya:15_000_000_000, efek:'Misi spy +15% sukses', univ_min:1 },
        ekonomi_maju: { nama:'💹 Ekonomi Maju',     biaya:20_000_000_000, efek:'Pajak +25% bonus', univ_min:1 },
        armor_baja:   { nama:'🛡️ Armor Baja',       biaya:25_000_000_000, efek:'Def +15% pasif', univ_min:2 },
        drone_serang: { nama:'🛸 Drone Serang',      biaya:30_000_000_000, efek:'Serangan -20% kerugian', univ_min:2 },
        bioweapon:    { nama:'🧬 Bio-weapon',        biaya:50_000_000_000, efek:'Racun 2x lebih mematikan', univ_min:2 },
    },

    MISI_SPY: {
        spionase: { biaya:500_000_000,   sukses:0.75, intel_min:1, nama:'🔍 Spionase' },
        sadap:    { biaya:800_000_000,   sukses:0.60, intel_min:1, nama:'📡 Penyadapan' },
        sabotase: { biaya:1_500_000_000, sukses:0.50, intel_min:1, nama:'💣 Sabotase' },
        teror:    { biaya:1_000_000_000, sukses:0.55, intel_min:1, nama:'💥 Operasi Teror' },
        kudeta:   { biaya:3_000_000_000, sukses:0.30, intel_min:2, nama:'👑 Kudeta' },
        racun:    { biaya:2_000_000_000, sukses:0.40, intel_min:2, nama:'☠️ Racun' },
        suap:     { biaya:2_500_000_000, sukses:0.35, intel_min:2, nama:'💰 Suap Jenderal' },
        curi:     { biaya:1_200_000_000, sukses:0.45, intel_min:1, nama:'💸 Curi Kas' },
    },
};

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS INTERNAL
// ═══════════════════════════════════════════════════════════════
const jamStr = (ms) => {
    if (ms <= 0) return 'sekarang';
    if (ms < 60000) return `${Math.ceil(ms/1000)} detik`;
    if (ms < 3600000) return `${Math.ceil(ms/60000)} menit`;
    return `${Math.ceil(ms/3600000)} jam`;
};

const hitungPower = (n) => {
    if (!n) return 0;
    const defB = 1 + ((n.buildings?.benteng || 0) * 0.25) + (n.riset?.armor_baja ? 0.15 : 0);
    const drmg = 1 + ((n.buildings?.dermaga || 0) * 0.10);
    return Math.floor((n.defense || 0) * defB * drmg);
};

const hitungPajak = (n) => {
    if (!n) return 0;
    const bankB   = 1 + ((n.buildings?.bank || 0) * 0.15);
    const kilangB = 1 + ((n.buildings?.kilang || 0) * 0.10);
    const risetB  = n.riset?.ekonomi_maju ? 1.25 : 1;
    return Math.floor((n.population || 0) * CFG.PAJAK_DASAR * bankB * kilangB * risetB);
};

const statusStab = (s) => {
    if (s >= 90) return 'Sangat Stabil';
    if (s >= 70) return 'Stabil';
    if (s >= 50) return 'Bergejolak';
    if (s >= 30) return 'Rusuh';
    if (s >= 10) return 'ANARKI';
    return 'KOLAPS';
};

const statusMiliter = (d) => {
    if (d >= 10000) return 'Angkatan Besar';
    if (d >= 5000)  return 'Militer Kuat';
    if (d >= 1000)  return 'Sedang';
    if (d >= 100)   return 'Lemah';
    return 'Hampir Tanpa Militer';
};

function sanitizeNation(n) {
    if (!n) return n;
    if (!n.buildings)  n.buildings  = {};
    if (!n.riset)      n.riset      = {};
    if (!n.aliansi)    n.aliansi    = [];
    if (!n.spyLog)     n.spyLog     = [];
    if (!n.agenAktif)  n.agenAktif  = {};
    if (!n.warLog)     n.warLog     = [];
    if (!n.blokade)    n.blokade    = {};
    if (!n.gencatan)   n.gencatan   = [];
    Object.keys(CFG.BANGUNAN).forEach(k => { if (!n.buildings[k]) n.buildings[k] = 0; });
    const def = {
        stability:100, treasury:0, defense:50, population:1000,
        lastTax:0, lastAttack:0, lastSpy:0, lastBlokade:0,
        lastPropaganda:0, lastGencatan:0, lastKebun:Date.now(),
        rudal:0, bomNuklir:0, perisai:0, diblokade:0,
        totalPajak:0, totalPerang:0, totalMenang:0, totalKalah:0,
    };
    Object.entries(def).forEach(([k,v]) => { if (typeof n[k] === 'undefined') n[k] = v; });
    return n;
}

function ensureNationsDB(data) {
    if (!data.nations)  data.nations  = {};
    if (!data.pending)  data.pending  = {};
    if (!data.pending.aliansi)  data.pending.aliansi  = {};
    if (!data.pending.gencatan) data.pending.gencatan = {};
    if (!data.notifications)    data.notifications    = {};
}

// Simpan notifikasi untuk user lain (menggantikan sendDM WA Bot)
function pushNotif(data, username, msg) {
    if (!data.notifications) data.notifications = {};
    if (!data.notifications[username]) data.notifications[username] = [];
    data.notifications[username].push({ msg, time: Date.now(), read: false });
    // Maksimal 20 notifikasi tersimpan
    if (data.notifications[username].length > 20) {
        data.notifications[username] = data.notifications[username].slice(-20);
    }
}

// Clamp semua nilai number ke min 0
function clampNation(n) {
    ['treasury','population','defense','stability','rudal','bomNuklir'].forEach(k => {
        if ((n[k] || 0) < 0) n[k] = 0;
    });
}

// Helper save user balance
async function saveUserBalance(username, userData, source) {
    const data = db.getData();
    if (source === 'wa') {
        const waId = db.getWebUsers()[username]?.waId;
        if (waId) data.users[waId] = userData;
    } else {
        if (!data.webGameData) data.webGameData = {};
        data.webGameData[username] = userData;
    }
    await db.saveData(data);
}

// ═══════════════════════════════════════════════════════════════
// 📊  GET DASHBOARD NEGARA
// ═══════════════════════════════════════════════════════════════
async function getDashboard(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);

        // Tick kebun (stabilitas tumbuh tiap jam dari kebun)
        if (nation && (nation.buildings?.kebun || 0) > 0) {
            const tick = Math.floor(((now - (nation.lastKebun || now)) / 3600000) * nation.buildings.kebun);
            if (tick > 0) {
                nation.stability = Math.min(100, (nation.stability || 100) + tick);
                nation.lastKebun = now;
                data.nations[username] = nation;
                await db.saveData(data);
            }
        }

        if (!nation) {
            return res.json({ success: true, nation: null, config: {
                biayaBerdiri: CFG.BIAYA_BERDIRI,
            }});
        }

        const power    = hitungPower(nation);
        const pajak    = hitungPajak(nation);
        const rank     = Object.values(data.nations)
            .sort((a,b) => hitungPower(b) - hitungPower(a))
            .findIndex(n => n.name === nation.name) + 1;
        const total    = Object.keys(data.nations).length;
        const winRate  = nation.totalPerang > 0 ? Math.round((nation.totalMenang / nation.totalPerang) * 100) : 0;
        const perisaiOn= nation.perisai > now;
        const diblokOn = nation.diblokade > now;

        // Resolve nama sekutu
        const sekutu = nation.aliansi.map(id => ({
            username: id,
            name: data.nations[id]?.name || '❓ Bubar',
            power: hitungPower(data.nations[id]),
        }));

        // Pending aliansi masuk
        const pendingAliansiMasuk = Object.entries(data.pending.aliansi || {})
            .filter(([key]) => key.endsWith(`_${username}`))
            .map(([key, val]) => ({ fromUsername: val.from, fromNation: data.nations[val.from]?.name || '?', time: val.time }));

        // Pending gencatan masuk
        const pendingGencatanMasuk = Object.entries(data.pending.gencatan || {})
            .filter(([key]) => key.endsWith(`_${username}`))
            .map(([key, val]) => ({ fromUsername: val.from, fromNation: data.nations[val.from]?.name || '?', time: val.time }));

        // CD pajak
        const cdPajak    = Math.max(0, CFG.CD_PAJAK - (now - (nation.lastTax || 0)));
        const cdSerang   = Math.max(0, CFG.CD_SERANG - (now - (nation.lastAttack || 0)));
        const cdBlokade  = Math.max(0, CFG.CD_BLOKADE - (now - (nation.lastBlokade || 0)));
        const cdProp     = Math.max(0, CFG.CD_PROPAGANDA - (now - (nation.lastPropaganda || 0)));
        const cdSpy      = Math.max(0, CFG.CD_SPY - (now - (nation.lastSpy || 0)));

        res.json({
            success: true,
            nation: {
                ...nation,
                power, pajak, rank, total, winRate,
                perisaiOn, diblokOn,
                sekutu, pendingAliansiMasuk, pendingGencatanMasuk,
                cdPajak, cdSerang, cdBlokade, cdProp, cdSpy,
                cdPajakStr: jamStr(cdPajak),
                cdSerangStr: jamStr(cdSerang),
                cdBlokadeStr: jamStr(cdBlokade),
                cdPropStr: jamStr(cdProp),
                cdSpyStr: jamStr(cdSpy),
            },
            config: {
                biayaBerdiri: CFG.BIAYA_BERDIRI,
                bangunan: Object.entries(CFG.BANGUNAN).map(([kode,b]) => ({
                    kode, nama: b.nama, harga: b.harga, efek: b.efek,
                    maxLv: CFG.MAX_BANGUNAN[kode] || 5,
                    curLv: nation.buildings[kode] || 0,
                    hargaNext: b.harga * ((nation.buildings[kode] || 0) + 1),
                })),
                riset: Object.entries(CFG.RISET).map(([kode,r]) => ({
                    kode, nama: r.nama, biaya: r.biaya, efek: r.efek,
                    univ_min: r.univ_min,
                    sudah: !!nation.riset[kode],
                    locked: (nation.buildings.univ || 0) < r.univ_min,
                })),
                misiSpy: Object.entries(CFG.MISI_SPY).map(([kode,m]) => ({
                    kode, nama: m.nama, biaya: m.biaya,
                    sukses: Math.round(m.sukses * 100),
                    intel_min: m.intel_min,
                    locked: (nation.buildings.intel || 0) < m.intel_min,
                })),
            },
        });
    } catch (err) {
        console.error('Nation getDashboard:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🌍  BUAT NEGARA
// ═══════════════════════════════════════════════════════════════
async function buatNegara(req, res) {
    try {
        const { username } = req.user;
        const { nama } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        if (data.nations[username]) {
            return res.status(400).json({ success: false, message: 'Kamu sudah punya negara!' });
        }

        const namaBersih = (nama || '').trim();
        if (!namaBersih || namaBersih.length > 25) {
            return res.status(400).json({ success: false, message: 'Nama negara 1-25 karakter!' });
        }
        if (Object.values(data.nations).some(n => n.name?.toLowerCase() === namaBersih.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Nama negara sudah dipakai!' });
        }

        // Kurangi saldo pribadi
        const { source, data: u } = getUserGameData(username);
        if ((u.balance || 0) < CFG.BIAYA_BERDIRI) {
            return res.status(400).json({ success: false, message: `Saldo kurang! Perlu Rp ${fmt(CFG.BIAYA_BERDIRI)}.` });
        }

        u.balance -= CFG.BIAYA_BERDIRI;
        await saveUserBalance(username, u, source);

        data.nations[username] = sanitizeNation({
            name: namaBersih, population: 1000, defense: 50,
            treasury: 2_000_000_000, stability: 100,
            lastTax: 0, lastAttack: 0, lastSpy: 0, lastBlokade: 0,
            lastPropaganda: 0, lastKebun: now,
            aliansi: [], rudal: 0, bomNuklir: 0,
            spyLog: [], agenAktif: {}, warLog: [],
            perisai: 0, diblokade: 0, blokade: {}, gencatan: [],
            riset: {}, buildings: {},
            totalPajak: 0, totalPerang: 0, totalMenang: 0, totalKalah: 0,
            createdAt: now,
        });

        await db.saveData(data);
        res.json({ success: true, message: `🎉 Negara "${namaBersih}" resmi berdiri! Kas awal: Rp 2.000.000.000`, nation: data.nations[username] });
    } catch (err) {
        console.error('Nation buatNegara:', err);
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🏗️  BANGUN INFRASTRUKTUR
// ═══════════════════════════════════════════════════════════════
async function bangun(req, res) {
    try {
        const { username } = req.user;
        const { kode } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const b = CFG.BANGUNAN[kode];
        if (!b) {
            return res.status(400).json({ success: false, message: 'Kode bangunan tidak valid.' });
        }

        const curLv = nation.buildings[kode] || 0;
        const maxLv = CFG.MAX_BANGUNAN[kode] || 5;
        if (curLv >= maxLv) {
            return res.status(400).json({ success: false, message: `${b.nama} sudah Level MAX (${maxLv})!` });
        }

        const harga = b.harga * (curLv + 1);
        if (nation.treasury < harga) {
            return res.status(400).json({ success: false, message: `Kas kurang! Perlu Rp ${fmt(harga)}, punya Rp ${fmt(nation.treasury)}.` });
        }

        nation.treasury -= harga;
        nation.buildings[kode] = curLv + 1;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({
            success: true,
            message: `✅ ${b.nama} berhasil dibangun! Sekarang Level ${nation.buildings[kode]}/${maxLv}`,
            nation,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔨  DEMOLISH BANGUNAN
// ═══════════════════════════════════════════════════════════════
async function demolish(req, res) {
    try {
        const { username } = req.user;
        const { kode } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!CFG.BANGUNAN[kode]) return res.status(400).json({ success: false, message: 'Kode bangunan tidak valid.' });
        if (!(nation.buildings[kode] || 0)) return res.status(400).json({ success: false, message: 'Bangunan ini belum dibangun.' });

        const curLv  = nation.buildings[kode];
        const refund = Math.floor(CFG.BANGUNAN[kode].harga * curLv * 0.5);
        nation.treasury += refund;
        nation.buildings[kode] = Math.max(0, curLv - 1);
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({
            success: true,
            message: `🔨 ${CFG.BANGUNAN[kode].nama} dibongkar satu level. Refund: +Rp ${fmt(refund)}`,
            nation,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔬  RISET TEKNOLOGI
// ═══════════════════════════════════════════════════════════════
async function riset(req, res) {
    try {
        const { username } = req.user;
        const { kode } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!nation.buildings.univ) return res.status(400).json({ success: false, message: 'Bangun Universitas Riset dulu!' });

        const r = CFG.RISET[kode];
        if (!r) return res.status(400).json({ success: false, message: 'Kode riset tidak ditemukan.' });
        if (nation.riset[kode]) return res.status(400).json({ success: false, message: `${r.nama} sudah diriset!` });
        if (nation.buildings.univ < r.univ_min) return res.status(400).json({ success: false, message: `Butuh Universitas Level ${r.univ_min}+.` });
        if (nation.treasury < r.biaya) return res.status(400).json({ success: false, message: `Kas kurang! Perlu Rp ${fmt(r.biaya)}.` });

        nation.treasury -= r.biaya;
        nation.riset[kode] = true;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `🔬 ${r.nama} berhasil diriset! Efek aktif: ${r.efek}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 💰  PUNGUT PAJAK
// ═══════════════════════════════════════════════════════════════
async function pungutPajak(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const sisa = CFG.CD_PAJAK - (now - (nation.lastTax || 0));
        if (sisa > 0) return res.status(400).json({ success: false, message: `Pajak baru bisa dipungut dalam ${jamStr(sisa)}.` });
        if (nation.stability < 20) return res.status(400).json({ success: false, message: 'Rakyat dalam kondisi ANARKI! Stabilkan dulu dengan propaganda.' });

        const blokadePenalti = nation.diblokade > now ? 0.5 : 1;
        const pendapatan = Math.floor(hitungPajak(nation) * blokadePenalti);
        const growthBase = 0.05 + (nation.buildings.rs * 0.02) + (nation.buildings.kilang * 0.01);
        const populasiBaru = Math.floor(nation.population * growthBase);

        nation.treasury   += pendapatan;
        nation.population += populasiBaru;
        nation.lastTax     = now;
        nation.totalPajak  = (nation.totalPajak || 0) + pendapatan;
        data.nations[username] = nation;
        await db.saveData(data);

        let msg = `💰 Pajak: +Rp ${fmt(pendapatan)}\n👥 Kelahiran rakyat: +${fmt(populasiBaru)} jiwa`;
        if (blokadePenalti < 1) msg += '\n⚠️ Diblokade! Pajak -50%';
        res.json({ success: true, message: msg, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🪖  REKRUT TENTARA
// ═══════════════════════════════════════════════════════════════
async function rekrut(req, res) {
    try {
        const { username } = req.user;
        const { qty } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const jumlah = parseInt(qty);
        if (isNaN(jumlah) || jumlah < 1) return res.status(400).json({ success: false, message: 'Jumlah tidak valid.' });

        const biaya = jumlah * CFG.BIAYA_TENTARA;
        if (nation.treasury < biaya) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(biaya)}. Punya: Rp ${fmt(nation.treasury)}.` });

        nation.treasury -= biaya;
        nation.defense  += jumlah;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `🪖 +${fmt(jumlah)} personil direkrut! Total: ${fmt(nation.defense)} tentara`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// ↩️  DEMOBILISASI
// ═══════════════════════════════════════════════════════════════
async function demobilisasi(req, res) {
    try {
        const { username } = req.user;
        const { qty } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const jumlah = parseInt(qty);
        if (isNaN(jumlah) || jumlah < 1) return res.status(400).json({ success: false, message: 'Jumlah tidak valid.' });
        if (jumlah > nation.defense) return res.status(400).json({ success: false, message: `Tentara hanya ${fmt(nation.defense)} orang.` });

        const refund = Math.floor(jumlah * CFG.BIAYA_TENTARA * 0.4);
        nation.defense  -= jumlah;
        nation.treasury += refund;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `✅ ${fmt(jumlah)} tentara dipulangkan. Refund 40%: +Rp ${fmt(refund)}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 💸  KEUANGAN (SUBSIDI, TARIK KAS, KORUPSI)
// ═══════════════════════════════════════════════════════════════
async function subsidi(req, res) {
    try {
        const { username } = req.user;
        const { amount } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const { source, data: u } = getUserGameData(username);
        const nominal = amount === 'all' ? (u.balance || 0) : parseInt(amount);
        if (isNaN(nominal) || nominal < 1000) return res.status(400).json({ success: false, message: 'Nominal tidak valid.' });
        if ((u.balance || 0) < nominal) return res.status(400).json({ success: false, message: 'Saldo pribadi kurang.' });

        u.balance    -= nominal;
        nation.treasury += nominal;
        nation.stability = Math.min(100, nation.stability + 3);
        data.nations[username] = nation;
        await saveUserBalance(username, u, source);
        await db.saveData(data);

        res.json({ success: true, message: `💸 Subsidi +Rp ${fmt(nominal)} masuk kas negara. Stabilitas: ${nation.stability}%`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function tarikKas(req, res) {
    try {
        const { username } = req.user;
        const { amount } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const nominal = amount === 'all' ? nation.treasury : parseInt(amount);
        if (isNaN(nominal) || nominal < 1000) return res.status(400).json({ success: false, message: 'Nominal tidak valid.' });
        if (nation.treasury < nominal) return res.status(400).json({ success: false, message: 'Kas negara tidak cukup.' });

        const pajak_tarik = Math.floor(nominal * 0.10);
        const net = nominal - pajak_tarik;

        nation.treasury -= nominal;
        const { source, data: u } = getUserGameData(username);
        u.balance = (u.balance || 0) + net;
        data.nations[username] = nation;
        await saveUserBalance(username, u, source);
        await db.saveData(data);

        res.json({ success: true, message: `💰 Tarik kas Rp ${fmt(nominal)}. Pajak 10%: -Rp ${fmt(pajak_tarik)}. Diterima: +Rp ${fmt(net)}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function korupsi(req, res) {
    try {
        const { username } = req.user;
        const { amount } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const nominal = amount === 'all' ? nation.treasury : parseInt(amount);
        if (isNaN(nominal) || nominal < 1000) return res.status(400).json({ success: false, message: 'Nominal tidak valid.' });
        if (nation.treasury < nominal) return res.status(400).json({ success: false, message: 'Kas kosong.' });

        nation.treasury -= nominal;
        const { source, data: u } = getUserGameData(username);
        u.balance = (u.balance || 0) + nominal;

        const drop = Math.floor(Math.random() * 20) + 5;
        nation.stability = Math.max(0, nation.stability - drop);

        let message = `😈 Korupsi Rp ${fmt(nominal)} berhasil! Stabilitas: -${drop}% → ${nation.stability}%`;
        let negaraHancur = false;

        if (nation.stability <= 0) {
            delete data.nations[username];
            negaraHancur = true;
            message += '\n\n🔥 REVOLUSI RAKYAT! Negaramu HANCUR akibat korupsi berlebihan!';
        } else {
            data.nations[username] = nation;
        }

        await saveUserBalance(username, u, source);
        await db.saveData(data);

        res.json({ success: true, message, nation: negaraHancur ? null : nation, negaraHancur });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 📣  PROPAGANDA
// ═══════════════════════════════════════════════════════════════
async function propaganda(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const sisa = CFG.CD_PROPAGANDA - (now - (nation.lastPropaganda || 0));
        if (sisa > 0) return res.status(400).json({ success: false, message: `Propaganda cooldown: ${jamStr(sisa)}.` });
        if (nation.treasury < CFG.BIAYA_PROPAGANDA) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(CFG.BIAYA_PROPAGANDA)}.` });

        nation.treasury      -= CFG.BIAYA_PROPAGANDA;
        const gain = Math.floor(Math.random() * 15) + 10;
        nation.stability      = Math.min(100, nation.stability + gain);
        nation.lastPropaganda = now;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `📣 Propaganda berhasil! Stabilitas: +${gain}% → ${nation.stability}%`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🚀  BANGUN RUDAL & BOM NUKLIR
// ═══════════════════════════════════════════════════════════════
async function bangunRudal(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!nation.buildings.silo) return res.status(400).json({ success: false, message: 'Bangun Silo Rudal dulu!' });
        if (nation.rudal >= CFG.MAX_RUDAL) return res.status(400).json({ success: false, message: `Stok rudal penuh! Maks ${CFG.MAX_RUDAL} unit.` });

        const harga = 20_000_000_000;
        if (nation.treasury < harga) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(harga)}.` });

        nation.treasury -= harga;
        nation.rudal     = (nation.rudal || 0) + 1;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `🚀 Rudal diproduksi! Stok: ${nation.rudal}/${CFG.MAX_RUDAL}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function bangunBom(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!nation.buildings.nuklir) return res.status(400).json({ success: false, message: 'Bangun Lab Nuklir dulu!' });
        if (!nation.buildings.silo) return res.status(400).json({ success: false, message: 'Bangun Silo Rudal dulu!' });
        if ((nation.bomNuklir || 0) >= CFG.MAX_BOM_NUKLIR) return res.status(400).json({ success: false, message: `Maks ${CFG.MAX_BOM_NUKLIR} bom nuklir!` });

        const harga = 100_000_000_000;
        if (nation.treasury < harga) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(harga)}.` });

        nation.treasury  -= harga;
        nation.bomNuklir  = (nation.bomNuklir || 0) + 1;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `☢️ Bom nuklir selesai! Stok: ${nation.bomNuklir}/${CFG.MAX_BOM_NUKLIR}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🛡️  PERISAI
// ═══════════════════════════════════════════════════════════════
async function perisai(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (nation.perisai > now) return res.status(400).json({ success: false, message: `Perisai masih aktif hingga ${new Date(nation.perisai).toLocaleTimeString('id-ID')}.` });
        if (nation.treasury < CFG.BIAYA_PERISAI) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(CFG.BIAYA_PERISAI)}.` });

        nation.treasury -= CFG.BIAYA_PERISAI;
        nation.perisai   = now + CFG.PERISAI_DURASI;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `🛡️ Perisai aktif 2 jam! Kebal dari serangan hingga ${new Date(nation.perisai).toLocaleTimeString('id-ID')}.`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// ⚔️  SERANG DARAT
// ═══════════════════════════════════════════════════════════════
async function serang(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        if (!targetUsername || targetUsername === username) {
            return res.status(400).json({ success: false, message: 'Target tidak valid.' });
        }

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const sisTunggu = CFG.CD_SERANG - (now - (nation.lastAttack || 0));
        if (sisTunggu > 0) return res.status(400).json({ success: false, message: `Cooldown perang: ${jamStr(sisTunggu)}.` });

        const musuh = sanitizeNation(data.nations[targetUsername]);
        if (!musuh) return res.status(400).json({ success: false, message: 'Target tidak punya negara.' });
        if (musuh.perisai > now) return res.status(400).json({ success: false, message: `${musuh.name} dilindungi perisai!` });
        if (nation.aliansi.includes(targetUsername)) return res.status(400).json({ success: false, message: `${musuh.name} adalah SEKUTUMU!` });

        // Gencatan senjata
        if (nation.gencatan?.includes(targetUsername) && musuh.gencatan?.includes(username)) {
            return res.status(400).json({ success: false, message: `Dalam gencatan senjata dengan ${musuh.name}!` });
        }

        // Hitung kekuatan
        const risetDroneAtk = nation.riset?.drone_serang ? 0.8 : 1;
        const myRudalBonus  = nation.rudal > 0 ? (nation.buildings.nuklir ? 1.5 : 1.2) : 1;
        const myPower = (nation.defense * (1 + (nation.buildings.benteng||0)*0.25 + (nation.buildings.dermaga||0)*0.10)) * (0.85 + Math.random()*0.3) * myRudalBonus;

        const enRadar   = 1 - ((musuh.buildings.radar||0) * 0.05);
        const enDef     = 1 + (musuh.buildings.benteng||0)*0.25 + (musuh.riset?.armor_baja ? 0.15 : 0);
        const alBoost   = (musuh.aliansi||[]).reduce((s, id) => s + hitungPower(data.nations[id]) * 0.2, 0);
        const enPower   = (musuh.defense * enDef * enRadar) * (0.85 + Math.random()*0.3) + alBoost;

        nation.lastAttack   = now;
        nation.totalPerang  = (nation.totalPerang||0) + 1;
        musuh.totalPerang   = (musuh.totalPerang||0) + 1;

        const pakaRudal = nation.rudal > 0;
        if (pakaRudal) nation.rudal -= 1;

        let message = '';
        let hasilPerang = '';

        if (myPower > enPower) {
            const jarahan    = Math.floor(musuh.treasury * (0.30 + Math.random()*0.20));
            const korban     = Math.floor(musuh.population * (0.05 + Math.random()*0.10));
            const myLoss     = Math.floor(nation.defense * (0.05 + Math.random()*0.10) * risetDroneAtk);
            const enLoss     = Math.floor(musuh.defense * (0.25 + Math.random()*0.20));
            const stabLoss   = Math.floor(15 + Math.random()*20);

            nation.treasury  += jarahan;
            nation.defense   -= myLoss;
            nation.totalMenang = (nation.totalMenang||0) + 1;
            musuh.treasury   -= jarahan;
            musuh.population -= korban;
            musuh.defense    -= enLoss;
            musuh.stability   = Math.max(0, musuh.stability - stabLoss);
            musuh.totalKalah  = (musuh.totalKalah||0) + 1;

            // Hancurkan bangunan acak
            let bHancur = '';
            const bList = Object.keys(musuh.buildings).filter(k => (musuh.buildings[k]||0) > 0);
            if (bList.length && Math.random() < 0.35) {
                const tgt = bList[Math.floor(Math.random()*bList.length)];
                musuh.buildings[tgt] = Math.max(0, musuh.buildings[tgt]-1);
                bHancur = ` | ${CFG.BANGUNAN[tgt]?.nama || tgt} musuh rusak!`;
            }

            hasilPerang = 'MENANG';
            message = `🏆 KEMENANGAN! Jarahan: +Rp ${fmt(jarahan)} | Korban musuh: ${fmt(korban)} jiwa | Tentara musuh gugur: ${fmt(enLoss)} | Tentaramu gugur: ${fmt(myLoss)}${bHancur}`;
            if (alBoost > 0) message += ` | Musuh dibantu sekutu +${fmt(Math.floor(alBoost))} power`;
            if (pakaRudal) message = `🚀 Rudal dilancarkan! ` + message;

            // Notifikasi ke musuh
            pushNotif(data, targetUsername, `🚨 NEGARAMU DISERANG! "${nation.name}" menyerbu "${musuh.name}"! Jarahan: -Rp ${fmt(jarahan)} | Korban sipil: ${fmt(korban)} | Tentara gugur: ${fmt(enLoss)} | Stabilitas: ${musuh.stability}%`);
        } else {
            const rugi    = Math.floor(nation.treasury * (0.05 + Math.random()*0.08));
            const myLoss  = Math.floor(nation.defense * (0.25 + Math.random()*0.20) * risetDroneAtk);
            const enLoss  = Math.floor(musuh.defense * (0.05 + Math.random()*0.05));
            nation.treasury  -= rugi;
            nation.defense   -= myLoss;
            musuh.defense    -= enLoss;
            nation.stability  = Math.max(0, nation.stability - 10);
            nation.totalKalah = (nation.totalKalah||0) + 1;
            musuh.totalMenang = (musuh.totalMenang||0) + 1;

            hasilPerang = 'KALAH';
            message = `🏳️ SERANGAN GAGAL! ${musuh.name} terlalu kuat! Rugi logistik: -Rp ${fmt(rugi)} | Tentaramu gugur: ${fmt(myLoss)}`;
            if (alBoost > 0) message += ` | Musuh dibantu sekutu!`;
        }

        // War log
        if (!nation.warLog) nation.warLog = [];
        nation.warLog.push({ vs: musuh.name, time: now, result: hasilPerang });
        if (nation.warLog.length > 10) nation.warLog = nation.warLog.slice(-10);

        clampNation(nation); clampNation(musuh);
        data.nations[username]     = nation;
        data.nations[targetUsername] = musuh;
        await db.saveData(data);

        res.json({ success: true, message, hasilPerang, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// ✈️  SERANGAN UDARA
// ═══════════════════════════════════════════════════════════════
async function serangUdara(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername, useNuklir } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!nation.buildings.silo) return res.status(400).json({ success: false, message: 'Butuh Silo Rudal!' });
        if (useNuklir && !nation.bomNuklir) return res.status(400).json({ success: false, message: 'Tidak punya bom nuklir!' });
        if (!useNuklir && !nation.rudal) return res.status(400).json({ success: false, message: 'Tidak punya rudal!' });

        const sisTunggu = CFG.CD_SERANG - (now - (nation.lastAttack || 0));
        if (sisTunggu > 0) return res.status(400).json({ success: false, message: `Cooldown: ${jamStr(sisTunggu)}.` });

        const musuh = sanitizeNation(data.nations[targetUsername]);
        if (!musuh) return res.status(400).json({ success: false, message: 'Target tidak punya negara.' });
        if (musuh.perisai > now) return res.status(400).json({ success: false, message: 'Perisai musuh menangkis serangan!' });

        // Radar intercept
        const radarChance = (musuh.buildings.radar || 0) * 0.15;
        const ditangkis   = !useNuklir && Math.random() < radarChance;

        nation.lastAttack = now;
        if (useNuklir) nation.bomNuklir -= 1;
        else           nation.rudal     -= 1;

        if (ditangkis) {
            data.nations[username] = nation;
            await db.saveData(data);
            return res.json({ success: true, message: `📡 Rudal ditangkis oleh radar ${musuh.name}! 1 rudal hangus.`, nation });
        }

        const dmgMult = useNuklir ? 3.0 : (nation.riset?.rudal_pintar ? 1.45 : 1.2);
        const jarahan  = Math.floor(musuh.treasury * (0.15 + Math.random()*0.15) * dmgMult);
        const enLoss   = Math.floor(musuh.defense * (0.20 + Math.random()*0.20) * dmgMult);
        const stabLoss = Math.floor(20 + Math.random()*30);
        let bHancur = '';

        musuh.treasury  -= jarahan;
        musuh.defense   -= enLoss;
        musuh.stability  = Math.max(0, musuh.stability - stabLoss);

        const bList = Object.keys(musuh.buildings).filter(k => (musuh.buildings[k]||0) > 0);
        if (bList.length && Math.random() < (useNuklir ? 0.80 : 0.50)) {
            const tgt = bList[Math.floor(Math.random()*bList.length)];
            const hancurLv = useNuklir ? Math.min(2, musuh.buildings[tgt]) : 1;
            musuh.buildings[tgt] = Math.max(0, musuh.buildings[tgt] - hancurLv);
            bHancur = ` | ${CFG.BANGUNAN[tgt]?.nama || tgt} -${hancurLv} level!`;
        }

        clampNation(musuh);
        data.nations[username]     = nation;
        data.nations[targetUsername] = musuh;

        const tipe = useNuklir ? '☢️ BOM NUKLIR DIJATUHKAN' : '✈️ Serangan Udara';
        pushNotif(data, targetUsername, `🚨 ${tipe}! "${nation.name}" menyerang "${musuh.name}"! Jarahan: -Rp ${fmt(jarahan)} | Tentara gugur: ${fmt(enLoss)} | Stabilitas: -${stabLoss}%${bHancur}`);

        await db.saveData(data);
        res.json({ success: true, message: `${tipe}! Target: ${musuh.name} | Jarahan: +Rp ${fmt(jarahan)} | Tentara gugur: ${fmt(enLoss)} | Stabilitas musuh: -${stabLoss}%${bHancur}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// ⛔  BLOKADE EKONOMI
// ═══════════════════════════════════════════════════════════════
async function blokade(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!nation.buildings.dermaga) return res.status(400).json({ success: false, message: 'Butuh Dermaga Militer!' });

        const sisTunggu = CFG.CD_BLOKADE - (now - (nation.lastBlokade || 0));
        if (sisTunggu > 0) return res.status(400).json({ success: false, message: `Blokade cooldown: ${jamStr(sisTunggu)}.` });
        if (nation.treasury < CFG.BIAYA_BLOKADE) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(CFG.BIAYA_BLOKADE)}.` });

        const musuh = sanitizeNation(data.nations[targetUsername]);
        if (!musuh) return res.status(400).json({ success: false, message: 'Target tidak punya negara.' });
        if (musuh.perisai > now) return res.status(400).json({ success: false, message: 'Musuh dilindungi perisai!' });

        nation.treasury    -= CFG.BIAYA_BLOKADE;
        nation.lastBlokade  = now;
        musuh.diblokade     = now + CFG.BLOKADE_DURASI;
        musuh.stability     = Math.max(0, musuh.stability - 10);

        pushNotif(data, targetUsername, `⛔ NEGARAMU DIBLOKADE oleh "${nation.name}"! Pajak -50% selama 4 jam. Stabilitas -10%.`);

        data.nations[username]     = nation;
        data.nations[targetUsername] = musuh;
        await db.saveData(data);

        res.json({ success: true, message: `⛔ Blokade aktif pada ${musuh.name} selama 4 jam! Pajak mereka -50%.`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🕊️  GENCATAN SENJATA
// ═══════════════════════════════════════════════════════════════
async function gencatan(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (nation.treasury < CFG.BIAYA_GENCATAN) return res.status(400).json({ success: false, message: `Biaya gencatan: Rp ${fmt(CFG.BIAYA_GENCATAN)}.` });

        const musuh = sanitizeNation(data.nations[targetUsername]);
        if (!musuh) return res.status(400).json({ success: false, message: 'Target tidak punya negara.' });

        nation.treasury -= CFG.BIAYA_GENCATAN;
        data.pending.gencatan[`${username}_${targetUsername}`] = { from: username, to: targetUsername, time: now };
        data.nations[username] = nation;

        pushNotif(data, targetUsername, `🕊️ "${nation.name}" menawarkan gencatan senjata! Jika diterima, kalian tidak bisa saling serang 24 jam. Terima di menu Diplomasi.`);

        await db.saveData(data);
        res.json({ success: true, message: `🕊️ Tawaran gencatan dikirim ke ${musuh.name}.`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function terimaGencatan(req, res) {
    try {
        const { username } = req.user;
        const { fromUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!data.pending.gencatan?.[`${fromUsername}_${username}`]) return res.status(400).json({ success: false, message: 'Tidak ada tawaran gencatan dari user itu.' });

        const fromNation = sanitizeNation(data.nations[fromUsername]);
        if (!nation.gencatan.includes(fromUsername))     nation.gencatan.push(fromUsername);
        if (!fromNation.gencatan.includes(username))     fromNation.gencatan.push(username);

        delete data.pending.gencatan[`${fromUsername}_${username}`];
        data.nations[username]   = nation;
        data.nations[fromUsername] = fromNation;

        pushNotif(data, fromUsername, `🕊️ "${nation.name}" menerima gencatan senjata! Dilarang saling serang 24 jam.`);

        await db.saveData(data);
        res.json({ success: true, message: `🕊️ Gencatan senjata diterima! Kamu dan ${fromNation.name} kini aman 24 jam.`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🤝  SISTEM ALIANSI
// ═══════════════════════════════════════════════════════════════
async function ajukanAliansi(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!targetUsername || targetUsername === username) return res.status(400).json({ success: false, message: 'Target tidak valid.' });

        const tNation = data.nations[targetUsername];
        if (!tNation) return res.status(400).json({ success: false, message: 'Target tidak punya negara.' });
        if (nation.aliansi.includes(targetUsername)) return res.status(400).json({ success: false, message: 'Sudah bersekutu.' });
        if (nation.aliansi.length >= CFG.MAX_ALIANSI) return res.status(400).json({ success: false, message: `Maks ${CFG.MAX_ALIANSI} aliansi.` });

        data.pending.aliansi[`${username}_${targetUsername}`] = { from: username, to: targetUsername, time: now };
        data.nations[username] = nation;

        pushNotif(data, targetUsername, `🤝 "${nation.name}" mengajak aliansi strategis! Terima atau tolak di menu Diplomasi.`);

        await db.saveData(data);
        res.json({ success: true, message: `📬 Tawaran aliansi dikirim ke ${tNation.name}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function terimaAliansi(req, res) {
    try {
        const { username } = req.user;
        const { fromUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!data.pending.aliansi?.[`${fromUsername}_${username}`]) return res.status(400).json({ success: false, message: 'Tidak ada tawaran aliansi dari user itu.' });

        const fromNation = sanitizeNation(data.nations[fromUsername]);
        if (!fromNation) return res.status(400).json({ success: false, message: 'Negara pengaju sudah tidak ada.' });

        if (!nation.aliansi.includes(fromUsername))     nation.aliansi.push(fromUsername);
        if (!fromNation.aliansi.includes(username))     fromNation.aliansi.push(username);

        delete data.pending.aliansi[`${fromUsername}_${username}`];
        data.nations[username]   = nation;
        data.nations[fromUsername] = fromNation;

        pushNotif(data, fromUsername, `🎉 "${nation.name}" menerima aliansimu! Kalian kini saling melindungi dalam perang!`);

        await db.saveData(data);
        res.json({ success: true, message: `🤝 Aliansi terbentuk! ${nation.name} & ${fromNation.name} kini bersekutu!`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function tolakAliansi(req, res) {
    try {
        const { username } = req.user;
        const { fromUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        if (data.pending.aliansi?.[`${fromUsername}_${username}`]) {
            const fromNation = data.nations[fromUsername];
            delete data.pending.aliansi[`${fromUsername}_${username}`];
            pushNotif(data, fromUsername, `❌ Tawaran aliansimu ditolak oleh "${data.nations[username]?.name || username}".`);
            await db.saveData(data);
        }

        res.json({ success: true, message: '❌ Tawaran aliansi ditolak.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function bubarAliansi(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const tNation = sanitizeNation(data.nations[targetUsername]);
        nation.aliansi = nation.aliansi.filter(id => id !== targetUsername);
        if (tNation) tNation.aliansi = tNation.aliansi.filter(id => id !== username);

        data.nations[username] = nation;
        if (tNation) {
            data.nations[targetUsername] = tNation;
            pushNotif(data, targetUsername, `⚠️ "${nation.name}" memutuskan aliansi denganmu secara sepihak.`);
        }

        await db.saveData(data);
        res.json({ success: true, message: `✅ Aliansi dengan ${tNation?.name || targetUsername} diputuskan.`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 📋  SENSUS
// ═══════════════════════════════════════════════════════════════
async function sensus(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (nation.treasury < CFG.BIAYA_SENSUS) return res.status(400).json({ success: false, message: `Sensus butuh Rp ${fmt(CFG.BIAYA_SENSUS)} dari kas.` });

        nation.treasury -= CFG.BIAYA_SENSUS;
        data.nations[username] = nation;

        const power = hitungPower(nation);
        const pajak = hitungPajak(nation);
        const rank  = Object.values(data.nations).sort((a,b) => hitungPower(b)-hitungPower(a)).findIndex(n => n.name === nation.name) + 1;
        const total = Object.keys(data.nations).length;
        const winRate = nation.totalPerang > 0 ? Math.round((nation.totalMenang/nation.totalPerang)*100) : 0;

        await db.saveData(data);
        res.json({ success: true, nation, power, pajak, rank, total, winRate });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// ✏️  RENAME & RESET
// ═══════════════════════════════════════════════════════════════
async function rename(req, res) {
    try {
        const { username } = req.user;
        const { nama } = req.body;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const biaya = 1_000_000_000;
        if (nation.treasury < biaya) return res.status(400).json({ success: false, message: `Biaya rename: Rp ${fmt(biaya)} dari kas.` });

        const namaBersih = (nama || '').trim();
        if (!namaBersih || namaBersih.length > 25) return res.status(400).json({ success: false, message: 'Nama tidak valid (maks 25 karakter).' });
        if (Object.values(data.nations).some(n => n.name?.toLowerCase() === namaBersih.toLowerCase())) return res.status(400).json({ success: false, message: 'Nama sudah dipakai!' });

        const namaLama = nation.name;
        nation.treasury -= biaya;
        nation.name      = namaBersih;
        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, message: `✅ Negara berhasil direname: ${namaLama} → ${namaBersih}`, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function resetNation(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);

        if (!data.nations[username]) return res.status(400).json({ success: false, message: 'Kamu tidak punya negara.' });
        const nama = data.nations[username].name;
        delete data.nations[username];
        await db.saveData(data);

        res.json({ success: true, message: `✅ Negara "${nama}" telah dihapus. Buat ulang dengan tombol Dirikan Negara.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🌍  TOP NEGARA (LIST)
// ═══════════════════════════════════════════════════════════════
async function topNegara(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const list = Object.entries(data.nations)
            .map(([uname, nation]) => {
                const n = sanitizeNation({...nation});
                return {
                    username: uname,
                    name: n.name,
                    power: hitungPower(n),
                    population: n.population,
                    defense: n.defense,
                    stability: n.stability,
                    statusStab: statusStab(n.stability),
                    statusMil: statusMiliter(n.defense),
                    treasury: n.treasury,
                    rudal: n.rudal,
                    bomNuklir: n.bomNuklir,
                    bentengLv: n.buildings?.benteng || 0,
                    aliansiCount: n.aliansi?.length || 0,
                    perisaiOn: n.perisai > now,
                    winRate: n.totalPerang > 0 ? Math.round((n.totalMenang/n.totalPerang)*100) : 0,
                    isMe: uname === username,
                };
            })
            .sort((a, b) => b.power - a.power);

        res.json({ success: true, list });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔭  STATS NEGARA TARGET (publik, terbatas)
// ═══════════════════════════════════════════════════════════════
async function statsNegara(req, res) {
    try {
        const { username } = req.user;
        const { targetUsername } = req.params;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const target = sanitizeNation(data.nations[targetUsername]);
        if (!target) return res.status(404).json({ success: false, message: 'Target tidak punya negara.' });

        // Info publik terbatas (tanpa detail kas, rudal, bom)
        res.json({
            success: true,
            stats: {
                name: target.name,
                power: hitungPower(target),
                stability: target.stability,
                statusStab: statusStab(target.stability),
                statusMil: statusMiliter(target.defense),
                population: Math.round(target.population / 1000) * 1000,
                perisaiOn: target.perisai > now,
                aliansiCount: target.aliansi?.length || 0,
                totalPerang: target.totalPerang || 0,
                winRate: target.totalPerang > 0 ? Math.round((target.totalMenang/target.totalPerang)*100) : 0,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔔  NOTIFIKASI
// ═══════════════════════════════════════════════════════════════
async function getNotifikasi(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        if (!data.notifications) data.notifications = {};

        const notifs = (data.notifications[username] || []).slice().reverse();
        res.json({ success: true, notifikasi: notifs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function clearNotifikasi(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        if (data.notifications) data.notifications[username] = [];
        await db.saveData(data);
        res.json({ success: true, message: 'Notifikasi dihapus.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// ═══════════════════════════════════════════════════════════════
// 🕵️  MISI SPIONASE (semua misi rahasia)
// ═══════════════════════════════════════════════════════════════
async function misiSpy(req, res) {
    try {
        const { username } = req.user;
        const { jenis, targetUsername } = req.body;
        const data = db.getData();
        ensureNationsDB(data);
        const now = Date.now();

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });
        if (!nation.buildings.intel) return res.status(400).json({ success: false, message: 'Butuh Markas Intelijen!' });
        if (!targetUsername || targetUsername === username) return res.status(400).json({ success: false, message: 'Target tidak valid.' });

        const misi = CFG.MISI_SPY[jenis];
        if (!misi) return res.status(400).json({ success: false, message: 'Jenis misi tidak valid.' });
        if ((nation.buildings.intel || 0) < misi.intel_min) return res.status(400).json({ success: false, message: `Misi "${misi.nama}" butuh Markas Intelijen Level ${misi.intel_min}+.` });

        const sisaCd = CFG.CD_SPY - (now - (nation.lastSpy || 0));
        if (sisaCd > 0) return res.status(400).json({ success: false, message: `Agen masih dalam operasi. Siap lagi dalam ${jamStr(sisaCd)}.` });
        if (nation.treasury < misi.biaya) return res.status(400).json({ success: false, message: `Kas kurang Rp ${fmt(misi.biaya)} untuk operasi ini.` });

        const targetNation = sanitizeNation(data.nations[targetUsername]);
        if (!targetNation) return res.status(400).json({ success: false, message: 'Target tidak punya negara.' });

        if (!['spionase','sadap'].includes(jenis) && targetNation.perisai > now) {
            return res.status(400).json({ success: false, message: 'Operasi diblokir! Target mengaktifkan perisai.' });
        }

        // Counter-Intel
        const counterBase = (targetNation.buildings.intel || 0) * 0.08 + (targetNation.buildings.penjara || 0) * 0.10;
        const tertangkap  = Math.random() < counterBase;

        nation.treasury -= misi.biaya;
        nation.lastSpy   = now;

        if (tertangkap) {
            const denda = Math.floor(nation.treasury * 0.05);
            nation.treasury = Math.max(0, nation.treasury - denda);
            data.nations[username] = nation;
            pushNotif(data, targetUsername, `🚨 Sistem keamanan "${targetNation.name}" mendeteksi penyusup asing! Agen berhasil ditangkap.`);
            await db.saveData(data);
            return res.json({
                success: false,
                message: `❌ OPERASI GAGAL — AGEN TERTANGKAP! Denda: -Rp ${fmt(denda)}. Target hanya tahu ada penyusup, bukan identitasmu.`,
                nation,
            });
        }

        let suksesRate = misi.sukses;
        if (nation.riset?.agen_elite) suksesRate = Math.min(0.95, suksesRate + 0.15);
        const sukses = Math.random() < suksesRate;

        let logHasil = '';
        let replyMsg  = '';
        let detail   = null;

        // ── SPIONASE ──
        if (jenis === 'spionase') {
            if (sukses) {
                const risetTarget    = Object.keys(targetNation.riset||{}).filter(k=>targetNation.riset[k]).map(k=>CFG.RISET[k]?.nama||k).join(', ') || 'Tidak ada';
                const aliansiTarget  = (targetNation.aliansi||[]).map(id=>data.nations[id]?.name||'?').join(', ') || 'Tidak ada';
                logHasil = `Kas: Rp ${fmt(targetNation.treasury)} | Tentara: ${fmt(targetNation.defense)} | Stab: ${targetNation.stability}% | Rudal: ${targetNation.rudal}`;
                replyMsg = `✅ Spionase berhasil! Data rahasia ${targetNation.name} terkuak.`;
                detail = {
                    kas: targetNation.treasury,
                    tentara: targetNation.defense,
                    benteng: targetNation.buildings.benteng,
                    bank: targetNation.buildings.bank,
                    intel: targetNation.buildings.intel,
                    radar: targetNation.buildings.radar,
                    silo: targetNation.buildings.silo,
                    rudal: targetNation.rudal,
                    bomNuklir: targetNation.bomNuklir,
                    stabilitas: targetNation.stability,
                    perisaiOn: targetNation.perisai > now,
                    perisaiHingga: targetNation.perisai > now ? new Date(targetNation.perisai).toLocaleTimeString('id-ID') : null,
                    riset: risetTarget,
                    aliansi: aliansiTarget,
                };
            } else {
                logHasil = 'Gagal menembus keamanan target.';
                replyMsg = '❌ Spionase gagal! Agen tidak berhasil masuk sistem.';
            }
        }
        // ── SADAP ──
        else if (jenis === 'sadap') {
            if (sukses) {
                const sekutuTarget = (targetNation.aliansi||[]).map(id => {
                    const n = data.nations[id];
                    return n ? `${n.name} (Power: ${fmt(hitungPower(n))})` : '?';
                });
                const lastAttack = targetNation.lastAttack > 0 ? new Date(targetNation.lastAttack).toLocaleString('id-ID') : 'Belum pernah';
                logHasil = 'Sadap sukses: Aliansi & rencana target terungkap.';
                replyMsg = `✅ Penyadapan berhasil! Jaringan aliansi ${targetNation.name} terkuak.`;
                detail = {
                    sekutu: sekutuTarget,
                    lastAttack,
                    totalPerang: targetNation.totalPerang || 0,
                    winRate: targetNation.totalPerang > 0 ? Math.round((targetNation.totalMenang||0)/targetNation.totalPerang*100) : 0,
                    bangunan: Object.entries(targetNation.buildings).filter(([,v])=>v>0).map(([k,v])=>`${CFG.BANGUNAN[k]?.nama||k} Lv.${v}`),
                };
            } else {
                logHasil = 'Penyadapan gagal, sinyal terdeteksi.';
                replyMsg = '❌ Sadap gagal! Sinyal penyadapan terdeteksi.';
            }
        }
        // ── SABOTASE ──
        else if (jenis === 'sabotase') {
            if (sukses) {
                const bList = Object.keys(targetNation.buildings).filter(k => (targetNation.buildings[k]||0) > 0);
                if (!bList.length) {
                    logHasil = 'Tidak ada bangunan untuk disabotase.';
                    replyMsg = '❌ Target tidak punya bangunan. Operasi sia-sia.';
                } else {
                    const tgt = bList[Math.floor(Math.random()*bList.length)];
                    targetNation.buildings[tgt] = Math.max(0, targetNation.buildings[tgt] - 1);
                    data.nations[targetUsername] = targetNation;
                    logHasil = `${CFG.BANGUNAN[tgt]?.nama||tgt} turun 1 level.`;
                    replyMsg = `💣 Sabotase berhasil! ${CFG.BANGUNAN[tgt]?.nama||tgt} di "${targetNation.name}" rusak 1 level!`;
                    pushNotif(data, targetUsername, `⚠️ INSIDEN INFRASTRUKTUR! ${CFG.BANGUNAN[tgt]?.nama||tgt} mengalami kerusakan misterius di "${targetNation.name}"! Kemungkinan sabotase...`);
                }
            } else {
                logHasil = 'Sabotase gagal, agen mundur.';
                replyMsg = '❌ Sabotase gagal! Agen mundur tanpa hasil.';
            }
        }
        // ── TEROR ──
        else if (jenis === 'teror') {
            if (sukses) {
                const drop = Math.floor(Math.random()*25) + 10;
                targetNation.stability = Math.max(0, targetNation.stability - drop);
                data.nations[targetUsername] = targetNation;
                logHasil = `Stabilitas turun ${drop}% → ${targetNation.stability}%.`;
                replyMsg = `💥 Operasi teror berhasil! Stabilitas "${targetNation.name}" -${drop}% → ${targetNation.stability}%`;
                pushNotif(data, targetUsername, `🔥 KERUSUHAN DALAM NEGERI! Rakyat "${targetNation.name}" bergejolak! Stabilitas turun drastis. Gunakan propaganda untuk menenangkan.`);
            } else {
                logHasil = 'Propaganda tidak mempan.';
                replyMsg = '❌ Operasi teror gagal! Rakyat target tidak terpancing.';
            }
        }
        // ── KUDETA ──
        else if (jenis === 'kudeta') {
            if (sukses) {
                const kehDef   = Math.floor(targetNation.defense * (0.20 + Math.random()*0.15));
                const kehKas   = Math.floor(targetNation.treasury * (0.15 + Math.random()*0.15));
                const stabDrop = Math.floor(Math.random()*35) + 20;
                targetNation.defense   = Math.max(0, targetNation.defense - kehDef);
                targetNation.treasury  = Math.max(0, targetNation.treasury - kehKas);
                targetNation.stability = Math.max(0, targetNation.stability - stabDrop);
                data.nations[targetUsername] = targetNation;
                logHasil = `Kudeta sukses. Def -${fmt(kehDef)}, Kas -Rp ${fmt(kehKas)}, Stab -${stabDrop}%.`;
                replyMsg = `👑 Kudeta berhasil! Def musuh -${fmt(kehDef)} | Kas -Rp ${fmt(kehKas)} | Stab -${stabDrop}%`;
                pushNotif(data, targetUsername, `🔥 KUDETA! Jenderal-jenderal "${targetNation.name}" memberontak! Perbendaharaan dijarah!`);
                if (targetNation.stability <= 0) {
                    pushNotif(data, targetUsername, `🏴 NEGARAMU RUNTUH! Kudeta berhasil menggulingkan "${targetNation.name}"! Buat negara baru.`);
                    delete data.nations[targetUsername];
                }
            } else {
                logHasil = 'Rencana kudeta bocor, agen kabur.';
                replyMsg = '❌ Kudeta gagal! Pasukan setia berhasil memadamkan pemberontakan.';
            }
        }
        // ── RACUN ──
        else if (jenis === 'racun') {
            if (sukses) {
                const racunMult = nation.riset?.bioweapon ? 2.0 : 1.0;
                const kehDef = Math.floor(targetNation.defense * (0.10 + Math.random()*0.10) * racunMult);
                targetNation.defense = Math.max(0, targetNation.defense - kehDef);
                data.nations[targetUsername] = targetNation;
                logHasil = `Racun membunuh ${fmt(kehDef)} tentara.`;
                replyMsg = `☠️ Operasi racun berhasil! ${fmt(kehDef)} tentara "${targetNation.name}" tewas!`;
                pushNotif(data, targetUsername, `☠️ WABAH DI BARAK MILITER! Sejumlah besar tentara "${targetNation.name}" tiba-tiba meninggal! Korban: ${fmt(kehDef)}.`);
            } else {
                logHasil = 'Antidot ditemukan target.';
                replyMsg = '❌ Operasi racun gagal! Target punya sistem deteksi bio-ancaman.';
            }
        }
        // ── SUAP ──
        else if (jenis === 'suap') {
            if (sukses) {
                const jenderal = Math.floor(targetNation.defense * (0.05 + Math.random()*0.08));
                targetNation.defense = Math.max(0, targetNation.defense - jenderal);
                nation.defense = (nation.defense || 0) + Math.floor(jenderal * 0.5);
                data.nations[targetUsername] = targetNation;
                logHasil = `${fmt(jenderal)} tentara membelot. ${fmt(Math.floor(jenderal*0.5))} bergabung ke kita.`;
                replyMsg = `💰 Suap berhasil! Tentara musuh membelot -${fmt(jenderal)} | Bergabung ke kita +${fmt(Math.floor(jenderal*0.5))}`;
                pushNotif(data, targetUsername, `⚠️ DESERSI MASSAL! Sejumlah jenderal "${targetNation.name}" membelot tanpa alasan jelas!`);
            } else {
                logHasil = 'Suap ditolak.';
                replyMsg = '❌ Suap gagal! Jenderal menolak & melaporkan.';
            }
        }
        // ── CURI ──
        else if (jenis === 'curi') {
            if (sukses) {
                const jumlahCuri = Math.floor(targetNation.treasury * (0.05 + Math.random()*0.08));
                targetNation.treasury = Math.max(0, targetNation.treasury - jumlahCuri);
                nation.treasury = (nation.treasury || 0) + jumlahCuri;
                data.nations[targetUsername] = targetNation;
                logHasil = `Mencuri Rp ${fmt(jumlahCuri)} dari kas musuh.`;
                replyMsg = `💸 Pencurian berhasil! +Rp ${fmt(jumlahCuri)} masuk kas negaramu!`;
                pushNotif(data, targetUsername, `⚠️ ANOMALI KEUANGAN! Rp ${fmt(jumlahCuri)} hilang dari perbendaharaan "${targetNation.name}". Kemungkinan pencurian...`);
            } else {
                logHasil = 'Sistem keamanan bank target terlalu kuat.';
                replyMsg = '❌ Pencurian gagal! Sistem keamanan bank target terlalu canggih.';
            }
        }

        // Simpan log misi
        if (!nation.spyLog) nation.spyLog = [];
        nation.spyLog.push({ jenis, targetName: targetNation.name, time: now, hasil: logHasil, sukses });
        if (nation.spyLog.length > 20) nation.spyLog = nation.spyLog.slice(-20);

        data.nations[username] = nation;
        await db.saveData(data);

        res.json({ success: true, sukses, message: replyMsg, detail, nation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function laporanMata(req, res) {
    try {
        const { username } = req.user;
        const data = db.getData();
        ensureNationsDB(data);

        const nation = sanitizeNation(data.nations[username]);
        if (!nation) return res.status(400).json({ success: false, message: 'Belum punya negara.' });

        const logs = (nation.spyLog || []).slice().reverse().map(l => ({
            ...l,
            misiNama: CFG.MISI_SPY[l.jenis]?.nama || l.jenis,
            timeStr: new Date(l.time).toLocaleString('id-ID'),
        }));

        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getDashboard,
    buatNegara,
    bangun,
    demolish,
    riset,
    pungutPajak,
    rekrut,
    demobilisasi,
    subsidi,
    tarikKas,
    korupsi,
    propaganda,
    bangunRudal,
    bangunBom,
    perisai,
    serang,
    serangUdara,
    blokade,
    gencatan,
    terimaGencatan,
    ajukanAliansi,
    terimaAliansi,
    tolakAliansi,
    bubarAliansi,
    sensus,
    rename,
    resetNation,
    topNegara,
    statsNegara,
    getNotifikasi,
    clearNotifikasi,
    misiSpy,
    laporanMata,
};