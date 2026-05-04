-- 大廳濾掉 kickoff 已過 4 小時的房（stale 進行中房）
-- 為什麼：之前 status IN ('open','locked','live') 沒有時間過濾，
-- 沒人觀戰跑完 sim 的房會永遠卡在 live 狀態 → 大廳塞一堆「2 天前比賽還顯示進行中」
-- 4 小時 buffer 涵蓋：sim 跑完 (~90s) + 偶爾的延遲，正常使用不會被誤切

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
         r.lock_at, r.kickoff_at, r.status,
         COALESCE(p.cnt, 0) AS pick_count
    FROM friend_rooms r
    LEFT JOIN (
      SELECT room_code, COUNT(*)::bigint AS cnt
        FROM friend_picks
       GROUP BY room_code
    ) p ON p.room_code = r.room_code
   WHERE r.status IN ('open','locked','live')
     AND (r.host_picked OR r.is_official)        -- 房主沒投以前不上大廳（官方房豁免）
     AND r.kickoff_at > (now() - interval '4 hours')  -- kickoff 4h 前的房算 stale，不顯示
   ORDER BY r.is_official DESC, r.kickoff_at ASC;
$$;

GRANT EXECUTE ON FUNCTION friend_rooms_lobby() TO anon, authenticated;
