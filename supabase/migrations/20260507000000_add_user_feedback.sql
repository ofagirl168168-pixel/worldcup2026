-- 麥迪信箱：使用者回饋／意見反映
-- 任何人（含未登入）都可送出。Telegram bot 輪詢推送給站長，可軟刪除。

CREATE TABLE IF NOT EXISTS user_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL CHECK (category IN ('建議', 'Bug', '讚美', '其他')),
  nickname    text,                                       -- 選填，留空 = 匿名
  contact     text,                                       -- 選填，email 或其他聯絡方式
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent  text,                                       -- 自動帶（debug 用）
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted     boolean NOT NULL DEFAULT false,
  read_at     timestamptz                                 -- bot 標記已讀的時間
);

CREATE INDEX IF NOT EXISTS user_feedback_pending_idx
  ON user_feedback (created_at DESC)
  WHERE deleted = false AND read_at IS NULL;

-- Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- 任何人都可以新增回饋
DROP POLICY IF EXISTS "anon insert feedback" ON user_feedback;
CREATE POLICY "anon insert feedback"
  ON user_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 不開放任何 SELECT 給 anon/authenticated（只有 service_role 能讀，避免使用者看到別人的回饋）
-- service_role 本來就繞過 RLS，不用額外 policy

-- 加入 realtime publication，供 bot 訂閱 INSERT 事件（有需要時）
ALTER PUBLICATION supabase_realtime ADD TABLE user_feedback;
