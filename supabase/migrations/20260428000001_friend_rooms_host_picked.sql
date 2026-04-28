-- 麥迪挑戰賽：房主是否已投比分
-- 流程改造：建房 → 房主先投自己的比分 → 才開放給其他人加入 + 分享連結
-- 沒投以前大廳列表不顯示這房（其他人看不到），房主自己依然能進入

ALTER TABLE friend_rooms
  ADD COLUMN IF NOT EXISTS host_picked boolean NOT NULL DEFAULT false;

-- 既有的房 backfill：以前的全部視為已 picked，避免它們從大廳消失
UPDATE friend_rooms SET host_picked = true WHERE host_picked = false;

-- 大廳 RPC 加 host_picked 過濾
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
     AND (r.host_picked OR r.is_official)   -- 房主沒投以前不上大廳（官方房一律顯示）
   ORDER BY r.is_official DESC, r.kickoff_at ASC;
$$;

GRANT EXECUTE ON FUNCTION friend_rooms_lobby() TO anon, authenticated;
