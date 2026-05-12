#!/usr/bin/env node
/**
 * build-player-card-seed.js
 * 產 player_card_pool 230 張卡的 seed SQL（30 SSR + 50 SR + 150 R）
 *
 * 用法：
 *   node scripts/build-player-card-seed.js
 *
 * 輸出：
 *   supabase/migrations/20260512000001_seed_player_cards.sql
 *
 * 規則（依 docs/my-team-design.md v0.7）：
 *   - SSR：30 個化名名師，hand-curated（見 SSR_LIST）
 *   - SR：50 張，屬性區間 60-80，60% 有 talent
 *   - R：150 張，屬性區間 40-65，不帶 talent
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ── 30 SSR 化名名師（依 design doc §7）──
const SSR_LIST = [
  // 攻擊核心
  ['ssr-mufeimui-01', '姆霸菲',   '速度王',     'FWD', 98, 40, 99, 85, 88, 95, 'speedster',  'Mbappé'],
  ['ssr-halandeng-01', '哈藍登', '北歐巨炮',   'FWD', 99, 35, 92, 70, 90, 88, 'bodybuilder', 'Haaland'],
  ['ssr-vini-01',     '維尼休士', '巴西曼波',   'FWD', 92, 38, 97, 80, 85, 90, 'speedster',  'Vinícius'],
  ['ssr-salaba-01',   '薩拉霸',   '法老王',     'FWD', 93, 42, 90, 82, 87, 92, 'shooter',    'Salah'],
  ['ssr-belling-01',  '貝鈴翰',   '英倫天才',   'FWD', 90, 55, 85, 92, 90, 95, 'magician',   'Bellingham'],
  ['ssr-meihsi-01',   '梅熹',     '阿根魔法師', 'MID', 95, 50, 80, 99, 80, 99, 'magician',   'Messi'],
  ['ssr-luonadou-01', '羅納斗',   '葡萄牙傳奇', 'FWD', 96, 45, 88, 80, 95, 99, 'shooter',    'C.Ronaldo'],
  // 中場大師
  ['ssr-modeli-01',   '莫德利祺', '克羅指揮官', 'MID', 80, 65, 78, 96, 85, 92, 'magician',   'Modrić'],
  ['ssr-debulong-01', '德布琅內', '紅髮魔術師', 'MID', 88, 60, 78, 99, 82, 95, 'magician',   'De Bruyne'],
  ['ssr-luodeli-01',  '羅得里',   '西班牙基座', 'MID', 78, 88, 75, 94, 92, 88, null,         'Rodri'],
  ['ssr-chuamning-01','楚阿明尼', '法國中樞',   'MID', 75, 85, 80, 92, 90, 85, null,         'Tchouaméni'],
  ['ssr-weiladi-01',  '維拉地',   '義式藝術家', 'MID', 82, 70, 82, 95, 85, 88, 'magician',   'Verratti'],
  ['ssr-kasaimi-01',  '卡賽米羅', '巴西鐵腰',   'MID', 75, 92, 72, 88, 88, 85, 'bodybuilder','Casemiro'],
  ['ssr-peideli-01',  '佩德立',   '巴薩奇才',   'MID', 85, 60, 80, 95, 78, 90, 'magician',   'Pedri'],
  // 後防巨牆
  ['ssr-fantaike-01', '范泰克',   '荷蘭巨牆',   'DEF', 60, 99, 80, 75, 92, 95, 'wall',       'Van Dijk'],
  ['ssr-lubendiya-01','魯本帝亞斯','葡萄牙石柱','DEF', 55, 95, 78, 72, 90, 88, 'wall',       'Rúben Dias'],
  ['ssr-salihba-01',  '薩力霸',   '兵工廠核心', 'DEF', 65, 92, 88, 78, 88, 85, 'bodybuilder','Saliba'],
  ['ssr-makuino-01',  '馬魁諾',   '巴西隊長',   'DEF', 60, 92, 82, 80, 88, 92, null,         'Marquinhos'],
  ['ssr-haqimi-01',   '哈奇咪',   '摩洛哥火箭', 'DEF', 85, 82, 96, 82, 90, 88, 'speedster',  'Hakimi'],
  ['ssr-daiweisi-01', '戴衛斯',   '北極快車',   'DEF', 80, 80, 99, 78, 92, 85, 'speedster',  'Davies'],
  // 新生代+巨星補
  ['ssr-yamaer-01',   '亞瑪兒',   '巴薩新星',   'FWD', 88, 45, 92, 85, 80, 92, 'magician',   'Yamal'],
  // 門將
  ['ssr-alisong-01',  '阿哩松',   '紅軍鋼門',   'GK',  25, 95, 75, 60, 88, 92, 'wall',       'Alisson'],
  ['ssr-nuoyier-01',  '諾依爾',   '德意志雙手', 'GK',  30, 92, 80, 75, 90, 95, 'wall',       'Neuer'],
  ['ssr-kutuwa-01',   '酷圖瓦',   '比利時長人', 'GK',  25, 96, 70, 55, 85, 90, 'wall',       'Courtois'],
  ['ssr-dangna-01',   '噹納魯馬', '義大利之手', 'GK',  22, 94, 65, 50, 92, 88, 'wall',       'Donnarumma'],
  ['ssr-laya-01',     '拉壓',     '兵工廠新銳', 'GK',  28, 90, 72, 58, 90, 85, null,         'Raya'],
  // 巴西+英倫經典
  ['ssr-neima-01',    '內瑪而',   '巴西舞者',   'FWD', 95, 40, 90, 92, 80, 99, 'magician',   'Neymar'],
  ['ssr-kaiyin-01',   '凱印',     '英格蘭老炮', 'FWD', 96, 55, 78, 80, 92, 90, 'shooter',    'Kane'],
  // 亞洲之星
  ['ssr-santo-01',    '三笘 燻',  '日本左翼',   'MID', 88, 55, 95, 85, 80, 88, 'speedster',  '三笘薫'],
  ['ssr-jiubao-01',   '玖保 健映','亞洲魔笛',   'MID', 85, 58, 90, 88, 82, 90, 'magician',   '久保建英'],
];

// ── 隨機虛構球員 — 用 6 大洲音節組合 ──
const FIRST_SYLLABLES = [
  '艾','貝','戴','卡','德','艾爾','法','加','哈','伊','傑','凱','拉','馬','尼',
  '奧','帕','奎','瑞','薩','陶','烏','弗','瓦','澤','柏','柯','迪','奇','瑟',
];
const MIDDLE_SYLLABLES = [
  '亞','利','洛','卡','倫','頓','西','克','蘭','安','拉','貝','迪','奧','德',
  '波','瑞','卡',
];
const LAST_SYLLABLES = [
  '斯','森','洛夫','茲','奇','耶夫','曼','遜','森','蓋','維奇','尼克','可',
  '尼','洛','登','克','利',
];

function rng(seed) {
  let x = seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

function genName(rand) {
  const s1 = FIRST_SYLLABLES[Math.floor(rand() * FIRST_SYLLABLES.length)];
  const s2 = MIDDLE_SYLLABLES[Math.floor(rand() * MIDDLE_SYLLABLES.length)];
  const s3 = LAST_SYLLABLES[Math.floor(rand() * LAST_SYLLABLES.length)];
  return s1 + s2 + s3;
}

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
const POS_WEIGHT_R  = { GK: 25, DEF: 45, MID: 45, FWD: 35 };  // 150 R 分配
const POS_WEIGHT_SR = { GK: 8,  DEF: 15, MID: 15, FWD: 12 };  // 50 SR 分配
const TALENTS = ['speedster', 'bodybuilder', 'shooter', 'wall', 'magician'];

// 各位置的屬性偏向（讓 attack 不會把 GK 拉到很高 = 不真實）
const POSITION_BIAS = {
  GK:  { attack: -30, defense: +15, speed:  -5, midfield: -10, stamina:   0, aura:  0 },
  DEF: { attack: -10, defense: +15, speed:  -3, midfield:  -5, stamina:  +5, aura:  0 },
  MID: { attack:  +0, defense:  -5, speed:   0, midfield: +10, stamina:   0, aura:  0 },
  FWD: { attack: +10, defense: -10, speed:  +5, midfield:  -5, stamina:  -3, aura:  0 },
};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function genStats(rarity, position, rand) {
  // base 範圍依 rarity（v0.7 design §5.1）
  const [base_min, base_max] = rarity === 'SR' ? [60, 80] : [40, 65];
  const bias = POSITION_BIAS[position];
  const roll = (key) => clamp(
    Math.floor(base_min + rand() * (base_max - base_min)) + bias[key],
    20, 95
  );
  return {
    attack:   roll('attack'),
    defense:  roll('defense'),
    speed:    roll('speed'),
    midfield: roll('midfield'),
    stamina:  roll('stamina'),
    aura:     roll('aura'),
  };
}

function buildRandomCards(rarity, totalCount) {
  const posCount = rarity === 'SR' ? POS_WEIGHT_SR : POS_WEIGHT_R;
  const rand = rng(rarity === 'SR' ? 2024 : 1024);
  const cards = [];
  let idx = 0;
  for (const [pos, count] of Object.entries(posCount)) {
    for (let i = 0; i < count; i++) {
      const cardId = `${rarity.toLowerCase()}-${pos.toLowerCase()}-${String(++idx).padStart(3, '0')}`;
      const name = genName(rand);
      const stats = genStats(rarity, pos, rand);
      // 60% SR 有 talent；R 不帶 talent
      const talent = rarity === 'SR' && rand() < 0.6
        ? TALENTS[Math.floor(rand() * TALENTS.length)]
        : null;
      cards.push({
        cardId, rarity, name, nickname: null, position: pos,
        ...stats, talent, inspiration: null, illustration: null,
      });
    }
  }
  return cards;
}

function sqlEscape(s) {
  if (s == null) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function rowToSQL(c) {
  // 對 SSR：cardId/rarity/name/nickname/pos/attack/def/speed/mid/stamina/aura/talent/inspiration
  return `('${c.cardId}', '${c.rarity}', ${sqlEscape(c.name)}, ${sqlEscape(c.nickname)}, '${c.position}', ${c.attack}, ${c.defense}, ${c.speed}, ${c.midfield}, ${c.stamina}, ${c.aura}, ${sqlEscape(c.talent)}, ${sqlEscape(c.inspiration)}, ${sqlEscape(c.illustration)})`;
}

// ── 主流程 ──
const allCards = [];

// 30 SSR
for (const [id, name, nickname, pos, attack, defense, speed, midfield, stamina, aura, talent, inspiration] of SSR_LIST) {
  allCards.push({
    cardId: id, rarity: 'SSR', name, nickname, position: pos,
    attack, defense, speed, midfield, stamina, aura,
    talent, inspiration, illustration: null,
  });
}

// 50 SR
allCards.push(...buildRandomCards('SR', 50));

// 150 R
allCards.push(...buildRandomCards('R', 150));

console.log(`產出 ${allCards.length} 張卡：
  SSR ${allCards.filter(c => c.rarity === 'SSR').length}
  SR  ${allCards.filter(c => c.rarity === 'SR').length}
  R   ${allCards.filter(c => c.rarity === 'R').length}`);

// 寫 SQL
const header = `-- ============================================================
-- 我的球隊 Phase 1 — 卡池 seed（230 張卡）
-- 由 scripts/build-player-card-seed.js 自動產生
-- 重跑：node scripts/build-player-card-seed.js
-- ============================================================

-- 清掉重跑（idempotent）
DELETE FROM player_card_pool WHERE card_id LIKE 'ssr-%' OR card_id LIKE 'sr-%' OR card_id LIKE 'r-%';

INSERT INTO player_card_pool
  (card_id, rarity, name, nickname, position, base_attack, base_defense, base_speed, base_midfield, base_stamina, base_aura, talent, inspiration, illustration)
VALUES
`;

const rows = allCards.map(rowToSQL).join(',\n  ');
const footer = ';\n\n-- 完成\n';

const sql = header + '  ' + rows + footer;

const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260512000001_seed_player_cards.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`✅ 寫到 ${path.relative(path.join(__dirname, '..'), outPath)}`);
