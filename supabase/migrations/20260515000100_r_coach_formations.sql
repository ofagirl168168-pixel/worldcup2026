-- ============================================================
-- R 教練也配上「適合陣型」（基本 3 種 — 4-3-3 / 4-4-2 / 4-2-3-1）
-- 不解鎖（這些初始已有）、只是顯示專長
-- ============================================================

UPDATE coach_pool SET trait_value = trait_value || '{"preferred_formation":"4-3-3"}'::jsonb
WHERE coach_id IN ('r-coach-atk-01','r-coach-atk-02','r-coach-spd-01');

UPDATE coach_pool SET trait_value = trait_value || '{"preferred_formation":"4-4-2"}'::jsonb
WHERE coach_id IN ('r-coach-def-01','r-coach-def-02','r-coach-mid-01','r-coach-sta-01');

UPDATE coach_pool SET trait_value = trait_value || '{"preferred_formation":"4-2-3-1"}'::jsonb
WHERE coach_id IN ('r-coach-mid-02','r-coach-spd-02','r-coach-sta-02','r-coach-aur-01','r-coach-aur-02');
