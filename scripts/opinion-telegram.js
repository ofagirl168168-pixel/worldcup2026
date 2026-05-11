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
function writeLock() {
  try { fs.writeFileSync(LOCK_PATH, String(process.pid), 'utf8'); } catch (e) {}
}
function clearLock() {
  try { fs.unlinkSync(LOCK_PATH); } catch (e) {}
}
// 正常退出 + 各種信號 + 未捕捉例外都要清 lock，避免卡死 comments-bot
process.on('exit', clearLock);
['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach(sig => {
  process.on(sig, () => { clearLock(); process.exit(130); });
});
process.on('uncaughtException', err => {
  console.error('💥 uncaughtException:', err);
  clearLock();
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
          { text: '✅ 使用這題', callback_data: `use:${idx}` },
          { text: '➡️ 換下一題', callback_data: `next:${idx}` },
        ],
        [
          { text: '❌ 全部取消', callback_data: `cancel:${idx}` },
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
  // 支援兩種格式：date:'YYYY-MM-DD' 單日 OR dates:[...] 跨日（午後熱點題用）
  const dateField = (candidate.dates && Array.isArray(candidate.dates))
    ? `dates:${JSON.stringify(candidate.dates)}`
    : `date:'${candidate.date || ''}'`;
  const entry =
    `\n  { id:'${candidate.id}', ${dateField}, type:'${candidate.type}',\n` +
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
  writeLock();
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
      const idxStr = parts[1];
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
        let removed = 0;  // 提到區塊外，下方 suffix 訊息會用到
        if (!addOnly) {
          removed = removeEntriesForDate(targetDate);
          if (removed) console.log(`🗑️ 已移除 ${removed} 則同日 (${targetDate}) 舊題目`);
        }
        // 判斷是「現在已上線」還是「未來顯示」
        // 午後熱點題 dates 含今天 → 現在就上線；早上明日題只含明天 → 將顯示
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        const isLiveNow = Array.isArray(toWrite.dates)
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
        process.exit(0);
      }

      if (action === 'next') {
        const nextIdx = (idx + 1) % candidates.length;
        // 舊訊息只留「✅ 使用這題」，取消按鈕只保留在最新那題
        await tg('editMessageReplyMarkup', {
          chat_id: CHAT_ID,
          message_id: cb.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ 使用這題', callback_data: `use:${idx}` }],
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

  // 跨日超時：採用「使用者看到的第 1 題」= rawCandidates[0]（telegram 一開始顯示的那題）
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
  // 先清掉同日殘留 entry（跟 `use` action 一致）— 避免舊題壓在前面被 find() 撿走
  // 雖然 appendToDataFile 是 prepend、新題會在前面，但如果之前的人手動加錯位置殘留就會出包
  // add-only 模式（午後回顧題）跳過清理，純粹新增第 2 題
  if (!addOnly) {
    const removed = removeEntriesForDate(targetDate);
    if (removed) console.log(`🗑️ 已移除 ${removed} 則同日 (${targetDate}) 舊題目`);
  }
  const filePath = appendToDataFile(fallback);
  console.log(`📝 已寫入 ${path.relative(process.cwd(), filePath)}`);
  autoCommitAndPush(targetDate, fallback.q);
  process.exit(0);
}

main().catch(err => {
  console.error('💥', err);
  process.exit(1);
});
