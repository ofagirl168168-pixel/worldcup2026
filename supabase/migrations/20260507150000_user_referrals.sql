-- 推薦系統：voter_key 互推、雙方各拿 +5 寶石
-- 由前端 JS 在「被邀請者完成第一個擂台投票」時呼叫 claim_referral RPC

CREATE TABLE IF NOT EXISTS user_referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_key    text NOT NULL,                  -- 邀請者 voter_key
  referee_key     text NOT NULL UNIQUE,           -- 被邀請者 voter_key（一人只能被推薦一次）
  awarded_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_key <> referee_key)             -- 不能自己推自己
);

CREATE INDEX IF NOT EXISTS user_referrals_referrer_idx
  ON user_referrals (referrer_key);

ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
-- 不開放任何 SELECT/INSERT/UPDATE 給 anon — 只能透過 RPC

-- 註冊推薦關係（被邀請者第一次擂台投票時呼叫）
-- 回傳：'ok' 雙方都拿到 +5 寶石；'self' 自我推薦不算；'duplicate' 已被推薦過（仍 ok 不報錯但不重複給）
CREATE OR REPLACE FUNCTION claim_referral(referrer text, referee text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing user_referrals%ROWTYPE;
BEGIN
  IF referrer IS NULL OR referee IS NULL OR referrer = '' OR referee = '' THEN
    RETURN 'invalid';
  END IF;
  IF referrer = referee THEN
    RETURN 'self';
  END IF;
  -- 檢查是否已存在
  SELECT * INTO v_existing FROM user_referrals WHERE referee_key = referee LIMIT 1;
  IF FOUND THEN
    RETURN 'duplicate';
  END IF;
  -- 寫入推薦紀錄（雙方獎勵由 client 端用既有 awardGem 機制處理）
  INSERT INTO user_referrals (referrer_key, referee_key) VALUES (referrer, referee);
  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION claim_referral(text, text) TO anon, authenticated;

-- 查詢某 voter_key 推薦了幾個人（給「我邀請了 N 人」徽章用）
CREATE OR REPLACE FUNCTION get_referral_count(vkey text)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM user_referrals WHERE referrer_key = vkey;
$$;

GRANT EXECUTE ON FUNCTION get_referral_count(text) TO anon, authenticated;
