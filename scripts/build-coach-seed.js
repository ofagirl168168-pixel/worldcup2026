#!/usr/bin/env node
/**
 * 產 coach_pool seed SQL（30 教練：8 SSR + 12 SR + 12 R）
 * 用法：node scripts/build-coach-seed.js
 * 輸出：supabase/migrations/20260512000022_seed_coach_pool.sql
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ── 8 SSR 真實名帥化名（依 docs/coach-pool-design.md §3）──
// look_data：跟球員系統同 schema、依該名帥實際長相
const SSR = [
  ['ssr-coach-guardiola', '瓜帝', '戰術大師', 'tiki_taka',
    { description: '中場控球時 attack +15%' },
    'Guardiola',
    { body: 'olive', eye_color: 'brown', wrinkles: 'on', hair_style: 'bald',
      hair_color: 'black', beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black' }],
  ['ssr-coach-klopp', '克羅普', '熱情澎湃', 'gegen_press',
    { description: '全隊 stamina 消耗 -20%' },
    'Klopp',
    { body: 'light', eye_color: 'blue', wrinkles: 'on', hair_style: 'balding',
      hair_color: 'blonde', beard_style: 'medium', mustache_style: 'none', beard_color: 'blonde' }],
  ['ssr-coach-ancelotti', '安察', '老謀深算', 'champion_mentality',
    { description: '領先後不被翻盤機率 +30%' },
    'Ancelotti',
    { body: 'light', eye_color: 'brown', wrinkles: 'on', hair_style: 'balding',
      hair_color: 'gray', beard_style: 'none', mustache_style: 'none', beard_color: 'gray' }],
  ['ssr-coach-arteta', '阿提', '青訓帥哥', 'youth_developer',
    { description: '訓練 RP 效率 +25%（Lv ≤ 20）' },
    'Arteta',
    { body: 'olive', eye_color: 'brown', wrinkles: 'none', hair_style: 'plain',
      hair_color: 'black', beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black' }],
  ['ssr-coach-simeone', '西蒙', '鐵血漢', 'iron_wall',
    { description: '對手射門 -15%' },
    'Simeone',
    { body: 'olive', eye_color: 'brown', wrinkles: 'on', hair_style: 'long',
      hair_color: 'black', beard_style: 'medium', mustache_style: 'none', beard_color: 'black' }],
  ['ssr-coach-mourinho', '莫尼', '經驗大師', 'veteran_handler',
    { description: '老將（wrinkles）戰力 +10%' },
    'Mourinho',
    { body: 'light', eye_color: 'brown', wrinkles: 'on', hair_style: 'swoop',
      hair_color: 'gray', beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'gray' }],
  ['ssr-coach-morioka', '三笘師', '亞洲心', 'tactician',
    { description: '全隊 midfield +8%' },
    '森保一',
    { body: 'light', eye_color: 'brown', wrinkles: 'on', hair_style: 'plain',
      hair_color: 'black', beard_style: 'none', mustache_style: 'none', beard_color: 'black' }],
  ['ssr-coach-mancini', '喵叔', '義式優雅', 'offensive_master',
    { description: '全隊 attack +10%' },
    'Mancini',
    { body: 'light', eye_color: 'blue', wrinkles: 'on', hair_style: 'swoop',
      hair_color: 'gray', beard_style: 'trimmed', mustache_style: 'none', beard_color: 'gray' }],
];

// ── 12 SR（虛構，依 6 種風格 × 2 位）──
// trait 與 trait_value：屬性 buff 用 { attr, pct }、機制 trait 用 { description }
const SR = [
  ['sr-coach-tact-01', '湯馬斯', '戰術派', 'tactician', { description: '全隊 midfield +5%' }, '虛構'],
  ['sr-coach-tact-02', '威廉', '智略派', 'tactician', { description: '全隊 midfield +5%' }, '虛構'],
  ['sr-coach-def-01',  '霍格', '鐵桶教練', 'defensive_master', { description: '全隊 defense +8%' }, '虛構'],
  ['sr-coach-def-02',  '布魯諾', '後防專家', 'defensive_master', { description: '全隊 defense +8%' }, '虛構'],
  ['sr-coach-off-01',  '法蘭克', '進攻派', 'offensive_master', { description: '全隊 attack +8%' }, '虛構'],
  ['sr-coach-off-02',  '凱文',   '衝擊派', 'offensive_master', { description: '全隊 attack +8%' }, '虛構'],
  ['sr-coach-spd-01',  '彼得',   '速度教練', 'speed_coach', { description: '全隊 speed +8%' }, '虛構'],
  ['sr-coach-spd-02',  '艾倫',   '邊路專家', 'speed_coach', { description: '全隊 speed +8%' }, '虛構'],
  ['sr-coach-phy-01',  '哥茨',   '體能師', 'physio', { description: '賽後體力回復 +20%' }, '虛構'],
  ['sr-coach-phy-02',  '謝爾',   '健身教練', 'physio', { description: '賽後體力回復 +20%' }, '虛構'],
  ['sr-coach-youth-01','沃克',   '青訓教練', 'youth_developer', { description: '訓練 RP 效率 +25%（Lv ≤ 20）' }, '虛構'],
  ['sr-coach-youth-02','哈林',   '梯隊教練', 'youth_developer', { description: '訓練 RP 效率 +25%（Lv ≤ 20）' }, '虛構'],
];

// ── 12 R（單一屬性 +3%，6 屬性 × 2 位）──
const R = [
  ['r-coach-atk-01', '巴克',   '進攻助教', 'attack_3',   { attr: 'attack', pct: 0.03 }, '虛構'],
  ['r-coach-atk-02', '凡德',   '前線助理', 'attack_3',   { attr: 'attack', pct: 0.03 }, '虛構'],
  ['r-coach-def-01', '艾爾文', '後防助教', 'defense_3',  { attr: 'defense', pct: 0.03 }, '虛構'],
  ['r-coach-def-02', '柯林斯', '中堅助教', 'defense_3',  { attr: 'defense', pct: 0.03 }, '虛構'],
  ['r-coach-spd-01', '達倫',   '速度助教', 'speed_3',    { attr: 'speed', pct: 0.03 }, '虛構'],
  ['r-coach-spd-02', '伊薩',   '衝刺教練', 'speed_3',    { attr: 'speed', pct: 0.03 }, '虛構'],
  ['r-coach-mid-01', '基倫',   '中場助教', 'midfield_3', { attr: 'midfield', pct: 0.03 }, '虛構'],
  ['r-coach-mid-02', '麥可',   '指揮助教', 'midfield_3', { attr: 'midfield', pct: 0.03 }, '虛構'],
  ['r-coach-sta-01', '凱倫',   '耐力助教', 'stamina_3',  { attr: 'stamina', pct: 0.03 }, '虛構'],
  ['r-coach-sta-02', '法瓦',   '體能助教', 'stamina_3',  { attr: 'stamina', pct: 0.03 }, '虛構'],
  ['r-coach-aur-01', '加文',   '氣場助教', 'aura_3',     { attr: 'aura', pct: 0.03 }, '虛構'],
  ['r-coach-aur-02', '羅根',   '心戰助教', 'aura_3',     { attr: 'aura', pct: 0.03 }, '虛構'],
];

function sqlEscape(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlJson(o) {
  if (o == null) return 'NULL';
  return "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
}

function row(rarity, [id, name, nickname, trait, traitValue, inspiration, look]) {
  return `('${id}', '${rarity}', ${sqlEscape(name)}, ${sqlEscape(nickname)}, '${trait}', ${sqlJson(traitValue)}, ${sqlEscape(inspiration)}, ${sqlJson(look || null)})`;
}

const rows = [
  ...SSR.map(c => row('SSR', c)),
  ...SR.map(c => row('SR', c)),
  ...R.map(c => row('R', c)),
];

const sql = `-- ============================================================
-- 教練池 seed（30 教練：8 SSR + 12 SR + 12 R）
-- 由 scripts/build-coach-seed.js 自動產生、重跑：node scripts/build-coach-seed.js
-- ============================================================

DELETE FROM coach_pool WHERE coach_id LIKE 'ssr-coach-%' OR coach_id LIKE 'sr-coach-%' OR coach_id LIKE 'r-coach-%';

INSERT INTO coach_pool (coach_id, rarity, name, nickname, trait, trait_value, inspiration, look_data) VALUES
  ${rows.join(',\n  ')};
`;

const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260512000022_seed_coach_pool.sql');
fs.writeFileSync(outPath, sql);
console.log(`✅ 寫到 ${path.relative(path.join(__dirname, '..'), outPath)}`);
console.log(`   ${SSR.length} SSR + ${SR.length} SR + ${R.length} R = ${SSR.length+SR.length+R.length} 教練`);
