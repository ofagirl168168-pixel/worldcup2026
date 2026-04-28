// Cloudflare Pages Function — /cors-img?u=<encoded-url>
// 把外部圖片（crests.football-data.org 等沒送 CORS header 的隊徽來源）
// 透過 server fetch 後加 Access-Control-Allow-Origin: * 重發 → client 端可畫到 canvas
//
// 用途：browser canvas 端 render OG 縮圖時要載 crest 畫上去，crests.football-data.org
// 不送 CORS header → 直接 fetch 會被 browser block。Server-side fetch 沒這限制。
//
// 安全：只允許 hardcoded 白名單 host，避免變開放 proxy。
// 效能：edge cache 一天，同一張 crest 只會打 upstream 一次。

const ALLOW_HOSTS = new Set([
  'crests.football-data.org',
  'media.api-sports.io',           // 給將來換 crest 來源用
  'logoeps.com',
  'upload.wikimedia.org',
]);

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get('u');

  if (!target) {
    return new Response('missing ?u= param', { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch (e) {
    return new Response('bad url', { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !ALLOW_HOSTS.has(parsed.hostname)) {
    return new Response('host not allowed', { status: 403 });
  }

  // 用 Cloudflare 內建 cache（再加 client 自己的 cache header）
  const cacheKey = new Request(target, request);
  const cache = caches.default;
  let res = await cache.match(cacheKey);
  if (!res) {
    const upstream = await fetch(target, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!upstream.ok) {
      return new Response('upstream ' + upstream.status, { status: 502 });
    }
    // 重組 response 加 CORS header
    res = new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
    // 寫入 edge cache（背景，不阻塞 response）
    context.waitUntil(cache.put(cacheKey, res.clone()));
  }
  return res;
}
