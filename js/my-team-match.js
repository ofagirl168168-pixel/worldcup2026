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

  // ── 玩家球隊資料 → match-sim 的 home 格式 ──
  function _buildMyTeamData(team, players) {
    let starters = players.filter(p => p.in_starting_11);
    if (starters.length < 11) {
      // 補滿 11 人：取剩下最強的
      const rest = players.filter(p => !p.in_starting_11)
        .sort((a, b) => (b.current_attack + b.current_defense) - (a.current_attack + a.current_defense));
      starters = starters.concat(rest.slice(0, 11 - starters.length));
    }
    if (!starters.length) return null;

    // radar = 首發平均
    const avg = (key) => Math.round(starters.reduce((s, p) => s + (p[key] || 0), 0) / starters.length);
    return {
      nameCN: team.team_name,
      flag: team.team_crest,
      // Phase 2.2+ 傳 card_id 給 match-sim、用來 lookup PIPOYA sprite
      keyPlayers: starters.slice(0, 11).map(p => ({
        name: p.card?.name || '?',
        pos: p.card?.position || 'MID',
        club: team.team_name,
        card_id: p.card?.card_id || p.card_id,
      })),
      radar: {
        attack:     avg('current_attack'),
        defense:    avg('current_defense'),
        midfield:   avg('current_midfield'),
        speed:      avg('current_speed'),
        experience: Math.min(95, 50 + (team.stadium_level - 1) * 5),
      },
    };
  }

  // 為 AI 對手生成 11 個 fake card_id（依 seed 穩定）
  function _generateAIPlayers(seed) {
    // 從常見 R/SR 系列 hash 出 11 個
    const r = _rng(seed);
    const out = [];
    const series = ['r-fwd', 'r-mid', 'r-def', 'r-gk', 'sr-fwd', 'sr-mid', 'sr-def'];
    for (let i = 0; i < 11; i++) {
      const s = series[Math.floor(r() * series.length)];
      const num = String(1 + Math.floor(r() * 100)).padStart(3, '0');
      out.push({ name: 'AI Player', pos: 'MID', club: 'AI', card_id: `${s}-${num}` });
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

  // ── 結算 RPC ──
  async function _finalize(opponent, scoreH, scoreA, isBoss) {
    const opponentSnapshot = {
      nameCN: opponent.nameCN, flag: opponent.flag,
      radar: opponent.radar, isReal: !!opponent._isReal,
    };
    const { data, error } = await window.DB.rpc('finalize_match', {
      p_opponent_data: opponentSnapshot,
      p_opponent_type: opponent._isReal ? 'ai_real' : 'ai_npc',
      p_is_boss: !!isBoss,
      p_score_home: scoreH,
      p_score_away: scoreA,
      p_match_log: [],
    });
    if (error) throw error;
    return data;
  }

  // ── 公開：跑一場（match modal）──
  async function runMatch() {
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') {
      if (typeof showToast === 'function') showToast('⚠️ 請先建立球隊');
      return;
    }
    if (team.stamina < 1) {
      if (typeof showToast === 'function') showToast('⚡ 體力不足，今天打太多了！明天再來、或預測比分賺體力');
      return;
    }

    // 撈球員 → 組 home 資料
    const players = await window.MyTeam.fetchPlayers();
    if (!players.length) {
      if (typeof showToast === 'function') showToast('🎰 還沒有球員！先去抽卡');
      return;
    }
    const homeData = _buildMyTeamData(team, players);
    if (!homeData) {
      if (typeof showToast === 'function') showToast('⚠️ 球員資料不足');
      return;
    }

    // 撈聯賽進度
    const { data: prog } = await window.DB
      .from('league_progress')
      .select('*')
      .eq('user_id', team.user_id)
      .maybeSingle();
    const tier = prog?.current_tier || 1;
    const matchIdx = prog?.matches_played || 0;
    const opponent = _pickOpponent(tier, matchIdx);
    const isBoss = !!opponent._isReal;

    _openMatchModal({ team, homeData, opponent, tier, matchIdx, isBoss });
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
    content.innerHTML = `
      <div class="mt-pre-match ${ctx.isBoss ? 'is-boss' : ''}">
        <div class="mt-pre-match-tier">${tierName} · 第 ${ctx.matchIdx + 1}/10 場</div>
        ${ctx.isBoss ? '<div class="mt-pre-match-boss">⭐ 真實隊伍 BOSS 戰 ⭐</div>' : ''}

        <!-- 雙隊衝撞 -->
        <div class="mt-pre-match-arena">
          <div class="mt-pre-match-clash-rays"></div>
          <div class="mt-pre-match-side mt-pre-match-side-home">
            <div class="mt-pre-match-crest">${ctx.team.team_crest}</div>
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

        <button class="mt-pre-match-go" id="mt-match-start">
          <span class="mt-pre-match-go-icon">⚽</span>
          <span>開始比賽</span>
          <span class="mt-pre-match-go-cost">耗 1 ⚡</span>
        </button>
      </div>
    `;
    overlay.querySelector('#mt-match-start').addEventListener('click', () => _runSim(overlay, ctx));
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

  function _runSim(overlay, ctx) {
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
    window.MatchSim.runDirect(
      content.querySelector('#mt-match-sim-host'),
      ctx.homeData,
      ctx.opponent,
      {
        matchId: 'mt-' + Date.now(),
        seed: Date.now(),
        hideReplay: true,
        onEnd: async (score) => {
          // 結算
          try {
            const result = await _finalize(ctx.opponent, score.h, score.a, ctx.isBoss);
            await window.MyTeam.fetch();
            _renderPostMatch(overlay, ctx, score, result);
          } catch (err) {
            console.error('[my-team] finalize error', err);
            const msg = String(err.message || err);
            content.innerHTML = `<div style="color:#ef9a9a;padding:20px;text-align:center">⚠️ 結算失敗：${escapeHtml(msg)}</div>`;
          }
        },
      }
    );
  }

  function _renderPostMatch(overlay, ctx, score, result) {
    const content = overlay.querySelector('#mt-match-content');
    const resultLabel = ({W:'勝利',D:'平手',L:'失利'})[result.result];
    const resultIcon = ({W:'🏆',D:'🤝',L:'😢'})[result.result];
    const colorClass = ({W:'win',D:'draw',L:'loss'})[result.result];

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
        ${seasonHtml}
        <button class="mt-pre-match-go" id="mt-match-close">確認收下</button>
      </div>
    `;
    overlay.querySelector('#mt-match-close').addEventListener('click', () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      window.dispatchEvent(new CustomEvent('my-team-changed'));
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

  if (window.MyTeam) {
    window.MyTeam.runMatch = runMatch;
  }
})();
