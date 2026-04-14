/* =============================================
   Cloudflare Pages Function: /api/ucl-live
   從 football-data.org 取得歐冠即時比分
   ============================================= */

// ── football-data.org 隊伍名稱 → 本站代碼 ──
const NAME_TO_CODE = {
  'Paris Saint-Germain': 'PSG', 'Paris SG': 'PSG',
  'Real Madrid': 'RMA', 'Real Madrid CF': 'RMA',
  'Manchester City': 'MCI', 'Man City': 'MCI',
  'FC Bayern München': 'BAY', 'Bayern München': 'BAY', 'Bayern Munich': 'BAY',
  'Liverpool': 'LIV', 'Liverpool FC': 'LIV',
  'Inter Milano': 'INT', 'Inter Milan': 'INT', 'FC Internazionale Milano': 'INT',
  'Chelsea': 'CHE', 'Chelsea FC': 'CHE',
  'Borussia Dortmund': 'DOR', 'BV Borussia 09 Dortmund': 'DOR',
  'FC Barcelona': 'BAR', 'Barcelona': 'BAR',
  'Arsenal': 'ARS', 'Arsenal FC': 'ARS',
  'Bayer Leverkusen': 'LEV', 'Bayer 04 Leverkusen': 'LEV',
  'Atlético Madrid': 'ATM', 'Atletico Madrid': 'ATM', 'Club Atlético de Madrid': 'ATM',
  'SL Benfica': 'BEN', 'Benfica': 'BEN',
  'Atalanta': 'ATA', 'Atalanta BC': 'ATA',
  'Villarreal': 'VIL', 'Villarreal CF': 'VIL',
  'Juventus': 'JUV', 'Juventus FC': 'JUV',
  'Eintracht Frankfurt': 'SGE',
  'Club Brugge': 'BRU', 'Club Brugge KV': 'BRU',
  'Tottenham Hotspur': 'TOT', 'Tottenham': 'TOT', 'Spurs': 'TOT',
  'PSV Eindhoven': 'PSV', 'PSV': 'PSV',
  'AFC Ajax': 'AJA', 'Ajax': 'AJA',
  'SSC Napoli': 'NAP', 'Napoli': 'NAP',
  'Sporting CP': 'SCP', 'Sporting Clube de Portugal': 'SCP',
  'Olympiacos': 'OLY', 'Olympiacos FC': 'OLY', 'Olympiakos': 'OLY',
  'SK Slavia Praha': 'SLA', 'Slavia Praha': 'SLA', 'Slavia Prague': 'SLA',
  'FK Bodø/Glimt': 'BOD', 'Bodø/Glimt': 'BOD',
  'Olympique de Marseille': 'MAR', 'Marseille': 'MAR',
  'FC Copenhagen': 'COP', 'Copenhagen': 'COP', 'FC København': 'COP',
  'AS Monaco': 'MON', 'Monaco': 'MON', 'AS Monaco FC': 'MON',
  'Galatasaray': 'GAL', 'Galatasaray SK': 'GAL',
  'Union Saint-Gilloise': 'USG', 'Royale Union Saint-Gilloise': 'USG',
  'Al-Sadd': 'QAR', 'Qatar SC': 'QAR',
  'Athletic Club': 'ATH', 'Athletic Bilbao': 'ATH',
  'Newcastle United': 'NEW', 'Newcastle': 'NEW', 'Newcastle United FC': 'NEW',
  'PAOK': 'PAF', 'PAOK FC': 'PAF',
  'Kaizer Chiefs': 'KAI',
};

// football-data.org 常見 TLA → 本站代碼
const TLA_TO_CODE = {
  'PSG': 'PSG', 'RMA': 'RMA', 'MCI': 'MCI', 'FCB': 'BAR',
  'LIV': 'LIV', 'LFC': 'LIV', 'INT': 'INT', 'CHE': 'CHE',
  'BVB': 'DOR', 'DOR': 'DOR', 'BAR': 'BAR', 'ARS': 'ARS',
  'B04': 'LEV', 'LEV': 'LEV', 'ATM': 'ATM', 'BEN': 'BEN',
  'ATA': 'ATA', 'VIL': 'VIL', 'JUV': 'JUV', 'SGE': 'SGE',
  'CLB': 'BRU', 'BRU': 'BRU', 'TOT': 'TOT', 'PSV': 'PSV',
  'AJX': 'AJA', 'AJA': 'AJA', 'NAP': 'NAP', 'SCP': 'SCP',
  'OLY': 'OLY', 'SLA': 'SLA', 'BOD': 'BOD', 'MAR': 'MAR',
  'COP': 'COP', 'MON': 'MON', 'GAL': 'GAL', 'USG': 'USG',
  'NEW': 'NEW', 'BAY': 'BAY', 'PAF': 'PAF', 'KAI': 'KAI',
};

// ── stage 對應 ──
const STAGE_MAP = {
  'PLAY_OFF_ROUND': 'playoff',
  'KNOCKOUT_ROUND_PLAY_OFFS': 'playoff',
  'PLAYOFFS': 'playoff',
  'LAST_16': 'r16',
  'ROUND_OF_16': 'r16',
  'QUARTER_FINALS': 'qf',
  'SEMI_FINALS': 'sf',
  'FINAL': 'final',
};

// ── 解析隊伍代碼 ──
function resolveTeamCode(team) {
  if (!team) return 'TBD';
  if (team.name && NAME_TO_CODE[team.name]) return NAME_TO_CODE[team.name];
  if (team.shortName && NAME_TO_CODE[team.shortName]) return NAME_TO_CODE[team.shortName];
  if (team.tla && TLA_TO_CODE[team.tla]) return TLA_TO_CODE[team.tla];
  if (team.tla && /^[A-Z]{3}$/.test(team.tla)) return team.tla;
  return 'TBD';
}

// ── 判斷比賽是否最近完賽 ──
function isRecentlyFinished(utcDate, hours = 24) {
  if (!utcDate) return false;
  const matchTime = new Date(utcDate).getTime();
  return (Date.now() - matchTime) < hours * 60 * 60 * 1000;
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

// ── 轉換單場比賽 ──
function transformMatch(m) {
  const stage = STAGE_MAP[m.stage] || null;
  if (!stage) return null;

  const home = resolveTeamCode(m.homeTeam);
  const away = resolveTeamCode(m.awayTeam);
  const status = m.status === 'FINISHED' ? 'finished'
    : (m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'LIVE') ? 'live'
    : 'scheduled';

  // 比分
  let score = null;
  if (m.score && m.score.fullTime && m.score.fullTime.home !== null) {
    score = { h: m.score.fullTime.home, a: m.score.fullTime.away };
  } else if (m.score && m.score.home !== null && m.score.home !== undefined) {
    score = { h: m.score.home, a: m.score.away };
  }

  // 半場比分
  let halfTime = null;
  if (m.score?.halfTime?.home !== null && m.score?.halfTime?.home !== undefined) {
    halfTime = { h: m.score.halfTime.home, a: m.score.halfTime.away };
  }

  // 進球（從批次端點可能為空，後續由 detail fetch 補充）
  const goals = transformGoals(m.goals, m.homeTeam?.id);
  const bookings = transformBookings(m.bookings, m.homeTeam?.id);
  const substitutions = transformSubs(m.substitutions, m.homeTeam?.id);

  // 日期轉台灣時間（UTC+8）
  let date = '', time = '';
  if (m.utcDate) {
    const d = new Date(m.utcDate);
    const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    date = tw.toISOString().slice(0, 10);
    time = tw.toISOString().slice(11, 16);
  }

  // 比賽進行中的分鐘數
  let minute = null;
  if (status === 'live') {
    if (m.minute !== undefined && m.minute !== null) {
      minute = m.minute;
    }
    if (!score && m.score) {
      if (m.score.halfTime && m.score.halfTime.home !== null) {
        score = { h: m.score.halfTime.home, a: m.score.halfTime.away };
      }
    }
  }

  return {
    home, away, stage, status, score, halfTime, goals, bookings, substitutions,
    date, time, venue: m.venue || null, minute,
    apiId: m.id,
    homeTeamId: m.homeTeam?.id,
    awayTeamId: m.awayTeam?.id,
    referee: m.referees?.[0]?.name || null,
  };
}

// ── 取得單場比賽詳情 ──
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

  if (detail.goals?.length) {
    match.goals = transformGoals(detail.goals, homeId);
  }
  if (detail.bookings?.length) {
    match.bookings = transformBookings(detail.bookings, homeId);
  }
  if (detail.substitutions?.length) {
    match.substitutions = transformSubs(detail.substitutions, homeId);
  }
  if (detail.referees?.[0]?.name) {
    match.referee = detail.referees[0].name;
  }
  if (detail.venue) {
    match.venue = detail.venue;
  }
  if (!match.score && detail.score?.fullTime?.home !== null && detail.score?.fullTime?.home !== undefined) {
    match.score = { h: detail.score.fullTime.home, a: detail.score.fullTime.away };
  }
  if (!match.halfTime && detail.score?.halfTime?.home !== null && detail.score?.halfTime?.home !== undefined) {
    match.halfTime = { h: detail.score.halfTime.home, a: detail.score.halfTime.away };
  }
}

// ── Handler ──
export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=120, s-maxage=120',
  };

  const apiKey = context.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false, matches: [],
      error: 'FOOTBALL_DATA_API_KEY not set — add it in Cloudflare Pages Settings > Environment Variables'
    }), { headers });
  }

  try {
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/CL/matches?season=2025',
      { headers: { 'X-Auth-Token': apiKey } }
    );

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
      (STAGE_MAP[m.stage]) && (
        m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'LIVE' ||
        (m.status === 'FINISHED' && isRecentlyFinished(m.utcDate, 24))
      )
    ).slice(0, 6);

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
