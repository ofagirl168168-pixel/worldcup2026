-- ============================================================
-- 新手教學第二步：教學熱身賽
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS tutorial_match_done BOOLEAN NOT NULL DEFAULT false;
