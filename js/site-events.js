/* site-events.js — 輕量事件追蹤
 * 寫到 Supabase site_events 表、後端 admin 儀表板用
 * RLS：anyone can insert / no one can read (admin RPC 才能讀)
 *
 * API：
 *   SiteEvents.track(event_type, page, metadata)
 *
 * 內建埋點：
 *   - showSection wrap → tab_view
 *   - openArticle wrap → article_view
 *   - Tournament.switch wrap → tournament_switch
 */
(function () {
  'use strict';

  // 開發環境（localhost）不寫事件、避免污染數據
  function _isDev() {
    try {
      return /^localhost$|^127\.|\.local$/.test(window.location.hostname);
    } catch (e) { return false; }
  }

  // 同 tab 內、5 秒內相同 (event_type, page, article_id) 不重複寫
  const _recent = new Map();
  function _shouldDedup(key) {
    const now = Date.now();
    const last = _recent.get(key) || 0;
    if (now - last < 5000) return true;
    _recent.set(key, now);
    // 清理超過 60 秒的舊 key 避免長期佔記憶體
    if (_recent.size > 200) {
      for (const [k, t] of _recent) if (now - t > 60000) _recent.delete(k);
    }
    return false;
  }

  async function track(eventType, page, metadata) {
    if (!eventType) return;
    if (_isDev()) return;
    if (!window.DB) return;
    const key = `${eventType}|${page || ''}|${metadata?.article_id || metadata?.to || ''}`;
    if (_shouldDedup(key)) return;
    try {
      const uid = window.currentUser?.id || null;
      await window.DB.from('site_events').insert({
        user_id: uid,
        event_type: String(eventType).slice(0, 40),
        page: page ? String(page).slice(0, 40) : null,
        metadata: metadata || {},
      });
    } catch (e) {
      // 不擋使用者操作、悄悄記 console
      console.warn('[site-events]', e?.message || e);
    }
  }

  // ── 自動埋點 1：showSection → tab_view ──
  function _wrapShowSection() {
    const orig = window.showSection;
    if (typeof orig !== 'function') return false;
    if (orig.__events_wrapped) return true;
    const wrapped = function (sec, ...rest) {
      try { track('tab_view', sec || 'unknown'); } catch (e) {}
      return orig.apply(this, [sec, ...rest]);
    };
    wrapped.__events_wrapped = true;
    window.showSection = wrapped;
    return true;
  }

  // ── 自動埋點 2：openArticle / openUCLArticle / openEPLArticle → article_view ──
  function _wrapOpenArticle(name) {
    const orig = window[name];
    if (typeof orig !== 'function') return false;
    if (orig.__events_wrapped) return true;
    const wrapped = function (id, ...rest) {
      try { track('article_view', null, { article_id: String(id) }); } catch (e) {}
      return orig.apply(this, [id, ...rest]);
    };
    wrapped.__events_wrapped = true;
    window[name] = wrapped;
    return true;
  }

  // ── 自動埋點 3：Tournament.switch → tournament_switch ──
  function _wrapTournamentSwitch() {
    if (!window.Tournament || typeof window.Tournament.switch !== 'function') return false;
    const orig = window.Tournament.switch;
    if (orig.__events_wrapped) return true;
    const wrapped = function (target, ...rest) {
      try {
        const from = window.Tournament.current?.() || 'unknown';
        if (from !== target) track('tournament_switch', null, { from, to: target });
      } catch (e) {}
      return orig.apply(this, [target, ...rest]);
    };
    wrapped.__events_wrapped = true;
    window.Tournament.switch = wrapped;
    return true;
  }

  // 因為 app.js / tournament.js / supabase-client.js 載入順序不一定確定、
  // 輪詢 wrap 直到全部就緒（或最多 10 秒）
  function _installWraps() {
    const targets = [
      () => _wrapShowSection(),
      () => _wrapOpenArticle('openArticle'),
      () => _wrapOpenArticle('openUCLArticle'),
      () => _wrapOpenArticle('openEPLArticle'),
      () => _wrapTournamentSwitch(),
    ];
    let attempts = 0;
    const tryAll = () => {
      attempts++;
      let allOk = true;
      for (const fn of targets) {
        try { if (!fn()) allOk = false; } catch (e) { allOk = false; }
      }
      if (!allOk && attempts < 50) setTimeout(tryAll, 200);
    };
    tryAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _installWraps);
  } else {
    _installWraps();
  }

  window.SiteEvents = { track };
})();
