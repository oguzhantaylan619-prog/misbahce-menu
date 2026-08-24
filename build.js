'use strict';
/*
 * Misbahce QR Menu — v3 "Gosterisli & Renkli + Kategori Ekrani".
 * Acilis: KATEGORI IZGARASI (buyuk renkli foto kartlar). Kategoriye dokun -> o kategorinin urunleri.
 * Geri butonu + arama. Tek dosya statik HTML+CSS+vanilla JS, kendi indirilen gorselleri.
 * Kaynak: C:\SepetTakipPro\src\menu.json. Calistir: node build.js
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
function titleTr(s) { return String(s || '').trim().replace(/\s+/g, ' '); }
function realPhoto(p) { return p && /^https?:/i.test(p) && !/ProductPictureTemplate/i.test(p); }

// Canli, istah acici kategori aksan renkleri (dongusel)
const ACCENTS = ['#E4572E', '#EFA00B', '#3FA34D', '#D1495B', '#2A9D8F', '#F17105', '#B5651D', '#E5533C', '#6A994E', '#C1121F'];

function localNameFor(url) { try { const u = new URL(url); const b = decodeURIComponent(u.pathname).replace(/^\/+/, '').replace(/[^a-zA-Z0-9._-]+/g, '_'); return b || ('i_' + Buffer.from(url).toString('hex').slice(0, 10) + '.jpg'); } catch { return 'i_' + Buffer.from(String(url)).toString('hex').slice(0, 10) + '.jpg'; } }
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
  const map = {}; const list = [...urls]; let i = 0, ok = 0, cached = 0, fail = 0; const CONC = 8;
  async function w() { while (i < list.length) { const url = list[i++]; const dest = path.join(IMGDIR, localNameFor(url)); if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { map[url] = 'img/' + localNameFor(url); cached++; continue; } const d = await download(url, dest); if (d) { map[url] = 'img/' + localNameFor(url); ok++; } else { map[url] = null; fail++; } } }
  await Promise.all(Array.from({ length: CONC }, w));
  console.log(`  gorsel: ${ok} indirildi, ${cached} onbellek, ${fail} basarisiz`);
  return map;
}

async function main() {
  const cats = readJson(path.join(SRC, 'menu.json'), []);
  const hasLogo = fs.existsSync(path.join(IMGDIR, 'misbahce-logo.png'));

  const extra = readJson(path.join(OUT, 'extra-images.json'), {}); // internetten eklenen (Openverse) yerel gorseller
  const sections = [];
  const urls = new Set();
  for (const cat of cats) {
    const prods = (cat.products || []).filter(p => p.qr_menu && p.is_active !== false && p.store_is_active !== false);
    if (!prods.length) continue;
    const seen = new Set(); const items = [];
    for (const p of prods) {
      const k = norm(p.name); if (seen.has(k)) continue; seen.add(k);
      const price = (p.store_price != null ? p.store_price : p.price) || 0;
      const remote = realPhoto(p.picture) ? p.picture : null; if (remote) urls.add(remote);
      const localExtra = extra[cat.name.trim() + ' / ' + p.name.trim()] || extra[titleTr(cat.name) + ' / ' + titleTr(p.name)] || null;
      items.push({ name: titleTr(p.name), desc: (p.description || '').trim(), price, remote, localExtra });
    }
    if (!items.length) continue;
    sections.push({ name: titleTr(cat.name), items });
  }

  console.log('Gorseller indiriliyor...');
  const imgMap = await ensureImages(urls);
  // gorsel yolu: uzaktan indirilen (sepettakip) VEYA extra (internetten eklenen) yerel dosya. Kapak = ilk gorselli urun.
  sections.forEach(s => {
    s.items.forEach(it => { it.img = it.remote ? imgMap[it.remote] : it.localExtra; });
    const f = s.items.find(it => it.img); s.coverImg = f ? f.img : null;
  });

  const totalItems = sections.reduce((s, x) => s + x.items.length, 0);
  const totalCats = sections.length;

  // KATEGORI IZGARASI
  const grid = sections.map((s, i) => {
    const acc = ACCENTS[i % ACCENTS.length];
    const cov = s.coverImg;
    const inner = cov
      ? `<img src="${esc(cov)}" alt="${esc(s.name)}" loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async"><div class="ov"></div>`
      : `<div class="ov solid"></div><div class="mono">${esc(s.name.trim()[0] || 'M')}</div>`;
    return `<button class="tile${cov ? '' : ' noimg'}" style="--acc:${acc}" data-i="${i}" aria-label="${esc(s.name)}">
      ${inner}<div class="lbl"><h3>${esc(s.name)}</h3><span class="cnt">${s.items.length} ürün</span></div></button>`;
  }).join('');

  // URUN BOLUMLERI (kategori bazli, tek tek gosterilir)
  let imgSeen = 0;
  const secHtml = sections.map((s, i) => {
    const acc = ACCENTS[i % ACCENTS.length];
    const cards = s.items.map(it => {
      const local = it.img;
      const letter = esc((it.name.trim()[0] || 'M').toLocaleUpperCase('tr-TR'));
      let media;
      if (local) { const eager = imgSeen < 4; imgSeen++; media = `<img class="thumb" src="${esc(local)}" alt="${esc(it.name)}" width="200" height="200" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.replaceWith(ph('${acc}','${letter}'))">`; }
      else media = `<div class="thumb ph" style="--acc:${acc}"><span>${letter}</span></div>`;
      const desc = it.desc ? `<p class="desc">${esc(it.desc)}</p>` : '';
      const price = it.price > 1 ? `<div class="price">${esc(money(it.price))}<span class="cur">₺</span></div>` : '';
      return `<article class="card" data-name="${esc(norm(it.name))}" data-cat="${i}">${media}<div class="c-body"><h3 class="nm">${esc(it.name)}</h3>${desc}${price}</div></article>`;
    }).join('');
    return `<section class="cat" id="c${i}" style="--acc:${acc}"><div class="cards">${cards}</div></section>`;
  }).join('');

  const heroLogo = hasLogo ? `<img class="logo" src="img/misbahce-logo.png" alt="Mis Fırın Bahçe" width="200" height="228" fetchpriority="high">` : `<div class="logo mono">M</div>`;

  const html = `<!doctype html>
<html lang="tr" class="nojs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover">
<meta name="theme-color" content="#1c1614">
<title>Mis Fırın Bahçe — Menü</title>
<meta name="description" content="Mis Fırın Bahçe · Beşiktaş, Dikilitaş — taze fırın, zengin kahvaltı, kahveler ve tatlılar.">
<meta property="og:title" content="Mis Fırın Bahçe — Menü">
<meta property="og:image" content="img/misbahce-logo.png">
<link rel="icon" type="image/png" href="img/misbahce-logo.png">
<link rel="apple-touch-icon" href="img/misbahce-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500..700;1,9..144,400..500&family=Bricolage+Grotesque:opsz,wght@12..96,400..700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#FFF7EC; --card:#fffdf9; --ink:#241c18; --muted:#8a7a6c; --line:#ecdfcc;
    --brand:#E4572E; --r:20px;
  }
  *{box-sizing:border-box}
  [hidden]{display:none!important}
  html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Bricolage Grotesque",system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;
    -webkit-font-smoothing:antialiased;overflow-x:hidden}
  a{color:inherit;text-decoration:none}
  h1,h2,h3{font-family:"Fraunces",Georgia,serif;font-weight:600;margin:0;letter-spacing:-.01em}
  .wrap{max-width:680px;margin:0 auto}

  /* ===== TOP BAR (kategori/arama modunda) ===== */
  #topbar{position:sticky;top:0;z-index:60;display:none;align-items:center;gap:12px;padding:13px 16px;
    background:var(--acc,#E4572E);color:#fff;box-shadow:0 6px 20px -10px rgba(0,0,0,.5)}
  body.mode-cat #topbar,body.mode-search #topbar{display:flex}
  #topbar .back{width:38px;height:38px;flex:0 0 auto;border:0;border-radius:12px;background:rgba(255,255,255,.18);
    color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer}
  #topbar h2{font-size:1.28rem;color:#fff;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #topbar .tc{font-size:12px;font-weight:600;opacity:.92;flex:0 0 auto}

  /* ===== HOME (kategori ekrani) ===== */
  body:not(.mode-home) #home{display:none}
  .hero{position:relative;text-align:center;padding:30px 22px 16px;
    background:radial-gradient(120% 80% at 50% -10%, #fff 0%, var(--bg) 60%)}
  .hero .logo{display:block;width:min(42vw,164px);height:auto;margin:0 auto;filter:drop-shadow(0 8px 20px rgba(36,28,24,.18))}
  .hero .logo.mono{font-family:"Fraunces",serif;font-size:96px;color:var(--ink)}
  .hero .tag{font-family:"Fraunces",serif;font-style:italic;color:var(--muted);font-size:clamp(1rem,4vw,1.2rem);margin:8px 0 0}
  .hero .masa{display:none;margin:14px auto 0;background:var(--ink);color:#fff;border-radius:999px;padding:6px 15px;font-size:13px;font-weight:600}
  .search{padding:8px 18px 4px}
  .search input{width:100%;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:14px 16px;font:inherit;font-size:16px;outline:none}
  .search input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(228,87,46,.14)}
  .sec-title{font-size:1.5rem;padding:18px 20px 6px;color:var(--ink)}
  .sec-title small{display:block;font-family:"Bricolage Grotesque";font-weight:500;font-size:.8rem;color:var(--muted);letter-spacing:.04em;margin-top:2px}
  .cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;padding:8px 18px 34px}
  .tile{position:relative;border:0;padding:0;cursor:pointer;aspect-ratio:1/1.02;border-radius:var(--r);overflow:hidden;
    background:var(--acc);box-shadow:0 10px 26px -14px rgba(36,28,24,.55);transition:transform .14s}
  .tile:active{transform:scale(.97)}
  .tile img{width:100%;height:100%;object-fit:cover;display:block}
  .tile .ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 32%,rgba(0,0,0,.16) 55%,rgba(0,0,0,.72) 100%)}
  .tile .ov.solid{background:linear-gradient(150deg,var(--acc),rgba(0,0,0,.35))}
  .tile.noimg .mono{position:absolute;top:50%;left:0;right:0;transform:translateY(-60%);font-family:"Fraunces",serif;
    font-size:74px;color:rgba(255,255,255,.9);text-align:center;line-height:1}
  .tile .lbl{position:absolute;left:14px;right:12px;bottom:12px;text-align:left}
  .tile .lbl h3{color:#fff;font-size:1.18rem;line-height:1.12;text-shadow:0 2px 10px rgba(0,0,0,.5)}
  .tile .cnt{display:inline-block;margin-top:5px;color:#fff;font-size:11px;font-weight:600;
    background:rgba(255,255,255,.22);backdrop-filter:blur(4px);border-radius:999px;padding:2px 9px}

  /* ===== URUN LISTESI ===== */
  #sections{display:none}
  body.mode-cat #sections,body.mode-search #sections{display:block}
  #sections>.cat{display:none;padding:14px 16px 40px}
  body.mode-cat #sections>.cat.active{display:block}
  body.mode-search #sections>.cat{display:block;padding-top:6px}
  body.mode-search #sections>.cat .cards:empty{display:none}
  .cards{display:flex;flex-direction:column;gap:12px;max-width:680px;margin:0 auto}
  .card{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);
    border-radius:18px;padding:11px;overflow:hidden;box-shadow:0 4px 14px -10px rgba(36,28,24,.4)}
  .thumb{width:100px;height:100px;flex:0 0 auto;border-radius:14px;object-fit:cover;background:#f2e7d6}
  .thumb.ph{display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;
    background:linear-gradient(140deg,color-mix(in srgb,var(--acc) 22%,#fff),color-mix(in srgb,var(--acc) 42%,#fff))}
  .thumb.ph span{font-family:"Fraunces",serif;font-weight:600;font-size:46px;color:#fff;opacity:.92;
    text-shadow:0 2px 8px rgba(0,0,0,.18)}
  .c-body{flex:1;min-width:0}
  .nm{font-family:"Bricolage Grotesque";font-weight:600;font-size:16.5px;line-height:1.25;color:var(--ink)}
  .desc{margin:4px 0 0;font-size:13px;line-height:1.4;color:var(--muted);
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .price{margin-top:7px;display:inline-flex;align-items:baseline;font-weight:700;font-size:17px;color:var(--acc);
    font-variant-numeric:tabular-nums}
  .price .cur{font-size:14px;margin-left:2px}
  .empty{display:none;text-align:center;color:var(--muted);padding:50px 20px;font-family:"Fraunces",serif;font-style:italic}
  body.mode-search .empty.on{display:block}

  footer{text-align:center;padding:26px 20px 42px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);background:#fff}
  footer .fmark{font-family:"Fraunces",serif;font-size:20px;color:var(--ink);margin-bottom:5px}

  /* motion */
  .nojs .tile,.nojs .card{opacity:1}
  .js .reveal{opacity:0;transform:translateY(12px)}
  .js .reveal.in{opacity:1;transform:none;transition:opacity .45s,transform .45s cubic-bezier(.2,.7,.2,1)}
  @media (prefers-reduced-motion:reduce){.js .reveal{opacity:1;transform:none;transition:none}}
  .still .reveal{opacity:1!important;transform:none!important}
</style>
</head>
<body class="mode-home">
  <div id="topbar"><button class="back" id="back" aria-label="Geri">‹</button><h2 id="tbtitle">Menü</h2><span class="tc" id="tbcount"></span></div>

  <div id="home">
    <header class="hero">
      ${heroLogo}
      <p class="tag">Beşiktaş'ta taze fırın, sıcak bahçe</p>
      <div class="masa" id="masa"></div>
    </header>
    <div class="search"><input id="q" type="search" inputmode="search" placeholder="🔍 Ürün ara — menemen, latte, tiramisu…" autocomplete="off" aria-label="Ürün ara"></div>
    <h2 class="sec-title">Kategoriler<small>${totalCats} kategori · ${totalItems} ürün · dokun ve keşfet</small></h2>
    <div class="cat-grid">${grid}</div>
  </div>

  <div id="sections" class="wrap">${secHtml}<div class="empty" id="empty">Aramanıza uygun ürün bulunamadı.</div></div>

  <footer>
    <div class="fmark">Mis Fırın Bahçe</div>
    <div>Beşiktaş, Dikilitaş Mah. · Her gün 08:00–24:00</div>
    <div style="margin-top:6px">Fiyatlarımıza KDV dahildir · Değişiklik hakkı saklıdır</div>
  </footer>

<script>
  var H=document.documentElement;H.classList.remove('nojs');H.classList.add('js');
  if(/[?&]still/.test(location.search))H.classList.add('still');
  var NAMES=${JSON.stringify(sections.map(s => s.name))};
  var COUNTS=${JSON.stringify(sections.map(s => s.items.length))};
  var body=document.body,secWrap=document.getElementById('sections'),
      secs=[].slice.call(document.querySelectorAll('#sections>.cat')),
      cards=[].slice.call(document.querySelectorAll('.card')),
      tbtitle=document.getElementById('tbtitle'),tbcount=document.getElementById('tbcount'),
      q=document.getElementById('q'),empty=document.getElementById('empty');

  function ph(acc,ch){var d=document.createElement('div');d.className='thumb ph';d.style.setProperty('--acc',acc||'#E4572E');var s=document.createElement('span');s.textContent=ch||'M';d.appendChild(s);return d;}

  function reveal(el){[].slice.call(el.querySelectorAll('.card:not(.in)')).slice(0,60).forEach(function(c,k){c.classList.add('reveal');requestAnimationFrame(function(){setTimeout(function(){c.classList.add('in');},k*22);});});}

  function setMode(m){body.className=m;}
  function openCat(i){
    secs.forEach(function(s){s.classList.toggle('active',s.id==='c'+i);});
    var acc=(document.getElementById('c'+i)||{}).style?getComputedStyle(document.getElementById('c'+i)).getPropertyValue('--acc'):'#E4572E';
    document.getElementById('topbar').style.setProperty('--acc',acc);
    tbtitle.textContent=NAMES[i]||'Menü';tbcount.textContent=(COUNTS[i]||'')+' ürün';
    setMode('mode-cat');window.scrollTo(0,0);reveal(document.getElementById('c'+i));
    if(location.hash!=='#c'+i)history.pushState({i:i},'','#c'+i);
  }
  function goHome(){setMode('mode-home');if(q)q.value='';window.scrollTo(0,0);if(location.hash)history.pushState({},'',location.pathname+location.search);}

  document.querySelectorAll('.tile').forEach(function(t){t.addEventListener('click',function(){openCat(+this.getAttribute('data-i'));});});
  document.getElementById('back').addEventListener('click',function(){ if(body.classList.contains('mode-search')){if(q)q.value='';} goHome(); });

  // arama (tum urunlerde)
  if(q)q.addEventListener('input',function(){
    var v=this.value.trim().toLocaleLowerCase('tr');
    if(!v){ goHome(); return; }
    setMode('mode-search');tbtitle.textContent='Arama';document.getElementById('topbar').style.setProperty('--acc','#241c18');
    var any=false;
    cards.forEach(function(c){var hit=c.getAttribute('data-name').indexOf(v)>=0;c.style.display=hit?'':'none';if(hit)any=true;});
    secs.forEach(function(s){var vis=[].slice.call(s.querySelectorAll('.card')).some(function(c){return c.style.display!=='none';});s.style.display=vis?'':'none';});
    tbcount.textContent='';empty.classList.toggle('on',!any);
  });

  // masa
  try{var m=new URLSearchParams(location.search).get('masa');if(m){var e=document.getElementById('masa');e.textContent='📍 '+(/^\\d+$/.test(m)?'Masa '+m:m);e.style.display='inline-block';}}catch(e){}

  // geri/ileri (tarayici) + acilis hash
  window.addEventListener('popstate',function(){var h=location.hash.match(/^#c(\\d+)$/);if(h){openCatSilent(+h[1]);}else{setMode('mode-home');}});
  function openCatSilent(i){secs.forEach(function(s){s.classList.toggle('active',s.id==='c'+i);});var el=document.getElementById('c'+i);if(!el)return;document.getElementById('topbar').style.setProperty('--acc',getComputedStyle(el).getPropertyValue('--acc'));tbtitle.textContent=NAMES[i]||'Menü';tbcount.textContent=(COUNTS[i]||'')+' ürün';setMode('mode-cat');reveal(el);}
  (function(){var h=location.hash.match(/^#c(\\d+)$/);if(h)openCatSilent(+h[1]);})();
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), html, 'utf8');
  console.log(`✔ index.html — ${totalCats} kategori, ${totalItems} urun, logo:${hasLogo ? 'var' : 'yok'}`);
}
main().catch(e => { console.error('HATA:', e); process.exit(1); });
