-- ============================================================
-- 屬性能力值上限：每 5 等突破一次、milestone 在 Lv 5/10/15/.../50
--   Lv 1-4:  99（起始）
--   Lv 5-9:  104
--   Lv 10-14: 109
--   Lv 15-19: 114
--   Lv 20-24: 119
--   Lv 25-29: 124
--   Lv 30-34: 129
--   Lv 35-39: 134
--   Lv 40-44: 139
--   Lv 45-49: 144
--   Lv 50:    149（滿級）
-- 公式：99 + floor(clamp(lv,1,50) / 5) * 5
-- ============================================================

CREATE OR REPLACE FUNCTION attr_hard_ceiling_for_level(p_level INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 99 + (LEAST(50, GREATEST(1, COALESCE(p_level, 1)))) / 5 * 5;
$$;

COMMENT ON FUNCTION attr_hard_ceiling_for_level(INT) IS
  '屬性 cap milestone 在 Lv 5/10/15/.../50：Lv 1-4=99 / 5-9=104 / ... / 50=149';
