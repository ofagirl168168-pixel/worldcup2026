-- ============================================================
-- 時間訓練（開羅式）— 按下訓練 → 等時間到 → 領取 +1 屬性
-- 新手第一次：3 秒體驗
-- 之後依球員等級遞增：30 → 60 * lv^1.4 秒
-- ============================================================

ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS training_attr TEXT,
  ADD COLUMN IF NOT EXISTS training_finish_at TIMESTAMPTZ;

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS tutorial_first_training_used BOOLEAN NOT NULL DEFAULT false;

-- ── 開始時間訓練 ────────────────────────────────────
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

  -- 已在訓練中（還沒完成）就不能再開
  IF v_player.training_attr IS NOT NULL AND v_player.training_finish_at > now() THEN
    RAISE EXCEPTION 'ALREADY_TRAINING';
  END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  -- 新手第一次：3 秒
  IF p_tutorial AND NOT v_team.tutorial_first_training_used THEN
    v_seconds := 3;
    UPDATE my_team SET tutorial_first_training_used = true WHERE user_id = v_uid;
  ELSE
    -- 一般時長：30 秒 ~ 60 × lv^1.4
    -- Lv 1: 60s, Lv 5: 458s, Lv 10: 25min, Lv 20: 72min, Lv 50: 4.6h
    v_seconds := GREATEST(30, FLOOR(60 * POWER(v_player.level, 1.4))::INT);
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

GRANT EXECUTE ON FUNCTION start_timed_training(UUID, TEXT, BOOLEAN) TO authenticated;

-- ── 領取時間訓練 ─────────────────────────────────
CREATE OR REPLACE FUNCTION claim_timed_training(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_player team_player%ROWTYPE;
  v_attr   TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_player FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF v_player.training_attr IS NULL THEN RAISE EXCEPTION 'NOT_TRAINING'; END IF;
  IF v_player.training_finish_at > now() THEN RAISE EXCEPTION 'NOT_FINISHED'; END IF;

  v_attr := v_player.training_attr;

  -- 加 1 到該屬性、清訓練狀態
  EXECUTE format(
    'UPDATE team_player SET current_%I = LEAST(99, current_%I + 1),' ||
    '  training_attr = NULL, training_finish_at = NULL WHERE id = $1',
    v_attr, v_attr
  ) USING p_player_id;

  RETURN jsonb_build_object('attr', v_attr, 'gain', 1);
END;
$$;

GRANT EXECUTE ON FUNCTION claim_timed_training(UUID) TO authenticated;
