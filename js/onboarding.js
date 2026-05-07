/* =============================================
   ONBOARDING.JS — 新使用者首次造訪引導
   首訪偵測 → 「點 ⚔️ 麥迪擂台 投票拿你的第一個 XP」
   投完第一票 → 「想拉朋友來戰嗎？」分享卡
   ============================================= */

(function () {
  'use strict';

  const STORAGE_VISITED = 'ob_first_visit_done_v1';
  const STORAGE_FIRST_VOTE_DONE = 'ob_first_vote_done_v1';

  function isFirstTimeVisitor() {
    // 已經造訪過任何一次（投票過、看過引導、跑過任何 ob 流程） = 不再彈
    return !localStorage.getItem(STORAGE_VISITED);
  }

  function markVisited() {
    localStorage.setItem(STORAGE_VISITED, '1');
  }

  // ── 引導 1：首訪 → 指向擂台浮動鈕 ──
  function showWelcomeArrow() {
    const target = document.getElementById('btn-arena-float');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0) return; // 元素尚未渲染

    const overlay = document.createElement('div');
    overlay.className = 'ob-overlay';
    overlay.style.setProperty('--spot-x', (rect.left + rect.width / 2) + 'px');
    overlay.style.setProperty('--spot-y', (rect.top + rect.height / 2) + 'px');

    const arrow = document.createElement('div');
    arrow.className = 'ob-arrow';
    arrow.textContent = '👇';
    // 箭頭指向 target 上方
    arrow.style.left = (rect.left + rect.width / 2 - 18) + 'px';
    arrow.style.top = (rect.top - 50) + 'px';

    const tooltip = document.createElement('div');
    tooltip.className = 'ob-tooltip';
    // tooltip 放在箭頭上方
    tooltip.style.left = Math.max(16, rect.left + rect.width / 2 - 140) + 'px';
    tooltip.style.bottom = (window.innerHeight - rect.top + 60) + 'px';
    tooltip.innerHTML = `
      <div class="ob-tooltip-title">🎉 歡迎來到 Soccer麥迪</div>
      <div>每天有 1-2 題擂台投票，連續打卡能升等。<br>點 <b>⚔️ 麥迪擂台</b> 開始你的第一票！</div>
      <div class="ob-tooltip-actions">
        <button class="ob-btn-primary" id="ob-go-vote">⚔️ 立即開戰</button>
        <button class="ob-btn-skip" id="ob-skip">先逛逛</button>
      </div>`;

    document.body.appendChild(overlay);
    document.body.appendChild(arrow);
    document.body.appendChild(tooltip);
    requestAnimationFrame(() => overlay.classList.add('show'));

    function close() {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        arrow.remove();
        tooltip.remove();
      }, 300);
      markVisited();
    }
    document.getElementById('ob-go-vote').addEventListener('click', () => {
      close();
      // 直接開擂台彈窗
      try { if (typeof showOpinionPoll === 'function') showOpinionPoll(null, { force: true }); } catch (e) {}
    });
    document.getElementById('ob-skip').addEventListener('click', close);
    overlay.addEventListener('click', close);
  }

  // ── 啟動 ──
  function init() {
    if (!isFirstTimeVisitor()) return;
    // 等 3 秒讓使用者先看到首頁，再彈引導
    setTimeout(() => {
      // 二次檢查：如果擂台彈窗已經自己彈起來了（每日彈窗），不要重疊
      if (document.getElementById('opinion-overlay')) {
        markVisited(); // 算他看過了
        return;
      }
      showWelcomeArrow();
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── 投完第一票 → 分享卡邀朋友（由 opinion-poll.js 在 _handleVote 後呼叫）──
  // 透過全域旗標讓 opinion-poll.js 簡單觸發
  window.maybeShowFirstVoteShare = function maybeShowFirstVoteShare(opinion) {
    if (localStorage.getItem(STORAGE_FIRST_VOTE_DONE)) return;
    localStorage.setItem(STORAGE_FIRST_VOTE_DONE, '1');
    markVisited();
    if (typeof showShareCard !== 'function') return;
    setTimeout(() => showShareCard({
      eventKey: 'first-vote',
      title: '🎉 完成第一票！',
      subtitle: 'WELCOME TO MADDY ARENA',
      bodyHtml: `<div>歡迎加入麥迪擂台</div><div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:6px">拉朋友一起戰，雙方各拿 +5 💎</div>`,
      themeColor: '#6bd09e',
      shareText: '🎯 我剛在 Soccer麥迪 完成第一票！每天一題擂台投票、連續打卡升等，一起來戰？',
    }), 3500);
  };
})();
