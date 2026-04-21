// Cloudflare Pages Function — /sitemap.xml
// 列出首頁 + 近 7 天內的文章
import articles from '../data/articles-index.mjs';

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

function xmlEscape(s) {
  return String(s || '').replace(/[<>&'"]/g, c => ({
    '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;',
  }[c]));
}

export async function onRequest(context) {
  const origin = new URL(context.request.url).origin;
  const today = new Date().toISOString().slice(0, 10);

  const urls = [
    `  <url><loc>${origin}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>`,
  ];

  for (const a of articles) {
    if (!isShareable(a)) continue;
    const loc = `${origin}/article/${encodeURIComponent(a.id)}`;
    urls.push(
      `  <url><loc>${xmlEscape(loc)}</loc><lastmod>${xmlEscape(a.date)}</lastmod><priority>0.8</priority></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600',
    },
  });
}
