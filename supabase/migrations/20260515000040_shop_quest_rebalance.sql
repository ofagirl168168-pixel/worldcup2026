-- ============================================================
-- 商店價格 + 任務獎勵 平衡
-- 抽卡降到 5 寶石/抽後、shop ticket 也要對齊（不然沒人買）
-- ============================================================

-- 商店票券價格大降（對齊 gem-gacha：5g/抽、20g/教練）
UPDATE item_template SET shop_cost_gems = 8   WHERE item_id = 'ticket_x1';
UPDATE item_template SET shop_cost_gems = 60  WHERE item_id = 'ticket_x10';
UPDATE item_template SET shop_cost_gems = 25  WHERE item_id = 'coach_ticket';
-- 其他道具也同步調整
UPDATE item_template SET shop_cost_gems = 15  WHERE item_id = 'stamina_pot';
UPDATE item_template SET shop_cost_gems = 20  WHERE item_id = 'xp_book_s';
UPDATE item_template SET shop_cost_gems = 80  WHERE item_id = 'xp_book_l';
UPDATE item_template SET shop_cost_gems = 30  WHERE item_id = 'rp_pack';
UPDATE item_template SET shop_cost_gems = 40  WHERE item_id = 'recovery_kit';

-- 新增日常任務：3 場比賽 → 1 教練券（讓教練券更容易取得）
INSERT INTO quest_template (quest_id, quest_type, name, description, action, target_count, reward, display_order) VALUES
  ('d_match_3', 'daily', '今日 3 場', '今天打 3 場比賽', 'match_play', 3, '{"coach_tickets":1}'::jsonb, 6),
  ('d_arena_3', 'daily', '擂台連發', '今天擂台投 3 題', 'arena_vote', 3, '{"coach_tickets":1}'::jsonb, 7)
ON CONFLICT (quest_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  target_count = EXCLUDED.target_count,
  reward = EXCLUDED.reward,
  display_order = EXCLUDED.display_order;

-- 把現有獎勵提高：賽季成就也多送教練券
UPDATE quest_template SET reward = '{"tickets":10,"gems":50,"coach_tickets":3}'::jsonb
  WHERE quest_id = 's_match_50';
