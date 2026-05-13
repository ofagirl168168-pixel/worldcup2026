-- ============================================================
-- 陣型解鎖機制：初始只有 4-3-3、其他陣型靠教練解鎖
-- ============================================================

-- 給每位 SSR 教練綁一個解鎖的陣型
UPDATE coach_pool SET trait_value = trait_value ||
  CASE coach_id
    WHEN 'ssr-coach-guardiola' THEN '{"unlocks_formation":"4-3-3","description":"中場控球時 attack +15% / 解鎖 4-3-3"}'::jsonb
    WHEN 'ssr-coach-klopp'     THEN '{"unlocks_formation":"4-4-2","description":"全隊 stamina 消耗 -20% / 解鎖 4-4-2"}'::jsonb
    WHEN 'ssr-coach-ancelotti' THEN '{"unlocks_formation":"4-4-2","description":"領先後不被翻盤 +30% / 解鎖 4-4-2"}'::jsonb
    WHEN 'ssr-coach-arteta'    THEN '{"unlocks_formation":"4-3-3","description":"訓練 RP 效率 +25% / 解鎖 4-3-3"}'::jsonb
    WHEN 'ssr-coach-simeone'   THEN '{"unlocks_formation":"5-3-2","description":"對手射門 -15% / 解鎖 5-3-2"}'::jsonb
    WHEN 'ssr-coach-mourinho'  THEN '{"unlocks_formation":"5-3-2","description":"老將戰力 +10% / 解鎖 5-3-2"}'::jsonb
    WHEN 'ssr-coach-morioka'   THEN '{"unlocks_formation":"3-5-2","description":"全隊 midfield +8% / 解鎖 3-5-2"}'::jsonb
    WHEN 'ssr-coach-mancini'   THEN '{"unlocks_formation":"3-5-2","description":"全隊 attack +10% / 解鎖 3-5-2"}'::jsonb
    ELSE '{}'::jsonb
  END
WHERE rarity = 'SSR';

-- SR 教練：30% 機率帶陣型解鎖（簡化用 random 但每張固定）
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"4-4-2"}'::jsonb
WHERE coach_id IN ('sr-coach-tact-01','sr-coach-def-01','sr-coach-off-01');
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"5-3-2"}'::jsonb
WHERE coach_id IN ('sr-coach-tact-02','sr-coach-def-02');
UPDATE coach_pool SET trait_value = trait_value || '{"unlocks_formation":"3-5-2"}'::jsonb
WHERE coach_id IN ('sr-coach-off-02','sr-coach-spd-01');
