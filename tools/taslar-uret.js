/**
 * Taş ansiklopedisi sayfa üreteci.
 *
 * Kaynak:  data/taslar.json
 * Üretir:  taslar/index.html  ve  taslar/<slug>/index.html
 * Günceller: sitemap.xml (taş sayfaları bloğu)
 *
 * Çalıştır:  node tools/taslar-uret.js
 *
 * Neden statik üretim: içerik arama motoru için değerli. İstemci tarafında
 * Supabase'den çekilseydi metin HTML'de olmayacaktı. Ürün şeridi ise
 * stok değiştiği için istemci tarafında dolduruluyor (assets/tas-urunleri.js).
 */

const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const SITE = 'https://parlabyasli.com';

/* İçerik data/taslar*.json dosyalarına bölünmüş olabilir (taslar.json,
 * taslar-2.json, ...). Hepsi okunup birleştirilir; slug tekrarı hatadır. */
const dataDizin = path.join(KOK, 'data');
const dosyalar = fs.readdirSync(dataDizin)
  .filter(f => /^taslar.*\.json$/.test(f))
  .sort();

const havuz = [];
const gorulen = new Map();
for (const dosya of dosyalar) {
  const v = JSON.parse(fs.readFileSync(path.join(dataDizin, dosya), 'utf8'));
  for (const t of (v.taslar || [])) {
    if (gorulen.has(t.slug)) {
      throw new Error(`Yinelenen slug "${t.slug}" — ${gorulen.get(t.slug)} ve ${dosya}`);
    }
    gorulen.set(t.slug, dosya);
    havuz.push(t);
  }
}

const taslar = havuz.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

/* ── Yardımcılar ── */

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// content.js ile aynı dar biçimlendirme seti — önce escape, sonra kalıplar
function bicim(text) {
  let s = esc(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

const ilkHarf = ad => ad.charAt(0).toLocaleUpperCase('tr');

function kafa({ baslik, aciklama, kanonik, derinlik }) {
  const u = '../'.repeat(derinlik);
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#FAF6F1">

  <title>${esc(baslik)}</title>
  <meta name="description" content="${esc(aciklama)}">
  <link rel="canonical" href="${kanonik}">

  <meta property="og:title" content="${esc(baslik)}">
  <meta property="og:description" content="${esc(aciklama)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${kanonik}">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:site_name" content="Parla By Aslı">
  <meta property="og:image" content="${SITE}/assets/img/og-parla-2.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="Doğal taş ve inciden el emeği bir Parla By Aslı kolyesi">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE}/assets/img/og-parla-2.jpg">

  <link rel="icon" type="image/svg+xml" href="${u}assets/img/logo-pa-bakir.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Fraunces:opsz,wght@9..144,400..500&display=swap">
  <link rel="stylesheet" href="${u}assets/main.css">
</head>
<body>

  <header class="site-header">
    <div class="container header-inner">
      <a href="${u}index.html" class="brand-link" aria-label="Parla By Aslı anasayfa">
        <img src="${u}assets/img/logo-yatay-bakir.svg" alt="Parla By Aslı" class="brand-logo" width="150" height="32">
      </a>
    </div>
  </header>
`;
}

const ayak = derinlik => {
  const u = '../'.repeat(derinlik);
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">
        <span>© 2026 Parla By Aslı · Tüm hakları saklıdır</span>
        <span>Türkiye'de tasarlandı</span>
      </div>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="${u}assets/data.js"></script>
  <script src="${u}assets/products.js"></script>
  <script src="${u}assets/ui.js"></script>
  <script src="${u}assets/reviews.js"></script>
  <script src="${u}assets/tas-urunleri.js"></script>
</body>
</html>
`;
};

/* ── Uyarı bloğu: her taş sayfasında aynı ── */
const UYARI = `
          <div class="legal-note">
            <p>
              Bu sayfadaki geleneksel anlatılar kültürel ve tarihsel bilgi olarak
              aktarılmıştır. Doğal taşların herhangi bir hastalığı önlediğine,
              iyileştirdiğine veya tedavi ettiğine dair bilimsel bir kanıt yoktur;
              bu içerik tıbbi tavsiye değildir. Sağlıkla ilgili konularda hekiminize
              başvurun.
            </p>
          </div>`;

/* ── Taş sayfası ── */
function tasSayfasi(tas, onceki, sonraki) {
  const kanonik = `${SITE}/taslar/${tas.slug}/`;
  const baslik = `${tas.ad} — Özellikleri, Kökeni ve Geleneksel Anlatısı · Parla By Aslı`;

  const kimlikSatirlari = Object.entries(tas.kimlik || {})
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${bicim(v)}</td></tr>`).join('\n              ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${tas.ad} — özellikleri, kökeni ve geleneksel anlatısı`,
    description: tas.ozet,
    inLanguage: 'tr-TR',
    mainEntityOfPage: kanonik,
    author: { '@type': 'Organization', name: 'Parla By Aslı' },
    publisher: { '@type': 'Organization', name: 'Parla By Aslı' }
  };

  return kafa({ baslik, aciklama: tas.ozet, kanonik, derinlik: 2 }) + `
  <main>
    <section class="legal-page stone-page">
      <div class="container">

        <nav class="legal-crumb" aria-label="Sayfa konumu">
          <a href="../../index.html">Anasayfa</a> ·
          <a href="../">Taş ansiklopedisi</a> ·
          ${esc(tas.ad)}
        </nav>

        <div class="legal-head">
          <span class="eyebrow">Taş Ansiklopedisi</span>
          <h1 class="h1">${esc(tas.ad)}</h1>
          <p class="stone-lede">${bicim(tas.ozet)}</p>
        </div>

        <div class="legal-body">

          <h2>Taşın kimliği</h2>
          <div class="legal-table-wrap">
            <table class="legal-table"><tbody>
              ${kimlikSatirlari}
            </tbody></table>
          </div>

          <h2>Nedir, nasıl oluşur</h2>
          ${(tas.anlatim || []).map(p => `<p>${bicim(p)}</p>`).join('\n          ')}

          <h2>Geleneksel anlatılar ve inanışlar</h2>
          ${(tas.gelenek || []).map(p => `<p>${bicim(p)}</p>`).join('\n          ')}
${UYARI}

          <h2>Bakımı</h2>
          <ul>
            ${(tas.bakim || []).map(b => `<li>${bicim(b)}</li>`).join('\n            ')}
          </ul>

        </div>

        <section class="stone-products" data-tas-eslesme="${esc((tas.eslesme || []).join('|'))}" hidden>
          <h2>${esc(tas.ad)} kullandığımız parçalar</h2>
          <div class="product-grid" data-tas-urun-grid></div>
        </section>

        <nav class="stone-nav" aria-label="Diğer taşlar">
          ${onceki ? `<a class="stone-nav-prev" href="../${onceki.slug}/"><span>Önceki</span>${esc(onceki.ad)}</a>` : '<span></span>'}
          <a class="stone-nav-index" href="../">Tüm taşlar</a>
          ${sonraki ? `<a class="stone-nav-next" href="../${sonraki.slug}/"><span>Sonraki</span>${esc(sonraki.ad)}</a>` : '<span></span>'}
        </nav>

      </div>
    </section>
  </main>

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
` + ayak(2);
}

/* ── Dizin sayfası ── */
function dizinSayfasi() {
  const harfler = [...new Set(taslar.map(t => ilkHarf(t.ad)))]
    .sort((a, b) => a.localeCompare(b, 'tr'));

  const harfNav = harfler
    .map(h => `<a href="#harf-${encodeURIComponent(h)}">${esc(h)}</a>`).join('\n            ');

  const gruplar = harfler.map(h => {
    const grup = taslar.filter(t => ilkHarf(t.ad) === h);
    const kartlar = grup.map(t => `
              <li class="stone-card">
                <a href="${t.slug}/">
                  <span class="stone-card-name">${esc(t.ad)}</span>
                  <span class="stone-card-desc">${esc(t.ozet)}</span>
                </a>
              </li>`).join('');
    return `
          <div class="stone-group" id="harf-${encodeURIComponent(h)}">
            <h2 class="stone-letter">${esc(h)}</h2>
            <ul class="stone-list">${kartlar}
            </ul>
          </div>`;
  }).join('\n');

  const aciklama = 'Doğal taşların mineral kimliği, kökeni, geleneksel anlatısı ve bakımı — A\'dan Z\'ye taş ansiklopedisi.';

  return kafa({
    baslik: 'Taş Ansiklopedisi — Doğal Taşlar A\'dan Z\'ye · Parla By Aslı',
    aciklama,
    kanonik: `${SITE}/taslar/`,
    derinlik: 1
  }) + `
  <main>
    <section class="legal-page stone-index">
      <div class="container">

        <nav class="legal-crumb" aria-label="Sayfa konumu">
          <a href="../index.html">Anasayfa</a> · Taş ansiklopedisi
        </nav>

        <div class="legal-head">
          <span class="eyebrow">Taş Ansiklopedisi</span>
          <h1 class="h1">Doğal taşlar, A'dan Z'ye</h1>
          <p class="stone-lede">
            Kullandığımız taşların her biri için mineral kimliği, nasıl oluştuğu,
            hangi kültürlerde neyle ilişkilendirildiği ve nasıl bakılması gerektiği.
            ${taslar.length} taş — liste büyüyor.
          </p>
        </div>

        <nav class="stone-alpha" aria-label="Harfe göre git">
            ${harfNav}
        </nav>
${gruplar}

      </div>
    </section>
  </main>
` + ayak(1);
}

/* ── Yaz ── */
let yazilan = 0;
taslar.forEach((tas, i) => {
  const dizin = path.join(KOK, 'taslar', tas.slug);
  fs.mkdirSync(dizin, { recursive: true });
  fs.writeFileSync(path.join(dizin, 'index.html'),
    tasSayfasi(tas, taslar[i - 1] || null, taslar[i + 1] || null), 'utf8');
  yazilan++;
});

fs.mkdirSync(path.join(KOK, 'taslar'), { recursive: true });
fs.writeFileSync(path.join(KOK, 'taslar', 'index.html'), dizinSayfasi(), 'utf8');

/* ── sitemap.xml ── */
const smYol = path.join(KOK, 'sitemap.xml');
let sm = fs.readFileSync(smYol, 'utf8');
const BAS = '  <!-- taslar:baslangic -->';
const BIT = '  <!-- taslar:bitis -->';
const blok = [BAS,
  `  <url><loc>${SITE}/taslar/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
  ...taslar.map(t => `  <url><loc>${SITE}/taslar/${t.slug}/</loc><changefreq>yearly</changefreq><priority>0.6</priority></url>`),
  BIT].join('\n');

if (sm.includes(BAS) && sm.includes(BIT)) {
  sm = sm.replace(new RegExp(`${BAS}[\\s\\S]*?${BIT}`), blok);
} else {
  sm = sm.replace('</urlset>', blok + '\n</urlset>');
}
fs.writeFileSync(smYol, sm, 'utf8');

console.log(`${yazilan} taş sayfası + dizin üretildi, sitemap güncellendi.`);
