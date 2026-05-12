#!/usr/bin/env node
/**
 * build-pipoya-portraits.js — 用 PIPOYA 32×32 RPG character sprites
 *
 * 為 230 張球員卡：
 *   1. 從 GitHub raw 下載 PIPOYA 的 Male + Female sprite (96×128 spritesheet)
 *   2. 依 card_id hash 指派一個 character
 *   3. 輸出兩種：
 *      - img/portraits/{card_id}.png — 32×32 idle 正面圖 (給卡片用)
 *      - img/sprites/{card_id}.png — 96×128 完整 spritesheet (給比賽用)
 *
 * PIPOYA sprite layout（96×128, 32×32 per frame）：
 *   row 0 (y=0-31)  = walk DOWN  (face camera) : frame 0/1/2 = step/idle/step
 *   row 1 (y=32-63) = walk LEFT
 *   row 2 (y=64-95) = walk RIGHT
 *   row 3 (y=96-127)= walk UP    (face away)
 *
 * 授權：PIPOYA Free 包，可商業使用、需 credit。
 *       見 img/portraits/CREDITS.md
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const REPO_BASE = 'https://raw.githubusercontent.com/pythonarcade/community-rpg/main/resources/characters';

// Male 01 ~ 24, 4 變體（-1 -2 -3 -4）= 96 個 male
// Female 01 ~ 23, 4 變體 = 92 個 female
// 但實際數量我們用 dynamic discover
async function listCharacters() {
  const tree = await (await fetch('https://api.github.com/repos/pythonarcade/community-rpg/git/trees/main?recursive=1')).json();
  const items = tree.tree
    .map(t => t.path)
    .filter(p => /^resources\/characters\/(Male|Female)\/(Male|Female) \d+-\d+\.png$/.test(p));
  return items;
}

async function fetchImage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return loadImage(Buffer.from(await r.arrayBuffer()));
}

function hashSeed(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

async function main() {
  // 1. 讀 civilian filter（過濾掉皇冠/頭盔/長袍類角色）
  // 之前 user 反饋「怎麼有國王」→ 用 filter-pipoya-civilians.js 過濾
  const filterPath = path.join(__dirname, '.pipoya-civilians.json');
  let allPaths;
  if (fs.existsSync(filterPath)) {
    const filter = JSON.parse(fs.readFileSync(filterPath, 'utf-8'));
    allPaths = filter.civilian || [];
    console.log(`Using ${allPaths.length} civilian sprites (filtered from .pipoya-civilians.json)`);
    if (!allPaths.length) {
      throw new Error('Civilian list empty — run scripts/filter-pipoya-civilians.js first');
    }
  } else {
    console.log('No civilian filter found, falling back to discovery (may include kings/knights)');
    const charPaths = await listCharacters();
    allPaths = charPaths.filter(p => /\/(Male|Female)\//.test(p)).sort();
  }

  // 2. 讀 230 個 card_ids
  const seedPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260512000001_seed_player_cards.sql');
  const sql = fs.readFileSync(seedPath, 'utf-8');
  const cardIds = [];
  const re = /\('([^']+)',\s*'(SSR|SR|R)'/g;
  let m;
  while ((m = re.exec(sql))) cardIds.push(m[1]);
  console.log(`\n${cardIds.length} cards to process\n`);

  // 3. 預先下載所有 sprite sheet（之後從 cache 取）
  console.log('Pre-fetching all sprite sheets...');
  const sheetCache = new Map();
  for (let i = 0; i < allPaths.length; i++) {
    const p = allPaths[i];
    try {
      const url = `https://raw.githubusercontent.com/pythonarcade/community-rpg/main/${p}`;
      const img = await fetchImage(url);
      sheetCache.set(p, img);
      if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${allPaths.length}`);
    } catch (e) {
      console.warn(`  ✗ ${p}: ${e.message}`);
    }
  }
  console.log(`✓ Loaded ${sheetCache.size} sprite sheets\n`);

  // 4. 為每張卡指派 + 輸出兩種圖
  const outPortraits = path.join(__dirname, '..', 'img', 'portraits');
  const outSprites = path.join(__dirname, '..', 'img', 'sprites');
  fs.mkdirSync(outPortraits, { recursive: true });
  fs.mkdirSync(outSprites, { recursive: true });

  const PIPOYA_W = 32, PIPOYA_H = 32;
  let done = 0, skip = 0;
  for (const cardId of cardIds) {
    const h = hashSeed(cardId);
    const charPath = allPaths[h % allPaths.length];
    const sheet = sheetCache.get(charPath);
    if (!sheet) { skip++; continue; }

    // (a) portrait = frame (1, 0) center idle facing down = x=32, y=0, 32×32
    const pv = createCanvas(PIPOYA_W, PIPOYA_H);
    const pvCtx = pv.getContext('2d');
    pvCtx.drawImage(sheet, 32, 0, 32, 32, 0, 0, 32, 32);
    fs.writeFileSync(path.join(outPortraits, cardId + '.png'), pv.toBuffer('image/png'));

    // (b) full sprite sheet 直接複製（96×128）
    const sv = createCanvas(96, 128);
    sv.getContext('2d').drawImage(sheet, 0, 0);
    fs.writeFileSync(path.join(outSprites, cardId + '.png'), sv.toBuffer('image/png'));

    done++;
    if (done % 30 === 0) console.log(`  ${done}/${cardIds.length}`);
  }
  console.log(`\n✅ ${done} portraits + ${done} sprites generated (${skip} skipped)\n`);

  // 5. 寫 CREDITS
  const credits = `# PIPOYA 角色素材

\`img/portraits/\` (32×32 idle 正面) + \`img/sprites/\` (96×128 4-direction walk) 由
\`scripts/build-pipoya-portraits.js\` 從以下來源下載合成：

- **PIPOYA Free RPG Character Sprites 32x32**
  https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32
- GitHub mirror used: https://github.com/pythonarcade/community-rpg

## 授權

PIPOYA Free 包：可免費商業使用，需在作品中標示作者「PIPOYA」。
本網站採用此素材：所有 \`img/portraits/\` + \`img/sprites/\` 內容歸 PIPOYA 所有。

## 角色清單

每張卡片以 card_id 之 hash 指派到固定 PIPOYA 角色（${allPaths.length} 個基底）。

由 PIPOYA 提供之角色檔案：
${allPaths.map(p => '- ' + p.replace(/^resources\/characters\//, '')).join('\n')}
`;
  fs.writeFileSync(path.join(outPortraits, 'CREDITS.md'), credits, 'utf-8');
  fs.writeFileSync(path.join(outSprites, 'CREDITS.md'), credits, 'utf-8');
  console.log('✅ Wrote CREDITS.md');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
