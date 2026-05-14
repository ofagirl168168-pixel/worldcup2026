-- ============================================================
-- 隊長系統：my_team 加 captain_player_id 欄位
-- 比賽 banner 的主角 sprite 用隊長 look_data，不再自動挑 SSR/SR
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS captain_player_id UUID REFERENCES team_player(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_my_team_captain ON my_team(captain_player_id);

-- ── 設定隊長 RPC ──
CREATE OR REPLACE FUNCTION set_captain(p_player_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_player team_player%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  -- 確認球員存在且屬於這個 user
  IF p_player_id IS NOT NULL THEN
    SELECT * INTO v_player FROM team_player
    WHERE id = p_player_id AND team_user_id = v_uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  END IF;

  UPDATE my_team SET captain_player_id = p_player_id, updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('captain_player_id', p_player_id);
END;
$$;

GRANT EXECUTE ON FUNCTION set_captain(UUID) TO authenticated;
