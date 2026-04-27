-- 麥迪挑戰賽：押寶石結算
-- friend_picks 追加 user_id（押注必須登入才有獎金）
-- friend_rooms 追加 settled_at（避免重複發獎）
-- friend_room_settle() RPC：第一個 caller 鎖房間、發 gem、回贏家分類

ALTER TABLE friend_picks
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS friend_picks_user_idx
  ON friend_picks (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE friend_rooms
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;


-- 結算 RPC：lock + 發 gem + 回贏家分類
-- 邏輯：
--   1. 嘗試 UPDATE settled_at = now()（race-safe：第二個 caller 鎖不到）
--   2. 鎖到的這次：發 gem（exact match 拿 bet_amount，side match 拿 bet_amount/2 向下取整）
--   3. 回每筆 pick 的分類 + 已發 gem 數
CREATE OR REPLACE FUNCTION friend_room_settle(p_room_code text)
RETURNS TABLE (
  voter_key     text,
  user_id       uuid,
  nickname      text,
  score_home    int,
  score_away    int,
  is_over       boolean,
  classification text,
  awarded       int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room          friend_rooms%ROWTYPE;
  v_just_settled  boolean := false;
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
    -- 已被別人 settle / 還沒 ended → 只回讀
    SELECT * INTO v_room FROM friend_rooms WHERE room_code = p_room_code;
    IF v_room.room_code IS NULL THEN
      RAISE EXCEPTION 'Room not found: %', p_room_code;
    END IF;
  END IF;

  -- 只有「這次 settle 成功」+「有押注」+「結果已知」才發 gem
  IF v_just_settled
     AND v_room.bet_amount > 0
     AND v_room.result_home IS NOT NULL
     AND v_room.result_away IS NOT NULL THEN

    -- exact 贏家 → +bet_amount gem
    INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
      SELECT p.user_id, 'friend_room_win_exact', v_room.bet_amount, p_room_code, current_date
        FROM friend_picks p
       WHERE p.room_code = p_room_code
         AND p.user_id IS NOT NULL
         AND p.score_home = v_room.result_home
         AND p.score_away = v_room.result_away;

    -- side 贏家（猜中勝負但比分不對）→ +floor(bet_amount/2) gem，下限 1
    IF v_room.bet_amount >= 2 THEN
      INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
        SELECT p.user_id, 'friend_room_win_side', GREATEST(1, v_room.bet_amount / 2), p_room_code, current_date
          FROM friend_picks p
         WHERE p.room_code = p_room_code
           AND p.user_id IS NOT NULL
           AND ( (p.score_home > p.score_away AND v_room.result_home > v_room.result_away)
              OR (p.score_away > p.score_home AND v_room.result_away > v_room.result_home)
              OR (p.score_home = p.score_away AND v_room.result_home = v_room.result_away) )
           AND NOT (p.score_home = v_room.result_home AND p.score_away = v_room.result_away);
    END IF;
  END IF;

  -- 回所有 picks + 分類 + awarded（從 gem_transactions 讀，subsequent caller 也能看到）
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
