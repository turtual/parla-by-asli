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
      'footer-marka-text': 'footer_marka_metni',
      'hero-eyebrow-text': 'hero_eyebrow',
      'hero-cta-text': 'hero_cta_metni',
      'editorial-metni': 'editorial_metni',
      'tasini-bul-metni': 'tasini_bul_metni',
      'kutu-baslik-text': 'kutu_baslik',
      'kutu-metin-text': 'kutu_metni',
      'bulten-baslik-text': 'bulten_baslik',
      'bulten-metin-text': 'bulten_metni'
    };

    Object.entries(map).forEach(([elId, key]) => {
      const el = document.getElementById(elId);
      const value = texts[key];
      if (el && value) el.innerHTML = pbFormatInline(value);
    });

    renderHeroImages(texts.hero_gorseller, texts.hero_gorsel);
    renderPromoBand(texts.kampanya_metni, texts.kampanya_bitis);

    // Bölüm görselleri ve içerikleri — hepsi panelden yönetiliyor
    renderEditorial(texts.editorial_gorsel);
    renderTasSecim(texts.tasini_bul_taslar);
    renderLookbook(texts.lookbook_gorsel, texts.lookbook_baslik, texts.lookbook_link);
    renderHikayeGorseli(texts.hikaye_gorsel);
    renderKutuGorseli(texts.kutu_gorsel);
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

      /* Yalnız ilk slayt açılışta gerekli — o sayfanın en büyük görseli
         (LCP), öncelikli yükleniyor. Diğerleri 4 saniyede bir sırayla
         geliyor; hepsini baştan indirmek ilk açılışı yavaşlatıyordu. */
      const im = PB_h('img', {
        alt: '',
        'aria-hidden': 'true',
        decoding: 'async',
        loading: i === 0 ? 'eager' : 'lazy',
        fetchpriority: i === 0 ? 'high' : 'low'
      });
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
    if (!band || !textEl) return;

    if (!metin || !metin.trim()) return;   // hidden kalır
    textEl.innerHTML = pbFormatInline(metin);
    band.hidden = false;

    // Geri sayım anasayfadan kaldırıldı; sayaç elemanı yoksa yalnız metin gösterilir
    if (!countdown) return;

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

  /* ──────────── Yeni Gelenler ────────────
   * Panelde en son eklenen 4 parça. Sıralama created_at'e göre; panelde
   * yeni ürün listenin başına eklendiği için sürükle-bırak sırasıyla da
   * uyumlu kalıyor ama burada tarih esas alınıyor: "yeni" olmanın ölçüsü
   * elle verilen sıra değil, gerçekten ne zaman eklendiği. */
  async function renderYeniGelenler() {
    const grid = document.getElementById('yeni-gelenler-grid');
    if (!grid || typeof getProducts !== 'function') return;

    const hepsi = await getProducts({});
    if (!hepsi.length) {
      const bolum = document.getElementById('yeni-gelenler');
      if (bolum) bolum.hidden = true;
      return;
    }

    const yeniler = hepsi
      .slice()
      .sort((a, b) => stoktaOnce(a, b) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 4);

    grid.innerHTML = '';
    yeniler.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  /* ──────────── Parla Favorileri ────────────
   * İçerik panelden geliyor: ürün formunda "Öne çıkan ürün" işaretli
   * parçalar. Hiç işaretli yoksa bölüm görünmez — boş başlık kalmasın.
   * Düzen kasten asimetrik (solda büyük, sağda iki küçük) ki Yeni
   * Gelenler ızgarasının kopyası gibi durmasın. */
  async function renderFavoriler() {
    const bolum = document.getElementById('favoriler');
    const duzen = document.getElementById('favori-duzen');
    if (!bolum || !duzen || typeof getProducts !== 'function') return;

    /* Stokta olan öne: favorilerde ilk sıra en büyük kart, oraya tükenmiş
       bir parça düşünce bölümün tamamı ölü görünüyordu. */
    const favoriler = (await getProducts({ featuredOnly: true }))
      .slice()
      .sort(stoktaOnce)
      .slice(0, 3);
    if (!favoriler.length) return;   // hidden kalır

    duzen.innerHTML = '';
    favoriler.forEach((p, i) => duzen.append(renderProductCard(p, i)));
    bolum.hidden = false;
  }

  /* ──────────── Taşını Bul ────────────
   * Taşlar ansiklopedinin kendi verisinden (assets/taslar-listesi.js).
   * Hangileri görünecek: admin → Metinler → "Taşını Bul — gösterilecek
   * taşlar". Fotoğrafı olan taşta fotoğraf, olmayanda taşın kendi
   * renginden türeyen düz zemin çıkar — uydurma görsel koymuyoruz. */
  async function renderTasSecim(secimMetni) {
    const kap = document.getElementById('tas-secim');
    const bolum = document.getElementById('tasini-bul');
    if (!kap) return;

    const tumTaslar = window.PB_TASLAR || [];
    if (!tumTaslar.length) {
      if (bolum) bolum.hidden = true;
      return;
    }

    const istenen = String(secimMetni || '')
      .split(/[,\n]/).map(s => s.trim()).filter(Boolean);

    const secilenler = (istenen.length
      ? istenen.map(slug => tumTaslar.find(t => t.slug === slug)).filter(Boolean)
      : tumTaslar.slice(0, 6));

    if (!secilenler.length) {
      if (bolum) bolum.hidden = true;
      return;
    }

    // Fotoğraflar ayrı tabloda; tablo yoksa boş harita döner
    let gorseller = {};
    try {
      if (typeof PB_Data !== 'undefined' && PB_Data.getStoneImages) {
        gorseller = await PB_Data.getStoneImages();
      }
    } catch (e) { /* fotoğraf yoksa renk zemini yeterli */ }

    kap.innerHTML = '';
    secilenler.forEach(tas => {
      const bag = PB_h('a', {
        class: 'tas-oge',
        href: 'taslar/' + tas.slug + '/',
        'aria-label': tas.ad + ' taşını keşfet'
      });

      const daire = PB_h('div', { class: 'tas-oge-daire' });
      daire.style.background = tas.renk || 'var(--c-warm-greige)';

      /* Öncelik: panelden yüklenen fotoğraf → depodaki hazır fotoğraf →
         taşın kendi rengi. Anasayfa kökte olduğu için yola ön ek gerekmiyor. */
      const url = gorseller[tas.slug] || tas.gorsel || null;
      if (url) {
        daire.append(PB_h('img', { src: url, alt: '', loading: 'lazy', decoding: 'async' }));
      }

      bag.append(daire, PB_h('span', { class: 'tas-oge-ad' }, tas.ad));
      kap.append(bag);
    });
  }

  /* ──────────── Editorial bant ────────────
   * Fotoğraf yoksa bölüm yine durur: zemini koyu orman yeşili kalır,
   * yazı okunur. Boş çerçeve görünmez. */
  function renderEditorial(gorselUrl) {
    const bant = document.getElementById('editorial-band');
    const img = document.getElementById('editorial-gorsel');
    if (!bant || !img || !gorselUrl) return;

    img.addEventListener('load', () => bant.classList.add('has-image'), { once: true });
    img.src = gorselUrl;
  }

  /* ──────────── Kombin (Shop the Look) ────────────
   * Altyapı hazır ama içerik bekliyor: fotoğraf yüklenmeden bölüm hiç
   * render edilmez. Bağlantı verilmediyse "Yakında" yazar — çalışmayan
   * bir bağlantı göstermiyoruz. */
  function renderLookbook(gorselUrl, baslik, link) {
    const bolum = document.getElementById('lookbook');
    const img = document.getElementById('lookbook-gorsel');
    if (!bolum || !img || !gorselUrl) return;

    img.src = gorselUrl;
    if (baslik) {
      const h = document.getElementById('lookbook-baslik');
      if (h) h.textContent = baslik;
    }

    const bag = document.getElementById('lookbook-link');
    const yakinda = document.getElementById('lookbook-yakinda');
    if (link && link.trim()) {
      if (bag) { bag.href = link.trim(); bag.hidden = false; }
      if (yakinda) yakinda.hidden = true;
    }

    bolum.hidden = false;
  }

  /* ──────────── Hikâyemiz fotoğrafı ────────────
   * Fotoğraf yoksa marka mührü görünmeye devam eder. */
  function renderHikayeGorseli(url) {
    const kap = document.getElementById('hikaye-media');
    const img = document.getElementById('hikaye-gorsel');
    const muhur = document.getElementById('hikaye-muhur');
    if (!kap || !img || !url) return;

    img.addEventListener('load', () => {
      img.hidden = false;
      if (muhur) muhur.hidden = true;
      kap.classList.add('has-image');
    }, { once: true });
    img.src = url;
  }

  /* ──────────── Özel kutu görseli ──────────── */
  function renderKutuGorseli(url) {
    const kap = document.getElementById('kutu-media');
    const img = document.getElementById('kutu-gorsel');
    if (!kap || !img || !url) return;
    img.src = url;
    kap.hidden = false;
  }

  /* ──────────── Bülten ────────────
   * Gerçek kayıt: e-posta Supabase'e yazılır ve admin → Bülten sekmesinde
   * görünür. Tablo henüz açılmadıysa (migration çalıştırılmadıysa) form
   * kullanıcıyı boşa düşürmesin diye bölüm gizleniyor — çalışıyormuş gibi
   * gösterip sessizce yutmuyoruz. */
  function renderBulten() {
    const form = document.getElementById('bulten-form');
    const girdi = document.getElementById('bulten-eposta');
    const durum = document.getElementById('bulten-durum');
    const buton = document.getElementById('bulten-gonder');
    if (!form || !girdi || !durum || typeof PB_Data === 'undefined') return;

    function bildir(mesaj, tip) {
      durum.textContent = mesaj;
      if (tip) durum.setAttribute('data-tip', tip);
      else durum.removeAttribute('data-tip');
      durum.hidden = false;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const eposta = girdi.value.trim();
      // Tarayıcının kendi e-posta doğrulaması; novalidate olduğu için elle
      if (!eposta || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) {
        bildir('Geçerli bir e-posta adresi yazar mısın?', 'hata');
        girdi.focus();
        return;
      }

      buton.disabled = true;
      const eskiYazi = buton.textContent;
      buton.textContent = 'Kaydediliyor…';

      const { error, zatenVar } = await PB_Data.subscribeNewsletter(eposta, 'anasayfa');

      buton.disabled = false;
      buton.textContent = eskiYazi;

      if (error) {
        console.warn('Bülten kaydı başarısız:', error);
        bildir('Şu anda kaydedemedik. Biraz sonra tekrar dener misin?', 'hata');
        return;
      }

      form.reset();
      bildir(zatenVar ? 'Zaten listedesin — teşekkürler.' : 'Aramıza hoş geldin. Yakında yazacağız.');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    heroYuksekligiAyarla();
    renderSiteTexts();     // metinler + bölüm görselleri
    renderYeniGelenler();
    renderFavoriler();
    renderBulten();
  });

  // Ekran döndürme / pencere boyutu değişiminde yeniden ölç
  window.addEventListener('resize', heroYuksekligiAyarla, { passive: true });
})();
