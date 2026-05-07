/* =============================================
   SHARE-CARD.JS — 通用分享卡片系統 v2（SVG 視覺強化）
   爽感事件觸發 → 彈出精緻 OG 卡 + LINE/複製/Web Share 按鈕
   推薦碼系統：URL ?ref=<voter_key>
   ============================================= */

(function () {
  'use strict';

  const STORAGE_VOTER_KEY = 'opinion_voter_key';
  const STORAGE_REFERRER = 'referrer_key';
  const STORAGE_REFERRAL_CLAIMED = 'referral_claimed_v1';
  const STORAGE_SEEN_PREFIX = 'share_seen_';

  // SVG 圖標庫（事件 → SVG 檔名）
  const EVENT_ICONS = {
    streak:    'a7-t-rex-skull',    // 連勝 → 倖存者
    predict:   'a4-magnifying-glass', // 預測 → 觀察家
    minority:  'a9-raven',           // 少數派 → 烏鴉/特立獨行
    firstVote: 'a8-lotus-flower',   // 首投 → 啟蒙
    challenge: 'a10-crown',          // 挑戰賽 → 王者
    psychic:   'a6-psychic-waves',   // 通用 → 預知
  };

  // ── URL ?ref → localStorage（首次造訪生效）
  (function captureRef() {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref');
      if (ref && /^v_[a-z0-9]{8,}$/i.test(ref)) {
        if (!localStorage.getItem(STORAGE_REFERRER)) {
          localStorage.setItem(STORAGE_REFERRER, ref);
          console.log('[share-card] referral captured:', ref);
        }
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

  // ── 推薦兌現
  async function claimReferralIfPending() {
    if (localStorage.getItem(STORAGE_REFERRAL_CLAIMED)) return;
    const referrer = localStorage.getItem(STORAGE_REFERRER);
    if (!referrer) return;
    const me = getVoterKey();
    if (referrer === me) return;
    if (!window.DB) return;
    try {
      const { data, error } = await window.DB.rpc('claim_referral', { referrer, referee: me });
      if (error) { console.warn('[referral] claim failed', error); return; }
      if (data === 'ok') {
        try { if (typeof awardGem === 'function') awardGem('referral_referee', me); } catch (e) {}
        if (typeof showToast === 'function') {
          showToast('🎁 朋友帶你來的！+5 💎 寶石入袋');
        }
      }
      localStorage.setItem(STORAGE_REFERRAL_CLAIMED, '1');
    } catch (e) { console.warn('[referral] err', e); }
  }
  window.claimReferralIfPending = claimReferralIfPending;

  // ── 通用分享卡彈窗
  // showShareCard({
  //   eventKey: 'streak-7',
  //   icon: 'streak' | 'predict' | 'minority' | 'firstVote' | 'challenge', // SVG icon key
  //   badge: '7'  (數字徽章，可選；通常 streak 用)
  //   title: '...',
  //   subtitle: '...',  (英文小標)
  //   bodyText: '...',  (主文，HTML 允許)
  //   reward: '+50 XP &nbsp;+1 💎' (可選)
  //   themeColor: '#ff6b35',
  //   shareText: '...',
  // })
  function showShareCard(opts) {
    if (!opts || !opts.eventKey) return;
    const seenKey = STORAGE_SEEN_PREFIX + opts.eventKey;
    if (localStorage.getItem(seenKey)) return;
    if (document.getElementById('share-card-overlay')) return;

    const voterKey = getVoterKey();
    const shareUrl = (opts.shareUrlBase || location.origin) + '?ref=' + encodeURIComponent(voterKey);
    const themeColor = opts.themeColor || '#f0c040';
    const iconFile = EVENT_ICONS[opts.icon] || EVENT_ICONS.psychic;
    const iconUrl = `/assets/personas/${iconFile}.svg`;

    const overlay = document.createElement('div');
    overlay.id = 'share-card-overlay';
    overlay.className = 'share-card-overlay';
    const previewLabel = opts.previewLabel || '📤 把這份成果分享給朋友';
    const variantClass = opts.variant ? ` variant-${opts.variant}` : '';
    overlay.innerHTML = `
      <div class="share-card-wrap">
        <div class="share-card-preview-label">${previewLabel}</div>
        <button class="share-card-close" aria-label="關閉">×</button>
        <div class="share-card share-card-v2${variantClass}" id="share-card-canvas" style="--theme:${themeColor}">
          <div class="sc-preview-tag">PREVIEW</div>
          <div class="sc-bg-glow"></div>
          <div class="sc-bg-rays"></div>
          <div class="sc-corner sc-corner-tl"></div>
          <div class="sc-corner sc-corner-tr"></div>
          <div class="sc-corner sc-corner-bl"></div>
          <div class="sc-corner sc-corner-br"></div>
          <div class="sc-brand-row">
            <img src="/img/logo-soccermaddy.png" alt="" class="sc-brand-logo">
            <div class="sc-brand-stack">
              <div class="sc-brand-name">Soccer麥迪</div>
              <div class="sc-brand-sub">${opts.subtitle || 'MADDY ARENA'}</div>
            </div>
          </div>
          ${opts.imagesHtml ? `<div class="sc-images">${opts.imagesHtml}</div>` : `
          <div class="sc-icon-wrap">
            <div class="sc-icon-ring"></div>
            <img src="${iconUrl}" alt="" class="sc-icon">
            ${opts.badge ? `<div class="sc-icon-badge">${opts.badge}</div>` : ''}
          </div>`}
          <div class="sc-title">${opts.title || ''}</div>
          ${opts.bodyText ? `<div class="sc-body">${opts.bodyText}</div>` : ''}
          ${opts.reward ? `<div class="sc-reward">${opts.reward}</div>` : ''}
          <div class="sc-footer">
            <div class="sc-divider"></div>
            <div class="sc-footer-row">
              <div class="sc-url">soccermaddy · 麥迪擂台</div>
              <div class="sc-cta">→ 加入挑戰</div>
            </div>
          </div>
        </div>
        <div class="share-card-arrow">↓</div>
        <div class="share-card-actions">
          <div class="share-card-hint">分享後對方加入，雙方各拿 +5 💎</div>
          <div class="share-card-btns">
            <button class="sc-btn sc-btn-line" data-action="line">📲 LINE 分享</button>
            <button class="sc-btn sc-btn-tg" data-action="tg">✈️ Telegram</button>
            <button class="sc-btn sc-btn-copy" data-action="copy">🔗 複製連結</button>
            <button class="sc-btn sc-btn-png" data-action="png">🖼️ 存成圖片</button>
          </div>
          <button class="sc-btn-skip" data-action="skip">先不分享</button>
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
      } catch (e) {}
    });
    overlay.querySelector('[data-action="png"]').addEventListener('click', async () => {
      const card = document.getElementById('share-card-canvas');
      if (!card || typeof html2canvas !== 'function') {
        if (typeof showToast === 'function') showToast('⚠️ 存圖元件未載入');
        return;
      }
      // 截圖前先把 PREVIEW 浮水印隱藏，存完再恢復
      const tag = card.querySelector('.sc-preview-tag');
      if (tag) tag.style.display = 'none';
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2, useCORS: true });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `soccermaddy-${opts.eventKey}.png`;
        a.click();
      } catch (e) {
        if (typeof showToast === 'function') showToast('⚠️ 存圖失敗：' + e.message);
      } finally {
        if (tag) tag.style.display = '';
      }
    });

    return overlay;
  }
  window.showShareCard = showShareCard;

})();
