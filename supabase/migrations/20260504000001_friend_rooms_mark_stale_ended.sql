-- 大廳 stale rooms 處理（取代 4h 一刀切）：
--   1. lobby filter 從 kickoff > now-4h 放寬到 now-24h（保留 1 天歷史紀錄可看）
--   2. 新 RPC friend_rooms_mark_stale_ended：把 kickoff < now-1h 還卡 live/locked 的房
--      強制設 status=ended（result 仍 null，代表沒人觀戰跑完 sim）
--   3. GHA cron 每 5 分鐘呼叫此 RPC，配合既有 settle sweep 把整個生命週期推完整

-- ─────────────── lobby filter 放寬到 24h ───────────────
DROP FUNCTION IF EXISTS friend_rooms_lobby();
CREATE OR REPLACE FUNCTION friend_rooms_lobby()
RETURNS TABLE (
  room_code     text,
  room_name     text,
  host_nickname text,
  match_ref     text,
  match_meta    jsonb,
  is_official   boolean,
  is_public     boolean,
  bet_amount    int,
  result_home   int,
  result_away   int,
  lock_at       timestamptz,
  kickoff_at    timestamptz,
  status        text,
  pick_count    bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.room_code, r.room_name, r.host_nickname, r.match_ref, r.match_meta,
         r.is_official, r.is_public, r.bet_amount,
         r.result_home, r.result_away,
         r.lock_at, r.kickoff_at, r.status,
         COALESCE(p.cnt, 0) AS pick_count
    FROM friend_rooms r
    LEFT JOIN (
      SELECT room_code, COUNT(*)::bigint AS cnt
        FROM friend_picks
       GROUP BY room_code
    ) p ON p.room_code = r.room_code
   WHERE r.status IN ('open','locked','live','ended')
     AND (r.host_picked OR r.is_official)
     AND r.kickoff_at > (now() - interval '24 hours')   -- 1 天視窗：足夠看「剛結束」
   ORDER BY r.is_official DESC, r.kickoff_at ASC;
$$;
GRANT EXECUTE ON FUNCTION friend_rooms_lobby() TO anon, authenticated;

-- ─────────────── 把 kickoff > 1h 還卡 live/locked 的房強制標 ended ───────────────
CREATE OR REPLACE FUNCTION friend_rooms_mark_stale_ended()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_marked int := 0;
BEGIN
  -- 包含 'open'：沒人加入的官方房永遠卡 open，沒升 locked/live；超過 1h 也算 stale
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
