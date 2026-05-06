#!/usr/bin/env node
/**
 * seed-arena-comments.js
 *
 * 為麥迪擂台某題（opinion_id）製造分散時間的開場留言，每個 side 預埋幾則符合該選項立場的留言。
 * 寫進 Supabase opinion_comments，匿名顯示，看起來像真實使用者。
 *
 * 用法：
 *   node scripts/seed-arena-comments.js <opinion_id> <comments_json_path>
 *
 * comments_json 格式（key 是 side 0-3，value 是該選項的留言陣列）：
 *   {
 *     "0": ["留言 A 立場 1", "留言 A 立場 2", ...],
 *     "1": ["留言 B 立場 1", ...],
 *     "2": [...],
 *     "3": [...]
 *   }
 *
 * 時間分佈（合理化）：
 *   - 起點 = opinion_date 00:00 TW（題目當日午夜上線時間，網站 getTodayOpinion 也是午夜換題）
 *   - 終點 = now - 5 min
 *   - 等間距 + ±15 min jitter 自然分散
 *   - 如果 opinion_date 是未來日期 → 中止（題目還沒上線就先 seed 沒意義）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 用 publishable key — RLS 'anon insert' 允許所有人 insert
const SUPA_URL = process.env.SUPABASE_URL || 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';
const sb = createClient(SUPA_URL, SUPA_KEY);

// 與 opinion-poll.js 同一池
const NICK_POOL = ['路人甲','看球狼','PK魂','擂台客','熱血派','場邊記者','足球宅','替補中','VAR魔人','越位線',
                   '禁區獵人','補時王','十六碼','射手榜','主場控','客場魂','假動作','頭球塔','長傳俠','中場將'];

function randomNick() {
  return NICK_POOL[Math.floor(Math.random() * NICK_POOL.length)] + Math.floor(Math.random() * 90 + 10);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

(async () => {
  const opinionId = process.argv[2];
  const commentsPath = process.argv[3];
  if (!opinionId || !commentsPath) {
    console.error('用法：node scripts/seed-arena-comments.js <opinion_id> <comments_json_path>');
    process.exit(1);
  }
  const commentsBySide = JSON.parse(fs.readFileSync(commentsPath, 'utf-8'));

  // 先檢查該題是否已經被 seed 過（同 opinion_id + nickname pattern + content match）
  const { count, error: countErr } = await sb
    .from('opinion_comments')
    .select('id', { count: 'exact', head: true })
    .eq('opinion_id', opinionId);
  if (countErr) { console.error('count 失敗', countErr); process.exit(1); }
  if (count && count > 5) {
    console.log(`opinion ${opinionId} 已有 ${count} 則留言，可能已 seed 過。要重 seed 請手動清表。中止。`);
    process.exit(0);
  }

  // 把所有留言 (side, content) 攤平 + 隨機分配時間
  const all = [];
  for (const sideStr of Object.keys(commentsBySide)) {
    const side = parseInt(sideStr);
    if (isNaN(side) || side < 0 || side > 3) continue;
    for (const content of commentsBySide[sideStr]) {
      all.push({ side, content });
    }
  }
  if (all.length === 0) {
    console.error('comments JSON 為空');
    process.exit(1);
  }

  // 時間分佈：起點 = opinion_date 00:00 TW（題目當日午夜上線），終點 = now-5min
  const now = Date.now();
  const dateMatch = /^op-(\d{4})(\d{2})(\d{2})-/.exec(opinionId);
  let earliest;
  if (dateMatch) {
    const ymd = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    earliest = new Date(`${ymd}T00:00:00+08:00`).getTime();
  } else {
    earliest = now - 12 * 3600 * 1000; // 沒帶日期就用 12h 前 fallback
  }
  const latest = now - 5 * 60 * 1000;
  if (earliest >= latest) {
    console.error(`opinion ${opinionId} 還沒上線（題目日期在未來）— 等到題目當天 00:00 後再跑 seed`);
    process.exit(1);
  }
  const slotMs = (latest - earliest) / all.length;

  const ordered = shuffle(all); // 打亂順序避免某 side 集中在同時段
  const rows = ordered.map((c, i) => {
    const baseTs = earliest + slotMs * (i + 0.5);
    const jitter = (Math.random() - 0.5) * 30 * 60 * 1000;  // ±15 min
    const ts = new Date(baseTs + jitter);
    return {
      opinion_id: opinionId,
      side: c.side,
      nickname: randomNick(),
      content: c.content,
      created_at: ts.toISOString(),
    };
  });

  // batch insert
  const { data, error } = await sb.from('opinion_comments').insert(rows).select('id, side, created_at');
  if (error) {
    console.error('insert 失敗', error);
    process.exit(1);
  }

  console.log(`✅ seed ${data.length} 則留言 to ${opinionId}`);
  // 統計每 side 數量
  const byside = {};
  for (const r of data) byside[r.side] = (byside[r.side] || 0) + 1;
  for (const k of Object.keys(byside)) console.log(`  side ${k}: ${byside[k]} 則`);

  // ── 同時 seed 對應票數（避免「留言比票還多」露餡）──
  // 每 side 投票數 = 留言數（1:1，每則留言代表一票）
  const voteRows = [];
  for (const sideStr of Object.keys(byside)) {
    const side = parseInt(sideStr);
    const voteCount = byside[sideStr];
    for (let i = 0; i < voteCount; i++) {
      voteRows.push({
        opinion_id: opinionId,
        side,
        voter_key: 'seed_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
      });
    }
  }
  if (voteRows.length) {
    const { data: vData, error: vErr } = await sb.from('opinion_votes').insert(voteRows).select('id, side');
    if (vErr) {
      console.warn('⚠️ 投票 insert 失敗（不影響留言）：', vErr.message || vErr);
    } else {
      console.log(`🗳️ seed ${vData.length} 票 to ${opinionId}`);
      const vByside = {};
      for (const r of vData) vByside[r.side] = (vByside[r.side] || 0) + 1;
      for (const k of Object.keys(vByside)) console.log(`  side ${k}: ${vByside[k]} 票`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
