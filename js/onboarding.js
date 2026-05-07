/* =============================================
   ONBOARDING.JS — 新使用者首次造訪引導
   首訪偵測 → 「點 ⚔️ 麥迪擂台 投票拿你的第一個 XP」
   投完第一票 → 「想拉朋友來戰嗎？」分享卡
   ============================================= */

(function () {
  'use strict';

  const STORAGE_VISITED = 'ob_first_visit_done_v1';
  const STORAGE_FIRST_VOTE_DONE = 'ob_first_vote_done_v1';
  const STORAGE_CHALLENGE_TUTORIAL = 'ob_challenge_tutorial_done_v1';
  const STORAGE_CHALLENGE_HINT_SHOWN = 'ob_challenge_hint_shown_v1';

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
  // 跟「每日麥迪擂台彈窗」打架的問題：以前 init 在 3 秒後直接彈引導，
  // 但 daily popup 可能更晚才開（auto-refresh / 資料載入完才開）→ 兩個 overlay 疊在一起。
  // 修法：擂台彈窗如果在最初 8 秒內出現，當作「使用者已被引導到擂台」→ 跳過 onboarding。
  function init() {
    if (!isFirstTimeVisitor()) return;
    // 等候 8 秒看擂台彈窗會不會自己跳；途中任何時點偵測到 #opinion-overlay → markVisited 直接跳過
    let elapsed = 0;
    const POLL_MS = 250;
    const MAX_WAIT_MS = 8000;
    const timer = setInterval(() => {
      // 1. 已經跳了擂台彈窗 → 視同已引導，永遠不再彈 onboarding
      if (document.getElementById('opinion-overlay')) {
        clearInterval(timer);
        markVisited();
        return;
      }
      // 2. 過 8 秒還沒跳擂台 → 自己彈引導
      elapsed += POLL_MS;
      if (elapsed >= MAX_WAIT_MS) {
        clearInterval(timer);
        // 最終還要再確認一次（race condition 保險）
        if (document.getElementById('opinion-overlay')) { markVisited(); return; }
        showWelcomeArrow();
      }
    }, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── 投完第一票 → 分享卡邀朋友 ──
  window.maybeShowFirstVoteShare = function maybeShowFirstVoteShare(opinion) {
    if (localStorage.getItem(STORAGE_FIRST_VOTE_DONE)) return;
    localStorage.setItem(STORAGE_FIRST_VOTE_DONE, '1');
    markVisited();
    if (typeof showShareCard !== 'function') return;
    setTimeout(() => {
      showShareCard({
        eventKey: 'first-vote',
        icon: 'firstVote',
        title: '完成第一票',
        subtitle: 'WELCOME TO MADDY ARENA',
        bodyText: '歡迎加入麥迪擂台<br/>每天一題、連續打卡升等',
        reward: '拉朋友一起戰，雙方各拿 +5 💎',
        themeColor: '#6bd09e',
        shareText: '🎯 我剛在 Soccer麥迪 完成第一票！每天一題擂台投票、連續打卡升等，一起來戰？',
      });
      // 等使用者關掉所有 overlay（分享卡 + 擂台彈窗）才彈挑戰賽提示，
      // 不然會疊在還沒關的擂台/分享卡上面打架
      _waitForAllOverlaysClosedThen(() => _showChallengeNavHint(), 1200);
    }, 3500);
  };

  // 輪詢直到分享卡 + 擂台彈窗 + 任何 modal-like overlay 都關掉 → 才執行 cb
  function _waitForAllOverlaysClosedThen(cb, delayMs) {
    const POLL = 300;
    const MAX_WAIT = 5 * 60 * 1000; // 5 分鐘上限
    const SELECTORS = [
      '#share-card-overlay',
      '#opinion-overlay',
      '.opinion-overlay.open',
      '.feedback-modal-overlay.open',
      '.fr-modal-overlay.open',
      '.pq-overlay.open',
      '.dtask-popup-overlay',  // 每日任務彈窗
      '.modal-overlay.open',   // 通用彈窗
      '.predict-result-banner',// 預測揭曉 banner
    ];
    function anyOpen() {
      return SELECTORS.some(s => document.querySelector(s));
    }
    let elapsed = 0;
    const t = setInterval(() => {
      if (!anyOpen()) {
        clearInterval(t);
        setTimeout(cb, delayMs || 0);
        return;
      }
      elapsed += POLL;
      if (elapsed >= MAX_WAIT) {
        clearInterval(t); // 放棄
      }
    }, POLL);
  }

  // ── 引導 2：投完第一票後，提示「挑戰賽」更好玩 ──
  function _showChallengeNavHint() {
    if (localStorage.getItem(STORAGE_CHALLENGE_HINT_SHOWN)) return;
    // 再次檢查當下是否有 overlay（race condition 保險）— 有就再 polling 等
    const SELECTORS = [
      '#share-card-overlay', '#opinion-overlay',
      '.opinion-overlay.open', '.feedback-modal-overlay.open',
      '.fr-modal-overlay.open', '.pq-overlay.open',
      '.dtask-popup-overlay', '.modal-overlay.open',
      '.predict-result-banner',
    ];
    if (SELECTORS.some(s => document.querySelector(s))) {
      _waitForAllOverlaysClosedThen(_showChallengeNavHint, 1200);
      return;
    }
    localStorage.setItem(STORAGE_CHALLENGE_HINT_SHOWN, '1');
    const navBtn = document.querySelector('.nav-btn[data-section="friend-room"]');
    if (!navBtn) return;
    const rect = navBtn.getBoundingClientRect();
    if (rect.width === 0) return;

    // dim background 讓 tooltip 更醒目
    const dimmer = document.createElement('div');
    dimmer.className = 'ob-dimmer';
    document.body.appendChild(dimmer);

    const tooltip = document.createElement('div');
    tooltip.className = 'ob-tooltip ob-tooltip-challenge';
    const left = Math.min(window.innerWidth - 296, Math.max(16, rect.left + rect.width / 2 - 140));
    tooltip.style.left = left + 'px';
    tooltip.style.top = (rect.bottom + 14) + 'px';
    tooltip.innerHTML = `
      <div class="ob-tooltip-title">🏆 試試麥迪挑戰賽</div>
      <div>跟朋友開房猜比分、看模擬賽直播決勝負，最容易拉朋友一起玩。</div>
      <div class="ob-tooltip-actions">
        <button class="ob-btn-primary" id="ob-go-challenge">🏆 看看怎麼玩</button>
        <button class="ob-btn-skip" id="ob-skip-challenge">略過</button>
      </div>
      <div class="ob-tooltip-arrow ob-tooltip-arrow-up"></div>`;
    document.body.appendChild(tooltip);

    // 高亮 nav 按鈕（脈動光暈）
    navBtn.classList.add('ob-nav-highlight');

    requestAnimationFrame(() => {
      dimmer.classList.add('show');
      tooltip.classList.add('show');
    });

    function close() {
      dimmer.classList.remove('show');
      tooltip.classList.remove('show');
      navBtn.classList.remove('ob-nav-highlight');
      setTimeout(() => {
        dimmer.remove();
        tooltip.remove();
      }, 280);
    }
    document.getElementById('ob-skip-challenge').addEventListener('click', close);
    document.getElementById('ob-go-challenge').addEventListener('click', () => {
      close();
      try {
        if (typeof showSection === 'function') showSection('friend-room');
        else if (navBtn) navBtn.click();
      } catch (e) {}
    });
    // 點 dim 也關
    dimmer.addEventListener('click', close);
    // 點 nav 按鈕直接進挑戰賽（也算「看看怎麼玩」）
    const onNavClick = () => {
      close();
      navBtn.removeEventListener('click', onNavClick);
    };
    navBtn.addEventListener('click', onNavClick);

    // 不再 12 秒自動消失 — 由使用者按按鈕關掉
    // 但若中途有其他 overlay 跳出來（每日任務、預測結算彈窗等），先 hide tooltip 等它關掉再 re-show
    let hidden = false;
    const watchdog = setInterval(() => {
      const open = SELECTORS.some(s => document.querySelector(s));
      if (open && !hidden) {
        hidden = true;
        tooltip.style.opacity = '0';
        tooltip.style.pointerEvents = 'none';
        dimmer.style.opacity = '0';
      } else if (!open && hidden) {
        hidden = false;
        tooltip.style.opacity = '';
        tooltip.style.pointerEvents = '';
        dimmer.style.opacity = '';
      }
      if (!document.body.contains(tooltip)) clearInterval(watchdog);
    }, 400);
  }

  // ── 引導 3：到達挑戰賽頁面 → 4 步驟導覽 ──
  function _showChallengeTutorial() {
    if (localStorage.getItem(STORAGE_CHALLENGE_TUTORIAL)) return;
    localStorage.setItem(STORAGE_CHALLENGE_TUTORIAL, '1');

    const overlay = document.createElement('div');
    overlay.className = 'ct-overlay';
    overlay.innerHTML = `
      <div class="ct-card">
        <button class="ct-close">×</button>
        <div class="ct-icon"><img src="/assets/personas/a10-crown.svg" alt=""></div>
        <div class="ct-step" id="ct-step-1">
          <div class="ct-step-num">STEP 1 / 4</div>
          <h3>歡迎來到麥迪挑戰賽</h3>
          <p>真實比賽即將開打？開一間「房」邀朋友一起 <b>猜比分</b>，比賽用 AI 模擬賽事直播決勝負。</p>
          <div class="ct-actions">
            <button class="ct-btn-primary" data-next>下一步 →</button>
            <button class="ct-btn-skip" data-close>略過</button>
          </div>
        </div>
        <div class="ct-step" id="ct-step-2" style="display:none">
          <div class="ct-step-num">STEP 2 / 4</div>
          <h3>怎麼開房？</h3>
          <p>右上角「<b>＋ 開房</b>」按鈕 → 選比賽 → 設下注 (XP) → 公開房 / 私人房自選。</p>
          <p class="ct-tip">💡 公開房任何人都能進；私人房只有拿到連結的人能進。</p>
          <div class="ct-actions">
            <button class="ct-btn-back" data-prev>← 上一步</button>
            <button class="ct-btn-primary" data-next>下一步 →</button>
          </div>
        </div>
        <div class="ct-step" id="ct-step-3" style="display:none">
          <div class="ct-step-num">STEP 3 / 4</div>
          <h3>邀請朋友</h3>
          <p>建房後系統自動複製邀請連結，並提供 <b>📲 LINE / ✈️ Telegram</b> 一鍵分享按鈕。朋友點連結直接進房。</p>
          <p class="ct-tip">💡 朋友透過你的連結首次完成擂台投票，雙方各拿 <b>+5 💎</b>。</p>
          <div class="ct-actions">
            <button class="ct-btn-back" data-prev>← 上一步</button>
            <button class="ct-btn-primary" data-next>下一步 →</button>
          </div>
        </div>
        <div class="ct-step" id="ct-step-4" style="display:none">
          <div class="ct-step-num">STEP 4 / 4</div>
          <h3>開賽 → 直播決勝負</h3>
          <p>開賽時間到，所有人的猜分都鎖定。AI 跑模擬賽直播，全房同步看哪邊先進球。<b>誰最接近真實比分誰贏</b>，獨享所有 XP 池。</p>
          <p class="ct-tip">💡 找不到合適比賽？大廳已自動排好「<b>本週開放中</b>」的官方房，直接點「加入」就行。</p>
          <div class="ct-actions">
            <button class="ct-btn-back" data-prev>← 上一步</button>
            <button class="ct-btn-primary ct-btn-finish" data-close>🚀 開始玩</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    let cur = 1;
    function show(n) {
      cur = n;
      overlay.querySelectorAll('.ct-step').forEach((el, i) => {
        el.style.display = (i + 1 === n) ? '' : 'none';
      });
    }
    function close() {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 280);
    }
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
      const t = e.target.closest('[data-next], [data-prev], [data-close], .ct-close');
      if (!t) return;
      if (t.matches('[data-next]')) show(cur + 1);
      else if (t.matches('[data-prev]')) show(cur - 1);
      else close();
    });
  }
  window.maybeShowChallengeTutorial = _showChallengeTutorial;

  // 監聽 section 切換到 friend-room → 首次彈 tutorial
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-section="friend-room"]');
    if (!btn) return;
    setTimeout(() => _showChallengeTutorial(), 600);
  });
})();
