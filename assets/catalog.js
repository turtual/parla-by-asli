/**
 * Parla By Aslı — Kategori sayfası mantığı
 *
 * Her kategori sayfası HTML'inde önce şu set edilmeli:
 *   <script>window.PB_CATEGORY = 'kolye';</script>
 *
 * Bu dosya:
 *   - URL kategorisini okur
 *   - Ürün gridini render eder
 *   - Ürün sayısını günceller
 *
 * Not: Hepsi/Koleksiyon/Sana özel mod filtresi kaldırıldı — kişiye özel
 * tasarım stüdyosu artık yok, katalogda tek tip ürün var.
 */

(function () {
  'use strict';

  const category = window.PB_CATEGORY;
  if (!category) {
    console.error('PB_CATEGORY tanımlı değil — kategori sayfası HTML\'ine eklenmeli');
    return;
  }

  const grid = document.getElementById('catalog-grid');
  const countEl = document.getElementById('catalog-count');

  /* ──────────── Render ──────────── */

  async function rerender() {
    if (!grid || typeof getProducts !== 'function') return;

    // Yükleniyor göstergesi
    grid.innerHTML = '<div class="catalog-loading" style="grid-column: 1/-1; text-align:center; padding: var(--space-2xl) 0; color: var(--c-toprak);">Yükleniyor…</div>';

    const items = await getProducts({ category });
    const loadError = window.PB_Data && window.PB_Data.getLastError
      ? window.PB_Data.getLastError()
      : null;

    // Ürün sayısı
    if (countEl) {
      let label;
      if (loadError) label = '';
      else if (items.length === 0) label = 'Henüz ürün yok';
      else label = items.length + ' ürün';
      countEl.textContent = label;
    }

    grid.innerHTML = '';

    // Veritabanına ulaşılamadıysa bunu "bu kategoride ürün yok" gibi göstermek
    // ziyaretçiyi yanıltır — arızayı arıza olarak söyle.
    if (loadError) {
      const errBox = PB_h('div', { class: 'catalog-empty', role: 'alert' });
      errBox.append(PB_h('p', {}, 'Ürünler şu anda yüklenemiyor. Bağlantı sorunu olabilir.'));
      errBox.append(PB_h('button', {
        class: 'btn btn-ghost',
        type: 'button',
        onclick: () => window.location.reload()
      }, 'TEKRAR DENE'));
      grid.append(errBox);
      return;
    }

    if (items.length === 0) {
      const empty = PB_h('div', { class: 'catalog-empty' });
      empty.append(PB_h('p', {}, 'Bu kategoride henüz ürün yok.'));
      grid.append(empty);
      return;
    }

    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  document.addEventListener('DOMContentLoaded', rerender);
})();
