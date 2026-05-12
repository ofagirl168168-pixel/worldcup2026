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

  // ── 即時觸發（§5.6）— 站外動作獎勵 → 直接彈抽卡動畫 ──
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
      // 沒建隊 → 客戶端預覽抽卡 → 動畫秀卡 → 存 localStorage → 建隊後收下卡
      return await _previewGachaForOnboarding(count, source);
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

  // ── 沒建隊：客戶端預覽抽卡 → 動畫立刻彈 → 存卡 ID 等建隊後收下 ──
  async function _previewGachaForOnboarding(count, source) {
    const pool = await window.MyTeam.fetchCardPool();
    if (!pool.length) return null;

    const cards = [];
    for (let i = 0; i < count; i++) {
      cards.push(_clientPickCard(pool));
    }

    // 存卡片 ID 到 localStorage（建隊後 _mtConsumePreviewCards 會收進球員列表）
    try {
      const existing = JSON.parse(localStorage.getItem('mt_preview_cards') || '[]');
      const newCardIds = cards.map(c => c.card_id);
      localStorage.setItem('mt_preview_cards', JSON.stringify([...existing, ...newCardIds]));
    } catch (e) {}

    // 跑抽卡動畫（CTA = 引導建隊）
    await openGachaAnimation(cards, {
      title: '🎉 ' + _sourceLabel(source),
      subtitle: '建隊就能收下這張卡！',
      ctaCreateTeam: true,
    });
    return { granted: count, mode: 'preview', cards };
  }

  // 客戶端依稀有度權重抽 1 張卡（沒建隊時用）
  function _clientPickCard(pool) {
    const roll = Math.random() * 100;
    let rarity;
    if (roll < 5) rarity = 'SSR';
    else if (roll < 25) rarity = 'SR';
    else rarity = 'R';
    const candidates = pool.filter(c => c.rarity === rarity);
    const card = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      card_id:      card.card_id,
      rarity:       card.rarity,
      name:         card.name,
      nickname:     card.nickname,
      position:     card.position,
      attack:       card.base_attack,
      defense:      card.base_defense,
      speed:        card.base_speed,
      midfield:     card.base_midfield,
      stamina:      card.base_stamina,
      aura:         card.base_aura,
      talent:       card.talent,
      illustration: card.illustration,
      is_duplicate: false,
      forced_ssr:   false,
    };
  }

  // 公開：建隊完成後 modal 呼叫 → 把 preview 卡收進 team_player
  window._mtConsumePreviewCards = async function () {
    let cardIds = [];
    try { cardIds = JSON.parse(localStorage.getItem('mt_preview_cards') || '[]'); }
    catch (e) {}
    if (!cardIds.length) return 0;
    try { localStorage.removeItem('mt_preview_cards'); } catch (e) {}

    const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
    if (!uid) return 0;

    // 拿這幾張卡的完整資料
    const { data: cards, error: pErr } = await window.DB
      .from('player_card_pool').select('*').in('card_id', cardIds);
    if (pErr || !cards || !cards.length) return 0;

    // 已擁有的不重複 insert（同卡 bond++）
    const { data: existing } = await window.DB
      .from('team_player').select('id, card_id, bond')
      .eq('team_user_id', uid)
      .in('card_id', cardIds);
    const existingMap = new Map((existing || []).map(p => [p.card_id, p]));

    const newInserts = [];
    const bondUpdates = [];
    for (const cardId of cardIds) {
      const card = cards.find(c => c.card_id === cardId);
      if (!card) continue;
      const ex = existingMap.get(cardId);
      if (ex) {
        if (ex.bond < 5) bondUpdates.push(ex);
      } else {
        newInserts.push({
          team_user_id: uid,
          card_id: card.card_id,
          current_attack: card.base_attack,
          current_defense: card.base_defense,
          current_speed: card.base_speed,
          current_midfield: card.base_midfield,
          current_stamina: card.base_stamina,
          current_aura: card.base_aura,
        });
      }
    }
    if (newInserts.length) {
      await window.DB.from('team_player').insert(newInserts);
    }
    for (const ex of bondUpdates) {
      await window.DB.from('team_player').update({ bond: ex.bond + 1 }).eq('id', ex.id);
    }
    // 重撈 my_team 反映變化
    await window.MyTeam.fetch();
    if (typeof showToast === 'function') {
      showToast(`🎁 已收下 ${cardIds.length} 張球員卡到球隊！`);
    }
    return cardIds.length;
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
            ${options.ctaCreateTeam ? `
              <button class="mt-gacha-btn mt-gacha-btn-primary" data-cta="create">🎯 建隊收下這張卡 →</button>
              <button class="mt-gacha-btn mt-gacha-btn-secondary" data-cta="close">稍後再說</button>
            ` : options.ctaToHub ? `
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
        if (cta === 'create' || cta === 'hub') {
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
