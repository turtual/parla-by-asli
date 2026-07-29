/**
 * Parla By Aslı — Anasayfa interactivity
 *
 * - Mode toggle (Hepsi / Koleksiyon / Sana özel)
 * - Çoklu kategori filtresi (filtre butonu + dropdown panel + chip'ler)
 * - Öne çıkan ürünlerin render'ı
 *
 * Yeni filtre akışı:
 *   - Filtre butonuna tıklayınca dropdown (mobilde drawer) açılır
 *   - Kullanıcı 1+ kategori checkbox işaretler
 *   - Her seçili kategori chip olarak butonun yanında görünür
 *   - Chip'in × ikonuna tıklayınca filtre kalkar
 *   - Tümünü temizle butonu hepsini sıfırlar
 */

(function () {
  'use strict';

  /* ──────────── State ──────────── */

  let currentMode = 'hep';
  let activeCategories = new Set(); // çoklu seçim

  const modeButtons = document.querySelectorAll('.mode-btn');

  /* ──────────── DOM refs ──────────── */

  const filterBtn = document.getElementById('filter-btn');
  const filterPanel = document.getElementById('filter-panel');
  const filterPanelClose = document.getElementById('filter-panel-close');
  const filterCount = document.getElementById('filter-count');
  const filterChips = document.getElementById('filter-chips');
  const filterClear = document.getElementById('filter-clear');
  const filterOverlay = document.getElementById('filter-overlay');
  const filterOptions = document.querySelectorAll('.filter-option input[type="checkbox"]');

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

  /* ──────────── Filtre dropdown/drawer ──────────── */

  function openFilterPanel() {
    if (!filterPanel) return;
    filterPanel.removeAttribute('hidden');
    requestAnimationFrame(() => {
      filterPanel.classList.add('is-open');
      if (filterOverlay) {
        filterOverlay.removeAttribute('hidden');
        requestAnimationFrame(() => filterOverlay.classList.add('is-visible'));
      }
    });
    filterBtn.setAttribute('aria-expanded', 'true');
  }

  function closeFilterPanel() {
    if (!filterPanel) return;
    filterPanel.classList.remove('is-open');
    if (filterOverlay) {
      filterOverlay.classList.remove('is-visible');
    }
    setTimeout(() => {
      filterPanel.setAttribute('hidden', '');
      if (filterOverlay) filterOverlay.setAttribute('hidden', '');
    }, 250);
    filterBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleFilterPanel() {
    const isOpen = filterBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeFilterPanel();
    } else {
      openFilterPanel();
    }
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFilterPanel();
    });
  }

  if (filterPanelClose) {
    filterPanelClose.addEventListener('click', closeFilterPanel);
  }

  if (filterOverlay) {
    filterOverlay.addEventListener('click', closeFilterPanel);
  }

  // Dropdown dışına tıklanınca kapansın (sadece masaüstü, mobilde overlay zaten var)
  document.addEventListener('click', e => {
    if (!filterPanel || filterPanel.hasAttribute('hidden')) return;
    if (window.innerWidth <= 640) return; // mobilde overlay halleder
    if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
      closeFilterPanel();
    }
  });

  // ESC ile kapansın
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && filterPanel && !filterPanel.hasAttribute('hidden')) {
      closeFilterPanel();
    }
  });

  /* ──────────── Checkbox değişimi → chip + filtre ──────────── */

  filterOptions.forEach(cb => {
    cb.addEventListener('change', () => {
      const cat = cb.dataset.cat;
      if (cb.checked) {
        activeCategories.add(cat);
      } else {
        activeCategories.delete(cat);
      }
      updateChips();
      updateFilterCount();
      rerender();
    });
  });

  if (filterClear) {
    filterClear.addEventListener('click', () => {
      activeCategories.clear();
      filterOptions.forEach(cb => cb.checked = false);
      updateChips();
      updateFilterCount();
      rerender();
    });
  }

  /* ──────────── Chip render ──────────── */

  function updateChips() {
    if (!filterChips) return;
    filterChips.innerHTML = '';

    if (activeCategories.size === 0) {
      filterChips.innerHTML = '<span class="filter-empty">Tüm kategoriler gösterilir</span>';
      return;
    }

    activeCategories.forEach(cat => {
      const catData = (typeof CATEGORIES !== 'undefined')
        ? CATEGORIES.find(c => c.id === cat)
        : null;
      const label = catData ? catData.name : cat;

      const chip = document.createElement('span');
      chip.className = 'filter-chip';
      chip.innerHTML = `
        ${label}
        <button type="button" class="filter-chip-remove" aria-label="${label} filtresini kaldır">
          <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 2 L8 8 M8 2 L2 8"/>
          </svg>
        </button>
      `;
      chip.querySelector('.filter-chip-remove').addEventListener('click', () => {
        activeCategories.delete(cat);
        // Checkbox da güncellensin
        const cb = document.querySelector(`.filter-option input[data-cat="${cat}"]`);
        if (cb) cb.checked = false;
        updateChips();
        updateFilterCount();
        rerender();
      });
      filterChips.append(chip);
    });
  }

  function updateFilterCount() {
    if (!filterCount) return;
    if (activeCategories.size === 0) {
      filterCount.setAttribute('hidden', '');
    } else {
      filterCount.removeAttribute('hidden');
      filterCount.textContent = activeCategories.size;
    }
  }

  /* ──────────── Render ──────────── */

  async function rerender() {
    const grid = document.getElementById('featured-grid');
    const titleEl = document.getElementById('featured-title');
    const actionEl = document.getElementById('featured-action');
    if (!grid || typeof getProducts !== 'function') return;

    // Yükleniyor göstergesi (cache miss durumunda görünür)
    if (!grid.children.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: var(--space-2xl) 0; color: var(--c-toprak);">Yükleniyor…</div>';
    }

    // Mod filtresi tüm ürünleri belirler
    const allItems = await getProducts({ mode: currentMode });
    const items = allItems.filter(p => {
      // Eğer hiç kategori seçilmemişse → hepsini göster
      if (activeCategories.size === 0) return true;
      // Aksi takdirde sadece seçili kategorilerdekileri göster
      return activeCategories.has(p.category);
    });

    // Başlık dinamik
    let title;
    if (activeCategories.size === 1) {
      const cat = [...activeCategories][0];
      const catData = (typeof CATEGORIES !== 'undefined') && CATEGORIES.find(c => c.id === cat);
      title = catData ? catData.name : 'Ürünler';
    } else if (activeCategories.size > 1) {
      title = `Seçili kategoriler (${activeCategories.size})`;
    } else {
      const modeLabels = { hep: 'Tüm ürünler', kol: 'Koleksiyon', ozl: 'Sana özel' };
      title = modeLabels[currentMode] || 'Ürünler';
    }
    if (titleEl) titleEl.textContent = title;

    // Aksiyon link: tek kategori varsa kategori sayfasına gider
    if (actionEl) {
      if (activeCategories.size === 1) {
        const cat = [...activeCategories][0];
        actionEl.textContent = title + ' sayfasına git →';
        actionEl.href = 'katalog/' + cat + '/index.html';
        actionEl.removeAttribute('hidden');
      } else {
        actionEl.setAttribute('hidden', '');
      }
    }

    // Render
    grid.innerHTML = '';
    if (items.length === 0) {
      renderEmptyGridState(grid, { filtered: activeCategories.size > 0 });
      return;
    }
    items.forEach((p, i) => grid.append(renderProductCard(p, i)));
  }

  /* ──────────── Başlangıç ──────────── */

  document.addEventListener('DOMContentLoaded', () => {
    setMode('hep');
    updateChips();
    updateFilterCount();
  });
})();
