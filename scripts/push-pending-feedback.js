#!/usr/bin/env node
/**
 * 一次性把所有未讀回饋推到 Telegram（補救用）
 * 用法：node scripts/push-pending-feedback.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
require('dns').setDefaultResultOrder('ipv4first');

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
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN || !CHAT_ID || !SUPA_URL || !KEY) {
  console.error('缺環境變數');
  process.exit(1);
}

function escapeMd(s) {
  return String(s == null ? '' : s).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

async function tg(m, b) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${m}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  });
  return r.json();
}

(async () => {
  const q = new URLSearchParams({
    select: 'id,category,nickname,content,created_at',
    deleted: 'eq.false',
    read_at: 'is.null',
    order: 'created_at.asc',
  });
  const r = await fetch(`${SUPA_URL}/rest/v1/user_feedback?${q}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const rows = await r.json();
  console.log(`找到 ${rows.length} 則未讀回饋`);

  const CAT = { '建議': '💡', 'Bug': '🐛', '讚美': '❤️', '其他': '💬' };

  for (const f of rows) {
    const timeStr = new Date(f.created_at).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei', hour12: false,
    });
    const text =
      `📮 *麥迪信箱新訊息*\n\n` +
      `${escapeMd(CAT[f.category] || '💬')} ${escapeMd(f.category)}\n` +
      `👤 ${escapeMd(f.nickname || '匿名觀眾')}\n` +
      `🕘 ${escapeMd(timeStr)}\n\n` +
      `📝 ${escapeMd(f.content)}`;

    const send = await tg('sendMessage', {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👍 收到', callback_data: `fbr:ack:${f.id}` },
            { text: '🛠️ 已修', callback_data: `fbr:fix:${f.id}` },
            { text: '📋 待辦', callback_data: `fbr:todo:${f.id}` },
          ],
          [
            { text: '💡 採納', callback_data: `fbr:good:${f.id}` },
            { text: '❌ 不做', callback_data: `fbr:pass:${f.id}` },
            { text: '❤️ 感謝', callback_data: `fbr:thx:${f.id}` },
          ],
        ],
      },
    });
    console.log(`推送 ${f.id}: ${send.ok ? 'OK' : send.description}`);
  }

  // 設 cursor 到最新一則的時間，避免 bot 重啟後重複推
  if (rows.length) {
    const lastTs = rows[rows.length - 1].created_at;
    fs.writeFileSync(path.join(__dirname, '.feedback-cursor'), lastTs, 'utf8');
    console.log(`cursor 設定為 ${lastTs}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
