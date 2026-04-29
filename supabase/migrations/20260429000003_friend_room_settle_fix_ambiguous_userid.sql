-- 修 friend_room_settle 的 ambiguous user_id bug
-- 之前 (20260429000001): 內 SELECT 寫 `user_id = p.user_id` 沒加表別名，
-- PostgreSQL 解不出是 gem_transactions.user_id 還是 RETURN TABLE 輸出欄位的 user_id
-- → RPC 完全失敗（"column reference user_id is ambiguous"）
-- → 沒人領得到寶石，前端 fallback 路徑讓使用者看起來像「未登入」
-- 修：所有 inner reference 都用 gt. 別名

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

    SELECT COUNT(*) INTO v_paid_count
      FROM friend_picks p
     WHERE p.room_code = p_room_code AND p.user_id IS NOT NULL;
    v_pool := v_paid_count * v_room.bet_amount;

    SELECT COUNT(*) INTO v_exact_count
      FROM friend_picks p
     WHERE p.room_code = p_room_code
       AND p.user_id IS NOT NULL
       AND p.score_home = v_room.result_home
       AND p.score_away = v_room.result_away;

    SELECT COUNT(*) INTO v_side_count
      FROM friend_picks p
     WHERE p.room_code = p_room_code
       AND p.user_id IS NOT NULL
       AND ( (p.score_home > p.score_away AND v_room.result_home > v_room.result_away)
          OR (p.score_away > p.score_home AND v_room.result_away > v_room.result_home)
          OR (p.score_home = p.score_away AND v_room.result_home = v_room.result_away) )
       AND NOT (p.score_home = v_room.result_home AND p.score_away = v_room.result_away);

    IF v_exact_count > 0 AND v_side_count > 0 THEN
      v_per_exact := floor(v_pool * 0.6 / v_exact_count);
      v_per_side  := floor(v_pool * 0.4 / v_side_count);
    ELSIF v_exact_count > 0 THEN
      v_per_exact := floor(v_pool / v_exact_count);
    ELSIF v_side_count > 0 THEN
      v_per_side := floor(v_pool / v_side_count);
    END IF;

    IF v_per_exact > 0 THEN
      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
        SELECT p.user_id, 'friend_room_win_exact', v_per_exact, p_room_code, current_date
          FROM friend_picks p
         WHERE p.room_code = p_room_code
           AND p.user_id IS NOT NULL
           AND p.score_home = v_room.result_home
           AND p.score_away = v_room.result_away;
    END IF;

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

    -- 沒贏家 → 全額退還
    IF v_exact_count = 0 AND v_side_count = 0 AND v_paid_count > 0 THEN
      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
        SELECT t.user_id, 'friend_room_refund', v_room.bet_amount, p_room_code, current_date
          FROM gem_transactions t
         WHERE t.ref_id = p_room_code
           AND t.type   = 'friend_room_bet';
    END IF;
  END IF;

  -- 用 gt. 表別名避免跟 RETURN TABLE 的 user_id 欄位衝突
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
             (SELECT SUM(gt.amount)::int FROM gem_transactions gt
               WHERE gt.ref_id = p_room_code
                 AND gt.user_id = p.user_id
                 AND gt.type IN ('friend_room_win_exact', 'friend_room_win_side', 'friend_room_refund')
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
