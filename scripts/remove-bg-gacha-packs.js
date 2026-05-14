/**
 * 批次把 AI 生成的卡包圖去背 + 壓縮 + 縮圖
 *
 * 用法：node scripts/remove-bg-gacha-packs.js
 *
 * 處理流程：
 *  1. 讀 PNG（AI 生成、可能 1024×1536 等大尺寸）
 *  2. 縮成 RESIZE_W × RESIZE_H（卡包頂多用到 ~200px、不需要太大）
 *  3. 抽 4 角 + 4 邊中點當背景樣本、median 為 BG 色
 *  4. 對每個 pixel：色距 < THRESHOLD → alpha=0；35~50 漸進羽化
 *  5. 用 PNG 最高壓縮輸出（compressionLevel: 9）
 *  6. 覆蓋寫回原檔、印出 before / after 檔案大小
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
const THRESHOLD = 35;
const FEATHER = 15;
// 卡包在 UI 上頂多顯示 ~200×300px、512×768 dpr=2 就夠了
const RESIZE_W = 512;
const RESIZE_H = 768;

async function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Skip missing: ${filePath}`);
    return;
  }

  const beforeSize = fs.statSync(fullPath).size;
  const img = await loadImage(fullPath);
  // 等比縮到 RESIZE_W × RESIZE_H（保持原比例 → fit contain）
  const srcRatio = img.width / img.height;
  const dstRatio = RESIZE_W / RESIZE_H;
  let drawW, drawH, offsetX = 0, offsetY = 0;
  if (srcRatio > dstRatio) {
    // 原圖較寬 → 撐滿寬度、垂直留邊（透明）
    drawW = RESIZE_W;
    drawH = Math.round(RESIZE_W / srcRatio);
    offsetY = (RESIZE_H - drawH) / 2;
  } else {
    drawH = RESIZE_H;
    drawW = Math.round(RESIZE_H * srcRatio);
    offsetX = (RESIZE_W - drawW) / 2;
  }
  const W = RESIZE_W, H = RESIZE_H;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;  // pixel art 保銳利
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
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

  // PNG 最高壓縮：compressionLevel 9 + Paeth filter（pixel art 友善）
  const buf = canvas.toBuffer('image/png', {
    compressionLevel: 9,
    filterType: 4,  // 4 = Paeth filter
  });
  fs.writeFileSync(fullPath, buf);
  const afterSize = buf.length;
  const ratio = Math.round((1 - afterSize / beforeSize) * 100);

  console.log(
    `✅ ${path.basename(filePath)}: ` +
    `${img.width}×${img.height} → ${W}×${H}, ` +
    `bg=(${bgR},${bgG},${bgB}), ` +
    `透明 ${Math.round(transCount/totalCount*100)}%, ` +
    `${(beforeSize/1024).toFixed(0)}KB → ${(afterSize/1024).toFixed(0)}KB (-${ratio}%)`
  );
}

// 背景圖：縮 + JPEG 壓縮（不需透明、PNG 對複雜場景效率太差）
async function processBackground(filePath, w, h) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Skip missing: ${filePath}`);
    return;
  }
  const beforeSize = fs.statSync(fullPath).size;
  const img = await loadImage(fullPath);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;   // JPEG 用一般 smoothing OK
  ctx.drawImage(img, 0, 0, w, h);
  // JPEG quality 82 對複雜場景視覺幾乎無感、檔案小很多
  const buf = canvas.toBuffer('image/jpeg', { quality: 82 });
  // 寫成 .jpg、刪除原 .png
  const jpgPath = fullPath.replace(/\.png$/i, '.jpg');
  fs.writeFileSync(jpgPath, buf);
  if (jpgPath !== fullPath && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  const ratio = Math.round((1 - buf.length / beforeSize) * 100);
  console.log(
    `✅ ${path.basename(jpgPath)}: ${img.width}×${img.height} → ${w}×${h}, ` +
    `${(beforeSize/1024).toFixed(0)}KB → ${(buf.length/1024).toFixed(0)}KB (-${ratio}%)`
  );
}

(async () => {
  console.log('── 卡包圖（去背 + 縮 + 壓縮）──');
  for (const f of FILES) {
    try { await processFile(f); }
    catch (e) { console.error(`❌ ${f}: ${e.message}`); }
  }
  console.log('\n── 背景圖（縮 + 壓縮）──');
  // 背景改 3:4 直式 720×960（modal 是直式、畫面更貼合）
  await processBackground('img/my-team/gacha-bg.png', 720, 960)
    .catch(e => console.error(`❌ bg: ${e.message}`));
})();
