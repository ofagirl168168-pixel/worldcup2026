-- ============================================================
-- 我的球隊 — 更新 gacha_draw RPC、加 look_data 寫入邏輯
--   SSR：從 player_card_pool.look_data 讀（固定真實球員形象）
--   SR/R：server-side random，組合自 LPC layer 各分類
-- ============================================================

-- ── helper：產生隨機 look_data（給 SR/R 用）──
CREATE OR REPLACE FUNCTION generate_random_look()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_bodies      TEXT[] := ARRAY['light','olive','amber','brown','bronze'];
  v_eyes        TEXT[] := ARRAY['blue','brown','gray','green'];
  v_hair_styles TEXT[] := ARRAY[
    'messy1','messy2','spiked','plain','bangs','bangslong','pixie','shorthawk',
    'wavy','swoop','high_and_tight','mop','flat_top_fade','long_messy',
    'curly_long','bedhead','afro','dreadlocks_long','buzzcut','bedhead','long'
  ];
  v_hair_colors TEXT[] := ARRAY['black','blonde','red','white','ginger','gray'];
  v_beards      TEXT[] := ARRAY['5oclock_shadow','basic','medium','trimmed'];
  v_mustaches   TEXT[] := ARRAY['basic','handlebar','walrus','chevron'];
  v_hair_color  TEXT;
  v_hair_style  TEXT;
  v_beard       TEXT := 'none';
  v_mustache    TEXT := 'none';
  v_wrinkles    TEXT := 'none';
BEGIN
  -- 5% 光頭
  IF random() < 0.05 THEN v_hair_style := 'bald';
  ELSE v_hair_style := v_hair_styles[1 + floor(random() * array_length(v_hair_styles,1))];
  END IF;

  v_hair_color := v_hair_colors[1 + floor(random() * array_length(v_hair_colors,1))];

  -- 10% 鬍子
  IF random() < 0.1 THEN
    v_beard := v_beards[1 + floor(random() * array_length(v_beards,1))];
  END IF;
  -- 5% 鬍髭
  IF random() < 0.05 THEN
    v_mustache := v_mustaches[1 + floor(random() * array_length(v_mustaches,1))];
  END IF;
  -- 10% 老將皺紋
  IF random() < 0.1 THEN v_wrinkles := 'on'; END IF;

  RETURN jsonb_build_object(
    'body',           v_bodies[1 + floor(random() * array_length(v_bodies,1))],
    'eye_color',      v_eyes[1 + floor(random() * array_length(v_eyes,1))],
    'wrinkles',       v_wrinkles,
    'hair_style',     v_hair_style,
    'hair_color',     v_hair_color,
    'beard_style',    v_beard,
    'mustache_style', v_mustache,
    'beard_color',    v_hair_color    -- 鬍色跟髮色
  );
END;
$$;


-- ── 更新 gacha_draw RPC（覆寫舊版）──
CREATE OR REPLACE FUNCTION gacha_draw(
  p_count INT,
  p_source TEXT DEFAULT 'manual',
  p_consume_tickets BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_team         my_team%ROWTYPE;
  v_results      JSONB := '[]'::jsonb;
  v_card         player_card_pool%ROWTYPE;
  v_existing_id  UUID;
  v_existing_bond INT;
  v_pity         INT;
  v_force_ssr    BOOLEAN;
  v_rarity       TEXT;
  v_roll         INT;
  v_is_duplicate BOOLEAN;
  v_look         JSONB;
  i              INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count < 1 OR p_count > 10 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  IF p_consume_tickets AND v_team.tickets < p_count THEN
    RAISE EXCEPTION 'INSUFFICIENT_TICKETS';
  END IF;

  v_pity := v_team.pity_counter;

  FOR i IN 1..p_count LOOP
    v_force_ssr := (v_pity >= 30);

    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSE
      v_roll := floor(random() * 100)::int;
      IF v_roll < 5 THEN v_rarity := 'SSR'; v_pity := 0;
      ELSIF v_roll < 25 THEN v_rarity := 'SR'; v_pity := v_pity + 1;
      ELSE v_rarity := 'R'; v_pity := v_pity + 1;
      END IF;
    END IF;

    SELECT * INTO v_card FROM player_card_pool
    WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'NO_CARD_IN_POOL: %', v_rarity; END IF;

    -- look_data：SSR 用卡池固定形象；SR/R 隨機生
    IF v_rarity = 'SSR' AND v_card.look_data IS NOT NULL THEN
      v_look := v_card.look_data;
    ELSE
      v_look := generate_random_look();
    END IF;

    SELECT id, bond INTO v_existing_id, v_existing_bond
    FROM team_player
    WHERE team_user_id = v_uid AND card_id = v_card.card_id
    ORDER BY bond DESC LIMIT 1;

    v_is_duplicate := FOUND;

    IF v_is_duplicate AND v_existing_bond < 5 THEN
      UPDATE team_player SET bond = bond + 1 WHERE id = v_existing_id;
    ELSIF NOT v_is_duplicate THEN
      INSERT INTO team_player (
        team_user_id, card_id, level, bond,
        current_attack, current_defense, current_speed,
        current_midfield, current_stamina, current_aura,
        look_data
      )
      VALUES (
        v_uid, v_card.card_id, 1, 0,
        v_card.base_attack, v_card.base_defense, v_card.base_speed,
        v_card.base_midfield, v_card.base_stamina, v_card.base_aura,
        v_look
      );
    END IF;

    v_results := v_results || jsonb_build_object(
      'card_id',     v_card.card_id,
      'rarity',      v_card.rarity,
      'name',        v_card.name,
      'nickname',    v_card.nickname,
      'position',    v_card.position,
      'attack',      v_card.base_attack,
      'defense',     v_card.base_defense,
      'speed',       v_card.base_speed,
      'midfield',    v_card.base_midfield,
      'stamina',     v_card.base_stamina,
      'aura',        v_card.base_aura,
      'talent',      v_card.talent,
      'illustration',v_card.illustration,
      'look_data',   v_look,
      'is_duplicate',v_is_duplicate,
      'forced_ssr',  v_force_ssr
    );
  END LOOP;

  UPDATE my_team
  SET tickets = CASE WHEN p_consume_tickets THEN tickets - p_count ELSE tickets END,
      pity_counter = v_pity,
      updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'cards', v_results, 'pity_after', v_pity,
    'source', p_source, 'consumed', p_consume_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION gacha_draw(INT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_random_look() TO authenticated;
