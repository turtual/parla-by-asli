-- Parla By Aslı — "Blush After Dark" ürünlerine Granat taşını ekle
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli.
--
-- SORUN NEYDİ
--   Her iki ürünün adında ve açıklamasında "Pembe Kuvars & Garnet" yazıyor
--   ama products.stones alanı yalnızca ['gul-kuvars'] olarak işaretlenmiş.
--
--   Site iki kademeli eşleştirme kullanıyor: stones alanı DOLUYSA yalnız
--   oradaki taşlar gösteriliyor, metin eşleştirmesine hiç bakılmıyor.
--   (Bu kasıtlı: elle yapılan işaretleme otomatiği ezsin diye.) Sonuç:
--   Granat ne ürün sayfasının TAŞLAR bölümünde ne de /taslar/granat/
--   sayfasının "Bu taşı taşıyan tasarımlar" listesinde görünüyordu.
--
-- NOT
--   Aynı işi panelden de yapabilirsin: Ürünler → ilgili ürün → taş
--   seçiciden Granat'ı işaretle. Bu dosya iki ürünü tek seferde halleder.

update public.products
   set stones = array['gul-kuvars', 'granat']
 where slug in (
   'blush-after-dark-pembe-kuvars-garnet-bileklik',
   'blush-after-dark-pembe-kuvars-garnet-kupe'
 );


-- Kontrol: iki satır da ['gul-kuvars','granat'] dönmeli.
select slug, stones
  from public.products
 where slug like 'blush-after-dark%';
