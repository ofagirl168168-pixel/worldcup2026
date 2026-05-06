#!/usr/bin/env node
/**
 * backfill-arena-votes.js
 *
 * 對指定 opinion_id（或不指定 → 全掃所有 opinion_comments）對齊 seed 票數：
 *   - 每 side 票數 = 留言數（1:1）
 *   - 多的 seed 票（voter_key 以 'seed_' 開頭）會被刪除，少的會補上
 *   - 真實使用者票（voter_key 不是 'seed_' 開頭）原封不動
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
    // 各 side 留言統計（目標票數）
    const { data: comments, error: cErr } = await sb
      .from('opinion_comments')
      .select('side')
      .eq('opinion_id', oid);
    if (cErr) { console.warn(`讀 ${oid} 留言失敗`, cErr); continue; }

    const targetBySide = {};
    for (const c of comments || []) targetBySide[c.side] = (targetBySide[c.side] || 0) + 1;
    if (!Object.keys(targetBySide).length) { console.log(`⏭️  ${oid}：沒留言可參考`); continue; }

    // 全部現有票（含真實使用者）+ 分出 seed 票（可以刪）
    const { data: allVotes, error: vReadErr } = await sb
      .from('opinion_votes')
      .select('id, side, voter_key')
      .eq('opinion_id', oid);
    if (vReadErr) { console.warn(`${oid} 讀票失敗`, vReadErr); continue; }

    const votesBySide = {};      // 全部票（real + seed）
    const seedsBySide = {};      // 只有 seed 票（可刪）
    for (const v of allVotes || []) {
      (votesBySide[v.side] = votesBySide[v.side] || []).push(v);
      if (typeof v.voter_key === 'string' && v.voter_key.startsWith('seed_')) {
        (seedsBySide[v.side] = seedsBySide[v.side] || []).push(v);
      }
    }

    let inserted = 0, deleted = 0;
    const allSides = new Set([...Object.keys(targetBySide), ...Object.keys(votesBySide)]);

    for (const sideStr of allSides) {
      const side = parseInt(sideStr);
      const target = targetBySide[sideStr] || 0;          // 目標票數 = 該 side 留言數
      const current = (votesBySide[sideStr] || []).length; // 目前總票數
      const seedHere = (seedsBySide[sideStr] || []);

      if (current > target) {
        // 太多票：刪 seed 票（最多刪到 0；真實使用者票不動）
        const overflow = current - target;
        const toDelete = seedHere.slice(0, Math.min(overflow, seedHere.length)).map(v => v.id);
        if (toDelete.length) {
          const { error: dErr } = await sb.from('opinion_votes').delete().in('id', toDelete);
          if (dErr) { console.warn(`${oid} side ${side} 刪票失敗`, dErr); continue; }
          deleted += toDelete.length;
        }
      } else if (current < target) {
        // 票太少：補 seed 票到目標
        const need = target - current;
        const rows = [];
        for (let i = 0; i < need; i++) {
          rows.push({
            opinion_id: oid,
            side,
            voter_key: 'seed_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
          });
        }
        const { error: iErr } = await sb.from('opinion_votes').insert(rows);
        if (iErr) { console.warn(`${oid} side ${side} 補票失敗`, iErr); continue; }
        inserted += need;
      }
    }

    if (inserted === 0 && deleted === 0) {
      console.log(`✓ ${oid}：已對齊（每 side 票數 = 留言數）`);
    } else {
      const summary = Object.keys(targetBySide).sort().map(k => `s${k}:${targetBySide[k]}`).join(' ');
      console.log(`✅ ${oid}：+${inserted} -${deleted}（目標 ${summary}）`);
    }
  }

  console.log('done.');
})().catch(e => { console.error(e); process.exit(1); });
