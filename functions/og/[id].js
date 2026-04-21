// Cloudflare Pages Function — /og/:id.png
// 優先：嘗試從靜態資產讀 og/<id>.png（scripts/build-og-images.js 產生的每篇獨立縮圖）
// Fallback：若沒有對應靜態檔，回傳通用 og-cover.png
// 註：env.ASSETS.fetch() 只讀靜態資產，不會遞迴呼叫 function，所以不會死迴圈
import articles from '../../data/articles-index.mjs';

export async function onRequest(context) {
  const { params, env, request } = context;
  const origin = new URL(request.url).origin;
  const raw = decodeURIComponent(params.id || '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
  const article = articles.find(a => a.id === raw);

  // 1) 嘗試對應的靜態 og/<id>.png
  const staticUrl = `${origin}/og/${encodeURIComponent(raw)}.png`;
  const staticResp = await env.ASSETS.fetch(staticUrl);
  if (staticResp.ok) {
    const headers = new Headers(staticResp.headers);
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    headers.set('X-Og-Source', 'static');
    if (article) headers.set('X-Article-Id', article.id);
    return new Response(staticResp.body, { status: staticResp.status, headers });
  }

  // 2) Fallback — 通用 og-cover
  const fallback = await env.ASSETS.fetch(`${origin}/img/og-cover.png`);
  if (!fallback.ok) {
    return new Response('og image not available', { status: 404 });
  }
  const headers = new Headers(fallback.headers);
  headers.set('Cache-Control', 'public, max-age=600, s-maxage=86400');
  headers.set('X-Og-Source', 'fallback');
  if (article) headers.set('X-Article-Id', article.id);
  return new Response(fallback.body, { status: 200, headers });
}
