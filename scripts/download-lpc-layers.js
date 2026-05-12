#!/usr/bin/env node
/**
 * 下載 LPC 各 layer PNG 到 img/lpc-layers/、給 character maker / 之後的 app 用
 * 路徑都已 curl 驗證過 200。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const LPC_BASE = 'https://raw.githubusercontent.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets';

// 4 bodies × 1（一張包含全部動作）
const BODIES = [
  ['body/light',  'body/bodies/male/light.png'],
  ['body/olive',  'body/bodies/male/olive.png'],
  ['body/amber',  'body/bodies/male/amber.png'],
  ['body/brown',  'body/bodies/male/brown.png'],
];

// 7 hair styles × 4 colors = 28 PNGs
const HAIR_STYLES = ['messy1', 'messy2', 'long', 'spiked', 'loose', 'curly_long', 'bedhead'];
const HAIR_COLORS = ['black', 'blonde', 'red', 'white'];
const HAIRS = [];
for (const s of HAIR_STYLES) {
  for (const c of HAIR_COLORS) {
    HAIRS.push([`hair/${s}-${c}`, `hair/${s}/male/${c}.png`]);
  }
}

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

const outDir = path.join(__dirname, '..', 'img', 'lpc-layers');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const all = [...BODIES, ...HAIRS, ...SHIRTS];
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
    hair_styles: HAIR_STYLES,
    hair_colors: HAIR_COLORS,
    shirt_styles: SHIRT_STYLES,
    shirt_colors_short: SHIRT_COLORS_SHORT,
    shirt_colors_sleeve: SHIRT_COLORS_SLEEVE,
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest.json');
})().catch(e => { console.error(e); process.exit(1); });
