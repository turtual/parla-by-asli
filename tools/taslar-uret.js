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
// Taş rengi ve renk grubu tek kaynaktan (bkz. tools/tas-renk.js)
const { renkBul, renkGrubuBul } = require('./tas-renk.js');
const { headerHtml, footerHtml, seritHtml } = require('./site-kabuk.js');

const KOK = path.join(__dirname, '..');
const SITE = 'https://parlabyasli.com';

/* Editorial keşif katmanı: kısa kimlik, "bu taş sana göre mi", enerji,
   burç, çakra… Mineral verisinden ayrı dosyada (bkz. data/tas-kesif.json).
   Bir taşta kayıt yoksa ilgili bölümler sayfaya hiç basılmıyor. */
const KESIF_DOSYA = path.join(KOK, 'data', 'tas-kesif.json');
const kesif = fs.existsSync(KESIF_DOSYA)
  ? (JSON.parse(fs.readFileSync(KESIF_DOSYA, 'utf8')).taslar || {})
  : {};

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

  /* ── Keşif verisi ──
     Niyet ve renk şeritleri gerçekten veri olan seçeneklerden kuruluyor.
     Hiç taşı olmayan bir niyete tıklatıp boş sonuç göstermek istemiyoruz;
     içerik girildikçe şerit kendiliğinden büyüyor. */
  const kesifTum = JSON.parse(fs.readFileSync(KESIF_DOSYA, 'utf8'));
  const niyetEtiket = kesifTum._niyetler || {};
  const renkEtiket = kesifTum._renkler || {};

  const niyetSayim = {};
  const renkSayim = {};
  for (const t of taslar) {
    const k = kesif[t.slug] || {};
    (k.niyetler || []).forEach(n => { niyetSayim[n] = (niyetSayim[n] || 0) + 1; });
    const rg = k.renkGrubu || renkGrubuBul(t);
    if (rg) renkSayim[rg] = (renkSayim[rg] || 0) + 1;
  }

  const niyetler = Object.keys(niyetSayim)
    .filter(n => niyetEtiket[n])
    .sort((a, b) => niyetEtiket[a].localeCompare(niyetEtiket[b], 'tr'));

  const renkler = Object.keys(renkSayim)
    .filter(r => renkEtiket[r])
    .sort((a, b) => renkSayim[b] - renkSayim[a]);

  const niyetBolumu = niyetler.length ? `
        <section class="tas-kesif" aria-labelledby="tas-kesif-baslik">
          <h2 class="tas-kesif-baslik" id="tas-kesif-baslik">Bugün neye ihtiyacın var?</h2>
          <div class="tas-kesif-secenekler" role="group" aria-label="Niyete göre keşfet">
${niyetler.map(n =>
  `            <button type="button" class="tas-kesif-secenek" data-niyet="${esc(n)}">${esc(niyetEtiket[n])}</button>`
).join('\n')}
          </div>
        </section>` : '';

  const renkBolumu = renkler.length > 2 ? `
        <section class="tas-kesif tas-kesif-renk" aria-labelledby="tas-renk-baslik">
          <h2 class="tas-kesif-alt-baslik" id="tas-renk-baslik">Ya da rengine göre</h2>
          <div class="tas-kesif-secenekler" role="group" aria-label="Renge göre keşfet">
${renkler.map(r => {
  const ornek = taslar.find(t => (kesif[t.slug] && kesif[t.slug].renkGrubu || renkGrubuBul(t)) === r);
  return `            <button type="button" class="tas-kesif-renk-secenek" data-renk="${esc(r)}">`
    + `<span class="tas-kesif-nokta" style="background:${ornek ? renkBul(ornek) : '#9A8B7A'}"></span>`
    + `${esc(renkEtiket[r])}</button>`;
}).join('\n')}
          </div>
        </section>` : '';

  /* Öne çıkan kartlar: kısa kimlik cümlesi yazılmış taşlar. Cümlesi
     olmayan taş bu şeritte görünmüyor — altındaki tam listede zaten var. */
  const oneCikanlar = taslar.filter(t => kesif[t.slug] && kesif[t.slug].kisaKimlik);

  const oneCikanBolumu = oneCikanlar.length ? `
        <section class="tas-one-cikan" aria-labelledby="tas-one-cikan-baslik">
          <h2 class="tas-kesif-alt-baslik" id="tas-one-cikan-baslik">Nereden başlasan iyi olur?</h2>
          <ul class="tas-one-cikan-izgara">
${oneCikanlar.map(t => `            <li>
              <a href="${t.slug}/">
                <span class="tas-kart-gorsel" data-tas-gorsel="${esc(t.slug)}" style="background: ${renkBul(t)}">
                  <span class="tas-kart-harf" aria-hidden="true">${esc(ilkHarf(t.ad))}</span>
                </span>
                <span class="tas-one-cikan-ad">${esc(t.ad)}</span>
                <span class="tas-one-cikan-cumle">${esc(kesif[t.slug].kisaKimlik)}</span>
              </a>
            </li>`).join('\n')}
          </ul>
        </section>` : '';

  const kartlar = taslar.map(t => {
    const k = kesif[t.slug] || {};
    const rg = k.renkGrubu || renkGrubuBul(t) || '';
    return `
            <li class="tas-kart" data-harf="${esc(ilkHarf(t.ad))}" data-ad="${esc(t.ad)}" data-anahtar="${esc((t.eslesme || []).join(' '))}" data-niyet="${esc((k.niyetler || []).join(' '))}" data-renk="${esc(rg)}">
              <a href="${t.slug}/">
                <span class="tas-kart-gorsel" data-tas-gorsel="${esc(t.slug)}" style="background: ${renkBul(t)}">
                  <span class="tas-kart-harf" aria-hidden="true">${esc(ilkHarf(t.ad))}</span>
                </span>
                <span class="tas-kart-ad">${esc(t.ad)}</span>
                <span class="tas-kart-ozet">${esc(k.kisaKimlik || kisaOzet(t.ozet))}</span>
                <span class="tas-kart-kesfet">Keşfet →</span>
              </a>
            </li>`;
  }).join('');

  const aciklama = 'Her taşın başka bir hikâyesi var. ' + taslar.length
    + ' doğal taşın kimliği, geleneksel anlatısı ve bakımı — ve o taşı taşıyan Parla tasarımları.';

  return kafa({
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
          <h1>Her taşın başka bir hikâyesi var.<br><em>Seninki hangisi?</em></h1>

          <div class="tas-ara">
            <label class="sr-only" for="tas-ara">Bir taş ara</label>
            <input type="search" id="tas-ara" placeholder="Bir taş ara…" autocomplete="off">
            <svg class="tas-ara-ikon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
              <circle cx="9" cy="9" r="5.2"/><path d="M12.8 12.8 17 17"/>
            </svg>
          </div>
        </div>
${niyetBolumu}${renkBolumu}${oneCikanBolumu}

        <section class="tas-tum" aria-labelledby="tas-tum-baslik">
          <div class="tas-tum-ust">
            <h2 class="tas-kesif-alt-baslik" id="tas-tum-baslik">Tüm taşlar</h2>
            <nav class="tas-harfler" aria-label="Harfe göre süz">
${harfNav}
            </nav>
          </div>

          <p class="tas-sonuc-sayisi" id="tas-sonuc-sayisi" role="status"></p>

          <ul class="tas-izgara" id="tas-izgara">${kartlar}
          </ul>
        </section>

      </div>
    </section>
  </main>
` + ayak(1);
}

function tasSayfasi(tas, onceki, sonraki) {
  const kanonik = `${SITE}/taslar/${tas.slug}/`;
  /* Başlıkta "Bakımı" yazmıyor: o bölüm sayfadan kaldırıldı, arama
     sonucunda olmayan bir içeriği vaat etmesin. */
  const baslik = `${tas.ad} — Özellikleri ve Hikâyesi · Parla By Aslı`;
  const k = kesif[tas.slug] || {};

  const kimlik = Object.entries(tas.kimlik || {});

  const hizliAnahtarlar = ['Mineral grubu', 'Sertlik (Mohs)', 'Renk'];
  const hizli = hizliAnahtarlar
    .map(ad => {
      const satir = kimlik.find(([k2]) => k2 === ad);
      return satir ? `            <div><dt>${esc(satir[0])}</dt><dd>${bicim(satir[1])}</dd></div>` : '';
    })
    .filter(Boolean).join('\n');

  const kimlikSatirlari = kimlik
    .map(([a, v]) => `            <div><dt>${esc(a)}</dt><dd>${bicim(v)}</dd></div>`).join('\n');

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

  /* ── Editorial bölümler ──
     Hepsi koşullu: data/tas-kesif.json içinde o taş için alan yoksa bölüm
     hiç basılmıyor. Boş başlık ya da uydurma metin çıkmasın diye. Şu an
     yalnız Lapis Lazuli'de tüm alanlar dolu (prototip). */

  const sanaGoreMi = (k.sanaGoreMi && k.sanaGoreMi.length) ? `
        <section class="tas-bolum tas-yakinlik">
          <h2>Bu taş sana göre mi?</h2>
          <p class="tas-yakinlik-metin">${k.sanaGoreMi.map(s => esc(s)).join('<br>')}</p>
          ${k.sanaGoreMiKapanis ? `<p class="tas-yakinlik-kapanis">${esc(k.sanaGoreMiKapanis)}</p>` : ''}
        </section>` : '';

  const enerji = (k.enerji && k.enerji.length) ? `
        <section class="tas-bolum">
          <h2>Taşın enerjisi</h2>
          <p class="tas-bolum-giris">${esc(tas.ad)} geleneksel kristal inanışlarında şu kavramlarla ilişkilendirilir:</p>
          <ul class="tas-etiket-liste">
            ${k.enerji.map(e => `<li>${esc(e)}</li>`).join('\n            ')}
          </ul>
        </section>` : '';

  const burclar = (k.burclar && k.burclar.length) ? `
        <section class="tas-bolum">
          <h2>Burçlarla ilişkisi</h2>
          <p class="tas-bolum-giris">
            Geleneksel kristal ve astroloji kaynaklarında
            ${k.burclar.map(b => `<strong>${esc(b)}</strong>`).join(' ve ')}
            ${k.burclar.length > 1 ? 'burçlarıyla' : 'burcuyla'} ilişkilendirilir.
          </p>
          <p class="tas-burc-not">
            Burcunun taşı olmak zorunda değil. Seni çeken taş, bazen en güzel başlangıçtır.
          </p>
        </section>` : '';

  const cakralar = (k.cakralar && k.cakralar.length) ? `
        <section class="tas-bolum">
          <h2>Çakra ilişkisi</h2>
          <dl class="tas-cakra">
            ${k.cakralar.map(c =>
              `<div><dt>${esc(c.ad)}</dt><dd>${esc(c.aciklama || '')}</dd></div>`).join('\n            ')}
          </dl>
        </section>` : '';

  const nedenBugun = k.nedenBugun ? `
        <section class="tas-bolum tas-neden">
          <h2>Bugün bu taşı neden seçersin?</h2>
          <p>${esc(k.nedenBugun)}</p>
        </section>` : '';

  /* Bilgi notu yalnız geleneksel anlatı içeren bölümlerden en az biri
     varsa çıkıyor — yoksa hiçbir iddiada bulunulmamış demektir. */
  const gelenekselVar = enerji || burclar || cakralar;
  const bilgiNotu = gelenekselVar ? `
        <p class="tas-bilgi-notu">
          Taşlara atfedilen enerji, burç ve çakra özellikleri geleneksel
          inanışlara dayanır; tıbbi veya bilimsel bir etki iddiası taşımaz.
        </p>` : '';

  const sonCta = `
        <section class="tas-son-cta">
          <h2>Taşını seçtin mi?</h2>
          <p>${esc(tas.ad)} taşıyan Parla tasarımlarını keşfet.</p>
          <a class="btn btn-primary" href="../../urunler/?tas=${esc(tas.slug)}">
            ${esc(tas.ad)} tasarımlarını gör →
          </a>
        </section>`;

  return kafa({ baslik, aciklama: k.giris || tas.ozet, kanonik, derinlik: 2 }) + `
  <main>
    <article class="stone-page">
      <div class="container">

        <nav class="legal-crumb" aria-label="Sayfa konumu">
          <a href="../../index.html">Anasayfa</a> ·
          <a href="../">Taş ansiklopedisi</a> ·
          ${esc(tas.ad)}
        </nav>

        <header class="tas-kapak">
          <div class="tas-kapak-gorsel" data-tas-gorsel="${esc(tas.slug)}" style="background: ${renkBul(tas)}">
            <span class="tas-kapak-harf" aria-hidden="true">${esc(ilkHarf(tas.ad))}</span>
          </div>

          <div class="tas-kapak-yazi">
            <span class="eyebrow">Taş Ansiklopedisi</span>
            <h1>${esc(tas.ad)}</h1>
            ${k.kisaKimlik ? `<p class="tas-kisa-kimlik">${esc(k.kisaKimlik)}</p>` : ''}
            <p class="tas-lede">${bicim(k.giris || tas.ozet)}</p>
${hizli ? `            <dl class="tas-hizli">\n${hizli}\n            </dl>` : ''}
          </div>
        </header>
${sanaGoreMi}${enerji}${burclar}${cakralar}${nedenBugun}${bilgiNotu}

        <section class="stone-products" data-tas-eslesme="${esc((tas.eslesme || []).join('|'))}" hidden>
          <div class="section-head">
            <h2 class="section-title">Bu taşı taşıyan tasarımlar</h2>
            <a class="section-link" href="../../urunler/?tas=${esc(tas.slug)}">Tümünü gör →</a>
          </div>
          <div class="product-grid product-grid-4" data-tas-urun-grid></div>
        </section>

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

${sonCta}

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
