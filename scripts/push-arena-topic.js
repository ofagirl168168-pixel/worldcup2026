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
  const now = Date.now();
  return opinions.filter(o => {
    // 午後熱點題：expiresAt 24h 計時，未過期就算「今天」
    if (o.expiresAt) {
      const exp = new Date(o.expiresAt).getTime();
      return !isNaN(exp) && exp > now;
    }
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

// 找指定 opinion_id 的 entry（state 格式：{ sent: [ { id, date, msg_id, image_saved, ig_media_id, ... } ] }）
function entryFor(state, id) {
  return (state.sent || []).find(e => e.id === id);
}

async function postIgPhase(state) {
  if (!IG_USER_ID || !IG_TOKEN) { console.log('缺 IG token，跳過'); return; }
  // 過濾掉過期 entry：image 是 24h 前生的、可能對應已換題的擂台，貼上去是過期圖
  const now = Date.now();
  const todo = (state.sent || []).filter(e => e.image_saved && !e.ig_media_id && (now - new Date(e.sent_at).getTime()) < 24 * 3600 * 1000);
  if (!todo.length) { console.log('沒待發 IG 圖'); return; }
  for (const e of todo) {
    const imageUrl = `${SITE_URL}/og/ig-story-arena/${e.id}.png?v=${Date.now()}`;
    console.log(`等 ${imageUrl} deploy...`);
    let ok = false;
    for (let i = 0; i < 6; i++) {
      const r = await fetch(imageUrl, { method: 'HEAD' });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) { ok = true; break; }
      await new Promise(rs => setTimeout(rs, 5000));
    }
    if (!ok) { console.error(`圖未 deploy: ${e.id}`); continue; }
    try {
      const igMediaId = await igRender.postStoryViaApi({ imageUrl, igUserId: IG_USER_ID, igToken: IG_TOKEN });
      e.ig_media_id = igMediaId;
      e.ig_posted_at = new Date().toISOString();
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      console.log(`✓ ${e.id} → ig_media_id=${igMediaId}`);
      await new Promise(rs => setTimeout(rs, 3000));
    } catch (err) { console.error(`IG 發布失敗 ${e.id}: ${err.message}`); }
  }
}

(async () => {
  if (!TG_TOKEN || !TG_CHANNEL) { console.error('缺 env'); process.exit(1); }

  // ── 載入 state（向後相容舊格式 {date, sent:true, opinion_id}）──
  let state = { sent: [] };
  if (fs.existsSync(STATE_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (Array.isArray(raw.sent)) {
        state = raw;
      } else if (raw && raw.sent === true && raw.opinion_id) {
        // 舊格式 → migrate
        state = {
          sent: [{
            id: raw.opinion_id,
            date: raw.date,
            msg_id: raw.msg_id,
            image_saved: raw.image_saved,
            ig_media_id: raw.ig_media_id,
            ig_posted_at: raw.ig_posted_at,
            sent_at: raw.date ? new Date(raw.date + 'T00:30:00+08:00').toISOString() : new Date().toISOString(),
          }],
        };
      }
    } catch {}
  }
  // 清掉超過 48h 的舊 entry，避免 state 無限長
  const cutoff = Date.now() - 48 * 3600 * 1000;
  state.sent = (state.sent || []).filter(e => {
    const t = e.sent_at ? new Date(e.sent_at).getTime() : 0;
    return t > cutoff;
  });

  if (POST_IG) {
    await postIgPhase(state);
    return;
  }

  const all = loadOpinions();
  const todays = getTodayOpinions(all);
  if (!todays.length) { console.log('No topic for today'); return; }

  // 只 push 沒推過的題目（用 opinion_id 比對）→ 早 + 午後兩題各自會被推
  const sentIds = new Set((state.sent || []).map(e => e.id));
  const todos = todays.filter(o => !sentIds.has(o.id));
  if (!todos.length) { console.log(`今天 ${todays.length} 題都已推過`); return; }

  for (const o of todos) {
    const typeBadge = ({
      trending: '🔥 熱議題',
      predict: '🎯 預測題',
      classic: '⚖️ 經典題',
      fun: '😄 趣味題',
    })[o.type] || '🥊 擂台題';

    const optsText = o.opts.map((opt, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣'][i]} ${escapeHtml(opt)}`).join('\n');
    const ctx = o.context ? `\n📌 <i>${escapeHtml(o.context.length > 200 ? o.context.slice(0, 200) + '…' : o.context)}</i>` : '';

    const text = `🥊 <b>${o.expiresAt ? '熱點擂台' : '今日麥迪擂台'}</b>
${typeBadge}

❓ <b>${escapeHtml(o.q)}</b>

${optsText}
${ctx}

⚔️ 立即投票：${SITE_URL}/

#今日擂台 #${o.type === 'predict' ? '預測題' : (o.type === 'trending' ? '熱議題' : '擂台')}`;

    const result = await sendTG(text);
    if (!result.ok) {
      console.error(`✗ ${o.id} TG:`, JSON.stringify(result));
      continue;
    }

    const entry = {
      id: o.id,
      date: tdate(),
      msg_id: result.result.message_id,
      sent_at: new Date().toISOString(),
    };

    // 同時產 IG 限動圖（IG 上傳留到 --post-ig 階段）
    if (IG_USER_ID && IG_TOKEN) {
      try {
        const buf = await igRender.renderArena({
          question: o.q, options: o.opts, type: o.type,
        });
        fs.mkdirSync(IG_DIR, { recursive: true });
        // 用 opinion_id 命名（不是日期），確保午後熱點題不會蓋早上的圖
        fs.writeFileSync(path.join(IG_DIR, `${o.id}.png`), buf);
        entry.image_saved = true;
        console.log(`✓ ${o.id} IG image generated`);
      } catch (e) {
        console.error(`IG image gen 失敗 ${o.id}：`, e.message);
      }
    }

    state.sent = state.sent || [];
    state.sent.push(entry);
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`✓ Pushed ${o.id} to TG`);
    await new Promise(r => setTimeout(r, 2000));
  }
})().catch(e => { console.error(e); process.exit(1); });
