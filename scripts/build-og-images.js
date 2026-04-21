// 幫每篇 shareable 文章產生獨立 OG 縮圖（1200×630）
// 輸出至 og/<id>.png，Cloudflare Pages 會以靜態檔案優先服務（勝過 functions/og/[id].js）
// 用法：node scripts/build-og-images.js
//      node scripts/build-og-images.js epl-027   # 只產單篇
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'og');

// ===== 字型：Microsoft JhengHei (Windows 內建，支援繁中) =====
const FONTS = [
  { p: 'C:/Windows/Fonts/msjh.ttc', name: 'JhengHei' },
  { p: 'C:/Windows/Fonts/msjhbd.ttc', name: 'JhengHei Bold' },
];
for (const f of FONTS) {
  if (fs.existsSync(f.p)) GlobalFonts.registerFromPath(f.p, f.name);
  else console.warn('[WARN] 找不到字型:', f.p);
}
const FONT = '"JhengHei", sans-serif';
const FONT_BOLD = '"JhengHei Bold", "JhengHei", sans-serif';

// ===== 賽事主題色 =====
const THEMES = {
  wc: {
    bg: ['#081f1b', '#0d3b36', '#0c2744'],
    glow: 'rgba(244,196,48,0.22)',
    accent: '#f4c430',
    accentSoft: 'rgba(244,196,48,0.6)',
    accentBg: 'rgba(244,196,48,0.14)',
    label: 'FIFA WORLD CUP 2026',
    subtle: 'rgba(244,196,48,0.35)',
  },
  epl: {
    bg: ['#1a0028', '#37003c', '#2a0048'],
    glow: 'rgba(0,255,133,0.20)',
    accent: '#00ff85',
    accentSoft: 'rgba(0,255,133,0.55)',
    accentBg: 'rgba(0,255,133,0.12)',
    label: 'PREMIER LEAGUE',
    subtle: 'rgba(255,255,255,0.25)',
  },
  ucl: {
    bg: ['#01112a', '#0a1a3f', '#142a66'],
    glow: 'rgba(158,197,255,0.22)',
    accent: '#9ec5ff',
    accentSoft: 'rgba(158,197,255,0.6)',
    accentBg: 'rgba(158,197,255,0.12)',
    label: 'UEFA CHAMPIONS LEAGUE',
    subtle: 'rgba(255,255,255,0.3)',
  },
};

// ===== 分類 → icon + 英文標籤 =====
function categoryInfo(cat) {
  const c = String(cat || '');
  if (c.includes('賽前')) return { iconKey: 'glass', label: 'PRE-MATCH', zh: '賽前分析' };
  if (c.includes('賽後')) return { iconKey: 'waves', label: 'REVIEW', zh: '賽後回顧' };
  if (c.includes('前瞻')) return { iconKey: 'glass', label: 'PREVIEW', zh: '前瞻' };
  if (c.includes('小組')) return { iconKey: 'crown', label: 'GROUP', zh: '小組分析' };
  if (c.includes('回顧')) return { iconKey: 'waves', label: 'RECAP', zh: '賽事回顧' };
  return { iconKey: 'crown', label: 'INSIGHT', zh: cat || '情報' };
}

// ===== 載入文章清單（.mjs 用 dynamic import）=====
async function loadArticles() {
  const p = path.join(ROOT, 'data/articles-index.mjs');
  const mod = await import(url.pathToFileURL(p).href);
  return mod.default;
}

// ===== 畫圓角矩形 =====
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ===== 中/英文混排包裝（中文可逐字斷、英文整詞不拆）=====
// 斷點規則：中文字元之間、空白前後、中文標點後；ASCII 單字 [A-Za-z0-9_'-]+ 視為整體
function isBreakable(ch) {
  if (!ch) return true;
  // ASCII 英文/數字：不可斷
  if (/[A-Za-z0-9_'\-]/.test(ch)) return false;
  // 其餘（中文、標點、空白、Emoji 等）視為可斷
  return true;
}
function wrapText(ctx, text, maxWidth, maxLines) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  let i = 0;
  while (i < chars.length && lines.length < maxLines) {
    const isLast = lines.length === maxLines - 1;
    let fit = i; // 能塞進本行的最後字元 index (exclusive)
    for (let j = i; j <= chars.length; j++) {
      const slice = chars.slice(i, j).join('');
      if (ctx.measureText(slice).width > maxWidth) break;
      fit = j;
    }
    if (fit === i) fit = i + 1; // 至少吃一字避免卡住

    // 嘗試往前找合適斷點（英文詞不拆）
    let breakAt = fit;
    if (fit < chars.length && !isBreakable(chars[fit])) {
      // fit 卡在英文詞中間，往前退到空白或可斷字元後
      let k = fit - 1;
      while (k > i && !isBreakable(chars[k])) k--;
      if (k > i) breakAt = k + 1; // 在可斷字元之後斷開
    }

    let line = chars.slice(i, breakAt).join('').replace(/\s+$/, '');

    if (isLast && breakAt < chars.length) {
      // 塞刪節號
      while (line.length > 0 && ctx.measureText(line + '…').width > maxWidth) {
        line = Array.from(line).slice(0, -1).join('');
      }
      line += '…';
      breakAt = chars.length;
    }
    lines.push(line);
    // 跳過開頭空白
    i = breakAt;
    while (i < chars.length && /\s/.test(chars[i])) i++;
  }
  return lines;
}

// ===== 日期格式化：2026-04-21 → 2026.04.21 =====
function fmtDate(d) {
  if (!d) return '';
  return String(d).replace(/-/g, '.');
}

// ===== 主渲染 =====
async function render(article, assets) {
  const t = THEMES[article.tournament] || THEMES.wc;
  const cat = categoryInfo(article.category);
  const icon = assets.icons[cat.iconKey];

  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ---- 背景漸層
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, t.bg[0]);
  bg.addColorStop(0.55, t.bg[1]);
  bg.addColorStop(1, t.bg[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ---- 左下光暈
  const g = ctx.createRadialGradient(160, H - 120, 40, 160, H - 120, 640);
  g.addColorStop(0, t.glow);
  g.addColorStop(0.5, t.glow.replace(/[\d.]+\)$/, '0.06)'));
  g.addColorStop(1, t.glow.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ---- 細點陣
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 18; y < H; y += 28) {
    for (let x = 18; x < W; x += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- 雙層細邊框
  ctx.strokeStyle = t.subtle;
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.strokeStyle = t.subtle.replace(/[\d.]+\)$/, '0.1)');
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, W - 88, H - 88);

  // ===== 頂部品牌列 =====
  const brandY = 58;
  const brandH = 72;
  // 麥迪 logo（左上）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 14;
  ctx.drawImage(assets.mascot, 70, brandY, brandH, brandH);
  ctx.restore();

  // 品牌文字
  ctx.fillStyle = t.accent;
  ctx.font = `bold 32px ${FONT_BOLD}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.shadowColor = t.accent + '';
  ctx.shadowBlur = 0;
  ctx.fillText('Soccer麥迪', 155, brandY + 22);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 19px ${FONT}`;
  ctx.fillText('足球情報站', 155, brandY + 52);

  // 右上：賽事英文 label + 分隔線
  ctx.textAlign = 'right';
  ctx.fillStyle = t.accentSoft;
  ctx.font = `700 18px ${FONT_BOLD}`;
  ctx.letterSpacing = '2px';
  ctx.fillText(t.label, W - 70, brandY + 28);
  // 下方小副線
  ctx.strokeStyle = t.accentSoft;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W - 70 - ctx.measureText(t.label).width, brandY + 48);
  ctx.lineTo(W - 70, brandY + 48);
  ctx.stroke();

  // 橫分隔線
  ctx.strokeStyle = t.subtle.replace(/[\d.]+\)$/, '0.3)');
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 166);
  ctx.lineTo(W - 70, 166);
  ctx.stroke();

  // ===== 分類 chip + icon =====
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const chipX = 70;
  const chipY = 200;
  const iconSize = 28;
  const chipH = 44;
  // 先量文字寬度以決定 chip 寬
  ctx.font = `bold 20px ${FONT_BOLD}`;
  const chipText = cat.zh;
  const textW = ctx.measureText(chipText).width;
  const chipW = iconSize + 18 + textW + 32;
  ctx.fillStyle = t.accentBg;
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.strokeStyle = t.accentSoft;
  ctx.lineWidth = 1.5;
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.stroke();
  // icon
  ctx.drawImage(icon, chipX + 14, chipY + (chipH - iconSize) / 2, iconSize, iconSize);
  // text
  ctx.fillStyle = t.accent;
  ctx.fillText(chipText, chipX + 14 + iconSize + 8, chipY + chipH / 2);

  // ===== 文章標題 =====
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 54px ${FONT_BOLD}`;
  ctx.textBaseline = 'alphabetic';
  const titleMaxW = W - 140;
  const titleLines = wrapText(ctx, article.title, titleMaxW, 3);
  const titleLineH = 72;
  const titleStartY = 330;
  for (let i = 0; i < titleLines.length; i++) {
    // 輕陰影提升可讀性
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText(titleLines[i], 70, titleStartY + i * titleLineH);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // ===== 底部金色裝飾條 =====
  const stripH = 68;
  const stripY = H - stripH;
  const stripGrad = ctx.createLinearGradient(0, 0, W, 0);
  stripGrad.addColorStop(0, t.accentBg);
  stripGrad.addColorStop(0.5, t.accentBg.replace(/[\d.]+\)$/, '0.28)'));
  stripGrad.addColorStop(1, t.accentBg);
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, stripY, W, stripH);
  ctx.strokeStyle = t.accentSoft;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, stripY);
  ctx.lineTo(W, stripY);
  ctx.stroke();

  // 左側：日期
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = t.accent;
  ctx.font = `700 22px ${FONT_BOLD}`;
  ctx.fillText(fmtDate(article.date), 70, stripY + stripH / 2);

  // 右側：URL
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `600 20px "SF Mono", Consolas, Menlo, monospace`;
  ctx.fillText('worldcup2026-9u0.pages.dev', W - 70, stripY + stripH / 2);

  return canvas.toBuffer('image/png');
}

// ===== main =====
async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const articles = await loadArticles();
  const shareable = articles.filter(a => a.shareable);

  const filterId = process.argv[2];
  const targets = filterId ? shareable.filter(a => a.id === filterId) : shareable;
  if (filterId && targets.length === 0) {
    console.error(`[錯誤] 找不到 id=${filterId} 的 shareable 文章`);
    process.exit(1);
  }

  console.log(`準備產生 ${targets.length} 篇 OG 縮圖…`);

  const assets = {
    mascot: await loadImage(path.join(ROOT, 'img/logo-soccermaddy.png')),
    icons: {
      crown: await loadImage(path.join(ROOT, 'assets/personas/a10-crown.svg')),
      glass: await loadImage(path.join(ROOT, 'assets/personas/a4-magnifying-glass.svg')),
      waves: await loadImage(path.join(ROOT, 'assets/personas/a6-psychic-waves.svg')),
    },
  };

  let ok = 0, skip = 0;
  for (const a of targets) {
    try {
      const buf = await render(a, assets);
      const outPath = path.join(OUT_DIR, `${a.id}.png`);
      fs.writeFileSync(outPath, buf);
      ok++;
      console.log(`  ✓ ${a.id} (${a.tournament}/${a.category}) → og/${a.id}.png  ${(buf.length / 1024).toFixed(1)}KB`);
    } catch (e) {
      skip++;
      console.warn(`  ✗ ${a.id} 失敗：${e.message}`);
    }
  }
  console.log(`\n完成：${ok} 成功 / ${skip} 失敗 / 共 ${targets.length} 篇`);
}

main().catch(e => {
  console.error('致命錯誤：', e);
  process.exit(1);
});
