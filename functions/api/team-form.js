/* =============================================
   Cloudflare Pages Function: /api/team-form
   從 football-data.org 取得球隊最近比賽結果
   用法: /api/team-form?teams=ARS,BAY&league=ucl
   回傳每隊最近 5 場結果的 W/D/L + 進失球
   ============================================= */

// 本站代碼 → football-data.org 隊伍 ID
// 從隊徽 URL 提取（https://crests.football-data.org/{id}.png）
const TEAM_IDS = {
  // 英超
  'ARS': 57, 'LIV': 64, 'MCI': 65, 'MUN': 66, 'CHE': 61,
  'TOT': 73, 'NEW': 67, 'AVL': 58, 'BHA': 397, 'BOU': 1044,
  'BRE': 402, 'CRY': 354, 'EVE': 62, 'FUL': 63, 'IPS': 349,
  'LEE': 341, 'NFO': 351, 'WHU': 563, 'WOL': 76, 'SUN': 71,
  // 歐冠（非英超）
  'PSG': 524, 'RMA': 86, 'BAY': 5, 'BAR': 81, 'ATM': 78,
  'INT': 108, 'JUV': 109, 'DOR': 4, 'BEN': 1903, 'ATA': 102,
  'LEV': 3, 'NAP': 113, 'MIL': 98, 'SCP': 498, 'TON': 73,
  'GAL': 612, 'MON': 548, 'BOD': 832, 'OLY': 739, 'BRU': 851,
  'QAR': 7283, 'MAR': 516, 'LIL': 521, 'STU': 10,
  'ATB': 1903, 'CZE': 5765, 'AST': 8635, 'KAZ': 7285,
  'FEY': 675, 'PSV': 674, 'CEL': 5601,
};

// 聯賽 → football-data.org 賽事代碼
const COMP_MAP = {
  'epl': 'PL',
  'ucl': 'CL',
};

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 小時快取
  };

  const apiKey = context.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false, error: 'FOOTBALL_DATA_API_KEY not set'
    }), { headers });
  }

  const url = new URL(context.request.url);
  const teamsParam = url.searchParams.get('teams'); // e.g. "ARS,BAY"
  const league = url.searchParams.get('league') || 'epl';

  if (!teamsParam) {
    return new Response(JSON.stringify({
      ok: false, error: 'Missing ?teams=CODE1,CODE2'
    }), { status: 400, headers });
  }

  const teamCodes = teamsParam.split(',').map(c => c.trim()).filter(Boolean).slice(0, 2);

  try {
    const results = {};

    for (const code of teamCodes) {
      const teamId = TEAM_IDS[code];
      if (!teamId) {
        results[code] = { error: `Unknown team code: ${code}`, form: null };
        continue;
      }

      // 拉最近 10 場比賽（跨賽事）
      const matchesUrl = `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`;
      const res = await fetch(matchesUrl, {
        headers: { 'X-Auth-Token': apiKey }
      });

      if (!res.ok) {
        const text = await res.text();
        results[code] = { error: `API ${res.status}: ${text.slice(0, 100)}`, form: null };
        continue;
      }

      const data = await res.json();
      const matches = (data.matches || [])
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
        .slice(0, 5);

      const form = [];
      let gf = 0, ga = 0, wins = 0, draws = 0, losses = 0;

      matches.forEach(m => {
        const isHome = m.homeTeam?.id === teamId;
        const myGoals = isHome ? m.score?.fullTime?.home : m.score?.fullTime?.away;
        const oppGoals = isHome ? m.score?.fullTime?.away : m.score?.fullTime?.home;

        if (myGoals == null || oppGoals == null) return;

        gf += myGoals;
        ga += oppGoals;

        if (myGoals > oppGoals) { form.push('W'); wins++; }
        else if (myGoals < oppGoals) { form.push('L'); losses++; }
        else { form.push('D'); draws++; }
      });

      results[code] = {
        form: form.reverse(), // 最舊到最新
        played: form.length,
        wins, draws, losses,
        gf, ga, gd: gf - ga,
        gfPerGame: form.length ? (gf / form.length).toFixed(1) : '0',
        gaPerGame: form.length ? (ga / form.length).toFixed(1) : '0',
        matches: matches.map(m => {
          const isHome = m.homeTeam?.id === teamId;
          return {
            date: m.utcDate?.slice(0, 10),
            opponent: isHome ? m.awayTeam?.shortName : m.homeTeam?.shortName,
            score: `${m.score?.fullTime?.home ?? '?'}-${m.score?.fullTime?.away ?? '?'}`,
            venue: isHome ? 'H' : 'A',
            competition: m.competition?.code || '?'
          };
        })
      };
    }

    return new Response(JSON.stringify({
      ok: true,
      data: results,
      updated: new Date().toISOString()
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, error: e.message
    }), { status: 500, headers });
  }
}
