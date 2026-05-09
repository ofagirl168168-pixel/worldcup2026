#!/usr/bin/env node
/**
 * push-daily-summary.js
 * 每天 08:00 TW 推「早安球迷」摘要：今日比賽 + 必看分析 + 擂台題
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const url = require('url');
const igRender = require('./_ig-story-render.js');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', '.tg-summary-state.json');
const IG_DIR = path.join(ROOT, 'og', 'ig-story-summary');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const IG_USER_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

const POST_IG = process.argv.includes('--post-ig');

function tdate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}
function tweekdayCN() {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', weekday: 'long' }).format(new Date());
  const map = { Sunday: '日', Monday: '一', Tuesday: '二', Wednesday: '三', Thursday: '四', Friday: '五', Saturday: '六' };
  return map[wd] || wd;
}

function loadJs(file) {
  const sandbox = { window: {}, console: { log: () => {}, warn: () => {}, error: () => {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf-8'), sandbox);
  return sandbox.window;
}

async function loadArticles() {
  const p = path.join(ROOT, 'data', 'articles-index.mjs');
  const mod = await import(url.pathToFileURL(p).href);
  return mod.default;
}

function loadOpinions() {
  const sandbox = { window: {}, module: { exports: {} }, console: { log: () => {}, warn: () => {}, error: () => {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data-opinions.js'), 'utf-8'), sandbox);
  return sandbox.window.DAILY_OPINIONS || [];
}

async function sendTG(text) {
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_CHANNEL,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return r.json();
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function postIgPhase(state) {
  if (!IG_USER_ID || !IG_TOKEN) { console.log('缺 IG token，跳過'); return; }
  if (!state.image_saved || state.ig_media_id) { console.log('沒待發 IG 圖'); return; }
  const today = tdate();
  const imageUrl = `${SITE_URL}/og/ig-story-summary/${today}.png?v=${Date.now()}`;
  console.log(`等 ${imageUrl} deploy...`);
  let ok = false;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(imageUrl, { method: 'HEAD' });
    if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) { ok = true; break; }
    await new Promise(rs => setTimeout(rs, 5000));
  }
  if (!ok) { console.error('圖未 deploy'); return; }
  try {
    const igMediaId = await igRender.postStoryViaApi({ imageUrl, igUserId: IG_USER_ID, igToken: IG_TOKEN });
    state.ig_media_id = igMediaId;
    state.ig_posted_at = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`✓ IG ig_media_id=${igMediaId}`);
  } catch (e) { console.error('IG 發布失敗：', e.message); }
}

(async () => {
  if (!TG_TOKEN || !TG_CHANNEL) { console.error('缺 env'); process.exit(1); }

  const today = tdate();
  let state = { date: '' };
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  }

  if (POST_IG) {
    if (state.date === today) await postIgPhase(state);
    return;
  }

  if (state.date === today) { console.log('Already sent today'); return; }

  // ── 今日比賽 ──
  const eplWin = loadJs('js/epl-data-teams.js');
  const uclTeamsWin = loadJs('js/ucl-data-teams.js');
  const uclMatchWin = loadJs('js/ucl-data-matches.js');
  const eplMatches = (eplWin.EPL_MATCHES || []).filter(m => m.date === today);
  const uclMatches = (uclMatchWin.UCL_MATCHES || []).filter(m => m.date === today);
  const eplTeams = eplWin.EPL_TEAMS || {};
  const uclTeams = uclTeamsWin.UCL_TEAMS || {};

  const matchLines = [
    ...eplMatches.map(m => ({ m, teams: eplTeams, league: 'epl' })),
    ...uclMatches.map(m => ({ m, teams: uclTeams, league: 'ucl' })),
  ]
    .sort((a, b) => (a.m.time || '').localeCompare(b.m.time || ''))
    .map(({ m, teams, league }) => {
      const ht = teams[m.home] || {};
      const at = teams[m.away] || {};
      const home = ht.nameCN || m.home;
      const away = at.nameCN || m.away;
      const tag = league === 'epl' ? '⚽' : '🏆';
      return `${tag} <b>${m.time}</b> ${escapeHtml(home)} vs ${escapeHtml(away)}`;
    });

  // ── 近 36 小時新文章 ──
  const articles = await loadArticles();
  const cutoffDate = new Date(Date.now() - 36 * 3600000).toISOString().slice(0, 10);
  const recent = articles
    .filter(a => a.shareable !== false && a.date >= cutoffDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const articleLines = recent.map(a => {
    const t = String(a.title || '').replace(/^【[^】]*】\s*/, '');
    const trim = t.length > 50 ? t.slice(0, 50) + '…' : t;
    return `📰 ${escapeHtml(trim)}`;
  });

  // ── 今日擂台 ──
  const allOps = loadOpinions();
  const todayOps = allOps.filter(o => {
    if (Array.isArray(o.dates)) return o.dates.includes(today);
    return o.date === today;
  });
  const opLine = todayOps[0]
    ? `🥊 <b>今日擂台：</b>${escapeHtml(todayOps[0].q.length > 60 ? todayOps[0].q.slice(0, 60) + '…' : todayOps[0].q)}`
    : '';

  // ── 組合訊息 ──
  const wd = tweekdayCN();
  const sections = [];
  sections.push(`🌅 <b>早安球迷 ${today} (週${wd})</b>`);
  if (matchLines.length) {
    sections.push(`<b>⚽ 今日比賽（${matchLines.length} 場）</b>\n${matchLines.join('\n')}`);
  } else {
    sections.push('🌴 <i>今日無賽事，休息日好好放空</i>');
  }
  if (articleLines.length) {
    sections.push(`<b>📰 必看分析</b>\n${articleLines.join('\n')}`);
  }
  if (opLine) sections.push(opLine);
  sections.push(`🌍 進站：${SITE_URL}/`);

  const text = sections.join('\n\n');

  const result = await sendTG(text);
  if (!result.ok) {
    console.error('✗ TG:', JSON.stringify(result));
    process.exit(1);
  }

  const stateOut = {
    date: today,
    sent: true,
    msg_id: result.result.message_id,
    matches: matchLines.length,
    articles: articleLines.length,
  };

  // 同時產 IG 限動圖
  if (IG_USER_ID && IG_TOKEN) {
    try {
      const matchesForIg = [
        ...eplMatches.map(m => ({ time: m.time, home: (eplTeams[m.home] || {}).nameCN || m.home, away: (eplTeams[m.away] || {}).nameCN || m.away })),
        ...uclMatches.map(m => ({ time: m.time, home: (uclTeams[m.home] || {}).nameCN || m.home, away: (uclTeams[m.away] || {}).nameCN || m.away })),
      ].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      const articleTitles = recent.map(a => String(a.title || '').replace(/^【[^】]*】\s*/, ''));
      const buf = await igRender.renderSummary({
        date: today, weekday: tweekdayCN(),
        matches: matchesForIg,
        articles: articleTitles,
        opinionQ: todayOps[0] ? todayOps[0].q : '',
      });
      fs.mkdirSync(IG_DIR, { recursive: true });
      fs.writeFileSync(path.join(IG_DIR, `${today}.png`), buf);
      stateOut.image_saved = true;
      console.log('✓ IG image generated');
    } catch (e) {
      console.error('IG image gen 失敗：', e.message);
    }
  }

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(stateOut, null, 2));
  console.log('✓ Pushed daily summary');
})().catch(e => { console.error(e); process.exit(1); });
