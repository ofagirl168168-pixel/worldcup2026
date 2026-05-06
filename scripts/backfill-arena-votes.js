#!/usr/bin/env node
/**
 * backfill-arena-votes.js
 *
 * 對指定 opinion_id（或不指定 → 全掃所有 opinion_comments）做反向 seed votes：
 * 計算每 side 留言數 → 投票 = 留言數 × 4 + jitter(0~3)，最少 4 票。
 * 已有 ≥10 票的 opinion 直接跳過（避免重複塞）。
 *
 * 用法：
 *   node scripts/backfill-arena-votes.js                  # 全掃
 *   node scripts/backfill-arena-votes.js op-20260506-a    # 只指定一題
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPA_URL = process.env.SUPABASE_URL || 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';
const sb = createClient(SUPA_URL, SUPA_KEY);

(async () => {
  const onlyId = process.argv[2];

  // 找出要處理的 opinion_id 清單
  let opinionIds;
  if (onlyId) {
    opinionIds = [onlyId];
  } else {
    const { data, error } = await sb
      .from('opinion_comments')
      .select('opinion_id')
      .limit(2000);
    if (error) { console.error('讀 opinion_comments 失敗', error); process.exit(1); }
    opinionIds = [...new Set((data || []).map(r => r.opinion_id))];
  }

  for (const oid of opinionIds) {
    // 已有票數
    const { count: existingVotes } = await sb
      .from('opinion_votes')
      .select('id', { count: 'exact', head: true })
      .eq('opinion_id', oid);
    if (existingVotes && existingVotes >= 10) {
      console.log(`⏭️  ${oid}：已有 ${existingVotes} 票，跳過`);
      continue;
    }

    // 各 side 留言統計
    const { data: comments, error: cErr } = await sb
      .from('opinion_comments')
      .select('side')
      .eq('opinion_id', oid);
    if (cErr) { console.warn(`讀 ${oid} 留言失敗`, cErr); continue; }

    const byside = {};
    for (const c of comments || []) byside[c.side] = (byside[c.side] || 0) + 1;
    if (!Object.keys(byside).length) { console.log(`⏭️  ${oid}：沒留言可參考`); continue; }

    // 投票公式：每 side 留言數 × 4 + 0~3 jitter，最少 4 票
    const voteRows = [];
    for (const sideStr of Object.keys(byside)) {
      const side = parseInt(sideStr);
      const commentCount = byside[sideStr];
      const voteCount = Math.max(4, commentCount * 4 + Math.floor(Math.random() * 4));
      for (let i = 0; i < voteCount; i++) {
        voteRows.push({
          opinion_id: oid,
          side,
          voter_key: 'seed_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
        });
      }
    }

    const { data: vData, error: vErr } = await sb.from('opinion_votes').insert(voteRows).select('id, side');
    if (vErr) { console.warn(`${oid} insert 失敗`, vErr.message || vErr); continue; }

    const vByside = {};
    for (const r of vData) vByside[r.side] = (vByside[r.side] || 0) + 1;
    const summary = Object.keys(vByside).sort().map(k => `s${k}:${vByside[k]}`).join(' ');
    console.log(`✅ ${oid}：seed ${vData.length} 票（${summary}）`);
  }

  console.log('done.');
})().catch(e => { console.error(e); process.exit(1); });
