-- 5/5 seed 留言時間起點從 06:00 TW 改成 12:00 TW（題目實際上線時間）
-- 把舊的全清掉準備重 seed
UPDATE opinion_comments
   SET deleted = true
 WHERE opinion_id = 'op-20260505-a'
   AND deleted = false;
