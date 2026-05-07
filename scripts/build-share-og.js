#!/usr/bin/env node
/**
 * build-share-og.js
 * 為 4 種爽感分享卡 variant 各自產生 1200×630 OG 縮圖 → og/s/<variant>.png
 * Cloudflare function /s/<variant> 會把 og:image 指向這裡
 *
 * 用法：node scripts/build-share-og.js
 */

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'og', 's');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 字型 — 本機 Windows 微軟正黑、CI/Linux Noto Sans CJK
const FONTS = [
  { p: 'C:/Windows/Fonts/msjh.ttc',   name: 'JhengHei' },
  { p: 'C:/Windows/Fonts/msjhbd.ttc', name: 'JhengHei Bold' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', name: 'JhengHei' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',    name: 'JhengHei Bold' },
];
let fontLoaded = false;
for (const f of FONTS) {
  if (fs.existsSync(f.p)) { GlobalFonts.registerFromPath(f.p, f.name); fontLoaded = true; }
}
if (!fontLoaded) console.warn('[WARN] 沒載到 CJK 字型 — 中文將顯示為豆腐方塊');
const FONT = '"JhengHei", sans-serif';
const FONT_BOLD = '"JhengHei Bold", "JhengHei", sans-serif';

const W = 1200, H = 630;
const LOGO_PATH = path.join(ROOT, 'img', 'logo-soccermaddy.png');

function hexA(hex, alpha) {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillBg(ctx, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function radialGlow(ctx, color, alpha, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawBrand(ctx, accent, logo) {
  if (logo) ctx.drawImage(logo, 60, 50, 56, 56);
  ctx.font = `bold 30px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText('Soccer麥迪', 130, 80);
  ctx.font = `500 18px ${FONT}`;
  ctx.fillStyle = accent;
  ctx.fillText('· 麥迪擂台', 130, 105);
}

function drawBadge(ctx, text, color) {
  ctx.font = `bold 20px ${FONT_BOLD}`;
  const padX = 18;
  const w = ctx.measureText(text).width + padX * 2;
  const x = W - 60 - w, y = 56;
  ctx.fillStyle = hexA(color, 0.18);
  roundRect(ctx, x, y, w, 38, 19);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + padX, y + 26);
}

function drawFooter(ctx, accent, ctaText) {
  ctx.font = `bold 30px ${FONT_BOLD}`;
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.shadowColor = hexA(accent, 0.6);
  ctx.shadowBlur = 18;
  ctx.fillText(ctaText, W / 2, H - 38);
  ctx.shadowBlur = 0;
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

function drawTitle(ctx, text, y, gradFrom, gradTo) {
  ctx.font = `bold 96px ${FONT_BOLD}`;
  ctx.textAlign = 'center';
  const tg = ctx.createLinearGradient(0, y - 60, 0, y + 10);
  tg.addColorStop(0, gradFrom);
  tg.addColorStop(1, gradTo);
  ctx.fillStyle = tg;
  ctx.fillText(text, W / 2, y);
}

function drawSubtitle(ctx, text, y) {
  ctx.font = `500 32px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y);
}

// ── 火焰（path）──
function drawFlame(ctx, cx, cy, h, dark, light) {
  const w = h * 0.65;
  ctx.save();
  ctx.shadowColor = dark;
  ctx.shadowBlur = 30;
  // 外（深色）
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.5);
  ctx.bezierCurveTo(cx - w * 0.7, cy + h * 0.3, cx - w * 0.6, cy - h * 0.1, cx - w * 0.2, cy - h * 0.2);
  ctx.bezierCurveTo(cx - w * 0.3, cy - h * 0.4, cx - w * 0.1, cy - h * 0.5, cx, cy - h * 0.5);
  ctx.bezierCurveTo(cx + w * 0.1, cy - h * 0.5, cx + w * 0.3, cy - h * 0.4, cx + w * 0.2, cy - h * 0.2);
  ctx.bezierCurveTo(cx + w * 0.6, cy - h * 0.1, cx + w * 0.7, cy + h * 0.3, cx, cy + h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // 內（亮色）
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(cx, cy + h * 0.4);
  ctx.bezierCurveTo(cx - w * 0.4, cy + h * 0.2, cx - w * 0.35, cy - h * 0.05, cx - w * 0.1, cy - h * 0.1);
  ctx.bezierCurveTo(cx - w * 0.15, cy - h * 0.25, cx - w * 0.05, cy - h * 0.3, cx, cy - h * 0.3);
  ctx.bezierCurveTo(cx + w * 0.05, cy - h * 0.3, cx + w * 0.15, cy - h * 0.25, cx + w * 0.1, cy - h * 0.1);
  ctx.bezierCurveTo(cx + w * 0.35, cy - h * 0.05, cx + w * 0.4, cy + h * 0.2, cx, cy + h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── 4 角閃星 ──
function drawSpark(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.3, cy - size * 0.3);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.3);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.3, cy + size * 0.3);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx - size * 0.3, cy - size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── 人形剪影 ──
function drawPerson(ctx, cx, cy, h, color, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
  ctx.fillStyle = color;
  // 頭
  ctx.beginPath();
  ctx.arc(cx, cy - h * 0.3, h * 0.22, 0, 2 * Math.PI);
  ctx.fill();
  // 身體（半圓肩 + 矩形）
  ctx.beginPath();
  ctx.moveTo(cx - h * 0.45, cy + h * 0.05);
  ctx.arc(cx, cy + h * 0.05, h * 0.45, Math.PI, 2 * Math.PI);
  ctx.lineTo(cx + h * 0.45, cy + h * 0.6);
  ctx.lineTo(cx - h * 0.45, cy + h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ═══════════════════════ STREAK ═══════════════════════
async function renderStreak(logo) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillBg(ctx, '#1a0a06', '#0a0405');
  radialGlow(ctx, '#ff6b35', 0.42, W / 2, 0, 750);
  radialGlow(ctx, '#c0392b', 0.22, W / 2, H, 500);

  drawBrand(ctx, '#ff6b35', logo);
  drawBadge(ctx, 'STREAK MILESTONE', '#ff6b35');

  // 三朵火焰
  drawFlame(ctx, W / 2 - 230, 305, 150, '#c0392b', '#ffd54f');
  drawFlame(ctx, W / 2,        260, 220, '#e74c3c', '#fff7e0');
  drawFlame(ctx, W / 2 + 230, 305, 150, '#c0392b', '#ffd54f');

  drawTitle(ctx, '連勝挑戰', 480, '#fff7e0', '#ff6b35');
  drawSubtitle(ctx, '你能撐幾天？跟我比比看誰先斷', 530);
  drawFooter(ctx, '#ff6b35', '加入麥迪擂台 →');

  return canvas.toBuffer('image/png');
}

// ═══════════════════════ PREDICT-WIN ═══════════════════════
async function renderPredictWin(logo) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillBg(ctx, '#1a1408', '#0f0d05');
  radialGlow(ctx, '#ffc850', 0.4, W / 2, 280, 480);

  drawBrand(ctx, '#ffc850', logo);
  drawBadge(ctx, 'PREDICT · WIN', '#ffc850');

  // 牛眼靶心
  const cx = W / 2, cy = 290;
  // 外環（虛線感）
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,200,80,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, 170, 0, 2 * Math.PI); ctx.stroke();
  // 中環
  ctx.strokeStyle = 'rgba(255,200,80,0.65)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, 120, 0, 2 * Math.PI); ctx.stroke();
  // 內圓填色
  const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75);
  ig.addColorStop(0, '#fff7d6');
  ig.addColorStop(0.6, '#ffc850');
  ig.addColorStop(1, '#a87a1c');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(cx, cy, 70, 0, 2 * Math.PI); ctx.fill();
  // 中心命中點
  ctx.fillStyle = '#5a3a10';
  ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = '#ffe082';
  ctx.shadowColor = '#ffe082'; ctx.shadowBlur = 25;
  ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 2 * Math.PI); ctx.fill();
  ctx.shadowBlur = 0;

  // 閃星
  drawSpark(ctx, cx + 200, cy - 110, 18, '#ffe082');
  drawSpark(ctx, cx - 220, cy + 70,  16, '#ffe082');
  drawSpark(ctx, cx + 150, cy + 150, 14, '#ffe082');
  drawSpark(ctx, cx - 170, cy - 140, 12, '#ffe082');

  drawTitle(ctx, '預測命中', 510, '#fff7d6', '#ffc850');
  drawSubtitle(ctx, '敢來一起預測嗎？看誰眼光毒辣', 558);
  drawFooter(ctx, '#ffc850', '一起來預測 →');

  return canvas.toBuffer('image/png');
}

// ═══════════════════════ MINORITY ═══════════════════════
async function renderMinority(logo) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillBg(ctx, '#1a1138', '#0a0820');
  radialGlow(ctx, '#a78bfa', 0.28, W / 2, 290, 600);

  // 對角線條紋（淡）
  ctx.save();
  ctx.strokeStyle = 'rgba(167,139,250,0.07)';
  ctx.lineWidth = 1;
  for (let x = -H; x < W; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H, H);
    ctx.stroke();
  }
  ctx.restore();

  drawBrand(ctx, '#a78bfa', logo);
  drawBadge(ctx, 'MINORITY VOICE', '#a78bfa');

  // 10 個人形（中央 2 個高亮）
  const total = 10, gap = 86;
  const totalW = (total - 1) * gap;
  const startX = W / 2 - totalW / 2;
  const py = 290, fSize = 70;
  const onIdx = [3, 6];
  for (let i = 0; i < total; i++) {
    const x = startX + i * gap;
    const isOn = onIdx.includes(i);
    drawPerson(ctx, x, py, fSize, isOn ? '#a78bfa' : 'rgba(167,139,250,0.25)', isOn);
  }

  drawTitle(ctx, '我是少數派', 480, '#ffffff', '#a78bfa');
  drawSubtitle(ctx, '你跟大眾一樣嗎？來投一票看看', 530);
  drawFooter(ctx, '#a78bfa', '看朋友站哪邊 →');

  return canvas.toBuffer('image/png');
}

// ═══════════════════════ QUIZ-CORRECT ═══════════════════════
async function renderQuizCorrect(logo) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillBg(ctx, '#06180f', '#03100a');
  radialGlow(ctx, '#6bd09e', 0.42, W / 2, 290, 500);

  drawBrand(ctx, '#6bd09e', logo);
  drawBadge(ctx, 'DAILY QUIZ · CORRECT', '#6bd09e');

  // 爆發環
  const cx = W / 2, cy = 290;
  ctx.strokeStyle = 'rgba(107,208,158,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 180, 0, 2 * Math.PI); ctx.stroke();
  ctx.strokeStyle = 'rgba(107,208,158,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 135, 0, 2 * Math.PI); ctx.stroke();
  // 內光暈
  const ig = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110);
  ig.addColorStop(0, 'rgba(107,208,158,0.55)');
  ig.addColorStop(1, 'rgba(107,208,158,0)');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(cx, cy, 110, 0, 2 * Math.PI); ctx.fill();

  // 大勾
  ctx.strokeStyle = '#7befb0';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#6bd09e';
  ctx.shadowBlur = 35;
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy + 8);
  ctx.lineTo(cx - 18, cy + 60);
  ctx.lineTo(cx + 75, cy - 50);
  ctx.stroke();
  ctx.shadowBlur = 0;

  drawTitle(ctx, '答對了！', 510, '#ffffff', '#6bd09e');
  drawSubtitle(ctx, '考考朋友看誰先答對', 558);
  drawFooter(ctx, '#6bd09e', '考考朋友 →');

  return canvas.toBuffer('image/png');
}

(async () => {
  let logo = null;
  try {
    if (fs.existsSync(LOGO_PATH)) {
      logo = await loadImage(fs.readFileSync(LOGO_PATH));
    } else {
      console.warn('[WARN] logo 找不到:', LOGO_PATH);
    }
  } catch (e) { console.warn('[logo fail]', e.message); }

  const renders = {
    'streak':       renderStreak,
    'predict-win':  renderPredictWin,
    'minority':     renderMinority,
    'quiz-correct': renderQuizCorrect,
  };

  for (const [k, fn] of Object.entries(renders)) {
    const buf = await fn(logo);
    const out = path.join(OUT_DIR, `${k}.png`);
    fs.writeFileSync(out, buf);
    const sizeKB = (buf.length / 1024).toFixed(1);
    console.log(`  ✓ og/s/${k}.png  ${sizeKB} KB`);
  }
  console.log('完成 — 4 張分享 OG 圖已產生');
})().catch(e => { console.error(e); process.exit(1); });
