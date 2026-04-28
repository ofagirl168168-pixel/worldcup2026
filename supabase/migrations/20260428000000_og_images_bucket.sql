-- 朋友房 OG 縮圖 Storage bucket
-- 房主在瀏覽器即時 render PNG 上傳到這 → 分享 30 秒內就有客製預覽
-- 不靠 GHA cron（5 min 太慢）也不靠 commit + Cloudflare redeploy

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'og-images',
  'og-images',
  true,                           -- public read（社群 bot 直抓 og:image URL 用）
  512 * 1024,                     -- 單檔上限 512KB（OG 縮圖 ~250KB）
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- anon 可上傳到 r/ 路徑（房主即時 render）
DROP POLICY IF EXISTS "anon insert og r/" ON storage.objects;
CREATE POLICY "anon insert og r/" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'og-images'
    AND (storage.foldername(name))[1] = 'r'
  );

-- anon 可覆寫自己上傳的（房資料變動時重新 render）
-- 沒辦法判斷「自己」，但 RLS 限制只能覆寫 r/ 下的
DROP POLICY IF EXISTS "anon update og r/" ON storage.objects;
CREATE POLICY "anon update og r/" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'og-images' AND (storage.foldername(name))[1] = 'r')
  WITH CHECK (bucket_id = 'og-images' AND (storage.foldername(name))[1] = 'r');

-- 公開讀（雖然 bucket 設 public，policy 補一層保險）
DROP POLICY IF EXISTS "anyone read og" ON storage.objects;
CREATE POLICY "anyone read og" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'og-images');
