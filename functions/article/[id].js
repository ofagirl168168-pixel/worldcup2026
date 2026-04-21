// Cloudflare Pages Function — /article/:id
// 在近 7 天窗口內的文章，回傳 index.html 但動態替換 OG meta tags
// 超出窗口或找不到 id 時 302 導到 /?article=:id（首頁的 modal 會打開它）
import articles from '../../data/articles-index.mjs';

const WINDOW_DAYS = 7;

function isShareable(article) {
  if (!article?.date) return false;
  const d = new Date(article.date + 'T00:00:00Z');
  if (!isFinite(d)) return false;
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - WINDOW_DAYS);
  return d >= cutoff;
}

function findArticle(id) {
  if (!id) return null;
  return articles.find(a => a.id === id) || null;
}

function sanitize(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

export async function onRequest(context) {
  const { params, env, request } = context;
  const raw = params.id || '';
  const id = decodeURIComponent(Array.isArray(raw) ? raw.join('/') : raw);
  const article = findArticle(id);
  const origin = new URL(request.url).origin;

  if (!article || !isShareable(article)) {
    return Response.redirect(
      `${origin}/?article=${encodeURIComponent(id)}`,
      302
    );
  }

  const canonical = `${origin}/article/${encodeURIComponent(id)}`;
  // ?v=2 強制 FB/Telegram/LINE 等社群平台重抓（它們會用 URL 當快取 key）
  // 之前這些平台快取了 function 回傳的舊 og-cover 內容，只有改 URL 才能洗掉
  const ogImage = `${origin}/og/${encodeURIComponent(id)}.png?v=2`;
  const title = sanitize(article.title);
  const desc = sanitize(article.summary).slice(0, 200);
  const fullTitle = `${title}｜Soccer麥迪-足球情報站`;

  // 取原 index.html，改 meta tag
  const base = await env.ASSETS.fetch(`${origin}/`);

  const rewriter = new HTMLRewriter()
    // 文章頁 URL 是 /article/:id，原 HTML 裡的相對資源路徑（css/ js/ img/）
    // 會被瀏覽器 resolve 成 /article/css/... 導致 404，所以插一個 <base href="/">
    .on('head', {
      element(e) { e.prepend('<base href="/">', { html: true }); },
    })
    .on('title', {
      element(e) { e.setInnerContent(fullTitle); },
    })
    .on('meta[property="og:site_name"]', {
      element(e) { e.setAttribute('content', 'Soccer麥迪-足球情報站'); },
    })
    .on('meta[name="description"]', {
      element(e) { e.setAttribute('content', desc); },
    })
    .on('meta[property="og:type"]', {
      element(e) { e.setAttribute('content', 'article'); },
    })
    .on('meta[property="og:url"]', {
      element(e) { e.setAttribute('content', canonical); },
    })
    .on('meta[property="og:title"]', {
      element(e) { e.setAttribute('content', fullTitle); },
    })
    .on('meta[property="og:description"]', {
      element(e) { e.setAttribute('content', desc); },
    })
    .on('meta[property="og:image"]', {
      element(e) { e.setAttribute('content', ogImage); },
    })
    .on('meta[name="twitter:title"]', {
      element(e) { e.setAttribute('content', fullTitle); },
    })
    .on('meta[name="twitter:description"]', {
      element(e) { e.setAttribute('content', desc); },
    })
    .on('meta[name="twitter:image"]', {
      element(e) { e.setAttribute('content', ogImage); },
    })
    .on('link[rel="canonical"]', {
      element(e) { e.setAttribute('href', canonical); },
    });

  const transformed = rewriter.transform(base);
  const headers = new Headers(transformed.headers);
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
  headers.set('X-Article-Id', id);
  return new Response(transformed.body, {
    status: transformed.status,
    headers,
  });
}
