/**
 * Parla By Aslı — Anasayfa interactivity
 *
 * - İki katmanlı filtre — her zaman görünür, sayfa değiştirmez.
 *   Üstte ürün tipi (Kolye, Küpe…), altta o tipte ürünü olan koleksiyonlar.
 *   Tıklanınca aynı sayfada ürün ızgarası daralır (URL değişmez, tam sayfa
 *   yenilenmez). Her iki satırdaki "Tümü" pili o katmanı temizler.
 *
 * Not: Koleksiyonlar önceden her biri kendi /katalog/[slug]/ sayfasına
 * sahipti (SEO amaçlı). Bu, tek bir dinamik şablonun (katalog/index.html)
 * Vercel'de dizin/rewrite çakışması yüzünden 404 vermesine yol açtı ve
 * kullanıcı deneyimi olarak da gereksiz bir sayfa geçişiydi; koleksiyon
 * gezinmesi anasayfadaki bu sayfa-içi filtreye taşındı.
 */

(function () {
  'use strict';

  const typeNavEl = document.getElementById('home-type-nav');
  const collectionNavEl = document.getElementById('home-collection-nav');
  const grid = document.getElementById('featured-grid');

  let activeCategory = null;     // null = tüm ürün tipleri (üst filtre)
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
  async function renderFilters() {
    if (!typeNavEl || typeof getCollections !== 'function') return;

    const [collections, types, products] = await Promise.all([
      getCollections(),
      typeof getProductTypes === 'function' ? getProductTypes() : [],
      getProducts()
    ]);

    // ── Üst satır: ürün tipleri ──
    const varOlanTipler = types.filter(t => products.some(p => p.category === t.slug));

    // Üst katman düğme değil sekme görünümünde (bkz. .type-tab): zemin
    // sayfayla aynı, seçili olanın altında kalın bakır çizgi var. Alt
    // katmanın pilleriyle karışmasın diye kasten farklı.
    typeNavEl.innerHTML = '';
    typeNavEl.append(pilOlustur('Tümü', activeCategory === null, () => tipSec(null), null, 'type-tab'));
    varOlanTipler.forEach(t => {
      typeNavEl.append(pilOlustur(t.name, activeCategory === t.slug, () => tipSec(t.slug), t.slug, 'type-tab'));
    });

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

    renderHeroImages(texts.hero_gorseller, texts.hero_gorsel);
    renderPromoBand(texts.kampanya_metni, texts.kampanya_bitis);
  }

  /**
   * İki ölçü yazar, ikisi de sabit sayı yerine ölçümle: üst şerit metni dar
   * ekranda iki satıra sarabiliyor, header yüksekliği kırılma noktasına göre
   * değişiyor.
   *
   *   --hero-offset → üst şerit + header. Hero'nun ekranı tam kaplaması için.
   *   --sticky-ust  → yalnız header (üst şerit sayfayla birlikte kayıp gidiyor,
   *                   yapışkan olan sadece header). "ÜRÜNLERİ KEŞFET"e basınca
   *                   filtre menüsü header'ın altında kalmasın diye #urunler'in
   *                   scroll-margin-top'u buna bağlı.
   */
  function heroYuksekligiAyarla() {
    const serit = document.querySelector('.utility-bar');
    const header = document.querySelector('.site-header');
    const headerYuksekligi = header ? header.offsetHeight : 0;
    const toplam = (serit ? serit.offsetHeight : 0) + headerYuksekligi;

    if (toplam > 0) {
      document.documentElement.style.setProperty('--hero-offset', toplam + 'px');
    }
    if (headerYuksekligi > 0) {
      document.documentElement.style.setProperty('--sticky-ust', headerYuksekligi + 'px');
    }
  }

  /**
   * Kapak görselini bağlar. Boşsa hiçbir şey yapılmaz — CSS'teki marka
   * zemini (degrade + mühür filigranı) görünür kalır. Görsel gerçekten
   * yüklenene kadar .has-image eklenmiyor ki kırık URL'de açık zemin
   * üstünde koyu yazı yerine okunmaz beyaz yazı kalmasın.
   */
  /**
   * Kapak görsellerini bağlar ve birden fazlaysa otomatik döndürür.
   *
   * Veri biçimi (site_texts.hero_gorseller): JSON dizisi, en fazla 5 öğe
   *   [{ "url": "...", "pos": "50% 40%", "zoom": 1.2 }, ...]
   * "pos" ve "zoom" admin'deki çerçeveleme aracından geliyor: fotoğrafın
   * hangi bölgesinin görüneceğini belirliyorlar.
   *
   * Eski tek görselli alan (hero_gorsel) hâlâ destekleniyor — yeni alan
   * boşsa ona düşülüyor, böylece bu değişiklik mevcut kapağı bozmuyor.
   *
   * Slaytlar tıklanabilir DEĞİL: kapak bir dekor, gezinme öğesi değil.
   */
  function renderHeroImages(jsonMetin, tekUrl) {
    const hero = document.getElementById('hero');
    const media = hero ? hero.querySelector('.hero-media') : null;
    if (!hero || !media) return;

    let liste = [];
    try {
      const cozulen = jsonMetin ? JSON.parse(jsonMetin) : null;
      if (Array.isArray(cozulen)) {
        liste = cozulen.filter(g => g && g.url).slice(0, 5);
      }
    } catch (e) {
      console.warn('Kapak görselleri okunamadı, tek görsele düşülüyor:', e);
    }
    if (!liste.length && tekUrl) liste = [{ url: tekUrl }];

    // Eski tek <img> yerine slayt katmanları kuruluyor
    const eskiImg = document.getElementById('hero-image');
    if (eskiImg) eskiImg.remove();
    media.querySelectorAll('.hero-slide').forEach(s => s.remove());

    if (!liste.length) {
      hero.classList.add('no-image');
      return;
    }

    // Slayt (kaydırma) ile görsel (kadraj) ayrı katmanlar: dış div yalnız
    // translateX ile kayar, içteki img kırpma/kaydırma/yakınlaştırmayı
    // taşır. Tek elemanda toplansaydı iki transform birbirini ezerdi.
    // Telefon ve bilgisayar kadrajı AYRI tutuluyor. Kapak ekranı tamamen
    // kapladığı için bu iki oran (geniş / dar-uzun) çok farklı kırpıyor;
    // tek değer paylaşılınca birini düzeltmek diğerini bozuyordu.
    const darEkran = window.matchMedia('(max-width: 767px)');

    function kadrajUygula(im, g) {
      const mobil = darEkran.matches;
      const pos = (mobil && g.posM) ? g.posM : g.pos;
      const zoom = (mobil && g.zoomM) ? g.zoomM : g.zoom;
      im.style.objectPosition = pos || 'center';
      im.style.transform = (zoom && zoom > 1) ? 'scale(' + zoom + ')' : '';
    }

    const slaytlar = liste.map((g, i) => {
      const s = PB_h('div', { class: 'hero-slide' + (i === 0 ? ' is-active' : '') });
      const im = PB_h('img', { alt: '', 'aria-hidden': 'true' });
      im.src = g.url;
      // object-fit:cover + object-position + scale üçlüsü, admin'deki
      // önizlemede de birebir aynı uygulanıyor: gördüğün kadraj bu.
      kadrajUygula(im, g);
      s.appendChild(im);
      media.appendChild(s);
      return s;
    });

    // Ekran döndürülünce / pencere yeniden boyutlandırılınca doğru kadraja geç.
    // Hem matchMedia 'change' hem window 'resize' dinleniyor: bazı ortamlarda
    // sorgunun kendisi güncellenirken change olayı gelmiyor ve kadraj eski
    // ekranın değerlerinde takılı kalıyordu.
    let sonDurum = darEkran.matches;
    function kadrajTazele() {
      if (darEkran.matches === sonDurum) return;   // gereksiz iş yapma
      sonDurum = darEkran.matches;
      slaytlar.forEach((s, i) => kadrajUygula(s.querySelector('img'), liste[i]));
    }
    darEkran.addEventListener('change', kadrajTazele);
    window.addEventListener('resize', kadrajTazele, { passive: true });

    // İlk görsel gerçekten yüklenmeden .has-image eklemiyoruz: kırık URL'de
    // açık zemin üstünde krem yazı okunmaz kalırdı.
    const kontrol = new Image();
    kontrol.onload = () => {
      hero.classList.remove('no-image');
      hero.classList.add('has-image');
    };
    kontrol.onerror = () => {
      hero.classList.remove('has-image');
      hero.classList.add('no-image');
    };
    kontrol.src = liste[0].url;

    if (slaytlar.length < 2) return;

    // Otomatik geçiş — hareket azaltma tercihine saygı duyuluyor
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let aktif = 0;
    let sayac = setInterval(ilerle, 4000);

    function ilerle() {
      const onceki = slaytlar[aktif];
      aktif = (aktif + 1) % slaytlar.length;
      const yeni = slaytlar[aktif];

      // Yeni slayt sağdan gelir, eski sola çıkar
      yeni.classList.add('is-giriyor');
      // reflow: sınıf eklenip hemen kaldırılınca geçiş çalışmıyor
      void yeni.offsetWidth;
      yeni.classList.add('is-active');
      yeni.classList.remove('is-giriyor');
      onceki.classList.remove('is-active');
      onceki.classList.add('is-cikiyor');
      setTimeout(() => onceki.classList.remove('is-cikiyor'), 900);
    }

    // Sekme arka plandayken döndürmenin anlamı yok; pil ve işlemci boşa gider
    document.addEventListener('visibilitychange', () => {
      clearInterval(sayac);
      if (!document.hidden) sayac = setInterval(ilerle, 4000);
    });
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

    const bulunanlar = await getProducts({
      collectionId: activeCollectionId,
      category: activeCategory
    });

    // Öne çıkan (⭐) ürünler ızgaranın başına geçer; gerisi panelde
    // sürükleyerek verilen sırayla gelir. Bkz. products.js sortForDisplay.
    const items = typeof sortForDisplay === 'function' ? sortForDisplay(bulunanlar) : bulunanlar;

    grid.innerHTML = '';
    if (items.length === 0) {
      renderEmptyGridState(grid, { filtered: activeCollectionId !== null || activeCategory !== null });
      return;
    }
    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    heroYuksekligiAyarla();
    renderSiteTexts();
    renderFilters();
    renderProducts();
  });

  // Ekran döndürme / pencere boyutu değişiminde yeniden ölç
  window.addEventListener('resize', heroYuksekligiAyarla, { passive: true });
})();
