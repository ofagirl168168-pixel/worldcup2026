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
    // 通知 data-fix：先別彈每日任務彈窗，等挑戰賽指引看完再彈
    window.__deferDailyTaskForChallenge = true;
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

  // 解除每日任務彈窗的延遲鎖定 → 補彈
  function _flushDeferredDailyTask() {
    window.__deferDailyTaskForChallenge = false;
    if (window.__pendingDailyTaskAfterChallenge && typeof window.showDailyTaskPopup === 'function') {
      window.__pendingDailyTaskAfterChallenge = false;
      // 給使用者 600ms 換氣再彈
      setTimeout(() => {
        try { window.showDailyTaskPopup(); } catch (e) {}
      }, 600);
    }
  }

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

    function close(opts) {
      dimmer.classList.remove('show');
      tooltip.classList.remove('show');
      navBtn.classList.remove('ob-nav-highlight');
      setTimeout(() => {
        dimmer.remove();
        tooltip.remove();
        // 沒進挑戰賽（直接略過 / 點黑幕關）→ 立刻補彈每日任務
        // 進了挑戰賽（看看怎麼玩 / 點 nav）→ 等 spotlight tutorial 結束後才補彈
        if (opts && opts.flushNow) _flushDeferredDailyTask();
      }, 280);
    }
    document.getElementById('ob-skip-challenge').addEventListener('click', () => close({ flushNow: true }));
    document.getElementById('ob-go-challenge').addEventListener('click', () => {
      close(); // 不立即 flush — 等 spotlight tutorial 結束
      try {
        // 直接模擬點 nav 按鈕：會觸發 friend-room.js 的 click listener（loadLobby + 訂閱 realtime）
        // 也會觸發我們自己的 click listener（彈 spotlight tutorial）
        // 之前用 showSection() 跳過了所有 click listener → lobby 卡載入、tutorial 不彈
        if (navBtn) navBtn.click();
        else if (typeof showSection === 'function') showSection('friend-room');
      } catch (e) {}
    });
    dimmer.addEventListener('click', () => close({ flushNow: true }));
    const onNavClick = () => {
      close(); // 不立即 flush — 等 spotlight tutorial 結束
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

  // ── 引導 3：到達挑戰賽頁面 → spotlight 頁面內引導 ──
  // 4 步驟：① 概念介紹（中央卡）② spotlight 開房按鈕 ③ spotlight 房間列表 ④ 結尾說明
  const TUTORIAL_STEPS = [
    {
      mode: 'spotlight',
      target: '#section-friend-room .fr-lobby-title',
      title: '歡迎來到麥迪挑戰賽',
      body: '真實比賽即將開打？開一間「房」邀朋友一起 <b>猜比分</b>，比賽時用 AI 模擬賽事直播決勝負。',
      tip: '💡 4 步驟導覽，30 秒看完就會玩',
      tooltipSide: 'bottom',
    },
    {
      mode: 'spotlight',
      target: '.fr-lobby-create',
      title: '點這裡開自己的房',
      body: '選一場比賽 → 設下注 XP → 選公開房 / 私人房 → 完成。系統會自動複製邀請連結。',
      tip: '💡 公開房任何人都能進；私人房只有拿到連結的人能進',
      tooltipSide: 'bottom',
    },
    {
      mode: 'spotlight',
      target: '#fr-lobby-list',
      title: '或從這裡加入別人開的房',
      body: '大廳已排好「本週開放中」的房間，包含 <b>系統官方房</b>（每場真實比賽自動建立）跟其他玩家的公開房。',
      tip: '💡 點「加入」直接猜比分，比開房還快',
      tooltipSide: 'top',
    },
    {
      mode: 'centered',
      icon: 'a4-magnifying-glass',
      title: '開賽 → AI 直播決勝負',
      body: '開賽時間到，所有人的猜分鎖定。<b>AI 跑模擬賽直播</b>，全房同步看哪邊先進球。<b>誰最接近真實比分誰贏</b>，獨享所有 XP 池。',
      tip: '💡 結束後分享戰績到 LINE，拉朋友來下一局',
    },
  ];

  function _showChallengeTutorial() {
    if (localStorage.getItem(STORAGE_CHALLENGE_TUTORIAL)) return;
    localStorage.setItem(STORAGE_CHALLENGE_TUTORIAL, '1');

    const root = document.createElement('div');
    root.className = 'cts-root';
    root.innerHTML = `
      <div class="cts-spotlight" id="cts-spotlight"></div>
      <div class="cts-card" id="cts-card">
        <button class="cts-close" aria-label="關閉">×</button>
        <div class="cts-step-num" id="cts-num"></div>
        <div class="cts-icon-wrap" id="cts-icon-wrap"></div>
        <h3 class="cts-title" id="cts-title"></h3>
        <p class="cts-body" id="cts-body"></p>
        <p class="cts-tip" id="cts-tip"></p>
        <div class="cts-actions">
          <button class="cts-btn-back" id="cts-back">← 上一步</button>
          <button class="cts-btn-primary" id="cts-next">下一步 →</button>
        </div>
        <div class="cts-progress" id="cts-progress"></div>
      </div>`;
    document.body.appendChild(root);

    let cur = 0;
    const spotlight = root.querySelector('#cts-spotlight');
    const card = root.querySelector('#cts-card');
    const closeBtn = root.querySelector('.cts-close');
    const backBtn = root.querySelector('#cts-back');
    const nextBtn = root.querySelector('#cts-next');

    let finishedByGoal = false; // true = 按了最後的「開始玩」（要彈手指指引）
    function close() {
      root.classList.remove('show');
      setTimeout(() => {
        root.remove();
        _flushDeferredDailyTask(); // tutorial 結束才彈每日任務
        if (finishedByGoal) _showOpenRoomFinger();
      }, 300);
    }
    closeBtn.addEventListener('click', close);
    spotlight.addEventListener('click', close);

    function render() {
      const step = TUTORIAL_STEPS[cur];
      const total = TUTORIAL_STEPS.length;

      // 步驟編號
      root.querySelector('#cts-num').textContent = `STEP ${cur + 1} / ${total}`;

      // icon
      const iconWrap = root.querySelector('#cts-icon-wrap');
      iconWrap.innerHTML = step.icon ? `<img src="/assets/personas/${step.icon}.svg" alt="">` : '';
      iconWrap.style.display = step.icon ? '' : 'none';

      // 文案
      root.querySelector('#cts-title').innerHTML = step.title;
      root.querySelector('#cts-body').innerHTML = step.body;
      const tipEl = root.querySelector('#cts-tip');
      if (step.tip) { tipEl.innerHTML = step.tip; tipEl.style.display = ''; }
      else { tipEl.style.display = 'none'; }

      // 進度點
      root.querySelector('#cts-progress').innerHTML =
        TUTORIAL_STEPS.map((_, i) => `<span class="cts-dot${i === cur ? ' on' : ''}"></span>`).join('');

      // 按鈕
      backBtn.style.visibility = cur === 0 ? 'hidden' : '';
      nextBtn.textContent = cur === total - 1 ? '🚀 開始玩' : '下一步 →';

      // mode：spotlight 圈出元素 + 把 card 放在元素旁邊
      if (step.mode === 'spotlight' && step.target) {
        const el = document.querySelector(step.target);
        if (el) {
          // scroll 到可視區
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          // 等 scroll 結束再定位（350ms）
          setTimeout(() => _positionSpotlight(el, step.tooltipSide || 'bottom'), 380);
        } else {
          _positionCardCenter();
        }
      } else {
        _positionCardCenter();
      }
    }

    function _positionSpotlight(el, side) {
      const rect = el.getBoundingClientRect();
      const pad = 12;
      const sx = rect.left - pad;
      const sy = rect.top - pad;
      const sw = rect.width + pad * 2;
      const sh = rect.height + pad * 2;

      // spotlight：用大 box-shadow 創造「中間透明、外圍半透明黑」的洞
      Object.assign(spotlight.style, {
        left: sx + 'px',
        top: sy + 'px',
        width: sw + 'px',
        height: sh + 'px',
        opacity: '1',
        display: 'block',
      });

      // 卡片放在元素附近
      card.classList.add('cts-card-floating');
      card.classList.remove('cts-card-centered');
      const cardW = Math.min(360, window.innerWidth - 32);
      let cardLeft, cardTop;
      if (side === 'top') {
        cardLeft = Math.max(16, Math.min(window.innerWidth - cardW - 16, sx + sw / 2 - cardW / 2));
        cardTop = Math.max(16, sy - 16 - card.offsetHeight);
        if (cardTop < 16) {
          // 上面放不下 → 改放下面
          cardTop = sy + sh + 16;
        }
      } else {
        cardLeft = Math.max(16, Math.min(window.innerWidth - cardW - 16, sx + sw / 2 - cardW / 2));
        cardTop = sy + sh + 16;
        if (cardTop + card.offsetHeight > window.innerHeight - 16) {
          cardTop = Math.max(16, sy - 16 - card.offsetHeight);
        }
      }
      Object.assign(card.style, {
        left: cardLeft + 'px',
        top: cardTop + 'px',
        right: 'auto',
        bottom: 'auto',
        transform: 'none',
      });
    }

    function _positionCardCenter() {
      // 中央模式：spotlight 全螢幕黑、card 置中
      Object.assign(spotlight.style, {
        left: '0', top: '0',
        width: '100vw', height: '100vh',
        opacity: '1',
        display: 'block',
      });
      card.classList.add('cts-card-centered');
      card.classList.remove('cts-card-floating');
      Object.assign(card.style, {
        left: '50%', top: '50%',
        right: 'auto', bottom: 'auto',
        transform: 'translate(-50%, -50%)',
      });
    }

    backBtn.addEventListener('click', () => { if (cur > 0) { cur--; render(); } });
    nextBtn.addEventListener('click', () => {
      if (cur < TUTORIAL_STEPS.length - 1) { cur++; render(); }
      else { finishedByGoal = true; close(); }
    });

    requestAnimationFrame(() => {
      root.classList.add('show');
      render();
    });

    // window resize → 重新定位
    const onResize = () => render();
    window.addEventListener('resize', onResize);
    root.addEventListener('transitionend', () => {
      if (!document.body.contains(root)) {
        window.removeEventListener('resize', onResize);
      }
    });
  }
  window.maybeShowChallengeTutorial = _showChallengeTutorial;

  // ── 引導 4：教學結束 → 動畫手指指向「開房」按鈕 ──
  function _showOpenRoomFinger() {
    const target = document.querySelector('.fr-lobby-create');
    if (!target) return;

    // 已存在就先移掉避免重疊
    const existing = document.getElementById('ob-finger-pointer');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.id = 'ob-finger-pointer';
    wrap.className = 'ob-finger-wrap';
    wrap.innerHTML = `
      <div class="ob-finger-bubble">點這裡開房 →</div>
      <div class="ob-finger-emoji">👆</div>`;
    document.body.appendChild(wrap);

    function reposition() {
      const rect = target.getBoundingClientRect();
      const wrapW = wrap.offsetWidth;
      const wrapH = wrap.offsetHeight;
      // 手指放在按鈕下方、置中對齊；超出右邊界就靠右
      let left = rect.left + rect.width / 2 - wrapW / 2;
      left = Math.max(8, Math.min(window.innerWidth - wrapW - 8, left));
      const top = rect.bottom + 8;
      wrap.style.left = left + 'px';
      wrap.style.top = top + 'px';
    }
    reposition();
    requestAnimationFrame(() => wrap.classList.add('show'));

    function cleanup() {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 250);
      target.removeEventListener('click', cleanup);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    }
    target.addEventListener('click', cleanup);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    // 60 秒沒按也自動消失
    setTimeout(cleanup, 60000);
  }

  // 監聽 section 切換到 friend-room → 首次彈 tutorial（延遲 800ms 讓頁面渲染）
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-section="friend-room"]');
    if (!btn) return;
    setTimeout(() => _showChallengeTutorial(), 800);
  });
})();
