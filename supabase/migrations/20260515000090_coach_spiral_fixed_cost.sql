-- ============================================================
-- 連環圓固定費用 + 還原 95/98 門檻
--   1 抽：20 寶石（或 1 ticket）
--   10 連：180 寶石（或 10 tickets、保留 20 寶石折扣）
--   稀有度：95-97 → SR、98+ → SSR（user 原始設計）
--   沒畫完的圈：score = 0、補 R consolation
--   10連始終回 10 個教練（pad 用 R）
-- ============================================================

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
  IF v_count NOT IN (1, 10) THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  -- 固定費用：1 抽 20 寶石、10 連 180（保留折扣）
  v_gem_cost := CASE v_count WHEN 1 THEN 20 ELSE 180 END;

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

  -- 每個 score 決定該抽稀有度（0 視為 R consolation）
  FOR i IN 1..v_count LOOP
    v_score := COALESCE(p_scores[i], 0);
    IF v_score < 0 THEN v_score := 0; END IF;
    IF v_score > 100 THEN v_score := 100; END IF;
    v_force_ssr := (v_pity >= 30);

    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSIF v_score >= 98 THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSIF v_score >= 95 THEN
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
      'loop_score',    v_score,
      'is_consolation', v_score < 50
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
