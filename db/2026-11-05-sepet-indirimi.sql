-- Parla By Aslı — Sepet tutarına bağlı indirim ("4.000 ₺ üzeri ek %10")
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli.
--
-- NE EKLİYOR
--   1) Panel → Metinler altında iki alan:
--        sepet_indirim_esigi    → kaç ₺ ve üzerinde geçerli   (örn. 4000)
--        sepet_indirim_yuzdesi  → yüzde kaç                   (örn. 10)
--   2) orders.cart_discount → o siparişte düşülen indirim tutarı
--
-- KAMPANYA BAŞTA KAPALI
--   İki alan da BOŞ geliyor. Biri boş ya da 0 olduğu sürece sitede
--   hiçbir şey değişmez: ne sepette indirim satırı çıkar, ne toplam
--   değişir. Kampanyayı başlatmak = panelden iki sayıyı yazmak.
--   Bitirmek = birini silmek. Kod değişikliği, yayın beklemek yok.
--
-- NASIL ÇALIŞIYOR
--   Ara toplam >= eşik  →  indirim = ara toplam × yüzde (kuruşa yuvarlı)
--   Toplam = ara toplam − indirim + kargo
--
--   · ÜRÜN İNDİRİMİNİN ÜSTÜNE BİNER. compare_at_price ile indirimli bir
--     ürün sepetteyse müşteri iki indirimi birlikte alır. Toplu indirim
--     aracında "zaten indirimli" ürünü atlıyoruz, çünkü orada ürünün
--     fiyatı KALICI olarak eziliyor; buradaki ise sepete özel, geçici.
--
--   · KARGO, İNDİRİM ÖNCESİ ara toplama göre hesaplanıyor. Müşteri
--     2.100 ₺'de "ücretsiz kargo" gördükten sonra, indirim toplamı
--     1.890 ₺'ye düşürdüğü için kargo ücreti eklenmesi, indirim yüzünden
--     daha çok ödemek gibi görünürdü. Hak kazandığı anda kazanmış sayılır.
--
--   · GÜVENLİK TAVANI %90. Panele yanlışlıkla 100 ya da 1000 yazılırsa
--     site yüzdeyi 90'da kırpıyor; 0 ₺'ye sipariş geçmesin diye.
--
--   Hesabın tek yeri assets/products.js (sepetToplamlari). Sepet
--   çekmecesi, ödeme özeti, sipariş maili ve bu kayıt hep onu kullanıyor.


-- ── 1) Panel alanları ──
-- label sütunu panelde görünen başlık. Alan adları site kodunda sabit,
-- değiştirme; başlığı dilediğin gibi düzenleyebilirsin.
insert into public.site_texts (key, label, value) values
  ('sepet_indirim_esigi',   'Sepet indirimi — alt sınır (₺)', ''),
  ('sepet_indirim_yuzdesi', 'Sepet indirimi — yüzde (%)',     '')
on conflict (key) do update
  set label = excluded.label;   -- değeri EZMİYOR: kampanya açıksa kapanmasın


-- ── 2) Siparişte indirim tutarı ──
alter table public.orders
  add column if not exists cart_discount numeric not null default 0;

comment on column public.orders.cart_discount is
  'Sepet tutarı indirimi (₺). subtotal - cart_discount + shipping_fee = total. Kampanya kapalıyken 0.';


-- Kontrol: iki alan geldi mi?
select key, label, coalesce(nullif(value, ''), '(boş — kampanya kapalı)') as deger
  from public.site_texts
 where key in ('sepet_indirim_esigi', 'sepet_indirim_yuzdesi');
