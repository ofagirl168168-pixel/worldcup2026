-- ============================================================
-- 集訓營重做：4 級時長（30m / 2h / 8h / 24h）+ 24h 天賦覺醒
-- 取消「慢慢練固定 +1」設計，改成依時長階梯給回饋
-- 城牆天賦敘述修正：搶斷率 +30%（之前是「被搶斷率 -30%」、語意倒了）
-- ============================================================

-- 1. team_player 加 tier + awakened_talent 欄
ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS training_tier TEXT,                   -- '30m' | '2h' | '8h' | '24h'
  ADD COLUMN IF NOT EXISTS awakened_talent TEXT;                 -- 覺醒後的天賦（overrides card.talent）

-- 2. 開始集訓營訓練（依 tier 算秒數）
DROP FUNCTION IF EXISTS start_timed_training(UUID, TEXT, BOOLEAN);
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
  v_seconds INT;
  v_finish  TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_attr NOT IN ('attack','defense','speed','midfield','stamina','aura') THEN
    RAISE EXCEPTION 'INVALID_ATTR';
  END IF;
  IF p_tier NOT IN ('30m','2h','8h','24h') THEN
    RAISE EXCEPTION 'INVALID_TIER';
  END IF;

  SELECT * INTO v_player FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF v_player.training_attr IS NOT NULL AND v_player.training_finish_at > now() THEN
    RAISE EXCEPTION 'ALREADY_TRAINING';
  END IF;
  IF v_player.level >= 50 THEN RAISE EXCEPTION 'MAX_LEVEL'; END IF;

  v_seconds := CASE p_tier
    WHEN '30m' THEN 30 * 60
    WHEN '2h'  THEN 2 * 3600
    WHEN '8h'  THEN 8 * 3600
    WHEN '24h' THEN 24 * 3600
  END;

  v_finish := now() + (v_seconds || ' seconds')::interval;
  UPDATE team_player
  SET training_attr = p_attr,
      training_finish_at = v_finish,
      training_tier = p_tier
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'attr', p_attr, 'tier', p_tier,
    'duration_sec', v_seconds,
    'finish_at', v_finish
  );
END;
$$;
GRANT EXECUTE ON FUNCTION start_timed_training(UUID, TEXT, TEXT) TO authenticated;

-- 3. 領取集訓營：依 tier 算 stat + Lv + talent roll
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
  v_tier := COALESCE(v_player.training_tier, '30m');  -- 舊資料相容

  -- tier → stat gain / Lv
  CASE v_tier
    WHEN '30m' THEN v_gain := 1; v_lv_up := false;
    WHEN '2h'  THEN v_gain := 2; v_lv_up := false;
    WHEN '8h'  THEN v_gain := 4; v_lv_up := true;
    WHEN '24h' THEN v_gain := 7; v_lv_up := true;
    ELSE            v_gain := 1; v_lv_up := false;
  END CASE;

  -- Lv 升等（不超過 50）
  v_new_level := v_player.level;
  IF v_lv_up AND v_player.level < v_max_level THEN
    v_new_level := v_player.level + 1;
  END IF;

  -- 24h 天賦覺醒（5% 機率，僅當該球員沒有天賦時）
  IF v_tier = '24h' THEN
    SELECT * INTO v_card FROM player_card_pool WHERE card_id = v_player.card_id;
    IF v_player.awakened_talent IS NULL AND (v_card.talent IS NULL OR v_card.talent = '') THEN
      IF random() < 0.05 THEN
        v_talent_roll := true;
        v_talent_rolled := v_talents[1 + floor(random() * 5)::int];
      END IF;
    END IF;
  END IF;

  -- 套用：屬性 +gain (cap 99)、清訓練狀態、Lv 升、talent 寫入
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
