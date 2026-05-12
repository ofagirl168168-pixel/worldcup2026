-- ============================================================
-- PvP 對戰系統
--   1. my_team 公開可見（is_pvp_visible 既有）
--   2. find_pvp_opponent：依 ELO 找對手、回 snapshot（含 11 starters + look_data + kit）
--   3. finalize_pvp_match：寫 ELO 變化、寫 match_history、套體力
-- ============================================================

-- ── 1. PvP 預設開啟可見（讓所有人都能被搜到對戰）──
UPDATE my_team SET is_pvp_visible = true WHERE is_pvp_visible IS NOT true;
ALTER TABLE my_team ALTER COLUMN is_pvp_visible SET DEFAULT true;

-- 加 PvP 限制欄位
ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS pvp_today_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pvp_last_reset_date DATE;

-- ── 2. 取得 PvP 隊伍 snapshot（含 11 starters）──
-- Helper：給定 user_id、回傳完整 match-sim 用的 team data
CREATE OR REPLACE FUNCTION get_pvp_team_snapshot(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team    my_team%ROWTYPE;
  v_starters JSONB;
  v_coach   JSONB := NULL;
  v_radar   JSONB;
BEGIN
  SELECT * INTO v_team FROM my_team WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- 取首發 11 人（不足補強卡）
  WITH starters AS (
    SELECT tp.id, tp.card_id, tp.in_starting_11,
           tp.current_attack, tp.current_defense, tp.current_speed,
           tp.current_midfield, tp.current_stamina, tp.current_aura,
           tp.look_data, pc.name AS card_name, pc.position AS card_pos
    FROM team_player tp
    JOIN player_card_pool pc ON pc.card_id = tp.card_id
    WHERE tp.team_user_id = p_user_id
    ORDER BY tp.in_starting_11 DESC, (tp.current_attack + tp.current_defense) DESC
    LIMIT 11
  )
  SELECT
    jsonb_agg(jsonb_build_object(
      'name', card_name, 'pos', card_pos, 'card_id', card_id,
      'look_data', look_data
    )),
    jsonb_build_object(
      'attack',  COALESCE(ROUND(AVG(current_attack))::int, 50),
      'defense', COALESCE(ROUND(AVG(current_defense))::int, 50),
      'speed',   COALESCE(ROUND(AVG(current_speed))::int, 50),
      'midfield',COALESCE(ROUND(AVG(current_midfield))::int, 50),
      'experience', LEAST(95, 50 + (v_team.stadium_level - 1) * 5)
    )
  INTO v_starters, v_radar
  FROM starters;

  -- 主教練
  IF v_team.active_coach_id IS NOT NULL THEN
    SELECT jsonb_build_object('name', cp.name, 'trait', cp.trait, 'trait_value', cp.trait_value)
    INTO v_coach
    FROM user_coach uc JOIN coach_pool cp ON cp.coach_id = uc.coach_id
    WHERE uc.id = v_team.active_coach_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'nameCN', v_team.team_name,
    'flag', v_team.team_crest,
    'crest_primary', v_team.crest_primary,
    'crest_accent', v_team.crest_accent,
    'formation', v_team.formation,
    'kit', jsonb_build_object(
      'shirtColor', v_team.kit_shirt_color,
      'pantsColor', v_team.kit_pants_color,
      'shoeColor',  v_team.kit_shoes_color
    ),
    'pvp_elo', v_team.pvp_elo,
    'coach', v_coach,
    'keyPlayers', COALESCE(v_starters, '[]'::jsonb),
    'radar', v_radar
  );
END;
$$;

-- ── 3. 找 PvP 對手：依 ELO 範圍 ± 200 內隨機 ──
CREATE OR REPLACE FUNCTION find_pvp_opponent()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_team    my_team%ROWTYPE;
  v_oid     UUID;
  v_today   DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.stamina < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_STAMINA'; END IF;

  -- 每日重置 PvP 次數
  IF v_team.pvp_last_reset_date IS DISTINCT FROM v_today THEN
    UPDATE my_team SET pvp_today_count = 0, pvp_last_reset_date = v_today WHERE user_id = v_uid;
    v_team.pvp_today_count := 0;
  END IF;
  IF v_team.pvp_today_count >= 5 THEN RAISE EXCEPTION 'PVP_DAILY_LIMIT_REACHED'; END IF;

  -- 找對手：ELO ± 200、有 ≥11 球員、非自己、is_pvp_visible
  SELECT t.user_id INTO v_oid
  FROM my_team t
  WHERE t.user_id <> v_uid
    AND t.is_pvp_visible = true
    AND t.pvp_elo BETWEEN v_team.pvp_elo - 200 AND v_team.pvp_elo + 200
    AND (SELECT count(*) FROM team_player tp WHERE tp.team_user_id = t.user_id) >= 11
  ORDER BY random() LIMIT 1;

  -- 沒找到 → 放寬 ELO 範圍 ± 500
  IF v_oid IS NULL THEN
    SELECT t.user_id INTO v_oid
    FROM my_team t
    WHERE t.user_id <> v_uid
      AND t.is_pvp_visible = true
      AND (SELECT count(*) FROM team_player tp WHERE tp.team_user_id = t.user_id) >= 11
    ORDER BY abs(t.pvp_elo - v_team.pvp_elo) LIMIT 1;
  END IF;

  IF v_oid IS NULL THEN RAISE EXCEPTION 'NO_PVP_OPPONENT'; END IF;
  RETURN get_pvp_team_snapshot(v_oid);
END;
$$;

GRANT EXECUTE ON FUNCTION get_pvp_team_snapshot(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_pvp_opponent() TO authenticated;


-- ── 4. PvP 結算：寫 ELO + match_history + 扣體力 + 加 RP ──
CREATE OR REPLACE FUNCTION finalize_pvp_match(
  p_opponent_id UUID,
  p_opponent_snapshot JSONB,
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
  v_uid     UUID := auth.uid();
  v_team    my_team%ROWTYPE;
  v_opp     my_team%ROWTYPE;
  v_result  TEXT;
  v_my_elo_delta  INT;
  v_opp_elo_delta INT;
  v_expected      NUMERIC;
  v_actual        NUMERIC;
  v_K             INT := 32;
  v_rp_base       INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  SELECT * INTO v_opp FROM my_team WHERE user_id = p_opponent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_OPPONENT'; END IF;

  -- 算結果
  IF p_score_home > p_score_away THEN v_result := 'W';
  ELSIF p_score_home < p_score_away THEN v_result := 'L';
  ELSE v_result := 'D'; END IF;

  -- ELO 計算（標準公式 K=32）
  v_expected := 1.0 / (1 + power(10, (v_opp.pvp_elo - v_team.pvp_elo) / 400.0));
  v_actual := CASE v_result WHEN 'W' THEN 1.0 WHEN 'D' THEN 0.5 ELSE 0.0 END;
  v_my_elo_delta := ROUND(v_K * (v_actual - v_expected));
  v_opp_elo_delta := -v_my_elo_delta;

  -- 寫 match_history
  v_rp_base := CASE v_result WHEN 'W' THEN 8 WHEN 'D' THEN 4 ELSE 2 END;
  INSERT INTO match_history (
    user_id, opponent_type, opponent_data,
    league_tier, is_boss, result, score_home, score_away,
    match_log, rp_earned, gems_earned, fans_delta
  )
  VALUES (
    v_uid, 'pvp', p_opponent_snapshot,
    NULL, false, v_result, p_score_home, p_score_away,
    p_match_log,
    jsonb_build_object('tactical', v_rp_base, 'physical', v_rp_base,
                       'heart', v_rp_base, 'idea', v_rp_base),
    CASE v_result WHEN 'W' THEN 5 ELSE 1 END,
    CASE v_result WHEN 'W' THEN 8 WHEN 'D' THEN 2 ELSE -3 END
  );

  -- 更新雙方 ELO + 我的 PvP 計數 + 扣體力 + RP
  UPDATE my_team
  SET pvp_elo         = pvp_elo + v_my_elo_delta,
      pvp_today_count = pvp_today_count + 1,
      stamina         = GREATEST(0, stamina - 1),
      rp_tactical     = rp_tactical + v_rp_base,
      rp_physical     = rp_physical + v_rp_base,
      rp_heart        = rp_heart    + v_rp_base,
      rp_idea         = rp_idea     + v_rp_base,
      fans            = GREATEST(0, fans + CASE v_result WHEN 'W' THEN 8 WHEN 'D' THEN 2 ELSE -3 END),
      updated_at      = now()
  WHERE user_id = v_uid;

  -- 對手只扣 ELO（不扣體力，他不是發起者）
  UPDATE my_team
  SET pvp_elo = pvp_elo + v_opp_elo_delta, updated_at = now()
  WHERE user_id = p_opponent_id;

  RETURN jsonb_build_object(
    'result', v_result,
    'my_elo_delta',  v_my_elo_delta,
    'new_my_elo',    v_team.pvp_elo + v_my_elo_delta,
    'opp_elo_delta', v_opp_elo_delta,
    'rp_earned',     v_rp_base
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_pvp_match(UUID, JSONB, INT, INT, JSONB) TO authenticated;
