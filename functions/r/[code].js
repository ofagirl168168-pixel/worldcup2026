// Cloudflare Pages Function — /r/:code
// 朋友直播房分享連結。從 Supabase 撈房間 → 動態替換 OG meta tags 給社群預覽用
// 找不到房間或無效 code 時 302 導到首頁
//
// 為什麼需要這個 function：
// 之前用 #fr-room-XXX hash 路徑，hash 不會送到 server，社群平台 scrape 看到的
// 永遠是首頁通用 OG → 預覽完全沒有房間資訊。改成 /r/CODE path 才能讓 server
// 看到 code、回不同 OG。

const SUPA_URL = 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';

function sanitize(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

function escapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtTaiwanTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!isFinite(d)) return '';
  // 強制換算到 UTC+8（台灣時間）
  const tw = new Date(d.getTime() + 8 * 3600 * 1000);
  const m = String(tw.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(tw.getUTCDate()).padStart(2, '0');
  const hh = String(tw.getUTCHours()).padStart(2, '0');
  const mm = String(tw.getUTCMinutes()).padStart(2, '0');
  return `${m}/${dd} ${hh}:${mm}`;
}

async function fetchRoom(code) {
  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/friend_rooms?room_code=eq.${encodeURIComponent(code)}&select=*&limit=1`,
      {
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
        },
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    return Array.isArray(data) && data[0] ? data[0] : null;
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  const { params, env, request } = context;
  const raw = params.code || '';
  const code = String(Array.isArray(raw) ? raw[0] : raw).toUpperCase();
  const origin = new URL(request.url).origin;

  // 房號合法性檢查（6~10 char A-Z 0-9）
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return Response.redirect(`${origin}/`, 302);
  }

  const room = await fetchRoom(code);
  const canonical = `${origin}/r/${code}`;

  // 預設 OG（找不到房間 / 房間已結束時用）
  let ogTitle = '麥迪挑戰賽 — Soccer麥迪';
  let ogDesc = '跟朋友一起猜真實比賽比分、看模擬賽直播決勝負';
  let ogImage = `${origin}/img/og-cover.png?v=4`;

  // OG 縮圖選擇順序：
  // 1. Supabase Storage `og-images/r/CODE.png`（房主建房時 client 即時 render，~1 秒就 ready）
  // 2. 靜態 `/og/r/CODE.png`（官方房 cron 產的、commit 進 repo 的）
  // 3. 通用 og-cover（最後 fallback）
  // 注意：env.ASSETS.fetch 找不到檔會回 SPA fallback（200 + index.html），不能單純看 r.ok →
  //      必須檢查 Content-Type 確保真的是 image
  if (room) {
    const storageUrl = `${SUPA_URL}/storage/v1/object/public/og-images/r/${code}.png`;
    try {
      const r = await fetch(storageUrl, { method: 'HEAD' });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        ogImage = storageUrl;
      } else {
        // 試靜態檔（防 SPA fallback 假陽性）
        const head = await env.ASSETS.fetch(`${origin}/og/r/${code}.png`, { method: 'HEAD' });
        if (head.ok && (head.headers.get('content-type') || '').startsWith('image/')) {
          ogImage = `${origin}/og/r/${code}.png`;
        }
      }
    } catch (e) { /* fallback 通用圖 */ }
  }

  if (room) {
    const meta = room.match_meta || {};
    const home = sanitize(meta.home_name || meta.home_code || '主隊');
    const away = sanitize(meta.away_name || meta.away_code || '客隊');
    const roomName = sanitize(room.room_name || (room.is_official ? '麥迪官方聯賽' : ''));
    const kickoff = fmtTaiwanTime(room.kickoff_at);
    const bet = room.bet_amount > 0 ? `押 ${room.bet_amount} 💎` : '純娛樂';

    const titlePrefix = roomName ? `${roomName} · ` : '';
    ogTitle = `${titlePrefix}${home} vs ${away} | 麥迪挑戰賽`;

    if (room.status === 'ended' && room.result_home != null && room.result_away != null) {
      ogDesc = `${home} ${room.result_home}-${room.result_away} ${away}（已結束）· 點開看結果與留言`;
    } else if (room.status === 'live') {
      ogDesc = `🔴 進行中：${home} vs ${away}，跟朋友一起看模擬賽決勝負！`;
    } else if (kickoff) {
      ogDesc = `來陪我猜這場！${home} vs ${away}，${kickoff} 同步開賽 · ${bet}`;
    } else {
      ogDesc = `來陪我猜 ${home} vs ${away} 這場比賽，跟朋友一起看模擬賽直播。`;
    }
  }

  // 拿首頁 base，HTMLRewriter 改 meta
  const base = await env.ASSETS.fetch(`${origin}/`);
  const safeTitle = escapeAttr(ogTitle);
  const safeDesc = escapeAttr(ogDesc);

  const rewriter = new HTMLRewriter()
    .on('head', {
      element(e) {
        // 路徑是 /r/<code>，相對資源（css/ js/ img/）會被 resolve 成 /r/css/...
        // 插一個 <base href="/"> 修這個（跟 article 函式一樣 pattern）
        e.prepend('<base href="/">', { html: true });
        // 把 room code 留給 client side js 自動進房用
        e.append(`<meta name="fr-room-code" content="${escapeAttr(code)}">`, { html: true });
      },
    })
    .on('title', { element(e) { e.setInnerContent(ogTitle); } })
    .on('meta[name="description"]', { element(e) { e.setAttribute('content', ogDesc); } })
    .on('meta[property="og:type"]', { element(e) { e.setAttribute('content', 'website'); } })
    .on('meta[property="og:url"]', { element(e) { e.setAttribute('content', canonical); } })
    .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', ogTitle); } })
    .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', ogDesc); } })
    .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', ogImage); } })
    .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', ogTitle); } })
    .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', ogDesc); } })
    .on('meta[name="twitter:image"]', { element(e) { e.setAttribute('content', ogImage); } })
    .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', canonical); } });

  const transformed = rewriter.transform(base);
  const headers = new Headers(transformed.headers);
  // 房資料每分鐘可能變（人數、狀態），CDN 短快取就好
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=120');
  headers.set('X-Friend-Room', code);
  return new Response(transformed.body, {
    status: transformed.status,
    headers,
  });
}
