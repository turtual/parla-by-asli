/**
 * Parla By Aslı — Anasayfa interactivity
 *
 * - Mode toggle (Hepsi / Koleksiyon / Sana özel)
 * - Alt-kategori pill filtresi
 * - Öne çıkan ürünlerin render'ı
 * - Login modal sekme geçişi (Giriş / Üye ol)
 */

(function () {
  'use strict';

  /* ──────────── State ──────────── */

  let currentMode = 'hep';
  let currentCategory = null;

  const modeButtons = document.querySelectorAll('.mode-btn');
  const pillButtons = document.querySelectorAll('.pill[data-cat]');

  /* ──────────── Mode toggle ──────────── */

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

  /* ──────────── Kategori pill'leri ──────────── */

  function setCategory(category) {
    // Aynı kategoriye ikinci tıklama → filtreyi temizler
    currentCategory = (currentCategory === category) ? null : category;
    pillButtons.forEach(p => {
      p.classList.toggle('is-active', p.dataset.cat === currentCategory);
    });
    rerender();
  }

  pillButtons.forEach(pill => {
    pill.addEventListener('click', e => {
      e.preventDefault();
      setCategory(pill.dataset.cat);
    });
  });

  /* ──────────── Render ──────────── */

  function rerender() {
    const grid = document.getElementById('featured-grid');
    const titleEl = document.getElementById('featured-title');
    const actionEl = document.getElementById('featured-action');
    if (!grid || typeof getProducts !== 'function') return;

    // Mod + kategori filtresi
    const filters = { mode: currentMode };
    if (currentCategory) filters.category = currentCategory;
    const items = getProducts(filters);

    // Başlık dinamik: kategori varsa kategori adı, yoksa mod etiketi
    let title;
    if (currentCategory) {
      const cat = (typeof CATEGORIES !== 'undefined') && CATEGORIES.find(c => c.id === currentCategory);
      title = cat ? cat.name : 'Ürünler';
    } else {
      const modeLabels = { hep: 'Tüm ürünler', kol: 'Koleksiyon', ozl: 'Sana özel' };
      title = modeLabels[currentMode] || 'Ürünler';
    }
    if (titleEl) titleEl.textContent = title;

    // Aksiyon link: kategori filtresi aktifken kategori sayfasına gider
    if (actionEl) {
      if (currentCategory) {
        actionEl.textContent = title + ' sayfasına git →';
        actionEl.href = 'katalog/' + currentCategory + '/index.html';
        actionEl.removeAttribute('hidden');
      } else {
        actionEl.setAttribute('hidden', '');
      }
    }

    // Render
    grid.innerHTML = '';
    if (items.length === 0) {
      const msg = currentCategory ? 'Bu kategoride henüz ürün yok.' : 'Henüz ürün yok.';
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--c-toprak); font-size: 14px; padding: var(--space-xl) 0;">${msg}</p>`;
      return;
    }
    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  /* ──────────── Başlangıç ──────────── */

  document.addEventListener('DOMContentLoaded', () => {
    setMode('hep');
  });
})();
