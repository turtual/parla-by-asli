-- Parla By Aslı — Anasayfadaki "Taşını Bul" bölümünün metni
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli.
--
-- NE YAPIYOR
--   Bölüm iki satırlık tek bir ifadeye dönüştü:
--       Her taşın bir hikâyesi var.
--       Taşını keşfet          (bakır italik, ikinci satır)
--
--   Metinler veritabanından geliyor ve sayfadaki yazıyı EZİYOR. Bu yüzden
--   bu dosya çalıştırılmadan bölümde hâlâ eski metin görünür:
--       "Taşını Bul" / "Bazen seçim tasarımla değil, taşla başlar."
--   Yani düzen yeni, yazı eski olur. Bunu çalıştırınca ikisi de yerine oturur.
--
--   Metinler panelden düzenlenebilir olmayı sürdürüyor:
--     Panel → Metinler → "Taşını Bul — başlık" ve "Taşını Bul — açıklama"
--   Açıklama alanı artık ayrı bir paragraf değil, başlığın ikinci satırı.

update public.site_texts
   set value = 'Her taşın bir hikâyesi var.'
 where key = 'tasini_bul_baslik';

update public.site_texts
   set value = 'Taşını keşfet'
 where key = 'tasini_bul_metni';


-- Satırlar yoksa oluştur (önceki kurulumlarda eklenmemiş olabilir).
insert into public.site_texts (key, label, value) values
  ('tasini_bul_baslik', 'Taşını Bul — başlık', 'Her taşın bir hikâyesi var.'),
  ('tasini_bul_metni',  'Taşını Bul — ikinci satır', 'Taşını keşfet')
on conflict (key) do nothing;


-- Kontrol: iki satır da yeni değerleri döndürmeli.
select key, value
  from public.site_texts
 where key in ('tasini_bul_baslik', 'tasini_bul_metni');
