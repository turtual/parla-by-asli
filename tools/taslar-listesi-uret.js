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

const KOK = path.join(__dirname, '..');
const VERI = path.join(KOK, 'data');
const CIKTI = path.join(KOK, 'assets', 'taslar-listesi.js');

function taslariOku() {
  const hepsi = [];
  for (const dosya of fs.readdirSync(VERI).filter(f => f.endsWith('.json'))) {
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
const RENK_SOZLUGU = [
  [/lacivert|koyu mavi/i, '#2A3D6B'],
  [/gök mavi|açık mavi|mavi-yeşil|turkuaz/i, '#6FA8B5'],
  [/mavi/i, '#4A6FA5'],
  [/mor|lila|eflatun/i, '#7D6493'],
  [/pembe|gül/i, '#C58B93'],
  [/kırmızı|kızıl/i, '#8E3B34'],
  [/turuncu|amber|bal/i, '#B4763C'],
  [/sarı|altın/i, '#B79A4E'],
  [/yeşil/i, '#4F7358'],
  [/siyah|antrasit/i, '#2B2B2E'],
  [/beyaz|krem|süt/i, '#D9CFC2'],
  [/gri|gümüş/i, '#8A8A8F'],
  [/kahve|bej|toprak/i, '#8A6F55'],
  [/şeffaf|renksiz|berrak/i, '#C3C9CC']
];

function renkBul(tas) {
  const metin = (tas.kimlik && (tas.kimlik['Renk'] || tas.kimlik['renk'])) || '';
  for (const [kalip, renk] of RENK_SOZLUGU) {
    if (kalip.test(metin)) return renk;
  }
  return '#9A8B7A'; // eşleşmedi: nötr taş tonu
}

/** Özeti kart altına sığacak kadar kısaltır (cümle sonunda keser). */
function kisaOzet(ozet, sinir = 72) {
  const d = String(ozet || '').trim();
  if (d.length <= sinir) return d;
  const kesik = d.slice(0, sinir);
  const son = Math.max(kesik.lastIndexOf(' '), kesik.lastIndexOf(','));
  return (son > 30 ? kesik.slice(0, son) : kesik).trim() + '…';
}

const taslar = taslariOku()
  .map(t => ({
    slug: t.slug,
    ad: t.ad,
    ozet: kisaOzet(t.ozet),
    renk: renkBul(t),
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
`;

fs.writeFileSync(CIKTI, icerik, 'utf8');
console.log(`assets/taslar-listesi.js yazıldı — ${taslar.length} taş, ${(icerik.length / 1024).toFixed(1)} KB`);
