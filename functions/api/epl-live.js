/* =============================================
   Cloudflare Pages Function: /api/epl-live
   從 football-data.org 取得英超即時比分
   ============================================= */

// ── football-data.org 隊伍 TLA → 本站代碼 ──
const TLA_MAP = {
  'ARS':'ARS', 'AVL':'AVL', 'BOU':'BOU', 'BRE':'BRE', 'BHA':'BHA',
  'BUR':'BUR', 'CHE':'CHE', 'CRY':'CRY', 'EVE':'EVE', 'FUL':'FUL',
  'LEE':'LEE', 'LIV':'LIV', 'MCI':'MCI', 'MUN':'MUN', 'NEW':'NEW',
  'NFO':'NFO', 'SHU':'SHU', 'TOT':'TOT', 'WHU':'WHU', 'WOL':'WOL',
  // 額外別名
  'LEU':'LEE', 'SOU':'SOU', 'IPS':'IPS', 'LEI':'LEI',
  'SUN':'SUN', 'BNY':'BUR',
};

const NAME_MAP = {
  'Arsenal': 'ARS', 'Arsenal FC': 'ARS',
  'Aston Villa': 'AVL', 'Aston Villa FC': 'AVL',
  'AFC Bournemouth': 'BOU', 'Bournemouth': 'BOU',
  'Brentford': 'BRE', 'Brentford FC': 'BRE',
  'Brighton & Hove Albion': 'BHA', 'Brighton': 'BHA', 'Brighton Hove Albion': 'BHA',
  'Burnley': 'BUR', 'Burnley FC': 'BUR',
  'Chelsea': 'CHE', 'Chelsea FC': 'CHE',
  'Crystal Palace': 'CRY', 'Crystal Palace FC': 'CRY',
  'Everton': 'EVE', 'Everton FC': 'EVE',
  'Fulham': 'FUL', 'Fulham FC': 'FUL',
  'Leeds United': 'LEE', 'Leeds': 'LEE',
  'Liverpool': 'LIV', 'Liverpool FC': 'LIV',
  'Manchester City': 'MCI', 'Man City': 'MCI', 'Manchester City FC': 'MCI',
  'Manchester United': 'MUN', 'Man United': 'MUN', 'Manchester United FC': 'MUN',
  'Newcastle United': 'NEW', 'Newcastle': 'NEW', 'Newcastle United FC': 'NEW',
  'Nottingham Forest': 'NFO', 'Nott\'m Forest': 'NFO',
  'Sheffield United': 'SHU', 'Sheffield Utd': 'SHU',
  'Tottenham Hotspur': 'TOT', 'Tottenham': 'TOT', 'Spurs': 'TOT',
  'West Ham United': 'WHU', 'West Ham': 'WHU',
  'Wolverhampton Wanderers': 'WOL', 'Wolves': 'WOL',
  // 可能的替代球隊
  'Southampton': 'SOU', 'Southampton FC': 'SOU',
  'Ipswich Town': 'IPS', 'Ipswich': 'IPS',
  'Leicester City': 'LEI', 'Leicester': 'LEI',
  'Sunderland': 'SUN', 'Sunderland AFC': 'SUN',
};

function resolveTeam(team) {
  if (!team) return 'TBD';
  if (team.name && NAME_MAP[team.name]) return NAME_MAP[team.name];
  if (team.shortName && NAME_MAP[team.shortName]) return NAME_MAP[team.shortName];
  if (team.tla && TLA_MAP[team.tla]) return TLA_MAP[team.tla];
  if (team.tla && /^[A-Z]{3}$/.test(team.tla)) return team.tla;
  return 'TBD';
}

function transformMatch(m) {
  const home = resolveTeam(m.homeTeam);
  const away = resolveTeam(m.awayTeam);
  const status = m.status === 'FINISHED' ? 'finished'
    : (m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'LIVE') ? 'live'
    : 'scheduled';

  let score = null;
  if (m.score?.fullTime?.home !== null && m.score?.fullTime?.home !== undefined) {
    score = { h: m.score.fullTime.home, a: m.score.fullTime.away };
  } else if (m.score?.home !== null && m.score?.home !== undefined) {
    // 比賽進行中：fullTime 尚未有值，改用 score 根層級
    score = { h: m.score.home, a: m.score.away };
  } else if (m.score?.halfTime?.home !== null && m.score?.halfTime?.home !== undefined) {
    score = { h: m.score.halfTime.home, a: m.score.halfTime.away };
  }

  const goals = (m.goals || []).map(g => ({
    min: String(g.minute) + (g.injuryTime ? `+${g.injuryTime}` : ''),
    player: g.scorer?.name || '?',
    side: g.team?.id === m.homeTeam?.id ? 'h' : 'a',
    ...(g.type === 'OWN' ? { type: 'og' } : g.type === 'PENALTY' ? { type: 'pen' } : {})
  }));

  let date = '', time = '';
  if (m.utcDate) {
    const d = new Date(m.utcDate);
    const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    date = tw.toISOString().slice(0, 10);
    time = tw.toISOString().slice(11, 16);
  }

  let minute = null;
  if (status === 'live') {
    // football-data.org v4 不同方案提供的欄位可能不同
    minute = m.minute ?? m.matchMinute ?? null;
  }

  return {
    id: `EPL-MW${m.matchday || 0}-${home}-${away}`,
    home, away, status, score, goals, date, time, minute,
    matchday: m.matchday || null,
    stage: 'league'
  };
}

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=120, s-maxage=120',
  };

  const apiKey = context.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false, matches: [], error: 'FOOTBALL_DATA_API_KEY not set'
    }), { headers });
  }

  try {
    // 取得 URL 參數：可指定 matchday 或取全部
    const url = new URL(context.request.url);
    const md = url.searchParams.get('matchday');
    const apiUrl = md
      ? `https://api.football-data.org/v4/competitions/PL/matches?season=2025&matchday=${md}`
      : 'https://api.football-data.org/v4/competitions/PL/matches?season=2025';

    const res = await fetch(apiUrl, {
      headers: { 'X-Auth-Token': apiKey }
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({
        ok: false, matches: [],
        error: `football-data.org ${res.status}: ${text.slice(0, 200)}`
      }), { status: 502, headers });
    }

    const data = await res.json();
    const matches = (data.matches || []).map(transformMatch).filter(Boolean);

    return new Response(JSON.stringify({
      ok: true,
      matches,
      currentMatchday: data.resultSet?.played || null,
      updated: new Date().toISOString(),
      count: matches.length
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, matches: [], error: e.message
    }), { status: 500, headers });
  }
}
