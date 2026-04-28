#!/usr/bin/env node
/**
 * build-room-og.js
 * 為每個朋友直播房產生客製 OG 縮圖（1200×630）→ og/r/<code>.png
 * 社群分享 /r/<code> 時 Cloudflare function 把 og:image 指向這裡
 *
 * 用法：
 *   node scripts/build-room-og.js                          # 為所有 open/locked/live 房產縮圖
 *   node scripts/build-room-og.js OCEQ2X OSHM27            # 指定特定房號
 *   node scripts/build-room-og.js --include-ended          # 連已結束的（24h 內）也產
 *   node scripts/build-room-og.js --skip-existing          # 已有 PNG 的房直接跳過（cron 用）
 */

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'og', 'r');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 字型 — 本機 Windows 用微軟正黑、CI/Linux 用 Noto Sans CJK（apt: fonts-noto-cjk）
const FONTS = [
  { p: 'C:/Windows/Fonts/msjh.ttc',   name: 'JhengHei' },
  { p: 'C:/Windows/Fonts/msjhbd.ttc', name: 'JhengHei Bold' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', name: 'JhengHei' },
  { p: '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',    name: 'JhengHei Bold' },
];
let fontLoaded = false;
for (const f of FONTS) {
  if (fs.existsSync(f.p)) {
    GlobalFonts.registerFromPath(f.p, f.name);
    fontLoaded = true;
  }
}
if (!fontLoaded) console.warn('[WARN] 沒載到任何 CJK 字型 — 中文將顯示為豆腐方塊');
const FONT = '"JhengHei", sans-serif';
const FONT_BOLD = '"JhengHei Bold", "JhengHei", sans-serif';

const W = 1200, H = 630;

// 麥迪 logo（左上角品牌標）— 載入一次重複用
const LOGO_PATH = path.join(ROOT, 'img', 'logo-soccermaddy.png');
let LOGO_IMAGE = null;
async function getLogo() {
  if (LOGO_IMAGE !== null) return LOGO_IMAGE;
  try {
    if (fs.existsSync(LOGO_PATH)) {
      LOGO_IMAGE = await loadImage(fs.readFileSync(LOGO_PATH));
    } else {
      LOGO_IMAGE = false;
    }
  } catch (e) {
    console.warn('[logo fail]', e.message);
    LOGO_IMAGE = false;
  }
  return LOGO_IMAGE;
}

// Supabase
const SUPA_URL = process.env.SUPABASE_URL || 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';
const sb = createClient(SUPA_URL, SUPA_KEY);

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

function fmtTaiwanTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!isFinite(d)) return '';
  const tw = new Date(d.getTime() + 8 * 3600 * 1000);
  const m = String(tw.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(tw.getUTCDate()).padStart(2, '0');
  const hh = String(tw.getUTCHours()).padStart(2, '0');
  const mm = String(tw.getUTCMinutes()).padStart(2, '0');
  return `${m}/${dd} ${hh}:${mm}`;
}

async function loadCrest(url) {
  if (!url || !/^https?:/.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await loadImage(buf);
  } catch (e) {
    console.warn(`[crest fail] ${url}:`, e.message);
    return null;
  }
}

async function renderRoom(room) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const meta = room.match_meta || {};
  const home = String(meta.home_name || meta.home_code || '主隊');
  const away = String(meta.away_name || meta.away_code || '客隊');
  const roomName = String(room.room_name || (room.is_official ? '麥迪官方聯賽' : ''));
  const kickoff = fmtTaiwanTime(room.kickoff_at);
  const bet = room.bet_amount > 0 ? `押 ${room.bet_amount} 💎` : '純娛樂';

  // ── 背景：深藍紫色漸變 ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a1230');
  grad.addColorStop(0.45, '#1a2c6a');
  grad.addColorStop(1, '#0e1430');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 角落金色光暈
  const glow1 = ctx.createRadialGradient(W * 0.85, 80, 0, W * 0.85, 80, 400);
  glow1.addColorStop(0, 'rgba(255,215,0,0.22)');
  glow1.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(80, H - 80, 0, 80, H - 80, 350);
  glow2.addColorStop(0, 'rgba(91,115,255,0.2)');
  glow2.addColorStop(1, 'rgba(91,115,255,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── 上方：品牌 + 房型 ──
  // 麥迪 logo + 「麥迪挑戰賽」文字
  const logo = await getLogo();
  let textX = 60;
  if (logo) {
    const logoSize = 64;
    const logoY = 80 - logoSize / 2 - 10; // 對齊文字 baseline
    ctx.drawImage(logo, 60, logoY, logoSize, logoSize);
    textX = 60 + logoSize + 14;
  }
  ctx.font = `bold 32px ${FONT_BOLD}`;
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText('麥迪挑戰賽', textX, 80);

  // 右上：房型 badge
  let badgeText = room.is_official ? '官方' : (room.is_public ? '公開' : '私人');
  let badgeColor = room.is_official ? '#ffd700' : (room.is_public ? '#6bd09e' : '#b8a4ff');
  ctx.font = `bold 22px ${FONT_BOLD}`;
  const badgeW = ctx.measureText(badgeText).width + 36;
  const badgeX = W - 60 - badgeW;
  ctx.fillStyle = `${badgeColor}22`;
  roundRect(ctx, badgeX, 50, badgeW, 42, 21);
  ctx.fill();
  ctx.fillStyle = badgeColor;
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, 79);

  // ── 房名（若有） ──
  if (roomName) {
    ctx.font = `bold 38px ${FONT_BOLD}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    // 截斷過長
    let title = roomName;
    if (ctx.measureText(title).width > W - 120) {
      while (title.length > 0 && ctx.measureText(title + '…').width > W - 120) title = title.slice(0, -1);
      title = title + '…';
    }
    ctx.fillText(title, 60, 140);
  }

  // ── 中央：兩隊對戰（隊徽 + 名稱 + VS） ──
  const homeCrest = await loadCrest(meta.home_flag);
  const awayCrest = await loadCrest(meta.away_flag);

  const cy = 320; // 中心 y
  const crestSize = 170;

  // 主隊（左）
  if (homeCrest) {
    ctx.drawImage(homeCrest, W / 2 - 350 - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
  }
  ctx.font = `bold 38px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  // 隊名截斷
  let homeText = home;
  while (homeText.length > 0 && ctx.measureText(homeText).width > 280) homeText = homeText.slice(0, -1);
  if (homeText.length < home.length) homeText = homeText.slice(0, -1) + '…';
  ctx.fillText(homeText, W / 2 - 350, cy + crestSize / 2 + 60);

  // VS 中央
  ctx.font = `bold 90px ${FONT_BOLD}`;
  const vsGrad = ctx.createLinearGradient(W / 2 - 60, cy - 50, W / 2 + 60, cy + 50);
  vsGrad.addColorStop(0, '#ff5757');
  vsGrad.addColorStop(1, '#ffd700');
  ctx.fillStyle = vsGrad;
  ctx.fillText('VS', W / 2, cy + 30);

  // 客隊（右）
  if (awayCrest) {
    ctx.drawImage(awayCrest, W / 2 + 350 - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
  }
  ctx.font = `bold 38px ${FONT_BOLD}`;
  ctx.fillStyle = '#fff';
  let awayText = away;
  while (awayText.length > 0 && ctx.measureText(awayText).width > 280) awayText = awayText.slice(0, -1);
  if (awayText.length < away.length) awayText = awayText.slice(0, -1) + '…';
  ctx.fillText(awayText, W / 2 + 350, cy + crestSize / 2 + 60);

  // ── 底部資訊條 ──
  const footerY = H - 90;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, footerY - 30, W, 120);

  // 狀態 / 時間 / 押注 / 房號
  ctx.font = `500 26px ${FONT}`;
  ctx.textAlign = 'left';

  let statusText, statusColor;
  if (room.status === 'ended') {
    statusText = '🏁 已結束';
    statusColor = '#aaa';
  } else if (room.status === 'live') {
    statusText = '🔴 進行中';
    statusColor = '#ff5757';
  } else if (kickoff) {
    statusText = `⏱ ${kickoff} 同步開賽`;
    statusColor = '#fff';
  } else {
    statusText = '⏱ 開放報名中';
    statusColor = '#fff';
  }

  // 已結束特別顯示比分
  if (room.status === 'ended' && room.result_home != null && room.result_away != null) {
    statusText = `🏁 ${room.result_home} - ${room.result_away}`;
    statusColor = '#ffd700';
  }

  ctx.fillStyle = statusColor;
  ctx.fillText(statusText, 60, footerY + 12);

  // 押注（右下）
  ctx.fillStyle = room.bet_amount > 0 ? '#ffd700' : '#aaa';
  ctx.textAlign = 'right';
  ctx.fillText(bet, W - 60, footerY + 12);

  // 房號（左下小字）
  ctx.font = `400 16px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText(`#${room.room_code}`, 60, footerY + 50);

  return canvas.toBuffer('image/png');
}

(async () => {
  const args = process.argv.slice(2);
  const includeEnded = args.includes('--include-ended');
  const skipExisting = args.includes('--skip-existing');
  const codes = args.filter(a => !a.startsWith('--'));

  let rooms;
  if (codes.length > 0) {
    const { data, error } = await sb
      .from('friend_rooms')
      .select('*')
      .in('room_code', codes);
    if (error) { console.error(error); process.exit(1); }
    rooms = data || [];
  } else {
    const statuses = includeEnded ? ['open','locked','live','ended'] : ['open','locked','live'];
    const { data, error } = await sb
      .from('friend_rooms')
      .select('*')
      .in('status', statuses);
    if (error) { console.error(error); process.exit(1); }
    rooms = data || [];
  }

  // --skip-existing：cron 用，已存在 PNG 的房就跳過（避免每 5 min 重畫）
  if (skipExisting) {
    const before = rooms.length;
    rooms = rooms.filter(r => !fs.existsSync(path.join(OUT_DIR, `${r.room_code}.png`)));
    console.log(`Skip-existing: ${before - rooms.length} already rendered, ${rooms.length} new to render.`);
  }

  console.log(`Rendering ${rooms.length} room OG image(s)...`);
  let ok = 0, fail = 0;
  for (const room of rooms) {
    try {
      const buf = await renderRoom(room);
      const out = path.join(OUT_DIR, `${room.room_code}.png`);
      fs.writeFileSync(out, buf);
      const sizeKB = (buf.length / 1024).toFixed(1);
      const meta = room.match_meta || {};
      console.log(`  ✓ ${room.room_code}  ${meta.home_name || ''} vs ${meta.away_name || ''}  → og/r/${room.room_code}.png  ${sizeKB}KB`);
      ok++;
    } catch (e) {
      console.error(`  ✗ ${room.room_code}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n完成：${ok} 成功 / ${fail} 失敗 / 共 ${rooms.length} 房`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
