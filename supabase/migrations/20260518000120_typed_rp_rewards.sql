-- ============================================================
-- 訓練素材（RP）來源差異化
--   🧠 戰術 ← 聯賽勝負（主源）
--   💪 體能 ← PvP / 連續預測天數 / 集訓營領取
--   ❤️ 鬥志 ← 擂台投票 / 留言
--   💡 靈感 ← 預測比賽 / 看文章
-- ============================================================

-- ─── 0. 通用 helper：給單一 type 加 RP（client 在擂台 / 預測 / 文章活動後 call）
CREATE OR REPLACE FUNCTION award_rp_to_team(p_type TEXT, p_amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN jsonb_build_object('granted', 0); END IF;
  IF p_type NOT IN ('tactical','physical','heart','idea') THEN
    RAISE EXCEPTION 'INVALID_RP_TYPE: %', p_type;
  END IF;

  EXECUTE format('UPDATE my_team SET rp_%I = rp_%I + $1, updated_at = now() WHERE user_id = $2', p_type, p_type)
  USING p_amount, v_uid;

  RETURN jsonb_build_object('granted', p_amount, 'type', p_type);
END;
$$;
GRANT EXECUTE ON FUNCTION award_rp_to_team(TEXT, INT) TO authenticated;


-- ─── 1. finalize_match：聯賽差異化 RP（戰術主源）
-- W: 戰術+25 / 體能+10 / 鬥志+3 / 靈感+3
-- D: 戰術+12 / 體能+5  / 鬥志+2 / 靈感+2
-- L: 戰術+5  / 體能+3  / 鬥志+1 / 靈感+1
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
  v_rp_tac    INT; v_rp_phy INT; v_rp_hrt INT; v_rp_idea INT;
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

  -- 4 種素材差異化（戰術主源）
  IF v_result = 'W' THEN
    v_rp_tac := 25; v_rp_phy := 10; v_rp_hrt := 3; v_rp_idea := 3;
    v_gems_base := GREATEST(1, v_prog.current_tier / 4);
    v_fans_delta := 5 + v_prog.current_tier * 2;
  ELSIF v_result = 'D' THEN
    v_rp_tac := 12; v_rp_phy := 5;  v_rp_hrt := 2; v_rp_idea := 2;
    v_gems_base := 0; v_fans_delta := 1;
  ELSE
    v_rp_tac := 5;  v_rp_phy := 3;  v_rp_hrt := 1; v_rp_idea := 1;
    v_gems_base := 0; v_fans_delta := -2;
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
    jsonb_build_object('tactical', v_rp_tac, 'physical', v_rp_phy,
                       'heart', v_rp_hrt, 'idea', v_rp_idea),
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

  IF v_prog.matches_played >= 10 THEN
    v_season_complete := true;
    v_new_tier := v_prog.current_tier;
    IF v_prog.wins >= 7 AND v_prog.current_tier < 10 THEN
      IF v_team.stadium_level < (v_prog.current_tier + 1) - 1 THEN
        v_promotion_blocked := true; v_new_tier := v_prog.current_tier; v_tier_change := 'blocked';
      ELSE
        v_new_tier := v_prog.current_tier + 1; v_tier_change := 'up';
      END IF;
    ELSIF v_prog.wins <= 3 AND v_prog.current_tier > 1 THEN
      v_new_tier := v_prog.current_tier - 1; v_tier_change := 'down';
    END IF;
    v_season_reward_gems := v_prog.current_tier * 10;
    IF v_prog.wins >= 7 THEN
      v_season_reward_gems := v_season_reward_gems + v_prog.current_tier * 30;
      v_season_reward_ssr_ticket := 1;
    END IF;
    UPDATE league_progress
    SET current_tier = v_new_tier, season_num = season_num + 1,
        matches_played = 0, wins = 0, draws = 0, losses = 0,
        goals_for = 0, goals_against = 0, updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  v_fans_cap := fans_cap_for_level(v_team.stadium_level);
  IF v_fans_delta >= 0 THEN
    v_new_fans := LEAST(v_fans_cap, v_team.fans + v_fans_delta);
  ELSE
    v_new_fans := GREATEST(0, v_team.fans + v_fans_delta);
  END IF;

  UPDATE my_team
  SET stamina      = stamina - 1,
      rp_tactical  = rp_tactical + v_rp_tac,
      rp_physical  = rp_physical + v_rp_phy,
      rp_heart     = rp_heart    + v_rp_hrt,
      rp_idea      = rp_idea     + v_rp_idea,
      fans         = v_new_fans,
      ssr_select_tickets = ssr_select_tickets + v_season_reward_ssr_ticket,
      updated_at   = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'result', v_result,
    'rp_earned', jsonb_build_object('tactical', v_rp_tac, 'physical', v_rp_phy,
                                    'heart', v_rp_hrt, 'idea', v_rp_idea),
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


-- ─── 2. finalize_pvp_match：體能主源
-- W: 戰術+5 / 體能+18 / 鬥志+3 / 靈感+3
-- D: 戰術+3 / 體能+9  / 鬥志+2 / 靈感+2
-- L: 戰術+2 / 體能+5  / 鬥志+1 / 靈感+1
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
  v_rp_tac        INT; v_rp_phy INT; v_rp_hrt INT; v_rp_idea INT;
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

  IF v_result = 'W' THEN
    v_rp_tac := 5;  v_rp_phy := 18; v_rp_hrt := 3; v_rp_idea := 3;
    v_fans_delta := 8;
  ELSIF v_result = 'D' THEN
    v_rp_tac := 3;  v_rp_phy := 9;  v_rp_hrt := 2; v_rp_idea := 2;
    v_fans_delta := 2;
  ELSE
    v_rp_tac := 2;  v_rp_phy := 5;  v_rp_hrt := 1; v_rp_idea := 1;
    v_fans_delta := -3;
  END IF;

  INSERT INTO match_history (
    user_id, opponent_type, opponent_data,
    league_tier, is_boss, result, score_home, score_away,
    match_log, rp_earned, gems_earned, fans_delta
  )
  VALUES (
    v_uid, 'pvp', p_opponent_snapshot,
    NULL, false, v_result, p_score_home, p_score_away,
    p_match_log,
    jsonb_build_object('tactical', v_rp_tac, 'physical', v_rp_phy,
                       'heart', v_rp_hrt, 'idea', v_rp_idea),
    CASE v_result WHEN 'W' THEN 5 ELSE 1 END,
    v_fans_delta
  );

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
      rp_tactical     = rp_tactical + v_rp_tac,
      rp_physical     = rp_physical + v_rp_phy,
      rp_heart        = rp_heart    + v_rp_hrt,
      rp_idea         = rp_idea     + v_rp_idea,
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
    'rp_earned', jsonb_build_object('tactical', v_rp_tac, 'physical', v_rp_phy,
                                    'heart', v_rp_hrt, 'idea', v_rp_idea),
    'fans_delta',    v_new_fans - v_team.fans,
    'fans_cap',      v_fans_cap
  );
END;
$$;
GRANT EXECUTE ON FUNCTION finalize_pvp_match(UUID, JSONB, INT, INT, JSONB) TO authenticated;


-- ─── 3. claim_timed_training：集訓營領取 → 順便給體能素材
-- 30m: +2, 2h: +4, 8h: +8, 24h: +15
CREATE OR REPLACE FUNCTION claim_timed_training(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_player    team_player%ROWTYPE;
  v_card      player_card_pool%ROWTYPE;
  v_attr      TEXT;
  v_tier      TEXT;
  v_gain      INT := 0;
  v_lv_up     BOOLEAN := false;
  v_new_level INT;
  v_max_level INT := 50;
  v_talent_roll   BOOLEAN := false;
  v_talent_rolled TEXT := NULL;
  v_talents       TEXT[] := ARRAY['speedster','bodybuilder','shooter','wall','magician'];
  v_cap           INT;
  v_rp_phy_bonus  INT := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_player FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF v_player.training_attr IS NULL THEN RAISE EXCEPTION 'NOT_TRAINING'; END IF;
  IF v_player.training_finish_at > now() THEN RAISE EXCEPTION 'NOT_FINISHED'; END IF;

  v_attr := v_player.training_attr;
  v_tier := COALESCE(v_player.training_tier, '30m');

  CASE v_tier
    WHEN 'tutorial' THEN v_gain := 1; v_lv_up := false; v_rp_phy_bonus := 0;
    WHEN '30m' THEN v_gain := 1; v_lv_up := false; v_rp_phy_bonus := 2;
    WHEN '2h'  THEN v_gain := 2; v_lv_up := false; v_rp_phy_bonus := 4;
    WHEN '8h'  THEN v_gain := 4; v_lv_up := true;  v_rp_phy_bonus := 8;
    WHEN '24h' THEN v_gain := 7; v_lv_up := true;  v_rp_phy_bonus := 15;
    ELSE            v_gain := 1; v_lv_up := false; v_rp_phy_bonus := 0;
  END CASE;

  v_new_level := v_player.level;
  IF v_lv_up AND v_player.level < v_max_level THEN
    v_new_level := v_player.level + 1;
  END IF;

  v_cap := attr_hard_ceiling_for_level(v_new_level) + (v_player.bond * 5);

  IF v_tier = '24h' THEN
    SELECT * INTO v_card FROM player_card_pool WHERE card_id = v_player.card_id;
    IF v_player.awakened_talent IS NULL AND (v_card.talent IS NULL OR v_card.talent = '') THEN
      IF random() < 0.05 THEN
        v_talent_roll := true;
        v_talent_rolled := v_talents[1 + floor(random() * 5)::int];
      END IF;
    END IF;
  END IF;

  EXECUTE format(
    'UPDATE team_player SET current_%I = LEAST($5, current_%I + $2),' ||
    '  level = $3,' ||
    '  training_attr = NULL, training_finish_at = NULL, training_tier = NULL,' ||
    '  awakened_talent = COALESCE($4, awakened_talent) WHERE id = $1',
    v_attr, v_attr
  ) USING p_player_id, v_gain, v_new_level, v_talent_rolled, v_cap;

  -- 集訓營完成 → 加體能素材
  IF v_rp_phy_bonus > 0 THEN
    UPDATE my_team SET rp_physical = rp_physical + v_rp_phy_bonus, updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'attr', v_attr, 'tier', v_tier, 'gain', v_gain,
    'new_level', v_new_level, 'cap', v_cap,
    'lv_up', v_lv_up,
    'talent_awakened', v_talent_roll,
    'talent_rolled', v_talent_rolled,
    'rp_physical_bonus', v_rp_phy_bonus
  );
END;
$$;
GRANT EXECUTE ON FUNCTION claim_timed_training(UUID) TO authenticated;


-- ─── 4. claim_quest_reward：保留 rp_all（舊任務相容）、加 typed rp_*
CREATE OR REPLACE FUNCTION claim_quest_reward(p_quest_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_quest   quest_template%ROWTYPE;
  v_state   user_quest_state%ROWTYPE;
  v_period  TEXT;
  v_reward  JSONB;
  v_tw_date DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_quest FROM quest_template WHERE quest_id = p_quest_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_QUEST'; END IF;

  v_period := CASE v_quest.quest_type
    WHEN 'daily'  THEN to_char(v_tw_date, 'YYYY-MM-DD')
    WHEN 'weekly' THEN to_char(v_tw_date, 'IYYY-"W"IW')
    WHEN 'season' THEN 'all-time'
  END;

  SELECT * INTO v_state FROM user_quest_state
    WHERE user_id = v_uid AND quest_id = p_quest_id AND period_key = v_period FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_PROGRESS'; END IF;
  IF v_state.claimed THEN RAISE EXCEPTION 'ALREADY_CLAIMED'; END IF;
  IF v_state.current_count < v_quest.target_count THEN RAISE EXCEPTION 'NOT_COMPLETED'; END IF;

  v_reward := v_quest.reward;

  IF (v_reward ? 'tickets') THEN
    UPDATE my_team SET tickets = tickets + (v_reward->>'tickets')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'gems') THEN
    INSERT INTO gem_transactions (user_id, amount, type, ref_id, date)
    VALUES (v_uid, (v_reward->>'gems')::int, 'quest_reward', p_quest_id, v_tw_date);
  END IF;
  IF (v_reward ? 'coach_tickets') THEN
    UPDATE my_team SET coach_tickets = coach_tickets + (v_reward->>'coach_tickets')::int WHERE user_id = v_uid;
  END IF;
  -- rp_all：4 種同步加（舊任務相容）
  IF (v_reward ? 'rp_all') THEN
    UPDATE my_team SET
      rp_tactical = rp_tactical + (v_reward->>'rp_all')::int,
      rp_physical = rp_physical + (v_reward->>'rp_all')::int,
      rp_heart    = rp_heart    + (v_reward->>'rp_all')::int,
      rp_idea     = rp_idea     + (v_reward->>'rp_all')::int
    WHERE user_id = v_uid;
  END IF;
  -- typed RP
  IF (v_reward ? 'rp_tactical') THEN
    UPDATE my_team SET rp_tactical = rp_tactical + (v_reward->>'rp_tactical')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'rp_physical') THEN
    UPDATE my_team SET rp_physical = rp_physical + (v_reward->>'rp_physical')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'rp_heart') THEN
    UPDATE my_team SET rp_heart = rp_heart + (v_reward->>'rp_heart')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'rp_idea') THEN
    UPDATE my_team SET rp_idea = rp_idea + (v_reward->>'rp_idea')::int WHERE user_id = v_uid;
  END IF;

  UPDATE user_quest_state SET claimed = true
  WHERE user_id = v_uid AND quest_id = p_quest_id AND period_key = v_period;

  RETURN jsonb_build_object('quest_id', p_quest_id, 'reward', v_reward);
END;
$$;
GRANT EXECUTE ON FUNCTION claim_quest_reward(TEXT) TO authenticated;


-- ─── 5. 把現有連續性質的任務 reward 改成加 rp_physical（如果有）──
UPDATE quest_template
SET reward = (
  CASE
    WHEN reward ? 'rp_all' THEN
      reward - 'rp_all' || jsonb_build_object('rp_physical', (reward->>'rp_all')::int * 2)
    ELSE
      reward || jsonb_build_object('rp_physical', 10)
  END
)
WHERE quest_id IN (
  SELECT quest_id FROM quest_template
  WHERE name ILIKE '%連%' OR name ILIKE '%streak%' OR name ILIKE '%登入%'
);

COMMENT ON FUNCTION award_rp_to_team(TEXT, INT) IS 'Client 在擂台 / 預測 / 文章活動後 call、給單一 type 加 RP';
