-- ============================================================
-- 新手包加入 4 張 N 卡當板凳（每位置 1 張）
-- 先發 11 人不變、額外送 4 張 N 板凳備援、讓新手看到所有稀有度
-- ============================================================

CREATE OR REPLACE FUNCTION claim_starter_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team my_team%ROWTYPE;
  -- 11 先發 + 4 N 板凳（第 12-15 個元素）
  v_pulls text[][] := ARRAY[
    -- 先發 11 人（in_starting_11 = true、slot 0-10）
    ['SSR','FWD'],
    ['SR','GK'],['SR','DEF'],['SR','MID'],['SR','MID'],['SR','FWD'],
    ['R','GK'],['R','DEF'],['R','DEF'],['R','DEF'],['R','MID'],
    -- 板凳 4 人（in_starting_11 = false、slot NULL）
    ['N','GK'],['N','DEF'],['N','MID'],['N','FWD']
  ];
  v_card     player_card_pool%ROWTYPE;
  v_rarity   text;
  v_pos      text;
  v_look     jsonb;
  v_results  jsonb := '[]'::jsonb;
  v_slot     smallint := 0;
  v_starter  boolean;
  v_slot_val smallint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.starter_pack_claimed THEN RAISE EXCEPTION 'STARTER_PACK_ALREADY_CLAIMED'; END IF;

  FOR i IN 1..array_length(v_pulls, 1) LOOP
    v_rarity := v_pulls[i][1];
    v_pos    := v_pulls[i][2];

    SELECT * INTO v_card FROM player_card_pool
    WHERE rarity = v_rarity AND position = v_pos
    ORDER BY random() LIMIT 1;

    IF NOT FOUND THEN
      SELECT * INTO v_card FROM player_card_pool WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    END IF;

    IF v_rarity = 'SSR' AND v_card.look_data IS NOT NULL THEN
      v_look := v_card.look_data;
    ELSE
      v_look := generate_random_look();
    END IF;

    -- 前 11 個 → 先發、starting_slot 遞增；後 4 個 (N 卡) → 板凳、slot NULL
    IF i <= 11 THEN
      v_starter := true;
      v_slot_val := v_slot;
      v_slot := v_slot + 1;
    ELSE
      v_starter := false;
      v_slot_val := NULL;
    END IF;

    INSERT INTO team_player (
      team_user_id, card_id, level, bond,
      current_attack, current_defense, current_speed,
      current_midfield, current_stamina, current_aura,
      look_data, in_starting_11, starting_slot
    )
    VALUES (
      v_uid, v_card.card_id, 1, 0,
      v_card.base_attack, v_card.base_defense, v_card.base_speed,
      v_card.base_midfield, v_card.base_stamina, v_card.base_aura,
      v_look, v_starter, v_slot_val
    );

    v_results := v_results || jsonb_build_object(
      'card_id',  v_card.card_id, 'rarity', v_card.rarity,
      'name',     v_card.name, 'position', v_card.position,
      'attack',   v_card.base_attack, 'defense', v_card.base_defense,
      'speed',    v_card.base_speed, 'midfield', v_card.base_midfield,
      'stamina',  v_card.base_stamina, 'aura',    v_card.base_aura,
      'talent',   v_card.talent, 'look_data', v_look,
      'in_starting_11', v_starter
    );
  END LOOP;

  UPDATE my_team SET starter_pack_claimed = true, updated_at = now() WHERE user_id = v_uid;

  RETURN jsonb_build_object('players', v_results);
END $$;

GRANT EXECUTE ON FUNCTION claim_starter_pack() TO authenticated;
