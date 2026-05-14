-- ============================================================
-- 個人狂熱量表跨場次保存：team_player 加 fever_gauge 欄位
-- 球員下場時 gauge 不歸 0、下次比賽繼續累積（除非觸發狂熱）
-- ============================================================

ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS fever_gauge NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (fever_gauge >= 0 AND fever_gauge <= 100);

-- 更新 fever_gauge 的 RPC（比賽結束時批次更新）
CREATE OR REPLACE FUNCTION update_fever_gauges(p_gauges JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_card_id TEXT;
  v_value NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  -- p_gauges 格式：{ "card_id_1": 23.5, "card_id_2": 78.0, ... }
  FOR v_card_id, v_value IN SELECT key, (value::text)::numeric FROM jsonb_each(p_gauges) LOOP
    UPDATE team_player
    SET fever_gauge = GREATEST(0, LEAST(100, v_value))
    WHERE team_user_id = v_uid AND card_id = v_card_id;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_fever_gauges(JSONB) TO authenticated;
