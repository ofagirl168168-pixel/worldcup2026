-- ============================================================
-- 修 place_player_at_slot：starter↔starter swap 步驟違反 CHECK 約束
-- 原本 set starting_slot=NULL 但 in_starting_11=true → 違反 consistency CHECK
-- 改：把 occupier 同時降到板凳（in_starting_11=false + slot=NULL）再放回
-- ============================================================

CREATE OR REPLACE FUNCTION place_player_at_slot(
  p_player_id uuid,
  p_target_slot smallint
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_player team_player%ROWTYPE;
  v_occupier_id uuid;
  v_old_slot smallint;
  v_starters_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_target_slot < 0 OR p_target_slot > 10 THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;

  SELECT * INTO v_player FROM team_player
   WHERE id = p_player_id AND team_user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  IF v_player.in_starting_11 AND v_player.starting_slot = p_target_slot THEN RETURN; END IF;

  v_old_slot := v_player.starting_slot;

  SELECT id INTO v_occupier_id FROM team_player
   WHERE team_user_id = v_uid AND starting_slot = p_target_slot AND in_starting_11 = true;

  IF v_occupier_id IS NOT NULL THEN
    -- target 有人
    IF v_player.in_starting_11 THEN
      -- 兩 starter 換 slot：先把 occupier 暫時降到板凳（同一 UPDATE 改兩欄、不違反 CHECK），
      -- 再把 player 移到 target、最後 occupier 回到 player 舊 slot
      UPDATE team_player SET in_starting_11 = false, starting_slot = NULL WHERE id = v_occupier_id;
      UPDATE team_player SET starting_slot = p_target_slot WHERE id = p_player_id;
      UPDATE team_player SET in_starting_11 = true, starting_slot = v_old_slot WHERE id = v_occupier_id;
    ELSE
      -- bench 換上：佔位者下板凳（一個 UPDATE）
      UPDATE team_player SET in_starting_11 = false, starting_slot = NULL WHERE id = v_occupier_id;
      UPDATE team_player SET in_starting_11 = true, starting_slot = p_target_slot WHERE id = p_player_id;
    END IF;
  ELSE
    -- target 空位
    IF v_player.in_starting_11 THEN
      UPDATE team_player SET starting_slot = p_target_slot WHERE id = p_player_id;
    ELSE
      SELECT COUNT(*) INTO v_starters_count FROM team_player
       WHERE team_user_id = v_uid AND in_starting_11 = true;
      IF v_starters_count >= 11 THEN RAISE EXCEPTION 'STARTERS_FULL'; END IF;
      UPDATE team_player SET in_starting_11 = true, starting_slot = p_target_slot WHERE id = p_player_id;
    END IF;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION place_player_at_slot(uuid, smallint) TO authenticated;
