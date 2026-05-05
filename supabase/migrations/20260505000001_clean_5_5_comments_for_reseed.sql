-- 一次性：清掉 5/5 所有現有 seed 留言準備重 seed（side 1 之前全被刪光，要補齊）
UPDATE opinion_comments
   SET deleted = true
 WHERE opinion_id = 'op-20260505-a'
   AND deleted = false;
