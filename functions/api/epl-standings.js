/* =============================================
   Cloudflare Pages Function: /api/epl-standings
   從 football-data.org 取得英超即時積分榜
   ============================================= */

export async function onRequestGet(context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=1800, s-maxage=1800', // 30 分鐘快取
  };

  const apiKey = context.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      ok: false, error: 'FOOTBALL_DATA_API_KEY not set'
    }), { headers });
  }

  try {
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/PL/standings?season=2025',
      { headers: { 'X-Auth-Token': apiKey } }
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({
        ok: false, error: `football-data.org ${res.status}: ${text.slice(0, 200)}`
      }), { status: 502, headers });
    }

    const data = await res.json();
    const table = data.standings?.find(s => s.type === 'TOTAL')?.table || [];

    const standings = table.map(row => ({
      position: row.position,
      team: row.team?.shortName || row.team?.name || '?',
      teamCrest: row.team?.crest || null,
      teamTla: row.team?.tla || '???',
      playedGames: row.playedGames ?? 0,
      won: row.won ?? 0,
      draw: row.draw ?? 0,
      lost: row.lost ?? 0,
      goalsFor: row.goalsFor ?? 0,
      goalsAgainst: row.goalsAgainst ?? 0,
      goalDifference: row.goalDifference ?? 0,
      points: row.points ?? 0,
      form: row.form || null, // e.g. "W,W,D,L,W"
    }));

    return new Response(JSON.stringify({
      ok: true,
      standings,
      season: data.season?.startDate ? `${data.season.startDate} ~ ${data.season.endDate}` : '2025/26',
      matchday: data.season?.currentMatchday || null,
      updated: new Date().toISOString(),
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, error: e.message
    }), { status: 500, headers });
  }
}
