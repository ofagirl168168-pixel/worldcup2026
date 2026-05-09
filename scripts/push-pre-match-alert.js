#!/usr/bin/env node
/**
 * push-pre-match-alert.js
 * 每 30 分鐘檢查一次：找開賽時間在 50-90 分鐘內、還沒推送過的比賽
 * 推到 TG 頻道：「⚽ X 分鐘後開賽：A vs B」
 *
 * 環境變數：
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHANNEL_ID
 *   SITE_URL（可選）
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', '.tg-prematch-state.json');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

function loadJs(file) {
  const sandbox = { window: {}, console: { log: () => {}, warn: () => {}, error: () => {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf-8'), sandbox);
  return sandbox.window;
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { alerted: [] };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { alerted: [] }; }
}

function saveState(s) {
  // 清掉開賽超過 6 小時的舊紀錄
  const now = Date.now();
  s.alerted = (s.alerted || []).filter(e => e.ko > now - 6 * 3600000);
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function kickoffMs(m) {
  if (!m.date || !m.time) return 0;
  return new Date(`${m.date}T${m.time}:00+08:00`).getTime();
}

function fmtKickoff(ko) {
  const tw = new Date(new Date(ko).toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const dow = ['日','一','二','三','四','五','六'][tw.getDay()];
  const m = String(tw.getMonth() + 1).padStart(2, '0');
  const dd = String(tw.getDate()).padStart(2, '0');
  const hh = String(tw.getHours()).padStart(2, '0');
  const mm = String(tw.getMinutes()).padStart(2, '0');
  return `${m}/${dd}(${dow}) ${hh}:${mm}`;
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

function buildMessage(m, teams, league) {
  const ht = teams[m.home] || {};
  const at = teams[m.away] || {};
  const homeName = ht.nameCN || ht.name || m.home;
  const awayName = at.nameCN || at.name || m.away;
  const ko = kickoffMs(m);
  const minsLeft = Math.round((ko - Date.now()) / 60000);
  const tournament = ({ epl: '英超', ucl: '歐冠' })[league] || league.toUpperCase();
  return `⚽ <b>${minsLeft} 分鐘後開賽</b>

<b>${homeName} vs ${awayName}</b>
🏆 ${tournament} · 📅 ${fmtKickoff(ko)}

🎯 預測比分拿 +20 XP：${SITE_URL}/
🥊 開挑戰賽房間下注：${SITE_URL}/

#${tournament} #賽前提醒`;
}

(async () => {
  if (!TG_TOKEN || !TG_CHANNEL) {
    console.error('缺 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHANNEL_ID');
    process.exit(1);
  }

  const state = loadState();
  const alertedIds = new Set(state.alerted.map(e => e.id));

  const eplWin = loadJs('js/epl-data-teams.js');
  const uclTeamsWin = loadJs('js/ucl-data-teams.js');
  const uclMatchWin = loadJs('js/ucl-data-matches.js');
  const eplMatches = eplWin.EPL_MATCHES || [];
  const uclMatches = uclMatchWin.UCL_MATCHES || [];
  const eplTeams = eplWin.EPL_TEAMS || {};
  const uclTeams = uclTeamsWin.UCL_TEAMS || {};

  const now = Date.now();
  const candidates = [];
  const STARTED = new Set(['live', 'finished', 'ended', 'started']);
  const collect = (matches, teams, league) => {
    for (const m of matches) {
      if (alertedIds.has(m.id)) continue;
      if (STARTED.has(m.status)) continue;
      if (!m.home || !m.away || m.home === 'TBD' || m.away === 'TBD') continue;
      const ko = kickoffMs(m);
      if (!ko) continue;
      const minsLeft = (ko - now) / 60000;
      // 50-90 分鐘窗口（cron 每 30 min 跑一次，視窗 40 min 確保不漏接）
      if (minsLeft >= 50 && minsLeft <= 90) {
        candidates.push({ m, teams, league });
      }
    }
  };
  collect(eplMatches, eplTeams, 'epl');
  collect(uclMatches, uclTeams, 'ucl');

  console.log(`Found ${candidates.length} matches to alert`);
  if (candidates.length === 0) return;

  let sent = 0;
  for (const c of candidates) {
    try {
      const text = buildMessage(c.m, c.teams, c.league);
      const result = await sendTG(text);
      if (result.ok) {
        state.alerted.push({ id: c.m.id, ko: kickoffMs(c.m), at: now });
        saveState(state);
        sent++;
        console.log(`✓ alerted ${c.m.id}`);
        if (sent < candidates.length) await new Promise(r => setTimeout(r, 2000));
      } else {
        console.error(`✗ ${c.m.id}:`, JSON.stringify(result));
      }
    } catch (e) {
      console.error(`✗ ${c.m.id}:`, e.message);
    }
  }
  console.log(`Done: ${sent}/${candidates.length} sent`);
})().catch(e => { console.error(e); process.exit(1); });
