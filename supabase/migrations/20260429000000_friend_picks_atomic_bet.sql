-- 麥迪挑戰賽：投比分 + 扣押注寶石「原子化」
-- 之前的 bug：client 直接 friend_picks.upsert，沒扣寶石；settle 卻發獎金 → 贏家憑空生 gem
-- 改成 RPC 把扣 gem + upsert pick 包在同一個 transaction，餘額不夠就 rollback

CREATE OR REPLACE FUNCTION friend_picks_upsert(
  p_room_code  text,
  p_voter_key  text,
  p_nickname   text,
  p_score_home int,
  p_score_away int,
  p_is_over    boolean
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_room         friend_rooms%ROWTYPE;
  v_balance      int;
  v_already_paid boolean := false;
  v_paid_now     boolean := false;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_room FROM friend_rooms WHERE room_code = p_room_code;
  IF v_room.room_code IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_room.status NOT IN ('open') THEN
    RAISE EXCEPTION 'ROOM_LOCKED' USING ERRCODE = 'P0002';
  END IF;

  -- 押注房 + 登入用戶 → 檢查餘額 + 扣寶石（每 (user,room) 只扣一次，改猜測不重複扣）
  IF v_room.bet_amount > 0 AND v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM gem_transactions
       WHERE user_id = v_user_id
         AND type    = 'friend_room_bet'
         AND ref_id  = p_room_code
    ) INTO v_already_paid;

    IF NOT v_already_paid THEN
      -- 餘額：直接 sum gem_transactions（同 gem_balance view 的邏輯）
      SELECT COALESCE(SUM(amount), 0) INTO v_balance
        FROM gem_transactions WHERE user_id = v_user_id;

      IF v_balance < v_room.bet_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_GEMS:need=%,have=%', v_room.bet_amount, v_balance
          USING ERRCODE = 'P0003';
      END IF;

      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
      VALUES (v_user_id, 'friend_room_bet', -v_room.bet_amount, p_room_code, current_date);
      v_paid_now := true;
    END IF;
  END IF;

  -- Upsert pick（衝突鍵 = room_code + voter_key）
  INSERT INTO friend_picks (room_code, voter_key, user_id, nickname, score_home, score_away, is_over)
    VALUES (p_room_code, p_voter_key, v_user_id, p_nickname, p_score_home, p_score_away, p_is_over)
    ON CONFLICT (room_code, voter_key) DO UPDATE SET
      user_id    = EXCLUDED.user_id,
      nickname   = EXCLUDED.nickname,
      score_home = EXCLUDED.score_home,
      score_away = EXCLUDED.score_away,
      is_over    = EXCLUDED.is_over;

  RETURN json_build_object(
    'success',     true,
    'paid_now',    v_paid_now,
    'already_paid', v_already_paid,
    'bet_amount',  v_room.bet_amount
  );
END $$;

GRANT EXECUTE ON FUNCTION friend_picks_upsert(text, text, text, int, int, boolean) TO anon, authenticated;
