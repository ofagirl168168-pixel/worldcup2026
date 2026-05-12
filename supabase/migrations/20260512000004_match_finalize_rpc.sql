-- ============================================================
-- 我的球隊 Phase 1.9 — 比賽結束結算 RPC
-- 設計依據 docs/my-team-design.md §4.1 §5.4-B §6 §7.5
-- ============================================================

CREATE OR REPLACE FUNCTION finalize_match(
  p_opponent_data JSONB,      -- 對手快照
  p_opponent_type TEXT,       -- 'ai_npc' | 'ai_real'
  p_is_boss BOOLEAN,
  p_score_home INT,
  p_score_away INT,
  p_match_log JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_team      my_team%ROWTYPE;
  v_prog      league_progress%ROWTYPE;
  v_result    TEXT;
  v_rp_base   INT;
  v_gems_base INT;
  v_fans_delta INT := 0;
  v_streak_after INT;
  v_match_history_id UUID;
  v_season_complete BOOLEAN := false;
  v_tier_change TEXT := 'none';     -- 'up' | 'down' | 'none'
  v_new_tier  INT;
  v_season_reward_gems INT := 0;
  v_season_reward_ssr_ticket INT := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_opponent_type NOT IN ('ai_npc','ai_real') THEN RAISE EXCEPTION 'INVALID_OPPONENT_TYPE'; END IF;
  IF p_score_home < 0 OR p_score_away < 0 THEN RAISE EXCEPTION 'INVALID_SCORE'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  SELECT * INTO v_prog FROM league_progress WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO league_progress (user_id) VALUES (v_uid) RETURNING * INTO v_prog;
  END IF;

  -- 體力 -1
  IF v_team.stamina < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_STAMINA'; END IF;

  -- 結果判定
  IF p_score_home > p_score_away THEN v_result := 'W';
  ELSIF p_score_home < p_score_away THEN v_result := 'L';
  ELSE v_result := 'D'; END IF;

  -- 基礎獎勵（§4.1 + §5.4-B v0.7 寶石獎勵調降版）
  IF v_result = 'W' THEN
    v_rp_base := 20;
    v_gems_base := GREATEST(1, v_prog.current_tier / 4);  -- Tier 1 ≈ 0(會 GREATEST 補 1)、Tier 4 ≈ 1、Tier 10 ≈ 2-3
    v_fans_delta := 5 + v_prog.current_tier * 2;
  ELSIF v_result = 'D' THEN
    v_rp_base := 10;
    v_gems_base := 0;
    v_fans_delta := 1;
  ELSE
    v_rp_base := 5;
    v_gems_base := 0;
    v_fans_delta := -2;
  END IF;

  -- Boss 戰擊敗加碼（§7.5）
  IF p_is_boss AND v_result = 'W' THEN
    v_gems_base := v_gems_base + 30 + (v_prog.current_tier - 4) * 5; -- Tier 4 +30 / Tier 10 +60
  END IF;

  -- 寫 match_history
  INSERT INTO match_history (
    user_id, opponent_type, opponent_data, league_tier, is_boss,
    result, score_home, score_away, match_log,
    rp_earned, gems_earned, fans_delta
  )
  VALUES (
    v_uid, p_opponent_type, p_opponent_data, v_prog.current_tier, p_is_boss,
    v_result, p_score_home, p_score_away, p_match_log,
    jsonb_build_object(
      'tactical', v_rp_base, 'physical', v_rp_base,
      'heart', v_rp_base, 'idea', v_rp_base
    ),
    v_gems_base, v_fans_delta
  )
  RETURNING id INTO v_match_history_id;

  -- 更新 league_progress
  UPDATE league_progress
  SET matches_played = matches_played + 1,
      wins   = wins   + CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
      draws  = draws  + CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
      losses = losses + CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
      goals_for     = goals_for     + p_score_home,
      goals_against = goals_against + p_score_away,
      updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_prog;

  -- 賽季結束判定（10 場）+ tier up/down
  IF v_prog.matches_played >= 10 THEN
    v_season_complete := true;
    v_new_tier := v_prog.current_tier;
    -- 升降級依 design §6.1
    IF v_prog.wins >= 7 AND v_prog.current_tier < 10 THEN
      v_new_tier := v_prog.current_tier + 1;
      v_tier_change := 'up';
    ELSIF v_prog.wins <= 3 AND v_prog.current_tier > 1 THEN
      v_new_tier := v_prog.current_tier - 1;
      v_tier_change := 'down';
    END IF;
    -- 完賽獎勵 tier×10 寶石 + 冠軍（7+ 勝）tier×30 寶石 + 1 SSR 自選券
    v_season_reward_gems := v_prog.current_tier * 10;
    IF v_prog.wins >= 7 THEN
      v_season_reward_gems := v_season_reward_gems + v_prog.current_tier * 30;
      v_season_reward_ssr_ticket := 1;
    END IF;
    -- reset 賽季
    UPDATE league_progress
    SET current_tier = v_new_tier,
        season_num = season_num + 1,
        matches_played = 0,
        wins = 0, draws = 0, losses = 0,
        goals_for = 0, goals_against = 0,
        updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  -- 更新 my_team：扣體力、加 RP、加寶石（透過 gems 系統不在此處理，先記在 fans 上反映）、加球迷
  UPDATE my_team
  SET stamina      = stamina - 1,
      rp_tactical  = rp_tactical + v_rp_base,
      rp_physical  = rp_physical + v_rp_base,
      rp_heart     = rp_heart    + v_rp_base,
      rp_idea      = rp_idea     + v_rp_base,
      fans         = GREATEST(0, fans + v_fans_delta),
      ssr_select_tickets = ssr_select_tickets + v_season_reward_ssr_ticket,
      updated_at   = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'result', v_result,
    'rp_earned', v_rp_base,
    'gems_earned', v_gems_base + v_season_reward_gems,
    'fans_delta', v_fans_delta,
    'match_history_id', v_match_history_id,
    'is_boss', p_is_boss,
    'season_complete', v_season_complete,
    'tier_change', v_tier_change,
    'new_tier', COALESCE(v_new_tier, v_prog.current_tier),
    'season_reward_gems', v_season_reward_gems,
    'season_reward_ssr_ticket', v_season_reward_ssr_ticket
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_match(JSONB, TEXT, BOOLEAN, INT, INT, JSONB) TO authenticated;
