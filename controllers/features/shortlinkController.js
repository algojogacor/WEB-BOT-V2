// ============================================================
//  controllers/features/shortlinkController.js
//  URL Shortener + Unshortener — port dari BOT-WA-1 shortlink.js
// ============================================================

const axios = require('axios');

// ── Provider functions ────────────────────────────────────────
const PROVIDERS = {
  tinyurl: async (url) => {
    const res = await axios.get(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    return res.data?.startsWith('http') ? { shortUrl: res.data, provider: 'tinyurl' } : null;
  },
  isgd: async (url) => {
    const res = await axios.get(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      { timeout: 8000 }
    );
    return res.data?.startsWith('http') ? { shortUrl: res.data, provider: 'is.gd' } : null;
  },
  vgd: async (url) => {
    const res = await axios.get(
      `https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      { timeout: 8000 }
    );
    return res.data?.startsWith('http') ? { shortUrl: res.data, provider: 'v.gd' } : null;
  }
};

function isValidUrl(str) {
  try { const u = new URL(str); return ['http:','https:'].includes(u.protocol); } catch { return false; }
}

// ── POST /api/features/tools/shorten ─────────────────────────
async function shorten(req, res) {
  const { url, provider = 'auto' } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ success: false, message: 'URL tidak valid.' });
  }

  try {
    if (provider !== 'auto' && PROVIDERS[provider]) {
      const result = await PROVIDERS[provider](url);
      if (result) return res.json({ success: true, ...result, originalUrl: url });
    }

    // Auto: coba semua provider, gunakan yang berhasil pertama
    for (const [name, fn] of Object.entries(PROVIDERS)) {
      try {
        const result = await fn(url);
        if (result) return res.json({ success: true, ...result, originalUrl: url });
      } catch { /* coba berikutnya */ }
    }

    res.status(500).json({ success: false, message: 'Semua provider gagal. Coba lagi.' });
  } catch (err) {
    console.error('Shorten error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal mempersingkat URL.' });
  }
}

// ── POST /api/features/tools/unshorten ───────────────────────
async function unshorten(req, res) {
  const { url } = req.body;
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ success: false, message: 'URL tidak valid.' });
  }
  try {
    // Follow redirects untuk dapat URL final
    const response = await axios.get(url, {
      maxRedirects: 10,
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      validateStatus: () => true
    });
    const finalUrl = response.request?.res?.responseUrl || response.config?.url || url;
    res.json({ success: true, originalUrl: finalUrl, statusCode: response.status });
  } catch (err) {
    // Kalau timeout/error, mungkin URL-nya valid tapi tidak bisa diakses
    const redir = err.response?.headers?.location;
    if (redir) return res.json({ success: true, originalUrl: redir });
    res.status(500).json({ success: false, message: 'Gagal mengungkap URL: ' + err.message });
  }
}

module.exports = { shorten, unshorten };