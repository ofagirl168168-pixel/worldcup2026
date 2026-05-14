-- ============================================================
-- 統一升等邏輯：慢慢練（時間訓練）也 +1 級
-- 這樣等級 = 累計訓練次數，三種訓練方式都會升等
-- 上限 50 級不變、屬性 cap 不變
-- ============================================================

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
  v_new_level INT;
  v_max_level INT := 50;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_player FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF v_player.training_attr IS NULL THEN RAISE EXCEPTION 'NOT_TRAINING'; END IF;
  IF v_player.training_finish_at > now() THEN RAISE EXCEPTION 'NOT_FINISHED'; END IF;

  v_attr := v_player.training_attr;
  v_new_level := LEAST(v_max_level, v_player.level + 1);

  -- 加 1 到該屬性、清訓練狀態、同時升 1 級（沒到上限的話）
  EXECUTE format(
    'UPDATE team_player SET current_%I = LEAST(99, current_%I + 1),' ||
    '  level = $2,' ||
    '  training_attr = NULL, training_finish_at = NULL WHERE id = $1',
    v_attr, v_attr
  ) USING p_player_id, v_new_level;

  RETURN jsonb_build_object('attr', v_attr, 'gain', 1, 'new_level', v_new_level);
END;
$$;
