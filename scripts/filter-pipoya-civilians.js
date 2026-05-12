#!/usr/bin/env node
/**
 * 掃所有 PIPOYA sprite、用 pixel heuristic 判斷哪些是「平民」、哪些是 RPG 職業（皇/騎士/法師）
 * 結果存到 scripts/.pipoya-civilians.json — build script 之後只用這些
 *
 * 判斷邏輯（基於 idle facing-down frame x=32-63, y=0-31）：
 *   - 頭頂（y=0-4）有亮黃 (R>200,G>180,B<100) → 皇冠（國王/公主）
 *   - 頭頂大面積金屬灰 (相近 RGB, 100<L<180) → 頭盔（騎士）
 *   - 身體（y=20-30）整片單色長袍延伸到底 → 法師/僧侶
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadImage, createCanvas } = require('@napi-rs/canvas');

(async () => {
  const tree = await (await fetch('https://api.github.com/repos/pythonarcade/community-rpg/git/trees/main?recursive=1')).json();
  const items = tree.tree
    .map(t => t.path)
    .filter(p => /^resources\/characters\/(Male|Female)\/(Male|Female) \d+-\d+\.png$/.test(p))
    .sort();

  console.log(`Scanning ${items.length} sprites...`);
  const results = { civilian: [], excluded: [] };

  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    const url = `https://raw.githubusercontent.com/pythonarcade/community-rpg/main/${p}`;
    const img = await loadImage(Buffer.from(await (await fetch(url)).arrayBuffer()));
    const cv = createCanvas(img.width, img.height);
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // 取 idle facing-down frame：x=32-63, y=0-31
    const data = ctx.getImageData(32, 0, 32, 32).data;

    const reasons = [];

    // 1. 頭頂亮黃（皇冠）
    let crownPx = 0;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 32; x++) {
        const idx = (y * 32 + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a > 100 && r > 200 && g > 170 && b < 110) crownPx++;
      }
    }
    if (crownPx >= 4) reasons.push(`crown(yellow×${crownPx})`);

    // 2. 頭頂金屬灰大面積（頭盔）— 頭頂 y=0-8 中，灰色（R≈G≈B 且 100<L<200）+ 覆蓋寬度大
    let helmetPx = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 32; x++) {
        const idx = (y * 32 + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a > 100) {
          const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          const lum = (r + g + b) / 3;
          if (diff < 20 && lum > 110 && lum < 220) helmetPx++;
        }
      }
    }
    if (helmetPx >= 30) reasons.push(`helmet(grey×${helmetPx})`);

    // 3. 法師長袍：身體 y=20-30 整片同色寬廣（不是分腳褲子）
    // 取 row y=28 看實心連續寬度
    let bottomWidth = 0;
    for (let x = 0; x < 32; x++) {
      const a = data[(28 * 32 + x) * 4 + 3];
      if (a > 100) bottomWidth++;
    }
    // 22+ 才算長袍（一般球員的褲子+腳大約 12-18 寬）
    if (bottomWidth >= 22) reasons.push(`robe(bottom_w=${bottomWidth})`);

    const name = p.replace(/^resources\/characters\//, '');
    if (reasons.length) {
      results.excluded.push({ path: p, name, reasons });
      console.log(`  ✗ ${name}: ${reasons.join(', ')}`);
    } else {
      results.civilian.push(p);
    }
    if ((i + 1) % 30 === 0) console.log(`  scanned ${i + 1}/${items.length}`);
  }

  console.log(`\n✓ Civilian: ${results.civilian.length}  Excluded: ${results.excluded.length}`);
  fs.writeFileSync(
    path.join(__dirname, '.pipoya-civilians.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log('Saved scripts/.pipoya-civilians.json');
})().catch(e => { console.error(e); process.exit(1); });
