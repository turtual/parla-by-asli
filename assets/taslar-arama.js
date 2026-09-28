/**
 * Parla By Aslı — Taş listesi: arama, harf filtresi ve fotoğraflar
 *
 * 47 taş var; kullanıcı aradığını hızlı bulabilmeli. Arama tamamen
 * tarayıcıda: taşlar zaten sayfada, ek istek ya da kütüphane yok.
 *
 * Türkçe yazım toleranslı: "gul kuvars", "gül kuvars" ve "GÜL KUVARS"
 * aynı sonucu verir. Taşın İngilizce karşılığı da aranıyor (eşleşme
 * anahtarları taş verisinde duruyor): "amethyst" yazan Ametist'i bulur.
 *
 * Fotoğraflar panelden yükleniyor (stone_images). Fotoğrafı olmayan
 * taşta uydurma görsel yerine taşın kendi renginden zemin + baş harfi
 * gösteriliyor; fotoğraf eklenince kendiliğinden yerini alıyor.
 */

(function () {
  'use strict';

  function normalize(s) {
    if (window.PB_TasEslesme) return window.PB_TasEslesme.normalize(s);
    return String(s || '')
      .toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ──────────── Fotoğrafları bağla ────────────
     Kartlar HTML'de renk zeminiyle üretilmiş durumda; fotoğrafı olanların
     üstüne görsel konuyor. Tablo yoksa ya da ulaşılamazsa hiçbir şey
     olmuyor, zemin kalıyor. */
  async function gorselleriBagla() {
    if (typeof PB_Data === 'undefined' || !PB_Data.getStoneImages) return;

    let harita = {};
    try {
      harita = await PB_Data.getStoneImages();
    } catch (e) {
      return;
    }

    document.querySelectorAll('[data-tas-gorsel]').forEach(kap => {
      const url = harita[kap.dataset.tasGorsel];
      if (!url) return;

      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('load', () => {
        // Harf yalnız fotoğraf gerçekten geldiğinde kalkıyor; kırık
        // bağlantıda boş kutu değil yine renk zemini görünüyor.
        const harf = kap.querySelector('.tas-kart-harf, .tas-kapak-harf');
        if (harf) harf.remove();
      }, { once: true });
      img.src = url;
      kap.appendChild(img);
    });
  }

  /* ──────────── Arama ve harf filtresi ──────────── */
  function aramaKur() {
    const girdi = document.getElementById('tas-ara');
    const izgara = document.getElementById('tas-izgara');
    if (!girdi || !izgara) return;

    const kartlar = [...izgara.querySelectorAll('.tas-kart')];
    const sayac = document.getElementById('tas-sonuc-sayisi');
    const harfler = [...document.querySelectorAll('.tas-harf')];

    // Her kartın aranabilir metnini bir kez hesapla
    const dizin = kartlar.map(kart => ({
      el: kart,
      harf: kart.dataset.harf || '',
      metin: normalize([
        kart.dataset.ad,
        kart.dataset.anahtar,   // İngilizce/alternatif yazımlar
        kart.textContent
      ].join(' '))
    }));

    let aktifHarf = null;
    let bosMesaj = null;

    function suz() {
      const q = normalize(girdi.value);
      let gorunen = 0;

      dizin.forEach(k => {
        const metinUyar = !q || k.metin.indexOf(q) !== -1;
        // Arama yazılmışsa harf filtresi devre dışı — aradığı taş başka
        // harfteyse "sonuç yok" demek kullanıcıyı şaşırtıyordu.
        const harfUyar = !aktifHarf || q ? true : k.harf === aktifHarf;
        const goster = metinUyar && harfUyar;
        k.el.hidden = !goster;
        if (goster) gorunen++;
      });

      if (sayac) {
        if (q) sayac.textContent = gorunen + ' taş bulundu';
        else if (aktifHarf) sayac.textContent = aktifHarf + ' harfiyle başlayan ' + gorunen + ' taş';
        else sayac.textContent = '';
      }

      if (!gorunen) {
        if (!bosMesaj) {
          bosMesaj = document.createElement('li');
          bosMesaj.className = 'tas-bos';
          izgara.appendChild(bosMesaj);
        }
        bosMesaj.textContent = '"' + girdi.value.trim() + '" için taş bulunamadı.';
        bosMesaj.hidden = false;
      } else if (bosMesaj) {
        bosMesaj.hidden = true;
      }
    }

    girdi.addEventListener('input', suz);

    harfler.forEach(btn => {
      btn.addEventListener('click', () => {
        const harf = btn.dataset.harf || null;
        aktifHarf = (aktifHarf === harf) ? null : harf;
        harfler.forEach(b => b.classList.toggle('is-active', b.dataset.harf === aktifHarf));
        girdi.value = '';
        suz();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    gorselleriBagla();
    aramaKur();
  });
})();
