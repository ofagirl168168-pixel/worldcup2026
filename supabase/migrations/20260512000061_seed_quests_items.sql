-- ============================================================
-- 任務模板 + 道具模板 seed
-- ============================================================

DELETE FROM quest_template;
INSERT INTO quest_template (quest_id, quest_type, name, description, action, target_count, reward, display_order) VALUES
  -- ── 每日 ──
  ('d_gacha_1',   'daily', '每日 1 抽',     '今天抽 1 次卡',         'gacha_draw',    1, '{"gems":5}'::jsonb,                1),
  ('d_match_1',   'daily', '上場一次',      '打 1 場比賽',           'match_play',    1, '{"tickets":1}'::jsonb,             2),
  ('d_train_1',   'daily', '訓練 1 名球員', '訓練 1 名球員',         'train',         1, '{"gems":5}'::jsonb,                3),
  ('d_predict_3', 'daily', '預測 3 場比分', '預測站預測 3 場',       'predict_match', 3, '{"tickets":1}'::jsonb,             4),
  ('d_arena_1',   'daily', '擂台投票',      '麥迪擂台投一票',        'arena_vote',    1, '{"gems":10}'::jsonb,               5),
  -- ── 每週 ──
  ('w_gacha_10',  'weekly', '本週 10 抽',    '本週累積抽卡 10 次',    'gacha_draw',   10, '{"tickets":2,"gems":20}'::jsonb,  10),
  ('w_match_5',   'weekly', '本週 5 場',     '本週累積比賽 5 場',     'match_play',    5, '{"tickets":3,"gems":30}'::jsonb,  11),
  ('w_pvp_3',     'weekly', '本週 PvP 3 場', '本週累積 PvP 3 場',     'pvp_play',      3, '{"coach_tickets":1}'::jsonb,      12),
  -- ── 賽季（永久里程碑）──
  ('s_match_50',  'season', '聯賽老將',      '累積 50 場比賽',        'match_play',   50, '{"tickets":10,"gems":100}'::jsonb, 20),
  ('s_gacha_100', 'season', '抽卡大戶',      '累積抽卡 100 次',       'gacha_draw',  100, '{"tickets":10,"coach_tickets":1}'::jsonb, 21);

DELETE FROM item_template;
INSERT INTO item_template (item_id, name, icon, description, effect, effect_value, shop_cost_gems, display_order) VALUES
  -- 立即生效
  ('ticket_x1',     '抽卡券 ×1',     '🎟️', '加 1 張抽卡券',          'ticket',       '{"amount":1}'::jsonb,   80,  1),
  ('ticket_x10',    '抽卡券 ×10',    '🎟️', '加 10 張抽卡券（省 50 寶石）', 'ticket', '{"amount":10}'::jsonb, 750, 2),
  ('coach_ticket',  '教練聘任券',    '👔', '加 1 張教練聘任券',      'coach_ticket', '{"amount":1}'::jsonb,   300, 3),
  ('stamina_pot',   '能量飲料',      '⚡', '回復 1 點體力',           'stamina_pot',  '{"amount":1}'::jsonb,    30, 4),
  -- 進 inventory 等使用
  ('xp_book_s',     '經驗書 (小)',   '📘', '球員 Lv +1',              'xp_book',      '{"amount":1}'::jsonb,    50, 5),
  ('xp_book_l',     '經驗書 (大)',   '📗', '球員 Lv +5',              'xp_book',      '{"amount":5}'::jsonb,   220, 6),
  ('rp_pack',       'RP 補給包',     '🧪', '所有 RP +20',             'rp_pack',      '{"amount":20}'::jsonb,  100, 7),
  ('recovery_kit',  '傷病恢復包',    '💊', '立即解除球員傷病',         'recovery',     '{}'::jsonb,             150, 8);
