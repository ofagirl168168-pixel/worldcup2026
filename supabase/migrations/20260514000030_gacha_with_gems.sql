-- ============================================================
-- 寶石抽卡 RPC：直接用寶石抽卡（不經過買 ticket 那步）
-- 定價：1 抽 50 寶石、10 連 = 450 寶石（比買 ticket 80×10=800 便宜）
-- ============================================================

CREATE OR REPLACE FUNCTION gacha_draw_with_gems(p_count int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_gem_cost  int;
  v_balance   int;
  v_result    jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count NOT IN (1, 10) THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  -- 1 抽 50、10 連 450（10 連省 50 寶石）
  v_gem_cost := CASE p_count WHEN 1 THEN 50 ELSE 450 END;

  SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_gem_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_GEMS';
  END IF;

  -- 先暫補 ticket，呼叫既有 gacha_draw（會自己扣 ticket）
  UPDATE my_team SET tickets = tickets + p_count WHERE user_id = v_uid;
  v_result := gacha_draw(p_count);

  -- 扣寶石（在 gacha_draw 成功後才扣，失敗會由 transaction rollback）
  UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;

  -- 在結果裡標明用了寶石（前端可顯示「寶石抽卡 -50」）
  RETURN v_result || jsonb_build_object(
    'paid_with', 'gems',
    'gems_spent', v_gem_cost
  );
END $$;

GRANT EXECUTE ON FUNCTION gacha_draw_with_gems(int) TO authenticated;
