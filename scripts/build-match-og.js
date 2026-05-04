#!/usr/bin/env node
/**
 * build-match-og.js
 * 為每場「即將開打 / 剛結束」的 EPL/UCL/WC 比賽產 1200×630 OG 縮圖
 *   輸出 → og/m/<match_id>.png
 *   /m/<match_id> Cloudflare Function 會 fallback 到此 PNG 當 og:image
 *
 * 範圍（避免一次產幾百張）：
 *   - 未來 14 天內未開賽
 *   - 過去 7 天已結束（賽後分享有比分）
 *
 * 用法：
 *   node scripts/build-match-og.js                  # 全掃 + 跳已存在
 *   node scripts/build-match-og.js EPL-MW35-CHE-NFO # 指定某場（強制重畫）
 *   node scripts/build-match-og.js --force          # 全部強制重畫
 */

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'og', 'm');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 字型（同 build-room-og.js）
const FONTS = [
  { p: 'C:/Windows/Fonts/msjh.ttc',   name: 'JhengHei' },
  { p: 'C:/Windows/Fonts/msjhbd.ttc', name: 'JhengHei Bold' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', name: 'JhengHei' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',    name: 'JhengHei Bold' },
];
for (const f of FONTS) if (fs.existsSync(f.p)) GlobalFonts.registerFromPath(f.p, f.name);
const FONT = '"JhengHei", sans-serif';
const FONT_BOLD = '"JhengHei Bold", "JhengHei", sans-serif';

const W = 1200, H = 630;

// 麥迪 logo
const LOGO_PATH = path.join(ROOT, 'img', 'logo-soccermaddy.png');
let LOGO_IMAGE = null;
async function getLogo() {
  if (LOGO_IMAGE !== null) return LOGO_IMAGE;
  try {
    if (fs.existsSync(LOGO_PATH)) LOGO_IMAGE = await loadImage(fs.readFileSync(LOGO_PATH));
    else LOGO_IMAGE = false;
  } catch (e) { LOGO_IMAGE = false; }
  return LOGO_IMAGE;
}

// 載 EPL/UCL/WC 資料（沙箱跑 JS 拿 window 全域）
const sandbox = { window: {}, console: { log: () => {}, warn: () => {}, error: () => {} } };
vm.createContext(sandbox);
function loadJs(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf-8');
  try { vm.runInContext(code, sandbox); }
  catch (e) { console.error(`[load-error] ${file}: ${e.message}`); }
}
loadJs('js/epl-data-teams.js');
loadJs('js/ucl-data-teams.js');
loadJs('js/ucl-data-matches.js');
loadJs('js/data-teams.js');
loadJs('js/data-matches.js');

const EPL_TEAMS   = sandbox.window.EPL_TEAMS   || {};
const EPL_MATCHES = sandbox.window.EPL_MATCHES || [];
const UCL_TEAMS   = sandbox.window.UCL_TEAMS   || {};
const UCL_MATCHES = sandbox.window.UCL_MATCHES || [];
const WC_TEAMS    = sandbox.window.TEAMS       || {};
const WC_SCHEDULE = sandbox.window.SCHEDULE    || [];

// 工具
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTaiwanDateTime(date, time) {
  if (!date) return '';
  const d = date.replace(/-/g, '/').slice(5);
  return time ? `${d} ${time}` : d;
}

async function loadCrest(url) {
  if (!url || !/^https?:/.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await loadImage(buf);
  } catch (e) { return null; }
}

const LEAGUE_THEME = {
  epl: { label: '英超 EPL',  c1: '#37003c', c2: '#240029', glow: 'rgba(196,31,234,0.22)' },
  ucl: { label: '歐冠 UCL',  c1: '#001d6c', c2: '#000a3a', glow: 'rgba(91,115,255,0.25)' },
  wc:  { label: '世界盃 WC', c1: '#7d0a23', c2: '#3d0410', glow: 'rgba(255,87,87,0.22)' },
};

async function renderMatch(match) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const theme = LEAGUE_THEME[match.league] || LEAGUE_THEME.wc;

  // ── 背景：依聯賽主題色漸變 ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, theme.c1);
  grad.addColorStop(0.5, theme.c2);
  grad.addColorStop(1, theme.c1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 角落聯賽色光暈
  const glow1 = ctx.createRadialGradient(W * 0.85, 80, 0, W * 0.85, 80, 420);
  glow1.addColorStop(0, theme.glow);
  glow1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(80, H - 80, 0, 80, H - 80, 360);
  glow2.addColorStop(0, 'rgba(255,215,0,0.16)');
  glow2.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── 左上：logo + Soccer麥迪 ──
  const logo = await getLogo();
  let textX = 60;
  if (logo) {
    const logoSize = 64;
    ctx.drawImage(logo, 60, 80 - logoSize / 2 - 10, logoSize, logoSize);
    textX = 60 + logoSize + 14;
  }
  ctx.font = `bold 32px ${FONT_BOLD}`;
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText('Soccer麥迪', textX, 80);

  // ── 右上：聯賽 badge ──
  ctx.font = `bold 22px ${FONT_BOLD}`;
  const badgeText = theme.label;
  const badgeW = ctx.measureText(badgeText).width + 36;
  const badgeX = W - 60 - badgeW;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, badgeX, 50, badgeW, 42, 21);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, 79);

  // ── 中央：兩隊隊徽 + 名稱 + VS / 比分 ──
  const homeCrest = await loadCrest(match.home_flag);
  const awayCrest = await loadCrest(match.away_flag);

  const cy = 310;
  const crestSize = 170;

  if (homeCrest) ctx.drawImage(homeCrest, W / 2 - 350 - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
  ctx.font = `bold 38px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  let homeText = match.home_name;
  while (homeText.length > 0 && ctx.measureText(homeText).width > 280) homeText = homeText.slice(0, -1);
  if (homeText.length < match.home_name.length) homeText = homeText.slice(0, -1) + '…';
  ctx.fillText(homeText, W / 2 - 350, cy + crestSize / 2 + 60);

  // 中央：VS / 比分 / 進行中
  if (match.status === 'finished' && match.score) {
    ctx.font = `bold 100px ${FONT_BOLD}`;
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`${match.score.h}-${match.score.a}`, W / 2, cy + 32);
  } else if (match.status === 'live') {
    ctx.font = `bold 80px ${FONT_BOLD}`;
    const liveGrad = ctx.createLinearGradient(W / 2 - 80, cy - 40, W / 2 + 80, cy + 40);
    liveGrad.addColorStop(0, '#ff4444');
    liveGrad.addColorStop(1, '#ffaa44');
    ctx.fillStyle = liveGrad;
    ctx.fillText('LIVE', W / 2, cy + 25);
  } else {
    ctx.font = `bold 90px ${FONT_BOLD}`;
    const vsGrad = ctx.createLinearGradient(W / 2 - 60, cy - 50, W / 2 + 60, cy + 50);
    vsGrad.addColorStop(0, '#ff5757');
    vsGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = vsGrad;
    ctx.fillText('VS', W / 2, cy + 30);
  }

  if (awayCrest) ctx.drawImage(awayCrest, W / 2 + 350 - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
  ctx.font = `bold 38px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  let awayText = match.away_name;
  while (awayText.length > 0 && ctx.measureText(awayText).width > 280) awayText = awayText.slice(0, -1);
  if (awayText.length < match.away_name.length) awayText = awayText.slice(0, -1) + '…';
  ctx.fillText(awayText, W / 2 + 350, cy + crestSize / 2 + 60);

  // ── 底部資訊條 ──
  const footerY = H - 90;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, footerY - 30, W, 120);

  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = 'left';
  let leftText;
  if (match.status === 'finished') leftText = '🏁 已結束';
  else if (match.status === 'live') leftText = '🔴 進行中';
  else if (match.date && match.time) leftText = `⏱ ${fmtTaiwanDateTime(match.date, match.time)} 開賽`;
  else leftText = '⏱ 即將開賽';
  ctx.fillStyle = '#fff';
  ctx.fillText(leftText, 60, footerY + 12);

  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('AI 預測 · 點開分析', W - 60, footerY + 12);

  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText(`#${match.id}`, 60, footerY + 50);

  return canvas.toBuffer('image/png');
}

// 把 raw match → 標準化 row（含隊名/旗）
function normalizeMatch(m, teams, league) {
  const home = teams[m.home];
  const away = teams[m.away];
  if (!home || !away) return null;
  return {
    id: m.id,
    league,
    date: m.date || '',
    time: m.time || '',
    home: m.home,
    away: m.away,
    home_name: home.nameCN || home.name || m.home,
    away_name: away.nameCN || away.name || m.away,
    home_flag: home.flag || '',
    away_flag: away.flag || '',
    status: m.status || 'scheduled',
    score: m.score || null,
  };
}

function isInWindow(m) {
  if (!m.date) return false;
  const ts = m.time ? new Date(`${m.date}T${m.time}:00+08:00`).getTime()
                    : new Date(`${m.date}T00:00:00+08:00`).getTime();
  if (isNaN(ts)) return false;
  const now = Date.now();
  // 過去 7 天 ~ 未來 14 天
  return ts > now - 7 * 86400000 && ts < now + 14 * 86400000;
}

(async () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const ids = args.filter(a => !a.startsWith('--'));

  const all = [];
  for (const m of EPL_MATCHES) { const r = normalizeMatch(m, EPL_TEAMS, 'epl'); if (r) all.push(r); }
  for (const m of UCL_MATCHES) { const r = normalizeMatch(m, UCL_TEAMS, 'ucl'); if (r) all.push(r); }
  for (const m of WC_SCHEDULE) { const r = normalizeMatch(m, WC_TEAMS,  'wc');  if (r) all.push(r); }

  let pool;
  if (ids.length > 0) {
    pool = all.filter(m => ids.includes(m.id));
    if (pool.length === 0) console.warn('[WARN] 找不到指定 id：', ids.join(','));
  } else {
    pool = all.filter(isInWindow);
  }

  // skip-existing：cron 跑用，已存在直接跳（除非 --force）
  if (!force && ids.length === 0) {
    const before = pool.length;
    pool = pool.filter(m => !fs.existsSync(path.join(OUT_DIR, `${m.id}.png`)));
    if (before !== pool.length) console.log(`Skip existing: ${before - pool.length} already rendered, ${pool.length} new.`);
  }

  console.log(`Rendering ${pool.length} match OG image(s)...`);
  let ok = 0, fail = 0;
  for (const m of pool) {
    try {
      const buf = await renderMatch(m);
      const out = path.join(OUT_DIR, `${m.id}.png`);
      fs.writeFileSync(out, buf);
      const sizeKB = (buf.length / 1024).toFixed(1);
      console.log(`  ✓ ${m.id}  ${m.home_name} vs ${m.away_name}  (${sizeKB}KB)`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${m.id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n完成：${ok} 成功 / ${fail} 失敗`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
