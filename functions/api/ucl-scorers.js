/* =============================================
   Cloudflare Pages Function: /api/ucl-scorers
   從 football-data.org 取得歐冠射手榜 + 助攻榜
   ============================================= */

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

  try {
    const res = await fetch(
      'https://api.football-data.org/v4/competitions/CL/scorers?season=2025&limit=20',
      { headers: { 'X-Auth-Token': apiKey } }
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({
        ok: false, error: `football-data.org ${res.status}: ${text.slice(0, 200)}`
      }), { status: 502, headers });
    }

    const data = await res.json();
    const scorers = (data.scorers || []).map(s => ({
      name: s.player?.name || '?',
      team: s.team?.shortName || s.team?.name || '?',
      teamCrest: s.team?.crest || null,
      nationality: s.player?.nationality || null,
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      penalties: s.penalties ?? 0,
      playedMatches: s.playedMatches ?? 0,
    }));

    // 射手榜：依進球排序（API 已排好）
    const topScorers = [...scorers].sort((a, b) => b.goals - a.goals || b.assists - a.assists);

    // 助攻榜：依助攻排序
    const topAssists = [...scorers].filter(s => s.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals);

    return new Response(JSON.stringify({
      ok: true,
      topScorers,
      topAssists,
      updated: new Date().toISOString(),
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, error: e.message
    }), { status: 500, headers });
  }
}
