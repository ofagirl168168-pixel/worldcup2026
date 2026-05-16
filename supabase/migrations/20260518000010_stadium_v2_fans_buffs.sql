-- ============================================================
-- 球場 v2：球迷上限 + 球迷加成 + 聯賽 tier 球場門檻
-- ------------------------------------------------------------
-- 設計：
--   1. 球迷上限 = 200 + lv * 300（Lv1=500、Lv5=1700、Lv10=3200）
--   2. 球迷加成 % = LEAST(40, fans / 100)
--        → 套用：傷病恢復時間、訓練時長 各打折
--   3. 聯賽 tier 門檻：升到 tier T 需要球場 Lv >= T - 1
--        （Lv1 可升到 tier 2、Lv9 可升到 tier 10）
--   4. fans 賽後加扣依然 +/-，但加時 clamp 到 cap
-- ============================================================

-- ── helper 函式 ──────────────────────────────────
CREATE OR REPLACE FUNCTION fans_cap_for_level(p_level INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 200 + GREATEST(1, LEAST(10, COALESCE(p_level, 1))) * 300;
$$;

CREATE OR REPLACE FUNCTION fans_speed_bonus_pct(p_fans INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT LEAST(40, GREATEST(0, COALESCE(p_fans, 0) / 100));
$$;

GRANT EXECUTE ON FUNCTION fans_cap_for_level(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION fans_speed_bonus_pct(INT) TO authenticated, anon;

-- ── 1. upgrade_stadium：fans 升級即送 + clamp 到新 cap ──
CREATE OR REPLACE FUNCTION upgrade_stadium()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_team    my_team%ROWTYPE;
  v_target  INT;
  v_cost    INT;
  v_gems    INT;
  v_new_cap INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.stadium_level >= 10 THEN RAISE EXCEPTION 'MAX_LEVEL'; END IF;

  v_target := v_team.stadium_level + 1;
  v_cost   := stadium_upgrade_cost(v_target);

  SELECT gems INTO v_gems FROM profiles WHERE id = v_uid;
  IF v_gems IS NULL OR v_gems < v_cost THEN RAISE EXCEPTION 'INSUFFICIENT_GEMS'; END IF;

  UPDATE profiles SET gems = gems - v_cost WHERE id = v_uid;

  v_new_cap := fans_cap_for_level(v_target);
  UPDATE my_team
  SET stadium_level = v_target,
      fans          = LEAST(v_new_cap, fans + 50),     -- 升級送 50、clamp 到新 cap
      stamina_max   = LEAST(10, stamina_max + CASE WHEN v_target IN (3,6,9) THEN 1 ELSE 0 END),
      updated_at    = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'new_level',       v_target,
    'cost',            v_cost,
    'remaining_gems',  v_gems - v_cost,
    'new_fans_cap',    v_new_cap
  );
END;
$$;
GRANT EXECUTE ON FUNCTION upgrade_stadium() TO authenticated;


-- ── 2. injure_random_player：依球迷數縮短恢復天數 ──
CREATE OR REPLACE FUNCTION injure_random_player(p_chance_pct INT DEFAULT 8)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_team      my_team%ROWTYPE;
  v_player    RECORD;
  v_days_base INT;
  v_speedup   INT;
  v_hours     INT;
  v_finish    TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF random() * 100 >= p_chance_pct THEN
    RETURN jsonb_build_object('injured', false);
  END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('injured', false); END IF;

  SELECT tp.id, pc.name INTO v_player FROM team_player tp
  JOIN player_card_pool pc ON pc.card_id = tp.card_id
  WHERE tp.team_user_id = v_uid AND tp.in_starting_11
    AND (tp.injured_until IS NULL OR tp.injured_until < now())
  ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('injured', false); END IF;

  v_days_base := 2 + floor(random() * 3);                   -- 2-4 天
  v_speedup   := fans_speed_bonus_pct(v_team.fans);          -- 0-40%
  -- 用小時做精度（24 hr/day × days × (100 - speedup) / 100）、最少 12 小時
  v_hours  := GREATEST(12, ROUND(24 * v_days_base * (100 - v_speedup) / 100.0));
  v_finish := now() + (v_hours || ' hours')::interval;

  UPDATE team_player SET injured_until = v_finish WHERE id = v_player.id;
  RETURN jsonb_build_object(
    'injured',     true,
    'player_id',   v_player.id,
    'name',        v_player.name,
    'days',        v_days_base,
    'hours',       v_hours,
    'speedup_pct', v_speedup
  );
END;
$$;
GRANT EXECUTE ON FUNCTION injure_random_player(INT) TO authenticated;


-- ── 3. start_timed_training：依球迷數縮短訓練時間（tutorial 不變）──
DROP FUNCTION IF EXISTS start_timed_training(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION start_timed_training(
  p_player_id UUID,
  p_attr TEXT,
  p_tier TEXT DEFAULT '30m'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_player       team_player%ROWTYPE;
  v_team         my_team%ROWTYPE;
  v_seconds      INT;
  v_seconds_raw  INT;
  v_finish       TIMESTAMPTZ;
  v_actual_tier  TEXT;
  v_speedup      INT := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_attr NOT IN ('attack','defense','speed','midfield','stamina','aura') THEN
    RAISE EXCEPTION 'INVALID_ATTR';
  END IF;
  IF p_tier NOT IN ('tutorial','30m','2h','8h','24h') THEN
    RAISE EXCEPTION 'INVALID_TIER';
  END IF;

  SELECT * INTO v_player FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF v_player.training_attr IS NOT NULL AND v_player.training_finish_at > now() THEN
    RAISE EXCEPTION 'ALREADY_TRAINING';
  END IF;
  IF v_player.level >= 50 THEN RAISE EXCEPTION 'MAX_LEVEL'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  v_speedup := fans_speed_bonus_pct(v_team.fans);

  IF p_tier = 'tutorial' THEN
    IF v_team.tutorial_first_training_used THEN
      v_actual_tier := '30m';
      v_seconds_raw := 30 * 60;
    ELSE
      UPDATE my_team SET tutorial_first_training_used = true WHERE user_id = v_uid;
      v_actual_tier := 'tutorial';
      v_seconds_raw := 3;
    END IF;
  ELSE
    v_actual_tier := p_tier;
    v_seconds_raw := CASE p_tier
      WHEN '30m' THEN 30 * 60
      WHEN '2h'  THEN 2 * 3600
      WHEN '8h'  THEN 8 * 3600
      WHEN '24h' THEN 24 * 3600
    END;
  END IF;

  -- tutorial 不打折、其餘套球迷加速
  IF v_actual_tier = 'tutorial' THEN
    v_seconds := v_seconds_raw;
  ELSE
    v_seconds := GREATEST(60, FLOOR(v_seconds_raw * (100 - v_speedup) / 100.0));
  END IF;

  v_finish := now() + (v_seconds || ' seconds')::interval;
  UPDATE team_player
  SET training_attr = p_attr,
      training_finish_at = v_finish,
      training_tier = v_actual_tier
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'attr',         p_attr,
    'tier',         v_actual_tier,
    'duration_sec', v_seconds,
    'base_sec',     v_seconds_raw,
    'speedup_pct',  v_speedup,
    'finish_at',    v_finish
  );
END;
$$;
GRANT EXECUTE ON FUNCTION start_timed_training(UUID, TEXT, TEXT) TO authenticated;


-- ── 4. finalize_match：聯賽升級加球場門檻 + fans 加 clamp 到 cap ──
CREATE OR REPLACE FUNCTION finalize_match(
  p_opponent_data JSONB,
  p_opponent_type TEXT,
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
  v_match_history_id UUID;
  v_season_complete BOOLEAN := false;
  v_tier_change TEXT := 'none';
  v_new_tier  INT;
  v_season_reward_gems INT := 0;
  v_season_reward_ssr_ticket INT := 0;
  v_promotion_blocked BOOLEAN := false;
  v_fans_cap  INT;
  v_new_fans  INT;
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

  IF v_team.stamina < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_STAMINA'; END IF;

  IF p_score_home > p_score_away THEN v_result := 'W';
  ELSIF p_score_home < p_score_away THEN v_result := 'L';
  ELSE v_result := 'D'; END IF;

  IF v_result = 'W' THEN
    v_rp_base := 20;
    v_gems_base := GREATEST(1, v_prog.current_tier / 4);
    v_fans_delta := 5 + v_prog.current_tier * 2;
  ELSIF v_result = 'D' THEN
    v_rp_base := 10; v_gems_base := 0; v_fans_delta := 1;
  ELSE
    v_rp_base := 5;  v_gems_base := 0; v_fans_delta := -2;
  END IF;
  IF p_is_boss AND v_result = 'W' THEN
    v_gems_base := v_gems_base + 30 + (v_prog.current_tier - 4) * 5;
  END IF;

  INSERT INTO match_history (
    user_id, opponent_type, opponent_data, league_tier, is_boss,
    result, score_home, score_away, match_log,
    rp_earned, gems_earned, fans_delta
  )
  VALUES (
    v_uid, p_opponent_type, p_opponent_data, v_prog.current_tier, p_is_boss,
    v_result, p_score_home, p_score_away, p_match_log,
    jsonb_build_object('tactical', v_rp_base, 'physical', v_rp_base,
                       'heart', v_rp_base, 'idea', v_rp_base),
    v_gems_base, v_fans_delta
  )
  RETURNING id INTO v_match_history_id;

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

  -- 賽季結束 + tier up/down + 球場門檻
  IF v_prog.matches_played >= 10 THEN
    v_season_complete := true;
    v_new_tier := v_prog.current_tier;

    IF v_prog.wins >= 7 AND v_prog.current_tier < 10 THEN
      -- 球場門檻：升到 tier T 需要 stadium_level >= T - 1
      IF v_team.stadium_level < (v_prog.current_tier + 1) - 1 THEN
        v_promotion_blocked := true;
        v_new_tier := v_prog.current_tier;             -- 留在原 tier
        v_tier_change := 'blocked';
      ELSE
        v_new_tier := v_prog.current_tier + 1;
        v_tier_change := 'up';
      END IF;
    ELSIF v_prog.wins <= 3 AND v_prog.current_tier > 1 THEN
      v_new_tier := v_prog.current_tier - 1;
      v_tier_change := 'down';
    END IF;

    v_season_reward_gems := v_prog.current_tier * 10;
    IF v_prog.wins >= 7 THEN
      v_season_reward_gems := v_season_reward_gems + v_prog.current_tier * 30;
      v_season_reward_ssr_ticket := 1;
    END IF;

    UPDATE league_progress
    SET current_tier = v_new_tier,
        season_num = season_num + 1,
        matches_played = 0,
        wins = 0, draws = 0, losses = 0,
        goals_for = 0, goals_against = 0,
        updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  -- fans 加 clamp 到 cap、扣不破 0
  v_fans_cap := fans_cap_for_level(v_team.stadium_level);
  IF v_fans_delta >= 0 THEN
    v_new_fans := LEAST(v_fans_cap, v_team.fans + v_fans_delta);
  ELSE
    v_new_fans := GREATEST(0, v_team.fans + v_fans_delta);
  END IF;

  UPDATE my_team
  SET stamina      = stamina - 1,
      rp_tactical  = rp_tactical + v_rp_base,
      rp_physical  = rp_physical + v_rp_base,
      rp_heart     = rp_heart    + v_rp_base,
      rp_idea      = rp_idea     + v_rp_base,
      fans         = v_new_fans,
      ssr_select_tickets = ssr_select_tickets + v_season_reward_ssr_ticket,
      updated_at   = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'result', v_result,
    'rp_earned', v_rp_base,
    'gems_earned', v_gems_base + v_season_reward_gems,
    'fans_delta', v_new_fans - v_team.fans,
    'fans_cap', v_fans_cap,
    'match_history_id', v_match_history_id,
    'is_boss', p_is_boss,
    'season_complete', v_season_complete,
    'tier_change', v_tier_change,
    'promotion_blocked', v_promotion_blocked,
    'new_tier', COALESCE(v_new_tier, v_prog.current_tier),
    'season_reward_gems', v_season_reward_gems,
    'season_reward_ssr_ticket', v_season_reward_ssr_ticket
  );
END;
$$;
GRANT EXECUTE ON FUNCTION finalize_match(JSONB, TEXT, BOOLEAN, INT, INT, JSONB) TO authenticated;


-- ── 5. finalize_pvp_match：fans 加 clamp 到 cap ──
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
  v_fans_delta    INT;
  v_fans_cap      INT;
  v_new_fans      INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  SELECT * INTO v_opp FROM my_team WHERE user_id = p_opponent_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_OPPONENT'; END IF;

  IF p_score_home > p_score_away THEN v_result := 'W';
  ELSIF p_score_home < p_score_away THEN v_result := 'L';
  ELSE v_result := 'D'; END IF;

  v_expected := 1.0 / (1 + power(10, (v_opp.pvp_elo - v_team.pvp_elo) / 400.0));
  v_actual := CASE v_result WHEN 'W' THEN 1.0 WHEN 'D' THEN 0.5 ELSE 0.0 END;
  v_my_elo_delta := ROUND(v_K * (v_actual - v_expected));
  v_opp_elo_delta := -v_my_elo_delta;

  v_rp_base    := CASE v_result WHEN 'W' THEN 8 WHEN 'D' THEN 4 ELSE 2 END;
  v_fans_delta := CASE v_result WHEN 'W' THEN 8 WHEN 'D' THEN 2 ELSE -3 END;

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
    v_fans_delta
  );

  -- fans clamp 到 cap
  v_fans_cap := fans_cap_for_level(v_team.stadium_level);
  IF v_fans_delta >= 0 THEN
    v_new_fans := LEAST(v_fans_cap, v_team.fans + v_fans_delta);
  ELSE
    v_new_fans := GREATEST(0, v_team.fans + v_fans_delta);
  END IF;

  UPDATE my_team
  SET pvp_elo         = pvp_elo + v_my_elo_delta,
      pvp_today_count = pvp_today_count + 1,
      stamina         = GREATEST(0, stamina - 1),
      rp_tactical     = rp_tactical + v_rp_base,
      rp_physical     = rp_physical + v_rp_base,
      rp_heart        = rp_heart    + v_rp_base,
      rp_idea          = rp_idea    + v_rp_base,
      fans            = v_new_fans,
      updated_at      = now()
  WHERE user_id = v_uid;

  UPDATE my_team
  SET pvp_elo = pvp_elo + v_opp_elo_delta, updated_at = now()
  WHERE user_id = p_opponent_id;

  RETURN jsonb_build_object(
    'result', v_result,
    'my_elo_delta',  v_my_elo_delta,
    'new_my_elo',    v_team.pvp_elo + v_my_elo_delta,
    'opp_elo_delta', v_opp_elo_delta,
    'rp_earned',     v_rp_base,
    'fans_delta',    v_new_fans - v_team.fans,
    'fans_cap',      v_fans_cap
  );
END;
$$;
GRANT EXECUTE ON FUNCTION finalize_pvp_match(UUID, JSONB, INT, INT, JSONB) TO authenticated;

-- ── 6. get_pvp_team_snapshot：把 fans 加進 snapshot（供 pre-match 顯示球迷差距）──
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
      'name', card_name, 'pos', card_pos, 'card_id', card_id, 'look_data', look_data
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

  IF v_team.active_coach_id IS NOT NULL THEN
    SELECT jsonb_build_object('name', cp.name, 'trait', cp.trait, 'trait_value', cp.trait_value)
    INTO v_coach FROM user_coach uc JOIN coach_pool cp ON cp.coach_id = uc.coach_id
    WHERE uc.id = v_team.active_coach_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'nameCN', v_team.team_name, 'flag', v_team.team_crest,
    'crest_primary', v_team.crest_primary, 'crest_accent', v_team.crest_accent,
    'formation', v_team.formation,
    'kit', jsonb_build_object(
      'shirtColor', v_team.kit_shirt_color,
      'pantsColor', v_team.kit_pants_color,
      'shoeColor',  v_team.kit_shoes_color
    ),
    'pvp_elo', v_team.pvp_elo,
    'stadium_level', v_team.stadium_level,
    'fans',          v_team.fans,
    'fans_cap',      fans_cap_for_level(v_team.stadium_level),
    'coach', v_coach,
    'keyPlayers', COALESCE(v_starters, '[]'::jsonb),
    'radar', v_radar
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_pvp_team_snapshot(UUID) TO authenticated;

-- ── 7. 既有玩家 fans 一次性 clamp 到 cap（防止舊資料超過新 cap） ──
UPDATE my_team
SET fans = LEAST(fans, fans_cap_for_level(stadium_level))
WHERE fans > fans_cap_for_level(stadium_level);

COMMENT ON FUNCTION fans_cap_for_level(INT) IS '球迷上限：200 + lv * 300';
COMMENT ON FUNCTION fans_speed_bonus_pct(INT) IS '球迷加成 %（最高 40）：套用在傷病恢復、訓練時長';
