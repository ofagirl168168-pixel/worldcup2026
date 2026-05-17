-- ============================================================
-- 任務新增：射門挑戰 + 麥迪挑戰賽
-- 並把「上場一次」名稱改清楚 → 「打 1 場比賽」
-- ============================================================

-- 1. 改 d_match_1 名稱（「上場一次」太抽象）
UPDATE quest_template
SET name = '打 1 場比賽',
    description = '今天打 1 場比賽（聯賽 / PvP 都算）'
WHERE quest_id = 'd_match_1';

-- 2. 新增射門挑戰任務（💡 靈感主源）
INSERT INTO quest_template
  (quest_id, quest_type, name, description, action, target_count, reward, display_order)
VALUES
  ('d_rogue_1',  'daily',  '射門挑戰 1 場', '玩 1 場射門挑戰（前進世界盃）',
   'rogue_play', 1, '{"gems":5,"rp_idea":10}'::jsonb, 8),
  ('w_rogue_3',  'weekly', '射門訓練週',     '本週玩 3 場射門挑戰',
   'rogue_play', 3, '{"gems":20,"rp_idea":40}'::jsonb, 14)
ON CONFLICT (quest_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  target_count = EXCLUDED.target_count,
  reward = EXCLUDED.reward,
  display_order = EXCLUDED.display_order;

-- 3. 新增麥迪挑戰賽任務（❤️ 鬥志主源）
INSERT INTO quest_template
  (quest_id, quest_type, name, description, action, target_count, reward, display_order)
VALUES
  ('d_friend_1', 'daily',  '麥迪挑戰賽 1 場', '今天參加 1 場麥迪挑戰賽',
   'friend_room_play', 1, '{"tickets":1,"rp_heart":10}'::jsonb, 9),
  ('w_friend_2', 'weekly', '挑戰賽戰友',     '本週參加 2 場麥迪挑戰賽',
   'friend_room_play', 2, '{"tickets":2,"rp_heart":30}'::jsonb, 15)
ON CONFLICT (quest_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  target_count = EXCLUDED.target_count,
  reward = EXCLUDED.reward,
  display_order = EXCLUDED.display_order;
