/**
 * Parla By Aslı — Hesap sayfası (/hesap/)
 *
 * İki durum var: oturum yoksa giriş formu, varsa hesap içeriği
 * (siparişler + favoriler). E-posta linkiyle dönüldüğünde Supabase
 * oturumu adres çubuğundaki token'dan kendisi kuruyor; biz yalnızca
 * onAuthStateChange ile haberdar olup ekranı tazeliyoruz.
 */

(function () {
  'use strict';

  const girisBolumu = document.getElementById('giris-bolumu');
  const hesapBolumu = document.getElementById('hesap-bolumu');
  const girisForm = document.getElementById('giris-form');
  const girisEmail = document.getElementById('giris-email');
  const girisBtn = document.getElementById('giris-btn');
  const girisMesaj = document.getElementById('giris-mesaj');
  const hesapEposta = document.getElementById('hesap-eposta');
  const cikisBtn = document.getElementById('cikis-btn');
  const baslik = document.getElementById('hesap-baslik');
  const altBaslik = document.getElementById('hesap-alt');
  const siparisListesi = document.getElementById('siparis-listesi');
  const favoriListesi = document.getElementById('favori-listesi');

  /**
   * Giriş bitince dönülecek sayfa: kullanıcı siteden hangi sayfadan
   * geldiyse orası. Böylece bir ürüne yorum yazmak için giriş yapan kişi
   * ürüne geri döner, işi bölünmez.
   *
   * Ayrı bir yerde saklamıyoruz (çerez/localStorage yok): kod ile giriş
   * aynı sayfa açıkken tamamlandığı için değişken yeterli.
   *
   * null kalırsa hesap sayfasında kalınır — mail linkiyle gelindiğinde
   * (referrer mail istemcisi) veya doğrudan /hesap/ açıldığında böyle olur;
   * o kişi zaten hesabını görmek istemiştir.
   */
  const donusAdresi = (function () {
    try {
      if (!document.referrer) return null;
      const r = new URL(document.referrer);
      if (r.origin !== window.location.origin) return null;   // dış site / mail
      if (r.pathname.startsWith('/hesap')) return null;        // kendi sayfamız
      return r.href;
    } catch { return null; }
  })();

  let baslangictaGirisliydi = false;

  function girisSonrasiYonlendir() {
    if (!donusAdresi) return false;
    window.location.href = donusAdresi;
    return true;
  }

  const DURUM_ADI = {
    pending: 'Bekliyor',
    confirmed: 'Onaylandı',
    producing: 'Üretimde',
    shipped: 'Kargoda',
    delivered: 'Teslim edildi',
    cancelled: 'İptal edildi'
  };

  function mesajGoster(el, metin, tur) {
    el.textContent = metin;
    el.className = 'hesap-mesaj' + (tur ? ' is-' + tur : '');
    el.hidden = false;
  }

  function tarihYaz(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return ''; }
  }

  /* ──────────── Giriş ──────────── */

  const kodForm = document.getElementById('kod-form');
  const kodInput = document.getElementById('kod-input');
  const kodBtn = document.getElementById('kod-btn');
  const kodMesaj = document.getElementById('kod-mesaj');

  // Kodu doğrularken hangi adrese gönderildiğini bilmemiz gerekiyor
  let bekleyenEposta = '';

  girisForm.addEventListener('submit', async e => {
    e.preventDefault();
    girisBtn.disabled = true;
    girisBtn.textContent = 'GÖNDERİLİYOR…';
    girisMesaj.hidden = true;

    const sonuc = await PB_Account.girisLinkiGonder(girisEmail.value);

    girisBtn.disabled = false;
    girisBtn.textContent = 'GİRİŞ LİNKİ GÖNDER';

    if (sonuc.hata) {
      mesajGoster(girisMesaj, sonuc.hata, 'hata');
      return;
    }

    mesajGoster(girisMesaj, sonuc.mesaj, 'basari');
    bekleyenEposta = sonuc.eposta;
    kodForm.hidden = false;
    kodInput.focus();
  });

  kodForm.addEventListener('submit', async e => {
    e.preventDefault();
    kodBtn.disabled = true;
    kodBtn.textContent = 'KONTROL EDİLİYOR…';
    kodMesaj.hidden = true;

    // Kutudaki adres yedek: sayfa yenilenip bekleyenEposta kaybolursa
    // kullanıcı kodu boşuna girmiş olmasın.
    const adres = bekleyenEposta || girisEmail.value;
    const sonuc = await PB_Account.kodDogrula(adres, kodInput.value);

    kodBtn.disabled = false;
    kodBtn.textContent = 'GİRİŞ YAP';

    if (sonuc.hata) {
      mesajGoster(kodMesaj, sonuc.hata, 'hata');
      return;
    }
    mesajGoster(kodMesaj, sonuc.mesaj, 'basari');
    // Geldiği sayfaya dön; yoksa onDegisim hesap ekranını açacak
    girisSonrasiYonlendir();
  });

  cikisBtn.addEventListener('click', async () => {
    await PB_Account.cikis();
    window.location.reload();
  });

  /* ──────────── Siparişler ──────────── */

  async function siparisleriYaz() {
    const siparisler = await PB_Account.siparislerim();
    siparisListesi.innerHTML = '';

    if (!siparisler.length) {
      siparisListesi.innerHTML =
        '<p class="hesap-bos">Henüz siparişin yok. ' +
        '<a class="story-link" href="../index.html">Ürünlere göz at</a></p>';
      return;
    }

    siparisler.forEach(s => {
      const kart = PB_h('div', { class: 'hesap-siparis' });

      const ust = PB_h('div', { class: 'hesap-siparis-ust' });
      ust.append(
        PB_h('strong', {}, s.order_code || '—'),
        PB_h('span', { class: 'hesap-rozet' }, DURUM_ADI[s.status] || s.status || '—')
      );

      const alt = PB_h('div', { class: 'hesap-siparis-alt' });
      const adet = Array.isArray(s.items) ? s.items.length : 0;
      alt.append(
        PB_h('span', {}, tarihYaz(s.created_at)),
        PB_h('span', {}, adet + ' ürün'),
        PB_h('span', {}, formatPrice(s.total || 0))
      );

      kart.append(ust, alt);
      siparisListesi.append(kart);
    });
  }

  /* ──────────── Favoriler ──────────── */

  async function favorileriYaz() {
    // Önce sunucuyla birleştir ki başka cihazdakiler de gelsin
    await PB_Account.favorileriEsitle();

    const idler = PB_Favs.read();
    favoriListesi.innerHTML = '';

    if (!idler.length) {
      favoriListesi.innerHTML = '<p class="hesap-bos">Henüz favorin yok.</p>';
      return;
    }

    const tumu = await getProducts({});
    const secilenler = tumu.filter(p => idler.includes(p.id));

    if (!secilenler.length) {
      favoriListesi.innerHTML =
        '<p class="hesap-bos">Favorilerindeki ürünler artık satışta değil.</p>';
      return;
    }

    secilenler.forEach((p, i) => favoriListesi.append(renderProductCard(p, i)));
  }

  /* ──────────── Ekran durumu ──────────── */

  async function ekraniTazele(user) {
    if (user) {
      girisBolumu.hidden = true;
      hesapBolumu.hidden = false;
      baslik.textContent = 'Hesabım';
      altBaslik.textContent = 'Siparişlerin ve favoriler burada.';
      hesapEposta.textContent = user.email || '';
      await Promise.all([siparisleriYaz(), favorileriYaz()]);
    } else {
      girisBolumu.hidden = false;
      hesapBolumu.hidden = true;
      baslik.textContent = 'Giriş yap';
      altBaslik.textContent = 'Şifre yok — e-postana gönderdiğimiz linke tıklaman yeterli.';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const mevcut = await PB_Account.kullanici();
    baslangictaGirisliydi = !!mevcut;
    await ekraniTazele(mevcut);

    // E-posta linkinden dönüldüğünde oturum biraz sonra kurulabiliyor
    PB_Account.onDegisim(user => {
      // Yalnız YENİ bir giriş olduysa yönlendir. Zaten girişliyken sayfayı
      // açan kişiyi geldiği yere geri atmak, hesabını görmesini engellerdi.
      if (user && !baslangictaGirisliydi && girisSonrasiYonlendir()) return;
      ekraniTazele(user);
    });
  });
})();
