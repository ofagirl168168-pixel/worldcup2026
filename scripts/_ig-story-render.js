/**
 * _ig-story-render.js
 * 共用 IG 限動圖渲染（3 種 mode：prematch / arena / summary）
 * 每個 push 腳本 require 這個模組，就能產對應的 1080×1920 圖。
 *
 * exports:
 *   renderPrematch({ home, away, kickoffMs, league, homeCrest, awayCrest })
 *   renderArena({ question, options, type, contextText })
 *   renderSummary({ date, weekday, matches, articles, opinionQ })
 *   postStoryViaApi(imageUrl, igUserId, igToken) — 共用 STORIES container 流程
 */

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const W = 1080, H = 1920;
const LOGO_PATH = path.join(ROOT, 'img', 'logo-soccermaddy.png');

// ── 字型一次載入 ──
const FONTS = [
  { p: 'C:/Windows/Fonts/msjh.ttc',   name: 'JhengHei' },
  { p: 'C:/Windows/Fonts/msjhbd.ttc', name: 'JhengHei Bold' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', name: 'JhengHei' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',    name: 'JhengHei Bold' },
];
let _fontLoaded = false;
function _loadFonts() {
  if (_fontLoaded) return;
  for (const f of FONTS) {
    if (fs.existsSync(f.p)) { GlobalFonts.registerFromPath(f.p, f.name); _fontLoaded = true; }
  }
}
_loadFonts();
const FONT = '"JhengHei", sans-serif';
const FONT_BOLD = '"JhengHei Bold", "JhengHei", sans-serif';

// ── 主題色 ──
const THEMES = {
  prematch: {
    bg: ['#0d0a25', '#1d1240', '#2a1855'],
    glow: '#ff6b35', accent: '#ffa733', label: 'PRE-MATCH',
  },
  arena: {
    bg: ['#1f0d05', '#3a1808', '#1a0a04'],
    glow: '#ff6b35', accent: '#ff8c42', label: 'TODAY ARENA',
  },
  summary: {
    bg: ['#0a1a35', '#1e3357', '#3a4f80'],
    glow: '#ffa733', accent: '#ffd54f', label: 'GOOD MORNING',
  },
};

let _logoImg = null;
async function _getLogo() {
  if (_logoImg !== null) return _logoImg;
  try {
    if (fs.existsSync(LOGO_PATH)) _logoImg = await loadImage(fs.readFileSync(LOGO_PATH));
    else _logoImg = false;
  } catch { _logoImg = false; }
  return _logoImg;
}

function _hexA(hex, a) {
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function _fillBg(ctx, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  theme.bg.forEach((c, i) => g.addColorStop(i / (theme.bg.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function _radial(ctx, color, alpha, x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, _hexA(color, alpha));
  g.addColorStop(1, _hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function _wrap(ctx, text, maxW) {
  const lines = [];
  let cur = '';
  for (const ch of String(text || '')) {
    const t = cur + ch;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function _drawHeader(ctx, theme, customBadge) {
  const logo = await _getLogo();
  const brandY = 240;
  if (logo) ctx.drawImage(logo, 80, brandY, 56, 56);
  ctx.font = `bold 50px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText('Soccer麥迪', 150, brandY + 50);
  ctx.font = `500 26px ${FONT}`;
  ctx.fillStyle = theme.accent;
  ctx.fillText('· 麥迪擂台', 150, brandY + 88);

  // Badge
  const labelText = customBadge || theme.label;
  ctx.font = `bold 24px ${FONT_BOLD}`;
  const labelW = ctx.measureText(labelText).width + 40;
  const labelX = W - labelW - 60;
  ctx.fillStyle = _hexA(theme.accent, 0.18);
  _roundRect(ctx, labelX, brandY + 25, labelW, 46, 23);
  ctx.fill();
  ctx.fillStyle = theme.accent;
  ctx.fillText(labelText, labelX + 20, brandY + 56);
}

// 這 3 種類型都是「全自動發」 — 不會有人工 link sticker，
// 所以拿掉「↑ 點上方連結」誤導文案，直接用大字 CTA + IG 帳號
function _drawFooter(ctx, theme, ctaText) {
  const ctaY = H - 320;
  // 分隔線
  ctx.strokeStyle = _hexA(theme.accent, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, ctaY);
  ctx.lineTo(W - 140, ctaY);
  ctx.stroke();

  // 主 CTA（大字、主題色）
  ctx.font = `bold 46px ${FONT_BOLD}`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.shadowColor = _hexA(theme.accent, 0.5);
  ctx.shadowBlur = 18;
  ctx.fillText(ctaText, W / 2, ctaY + 80);
  ctx.shadowBlur = 0;

  // IG 帳號（白色稍小，作為導引到 bio link）
  ctx.font = `bold 36px ${FONT_BOLD}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('@168good236', W / 2, ctaY + 155);

  // 主頁簡介有連結 提示（小字、灰）
  ctx.font = `400 26px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('主頁簡介點連結進站', W / 2, ctaY + 200);
}

// 從 URL 載入隊徽（網路失敗回 null，不會中斷渲染）
async function _loadCrest(url) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return await loadImage(buf);
  } catch {
    return null;
  }
}

// 以 (cx, cy) 為圓心畫圓形隊徽（含背景光暈），尺寸=size
function _drawCrest(ctx, img, cx, cy, size, theme) {
  // 圓形底（用主題色淡色，增加層次 + 隊徽是透明背景時也有依託）
  ctx.save();
  ctx.fillStyle = _hexA(theme.accent, 0.18);
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 14, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = _hexA(theme.accent, 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();
  if (img) {
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  } else {
    // 沒抓到圖：畫一個球符號當 placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `bold ${Math.round(size * 0.6)}px ${FONT_BOLD}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚽', cx, cy);
  }
  ctx.restore();
}

// ═══════════════════════ PREMATCH ═══════════════════════
async function renderPrematch({ home, away, kickoffMs, league, homeCrest, awayCrest }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const theme = THEMES.prematch;
  _fillBg(ctx, theme);
  _radial(ctx, theme.glow, 0.45, W / 2, 700, 800);

  // 平行 load 兩個隊徽，與其他繪製動作不衝突
  const [homeImg, awayImg] = await Promise.all([_loadCrest(homeCrest), _loadCrest(awayCrest)]);

  await _drawHeader(ctx, theme, 'PRE-MATCH ALERT');

  // 倒數大字
  const minsLeft = Math.max(0, Math.round((kickoffMs - Date.now()) / 60000));
  ctx.font = `bold 130px ${FONT_BOLD}`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.shadowColor = _hexA(theme.glow, 0.6);
  ctx.shadowBlur = 30;
  ctx.fillText(`${minsLeft} 分後`, W / 2, 540);
  ctx.font = `bold 70px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('開賽', W / 2, 620);
  ctx.shadowBlur = 0;

  // VS 對戰：兩側隊徽 + 中央 VS
  const cy = 970;
  const crestSize = 220;
  const crestY = cy;
  const homeCx = 260;
  const awayCx = W - 260;

  _drawCrest(ctx, homeImg, homeCx, crestY, crestSize, theme);
  _drawCrest(ctx, awayImg, awayCx, crestY, crestSize, theme);

  // 中央 VS（用漸層色）
  ctx.font = `bold 130px ${FONT_BOLD}`;
  const vsGrad = ctx.createLinearGradient(W / 2 - 80, cy - 60, W / 2 + 80, cy + 60);
  vsGrad.addColorStop(0, '#ff5757');
  vsGrad.addColorStop(1, '#ffd700');
  ctx.fillStyle = vsGrad;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = _hexA(theme.glow, 0.5);
  ctx.shadowBlur = 25;
  ctx.fillText('VS', W / 2, cy + 30);
  ctx.shadowBlur = 0;

  // 隊名（隊徽底下）
  const nameY = crestY + crestSize / 2 + 78;
  ctx.font = `bold 38px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  const fitName = (name, maxW) => {
    let t = String(name || '');
    if (ctx.measureText(t).width <= maxW) return t;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  };
  ctx.fillText(fitName(home, 380), homeCx, nameY);
  ctx.fillText(fitName(away, 380), awayCx, nameY);

  // 賽事標籤 + 開賽時間
  const tw = new Date(new Date(kickoffMs).toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const dow = ['日','一','二','三','四','五','六'][tw.getDay()];
  const m = String(tw.getMonth() + 1).padStart(2, '0');
  const dd = String(tw.getDate()).padStart(2, '0');
  const hh = String(tw.getHours()).padStart(2, '0');
  const mm = String(tw.getMinutes()).padStart(2, '0');
  const tournament = ({ epl: '英超', ucl: '歐冠', wc: '世足' })[league] || String(league || '').toUpperCase();
  ctx.font = `500 36px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${tournament} · ${m}/${dd} (${dow}) ${hh}:${mm}`, W / 2, nameY + 100);

  _drawFooter(ctx, theme, '預測比分拿 +20 XP');
  return canvas.toBuffer('image/png');
}

// ═══════════════════════ ARENA ═══════════════════════
async function renderArena({ question, options, type }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const theme = THEMES.arena;
  _fillBg(ctx, theme);
  _radial(ctx, theme.glow, 0.42, W / 2, 700, 800);

  const typeMap = {
    trending: '熱議題',
    predict: '預測題',
    classic: '經典題',
    fun: '趣味題',
  };
  await _drawHeader(ctx, theme, (typeMap[type] || '擂台題').toUpperCase());

  // 標題（居中大字）
  ctx.font = `bold 64px ${FONT_BOLD}`;
  ctx.fillStyle = theme.accent;
  ctx.textAlign = 'center';
  ctx.fillText('今日麥迪擂台', W / 2, 460);

  // 問題（自動斷行，最多 4 行）
  ctx.font = `bold 50px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  const qLines = _wrap(ctx, question, W - 140);
  const showQ = qLines.slice(0, 4);
  showQ.forEach((line, i) => {
    ctx.fillText(line, W / 2, 580 + i * 70);
  });

  // 4 選項
  const optY = 580 + showQ.length * 70 + 80;
  options.slice(0, 4).forEach((opt, i) => {
    const y = optY + i * 110;
    // box
    ctx.fillStyle = _hexA(theme.accent, 0.15);
    _roundRect(ctx, 100, y, W - 200, 90, 16);
    ctx.fill();
    ctx.strokeStyle = _hexA(theme.accent, 0.4);
    ctx.lineWidth = 2;
    ctx.stroke();
    // 編號圓
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(150, y + 45, 28, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 32px ${FONT_BOLD}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), 150, y + 55);
    // 文字
    ctx.font = `500 30px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    let optText = String(opt || '');
    while (ctx.measureText(optText).width > W - 320) optText = optText.slice(0, -1);
    if (optText.length < String(opt).length) optText = optText.slice(0, -1) + '…';
    ctx.fillText(optText, 200, y + 56);
  });

  _drawFooter(ctx, theme, '進站投票 +20 XP');
  return canvas.toBuffer('image/png');
}

// ═══════════════════════ SUMMARY ═══════════════════════
async function renderSummary({ date, weekday, matches, articles, opinionQ }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const theme = THEMES.summary;
  _fillBg(ctx, theme);
  _radial(ctx, '#ffa733', 0.35, W / 2, 200, 700);

  await _drawHeader(ctx, theme, 'DAILY SUMMARY');

  // Title
  ctx.font = `bold 70px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('早安球迷', W / 2, 470);
  ctx.font = `500 38px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`${date}（週${weekday}）`, W / 2, 530);

  let y = 660;
  ctx.textAlign = 'left';

  // 比賽
  if (matches && matches.length) {
    ctx.font = `bold 38px ${FONT_BOLD}`;
    ctx.fillStyle = theme.accent;
    ctx.fillText(`今日 ${matches.length} 場比賽`, 90, y);
    y += 60;
    ctx.font = `500 32px ${FONT}`;
    ctx.fillStyle = '#fff';
    matches.slice(0, 5).forEach(m => {
      let line = `• ${m.time} ${m.home} vs ${m.away}`;
      while (ctx.measureText(line).width > W - 180) line = line.slice(0, -1);
      ctx.fillText(line, 110, y);
      y += 48;
    });
  } else {
    ctx.font = `500 36px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('今日無賽事，休息日好好放空', 90, y);
    y += 60;
  }

  // 文章
  if (articles && articles.length) {
    y += 30;
    ctx.font = `bold 38px ${FONT_BOLD}`;
    ctx.fillStyle = theme.accent;
    ctx.fillText('必看分析', 90, y);
    y += 56;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillStyle = '#fff';
    articles.slice(0, 3).forEach(t => {
      const lines = _wrap(ctx, '• ' + t, W - 200);
      lines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, i === 0 ? 110 : 130, y);
        y += 42;
      });
    });
  }

  // 擂台
  if (opinionQ) {
    y += 30;
    ctx.font = `bold 38px ${FONT_BOLD}`;
    ctx.fillStyle = theme.accent;
    ctx.fillText('今日擂台', 90, y);
    y += 56;
    ctx.font = `500 30px ${FONT}`;
    ctx.fillStyle = '#fff';
    const opLines = _wrap(ctx, opinionQ, W - 200);
    opLines.slice(0, 3).forEach(line => {
      ctx.fillText(line, 110, y);
      y += 42;
    });
  }

  _drawFooter(ctx, theme, '進站看完整內容');
  return canvas.toBuffer('image/png');
}

// ═══════════════════════ POST TO IG ═══════════════════════
async function postStoryViaApi({ imageUrl, igUserId, igToken }) {
  // 1. Create container
  const createParams = new URLSearchParams({
    image_url: imageUrl,
    media_type: 'STORIES',
    access_token: igToken,
  });
  const r1 = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: 'POST', body: createParams,
  });
  const d1 = await r1.json();
  if (!r1.ok || !d1.id) throw new Error(`create container failed: ${JSON.stringify(d1)}`);
  const containerId = d1.id;

  // 2. Poll ready
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${igToken}`);
    const d = await r.json();
    if (d.status_code === 'FINISHED') break;
    if (d.status_code === 'ERROR') throw new Error(`container error: ${JSON.stringify(d)}`);
    await new Promise(rs => setTimeout(rs, 3000));
  }

  // 3. Publish
  const pubParams = new URLSearchParams({
    creation_id: containerId,
    access_token: igToken,
  });
  const r2 = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: 'POST', body: pubParams,
  });
  const d2 = await r2.json();
  if (!r2.ok || !d2.id) throw new Error(`publish failed: ${JSON.stringify(d2)}`);
  return d2.id; // ig_media_id
}

module.exports = {
  W, H,
  renderPrematch,
  renderArena,
  renderSummary,
  postStoryViaApi,
};
