/**
 * Parla By Aslı — Müşteriye sipariş onay e-postası (Resend)
 *
 * NEDEN BU DOSYA VAR
 * Siparişler Formspree'ye gidiyor ama Formspree'nin müşteriye otomatik
 * yanıt gönderme özelliği ücretli planda. Müşterinin elinde sipariş
 * kaydı kalmıyordu; IBAN'ı yalnız teşekkür sayfasında görüyordu ve o
 * sayfayı kapatınca ödeme bilgisi gidiyordu.
 *
 * Bu fonksiyon o boşluğu kapatıyor: sipariş özetini ve ödeme bilgisini
 * müşterinin kendi e-postasına yolluyor.
 *
 * KURULUM (bir kez)
 *   Vercel → proje → Settings → Environment Variables
 *     RESEND_API_KEY = re_...        (Resend → API Keys)
 *   Gönderici alan adı parlabyasli.com Resend'de doğrulanmış durumda.
 *
 * GÜVENLİK
 * API anahtarı YALNIZ burada, sunucuda. Tarayıcıya hiç gitmiyor.
 * Uç nokta herkese açık olduğu için kötüye kullanımı zorlaştıran
 * kontroller var: yalnız POST, yalnız kendi sitemizden gelen istekler,
 * katı alan doğrulaması ve ürün sayısı sınırı. Bunlar caydırıcı; tam
 * koruma için ileride oran sınırlama (rate limit) eklenebilir.
 *
 * IBAN BURADA DA YAZILI — assets/legal-info.js ile AYNI OLMALI.
 * Bilerek müşteriden (tarayıcıdan) alınmıyor: saldırgan sahte bir IBAN
 * POST edip bizim adımıza müşteriye yanlış hesap yollayabilirdi.
 */

const ODEME = {
  hesapAdi: 'Ali Salihoğlu',
  iban: 'TR16 0015 7000 0000 0206 5325 21',
  bankaAdi: 'Enpara Bank A.Ş.'
};

const GONDERICI = 'Parla By Aslı <siparis@parlabyasli.com>';
const YANIT_ADRESI = 'siparis.parlabyasli@outlook.com';

/* İsteğin kendi sitemizden geldiğini doğrular. Tarayıcı Origin başlığını
   sahteleyemez; script dışı istemciler sahteleyebilir ama bu kontrol
   rastgele kötüye kullanımı eler. */
const IZINLI_KOKENLER = [
  'https://parlabyasli.com',
  'https://www.parlabyasli.com'
];

function kacar(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function paraYaz(n) {
  const sayi = Number(n);
  if (!isFinite(sayi)) return '';
  return new Intl.NumberFormat('tr-TR').format(sayi) + ' ₺';
}

function gecerliEposta(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
}

function epostaGovdesi(s) {
  const satirlar = s.items.map(u => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #EFE9E0;">
        ${kacar(u.name)}<br>
        <span style="color:#756B5F;font-size:13px;">Adet: ${kacar(u.quantity)}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #EFE9E0;text-align:right;white-space:nowrap;">
        ${kacar(paraYaz(u.price * u.quantity))}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="tr"><body style="margin:0;padding:24px;background:#F5F1EA;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14110E;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;">

    <p style="margin:0 0 4px;letter-spacing:.12em;font-size:11px;color:#756B5F;text-transform:uppercase;">Parla By Aslı</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:500;">Siparişin alındı</h1>

    <p style="margin:0 0 20px;line-height:1.6;">
      Merhaba ${kacar(s.ad)}, siparişin bize ulaştı. Ödemeni aşağıdaki hesaba
      yaptığında siparişin hazırlanmaya başlıyor.
    </p>

    <p style="margin:0 0 20px;font-size:14px;">
      <strong>Sipariş numaran:</strong>
      <span style="font-family:ui-monospace,Menlo,monospace;">${kacar(s.orderId)}</span>
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;">${satirlar}
      <tr>
        <td style="padding:10px 0 2px;color:#756B5F;">Ara toplam</td>
        <td style="padding:10px 0 2px;text-align:right;">${kacar(paraYaz(s.subtotal))}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;color:#756B5F;">Kargo</td>
        <td style="padding:2px 0;text-align:right;">${s.shipping > 0 ? kacar(paraYaz(s.shipping)) : 'Ücretsiz'}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:600;border-top:1px solid #14110E;">Toplam</td>
        <td style="padding:8px 0;text-align:right;font-weight:600;border-top:1px solid #14110E;">${kacar(paraYaz(s.total))}</td>
      </tr>
    </table>

    <div style="margin:24px 0;padding:18px;background:#F5F1EA;border-radius:8px;">
      <p style="margin:0 0 12px;letter-spacing:.08em;font-size:11px;color:#756B5F;text-transform:uppercase;">Ödeme — Havale / EFT</p>
      <p style="margin:0 0 6px;font-size:14px;"><span style="color:#756B5F;">Hesap adı:</span> ${kacar(ODEME.hesapAdi)}</p>
      <p style="margin:0 0 6px;font-size:15px;font-family:ui-monospace,Menlo,monospace;letter-spacing:.03em;">${kacar(ODEME.iban)}</p>
      <p style="margin:0;font-size:14px;"><span style="color:#756B5F;">Banka:</span> ${kacar(ODEME.bankaAdi)}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#756B5F;line-height:1.6;">
        Açıklama kısmına <strong>sipariş numaranı</strong> yazmayı unutma.
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:#756B5F;line-height:1.6;">
      En geç 1 iş günü içinde seninle iletişime geçeceğiz.
      Sorun olursa bu e-postayı yanıtlayabilirsin.
    </p>

  </div>
</body></html>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ hata: 'Yalnız POST' });
  }

  const koken = req.headers.origin || '';
  if (koken && !IZINLI_KOKENLER.includes(koken)) {
    return res.status(403).json({ hata: 'İzinsiz köken' });
  }

  const anahtar = process.env.RESEND_API_KEY;
  if (!anahtar) {
    /* Anahtar yoksa sipariş akışını BOZMUYORUZ: müşteri zaten teşekkür
       sayfasında ödeme bilgisini görüyor ve sipariş Formspree'ye düştü. */
    console.error('RESEND_API_KEY tanımsız — onay e-postası gönderilmedi.');
    return res.status(200).json({ gonderildi: false, sebep: 'yapilandirma-eksik' });
  }

  let g = req.body;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch (e) { g = null; } }
  if (!g || typeof g !== 'object') return res.status(400).json({ hata: 'Geçersiz gövde' });

  if (!gecerliEposta(g.email)) return res.status(400).json({ hata: 'Geçersiz e-posta' });
  if (!g.orderId || String(g.orderId).length > 40) return res.status(400).json({ hata: 'Geçersiz sipariş no' });

  const hamUrunler = Array.isArray(g.items) ? g.items.slice(0, 50) : [];
  if (!hamUrunler.length) return res.status(400).json({ hata: 'Ürün yok' });

  const items = hamUrunler.map(u => ({
    name: String(u && u.name || '').slice(0, 120),
    quantity: Math.max(1, Math.min(99, parseInt(u && u.quantity, 10) || 1)),
    price: Number(u && u.price) || 0
  }));

  const siparis = {
    orderId: String(g.orderId),
    ad: String(g.ad || '').slice(0, 60),
    items,
    subtotal: Number(g.subtotal) || 0,
    shipping: Number(g.shipping) || 0,
    total: Number(g.total) || 0
  };

  try {
    const cevap = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + anahtar,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: GONDERICI,
        to: [g.email],
        reply_to: YANIT_ADRESI,
        subject: `Siparişin alındı — ${siparis.orderId}`,
        html: epostaGovdesi(siparis)
      })
    });

    if (!cevap.ok) {
      const metin = await cevap.text();
      console.error('Resend hatası', cevap.status, metin.slice(0, 300));
      return res.status(502).json({ gonderildi: false, sebep: 'saglayici-hatasi' });
    }

    return res.status(200).json({ gonderildi: true });
  } catch (e) {
    console.error('Onay e-postası gönderilemedi:', e && e.message);
    return res.status(502).json({ gonderildi: false, sebep: 'ag-hatasi' });
  }
};
