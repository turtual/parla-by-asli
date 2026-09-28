/**
 * Parla By Aslı — Kategori sayfalarını üret
 *
 * /kolyeler/, /kupeler/, /bileklikler/, /setler/ … her ürün tipi için
 * kendi adresi, kendi başlığı ve kendi SEO etiketleri olan bir sayfa.
 * Sayfa ürünleri assets/urun-listesi.js ile çekiyor ve `data-sabit-tip`
 * sayesinde yalnız o tipi gösteriyor; koleksiyon filtresi çalışmaya
 * devam ediyor.
 *
 * Çalıştır:  node tools/kategori-uret.js
 *
 * Ürün tipleri panelden yönetiliyor. Yeni bir tip eklenirse:
 *   1. Aşağıdaki KATEGORILER listesine bir satır ekle
 *   2. Bu betiği çalıştır
 *   3. Menüde görünmesi gerekiyorsa tools/site-kabuk.js → ANA_MENU
 *      ve ardından node tools/kabuk-uygula.js
 *
 * Ürünü olmayan tip için de sayfa üretiliyor: menüde ya da bir yerde
 * bağlantısı varsa 404 yerine "bu kategoride henüz ürün yok" görünsün.
 */

const fs = require('fs');
const path = require('path');
const { headerHtml, footerHtml, seritHtml } = require('./site-kabuk.js');

const KOK = path.join(__dirname, '..');
const SITE = 'https://parlabyasli.com';

/**
 * klasor  → sayfanın adresi (/kolyeler/)
 * tip     → products.category değeri (panelde "ürün tipi" slug'ı)
 */
const KATEGORILER = [
  {
    klasor: 'kolyeler', tip: 'kolye',
    baslik: 'Kolyeler',
    ustyazi: 'Koleksiyon',
    ozet: 'Doğal taş ve inciden el emeği kolyeler. Her parça siparişin için tek tek hazırlanır.',
    seoBaslik: 'Doğal Taş Kolyeler',
    seoAciklama: 'Parla By Aslı el emeği doğal taş kolyeler: lapis lazuli, ametist, inci ve daha fazlası. Siparişe özel hazırlanır.'
  },
  {
    klasor: 'bileklikler', tip: 'bileklik',
    baslik: 'Bileklikler',
    ustyazi: 'Koleksiyon',
    ozet: 'Günlük kullanıma uygun, doğal taşlı el emeği bileklikler.',
    seoBaslik: 'Doğal Taş Bileklikler',
    seoAciklama: 'Parla By Aslı el emeği doğal taş bileklikler. Her taş kendine özgü, her parça siparişe özel hazırlanır.'
  },
  {
    klasor: 'kupeler', tip: 'kupe',
    baslik: 'Küpeler',
    ustyazi: 'Koleksiyon',
    ozet: 'Sade ya da iddialı; doğal taş ve inciden el emeği küpeler.',
    seoBaslik: 'Doğal Taş Küpeler',
    seoAciklama: 'Parla By Aslı el emeği doğal taş küpeler. Çelik aparat, doğal taş ve inci ile siparişe özel üretim.'
  },
  {
    klasor: 'setler', tip: 'dogal-tas-kolye-setleri',
    baslik: 'Setler',
    ustyazi: 'Koleksiyon',
    ozet: 'Birlikte tasarlanmış kolye ve tamamlayıcı parçalar.',
    seoBaslik: 'Doğal Taş Kolye Setleri',
    seoAciklama: 'Parla By Aslı doğal taş kolye setleri. Birlikte tasarlanan parçalar, siparişe özel hazırlanır.'
  },
  {
    klasor: 'yuzukler', tip: 'yuzuk',
    baslik: 'Yüzükler', ustyazi: 'Koleksiyon',
    ozet: 'Doğal taşlı el emeği yüzükler.',
    seoBaslik: 'Doğal Taş Yüzükler',
    seoAciklama: 'Parla By Aslı el emeği doğal taş yüzükler.'
  },
  {
    klasor: 'charmlar', tip: 'charm',
    baslik: 'Charmlar', ustyazi: 'Koleksiyon',
    ozet: 'Tek başına ya da bir arada takılabilen küçük parçalar.',
    seoBaslik: 'Charmlar',
    seoAciklama: 'Parla By Aslı el emeği charm parçaları.'
  },
  {
    klasor: 'broslar', tip: 'bros',
    baslik: 'Broşlar', ustyazi: 'Koleksiyon',
    ozet: 'Yakaya, cekete, çantaya; doğal taşlı broşlar.',
    seoBaslik: 'Broşlar',
    seoAciklama: 'Parla By Aslı el emeği doğal taş broşlar.'
  },
  {
    klasor: 'anahtarliklar', tip: 'anahtarlik',
    baslik: 'Anahtarlıklar', ustyazi: 'Koleksiyon',
    ozet: 'Her gün yanında taşıyacağın küçük bir detay.',
    seoBaslik: 'Anahtarlıklar',
    seoAciklama: 'Parla By Aslı el emeği anahtarlıklar.'
  }
];

function kacar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sayfaHtml(k) {
  const kanonik = SITE + '/' + k.klasor + '/';
  const baslik = k.seoBaslik + ' · Parla By Aslı';

  return `<!DOCTYPE html>
<html lang="tr" data-kok="../">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F5F1EA">

  <title>${kacar(baslik)}</title>
  <meta name="description" content="${kacar(k.seoAciklama)}">
  <link rel="canonical" href="${kanonik}">

  <meta property="og:title" content="${kacar(baslik)}">
  <meta property="og:description" content="${kacar(k.seoAciklama)}">
  <meta property="og:type" content="website">
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

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Anasayfa", "item": "${SITE}/" },
      { "@type": "ListItem", "position": 2, "name": "Tüm ürünler", "item": "${SITE}/urunler/" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(k.baslik)}, "item": "${kanonik}" }
    ]
  }
  </script>

  <link rel="icon" type="image/svg+xml" href="../assets/img/logo-pa-bakir.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Fraunces:opsz,wght@9..144,400..500&display=swap">
  <link rel="stylesheet" href="../assets/main.css">
</head>
<body>

${seritHtml()}
${headerHtml(1, k.klasor + '/')}
  <main>
    <section class="home-section" aria-labelledby="kategori-baslik">
      <div class="container">
        <nav class="legal-crumb" aria-label="Sayfa konumu">
          <a href="../index.html">Anasayfa</a> ·
          <a href="../urunler/">Tüm ürünler</a> · ${kacar(k.baslik)}
        </nav>

        <div class="section-head section-head-orta">
          <div>
            <span class="eyebrow">${kacar(k.ustyazi)}</span>
            <h1 class="section-title" id="kategori-baslik">${kacar(k.baslik)}</h1>
          </div>
          <p class="section-sub">${kacar(k.ozet)}</p>
        </div>
      </div>
    </section>

    <!-- data-sabit-tip: assets/urun-listesi.js üst satırı (ürün tipi) gizler,
         yalnız bu tipteki ürünleri gösterir. Koleksiyon filtresi çalışır. -->
    <section class="mode-area urun-listesi" id="urunler" aria-label="Filtreler" data-sabit-tip="${kacar(k.tip)}">
      <div class="container">
        <nav class="home-filters" aria-label="Koleksiyon filtresi">
          <div class="home-type-nav" id="home-type-nav" role="group" aria-label="Ürün tipi" hidden></div>
          <div class="home-collection-nav home-collection-nav-alt" id="home-collection-nav" role="group" aria-label="Koleksiyon" hidden></div>
        </nav>
      </div>
    </section>

    <section class="featured">
      <div class="container">
        <div class="product-grid" id="featured-grid"></div>
      </div>
    </section>
  </main>

${footerHtml(1)}
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="../assets/data.js"></script>
  <script src="../assets/content.js"></script>
  <script src="../assets/products.js"></script>
  <script src="../assets/ui.js"></script>
  <script src="../assets/reviews.js"></script>
  <script src="../assets/taslar-listesi.js"></script>
  <script src="../assets/taslar-eslesme.js"></script>
  <script src="../assets/urun-listesi.js"></script>
  <script src="../assets/site-nav.js"></script>
</body>
</html>
`;
}

let sayi = 0;
for (const k of KATEGORILER) {
  const dizin = path.join(KOK, k.klasor);
  fs.mkdirSync(dizin, { recursive: true });
  fs.writeFileSync(path.join(dizin, 'index.html'), sayfaHtml(k), 'utf8');
  console.log('üretildi: /' + k.klasor + '/  (' + k.tip + ')');
  sayi++;
}

console.log('\n' + sayi + ' kategori sayfası üretildi.');
console.log('Sitemap için: node tools/sitemap-uret.js');
