/**
 * Parla By Aslı — Anasayfa interactivity
 *
 * - Koleksiyon pill listesi — her zaman görünür, sayfa değiştirmez.
 *   Tıklanınca aynı sayfada ürün ızgarasını o koleksiyona daraltır
 *   (URL değişmez, tam sayfa yenilenmez).
 * - "Tümü" pili filtreyi temizler.
 *
 * Not: Koleksiyonlar önceden her biri kendi /katalog/[slug]/ sayfasına
 * sahipti (SEO amaçlı). Bu, tek bir dinamik şablonun (katalog/index.html)
 * Vercel'de dizin/rewrite çakışması yüzünden 404 vermesine yol açtı ve
 * kullanıcı deneyimi olarak da gereksiz bir sayfa geçişiydi; koleksiyon
 * gezinmesi anasayfadaki bu sayfa-içi filtreye taşındı.
 */

(function () {
  'use strict';

  const collectionNavEl = document.getElementById('home-collection-nav');
  const grid = document.getElementById('featured-grid');

  let activeCollectionId = null; // null = Tümü

  async function renderCollectionNav() {
    if (!collectionNavEl || typeof getCollections !== 'function') return;
    const collections = await getCollections();

    collectionNavEl.innerHTML = '';

    const tumuBtn = PB_h('button', {
      type: 'button',
      class: 'pill' + (activeCollectionId === null ? ' is-active' : ''),
      'aria-pressed': activeCollectionId === null ? 'true' : 'false',
      onclick: () => secFiltre(null)
    }, 'Tümü');
    collectionNavEl.append(tumuBtn);

    collections.forEach(c => {
      const btn = PB_h('button', {
        type: 'button',
        class: 'pill' + (activeCollectionId === c.id ? ' is-active' : ''),
        'aria-pressed': activeCollectionId === c.id ? 'true' : 'false',
        'data-collection': c.slug,
        onclick: () => secFiltre(c.id)
      }, c.name);
      collectionNavEl.append(btn);
    });
  }

  function secFiltre(collectionId) {
    activeCollectionId = collectionId;
    renderCollectionNav();
    renderProducts();
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

    // Not: hero_subtitle artık sitede hiçbir yerde gösterilmiyor (başlık
    // header'a taşınırken alt satır kaldırıldı), o yüzden eşleşmesi yok.
    const map = {
      'utility-bar-text': 'utility_bar',
      'hero-title-text': 'hero_title',
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

    const items = await getProducts(activeCollectionId ? { collectionId: activeCollectionId } : {});

    grid.innerHTML = '';
    if (items.length === 0) {
      renderEmptyGridState(grid, { filtered: activeCollectionId !== null });
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
