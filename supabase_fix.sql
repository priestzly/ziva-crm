-- ====================================
-- ZIVA CRM - SUPABASE TAM DÜZELTME
-- ====================================

-- 1. maintenance_photos tablosu RLS'i aktifse, SELECT/INSERT/DELETE izinleri ver
ALTER TABLE IF EXISTS public.maintenance_photos ENABLE ROW LEVEL SECURITY;

-- Eski policy'leri silip temiz başla (hata verirse önemsizdir)
DROP POLICY IF EXISTS "Auth Read Photos" ON public.maintenance_photos;
DROP POLICY IF EXISTS "Auth Insert Photos" ON public.maintenance_photos;
DROP POLICY IF EXISTS "Auth Delete Photos" ON public.maintenance_photos;

-- Herkes (giriş yapmış) okuyabilsin
CREATE POLICY "Auth Read Photos" ON public.maintenance_photos
  FOR SELECT TO authenticated USING (true);

-- Herkes (giriş yapmış) ekleyebilsin
CREATE POLICY "Auth Insert Photos" ON public.maintenance_photos
  FOR INSERT TO authenticated WITH CHECK (true);

-- Herkes (giriş yapmış) silebilsin
CREATE POLICY "Auth Delete Photos" ON public.maintenance_photos
  FOR DELETE TO authenticated USING (true);


-- 2. Storage bucket policy'leri (eğer eksikse)
-- Aşağıdaki satırlar hata verirse zaten var demektir, önemsiz
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Auth Upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'maintenance-photos');

CREATE POLICY "Auth Update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Auth Delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'maintenance-photos');
