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
const url = require('url');
const igRender = require('./_ig-story-render.js');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', '.tg-prematch-state.json');
const IG_DIR = path.join(ROOT, 'og', 'ig-story-prematch');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const IG_USER_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

const POST_IG = process.argv.includes('--post-ig');

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

// 找對應這場比賽的賽前分析文章（標題包含主客隊名 + 日期相符 + 還沒踢完）
//   articles：articles-index.mjs 載入後的陣列
function _findPrematchArticle(articles, homeName, awayName, matchDate) {
  if (!articles || !homeName || !awayName) return null;
  // 比賽日 ±1 天內、標題含「賽前分析」或「賽前」+ 雙方隊名
  const dateOk = (ad) => {
    if (!ad) return false;
    const diffMs = new Date(matchDate).getTime() - new Date(ad).getTime();
    const diffDay = Math.abs(diffMs / 86400000);
    return diffDay <= 2;
  };
  return articles.find(a => {
    if (!a.shareable) return false;
    if (!dateOk(a.date)) return false;
    const title = String(a.title || '');
    if (!/賽前/.test(title)) return false;
    return title.includes(homeName) && title.includes(awayName);
  }) || null;
}

function buildMessage(m, teams, league, prematchArticle) {
  const ht = teams[m.home] || {};
  const at = teams[m.away] || {};
  const homeName = ht.nameCN || ht.name || m.home;
  const awayName = at.nameCN || at.name || m.away;
  const ko = kickoffMs(m);
  const minsLeft = Math.round((ko - Date.now()) / 60000);
  const tournament = ({ epl: '英超', ucl: '歐冠' })[league] || league.toUpperCase();
  // 賽前分析 CTA：若找到對應文章、直接連到文章；否則連首頁
  const previewUrl = prematchArticle
    ? `${SITE_URL}/article/${encodeURIComponent(prematchArticle.id)}`
    : `${SITE_URL}/`;
  return `⚽ <b>${minsLeft} 分鐘後開賽</b>

<b>${homeName} vs ${awayName}</b>
🏆 ${tournament} · 📅 ${fmtKickoff(ko)}

🔍 進網站查看完整賽前分析：${previewUrl}
🎯 預測比分拿 +20 XP：${SITE_URL}/
🥊 開挑戰賽房間下注：${SITE_URL}/

#${tournament} #賽前提醒`;
}

async function postIgPhase(state) {
  if (!IG_USER_ID || !IG_TOKEN) {
    console.log('缺 IG token，跳過 --post-ig 階段');
    return;
  }
  // 找出有圖、未發 IG、且比賽還沒開賽（避免 token 修好後補貼昨天的過期圖）
  const now = Date.now();
  const stale = state.alerted.filter(e => e.image_saved && !e.ig_media_id && e.ko && e.ko <= now);
  if (stale.length) {
    console.log(`⏰ ${stale.length} 個過期 entry 已開賽，跳過不補發 IG（避免「昨日比賽今天提醒」bug）`);
    for (const e of stale) {
      e.ig_skipped_stale = true;
      e.ig_skipped_at = new Date(now).toISOString();
    }
    saveState(state);
  }
  const todo = state.alerted.filter(e => e.image_saved && !e.ig_media_id && e.ko && e.ko > now && !e.ig_skipped_stale);
  console.log(`--post-ig: 待發 IG 限動 ${todo.length} 篇（已排除過期 ${stale.length} 篇）`);
  for (const e of todo) {
    try {
      const imageUrl = `${SITE_URL}/og/ig-story-prematch/${e.id}.png?v=${Date.now()}`;
      console.log(`  ${e.id}: 等 ${imageUrl} deploy...`);
      // 簡單重試 6 次（每次 5 秒）
      let ok = false;
      for (let i = 0; i < 6; i++) {
        const r = await fetch(imageUrl, { method: 'HEAD' });
        if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) { ok = true; break; }
        await new Promise(rs => setTimeout(rs, 5000));
      }
      if (!ok) { console.error(`  ${e.id}: 圖未 deploy 跳過`); continue; }
      const igMediaId = await igRender.postStoryViaApi({ imageUrl, igUserId: IG_USER_ID, igToken: IG_TOKEN });
      e.ig_media_id = igMediaId;
      e.ig_posted_at = new Date().toISOString();
      saveState(state);
      console.log(`  ✓ ${e.id} → ig_media_id=${igMediaId}`);
      await new Promise(rs => setTimeout(rs, 3000));
    } catch (err) {
      console.error(`  ✗ ${e.id}: ${err.message}`);
    }
  }
}

(async () => {
  if (!TG_TOKEN || !TG_CHANNEL) {
    console.error('缺 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHANNEL_ID');
    process.exit(1);
  }

  const state = loadState();

  // --post-ig 模式：只跑 IG 上傳，不再 TG
  if (POST_IG) {
    await postIgPhase(state);
    return;
  }

  const alertedIds = new Set(state.alerted.map(e => e.id));

  const eplWin = loadJs('js/epl-data-teams.js');
  const uclTeamsWin = loadJs('js/ucl-data-teams.js');
  const uclMatchWin = loadJs('js/ucl-data-matches.js');
  const eplMatches = eplWin.EPL_MATCHES || [];
  const uclMatches = uclMatchWin.UCL_MATCHES || [];
  const eplTeams = eplWin.EPL_TEAMS || {};
  const uclTeams = uclTeamsWin.UCL_TEAMS || {};

  // 載文章索引，給 CTA 對應的賽前分析文章用
  let articles = [];
  try {
    const articlesPath = path.join(ROOT, 'data', 'articles-index.mjs');
    const mod = await import(url.pathToFileURL(articlesPath).href);
    articles = mod.default || [];
  } catch (e) {
    console.warn('[prematch] 無法載入 articles-index：', e.message);
  }

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
      const ht = c.teams[c.m.home] || {};
      const at = c.teams[c.m.away] || {};
      const homeName = ht.nameCN || ht.name || c.m.home;
      const awayName = at.nameCN || at.name || c.m.away;
      const matchArticle = _findPrematchArticle(articles, homeName, awayName, c.m.date);
      const text = buildMessage(c.m, c.teams, c.league, matchArticle);
      const result = await sendTG(text);
      if (!result.ok) {
        console.error(`✗ ${c.m.id} TG:`, JSON.stringify(result));
        continue;
      }

      const entry = { id: c.m.id, ko: kickoffMs(c.m), at: now };

      // 同時產 IG 限動圖（IG 上傳留到 --post-ig 階段，因為要等 Cloudflare deploy）
      if (IG_USER_ID && IG_TOKEN) {
        try {
          const ht = c.teams[c.m.home] || {};
          const at = c.teams[c.m.away] || {};
          const buf = await igRender.renderPrematch({
            home: ht.nameCN || ht.name || c.m.home,
            away: at.nameCN || at.name || c.m.away,
            kickoffMs: kickoffMs(c.m),
            league: c.league,
            homeCrest: ht.flag || ht.crest || ht.logo,
            awayCrest: at.flag || at.crest || at.logo,
          });
          fs.mkdirSync(IG_DIR, { recursive: true });
          fs.writeFileSync(path.join(IG_DIR, `${c.m.id}.png`), buf);
          entry.image_saved = true;
        } catch (e) {
          console.error(`  ${c.m.id} IG image gen 失敗：${e.message}`);
        }
      }

      state.alerted.push(entry);
      saveState(state);
      sent++;
      console.log(`✓ alerted ${c.m.id}${entry.image_saved ? ' + IG image' : ''}`);
      if (sent < candidates.length) await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`✗ ${c.m.id}:`, e.message);
    }
  }
  console.log(`Done: ${sent}/${candidates.length} sent`);
})().catch(e => { console.error(e); process.exit(1); });
