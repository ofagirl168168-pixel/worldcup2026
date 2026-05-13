// 把 body / shirt / hair walk-down frame 0 各自渲染成大圖看
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

(async () => {
  const layers = {
    body: 'img/lpc-layers/body/light.png',
    shirt: 'img/lpc-layers/shirt/shortsleeve-red.png',
    pants: 'img/lpc-layers/pants/blue.png',
    hair: 'img/lpc-layers/hair/messy1-red.png',
  };
  for (const [name, file] of Object.entries(layers)) {
    const img = await loadImage(fs.readFileSync(file));
    // Crop walk-down idle frame 0: x=0..63, y=640..703 → resize 10× → 640×640
    const out = createCanvas(640, 640);
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 640, 64, 64, 0, 0, 640, 640);
    fs.writeFileSync(`scripts/.dbg-${name}.png`, out.toBuffer('image/png'));
    console.log(`Saved scripts/.dbg-${name}.png`);
  }

  // 合成
  const out = createCanvas(640, 640);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const file of [layers.body, layers.pants, layers.shirt, layers.hair]) {
    const img = await loadImage(fs.readFileSync(file));
    ctx.drawImage(img, 0, 640, 64, 64, 0, 0, 640, 640);
  }
  fs.writeFileSync('scripts/.dbg-composed.png', out.toBuffer('image/png'));
  console.log('Saved scripts/.dbg-composed.png');
})().catch(e => console.error(e));
