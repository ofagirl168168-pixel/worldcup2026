-- 分享解鎖比賽預測 RPC
-- 流程：使用者點「分享解鎖」按鈕 → navigator.share() resolve → call this RPC
-- 限制（B 方案）：
--   1. 同一場比賽一輩子只能 share-unlock 一次
--   2. 同一天最多 share-unlock 5 場（防止狂洗）
-- 紀錄走 gem_transactions(type='share_unlock', amount=0, ref_id=match_id)
-- → fetchUnlockedMatches 把 share_unlock 也算進已解鎖

CREATE OR REPLACE FUNCTION friend_share_unlock(p_match_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id           uuid;
  v_today             date := current_date;
  v_already_unlocked  boolean;
  v_today_count       int;
  DAILY_LIMIT         constant int := 5;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  -- 已用過該 match 的免費分享解鎖？(包含付費解鎖也視為已解鎖)
  SELECT EXISTS(
    SELECT 1 FROM gem_transactions
     WHERE user_id = v_user_id
       AND ref_id  = p_match_id
       AND type IN ('share_unlock','unlock_match','unlock_knockout','first_free')
  ) INTO v_already_unlocked;

  IF v_already_unlocked THEN
    RETURN json_build_object('success', true, 'already_unlocked', true);
  END IF;

  -- 今日 share_unlock 用了幾次？
  SELECT COUNT(*) INTO v_today_count
    FROM gem_transactions
   WHERE user_id = v_user_id
     AND type    = 'share_unlock'
     AND date    = v_today;

  IF v_today_count >= DAILY_LIMIT THEN
    RAISE EXCEPTION 'DAILY_LIMIT:limit=%,used=%', DAILY_LIMIT, v_today_count
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO gem_transactions (user_id, type, amount, ref_id, date)
  VALUES (v_user_id, 'share_unlock', 0, p_match_id, v_today);

  RETURN json_build_object(
    'success', true,
    'remaining_today', DAILY_LIMIT - v_today_count - 1
  );
END $$;

GRANT EXECUTE ON FUNCTION friend_share_unlock(text) TO authenticated;
