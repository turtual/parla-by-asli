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
  const filterCollection = document.getElementById('filter-collection');
  const btnNewProduct = document.getElementById('btn-new-product');
  const productTable = document.getElementById('product-table');

  // Collections
  const btnNewCollection = document.getElementById('btn-new-collection');
  const collectionTable = document.getElementById('collection-table');
  const collectionModal = document.getElementById('collection-modal');
  const collectionModalTitle = document.getElementById('collection-modal-title');
  const collectionForm = document.getElementById('collection-form');
  const collectionFormStatus = document.getElementById('collection-form-status');
  const btnSaveCollection = document.getElementById('btn-save-collection');
  const btnDeleteCollection = document.getElementById('btn-delete-collection');
  const cName = document.getElementById('collection-name');
  const cSlug = document.getElementById('collection-slug');
  const cDescription = document.getElementById('collection-description');
  const cOrder = document.getElementById('collection-order');
  const cActive = document.getElementById('collection-active');

  // Product types
  const btnNewProductType = document.getElementById('btn-new-product-type');
  const productTypeTable = document.getElementById('product-type-table');
  const productTypeModal = document.getElementById('product-type-modal');
  const productTypeModalTitle = document.getElementById('product-type-modal-title');
  const productTypeForm = document.getElementById('product-type-form');
  const productTypeFormStatus = document.getElementById('product-type-form-status');
  const btnSaveProductType = document.getElementById('btn-save-product-type');
  const btnDeleteProductType = document.getElementById('btn-delete-product-type');
  const ptName = document.getElementById('product-type-name');
  const ptSlug = document.getElementById('product-type-slug');
  const ptOrder = document.getElementById('product-type-order');
  const ptActive = document.getElementById('product-type-active');

  // Orders
  const filterOrderStatus = document.getElementById('filter-order-status');
  const btnRefreshOrders = document.getElementById('btn-refresh-orders');
  const ordersList = document.getElementById('orders-list');

  // Texts (site metinleri + sayfa içerikleri)
  const siteTextsList = document.getElementById('site-texts-list');
  const contentPagesList = document.getElementById('content-pages-list');
  const contentPageModal = document.getElementById('content-page-modal');
  const contentPageModalTitle = document.getElementById('content-page-modal-title');
  const contentPageForm = document.getElementById('content-page-form');
  const contentPageFormStatus = document.getElementById('content-page-form-status');
  const btnSaveContentPage = document.getElementById('btn-save-content-page');
  const cpEyebrow = document.getElementById('cp-eyebrow');
  const cpTitle = document.getElementById('cp-title');
  const cpMetaText = document.getElementById('cp-meta-text');
  const cpBlocksList = document.getElementById('cp-blocks-list');
  const cpAddBlockType = document.getElementById('cp-add-block-type');
  const btnAddBlock = document.getElementById('btn-add-block');

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
  const fCollection = document.getElementById('product-collection');
  const fDescription = document.getElementById('product-description');
  const fMaterials = document.getElementById('product-materials');
  const fSlug = document.getElementById('product-slug');
  const fId = document.getElementById('product-id');
  const fOrder = document.getElementById('product-order');
  const fStock = document.getElementById('product-stock');
  const fFeatured = document.getElementById('product-featured');
  const fActive = document.getElementById('product-active');

  /* ──────────── State ──────────── */

  let currentUser = null;
  let allProducts = [];
  let allOrders = [];
  let allCollections = [];
  let allProductTypes = [];
  let editingProduct = null; // null = yeni, obj = düzenleme
  let editingCollection = null;
  let editingProductType = null;
  let editingContentPageSlug = null;
  let editingBlocks = []; // blok editörünün üzerinde çalıştığı geçici kopya

  /* ──────────── Kategoriler artık koddan değil Supabase'den ──────────── */
  /* Eskiden burada sabit bir CATEGORIES dizisi vardı. Kişiye özel tasarım
     modülü kaldırılınca kategori yapısı iki seviyeli hale geldi (koleksiyon
     + ürün tipi) ve ikisi de admin'den yönetilebilmesi gerektiği için
     Supabase'e taşındı: bkz. loadCategoryData(). */

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

  async function showApp() {
    loginScreen.style.display = 'none';
    app.style.display = 'grid';
    if (currentUser) {
      userEmail.textContent = currentUser.email;
    }
    // Ürün tipi/koleksiyon dropdown'ları ürün listesinden önce dolu olmalı
    await loadCategoryData();
    loadProducts();
  }

  /**
   * Koleksiyon + ürün tipi listelerini çeker ve dört yeri aynı anda
   * doldurur: ürün formundaki iki select, ürün listesindeki iki filtre.
   * Admin panelinde her zaman inaktifler dahil tüm liste görünür
   * (forceFresh: az sayıda kayıt olduğu için cache'e gerek yok).
   */
  async function loadCategoryData() {
    const [collections, productTypes] = await Promise.all([
      PB_Data.getCollections({ includeInactive: true, forceFresh: true }),
      PB_Data.getProductTypes({ includeInactive: true, forceFresh: true })
    ]);
    allCollections = collections || [];
    allProductTypes = productTypes || [];

    fillSelect(fCategory, allProductTypes, 'slug', 'name', 'Seç…');
    fillSelect(fCollection, allCollections, 'id', 'name', 'Seç…');
    fillSelect(filterCategory, allProductTypes, 'slug', 'name', 'Tüm ürün tipleri');
    fillSelect(filterCollection, allCollections, 'id', 'name', 'Tüm koleksiyonlar');
  }

  /** Bir <select>'i verilen kayıt listesiyle doldurur, ilk seçenek olarak placeholder bırakır. */
  function fillSelect(selectEl, items, valueKey, labelKey, placeholder) {
    if (!selectEl) return;
    const oncekiDeger = selectEl.value;
    selectEl.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item[valueKey];
      opt.textContent = item.name + (item.isActive === false ? ' (pasif)' : '');
      selectEl.appendChild(opt);
    });
    // Formu doldururken (openProductModal) seçili değeri korumak için
    if (oncekiDeger && [...selectEl.options].some(o => o.value === oncekiDeger)) {
      selectEl.value = oncekiDeger;
    }
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
      if (target === 'collections') renderCollectionTable();
      if (target === 'product-types') renderProductTypeTable();
      if (target === 'texts') { loadSiteTexts(); loadContentPages(); }
    });
  });

  /* ──────────── PRODUCTS ──────────── */

  async function loadProducts() {
    productTable.innerHTML = '<div class="loading">Yükleniyor…</div>';
    const products = await PB_Data.getProducts({ includeInactive: true, forceFresh: true });
    allProducts = products || [];
    renderProductTable();
  }

  /**
   * Ürün listesi tek düz tablo. Her satırda Koleksiyon, Ürün Tipi'nin
   * solunda ayrı bir sütun olarak görünür (ikisi de admin'den yönetilen
   * ayrı kavramlar). Arama ve filtreler satırları daraltır.
   */
  function renderProductTable() {
    const search = (searchInput.value || '').toLowerCase().trim();
    const catF = filterCategory.value;
    const colF = filterCollection.value;

    const filtered = allProducts.filter(p => {
      if (search && !p.name.toLowerCase().includes(search) && !p.slug.toLowerCase().includes(search)) return false;
      if (catF && p.category !== catF) return false;
      if (colF && p.collectionId !== colF) return false;
      return true;
    });

    if (filtered.length === 0) {
      productTable.innerHTML = `
        <div class="empty-state">
          <p>${search || catF || colF ? 'Filtreye uyan ürün yok.' : 'Henüz ürün yok.'}</p>
          ${!search && !catF && !colF ? '<button class="btn btn-primary" onclick="document.getElementById(\'btn-new-product\').click()">İlk ürünü ekle</button>' : ''}
        </div>`;
      return;
    }

    const rows = filtered.map(p => renderProductRow(p)).join('');

    productTable.innerHTML = `
      <table>
        <thead>
          <tr>
            <th style="width: 64px;"></th>
            <th>Ad</th>
            <th>Koleksiyon</th>
            <th>Ürün tipi</th>
            <th>Stok</th>
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

  function renderProductRow(p) {
    const colName = (allCollections.find(c => c.id === p.collectionId) || {}).name || '—';
    const typeName = (allProductTypes.find(t => t.slug === p.category) || {}).name || p.category;
    const inactiveBadge = !p.isActive
      ? '<span class="badge badge-inactive">Pasif</span>'
      : '';
    const featured = p.featured ? ' ⭐' : '';
    const imgSrc = p.image && p.image.startsWith('http')
      ? p.image
      : '../' + (p.image || 'assets/img/products/kolye.svg');
    const stock = p.stockQuantity || 0;
    const stockClass = 'stock-badge' + (stock <= 0 ? ' is-empty' : '');

    return `
      <tr data-id="${escapeHtml(p.id)}">
        <td><div class="row-img"><img src="${escapeHtml(imgSrc)}" alt=""></div></td>
        <td>
          <div style="font-weight: 500;">${escapeHtml(p.name)}${featured}</div>
          <div style="font-size: 11px; color: var(--c-toprak); font-family: ui-monospace, monospace;">${escapeHtml(p.slug)}</div>
        </td>
        <td>${escapeHtml(colName)}</td>
        <td>${escapeHtml(typeName)}</td>
        <td><span class="${stockClass}">${stock} adet</span></td>
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
      </tr>`;
  }

  // Filtre event'leri
  searchInput.addEventListener('input', renderProductTable);
  filterCategory.addEventListener('change', renderProductTable);
  filterCollection.addEventListener('change', renderProductTable);

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
      fCollection.value = product.collectionId || '';
      fDescription.value = product.description || '';
      fMaterials.value = (product.materials || []).join('\n');
      fSlug.value = product.slug || '';
      fId.value = product.id || '';
      fOrder.value = product.displayOrder || 100;
      fStock.value = product.stockQuantity ?? 0;
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
      fStock.value = 0;
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
      collectionId: fCollection.value,
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
      stockQuantity: parseInt(fStock.value) || 0,
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

  /* ──────────── KOLEKSİYONLAR ────────────
   * Ürün CRUD'unun (yukarıdaki bölüm) küçültülmüş kopyası — aynı
   * kaydetme akışı: buton pasifleştir → PB_Data.adminX çağır →
   * showStatus() → modalı kapatıp listeyi tazele.
   */

  function renderCollectionTable() {
    if (allCollections.length === 0) {
      collectionTable.innerHTML = `
        <div class="empty-state">
          <p>Henüz koleksiyon yok.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-collection').click()">İlk koleksiyonu ekle</button>
        </div>`;
      return;
    }

    const rows = allCollections.map(c => {
      const inactiveBadge = !c.isActive ? '<span class="badge badge-inactive">Pasif</span>' : '';
      const urunSayisi = allProducts.filter(p => p.collectionId === c.id).length;
      return `
        <tr data-id="${escapeHtml(c.id)}">
          <td>
            <div style="font-weight: 500;">${escapeHtml(c.name)}</div>
            <div style="font-size: 11px; color: var(--c-toprak); font-family: ui-monospace, monospace;">/katalog/${escapeHtml(c.slug)}/</div>
          </td>
          <td>${inactiveBadge}</td>
          <td>${urunSayisi} ürün</td>
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
        </tr>`;
    }).join('');

    collectionTable.innerHTML = `
      <table>
        <thead>
          <tr><th>Ad</th><th>Durum</th><th>Ürün sayısı</th><th style="width: 100px;"></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    collectionTable.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.closest('tr').dataset.id;
        const collection = allCollections.find(c => c.id === id);
        if (!collection) return;
        if (btn.dataset.action === 'edit') openCollectionModal(collection);
        if (btn.dataset.action === 'delete') deleteCollection(collection);
      });
    });
    collectionTable.querySelectorAll('tbody tr').forEach(tr => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        const collection = allCollections.find(c => c.id === tr.dataset.id);
        if (collection) openCollectionModal(collection);
      });
    });
  }

  btnNewCollection.addEventListener('click', () => openCollectionModal(null));

  function openCollectionModal(collection) {
    editingCollection = collection;
    collectionForm.reset();
    hideStatus(collectionFormStatus);

    if (collection) {
      collectionModalTitle.textContent = 'Koleksiyonu Düzenle';
      btnDeleteCollection.style.display = '';
      cName.value = collection.name || '';
      cSlug.value = collection.slug || '';
      cDescription.value = collection.description || '';
      cOrder.value = collection.displayOrder || 100;
      cActive.checked = collection.isActive !== false;
    } else {
      collectionModalTitle.textContent = 'Yeni Koleksiyon';
      btnDeleteCollection.style.display = 'none';
      cOrder.value = 100;
      cActive.checked = true;
    }
    collectionModal.classList.add('is-open');
  }

  function closeCollectionModal() {
    collectionModal.classList.remove('is-open');
    editingCollection = null;
  }

  collectionModal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeCollectionModal));
  collectionModal.addEventListener('click', e => { if (e.target === collectionModal) closeCollectionModal(); });

  // Ad girilirken slug otomatik üretilsin (yeni koleksiyon eklerken)
  cName.addEventListener('input', () => {
    if (editingCollection) return;
    cSlug.value = generateSlug(cName.value);
  });
  cSlug.addEventListener('input', () => {
    cSlug.value = cSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  });

  btnSaveCollection.addEventListener('click', async () => {
    if (!collectionForm.reportValidity()) return;
    btnSaveCollection.disabled = true;
    btnSaveCollection.textContent = 'KAYDEDİLİYOR…';

    const data = {
      name: cName.value.trim(),
      slug: cSlug.value.trim(),
      description: cDescription.value.trim(),
      displayOrder: parseInt(cOrder.value) || 100,
      isActive: cActive.checked
    };

    const result = editingCollection
      ? await PB_Data.adminUpdateCollection(editingCollection.id, data)
      : await PB_Data.adminCreateCollection(data);

    btnSaveCollection.disabled = false;
    btnSaveCollection.textContent = 'KAYDET';

    if (result.error) {
      showStatus(collectionFormStatus, 'Kaydedilemedi: ' + (result.error.message || result.error), 'error');
      return;
    }

    showStatus(collectionFormStatus, 'Kaydedildi ✓', 'success');
    setTimeout(async () => {
      closeCollectionModal();
      await loadCategoryData();
      renderCollectionTable();
    }, 600);
  });

  btnDeleteCollection.addEventListener('click', () => {
    if (!editingCollection) return;
    deleteCollection(editingCollection, true);
  });

  async function deleteCollection(collection, fromModal = false) {
    if (!confirm(`"${collection.name}" koleksiyonunu silmek istediğine emin misin?`)) return;

    const { error } = await PB_Data.adminDeleteCollection(collection.id);
    if (error) {
      // adminDeleteCollection, koleksiyonda hâlâ ürün varsa anlaşılır bir
      // mesajla (kaç ürün, önce taşı) burada durur — ham FK hatası değil.
      alert('Silinemedi: ' + (error.message || error));
      return;
    }
    if (fromModal) closeCollectionModal();
    await loadCategoryData();
    renderCollectionTable();
  }

  /* ──────────── ÜRÜN TİPLERİ ──────────── */

  function renderProductTypeTable() {
    if (allProductTypes.length === 0) {
      productTypeTable.innerHTML = `
        <div class="empty-state">
          <p>Henüz ürün tipi yok.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-product-type').click()">İlk ürün tipini ekle</button>
        </div>`;
      return;
    }

    const rows = allProductTypes.map(t => {
      const inactiveBadge = !t.isActive ? '<span class="badge badge-inactive">Pasif</span>' : '';
      const urunSayisi = allProducts.filter(p => p.category === t.slug).length;
      return `
        <tr data-id="${escapeHtml(t.id)}" data-slug="${escapeHtml(t.slug)}">
          <td>
            <div style="font-weight: 500;">${escapeHtml(t.name)}</div>
            <div style="font-size: 11px; color: var(--c-toprak); font-family: ui-monospace, monospace;">${escapeHtml(t.slug)}</div>
          </td>
          <td>${inactiveBadge}</td>
          <td>${urunSayisi} ürün</td>
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
        </tr>`;
    }).join('');

    productTypeTable.innerHTML = `
      <table>
        <thead>
          <tr><th>Ad</th><th>Durum</th><th>Ürün sayısı</th><th style="width: 100px;"></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    productTypeTable.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const productType = allProductTypes.find(t => t.id === tr.dataset.id);
        if (!productType) return;
        if (btn.dataset.action === 'edit') openProductTypeModal(productType);
        if (btn.dataset.action === 'delete') deleteProductType(productType);
      });
    });
    productTypeTable.querySelectorAll('tbody tr').forEach(tr => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        const productType = allProductTypes.find(t => t.id === tr.dataset.id);
        if (productType) openProductTypeModal(productType);
      });
    });
  }

  btnNewProductType.addEventListener('click', () => openProductTypeModal(null));

  function openProductTypeModal(productType) {
    editingProductType = productType;
    productTypeForm.reset();
    hideStatus(productTypeFormStatus);

    if (productType) {
      productTypeModalTitle.textContent = 'Ürün Tipini Düzenle';
      btnDeleteProductType.style.display = '';
      ptName.value = productType.name || '';
      ptSlug.value = productType.slug || '';
      ptOrder.value = productType.displayOrder || 100;
      ptActive.checked = productType.isActive !== false;
    } else {
      productTypeModalTitle.textContent = 'Yeni Ürün Tipi';
      btnDeleteProductType.style.display = 'none';
      ptOrder.value = 100;
      ptActive.checked = true;
    }
    productTypeModal.classList.add('is-open');
  }

  function closeProductTypeModal() {
    productTypeModal.classList.remove('is-open');
    editingProductType = null;
  }

  productTypeModal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeProductTypeModal));
  productTypeModal.addEventListener('click', e => { if (e.target === productTypeModal) closeProductTypeModal(); });

  ptName.addEventListener('input', () => {
    if (editingProductType) return;
    ptSlug.value = generateSlug(ptName.value);
  });
  ptSlug.addEventListener('input', () => {
    ptSlug.value = ptSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  });

  btnSaveProductType.addEventListener('click', async () => {
    if (!productTypeForm.reportValidity()) return;
    btnSaveProductType.disabled = true;
    btnSaveProductType.textContent = 'KAYDEDİLİYOR…';

    const data = {
      name: ptName.value.trim(),
      slug: ptSlug.value.trim(),
      displayOrder: parseInt(ptOrder.value) || 100,
      isActive: ptActive.checked
    };

    const result = editingProductType
      ? await PB_Data.adminUpdateProductType(editingProductType.id, data)
      : await PB_Data.adminCreateProductType(data);

    btnSaveProductType.disabled = false;
    btnSaveProductType.textContent = 'KAYDET';

    if (result.error) {
      showStatus(productTypeFormStatus, 'Kaydedilemedi: ' + (result.error.message || result.error), 'error');
      return;
    }

    showStatus(productTypeFormStatus, 'Kaydedildi ✓', 'success');
    setTimeout(async () => {
      closeProductTypeModal();
      await loadCategoryData();
      renderProductTypeTable();
    }, 600);
  });

  btnDeleteProductType.addEventListener('click', () => {
    if (!editingProductType) return;
    deleteProductType(editingProductType, true);
  });

  async function deleteProductType(productType, fromModal = false) {
    if (!confirm(`"${productType.name}" ürün tipini silmek istediğine emin misin?`)) return;

    const { error } = await PB_Data.adminDeleteProductType(productType.id, productType.slug);
    if (error) {
      alert('Silinemedi: ' + (error.message || error));
      return;
    }
    if (fromModal) closeProductTypeModal();
    await loadCategoryData();
    renderProductTypeTable();
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
        const order = allOrders.find(o => o.id === orderId);

        const { error } = await PB_Data.adminUpdateOrderStatus(orderId, newStatus);
        if (error) {
          alert('Durum güncellenemedi: ' + (error.message || error));
          return;
        }

        if (order) {
          order.status = newStatus;
          await applyStockForStatusChange(order, newStatus);
        }
      });
    });
  }

  /**
   * Sipariş "Onaylandı" olunca ilgili ürünlerin stokundan düşer, "İptal"
   * olunca geri ekler. `stock_applied` bayrağı durum ileri-geri değiştirilse
   * (Onaylandı → Bekleyen → Onaylandı gibi) bile çift düşümü/iadeyi önler.
   */
  async function applyStockForStatusChange(order, newStatus) {
    const items = order.items || [];

    if (newStatus === 'confirmed' && !order.stock_applied) {
      for (const item of items) {
        if (item.productId) await PB_Data.adminAdjustStock(item.productId, -(item.quantity || 1));
      }
      await PB_Data.adminSetOrderStockApplied(order.id, true);
      order.stock_applied = true;
      loadProducts();
    } else if (newStatus === 'cancelled' && order.stock_applied) {
      for (const item of items) {
        if (item.productId) await PB_Data.adminAdjustStock(item.productId, item.quantity || 1);
      }
      await PB_Data.adminSetOrderStockApplied(order.id, false);
      order.stock_applied = false;
      loadProducts();
    }
  }

  filterOrderStatus.addEventListener('change', renderOrders);
  btnRefreshOrders.addEventListener('click', loadOrders);

  /* ──────────── METİNLER: SİTE METİNLERİ ──────────── */

  async function loadSiteTexts() {
    siteTextsList.innerHTML = '<div class="loading">Yükleniyor…</div>';
    const texts = await PB_Data.adminGetSiteTexts();
    renderSiteTextsList(texts);
  }

  function renderSiteTextsList(texts) {
    if (!texts.length) {
      siteTextsList.innerHTML = '<div class="empty-state"><p>Henüz site metni yok.</p></div>';
      return;
    }

    siteTextsList.innerHTML = texts.map(t => `
      <div class="text-field-card" data-key="${escapeHtml(t.key)}">
        <label>${escapeHtml(t.label)}</label>
        <textarea class="text-field-input" rows="2">${escapeHtml(t.value)}</textarea>
        <div class="text-field-actions">
          <button type="button" class="btn btn-ghost" data-action="save">KAYDET</button>
          <span class="status-msg" style="display:none;"></span>
        </div>
      </div>
    `).join('');

    siteTextsList.querySelectorAll('.text-field-card').forEach(card => {
      const key = card.dataset.key;
      const textarea = card.querySelector('textarea');
      const saveBtn = card.querySelector('[data-action="save"]');
      const status = card.querySelector('.status-msg');

      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'KAYDEDİLİYOR…';
        const { error } = await PB_Data.adminUpdateSiteText(key, textarea.value.trim());
        saveBtn.disabled = false;
        saveBtn.textContent = 'KAYDET';
        showStatus(status, error ? 'Kaydedilemedi: ' + (error.message || error) : 'Kaydedildi ✓', error ? 'error' : 'success');
      });
    });
  }

  /* ──────────── METİNLER: SAYFA İÇERİKLERİ ──────────── */

  async function loadContentPages() {
    contentPagesList.innerHTML = '<div class="loading">Yükleniyor…</div>';
    const pages = await PB_Data.getAllContentPages();
    renderContentPagesTable(pages);
  }

  function renderContentPagesTable(pages) {
    if (!pages.length) {
      contentPagesList.innerHTML = '<div class="empty-state"><p>Henüz sayfa içeriği yok.</p></div>';
      return;
    }

    const rows = pages.map(p => `
      <tr data-slug="${escapeHtml(p.slug)}">
        <td>
          <div style="font-weight: 500;">${escapeHtml(p.title)}</div>
          <div style="font-size: 11px; color: var(--c-toprak); font-family: ui-monospace, monospace;">${escapeHtml(p.slug)}</div>
        </td>
        <td>${p.blocks.length} blok</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit" title="Düzenle">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                <path d="M2 14 L4 10 L11 3 L13 5 L6 12 Z M11 3 L13 5"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`).join('');

    contentPagesList.innerHTML = `
      <table>
        <thead><tr><th>Sayfa</th><th>İçerik</th><th style="width: 60px;"></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    contentPagesList.querySelectorAll('tbody tr').forEach(tr => {
      tr.style.cursor = 'pointer';
      const open = () => {
        const page = pages.find(p => p.slug === tr.dataset.slug);
        if (page) openContentPageModal(page);
      };
      tr.addEventListener('click', open);
    });
  }

  const BLOCK_TYPE_LABELS = {
    heading: 'Başlık', subheading: 'Alt başlık', paragraph: 'Paragraf',
    list: 'Liste', table: 'Tablo', note: 'Uyarı kutusu'
  };

  function openContentPageModal(page) {
    editingContentPageSlug = page.slug;
    editingBlocks = JSON.parse(JSON.stringify(page.blocks || []));
    hideStatus(contentPageFormStatus);

    contentPageModalTitle.textContent = page.title;
    cpEyebrow.value = page.eyebrow || '';
    cpTitle.value = page.title || '';
    cpMetaText.value = page.metaText || '';

    renderBlocksEditor();
    contentPageModal.classList.add('is-open');
  }

  function closeContentPageModal() {
    contentPageModal.classList.remove('is-open');
    editingContentPageSlug = null;
    editingBlocks = [];
  }

  contentPageModal.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', closeContentPageModal));
  contentPageModal.addEventListener('click', e => { if (e.target === contentPageModal) closeContentPageModal(); });

  function renderBlocksEditor() {
    if (editingBlocks.length === 0) {
      cpBlocksList.innerHTML = '<p style="font-size: 12px; color: var(--c-toprak);">Henüz blok yok — aşağıdan ekle.</p>';
      return;
    }

    cpBlocksList.innerHTML = editingBlocks.map((b, i) => {
      let bodyHtml = '';

      if (b.type === 'heading' || b.type === 'subheading' || b.type === 'paragraph' || b.type === 'note') {
        bodyHtml = `<textarea rows="2" data-field="text">${escapeHtml(b.text || '')}</textarea>`;
      } else if (b.type === 'list') {
        bodyHtml = `
          <label style="font-size:10px; color:var(--c-toprak); display:block; margin-bottom:4px;">Her satır bir madde</label>
          <textarea rows="4" data-field="items">${escapeHtml((b.items || []).join('\n'))}</textarea>
          <label class="field-row-checkbox" style="margin-top:8px;">
            <input type="checkbox" data-field="ordered" ${b.ordered ? 'checked' : ''}>
            <span>Numaralı liste</span>
          </label>`;
      } else if (b.type === 'table') {
        const rowsHtml = (b.rows || []).map((r, ri) => `
          <div class="block-table-row" data-row="${ri}">
            <input type="text" data-field="row-label" placeholder="Etiket" value="${escapeHtml(r[0] || '')}">
            <input type="text" data-field="row-value" placeholder="Değer" value="${escapeHtml(r[1] || '')}">
            <button type="button" data-action="delete-row" title="Satırı sil">✕</button>
          </div>`).join('');
        bodyHtml = `<div data-table-rows>${rowsHtml}</div>
          <button type="button" class="btn btn-ghost" data-action="add-row" style="margin-top:4px; padding: 6px 10px; font-size: 11px;">+ SATIR EKLE</button>`;
      }

      return `
        <div class="block-card" data-index="${i}">
          <div class="block-card-head">
            <span class="block-type-badge">${BLOCK_TYPE_LABELS[b.type] || b.type}</span>
            <div class="block-card-actions">
              <button type="button" data-action="up" title="Yukarı taşı">↑</button>
              <button type="button" data-action="down" title="Aşağı taşı">↓</button>
              <button type="button" data-action="delete" title="Bloğu sil">🗑</button>
            </div>
          </div>
          <div class="block-card-body">${bodyHtml}</div>
        </div>`;
    }).join('');

    // Metin/checkbox alanları — yeniden render tetiklemeden diziyi güncelle
    cpBlocksList.querySelectorAll('.block-card').forEach(card => {
      const i = parseInt(card.dataset.index);
      const block = editingBlocks[i];

      card.querySelectorAll('[data-field="text"]').forEach(el => {
        el.addEventListener('input', () => { block.text = el.value; });
      });
      card.querySelectorAll('[data-field="items"]').forEach(el => {
        el.addEventListener('input', () => {
          block.items = el.value.split('\n').map(s => s.trim()).filter(Boolean);
        });
      });
      card.querySelectorAll('[data-field="ordered"]').forEach(el => {
        el.addEventListener('change', () => { block.ordered = el.checked; });
      });
      card.querySelectorAll('[data-field="row-label"], [data-field="row-value"]').forEach(el => {
        const rowEl = el.closest('[data-row]');
        const ri = parseInt(rowEl.dataset.row);
        const col = el.dataset.field === 'row-label' ? 0 : 1;
        el.addEventListener('input', () => { block.rows[ri][col] = el.value; });
      });

      // Yapısal değişiklikler (taşıma/silme/satır ekle-sil) tüm listeyi yeniden çizer
      card.querySelector('[data-action="up"]').addEventListener('click', () => {
        if (i === 0) return;
        [editingBlocks[i - 1], editingBlocks[i]] = [editingBlocks[i], editingBlocks[i - 1]];
        renderBlocksEditor();
      });
      card.querySelector('[data-action="down"]').addEventListener('click', () => {
        if (i === editingBlocks.length - 1) return;
        [editingBlocks[i], editingBlocks[i + 1]] = [editingBlocks[i + 1], editingBlocks[i]];
        renderBlocksEditor();
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (!confirm('Bu bloğu silmek istediğine emin misin?')) return;
        editingBlocks.splice(i, 1);
        renderBlocksEditor();
      });

      const addRowBtn = card.querySelector('[data-action="add-row"]');
      if (addRowBtn) {
        addRowBtn.addEventListener('click', () => {
          block.rows = block.rows || [];
          block.rows.push(['', '']);
          renderBlocksEditor();
        });
      }
      card.querySelectorAll('[data-action="delete-row"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const ri = parseInt(btn.closest('[data-row]').dataset.row);
          block.rows.splice(ri, 1);
          renderBlocksEditor();
        });
      });
    });
  }

  btnAddBlock.addEventListener('click', () => {
    const type = cpAddBlockType.value;
    const newBlock = { type };
    if (type === 'list') { newBlock.items = []; newBlock.ordered = false; }
    else if (type === 'table') { newBlock.rows = [['', '']]; }
    else { newBlock.text = ''; }
    editingBlocks.push(newBlock);
    renderBlocksEditor();
  });

  btnSaveContentPage.addEventListener('click', async () => {
    if (!contentPageForm.reportValidity()) return;
    btnSaveContentPage.disabled = true;
    btnSaveContentPage.textContent = 'KAYDEDİLİYOR…';

    const { error } = await PB_Data.adminUpdateContentPage(editingContentPageSlug, {
      title: cpTitle.value.trim(),
      eyebrow: cpEyebrow.value.trim(),
      metaText: cpMetaText.value.trim(),
      blocks: editingBlocks
    });

    btnSaveContentPage.disabled = false;
    btnSaveContentPage.textContent = 'KAYDET';

    if (error) {
      showStatus(contentPageFormStatus, 'Kaydedilemedi: ' + (error.message || error), 'error');
      return;
    }

    showStatus(contentPageFormStatus, 'Kaydedildi ✓', 'success');
    setTimeout(() => {
      closeContentPageModal();
      loadContentPages();
    }, 600);
  });

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
