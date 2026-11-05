-- Parla By Aslı — İndirim desteği: ürünlere "eski fiyat" alanı
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli (if not exists).
--
-- SORUN NEYDİ
--   Üründe tek bir "price" alanı vardı. İndirim yapmak için o fiyatı
--   düşürünce sitede sadece fiyat değişmiş oluyordu; müşteri indirim
--   olduğunu anlamıyordu çünkü eski fiyatı görmüyordu.
--
-- NASIL ÇALIŞIYOR
--   price            = SATIŞ fiyatı (müşterinin ödediği, her zaman bu)
--   compare_at_price = İNDİRİMDEN ÖNCEKİ fiyat (üstü çizili gösterilen)
--
--   İndirim yapmak için:  compare_at_price = eski fiyat,  price = yeni fiyat
--   İndirimi bitirmek için: compare_at_price = NULL (ya da boş bırak)
--
--   Site, compare_at_price > price olduğunda indirimi gösteriyor:
--   rozette yüzde, fiyatın yanında üstü çizili eski fiyat. Küçük ya da
--   ters girilmiş değerlerde (eski <= yeni) hiçbir şey göstermiyor —
--   yanlış girişte "%0 indirim" gibi bir şey çıkmasın diye.
--
--   Sepet ve ödeme toplamları HER ZAMAN price üzerinden hesaplanıyor;
--   compare_at_price yalnız gösterim amaçlı, tahsilata etkisi yok.

alter table public.products
  add column if not exists compare_at_price numeric;

comment on column public.products.compare_at_price is
  'İndirimden önceki fiyat. Doluysa ve price''tan büyükse sitede üstü çizili gösterilir ve indirim yüzdesi hesaplanır. Boşsa indirim yok.';


-- Kontrol
select slug, name, price, compare_at_price
  from public.products
 order by created_at desc
 limit 5;
