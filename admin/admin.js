/**
 * Parla By Aslı — Yönetim Paneli
 *
 * Yapılanlar:
 *  - Auth: Supabase email/password login
 *  - Ürünler: Listele / Ekle / Düzenle / Sil
 *  - Görsel: Storage'a yükle → URL'i ürüne kaydet
 *  - Siparişler: Listele / Durum güncelle
 *
 * window.PB_Data: ../assets/data.js'ten gelir
 */

(function () {
  'use strict';

  /* ──────────── DOM refs ──────────── */

  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const app = document.getElementById('app');
  const userEmail = document.getElementById('user-email');
  const btnLogout = document.getElementById('btn-logout');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Products
  const searchInput = document.getElementById('search-input');
  const filterCategory = document.getElementById('filter-category');
  const btnNewProduct = document.getElementById('btn-new-product');
  const productTable = document.getElementById('product-table');

  // Orders
  const filterOrderStatus = document.getElementById('filter-order-status');
  const btnRefreshOrders = document.getElementById('btn-refresh-orders');
  const ordersList = document.getElementById('orders-list');

  // Product modal
  const productModal = document.getElementById('product-modal');
  const productModalTitle = document.getElementById('product-modal-title');
  const productForm = document.getElementById('product-form');
  const formStatus = document.getElementById('form-status');
  const btnSave = document.getElementById('btn-save');
  const btnDelete = document.getElementById('btn-delete');

  // Image upload
  const imageUploadArea = document.getElementById('image-upload-area');
  const imageInput = document.getElementById('image-input');
  const imagePreview = document.getElementById('image-preview');
  const productImageInput = document.getElementById('product-image');

  // Form fields
  const fName = document.getElementById('product-name');
  const fPrice = document.getElementById('product-price');
  const fCategory = document.getElementById('product-category');
  const fDescription = document.getElementById('product-description');
  const fMaterials = document.getElementById('product-materials');
  const fSlug = document.getElementById('product-slug');
  const fId = document.getElementById('product-id');
  const fOrder = document.getElementById('product-order');
  const fFeatured = document.getElementById('product-featured');
  const fActive = document.getElementById('product-active');

  /* ──────────── State ──────────── */

  let currentUser = null;
  let allProducts = [];
  let allOrders = [];
  let editingProduct = null; // null = yeni, obj = düzenleme

  /* ──────────── Categories ──────────── */

  const CATEGORIES = [
    { id: 'kolye', name: 'Kolye' },
    { id: 'kupe', name: 'Küpe' },
    { id: 'bileklik', name: 'Bileklik' },
    { id: 'yuzuk', name: 'Yüzük' },
    { id: 'charm', name: 'Charm' },
    { id: 'bros', name: 'Broş' },
    { id: 'anahtarlik', name: 'Anahtarlık' },
    { id: 'obje', name: 'Ev objeleri' }
  ];

  // Filtre dropdown'ı doldur
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    filterCategory.appendChild(opt);
  });

  /* ──────────── Helpers ──────────── */

  function showStatus(el, message, type = 'info') {
    el.textContent = message;
    el.className = 'status-msg is-' + type;
    el.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
  }

  function hideStatus(el) {
    el.style.display = 'none';
  }

  function turkishToAscii(text) {
    const map = {
      'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g',
      'ı': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o',
      'ü': 'u', 'Ü': 'u', 'ç': 'c', 'Ç': 'c'
    };
    return text.replace(/[şŞğĞıİöÖüÜçÇ]/g, ch => map[ch] || ch);
  }

  function generateSlug(name) {
    return turkishToAscii(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function generateId(category, slug) {
    if (!category || !slug) return '';
    const catShort = category.substring(0, Math.min(7, category.length));
    return `kol-${catShort}-${slug.substring(0, 20)}`;
  }

  function formatPrice(p) {
    return new Intl.NumberFormat('tr-TR').format(p) + ' ₺';
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ──────────── AUTH ──────────── */

  async function checkAuth() {
    const user = await PB_Data.getAdminUser();
    if (user) {
      currentUser = user;
      showApp();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    loginScreen.style.display = 'flex';
    app.style.display = 'none';
  }

  function showApp() {
    loginScreen.style.display = 'none';
    app.style.display = 'grid';
    if (currentUser) {
      userEmail.textContent = currentUser.email;
    }
    loadProducts();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideStatus(loginError);
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'GİRİŞ YAPILIYOR…';

    const { data, error } = await PB_Data.adminLogin(loginEmail.value, loginPassword.value);

    submitBtn.disabled = false;
    submitBtn.textContent = 'GİRİŞ YAP';

    if (error) {
      showStatus(loginError, 'Giriş yapılamadı: ' + (error.message || 'Bilinmeyen hata'), 'error');
      return;
    }

    currentUser = data.user;
    showApp();
  });

  btnLogout.addEventListener('click', async () => {
    if (!confirm('Çıkış yapmak istediğine emin misin?')) return;
    await PB_Data.adminLogout();
    currentUser = null;
    location.reload();
  });

  /* ──────────── TABS ──────────── */

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('is-active', b === btn));
      tabContents.forEach(c => {
        c.style.display = c.id === 'tab-' + target ? '' : 'none';
      });
      if (target === 'orders' && allOrders.length === 0) {
        loadOrders();
      }
    });
  });

  /* ──────────── PRODUCTS ──────────── */

  async function loadProducts() {
    productTable.innerHTML = '<div class="loading">Yükleniyor…</div>';
    const products = await PB_Data.getProducts({ includeInactive: true, forceFresh: true });
    allProducts = products || [];
    renderProductTable();
  }

  function renderProductTable() {
    const search = (searchInput.value || '').toLowerCase().trim();
    const catF = filterCategory.value;

    const filtered = allProducts.filter(p => {
      if (search && !p.name.toLowerCase().includes(search) && !p.slug.toLowerCase().includes(search)) return false;
      if (catF && p.category !== catF) return false;
      return true;
    });

    if (filtered.length === 0) {
      productTable.innerHTML = `
        <div class="empty-state">
          <p>${search || catF ? 'Filtreye uyan ürün yok.' : 'Henüz ürün yok.'}</p>
          ${!search && !catF ? '<button class="btn btn-primary" onclick="document.getElementById(\'btn-new-product\').click()">İlk ürünü ekle</button>' : ''}
        </div>`;
      return;
    }

    const rows = filtered.map(p => {
      const catName = (CATEGORIES.find(c => c.id === p.category) || {}).name || p.category;
      const inactiveBadge = !p.isActive
        ? '<span class="badge badge-inactive">Pasif</span>'
        : '';
      const featured = p.featured ? ' ⭐' : '';
      const imgSrc = p.image && p.image.startsWith('http')
        ? p.image
        : '../' + (p.image || 'assets/img/products/kolye.svg');

      return `
        <tr data-id="${escapeHtml(p.id)}">
          <td><div class="row-img"><img src="${escapeHtml(imgSrc)}" alt=""></div></td>
          <td>
            <div style="font-weight: 500;">${escapeHtml(p.name)}${featured}</div>
            <div style="font-size: 11px; color: var(--c-toprak); font-family: ui-monospace, monospace;">${escapeHtml(p.slug)}</div>
          </td>
          <td>${escapeHtml(catName)}</td>
          <td>${inactiveBadge}</td>
          <td style="font-weight: 500;">${formatPrice(p.price)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="edit" title="Düzenle">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M2 14 L4 10 L11 3 L13 5 L6 12 Z M11 3 L13 5"/>
                </svg>
              </button>
              <button class="icon-btn is-danger" data-action="delete" title="Sil">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M3 4 L13 4 M5 4 L5 13 Q5 14 6 14 L10 14 Q11 14 11 13 L11 4 M6 4 L6 2 Q6 1 7 1 L9 1 Q10 1 10 2 L10 4 M7 7 L7 11 M9 7 L9 11"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    productTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th style="width: 64px;"></th>
            <th>Ad</th>
            <th>Kategori</th>
            <th>Durum</th>
            <th>Fiyat</th>
            <th style="width: 100px;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    // Row event listener'ları
    productTable.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const action = btn.dataset.action;
        const product = allProducts.find(p => p.id === id);
        if (!product) return;
        if (action === 'edit') openProductModal(product);
        if (action === 'delete') deleteProduct(product);
      });
    });

    // Row tıklayınca da düzenle
    productTable.querySelectorAll('tbody tr').forEach(tr => {
      tr.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === tr.dataset.id);
        if (product) openProductModal(product);
      });
      tr.style.cursor = 'pointer';
    });
  }

  // Filtre event'leri
  searchInput.addEventListener('input', renderProductTable);
  filterCategory.addEventListener('change', renderProductTable);

  /* ──────────── PRODUCT MODAL ──────────── */

  btnNewProduct.addEventListener('click', () => openProductModal(null));

  function openProductModal(product) {
    editingProduct = product;
    productForm.reset();
    hideStatus(formStatus);

    if (product) {
      productModalTitle.textContent = 'Ürünü Düzenle';
      btnDelete.style.display = '';

      fName.value = product.name || '';
      fPrice.value = product.price || 0;
      fCategory.value = product.category || '';
      fDescription.value = product.description || '';
      fMaterials.value = (product.materials || []).join('\n');
      fSlug.value = product.slug || '';
      fId.value = product.id || '';
      fOrder.value = product.displayOrder || 100;
      fFeatured.checked = !!product.featured;
      fActive.checked = product.isActive !== false;

      // Görsel preview
      if (product.image) {
        const src = product.image.startsWith('http') ? product.image : '../' + product.image;
        imagePreview.innerHTML = `<img src="${escapeHtml(src)}" alt="">`;
        productImageInput.value = product.image;
      } else {
        imagePreview.innerHTML = '<span style="color: var(--c-toprak); font-size: 28px;">＋</span>';
        productImageInput.value = '';
      }

    } else {
      productModalTitle.textContent = 'Yeni Ürün';
      btnDelete.style.display = 'none';
      fOrder.value = 100;
      fActive.checked = true;
      imagePreview.innerHTML = '<span style="color: var(--c-toprak); font-size: 28px;">＋</span>';
      productImageInput.value = '';
    }

    productModal.classList.add('is-open');
  }

  function closeProductModal() {
    productModal.classList.remove('is-open');
    editingProduct = null;
  }

  productModal.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', closeProductModal);
  });

  productModal.addEventListener('click', (e) => {
    if (e.target === productModal) closeProductModal();
  });

  // Slug ve ID otomatik üret
  fName.addEventListener('input', () => {
    if (editingProduct) return; // düzenlemede dokunma
    fSlug.value = generateSlug(fName.value);
    fId.value = generateId(fCategory.value, fSlug.value);
  });

  fSlug.addEventListener('input', () => {
    if (editingProduct) return;
    fSlug.value = fSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    fId.value = generateId(fCategory.value, fSlug.value);
  });

  fCategory.addEventListener('change', () => {
    if (editingProduct) return;
    fId.value = generateId(fCategory.value, fSlug.value);
  });

  /* ──────────── IMAGE UPLOAD ──────────── */

  imageUploadArea.addEventListener('click', () => imageInput.click());

  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.classList.add('is-dragging');
  });

  imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.classList.remove('is-dragging');
  });

  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.classList.remove('is-dragging');
    if (e.dataTransfer.files.length) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageFile(e.target.files[0]);
  });

  async function handleImageFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStatus(formStatus, 'Dosya çok büyük (max 5MB)', 'error');
      return;
    }

    // Geçici preview
    const reader = new FileReader();
    reader.onload = e => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="">`;
    };
    reader.readAsDataURL(file);

    // Yükle
    showStatus(formStatus, 'Görsel yükleniyor…', 'info');
    const productId = fId.value || 'temp-' + Date.now();
    const { data, error } = await PB_Data.adminUploadImage(file, productId);

    if (error) {
      showStatus(formStatus, 'Görsel yüklenemedi: ' + (error.message || error), 'error');
      return;
    }

    productImageInput.value = data.publicUrl;
    showStatus(formStatus, 'Görsel yüklendi ✓', 'success');
  }

  /* ──────────── SAVE PRODUCT ──────────── */

  btnSave.addEventListener('click', async () => {
    if (!productForm.reportValidity()) return;

    btnSave.disabled = true;
    btnSave.textContent = 'KAYDEDİLİYOR…';

    const materialsText = fMaterials.value.trim();
    const materials = materialsText
      ? materialsText.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    const productData = {
      id: fId.value.trim(),
      slug: fSlug.value.trim(),
      name: fName.value.trim(),
      price: parseInt(fPrice.value) || 0,
      category: fCategory.value,
      // Kişiye özel tasarım stüdyosu kaldırıldı, katalogda artık tek tip
      // ürün var. 'mode' kolonu veritabanı şemasında duruyor, sabit değer
      // veriyoruz ki eski sorgular/raporlar bozulmasın.
      mode: 'koleksiyon',
      description: fDescription.value.trim(),
      materials,
      image: productImageInput.value || null,
      featured: fFeatured.checked,
      isActive: fActive.checked,
      displayOrder: parseInt(fOrder.value) || 100,
      customizable: false,
      customization: null
    };

    let result;
    if (editingProduct) {
      result = await PB_Data.adminUpdateProduct(editingProduct.id, productData);
    } else {
      result = await PB_Data.adminCreateProduct(productData);
    }

    btnSave.disabled = false;
    btnSave.textContent = 'KAYDET';

    if (result.error) {
      showStatus(formStatus, 'Kaydedilemedi: ' + (result.error.message || result.error), 'error');
      return;
    }

    showStatus(formStatus, 'Kaydedildi ✓', 'success');
    setTimeout(() => {
      closeProductModal();
      loadProducts();
    }, 600);
  });

  /* ──────────── DELETE PRODUCT ──────────── */

  btnDelete.addEventListener('click', async () => {
    if (!editingProduct) return;
    if (!confirm(`"${editingProduct.name}" ürününü silmek istediğine emin misin?\n\nBu işlem geri alınamaz.`)) return;

    deleteProduct(editingProduct, true);
  });

  async function deleteProduct(product, fromModal = false) {
    if (!fromModal) {
      if (!confirm(`"${product.name}" ürününü silmek istediğine emin misin?`)) return;
    }

    const { error } = await PB_Data.adminDeleteProduct(product.id);
    if (error) {
      alert('Silinemedi: ' + (error.message || error));
      return;
    }

    if (fromModal) closeProductModal();
    loadProducts();
  }

  /* ──────────── ORDERS ──────────── */

  async function loadOrders() {
    ordersList.innerHTML = '<div class="loading">Yükleniyor…</div>';
    const { data, error } = await PB_Data.adminGetOrders();
    if (error) {
      ordersList.innerHTML = `<div class="status-msg is-error">Siparişler yüklenemedi: ${error.message}</div>`;
      return;
    }
    allOrders = data || [];
    renderOrders();
  }

  function renderOrders() {
    const statusF = filterOrderStatus.value;
    const filtered = allOrders.filter(o => !statusF || o.status === statusF);

    if (filtered.length === 0) {
      ordersList.innerHTML = `<div class="empty-state"><p>${statusF ? 'Bu durumda sipariş yok.' : 'Henüz sipariş yok.'}</p></div>`;
      return;
    }

    ordersList.innerHTML = filtered.map(o => {
      const items = (o.items || []).map(i => `
        <div style="font-size: 12px; color: var(--c-toprak); margin-bottom: 4px;">
          <strong style="color: var(--c-sicak);">${escapeHtml(i.name || '?')}</strong>
          ${i.qty ? ` × ${i.qty}` : ''}
          ${i.customization ? `<br><span style="font-size: 11px;">${escapeHtml(JSON.stringify(i.customization))}</span>` : ''}
        </div>
      `).join('');

      return `
        <div class="order-card" data-order-id="${escapeHtml(o.id)}">
          <div class="order-head">
            <div>
              <div class="order-code">${escapeHtml(o.order_code)}</div>
              <div class="order-time">${formatTime(o.created_at)}</div>
            </div>
            <div>
              <select class="filter-select status-select" data-order-id="${escapeHtml(o.id)}" style="font-size: 11px; padding: 6px 8px;">
                <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Bekleyen</option>
                <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Onaylandı</option>
                <option value="producing" ${o.status === 'producing' ? 'selected' : ''}>Üretimde</option>
                <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Kargoda</option>
                <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Teslim edildi</option>
                <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>İptal</option>
              </select>
            </div>
          </div>
          <div style="font-size: 13px; margin-bottom: 8px;">
            <strong>${escapeHtml(o.customer_name)}</strong>
            · <a href="mailto:${escapeHtml(o.customer_email)}" style="color: var(--c-bakir);">${escapeHtml(o.customer_email)}</a>
            ${o.customer_phone ? ` · ${escapeHtml(o.customer_phone)}` : ''}
          </div>
          ${o.shipping_address ? `<div style="font-size: 12px; color: var(--c-toprak); margin-bottom: 8px;">📍 ${escapeHtml(o.shipping_address)}${o.shipping_city ? ', ' + escapeHtml(o.shipping_city) : ''}</div>` : ''}
          <div style="margin-bottom: 8px;">${items}</div>
          ${o.customer_note ? `<div style="font-size: 12px; padding: 8px 10px; background: var(--c-bej); border-radius: 6px; margin-bottom: 8px;"><strong>Not:</strong> ${escapeHtml(o.customer_note)}</div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 0.5px solid var(--c-line);">
            <div style="font-size: 11px; color: var(--c-toprak);">Ara: ${formatPrice(o.subtotal)} · Kargo: ${formatPrice(o.shipping_fee)}</div>
            <div style="font-weight: 600;">Toplam: ${formatPrice(o.total)}</div>
          </div>
        </div>
      `;
    }).join('');

    // Status değişikliği
    ordersList.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const orderId = sel.dataset.orderId;
        const newStatus = sel.value;
        const { error } = await PB_Data.adminUpdateOrderStatus(orderId, newStatus);
        if (error) {
          alert('Durum güncellenemedi: ' + (error.message || error));
        } else {
          // Local state güncelle
          const order = allOrders.find(o => o.id === orderId);
          if (order) order.status = newStatus;
        }
      });
    });
  }

  filterOrderStatus.addEventListener('change', renderOrders);
  btnRefreshOrders.addEventListener('click', loadOrders);

  /* ──────────── INIT ──────────── */

  // PB_Data hazır olunca auth kontrol et
  function init() {
    if (window.PB_Data) {
      checkAuth();
    } else {
      // SDK henüz yüklenmemiş, biraz bekle
      setTimeout(init, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
