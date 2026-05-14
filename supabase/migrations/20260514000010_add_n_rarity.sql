-- ============================================================
-- 新增 N（Normal）級稀有度
-- 機率調整：N 50% / R 30% / SR 15% / SSR 5%（保底 30 抽 SSR 不變）
-- ============================================================

-- 1. 放寬 player_card_pool / coach_pool 的 rarity CHECK
ALTER TABLE player_card_pool DROP CONSTRAINT IF EXISTS player_card_pool_rarity_check;
ALTER TABLE player_card_pool ADD CONSTRAINT player_card_pool_rarity_check
  CHECK (rarity IN ('N','R','SR','SSR'));

ALTER TABLE coach_pool DROP CONSTRAINT IF EXISTS coach_pool_rarity_check;
ALTER TABLE coach_pool ADD CONSTRAINT coach_pool_rarity_check
  CHECK (rarity IN ('N','R','SR','SSR'));

-- 2. 更新 gacha_draw 機率
CREATE OR REPLACE FUNCTION gacha_draw(p_count int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team my_team%ROWTYPE;
  v_results jsonb := '[]'::jsonb;
  v_card player_card_pool%ROWTYPE;
  v_pity int;
  v_force_ssr boolean;
  v_force_sr boolean;
  v_rarity text;
  v_roll int;
  v_look jsonb;
  v_existing_id uuid;
  v_existing_bond int;
  v_is_dup boolean;
  i int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count < 1 OR p_count > 10 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.tickets < p_count THEN RAISE EXCEPTION 'INSUFFICIENT_TICKETS'; END IF;

  v_pity := v_team.pity_counter;

  FOR i IN 1..p_count LOOP
    v_force_ssr := (v_pity >= 30);
    -- 10 連抽最後一張保證 SR 起步
    v_force_sr := (p_count = 10 AND i = 10);

    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSE
      v_roll := floor(random() * 100)::int;
      -- N 50% / R 30% / SR 15% / SSR 5%
      IF v_roll < 5 THEN v_rarity := 'SSR'; v_pity := 0;
      ELSIF v_roll < 20 THEN v_rarity := 'SR'; v_pity := v_pity + 1;
      ELSIF v_roll < 50 THEN v_rarity := 'R'; v_pity := v_pity + 1;
      ELSE v_rarity := 'N'; v_pity := v_pity + 1;
      END IF;
      -- 10 連抽最後一張保 SR 起步
      IF v_force_sr AND v_rarity IN ('N','R') THEN
        v_rarity := 'SR';
      END IF;
    END IF;

    SELECT * INTO v_card FROM player_card_pool
    WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    -- 若 N 還沒 seed、退到 R
    IF NOT FOUND AND v_rarity = 'N' THEN
      v_rarity := 'R';
      SELECT * INTO v_card FROM player_card_pool
      WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'NO_CARD_IN_POOL: %', v_rarity; END IF;

    -- look_data：SSR 用卡池固定形象、其他隨機生
    IF v_rarity = 'SSR' AND v_card.look_data IS NOT NULL THEN
      v_look := v_card.look_data;
    ELSE
      v_look := generate_random_look();
    END IF;

    -- 檢查是否重複（有同 card_id 就 bond+1、不新增）
    SELECT id, bond INTO v_existing_id, v_existing_bond
    FROM team_player
    WHERE team_user_id = v_uid AND card_id = v_card.card_id
    LIMIT 1;
    v_is_dup := v_existing_id IS NOT NULL;

    IF v_is_dup THEN
      UPDATE team_player SET bond = LEAST(5, COALESCE(bond, 0) + 1)
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO team_player (
        team_user_id, card_id, level, bond,
        current_attack, current_defense, current_speed,
        current_midfield, current_stamina, current_aura,
        look_data, in_starting_11
      )
      VALUES (
        v_uid, v_card.card_id, 1, 0,
        v_card.base_attack, v_card.base_defense, v_card.base_speed,
        v_card.base_midfield, v_card.base_stamina, v_card.base_aura,
        v_look, false
      );
    END IF;

    v_results := v_results || jsonb_build_object(
      'card_id',  v_card.card_id,
      'rarity',   v_card.rarity,
      'name',     v_card.name,
      'position', v_card.position,
      'is_duplicate', v_is_dup,
      'forced_ssr', v_force_ssr,
      'look_data', v_look
    );
  END LOOP;

  UPDATE my_team
  SET tickets = tickets - p_count,
      pity_counter = v_pity,
      updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('cards', v_results, 'pity_after', v_pity);
END $$;

GRANT EXECUTE ON FUNCTION gacha_draw(int) TO authenticated;

-- 3. Seed 一些 N 級球員（每位置 20 張、共 100 張）
INSERT INTO player_card_pool (card_id, name, position, rarity,
  base_attack, base_defense, base_speed, base_midfield, base_stamina, base_aura,
  talent)
SELECT
  'n-' || lower(pos) || '-' || lpad(i::text, 3, '0'),
  '新人' || i || '號',
  pos,
  'N',
  -- N 級數值約是 R 級的 70%
  CASE pos WHEN 'FWD' THEN 35 + (random()*15)::int
           WHEN 'MID' THEN 30 + (random()*15)::int
           WHEN 'DEF' THEN 25 + (random()*15)::int
           ELSE 20 + (random()*10)::int END,  -- GK attack 低
  CASE pos WHEN 'DEF' THEN 35 + (random()*15)::int
           WHEN 'GK'  THEN 38 + (random()*12)::int
           WHEN 'MID' THEN 28 + (random()*12)::int
           ELSE 22 + (random()*12)::int END,
  CASE pos WHEN 'FWD' THEN 35 + (random()*15)::int
           WHEN 'MID' THEN 32 + (random()*13)::int
           WHEN 'DEF' THEN 28 + (random()*12)::int
           ELSE 18 + (random()*10)::int END,
  CASE pos WHEN 'MID' THEN 35 + (random()*15)::int
           WHEN 'AMC' THEN 33 + (random()*14)::int
           WHEN 'FWD' THEN 28 + (random()*12)::int
           ELSE 22 + (random()*12)::int END,
  28 + (random()*15)::int,  -- N 級體力較弱
  20 + (random()*15)::int,  -- N 級氣場較弱
  NULL  -- N 級沒 talent
FROM (VALUES ('GK'),('DEF'),('MID'),('FWD')) AS positions(pos),
     generate_series(1, 25) AS i
ON CONFLICT (card_id) DO NOTHING;
