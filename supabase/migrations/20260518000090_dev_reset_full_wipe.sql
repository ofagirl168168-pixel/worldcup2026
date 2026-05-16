-- ============================================================
-- dev_reset_starter_pack：完全清空、模擬「連隊都沒建過」的新用戶
-- 包含：my_team、team_player、user_coach、league_progress、match_history、training_log
-- ============================================================

CREATE OR REPLACE FUNCTION dev_reset_starter_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  -- 砍球員 instance
  DELETE FROM team_player WHERE team_user_id = v_uid;
  -- 砍訓練紀錄
  DELETE FROM training_log WHERE team_user_id = v_uid;
  -- 砍比賽歷史
  DELETE FROM match_history WHERE user_id = v_uid;
  -- 砍聯賽進度
  DELETE FROM league_progress WHERE user_id = v_uid;
  -- 砍教練（user_coach）
  BEGIN
    DELETE FROM user_coach WHERE user_id = v_uid;
  EXCEPTION WHEN OTHERS THEN
    -- user_coach 可能 column 名不同 / 表不存在、不影響主流程
    NULL;
  END;
  -- 最後砍 my_team 本身 → 還原成「連隊都沒建過」
  DELETE FROM my_team WHERE user_id = v_uid;

  RETURN jsonb_build_object('reset', true, 'wiped', 'all');
END $$;

GRANT EXECUTE ON FUNCTION dev_reset_starter_pack() TO authenticated;
COMMENT ON FUNCTION dev_reset_starter_pack() IS '開發測試：徹底清空使用者所有 my-team 資料、模擬連隊都沒建過的新人';
