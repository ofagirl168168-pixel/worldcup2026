/**
 * 批次把 AI 生成的卡包圖去背
 *
 * 用法：node scripts/remove-bg-gacha-packs.js
 *
 * 邏輯：
 *  1. 讀 PNG
 *  2. 抽 4 個角 + 4 邊中點當「背景樣本」
 *  3. 對每個 pixel：
 *     - 如果跟背景色 Euclidean distance < THRESHOLD → 設 alpha=0
 *     - 否則保留
 *  4. 邊緣 anti-alias：用 distance / THRESHOLD 漸進 alpha
 *  5. 存 *.transparent.png
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const FILES = [
  'img/my-team/gacha-pack-n.png',
  'img/my-team/gacha-pack-r.png',
  'img/my-team/gacha-pack-sr.png',
  'img/my-team/gacha-pack-ssr.png',
];
const THRESHOLD = 35;   // 色距 < 35 → 透明
const FEATHER = 15;     // 色距 35~50 → 漸進 alpha（避免硬邊鋸齒）

async function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Skip missing: ${filePath}`);
    return;
  }

  const img = await loadImage(fullPath);
  const W = img.width, H = img.height;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  // 抽 4 角 + 4 邊中點當背景樣本
  const samplePoints = [
    [2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3],
    [W / 2 | 0, 2], [W / 2 | 0, H - 3], [2, H / 2 | 0], [W - 3, H / 2 | 0],
  ];
  const bgSamples = samplePoints.map(([x, y]) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  // 取 median 顏色為背景色
  const bgR = Math.round(bgSamples.map(s => s[0]).sort((a, b) => a - b)[4]);
  const bgG = Math.round(bgSamples.map(s => s[1]).sort((a, b) => a - b)[4]);
  const bgB = Math.round(bgSamples.map(s => s[2]).sort((a, b) => a - b)[4]);

  let transCount = 0, totalCount = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const dist = Math.sqrt(
        (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
      );
      if (dist < THRESHOLD) {
        data[i + 3] = 0;        // 完全透明
        transCount++;
      } else if (dist < THRESHOLD + FEATHER) {
        // 邊緣羽化
        const t = (dist - THRESHOLD) / FEATHER;
        data[i + 3] = Math.round(data[i + 3] * t);
      }
      totalCount++;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // 覆蓋寫回原檔（也可以改 .transparent.png 比較安全）
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(fullPath, buf);

  console.log(`✅ ${filePath}: bg=(${bgR},${bgG},${bgB}), 透明 ${transCount}/${totalCount} (${Math.round(transCount/totalCount*100)}%)`);
}

(async () => {
  for (const f of FILES) {
    try { await processFile(f); }
    catch (e) { console.error(`❌ ${f}: ${e.message}`); }
  }
})();
