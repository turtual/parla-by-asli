/**
 * Parla By Aslı — Anasayfa interactivity
 *
 * Anasayfa artık tek düz ürün ızgarası değil: her koleksiyon kendi
 * başlıklı bölümü olarak alt alta akıyor (önce koleksiyon adı, altında
 * o koleksiyonun ürünleri). Üstteki pil listesi sayfa değiştirmiyor,
 * ilgili bölüme yumuşak kaydırma yapıyor ve sayfa kaydırıldıkça
 * hangi bölümde olunduğunu işaretliyor (scrollspy).
 *
 * Not: Koleksiyonlar bir ara her biri kendi /katalog/[slug]/ sayfasına
 * sahipti; Vercel'de dizin/rewrite çakışması yüzünden 404 veriyordu ve
 * gereksiz bir sayfa geçişiydi. Sonra sayfa-içi filtreye çevrildi, şimdi
 * de bölümlere — böylece ziyaretçi tüm koleksiyonları tek akışta görüyor.
 */

(function () {
  'use strict';

  const collectionNavEl = document.getElementById('home-collection-nav');
  const sectionsEl = document.getElementById('collection-sections');

  let spyHandler = null;

  /** Bir koleksiyon bölümünün DOM id'si — pil ile bölüm bu id üzerinden eşleşir. */
  function sectionId(slug) {
    return 'koleksiyon-' + slug;
  }

  function renderCollectionNav(bolumler) {
    if (!collectionNavEl) return;
    collectionNavEl.innerHTML = '';

    bolumler.forEach((b, i) => {
      const btn = PB_h('button', {
        type: 'button',
        class: 'pill' + (i === 0 ? ' is-active' : ''),
        'data-target': sectionId(b.slug),
        onclick: () => {
          const hedef = document.getElementById(sectionId(b.slug));
          if (hedef) hedef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, b.name);
      collectionNavEl.append(btn);
    });
  }

  /**
   * Sayfa kaydırıldıkça o an bakılan bölümün pilini işaretler.
   *
   * IntersectionObserver yerine ölçüm kullanılıyor: bölümler ekrandan uzun
   * olduğu için aynı anda birden fazlası "görünür" oluyor ve hangisinin
   * aktif sayılacağı IO'nun kendi sırasından okunamıyor. Burada eşiği
   * (sticky header + pil şeridi) geçmiş EN SON bölüm aktif kabul ediliyor.
   */
  function setupScrollSpy(bolumler) {
    if (!collectionNavEl) return;
    if (spyHandler) window.removeEventListener('scroll', spyHandler);

    const idler = bolumler.map(b => sectionId(b.slug));
    let sonCalisma = 0;

    function guncelle() {
      const header = document.querySelector('.site-header');
      const serit = document.querySelector('.mode-area');
      const esik = (header ? header.offsetHeight : 0) + (serit ? serit.offsetHeight : 0) + 8;

      let aktif = idler[0];
      idler.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= esik) aktif = id;
      });

      collectionNavEl.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('is-active', p.dataset.target === aktif);
      });
    }

    // Basit zaman damgalı kısıtlama — bir avuç bölümün rect'ini okumak ucuz,
    // requestAnimationFrame'e gerek yok (arka plandaki sekmede o durabiliyor).
    spyHandler = () => {
      const simdi = Date.now();
      if (simdi - sonCalisma < 60) return;
      sonCalisma = simdi;
      guncelle();
    };

    window.addEventListener('scroll', spyHandler, { passive: true });
    guncelle();
  }

  function renderSections(bolumler) {
    sectionsEl.innerHTML = '';

    bolumler.forEach(b => {
      const section = PB_h('section', {
        class: 'collection-section',
        id: sectionId(b.slug),
        'aria-labelledby': sectionId(b.slug) + '-baslik'
      });

      const container = PB_h('div', { class: 'container' });
      const head = PB_h('div', { class: 'collection-section-head' });
      head.append(PB_h('h2', {
        class: 'collection-section-title',
        id: sectionId(b.slug) + '-baslik'
      }, b.name));

      if (b.description) {
        head.append(PB_h('p', { class: 'collection-section-desc' }, b.description));
      }

      const grid = PB_h('div', { class: 'product-grid' });
      b.products.forEach((p, i) => grid.append(renderProductCard(p, i)));

      container.append(head, grid);
      section.append(container);
      sectionsEl.append(section);
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

  async function render() {
    if (!sectionsEl || typeof getProducts !== 'function') return;

    sectionsEl.innerHTML = '<div class="collection-loading">Yükleniyor…</div>';

    const [collections, products] = await Promise.all([
      typeof getCollections === 'function' ? getCollections() : [],
      getProducts({})
    ]);

    // Koleksiyon sırasına göre grupla; ürünü olmayan koleksiyon gösterilmez
    const bolumler = collections
      .map(c => ({
        slug: c.slug,
        name: c.name,
        description: c.description || '',
        products: products.filter(p => p.collectionId === c.id)
      }))
      .filter(b => b.products.length > 0);

    // Hiçbir koleksiyona atanmamış ürünler kaybolmasın
    const atanmis = new Set(collections.map(c => c.id));
    const bosta = products.filter(p => !p.collectionId || !atanmis.has(p.collectionId));
    if (bosta.length) {
      bolumler.push({ slug: 'diger', name: 'Diğer Ürünler', description: '', products: bosta });
    }

    if (!bolumler.length) {
      sectionsEl.innerHTML = '';
      const bos = PB_h('div', { class: 'container' });
      const grid = PB_h('div', { class: 'product-grid' });
      renderEmptyGridState(grid, { filtered: false });
      bos.append(grid);
      sectionsEl.append(bos);
      if (collectionNavEl) collectionNavEl.innerHTML = '';
      return;
    }

    renderSections(bolumler);
    renderCollectionNav(bolumler);
    setupScrollSpy(bolumler);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSiteTexts();
    render();
  });
})();
