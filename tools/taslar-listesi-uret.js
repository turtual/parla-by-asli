/**
 * data/taslar*.json → assets/taslar-listesi.js
 *
 * Taş ansiklopedisinin tam metni statik sayfalara gömülü; site genelinde
 * ise yalnız küçük bir dizine ihtiyaç var:
 *   - anasayfadaki "Taşını Bul"
 *   - ürün → taş bağlantıları
 *   - taş listesi sayfasındaki arama
 *
 * 47 taşın tamamını her sayfaya yüklemek yerine sadece slug/ad/özet/eşleşme
 * alanlarını taşıyan tek bir dosya üretiliyor (~6 KB).
 *
 * Çalıştır:  node tools/taslar-listesi-uret.js
 */

const fs = require('fs');
const path = require('path');
// Taş rengi ve renk grubu tek kaynaktan (bkz. tools/tas-renk.js)
const { renkBul, renkGrubuBul } = require('./tas-renk.js');

const KOK = path.join(__dirname, '..');
const VERI = path.join(KOK, 'data');
const CIKTI = path.join(KOK, 'assets', 'taslar-listesi.js');
const GORSEL_DIZIN = path.join(KOK, 'assets', 'img', 'taslar');
const KUNYE_DOSYA = path.join(KOK, 'data', 'tas-gorselleri.json');
const KESIF_DOSYA = path.join(KOK, 'data', 'tas-kesif.json');

function taslariOku() {
  const hepsi = [];
  // Yalnız taş verisi dosyaları; data/ altında künye gibi başka JSON'lar da var
  for (const dosya of fs.readdirSync(VERI).filter(f => /^taslar.*.json$/.test(f))) {
    const ham = JSON.parse(fs.readFileSync(path.join(VERI, dosya), 'utf8'));
    const dizi = Array.isArray(ham) ? ham : (ham.taslar || Object.values(ham)[0]);
    for (const t of dizi) hepsi.push(t);
  }
  return hepsi;
}

/**
 * Kart zeminine taşın kendi rengini veriyoruz — fotoğraf yoksa uydurma
 * görsel yerine taşın gerçek renginden türeyen sade bir zemin çıksın diye.
 * Kaynak: taşın kimlik kartındaki "Renk" satırı.
 */

/** Özeti kart altına sığacak kadar kısaltır (cümle sonunda keser). */
function kisaOzet(ozet, sinir = 72) {
  const d = String(ozet || '').trim();
  if (d.length <= sinir) return d;
  const kesik = d.slice(0, sinir);
  const son = Math.max(kesik.lastIndexOf(' '), kesik.lastIndexOf(','));
  return (son > 30 ? kesik.slice(0, son) : kesik).trim() + '…';
}

/* Depodaki hazır taş fotoğrafları. Panelden yüklenen fotoğraf (stone_images)
   varsa o kazanır; burası yalnızca yedek. Fotoğrafı olmayan taşta hiçbir
   şey yazılmıyor ve site taşın kendi renginden zemini gösteriyor. */
const kunye = fs.existsSync(KUNYE_DOSYA)
  ? JSON.parse(fs.readFileSync(KUNYE_DOSYA, 'utf8'))
  : {};

/* Editorial keşif katmanı (kısa kimlik, niyet, renk grubu…). Ayrı dosyada
   duruyor: mineral bilgisi doğrulanabilir veri, burası markanın sesi.
   Bir taşta kayıt yoksa o alanlar hiç yazılmıyor ve site ilgili bölümü
   render etmiyor. */
const kesifHam = fs.existsSync(KESIF_DOSYA)
  ? JSON.parse(fs.readFileSync(KESIF_DOSYA, 'utf8'))
  : { taslar: {}, _niyetler: {}, _renkler: {} };

const kesif = kesifHam.taslar || {};

function yerelGorsel(slug) {
  return fs.existsSync(path.join(GORSEL_DIZIN, slug + '.jpg'))
    ? 'assets/img/taslar/' + slug + '.jpg'
    : null;
}

const taslar = taslariOku()
  .map(t => ({
    slug: t.slug,
    ad: t.ad,
    ozet: kisaOzet(t.ozet),
    renk: renkBul(t),
    gorsel: yerelGorsel(t.slug),
    // Liste ve keşif ekranının ihtiyaç duyduğu editorial alanlar.
    // Detay sayfasının uzun metinleri buraya girmiyor — onlar sayfaya
    // üretim anında gömülüyor, her sayfada 49 taşın metnini taşımayalım.
    kisaKimlik: (kesif[t.slug] && kesif[t.slug].kisaKimlik) || null,
    niyetler: (kesif[t.slug] && kesif[t.slug].niyetler) || [],
    burclar: (kesif[t.slug] && kesif[t.slug].burclar) || [],
    renkGrubu: (kesif[t.slug] && kesif[t.slug].renkGrubu) || renkGrubuBul(t),
    // Fotoğraf künyesi: taş sayfasında kaynak ve lisans gösteriliyor
    kunye: kunye[t.slug]
      ? { yazar: kunye[t.slug].yazar, lisans: kunye[t.slug].lisans, kaynak: kunye[t.slug].kaynak }
      : null,
    eslesme: t.eslesme || []
  }))
  .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

const icerik = `/**
 * Parla By Aslı — Taş dizini (ÜRETİLMİŞ DOSYA, ELLE DÜZENLEME)
 *
 * Kaynak: data/taslar*.json
 * Üretim: node tools/taslar-listesi-uret.js
 *
 * Taş metni değiştiğinde önce bu betiği, sonra tools/taslar-uret.js'i çalıştır.
 */
window.PB_TASLAR = ${JSON.stringify(taslar, null, 0)};

/* Keşif etiketleri: niyet ve renk anahtarlarının okunur karşılıkları. */
window.PB_TAS_NIYETLER = ${JSON.stringify(kesifHam._niyetler || {}, null, 0)};
window.PB_TAS_RENKLER = ${JSON.stringify(kesifHam._renkler || {}, null, 0)};
`;

fs.writeFileSync(CIKTI, icerik, 'utf8');
console.log(`assets/taslar-listesi.js yazıldı — ${taslar.length} taş, ${(icerik.length / 1024).toFixed(1)} KB`);
