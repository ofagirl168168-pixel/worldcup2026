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

      if (apiHasScore && live.status === 'finished' && existing.status !== 'finished') {
        // 比賽結束：更新比分、狀態、進球
        existing.status = 'finished';
        existing.score = live.score;
        if (live.goals?.length) existing.goals = live.goals;
        existing.minute = null;
        updated++;
      } else if (apiHasScore && live.status === 'live') {
        // 進行中：更新即時比分 + 分鐘數
        existing.status = 'live';
        existing.score = live.score;
        if (live.goals?.length) existing.goals = live.goals;
        if (live.minute !== undefined) existing.minute = live.minute;
        updated++;
      } else if (live.status === 'live' && existing.status !== 'live') {
        // 比賽剛開始，可能還沒有比分
        existing.status = 'live';
        existing.score = live.score || { h: 0, a: 0 };
        if (live.minute !== undefined) existing.minute = live.minute;
        updated++;
      } else if (apiHasScore && !localHasScore) {
        // 靜態資料沒有比分但 API 有（補資料）
        existing.status = live.status;
        existing.score = live.score;
        if (live.goals?.length) existing.goals = live.goals;
        if (live.minute !== undefined) existing.minute = live.minute;
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

  // ── 自動輪詢：有進行中比賽 60 秒，否則 2 分鐘 ──
  let pollTimer = null;
  function startPolling() {
    const hasLive = window.UCL_MATCHES?.some(m => m.status === 'live');
    const interval = hasLive ? 60 * 1000 : 2 * 60 * 1000;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      const stillLive = window.UCL_MATCHES?.some(m => m.status === 'live');
      if (stillLive || hasLive) {
        localStorage.removeItem(CACHE_KEY);
        loadLiveData().then(startPolling); // 重新調整間隔
      }
    }, interval);
  }
  // 初始啟動輪詢
  setTimeout(startPolling, 3000);

  // 導出供手動呼叫
  window.UCLLive = { refresh: loadLiveData };

})();
