/**
 * Parla By Aslı — Sitenin ortak kabuğu (header + footer)
 *
 * Site 60'tan fazla statik HTML sayfasından oluşuyor. Header ve footer'ı
 * her birine elle yazmak yerine burada tek kaynakta duruyor; sayfalara
 * `node tools/kabuk-uygula.js` ile basılıyor ve taş sayfaları da
 * (tools/taslar-uret.js) buradan besleniyor.
 *
 * Neden JavaScript ile sayfaya enjekte etmiyoruz: header ve footer'daki
 * bağlantılar SEO için HTML'de durmalı, header'ın sonradan gelmesi de
 * sayfanın zıplamasına (CLS) yol açardı. Menü/arama gibi davranışlar ise
 * assets/site-nav.js içinde, çünkü onlar HTML'de durmak zorunda değil.
 *
 * `derinlik` = sayfanın kök dizinden kaç klasör içeride olduğu.
 *   index.html          → 0
 *   urunler/index.html  → 1
 *   taslar/akik/        → 2
 */

/* Ana menü. Kategori adresleri tools/kategori-uret.js ile üretilen
   sayfalara işaret ediyor; oradaki KATEGORI_ADRESLERI ile aynı kalmalı. */
const ANA_MENU = [
  { etiket: 'Yeni Gelenler', yol: 'urunler/?sirala=yeni' },
  { etiket: 'Kolyeler',      yol: 'kolyeler/' },
  { etiket: 'Bileklikler',   yol: 'bileklikler/' },
  { etiket: 'Küpeler',       yol: 'kupeler/' },
  { etiket: 'Setler',        yol: 'setler/' },
  { etiket: 'Taşlar',        yol: 'taslar/' },
  { etiket: 'Hikâyemiz',     yol: 'hikayemiz/' }
];

/* Menünün altındaki ikincil bağlantılar — mobil menüde görünür. */
const IKINCIL_MENU = [
  { etiket: 'Tüm ürünler',  yol: 'urunler/' },
  { etiket: 'Bakım rehberi', yol: 'bakim-rehberi/' },
  { etiket: 'SSS',           yol: 'sss/' },
  { etiket: 'İletişim',      yol: 'iletisim/' },
  { etiket: 'Hesabım',       yol: 'hesap/' }
];

/* Markanın Instagram adresi. Değişirse tek yer burası. */
const INSTAGRAM = 'https://www.instagram.com/parlabyasli/';

const IKON = {
  menu: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14"/></svg>',
  ara: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="9" cy="9" r="5.2"/><path d="M12.8 12.8 17 17"/></svg>',
  hesap: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="10" cy="6.5" r="3"/><path d="M4 17c0-3 2.7-5 6-5s6 2 6 5"/></svg>',
  kalp: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M10 17s-6-3.5-6-8.5A3.5 3.5 0 0 1 10 6a3.5 3.5 0 0 1 6 2.5C16 13.5 10 17 10 17z"/></svg>',
  sepet: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 6h12l-1 9.5a1.5 1.5 0 0 1-1.5 1.4h-7A1.5 1.5 0 0 1 5 15.5L4 6z"/><path d="M7.5 6a2.5 2.5 0 0 1 5 0"/></svg>',
  instagram: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4"/><circle cx="10" cy="10" r="3.2"/><circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" stroke="none"/></svg>'
};

function kacar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Üst şerit. Metni admin → Metinler → "Üst şerit yazısı" alanından gelir;
 * buradaki yazı yalnız veritabanına ulaşılamazsa görünen yedek.
 */
function seritHtml() {
  return `  <div class="utility-bar" id="utility-bar-text">
    Her parça senin için hazırlanır.
  </div>
`;
}

/**
 * @param {number} derinlik  kökten kaç klasör içeride
 * @param {string} aktif     o an açık olan menü yolu (aria-current için)
 */
function headerHtml(derinlik, aktif) {
  const u = '../'.repeat(derinlik);
  const anasayfa = derinlik === 0 ? 'index.html' : u + 'index.html';

  const menu = ANA_MENU.map(m => {
    const simdi = aktif && m.yol === aktif ? ' aria-current="page"' : '';
    return `        <a href="${u}${m.yol}"${simdi}>${kacar(m.etiket)}</a>`;
  }).join('\n');

  return `  <header class="site-header" id="site-header">
    <div class="container header-inner">

      <button type="button" class="header-menu-btn" data-menu-ac
              aria-label="Menüyü aç" aria-expanded="false" aria-controls="mobil-menu">
        ${IKON.menu}
      </button>

      <a href="${anasayfa}" class="brand-link" aria-label="Parla By Aslı anasayfa">
        <img src="${u}assets/img/logo-yatay-bakir.svg" alt="Parla By Aslı" class="brand-logo" width="150" height="32">
      </a>

      <nav class="header-nav" aria-label="Ana menü">
${menu}
      </nav>

      <div class="header-icons">
        <button type="button" class="header-icon-btn header-ara-btn" data-ara-ac aria-label="Ara">
          ${IKON.ara}
        </button>
        <a href="${u}hesap/" class="header-icon-btn header-icon-genis" aria-label="Hesabım">
          ${IKON.hesap}
        </a>
        <button type="button" class="header-icon-btn" aria-label="Favorilerim">
          ${IKON.kalp}
          <span class="fav-count-badge" data-fav-count style="display:none;">0</span>
        </button>
        <button type="button" class="header-icon-btn" aria-label="Sepetim">
          ${IKON.sepet}
          <span class="cart-count-badge" data-cart-count style="display:none;">0</span>
        </button>
      </div>

    </div>
  </header>
`;
}

function footerHtml(derinlik) {
  const u = '../'.repeat(derinlik);

  const sutun = (baslik, baglantilar) => `        <div class="footer-col">
          <h4>${kacar(baslik)}</h4>
          <ul>
${baglantilar.map(([e, y]) => `            <li><a href="${u}${y}">${kacar(e)}</a></li>`).join('\n')}
          </ul>
        </div>`;

  return `  <footer class="site-footer">
    <div class="container">

      <div class="footer-grid">
        <div class="footer-marka">
          <img src="${u}assets/img/logo-seal-bakir.svg" alt="" class="footer-brand-seal" aria-hidden="true">
          <p class="footer-brand-text" id="footer-marka-text">
            El emeği takı, doğal taş, kişiye özel üretim. Türkiye'de tasarlandı, Türkiye'de üretildi.
          </p>
          <a class="footer-insta" href="${INSTAGRAM}" target="_blank" rel="noopener noreferrer">
            ${IKON.instagram}<span>Instagram</span>
          </a>
        </div>

${sutun('Alışveriş', [
    ['Kolyeler', 'kolyeler/'],
    ['Bileklikler', 'bileklikler/'],
    ['Küpeler', 'kupeler/'],
    ['Setler', 'setler/'],
    ['Yeni gelenler', 'urunler/?sirala=yeni']
  ])}

${sutun('Parla', [
    ['Hikâyemiz', 'hikayemiz/'],
    ['Taş ansiklopedisi', 'taslar/'],
    ['Bakım rehberi', 'bakim-rehberi/'],
    ['İletişim', 'iletisim/']
  ])}

${sutun('Yardım', [
    ['Siparişlerim', 'hesap/'],
    ['Kargo & teslimat', 'yasal/kargo-teslimat/'],
    ['İade & değişim', 'yasal/iade-iptal/'],
    ['SSS', 'sss/'],
    ['Gizlilik', 'yasal/gizlilik/']
  ])}
      </div>

      <div class="footer-bottom">
        <span>© 2026 Parla By Aslı · Tüm hakları saklıdır</span>
        <nav class="footer-yasal" aria-label="Yasal">
          <a href="${u}yasal/kvkk/">KVKK</a>
          <a href="${u}yasal/kullanim-kosullari/">Kullanım koşulları</a>
          <a href="${u}yasal/mesafeli-satis/">Mesafeli satış</a>
        </nav>
      </div>

    </div>
  </footer>
`;
}

module.exports = { ANA_MENU, IKINCIL_MENU, INSTAGRAM, seritHtml, headerHtml, footerHtml };
