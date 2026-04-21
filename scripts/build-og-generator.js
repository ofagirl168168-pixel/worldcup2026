// 把 logo PNG + persona SVG icon 以 base64 data URI 內嵌到 gen-og-image.html
// 這樣使用者用 Chrome 直接開 file:// 也能畫到 canvas 並下載（不會 tainted）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const out = path.join(__dirname, 'gen-og-image.html');

function b64(p) {
  return fs.readFileSync(path.join(ROOT, p)).toString('base64');
}

const LOGO = `data:image/png;base64,${b64('img/logo-soccermaddy.png')}`;
const I_CROWN = `data:image/svg+xml;base64,${b64('assets/personas/a10-crown.svg')}`;
const I_GLASS = `data:image/svg+xml;base64,${b64('assets/personas/a4-magnifying-glass.svg')}`;
const I_WAVES = `data:image/svg+xml;base64,${b64('assets/personas/a6-psychic-waves.svg')}`;

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>OG Image Generator — Soccer麥迪-足球情報站</title>
  <style>
    body { margin:0; padding:20px; background:#0b1614; color:#e8e0cf; font-family: system-ui, -apple-system, "Microsoft JhengHei", sans-serif; }
    .wrap { max-width: 1240px; margin: 0 auto; }
    button { padding:12px 28px; font-size:15px; background:#d4af37; color:#0a1f1c; border:0; border-radius:10px; cursor:pointer; font-weight:800; margin-top:14px; letter-spacing:0.5px; }
    button:hover { background:#f4c430; }
    button:disabled { background:#555; color:#888; cursor:not-allowed; }
    canvas { display:block; border:1px solid #2a3b38; max-width:100%; height:auto; border-radius:12px; }
    p { margin: 6px 0; color:#9bb3ae; font-size:14px; }
    code { background:#1a2825; padding:2px 8px; border-radius:4px; color:#d4af37; }
    h1 { margin:0 0 4px; color:#f4c430; font-size:22px; }
    #status { color:#7dd3a8; font-weight:600; }
    #status.err { color:#f88; }
  </style>
</head>
<body>
<div class="wrap">
  <h1>Soccer麥迪-足球情報站 · OG 封面生成器</h1>
  <p>按下「下載 og-cover.png」→ 把下載的檔案覆蓋到 <code>img/og-cover.png</code></p>
  <canvas id="c" width="1200" height="630"></canvas>
  <p id="status">載入中…</p>
  <button onclick="save()" disabled id="dl">⬇ 下載 og-cover.png</button>
</div>
<script>
const LOGO = ${JSON.stringify(LOGO)};
const I_CROWN = ${JSON.stringify(I_CROWN)};
const I_GLASS = ${JSON.stringify(I_GLASS)};
const I_WAVES = ${JSON.stringify(I_WAVES)};

const c = document.getElementById('c'), ctx = c.getContext('2d');
const statusEl = document.getElementById('status');
const dl = document.getElementById('dl');
const W = 1200, H = 630;

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('load failed: ' + src.slice(0, 60)));
    img.src = src;
  });
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function draw() {
  // 色票（深翡翠綠 + 香檳金）
  // -- 背景：深綠→午夜藍 對角漸層
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#081f1b');
  bg.addColorStop(0.55, '#0d3b36');
  bg.addColorStop(1, '#0c2744');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // -- 左側金色徑向光暈（麥迪背後）
  const glow = ctx.createRadialGradient(330, H/2 + 10, 40, 330, H/2 + 10, 520);
  glow.addColorStop(0, 'rgba(244,196,48,0.22)');
  glow.addColorStop(0.5, 'rgba(244,196,48,0.06)');
  glow.addColorStop(1, 'rgba(244,196,48,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // -- 細緻點陣（質感）
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 18; y < H; y += 26) {
    for (let x = 18; x < W; x += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // -- 邊框細線
  ctx.strokeStyle = 'rgba(244,196,48,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, W-60, H-60);
  ctx.strokeStyle = 'rgba(244,196,48,0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, W-88, H-88);

  // -- 左側金色裝飾半弧
  ctx.strokeStyle = 'rgba(244,196,48,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(330, H/2 + 10, 250, -Math.PI*0.35, Math.PI*0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(330, H/2 + 10, 250, Math.PI - Math.PI*0.35, Math.PI + Math.PI*0.35);
  ctx.stroke();

  statusEl.textContent = '載入 logo 與 icons…';
  const [mascot, icCrown, icGlass, icWaves] = await Promise.all([
    loadImage(LOGO),
    loadImage(I_CROWN),
    loadImage(I_GLASS),
    loadImage(I_WAVES),
  ]);

  // -- 麥迪 logo（左側，帶柔和投影）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 12;
  const mSize = 400;
  ctx.drawImage(mascot, 330 - mSize/2, H/2 + 10 - mSize/2, mSize, mSize);
  ctx.restore();

  // ===== 右側文字區 =====
  const xR = 560;
  ctx.textAlign = 'left';

  // -- 頂部小 chip：賽事
  const chipY = 108;
  ctx.fillStyle = 'rgba(244,196,48,0.12)';
  roundRect(xR, chipY, 340, 44, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244,196,48,0.45)';
  ctx.lineWidth = 1.5;
  roundRect(xR, chipY, 340, 44, 22);
  ctx.stroke();
  ctx.fillStyle = '#f4c430';
  ctx.font = 'bold 19px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('世界盃 ·  英超 ·  歐冠', xR + 24, chipY + 22);

  // -- 主標題 Soccer麥迪（香檳金 + 雙層光暈）
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f4c430';
  ctx.shadowColor = 'rgba(244,196,48,0.55)';
  ctx.shadowBlur = 36;
  ctx.font = 'bold 96px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('Soccer麥迪', xR, 244);
  ctx.shadowBlur = 0;

  // -- 副標 足球情報站（淡金 + 細字）
  ctx.fillStyle = '#e8d88b';
  ctx.font = 'bold 50px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('足球情報站', xR, 308);

  // -- 金色分隔線
  const lineGrad = ctx.createLinearGradient(xR, 0, xR + 260, 0);
  lineGrad.addColorStop(0, 'rgba(244,196,48,0.9)');
  lineGrad.addColorStop(1, 'rgba(244,196,48,0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xR, 340);
  ctx.lineTo(xR + 260, 340);
  ctx.stroke();

  // -- Tagline
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '500 26px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.fillText('AI 預測　深度分析　即時情報', xR, 390);

  // ===== Feature icons 三顆 =====
  const feats = [
    { img: icCrown, label: '冠軍預測' },
    { img: icGlass, label: '深度分析' },
    { img: icWaves, label: '即時情報' },
  ];
  const iconBoxSize = 62;
  const iconSize = 38;
  const iconY = 440;
  const gap = 200;

  for (let i = 0; i < feats.length; i++) {
    const bx = xR + i * gap;
    // 金色圓底
    ctx.fillStyle = 'rgba(244,196,48,0.16)';
    ctx.beginPath();
    ctx.arc(bx + iconBoxSize/2, iconY + iconBoxSize/2, iconBoxSize/2, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244,196,48,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // icon 白色
    const ix = bx + (iconBoxSize - iconSize)/2;
    const iy = iconY + (iconBoxSize - iconSize)/2;
    ctx.drawImage(feats[i].img, ix, iy, iconSize, iconSize);
    // label
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 20px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(feats[i].label, bx + iconBoxSize + 14, iconY + iconBoxSize/2);
  }

  // ===== 底部 URL 金帶 =====
  ctx.textBaseline = 'middle';
  const stripH = 56;
  const stripY = H - stripH;
  const stripGrad = ctx.createLinearGradient(0, 0, W, 0);
  stripGrad.addColorStop(0, 'rgba(244,196,48,0.05)');
  stripGrad.addColorStop(0.5, 'rgba(244,196,48,0.22)');
  stripGrad.addColorStop(1, 'rgba(244,196,48,0.05)');
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, stripY, W, stripH);
  ctx.strokeStyle = 'rgba(244,196,48,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, stripY);
  ctx.lineTo(W, stripY);
  ctx.stroke();

  ctx.fillStyle = '#f4c430';
  ctx.font = '700 22px "SF Mono", Consolas, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('worldcup2026-9u0.pages.dev', W/2, stripY + stripH/2);

  statusEl.textContent = '✓ 完成，按下方按鈕下載';
  dl.disabled = false;
}

function save() {
  const a = document.createElement('a');
  a.download = 'og-cover.png';
  a.href = c.toDataURL('image/png');
  a.click();
}

draw().catch(e => {
  statusEl.className = 'err';
  statusEl.textContent = '❌ 失敗：' + e.message;
  console.error(e);
});
</script>
</body>
</html>
`;

fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out, '(' + (html.length / 1024).toFixed(1) + ' KB)');
