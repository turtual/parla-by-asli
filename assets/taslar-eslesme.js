/**
 * Parla By Aslı — Taş ↔ ürün eşleşmesi (iki yönlü, tek kaynak)
 *
 * İki soruyu da burası cevaplıyor:
 *   ürün → hangi taşlar?   PB_TasEslesme.urununTaslari(urun)
 *   taş  → hangi ürünler?  PB_TasEslesme.tasinUrunleri(anahtarlar, urunler)
 *
 * Eşleşme iki kademeli:
 *   1. products.stones alanı doluysa ONU kullanır — kesin bilgi, panelden girilir.
 *   2. Boşsa ürün adı + malzemeler + açıklama metninde taşın anahtar
 *      kelimeleri aranır. Tahmindir ama eski ürünler için tek yol.
 *
 * Tek yerde durmasının sebebi: iki yön farklı kurallarla çalışırsa ürün
 * sayfasında "Lapis Lazuli" yazıp o taşın sayfasında o ürünü göstermemek
 * gibi sessiz tutarsızlıklar çıkıyor.
 *
 * Bağımlılık: assets/taslar-listesi.js (window.PB_TASLAR)
 */

(function (window) {
  'use strict';

  /**
   * Türkçe duyarlı normalleştirme. Hem 'İ/ı' sorununu hem de
   * "yeşim" ↔ "yesim" gibi aksansız yazımları tek forma indirger.
   */
  function normalize(s) {
    return String(s || '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Anahtar kelime metinde KELİME BAŞINDA geçiyor mu?
   *
   * Düz alt-dizi araması yanlış eşleşme üretiyordu: "uzatma zinciri"
   * ifadesindeki "z-inci-ri" yüzünden neredeyse her ürün inci sayfasına
   * düşüyordu. Aynı tuzak "hakiki" içindeki "akik" için de geçerli.
   *
   * Türkçe ekler sona geldiği için yalnızca BAŞ sınırı aranır:
   * "incisi" ve "inciler" eşleşir, "zinciri" eşleşmez.
   */
  const HARF = /[a-zâîû0-9]/;

  /** Kelime başındaki ilk eşleşmenin konumu; yoksa -1. */
  function kelimeBasiIndeksi(metin, anahtar) {
    let i = metin.indexOf(anahtar);
    while (i !== -1) {
      if (i === 0 || !HARF.test(metin[i - 1])) return i;
      i = metin.indexOf(anahtar, i + 1);
    }
    return -1;
  }

  function kelimeBasindaGecer(metin, anahtar) {
    return kelimeBasiIndeksi(metin, anahtar) !== -1;
  }

  /** Taşın anahtarlarından metinde en erken geçenin konumu; yoksa -1. */
  function tasinYeri(metin, tas) {
    let enErken = -1;
    for (const anahtar of (tas.eslesme || [])) {
      const yer = kelimeBasiIndeksi(metin, normalize(anahtar));
      if (yer !== -1 && (enErken === -1 || yer < enErken)) enErken = yer;
    }
    return enErken;
  }

  function urunMetni(p) {
    const parcalar = [
      p.name,
      Array.isArray(p.materials) ? p.materials.join(' ') : p.materials,
      p.description
    ];
    return normalize(parcalar.filter(Boolean).join(' '));
  }

  function taslar() {
    return window.PB_TASLAR || [];
  }

  function tasBul(slug) {
    return taslar().find(t => t.slug === slug) || null;
  }

  /**
   * Ürünün taşları — kart ve ürün sayfasında gösterilen liste.
   * @returns {Array<{slug, ad, renk}>} en fazla `sinir` taş
   */
  function urununTaslari(urun, sinir) {
    if (!urun) return [];
    const azami = sinir || 3;

    // 1. Panelden girilmiş kesin bilgi
    const secili = Array.isArray(urun.stones) ? urun.stones.filter(Boolean) : [];
    if (secili.length) {
      return secili.map(tasBul).filter(Boolean).slice(0, azami);
    }

    // 2. Metinden tahmin.
    //
    // Sıralama metindeki konuma göre: urunMetni ürün adı → malzemeler →
    // açıklama sırasıyla birleştiriyor, yani üreticinin öne aldığı taş
    // doğal olarak başa geliyor. Alfabetik sıra yanıltıcıydı — üç taşlı
    // "Bir Mavi Meselesi"nin başrolü Lapis Lazuli iken kartta "Akik"
    // görünüyordu, çünkü taş dizini ada göre sıralı.
    const metin = urunMetni(urun);
    return taslar()
      .map(t => ({ tas: t, yer: tasinYeri(metin, t) }))
      .filter(x => x.yer !== -1)
      .sort((a, b) => a.yer - b.yer)
      .slice(0, azami)
      .map(x => x.tas);
  }

  /** Ürünün taşlarını "Lapis Lazuli · İnci" gibi tek satıra çevirir. */
  function taslarYazisi(urun, sinir) {
    return urununTaslari(urun, sinir).map(t => t.ad).join(' · ');
  }

  /**
   * Taşın ürünleri. Taş sayfaları anahtar kelimelerini kendi HTML'inde
   * taşıdığı için hem slug hem hazır anahtar listesi kabul ediliyor.
   */
  function tasinUrunleri(tasSlugVeyaAnahtarlar, urunler) {
    let slug = null;
    let anahtarlar = [];

    if (Array.isArray(tasSlugVeyaAnahtarlar)) {
      anahtarlar = tasSlugVeyaAnahtarlar.map(normalize).filter(Boolean);
    } else {
      slug = tasSlugVeyaAnahtarlar;
      const tas = tasBul(slug);
      anahtarlar = ((tas && tas.eslesme) || [slug]).map(normalize).filter(Boolean);
    }

    return (urunler || []).filter(p => {
      if (p.isActive === false) return false;

      // Panelden taş seçilmişse metne hiç bakma — yanlış pozitifi keser
      const secili = Array.isArray(p.stones) ? p.stones.filter(Boolean) : [];
      if (secili.length) return slug ? secili.indexOf(slug) !== -1 : false;

      const metin = urunMetni(p);
      return anahtarlar.some(a => kelimeBasindaGecer(metin, a));
    });
  }

  window.PB_TasEslesme = {
    normalize,
    kelimeBasindaGecer,
    kelimeBasiIndeksi,
    urunMetni,
    tasBul,
    urununTaslari,
    taslarYazisi,
    tasinUrunleri
  };
})(window);
