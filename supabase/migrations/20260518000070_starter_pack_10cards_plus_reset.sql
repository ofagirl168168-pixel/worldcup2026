-- ============================================================
-- 新手包改 10 張（10 連抽）+ 開發測試 reset RPC
-- 分配：1 SSR + 2 SR + 3 R + 4 N
-- 玩家另從每日登入 / 擂台等管道至少有 1 球員 → 湊 11 人可比賽
-- ============================================================

CREATE OR REPLACE FUNCTION claim_starter_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team my_team%ROWTYPE;
  -- 10 張：1 SSR + 2 SR + 3 R + 4 N
  v_pulls text[][] := ARRAY[
    ['SSR','FWD'],                       -- ×1
    ['SR','GK'],['SR','MID'],             -- ×2
    ['R','DEF'],['R','DEF'],['R','MID'],  -- ×3
    ['N','GK'],['N','DEF'],['N','MID'],['N','FWD']   -- ×4（覆蓋 4 位置）
  ];
  v_card    player_card_pool%ROWTYPE;
  v_rarity  text;
  v_pos     text;
  v_look    jsonb;
  v_results jsonb := '[]'::jsonb;
  v_slot    smallint := 0;
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
      v_look, true, v_slot
    );
    v_slot := v_slot + 1;

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

  RETURN jsonb_build_object('players', v_results);
END $$;

GRANT EXECUTE ON FUNCTION claim_starter_pack() TO authenticated;


-- ─── 開發測試：清隊伍 + 重置 starter_pack flag + 立即重抽 ───
CREATE OR REPLACE FUNCTION dev_reset_starter_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team my_team%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  -- 清掉現有球員（包括他們的訓練狀態 / 緣分 / 屬性）
  DELETE FROM team_player WHERE team_user_id = v_uid;

  -- 重置 starter pack 相關 flag
  UPDATE my_team
  SET starter_pack_claimed = false,
      tutorial_first_training_used = false,
      tutorial_match_done = false,
      updated_at = now()
  WHERE user_id = v_uid;

  -- 立即重抽（也避免 client 端的雙重 click 競態）
  RETURN claim_starter_pack();
END $$;

GRANT EXECUTE ON FUNCTION dev_reset_starter_pack() TO authenticated;
COMMENT ON FUNCTION dev_reset_starter_pack() IS '開發測試：清空隊伍 + 重置新手指引 flag + 立即重抽新手包';
