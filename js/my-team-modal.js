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
  let _currentTab = 'home';
  let _homeAnimId = null;

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
      // 新手禮包：第一次進來且還沒領 → 觸發新手指引
      if (team.starter_pack_claimed === false) {
        setTimeout(() => _showStarterPackIntro(), 400);
      }
    }
  }

  // ── 新手指引：階段式 tutorial、最後觸發 10 連抽動畫 ──
  async function _showStarterPackIntro() {
    const steps = [
      {
        emoji: '🏟️',
        title: '歡迎來到你的球場',
        body: '這裡是你的足球俱樂部 — 你會抽球員、訓練、組陣、和其他玩家對戰。',
        cta: '繼續 →',
      },
      {
        emoji: '⚽',
        title: '球員是俱樂部的核心',
        body: '抽到的每張球員卡會自動站在球場上對應位置。SSR 是稀有強卡，SR 是中堅，R 是基礎陣容。',
        cta: '繼續 →',
      },
      {
        emoji: '🎰',
        title: '免費送你一發 10 連抽',
        body: '球員是抽出來的。<br>第一發我們幫你支付、<b>免費</b>抽一發 10 連看看手氣。',
        cta: '開始 10 連抽 🎰',
      },
    ];

    let stepIdx = 0;
    const overlay = document.createElement('div');
    overlay.className = 'mt-tutorial-overlay';
    overlay.innerHTML = `
      <div class="mt-tutorial-card">
        <div class="mt-tutorial-progress" id="mt-tut-progress"></div>
        <div class="mt-tutorial-emoji" id="mt-tut-emoji"></div>
        <h2 id="mt-tut-title"></h2>
        <p id="mt-tut-body"></p>
        <button class="mt-tutorial-cta" id="mt-tut-cta"></button>
        <button class="mt-tutorial-skip" id="mt-tut-skip">先跳過、稍後手動領取</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function render() {
      const s = steps[stepIdx];
      overlay.querySelector('#mt-tut-emoji').textContent = s.emoji;
      overlay.querySelector('#mt-tut-title').textContent = s.title;
      overlay.querySelector('#mt-tut-body').innerHTML = s.body;
      overlay.querySelector('#mt-tut-cta').textContent = s.cta;
      overlay.querySelector('#mt-tut-progress').innerHTML = steps.map((_, i) =>
        `<span class="mt-tut-dot ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}"></span>`
      ).join('');
    }
    render();

    const skipBtn = overlay.querySelector('#mt-tut-skip');
    skipBtn.addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    });

    const ctaBtn = overlay.querySelector('#mt-tut-cta');
    ctaBtn.addEventListener('click', async () => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        // 動畫過渡：淡出再淡入
        const card = overlay.querySelector('.mt-tutorial-card');
        card.classList.add('mt-tutorial-step-out');
        setTimeout(() => {
          render();
          card.classList.remove('mt-tutorial-step-out');
          card.classList.add('mt-tutorial-step-in');
          setTimeout(() => card.classList.remove('mt-tutorial-step-in'), 300);
        }, 200);
        return;
      }
      // 最後一步：觸發新手套裝 + 跑完整 10 連抽動畫
      ctaBtn.disabled = true; ctaBtn.textContent = '召喚中…';
      try {
        const { data, error } = await window.DB.rpc('claim_starter_pack');
        if (error) throw error;
        // 關掉教學
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 200);
        // 播放完整 gacha 動畫（Stage 0 卡包 → Stage 2.5 翻牌）— 不暴露「首抽套裝」字眼
        if (window.MyTeam?.openGachaAnimation) {
          await window.MyTeam.openGachaAnimation(data.cards || [], {
            title: '🎰 10 連抽召喚',
            subtitle: '看看你的手氣',
          });
        }
        // 動畫結束 → refresh + 跳球員 tab + 結尾引導
        await window.MyTeam.refresh?.();
        _currentTab = 'roster';
        renderHub();
        setTimeout(() => _showStarterCompleteToast(data.count || 10), 200);
      } catch (e) {
        const msg = (e.message || String(e));
        if (msg.includes('ALREADY_CLAIMED')) {
          // 已領過：直接關 tutorial
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
        } else {
          alert('召喚失敗：' + msg);
          ctaBtn.disabled = false; render();
        }
      }
    });
  }

  async function _showStarterCompleteToast(n) {
    const team = window.MyTeam.getCached();
    // 教學鏈：先抽教練 → 比賽 → 訓練
    // 撈是否已聘過教練（user_coach 有資料 → 跳過教練 step）
    let hasCoach = false;
    try {
      const { count } = await window.DB.from('user_coach').select('id', { count: 'exact', head: true });
      hasCoach = (count || 0) > 0;
    } catch (e) {}
    const needsCoachTutorial = !hasCoach;
    const needsTutorialMatch = team && team.tutorial_match_done === false;
    const needsTrainingTutorial = team && team.tutorial_first_training_used === false;

    let title, body, primaryBtn, action;
    if (needsCoachTutorial) {
      title = '太棒了！';
      body = '接下來<b>抽你的第一位教練</b>！<br>教練會給你 buff + <b>解鎖新陣型</b>';
      primaryBtn = '👔 抽教練';
      action = 'coach';
    } else if (needsTutorialMatch) {
      title = '教練聘任完成！';
      body = '接下來打<b>第一場熱身賽</b>看你的隊伍表現 ⚽';
      primaryBtn = '🏟️ 開始熱身賽';
      action = 'match';
    } else if (needsTrainingTutorial) {
      title = '太棒了！';
      body = '接下來教你<b>訓練</b>球員 — 讓他們變更強';
      primaryBtn = '🏋️ 教我訓練';
      action = 'train';
    } else {
      title = '太棒了！';
      body = '接下來去 <b>球員</b> 或 <b>設定</b> 安排陣容';
      primaryBtn = '📋 去安排隊伍';
      action = 'roster';
    }

    const t = document.createElement('div');
    t.className = 'mt-starter-complete';
    t.innerHTML = `
      <div class="mt-starter-complete-card">
        <div style="font-size:48px">🎉</div>
        <h3>${title}</h3>
        <p>${body}</p>
        <div class="mt-starter-complete-buttons">
          <button class="mt-gacha-btn mt-starter-primary">${primaryBtn}</button>
          <button class="mt-starter-complete-skip">稍後再說</button>
        </div>
      </div>
    `;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('open'));
    const close = () => {
      t.classList.remove('open');
      setTimeout(() => t.remove(), 200);
    };
    t.querySelector('.mt-starter-primary').addEventListener('click', async () => {
      close();
      if (action === 'coach') {
        await _runCoachTutorial();
      } else if (action === 'match') {
        window.MyTeam?.runMatch?.({ tutorial: true });
      } else if (action === 'train') {
        _runTrainingTutorial();
      } else {
        _currentTab = 'roster';
        document.querySelector('.mt-hub-tab[data-tab="roster"]')?.click();
      }
    });
    t.querySelector('.mt-starter-complete-skip').addEventListener('click', close);
  }

  // ── 教練教學：跳教練 tab + 自動抽 1 教練 + 設為主教練 ──
  async function _runCoachTutorial() {
    const overlay = document.createElement('div');
    overlay.className = 'mt-tutorial-overlay';
    overlay.innerHTML = `
      <div class="mt-tutorial-card">
        <div class="mt-tutorial-emoji">👔</div>
        <h2>聘任你的第一位教練</h2>
        <p>新手送你 <b>1 張教練聘任券</b>。<br>
          抽到的教練自動指派為主教練、解鎖一個新陣型。</p>
        <button class="mt-tutorial-cta" id="mt-tut-coach-cta">🎰 抽教練</button>
        <button class="mt-tutorial-skip" id="mt-tut-coach-skip">先跳過</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('#mt-tut-coach-skip').addEventListener('click', close);
    overlay.querySelector('#mt-tut-coach-cta').addEventListener('click', async () => {
      const cta = overlay.querySelector('#mt-tut-coach-cta');
      cta.disabled = true; cta.textContent = '抽取中…';
      try {
        const res = await window.MyTeam.drawCoach(1);
        close();
        const c = res.coaches?.[0];
        if (c) {
          // 自動指派為主教練
          try {
            await window.DB.rpc('set_active_coach', { p_user_coach_id: c.user_coach_id });
            await window.MyTeam.refresh?.();
          } catch (e) { console.warn('set_active_coach', e); }
          // 顯示抽到的教練 + 解鎖陣型
          _showCoachTutorialResult(c);
        } else {
          _showStarterCompleteToast(0);
        }
      } catch (e) {
        alert('抽教練失敗：' + (e.message || e));
        cta.disabled = false; cta.textContent = '🎰 抽教練';
      }
    });
  }

  function _showCoachTutorialResult(coach) {
    const unlocked = coach.trait_value?.unlocks_formation;
    const overlay = document.createElement('div');
    overlay.className = 'mt-tutorial-overlay';
    overlay.innerHTML = `
      <div class="mt-tutorial-card">
        <div class="mt-tutorial-emoji">🎉</div>
        <h2>${escapeHtml(coach.name)}</h2>
        <p>
          <b>${escapeHtml(coach.nickname || '')}</b>（${coach.rarity}）<br>
          ${escapeHtml(coach.trait_value?.description || coach.trait || '')}<br>
          ${unlocked ? `<span style="color:#f0c040">🔓 解鎖陣型 <b>${unlocked}</b></span>` : ''}
        </p>
        <p style="font-size:13px;opacity:0.85">已自動指派為主教練！</p>
        <button class="mt-tutorial-cta" id="mt-tut-coach-next">下一步：教學賽 →</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.querySelector('#mt-tut-coach-next').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      window.MyTeam?.runMatch?.({ tutorial: true });
    });
  }

  // ── 訓練教學：自動幫第一位球員跑 3 秒速度訓練（暴露給 my-team-match.js 在賽後 chain）──
  window._runTrainingTutorial = _runTrainingTutorial;
  async function _runTrainingTutorial() {
    const players = await window.MyTeam.fetchPlayers();
    if (!players.length) return;
    // 挑一位非門將
    const target = players.find(p => p.card?.position !== 'GK') || players[0];
    const overlay = document.createElement('div');
    overlay.className = 'mt-tutorial-overlay';
    overlay.innerHTML = `
      <div class="mt-tutorial-card">
        <div class="mt-tutorial-emoji">🏋️</div>
        <h2>訓練：${escapeHtml(target.card?.name || '球員')}</h2>
        <p>正在幫他做<b>速度 +1</b> 訓練<br>（之後等級越高、訓練時間越長）</p>
        <div class="mt-tutorial-progress-wrap">
          <div class="mt-tutorial-progress-bar" id="mt-tut-train-bar"></div>
        </div>
        <div id="mt-tut-train-status" style="font-size:13px;margin-top:8px;opacity:0.8">準備開始…</div>
        <button class="mt-tutorial-cta" id="mt-tut-train-cta" disabled>⏱️ 等候中…</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const bar = overlay.querySelector('#mt-tut-train-bar');
    const status = overlay.querySelector('#mt-tut-train-status');
    const cta = overlay.querySelector('#mt-tut-train-cta');

    try {
      const res = await window.MyTeam.startTimedTraining(target.id, 'speed', true);
      const duration = res.duration_sec || 3;
      status.textContent = `⏱️ ${duration} 秒後可領取`;
      const start = Date.now();
      const t = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const pct = Math.min(100, (elapsed / duration) * 100);
        bar.style.width = pct + '%';
        if (pct >= 100) {
          clearInterval(t);
          status.textContent = '訓練完成！';
          cta.disabled = false;
          cta.textContent = '🎉 領取速度 +1';
        }
      }, 100);

      cta.addEventListener('click', async () => {
        cta.disabled = true; cta.textContent = '領取中…';
        try {
          await window.MyTeam.claimTimedTraining(target.id);
          await window.MyTeam.refresh?.();
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
          if (typeof showToast === 'function') {
            showToast(`✅ ${target.card?.name || '球員'} 速度 +1！記得常常回來訓練`);
          }
          // 跳到球員 tab
          _currentTab = 'roster';
          renderHub();
        } catch (e) {
          alert('領取失敗：' + (e.message || e));
        }
      });
    } catch (e) {
      status.textContent = '訓練啟動失敗：' + (e.message || e);
      cta.textContent = '關閉';
      cta.disabled = false;
      cta.addEventListener('click', () => {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 200);
      });
    }
  }

  function close() {
    if (!_overlay) return;
    _overlay.classList.remove('open');
    _stopOnboardScene();
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
        <!-- 動態 hero 區：天空 + 雲 + 草地球門（與比賽 tab banner 同風格） -->
        <div class="mt-onboard-hero mt-match-banner">
          <div class="mt-match-banner-scroll">
            <div class="mt-match-banner-clouds">
              <span class="mt-match-cloud c1"></span>
              <span class="mt-match-cloud c2"></span>
              <span class="mt-match-cloud c3"></span>
            </div>
            <div class="mt-match-banner-ground">
              <!-- 球門 -->
              <div class="mt-match-goal">
                <svg viewBox="0 0 80 50" preserveAspectRatio="xMidYMax meet">
                  <rect x="2" y="2" width="76" height="40" fill="none" stroke="#ffffff" stroke-width="2.5"/>
                  <line x1="2" y1="2"  x2="2"  y2="48" stroke="#cccccc" stroke-width="2"/>
                  <line x1="78" y1="2" x2="78" y2="48" stroke="#cccccc" stroke-width="2"/>
                  <line x1="2" y1="42" x2="78" y2="42" stroke="#ffffff" stroke-width="2.5"/>
                  <line x1="14" y1="2" x2="14" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="26" y1="2" x2="26" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="40" y1="2" x2="40" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="54" y1="2" x2="54" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="66" y1="2" x2="66" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="2" y1="11" x2="78" y2="11" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="2" y1="22" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="2" y1="32" x2="78" y2="32" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                </svg>
              </div>
            </div>
          </div>
          <!-- 隊徽預覽（疊在 banner 上方） -->
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

    // 隊徽選擇 → 用 SVG TeamCrests（不再 emoji）
    const grid = body.querySelector('#mt-crest-grid');
    const crestIds = window.TeamCrests ? window.TeamCrests.listCrests() : ['football'];
    const presets = window.TeamCrests?.PRESET_COLOR_COMBOS || [['#c0392b', '#f1c40f']];
    let selectedCrest = crestIds[0] || 'football';
    let selectedPrimary = presets[0][0];
    let selectedAccent  = presets[0][1];

    function refreshPreview() {
      if (window.TeamCrests) {
        previewCrest.innerHTML = window.TeamCrests.getSvg(selectedCrest, selectedPrimary, selectedAccent);
      }
      previewCrest.classList.remove('mt-pulse-once');
      void previewCrest.offsetWidth;
      previewCrest.classList.add('mt-pulse-once');
    }
    refreshPreview();

    crestIds.forEach((id, i) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'mt-crest-cell mt-crest-svg-cell' + (i === 0 ? ' sel' : '');
      cell.innerHTML = window.TeamCrests ? window.TeamCrests.getSvg(id, selectedPrimary, selectedAccent) : id;
      cell.addEventListener('click', () => {
        grid.querySelectorAll('.mt-crest-cell').forEach(c => c.classList.remove('sel'));
        cell.classList.add('sel');
        selectedCrest = id;
        refreshPreview();
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
        const created = await window.MyTeam.create(nameInput.value, selectedCrest);
        // 收下投擂台時預覽到的卡（自然流程）
        if (typeof window._mtConsumePreviewCards === 'function') {
          await window._mtConsumePreviewCards();
        }
        // 切換到 hub
        renderHub();
        if (typeof showToast === 'function') {
          showToast(`🎉 球隊「${nameInput.value.trim()}」建立成功！`);
        }
        // 新建隊 → 跑新手教學（starter_pack_claimed === false）
        if (created && created.starter_pack_claimed === false) {
          setTimeout(() => _showStarterPackIntro(), 500);
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
          <div class="mt-hub-team-crest" id="mt-hub-crest">${_renderCrest(team)}</div>
          <div class="mt-hub-team-info">
            <div class="mt-hub-team-name" id="mt-hub-team-name">${escapeHtml(team.team_name)}</div>
            <div class="mt-hub-team-meta" id="mt-hub-team-meta">Lv.${team.stadium_level} 球場 · ${team.fans} 球迷</div>
          </div>
        </div>
        <div class="mt-hub-stats">
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">🎟️</div>
            <div class="mt-hub-stat-val" id="mt-hub-tickets">${team.tickets || 0}</div>
            <div class="mt-hub-stat-label">抽券</div>
          </div>
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">⚡</div>
            <div class="mt-hub-stat-val" id="mt-hub-stamina">${team.stamina || 0}/${team.stamina_max || 5}</div>
            <div class="mt-hub-stat-label">體力<span class="mt-hub-stamina-countdown" id="mt-hub-stamina-countdown"></span></div>
          </div>
          <div class="mt-hub-stat">
            <div class="mt-hub-stat-icon">⭐</div>
            <div class="mt-hub-stat-val" id="mt-hub-ssr">${team.ssr_select_tickets || 0}</div>
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
        <button class="mt-hub-tab ${_currentTab === 'home' ? 'active' : ''}" data-tab="home">🏟️ 主頁</button>
        <button class="mt-hub-tab ${_currentTab === 'roster' ? 'active' : ''}" data-tab="roster">球員</button>
        <button class="mt-hub-tab ${_currentTab === 'gacha' ? 'active' : ''}" data-tab="gacha">抽卡</button>
        <button class="mt-hub-tab ${_currentTab === 'coach' ? 'active' : ''}" data-tab="coach">教練</button>
        <button class="mt-hub-tab ${_currentTab === 'match' ? 'active' : ''}" data-tab="match">比賽</button>
        <button class="mt-hub-tab ${_currentTab === 'train' ? 'active' : ''}" data-tab="train">訓練</button>
        <button class="mt-hub-tab ${_currentTab === 'quest' ? 'active' : ''}" data-tab="quest">任務</button>
        <button class="mt-hub-tab ${_currentTab === 'shop' ? 'active' : ''}" data-tab="shop">商店</button>
        <button class="mt-hub-tab ${_currentTab === 'dex' ? 'active' : ''}" data-tab="dex">圖鑑</button>
        <button class="mt-hub-tab ${_currentTab === 'rank' ? 'active' : ''}" data-tab="rank">排行</button>
        <button class="mt-hub-tab ${_currentTab === 'friends' ? 'active' : ''}" data-tab="friends">好友</button>
        <button class="mt-hub-tab ${_currentTab === 'settings' ? 'active' : ''}" data-tab="settings">設定</button>
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

    // 啟動體力倒數
    _startStaminaCountdown();

    renderTab();
  }

  // ── 體力倒數顯示 ──
  let _staminaTimer = null;
  function _startStaminaCountdown() {
    if (_staminaTimer) clearInterval(_staminaTimer);
    const tick = () => {
      const el = document.getElementById('mt-hub-stamina-countdown');
      if (!el) { clearInterval(_staminaTimer); _staminaTimer = null; return; }
      const team = window.MyTeam?.getCached();
      if (!team || team === 'not_created') { el.textContent = ''; return; }
      if (team.stamina >= team.stamina_max) { el.textContent = ' 滿'; return; }
      // 下次恢復時間 = stamina_recover_at + 15 分鐘
      const recoverAt = team.stamina_recover_at ? new Date(team.stamina_recover_at) : null;
      if (!recoverAt) { el.textContent = ''; return; }
      const nextMs = recoverAt.getTime() + 15 * 60 * 1000;
      const remainSec = Math.max(0, Math.floor((nextMs - Date.now()) / 1000));
      if (remainSec === 0) {
        // 觸發後端 recover
        if (window.DB?.rpc) {
          window.DB.rpc('recover_stamina_if_due').then(() => window.MyTeam?.refresh?.());
        }
        el.textContent = '';
        return;
      }
      const m = Math.floor(remainSec / 60);
      const s = remainSec % 60;
      el.textContent = ` +1 ${m}:${String(s).padStart(2,'0')}`;
    };
    tick();
    _staminaTimer = setInterval(tick, 1000);
  }

  function renderTab() {
    const content = _overlay.querySelector('#mt-hub-content');
    if (!content) return;
    // 依當前 tab 設置背景主題
    content.dataset.tab = _currentTab;
    // 離開主頁時停掉漫步動畫
    if (_currentTab !== 'home' && _homeAnimId) {
      cancelAnimationFrame(_homeAnimId);
      _homeAnimId = null;
    }
    switch (_currentTab) {
      case 'home':     return renderHomeTab(content);
      case 'roster':   return renderRosterTab(content);
      case 'gacha':    return renderGachaTab(content);
      case 'coach':    return renderCoachTab(content);
      case 'match':    return renderMatchTab(content);
      case 'train':    return renderTrainTab(content);
      case 'quest':    return renderQuestTab(content);
      case 'shop':     return renderShopTab(content);
      case 'dex':      return renderDexTab(content);
      case 'rank':     return renderRankTab(content);
      case 'friends':  return renderFriendsTab(content);
      case 'settings': return renderSettingsTab(content);
    }
  }

  // ─────────── 🏟️ 主頁：訓練場（天空 + 建築 + 樹 + 漫步全身球員）───
  async function renderHomeTab(content) {
    if (_homeAnimId) { cancelAnimationFrame(_homeAnimId); _homeAnimId = null; }
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>進入球場…</div>';
    const team = window.MyTeam.getCached();
    const players = await window.MyTeam.fetchPlayers();
    if (!players.length) {
      content.innerHTML = `
        <div class="mt-roster-empty">
          <div class="mt-roster-empty-icon">📭</div>
          <div>還沒有球員！</div>
          <button class="mt-roster-empty-cta" data-go-gacha>🎰 去抽卡</button>
        </div>`;
      content.querySelector('[data-go-gacha]').addEventListener('click', () => {
        _currentTab = 'gacha';
        document.querySelector('.mt-hub-tab[data-tab="gacha"]')?.click();
      });
      return;
    }

    const now = new Date();
    let starters = players.filter(p => p.in_starting_11 &&
      (!p.injured_until || new Date(p.injured_until) <= now));
    if (starters.length < 11) {
      const rest = players.filter(p => !starters.includes(p) &&
        (!p.injured_until || new Date(p.injured_until) <= now))
        .sort((a, b) => (b.current_attack + b.current_defense) - (a.current_attack + a.current_defense));
      starters = starters.concat(rest.slice(0, 11 - starters.length));
    }
    // 主頁顯示前 11 starter（或現有所有 < 11）
    const onField = starters.slice(0, 11);

    content.innerHTML = `
      <div class="mt-home-tab">
        <div class="mt-home-scene" id="mt-home-scene">
          <!-- 天空（雲在太陽之上、遠山 silhouette 墊底）-->
          <div class="mt-home-sky">
            <svg class="mt-home-mountains" viewBox="0 0 200 50" preserveAspectRatio="none">
              <!-- 後排淺色遠山 -->
              <polygon points="0,50 30,28 60,40 95,18 130,32 170,20 200,42 200,50"
                fill="#8a9db0" opacity="0.55"/>
              <!-- 前排深色遠山 -->
              <polygon points="0,50 25,38 55,28 90,40 125,26 165,38 200,30 200,50"
                fill="#5a6b85" opacity="0.75"/>
            </svg>
            <div class="mt-home-sun"></div>
            <div class="mt-home-cloud mt-home-cloud-1"></div>
            <div class="mt-home-cloud mt-home-cloud-2"></div>
            <div class="mt-home-cloud mt-home-cloud-3"></div>
            <div class="mt-home-birds">˜ ˜</div>
          </div>
          <!-- 遠景：建築 + 樹（依 stadium_level 變外觀）-->
          <div class="mt-home-distance" data-stadium-level="${team?.stadium_level || 1}">
            <div class="mt-home-tree mt-home-tree-l"></div>
            <div class="mt-home-clubhouse">
              <svg class="mt-home-clubhouse-roof" viewBox="0 0 110 32" preserveAspectRatio="none">
                <polygon points="2,30 55,2 108,30" fill="#c0392b"
                  stroke="#1a1a2e" stroke-width="3" stroke-linejoin="round"/>
              </svg>
              <div class="mt-home-clubhouse-roof-tiles"></div>
              <div class="mt-home-clubhouse-chimney"></div>
              <div class="mt-home-clubhouse-sign">${escapeHtml(team?.team_name || '我的訓練館')}</div>
              <div class="mt-home-clubhouse-door">
                <div class="mt-home-clubhouse-handle"></div>
              </div>
              <div class="mt-home-clubhouse-window mt-home-cw-1">
                <div class="mt-home-clubhouse-window-cross"></div>
              </div>
              <div class="mt-home-clubhouse-window mt-home-cw-2">
                <div class="mt-home-clubhouse-window-cross"></div>
              </div>
              ${(team?.stadium_level || 1) >= 3 ? `
                <!-- Lv 3+：兩側看台 -->
                <div class="mt-home-stand mt-home-stand-l"></div>
                <div class="mt-home-stand mt-home-stand-r"></div>
              ` : ''}
              ${(team?.stadium_level || 1) >= 5 ? `
                <!-- Lv 5+：聚光燈 -->
                <div class="mt-home-floodlight mt-home-floodlight-l"></div>
                <div class="mt-home-floodlight mt-home-floodlight-r"></div>
              ` : ''}
              ${(team?.stadium_level || 1) >= 7 ? `
                <!-- Lv 7+：旗桿 -->
                <div class="mt-home-flag mt-home-flag-l"></div>
                <div class="mt-home-flag mt-home-flag-r"></div>
              ` : ''}
            </div>
            <div class="mt-home-tree mt-home-tree-r"></div>
            <!-- 球迷：根據 team.fans 數量在看台/草地周圍加油 -->
            <div class="mt-home-fans" id="mt-home-fans"></div>
          </div>
          <!-- 地面（操場）-->
          <div class="mt-home-ground" id="mt-home-ground">
            <div class="mt-home-ground-lines"></div>
            <div class="mt-home-ground-tufts"></div>
          </div>
        </div>
      </div>
    `;

    const ground = content.querySelector('#mt-home-ground');
    const kit = {
      shirtColor: team?.kit_shirt_color || 'red',
      pantsColor: team?.kit_pants_color || 'white',
      shoeColor:  team?.kit_shoes_color || 'white',
    };

    // 渲染球迷：fans 上限對應加油人數（pixel chibi 小人 + 旗 / 圍巾）
    const fansEl = content.querySelector('#mt-home-fans');
    if (fansEl) {
      const fans = team?.fans || 100;
      const fanCount = Math.min(30, Math.max(2, Math.floor(fans / 60)));
      // 球迷類型：3 種 SVG chibi（舉手歡呼 / 揮旗 / 戴圍巾）
      const teamColor = _colorHex(team?.crest_primary || 'red');
      const fragments = [];
      for (let i = 0; i < fanCount; i++) {
        const type = i % 3;
        const x = 5 + (i * 91) % 90;
        const delay = (i * 0.27) % 1.5;
        let svg = '';
        if (type === 0) {
          // 舉手歡呼
          svg = `<svg viewBox="0 0 12 18" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="4" r="2.6" fill="#f5d0a0" stroke="#1a1a2e" stroke-width="0.6"/>
            <rect x="3.6" y="6.5" width="4.8" height="6" fill="${teamColor}" stroke="#1a1a2e" stroke-width="0.6"/>
            <rect x="3" y="12.4" width="2" height="4" fill="#1a3050" stroke="#1a1a2e" stroke-width="0.5"/>
            <rect x="7" y="12.4" width="2" height="4" fill="#1a3050" stroke="#1a1a2e" stroke-width="0.5"/>
            <rect x="2.5" y="2"  width="1.5" height="5" fill="#f5d0a0" stroke="#1a1a2e" stroke-width="0.4" transform="rotate(-25 3.25 4.5)"/>
            <rect x="8"   y="2"  width="1.5" height="5" fill="#f5d0a0" stroke="#1a1a2e" stroke-width="0.4" transform="rotate( 25 8.75 4.5)"/>
          </svg>`;
        } else if (type === 1) {
          // 揮旗
          svg = `<svg viewBox="0 0 14 18" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="4" r="2.6" fill="#e8b896" stroke="#1a1a2e" stroke-width="0.6"/>
            <rect x="3.6" y="6.5" width="4.8" height="6" fill="${teamColor}" stroke="#1a1a2e" stroke-width="0.6"/>
            <rect x="3" y="12.4" width="2" height="4" fill="#202020" stroke="#1a1a2e" stroke-width="0.5"/>
            <rect x="7" y="12.4" width="2" height="4" fill="#202020" stroke="#1a1a2e" stroke-width="0.5"/>
            <!-- 旗桿 + 旗 -->
            <line x1="9" y1="2" x2="9" y2="10" stroke="#6d4c2a" stroke-width="0.7"/>
            <polygon points="9,2 13,3.5 9,5.5" fill="${teamColor}" stroke="#1a1a2e" stroke-width="0.4"/>
          </svg>`;
        } else {
          // 戴圍巾
          svg = `<svg viewBox="0 0 12 18" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="4" r="2.6" fill="#d8b08a" stroke="#1a1a2e" stroke-width="0.6"/>
            <rect x="3.6" y="6.5" width="4.8" height="6" fill="${teamColor}" stroke="#1a1a2e" stroke-width="0.6"/>
            <rect x="3" y="12.4" width="2" height="4" fill="#3a2410" stroke="#1a1a2e" stroke-width="0.5"/>
            <rect x="7" y="12.4" width="2" height="4" fill="#3a2410" stroke="#1a1a2e" stroke-width="0.5"/>
            <!-- 圍巾 -->
            <rect x="2.6" y="6.4" width="6.8" height="1.8" fill="#f0c040" stroke="#1a1a2e" stroke-width="0.4"/>
            <rect x="2" y="8" width="1.4" height="3.5" fill="#f0c040" stroke="#1a1a2e" stroke-width="0.4"/>
          </svg>`;
        }
        fragments.push(`<span class="mt-home-fan" style="left:${x}%; animation-delay:${delay}s">${svg}</span>`);
      }
      fansEl.innerHTML = fragments.join('');
    }

    // 預生每位 starter 的 LPC 全身 sprite sheet
    const wanderers = await Promise.all(onField.map(async (p) => {
      const look = window.LpcRenderer && window.LpcRenderer.resolveLook(p);
      let sheetUrl = null, sheetW = 32, sheetH = 60;
      if (look && window.LpcRenderer && window.LpcRenderer.walkingFullBody) {
        try {
          const sheet = await window.LpcRenderer.walkingFullBody(look, kit);
          if (sheet) {
            sheetUrl = sheet.canvas.toDataURL('image/png');
            sheetW = sheet.frameW;
            sheetH = sheet.frameH;
          }
        } catch (e) {}
      }
      return {
        player: p, sheetUrl, sheetW, sheetH,
        x: 0.1 + Math.random() * 0.8,
        // y 範圍從 0.32 起步（之前 0.2 會跟地平線球迷重疊）
        y: 0.32 + Math.random() * 0.58,
        vx: 0, vy: 0,
        state: 'walk',           // 'walk' | 'idle' | 'kick' | 'stretch'
        stateUntil: performance.now() + 600 + Math.random() * 2400,
        row: 0,                  // sprite row（依方向 / 動作）
        frame: 1,
        el: null, frameTick: 0, scale: 1.4,
        actionCooldown: performance.now() + 6000 + Math.random() * 10000,
      };
    }));

    // 建 DOM
    wanderers.forEach(w => {
      const el = document.createElement('button');
      el.className = `mt-home-player rarity-${w.player.card?.rarity || 'R'}`;
      el.dataset.playerId = w.player.id;
      const injured = (w.player.injured_until && new Date(w.player.injured_until) > now)
        ? '<span class="mt-pitch-injury">🏥</span>' : '';
      const SCALE = w.scale;
      const SHEET_ROWS = 8;  // walk×4 + kick + cheer + frustration + tackle
      const SHEET_COLS = 3;
      const rarity = w.player.card?.rarity || 'R';
      const pos = w.player.card?.position || '';
      const star = rarity === 'SSR' ? '<span class="mt-home-star ssr">★</span>'
                 : rarity === 'SR'  ? '<span class="mt-home-star sr">★</span>' : '';
      el.innerHTML = `
        <div class="mt-home-shadow"></div>
        <div class="mt-home-sprite" style="${w.sheetUrl
          ? `background-image:url(${w.sheetUrl});width:${w.sheetW * SCALE}px;height:${w.sheetH * SCALE}px;background-size:${w.sheetW * SCALE * SHEET_COLS}px ${w.sheetH * SCALE * SHEET_ROWS}px`
          : `width:${32 * SCALE}px;height:${60 * SCALE}px;background:rgba(255,255,255,0.2)`}"></div>
        ${injured}
        <div class="mt-home-pos pos-${pos}">${pos}</div>
        <div class="mt-home-name rarity-${rarity}">${star}${escapeHtml(w.player.card?.name || '?')}</div>
      `;
      el.addEventListener('click', () => _openPlayerProfile(w.player));
      w.el = el;
      ground.appendChild(el);
    });

    // 動畫迴圈：H_LO 低一點讓球員可走到操場前端、頭蓋過建築（前景效果）
    const W_LO = 0.04, W_HI = 0.96;
    // H_LO 從 0.05 → 0.30：避免球員走到地平線跟球迷重疊
    const H_LO = 0.30, H_HI = 0.95;
    function tick(t) {
      for (const w of wanderers) {
        if (!w.el) continue;
        // 狀態結束 → 切回 walk 或 idle
        if (t >= w.stateUntil) {
          if (w.state === 'idle') {
            // 機會觸發特殊動作（每 ≥ cooldown 才 roll）
            if (t > w.actionCooldown && Math.random() < 0.6) {
              const action = Math.random() < 0.55 ? 'kick' : 'stretch';
              w.state = action;
              w.row = action === 'kick' ? 4 : 5;
              w.frame = 0; w.frameTick = 0; w.vx = 0; w.vy = 0;
              // 動作維持 5-8 秒
              w.stateUntil = t + 5000 + Math.random() * 3000;
              w.actionCooldown = t + 12000 + Math.random() * 15000;
            } else {
              w.state = 'walk';
              w.vx = 0; w.vy = 0;
            }
          } else if (w.state === 'walk') {
            // 隨機 idle
            if (Math.random() < 0.4) {
              w.state = 'idle'; w.vx = 0; w.vy = 0;
              w.stateUntil = t + 1500 + Math.random() * 2500;
            } else {
              w.stateUntil = t + 4000 + Math.random() * 5000;
              w.vx = 0; w.vy = 0;
            }
          } else {
            // kick / stretch 結束 → 短暫 idle
            w.state = 'idle'; w.vx = 0; w.vy = 0;
            w.stateUntil = t + 800 + Math.random() * 1200;
          }
        }

        if (w.state === 'walk') {
          if (w.vx === 0 && w.vy === 0) {
            const dirs = [
              { vx: 0,        vy: 0.0007,  row: 0 },
              { vx: -0.0009,  vy: 0,       row: 1 },
              { vx: 0.0009,   vy: 0,       row: 2 },
              { vx: 0,        vy: -0.0007, row: 3 },
            ];
            const d = dirs[Math.floor(Math.random() * 4)];
            w.vx = d.vx; w.vy = d.vy; w.row = d.row;
          }
          w.x += w.vx;
          w.y += w.vy;
          if (w.x <= W_LO) { w.x = W_LO; w.vx = -w.vx; w.row = 2; }
          if (w.x >= W_HI) { w.x = W_HI; w.vx = -w.vx; w.row = 1; }
          if (w.y <= H_LO) { w.y = H_LO; w.vy = -w.vy; w.row = 0; }
          if (w.y >= H_HI) { w.y = H_HI; w.vy = -w.vy; w.row = 3; }
          w.frameTick++;
          if (w.frameTick > 10) { w.frame = (w.frame + 1) % 3; w.frameTick = 0; }
        } else if (w.state === 'kick' || w.state === 'stretch') {
          // 動作 frame 放慢（每 28 tick 換 frame、3 frame ≈ 1.4 秒一個 cycle）
          w.frameTick++;
          if (w.frameTick > 28) { w.frame = (w.frame + 1) % 3; w.frameTick = 0; }
        } else {
          // idle
          w.frame = 1;
        }

        w.el.style.left = (w.x * 100) + '%';
        w.el.style.top  = (w.y * 100) + '%';
        const persp = 0.78 + w.y * 0.35;
        w.el.style.setProperty('--persp', persp);
        // Y-sort：y 越大（越下方）z-index 越高 → 前景；上方球員會被下方擋住
        w.el.style.zIndex = String(100 + Math.round(w.y * 100));
        const sprite = w.el.children[1];
        if (sprite && w.sheetUrl) {
          const SCALE = w.scale;
          const bgX = -(w.frame * w.sheetW * SCALE);
          const bgY = -(w.row   * w.sheetH * SCALE);
          sprite.style.backgroundPosition = `${bgX}px ${bgY}px`;
        }
      }
      _homeAnimId = requestAnimationFrame(tick);
    }
    _homeAnimId = requestAnimationFrame(tick);
  }

  async function renderRosterTab(content) {
    // 只在第一次或空畫面才顯 loading；後續 re-render 不閃
    const alreadyHasStadium = content.querySelector('.mt-stadium-tab');
    if (!alreadyHasStadium) {
      content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入球員中…</div>';
    }
    const team = window.MyTeam.getCached();
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

    // 排陣型：依 team.formation 算 11 個位置
    const formation = team?.formation || '4-3-3';
    const positions = _formationPositions(formation);

    const now = new Date();
    // 場上 = in_starting_11 且非傷停（傷停顯示在板凳）
    const starters = players.filter(p => p.in_starting_11 &&
      (!p.injured_until || new Date(p.injured_until) <= now));
    const bench = players.filter(p => !p.in_starting_11 ||
      (p.injured_until && new Date(p.injured_until) > now));

    // 解鎖的陣型：初始只 4-3-3、抽到的教練會解鎖更多
    const unlocked = await _fetchUnlockedFormations();

    content.innerHTML = `
      <div class="mt-stadium-tab ${_swapPending ? 'mt-swap-mode' : ''}">
        <div class="mt-formation-bar">
          <span style="font-size:11px;opacity:0.7;margin-right:8px">📋 陣型</span>
          ${['4-3-3','4-4-2','3-5-2','5-3-2','4-2-3-1','3-4-3','4-5-1','4-1-4-1'].map(f => {
            const isUnlocked = unlocked.has(f);
            const isActive = formation === f;
            const label = isUnlocked ? f : f.replace(/\d/g, '?');
            return `<button class="mt-formation-opt ${isActive ? 'sel' : ''} ${isUnlocked ? '' : 'locked'}"
              data-formation="${f}" ${isUnlocked ? '' : 'disabled'}
              title="${isUnlocked ? '' : '抽到對應教練才能解鎖'}">
              ${isUnlocked ? '' : '🔒 '}${label}
            </button>`;
          }).join('')}
        </div>
        <div class="mt-stadium-pitch" id="mt-stadium-pitch">
          <div class="mt-pitch-line mt-pitch-mid"></div>
          <div class="mt-pitch-circle"></div>
          <div class="mt-pitch-box mt-pitch-box-bottom"></div>
          <div class="mt-pitch-box mt-pitch-box-top"></div>
          <div class="mt-pitch-goalbox mt-pitch-goalbox-bottom"></div>
          <div class="mt-pitch-goalbox mt-pitch-goalbox-top"></div>
        </div>
        <div class="mt-bench-section">
          <div class="mt-bench-title">板凳球員 <span style="opacity:0.6">(${bench.length})</span></div>
          <div class="mt-swap-banner-slot" id="mt-swap-banner-slot"></div>
          <div class="mt-bench-strip" id="mt-bench-strip"></div>
        </div>
      </div>
    `;

    // 陣型 click → 切陣型
    content.querySelectorAll('.mt-formation-opt:not(.locked)').forEach(btn => {
      btn.addEventListener('click', async () => {
        const f = btn.dataset.formation;
        if (f === formation) return;
        try {
          const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : team.user_id;
          await window.DB.from('my_team').update({ formation: f }).eq('user_id', uid);
          await window.MyTeam.refresh?.();
          renderTab();
        } catch (e) {
          alert('切換陣型失敗：' + (e.message || e));
        }
      });
    });

    // 場上：依 starting_slot 放定點。沒 slot 的（舊資料）退到 index 補位
    const pitch = content.querySelector('#mt-stadium-pitch');
    const usedSlots = new Set();
    starters.forEach(p => {
      if (Number.isInteger(p.starting_slot)) {
        usedSlots.add(p.starting_slot);
        const pos = positions[p.starting_slot] || { x: 50, y: 50 };
        pitch.appendChild(_buildStadiumPlayer(p, pos, 'starter'));
      }
    });
    // 沒 slot 的退到剩餘 slot
    let nextFreeSlot = 0;
    starters.filter(p => !Number.isInteger(p.starting_slot)).forEach(p => {
      while (usedSlots.has(nextFreeSlot) && nextFreeSlot < 11) nextFreeSlot++;
      const pos = positions[nextFreeSlot] || { x: 50, y: 50 };
      usedSlots.add(nextFreeSlot);
      pitch.appendChild(_buildStadiumPlayer(p, pos, 'starter'));
    });

    // 渲染空位（虛線圓圈，可接收 drop / click）
    for (let i = 0; i < positions.length; i++) {
      if (usedSlots.has(i)) continue;
      const pos = positions[i];
      const empty = document.createElement('button');
      empty.className = 'mt-pitch-empty-slot';
      empty.dataset.slot = i;
      empty.dataset.slotRole = pos.role || '';
      empty.style.left = pos.x + '%';
      empty.style.top = pos.y + '%';
      empty.innerHTML = `
        <span class="mt-pitch-empty-plus">+</span>
        <span class="mt-pitch-empty-role">${pos.role || ''}</span>
      `;
      empty.addEventListener('click', () => {
        if (_swapPending) {
          _placePlayerAtSlot(_swapPending, i);
        } else {
          // 空閒模式點空位 → 提示去板凳選人
          if (typeof showToast === 'function') {
            showToast('👇 從板凳選一位球員，再點此位置');
          }
        }
      });
      pitch.appendChild(empty);
    }

    // 啟用拖拽：場上球員可被拖去其他 slot（互換 / 移到空位）
    _enableStarterDragDrop(pitch);

    const strip = content.querySelector('#mt-bench-strip');
    if (!bench.length) {
      strip.innerHTML = '<div style="opacity:0.5;font-size:12px;padding:8px">沒有板凳球員</div>';
    } else {
      bench.forEach(p => {
        const el = _buildBenchPlayer(p);
        strip.appendChild(el);
      });
    }

    // 進場時若已在替換模式 → 注入 banner
    if (_swapPending) _mountSwapBanner(content);
  }

  // 動態注入替換橫幅到板凳區上方
  function _mountSwapBanner(content) {
    const slot = content.querySelector('#mt-swap-banner-slot');
    if (!slot || !_swapPending) return;
    slot.innerHTML = `
      <div class="mt-swap-prompt-banner">
        <span class="mt-swap-prompt-icon">👆</span>
        <span class="mt-swap-prompt-text">點上方位置以換上 <b>${escapeHtml(_swapPending.card?.name || '')}</b>（${_swapPending.card?.position || ''}）</span>
        <button class="mt-swap-cancel-btn" id="mt-swap-cancel">取消</button>
      </div>
    `;
    slot.querySelector('#mt-swap-cancel').addEventListener('click', () => _exitSwapMode());
  }

  function _exitSwapMode() {
    _swapPending = null;
    const content = _overlay?.querySelector('#mt-hub-content');
    if (!content) return;
    content.querySelector('.mt-stadium-tab')?.classList.remove('mt-swap-mode');
    content.querySelector('#mt-swap-banner-slot').innerHTML = '';
    content.querySelectorAll('.mt-pitch-player').forEach(el => {
      el.classList.remove('mt-swap-target', 'mt-swap-target-match');
    });
  }

  // 進入替換模式：永遠讓使用者挑位置（不再自動 promote）
  async function _enterSwapMode(benchPlayer) {
    _swapPending = benchPlayer;
    if (_currentTab !== 'roster') {
      _currentTab = 'roster';
      document.querySelector('.mt-hub-tab[data-tab="roster"]')?.click();
      return;
    }
    // 已在 roster：smooth 加 class + banner
    const content = _overlay?.querySelector('#mt-hub-content');
    if (!content) return;
    content.querySelector('.mt-stadium-tab')?.classList.add('mt-swap-mode');
    _mountSwapBanner(content);
    // 標記場上球員（同位置亮綠框）
    const benchPos = benchPlayer.card?.position || '';
    content.querySelectorAll('.mt-pitch-player').forEach(el => {
      el.classList.add('mt-swap-target');
      const slotRole = el.dataset.slotRole || '';
      if (_positionMatches(slotRole, benchPos)) el.classList.add('mt-swap-target-match');
    });
  }

  // 撈使用者已解鎖的陣型（4-3-3 預設、抽到的教練解鎖更多）
  async function _fetchUnlockedFormations() {
    const set = new Set(['4-3-3']);
    if (!window.DB || !window.currentUser && typeof currentUser === 'undefined') return set;
    try {
      const { data } = await window.DB.from('user_coach')
        .select('coach:coach_pool(trait_value)');
      (data || []).forEach(uc => {
        const f = uc.coach?.trait_value?.unlocks_formation;
        if (f) set.add(f);
      });
    } catch (e) {}
    return set;
  }

  // 陣型 → 11 個 (x, y) %（pitch 是 home 視角，下半場為我方）
  function _formationPositions(f) {
    const parts = String(f || '4-3-3').split('-').map(n => parseInt(n)).filter(Number.isFinite);
    let def, mid, amc, fwd;
    if (parts.length === 3) { def = parts[0]; mid = parts[1]; amc = 0; fwd = parts[2]; }
    else if (parts.length === 4) { def = parts[0]; mid = parts[1]; amc = parts[2]; fwd = parts[3]; }
    else { def = 4; mid = 3; amc = 0; fwd = 3; }

    const positions = [];
    positions.push({ x: 50, y: 90, role: 'GK' });
    const place = (count, yPct, role) => {
      for (let i = 0; i < count; i++) {
        positions.push({ x: (i + 1) / (count + 1) * 100, y: yPct, role });
      }
    };
    place(def, 73, 'DEF');
    place(mid, 53, 'MID');
    if (amc > 0) place(amc, 40, 'AMC');
    place(fwd, 25, 'FWD');
    return positions;
  }

  function _buildStadiumPlayer(p, pos, kind) {
    const c = p.card || {};
    const el = document.createElement('button');
    const slotRole = pos.role || '';
    const playerPos = c.position || '';
    const posMatch = _positionMatches(slotRole, playerPos);
    el.className = `mt-pitch-player rarity-${c.rarity || 'R'}` + (posMatch ? '' : ' mt-pos-mismatch');

    if (_swapPending) {
      el.classList.add('mt-swap-target');
      const benchPos = _swapPending.card?.position || '';
      if (_positionMatches(slotRole, benchPos)) {
        el.classList.add('mt-swap-target-match');
      }
    }

    el.style.left = pos.x + '%';
    el.style.top = pos.y + '%';
    el.dataset.playerId = p.id;
    el.dataset.slotRole = slotRole;
    if (Number.isInteger(p.starting_slot)) el.dataset.slot = p.starting_slot;
    const imgId = `pitch-${p.id}`;
    const isInjured = p.injured_until && new Date(p.injured_until) > new Date();
    const fallback = (typeof window.MyTeamPortrait === 'function') ? window.MyTeamPortrait(c.card_id, c.rarity) : '';
    // 紅色遊戲感驚嘆號 — 標籤之外，獨立漂浮
    const warnBubble = posMatch ? '' :
      `<span class="mt-pos-warn-bubble" title="位置不符：槽位 ${slotRole}、球員 ${playerPos}">!</span>`;
    el.innerHTML = `
      <div class="mt-pitch-player-portrait">
        <img id="${imgId}" alt="${escapeHtml(c.name || '')}" loading="lazy" src="${fallback}" onerror="this.style.opacity='0.3'">
        ${isInjured ? '<span class="mt-pitch-injury">🏥</span>' : ''}
        <span class="mt-pitch-player-pos pos-${c.position || ''}">${c.position || ''}</span>
        ${warnBubble}
      </div>
      <div class="mt-pitch-player-name">${escapeHtml(c.name || '?')}</div>
      <div class="mt-pitch-player-stat">Lv.${p.level}${p.bond ? ' ★'.repeat(p.bond) : ''}</div>
    `;
    const look = window.LpcRenderer && window.LpcRenderer.resolveLook(p);
    const team = window.MyTeam.getCached();
    const kit = team ? { shirtColor: team.kit_shirt_color, pantsColor: team.kit_pants_color } : null;
    if (look && window.LpcRenderer) {
      window.LpcRenderer.portrait(look, { kit }).then(url => {
        const img = document.getElementById(imgId);
        if (img && url) img.src = url;
      }).catch(() => {});
    }
    el.addEventListener('click', () => {
      if (_swapPending) {
        const benchPlayer = _swapPending;
        _executeSwap(p, benchPlayer);
      } else {
        _openPlayerProfile(p);
      }
    });
    return el;
  }

  // 位置匹配規則：槽位 GK 嚴格、DEF/MID/FWD 對應、AMC 算 MID/FWD 通用
  function _positionMatches(slotRole, playerPos) {
    if (!slotRole || !playerPos) return true;
    if (slotRole === 'GK') return playerPos === 'GK';
    if (slotRole === 'AMC') return playerPos === 'MID' || playerPos === 'FWD';
    return slotRole === playerPos;
  }

  function _buildBenchPlayer(p) {
    const c = p.card || {};
    const el = document.createElement('button');
    el.className = `mt-bench-player rarity-${c.rarity || 'R'}`;
    el.dataset.playerId = p.id;
    const imgId = `bench-${p.id}`;
    const isInjured = p.injured_until && new Date(p.injured_until) > new Date();
    const fallback = (typeof window.MyTeamPortrait === 'function') ? window.MyTeamPortrait(c.card_id, c.rarity) : '';
    el.innerHTML = `
      ${isInjured ? '<span class="mt-bench-injury">🏥</span>' : ''}
      <span class="mt-bench-rarity">${c.rarity || 'R'}</span>
      <span class="mt-bench-position pos-${c.position || ''}">${c.position || ''}</span>
      <img id="${imgId}" alt="${escapeHtml(c.name || '')}" src="${fallback}" onerror="this.style.opacity='0.3'">
      <div class="mt-bench-name">${escapeHtml(c.name || '?')}</div>
      <div class="mt-bench-pos">Lv.${p.level}</div>
    `;
    const look = window.LpcRenderer && window.LpcRenderer.resolveLook(p);
    const team = window.MyTeam.getCached();
    const kit = team ? { shirtColor: team.kit_shirt_color, pantsColor: team.kit_pants_color } : null;
    if (look && window.LpcRenderer) {
      window.LpcRenderer.portrait(look, { kit }).then(url => {
        const img = document.getElementById(imgId);
        if (img && url) img.src = url;
      }).catch(() => {});
    }
    el.addEventListener('click', () => _openPlayerProfile(p));
    return el;
  }

  // ── helper：判斷球員是否為當前隊長 ──
  function _isCaptain(player) {
    const team = window.MyTeam.getCached();
    return team && player && team.captain_player_id === player.id;
  }

  // ── helper：把 team_crest 渲染為 SVG（fallback emoji）──
  function _renderCrest(team) {
    if (!team || !window.TeamCrests) return '⚽';
    const id = team.team_crest && window.TeamCrests.listCrests().includes(team.team_crest)
      ? team.team_crest : 'football';
    const primary = team.crest_primary || '#c0392b';
    const accent  = team.crest_accent  || '#f1c40f';
    return window.TeamCrests.getSvg(id, primary, accent);
  }

  // ─────────── 教練 tab：教練辦公室 ───────────────────────────────
  async function renderCoachTab(content) {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') return;
    const coachTickets = team.coach_tickets || 0;
    const coaches = await _fetchUserCoaches();
    const active = coaches.find(c => c.id === team.active_coach_id);
    const formation = team?.formation || '4-3-3';
    const positions = _formationPositions(formation);
    const SLOTS = 8;

    content.innerHTML = `
      <div class="mt-coach-office">
        <div class="mt-coach-office-title">
          📋 教練辦公室
          <span class="mt-coach-office-formation">${formation}</span>
        </div>

        <!-- 中央黑板：畫陣型 + X/O 戰術 -->
        <div class="mt-coach-blackboard">
          <svg class="mt-coach-blackboard-svg" viewBox="0 0 240 180" preserveAspectRatio="none" aria-hidden="true">
            <!-- 黑板 -->
            <rect x="2" y="2" width="236" height="176" rx="3" fill="#1d3a2c" stroke="#7a5230" stroke-width="5"/>
            <!-- 中線 + 中圈 -->
            <line x1="20" y1="90" x2="220" y2="90" stroke="rgba(255,255,255,0.35)" stroke-width="1" stroke-dasharray="3,3"/>
            <circle cx="120" cy="90" r="18" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
            <!-- 球員圓點（依當前陣型） -->
            ${positions.map(p => `<circle cx="${20 + p.x * 2}" cy="${10 + p.y * 1.6}" r="4" fill="#90caf9" stroke="#fff" stroke-width="1"/>`).join('')}
            <!-- 戰術箭頭（裝飾） -->
            <path d="M 60 110 Q 90 90 120 100" stroke="#f0c040" fill="none" stroke-width="1.5" stroke-dasharray="2,2"/>
            <path d="M 150 80 Q 180 60 200 70" stroke="#f0c040" fill="none" stroke-width="1.5" stroke-dasharray="2,2"/>
          </svg>
          <div class="mt-coach-board-label">${escapeHtml(active?.coach?.name || '尚未指派主教練')}</div>
          ${active ? `<div class="mt-coach-board-trait">${escapeHtml(_traitLabel(active.coach?.trait, active.coach?.trait_value))}</div>` : ''}
        </div>

        <!-- 教練站位：左 4 / 右 4 -->
        <div class="mt-coach-line mt-coach-line-l" id="mt-coach-line-l"></div>
        <div class="mt-coach-line mt-coach-line-r" id="mt-coach-line-r"></div>

        <!-- 木地板 -->
        <div class="mt-coach-floor"></div>

        <!-- 底部：抽教練 + 教練券 -->
        <div class="mt-coach-actions">
          <span class="mt-gacha-chip mt-gacha-chip-ticket">🎫 <b>${coachTickets}</b></span>
          <button class="mt-coach-draw-btn mt-coach-draw-1" data-count="1" ${coachTickets < 1 ? 'disabled' : ''}>
            🎫 抽 1 教練
          </button>
          <button class="mt-coach-draw-btn mt-coach-draw-10" data-count="10" ${coachTickets < 10 ? 'disabled' : ''}>
            🎫 10 連抽
          </button>
        </div>
      </div>
    `;

    // 安排教練到左右兩排（每邊最多 4 位、超過時溢出）
    const lineL = content.querySelector('#mt-coach-line-l');
    const lineR = content.querySelector('#mt-coach-line-r');
    const arrange = (uc, lineEl, idx) => {
      const c = uc.coach || {};
      const isActive = uc.id === team.active_coach_id;
      const slotDiv = document.createElement('button');
      slotDiv.className = `mt-coach-slot rarity-${c.rarity || 'R'}${isActive ? ' active' : ''}`;
      slotDiv.dataset.ucid = uc.id;
      const imgId = `coach-portrait-${uc.id.slice(0,8)}`;
      slotDiv.innerHTML = `
        ${isActive ? '<span class="mt-coach-active-crown">👑</span>' : ''}
        <div class="mt-coach-slot-portrait"><img id="${imgId}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.style.opacity='0.3'"></div>
        <div class="mt-coach-slot-name">${escapeHtml(c.name || '?')}</div>
        <span class="mt-coach-slot-rarity rarity-${c.rarity || 'R'}">${c.rarity || 'R'}</span>
      `;
      lineEl.appendChild(slotDiv);
      const look = uc.look_data || c.look_data;
      if (look && window.LpcRenderer) {
        window.LpcRenderer.portrait(look).then(url => {
          const img = document.getElementById(imgId);
          if (img && url) img.src = url;
        }).catch(() => {});
      }
    };

    // 把 active 教練放第一位（任一邊），剩下平均分配
    const ordered = active ? [active, ...coaches.filter(c => c.id !== active.id)] : coaches;
    ordered.forEach((uc, i) => arrange(uc, i % 2 === 0 ? lineL : lineR, i));

    // 空位：剪影（未擁有）
    const remaining = Math.max(0, SLOTS - ordered.length);
    for (let i = 0; i < remaining; i++) {
      const ghost = document.createElement('div');
      ghost.className = 'mt-coach-slot mt-coach-slot-ghost';
      ghost.innerHTML = `
        <div class="mt-coach-slot-portrait mt-coach-slot-portrait-ghost">?</div>
        <div class="mt-coach-slot-name">未聘任</div>
      `;
      ((ordered.length + i) % 2 === 0 ? lineL : lineR).appendChild(ghost);
    }

    // 點教練 → 設為主教練
    content.querySelectorAll('.mt-coach-slot:not(.mt-coach-slot-ghost)').forEach(slot => {
      slot.addEventListener('click', async () => {
        const ucid = slot.dataset.ucid;
        if (slot.classList.contains('active')) return;
        slot.classList.add('mt-coach-setting');
        try {
          await window.DB.rpc('set_active_coach', { p_user_coach_id: ucid });
          await window.MyTeam.refresh?.();
          renderTab();
        } catch (e) {
          alert('設定失敗：' + (e.message || e));
          slot.classList.remove('mt-coach-setting');
        }
      });
    });

    // 抽教練（有動畫 + 結果彈窗）
    content.querySelectorAll('.mt-coach-draw-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cnt = parseInt(btn.dataset.count, 10);
        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = '⏳ 簽約中…';
        try {
          const res = await window.MyTeam.drawCoach(cnt);
          await window.MyTeam.refresh?.();
          // 抽完顯示結果動畫
          _showCoachDrawResult(res?.coaches || res || []);
        } catch (e) {
          const msg = String(e.message || e);
          let friendly = '抽教練失敗：' + msg;
          if (msg.includes('INSUFFICIENT_COACH_TICKETS')) friendly = '⚠️ 教練券不足';
          else if (msg.includes('NO_TEAM')) friendly = '⚠️ 請先建立球隊';
          if (typeof showToast === 'function') showToast(friendly);
          else alert(friendly);
          btn.disabled = false;
          btn.innerHTML = originalLabel;
        }
      });
    });
  }

  // 教練抽卡結果動畫：彈出大卡 + 揭曉動畫
  async function _showCoachDrawResult(results) {
    const list = Array.isArray(results) ? results : [];
    if (!list.length) {
      renderTab();
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'mt-coach-result-overlay';
    overlay.innerHTML = `
      <div class="mt-coach-result-modal">
        <div class="mt-coach-result-title">👔 新教練加入！</div>
        <div class="mt-coach-result-grid" id="mt-coach-result-grid"></div>
        <button class="mt-settings-action-btn" id="mt-coach-result-close" style="max-width:200px;margin:14px auto 0">確認</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const grid = overlay.querySelector('#mt-coach-result-grid');
    list.forEach((c, i) => {
      const rarity = c.rarity || 'R';
      const isDup = c.is_duplicate || c.duplicate;
      const card = document.createElement('div');
      card.className = `mt-coach-result-card rarity-${rarity}`;
      card.style.animationDelay = `${i * 0.18}s`;
      const imgId = `coach-result-${i}`;
      card.innerHTML = `
        <div class="mt-coach-result-rarity">${rarity}</div>
        ${isDup ? '<div class="mt-coach-result-dup">★+1 升級</div>' : ''}
        <div class="mt-coach-result-portrait"><img id="${imgId}" alt="${escapeHtml(c.name || '')}" onerror="this.style.opacity='0.3'"></div>
        <div class="mt-coach-result-name">${escapeHtml(c.name || '?')}</div>
        <div class="mt-coach-result-nickname">${escapeHtml(c.nickname || '')}</div>
        <div class="mt-coach-result-trait">${escapeHtml(_traitLabel(c.trait, c.trait_value))}</div>
      `;
      grid.appendChild(card);
      if (c.look_data && window.LpcRenderer) {
        window.LpcRenderer.portrait(c.look_data).then(url => {
          const img = document.getElementById(imgId);
          if (img && url) img.src = url;
        }).catch(() => {});
      }
    });

    overlay.querySelector('#mt-coach-result-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => {
        overlay.remove();
        renderTab();
      }, 200);
    });
    // 點背景也關
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.querySelector('#mt-coach-result-close').click();
    });
  }

  function _traitLabel(trait, value) {
    if (!trait) return '';
    if (value && value.description) return value.description;
    if (value && value.attr) {
      const attrCN = { attack:'攻擊', defense:'防守', speed:'速度', midfield:'中場', stamina:'體力', aura:'氣場' };
      return `${attrCN[value.attr] || value.attr} +${Math.round(value.pct * 100)}%`;
    }
    return trait;
  }

  async function _fetchUserCoaches() {
    if (!window.DB || !window.currentUser) return [];
    const { data, error } = await window.DB.from('user_coach')
      .select('*, coach:coach_pool(*)')
      .order('hired_at', { ascending: false });
    if (error) { console.warn('fetch coaches', error); return []; }
    return data || [];
  }

  // ─────────── 球員個人主頁 ───────────────────────────
  function _openPlayerProfile(p) {
    const c = p.card || {};
    const overlay = document.createElement('div');
    overlay.className = 'mt-profile-overlay';
    const isInjured = p.injured_until && new Date(p.injured_until) > new Date();
    const injuryDays = isInjured ? Math.ceil((new Date(p.injured_until) - new Date()) / 86400000) : 0;

    const lore = _generateLore(c.card_id, c.name, c.position, c.rarity);
    const look = window.LpcRenderer && window.LpcRenderer.resolveLook(p);
    const portraitId = `profile-portrait-${p.id}`;

    const talentMap = {
      speedster: '⚡ 衝刺型', bodybuilder: '💪 體能怪', shooter: '🎯 神射手',
      wall: '🛡️ 城牆', magician: '✨ 魔法師',
    };
    const talentLabel = c.talent ? talentMap[c.talent] || c.talent : '';
    const rarityClass = `rarity-${c.rarity || 'R'}`;

    overlay.innerHTML = `
      <div class="mt-profile-card ${rarityClass}">
        <button class="mt-modal-close mt-profile-close" type="button">×</button>

        ${isInjured ? `<div class="mt-profile-injury-banner">🏥 受傷中・剩 ${injuryDays} 天</div>` : ''}

        <div class="mt-profile-hero">
          <div class="mt-profile-portrait-wrap">
            <img id="${portraitId}" class="mt-profile-portrait" alt="${escapeHtml(c.name)}"
              src="${(typeof window.MyTeamPortrait === 'function') ? window.MyTeamPortrait(c.card_id, c.rarity) : ''}"
              onerror="this.style.display='none'">
            <span class="mt-profile-rarity">${c.rarity || 'R'}</span>
          </div>
          <div class="mt-profile-meta">
            <div class="mt-profile-name">${escapeHtml(c.name || '?')}</div>
            ${c.nickname ? `<div class="mt-profile-nick">「${escapeHtml(c.nickname)}」</div>` : ''}
            <div class="mt-profile-pos">${c.position}・Lv.${p.level}${p.bond ? ' ★'.repeat(p.bond) : ''}</div>
            ${talentLabel ? `<div class="mt-profile-talent">${talentLabel}</div>` : ''}
          </div>
        </div>

        <div class="mt-profile-radar">
          ${_radarBar('攻擊', p.current_attack)}
          ${_radarBar('防守', p.current_defense)}
          ${c.position === 'GK' ? _radarBar('守門', Math.min(99, p.current_defense + 12)) : ''}
          ${_radarBar('速度', p.current_speed)}
          ${_radarBar('中場', p.current_midfield)}
          ${_radarBar('體力', p.current_stamina, '影響後半場耐疲勞度')}
          ${_radarBar('氣場', p.current_aura)}
        </div>

        <div class="mt-profile-lore">
          <div class="mt-profile-lore-title">📖 球員小傳</div>
          <div class="mt-profile-lore-text">${escapeHtml(lore)}</div>
        </div>

        <div class="mt-profile-actions">
          <button class="mt-profile-btn" data-act="toggle-start">
            ${p.in_starting_11 ? '🪑 撤下先發' : '⚽ 設為先發'}
          </button>
          <button class="mt-profile-btn ${_isCaptain(p) ? 'mt-profile-btn-active' : ''}" data-act="captain">
            ${_isCaptain(p) ? '👑 已是隊長' : '👑 設為隊長'}
          </button>
          <button class="mt-profile-btn" data-act="train">⚙️ 訓練</button>
          ${isInjured ? '<button class="mt-profile-btn" data-act="heal">💊 用恢復包</button>' : ''}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    if (look && window.LpcRenderer) {
      const team = window.MyTeam.getCached();
      const kit = team ? { shirtColor: team.kit_shirt_color, pantsColor: team.kit_pants_color } : null;
      window.LpcRenderer.portrait(look, { scale: 6, kit }).then(url => {
        const img = document.getElementById(portraitId);
        if (img && url) img.src = url;
      }).catch(() => {});
    }

    overlay.querySelector('.mt-profile-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    });

    overlay.querySelector('[data-act="toggle-start"]').addEventListener('click', async () => {
      try {
        if (p.in_starting_11) {
          // 已在先發 → 直接撤下（用 RPC 清 slot）
          await window.DB.rpc('demote_to_bench', { p_player_id: p.id });
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
          await window.MyTeam.refresh?.();
          renderTab();
        } else {
          // 板凳 → 切替換模式
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
          setTimeout(() => _enterSwapMode(p), 220);
        }
      } catch (e) {
        alert('更新失敗：' + (e.message || e));
      }
    });
    overlay.querySelector('[data-act="captain"]').addEventListener('click', async () => {
      const isCap = _isCaptain(p);
      try {
        await window.DB.rpc('set_captain', { p_player_id: isCap ? null : p.id });
        await window.MyTeam.refresh?.();
        if (typeof showToast === 'function') {
          showToast(isCap ? '👑 已撤銷隊長' : `👑 ${p.card?.name || ''} 已成為隊長`);
        }
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 200);
        renderTab();
      } catch (e) {
        alert('設定隊長失敗：' + (e.message || e));
      }
    });

    overlay.querySelector('[data-act="train"]').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      _currentTab = 'train';
      document.querySelector('.mt-hub-tab[data-tab="train"]')?.click();
    });
    overlay.querySelector('[data-act="heal"]')?.addEventListener('click', async () => {
      try {
        await window.MyTeam.useItem('recovery_kit', p.id);
        if (typeof showToast === 'function') showToast('💊 已治療');
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 200);
        renderTab();
      } catch (e) {
        const msg = (e.message || String(e));
        alert(msg.includes('NOT_OWNED') ? '沒有恢復包，去商店買吧' : '治療失敗：' + msg);
      }
    });
  }

  // ── 替換模式：切到 roster tab + 點陣型上的位置換上 bench player ──
  let _swapPending = null;
  // 舊呼叫端 → 轉接到新流程
  async function _openSwapDialog(benchPlayer) {
    return _enterSwapMode(benchPlayer);
  }

  async function _executeSwap(targetStarter, benchPlayer) {
    // 點場上球員代表「把板凳的人換到這個 slot」
    return _placePlayerAtSlot(benchPlayer, targetStarter.starting_slot, {
      fromBenchEl: true,
      toStarterId: targetStarter.id,
      toastName: `${benchPlayer.card?.name} ⇄ ${targetStarter.card?.name}`,
    });
  }

  // 統一的放置動作（換 slot / 上場 / 互換）
  async function _placePlayerAtSlot(player, targetSlot, opts = {}) {
    const content = _overlay?.querySelector('#mt-hub-content');
    const playerEl = content?.querySelector(`[data-player-id="${player.id}"]`);
    if (playerEl) playerEl.classList.add('mt-swap-leaving');
    const occupierEl = opts.toStarterId
      ? content?.querySelector(`.mt-pitch-player[data-player-id="${opts.toStarterId}"]`)
      : null;
    if (occupierEl) occupierEl.classList.add('mt-swap-leaving');

    try {
      const { error } = await window.DB.rpc('place_player_at_slot', {
        p_player_id:   player.id,
        p_target_slot: targetSlot,
      });
      if (error) throw error;
    } catch (e) {
      if (playerEl) playerEl.classList.remove('mt-swap-leaving');
      if (occupierEl) occupierEl.classList.remove('mt-swap-leaving');
      const msg = String(e.message || e);
      if (msg.includes('STARTERS_FULL')) alert('先發已滿、需要替換');
      else alert('移動失敗：' + msg);
      return;
    }

    _swapPending = null;
    await window.MyTeam.refresh?.();
    setTimeout(() => {
      content?.querySelector('.mt-stadium-tab')?.classList.remove('mt-swap-mode');
      renderTab();
      if (opts.toastName && typeof showToast === 'function') {
        showToast(`✅ ${opts.toastName}`);
      } else if (typeof showToast === 'function') {
        showToast(`✅ ${player.card?.name || '球員'} 已就定位`);
      }
    }, 220);
  }

  // ── 拖拽：場上球員 → 其他 slot（pointer events，支援 mouse + touch）──
  function _enableStarterDragDrop(pitch) {
    if (!pitch) return;
    let dragging = null;
    let ghost = null;

    const onDown = (e) => {
      const btn = e.target.closest('.mt-pitch-player');
      if (!btn || _swapPending) return;
      // 用 pointerdown 後等 150ms 才開始拖（避免誤觸 click 進球員資料）
      const startX = e.clientX, startY = e.clientY;
      const playerId = btn.dataset.playerId;
      const slot = parseInt(btn.dataset.slot, 10);
      let started = false;
      let cleanupListeners = null;

      const startDrag = () => {
        if (started) return;
        started = true;
        dragging = { btn, playerId, slot, startX, startY };
        ghost = btn.cloneNode(true);
        ghost.classList.add('mt-drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = e.clientX + 'px';
        ghost.style.top  = e.clientY + 'px';
        ghost.style.pointerEvents = 'none';
        ghost.style.transform = 'translate(-50%, -50%) scale(1.1)';
        ghost.style.opacity = '0.85';
        ghost.style.zIndex = '13000';
        document.body.appendChild(ghost);
        btn.classList.add('mt-being-dragged');
        pitch.classList.add('mt-drag-active');
      };

      const onMove = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!started && Math.hypot(dx, dy) > 8) {
          startDrag();
        }
        if (started && ghost) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top  = ev.clientY + 'px';
        }
      };

      const onUp = (ev) => {
        if (cleanupListeners) cleanupListeners();
        if (!started) return;
        // 取消選 highlight
        if (ghost) { ghost.remove(); ghost = null; }
        btn.classList.remove('mt-being-dragged');
        pitch.classList.remove('mt-drag-active');
        // 找放在哪
        const dropEl = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!dropEl) { dragging = null; return; }
        const targetPlayer = dropEl.closest('.mt-pitch-player');
        const targetEmpty  = dropEl.closest('.mt-pitch-empty-slot');
        let targetSlot = null;
        if (targetPlayer && targetPlayer.dataset.playerId !== playerId) {
          targetSlot = parseInt(targetPlayer.dataset.slot, 10);
        } else if (targetEmpty) {
          targetSlot = parseInt(targetEmpty.dataset.slot, 10);
        }
        if (Number.isInteger(targetSlot)) {
          window.MyTeam.fetchPlayers().then(players => {
            const player = players.find(p => p.id === playerId);
            if (player) _placePlayerAtSlot(player, targetSlot, { toastName: `${player.card?.name} 移到新位置` });
          });
        }
        dragging = null;
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
      window.addEventListener('pointercancel', onUp, { once: true });
      cleanupListeners = () => {
        window.removeEventListener('pointermove', onMove);
      };
    };

    pitch.addEventListener('pointerdown', onDown);
  }

  function _radarBar(label, val, tooltip) {
    const pct = Math.min(100, Math.max(0, val));
    const color = pct >= 85 ? '#f0c040' : pct >= 70 ? '#9b87f5' : pct >= 50 ? '#90caf9' : '#888';
    return `
      <div class="mt-radar-row"${tooltip ? ` title="${tooltip}"` : ''}>
        <span class="mt-radar-label">${label}</span>
        <div class="mt-radar-bar"><div style="width:${pct}%;background:${color}"></div></div>
        <span class="mt-radar-val">${val}</span>
      </div>
    `;
  }

  // 球員 lore：依 card_id seed 產生穩定描述
  function _generateLore(cardId, name, position, rarity) {
    if (!cardId) return '神秘來歷的球員。';
    let h = 0;
    for (const ch of String(cardId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rand = () => { h = (h * 9301 + 49297) % 233280; return h / 233280; };

    const origins = ['南美雨林之中', '北歐冰原邊陲', '東歐古鎮', '西非草原', '地中海沿岸',
      '東亞港都', '中亞高原', '南亞河谷', '巴爾幹半島', '中東沙漠綠洲'];
    const traits = ['沉默寡言', '熱血直率', '冷靜分析', '愛開玩笑', '虔誠專注',
      '神秘難測', '勤奮努力', '天才橫溢'];
    const hobbies = ['彈吉他', '收集球鞋', '畫畫', '看老電影', '養貓', '料理',
      '健身', '寫詩', '看書', '玩電玩'];
    const ageBase = rarity === 'SSR' ? 24 : rarity === 'SR' ? 22 : 20;
    const age = ageBase + Math.floor(rand() * 12) - 4;
    const origin = origins[Math.floor(rand() * origins.length)];
    const trait = traits[Math.floor(rand() * traits.length)];
    const hobby = hobbies[Math.floor(rand() * hobbies.length)];

    return `${age} 歲，來自${origin}。性格${trait}，閒暇時${hobby}。${
      rarity === 'SSR' ? '球壇公認的天才，被各國強隊爭相挖角。' :
      rarity === 'SR'  ? '正當打之年，下一個 SSR 候選人。' :
      '充滿潛力的新秀，等待綻放的一天。'
    }`;
  }

  // ─────────── 任務 tab ───────────────────────────────
  async function renderQuestTab(content) {
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入任務中…</div>';
    const { templates, state } = await window.MyTeam.fetchQuests();
    if (!templates || !templates.length) {
      content.innerHTML = `
        <div class="mt-tab-todo">
          <div class="mt-tab-todo-icon">📋</div>
          <div>任務尚未開放</div>
          <div style="font-size:11px;opacity:0.6;margin-top:6px">資料庫尚未 seed、待管理員初始化</div>
        </div>`;
      return;
    }
    const stateMap = {};
    state.forEach(s => { stateMap[s.quest_id + '|' + s.period_key] = s; });
    const today = new Date();
    const dayKey = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    const weekNum = (() => {
      const onejan = new Date(today.getFullYear(), 0, 1);
      return Math.ceil(((today - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    })();
    const weekKey = today.getFullYear() + '-W' + String(weekNum).padStart(2, '0');

    const groupRender = (type, title) => {
      const list = templates.filter(t => t.quest_type === type);
      if (!list.length) return '';
      return `
        <div class="mt-quest-group">
          <div class="mt-quest-group-title">${title}</div>
          ${list.map(t => {
            const pk = type === 'daily' ? dayKey : type === 'weekly' ? weekKey : 'all-time';
            const st = stateMap[t.quest_id + '|' + pk] || { current_count: 0, claimed: false };
            const cur = Math.min(st.current_count, t.target_count);
            const pct = (cur / t.target_count) * 100;
            const done = cur >= t.target_count && !st.claimed;
            const claimed = st.claimed;
            const rewardLabel = _rewardLabel(t.reward);
            return `
              <div class="mt-quest-row ${claimed ? 'claimed' : done ? 'ready' : ''}">
                <div class="mt-quest-info">
                  <div class="mt-quest-name">${escapeHtml(t.name)}</div>
                  <div class="mt-quest-bar"><div style="width:${pct}%"></div></div>
                  <div class="mt-quest-progress">${cur} / ${t.target_count}</div>
                </div>
                <div class="mt-quest-reward">${rewardLabel}</div>
                <button class="mt-quest-claim" data-qid="${t.quest_id}" ${done ? '' : 'disabled'}>
                  ${claimed ? '✓' : done ? '領取' : '進行中'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    content.innerHTML = `
      <div class="mt-quest-tab">
        ${groupRender('daily',  '📋 每日任務（每日 00:00 重置）')}
        ${groupRender('weekly', '📆 每週任務（每週一重置）')}
        ${groupRender('season', '🏆 賽季成就（永久里程碑）')}
      </div>
    `;

    content.querySelectorAll('.mt-quest-claim').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', async () => {
        const qid = btn.dataset.qid;
        btn.disabled = true; btn.textContent = '領取中…';
        try {
          const res = await window.MyTeam.claimQuest(qid);
          if (typeof showToast === 'function') showToast(`✅ 領取：${_rewardLabel(res.reward)}`);
          renderTab();
        } catch (e) {
          alert('領取失敗：' + (e.message || e));
          btn.disabled = false; btn.textContent = '領取';
        }
      });
    });
  }

  function _rewardLabel(r) {
    if (!r) return '';
    const parts = [];
    if (r.tickets)        parts.push('🎟️ ' + r.tickets);
    if (r.coach_tickets)  parts.push('👔 ' + r.coach_tickets);
    if (r.gems)           parts.push('💎 ' + r.gems);
    if (r.rp_all)         parts.push('⚙️ ' + r.rp_all);
    return parts.join(' ');
  }

  // ─────────── 商店 tab ───────────────────────────────
  async function renderShopTab(content) {
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入商店…</div>';
    const { items, inventory } = await window.MyTeam.fetchShopAndInventory();
    if (!items || !items.length) {
      content.innerHTML = `
        <div class="mt-tab-todo">
          <div class="mt-tab-todo-icon">🏪</div>
          <div>商店尚未開放</div>
          <div style="font-size:11px;opacity:0.6;margin-top:6px">資料庫尚未 seed、待管理員初始化</div>
        </div>`;
      return;
    }
    const invMap = {};
    inventory.forEach(i => { invMap[i.item_id] = i.count; });

    const shopList = items.filter(i => i.shop_cost_gems != null);
    const myList = items.filter(i => (invMap[i.item_id] || 0) > 0);

    content.innerHTML = `
      <div class="mt-shop-tab">
        <div class="mt-quest-group-title" style="margin-top:8px">🏪 商店</div>
        <div class="mt-shop-grid">
          ${shopList.map(i => `
            <div class="mt-shop-card">
              <div class="mt-shop-icon">${i.icon || '📦'}</div>
              <div class="mt-shop-name">${escapeHtml(i.name)}</div>
              <div class="mt-shop-desc">${escapeHtml(i.description || '')}</div>
              <button class="mt-shop-buy" data-iid="${i.item_id}">
                💎 ${i.shop_cost_gems} <span>購買</span>
              </button>
            </div>
          `).join('')}
        </div>

        <div class="mt-quest-group-title" style="margin-top:20px">🎒 我的道具</div>
        ${myList.length ? `
          <div class="mt-inv-grid">
            ${myList.map(i => `
              <div class="mt-inv-card">
                <div class="mt-shop-icon">${i.icon}</div>
                <div class="mt-shop-name">${escapeHtml(i.name)} × ${invMap[i.item_id]}</div>
                <div class="mt-shop-desc">${escapeHtml(i.description || '')}</div>
                <button class="mt-inv-use" data-iid="${i.item_id}" data-effect="${i.effect}">使用</button>
              </div>
            `).join('')}
          </div>
        ` : '<div style="opacity:0.5;font-size:13px;padding:12px">背包是空的</div>'}
      </div>
    `;

    content.querySelectorAll('.mt-shop-buy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const iid = btn.dataset.iid;
        btn.disabled = true; btn.textContent = '購買中…';
        try {
          await window.MyTeam.buyShopItem(iid, 1);
          if (typeof showToast === 'function') showToast(`✅ 已購買`);
          renderTab();
        } catch (e) {
          const msg = (e.message || String(e));
          alert(msg.includes('INSUFFICIENT_GEMS') ? '寶石不足' : '購買失敗：' + msg);
          btn.disabled = false;
          btn.innerHTML = btn.innerHTML;
        }
      });
    });

    content.querySelectorAll('.mt-inv-use').forEach(btn => {
      btn.addEventListener('click', async () => {
        const iid = btn.dataset.iid;
        const eff = btn.dataset.effect;
        let target = null;
        if (eff === 'xp_book' || eff === 'recovery') {
          const players = await window.MyTeam.fetchPlayers();
          const choices = players.map((p, i) =>
            `${i + 1}. ${p.card?.name || '?'} Lv.${p.level}${p.injured_until && new Date(p.injured_until) > new Date() ? ' 🏥' : ''}`
          ).join('\n');
          const pick = prompt(`對哪位球員使用？\n${choices}`);
          const idx = parseInt(pick, 10) - 1;
          if (Number.isFinite(idx) && players[idx]) target = players[idx].id;
          else return;
        }
        try {
          await window.MyTeam.useItem(iid, target);
          if (typeof showToast === 'function') showToast('✅ 已使用');
          renderTab();
        } catch (e) {
          alert('使用失敗：' + (e.message || e));
        }
      });
    });
  }

  // ─────────── 圖鑑 tab ───────────────────────────────
  async function renderDexTab(content) {
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入圖鑑…</div>';
    const [ssrCards, players] = await Promise.all([
      window.DB.from('player_card_pool').select('*').eq('rarity', 'SSR').order('position'),
      window.MyTeam.fetchPlayers(),
    ]);
    const ownedSet = new Set((players || []).map(p => p.card?.card_id || p.card_id));
    const ssrs = ssrCards.data || [];
    const ownedCount = ssrs.filter(c => ownedSet.has(c.card_id)).length;

    content.innerHTML = `
      <div class="mt-dex-tab">
        <div class="mt-dex-title">⭐ SSR 圖鑑</div>
        <div class="mt-dex-sub">收集 ${ownedCount} / ${ssrs.length} 張</div>
        <div class="mt-dex-grid">
          ${ssrs.map(c => {
            const owned = ownedSet.has(c.card_id);
            const imgId = 'dex-' + c.card_id;
            return `
              <div class="mt-dex-card ${owned ? 'owned' : 'locked'}">
                <div class="mt-player-portrait"><img id="${imgId}" alt="${escapeHtml(c.name)}" onerror="this.style.opacity='0.3'"></div>
                <div class="mt-dex-name">${owned ? escapeHtml(c.name) : '???'}</div>
                <div class="mt-dex-pos">${c.position}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    ssrs.forEach(c => {
      if (!ownedSet.has(c.card_id)) return; // locked 不 render
      const look = c.look_data;
      if (look && window.LpcRenderer) {
        window.LpcRenderer.portrait(look).then(url => {
          const img = document.getElementById('dex-' + c.card_id);
          if (img && url) img.src = url;
        }).catch(() => {});
      }
    });
  }

  // ─────────── 排行榜 tab ───────────────────────────────
  let _rankMode = 'season'; // 'season' | 'pvp'
  async function renderRankTab(content) {
    content.innerHTML = `
      <div class="mt-rank-tab">
        <div class="mt-rank-mode-tabs">
          <button class="mt-rank-mode-tab ${_rankMode === 'season' ? 'active' : ''}" data-mode="season">🏆 賽季排行</button>
          <button class="mt-rank-mode-tab ${_rankMode === 'pvp' ? 'active' : ''}" data-mode="pvp">⚔️ PvP ELO</button>
        </div>
        <div class="mt-rank-list" id="mt-rank-list">載入中…</div>
      </div>
    `;
    content.querySelectorAll('.mt-rank-mode-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _rankMode = btn.dataset.mode;
        renderRankTab(content);
      });
    });
    _renderRankList(content);
  }

  async function _renderRankList(content) {
    const list = content.querySelector('#mt-rank-list');
    if (!window.DB) { list.innerHTML = '請登入'; return; }
    try {
      let query = window.DB.from('my_team_leaderboard').select('*').limit(50);
      if (_rankMode === 'pvp') {
        query = query.order('pvp_elo', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('points', { ascending: false }).order('goals_for', { ascending: false });
      }
      const { data, error } = await query;
      if (error) throw error;
      if (!data || !data.length) { list.innerHTML = '<div style="opacity:0.5">還沒有玩家上榜</div>'; return; }
      const me = window.currentUser?.id;
      list.innerHTML = data.map((row, i) => {
        const crestSvg = window.TeamCrests ? window.TeamCrests.getSvg(
          row.team_crest || 'football', row.crest_primary, row.crest_accent
        ) : '⚽';
        const medal = ['🥇','🥈','🥉'][i] || (i + 1);
        const isMe = row.user_id === me;
        const statsHtml = _rankMode === 'pvp'
          ? `<div class="mt-rank-stats">
               <div class="mt-rank-pt mt-rank-elo">${row.pvp_elo || 1000} <span>ELO</span></div>
             </div>`
          : `<div class="mt-rank-stats">
               <div class="mt-rank-pt">${row.points || 0} <span>pt</span></div>
               <div class="mt-rank-record">${row.wins || 0}-${row.draws || 0}-${row.losses || 0}</div>
             </div>`;
        const metaHtml = _rankMode === 'pvp'
          ? `${escapeHtml(row.player_name)} · ${row.team_name ? 'S' + (row.season_num || 1) : ''}`
          : `${escapeHtml(row.player_name)} · S${row.season_num || 1} · Tier ${row.current_tier || 1}`;
        return `<div class="mt-rank-row ${isMe ? 'me' : ''}" data-uid="${row.user_id}">
          <div class="mt-rank-pos">${medal}</div>
          <div class="mt-rank-crest">${crestSvg}</div>
          <div class="mt-rank-info">
            <div class="mt-rank-name">${escapeHtml(row.team_name || '')}</div>
            <div class="mt-rank-meta">${metaHtml}</div>
          </div>
          ${statsHtml}
          ${!isMe ? `<button class="mt-rank-friend-btn" data-add="${row.user_id}" title="加好友">＋</button>` : ''}
        </div>`;
      }).join('');

      // 加好友
      list.querySelectorAll('.mt-rank-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const uid = btn.dataset.add;
          btn.disabled = true; btn.textContent = '…';
          try {
            await window.DB.from('user_friend').insert({ user_id: me, friend_id: uid });
            btn.textContent = '✓';
            if (typeof showToast === 'function') showToast('✅ 已加為好友');
          } catch (e) {
            if (String(e.message || '').includes('duplicate')) {
              btn.textContent = '✓';
            } else {
              alert('加好友失敗：' + (e.message || e));
              btn.disabled = false; btn.textContent = '＋';
            }
          }
        });
      });

      // 點隊伍 → 看陣容
      list.querySelectorAll('.mt-rank-row').forEach(row => {
        row.addEventListener('click', () => {
          const uid = row.dataset.uid;
          if (uid && uid !== me) _openOpponentTeamView(uid);
        });
      });
    } catch (e) {
      list.innerHTML = '排行榜載入失敗：' + (e.message || e);
    }
  }

  // ─────────── 朋友 tab ───────────────────────────────
  async function renderFriendsTab(content) {
    content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入好友…</div>';
    const me = window.currentUser?.id;
    if (!me) { content.innerHTML = '請先登入'; return; }
    const { data: friends, error } = await window.DB.from('user_friend')
      .select('friend_id, added_at').eq('user_id', me).order('added_at', { ascending: false });
    if (error) { content.innerHTML = '載入失敗：' + error.message; return; }
    if (!friends || !friends.length) {
      content.innerHTML = `
        <div class="mt-tab-todo">
          <div class="mt-tab-todo-icon">👥</div>
          <div>還沒有好友</div>
          <div style="font-size:12px;margin:8px 0">去排行榜點 + 號加好友</div>
          <button class="mt-gacha-btn" data-go-rank>看排行榜</button>
        </div>
      `;
      content.querySelector('[data-go-rank]').addEventListener('click', () => {
        _currentTab = 'rank';
        document.querySelector('.mt-hub-tab[data-tab="rank"]')?.click();
      });
      return;
    }

    // 撈每個朋友的隊伍 snapshot
    const fids = friends.map(f => f.friend_id);
    const { data: teams } = await window.DB.from('my_team_leaderboard')
      .select('*').in('user_id', fids);
    const teamMap = {};
    (teams || []).forEach(t => { teamMap[t.user_id] = t; });

    content.innerHTML = `
      <div class="mt-friends-tab">
        <div class="mt-quest-group-title">👥 好友列表 (${friends.length})</div>
        <div class="mt-friends-list">
          ${friends.map(f => {
            const t = teamMap[f.friend_id];
            if (!t) return '';
            const crest = window.TeamCrests ? window.TeamCrests.getSvg(
              t.team_crest || 'football', t.crest_primary, t.crest_accent) : '⚽';
            return `<div class="mt-friend-row" data-uid="${f.friend_id}">
              <div class="mt-rank-crest">${crest}</div>
              <div class="mt-rank-info">
                <div class="mt-rank-name">${escapeHtml(t.team_name || '')}</div>
                <div class="mt-rank-meta">${escapeHtml(t.player_name)} · Tier ${t.current_tier || 1} · ELO ${t.pvp_elo || '—'}</div>
              </div>
              <button class="mt-friend-remove" data-rm="${f.friend_id}" title="移除好友">×</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;

    content.querySelectorAll('.mt-friend-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.matches('.mt-friend-remove')) return;
        _openOpponentTeamView(row.dataset.uid);
      });
    });
    content.querySelectorAll('.mt-friend-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('移除好友？')) return;
        try {
          await window.DB.from('user_friend').delete().eq('user_id', me).eq('friend_id', btn.dataset.rm);
          renderTab();
        } catch (e) { alert('移除失敗：' + e.message); }
      });
    });
  }

  // 看別人陣容 — 用 get_pvp_team_snapshot
  async function _openOpponentTeamView(userId) {
    const overlay = document.createElement('div');
    overlay.className = 'mt-profile-overlay';
    overlay.innerHTML = `
      <div class="mt-profile-card" style="max-width:480px">
        <button class="mt-modal-close mt-profile-close" type="button">×</button>
        <div id="mt-opp-view" style="text-align:center"><div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入中…</div></div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.querySelector('.mt-profile-close').addEventListener('click', () => {
      overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200);
    });

    try {
      const { data, error } = await window.DB.rpc('get_pvp_team_snapshot', { p_user_id: userId });
      if (error) throw error;
      if (!data) { overlay.querySelector('#mt-opp-view').innerHTML = '找不到隊伍'; return; }
      const crest = window.TeamCrests ? window.TeamCrests.getSvg(
        data.flag || 'football', data.crest_primary, data.crest_accent) : '';
      const players = data.keyPlayers || [];
      overlay.querySelector('#mt-opp-view').innerHTML = `
        <div class="mt-opp-header">
          <div class="mt-opp-crest">${crest}</div>
          <div>
            <div class="mt-opp-name">${escapeHtml(data.nameCN)}</div>
            <div class="mt-opp-meta">陣型 ${data.formation || '4-3-3'} · ELO ${data.pvp_elo || '—'}</div>
          </div>
        </div>
        <div class="mt-opp-radar">
          ${_radarBar('攻擊', data.radar?.attack || 50)}
          ${_radarBar('防守', data.radar?.defense || 50)}
          ${_radarBar('中場', data.radar?.midfield || 50)}
          ${_radarBar('速度', data.radar?.speed || 50)}
        </div>
        ${data.coach ? `<div class="mt-opp-coach">👔 主教練：${escapeHtml(data.coach.name)}</div>` : ''}
        <div class="mt-opp-players-title">⚽ 首發 11 人</div>
        <div class="mt-opp-players">
          ${players.map((kp, i) => {
            const imgId = `opp-${i}`;
            return `<div class="mt-opp-player">
              <img id="${imgId}" alt="${escapeHtml(kp.name)}" onerror="this.style.opacity='0.3'">
              <div class="mt-opp-pname">${escapeHtml(kp.name)}</div>
              <div class="mt-opp-ppos">${kp.pos}</div>
            </div>`;
          }).join('')}
        </div>
      `;
      players.forEach((kp, i) => {
        if (kp.look_data && window.LpcRenderer) {
          window.LpcRenderer.portrait(kp.look_data).then(url => {
            const img = document.getElementById(`opp-${i}`);
            if (img && url) img.src = url;
          }).catch(() => {});
        }
      });
    } catch (e) {
      overlay.querySelector('#mt-opp-view').innerHTML = '載入失敗：' + (e.message || e);
    }
  }

  // ─────────── 設定 tab：Kit + 隊徽 + 球場 + 陣型 ───────────────────────
  function renderSettingsTab(content) {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') return;

    const KIT_COLORS = ['red','blue','black','white','green','yellow','teal','purple','orange'];
    const PANTS_COLORS = ['red','blue','black','white','green','yellow','teal','purple','orange','brown','tan'];
    const SHOE_COLORS = ['black','brown','white','red','blue','yellow','green'];
    const CREST_IDS = window.TeamCrests ? window.TeamCrests.listCrests() : [];

    function swatchRow(category, value, colors) {
      return colors.map(c => `
        <button class="mt-settings-swatch ${value === c ? 'sel' : ''}"
          data-cat="${category}" data-val="${c}" style="background:${_colorHex(c)}"></button>
      `).join('');
    }

    const crestPicker = CREST_IDS.map(id => `
      <button class="mt-settings-crest ${team.team_crest === id ? 'sel' : ''}" data-cat="team_crest" data-val="${id}">
        ${window.TeamCrests.getSvg(id, team.crest_primary, team.crest_accent)}
      </button>
    `).join('');

    const lv = team.stadium_level || 1;
    const nextCost = lv >= 10 ? null : ({2:30,3:60,4:120,5:200,6:350,7:550,8:800,9:1200,10:2000})[lv+1];

    content.innerHTML = `
      <div class="mt-settings-tab">
        <div class="mt-settings-section">
          <div class="mt-settings-title">🏷️ 球隊名稱</div>
          <input class="mt-settings-name-input" id="mt-settings-name" maxlength="24"
            value="${escapeHtml(team.team_name || '')}" placeholder="輸入新隊名" />
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">🏟️ 球場等級 Lv. ${lv} / 10</div>
          <div style="font-size:12px;opacity:0.8;margin-bottom:6px">
            目前球迷上限：${team.fans || 100}・體力上限：${team.stamina_max}
          </div>
          ${nextCost ? `
            <button class="mt-settings-action-btn" id="mt-stadium-upgrade">🏟️ 升級到 Lv. ${lv+1}（${nextCost} 💎）</button>
          ` : '<div style="opacity:0.7">已達最高等級！</div>'}
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">👕 球衣顏色</div>
          <div class="mt-settings-swatches">${swatchRow('kit_shirt_color', team.kit_shirt_color, KIT_COLORS)}</div>
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">👖 球褲顏色</div>
          <div class="mt-settings-swatches">${swatchRow('kit_pants_color', team.kit_pants_color, PANTS_COLORS)}</div>
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">👟 球鞋顏色</div>
          <div class="mt-settings-swatches">${swatchRow('kit_shoes_color', team.kit_shoes_color, SHOE_COLORS)}</div>
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">🛡️ 隊徽圖案</div>
          <div class="mt-settings-crests">${crestPicker}</div>
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">🎨 隊徽配色</div>
          <div class="mt-settings-presets" id="mt-crest-presets"></div>
          <div style="margin-top:10px;display:flex;gap:10px;align-items:center;font-size:13px">
            <label>主色 <input type="color" id="mt-crest-primary" value="${team.crest_primary || '#c0392b'}"></label>
            <label>副色 <input type="color" id="mt-crest-accent"  value="${team.crest_accent  || '#f1c40f'}"></label>
          </div>
        </div>
        <div class="mt-settings-section">
          <div class="mt-settings-title">👁 預覽（隊徽 + 球員穿著）</div>
          <div class="mt-settings-preview-wrap">
            <div class="mt-settings-preview" id="mt-settings-preview-crest" style="width:110px;height:110px">${_renderCrest(team)}</div>
            <div class="mt-settings-preview-player">
              <div class="mt-settings-preview-label">隊長</div>
              <img id="mt-settings-preview-sprite" alt="球員預覽" style="image-rendering:pixelated" />
            </div>
          </div>
        </div>
        <button class="mt-settings-action-btn mt-settings-save-btn" id="mt-settings-save">💾 儲存隊名 / 球衣 / 隊徽</button>
      </div>
    `;

    // 球場升級按鈕
    const upBtn = content.querySelector('#mt-stadium-upgrade');
    if (upBtn) {
      upBtn.addEventListener('click', async () => {
        upBtn.disabled = true; upBtn.textContent = '升級中…';
        try {
          const { data, error } = await window.DB.rpc('upgrade_stadium');
          if (error) throw error;
          await window.MyTeam.refresh?.();
          if (typeof showToast === 'function') showToast(`🏟️ 球場升到 Lv. ${data.new_level}！花費 ${data.cost} 💎`);
          renderTab();
        } catch (e) {
          alert('升級失敗：' + (e.message || e));
          upBtn.disabled = false;
        }
      });
    }
    // 隊名 input change
    const nameInput = content.querySelector('#mt-settings-name');
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        _pendingSettings.team_name = nameInput.value.trim() || team.team_name;
      });
    }

    // 預設色組合
    const presets = window.TeamCrests?.PRESET_COLOR_COMBOS || [];
    const presetEl = content.querySelector('#mt-crest-presets');
    presets.forEach(([p, a]) => {
      const b = document.createElement('button');
      b.className = 'mt-settings-preset';
      b.innerHTML = `<span style="background:${p}"></span><span style="background:${a}"></span>`;
      b.addEventListener('click', () => {
        content.querySelector('#mt-crest-primary').value = p;
        content.querySelector('#mt-crest-accent').value  = a;
        _settingsPreviewUpdate(content);
      });
      presetEl.appendChild(b);
    });

    // swatch / crest click
    content.querySelectorAll('.mt-settings-swatch, .mt-settings-crest').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat, val = btn.dataset.val;
        content.querySelectorAll(`[data-cat="${cat}"]`).forEach(b => b.classList.toggle('sel', b === btn));
        btn.dataset.pending = val;
        _pendingSettings[cat] = val;
        _settingsPreviewUpdate(content);
      });
    });
    content.querySelector('#mt-crest-primary').addEventListener('change', () => _settingsPreviewUpdate(content));
    content.querySelector('#mt-crest-accent').addEventListener('change', () => _settingsPreviewUpdate(content));
    // 初次載入即跑一次預覽（讓 sprite 出現）
    _settingsPreviewUpdate(content);

    // 儲存
    content.querySelector('#mt-settings-save').addEventListener('click', async () => {
      const updates = { ..._pendingSettings };
      updates.crest_primary = content.querySelector('#mt-crest-primary').value;
      updates.crest_accent  = content.querySelector('#mt-crest-accent').value;
      try {
        const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : (team?.user_id);
        if (!uid) throw new Error('找不到使用者');
        await window.DB.from('my_team').update(updates).eq('user_id', uid);
        await window.MyTeam.refresh?.();
        _pendingSettings = {};
        alert('已儲存');
        renderTab();
      } catch (e) {
        alert('儲存失敗：' + (e.message || e));
      }
    });
  }

  let _pendingSettings = {};

  function _settingsPreviewUpdate(content) {
    const team = window.MyTeam.getCached();
    const teamSnap = { ...team, ..._pendingSettings,
      crest_primary: content.querySelector('#mt-crest-primary').value,
      crest_accent:  content.querySelector('#mt-crest-accent').value };
    const preview = content.querySelector('#mt-settings-preview-crest');
    if (preview) preview.innerHTML = _renderCrest(teamSnap);

    // 球員 sprite 預覽：用隊長 look，並套上 pending kit 顏色
    const spriteImg = content.querySelector('#mt-settings-preview-sprite');
    if (!spriteImg || !window.LpcRenderer) return;
    _previewSprite(spriteImg, teamSnap);
  }

  async function _previewSprite(imgEl, teamSnap) {
    const players = await window.MyTeam.fetchPlayers();
    const captain = teamSnap.captain_player_id
      ? (players || []).find(p => p.id === teamSnap.captain_player_id)
      : (players || []).find(p => p.in_starting_11) || (players || [])[0];
    if (!captain) return;
    const look = window.LpcRenderer.resolveLook(captain);
    const kit = {
      shirtColor: teamSnap.kit_shirt_color || 'red',
      pantsColor: teamSnap.kit_pants_color || 'white',
      shoeColor:  teamSnap.kit_shoes_color || 'white',
    };
    try {
      const url = await window.LpcRenderer.portrait(look, { scale: 4, kit });
      if (url) imgEl.src = url;
    } catch (e) {}
  }

  function _colorHex(name) {
    return ({
      red:'#c0392b', blue:'#2196f3', black:'#1a1a1a', white:'#eee', green:'#27ae60',
      yellow:'#f1c40f', teal:'#16a085', purple:'#9b59b6', orange:'#e67e22',
      brown:'#8b4513', tan:'#d2b48c',
    })[name] || '#888';
  }

  function renderGachaTab(content) {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') return;
    const tickets = team.tickets || 0;
    const gems = team.gems || 0;
    const pity = team.pity_counter || 0;
    const pityRemaining = Math.max(0, 30 - pity);
    const ssrSelect = team.ssr_select_tickets || 0;
    const has1Ticket = tickets >= 1;
    const has10Tickets = tickets >= 10;
    const canAfford1 = has1Ticket || gems >= 50;
    const canAfford10 = has10Tickets || gems >= 450;

    content.innerHTML = `
      <div class="mt-gacha-shop-fullscene" id="mt-gacha-fullshop">
        <!-- AI 生成背景圖（店面整個場景） -->
        <img class="mt-gshop-bg-img" src="img/my-team/gacha-bg.jpg" alt="">

        <!-- 頂部招牌：球員卡販售 -->
        <div class="mt-gshop-marquee">
          <span class="mt-gshop-marquee-text">球員卡販售</span>
          <span class="mt-gshop-marquee-stars">
            <span class="ns ns1">★</span><span class="ns ns2">⚽</span><span class="ns ns3">★</span>
          </span>
        </div>
        <div class="mt-gshop-subtitle">★ 抽卡區 ★</div>

        <!-- 4 個卡包並排（玻璃櫃內） -->
        <div class="mt-gshop-packs">
          <button class="mt-gshop-pack pack-n" data-rarity="N">
            <img src="img/my-team/gacha-pack-n.png" alt="N">
          </button>
          <button class="mt-gshop-pack pack-r" data-rarity="R">
            <img src="img/my-team/gacha-pack-r.png" alt="R">
          </button>
          <button class="mt-gshop-pack pack-sr" data-rarity="SR">
            <img src="img/my-team/gacha-pack-sr.png" alt="SR">
          </button>
          <button class="mt-gshop-pack pack-ssr" data-rarity="SSR">
            <img src="img/my-team/gacha-pack-ssr.png" alt="SSR">
          </button>
        </div>
        <div class="mt-gshop-packs-caption">收集最強球員卡！</div>

        <!-- 黑板告示牌（疊在背景的黑板上） -->
        <div class="mt-gshop-chalk-overlay">
          <span class="mt-gshop-chalk-line1">★ 每10抽</span>
          <span class="mt-gshop-chalk-line2">必得</span>
          <span class="mt-gshop-chalk-line3">SR 以上球員！</span>
        </div>

        <!-- 機率資訊按鈕（疊在背景右下相框上） -->
        <button class="mt-gshop-rates-btn" id="mt-gshop-rates">
          機率資訊 ›
        </button>

        <!-- 抽卡按鈕：1 抽 + 10 抽（同高、cost pill 內嵌、必得 SR 用絕對定位） -->
        <div class="mt-gshop-buttons">
          <button class="mt-gshop-btn mt-gshop-btn-1" id="mt-gacha-1" ${!canAfford1 ? 'disabled' : ''}>
            <span class="mt-gshop-btn-shine"></span>
            <div class="mt-gshop-btn-label">1 抽</div>
            <div class="mt-gshop-btn-cost mt-gshop-btn-cost-dual">
              <span class="mt-gshop-cost-pill ${has1Ticket ? 'mt-gshop-cost-active' : 'mt-gshop-cost-fade'}">🎟️ <b>1</b></span>
              <span class="mt-gshop-cost-or">/</span>
              <span class="mt-gshop-cost-pill ${has1Ticket ? 'mt-gshop-cost-fade' : 'mt-gshop-cost-active'}">💎 <b>50</b></span>
            </div>
          </button>
          <button class="mt-gshop-btn mt-gshop-btn-10" id="mt-gacha-10" ${!canAfford10 ? 'disabled' : ''}>
            <span class="mt-gshop-btn-shine"></span>
            <span class="mt-gshop-btn-promo">優惠!</span>
            <div class="mt-gshop-btn-label">10 抽</div>
            <div class="mt-gshop-btn-cost mt-gshop-btn-cost-dual">
              <span class="mt-gshop-cost-pill ${has10Tickets ? 'mt-gshop-cost-active' : 'mt-gshop-cost-fade'}">🎟️ <b>10</b></span>
              <span class="mt-gshop-cost-or">/</span>
              <span class="mt-gshop-cost-pill ${has10Tickets ? 'mt-gshop-cost-fade' : 'mt-gshop-cost-active'}">💎 <b>450</b></span>
            </div>
            <div class="mt-gshop-btn-sub">必得 <b>SR</b> 以上球員!</div>
          </button>
        </div>

        ${ssrSelect > 0 ? `
          <button class="mt-gshop-ssr-ticket" id="mt-ssr-select-open">
            🌟 SSR 自選券 ×${ssrSelect}
          </button>
        ` : ''}
      </div>

      <!-- 包進來補關閉的舊空 div（不影響）-->
      <div style="display:none">
        <svg viewBox="0 0 28 50" xmlns="http://www.w3.org/2000/svg">
      </div>
    `;

    // 點 1 抽 / 10 連：有券優先用券、沒券就用寶石
    content.querySelector('#mt-gacha-1')?.addEventListener('click', () => _runGachaSmart(1));
    content.querySelector('#mt-gacha-10')?.addEventListener('click', () => _runGachaSmart(10));
    content.querySelector('#mt-ssr-select-open')?.addEventListener('click', () => _openSSRSelect());
    content.querySelector('#mt-gshop-rates')?.addEventListener('click', () => _openRatesModal());
    // 4 個卡包點擊 → 直接抽 1 抽（任何稀有度按鈕都一樣 — 機率系統決定中什麼）
    content.querySelectorAll('.mt-gshop-pack').forEach(b => {
      b.addEventListener('click', () => _runGachaSmart(1));
    });
  }

  // 智能抽卡：有券優先用、沒券改用寶石
  function _runGachaSmart(count) {
    const team = window.MyTeam.getCached();
    if ((team?.tickets || 0) >= count) return _runGacha(count);
    return _runGachaGem(count);
  }

  // ── 機率資訊 modal ──
  function _openRatesModal() {
    const overlay = document.createElement('div');
    overlay.className = 'mt-rates-overlay';
    overlay.innerHTML = `
      <div class="mt-rates-modal">
        <div class="mt-rates-title">📊 抽卡機率</div>
        <button class="mt-modal-close mt-rates-close" type="button">×</button>
        <div class="mt-rates-row mt-rates-n">
          <span class="mt-rates-rarity">N</span>
          <span class="mt-rates-bar"><span style="width:50%;background:#7d8590"></span></span>
          <span class="mt-rates-pct">50%</span>
        </div>
        <div class="mt-rates-row mt-rates-r">
          <span class="mt-rates-rarity">R</span>
          <span class="mt-rates-bar"><span style="width:30%;background:#43a047"></span></span>
          <span class="mt-rates-pct">30%</span>
        </div>
        <div class="mt-rates-row mt-rates-sr">
          <span class="mt-rates-rarity">SR</span>
          <span class="mt-rates-bar"><span style="width:15%;background:#9b87f5"></span></span>
          <span class="mt-rates-pct">15%</span>
        </div>
        <div class="mt-rates-row mt-rates-ssr">
          <span class="mt-rates-rarity">SSR</span>
          <span class="mt-rates-bar"><span style="width:5%;background:#f0c040"></span></span>
          <span class="mt-rates-pct">5%</span>
        </div>
        <div class="mt-rates-note">
          🎯 連續 30 抽未中 SSR → <b style="color:#ffe680">下一抽必中 SSR</b><br>
          🎴 10 連抽最後一張 → <b style="color:#9b87f5">保證 SR 起步</b><br>
          ⭐ 重複球員 → ★+1（最高 ★5、提升上限）
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('.mt-rates-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }

  // ── SSR 自選券：選 1 張 SSR ──
  async function _openSSRSelect() {
    const team = window.MyTeam.getCached();
    if (!team || (team.ssr_select_tickets || 0) < 1) return;

    // 撈所有 SSR
    const { data: ssrs, error } = await window.DB.from('player_card_pool')
      .select('*').eq('rarity', 'SSR').order('position');
    if (error) { alert('載入 SSR 名單失敗：' + error.message); return; }

    const overlay = document.createElement('div');
    overlay.className = 'mt-ssr-overlay';
    overlay.innerHTML = `
      <div class="mt-ssr-card-modal">
        <div class="mt-ssr-modal-title">🌟 選一張 SSR（剩 ${team.ssr_select_tickets} 張券）</div>
        <button class="mt-modal-close mt-ssr-close" type="button">×</button>
        <div class="mt-ssr-grid" id="mt-ssr-grid">
          ${ssrs.map(c => {
            const imgId = `ssrsel-${c.card_id}`;
            return `
              <button class="mt-coach-card rarity-SSR mt-ssr-pickable" data-card-id="${c.card_id}">
                <span class="mt-player-card-rarity">SSR</span>
                <div class="mt-player-portrait"><img id="${imgId}" alt="${escapeHtml(c.name)}" onerror="this.style.opacity='0.3'"></div>
                <div class="mt-player-name">${escapeHtml(c.name)}</div>
                <div class="mt-player-position" style="font-size:11px">${escapeHtml(c.nickname || '')}</div>
                <div class="mt-player-position" style="font-size:10px">${c.position}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    // 載 portrait
    ssrs.forEach(c => {
      const look = c.look_data;
      if (look && window.LpcRenderer) {
        window.LpcRenderer.portrait(look).then(url => {
          const img = document.getElementById(`ssrsel-${c.card_id}`);
          if (img && url) img.src = url;
        }).catch(() => {});
      }
    });

    overlay.querySelector('.mt-ssr-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    });

    overlay.querySelectorAll('.mt-ssr-pickable').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cardId = btn.dataset.cardId;
        if (!confirm(`確定要兌換 ${ssrs.find(s=>s.card_id===cardId)?.name}？\n（消耗 1 張自選券）`)) return;
        btn.disabled = true;
        try {
          const res = await window.MyTeam.redeemSSRSelect(cardId);
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
          if (typeof showToast === 'function') {
            showToast(res.is_duplicate ? `⭐ ${res.name} ★+1` : `🎉 收到 ${res.name}！`);
          }
          await window.MyTeam.refresh?.();
          renderTab();
        } catch (e) {
          alert('兌換失敗：' + (e.message || e));
          btn.disabled = false;
        }
      });
    });
  }

  async function _runGacha(count) {
    try {
      await window.MyTeam.gacha(count, { source: 'gacha-tab' });
      window.MyTeam.trackQuest?.('gacha_draw', count).catch(() => {});
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

  // 寶石抽卡（1 抽 50 / 10 連 450）
  async function _runGachaGem(count) {
    try {
      await window.MyTeam.gachaWithGems(count, { source: 'gacha-tab-gem' });
      window.MyTeam.trackQuest?.('gacha_draw', count).catch(() => {});
      renderHub();
    } catch (err) {
      console.error('[my-team] gem gacha error', err);
      const msg = String(err.message || err);
      let friendly = '抽卡失敗：' + msg;
      if (msg.includes('INSUFFICIENT_GEMS')) friendly = '💎 寶石不足';
      else if (msg.includes('NO_TEAM')) friendly = '⚠️ 請先建立球隊';
      else if (msg.includes('NOT_LOGGED_IN')) friendly = '⚠️ 請先登入';
      if (typeof showToast === 'function') showToast(friendly);
      else alert(friendly);
    }
  }

  async function renderMatchTab(content) {
    if (!content.querySelector('.mt-match-stage')) {
      content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入聯賽進度…</div>';
    }
    const team = window.MyTeam.getCached();
    if (!team) return;
    const { data: prog } = await window.DB
      .from('league_progress')
      .select('*')
      .eq('user_id', team.user_id)
      .maybeSingle();
    const tier = prog?.current_tier || 1;
    const tierName = ({1:'新手聯賽',2:'業餘聯賽',3:'地區聯賽',4:'全國次級',5:'全國聯賽',6:'大陸盃',7:'歐洲菁英',8:'世界次級',9:'世界聯賽',10:'傳奇聯賽'})[tier];
    const wins = prog?.wins || 0;
    const draws = prog?.draws || 0;
    const losses = prog?.losses || 0;
    const played = prog?.matches_played || 0;
    const tierAvg = { 1:40,2:50,3:60,4:70,5:75,6:80,7:85,8:88,9:92,10:95 }[tier];
    const realRatio = { 1:0,2:0,3:0,4:0.1,5:0.2,6:0.3,7:0.45,8:0.65,9:0.85,10:1.0 }[tier];
    const isBossLikely = realRatio >= 0.3;
    const pvpCount = team.pvp_today_count || 0;
    const pvpDisabled = pvpCount >= 5 || team.stamina < 1;

    // 闖關地圖：10 關，當前在 played + 1（1-indexed）。已過 = played 個
    const TOTAL_STAGES = 10;
    const currentStage = Math.min(played + 1, TOTAL_STAGES);
    // 每關 Boss 機率：根據 Tier 配 + 第 5 / 10 關必 Boss
    const stages = [];
    for (let i = 1; i <= TOTAL_STAGES; i++) {
      const isBossSlot = (i === 5 || i === 10);
      const isPast = i <= played;
      const isNow  = i === currentStage;
      const isLocked = i > currentStage;
      stages.push({ idx: i, isBossSlot, isPast, isNow, isLocked });
    }

    // 主角：優先用隊長、其次 SSR > SR > R 先發
    const allPlayers = await window.MyTeam.fetchPlayers();
    const rarityRank = { SSR: 3, SR: 2, R: 1 };
    const captain = team.captain_player_id
      ? (allPlayers || []).find(p => p.id === team.captain_player_id)
      : null;
    const mascot = captain
      || (allPlayers || [])
        .filter(p => p.in_starting_11)
        .sort((a,b) => (rarityRank[b.card?.rarity] || 0) - (rarityRank[a.card?.rarity] || 0))[0]
      || allPlayers?.[0];

    // 預覽下一關對手（穩定種子）
    let nextOpp = null;
    try {
      if (typeof window.MyTeam.peekNextOpponent === 'function') {
        nextOpp = window.MyTeam.peekNextOpponent(tier, played);
      }
    } catch (e) { nextOpp = null; }
    const oppName = nextOpp?.nameCN || '未知對手';
    const oppFlag = nextOpp?.flag || '🏴';
    const oppIsReal = !!nextOpp?._isReal;

    content.innerHTML = `
      <div class="mt-match-map">
        <!-- 頂部：主角踢球 2D 卷軸動畫 + tier 標題 -->
        <div class="mt-match-banner">
          <div class="mt-match-banner-scroll">
            <div class="mt-match-banner-clouds">
              <span class="mt-match-cloud c1"></span>
              <span class="mt-match-cloud c2"></span>
              <span class="mt-match-cloud c3"></span>
            </div>
            <div class="mt-match-banner-ground">
              <!-- 球門（拉寬 ≈ 真實球門比例） -->
              <div class="mt-match-goal">
                <svg viewBox="0 0 80 50" preserveAspectRatio="xMidYMax meet">
                  <!-- 主框 -->
                  <rect x="2" y="2" width="76" height="40" fill="none" stroke="#ffffff" stroke-width="2.5"/>
                  <!-- 側面 + 底邊（透視感） -->
                  <line x1="2" y1="2"  x2="2"  y2="48" stroke="#cccccc" stroke-width="2"/>
                  <line x1="78" y1="2" x2="78" y2="48" stroke="#cccccc" stroke-width="2"/>
                  <line x1="2" y1="42" x2="78" y2="42" stroke="#ffffff" stroke-width="2.5"/>
                  <!-- 網格紋（垂直） -->
                  <line x1="14" y1="2" x2="14" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="26" y1="2" x2="26" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="40" y1="2" x2="40" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="54" y1="2" x2="54" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="66" y1="2" x2="66" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <!-- 網格紋（水平） -->
                  <line x1="2" y1="11" x2="78" y2="11" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="2" y1="22" x2="78" y2="22" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                  <line x1="2" y1="32" x2="78" y2="32" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
                </svg>
                <!-- 守門員 sprite 預留 -->
                <div class="mt-match-goalkeeper" id="mt-match-goalkeeper"></div>
              </div>
              <!-- 對手球員 ×2（站在球門前） -->
              <div class="mt-match-opp" id="mt-match-opp-1"></div>
              <div class="mt-match-opp" id="mt-match-opp-2"></div>
              <!-- 主角 sprite -->
              <div class="mt-match-hero" id="mt-match-hero"></div>
              <!-- 球（主角腳下、會跟著一起跑、射門時飛走） -->
              <div class="mt-match-ball" id="mt-match-ball">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="mt-ball-shade" cx="35%" cy="30%">
                      <stop offset="0%" stop-color="#ffffff"/>
                      <stop offset="60%" stop-color="#e0e0e0"/>
                      <stop offset="100%" stop-color="#808080"/>
                    </radialGradient>
                  </defs>
                  <circle cx="16" cy="16" r="14" fill="url(#mt-ball-shade)" stroke="#1a1a1a" stroke-width="1.5"/>
                  <!-- 五邊形塊 -->
                  <polygon points="16,8 21,11.5 19,17 13,17 11,11.5" fill="#1a1a1a"/>
                  <polygon points="8,16 11,12 11,18" fill="#1a1a1a"/>
                  <polygon points="24,16 21,12 21,18" fill="#1a1a1a"/>
                  <polygon points="16,24 13,20 19,20" fill="#1a1a1a"/>
                  <!-- 反光高光 -->
                  <ellipse cx="12" cy="11" rx="3" ry="2" fill="rgba(255,255,255,0.6)"/>
                </svg>
              </div>
            </div>
          </div>
          <div class="mt-match-banner-overlay">
            <div class="mt-match-tier">🏆 ${escapeHtml(tierName)} <small>Tier ${tier}</small></div>
            <div class="mt-match-record-line">
              <b style="color:#4caf50">${wins}W</b> · ${draws}D · <span style="color:#ef9a9a">${losses}L</span>
              ${isBossLikely ? `<span class="mt-match-boss-tag">⭐ Boss ${Math.round(realRatio*100)}%</span>` : ''}
            </div>
          </div>
          <!-- 對手隊徽 + 隊名（右上、球門上方） -->
          <div class="mt-match-opp-label">
            <div class="mt-match-opp-label-tag">▶ 下一隊對手</div>
            <div class="mt-match-opp-label-row">
              <span class="mt-match-opp-label-crest">${escapeHtml(oppFlag)}</span>
              <span class="mt-match-opp-label-name">${escapeHtml(oppName)}</span>
              ${oppIsReal ? '<span class="mt-match-opp-real">REAL</span>' : ''}
            </div>
          </div>
        </div>

        <!-- 開戰按鈕 + 對手資訊（左按鈕、右資訊；第 N 關做成左上角 badge） -->
        <div class="mt-match-current">
          <div class="mt-match-current-stage-badge">第 ${currentStage} 關</div>
          <div class="mt-match-current-left">
            <button class="mt-match-engage-btn" id="mt-match-start" ${team.stamina < 1 ? 'disabled' : ''}>
              <span class="mt-match-engage-sword">⚔</span>
              <span class="mt-match-engage-label">開始</span>
              <span class="mt-match-engage-cost">⚡1</span>
            </button>
          </div>
          <div class="mt-match-current-right">
            <div class="mt-match-current-vs-label">VS</div>
            <div class="mt-match-current-opp-name">${escapeHtml(oppFlag)} ${escapeHtml(oppName)}</div>
            <div class="mt-match-current-opp-meta">
              ${oppIsReal ? '<span class="mt-match-opp-real">REAL</span>' : '<span class="mt-match-opp-npc">NPC</span>'}
              <span class="mt-match-current-opp-power">能力 ~${tierAvg}</span>
              ${currentStage === 5 || currentStage === 10
                ? '<span class="mt-match-current-boss-pill">👑 BOSS</span>'
                : isBossLikely ? `<span class="mt-match-current-boss-pill mt-match-current-boss-pill--maybe">⭐ Boss ${Math.round(realRatio*100)}%</span>` : ''}
            </div>
          </div>
          ${team.stamina < 1 ? '<div class="mt-match-current-warn">⚡ 體力 0 — 預測比賽、看文章可賺體力</div>' : ''}
        </div>

        <!-- 闖關路線（可滾、自動聚焦當前關） -->
        <div class="mt-match-path-wrap" id="mt-match-path-wrap">
          <div class="mt-match-path">
            <svg class="mt-match-path-line" viewBox="0 0 300 480" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 150 456
                       C 240 456, 230 400, 70 400
                       C 30 400, 30 345, 150 345
                       C 270 345, 270 290, 70 290
                       C 30 290, 30 240, 150 240
                       C 270 240, 270 187, 70 187
                       C 30 187, 30 134, 150 134
                       C 270 134, 270 82, 150 82
                       C 90 82, 60 43, 234 14"
                fill="none"
                stroke="rgba(240,192,64,0.5)"
                stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray="3,6"/>
            </svg>
            <div class="mt-match-stages">
              ${stages.map(s => {
                const cls = [
                  'mt-match-stage-node',
                  s.isBossSlot ? 'is-boss' : '',
                  s.isPast ? 'is-past' : '',
                  s.isNow ? 'is-now' : '',
                  s.isLocked ? 'is-locked' : '',
                ].filter(Boolean).join(' ');
                return `
                  <button class="${cls}" data-stage="${s.idx}" ${s.isLocked ? 'disabled' : ''}>
                    <span class="mt-match-stage-icon">${s.isBossSlot ? '👑' : (s.isPast ? '✓' : '⚽')}</span>
                    <span class="mt-match-stage-num">${s.idx}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- PvP 招牌 -->
        <button class="mt-match-wall-sign mt-match-pvp-sign" id="mt-pvp-find" ${pvpDisabled ? 'disabled' : ''}>
          <div class="mt-match-wall-sign-icon">⚔️</div>
          <div class="mt-match-wall-sign-title">PvP 排位</div>
          <div class="mt-match-wall-sign-sub">ELO ${team.pvp_elo || 1000}・${pvpCount}/5</div>
        </button>
      </div>
    `;

    // 渲染主角 sprite（LPC walking）+ 守門員 + 兩名對手球員
    _renderMatchBanner(content, mascot, team, tier, played);

    // 自動聚焦：進 tab 時把當前關卡 scroll 到可見區域中央
    requestAnimationFrame(() => {
      const wrap = content.querySelector('#mt-match-path-wrap');
      const nowNode = content.querySelector('.mt-match-stage-node.is-now');
      if (wrap && nowNode) {
        const wrapRect = wrap.getBoundingClientRect();
        const nodeRect = nowNode.getBoundingClientRect();
        const offset = nodeRect.top - wrapRect.top - wrap.clientHeight / 2 + nodeRect.height / 2;
        wrap.scrollTo({ top: wrap.scrollTop + offset, behavior: 'smooth' });
      }
    });

    content.querySelector('#mt-match-start')?.addEventListener('click', () => {
      if (typeof window.MyTeam.runMatch === 'function') {
        window.MyTeam.runMatch();
      }
    });

    content.querySelector('#mt-pvp-find')?.addEventListener('click', async () => {
      try {
        if (typeof window.MyTeam.runPvpMatch === 'function') {
          await window.MyTeam.runPvpMatch();
          renderTab();
        }
      } catch (e) {
        const msg = (e.message || String(e));
        const friendly = msg.includes('PVP_DAILY_LIMIT') ? '今日 PvP 5 場已用完、明天再戰'
          : msg.includes('NO_PVP_OPPONENT') ? '目前沒有可對戰的對手（再過一下試）'
          : msg.includes('INSUFFICIENT_STAMINA') ? '體力不足'
          : '對戰失敗：' + msg;
        if (typeof showToast === 'function') showToast(friendly);
      }
    });
  }

  // ── 比賽 tab 卷軸：主角從左帶球到右、到球門 → 射門進球 → 重新循環 ──
  let _matchBannerLoop = null;
  let _matchGkLoop = null;
  let _matchOppLoop = null;
  async function _renderMatchBanner(content, mascot, team, tier = 1, matchIdx = 0) {
    if (_matchBannerLoop) { clearTimeout(_matchBannerLoop); _matchBannerLoop = null; }
    if (_matchGkLoop) { clearInterval(_matchGkLoop); _matchGkLoop = null; }
    if (_matchOppLoop) { clearInterval(_matchOppLoop); _matchOppLoop = null; }
    if (!mascot || !window.LpcRenderer) return;

    const heroEl = content.querySelector('#mt-match-hero');
    const goalkeeperEl = content.querySelector('#mt-match-goalkeeper');
    const opp1El = content.querySelector('#mt-match-opp-1');
    const opp2El = content.querySelector('#mt-match-opp-2');
    const ballEl = content.querySelector('#mt-match-ball');
    if (!heroEl || !ballEl || !goalkeeperEl) return;

    const heroLook = window.LpcRenderer.resolveLook(mascot);
    const kit = team ? { shirtColor: team.kit_shirt_color, pantsColor: team.kit_pants_color, shoeColor: team.kit_shoes_color } : null;

    // 渲染主角 walking sheet
    let heroSheetUrl = null, frameW = 32, frameH = 60;
    try {
      const sheet = await window.LpcRenderer.walkingFullBody(heroLook, kit);
      if (sheet) {
        heroSheetUrl = sheet.canvas.toDataURL('image/png');
        frameW = sheet.frameW;
        frameH = sheet.frameH;
      }
    } catch (e) {}
    if (!heroSheetUrl) return;

    // 守門員：固定 look（用合法的 body 值）
    const gkLook = {
      body: 'brown',
      eye_color: 'brown',
      hair_style: 'buzzcut',
      hair_color: 'black',
    };
    let gkSheetUrl = null;
    try {
      const sheet = await window.LpcRenderer.walkingFullBody(gkLook, {
        shirtColor: 'black', pantsColor: 'green', shoeColor: 'black',
      });
      if (sheet) gkSheetUrl = sheet.canvas.toDataURL('image/png');
    } catch (e) { console.warn('[my-team] gk render fail', e); }

    // 兩名對手球員（站在球門前、依 matchIdx 種子隨機 look、紅衫黑褲）
    const gen = window.LPC_SSR_LOOKS && window.LPC_SSR_LOOKS.generateRandomLook;
    const opp1Look = gen ? gen(tier * 1000 + matchIdx + 1001) : { body: 'olive', eye_color: 'brown', hair_style: 'spiked', hair_color: 'black' };
    const opp2Look = gen ? gen(tier * 1000 + matchIdx + 2002) : { body: 'bronze', eye_color: 'brown', hair_style: 'buzzcut', hair_color: 'black' };
    const oppKit = { shirtColor: 'red', pantsColor: 'black', shoeColor: 'white' };
    let opp1SheetUrl = null, opp2SheetUrl = null;
    try {
      const [s1, s2] = await Promise.all([
        window.LpcRenderer.walkingFullBody(opp1Look, oppKit),
        window.LpcRenderer.walkingFullBody(opp2Look, oppKit),
      ]);
      if (s1) opp1SheetUrl = s1.canvas.toDataURL('image/png');
      if (s2) opp2SheetUrl = s2.canvas.toDataURL('image/png');
    } catch (e) { console.warn('[my-team] opp render fail', e); }

    const SHEET_COLS = 3;
    const SHEET_ROWS = 8;
    const setupSprite = (el, sheetUrl) => {
      el.style.width = frameW + 'px';
      el.style.height = frameH + 'px';
      el.style.backgroundImage = `url(${sheetUrl})`;
      el.style.backgroundSize = `${frameW * SHEET_COLS}px ${frameH * SHEET_ROWS}px`;
      el.style.backgroundRepeat = 'no-repeat';
      el.style.imageRendering = 'pixelated';
    };
    setupSprite(heroEl, heroSheetUrl);
    if (gkSheetUrl) setupSprite(goalkeeperEl, gkSheetUrl);
    if (opp1El && opp1SheetUrl) setupSprite(opp1El, opp1SheetUrl);
    if (opp2El && opp2SheetUrl) setupSprite(opp2El, opp2SheetUrl);

    // 走向約定：依專案的 walkingFullBody — row 0=down, 1=left, 2=right, 3=up, 4=kick, 5=cheer, 6=hurt
    const ROW_WALK_RIGHT = 2;
    const ROW_WALK_LEFT  = 1;
    const ROW_KICK = 4;
    const ROW_CHEER = 5;

    // 動畫狀態
    let phase = 'run';     // 'run' | 'shoot' | 'ball-flight' | 'goal' | 'restart'
    let heroX = -frameW;
    let frame = 1;
    let frameTick = 0;
    const bannerWidth = () => content.querySelector('.mt-match-banner')?.clientWidth || 320;
    const goalX = () => bannerWidth() - 90;
    const HERO_SPEED = 1.2;

    // 球初始狀態：在主角腳下、跟著主角移動（dribble）
    ballEl.style.opacity = '1';
    ballEl.style.position = 'absolute';
    ballEl.style.bottom = '6px';
    ballEl.style.left = '0px';
    ballEl.style.transition = 'none';
    ballEl.style.transform = 'rotate(0deg)';

    const tick = () => {
      if (phase === 'run') {
        heroX += HERO_SPEED;
        frameTick++;
        if (frameTick % 6 === 0) frame = (frame + 1) % SHEET_COLS;
        heroEl.style.left = heroX + 'px';
        heroEl.style.backgroundPosition = `-${frame * frameW}px -${ROW_WALK_RIGHT * frameH}px`;

        // 球跟著主角腳前、跑步時微微跳動
        const ballX = heroX + frameW - 12;
        const ballBounce = 6 + Math.abs(Math.sin(frameTick / 4)) * 4;
        ballEl.style.left = ballX + 'px';
        ballEl.style.bottom = ballBounce + 'px';
        ballEl.style.transform = `rotate(${frameTick * 16}deg)`;

        if (heroX >= goalX() - frameW - 26) {
          phase = 'shoot';
          frame = 1;
          frameTick = 0;
          // 切踢球姿勢
          heroEl.style.backgroundPosition = `-${1 * frameW}px -${ROW_KICK * frameH}px`;
          // 球加速飛入網
          const targetX = goalX() + 8;
          const targetY = 32;
          ballEl.style.transition = 'left 0.42s cubic-bezier(0.4,0,0.2,1), bottom 0.42s cubic-bezier(0.3,1.5,0.8,1), transform 0.42s linear';
          requestAnimationFrame(() => {
            ballEl.style.left = targetX + 'px';
            ballEl.style.bottom = targetY + 'px';
            ballEl.style.transform = 'rotate(1080deg) scale(1.15)';
          });
          setTimeout(() => {
            phase = 'goal';
            // 主角歡呼
            heroEl.style.backgroundPosition = `-${1 * frameW}px -${ROW_CHEER * frameH}px`;
            setTimeout(() => {
              // 重置
              heroX = -frameW;
              frame = 1; frameTick = 0;
              heroEl.style.left = heroX + 'px';
              ballEl.style.transition = 'none';
              ballEl.style.bottom = '6px';
              ballEl.style.transform = 'rotate(0deg)';
              phase = 'run';
            }, 900);
          }, 460);
        }
      }
      _matchBannerLoop = setTimeout(tick, 1000 / 30);
    };

    // 守門員：左右小幅晃動（撲球姿勢）
    let gkPhase = 0;
    _matchGkLoop = setInterval(() => {
      if (!goalkeeperEl) return;
      gkPhase = (gkPhase + 1) % 6;
      const row = gkPhase < 3 ? ROW_WALK_LEFT : ROW_WALK_RIGHT;
      const f = gkPhase % SHEET_COLS;
      goalkeeperEl.style.backgroundPosition = `-${f * frameW}px -${row * frameH}px`;
    }, 320);

    // 對手球員：拉筋暖身姿勢（cheer row 雙手過頂 + 兩 frame 交替模擬拉伸）
    let oppStretchPhase = 0;
    _matchOppLoop = setInterval(() => {
      if (!opp1El && !opp2El) return;
      oppStretchPhase = (oppStretchPhase + 1) % 2;
      // ROW_CHEER frame 0 = 手舉起、frame 2 = 手再向上、交替像拉筋
      const f = oppStretchPhase === 0 ? 0 : 2;
      if (opp1El) opp1El.style.backgroundPosition = `-${f * frameW}px -${ROW_CHEER * frameH}px`;
      if (opp2El) opp2El.style.backgroundPosition = `-${(2 - f) * frameW}px -${ROW_CHEER * frameH}px`;
    }, 850);

    tick();
  }

  function _formatRemain(sec) {
    if (sec <= 0) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  let _trainCountdownTimer = null;
  function _refreshCountdowns(list) {
    if (_trainCountdownTimer) clearInterval(_trainCountdownTimer);
    const tick = () => {
      const countdowns = list.querySelectorAll('.mt-train-countdown');
      if (!countdowns.length) {
        clearInterval(_trainCountdownTimer); _trainCountdownTimer = null; return;
      }
      let anyReadyJustNow = false;
      countdowns.forEach(span => {
        const finishAt = new Date(span.dataset.finishAt);
        const remain = Math.max(0, Math.floor((finishAt - new Date()) / 1000));
        if (remain === 0) {
          if (span.textContent !== '已完成') anyReadyJustNow = true;
          span.textContent = '已完成';
          span.closest('.mt-train-timed-active')?.classList.add('ready');
          const claimBtn = list.querySelector(`[data-claim="${span.dataset.player}"]`);
          if (claimBtn) {
            claimBtn.disabled = false;
            claimBtn.innerHTML = '⏱️ 領取 +1';
          }
        } else {
          span.textContent = _formatRemain(remain);
        }
      });
    };
    tick();
    _trainCountdownTimer = setInterval(tick, 1000);
  }

  async function renderTrainTab(content) {
    const team = window.MyTeam.getCached();
    if (!team) return;
    if (!content.querySelector('.mt-train-gym')) {
      content.innerHTML = '<div class="mt-tab-todo"><div class="mt-tab-todo-icon">⏳</div>載入球員中…</div>';
    }
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

    const ATTR_LABELS = { attack:'攻擊', defense:'防守', speed:'速度', midfield:'中場', stamina:'體力', aura:'氣場' };
    const ATTR_ICONS = {
      attack:   '<svg viewBox="0 0 60 40"><rect x="5" y="14" width="14" height="12" rx="2" fill="#404040" stroke="#202020" stroke-width="1.5"/><rect x="41" y="14" width="14" height="12" rx="2" fill="#404040" stroke="#202020" stroke-width="1.5"/><rect x="19" y="18" width="22" height="4" fill="#606060" stroke="#202020" stroke-width="1"/></svg>',
      defense:  '<svg viewBox="0 0 40 50"><path d="M 20 4 L 36 12 L 36 28 Q 36 42 20 48 Q 4 42 4 28 L 4 12 Z" fill="#90caf9" stroke="#1976d2" stroke-width="2"/><path d="M 20 14 L 28 18 L 20 32 L 12 18 Z" fill="#1976d2"/></svg>',
      speed:    '<svg viewBox="0 0 60 40"><rect x="5" y="20" width="50" height="14" rx="2" fill="#606060" stroke="#202020" stroke-width="1.5"/><rect x="8" y="22" width="44" height="2" fill="#a0a0a0"/><circle cx="14" cy="34" r="3" fill="#202020"/><circle cx="46" cy="34" r="3" fill="#202020"/><path d="M 25 14 L 35 14 L 32 6 L 28 6 Z" fill="#f0c040"/></svg>',
      midfield: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#ffffff" stroke="#202020" stroke-width="2"/><polygon points="20,9 26,14 24,21 16,21 14,14" fill="#202020"/><line x1="20" y1="9" x2="20" y2="5" stroke="#202020" stroke-width="1"/><line x1="29" y1="17" x2="33" y2="14" stroke="#202020" stroke-width="1"/></svg>',
      stamina:  '<svg viewBox="0 0 50 40"><path d="M 25 36 L 8 18 Q 4 14 8 10 Q 12 6 18 10 L 25 16 L 32 10 Q 38 6 42 10 Q 46 14 42 18 Z" fill="#e53935" stroke="#801010" stroke-width="2"/></svg>',
      aura:     '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="14" fill="#f0c040" stroke="#805020" stroke-width="2"/><g stroke="#f0c040" stroke-width="2" stroke-linecap="round"><line x1="25" y1="2" x2="25" y2="9"/><line x1="25" y1="41" x2="25" y2="48"/><line x1="2" y1="25" x2="9" y2="25"/><line x1="41" y1="25" x2="48" y2="25"/><line x1="8" y1="8" x2="13" y2="13"/><line x1="37" y1="37" x2="42" y2="42"/><line x1="42" y1="8" x2="37" y2="13"/><line x1="13" y1="37" x2="8" y2="42"/></g></svg>'
    };

    // 整理目前正在時間訓練的球員
    const activeTrainings = players.filter(p => p.training_attr && p.training_finish_at)
      .map(p => ({
        p,
        finishAt: new Date(p.training_finish_at),
        remainSec: Math.max(0, Math.floor((new Date(p.training_finish_at) - new Date()) / 1000)),
      }));

    content.innerHTML = `
      <div class="mt-train-gym">
        <div class="mt-train-gym-header">
          <span class="mt-train-gym-title">💪 訓練館</span>
          <div class="mt-train-rp-chips">
            <span title="戰術 RP">🧠 ${team.rp_tactical}</span>
            <span title="體能 RP">💪 ${team.rp_physical}</span>
            <span title="心 RP">❤️ ${team.rp_heart}</span>
            <span title="靈感 RP">💡 ${team.rp_idea}</span>
          </div>
        </div>

        <!-- 機台一排 -->
        <div class="mt-train-machines">
          ${Object.entries(ATTR_LABELS).map(([attr, label]) => `
            <button class="mt-train-machine" data-machine="${attr}">
              <div class="mt-train-machine-icon">${ATTR_ICONS[attr]}</div>
              <div class="mt-train-machine-label">${label}</div>
              <div class="mt-train-machine-sub">+1 / 點選</div>
            </button>
          `).join('')}
        </div>

        <!-- 進行中訓練 -->
        <div class="mt-train-active-wrap">
          <div class="mt-train-active-title">⏱️ 訓練中（${activeTrainings.length}）</div>
          <div class="mt-train-active-list" id="mt-train-active-list">
            ${activeTrainings.length ? '' : '<div class="mt-train-active-empty">點上方機台 → 選球員開始訓練</div>'}
          </div>
        </div>
      </div>
    `;

    const activeList = content.querySelector('#mt-train-active-list');
    activeTrainings.forEach(({ p, finishAt, remainSec }) => {
      const c = p.card || {};
      const isReady = remainSec === 0;
      const row = document.createElement('div');
      row.className = `mt-train-active-row rarity-${c.rarity || 'R'} ${isReady ? 'ready' : ''}`;
      const imgId = `train-active-${p.id}`;
      row.innerHTML = `
        <div class="mt-train-active-portrait"><img id="${imgId}" alt="${escapeHtml(c.name)}" onerror="this.style.opacity='0.3'"></div>
        <div class="mt-train-active-info">
          <div class="mt-train-active-name">${escapeHtml(c.name)} <small>${ATTR_LABELS[p.training_attr]}</small></div>
          <div class="mt-train-active-time">
            <span class="mt-train-countdown" data-finish-at="${finishAt.toISOString()}" data-player="${p.id}">
              ${isReady ? '已完成' : _formatRemain(remainSec)}
            </span>
          </div>
        </div>
        <button class="mt-train-claim-btn" data-claim="${p.id}" ${isReady ? '' : 'disabled'}>
          ${isReady ? '✋ 領取' : '等候'}
        </button>
      `;
      activeList.appendChild(row);
      const look = window.LpcRenderer && window.LpcRenderer.resolveLook(p);
      if (look && window.LpcRenderer) {
        window.LpcRenderer.portrait(look).then(url => {
          const img = document.getElementById(imgId);
          if (img && url) img.src = url;
        }).catch(() => {});
      }
    });

    // 點機台 → 開球員選單
    content.querySelectorAll('.mt-train-machine').forEach(btn => {
      btn.addEventListener('click', () => {
        const attr = btn.dataset.machine;
        _openTrainPicker(attr, players, team);
      });
    });

    // 倒數計時器
    if (activeTrainings.length) _refreshCountdowns(activeList);

    // ── 時間訓練：領取 ──
    activeList.querySelectorAll('[data-claim]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.claim;
        btn.disabled = true; btn.textContent = '領取中…';
        try {
          const res = await window.MyTeam.claimTimedTraining(pid);
          if (typeof showToast === 'function') {
            const lbl = ({attack:'攻',defense:'防',speed:'速',midfield:'中',stamina:'體',aura:'氣'})[res.attr];
            showToast(`✅ ${lbl} +${res.gain}！`);
          }
          renderTab();
        } catch (e) {
          alert('領取失敗：' + (e.message || e));
        }
      });
    });
  }

  // 點機台 → 開球員選單，選人後執行訓練
  function _openTrainPicker(attr, players, team) {
    const ATTR_LABELS = { attack:'攻擊', defense:'防守', speed:'速度', midfield:'中場', stamina:'體力', aura:'氣場' };
    const overlay = document.createElement('div');
    overlay.className = 'mt-profile-overlay mt-train-picker';
    const rpBadges = `
      <span class="mt-train-rp-pill" title="戰術點">🧠 ${team.rp_tactical || 0}</span>
      <span class="mt-train-rp-pill" title="體能點">💪 ${team.rp_physical || 0}</span>
      <span class="mt-train-rp-pill" title="鬥志點">❤️ ${team.rp_heart || 0}</span>
      <span class="mt-train-rp-pill" title="靈感點">💡 ${team.rp_idea || 0}</span>
    `;
    overlay.innerHTML = `
      <div class="mt-profile-card">
        <button class="mt-modal-close mt-profile-close" type="button">×</button>
        <div class="mt-train-picker-title">🏋️ ${ATTR_LABELS[attr]} 訓練站</div>
        <div class="mt-train-picker-rp">
          <span class="mt-train-rp-label">你的點數：</span>${rpBadges}
        </div>
        <div class="mt-train-picker-help">
          <div class="mt-train-help-row">
            <span class="mt-train-help-tag">⏱️ 慢慢練</span>
            <span class="mt-train-help-desc">免費 → 等時間到拿 <b>${ATTR_LABELS[attr]} +1</b></span>
          </div>
          <div class="mt-train-help-row">
            <span class="mt-train-help-tag mt-train-help-tag-rp">⚡ 集訓升等</span>
            <span class="mt-train-help-desc">耗點數 → <b>立刻升 1 級 + 6 屬性各 +1~3</b></span>
          </div>
          <div class="mt-train-help-row">
            <span class="mt-train-help-tag mt-train-help-tag-premium">⭐ 精英特訓</span>
            <span class="mt-train-help-desc">耗更多點數 → <b>升 1 級 + 6 屬性各 +2~5</b></span>
          </div>
        </div>
        <div class="mt-train-picker-list" id="mt-train-picker-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.querySelector('.mt-profile-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
    });

    const list = overlay.querySelector('#mt-train-picker-list');
    players.forEach(p => {
      const c = p.card || {};
      const isTraining = p.training_attr && p.training_finish_at;
      const isReady = isTraining && new Date(p.training_finish_at) <= new Date();
      const currentAttrVal = p['current_' + attr] || 0;
      const estSec = Math.max(60, Math.floor(Math.pow(currentAttrVal / 25, 2.2) * 50));
      const estLabel = estSec >= 3600 ? `${(estSec/3600).toFixed(1)} 小時`
        : estSec >= 60 ? `${Math.floor(estSec/60)} 分` : `${estSec} 秒`;
      const rpT = team.rp_tactical || 0;
      const rpP = team.rp_physical || 0;
      const rpH = team.rp_heart || 0;
      const rpI = team.rp_idea || 0;
      const isMaxLevel = p.level >= 50;
      const canNormal = rpT >= 10 && rpP >= 10 && !isMaxLevel;
      const canPremium = rpT >= 30 && rpP >= 30 && rpH >= 10 && rpI >= 10 && !isMaxLevel;
      // 缺什麼？（顯示具體原因）
      const missNormal = isMaxLevel ? '已滿級' :
        (rpT < 10 ? `🧠不足` : rpP < 10 ? `💪不足` : '');
      const missPremium = isMaxLevel ? '已滿級' :
        (rpT < 30 ? `🧠不足` : rpP < 30 ? `💪不足` :
         rpH < 10 ? `❤️不足` : rpI < 10 ? `💡不足` : '');

      const row = document.createElement('div');
      row.className = `mt-train-pick-row rarity-${c.rarity || 'R'}`;
      const imgId = `train-pick-${p.id}`;
      row.innerHTML = `
        <div class="mt-train-pick-portrait"><img id="${imgId}" alt="${escapeHtml(c.name)}" onerror="this.style.opacity='0.3'"></div>
        <div class="mt-train-pick-info">
          <div class="mt-train-pick-name">${escapeHtml(c.name)} <small>${c.position || ''} Lv.${p.level}</small></div>
          <div class="mt-train-pick-attr">當前 ${ATTR_LABELS[attr]}：<b>${p['current_' + attr]}</b> / 99</div>
        </div>
        <div class="mt-train-pick-btns">
          ${isTraining ? `
            <span class="mt-train-pick-busy">${isReady ? '⏱️ 已完成' : '⏱️ 訓練中'}</span>
          ` : `
            <button class="mt-train-pick-btn mt-train-pick-timed" data-pid="${p.id}">
              <div class="mt-train-btn-title">⏱️ 慢慢練</div>
              <div class="mt-train-btn-sub">等 ${estLabel} → +1 ${ATTR_LABELS[attr][0]}</div>
            </button>
            <button class="mt-train-pick-btn mt-train-pick-rp" data-pid="${p.id}" data-mode="normal" ${canNormal ? '' : 'disabled'} title="${missNormal}">
              <div class="mt-train-btn-title">⚡ 集訓升等</div>
              <div class="mt-train-btn-sub">${canNormal ? '🧠10 💪10 → Lv+1' : (missNormal || '')}</div>
            </button>
            <button class="mt-train-pick-btn mt-train-pick-rp mt-train-btn-premium" data-pid="${p.id}" data-mode="premium" ${canPremium ? '' : 'disabled'} title="${missPremium}">
              <div class="mt-train-btn-title">⭐ 精英特訓</div>
              <div class="mt-train-btn-sub">${canPremium ? '🧠30 💪30 ❤️10 💡10' : (missPremium || '')}</div>
            </button>
          `}
        </div>
      `;
      list.appendChild(row);
      const look = window.LpcRenderer && window.LpcRenderer.resolveLook(p);
      if (look && window.LpcRenderer) {
        window.LpcRenderer.portrait(look).then(url => {
          const img = document.getElementById(imgId);
          if (img && url) img.src = url;
        }).catch(() => {});
      }
    });

    // 時間訓練
    overlay.querySelectorAll('.mt-train-pick-timed').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.pid;
        btn.disabled = true; btn.innerHTML = '開始中…';
        try {
          await window.MyTeam.startTimedTraining(pid, attr);
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
          renderTab();
        } catch (e) {
          const msg = String(e.message || e);
          if (typeof showToast === 'function') {
            showToast(msg.includes('ALREADY_TRAINING') ? '⚠️ 該球員已在訓練' : '開始訓練失敗：' + msg);
          }
          btn.disabled = false;
          renderTab();
        }
      });
    });

    // RP 訓練
    overlay.querySelectorAll('.mt-train-pick-rp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.dataset.pid;
        const mode = btn.dataset.mode;
        overlay.querySelectorAll('.mt-train-pick-rp').forEach(b => b.disabled = true);
        try {
          const result = await window.MyTeam.trainPlayer(pid, mode);
          window.MyTeam.trackQuest?.('train', 1).catch(() => {});
          const g = result.gains;
          if (typeof showToast === 'function') {
            showToast(`💪 Lv.${result.level_after}！攻+${g.attack}/防+${g.defense}/速+${g.speed}/中+${g.midfield}/體+${g.stamina}/環+${g.aura}`);
          }
          overlay.classList.remove('open');
          setTimeout(() => overlay.remove(), 200);
          renderHub();
        } catch (err) {
          const msg = String(err.message || err);
          let friendly = '訓練失敗：' + msg;
          if (msg.includes('INSUFFICIENT_RP')) friendly = '⚠️ RP 不足';
          else if (msg.includes('MAX_LEVEL')) friendly = '⚠️ 已滿級';
          if (typeof showToast === 'function') showToast(friendly);
          else alert(friendly);
        }
      });
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── Phase 2.3：onboarding pixel art 場景動畫（草地 + 跳球 + 小 chibi 跑動）──
  let _sceneRafId = null;
  function _startOnboardScene(canvas) {
    if (!canvas || !canvas.getContext) return;
    if (_sceneRafId) cancelAnimationFrame(_sceneRafId);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width = 320 * dpr;
    const H = canvas.height = 160 * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;
    // 預先 build 一個小 chibi sprite（橘色球衣呼應主題）
    const chibi = _buildChibiSprite('#f0c040');

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 320, 160);
      // 不畫背景（讓 CSS 的 hero gradient + stars 顯示）

      // 草地條（底部 30px）
      const grassY = 130;
      const grassGrad = ctx.createLinearGradient(0, grassY, 0, 160);
      grassGrad.addColorStop(0, '#2e7d32');
      grassGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, grassY, 320, 30);
      // 草地紋路
      for (let i = 0; i < 320; i += 16) {
        ctx.fillStyle = (i / 16) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(i, grassY, 16, 30);
      }
      // 中線
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(160, grassY);
      ctx.lineTo(160, 160);
      ctx.stroke();

      // 小 chibi 來回跑（橫向 50-270 之間）
      const cx = 160 + Math.sin(t * 0.02) * 110;
      const facingRight = Math.cos(t * 0.02) > 0;
      const moving = true;
      const frame = Math.floor(t / 8) % 2;
      const SW = 12, SH = 16;
      const dx = Math.round(cx - SW / 2);
      const dy = grassY + 14 - SH / 2 - 4;
      // 陰影
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, grassY + 14, 5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (facingRight) {
        ctx.drawImage(chibi, frame * SW, 0, SW, SH, dx, dy, SW, SH);
      } else {
        ctx.save();
        ctx.translate(dx + SW, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(chibi, frame * SW, 0, SW, SH, 0, 0, SW, SH);
        ctx.restore();
      }

      // 跳動足球（左右來回，跳一個 sin 曲線）
      const bx = 160 + Math.sin(t * 0.025 + 1.5) * 90;
      const by = grassY + 8 - Math.abs(Math.sin(t * 0.06)) * 22;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      t += 1;
      _sceneRafId = requestAnimationFrame(draw);
    };
    draw();
  }

  // 12×16 chibi sprite 2-frame（與 match-sim 同設計、獨立寫一份避免相依）
  function _buildChibiSprite(jerseyColor) {
    const SW = 12, SH = 16;
    const cv = document.createElement('canvas');
    cv.width = SW * 2; cv.height = SH;
    const cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    const SKIN = '#f4c194', SHORT = '#fff', BOOT = '#1a1a2e';
    for (let f = 0; f < 2; f++) {
      const ox = f * SW;
      cx.fillStyle = SKIN; cx.fillRect(ox + 4, 0, 4, 4);
      cx.fillStyle = jerseyColor; cx.fillRect(ox + 3, 4, 6, 4);
      cx.fillStyle = SHORT; cx.fillRect(ox + 4, 8, 4, 2);
      cx.fillStyle = SKIN;
      if (f === 0) {
        cx.fillRect(ox + 4, 10, 1, 4);
        cx.fillRect(ox + 7, 10, 1, 4);
        cx.fillStyle = BOOT;
        cx.fillRect(ox + 4, 14, 1, 1);
        cx.fillRect(ox + 7, 14, 1, 1);
      } else {
        cx.fillRect(ox + 4, 10, 1, 3);
        cx.fillRect(ox + 7, 10, 1, 4);
        cx.fillStyle = BOOT;
        cx.fillRect(ox + 4, 13, 1, 1);
        cx.fillRect(ox + 7, 14, 1, 1);
      }
    }
    return cv;
  }
  // close modal 時停止動畫
  function _stopOnboardScene() {
    if (_sceneRafId) {
      cancelAnimationFrame(_sceneRafId);
      _sceneRafId = null;
    }
  }

  // 監聽 team change → 只更新 header 的數字、不重渲染整個 hub
  // （重建會 reset scroll + 中斷 home 動畫 + 中斷使用者互動）
  function _updateHeaderStats() {
    if (!_overlay) return;
    const team = window.MyTeam?.getCached();
    if (!team || team === 'not_created') return;
    const set = (id, val) => {
      const el = _overlay.querySelector('#' + id);
      if (el && el.textContent !== String(val)) el.textContent = val;
    };
    set('mt-hub-tickets', team.tickets || 0);
    set('mt-hub-stamina', `${team.stamina || 0}/${team.stamina_max || 5}`);
    set('mt-hub-ssr', team.ssr_select_tickets || 0);
    set('mt-hub-team-name', team.team_name || '');
    set('mt-hub-team-meta', `Lv.${team.stadium_level} 球場 · ${team.fans} 球迷`);
    // 更新隊徽（如果 crest_id / 顏色變了）
    const crestEl = _overlay.querySelector('#mt-hub-crest');
    if (crestEl) crestEl.innerHTML = _renderCrest(team);
    // 寶石（用 gems.js）
    if (typeof window.fetchGemBalance === 'function') {
      window.fetchGemBalance().then(balance => {
        const el = _overlay.querySelector('#mt-hub-gem');
        if (el) el.textContent = balance != null ? balance : '—';
      });
    }
  }

  window.addEventListener('my-team-changed', () => {
    if (_overlay && _overlay.classList.contains('open')) {
      const body = _overlay.querySelector('#mt-modal-body');
      if (body && body.querySelector('.mt-hub-header')) {
        _updateHeaderStats();
      }
    }
  });

  window.openMyTeamModal = open;
  window.closeMyTeamModal = close;
})();
