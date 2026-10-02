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

    hikayeFotografi();
  });

  /*
   * Hikâyemiz sayfasındaki fotoğraf.
   *
   * Yalnız o sayfada çalışır (başka içerik sayfasında #hikaye-foto yok).
   * Kaynak anasayfadaki hikâye bölümüyle ortak: site_texts.hikaye_gorsel.
   * Fotoğraf yoksa ya da yüklenemezse marka mührü görünür kalır.
   */
  async function hikayeFotografi() {
    const img = document.getElementById('hikaye-foto-gorsel');
    const muhur = document.getElementById('hikaye-foto-muhur');
    const kap = document.getElementById('hikaye-foto');
    if (!img || !kap || typeof PB_Data === 'undefined' || !PB_Data.getSiteTexts) return;

    let url = '';
    try {
      const metinler = await PB_Data.getSiteTexts();
      url = (metinler && metinler.hikaye_gorsel) || '';
    } catch (e) { return; }
    if (!url) return;

    /* loading="lazy" KULLANILMIYOR: görsel hidden başlıyor ve gizli bir
       görsel lazy modda hiç yüklenmiyor; load olayı gelmeyince hidden da
       hiç kalkmıyor. Anasayfada aynı hata yaşandı. */
    img.addEventListener('load', () => {
      img.hidden = false;
      if (muhur) muhur.hidden = true;
      kap.classList.add('has-image');
    }, { once: true });

    img.addEventListener('error', () => {
      img.hidden = true;
      kap.classList.remove('has-image');
    }, { once: true });

    img.src = url;
  }
})();
