-- 新增第二展示徽章欄位（遊戲徽章用）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS showcase_badge_2 text DEFAULT NULL;

-- 重建 leaderboard VIEW（加入 showcase_badge_2）
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT p.id, p.nickname, p.xp, p.correct_answers, p.total_answered,
       p.team_code, p.showcase_badge, p.showcase_badge_2,
       p.pred_correct_direction, p.pred_exact_score, p.pred_total_settled,
       p.updated_at
FROM profiles p ORDER BY p.xp DESC;
