-- ============================================================
-- 球場升級 RPC + 賽季排行榜 view
-- ============================================================

-- ── 球場升級花費表（lv 2..10 寶石花費，每級遞增）──
-- Level 1=起始、要升到 L 從 L-1 → L 的花費
CREATE OR REPLACE FUNCTION stadium_upgrade_cost(target_level INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN target_level <= 1 THEN 0
    WHEN target_level = 2  THEN 30
    WHEN target_level = 3  THEN 60
    WHEN target_level = 4  THEN 120
    WHEN target_level = 5  THEN 200
    WHEN target_level = 6  THEN 350
    WHEN target_level = 7  THEN 550
    WHEN target_level = 8  THEN 800
    WHEN target_level = 9  THEN 1200
    WHEN target_level = 10 THEN 2000
    ELSE 99999
  END;
$$;

-- ── 升級 RPC：扣寶石、加場館等級、fans 上限 +50 ──
CREATE OR REPLACE FUNCTION upgrade_stadium()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_team   my_team%ROWTYPE;
  v_target INT;
  v_cost   INT;
  v_gems   INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.stadium_level >= 10 THEN RAISE EXCEPTION 'MAX_LEVEL'; END IF;

  v_target := v_team.stadium_level + 1;
  v_cost   := stadium_upgrade_cost(v_target);

  -- 寶石檢查（存在 profiles 的 gems 欄）
  SELECT gems INTO v_gems FROM profiles WHERE id = v_uid;
  IF v_gems IS NULL OR v_gems < v_cost THEN RAISE EXCEPTION 'INSUFFICIENT_GEMS'; END IF;

  -- 扣寶石
  UPDATE profiles SET gems = gems - v_cost WHERE id = v_uid;
  -- 升級
  UPDATE my_team
  SET stadium_level = v_target,
      fans          = LEAST(99999, fans + 50),
      stamina_max   = LEAST(10, stamina_max + CASE WHEN v_target IN (3,6,9) THEN 1 ELSE 0 END),
      updated_at    = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'new_level',  v_target,
    'cost',       v_cost,
    'remaining_gems', v_gems - v_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION stadium_upgrade_cost(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_stadium() TO authenticated;


-- ── 賽季排行榜 view ──
-- 公開：可看到其他玩家的 team_name / tier / 戰績、不洩漏 user_id（顯示 username from profiles.display_name）
CREATE OR REPLACE VIEW my_team_leaderboard AS
SELECT
  t.user_id,
  t.team_name,
  t.team_crest,
  t.crest_primary,
  t.crest_accent,
  t.stadium_level,
  t.fans,
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

-- 開啟公開讀：任何已登入使用者都看得到（用來顯示排行榜）
GRANT SELECT ON my_team_leaderboard TO authenticated, anon;

COMMENT ON VIEW my_team_leaderboard IS '公開排行榜（不含敏感資料如 ticket/RP）';
