/* =============================================
   MATCH-SIM.JS — 90 分鐘模擬賽（持球者狀態機版）
   球員有真正的運動邏輯：持球者盤帶/傳球/射門、非持球者依角色回防或前插、
   對方靠近會搶斷、球跟著持球者或在傳球時沿直線飛行。
   ============================================= */

(function () {
  'use strict';

  // ── Seedable RNG ────────────────────────────────────────
  // 給「直播同步」功能用：相同 seed 必定產出相同比分/事件/球員位置
  // 沒帶 seed 時 fallback 到 Math.random，保留原有「每次模擬都不同」行為
  function makeSeededRng(seedStr) {
    let h = 2166136261 >>> 0;
    const s = String(seedStr);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    let state = h >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── 視覺參數 ────────────────────────────────────────────
  const PITCH_W = 320;
  const PITCH_H = 200;
  const FPS = 30;
  const MATCH_MINUTES = 90;
  const REAL_SECONDS = 60;
  const HT_PAUSE_SEC = 0.8;
  const GOAL_PAUSE_SEC = 0.8;
  const TOTAL_FRAMES = FPS * REAL_SECONDS;

  // ── 陣型解析 ────────────────────────────────────────────
  function parseFormation(f) {
    const parts = String(f || '').split('-').map(n => parseInt(n)).filter(n => Number.isFinite(n));
    if (parts.length === 3) return { def: parts[0], mid: parts[1], amc: 0, fwd: parts[2] };
    if (parts.length === 4) return { def: parts[0], mid: parts[1], amc: parts[2], fwd: parts[3] };
    return { def: 4, mid: 3, amc: 0, fwd: 3 };
  }

  function buildFormation(f, isHome) {
    const positions = [];
    positions.push({ x: 0.05, y: 0.5, role: 'GK' });
    const { def, mid, amc, fwd } = f;
    const place = (count, xBase, role) => {
      for (let i = 0; i < count; i++) {
        positions.push({ x: xBase, y: (i + 1) / (count + 1), role });
      }
    };
    place(def, 0.22, 'DEF');
    place(mid, 0.45, 'MID');
    if (amc > 0) place(amc, 0.6, 'AMC');
    place(fwd, 0.78, 'FWD');
    if (!isHome) positions.forEach(p => { p.x = 1 - p.x; });
    return positions;
  }

  // 每個角色的戰術參數：前插能力、回防程度、搶斷意願、持球速度
  const ROLE = {
    GK:  { pushOn: 0.02, pullBack: 0.02, tackleRange: 0.03, sprint: 0.5 },
    DEF: { pushOn: 0.12, pullBack: 0.18, tackleRange: 0.055, sprint: 0.7 },
    MID: { pushOn: 0.20, pullBack: 0.15, tackleRange: 0.05, sprint: 0.85 },
    AMC: { pushOn: 0.28, pullBack: 0.10, tackleRange: 0.045, sprint: 0.9 },
    FWD: { pushOn: 0.32, pullBack: 0.06, tackleRange: 0.04, sprint: 1.0 },
  };

  // ── 繪製 ────────────────────────────────────────────────
  function render(ctx, state) {
    const { players, ball, flashTeam, flashAlpha, possessorIdx } = state;
    const grad = ctx.createLinearGradient(0, 0, 0, PITCH_H);
    grad.addColorStop(0, '#2e7d32');
    grad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);

    // 草紋
    for (let i = 0; i < PITCH_W; i += 40) {
      ctx.fillStyle = (i / 40) % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(i, 0, 40, PITCH_H);
    }

    // 球場線
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, PITCH_W - 8, PITCH_H - 8);
    ctx.beginPath();
    ctx.moveTo(PITCH_W / 2, 4);
    ctx.lineTo(PITCH_W / 2, PITCH_H - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(PITCH_W / 2, PITCH_H / 2, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(4, PITCH_H * 0.22, 32, PITCH_H * 0.56);
    ctx.strokeRect(PITCH_W - 36, PITCH_H * 0.22, 32, PITCH_H * 0.56);
    // 球門
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(0, PITCH_H * 0.38, 4, PITCH_H * 0.24);
    ctx.fillRect(PITCH_W - 4, PITCH_H * 0.38, 4, PITCH_H * 0.24);

    // 進球閃光
    if (flashAlpha > 0) {
      ctx.fillStyle = flashTeam === 'h'
        ? `rgba(33,150,243,${flashAlpha * 0.35})`
        : `rgba(239,83,80,${flashAlpha * 0.35})`;
      ctx.fillRect(0, 0, PITCH_W, PITCH_H);
    }

    // 球員
    players.forEach((p, i) => {
      const isPos = i === possessorIdx;
      ctx.fillStyle = p.team === 'h' ? '#2196f3' : '#e53935';
      ctx.beginPath();
      const r = p.role === 'GK' ? 4.5 : 4;
      ctx.arc(p.x * PITCH_W, p.y * PITCH_H, isPos ? r + 1 : r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isPos ? '#fff' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = isPos ? 1.3 : 0.8;
      ctx.stroke();
    });

    // 球（帶陰影）
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(ball.x * PITCH_W, ball.y * PITCH_H, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── HUD ─────────────────────────────────────────────────
  function buildHUD(container, teams) {
    container.innerHTML = `
      <div class="msim-hud">
        <div class="msim-hud-side">
          <div class="msim-hud-label">${teams.home.nameCN} 勝率</div>
          <div class="msim-hud-val msim-h-chance" style="color:#90caf9">—</div>
        </div>
        <div class="msim-hud-center">
          <div class="msim-hud-time msim-time">00:00</div>
          <div class="msim-hud-score">
            <span class="msim-h-score" style="color:#90caf9">0</span>
            <span style="opacity:0.5">-</span>
            <span class="msim-a-score" style="color:#ef9a9a">0</span>
          </div>
        </div>
        <div class="msim-hud-side msim-hud-side-r">
          <div class="msim-hud-label">${teams.away.nameCN} 勝率</div>
          <div class="msim-hud-val msim-a-chance" style="color:#ef9a9a">—</div>
        </div>
      </div>
      <canvas class="msim-canvas"></canvas>
      <div class="msim-speed-bar">
        <button class="msim-speed-btn" data-speed="0.5" title="慢放">🐢 0.5×</button>
        <button class="msim-speed-btn active" data-speed="1" title="正常">▶️ 1×</button>
        <button class="msim-speed-btn" data-speed="2" title="快轉">⏩ 2×</button>
      </div>
      <div class="msim-teamline">
        <span style="color:#2196f3;font-weight:800">${teams.home.nameCN}</span>
        <span style="opacity:0.5;font-size:11px;margin:0 6px">${teams.home.formation || ''} · vs · ${teams.away.formation || ''}</span>
        <span style="color:#e53935;font-weight:800">${teams.away.nameCN}</span>
      </div>
      <div class="msim-summary" style="display:none"></div>
    `;
    return {
      hChance: container.querySelector('.msim-h-chance'),
      aChance: container.querySelector('.msim-a-chance'),
      hScore: container.querySelector('.msim-h-score'),
      aScore: container.querySelector('.msim-a-score'),
      time: container.querySelector('.msim-time'),
      canvas: container.querySelector('.msim-canvas'),
      summary: container.querySelector('.msim-summary'),
      speedBtns: container.querySelectorAll('.msim-speed-btn'),
    };
  }

  // ── 主模擬 ──────────────────────────────────────────────
  // opts: { seed?: string, onEnd?: (score) => void, hideReplay?: boolean }
  function runSim(container, home, away, matchId, opts) {
    opts = opts || {};
    // 帶 seed → 用 seedable RNG（朋友直播房需要每人結果一致）
    // 不帶 seed → 沿用 Math.random（單機隨便看的維持「每次不同」）
    const rng = opts.seed ? makeSeededRng(opts.seed) : Math.random;

    const ui = buildHUD(container, { home, away });
    const canvas = ui.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PITCH_W * dpr;
    canvas.height = PITCH_H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = '360px';
    canvas.style.aspectRatio = `${PITCH_W} / ${PITCH_H}`;
    canvas.style.borderRadius = '8px';
    canvas.style.display = 'block';
    canvas.style.margin = '8px auto';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const hF = buildFormation(parseFormation(home.formation), true);
    const aF = buildFormation(parseFormation(away.formation), false);
    // 給每個球員獨特的 flair（站位微差 + 反應速度）讓整條線不再像旗
    const makeFlair = () => ({
      xJitter: (rng() - 0.5) * 0.035,
      yJitter: (rng() - 0.5) * 0.025,
      laziness: 0.78 + rng() * 0.44, // 0.78 ~ 1.22
    });
    const players = [
      ...hF.map(p => ({ ...p, team: 'h', baseX: p.x, baseY: p.y, x: p.x, y: p.y, tx: p.x, ty: p.y, flair: makeFlair() })),
      ...aF.map(p => ({ ...p, team: 'a', baseX: p.x, baseY: p.y, x: p.x, y: p.y, tx: p.x, ty: p.y, flair: makeFlair() })),
    ];
    const ball = { x: 0.5, y: 0.5 };

    // 速度倍率（0.5x / 1x / 2x）
    let speedMult = 1;
    let speedSubFrame = 0; // 0.5x 用的累加器
    ui.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        speedMult = parseFloat(btn.dataset.speed);
        ui.speedBtns.forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // 比賽狀態
    const state = {
      possession: 'h',       // 'h' | 'a'
      possessorIdx: -1,      // index into players[]
      phase: 'kickoff',      // 'kickoff' | 'dribble' | 'pass' | 'shoot' | 'celebrate' | 'halftime'
      ballFromX: 0.5, ballFromY: 0.5,
      ballTargetX: 0.5, ballTargetY: 0.5,
      ballTravelTotal: 0, ballTravelLeft: 0,
      score: { h: 0, a: 0 },
      stats: { h: { shots: 0, goals: 0, passes: 0 }, a: { shots: 0, goals: 0, passes: 0 } },
      frame: 0,
      pauseFrames: 0,
      flashAlpha: 0, flashTeam: null,
      halftimeDone: false,
      lastActionFrame: 0,
      players, ball,
      get possessorIdx() { return this._possessorIdx; },
      set possessorIdx(v) { this._possessorIdx = v; },
    };
    state.possessorIdx = -1;

    // 控球率計算：強弱差放大 2.5× 讓實力落差反映在控球時間
    // 原本近乎 50/50、強隊只有 ~55%；放大後 BIG 6 vs 保級可達 ~65%
    const _hMidRaw = home.radar.midfield + home.radar.speed * 0.5;
    const _aMidRaw = away.radar.midfield + away.radar.speed * 0.5;
    const _hPossRaw = _hMidRaw / (_hMidRaw + _aMidRaw);
    const _hPossAmplified = 0.5 + (_hPossRaw - 0.5) * 2.5;
    const hMidPoss = Math.min(0.75, Math.max(0.25, _hPossAmplified + 0.04));

    function getTeam(code) { return code === 'h' ? home : away; }

    function kickoff(whoHasBall) {
      state.possession = whoHasBall;
      state.phase = 'dribble';
      // 找中場球員持球
      const mids = players
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.team === whoHasBall && x.p.role === 'MID');
      const chosen = mids[Math.floor(mids.length / 2)] || mids[0]
        || players.map((p, i) => ({ p, i })).find(x => x.p.team === whoHasBall && x.p.role !== 'GK');
      state.possessorIdx = chosen ? chosen.i : 0;
      ball.x = 0.5; ball.y = 0.5;
      // 開球時：所有球員退回己方半場（前鋒不會站在對方門前等開球）
      // home 己方半場 x<0.5、away 己方半場 x>0.5
      players.forEach(p => {
        p.x = p.baseX;
        p.y = p.baseY;
        if (p.team === 'h') p.x = Math.min(0.48, p.x);
        else p.x = Math.max(0.52, p.x);
        // tx/ty 也同步，避免下一幀 updatePlayerTargets 還沒跑就 render 到舊位置
        p.tx = p.x; p.ty = p.y;
      });
      // 持球者站到中圈
      const pos = players[state.possessorIdx];
      if (pos) { pos.x = 0.5; pos.y = 0.5; pos.tx = 0.5; pos.ty = 0.5; }
      // 己方一位前鋒上來接應（真實開球兩人站中圈）
      const myFwd = players
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.team === whoHasBall && x.p.role === 'FWD')[0];
      if (myFwd) {
        myFwd.p.x = whoHasBall === 'h' ? 0.52 : 0.48;
        myFwd.p.y = 0.5;
        myFwd.p.tx = myFwd.p.x; myFwd.p.ty = myFwd.p.y;
      }
    }

    function findNearestOpponent(p) {
      let best = null, bestD = Infinity;
      for (const q of players) {
        if (q.team === p.team) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) { bestD = d; best = q; }
      }
      return { player: best, dist: bestD };
    }

    function rankPassTargets(possessor) {
      const goalX = possessor.team === 'h' ? 1 : 0;
      const myDistToGoal = Math.abs(goalX - possessor.x);
      const iAmInBox = myDistToGoal < 0.22;
      const teammates = players
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.team === possessor.team && x.i !== state.possessorIdx);
      return teammates
        .map(({ p, i }) => {
          const ahead = possessor.team === 'h' ? p.x > possessor.x : p.x < possessor.x;
          const distToGoal = Math.abs(goalX - p.x);
          const targetInBox = distToGoal < 0.22;
          const nearest = findNearestOpponent(p);
          const openness = Math.min(0.15, nearest.dist);
          const roleBonus = p.role === 'FWD' ? 0.15 : p.role === 'AMC' ? 0.12 : p.role === 'MID' ? 0.05 : 0;
          let score = (ahead ? 0.3 : 0) + openness + roleBonus - distToGoal * 0.4;
          // (1) 前場反向傳球扣分
          if (myDistToGoal < 0.3 && distToGoal > myDistToGoal + 0.05) {
            score -= 0.35;
          }
          // (2) 最近 3 個經手過球的隊友、60 幀內不要傳回去（避免 2/3 人繞圈）
          if (state.recentPassersSet && state.recentPassersSet.has(i)
              && state.frame - state.lastPassFrame < 60) {
            score -= 0.55;
          }
          // (3) 禁區內互傳硬懲罰：兩邊都在禁區 → 應該要射、不要傳
          if (iAmInBox && targetInBox) {
            score -= 0.55;
          }
          // (4) 長傳懲罰：避免 GK→FWD 一腳直塞跳過中場。真實足球絕大多數是短/中傳
          //     0-0.15 距離：無懲罰（短傳）
          //     0.15-0.30：輕懲罰（中傳）
          //     0.30+：重懲罰（長球，少見）
          const passDist = Math.hypot(p.x - possessor.x, p.y - possessor.y);
          let distPenalty = 0;
          if (passDist > 0.30) distPenalty = 0.40 + (passDist - 0.30) * 1.2;
          else if (passDist > 0.15) distPenalty = (passDist - 0.15) * 0.8;
          score -= distPenalty;
          // (5) 拉邊加成：中路持球 → 傳給邊路隊友拉開空間（真實足球「找邊鋒」戰術）
          const iAmCentral = Math.abs(possessor.y - 0.5) < 0.18;
          const targetIsWide = Math.abs(p.y - 0.5) > 0.22;
          if (iAmCentral && targetIsWide) score += 0.12;
          // 反之：邊路持球 → 如果目標在中路且在前場，加成（內切傳中給中路前鋒）
          const iAmWide = Math.abs(possessor.y - 0.5) > 0.22;
          const targetIsCentral = Math.abs(p.y - 0.5) < 0.18;
          if (iAmWide && targetIsCentral && ahead) score += 0.10;
          return { p, i, score };
        })
        .sort((a, b) => b.score - a.score);
    }

    function startPass(target) {
      state.ballFromX = ball.x;
      state.ballFromY = ball.y;
      state.ballTargetX = target.p.x;
      state.ballTargetY = target.p.y;
      const dist = Math.hypot(target.p.x - ball.x, target.p.y - ball.y);
      state.ballTravelTotal = Math.max(5, Math.round(dist * 60));
      state.ballTravelLeft = state.ballTravelTotal;
      state.phase = 'pass';
      state.passTargetIdx = target.i;
      // 記錄最近 3 個經手過球的隊友（不只上一個）
      // 避免「A→B→C→A」繞圈傳 — 60 幀內 A/B/C 互傳都會被扣分
      state.lastPassFromIdx = state.possessorIdx;
      state.lastPassFrame = state.frame;
      if (!state.recentPassers) state.recentPassers = [];
      state.recentPassers.push(state.possessorIdx);
      if (state.recentPassers.length > 3) state.recentPassers.shift();
      state.recentPassersSet = new Set(state.recentPassers);
      state.stats[state.possession].passes++;
    }

    function startShoot() {
      state.ballFromX = ball.x;
      state.ballFromY = ball.y;
      const goalX = state.possession === 'h' ? 1 : 0;
      // 射向球門範圍內一個點（稍微偏左右，不永遠中路）
      state.ballTargetX = goalX;
      state.ballTargetY = 0.38 + rng() * 0.24;
      const dist = Math.hypot(state.ballTargetX - ball.x, state.ballTargetY - ball.y);
      state.ballTravelTotal = Math.max(5, Math.round(dist * 50));
      state.ballTravelLeft = state.ballTravelTotal;
      state.phase = 'shoot';
      state.stats[state.possession].shots++;
    }

    function resolveShot() {
      const atk = getTeam(state.possession).radar;
      const def = getTeam(state.possession === 'h' ? 'a' : 'h').radar;
      // 攻防差放大：def 權重 0.65 → 0.55（攻方 attack 影響更大）、
      // 轉換係數 0.6 → 0.75、min 0.18 → 0.12（弱隊機會少）、max 0.58 → 0.68
      const goalProb = Math.max(0.12, Math.min(0.68,
        ((atk.attack - def.defense * 0.55) / 100) * 0.75
      ));
      const isGoal = rng() < goalProb;
      if (isGoal) {
        state.score[state.possession]++;
        state.stats[state.possession].goals++;
        state.flashTeam = state.possession;
        state.flashAlpha = 1;
        state.pauseFrames = Math.round(FPS * GOAL_PAUSE_SEC);
        state.phase = 'celebrate';
        ui.hScore.textContent = state.score.h;
        ui.aScore.textContent = state.score.a;
      } else {
        // 被撲 / 沒中 → 對方球門員帶球
        const newTeam = state.possession === 'h' ? 'a' : 'h';
        state.possession = newTeam;
        const gk = players.findIndex(p => p.team === newTeam && p.role === 'GK');
        state.possessorIdx = gk;
        state.phase = 'dribble';
        state.lastActionFrame = state.frame;
        ball.x = players[gk].x;
        ball.y = players[gk].y;
        // 換邊 → 清最近經手傳球者記錄、並記錄換邊時機（movePlayers 會降速避免瞬移）
        state.recentPassers = [];
        state.recentPassersSet = new Set();
        state.possessionChangeFrame = state.frame;
      }
    }

    // 每幀決策邏輯（dribble 階段）
    function tickDribble() {
      const pos = players[state.possessorIdx];
      if (!pos) return;
      const atkStats = getTeam(pos.team).radar;
      const defStats = getTeam(pos.team === 'h' ? 'a' : 'h').radar;
      const goalX = pos.team === 'h' ? 1 : 0;
      const distToGoal = Math.abs(pos.x - goalX);

      const framesInPossession = state.frame - state.lastActionFrame;
      // 持球時間越久，「出手壓力」越高 — 避免原地盤球過久
      // 0 幀時 0、25 幀時 0.5、50+ 幀時 1
      const urgency = Math.max(0, Math.min(1, (framesInPossession - 10) / 40));

      // 1) 射門決策（放寬到前場三分之一、距離越近機率越高）
      if (distToGoal < 0.32) {
        const near = findNearestOpponent(pos);
        const hasSpace = near.dist > 0.05;
        const dangerMul = distToGoal < 0.15 ? 1.5 : distToGoal < 0.22 ? 0.7 : 0.25;
        let shootChance;
        if (hasSpace) {
          shootChance = (atkStats.attack / 100) * 0.08 * dangerMul + urgency * 0.06;
        } else if (distToGoal < 0.18) {
          // 禁區內即使被防守者貼身也要「勉強射門」— 真實前鋒不會等完美空間
          shootChance = (atkStats.attack / 100) * 0.05 * dangerMul + urgency * 0.05;
        } else {
          shootChance = urgency * 0.02;
        }
        if (rng() < shootChance) {
          startShoot();
          return;
        }
      }

      // 2) 傳球決策（持球 8+ 幀後考慮，持球越久越積極傳）
      if (framesInPossession > 8) {
        const inMidfield = pos.x > 0.3 && pos.x < 0.7;
        const inAttackThird = (pos.team === 'h' && pos.x > 0.65) || (pos.team === 'a' && pos.x < 0.35);
        let passChance;
        if (inMidfield) passChance = 0.12 + (atkStats.midfield / 100) * 0.04;
        else if (inAttackThird) passChance = 0.03 + (atkStats.midfield / 100) * 0.02;
        else passChance = 0.08 + (atkStats.midfield / 100) * 0.03;
        passChance += urgency * 0.10; // 持球太久 → 積極找人傳
        if (rng() < passChance) {
          const candidates = rankPassTargets(pos);
          if (candidates.length && candidates[0].score > -0.15) {
            startPass(candidates[0]);
            state.lastActionFrame = state.frame;
            return;
          }
        }
      }

      // 3) 搶斷（加入「剛接到球 15 幀保護期」避免還沒穩球就被搶）
      if (framesInPossession > 15) {
        const near = findNearestOpponent(pos);
        if (near.player && near.dist < ROLE[near.player.role].tackleRange + 0.005) {
          let tackleChance = (defStats.defense / 100) * 0.04 - (atkStats.midfield / 100) * 0.02;
          // 防守方在自家禁區內壓迫更兇、但不要太誇張（避免弱隊在禁區內一直搶到球）
          if (distToGoal < 0.22) tackleChance *= 1.3;
          tackleChance = Math.max(0.005, Math.min(0.08, tackleChance));
          if (rng() < tackleChance) {
            state.possession = near.player.team;
            state.possessorIdx = players.indexOf(near.player);
            state.phase = 'dribble';
            state.lastActionFrame = state.frame;
            // 換邊 → 清最近經手傳球者記錄、記錄換邊時機讓 movePlayers 降速
            state.recentPassers = [];
            state.recentPassersSet = new Set();
            state.possessionChangeFrame = state.frame;
            return;
          }
        }
      }

      // 4) 一直沒動作 → 強制出手（門前縮到 25 幀即射、中後場 45 幀才強制傳）
      const forceThreshold = distToGoal < 0.22 ? 25 : 45;
      if (framesInPossession > forceThreshold) {
        if (distToGoal < 0.35) {
          startShoot();
        } else {
          const candidates = rankPassTargets(pos);
          if (candidates.length) {
            startPass(candidates[0]);
            state.lastActionFrame = state.frame;
          }
        }
      }
    }

    // 更新球員 target 位置（最近的人壓球、次近的覆蓋、其他補位）
    function updatePlayerTargets() {
      const atkTeam = state.possession;
      const possessor = players[state.possessorIdx];

      // 先把非持球球員依「離球距離」排序（分隊）
      const rank = { h: [], a: [] };
      players.forEach((p, i) => {
        if (i === state.possessorIdx) return;
        if (p.role === 'GK') return; // GK 另行處理
        const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
        rank[p.team].push({ i, dist });
      });
      rank.h.sort((a, b) => a.dist - b.dist);
      rank.a.sort((a, b) => a.dist - b.dist);

      const rankIdx = {};
      rank.h.forEach((r, n) => rankIdx[r.i] = n);
      rank.a.forEach((r, n) => rankIdx[r.i] = n);

      // 攻方「站位上限」— 不能超過對方 GK（GK 在 0.05 / 0.95）
      const ATK_LIMIT_H = 0.88; // home 攻 right goal，攻方上限 0.88
      const ATK_LIMIT_A = 0.12; // away 攻 left goal，攻方上限 0.12

      players.forEach((p, i) => {
        p._urgent = false;
        // 持球者：朝對方球門盤帶（但不能踩到 GK）
        if (i === state.possessorIdx) {
          const goalX = p.team === 'h' ? 1 : 0;
          const dx = goalX - p.x;
          const role = ROLE[p.role] || ROLE.MID;
          // y 目標：60% 自己天然 lane + 40% 中線
          // 邊鋒 baseY=0.25 的人拿到球會保持在左側（~0.35），不會一直朝中間收
          const laneY = p.baseY * 0.6 + 0.5 * 0.4;
          const dy = laneY - p.y;
          const speed = 0.008 * role.sprint * (getTeam(p.team).radar.speed / 80);
          p.tx = p.x + Math.sign(dx) * Math.min(Math.abs(dx), speed);
          p.ty = p.y + dy * 0.06;
          if (p.team === 'h') p.tx = Math.min(0.92, p.tx);
          else p.tx = Math.max(0.08, p.tx);
          p.tx += (rng() - 0.5) * 0.004;
          p.ty += (rng() - 0.5) * 0.006;
          return;
        }

        // GK：永遠站門線、跟球左右
        if (p.role === 'GK') {
          p.tx = p.baseX;
          p.ty = 0.5 + (ball.y - 0.5) * 0.25;
          return;
        }

        const role = ROLE[p.role] || ROLE.MID;
        const sideSign = p.team === 'h' ? 1 : -1;
        const myTeamAttacking = p.team === atkTeam;
        const myRank = rankIdx[i] != null ? rankIdx[i] : 99;
        const fl = p.flair || { xJitter: 0, yJitter: 0, laziness: 1 };

        if (!myTeamAttacking) {
          // ── 防守方 ──────────────────────────
          if (myRank === 0) {
            // 最近的去壓持球者
            p._urgent = true;
            p.tx = ball.x - sideSign * 0.015;
            p.ty = ball.y;
            p.tx += (rng() - 0.5) * 0.006;
            p.ty += (rng() - 0.5) * 0.008;
          } else if (myRank === 1) {
            // 第二近的覆蓋
            p._urgent = true;
            p.tx = ball.x - sideSign * 0.08;
            p.ty = p.baseY + (ball.y - p.baseY) * 0.7;
          } else {
            // 其他：維持陣型但個人差異 + 近球側踩高/遠球側收腳
            const sameSide = Math.abs(ball.y - p.baseY) < 0.22;
            const stepAdj = sameSide ? 0.06 : -0.03;
            p.tx = p.baseX - role.pullBack * sideSign + (ball.x - 0.5) * 0.20
                   + stepAdj * sideSign + fl.xJitter;
            p.ty = p.baseY + (ball.y - p.baseY) * 0.42 + fl.yJitter;
          }
          // 所有防守者都不能跑到自家 GK 後面（GK 在 0.05 / 0.95）
          if (p.team === 'h') p.tx = Math.max(0.10, p.tx);
          else p.tx = Math.min(0.90, p.tx);
          return;
        }

        // ── 進攻方（非持球者）───────────────
        // 只有 rank 0（最近的隊友）跑短接應路線，其他人維持陣型拉開空間
        // 原本 rank 0+1 都跑向持球者 → 視覺上「兩個進攻球員圍住持球者」不合理
        if (myRank === 0 && possessor) {
          p._urgent = true;
          const fwdOffset = 0.10 * sideSign;
          // 接應角度拉寬一點（0.12 而不是 0.08），讓接應者離持球者有橫向空間，不是貼身
          const sideOffset = (p.baseY < 0.5 ? -0.12 : 0.12);
          let newTx = possessor.x + fwdOffset;
          // FWD/AMC 不要被拉回來，保持前壓
          if (p.role === 'FWD' || p.role === 'AMC') {
            if (p.team === 'h') newTx = Math.max(newTx, p.x);
            else newTx = Math.min(newTx, p.x);
          }
          p.tx = newTx;
          p.ty = possessor.y + sideOffset;
          const atkLimit = p.team === 'h' ? ATK_LIMIT_H : ATK_LIMIT_A;
          p.tx = p.team === 'h' ? Math.min(atkLimit, p.tx) : Math.max(atkLimit, p.tx);
          p.tx += (rng() - 0.5) * 0.008;
          p.ty += (rng() - 0.5) * 0.008;
          return;
        }
        // 其他：依角色前插 + 個人差異（y 維持自身 lane 為主，只微幅跟球）
        p.tx = p.baseX + role.pushOn * sideSign + (ball.x - 0.5) * 0.22 + fl.xJitter;
        p.ty = p.baseY + (ball.y - p.baseY) * 0.22 * role.sprint + fl.yJitter;
        // 攻方通用站位上限
        const atkLimit = p.team === 'h' ? ATK_LIMIT_H : ATK_LIMIT_A;
        if (p.team === 'h') p.tx = Math.min(atkLimit, p.tx);
        else p.tx = Math.max(atkLimit, p.tx);
      });
    }

    function movePlayers() {
      // 剛換邊 20 幀內降低 smoothness，讓角色翻轉時球員用「小碎步」過渡
      const flipFrames = state.frame - (state.possessionChangeFrame || -999);
      const justFlipped = flipFrames >= 0 && flipFrames < 20;
      const flipEase = justFlipped ? 0.5 : 1;

      players.forEach((p, i) => {
        // smoothness 決定「以多少比例逼近目標」
        // maxStep 決定「單幀最大位移」— 避免 target 大幅跳動時第一幀飛越過去
        let smoothness = 0.045;
        let maxStep = 0.010;      // 非緊急：慢跑
        if (i === state.possessorIdx) { smoothness = 0.15; maxStep = 0.013; } // 持球者靈活
        else if (p._urgent) { smoothness = 0.11; maxStep = 0.016; }           // 壓迫/衝刺
        smoothness *= flipEase;

        let stepX = (p.tx - p.x) * smoothness;
        let stepY = (p.ty - p.y) * smoothness;
        // 每幀最大位移 clamp — 即使 target 瞬間跳 0.5，每幀最多走 maxStep
        const stepMag = Math.hypot(stepX, stepY);
        if (stepMag > maxStep) {
          const r = maxStep / stepMag;
          stepX *= r; stepY *= r;
        }
        p.x += stepX; p.y += stepY;
        p.x = Math.max(0.01, Math.min(0.99, p.x));
        p.y = Math.max(0.04, Math.min(0.96, p.y));
      });
    }

    function moveBall() {
      if (state.phase === 'pass' || state.phase === 'shoot') {
        // 傳球時持續追蹤目標球員當下位置（接球者在飛行中可能位移，
        // 不鎖死起飛時的舊座標，否則球抵達時會 snap 到新位置變成突然彈跳）
        if (state.phase === 'pass' && state.passTargetIdx != null) {
          const t = players[state.passTargetIdx];
          if (t) { state.ballTargetX = t.x; state.ballTargetY = t.y; }
        }
        state.ballTravelLeft--;
        const t = 1 - (state.ballTravelLeft / Math.max(1, state.ballTravelTotal));
        ball.x = state.ballFromX + (state.ballTargetX - state.ballFromX) * t;
        ball.y = state.ballFromY + (state.ballTargetY - state.ballFromY) * t;
        // 拋物線弧度（4×t×(1-t) = 中段 peak）
        ball.y -= 0.03 * (4 * t * (1 - t));
        if (state.ballTravelLeft <= 0) {
          if (state.phase === 'shoot') {
            resolveShot();
          } else {
            // pass 抵達：那個人變成持球者（ball 位置已經貼近目標當下位置，不 snap）
            const newIdx = state.passTargetIdx;
            if (newIdx != null && players[newIdx]) {
              state.possessorIdx = newIdx;
              state.possession = players[newIdx].team;
              // 只輕微校正到球員腳下，避免殘留幾 px 誤差
              ball.x += (players[newIdx].x - ball.x) * 0.5;
              ball.y += (players[newIdx].y - ball.y) * 0.5;
            }
            state.phase = 'dribble';
            state.lastActionFrame = state.frame;
          }
        }
      } else if (state.phase === 'dribble') {
        // 球跟著持球者
        const pos = players[state.possessorIdx];
        if (pos) {
          const goalX = pos.team === 'h' ? 1 : 0;
          const dirSign = goalX > pos.x ? 1 : -1;
          ball.x += (pos.x + dirSign * 0.012 - ball.x) * 0.35;
          ball.y += (pos.y - ball.y) * 0.35;
        }
      }
    }

    // 單幀邏輯（不含渲染，速度倍率會多次呼叫）
    function stepOneFrame() {
      if (state.pauseFrames > 0) {
        state.pauseFrames--;
        if (state.pauseFrames === 0 && state.phase === 'celebrate') {
          kickoff(state.possession === 'h' ? 'a' : 'h');
        }
        state.frame++;
        return;
      }

      const gameMin = (state.frame / TOTAL_FRAMES) * MATCH_MINUTES;
      const gameMinInt = Math.floor(gameMin);

      if (!state.halftimeDone && gameMinInt >= 45) {
        state.halftimeDone = true;
        state.pauseFrames = Math.round(FPS * HT_PAUSE_SEC);
        kickoff(rng() < hMidPoss ? 'a' : 'h');
      }

      if (state.phase === 'dribble') tickDribble();
      updatePlayerTargets();
      movePlayers();
      moveBall();
      state.frame++;
    }

    function updateHUD() {
      const remaining = Math.max(0, 1 - state.frame / TOTAL_FRAMES);
      const scoreDiff = state.score.h - state.score.a;
      const attackRatio = home.radar.attack / (home.radar.attack + away.radar.attack);
      const baseChance = attackRatio * 0.6 + 0.2;
      const scoreBoost = scoreDiff * 0.08 * (1 - remaining * 0.5);
      const hChance = Math.max(0.05, Math.min(0.95, baseChance + scoreBoost));
      ui.hChance.textContent = Math.round(hChance * 100) + '%';
      ui.aChance.textContent = Math.round((1 - hChance) * 100) + '%';

      const gameMin = (state.frame / TOTAL_FRAMES) * MATCH_MINUTES;
      const totalGameSec = Math.floor(gameMin * 60);
      const mm = String(Math.floor(totalGameSec / 60)).padStart(2, '0');
      const ss = String(totalGameSec % 60).padStart(2, '0');
      ui.time.textContent = `${mm}:${ss}`;
    }

    // ── 主 tick（考慮速度倍率：1x 每 rAF 跑 1 幀、2x 跑 2 幀、0.5x 兩 rAF 跑 1 幀）─
    function tick() {
      if (state.frame >= TOTAL_FRAMES) { showSummary(); return; }

      let framesThisRAF;
      if (speedMult >= 1) {
        framesThisRAF = Math.round(speedMult);
      } else {
        // 0.5x：每 1/speedMult 次 rAF 才走一幀
        speedSubFrame++;
        if (speedSubFrame < Math.round(1 / speedMult)) {
          render(ctx, state);
          state.flashAlpha = Math.max(0, state.flashAlpha - 0.03);
          requestAnimationFrame(tick);
          return;
        }
        speedSubFrame = 0;
        framesThisRAF = 1;
      }

      for (let k = 0; k < framesThisRAF && state.frame < TOTAL_FRAMES; k++) {
        stepOneFrame();
      }
      updateHUD();
      render(ctx, state);
      state.flashAlpha = Math.max(0, state.flashAlpha - 0.04 * framesThisRAF);
      requestAnimationFrame(tick);
    }

    function showSummary() {
      ui.time.textContent = '全場';
      const { h, a } = state.stats;
      const winner = state.score.h > state.score.a ? home.nameCN
        : state.score.a > state.score.h ? away.nameCN
        : '平手';
      const winnerColor = state.score.h > state.score.a ? '#2196f3'
        : state.score.a > state.score.h ? '#e53935'
        : 'rgba(255,255,255,0.7)';
      ui.summary.style.display = 'block';
      const replayBtn = opts.hideReplay ? '' :
        `<button onclick="MatchSim.run('${matchId}')" style="margin-top:10px;padding:8px 18px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:12px;cursor:pointer">
          🔁 再跑一次
        </button>`;
      ui.summary.innerHTML = `
        <div style="font-size:14px;font-weight:800;color:${winnerColor};margin-bottom:6px">
          ${winner === '平手' ? '🤝 平手' : `🏆 ${winner} 勝`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--text-muted)">
          <div>射正 ${h.shots}・關鍵傳球 ${h.passes}</div>
          <div style="text-align:right">射正 ${a.shots}・關鍵傳球 ${a.passes}</div>
          <div>進球 ${h.goals}</div>
          <div style="text-align:right">進球 ${a.goals}</div>
        </div>
        ${replayBtn}
        <div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.35)">
          模擬只計「威脅事件」(shots on target + key passes)，不是真實總傳球
        </div>
      `;
      // 朋友直播房用：sim 跑完通知外層算結果
      if (typeof opts.onEnd === 'function') {
        try { opts.onEnd({ h: state.score.h, a: state.score.a }); } catch (e) { console.warn('[MatchSim] onEnd threw', e); }
      }
    }

    // 開球
    kickoff(rng() < hMidPoss ? 'h' : 'a');
    tick();
  }

  // ── 公開 API ────────────────────────────────────────────
  window.MatchSim = {
    // opts.seed: 給朋友直播房用的 seed，相同 seed 產出完全相同的比賽
    run(matchId, opts = {}) {
      const containerId = `sim-wrap-${matchId}`;
      const container = document.getElementById(containerId);
      if (!container) { console.warn('[MatchSim] container not found:', containerId); return; }

      // WC 的 SCHEDULE / TEAMS 是 var / const 宣告，不一定會附到 window 上，
      // 需要用 typeof 檢查 fallback，不能只靠 window.SCHEDULE / window.TEAMS
      const isEPL = window.Tournament?.isEPL?.();
      const isUCL = window.Tournament?.isUCL?.();
      const schedule = isEPL ? (window.EPL_MATCHES || [])
        : isUCL ? (window.UCL_MATCHES || [])
        : (typeof SCHEDULE !== 'undefined' ? SCHEDULE : []);
      const m = schedule.find(x => x.id === matchId);
      if (!m) { console.warn('[MatchSim] match not found:', matchId); return; }
      const T = isEPL ? (window.EPL_TEAMS || {})
        : isUCL ? (window.UCL_TEAMS || {})
        : (typeof TEAMS !== 'undefined' ? TEAMS : {});
      const home = T[m.home];
      const away = T[m.away];
      if (!home || !away || !home.radar || !away.radar) {
        container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 此比賽缺少數據，無法模擬</div>';
        return;
      }

      runSim(container, home, away, matchId, opts);
    },

    // 朋友直播房用：直接給 container + 隊伍資料 + opts，不走 schedule lookup
    // opts: { seed, onEnd(score), hideReplay, matchId? }
    runDirect(container, home, away, opts = {}) {
      if (!container) { console.warn('[MatchSim] runDirect: no container'); return; }
      if (!home || !away || !home.radar || !away.radar) {
        if (container) container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 此比賽缺少數據，無法模擬</div>';
        return;
      }
      runSim(container, home, away, opts.matchId || 'fr-direct', opts);
    }
  };
})();
