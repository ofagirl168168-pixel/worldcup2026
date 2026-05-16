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

  // ── 寶石直接抽（1 抽 50、10 連 450）──
  async function gachaWithGems(count, options) {
    if (!window.MyTeam || typeof currentUser === 'undefined' || !currentUser) {
      throw new Error('not logged in');
    }
    if (count !== 1 && count !== 10) throw new Error('INVALID_COUNT');
    const { data, error } = await window.DB.rpc('gacha_draw_with_gems', { p_count: count });
    if (error) throw error;
    await window.MyTeam.fetch();
    if (window.Gems && typeof window.Gems.refresh === 'function') {
      try { await window.Gems.refresh(); } catch (e) {}
    }
    await openGachaAnimation(data.cards, { ...options, forced_ssr: data.cards.some(c => c.forced_ssr) });
    return data;
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
      <div class="mt-gacha-beam" data-rarity="${peakRarity}" hidden></div>
      <div class="mt-gacha-rays" hidden></div>

      <!-- 直版固定寬度容器：所有元素以此為定位基準、寬螢幕兩側自然黑底 letterbox
           可避免 banner / cards-wrap / actions 在不同階段用不同 positioning 機制
           導致 X 軸視覺中心不一致的 jumping -->
      <div class="mt-gacha-stage-frame">

      <!-- Pack 包進 positioning wrapper：wrapper 負責 absolute top:50% left:50% 置中
           內部 pack 維持原本的 mt-pack-float 動畫不衝突 -->
      <div class="mt-gacha-pack-pos">
      <!-- Stage 0：紙袋包裝（Pokémon TCG Pocket 風）-->
      <div class="mt-gacha-pack" id="mt-gacha-pack" data-rarity="${peakRarity}" data-count="${cards.length}">
        <div class="mt-gacha-pack-banner">
          <div class="mt-gacha-pack-title">${escapeHtml(options.title || '🎰 球員召喚')}</div>
          ${options.subtitle ? `<div class="mt-gacha-pack-sub">${escapeHtml(options.subtitle)}</div>` : ''}
        </div>
        <div class="mt-gacha-pack-3d" id="mt-gacha-pack-3d">
          <div class="mt-gacha-pack-aurora"></div>
          <!-- 紙袋包裝（上半 + 下半 + 撕線）-->
          <div class="mt-gacha-pack-wrap" id="mt-gacha-pack-wrap">
            <div class="mt-gacha-pack-top">
              <!-- 單片：以撕方向反側的底角為支點、rotateX 翹起 + rotateY 朝玩家折 -->
              <div class="mt-gacha-pack-top-fold">
                <div class="mt-gacha-pack-logo">⚽</div>
                <div class="mt-gacha-pack-stripe"></div>
              </div>
            </div>
            <div class="mt-gacha-pack-perforation">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="mt-gacha-pack-bottom">
              <div class="mt-gacha-pack-label">DRAW PACK</div>
              <div class="mt-gacha-pack-count">${cards.length} CARDS</div>
            </div>
            <!-- 整包覆蓋的橫掃光（永遠在播）-->
            <div class="mt-gacha-pack-shine"></div>
          </div>
          <!-- 包裝內部、撕開後可見的卡背 -->
          <div class="mt-gacha-pack-inside">
            ${cards.length >= 5 ? '<div class="mt-gacha-pack-card mt-gacha-pack-card-3"></div>' : ''}
            ${cards.length >= 2 ? '<div class="mt-gacha-pack-card mt-gacha-pack-card-2"></div>' : ''}
            <div class="mt-gacha-pack-card mt-gacha-pack-card-1">
              <div class="mt-gacha-back-pattern"></div>
              <div class="mt-gacha-back-emblem">⚽</div>
            </div>
          </div>
          <div class="mt-gacha-pack-glow"></div>
          <div class="mt-gacha-pack-sparks" id="mt-gacha-pack-sparks"></div>
        </div>
        <div class="mt-gacha-pack-cta">
          <span class="mt-gacha-pack-finger mt-gacha-pack-finger-swipe">👈</span>
          <span>左右拖曳撕開包裝${cards.length > 1 ? `（${cards.length} 張）` : ''}</span>
          <span class="mt-gacha-pack-finger mt-gacha-pack-finger-swipe-r">👉</span>
        </div>
      </div>
      </div><!-- /.mt-gacha-pack-pos -->

      <!-- cards-wrap 直接放在 stage-frame 裡、跟 pack-pos 用一樣的 absolute 置中
           兩者用完全相同的 positioning 機制，pack 消失/cards 出現之間不會有
           sub-pixel 位移問題（之前 pack 是 flex-centered、cards 是 absolute
           top:50% left:50% translate(-50%,-50%) → 計算路徑不同會差 1-2px） -->
      <div class="mt-gacha-cards-wrap">
        <div class="mt-gacha-cards" id="mt-gacha-cards" data-count="${cards.length}" data-mode="${cards.length > 1 ? 'stack' : 'single'}"></div>
      </div>

      <div class="mt-gacha-stage" id="mt-gacha-stage" hidden>
        <button class="mt-gacha-skip" id="mt-gacha-skip" hidden type="button" aria-label="跳過">⏭ 跳過</button>
        <div class="mt-gacha-banner" id="mt-gacha-banner">
          <div class="mt-gacha-banner-title">${escapeHtml(options.title || '🎰 球員召喚')}</div>
          ${options.subtitle ? `<div class="mt-gacha-banner-sub">${escapeHtml(options.subtitle)}</div>` : ''}
        </div>
        <div class="mt-gacha-flip-prompt" id="mt-gacha-flip-prompt" hidden>
          <div class="mt-gacha-flip-hint">
            <span class="mt-gacha-pack-finger">👆</span>
            <span>點卡片翻開</span>
          </div>
        </div>
        ${cards.length > 1 ? `
          <button class="mt-gacha-flip-all-btn" id="mt-gacha-flip-all-btn" hidden type="button">
            ⏭ 一鍵翻全部
          </button>
        ` : ''}
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

      </div><!-- /.mt-gacha-stage-frame -->

      <div class="mt-gacha-flash" id="mt-gacha-flash"></div>
    `;
    document.body.appendChild(overlay);
    // 鎖 body scroll、避免 gacha 過程 scrollbar 出現/消失導致 stage-frame 偏移
    const _bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('open'));

    return new Promise(resolve => {
      let skipped = false;
      let resolved = false;
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        document.body.style.overflow = _bodyOverflow;   // 還原 body scroll
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 350);
        resolve();
      };

      const skipBtn = overlay.querySelector('#mt-gacha-skip');
      skipBtn.addEventListener('click', () => { skipped = true; });

      const pack    = overlay.querySelector('#mt-gacha-pack');
      const stage   = overlay.querySelector('#mt-gacha-stage');
      const beam    = overlay.querySelector('.mt-gacha-beam');
      const flipPrompt = overlay.querySelector('#mt-gacha-flip-prompt');
      // flipBtn 已改成純文字提示 .mt-gacha-flip-hint、不再 listen click
      // 一鍵翻全部 由 .mt-gacha-flip-all-btn 處理

      // ── Stage 0：神秘 hover 互動（3D 跟隨滑鼠 + 火花粒子）──
      const pack3D = overlay.querySelector('#mt-gacha-pack-3d');
      const sparks = overlay.querySelector('#mt-gacha-pack-sparks');
      let sparkTimer = null;

      function emitSpark(x, y) {
        const s = document.createElement('i');
        s.className = 'mt-gacha-spark';
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        s.style.setProperty('--sx', (x || 0) + 'px');
        s.style.setProperty('--sy', (y || 0) + 'px');
        s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        const hues = ['#f0c040', '#9b87f5', '#ff6b9d', '#5eead4'];
        s.style.background = hues[Math.floor(Math.random() * hues.length)];
        sparks.appendChild(s);
        setTimeout(() => s.remove(), 900);
      }

      pack.addEventListener('mouseenter', () => {
        pack.classList.add('hovering');
        // 火花持續噴
        if (sparkTimer) return;
        sparkTimer = setInterval(() => {
          const rect = pack3D.getBoundingClientRect();
          const px = rect.width * (0.3 + Math.random() * 0.4);
          const py = rect.height * (0.3 + Math.random() * 0.4);
          emitSpark(px, py);
        }, 90);
      });
      pack.addEventListener('mouseleave', () => {
        pack.classList.remove('hovering');
        if (sparkTimer) { clearInterval(sparkTimer); sparkTimer = null; }
        pack3D.style.transform = '';
      });
      pack.addEventListener('mousemove', (e) => {
        if (pack.classList.contains('dragging') || pack.classList.contains('opening')) return;
        const rect = pack3D.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        const rotY = dx * 18;
        const rotX = -dy * 18;
        pack3D.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });

      // Stage 0：拖曳撕開（滑鼠 / 觸控都支援）
      let dragging = false;
      let startX = 0;
      let direction = 0;   // -1=左拉、+1=右拉、0=未定
      const TEAR_THRESHOLD = 100;  // 拉超過 100px 就算撕開
      const wrap = overlay.querySelector('#mt-gacha-pack-wrap');

      function setProgress(p) {
        // p: 0 ~ 1
        pack3D.style.setProperty('--tear-progress', p);
      }

      function onDragStart(e) {
        if (pack.classList.contains('opening')) return;
        const pt = e.touches ? e.touches[0] : e;
        startX = pt.clientX;
        dragging = true;
        direction = 0;
        pack.classList.add('dragging');
        if (sparkTimer) { clearInterval(sparkTimer); sparkTimer = null; }
        e.preventDefault();
      }

      const perf = overlay.querySelector('.mt-gacha-pack-perforation');
      function onDragMove(e) {
        if (!dragging) return;
        const pt = e.touches ? e.touches[0] : e;
        const dx = pt.clientX - startX;
        if (direction === 0 && Math.abs(dx) > 8) {
          // 拖右 (dx > 0) 期望「右側被撕起」的效果
          // CSS 的 transform-origin 跟 rotateY 用 --tear-dir 鏡像，需要 dx>0 → dir=-1 才能對上
          direction = dx > 0 ? -1 : 1;
          if (perf) perf.dataset.dir = String(direction);
        }
        const progress = Math.min(1, Math.abs(dx) / TEAR_THRESHOLD);
        pack3D.style.setProperty('--tear-dir', direction);
        setProgress(progress);
        // 拉超過 50% 開始噴火花
        if (progress > 0.5 && Math.random() < 0.4) {
          const rect = pack3D.getBoundingClientRect();
          emitSpark(rect.width / 2, rect.height * 0.18);  // 從撕線位置噴
        }
        e.preventDefault();
      }

      function onDragEnd(e) {
        if (!dragging) return;
        dragging = false;
        pack.classList.remove('dragging');
        const pt = (e.changedTouches ? e.changedTouches[0] : e);
        const dx = pt ? pt.clientX - startX : 0;
        if (Math.abs(dx) >= TEAR_THRESHOLD) {
          // 撕開！
          pack.classList.add('opening');
          setProgress(1);
          // 爆一波火花
          for (let i = 0; i < 24; i++) {
            const rect = pack3D.getBoundingClientRect();
            emitSpark(rect.width / 2, rect.height / 2);
          }
          // 立刻顯示 stage + spawn 卡片（不等卡包頂飛走、要同時 happening）
          beam.hidden = false;
          stage.hidden = false;
          startStage1();
          // 卡片全部飛完後再淡出卡包
          const packFadeDelay = cards.length > 1 ? (1000 + cards.length * 180) : 1500;
          setTimeout(() => {
            pack.style.transition = 'opacity 1.2s ease-out';
            pack.style.opacity = '0';
            setTimeout(() => { pack.style.display = 'none'; }, 1300);
          }, packFadeDelay);
        } else {
          // 撕力不夠、snap back
          setProgress(0);
        }
      }

      pack.addEventListener('mousedown', onDragStart);
      pack.addEventListener('touchstart', onDragStart, { passive: false });
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('touchmove', onDragMove, { passive: false });
      document.addEventListener('mouseup', onDragEnd);
      document.addEventListener('touchend', onDragEnd);
      document.addEventListener('touchcancel', onDragEnd);

      let stackTopIdx = 0;   // 多抽 stack 模式中、當前最上面那張的 index
      let allRevealed = false;

      async function startStage1() {
        // 立刻建好卡片（pending 狀態）— 不等 beam / skip 等延遲、要跟卡包頂飛走同時發生
        const cardsEl = overlay.querySelector('#mt-gacha-cards');
        cardsEl.classList.add('mt-cards-fly-out');
        for (let i = 0; i < cards.length; i++) {
          const cardEl = _buildCard3D(cards[i], i);
          cardEl.dataset.cardIdx = i;
          cardEl.dataset.stackIdx = i;
          cardEl.classList.add('mt-card-pending');
          cardsEl.appendChild(cardEl);
          // 第一張在 120ms 後飛（卡包頂剛剛開始旋轉、撕線開口出現的當下）
          // 後續每張間隔 180ms
          setTimeout(() => cardEl.classList.remove('mt-card-pending'),
            120 + (skipped ? 0 : i * 180));
        }

        // skip 按鈕短延遲後出現（不阻塞）
        setTimeout(() => { skipBtn.hidden = false; }, skipped ? 0 : 250);

        // SSR / SR 特效：併發、不阻塞卡片飛出
        if (peakRarity === 'SSR' && !skipped) {
          setTimeout(() => {
            overlay.querySelector('#mt-gacha-flash').classList.add('mt-flash-active');
            overlay.querySelector('.mt-gacha-rays').hidden = false;
            stage.classList.add('mt-shake');
            setTimeout(() => stage.classList.remove('mt-shake'), 500);
          }, 700);
        } else if (peakRarity === 'SR' && !skipped) {
          setTimeout(() => stage.classList.add('mt-pulse-sr'), 400);
        }

        // 等所有卡片飛完
        await _sleep(skipped ? 0 : Math.min(3500, 700 + cards.length * 180));

        if (skipped) {
          revealAll(true);
          return;
        }

        bindCardClicks();
        const flipAllBtn = overlay.querySelector('#mt-gacha-flip-all-btn');
        if (flipAllBtn) flipAllBtn.hidden = false;
        flipPrompt.hidden = false;
      }

      function bindCardClicks() {
        overlay.querySelectorAll('.mt-gacha-card3d').forEach(el => {
          el.addEventListener('click', () => handleCardClick(el));
        });
      }

      function handleCardClick(el) {
        const idx = parseInt(el.dataset.cardIdx, 10);
        const c = cards[idx];
        if (cards.length === 1) {
          // 1 抽：直接翻、不需 stack
          if (!el.classList.contains('flipped')) {
            el.classList.add('flipped');
            _emitParticles(el, c.rarity, false);
            _animateCounts(el, c);
            flipPrompt.hidden = true;
            showCTAs();
          }
          return;
        }
        // 多抽 stack 模式：只有最上面那張可以翻
        const stackIdx = parseInt(el.dataset.stackIdx, 10);
        if (stackIdx !== stackTopIdx) return;     // 不是最上面、不理

        if (!el.classList.contains('flipped')) {
          // 第一次點：翻
          el.classList.add('flipped');
          _emitParticles(el, c.rarity, false);
          _animateCounts(el, c);
          flipPrompt.hidden = true;
        } else {
          // 翻過了再點：滑走、露出下一張
          advanceStack();
        }
      }

      function advanceStack() {
        const top = overlay.querySelector(`.mt-gacha-card3d[data-stack-idx="${stackTopIdx}"]`);
        if (top) top.classList.add('slid-off');
        stackTopIdx++;
        if (stackTopIdx >= cards.length) {
          allRevealed = true;
          setTimeout(showAllRevealedGrid, 500);
        }
      }

      // 全部翻完 → 把所有卡片排成 grid 展示（用 FLIP 技巧平滑過渡）
      // FLIP = First-Last-Invert-Play：先量舊位置 → 套新 layout → 反向 transform 拉回舊位置 → 移除 transform 動畫到新位置
      function showAllRevealedGrid() {
        const cardsEl = overlay.querySelector('#mt-gacha-cards');
        const cardEls = Array.from(cardsEl.querySelectorAll('.mt-gacha-card3d'));

        // 1. FIRST：量每張卡當前 viewport 位置（stack 狀態 / slid-off 狀態）
        const firstRects = cardEls.map(el => el.getBoundingClientRect());

        // 2. 套上 all-revealed 切到 grid layout（瞬間 teleport）
        cardEls.forEach(el => {
          el.classList.remove('slid-off');
          if (!el.classList.contains('flipped')) el.classList.add('flipped');
        });
        cardsEl.classList.add('all-revealed');

        // 3. LAST：量每張卡新 grid 位置
        const lastRects = cardEls.map(el => el.getBoundingClientRect());

        // 4. INVERT：對每張卡套 inverse transform 視覺上拉回原位
        // 注意：all-revealed CSS rule 有 transform:none !important、要用 setProperty 帶 important
        cardEls.forEach((el, i) => {
          const dx = firstRects[i].left - lastRects[i].left;
          const dy = firstRects[i].top - lastRects[i].top;
          el.style.setProperty('transition', 'none', 'important');
          el.style.setProperty('transform', `translate(${dx}px, ${dy}px)`, 'important');
        });

        // 5. PLAY：force reflow 後下一 frame 解除 transform、transition 平滑到 grid 位置
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            cardEls.forEach(el => {
              el.style.setProperty('transition', 'transform 0.6s cubic-bezier(0.34, 1.2, 0.64, 1)', 'important');
              el.style.setProperty('transform', 'translate(0px, 0px)', 'important');
            });
          });
        });

        // 動畫結束清理 inline style + 顯示 CTA
        setTimeout(() => {
          cardEls.forEach(el => {
            el.style.removeProperty('transition');
            el.style.removeProperty('transform');
          });
          showCTAs();
        }, 750);
      }

      function showCTAs() {
        skipBtn.hidden = true;
        const flipAllBtn = overlay.querySelector('#mt-gacha-flip-all-btn');
        if (flipAllBtn) flipAllBtn.hidden = true;
        overlay.querySelector('#mt-gacha-actions').hidden = false;
        overlay.querySelector('#mt-gacha-actions').classList.add('reveal');
        const hint = overlay.querySelector('#mt-gacha-rarity-hint');
        if (peakRarity === 'SSR') hint.innerHTML = '✨ <b>SSR</b> 召喚成功！';
        else if (peakRarity === 'SR') hint.innerHTML = '💜 <b>SR</b> 不錯！';
      }

      // 一鍵翻全部
      const flipAllBtn = overlay.querySelector('#mt-gacha-flip-all-btn');
      if (flipAllBtn) {
        flipAllBtn.addEventListener('click', () => revealAll(true));
      }
      // flip-hint 改成純提示文字、不再可點擊（一鍵翻全部由 #mt-gacha-flip-all-btn 處理）

      async function revealAll(instant) {
        flipPrompt.hidden = true;
        const flipAllBtn = overlay.querySelector('#mt-gacha-flip-all-btn');
        if (flipAllBtn) flipAllBtn.hidden = true;
        const cardEls = Array.from(overlay.querySelectorAll('.mt-gacha-card3d'));
        for (let i = 0; i < cardEls.length; i++) {
          const cardEl = cardEls[i];
          const c = cards[i];
          if (!cardEl.classList.contains('flipped')) {
            cardEl.classList.add('flipped');
            _emitParticles(cardEl, c.rarity, instant);
            // instant 模式（一鍵翻全部）也要設能力值、不能跳過、否則卡在 0
            if (instant) {
              cardEl.querySelectorAll('.mt-gacha-front-stats b[data-target]').forEach(el => {
                el.textContent = el.dataset.target;
              });
            } else {
              _animateCounts(cardEl, c);
            }
          }
          // 多抽：每張間隔連翻
          await _sleep(instant ? 0 : (c.rarity === 'SSR' ? 250 : 100));
        }
        stackTopIdx = cards.length;
        allRevealed = true;
        await _sleep(instant ? 0 : 300);
        // 多抽 → 展示所有卡 grid；1 抽 → 直接 CTA
        if (cards.length > 1) {
          showAllRevealedGrid();
        } else {
          showCTAs();
        }
      }

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

    const portraitImgId = `gacha-portrait-${card.card_id}-${Math.random().toString(36).slice(2,8)}`;
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
            <img id="${portraitImgId}" class="mt-gacha-front-portrait-img"
              src="${_portraitUrlFor(card.card_id, card.rarity)}"
              alt="${escapeHtml(card.name)}" loading="lazy" />
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

    // 非同步 render LPC portrait（如果有 look_data）
    if (card.look_data && window.LpcRenderer) {
      window.LpcRenderer.portrait(card.look_data).then(url => {
        const img = document.getElementById(portraitImgId);
        if (img && url) img.src = url;
      }).catch(e => console.warn('LPC gacha portrait failed:', e));
    }

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

  // Phase 2.1++++：PIPOYA 32×32 RPG character（高品質、有清楚臉孔 + 4 方向走路 sprite）
  // 卡片用 portrait (idle facing down)、比賽用 full sprite sheet 含走路動畫
  // 同一張卡的角色 = 同一個 PIPOYA 角色（hash 指派、卡片與比賽一致）
  function _portraitUrlFor(cardId, rarity) {
    if (!cardId) return 'img/portraits/default.png';
    return `img/portraits/${encodeURIComponent(cardId)}.png?v=5`;
  }
  function _spriteUrlFor(cardId) {
    if (!cardId) return null;
    return `img/sprites/${encodeURIComponent(cardId)}.png?v=5`;
  }
  window.MyTeamPortrait = _portraitUrlFor;
  window.MyTeamSprite = _spriteUrlFor;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 掛到 MyTeam
  if (window.MyTeam) {
    window.MyTeam.gacha = gacha;
    window.MyTeam.gachaWithGems = gachaWithGems;
    window.MyTeam.triggerInstantGacha = triggerInstantGacha;
    window.MyTeam.openGachaAnimation = openGachaAnimation;
  }
})();
