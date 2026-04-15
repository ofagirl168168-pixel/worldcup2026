#!/usr/bin/env node
/* =============================================
   validate-articles.js — 文章球員歸屬驗證腳本
   用法: node scripts/validate-articles.js
   功能: 比對文章中提到的球員是否與球隊資料一致
   ============================================= */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── 載入球隊資料 ─────────────────────────────
function loadData(file, varName) {
  const code = fs.readFileSync(path.join(ROOT, 'js', file), 'utf-8');
  // mock window 讓 EPL 檔案的 window.XXX = ... 不報錯
  const fn = new Function('window', code + `\nreturn ${varName};`);
  const fakeWindow = {};
  return fn(fakeWindow);
}

let TEAMS_WC, UCL_TEAMS, EPL_TEAMS;
try { TEAMS_WC  = loadData('data-teams.js',     'TEAMS');     } catch(e) { console.warn('⚠ 無法載入 data-teams.js:', e.message);     TEAMS_WC  = {}; }
try { UCL_TEAMS = loadData('ucl-data-teams.js',  'UCL_TEAMS'); } catch(e) { console.warn('⚠ 無法載入 ucl-data-teams.js:', e.message); UCL_TEAMS = {}; }
try { EPL_TEAMS = loadData('epl-data-teams.js',  'EPL_TEAMS'); } catch(e) { console.warn('⚠ 無法載入 epl-data-teams.js:', e.message); EPL_TEAMS = {}; }

// ── 建立球員 → 球隊 對照表 ─────────────────────
// { 'Bukayo Saka': [{ team:'ARS', teamName:'兵工廠', source:'epl' }] }
const playerMap = {};

function indexTeams(teamsObj, source) {
  for (const [code, team] of Object.entries(teamsObj)) {
    const teamLabel = team.nameCN || team.name || code;
    const players = [
      ...(team.keyPlayers || []),
      ...(team.injuries  || [])
    ];
    for (const p of players) {
      if (!p.name) continue;
      if (!playerMap[p.name]) playerMap[p.name] = [];
      // 避免重複
      if (!playerMap[p.name].some(e => e.team === code && e.source === source)) {
        playerMap[p.name].push({ team: code, teamName: teamLabel, source });
      }
    }
  }
}

indexTeams(TEAMS_WC,  'wc');
indexTeams(UCL_TEAMS, 'ucl');
indexTeams(EPL_TEAMS, 'epl');

const allPlayerNames = Object.keys(playerMap).sort((a, b) => b.length - a.length); // 長名優先匹配

// ── 載入文章 ─────────────────────────────────
let articles = [];
try { articles = articles.concat(loadData('data-articles.js',     'ARTICLES').map(a => ({ ...a, source: 'wc' })));  } catch(e) { console.warn('⚠ 無法載入 data-articles.js:', e.message); }
try { articles = articles.concat(loadData('ucl-data-articles.js', 'UCL_ARTICLES').map(a => ({ ...a, source: 'ucl' }))); } catch(e) { console.warn('⚠ 無法載入 ucl-data-articles.js:', e.message); }
try { articles = articles.concat(loadData('epl-data-articles.js', 'EPL_ARTICLES').map(a => ({ ...a, source: 'epl' }))); } catch(e) { console.warn('⚠ 無法載入 epl-data-articles.js:', e.message); }

// ── 從文章內容提取提到的球員 ─────────────────
function extractMentionedPlayers(text) {
  const found = [];
  for (const name of allPlayerNames) {
    // 用 surname 和全名做匹配
    if (text.includes(name)) {
      found.push(name);
    }
  }
  return [...new Set(found)];
}

// ── 從文章標題/內容推斷文章涉及的球隊 ────────
function inferArticleTeams(article) {
  const text = (article.title || '') + ' ' + (article.content || article.body || '') + ' ' + (article.summary || '');
  const teams = new Set();

  // 比對球隊代碼和中文名
  const allTeamSources = [
    { obj: TEAMS_WC, source: 'wc' },
    { obj: UCL_TEAMS, source: 'ucl' },
    { obj: EPL_TEAMS, source: 'epl' }
  ];

  for (const { obj } of allTeamSources) {
    for (const [code, team] of Object.entries(obj)) {
      if (text.includes(team.nameCN) || text.includes(team.name) || text.includes(code)) {
        teams.add(code);
      }
    }
  }
  return [...teams];
}

// ── 驗證 ─────────────────────────────────────
let totalIssues = 0;
const issues = [];

for (const article of articles) {
  const text = (article.title || '') + ' ' + (article.content || article.body || '') + ' ' + (article.summary || '');
  const mentionedPlayers = extractMentionedPlayers(text);
  const articleTeams = inferArticleTeams(article);

  for (const playerName of mentionedPlayers) {
    const registrations = playerMap[playerName];
    if (!registrations || registrations.length === 0) continue;

    // 球員所屬球隊
    const playerTeamCodes = registrations.map(r => r.team);

    // 檢查文章中是否有「球員名 + 錯誤球隊」的情境
    // 找出文章提到的球隊中，哪些不是該球員的所屬球隊
    // 只在文章明確討論某隊+某球員時才算問題

    // 規則：如果文章提到球員 X，且 X 在我們資料中屬於 A 隊
    // 但文章中只討論 B 隊（且 B 隊是我們資料中存在的隊伍），
    // 且 X 不屬於 B 隊 → 警告

    // 但很多文章是綜合分析（討論多隊），這種情況球員出現在其所屬球隊段落是正常的
    // 所以只在：文章提及的隊伍都不包含球員所屬隊伍時，才報警告
    // 跨賽事檢查：球員可能在 WC 資料登記在國家隊、在 UCL/EPL 登記在俱樂部
    // 把所有 source 的球隊碼合併
    const allPlayerTeams = registrations.map(r => r.team);
    const overlap = articleTeams.filter(t => allPlayerTeams.includes(t));

    if (overlap.length === 0 && articleTeams.length > 0) {
      // 判斷嚴重度：
      // - 文章只討論 1 隊且球員不屬於該隊 → 高風險
      // - 文章討論多隊（綜合分析）→ 低風險（可能是對手球員或跨隊討論）
      const severity = articleTeams.length <= 2 ? 'HIGH' : 'low';
      const belongsTo = registrations.map(r => `${r.teamName}(${r.team})`).join(', ');
      const articleAbout = articleTeams.join(', ');
      issues.push({
        article: `[${article.source}] ${article.id || article.title}`,
        player: playerName,
        belongsTo,
        articleAbout,
        severity
      });
      totalIssues++;
    }
  }
}

// ── 輸出結果 ─────────────────────────────────
console.log('\n========================================');
console.log('  文章球員歸屬驗證報告');
console.log('========================================\n');
console.log(`📊 檢查統計：`);
console.log(`   文章數量：${articles.length}`);
console.log(`   球員資料庫：${allPlayerNames.length} 位球員`);
console.log(`   問題數量：${totalIssues}\n`);

const highIssues = issues.filter(i => i.severity === 'HIGH');
const lowIssues  = issues.filter(i => i.severity === 'low');

if (issues.length === 0) {
  console.log('✅ 未發現球員歸屬問題！\n');
} else {
  if (highIssues.length) {
    console.log(`🔴 高風險（${highIssues.length} 項）— 球員可能歸屬錯誤：\n`);
    for (const issue of highIssues) {
      console.log(`  📄 文章: ${issue.article}`);
      console.log(`     球員: ${issue.player}`);
      console.log(`     球員所屬: ${issue.belongsTo}`);
      console.log(`     文章討論: ${issue.articleAbout}`);
      console.log('');
    }
  }
  if (lowIssues.length) {
    console.log(`🟡 低風險（${lowIssues.length} 項）— 可能是綜合分析中的對手球員：\n`);
    for (const issue of lowIssues) {
      console.log(`  📄 ${issue.article} — ${issue.player} (屬 ${issue.belongsTo})`);
    }
    console.log('');
  }
}

// ── 額外檢查：球隊資料中的球員重複登記 ────────
console.log('── 球員重複登記檢查 ──\n');
let dupes = 0;
for (const [name, regs] of Object.entries(playerMap)) {
  // 同一 source 內多個隊伍
  const sources = {};
  for (const r of regs) {
    if (!sources[r.source]) sources[r.source] = [];
    sources[r.source].push(r);
  }
  for (const [src, srcRegs] of Object.entries(sources)) {
    const uniqueTeams = [...new Set(srcRegs.map(r => r.team))];
    if (uniqueTeams.length > 1) {
      console.log(`  ⚠ ${name} 在 [${src}] 中同時登記在: ${srcRegs.map(r => `${r.teamName}(${r.team})`).join(', ')}`);
      dupes++;
    }
  }
}
if (dupes === 0) console.log('  ✅ 無重複登記\n');
else console.log(`\n  共 ${dupes} 項重複登記\n`);

console.log('========================================\n');
process.exit(totalIssues > 0 ? 1 : 0);
