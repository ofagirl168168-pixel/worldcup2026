-- ============================================================
-- 訓練時長改用「當前屬性值」計算（不只是 level）
-- 越練越久，到 99 約 25 分/次
--
-- 公式：v_seconds = MAX(60, FLOOR(POWER(v_current / 25, 2.2) * 50))
-- Attr 25 →   60s
-- Attr 40 →  173s (~3 min)
-- Attr 55 →  369s (~6 min)
-- Attr 70 →  658s (~11 min)
-- Attr 85 → 1060s (~17.6 min)
-- Attr 99 → 1505s (~25 min)
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
  v_current INT;
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

  -- 抓當前屬性值
  EXECUTE format('SELECT current_%I FROM team_player WHERE id = $1', p_attr)
    INTO v_current USING p_player_id;

  IF p_tutorial AND NOT v_team.tutorial_first_training_used THEN
    v_seconds := 3;
    UPDATE my_team SET tutorial_first_training_used = true WHERE user_id = v_uid;
  ELSE
    -- 時長依當前屬性值，越高越慢（指數曲線）
    v_seconds := GREATEST(60, FLOOR(POWER(v_current::numeric / 25, 2.2) * 50)::INT);
  END IF;

  v_finish := now() + (v_seconds || ' seconds')::interval;
  UPDATE team_player
  SET training_attr = p_attr, training_finish_at = v_finish
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'attr', p_attr,
    'current_before', v_current,
    'duration_sec', v_seconds,
    'finish_at', v_finish
  );
END;
$$;
