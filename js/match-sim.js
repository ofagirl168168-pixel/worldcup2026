/* =============================================
   MATCH-SIM.JS — 90 分鐘模擬賽
   以雙方 radar.{attack,defense,midfield,speed,experience} + formation
   產生一場壓縮到 60 秒的縮時比賽，伴隨 canvas 動畫
   ============================================= */

(function () {
  'use strict';

  // ── 視覺參數 ────────────────────────────────────────────
  const PITCH_W = 320;        // 球場 CSS 寬（內部會 × DPR 渲染）
  const PITCH_H = 200;        // 球場 CSS 高（橫向，比例 8:5）
  const FPS = 30;
  const MATCH_MINUTES = 90;
  const REAL_SECONDS = 60;    // 壓縮到 60 秒
  const HT_PAUSE_SEC = 0.8;   // 半場中斷時間（real）
  const GOAL_PAUSE_SEC = 0.6; // 進球慶祝時間（real）

  // ── 陣型解析 ────────────────────────────────────────────
  function parseFormation(f) {
    const parts = String(f || '').split('-').map(n => parseInt(n)).filter(n => Number.isFinite(n));
    if (parts.length === 3) return { def: parts[0], mid: parts[1], amc: 0, fwd: parts[2] };
    if (parts.length === 4) return { def: parts[0], mid: parts[1], amc: parts[2], fwd: parts[3] };
    return { def: 4, mid: 3, amc: 0, fwd: 3 };
  }

  // 生成球員位置（相對 0-1，x=0 己方球門、x=1 對方球門；isHome 為 true 保留原座標、false 鏡像）
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

  // ── 模擬器：產生 90 分鐘事件表 ─────────────────────────
  function simulateTimeline(home, away) {
    const h = home.radar, a = away.radar;
    const events = [];
    // 中場強度（含速度加成）
    const hMid = h.midfield + h.speed * 0.5;
    const aMid = a.midfield + a.speed * 0.5;
    const hPossBase = hMid / (hMid + aMid);
    // 主場優勢 + 夾 0.28-0.72 避免極端
    const hPoss = Math.min(0.72, Math.max(0.28, hPossBase + 0.04));

    // 逐分鐘跑
    for (let min = 1; min <= MATCH_MINUTES; min++) {
      // 決定這分鐘誰在進攻
      const attackIsHome = Math.random() < hPoss;
      const atk = attackIsHome ? h : a;
      const def = attackIsHome ? a : h;
      const team = attackIsHome ? 'h' : 'a';

      // 射門機率（attack 越強越常射，經驗微調）— 常數經模擬校準，見 match-sim tuning notes
      const shotProb = (atk.attack / 100) * 0.22 * (0.65 + atk.experience / 300);
      if (Math.random() < shotProb) {
        // 進球機率：atk.attack 減掉 def.defense×0.7，再乘 0.5
        const goalProb = Math.max(0.05, Math.min(0.55,
          ((atk.attack - def.defense * 0.7) / 100) * 0.5
        ));
        const isGoal = Math.random() < goalProb;
        events.push({ min, type: isGoal ? 'goal' : 'shot', team });
      }
    }
    return { events, hPoss };
  }

  // 預計算統計：用於進度條 + 最終報告
  function summarize(events) {
    const s = { h: { goals: 0, shots: 0 }, a: { goals: 0, shots: 0 } };
    events.forEach(e => {
      s[e.team].shots++;
      if (e.type === 'goal') s[e.team].goals++;
    });
    return s;
  }

  // ── 渲染 ────────────────────────────────────────────────
  function render(ctx, state) {
    const { players, ball, flashTeam, flashAlpha, score, time, hWinChance, teams } = state;
    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, PITCH_H);
    grad.addColorStop(0, '#2e7d32');
    grad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);

    // 草紋
    for (let i = 0; i < PITCH_W; i += 40) {
      ctx.fillStyle = (i / 40) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
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
    // 兩邊禁區
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
    players.forEach(p => {
      ctx.fillStyle = p.team === 'h' ? '#2196f3' : '#e53935';
      ctx.beginPath();
      ctx.arc(p.x * PITCH_W, p.y * PITCH_H, p.role === 'GK' ? 4.5 : 4, 0, Math.PI * 2);
      ctx.fill();
      // 邊框
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    // 球
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 4;
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
          <div class="msim-hud-label">WIN CHANCE</div>
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
          <div class="msim-hud-label">POWER</div>
          <div class="msim-hud-val msim-a-power" style="color:#ef9a9a">—</div>
        </div>
      </div>
      <canvas class="msim-canvas"></canvas>
      <div class="msim-teamline">
        <span style="color:#2196f3;font-weight:800">${teams.home.nameCN}</span>
        <span style="opacity:0.5;font-size:11px;margin:0 6px">${teams.home.formation || ''} · vs · ${teams.away.formation || ''}</span>
        <span style="color:#e53935;font-weight:800">${teams.away.nameCN}</span>
      </div>
      <div class="msim-summary" style="display:none"></div>
    `;
    return {
      hChance: container.querySelector('.msim-h-chance'),
      aPower: container.querySelector('.msim-a-power'),
      hScore: container.querySelector('.msim-h-score'),
      aScore: container.querySelector('.msim-a-score'),
      time: container.querySelector('.msim-time'),
      canvas: container.querySelector('.msim-canvas'),
      summary: container.querySelector('.msim-summary'),
    };
  }

  // ── 執行一場 ────────────────────────────────────────────
  function runSim(container, home, away, matchId) {
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
    const players = [
      ...hF.map(p => ({ ...p, team: 'h', baseX: p.x, baseY: p.y, x: p.x, y: p.y })),
      ...aF.map(p => ({ ...p, team: 'a', baseX: p.x, baseY: p.y, x: p.x, y: p.y })),
    ];
    const ball = { x: 0.5, y: 0.5 };
    const score = { h: 0, a: 0 };
    const { events, hPoss } = simulateTimeline(home, away);

    // Power 指標（大約代表整體實力，取 radar 5 項加總）
    const hPow = Object.values(home.radar).reduce((s, v) => s + v, 0);
    const aPow = Object.values(away.radar).reduce((s, v) => s + v, 0);
    ui.aPower.textContent = (aPow / 100).toFixed(2) + 'K';

    const TOTAL_FRAMES = FPS * REAL_SECONDS;
    let frame = 0;
    let flashAlpha = 0;
    let flashTeam = null;
    let ballPhase = 'kickoff';
    let ballTargetX = 0.5, ballTargetY = 0.5;
    let lastPhaseSwitch = 0;
    let paused = 0; // 半場或進球暫停的剩餘 real frames
    let halftimeDone = false;

    function setNewBallTarget(attackTeam) {
      // 進攻方的半場隨機位置
      ballTargetX = attackTeam === 'h'
        ? 0.55 + Math.random() * 0.4
        : 0.05 + Math.random() * 0.4;
      ballTargetY = 0.2 + Math.random() * 0.6;
    }

    function tick() {
      if (paused > 0) {
        paused--;
        render(ctx, { players, ball, flashTeam, flashAlpha, score, time: frame / FPS, teams: { home, away } });
        flashAlpha = Math.max(0, flashAlpha - 0.04);
        requestAnimationFrame(tick);
        return;
      }

      if (frame >= TOTAL_FRAMES) {
        showSummary();
        return;
      }

      // 進度比例 → 當前遊戲分鐘
      const gameMin = (frame / TOTAL_FRAMES) * MATCH_MINUTES;
      const gameMinInt = Math.floor(gameMin);

      // 半場中斷
      if (!halftimeDone && gameMinInt >= 45) {
        halftimeDone = true;
        paused = Math.round(FPS * HT_PAUSE_SEC);
      }

      // 檢查本分鐘的事件
      const pending = events.filter(e => !e._done && e.min <= gameMinInt + 1);
      pending.forEach(e => {
        e._done = true;
        setNewBallTarget(e.team);
        if (e.type === 'goal') {
          score[e.team]++;
          flashTeam = e.team;
          flashAlpha = 1;
          paused = Math.round(FPS * GOAL_PAUSE_SEC);
          // 球飛向球門
          ball.x = e.team === 'h' ? 0.98 : 0.02;
          ball.y = 0.5;
          // 同步 HUD
          ui.hScore.textContent = score.h;
          ui.aScore.textContent = score.a;
        } else {
          // shot 也把球拉近球門
          ball.x = e.team === 'h' ? 0.9 : 0.1;
        }
      });

      // 每 ~1.2 秒換一次控球（隨機帶主場偏向）
      if (frame - lastPhaseSwitch > FPS * 1.2) {
        lastPhaseSwitch = frame;
        const isHomeAttack = Math.random() < hPoss;
        ballPhase = isHomeAttack ? 'h-attack' : 'a-attack';
        setNewBallTarget(isHomeAttack ? 'h' : 'a');
      }

      // 球朝目標飄移 + 抖動
      ball.x += (ballTargetX - ball.x) * 0.04;
      ball.y += (ballTargetY - ball.y) * 0.04;
      ball.x += (Math.random() - 0.5) * 0.008;
      ball.y += (Math.random() - 0.5) * 0.008;
      ball.x = Math.max(0.02, Math.min(0.98, ball.x));
      ball.y = Math.max(0.05, Math.min(0.95, ball.y));

      // 球員朝向球 + 回站位之間平衡
      players.forEach(p => {
        const pullToBall = (p.role === 'FWD' || p.role === 'AMC') ? 0.28
          : p.role === 'MID' ? 0.18
          : p.role === 'DEF' ? 0.08
          : 0.02; // GK
        const targetX = p.baseX + (ball.x - p.baseX) * pullToBall;
        const targetY = p.baseY + (ball.y - p.baseY) * pullToBall;
        p.x += (targetX - p.x) * 0.06;
        p.y += (targetY - p.y) * 0.06;
      });

      // 即時 WIN CHANCE：根據當前比分 + 剩餘時間 + 雙方攻擊差
      const remaining = Math.max(0, 1 - frame / TOTAL_FRAMES);
      const scoreDiff = score.h - score.a;
      const attackRatio = home.radar.attack / (home.radar.attack + away.radar.attack);
      const baseChance = attackRatio * 0.6 + 0.2; // 40-60% 區間為底
      const scoreBoost = scoreDiff * 0.08 * (1 - remaining * 0.5);
      const hChance = Math.max(0.05, Math.min(0.95, baseChance + scoreBoost));
      ui.hChance.textContent = Math.round(hChance * 100) + '%';

      // 時間 HUD（顯示 MM:SS 遊戲分鐘）
      const totalGameSec = Math.floor(gameMin * 60);
      const mm = String(Math.floor(totalGameSec / 60)).padStart(2, '0');
      const ss = String(totalGameSec % 60).padStart(2, '0');
      ui.time.textContent = `${mm}:${ss}`;

      // 渲染
      render(ctx, {
        players, ball, flashTeam, flashAlpha, score, time: frame / FPS,
        hWinChance: hChance, teams: { home, away },
      });
      flashAlpha = Math.max(0, flashAlpha - 0.04);

      frame++;
      requestAnimationFrame(tick);
    }

    function showSummary() {
      ui.time.textContent = '全場';
      const s = summarize(events);
      const winner = score.h > score.a ? home.nameCN
        : score.a > score.h ? away.nameCN
        : '平手';
      const winnerColor = score.h > score.a ? '#2196f3'
        : score.a > score.h ? '#e53935'
        : 'rgba(255,255,255,0.7)';
      ui.summary.style.display = 'block';
      ui.summary.innerHTML = `
        <div style="font-size:14px;font-weight:800;color:${winnerColor};margin-bottom:6px">
          ${winner === '平手' ? '🤝 平手' : `🏆 ${winner} 勝`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--text-muted)">
          <div>射門 ${s.h.shots} 次</div>
          <div style="text-align:right">射門 ${s.a.shots} 次</div>
          <div>進球 ${s.h.goals}</div>
          <div style="text-align:right">進球 ${s.a.goals}</div>
        </div>
        <button onclick="MatchSim.run('${matchId}')" style="margin-top:10px;padding:8px 18px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:12px;cursor:pointer">
          🔁 再跑一次
        </button>
        <div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.35)">
          每次結果都不同，但長期分布會符合數據優勢
        </div>
      `;
    }

    tick();
  }

  // ── 公開 API ────────────────────────────────────────────
  window.MatchSim = {
    run(matchId) {
      const containerId = `sim-wrap-${matchId}`;
      const container = document.getElementById(containerId);
      if (!container) { console.warn('[MatchSim] container not found:', containerId); return; }

      // 取賽事 + 球隊
      const schedule = (window.Tournament?.isEPL?.() ? window.EPL_MATCHES
        : window.Tournament?.isUCL?.() ? window.UCL_MATCHES
        : window.SCHEDULE) || [];
      const m = schedule.find(x => x.id === matchId);
      if (!m) { console.warn('[MatchSim] match not found:', matchId); return; }
      const T = window.Tournament?.isEPL?.() ? window.EPL_TEAMS
        : window.Tournament?.isUCL?.() ? window.UCL_TEAMS
        : window.TEAMS;
      const home = T[m.home];
      const away = T[m.away];
      if (!home || !away || !home.radar || !away.radar) {
        container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 此比賽缺少數據，無法模擬</div>';
        return;
      }

      runSim(container, home, away, matchId);
    }
  };
})();
