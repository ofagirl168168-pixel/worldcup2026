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

// ── 判斷比賽是否最近完賽（24小時內）──
function isRecentlyFinished(utcDate, hours = 24) {
  if (!utcDate) return false;
  const matchTime = new Date(utcDate).getTime();
  const now = Date.now();
  return (now - matchTime) < hours * 60 * 60 * 1000;
}

// ── 轉換進球資料 ──
function transformGoals(goals, homeTeamId) {
  if (!goals || !goals.length) return [];
  return goals.map(g => ({
    min: String(g.minute) + (g.injuryTime ? `+${g.injuryTime}` : ''),
    player: g.scorer?.name || '?',
    side: g.team?.id === homeTeamId ? 'h' : 'a',
    ...(g.type === 'OWN' ? { type: 'og' } : g.type === 'PENALTY' ? { type: 'pen' } : {})
  }));
}

// ── 轉換黃紅牌資料 ──
function transformBookings(bookings, homeTeamId) {
  if (!bookings || !bookings.length) return [];
  return bookings.map(b => ({
    min: String(b.minute) + (b.injuryTime ? `+${b.injuryTime}` : ''),
    player: b.player?.name || '?',
    side: b.team?.id === homeTeamId ? 'h' : 'a',
    card: b.card === 'YELLOW' ? 'yellow' : b.card === 'YELLOW_RED' ? 'yellow_red' : 'red'
  }));
}

// ── 轉換換人資料 ──
function transformSubs(substitutions, homeTeamId) {
  if (!substitutions || !substitutions.length) return [];
  return substitutions.map(s => ({
    min: String(s.minute) + (s.injuryTime ? `+${s.injuryTime}` : ''),
    playerOut: s.playerOut?.name || '?',
    playerIn: s.playerIn?.name || '?',
    side: s.team?.id === homeTeamId ? 'h' : 'a'
  }));
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
    score = { h: m.score.home, a: m.score.away };
  } else if (m.score?.halfTime?.home !== null && m.score?.halfTime?.home !== undefined) {
    score = { h: m.score.halfTime.home, a: m.score.halfTime.away };
  }

  // 進球（從批次端點可能為空，後續由 detail fetch 補充）
  const goals = transformGoals(m.goals, m.homeTeam?.id);

  // 黃紅牌、換人（同上）
  const bookings = transformBookings(m.bookings, m.homeTeam?.id);
  const substitutions = transformSubs(m.substitutions, m.homeTeam?.id);

  let date = '', time = '';
  if (m.utcDate) {
    const d = new Date(m.utcDate);
    const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    date = tw.toISOString().slice(0, 10);
    time = tw.toISOString().slice(11, 16);
  }

  let minute = null;
  if (status === 'live') {
    minute = m.minute ?? m.matchMinute ?? null;
  }

  // 半場比分
  let halfTime = null;
  if (m.score?.halfTime?.home !== null && m.score?.halfTime?.home !== undefined) {
    halfTime = { h: m.score.halfTime.home, a: m.score.halfTime.away };
  }

  return {
    id: `EPL-MW${m.matchday || 0}-${home}-${away}`,
    apiId: m.id,  // football-data.org match ID，用於 detail fetch
    home, away, status, score, halfTime, goals, bookings, substitutions,
    date, time, minute,
    matchday: m.matchday || null,
    stage: 'league',
    homeTeamId: m.homeTeam?.id,
    awayTeamId: m.awayTeam?.id,
    referee: m.referees?.[0]?.name || null,
    venue: m.venue || null,
  };
}

// ── 取得單場比賽詳情（進球、黃牌、換人）──
async function fetchMatchDetail(apiId, apiKey) {
  try {
    const res = await fetch(`https://api.football-data.org/v4/matches/${apiId}`, {
      headers: { 'X-Auth-Token': apiKey }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── 將詳情合併到比賽物件 ──
function mergeDetail(match, detail) {
  if (!detail) return;

  const homeId = detail.homeTeam?.id;

  // 進球
  if (detail.goals?.length) {
    match.goals = transformGoals(detail.goals, homeId);
  }

  // 黃紅牌
  if (detail.bookings?.length) {
    match.bookings = transformBookings(detail.bookings, homeId);
  }

  // 換人
  if (detail.substitutions?.length) {
    match.substitutions = transformSubs(detail.substitutions, homeId);
  }

  // 裁判
  if (detail.referees?.[0]?.name) {
    match.referee = detail.referees[0].name;
  }

  // 場地
  if (detail.venue) {
    match.venue = detail.venue;
  }

  // 補充比分（以防批次端點沒給）
  if (!match.score && detail.score?.fullTime?.home !== null && detail.score?.fullTime?.home !== undefined) {
    match.score = { h: detail.score.fullTime.home, a: detail.score.fullTime.away };
  }

  // 半場比分
  if (!match.halfTime && detail.score?.halfTime?.home !== null && detail.score?.halfTime?.home !== undefined) {
    match.halfTime = { h: detail.score.halfTime.home, a: detail.score.halfTime.away };
  }
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
    const rawMatches = data.matches || [];
    const matches = rawMatches.map(transformMatch).filter(Boolean);

    // ── 取得需要詳情的比賽（live 或最近 24h 完賽）──
    const needDetail = rawMatches.filter(m =>
      m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'LIVE' ||
      (m.status === 'FINISHED' && isRecentlyFinished(m.utcDate, 24))
    ).slice(0, 6); // 最多 6 場，避免超過 API rate limit（10 req/min）

    if (needDetail.length > 0) {
      const details = await Promise.allSettled(
        needDetail.map(m => fetchMatchDetail(m.id, apiKey))
      );

      for (let i = 0; i < needDetail.length; i++) {
        if (details[i].status === 'fulfilled' && details[i].value) {
          const apiId = needDetail[i].id;
          const match = matches.find(m => m.apiId === apiId);
          if (match) mergeDetail(match, details[i].value);
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      matches,
      currentMatchday: data.resultSet?.played || null,
      updated: new Date().toISOString(),
      count: matches.length,
      detailsFetched: needDetail.length,
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, matches: [], error: e.message
    }), { status: 500, headers });
  }
}
