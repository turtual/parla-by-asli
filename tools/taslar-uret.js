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
const { headerHtml, footerHtml, seritHtml } = require('./site-kabuk.js');

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
<html lang="tr"${derinlik ? ` data-kok="${u}"` : ''}>
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

${seritHtml()}${headerHtml(derinlik, 'taslar/')}`;
}

const ayak = derinlik => {
  const u = '../'.repeat(derinlik);
  return `
${footerHtml(derinlik)}
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="${u}assets/data.js"></script>
  <script src="${u}assets/content.js"></script>
  <script src="${u}assets/products.js"></script>
  <script src="${u}assets/ui.js"></script>
  <script src="${u}assets/reviews.js"></script>
  <script src="${u}assets/taslar-listesi.js"></script>
  <script src="${u}assets/taslar-eslesme.js"></script>
  <script src="${u}assets/tas-urunleri.js"></script>
  <script src="${u}assets/taslar-arama.js"></script>
  <script src="${u}assets/site-nav.js"></script>
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

/* ── Dizin sayfası ── */
/* Taşın kendi renginden zemin — assets/taslar-listesi.js ile aynı sözlük.
   Fotoğraf yüklenene kadar kart ve kapak bu renkle duruyor. */
const RENK_SOZLUGU = [
  [/lacivert|koyu mavi/i, '#2A3D6B'],
  [/gök mavi|açık mavi|mavi-yeşil|turkuaz/i, '#6FA8B5'],
  [/mavi/i, '#4A6FA5'],
  [/mor|lila|eflatun/i, '#7D6493'],
  [/pembe|gül/i, '#C58B93'],
  [/kırmızı|kızıl/i, '#8E3B34'],
  [/turuncu|amber|bal/i, '#B4763C'],
  [/sarı|altın/i, '#B79A4E'],
  [/yeşil/i, '#4F7358'],
  [/siyah|antrasit/i, '#2B2B2E'],
  [/beyaz|krem|süt/i, '#D9CFC2'],
  [/gri|gümüş/i, '#8A8A8F'],
  [/kahve|bej|toprak/i, '#8A6F55'],
  [/şeffaf|renksiz|berrak/i, '#C3C9CC']
];

function tasRengi(tas) {
  const metin = (tas.kimlik && (tas.kimlik['Renk'] || tas.kimlik['renk'])) || '';
  for (const [kalip, renk] of RENK_SOZLUGU) if (kalip.test(metin)) return renk;
  return '#9A8B7A';
}

/** Kart altındaki tek satırlık tanıtım — cümle ortasında kesmiyor. */
function kisaOzet(ozet, sinir = 70) {
  const d = String(ozet || '').trim();
  if (d.length <= sinir) return d;
  const kesik = d.slice(0, sinir);
  const son = Math.max(kesik.lastIndexOf(' '), kesik.lastIndexOf(','));
  return (son > 30 ? kesik.slice(0, son) : kesik).trim() + '…';
}

function dizinSayfasi() {
  const harfler = [...new Set(taslar.map(t => ilkHarf(t.ad)))]
    .sort((a, b) => a.localeCompare(b, 'tr'));

  const harfNav = harfler
    .map(h => `          <button type="button" class="tas-harf" data-harf="${esc(h)}">${esc(h)}</button>`)
    .join('\n');

  const kartlar = taslar.map(t => `
            <li class="tas-kart" data-harf="${esc(ilkHarf(t.ad))}" data-ad="${esc(t.ad)}" data-anahtar="${esc((t.eslesme || []).join(' '))}">
              <a href="${t.slug}/">
                <span class="tas-kart-gorsel" data-tas-gorsel="${esc(t.slug)}" style="background: ${tasRengi(t)}">
                  <span class="tas-kart-harf" aria-hidden="true">${esc(ilkHarf(t.ad))}</span>
                </span>
                <span class="tas-kart-ad">${esc(t.ad)}</span>
                <span class="tas-kart-ozet">${esc(kisaOzet(t.ozet))}</span>
                <span class="tas-kart-kesfet">Keşfet →</span>
              </a>
            </li>`).join('');

  const aciklama = 'Doğal taşların mineral kimliği, kökeni, geleneksel anlatısı ve bakımı — ' + taslar.length + ' taşlık ansiklopedi.';

  return kafa({
    // 60 karakteri aşan başlığı Google arama sonucunda kırpıyor
    baslik: 'Taş Ansiklopedisi — Doğal Taşlar · Parla By Aslı',
    aciklama,
    kanonik: `${SITE}/taslar/`,
    derinlik: 1
  }) + `
  <main>
    <section class="stone-index">
      <div class="container">

        <nav class="legal-crumb" aria-label="Sayfa konumu">
          <a href="../index.html">Anasayfa</a> · Taş ansiklopedisi
        </nav>

        <div class="tas-dizin-kapak">
          <span class="eyebrow">Taş Ansiklopedisi</span>
          <h1>Doğal taşlar, A'dan Z'ye</h1>
          <p class="tas-lede">
            Her taşın kendine özgü bir yapısı, rengi ve hikâyesi var.
            ${taslar.length} taş için mineral kimliği, nasıl oluştuğu, hangi
            kültürlerde neyle ilişkilendirildiği ve nasıl bakılacağı.
          </p>

          <div class="tas-ara">
            <label class="sr-only" for="tas-ara">Bir taş ara</label>
            <input type="search" id="tas-ara" placeholder="Bir taş ara…" autocomplete="off">
            <svg class="tas-ara-ikon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
              <circle cx="9" cy="9" r="5.2"/><path d="M12.8 12.8 17 17"/>
            </svg>
          </div>

          <nav class="tas-harfler" aria-label="Harfe göre süz">
${harfNav}
          </nav>

          <p class="tas-sonuc-sayisi" id="tas-sonuc-sayisi" role="status"></p>
        </div>

        <ul class="tas-izgara" id="tas-izgara">${kartlar}
        </ul>

      </div>
    </section>
  </main>
` + ayak(1);
}

function tasSayfasi(tas, onceki, sonraki) {
  const kanonik = `${SITE}/taslar/${tas.slug}/`;
  // Başlık 60 karakteri aşarsa Google arama sonucunda kırpıyor.
  // "Özellikleri ve Bakımı" hem kısa hem de sayfanın gerçekten
  // cevapladığı iki soruyu karşılıyor.
  const baslik = `${tas.ad} — Özellikleri ve Bakımı · Parla By Aslı`;

  const kimlik = Object.entries(tas.kimlik || {});

  /* Kapağın altındaki hızlı bakış: mineral grubu, sertlik, renk.
     Tamamı aşağıdaki kimlik listesinde de duruyor. */
  const hizliAnahtarlar = ['Mineral grubu', 'Sertlik (Mohs)', 'Renk'];
  const hizli = hizliAnahtarlar
    .map(k => {
      const satir = kimlik.find(([ad]) => ad === k);
      return satir ? `            <div><dt>${esc(satir[0])}</dt><dd>${bicim(satir[1])}</dd></div>` : '';
    })
    .filter(Boolean).join('\n');

  const kimlikSatirlari = kimlik
    .map(([k, v]) => `            <div><dt>${esc(k)}</dt><dd>${bicim(v)}</dd></div>`).join('\n');

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

  const yolIzi = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Taş ansiklopedisi', item: `${SITE}/taslar/` },
      { '@type': 'ListItem', position: 3, name: tas.ad, item: kanonik }
    ]
  };

  return kafa({ baslik, aciklama: tas.ozet, kanonik, derinlik: 2 }) + `
  <main>
    <article class="stone-page">
      <div class="container">

        <nav class="legal-crumb" aria-label="Sayfa konumu">
          <a href="../../index.html">Anasayfa</a> ·
          <a href="../">Taş ansiklopedisi</a> ·
          ${esc(tas.ad)}
        </nav>

        <header class="tas-kapak">
          <div class="tas-kapak-gorsel" data-tas-gorsel="${esc(tas.slug)}" style="background: ${tasRengi(tas)}">
            <span class="tas-kapak-harf" aria-hidden="true">${esc(ilkHarf(tas.ad))}</span>
          </div>

          <div class="tas-kapak-yazi">
            <span class="eyebrow">Taş Ansiklopedisi</span>
            <h1>${esc(tas.ad)}</h1>
            <p class="tas-lede">${bicim(tas.ozet)}</p>
${hizli ? `            <dl class="tas-hizli">\n${hizli}\n            </dl>` : ''}
          </div>
        </header>

        <section class="tas-bolum">
          <h2>Taşı tanı</h2>
          <dl class="tas-kimlik">
${kimlikSatirlari}
          </dl>
        </section>

        <section class="tas-bolum">
          <h2>Oluşumu</h2>
          ${(tas.anlatim || []).map(p => `<p>${bicim(p)}</p>`).join('\n          ')}
        </section>

        <section class="tas-bolum">
          <h2>Tarihi ve kültürel yeri</h2>
          ${(tas.gelenek || []).map(p => `<p>${bicim(p)}</p>`).join('\n          ')}
${UYARI}
        </section>

        <section class="tas-bolum">
          <h2>Bakımı</h2>
          <ul>
            ${(tas.bakim || []).map(b => `<li>${bicim(b)}</li>`).join('\n            ')}
          </ul>
        </section>

        <section class="stone-products" data-tas-eslesme="${esc((tas.eslesme || []).join('|'))}" hidden>
          <div class="section-head">
            <h2 class="section-title">Bu taşı taşıyan tasarımlar</h2>
            <a class="section-link" href="../../urunler/">Tümünü gör →</a>
          </div>
          <div class="product-grid product-grid-4" data-tas-urun-grid></div>
        </section>

        <nav class="stone-nav" aria-label="Diğer taşlar">
          ${onceki ? `<a class="stone-nav-prev" href="../${onceki.slug}/"><span>Önceki</span>${esc(onceki.ad)}</a>` : '<span></span>'}
          <a class="stone-nav-index" href="../">Tüm taşlar</a>
          ${sonraki ? `<a class="stone-nav-next" href="../${sonraki.slug}/"><span>Sonraki</span>${esc(sonraki.ad)}</a>` : '<span></span>'}
        </nav>

      </div>
    </article>
  </main>

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(yolIzi)}</script>
` + ayak(2);
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

/* sitemap.xml artık tools/sitemap-uret.js tarafından dosya sistemi
   taranarak baştan yazılıyor; burada ayrıca güncellemeye gerek yok. */

console.log(`${yazilan} taş sayfası + dizin üretildi.`);
console.log('Sitemap için: node tools/sitemap-uret.js');
