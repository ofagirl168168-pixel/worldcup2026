/* my-team-match.js — 比賽流程
 * 設計依據 docs/my-team-design.md §6 §7.5
 *
 * 對外：
 *   MyTeam.runMatch() — 全自動流程（gen 對手 → 跑 sim → 結算 → 顯示獎勵）
 */
(function () {
  'use strict';

  // ── 10 階聯賽 tier 平均能力（§6.1 v0.6）──
  const TIER_AVG = { 1: 40, 2: 50, 3: 60, 4: 70, 5: 75, 6: 80, 7: 85, 8: 88, 9: 92, 10: 95 };

  // ── 真實隊伍佔比（§7.5 v0.4）──
  const REAL_TEAM_RATIO = { 1: 0, 2: 0, 3: 0, 4: 0.1, 5: 0.2, 6: 0.3, 7: 0.45, 8: 0.65, 9: 0.85, 10: 1.0 };

  // ── NPC 隊名池（系統生成假隊）──
  const NPC_NAMES = [
    '北辰騎士', '南灣海狼', '青蘋果俱樂部', '雷霆獵戶', '黑曜石聯', '銀河使者',
    '皇家貝爾', '伊斯特海軍', '紅松鴉', '烈火鷹', '紫雲隊', '森林之子',
    '北極星 FC', '深淵藍鯨', '草原野馬', '高地戰士', '鋼鐵 SC', '聖橡聯',
  ];

  function _rng(seed) {
    let x = seed;
    return () => {
      x = (x * 9301 + 49297) % 233280;
      return x / 233280;
    };
  }

  // ── 教練 trait → 隊伍 buff（屬性 buff、機制 trait 待 sim 內擴展）──
  function _coachBuff(coachTrait, traitValue) {
    if (!coachTrait) return null;
    const ATTR_TRAITS = {
      tactician:        { midfield: 0.08 },
      offensive_master: { attack: 0.10 },
      defensive_master: { defense: 0.08 },
      speed_coach:      { speed: 0.08 },
      tiki_taka:        { attack: 0.10, midfield: 0.08 },
      iron_wall:        { defense: 0.08 },
      gegen_press:      { speed: 0.05, stamina: 0.10 },
      physio:           { stamina: 0.10 },
      youth_developer:  { /* training-time effect, no match buff */ },
    };
    if (ATTR_TRAITS[coachTrait]) return ATTR_TRAITS[coachTrait];
    if (coachTrait.endsWith('_3') && traitValue && traitValue.attr) {
      return { [traitValue.attr]: traitValue.pct };
    }
    return null;
  }

  // ── 羈絆（synergy）：3 個 active 教練組合特定特質 → 額外 buff ──
  function _synergyBonus(coachTraits, raritySet) {
    if (!coachTraits || coachTraits.length < 3) return { buff: null, label: null };
    const counts = {};
    coachTraits.forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1; });
    // 同一系列特質（合併家族）
    const fam = {
      tactic: (counts.tactician || 0) + (counts.tiki_taka || 0),
      defense: (counts.defensive_master || 0) + (counts.iron_wall || 0),
      attack: (counts.offensive_master || 0) + (counts.tiki_taka || 0),
      speed: (counts.speed_coach || 0) + (counts.gegen_press || 0),
      stamina: (counts.physio || 0) + (counts.gegen_press || 0),
      youth: counts.youth_developer || 0,
    };
    // 羈絆組合 — 優先級從高到低、取觸發的第一個
    if (fam.tactic >= 3)  return { buff: { midfield: 0.15 }, label: '🧠 戰術三人組' };
    if (fam.defense >= 3) return { buff: { defense: 0.15 },  label: '🛡️ 鋼鐵防線' };
    if (fam.attack >= 3)  return { buff: { attack: 0.15 },   label: '⚔️ 攻擊三叉戟' };
    if (fam.speed >= 3)   return { buff: { speed: 0.12 },    label: '⚡ 衝刺軍團' };
    if (fam.stamina >= 3) return { buff: { stamina: 0.20 },  label: '❤️ 體能訓練營' };
    if (fam.youth >= 3)   return { buff: { _trainingBonus: 0.5 }, label: '👶 青訓計畫' };
    // SSR 全明星：3 個都是 SSR（不限特質）
    if (raritySet && raritySet.filter(r => r === 'SSR').length >= 3) {
      return { buff: { attack: 0.05, defense: 0.05, midfield: 0.05, speed: 0.05 }, label: '⭐ SSR 全明星' };
    }
    return { buff: null, label: null };
  }

  // 合併教練 buff：head 100% + assists 50% 各、再疊加 synergy
  function _combineCoachBuffs(headCoach, assist1, assist2) {
    const merge = (target, source, weight) => {
      if (!source) return;
      Object.keys(source).forEach(k => {
        target[k] = (target[k] || 0) + (source[k] || 0) * weight;
      });
    };
    const combined = {};
    if (headCoach) merge(combined, _coachBuff(headCoach.coach?.trait, headCoach.coach?.trait_value), 1.0);
    if (assist1)   merge(combined, _coachBuff(assist1.coach?.trait,   assist1.coach?.trait_value),   0.5);
    if (assist2)   merge(combined, _coachBuff(assist2.coach?.trait,   assist2.coach?.trait_value),   0.5);
    // 3 個都 active → 算 synergy
    let synergy = null;
    if (headCoach && assist1 && assist2) {
      const traits = [headCoach.coach?.trait, assist1.coach?.trait, assist2.coach?.trait];
      const rarities = [headCoach.coach?.rarity, assist1.coach?.rarity, assist2.coach?.rarity];
      const syn = _synergyBonus(traits, rarities);
      if (syn.buff) {
        merge(combined, syn.buff, 1.0);
        synergy = syn;
      }
    }
    return { buff: combined, synergy };
  }

  // ── 玩家球隊資料 → match-sim 的 home 格式 ──
  function _buildMyTeamData(team, players, headCoach, assist1, assist2) {
    const now = new Date();
    const healthy = players.filter(p => !p.injured_until || new Date(p.injured_until) <= now);
    let starters = healthy.filter(p => p.in_starting_11);
    if (starters.length < 11) {
      const rest = healthy.filter(p => !p.in_starting_11)
        .sort((a, b) => (b.current_attack + b.current_defense) - (a.current_attack + a.current_defense));
      starters = starters.concat(rest.slice(0, 11 - starters.length));
    }
    if (!starters.length) return null;

    const avg = (key) => Math.round(starters.reduce((s, p) => s + (p[key] || 0), 0) / starters.length);

    // 合併 head 100% + assists 50% + synergy buff
    const { buff, synergy } = _combineCoachBuffs(headCoach, assist1, assist2);
    const applyBuff = (v, k) => buff && buff[k] ? Math.min(99, Math.round(v * (1 + buff[k]))) : v;

    // Kit 顏色從 team 取
    const kit = {
      shirtColor: team.kit_shirt_color || 'red',
      pantsColor: team.kit_pants_color || 'white',
      shoeColor:  team.kit_shoes_color || 'white',
    };

    return {
      nameCN: team.team_name,
      flag: team.team_crest,
      formation: team.formation || '4-3-3',
      kit,
      coachName: headCoach ? headCoach.coach?.name : null,
      synergy,  // 給 UI 顯示「⚔️ 攻擊三叉戟」之類
      keyPlayers: starters.slice(0, 11).map(p => ({
        name: p.card?.name || '?',
        pos: p.card?.position || 'MID',
        club: team.team_name,
        card_id: p.card?.card_id || p.card_id,
        look_data: window.LpcRenderer ? window.LpcRenderer.resolveLook(p) : null,
        // 天賦：awakened_talent (24h 集訓覺醒) 優先；fallback 卡片本身的 talent
        talent: p.awakened_talent || p.card?.talent || null,
        // 球員實際 6 屬性（讓 match-sim _statsFor 走玩家球員的真實數值、不是平均）
        stats: {
          attack: p.current_attack || 50,
          defense: p.current_defense || 50,
          speed: p.current_speed || 50,
          midfield: p.current_midfield || 50,
          stamina: p.current_stamina || 70,
          aura: p.current_aura || 50,
        },
      })),
      radar: {
        attack:     applyBuff(avg('current_attack'),  'attack'),
        defense:    applyBuff(avg('current_defense'), 'defense'),
        midfield:   applyBuff(avg('current_midfield'),'midfield'),
        speed:      applyBuff(avg('current_speed'),   'speed'),
        aura:       applyBuff(avg('current_aura'),    'aura'),
        experience: Math.min(95, 50 + (team.stadium_level - 1) * 5),
      },
    };
  }

  // 為 AI 對手生成 11 個 fake card_id + 對應 look_data（依 seed 穩定）
  function _generateAIPlayers(seed) {
    const r = _rng(seed);
    const out = [];
    const series = ['r-fwd', 'r-mid', 'r-def', 'r-gk', 'sr-fwd', 'sr-mid', 'sr-def'];
    const gen = window.LPC_SSR_LOOKS && window.LPC_SSR_LOOKS.generateRandomLook;
    for (let i = 0; i < 11; i++) {
      const s = series[Math.floor(r() * series.length)];
      const num = String(1 + Math.floor(r() * 100)).padStart(3, '0');
      const card_id = `${s}-${num}`;
      out.push({
        name: 'AI Player', pos: 'MID', club: 'AI', card_id,
        look_data: gen ? gen(seed + i * 31) : null,
      });
    }
    return out;
  }

  // ── AI NPC 對手生成 ──
  function _generateNPC(tier, matchIdx) {
    const baseAvg = TIER_AVG[tier] || 50;
    const rand = _rng(tier * 1000 + matchIdx);
    const name = NPC_NAMES[Math.floor(rand() * NPC_NAMES.length)] + ' ' + String.fromCharCode(65 + matchIdx);
    const variance = 8;
    const roll = (b) => Math.max(20, Math.min(95, Math.round(b + (rand() - 0.5) * variance * 2)));
    return {
      nameCN: name,
      flag: '🏴',
      _isReal: false,
      keyPlayers: _generateAIPlayers(tier * 1000 + matchIdx),
      radar: {
        attack:     roll(baseAvg),
        defense:    roll(baseAvg),
        midfield:   roll(baseAvg),
        speed:      roll(baseAvg),
        aura:       roll(baseAvg - 3),
        experience: roll(baseAvg - 5),
      },
    };
  }

  function _attachAIPlayers(obj, seed) {
    if (!obj.keyPlayers || obj.keyPlayers.length < 11) {
      obj.keyPlayers = _generateAIPlayers(seed);
    } else {
      // 真實隊伍的 keyPlayers 沒有 card_id、補上
      const aiSet = _generateAIPlayers(seed);
      obj.keyPlayers = obj.keyPlayers.slice(0, 11).map((kp, i) => ({
        ...kp,
        card_id: kp.card_id || aiSet[i].card_id,
      }));
      while (obj.keyPlayers.length < 11) {
        obj.keyPlayers.push(aiSet[obj.keyPlayers.length]);
      }
    }
    return obj;
  }

  // ── 真實隊伍對手生成（從站內 EPL / UCL）──
  function _generateReal(tier, matchIdx) {
    // 從 EPL_TEAMS + UCL_TEAMS 撈一隊
    const epl = Object.values(window.EPL_TEAMS || {}).filter(t => t.radar);
    const ucl = Object.values(window.UCL_TEAMS || {}).filter(t => t.radar);
    const pool = [...epl, ...ucl];
    if (!pool.length) return _generateNPC(tier, matchIdx);
    // 高 tier 抽強隊（按 radar 平均排序、tier 越高越偏前段）
    pool.sort((a, b) => {
      const sa = (a.radar.attack + a.radar.defense + a.radar.midfield) / 3;
      const sb = (b.radar.attack + b.radar.defense + b.radar.midfield) / 3;
      return sb - sa;
    });
    // tier 4 = 後段、tier 10 = 前段
    const topRatio = (tier - 4) / 6; // 0~1
    const sliceEnd = Math.max(5, Math.round(pool.length * (0.3 + topRatio * 0.7)));
    const rand = _rng(tier * 7000 + matchIdx);
    const candidates = pool.slice(0, sliceEnd);
    const team = candidates[Math.floor(rand() * candidates.length)];
    const obj = {
      nameCN: team.nameCN || team.name,
      flag: team.flag || '🏴',
      keyPlayers: team.keyPlayers || [],
      _isReal: true,
      _origRadar: team.radar,
      radar: team.radar,
    };
    return _attachAIPlayers(obj, tier * 7000 + matchIdx + 999);
  }

  // ── 抽對手（依 tier 機率混合 NPC / Real）──
  function _pickOpponent(tier, matchIdx) {
    const realRatio = REAL_TEAM_RATIO[tier] || 0;
    const r = (Math.random() < realRatio);
    return r ? _generateReal(tier, matchIdx) : _generateNPC(tier, matchIdx);
  }

  // ── 預覽下一關對手（穩定種子、不消耗也不影響實際抽對手）──
  function peekNextOpponent(tier, matchIdx) {
    const realRatio = REAL_TEAM_RATIO[tier] || 0;
    const r = _rng(tier * 9907 + matchIdx + 1);
    const isReal = r() < realRatio;
    return isReal ? _generateReal(tier, matchIdx) : _generateNPC(tier, matchIdx);
  }

  // ── 結算 RPC ──
  async function _finalize(opponent, scoreH, scoreA, isBoss) {
    let data;
    if (opponent._isTutorial) {
      // 教學賽：純設旗標、不寫 league_progress、不扣體力
      try {
        await window.DB.from('my_team')
          .update({ tutorial_match_done: true })
          .eq('user_id', window.currentUser.id);
        await window.MyTeam.refresh?.();
      } catch (e) {}
      const result = scoreH > scoreA ? 'W' : (scoreH < scoreA ? 'L' : 'D');
      return { result, rp_earned: 0, gems_earned: 0, fans_delta: 0, isTutorial: true };
    }
    if (opponent._isPvp) {
      const oppSnap = {
        nameCN: opponent.nameCN, flag: opponent.flag, radar: opponent.radar,
        pvp_elo: opponent.pvp_elo, formation: opponent.formation, kit: opponent.kit,
      };
      data = await window.MyTeam.finalizePvpMatch(opponent._oppUserId, oppSnap, scoreH, scoreA, []);
      window.MyTeam?.trackQuest?.('pvp_play', 1).catch(() => {});
    } else {
      const opponentSnapshot = {
        nameCN: opponent.nameCN, flag: opponent.flag,
        radar: opponent.radar, isReal: !!opponent._isReal,
      };
      const res = await window.DB.rpc('finalize_match', {
        p_opponent_data: opponentSnapshot,
        p_opponent_type: opponent._isReal ? 'ai_real' : 'ai_npc',
        p_is_boss: !!isBoss,
        p_score_home: scoreH, p_score_away: scoreA, p_match_log: [],
      });
      if (res.error) throw res.error;
      data = res.data;
    }
    // 任務 + 傷病（兩種 match 都觸發）
    window.MyTeam?.trackQuest?.('match_play', 1).catch(() => {});
    window.DB?.rpc('injure_random_player', { p_chance_pct: 8 }).then(res => {
      const d = res?.data;
      if (d?.injured && typeof showToast === 'function') {
        showToast(`🏥 ${d.name} 受傷了！${d.days} 天無法出賽`);
      }
    }).catch(() => {});
    return data;
  }

  // ── 公開：跑一場（match modal）──
  async function runMatch(opts = {}) {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') {
      if (typeof showToast === 'function') showToast('⚠️ 請先建立球隊');
      return;
    }
    // 教學賽不消耗體力
    if (!opts.tutorial && team.stamina < 1) {
      if (typeof showToast === 'function') showToast('⚡ 體力不足，今天打太多了！明天再來、或預測比分賺體力');
      return;
    }

    // 撈球員 → 組 home 資料
    const players = await window.MyTeam.fetchPlayers();
    if (!players.length) {
      if (typeof showToast === 'function') showToast('🎰 還沒有球員！先去抽卡');
      return;
    }
    const healthyCount = players.filter(p => !p.injured_until || new Date(p.injured_until) <= new Date()).length;
    if (players.length < 11) {
      if (typeof showToast === 'function') showToast(`⚠️ 不足 11 人（目前 ${players.length}）— 先抽卡補滿陣容才能比賽`);
      return;
    }
    if (healthyCount < 11) {
      if (typeof showToast === 'function') showToast(`🏥 健康球員不足 11 人（${healthyCount}/11）— 用「傷病恢復包」治療或等他們康復`);
      return;
    }

    // 撈 3 個教練（主 + 2 助）一次撈完
    const coachIds = [team.active_coach_id, team.assist_coach_id_1, team.assist_coach_id_2].filter(Boolean);
    const coachMap = new Map();
    if (coachIds.length > 0) {
      const { data: coachRows } = await window.DB.from('user_coach')
        .select('*, coach:coach_pool(*)').in('id', coachIds);
      (coachRows || []).forEach(c => coachMap.set(c.id, c));
    }
    const headCoach = team.active_coach_id ? (coachMap.get(team.active_coach_id) || null) : null;
    const assist1 = team.assist_coach_id_1 ? (coachMap.get(team.assist_coach_id_1) || null) : null;
    const assist2 = team.assist_coach_id_2 ? (coachMap.get(team.assist_coach_id_2) || null) : null;

    const homeData = _buildMyTeamData(team, players, headCoach, assist1, assist2);
    if (!homeData) {
      if (typeof showToast === 'function') showToast('⚠️ 球員資料不足');
      return;
    }

    let tier = 1, matchIdx = 0, opponent, isBoss = false, isTutorial = false;
    if (opts.tutorial) {
      // 教學賽：弱對手保證新手贏（radar 全 25-30、無 talent）
      isTutorial = true;
      opponent = {
        nameCN: '友隊 FC',
        flag: '🏟️',
        _isReal: false,
        _isTutorial: true,
        radar: { attack: 25, defense: 22, midfield: 25, speed: 25, experience: 30 },
        keyPlayers: _generateAIPlayers(99999),
      };
    } else {
      const { data: prog } = await window.DB
        .from('league_progress').select('*').eq('user_id', team.user_id).maybeSingle();
      tier = prog?.current_tier || 1;
      matchIdx = prog?.matches_played || 0;
      opponent = _pickOpponent(tier, matchIdx);
      isBoss = !!opponent._isReal;
    }

    _openMatchModal({ team, homeData, opponent, tier, matchIdx, isBoss, isTutorial });
  }

  // ── 比賽 modal ──
  function _openMatchModal(ctx) {
    const overlay = document.createElement('div');
    overlay.className = 'mt-match-overlay';
    overlay.innerHTML = `
      <div class="mt-match-stage">
        <button class="mt-modal-close" type="button">×</button>
        <div id="mt-match-content"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.querySelector('.mt-modal-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    });

    _renderPreMatch(overlay, ctx);
  }

  function _renderPreMatch(overlay, ctx) {
    const content = overlay.querySelector('#mt-match-content');
    const hAvg = avgRadar(ctx.homeData.radar);
    const aAvg = avgRadar(ctx.opponent.radar);
    const winProb = _estimateWinProb(hAvg, aAvg);
    const tierName = ({1:'新手聯賽',2:'業餘聯賽',3:'地區聯賽',4:'全國次級',5:'全國聯賽',6:'大陸盃',7:'歐洲菁英',8:'世界次級',9:'世界聯賽',10:'傳奇聯賽'})[ctx.tier];
    const homeCrestSvg = _renderTeamCrest(ctx.team);
    content.innerHTML = `
      <div class="mt-pre-match ${ctx.isBoss ? 'is-boss' : ''}">
        <div class="mt-pre-match-tier">${tierName} · 第 ${ctx.matchIdx + 1}/10 場</div>
        ${ctx.isBoss ? '<div class="mt-pre-match-boss">⭐ 真實隊伍 BOSS 戰 ⭐</div>' : ''}

        <!-- 雙隊衝撞 -->
        <div class="mt-pre-match-arena">
          <div class="mt-pre-match-clash-rays"></div>
          <div class="mt-pre-match-side mt-pre-match-side-home">
            <div class="mt-pre-match-crest mt-pre-match-crest-svg">${homeCrestSvg}</div>
            <div class="mt-pre-match-name">${escapeHtml(ctx.team.team_name)}</div>
            <div class="mt-pre-match-radar">攻 <b>${ctx.homeData.radar.attack}</b> · 防 <b>${ctx.homeData.radar.defense}</b> · 速 <b>${ctx.homeData.radar.speed}</b></div>
            <div class="mt-pre-match-avg">綜合 <span data-count="${hAvg}">0</span></div>
          </div>
          <div class="mt-pre-match-mid">
            <div class="mt-pre-match-mid-vs">VS</div>
            <div class="mt-pre-match-mid-spark">⚡</div>
          </div>
          <div class="mt-pre-match-side mt-pre-match-side-away">
            <div class="mt-pre-match-crest">${_renderFlag(ctx.opponent.flag)}</div>
            <div class="mt-pre-match-name">${escapeHtml(ctx.opponent.nameCN)}</div>
            <div class="mt-pre-match-radar">攻 <b>${ctx.opponent.radar.attack}</b> · 防 <b>${ctx.opponent.radar.defense}</b> · 速 <b>${ctx.opponent.radar.speed}</b></div>
            <div class="mt-pre-match-avg">綜合 <span data-count="${aAvg}">0</span></div>
          </div>
        </div>

        <!-- 勝率對比條 -->
        <div class="mt-pre-match-prob">
          <div class="mt-pre-match-prob-label">勝率預估</div>
          <div class="mt-pre-match-prob-bar">
            <div class="mt-pre-match-prob-home" style="width:0%" data-target="${winProb}"></div>
            <div class="mt-pre-match-prob-away" style="width:0%" data-target="${100-winProb}"></div>
          </div>
          <div class="mt-pre-match-prob-stats">
            <span class="mt-prob-h">勝 <b data-count="${winProb}">0</b>%</span>
            <span class="mt-prob-a">敗 <b data-count="${100-winProb}">0</b>%</span>
          </div>
        </div>

        <!-- 倒數開賽（取代手動按鈕） -->
        <div class="mt-pre-match-countdown" id="mt-pre-match-countdown">
          <span class="mt-pre-match-countdown-num">3</span>
          <span class="mt-pre-match-countdown-label">即將開戰</span>
        </div>
      </div>
    `;
    // 動畫：count-up 數字 + 勝率條 fill
    setTimeout(() => {
      content.querySelectorAll('[data-count]').forEach(el => {
        _countUp(el, parseInt(el.dataset.count), 700);
      });
      const homeBar = content.querySelector('.mt-pre-match-prob-home');
      const awayBar = content.querySelector('.mt-pre-match-prob-away');
      if (homeBar) homeBar.style.width = homeBar.dataset.target + '%';
      if (awayBar) awayBar.style.width = awayBar.dataset.target + '%';
    }, 300);

    // 倒數 3 → 2 → 1 → GO! → 自動開始
    const cdEl = content.querySelector('#mt-pre-match-countdown');
    const cdNum = cdEl?.querySelector('.mt-pre-match-countdown-num');
    const cdLabel = cdEl?.querySelector('.mt-pre-match-countdown-label');
    const ticks = [
      { delay: 1300, n: '2', label: '即將開戰' },
      { delay: 2100, n: '1', label: '即將開戰' },
      { delay: 2900, n: 'GO!', label: '' },
    ];
    ticks.forEach(t => {
      setTimeout(() => {
        if (!cdNum || !overlay.isConnected) return;
        cdNum.textContent = t.n;
        cdNum.classList.remove('mt-cd-pulse');
        void cdNum.offsetWidth;
        cdNum.classList.add('mt-cd-pulse');
        if (cdLabel) cdLabel.textContent = t.label;
        if (t.n === 'GO!') cdNum.classList.add('mt-cd-go');
      }, t.delay);
    });
    setTimeout(() => {
      if (!overlay.isConnected) return;
      _runSim(overlay, ctx);
    }, 3400);
  }

  // ── 渲染玩家隊伍隊徽 SVG（fallback：emoji / 預設 SVG）──
  function _renderTeamCrest(team) {
    if (!team) return '⚽';
    if (!window.TeamCrests) return team.team_crest || '⚽';
    const list = window.TeamCrests.listCrests ? window.TeamCrests.listCrests() : [];
    const id = team.team_crest && list.includes(team.team_crest) ? team.team_crest : 'football';
    const primary = team.crest_primary || '#c0392b';
    const accent  = team.crest_accent  || '#f1c40f';
    return window.TeamCrests.getSvg(id, primary, accent);
  }

  function _countUp(el, target, duration) {
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  }

  function _renderFlag(f) {
    if (!f) return '🏴';
    if (/^https?:\/\//.test(f)) return `<img src="${f}" style="width:48px;height:48px;border-radius:50%;background:#fff;object-fit:contain">`;
    return f;
  }

  function avgRadar(r) {
    return Math.round((r.attack + r.defense + r.midfield + r.speed) / 4);
  }

  function _estimateWinProb(hAvg, aAvg) {
    const diff = hAvg - aAvg;
    // sigmoid-like
    return Math.max(5, Math.min(95, Math.round(50 + diff * 1.5)));
  }

  async function _runSim(overlay, ctx) {
    const content = overlay.querySelector('#mt-match-content');
    content.innerHTML = `
      <div class="mt-match-sim">
        <div id="mt-match-sim-host"></div>
      </div>
    `;
    if (!window.MatchSim || typeof window.MatchSim.runDirect !== 'function') {
      content.innerHTML = '<div style="color:#ef9a9a;padding:20px;text-align:center">⚠️ match-sim 未載入</div>';
      return;
    }
    // 載入我方球員的 fever_gauge（跨場次保存）
    const feverGauges = {};
    if (window.DB && !ctx.isPvp) {
      try {
        const team = window.MyTeam.getCached();
        const players = await window.MyTeam.fetchPlayers();
        (players || []).forEach(p => {
          if (p.card_id) feverGauges[p.card_id] = Number(p.fever_gauge || 0);
        });
      } catch (e) {}
    }
    // 追蹤本場每個球員的當前 gauge（在 match-sim 內每次達 100 觸發狂熱會 push 0 回來）
    const liveGauges = { ...feverGauges };
    window.MatchSim.runDirect(
      content.querySelector('#mt-match-sim-host'),
      ctx.homeData,
      ctx.opponent,
      {
        matchId: 'mt-' + Date.now(),
        seed: Date.now(),
        hideReplay: true,
        feverGauges,
        onFeverGaugeChange: (cardId, val) => { liveGauges[cardId] = val; },
        onEnd: async (score) => {
          // 結算
          try {
            const result = await _finalize(ctx.opponent, score.h, score.a, ctx.isBoss);
            // 保存當前 fever gauges 到 DB（跨場次累積）
            // 用 match-sim onEnd 回傳的 finalGauges（最終狀態）
            const gaugesToSave = score.finalGauges || liveGauges;
            if (window.DB && !ctx.isPvp && Object.keys(gaugesToSave).length) {
              try {
                await window.DB.rpc('update_fever_gauges', { p_gauges: gaugesToSave });
              } catch (e) { console.warn('[my-team] save fever gauges failed', e); }
            }
            await window.MyTeam.fetch();
            // 先播結果 splash 動畫、再展示 post-match 結算頁
            _playResultSplash(overlay, ctx, score, result.result, () => {
              _renderPostMatch(overlay, ctx, score, result);
            });
          } catch (err) {
            console.error('[my-team] finalize error', err);
            const msg = String(err.message || err);
            content.innerHTML = `<div style="color:#ef9a9a;padding:20px;text-align:center">⚠️ 結算失敗：${escapeHtml(msg)}</div>`;
          }
        },
      }
    );
  }

  // ── 比賽結果 splash 動畫（覆蓋 modal stage、跟 GOAL 動畫同風格） ──
  function _playResultSplash(overlay, ctx, score, result, onDone) {
    const stage = overlay.querySelector('.mt-match-stage');
    if (!stage) { onDone && onDone(); return; }
    const label = ({ W: '勝 利', D: '平 手', L: '失 利' })[result] || '結 束';
    const subText = ({
      W: ctx.isBoss ? '擊敗真實隊伍 BOSS！' : '幹得好、繼續闖關',
      D: '勢均力敵',
      L: '下次再來',
    })[result] || '';
    const splash = document.createElement('div');
    splash.className = 'mt-result-splash mt-result-' + (result || 'D');
    splash.innerHTML = `
      <div class="mt-result-splash-text">${label}</div>
      <div class="mt-result-splash-score">${score.h} - ${score.a}</div>
      <div class="mt-result-splash-sub">${escapeHtml(subText)}</div>
    `;
    stage.appendChild(splash);

    // 闖關模式 + 勝利時 splash 多停 1.5 秒（從 2200→3700ms）讓玩家看清楚「幹得好、繼續闖關」
    // 不被立刻換場到 post-match 的大比分蓋過
    const isStageWin = result === 'W' && !ctx.isPvp;
    const splashDuration = isStageWin ? 3700 : 2200;
    setTimeout(() => {
      splash.classList.add('exit');
      setTimeout(() => {
        if (splash.parentElement) splash.remove();
        onDone && onDone();
      }, 400);
    }, splashDuration);
  }

  function _renderPostMatch(overlay, ctx, score, result) {
    const content = overlay.querySelector('#mt-match-content');
    const resultLabel = ({W:'勝利',D:'平手',L:'失利'})[result.result];
    const resultIcon = ({W:'🏆',D:'🤝',L:'😢'})[result.result];
    const colorClass = ({W:'win',D:'draw',L:'loss'})[result.result];

    // PvP ELO 顯示
    let pvpHtml = '';
    if (ctx.isPvp && result.my_elo_delta != null) {
      const sign = result.my_elo_delta > 0 ? '+' : '';
      const cls = result.my_elo_delta > 0 ? 'up' : result.my_elo_delta < 0 ? 'down' : '';
      pvpHtml = `
        <div class="mt-post-pvp">
          <div class="mt-post-pvp-title">⚔️ PvP 排位</div>
          <div class="mt-post-pvp-elo ${cls}">ELO ${sign}${result.my_elo_delta} → <b>${result.new_my_elo}</b></div>
        </div>
      `;
    }

    let seasonHtml = '';
    if (result.season_complete) {
      const tierMsg = result.tier_change === 'up' ? `<div class="mt-post-season-tier up">⬆️ 晉級到 Tier ${result.new_tier}</div>` :
                      result.tier_change === 'down' ? `<div class="mt-post-season-tier down">⬇️ 降級到 Tier ${result.new_tier}</div>` :
                      `<div class="mt-post-season-tier">留在 Tier ${result.new_tier}</div>`;
      seasonHtml = `
        <div class="mt-post-match-season">
          <div class="mt-post-match-season-title">🏆 賽季結束</div>
          ${tierMsg}
          ${result.season_reward_gems > 0 ? `<div class="mt-post-season-reward">💎 +<span data-count="${result.season_reward_gems}">0</span></div>` : ''}
          ${result.season_reward_ssr_ticket > 0 ? '<div class="mt-post-season-reward">⭐ +1 SSR 自選券（賽季冠軍）</div>' : ''}
        </div>
      `;
    }

    const tutorialHtml = ctx.isTutorial ? `
      <div class="mt-post-tutorial-banner">
        🎓 教學賽完成！<br>
        <span style="font-size:13px;opacity:0.9">接下來教你<b>訓練</b>球員、讓他們變更強</span>
      </div>
    ` : '';

    content.innerHTML = `
      <div class="mt-post-match ${colorClass}">
        ${result.result === 'W' ? '<div class="mt-post-confetti"></div>' : ''}
        <div class="mt-post-match-icon">${resultIcon}</div>
        <div class="mt-post-match-result">${resultLabel}</div>
        <div class="mt-post-match-score">
          <span class="mt-post-score-h" data-count="${score.h}">0</span>
          <span class="mt-post-score-sep">-</span>
          <span class="mt-post-score-a" data-count="${score.a}">0</span>
        </div>
        <div class="mt-post-match-vs">${escapeHtml(ctx.team.team_name)} <span style="opacity:0.5">vs</span> ${escapeHtml(ctx.opponent.nameCN)}</div>
        ${ctx.isBoss && result.result === 'W' ? '<div class="mt-post-match-boss-bonus">⭐ 擊敗真實隊伍 BOSS！</div>' : ''}
        ${tutorialHtml}
        ${!ctx.isTutorial ? `
          <div class="mt-post-match-rewards">
            <div class="mt-post-reward">
              <div class="mt-post-reward-icon">⚙️</div>
              <div class="mt-post-reward-val">+<span data-count="${result.rp_earned}">0</span></div>
              <div class="mt-post-reward-label">RP ×4</div>
            </div>
            <div class="mt-post-reward">
              <div class="mt-post-reward-icon">💎</div>
              <div class="mt-post-reward-val">+<span data-count="${result.gems_earned}">0</span></div>
              <div class="mt-post-reward-label">寶石</div>
            </div>
            <div class="mt-post-reward">
              <div class="mt-post-reward-icon">${result.fans_delta >= 0 ? '👥' : '😞'}</div>
              <div class="mt-post-reward-val">${result.fans_delta >= 0 ? '+' : ''}<span data-count="${Math.abs(result.fans_delta)}">0</span></div>
              <div class="mt-post-reward-label">球迷</div>
            </div>
          </div>
        ` : ''}
        ${pvpHtml}
        ${seasonHtml}
        <button class="mt-pre-match-go" id="mt-match-close">${ctx.isTutorial ? '🏋️ 接著教我訓練 →' : '確認收下'}</button>
      </div>
    `;
    overlay.querySelector('#mt-match-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      window.dispatchEvent(new CustomEvent('my-team-changed'));
      // 教學賽 → 接訓練 tutorial
      if (ctx.isTutorial && typeof window._runTrainingTutorial === 'function') {
        setTimeout(() => window._runTrainingTutorial(), 400);
      }
    });
    // count-up
    setTimeout(() => {
      content.querySelectorAll('[data-count]').forEach(el => {
        _countUp(el, parseInt(el.dataset.count) || 0, 900);
      });
    }, 300);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ── PvP 對戰 ──
  async function runPvpMatch() {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') {
      if (typeof showToast === 'function') showToast('⚠️ 請先建立球隊');
      return;
    }
    if (team.stamina < 1) {
      if (typeof showToast === 'function') showToast('⚡ 體力不足');
      return;
    }

    const players = await window.MyTeam.fetchPlayers();
    if (players.length < 11) {
      if (typeof showToast === 'function') showToast(`⚠️ 不足 11 人（目前 ${players.length}）— 先抽卡補滿`);
      return;
    }
    const healthyCount = players.filter(p => !p.injured_until || new Date(p.injured_until) <= new Date()).length;
    if (healthyCount < 11) {
      if (typeof showToast === 'function') showToast(`🏥 健康球員不足 11 人（${healthyCount}/11）`);
      return;
    }

    // 3 個教練（主 + 2 助）
    const coachIds = [team.active_coach_id, team.assist_coach_id_1, team.assist_coach_id_2].filter(Boolean);
    const coachMap = new Map();
    if (coachIds.length > 0) {
      const { data: coachRows } = await window.DB.from('user_coach')
        .select('*, coach:coach_pool(*)').in('id', coachIds);
      (coachRows || []).forEach(c => coachMap.set(c.id, c));
    }
    const headCoach = team.active_coach_id ? (coachMap.get(team.active_coach_id) || null) : null;
    const assist1 = team.assist_coach_id_1 ? (coachMap.get(team.assist_coach_id_1) || null) : null;
    const assist2 = team.assist_coach_id_2 ? (coachMap.get(team.assist_coach_id_2) || null) : null;
    const homeData = _buildMyTeamData(team, players, headCoach, assist1, assist2);
    if (!homeData) {
      if (typeof showToast === 'function') showToast('⚠️ 球員資料不足');
      return;
    }

    // 找對手（會 throw 如果沒對手 / 額度滿）
    const opponent = await window.MyTeam.findPvpOpponent();
    if (!opponent) {
      if (typeof showToast === 'function') showToast('找不到合適對手');
      return;
    }

    // 標記成 PvP（之後結算用 finalize_pvp_match 而非 finalize_match）
    opponent._isPvp = true;
    opponent._oppUserId = opponent.user_id;

    _openMatchModal({
      team, homeData, opponent,
      tier: null, matchIdx: 0, isBoss: false, isPvp: true,
    });
  }

  if (window.MyTeam) {
    window.MyTeam.runMatch = runMatch;
    window.MyTeam.runPvpMatch = runPvpMatch;
    window.MyTeam.peekNextOpponent = peekNextOpponent;
  }
})();
