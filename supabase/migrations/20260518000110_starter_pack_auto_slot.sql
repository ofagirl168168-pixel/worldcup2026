-- ============================================================
-- 新手包：依 position 自動指派 4-3-3 對應 slot（GK=0、DEF=1-4、MID=5-7、FWD=8-10）
-- 並調整分配讓覆蓋率最佳：
--   1 GK / 4 DEF / 3 MID / 2 FWD = 10 在 starting（slot 10 FWD 留給日常 1 抽）
--
-- 新分配：
--   SSR FWD ×1
--   SR  GK ×1, SR DEF ×1                 (2 SR)
--   R   DEF ×2, R MID ×1                  (3 R)
--   N   DEF ×1, N MID ×2, N FWD ×1        (4 N)
-- ============================================================

CREATE OR REPLACE FUNCTION claim_starter_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team my_team%ROWTYPE;
  v_pulls text[][] := ARRAY[
    ['SSR','FWD'],
    ['SR','GK'],['SR','DEF'],
    ['R','DEF'],['R','DEF'],['R','MID'],
    ['N','DEF'],['N','MID'],['N','MID'],['N','FWD']
  ];
  v_card    player_card_pool%ROWTYPE;
  v_rarity  text;
  v_pos     text;
  v_look    jsonb;
  v_results jsonb := '[]'::jsonb;
  -- 4-3-3 各 position 的下一個可用 slot
  v_next_gk  smallint := 0;
  v_next_def smallint := 1;
  v_next_mid smallint := 5;
  v_next_fwd smallint := 8;
  v_slot     smallint;
  v_in_starting boolean;
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

    -- 依 v_card.position 找下一個對應 slot（4-3-3）
    IF v_card.position = 'GK' AND v_next_gk <= 0 THEN
      v_slot := v_next_gk; v_next_gk := v_next_gk + 1; v_in_starting := true;
    ELSIF v_card.position = 'DEF' AND v_next_def <= 4 THEN
      v_slot := v_next_def; v_next_def := v_next_def + 1; v_in_starting := true;
    ELSIF v_card.position = 'MID' AND v_next_mid <= 7 THEN
      v_slot := v_next_mid; v_next_mid := v_next_mid + 1; v_in_starting := true;
    ELSIF v_card.position = 'FWD' AND v_next_fwd <= 10 THEN
      v_slot := v_next_fwd; v_next_fwd := v_next_fwd + 1; v_in_starting := true;
    ELSE
      v_slot := NULL; v_in_starting := false;
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
      v_look, v_in_starting, v_slot
    );

    v_results := v_results || jsonb_build_object(
      'card_id',  v_card.card_id, 'rarity', v_card.rarity,
      'name',     v_card.name, 'position', v_card.position,
      'attack',   v_card.base_attack, 'defense', v_card.base_defense,
      'speed',    v_card.base_speed, 'midfield', v_card.base_midfield,
      'stamina',  v_card.base_stamina, 'aura',    v_card.base_aura,
      'talent',   v_card.talent, 'look_data', v_look,
      'starting_slot', v_slot, 'in_starting_11', v_in_starting
    );
  END LOOP;

  UPDATE my_team SET starter_pack_claimed = true, updated_at = now() WHERE user_id = v_uid;

  RETURN jsonb_build_object('players', v_results);
END $$;

GRANT EXECUTE ON FUNCTION claim_starter_pack() TO authenticated;
