#!/usr/bin/env node
/**
 * 麥迪擂台 — 每日題目 Telegram 確認流程
 *
 * 使用方式：
 *   node scripts/opinion-telegram.js scripts/opinion-candidates.json
 *
 * 行為：
 *   1. 讀取候選題庫
 *   2. 傳第 1 題到 Telegram（附「使用這題 / 換下一題」按鈕）
 *   3. 長輪詢等你在 Telegram 按按鈕
 *   4. 按「使用這題」→ 寫入 js/data-opinions.js（插到時事題區塊）
 *   5. 按「換下一題」→ 傳下一題
 *   6. 候選題用完 → 通知你並結束
 *   7. 30 分鐘沒回應 → 超時結束
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
// Windows 上 undici 預設 IPv6 優先、若無法連通會卡住 → 強制 IPv4 優先
require('dns').setDefaultResultOrder('ipv4first');

// 倉庫根（本檔在 scripts/ 下）
const REPO_ROOT = path.join(__dirname, '..');

// 成功寫入題庫後自動 commit & push（由 bot.py detached 啟動時沒人會手動 commit）
function autoCommitAndPush(targetDate, chosenQ) {
  try {
    execFileSync('git', ['add', 'js/data-opinions.js', 'scripts/opinion-candidates.json'], {
      cwd: REPO_ROOT, stdio: 'inherit',
    });
    // 先看還有沒有 staged 變更，避免空 commit
    let hasChanges = true;
    try {
      execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: REPO_ROOT });
      hasChanges = false; // exit 0 = 沒變更
    } catch (e) { /* exit 1 = 有變更 */ }
    if (!hasChanges) {
      console.log('ℹ️ 沒有 staged 變更，跳過 commit');
      return;
    }
    const short = (chosenQ || '').replace(/\s+/g, ' ').slice(0, 50);
    const msg =
      `arena(${targetDate}): ${short}\n\n` +
      `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>\n`;
    execFileSync('git', ['commit', '-m', msg], { cwd: REPO_ROOT, stdio: 'inherit' });
    execFileSync('git', ['push'], { cwd: REPO_ROOT, stdio: 'inherit' });
    console.log('🚀 已 git commit & push');
  } catch (err) {
    console.error('⚠️ git commit/push 失敗:', err.message);
  }
}

// 觸發 GH Action 立即推送（午後熱點題不能等 00:30 cron）
function triggerArenaPushWorkflow() {
  try {
    execFileSync('gh', ['workflow', 'run', 'tg-arena-topic.yml'], {
      cwd: REPO_ROOT, stdio: 'inherit',
    });
    console.log('⚡ 已觸發 tg-arena-topic workflow → TG/IG 將立即推送');
  } catch (err) {
    console.error('⚠️ 觸發 workflow 失敗（可能 gh CLI 未安裝/登入）:', err.message);
    console.error('   → 此次午後熱點題的 TG/IG 推送會延到明天 00:30 cron 補發');
  }
}

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
if (!TOKEN || !CHAT_ID) {
  console.error('❌ 缺少 MADDY_BOT_TOKEN 或 MADDY_CHAT_ID，請檢查 scripts/.env.local');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

// ─── Session token ────────────────────────────────────────────
// 每個 opinion-telegram 啟動時自己一組 4 碼 token，烤進每個 button 的 callback_data
// 用途：同時跑兩個 process（如 7am 明日題 + 2pm 熱點題）會共用同一個 bot token，
// 兩邊 getUpdates 都會收到同一個 callback。token 確保每個 process 只處理自己送出的按鈕，
// 避免「按 7am 那題的 換下一題、卻冒出 2pm 的候選」這種錯亂。
const SESSION = Math.random().toString(36).slice(2, 6); // 4 碼，足夠區分

// Supabase（用來在 callback 直通時更新 user_feedback / opinion_comments）
const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPA_REST = SUPA_URL ? `${SUPA_URL}/rest/v1` : null;

// 預設回覆對應表（跟 opinion-comments-bot.js 同步）
const PRESET_REPLIES = {
  ack:  '👍 收到了，謝謝你的回饋！',
  fix:  '🛠️ 已修復，下次部署後就會生效。',
  todo: '📋 已加進待辦清單，會排時間做。',
  good: '💡 很好的點子，會認真考慮！',
  pass: '❌ 這個暫時不會做，但謝謝你的建議。',
  thx:  '❤️ 謝謝支持，會繼續努力！',
};

async function supaPatch(table, id, body) {
  if (!SUPA_REST || !SERVICE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  }
  const res = await fetch(`${SUPA_REST}/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase PATCH ${res.status}: ${t}`);
  }
}

// 鎖檔：跟 opinion-comments-bot.js 共用同一個 MADDY bot token，
// 同時 polling 會互搶 callback。本腳本啟動時寫 lock，
// comments-bot 偵測到 lock 就暫停自己的 polling，退出前清掉。
const LOCK_PATH = path.join(__dirname, '.opinion-telegram.lock');
// 排隊檔：若啟動時偵測到上一個 opinion-telegram 還活著，
// 把本次候選寫到這檔，由正在跑的那個 process 結束時自動接著跑。
const PENDING_PATH = path.join(__dirname, '.opinion-telegram-pending.json');

function writeLock() {
  try { fs.writeFileSync(LOCK_PATH, String(process.pid), 'utf8'); } catch (e) {}
}
function clearLock() {
  try { fs.unlinkSync(LOCK_PATH); } catch (e) {}
}
function readLockPid() {
  try { return fs.readFileSync(LOCK_PATH, 'utf8').trim(); } catch (e) { return null; }
}
function isPidAlive(pid) {
  if (!pid) return false;
  try { process.kill(parseInt(pid), 0); return true; }
  catch (e) { return false; }
}

// 退出前若有排隊候選 → spawn detached child 接著跑
function spawnPendingIfAny() {
  if (!fs.existsSync(PENDING_PATH)) return;
  let pending;
  try { pending = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8')); }
  catch (e) { try { fs.unlinkSync(PENDING_PATH); } catch {} return; }
  try { fs.unlinkSync(PENDING_PATH); } catch {}
  const { spawn } = require('child_process');
  const args = [__filename, pending.candidatesPath];
  if (pending.addOnly) args.push('--add-only');
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: 'ignore',
    cwd: path.join(__dirname, '..'),
  });
  child.unref();
  console.log(`▶️ 排隊中的候選已啟動：${pending.candidatesPath}${pending.addOnly ? ' --add-only' : ''} (child pid=${child.pid})`);
}

// 正常退出 + 各種信號 + 未捕捉例外都要清 lock，避免卡死 comments-bot
process.on('exit', () => { clearLock(); spawnPendingIfAny(); });
['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach(sig => {
  process.on(sig, () => { clearLock(); spawnPendingIfAny(); process.exit(130); });
});
process.on('uncaughtException', err => {
  console.error('💥 uncaughtException:', err);
  clearLock();
  spawnPendingIfAny();
  process.exit(1);
});

// 執行的期限 = 今天 23:59:59（本機時區）
// 若跨日仍沒選，自動寫入 candidates[0] 當預設
function endOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 999).getTime();
}

// 以日期為種子的洗牌（Mulberry32 PRNG + Fisher–Yates），每天順序不同但同天內一致
function seededShuffle(arr, seedStr) {
  let t = 0;
  for (const ch of String(seedStr)) t = (t * 31 + ch.charCodeAt(0)) | 0;
  const rng = () => {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Telegram API wrapper ──────────────────────────────────
async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description}`);
  return data.result;
}

// ─── 傳題目 + 按鈕 ──────────────────────────────────────────
function formatCandidate(c, idx, total) {
  const optsText = c.opts.map((o, i) => `  ${i + 1}. ${o}`).join('\n');
  const header = c._existing
    ? `📌 *題庫已有 ${idx + 1}/${total}*`
    : c._eternal
      ? `🌟 *永恆題庫 ${idx + 1}/${total}*`
      : `🎯 *麥迪擂台 候選題 ${idx + 1}/${total}*`;
  const dateLine = c._existing
    ? `📅 已排定日期：${escapeMd(c.date)}（選此題不做更動）`
    : c._eternal
      ? `📅 來源：永恆題庫（無特定日期）`
      : `📅 預計日期：${escapeMd(c.date || '（無日期）')}`;
  return (
    `${header}\n\n` +
    `${dateLine}\n` +
    `🏷️ 類型：${escapeMd(typeLabel(c.type))}\n\n` +
    `*題目：*${escapeMd(c.q)}\n\n` +
    `*選項：*\n${escapeMd(optsText)}\n\n` +
    (c.context ? `_背景：${escapeMd(c.context)}_` : '')
  );
}
function typeLabel(t) {
  return ({ trending: '🔥 時事', classic: '⚽ 永恆', fun: '🎉 趣味', predict: '🔮 預測' }[t] || t);
}
function escapeMd(s) {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function sendCandidate(candidate, idx, total) {
  return tg('sendMessage', {
    chat_id: CHAT_ID,
    text: formatCandidate(candidate, idx, total),
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ 使用這題', callback_data: `use:${SESSION}:${idx}` },
          { text: '➡️ 換下一題', callback_data: `next:${SESSION}:${idx}` },
        ],
        [
          { text: '❌ 全部取消', callback_data: `cancel:${SESSION}:${idx}` },
        ],
      ],
    },
  });
}

// ─── 寫入題庫檔 ─────────────────────────────────────────────
function appendToDataFile(candidate) {
  const filePath = path.join(__dirname, '..', 'js', 'data-opinions.js');
  const src = fs.readFileSync(filePath, 'utf8');

  // 在「// ── 本週時事 ───」區塊底下插入
  const marker = '// ── 本週時事';
  const markerIdx = src.indexOf(marker);
  if (markerIdx < 0) throw new Error('找不到本週時事區塊標記');

  // 找該區塊的第一個題目後方
  const blockStart = src.indexOf('\n', markerIdx);
  // 在標記下一行直接插入新題目（變成最新的時事題在最上面）
  // 時間欄位 3 選 1（依優先序）：
  //   1. expiresAt 真 24h（午後熱點題用，過 24h 自動消失）
  //   2. dates 陣列（跨日題，舊格式相容）
  //   3. date 單日（早上明日主題用）
  let timeField;
  if (candidate.expiresAt) {
    timeField = `expiresAt:'${candidate.expiresAt}'`;
  } else if (Array.isArray(candidate.dates)) {
    timeField = `dates:${JSON.stringify(candidate.dates)}`;
  } else {
    timeField = `date:'${candidate.date || ''}'`;
  }
  const entry =
    `\n  { id:'${candidate.id}', ${timeField}, type:'${candidate.type}',\n` +
    `    q:${JSON.stringify(candidate.q)},\n` +
    `    opts:${JSON.stringify(candidate.opts)},\n` +
    `    context:${JSON.stringify(candidate.context || '')} },\n`;

  const updated = src.slice(0, blockStart + 1) + entry + src.slice(blockStart + 1);
  fs.writeFileSync(filePath, updated, 'utf8');
  return filePath;
}

// 移除檔案中 date === targetDate 的所有題目（整個物件 block）
function removeEntriesForDate(targetDate) {
  if (!targetDate) return 0;
  const filePath = path.join(__dirname, '..', 'js', 'data-opinions.js');
  let src = fs.readFileSync(filePath, 'utf8');
  const esc = targetDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 匹配前導縮排 + 整個 { ... date:'DATE' ... }, 再吃掉結尾逗號與一個換行
  const re = new RegExp(`\\n?[ \\t]*\\{[^{}]*?date:'${esc}'[^{}]*?\\},?\\n`, 'g');
  const matches = src.match(re);
  if (!matches) return 0;
  src = src.replace(re, '\n');
  fs.writeFileSync(filePath, src, 'utf8');
  return matches.length;
}

// ─── 主流程 ────────────────────────────────────────────────
async function main() {
  // 解析參數：第一個非 flag 是 candidates path；--add-only 跳過 removeEntriesForDate
  const args = process.argv.slice(2);
  const addOnly = args.includes('--add-only');
  const candidatesPath = args.find(a => !a.startsWith('--'));
  if (!candidatesPath) {
    console.error('用法：node scripts/opinion-telegram.js <candidates.json> [--add-only]');
    process.exit(1);
  }
  // ─── 排隊檢查 ───
  // Telegram 不允許兩個 process 同時 polling 同個 bot token（會 Conflict 互殺）。
  // 偵測到前一個 opinion-telegram 還活著 → 把本次候選排隊、退出。
  // 對方結束時會在 process.exit hook 裡 spawn 接著跑。
  const lockPid = readLockPid();
  if (lockPid && isPidAlive(lockPid) && lockPid !== String(process.pid)) {
    const pending = {
      candidatesPath: path.relative(path.join(__dirname, '..'), candidatesPath),
      addOnly,
      queuedAt: new Date().toISOString(),
    };
    fs.writeFileSync(PENDING_PATH, JSON.stringify(pending, null, 2));
    console.log(`⏸️ 前一個 opinion-telegram (pid=${lockPid}) 還在跑，本次候選已排隊：${pending.candidatesPath}`);
    // 通知 TG 使用者
    try {
      await tg('sendMessage', {
        chat_id: CHAT_ID,
        text: `⏸️ 上一輪擂台候選還沒處理完，本輪候選已排隊。\n等你選完上一輪後，會自動跳出新候選。`,
      });
    } catch (e) { /* 不阻擋 */ }
    process.exit(0);
  }
  // 萬一上次 process 被 -Force kill 留下 stale lock（PID 已死）→ 清掉再寫
  if (lockPid && !isPidAlive(lockPid)) {
    console.log(`🧹 清掉 stale lock (dead pid=${lockPid})`);
    clearLock();
  }
  writeLock();
  console.log(`🪪 SESSION=${SESSION} pid=${process.pid}（按鈕 callback_data 會綁這 token，多個 process 共存時不會錯認）`);
  const rawCandidates = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
  if (!Array.isArray(rawCandidates) || !rawCandidates.length) {
    console.error('❌ 候選題檔案格式錯誤或空的');
    process.exit(1);
  }

  // 目標日期：候選題的 .date 或 .dates[0]（午後回顧題會用 dates 跨日）
  const targetDate = rawCandidates[0].date || (Array.isArray(rawCandidates[0].dates) && rawCandidates[0].dates[0]) || '';
  if (addOnly) console.log(`🔒 add-only 模式：寫入時不會刪除同日既有題目`);

  // 載入已在題庫中、日期對應 targetDate 的題目（排最前面；選它就維持不動）
  // 與永恆題庫（翻完候選後繼續顯示）
  let existing = [];
  let eternal = [];
  try {
    const { DAILY_OPINIONS } = require(path.join(__dirname, '..', 'js', 'data-opinions.js'));
    if (targetDate) {
      // 比對 .date 或 .dates[] 含 targetDate
      existing = DAILY_OPINIONS.filter(o => {
        if (o.date === targetDate) return true;
        if (Array.isArray(o.dates) && o.dates.includes(targetDate)) return true;
        return false;
      }).map(o => ({ ...o, _existing: true }));
    }
    const allEternal = DAILY_OPINIONS.filter(o => !o.date).map(o => ({ ...o, _eternal: true }));
    // 以目標日期當種子洗牌，每天順序都不同但同天內一致
    eternal = seededShuffle(allEternal, targetDate || new Date().toISOString().slice(0, 10));
  } catch (err) {
    console.warn(`⚠️ 讀取題庫失敗（${err.message}），只用候選 JSON`);
  }
  const candidates = [...existing, ...rawCandidates, ...eternal];

  // 統計永恆池類型組成
  const typeCount = eternal.reduce((m, o) => (m[o.type] = (m[o.type] || 0) + 1, m), {});
  const typeSummary = Object.entries(typeCount).map(([t, n]) => `${t}:${n}`).join(' ');
  console.log(
    `📥 題庫已有 ${existing.length} 題 + 時事候選 ${rawCandidates.length} 題 + 永恆題庫 ${eternal.length} 題（${typeSummary}，以 ${targetDate} 洗牌），共 ${candidates.length} 題可翻`
  );
  console.log(`📡 傳送第 1 題到 Telegram...`);

  let currentIdx = 0;
  const sentMessages = []; // 累積所有送出去的 message_id，結束時一次清掉按鈕
  const sent = await sendCandidate(candidates[currentIdx], currentIdx, candidates.length);
  sentMessages.push(sent.message_id);
  const deadline = endOfToday();
  const hoursLeft = ((deadline - Date.now()) / 3600000).toFixed(1);
  console.log(`✅ 第 1 題已送出（期限至今日 23:59:59，剩約 ${hoursLeft} 小時）\n`);

  let offset = 0;

  while (Date.now() < deadline) {
    const updates = await tg('getUpdates', {
      offset,
      timeout: 25,
      allowed_updates: ['callback_query', 'message'],
    }).catch(err => {
      console.error(`⚠️ getUpdates 錯誤：${err.message}，2 秒後重試`);
      return [];
    });

    for (const u of updates) {
      offset = u.update_id + 1;
      if (!u.callback_query) continue;

      const cb = u.callback_query;
      const dataStr = cb.data || '';
      const parts = dataStr.split(':');
      const action = parts[0];

      // ─── Session 過濾 ───
      // use/next/cancel 格式：action:SESSION:idx
      // 兩個 process 共用 bot token → getUpdates 雙方都會看到所有 callback。
      // SESSION 不對 → 跳過（不 ack、不處理），由 SESSION 相符的 process 處理。
      // offset 仍正常前進 — Telegram 長輪詢機制下，兩個 process 幾乎同時拿到 update，
      // 所以「正主」那一邊也會看到並處理。
      const OWN_ACTIONS = new Set(['use', 'next', 'cancel']);
      if (OWN_ACTIONS.has(action)) {
        const tok = parts[1];
        if (tok !== SESSION) {
          console.log(`⏭️ 忽略他人 callback（session ${tok} ≠ 本 ${SESSION}）：${dataStr}`);
          continue;
        }
      }

      const idxStr = OWN_ACTIONS.has(action) ? parts[2] : parts[1];
      const idx = parseInt(idxStr);

      // 回應 callback 避免轉圈
      await tg('answerCallbackQuery', { callback_query_id: cb.id }).catch(() => {});

      // ─── 跨 bot callback 直通：fbr / del / keep ───
      // 共用 MADDY token 期間，opinion-comments-bot.js 暫停 polling，
      // 它的 callback 都到我這 → 由我代為更新 Supabase + 編輯訊息
      if (action === 'fbr') {
        const presetKey = parts[1];
        const fbId = parts[2];
        const replyText = PRESET_REPLIES[presetKey];
        if (!replyText || !fbId) {
          console.warn(`⚠️ 未知的 fbr callback: ${dataStr}`);
          continue;
        }
        try {
          const now = new Date().toISOString();
          await supaPatch('user_feedback', fbId, { reply: replyText, replied_at: now, read_at: now });
          await tg('editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: (cb.message.text || '') + `\n\n📬 已回覆：${replyText}`,
          }).catch(() => {});
          console.log(`📬 已代回覆 feedback ${fbId}: ${replyText}`);
        } catch (e) {
          console.error(`❌ 代回覆 feedback 失敗 ${fbId}:`, e.message);
        }
        continue;
      }
      if (action === 'del') {
        // 擂台留言軟刪除
        try {
          await supaPatch('opinion_comments', idxStr /* 第二段是 id */, { deleted: true });
          await tg('editMessageText', {
            chat_id: cb.message.chat.id,
            message_id: cb.message.message_id,
            text: (cb.message.text || '') + '\n\n🗑️ 已刪除',
          }).catch(() => {});
          console.log(`🗑️ 已代刪除 opinion_comment ${idxStr}`);
        } catch (e) {
          console.error(`❌ 代刪 opinion_comment 失敗 ${idxStr}:`, e.message);
        }
        continue;
      }
      if (action === 'keep') {
        await tg('editMessageText', {
          chat_id: cb.message.chat.id,
          message_id: cb.message.message_id,
          text: (cb.message.text || '') + '\n\n✅ 已保留',
        }).catch(() => {});
        continue;
      }

      if (action === 'use') {
        const chosen = candidates[idx];
        // 統一行為：先移除同日所有舊題、再寫入選擇（永恆題需複製並指派日期）
        let toWrite;
        if (chosen._eternal) {
          toWrite = {
            ...chosen,
            id: `op-${targetDate.replace(/-/g, '')}-from-${chosen.id}`,
            date: targetDate,
            _eternal: undefined,
          };
        } else {
          toWrite = { ...chosen, _existing: undefined };
        }
        // addOnly 模式（午後熱點題）→ 自動加 expiresAt 為 24h 後（剛好 24 小時就消失）
        // 同時移除 date/dates 避免被舊邏輯誤判
        if (addOnly && !toWrite.expiresAt) {
          toWrite.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          delete toWrite.date;
          delete toWrite.dates;
        }
        let removed = 0;  // 提到區塊外，下方 suffix 訊息會用到
        if (!addOnly) {
          removed = removeEntriesForDate(targetDate);
          if (removed) console.log(`🗑️ 已移除 ${removed} 則同日 (${targetDate}) 舊題目`);
        }
        // 判斷是「現在已上線」還是「未來顯示」
        // - 有 expiresAt (午後熱點題 24h 計時) → 現在就上線
        // - dates 含今天 → 現在就上線
        // - date === 今天 → 現在就上線
        // - 其他（date === 明天）→ 將顯示
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        const isLiveNow = toWrite.expiresAt
          ? true
          : Array.isArray(toWrite.dates)
            ? toWrite.dates.includes(today)
            : (toWrite.date === today);
        console.log(`✅ 你選了：${chosen.q}${chosen._eternal ? `（永恆題 → 指派為 ${targetDate}）` : ''}`);
        const filePath = appendToDataFile(toWrite);

        // 自動 seed 留言：候選題 JSON 若帶 seed_comments → 寫到 tmp file 跑 seeder
        // toWrite.id = 真實寫入 DB 的 opinion_id（永恆題會改 id）
        if (chosen.seed_comments && typeof chosen.seed_comments === 'object') {
          try {
            // 同日可有 2 題（主題 + 24h 回顧），用 id 命名避免覆蓋彼此
            // op-20260506-b → seed-comments-20260506-b.json
            const idStem = String(toWrite.id).replace(/^op-/, '');
            const tmpJson = path.join(REPO_ROOT, 'scripts', `seed-comments-${idStem}.json`);
            fs.writeFileSync(tmpJson, JSON.stringify(chosen.seed_comments, null, 2));
            console.log(`📝 寫 seed comments JSON → ${path.relative(REPO_ROOT, tmpJson)}`);
            const seederResult = execFileSync(
              process.execPath,
              [path.join(REPO_ROOT, 'scripts', 'seed-arena-comments.js'), toWrite.id, tmpJson],
              { encoding: 'utf-8', cwd: REPO_ROOT }
            );
            console.log(seederResult);
          } catch (seedErr) {
            console.warn(`⚠️ seed 留言失敗（不影響題目發佈）：${seedErr.message}`);
          }
        }

        // 先關掉其他訊息的按鈕，再把被選中的訊息改成已確認
        for (const mid of sentMessages) {
          if (mid === cb.message.message_id) continue;
          await tg('editMessageReplyMarkup', {
            chat_id: CHAT_ID,
            message_id: mid,
            reply_markup: { inline_keyboard: [] },
          }).catch(() => {});
        }
        const suffix =
          (isLiveNow
            ? `\n\n✅ *已確認，現在就上線*（網站重整即可看到）`
            : `\n\n✅ *已確認，${escapeMd(targetDate)} 將顯示此題*`) +
          (removed > 1 ? `\n🗑️ 已整併同日 ${removed} 則舊題目` : '');
        await tg('editMessageText', {
          chat_id: CHAT_ID,
          message_id: cb.message.message_id,
          text: formatCandidate(chosen, idx, candidates.length) + suffix,
          parse_mode: 'MarkdownV2',
        }).catch(() => {});
        console.log(`📝 已寫入 ${path.relative(process.cwd(), filePath)}`);
        autoCommitAndPush(targetDate, chosen.q);
        // 午後熱點題（addOnly + isLiveNow）→ 觸發 workflow 立即推 TG/IG，不能等 00:30 cron
        if (addOnly && isLiveNow) {
          // 給 GitHub 一點時間吸收 push 後的 ref（避免 workflow 跑舊 commit）
          setTimeout(() => {
            triggerArenaPushWorkflow();
            process.exit(0);
          }, 3000);
        } else {
          process.exit(0);
        }
        return;
      }

      if (action === 'next') {
        const nextIdx = (idx + 1) % candidates.length;
        // 舊訊息只留「✅ 使用這題」，取消按鈕只保留在最新那題
        await tg('editMessageReplyMarkup', {
          chat_id: CHAT_ID,
          message_id: cb.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ 使用這題', callback_data: `use:${SESSION}:${idx}` }],
            ],
          },
        }).catch(() => {});
        currentIdx = nextIdx;
        const next = await sendCandidate(candidates[currentIdx], currentIdx, candidates.length);
        sentMessages.push(next.message_id);
        const note = nextIdx === 0
          ? '（循環回第 1 題）'
          : nextIdx === existing.length
            ? '（進入時事候選）'
            : nextIdx === existing.length + rawCandidates.length
              ? '（開始顯示永恆題庫）'
              : '';
        console.log(`➡️ 換到第 ${currentIdx + 1}/${candidates.length} 題 ${note}`);
        continue;
      }

      if (action === 'cancel') {
        // 關掉所有訊息的按鈕
        for (const mid of sentMessages) {
          if (mid === cb.message.message_id) continue;
          await tg('editMessageReplyMarkup', {
            chat_id: CHAT_ID,
            message_id: mid,
            reply_markup: { inline_keyboard: [] },
          }).catch(() => {});
        }
        await tg('editMessageText', {
          chat_id: CHAT_ID,
          message_id: cb.message.message_id,
          text: '❌ *已取消，未加入任何題目*',
          parse_mode: 'MarkdownV2',
        }).catch(() => {});
        console.log('❌ 使用者取消。結束。');
        process.exit(0);
      }
    }
  }

  // 跨日超時：fallback 前必須先重讀題庫，確認使用者沒在 bot 啟動後手動寫入
  //   bot 啟動時 require 過 data-opinions.js → cache 凍結。
  //   使用者可能在凌晨手動 commit 了當日題（如 [[feedback_arena_no_overwrite]]）。
  //   若不清 cache 重讀，就會把使用者選好的題覆蓋掉（2026-05-18 中場秀事件）。
  let alreadyHasEntries = [];
  try {
    const dataPath = path.join(__dirname, '..', 'js', 'data-opinions.js');
    delete require.cache[require.resolve(dataPath)];
    const fresh = require(dataPath);
    const freshList = fresh.DAILY_OPINIONS || [];
    alreadyHasEntries = freshList.filter(o => {
      if (o.date === targetDate) return true;
      if (Array.isArray(o.dates) && o.dates.includes(targetDate)) return true;
      return false;
    });
  } catch (err) {
    console.warn(`⚠️ 跨日 fallback 重讀題庫失敗（${err.message}），保守起見直接放棄 fallback`);
    alreadyHasEntries = [{ id: 'unknown' }]; // 強制 bail
  }

  if (alreadyHasEntries.length > 0) {
    console.log(`⏭️ 跨日 fallback：題庫已有 ${alreadyHasEntries.length} 則 ${targetDate} 題目（${alreadyHasEntries.map(o => o.id).join(', ')}），不覆蓋使用者選擇`);
    for (const mid of sentMessages) {
      await tg('editMessageReplyMarkup', {
        chat_id: CHAT_ID,
        message_id: mid,
        reply_markup: { inline_keyboard: [] },
      }).catch(() => {});
    }
    await tg('sendMessage', {
      chat_id: CHAT_ID,
      text:
        `⏰ *時間已到（跨日）*\n\n` +
        `題庫已有 ${escapeMd(targetDate)} 題目，不覆蓋。\n` +
        `現有：${escapeMd((alreadyHasEntries[0].q || '').slice(0, 60))}`,
      parse_mode: 'MarkdownV2',
    }).catch(() => {});
    process.exit(0);
  }

  // 題庫真的沒有同日題目 → 才採用 fallback
  const fallback = rawCandidates[0];
  console.log(`⏰ 已跨日未回應，自動採用候選第 1 題：${fallback.q}`);
  for (const mid of sentMessages) {
    await tg('editMessageReplyMarkup', {
      chat_id: CHAT_ID,
      message_id: mid,
      reply_markup: { inline_keyboard: [] },
    }).catch(() => {});
  }
  await tg('sendMessage', {
    chat_id: CHAT_ID,
    text:
      `⏰ *時間已到（跨日）*\n\n` +
      `未選擇，自動採用原候選第 1 題：\n\n` +
      `${escapeMd(fallback.q)}`,
    parse_mode: 'MarkdownV2',
  }).catch(() => {});
  const filePath = appendToDataFile(fallback);
  console.log(`📝 已寫入 ${path.relative(process.cwd(), filePath)}`);
  autoCommitAndPush(targetDate, fallback.q);
  process.exit(0);
}

main().catch(err => {
  console.error('💥', err);
  process.exit(1);
});
