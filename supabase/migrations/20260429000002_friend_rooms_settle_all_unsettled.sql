-- 麥迪挑戰賽：自動結算 sweep
-- 為什麼：原本 friend_room_settle 必須有人進房看完結果頁才會觸發，
-- 如果一場大家都沒回來看，gem 永遠不會發。
-- 這個 RPC 一次掃所有 status='ended' AND result_home IS NOT NULL AND settled_at IS NULL 的房，
-- 對每個 call friend_room_settle（內部已 race-safe lock，重複 call 不會重發）。
-- GitHub Actions cron 跟其他自動化定時呼叫即可。

CREATE OR REPLACE FUNCTION friend_rooms_settle_all_unsettled()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_settled int := 0;
BEGIN
  FOR r IN
    SELECT room_code FROM friend_rooms
     WHERE status = 'ended'
       AND result_home IS NOT NULL
       AND settled_at IS NULL
     ORDER BY kickoff_at
     LIMIT 200   -- 一次最多掃 200 場避免長時間鎖
  LOOP
    PERFORM friend_room_settle(r.room_code);
    v_settled := v_settled + 1;
  END LOOP;
  RETURN json_build_object('settled', v_settled);
END $$;

GRANT EXECUTE ON FUNCTION friend_rooms_settle_all_unsettled() TO anon, authenticated;
