/* my-team-modal.js — 我的球隊 主 modal
 * 決定顯示 onboarding 或 hub，根據 my_team 狀態
 *
 * 公開：
 *   window.openMyTeamModal()  — FAB 點擊呼叫
 *   window.closeMyTeamModal() — modal X 關閉
 */
(function () {
  'use strict';

  const CREST_OPTIONS = [
    '⚽','🏆','🔥','⚡','💎','🦅',
    '🐺','🐉','🦁','🐯','🐻','🦊',
    '⭐','🌟','🚀','🛡️','⚔️','👑',
  ];

  let _overlay = null;
  let _currentTab = 'roster';

  // ── 建 overlay shell ──
  function ensureOverlay() {
    if (_overlay) return _overlay;
    _overlay = document.createElement('div');
    _overlay.className = 'mt-modal-overlay';
    _overlay.innerHTML = `
      <div class="mt-modal">
        <button class="mt-modal-close" type="button" aria-label="關閉">×</button>
        <div class="mt-modal-body" id="mt-modal-body"></div>
      </div>
    `;
    _overlay.querySelector('.mt-modal-close').addEventListener('click', close);
    _overlay.addEventListener('click', (e) => {
      if (e.target === _overlay) close();
    });
    document.body.appendChild(_overlay);
    return _overlay;
  }

  async function open() {
    if (typeof currentUser === 'undefined' || !currentUser) {
      if (typeof showToast === 'function') showToast('🔐 請先登入');
      return;
    }
    ensureOverlay();
    _overlay.style.display = 'flex';
    requestAnimationFrame(() => _overlay.classList.add('open'));

    // 撈 my_team 決定渲染 onboarding 還是 hub
    const team = await window.MyTeam.fetch();
    if (team === 'not_created' || !team) {
      renderOnboarding();
    } else {
      renderHub();
    }
  }

  function close() {
    if (!_overlay) return;
    _overlay.classList.remove('open');
    setTimeout(() => {
      _overlay.style.display = 'none';
    }, 250);
  }

  // ── Onboarding：建隊 ──
  function renderOnboarding() {
    const body = _overlay.querySelector('#mt-modal-body');

    // 檢查 localStorage 有沒有 preview 卡（投擂台後預覽到的、等領）
    let pendingCards = [];
    try { pendingCards = JSON.parse(localStorage.getItem('mt_preview_cards') || '[]'); }
    catch (e) {}
    const pendingHint = pendingCards.length > 0
      ? `<div class="mt-onboard-pending">🎁 你有 <b>${pendingCards.length}</b> 張等領取的球員卡（建隊後自動收進球隊）</div>`
      : '';

    body.innerHTML = `
      <div class="mt-onboard">
        <!-- 動態 hero 區 -->
        <div class="mt-onboard-hero">
          <div class="mt-onboard-hero-stars"></div>
          <div class="mt-onboard-hero-card" id="mt-onboard-preview">
            <div class="mt-onboard-hero-crest" id="mt-onboard-preview-crest">⚽</div>
            <div class="mt-onboard-hero-name" id="mt-onboard-preview-name">你的球隊</div>
          </div>
        </div>

        <div class="mt-onboard-title">🎉 歡迎加入麥迪聯盟</div>
        <div class="mt-onboard-sub">
          取個隊名 + 選個隊徽就能開始<br>
          抽 SSR 球員、訓練、打 10 階聯賽
        </div>
        ${pendingHint}

        <div class="mt-onboard-section">
          <div class="mt-onboard-label">🏷️ 隊名（最多 24 字）</div>
          <input class="mt-onboard-input" id="mt-onboard-name" maxlength="24" placeholder="例：麥迪聯隊" autocomplete="off" />
        </div>

        <div class="mt-onboard-section">
          <div class="mt-onboard-label">🛡️ 隊徽</div>
          <div class="mt-crest-grid" id="mt-crest-grid"></div>
        </div>

        <div class="mt-onboard-perks">
          <div class="mt-onboard-perk">🎟️ <b>5</b> 抽券</div>
          <div class="mt-onboard-perk">⚡ <b>5</b> 體力</div>
          <div class="mt-onboard-perk">🏆 Tier <b>1</b> 起跑</div>
        </div>

        <button class="mt-onboard-submit" id="mt-onboard-submit" disabled>
          <span class="mt-onboard-submit-text">建立球隊</span>
          <span class="mt-onboard-submit-arrow">→</span>
        </button>
        <div class="mt-onboard-gift">建隊立刻可抽 5 連、保底 SR 起步</div>
      </div>
    `;

    const previewCrest = body.querySelector('#mt-onboard-preview-crest');
    const previewName = body.querySelector('#mt-onboard-preview-name');

    // 隊徽選擇 → 同步預覽
    const grid = body.querySelector('#mt-crest-grid');
    let selectedCrest = '⚽';
    CREST_OPTIONS.forEach((emoji, i) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mt-crest-cell' + (i === 0 ? ' sel' : '');
      cell.textContent = emoji;
      cell.addEventListener('click', () => {
        grid.querySelectorAll('.mt-crest-cell').forEach(c => c.classList.remove('sel'));
        cell.classList.add('sel');
        selectedCrest = emoji;
        previewCrest.textContent = emoji;
        previewCrest.classList.remove('mt-pulse-once');
        void previewCrest.offsetWidth; // restart animation
        previewCrest.classList.add('mt-pulse-once');
      });
      grid.appendChild(cell);
    });

    // 名字 / submit 啟用 + 同步預覽
    const nameInput = body.querySelector('#mt-onboard-name');
    const submitBtn = body.querySelector('#mt-onboard-submit');
    const refreshSubmit = () => {
      const name = (nameInput.value || '').trim();
      submitBtn.disabled = !name;
      previewName.textContent = name || '你的球隊';
    };
    nameInput.addEventListener('input', refreshSubmit);
    refreshSubmit();

    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = '建立中…';
      try {
        await window.MyTeam.create(nameInput.value, selectedCrest);
        // 收下投擂台時預覽到的卡（自然流程）
        if (typeof window._mtConsumePreviewCards === 'function') {
          await window._mtConsumePreviewCards();
        }
        // 切換到 hub
        renderHub();
        if (typeof showToast === 'function') {
          showToast(`🎉 球隊「${nameInput.value.trim()}」建立成功！5 張抽券已送`);
        }
      } catch (err) {
        console.error('[my-team] create error', err);
        alert('建隊失敗：' + (err.message || err));
        submitBtn.disabled = false;
        submitBtn.textContent = '建立球隊';
      }
    });
  }

  // ── Hub：球隊管理主畫面 ──
  function renderHub() {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') return renderOnboarding();

    const body = _overlay.querySelector('#mt-modal-body');
    body.innerHTML = `
      <div class="mt-hub-header">
        <div class="mt-hub-team">
          <div class="mt-hub-team-crest">${team.team_crest || '⚽'}</div>
          <div class="mt-hub-team-info">
            <div class="mt-hub-team-name">${escapeHtml(team.team_name)}</div>
            <div class="mt-hub-team-meta">Lv.${team.stadium_level} 球場 · ${team.fans} 球迷</div>
          </div>
        </div>
        <div class="mt-hub-stats">
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">🎟️</div>
            <div class="mt-hub-stat-val">${team.tickets || 0}</div>
            <div class="mt-hub-stat-label">抽券</div>
          </div>
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">⚡</div>
            <div class="mt-hub-stat-val">${team.stamina || 0}/${team.stamina_max || 5}</div>
            <div class="mt-hub-stat-label">體力</div>
          </div>
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">⭐</div>
            <div class="mt-hub-stat-val">${team.ssr_select_tickets || 0}</div>
            <div class="mt-hub-stat-label">SSR券</div>
          </div>
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">💎</div>
            <div class="mt-hub-stat-val" id="mt-hub-gem">—</div>
            <div class="mt-hub-stat-label">寶石</div>
          </div>
        </div>
      </div>
      <div class="mt-hub-tabs">
        <button class="mt-hub-tab ${_currentTab === 'roster' ? 'active' : ''}" data-tab="roster">球員</button>
        <button class="mt-hub-tab ${_currentTab === 'gacha' ? 'active' : ''}" data-tab="gacha">抽卡</button>
        <button class="mt-hub-tab ${_currentTab === 'match' ? 'active' : ''}" data-tab="match">比賽</button>
        <button class="mt-hub-tab ${_currentTab === 'train' ? 'active' : ''}" data-tab="train">訓練</button>
      </div>
      <div class="mt-hub-content" id="mt-hub-content"></div>
    `;

    // 撈寶石（用既有 gems.js）
    if (typeof window.fetchGemBalance === 'function') {
      window.fetchGemBalance().then(balance => {
        const el = body.querySelector('#mt-hub-gem');
        if (el) el.textContent = balance != null ? balance : '—';
      });
    }

    // tab 切換
    body.querySelectorAll('.mt-hub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _currentTab = btn.dataset.tab;
        body.querySelectorAll('.mt-hub-tab').forEach(b => b.classList.toggle('active', b === btn));
        renderTab();
      });
    });

    renderTab();
  }

  function renderTab() {
    const content = _overlay.querySelector('#mt-hub-content');
    if (!content) return;
    switch (_currentTab) {
      case 'roster': return renderRosterTab(content);
      case 'gacha':  return renderGachaTab(content);
      case 'match':  return renderMatchTab(content);
      case 'train':  return renderTrainTab(content);
    }
  }

  async function renderRosterTab(content) {
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入球員中…</div>';
    const players = await window.MyTeam.fetchPlayers();
    if (!players.length) {
      content.innerHTML = `
        <div class="mt-roster-empty">
          <div class="mt-roster-empty-icon">📭</div>
          <div>還沒有球員！</div>
          <div style="font-size:12px;margin:8px 0 16px;opacity:0.7">用抽券抽幾張卡組隊吧</div>
          <button class="mt-roster-empty-cta" data-go-gacha>🎰 去抽卡</button>
        </div>
      `;
      content.querySelector('[data-go-gacha]').addEventListener('click', () => {
        _currentTab = 'gacha';
        document.querySelector('.mt-hub-tab[data-tab="gacha"]')?.click();
      });
      return;
    }
    // 渲染卡片格
    const grid = document.createElement('div');
    grid.className = 'mt-roster-grid';
    const posEmoji = { GK: '🧤', DEF: '🛡️', MID: '⚙️', FWD: '⚽' };
    players.forEach(p => {
      const c = p.card || {};
      const rarityClass = c.rarity ? `rarity-${c.rarity}` : '';
      const card = document.createElement('div');
      card.className = `mt-player-card ${rarityClass}`;
      const portrait = (typeof window.MyTeamPortrait === 'function') ? window.MyTeamPortrait(c.card_id) : '👤';
      card.innerHTML = `
        ${p.in_starting_11 ? '<span class="mt-player-starting-badge">先發</span>' : ''}
        <span class="mt-player-card-rarity">${c.rarity || 'R'}</span>
        <div class="mt-player-portrait">
          <span class="mt-player-portrait-emoji">${portrait}</span>
          <span class="mt-player-portrait-pos">${posEmoji[c.position] || '⚽'}</span>
        </div>
        <div class="mt-player-name">${escapeHtml(c.name || '?')}</div>
        <div class="mt-player-position">${c.position || ''} · Lv.${p.level}${p.bond ? ' ★'.repeat(p.bond) : ''}</div>
        <div class="mt-player-stats">
          <div class="mt-player-stat">攻 <b>${p.current_attack}</b></div>
          <div class="mt-player-stat">防 <b>${p.current_defense}</b></div>
          <div class="mt-player-stat">速 <b>${p.current_speed}</b></div>
        </div>
      `;
      grid.appendChild(card);
    });
    content.innerHTML = '';
    content.appendChild(grid);
  }

  function renderGachaTab(content) {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') return;
    const tickets = team.tickets || 0;
    const pity = team.pity_counter || 0;
    const pityRemaining = Math.max(0, 30 - pity);

    content.innerHTML = `
      <div class="mt-gacha-tab">
        <div class="mt-gacha-banner">
          <div class="mt-gacha-banner-title">🎰 球員抽卡</div>
          <div class="mt-gacha-banner-sub">
            抽券 / 50 寶石 → 隨機獲得 R / SR / SSR 球員<br>
            重複球員自動 ★+1 加強上限
          </div>
          <div class="mt-gacha-rates">
            <span>R <b>75%</b></span>
            <span>SR <b>20%</b></span>
            <span style="color:#f0c040">SSR <b>5%</b></span>
          </div>
          <div class="mt-gacha-pity-bar">
            🎯 保底：再抽 <b>${pityRemaining}</b> 次無 SSR 必出（目前 pity = ${pity}/30）
          </div>
        </div>

        <div class="mt-gacha-buttons">
          <button class="mt-gacha-btn-row" id="mt-gacha-1" ${tickets < 1 ? 'disabled' : ''}>
            <div class="mt-gacha-btn-info">
              <div class="mt-gacha-btn-title">🎰 抽 1 抽</div>
              <div class="mt-gacha-btn-sub">隨機獲得 1 張球員卡</div>
            </div>
            <div class="mt-gacha-btn-cost">🎟️ 1</div>
          </button>

          <button class="mt-gacha-btn-row" id="mt-gacha-10" ${tickets < 10 ? 'disabled' : ''}>
            <div class="mt-gacha-btn-info">
              <div class="mt-gacha-btn-title">🎰 10 連抽</div>
              <div class="mt-gacha-btn-sub">10 張 + 保證至少 1 張 SR 起步</div>
            </div>
            <div class="mt-gacha-btn-cost">🎟️ 10</div>
          </button>

          <button class="mt-gacha-btn-row" id="mt-gacha-gem-1">
            <div class="mt-gacha-btn-info">
              <div class="mt-gacha-btn-title">💎 寶石抽（保底用）</div>
              <div class="mt-gacha-btn-sub">沒抽券時用寶石</div>
            </div>
            <div class="mt-gacha-btn-cost">💎 50</div>
          </button>
        </div>
      </div>
    `;

    // 1 抽
    content.querySelector('#mt-gacha-1').addEventListener('click', () => _runGacha(1));
    // 10 連
    content.querySelector('#mt-gacha-10').addEventListener('click', () => _runGacha(10));
    // 寶石抽（暫時跳訊息，Phase 1.7 接 gems.js）
    content.querySelector('#mt-gacha-gem-1').addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('💎 寶石抽卡 Phase 1.7 接 gems.js');
    });
  }

  async function _runGacha(count) {
    try {
      await window.MyTeam.gacha(count, { source: 'gacha-tab' });
      // 動畫跑完 → 重畫 hub
      renderHub();
    } catch (err) {
      console.error('[my-team] gacha error', err);
      const msg = String(err.message || err);
      let friendly = '抽卡失敗：' + msg;
      if (msg.includes('INSUFFICIENT_TICKETS')) friendly = '⚠️ 抽券不足';
      else if (msg.includes('NO_TEAM')) friendly = '⚠️ 請先建立球隊';
      else if (msg.includes('NOT_LOGGED_IN')) friendly = '⚠️ 請先登入';
      if (typeof showToast === 'function') showToast(friendly);
      else alert(friendly);
    }
  }

  async function renderMatchTab(content) {
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入聯賽進度…</div>';
    const team = window.MyTeam.getCached();
    if (!team) return;
    const { data: prog } = await window.DB
      .from('league_progress')
      .select('*')
      .eq('user_id', team.user_id)
      .maybeSingle();
    const tier = prog?.current_tier || 1;
    const tierName = ({1:'新手聯賽',2:'業餘聯賽',3:'地區聯賽',4:'全國次級',5:'全國聯賽',6:'大陸盃',7:'歐洲菁英',8:'世界次級',9:'世界聯賽',10:'傳奇聯賽'})[tier];
    const playedRatio = `${prog?.matches_played || 0}/10`;
    const wins = prog?.wins || 0;
    const draws = prog?.draws || 0;
    const losses = prog?.losses || 0;
    const tierAvg = { 1:40,2:50,3:60,4:70,5:75,6:80,7:85,8:88,9:92,10:95 }[tier];
    const realRatio = { 1:0,2:0,3:0,4:0.1,5:0.2,6:0.3,7:0.45,8:0.65,9:0.85,10:1.0 }[tier];
    const bossNote = realRatio > 0
      ? `<div class="mt-match-boss-note">⭐ Tier ${tier}：本聯賽約 ${Math.round(realRatio*100)}% 機率遇到真實隊伍 Boss 戰</div>` : '';

    content.innerHTML = `
      <div class="mt-match-tab">
        <div class="mt-match-season">
          <div class="mt-match-season-tier">${tierName}（Tier ${tier}）</div>
          <div class="mt-match-season-sub">對手平均能力 ${tierAvg} · 賽季 ${prog?.season_num || 1}</div>
          <div class="mt-match-season-progress">
            <div class="mt-match-season-bar">
              <div style="width:${(prog?.matches_played || 0) * 10}%"></div>
            </div>
            <div class="mt-match-season-stats">
              ${playedRatio} 場 · <b style="color:#4caf50">${wins} 勝</b> / <span>${draws} 平</span> / <span style="color:#ef9a9a">${losses} 敗</span>
            </div>
          </div>
          <div class="mt-match-season-hint">7 勝以上升級 / 3 勝以下降級 / 賽季冠軍 +SSR 自選券</div>
        </div>
        ${bossNote}
        <button class="mt-match-start" id="mt-match-start" ${team.stamina < 1 ? 'disabled' : ''}>
          ⚽ 下一場比賽
          <span class="mt-match-start-cost">耗 1 ⚡（剩 ${team.stamina}/${team.stamina_max}）</span>
        </button>
        ${team.stamina < 1 ? '<div class="mt-match-low-stamina">⚡ 體力 0 — 預測比賽、看文章可賺體力</div>' : ''}
      </div>
    `;

    content.querySelector('#mt-match-start')?.addEventListener('click', () => {
      if (typeof window.MyTeam.runMatch === 'function') {
        window.MyTeam.runMatch();
      }
    });
  }

  async function renderTrainTab(content) {
    const team = window.MyTeam.getCached();
    if (!team) return;
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入球員中…</div>';
    const players = await window.MyTeam.fetchPlayers();
    if (!players.length) {
      content.innerHTML = `
        <div class="mt-roster-empty">
          <div class="mt-roster-empty-icon">🎰</div>
          <div>還沒有球員！</div>
          <div style="font-size:12px;margin:8px 0 16px;opacity:0.7">先抽幾張卡才能訓練</div>
          <button class="mt-roster-empty-cta" data-go-gacha>🎰 去抽卡</button>
        </div>
      `;
      content.querySelector('[data-go-gacha]').addEventListener('click', () => {
        _currentTab = 'gacha';
        document.querySelector('.mt-hub-tab[data-tab="gacha"]')?.click();
      });
      return;
    }

    content.innerHTML = `
      <div class="mt-train-rp">
        <div class="mt-train-rp-title">⚙️ Research Points</div>
        <div class="mt-train-rp-grid">
          <div class="mt-train-rp-cell"><span>戰術</span><b>${team.rp_tactical}</b></div>
          <div class="mt-train-rp-cell"><span>體能</span><b>${team.rp_physical}</b></div>
          <div class="mt-train-rp-cell"><span>心</span><b>${team.rp_heart}</b></div>
          <div class="mt-train-rp-cell"><span>靈感</span><b>${team.rp_idea}</b></div>
        </div>
        <div class="mt-train-rp-sub">贏球賺 RP / 一般訓練 戰術+體能各 10、精緻 各 30+心靈感各 10</div>
      </div>
      <div class="mt-train-list" id="mt-train-list"></div>
    `;

    const list = content.querySelector('#mt-train-list');
    players.forEach(p => {
      const c = p.card || {};
      const canNormal = team.rp_tactical >= 10 && team.rp_physical >= 10 && p.level < 50;
      const canPremium = team.rp_tactical >= 30 && team.rp_physical >= 30
                        && team.rp_heart >= 10 && team.rp_idea >= 10 && p.level < 50;
      const row = document.createElement('div');
      row.className = `mt-train-row rarity-${c.rarity || 'R'}`;
      row.innerHTML = `
        <div class="mt-train-row-head">
          <span class="mt-player-card-rarity">${c.rarity || 'R'}</span>
          <div class="mt-player-name">${escapeHtml(c.name || '?')}</div>
          <div class="mt-player-position">${c.position || ''} · Lv.${p.level}/50 ${p.bond ? '★'.repeat(p.bond) : ''}</div>
        </div>
        <div class="mt-train-row-stats">
          攻 ${p.current_attack} · 防 ${p.current_defense} · 速 ${p.current_speed} ·
          中 ${p.current_midfield} · 體 ${p.current_stamina} · 環 ${p.current_aura}
        </div>
        <div class="mt-train-row-actions">
          <button class="mt-train-btn" data-train="normal" data-player="${p.id}" ${canNormal ? '' : 'disabled'}>
            一般訓練（戰術 10 + 體能 10）
          </button>
          <button class="mt-train-btn mt-train-btn-premium" data-train="premium" data-player="${p.id}" ${canPremium ? '' : 'disabled'}>
            精緻訓練（30+30+10+10）
          </button>
        </div>
      `;
      list.appendChild(row);
    });

    // click 訓練
    list.querySelectorAll('[data-train]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.player;
        const mode = btn.dataset.train;
        list.querySelectorAll('[data-train]').forEach(b => b.disabled = true);
        try {
          const result = await window.MyTeam.trainPlayer(pid, mode);
          const g = result.gains;
          if (typeof showToast === 'function') {
            showToast(`💪 Lv.${result.level_after}！攻+${g.attack}/防+${g.defense}/速+${g.speed}/中+${g.midfield}/體+${g.stamina}/環+${g.aura}`);
          }
          // 重畫 hub（RP 變化）
          renderHub();
        } catch (err) {
          console.error('[my-team] train error', err);
          const msg = String(err.message || err);
          let friendly = '訓練失敗：' + msg;
          if (msg.includes('INSUFFICIENT_RP')) friendly = '⚠️ RP 不足';
          else if (msg.includes('MAX_LEVEL')) friendly = '⚠️ 已滿級';
          if (typeof showToast === 'function') showToast(friendly);
          else alert(friendly);
          list.querySelectorAll('[data-train]').forEach(b => b.disabled = false);
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 監聽 team change → 如果 modal 開著，重新渲染 hub stats
  window.addEventListener('my-team-changed', () => {
    if (_overlay && _overlay.classList.contains('open')) {
      const body = _overlay.querySelector('#mt-modal-body');
      // 只在已是 hub 視圖才更新 stats（避免蓋掉 onboarding）
      if (body && body.querySelector('.mt-hub-header')) {
        renderHub();
      }
    }
  });

  window.openMyTeamModal = open;
  window.closeMyTeamModal = close;
})();
