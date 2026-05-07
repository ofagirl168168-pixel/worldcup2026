/* =============================================
   SHARE-CARD.JS — 通用分享卡片系統
   爽感事件觸發 → 彈出 OG 卡 + LINE/複製/Web Share 按鈕
   推薦碼系統：URL ?ref=<voter_key> → 被邀請者完成首次擂台投票時雙方各 +5 寶石
   ============================================= */

(function () {
  'use strict';

  const STORAGE_VOTER_KEY = 'opinion_voter_key';
  const STORAGE_REFERRER = 'referrer_key';
  const STORAGE_REFERRAL_CLAIMED = 'referral_claimed_v1';
  const STORAGE_SEEN_PREFIX = 'share_seen_';      // +eventKey → 已彈過不再彈

  // ── 1. 從 URL 取推薦碼 ?ref=v_xxx → localStorage（首次造訪生效）
  (function captureRef() {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref');
      if (ref && /^v_[a-z0-9]{8,}$/i.test(ref)) {
        if (!localStorage.getItem(STORAGE_REFERRER)) {
          localStorage.setItem(STORAGE_REFERRER, ref);
          console.log('[share-card] referral captured:', ref);
        }
        // 清掉網址列上的 ?ref 避免分享出去帶到別人 voter_key
        url.searchParams.delete('ref');
        history.replaceState(null, '', url.toString());
      }
    } catch (e) {}
  })();

  function getVoterKey() {
    let k = localStorage.getItem(STORAGE_VOTER_KEY);
    if (!k) {
      k = 'v_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(STORAGE_VOTER_KEY, k);
    }
    return k;
  }

  // ── 2. 推薦兌現：被邀請者完成首次擂台投票 → 兩方各 +5 寶石
  async function claimReferralIfPending() {
    if (localStorage.getItem(STORAGE_REFERRAL_CLAIMED)) return;
    const referrer = localStorage.getItem(STORAGE_REFERRER);
    if (!referrer) return;
    const me = getVoterKey();
    if (referrer === me) return; // 同一台瀏覽器，不算
    if (!window.DB) return;
    try {
      const { data, error } = await window.DB.rpc('claim_referral', { referrer, referee: me });
      if (error) { console.warn('[referral] claim failed', error); return; }
      // 'ok' / 'duplicate' / 'self' / 'invalid'
      if (data === 'ok') {
        // 雙方各 +5 寶石（refree 由我這端發；referrer 的等他下次造訪由 server-side 統計補發 — 暫不做）
        try { if (typeof awardGem === 'function') awardGem('referral_referee', me); } catch (e) {}
        if (typeof showToast === 'function') {
          showToast('🎁 朋友帶你來的！+5 💎 寶石入袋');
        }
      }
      // 不論結果都標記已處理避免重複呼叫
      localStorage.setItem(STORAGE_REFERRAL_CLAIMED, '1');
    } catch (e) { console.warn('[referral] err', e); }
  }
  window.claimReferralIfPending = claimReferralIfPending;

  // ── 3. 通用分享卡彈窗 ──
  // showShareCard({
  //   eventKey: 'streak-7',         // 已彈過就不再彈（per-device localStorage flag）
  //   title: '🔥 連勝 7 天！',
  //   subtitle: '麥迪擂台 streak 7 days',
  //   bodyHtml: '<div>...</div>',    // 卡片中央內容（HTML）
  //   themeColor: '#f0c040',        // 卡片邊框 + 強調色
  //   shareText: '我在 Soccer麥迪 連勝 7 天 🔥 你敢挑戰嗎？',
  //   shareUrlBase: location.origin, // ?ref=<我的voter_key> 自動帶
  // })
  function showShareCard(opts) {
    if (!opts || !opts.eventKey) return;
    const seenKey = STORAGE_SEEN_PREFIX + opts.eventKey;
    if (localStorage.getItem(seenKey)) return;
    if (document.getElementById('share-card-overlay')) return; // 已經有一張開著

    const voterKey = getVoterKey();
    const shareUrl = (opts.shareUrlBase || location.origin) + '?ref=' + encodeURIComponent(voterKey);
    const themeColor = opts.themeColor || '#f0c040';

    const overlay = document.createElement('div');
    overlay.id = 'share-card-overlay';
    overlay.className = 'share-card-overlay';
    overlay.innerHTML = `
      <div class="share-card-wrap">
        <button class="share-card-close" aria-label="關閉">✕</button>
        <div class="share-card" id="share-card-canvas" style="--theme:${themeColor}">
          <div class="sc-brand">
            <img src="/img/logo-soccermaddy.png" alt="" class="sc-logo">
            <div class="sc-brand-text">
              <div class="sc-brand-name">Soccer麥迪</div>
              <div class="sc-brand-sub">足球情報站</div>
            </div>
          </div>
          <div class="sc-title">${opts.title || ''}</div>
          ${opts.subtitle ? `<div class="sc-subtitle">${opts.subtitle}</div>` : ''}
          <div class="sc-body">${opts.bodyHtml || ''}</div>
          <div class="sc-footer">
            <div class="sc-url">soccermaddy.app</div>
            <div class="sc-cta">點連結加入挑戰 →</div>
          </div>
        </div>
        <div class="share-card-actions">
          <div class="share-card-hint">📲 分享給朋友 — 對方加入後雙方都拿 +5 💎</div>
          <div class="share-card-btns">
            <button class="sc-btn sc-btn-line" data-action="line">📲 LINE 分享</button>
            <button class="sc-btn sc-btn-tg" data-action="tg">✈️ Telegram</button>
            <button class="sc-btn sc-btn-copy" data-action="copy">🔗 複製連結</button>
            <button class="sc-btn sc-btn-png" data-action="png">🖼️ 存圖</button>
          </div>
          <button class="sc-btn-skip" data-action="skip">先不要</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function close() {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      localStorage.setItem(seenKey, '1');
    }
    overlay.querySelector('.share-card-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('[data-action="skip"]').addEventListener('click', close);

    // LINE 分享：URL scheme（手機開 LINE app；桌機開 line.me web 分享）
    overlay.querySelector('[data-action="line"]').addEventListener('click', () => {
      const text = encodeURIComponent(`${opts.shareText || opts.title} ${shareUrl}`);
      window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank', 'noopener');
    });
    overlay.querySelector('[data-action="tg"]').addEventListener('click', () => {
      const text = encodeURIComponent(opts.shareText || opts.title || '');
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank', 'noopener');
    });
    overlay.querySelector('[data-action="copy"]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`${opts.shareText || opts.title} ${shareUrl}`);
        if (typeof showToast === 'function') showToast('🔗 連結已複製');
      } catch (e) { /* fallback */ }
    });
    overlay.querySelector('[data-action="png"]').addEventListener('click', async () => {
      const card = document.getElementById('share-card-canvas');
      if (!card || typeof html2canvas !== 'function') {
        if (typeof showToast === 'function') showToast('⚠️ 存圖元件未載入');
        return;
      }
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2, useCORS: true });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `soccermaddy-${opts.eventKey}.png`;
        a.click();
      } catch (e) {
        if (typeof showToast === 'function') showToast('⚠️ 存圖失敗：' + e.message);
      }
    });

    return overlay;
  }
  window.showShareCard = showShareCard;

})();
