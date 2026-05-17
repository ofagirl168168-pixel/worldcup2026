-- ============================================================
-- PvP 找對手改成回 3 名供玩家選擇
--   1. 先抽 ±200 積分內隨機 3 個
--   2. 不足 3 個 → 從外圈找最接近積分的補滿（排除已選 + 自己）
-- 既有的 find_pvp_opponent（單一對手）保留向後相容
-- ============================================================

CREATE OR REPLACE FUNCTION find_pvp_opponents(p_count INT DEFAULT 3)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_team    my_team%ROWTYPE;
  v_today   DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_oids    UUID[] := ARRAY[]::UUID[];
  v_extra   UUID[];
  v_need    INT;
  v_result  JSONB := '[]'::jsonb;
  v_oid     UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count < 1 OR p_count > 10 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.stamina < 1 THEN RAISE EXCEPTION 'INSUFFICIENT_STAMINA'; END IF;

  -- 每日重置 PvP 次數
  IF v_team.pvp_last_reset_date IS DISTINCT FROM v_today THEN
    UPDATE my_team SET pvp_today_count = 0, pvp_last_reset_date = v_today WHERE user_id = v_uid;
    v_team.pvp_today_count := 0;
  END IF;
  IF v_team.pvp_today_count >= 5 THEN RAISE EXCEPTION 'PVP_DAILY_LIMIT_REACHED'; END IF;

  -- ── 步驟 1：積分 ±200 內隨機抽 p_count 個 ──
  SELECT COALESCE(array_agg(user_id), ARRAY[]::UUID[]) INTO v_oids
  FROM (
    SELECT t.user_id
    FROM my_team t
    WHERE t.user_id <> v_uid
      AND t.is_pvp_visible = true
      AND t.pvp_elo BETWEEN v_team.pvp_elo - 200 AND v_team.pvp_elo + 200
      AND (SELECT count(*) FROM team_player tp WHERE tp.team_user_id = t.user_id) >= 11
    ORDER BY random()
    LIMIT p_count
  ) sub;

  -- ── 步驟 2：不足 p_count → 從外圈找最接近的補滿 ──
  v_need := p_count - COALESCE(array_length(v_oids, 1), 0);
  IF v_need > 0 THEN
    SELECT COALESCE(array_agg(user_id ORDER BY abs(pvp_elo - v_team.pvp_elo)), ARRAY[]::UUID[]) INTO v_extra
    FROM (
      SELECT t.user_id, t.pvp_elo
      FROM my_team t
      WHERE t.user_id <> v_uid
        AND t.is_pvp_visible = true
        AND NOT (t.user_id = ANY(v_oids))
        AND (SELECT count(*) FROM team_player tp WHERE tp.team_user_id = t.user_id) >= 11
      ORDER BY abs(t.pvp_elo - v_team.pvp_elo)
      LIMIT v_need
    ) outer_sub;
    v_oids := array_cat(v_oids, v_extra);
  END IF;

  IF COALESCE(array_length(v_oids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'NO_PVP_OPPONENT';
  END IF;

  -- ── 把每個 user_id 轉成完整 snapshot（用既有 helper）──
  FOREACH v_oid IN ARRAY v_oids LOOP
    v_result := v_result || jsonb_build_array(get_pvp_team_snapshot(v_oid));
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION find_pvp_opponents(INT) TO authenticated;
COMMENT ON FUNCTION find_pvp_opponents(INT) IS 'PvP 配對：回 N 個對手 snapshot（±200 積分內隨機、不足從最接近補）';
