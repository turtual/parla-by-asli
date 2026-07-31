/**
 * Parla By Aslı — İçerik sayfası başlatıcı
 *
 * sss/, iletisim/ ve yasal/* sayfalarının hepsinde aynı kalıp: sayfanın
 * kök elemanında data-content-slug var, admin panelinden düzenlenen
 * içerik assets/data.js + assets/content.js üzerinden çekilip basılır.
 * Statik HTML her zaman ilk anda görünür (progressive enhancement) —
 * bu script çalışamazsa veya veri gelmezse sayfa eski hâliyle kalır.
 *
 * Bağımlılık sırası: data.js → content.js → content-page-init.js
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', async () => {
    const root = document.querySelector('[data-content-slug]');
    if (!root || typeof PB_Data === 'undefined' || typeof PB_renderContentBlocks !== 'function') return;

    const slug = root.dataset.contentSlug;
    const page = await PB_Data.getContentPage(slug);
    if (!page) return;

    const eyebrowEl = document.querySelector('[data-cp-eyebrow]');
    const titleEl = document.querySelector('[data-cp-title]');
    const metaEl = document.querySelector('[data-cp-meta]');
    const bodyEl = document.getElementById('legal-body');

    if (eyebrowEl && page.eyebrow) eyebrowEl.textContent = page.eyebrow;
    if (titleEl && page.title) titleEl.textContent = page.title;
    if (metaEl && page.metaText) metaEl.textContent = page.metaText;
    if (bodyEl) PB_renderContentBlocks(page.blocks, bodyEl);
  });
})();
