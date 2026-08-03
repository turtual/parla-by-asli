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

    renderHeroImages(texts.hero_gorseller, texts.hero_gorsel);
    renderPromoBand(texts.kampanya_metni, texts.kampanya_bitis);
  }

  /**
   * Hero'nun ekranı tam kaplaması için üst şerit + header yüksekliğini
   * ölçüp --hero-offset'e yazar. Sabit sayı yerine ölçüm kullanılıyor:
   * üst şerit metni dar ekranda iki satıra sarabiliyor ve header
   * yüksekliği kırılma noktasına göre değişiyor.
   */
  function heroYuksekligiAyarla() {
    const serit = document.querySelector('.utility-bar');
    const header = document.querySelector('.site-header');
    const toplam = (serit ? serit.offsetHeight : 0) + (header ? header.offsetHeight : 0);
    if (toplam > 0) {
      document.documentElement.style.setProperty('--hero-offset', toplam + 'px');
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

    const slaytlar = liste.map((g, i) => {
      const s = PB_h('div', { class: 'hero-slide' + (i === 0 ? ' is-active' : '') });
      s.style.backgroundImage = 'url("' + String(g.url).replace(/"/g, '%22') + '")';
      if (g.pos) s.style.backgroundPosition = g.pos;
      if (g.zoom && g.zoom > 1) s.style.backgroundSize = (g.zoom * 100) + '%';
      media.appendChild(s);
      return s;
    });

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

    const items = await getProducts(activeCollectionId ? { collectionId: activeCollectionId } : {});

    grid.innerHTML = '';
    if (items.length === 0) {
      renderEmptyGridState(grid, { filtered: activeCollectionId !== null });
      return;
    }
    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    heroYuksekligiAyarla();
    renderSiteTexts();
    renderCollectionNav();
    renderProducts();
  });

  // Ekran döndürme / pencere boyutu değişiminde yeniden ölç
  window.addEventListener('resize', heroYuksekligiAyarla, { passive: true });
})();
