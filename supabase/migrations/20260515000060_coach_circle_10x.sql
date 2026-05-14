-- ============================================================
-- 召喚儀式：10 連抽支援（畫一次圓 → 10 個結果）
-- 不是「畫 10 次」（太膩）、是「1 個圓的分數決定 10 個結果的分配」
-- ============================================================

CREATE OR REPLACE FUNCTION coach_gacha_circle_draw(p_score INT, p_count INT DEFAULT 1)
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
  v_distribution  JSONB;
  v_roll          INT;
  v_ssr_rate      INT;
  v_sr_rate       INT;
  i               INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_score IS NULL OR p_score < 50 THEN RAISE EXCEPTION 'SCORE_TOO_LOW'; END IF;
  IF p_score > 100 THEN p_score := 100; END IF;
  IF p_count NOT IN (1, 10) THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  -- 1 抽 = 20 寶石、10 連 = 180
  v_gem_cost := CASE p_count WHEN 1 THEN 20 ELSE 180 END;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  -- 支付：教練券優先（>= p_count）、否則扣對應寶石
  IF v_team.coach_tickets >= p_count THEN
    UPDATE my_team SET coach_tickets = coach_tickets - p_count WHERE user_id = v_uid;
    v_paid_with := 'ticket';
  ELSE
    SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_gem_cost THEN
      RAISE EXCEPTION 'INSUFFICIENT_RESOURCES';
    END IF;
    UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;
    v_paid_with := 'gems';
  END IF;

  -- 依分數決定機率分佈
  -- 95+ → 30% SSR, 50% SR, 20% R
  -- 85-94 → 8% SSR, 35% SR, 57% R
  -- 50-84 → 2% SSR, 15% SR, 83% R
  IF p_score >= 95 THEN
    v_ssr_rate := 30; v_sr_rate := 50;
  ELSIF p_score >= 85 THEN
    v_ssr_rate := 8;  v_sr_rate := 35;
  ELSE
    v_ssr_rate := 2;  v_sr_rate := 15;
  END IF;

  v_pity := v_team.coach_pity_counter;

  FOR i IN 1..p_count LOOP
    -- 保底：連 30 抽無 SSR → 必中
    v_force_ssr := (v_pity >= 30);
    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSE
      v_roll := floor(random() * 100)::int;
      IF v_roll < v_ssr_rate THEN
        v_rarity := 'SSR'; v_pity := 0;
      ELSIF v_roll < v_ssr_rate + v_sr_rate THEN
        v_rarity := 'SR'; v_pity := v_pity + 1;
      ELSE
        v_rarity := 'R'; v_pity := v_pity + 1;
      END IF;
    END IF;

    -- 10 連最後一張保 SR 起步（如果全都 R 的話）
    IF p_count = 10 AND i = 10 AND v_rarity = 'R' THEN
      v_rarity := 'SR';
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
      'forced_ssr',    v_force_ssr
    );
  END LOOP;

  UPDATE my_team SET coach_pity_counter = v_pity, updated_at = now() WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'coaches',   v_results,
    'paid_with', v_paid_with,
    'score',     p_score,
    'source',    'circle',
    'count',     p_count
  );
END;
$$;
