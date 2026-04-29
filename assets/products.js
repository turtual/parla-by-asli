/**
 * Parla By Aslı — Ürün kataloğu
 *
 * Her ürün:
 *   id              — benzersiz, slug formatında (kebab-case)
 *   slug            — URL'de kullanılacak (örn. /katalog/kolye/minimal-kalp-kolye)
 *   name            — gösterim adı
 *   category        — kolye | kupe | bileklik | yuzuk | charm | bros | anahtarlik | obje
 *   mode            — koleksiyon | sana-ozel
 *   price           — TL bazında, integer
 *   description     — kısa açıklama (ürün kartında ve detayda)
 *   materials       — string array (detayda gösterilir)
 *   image           — assets/img/products/ altındaki dosya
 *   featured        — anasayfada öne çıkanlar arasında mı
 *   customizable    — sana-ozel ise true; koleksiyon ise false
 *   customization   — sadece customizable: true ise — alanlar, fontlar, materyaller
 */

const PRODUCTS = [
  // ============ KOLEKSİYON (8 ürün) ============
  {
    id: 'kol-kolye-minimal-kalp',
    slug: 'minimal-kalp-kolye',
    name: 'Minimal kalp kolye',
    category: 'kolye',
    mode: 'koleksiyon',
    price: 390,
    description: 'Sade ve zarif. Her güne uyumlu, yaka çıkışıyla göğsün üzerinde durur.',
    materials: ['925 ayar gümüş', 'bakır galvanik kaplama', '14 ayar altın renginde finiş'],
    image: 'assets/img/products/kolye.svg',
    images: [
      'assets/img/products/kolye.svg',
      'assets/img/products/kolye.svg',
      'assets/img/products/kolye.svg'
    ],
    featured: true,
    customizable: false
  },
  {
    id: 'kol-kolye-sonsuz',
    slug: 'sonsuz-kolye',
    name: 'Sonsuz kolye',
    category: 'kolye',
    mode: 'koleksiyon',
    price: 380,
    description: 'Sonsuzluk sembolü, ince zincirde küçük ama anlamlı. Çift halde de alınabilir.',
    materials: ['925 ayar gümüş', 'hipoalerjenik'],
    image: 'assets/img/products/kolye.svg',
    featured: true,
    customizable: false
  },
  {
    id: 'kol-kupe-cicek',
    slug: 'cicek-kupe-cifti',
    name: 'Çiçek küpe çifti',
    category: 'kupe',
    mode: 'koleksiyon',
    price: 290,
    description: 'Beş yapraklı küçük çiçek, kulağa hafif düşer. Stud sapı 925 gümüş.',
    materials: ['925 ayar gümüş stud', '3D resin baskı', 'el boyaması'],
    image: 'assets/img/products/kupe.svg',
    featured: true,
    customizable: false
  },
  {
    id: 'kol-kupe-halka',
    slug: 'halka-kupe',
    name: 'İnce halka küpe',
    category: 'kupe',
    mode: 'koleksiyon',
    price: 260,
    description: 'Klasik halka, modern incelikte. 18mm çap, günlük kullanıma uygun.',
    materials: ['925 ayar gümüş', 'rose gold kaplama'],
    image: 'assets/img/products/kupe.svg',
    featured: false,
    customizable: false
  },
  {
    id: 'kol-yuzuk-ince',
    slug: 'ince-yuzuk',
    name: 'İnce yüzük',
    category: 'yuzuk',
    mode: 'koleksiyon',
    price: 220,
    description: 'Tek başına ya da bir araya getirerek. 1.5mm kalınlık, ölçüleri dahil.',
    materials: ['925 ayar gümüş', 'bakır kaplama'],
    image: 'assets/img/products/yuzuk.svg',
    featured: false,
    customizable: false
  },
  {
    id: 'kol-bileklik-cift-halka',
    slug: 'cift-halka-bileklik',
    name: 'Çift halka bileklik',
    category: 'bileklik',
    mode: 'koleksiyon',
    price: 340,
    description: 'İç içe iki halka. Birbirine bağlı ama bağımsız — küçük bir hatırlatma.',
    materials: ['925 ayar gümüş', 'bakır + altın kaplama opsiyonu'],
    image: 'assets/img/products/bileklik.svg',
    featured: false,
    customizable: false
  },
  {
    id: 'kol-bros-yildiz',
    slug: 'yildiz-bros',
    name: 'Yıldız broş',
    category: 'bros',
    mode: 'koleksiyon',
    price: 280,
    description: 'Beş köşeli yıldız, ceket veya çantaya. Vintage hissi, modern ölçü.',
    materials: ['925 ayar gümüş', 'el cilası'],
    image: 'assets/img/products/bros.svg',
    featured: false,
    customizable: false
  },
  {
    id: 'kol-anahtarlik-kalp',
    slug: 'kalp-anahtarlik',
    name: 'Kalp anahtarlık',
    category: 'anahtarlik',
    mode: 'koleksiyon',
    price: 180,
    description: 'Çantana, anahtarına. Hafif ama dayanıklı, hediyelik için ideal.',
    materials: ['Paslanmaz çelik halka', '3D PLA pendant'],
    image: 'assets/img/products/anahtarlik.svg',
    featured: false,
    customizable: false
  },

  // ============ SANA ÖZEL (7 ürün) ============
  // İki customization tipi:
  //   - 'name-text': Müşteri bir metin/isim girer + font seçer + materyal/renk seçer
  //   - 'color-only': Sadece materyal/renk seçer (metin alanı yok)
  //
  // Yeni tip ekleneceği zaman studio.js'e bir render fonksiyonu eklemek yeterli.
  {
    id: 'ozl-kolye-isimli',
    slug: 'isimli-kolye',
    name: 'İsimli kolye',
    category: 'kolye',
    mode: 'sana-ozel',
    price: 320,
    description: 'Senin adın, hep yanında. 3D yazıcıyla milimetrik üretilir.',
    materials: ['925 ayar gümüş', 'isteğe göre kaplama'],
    image: 'assets/img/products/kolye.svg',
    featured: true,
    customizable: true,
    customization: {
      type: 'name-text',
      textLabel: 'İsim',
      textPlaceholder: 'Örn. Aslı',
      maxLength: 10,
      fonts: [
        { id: 'serif',  name: 'Klasik italik', cssFont: "'Fraunces', serif", style: 'italic' },
        { id: 'script', name: 'El yazısı',     cssFont: "'Caveat', cursive",  style: 'normal' },
        { id: 'modern', name: 'Modern',        cssFont: "'DM Sans', sans-serif", style: 'normal' },
        { id: 'display', name: 'Editorial',    cssFont: "'Playfair Display', serif", style: 'normal' }
      ],
      materials: [
        { id: 'bakir',  name: 'Bakır kaplama', priceModifier: 0,   color: '#B07D5C' },
        { id: 'altin',  name: 'Altın kaplama', priceModifier: 80,  color: '#D4A574' },
        { id: 'gumus',  name: 'Mat gümüş',     priceModifier: 0,   color: '#B8B5AE' },
        { id: 'siyah',  name: 'Mat siyah',     priceModifier: 20,  color: '#2A2520' }
      ]
    }
  },
  {
    id: 'ozl-charm-tarihli',
    slug: 'tarihli-charm',
    name: 'Tarihli charm',
    category: 'charm',
    mode: 'sana-ozel',
    price: 240,
    description: 'Sevdiğin tarih, küçük charm üzerinde. Doğum, evlilik, anlamlı bir an.',
    materials: ['925 ayar gümüş', '3D yazıcı + el cilası'],
    image: 'assets/img/products/charm.svg',
    featured: true,
    customizable: true,
    customization: {
      type: 'name-text',
      textLabel: 'Tarih veya kısa metin',
      textPlaceholder: 'Örn. 14.06.2024',
      maxLength: 12,
      fonts: [
        { id: 'serif',  name: 'Klasik italik', cssFont: "'Fraunces', serif", style: 'italic' },
        { id: 'modern', name: 'Modern',        cssFont: "'DM Sans', sans-serif", style: 'normal' },
        { id: 'display', name: 'Editorial',    cssFont: "'Playfair Display', serif", style: 'normal' }
      ],
      materials: [
        { id: 'bakir', name: 'Bakır kaplama', priceModifier: 0,  color: '#B07D5C' },
        { id: 'altin', name: 'Altın kaplama', priceModifier: 60, color: '#D4A574' },
        { id: 'gumus', name: 'Mat gümüş',     priceModifier: 0,  color: '#B8B5AE' }
      ]
    }
  },
  {
    id: 'ozl-tasarim-sembollu',
    slug: 'sembollu-tasarim',
    name: 'Sembollü tasarım',
    category: 'kolye',
    mode: 'sana-ozel',
    price: 360,
    description: 'Hazır tasarımlardan biri, sana en uygun renkte. Kalp, sonsuz, çiçek seçenekleri.',
    materials: ['925 ayar gümüş', 'isteğe göre kaplama'],
    image: 'assets/img/products/kolye.svg',
    featured: false,
    customizable: true,
    customization: {
      type: 'color-only',
      materials: [
        { id: 'bakir', name: 'Bakır kaplama', priceModifier: 0,  color: '#B07D5C' },
        { id: 'altin', name: 'Altın kaplama', priceModifier: 70, color: '#D4A574' },
        { id: 'gumus', name: 'Mat gümüş',     priceModifier: 0,  color: '#B8B5AE' }
      ]
    }
  },
  {
    id: 'ozl-yuzuk-tarihli',
    slug: 'tarihli-yuzuk',
    name: 'Tarihli yüzük',
    category: 'yuzuk',
    mode: 'sana-ozel',
    price: 520,
    description: 'Sevdiğin tarihi yüzüğünün içine kazıyoruz. Doğum, evlilik, anlamlı bir an.',
    materials: ['925 ayar gümüş', 'lazer kazıma'],
    image: 'assets/img/products/yuzuk.svg',
    featured: true,
    customizable: true,
    customization: {
      type: 'name-text',
      textLabel: 'Kazıma metni',
      textPlaceholder: 'Örn. 14.06.2024',
      maxLength: 14,
      fonts: [
        { id: 'serif',  name: 'Klasik italik', cssFont: "'Fraunces', serif", style: 'italic' },
        { id: 'modern', name: 'Modern',        cssFont: "'DM Sans', sans-serif", style: 'normal' }
      ],
      materials: [
        { id: 'bakir', name: 'Bakır kaplama', priceModifier: 0,   color: '#B07D5C' },
        { id: 'altin', name: 'Altın kaplama', priceModifier: 120, color: '#D4A574' },
        { id: 'gumus', name: 'Mat gümüş',     priceModifier: 0,   color: '#B8B5AE' }
      ]
    }
  },
  {
    id: 'ozl-kupe-ozel',
    slug: 'ozel-kupe',
    name: 'Özel küpe',
    category: 'kupe',
    mode: 'sana-ozel',
    price: 380,
    description: 'Senin baş harfin, küçük ve zarif. Çift olarak gelir.',
    materials: ['925 ayar gümüş', 'el yapımı'],
    image: 'assets/img/products/kupe.svg',
    featured: false,
    customizable: true,
    customization: {
      type: 'name-text',
      textLabel: 'Baş harf',
      textPlaceholder: 'A',
      maxLength: 2,
      fonts: [
        { id: 'serif',  name: 'Klasik italik', cssFont: "'Fraunces', serif", style: 'italic' },
        { id: 'script', name: 'El yazısı',     cssFont: "'Caveat', cursive",  style: 'normal' },
        { id: 'modern', name: 'Modern',        cssFont: "'DM Sans', sans-serif", style: 'normal' }
      ],
      materials: [
        { id: 'bakir', name: 'Bakır kaplama', priceModifier: 0,  color: '#B07D5C' },
        { id: 'altin', name: 'Altın kaplama', priceModifier: 80, color: '#D4A574' },
        { id: 'gumus', name: 'Mat gümüş',     priceModifier: 0,  color: '#B8B5AE' }
      ]
    }
  },
  {
    id: 'ozl-bileklik-cift',
    slug: 'cift-bilekligi',
    name: 'Çift bilekliği',
    category: 'bileklik',
    mode: 'sana-ozel',
    price: 680,
    description: 'İki ayrı bileklik, iki ayrı isim, tek bir hikâye. Hediye paketinde gelir.',
    materials: ['925 ayar gümüş', 'iki adet bileklik', 'hediye kutusu'],
    image: 'assets/img/products/bileklik.svg',
    featured: false,
    customizable: true,
    customization: {
      type: 'name-text',
      textLabel: 'İki isim (örn. Ali & Ayşe)',
      textPlaceholder: 'Ali & Ayşe',
      maxLength: 18,
      fonts: [
        { id: 'serif',  name: 'Klasik italik', cssFont: "'Fraunces', serif", style: 'italic' },
        { id: 'script', name: 'El yazısı',     cssFont: "'Caveat', cursive",  style: 'normal' }
      ],
      materials: [
        { id: 'bakir', name: 'Bakır kaplama', priceModifier: 0,   color: '#B07D5C' },
        { id: 'altin', name: 'Altın kaplama', priceModifier: 150, color: '#D4A574' },
        { id: 'gumus', name: 'Mat gümüş',     priceModifier: 0,   color: '#B8B5AE' }
      ]
    }
  },
  {
    id: 'ozl-obje-ani',
    slug: 'ani-objesi',
    name: 'Anı objesi',
    category: 'obje',
    mode: 'sana-ozel',
    price: 540,
    description: 'Çalışma masasına, raf üstüne. Bir tarih, bir isim, anlamlı bir an.',
    materials: ['Mat reçine', 'PLA bazlı', 'el cilası'],
    image: 'assets/img/products/obje.svg',
    featured: false,
    customizable: true,
    customization: {
      type: 'name-text',
      textLabel: 'Metin',
      textPlaceholder: 'Örn. 14.06.2024',
      maxLength: 20,
      fonts: [
        { id: 'serif',  name: 'Klasik italik', cssFont: "'Fraunces', serif", style: 'italic' },
        { id: 'modern', name: 'Modern',        cssFont: "'DM Sans', sans-serif", style: 'normal' },
        { id: 'display', name: 'Editorial',    cssFont: "'Playfair Display', serif", style: 'normal' }
      ],
      materials: [
        { id: 'mat-krem',  name: 'Mat krem',  priceModifier: 0,   color: '#F0E8DA' },
        { id: 'mat-siyah', name: 'Mat siyah', priceModifier: 30,  color: '#2A2520' },
        { id: 'mat-bakir', name: 'Mat bakır', priceModifier: 60,  color: '#B07D5C' }
      ]
    }
  }
];
// Modlar: ürün filtrelemenin yatay segmenti
const MODES = {
  hep: { label: 'Hepsi' },
  kol: { label: 'Koleksiyon', description: 'Hazır ürünlerimiz' },
  ozl: { label: 'Sana özel', description: 'Kişiselleştirilebilir ürünlerimiz' }
};

// Kategoriler: ürün filtrelemenin dikey ekseni — moddan bağımsız tek liste
const CATEGORIES = [
  { id: 'kolye', name: 'Kolye' },
  { id: 'kupe', name: 'Küpe' },
  { id: 'bileklik', name: 'Bileklik' },
  { id: 'yuzuk', name: 'Yüzük' },
  { id: 'charm', name: 'Charm' },
  { id: 'bros', name: 'Broş' },
  { id: 'anahtarlik', name: 'Anahtarlık' },
  { id: 'obje', name: 'Ev objeleri' }
];

function getProducts({ mode = null, category = null, featuredOnly = false } = {}) {
  return PRODUCTS.filter(p => {
    if (mode === 'kol' && p.mode !== 'koleksiyon') return false;
    if (mode === 'ozl' && p.mode !== 'sana-ozel') return false;
    if (category && p.category !== category) return false;
    if (featuredOnly && !p.featured) return false;
    return true;
  });
}

function getProductBySlug(slug) {
  return PRODUCTS.find(p => p.slug === slug) || null;
}

function formatPrice(price) {
  return new Intl.NumberFormat('tr-TR').format(price) + ' ₺';
}
