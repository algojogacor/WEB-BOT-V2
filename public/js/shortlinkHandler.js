// ============================================================
//  public/js/shortlinkHandler.js — URL Shortener Frontend
//  Berkomunikasi ke /api/features/tools/shorten & /unshorten
// ============================================================

// Riwayat tersimpan di localStorage (maks 50 link)
const HISTORY_KEY = () => 'shortlinks_' + (getUser()?.username || 'guest');

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function initShortlink() {
  if (!requireLogin()) return;
  const user = getUser();
  if (user) {
    document.getElementById('sidebar-username').textContent = user.username;
    document.getElementById('sidebar-avatar').textContent = user.username[0].toUpperCase();
  }
  renderList();
}

// ══════════════════════════════════════════════════════════════
//  SHORTEN
// ══════════════════════════════════════════════════════════════
async function shortenUrl() {
  const url      = document.getElementById('url-input').value.trim();
  const provider = document.getElementById('provider-select').value;

  if (!url || !isValidUrl(url)) return showToast('error', '⚠️ Masukkan URL yang valid (harus https://)');

  const btn = document.getElementById('btn-shorten');
  setBtn(btn, '⏳ Mempersingkat...', true);

  try {
    const r = await api.post('/features/tools/shorten', { url, provider });
    if (r && r.success) {
      // Simpan ke riwayat
      const history = getHistory();
      history.unshift({ orig: url, short: r.shortUrl, provider: r.provider || provider, created: Date.now() });
      if (history.length > 50) history.pop();
      saveHistory(history);
      renderList();
      showToast('success', `✅ Link dipersingkat! (${r.provider || provider})`);
      document.getElementById('url-input').value = '';

      // Auto-copy
      copyToClipboard(r.shortUrl, '📋 Short link langsung disalin ke clipboard!');
    } else {
      showToast('error', '❌ ' + (r?.message || 'Gagal. Semua provider tidak merespons.'));
    }
  } catch (e) {
    showToast('error', '❌ Error: ' + e.message);
  }
  setBtn(btn, '✂️ Persingkat URL', false);
}

// ══════════════════════════════════════════════════════════════
//  UNSHORTEN (Ungkap URL asli)
// ══════════════════════════════════════════════════════════════
async function unshortUrl() {
  const url = document.getElementById('unshort-input').value.trim();
  if (!url || !isValidUrl(url)) return showToast('error', '⚠️ Masukkan short link yang valid!');

  const btn = document.getElementById('btn-unshort');
  setBtn(btn, '⏳...', true);

  const box = document.getElementById('unshort-result');
  box.style.display = '';
  box.innerHTML     = '<span style="color:var(--text-secondary)">⏳ Mengungkap URL...</span>';

  try {
    const r = await api.post('/features/tools/unshorten', { url });
    if (r && r.success) {
      box.innerHTML = `
        <strong>🔍 URL Asli:</strong><br>
        <a href="${escHtml(r.originalUrl)}" target="_blank" style="color:var(--accent-green);word-break:break-all">
          ${escHtml(r.originalUrl)}
        </a>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="copyToClipboard('${escHtml(r.originalUrl)}', '✅ URL disalin!')">📋 Copy</button>`;
    } else {
      box.innerHTML = `<span style="color:#e74c3c">❌ ${escHtml(r?.message || 'Gagal mengungkap URL')}</span>`;
    }
  } catch (e) {
    box.innerHTML = `<span style="color:#e74c3c">❌ Error: ${escHtml(e.message)}</span>`;
  }
  setBtn(btn, '🔍 Ungkap', false);
}

// ══════════════════════════════════════════════════════════════
//  RENDER HISTORY LIST
// ══════════════════════════════════════════════════════════════
function renderList() {
  const history = getHistory();
  document.getElementById('link-count').textContent = history.length;
  const el = document.getElementById('link-list');

  if (!history.length) {
    el.innerHTML = '<div class="empty-state">📭 Belum ada link yang dibuat</div>';
    return;
  }

  el.innerHTML = history.map((h, i) => `
    <div class="link-item">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px">
          <a class="link-short" href="${escHtml(h.short)}" target="_blank">${escHtml(h.short)}</a>
          <span class="provider-badge">${escHtml(h.provider || 'auto')}</span>
        </div>
        <div class="link-orig" title="${escHtml(h.orig)}">→ ${escHtml(h.orig)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">
          ${new Date(h.created).toLocaleString('id-ID')}
        </div>
      </div>
      <button class="copy-btn" onclick="copyToClipboard('${escHtml(h.short)}', '✅ Disalin!')">📋 Copy</button>
      <button class="del-btn" onclick="deleteLink(${i})">🗑️</button>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
//  HISTORY MANAGEMENT
// ══════════════════════════════════════════════════════════════
function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY()) || '[]'); } catch { return []; } }
function saveHistory(arr) { localStorage.setItem(HISTORY_KEY(), JSON.stringify(arr)); }

function deleteLink(i) {
  const h = getHistory(); h.splice(i, 1); saveHistory(h); renderList();
  showToast('info', '🗑️ Link dihapus');
}

function clearHistory() {
  if (!confirm('Hapus semua riwayat link?')) return;
  saveHistory([]); renderList();
  showToast('info', '🗑️ Semua riwayat dihapus');
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function isValidUrl(str) {
  try { const u = new URL(str); return ['http:', 'https:'].includes(u.protocol); } catch { return false; }
}

function setBtn(btn, text, disabled) { if (!btn) return; btn.textContent = text; btn.disabled = disabled; }

function copyToClipboard(text, msg) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('success', msg))
    .catch(() => {
      const el = document.createElement('textarea'); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove();
      showToast('success', msg);
    });
}

function escHtml(t) { const d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; }