-- ============================================================
-- 給 30 SSR 球星 + 8 SSR 教練的 look_data 加眉毛（match hair_color）
-- 用 jsonb || 合併，不會動到既有欄位
-- ============================================================

-- 球員 SSR：加 thick 眉毛（除了光頭的之外，看起來比較自然）
UPDATE player_card_pool
SET look_data = look_data || jsonb_build_object(
  'eyebrow_style', 'thick',
  'eyebrow_color', look_data->>'hair_color'
)
WHERE rarity = 'SSR' AND look_data IS NOT NULL
  AND NOT (look_data ? 'eyebrow_style');

-- 教練 SSR：8 位全加 thick 眉毛
UPDATE coach_pool
SET look_data = look_data || jsonb_build_object(
  'eyebrow_style', 'thick',
  'eyebrow_color', COALESCE(look_data->>'hair_color', 'black')
)
WHERE rarity = 'SSR' AND look_data IS NOT NULL
  AND NOT (look_data ? 'eyebrow_style');

-- 一併把舊 team_player.look_data 也補（雖然舊資料現有看起來不會 break、但補了一致）
UPDATE team_player
SET look_data = look_data || jsonb_build_object(
  'eyebrow_style', CASE WHEN random() < 0.6 THEN 'thick' ELSE 'none' END,
  'eyebrow_color', COALESCE(look_data->>'hair_color', 'black'),
  'headband_color', 'none'
)
WHERE look_data IS NOT NULL
  AND NOT (look_data ? 'eyebrow_style');
