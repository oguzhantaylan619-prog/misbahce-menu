'use strict';
// Misbahce QR poster — premium, markali, yazdirilabilir. Logoyu gomer (self-contained).
// QR gorselleri api.qrserver.com'dan (yazdirirken internet ister).
const fs = require('fs'), os = require('os'), path = require('path');
const BASE = 'https://oguzhantaylan619-prog.github.io/misbahce-menu/';
const SRC = 'C:/SepetTakipPro/src';

let logoData = '';
try { logoData = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'img', 'misbahce-logo.png')).toString('base64'); } catch {}

const tablesRaw = (() => { try { return JSON.parse(fs.readFileSync(path.join(SRC, 'tables.json'), 'utf8')); } catch { return []; } })();
const seen = new Set(); const tables = [];
for (const grp of tablesRaw) for (const t of (grp.tables || [])) { const nm = (t.name || '').trim(); if (!nm || seen.has(nm)) continue; seen.add(nm); const num = (nm.match(/\d+/) || [nm])[0]; tables.push({ name: nm, num }); }
tables.sort((a, b) => (parseInt(a.num) || 999) - (parseInt(b.num) || 999));
function qr(data, size) { return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&qzone=2&data=${encodeURIComponent(data)}`; }

const cards = tables.map(t => `
    <div class="tcard">
      <div class="tnum">Masa ${t.num}</div>
      <img src="${qr(BASE + '?masa=' + encodeURIComponent(t.num), 240)}" alt="Masa ${t.name}">
      <div class="tsub">Menü · QR okut</div>
    </div>`).join('');

const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>Mis Fırın Bahçe — Menü QR (Yazdır)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..500&family=Bricolage+Grotesque:opsz,wght@12..96,400..700&display=swap" rel="stylesheet">
<style>
  :root{--bg:#FBF6EC;--surface:#F3EADB;--ink:#2E2620;--muted:#7C6B5B;--accent:#B85C38;--line:#E3D6C2}
  *{box-sizing:border-box}
  @page{margin:12mm}
  body{font-family:"Bricolage Grotesque",Arial,sans-serif;color:var(--ink);background:var(--bg);margin:0;padding:26px}
  h1,h2,.disp{font-family:"Fraunces",Georgia,serif;font-weight:600;letter-spacing:-.01em}
  .poster{max-width:460px;margin:0 auto 30px;background:#fffdf9;border:2px solid var(--line);border-radius:26px;
    padding:30px 26px 26px;text-align:center;box-shadow:0 12px 40px -18px rgba(46,38,32,.4);page-break-after:always}
  .poster .logo{width:130px;height:auto;margin:0 auto 6px;display:block}
  .eyebrow{font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);margin:6px 0 2px}
  .poster h1{font-size:30px;margin:8px 0 2px}
  .poster .tag{font-family:"Fraunces",serif;font-style:italic;color:var(--muted);font-size:15px;margin:0 0 18px}
  .qrbox{display:inline-block;padding:16px;background:#fff;border:2px solid var(--accent);border-radius:20px}
  .qrbox img{width:300px;height:300px;display:block}
  .cta{font-family:"Fraunces",serif;font-size:19px;color:var(--accent);font-weight:600;margin:16px 0 4px}
  .steps{text-align:left;max-width:300px;margin:10px auto 0;font-size:15.5px;line-height:1.85;color:var(--ink)}
  .steps b{color:var(--accent)}
  .url{margin-top:16px;font-size:11.5px;color:var(--muted);word-break:break-all}
  .divider{max-width:460px;margin:0 auto 14px;text-align:center;color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase}
  .grid{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:760px;margin:0 auto}
  .tcard{width:210px;background:#fffdf9;border:1.5px solid var(--line);border-radius:18px;padding:16px 12px;text-align:center;page-break-inside:avoid}
  .tnum{font-family:"Fraunces",serif;font-weight:600;font-size:20px;color:var(--accent);margin-bottom:9px}
  .tcard img{width:172px;height:172px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:6px}
  .tsub{font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-top:8px}
  .ghead{text-align:center;margin:0 auto 4px;max-width:600px}
  .ghead h2{font-size:22px;margin:0}
  .ghead p{color:var(--muted);font-size:13px;margin:4px 0 20px}
</style></head><body>

  <div class="poster">
    ${logoData ? `<img class="logo" src="${logoData}" alt="Mis Fırın Bahçe">` : ''}
    <div class="eyebrow">Beşiktaş · Dikilitaş</div>
    <h1>Menümüz</h1>
    <p class="tag">Beşiktaş'ta taze fırın, sıcak bahçe</p>
    <div class="qrbox"><img src="${qr(BASE, 360)}" alt="Menü QR"></div>
    <div class="cta">Kameranı QR'a okut</div>
    <div class="steps">
      1️⃣ Telefonun <b>kamerasını</b> aç<br>
      2️⃣ Kareye <b>tut</b><br>
      3️⃣ Çıkan linke <b>dokun</b> → menü açılır
    </div>
    <div class="url">${BASE}</div>
  </div>

  <div class="ghead">
    <h2>Masa Masa QR'lar</h2>
    <p>Her masaya kendi karesini koy — menüde “📍 Masa numarası” görünür · kes-yapıştır</p>
  </div>
  <div class="grid">${cards}</div>
</body></html>`;

const out = path.join(os.homedir(), 'Desktop', 'Misbahce-Menu-QR.html');
fs.writeFileSync(out, html, 'utf8');
console.log('✔ QR posteri:', out, '| masa:', tables.length, '| logo:', logoData ? 'gomulu' : 'yok');
