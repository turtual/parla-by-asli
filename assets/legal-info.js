/**
 * Parla By Aslı — Yasal metinlerin ortak bilgi kaynağı
 *
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║  BURAYI DOLDUR — yedi yasal sayfa bu dosyadan besleniyor.         ║
 * ║  İşletme kaydın çıktığında aşağıdaki alanları yaz, kaydet, push   ║
 * ║  et. Bütün sayfalar aynı anda güncellenir.                        ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Boş bıraktığın her alan sayfalarda kırmızı "DOLDURULACAK" olarak
 * görünür ve sayfanın başında bir uyarı bandı çıkar. Bu kasıtlı:
 * eksik yasal metinle sessizce yayında kalmak, eksikliği görmekten
 * daha risklidir.
 */

window.PB_SATICI = {
  /* ── Kimlik (mesafeli satış sözleşmesinde zorunlu) ── */

  // Vergi levhasındaki tam unvan. Şahıs şirketiyse "Ad Soyad - Parla By Aslı" gibi.
  unvan: '',

  // 'sahis' | 'esnaf' | 'limited'  → metinlerdeki ifadeleri belirler
  tip: '',

  vergiDairesi: '',
  vergiNo: '',

  // Yalnızca limited/AŞ için. Şahıs şirketi ve esnafta boş kalır.
  mersis: '',
  ticaretSicilNo: '',

  /* ── İletişim (zorunlu) ── */
  adres: '',
  telefon: '',
  eposta: 'parlabyasli@outlook.com',

  /* ── Operasyon ──
   * Kişiye özel tasarım stüdyosu kaldırıldı (Temmuz 2026) — katalogda
   * artık tek tip ürün var, hepsi standart teslimat ve cayma hakkına tabi.
   */
  kargoFirmasi: '',
  ucretsizKargoEsigi: 500,        // ₺
  kargoUcreti: 35,                // ₺ — eşiğin altında
  teslimatSuresi: '1-3 iş günü',

  /* ── İade politikası ──
   * Mesafeli Sözleşmeler Yönetmeliği'nin 14 günlük genel cayma hakkı
   * tüm ürünlerde geçerli; kişiselleştirilmiş ürün istisnası artık
   * gerekmiyor.
   */
  caymaSuresiGun: 14,

  /* ── Metin sürümü ── */
  yururlukTarihi: '29.07.2026'
};

(function (window, document) {
  'use strict';

  const S = window.PB_SATICI;

  // Sayfalarda mutlaka dolu olması gereken alanlar
  const ZORUNLU = ['unvan', 'adres', 'telefon', 'eposta'];

  /**
   * Bir alanın gösterilecek değerini döner.
   * Boşsa null döner — çağıran taraf uyarı işaretini basar.
   */
  function deger(alan) {
    const v = S[alan];
    if (v === null || v === undefined || v === '') return null;
    return String(v);
  }

  /**
   * data-satici="alan" taşıyan her elemanı doldurur.
   * Boş alanlar görünür biçimde işaretlenir, sessizce boş bırakılmaz.
   */
  function doldur(kok) {
    const hedefler = (kok || document).querySelectorAll('[data-satici]');
    hedefler.forEach(el => {
      const alan = el.dataset.satici;
      const v = deger(alan);
      if (v !== null) {
        el.textContent = v;
        el.classList.remove('yasal-eksik');
      } else {
        el.textContent = 'DOLDURULACAK';
        el.classList.add('yasal-eksik');
      }
    });
  }

  /**
   * Zorunlu alanlardan eksik olan varsa sayfanın en üstüne uyarı bandı koyar.
   * Yalnızca yasal sayfalarda çalışır (main içinde .legal-page varsa).
   */
  function uyariBandi() {
    const eksikler = ZORUNLU.filter(a => deger(a) === null);
    if (eksikler.length === 0) return;

    const sayfa = document.querySelector('.legal-page');
    if (!sayfa) return;

    const band = document.createElement('div');
    band.className = 'yasal-uyari';
    band.setAttribute('role', 'alert');
    band.textContent =
      'Bu metin henüz tamamlanmadı: satıcı bilgileri girilmemiş (' +
      eksikler.join(', ') + '). ' +
      'Yayına almadan önce assets/legal-info.js dosyasını doldur.';

    sayfa.prepend(band);
  }

  /**
   * data-satici-mailto taşıyan bağlantıların href'ini e-posta adresinden kurar.
   * Adres tek dosyada tutulduğu için HTML'e elle yazılmıyor.
   */
  function mailtoBagla() {
    const eposta = deger('eposta');
    document.querySelectorAll('[data-satici-mailto]').forEach(a => {
      if (eposta) {
        a.href = 'mailto:' + eposta;
      } else {
        a.removeAttribute('href');
      }
    });
  }

  /**
   * Kargo eşiği ve ücreti admin panelinden yönetiliyor (site_texts).
   * Buradaki değerler yalnızca varsayılan/yedek: veritabanı okunamazsa
   * sayfa boş kalmasın diye duruyorlar.
   *
   * Tek giriş noktası olmasının önemi: bu iki sayı hem yasal metinlerde
   * (mesafeli satış, ön bilgilendirme, kargo-teslimat, SSS) hem de kasadaki
   * hesapta geçiyor. Ayrı ayrı tutulursa yasal metin bir tutar yazarken
   * müşteriden başka tutar tahsil edilebilir.
   */
  const kargoHazir = (async function kargoyuYukle() {
    try {
      if (typeof PB_Data === 'undefined' || !PB_Data.getSiteTexts) return;
      const texts = await PB_Data.getSiteTexts();

      const sayi = (deger, yedek) => {
        const n = parseFloat(String(deger).replace(',', '.'));
        return Number.isFinite(n) && n >= 0 ? n : yedek;
      };

      if (texts.kargo_ucretsiz_esigi != null && texts.kargo_ucretsiz_esigi !== '') {
        S.ucretsizKargoEsigi = sayi(texts.kargo_ucretsiz_esigi, S.ucretsizKargoEsigi);
      }
      if (texts.kargo_ucreti != null && texts.kargo_ucreti !== '') {
        S.kargoUcreti = sayi(texts.kargo_ucreti, S.kargoUcreti);
      }
    } catch (e) {
      // Sessizce varsayılanlarda kal — yasal sayfa yine de dolu görünür
      console.warn('Kargo bilgisi çekilemedi, varsayılanlar kullanılıyor:', e);
    }
  })();

  function calistir() {
    doldur(document);
    mailtoBagla();
    uyariBandi();
    // DB'den gelen kargo değerleri geldiğinde ilgili span'ları tazele
    kargoHazir.then(() => doldur(document));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', calistir);
  } else {
    calistir();
  }

  /** Kasadaki hesap için: DB değerleri yüklendikten sonraki kargo bilgisi. */
  async function kargo() {
    await kargoHazir;
    return { esik: S.ucretsizKargoEsigi, ucret: S.kargoUcreti };
  }

  // Diğer scriptler kullanabilsin (örn. assets/content.js dinamik içerik
  // bastıktan sonra hem doldur hem mailtoBagla'yı tekrar çağırır)
  window.PB_SaticiBilgi = { deger, doldur, mailtoBagla, kargo, kargoHazir };
})(window, document);
