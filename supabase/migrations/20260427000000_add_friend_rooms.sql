-- 麥迪挑戰賽：朋友直播房 schema
-- 三張表：rooms（房間） / picks（猜比分） / messages（聊天）
-- 同步機制：所有 client 用 friend_rooms.seed 跑同一場 deterministic sim

CREATE TABLE IF NOT EXISTS friend_rooms (
  room_code         text PRIMARY KEY,                          -- 'MADDY-7K2X' 顯示用 ID
  host_voter_key    text NOT NULL,
  host_nickname     text,
  match_ref         text NOT NULL,                             -- 例：'ucl-2026-04-30-arsenal-atletico'
  match_meta        jsonb NOT NULL DEFAULT '{}'::jsonb,        -- 兩隊代碼/名稱/真實開球時間/聯賽
  seed              text NOT NULL,                             -- mulberry32 seed（通常等同 room_code）
  is_official       boolean NOT NULL DEFAULT false,            -- 系統自動建的官方房
  is_public         boolean NOT NULL DEFAULT true,             -- false = 私人房（列表看得到、需邀請連結進入）
  bet_amount        int    NOT NULL DEFAULT 0 CHECK (bet_amount >= 0 AND bet_amount <= 3),
  lock_at           timestamptz NOT NULL,                      -- 報名截止
  kickoff_at        timestamptz NOT NULL,                      -- 同步開賽
  status            text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','locked','live','ended','cancelled')),
  result_home       int,                                       -- ended 後寫入
  result_away       int,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS friend_rooms_lobby_idx
  ON friend_rooms (status, kickoff_at);
CREATE INDEX IF NOT EXISTS friend_rooms_official_idx
  ON friend_rooms (is_official, kickoff_at) WHERE is_official = true;

ALTER TABLE friend_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read all" ON friend_rooms;
CREATE POLICY "anon read all"
  ON friend_rooms FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon insert" ON friend_rooms;
CREATE POLICY "anon insert"
  ON friend_rooms FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "host update" ON friend_rooms;
CREATE POLICY "host update"
  ON friend_rooms FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
-- 註：UPDATE 對所有人開放是為了讓 status/result 由 client 寫入；
-- 後續若要嚴格化可改用 SECURITY DEFINER RPC。MVP 先信任 client。


CREATE TABLE IF NOT EXISTS friend_picks (
  room_code      text NOT NULL REFERENCES friend_rooms(room_code) ON DELETE CASCADE,
  voter_key      text NOT NULL,
  nickname       text,
  score_home     int  NOT NULL CHECK (score_home >= 0 AND score_home <= 99),
  score_away     int  NOT NULL CHECK (score_away >= 0 AND score_away <= 99),
  is_over        boolean NOT NULL DEFAULT false,               -- 押 ">4" 客製比分時 true
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, voter_key)
);

CREATE INDEX IF NOT EXISTS friend_picks_room_idx
  ON friend_picks (room_code);

ALTER TABLE friend_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read all" ON friend_picks;
CREATE POLICY "anon read all"
  ON friend_picks FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon insert" ON friend_picks;
CREATE POLICY "anon insert"
  ON friend_picks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS friend_room_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code    text NOT NULL REFERENCES friend_rooms(room_code) ON DELETE CASCADE,
  voter_key    text NOT NULL,
  nickname     text,
  content      text NOT NULL CHECK (length(content) BETWEEN 1 AND 200),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS friend_room_messages_room_idx
  ON friend_room_messages (room_code, created_at DESC);

ALTER TABLE friend_room_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read all" ON friend_room_messages;
CREATE POLICY "anon read all"
  ON friend_room_messages FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon insert" ON friend_room_messages;
CREATE POLICY "anon insert"
  ON friend_room_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);


-- 大廳列表 RPC：拿開放中/已鎖定/直播中的房 + 各自人數
-- 一次給前端，避免 N+1
CREATE OR REPLACE FUNCTION friend_rooms_lobby()
RETURNS TABLE (
  room_code     text,
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
  SELECT r.room_code, r.host_nickname, r.match_ref, r.match_meta,
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


-- realtime：picks 與 messages 變動廣播給房裡所有 client（聊天/即時人數）
ALTER PUBLICATION supabase_realtime ADD TABLE friend_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_rooms;
