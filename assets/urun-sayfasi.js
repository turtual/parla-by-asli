/**
 * Parla By Aslı — Ürün sayfası (/urun/<slug>/)
 *
 * Sayfanın HTML'i tools/urun-uret.js ile önceden üretiliyor: başlık,
 * açıklama, fotoğraf ve SEO etiketleri dosyada hazır duruyor. Bu yüzden
 * Google ve WhatsApp/Instagram önizlemeleri JavaScript beklemeden doğru
 * içeriği görüyor.
 *
 * Burası ise sayfayı CANLI veriyle tazeliyor: fiyat ve stok panelden
 * değişince sayfayı yeniden üretmeye gerek kalmasın diye. Ayrıca sepet,
 * galeri, açılır bölümler ve "birlikte güzel" şeridi burada kuruluyor.
 *
 * Henüz üretilmemiş bir ürün (panele yeni eklenmiş, site yeniden
 * yayınlanmamış) vercel.json'daki yönlendirmeyle /urun/index.html
 * şablonuna düşer; orada statik içerik olmadığı için her şeyi bu dosya
 * çizer. İki durumda da aynı kod çalışır.
 *
 * Bağımlılık: data.js → products.js → ui.js (sepet, ışık kutusu, yorumlar)
 *             taslar-listesi.js + taslar-eslesme.js (taş bağlantıları)
 */

(function () {
  'use strict';

  const kok = document.documentElement.getAttribute('data-kok') || '';

  function h(etiket, nitelikler, metin) {
    const d = document.createElement(etiket);
    Object.entries(nitelikler || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') d.className = v;
      else if (k.startsWith('on') && typeof v === 'function') d.addEventListener(k.slice(2), v);
      else d.setAttribute(k, v);
    });
    if (metin !== undefined) d.textContent = metin;
    return d;
  }

  /**
   * Adres satırından ürün kodunu çıkarır.
   *   /urun/sole-kolye/  → sole-kolye
   * Üretilmiş sayfada HTML'de de yazıyor; oradan okumak daha güvenli.
   */
  function slugBul() {
    const kap = document.querySelector('[data-urun-slug]');
    if (kap && kap.dataset.urunSlug) return kap.dataset.urunSlug;

    const parcalar = location.pathname.split('/').filter(Boolean);
    const i = parcalar.indexOf('urun');
    return i !== -1 && parcalar[i + 1] ? decodeURIComponent(parcalar[i + 1]) : null;
  }

  /* ──────────── Galeri ────────────
     Ana görsel + küçük resimler. Ürünün kaç fotoğrafı varsa o kadar;
     eksik görsel uydurulmuyor. */
  function galeriKur(p) {
    const kap = document.getElementById('urun-galeri');
    if (!kap) return;

    const gorseller = [];
    if (p.image) gorseller.push(p.image);
    (p.images || []).forEach(g => { if (g && !gorseller.includes(g)) gorseller.push(g); });
    if (!gorseller.length) return;

    kap.innerHTML = '';
    let aktif = 0;

    const anaImg = h('img', { src: gorseller[0], alt: p.name, id: 'urun-ana-gorsel' });
    const anaBtn = h('button', {
      type: 'button',
      class: 'urun-galeri-ana',
      'aria-label': 'Fotoğrafı tam ekran aç',
      onclick: () => {
        if (typeof PB_openLightbox === 'function') PB_openLightbox(gorseller, aktif, p.name);
      }
    });
    anaBtn.append(anaImg, h('span', { class: 'urun-galeri-zoom', 'aria-hidden': 'true' }, '⤢'));
    kap.append(anaBtn);

    if (gorseller.length > 1) {
      const serit = h('div', { class: 'urun-galeri-serit' });
      gorseller.forEach((src, i) => {
        const btn = h('button', {
          type: 'button',
          class: 'urun-galeri-kucuk' + (i === 0 ? ' is-active' : ''),
          'aria-label': 'Fotoğraf ' + (i + 1),
          onclick: () => {
            aktif = i;
            anaImg.src = src;
            serit.querySelectorAll('.urun-galeri-kucuk').forEach((t, ti) =>
              t.classList.toggle('is-active', ti === i));
          }
        });
        btn.append(h('img', { src, alt: '', loading: 'lazy' }));
        serit.append(btn);
      });
      kap.append(serit);

      /* Ek görseller yapay zekâ model çekimleri (ana görsel gerçek ürün
         fotoğrafı). Ek görseli olmayan üründe bu notu göstermek yanıltıcı
         olurdu, o yüzden yalnız burada çıkıyor. */
      const not = document.getElementById('urun-ai-not');
      if (not) not.hidden = false;
    }
  }

  /* ──────────── Taş bağlantıları ────────────
     Ürün → taş yönü. Ters yön (taş → ürün) taş sayfalarında
     assets/tas-urunleri.js ile kuruluyor; ikisi de aynı eşleşme
     kuralını paylaşıyor (assets/taslar-eslesme.js). */
  function taslariKur(p) {
    if (typeof PB_TasEslesme === 'undefined') return [];
    const taslar = PB_TasEslesme.urununTaslari(p, 4);

    const satir = document.getElementById('urun-taslar');
    if (satir) {
      satir.innerHTML = '';
      if (!taslar.length) {
        satir.hidden = true;
      } else {
        satir.hidden = false;
        taslar.forEach((t, i) => {
          if (i) satir.append(document.createTextNode(' · '));
          satir.append(h('a', { href: kok + 'taslar/' + t.slug + '/' }, t.ad));
        });
      }
    }
    return taslar;
  }

  /* ──────────── Sepet ──────────── */
  function sepetKur(p) {
    const adetEl = document.getElementById('urun-adet');
    const azalt = document.getElementById('urun-adet-azalt');
    const artir = document.getElementById('urun-adet-artir');
    const ekle = document.getElementById('urun-sepete-ekle');
    const stokEl = document.getElementById('urun-stok');
    if (!ekle) return;

    const stok = p.stockQuantity || 0;
    let adet = 1;

    function yaz() {
      if (adetEl) adetEl.textContent = adet;
      if (artir) artir.disabled = adet >= stok;
      if (azalt) azalt.disabled = adet <= 1 || stok <= 0;
    }

    if (azalt) azalt.onclick = () => { adet = Math.max(1, adet - 1); yaz(); };
    if (artir) artir.onclick = () => { adet = Math.min(stok, adet + 1); yaz(); };
    yaz();

    if (stokEl) {
      if (stok > 0) {
        stokEl.textContent = stok <= 2 ? 'Son ' + stok + ' adet' : 'Stokta ' + stok + ' adet';
        stokEl.classList.toggle('is-low', stok <= 2);
      } else {
        stokEl.textContent = '';
      }
    }

    if (stok <= 0) {
      ekle.textContent = 'Tükendi';
      ekle.disabled = true;
      ekle.classList.add('is-out-of-stock');
      return;
    }

    ekle.onclick = () => {
      PB_Cart.add({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        quantity: adet,
        image: p.image,
        stockQuantity: stok
      });
      const eski = ekle.textContent;
      ekle.textContent = '✓ Sepete eklendi';
      ekle.disabled = true;
      setTimeout(() => { ekle.textContent = eski; ekle.disabled = false; }, 1600);
    };
  }

  /* ──────────── Açılır bölümler ────────────
     Ürün açıklamasını teknik katalog gibi tek blok hâlinde dökmek yerine
     başlıklara ayırıyoruz. Metni olmayan bölüm hiç açılmıyor — boş
     "Bakım" başlığı göstermek kullanıcıyı boşa tıklatıyordu. */
  async function bolumlerKur(p, taslar) {
    const kap = document.getElementById('urun-bolumler');
    if (!kap) return;

    let koleksiyon = null;
    if (typeof getCollections === 'function' && p.collectionId) {
      const hepsi = await getCollections();
      koleksiyon = hepsi.find(c => c.id === p.collectionId) || null;
    }

    const bolumler = [];

    if (p.description) {
      bolumler.push({ baslik: 'Hikâyesi', metin: p.description, acik: true });
    }

    if ((p.materials || []).length) {
      bolumler.push({ baslik: 'Ürün detayları', liste: p.materials });
    }

    if (taslar.length) {
      bolumler.push({ baslik: 'Taşlar', taslar });
    }

    if (koleksiyon && koleksiyon.careInstructions) {
      bolumler.push({ baslik: 'Bakım', metin: koleksiyon.careInstructions });
    }

    // Kargo satırı yalnız iki değer de doluysa yazılıyor; eksikse
    // "… ₺ ve üzeri" gibi yarım cümle görünmesin.
    let kargoMetni = '';
    if (typeof PB_Data !== 'undefined' && PB_Data.getSiteTexts) {
      try {
        const metinler = await PB_Data.getSiteTexts();
        const esik = Number(metinler.kargo_ucretsiz_esigi);
        const ucret = Number(metinler.kargo_ucreti);
        if (esik > 0 && ucret >= 0) {
          kargoMetni = formatPrice(esik) + ' ve üzeri siparişlerde kargo ücretsiz. '
            + 'Altındaki siparişlerde kargo ' + formatPrice(ucret) + '.\n\n'
            + 'Her parça siparişin için hazırlandığından kargoya veriliş süresi '
            + 'ürüne göre değişir; sipariş sonrası seninle iletişime geçiyoruz.';
        }
      } catch (e) { /* metinler gelmezse bölüm hiç çıkmaz */ }
    }
    if (kargoMetni) bolumler.push({ baslik: 'Kargo & teslimat', metin: kargoMetni });

    if (koleksiyon && koleksiyon.returnTerms) {
      bolumler.push({ baslik: 'İptal ve iade', metin: koleksiyon.returnTerms });
    }

    kap.innerHTML = '';
    bolumler.forEach(b => {
      const d = h('details', { class: 'urun-bolum' });
      if (b.acik) d.setAttribute('open', '');
      d.append(h('summary', {}, b.baslik));

      const govde = h('div', { class: 'urun-bolum-govde' });

      if (b.metin) {
        govde.append(h('p', {}, b.metin));
      } else if (b.liste) {
        const ul = h('ul');
        b.liste.forEach(m => ul.append(h('li', {}, m)));
        govde.append(ul);
      } else if (b.taslar) {
        b.taslar.forEach(t => {
          const bag = h('a', { class: 'urun-tas-oge', href: kok + 'taslar/' + t.slug + '/' });
          const daire = h('span', { class: 'urun-tas-daire' });
          daire.style.background = t.renk || 'var(--c-warm-greige)';
          const yazi = h('span');
          yazi.append(h('span', { class: 'urun-tas-ad' }, t.ad),
                      h('span', { class: 'urun-tas-ozet' }, t.ozet || ''));
          bag.append(daire, yazi);
          govde.append(bag);
        });
      }

      d.append(govde);
      kap.append(d);
    });
  }

  /* ──────────── Birlikte güzel ────────────
     Rastgele ürün göstermiyoruz. Sıralama: önce aynı taşı paylaşanlar,
     sonra aynı koleksiyondan, sonra aynı ürün tipinden. Aynı girdiyle
     her zaman aynı sonucu verir. */
  async function benzerleriKur(p, taslar) {
    const bolum = document.getElementById('urun-benzer');
    const grid = document.getElementById('urun-benzer-grid');
    if (!bolum || !grid || typeof getProducts !== 'function') return;

    const hepsi = (await getProducts({})).filter(u => u.id !== p.id && (u.stockQuantity || 0) > 0);
    if (!hepsi.length) return;

    const tasSluglari = new Set(taslar.map(t => t.slug));

    function puan(u) {
      let skor = 0;
      if (typeof PB_TasEslesme !== 'undefined') {
        const uTaslar = PB_TasEslesme.urununTaslari(u, 4).map(t => t.slug);
        if (uTaslar.some(s => tasSluglari.has(s))) skor += 4;
      }
      if (u.collectionId && u.collectionId === p.collectionId) skor += 2;
      if (u.category === p.category) skor += 1;
      return skor;
    }

    const secilenler = hepsi
      .map(u => ({ u, skor: puan(u) }))
      .filter(x => x.skor > 0)
      .sort((a, b) => b.skor - a.skor || stoktaOnce(a.u, b.u) || (a.u.displayOrder || 0) - (b.u.displayOrder || 0))
      .slice(0, 4)
      .map(x => x.u);

    if (!secilenler.length) return;

    grid.innerHTML = '';
    secilenler.forEach((u, i) => grid.append(renderProductCard(u, i)));
    bolum.hidden = false;
  }

  /* ──────────── Sayfayı kur ──────────── */
  async function kur() {
    const slug = slugBul();
    if (!slug) { location.replace(kok + 'urunler/'); return; }

    if (typeof getProductBySlug !== 'function') return;

    let p = null;
    try {
      p = await getProductBySlug(slug);
    } catch (e) {
      console.warn('Ürün çekilemedi:', e);
    }

    if (!p) {
      // Ürün kaldırılmış ya da pasife alınmış olabilir. Üretilmiş sayfada
      // eski içerik durduğu için kullanıcıyı yanıltmadan durumu söylüyoruz.
      const uyari = document.getElementById('urun-yok');
      if (uyari) uyari.hidden = false;
      const duzen = document.querySelector('.urun-duzen');
      if (duzen) duzen.hidden = true;
      return;
    }

    document.title = p.name + ' · Parla By Aslı';

    const yaz = (id, deger) => {
      const el = document.getElementById(id);
      if (el && deger) el.textContent = deger;
    };
    yaz('urun-ad', p.name);
    yaz('urun-fiyat', formatPrice(p.price));

    // Koleksiyon adı — başlığın üstündeki küçük yazı
    if (typeof getCollections === 'function' && p.collectionId) {
      getCollections().then(hepsi => {
        const k = hepsi.find(c => c.id === p.collectionId);
        if (k) yaz('urun-koleksiyon', k.name);
      });
    }

    galeriKur(p);
    const taslar = taslariKur(p);
    sepetKur(p);
    bolumlerKur(p, taslar);
    benzerleriKur(p, taslar);

    if (typeof PB_renderReviews === 'function') {
      const yorumlar = document.getElementById('urun-yorumlar');
      if (yorumlar) PB_renderReviews(yorumlar, p);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.urun-sayfa')) kur();
  });
})();
