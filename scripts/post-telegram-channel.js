#!/usr/bin/env node
/**
 * post-telegram-channel.js
 * 把新文章推到 Telegram 頻道（電子報模式）
 *
 * 對於每篇 shareable 且最近 7 天內的新文章，發送：
 *   sendPhoto:
 *     - photo: 1080×1920 IG 限動圖（重用，視覺一致）
 *     - caption: 標題 + 摘要 + 文章連結 + hashtags（HTML mode）
 *
 * 跟 post-ig-story.js 各自獨立追蹤狀態：
 *   - og/ig-story/.posted-state.json    → IG 已發過的
 *   - og/ig-story/.tg-channel-state.json → TG 頻道已發過的
 * 兩邊狀態獨立 → 平日 IG 跳過但 TG 仍會發。
 *
 * 環境變數：
 *   TELEGRAM_BOT_TOKEN          給 bot 用的 token（重用 claude330 bot）
 *   TELEGRAM_CHANNEL_ID         頻道 ID（@username 或 -100xxxxx 數字 ID）
 *   SITE_URL                    網站根 URL
 *
 * 用法：node scripts/post-telegram-channel.js [--dry]
 */

const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'og', 'ig-story', '.tg-channel-state.json');
const STORY_DIR = path.join(ROOT, 'og', 'ig-story');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHANNEL = process.env.TELEGRAM_CHANNEL_ID;
const SITE_URL = (process.env.SITE_URL || 'https://worldcup2026-9u0.pages.dev').replace(/\/$/, '');

// 只推今天 + 昨天的文章（往前不補老的）
function _validDateSet() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' });
  const today = fmt.format(new Date());
  const yesterday = fmt.format(new Date(Date.now() - 86400000));
  return new Set([today, yesterday]);
}
const MAX_PER_RUN = 5;
const DELAY_BETWEEN_POSTS = 3000;

const DRY_RUN = process.argv.includes('--dry');

function log(...a) { console.log('[tg-channel]', ...a); }
function err(...a) { console.error('[tg-channel]', ...a); }

async function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { posted: [] };
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch (e) { err('state 損壞，視為空'); return { posted: [] }; }
}

function saveState(state) {
  if (DRY_RUN) { log('[DRY] would save state'); return; }
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function loadArticles() {
  const p = path.join(ROOT, 'data', 'articles-index.mjs');
  const mod = await import(url.pathToFileURL(p).href);
  return mod.default;
}

function isFresh(a) {
  return _validDateSet().has(a.date);
}

// 依分類 + 賽事產 hashtags
function buildHashtags(article) {
  const tags = new Set();
  const t = article.tournament || 'wc';
  if (t === 'wc') tags.add('世界盃').add('FIFA').add('世足2026');
  else if (t === 'epl') tags.add('英超').add('PremierLeague');
  else if (t === 'ucl') tags.add('歐冠').add('ChampionsLeague');
  const cat = String(article.category || '');
  if (cat.includes('賽前')) tags.add('賽前分析');
  if (cat.includes('賽後')) tags.add('賽後回顧');
  if (cat.includes('傷兵')) tags.add('傷兵情報');
  if (cat.includes('球星')) tags.add('球星聚焦');
  if (cat.includes('小組')) tags.add('小組分析');
  if (cat.includes('社群')) tags.add('擂台戰報');
  tags.add('Soccer麥迪');
  return Array.from(tags).map(s => '#' + s).join(' ');
}

// 賽事 emoji
function tournamentEmoji(t) {
  if (t === 'wc') return '🌍';
  if (t === 'epl') return '⚽';
  if (t === 'ucl') return '🏆';
  return '🥊';
}

// HTML escape（caption 用 HTML mode 會剖析 <b>/<a>）
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 卡截斷 caption 1024 字限制
function clipCaption(s, maxLen = 1000) {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function buildCaption(article) {
  const emoji = tournamentEmoji(article.tournament);
  const cleanTitle = (article.title || '').replace(/^【[^】]*】\s*/, '');
  const articleUrl = `${SITE_URL}/article/${article.id}`;
  const hashtags = buildHashtags(article);

  const summary = escHtml(article.summary || '');
  const titleHtml = `${emoji} <b>${escHtml(cleanTitle)}</b>`;
  const linkHtml = `📰 <a href="${articleUrl}">閱讀全文</a>`;

  let caption = `${titleHtml}\n\n${summary}\n\n${linkHtml}\n\n${hashtags}`;
  return clipCaption(caption);
}

async function sendToChannel(article) {
  const localPath = path.join(STORY_DIR, `${article.id}.png`);
  if (!fs.existsSync(localPath)) {
    throw new Error(`缺圖：${localPath}`);
  }

  const caption = buildCaption(article);

  if (DRY_RUN) {
    log(`[DRY] would post ${article.id}: ${caption.slice(0, 60)}...`);
    return { msg_id: 'dry-run' };
  }

  // 用 multipart/form-data 上傳檔案
  const form = new FormData();
  form.append('chat_id', TG_CHANNEL);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  // Node 18+ Blob from buffer
  const buf = fs.readFileSync(localPath);
  const blob = new Blob([buf], { type: 'image/png' });
  form.append('photo', blob, `${article.id}.png`);

  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const data = await r.json();
  if (!data.ok) {
    throw new Error(`telegram api error: ${JSON.stringify(data)}`);
  }
  return { msg_id: data.result.message_id };
}

(async () => {
  if (!TG_TOKEN || !TG_CHANNEL) {
    err('缺 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHANNEL_ID');
    process.exit(1);
  }

  const articles = await loadArticles();
  const state = await loadState();
  const postedIds = new Set(state.posted.map(p => p.id));

  const candidates = articles
    .filter(a => a.shareable !== false)
    .filter(a => !postedIds.has(a.id))
    .filter(isFresh)
    .sort((a, b) => b.date.localeCompare(a.date));

  log(`找到 ${candidates.length} 篇待發到 TG 頻道`);
  if (candidates.length === 0) {
    log('沒有新文章要發');
    return;
  }

  const toPost = candidates.slice(0, MAX_PER_RUN);
  if (candidates.length > MAX_PER_RUN) {
    log(`本次發 ${MAX_PER_RUN} 篇，剩 ${candidates.length - MAX_PER_RUN} 篇下次再發`);
  }

  let posted = 0, failed = 0;
  for (const a of toPost) {
    try {
      log(`📤 ${a.id}: ${a.title.slice(0, 40)}...`);
      const result = await sendToChannel(a);
      log(`   ✅ msg_id=${result.msg_id}`);
      state.posted.push({
        id: a.id,
        msg_id: result.msg_id,
        postedAt: new Date().toISOString(),
        title: a.title,
      });
      saveState(state);
      posted++;
      if (posted < toPost.length) await new Promise(r => setTimeout(r, DELAY_BETWEEN_POSTS));
    } catch (e) {
      err(`✗ ${a.id} 失敗：${e.message}`);
      failed++;
    }
  }

  log(`\n完成：${posted} 篇 / ${failed} 失敗`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => { err(e); process.exit(1); });
