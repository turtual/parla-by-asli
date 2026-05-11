/**
 * Parla By Aslı — UI yardımcıları
 *
 * Paylaşılan: modal kontrolü, sepet state'i (localStorage), favoriler.
 * Bu dosya tüm sayfalarda yüklenir, sayfa-özel JS dosyalarından önce.
 */

/* ──────────── Modal kontrolü ──────────── */

const PB_Modal = {
  open(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.removeAttribute('hidden');
    requestAnimationFrame(() => m.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  },
  close(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => m.setAttribute('hidden', ''), 250);
  },
  bind() {
    // [data-modal-open="ID"] ile açılır
    document.querySelectorAll('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        PB_Modal.open(btn.dataset.modalOpen);
      });
    });
    // [data-modal-close] ile veya backdrop'a tıklayınca kapanır
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal || e.target.closest('[data-modal-close]')) {
          PB_Modal.close(modal.id);
        }
      });
    });
    // ESC ile kapan
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.is-open').forEach(m => PB_Modal.close(m.id));
      }
    });
  }
};

/* ──────────── Sepet state (localStorage) ──────────── */

const PB_Cart = {
  KEY: 'pb_cart_v1',

  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  write(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.refreshBadge();
  },

  add(item) {
    // item: { productId, slug, name, price, quantity, image, customization? }
    const items = this.read();
    if (item.customization) {
      // Sana özel ürünler her zaman yeni satır
      items.push({ ...item, lineId: 'L_' + Date.now() });
    } else {
      // Koleksiyon ürünleri varsa adet artır
      const existing = items.find(i => i.productId === item.productId && !i.customization);
      if (existing) existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
      else items.push({ ...item, lineId: 'L_' + Date.now() });
    }
    this.write(items);
  },

  remove(lineId) {
    this.write(this.read().filter(i => i.lineId !== lineId));
  },

  updateQty(lineId, qty) {
    const items = this.read();
    const item = items.find(i => i.lineId === lineId);
    if (item) item.quantity = Math.max(1, qty);
    this.write(items);
  },

  count() {
    return this.read().reduce((sum, i) => sum + (i.quantity || 1), 0);
  },

  total() {
    return this.read().reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
  },

  clear() { this.write([]); },

  refreshBadge() {
    const badges = document.querySelectorAll('[data-cart-count]');
    const c = this.count();
    badges.forEach(b => {
      b.textContent = c;
      b.style.display = c > 0 ? '' : 'none';
    });
  }
};

/* ──────────── Favoriler (localStorage) ──────────── */

const PB_Favs = {
  KEY: 'pb_favs_v1',
  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  write(ids) { localStorage.setItem(this.KEY, JSON.stringify(ids)); },
  toggle(productId) {
    const ids = this.read();
    const idx = ids.indexOf(productId);
    if (idx > -1) ids.splice(idx, 1);
    else ids.push(productId);
    this.write(ids);
    return idx === -1; // yeni eklendi mi
  },
  has(productId) { return this.read().includes(productId); }
};

/* ──────────── Küçük helper'lar ──────────── */

function PB_h(tag, attrs = {}, ...children) {
  // Hızlı element oluşturma
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) el.setAttribute(k, v);
  });
  children.flat().forEach(c => {
    if (c == null || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return el;
}

/* ──────────── Path helper ──────────── */

// Ürün görselleri ve diğer asset'ler için doğru URL döner.
// - http(s):// ile başlıyorsa (Supabase Storage gibi) → olduğu gibi döner
// - Lokal yol ise (assets/img/...) → sayfaya göre prefix ekler
function PB_imgPath(relPath) {
  if (!relPath) return '';
  // Tam URL ise direkt döndür (Supabase Storage)
  if (/^https?:\/\//i.test(relPath) || relPath.startsWith('data:')) {
    return relPath;
  }
  // Lokal yol — sayfa derinliğine göre prefix
  const path = window.location.pathname;
  const isInSubpage = path.includes('/katalog/') || path.includes('/sana-ozel/');
  return isInSubpage ? '../../' + relPath : relPath;
}

/* ──────────── Ürün kartı render (paylaşılan) ──────────── */

function renderProductCard(p, animDelay = 0) {
  const isOzl = p.mode === 'sana-ozel';
  const card = PB_h('button', { class: 'product-card anim-fade-up', 'data-slug': p.slug, style: `animation-delay: ${0.05 * animDelay}s` });

  const imgWrap = PB_h('div', { class: 'product-card-img' });

  // Mod rozeti
  const badge = PB_h('span', { class: 'product-card-badge ' + (isOzl ? 'ozl' : 'kol') }, isOzl ? 'SANA ÖZEL' : 'KOLEKSİYON');

  // Favori butonu
  const favBtn = PB_h('button', {
    class: 'product-card-fav',
    'aria-label': 'Favorilere ekle',
    onclick: e => {
      e.stopPropagation();
      PB_Favs.toggle(p.id);
      favBtn.querySelector('svg').setAttribute('fill', PB_Favs.has(p.id) ? 'currentColor' : 'none');
    }
  });
  const heartFill = PB_Favs.has(p.id) ? 'currentColor' : 'none';
  favBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="${heartFill}" stroke="currentColor" stroke-width="1.2"><path d="M8 13.5s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"/></svg>`;

  // Ürün görseli
  const img = PB_h('img', { src: PB_imgPath(p.image), alt: p.name, loading: 'lazy' });

  imgWrap.append(badge, favBtn, img);

  const info = PB_h('div', { class: 'product-card-info' });
  info.append(
    PB_h('div', { class: 'product-card-name' }, p.name),
    PB_h('div', { class: 'product-card-price' }, isOzl ? formatPrice(p.price) + ' başlangıç' : formatPrice(p.price))
  );

  card.append(imgWrap, info);

  // Tıklama: Koleksiyon → detay modal, Sana özel → stüdyo modal
  card.addEventListener('click', () => {
    if (isOzl) {
      PB_openStudioModal(p.slug);
    } else {
      PB_openProductModal(p.slug);
    }
  });

  return card;
}

/* ──────────── Ürün detay modal (Koleksiyon) ──────────── */

async function PB_openProductModal(slug) {
  const product = (typeof getProductBySlug === 'function') ? await getProductBySlug(slug) : null;
  if (!product) return;

  // Eğer modal HTML'i yoksa (her sayfada otomatik olmaması durumunda) inject et
  let modal = document.getElementById('product-modal');
  if (!modal) {
    modal = PB_buildProductModalShell();
    document.body.appendChild(modal);
  }

  // Modal içeriğini doldur
  PB_fillProductModal(modal, product);

  // Aç
  PB_Modal.open('product-modal');
}

function PB_buildProductModalShell() {
  const modal = PB_h('div', {
    class: 'modal',
    id: 'product-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'product-modal-title',
    hidden: ''
  });

  modal.innerHTML = `
    <div class="modal-card product-modal-card" data-product-modal-card>
      <button class="modal-close" data-modal-close aria-label="Kapat">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 2 L12 12 M12 2 L2 12"/>
        </svg>
      </button>
      <div class="product-modal-body">
        <div class="product-modal-gallery">
          <div class="product-modal-media" data-pm-media></div>
          <div class="product-modal-thumbs" data-pm-thumbs></div>
        </div>
        <div class="product-modal-info">
          <span class="product-modal-badge" data-pm-badge>KOLEKSİYON</span>
          <h2 id="product-modal-title" class="h1" data-pm-title></h2>
          <div class="product-modal-price" data-pm-price></div>
          <p class="product-modal-desc" data-pm-desc></p>
          <div class="product-modal-materials">
            <h4>Malzeme</h4>
            <ul data-pm-materials></ul>
          </div>
          <div class="product-modal-qty">
            <label class="eyebrow">Adet</label>
            <div class="qty-control">
              <button type="button" data-pm-qty-down aria-label="Azalt">−</button>
              <span data-pm-qty>1</span>
              <button type="button" data-pm-qty-up aria-label="Artır">+</button>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-block product-modal-add" data-pm-add>
            SEPETE EKLE
          </button>
          <p class="product-modal-meta">Türkiye'ye ücretsiz kargo · 14 gün iade hakkı</p>
        </div>
      </div>
    </div>
  `;

  // Modal kapatma
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-modal-close]')) {
      PB_Modal.close('product-modal');
    }
  });

  return modal;
}

function PB_fillProductModal(modal, p) {
  // Görsel listesi: p.image her zaman birinci sırada, p.images varsa ek olarak eklenir
  const images = [];
  if (p.image) images.push(p.image);
  if (Array.isArray(p.images)) {
    p.images.forEach(img => {
      if (img && !images.includes(img)) images.push(img);
    });
  }
  if (images.length === 0) images.push('assets/img/products/kolye.svg');

  const media = modal.querySelector('[data-pm-media]');
  const thumbs = modal.querySelector('[data-pm-thumbs]');
  media.innerHTML = '';
  thumbs.innerHTML = '';

  // Ana görsel
  const mainImg = PB_h('img', { src: PB_imgPath(images[0]), alt: p.name });
  media.appendChild(mainImg);

  // Thumbnail strip — her zaman göster (tek görsel olsa bile o görseli işaretler)
  images.forEach((src, i) => {
    const thumb = PB_h('button', {
      type: 'button',
      class: 'product-modal-thumb' + (i === 0 ? ' is-active' : ''),
      'aria-label': `Görsel ${i + 1}`,
      onclick: () => {
        mainImg.src = PB_imgPath(src);
        thumbs.querySelectorAll('.product-modal-thumb').forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      }
    });
    thumb.appendChild(PB_h('img', { src: PB_imgPath(src), alt: '' }));
    thumbs.appendChild(thumb);
  });

  // Doldur
  modal.querySelector('[data-pm-title]').textContent = p.name;
  modal.querySelector('[data-pm-price]').textContent = formatPrice(p.price);
  modal.querySelector('[data-pm-desc]').textContent = p.description || '';

  const matsList = modal.querySelector('[data-pm-materials]');
  matsList.innerHTML = '';
  (p.materials || []).forEach(m => matsList.appendChild(PB_h('li', {}, m)));

  // Adet kontrol
  let qty = 1;
  const qtyEl = modal.querySelector('[data-pm-qty]');
  qtyEl.textContent = qty;
  modal.querySelector('[data-pm-qty-down]').onclick = () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; };
  modal.querySelector('[data-pm-qty-up]').onclick = () => { qty = Math.min(99, qty + 1); qtyEl.textContent = qty; };

  // Sepete ekle
  const addBtn = modal.querySelector('[data-pm-add]');
  addBtn.textContent = 'SEPETE EKLE';
  addBtn.disabled = false;
  addBtn.onclick = () => {
    PB_Cart.add({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      quantity: qty,
      image: p.image
    });
    addBtn.textContent = '✓ SEPETE EKLENDİ';
    addBtn.disabled = true;
    setTimeout(() => {
      PB_Modal.close('product-modal');
    }, 900);
  };
}

/* ──────────── Sepet drawer ──────────── */

const PB_CartDrawer = {
  build() {
    let drawer = document.getElementById('cart-drawer');
    if (drawer) return drawer;

    drawer = PB_h('div', {
      class: 'cart-drawer',
      id: 'cart-drawer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'cart-drawer-title',
      hidden: ''
    });

    drawer.innerHTML = `
      <div class="cart-drawer-overlay" data-cart-close></div>
      <aside class="cart-drawer-panel">
        <header class="cart-drawer-head">
          <h2 id="cart-drawer-title" class="h2">Sepetin</h2>
          <button class="modal-close" data-cart-close aria-label="Kapat">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 2 L12 12 M12 2 L2 12"/>
            </svg>
          </button>
        </header>
        <div class="cart-drawer-body" data-cart-body></div>
        <footer class="cart-drawer-foot" data-cart-foot></footer>
      </aside>
    `;

    drawer.querySelectorAll('[data-cart-close]').forEach(el => {
      el.addEventListener('click', () => PB_CartDrawer.close());
    });

    document.body.appendChild(drawer);
    return drawer;
  },

  open() {
    const drawer = PB_CartDrawer.build();
    PB_CartDrawer.render();
    drawer.removeAttribute('hidden');
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
  },

  close() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => drawer.setAttribute('hidden', ''), 250);
  },

  render() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;

    const body = drawer.querySelector('[data-cart-body]');
    const foot = drawer.querySelector('[data-cart-foot]');
    const items = PB_Cart.read();

    body.innerHTML = '';
    foot.innerHTML = '';

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <p>Sepetin henüz boş.</p>
          <button type="button" class="btn btn-ghost" data-cart-close>Alışverişe başla</button>
        </div>
      `;
      body.querySelector('[data-cart-close]').addEventListener('click', () => PB_CartDrawer.close());
      return;
    }

    // Ürün listesi
    const list = PB_h('ul', { class: 'cart-list' });
    items.forEach(item => {
      const li = PB_h('li', { class: 'cart-item' });

      // Görsel: sana özel ürünün önizlemesi varsa onu göster, yoksa ürün görseli
      let imgSrc;
      if (item.customization?.previewImage) {
        imgSrc = item.customization.previewImage;
      } else {
        imgSrc = PB_imgPath(item.image);
      }

      // Kişiselleştirme özeti
      let customSummary = '';
      if (item.customization) {
        const parts = [];
        if (item.customization.text) parts.push(`"${item.customization.text}"`);
        if (item.customization.fontId) parts.push(`Font: ${item.customization.fontId}`);
        if (item.customization.materialId) parts.push(`Renk: ${item.customization.materialId}`);
        customSummary = parts.join(' · ');
      }

      li.innerHTML = `
        <div class="cart-item-img">
          <img src="${imgSrc}" alt="${item.name}">
          ${item.customization ? '<span class="cart-item-badge">SANA ÖZEL</span>' : ''}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          ${customSummary ? `<div class="cart-item-custom">${customSummary}</div>` : ''}
          <div class="cart-item-bottom">
            ${item.customization ? `
              <span class="cart-item-qty-static">${item.quantity || 1} adet</span>
            ` : `
              <div class="qty-control qty-control-sm">
                <button type="button" data-qty-down aria-label="Azalt">−</button>
                <span data-qty>${item.quantity || 1}</span>
                <button type="button" data-qty-up aria-label="Artır">+</button>
              </div>
            `}
            <span class="cart-item-price">${formatPrice(item.price * (item.quantity || 1))}</span>
          </div>
        </div>
        <button type="button" class="cart-item-remove" data-remove aria-label="Kaldır">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 2 L12 12 M12 2 L2 12"/>
          </svg>
        </button>
      `;

      // Adet kontrolü (sadece koleksiyon)
      if (!item.customization) {
        li.querySelector('[data-qty-down]').addEventListener('click', () => {
          const newQty = Math.max(1, (item.quantity || 1) - 1);
          PB_Cart.updateQty(item.lineId, newQty);
          PB_CartDrawer.render();
        });
        li.querySelector('[data-qty-up]').addEventListener('click', () => {
          const newQty = Math.min(99, (item.quantity || 1) + 1);
          PB_Cart.updateQty(item.lineId, newQty);
          PB_CartDrawer.render();
        });
      }

      // Kaldırma
      li.querySelector('[data-remove]').addEventListener('click', () => {
        PB_Cart.remove(item.lineId);
        PB_CartDrawer.render();
      });

      list.appendChild(li);
    });
    body.appendChild(list);

    // Footer: toplam + checkout
    const total = PB_Cart.total();
    foot.innerHTML = `
      <div class="cart-totals">
        <span>Ara toplam</span>
        <span class="cart-total-price">${formatPrice(total)}</span>
      </div>
      <p class="cart-shipping-note">${total >= 500 ? '✓ Ücretsiz kargo' : `Kargo ücretsiz olması için: ${formatPrice(500 - total)} daha`}</p>
      <a href="${PB_imgPath('odeme/index.html')}" class="btn btn-bakir btn-block">SİPARİŞİ TAMAMLA</a>
      <button type="button" class="btn btn-ghost btn-block" data-cart-close>Alışverişe devam</button>
    `;
    foot.querySelector('[data-cart-close]').addEventListener('click', () => PB_CartDrawer.close());
  },

  bindHeaderTrigger() {
    document.querySelectorAll('a[aria-label="Sepetim"]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        PB_CartDrawer.open();
      });
    });
  }
};

/* ──────────── İlk yükleme ──────────── */

document.addEventListener('DOMContentLoaded', () => {
  PB_Modal.bind();
  PB_Cart.refreshBadge();
  PB_CartDrawer.bindHeaderTrigger();

  // Sepet'e ekleyince drawer'ı yenile (zaten açıksa güncellensin)
  const origAdd = PB_Cart.add.bind(PB_Cart);
  PB_Cart.add = function(item) {
    origAdd(item);
    if (document.getElementById('cart-drawer')?.classList.contains('is-open')) {
      PB_CartDrawer.render();
    }
  };

  // ESC ile sepet kapansın
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('cart-drawer');
      if (drawer && drawer.classList.contains('is-open')) {
        PB_CartDrawer.close();
      }
    }
  });
});
