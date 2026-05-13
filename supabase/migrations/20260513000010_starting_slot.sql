-- ============================================================
-- 先發球員固定 slot：避免每次換人/重抓資料時位置亂跳
-- starting_slot 0..10 對應 _formationPositions[i] 的位置索引
-- ============================================================

ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS starting_slot smallint;

-- Backfill：現有先發球員依 id 順序給 0..10
WITH ranked AS (
  SELECT id,
         (ROW_NUMBER() OVER (PARTITION BY team_user_id ORDER BY id) - 1)::smallint AS slot
  FROM team_player
  WHERE in_starting_11 = true
)
UPDATE team_player tp
SET starting_slot = r.slot
FROM ranked r
WHERE tp.id = r.id AND tp.starting_slot IS NULL;

-- 板凳球員：starting_slot 必為 NULL
UPDATE team_player SET starting_slot = NULL WHERE in_starting_11 = false;

-- 保護：先發必有 slot、板凳必無
ALTER TABLE team_player
  DROP CONSTRAINT IF EXISTS team_player_slot_consistency;
ALTER TABLE team_player
  ADD CONSTRAINT team_player_slot_consistency
  CHECK (
    (in_starting_11 = true  AND starting_slot IS NOT NULL AND starting_slot BETWEEN 0 AND 10) OR
    (in_starting_11 = false AND starting_slot IS NULL)
  );

-- 每隊同一 slot 只能一人
CREATE UNIQUE INDEX IF NOT EXISTS team_player_slot_unique
  ON team_player (team_user_id, starting_slot)
  WHERE starting_slot IS NOT NULL;

-- 替換 RPC：原子操作（避免 unique 衝突 → 先騰位再下板凳→上場）
CREATE OR REPLACE FUNCTION swap_starter_with_bench(
  p_starter_id uuid,
  p_bench_id   uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_slot smallint;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  -- 取出 starter 的 slot
  SELECT starting_slot INTO v_slot
  FROM team_player
  WHERE id = p_starter_id AND team_user_id = v_uid AND in_starting_11 = true;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'STARTER_NOT_FOUND'; END IF;

  -- 確認 bench 屬於同隊且目前在板凳
  PERFORM 1 FROM team_player
  WHERE id = p_bench_id AND team_user_id = v_uid AND in_starting_11 = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'BENCH_NOT_FOUND'; END IF;

  -- 先下 starter（slot 設 NULL）以騰開 unique index
  UPDATE team_player
  SET in_starting_11 = false, starting_slot = NULL
  WHERE id = p_starter_id;

  -- 再上 bench 到該 slot
  UPDATE team_player
  SET in_starting_11 = true, starting_slot = v_slot
  WHERE id = p_bench_id;
END $$;

GRANT EXECUTE ON FUNCTION swap_starter_with_bench(uuid, uuid) TO authenticated;

-- 把直接上場（沒滿 11 人時）也包成 RPC，自動找最小空 slot
CREATE OR REPLACE FUNCTION promote_to_starter(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_slot smallint;
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  PERFORM 1 FROM team_player
  WHERE id = p_player_id AND team_user_id = v_uid AND in_starting_11 = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND_OR_ALREADY_STARTING'; END IF;

  SELECT COUNT(*) INTO v_count
  FROM team_player WHERE team_user_id = v_uid AND in_starting_11 = true;
  IF v_count >= 11 THEN RAISE EXCEPTION 'STARTERS_FULL'; END IF;

  -- 找最小空 slot
  SELECT s INTO v_slot
  FROM generate_series(0, 10) s
  WHERE NOT EXISTS (
    SELECT 1 FROM team_player
    WHERE team_user_id = v_uid AND starting_slot = s
  )
  ORDER BY s LIMIT 1;

  UPDATE team_player
  SET in_starting_11 = true, starting_slot = v_slot
  WHERE id = p_player_id;
END $$;

GRANT EXECUTE ON FUNCTION promote_to_starter(uuid) TO authenticated;

-- 下板凳 RPC（從個人資料按下場時用）
CREATE OR REPLACE FUNCTION demote_to_bench(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  UPDATE team_player
  SET in_starting_11 = false, starting_slot = NULL
  WHERE id = p_player_id AND team_user_id = v_uid AND in_starting_11 = true;
END $$;

GRANT EXECUTE ON FUNCTION demote_to_bench(uuid) TO authenticated;
