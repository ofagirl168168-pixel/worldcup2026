/* =============================================
   Cloudflare Pages Function: /api/match-stats
   從 API-Football (api-sports.io) 取得單場比賽詳細數據
   控球率、射門、角球、犯規、越位、撲救等

   用法: /api/match-stats?home=MUN&away=LEE&date=2026-04-13&league=epl
   ============================================= */

// 聯賽 ID 對應（API-Football 的 league ID）
const LEAGUE_IDS = {
  epl: 39,    // Premier League
  ucl: 2,     // Champions League
  wc: 1,      // World Cup
};

// ── 本站代碼 → API-Football 常見隊名（用於模糊匹配）──
const CODE_TO_NAMES = {
  'ARS': ['Arsenal'],
  'AVL': ['Aston Villa'],
  'BOU': ['Bournemouth', 'AFC Bournemouth'],
  'BRE': ['Brentford'],
  'BHA': ['Brighton'],
  'BUR': ['Burnley'],
  'CHE': ['Chelsea'],
  'CRY': ['Crystal Palace'],
  'EVE': ['Everton'],
  'FUL': ['Fulham'],
  'LEE': ['Leeds', 'Leeds United'],
  'LIV': ['Liverpool'],
  'MCI': ['Manchester City', 'Man City'],
  'MUN': ['Manchester United', 'Man United'],
  'NEW': ['Newcastle', 'Newcastle United'],
  'NFO': ['Nottingham Forest', "Nott'm Forest"],
  'SHU': ['Sheffield Utd', 'Sheffield United'],
  'TOT': ['Tottenham', 'Spurs'],
  'WHU': ['West Ham'],
  'WOL': ['Wolverhampton', 'Wolves'],
  'SOU': ['Southampton'],
  'IPS': ['Ipswich', 'Ipswich Town'],
  'LEI': ['Leicester', 'Leicester City'],
  // UCL teams
  'BAR': ['Barcelona'],
  'RMA': ['Real Madrid'],
  'BAY': ['Bayern', 'Bayern Munich'],
  'PSG': ['Paris Saint Germain', 'PSG'],
  'INT': ['Inter', 'Inter Milan'],
  'JUV': ['Juventus'],
  'DOR': ['Dortmund', 'Borussia Dortmund'],
  'ATM': ['Atletico Madrid'],
  'BEN': ['Benfica'],
  'ATA': ['Atalanta'],
  'LEV': ['Bayer Leverkusen', 'Leverkusen'],
  'NAP': ['Napoli'],
};

// 模糊匹配隊名
function matchTeam(apiTeamName, code) {
  const names = CODE_TO_NAMES[code] || [code];
  const lower = apiTeamName.toLowerCase();
  return names.some(n => lower.includes(n.toLowerCase()));
}

// 解析 API-Football 的統計資料
function parseStats(statsArray) {
  if (!statsArray || statsArray.length < 2) return null;

  const homeStats = statsArray[0]?.statistics || [];
  const awayStats = statsArray[1]?.statistics || [];

  const get = (arr, type) => {
    const item = arr.find(s => s.type === type);
    return item?.value ?? null;
  };

  // 解析百分比字串
  const parsePct = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return parseInt(val.replace('%', '')) || 0;
    return val;
  };

  return {
    poss: [parsePct(get(homeStats, 'Ball Possession')), parsePct(get(awayStats, 'Ball Possession'))],
    shots: [get(homeStats, 'Total Shots') ?? get(homeStats, 'Shots Total'), get(awayStats, 'Total Shots') ?? get(awayStats, 'Shots Total')],
    sot: [get(homeStats, 'Shots on Goal') ?? get(homeStats, 'Shots On Goal'), get(awayStats, 'Shots on Goal') ?? get(awayStats, 'Shots On Goal')],
    corners: [get(homeStats, 'Corner Kicks') ?? get(homeStats, 'Corners'), get(awayStats, 'Corner Kicks') ?? get(awayStats, 'Corners')],
    fouls: [get(homeStats, 'Fouls'), get(awayStats, 'Fouls')],
    offsides: [get(homeStats, 'Offsides'), get(awayStats, 'Offsides')],
    yellow: [get(homeStats, 'Yellow Cards'), get(awayStats, 'Yellow Cards')],
    red: [get(homeStats, 'Red Cards'), get(awayStats, 'Red Cards')],
    saves: [get(homeStats, 'Goalkeeper Saves') ?? get(homeStats, 'Saves'), get(awayStats, 'Goalkeeper Saves') ?? get(awayStats, 'Saves')],
    passes: [get(homeStats, 'Total passes') ?? get(homeStats, 'Passes Total'), get(awayStats, 'Total passes') ?? get(awayStats, 'Passes Total')],
    passAcc: [parsePct(get(homeStats, 'Passes accurate')), parsePct(get(awayStats, 'Passes accurate'))],
    passAccPct: [parsePct(get(homeStats, 'Passes %')), parsePct(get(awayStats, 'Passes %'))],
  };
}

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 小時快取（完賽數據不會變）
  };

  const apiKey = context.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false, stats: null,
      error: 'API_FOOTBALL_KEY not set — add it in Cloudflare Pages Settings > Environment Variables'
    }), { headers });
  }

  const url = new URL(context.request.url);
  const home = url.searchParams.get('home');
  const away = url.searchParams.get('away');
  const date = url.searchParams.get('date');
  const league = url.searchParams.get('league') || 'epl';

  if (!home || !away || !date) {
    return new Response(JSON.stringify({
      ok: false, stats: null,
      error: 'Missing params: home, away, date required (e.g. ?home=MUN&away=LEE&date=2026-04-13)'
    }), { status: 400, headers });
  }

  const leagueId = LEAGUE_IDS[league];
  if (!leagueId) {
    return new Response(JSON.stringify({
      ok: false, stats: null,
      error: `Unknown league: ${league}. Supported: ${Object.keys(LEAGUE_IDS).join(', ')}`
    }), { status: 400, headers });
  }

  const apiHeaders = {
    'x-apisports-key': apiKey,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  };

  try {
    // Step 1: 找到比賽 fixture ID
    const season = date.slice(0, 4); // e.g. '2025' from '2025-08-16' or '2026' from '2026-04-13'
    // EPL 2025/26 season = 2025
    const seasonYear = league === 'epl' ? '2025' : league === 'ucl' ? '2025' : season;

    const fixturesUrl = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${seasonYear}&date=${date}`;
    const fixRes = await fetch(fixturesUrl, { headers: apiHeaders });

    if (!fixRes.ok) {
      const text = await fixRes.text();
      return new Response(JSON.stringify({
        ok: false, stats: null,
        error: `API-Football fixtures ${fixRes.status}: ${text.slice(0, 200)}`
      }), { status: 502, headers });
    }

    const fixData = await fixRes.json();
    const fixtures = fixData.response || [];

    // 找到匹配的比賽
    const match = fixtures.find(f => {
      const hName = f.teams?.home?.name || '';
      const aName = f.teams?.away?.name || '';
      return matchTeam(hName, home) && matchTeam(aName, away);
    });

    if (!match) {
      return new Response(JSON.stringify({
        ok: false, stats: null,
        error: `No fixture found for ${home} vs ${away} on ${date} (league ${league}). Found ${fixtures.length} fixtures that day.`,
        debug: fixtures.map(f => `${f.teams?.home?.name} vs ${f.teams?.away?.name}`).slice(0, 10)
      }), { headers });
    }

    const fixtureId = match.fixture?.id;
    if (!fixtureId) {
      return new Response(JSON.stringify({
        ok: false, stats: null, error: 'Fixture found but no ID'
      }), { headers });
    }

    // Step 2: 取得比賽統計數據
    const statsUrl = `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`;
    const statsRes = await fetch(statsUrl, { headers: apiHeaders });

    if (!statsRes.ok) {
      const text = await statsRes.text();
      return new Response(JSON.stringify({
        ok: false, stats: null,
        error: `API-Football stats ${statsRes.status}: ${text.slice(0, 200)}`
      }), { status: 502, headers });
    }

    const statsData = await statsRes.json();
    const stats = parseStats(statsData.response);

    return new Response(JSON.stringify({
      ok: true,
      fixtureId,
      home: match.teams?.home?.name,
      away: match.teams?.away?.name,
      stats,
      updated: new Date().toISOString(),
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, stats: null, error: e.message
    }), { status: 500, headers });
  }
}
