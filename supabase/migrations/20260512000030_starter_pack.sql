-- ============================================================
-- 新手禮包 — 確定組合的 10 連抽（1 SSR FWD + 2 SR + 7 R 覆蓋全位置）
-- 每位使用者只能領一次（my_team.starter_pack_claimed）
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS starter_pack_claimed BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION claim_starter_pack()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_team    my_team%ROWTYPE;
  v_results JSONB := '[]'::jsonb;
  v_card    player_card_pool%ROWTYPE;
  v_look    JSONB;

  -- 套裝目標位置與稀有度（10 張：1 SSR FWD + 2 SR + 7 R）
  -- 確保陣容能組 1 GK / 4 DEF / 3 MID / 3 FWD
  v_pulls TEXT[][] := ARRAY[
    ARRAY['SSR', 'FWD'],   -- 1 張頭牌前鋒
    ARRAY['SR',  'MID'],   -- 中場大師
    ARRAY['SR',  'DEF'],   -- 後防中堅
    ARRAY['R',   'GK'],    -- 門將
    ARRAY['R',   'DEF'],
    ARRAY['R',   'DEF'],
    ARRAY['R',   'DEF'],
    ARRAY['R',   'MID'],
    ARRAY['R',   'MID'],
    ARRAY['R',   'FWD']
  ];
  v_rarity  TEXT;
  v_pos     TEXT;
  i         INT;
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
      -- 該位置該稀有度沒卡 → 退到只挑稀有度
      SELECT * INTO v_card FROM player_card_pool WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    END IF;

    IF v_rarity = 'SSR' AND v_card.look_data IS NOT NULL THEN
      v_look := v_card.look_data;
    ELSE
      v_look := generate_random_look();
    END IF;

    -- 直接 insert（不用考慮重複，新手禮確保陣容）
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
      v_look, true   -- 全部自動上首發 11
    );

    v_results := v_results || jsonb_build_object(
      'card_id',  v_card.card_id, 'rarity', v_card.rarity,
      'name',     v_card.name, 'position', v_card.position,
      'attack',   v_card.base_attack, 'defense', v_card.base_defense,
      'speed',    v_card.base_speed, 'midfield', v_card.base_midfield,
      'stamina',  v_card.base_stamina, 'aura',    v_card.base_aura,
      'talent',   v_card.talent, 'look_data', v_look
    );
  END LOOP;

  UPDATE my_team SET starter_pack_claimed = true, updated_at = now() WHERE user_id = v_uid;
  RETURN jsonb_build_object('cards', v_results, 'count', array_length(v_pulls, 1));
END;
$$;

GRANT EXECUTE ON FUNCTION claim_starter_pack() TO authenticated;
