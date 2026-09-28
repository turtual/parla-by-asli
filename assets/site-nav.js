/**
 * Parla By Aslı — Header davranışları
 *
 *   · Mobil tam ekran menü
 *   · Kaydırınca incelen header
 *   · Site içi arama (ürün + taş)
 *
 * İşaretleme tools/site-kabuk.js ile HTML'e basılıyor; burası yalnız
 * davranış. Menü ve arama katmanı HTML'de durmak zorunda değil (SEO'ya
 * katkısı yok, her sayfada tekrar etmesi de gereksiz) — o yüzden ihtiyaç
 * anında JavaScript ile kuruluyor.
 *
 * Arama ek bir servis ya da kütüphane kullanmıyor: ürünler zaten
 * PB_Data üzerinden, taşlar da assets/taslar-listesi.js ile sayfada.
 */

(function () {
  'use strict';

  const kok = document.documentElement.getAttribute('data-kok') || '';

  /* Türkçe duyarlı normalleştirme — taş eşleşmesindekiyle aynı kural.
     PB_TasEslesme yüklüyse onu kullan, değilse aynısını burada uygula
     (header her sayfada var, taş dizini her sayfada değil). */
  function normalize(s) {
    if (window.PB_TasEslesme) return window.PB_TasEslesme.normalize(s);
    return String(s || '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function el(etiket, nitelikler, icerik) {
    const d = document.createElement(etiket);
    Object.entries(nitelikler || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') d.className = v;
      else if (k.startsWith('on') && typeof v === 'function') d.addEventListener(k.slice(2), v);
      else d.setAttribute(k, v);
    });
    if (icerik !== undefined) d.textContent = icerik;
    return d;
  }

  /* ──────────── Kaydırınca incelen header ────────────
     Eşik 40px: sayfanın en tepesinde ferah, ilk kaydırışta kompakt.
     Geçiş CSS'te 200ms — yeterince hızlı ki gözü yormasın. */
  function kompaktHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;

    let sonDurum = null;
    function bak() {
      const kompakt = window.scrollY > 40;
      if (kompakt !== sonDurum) {
        header.classList.toggle('is-compact', kompakt);
        sonDurum = kompakt;
      }
    }
    bak();
    window.addEventListener('scroll', bak, { passive: true });
  }

  /* ──────────── Mobil menü ──────────── */
  function mobilMenu() {
    const acButon = document.querySelector('[data-menu-ac]');
    if (!acButon) return;

    let kat = null;

    function kur() {
      kat = el('div', { class: 'mobil-menu', id: 'mobil-menu', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menü' });

      const ust = el('div', { class: 'mobil-menu-ust' });
      const logo = el('img', { src: kok + 'assets/img/logo-yatay-bakir.svg', alt: 'Parla By Aslı', class: 'brand-logo' });
      const kapat = el('button', { type: 'button', class: 'mobil-menu-kapat', 'aria-label': 'Menüyü kapat', onclick: gizle }, '✕');
      ust.append(logo, kapat);

      const ana = el('nav', { class: 'mobil-menu-ana', 'aria-label': 'Ana menü' });
      // Masaüstü menüsüyle aynı bağlantılar — tek kaynaktan kopyalanıyor
      document.querySelectorAll('.header-nav a').forEach(a => {
        ana.append(el('a', { href: a.getAttribute('href') }, a.textContent.trim()));
      });

      const araSatir = el('div', { class: 'mobil-menu-ara' });
      const araBtn = el('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { gizle(); aramaAc(); } }, 'Ara');
      araBtn.style.width = '100%';
      araSatir.append(araBtn);

      const alt = el('nav', { class: 'mobil-menu-alt', 'aria-label': 'Diğer sayfalar' });
      [
        ['Tüm ürünler', 'urunler/'],
        ['Bakım rehberi', 'bakim-rehberi/'],
        ['SSS', 'sss/'],
        ['İletişim', 'iletisim/'],
        ['Hesabım', 'hesap/']
      ].forEach(([etiket, yol]) => alt.append(el('a', { href: kok + yol }, etiket)));

      kat.append(ust, ana, araSatir, alt);
      document.body.appendChild(kat);
    }

    function goster() {
      if (!kat) kur();
      // Yerleşimi zorlayıp sınıfı hemen ekliyoruz: requestAnimationFrame
      // sekme arka plandayken çalışmıyor ve menü yarı açık kalıyordu.
      void kat.offsetWidth;
      kat.classList.add('is-acik');
      acButon.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      const ilk = kat.querySelector('.mobil-menu-ana a');
      if (ilk) ilk.focus();
    }

    function gizle() {
      if (!kat) return;
      kat.classList.remove('is-acik');
      acButon.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      acButon.focus();
    }

    acButon.addEventListener('click', () => {
      const acik = acButon.getAttribute('aria-expanded') === 'true';
      if (acik) gizle(); else goster();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && acButon.getAttribute('aria-expanded') === 'true') gizle();
    });
  }

  /* ──────────── Arama ────────────
     Ürün adı + malzeme + taş adında arar. Tek harfte sonuç basmıyor
     (2 karakter alt sınır): tek harf neredeyse her şeyi getiriyordu. */
  let araKat = null;
  let urunlerOnbellek = null;

  async function urunleriGetir() {
    if (urunlerOnbellek) return urunlerOnbellek;
    if (typeof PB_Data === 'undefined') return [];
    try {
      urunlerOnbellek = await PB_Data.getProducts();
    } catch (e) {
      urunlerOnbellek = [];
    }
    return urunlerOnbellek;
  }

  function fiyatYaz(fiyat) {
    return typeof formatPrice === 'function'
      ? formatPrice(fiyat)
      : new Intl.NumberFormat('tr-TR').format(fiyat) + ' ₺';
  }

  function aramaAc() {
    if (araKat) { araKat.hidden = false; araKat.querySelector('input').focus(); return; }

    araKat = el('div', { class: 'ara-kat', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Site içi arama' });

    const kutu = el('div', { class: 'ara-kutu' });
    const satir = el('div', { class: 'ara-girdi-satir' });
    satir.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="9" cy="9" r="5.2"/><path d="M12.8 12.8 17 17"/></svg>';

    const girdi = el('input', { type: 'search', placeholder: 'Ürün ya da taş ara…', 'aria-label': 'Ürün ya da taş ara', autocomplete: 'off' });
    const kapat = el('button', { type: 'button', class: 'ara-kapat', onclick: aramaKapat }, 'Kapat');
    satir.append(girdi, kapat);

    const sonuc = el('div', { class: 'ara-sonuc' });
    sonuc.append(el('p', { class: 'ara-bos' }, 'Bir şeyler yaz — ürün adı ya da taş adı.'));

    kutu.append(satir, sonuc);
    araKat.append(kutu);

    araKat.addEventListener('click', (e) => { if (e.target === araKat) aramaKapat(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && araKat && !araKat.hidden) aramaKapat();
    });

    let zamanlayici = null;
    girdi.addEventListener('input', () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(() => ara(girdi.value, sonuc), 140);
    });

    document.body.appendChild(araKat);
    document.body.style.overflow = 'hidden';
    girdi.focus();
  }

  function aramaKapat() {
    if (!araKat) return;
    araKat.hidden = true;
    document.body.style.overflow = '';
  }

  async function ara(sorgu, sonuc) {
    const q = normalize(sorgu);
    sonuc.innerHTML = '';

    if (q.length < 2) {
      sonuc.append(el('p', { class: 'ara-bos' }, 'Bir şeyler yaz — ürün adı ya da taş adı.'));
      return;
    }

    const urunler = (await urunleriGetir()).filter(p => {
      const metin = normalize([p.name, (p.materials || []).join(' ')].join(' '));
      return metin.indexOf(q) !== -1;
    }).slice(0, 6);

    const taslar = (window.PB_TASLAR || []).filter(t =>
      normalize(t.ad).indexOf(q) !== -1 || t.slug.indexOf(q) !== -1
    ).slice(0, 5);

    if (!urunler.length && !taslar.length) {
      sonuc.append(el('p', { class: 'ara-bos' }, '"' + sorgu.trim() + '" için sonuç yok.'));
      return;
    }

    if (urunler.length) {
      sonuc.append(el('div', { class: 'ara-baslik' }, 'Ürünler'));
      urunler.forEach(p => {
        // Ürünün kendi sayfası henüz yok (bkz. Aşama 3). Sayfada ürün
        // penceresi varsa onu açıyoruz; yoksa listeye götürüyoruz —
        // çalışmayan bir adrese bağlamıyoruz.
        const bag = el('a', {
          class: 'ara-oge',
          href: kok + 'urunler/',
          onclick: (e) => {
            if (typeof PB_openProductModal !== 'function') return;
            e.preventDefault();
            aramaKapat();
            PB_openProductModal(p.slug);
          }
        });
        const gorsel = el('img', { class: 'ara-oge-gorsel', src: p.image || '', alt: '', loading: 'lazy' });
        const yazi = el('div');
        yazi.append(el('div', { class: 'ara-oge-ad' }, p.name),
                    el('div', { class: 'ara-oge-alt' }, fiyatYaz(p.price)));
        bag.append(gorsel, yazi);
        sonuc.append(bag);
      });
    }

    if (taslar.length) {
      sonuc.append(el('div', { class: 'ara-baslik' }, 'Taşlar'));
      taslar.forEach(t => {
        const bag = el('a', { class: 'ara-oge', href: kok + 'taslar/' + t.slug + '/' });
        const daire = el('span', { class: 'ara-oge-gorsel ara-oge-daire' });
        daire.style.background = t.renk || 'var(--c-warm-greige)';
        const yazi = el('div');
        yazi.append(el('div', { class: 'ara-oge-ad' }, t.ad),
                    el('div', { class: 'ara-oge-alt' }, t.ozet || ''));
        bag.append(daire, yazi);
        sonuc.append(bag);
      });
    }
  }

  /* ──────────── Üst şerit ────────────
     Yazı panelden yönetiliyor (Metinler → "Üst şerit yazısı"). Eskiden
     yalnız anasayfa besliyordu; diğer sayfalarda HTML'deki yedek metin
     kalıyor ve şerit sayfadan sayfaya değişiyordu. Header her sayfada
     olduğu için bağlama işi buraya taşındı. */
  async function seritYaz() {
    const el = document.getElementById('utility-bar-text');
    if (!el || typeof PB_Data === 'undefined' || !PB_Data.getSiteTexts) return;
    try {
      const metinler = await PB_Data.getSiteTexts();
      const deger = metinler.utility_bar;
      if (!deger) return;
      if (typeof pbFormatInline === 'function') el.innerHTML = pbFormatInline(deger);
      else el.textContent = deger;
    } catch (e) { /* ulaşılamazsa HTML'deki yedek metin kalır */ }
  }

  document.addEventListener('DOMContentLoaded', () => {
    kompaktHeader();
    mobilMenu();
    seritYaz();
    const araBtn = document.querySelector('[data-ara-ac]');
    if (araBtn) araBtn.addEventListener('click', aramaAc);
  });
})();
