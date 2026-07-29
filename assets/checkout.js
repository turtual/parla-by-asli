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
      let imgSrc;
      if (item.customization?.previewImage) {
        imgSrc = item.customization.previewImage;
      } else {
        imgSrc = '../' + item.image;
      }

      // Kişiselleştirme metni kullanıcıdan geliyor — innerHTML'e girmeden kaçışlanır
      let metaParts = [];
      if (item.customization) {
        if (item.customization.text) metaParts.push(`"${PB_escape(item.customization.text)}"`);
        if (item.customization.fontId) metaParts.push(`Font: ${PB_escape(item.customization.fontId)}`);
        if (item.customization.materialId) metaParts.push(`Renk: ${PB_escape(item.customization.materialId)}`);
      }
      if ((item.quantity || 1) > 1) {
        metaParts.unshift(`${item.quantity} adet`);
      }
      const meta = metaParts.join(' · ');

      const row = PB_h('div', { class: 'checkout-summary-item' });
      row.innerHTML = `
        <div class="checkout-summary-item-img">
          <img src="${PB_escape(imgSrc)}" alt="${PB_escape(item.name)}">
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

      // Sana özel önizleme görsellerini topla (data URL'ler)
      const previewImages = items
        .filter(i => i.customization?.previewImage)
        .map((i, idx) => ({
          name: `${i.name.replace(/[^a-zA-Z0-9]/g, '_')}_${idx + 1}.png`,
          dataUrl: i.customization.previewImage
        }));

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
        siparis_ozeti: orderSummary,
        // Önizleme görselleri (data URL listesi)
        // Formspree dosya yükleme limiti var, bu data URL'leri body içinde kalır
        // İdeal: ayrı bir image hosting'e yükle, link gönder. Şimdilik data URL.
        onizleme_sayisi: previewImages.length
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

      if (item.customization) {
        lines.push(`   ── KİŞİSELLEŞTİRME ──`);
        if (item.customization.text) lines.push(`   Metin: "${item.customization.text}"`);
        if (item.customization.fontId) lines.push(`   Yazı tipi: ${item.customization.fontId}`);
        if (item.customization.materialId) lines.push(`   Renk/Malzeme: ${item.customization.materialId}`);
        if (item.customization.previewImage) lines.push(`   Önizleme: (görsel ekte)`);
      }
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
