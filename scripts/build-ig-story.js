#!/usr/bin/env node
/**
 * build-ig-story.js
 * 為每篇 shareable 文章產生 IG 限動圖（1080×1920 直式）
 * 輸出到 og/ig-story/<id>.png
 *
 * 跟一般 OG 圖（1200×630 橫式）不同：
 *   - IG 限動是手機直式比例
 *   - 上下要留 IG UI 安全區（status bar + reply bar）
 *   - 文字要大（手機看），URL 要明顯（限動連結貼紙不一定能用，URL 直接印上）
 *
 * 用法：
 *   node scripts/build-ig-story.js              # 為所有缺圖的 shareable 文章產
 *   node scripts/build-ig-story.js epl-050      # 只產指定 ID
 *   node scripts/build-ig-story.js --force      # 強制重新生成（覆蓋現有）
 */

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'og', 'ig-story');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 字型
const FONTS = [
  { p: 'C:/Windows/Fonts/msjh.ttc', name: 'JhengHei' },
  { p: 'C:/Windows/Fonts/msjhbd.ttc', name: 'JhengHei Bold' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', name: 'JhengHei' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', name: 'JhengHei Bold' },
];
let fontLoaded = false;
for (const f of FONTS) {
  if (fs.existsSync(f.p)) { GlobalFonts.registerFromPath(f.p, f.name); fontLoaded = true; }
}
if (!fontLoaded) console.warn('[WARN] 沒載到 CJK 字型');
const FONT = '"JhengHei", sans-serif';
const FONT_BOLD = '"JhengHei Bold", "JhengHei", sans-serif';

// 1080x1920 (IG Story 標準比例 9:16)
const W = 1080, H = 1920;
const SITE_URL = 'https://worldcup2026-9u0.pages.dev';
const LOGO_PATH = path.join(ROOT, 'img', 'logo-soccermaddy.png');

// 賽事主題色（同 build-og-images.js 但調過適合手機直式）
const THEMES = {
  wc: {
    bg: ['#081f1b', '#0d3b36', '#0c2744'],
    glow: '#f4c430',
    glowAlpha: 0.28,
    accent: '#f4c430',
    label: 'FIFA WORLD CUP 2026',
    icon: '🌍',
  },
  epl: {
    bg: ['#1a0028', '#37003c', '#2a0048'],
    glow: '#00ff85',
    glowAlpha: 0.22,
    accent: '#00ff85',
    label: 'PREMIER LEAGUE',
    icon: '⚽',
  },
  ucl: {
    bg: ['#01112a', '#0a1a3f', '#142a66'],
    glow: '#9ec5ff',
    glowAlpha: 0.25,
    accent: '#9ec5ff',
    label: 'UEFA CHAMPIONS LEAGUE',
    icon: '🏆',
  },
  all: {
    bg: ['#1a0a06', '#1d0c08', '#0a0405'],
    glow: '#ff6b35',
    glowAlpha: 0.30,
    accent: '#ff6b35',
    label: 'MADDY ARENA',
    icon: '🥊',
  },
};

function hexA(hex, a) {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// 分類 → 中文短標籤（不依賴 emoji 字型，純文字+純色構圖更可靠）
function categoryLabel(cat) {
  const c = String(cat || '');
  if (c.includes('賽前')) return { zh: '賽前', en: 'PRE-MATCH' };
  if (c.includes('賽後')) return { zh: '賽後', en: 'REVIEW' };
  if (c.includes('傷兵')) return { zh: '傷兵', en: 'INJURIES' };
  if (c.includes('球星')) return { zh: '球星', en: 'SPOTLIGHT' };
  if (c.includes('戰術')) return { zh: '戰術', en: 'TACTICS' };
  if (c.includes('黑馬')) return { zh: '黑馬', en: 'DARK HORSE' };
  if (c.includes('小組')) return { zh: '小組', en: 'GROUP' };
  if (c.includes('社群')) return { zh: '擂台', en: 'ARENA' };
  if (c.includes('規則')) return { zh: '解析', en: 'EXPLAINER' };
  if (c.includes('深度')) return { zh: '深度', en: 'DEEP DIVE' };
  if (c.includes('倒數')) return { zh: '倒數', en: 'COUNTDOWN' };
  return { zh: '情報', en: 'INSIGHT' };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 繪文字自動斷行（依字型測寬度）
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let cur = '';
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function loadArticles() {
  const p = path.join(ROOT, 'data', 'articles-index.mjs');
  const mod = await import(url.pathToFileURL(p).href);
  return mod.default;
}

async function getLogo() {
  try {
    if (fs.existsSync(LOGO_PATH)) return await loadImage(fs.readFileSync(LOGO_PATH));
  } catch (e) { /* fall through */ }
  return null;
}

async function renderStory(article, logo) {
  const theme = THEMES[article.tournament] || THEMES.all;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── 背景漸層
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  theme.bg.forEach((c, i) => bg.addColorStop(i / (theme.bg.length - 1), c));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 上下強光（有故事性）
  const top = ctx.createRadialGradient(W / 2, 100, 0, W / 2, 100, 700);
  top.addColorStop(0, hexA(theme.glow, theme.glowAlpha));
  top.addColorStop(1, hexA(theme.glow, 0));
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H);

  const bot = ctx.createRadialGradient(W / 2, H - 200, 0, W / 2, H - 200, 600);
  bot.addColorStop(0, hexA(theme.glow, theme.glowAlpha * 0.6));
  bot.addColorStop(1, hexA(theme.glow, 0));
  ctx.fillStyle = bot;
  ctx.fillRect(0, 0, W, H);

  // ── 上方品牌列（260px 高，位於 IG status bar 之下）
  const brandY = 240;
  if (logo) ctx.drawImage(logo, 80, brandY, 90, 90);
  ctx.font = `bold 50px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText('Soccer麥迪', 195, brandY + 50);
  ctx.font = `500 28px ${FONT}`;
  ctx.fillStyle = theme.accent;
  ctx.fillText('· 麥迪擂台', 195, brandY + 90);

  // ── 賽事標籤（右上角）
  ctx.font = `bold 26px ${FONT_BOLD}`;
  const labelW = ctx.measureText(theme.label).width + 50;
  const labelX = W - labelW - 60;
  ctx.fillStyle = hexA(theme.accent, 0.18);
  roundRect(ctx, labelX, brandY + 25, labelW, 50, 25);
  ctx.fill();
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'left';
  ctx.fillText(theme.label, labelX + 25, brandY + 58);

  // ── 中間 hero — 圓形徽章設計（不用 emoji，純色 + 中英文字體）
  const heroY = 600;
  const heroR = 175;
  const cat = categoryLabel(article.category);
  // 外圈光暈
  const heroGlow = ctx.createRadialGradient(W / 2, heroY, 0, W / 2, heroY, 280);
  heroGlow.addColorStop(0, hexA(theme.accent, 0.45));
  heroGlow.addColorStop(0.6, hexA(theme.accent, 0.1));
  heroGlow.addColorStop(1, hexA(theme.accent, 0));
  ctx.fillStyle = heroGlow;
  ctx.fillRect(0, heroY - 280, W, 560);
  // 細線外框圓
  ctx.strokeStyle = hexA(theme.accent, 0.5);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, heroY, heroR + 25, 0, 2 * Math.PI);
  ctx.stroke();
  // 主圓形（漸層填）
  const heroFill = ctx.createRadialGradient(W / 2, heroY - 30, 20, W / 2, heroY, heroR);
  heroFill.addColorStop(0, hexA(theme.accent, 0.95));
  heroFill.addColorStop(1, hexA(theme.accent, 0.55));
  ctx.fillStyle = heroFill;
  ctx.beginPath();
  ctx.arc(W / 2, heroY, heroR, 0, 2 * Math.PI);
  ctx.fill();
  // 內圓暗背景（讓中文字浮起）
  ctx.fillStyle = hexA('#000000', 0.25);
  ctx.beginPath();
  ctx.arc(W / 2, heroY, heroR - 12, 0, 2 * Math.PI);
  ctx.fill();
  // 中文大字（核心）
  ctx.font = `bold 110px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cat.zh, W / 2, heroY - 12);
  // 英文小字（核心下方）
  ctx.font = `bold 22px ${FONT_BOLD}`;
  ctx.fillStyle = hexA(theme.accent, 1);
  ctx.fillText(cat.en, W / 2, heroY + 78);
  ctx.textBaseline = 'alphabetic';

  // ── 標題（最大區塊，可斷行）
  // 從 articles-index.mjs 拿 title，去掉前綴【...】
  const cleanTitle = (article.title || '').replace(/^【[^】]*】\s*/, '');
  ctx.font = `bold 64px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  const titleLines = wrapText(ctx, cleanTitle, W - 160);
  const titleStartY = 880;
  const lineH = 86;
  ctx.textAlign = 'center';
  // 最多顯示 5 行（避免標題太長爆版）
  const showTitle = titleLines.slice(0, 5);
  showTitle.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleStartY + i * lineH);
  });

  // ── 摘要（標題下方，小字）
  const summaryY = titleStartY + showTitle.length * lineH + 50;
  if (article.summary) {
    ctx.font = `400 32px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    const summaryLines = wrapText(ctx, article.summary, W - 200);
    const showSummary = summaryLines.slice(0, 3);
    showSummary.forEach((line, i) => {
      ctx.fillText(line, W / 2, summaryY + i * 44);
    });
  }

  // ── 底部 CTA 區（移除 emoji 避免字型問題；移除誤導的 URL）
  const ctaY = H - 340;
  // 上方分隔線
  ctx.strokeStyle = hexA(theme.accent, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, ctaY);
  ctx.lineTo(W - 140, ctaY);
  ctx.stroke();

  // 用 canvas 路徑畫一個向上箭頭（取代 👆 emoji，繞開字型問題）
  const arrowCx = W / 2;
  const arrowY = ctaY + 50;
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(arrowCx, arrowY - 15);          // 頂點
  ctx.lineTo(arrowCx + 18, arrowY + 5);      // 右下
  ctx.lineTo(arrowCx + 8, arrowY + 5);       // 右肩
  ctx.lineTo(arrowCx + 8, arrowY + 25);      // 右下角
  ctx.lineTo(arrowCx - 8, arrowY + 25);      // 左下角
  ctx.lineTo(arrowCx - 8, arrowY + 5);       // 左肩
  ctx.lineTo(arrowCx - 18, arrowY + 5);      // 左下
  ctx.closePath();
  ctx.fill();

  // 主 CTA：點連結貼紙（這個 IG 觀眾要自己手動加，但說明清楚比較有點擊動機）
  ctx.font = `bold 40px ${FONT_BOLD}`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.fillText('點上方連結看完整分析', W / 2, ctaY + 110);

  // 副標：IG 帳號（讓觀眾知道是哪個帳號）
  ctx.font = `bold 30px ${FONT_BOLD}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('@168good236', W / 2, ctaY + 165);

  // 副副標：站內品牌（更小灰字）
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('Soccer麥迪 · 麥迪擂台', W / 2, ctaY + 205);

  return canvas.toBuffer('image/png');
}

(async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const targetIds = args.filter(a => !a.startsWith('--'));

  const articles = await loadArticles();
  // 只處理 shareable 文章
  let pool = articles.filter(a => a.shareable !== false);
  if (targetIds.length > 0) {
    pool = pool.filter(a => targetIds.includes(String(a.id)));
  }

  // 沒指定 → 只跑缺圖的
  if (!force && targetIds.length === 0) {
    pool = pool.filter(a => !fs.existsSync(path.join(OUT_DIR, `${a.id}.png`)));
  }

  if (pool.length === 0) {
    console.log('沒有需要產生的 IG 限動圖（指定 --force 強制重新生成）');
    return;
  }

  console.log(`準備產生 ${pool.length} 篇 IG 限動圖...`);
  const logo = await getLogo();
  let ok = 0, fail = 0;
  for (const a of pool) {
    try {
      const buf = await renderStory(a, logo);
      const out = path.join(OUT_DIR, `${a.id}.png`);
      fs.writeFileSync(out, buf);
      const sizeKB = (buf.length / 1024).toFixed(1);
      console.log(`  ✓ ${a.id} (${a.tournament}/${a.category}) → og/ig-story/${a.id}.png  ${sizeKB} KB`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${a.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n完成：${ok} 成功 / ${fail} 失敗 / 共 ${pool.length} 篇`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
