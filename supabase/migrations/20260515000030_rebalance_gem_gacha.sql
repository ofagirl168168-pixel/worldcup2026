-- ============================================================
-- 寶石抽卡價格大幅調降（跟外面解鎖分析等同等級的小消費）
-- 球員：50/450 → 5/45（10 連省 5）
-- 教練：200/1800 → 20/180（10 連省 20）
-- ============================================================

-- 球員寶石抽
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

  v_gem_cost := CASE p_count WHEN 1 THEN 5 ELSE 45 END;

  SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_gem_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_GEMS';
  END IF;

  UPDATE my_team SET tickets = tickets + p_count WHERE user_id = v_uid;
  v_result := gacha_draw(p_count);

  UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;

  RETURN v_result || jsonb_build_object(
    'paid_with', 'gems',
    'gems_spent', v_gem_cost
  );
END $$;

-- 教練寶石抽
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

  v_gem_cost := CASE p_count WHEN 1 THEN 20 ELSE 180 END;

  SELECT gems INTO v_balance FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_gem_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_GEMS';
  END IF;

  UPDATE my_team SET coach_tickets = coach_tickets + p_count WHERE user_id = v_uid;
  v_result := coach_gacha_draw(p_count, 'gem');

  UPDATE profiles SET gems = gems - v_gem_cost WHERE id = v_uid;

  RETURN v_result || jsonb_build_object(
    'paid_with', 'gems',
    'gems_spent', v_gem_cost
  );
END $$;
