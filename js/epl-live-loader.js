/* =============================================
   EPL-LIVE-LOADER.JS — 英超即時比分載入器
   從 /api/epl-live 取得最新英超比分
   自動填入 EPL_MATCHES，觸發 UI 更新
   ============================================= */

(function () {
  'use strict';

  const ENDPOINT = '/api/epl-live';
  const CACHE_KEY = 'epl_live_cache';
  const CACHE_TTL = 2 * 60 * 1000; // 2 分鐘 client-side 快取
  const STANDINGS_ENDPOINT = '/api/epl-standings';
  const STANDINGS_CACHE_KEY = 'epl_standings_cache';
  const STANDINGS_TTL = 30 * 60 * 1000; // 30 分鐘

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
    if (!liveMatches?.length) return 0;

    let updated = 0;
    for (const live of liveMatches) {
      if (!live.home || !live.away || live.home === 'TBD') continue;

      // 找已有比賽
      const idx = window.EPL_MATCHES.findIndex(m =>
        m.home === live.home && m.away === live.away && m.matchday === live.matchday
      );

      if (idx >= 0) {
        // 更新
        const existing = window.EPL_MATCHES[idx];
        if (live.score && live.status !== 'scheduled') {
          existing.status = live.status;
          existing.score = live.score;
          if (live.goals?.length) existing.goals = live.goals;
          if (live.minute !== undefined) existing.minute = live.minute;
          updated++;
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
