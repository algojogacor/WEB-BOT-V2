// controllers/features/aiController.js — Chat AI & Image Generator
const axios = require('axios');
const { getUserGameData } = require('../userController');
const db = require('../../config/database');
const { fmt } = require('../../utils/helpers');

// Harga untuk memakai AI (dalam kurs uang game)
const TARIF_CHAT = 50000;    // Rp 50.000 per chat
const TARIF_IMAGINE = 150000; // Rp 150.000 per gambar

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

async function chat(req, res) {
    const { username } = req.user;
    const { message, model = 'openai/gpt-4o-mini' } = req.body;
    
    if (!message?.trim()) return res.status(400).json({ success: false, message: '❌ Pesan tidak boleh kosong.' });

    // Cek dan potong saldo pemain
    const { source, data: u } = getUserGameData(username);
    if ((u.balance || 0) < TARIF_CHAT) {
        return res.status(400).json({ success: false, message: `❌ Saldo tidak cukup. Butuh Rp${fmt(TARIF_CHAT)} untuk chat AI.` });
    }

    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model,
            messages: [
                { role: 'system', content: 'Kamu adalah AlgojoGacor AI, asisten cerdas berbahasa Indonesia yang ramah, kocak, dan informatif. Berikan jawaban yang ringkas namun bermanfaat.' },
                { role: 'user',   content: message }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
                'X-Title': 'AlgojoGacor Web',
            },
            timeout: 30_000,
        });

        const reply = response.data.choices?.[0]?.message?.content || 'Maaf, otak AI sedang nge-blank.';
        
        // Potong saldo setelah berhasil
        u.balance -= TARIF_CHAT;
        await saveU(username, u, source);

        res.json({ success: true, reply, sisaSaldo: u.balance });
    } catch (err) {
        console.error('OpenRouter error:', err.response?.data || err.message);
        res.status(500).json({ success: false, message: 'Gagal menghubungi AI. Coba lagi nanti.' });
    }
}

async function imagine(req, res) {
    const { username } = req.user;
    const { prompt } = req.body;

    if (!prompt?.trim()) return res.status(400).json({ success: false, message: '❌ Prompt gambar tidak boleh kosong.' });

    // Cek dan potong saldo pemain
    const { source, data: u } = getUserGameData(username);
    if ((u.balance || 0) < TARIF_IMAGINE) {
        return res.status(400).json({ success: false, message: `❌ Saldo tidak cukup. Butuh Rp${fmt(TARIF_IMAGINE)} untuk generate gambar.` });
    }

    try {
        const encodedPrompt = encodeURIComponent(prompt);
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        // Taruh API Key Pollinations kamu di sini
        const API_KEY = 'sk_uBR94lDs7KOUlMknbnvm7C3NCOSGUwLp'; 
        
        // URL tujuan (menggunakan model flux sesuai dokumentasi)
        const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=512&height=512&nologo=true&seed=${randomSeed}`;

        // Mendownload gambar menggunakan Axios dan API Key
        const response = await axios.get(pollinationsUrl, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            },
            responseType: 'arraybuffer', // WAJIB ADA: Agar file gambar tidak rusak
            timeout: 45000 // Timeout 45 detik karena generate gambar butuh waktu
        });

        // Ubah data gambar menjadi format Base64 (teks) agar bisa dibaca oleh tag <img> di HTML
        const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;

        // Potong saldo setelah berhasil
        u.balance -= TARIF_IMAGINE;
        await saveU(username, u, source);

        // Kirim gambar Base64 ke frontend
        res.json({ success: true, prompt: prompt, imageUrl: imageUrl, sisaSaldo: u.balance });
    } catch (err) {
        console.error('Imagine error:', err.response?.data ? err.response.data.toString() : err.message);
        res.status(500).json({ success: false, message: 'Gagal merender gambar dari server Pollinations.' });
    }
}
module.exports = { chat, imagine };