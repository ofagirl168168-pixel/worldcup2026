-- 修：上一版 friend_rooms_mark_stale_ended 漏掉 'open' 狀態
-- 沒人加入的官方房永遠卡 open（從沒升到 locked/live），所以 open 也要視為可能的 stale 來源

CREATE OR REPLACE FUNCTION friend_rooms_mark_stale_ended()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marked int := 0;
BEGIN
  WITH updated AS (
    UPDATE friend_rooms
       SET status = 'ended'
     WHERE status IN ('open','locked','live')
       AND kickoff_at < (now() - interval '1 hour')
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_marked FROM updated;
  RETURN json_build_object('marked_ended', v_marked);
END $$;
GRANT EXECUTE ON FUNCTION friend_rooms_mark_stale_ended() TO anon, authenticated;
