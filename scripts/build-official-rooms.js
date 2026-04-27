#!/usr/bin/env node
/**
 * build-official-rooms.js
 *
 * 每日早上跑一次：掃接下來 36 小時內的真實比賽，
 * 自動為每場建一間「官方房」（is_official=true），
 * 開賽時間 = 真實開球前 30 分鐘，讓玩家玩完模擬賽後接著看真實比賽。
 *
 * 用法：
 *   node scripts/build-official-rooms.js
 *
 * 環境變數（皆 optional）：
 *   SUPABASE_URL — 預設用 supabase-client.js 內的 URL
 *   SUPABASE_KEY — 預設用 publishable key（friend_rooms RLS 開放 anon insert）
 *
 * Idempotent：room_code 由 match_id 雜湊產生，重跑同一場不會建第二個房。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.join(__dirname, '..');

// ── 把 EPL/UCL data 檔當 script 在沙箱跑，拿到 window.{EPL,UCL}_{MATCHES,TEAMS} ──
const sandbox = {
  window: {},
  console: { log: () => {}, warn: () => {}, error: () => {} },
};
vm.createContext(sandbox);

function loadJs(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf-8');
  try { vm.runInContext(code, sandbox); }
  catch (e) { console.error(`[load-error] ${file}: ${e.message}`); }
}

loadJs('js/epl-data-teams.js');
loadJs('js/ucl-data-teams.js');
loadJs('js/ucl-data-matches.js');

const EPL_MATCHES = sandbox.window.EPL_MATCHES || [];
const UCL_MATCHES = sandbox.window.UCL_MATCHES || [];
const EPL_TEAMS   = sandbox.window.EPL_TEAMS   || {};
const UCL_TEAMS   = sandbox.window.UCL_TEAMS   || {};

// ── 過濾未來 36 小時內的比賽 ────────────────────────────────
const now = Date.now();
const horizon = now + 36 * 3600 * 1000;

function parseKickoffTs(m) {
  if (!m.date || !m.time) return NaN;
  return new Date(`${m.date}T${m.time}:00+08:00`).getTime();
}

function isUpcoming(m) {
  if (m.status === 'finished') return false;
  const ts = parseKickoffTs(m);
  if (isNaN(ts)) return false;
  // 真實開賽 -30 分必須還在 30 秒以後（不然 lock_at 會過去）
  return (ts - 30 * 60 * 1000) > now + 30 * 1000 && ts < horizon;
}

const targets = [];
for (const m of EPL_MATCHES) if (isUpcoming(m)) targets.push({ m, teams: EPL_TEAMS, league: 'epl' });
for (const m of UCL_MATCHES) if (isUpcoming(m)) targets.push({ m, teams: UCL_TEAMS, league: 'ucl' });

console.log(`Found ${targets.length} upcoming matches in next 36h`);
if (targets.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

// ── 房號：用 match_id 雜湊 → 同場永遠對到同房號（idempotent） ──
const POOL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genOfficialCode(matchId) {
  let h = 5381 >>> 0;
  for (let i = 0; i < matchId.length; i++) {
    h = ((Math.imul(h, 33)) ^ matchId.charCodeAt(i)) >>> 0;
  }
  let code = 'O'; // 'O' 開頭表示官方房
  for (let i = 0; i < 5; i++) {
    code += POOL[h % POOL.length];
    h = Math.floor(h / POOL.length);
  }
  return code;
}

// ── Supabase client ────────────────────────────────────
const SUPA_URL = process.env.SUPABASE_URL || 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';
const sb = createClient(SUPA_URL, SUPA_KEY);

(async () => {
  let created = 0, exists = 0, skipped = 0, errs = 0;

  for (const { m, teams, league } of targets) {
    const home = teams[m.home];
    const away = teams[m.away];
    if (!home || !away || !home.radar || !away.radar) {
      console.log(`[skip-noradar] ${m.id}`);
      skipped++;
      continue;
    }
    const realTs = parseKickoffTs(m);
    const officialTs = realTs - 30 * 60 * 1000;
    const code = genOfficialCode(m.id);

    // 已存在就跳過（無痛重跑）
    const { data: pre, error: preErr } = await sb
      .from('friend_rooms')
      .select('room_code')
      .eq('room_code', code)
      .maybeSingle();
    if (preErr) {
      console.error(`[check-err] ${m.id}: ${preErr.message}`);
      errs++;
      continue;
    }
    if (pre) {
      console.log(`[exists] ${m.id} → ${code}`);
      exists++;
      continue;
    }

    const row = {
      room_code: code,
      host_voter_key: 'official-bot',
      host_nickname: '官方',
      match_ref: `${league}-${m.id}`,
      match_meta: {
        league,
        match_id: m.id,
        date: m.date, time: m.time,
        home_code: m.home, away_code: m.away,
        home_name: home.nameCN || home.name || m.home,
        away_name: away.nameCN || away.name || m.away,
        home_flag: home.flag || '',
        away_flag: away.flag || '',
        real_kickoff_ts: realTs,
      },
      seed: code,
      is_official: true,
      is_public: true,
      bet_amount: 0, // 官方房預設不押注（讓所有人都能玩、不用登入）
      lock_at: new Date(officialTs - 60_000).toISOString(),
      kickoff_at: new Date(officialTs).toISOString(),
      status: 'open',
    };

    const { error: insErr } = await sb.from('friend_rooms').insert(row);
    if (insErr) {
      console.error(`[insert-err] ${m.id} → ${code}: ${insErr.message}`);
      errs++;
    } else {
      console.log(`[created] ${m.id} → ${code}  kickoff=${row.kickoff_at}`);
      created++;
    }
  }

  console.log(`\nDone. created=${created} exists=${exists} skipped=${skipped} errs=${errs}`);
  process.exit(errs > 0 ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
