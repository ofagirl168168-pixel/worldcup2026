-- 麥迪擂台留言板
-- 每位觀眾可針對某題 (opinion_id) 的某一邊 (side) 發表一則短留言
-- 由 Telegram bot 進行軟刪除 (deleted = true)

CREATE TABLE IF NOT EXISTS opinion_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opinion_id  text NOT NULL,
  side        int  NOT NULL CHECK (side BETWEEN 0 AND 3),
  nickname    text,
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 100),
  likes       int  NOT NULL DEFAULT 0,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS opinion_comments_visible_idx
  ON opinion_comments (opinion_id, created_at DESC)
  WHERE deleted = false;

-- Row Level Security
ALTER TABLE opinion_comments ENABLE ROW LEVEL SECURITY;

-- 匿名可讀取未刪除的留言
DROP POLICY IF EXISTS "anon read visible" ON opinion_comments;
CREATE POLICY "anon read visible"
  ON opinion_comments FOR SELECT
  TO anon, authenticated
  USING (deleted = false);

-- 任何人都可以新增留言
DROP POLICY IF EXISTS "anon insert" ON opinion_comments;
CREATE POLICY "anon insert"
  ON opinion_comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 按讚用 SECURITY DEFINER RPC（只能 +1 likes，無法竄改其他欄位）
CREATE OR REPLACE FUNCTION opinion_comment_like(cid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE opinion_comments
     SET likes = likes + 1
   WHERE id = cid AND deleted = false;
$$;

GRANT EXECUTE ON FUNCTION opinion_comment_like(uuid) TO anon, authenticated;

-- 不開放直接 UPDATE（likes 改走 RPC；刪除由 service_role 處理）

-- service_role 擁有完整權限（供 Telegram bot 軟刪除使用）
-- service_role 本來就繞過 RLS，這邊不用額外 policy

-- 加入 realtime publication，供 bot 訂閱 INSERT + UPDATE 事件
ALTER PUBLICATION supabase_realtime ADD TABLE opinion_comments;
