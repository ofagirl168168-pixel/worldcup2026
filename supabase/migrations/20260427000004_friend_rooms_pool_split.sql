-- 麥迪挑戰賽：結算改成「瓜分池」機制
-- 之前是固定金額（exact +bet_amount、side +max(1, bet/2)），太簡化失去原本設計
-- 現在改回原始 60/40 瓜分：
--   pool = pick_count × bet_amount  （每人下注額 × 參與人數，理論池子）
--   exact 贏家平分 60%、side 贏家平分 40%
--   沒 exact → side 拿 100%；沒 side → exact 拿 100%；都沒 → pool 蒸發
--   floor 取整，可能讓人多時 side 拿 0（接受，「猜中勝負是安慰獎」）
--   只算 user_id IS NOT NULL（登入用戶才會發 gem）

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

    -- 算池子大小（只算登入用戶；匿名沒 user_id 不能領 gem，也不該佔池子）
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

    -- 60/40 瓜分（floor 取整；都沒贏家 pool 蒸發）
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
  END IF;

  -- 回所有 picks + 分類 + awarded（從 gem_transactions 讀，後續 caller 也能看到）
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
             (SELECT amount FROM gem_transactions
               WHERE ref_id = p_room_code
                 AND user_id = p.user_id
                 AND type IN ('friend_room_win_exact', 'friend_room_win_side')
               LIMIT 1),
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
