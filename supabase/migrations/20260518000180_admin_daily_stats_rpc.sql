-- ============================================================
-- Admin 儀表板 RPC：admin_daily_stats(p_days)
--   只允許白名單 email 呼叫
--   回傳最近 N 天（依台灣時區）每日 11 個指標
-- ============================================================

CREATE OR REPLACE FUNCTION admin_daily_stats(p_days INT DEFAULT 14)
RETURNS TABLE(
  day             DATE,
  active_my_team  INT,
  active_arena    INT,
  new_teams       INT,
  gacha_draws     INT,
  coach_draws     INT,
  trainings       INT,
  matches         INT,
  rogue_games     INT,
  arena_votes     INT,
  arena_comments  INT,
  friend_rooms    INT,
  friend_picks    INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_admin_emails TEXT[] := ARRAY['ofagirl168168@gmail.com'];
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
       WHERE (tl.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM match_history mh
       WHERE (mh.played_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM rogue_scores rs
       WHERE (rs.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM opinion_votes ov
       WHERE (ov.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM opinion_comments oc
       WHERE (oc.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM friend_rooms fr
       WHERE (fr.created_at AT TIME ZONE v_tw)::date = d.day),
    (SELECT COUNT(*)::INT FROM friend_picks fp
       WHERE (fp.created_at AT TIME ZONE v_tw)::date = d.day)
  FROM days d
  ORDER BY d.day DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_daily_stats(INT) TO authenticated;
COMMENT ON FUNCTION admin_daily_stats(INT) IS 'Admin 儀表板每日數據聚合（白名單 email 限定）';


-- 熱門擂台 / 挑戰賽 top N（依日期區間）
CREATE OR REPLACE FUNCTION admin_top_lists(p_days INT DEFAULT 7, p_limit INT DEFAULT 5)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email        TEXT;
  v_admin_emails TEXT[] := ARRAY['ofagirl168168@gmail.com'];
  v_tw           TEXT := 'Asia/Taipei';
  v_since        TIMESTAMPTZ;
  v_arenas       JSONB;
  v_rooms        JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR NOT (v_email = ANY(v_admin_emails)) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;

  v_since := (now() AT TIME ZONE v_tw)::date - p_days + 1;
  v_since := (v_since::text || ' 00:00')::timestamp AT TIME ZONE v_tw;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('opinion_id', x.opinion_id, 'votes', x.cnt) ORDER BY x.cnt DESC), '[]'::jsonb)
    INTO v_arenas
  FROM (
    SELECT opinion_id, COUNT(*) AS cnt
    FROM opinion_votes
    WHERE created_at >= v_since
    GROUP BY opinion_id
    ORDER BY cnt DESC
    LIMIT p_limit
  ) x;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('room_code', x.room_code, 'picks', x.cnt) ORDER BY x.cnt DESC), '[]'::jsonb)
    INTO v_rooms
  FROM (
    SELECT room_code, COUNT(*) AS cnt
    FROM friend_picks
    WHERE created_at >= v_since
    GROUP BY room_code
    ORDER BY cnt DESC
    LIMIT p_limit
  ) x;

  RETURN jsonb_build_object('arenas', v_arenas, 'rooms', v_rooms);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_top_lists(INT, INT) TO authenticated;
