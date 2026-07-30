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
  }

  /* ──────────── Sipariş özeti ──────────── */

  function renderSummary() {
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
          <img src="${PB_escape('../' + item.image)}" alt="${PB_escape(item.name)}">
        </div>
        <div class="checkout-summary-item-info">
          <div class="checkout-summary-item-name">${PB_escape(item.name)}</div>
          ${meta ? `<div class="checkout-summary-item-meta">${meta}</div>` : ''}
        </div>
        <div class="checkout-summary-item-price">${formatPrice(item.price * (item.quantity || 1))}</div>
      `;
      listEl.appendChild(row);
    });

    // Toplam
    const subtotal = PB_Cart.total();
    const shipping = subtotal >= 500 ? 0 : 35;
    const total = subtotal + shipping;

    subtotalEl.textContent = formatPrice(subtotal);
    shippingEl.textContent = shipping === 0 ? 'Ücretsiz' : formatPrice(shipping);
    totalEl.textContent = formatPrice(total);
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

      const subtotal = PB_Cart.total();
      const shipping = subtotal >= 500 ? 0 : 35;
      const total = subtotal + shipping;

      // Sipariş özetini insan-okunabilir formatta hazırla
      const orderSummary = buildOrderSummary(items, subtotal, shipping, total);

      // Supabase'e de yaz (admin panelde "Siparişler" sekmesinde görünsün ve
      // stok takibi buradan beslensin). Formspree zaten müşteri/işletme sahibine
      // mail attığı için bu başarısız olsa da checkout akışını durdurmuyoruz,
      // sadece loglanıyor.
      if (window.PB_Data && typeof window.PB_Data.createOrder === 'function') {
        window.PB_Data.createOrder({
          orderCode: orderId,
          name: `${customer.ad || ''} ${customer.soyad || ''}`.trim(),
          email: customer.email,
          phone: customer.telefon,
          address: customer.adres,
          city: customer.sehir,
          note: customer.not,
          items,
          subtotal,
          shippingFee: shipping,
          total
        }).then(({ error }) => {
          if (error) console.error('Sipariş Supabase\'e kaydedilemedi:', error);
        });
      }

      const payload = {
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

  function buildOrderSummary(items, subtotal, shipping, total) {
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
    lines.push(`Ara toplam: ${formatPrice(subtotal)}`);
    lines.push(`Kargo: ${shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}`);
    lines.push(`TOPLAM: ${formatPrice(total)}`);
    lines.push('═══════════════════════════════');

    return lines.join('\n');
  }
})();
