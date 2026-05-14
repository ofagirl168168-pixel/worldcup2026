-- ============================================================
-- 訓練平衡調整：時間訓練基數 60 → 90 秒（防初期爆能力）
-- Lv 1: 60s → 90s
-- Lv 5: 7.6 min → 11.4 min
-- Lv 10: 25 min → 38 min
-- Lv 20: 72 min → 108 min
-- Lv 50: 4.6 h → 6.9 h
-- ============================================================

CREATE OR REPLACE FUNCTION start_timed_training(
  p_player_id UUID,
  p_attr TEXT,
  p_tutorial BOOLEAN DEFAULT false
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_attr NOT IN ('attack','defense','speed','midfield','stamina','aura') THEN
    RAISE EXCEPTION 'INVALID_ATTR';
  END IF;

  SELECT * INTO v_player FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  IF v_player.training_attr IS NOT NULL AND v_player.training_finish_at > now() THEN
    RAISE EXCEPTION 'ALREADY_TRAINING';
  END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  IF p_tutorial AND NOT v_team.tutorial_first_training_used THEN
    v_seconds := 3;
    UPDATE my_team SET tutorial_first_training_used = true WHERE user_id = v_uid;
  ELSE
    -- 基數 60 → 90、下限 60 秒
    v_seconds := GREATEST(60, FLOOR(90 * POWER(v_player.level, 1.4))::INT);
  END IF;

  v_finish := now() + (v_seconds || ' seconds')::interval;
  UPDATE team_player
  SET training_attr = p_attr, training_finish_at = v_finish
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'attr', p_attr,
    'duration_sec', v_seconds,
    'finish_at', v_finish
  );
END;
$$;
