/**
 * Parla By Aslı — Koleksiyon sayfası mantığı (tek dinamik şablon)
 *
 * Eski mimaride her ürün tipi (kolye, küpe, ...) için ayrı statik HTML
 * dosyası vardı ve her biri `window.PB_CATEGORY` set ediyordu. Artık
 * kategoriler (hem koleksiyon hem ürün tipi) admin panelinden Supabase'e
 * yazılıyor ve build adımı olmadığı için admin yeni bir koleksiyon
 * eklediğinde yeni bir statik dosya oluşturulamıyor.
 *
 * Bu yüzden TEK bir şablon (katalog/index.html) var; hangi koleksiyonun
 * gösterileceği URL'den (location.pathname) okunuyor. Vercel'de
 * `/katalog/:slug/` -> bu dosyaya rewrite ediliyor (vercel.json), yani
 * tarayıcıda görünen adres değişmeden bu script çalışıyor.
 *
 * İki seviyeli filtre:
 *   - Koleksiyon (üst)   → URL'den gelir, sayfanın kendisini belirler
 *   - Ürün tipi (alt)    → sayfa içi state, URL değişmez
 */

(function () {
  'use strict';

  const grid = document.getElementById('catalog-grid');
  const countEl = document.getElementById('catalog-count');
  const titleEl = document.getElementById('catalog-title');
  const descEl = document.getElementById('catalog-desc');
  const breadcrumbEl = document.getElementById('breadcrumb-current');
  const collectionNavEl = document.getElementById('catalog-collection-nav');
  const typeFilterEl = document.getElementById('catalog-type-filter');
  const footerCollectionsEl = document.getElementById('footer-collections');

  let activeTypeSlug = null; // null = tüm ürün tipleri

  /**
   * URL'den koleksiyon slug'ını okur.
   * `/katalog/dogal-tas/` veya `/katalog/dogal-tas` (yerel test) ikisini de kapsar.
   */
  function getSlugFromUrl() {
    const match = window.location.pathname.match(/\/katalog\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function showNotFound() {
    titleEl.textContent = 'Koleksiyon bulunamadı';
    countEl.textContent = '';
    grid.innerHTML = '';
    const box = PB_h('div', { class: 'catalog-empty' });
    box.append(PB_h('p', {}, 'Aradığın koleksiyon bulunamadı ya da kaldırılmış olabilir.'));
    box.append(PB_h('a', { class: 'btn btn-ghost', href: '../../index.html' }, 'Tüm ürünlere dön'));
    grid.append(box);
  }

  /** Üst nav + footer'daki koleksiyon listelerini doldurur. */
  function renderCollectionNav(collections, activeSlug) {
    collectionNavEl.innerHTML = '';
    collections.forEach(c => {
      const active = c.slug === activeSlug;
      const link = PB_h('a', {
        // Şu an /katalog/[bu-sayfanin-slug'i]/ konumundayız — bir üst
        // seviye zaten /katalog/, oradan direkt hedef slug'a geçilir.
        href: '../' + c.slug + '/',
        class: 'pill',
        'data-collection': c.slug
      }, c.name);
      if (active) link.setAttribute('aria-current', 'page');
      collectionNavEl.append(link);
    });

    if (footerCollectionsEl) {
      footerCollectionsEl.innerHTML = '';
      collections.slice(0, 4).forEach(c => {
        const li = PB_h('li', {});
        li.append(PB_h('a', { href: '../' + c.slug + '/' }, c.name));
        footerCollectionsEl.append(li);
      });
    }
  }

  /** Ürün tipi (alt segment) pill filtresini doldurur — tek seçim, URL değişmez. */
  function renderTypeFilter(productTypes) {
    if (productTypes.length === 0) {
      typeFilterEl.hidden = true;
      return;
    }
    typeFilterEl.hidden = false;
    typeFilterEl.innerHTML = '';

    const hepsiBtn = PB_h('button', {
      type: 'button',
      class: 'pill' + (activeTypeSlug === null ? ' is-active' : ''),
      role: 'tab',
      'aria-selected': activeTypeSlug === null ? 'true' : 'false',
      onclick: () => { activeTypeSlug = null; renderTypeFilter(productTypes); rerenderGrid(); }
    }, 'Tümü');
    typeFilterEl.append(hepsiBtn);

    productTypes.forEach(t => {
      const active = activeTypeSlug === t.slug;
      const btn = PB_h('button', {
        type: 'button',
        class: 'pill' + (active ? ' is-active' : ''),
        role: 'tab',
        'aria-selected': active ? 'true' : 'false',
        onclick: () => { activeTypeSlug = t.slug; renderTypeFilter(productTypes); rerenderGrid(); }
      }, t.name);
      typeFilterEl.append(btn);
    });
  }

  let currentCollection = null;
  let allItemsCache = [];

  async function rerenderGrid() {
    const loadError = window.PB_Data && window.PB_Data.getLastError
      ? window.PB_Data.getLastError()
      : null;

    const items = activeTypeSlug
      ? allItemsCache.filter(p => p.category === activeTypeSlug)
      : allItemsCache;

    if (countEl) {
      if (loadError) countEl.textContent = '';
      else countEl.textContent = items.length === 0 ? 'Henüz ürün yok' : items.length + ' ürün';
    }

    grid.innerHTML = '';

    if (loadError) {
      const errBox = PB_h('div', { class: 'catalog-empty', role: 'alert' });
      errBox.append(PB_h('p', {}, 'Ürünler şu anda yüklenemiyor. Bağlantı sorunu olabilir.'));
      errBox.append(PB_h('button', {
        class: 'btn btn-ghost', type: 'button', onclick: () => window.location.reload()
      }, 'TEKRAR DENE'));
      grid.append(errBox);
      return;
    }

    if (items.length === 0) {
      const empty = PB_h('div', { class: 'catalog-empty' });
      empty.append(PB_h('p', {}, 'Bu koleksiyonda henüz ürün yok.'));
      grid.append(empty);
      return;
    }

    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  async function init() {
    const slug = getSlugFromUrl();
    if (!slug) { showNotFound(); return; }

    grid.innerHTML = '<div class="catalog-loading" style="grid-column: 1/-1; text-align:center; padding: var(--space-2xl) 0; color: var(--c-toprak);">Yükleniyor…</div>';

    const [collection, collections, productTypes] = await Promise.all([
      getCollectionBySlug(slug),
      getCollections(),
      getProductTypes()
    ]);

    if (!collection) { showNotFound(); return; }
    currentCollection = collection;

    // Başlık, açıklama, breadcrumb, sekme başlığı ve meta description'ı güncelle
    document.title = collection.name + ' · Parla By Aslı';
    titleEl.textContent = collection.name;
    breadcrumbEl.textContent = collection.name;
    if (collection.description) {
      descEl.textContent = collection.description;
      descEl.hidden = false;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', collection.name + ' koleksiyonu — Parla By Aslı. ' + (collection.description || ''));
    const ogTitle = document.querySelector('meta[property="og:title"]') || (() => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); document.head.appendChild(m); return m;
    })();
    ogTitle.setAttribute('content', collection.name + ' · Parla By Aslı');

    renderCollectionNav(collections, slug);
    renderTypeFilter(productTypes);

    allItemsCache = await getProducts({ collectionId: collection.id });
    await rerenderGrid();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
