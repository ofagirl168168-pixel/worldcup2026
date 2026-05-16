-- ============================================================
-- 球員 Lv 解鎖屬性硬上限
--   現況：每屬性硬上限 99、個別 cap = base + 15 + bond × 5、不受 Lv 影響
--   新版：Lv 1-9 = 99、每 5 Lv +5、Lv 50 = 145
-- ============================================================

-- helper: 依 Lv 回該球員的硬上限
CREATE OR REPLACE FUNCTION attr_hard_ceiling_for_level(p_level INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_level, 1) >= 50 THEN 145
    WHEN p_level >= 45 THEN 140
    WHEN p_level >= 40 THEN 135
    WHEN p_level >= 35 THEN 130
    WHEN p_level >= 30 THEN 125
    WHEN p_level >= 25 THEN 120
    WHEN p_level >= 20 THEN 115
    WHEN p_level >= 15 THEN 110
    WHEN p_level >= 10 THEN 105
    ELSE 99
  END;
$$;

GRANT EXECUTE ON FUNCTION attr_hard_ceiling_for_level(INT) TO authenticated, anon;
COMMENT ON FUNCTION attr_hard_ceiling_for_level(INT) IS '球員 Lv 解鎖的屬性硬上限：1-9=99 / 10-14=105 / 每 5 Lv +5 / Lv50=145';


-- ─── 1. train_player：cap 改用 hard ceiling × base+lift 取小 ───
-- 訓練後 Lv +1、計算 cap 用新後的 Lv（讓 Lv up 立刻解鎖）
CREATE OR REPLACE FUNCTION train_player(
  p_player_id UUID,
  p_mode TEXT
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

  IF p_mode = 'normal' THEN
    v_cost_tac := 10; v_cost_phy := 10; v_cost_hrt := 0; v_cost_idea := 0;
    v_gain_min := 1; v_gain_max := 3;
  ELSE
    v_cost_tac := 30; v_cost_phy := 30; v_cost_hrt := 10; v_cost_idea := 10;
    v_gain_min := 2; v_gain_max := 5;
  END IF;

  IF v_team.rp_tactical < v_cost_tac OR v_team.rp_physical < v_cost_phy
     OR v_team.rp_heart < v_cost_hrt OR v_team.rp_idea < v_cost_idea THEN
    RAISE EXCEPTION 'INSUFFICIENT_RP';
  END IF;

  SELECT * INTO v_card FROM player_card_pool WHERE card_id = v_player.card_id;

  DECLARE
    v_new_lv   INT := v_player.level + 1;
    v_ceiling  INT := attr_hard_ceiling_for_level(v_new_lv);
    v_lift     INT := 15 + (v_player.bond * 5);
    v_cap_atk INT := LEAST(v_ceiling, v_card.base_attack   + v_lift);
    v_cap_def INT := LEAST(v_ceiling, v_card.base_defense  + v_lift);
    v_cap_spd INT := LEAST(v_ceiling, v_card.base_speed    + v_lift);
    v_cap_mid INT := LEAST(v_ceiling, v_card.base_midfield + v_lift);
    v_cap_sta INT := LEAST(v_ceiling, v_card.base_stamina  + v_lift);
    v_cap_aur INT := LEAST(v_ceiling, v_card.base_aura     + v_lift);
  BEGIN
    v_atk_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_def_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_spd_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_mid_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_sta_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;
    v_aur_gain := floor(random() * (v_gain_max - v_gain_min + 1))::int + v_gain_min;

    UPDATE team_player
    SET level = v_new_lv,
        current_attack   = LEAST(v_cap_atk, current_attack   + v_atk_gain),
        current_defense  = LEAST(v_cap_def, current_defense  + v_def_gain),
        current_speed    = LEAST(v_cap_spd, current_speed    + v_spd_gain),
        current_midfield = LEAST(v_cap_mid, current_midfield + v_mid_gain),
        current_stamina  = LEAST(v_cap_sta, current_stamina  + v_sta_gain),
        current_aura     = LEAST(v_cap_aur, current_aura     + v_aur_gain)
    WHERE id = p_player_id;
  END;

  UPDATE my_team
  SET rp_tactical = rp_tactical - v_cost_tac,
      rp_physical = rp_physical - v_cost_phy,
      rp_heart    = rp_heart    - v_cost_hrt,
      rp_idea     = rp_idea     - v_cost_idea,
      updated_at  = now()
  WHERE user_id = v_uid;

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


-- ─── 2. claim_timed_training：cap 改用 hard ceiling（含 lv up 後）───
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
  v_ceiling       INT;
  v_lift          INT;
  v_cap           INT;
  v_base          INT;
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
    WHEN 'tutorial' THEN v_gain := 1; v_lv_up := false;
    WHEN '30m' THEN v_gain := 1; v_lv_up := false;
    WHEN '2h'  THEN v_gain := 2; v_lv_up := false;
    WHEN '8h'  THEN v_gain := 4; v_lv_up := true;
    WHEN '24h' THEN v_gain := 7; v_lv_up := true;
    ELSE            v_gain := 1; v_lv_up := false;
  END CASE;

  v_new_level := v_player.level;
  IF v_lv_up AND v_player.level < v_max_level THEN
    v_new_level := v_player.level + 1;
  END IF;

  -- 用「升完之後」的 Lv 算 hard ceiling
  v_ceiling := attr_hard_ceiling_for_level(v_new_level);
  v_lift := 15 + (v_player.bond * 5);

  -- 取對應屬性的 base
  SELECT * INTO v_card FROM player_card_pool WHERE card_id = v_player.card_id;
  v_base := CASE v_attr
    WHEN 'attack'   THEN v_card.base_attack
    WHEN 'defense'  THEN v_card.base_defense
    WHEN 'speed'    THEN v_card.base_speed
    WHEN 'midfield' THEN v_card.base_midfield
    WHEN 'stamina'  THEN v_card.base_stamina
    WHEN 'aura'     THEN v_card.base_aura
  END;
  v_cap := LEAST(v_ceiling, v_base + v_lift);

  -- 24h 集訓營：5% 機率覺醒天賦
  IF v_tier = '24h' THEN
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

  RETURN jsonb_build_object(
    'attr', v_attr,
    'tier', v_tier,
    'gain', v_gain,
    'new_level', v_new_level,
    'cap',        v_cap,
    'ceiling',    v_ceiling,
    'lv_up', v_lv_up,
    'talent_awakened', v_talent_roll,
    'talent_rolled', v_talent_rolled
  );
END;
$$;

GRANT EXECUTE ON FUNCTION claim_timed_training(UUID) TO authenticated;
