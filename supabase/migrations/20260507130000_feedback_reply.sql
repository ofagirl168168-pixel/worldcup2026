-- 麥迪信箱：站長回覆功能
-- 加 reply 與 replied_at；contact 欄位保留（之前 INSERT 過的資料不刪）但前端不再用

ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- 先 DROP 舊版 RPC（CREATE OR REPLACE 不能改回傳型別）
DROP FUNCTION IF EXISTS get_my_feedback(text);

CREATE OR REPLACE FUNCTION get_my_feedback(vkey text)
RETURNS TABLE (
  id uuid,
  category text,
  content text,
  created_at timestamptz,
  read_at timestamptz,
  reply text,
  replied_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, category, content, created_at, read_at, reply, replied_at
    FROM user_feedback
   WHERE voter_key = vkey
     AND deleted = false
   ORDER BY created_at DESC
   LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION get_my_feedback(text) TO anon, authenticated;
