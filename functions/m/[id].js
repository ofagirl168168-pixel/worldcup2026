// Cloudflare Pages Function — /m/:id
// 比賽分享頁 — 從 data/matches-index.json 拿 meta，注入客製 OG（隊名、比分、開賽時間）給社群預覽
// 本身不渲染獨立頁面，只用 HTMLRewriter 把 index.html 的 OG meta 換掉
//
// 為什麼：使用者按「分享給朋友 → 免費解鎖」分享連結是 /m/<id>，
// 社群 bot 抓到的 og:title/og:description/og:image 要是這場比賽的客製內容，不能是首頁通用版

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtTaiwanTime(date, time) {
  if (!date) return '';
  if (time) return `${date.replace(/-/g,'/').slice(5)} ${time}`;
  return date.replace(/-/g,'/').slice(5);
}

export async function onRequest(context) {
  const { params, env, request } = context;
  const raw = params.id || '';
  const id  = String(Array.isArray(raw) ? raw[0] : raw);
  const origin = new URL(request.url).origin;

  // 預設 OG（找不到比賽用）
  let ogTitle = 'AI 比賽預測 — Soccer麥迪';
  let ogDesc  = '看 AI 預測的比分、勝平負率、深度數據分析';
  let ogImage = `${origin}/img/og-cover.png?v=3`;
  let canonical = `${origin}/m/${id}`;

  try {
    // 從 build 出來的 matches-index.json 撈這場 meta
    const indexRes = await env.ASSETS.fetch(`${origin}/data/matches-index.json`);
    if (indexRes.ok) {
      const idx = await indexRes.json();
      const m = idx[id];
      if (m) {
        const dt = fmtTaiwanTime(m.date, m.time);
        if (m.status === 'finished' && m.score) {
          ogTitle = `${m.home_name} ${m.score.h}-${m.score.a} ${m.away_name} | AI 預測 — Soccer麥迪`;
          ogDesc  = `${m.home_name} vs ${m.away_name}（${dt} 已結束）— 來看 AI 當初怎麼預測這場比分跟勝負率`;
        } else if (m.status === 'live') {
          ogTitle = `🔴 直播：${m.home_name} vs ${m.away_name} | AI 預測 — Soccer麥迪`;
          ogDesc  = `${m.home_name} vs ${m.away_name} 進行中 — 看 AI 預測比分跟即時數據`;
        } else {
          ogTitle = `${m.home_name} vs ${m.away_name} | AI 預測 — Soccer麥迪`;
          ogDesc  = dt ? `${dt} 開賽 — 看 AI 預測比分、勝平負率、深度數據` : `看 AI 預測這場比賽的比分跟數據`;
        }
      }
    }

    // 客製 PNG 縮圖（scripts/build-match-og.js 預先產的）— 找不到就走預設
    // 用 Content-Type image/* 防 Cloudflare Pages SPA fallback 200 回 index.html 的假陽性
    try {
      const head = await env.ASSETS.fetch(`${origin}/og/m/${id}.png`, { method: 'HEAD' });
      if (head.ok && (head.headers.get('content-type') || '').startsWith('image/')) {
        ogImage = `${origin}/og/m/${id}.png`;
      }
    } catch (e) { /* fallback 通用圖 */ }
  } catch (e) {
    // 拉不到 index 就走預設 OG，仍能正常顯示首頁
  }

  // 拿首頁 base，HTMLRewriter 覆蓋 meta
  const base = await env.ASSETS.fetch(`${origin}/`);
  const safeTitle = escapeAttr(ogTitle);
  const safeDesc  = escapeAttr(ogDesc);

  const rewriter = new HTMLRewriter()
    .on('head', {
      element(e) {
        // 路徑 /m/<id>，讓相對資源 (css/ js/ img/) 不要被解成 /m/css/...
        e.prepend('<base href="/">', { html: true });
        // 把 match id 留給 client：載入後可自動打開該場預測 modal
        e.append(`<meta name="prefill-match" content="${escapeAttr(id)}">`, { html: true });
      },
    })
    .on('title',                          { element(e) { e.setInnerContent(ogTitle); } })
    .on('meta[name="description"]',       { element(e) { e.setAttribute('content', ogDesc); } })
    .on('meta[property="og:type"]',       { element(e) { e.setAttribute('content', 'website'); } })
    .on('meta[property="og:url"]',        { element(e) { e.setAttribute('content', canonical); } })
    .on('meta[property="og:title"]',      { element(e) { e.setAttribute('content', ogTitle); } })
    .on('meta[property="og:description"]',{ element(e) { e.setAttribute('content', ogDesc); } })
    .on('meta[property="og:image"]',      { element(e) { e.setAttribute('content', ogImage); } })
    .on('meta[name="twitter:title"]',     { element(e) { e.setAttribute('content', ogTitle); } })
    .on('meta[name="twitter:description"]',{element(e) { e.setAttribute('content', ogDesc); } })
    .on('meta[name="twitter:image"]',     { element(e) { e.setAttribute('content', ogImage); } })
    .on('link[rel="canonical"]',          { element(e) { e.setAttribute('href', canonical); } });

  const transformed = rewriter.transform(base);
  const headers = new Headers(transformed.headers);
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  headers.set('X-Match-Id', id);
  return new Response(transformed.body, {
    status: transformed.status,
    headers,
  });
}
