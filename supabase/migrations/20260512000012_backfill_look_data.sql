-- ============================================================
-- 我的球隊 — 回填舊球員的 look_data
--   舊抽到的卡（在加 look_data 前抽的）team_player.look_data 是 NULL
--   1. SSR：靠 join player_card_pool.look_data 用，team_player 留 NULL 即可（renderer 會 fallback）
--      但為了 cache 命中率 & 一致性，直接把 SSR 的 look_data 同步寫到 team_player
--   2. SR/R：用 generate_random_look() 補
-- ============================================================

-- SSR：從卡池複製
UPDATE team_player tp
SET look_data = pcp.look_data
FROM player_card_pool pcp
WHERE tp.card_id = pcp.card_id
  AND tp.look_data IS NULL
  AND pcp.rarity = 'SSR'
  AND pcp.look_data IS NOT NULL;

-- SR/R：每筆生一個隨機 look
UPDATE team_player tp
SET look_data = generate_random_look()
FROM player_card_pool pcp
WHERE tp.card_id = pcp.card_id
  AND tp.look_data IS NULL
  AND pcp.rarity IN ('SR', 'R');

-- 統計回報
DO $$
DECLARE
  v_null INT;
  v_total INT;
BEGIN
  SELECT count(*) INTO v_null FROM team_player WHERE look_data IS NULL;
  SELECT count(*) INTO v_total FROM team_player;
  RAISE NOTICE 'Backfill done: % / % team_player still NULL', v_null, v_total;
END $$;
