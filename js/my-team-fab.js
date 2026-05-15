/* my-team-fab.js — 我的球隊 全站懸浮入口
 * 設計依據：docs/my-team-design.md v0.7 §11.5
 *
 * Feature flag：預設關閉，只有 localStorage.mt_beta='1' 才會顯示。
 * 開啟測試：localStorage.setItem('mt_beta','1'); location.reload()
 * 關閉：localStorage.removeItem('mt_beta'); location.reload()
 */
(function () {
  'use strict';

  const FAB_ID = 'mt-fab';

  // ── Feature flag check ──
  function _isEnabled() {
    try { return localStorage.getItem('mt_beta') === '1'; }
    catch (e) { return false; }
  }
  window.MyTeamBetaEnabled = _isEnabled;

  function injectFab() {
    if (document.getElementById(FAB_ID)) return;
    const fab = document.createElement('button');
    fab.id = FAB_ID;
    fab.className = 'mt-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', '開啟我的球隊');
    // body 是 display:flex column → FAB 必須 position:fixed 才能脫離 flex 流
    // 不依賴 .mt-fab CSS rule（怕 cache/load order/被覆蓋），inline 守住完整外觀
    fab.style.cssText = [
      'position:fixed','right:16px','bottom:80px',
      'width:64px','height:76px','z-index:9000',
      'display:flex','flex-direction:column','align-items:center','justify-content:flex-start',
      'padding:6px 4px 4px','gap:1px','box-sizing:border-box',
      'background:linear-gradient(180deg,#f0c040 0%,#e07020 100%)',
      'border:2.5px solid rgba(255,255,255,0.45)','border-radius:16px',
      'cursor:pointer','overflow:visible',
      'box-shadow:0 6px 18px rgba(240,192,64,0.45),0 3px 10px rgba(0,0,0,0.35)',
      'font-family:inherit'
    ].join(';');
    fab.innerHTML = `
      <span class="mt-fab-crest" id="mt-fab-crest"
        style="pointer-events:none;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:26px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">⚽</span>
      <span class="mt-fab-label"
        style="pointer-events:none;font-size:11px;font-weight:900;color:#2a1505;letter-spacing:1px;line-height:1.1;white-space:nowrap;text-shadow:0 1px 0 rgba(255,255,255,0.55);">我的隊伍</span>
      <span class="mt-fab-badge" id="mt-fab-badge" hidden
        style="position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#ff3030;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #1a1a2e;pointer-events:none;">0</span>
    `;
    fab.addEventListener('click', onClick);
    document.body.appendChild(fab);
  }

  function updateFab() {
    const crestEl = document.getElementById('mt-fab-crest');
    const badgeEl = document.getElementById('mt-fab-badge');
    if (!crestEl || !badgeEl) return;

    const team = window.MyTeam && window.MyTeam.getCached();
    if (team && team !== 'not_created') {
      // team_crest 現在是 SVG crest_id（'football'/'shield_stripes' 等）→ 用 TeamCrests render
      const crestId = team.team_crest;
      const knownCrests = window.TeamCrests ? window.TeamCrests.listCrests() : [];
      if (crestId && window.TeamCrests && knownCrests.includes(crestId)) {
        crestEl.innerHTML = window.TeamCrests.getSvg(crestId, team.crest_primary, team.crest_accent);
      } else {
        // 舊資料或未知 → fallback emoji
        crestEl.textContent = '⚽';
      }
      // 紅點：未開抽券 / SSR 自選券 > 0 → 顯示總數
      const pending = (team.tickets || 0) + (team.ssr_select_tickets || 0);
      if (pending > 0) {
        badgeEl.textContent = pending > 99 ? '99+' : String(pending);
        badgeEl.hidden = false;
      } else {
        badgeEl.hidden = true;
      }
    } else {
      crestEl.textContent = '⚽';
      // 沒建隊 → 用「!」邀請建隊
      badgeEl.textContent = '!';
      badgeEl.hidden = false;
    }
  }

  async function onClick() {
    if (typeof currentUser === 'undefined' || !currentUser) {
      // 沒登入 → 提示登入
      if (typeof showToast === 'function') {
        showToast('🔐 請先登入才能養球隊');
      } else {
        alert('請先登入才能用我的球隊功能');
      }
      // 觸發站內登入按鈕
      const loginBtn = document.querySelector('[onclick*="loginWithGoogle"], .login-btn');
      if (loginBtn) loginBtn.click();
      return;
    }

    if (typeof window.openMyTeamModal === 'function') {
      window.openMyTeamModal();
    } else {
      console.error('[my-team-fab] openMyTeamModal not loaded');
      if (typeof showToast === 'function') showToast('⚠️ 我的球隊載入失敗，請重整頁面');
      else alert('我的球隊載入失敗，請重整頁面');
    }
  }

  // 初始化：等 DOM ready 再注入
  function init() {
    if (!_isEnabled()) {
      console.log('[my-team] disabled (set localStorage.mt_beta="1" to enable)');
      return;
    }
    injectFab();
    // 嘗試 fetch（已登入會拿資料、未登入 fetch 回 null）
    if (window.MyTeam) {
      window.MyTeam.fetch().then(() => updateFab());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 監聽 my-team-changed event
  window.addEventListener('my-team-changed', updateFab);

  // 監聽登入變化（supabase-client.js 的 currentUser 變化會觸發 my-team-changed via fetch）
  // 我們也定期重撈一次以防錯過 event
  setInterval(() => {
    if (window.MyTeam && typeof currentUser !== 'undefined' && currentUser) {
      window.MyTeam.fetch();
    }
  }, 60000); // 每分鐘
})();
