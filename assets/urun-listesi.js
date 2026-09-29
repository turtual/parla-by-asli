/**
 * Parla By Aslı — Ürün listesi sayfası (iki katmanlı filtre + ızgara)
 *
 * Anasayfa 2026'da editorial bir akışa dönünce (yeni gelenler, favoriler,
 * taşını bul…) tüm kataloğu tek ekranda gösteren bu filtre kendi sayfasına
 * taşındı: /urunler/ ve kategori sayfaları.
 *
 *   Üst satır  — ürün tipi: Tümü · Kolye · Küpe · Bileklik …
 *   Alt satır  — koleksiyon: seçili tipte ürünü OLAN koleksiyonlar
 *
 * Alt satır üstteki seçime göre yeniden kuruluyor: "Küpe"ye basınca aşağıda
 * yalnız küpesi olan koleksiyonlar kalıyor. Böylece hiçbir kombinasyon boş
 * sonuç vermiyor.
 *
 * Kategori sayfaları üst satırı gizleyip tek tipe kilitleyebilir:
 *   <div class="urun-listesi" data-sabit-tip="kolye">
 */

(function () {
  'use strict';

  const typeNavEl = document.getElementById('home-type-nav');
  const collectionNavEl = document.getElementById('home-collection-nav');
  const grid = document.getElementById('featured-grid');

  /* Kategori sayfaları tek ürün tipine kilitlenir: üst satır gizlenir,
     koleksiyon satırı çalışmaya devam eder. Kilit HTML'den geliyor:
     <section class="urun-listesi" data-sabit-tip="kolye"> */
  const sabitTipKok = document.querySelector('[data-sabit-tip]');
  const sabitTip = sabitTipKok ? (sabitTipKok.dataset.sabitTip || null) : null;

  /* Menüdeki "Yeni Gelenler" /urunler/?sirala=yeni adresine gidiyor.
     Ayrı bir sayfa açmak yerine aynı listeyi tarihe göre sıralıyoruz —
     filtreler de çalışmaya devam ediyor. */
  const adresParam = new URLSearchParams(location.search);
  const siralama = adresParam.get('sirala');

  /* Taş sayfalarındaki "Lapis tasarımlarını gör" bağlantısı buraya geliyor:
     /urunler/?tas=lapis-lazuli. Eşleşme kuralı taş sayfasındakiyle aynı
     (assets/taslar-eslesme.js) — iki yerde iki farklı sonuç çıkmasın. */
  const tasFiltresi = adresParam.get('tas');

  let activeCategory = sabitTip; // null = tüm ürün tipleri (üst filtre)
  let activeCollectionId = null; // null = tüm koleksiyonlar (alt filtre)

  /**
   * İki katmanlı filtre.
   *
   *   Üst satır  — ürün tipi: Tümü · Kolye · Küpe · Bileklik …
   *   Alt satır  — koleksiyon: seçili tipte ürünü OLAN koleksiyonlar
   *
   * Alt satır üstteki seçime göre yeniden kuruluyor: "Küpe"ye basınca aşağıda
   * yalnız küpesi olan koleksiyonlar kalıyor, küpesi olmayanlar listeden
   * çıkıyor. Böylece hiçbir kombinasyon boş sonuç vermiyor.
   *
   * Her iki satırda da yalnız gerçekten ürünü olan seçenekler görünür.
   */
  /** Taş filtresi aktifse sayfanın başında hangi taşa bakıldığını söyler. */
  function tasBasligiYaz() {
    if (!tasFiltresi) return;
    const baslik = document.getElementById('urunler-baslik');
    const altYazi = document.querySelector('.section-head .section-sub');
    const tas = (window.PB_TASLAR || []).find(t => t.slug === tasFiltresi);
    if (!tas || !baslik) return;

    baslik.textContent = tas.ad + ' tasarımları';
    if (altYazi) {
      altYazi.textContent = tas.ad + ' taşını taşıyan Parla parçaları. '
        + 'Taşın hikâyesi için ansiklopedi sayfasına bakabilirsin.';
    }
    document.title = tas.ad + ' Tasarımları · Parla By Aslı';
  }

  async function renderFilters() {
    if (!typeNavEl || typeof getCollections !== 'function') return;

    const [collections, types, products] = await Promise.all([
      getCollections(),
      typeof getProductTypes === 'function' ? getProductTypes() : [],
      getProducts()
    ]);

    // ── Üst satır: ürün tipleri ──
    const varOlanTipler = sabitTip ? [] : types.filter(t => products.some(p => p.category === t.slug));
    typeNavEl.hidden = !!sabitTip;

    // Üst katman düğme değil sekme görünümünde (bkz. .type-tab): zemin
    // sayfayla aynı, seçili olanın altında kalın bakır çizgi var. Alt
    // katmanın pilleriyle karışmasın diye kasten farklı.
    typeNavEl.innerHTML = '';
    if (!sabitTip) {
      typeNavEl.append(pilOlustur('Tümü', activeCategory === null, () => tipSec(null), null, 'type-tab'));
      varOlanTipler.forEach(t => {
        typeNavEl.append(pilOlustur(t.name, activeCategory === t.slug, () => tipSec(t.slug), t.slug, 'type-tab'));
      });
    }

    // ── Alt satır: seçili tipte ürünü olan koleksiyonlar ──
    const kapsam = activeCategory
      ? products.filter(p => p.category === activeCategory)
      : products;

    const varOlanKoleksiyonlar = collections.filter(c =>
      kapsam.some(p => urunKoleksiyondaMi(p, c.id)));

    collectionNavEl.innerHTML = '';

    // Tek koleksiyon kaldıysa seçim yapmak anlamsız — satırı hiç göstermiyoruz
    if (varOlanKoleksiyonlar.length < 2) {
      collectionNavEl.hidden = true;
      return;
    }

    collectionNavEl.hidden = false;
    collectionNavEl.append(pilOlustur(
      activeCategory ? 'Tüm koleksiyonlar' : 'Tümü',
      activeCollectionId === null,
      () => koleksiyonSec(null)
    ));
    varOlanKoleksiyonlar.forEach(c => {
      const adet = kapsam.filter(p => urunKoleksiyondaMi(p, c.id)).length;
      const pil = pilOlustur(c.name, activeCollectionId === c.id,
        () => koleksiyonSec(c.id), c.slug);
      pil.append(PB_h('span', { class: 'pill-adet' }, String(adet)));
      collectionNavEl.append(pil);
    });
  }

  function urunKoleksiyondaMi(p, collectionId) {
    return typeof productInCollection === 'function'
      ? productInCollection(p, collectionId)
      : p.collectionId === collectionId;
  }

  function pilOlustur(etiket, secili, onclick, veriSlug, sinif) {
    const nitelikler = {
      type: 'button',
      class: (sinif || 'pill') + (secili ? ' is-active' : ''),
      'aria-pressed': secili ? 'true' : 'false',
      onclick
    };
    if (veriSlug) nitelikler['data-slug'] = veriSlug;
    return PB_h('button', nitelikler, etiket);
  }

  /**
   * Üst filtre. Seçili koleksiyonda bu tipten ürün yoksa alt filtre
   * sıfırlanıyor — aksi hâlde "Küpe + Seramik Serisi" gibi boş bir
   * kombinasyonda kalınıyordu.
   */
  async function tipSec(category) {
    activeCategory = category;

    if (activeCollectionId) {
      const eslesen = await getProducts({ category, collectionId: activeCollectionId });
      if (!eslesen.length) activeCollectionId = null;
    }

    renderFilters();
    renderProducts();
  }

  function koleksiyonSec(collectionId) {
    activeCollectionId = collectionId;
    renderFilters();
    renderProducts();
  }

  async function renderProducts() {
    if (!grid || typeof getProducts !== 'function') return;

    // Yükleniyor göstergesi (cache miss durumunda görünür)
    if (!grid.children.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: var(--space-2xl) 0; color: var(--c-toprak);">Yükleniyor…</div>';
    }

    let bulunanlar = await getProducts({
      collectionId: activeCollectionId,
      category: activeCategory
    });

    if (tasFiltresi && typeof PB_TasEslesme !== 'undefined') {
      bulunanlar = PB_TasEslesme.tasinUrunleri(tasFiltresi, bulunanlar);
    }

    // Varsayılan: öne çıkan (⭐) ürünler ızgaranın başına geçer, gerisi
    // panelde sürükleyerek verilen sırayla gelir (products.js sortForDisplay).
    // ?sirala=yeni ise eklenme tarihine göre yeniden eskiye.
    const items = siralama === 'yeni'
      ? bulunanlar.slice().sort((a, b) => stoktaOnce(a, b) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      : (typeof sortForDisplay === 'function' ? sortForDisplay(bulunanlar) : bulunanlar);

    grid.innerHTML = '';
    if (items.length === 0) {
      renderEmptyGridState(grid, { filtered: activeCollectionId !== null || activeCategory !== null });
      return;
    }
    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!typeNavEl && !grid) return;   // bu sayfada liste yok
    tasBasligiYaz();
    renderFilters();
    renderProducts();
  });
})();
