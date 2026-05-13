// 看 LPC body 在 walk-down idle frame 中、頭+臉部各列實際 opaque/skin 像素位置
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

(async () => {
  const layer = process.argv[2] || 'body/light';
  const img = await loadImage(fs.readFileSync(`img/lpc-layers/${layer}.png`));
  console.log(`body/light ${img.width}×${img.height}`);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  // walk-down idle frame 0: x=0..63, y=640..703
  // 看 frame y=30-50（頭頂到下巴）每 row 的 opaque 像素區段
  const data = ctx.getImageData(0, 640, 64, 64).data;
  // 看每個 y 的 center pixel（x=31, 32）顏色 + 完整 row 顏色串
  console.log('y\tcenter_rgb\trow_summary');
  for (let y = 30; y < 52; y++) {
    const ci = (y * 64 + 31) * 4;
    const cr = data[ci], cg = data[ci+1], cb = data[ci+2], ca = data[ci+3];
    let str = '';
    for (let x = 14; x < 50; x++) {
      const i = (y * 64 + x) * 4;
      const a = data[i + 3];
      if (a === 0) { str += '.'; continue; }
      const lum = (data[i] + data[i+1] + data[i+2]) / 3;
      str += lum > 200 ? 'L' : lum > 150 ? 'M' : lum > 80 ? 'm' : 'D';
    }
    console.log(`${String(y).padStart(2)}: center=rgba(${cr},${cg},${cb},${ca}) | ${str}`);
  }
})().catch(e => console.error(e));
