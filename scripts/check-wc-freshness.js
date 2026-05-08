#!/usr/bin/env node
/**
 * check-wc-freshness.js
 * 計算上一篇純 WC 文章距今幾天 + 本週欠幾篇 — 給日更 prompt 用。
 *
 * 規則（依 memory/project_articles_schedule.md）：
 *   - WC 文章每週至少 2 篇（建議週一 + 週四）
 *   - 「純 WC」= tournament:'wc'/'all'+cat 不是「社群觀察」（擂台戰報不算）
 *   - 距今 > 4 天就算「斷檔」、本週發稿數 < 2 就算「欠篇」
 *
 * 用法：node scripts/check-wc-freshness.js
 *
 * 輸出（單行 JSON，方便 bot.py 用 jq 抓）：
 * {
 *   "lastWCDate": "2026-05-08",
 *   "daysSinceLastWC": 0,
 *   "thisWeekCount": 1,
 *   "thisWeekTarget": 2,
 *   "owedThisWeek": 1,
 *   "isStale": false,
 *   "shouldWriteToday": true,
 *   "summary": "📊 WC 週更：本週已 1 / 目標 2 篇，今天可加一篇"
 * }
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ARTICLES_FILE = path.join(ROOT, 'js', 'data-articles.js');

// 解析 ARTICLES（IIFE 包起來抽 const 出來）
function loadArticles() {
  const code = fs.readFileSync(ARTICLES_FILE, 'utf8');
  const wrapped = `(function(){const window={}; ${code}; return ARTICLES;})();`;
  const ctx = { console };
  vm.createContext(ctx);
  return vm.runInContext(wrapped, ctx);
}

function parseDate(s) {
  // 'YYYY-MM-DD' → Date（UTC 中午，避開時區問題）
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function daysBetween(later, earlier) {
  return Math.floor((later - earlier) / 86400000);
}

function startOfWeekMon(d) {
  // 取本週週一 00:00（UTC+8 視角，我們直接用 UTC 但不影響相對天數）
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  const day = x.getUTCDay(); // 0=Sun, 1=Mon...
  const offset = day === 0 ? 6 : day - 1;
  x.setUTCDate(x.getUTCDate() - offset);
  return x;
}

function isPureWC(a) {
  // 純 WC：tournament 是 'wc'/'all'/undefined，且 cat 不是「社群觀察」（擂台戰報不算）
  const t = a.tournament || 'wc';
  if (t !== 'wc' && t !== 'all') return false;
  if (a.cat === '社群觀察') return false;
  return true;
}

function main() {
  const articles = loadArticles();
  const wcArticles = articles.filter(isPureWC).sort((a, b) => b.date.localeCompare(a.date));

  if (wcArticles.length === 0) {
    console.log(JSON.stringify({ error: '沒有任何 WC 文章' }));
    process.exit(1);
  }

  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const lastWCDate = wcArticles[0].date;
  const daysSinceLastWC = daysBetween(today, parseDate(lastWCDate));

  // 本週起算（週一）
  const weekStart = startOfWeekMon(today);
  const thisWeekCount = wcArticles.filter(a => parseDate(a.date) >= weekStart).length;
  const thisWeekTarget = 2;
  const owedThisWeek = Math.max(0, thisWeekTarget - thisWeekCount);

  // 規則：> 4 天斷檔 OR 本週欠篇 → 應該寫
  const isStale = daysSinceLastWC > 4;
  const shouldWriteToday = isStale || owedThisWeek > 0;

  let summary;
  if (isStale) {
    summary = `⚠️ WC 已 ${daysSinceLastWC} 天沒新文（最後 ${lastWCDate}）— 今天必補一篇`;
  } else if (owedThisWeek > 0) {
    summary = `📊 WC 週更：本週已 ${thisWeekCount} / 目標 ${thisWeekTarget} 篇，今天可加一篇`;
  } else {
    summary = `✅ WC 週更達標：本週已 ${thisWeekCount} 篇`;
  }

  console.log(JSON.stringify({
    lastWCDate,
    daysSinceLastWC,
    thisWeekCount,
    thisWeekTarget,
    owedThisWeek,
    isStale,
    shouldWriteToday,
    summary,
  }));
}

main();
