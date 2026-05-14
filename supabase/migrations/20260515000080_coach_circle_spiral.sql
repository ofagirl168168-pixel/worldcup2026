-- ============================================================
-- 連環圓抽教練（spiral mode）
--   每個 loop 獨立計分、score 直接決定稀有度
--   95+ → SSR、85+ → SR、50+ → R
--   1-10 個 loops（玩家畫幾圈算幾抽）
--   費用：N tickets 或 N × 20 寶石（按比例）
-- ============================================================

-- 不刪除舊版（保持向後相容）— 新增 array 版
CREATE OR REPLACE FUNCTION coach_gacha_circle_spiral(p_scores INT[])
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_team          my_team%ROWTYPE;
  v_coach         coach_pool%ROWTYPE;
  v_rarity        TEXT;
  v_look          JSONB;
  v_user_coach_id UUID;
  v_paid_with     TEXT;
  v_gem_cost      INT;
  v_balance       INT;
  v_results       JSONB := '[]'::jsonb;
  v_pity          INT;
  v_force_ssr     BOOLEAN;
  v_count         INT;
  v_score         INT;
  i               INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  v_count := COALESCE(array_length(p_scores, 1), 0);
  IF v_count < 1 OR v_count > 10 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;
  -- 任一個 score < 50 視為失敗（不應該發生、前端會擋）
  FOR i IN 1..v_count LOOP
    IF p_scores[i] IS NULL OR p_scores[i] < 50 THEN RAISE EXCEPTION 'SCORE_TOO_LOW'; END IF;
  END LOOP;

  -- 費用：按 loop 數扣（每圈 1 ticket 或 20 寶石）
  v_gem_cost := v_count * 20;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  IF v_team.coach_tickets >= v_count THEN
    UPDATE my_team SET coach_tickets = coach_tickets - v_count WHERE user_id = v_uid;
    v_paid_with := 'ticket';
  ELSE
    SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_gem_cost THEN
      RAISE EXCEPTION 'INSUFFICIENT_RESOURCES';
    END IF;
    UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;
    v_paid_with := 'gems';
  END IF;

  v_pity := v_team.coach_pity_counter;

  -- 每個 loop 的 score 決定該圈的教練稀有度
  FOR i IN 1..v_count LOOP
    v_score := LEAST(100, p_scores[i]);
    v_force_ssr := (v_pity >= 30);

    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSIF v_score >= 95 THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSIF v_score >= 85 THEN
      v_rarity := 'SR'; v_pity := v_pity + 1;
    ELSE
      v_rarity := 'R'; v_pity := v_pity + 1;
    END IF;

    SELECT * INTO v_coach FROM coach_pool WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_coach FROM coach_pool WHERE rarity = 'R' ORDER BY random() LIMIT 1;
    END IF;

    IF v_rarity = 'SSR' AND v_coach.look_data IS NOT NULL THEN
      v_look := v_coach.look_data;
    ELSE
      v_look := generate_random_coach_look();
    END IF;

    INSERT INTO user_coach (user_id, coach_id, look_data)
    VALUES (v_uid, v_coach.coach_id, v_look)
    RETURNING id INTO v_user_coach_id;

    v_results := v_results || jsonb_build_object(
      'user_coach_id', v_user_coach_id,
      'coach_id',      v_coach.coach_id,
      'rarity',        v_coach.rarity,
      'name',          v_coach.name,
      'nickname',      v_coach.nickname,
      'trait',         v_coach.trait,
      'trait_value',   v_coach.trait_value,
      'look_data',     v_look,
      'forced_ssr',    v_force_ssr,
      'loop_score',    v_score
    );
  END LOOP;

  UPDATE my_team SET coach_pity_counter = v_pity, updated_at = now() WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'coaches',   v_results,
    'paid_with', v_paid_with,
    'source',    'spiral',
    'count',     v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION coach_gacha_circle_spiral(INT[]) TO authenticated;
