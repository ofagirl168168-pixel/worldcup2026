-- 修 og-images bucket RLS：把 INSERT/UPDATE/SELECT 的 role 從 `anon` 改成 `public`
-- 為什麼：使用者登入 Google 後 role 是 `authenticated` 不是 `anon`，原 policy `TO anon` 對他們不生效
-- → upload 失敗 (row violates RLS)。改 `TO public` 同時 cover anon + authenticated。

DROP POLICY IF EXISTS "anon insert og r/" ON storage.objects;
CREATE POLICY "og insert r/" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'og-images'
    AND (storage.foldername(name))[1] = 'r'
  );

DROP POLICY IF EXISTS "anon update og r/" ON storage.objects;
CREATE POLICY "og update r/" ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'og-images' AND (storage.foldername(name))[1] = 'r')
  WITH CHECK (bucket_id = 'og-images' AND (storage.foldername(name))[1] = 'r');

DROP POLICY IF EXISTS "anyone read og" ON storage.objects;
CREATE POLICY "og read all" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'og-images');
