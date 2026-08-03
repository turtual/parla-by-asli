/**
 * Parla By Aslı — Supabase Data Layer
 *
 * Bu dosya hem ana site hem admin panel tarafından kullanılır.
 * Tek noktadan veri çekme + cache yönetimi.
 *
 * BAĞIMLILIK: Supabase JS SDK (CDN üzerinden index.html'de yüklenir)
 *
 * Kullanım:
 *   await PB_Data.init();
 *   const products = await PB_Data.getProducts();
 *   const product = await PB_Data.getProductBySlug('isimli-kolye');
 */

(function (window) {
  'use strict';

  // Supabase config — public bilgiler, frontend'de kullanılması güvenli
  const SUPABASE_URL = 'https://fgbsbkttzeirsasgfdob.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnYnNia3R0emVpcnNhc2dmZG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjU2NDQsImV4cCI6MjA5MzY0MTY0NH0.8vbWG0yzCjGZT9TFvsvv0R8G478yu9Y5r6LKFEvzQoQ';

  let supabase = null;
  let productsCache = null;
  let productsCacheTime = 0;
  let collectionsCache = null;
  let collectionsCacheTime = 0;
  let productTypesCache = null;
  let productTypesCacheTime = 0;
  let siteTextsCache = null;
  let siteTextsCacheTime = 0;
  let contentPagesCache = {}; // slug -> { data, time }
  const CACHE_TTL = 60 * 1000; // 1 dakika cache (admin panelden değişiklik olabileceği için kısa)

  // Son ürün çekme denemesi başarısız olduysa buraya yazılır.
  // Boş liste dönmek "ürün yok" ile "bağlanamadım"ı aynı gösteriyordu; sayfalar
  // ikisini ayırt edebilsin diye tutuluyor. Başarılı her çekimde temizlenir.
  let lastLoadError = null;

  /**
   * Supabase client'ı başlat. window.supabase global'i SDK CDN'inden gelir.
   */
  function init() {
    if (supabase) return supabase;
    if (!window.supabase) {
      console.error('Supabase SDK yüklenmedi. CDN script tagi eksik olabilir.');
      return null;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  }

  /**
   * DB row'unu site formatına dönüştür.
   * SQL kolon isimleri zaten products.js formatına uyumlu, sadece direkt geçiriyoruz.
   */
  function rowToProduct(row) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      collectionId: row.collection_id,
      mode: row.mode,
      price: row.price,
      description: row.description || '',
      materials: row.materials || [],
      image: row.image || 'assets/img/products/kolye.svg',
      images: row.images || [],
      featured: !!row.featured,
      customizable: !!row.customizable,
      customization: row.customization || null,
      isActive: row.is_active !== false,
      displayOrder: row.display_order || 0,
      stockQuantity: row.stock_quantity ?? 0
    };
  }

  function rowToCollection(row) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      image: row.image || null,
      isActive: row.is_active !== false,
      displayOrder: row.display_order || 0,
      careInstructions: row.care_instructions || '',
      returnTerms: row.return_terms || ''
    };
  }

  function rowToProductType(row) {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      isActive: row.is_active !== false,
      displayOrder: row.display_order || 0
    };
  }

  function rowToContentPage(row) {
    return {
      slug: row.slug,
      title: row.title,
      eyebrow: row.eyebrow || '',
      metaText: row.meta_text || '',
      blocks: row.blocks || []
    };
  }

  /**
   * Tüm aktif ürünleri çek (cache'li).
   * Admin için includeInactive=true ile inaktifler de gelir.
   */
  async function getProducts(options = {}) {
    const includeInactive = options.includeInactive || false;
    const forceFresh = options.forceFresh || false;

    // Cache kontrol
    if (!forceFresh && !includeInactive && productsCache &&
        (Date.now() - productsCacheTime) < CACHE_TTL) {
      return productsCache;
    }

    if (!supabase) init();
    if (!supabase) {
      lastLoadError = new Error('Supabase SDK yüklenemedi');
      return [];
    }

    let query = supabase.from('products').select('*').order('display_order', { ascending: true });
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    let data, error;
    try {
      ({ data, error } = await query);
    } catch (err) {
      // Ağ tamamen kopuksa (proje duraklatılmış, DNS yok) SDK istisna fırlatabilir
      error = err;
    }

    if (error) {
      console.error('Ürünler çekilemedi:', error);
      lastLoadError = error;
      return productsCache || [];
    }

    lastLoadError = null;
    const products = data.map(rowToProduct);

    if (!includeInactive) {
      productsCache = products;
      productsCacheTime = Date.now();
    }

    return products;
  }

  async function getProductBySlug(slug) {
    if (!supabase) init();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    return rowToProduct(data);
  }

  async function getProductById(id) {
    if (!supabase) init();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToProduct(data);
  }

  /**
   * Cache'i temizle (admin panelden değişiklik sonrası).
   */
  function invalidateCache() {
    productsCache = null;
    productsCacheTime = 0;
  }

  function invalidateCollectionsCache() {
    collectionsCache = null;
    collectionsCacheTime = 0;
  }

  function invalidateProductTypesCache() {
    productTypesCache = null;
    productTypesCacheTime = 0;
  }

  /* ──────────── KOLEKSİYONLAR (üst kategori — malzeme bazlı) ──────────── */

  /**
   * Tüm aktif koleksiyonları çek (cache'li).
   * Admin için includeInactive=true ile inaktifler de gelir.
   */
  async function getCollections(options = {}) {
    const includeInactive = options.includeInactive || false;
    const forceFresh = options.forceFresh || false;

    if (!forceFresh && !includeInactive && collectionsCache &&
        (Date.now() - collectionsCacheTime) < CACHE_TTL) {
      return collectionsCache;
    }

    if (!supabase) init();
    if (!supabase) return [];

    let query = supabase.from('collections').select('*').order('display_order', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
      console.error('Koleksiyonlar çekilemedi:', error);
      return collectionsCache || [];
    }

    const collections = data.map(rowToCollection);
    if (!includeInactive) {
      collectionsCache = collections;
      collectionsCacheTime = Date.now();
    }
    return collections;
  }

  async function getCollectionBySlug(slug) {
    if (!supabase) init();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    return rowToCollection(data);
  }

  /* ──────────── ÜRÜN TİPLERİ (alt segment) ──────────── */

  async function getProductTypes(options = {}) {
    const includeInactive = options.includeInactive || false;
    const forceFresh = options.forceFresh || false;

    if (!forceFresh && !includeInactive && productTypesCache &&
        (Date.now() - productTypesCacheTime) < CACHE_TTL) {
      return productTypesCache;
    }

    if (!supabase) init();
    if (!supabase) return [];

    let query = supabase.from('product_types').select('*').order('display_order', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
      console.error('Ürün tipleri çekilemedi:', error);
      return productTypesCache || [];
    }

    const types = data.map(rowToProductType);
    if (!includeInactive) {
      productTypesCache = types;
      productTypesCacheTime = Date.now();
    }
    return types;
  }

  /**
   * Son ürün çekme denemesi başarısız olduysa hatayı döner, başarılıysa null.
   * Sayfalar "hiç ürün yok" ile "veritabanına ulaşılamadı"yı ayırmak için kullanır.
   */
  function getLastError() {
    return lastLoadError;
  }

  /* ──────────── SİTE METİNLERİ (anasayfa hero/hikâye/footer vb.) ──────────── */

  /** Tüm site metinlerini {key: value} sözlüğü olarak döner (cache'li). */
  async function getSiteTexts() {
    if (siteTextsCache && (Date.now() - siteTextsCacheTime) < CACHE_TTL) {
      return siteTextsCache;
    }

    if (!supabase) init();
    if (!supabase) return siteTextsCache || {};

    const { data, error } = await supabase.from('site_texts').select('*');
    if (error) {
      console.error('Site metinleri çekilemedi:', error);
      return siteTextsCache || {};
    }

    const map = {};
    data.forEach(row => { map[row.key] = row.value; });
    siteTextsCache = map;
    siteTextsCacheTime = Date.now();
    return map;
  }

  async function getSiteText(key) {
    const texts = await getSiteTexts();
    return texts[key] || '';
  }

  /* ──────────── SAYFA İÇERİKLERİ (SSS, İletişim, yasal metinler) ──────────── */

  /** Tek bir içerik sayfasını slug'a göre çeker (cache'li). */
  async function getContentPage(slug) {
    const cached = contentPagesCache[slug];
    if (cached && (Date.now() - cached.time) < CACHE_TTL) {
      return cached.data;
    }

    if (!supabase) init();
    if (!supabase) return cached?.data || null;

    const { data, error } = await supabase
      .from('content_pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) {
      console.error('İçerik sayfası çekilemedi:', slug, error);
      return cached?.data || null;
    }

    const page = rowToContentPage(data);
    contentPagesCache[slug] = { data: page, time: Date.now() };
    return page;
  }

  /** Admin "Metinler" listesi için tüm sayfaları tek seferde çeker (cache'siz — az sayıda kayıt). */
  async function getAllContentPages() {
    if (!supabase) init();
    if (!supabase) return [];

    const { data, error } = await supabase.from('content_pages').select('*').order('slug');
    if (error) {
      console.error('İçerik sayfaları çekilemedi:', error);
      return [];
    }
    return data.map(rowToContentPage);
  }

  /** Admin "Metinler" listesi için site metinlerini label'larıyla birlikte döner. */
  async function adminGetSiteTexts() {
    if (!supabase) init();
    if (!supabase) return [];

    const { data, error } = await supabase.from('site_texts').select('*').order('key');
    if (error) {
      console.error('Site metinleri çekilemedi:', error);
      return [];
    }
    return data;
  }

  /* ──────────── SİPARİŞ ──────────── */

  /**
   * Yeni sipariş kaydet (checkout sayfası kullanır).
   * Formspree'ye paralel olarak Supabase'e de yazıyoruz, böylece admin panelden görünür.
   */
  async function createOrder(orderData) {
    if (!supabase) init();
    if (!supabase) return { error: 'supabase_not_ready' };

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        order_code: orderData.orderCode,
        customer_name: orderData.name,
        customer_email: orderData.email,
        customer_phone: orderData.phone,
        shipping_address: orderData.address,
        shipping_city: orderData.city,
        customer_note: orderData.note || null,
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping_fee: orderData.shippingFee || 0,
        total: orderData.total
      }])
      .select()
      .single();

    if (error) {
      console.error('Sipariş kaydedilemedi:', error);
      return { error: error.message };
    }

    return { data };
  }

  /* ──────────── ADMIN ──────────── */

  async function adminLogin(email, password) {
    if (!supabase) init();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function adminLogout() {
    if (!supabase) init();
    return await supabase.auth.signOut();
  }

  async function getAdminUser() {
    if (!supabase) init();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Oturum sahibinin YÖNETİCİ olup olmadığını söyler.
   *
   * Neden ayrı bir kontrol: müşteri üyeliği açıldığında herkes Supabase'de
   * "authenticated" oluyor. "Giriş yapmış = yönetici" varsayımı o noktada
   * her müşteriye yönetim paneli açardı. Yetki artık admin_users tablosuna
   * üyelikle belirleniyor.
   *
   * Bu yalnızca ARAYÜZ için: asıl koruma veritabanındaki RLS politikaları
   * (is_admin()). Burası atlatılsa bile yazma işlemleri veritabanında durur.
   */
  async function isAdmin() {
    if (!supabase) init();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Yönetici yetkisi doğrulanamadı:', error);
      return false;   // şüphede kal: yetki verme
    }
    return !!data;
  }

  async function adminUpdateProduct(id, updates) {
    if (!supabase) init();
    const dbUpdates = {};
    // Site formatından DB formatına çevir
    if ('isActive' in updates) dbUpdates.is_active = updates.isActive;
    if ('displayOrder' in updates) dbUpdates.display_order = updates.displayOrder;
    if ('collectionId' in updates) dbUpdates.collection_id = updates.collectionId;
    if ('stockQuantity' in updates) dbUpdates.stock_quantity = updates.stockQuantity;
    // Diğerleri direkt eşleşiyor
    const directKeys = ['slug', 'name', 'category', 'mode', 'price', 'description',
                        'materials', 'image', 'images', 'featured', 'customizable', 'customization'];
    directKeys.forEach(k => {
      if (k in updates) dbUpdates[k] = updates[k];
    });

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    invalidateCache();
    return { data, error };
  }

  async function adminCreateProduct(product) {
    if (!supabase) init();
    const dbRow = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      collection_id: product.collectionId,
      mode: product.mode,
      price: product.price,
      description: product.description || '',
      materials: product.materials || [],
      image: product.image || null,
      images: product.images || [],
      featured: !!product.featured,
      customizable: !!product.customizable,
      customization: product.customization || null,
      is_active: product.isActive !== false,
      display_order: product.displayOrder || 0,
      stock_quantity: product.stockQuantity || 0
    };

    const { data, error } = await supabase
      .from('products')
      .insert([dbRow])
      .select()
      .single();

    invalidateCache();
    return { data, error };
  }

  async function adminDeleteProduct(id) {
    if (!supabase) init();
    const { error } = await supabase.from('products').delete().eq('id', id);
    invalidateCache();
    return { error };
  }

  async function adminUploadImage(file, productId) {
    if (!supabase) init();
    const ext = file.name.split('.').pop().toLowerCase();
    const safeName = productId.replace(/[^a-z0-9-]/gi, '_');
    const filename = `${safeName}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) return { error };

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filename);

    return { data: { path: data.path, publicUrl: urlData.publicUrl } };
  }

  async function adminGetOrders() {
    if (!supabase) init();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  }

  /**
   * Bir ürünün stok adedini `delta` kadar değiştirir (negatif = düş, pozitif = iade et).
   * Sipariş "Onaylandı" olunca düşmek, "İptal" olunca geri eklemek için kullanılır
   * (bkz. admin/admin.js status-select handler). Negatife düşmesin diye clamp'lenir.
   */
  async function adminAdjustStock(productId, delta) {
    if (!supabase) init();
    const { data: current, error: fetchError } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (fetchError) return { error: fetchError };

    const newQuantity = Math.max(0, (current.stock_quantity || 0) + delta);
    const { data, error } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId)
      .select()
      .single();

    invalidateCache();
    return { data, error };
  }

  /** Bir siparişin stok düşümü/iadesinin uygulanıp uygulanmadığını işaretler. */
  async function adminSetOrderStockApplied(orderId, applied) {
    if (!supabase) init();
    const { data, error } = await supabase
      .from('orders')
      .update({ stock_applied: applied })
      .eq('id', orderId)
      .select()
      .single();
    return { data, error };
  }

  /* ──────────── ADMIN: KOLEKSİYONLAR ──────────── */

  async function adminCreateCollection(collection) {
    if (!supabase) init();
    const dbRow = {
      slug: collection.slug,
      name: collection.name,
      description: collection.description || '',
      image: collection.image || null,
      is_active: collection.isActive !== false,
      display_order: collection.displayOrder || 0,
      care_instructions: collection.careInstructions || '',
      return_terms: collection.returnTerms || ''
    };
    const { data, error } = await supabase.from('collections').insert([dbRow]).select().single();
    invalidateCollectionsCache();
    return { data, error };
  }

  async function adminUpdateCollection(id, updates) {
    if (!supabase) init();
    const dbUpdates = {};
    if ('isActive' in updates) dbUpdates.is_active = updates.isActive;
    if ('displayOrder' in updates) dbUpdates.display_order = updates.displayOrder;
    if ('careInstructions' in updates) dbUpdates.care_instructions = updates.careInstructions;
    if ('returnTerms' in updates) dbUpdates.return_terms = updates.returnTerms;
    ['slug', 'name', 'description', 'image'].forEach(k => {
      if (k in updates) dbUpdates[k] = updates[k];
    });
    const { data, error } = await supabase.from('collections').update(dbUpdates).eq('id', id).select().single();
    invalidateCollectionsCache();
    return { data, error };
  }

  /**
   * Koleksiyonu sil. Hâlâ ürün taşıyorsa silmeden önce durdurur — ham FK
   * hatası yerine kaç ürünün önce taşınması gerektiğini söyler.
   */
  async function adminDeleteCollection(id) {
    if (!supabase) init();
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('collection_id', id);

    if (countError) return { error: countError };
    if (count > 0) {
      return { error: { message: `Bu koleksiyonda hâlâ ${count} ürün var. Silmeden önce ürünleri başka bir koleksiyona taşı.` } };
    }

    const { error } = await supabase.from('collections').delete().eq('id', id);
    invalidateCollectionsCache();
    return { error };
  }

  /* ──────────── ADMIN: ÜRÜN TİPLERİ ──────────── */

  async function adminCreateProductType(productType) {
    if (!supabase) init();
    const dbRow = {
      slug: productType.slug,
      name: productType.name,
      is_active: productType.isActive !== false,
      display_order: productType.displayOrder || 0
    };
    const { data, error } = await supabase.from('product_types').insert([dbRow]).select().single();
    invalidateProductTypesCache();
    return { data, error };
  }

  async function adminUpdateProductType(id, updates) {
    if (!supabase) init();
    const dbUpdates = {};
    if ('isActive' in updates) dbUpdates.is_active = updates.isActive;
    if ('displayOrder' in updates) dbUpdates.display_order = updates.displayOrder;
    ['slug', 'name'].forEach(k => {
      if (k in updates) dbUpdates[k] = updates[k];
    });
    const { data, error } = await supabase.from('product_types').update(dbUpdates).eq('id', id).select().single();
    invalidateProductTypesCache();
    return { data, error };
  }

  /**
   * Ürün tipini sil. Hâlâ ürün taşıyorsa (products.category bu slug'a
   * eşitse) silmeden önce durdurur.
   */
  async function adminDeleteProductType(id, slug) {
    if (!supabase) init();
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', slug);

    if (countError) return { error: countError };
    if (count > 0) {
      return { error: { message: `Bu ürün tipinde hâlâ ${count} ürün var. Silmeden önce ürünleri başka bir tipe taşı.` } };
    }

    const { error } = await supabase.from('product_types').delete().eq('id', id);
    invalidateProductTypesCache();
    return { error };
  }

  async function adminUpdateOrderStatus(id, status, notes) {
    if (!supabase) init();
    const updates = { status };
    if (notes !== undefined) updates.notes = notes;
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  }

  /* ──────────── ADMIN: METİNLER ──────────── */

  async function adminUpdateSiteText(key, value) {
    if (!supabase) init();
    const { data, error } = await supabase
      .from('site_texts')
      .update({ value })
      .eq('key', key)
      .select()
      .single();

    siteTextsCache = null; // yeniden çekilsin
    return { data, error };
  }

  async function adminUpdateContentPage(slug, updates) {
    if (!supabase) init();
    const dbUpdates = {};
    if ('title' in updates) dbUpdates.title = updates.title;
    if ('eyebrow' in updates) dbUpdates.eyebrow = updates.eyebrow;
    if ('metaText' in updates) dbUpdates.meta_text = updates.metaText;
    if ('blocks' in updates) dbUpdates.blocks = updates.blocks;

    const { data, error } = await supabase
      .from('content_pages')
      .update(dbUpdates)
      .eq('slug', slug)
      .select()
      .single();

    delete contentPagesCache[slug]; // yeniden çekilsin
    return { data, error };
  }

  /* ──────────── EXPORT ──────────── */

  window.PB_Data = {
    init,
    getClient: () => supabase || init(),
    getProducts,
    getProductBySlug,
    getProductById,
    invalidateCache,
    getLastError,
    createOrder,

    // Koleksiyonlar + ürün tipleri (public)
    getCollections,
    getCollectionBySlug,
    getProductTypes,
    getSiteTexts,
    getSiteText,
    getContentPage,
    getAllContentPages,

    // Admin
    adminLogin,
    adminLogout,
    getAdminUser,
    isAdmin,
    adminUpdateProduct,
    adminCreateProduct,
    adminDeleteProduct,
    adminUploadImage,
    adminGetOrders,
    adminUpdateOrderStatus,
    adminAdjustStock,
    adminSetOrderStockApplied,
    adminCreateCollection,
    adminUpdateCollection,
    adminDeleteCollection,
    adminCreateProductType,
    adminUpdateProductType,
    adminDeleteProductType,
    adminGetSiteTexts,
    adminUpdateSiteText,
    adminUpdateContentPage
  };

  // Otomatik init (Supabase SDK yüklendiğinde)
  if (window.supabase) {
    init();
  } else {
    // SDK henüz yüklenmemişse bekle
    document.addEventListener('DOMContentLoaded', () => {
      if (window.supabase) init();
    });
  }
})(window);
