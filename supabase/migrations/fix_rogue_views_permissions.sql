-- 修正排行榜 view 的 API 存取權限
GRANT SELECT ON rogue_weekly_leaderboard TO anon, authenticated;
GRANT SELECT ON rogue_alltime_leaderboard TO anon, authenticated;

-- rogue_scores 需要讓 authenticated 角色 INSERT
GRANT INSERT ON rogue_scores TO authenticated;
GRANT SELECT ON rogue_scores TO anon, authenticated;

-- rogue_weekly_settled 需要讓 service_role INSERT（由 Edge Function 操作）
GRANT SELECT ON rogue_weekly_settled TO anon, authenticated;
