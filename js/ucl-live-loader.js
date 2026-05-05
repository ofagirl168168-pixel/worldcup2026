/* =============================================
   UCL-LIVE-LOADER.JS — 即時比分載入器
   從 /api/ucl-live 取得最新歐冠比分
   自動合併到 UCL_MATCHES，觸發 UI 更新
   ============================================= */

(function () {
  'use strict';

  const ENDPOINT = '/api/ucl-live';
  const CACHE_KEY = 'ucl_live_cache';
  const CACHE_TTL = 2 * 60 * 1000; // 2 分鐘 client-side 快取

  // ── 從 localStorage 讀取快取 ──
  function getCached() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data;
    } catch { return null; }
  }

  function setCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    } catch { /* quota exceeded — ignore */ }
  }

  // ── 合併 API 資料到 UCL_MATCHES ──
  function mergeMatches(liveMatches) {
    if (!window.UCL_MATCHES || !liveMatches?.length) return 0;

    let updated = 0;
    for (const live of liveMatches) {
      if (!live.home || !live.away || live.home === 'TBD' || live.away === 'TBD') continue;

      // 找到對應的靜態比賽：stage + home + away 完全一致
      const existing = window.UCL_MATCHES.find(m =>
        m.stage === live.stage &&
        m.home === live.home &&
        m.away === live.away
      );

      if (!existing) continue;

      // 只在 API 有更新資料時才覆蓋
      const apiHasScore = live.score && live.score.h !== null;
      const localHasScore = existing.score && existing.score.h !== null;

      // 通用欄位更新（進球、黃牌、換人、半場比分等）
      const mergeExtra = () => {
        if (live.goals?.length) existing.goals = live.goals;
        if (live.bookings?.length) existing.bookings = live.bookings;
        if (live.substitutions?.length) existing.substitutions = live.substitutions;
        if (live.halfTime) existing.halfTime = live.halfTime;
        if (live.referee) existing.referee = live.referee;
        if (live.venue) existing.venue = live.venue;
      };

      if (apiHasScore && live.status === 'finished' && existing.status !== 'finished') {
        existing.status = 'finished';
        existing.score = live.score;
        existing.minute = null;
        mergeExtra();
        updated++;
      } else if (apiHasScore && live.status === 'live') {
        existing.status = 'live';
        existing.score = live.score;
        if (live.minute !== undefined) existing.minute = live.minute;
        mergeExtra();
        updated++;
      } else if (live.status === 'live' && existing.status !== 'live') {
        existing.status = 'live';
        existing.score = live.score || { h: 0, a: 0 };
        if (live.minute !== undefined) existing.minute = live.minute;
        mergeExtra();
        updated++;
      } else if (apiHasScore && !localHasScore) {
        existing.status = live.status;
        existing.score = live.score;
        if (live.minute !== undefined) existing.minute = live.minute;
        mergeExtra();
        updated++;
      }

      // 更新 SF/Final 的 TBD 隊伍（如果 API 已知）
      if (existing.home === 'TBD' && live.home !== 'TBD') {
        existing.home = live.home;
        updated++;
      }
      if (existing.away === 'TBD' && live.away !== 'TBD') {
        existing.away = live.away;
        updated++;
      }
    }

    return updated;
  }

  // ── 同時嘗試更新 TBD 隊伍（四強/決賽）──
  function updateTBDTeams(liveMatches) {
    if (!window.UCL_MATCHES || !liveMatches?.length) return;

    for (const live of liveMatches) {
      if (live.home === 'TBD' || live.away === 'TBD') continue;

      // 找 stage 相同但目前是 TBD 的比賽
      const tbd = window.UCL_MATCHES.find(m =>
        m.stage === live.stage &&
        (m.home === 'TBD' || m.away === 'TBD') &&
        live.date === m.date  // 用日期輔助匹配
      );

      if (tbd) {
        if (tbd.home === 'TBD') tbd.home = live.home;
        if (tbd.away === 'TBD') tbd.away = live.away;
      }
    }
  }

  // ── 主要載入函式 ──
  async function loadLiveData() {
    // 1. 先看 client-side cache
    const cached = getCached();
    if (cached) {
      const count = mergeMatches(cached);
      updateTBDTeams(cached);
      if (count > 0) dispatchUpdate();
      return;
    }

    // 2. 從 API 拉取
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.matches?.length) return;

      setCache(json.matches);
      const count = mergeMatches(json.matches);
      updateTBDTeams(json.matches);
      if (count > 0) dispatchUpdate();

      console.log(`[UCL Live] ${json.matches.length} matches fetched, ${count} updated (${json.updated})`);
    } catch (e) {
      console.warn('[UCL Live] fetch failed:', e.message);
    }
  }

  // ── 觸發 UI 更新 ──
  function dispatchUpdate() {
    // 重新渲染有用到 UCL_MATCHES 的元件
    if (typeof renderHomeBracket === 'function') renderHomeBracket();
    if (typeof renderUpcoming === 'function') renderUpcoming();

    // 如果目前在賽程頁或數據頁，也重新渲染
    const active = document.querySelector('.page-section.active')?.id?.replace('section-', '');
    if (active === 'schedule' && typeof renderSchedule === 'function') renderSchedule('all', 'all');
    if (active === 'stats' && typeof renderUCLBracket === 'function') renderUCLBracket();
  }

  // ── 頁面載入後執行 ──
  // 延遲 1 秒，讓靜態資料先渲染完
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(loadLiveData, 1000));
  } else {
    setTimeout(loadLiveData, 1000);
  }

  // ── 自動輪詢：有進行中比賽 60 秒、有 8h 內即將開賽的場 2 分鐘、其他 5 分鐘 ──
  // 之前 bug：若初次 fetch 時 hasLive=false 就鎖定 hasLive，setInterval 檢查 stillLive||hasLive 永遠 false → 永遠不再 fetch
  // → 開賽前打開頁面的使用者，到開賽時間後比分永遠不會更新
  // 修：polling 永遠 fetch，間隔依當下狀況決定（live=60s / 即將開賽=2 min / 平時=5 min）
  let pollTimer = null;
  function startPolling() {
    const matches = window.UCL_MATCHES || [];
    const now = Date.now();
    const hasLive = matches.some(m => m.status === 'live');
    const hasUpcomingSoon = matches.some(m => {
      if (m.status !== 'scheduled' || !m.date || !m.time) return false;
      const ts = new Date(`${m.date}T${m.time}:00+08:00`).getTime();
      return ts - now > 0 && ts - now < 8 * 3600 * 1000; // 8h 內
    });
    const interval = hasLive ? 60 * 1000
                   : hasUpcomingSoon ? 2 * 60 * 1000
                   : 5 * 60 * 1000;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      localStorage.removeItem(CACHE_KEY);
      loadLiveData().then(startPolling); // 取完依新狀態調整下一輪間隔
    }, interval);
  }
  setTimeout(startPolling, 3000);

  // 導出供手動呼叫
  window.UCLLive = { refresh: loadLiveData };

})();
