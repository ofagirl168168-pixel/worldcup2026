-- ============================================================
-- 助教系統：1 主教練 + 2 助教（同時 active）
--   主教練 buff 100%、助教 buff 各 50%
--   3 個都 active 時、依特質組合觸發羈絆效果（synergy）
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS assist_coach_id_1 UUID REFERENCES user_coach(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assist_coach_id_2 UUID REFERENCES user_coach(id) ON DELETE SET NULL;

-- 指派教練到指定角色（同時自動把該教練從別的 slot 移除、避免一人佔兩位）
CREATE OR REPLACE FUNCTION assign_coach_role(
  p_user_coach_id UUID,
  p_role TEXT  -- 'head' | 'assist1' | 'assist2' | 'unassign'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_team my_team%ROWTYPE;
  v_uc   user_coach%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_role NOT IN ('head','assist1','assist2','unassign') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  -- unassign：把該教練從所有 slot 移除
  IF p_role = 'unassign' THEN
    UPDATE my_team SET
      active_coach_id   = CASE WHEN active_coach_id   = p_user_coach_id THEN NULL ELSE active_coach_id END,
      assist_coach_id_1 = CASE WHEN assist_coach_id_1 = p_user_coach_id THEN NULL ELSE assist_coach_id_1 END,
      assist_coach_id_2 = CASE WHEN assist_coach_id_2 = p_user_coach_id THEN NULL ELSE assist_coach_id_2 END,
      updated_at = now()
    WHERE user_id = v_uid;
    RETURN jsonb_build_object('role', 'unassign', 'user_coach_id', p_user_coach_id);
  END IF;

  -- 確認 user_coach 存在且屬於該玩家
  IF p_user_coach_id IS NULL THEN RAISE EXCEPTION 'INVALID_COACH'; END IF;
  SELECT * INTO v_uc FROM user_coach WHERE id = p_user_coach_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_NOT_OWNED'; END IF;

  -- 先把該教練從別的 slot 清掉（避免一人佔兩位）
  UPDATE my_team SET
    active_coach_id   = CASE WHEN active_coach_id   = p_user_coach_id THEN NULL ELSE active_coach_id END,
    assist_coach_id_1 = CASE WHEN assist_coach_id_1 = p_user_coach_id THEN NULL ELSE assist_coach_id_1 END,
    assist_coach_id_2 = CASE WHEN assist_coach_id_2 = p_user_coach_id THEN NULL ELSE assist_coach_id_2 END
  WHERE user_id = v_uid;

  -- 再指派到目標 slot
  IF p_role = 'head' THEN
    UPDATE my_team SET active_coach_id = p_user_coach_id, updated_at = now() WHERE user_id = v_uid;
  ELSIF p_role = 'assist1' THEN
    UPDATE my_team SET assist_coach_id_1 = p_user_coach_id, updated_at = now() WHERE user_id = v_uid;
  ELSIF p_role = 'assist2' THEN
    UPDATE my_team SET assist_coach_id_2 = p_user_coach_id, updated_at = now() WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object('role', p_role, 'user_coach_id', p_user_coach_id);
END;
$$;

GRANT EXECUTE ON FUNCTION assign_coach_role(UUID, TEXT) TO authenticated;
