-- 麥迪挑戰賽：沒贏家時 pool 全額退還給已付押注的人（不再蒸發）
-- 為什麼：朋友局如果一場大家都猜錯就全部白付，體驗差。退還比較合理 — 沒贏家
-- 等於所有人輸給比賽，不是輸給彼此 → 各自拿回押注金。
--
-- 改動：friend_room_settle RPC 加 refund branch；awarded 欄位也統計 refund

CREATE OR REPLACE FUNCTION friend_room_settle(p_room_code text)
RETURNS TABLE (
  voter_key      text,
  user_id        uuid,
  nickname       text,
  score_home     int,
  score_away     int,
  is_over        boolean,
  classification text,
  awarded        int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room          friend_rooms%ROWTYPE;
  v_just_settled  boolean := false;
  v_paid_count    int := 0;
  v_pool          int := 0;
  v_exact_count   int := 0;
  v_side_count    int := 0;
  v_per_exact     int := 0;
  v_per_side      int := 0;
BEGIN
  -- 嘗試鎖：成功 → v_just_settled=true，這次負責發獎
  UPDATE friend_rooms
     SET settled_at = now()
   WHERE room_code = p_room_code
     AND settled_at IS NULL
     AND status = 'ended'
     AND result_home IS NOT NULL
  RETURNING * INTO v_room;

  IF FOUND THEN
    v_just_settled := true;
  ELSE
    SELECT * INTO v_room FROM friend_rooms WHERE room_code = p_room_code;
    IF v_room.room_code IS NULL THEN
      RAISE EXCEPTION 'Room not found: %', p_room_code;
    END IF;
  END IF;

  IF v_just_settled
     AND v_room.bet_amount > 0
     AND v_room.result_home IS NOT NULL
     AND v_room.result_away IS NOT NULL THEN

    -- 算池子大小（只算登入用戶；匿名沒 user_id 不算）
    SELECT COUNT(*) INTO v_paid_count
      FROM friend_picks
     WHERE room_code = p_room_code AND user_id IS NOT NULL;
    v_pool := v_paid_count * v_room.bet_amount;

    -- 算贏家數
    SELECT COUNT(*) INTO v_exact_count
      FROM friend_picks
     WHERE room_code = p_room_code
       AND user_id IS NOT NULL
       AND score_home = v_room.result_home
       AND score_away = v_room.result_away;

    SELECT COUNT(*) INTO v_side_count
      FROM friend_picks
     WHERE room_code = p_room_code
       AND user_id IS NOT NULL
       AND ( (score_home > score_away AND v_room.result_home > v_room.result_away)
          OR (score_away > score_home AND v_room.result_away > v_room.result_home)
          OR (score_home = score_away AND v_room.result_home = v_room.result_away) )
       AND NOT (score_home = v_room.result_home AND score_away = v_room.result_away);

    -- 60/40 瓜分（floor 取整）
    IF v_exact_count > 0 AND v_side_count > 0 THEN
      v_per_exact := floor(v_pool * 0.6 / v_exact_count);
      v_per_side  := floor(v_pool * 0.4 / v_side_count);
    ELSIF v_exact_count > 0 THEN
      v_per_exact := floor(v_pool / v_exact_count);
    ELSIF v_side_count > 0 THEN
      v_per_side := floor(v_pool / v_side_count);
    END IF;

    -- 寫 gem_transactions（exact 贏家）
    IF v_per_exact > 0 THEN
      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
        SELECT p.user_id, 'friend_room_win_exact', v_per_exact, p_room_code, current_date
          FROM friend_picks p
         WHERE p.room_code = p_room_code
           AND p.user_id IS NOT NULL
           AND p.score_home = v_room.result_home
           AND p.score_away = v_room.result_away;
    END IF;

    -- 寫 gem_transactions（side 贏家）
    IF v_per_side > 0 THEN
      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
        SELECT p.user_id, 'friend_room_win_side', v_per_side, p_room_code, current_date
          FROM friend_picks p
         WHERE p.room_code = p_room_code
           AND p.user_id IS NOT NULL
           AND ( (p.score_home > p.score_away AND v_room.result_home > v_room.result_away)
              OR (p.score_away > p.score_home AND v_room.result_away > v_room.result_home)
              OR (p.score_home = p.score_away AND v_room.result_home = v_room.result_away) )
           AND NOT (p.score_home = v_room.result_home AND p.score_away = v_room.result_away);
    END IF;

    -- ★ 沒贏家 → 把押注金全額退還給每位已付的用戶
    -- 從 gem_transactions 找已付的（type='friend_room_bet'），退一筆等額正向交易
    IF v_exact_count = 0 AND v_side_count = 0 AND v_paid_count > 0 THEN
      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
        SELECT t.user_id, 'friend_room_refund', v_room.bet_amount, p_room_code, current_date
          FROM gem_transactions t
         WHERE t.ref_id = p_room_code
           AND t.type   = 'friend_room_bet';
    END IF;
  END IF;

  -- 回所有 picks + 分類 + awarded（含 refund）
  RETURN QUERY
    SELECT p.voter_key, p.user_id, p.nickname,
           p.score_home, p.score_away, p.is_over,
           CASE
             WHEN v_room.result_home IS NULL THEN 'pending'
             WHEN p.score_home = v_room.result_home AND p.score_away = v_room.result_away THEN 'exact'
             WHEN (p.score_home > p.score_away AND v_room.result_home > v_room.result_away)
               OR (p.score_away > p.score_home AND v_room.result_away > v_room.result_home)
               OR (p.score_home = p.score_away AND v_room.result_home = v_room.result_away) THEN 'side'
             ELSE 'miss'
           END AS classification,
           COALESCE(
             (SELECT SUM(amount)::int FROM gem_transactions
               WHERE ref_id = p_room_code
                 AND user_id = p.user_id
                 AND type IN ('friend_room_win_exact', 'friend_room_win_side', 'friend_room_refund')
             ),
             0
           ) AS awarded
      FROM friend_picks p
     WHERE p.room_code = p_room_code
     ORDER BY
       CASE
         WHEN v_room.result_home IS NULL THEN 9
         WHEN p.score_home = v_room.result_home AND p.score_away = v_room.result_away THEN 0
         WHEN (p.score_home > p.score_away AND v_room.result_home > v_room.result_away)
           OR (p.score_away > p.score_home AND v_room.result_away > v_room.result_home)
           OR (p.score_home = p.score_away AND v_room.result_home = v_room.result_away) THEN 1
         ELSE 2
       END,
       p.created_at;
END $$;

GRANT EXECUTE ON FUNCTION friend_room_settle(text) TO anon, authenticated;
