/**
 * Parla By Aslı — UI yardımcıları
 *
 * Paylaşılan: modal kontrolü, sepet state'i (localStorage), favoriler.
 * Bu dosya tüm sayfalarda yüklenir, sayfa-özel JS dosyalarından önce.
 */

/* ──────────── Modal kontrolü ──────────── */

/* Modal açılmadan önce odakta olan öğe — kapanınca oraya dönülür */
const PB_ModalOncekiOdak = new WeakMap();

const PB_ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function PB_odaklanabilirler(kok) {
  return [...kok.querySelectorAll(PB_ODAKLANABILIR)]
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

const PB_Modal = {
  open(id) {
    const m = document.getElementById(id);
    if (!m) return;

    // Kapanışta geri dönmek için odağı hatırla
    PB_ModalOncekiOdak.set(m, document.activeElement);

    m.removeAttribute('hidden');

    // Reflow'u zorla: geçişin başlangıç durumu sabitlensin, sonra sınıfı ekle.
    // Önceden bu requestAnimationFrame içindeydi; sekme arka plandayken rAF
    // çalışmadığı için modal görünmeden açık kalabiliyordu.
    void m.offsetWidth;
    m.classList.add('is-open');

    // Odağı modalın içine al. Önce anlamlı bir kontrol (metin alanı),
    // yoksa ilk odaklanabilir öğe, o da yoksa modalın kendisi.
    const hedef =
      m.querySelector('input:not([type=hidden]):not([disabled]), textarea') ||
      PB_odaklanabilirler(m)[0] ||
      m;
    if (hedef === m) m.tabIndex = -1;
    hedef.focus({ preventScroll: true });

    document.body.style.overflow = 'hidden';
  },
  close(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => m.setAttribute('hidden', ''), 250);

    // Odağı modalı açan öğeye geri ver — yoksa klavye kullanıcısı
    // sayfanın en başına düşer ve yerini kaybeder
    const onceki = PB_ModalOncekiOdak.get(m);
    if (onceki && document.contains(onceki)) {
      onceki.focus({ preventScroll: true });
    }
    PB_ModalOncekiOdak.delete(m);
  },

  /**
   * Tab'ı modal içinde tutar. Aksi hâlde odak arkadaki sayfaya kaçıyor
   * ve kullanıcı görmediği bağlantılar arasında geziniyordu.
   */
  odagiHapset(e) {
    if (e.key !== 'Tab') return;
    const acik = document.querySelector('.modal.is-open, .cart-drawer.is-open');
    if (!acik) return;

    const ogeler = PB_odaklanabilirler(acik);
    if (ogeler.length === 0) return;

    const ilk = ogeler[0];
    const son = ogeler[ogeler.length - 1];

    if (e.shiftKey && document.activeElement === ilk) {
      e.preventDefault();
      son.focus();
    } else if (!e.shiftKey && document.activeElement === son) {
      e.preventDefault();
      ilk.focus();
    } else if (!acik.contains(document.activeElement)) {
      e.preventDefault();
      ilk.focus();
    }
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

    // Tab açık modalın dışına çıkmasın
    document.addEventListener('keydown', PB_Modal.odagiHapset);
  }
};

/* ──────────── Sepet state (localStorage) ──────────── */

const PB_Cart = {
  /*
   * v2: kişiye özel tasarım stüdyosu kaldırıldı. v1 sepetlerinde artık
   * üretilmeyen kişiselleştirilmiş kalemler olabilir; anahtarı yükseltmek
   * onları düşürüyor. Sipariş edilemeyecek bir kalemi sepette tutmak,
   * müşteriyi ödeme adımında çıkmaz sokağa sokardı.
   */
  KEY: 'pb_cart_v2',

  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  write(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.refreshBadge();
  },

  add(item) {
    // item: { productId, slug, name, price, quantity, image }
    const items = this.read();
    const existing = items.find(i => i.productId === item.productId);
    if (existing) existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
    else items.push({ ...item, lineId: 'L_' + Date.now() });
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
  write(ids) {
    localStorage.setItem(this.KEY, JSON.stringify(ids));
    this.refreshBadge();
  },
  toggle(productId) {
    const ids = this.read();
    const idx = ids.indexOf(productId);
    if (idx > -1) ids.splice(idx, 1);
    else ids.push(productId);
    this.write(ids);
    return idx === -1; // yeni eklendi mi
  },
  has(productId) { return this.read().includes(productId); },
  count() { return this.read().length; },

  refreshBadge() {
    const c = this.count();
    document.querySelectorAll('[data-fav-count]').forEach(b => {
      b.textContent = c;
      b.style.display = c > 0 ? '' : 'none';
    });
  }
};

/* ──────────── Küçük helper'lar ──────────── */

/**
 * Metni HTML'e gömülmeye güvenli hâle getirir.
 *
 * PB_h metin düğümü kullandığı için zaten güvenli; bu yardımcı, elle
 * innerHTML şablonu kuran yerler için. Hem metin içeriği hem de çift
 * tırnaklı attribute değeri için yeterli.
 */
function PB_escape(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  const isInSubpage = path.includes('/katalog/');
  return isInSubpage ? '../../' + relPath : relPath;
}

/* ──────────── Ürün kartı render (paylaşılan) ──────────── */

/*
 * Ürün kartı.
 *
 * Yapı neden böyle: önceden kartın kendisi <button> idi ve favori butonu
 * onun İÇİNDE duruyordu. İç içe buton geçersiz HTML; tarayıcılar bunu
 * tahmin edilemez şekilde ele alır ve ekran okuyucular iç butonu hiç
 * duyurmayabilir. Şimdi kart bir <article>, tıklanabilir alan ayrı bir
 * <button>, favori butonu ise onun kardeşi.
 */
function renderProductCard(p, animDelay = 0) {
  const card = PB_h('article', {
    class: 'product-card anim-fade-up',
    'data-slug': p.slug,
    style: `animation-delay: ${0.05 * animDelay}s`
  });

  // Asıl tıklanabilir alan: görsel + bilgi
  const openBtn = PB_h('button', {
    type: 'button',
    class: 'product-card-open',
    onclick: () => PB_openProductModal(p.slug)
  });

  const imgWrap = PB_h('div', { class: 'product-card-img' });
  const img = PB_h('img', { src: PB_imgPath(p.image), alt: p.name, loading: 'lazy' });
  imgWrap.append(img);

  const info = PB_h('div', { class: 'product-card-info' });
  info.append(
    PB_h('div', { class: 'product-card-name' }, p.name),
    PB_h('div', { class: 'product-card-price' }, formatPrice(p.price))
  );

  openBtn.append(imgWrap, info);

  // Favori butonu — kartın kardeşi, görselin üstüne konumlanır
  const favBtn = PB_h('button', {
    type: 'button',
    class: 'product-card-fav',
    'aria-pressed': PB_Favs.has(p.id) ? 'true' : 'false',
    'aria-label': p.name + ' — favorilere ekle',
    onclick: () => {
      PB_Favs.toggle(p.id);
      const secili = PB_Favs.has(p.id);
      favBtn.setAttribute('aria-pressed', secili ? 'true' : 'false');
      favBtn.querySelector('svg').setAttribute('fill', secili ? 'currentColor' : 'none');
    }
  });
  const heartFill = PB_Favs.has(p.id) ? 'currentColor' : 'none';
  favBtn.innerHTML = `<svg viewBox="0 0 16 16" fill="${heartFill}" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M8 13.5s-5-3-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 4-5 7-5 7z"/></svg>`;

  card.append(openBtn, favBtn);

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
          <p class="product-modal-meta">
            Türkiye'ye ücretsiz kargo ·
            <a href="${PB_imgPath('yasal/iade-iptal/')}" target="_blank" rel="noopener">14 gün iade hakkı</a>
          </p>
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
    PB_ModalOncekiOdak.set(drawer, document.activeElement);

    drawer.removeAttribute('hidden');
    void drawer.offsetWidth;              // reflow — geçiş animasyonu için
    drawer.classList.add('is-open');

    const hedef = PB_odaklanabilirler(drawer)[0];
    if (hedef) hedef.focus({ preventScroll: true });

    document.body.style.overflow = 'hidden';
  },

  close() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => drawer.setAttribute('hidden', ''), 250);

    const onceki = PB_ModalOncekiOdak.get(drawer);
    if (onceki && document.contains(onceki)) onceki.focus({ preventScroll: true });
    PB_ModalOncekiOdak.delete(drawer);
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

      li.innerHTML = `
        <div class="cart-item-img">
          <img src="${PB_escape(PB_imgPath(item.image))}" alt="${PB_escape(item.name)}">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${PB_escape(item.name)}</div>
          <div class="cart-item-bottom">
            <div class="qty-control qty-control-sm">
              <button type="button" data-qty-down aria-label="Azalt">−</button>
              <span data-qty>${item.quantity || 1}</span>
              <button type="button" data-qty-up aria-label="Artır">+</button>
            </div>
            <span class="cart-item-price">${formatPrice(item.price * (item.quantity || 1))}</span>
          </div>
        </div>
        <button type="button" class="cart-item-remove" data-remove aria-label="${PB_escape(item.name)} — sepetten kaldır">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M2 2 L12 12 M12 2 L2 12"/>
          </svg>
        </button>
      `;

      li.querySelector('[data-qty-down]').addEventListener('click', () => {
        PB_Cart.updateQty(item.lineId, Math.max(1, (item.quantity || 1) - 1));
        PB_CartDrawer.render();
      });
      li.querySelector('[data-qty-up]').addEventListener('click', () => {
        PB_Cart.updateQty(item.lineId, Math.min(99, (item.quantity || 1) + 1));
        PB_CartDrawer.render();
      });

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
    // Seçici etikete bağlı değil: sepet ikonu <a href="#"> iken <button>'a
    // çevrildi, bağlama bundan etkilenmemeli.
    document.querySelectorAll('[aria-label="Sepetim"]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        PB_CartDrawer.open();
      });
    });
  }
};

/* ──────────── Favoriler çekmecesi ────────────
 *
 * Başlıktaki kalp ikonu hiçbir şey yapmıyordu: kartlardaki kalplerle
 * favori eklenebiliyor ama eklenenleri görecek bir yer yoktu. Tıklayıp
 * hiçbir şey olmaması siteyi yarım gösteriyordu.
 */

const PB_FavDrawer = {
  build() {
    let drawer = document.getElementById('fav-drawer');
    if (drawer) return drawer;

    drawer = PB_h('div', {
      class: 'cart-drawer',
      id: 'fav-drawer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Favorilerim',
      hidden: ''
    });

    drawer.innerHTML = `
      <div class="cart-drawer-overlay" data-fav-close></div>
      <aside class="cart-drawer-panel">
        <header class="cart-drawer-head">
          <h2 class="h2">Favorilerim</h2>
          <button class="modal-close" data-fav-close aria-label="Kapat">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 2 L12 12 M12 2 L2 12"/>
            </svg>
          </button>
        </header>
        <div class="cart-drawer-body" data-fav-body></div>
      </aside>
    `;

    drawer.querySelectorAll('[data-fav-close]').forEach(el => {
      el.addEventListener('click', () => PB_FavDrawer.close());
    });

    document.body.appendChild(drawer);
    return drawer;
  },

  async open() {
    const drawer = PB_FavDrawer.build();
    PB_ModalOncekiOdak.set(drawer, document.activeElement);

    drawer.removeAttribute('hidden');
    void drawer.offsetWidth;
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    const ilk = PB_odaklanabilirler(drawer)[0];
    if (ilk) ilk.focus({ preventScroll: true });

    await PB_FavDrawer.render();
  },

  close() {
    const drawer = document.getElementById('fav-drawer');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => drawer.setAttribute('hidden', ''), 250);

    const onceki = PB_ModalOncekiOdak.get(drawer);
    if (onceki && document.contains(onceki)) onceki.focus({ preventScroll: true });
    PB_ModalOncekiOdak.delete(drawer);
  },

  async render() {
    const drawer = document.getElementById('fav-drawer');
    if (!drawer) return;
    const body = drawer.querySelector('[data-fav-body]');
    const ids = PB_Favs.read();

    if (ids.length === 0) {
      body.replaceChildren(PB_h('div', { class: 'cart-empty' },
        PB_h('p', {}, 'Henüz favorin yok.'),
        PB_h('p', { style: 'font-size:12px; margin-top:6px;' },
          'Beğendiğin ürünlerin sağ üst köşesindeki kalbe dokun.'),
        PB_h('button', {
          type: 'button', class: 'btn btn-ghost',
          onclick: () => PB_FavDrawer.close()
        }, 'Alışverişe başla')
      ));
      return;
    }

    body.replaceChildren(PB_h('div', { class: 'cart-loading' }, 'Yükleniyor…'));

    const tumu = (typeof getProducts === 'function') ? await getProducts({}) : [];
    const secilenler = ids.map(id => tumu.find(p => p.id === id)).filter(Boolean);

    // Ürün silinmiş veya pasife alınmışsa favoriden de düşsün, yoksa
    // liste sessizce eksik görünür
    if (secilenler.length !== ids.length) {
      PB_Favs.write(secilenler.map(p => p.id));
    }

    if (secilenler.length === 0) {
      body.replaceChildren(PB_h('div', { class: 'cart-empty' },
        PB_h('p', {}, 'Favorilerindeki ürünler artık mevcut değil.')));
      return;
    }

    const liste = PB_h('div', { class: 'fav-grid' });
    secilenler.forEach((p, i) => liste.append(renderProductCard(p, i)));
    body.replaceChildren(liste);
  },

  bindHeaderTrigger() {
    document.querySelectorAll('[aria-label="Favorilerim"]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        PB_FavDrawer.open();
      });
    });
  }
};

/* ──────────── İlk yükleme ──────────── */

document.addEventListener('DOMContentLoaded', () => {
  PB_Modal.bind();
  PB_Cart.refreshBadge();
  PB_Favs.refreshBadge();
  PB_CartDrawer.bindHeaderTrigger();
  PB_FavDrawer.bindHeaderTrigger();

  // Sepet'e ekleyince drawer'ı yenile (zaten açıksa güncellensin)
  const origAdd = PB_Cart.add.bind(PB_Cart);
  PB_Cart.add = function(item) {
    origAdd(item);
    if (document.getElementById('cart-drawer')?.classList.contains('is-open')) {
      PB_CartDrawer.render();
    }
  };

  // ESC ile sepet veya favoriler kapansın
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const sepet = document.getElementById('cart-drawer');
    if (sepet && sepet.classList.contains('is-open')) PB_CartDrawer.close();
    const fav = document.getElementById('fav-drawer');
    if (fav && fav.classList.contains('is-open')) PB_FavDrawer.close();
  });

  // Kalp durumu değişince açık favori çekmecesi güncellensin
  const origToggle = PB_Favs.toggle.bind(PB_Favs);
  PB_Favs.toggle = function (id) {
    const sonuc = origToggle(id);
    const fav = document.getElementById('fav-drawer');
    if (fav && fav.classList.contains('is-open')) PB_FavDrawer.render();
    return sonuc;
  };
});
