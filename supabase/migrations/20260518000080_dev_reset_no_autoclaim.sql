-- ============================================================
-- 修：dev_reset_starter_pack 不自動 re-claim
-- 改讓 client 走完整 onboarding flow（_showStarterPackIntro 動畫）
-- ============================================================

CREATE OR REPLACE FUNCTION dev_reset_starter_pack()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team my_team%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;

  DELETE FROM team_player WHERE team_user_id = v_uid;

  UPDATE my_team
  SET starter_pack_claimed = false,
      tutorial_first_training_used = false,
      tutorial_match_done = false,
      updated_at = now()
  WHERE user_id = v_uid;

  -- 不自動 re-claim、回傳成功讓 client 自己重開 modal 觸發新手指引
  RETURN jsonb_build_object('reset', true);
END $$;

GRANT EXECUTE ON FUNCTION dev_reset_starter_pack() TO authenticated;
