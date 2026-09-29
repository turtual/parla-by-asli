-- Parla By Aslı — İletişim e-posta adresini panelden yönetilebilir yap
--
-- NASIL ÇALIŞTIRILIR
--   supabase.com → proje → SQL Editor → New query → yapıştır → Run
--   Bir kez yeterli; ikinci kez çalıştırmak da güvenli (on conflict).
--
-- NE YAPIYOR
--   İletişim e-postası şimdiye kadar assets/legal-info.js içinde sabitti.
--   Yedi yasal sayfa, iletişim sayfası ve "bize yaz" bağlantıları aynı
--   adresi kullandığı için değiştirmek kod düzenlemeyi gerektiriyordu.
--   Bu satır eklendiğinde adres yönetim panelinden değişiyor:
--     Panel → Metinler → "İletişim e-posta adresi"
--
--   Kod tarafındaki değer yedek olarak duruyor: veritabanına
--   ulaşılamazsa sayfalar boş kalmasın diye.

insert into public.site_texts (key, label, value) values
  ('iletisim_eposta',
   'İletişim e-posta adresi (yasal sayfalar ve iletişim sayfası)',
   'siparis.parlabyasli@outlook.com')
on conflict (key) do nothing;


-- Halihazırda eski adresi gösteren bir kayıt varsa güncelle.
-- (Satır yeni eklendiyse bu zaten doğru değerde.)
update public.site_texts
   set value = 'siparis.parlabyasli@outlook.com'
 where key = 'iletisim_eposta'
   and value = 'parlabyasli@outlook.com';


/* ─────────── Taşını Bul bölümünün başlığı ───────────
   Bölümde üst üste iki başlık vardı ("Taşını Bul" / "Taşınla başla");
   biri kaldırıldı ve kalan başlık da panelden düzenlenebilir oldu.
   Açıklama satırı (tasini_bul_metni) zaten yönetiliyordu. */

insert into public.site_texts (key, label, value) values
  ('tasini_bul_baslik', 'Taşını Bul — başlık', 'Taşını Bul')
on conflict (key) do nothing;
