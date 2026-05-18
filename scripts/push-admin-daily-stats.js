#!/usr/bin/env node
/**
 * push-admin-daily-stats.js
 * 每天 08:30 TW 推「昨日數據摘要」到 admin 專屬 TG chat
 *
 * 環境變數：
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   MADDY_BOT_TOKEN
 *   ADMIN_TG_CHAT_ID（個人 chat、不公開 — 若未設則用 MADDY_CHAT_ID）
 *
 * 用法：
 *   node scripts/push-admin-daily-stats.js          # 推昨日
 *   node scripts/push-admin-daily-stats.js --today  # 推今日（即時偷看）
 *   node scripts/push-admin-daily-stats.js --dry    # 只 console.log、不發 TG
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 讀 scripts/.env.local（本機跑用）；GitHub Actions 則用 secrets
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TG_TOKEN = process.env.MADDY_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_TG_CHAT_ID || process.env.MADDY_CHAT_ID;
const DRY = process.argv.includes('--dry');
const TODAY = process.argv.includes('--today');

if (!SUPA_URL || !SERVICE_KEY) { console.error('缺 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!TG_TOKEN || !ADMIN_CHAT_ID) { console.error('缺 MADDY_BOT_TOKEN / ADMIN_TG_CHAT_ID'); process.exit(1); }

// 台灣昨日 00:00 ~ 今日 00:00 的 UTC ISO 時間
function dailyRangeISO(todayMode = false) {
  const tz = 8 * 3600 * 1000;
  const now = Date.now();
  const todayTwMid = Math.floor((now + tz) / 86400000) * 86400000 - tz;
  const startMs = todayMode ? todayTwMid : todayTwMid - 86400000;
  const endMs   = todayMode ? todayTwMid + 86400000 : todayTwMid;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    label: new Date(startMs + tz).toISOString().slice(0, 10),
  };
}

// PostgREST 撈表 row count（exact、不真的撈資料）
async function tableCount(table, dateCol, start, end, extraQS = '') {
  const url = `${SUPA_URL}/rest/v1/${table}?select=${dateCol}&${dateCol}=gte.${start}&${dateCol}=lt.${end}${extraQS}`;
  const r = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.warn(`[stats] ${table} count failed (${r.status}):`, t.slice(0, 100));
    return null;
  }
  const range = r.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1] || '0', 10);
  return isNaN(total) ? 0 : total;
}

// 撈某張表的 distinct user_id 數
async function distinctUsers(table, dateCol, start, end, userCol = 'user_id') {
  const url = `${SUPA_URL}/rest/v1/${table}?select=${userCol}&${dateCol}=gte.${start}&${dateCol}=lt.${end}`;
  const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  const ids = new Set();
  for (const row of rows) {
    const v = row[userCol];
    if (v != null) ids.add(v);
  }
  return ids.size;
}

// 撈熱門擂台題（昨日票數 top 3）
async function topArenaTopics(start, end) {
  const url = `${SUPA_URL}/rest/v1/opinion_votes?select=opinion_id&created_at=gte.${start}&created_at=lt.${end}`;
  const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return [];
  const rows = await r.json();
  const counts = new Map();
  for (const row of rows) counts.set(row.opinion_id, (counts.get(row.opinion_id) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

// 撈熱門挑戰賽（昨日下注數 top 3）
async function topFriendRooms(start, end) {
  const url = `${SUPA_URL}/rest/v1/friend_picks?select=room_code&created_at=gte.${start}&created_at=lt.${end}`;
  const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
  if (!r.ok) return [];
  const rows = await r.json();
  const counts = new Map();
  for (const row of rows) counts.set(row.room_code, (counts.get(row.room_code) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

function fmtCount(n) {
  if (n == null) return '—';
  return String(n);
}

(async () => {
  const { start, end, label } = dailyRangeISO(TODAY);
  console.log(`[stats] range: ${start} ~ ${end}（${label}）`);

  const [
    newTeams, gachaDraws, coachDraws, matches,
    arenaVotes, arenaComments, fRooms, fPicks, rogueGames, trainings,
    activeMyTeam, activeArena, topArena, topRooms,
  ] = await Promise.all([
    tableCount('my_team',          'created_at',  start, end),
    tableCount('team_player',      'obtained_at', start, end),
    tableCount('user_coach',       'hired_at',    start, end),
    tableCount('match_history',    'played_at',   start, end),
    tableCount('opinion_votes',    'created_at',  start, end),
    tableCount('opinion_comments', 'created_at',  start, end),
    tableCount('friend_rooms',     'created_at',  start, end),
    tableCount('friend_picks',     'created_at',  start, end),
    tableCount('rogue_scores',     'created_at',  start, end),
    tableCount('training_log',     'created_at',  start, end),
    distinctUsers('team_player',   'obtained_at', start, end, 'team_user_id'),
    distinctUsers('opinion_votes', 'created_at',  start, end, 'voter_key'),
    topArenaTopics(start, end),
    topFriendRooms(start, end),
  ]);

  const sections = [];
  sections.push(`📊 <b>${TODAY ? '今日' : '昨日'}數據摘要 ${label}</b>`);

  // 用戶活動
  sections.push(`👥 <b>活躍用戶</b>
🎮 我的隊伍：${fmtCount(activeMyTeam)}
🥊 擂台投票（含路人）：${fmtCount(activeArena)}`);

  // 我的隊伍
  sections.push(`🏟️ <b>我的隊伍</b>
新建隊：${fmtCount(newTeams)}
🎰 球員抽卡：${fmtCount(gachaDraws)} 張
👔 教練抽卡：${fmtCount(coachDraws)} 張
🏋️ 訓練：${fmtCount(trainings)} 次
⚔️ 比賽：${fmtCount(matches)} 場
🎯 射門挑戰：${fmtCount(rogueGames)} 局`);

  // 擂台
  sections.push(`🥊 <b>擂台</b>
🗳️ 投票：${fmtCount(arenaVotes)}
💬 留言：${fmtCount(arenaComments)}`);

  // 挑戰賽
  sections.push(`🤝 <b>麥迪挑戰賽</b>
🏠 開房：${fmtCount(fRooms)}
💰 下注：${fmtCount(fPicks)}`);

  // 熱門 top 3
  if (topArena.length) {
    const lines = topArena.map(([id, n], i) => `${i + 1}. <code>${id}</code> — ${n} 票`);
    sections.push(`🔥 <b>擂台熱門</b>\n${lines.join('\n')}`);
  }
  if (topRooms.length) {
    const lines = topRooms.map(([code, n], i) => `${i + 1}. <code>${code}</code> — ${n} 注`);
    sections.push(`🔥 <b>挑戰賽熱門</b>\n${lines.join('\n')}`);
  }

  const text = sections.join('\n\n');
  console.log('--- TG message ---');
  console.log(text);
  console.log('------------------');

  if (DRY) {
    console.log('[dry] 不實際發 TG');
    return;
  }

  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const result = await r.json();
  if (!result.ok) {
    console.error('✗ TG send failed:', JSON.stringify(result));
    process.exit(1);
  }
  console.log('✓ Sent to admin chat');
})().catch(e => { console.error(e); process.exit(1); });
