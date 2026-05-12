-- ============================================================
-- 教練池 seed（30 教練：8 SSR + 12 SR + 12 R）
-- 由 scripts/build-coach-seed.js 自動產生、重跑：node scripts/build-coach-seed.js
-- ============================================================

DELETE FROM coach_pool WHERE coach_id LIKE 'ssr-coach-%' OR coach_id LIKE 'sr-coach-%' OR coach_id LIKE 'r-coach-%';

INSERT INTO coach_pool (coach_id, rarity, name, nickname, trait, trait_value, inspiration, look_data) VALUES
  ('ssr-coach-guardiola', 'SSR', '瓜帝', '戰術大師', 'tiki_taka', '{"description":"中場控球時 attack +15%"}'::jsonb, 'Guardiola', '{"body":"olive","eye_color":"brown","wrinkles":"on","hair_style":"bald","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black"}'::jsonb),
  ('ssr-coach-klopp', 'SSR', '克羅普', '熱情澎湃', 'gegen_press', '{"description":"全隊 stamina 消耗 -20%"}'::jsonb, 'Klopp', '{"body":"light","eye_color":"blue","wrinkles":"on","hair_style":"balding","hair_color":"blonde","beard_style":"medium","mustache_style":"none","beard_color":"blonde"}'::jsonb),
  ('ssr-coach-ancelotti', 'SSR', '安察', '老謀深算', 'champion_mentality', '{"description":"領先後不被翻盤機率 +30%"}'::jsonb, 'Ancelotti', '{"body":"light","eye_color":"brown","wrinkles":"on","hair_style":"balding","hair_color":"gray","beard_style":"none","mustache_style":"none","beard_color":"gray"}'::jsonb),
  ('ssr-coach-arteta', 'SSR', '阿提', '青訓帥哥', 'youth_developer', '{"description":"訓練 RP 效率 +25%（Lv ≤ 20）"}'::jsonb, 'Arteta', '{"body":"olive","eye_color":"brown","wrinkles":"none","hair_style":"plain","hair_color":"black","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"black"}'::jsonb),
  ('ssr-coach-simeone', 'SSR', '西蒙', '鐵血漢', 'iron_wall', '{"description":"對手射門 -15%"}'::jsonb, 'Simeone', '{"body":"olive","eye_color":"brown","wrinkles":"on","hair_style":"long","hair_color":"black","beard_style":"medium","mustache_style":"none","beard_color":"black"}'::jsonb),
  ('ssr-coach-mourinho', 'SSR', '莫尼', '經驗大師', 'veteran_handler', '{"description":"老將（wrinkles）戰力 +10%"}'::jsonb, 'Mourinho', '{"body":"light","eye_color":"brown","wrinkles":"on","hair_style":"swoop","hair_color":"gray","beard_style":"5oclock_shadow","mustache_style":"none","beard_color":"gray"}'::jsonb),
  ('ssr-coach-morioka', 'SSR', '三笘師', '亞洲心', 'tactician', '{"description":"全隊 midfield +8%"}'::jsonb, '森保一', '{"body":"light","eye_color":"brown","wrinkles":"on","hair_style":"plain","hair_color":"black","beard_style":"none","mustache_style":"none","beard_color":"black"}'::jsonb),
  ('ssr-coach-mancini', 'SSR', '喵叔', '義式優雅', 'offensive_master', '{"description":"全隊 attack +10%"}'::jsonb, 'Mancini', '{"body":"light","eye_color":"blue","wrinkles":"on","hair_style":"swoop","hair_color":"gray","beard_style":"trimmed","mustache_style":"none","beard_color":"gray"}'::jsonb),
  ('sr-coach-tact-01', 'SR', '湯馬斯', '戰術派', 'tactician', '{"description":"全隊 midfield +5%"}'::jsonb, '虛構', NULL),
  ('sr-coach-tact-02', 'SR', '威廉', '智略派', 'tactician', '{"description":"全隊 midfield +5%"}'::jsonb, '虛構', NULL),
  ('sr-coach-def-01', 'SR', '霍格', '鐵桶教練', 'defensive_master', '{"description":"全隊 defense +8%"}'::jsonb, '虛構', NULL),
  ('sr-coach-def-02', 'SR', '布魯諾', '後防專家', 'defensive_master', '{"description":"全隊 defense +8%"}'::jsonb, '虛構', NULL),
  ('sr-coach-off-01', 'SR', '法蘭克', '進攻派', 'offensive_master', '{"description":"全隊 attack +8%"}'::jsonb, '虛構', NULL),
  ('sr-coach-off-02', 'SR', '凱文', '衝擊派', 'offensive_master', '{"description":"全隊 attack +8%"}'::jsonb, '虛構', NULL),
  ('sr-coach-spd-01', 'SR', '彼得', '速度教練', 'speed_coach', '{"description":"全隊 speed +8%"}'::jsonb, '虛構', NULL),
  ('sr-coach-spd-02', 'SR', '艾倫', '邊路專家', 'speed_coach', '{"description":"全隊 speed +8%"}'::jsonb, '虛構', NULL),
  ('sr-coach-phy-01', 'SR', '哥茨', '體能師', 'physio', '{"description":"賽後體力回復 +20%"}'::jsonb, '虛構', NULL),
  ('sr-coach-phy-02', 'SR', '謝爾', '健身教練', 'physio', '{"description":"賽後體力回復 +20%"}'::jsonb, '虛構', NULL),
  ('sr-coach-youth-01', 'SR', '沃克', '青訓教練', 'youth_developer', '{"description":"訓練 RP 效率 +25%（Lv ≤ 20）"}'::jsonb, '虛構', NULL),
  ('sr-coach-youth-02', 'SR', '哈林', '梯隊教練', 'youth_developer', '{"description":"訓練 RP 效率 +25%（Lv ≤ 20）"}'::jsonb, '虛構', NULL),
  ('r-coach-atk-01', 'R', '巴克', '進攻助教', 'attack_3', '{"attr":"attack","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-atk-02', 'R', '凡德', '前線助理', 'attack_3', '{"attr":"attack","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-def-01', 'R', '艾爾文', '後防助教', 'defense_3', '{"attr":"defense","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-def-02', 'R', '柯林斯', '中堅助教', 'defense_3', '{"attr":"defense","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-spd-01', 'R', '達倫', '速度助教', 'speed_3', '{"attr":"speed","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-spd-02', 'R', '伊薩', '衝刺教練', 'speed_3', '{"attr":"speed","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-mid-01', 'R', '基倫', '中場助教', 'midfield_3', '{"attr":"midfield","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-mid-02', 'R', '麥可', '指揮助教', 'midfield_3', '{"attr":"midfield","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-sta-01', 'R', '凱倫', '耐力助教', 'stamina_3', '{"attr":"stamina","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-sta-02', 'R', '法瓦', '體能助教', 'stamina_3', '{"attr":"stamina","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-aur-01', 'R', '加文', '氣場助教', 'aura_3', '{"attr":"aura","pct":0.03}'::jsonb, '虛構', NULL),
  ('r-coach-aur-02', 'R', '羅根', '心戰助教', 'aura_3', '{"attr":"aura","pct":0.03}'::jsonb, '虛構', NULL);
