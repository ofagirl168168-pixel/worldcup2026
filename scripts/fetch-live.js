/**
 * fetch-live.js
 * 由 GitHub Actions 每 30 分鐘執行
 *
 * 智慧用量策略（免費 100 次/天）：
 *
 *  [即時比賽橫幅]
 *    只在「比賽時段」每 30 分鐘抓一次 /fixtures?live=all（1 call）
 *    2026 WC 北美時段（夏令）：UTC 14:00 – 05:00
 *      最早開賽 UTC 14:00（東部 10:00）
 *      最晚結束 UTC 05:00（太平洋 19:00 開賽 + 2h + 緩衝）
 *    → 約 32 次觸發 × 1 call = ~32 calls/day
 *
 *  [每日統計榜單]
 *    每天 UTC 06:00（確保所有比賽含延長賽都結束後）一次性抓 4 個 endpoint：
 *    standings + topscorers + topassists + topkeeper
 *    → 1 次/天 × 4 calls = 4 calls/day
 *
 *  總計：~36 calls/day（遠低於 100 上限）
 *
 *  世界盃前：每 24 小時一次 connectivity check（1 call/day）
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.API_FOOTBALL_KEY;
const OUT_FILE = path.join(__dirname, '..', 'js', 'data-live.json');

const WC_START  = new Date('2026-06-11T00:00:00Z');
const WC_END    = new Date('2026-07-20T00:00:00Z');
const WC_SEASON = 2026;

// ── 工具函式 ────────────────────────────────────────────────
function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'v3.football.api-sports.io',
      path: endpoint,
      method: 'GET',
      headers: { 'x-apisports-key': API_KEY }
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
  try { return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); }
  catch { return null; }
}

function saveFile(data) {
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.log('No API key, skipping.');
    process.exit(0);
  }

  const now = new Date();
  const isDuringWC = now >= WC_START && now <= WC_END;
  const utcHour = now.getUTCHours();
  const existing = loadExisting() || {
    updatedAt: now.toISOString(),
    isDuringWC: false,
    standings: [],
    topScorers: [],
    topAssists: [],
    topKeepers: [],
    liveMatches: [],
    lastDailyUpdate: null
  };

  // ── 世界盃前 ─────────────────────────────────────────────
  if (!isDuringWC) {
    const hoursSince = existing.updatedAt
      ? (now - new Date(existing.updatedAt)) / 3600000
      : 999;
    if (hoursSince < 24) {
      console.log(`Pre-WC: ${hoursSince.toFixed(1)}h since last check, skipping.`);
      process.exit(0);
    }
    // 每 24 小時做一次 connectivity check
    try {
      await apiGet(`/status`);
      console.log('Pre-WC: API connectivity OK.');
    } catch (e) {
      console.log('Pre-WC: API check failed:', e.message);
    }
    existing.updatedAt = now.toISOString();
    existing.isDuringWC = false;
    saveFile(existing);
    process.exit(0);
  }

  // ── 世界盃期間 ───────────────────────────────────────────
  existing.isDuringWC = true;

  // 判斷是否在「比賽時段」
  // 2026 WC 北美時區（夏令）：
  //   最早開賽 UTC 14:00（東部 10:00）
  //   最晚開賽 UTC 02:00（太平洋 19:00），比賽結束約 UTC 04:00–05:00
  //   → 保守設定到 UTC 05:00
  const inMatchWindow = utcHour >= 14 || utcHour <= 5;

  // 判斷是否為「每日統計更新時段」：UTC 06:00（確保所有比賽含延長賽都結束）
  const isDailyStatsTime = utcHour === 6;
  const todayStr = now.toISOString().slice(0, 10);
  const dailyAlreadyDone = existing.lastDailyUpdate
    && existing.lastDailyUpdate.startsWith(todayStr);

  if (!inMatchWindow && !isDailyStatsTime) {
    console.log(`UTC ${utcHour}:xx — outside match window and not daily stats time, skipping.`);
    process.exit(0);
  }

  // ── 每日統計（UTC 04:00，只做一次）──────────────────────
  if (isDailyStatsTime && !dailyAlreadyDone) {
    console.log('Running daily stats update...');
    try {
      // Call 1：積分榜
      const standRes = await apiGet(`/standings?league=1&season=${WC_SEASON}`);
      if (standRes.response && standRes.response[0]) {
        existing.standings = standRes.response[0].league.standings.map(group =>
          group.map(e => ({
            rank: e.rank,
            group: e.group,
            teamName: e.team.name,
            played: e.all.played,
            win: e.all.win,
            draw: e.all.draw,
            lose: e.all.lose,
            goalsFor: e.all.goals.for,
            goalsAgainst: e.all.goals.against,
            goalsDiff: e.goalsDiff,
            points: e.points
          }))
        );
        console.log(`Standings: ${existing.standings.length} groups`);
      }

      // Call 2：射手榜
      const scorersRes = await apiGet(`/players/topscorers?league=1&season=${WC_SEASON}`);
      if (scorersRes.response) {
        existing.topScorers = scorersRes.response.slice(0, 10).map(p => ({
          name: p.player.name,
          nationality: p.player.nationality,
          goals: p.statistics[0].goals.total,
          assists: p.statistics[0].goals.assists,
          team: p.statistics[0].team.name
        }));
        console.log(`Top scorers: ${existing.topScorers.length}`);
      }

      // Call 3：助攻榜
      const assistsRes = await apiGet(`/players/topassists?league=1&season=${WC_SEASON}`);
      if (assistsRes.response) {
        existing.topAssists = assistsRes.response.slice(0, 10).map(p => ({
          name: p.player.name,
          nationality: p.player.nationality,
          assists: p.statistics[0].goals.assists,
          goals: p.statistics[0].goals.total,
          team: p.statistics[0].team.name
        }));
        console.log(`Top assists: ${existing.topAssists.length}`);
      }

      // Call 4：門將榜（失球最少）
      const keeperRes = await apiGet(`/players/topyellowcards?league=1&season=${WC_SEASON}`);
      // API-Football 免費版無專屬門將榜，改用 /players/topscorers 過濾 goalkeepers
      // 實際上用 topyellowcards 先測通，門將數據改由比賽統計推算
      // → 暫存原始回應，前端顯示「賽事統計中」
      existing.topKeepers = [];
      console.log('Goalkeeper endpoint: placeholder (API limitation)');

      existing.lastDailyUpdate = now.toISOString();
    } catch (err) {
      console.error('Daily stats error:', err.message);
    }
  }

  // ── 即時比賽（比賽時段內每 30 分鐘）───────────────────────
  if (inMatchWindow) {
    try {
      const liveRes = await apiGet(`/fixtures?live=all&league=1&season=${WC_SEASON}`);
      if (liveRes.response) {
        existing.liveMatches = liveRes.response.map(f => ({
          id: f.fixture.id,
          status: f.fixture.status.short,
          elapsed: f.fixture.status.elapsed,
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          homeGoals: f.goals.home,
          awayGoals: f.goals.away
        }));
        console.log(`Live matches: ${existing.liveMatches.length}`);
      }
    } catch (err) {
      console.error('Live match error:', err.message);
    }
  } else {
    // 非比賽時段清空橫幅
    existing.liveMatches = [];
  }

  existing.updatedAt = now.toISOString();
  saveFile(existing);
  console.log('Written to', OUT_FILE);
}

main();
