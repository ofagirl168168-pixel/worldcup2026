-- 麥迪擂台投票真實化
-- 每個裝置（voter_key = localStorage 穩定隨機碼）對同一題只能投一次
-- 任何人可讀取 (匿名聚合) 及新增；不開放 UPDATE/DELETE

CREATE TABLE IF NOT EXISTS opinion_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opinion_id  text NOT NULL,
  side        int  NOT NULL CHECK (side BETWEEN 0 AND 3),
  voter_key   text NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opinion_id, voter_key)
);

CREATE INDEX IF NOT EXISTS opinion_votes_by_opinion_idx
  ON opinion_votes (opinion_id);

ALTER TABLE opinion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read all" ON opinion_votes;
CREATE POLICY "anon read all"
  ON opinion_votes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "anon insert" ON opinion_votes;
CREATE POLICY "anon insert"
  ON opinion_votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 聚合 RPC：一次拿到某題的各選項票數 + 總票
CREATE OR REPLACE FUNCTION opinion_vote_tally(oid text)
RETURNS TABLE (side int, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT side, COUNT(*)::bigint AS votes
    FROM opinion_votes
   WHERE opinion_id = oid
   GROUP BY side;
$$;

GRANT EXECUTE ON FUNCTION opinion_vote_tally(text) TO anon, authenticated;

-- realtime：INSERT 廣播給正在看該題的所有客戶端
ALTER PUBLICATION supabase_realtime ADD TABLE opinion_votes;
