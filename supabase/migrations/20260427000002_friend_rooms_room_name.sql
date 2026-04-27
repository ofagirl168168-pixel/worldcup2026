-- 麥迪挑戰賽：房名欄位 + 大廳 RPC 補回 room_name

ALTER TABLE friend_rooms
  ADD COLUMN IF NOT EXISTS room_name text CHECK (length(room_name) <= 30);

-- 重新建立 lobby RPC（多回 room_name 欄位）
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
   ORDER BY r.is_official DESC, r.kickoff_at ASC;
$$;

GRANT EXECUTE ON FUNCTION friend_rooms_lobby() TO anon, authenticated;
