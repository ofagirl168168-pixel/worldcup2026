-- ============================================================
-- SSR 自選券兌換：選一張 SSR 卡加入隊伍
-- 來源：賽季冠軍（7+ 勝結算）+ 未來活動獎勵
-- ============================================================

CREATE OR REPLACE FUNCTION redeem_ssr_select_ticket(p_card_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_team    my_team%ROWTYPE;
  v_card    player_card_pool%ROWTYPE;
  v_existing_id UUID;
  v_existing_bond INT;
  v_is_duplicate BOOLEAN;
  v_look    JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.ssr_select_tickets < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_SSR_SELECT_TICKETS'; END IF;

  -- 必須是 SSR
  SELECT * INTO v_card FROM player_card_pool WHERE card_id = p_card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_CARD'; END IF;
  IF v_card.rarity <> 'SSR' THEN RAISE EXCEPTION 'NOT_SSR_CARD'; END IF;

  -- 已擁有 → bond +1（不能超過 5）；新卡 → insert
  SELECT id, bond INTO v_existing_id, v_existing_bond
  FROM team_player
  WHERE team_user_id = v_uid AND card_id = p_card_id
  ORDER BY bond DESC LIMIT 1;
  v_is_duplicate := FOUND;

  v_look := COALESCE(v_card.look_data, generate_random_look());

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
      v_uid, p_card_id, 1, 0,
      v_card.base_attack, v_card.base_defense, v_card.base_speed,
      v_card.base_midfield, v_card.base_stamina, v_card.base_aura,
      v_look
    );
  END IF;

  UPDATE my_team
  SET ssr_select_tickets = ssr_select_tickets - 1, updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'card_id', p_card_id, 'rarity', v_card.rarity,
    'name', v_card.name, 'nickname', v_card.nickname,
    'is_duplicate', v_is_duplicate, 'look_data', v_look
  );
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_ssr_select_ticket(TEXT) TO authenticated;
