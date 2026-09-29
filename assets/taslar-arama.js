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
    let harita = {};
    // Panelden yüklenmiş fotoğraflar; tablo yoksa yerel dosyalarla devam
    if (typeof PB_Data !== 'undefined' && PB_Data.getStoneImages) {
      try { harita = await PB_Data.getStoneImages(); } catch (e) { harita = {}; }
    }

    const kok = document.documentElement.getAttribute('data-kok') || '';
    const dizin = {};
    (window.PB_TASLAR || []).forEach(t => { dizin[t.slug] = t; });

    document.querySelectorAll('[data-tas-gorsel]').forEach(kap => {
      const slug = kap.dataset.tasGorsel;
      const tas = dizin[slug];

      /* Öncelik sırası: panelden yüklenen fotoğraf → depodaki hazır
         fotoğraf → hiçbiri (renk zemini kalır). Marka kendi çekimini
         yükleyince otomatik olarak o geçerli oluyor. */
      const url = harita[slug] || (tas && tas.gorsel ? kok + tas.gorsel : null);
      if (!url) return;

      const kapakMi = kap.classList.contains('tas-kapak-gorsel');

      const img = document.createElement('img');
      img.alt = '';
      // Detay sayfasının kapağı sayfanın en büyük görseli: tembel
      // yüklenirse ilk boyama gecikiyor. Listedeki kartlar tembel kalıyor.
      img.loading = kapakMi ? 'eager' : 'lazy';
      if (kapakMi) img.fetchPriority = 'high';
      img.decoding = 'async';
      img.addEventListener('load', () => {
        // Harf yalnız fotoğraf gerçekten geldiğinde kalkıyor; kırık
        // bağlantıda boş kutu değil yine renk zemini görünüyor.
        const harf = kap.querySelector('.tas-kart-harf, .tas-kapak-harf');
        if (harf) harf.remove();
      }, { once: true });
      img.src = url;
      kap.appendChild(img);

      /* Lisans künyesi. Wikimedia'dan gelen fotoğrafların çoğu CC BY-SA:
         kullanmak serbest ama kaynağı ve fotoğrafçıyı yazmak zorunlu.
         Yalnız taş DETAY sayfasındaki büyük görselin altına konuyor;
         listedeki küçük kartlarda yer kaplamasın diye orada yok —
         oradan tıklayınca zaten künyeli sayfaya geliniyor.
         Panelden yüklenen kendi fotoğrafımızda künye çıkmıyor. */
      if (kap.classList.contains('tas-kapak-gorsel') && !harita[slug] && tas && tas.kunye) {
        kunyeYaz(kap, tas.kunye);
      }
    });
  }

  function kunyeYaz(kap, kunye) {
    if (kap.parentElement.querySelector('.tas-kunye')) return;

    const p = document.createElement('p');
    p.className = 'tas-kunye';

    const yazar = String(kunye.yazar || '').replace(/s+/g, ' ').trim().slice(0, 60);
    p.append(document.createTextNode('Fotoğraf: ' + (yazar || 'Wikimedia Commons') + ' · '));

    const bag = document.createElement('a');
    bag.href = kunye.kaynak;
    bag.target = '_blank';
    bag.rel = 'noopener noreferrer';
    bag.textContent = kunye.lisans;
    p.append(bag);

    kap.parentElement.appendChild(p);
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
      niyetler: (kart.dataset.niyet || '').split(' ').filter(Boolean),
      renk: kart.dataset.renk || '',
      metin: normalize([
        kart.dataset.ad,
        kart.dataset.anahtar,   // İngilizce/alternatif yazımlar
        kart.textContent
      ].join(' '))
    }));

    let aktifHarf = null;
    let aktifNiyet = null;
    let aktifRenk = null;
    let bosMesaj = null;

    const niyetBtnler = [...document.querySelectorAll('[data-niyet]')].filter(e => e.tagName === 'BUTTON');
    const renkBtnler = [...document.querySelectorAll('[data-renk]')].filter(e => e.tagName === 'BUTTON');
    const niyetEtiket = window.PB_TAS_NIYETLER || {};
    const renkEtiket = window.PB_TAS_RENKLER || {};

    function suz() {
      const q = normalize(girdi.value);
      let gorunen = 0;

      dizin.forEach(k => {
        const metinUyar = !q || k.metin.indexOf(q) !== -1;
        // Arama yazılmışsa diğer süzgeçler devre dışı — aradığı taş başka
        // harfte/niyette ise "sonuç yok" demek kullanıcıyı şaşırtıyordu.
        const harfUyar = (!aktifHarf || q) ? true : k.harf === aktifHarf;
        const niyetUyar = (!aktifNiyet || q) ? true : k.niyetler.indexOf(aktifNiyet) !== -1;
        const renkUyar = (!aktifRenk || q) ? true : k.renk === aktifRenk;
        const goster = metinUyar && harfUyar && niyetUyar && renkUyar;
        k.el.hidden = !goster;
        if (goster) gorunen++;
      });

      if (sayac) {
        if (q) sayac.textContent = gorunen + ' taş bulundu';
        else if (aktifNiyet) sayac.textContent = (niyetEtiket[aktifNiyet] || aktifNiyet) + ' için ' + gorunen + ' taş';
        else if (aktifRenk) sayac.textContent = (renkEtiket[aktifRenk] || aktifRenk) + ' tonlarında ' + gorunen + ' taş';
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

    /* Keşif seçenekleri tek seçimli ve birbirini sıfırlıyor: aynı anda hem
       niyet hem renk süzmek listeyi çoğu zaman boşaltıyordu. Aynı düğmeye
       ikinci kez basmak seçimi kaldırıyor. */
    function kesifSec(tur, deger) {
      aktifNiyet = (tur === 'niyet' && aktifNiyet !== deger) ? deger : null;
      aktifRenk = (tur === 'renk' && aktifRenk !== deger) ? deger : null;
      aktifHarf = null;
      girdi.value = '';

      niyetBtnler.forEach(b => b.classList.toggle('is-active', b.dataset.niyet === aktifNiyet));
      renkBtnler.forEach(b => b.classList.toggle('is-active', b.dataset.renk === aktifRenk));
      harfler.forEach(b => b.classList.remove('is-active'));

      suz();

      // Seçim yapınca liste görünür alana gelsin
      if (aktifNiyet || aktifRenk) {
        const liste = document.getElementById('tas-izgara');
        if (liste) liste.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }

    niyetBtnler.forEach(b => b.addEventListener('click', () => kesifSec('niyet', b.dataset.niyet)));
    renkBtnler.forEach(b => b.addEventListener('click', () => kesifSec('renk', b.dataset.renk)));

    harfler.forEach(btn => {
      btn.addEventListener('click', () => {
        const harf = btn.dataset.harf || null;
        aktifHarf = (aktifHarf === harf) ? null : harf;
        aktifNiyet = null;
        aktifRenk = null;
        harfler.forEach(b => b.classList.toggle('is-active', b.dataset.harf === aktifHarf));
        niyetBtnler.forEach(b => b.classList.remove('is-active'));
        renkBtnler.forEach(b => b.classList.remove('is-active'));
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
