-- ============================================================
-- 我的球隊 Phase 1.8 — 訓練 RPC
-- 設計依據 docs/my-team-design.md §3.2 + §4
-- 一般訓練：tactical/physical RP 各 10 → 升 1 等 → 隨機 +1~3 屬性
-- 精緻訓練：tactical/physical 30 + heart/idea 各 10 → 升 1 等 → +2~5 屬性
-- ============================================================

CREATE OR REPLACE FUNCTION train_player(
  p_player_id UUID,
  p_mode TEXT  -- 'normal' | 'premium'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_team      my_team%ROWTYPE;
  v_player    team_player%ROWTYPE;
  v_card      player_card_pool%ROWTYPE;
  v_max_lv    INT := 50;
  v_atk_gain  INT;
  v_def_gain  INT;
  v_spd_gain  INT;
  v_mid_gain  INT;
  v_sta_gain  INT;
  v_aur_gain  INT;
  v_cost_tac  INT;
  v_cost_phy  INT;
  v_cost_hrt  INT;
  v_cost_idea INT;
  v_gain_min  INT;
  v_gain_max  INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_mode NOT IN ('normal','premium') THEN RAISE EXCEPTION 'INVALID_MODE'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  SELECT * INTO v_player FROM team_player WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  IF v_player.level >= v_max_lv THEN RAISE EXCEPTION 'MAX_LEVEL'; END IF;

  -- 計算成本（依 design doc §4.2）
  IF p_mode = 'normal' THEN
    v_cost_tac := 10; v_cost_phy := 10; v_cost_hrt := 0; v_cost_idea := 0;
    v_gain_min := 1; v_gain_max := 3;
  ELSE -- premium
    v_cost_tac := 30; v_cost_phy := 30; v_cost_hrt := 10; v_cost_idea := 10;
    v_gain_min := 2; v_gain_max := 5;
  END IF;

  IF v_team.rp_tactical < v_cost_tac OR v_team.rp_physical < v_cost_phy
     OR v_team.rp_heart < v_cost_hrt OR v_team.rp_idea < v_cost_idea THEN
    RAISE EXCEPTION 'INSUFFICIENT_RP';
  END IF;

  -- 屬性上限：base + 15（基礎強化上限）+ bond × 5（5 星卡可再 +25）
  SELECT * INTO v_card FROM player_card_pool WHERE card_id = v_player.card_id;
  -- bond 上限加成
  DECLARE
    v_lift INT := 15 + (v_player.bond * 5);
    v_cap_atk INT := LEAST(99, v_card.base_attack + v_lift);
    v_cap_def INT := LEAST(99, v_card.base_defense + v_lift);
    v_cap_spd INT := LEAST(99, v_card.base_speed + v_lift);
    v_cap_mid INT := LEAST(99, v_card.base_midfield + v_lift);
    v_cap_sta INT := LEAST(99, v_card.base_stamina + v_lift);
    v_cap_aur INT := LEAST(99, v_card.base_aura + v_lift);
  BEGIN
    v_atk_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_def_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_spd_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_mid_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_sta_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_aur_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;

    UPDATE team_player
    SET level = level + 1,
        current_attack   = LEAST(v_cap_atk, current_attack + v_atk_gain),
        current_defense  = LEAST(v_cap_def, current_defense + v_def_gain),
        current_speed    = LEAST(v_cap_spd, current_speed + v_spd_gain),
        current_midfield = LEAST(v_cap_mid, current_midfield + v_mid_gain),
        current_stamina  = LEAST(v_cap_sta, current_stamina + v_sta_gain),
        current_aura     = LEAST(v_cap_aur, current_aura + v_aur_gain)
    WHERE id = p_player_id;
  END;

  -- 扣 RP
  UPDATE my_team
  SET rp_tactical = rp_tactical - v_cost_tac,
      rp_physical = rp_physical - v_cost_phy,
      rp_heart    = rp_heart    - v_cost_hrt,
      rp_idea     = rp_idea     - v_cost_idea,
      updated_at  = now()
  WHERE user_id = v_uid;

  -- 寫 log
  INSERT INTO training_log (team_user_id, player_id, training_type, rp_spent, stat_gained)
  VALUES (v_uid, p_player_id, p_mode,
    v_cost_tac + v_cost_phy + v_cost_hrt + v_cost_idea,
    jsonb_build_object(
      'attack', v_atk_gain, 'defense', v_def_gain, 'speed', v_spd_gain,
      'midfield', v_mid_gain, 'stamina', v_sta_gain, 'aura', v_aur_gain
    )
  );

  RETURN jsonb_build_object(
    'level_after', v_player.level + 1,
    'gains', jsonb_build_object(
      'attack', v_atk_gain, 'defense', v_def_gain, 'speed', v_spd_gain,
      'midfield', v_mid_gain, 'stamina', v_sta_gain, 'aura', v_aur_gain
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION train_player(UUID, TEXT) TO authenticated;
