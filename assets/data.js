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
  const CACHE_TTL = 60 * 1000; // 1 dakika cache (admin panelden değişiklik olabileceği için kısa)

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
      displayOrder: row.display_order || 0
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
    if (!supabase) return [];

    let query = supabase.from('products').select('*').order('display_order', { ascending: true });
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Ürünler çekilemedi:', error);
      return productsCache || [];
    }

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

  async function adminUpdateProduct(id, updates) {
    if (!supabase) init();
    const dbUpdates = {};
    // Site formatından DB formatına çevir
    if ('isActive' in updates) dbUpdates.is_active = updates.isActive;
    if ('displayOrder' in updates) dbUpdates.display_order = updates.displayOrder;
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
      display_order: product.displayOrder || 0
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

  /* ──────────── EXPORT ──────────── */

  window.PB_Data = {
    init,
    getClient: () => supabase || init(),
    getProducts,
    getProductBySlug,
    getProductById,
    invalidateCache,
    createOrder,

    // Admin
    adminLogin,
    adminLogout,
    getAdminUser,
    adminUpdateProduct,
    adminCreateProduct,
    adminDeleteProduct,
    adminUploadImage,
    adminGetOrders,
    adminUpdateOrderStatus
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
