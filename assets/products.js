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
 * @param {string|null} options.mode - 'hep' | 'kol' | 'ozl' | null (hepsi)
 * @param {string|null} options.category - kategori id'si
 * @param {boolean} options.featuredOnly - sadece featured ürünler
 */
async function getProducts({ mode = null, category = null, featuredOnly = false } = {}) {
  if (!window.PB_Data) {
    console.warn('PB_Data hazır değil');
    return [];
  }

  const all = await window.PB_Data.getProducts();

  return all.filter(p => {
    if (mode === 'kol' && p.mode !== 'koleksiyon') return false;
    if (mode === 'ozl' && p.mode !== 'sana-ozel') return false;
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
