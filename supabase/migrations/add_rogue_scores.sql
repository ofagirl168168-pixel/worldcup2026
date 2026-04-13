-- 射門挑戰排行榜
CREATE TABLE IF NOT EXISTS rogue_scores (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score      INT NOT NULL CHECK (score >= 0),
  wave       INT NOT NULL CHECK (wave >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rogue_scores_weekly ON rogue_scores (created_at DESC, score DESC);
CREATE INDEX idx_rogue_scores_user   ON rogue_scores (user_id, created_at DESC);

-- 週結算紀錄（防重複發獎）
CREATE TABLE IF NOT EXISTS rogue_weekly_settled (
  week_start DATE PRIMARY KEY,  -- 該週的週一日期
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: 用戶只能 insert 自己的分數，select 公開
ALTER TABLE rogue_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own scores"
  ON rogue_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Scores are publicly readable"
  ON rogue_scores FOR SELECT
  USING (true);

ALTER TABLE rogue_weekly_settled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly settled is publicly readable"
  ON rogue_weekly_settled FOR SELECT
  USING (true);

-- 排行榜 view：本週排行（每人取最高分）
CREATE OR REPLACE VIEW rogue_weekly_leaderboard AS
SELECT DISTINCT ON (rs.user_id)
  rs.user_id,
  p.nickname,
  rs.score,
  rs.wave,
  rs.created_at
FROM rogue_scores rs
JOIN profiles p ON p.id = rs.user_id
WHERE rs.created_at >= date_trunc('week', now())  -- PostgreSQL 週從週一算起
ORDER BY rs.user_id, rs.score DESC, rs.wave DESC;

-- 歷史總排行：每人最高分
CREATE OR REPLACE VIEW rogue_alltime_leaderboard AS
SELECT DISTINCT ON (rs.user_id)
  rs.user_id,
  p.nickname,
  rs.score,
  rs.wave,
  rs.created_at
FROM rogue_scores rs
JOIN profiles p ON p.id = rs.user_id
ORDER BY rs.user_id, rs.score DESC, rs.wave DESC;
