/**
 * Parla By Aslı — Anasayfa interactivity
 *
 * - Koleksiyon (üst kategori) pill listesi — her zaman görünür, gizli
 *   dropdown yok. Tıklayınca ilgili /katalog/[slug]/ sayfasına gider.
 * - Tüm ürünlerin ızgarası (anasayfada filtre yok; koleksiyona göre
 *   daraltma artık kendi sayfasında yapılıyor).
 *
 * Not: Eskiden burada çoklu-seçim checkbox+dropdown filtre paneli vardı
 * (Hepsi/Koleksiyon/Sana özel mod ayrımının kalıntısıydı). Koleksiyonlar
 * artık admin panelinden dinamik ekleniyor ve her biri kendi indexlenebilir
 * sayfasına sahip; bu yüzden anasayfada gizli bir filtre yerine doğrudan
 * gezinme linkleri gösteriliyor (bkz. assets/catalog.js, katalog/index.html).
 */

(function () {
  'use strict';

  const collectionNavEl = document.getElementById('home-collection-nav');
  const grid = document.getElementById('featured-grid');

  async function renderCollectionNav() {
    if (!collectionNavEl || typeof getCollections !== 'function') return;
    const collections = await getCollections();
    collectionNavEl.innerHTML = '';
    collections.forEach(c => {
      const link = PB_h('a', {
        href: 'katalog/' + c.slug + '/',
        class: 'pill',
        'data-collection': c.slug
      }, c.name);
      collectionNavEl.append(link);
    });
  }

  /**
   * Admin panelinden düzenlenebilen site metinlerini (hero, hikâye, footer,
   * üst şerit) bağlar. HTML'deki statik metin ilk anda görünür kalır —
   * PB_Data/content.js yüklenemezse veya satır boşsa sayfa bozulmaz
   * (progressive enhancement).
   */
  async function renderSiteTexts() {
    if (typeof PB_Data === 'undefined' || typeof pbFormatInline !== 'function') return;
    const texts = await PB_Data.getSiteTexts();

    const map = {
      'utility-bar-text': 'utility_bar',
      'hero-title-text': 'hero_title',
      'hero-subtitle-text': 'hero_subtitle',
      'hikaye-baslik-text': 'hikaye_baslik',
      'hikaye-metin-text': 'hikaye_metin',
      'hikaye-link-text': 'hikaye_link_metni',
      'footer-marka-text': 'footer_marka_metni'
    };

    Object.entries(map).forEach(([elId, key]) => {
      const el = document.getElementById(elId);
      const value = texts[key];
      if (el && value) el.innerHTML = pbFormatInline(value);
    });
  }

  async function renderProducts() {
    if (!grid || typeof getProducts !== 'function') return;

    // Yükleniyor göstergesi (cache miss durumunda görünür)
    if (!grid.children.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: var(--space-2xl) 0; color: var(--c-toprak);">Yükleniyor…</div>';
    }

    const items = await getProducts({});

    grid.innerHTML = '';
    if (items.length === 0) {
      renderEmptyGridState(grid, { filtered: false });
      return;
    }
    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSiteTexts();
    renderCollectionNav();
    renderProducts();
  });
})();
