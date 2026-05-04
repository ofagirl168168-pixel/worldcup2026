#!/usr/bin/env node
/**
 * build-matches-index.js
 * 把 EPL/UCL/WC 所有比賽 meta 抽成 data/matches-index.json
 * 給 Cloudflare Pages Function /m/[id] 用 — 提供比賽分享頁的客製 OG meta
 *
 * 用法：node scripts/build-matches-index.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'matches-index.json');

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
loadJs('js/data-teams.js');
loadJs('js/data-matches.js');

const EPL_TEAMS   = sandbox.window.EPL_TEAMS   || {};
const EPL_MATCHES = sandbox.window.EPL_MATCHES || [];
const UCL_TEAMS   = sandbox.window.UCL_TEAMS   || {};
const UCL_MATCHES = sandbox.window.UCL_MATCHES || [];
const TEAMS       = sandbox.window.TEAMS       || sandbox.TEAMS || {};
const SCHEDULE    = sandbox.window.SCHEDULE    || sandbox.SCHEDULE || [];

function makeRow(m, teams, league) {
  const home = teams[m.home];
  const away = teams[m.away];
  if (!home || !away) return null;
  return {
    id: m.id,
    league,
    date: m.date || '',
    time: m.time || '',
    home: m.home,
    away: m.away,
    home_name: home.nameCN || home.name || m.home,
    away_name: away.nameCN || away.name || m.away,
    home_flag: home.flag || '',
    away_flag: away.flag || '',
    status: m.status || 'scheduled',
    score: m.score || null,
  };
}

const rows = [];
for (const m of EPL_MATCHES) { const r = makeRow(m, EPL_TEAMS, 'epl'); if (r) rows.push(r); }
for (const m of UCL_MATCHES) { const r = makeRow(m, UCL_TEAMS, 'ucl'); if (r) rows.push(r); }
for (const m of SCHEDULE)    { const r = makeRow(m, TEAMS,     'wc');  if (r) rows.push(r); }

// 用 id 當 key，方便 function 直接 hash lookup
const indexed = {};
for (const r of rows) if (r.id) indexed[r.id] = r;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(indexed, null, 0)); // minified to save bytes
const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`Built ${Object.keys(indexed).length} matches index → ${path.relative(ROOT, OUT)} (${sizeKB}KB)`);
