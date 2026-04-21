// Cloudflare Pages Function — /og/:id.png
// 若 og/<id>.png 為 commit 進來的靜態檔 → Pages 直接服務它（靜態優先）
// 沒有靜態檔時此函式接手，依該文章所屬賽事回傳預設 OG 圖
import articles from '../../data/articles-index.mjs';

export async function onRequest(context) {
  const { params, env, request } = context;
  const origin = new URL(request.url).origin;
  const raw = decodeURIComponent(params.id || '').replace(/\.(png|jpg|jpeg|webp)$/i, '');
  const article = articles.find(a => a.id === raw);

  // 依賽事選預設圖，未來可針對各賽事放不同 og 圖
  // 目前三個賽事都 fallback 到 og-cover.png
  const fallback = `${origin}/img/og-cover.png`;

  const resp = await env.ASSETS.fetch(fallback);
  if (!resp.ok) {
    return new Response('og image not available', { status: 404 });
  }
  const headers = new Headers(resp.headers);
  headers.set('Cache-Control', 'public, max-age=600, s-maxage=86400');
  if (article) headers.set('X-Article-Id', article.id);
  return new Response(resp.body, { status: 200, headers });
}
