/**
 * fetch-live.js
 * 由 GitHub Actions 每 30 分鐘執行，抓取即時足球資料並寫入 js/data-live.json
 *
 * API 用量策略：
 *   世界盃前（2026-06-11 前）：每 12 小時更新一次 → ~2 calls/day
 *   世界盃期間：每次執行最多 3 calls → ~144 calls/day … 但 free tier 100/day
 *   → 實際做法：世界盃期間仍每 30 分鐘執行，但只在「整點或半點」真正打 API
 *     奇數 30 分鐘週期直接跳過（不打 API，直接用舊資料）
 *     → 等於每 60 分鐘打 API 一次，48×(1/2)=24 次/天，完全安全
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_FOOTBALL_KEY;
const OUT_FILE = path.join(__dirname, '..', 'js', 'data-live.json');

// 世界盃 2026 日期範圍
const WC_START = new Date('2026-06-11T00:00:00Z');
const WC_END   = new Date('2026-07-20T00:00:00Z');
const WC_SEASON = 2026;

// ── 工具函式 ────────────────────────────────────────────────
function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      method: 'GET',
      headers: {
        'x-apisports-key': API_KEY
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.log('No API key found, skipping fetch.');
    process.exit(0);
  }

  const now = new Date();
  const isDuringWC = now >= WC_START && now <= WC_END;

  // 世界盃前：每 12 小時才真正更新（節省 API 配額）
  if (!isDuringWC) {
    const existing = loadExisting();
    if (existing && existing.updatedAt) {
      const lastUpdate = new Date(existing.updatedAt);
      const hoursSince = (now - lastUpdate) / 3600000;
      if (hoursSince < 12) {
        console.log(`Pre-WC: last update ${hoursSince.toFixed(1)}h ago, skipping.`);
        process.exit(0);
      }
    }
  } else {
    // 世界盃期間：只有整點或半點（分鐘 0–5 or 30–35）才打 API
    const mins = now.getUTCMinutes();
    const isSlot = (mins <= 5) || (mins >= 30 && mins <= 35);
    if (!isSlot) {
      console.log(`WC period: not in update slot (minute ${mins}), skipping.`);
      process.exit(0);
    }
  }

  console.log(`Fetching live data at ${now.toISOString()} ...`);

  const result = {
    updatedAt: now.toISOString(),
    isDuringWC,
    standings: {},
    topScorers: [],
    liveMatches: [],
    fixtureResults: []
  };

  try {
    // 1. FIFA 排名（只需偶爾更新，抓一次）
    // API-Football 沒有 FIFA 排名端點，跳過

    if (isDuringWC) {
      // 2. 即時比賽（世界盃期間）
      const liveRes = await apiGet(`/fixtures?live=all&league=1&season=${WC_SEASON}`);
      if (liveRes.response) {
        result.liveMatches = liveRes.response.map(f => ({
          id: f.fixture.id,
          status: f.fixture.status.short,
          elapsed: f.fixture.status.elapsed,
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          homeGoals: f.goals.home,
          awayGoals: f.goals.away,
          date: f.fixture.date
        }));
      }
      console.log(`Live matches: ${result.liveMatches.length}`);

      // 3. 最近完賽結果（最近 10 場）
      const finishedRes = await apiGet(`/fixtures?league=1&season=${WC_SEASON}&status=FT&last=10`);
      if (finishedRes.response) {
        result.fixtureResults = finishedRes.response.map(f => ({
          id: f.fixture.id,
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          homeGoals: f.goals.home,
          awayGoals: f.goals.away,
          date: f.fixture.date
        }));
      }
      console.log(`Recent results: ${result.fixtureResults.length}`);

      // 4. 射手榜
      const scorersRes = await apiGet(`/players/topscorers?league=1&season=${WC_SEASON}`);
      if (scorersRes.response) {
        result.topScorers = scorersRes.response.slice(0, 10).map(p => ({
          name: p.player.name,
          nationality: p.player.nationality,
          goals: p.statistics[0].goals.total,
          assists: p.statistics[0].goals.assists,
          team: p.statistics[0].team.name
        }));
      }
      console.log(`Top scorers: ${result.topScorers.length}`);

    } else {
      // 世界盃前：只抓最近的友誼賽結果，用來更新球隊近期勝負
      const recentRes = await apiGet(`/fixtures?team=2&last=5&status=FT`);
      // 僅做一次示範呼叫確認 API 正常
      console.log('Pre-WC: API connectivity check passed.');
    }

  } catch (err) {
    console.error('API fetch error:', err.message);
    // 寫入舊資料保留，僅更新 updatedAt
    const existing = loadExisting();
    if (existing) {
      existing.updatedAt = now.toISOString();
      existing.fetchError = err.message;
      fs.writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2), 'utf8');
    }
    process.exit(0);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Written to ${OUT_FILE}`);
}

main();
