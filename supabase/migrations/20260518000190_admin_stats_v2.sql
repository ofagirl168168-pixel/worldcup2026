-- ============================================================
-- Admin 儀表板 v2：
--   1. 新建 site_events 表（追蹤 tab 切換 / 文章閱讀 / 分享）
--   2. 擴充 admin_daily_stats：加 new_users / matches 拆 PvP/NPC / trainings 拆 type / events 統計
--   3. 新增 admin_streak_distribution：連續登入天數分布直方圖
-- ============================================================

-- ── 1. site_events 事件表 ──
CREATE TABLE IF NOT EXISTS site_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,                     -- 路人沒登入 → null
  event_type  TEXT NOT NULL,            -- tab_view / article_view / tournament_switch / share
  page        TEXT,                     -- home / arena / schedule / focus / ...
  metadata    JSONB DEFAULT '{}'::jsonb, -- 任意附加（article_id / tournament_id / share_to）
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_events_created ON site_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_events_type ON site_events(event_type, created_at DESC);

ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;

-- 路人/已登入皆可寫；只有 admin RPC 才讀
DROP POLICY IF EXISTS "anyone can insert events" ON site_events;
CREATE POLICY "anyone can insert events" ON site_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "no one can read events" ON site_events;
CREATE POLICY "no one can read events" ON site_events
  FOR SELECT USING (false);


-- ── 2. admin_daily_stats v2：拆 PvP / 訓練 / events / new_users ──
DROP FUNCTION IF EXISTS admin_daily_stats(INT);
CREATE OR REPLACE FUNCTION admin_daily_stats(p_days INT DEFAULT 14)
RETURNS TABLE(
  day              DATE,
  new_users        INT,   -- 當天新註冊
  active_my_team   INT,
  active_arena     INT,
  new_teams        INT,
  gacha_draws      INT,
  coach_draws      INT,
  trainings_normal INT,   -- 廣度訓練（normal / premium）
  trainings_focus  INT,   -- 集訓營（30m / 2h / 8h / 24h / tutorial）
  matches_pve      INT,   -- AI 對戰（ai_npc + ai_real）
  matches_pvp      INT,
  rogue_games      INT,
  arena_votes      INT,
  arena_comments   INT,
  friend_rooms     INT,
  friend_picks     INT,
  event_tab_views  INT,
  event_articles   INT,
  event_shares     INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_admin_emails TEXT[] := ARRAY['ofagirl168168@gmail.com', 'timls61004@gmail.com', 'dick61004@gmail.com'];
  v_tw           TEXT := 'Asia/Taipei';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR NOT (v_email = ANY(v_admin_emails)) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_days < 1 OR p_days > 90 THEN RAISE EXCEPTION 'INVALID_DAYS'; END IF;

  RETURN QUERY
  WITH days AS (
    SELECT ((now() AT TIME ZONE v_tw)::date - i)::date AS day
    FROM generate_series(0, p_days - 1) i
  )
  SELECT
    d.day,
    (SELECT COUNT(*)::INT FROM auth.users u
       WHERE (u.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(DISTINCT tp.team_user_id)::INT FROM team_player tp
       WHERE (tp.obtained_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(DISTINCT ov.voter_key)::INT FROM opinion_votes ov
       WHERE (ov.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM my_team mt
       WHERE (mt.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM team_player tp
       WHERE (tp.obtained_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM user_coach uc
       WHERE (uc.hired_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM training_log tl
       WHERE (tl.created_at AT TIME ZONE v_tw)::date = d.day
         AND tl.training_type IN ('normal','premium','tactical','physical','heart','idea')),
    (SELECT COUNT(*)::INT FROM training_log tl
       WHERE (tl.created_at AT TIME ZONE v_tw)::date = d.day
         AND tl.training_type IN ('tutorial','30m','2h','8h','24h')),
    (SELECT COUNT(*)::INT FROM match_history mh
       WHERE (mh.played_at AT TIME ZONE v_tw)::date = d.day
         AND mh.opponent_type IN ('ai_npc','ai_real')),
    (SELECT COUNT(*)::INT FROM match_history mh
       WHERE (mh.played_at AT TIME ZONE v_tw)::date = d.day
         AND mh.opponent_type = 'pvp'),
    (SELECT COUNT(*)::INT FROM rogue_scores rs
       WHERE (rs.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM opinion_votes ov
       WHERE (ov.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM opinion_comments oc
       WHERE (oc.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM friend_rooms fr
       WHERE (fr.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM friend_picks fp
       WHERE (fp.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM site_events se
       WHERE (se.created_at AT TIME ZONE v_tw)::date = d.day AND se.event_type = 'tab_view'),
    (SELECT COUNT(*)::INT FROM site_events se
       WHERE (se.created_at AT TIME ZONE v_tw)::date = d.day AND se.event_type = 'article_view'),
    (SELECT COUNT(*)::INT FROM site_events se
       WHERE (se.created_at AT TIME ZONE v_tw)::date = d.day AND se.event_type = 'share')
  FROM days d
  ORDER BY d.day DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_daily_stats(INT) TO authenticated;


-- ── 3. admin_top_lists v2：擂台 / 挑戰賽 / 文章 ──
DROP FUNCTION IF EXISTS admin_top_lists(INT, INT);
CREATE OR REPLACE FUNCTION admin_top_lists(p_days INT DEFAULT 7, p_limit INT DEFAULT 5)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_admin_emails TEXT[] := ARRAY['ofagirl168168@gmail.com', 'timls61004@gmail.com', 'dick61004@gmail.com'];
  v_tw           TEXT := 'Asia/Taipei';
  v_since        TIMESTAMPTZ;
  v_arenas       JSONB;
  v_rooms        JSONB;
  v_articles     JSONB;
  v_tabs         JSONB;
  v_tournaments  JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR NOT (v_email = ANY(v_admin_emails)) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  v_since := (now() AT TIME ZONE v_tw)::date - p_days + 1;
  v_since := (v_since::text || ' 00:00')::timestamp AT TIME ZONE v_tw;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('opinion_id', opinion_id, 'votes', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_arenas
  FROM (
    SELECT opinion_id, COUNT(*) AS cnt FROM opinion_votes
    WHERE created_at >= v_since GROUP BY opinion_id ORDER BY cnt DESC LIMIT p_limit
  ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('room_code', room_code, 'picks', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_rooms
  FROM (
    SELECT room_code, COUNT(*) AS cnt FROM friend_picks
    WHERE created_at >= v_since GROUP BY room_code ORDER BY cnt DESC LIMIT p_limit
  ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('article_id', article_id, 'views', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_articles
  FROM (
    SELECT (metadata->>'article_id') AS article_id, COUNT(*) AS cnt
    FROM site_events
    WHERE event_type = 'article_view' AND created_at >= v_since
      AND metadata->>'article_id' IS NOT NULL
    GROUP BY metadata->>'article_id' ORDER BY cnt DESC LIMIT p_limit
  ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('tab', page, 'views', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_tabs
  FROM (
    SELECT page, COUNT(*) AS cnt FROM site_events
    WHERE event_type = 'tab_view' AND created_at >= v_since AND page IS NOT NULL
    GROUP BY page ORDER BY cnt DESC LIMIT p_limit
  ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('tournament', tournament, 'switches', cnt) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_tournaments
  FROM (
    SELECT (metadata->>'to') AS tournament, COUNT(*) AS cnt FROM site_events
    WHERE event_type = 'tournament_switch' AND created_at >= v_since
      AND metadata->>'to' IS NOT NULL
    GROUP BY metadata->>'to' ORDER BY cnt DESC LIMIT p_limit
  ) x;

  RETURN jsonb_build_object(
    'arenas',      v_arenas,
    'rooms',       v_rooms,
    'articles',    v_articles,
    'tabs',        v_tabs,
    'tournaments', v_tournaments
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_top_lists(INT, INT) TO authenticated;


-- ── 4. admin_streak_distribution：連續登入天數分布直方圖 ──
CREATE OR REPLACE FUNCTION admin_streak_distribution()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_admin_emails TEXT[] := ARRAY['ofagirl168168@gmail.com', 'timls61004@gmail.com', 'dick61004@gmail.com'];
  v_result       JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR NOT (v_email = ANY(v_admin_emails)) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  WITH buckets AS (
    SELECT
      CASE
        WHEN streak >= 30 THEN '30+'
        WHEN streak >= 14 THEN '14-29'
        WHEN streak >= 7  THEN '7-13'
        WHEN streak >= 3  THEN '3-6'
        WHEN streak >= 1  THEN '1-2'
        ELSE '0'
      END AS bucket,
      streak
    FROM arena_daily
    WHERE streak IS NOT NULL
  )
  SELECT jsonb_agg(jsonb_build_object('bucket', bucket, 'count', cnt) ORDER BY ord)
    INTO v_result
  FROM (
    SELECT
      bucket,
      COUNT(*)::INT AS cnt,
      CASE bucket
        WHEN '0' THEN 0 WHEN '1-2' THEN 1 WHEN '3-6' THEN 2
        WHEN '7-13' THEN 3 WHEN '14-29' THEN 4 WHEN '30+' THEN 5
      END AS ord
    FROM buckets GROUP BY bucket
  ) x;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_streak_distribution() TO authenticated;
