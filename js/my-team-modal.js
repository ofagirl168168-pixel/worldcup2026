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
    body.innerHTML = `
      <div class="mt-onboard">
        <div class="mt-onboard-title">🎉 建立你的球隊</div>
        <div class="mt-onboard-sub">
          選個隊名 + 隊徽就能開始抽卡養隊。<br>
          建隊送你 <b style="color:#f0c040">5 張免費抽券</b>！
        </div>

        <div class="mt-onboard-section">
          <div class="mt-onboard-label">隊名（最多 24 字）</div>
          <input class="mt-onboard-input" id="mt-onboard-name" maxlength="24" placeholder="例：麥迪聯隊" />
        </div>

        <div class="mt-onboard-section">
          <div class="mt-onboard-label">選個隊徽</div>
          <div class="mt-crest-grid" id="mt-crest-grid"></div>
        </div>

        <button class="mt-onboard-submit" id="mt-onboard-submit" disabled>建立球隊</button>
        <div class="mt-onboard-gift">⚽ 建隊後直接送 5 張抽券、可抽 5 連 + 保底 SR 起步</div>
      </div>
    `;

    // 隊徽選擇
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
      });
      grid.appendChild(cell);
    });

    // 名字 / submit 啟用
    const nameInput = body.querySelector('#mt-onboard-name');
    const submitBtn = body.querySelector('#mt-onboard-submit');
    const refreshSubmit = () => {
      submitBtn.disabled = !(nameInput.value || '').trim();
    };
    nameInput.addEventListener('input', refreshSubmit);
    refreshSubmit();

    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = '建立中…';
      try {
        await window.MyTeam.create(nameInput.value, selectedCrest);
        // 成功 → 切換到 hub
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
    players.forEach(p => {
      const c = p.card || {};
      const rarityClass = c.rarity ? `rarity-${c.rarity}` : '';
      const card = document.createElement('div');
      card.className = `mt-player-card ${rarityClass}`;
      card.innerHTML = `
        ${p.in_starting_11 ? '<span class="mt-player-starting-badge">先發</span>' : ''}
        <span class="mt-player-card-rarity">${c.rarity || 'R'}</span>
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
    // Phase 1.6 才實作；先放佔位 + 簡單抽卡按鈕
    const team = window.MyTeam.getCached();
    content.innerHTML = `
      <div class="mt-tab-todo">
        <div class="mt-tab-todo-icon">🎰</div>
        <div style="margin-bottom:8px">抽卡 UI 開發中</div>
        <div style="font-size:11px;opacity:0.6;margin-bottom:16px">你目前有 ${team?.tickets || 0} 張抽券<br>Phase 1.6 會做完整抽卡動畫</div>
      </div>
    `;
  }

  function renderMatchTab(content) {
    content.innerHTML = `
      <div class="mt-tab-todo">
        <div class="mt-tab-todo-icon">⚽</div>
        <div>比賽功能開發中</div>
        <div style="font-size:11px;opacity:0.6;margin-top:8px">Phase 1.9 會接上 match-sim.js + 聯賽推進</div>
      </div>
    `;
  }

  function renderTrainTab(content) {
    content.innerHTML = `
      <div class="mt-tab-todo">
        <div class="mt-tab-todo-icon">💪</div>
        <div>訓練系統開發中</div>
        <div style="font-size:11px;opacity:0.6;margin-top:8px">Phase 1.8 會做 RP 消耗升級球員</div>
      </div>
    `;
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
