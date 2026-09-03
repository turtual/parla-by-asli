-- Parla By Aslı — Bir ürünü birden fazla koleksiyona ekleyebilmek için
--
-- NASIL ÇALIŞTIRILIR
--   1. supabase.com → projeye gir → sol menüden "SQL Editor"
--   2. "New query" de, aşağıdaki her şeyi yapıştır
--   3. "Run" (Ctrl+Enter)
--
-- Bir kez çalıştırmak yeterli; ikinci kez çalıştırırsan da bozulmaz
-- (if not exists / koşullu update).
--
-- NE YAPIYOR
--   products.collection_id  → ürünün ANA koleksiyonu (değişmiyor; ürün
--                             kartında ve listede bu isim görünür)
--   products.collection_ids → ürünün göründüğü TÜM koleksiyonlar
--                             (ana koleksiyon da bu dizinin içinde)
--
-- Eski collection_id kolonu duruyor: bu SQL çalıştırılmadan önce yazılmış
-- kodlar ve raporlar bozulmasın diye. Site kodu iki kolonu da okuyor,
-- collection_ids yoksa tek koleksiyonlu eski davranışa düşüyor.

-- 1) Yeni kolon
alter table public.products
  add column if not exists collection_ids uuid[] not null default '{}'::uuid[];

-- 2) Mevcut ürünleri taşı: her ürün şu an bulunduğu koleksiyonla başlasın
update public.products
   set collection_ids = array[collection_id]
 where collection_id is not null
   and cardinality(collection_ids) = 0;

-- 3) "Bu koleksiyondaki ürünler" sorgusu dizi içinde arama yapacağı için indeks
create index if not exists products_collection_ids_idx
  on public.products using gin (collection_ids);
