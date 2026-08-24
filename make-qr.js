'use strict';
// Masaüstüne yazdırılabilir QR sayfası üretir. QR görselleri api.qrserver.com'dan (yazdırırken internet ister).
const fs = require('fs'), os = require('os'), path = require('path');
const BASE = 'https://oguzhantaylan619-prog.github.io/misbahce-menu/';
const SRC = 'C:/SepetTakipPro/src';
const info = (() => { try { return JSON.parse(fs.readFileSync(path.join(SRC, 'restaurant-info.json'), 'utf8')); } catch { return {}; } })();
const name = (info && (info.name || info.title)) || 'Misbahçe';
const tablesRaw = (() => { try { return JSON.parse(fs.readFileSync(path.join(SRC, 'tables.json'), 'utf8')); } catch { return []; } })();
const seen = new Set(); const tables = [];
for (const grp of tablesRaw) for (const t of (grp.tables || [])) { const nm = (t.name || '').trim(); if (!nm || seen.has(nm)) continue; seen.add(nm); const num = (nm.match(/\d+/) || [nm])[0]; tables.push({ name: nm, num }); }
tables.sort((a, b) => (parseInt(a.num) || 999) - (parseInt(b.num) || 999));
function qr(data, size) { return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&ecc=M&data=${encodeURIComponent(data)}`; }
const cards = tables.map(t => `
    <div class="tcard">
      <div class="tname">📍 ${t.name}</div>
      <img src="${qr(BASE + '?masa=' + encodeURIComponent(t.num), 260)}" alt="${t.name}">
      <div class="tsub">${name} Menü</div>
    </div>`).join('');
const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>${name} — Menü QR (Yazdır)</title>
<style>
  @page{margin:12mm}
  body{font-family:Segoe UI,Arial,sans-serif;color:#26211e;margin:0;padding:22px;background:#fff}
  h1{color:#ff5a1f;text-align:center;margin:0 0 4px;font-size:26px}
  .note{text-align:center;color:#666;font-size:13px;margin-bottom:18px}
  .poster{text-align:center;border:3px solid #ff5a1f;border-radius:22px;padding:26px 20px;max-width:460px;margin:0 auto 26px;page-break-after:always}
  .poster h2{font-size:30px;margin:0 0 6px;color:#26211e}
  .poster .big{font-size:19px;color:#ff5a1f;font-weight:800;margin:2px 0 16px}
  .poster img{width:330px;height:330px}
  .poster .steps{font-size:17px;line-height:1.9;text-align:left;max-width:320px;margin:14px auto 0}
  .grid{display:flex;flex-wrap:wrap;gap:14px;justify-content:center}
  .tcard{width:210px;border:2px solid #eee;border-radius:16px;padding:14px 10px;text-align:center;page-break-inside:avoid}
  .tname{font-weight:800;font-size:18px;color:#ff5a1f;margin-bottom:8px}
  .tcard img{width:180px;height:180px}
  .tsub{font-size:12px;color:#888;margin-top:6px}
  .link{text-align:center;word-break:break-all;color:#555;font-size:12px;margin:8px 0 20px}
</style></head><body>
  <h1>${name} · Dijital Menü</h1>
  <div class="note">Kamerayı QR'a tutun → menü telefonda açılır. İnternet gerektirmez fark etmez, her yerde çalışır.</div>

  <div class="poster">
    <h2>📱 Menümüz</h2>
    <div class="big">Kamerayı QR'a okutun</div>
    <img src="${qr(BASE, 360)}" alt="Menü QR">
    <div class="steps">
      1️⃣ Telefonun <b>kamerasını</b> aç<br>
      2️⃣ QR karesine <b>tut</b><br>
      3️⃣ Çıkan linke <b>dokun</b> → menü açılır
    </div>
  </div>

  <div class="link">${BASE}</div>
  <h1 style="font-size:20px">Masa Masa QR'lar (kes-yapıştır)</h1>
  <div class="note">Her masaya kendi karesini koy — menüde “📍 Masa numarası” görünür.</div>
  <div class="grid">${cards}</div>
</body></html>`;
const out = path.join(os.homedir(), 'Desktop', 'Misbahce-Menu-QR.html');
fs.writeFileSync(out, html, 'utf8');
console.log('✔ QR sayfası:', out, '| masa:', tables.length);
