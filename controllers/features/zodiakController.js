// ============================================================
//  controllers/features/zodiakController.js
//  Horoskop harian berbasis AI (OpenRouter) — port dari zodiak.js WA Bot
//  Rate limit: 1 request/zodiak/hari per user (cache di DB)
// ============================================================

const axios  = require('axios');
const db     = require('../../config/database');

const VALID_ZODIAK = [
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces'
];

const ZODIAK_DESC = {
  aries: 'Aries, yang lahir 21 Maret–19 April, adalah bintang api dipimpin Mars — berani, energik, dan selalu menjadi yang pertama.',
  taurus: 'Taurus, yang lahir 20 April–20 Mei, adalah bintang bumi dipimpin Venus — tekun, setia, dan mencintai kenyamanan.',
  gemini: 'Gemini, yang lahir 21 Mei–20 Juni, adalah bintang udara dipimpin Merkurius — adaptif, komunikatif, penuh ide.',
  cancer: 'Cancer, yang lahir 21 Juni–22 Juli, adalah bintang air dipimpin Bulan — intuitif, penuh empati, dan protektif.',
  leo: 'Leo, yang lahir 23 Juli–22 Agustus, adalah bintang api dipimpin Matahari — karismatik, percaya diri, dan murah hati.',
  virgo: 'Virgo, yang lahir 23 Agustus–22 September, adalah bintang bumi dipimpin Merkurius — analitis, perfeksionis, dan pekerja keras.',
  libra: 'Libra, yang lahir 23 September–22 Oktober, adalah bintang udara dipimpin Venus — diplomatis, adil, dan mencintai harmoni.',
  scorpio: 'Scorpio, yang lahir 23 Oktober–21 November, adalah bintang air dipimpin Pluto — intens, misterius, dan penuh tekad.',
  sagittarius: 'Sagittarius, yang lahir 22 November–21 Desember, adalah bintang api dipimpin Jupiter — petualang, optimis, dan jujur.',
  capricorn: 'Capricorn, yang lahir 22 Desember–19 Januari, adalah bintang bumi dipimpin Saturnus — ambisius, disiplin, dan realistis.',
  aquarius: 'Aquarius, yang lahir 20 Januari–18 Februari, adalah bintang udara dipimpin Uranus — inovatif, humanis, dan tidak konvensional.',
  pisces: 'Pisces, yang lahir 19 Februari–20 Maret, adalah bintang air dipimpin Neptunus — imajinatif, peka, dan penuh empati.',
};

// ── Helper: cache horoskop harian ────────────────────────────
function getCacheKey(zodiak) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `horoscope_${zodiak}_${today}`;
}

function getCache(zodiak) {
  const data = db.getData();
  const key  = getCacheKey(zodiak);
  return data._zodiakCache?.[key] || null;
}

async function setCache(zodiak, text) {
  const data = db.getData();
  if (!data._zodiakCache) data._zodiakCache = {};
  // Bersihkan cache lama (lebih dari 2 hari)
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 2);
  for (const k of Object.keys(data._zodiakCache)) {
    const dateStr = k.split('_').pop();
    if (dateStr && new Date(dateStr) < cutoff) delete data._zodiakCache[k];
  }
  data._zodiakCache[getCacheKey(zodiak)] = text;
  await db.saveData(data);
}

// ══════════════════════════════════════════════════════════════
//  POST /api/features/zodiak/horoskop
//  Body: { zodiak: 'aries' }
// ══════════════════════════════════════════════════════════════
async function getHoroskop(req, res) {
  const { zodiak } = req.body;

  if (!zodiak || !VALID_ZODIAK.includes(zodiak.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Zodiak tidak valid.' });
  }

  const z = zodiak.toLowerCase();

  // Cek cache dulu — sama untuk semua user (horoskop harian global per zodiak)
  const cached = getCache(z);
  if (cached) return res.json({ success: true, zodiak: z, horoskop: cached, cached: true });

  // Kalau tidak ada API key, pakai fallback
  if (!process.env.OPENROUTER_API_KEY) {
    return res.json({ success: true, zodiak: z, horoskop: getFallback(z) });
  }

  try {
    const today = new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const prompt = `Kamu adalah astrolog Indonesia yang berpengalaman. Tulis horoskop harian untuk zodiak ${z.charAt(0).toUpperCase()+z.slice(1)} pada hari ${today}. ${ZODIAK_DESC[z]} Tulis horoskop sekitar 3-4 kalimat yang mencakup aspek umum, keuangan, dan hubungan. Bahasa Indonesia yang santai namun insightful. Tanpa heading, langsung isi horoskopnya saja.`;

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'google/gemma-3-4b-it:free',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.8,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://algojo.com',
        'X-Title': 'AlgojoGacor Zodiak',
      },
      timeout: 20_000,
    });

    const text = response.data?.choices?.[0]?.message?.content?.trim();
    if (text) {
      await setCache(z, text);
      return res.json({ success: true, zodiak: z, horoskop: text });
    }
    throw new Error('AI tidak menghasilkan teks');

  } catch (err) {
    console.error('Zodiak AI error:', err.message);
    // Fallback tanpa error ke client
    const fallback = getFallback(z);
    return res.json({ success: true, zodiak: z, horoskop: fallback, ai: false });
  }
}

// ── Fallback horoskop jika AI tidak tersedia ─────────────────
function getFallback(z) {
  const pool = [
    `Hari ini energimu bersinar cerah, ${z.charAt(0).toUpperCase()+z.slice(1)}. Momentum sedang berpihak padamu untuk membuat keputusan penting. Secara finansial, hindari pengeluaran yang tidak perlu. Dalam hubungan, komunikasikan perasaanmu dengan jujur dan terbuka.`,
    `Pekan ini membawa peluang baru yang tidak terduga. Tetaplah fokus dan jangan biarkan gangguan kecil mengalihkanmu dari tujuan. Keuangan mulai stabil, dan ini saat tepat untuk sedikit berinvestasi. Hubunganmu dengan orang terdekat semakin erat.`,
    `Bintangmu sedang bersinar! Alam semesta mendukung langkahmu hari ini. Jaga kesehatan fisik dan mental dengan baik. Finansial menunjukkan tanda positif, namun tetap bijak dalam pengelolaan. Cinta dan persahabatan membawa kebahagiaan yang tulus.`,
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { getHoroskop };