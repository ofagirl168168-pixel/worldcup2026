-- ============================================================
-- 我的球隊 — LPC look_data 整合
-- 1. 加 look_data JSONB 欄到 player_card_pool（SSR 固定臉）/ team_player（SR/R 抽到的隨機臉）
-- 2. 30 SSR 真實球員形象 seed（依 js/lpc-ssr-looks.js）
-- 重跑：node scripts/build-ssr-looks-migration.js
-- ============================================================

ALTER TABLE player_card_pool
  ADD COLUMN IF NOT EXISTS look_data JSONB;

ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS look_data JSONB;

-- ── 30 SSR 真實球員形象 ──
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"shorthawk","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-mufeimui-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"blue","hair_style":"long","hair_color":"blonde","beard_style":"none","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-halandeng-01';
UPDATE player_card_pool SET look_data = '{"body":"brown","eye_color":"brown","hair_style":"mop","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-vini-01';
UPDATE player_card_pool SET look_data = '{"body":"amber","eye_color":"brown","hair_style":"curly_long","hair_color":"black","beard_style":"medium","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-salaba-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"brown","hair_style":"plain","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-belling-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"bangslong","hair_color":"blonde","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-meihsi-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"spiked","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-luonadou-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"blue","hair_style":"long_messy","hair_color":"blonde","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"blonde","wrinkles":"on"}'::jsonb WHERE card_id = 'ssr-modeli-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"blue","hair_style":"messy1","hair_color":"ginger","beard_style":"none","mustache_style":"none","beard_color":"ginger","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-debulong-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"brown","hair_style":"plain","hair_color":"blonde","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-luodeli-01';
UPDATE player_card_pool SET look_data = '{"body":"brown","eye_color":"brown","hair_style":"flat_top_fade","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-chuamning-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"balding","hair_color":"blonde","beard_style":"basic","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-weiladi-01';
UPDATE player_card_pool SET look_data = '{"body":"amber","eye_color":"brown","hair_style":"curly_long","hair_color":"black","beard_style":"medium","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-kasaimi-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"plain","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-peideli-01';
UPDATE player_card_pool SET look_data = '{"body":"amber","eye_color":"brown","hair_style":"high_and_tight","hair_color":"black","beard_style":"medium","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-fantaike-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"green","hair_style":"plain","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-lubendiya-01';
UPDATE player_card_pool SET look_data = '{"body":"brown","eye_color":"brown","hair_style":"pixie","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-salihba-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"plain","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-makuino-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"plain","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-haqimi-01';
UPDATE player_card_pool SET look_data = '{"body":"brown","eye_color":"brown","hair_style":"pixie","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-daiweisi-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"messy1","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-yamaer-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"brown","hair_style":"plain","hair_color":"blonde","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-alisong-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"blue","hair_style":"plain","hair_color":"blonde","beard_style":"basic","mustache_style":"none","beard_color":"blonde","wrinkles":"on"}'::jsonb WHERE card_id = 'ssr-nuoyier-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"brown","hair_style":"plain","hair_color":"blonde","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-kutuwa-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"long","hair_color":"black","beard_style":"trimmed","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-dangna-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"plain","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-laya-01';
UPDATE player_card_pool SET look_data = '{"body":"olive","eye_color":"brown","hair_style":"spiked","hair_color":"blonde","beard_style":"trimmed","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-neima-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"blue","hair_style":"plain","hair_color":"blonde","beard_style":"trimmed","mustache_style":"none","beard_color":"blonde","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-kaiyin-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"brown","hair_style":"plain","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-santo-01';
UPDATE player_card_pool SET look_data = '{"body":"light","eye_color":"brown","hair_style":"bangs","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black","wrinkles":"none"}'::jsonb WHERE card_id = 'ssr-jiubao-01';

-- ── 完成 ──
