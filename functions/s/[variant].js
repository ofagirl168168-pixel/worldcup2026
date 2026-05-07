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

// og:title / og:desc 一律寫成朋友視角的邀請 — 收到分享的人才會想點進來
// （原本「我答對了」「我預測命中」是炫耀，對接收方沒誘因）
const VARIANTS = {
  'streak': {
    title: '🔥 你能撐幾天？— 麥迪擂台連勝挑戰',
    desc: '每日一題，看誰能連續答題不斷檔。意志力大比拼，敢來挑戰嗎？',
    accent: '#ff6b35',
  },
  'predict-win': {
    title: '🎯 你猜得到比分嗎？— 麥迪擂台預測比賽',
    desc: '預測比賽結果見真章，命中拿 XP 與寶石。看誰眼光毒辣，敢來比比看？',
    accent: '#ffc850',
  },
  'minority': {
    title: '🤔 你站哪邊？— 麥迪擂台投票多數派 vs 少數派',
    desc: '球迷投票見真章。你跟大眾一樣，還是少數派？來投一票看自己站哪邊。',
    accent: '#a78bfa',
  },
  'quiz-correct': {
    title: '❓ 你猜得到嗎？— 麥迪今日一題',
    desc: '每天 4 選 1，連對有 XP 獎勵。考考你的足球直覺，敢來答一題嗎？',
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
  const ogImage = `${origin}/og/s/${variant}.png?v=2`;
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
