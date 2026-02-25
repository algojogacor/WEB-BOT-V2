// ============================================================
//  public/js/zodiakHandler.js — Zodiak, Horoskop & Shio
//  Zodiak & Shio: client-side murni
//  Horoskop harian & AI: /api/features/zodiak/horoskop
// ============================================================

// ══════════════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════════════
const ZODIAK = [
  { nama:'aries',       emoji:'♈', label:'Aries',       mulai:[3,21],  selesai:[4,19],  elemen:'🔥 Api',    planet:'Mars',      sifat:'Berani, Energik, Impulsif',           elemen_raw:'Api'   },
  { nama:'taurus',      emoji:'♉', label:'Taurus',      mulai:[4,20],  selesai:[5,20],  elemen:'🌍 Bumi',   planet:'Venus',     sifat:'Tekun, Setia, Keras Kepala',          elemen_raw:'Bumi'  },
  { nama:'gemini',      emoji:'♊', label:'Gemini',      mulai:[5,21],  selesai:[6,20],  elemen:'💨 Udara',  planet:'Merkurius', sifat:'Adaptif, Komunikatif, Tidak Konsisten', elemen_raw:'Udara' },
  { nama:'cancer',      emoji:'♋', label:'Cancer',      mulai:[6,21],  selesai:[7,22],  elemen:'💧 Air',    planet:'Bulan',     sifat:'Intuitif, Empati, Sensitif',          elemen_raw:'Air'   },
  { nama:'leo',         emoji:'♌', label:'Leo',         mulai:[7,23],  selesai:[8,22],  elemen:'🔥 Api',    planet:'Matahari',  sifat:'Karismatik, Percaya Diri, Dominan',   elemen_raw:'Api'   },
  { nama:'virgo',       emoji:'♍', label:'Virgo',       mulai:[8,23],  selesai:[9,22],  elemen:'🌍 Bumi',   planet:'Merkurius', sifat:'Analitis, Perfeksionis, Kritis',      elemen_raw:'Bumi'  },
  { nama:'libra',       emoji:'♎', label:'Libra',       mulai:[9,23],  selesai:[10,22], elemen:'💨 Udara',  planet:'Venus',     sifat:'Diplomatis, Adil, Tidak Tegas',       elemen_raw:'Udara' },
  { nama:'scorpio',     emoji:'♏', label:'Scorpio',     mulai:[10,23], selesai:[11,21], elemen:'💧 Air',    planet:'Pluto',     sifat:'Intens, Misterius, Pendendam',        elemen_raw:'Air'   },
  { nama:'sagittarius', emoji:'♐', label:'Sagittarius', mulai:[11,22], selesai:[12,21], elemen:'🔥 Api',    planet:'Jupiter',   sifat:'Petualang, Optimis, Tidak Sabar',     elemen_raw:'Api'   },
  { nama:'capricorn',   emoji:'♑', label:'Capricorn',   mulai:[12,22], selesai:[1,19],  elemen:'🌍 Bumi',   planet:'Saturnus',  sifat:'Ambisius, Disiplin, Materialistis',   elemen_raw:'Bumi'  },
  { nama:'aquarius',    emoji:'♒', label:'Aquarius',    mulai:[1,20],  selesai:[2,18],  elemen:'💨 Udara',  planet:'Uranus',    sifat:'Inovatif, Humanis, Tidak Terduga',    elemen_raw:'Udara' },
  { nama:'pisces',      emoji:'♓', label:'Pisces',      mulai:[2,19],  selesai:[3,20],  elemen:'💧 Air',    planet:'Neptunus',  sifat:'Imajinatif, Peka, Mudah Terpengaruh', elemen_raw:'Air'   },
];

const COMPAT_MATRIX = {
  'Api-Api':    { score:85, desc:'Penuh gairah & energi, tapi bisa saling membakar!' },
  'Api-Udara':  { score:90, desc:'Udara menyulut api — kombinasi yang sangat sinergi!' },
  'Api-Bumi':   { score:65, desc:'Bumi bisa memadamkan api. Butuh banyak kompromi.' },
  'Api-Air':    { score:55, desc:'Bertolak belakang. Bisa saling mengimbangi atau berseteru.' },
  'Udara-Udara':{ score:80, desc:'Komunikasi luar biasa, tapi kurang kedalaman emosi.' },
  'Udara-Bumi': { score:70, desc:'Seimbang antara ide dan praktik. Saling melengkapi.' },
  'Udara-Air':  { score:75, desc:'Intelektual bertemu emosi — butuh pengertian lebih.' },
  'Bumi-Bumi':  { score:88, desc:'Stabil, setia, dan saling memahami. Sangat cocok!' },
  'Bumi-Air':   { score:82, desc:'Bumi menopang air — hubungan yang stabil dan nurturing.' },
  'Air-Air':    { score:78, desc:'Dalam secara emosi, tapi bisa terlalu sensitif.' },
};

const SHIO = [
  { nama:'Tikus',   emoji:'🐀', elemen:'Air',    sifat:'Cerdas, Adaptif, Oportunis',              baseYear:1900 },
  { nama:'Kerbau',  emoji:'🐂', elemen:'Bumi',   sifat:'Rajin, Setia, Keras kepala',               baseYear:1901 },
  { nama:'Macan',   emoji:'🐅', elemen:'Kayu',   sifat:'Berani, Kompetitif, Impulsif',             baseYear:1902 },
  { nama:'Kelinci', emoji:'🐇', elemen:'Kayu',   sifat:'Lembut, Diplomatik, Waspada',              baseYear:1903 },
  { nama:'Naga',    emoji:'🐉', elemen:'Tanah',  sifat:'Karismatik, Ambisius, Perfeksionis',       baseYear:1904 },
  { nama:'Ular',    emoji:'🐍', elemen:'Api',    sifat:'Bijaksana, Intuitif, Misterius',           baseYear:1905 },
  { nama:'Kuda',    emoji:'🐎', elemen:'Api',    sifat:'Energetik, Bebas, Antusias',               baseYear:1906 },
  { nama:'Kambing', emoji:'🐑', elemen:'Tanah',  sifat:'Kreatif, Empati, Pemalu',                  baseYear:1907 },
  { nama:'Monyet',  emoji:'🐒', elemen:'Logam',  sifat:'Cerdas, Lucu, Serbabisa',                  baseYear:1908 },
  { nama:'Ayam',    emoji:'🐓', elemen:'Logam',  sifat:'Percaya Diri, Jujur, Detail',              baseYear:1909 },
  { nama:'Anjing',  emoji:'🐕', elemen:'Tanah',  sifat:'Loyal, Jujur, Mau berkorban',              baseYear:1910 },
  { nama:'Babi',    emoji:'🐖', elemen:'Air',    sifat:'Dermawan, Toleran, Santai',                baseYear:1911 },
];

const HOROSKOP_FALLBACK = [
  'Energimu sedang meningkat. Hari ini cocok untuk memulai proyek baru yang sudah lama tertunda.',
  'Keuangan stabil, namun hindari pengeluaran impulsif. Investasi kecil bisa memberikan hasil jangka panjang.',
  'Komunikasi adalah kuncimu hari ini. Sampaikan perasaanmu dengan jelas kepada orang tersayang.',
  'Fokuslah pada produktivitas. Setiap langkah kecil yang kamu ambil hari ini membangun fondasi kesuksesan.',
  'Tantangan hadir sebagai pelajaran. Percayai intuisimu dan tetaplah pada jalur yang sudah kamu pilih.',
  'Hubungan sosialmu menguat. Pertemuan tidak terduga bisa membawa peluang baru yang menarik.',
  'Kesehatan adalah prioritas. Luangkan waktu untuk istirahat dan jangan abaikan sinyal tubuhmu.',
];

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function initZodiak() {
  if (!requireLogin()) return;
  const user = getUser();
  if (user) {
    document.getElementById('sidebar-username').textContent = user.username;
    document.getElementById('sidebar-avatar').textContent = user.username[0].toUpperCase();
  }
  buildZodiakGrid();
  buildCompatSelects();
  buildShioGrid();
}

// ══════════════════════════════════════════════════════════════
//  BUILD UI COMPONENTS
// ══════════════════════════════════════════════════════════════
function buildZodiakGrid() {
  document.getElementById('zodiak-grid').innerHTML = ZODIAK.map(z => `
    <div class="zodiak-chip" onclick="selectZodiak('${z.nama}', this)">
      <div class="z-emoji">${z.emoji}</div>
      <div class="z-name">${z.label}</div>
    </div>`).join('');
}

function buildCompatSelects() {
  const opts = ZODIAK.map(z => `<option value="${z.nama}">${z.emoji} ${z.label}</option>`).join('');
  document.getElementById('compat-z1').innerHTML = opts;
  document.getElementById('compat-z2').innerHTML = opts;
  // Default beda
  document.getElementById('compat-z2').value = 'cancer';
}

function buildShioGrid() {
  document.getElementById('shio-grid').innerHTML = SHIO.map((s, i) => `
    <div class="shio-chip" onclick="selectShio(${i})">
      <div class="s-emoji">${s.emoji}</div>
      <div class="s-name">${s.nama}</div>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  TAB SWITCH
// ══════════════════════════════════════════════════════════════
function switchTab(tab, el) {
  ['zodiak','cocokan','shio'].forEach(t => {
    document.getElementById('tab-' + t).style.display = 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = '';
  el.classList.add('active');
}

// ══════════════════════════════════════════════════════════════
//  ZODIAK LOGIC
// ══════════════════════════════════════════════════════════════
function getZodiakFromDate(dateStr) {
  const d = new Date(dateStr), m = d.getMonth() + 1, day = d.getDate();
  for (const z of ZODIAK) {
    const [sm, sd] = z.mulai, [em, ed] = z.selesai;
    if (sm <= em) {
      if ((m === sm && day >= sd) || (m > sm && m < em) || (m === em && day <= ed)) return z;
    } else {
      // Capricorn: crosses year boundary
      if ((m === sm && day >= sd) || m > sm || (m === em && day <= ed) || m < em) return z;
    }
  }
  return ZODIAK.find(z => z.nama === 'capricorn');
}

function cekZodiakTanggal() {
  const val = document.getElementById('tgl-lahir').value;
  if (!val) return showToast('error', '⚠️ Pilih tanggal lahir dulu!');
  const z = getZodiakFromDate(val);
  renderZodiakResult(z);
}

function selectZodiak(nama, el) {
  document.querySelectorAll('.zodiak-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const z = ZODIAK.find(x => x.nama === nama);
  renderZodiakResult(z);
}

async function renderZodiakResult(z) {
  // Tampilkan skeleton dulu
  document.getElementById('zodiak-result').style.display = '';
  document.getElementById('zodiak-result-inner').innerHTML = `
    <div style="text-align:center;padding:20px">
      <div style="font-size:52px">${z.emoji}</div>
      <h2 style="margin:8px 0">${z.label}</h2>
      <p style="color:var(--text-secondary);font-size:13px">🔮 Mengambil horoskop harian...</p>
    </div>`;

  // Coba ambil horoskop dari server (AI)
  let horoskopText = HOROSKOP_FALLBACK[Math.floor(Math.random() * HOROSKOP_FALLBACK.length)];
  try {
    const r = await api.post('/features/zodiak/horoskop', { zodiak: z.nama });
    if (r && r.success && r.horoskop) {
      horoskopText = r.horoskop;
    }
  } catch { /* pakai fallback */ }

  document.getElementById('zodiak-result-inner').innerHTML = `
    <div class="result-header">
      <div class="result-emoji">${z.emoji}</div>
      <div>
        <h2 style="font-size:22px;margin-bottom:4px">${z.label}</h2>
        <div style="color:var(--text-secondary);font-size:13px">${z.elemen} · ${z.planet}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div class="stat-card" style="text-align:center">
        <div style="font-size:22px">${z.elemen.split(' ')[0]}</div>
        <div style="font-size:11px;color:var(--text-secondary)">Elemen</div>
        <div style="font-weight:700">${z.elemen.split(' ')[1]}</div>
      </div>
      <div class="stat-card" style="text-align:center">
        <div style="font-size:22px">🪐</div>
        <div style="font-size:11px;color:var(--text-secondary)">Planet</div>
        <div style="font-weight:700">${z.planet}</div>
      </div>
      <div class="stat-card" style="text-align:center">
        <div style="font-size:22px">📅</div>
        <div style="font-size:11px;color:var(--text-secondary)">Periode</div>
        <div style="font-weight:700;font-size:11px">${z.mulai[1]}/${z.mulai[0]} – ${z.selesai[1]}/${z.selesai[0]}</div>
      </div>
    </div>
    <div style="margin-bottom:12px"><strong>🌀 Sifat:</strong> ${z.sifat}</div>
    <div class="horoskop-box">
      <strong>🔮 Horoskop Harian:</strong><br><br>${horoskopText}
    </div>
  `;
}

// ══════════════════════════════════════════════════════════════
//  KECOCOKAN
// ══════════════════════════════════════════════════════════════
function getCompat(e1, e2) {
  return COMPAT_MATRIX[`${e1}-${e2}`] || COMPAT_MATRIX[`${e2}-${e1}`] || { score:72, desc:'Kombinasi yang unik dan menarik!' };
}

function cekKecocokan() {
  const n1 = document.getElementById('compat-z1').value;
  const n2 = document.getElementById('compat-z2').value;
  const z1 = ZODIAK.find(x => x.nama === n1);
  const z2 = ZODIAK.find(x => x.nama === n2);
  const compat = getCompat(z1.elemen_raw, z2.elemen_raw);
  const color  = compat.score >= 80 ? '#00d4aa' : compat.score >= 65 ? '#f39c12' : '#e74c3c';
  const label  = compat.score >= 80 ? '💚 Sangat Cocok!' : compat.score >= 65 ? '🟡 Lumayan Cocok' : '🔴 Perlu Usaha Lebih';

  document.getElementById('compat-result').style.display = '';
  document.getElementById('compat-result').innerHTML = `
    <div class="result-box" style="display:block">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:48px">${z1.emoji} 💞 ${z2.emoji}</div>
        <h3 style="margin:8px 0">${z1.label} × ${z2.label}</h3>
        <div style="font-size:28px;font-weight:900;color:${color}">${compat.score}%</div>
        <div style="color:${color};font-size:13px;margin-top:2px">${label}</div>
      </div>
      <div class="compat-bar"><div class="compat-fill" style="width:${compat.score}%;background:${color}"></div></div>
      <p style="text-align:center;margin:14px 0;color:var(--text-secondary);font-size:14px">${compat.desc}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="stat-card">
          <div style="font-size:12px;color:var(--text-secondary)">Elemen ${z1.label}</div>
          <div style="font-weight:700">${z1.elemen}</div>
        </div>
        <div class="stat-card">
          <div style="font-size:12px;color:var(--text-secondary)">Elemen ${z2.label}</div>
          <div style="font-weight:700">${z2.elemen}</div>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
//  SHIO
// ══════════════════════════════════════════════════════════════
function getShioFromYear(yr) {
  return SHIO[((yr - 1900) % 12 + 12) % 12];
}

function cekShio() {
  const yr = parseInt(document.getElementById('tahun-shio').value);
  if (!yr || yr < 1900 || yr > 2099) return showToast('error', '⚠️ Tahun tidak valid!');
  const s = getShioFromYear(yr);
  renderShioResult(s, yr);
}

function selectShio(i) {
  const s = SHIO[i];
  // Cari tahun terdekat
  const yr = new Date().getFullYear();
  let baseYr = 1900 + i;
  while (baseYr + 12 <= yr) baseYr += 12;
  renderShioResult(s, baseYr);
}

function renderShioResult(s, yr) {
  document.getElementById('shio-result').style.display = '';
  document.getElementById('shio-result').innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:56px">${s.emoji}</div>
      <h3 style="margin:8px 0">Shio ${s.nama}</h3>
      <p style="color:var(--text-secondary);font-size:13px">Tahun ${yr} · Elemen ${s.elemen}</p>
    </div>
    <div class="horoskop-box">
      <strong>🌟 Sifat:</strong> ${s.sifat}
    </div>`;
}