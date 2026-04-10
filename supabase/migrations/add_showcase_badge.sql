-- 新增展示徽章欄位 + 預測結算統計欄位
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS showcase_badge text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pred_correct_direction int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pred_exact_score int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pred_total_settled int DEFAULT 0;

-- 重建 leaderboard VIEW（加入新欄位）
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT p.id, p.nickname, p.xp, p.correct_answers, p.total_answered,
       p.team_code, p.showcase_badge,
       p.pred_correct_direction, p.pred_exact_score, p.pred_total_settled,
       p.updated_at
FROM profiles p ORDER BY p.xp DESC;
