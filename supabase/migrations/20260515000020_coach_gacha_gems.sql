-- ============================================================
-- 教練寶石抽：1 抽 200 寶石、10 連 1800（比買 ticket 300 × 10 = 3000 便宜很多）
-- ============================================================

CREATE OR REPLACE FUNCTION coach_gacha_draw_with_gems(p_count int)
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

  -- 1 抽 200、10 連 1800（10 連省 200 寶石）
  v_gem_cost := CASE p_count WHEN 1 THEN 200 ELSE 1800 END;

  SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_gem_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_GEMS';
  END IF;

  -- 暫補 coach_tickets、呼叫既有 coach_gacha_draw（會扣 ticket）
  UPDATE my_team SET coach_tickets = coach_tickets + p_count WHERE user_id = v_uid;
  v_result := coach_gacha_draw(p_count, 'gem');

  -- 扣寶石（gacha 成功後才扣、失敗會 rollback）
  UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;

  RETURN v_result || jsonb_build_object(
    'paid_with', 'gems',
    'gems_spent', v_gem_cost
  );
END $$;

GRANT EXECUTE ON FUNCTION coach_gacha_draw_with_gems(int) TO authenticated;
