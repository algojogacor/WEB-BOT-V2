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
        // Menggunakan Pollinations.ai (Gratis, cepat, dan mengembalikan format gambar langsung)
        // Kita encode prompt agar aman dikirim ke URL
        const encodedPrompt = encodeURIComponent(prompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;
        
        // Cukup format balasannya ke frontend dengan tag HTML atau sekadar URL
        const reply = `Berikut adalah gambar dari: *${prompt}* \n\n<img src="${imageUrl}" alt="AI Generated Image" style="max-width:100%; border-radius:10px; margin-top:10px;" />`;

        // Potong saldo setelah berhasil
        u.balance -= TARIF_IMAGINE;
        await saveU(username, u, source);

        res.json({ success: true, reply, sisaSaldo: u.balance });
    } catch (err) {
        console.error('Imagine error:', err);
        res.status(500).json({ success: false, message: 'Gagal merender gambar.' });
    }
}

module.exports = { chat, imagine };