-- Parla By Aslı — Anasayfa yenilemesi için veritabanı hazırlığı
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → hepsini yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli (if not exists / on conflict).
--
-- NE EKLİYOR
--   1) Yeni anasayfa bölümlerinin panelden düzenlenebilen metin/görsel alanları
--   2) Ürünlerde "taşlar" alanı — taş sayfalarıyla sağlam bağ kurmak için
--   3) Bülten kayıtları tablosu
--   4) İki yeni içerik sayfası: Hikâyemiz ve Bakım Rehberi

/* ─────────── 1) Anasayfa bölümleri: panelden düzenlenebilir alanlar ───────────
   site_texts satır bazlı çalışıyor: buraya eklenen her satır yönetim
   panelinde "Metinler" sekmesinde kendiliğinden bir alan olarak çıkar.
   Görsel tutan alanlar admin/admin.js içindeki GORSEL_METIN_ANAHTARLARI
   listesinde işaretli; onlarda yükleme butonu görünür. */

insert into public.site_texts (key, label, value) values
  ('hero_eyebrow',      'Kapak — üst küçük yazı',                 'PARLA BY ASLI'),
  ('hero_cta_metni',    'Kapak — buton yazısı',                   'KOLEKSİYONU KEŞFET'),

  ('editorial_metni',   'Editorial bant — yazı',                  'Bir kalıba sığmaz.'),
  ('editorial_gorsel',  'Editorial bant — görsel',                ''),

  ('tasini_bul_metni',  'Taşını Bul — açıklama',                  'Bazen seçim tasarımla değil, taşla başlar.'),
  ('tasini_bul_taslar', 'Taşını Bul — gösterilecek taşlar (virgülle, taş sayfası adresindeki yazımıyla)',
                        'lapis-lazuli, akik, ametist, inci, amazonit, gul-kuvars'),

  ('lookbook_baslik',   'Kombin bölümü — başlık',                 'Parla stilini keşfet.'),
  ('lookbook_gorsel',   'Kombin bölümü — görsel (boşsa bölüm görünmez)', ''),
  ('lookbook_link',     'Kombin bölümü — bağlantı (boşsa YAKINDA yazar)', ''),

  ('hikaye_gorsel',     'Hikâyemiz — fotoğraf',                   ''),

  ('kutu_baslik',       'Özel kutu — başlık',                     'Sen seç. Biz özenle hazırlayalım.'),
  ('kutu_metni',        'Özel kutu — açıklama',                   'Her Parla siparişi özel kutusunda hazırlanır.'),
  ('kutu_gorsel',       'Özel kutu — görsel',                     ''),

  ('bulten_baslik',     'Bülten — başlık',                        'Parla''dan haberdar ol.'),
  ('bulten_metni',      'Bülten — açıklama',                      'Yeni tasarımlar, yeni taşlar ve küçük Parla notları.')
on conflict (key) do nothing;

-- Hikâyemiz bağlantısı artık kendi sayfasına gidiyor
update public.site_texts
   set value = 'HİKÂYEMİZİ OKU', label = 'Hikâyemiz — bağlantı yazısı'
 where key = 'hikaye_link_metni' and value = 'Bize yaz';


/* ─────────── 2) Ürünlerde taş alanı ───────────
   Taş ↔ ürün bağı şu an yalnız metin eşleşmesiyle kuruluyor
   (assets/taslar-eslesme.js). Bu alan doldurulduğunda eşleşme tahmin
   olmaktan çıkıp kesinleşir; boş bırakılan üründe metin eşleşmesi
   yedek olarak çalışmaya devam eder.
   Değerler taş sayfası adresindeki yazım: {lapis-lazuli,inci} gibi. */

alter table public.products
  add column if not exists stones text[] not null default '{}'::text[];

create index if not exists products_stones_idx
  on public.products using gin (stones);


/* ─────────── 3) Bülten kayıtları ───────────
   Ziyaretçi yalnız KAYIT EKLEYEBİLİR; listeyi sadece yöneticiler görür.
   Böylece e-posta listesi dışarıya açılmaz. */

create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text default 'anasayfa',
  created_at  timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_email_idx
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "herkes abone olabilir" on public.newsletter_subscribers;
create policy "herkes abone olabilir"
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (true);

drop policy if exists "listeyi sadece yonetici gorur" on public.newsletter_subscribers;
create policy "listeyi sadece yonetici gorur"
  on public.newsletter_subscribers for select
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "kaydi sadece yonetici siler" on public.newsletter_subscribers;
create policy "kaydi sadece yonetici siler"
  on public.newsletter_subscribers for delete
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));


/* ─────────── 4) Yeni içerik sayfaları ───────────
   Metinleri panelden "Sayfa içerikleri" sekmesinden düzenlenir. */

insert into public.content_pages (slug, title, eyebrow, meta_text, blocks) values
  ('hikayemiz', 'Hikâyemiz', 'PARLA BY ASLI',
   'Parla by Aslı bir takı markası olmadan önce bir anne-kız hikâyesiydi.',
   '[]'::jsonb),
  ('bakim-rehberi', 'Bakım Rehberi', 'PARLA DETAYI',
   'Doğal taş ve el emeği takılarını uzun ömürlü kullanmak için küçük notlar.',
   '[]'::jsonb)
on conflict (slug) do nothing;


/* ─────────── 5) Taş görselleri ───────────
   Taş ansiklopedisinin metni statik dosyalarda üretiliyor (tools/taslar-uret.js)
   ama fotoğraf içerik değil, varlık: panelden yüklenebilmeli. Bu tablo yalnız
   "hangi taşın fotoğrafı hangi adreste" bilgisini tutar; taş metnine dokunmaz.
   Fotoğrafı olmayan taşta site, taşın kendi renginden türeyen sade bir zemin
   gösterir — uydurma görsel koymaz. */

create table if not exists public.stone_images (
  slug        text primary key,
  image       text,
  updated_at  timestamptz not null default now()
);

alter table public.stone_images enable row level security;

drop policy if exists "tas gorselleri herkese acik" on public.stone_images;
create policy "tas gorselleri herkese acik"
  on public.stone_images for select
  to anon, authenticated
  using (true);

drop policy if exists "tas gorselini yonetici yazar" on public.stone_images;
create policy "tas gorselini yonetici yazar"
  on public.stone_images for all
  to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
