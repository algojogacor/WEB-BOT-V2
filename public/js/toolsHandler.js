// ============================================================
//  public/js/toolsHandler.js — Tools & Utilitas Frontend
//  Tab: QR Code, Password, Encode/Hash, Cuaca, Berita, TTS, Remove BG
//  Berkomunikasi ke /api/features/tools/* dan /api/features/tts
// ============================================================

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function initTools() {
  if (!requireLogin()) return;
  const user = getUser();
  if (user) {
    document.getElementById('sidebar-username').textContent = user.username;
    document.getElementById('sidebar-avatar').textContent = user.username[0].toUpperCase();
  }
}

// ══════════════════════════════════════════════════════════════
//  TAB SWITCH
// ══════════════════════════════════════════════════════════════
function switchTab(tab, el) {
  document.querySelectorAll('[id^="tab-"]').forEach(e => { e.style.display = 'none'; });
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = '';
  el.classList.add('active');
}

// ══════════════════════════════════════════════════════════════
//  QR CODE
// ══════════════════════════════════════════════════════════════
function generateQR() {
  const text  = document.getElementById('qr-text').value.trim();
  if (!text) return showToast('error', '⚠️ Masukkan teks atau URL!');
  const size  = document.getElementById('qr-size').value || '512';
  const color = document.getElementById('qr-color').value || '000000';
  const url   = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=FFFFFF&color=${color}&ecc=M`;

  const img     = document.getElementById('qr-img');
  const result  = document.getElementById('qr-result');
  img.src       = '';
  result.style.display = 'none';

  img.onload  = () => { result.style.display = ''; };
  img.onerror = () => showToast('error', '❌ Gagal generate QR.');
  img.src     = url;

  document.getElementById('qr-download').href = url;
}

function copyQrUrl() {
  const url = document.getElementById('qr-img').src;
  copyToClipboard(url, '✅ URL QR disalin!');
}

// ══════════════════════════════════════════════════════════════
//  PASSWORD GENERATOR (100% client-side, secure)
// ══════════════════════════════════════════════════════════════
let _passType = 'strong';

function selectPassType(type, el) {
  _passType = type;
  document.querySelectorAll('.pass-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function updateLenDisplay() {
  const v = document.getElementById('pass-len').value;
  document.getElementById('len-display').textContent = v;
}

function generatePassword() {
  const length = parseInt(document.getElementById('pass-len').value) || 16;
  const charsets = {
    strong:     'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?',
    simple:     'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    pin:        '0123456789',
    memorable:  'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789',
  };
  const chars = charsets[_passType] || charsets.strong;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let password = '';
  for (let i = 0; i < length; i++) password += chars[bytes[i] % chars.length];

  const entropy  = Math.floor(length * Math.log2(chars.length));
  const strength = entropy < 40 ? '🔴 Lemah' : entropy < 60 ? '🟡 Sedang' : entropy < 80 ? '🟢 Kuat' : '💪 Sangat Kuat';

  const out = document.getElementById('pass-output');
  out.textContent = password;
  out.style.display = '';
  document.getElementById('pass-actions').style.display = '';
  document.getElementById('pass-entropy').textContent = `Entropi: ~${entropy} bit — ${strength}`;
}

function copyPassword() {
  copyToClipboard(document.getElementById('pass-output').textContent, '✅ Password disalin!');
}

// ══════════════════════════════════════════════════════════════
//  ENCODE / DECODE / HASH (client-side)
// ══════════════════════════════════════════════════════════════
function doEncode(mode) {
  const input = document.getElementById('enc-input').value;
  let result  = '';
  try {
    switch (mode) {
      case 'base64-enc': result = btoa(unescape(encodeURIComponent(input))); break;
      case 'base64-dec': result = decodeURIComponent(escape(atob(input.trim()))); break;
      case 'url-enc':    result = encodeURIComponent(input); break;
      case 'url-dec':    result = decodeURIComponent(input); break;
      case 'uuid':
        result = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        break;
      case 'html-enc': result = input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); break;
      case 'html-dec': { const d=document.createElement('div'); d.innerHTML=input; result=d.textContent; break; }
      default: result = '❌ Mode tidak dikenali';
    }
  } catch (e) { result = '❌ Error: ' + e.message; }

  document.getElementById('enc-output').textContent = result;
  document.getElementById('enc-result').style.display = '';
}

function copyEncResult() {
  copyToClipboard(document.getElementById('enc-output').textContent, '✅ Hasil disalin!');
}

// ══════════════════════════════════════════════════════════════
//  CUACA
// ══════════════════════════════════════════════════════════════
function quickCuaca(kota) {
  document.getElementById('kota-input').value = kota;
  cekCuaca();
}

async function cekCuaca() {
  const kota = document.getElementById('kota-input').value.trim() || 'Jakarta';
  const btn  = document.getElementById('btn-cuaca');
  setBtn(btn, '⏳ Memuat...', true);
  document.getElementById('cuaca-result').innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">⏳ Mengambil data cuaca...</p>';

  try {
    const r = await api.get(`/features/tools/cuaca?kota=${encodeURIComponent(kota)}`);
    if (r && r.success) {
      document.getElementById('cuaca-result').innerHTML = `
        <div style="text-align:center;margin-bottom:16px">
          <div style="font-size:52px">🌤️</div>
          <h3 style="margin-bottom:4px">${r.kota}</h3>
          <p style="color:var(--text-secondary)">${r.cuaca}</p>
        </div>
        <div class="weather-grid">
          <div class="weather-card"><div class="w-icon">🌡️</div><div class="w-val">${r.suhu}</div><div class="w-lab">Suhu</div></div>
          <div class="weather-card"><div class="w-icon">💧</div><div class="w-val">${r.kelembaban}</div><div class="w-lab">Kelembaban</div></div>
          <div class="weather-card"><div class="w-icon">💨</div><div class="w-val">${r.angin}</div><div class="w-lab">Angin</div></div>
        </div>`;
    } else {
      document.getElementById('cuaca-result').innerHTML = `<p style="color:#e74c3c;text-align:center">❌ ${r?.message || 'Gagal mendapatkan data cuaca.'}</p>`;
    }
  } catch (e) {
    document.getElementById('cuaca-result').innerHTML = `<p style="color:#e74c3c;text-align:center">❌ Error: ${e.message}</p>`;
  }
  setBtn(btn, '🌤️ Cek', false);
}

// ══════════════════════════════════════════════════════════════
//  BERITA
// ══════════════════════════════════════════════════════════════
async function cariBerita() {
  const q   = document.getElementById('berita-query').value.trim() || 'Indonesia';
  const btn = document.getElementById('btn-berita');
  setBtn(btn, '⏳ Mencari...', true);
  document.getElementById('berita-result').innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">⏳ Mengambil berita...</p>';

  try {
    const r = await api.get(`/features/tools/berita?q=${encodeURIComponent(q)}`);
    if (r && r.success && r.articles?.length) {
      document.getElementById('berita-result').innerHTML = r.articles.slice(0, 8).map(a => `
        <div class="news-item">
          <div class="news-title" onclick="window.open(${JSON.stringify(a.url||'#')},'_blank')">${escHtml(a.title || 'Tanpa Judul')}</div>
          <div class="news-meta">📰 ${escHtml(a.source||'')} · ${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('id-ID') : ''}</div>
          ${a.description ? `<p style="font-size:12px;color:var(--text-secondary);margin-top:4px">${escHtml(a.description.substring(0,140))}...</p>` : ''}
        </div>`).join('');
    } else {
      document.getElementById('berita-result').innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:20px">Tidak ada berita untuk "${escHtml(q)}"</p>`;
    }
  } catch (e) {
    document.getElementById('berita-result').innerHTML = `<p style="color:#e74c3c;text-align:center">❌ Error: ${e.message}</p>`;
  }
  setBtn(btn, '🔍 Cari', false);
}

// ══════════════════════════════════════════════════════════════
//  TTS (Text-to-Speech)
// ══════════════════════════════════════════════════════════════
async function generateTTS() {
  const text  = document.getElementById('tts-text').value.trim();
  if (!text) return showToast('error', '⚠️ Masukkan teks!');
  if (text.length > 500) return showToast('error', '⚠️ Maksimal 500 karakter');

  const lang  = document.getElementById('tts-lang').value;
  const speed = document.getElementById('tts-speed').value;
  const btn   = document.getElementById('btn-tts');
  setBtn(btn, '⏳ Generating...', true);

  try {
    const r = await api.post('/features/tts', { text, lang, speed });
    const audio = document.getElementById('tts-audio');
    if (r && r.success && (r.audioUrl || r.audioBase64)) {
      audio.src = r.audioUrl || ('data:audio/mp3;base64,' + r.audioBase64);
      audio.style.display = 'block';
      audio.play();
      showToast('success', '✅ TTS berhasil diputar!');
    } else {
      throw new Error(r?.message || 'Server tidak menghasilkan audio');
    }
  } catch {
    // Fallback: gunakan Web Speech API bawaan browser
    _browserTTS(text, lang, speed);
  }
  setBtn(btn, '🔊 Generate TTS', false);
}

function _browserTTS(text, lang, speed) {
  if (!('speechSynthesis' in window)) return showToast('error', '❌ Browser tidak support TTS');
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = lang === 'id' ? 'id-ID' : lang === 'jv' ? 'jv-ID' : 'en-US';
  utter.rate  = speed === 'slow' ? 0.7 : speed === 'fast' ? 1.4 : 1.0;
  speechSynthesis.speak(utter);
  showToast('info', 'ℹ️ Menggunakan browser TTS (server tidak tersedia)');
}

// ══════════════════════════════════════════════════════════════
//  REMOVE BACKGROUND
// ══════════════════════════════════════════════════════════════
function previewBg(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('bg-preview-img').src = e.target.result;
    document.getElementById('bg-preview').style.display = '';
  };
  reader.readAsDataURL(file);
}

async function removeBg() {
  const file = document.getElementById('bg-file').files[0];
  if (!file) return showToast('error', '⚠️ Pilih gambar dulu!');

  const btn = document.getElementById('btn-removebg');
  setBtn(btn, '⏳ Memproses...', true);

  const reader = new FileReader();
  reader.onload = async e => {
    const base64 = e.target.result.split(',')[1];
    try {
      const r = await api.post('/features/tools/remove-bg', { imageBase64: base64 });
      if (r && r.success && r.image) {
        document.getElementById('bg-result-img').src = r.image;
        document.getElementById('bg-download').href = r.image;
        document.getElementById('bg-result').style.display = '';
        showToast('success', '✅ Background berhasil dihapus!');
      } else {
        showToast('error', '❌ ' + (r?.message || 'Gagal. Pastikan REMOVE_BG_API_KEY terpasang.'));
      }
    } catch (e) {
      showToast('error', '❌ Error: ' + e.message);
    }
    setBtn(btn, '✂️ Hapus Background', false);
  };
  reader.readAsDataURL(file);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function setBtn(btn, text, disabled) {
  if (!btn) return;
  btn.textContent = text;
  btn.disabled    = disabled;
}

function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('success', successMsg))
    .catch(() => {
      // Fallback execCommand
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand('copy'); el.remove();
      showToast('success', successMsg);
    });
}

function escHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }