-- ============================================================
-- 修：gacha_draw 3 參版本沒有 N rarity（only SSR/SR/R）
-- bug 來源：20260514000010_add_n_rarity.sql 只 OR REPLACE 單參版本、
--          沒處理 20260512000011 的 3 參版本（client 實際呼叫的版本）
-- 同時兩個 overload 並存 → gacha_draw_with_gems 也 ambiguous
--
-- 修法：
--   1. DROP 單參版本（多餘、client 不用）
--   2. OR REPLACE 3 參版本、加入 N 50% / R 30% / SR 15% / SSR 5%
--   3. 10 連抽最後一張保證 SR 起步（避免全 N）
--   4. N 卡找不到時 fallback 到 R
-- ============================================================

DROP FUNCTION IF EXISTS gacha_draw(INT);

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
  v_uid           UUID := auth.uid();
  v_team          my_team%ROWTYPE;
  v_results       JSONB := '[]'::jsonb;
  v_card          player_card_pool%ROWTYPE;
  v_existing_id   UUID;
  v_existing_bond INT;
  v_pity          INT;
  v_force_ssr     BOOLEAN;
  v_force_sr      BOOLEAN;
  v_rarity        TEXT;
  v_roll          INT;
  v_is_duplicate  BOOLEAN;
  v_look          JSONB;
  i               INT;
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
    -- 10 連抽最後一張保證 SR 起步
    v_force_sr := (p_count = 10 AND i = 10);

    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSE
      v_roll := floor(random() * 100)::int;
      -- N 50% / R 30% / SR 15% / SSR 5%
      IF v_roll < 5 THEN v_rarity := 'SSR'; v_pity := 0;
      ELSIF v_roll < 20 THEN v_rarity := 'SR'; v_pity := v_pity + 1;
      ELSIF v_roll < 50 THEN v_rarity := 'R';  v_pity := v_pity + 1;
      ELSE v_rarity := 'N'; v_pity := v_pity + 1;
      END IF;
      -- 10 連抽最後一張保 SR 起步
      IF v_force_sr AND v_rarity IN ('N','R') THEN
        v_rarity := 'SR';
      END IF;
    END IF;

    SELECT * INTO v_card FROM player_card_pool
    WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    -- N 卡找不到（pool 沒 seed）→ 退到 R
    IF NOT FOUND AND v_rarity = 'N' THEN
      v_rarity := 'R';
      SELECT * INTO v_card FROM player_card_pool
      WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'NO_CARD_IN_POOL: %', v_rarity; END IF;

    -- look_data：SSR 用卡池固定形象；其他隨機生
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
      'card_id',      v_card.card_id,
      'rarity',       v_card.rarity,
      'name',         v_card.name,
      'nickname',     v_card.nickname,
      'position',     v_card.position,
      'attack',       v_card.base_attack,
      'defense',      v_card.base_defense,
      'speed',        v_card.base_speed,
      'midfield',     v_card.base_midfield,
      'stamina',      v_card.base_stamina,
      'aura',         v_card.base_aura,
      'talent',       v_card.talent,
      'illustration', v_card.illustration,
      'look_data',    v_look,
      'is_duplicate', v_is_duplicate,
      'forced_ssr',   v_force_ssr
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
