-- ============================================================
-- 我的球隊 — Kit (球衣 / 球褲 / 球鞋) 顏色自訂
-- 比賽時球員身上的 LPC 衣著、portrait 暫不套用（卡片是個人造型）
-- ============================================================

ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS kit_shirt_color TEXT NOT NULL DEFAULT 'red',
  ADD COLUMN IF NOT EXISTS kit_pants_color TEXT NOT NULL DEFAULT 'white',
  ADD COLUMN IF NOT EXISTS kit_shoes_color TEXT NOT NULL DEFAULT 'white',
  -- 客場色（之後對 Real Team boss 戰用、avoid 撞色）
  ADD COLUMN IF NOT EXISTS away_shirt_color TEXT NOT NULL DEFAULT 'white',
  ADD COLUMN IF NOT EXISTS away_pants_color TEXT NOT NULL DEFAULT 'black';

COMMENT ON COLUMN my_team.kit_shirt_color IS 'LPC shirt color name: red/blue/black/white/green/yellow/teal/purple/orange';
COMMENT ON COLUMN my_team.kit_pants_color IS 'LPC pants color name: red/blue/black/white/green/yellow/teal/purple/orange/brown/tan';
COMMENT ON COLUMN my_team.kit_shoes_color IS 'LPC shoes color name: black/brown/white/red/blue/yellow/green or "none"';
