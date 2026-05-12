-- ============================================================
-- 我的球隊 Phase 1.6 — 抽卡 RPC
-- 設計依據 docs/my-team-design.md §5.1-§5.3
-- 機率：R 75% / SR 20% / SSR 5%；保底：連 30 抽無 SSR → 第 31 必出
-- ============================================================

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
  i              INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_LOGGED_IN';
  END IF;
  IF p_count < 1 OR p_count > 10 THEN
    RAISE EXCEPTION 'INVALID_COUNT';
  END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_TEAM';
  END IF;

  IF p_consume_tickets AND v_team.tickets < p_count THEN
    RAISE EXCEPTION 'INSUFFICIENT_TICKETS';
  END IF;

  v_pity := v_team.pity_counter;

  FOR i IN 1..p_count LOOP
    -- 保底：連 30 抽沒 SSR → 必中
    v_force_ssr := (v_pity >= 30);

    IF v_force_ssr THEN
      v_rarity := 'SSR';
      v_pity := 0;
    ELSE
      v_roll := floor(random() * 100)::int;
      IF v_roll < 5 THEN
        v_rarity := 'SSR';
        v_pity := 0;
      ELSIF v_roll < 25 THEN
        v_rarity := 'SR';
        v_pity := v_pity + 1;
      ELSE
        v_rarity := 'R';
        v_pity := v_pity + 1;
      END IF;
    END IF;

    -- 從該稀有度池隨機抽一張
    SELECT * INTO v_card FROM player_card_pool
    WHERE rarity = v_rarity
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NO_CARD_IN_POOL: %', v_rarity;
    END IF;

    -- 已擁有 → bond 升級（未達 5 星）；新卡 → insert
    SELECT id, bond INTO v_existing_id, v_existing_bond
    FROM team_player
    WHERE team_user_id = v_uid AND card_id = v_card.card_id
    ORDER BY bond DESC
    LIMIT 1;

    v_is_duplicate := FOUND;

    IF v_is_duplicate AND v_existing_bond < 5 THEN
      UPDATE team_player SET bond = bond + 1 WHERE id = v_existing_id;
    ELSIF NOT v_is_duplicate THEN
      INSERT INTO team_player (
        team_user_id, card_id, level, bond,
        current_attack, current_defense, current_speed,
        current_midfield, current_stamina, current_aura
      )
      VALUES (
        v_uid, v_card.card_id, 1, 0,
        v_card.base_attack, v_card.base_defense, v_card.base_speed,
        v_card.base_midfield, v_card.base_stamina, v_card.base_aura
      );
    END IF;
    -- bond 已 5：什麼也不做，視為「賣卡」可由前端後續處理

    -- 加入結果
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
      'is_duplicate',v_is_duplicate,
      'forced_ssr',  v_force_ssr
    );
  END LOOP;

  -- 更新 my_team（tickets / pity）
  UPDATE my_team
  SET tickets = CASE WHEN p_consume_tickets THEN tickets - p_count ELSE tickets END,
      pity_counter = v_pity,
      updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'cards',         v_results,
    'pity_after',    v_pity,
    'source',        p_source,
    'consumed',      p_consume_tickets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION gacha_draw(INT, TEXT, BOOLEAN) TO authenticated;
