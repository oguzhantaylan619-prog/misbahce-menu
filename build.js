'use strict';
/*
 * Misbahçe QR Menü — statik site üreticisi.
 * Kaynak: C:\SepetTakipPro\src\menu.json (+ restaurant-info.json)
 * Çıktı : bu klasörde index.html + img/ (ürün fotoğrafları yerele indirilir → sepettakip'ten bağımsız)
 * Ek görsel: extra-images.json ("Kategori / Ürün" -> img/dosya.jpg) fotoğrafsız ürünlere elle görsel ekler.
 * Çalıştır: node build.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SRC = 'C:/SepetTakipPro/src';
const OUT = __dirname;
const IMGDIR = path.join(OUT, 'img');
if (!fs.existsSync(IMGDIR)) fs.mkdirSync(IMGDIR, { recursive: true });

function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; } }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(v) { return (Math.round((v || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₺'; }
function norm(s) { return String(s || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' '); }
function slug(s) { return String(s || '').toLocaleLowerCase('tr-TR').replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

// Kategori -> emoji (fotoğrafsız yer tutucu için)
const CAT_EMOJI = {
  'günün menüsü':'🍽️','kampanyalı ürünler':'🎉','börekler':'🥐','kahvaltılıklar':'🍳','sahanda yumurtalar':'🍳',
  'omletler':'🍳','menemenler':'🍳','tostlar':'🥪','gözlemeler':'🫓','ana yemekler':'🍖','başlangıçlar':'🥗',
  'burgerler':'🍔','quesedillas':'🌯','wraps':'🌯','makarnalar & mantılar':'🍝','salatalar':'🥗','kahveler':'☕',
  'tatlılar':'🍰','çaylar':'🍵','vitamin bar':'🥤','içecekler':'🥤'
};

// ---- görsel indirme (yerele) ----
function localNameFor(url) {
  try {
    const u = new URL(url);
    const base = decodeURIComponent(u.pathname).replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
    return base || ('img_' + Buffer.from(url).toString('hex').slice(0, 10) + '.jpg');
  } catch { return 'img_' + Buffer.from(String(url)).toString('hex').slice(0, 10) + '.jpg'; }
}
function download(url, dest) {
  return new Promise((resolve) => {
    const mod = url.startsWith('http:') ? http : https;
    const req = mod.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 MisbahceMenu' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(download(res.headers.location, dest));
      }
      if (res.statusCode !== 200) { res.resume(); return resolve(false); }
      const tmp = dest + '.tmp';
      const ws = fs.createWriteStream(tmp);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(() => { try { fs.renameSync(tmp, dest); resolve(true); } catch { resolve(false); } }); });
      ws.on('error', () => { try { fs.unlinkSync(tmp); } catch {} resolve(false); });
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}
async function ensureImages(urls) {
  const map = {}; // url -> local filename (img/xxx) ya da null
  const list = [...urls];
  let i = 0, ok = 0, fail = 0, cached = 0;
  const CONC = 8;
  async function worker() {
    while (i < list.length) {
      const url = list[i++];
      const name = localNameFor(url);
      const dest = path.join(IMGDIR, name);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { map[url] = 'img/' + name; cached++; continue; }
      const done = await download(url, dest);
      if (done) { map[url] = 'img/' + name; ok++; } else { map[url] = null; fail++; }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`  fotoğraf: ${ok} indirildi, ${cached} önbellek, ${fail} başarısız`);
  return map;
}

async function main() {
  const cats = readJson(path.join(SRC, 'menu.json'), []);
  const info = readJson(path.join(SRC, 'restaurant-info.json'), {});
  const name = (info && (info.name || info.title)) || 'Misbahçe';
  const extra = readJson(path.join(OUT, 'extra-images.json'), {}); // "kategori / ürün" -> "img/xxx.jpg"

  // 1) qr&aktif ürünleri kategori kategori topla + tekilleştir (aynı isim tekrarını at)
  const sections = [];
  const picUrls = new Set();
  for (const cat of cats) {
    const prods = (cat.products || []).filter(p => p.qr_menu && p.is_active !== false && p.store_is_active !== false);
    if (!prods.length) continue;
    const seen = new Set(); const items = [];
    for (const p of prods) {
      const key = norm(p.name);
      if (seen.has(key)) continue; seen.add(key);
      const price = (p.store_price != null ? p.store_price : p.price) || 0;
      if (p.picture) picUrls.add(p.picture);
      items.push({ name: p.name, desc: p.description || '', price, picture: p.picture || null, catName: cat.name });
    }
    if (items.length) sections.push({ name: cat.name, items });
  }

  // 2) fotoğrafları yerele indir
  console.log('Fotoğraflar indiriliyor...');
  const imgMap = await ensureImages(picUrls);

  // 3) HTML üret
  const nav = sections.map((s, i) => `<a class="chip" href="#c${i}">${esc(s.name)}</a>`).join('');
  const body = sections.map((s, i) => {
    const emoji = CAT_EMOJI[norm(s.name)] || '🍴';
    const cards = s.items.map(it => {
      let img = it.picture ? imgMap[it.picture] : null;
      if (!img) { const ex = extra[it.catName + ' / ' + it.name] || extra[norm(it.catName + ' / ' + it.name)]; if (ex) img = ex; }
      const priceHtml = it.price > 1 ? `<span class="price">${esc(money(it.price))}</span>` : '';
      const thumb = img
        ? `<img class="thumb" loading="lazy" src="${esc(img)}" alt="${esc(it.name)}" onerror="this.replaceWith(ph(this))">`
        : `<div class="thumb ph">${emoji}</div>`;
      const desc = it.desc ? `<div class="desc">${esc(it.desc)}</div>` : '';
      return `<div class="card" data-name="${esc(norm(it.name))}">${thumb}<div class="info"><div class="nm">${esc(it.name)}</div>${desc}</div>${priceHtml}</div>`;
    }).join('');
    return `<section id="c${i}"><h2><span>${emoji}</span> ${esc(s.name)}</h2><div class="cards">${cards}</div></section>`;
  }).join('');

  const total = sections.reduce((s, x) => s + x.items.length, 0);
  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta name="theme-color" content="#ff5a1f">
<title>${esc(name)} — Menü</title>
<style>
  :root{--ana:#ff5a1f;--bg:#faf7f4;--kart:#fff;--metin:#26211e;--soluk:#8a807a}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--metin)}
  .top{position:sticky;top:0;z-index:20;background:var(--ana);color:#fff;padding:14px 16px 12px;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  .top h1{margin:0;font-size:22px;font-weight:800;letter-spacing:.3px}
  .top .sub{font-size:13px;opacity:.92;margin-top:2px}
  .masa{display:none;margin-top:8px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:4px 12px;font-weight:700;font-size:14px}
  .search{position:sticky;top:64px;z-index:19;background:var(--bg);padding:10px 12px 6px}
  .search input{width:100%;border:1.5px solid #e5ddd6;border-radius:12px;padding:11px 14px;font-size:16px;background:#fff;outline:none}
  .search input:focus{border-color:var(--ana)}
  .nav{position:sticky;top:114px;z-index:18;background:var(--bg);display:flex;gap:8px;overflow-x:auto;padding:6px 12px 10px;scrollbar-width:none}
  .nav::-webkit-scrollbar{display:none}
  .chip{flex:0 0 auto;background:#fff;border:1.5px solid #ece4dd;color:#5c534d;text-decoration:none;font-size:13.5px;font-weight:600;padding:7px 13px;border-radius:999px;white-space:nowrap}
  .chip:active{background:var(--ana);color:#fff}
  main{padding:4px 12px 40px;max-width:720px;margin:0 auto}
  section{padding-top:10px}
  h2{font-size:19px;margin:14px 2px 8px;display:flex;align-items:center;gap:8px}
  h2 span{font-size:22px}
  .cards{display:flex;flex-direction:column;gap:10px}
  .card{display:flex;align-items:center;gap:12px;background:var(--kart);border-radius:16px;padding:10px;box-shadow:0 2px 10px rgba(120,90,60,.06)}
  .thumb{width:84px;height:84px;border-radius:12px;object-fit:cover;flex:0 0 auto;background:#f1e9e2}
  .thumb.ph{display:flex;align-items:center;justify-content:center;font-size:38px;background:linear-gradient(135deg,#fff3ec,#ffe4d6)}
  .info{flex:1;min-width:0}
  .nm{font-weight:700;font-size:16px;line-height:1.25}
  .desc{color:var(--soluk);font-size:12.5px;margin-top:3px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .price{flex:0 0 auto;color:var(--ana);font-weight:800;font-size:16px;white-space:nowrap;align-self:flex-start;margin-top:2px}
  .empty{text-align:center;color:var(--soluk);padding:40px 20px;display:none}
  footer{text-align:center;color:var(--soluk);font-size:12px;padding:24px 16px 40px}
  footer b{color:var(--ana)}
</style>
</head>
<body>
  <div class="top">
    <h1>${esc(name)}</h1>
    <div class="sub">Menü · Afiyet olsun</div>
    <span class="masa" id="masa"></span>
  </div>
  <div class="search"><input id="q" type="search" inputmode="search" placeholder="🔍 Ürün ara (ör. menemen, latte...)" autocomplete="off"></div>
  <div class="nav">${nav}</div>
  <main>
    ${body}
    <div class="empty" id="empty">Aramanıza uygun ürün bulunamadı.</div>
  </main>
  <footer>${esc(name)} · ${total} ürün<br>Fiyatlarımıza KDV dahildir · Değişiklik hakkı saklıdır</footer>
<script>
  // fotoğraf yüklenemezse yer tutucu
  function ph(el){var d=document.createElement('div');d.className='thumb ph';d.textContent='🍴';return d;}
  // masa numarası (?masa=17)
  try{var m=new URLSearchParams(location.search).get('masa');if(m){var e=document.getElementById('masa');e.textContent='📍 '+(/^\\d+$/.test(m)?'Masa '+m:m);e.style.display='inline-block';}}catch(e){}
  // arama
  var q=document.getElementById('q'),cards=[].slice.call(document.querySelectorAll('.card')),secs=[].slice.call(document.querySelectorAll('section')),empty=document.getElementById('empty');
  q.addEventListener('input',function(){
    var v=this.value.trim().toLocaleLowerCase('tr');var any=false;
    cards.forEach(function(c){var hit=!v||c.getAttribute('data-name').indexOf(v)>=0;c.style.display=hit?'':'none';if(hit)any=true;});
    secs.forEach(function(s){var vis=[].slice.call(s.querySelectorAll('.card')).some(function(c){return c.style.display!=='none';});s.style.display=vis?'':'none';});
    empty.style.display=any?'none':'block';
  });
  // chip tıklayınca yumuşak kaydır (sticky başlık payı)
  document.querySelectorAll('.chip').forEach(function(a){a.addEventListener('click',function(ev){ev.preventDefault();var t=document.querySelector(this.getAttribute('href'));if(t){var y=t.getBoundingClientRect().top+window.pageYOffset-150;window.scrollTo({top:y,behavior:'smooth'});}});});
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
  console.log(`✔ index.html yazıldı — ${sections.length} kategori, ${total} ürün`);
}
main().catch(e => { console.error('HATA:', e); process.exit(1); });
