/**
 * Parla By Aslı — Taş fotoğraflarını Wikimedia Commons'tan indir
 *
 * Çalıştır:  node tools/tas-gorsel-indir.js
 *            node tools/tas-gorsel-indir.js ametist inci    (yalnız bunlar)
 *
 * NEDEN BÖYLE
 * 49 taşın hiçbirinin fotoğrafı yoktu. Marka kendi çekimlerini yapana kadar
 * ansiklopedi sayfaları renk zeminiyle duruyordu. Buradaki fotoğraflar
 * geçici çözüm: lisansı uygun, ham (işlenmemiş) mineral örnekleri.
 *
 * LİSANS
 * Yalnızca kamu malı / CC0 / CC BY / CC BY-SA kabul ediliyor; kaynağı ve
 * lisansı data/tas-gorselleri.json dosyasına yazılıyor ve taş sayfasında
 * künye olarak gösteriliyor. Lisansı belirsiz hiçbir görsel indirilmiyor.
 *
 * BOYUT
 * Commons'ın kendi küçültme servisinden 900px genişlikte alınıyor; yerelde
 * yeniden boyutlandırmaya gerek kalmıyor. Kare kırpmayı CSS yapıyor
 * (object-fit: cover), yani kaynak oranı ne olursa olsun kartlar aynı.
 *
 * Marka kendi fotoğrafını yükleyince (panel → Taş Görselleri) o kazanır;
 * buradaki dosyalar yalnız veritabanında kayıt yoksa kullanılıyor.
 */

const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const CIKTI = path.join(KOK, 'assets', 'img', 'taslar');
const KUNYE = path.join(KOK, 'data', 'tas-gorselleri.json');
const GENISLIK = 900;

const UA = 'ParlaByAsliSite/1.0 (https://parlabyasli.com; parlabyasli@outlook.com)';

/* Kabul edilen lisanslar. "Belirsiz" olan hiçbir görsel alınmıyor —
   ticari bir sitede kaynağı bilinmeyen fotoğraf kullanmak risk. */
const IYI_LISANS = /^(cc0|cc by|cc by-sa|public domain|pd)/i;

/* Aramayı daraltan ekler: mücevher değil, ham taş isteniyor. */
const ARAMA_EKI = 'mineral specimen';

/* Otomatik arama yanlış taşı getiren ya da hiç sonuç bulamayan taşlar için
   elle yazılmış arama terimleri. Örnekler:
     · "sedef" araması bir KELEBEK getiriyordu (Protogoniomorpha parhassus,
       İngilizce halk adı "forest mother-of-pearl")
     · "amazonit" sonucunda pembe pezzottaite baskındı
     · "oniks" mağara travertenini getiriyordu
   Bu listedeki taşlarda ad kontrolü atlanır; terim zaten kesin. */
const ARAMA_OZEL = {
  amazonit: 'amazonite microcline green mineral',
  'dumanli-kuvars': 'smoky quartz dark crystal point',
  mercan: 'Corallium rubrum red coral',
  oniks: 'black chalcedony onyx polished stone',
  sedef: 'nacre mother of pearl shell interior',
  yesim: 'nephrite jade green stone',
  iolit: 'iolite cordierite gemstone',
  'kaya-kristali': 'rock crystal quartz cluster',
  peridot: 'peridot olivine crystal',
  pirit: 'pyrite cubic crystal mineral',
  kalsit: 'calcite crystal mineral specimen',
  angelit: 'anhydrite mineral specimen',
  'gul-kuvars': 'rose quartz mineral',
  inci: 'pearl nacre oyster shell'
};

function taslariOku() {
  const hepsi = [];
  for (const dosya of fs.readdirSync(path.join(KOK, 'data')).filter(f => /^taslar.*\.json$/.test(f))) {
    const ham = JSON.parse(fs.readFileSync(path.join(KOK, 'data', dosya), 'utf8'));
    const dizi = Array.isArray(ham) ? ham : (ham.taslar || Object.values(ham).find(Array.isArray));
    for (const t of dizi) hepsi.push(t);
  }
  return hepsi;
}

/**
 * Aramada kullanılacak İngilizce ad.
 * Taş verisindeki eşleşme anahtarları zaten İngilizce karşılığı içeriyor
 * (ör. ametist → "amethyst"); ASCII olan ve slug'dan farklı ilkini seçiyoruz.
 */
function ingilizceAd(tas) {
  const adaylar = (tas.eslesme || []).filter(a =>
    /^[a-z][a-z\s'-]+$/i.test(a) && a.toLowerCase() !== tas.slug.replace(/-/g, ' '));
  // En uzun aday genelde tam İngilizce ad ("rose quartz" > "quartz")
  adaylar.sort((a, b) => b.length - a.length);
  return adaylar[0] || null;
}

async function commonsAra(sorgu) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json'
    + '&generator=search&gsrnamespace=6&gsrlimit=8'
    + '&gsrsearch=' + encodeURIComponent(sorgu)
    + '&prop=imageinfo&iiprop=url|extmetadata|size|mime'
    + '&iiurlwidth=' + GENISLIK;

  const cevap = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!cevap.ok) throw new Error('Commons ' + cevap.status);
  const veri = await cevap.json();
  return Object.values(veri.query?.pages || {});
}

function metinTemizle(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Bir arama sonucunu değerlendirir. Uygun değilse null döner.
 * Elemeler: fotoğraf olmayanlar (pdf, svg, harita), lisansı belirsizler,
 * adı taşla ilgisiz görünenler.
 */
function aday(sayfa, tas, ingAd, adKontrolunuAtla) {
  const ii = sayfa.imageinfo && sayfa.imageinfo[0];
  if (!ii) return null;
  if (!/^image\/(jpeg|png)$/.test(ii.mime || '')) return null;
  if (!ii.thumburl) return null;

  const m = ii.extmetadata || {};
  const lisans = metinTemizle(m.LicenseShortName && m.LicenseShortName.value);
  if (!IYI_LISANS.test(lisans)) return null;

  /* Dosya adı taşın adını (TR ya da EN) içermeli. Commons araması
     bazen konuyla alakasız ama metninde geçen dosyalar döndürüyor;
     bu filtre "kitap sayfası", "maden haritası" gibi sonuçları eliyor. */
  const baslik = sayfa.title.toLowerCase();
  const anahtarlar = [tas.slug.replace(/-/g, ' '), tas.ad.toLowerCase(), ingAd]
    .filter(Boolean)
    .map(s => s.toLowerCase());
  if (!adKontrolunuAtla && !anahtarlar.some(a => baslik.includes(a.split(' ')[0]))) return null;

  return {
    dosya: sayfa.title.replace(/^File:/, ''),
    url: ii.thumburl,
    sayfaUrl: ii.descriptionurl,
    lisans,
    yazar: metinTemizle(m.Artist && m.Artist.value) || 'Bilinmiyor'
  };
}

async function indir(url, hedef) {
  const cevap = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!cevap.ok) throw new Error('indirilemedi ' + cevap.status);
  const veri = Buffer.from(await cevap.arrayBuffer());
  if (veri.length < 5000) throw new Error('dosya şüpheli küçük');
  fs.writeFileSync(hedef, veri);
  return veri.length;
}

(async function () {
  const istenen = process.argv.slice(2);
  const taslar = taslariOku().filter(t => !istenen.length || istenen.includes(t.slug));

  fs.mkdirSync(CIKTI, { recursive: true });
  const kunye = fs.existsSync(KUNYE) ? JSON.parse(fs.readFileSync(KUNYE, 'utf8')) : {};

  let alinan = 0, atlanan = 0;

  for (const tas of taslar) {
    const hedef = path.join(CIKTI, tas.slug + '.jpg');
    if (fs.existsSync(hedef) && kunye[tas.slug]) { atlanan++; continue; }

    const ingAd = ingilizceAd(tas);
    const ozel = ARAMA_OZEL[tas.slug];
    const sorgular = ozel ? [ozel] : [
      (ingAd || tas.ad) + ' ' + ARAMA_EKI,
      (ingAd || tas.ad) + ' rough stone',
      (ingAd || tas.ad)
    ];

    let secilen = null;
    for (const sorgu of sorgular) {
      try {
        const sonuclar = await commonsAra(sorgu);
        for (const s of sonuclar) {
          const a = aday(s, tas, ingAd, !!ozel);
          if (a) { secilen = a; break; }
        }
      } catch (e) {
        console.log('  ! ' + tas.ad + ': arama hatası — ' + e.message);
      }
      if (secilen) break;
      await new Promise(r => setTimeout(r, 200));   // Commons'a nazik davran
    }

    if (!secilen) {
      console.log('— ' + tas.ad + ': uygun lisanslı fotoğraf bulunamadı');
      atlanan++;
      continue;
    }

    try {
      const boyut = await indir(secilen.url, hedef);
      kunye[tas.slug] = {
        dosya: secilen.dosya,
        kaynak: secilen.sayfaUrl,
        lisans: secilen.lisans,
        yazar: secilen.yazar
      };
      console.log('✓ ' + tas.ad + ' — ' + secilen.lisans + ' — ' + Math.round(boyut / 1024) + ' KB');
      alinan++;
    } catch (e) {
      console.log('! ' + tas.ad + ': ' + e.message);
      atlanan++;
    }

    await new Promise(r => setTimeout(r, 250));
  }

  fs.writeFileSync(KUNYE, JSON.stringify(kunye, null, 2) + '\n', 'utf8');
  console.log('\n' + alinan + ' fotoğraf indirildi, ' + atlanan + ' taş atlandı.');
  console.log('Künye: data/tas-gorselleri.json');
  console.log('Sonra: node tools/taslar-listesi-uret.js && node tools/taslar-uret.js');
})();
