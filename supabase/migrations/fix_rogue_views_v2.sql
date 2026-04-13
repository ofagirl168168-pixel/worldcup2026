-- 修正排行榜 view：確保排序正確 + security_definer 避免權限問題

-- 先刪除舊 view
DROP VIEW IF EXISTS rogue_weekly_leaderboard;
DROP VIEW IF EXISTS rogue_alltime_leaderboard;

-- 本週排行：每人取最高分，按分數降序排列
CREATE VIEW rogue_weekly_leaderboard WITH (security_invoker = false) AS
SELECT
  b.user_id,
  p.nickname,
  b.score,
  b.wave,
  b.created_at
FROM (
  SELECT DISTINCT ON (user_id)
    user_id, score, wave, created_at
  FROM rogue_scores
  WHERE created_at >= date_trunc('week', now())
  ORDER BY user_id, score DESC, wave DESC
) b
JOIN profiles p ON p.id = b.user_id
ORDER BY b.score DESC, b.wave DESC;

-- 歷史總排行：每人最高分，按分數降序排列
CREATE VIEW rogue_alltime_leaderboard WITH (security_invoker = false) AS
SELECT
  b.user_id,
  p.nickname,
  b.score,
  b.wave,
  b.created_at
FROM (
  SELECT DISTINCT ON (user_id)
    user_id, score, wave, created_at
  FROM rogue_scores
  ORDER BY user_id, score DESC, wave DESC
) b
JOIN profiles p ON p.id = b.user_id
ORDER BY b.score DESC, b.wave DESC;

-- 重新授權
GRANT SELECT ON rogue_weekly_leaderboard TO anon, authenticated;
GRANT SELECT ON rogue_alltime_leaderboard TO anon, authenticated;
