/**
 * Parla By Aslı — Ürün sayfalarını üret (/urun/<slug>/)
 *
 * Çalıştır:  node tools/urun-uret.js
 *
 * NEDEN ÜRETİYORUZ
 * Ürün sayfası tarayıcıda da çizilebilirdi ama o zaman Google ve
 * WhatsApp/Instagram önizlemeleri boş görürdü: paylaşılan link fotoğrafsız
 * ve açıklamasız çıkardı. Küçük bir takı markası için paylaşım önizlemesi
 * satışın kendisi. O yüzden başlık, açıklama ve ÜRÜNÜN KENDİ FOTOĞRAFI
 * doğrudan HTML'e yazılıyor.
 *
 * Fiyat ve stok da HTML'de duruyor ama sayfa açılınca
 * assets/urun-sayfasi.js bunları canlı veriyle tazeliyor — panelden fiyat
 * değişince sayfayı yeniden üretmeyi beklemeye gerek yok.
 *
 * PANELE YENİ ÜRÜN EKLENİRSE
 * Sayfası henüz üretilmemiş olur. vercel.json'daki yönlendirme sayesinde
 * /urun/<slug>/ adresi /urun/index.html şablonuna düşer ve ürün yine
 * açılır; yalnız paylaşım önizlemesi genel olur. Bu betiği çalıştırıp
 * siteyi yeniden yayınlamak önizlemeyi de düzeltir.
 *
 * Supabase'den okumak için SDK'ya gerek yok: REST uç noktası + herkese
 * açık anon anahtarı yeterli (anahtar zaten assets/data.js içinde).
 */

const fs = require('fs');
const path = require('path');
const { headerHtml, footerHtml, seritHtml } = require('./site-kabuk.js');

const KOK = path.join(__dirname, '..');
const SITE = 'https://parlabyasli.com';
const CIKTI = path.join(KOK, 'urun');

/* Anon anahtarı assets/data.js içinde; iki yerde tutup birinin eskimesini
   riske atmamak için oradan okuyoruz. */
function supabaseBilgisi() {
  const kaynak = fs.readFileSync(path.join(KOK, 'assets', 'data.js'), 'utf8');
  const url = kaynak.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
  const anahtar = kaynak.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/);
  if (!url || !anahtar) throw new Error('assets/data.js içinde Supabase bilgisi bulunamadı');
  return { url: url[1], anahtar: anahtar[1] };
}

async function cek(yol) {
  const { url, anahtar } = supabaseBilgisi();
  const cevap = await fetch(url + '/rest/v1/' + yol, {
    headers: { apikey: anahtar, Authorization: 'Bearer ' + anahtar }
  });
  if (!cevap.ok) throw new Error('Supabase ' + cevap.status + ': ' + (await cevap.text()).slice(0, 200));
  return cevap.json();
}

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Uzun açıklamadan meta description üretir: ilk cümleler, 155 karaktere kadar. */
function metaAciklama(urun) {
  const ham = String(urun.description || '').replace(/\s+/g, ' ').trim();
  if (!ham) {
    return urun.name + ' — Parla By Aslı el emeği doğal taş takı. Siparişin için hazırlanır.';
  }
  if (ham.length <= 155) return ham;
  const kesik = ham.slice(0, 155);
  const nokta = kesik.lastIndexOf('. ');
  return (nokta > 60 ? kesik.slice(0, nokta + 1) : kesik.trim() + '…');
}

function fiyatYaz(kurus) {
  return new Intl.NumberFormat('tr-TR').format(kurus) + ' ₺';
}

function sayfaHtml(urun, koleksiyon) {
  const kanonik = SITE + '/urun/' + urun.slug + '/';
  const baslik = urun.name + ' · Parla By Aslı';
  const aciklama = metaAciklama(urun);

  const gorseller = [urun.image].concat(urun.images || []).filter(Boolean);
  const anaGorsel = gorseller[0] || (SITE + '/assets/img/og-parla-2.jpg');
  const stokta = (urun.stock_quantity || 0) > 0;

  /* Ürün yapısal verisi. Fiyat ve stok üretim anındaki değer; sayfa
     açılınca canlı veriyle tazeleniyor ama arama motorları için burada
     durması gerekiyor. */
  const yapisalVeri = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: urun.name,
    description: aciklama,
    image: gorseller.length ? gorseller : [SITE + '/assets/img/og-parla-2.jpg'],
    sku: urun.id,
    brand: { '@type': 'Brand', name: 'Parla By Aslı' },
    offers: {
      '@type': 'Offer',
      url: kanonik,
      priceCurrency: 'TRY',
      price: String(urun.price),
      availability: stokta
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  };

  const yolIzi = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Tüm ürünler', item: SITE + '/urunler/' },
      { '@type': 'ListItem', position: 3, name: urun.name, item: kanonik }
    ]
  };

  const malzemeler = (urun.materials || []).map(m => `            <li>${esc(m)}</li>`).join('\n');

  return `<!DOCTYPE html>
<html lang="tr" data-kok="../../">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F5F1EA">

  <title>${esc(baslik)}</title>
  <meta name="description" content="${esc(aciklama)}">
  <link rel="canonical" href="${kanonik}">

  <meta property="og:title" content="${esc(baslik)}">
  <meta property="og:description" content="${esc(aciklama)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${kanonik}">
  <meta property="og:locale" content="tr_TR">
  <meta property="og:site_name" content="Parla By Aslı">
  <meta property="og:image" content="${esc(anaGorsel)}">
  <meta property="og:image:alt" content="${esc(urun.name)}">
  <meta property="product:price:amount" content="${esc(urun.price)}">
  <meta property="product:price:currency" content="TRY">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(baslik)}">
  <meta name="twitter:description" content="${esc(aciklama)}">
  <meta name="twitter:image" content="${esc(anaGorsel)}">

  <script type="application/ld+json">${JSON.stringify(yapisalVeri)}</script>
  <script type="application/ld+json">${JSON.stringify(yolIzi)}</script>

  <link rel="icon" type="image/svg+xml" href="../../assets/img/logo-pa-bakir.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Fraunces:opsz,wght@9..144,400..500&display=swap">
  <link rel="stylesheet" href="../../assets/main.css">
</head>
<body>

${seritHtml()}
${headerHtml(2)}
  <main class="urun-sayfa" data-urun-slug="${esc(urun.slug)}">
    <div class="container">

      <nav class="legal-crumb" aria-label="Sayfa konumu">
        <a href="../../index.html">Anasayfa</a> ·
        <a href="../../urunler/">Tüm ürünler</a> · ${esc(urun.name)}
      </nav>

      <div class="urun-yok" id="urun-yok" hidden role="status">
        <p>Bu ürün şu anda satışta değil.</p>
        <a class="btn btn-primary" href="../../urunler/">Tüm ürünlere bak</a>
      </div>

      <div class="urun-duzen">

        <div>
          <div id="urun-galeri">
            <button type="button" class="urun-galeri-ana" aria-label="Fotoğrafı tam ekran aç">
              <img src="${esc(anaGorsel)}" alt="${esc(urun.name)}" id="urun-ana-gorsel" width="1000" height="1000">
              <span class="urun-galeri-zoom" aria-hidden="true">⤢</span>
            </button>
          </div>
          <p class="urun-ai-not" id="urun-ai-not" hidden>
            Ana fotoğraf ürünün kendi çekimidir. Model üzerindeki görseller
            yapay zekâ ile hazırlanmıştır; taşın rengi ve formu gerçek ürüne aittir.
          </p>
        </div>

        <div class="urun-bilgi">
          <span class="urun-koleksiyon" id="urun-koleksiyon">${esc(koleksiyon ? koleksiyon.name : '')}</span>
          <h1 class="urun-ad" id="urun-ad">${esc(urun.name)}</h1>
          <p class="urun-taslar" id="urun-taslar" hidden></p>

          <p class="urun-fiyat" id="urun-fiyat">${esc(fiyatYaz(urun.price))}</p>
          <p class="urun-stok" id="urun-stok"></p>

          <div class="urun-satinal">
            <div class="urun-adet">
              <button type="button" id="urun-adet-azalt" aria-label="Adet azalt">−</button>
              <span id="urun-adet" aria-live="polite">1</span>
              <button type="button" id="urun-adet-artir" aria-label="Adet artır">+</button>
            </div>
            <button type="button" class="btn btn-primary" id="urun-sepete-ekle">Sepete ekle</button>
          </div>

          <ul class="urun-sozler">
            <li>Siparişin için hazırlanır.</li>
            <li>Özel Parla kutusunda gönderilir.</li>
          </ul>

          <div id="urun-bolumler">
            <details class="urun-bolum" open>
              <summary>Hikâyesi</summary>
              <div class="urun-bolum-govde"><p>${esc(urun.description || '')}</p></div>
            </details>
${malzemeler ? `            <details class="urun-bolum">
              <summary>Ürün detayları</summary>
              <div class="urun-bolum-govde">
                <ul>
${malzemeler}
                </ul>
              </div>
            </details>` : ''}
          </div>
        </div>

      </div>

      <section id="urun-benzer" hidden aria-labelledby="urun-benzer-baslik">
        <div class="section-head">
          <h2 class="section-title" id="urun-benzer-baslik">Birlikte güzel</h2>
          <a class="section-link" href="../../urunler/">Tümünü gör →</a>
        </div>
        <div class="product-grid product-grid-4" id="urun-benzer-grid"></div>
      </section>

      <div id="urun-yorumlar"></div>

    </div>

    <div class="urun-mobil-cubuk">
      <span class="urun-mobil-fiyat">${esc(fiyatYaz(urun.price))}</span>
      <button type="button" class="btn btn-primary" onclick="document.getElementById('urun-sepete-ekle').click()">
        Sepete ekle
      </button>
    </div>
  </main>

${footerHtml(2)}
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="../../assets/data.js"></script>
  <script src="../../assets/content.js"></script>
  <script src="../../assets/products.js"></script>
  <script src="../../assets/ui.js"></script>
  <script src="../../assets/reviews.js"></script>
  <script src="../../assets/account.js"></script>
  <script src="../../assets/taslar-listesi.js"></script>
  <script src="../../assets/taslar-eslesme.js"></script>
  <script src="../../assets/urun-sayfasi.js"></script>
  <script src="../../assets/site-nav.js"></script>
</body>
</html>
`;
}

/**
 * Yedek şablon: /urun/index.html
 *
 * Panele yeni eklenmiş ama sayfası henüz üretilmemiş bir ürüne girilince
 * vercel.json bu dosyaya yönlendiriyor. İçerik boş; assets/urun-sayfasi.js
 * adresten ürün kodunu okuyup her şeyi çiziyor. Arama motorlarına
 * kapatıyoruz (noindex): asıl adres üretilmiş sayfa olmalı, aynı ürün iki
 * adreste indekslenmesin.
 */
function yedekSablon() {
  return `<!DOCTYPE html>
<html lang="tr" data-kok="../">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#F5F1EA">
  <meta name="robots" content="noindex, follow">

  <title>Ürün · Parla By Aslı</title>
  <meta name="description" content="Parla By Aslı el emeği doğal taş takı.">

  <link rel="icon" type="image/svg+xml" href="../assets/img/logo-pa-bakir.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Fraunces:opsz,wght@9..144,400..500&display=swap">
  <link rel="stylesheet" href="../assets/main.css">
</head>
<body>

${seritHtml()}
${headerHtml(1)}
  <main class="urun-sayfa">
    <div class="container">

      <nav class="legal-crumb" aria-label="Sayfa konumu">
        <a href="../index.html">Anasayfa</a> ·
        <a href="../urunler/">Tüm ürünler</a>
      </nav>

      <div class="urun-yok" id="urun-yok" hidden role="status">
        <p>Bu ürün şu anda satışta değil.</p>
        <a class="btn btn-primary" href="../urunler/">Tüm ürünlere bak</a>
      </div>

      <div class="urun-duzen">
        <div>
          <div id="urun-galeri"></div>
          <p class="urun-ai-not" id="urun-ai-not" hidden>
            Ana fotoğraf ürünün kendi çekimidir. Model üzerindeki görseller
            yapay zekâ ile hazırlanmıştır; taşın rengi ve formu gerçek ürüne aittir.
          </p>
        </div>

        <div class="urun-bilgi">
          <span class="urun-koleksiyon" id="urun-koleksiyon"></span>
          <h1 class="urun-ad" id="urun-ad">Yükleniyor…</h1>
          <p class="urun-taslar" id="urun-taslar" hidden></p>
          <p class="urun-fiyat" id="urun-fiyat"></p>
          <p class="urun-stok" id="urun-stok"></p>

          <div class="urun-satinal">
            <div class="urun-adet">
              <button type="button" id="urun-adet-azalt" aria-label="Adet azalt">−</button>
              <span id="urun-adet" aria-live="polite">1</span>
              <button type="button" id="urun-adet-artir" aria-label="Adet artır">+</button>
            </div>
            <button type="button" class="btn btn-primary" id="urun-sepete-ekle">Sepete ekle</button>
          </div>

          <ul class="urun-sozler">
            <li>Siparişin için hazırlanır.</li>
            <li>Özel Parla kutusunda gönderilir.</li>
          </ul>

          <div id="urun-bolumler"></div>
        </div>
      </div>

      <section id="urun-benzer" hidden aria-labelledby="urun-benzer-baslik">
        <div class="section-head">
          <h2 class="section-title" id="urun-benzer-baslik">Birlikte güzel</h2>
          <a class="section-link" href="../urunler/">Tümünü gör →</a>
        </div>
        <div class="product-grid product-grid-4" id="urun-benzer-grid"></div>
      </section>

      <div id="urun-yorumlar"></div>

    </div>
  </main>

${footerHtml(1)}
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="../assets/data.js"></script>
  <script src="../assets/content.js"></script>
  <script src="../assets/products.js"></script>
  <script src="../assets/ui.js"></script>
  <script src="../assets/reviews.js"></script>
  <script src="../assets/account.js"></script>
  <script src="../assets/taslar-listesi.js"></script>
  <script src="../assets/taslar-eslesme.js"></script>
  <script src="../assets/urun-sayfasi.js"></script>
  <script src="../assets/site-nav.js"></script>
</body>
</html>
`;
}

(async function () {
  const [urunler, koleksiyonlar] = await Promise.all([
    cek('products?select=*&is_active=eq.true&order=display_order'),
    cek('collections?select=*')
  ]);

  fs.mkdirSync(CIKTI, { recursive: true });

  /* Artık satışta olmayan ürünlerin sayfası duruyorsa silinmiyor:
     paylaşılmış linkler kırılmasın. Sayfa açılınca "bu ürün şu anda
     satışta değil" diyor ve listeye yönlendiriyor (urun-sayfasi.js). */
  let yazilan = 0;
  for (const urun of urunler) {
    if (!urun.slug) continue;
    const koleksiyon = koleksiyonlar.find(k => k.id === urun.collection_id) || null;
    const dizin = path.join(CIKTI, urun.slug);
    fs.mkdirSync(dizin, { recursive: true });
    fs.writeFileSync(path.join(dizin, 'index.html'), sayfaHtml(urun, koleksiyon), 'utf8');
    yazilan++;
  }

  fs.writeFileSync(path.join(CIKTI, 'index.html'), yedekSablon(), 'utf8');

  console.log(yazilan + ' ürün sayfası üretildi → /urun/<slug>/');
  console.log('Yedek şablon yazıldı → /urun/index.html');
  console.log('Sitemap için: node tools/sitemap-uret.js');
})().catch(e => {
  console.error('Ürün sayfaları üretilemedi:', e.message);
  process.exit(1);
});
