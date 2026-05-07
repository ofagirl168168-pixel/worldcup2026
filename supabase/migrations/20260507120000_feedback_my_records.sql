-- 麥迪信箱：讓使用者查詢自己送出過的紀錄
-- 用 voter_key（瀏覽器端隨機生成）綁定，跟 opinion_votes 同一套機制
-- RLS 維持嚴格（不開放 anonymous SELECT），透過 SECURITY DEFINER RPC 讓使用者只能查自己的

-- 1. 新增 voter_key 欄位
ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS voter_key text;

CREATE INDEX IF NOT EXISTS user_feedback_voter_key_idx
  ON user_feedback (voter_key, created_at DESC)
  WHERE voter_key IS NOT NULL AND deleted = false;

-- 2. RPC：給定 voter_key，回傳該 key 的所有 feedback（已軟刪的不回）
CREATE OR REPLACE FUNCTION get_my_feedback(vkey text)
RETURNS TABLE (
  id uuid,
  category text,
  content text,
  created_at timestamptz,
  read_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, category, content, created_at, read_at
    FROM user_feedback
   WHERE voter_key = vkey
     AND deleted = false
   ORDER BY created_at DESC
   LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_my_feedback(text) TO anon, authenticated;
