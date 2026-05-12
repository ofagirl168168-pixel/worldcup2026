#!/usr/bin/env node
/**
 * 下載 LPC 各 layer PNG 到 img/lpc-layers/、給 character maker / 之後的 app 用
 * 路徑都已 curl 驗證過 200。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const LPC_BASE = 'https://raw.githubusercontent.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// 5 bodies — light/olive/amber/brown/bronze
const SKIN_TONES = ['light', 'olive', 'amber', 'brown', 'bronze'];
const BODIES = SKIN_TONES.map(c => [`body/${c}`, `body/bodies/male/${c}.png`]);

// 5 heads — LPC body PNG 是「無頭」的、需獨立 head layer
const HEADS = SKIN_TONES.map(c => [`head/${c}`, `head/heads/human/male/${c}.png`]);

// 8 eye colors — LPC 內建眼睛顏色層、位置永遠對得準
const EYE_COLORS = ['blue', 'brown', 'gray', 'green', 'orange', 'purple', 'red', 'yellow'];
const EYES = EYE_COLORS.map(c => [`eyes/${c}`, `eyes/human/adult/${c}.png`]);

// 24 hair styles × 8 colors = 192 PNGs
// 注意：balding / buzzcut 走 adult 子路徑、其他走 male
const HAIR_STYLES_MALE = [
  'messy1', 'messy2', 'long', 'spiked', 'loose', 'curly_long', 'bedhead',
  'afro', 'pixie', 'shorthawk', 'swoop', 'wavy', 'plain',
  'bangs', 'bangsshort', 'bangslong', 'dreadlocks_long', 'flat_top_fade',
  'high_and_tight', 'high_ponytail', 'long_messy', 'mop', 'spiked_liberty',
];
const HAIR_STYLES_ADULT = ['balding', 'buzzcut'];  // 老教練必備
const HAIR_STYLES = [...HAIR_STYLES_MALE, ...HAIR_STYLES_ADULT];
const HAIR_COLORS = ['black', 'blonde', 'red', 'white', 'ginger', 'blue', 'purple', 'gray'];
const HAIRS = [];
for (const s of HAIR_STYLES_MALE) {
  for (const c of HAIR_COLORS) HAIRS.push([`hair/${s}-${c}`, `hair/${s}/male/${c}.png`]);
}
for (const s of HAIR_STYLES_ADULT) {
  for (const c of HAIR_COLORS) HAIRS.push([`hair/${s}-${c}`, `hair/${s}/adult/${c}.png`]);
}

// 4 beard styles + 8 mustache styles × 6 colors = 72 PNGs
// 鬍子路徑沒有 male/adult 子層、直接是顏色
const BEARD_STYLES = ['5oclock_shadow', 'basic', 'medium', 'trimmed'];
const MUSTACHE_STYLES = ['basic', 'handlebar', 'horseshoe', 'walrus', 'french', 'chevron', 'bigstache', 'lampshade'];
const BEARD_COLORS = ['black', 'blonde', 'red', 'white', 'gray', 'ginger'];
const BEARDS = [];
for (const s of BEARD_STYLES) {
  for (const c of BEARD_COLORS) BEARDS.push([`beard/${s}-${c}`, `beards/beard/${s}/${c}.png`]);
}
for (const s of MUSTACHE_STYLES) {
  for (const c of BEARD_COLORS) BEARDS.push([`mustache/${s}-${c}`, `beards/mustache/${s}/${c}.png`]);
}

// 球鞋 + 球靴 × 7 顏色 = 14 PNGs
const SHOE_COLORS = ['black', 'brown', 'white', 'red', 'blue', 'yellow', 'green'];
const SHOES = [];
for (const c of SHOE_COLORS) SHOES.push([`shoes-flat/${c}`, `feet/shoes/male/${c}.png`]);
for (const c of SHOE_COLORS) SHOES.push([`shoes-boots/${c}`, `feet/boots/male/${c}.png`]);

// 護腕 cuffs × 6 顏色
const WRIST_COLORS = ['red', 'blue', 'black', 'white', 'green', 'yellow'];
const WRISTS = WRIST_COLORS.map(c => [`wrist/${c}`, `wrists/cuffs/male/${c}.png`]);

// 皺紋/傷疤 — 跟膚色配對
const WRINKLES = SKIN_TONES.map(c => [`wrinkles/${c}`, `head/wrinkles/${c}.png`]);

// 眉毛 — 2 樣式 × 6 色
const EYEBROW_STYLES = ['thick', 'thin'];
const EYEBROW_COLORS = ['black','blonde','red','white','gray','ginger'];
const EYEBROWS = [];
for (const s of EYEBROW_STYLES) {
  for (const c of EYEBROW_COLORS) {
    EYEBROWS.push([`eyebrows/${s}-${c}`, `eyes/eyebrows/${s}/adult/${c}.png`]);
  }
}

// 頭巾/髮帶 — 7 色（thick 樣式 = 運動髮帶）
const HEADBAND_COLORS = ['red','blue','black','white','green','yellow','purple'];
const HEADBANDS = HEADBAND_COLORS.map(c => [`headband/${c}`, `hat/headband/thick/adult/${c}.png`]);

// 2 shirt styles × 9 colors = 18 PNGs
const SHIRT_STYLES = ['shortsleeve', 'sleeveless'];
const SHIRT_COLORS_SHORT = ['red','blue','black','white','green','yellow','teal','purple','orange'];
const SHIRT_COLORS_SLEEVE = ['red','blue','black','yellow'];
const SHIRTS = [];
for (const c of SHIRT_COLORS_SHORT) {
  SHIRTS.push([`shirt/shortsleeve-${c}`, `torso/clothes/shortsleeve/shortsleeve/male/${c}.png`]);
}
for (const c of SHIRT_COLORS_SLEEVE) {
  SHIRTS.push([`shirt/sleeveless-${c}`, `torso/clothes/sleeveless/sleeveless/male/${c}.png`]);
}

// 球褲（修「沒褲子」問題）— football shorts、寬鬆樣式 × 11 顏色
const PANTS_COLORS = ['red','blue','black','white','green','yellow','teal','purple','orange','brown','tan'];
const PANTS = [];
for (const c of PANTS_COLORS) {
  PANTS.push([`pants/${c}`, `legs/shorts/shorts/male/${c}.png`]);
}

const outDir = path.join(__dirname, '..', 'img', 'lpc-layers');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const all = [...BODIES, ...HEADS, ...EYES, ...EYEBROWS, ...WRINKLES, ...HAIRS, ...BEARDS, ...HEADBANDS, ...SHIRTS, ...PANTS, ...SHOES, ...WRISTS];
  console.log(`Downloading ${all.length} LPC layers...`);
  let ok = 0, fail = 0;
  for (const [outName, srcPath] of all) {
    const url = `${LPC_BASE}/${srcPath}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const outPath = path.join(outDir, outName + '.png');
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      ok++;
    } catch (e) {
      console.warn(`  ✗ ${outName}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n✓ ${ok} ok, ${fail} failed`);

  // 寫 manifest JSON
  const manifest = {
    bodies: BODIES.map(([n]) => n.replace('body/', '')),
    heads: HEADS.map(([n]) => n.replace('head/', '')),
    eye_colors: EYE_COLORS,
    hair_styles: HAIR_STYLES,
    hair_colors: HAIR_COLORS,
    beard_styles: BEARD_STYLES,
    mustache_styles: MUSTACHE_STYLES,
    beard_colors: BEARD_COLORS,
    shirt_styles: SHIRT_STYLES,
    shirt_colors_short: SHIRT_COLORS_SHORT,
    shirt_colors_sleeve: SHIRT_COLORS_SLEEVE,
    pants_colors: PANTS_COLORS,
    shoe_styles: ['flat', 'boots'],
    shoe_colors: SHOE_COLORS,
    wrist_colors: WRIST_COLORS,
    wrinkle_skins: SKIN_TONES,
    eyebrow_styles: EYEBROW_STYLES,
    eyebrow_colors: EYEBROW_COLORS,
    headband_colors: HEADBAND_COLORS,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest.json');
})().catch(e => { console.error(e); process.exit(1); });
