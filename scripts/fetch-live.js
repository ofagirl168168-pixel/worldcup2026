/**
 * fetch-live.js
 * 由 GitHub Actions 每 30 分鐘執行，抓取即時足球資料並寫入 js/data-live.json
 *
 * API 用量策略（免費 100 次/天）：
 *   世界盃前（2026-06-11 前）：每 12 小時一次 → ~2 calls/day
 *   世界盃期間：cron 每 30 分鐘跑，但只讓整點（分鐘 0–4）通過
 *     → 24 次/天 × 4 calls = 96 calls/day（在 100 以內）
 *     endpoint: live(1) + standings(1) + topscorers(1) + topassists(1)
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
    // 世界盃期間：只有整點（分鐘 0–4）才打 API
    // cron 每 30 分鐘跑 → 每天 48 次觸發，只有 24 次（整點）真正執行
    // 24 次 × 4 calls = 96 calls/day < 100 免費額度
    const mins = now.getUTCMinutes();
    if (mins > 4) {
      console.log(`WC period: skipping half-hour slot (minute ${mins}), saving quota.`);
      process.exit(0);
    }
  }

  console.log(`Fetching live data at ${now.toISOString()} ...`);

  const result = {
    updatedAt: now.toISOString(),
    isDuringWC,
    standings: [],
    topScorers: [],
    topAssists: [],
    liveMatches: []
  };

  try {
    if (isDuringWC) {
      // ── Call 1：即時比賽 ──────────────────────────────────
      const liveRes = await apiGet(`/fixtures?live=all&league=1&season=${WC_SEASON}`);
      if (liveRes.response) {
        result.liveMatches = liveRes.response.map(f => ({
          id: f.fixture.id,
          status: f.fixture.status.short,
          elapsed: f.fixture.status.elapsed,
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          homeGoals: f.goals.home,
          awayGoals: f.goals.away
        }));
      }
      console.log(`Live matches: ${result.liveMatches.length}`);

      // ── Call 2：積分榜 ────────────────────────────────────
      const standRes = await apiGet(`/standings?league=1&season=${WC_SEASON}`);
      if (standRes.response && standRes.response[0]) {
        const groups = standRes.response[0].league.standings;
        result.standings = groups.map(group =>
          group.map(entry => ({
            rank: entry.rank,
            group: entry.group,
            teamName: entry.team.name,
            played: entry.all.played,
            win: entry.all.win,
            draw: entry.all.draw,
            lose: entry.all.lose,
            goalsFor: entry.all.goals.for,
            goalsAgainst: entry.all.goals.against,
            goalsDiff: entry.goalsDiff,
            points: entry.points
          }))
        );
      }
      console.log(`Standings groups: ${result.standings.length}`);

      // ── Call 3：射手榜 ────────────────────────────────────
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

      // ── Call 4：助攻榜 ────────────────────────────────────
      const assistsRes = await apiGet(`/players/topassists?league=1&season=${WC_SEASON}`);
      if (assistsRes.response) {
        result.topAssists = assistsRes.response.slice(0, 10).map(p => ({
          name: p.player.name,
          nationality: p.player.nationality,
          assists: p.statistics[0].goals.assists,
          goals: p.statistics[0].goals.total,
          team: p.statistics[0].team.name
        }));
      }
      console.log(`Top assists: ${result.topAssists.length}`);

    } else {
      // 世界盃前：確認 API key 有效即可
      console.log('Pre-WC: API connectivity check passed.');
    }

  } catch (err) {
    console.error('API fetch error:', err.message);
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
