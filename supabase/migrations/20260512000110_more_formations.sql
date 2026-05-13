-- ============================================================
-- 擴增陣型：4-3-3, 4-4-2, 3-5-2, 5-3-2 → 8 種陣型
-- 加 4-2-3-1, 3-4-3, 4-5-1, 4-1-4-1
-- 重分配 SSR 教練各自帶一個獨特陣型
-- ============================================================

UPDATE coach_pool SET trait_value = trait_value ||
  CASE coach_id
    WHEN 'ssr-coach-guardiola' THEN '{"unlocks_formation":"4-3-3","description":"中場控球時 attack +15% / 解鎖 4-3-3"}'::jsonb
    WHEN 'ssr-coach-klopp'     THEN '{"unlocks_formation":"4-4-2","description":"全隊 stamina 消耗 -20% / 解鎖 4-4-2"}'::jsonb
    WHEN 'ssr-coach-ancelotti' THEN '{"unlocks_formation":"4-2-3-1","description":"領先後不被翻盤 +30% / 解鎖 4-2-3-1"}'::jsonb
    WHEN 'ssr-coach-arteta'    THEN '{"unlocks_formation":"3-4-3","description":"訓練 RP 效率 +25% / 解鎖 3-4-3"}'::jsonb
    WHEN 'ssr-coach-simeone'   THEN '{"unlocks_formation":"5-3-2","description":"對手射門 -15% / 解鎖 5-3-2"}'::jsonb
    WHEN 'ssr-coach-mourinho'  THEN '{"unlocks_formation":"4-5-1","description":"老將戰力 +10% / 解鎖 4-5-1"}'::jsonb
    WHEN 'ssr-coach-morioka'   THEN '{"unlocks_formation":"3-5-2","description":"全隊 midfield +8% / 解鎖 3-5-2"}'::jsonb
    WHEN 'ssr-coach-mancini'   THEN '{"unlocks_formation":"4-1-4-1","description":"全隊 attack +10% / 解鎖 4-1-4-1"}'::jsonb
    ELSE trait_value
  END
WHERE rarity = 'SSR';

-- SR 教練：散一些常見陣型（每個 trait 配一個）
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"4-4-2"}'::jsonb
WHERE coach_id = 'sr-coach-tact-01';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"4-2-3-1"}'::jsonb
WHERE coach_id = 'sr-coach-tact-02';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"5-3-2"}'::jsonb
WHERE coach_id = 'sr-coach-def-01';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"4-5-1"}'::jsonb
WHERE coach_id = 'sr-coach-def-02';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"3-4-3"}'::jsonb
WHERE coach_id = 'sr-coach-off-01';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"3-5-2"}'::jsonb
WHERE coach_id = 'sr-coach-off-02';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"4-1-4-1"}'::jsonb
WHERE coach_id = 'sr-coach-spd-01';
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"4-4-2"}'::jsonb
WHERE coach_id = 'sr-coach-spd-02';
