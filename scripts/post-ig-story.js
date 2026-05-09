#!/usr/bin/env node
/**
 * post-ig-story.js
 * 偵測新文章 → 透過 Instagram Graph API 自動發限動
 *
 * 流程：
 *  1. 讀 data/articles-index.mjs
 *  2. 讀 og/ig-story/.posted-state.json 看哪些已發過
 *  3. 找出「最近 7 天內 + shareable + 還沒發」的新文章
 *  4. 每篇：
 *     - 確認 og/ig-story/<id>.png 存在且可用 URL 拿到（驗證 Cloudflare 已 deploy）
 *     - POST /{ig-user-id}/media 建立 STORIES container
 *     - poll container status_code = FINISHED
 *     - POST /{ig-user-id}/media_publish 發佈
 *     - 寫入 state
 *  5. 一次最多發 N 篇（避免 IG rate limit），剩的下次再發
 *
 * 環境變數（GitHub Secrets）：
 *   IG_BUSINESS_ACCOUNT_ID  IG 商業帳號 ID
 *   IG_ACCESS_TOKEN         長效 access token（60 天）
 *   IG_PAGE_ID              FB 粉專 ID（可選，目前未直接用，未來如果要切 Page Token 才需要）
 *   SITE_URL                網站根 URL（預設 https://worldcup2026-9u0.pages.dev）
 *
 * 用法：
 *   node scripts/post-ig-story.js          # 自動跑
 *   node scripts/post-ig-story.js --dry    # 只列出會發什麼，不真的發
 */

const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', 'ig-story', '.posted-state.json');
const STORY_DIR = path.join(ROOT, 'og', 'ig-story');

const IG_USER_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const IG_TOKEN = process.env.IG_ACCESS_TOKEN;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

const FRESHNESS_DAYS = 7;     // 只發最近 7 天內的文章
const MAX_PER_RUN = 2;         // 一次最多發幾篇（避免被 IG 限速 + 降低重複壓力）
const MIN_GAP_SINCE_LAST_POST_MIN = 5;  // 距上次成功發布 < 5 分 → 跳過此次（同 commit 連環觸發保護）
const POLL_INTERVAL = 3000;    // 等 container ready 的 poll 間隔
const POLL_MAX = 20;            // 最多等 20*3=60s

const DRY_RUN = process.argv.includes('--dry');
const FORCE_POST = process.argv.includes('--force');  // 強制發（測試用，繞過平日跳過）

// 台灣時區當天日期 + 星期
function getTaipeiToday() {
  const fmtYMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' });
  const fmtWD = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', weekday: 'long' });
  return { ymd: fmtYMD.format(new Date()), weekday: fmtWD.format(new Date()) };
}

// 是否是「自動發 IG」的日子（週六/日 + 國定假日）
function isAutoPostDay() {
  if (FORCE_POST) return { auto: true, reason: '--force 強制發' };
  const { ymd, weekday } = getTaipeiToday();
  if (weekday === 'Saturday' || weekday === 'Sunday') {
    return { auto: true, reason: `週末（${weekday}）` };
  }
  // 載入國定假日
  try {
    const holFile = path.join(ROOT, 'data', 'tw-holidays.json');
    if (fs.existsSync(holFile)) {
      const hols = JSON.parse(fs.readFileSync(holFile, 'utf8'));
      const year = ymd.slice(0, 4);
      const list = (hols.holidays && hols.holidays[year]) || [];
      const match = list.find(h => h.date === ymd);
      if (match) return { auto: true, reason: `國定假日：${match.name}` };
    }
  } catch (e) { /* fall through */ }
  return { auto: false, reason: `平日（${weekday}）— 跳過 IG 自動發、改由你手動發 + 加 link sticker` };
}

function log(...args) { console.log('[ig-story]', ...args); }
function err(...args) { console.error('[ig-story]', ...args); }

async function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { posted: [] };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    err('state 檔損壞，視為空：', e.message);
    return { posted: [] };
  }
}

function saveState(state) {
  if (DRY_RUN) {
    log('[DRY] would save state with', state.posted.length, 'entries');
    return;
  }
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function loadArticles() {
  const p = path.join(ROOT, 'data', 'articles-index.mjs');
  const mod = await import(url.pathToFileURL(p).href);
  return mod.default;
}

function isFresh(article) {
  const t = new Date(article.date).getTime();
  if (!isFinite(t)) return false;
  return (Date.now() - t) < FRESHNESS_DAYS * 86400000;
}

async function checkUrlReachable(targetUrl, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(targetUrl, { method: 'HEAD' });
      if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
        return true;
      }
    } catch (e) { /* network blip */ }
    await new Promise(r => setTimeout(r, 5000));
    log(`  等 ${targetUrl} deploy... (${i + 1}/${retries})`);
  }
  return false;
}

async function createStoryContainer(imageUrl) {
  // POST /{ig-user-id}/media
  const u = `https://graph.facebook.com/v21.0/${IG_USER_ID}/media`;
  const params = new URLSearchParams({
    image_url: imageUrl,
    media_type: 'STORIES',
    access_token: IG_TOKEN,
  });
  const r = await fetch(u, { method: 'POST', body: params });
  const data = await r.json();
  if (!r.ok || !data.id) {
    throw new Error(`create container failed: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function pollContainerReady(containerId) {
  const u = `https://graph.facebook.com/v21.0/${containerId}?fields=status_code,status&access_token=${IG_TOKEN}`;
  for (let i = 0; i < POLL_MAX; i++) {
    const r = await fetch(u);
    const data = await r.json();
    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') throw new Error(`container error: ${JSON.stringify(data)}`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  throw new Error(`container 等超過 ${POLL_MAX * POLL_INTERVAL / 1000}s 還沒 ready`);
}

async function publishContainer(containerId) {
  const u = `https://graph.facebook.com/v21.0/${IG_USER_ID}/media_publish`;
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: IG_TOKEN,
  });
  const r = await fetch(u, { method: 'POST', body: params });
  const data = await r.json();
  if (!r.ok || !data.id) {
    throw new Error(`publish failed: ${JSON.stringify(data)}`);
  }
  return data.id; // IG media ID
}

async function postOne(article) {
  const imageUrl = `${SITE_URL}/og/ig-story/${article.id}.png?v=${Date.now()}`;
  log(`📤 ${article.id}: ${article.title.slice(0, 40)}...`);
  log(`   image: ${imageUrl}`);

  if (DRY_RUN) {
    log(`   [DRY] 不實際發佈`);
    return { id: article.id, ig_media_id: 'dry-run', postedAt: new Date().toISOString() };
  }

  // 1. 確認圖片在 Cloudflare 已 deploy
  log('   檢查圖片 URL...');
  const reachable = await checkUrlReachable(imageUrl);
  if (!reachable) {
    throw new Error(`圖片 URL 無法連通：${imageUrl}（Cloudflare 可能還沒 deploy 完）`);
  }

  // 2. 建 container
  log('   建立 STORIES container...');
  const containerId = await createStoryContainer(imageUrl);
  log(`   container_id: ${containerId}`);

  // 3. 等 ready
  log('   等 container 變 FINISHED...');
  await pollContainerReady(containerId);

  // 4. 發佈
  log('   publish...');
  const igMediaId = await publishContainer(containerId);
  log(`   ✅ 發佈成功 ig_media_id=${igMediaId}`);

  return {
    id: article.id,
    ig_media_id: igMediaId,
    postedAt: new Date().toISOString(),
    title: article.title,
  };
}

async function checkTokenExpiry() {
  const u = `https://graph.facebook.com/v21.0/debug_token?input_token=${IG_TOKEN}&access_token=${IG_TOKEN}`;
  try {
    const r = await fetch(u);
    const data = await r.json();
    if (!data.data) return null;
    const exp = data.data.expires_at;
    if (!exp || exp === 0) return { daysLeft: Infinity, isPermanent: true };
    const daysLeft = Math.floor((exp * 1000 - Date.now()) / 86400000);
    return { daysLeft, expiresAt: new Date(exp * 1000).toISOString() };
  } catch (e) { return null; }
}

(async () => {
  // 平日跳過 IG 自動發（觀眾要在 IG 上看到 link sticker，但 API 不支援自動加 → 平日由人工發）
  const dayCheck = isAutoPostDay();
  if (!dayCheck.auto) {
    log(`⏭️ ${dayCheck.reason}`);
    log('（TG 頻道仍會收到通知，IG 限動圖已自動產出在 og/ig-story/，請開 IG App 手動上傳並加 link sticker）');
    return;
  }
  log(`✅ ${dayCheck.reason} → 自動發 IG 限動`);

  if (!IG_USER_ID || !IG_TOKEN) {
    err('缺 IG_BUSINESS_ACCOUNT_ID 或 IG_ACCESS_TOKEN 環境變數');
    process.exit(1);
  }

  // Token 健康檢查
  const tokenStatus = await checkTokenExpiry();
  if (tokenStatus) {
    if (tokenStatus.isPermanent) {
      log('🔑 Token 永久有效');
    } else {
      log(`🔑 Token 還剩 ${tokenStatus.daysLeft} 天到期 (${tokenStatus.expiresAt})`);
      if (tokenStatus.daysLeft <= 7) {
        err('⚠️ Token 即將過期！請去 Graph API Explorer 重新生成並更新 GitHub Secret IG_ACCESS_TOKEN');
      }
    }
  }

  const articles = await loadArticles();
  const state = await loadState();
  const postedIds = new Set(state.posted.map(p => p.id));

  // 防止「短時間連環觸發」造成重複發布（race condition 保護）
  // 例：日更跑了 fact-check 修正 → 多次 commit → 多次 workflow 觸發 →
  //     如果上次 push state 失敗，新 run 不知道，會再 post 一次
  if (state.posted.length > 0) {
    const lastPost = state.posted[state.posted.length - 1];
    if (lastPost.postedAt) {
      const minsSinceLast = (Date.now() - new Date(lastPost.postedAt).getTime()) / 60000;
      if (minsSinceLast < MIN_GAP_SINCE_LAST_POST_MIN) {
        log(`⏸️ 距上次發布 ${minsSinceLast.toFixed(1)} 分鐘 < ${MIN_GAP_SINCE_LAST_POST_MIN} 分鐘 → 跳過（race protection）`);
        return;
      }
    }
  }

  const candidates = articles
    .filter(a => a.shareable !== false)
    .filter(a => !postedIds.has(a.id))
    .filter(isFresh)
    .sort((a, b) => b.date.localeCompare(a.date));  // 最新優先

  log(`找到 ${candidates.length} 篇待發文章`);
  if (candidates.length === 0) {
    log('沒有新文章要發限動');
    return;
  }

  const toPost = candidates.slice(0, MAX_PER_RUN);
  if (candidates.length > MAX_PER_RUN) {
    log(`本次發 ${MAX_PER_RUN} 篇，剩 ${candidates.length - MAX_PER_RUN} 篇下次再發`);
  }

  // 確認每篇文章都有對應 IG story 圖
  for (const a of toPost) {
    const localPath = path.join(STORY_DIR, `${a.id}.png`);
    if (!fs.existsSync(localPath)) {
      err(`✗ 缺圖：${localPath}（請先跑 npm run build:ig-story）`);
      process.exit(1);
    }
  }

  let posted = 0, failed = 0;
  for (const a of toPost) {
    try {
      const entry = await postOne(a);
      state.posted.push(entry);
      saveState(state);
      posted++;
      // 每篇之間隔 5 秒避免 rate limit
      if (posted < toPost.length) await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
      err(`✗ ${a.id} 失敗：${e.message}`);
      failed++;
    }
  }

  log(`\n完成：${posted} 篇發佈 / ${failed} 失敗`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => { err(e); process.exit(1); });
