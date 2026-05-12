-- ============================================================
-- 新人初始 RP（讓新建隊伍能立刻訓練、不用先打比賽）
-- ============================================================

ALTER TABLE my_team
  ALTER COLUMN rp_tactical SET DEFAULT 30,
  ALTER COLUMN rp_physical SET DEFAULT 30,
  ALTER COLUMN rp_heart    SET DEFAULT 10,
  ALTER COLUMN rp_idea     SET DEFAULT 10;

-- 既有用戶若 RP 為 0 也補上（讓他們也能訓練）
UPDATE my_team
SET rp_tactical = GREATEST(rp_tactical, 30),
    rp_physical = GREATEST(rp_physical, 30),
    rp_heart    = GREATEST(rp_heart, 10),
    rp_idea     = GREATEST(rp_idea, 10)
WHERE rp_tactical < 30 OR rp_physical < 30;
