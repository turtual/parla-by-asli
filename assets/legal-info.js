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

  function calistir() {
    doldur(document);
    mailtoBagla();
    uyariBandi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', calistir);
  } else {
    calistir();
  }

  // Diğer scriptler kullanabilsin
  window.PB_SaticiBilgi = { deger, doldur };
})(window, document);
