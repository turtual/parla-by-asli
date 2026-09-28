/**
 * Parla By Aslı — sitemap.xml üret
 *
 * Sitedeki statik sayfaları tarayıp sitemap'i baştan yazar. Elle bakımlı
 * bir liste tutmak yerine dosya sisteminden okuyor: yeni bir kategori ya
 * da taş sayfası eklendiğinde unutulmuyor.
 *
 * Çalıştır:  node tools/sitemap-uret.js
 *
 * Ürün sayfaları (Aşama 3) eklendiğinde burada da listelenecek.
 */

const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const SITE = 'https://parlabyasli.com';

/* Sitemap'e girmeyecekler:
   - admin: yönetim paneli, aranmasın
   - odeme / tesekkurler / hesap: akışın içindeki sayfalar, arama sonucu olmaz
   - 404: hata sayfası */
const DISARIDA = new Set([
  'admin', 'node_modules', '.git', 'tools', 'data', 'db', 'assets',
  'odeme', 'tesekkurler', 'hesap'
]);

/* Öncelik ve tazelenme sıklığı: ana ticaret sayfaları sık, yasal metinler seyrek */
function agirlik(yol) {
  if (yol === '') return { oncelik: '1.0', siklik: 'weekly' };
  if (yol === 'urunler') return { oncelik: '0.9', siklik: 'daily' };
  if (['kolyeler', 'bileklikler', 'kupeler', 'setler'].includes(yol)) return { oncelik: '0.9', siklik: 'daily' };
  if (yol === 'taslar') return { oncelik: '0.8', siklik: 'monthly' };
  if (yol.startsWith('taslar/')) return { oncelik: '0.6', siklik: 'yearly' };
  if (yol.startsWith('yasal/')) return { oncelik: '0.3', siklik: 'yearly' };
  if (['hikayemiz', 'bakim-rehberi', 'sss', 'iletisim'].includes(yol)) return { oncelik: '0.7', siklik: 'monthly' };
  return { oncelik: '0.5', siklik: 'monthly' };
}

function sayfalar(dizin, onEk, toplam) {
  toplam = toplam || [];
  for (const ad of fs.readdirSync(dizin)) {
    if (DISARIDA.has(ad) || ad.startsWith('.')) continue;
    const tam = path.join(dizin, ad);
    if (fs.statSync(tam).isDirectory()) {
      if (fs.existsSync(path.join(tam, 'index.html'))) {
        toplam.push(onEk ? onEk + '/' + ad : ad);
      }
      sayfalar(tam, onEk ? onEk + '/' + ad : ad, toplam);
    }
  }
  return toplam;
}

const yollar = [''].concat(sayfalar(KOK, '').sort());

const satirlar = yollar.map(yol => {
  const { oncelik, siklik } = agirlik(yol);
  const adres = SITE + '/' + (yol ? yol + '/' : '');
  return `  <url>\n    <loc>${adres}</loc>\n    <changefreq>${siklik}</changefreq>\n    <priority>${oncelik}</priority>\n  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ÜRETİLMİŞ DOSYA — elle düzenleme. Yeniden üret: node tools/sitemap-uret.js -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${satirlar.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(KOK, 'sitemap.xml'), xml, 'utf8');
console.log('sitemap.xml yazıldı — ' + yollar.length + ' adres');
