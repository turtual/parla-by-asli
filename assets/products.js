/**
 * Parla By Aslı — Ürün Helper Fonksiyonları
 *
 * Eskiden: Sabit PRODUCTS array'i + senkron filtreleme
 * Şimdi:   Supabase'den async çekme, in-memory cache
 *
 * Kategoriler de artık kodda sabit değil: koleksiyon (üst, malzeme bazlı)
 * ve ürün tipi (alt segment) ikisi de admin panelinden yönetiliyor ve
 * Supabase'den çekiliyor. Eski sabit `CATEGORIES` dizisi kaldırıldı —
 * yerine await getProductTypes() kullan.
 *
 * Geriye uyumlu API:
 *   await getProducts({ category, collectionId, featuredOnly })
 *   await getProductBySlug(slug)
 *   await getProductTypes()
 *   await getCollections()
 *   formatPrice(price)
 */

/**
 * Filtreli ürün listesi getir (async).
 *
 * @param {Object} options
 * @param {string|null} options.category - ürün tipi slug'ı (alt segment)
 * @param {string|null} options.collectionId - koleksiyon id'si (üst kategori)
 * @param {boolean} options.featuredOnly - sadece featured ürünler
 */
async function getProducts({ category = null, collectionId = null, featuredOnly = false } = {}) {
  if (!window.PB_Data) {
    console.warn('PB_Data hazır değil');
    return [];
  }

  const all = await window.PB_Data.getProducts();
  pbYeniIdleriHesapla(all);

  return all.filter(p => {
    if (category && p.category !== category) return false;
    if (collectionId && !productInCollection(p, collectionId)) return false;
    if (featuredOnly && !p.featured) return false;
    return true;
  });
}

/**
 * Ürün bu koleksiyonda görünüyor mu?
 *
 * Bir ürün birden fazla koleksiyonda olabilir (ör. ametist bir küpe hem
 * "Ametist Koleksiyonu"nda hem "Doğal Taş Koleksiyonu"nda). collectionId
 * ana koleksiyon, collectionIds ise göründüğü tüm koleksiyonlar.
 */
function productInCollection(p, collectionId) {
  if (!collectionId) return true;
  if (p.collectionId === collectionId) return true;
  return (p.collectionIds || []).indexOf(collectionId) !== -1;
}

/**
 * Ürün "yeni" sayılıyor mu — kartta YENİ rozeti bunun için çıkıyor.
 *
 * İki koşul birlikte: son 30 günde eklenmiş OLACAK ve en son eklenen
 * PB_YENI_ADET ürün arasında olacak. İkinci koşul, mağazaya toplu ürün
 * girildiğinde her kartın "YENİ" rozetiyle dolup rozetin anlamını
 * yitirmesini engelliyor.
 */
const PB_YENI_GUN = 30;
const PB_YENI_ADET = 6;

let pbYeniIdler = null; // getProducts her çağrıldığında tazeleniyor

function pbYeniIdleriHesapla(all) {
  const sinir = Date.now() - PB_YENI_GUN * 24 * 60 * 60 * 1000;
  pbYeniIdler = new Set(
    all
      .filter(p => p.createdAt && new Date(p.createdAt).getTime() >= sinir)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, PB_YENI_ADET)
      .map(p => p.id)
  );
}

function isNewProduct(p) {
  if (!p || !pbYeniIdler) return false;
  return pbYeniIdler.has(p.id);
}

/**
 * Vitrin sıralaması: önce öne çıkanlar (⭐), sonra panelde sürükleyerek
 * verilen sıra. Panelde yeni eklenen ürün listenin başına geldiği için
 * yeni ürünler de doğal olarak üstte çıkıyor.
 */
function sortForDisplay(products) {
  return products.slice().sort((a, b) => {
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
}

/** Ürün tipi listesini getir (async) — eski sabit CATEGORIES'in yerine geçti. */
async function getProductTypes() {
  if (!window.PB_Data) return [];
  return await window.PB_Data.getProductTypes();
}

/** Koleksiyon listesini getir (async). */
async function getCollections() {
  if (!window.PB_Data) return [];
  return await window.PB_Data.getCollections();
}

/** Slug'a göre tek bir koleksiyon getir (async). */
async function getCollectionBySlug(slug) {
  if (!window.PB_Data) return null;
  return await window.PB_Data.getCollectionBySlug(slug);
}

async function getProductBySlug(slug) {
  if (!window.PB_Data) return null;
  return await window.PB_Data.getProductBySlug(slug);
}

async function getProductById(id) {
  if (!window.PB_Data) return null;
  return await window.PB_Data.getProductById(id);
}

function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR').format(price) + ' ₺';
}

/**
 * Ürün ızgarası boş kaldığında içine uygun mesajı basar.
 *
 * Üç ayrı durum var ve bunları karıştırmak pahalıya patlıyor:
 *   - Veritabanına ulaşılamadı  → arıza. Ziyaretçiye söyle, tekrar deneme sun.
 *   - Filtreye uyan ürün yok    → normal, filtreyi gevşetmesi gerek.
 *   - Gerçekten hiç ürün yok    → normal.
 *
 * Önceden üçü de "Henüz ürün yok." diyordu; backend düştüğünde mağaza
 * bomboş ama kasıtlı görünüyordu ve kimse durumu fark etmiyordu.
 *
 * @param {HTMLElement} grid - içi temizlenip mesajın basılacağı ızgara
 * @param {Object} options
 * @param {boolean} options.filtered - kullanıcının aktif bir filtresi var mı
 */
function renderEmptyGridState(grid, { filtered = false } = {}) {
  const loadError = window.PB_Data && window.PB_Data.getLastError
    ? window.PB_Data.getLastError()
    : null;

  const wrap = document.createElement('div');
  wrap.className = 'grid-empty-state';
  wrap.style.cssText = 'grid-column: 1/-1; text-align: center; padding: var(--space-xl) 0; color: var(--c-toprak); font-size: 14px;';

  if (loadError) {
    wrap.setAttribute('role', 'alert');

    const msg = document.createElement('p');
    msg.textContent = 'Ürünler şu anda yüklenemiyor. Bağlantı sorunu olabilir.';
    msg.style.marginBottom = '12px';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-ghost';
    retry.textContent = 'TEKRAR DENE';
    retry.addEventListener('click', () => window.location.reload());

    wrap.append(msg, retry);
  } else {
    const msg = document.createElement('p');
    msg.textContent = filtered
      ? 'Bu filtreye uyan ürün bulunamadı.'
      : 'Henüz ürün yok.';
    wrap.append(msg);
  }

  grid.replaceChildren(wrap);
}

/**
 * Ürün görselinin tam URL'sini döner.
 * Supabase Storage URL'leri zaten tam URL, dokunulmaz.
 * Eski lokal yollar (assets/img/products/...) için PB_imgPath helper'ı kullanılır.
 */
function getProductImageUrl(imagePath) {
  if (!imagePath) return 'assets/img/products/kolye.svg';
  // Supabase storage URL'si zaten http ile başlar
  if (imagePath.startsWith('http')) return imagePath;
  // Lokal yol — sayfaya göre prefix gerek
  return imagePath;
}
