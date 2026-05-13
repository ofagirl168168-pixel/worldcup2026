-- ============================================================
-- 體力時間恢復：每 15 分鐘 +1 體力（上限 stamina_max）
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS stamina_recover_at TIMESTAMPTZ DEFAULT now();

-- ── RPC：fetch 時呼叫、自動補上應有的體力 ──
CREATE OR REPLACE FUNCTION recover_stamina_if_due()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_team   my_team%ROWTYPE;
  v_elapsed INT;
  v_recover_per_sec NUMERIC := 1.0 / 900.0;  -- 15 分鐘 = 900 秒一點
  v_recovers INT;
  v_now    TIMESTAMPTZ := now();
BEGIN
  IF v_uid IS NULL THEN RETURN '{"recovered":0}'::jsonb; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN '{"recovered":0}'::jsonb; END IF;

  -- 已滿 → 把時間設成 now 避免之後一次補大量
  IF v_team.stamina >= v_team.stamina_max THEN
    UPDATE my_team SET stamina_recover_at = v_now WHERE user_id = v_uid;
    RETURN jsonb_build_object('recovered', 0, 'stamina', v_team.stamina);
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (v_now - COALESCE(v_team.stamina_recover_at, v_now)))::int;
  v_recovers := FLOOR(v_elapsed / 900);  -- 每 900 秒（15 分）一點

  IF v_recovers > 0 THEN
    UPDATE my_team
    SET stamina = LEAST(stamina_max, stamina + v_recovers),
        stamina_recover_at = stamina_recover_at + (v_recovers * 900 || ' seconds')::interval
    WHERE user_id = v_uid
    RETURNING stamina INTO v_team.stamina;
  END IF;

  RETURN jsonb_build_object('recovered', v_recovers, 'stamina', v_team.stamina);
END;
$$;

GRANT EXECUTE ON FUNCTION recover_stamina_if_due() TO authenticated;
