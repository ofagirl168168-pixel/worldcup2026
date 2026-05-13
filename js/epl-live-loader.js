/* =============================================
   EPL-LIVE-LOADER.JS — 英超即時比分載入器
   從 /api/epl-live 取得最新英超比分
   自動填入 EPL_MATCHES，觸發 UI 更新
   ============================================= */

(function () {
  'use strict';

  const ENDPOINT = '/api/epl-live';
  // v2：合併 key 改為 home+away+stage（同季 home/away 對組合是唯一的）
  // 舊 cache 用 home+away+date，可能殘留 MW38 等未來場次的時間錯位 → 重複
  const CACHE_KEY = 'epl_live_cache_v2';
  const CACHE_TTL = 2 * 60 * 1000; // 2 分鐘 client-side 快取
  const STANDINGS_ENDPOINT = '/api/epl-standings';
  const STANDINGS_CACHE_KEY = 'epl_standings_cache';
  const STANDINGS_TTL = 30 * 60 * 1000; // 30 分鐘

  // 啟動時清掉舊 cache key，避免遺留資料
  try { localStorage.removeItem('epl_live_cache'); } catch {}

  function getCached(key, ttl) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > ttl) return null;
      return data;
    } catch { return null; }
  }

  function setCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch { /* quota exceeded */ }
  }

  // ── 合併比賽到 EPL_MATCHES ──
  function mergeMatches(liveMatches) {
    if (!window.EPL_MATCHES) window.EPL_MATCHES = [];

    // 用 home+away+stage 當 unique key — 同季 EPL home/away 對組合是唯一的，
    // 跟 date/time 無關（API 的時間可能跟手動寫的差幾分鐘到幾小時，導致 merge 漏判）
    const matchKey = (m) => `${m.home}|${m.away}|${m.stage || 'league'}`;

    // 去重保護：若同 key 有多筆（之前 bug 或 API/manual 時間差異留下的），
    // 留下「已完賽 > 進行中 > 預定」優先，再以最早 date 為基準
    const statusRank = { finished: 3, live: 2, upcoming: 1, scheduled: 0 };
    const groups = new Map();
    for (const m of window.EPL_MATCHES) {
      const k = matchKey(m);
      const prev = groups.get(k);
      if (!prev) { groups.set(k, m); continue; }
      const a = statusRank[m.status] || 0;
      const b = statusRank[prev.status] || 0;
      if (a > b || (a === b && (m.date + m.time) < (prev.date + prev.time))) {
        groups.set(k, m);
      }
    }
    window.EPL_MATCHES = [...groups.values()];

    if (!liveMatches?.length) return 0;

    let updated = 0;
    for (const live of liveMatches) {
      if (!live.home || !live.away || live.home === 'TBD') continue;

      // 找已有比賽（home+away+stage）
      const liveKey = matchKey(live);
      const idx = window.EPL_MATCHES.findIndex(m => matchKey(m) === liveKey);

      if (idx >= 0) {
        // 已有 → 更新（live 比分覆寫；未開賽則同步時間以避免時差顯示錯誤）
        const existing = window.EPL_MATCHES[idx];
        if (live.score && live.status !== 'scheduled') {
          existing.status = live.status;
          existing.score = live.score;
          if (live.goals?.length) existing.goals = live.goals;
          if (live.bookings?.length) existing.bookings = live.bookings;
          if (live.substitutions?.length) existing.substitutions = live.substitutions;
          if (live.halfTime) existing.halfTime = live.halfTime;
          if (live.minute !== undefined) existing.minute = live.minute;
          if (live.referee) existing.referee = live.referee;
          if (live.venue) existing.venue = live.venue;
          updated++;
        } else if (live.status === 'scheduled' && live.date) {
          // 未開賽：以 API 時間為準（用 BST 換算過，API 才會是最新）
          // 但只在差距大於 30 分鐘才覆寫，避免微小時差導致顯示跳動
          const oldStamp = new Date(`${existing.date}T${existing.time || '00:00'}:00`).getTime();
          const newStamp = new Date(`${live.date}T${live.time || '00:00'}:00`).getTime();
          if (Math.abs(newStamp - oldStamp) > 30 * 60 * 1000) {
            existing.date = live.date;
            existing.time = live.time;
            updated++;
          }
        }
      } else {
        // 新比賽 — 加入
        window.EPL_MATCHES.push(live);
        updated++;
      }
    }

    // 按日期排序
    window.EPL_MATCHES.sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
    return updated;
  }

  // ── 載入比賽資料 ──
  async function loadLiveData() {
    // 只在 EPL 模式下載入
    if (window.Tournament && !window.Tournament.isEPL()) return;

    const cached = getCached(CACHE_KEY, CACHE_TTL);
    if (cached) {
      mergeMatches(cached);
      dispatchUpdate();
      return;
    }

    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.matches?.length) return;

      setCache(CACHE_KEY, json.matches);
      const count = mergeMatches(json.matches);
      if (count > 0) dispatchUpdate();

      console.log(`[EPL Live] ${json.matches.length} matches fetched, ${count} updated`);
    } catch (e) {
      console.warn('[EPL Live] fetch failed:', e.message);
    }
  }

  // ── 載入積分榜（存到 window 供 renderStats 使用）──
  async function loadStandings() {
    if (window.Tournament && !window.Tournament.isEPL()) return;

    const cached = getCached(STANDINGS_CACHE_KEY, STANDINGS_TTL);
    if (cached) {
      window._eplStandings = cached;
      return;
    }

    try {
      const res = await fetch(STANDINGS_ENDPOINT);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.standings?.length) return;

      window._eplStandings = json.standings;
      window._eplCurrentMatchday = json.matchday;
      setCache(STANDINGS_CACHE_KEY, json.standings);
      console.log(`[EPL Standings] ${json.standings.length} teams loaded (MD${json.matchday})`);
    } catch (e) {
      console.warn('[EPL Standings] fetch failed:', e.message);
    }
  }

  // ── 觸發 UI 更新 ──
  function dispatchUpdate() {
    if (typeof renderUpcoming === 'function') renderUpcoming();
    const active = document.querySelector('.page-section.active')?.id?.replace('section-', '');
    if (active === 'schedule' && typeof renderSchedule === 'function') renderSchedule('all', 'all');
  }

  // ── 公開 API ──
  window.EPLLive = {
    load: loadLiveData,
    loadStandings,
    refresh: async () => {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(STANDINGS_CACHE_KEY);
      await Promise.all([loadLiveData(), loadStandings()]);
    }
  };

  // ── 頁面載入後執行 ──
  function init() {
    // 清掉前次 session 留下的 stale cache（可能存的是還沒開賽的版本）→ 強制初次抓 API
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(STANDINGS_CACHE_KEY);
    } catch (e) {}
    // 延遲 1.5 秒讓靜態資料先渲染
    setTimeout(() => {
      loadLiveData();
      loadStandings();
    }, 1500);

    // 每 2 分鐘輪詢（僅 EPL 模式）
    setInterval(() => {
      if (window.Tournament?.isEPL()) loadLiveData();
    }, 2 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 賽事切換時也載入
  window.addEventListener('tournamentChanged', (e) => {
    if (e.detail?.tournament === 'epl') {
      setTimeout(() => {
        loadLiveData();
        loadStandings();
      }, 300);
    }
  });

})();
