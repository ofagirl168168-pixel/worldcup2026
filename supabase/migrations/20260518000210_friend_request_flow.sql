-- ============================================================
-- 好友改為「申請 → 同意 / 拒絕」流程
--   user_friend 加 status 欄位（pending / accepted）
--   舊資料一律設 accepted、補對稱 reverse row（避免單向不平衡）
--   新 RPC：send_friend_request / respond_friend_request
-- ============================================================

-- ── 1. user_friend 加 status 欄位 ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_friend' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_friend ADD COLUMN status TEXT;
    UPDATE user_friend SET status = 'accepted' WHERE status IS NULL;
    ALTER TABLE user_friend ALTER COLUMN status SET NOT NULL;
    ALTER TABLE user_friend ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE user_friend ADD CONSTRAINT user_friend_status_chk
      CHECK (status IN ('pending', 'accepted'));
  END IF;
END $$;

-- 補對稱 reverse row（舊版只存單向、要讓兩邊都看得到對方）
INSERT INTO user_friend (user_id, friend_id, status, added_at)
SELECT friend_id, user_id, 'accepted', added_at
FROM user_friend
WHERE status = 'accepted'
ON CONFLICT (user_id, friend_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_friend_status ON user_friend(status);
CREATE INDEX IF NOT EXISTS idx_user_friend_friend ON user_friend(friend_id);

-- ── 2. 改 RLS：可讀「我送出的」+「我收到的」 ──
DROP POLICY IF EXISTS "user reads own friends" ON user_friend;
CREATE POLICY "user reads own friends" ON user_friend FOR SELECT
  USING (auth.uid() IN (user_id, friend_id));

-- ── 3. RPC：送出好友邀請 ──
CREATE OR REPLACE FUNCTION send_friend_request(p_target UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_reverse_status TEXT;
  v_own_status TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF v_uid = p_target THEN RETURN 'self'; END IF;

  -- 自己已送過或已是好友？
  SELECT status INTO v_own_status FROM user_friend
    WHERE user_id = v_uid AND friend_id = p_target;
  IF FOUND THEN
    IF v_own_status = 'accepted' THEN RETURN 'already_friend'; END IF;
    IF v_own_status = 'pending' THEN RETURN 'already_pending'; END IF;
  END IF;

  -- 對方已送 pending 給我 → 直接互相 accept
  SELECT status INTO v_reverse_status FROM user_friend
    WHERE user_id = p_target AND friend_id = v_uid;
  IF FOUND AND v_reverse_status = 'pending' THEN
    UPDATE user_friend SET status = 'accepted'
      WHERE user_id = p_target AND friend_id = v_uid;
    INSERT INTO user_friend (user_id, friend_id, status)
      VALUES (v_uid, p_target, 'accepted')
      ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';
    RETURN 'auto_accepted';
  END IF;

  -- 全新邀請
  INSERT INTO user_friend (user_id, friend_id, status)
    VALUES (v_uid, p_target, 'pending');
  RETURN 'sent';
END;
$$;

GRANT EXECUTE ON FUNCTION send_friend_request(UUID) TO authenticated;

-- ── 4. RPC：回應好友邀請（同意 / 拒絕）──
CREATE OR REPLACE FUNCTION respond_friend_request(p_from UUID, p_accept BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_friend
    WHERE user_id = p_from AND friend_id = v_uid AND status = 'pending'
  ) THEN
    RETURN 'not_found';
  END IF;

  IF p_accept THEN
    UPDATE user_friend SET status = 'accepted'
      WHERE user_id = p_from AND friend_id = v_uid;
    -- 建立 reverse row 讓我也看得到他
    INSERT INTO user_friend (user_id, friend_id, status)
      VALUES (v_uid, p_from, 'accepted')
      ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';
    RETURN 'accepted';
  ELSE
    -- 拒絕 → 刪掉對方的 pending row（不留紀錄）
    DELETE FROM user_friend
      WHERE user_id = p_from AND friend_id = v_uid AND status = 'pending';
    RETURN 'rejected';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION respond_friend_request(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION send_friend_request(UUID)         IS '送好友邀請；回 sent / auto_accepted / already_pending / already_friend / self';
COMMENT ON FUNCTION respond_friend_request(UUID, BOOLEAN) IS '回應好友邀請；p_accept=true 同意 / false 拒絕；回 accepted / rejected / not_found';
