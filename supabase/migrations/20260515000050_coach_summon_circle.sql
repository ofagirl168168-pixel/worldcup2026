-- ============================================================
-- 召喚儀式（畫圓抽教練）
-- 依玩家畫的圓度決定稀有度：
--   95+ → SSR、85-94 → SR、50-84 → R
--   < 50 不抽（前端會擋）
-- 自動選擇支付方式：有教練券優先扣券、否則扣 20 寶石
-- ============================================================

CREATE OR REPLACE FUNCTION coach_gacha_circle_draw(p_score INT)
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
  v_gem_cost      INT := 20;
  v_balance       INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_score IS NULL OR p_score < 50 THEN RAISE EXCEPTION 'SCORE_TOO_LOW'; END IF;
  IF p_score > 100 THEN p_score := 100; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  -- 決定支付：教練券優先、否則扣 20 寶石
  IF v_team.coach_tickets >= 1 THEN
    UPDATE my_team SET coach_tickets = coach_tickets - 1 WHERE user_id = v_uid;
    v_paid_with := 'ticket';
  ELSE
    SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_gem_cost THEN
      RAISE EXCEPTION 'INSUFFICIENT_RESOURCES';
    END IF;
    UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;
    v_paid_with := 'gems';
  END IF;

  -- 依分數決定稀有度（門檻比一般 gacha 寬鬆 — 鼓勵畫圓）
  IF p_score >= 95 THEN
    v_rarity := 'SSR';
  ELSIF p_score >= 85 THEN
    v_rarity := 'SR';
  ELSE
    v_rarity := 'R';
  END IF;

  -- 隨機選一位該稀有度的教練
  SELECT * INTO v_coach FROM coach_pool WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN
    -- fallback：稀有度找不到、降一級
    SELECT * INTO v_coach FROM coach_pool WHERE rarity = 'R' ORDER BY random() LIMIT 1;
  END IF;

  -- look_data：SSR 用固定形象、其他隨機
  IF v_rarity = 'SSR' AND v_coach.look_data IS NOT NULL THEN
    v_look := v_coach.look_data;
  ELSE
    v_look := generate_random_coach_look();
  END IF;

  INSERT INTO user_coach (user_id, coach_id, look_data)
  VALUES (v_uid, v_coach.coach_id, v_look)
  RETURNING id INTO v_user_coach_id;

  -- 重置教練保底計數器（同一般抽教練、SSR 觸發重置）
  IF v_rarity = 'SSR' THEN
    UPDATE my_team SET coach_pity_counter = 0 WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'coaches', jsonb_build_array(jsonb_build_object(
      'user_coach_id', v_user_coach_id,
      'coach_id',      v_coach.coach_id,
      'rarity',        v_coach.rarity,
      'name',          v_coach.name,
      'nickname',      v_coach.nickname,
      'trait',         v_coach.trait,
      'trait_value',   v_coach.trait_value,
      'look_data',     v_look,
      'score',         p_score
    )),
    'paid_with', v_paid_with,
    'score',     p_score,
    'source',    'circle'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION coach_gacha_circle_draw(INT) TO authenticated;
