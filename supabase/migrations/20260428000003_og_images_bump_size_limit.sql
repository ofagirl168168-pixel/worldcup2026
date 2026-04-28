-- 把 og-images bucket 上傳大小上限從 512KB 拉到 2MB
-- 為什麼：browser canvas.toBlob('image/png') 不做 zlib 級壓縮，1200×630 PNG 常 600KB-1MB（server @napi-rs/canvas ~250KB 有比較好的壓縮）
-- OG 圖片社群平台上限通常 8MB，2MB 完全在合理範圍內

UPDATE storage.buckets
   SET file_size_limit = 2 * 1024 * 1024
 WHERE id = 'og-images';
