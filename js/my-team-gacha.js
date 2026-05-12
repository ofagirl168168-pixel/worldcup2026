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

  // ════════════════════════════════════════════════
  // 抽卡動畫 v2（2026-05-12 polish）
  // 多階段：星空 → banner → 光柱 build-up → 卡背飛入 → 翻牌 →
  //         粒子爆發 → SSR 螢幕閃白 + 微震動 → 屬性 count-up → CTA
  // ════════════════════════════════════════════════
  const _sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function openGachaAnimation(cards, options = {}) {
    if (!cards || !cards.length) return;

    const hasSSR = cards.some(c => c.rarity === 'SSR');
    const hasSR  = cards.some(c => c.rarity === 'SR');
    const peakRarity = hasSSR ? 'SSR' : hasSR ? 'SR' : 'R';

    const overlay = document.createElement('div');
    overlay.className = 'mt-gacha-overlay';
    overlay.dataset.peak = peakRarity;
    overlay.innerHTML = `
      <div class="mt-gacha-stars"></div>
      <div class="mt-gacha-beam" data-rarity="${peakRarity}"></div>
      <div class="mt-gacha-rays" hidden></div>
      <div class="mt-gacha-stage">
        <button class="mt-gacha-skip" id="mt-gacha-skip" hidden type="button" aria-label="跳過">⏭ 跳過</button>
        <div class="mt-gacha-banner" id="mt-gacha-banner">
          <div class="mt-gacha-banner-title">${escapeHtml(options.title || '🎰 球員召喚')}</div>
          ${options.subtitle ? `<div class="mt-gacha-banner-sub">${escapeHtml(options.subtitle)}</div>` : ''}
        </div>
        <div class="mt-gacha-cards-wrap">
          <div class="mt-gacha-cards" id="mt-gacha-cards"></div>
        </div>
        <div class="mt-gacha-rarity-hint" id="mt-gacha-rarity-hint"></div>
        <div class="mt-gacha-actions" id="mt-gacha-actions" hidden>
          ${options.ctaCreateTeam ? `
            <button class="mt-gacha-btn mt-gacha-btn-primary" data-cta="create">🎯 建隊收下這張卡</button>
            <button class="mt-gacha-btn mt-gacha-btn-secondary" data-cta="close">稍後再說</button>
          ` : options.ctaToHub ? `
            <button class="mt-gacha-btn mt-gacha-btn-primary" data-cta="hub">進入我的球隊 →</button>
            <button class="mt-gacha-btn mt-gacha-btn-secondary" data-cta="close">收進球隊</button>
          ` : `
            <button class="mt-gacha-btn mt-gacha-btn-primary" data-cta="close">確認收下</button>
          `}
        </div>
      </div>
      <div class="mt-gacha-flash" id="mt-gacha-flash"></div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    return new Promise(resolve => {
      let skipped = false;
      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 350);
        resolve();
      };

      const skipBtn = overlay.querySelector('#mt-gacha-skip');
      skipBtn.addEventListener('click', () => { skipped = true; });

      // Stage 1: build-up（200ms - 1400ms）
      (async () => {
        // 200ms 後顯示 skip
        await _sleep(skipped ? 0 : 250);
        skipBtn.hidden = false;

        // 1100ms 等光柱漲起來
        await _sleep(skipped ? 0 : 950);

        // SSR：螢幕閃白 + 微震動 + 光線爆發
        if (peakRarity === 'SSR' && !skipped) {
          overlay.querySelector('#mt-gacha-flash').classList.add('mt-flash-active');
          overlay.querySelector('.mt-gacha-rays').hidden = false;
          overlay.querySelector('.mt-gacha-stage').classList.add('mt-shake');
          await _sleep(skipped ? 0 : 500);
          overlay.querySelector('.mt-gacha-stage').classList.remove('mt-shake');
        } else if (peakRarity === 'SR' && !skipped) {
          overlay.querySelector('.mt-gacha-stage').classList.add('mt-pulse-sr');
          await _sleep(skipped ? 0 : 250);
        }

        // Stage 2: 卡背飛入 + 翻牌 reveal
        const cardsEl = overlay.querySelector('#mt-gacha-cards');
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          const cardEl = _buildCard3D(c, i);
          cardsEl.appendChild(cardEl);
          // 等卡背飛入完成
          await _sleep(skipped ? 0 : 350);
          // 翻牌
          cardEl.classList.add('flipped');
          // 觸發粒子（SSR=多 + 金、SR=中 + 紫、R=少 + 銀）
          _emitParticles(cardEl, c.rarity, skipped);
          // count-up 屬性數字
          if (!skipped) _animateCounts(cardEl, c);
          // 卡間隔
          await _sleep(skipped ? 0 : (c.rarity === 'SSR' ? 900 : 500));
        }

        // 顯示 CTA
        await _sleep(skipped ? 0 : 400);
        skipBtn.hidden = true;
        overlay.querySelector('#mt-gacha-actions').hidden = false;
        overlay.querySelector('#mt-gacha-actions').classList.add('reveal');
        const hint = overlay.querySelector('#mt-gacha-rarity-hint');
        if (peakRarity === 'SSR') hint.innerHTML = '✨ <b>SSR</b> 召喚成功！';
        else if (peakRarity === 'SR') hint.innerHTML = '💜 <b>SR</b> 不錯！';
      })();

      // 按鈕：用 delegation
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

  // 3D 卡片元素：含卡背 + 卡面、翻牌 by adding .flipped
  function _buildCard3D(card, idx) {
    const el = document.createElement('div');
    el.className = `mt-gacha-card3d rarity-${card.rarity}`;
    el.style.animationDelay = `${idx * 60}ms`;
    const talentMap = {
      speedster:   '⚡ 速度型',
      bodybuilder: '💪 力量型',
      shooter:     '🎯 射手型',
      wall:        '🛡️ 城牆型',
      magician:    '✨ 魔法型',
    };
    const talent = card.talent ? `<div class="mt-gacha-talent">${talentMap[card.talent] || card.talent}</div>` : '';
    const dup = card.is_duplicate ? '<div class="mt-gacha-dup">重複 → ★+1</div>' : '';
    const force = card.forced_ssr ? '<div class="mt-gacha-pity">🎊 保底必中！</div>' : '';
    const stars = ({ R: '★', SR: '★★', SSR: '★★★' })[card.rarity];

    el.innerHTML = `
      <div class="mt-gacha-card3d-inner">
        <div class="mt-gacha-card3d-back">
          <div class="mt-gacha-back-pattern"></div>
          <div class="mt-gacha-back-emblem">⚽</div>
        </div>
        <div class="mt-gacha-card3d-front">
          <div class="mt-gacha-front-shine"></div>
          <div class="mt-gacha-front-rarity">
            <span class="mt-gacha-front-rarity-badge">${card.rarity}</span>
            <span class="mt-gacha-front-stars">${stars}</span>
          </div>
          <div class="mt-gacha-front-portrait">
            <span class="mt-gacha-front-portrait-emoji">${_portraitFor(card.card_id)}</span>
            <span class="mt-gacha-front-portrait-pos">${_emojiFor(card.position)}</span>
          </div>
          <div class="mt-gacha-front-name">${escapeHtml(card.name)}</div>
          ${card.nickname ? `<div class="mt-gacha-front-nick">${escapeHtml(card.nickname)}</div>` : ''}
          <div class="mt-gacha-front-pos">${card.position}</div>
          <div class="mt-gacha-front-stats">
            <div>攻 <b data-target="${card.attack}">0</b></div>
            <div>防 <b data-target="${card.defense}">0</b></div>
            <div>速 <b data-target="${card.speed}">0</b></div>
            <div>中 <b data-target="${card.midfield}">0</b></div>
            <div>體 <b data-target="${card.stamina}">0</b></div>
            <div>環 <b data-target="${card.aura}">0</b></div>
          </div>
          ${talent}
          ${dup}
          ${force}
        </div>
      </div>
      <div class="mt-gacha-particles"></div>
    `;
    return el;
  }

  // 粒子爆發
  function _emitParticles(cardEl, rarity, skipped) {
    if (skipped) return;
    const container = cardEl.querySelector('.mt-gacha-particles');
    if (!container) return;
    const count = ({ R: 8, SR: 14, SSR: 24 })[rarity] || 8;
    const color = ({ R: '#bcd', SR: '#9b87f5', SSR: '#f0c040' })[rarity];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
      const dist = 60 + Math.random() * 80;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.style.setProperty('--pdx', dx + 'px');
      p.style.setProperty('--pdy', dy + 'px');
      p.style.background = color;
      p.style.animationDelay = (i * 8) + 'ms';
      container.appendChild(p);
    }
    // 0.9s 後移除避免堆積
    setTimeout(() => { container.innerHTML = ''; }, 900);
  }

  // 屬性數字 count-up（400ms）
  function _animateCounts(cardEl, card) {
    cardEl.querySelectorAll('.mt-gacha-front-stats b[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target) || 0;
      const duration = 400;
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / duration);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    });
  }

  function _emojiFor(pos) {
    return ({ GK: '🧤', DEF: '🛡️', MID: '⚙️', FWD: '⚽' })[pos] || '⚽';
  }

  // 12 種人物 emoji 池，依 card_id 穩定 hash 指派
  // Phase 2 換成等距 pixel art sprite 時再退役
  const PORTRAIT_POOL = [
    '👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿',
    '👨🏻‍🦱', '👨🏽‍🦱', '👨🏾‍🦲',
    '👨🏼‍🦳', '🏃🏻', '🏃🏽', '🏃🏾',
  ];
  function _portraitFor(cardId) {
    if (!cardId) return '👤';
    let h = 0;
    for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) >>> 0;
    return PORTRAIT_POOL[h % PORTRAIT_POOL.length];
  }
  window.MyTeamPortrait = _portraitFor;  // 公開讓 modal 也能用

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
