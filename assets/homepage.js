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

    renderHeroImage(texts.hero_gorsel);
    renderPromoBand(texts.kampanya_metni, texts.kampanya_bitis);
  }

  /**
   * Kapak görselini bağlar. Boşsa hiçbir şey yapılmaz — CSS'teki marka
   * zemini (degrade + mühür filigranı) görünür kalır. Görsel gerçekten
   * yüklenene kadar .has-image eklenmiyor ki kırık URL'de açık zemin
   * üstünde koyu yazı yerine okunmaz beyaz yazı kalmasın.
   */
  function renderHeroImage(url) {
    const hero = document.getElementById('hero');
    const img = document.getElementById('hero-image');
    if (!hero || !img || !url) return;

    img.addEventListener('load', () => {
      img.hidden = false;
      hero.classList.add('has-image');
    });
    img.addEventListener('error', () => {
      img.hidden = true;
      hero.classList.remove('has-image');
    });
    img.src = url;
  }

  /**
   * Kampanya bandı ve geri sayım.
   * - Metin boşsa bant hiç görünmez (uydurma kampanya yayına çıkmasın).
   * - Bitiş tarihi boş/geçersiz/geçmişse yalnız sayaç gizlenir, metin kalır.
   */
  function renderPromoBand(metin, bitisMetni) {
    const band = document.getElementById('promo-band');
    const textEl = document.getElementById('kampanya-metni-text');
    const countdown = document.getElementById('promo-countdown');
    if (!band || !textEl || !countdown) return;

    if (!metin || !metin.trim()) return;   // hidden kalır
    textEl.innerHTML = pbFormatInline(metin);
    band.hidden = false;

    const bitis = bitisMetni ? new Date(bitisMetni) : null;
    if (!bitis || isNaN(bitis.getTime())) return;

    const alanlar = {
      gun: countdown.querySelector('[data-cd="gun"]'),
      saat: countdown.querySelector('[data-cd="saat"]'),
      dakika: countdown.querySelector('[data-cd="dakika"]'),
      saniye: countdown.querySelector('[data-cd="saniye"]')
    };
    const ikiHane = n => String(n).padStart(2, '0');

    function tik() {
      const kalan = bitis.getTime() - Date.now();
      if (kalan <= 0) {
        countdown.hidden = true;
        clearInterval(sayac);
        return;
      }
      const sn = Math.floor(kalan / 1000);
      alanlar.gun.textContent = ikiHane(Math.floor(sn / 86400));
      alanlar.saat.textContent = ikiHane(Math.floor(sn / 3600) % 24);
      alanlar.dakika.textContent = ikiHane(Math.floor(sn / 60) % 60);
      alanlar.saniye.textContent = ikiHane(sn % 60);
      countdown.hidden = false;
    }

    tik();
    const sayac = setInterval(tik, 1000);
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
