/* my-team-gacha.js — 抽卡邏輯 + 動畫
 * 設計依據 docs/my-team-design.md §5.1-§5.6
 *
 * 對外：
 *   MyTeam.gacha(count, options) → 消耗抽券抽 count 張
 *   MyTeam.triggerInstantGacha(count, source) → §5.6 不耗抽券、給站外動作用
 *   MyTeam.openGachaAnimation(cards, options) → 跑抽卡動畫
 */
(function () {
  'use strict';

  // ── 呼叫 RPC ──
  async function _drawRPC(count, source, consumeTickets) {
    const { data, error } = await window.DB.rpc('gacha_draw', {
      p_count: count,
      p_source: source || 'manual',
      p_consume_tickets: consumeTickets !== false,
    });
    if (error) throw error;
    return data; // { cards: [...], pity_after, source, consumed }
  }

  // ── 消耗抽券抽（tab 內按「抽 1 抽 / 10 連」走這個）──
  async function gacha(count, options) {
    if (!window.MyTeam || typeof currentUser === 'undefined' || !currentUser) {
      throw new Error('not logged in');
    }
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') throw new Error('no team');
    if (team.tickets < count) throw new Error('insufficient tickets');

    const result = await _drawRPC(count, options?.source || 'gacha-tab', true);
    // 重撈 team 反映抽券扣除 + bond 變化
    await window.MyTeam.fetch();
    // 跑動畫
    await openGachaAnimation(result.cards, { ...options, forced_ssr: result.cards.some(c => c.forced_ssr) });
    return result;
  }

  // ── 即時觸發（§5.6）— 站外動作獎勵 → 不耗抽券直接抽 ──
  async function triggerInstantGacha(count, source) {
    // Feature flag：未啟用直接 skip（路人保護）
    if (typeof window.MyTeamBetaEnabled === 'function' && !window.MyTeamBetaEnabled()) {
      return null;
    }
    if (!window.MyTeam || typeof currentUser === 'undefined' || !currentUser) {
      console.log('[my-team] instant gacha skip — not logged in');
      return null;
    }
    const team = await window.MyTeam.fetch();
    if (!team || team === 'not_created') {
      // 沒建隊 → 存 pending、引導建隊
      _showPendingTicketToast(count, source);
      return null;
    }

    // ≤3 張 → 直接彈動畫；>3 → 進背包
    if (count > 3) {
      await window.MyTeam.awardTickets(count, source);
      if (typeof showToast === 'function') {
        showToast(`🎟️ +${count} 抽券（${source}）— 累積在背包，去 my-team 抽卡`);
      }
      return { granted: count, mode: 'inventory' };
    }

    // ≤3 張：直接跑 RPC 不耗 ticket
    try {
      const result = await _drawRPC(count, source, false);
      await window.MyTeam.fetch();
      await openGachaAnimation(result.cards, {
        title: '🎉 免費抽卡！',
        subtitle: _sourceLabel(source),
        ctaToHub: true,
      });
      return { granted: count, mode: 'instant', cards: result.cards };
    } catch (err) {
      console.error('[my-team] instant gacha error', err);
      // fallback：直接給抽券
      await window.MyTeam.awardTickets(count, source);
      return { granted: count, mode: 'inventory-fallback' };
    }
  }

  function _sourceLabel(source) {
    return ({
      'arena_vote':    '擂台投票首投獎勵',
      'daily_login':   '每日登入獎勵',
      'predict_5':     '完成 5 場預測獎勵',
      'predict_exact': '精準預測獎勵',
      'arena_comment': '擂台留言獎勵',
      'pending':       '排隊中抽券',
    })[source] || '免費抽卡';
  }

  // ── 沒建隊：存 pending 抽券到 localStorage、出 toast 邀請建隊 ──
  function _showPendingTicketToast(count, source) {
    try {
      const cur = parseInt(localStorage.getItem('mt_pending_gacha') || '0') || 0;
      localStorage.setItem('mt_pending_gacha', String(cur + count));
    } catch (e) {}
    const total = (parseInt(localStorage.getItem('mt_pending_gacha') || '0') || 0);
    if (typeof showToast === 'function') {
      showToast(`🎉 +${count} 免費抽券 — 建隊就能立刻抽！（累積 ${total}）`);
    }
    // 點 FAB 提示樣式：讓 FAB 紅點變強
    try {
      const badge = document.getElementById('mt-fab-badge');
      if (badge) {
        badge.textContent = '!';
        badge.hidden = false;
      }
    } catch (e) {}
  }
  // 公開給 modal 在 create() 完成後讀
  window._mtConsumePendingGacha = async function () {
    let pending = 0;
    try {
      pending = parseInt(localStorage.getItem('mt_pending_gacha') || '0') || 0;
      localStorage.removeItem('mt_pending_gacha');
    } catch (e) {}
    if (pending > 0) {
      // 等 modal 動畫關完再彈
      setTimeout(() => triggerInstantGacha(pending, 'pending').catch(() => {}), 300);
    }
  };

  // ── 抽卡動畫 ──
  async function openGachaAnimation(cards, options = {}) {
    if (!cards || !cards.length) return;
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'mt-gacha-overlay';
      const hasSSR = cards.some(c => c.rarity === 'SSR');
      const peakRarity = hasSSR ? 'SSR' : cards.some(c => c.rarity === 'SR') ? 'SR' : 'R';
      overlay.dataset.peak = peakRarity;
      overlay.innerHTML = `
        <div class="mt-gacha-stage">
          <div class="mt-gacha-loading" id="mt-gacha-loading">
            ${options.title ? `<div class="mt-gacha-banner-title">${escapeHtml(options.title)}</div>` : ''}
            ${options.subtitle ? `<div class="mt-gacha-banner-sub">${escapeHtml(options.subtitle)}</div>` : ''}
            <div class="mt-gacha-spinner">🎰</div>
            <div class="mt-gacha-spinner-text">抽卡中…</div>
          </div>
          <div class="mt-gacha-cards" id="mt-gacha-cards" hidden></div>
          <div class="mt-gacha-actions" id="mt-gacha-actions" hidden>
            ${options.ctaToHub ? `
              <button class="mt-gacha-btn mt-gacha-btn-primary" data-cta="hub">進入我的球隊 →</button>
              <button class="mt-gacha-btn mt-gacha-btn-secondary" data-cta="close">收進球隊</button>
            ` : `
              <button class="mt-gacha-btn mt-gacha-btn-primary" data-cta="close">確認收下</button>
            `}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('open'));

      const cleanup = () => {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 350);
        resolve();
      };

      // 1.5s 洗卡 → 顯示卡片
      setTimeout(() => {
        overlay.querySelector('#mt-gacha-loading').hidden = true;
        const cardsEl = overlay.querySelector('#mt-gacha-cards');
        cardsEl.hidden = false;
        cards.forEach((c, idx) => {
          const card = _buildCardEl(c, idx, cards.length);
          cardsEl.appendChild(card);
        });
        // 全部 reveal 完才顯示 action
        const total = cards.length;
        const lastDelay = (total - 1) * 250 + 600; // 對應 CSS animation
        setTimeout(() => {
          overlay.querySelector('#mt-gacha-actions').hidden = false;
        }, lastDelay);
      }, 1500);

      // 按鈕
      overlay.addEventListener('click', e => {
        const cta = e.target.dataset?.cta;
        if (!cta) return;
        if (cta === 'hub') {
          cleanup();
          if (typeof window.openMyTeamModal === 'function') window.openMyTeamModal();
        } else if (cta === 'close') {
          cleanup();
        }
      });
    });
  }

  function _buildCardEl(card, idx, total) {
    const el = document.createElement('div');
    el.className = `mt-gacha-card rarity-${card.rarity}`;
    el.style.animationDelay = `${idx * 250}ms`;
    const dup = card.is_duplicate ? '<div class="mt-gacha-dup">重複 → ★+1</div>' : '';
    const talentMap = {
      speedster: '⚡ 速度型',
      bodybuilder: '💪 力量型',
      shooter: '🎯 射手型',
      wall: '🛡️ 城牆型',
      magician: '✨ 魔法型',
    };
    const talent = card.talent ? `<div class="mt-gacha-talent">${talentMap[card.talent] || card.talent}</div>` : '';
    const force = card.forced_ssr ? '<div class="mt-gacha-pity">🎊 保底必中！</div>' : '';
    el.innerHTML = `
      <div class="mt-gacha-card-glow"></div>
      <div class="mt-gacha-card-rarity-badge">${card.rarity}</div>
      <div class="mt-gacha-card-emoji">${_emojiFor(card.position)}</div>
      <div class="mt-gacha-card-name">${escapeHtml(card.name)}</div>
      ${card.nickname ? `<div class="mt-gacha-card-nick">${escapeHtml(card.nickname)}</div>` : ''}
      <div class="mt-gacha-card-pos">${card.position}</div>
      <div class="mt-gacha-card-stats">
        <div>攻 <b>${card.attack}</b></div>
        <div>防 <b>${card.defense}</b></div>
        <div>速 <b>${card.speed}</b></div>
        <div>中 <b>${card.midfield}</b></div>
        <div>體 <b>${card.stamina}</b></div>
        <div>環 <b>${card.aura}</b></div>
      </div>
      ${talent}
      ${dup}
      ${force}
    `;
    return el;
  }

  function _emojiFor(pos) {
    return ({ GK: '🧤', DEF: '🛡️', MID: '⚙️', FWD: '⚽' })[pos] || '⚽';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 掛到 MyTeam
  if (window.MyTeam) {
    window.MyTeam.gacha = gacha;
    window.MyTeam.triggerInstantGacha = triggerInstantGacha;
    window.MyTeam.openGachaAnimation = openGachaAnimation;
  }
})();
