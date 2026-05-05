-- 一次性清理：把太早的 seed 留言軟刪除
-- 5/5 那天的題目最早留言不應早於 5/5 06:00 TW = 5/4 22:00 UTC
-- 5/6 那天的題目最早留言不應早於 5/6 06:00 TW = 5/5 22:00 UTC
-- 之前 seed 用 now-24h 起算 → 把跨日的留言都吃進去了，timeline 不合理

UPDATE opinion_comments
   SET deleted = true
 WHERE opinion_id = 'op-20260505-a'
   AND created_at < '2026-05-04T22:00:00Z';   -- 5/5 06:00 TW

UPDATE opinion_comments
   SET deleted = true
 WHERE opinion_id = 'op-20260506-a';           -- 5/6 還沒上線，整批先軟刪等明天再 seed
