-- ============================================================
-- 加入 tutorial tier 兼容新手教學的 3 秒體驗
-- ============================================================

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
  v_uid     UUID := auth.uid();
  v_player  team_player%ROWTYPE;
  v_team    my_team%ROWTYPE;
  v_seconds INT;
  v_finish  TIMESTAMPTZ;
  v_actual_tier TEXT;
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

  -- tutorial 走 3 秒、只有第一次有效
  IF p_tier = 'tutorial' THEN
    SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
    IF v_team.tutorial_first_training_used THEN
      v_actual_tier := '30m';   -- 已用過 → 退化成 30m
      v_seconds := 30 * 60;
    ELSE
      UPDATE my_team SET tutorial_first_training_used = true WHERE user_id = v_uid;
      v_actual_tier := 'tutorial';
      v_seconds := 3;
    END IF;
  ELSE
    v_actual_tier := p_tier;
    v_seconds := CASE p_tier
      WHEN '30m' THEN 30 * 60
      WHEN '2h'  THEN 2 * 3600
      WHEN '8h'  THEN 8 * 3600
      WHEN '24h' THEN 24 * 3600
    END;
  END IF;

  v_finish := now() + (v_seconds || ' seconds')::interval;
  UPDATE team_player
  SET training_attr = p_attr,
      training_finish_at = v_finish,
      training_tier = v_actual_tier
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'attr', p_attr, 'tier', v_actual_tier,
    'duration_sec', v_seconds,
    'finish_at', v_finish
  );
END;
$$;
GRANT EXECUTE ON FUNCTION start_timed_training(UUID, TEXT, TEXT) TO authenticated;

-- claim_timed_training 也補 tutorial tier 的領取邏輯（同 30m: +1 屬性、無 Lv）
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
  v_talent_roll BOOLEAN := false;
  v_talent_rolled TEXT := NULL;
  v_talents TEXT[] := ARRAY['speedster','bodybuilder','shooter','wall','magician'];
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
    'UPDATE team_player SET current_%I = LEAST(99, current_%I + $2),' ||
    '  level = $3,' ||
    '  training_attr = NULL, training_finish_at = NULL, training_tier = NULL,' ||
    '  awakened_talent = COALESCE($4, awakened_talent) WHERE id = $1',
    v_attr, v_attr
  ) USING p_player_id, v_gain, v_new_level, v_talent_rolled;

  RETURN jsonb_build_object(
    'attr', v_attr,
    'tier', v_tier,
    'gain', v_gain,
    'new_level', v_new_level,
    'lv_up', v_lv_up,
    'talent_awakened', v_talent_roll,
    'talent_rolled', v_talent_rolled
  );
END;
$$;
GRANT EXECUTE ON FUNCTION claim_timed_training(UUID) TO authenticated;
