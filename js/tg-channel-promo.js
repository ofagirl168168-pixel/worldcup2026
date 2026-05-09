/* =============================================
   TG-CHANNEL-PROMO.JS — Telegram 頻道訂閱推廣
   - 首頁卡片（永久顯示）
   - 高互動時刻彈窗（投過 2 票或 1 次預測後彈一次）
   - 文章底部 CTA
   ============================================= */

(function () {
  'use strict';

  const CHANNEL_URL = 'https://t.me/soccermaddy';
  const CHANNEL_HANDLE = '@soccermaddy';

  const STORAGE_DISMISSED = 'tg_promo_dismissed_v1';
  const STORAGE_JOINED = 'tg_promo_joined_v1';

  function isDismissed() {
    return localStorage.getItem(STORAGE_DISMISSED) === '1';
  }
  function markDismissed() {
    localStorage.setItem(STORAGE_DISMISSED, '1');
  }
  function markJoined() {
    localStorage.setItem(STORAGE_JOINED, '1');
    markDismissed(); // 加入了就不要再彈
  }

  // 計算使用者參與度（投票次數 + 預測次數）
  function getEngagementScore() {
    let score = 0;
    try {
      // 擂台投票紀錄（每個 op id 一筆）
      const opVotes = Object.keys(localStorage).filter(k => k.startsWith('opinion_voted_'));
      score += opVotes.length;
      // 預測紀錄
      ['wc26_my_preds', 'epl26_my_preds', 'ucl26_my_preds'].forEach(k => {
        try {
          const preds = JSON.parse(localStorage.getItem(k) || '{}');
          score += Object.keys(preds).length;
        } catch (e) {}
      });
    } catch (e) {}
    return score;
  }

  // ── 彈窗：高互動時刻才彈 ──
  function maybeShowPromoModal() {
    if (isDismissed()) return;
    // 等其他 overlay 關閉
    const blockers = ['#share-card-overlay', '#opinion-overlay', '.cts-root',
                      '#predict-spotlight-overlay', '.fr-modal-overlay.open',
                      '.dtask-popup-overlay', '#tg-promo-overlay'];
    if (blockers.some(s => document.querySelector(s))) {
      setTimeout(maybeShowPromoModal, 2000);
      return;
    }
    if (getEngagementScore() < 2) return; // 互動 < 2 不彈，避免新使用者就被推播煩到
    showPromoModal();
  }

  function showPromoModal() {
    if (document.getElementById('tg-promo-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tg-promo-overlay';
    overlay.className = 'tg-promo-overlay';
    overlay.innerHTML = `
      <div class="tg-promo-card">
        <button class="tgp-close" aria-label="關閉">×</button>
        <div class="tgp-icon">📢</div>
        <h2 class="tgp-title">訂閱麥迪官方頻道</h2>
        <p class="tgp-subtitle">完全免費 · 不打擾 · 一鍵離開</p>
        <div class="tgp-perks">
          <div class="tgp-perk"><span>📰</span>每篇賽前/賽後深度分析</div>
          <div class="tgp-perk"><span>⏰</span>比賽前 1 小時提醒</div>
          <div class="tgp-perk"><span>🥊</span>擂台新題目第一手通知</div>
          <div class="tgp-perk"><span>🌍</span>世足倒數情報</div>
        </div>
        <a class="tgp-join-btn" href="${CHANNEL_URL}" target="_blank" rel="noopener">
          📲 加入 ${CHANNEL_HANDLE}
        </a>
        <button class="tgp-skip">先不加</button>
        <p class="tgp-tip">不會再彈第二次（不論你選加入或先不加）</p>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function close() {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      markDismissed();
    }
    overlay.querySelector('.tgp-close').addEventListener('click', close);
    overlay.querySelector('.tgp-skip').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.tgp-join-btn').addEventListener('click', () => {
      markJoined();
      // 不主動關，讓使用者點過去
    });
  }
  window.showTgChannelPromo = showPromoModal;

  // ── 首頁卡片（永久顯示）──
  function renderHomeCard() {
    const root = document.getElementById('home-tg-channel-promo');
    if (!root) return;
    // 已加入就隱藏
    if (localStorage.getItem(STORAGE_JOINED)) {
      root.style.display = 'none';
      return;
    }
    root.style.display = '';
    root.innerHTML = `
      <div class="tg-home-card">
        <div class="tg-home-icon">📢</div>
        <div class="tg-home-content">
          <div class="tg-home-title">訂閱麥迪 Telegram 頻道</div>
          <div class="tg-home-desc">每篇分析 + 賽前提醒 + 擂台新題目第一手通知</div>
        </div>
        <a class="tg-home-btn" href="${CHANNEL_URL}" target="_blank" rel="noopener" onclick="localStorage.setItem('${STORAGE_JOINED}','1')">
          加入 ${CHANNEL_HANDLE}
        </a>
      </div>`;
  }
  window.renderTgChannelHomeCard = renderHomeCard;

  // ── 文章底部 CTA（給 article 頁面使用）──
  function buildArticleFooterCTA() {
    if (localStorage.getItem(STORAGE_JOINED)) return ''; // 已加入就不顯示
    return `
      <div class="tg-article-cta">
        <span class="tg-article-cta-icon">📢</span>
        <div class="tg-article-cta-text">
          <b>喜歡這篇？</b>
          <span>訂閱頻道每天收到新分析</span>
        </div>
        <a class="tg-article-cta-btn" href="${CHANNEL_URL}" target="_blank" rel="noopener" onclick="localStorage.setItem('${STORAGE_JOINED}','1')">
          ${CHANNEL_HANDLE} →
        </a>
      </div>`;
  }
  window.buildTgChannelArticleCTA = buildArticleFooterCTA;

  // ── 啟動 ──
  function _init() {
    renderHomeCard();
    // 等其他啟動流程跑完才考慮彈彈窗（10 秒延遲讓 spotlight 之類先彈）
    setTimeout(maybeShowPromoModal, 10000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_init, 1500));
  } else {
    setTimeout(_init, 1500);
  }
})();
