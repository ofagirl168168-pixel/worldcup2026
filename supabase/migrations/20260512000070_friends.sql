-- ============================================================
-- 朋友關係 — 雙向 follow（簡化版：A 關注 B 不需 B 同意）
-- 看朋友陣容直接調 get_pvp_team_snapshot（已是公開的）
-- ============================================================

CREATE TABLE IF NOT EXISTS user_friend (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_user_friend_user ON user_friend(user_id);

ALTER TABLE user_friend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own friends" ON user_friend FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user adds own friends" ON user_friend FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user removes own friends" ON user_friend FOR DELETE
  USING (auth.uid() = user_id);
