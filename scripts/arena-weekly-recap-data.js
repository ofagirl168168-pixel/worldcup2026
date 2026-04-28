#!/usr/bin/env node
/**
 * arena-weekly-recap-data.js
 * 撈本週擂台投票 + 留言聚合，給「擂台首週戰報」文章用
 *
 * 用法：node scripts/arena-weekly-recap-data.js
 *
 * 預設範圍：2026-04-21 ~ 2026-04-27（首週）
 * 可改：node scripts/arena-weekly-recap-data.js 2026-04-21 2026-04-27
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.join(__dirname, '..');
const SUPA_URL = process.env.SUPABASE_URL || 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';
const sb = createClient(SUPA_URL, SUPA_KEY);

const FROM = process.argv[2] || '2026-04-21';
const TO   = process.argv[3] || '2026-04-27';

// 載入題庫（vm 沙箱）
const sandbox = { window: {}, console };
vm.createContext(sandbox);
const dataOpinionsPath = path.join(ROOT, 'js', 'data-opinions.js');
const code = fs.readFileSync(dataOpinionsPath, 'utf-8');
vm.runInContext(code, sandbox);
const ALL = sandbox.window.DAILY_OPINIONS || [];

// 過濾本週題目（有 date 且在範圍內）— 用 (id+date) 去重
const seen = new Set();
const weekOpinions = [];
for (const o of ALL) {
  if (!o.date || o.date < FROM || o.date > TO) continue;
  const k = `${o.id}|${o.date}`;
  if (seen.has(k)) continue;
  seen.add(k); weekOpinions.push(o);
}
weekOpinions.sort((a, b) => a.date.localeCompare(b.date));

console.log(`Week range: ${FROM} ~ ${TO}`);
console.log(`Found ${weekOpinions.length} questions:\n`);

(async () => {
  const summary = [];
  let totalVotes = 0;
  let totalComments = 0;

  for (const o of weekOpinions) {
    // 票數
    let tally = Array(o.opts.length).fill(0);
    try {
      const { data, error } = await sb.rpc('opinion_vote_tally', { oid: o.id });
      if (error) throw error;
      (data || []).forEach(row => {
        const s = typeof row.side === 'number' ? row.side : parseInt(row.side);
        if (s >= 0 && s < o.opts.length) tally[s] = Number(row.votes) || 0;
      });
    } catch (e) {
      console.warn(`[${o.id}] tally fail: ${e.message}`);
    }
    const total = tally.reduce((a, b) => a + b, 0);
    totalVotes += total;

    // 留言
    let comments = [];
    try {
      const { data } = await sb
        .from('opinion_comments')
        .select('side, nickname, content, likes, created_at')
        .eq('opinion_id', o.id)
        .order('likes', { ascending: false })
        .limit(10);
      comments = data || [];
    } catch (e) {
      console.warn(`[${o.id}] comments fail: ${e.message}`);
    }
    totalComments += comments.length;

    // 分裂指數：(各選項票數 / 總票) 跟均勻分布的距離
    // 越接近均勻分布（每個選項 1/N）= 越分裂
    const n = o.opts.length;
    const expected = total / n;
    const variance = total > 0
      ? tally.reduce((s, v) => s + Math.pow(v - expected, 2), 0) / n
      : 0;
    const splitScore = total > 0 ? 1 - Math.sqrt(variance) / total : 0; // 0~1，1=完美分裂

    // 最高得票選項
    const maxV = Math.max(...tally);
    const topIdx = tally.indexOf(maxV);
    const topPct = total > 0 ? Math.round(maxV / total * 100) : 0;

    summary.push({
      id: o.id,
      date: o.date,
      type: o.type,
      q: o.q,
      opts: o.opts,
      context: o.context,
      tally,
      total,
      topIdx,
      topPct,
      splitScore,
      comments,
    });

    console.log(`📌 ${o.date}  ${o.type === 'predict' ? '🔮' : o.type === 'fun' ? '😄' : '🔥'} ${o.q}`);
    console.log(`   票數: ${total} | 分布: ${tally.join('/')} | 主流: ${o.opts[topIdx]} (${topPct}%) | 分裂指數: ${(splitScore*100).toFixed(0)}/100`);
    console.log(`   留言: ${comments.length} 則${comments.length > 0 ? `（最高讚 ${comments[0].likes||0}）` : ''}`);
    console.log('');
  }

  // 整體統計
  const sortedBySplit = [...summary].filter(s => s.total >= 2).sort((a, b) => b.splitScore - a.splitScore);
  const sortedByVotes = [...summary].sort((a, b) => b.total - a.total);
  const sortedByConsensus = [...summary].filter(s => s.total >= 2).sort((a, b) => b.topPct - a.topPct);

  console.log('═══════════════════════════════════════');
  console.log(`📊 一週總計：${weekOpinions.length} 題 / ${totalVotes} 票 / ${totalComments} 則留言`);
  console.log('═══════════════════════════════════════\n');

  console.log('🔥 最熱門（票最多）TOP 3:');
  sortedByVotes.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i+1}. [${s.date}] ${s.q} — ${s.total} 票`);
  });
  console.log('');

  console.log('⚔️  最分裂（接近 50/50）TOP 3:');
  sortedBySplit.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i+1}. [${s.date}] ${s.q} — 主流 ${s.topPct}%、分裂指數 ${(s.splitScore*100).toFixed(0)}`);
  });
  console.log('');

  console.log('🤝 最一致（壓倒性多數）TOP 3:');
  sortedByConsensus.slice(0, 3).forEach((s, i) => {
    console.log(`  ${i+1}. [${s.date}] ${s.q} — ${s.opts[s.topIdx]} ${s.topPct}%`);
  });
  console.log('');

  // 全週前 5 名最讚留言
  const allComments = summary.flatMap(s =>
    s.comments.map(c => ({ ...c, opinionDate: s.date, opinionQ: s.q, opinionId: s.id, sideLabel: s.opts[c.side] || '' }))
  );
  allComments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  console.log('💬 全週最讚留言 TOP 5:');
  allComments.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i+1}. ${c.nickname || '匿名'}（${c.likes || 0} ❤️）[${c.opinionDate}]`);
    console.log(`     站「${c.sideLabel}」：${c.content}`);
  });
  console.log('');

  // 輸出 JSON 給後續寫文章用
  const outPath = path.join(ROOT, 'scripts', 'arena-weekly-recap-data.json');
  fs.writeFileSync(outPath, JSON.stringify({
    range: { from: FROM, to: TO },
    totals: { questions: weekOpinions.length, votes: totalVotes, comments: totalComments },
    questions: summary,
    topByVotes: sortedByVotes.slice(0, 5),
    topBySplit: sortedBySplit.slice(0, 5),
    topByConsensus: sortedByConsensus.slice(0, 5),
    topComments: allComments.slice(0, 10),
  }, null, 2), 'utf-8');
  console.log(`\nJSON 寫入：${outPath}`);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
