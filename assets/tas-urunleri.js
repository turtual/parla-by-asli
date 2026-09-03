/**
 * Parla By Aslı — Taş sayfasındaki ürün şeridi
 *
 * Taş sayfaları statik üretiliyor (tools/taslar-uret.js) ama ürünler
 * değişken: stok tükeniyor, yeni parça ekleniyor. O yüzden şerit burada,
 * istemci tarafında dolduruluyor.
 *
 * Eşleşme, taş sayfasındaki data-tas-eslesme özniteliğindeki anahtar
 * kelimelerin ürün adı + malzemeler + açıklama metninde aranmasıyla yapılır.
 * Ürün tablosunda ayrı bir "taş" kolonu yok; şema değiştirmeden çalışsın
 * diye metin eşleşmesi tercih edildi.
 *
 * Bağımlılık: data.js → products.js → ui.js (renderProductCard için)
 */

(function () {
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

  function kelimeBasindaGecer(metin, anahtar) {
    let i = metin.indexOf(anahtar);
    while (i !== -1) {
      if (i === 0 || !HARF.test(metin[i - 1])) return true;
      i = metin.indexOf(anahtar, i + 1);
    }
    return false;
  }

  function urunMetni(p) {
    const parcalar = [
      p.name,
      Array.isArray(p.materials) ? p.materials.join(' ') : p.materials,
      p.description
    ];
    return normalize(parcalar.filter(Boolean).join(' '));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const bolum = document.querySelector('[data-tas-eslesme]');
    const grid = document.querySelector('[data-tas-urun-grid]');
    if (!bolum || !grid || typeof PB_Data === 'undefined') return;

    const anahtarlar = (bolum.dataset.tasEslesme || '')
      .split('|').map(normalize).filter(Boolean);
    if (!anahtarlar.length) return;

    let urunler = [];
    try {
      urunler = await PB_Data.getProducts();
    } catch (e) {
      console.warn('Taş sayfası ürünleri yüklenemedi:', e);
      return;
    }

    const eslesen = (urunler || []).filter(p => {
      if (p.isActive === false) return false;
      const metin = urunMetni(p);
      return anahtarlar.some(a => kelimeBasindaGecer(metin, a));
    });

    if (!eslesen.length) return;   // eşleşme yoksa bölüm gizli kalır

    // Stokta olanlar önce; aynı gruptakiler mevcut sırayı korur
    eslesen.sort((a, b) => ((b.stockQuantity || 0) > 0) - ((a.stockQuantity || 0) > 0));

    eslesen.forEach((p, i) => {
      if (typeof renderProductCard === 'function') {
        grid.appendChild(renderProductCard(p, i));
      } else {
        // ui.js yüklenmediyse en azından bir bağlantı görünsün
        const a = document.createElement('a');
        a.href = '../../katalog/?urun=' + encodeURIComponent(p.slug);
        a.textContent = p.name;
        grid.appendChild(a);
      }
    });

    bolum.hidden = false;
  });
})();
