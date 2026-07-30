/**
 * Parla By Aslı — Ürün Helper Fonksiyonları
 *
 * Eskiden: Sabit PRODUCTS array'i + senkron filtreleme
 * Şimdi:   Supabase'den async çekme, in-memory cache
 *
 * Geriye uyumlu API:
 *   await getProducts({ mode, category, featuredOnly })
 *   await getProductBySlug(slug)
 *   formatPrice(price)
 *   CATEGORIES dizisi (sabit, değişmiyor)
 *
 * Eski sabit PRODUCTS array'i artık YOK. Kullandığın yerde await ekle.
 */

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

/**
 * Filtreli ürün listesi getir (async).
 *
 * @param {Object} options
 * @param {string|null} options.category - kategori id'si
 * @param {boolean} options.featuredOnly - sadece featured ürünler
 */
async function getProducts({ category = null, featuredOnly = false } = {}) {
  if (!window.PB_Data) {
    console.warn('PB_Data hazır değil');
    return [];
  }

  const all = await window.PB_Data.getProducts();

  return all.filter(p => {
    if (category && p.category !== category) return false;
    if (featuredOnly && !p.featured) return false;
    return true;
  });
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
