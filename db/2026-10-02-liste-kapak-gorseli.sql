-- Parla By Aslı — Ürün listesi sayfalarının kapak fotoğrafı
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli (on conflict).
--
-- NE YAPIYOR
--   /urunler/ ve kategori sayfalarının (Kolyeler, Küpeler, Bileklikler…)
--   başlık bandı düz krem bir blok olarak duruyordu. Artık arkasında
--   fotoğraf var ve yazılar fotoğrafın üstünde okunacak şekilde
--   açık renge dönüyor.
--
--   BU SATIR ZORUNLU DEĞİL. Satır yokken site anasayfanın kapak
--   görsellerinin ilkini kullanıyor, yani bant zaten dolu görünüyor.
--   Bu satırı eklemek, listeye ANASAYFADAN FARKLI bir fotoğraf koymak
--   istersen gerekiyor:
--     Panel → Metinler → "Ürün listesi kapak fotoğrafı" → GÖRSEL YÜKLE
--
--   Değeri boş bırakırsan yine anasayfanın görseline düşer.

insert into public.site_texts (key, label, value) values
  ('liste_kapak_gorsel',
   'Ürün listesi kapak fotoğrafı (boşsa anasayfa kapağı kullanılır)',
   '')
on conflict (key) do nothing;
