# Parla By Aslı — Deploy Rehberi

Bu doküman, siteyi sıfırdan canlıya çıkarmak için adım adım yol göstericidir.

**Toplam süre:** 30-45 dakika

**Yapacaklarımız:**
1. GitHub hesabı + repo (5 dk)
2. Vercel hesabı + ilk deploy (10 dk)
3. Formspree hesabı + form bağlantısı (10 dk)
4. parlabyasli.com domain'ini Vercel'e bağlama (10 dk + DNS bekleme süresi)
5. Test ve son kontroller (5 dk)

---

## 1. GitHub'a kodu yükleme

Vercel, kodun bir Git repo'sunda olmasını ister. Bu sayede her güncelleme otomatik canlıya yansır.

### 1.1. GitHub hesabı

- https://github.com/signup → ücretsiz hesap aç
- Email doğrulamayı yap

### 1.2. Repo oluştur

- Sağ üstteki **+** → **New repository**
- **Repository name:** `parla-by-asli`
- **Description:** "Parla By Aslı e-ticaret sitesi" (opsiyonel)
- **Private** (özel) seçeneğini işaretle — kodun başkaları tarafından görülmesini istemezsin
- "Add a README" işaretleme — bizde zaten var
- **Create repository**

### 1.3. Kodu yükle

GitHub'da repo açıldıktan sonra sayfada şöyle bir ekran görürsün: "Quick setup — if you've done this kind of thing before"

İki yol var:

**Yol A — Web'den yükle (kolay):**
- "uploading an existing file" linkine tıkla
- Bilgisayarındaki `parla-by-asli` klasörünün **içindeki** tüm dosyaları sürükle-bırak (klasörün kendisini değil, içindekileri!)
- Aşağıda "Commit changes" → "Commit directly to main" → **Commit changes**

**Yol B — Komut satırı (Git biliyorsan):**
```bash
cd /Users/Asli/Desktop/parla-by-asli  # senin klasörün
git init
git add .
git commit -m "İlk yükleme"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/parla-by-asli.git
git push -u origin main
```

Yol A daha kolay, başlangıç için yeterli.

---

## 2. Vercel'e deploy

### 2.1. Vercel hesabı

- https://vercel.com/signup
- **Continue with GitHub** seç (en kolay yol — GitHub hesabınla giriş yapar)
- İzinleri onayla

### 2.2. Yeni proje

- Vercel dashboard'una giriş yap
- **Add New** → **Project**
- "Import Git Repository" altında `parla-by-asli` reponu göreceksin
- **Import** butonuna bas

### 2.3. Konfigürasyon

Vercel sana birkaç şey soracak:

- **Framework Preset:** "Other" seç (bizde framework yok, plain HTML)
- **Root Directory:** `./` (varsayılan, değiştirme)
- **Build Command:** boş bırak
- **Output Directory:** boş bırak
- **Install Command:** boş bırak

**Deploy** butonuna bas.

### 2.4. İlk deploy

30-60 saniye sürer. Yeşil tik gördüğünde, sana bir URL verir, örn:
`parla-by-asli-abc123.vercel.app`

Bu URL'e tıkla, siten canlı! Test et.

**Önemli:** Bu geçici URL. Birazdan parlabyasli.com'u bağlayacağız.

---

## 3. Formspree kurulumu

Müşteri sipariş tamamladığında bilgilerin Outlook'una mail olarak gelmesi için.

### 3.1. Hesap aç

- https://formspree.io/register
- Email: **siparis.parlabyasli@outlook.com** kullan (siparişlerin geleceği adres)
- Doğrulama mailini onayla

### 3.2. Form oluştur

- Dashboard → **+ New Form**
- **Form name:** `Parla By Aslı Siparişler`
- **Email:** otomatik dolu, kontrol et
- **Create Form** butonuna bas

### 3.3. Endpoint URL'sini al

Form oluşunca sana bir endpoint verilir, şöyle bir şey:
`https://formspree.io/f/abc123def`

Bunu kopyala.

### 3.4. Sitenin koduna ekle

Bilgisayarındaki `parla-by-asli/odeme/index.html` dosyasını bir text editor'le aç (VSCode, Notepad++, hatta Notepad olur).

Şu satırı bul (sona yakın):
```html
<!-- window.PB_FORMSPREE_URL = 'https://formspree.io/f/YOUR_ID_HERE'; -->
```

Şu hâle getir (yorumu kaldır + URL'yi yapıştır):
```html
<script>
  window.PB_FORMSPREE_URL = 'https://formspree.io/f/abc123def';
</script>
```

(Yukarıdaki örnekteki `abc123def` yerine senin gerçek endpoint ID'ni yaz!)

### 3.5. GitHub'a güncellemeyi gönder

Bu değişikliği GitHub'a yüklemen lazım — Vercel otomatik deploy edecek:

**Yol A (web'den):**
- GitHub repo'na git
- `odeme/index.html` dosyasını aç
- Sağ üstte **kalem** ikonuna tıkla (edit)
- Değişikliği yap
- Aşağıda **Commit changes**

**Yol B (komut satırı):**
```bash
git add odeme/index.html
git commit -m "Formspree endpoint"
git push
```

30 saniye içinde Vercel otomatik yeni versiyonu yayınlar.

### 3.6. Test sipariş

- Sitende bir ürün ekle → sepet → çıkış → formu doldur → SİPARİŞİ TAMAMLA
- Outlook'una sipariş maili gelmeli (bazen spam'e düşer, ilk sefer kontrol et)
- Spam'e düştüyse, "Junk değil" işaretle, sonrakiler doğru gelir

**Formspree limitler (ücretsiz):**
- Ayda 50 sipariş
- 50'yi aştığında otomatik durur, $10/ay'lık plana geçmen gerekir (1000 sipariş)

---

## 4. parlabyasli.com domain'ini bağlama

### 4.1. Vercel'de domain ekle

- Vercel dashboard → projen → **Settings** → **Domains**
- Input alanına `parlabyasli.com` yaz → **Add**
- Vercel sana DNS ayarlarını verir, **iki seçenek** sunar:

**Seçenek A — Nameservers (önerilen, daha hızlı):**
Sana 4 nameserver verir, örn:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Seçenek B — A/CNAME records:**
- A record: `76.76.21.21`
- CNAME (www): `cname.vercel-dns.com`

### 4.2. GoDaddy tarafında ayarla

Domain'i nereden aldığını söylemiştin — GoDaddy gibi görünüyor (cart-godaddy görmüştüm sekmelerinde):

- https://account.godaddy.com → giriş yap
- **My Products** → `parlabyasli.com` yanında **DNS** butonuna bas

**Eğer Seçenek A (nameservers) kullanacaksan:**
- Sayfada "Nameservers" bölümünü bul
- **Change** → **I'll use my own nameservers**
- Vercel'in verdiği iki nameserver'ı yaz → **Save**

**Eğer Seçenek B (A/CNAME) kullanacaksan:**
- Mevcut A record'larını sil (varsa)
- **Add Record:**
  - Type: A
  - Name: @
  - Value: `76.76.21.21`
- Bir tane daha:
  - Type: CNAME
  - Name: www
  - Value: `cname.vercel-dns.com`
- Save

### 4.3. Bekle

DNS yayılma süresi:
- En hızlı: 5-10 dakika
- En geç: 24-48 saat
- Türkiye'den genelde 30 dakika - 2 saat arası

Vercel dashboard'da domain'in yanında ⏳ varsa daha bekliyor, ✓ olunca hazır.

### 4.4. SSL otomatik

Vercel sertifikayı otomatik halleder, ekstra bir şey yapmana gerek yok. `https://parlabyasli.com` çalışır.

### 4.5. www → root yönlendirmesi

Vercel varsayılan olarak `www.parlabyasli.com`'u `parlabyasli.com`'a yönlendirir. Tersini istersen Settings → Domains'da değiştirebilirsin.

---

## 5. Son kontroller

Site canlıya çıktıktan sonra şunları kontrol et:

### 5.1. Smoke test (10 dakika)

Telefonundan ve bilgisayardan kontrol et:

- [ ] `https://parlabyasli.com` açılıyor mu?
- [ ] Anasayfada logo, başlık, ürünler düzgün görünüyor mu?
- [ ] Hepsi/Koleksiyon/Sana özel modları arası geçiş çalışıyor mu?
- [ ] Bir kategori pill'ine tıkla, filtreleniyor mu?
- [ ] Bir koleksiyon ürününe tıkla, modal açılıyor mu?
- [ ] Sepete ekle çalışıyor mu?
- [ ] Sana özel ürüne tıkla, stüdyo modal açılıyor mu?
- [ ] İsim yaz, font değiştir, renk değiştir → önizleme güncelleniyor mu?
- [ ] Sepete ekle, sepet drawer'ı aç → ürün listede mi?
- [ ] SİPARİŞİ TAMAMLA → checkout sayfası → form doldur → SİPARİŞİ TAMAMLA → teşekkürler sayfası
- [ ] Outlook'una sipariş maili geldi mi? (spam'e bak)
- [ ] Mobil tarayıcıdan da aynısını yap (telefon)

### 5.2. SEO + Google

Google'a siteni bildirmek için:

- https://search.google.com/search-console → giriş yap
- **Property ekle** → URL prefix → `https://parlabyasli.com`
- Doğrulama: HTML tag yöntemi → verdiği `<meta>` tag'ını
  `index.html`'deki `<head>` içine yapıştır → push → doğrula
- Sol menüden **Sitemaps** → `sitemap.xml` ekle → Submit

İlk indexleme 1-3 gün sürer. "Parla By Aslı" araması yapıldığında çıkmaya başlar.

### 5.3. Sosyal medya

- Instagram'da `@parlabyasli` (ya da başka bir handle) hesap aç
- Bio'ya `parlabyasli.com` ekle
- İlk gönderi: site lansman duyurusu

---

## Sonradan yapılacaklar

Site canlı, ama bunlar gelecekte yapılacak:

### Ürün fotoğrafları
Şu an SVG placeholder var. Gerçek fotolar çekildiğinde:
1. `assets/img/products/` klasörüne `.jpg` veya `.webp` olarak yükle
2. `assets/products.js`'te ilgili ürünün `image:` ve `images: []` alanlarını yeni dosya yoluna ayarla
3. GitHub'a push, Vercel otomatik deploy eder

### Yeni ürün ekleme
1. `assets/products.js`'i aç
2. PRODUCTS array'ine yeni obje ekle (mevcut ürünleri kopyala, alanları değiştir)
3. Push

### Yeni sana özel tipi
Bana söyle, ben `studio.js`'e yeni renderer eklerim.

### Ödeme entegrasyonu (Faz 2)
iyzico'ya başvuru yap (ticari hesap + vergi numarası gerekli), entegrasyon için bana haber ver. 3-5 günlük bir iş.

### Admin paneli (gerekirse)
Ürün sayısı 50+ olunca + ayda 100+ sipariş alınca konuşulur.

---

## Yardım

Bir adımda takılırsan, tam hata mesajını veya screenshot'ı bana gönder, beraber çözeriz. Özellikle:

- Vercel deploy başarısız olursa
- DNS ayarları çalışmıyorsa
- Formspree maili gelmiyorsa
- Mobile'da bir şey bozuksa

Buradayım.
