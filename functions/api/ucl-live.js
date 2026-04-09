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

// football-data.org 常見 TLA → 本站代碼（TLA 可能與本站不同）
const TLA_TO_CODE = {
  'PSG': 'PSG', 'RMA': 'RMA', 'MCI': 'MCI', 'FCB': 'BAR', // FCB 可能是 BAR 或 BAY，靠 name 補正
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
  // 優先用 name 對照（最準確）
  if (team.name && NAME_TO_CODE[team.name]) return NAME_TO_CODE[team.name];
  if (team.shortName && NAME_TO_CODE[team.shortName]) return NAME_TO_CODE[team.shortName];
  // 再用 TLA
  if (team.tla && TLA_TO_CODE[team.tla]) return TLA_TO_CODE[team.tla];
  // 最後用 TLA 原文（3碼大寫）
  if (team.tla && /^[A-Z]{3}$/.test(team.tla)) return team.tla;
  return 'TBD';
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
  }

  // 進球（如果 API 有提供）
  const goals = (m.goals || []).map(g => ({
    min: String(g.minute) + (g.injuryTime ? `+${g.injuryTime}` : ''),
    player: g.scorer?.name || '?',
    side: g.team?.id === m.homeTeam?.id ? 'h' : 'a',
    ...(g.type === 'OWN' ? { type: 'og' } : g.type === 'PENALTY' ? { type: 'pen' } : {})
  }));

  // 日期轉台灣時間（UTC+8）
  let date = '', time = '';
  if (m.utcDate) {
    const d = new Date(m.utcDate);
    const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000);
    date = tw.toISOString().slice(0, 10);
    time = tw.toISOString().slice(11, 16);
  }

  return { home, away, stage, status, score, goals, date, time, venue: m.venue || null };
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
    const matches = (data.matches || [])
      .map(transformMatch)
      .filter(Boolean);

    return new Response(JSON.stringify({
      ok: true,
      matches,
      updated: new Date().toISOString(),
      count: matches.length
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, matches: [], error: e.message
    }), { status: 500, headers });
  }
}
