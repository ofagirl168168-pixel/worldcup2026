#!/usr/bin/env node
/**
 * push-arena-topic.js
 * 每天 00:30 TW 推送當天擂台題目到 TG 頻道
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', '.tg-arena-state.json');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

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

(async () => {
  if (!TG_TOKEN || !TG_CHANNEL) { console.error('缺 env'); process.exit(1); }

  const today = tdate();
  let state = { date: '' };
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
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
  if (result.ok) {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      date: today,
      sent: true,
      msg_id: result.result.message_id,
      opinion_id: o.id,
    }, null, 2));
    console.log('✓ Pushed today opinion to TG');
  } else {
    console.error('✗', JSON.stringify(result));
    process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(1); });
