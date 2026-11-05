/**
 * Parla By Aslı — Checkout sayfası
 *
 * - Sepetten ürünleri okur, özet panelinde gösterir
 * - Form validation
 * - Formspree'ye submit
 * - Başarılı submit'te onay sayfasına yönlendirir
 *
 * NOT: Formspree endpoint'ini gerçek değerle değiştirmen gerek!
 *      Formspree.com → hesap aç → form oluştur → endpoint kopyala → window.PB_FORMSPREE_URL'e yapıştır
 *
 * Formspree olmadan da çalışır — bu durumda form bilgileri konsola yazılır,
 * onay sayfasına geçilir, ama mail gitmez. Test için yeterlidir.
 */

(function () {
  'use strict';

  // Formspree endpoint — gerçek hesap açıldığında buraya yazılacak
  // Örn: 'https://formspree.io/f/xyzabc123'
  // Ya da window.PB_FORMSPREE_URL global olarak set edilebilir
  const FORMSPREE_URL = window.PB_FORMSPREE_URL || '';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    renderSummary();
    bindForm();
    bindOrderId();
    bindOdemeYontemi();
  }

  /* ──────────── Ödeme yöntemi (Havale / Kredi kartı) ──────────── */

  /**
   * Havale/EFT varsayılan; kart seçilince form gizlenip Shopier
   * yönlendirmesi çıkıyor.
   *
   * Formu GİZLEMEK (kaldırmak değil) bilinçli: müşteri karta bakıp
   * havaleye dönerse yazdıkları olduğu gibi duruyor. Gizli formdaki
   * required alanlar tarayıcıyı rahatsız etmiyor, çünkü gönderim
   * yalnız formun kendi butonundan yapılıyor ve o da gizli.
   */
  function bindOdemeYontemi() {
    const dugmeler = Array.prototype.slice.call(
      document.querySelectorAll('.odeme-yontem-sec'));
    const form = document.getElementById('checkout-form');
    const kartPaneli = document.getElementById('kart-paneli');
    if (!dugmeler.length || !form || !kartPaneli) return;

    function sec(yontem, odakla) {
      const kartMi = yontem === 'kart';
      form.hidden = kartMi;
      kartPaneli.hidden = !kartMi;

      dugmeler.forEach(d => {
        const aktif = d.dataset.yontem === yontem;
        d.classList.toggle('is-aktif', aktif);
        d.setAttribute('aria-checked', aktif ? 'true' : 'false');
        /* Gezinen sekme sırası: radyo grubunda Tab tek seferde gruba
           girer, seçim ok tuşlarıyla değişir. */
        d.tabIndex = aktif ? 0 : -1;
        if (aktif && odakla) d.focus();
      });

      if (kartMi) kartSepetOzeti();
    }

    dugmeler.forEach((d, i) => {
      d.addEventListener('click', () => sec(d.dataset.yontem));
      d.addEventListener('keydown', e => {
        let hedef = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') hedef = dugmeler[(i + 1) % dugmeler.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') hedef = dugmeler[(i - 1 + dugmeler.length) % dugmeler.length];
        if (!hedef) return;
        e.preventDefault();
        sec(hedef.dataset.yontem, true);
      });
    });

    sec('havale');
  }

  /**
   * Shopier panelindeki sepet listesi.
   *
   * Sepet Shopier'e taşınamıyor; müşteri parçaları orada yeniden
   * seçecek. Ne alacağını hatırlaması için liste burada duruyor —
   * yoksa yeni sekmede ürün adlarını hatırlamaya çalışıyor.
   */
  function kartSepetOzeti() {
    const kutu = document.getElementById('kart-sepet-ozeti');
    if (!kutu) return;

    const items = PB_Cart.read();
    if (!items.length) { kutu.replaceChildren(); return; }

    const ul = document.createElement('ul');
    items.forEach(u => {
      const adet = u.quantity || 1;
      const li = document.createElement('li');

      const ad = document.createElement('span');
      ad.textContent = u.name + (adet > 1 ? ' × ' + adet : '');

      const fiyat = document.createElement('span');
      fiyat.textContent = formatPrice(Number(u.price) * adet);

      li.append(ad, fiyat);
      ul.appendChild(li);
    });

    const baslik = document.createElement('p');
    baslik.className = 'kart-sepet-baslik';
    baslik.textContent = 'Sepetindekiler:';

    kutu.replaceChildren(baslik, ul);
  }

  /* ──────────── Kargo ve sepet indirimi ──────────── */

  /**
   * Kargo eşiği/ücreti ve sepet indirimi kampanyası admin panelinden
   * yönetiliyor (site_texts). Hesabın TEK yeri assets/products.js:
   * sepetKurallari() panelden okur, sepetToplamlari() de ara toplam,
   * indirim, kargo ve toplamı birlikte üretir.
   *
   * ÖNEMLİ: bu sayıları buraya tekrar gömmeyin ve toplamı burada elle
   * hesaplamayın. Yasal metinler (mesafeli satış, ön bilgilendirme,
   * kargo-teslimat) aynı kaynaktan besleniyor; ayrışırlarsa metinde
   * yazan tutarla tahsil edilen tutar farklı olur. Sepet çekmecesinde
   * gösterilen indirim ile kasada düşülen indirimin ayrışması ise
   * doğrudan müşteriye yanlış para yazmak demek.
   */
  async function sepetHesabi() {
    const araToplam = PB_Cart.total();
    const kurallar = typeof sepetKurallari === 'function'
      ? await sepetKurallari()
      : null;
    return sepetToplamlari(araToplam, kurallar);
  }

  /* ──────────── Sipariş özeti ──────────── */

  /*
   * Ödeme özetindeki satır fiyatı. Sepetle aynı mantık: indirim varsa
   * üstü çizili eski toplam görünüyor. Ara toplam ve genel toplam HER
   * ZAMAN indirimli fiyattan hesaplanıyor — buradaki yalnız gösterim.
   */
  function ozetFiyatHtml(item) {
    const adet = item.quantity || 1;
    const bilgi = typeof indirimBilgisi === 'function' ? indirimBilgisi(item) : null;
    const yeni = '<span class="' + (bilgi ? 'fiyat-yeni' : 'fiyat-tek') + '">'
      + PB_escape(formatPrice(Number(item.price) * adet)) + '</span>';
    if (!bilgi) return yeni;
    return '<span class="fiyat-eski">' + PB_escape(formatPrice(bilgi.eski * adet)) + '</span>' + yeni;
  }

  async function renderSummary() {
    const items = PB_Cart.read();
    const listEl = document.getElementById('checkout-summary-list');
    const subtotalEl = document.getElementById('summary-subtotal');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');

    if (items.length === 0) {
      // Sepet boşsa anasayfaya yönlendir
      window.location.href = '../index.html';
      return;
    }

    // Ürün listesi
    listEl.innerHTML = '';
    items.forEach(item => {
      const meta = (item.quantity || 1) > 1 ? `${item.quantity} adet` : '';

      const row = PB_h('div', { class: 'checkout-summary-item' });
      row.innerHTML = `
        <div class="checkout-summary-item-img">
          <!-- Eskiden yol başına düz "../" ekleniyordu; Supabase'deki tam
               URL'ler "../https://…" hâline gelip 404 veriyordu, yani ödeme
               özetindeki her ürün fotoğrafı kırıktı. PB_imgPath tam URL ile
               göreli yolu ayırt ediyor. -->
          <img src="${PB_escape(PB_imgPath(item.image))}" alt="${PB_escape(item.name)}">
        </div>
        <div class="checkout-summary-item-info">
          <div class="checkout-summary-item-name">${PB_escape(item.name)}</div>
          ${meta ? `<div class="checkout-summary-item-meta">${meta}</div>` : ''}
        </div>
        <div class="checkout-summary-item-price">${ozetFiyatHtml(item)}</div>
      `;
      listEl.appendChild(row);
    });

    // Toplam
    const h = await sepetHesabi();

    subtotalEl.textContent = formatPrice(h.araToplam);
    shippingEl.textContent = h.kargo === 0 ? 'Ücretsiz' : formatPrice(h.kargo);
    totalEl.textContent = formatPrice(h.toplam);

    /* Sepet indirimi satırı. Kampanya kapalı ya da eşiğin altındaysa
       satır hiç görünmüyor — "Sepet indirimi: 0 ₺" yazmak müşteriye
       kaçırdığı bir şey varmış izlenimi veriyordu. */
    const discountRow = document.getElementById('summary-discount-row');
    const discountEl = document.getElementById('summary-discount');
    const discountLabel = document.getElementById('summary-discount-label');
    if (discountRow && discountEl) {
      if (h.indirim) {
        if (discountLabel) {
          discountLabel.textContent = 'Sepet indirimi (%' + h.indirim.yuzde + ')';
        }
        discountEl.textContent = '−' + formatPrice(h.indirim.tutar);
        discountRow.hidden = false;
      } else {
        discountRow.hidden = true;
      }
    }
  }

  /* ──────────── Sipariş ID ──────────── */

  function bindOrderId() {
    const idEl = document.getElementById('order-id-display');
    if (idEl) {
      idEl.textContent = generateOrderId();
    }
  }

  function generateOrderId() {
    // Stored ID, sayfa yenilense de aynı kalsın
    let id = sessionStorage.getItem('pb_order_id');
    if (!id) {
      const now = new Date();
      const ymd = now.getFullYear().toString().slice(2) +
                  String(now.getMonth() + 1).padStart(2, '0') +
                  String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9000 + 1000);
      id = `PB-${ymd}-${random}`;
      sessionStorage.setItem('pb_order_id', id);
    }
    return id;
  }

  /* ──────────── Form ──────────── */

  function bindForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const submitBtn = form.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'GÖNDERİLİYOR...';

      const formData = new FormData(form);
      const customer = Object.fromEntries(formData.entries());
      const items = PB_Cart.read();
      const orderId = generateOrderId();

      /* Toplamlar: özet panelinde gösterilenle AYNI fonksiyondan.
         Burada yeniden hesaplamak, müşterinin gördüğü tutarla sipariş
         kaydındaki tutarın ayrışmasına açık kapı bırakırdı. */
      const h = await sepetHesabi();
      const subtotal = h.araToplam;
      const shipping = h.kargo;
      const discount = h.indirimTutar;
      const total = h.toplam;

      // Sipariş özetini insan-okunabilir formatta hazırla
      const orderSummary = buildOrderSummary(items, h);

      // Supabase'e de yaz (admin panelde "Siparişler" sekmesinde görünsün ve
      // stok takibi buradan beslensin). Formspree zaten müşteri/işletme sahibine
      // mail attığı için bu başarısız olsa da checkout akışını durdurmuyoruz,
      // sadece loglanıyor.
      // Giriş yapmış müşterinin siparişi hesabına bağlansın ki "Siparişlerim"de
      // görünsün. Giriş yoksa null kalır; o sipariş sonradan üye olunursa
      // e-posta eşleşmesiyle yine görünür (bkz. orders RLS politikası).
      let uyeId = null;
      if (window.PB_Account) {
        const u = await window.PB_Account.kullanici();
        uyeId = u ? u.id : null;
      }

      if (window.PB_Data && typeof window.PB_Data.createOrder === 'function') {
        window.PB_Data.createOrder({
          orderCode: orderId,
          userId: uyeId,
          name: `${customer.ad || ''} ${customer.soyad || ''}`.trim(),
          email: customer.email,
          phone: customer.telefon,
          address: customer.adres,
          city: customer.sehir,
          note: customer.not,
          items,
          subtotal,
          shippingFee: shipping,
          cartDiscount: discount,
          total
        }).then(({ error }) => {
          if (error) console.error('Sipariş Supabase\'e kaydedilemedi:', error);
        });
      }

      const payload = {
        /* Formspree'nin tanıdığı özel alan: gelen bildirimin konusu.
           Eskiden hepsi aynı konuyla düşüyordu, kutuda ayırt etmek zordu. */
        _subject: `Yeni sipariş — ${orderId} — ${formatPrice(total)}`,

        /* "email" alanının adı AYNEN böyle kalmalı: Formspree otomatik
           yanıtı (ücretli planlarda) alıcıyı bu alandan buluyor. Adı
           değişirse müşteriye hiçbir şey gitmez. */
        order_id: orderId,
        // Müşteri
        ad: customer.ad,
        soyad: customer.soyad,
        telefon: customer.telefon,
        email: customer.email,
        adres: customer.adres,
        sehir: customer.sehir,
        not: customer.not || '',
        // Sipariş
        ara_toplam: formatPrice(subtotal),
        /* İndirim satırı yalnız varsa gönderiliyor: her siparişte
           "Sepet indirimi: 0 ₺" satırı bildirimi gürültüye çeviriyor. */
        ...(h.indirim ? {
          sepet_indirimi: '%' + h.indirim.yuzde + ' — ' + formatPrice(h.indirim.tutar)
        } : {}),
        kargo: shipping === 0 ? 'Ücretsiz' : formatPrice(shipping),
        toplam: formatPrice(total),
        urun_sayisi: items.length,
        // İnsan-okunur özet (mailde net görünmesi için)
        siparis_ozeti: orderSummary
      };

      // Formspree'ye gönder (varsa)
      if (FORMSPREE_URL) {
        try {
          const response = await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error('Formspree HTTP ' + response.status);
          }
        } catch (err) {
          console.error('Sipariş gönderme hatası:', err);
          alert('Sipariş gönderilirken bir sorun oluştu. Lütfen tekrar dene veya bize WhatsApp\'tan ulaş.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'SİPARİŞİ TAMAMLA';
          return;
        }
      } else {
        console.warn('FORMSPREE_URL boş — sipariş sadece konsola yazılıyor.');
        console.log('SİPARİŞ:', payload);
        console.log('Önizleme görselleri:', previewImages);
      }

      /* Müşteriye onay e-postası (api/siparis-maili.js → Resend).
         Formspree'nin otomatik yanıtı ücretli planda olduğu için
         müşterinin elinde sipariş kaydı kalmıyordu.

         BİLEREK beklemiyoruz ve hatayı yutuyoruz: e-posta gitmese de
         sipariş alındı, Formspree'ye düştü ve müşteri ödeme bilgisini
         teşekkür sayfasında görecek. Mail yüzünden akışı durdurmak
         ya da müşteriye hata göstermek zarar verirdi. */
      fetch('/api/siparis-maili', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          email: customer.email,
          ad: customer.ad,
          items: items.map(u => ({ name: u.name, quantity: u.quantity, price: u.price })),
          subtotal,
          discount,
          discountPercent: h.indirim ? h.indirim.yuzde : 0,
          shipping,
          total
        })
      }).catch(err => console.warn('Onay e-postası gönderilemedi:', err));

      // Başarılı: sepeti temizle, onay sayfasına git
      // (Sipariş ID'sini sakla ki onay sayfasında gösterilebilsin)
      sessionStorage.setItem('pb_last_order', JSON.stringify({
        id: orderId,
        email: customer.email,
        total: formatPrice(total),
        items: items.length
      }));
      PB_Cart.clear();
      window.location.href = '../tesekkurler/index.html';
    });
  }

  function buildOrderSummary(items, h) {
    // Mailde okunaklı çıkması için düz metin sipariş özeti
    let lines = [];
    lines.push('═══════════════════════════════');
    lines.push('SİPARİŞ DETAYI');
    lines.push('═══════════════════════════════');
    lines.push('');

    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   Adet: ${item.quantity || 1}`);
      lines.push(`   Fiyat: ${formatPrice(item.price)} (birim) — ${formatPrice(item.price * (item.quantity || 1))} (toplam)`);
      lines.push('');
    });

    lines.push('───────────────────────────────');
    lines.push(`Ara toplam: ${formatPrice(h.araToplam)}`);
    if (h.indirim) {
      lines.push(`Sepet indirimi (%${h.indirim.yuzde}): -${formatPrice(h.indirim.tutar)}`);
    }
    lines.push(`Kargo: ${h.kargo === 0 ? 'Ücretsiz' : formatPrice(h.kargo)}`);
    lines.push(`TOPLAM: ${formatPrice(h.toplam)}`);
    lines.push('═══════════════════════════════');

    /* Ödeme bilgisi. Değerler legal-info.js'ten okunuyor — IBAN'ı iki
       ayrı yerde tutmak, birini güncelleyip diğerini unutunca parayı
       yanlış hesaba yollamak demek. legal-info yüklü değilse ödeme
       bloğu hiç yazılmıyor; yanlış/yarım IBAN göstermektense hiç
       göstermemek doğru. */
    const banka = window.PB_SaticiBilgi;
    const iban = banka && banka.deger('iban');
    if (iban) {
      lines.push('');
      lines.push('ÖDEME BİLGİLERİ (Havale / EFT)');
      lines.push('───────────────────────────────');
      lines.push(`Hesap adı : ${banka.deger('hesapAdi') || ''}`);
      lines.push(`IBAN      : ${iban}`);
      lines.push(`Banka     : ${banka.deger('bankaAdi') || ''}`);
      lines.push('');
      lines.push(`Açıklama kısmına sipariş numaranı yazmayı unutma.`);
      lines.push('Ödemen ulaşınca siparişin hazırlanmaya başlanır.');
      lines.push('═══════════════════════════════');
    }

    return lines.join('\n');
  }
})();
