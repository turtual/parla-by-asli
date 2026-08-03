/**
 * Parla By Aslı — Müşteri hesabı (şifresiz giriş)
 *
 * Giriş e-posta linkiyle yapılıyor: müşteri adresini yazar, gelen linke
 * tıklayınca oturum açılır. Şifre saklanmadığı için şifre sıfırlama,
 * güç kuralları ve sızıntı riski tamamen ortadan kalkıyor.
 *
 * ÖNEMLİ — yetki: buradaki oturum müşteri oturumudur. Yönetim paneline
 * erişim ayrıca admin_users üyeliğine bakıyor (bkz. PB_Data.isAdmin);
 * müşteri hesabıyla giriş yapmak panele erişim vermez.
 *
 * Not: Supabase'in yerleşik e-posta servisi saatte birkaç mail ile
 * sınırlıdır (geliştirme içindir). Canlıda kendi SMTP/e-posta servisiniz
 * tanımlı olmalı, yoksa müşteriler giriş linkini alamaz.
 */

(function (window) {
  'use strict';

  function istemci() {
    if (typeof PB_Data === 'undefined' || !PB_Data.supabaseClient) return null;
    return PB_Data.supabaseClient();
  }

  /** Oturumdaki kullanıcı (yoksa null). */
  async function kullanici() {
    const c = istemci();
    if (!c) return null;
    const { data: { user } } = await c.auth.getUser();
    return user || null;
  }

  /**
   * Giriş linki gönderir. Dönen mesaj kullanıcıya gösterilmek üzere
   * hazır metindir.
   *
   * Güvenlik notu: adres kayıtlı olsa da olmasa da AYNI cevabı veriyoruz.
   * Aksi hâlde site, bir e-postanın sistemde kayıtlı olup olmadığını
   * dışarıya sızdıran bir sorgu aracına dönüşür.
   */
  async function girisLinkiGonder(email) {
    const c = istemci();
    if (!c) return { hata: 'Bağlantı kurulamadı, lütfen sayfayı yenileyin.' };

    const temiz = String(email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(temiz)) {
      return { hata: 'Geçerli bir e-posta adresi yazın.' };
    }

    const { error } = await c.auth.signInWithOtp({
      email: temiz,
      options: { emailRedirectTo: window.location.origin + '/hesap/' }
    });

    if (error) {
      console.error('Giriş linki gönderilemedi:', error);
      const m = String(error.message || '').toLowerCase();

      // Geçici hata: beklemek işe yarar
      if (m.includes('rate') || m.includes('too many')) {
        return { hata: 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.' };
      }

      // Kalıcı hata: yapılandırma sorunu, beklemek bir şey değiştirmez.
      // Kullanıcıya "sonra dene" demek yanlış yönlendirme olur; ayrıca
      // "kayıt kapalı" gibi iç ayrıntıları da dışarı yazmıyoruz.
      if (m.includes('signups not allowed') || m.includes('disabled')) {
        return { hata: 'Giriş şu anda yapılamıyor. Lütfen bizimle iletişime geçin.' };
      }

      return { hata: 'Giriş linki gönderilemedi. Sorun devam ederse bize yazın.' };
    }

    return { mesaj: temiz + ' adresine bir giriş linki gönderdik. Gelen kutunu kontrol et (spam klasörüne de bak).' };
  }

  async function cikis() {
    const c = istemci();
    if (!c) return;
    await c.auth.signOut();
  }

  /** Oturum açılıp kapandığında haber verir. */
  function onDegisim(cb) {
    const c = istemci();
    if (!c) return;
    c.auth.onAuthStateChange((_olay, oturum) => cb(oturum ? oturum.user : null));
  }

  /* ──────────── Siparişlerim ──────────── */

  /**
   * Kullanıcının siparişleri.
   *
   * Hangi siparişlerin görüneceğine VERİTABANI karar veriyor (RLS):
   * ya sipariş hesaba bağlıdır (user_id) ya da sipariş e-postası
   * hesabın doğrulanmış e-postasıyla aynıdır. İkincisi, üyelik
   * açılmadan önce verilmiş siparişlerin de görünmesini sağlıyor.
   */
  async function siparislerim() {
    const c = istemci();
    if (!c) return [];
    const { data, error } = await c
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Siparişler alınamadı:', error);
      return [];
    }
    return data || [];
  }

  /* ──────────── Favorilerin sunucuyla eşitlenmesi ──────────── */

  /**
   * Giriş yapıldığında tarayıcıdaki ve sunucudaki favorileri BİRLEŞTİRİR.
   *
   * Neden birleştirme (biri diğerini ezmiyor): müşteri giriş yapmadan
   * ürün favorilemiş olabilir; sunucuyu esas alsak o seçimler silinirdi.
   * Tarayıcıyı esas alsak başka cihazdaki favorileri silerdi. Birleşim
   * ikisini de korur.
   */
  async function favorileriEsitle() {
    const c = istemci();
    if (!c || typeof PB_Favs === 'undefined') return;

    const u = await kullanici();
    if (!u) return;

    const { data, error } = await c.from('favorites').select('product_id');
    if (error) {
      console.error('Favoriler alınamadı:', error);
      return;
    }

    const sunucudaki = (data || []).map(r => r.product_id);
    const yereldeki = PB_Favs.read();
    const birlesim = [...new Set([...sunucudaki, ...yereldeki])];

    PB_Favs.write(birlesim);

    // Yerelde olup sunucuda olmayanları yükle
    const eksikler = birlesim.filter(id => !sunucudaki.includes(id));
    if (eksikler.length) {
      const { error: yazmaHatasi } = await c.from('favorites')
        .upsert(eksikler.map(id => ({ user_id: u.id, product_id: id })));
      if (yazmaHatasi) console.error('Favoriler yüklenemedi:', yazmaHatasi);
    }
  }

  /**
   * Tek bir favori değişikliğini sunucuya yazar. Giriş yoksa sessizce
   * geçilir — favori yerelde zaten tutuluyor, işlev bozulmuyor.
   */
  async function favoriYaz(productId, ekleniyor) {
    const c = istemci();
    if (!c) return;
    const u = await kullanici();
    if (!u) return;

    const { error } = ekleniyor
      ? await c.from('favorites').upsert([{ user_id: u.id, product_id: productId }])
      : await c.from('favorites').delete().eq('user_id', u.id).eq('product_id', productId);

    if (error) console.error('Favori kaydedilemedi:', error);
  }

  window.PB_Account = {
    kullanici,
    girisLinkiGonder,
    cikis,
    onDegisim,
    siparislerim,
    favorileriEsitle,
    favoriYaz
  };
})(window);
