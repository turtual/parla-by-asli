/**
 * Parla By Aslı — Kategori sayfası mantığı
 *
 * Her kategori sayfası HTML'inde önce şu set edilmeli:
 *   <script>window.PB_CATEGORY = 'kolye';</script>
 *
 * Bu dosya:
 *   - URL kategorisini okur
 *   - Mod filtresi (Tümü / Koleksiyon / Sana özel) yönetir
 *   - Body data-mode'u set eder (utility bar ve aktif pill rengi için)
 *   - Ürün gridini render eder
 *   - Ürün sayısını günceller
 */

(function () {
  'use strict';

  const category = window.PB_CATEGORY;
  if (!category) {
    console.error('PB_CATEGORY tanımlı değil — kategori sayfası HTML\'ine eklenmeli');
    return;
  }

  let currentMode = 'hep';

  const modeButtons = document.querySelectorAll('.catalog-mode-filter [data-mode]');
  const grid = document.getElementById('catalog-grid');
  const countEl = document.getElementById('catalog-count');

  /* ──────────── Mod filtre ──────────── */

  function setMode(mode) {
    currentMode = mode;
    document.body.dataset.mode = mode;

    modeButtons.forEach(b => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    rerender();
  }

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  /* ──────────── Render ──────────── */

  async function rerender() {
    if (!grid || typeof getProducts !== 'function') return;

    // Yükleniyor göstergesi
    grid.innerHTML = '<div class="catalog-loading" style="grid-column: 1/-1; text-align:center; padding: var(--space-2xl) 0; color: var(--c-toprak);">Yükleniyor…</div>';

    const items = await getProducts({ mode: currentMode, category });
    const loadError = window.PB_Data && window.PB_Data.getLastError
      ? window.PB_Data.getLastError()
      : null;

    // Ürün sayısı
    if (countEl) {
      const count = items.length;
      let label;
      if (loadError) label = '';
      else if (count === 0) label = 'Henüz ürün yok';
      else label = count + ' ürün';
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
      const modeLabels = { hep: '', kol: 'koleksiyon ', ozl: 'sana özel ' };
      const modePart = modeLabels[currentMode] || '';
      const msg = `Bu kategoride henüz ${modePart}ürün yok.`;

      const empty = PB_h('div', { class: 'catalog-empty' });
      empty.append(PB_h('p', {}, msg));

      if (currentMode !== 'hep') {
        const resetBtn = PB_h('button', {
          class: 'btn btn-ghost',
          type: 'button',
          onclick: () => setMode('hep')
        }, 'Tümünü göster');
        empty.append(resetBtn);
      }

      grid.append(empty);
      return;
    }

    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  /* ──────────── Başlangıç ──────────── */

  document.addEventListener('DOMContentLoaded', () => {
    setMode('hep');
  });
})();
