/**
 * Parla By Aslı — Ortak kabuğu sayfalara bas
 *
 * tools/site-kabuk.js içindeki header/footer işaretlemesini sitedeki bütün
 * statik HTML sayfalarına yazar ve gereken betik etiketlerini ekler.
 *
 * Çalıştır:  node tools/kabuk-uygula.js
 *            node tools/kabuk-uygula.js --dene     (yazmadan ne olacağını göster)
 *
 * Menüye yeni bir bağlantı eklemek istediğinde site-kabuk.js'i düzenle,
 * sonra bunu çalıştır. Taş sayfaları ayrıca üretiliyor
 * (node tools/taslar-uret.js) ama o da aynı kaynaktan besleniyor.
 *
 * Yönetim paneline (admin/) dokunmaz: onun kendi arayüzü var.
 */

const fs = require('fs');
const path = require('path');
const { headerHtml, footerHtml } = require('./site-kabuk.js');

const KOK = path.join(__dirname, '..');
const DENEME = process.argv.includes('--dene');

/* Kabuğun basılmayacağı yerler: panelin kendi arayüzü, hata sayfası ve
   üretilmiş taş sayfaları (onları tools/taslar-uret.js yeniliyor). */
const ATLA = ['admin', 'node_modules', '.git', 'taslar'];

/* Sayfa hangi menü maddesinde "buradayız" göstersin */
const AKTIF_MENU = {
  'urunler/index.html': null,
  'kolyeler/index.html': 'kolyeler/',
  'bileklikler/index.html': 'bileklikler/',
  'kupeler/index.html': 'kupeler/',
  'setler/index.html': 'setler/',
  'hikayemiz/index.html': 'hikayemiz/'
};

/* Her sayfada bulunması gereken betikler. Zaten varsa tekrar eklenmiyor. */
/* content.js: üst şerit metnindeki *vurgu* işaretlerini biçimlendiren
   pbFormatInline burada. site-nav.js şeridi panelden beslediği için her
   sayfada gerekli. */
const GEREKLI_BETIKLER = ['assets/content.js', 'assets/site-nav.js'];

function htmlDosyalari(dizin, toplam) {
  toplam = toplam || [];
  for (const ad of fs.readdirSync(dizin)) {
    if (ATLA.includes(ad)) continue;
    const tam = path.join(dizin, ad);
    const bilgi = fs.statSync(tam);
    if (bilgi.isDirectory()) htmlDosyalari(tam, toplam);
    else if (ad.endsWith('.html')) toplam.push(tam);
  }
  return toplam;
}

/**
 * Bir bloğu (<header …>…</header>) yenisiyle değiştirir.
 * Basit dizi araması yeterli: işaretlemeyi biz ürettiğimiz için iç içe
 * aynı etiketten yok.
 */
function blokDegistir(kaynak, etiket, yeni) {
  const basKalip = new RegExp('[ \\t]*<' + etiket + '[^>]*class="site-' + etiket + '"[^>]*>');
  const eslesme = kaynak.match(basKalip);
  if (!eslesme) return null;

  const bas = eslesme.index;
  const kapanis = '</' + etiket + '>';
  const son = kaynak.indexOf(kapanis, bas);
  if (son === -1) return null;

  let sonrasi = kaynak.slice(son + kapanis.length);
  if (sonrasi.startsWith('\n')) sonrasi = sonrasi.slice(1);

  return kaynak.slice(0, bas) + yeni + sonrasi;
}

function betikEkle(kaynak, yol, u) {
  const tam = u + yol;
  if (kaynak.includes('src="' + tam + '"')) return kaynak;

  // Son </body>'den hemen önce
  const yer = kaynak.lastIndexOf('</body>');
  if (yer === -1) return kaynak;
  return kaynak.slice(0, yer) + '  <script src="' + tam + '"></script>\n' + kaynak.slice(yer);
}

let degisen = 0;
let atlanan = 0;

for (const dosya of htmlDosyalari(KOK)) {
  const goreli = path.relative(KOK, dosya).split(path.sep).join('/');
  if (goreli === '404.html') { atlanan++; continue; }

  const derinlik = goreli.split('/').length - 1;
  const u = '../'.repeat(derinlik);

  const ham = fs.readFileSync(dosya, 'utf8');
  const crlf = ham.includes('\r\n');
  let s = crlf ? ham.replace(/\r\n/g, '\n') : ham;
  const once = s;

  const yeniHeader = blokDegistir(s, 'header', headerHtml(derinlik, AKTIF_MENU[goreli]));
  if (yeniHeader) s = yeniHeader;

  const yeniFooter = blokDegistir(s, 'footer', footerHtml(derinlik));
  if (yeniFooter) s = yeniFooter;

  // Kök yolu HTML'e yaz: site-nav.js menüyü ve arama sonuçlarını buna göre kurar
  s = s.replace(/<html lang="tr"(?: data-kok="[^"]*")?>/, derinlik === 0
    ? '<html lang="tr">'
    : '<html lang="tr" data-kok="' + u + '">');

  for (const betik of GEREKLI_BETIKLER) s = betikEkle(s, betik, u);

  if (s === once) { atlanan++; continue; }

  if (!DENEME) fs.writeFileSync(dosya, crlf ? s.replace(/\n/g, '\r\n') : s, 'utf8');
  console.log((DENEME ? 'değişecek: ' : 'güncellendi: ') + goreli);
  degisen++;
}

console.log('\n' + degisen + ' sayfa' + (DENEME ? ' değişecek' : ' güncellendi') + ', ' + atlanan + ' sayfa dokunulmadı.');
