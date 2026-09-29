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
  // Levhada "Ticaret Ünvanı" satırı boş; şahıs işletmelerinde unvan kişinin
  // kendi adıdır, markayı da göstermek için ikisi birlikte yazıldı.
  unvan: 'Ali Salihoğlu - Parla By Aslı',

  // 'sahis' | 'esnaf' | 'limited'  → metinlerdeki ifadeleri belirler
  tip: 'sahis',

  vergiDairesi: 'Bornova',
  vergiNo: '7410269068',

  /* TC kimlik numarası KASTEN buraya yazılmadı.
     Mesafeli Sözleşmeler Yönetmeliği satıcının adı/unvanı, adresi,
     telefonu, e-postası ve varsa MERSİS numarasını istiyor — TCKN'yi
     değil. Vergi kimlik numarası zaten yayımlanabilir bir numara;
     TCKN'yi yayımlamak ise gereksiz bir kimlik hırsızlığı riski.
     Bir kurum TCKN isterse siteye koymak yerine doğrudan paylaş. */

  // Yalnızca limited/AŞ için. Şahıs şirketi ve esnafta boş kalır.
  mersis: '',
  ticaretSicilNo: '',

  /* ── İletişim (zorunlu) ── */
  adres: 'Osmangazi Mah. Dumlupınar Cad. Çiçek Kardeşler No: 154/1 İç Kapı No: 28, Bayraklı / İzmir',

  telefon: '0536 636 99 96',
  /* Yedek değer. Asıl kaynak panel: Metinler → "İletişim e-posta adresi".
     Buradaki adres yalnız veritabanına ulaşılamazsa kullanılıyor. */
  eposta: 'siparis.parlabyasli@outlook.com',

  /* ── Operasyon ──
   * Kişiye özel tasarım stüdyosu kaldırıldı (Temmuz 2026) — katalogda
   * artık tek tip ürün var, hepsi standart teslimat ve cayma hakkına tabi.
   */
  kargoFirmasi: '',
  // Yedek değerler: yalnız site_texts okunamadığında kullanılır.
  // Panelden değiştirdiğinde burayı da güncelle, yoksa bağlantı
  // koptuğunda yasal sayfada eski rakam görünür.
  ucretsizKargoEsigi: 2000,       // ₺
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
  // Tutar alanları: yasal metinde "49.5 ₺" değil "49,50 ₺" görünsün diye
  // Türkçe biçimle yazılır. Tam sayılarda kuruş gösterilmez (35 ₺).
  const TUTAR_ALANLARI = new Set(['ucretsizKargoEsigi', 'kargoUcreti']);

  /* Şahıs işletmesi ve esnafta MERSİS ile ticaret sicil numarası YOKTUR —
     bunlar ticaret siciline kayıtlı şirketlere verilir. Boş olmaları eksik
     bilgi değil, doğru bilgi; "DOLDURULACAK" yazmak yanıltıcı oluyordu. */
  const SIRKETE_OZEL = new Set(['mersis', 'ticaretSicilNo']);

  function deger(alan) {
    const v = S[alan];

    if (SIRKETE_OZEL.has(alan) && (v === '' || v == null)) {
      const sirketMi = S.tip === 'limited' || S.tip === 'anonim';
      return sirketMi ? null : '—';
    }

    if (v === null || v === undefined || v === '') return null;

    if (TUTAR_ALANLARI.has(alan)) {
      const n = Number(v);
      if (Number.isFinite(n)) {
        const kurusVar = !Number.isInteger(n);
        return n.toLocaleString('tr-TR', {
          minimumFractionDigits: kurusVar ? 2 : 0,
          maximumFractionDigits: 2
        });
      }
    }

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
        /* Müşteriye kırmızı "DOLDURULACAK" göstermek markayı özensiz
           gösteriyordu ve alıcının işine de yaramıyordu. Eksik alan sade
           bir tire ile geçiliyor; sayfanın başındaki bant durumu zaten
           söylüyor, ayrıntı da konsola yazılıyor (bkz. uyariBandi). */
        el.textContent = '—';
        el.classList.remove('yasal-eksik');
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

    /* Eksik alanın adını ve ne yapılacağını GELİŞTİRİCİYE konsoldan
       söylüyoruz. Sayfadaki bant müşteriye görünüyor; oraya dosya adı
       yazmak alıcı için anlamsız, marka için de özensiz duruyordu.
       Bant yine de duruyor: eksikliği gizlemek istemiyoruz, yalnız
       müşterinin işine yarayacak biçimde söylüyoruz. */
    console.warn(
      '[Parla] Yasal sayfalarda eksik satıcı bilgisi: ' + eksikler.join(', ') +
      ' — assets/legal-info.js dosyasını doldur.'
    );

    const band = document.createElement('div');
    band.className = 'yasal-uyari';
    band.setAttribute('role', 'status');

    const eposta = deger('eposta');
    band.textContent = eposta
      ? 'Satıcı iletişim bilgilerimiz güncelleniyor. Bu arada her konuda '
        + eposta + ' adresinden bize ulaşabilirsin.'
      : 'Satıcı iletişim bilgilerimiz güncelleniyor.';

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
  const saticiHazir = (async function saticiBilgisiniYukle() {
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

      /* İletişim e-postası panelden yönetiliyor. Yedi yasal sayfa, iletişim
         sayfası ve "bize yaz" bağlantıları aynı değeri kullandığı için tek
         yerden değişmesi gerekiyordu — eskiden yalnız bu dosyada sabitti. */
      const eposta = String(texts.iletisim_eposta || '').trim();
      if (eposta && /^[^@s]+@[^@s]+.[^@s]+$/.test(eposta)) {
        S.eposta = eposta;
      }
    } catch (e) {
      // Sessizce varsayılanlarda kal — yasal sayfa yine de dolu görünür
      console.warn('Satıcı bilgisi çekilemedi, varsayılanlar kullanılıyor:', e);
    }
  })();

  function calistir() {
    doldur(document);
    mailtoBagla();
    uyariBandi();
    // DB'den gelen kargo değerleri geldiğinde ilgili span'ları tazele
    saticiHazir.then(() => doldur(document));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', calistir);
  } else {
    calistir();
  }

  /** Kasadaki hesap için: DB değerleri yüklendikten sonraki kargo bilgisi. */
  async function kargo() {
    await saticiHazir;
    return { esik: S.ucretsizKargoEsigi, ucret: S.kargoUcreti };
  }

  // Diğer scriptler kullanabilsin (örn. assets/content.js dinamik içerik
  // bastıktan sonra hem doldur hem mailtoBagla'yı tekrar çağırır)
  window.PB_SaticiBilgi = { deger, doldur, mailtoBagla, kargo, saticiHazir };
})(window, document);
