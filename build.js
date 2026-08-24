'use strict';
/*
 * Misbahce QR Menu — premium statik site ureticisi (v2 "Sicak Artizan Firin").
 * Kaynak: C:\SepetTakipPro\src\menu.json (+ restaurant-info.json). Cikti: index.html + img/.
 * Tasarim: Fraunces + Bricolage Grotesque, kraft/terrakota/bahce-yesili palet, logolu hero,
 *   dergi tarzi kategori numaralari, elle-cizilmis ayraclar, yatay kartlar, markali 'M' yer tutucular,
 *   scroll-spy nav, olculu animasyon. Fotograf yoksa / generic template ise markali yer tutucu.
 * Calistir: node build.js
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
function money(v) { return (Math.round((v || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function norm(s) { return String(s || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' '); }
function titleTr(s) { s = String(s || '').trim(); return s.replace(/\s+/g, ' '); }

// Fotograf gercek mi? (generic SepetTakip template'leri yer tutucu sayilir — daha premium/tutarli)
function realPhoto(p) { return p && /^https?:/i.test(p) && !/ProductPictureTemplate/i.test(p); }

// Kategori -> monogram tonu (fotografsiz kartlar icin kasitli imza)
function catTint(name) {
  const n = norm(name);
  if (/kahve|espresso|filtre|machiatto|latte/.test(n)) return '#2E2620';   // espresso
  if (/tatl|pasta|dondurma|tiramis|magnol|sütlü|mozaik|rulo|pastalar/.test(n)) return '#B98A4E'; // pirinç/amber
  if (/salata|vitamin|çay|bahçe|yeşil|limonata|meyve/.test(n)) return '#6E7B54'; // zeytin/bahçe
  return '#B85C38'; // terrakota
}

// ---- gorsel indirme ----
function localNameFor(url) {
  try { const u = new URL(url); const base = decodeURIComponent(u.pathname).replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '_'); return base || ('img_' + Buffer.from(url).toString('hex').slice(0, 10) + '.jpg'); }
  catch { return 'img_' + Buffer.from(String(url)).toString('hex').slice(0, 10) + '.jpg'; }
}
function download(url, dest) {
  return new Promise((resolve) => {
    const mod = url.startsWith('http:') ? http : https;
    const req = mod.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 MisbahceMenu' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); return resolve(download(res.headers.location, dest)); }
      if (res.statusCode !== 200) { res.resume(); return resolve(false); }
      const tmp = dest + '.tmp'; const ws = fs.createWriteStream(tmp); res.pipe(ws);
      ws.on('finish', () => ws.close(() => { try { fs.renameSync(tmp, dest); resolve(true); } catch { resolve(false); } }));
      ws.on('error', () => { try { fs.unlinkSync(tmp); } catch {} resolve(false); });
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}
async function ensureImages(urls) {
  const map = {}; const list = [...urls]; let i = 0, ok = 0, fail = 0, cached = 0; const CONC = 8;
  async function worker() {
    while (i < list.length) {
      const url = list[i++]; const name = localNameFor(url); const dest = path.join(IMGDIR, name);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { map[url] = 'img/' + name; cached++; continue; }
      const done = await download(url, dest);
      if (done) { map[url] = 'img/' + name; ok++; } else { map[url] = null; fail++; }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`  foto: ${ok} indirildi, ${cached} onbellek, ${fail} basarisiz`);
  return map;
}

// SVG dalgali ayrac (elle-cizilmis his) + kagit gren dokusu
const WAVE = `<svg class="rule" viewBox="0 0 240 8" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 C 15 1 25 1 40 5 S 65 9 80 5 S 105 1 120 5 S 145 9 160 5 S 185 1 200 5 S 225 9 240 5" fill="none" stroke="#B85C38" stroke-width="1.4" stroke-linecap="round" opacity=".65"/></svg>`;
const GRAIN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";
const LEAF = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3C7 5 4 9 4 14c0 4 3 7 8 7 0-6 2-9 8-11-3-1-4-4-8-7z" fill="none" stroke="#6E7B54" stroke-width="1.4"/><path d="M12 21c0-5 2-9 6-12" fill="none" stroke="#6E7B54" stroke-width="1.4"/></svg>`;

async function main() {
  const cats = readJson(path.join(SRC, 'menu.json'), []);
  const hasLogo = fs.existsSync(path.join(IMGDIR, 'misbahce-logo.png'));

  const sections = [];
  const picUrls = new Set();
  for (const cat of cats) {
    const prods = (cat.products || []).filter(p => p.qr_menu && p.is_active !== false && p.store_is_active !== false);
    if (!prods.length) continue;
    const seen = new Set(); const items = [];
    for (const p of prods) {
      const key = norm(p.name); if (seen.has(key)) continue; seen.add(key);
      const price = (p.store_price != null ? p.store_price : p.price) || 0;
      const pic = realPhoto(p.picture) ? p.picture : null;
      if (pic) picUrls.add(pic);
      items.push({ name: titleTr(p.name), desc: (p.description || '').trim(), price, picture: pic });
    }
    if (items.length) sections.push({ name: titleTr(cat.name), items });
  }

  console.log('Fotograflar indiriliyor...');
  const imgMap = await ensureImages(picUrls);

  const totalItems = sections.reduce((s, x) => s + x.items.length, 0);
  const totalCats = sections.length;

  // sticky nav chip'leri
  const nav = sections.map((s, i) => `<a class="chip" href="#c${i}" data-i="${i}">${esc(s.name)}</a>`).join('');

  // bir sayac: ilk 4 gorsel eager (LCP)
  let imgSeen = 0;
  const body = sections.map((s, i) => {
    const idx = String(i + 1).padStart(2, '0');
    const tint = catTint(s.name);
    const cards = s.items.map(it => {
      const local = it.picture ? imgMap[it.picture] : null;
      const letter = esc((it.name.trim()[0] || 'M').toLocaleUpperCase('tr-TR'));
      let media;
      if (local) {
        const eager = imgSeen < 4;
        imgSeen++;
        media = `<img class="thumb" src="${esc(local)}" alt="${esc(it.name)}" width="168" height="168" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.replaceWith(ph('${esc(catTint(s.name))}','${letter}'))">`;
      } else {
        media = `<div class="thumb ph" style="--tint:${catTint(s.name)}"><span>${letter}</span></div>`;
      }
      const desc = it.desc ? `<p class="desc">${esc(it.desc)}</p>` : '';
      const price = it.price > 1 ? `<div class="price"><span class="hair"></span>${esc(money(it.price))}<span class="cur">₺</span></div>` : '';
      return `<article class="card" data-name="${esc(norm(it.name))}">${media}<div class="body"><h3 class="nm">${esc(it.name)}</h3>${desc}</div>${price}</article>`;
    }).join('');
    return `<section id="c${i}" class="cat" style="--tint:${tint}">
      <header class="cat-h">
        <div class="kick">${idx}</div>
        <h2>${esc(s.name)}</h2>
        ${WAVE}
        <div class="count">${s.items.length} ürün</div>
      </header>
      <div class="cards">${cards}</div>
    </section>`;
  }).join('');

  const heroLogo = hasLogo
    ? `<img class="logo" src="img/misbahce-logo.png" alt="Mis Fırın Bahçe" width="220" height="251" fetchpriority="high">`
    : `<div class="logo mono">M</div>`;

  const html = `<!doctype html>
<html lang="tr" class="nojs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">
<meta name="theme-color" content="#FBF6EC">
<title>Mis Fırın Bahçe — Menü</title>
<meta name="description" content="Mis Fırın Bahçe · Beşiktaş, Dikilitaş — taze fırın, zengin kahvaltı, kahveler ve tatlılar. Dijital menü.">
<meta property="og:title" content="Mis Fırın Bahçe — Menü">
<meta property="og:description" content="Beşiktaş'ta taze fırın, sıcak bahçe. Dijital menü.">
<meta property="og:image" content="img/misbahce-logo.png">
<meta property="og:type" content="website">
<link rel="icon" type="image/png" href="img/misbahce-logo.png">
<link rel="apple-touch-icon" href="img/misbahce-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..500&family=Bricolage+Grotesque:opsz,wght@12..96,400..700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#FBF6EC; --surface:#F3EADB; --ink:#2E2620; --muted:#7C6B5B;
    --accent:#B85C38; --olive:#6E7B54; --line:#E3D6C2; --amber:#D98A3D;
    --r:16px; --nav-h:54px; --max:660px;
    --s1:8px; --s2:16px; --s3:24px; --s4:32px; --s6:48px;
  }
  *{box-sizing:border-box}
  [hidden]{display:none!important}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Bricolage Grotesque",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
    overflow-x:hidden}
  /* kagit gren dokusu — cok hafif */
  body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
    background-image:url("${GRAIN}");background-size:180px;opacity:.045;mix-blend-mode:multiply}
  .wrap{max-width:var(--max);margin:0 auto}
  a{color:inherit;text-decoration:none}
  h1,h2,h3{font-family:"Fraunces",Georgia,serif;font-weight:600;margin:0;letter-spacing:-.01em}

  /* ============ HERO ============ */
  .hero{position:relative;padding:38px 22px 30px;text-align:center;
    background:radial-gradient(120% 90% at 50% 0%, #FEFAF2 0%, var(--bg) 55%, var(--surface) 130%)}
  .eyebrow{font-size:12.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);
    margin-bottom:16px}
  .hero .logo{display:block;width:min(56vw,220px);height:auto;margin:0 auto 6px;filter:drop-shadow(0 6px 18px rgba(46,38,32,.14))}
  .hero .logo.mono{font-family:"Fraunces",serif;font-size:120px;line-height:1;color:var(--ink)}
  .tagline{font-family:"Fraunces",serif;font-style:italic;font-weight:400;font-size:clamp(1.05rem,4.4vw,1.32rem);
    color:var(--muted);margin:10px 0 0}
  .hero-line{display:flex;align-items:center;justify-content:center;gap:10px;margin:18px auto 0;max-width:320px}
  .hero-line .ln{height:1px;flex:1;background:linear-gradient(90deg,transparent,var(--line))}
  .hero-line .ln.r{background:linear-gradient(90deg,var(--line),transparent)}
  .hero-line svg{width:16px;height:16px;flex:0 0 auto}
  .chips-info{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px}
  .info{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--line);
    border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:500;color:var(--muted)}
  .info.masa{background:var(--ink);border-color:var(--ink);color:#F7EFE2;font-weight:600}
  /* arama */
  .search{max-width:var(--max);margin:22px auto 0;padding:0 22px}
  .search input{width:100%;background:#fff;border:1.5px solid var(--line);border-radius:14px;
    padding:13px 16px;font:inherit;font-size:16px;color:var(--ink);outline:none;
    box-shadow:0 1px 0 rgba(255,255,255,.6) inset}
  .search input::placeholder{color:#b7a894}
  .search input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(184,92,56,.12)}

  /* ============ STICKY NAV ============ */
  .nav{position:sticky;top:0;z-index:50;margin-top:20px;
    background:rgba(251,246,236,.9);backdrop-filter:saturate(1.15) blur(9px);-webkit-backdrop-filter:saturate(1.15) blur(9px);
    border-top:1px solid var(--line);border-bottom:1px solid var(--line);transition:box-shadow .25s,padding .2s}
  .nav.stuck{box-shadow:0 6px 18px -12px rgba(46,38,32,.35)}
  .nav-inner{display:flex;gap:8px;overflow-x:auto;padding:9px 16px;max-width:var(--max);margin:0 auto;
    scrollbar-width:none;scroll-snap-type:x proximity}
  .nav-inner::-webkit-scrollbar{display:none}
  .chip{flex:0 0 auto;scroll-snap-align:center;min-height:38px;display:inline-flex;align-items:center;
    padding:8px 15px;border-radius:999px;font-size:14px;font-weight:500;color:var(--muted);
    background:transparent;border:1px solid var(--line);white-space:nowrap;transition:.18s}
  .chip.active{background:var(--accent);border-color:var(--accent);color:#FBF3EA;font-weight:600}

  /* ============ SECTIONS ============ */
  main{padding:6px 22px 40px}
  .cat{padding-top:30px;scroll-margin-top:66px}
  .cat-h{display:flex;align-items:baseline;gap:11px;margin-bottom:18px}
  .kick{font-family:"Fraunces",serif;font-weight:600;font-size:15px;color:var(--accent);
    font-variant-numeric:tabular-nums;letter-spacing:.02em;flex:0 0 auto;opacity:.9}
  .cat-h h2{font-size:clamp(1.35rem,5.4vw,1.78rem);flex:0 1 auto;min-width:0;color:var(--ink);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cat-h .rule{flex:1 1 0;height:8px;min-width:16px}
  .cat-h .count{flex:0 0 auto;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
    color:var(--muted);white-space:nowrap}

  /* ============ CARD ============ */
  .cards{display:flex;flex-direction:column;gap:12px}
  .card{display:flex;align-items:stretch;gap:13px;background:#fffdf9;border:1px solid var(--line);
    border-radius:var(--r);padding:10px;overflow:hidden;transition:transform .12s ease}
  .card:active{transform:scale(.985)}
  .thumb{width:84px;height:84px;flex:0 0 auto;border-radius:12px;object-fit:cover;background:var(--surface);
    align-self:center}
  .thumb.ph{display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;
    background:linear-gradient(135deg,#F7EFE0,#EFE3D0)}
  .thumb.ph::after{content:"";position:absolute;inset:0;
    background:repeating-linear-gradient(135deg,transparent 0 7px,rgba(227,214,194,.5) 7px 8px)}
  .thumb.ph span{position:relative;font-family:"Fraunces",serif;font-weight:600;font-size:44px;
    color:var(--tint,#B85C38);opacity:.24;line-height:1}
  .body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;padding:2px 0}
  .nm{font-family:"Bricolage Grotesque",sans-serif;font-weight:600;font-size:16px;line-height:1.28;color:var(--ink)}
  .desc{margin:4px 0 0;font-size:13px;line-height:1.4;color:var(--muted);
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .price{flex:0 0 auto;align-self:center;display:flex;align-items:center;gap:1px;
    font-weight:600;font-size:16px;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap;
    padding-left:2px}
  .price .cur{color:var(--accent);margin-left:2px;font-size:14.5px}
  .price .hair{width:12px;height:1.5px;background:var(--line);margin-right:7px;display:inline-block;flex:0 0 auto}

  .empty{display:none;text-align:center;color:var(--muted);padding:44px 20px;font-style:italic;
    font-family:"Fraunces",serif}

  /* ============ FOOTER ============ */
  footer{text-align:center;padding:30px 22px 46px;color:var(--muted);font-size:12.5px;border-top:1px solid var(--line);
    margin-top:20px;background:var(--surface)}
  footer .fmark{font-family:"Fraunces",serif;font-size:22px;color:var(--ink);letter-spacing:.04em;margin-bottom:6px}
  footer .leaf{display:inline-flex;vertical-align:-3px;margin:0 5px}
  footer b{color:var(--accent)}
  footer .addr{margin-top:8px;font-size:12px}

  /* ============ MOTION ============ */
  .nojs .reveal{opacity:1}
  .js .reveal{opacity:0;transform:translateY(14px)}
  .js .reveal.in{opacity:1;transform:none;transition:opacity .5s ease,transform .5s cubic-bezier(.2,.7,.2,1)}
  .hero-fade{animation:heroIn .7s ease both}
  @keyframes heroIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce), (scripting:none){
    html{scroll-behavior:auto}
    .js .reveal{opacity:1;transform:none;transition:none}
    .hero-fade{animation:none}
  }
  .still .reveal{opacity:1!important;transform:none!important}
  .still .hero-fade{animation:none!important}
</style>
</head>
<body>
  <header class="hero hero-fade">
    <div class="eyebrow">Beşiktaş · Dikilitaş</div>
    ${heroLogo}
    <p class="tagline">Beşiktaş'ta taze fırın, sıcak bahçe</p>
    <div class="hero-line"><span class="ln"></span>${LEAF}<span class="ln r"></span></div>
    <div class="chips-info">
      <span class="info">☾ Her gün 08:00 – 24:00</span>
      <span class="info masa" id="masa" hidden></span>
    </div>
  </header>

  <div class="search"><input id="q" type="search" inputmode="search" placeholder="Ürün ara — menemen, latte, tiramisu…" autocomplete="off" aria-label="Ürün ara"></div>

  <nav class="nav" id="nav"><div class="nav-inner">${nav}</div></nav>

  <main class="wrap">
    ${body}
    <div class="empty" id="empty">Aramanıza uygun ürün bulunamadı.</div>
  </main>

  <footer>
    <div class="fmark">Mis Fırın Bahçe</div>
    <div>${LEAF}<span class="leaf"></span>${totalItems} ürün · ${totalCats} kategori</div>
    <div class="addr">Beşiktaş, Dikilitaş Mah. · Her gün 08:00–24:00<br>Fiyatlarımıza KDV dahildir · Görsel ve fiyatlarda değişiklik hakkı saklıdır</div>
  </footer>

<script>
  var H=document.documentElement; H.classList.remove('nojs'); H.classList.add('js');
  if(/[?&]still/.test(location.search)) H.classList.add('still');
  // markali yer tutucu (foto yuklenemezse)
  function ph(tint,ch){var d=document.createElement('div');d.className='thumb ph';d.style.setProperty('--tint',tint||'#B85C38');var s=document.createElement('span');s.textContent=ch||'M';d.appendChild(s);return d;}
  // masa parametresi
  try{var m=new URLSearchParams(location.search).get('masa');if(m){var e=document.getElementById('masa');e.textContent='📍 '+(/^\\d+$/.test(m)?'Masa '+m:m);e.hidden=false;}}catch(e){}

  // arama
  var q=document.getElementById('q'),cards=[].slice.call(document.querySelectorAll('.card')),
      secs=[].slice.call(document.querySelectorAll('.cat')),empty=document.getElementById('empty');
  if(q)q.addEventListener('input',function(){
    var v=this.value.trim().toLocaleLowerCase('tr');var any=false;
    cards.forEach(function(c){var hit=!v||c.getAttribute('data-name').indexOf(v)>=0;c.style.display=hit?'':'none';if(hit)any=true;});
    secs.forEach(function(s){var vis=[].slice.call(s.querySelectorAll('.card')).some(function(c){return c.style.display!=='none';});s.style.display=vis?'':'none';});
    empty.style.display=any?'none':'block';
  });

  // reveal (IntersectionObserver)
  cards.forEach(function(c){c.classList.add('reveal');});
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});},{rootMargin:'0px 0px -8% 0px'});
    cards.forEach(function(c){io.observe(c);});
    setTimeout(function(){cards.forEach(function(c){if(!c.classList.contains('in'))c.classList.add('in');});},2500);
  } else { cards.forEach(function(c){c.classList.add('in');}); }

  // scroll-spy + sticky golge
  var chips=[].slice.call(document.querySelectorAll('.chip')),nav=document.getElementById('nav');
  function setActive(i){chips.forEach(function(ch){var on=+ch.getAttribute('data-i')===i;ch.classList.toggle('active',on);if(on)ch.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});});}
  if('IntersectionObserver' in window && secs.length){
    var spy=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){var id=x.target.id;setActive(+id.slice(1));}});},{rootMargin:'-46% 0px -50% 0px'});
    secs.forEach(function(s){spy.observe(s);});
  }
  var last=0;window.addEventListener('scroll',function(){var y=window.pageYOffset;nav.classList.toggle('stuck',y> (document.querySelector('.hero').offsetHeight));last=y;},{passive:true});
  chips.forEach(function(a){a.addEventListener('click',function(ev){ev.preventDefault();var t=document.querySelector(this.getAttribute('href'));if(t){var y=t.getBoundingClientRect().top+window.pageYOffset-64;window.scrollTo({top:y,behavior:H.classList.contains('still')?'auto':'smooth'});}});});
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
  console.log(`✔ index.html — ${totalCats} kategori, ${totalItems} urun, logo:${hasLogo?'var':'yok'}, gercek-foto:${imgSeen}`);
}
main().catch(e => { console.error('HATA:', e); process.exit(1); });
