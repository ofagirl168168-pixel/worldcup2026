-- ============================================================
-- 屬性能力值上限公式改為每 5 等一區間、全部 +5、尾數固定 4/9
--   舊：Lv 1-9=99, 10-14=105(+6), 15-19=110, ... 50=145
--   新：Lv 1-5=99, 6-10=104, 11-15=109, ..., 46-50=144
-- ============================================================

CREATE OR REPLACE FUNCTION attr_hard_ceiling_for_level(p_level INT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  -- 99 + floor((lv-1)/5)*5、Lv 1-5=99 / Lv 6-10=104 / ... / Lv 46-50=144
  SELECT 99 + (LEAST(50, GREATEST(1, COALESCE(p_level, 1))) - 1) / 5 * 5;
$$;

COMMENT ON FUNCTION attr_hard_ceiling_for_level(INT) IS
  '屬性 cap：每 5 Lv 一區間、+5、尾數 4/9。1-5=99 / 6-10=104 / ... / 46-50=144';
