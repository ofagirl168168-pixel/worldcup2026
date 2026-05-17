-- ============================================================
-- 任務獎勵差異化：依任務性質配對應素材
--   match_play  → 🧠 戰術
--   train       → 💪 體能
--   predict     → 💡 靈感
--   arena       → ❤️ 鬥志
-- ============================================================

-- 日任務
UPDATE quest_template SET reward = reward || '{"rp_tactical":15}'::jsonb WHERE quest_id = 'd_match_1';
UPDATE quest_template SET reward = reward || '{"rp_physical":10}'::jsonb WHERE quest_id = 'd_train_1';
UPDATE quest_template SET reward = reward || '{"rp_idea":15}'::jsonb     WHERE quest_id = 'd_predict_3';
UPDATE quest_template SET reward = reward || '{"rp_heart":10}'::jsonb    WHERE quest_id = 'd_arena_1';
UPDATE quest_template SET reward = reward || '{"rp_tactical":20}'::jsonb WHERE quest_id = 'd_match_3';

-- d_arena_3 之前被誤加成 rp_physical（連續性質的 auto-update 抓到名字「連發」）
-- 改成 rp_heart 才合理（擂台 → 鬥志）
UPDATE quest_template
SET reward = (reward - 'rp_physical') || '{"rp_heart":15}'::jsonb
WHERE quest_id = 'd_arena_3';

-- 週任務
UPDATE quest_template SET reward = reward || '{"rp_tactical":50}'::jsonb WHERE quest_id = 'w_match_5';
UPDATE quest_template SET reward = reward || '{"rp_physical":30}'::jsonb WHERE quest_id = 'w_pvp_3';

-- 賽季任務
UPDATE quest_template SET reward = reward || '{"rp_tactical":200}'::jsonb WHERE quest_id = 's_match_50';
