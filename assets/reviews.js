/**
 * Parla By Aslı — Ürün değerlendirmeleri
 *
 * Kurallar VERİTABANINDA uygulanıyor, burada değil:
 *   - Yalnız ürünü TESLİM ALMIŞ kişi yorum yazabilir (RLS + urun_teslim_alindi)
 *   - Yorum daima "beklemede" başlar, yayın için admin onayı gerekir (trigger)
 *   - Görünen isim siparişteki addan türetilir, müşteriden alınmaz (trigger)
 *
 * Buradaki kontroller yalnızca ARAYÜZ kolaylığı: yazamayacak kişiye form
 * göstermemek için. Bu katman atlatılsa bile veritabanı reddeder.
 */

(function (window) {
  'use strict';

  function istemci() {
    if (typeof PB_Data === 'undefined' || !PB_Data.supabaseClient) return null;
    return PB_Data.supabaseClient();
  }

  // Kart ızgarasında her ürün için ayrı sorgu atmamak adına tek seferde
  // çekilip burada tutuluyor.
  let ozetCache = null;
  let ozetZamani = 0;
  const CACHE_MS = 60000;

  /** Onaylı yorumların ürün bazında ortalaması ve sayısı. */
  async function ozetler() {
    if (ozetCache && Date.now() - ozetZamani < CACHE_MS) return ozetCache;

    const c = istemci();
    if (!c) return {};

    const { data, error } = await c
      .from('reviews')
      .select('product_id, rating')
      .eq('status', 'approved');

    if (error) {
      // Tablo/politika henüz yoksa sessizce boş dön — ürünler yine görünsün
      console.warn('Değerlendirme özeti alınamadı:', error.message);
      return {};
    }

    const harita = {};
    (data || []).forEach(r => {
      const o = harita[r.product_id] || (harita[r.product_id] = { toplam: 0, adet: 0 });
      o.toplam += r.rating;
      o.adet += 1;
    });
    Object.values(harita).forEach(o => { o.ortalama = o.toplam / o.adet; });

    ozetCache = harita;
    ozetZamani = Date.now();
    return harita;
  }

  function ozetiUnut() { ozetCache = null; }

  /** Bir ürünün onaylı yorumları (yeniden eskiye). */
  async function urunYorumlari(productId) {
    const c = istemci();
    if (!c) return [];
    const { data, error } = await c
      .from('reviews')
      .select('rating, comment, display_name, created_at, status, user_id')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Yorumlar alınamadı:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Kullanıcı bu ürüne yorum yazabilir mi?
   * Dönen sebep, forma yerine gösterilecek açıklama metnini seçmek için.
   */
  async function yazabilirMi(productId) {
    const c = istemci();
    if (!c) return { olur: false, sebep: 'baglanti' };

    const { data: { user } } = await c.auth.getUser();
    if (!user) return { olur: false, sebep: 'giris_yok' };

    const { data: mevcut } = await c
      .from('reviews').select('id, status')
      .eq('product_id', productId).eq('user_id', user.id).maybeSingle();
    if (mevcut) return { olur: false, sebep: 'zaten_var', durum: mevcut.status };

    const { data: aldiMi, error } = await c
      .rpc('urun_teslim_alindi', { p_product_id: productId, p_user_id: user.id });
    if (error) {
      console.warn('Satın alma kontrolü yapılamadı:', error.message);
      return { olur: false, sebep: 'baglanti' };
    }
    if (!aldiMi) return { olur: false, sebep: 'satin_alinmadi' };

    return { olur: true };
  }

  async function yorumGonder(productId, rating, comment) {
    const c = istemci();
    if (!c) return { hata: 'Bağlantı kurulamadı.' };

    const { data: { user } } = await c.auth.getUser();
    if (!user) return { hata: 'Yorum yazmak için giriş yapmalısın.' };

    const metin = String(comment || '').trim();
    if (metin.length < 10) return { hata: 'Yorumun en az 10 karakter olmalı.' };
    if (!(rating >= 1 && rating <= 5)) return { hata: 'Lütfen 1-5 arası puan ver.' };

    const { error } = await c.from('reviews').insert([{
      product_id: productId, user_id: user.id, rating, comment: metin
    }]);

    if (error) {
      console.error('Yorum kaydedilemedi:', error);
      if (error.code === '23505') return { hata: 'Bu ürüne zaten yorum yapmışsın.' };
      // RLS reddi: ürün teslim alınmamış
      if (error.code === '42501') return { hata: 'Bu ürüne yorum yapabilmek için siparişinin teslim edilmiş olması gerekiyor.' };
      return { hata: 'Yorum şu anda kaydedilemedi. Biraz sonra tekrar dene.' };
    }

    ozetiUnut();
    return { mesaj: 'Yorumun alındı. Onaylandıktan sonra yayınlanacak.' };
  }

  /* ──────────── Görsel yardımcılar ──────────── */

  /** Yıldız satırı. deger 0-5 arası, yarım yıldız yok (yuvarlanır). */
  function yildizlar(deger, sinif) {
    const kap = PB_h('span', { class: 'yildizlar' + (sinif ? ' ' + sinif : '') });
    const dolu = Math.round(deger || 0);
    for (let i = 1; i <= 5; i++) {
      kap.append(PB_h('span', {
        class: 'yildiz' + (i <= dolu ? ' is-dolu' : ''),
        'aria-hidden': 'true'
      }, '★'));
    }
    return kap;
  }

  window.PB_Reviews = {
    ozetler, ozetiUnut, urunYorumlari, yazabilirMi, yorumGonder, yildizlar
  };
})(window);
