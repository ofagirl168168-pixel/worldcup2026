#!/usr/bin/env node
/**
 * build-lpc-portraits.js — 為 230 張球員卡生成 LPC pixel art 肖像
 *
 * 從 LPC 公開 GitHub repo 抓 body / hair / shirt layer PNG，
 * 依 card_id hash 組合成獨特 64×48 頭像（頭+肩膀），
 * 輸出到 img/lpc-portraits/{card_id}.png。
 *
 * 用法：
 *   node scripts/build-lpc-portraits.js
 *
 * 授權：LPC 素材 CC-BY-SA 3.0（需 attribution；衍生作 share-alike）
 * Credits: 詳見 img/lpc-portraits/CREDITS.md
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const LPC_BASE = 'https://raw.githubusercontent.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// ─── Layer pools（已用 curl 驗證所有 URL 200）───
const BODIES = [
  'body/bodies/male/light.png',
  'body/bodies/male/olive.png',
  'body/bodies/male/amber.png',
  'body/bodies/male/brown.png',
];

const HAIRS = [
  // messy1: 4 colors
  'hair/messy1/male/black.png',
  'hair/messy1/male/blonde.png',
  'hair/messy1/male/red.png',
  'hair/messy1/male/white.png',
  // messy2: 2 colors
  'hair/messy2/male/black.png',
  'hair/messy2/male/blonde.png',
  // long: 3 colors
  'hair/long/male/black.png',
  'hair/long/male/blonde.png',
  'hair/long/male/red.png',
  // spiked: 4 colors
  'hair/spiked/male/black.png',
  'hair/spiked/male/blonde.png',
  'hair/spiked/male/red.png',
  'hair/spiked/male/white.png',
  // loose: 4 colors
  'hair/loose/male/black.png',
  'hair/loose/male/blonde.png',
  'hair/loose/male/red.png',
  'hair/loose/male/white.png',
  // curly_long: 4 colors
  'hair/curly_long/male/black.png',
  'hair/curly_long/male/blonde.png',
  'hair/curly_long/male/red.png',
  'hair/curly_long/male/white.png',
  // bedhead: 4 colors
  'hair/bedhead/male/black.png',
  'hair/bedhead/male/blonde.png',
  'hair/bedhead/male/red.png',
  'hair/bedhead/male/white.png',
];

// 用 shortsleeve（短袖、像球衣）+ sleeveless（背心、像球員訓練服）
const SHIRTS = [
  'torso/clothes/shortsleeve/shortsleeve/male/red.png',
  'torso/clothes/shortsleeve/shortsleeve/male/blue.png',
  'torso/clothes/shortsleeve/shortsleeve/male/black.png',
  'torso/clothes/shortsleeve/shortsleeve/male/white.png',
  'torso/clothes/shortsleeve/shortsleeve/male/green.png',
  'torso/clothes/shortsleeve/shortsleeve/male/yellow.png',
  'torso/clothes/shortsleeve/shortsleeve/male/teal.png',
  'torso/clothes/shortsleeve/shortsleeve/male/purple.png',
  'torso/clothes/shortsleeve/shortsleeve/male/orange.png',
  'torso/clothes/sleeveless/sleeveless/male/red.png',
  'torso/clothes/sleeveless/sleeveless/male/blue.png',
  'torso/clothes/sleeveless/sleeveless/male/black.png',
  'torso/clothes/sleeveless/sleeveless/male/yellow.png',
];

// ─── LPC sprite sheet 真實佈局（debug 確認過）───
// 832 寬 × 2944 高（universal generator extended layout）
// row 10 = walk-down 動作，frame 0 idle 在 y=640~703
// 角色在 frame 內位於 y=32~61（bottom-aligned）— LPC 都這樣
//
// 上次 32×32 包含腿 → 頭只佔上半，看起來「人很小、頭不明顯」
// 改 32×22 只 crop 頭+脖子+肩膀+球衣領口（裁掉腿），頭會放大主導
const PORTRAIT_W = 32;
const PORTRAIT_H = 22;            // 4 padding + 16 head + 2 neck
const SRC_X = 16;
const SRC_Y = 640 + 28;

async function fetchImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch ${url}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  return loadImage(buf);
}

function hashSeed(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

async function main() {
  // 讀 230 card_ids
  const seedPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260512000001_seed_player_cards.sql');
  const sql = fs.readFileSync(seedPath, 'utf-8');
  const cardIds = [];
  const re = /\('([^']+)',\s*'(SSR|SR|R)'/g;
  let m;
  while ((m = re.exec(sql))) cardIds.push(m[1]);
  console.log(`Found ${cardIds.length} cards`);

  // 預載所有 layers（cache）
  console.log('Fetching LPC layers...');
  const cache = new Map();
  async function getLayer(rel) {
    if (cache.has(rel)) return cache.get(rel);
    try {
      const img = await fetchImage(LPC_BASE + '/' + rel);
      cache.set(rel, img);
      console.log(`  ✓ ${rel} (${img.width}×${img.height})`);
      return img;
    } catch (e) {
      console.warn(`  ✗ ${rel}: ${e.message}`);
      cache.set(rel, null);
      return null;
    }
  }
  for (const p of [...BODIES, ...HAIRS, ...SHIRTS]) {
    await getLayer(p);
  }

  // 確保至少有 1 個 body / hair / shirt
  const validBodies = BODIES.filter(p => cache.get(p));
  const validHairs = HAIRS.filter(p => cache.get(p));
  const validShirts = SHIRTS.filter(p => cache.get(p));
  console.log(`\nUsable layers: ${validBodies.length} bodies × ${validHairs.length} hairs × ${validShirts.length} shirts = ${validBodies.length * validHairs.length * validShirts.length} combos`);
  if (!validBodies.length || !validHairs.length || !validShirts.length) {
    throw new Error('Missing layers — abort');
  }

  // 輸出資料夾
  const outDir = path.join(__dirname, '..', 'img', 'lpc-portraits');
  fs.mkdirSync(outDir, { recursive: true });

  // 為每張卡組合 + 存檔
  let done = 0;
  for (const cardId of cardIds) {
    const h = hashSeed(cardId);
    const body  = validBodies [ h        % validBodies.length];
    const hair  = validHairs  [(h >> 8)  % validHairs.length];
    const shirt = validShirts [(h >> 16) % validShirts.length];

    const cv = createCanvas(PORTRAIT_W, PORTRAIT_H);
    const ctx = cv.getContext('2d');
    // 1. body, 2. shirt, 3. hair（後者覆蓋前者）
    for (const layer of [body, shirt, hair]) {
      const img = cache.get(layer);
      if (!img) continue;
      ctx.drawImage(img, SRC_X, SRC_Y, PORTRAIT_W, PORTRAIT_H, 0, 0, PORTRAIT_W, PORTRAIT_H);
    }

    const out = path.join(outDir, cardId + '.png');
    fs.writeFileSync(out, cv.toBuffer('image/png'));
    done++;
    if (done % 30 === 0) console.log(`  ${done}/${cardIds.length}`);
  }
  console.log(`\n✅ Saved ${done} portraits to img/lpc-portraits/`);

  // 寫 CREDITS.md
  const credits = `# LPC Pixel Art Portrait Credits

肖像由 LPC (Liberated Pixel Cup) 素材合成，授權 **CC-BY-SA 3.0**。

由 \`scripts/build-lpc-portraits.js\` 自動生成。原始素材來源：
https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator

## Layers used

### Bodies
${BODIES.map(p => '- ' + p).join('\n')}

### Hair
${HAIRS.map(p => '- ' + p).join('\n')}

### Shirts (longsleeve)
${SHIRTS.map(p => '- ' + p).join('\n')}

## 原作者 attribution

LPC 素材由多位社群藝術家在 2012 Liberated Pixel Cup 比賽期間貢獻並陸續更新。
完整 attribution 見上面 GitHub repo 的 CREDITS.txt / SHEET_CREDITS.txt。

衍生作（本資料夾內 PNG）依 share-alike 條款同樣以 CC-BY-SA 3.0 釋出。
`;
  fs.writeFileSync(path.join(outDir, 'CREDITS.md'), credits, 'utf-8');
  console.log('✅ Wrote CREDITS.md');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
