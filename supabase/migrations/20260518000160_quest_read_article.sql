-- ============================================================
-- 任務新增：看文章（💡 靈感主源、跟 _maybeAwardArticleIdea 的 15 秒判定共用）
-- 日任務：看 1 篇 → +5 寶石 + 10 靈感
-- 週任務：本週看 5 篇 → +1 抽券 + 20 寶石 + 40 靈感
-- ============================================================

INSERT INTO quest_template
  (quest_id, quest_type, name, description, action, target_count, reward, display_order)
VALUES
  ('d_article_1', 'daily',  '看 1 篇文章', '今天看完 1 篇文章（停留 15 秒以上）',
   'read_article', 1, '{"gems":5,"rp_idea":10}'::jsonb, 6),
  ('w_article_5', 'weekly', '本週 5 篇文章', '本週看 5 篇文章',
   'read_article', 5, '{"tickets":1,"gems":20,"rp_idea":40}'::jsonb, 13)
ON CONFLICT (quest_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  action = EXCLUDED.action,
  target_count = EXCLUDED.target_count,
  reward = EXCLUDED.reward,
  display_order = EXCLUDED.display_order;
