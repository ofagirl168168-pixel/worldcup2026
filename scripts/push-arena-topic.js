#!/usr/bin/env node
/**
 * push-arena-topic.js
 * 每天 00:30 TW 推送當天擂台題目到 TG 頻道
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const igRender = require('./_ig-story-render.js');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', '.tg-arena-state.json');
const IG_DIR = path.join(ROOT, 'og', 'ig-story-arena');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const IG_USER_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

const POST_IG = process.argv.includes('--post-ig');

function tdate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

function loadOpinions() {
  const sandbox = {
    window: {},
    module: { exports: {} },
    console: { log: () => {}, warn: () => {}, error: () => {} },
  };
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data-opinions.js'), 'utf-8');
  vm.runInContext(code, sandbox);
  return sandbox.window.DAILY_OPINIONS || (sandbox.module.exports && sandbox.module.exports.DAILY_OPINIONS) || [];
}

function getTodayOpinions(opinions) {
  const today = tdate();
  return opinions.filter(o => {
    if (Array.isArray(o.dates)) return o.dates.includes(today);
    return o.date === today;
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
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
  const imageUrl = `${SITE_URL}/og/ig-story-arena/${today}.png?v=${Date.now()}`;
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

  if (state.date === today && state.sent) {
    console.log('Already sent today');
    return;
  }

  const all = loadOpinions();
  const todays = getTodayOpinions(all);
  if (!todays.length) { console.log('No topic for today'); return; }

  const o = todays[0]; // 第一題（如有 2 題就用 -a）
  const typeBadge = ({
    trending: '🔥 熱議題',
    predict: '🎯 預測題',
    classic: '⚖️ 經典題',
    fun: '😄 趣味題',
  })[o.type] || '🥊 擂台題';

  const optsText = o.opts.map((opt, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣'][i]} ${escapeHtml(opt)}`).join('\n');
  const ctx = o.context ? `\n📌 <i>${escapeHtml(o.context.length > 200 ? o.context.slice(0, 200) + '…' : o.context)}</i>` : '';

  const text = `🥊 <b>今日麥迪擂台</b>
${typeBadge}

❓ <b>${escapeHtml(o.q)}</b>

${optsText}
${ctx}

⚔️ 立即投票：${SITE_URL}/

#今日擂台 #${o.type === 'predict' ? '預測題' : (o.type === 'trending' ? '熱議題' : '擂台')}`;

  const result = await sendTG(text);
  if (!result.ok) {
    console.error('✗ TG:', JSON.stringify(result));
    process.exit(1);
  }

  const stateOut = {
    date: today,
    sent: true,
    msg_id: result.result.message_id,
    opinion_id: o.id,
  };

  // 同時產 IG 限動圖（IG 上傳留到 --post-ig 階段）
  if (IG_USER_ID && IG_TOKEN) {
    try {
      const buf = await igRender.renderArena({
        question: o.q, options: o.opts, type: o.type,
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
  console.log('✓ Pushed today opinion to TG');
})().catch(e => { console.error(e); process.exit(1); });
