/**
 * Parla By Aslı — Ürün Helper Fonksiyonları
 *
 * Eskiden: Sabit PRODUCTS array'i + senkron filtreleme
 * Şimdi:   Supabase'den async çekme, in-memory cache
 *
 * Kategoriler de artık kodda sabit değil: koleksiyon (üst, malzeme bazlı)
 * ve ürün tipi (alt segment) ikisi de admin panelinden yönetiliyor ve
 * Supabase'den çekiliyor. Eski sabit `CATEGORIES` dizisi kaldırıldı —
 * yerine await getProductTypes() kullan.
 *
 * Geriye uyumlu API:
 *   await getProducts({ category, collectionId, featuredOnly })
 *   await getProductBySlug(slug)
 *   await getProductTypes()
 *   await getCollections()
 *   formatPrice(price)
 */

/**
 * Filtreli ürün listesi getir (async).
 *
 * @param {Object} options
 * @param {string|null} options.category - ürün tipi slug'ı (alt segment)
 * @param {string|null} options.collectionId - koleksiyon id'si (üst kategori)
 * @param {boolean} options.featuredOnly - sadece featured ürünler
 */
async function getProducts({ category = null, collectionId = null, featuredOnly = false } = {}) {
  if (!window.PB_Data) {
    console.warn('PB_Data hazır değil');
    return [];
  }

  const all = await window.PB_Data.getProducts();
  pbYeniIdleriHesapla(all);

  return all.filter(p => {
    if (category && p.category !== category) return false;
    if (collectionId && !productInCollection(p, collectionId)) return false;
    if (featuredOnly && !p.featured) return false;
    return true;
  });
}

/**
 * Ürün bu koleksiyonda görünüyor mu?
 *
 * Bir ürün birden fazla koleksiyonda olabilir (ör. ametist bir küpe hem
 * "Ametist Koleksiyonu"nda hem "Doğal Taş Koleksiyonu"nda). collectionId
 * ana koleksiyon, collectionIds ise göründüğü tüm koleksiyonlar.
 */
function productInCollection(p, collectionId) {
  if (!collectionId) return true;
  if (p.collectionId === collectionId) return true;
  return (p.collectionIds || []).indexOf(collectionId) !== -1;
}

/**
 * Ürün "yeni" sayılıyor mu — kartta YENİ rozeti bunun için çıkıyor.
 *
 * İki koşul birlikte: son 30 günde eklenmiş OLACAK ve en son eklenen
 * PB_YENI_ADET ürün arasında olacak. İkinci koşul, mağazaya toplu ürün
 * girildiğinde her kartın "YENİ" rozetiyle dolup rozetin anlamını
 * yitirmesini engelliyor.
 */
const PB_YENI_GUN = 30;
const PB_YENI_ADET = 6;

let pbYeniIdler = null; // getProducts her çağrıldığında tazeleniyor

function pbYeniIdleriHesapla(all) {
  const sinir = Date.now() - PB_YENI_GUN * 24 * 60 * 60 * 1000;
  pbYeniIdler = new Set(
    all
      .filter(p => p.createdAt && new Date(p.createdAt).getTime() >= sinir)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, PB_YENI_ADET)
      .map(p => p.id)
  );
}

function isNewProduct(p) {
  if (!p || !pbYeniIdler) return false;
  return pbYeniIdler.has(p.id);
}

/**
 * Tükenen ürün her listede en sona gider — sıralama kuralı ne olursa olsun.
 *
 * Satın alınabilir parçanın önde durması gerekiyor: stoğu biten bir ürün
 * ızgaranın başındayken ziyaretçi tıklayıp "tükendi" görüyor ve akış
 * kopuyordu. Ürünü listeden tamamen kaldırmıyoruz — hem ilgi çekiyor hem
 * de aynı parçadan tekrar üretilebiliyor.
 *
 * Diğer sıralamaların önüne konacak karşılaştırıcı olarak kullanılır.
 */
function stoktaOnce(a, b) {
  const aVar = (a.stockQuantity || 0) > 0;
  const bVar = (b.stockQuantity || 0) > 0;
  if (aVar !== bVar) return aVar ? -1 : 1;
  return 0;
}

/**
 * Vitrin sıralaması: önce stokta olanlar, sonra öne çıkanlar (⭐), sonra
 * panelde sürükleyerek verilen sıra. Panelde yeni eklenen ürün listenin
 * başına geldiği için yeni ürünler de doğal olarak üstte çıkıyor.
 */
function sortForDisplay(products) {
  return products.slice().sort((a, b) => {
    const stok = stoktaOnce(a, b);
    if (stok) return stok;
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });
}

/** Ürün tipi listesini getir (async) — eski sabit CATEGORIES'in yerine geçti. */
async function getProductTypes() {
  if (!window.PB_Data) return [];
  return await window.PB_Data.getProductTypes();
}

/** Koleksiyon listesini getir (async). */
async function getCollections() {
  if (!window.PB_Data) return [];
  return await window.PB_Data.getCollections();
}

/** Slug'a göre tek bir koleksiyon getir (async). */
async function getCollectionBySlug(slug) {
  if (!window.PB_Data) return null;
  return await window.PB_Data.getCollectionBySlug(slug);
}

async function getProductBySlug(slug) {
  if (!window.PB_Data) return null;
  return await window.PB_Data.getProductBySlug(slug);
}

async function getProductById(id) {
  if (!window.PB_Data) return null;
  return await window.PB_Data.getProductById(id);
}

/**
 * Bir üründe indirim var mı?
 *
 * Tek kaynak: kart, ürün sayfası, pencere, sepet ve ödeme özeti hep
 * bunu çağırıyor. Böylece "indirim sayılır mı" kararı her yerde aynı.
 *
 * null döner (indirim YOK) şu hâllerde:
 *   · eski fiyat girilmemişse
 *   · eski fiyat satış fiyatından büyük değilse (ters ya da eşit girilmiş)
 *   · yuvarlanmış yüzde 1'in altındaysa — "%0 indirim" yazmasın
 */
function indirimBilgisi(p) {
  if (!p) return null;
  const eski = Number(p.comparePrice);
  const yeni = Number(p.price);
  if (!isFinite(eski) || !isFinite(yeni)) return null;
  if (!(yeni > 0) || !(eski > yeni)) return null;
  const yuzde = Math.round((1 - yeni / eski) * 100);
  if (yuzde < 1) return null;
  return { eski, yeni, yuzde };
}

/**
 * Fiyat satırını kuran ortak parça: indirim varsa üstü çizili eski fiyat
 * + satış fiyatı, yoksa yalnız satış fiyatı. Çağıran yere <span>'ler
 * döner; hangi kaba konacağına çağıran karar verir.
 */
function fiyatOgeleri(p, carpan = 1) {
  const bilgi = indirimBilgisi(p);
  const ogeler = [];
  if (bilgi) {
    const eskiEl = document.createElement('span');
    eskiEl.className = 'fiyat-eski';
    eskiEl.textContent = formatPrice(bilgi.eski * carpan);
    /* Ekran okuyucu "500 lira 350 lira" diye okuyup kafa karıştırmasın */
    eskiEl.setAttribute('aria-label', 'Eski fiyat: ' + formatPrice(bilgi.eski * carpan));
    ogeler.push(eskiEl);
  }
  const yeniEl = document.createElement('span');
  yeniEl.className = bilgi ? 'fiyat-yeni' : 'fiyat-tek';
  yeniEl.textContent = formatPrice(Number(p.price) * carpan);
  ogeler.push(yeniEl);
  return ogeler;
}

function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR').format(price) + ' ₺';
}

/* ──────────── Sepet indirimi (tutar eşiğine bağlı) ────────────
 *
 * "4.000 ₺ üzeri sepete ek %10" türü kampanya. İki sayı panelden
 * (Metinler) yönetiliyor:
 *   sepet_indirim_esigi    → kaç ₺ ve üzerinde geçerli
 *   sepet_indirim_yuzdesi  → yüzde kaç
 * Biri boş ya da 0 ise kampanya KAPALI. Alanların varsayılan hâli bu;
 * yani bu özellik siteye eklendiğinde kendiliğinden hiçbir şey değişmez.
 *
 * ÜRÜN İNDİRİMİNİN ÜSTÜNE BİNER. compare_at_price ile indirimli bir
 * ürün sepetteyse müşteri iki indirimi birlikte alır. Toplu indirim
 * aracında "zaten indirimli" ürünü atlıyoruz çünkü orada ürünün kendi
 * fiyatı KALICI olarak eziliyordu; burada öyle bir şey yok, sepete
 * özel geçici bir iskonto. Kampanyanın amacı da sepeti büyütmek.
 *
 * Buradaki iki fonksiyon tek karar noktası: sepet çekmecesi, ödeme
 * özeti, sipariş maili ve Supabase kaydı hepsi bunları çağırıyor.
 * Ayrı ayrı hesaplanırsa gösterilen indirim ile tahsil edilen tutar
 * ayrışır — müşteriye yanlış para yazmak demek.
 */
const PB_SEPET_INDIRIM_AZAMI = 90;   // güvenlik tavanı (%)

/* Kargo eşiği de aynı okumadan geliyor. Sepet çekmecesi eskiden 500 ₺'yi
   koda gömüyordu: panelde eşik 2.000 ₺ iken çekmece 500 ₺'de "✓ Ücretsiz
   kargo" yazıyor, kasada 35 ₺ kargo çıkıyordu. */
const PB_KARGO_YEDEK = { esik: 2000, ucret: 35 };

let pbSepetKurallariSozu = null;     // tek seferlik okuma
let pbSepetKurallariHazir = null;    // çözülmüş kurallar — senkron çizim için

function pbSayi(v) {
  const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Kampanya alanları için SADECE rakam kabul eden okuma.
 *
 * Neden gevşek parseFloat değil: panele Türkçe alışkanlıkla "4.000"
 * yazılırsa parseFloat bunu 4 okur. Eşik 4 ₺ demek, yani indirim her
 * sepete uygulanır — kimsenin fark etmeyeceği, her siparişte para
 * kaybettiren bir hata. Belirsiz girişte kampanyayı kapatmak doğru
 * taraf; panel de aynı kuralla baştan uyarıyor.
 */
function pbTamSayi(v) {
  const s = String(v == null ? '' : v).trim();
  if (!/^\d{1,9}$/.test(s)) return 0;
  return Number(s);
}

/** Ham site_texts değerlerini kurallara çevirir. Ayrı tutuldu ki testlenebilsin. */
function pbSepetKurallariCoz(t) {
  const esik = pbTamSayi(t && t.sepet_indirim_esigi);
  let yuzde = pbTamSayi(t && t.sepet_indirim_yuzdesi);
  let indirim = null;

  if (esik > 0 && yuzde > 0) {
    /* Tavan: panele yanlışlıkla "100" ya da "1000" yazılırsa toplam sıfıra
       veya eksiye düşer. Kırpıp konsola yazıyoruz; sessizce 0 ₺ sipariş
       almaktan iyidir. */
    if (yuzde > PB_SEPET_INDIRIM_AZAMI) {
      console.warn('Sepet indirimi %' + yuzde + ' girilmiş; %'
        + PB_SEPET_INDIRIM_AZAMI + ' ile sınırlandı.');
      yuzde = PB_SEPET_INDIRIM_AZAMI;
    }
    indirim = { esik, yuzde };
  }

  const kEsik = pbSayi(t && t.kargo_ucretsiz_esigi);
  const kUcret = pbSayi(t && t.kargo_ucreti);
  const kargo = {
    esik: kEsik > 0 ? kEsik : PB_KARGO_YEDEK.esik,
    ucret: kUcret >= 0 && t && t.kargo_ucreti != null && t.kargo_ucreti !== ''
      ? kUcret : PB_KARGO_YEDEK.ucret
  };

  return { indirim, kargo };
}

/** Panelden gelen sepet kuralları. site_texts cache'li, tekrar çağırmak ucuz. */
function sepetKurallari() {
  if (!pbSepetKurallariSozu) {
    pbSepetKurallariSozu = (async () => {
      let kurallar = { indirim: null, kargo: PB_KARGO_YEDEK };
      try {
        if (window.PB_Data && window.PB_Data.getSiteTexts) {
          kurallar = pbSepetKurallariCoz(await window.PB_Data.getSiteTexts());
        }
      } catch (e) {
        /* Metinler gelmezse kampanya KAPALI sayılıyor. Ters yön — "emin
           değilim, indirimi uygula" — müşteriden eksik tahsil etmek
           olurdu. Kargoda ise yedek değerler devreye giriyor. */
        console.warn('Sepet kuralları okunamadı:', e);
      }
      pbSepetKurallariHazir = kurallar;
      return kurallar;
    })();
  }
  return pbSepetKurallariSozu;
}

/**
 * Daha önce okunmuş kuralları senkron döner; henüz okunmadıysa null.
 * Sepet çekmecesi ilk çizimde bunu kullanıyor, ardından sözü bekleyip
 * altlığı tazeliyor — ikinci açılışta indirim satırı anında görünür.
 */
function sepetKurallariHazir() {
  return pbSepetKurallariHazir;
}

/**
 * Ara toplama göre sepet indirimi. Eşiğin altındaysa veya kampanya
 * kapalıysa null.
 *
 * Kuruş yuvarlaması: yüzde hesabı 435.00000000000006 gibi kuyruklar
 * üretiyor. İki haneye yuvarlanıyor ve toplam HER ZAMAN bu yuvarlanmış
 * tutardan düşülüyor; müşteriye gösterilen indirim ile toplamdaki fark
 * birbirini tutsun.
 */
function sepetIndirimi(araToplam, kural) {
  if (!kural) return null;
  const t = Number(araToplam);
  if (!Number.isFinite(t) || t < kural.esik) return null;
  const tutar = Math.round(t * kural.yuzde) / 100;
  if (!(tutar > 0)) return null;
  return { yuzde: kural.yuzde, esik: kural.esik, tutar };
}

/**
 * Kargo ücreti. BİLEREK indirim ÖNCESİ ara toplama bakıyor.
 *
 * Müşteri sepeti 2.100 ₺ yapıp "ücretsiz kargo" gördükten sonra, biz
 * ona %10 sepet indirimi verdiğimiz için toplam 1.890 ₺'ye düşüp kargo
 * ücreti eklenmesi — indirim yüzünden daha fazla ödemek gibi görünür ve
 * çekmecede satırlar yanıp sönerdi. Hak kazandığı anda kazanmış sayılıyor.
 */
function kargoUcretiHesapla(araToplam, kargo) {
  const k = kargo || PB_KARGO_YEDEK;
  return Number(araToplam) >= k.esik ? 0 : k.ucret;
}

/**
 * Sepetin para tablosu: tek yerden ara toplam, indirim, kargo, toplam.
 * Çekmece, ödeme özeti, sipariş maili ve Supabase kaydı hepsi bunu
 * kullanıyor; başka hiçbir yerde toplam hesaplanmıyor.
 */
function sepetToplamlari(araToplam, kurallar) {
  const k = kurallar || { indirim: null, kargo: PB_KARGO_YEDEK };
  const indirim = sepetIndirimi(araToplam, k.indirim);
  const kargo = kargoUcretiHesapla(araToplam, k.kargo);
  const indirimTutar = indirim ? indirim.tutar : 0;
  return {
    araToplam: Number(araToplam) || 0,
    indirim,                                   // null ya da {yuzde, esik, tutar}
    indirimTutar,
    kargo,
    kargoKurali: k.kargo,
    toplam: (Number(araToplam) || 0) - indirimTutar + kargo
  };
}

/**
 * Ürün ızgarası boş kaldığında içine uygun mesajı basar.
 *
 * Üç ayrı durum var ve bunları karıştırmak pahalıya patlıyor:
 *   - Veritabanına ulaşılamadı  → arıza. Ziyaretçiye söyle, tekrar deneme sun.
 *   - Filtreye uyan ürün yok    → normal, filtreyi gevşetmesi gerek.
 *   - Gerçekten hiç ürün yok    → normal.
 *
 * Önceden üçü de "Henüz ürün yok." diyordu; backend düştüğünde mağaza
 * bomboş ama kasıtlı görünüyordu ve kimse durumu fark etmiyordu.
 *
 * @param {HTMLElement} grid - içi temizlenip mesajın basılacağı ızgara
 * @param {Object} options
 * @param {boolean} options.filtered - kullanıcının aktif bir filtresi var mı
 */
function renderEmptyGridState(grid, { filtered = false } = {}) {
  const loadError = window.PB_Data && window.PB_Data.getLastError
    ? window.PB_Data.getLastError()
    : null;

  const wrap = document.createElement('div');
  wrap.className = 'grid-empty-state';
  wrap.style.cssText = 'grid-column: 1/-1; text-align: center; padding: var(--space-xl) 0; color: var(--c-toprak); font-size: 14px;';

  if (loadError) {
    wrap.setAttribute('role', 'alert');

    const msg = document.createElement('p');
    msg.textContent = 'Ürünler şu anda yüklenemiyor. Bağlantı sorunu olabilir.';
    msg.style.marginBottom = '12px';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-ghost';
    retry.textContent = 'TEKRAR DENE';
    retry.addEventListener('click', () => window.location.reload());

    wrap.append(msg, retry);
  } else {
    const msg = document.createElement('p');
    msg.textContent = filtered
      ? 'Bu filtreye uyan ürün bulunamadı.'
      : 'Henüz ürün yok.';
    wrap.append(msg);
  }

  grid.replaceChildren(wrap);
}

/**
 * Ürün görselinin tam URL'sini döner.
 * Supabase Storage URL'leri zaten tam URL, dokunulmaz.
 * Eski lokal yollar (assets/img/products/...) için PB_imgPath helper'ı kullanılır.
 */
function getProductImageUrl(imagePath) {
  if (!imagePath) return 'assets/img/products/kolye.svg';
  // Supabase storage URL'si zaten http ile başlar
  if (imagePath.startsWith('http')) return imagePath;
  // Lokal yol — sayfaya göre prefix gerek
  return imagePath;
}
