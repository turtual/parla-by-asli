# Parla By Aslı

Premium feminen e-ticaret sitesi. El emeği takı + 3D üretim + kişiye özel tasarım.

## Teknoloji

- Plain HTML / CSS / Vanilla JS (framework yok, build adımı yok)
- Google Fonts: Fraunces (serif), DM Sans (sans), Caveat (script), Playfair Display (display)
- Three.js (sana özel sayfalarında, 3D önizleme için — Faz 1.4'te)
- Make.com (sipariş otomasyonu — Faz 1.5'te)

## Klasör yapısı

```
parla-by-asli/
├── index.html                 # Anasayfa
├── 404.html                   # Hata sayfası
├── README.md                  # Bu dosya
├── DEPLOY.md                  # Deploy rehberi (önemli!)
├── vercel.json                # Vercel konfigürasyonu
├── robots.txt                 # SEO
├── sitemap.xml                # SEO
├── katalog/                   # Kategori sayfaları
│   ├── kolye/index.html
│   ├── kupe/index.html
│   ├── bileklik/index.html
│   ├── yuzuk/index.html
│   ├── charm/index.html
│   ├── bros/index.html
│   ├── anahtarlik/index.html
│   └── obje/index.html
├── sana-ozel/                 # Sana özel ürün sayfaları
│   ├── isimli-kolye/index.html
│   ├── tarihli-charm/index.html
│   ├── sembollu-tasarim/index.html
│   ├── tarihli-yuzuk/index.html
│   ├── ozel-kupe/index.html
│   ├── cift-bilekligi/index.html
│   └── ani-objesi/index.html
├── odeme/                     # Checkout
│   └── index.html
├── tesekkurler/               # Sipariş onay sayfası
│   └── index.html
└── assets/
    ├── main.css               # Tüm stiller (design tokens + components)
    ├── products.js            # Ürün kataloğu (15 ürün) + helpers
    ├── ui.js                  # Modal, sepet drawer, ürün kartı, login
    ├── homepage.js            # Anasayfa: mod toggle + filtre
    ├── catalog.js             # Kategori sayfaları
    ├── studio.js              # Sana özel stüdyo (modal + standalone)
    ├── checkout.js            # Checkout formu + Formspree submit
    └── img/
        ├── logo-seal-bakir.svg    # Daire mühür (hero, footer)
        ├── logo-yatay-bakir.svg   # Yatay logo (header)
        ├── logo-pa-bakir.svg      # PA monogram (favicon, modal)
        └── products/          # Ürün görselleri (placeholder)
            ├── kolye.svg
            ├── kupe.svg
            ├── bileklik.svg
            ├── yuzuk.svg
            ├── charm.svg
            ├── bros.svg
            ├── anahtarlik.svg
            └── obje.svg
```

## Lokal çalıştırma

```bash
# Projeyi indirip
cd parla-by-asli

# Basit bir HTTP server başlat
python3 -m http.server 8000
# veya
npx serve .

# Tarayıcıda aç
open http://localhost:8000
```

## Vercel'e deploy

Detaylı talimatlar için **DEPLOY.md** dosyasına bak. Özet:

1. Kodu GitHub'a yükle
2. https://vercel.com → New Project → repo'yu seç → Deploy
3. Settings → Domains → `parlabyasli.com` ekle, DNS'i ayarla

Vercel her GitHub commit'inde otomatik yeni versiyonu yayınlar.

## Faz durumu

### ✅ Faz 1.1 (tamamlandı) — proje iskeleti + anasayfa
- Anasayfa
- Üç modlu navigasyon (Hepsi / Koleksiyon / Sana özel)
- Alt kategori filtreleri
- Login modal
- Footer
- Tüm marka tokenlerı CSS'te
- 15 ürünlük placeholder katalog

### ✅ Faz 1.2 (tamamlandı) — ürün liste sayfaları
- 8 kategori sayfası: `katalog/kolye/`, `katalog/kupe/`, `katalog/bileklik/`, `katalog/yuzuk/`, `katalog/charm/`, `katalog/bros/`, `katalog/anahtarlik/`, `katalog/obje/`
- Her kategori sayfasında: breadcrumb, başlık, ürün sayısı, kategoriler arası yatay nav, mod filtresi (Tümü/Koleksiyon/Sana özel)
- Boş durumlar için "Tümünü göster" butonu
- Anasayfadaki kategori filtresi aktifken section linki ilgili kategori sayfasına yönlendiriyor
- Footer'a "Kategoriler" sütunu eklendi
- Her sayfa için ayrı SEO meta tagları (title, description, Open Graph, Schema.org breadcrumb)
- Paylaşılan render mantığı `assets/ui.js`'de — anasayfa ve kategori sayfaları aynı ürün kartını kullanıyor

### ✅ Faz 1.3 (tamamlandı) — ürün detay modal
- Koleksiyon ürününe tıklayınca açılan modal: sol görsel + thumbnail strip, sağ detay
- Adet seçici, sepete ekle (localStorage)
- Backdrop blur, ESC ile kapanma
- Anasayfa + 8 kategori sayfasında çalışıyor

### ✅ Faz 1.4 (tamamlandı) — sana özel tasarım stüdyosu
- 7 sana özel ürün için modal stüdyo (anasayfa/kategori sayfasında ürüne tıklayınca açılır)
- 7 standalone sayfa: `/sana-ozel/[slug]/` (URL paylaşımı için)
- 2 customization tipi: `name-text` (metin + font + renk) ve `color-only` (sadece renk)
- Canlı SVG önizleme — yazı/renk değiştikçe anında güncellenir
- Materyal seçimi fiyatı dinamik etkiler (örn. altın kaplama +120₺)
- Sepete ekleme: kişiselleştirme bilgisi + önizlemenin PNG screenshot'ı dahil
- Yeni tip eklemek için `studio.js`'e bir renderer eklemek yeterli

### ✅ Faz 1.5 (tamamlandı) — sepet + checkout + Formspree
- Header sepet ikonuna tıklayınca sağdan kayan **sepet drawer**
- Sana özel ürünlerde önizleme görseli kart üzerinde gösterilir
- Adet artır/azalt (sadece koleksiyon ürünleri)
- Ücretsiz kargo eşik mesajı (500₺)
- **Checkout sayfası**: `/odeme/` — iletişim + adres + sipariş notu formu, sağda sipariş özeti
- **Teşekkürler sayfası**: `/tesekkurler/` — sipariş ID, sonraki adımlar
- Formspree entegrasyonu (kurulum için aşağıya bak)
- Sipariş ID otomatik oluşturulur (örn. `PB-260428-3942`)

### ✅ Faz 1.6 (tamamlandı) — polish + deploy hazırlığı
- `vercel.json`: clean URLs, security headers, asset caching
- `404.html`: özel hata sayfası
- `robots.txt` + `sitemap.xml`: SEO için
- Anasayfa meta tagları: Open Graph + Twitter card + canonical
- **`DEPLOY.md`**: GitHub + Vercel + Formspree + domain bağlama adım adım rehber

## Sıradaki: Canlıya çıkış

Bütün kodlama bitti. Şimdi `DEPLOY.md` dosyasını aç, adımları takip et:

1. GitHub'a yükle (5 dk)
2. Vercel'e deploy (10 dk)
3. Formspree kurulumu (10 dk)
4. parlabyasli.com bağlama (10 dk + DNS bekleme)
5. Test (5 dk)

Toplam aktif iş: ~40 dakika. DNS yayılması için 30 dk - 2 saat ekstra.

## Formspree kurulumu (Faz 1.5)

Müşteri sipariş tamamladığında bilgilerin senin Outlook'una mail gelmesi için:

1. **Formspree.com** → ücretsiz hesap aç (Outlook adresini kullan)
2. Dashboard → **New Form** → form adı: "Parla By Aslı siparişler"
3. **Form endpoint URL**'sini kopyala (örn. `https://formspree.io/f/abc123def`)
4. `odeme/index.html`'i aç, şu satırı bul:
   ```html
   <!-- window.PB_FORMSPREE_URL = 'https://formspree.io/f/YOUR_ID_HERE'; -->
   ```
   Yorumu kaldır ve URL'yi yapıştır:
   ```html
   <script>
     window.PB_FORMSPREE_URL = 'https://formspree.io/f/abc123def';
   </script>
   ```
5. Test sipariş ver, mail Outlook'una düşmeli

**Formspree ücretsiz limitler:** ayda 50 sipariş, dosya yükleme yok. 50'yi aşarsan $10/ay tier'a geçilir (1000 sipariş).

**Önizleme görselleri:** Sana özel ürünlerin PNG önizlemeleri şu an mail body'sine "data URL" olarak ekleniyor (uzun string). Profesyonel çözüm için Cloudinary veya Imgur entegrasyonu eklenebilir, ama ilk fazda görmen için yeterli.

## Önemli notlar

- **Ödeme entegrasyonu yok henüz.** Sipariş alındıktan sonra müşteriyle havale veya kapıda ödeme için iletişime geçeceksin
- **Görseller placeholder.** Gerçek ürün fotoğrafları çekildiğinde `assets/img/products/` altına `.jpg` olarak konulup `products.js`'teki `image` field'ları güncellenecek

## Marka

- **İsim:** Parla By Aslı
- **Pozisyon:** Premium feminen, 25-35 yaş öncelikli, 300-1500₺ bandı
- **Kimlik:** Daire mühür logo, Fraunces + DM Sans tipografi
- **Renkler:** Krem #FAF6F1, Soft bej #F0E8DA, Warm greige #EDE7DC, Bakır #B07D5C, Warm taupe #6B5D4F, Sıcak siyah #14110E

