#!/usr/bin/env node
/**
 * 麥迪擂台 — 留言審核機器人（Telegram）
 *
 * 行為：
 *   - 每 15 秒輪詢 Supabase opinion_comments，把新留言推到 Telegram
 *   - 每則訊息附 [🗑️ 刪除] [✅ 保留] 按鈕
 *   - 按「刪除」→ 把該留言 deleted 設為 true（前端會因 realtime UPDATE 即時移除）
 *   - 按「保留」→ 只編輯訊息標記已審核
 *   - 上次看過的時間戳寫在 scripts/.comments-cursor，重啟不會重送
 *
 * 使用：
 *   node scripts/opinion-comments-bot.js
 *
 * 環境變數（scripts/.env.local）：
 *   MADDY_BOT_TOKEN
 *   MADDY_CHAT_ID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

'use strict';

const fs = require('fs');
const path = require('path');
// Windows IPv6 workaround（同 opinion-telegram.js）
require('dns').setDefaultResultOrder('ipv4first');

// ─── 讀 .env.local ──────────────────────────────────────────
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const TOKEN = process.env.MADDY_BOT_TOKEN;
const CHAT_ID = process.env.MADDY_CHAT_ID;
const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN || !CHAT_ID) {
  console.error('❌ 缺少 MADDY_BOT_TOKEN 或 MADDY_CHAT_ID');
  process.exit(1);
}
if (!SUPA_URL || !SERVICE_KEY) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  console.error('   請到 Supabase Dashboard → Project Settings → API → service_role key 複製');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
const REST = `${SUPA_URL}/rest/v1`;
const CURSOR_PATH = path.join(__dirname, '.comments-cursor');
const POLL_INTERVAL_MS = 15000;
const TELEGRAM_POLL_TIMEOUT = 30; // seconds

// 讀/寫 cursor
function readCursor() {
  try {
    const raw = fs.readFileSync(CURSOR_PATH, 'utf8').trim();
    if (raw) return raw;
  } catch (e) {}
  // 預設：啟動當下（只處理啟動後的新留言）
  return new Date().toISOString();
}
function writeCursor(ts) {
  try { fs.writeFileSync(CURSOR_PATH, ts, 'utf8'); } catch (e) {}
}

// ─── Telegram API ─────────────────────────────────────────
async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description}`);
  return data.result;
}

function escapeMd(s) {
  return String(s == null ? '' : s)
    .replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// ─── Supabase REST ─────────────────────────────────────────
async function supaFetch(url, opts) {
  opts = opts || {};
  const headers = Object.assign({
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }, opts.headers || {});
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function fetchNewComments(sinceIso) {
  const q = new URLSearchParams({
    select: 'id,opinion_id,side,nickname,content,likes,created_at,deleted',
    deleted: 'eq.false',
    created_at: `gt.${sinceIso}`,
    order: 'created_at.asc',
    limit: '50',
  });
  return await supaFetch(`${REST}/opinion_comments?${q}`);
}

async function softDeleteComment(id) {
  const url = `${REST}/opinion_comments?id=eq.${encodeURIComponent(id)}`;
  return await supaFetch(url, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ deleted: true }),
  });
}

// ─── 訊息格式 ─────────────────────────────────────────────
function formatComment(c) {
  const nick = c.nickname || '匿名觀眾';
  const timeStr = new Date(c.created_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', hour12: false,
  });
  return (
    `💬 *新留言*\n\n` +
    `👤 ${escapeMd(nick)}\n` +
    `🎯 題目：\`${escapeMd(c.opinion_id)}\`\n` +
    `🎨 立場：第 ${c.side + 1} 邊\n` +
    `🕘 ${escapeMd(timeStr)}\n\n` +
    `📝 ${escapeMd(c.content)}`
  );
}

async function sendCommentToTelegram(c) {
  return await tg('sendMessage', {
    chat_id: CHAT_ID,
    text: formatComment(c),
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [[
        { text: '🗑️ 刪除', callback_data: `del:${c.id}` },
        { text: '✅ 保留', callback_data: `keep:${c.id}` },
      ]],
    },
  });
}

// ─── 處理 callback_query ──────────────────────────────────
async function handleCallback(cb) {
  const data = cb.data || '';
  const msg = cb.message;
  const [action, id] = data.split(':', 2);
  if (!id) return;

  try {
    if (action === 'del') {
      await softDeleteComment(id);
      await tg('editMessageText', {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text: (msg.text || '') + '\n\n🗑️ 已刪除',
      });
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: '已刪除' });
    } else if (action === 'keep') {
      await tg('editMessageText', {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        text: (msg.text || '') + '\n\n✅ 已保留',
      });
      await tg('answerCallbackQuery', { callback_query_id: cb.id, text: '已保留' });
    }
  } catch (e) {
    console.error('[callback]', action, id, e.message);
    await tg('answerCallbackQuery', {
      callback_query_id: cb.id,
      text: '處理失敗：' + e.message,
      show_alert: true,
    }).catch(() => {});
  }
}

// ─── 兩個獨立輪詢迴圈 ───────────────────────────────────────
async function commentPollLoop() {
  let cursor = readCursor();
  console.log(`🔎 從 ${cursor} 開始監聽新留言`);
  while (true) {
    try {
      const rows = await fetchNewComments(cursor);
      if (rows && rows.length) {
        for (const c of rows) {
          try {
            await sendCommentToTelegram(c);
            console.log(`📤 推送留言 ${c.id}（${c.nickname || '匿名'}）`);
          } catch (e) {
            console.error(`❌ 推送失敗 ${c.id}:`, e.message);
          }
          // cursor 推進到這筆的時間（下次從它之後繼續）
          if (c.created_at > cursor) cursor = c.created_at;
        }
        writeCursor(cursor);
      }
    } catch (e) {
      console.error('❌ 抓留言失敗:', e.message);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

async function telegramPollLoop() {
  let offset = 0;
  console.log('📡 開始長輪詢 Telegram...');
  while (true) {
    try {
      const updates = await tg('getUpdates', {
        offset,
        timeout: TELEGRAM_POLL_TIMEOUT,
        allowed_updates: ['callback_query'],
      });
      for (const u of updates || []) {
        offset = u.update_id + 1;
        if (u.callback_query) await handleCallback(u.callback_query);
      }
    } catch (e) {
      console.error('❌ getUpdates:', e.message);
      await sleep(5000);
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Bootstrap ────────────────────────────────────────────
(async () => {
  try {
    // 啟動提示
    await tg('sendMessage', {
      chat_id: CHAT_ID,
      text: '🤖 麥迪擂台留言審核機器人已啟動\n有新留言會在這裡通知，按 🗑️ 即可刪除。',
    });
  } catch (e) {
    console.warn('⚠️ 啟動訊息發送失敗:', e.message);
  }
  // 兩個 loop 同時跑
  await Promise.all([commentPollLoop(), telegramPollLoop()]);
})().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
