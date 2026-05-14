-- ============================================================
-- 排行榜 view 加上 pvp_elo（讓排行 tab 可以顯示 PvP 排名）
-- ============================================================

-- 中間插欄位 CREATE OR REPLACE 不行、要 DROP 重建
DROP VIEW IF EXISTS my_team_leaderboard;

CREATE VIEW my_team_leaderboard AS
SELECT
  t.user_id,
  t.team_name,
  t.team_crest,
  t.crest_primary,
  t.crest_accent,
  t.stadium_level,
  t.fans,
  t.pvp_elo,
  COALESCE(p.nickname, 'Anonymous') AS player_name,
  lp.season_num,
  lp.current_tier,
  lp.wins,
  lp.draws,
  lp.losses,
  lp.matches_played,
  lp.goals_for,
  lp.goals_against,
  (lp.wins * 3 + lp.draws) AS points,
  CASE WHEN lp.matches_played > 0
    THEN ROUND(lp.wins::numeric * 100 / lp.matches_played, 1)
    ELSE 0 END AS win_pct
FROM my_team t
LEFT JOIN league_progress lp ON lp.user_id = t.user_id
LEFT JOIN profiles p ON p.id = t.user_id;

GRANT SELECT ON my_team_leaderboard TO authenticated, anon;
