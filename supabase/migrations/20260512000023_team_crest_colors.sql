-- ============================================================
-- 球隊隊徽顏色客製化欄位
-- team_crest 既有欄改用 crest_id（如 'shield_stripes'）；舊 emoji 值 fallback 為 'football'
-- crest_primary / crest_accent 是 hex 色
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS crest_primary TEXT NOT NULL DEFAULT '#c0392b',
  ADD COLUMN IF NOT EXISTS crest_accent  TEXT NOT NULL DEFAULT '#f1c40f';

-- 舊 emoji 值 → 預設 'football' crest（避免破畫面）
UPDATE my_team SET team_crest = 'football'
WHERE team_crest IS NULL
   OR length(team_crest) <= 4
   OR team_crest LIKE '⚽%';
