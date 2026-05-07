// Cloudflare Pages Function — /s/:variant
// 爽感分享卡的 OG 改寫器：streak / predict-win / minority / quiz-correct
// 4 種 variant 各自有 og/s/<variant>.png 和客製 og:title / og:description
// → 社群平台 scrape /s/streak 看到的是火焰連勝圖、scrape /s/quiz-correct 看到綠勾答對圖
//
// 為什麼要這個 function：
// 不用這層改寫，所有分享連結 og:image 都是首頁通用 og-cover.png，4 種爽感事件
// 在 LINE/Telegram/Twitter 預覽長一模一樣 → 失去差異化分享動機。
//
// 使用者點預覽進來後，client-side js 會把 ?ref= 抓走，再帶他到首頁。

const VARIANTS = {
  'streak': {
    title: '🔥 我在 Soccer麥迪 連勝中！你能撐幾天？',
    desc: '麥迪擂台每日一題，連續答題挑戰意志力。看朋友能撐幾天不斷。',
    accent: '#ff6b35',
  },
  'predict-win': {
    title: '🎯 我預測命中了！Soccer麥迪 看誰眼光毒',
    desc: '麥迪擂台 predict 題猜中比賽結果，命中拿 XP 和寶石。敢來比眼光嗎？',
    accent: '#ffc850',
  },
  'minority': {
    title: '🤔 我跟少數派同隊！你跟大眾一樣嗎？',
    desc: '麥迪擂台 trending 投票，看你站哪邊 — 多數還是少數？來投一票見真章。',
    accent: '#a78bfa',
  },
  'quiz-correct': {
    title: '✅ 我今日一題答對了！考考你的足球直覺',
    desc: 'Soccer麥迪 今日挑戰每天 4 選 1，連對有獎勵。看誰先猜到正解。',
    accent: '#6bd09e',
  },
};

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function onRequest(context) {
  const { params, env, request } = context;
  const raw = params.variant || '';
  const variant = String(Array.isArray(raw) ? raw[0] : raw).toLowerCase();
  const origin = new URL(request.url).origin;

  if (!VARIANTS[variant]) {
    return Response.redirect(`${origin}/`, 302);
  }
  const v = VARIANTS[variant];
  const ogImage = `${origin}/og/s/${variant}.png?v=1`;
  const canonical = `${origin}/s/${variant}`;

  // 拿首頁 base，HTMLRewriter 改 meta（跟 /r/<code> 同 pattern）
  const base = await env.ASSETS.fetch(`${origin}/`);

  const rewriter = new HTMLRewriter()
    .on('head', {
      element(e) {
        // /s/<variant> 路徑下相對資源（css/ js/）會 resolve 成 /s/css/...
        // <base href="/"> 修這個（跟 /r 函式一樣）
        e.prepend('<base href="/">', { html: true });
      },
    })
    .on('title', { element(e) { e.setInnerContent(v.title); } })
    .on('meta[name="description"]', { element(e) { e.setAttribute('content', v.desc); } })
    .on('meta[name="theme-color"]', { element(e) { e.setAttribute('content', v.accent); } })
    .on('meta[property="og:type"]', { element(e) { e.setAttribute('content', 'website'); } })
    .on('meta[property="og:url"]', { element(e) { e.setAttribute('content', canonical); } })
    .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', v.title); } })
    .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', v.desc); } })
    .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', ogImage); } })
    .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', v.title); } })
    .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', v.desc); } })
    .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', ogImage); } })
    .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', canonical); } });

  const transformed = rewriter.transform(base);
  const headers = new Headers(transformed.headers);
  // 靜態 variant 內容不太會變，CDN 較長快取
  headers.set('Cache-Control', 'public, max-age=600, s-maxage=3600');
  headers.set('X-Share-Variant', variant);
  return new Response(transformed.body, {
    status: transformed.status,
    headers,
  });
}
