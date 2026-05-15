/**
 * coach-summon-ritual.js — 畫圓召喚教練 mini-game
 *
 * 對外：CoachSummonRitual.open(opts)
 *   opts.onSuccess(result) — 召喚成功（result.coaches[0]）
 *   opts.onCancel()
 *
 * 流程：
 *   1. 開啟召喚陣 modal、中心發光足球 + 旋轉法陣
 *   2. 玩家以中心為原點畫圓（pointer down → move → up）
 *   3. 即時顯示圓度 %（顏色依分數變化）
 *   4. 太久（15s）或不夠圓（< 50%）→ 重畫
 *   5. 成功 → 軌跡填滿成足球 → 飛入螢幕 → 教練卡彈出
 */
(function () {
  'use strict';

  const MIN_SCORE = 50;          // 每圈至少 50 分才算成功
  const MIN_ANGLE_COVERED = Math.PI * 1.6;  // 至少繞 290° 才算一圈

  function open(opts) {
    opts = opts || {};
    const maxLoops = opts.count || 1;     // 1 抽 = 1 圈、10 連 = up to 10 圈
    const TIMEOUT_MS = maxLoops === 10 ? 30000 : 15000;
    const overlay = document.createElement('div');
    overlay.className = 'coach-ritual-overlay';
    const titleTxt = maxLoops === 10 ? '教練招募 · 連環圓 ×10' : '教練招募';
    const subTxt = maxLoops === 10
      ? '每 30 秒一輪、繼續畫到湊滿 10 位（鬆手 / 超時自動進下一輪、進度保留）'
      : '以中心為圓心畫一顆球，越圓的球招募到越強的教練';
    const progressHTML = maxLoops === 10 ? `
      <div class="coach-ritual-progress">
        <div class="coach-ritual-progress-label">已招募 <span class="coach-ritual-progress-num">0</span> / 10</div>
        <div class="coach-ritual-progress-pills" id="coach-ritual-progress-pills"></div>
      </div>
    ` : '';
    overlay.innerHTML = `
      <div class="coach-ritual-stage">
        <button class="coach-ritual-close" type="button" aria-label="關閉">×</button>
        <div class="coach-ritual-title">${titleTxt}</div>
        <div class="coach-ritual-sub">${subTxt}</div>
        <div class="coach-ritual-canvas-wrap">
          <canvas class="coach-ritual-canvas" width="320" height="320"></canvas>
          <div class="coach-ritual-score">圓度 <span class="coach-ritual-score-num is-ssr">100%</span></div>
          <div class="coach-ritual-timer">剩餘 <span class="coach-ritual-timer-num">${TIMEOUT_MS/1000}</span> 秒</div>
        </div>
        ${progressHTML}
        <div class="coach-ritual-rules">
          <span class="coach-ritual-rules-pill rule-r">&lt;95% R</span>
          <span class="coach-ritual-rules-pill rule-sr">95%+ SR</span>
          <span class="coach-ritual-rules-pill rule-ssr">98%+ SSR</span>
        </div>
        <div class="coach-ritual-hint" id="coach-ritual-hint">${maxLoops === 10 ? '不停筆、連續畫圈 — 每圈算一個教練' : '準備好就在中心按下、開始畫圓'}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const canvas = overlay.querySelector('.coach-ritual-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const CX = W / 2, CY = H / 2;
    const scoreNum = overlay.querySelector('.coach-ritual-score-num');
    const timerNum = overlay.querySelector('.coach-ritual-timer-num');
    const hintEl = overlay.querySelector('#coach-ritual-hint');

    let drawing = false;
    let points = [];
    let startTime = 0;
    let timerInterval = null;
    let frozen = false;
    let rafId = null;
    let phaseRotation = 0;
    // 連環圓狀態：累積角度 + 每圈分數 + 每圈起始索引
    let totalAngle = 0;
    let loopScores = [];       // 已完成的圈、各圈的分數
    let loopStartIdx = 0;      // 當前圈在 points 陣列的起始 index
    const progressNum = overlay.querySelector('.coach-ritual-progress-num');
    const progressPills = overlay.querySelector('#coach-ritual-progress-pills');

    // 極簡背景：只有中心點 + 微弱暈
    function drawBackground() {
      ctx.clearRect(0, 0, W, H);
      // 中心微弱光暈（不要太搶戲）
      const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, 120);
      grd.addColorStop(0, 'rgba(255,200,80,0.18)');
      grd.addColorStop(1, 'rgba(10,5,20,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // 中心發光點（圓心參考）
      const pulse = 0.75 + Math.sin(phaseRotation * 4) * 0.25;
      ctx.fillStyle = `rgba(255,220,100,${pulse})`;
      ctx.beginPath();
      ctx.arc(CX, CY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.9})`;
      ctx.beginPath();
      ctx.arc(CX, CY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 每點偏差 → 顏色（綠 → 黃 → 紅）
    function colorByDeviation(dev) {
      // dev 0 → 綠、dev 0.15 → 黃、dev 0.35+ → 紅
      const t = Math.min(1, dev / 0.35);
      let r, g, b;
      if (t < 0.5) {
        const local = t * 2;
        r = Math.round(80 + 175 * local);    // 80 → 255
        g = 230;
        b = Math.round(100 - 60 * local);
      } else {
        const local = (t - 0.5) * 2;
        r = 255;
        g = Math.round(230 - 180 * local);   // 230 → 50
        b = Math.round(40 - 40 * local);
      }
      return `rgb(${r}, ${g}, ${b})`;
    }

    // 玩家筆跡（依每點偏差變色）
    function drawTrail() {
      if (points.length < 2) return;
      const refDist = getRefDist();
      if (refDist < 1) return;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const d = Math.hypot(p.x - CX, p.y - CY);
        const dev = Math.abs(d - refDist) / refDist;
        const col = colorByDeviation(dev);
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(points[i-1].x, points[i-1].y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // 第一點的距離 = 參考半徑（依使用者要求）
    function getRefDist() {
      if (points.length === 0) return 0;
      return Math.hypot(points[0].x - CX, points[0].y - CY);
    }

    // ── 圓度計算（第一點半徑當基準、純平均準確度、不乘角度覆蓋）──
    function computeRoundness(pts) {
      if (pts.length < 1) return 100;
      const refDist = Math.hypot(pts[0].x - CX, pts[0].y - CY);
      if (refDist < 30) return 0;
      return computeLoopScore(pts, refDist);
    }

    // 單圈分數：給定 refDist（全域第一點半徑）計算該圈的平均相似度
    function computeLoopScore(loopPts, refDist) {
      if (!loopPts || loopPts.length < 1 || refDist < 1) return 0;
      let totalSim = 0;
      for (let i = 0; i < loopPts.length; i++) {
        const d = Math.hypot(loopPts[i].x - CX, loopPts[i].y - CY);
        const dev = Math.abs(d - refDist) / refDist;
        const sim = Math.max(0, 1 - dev * 2);
        totalSim += sim;
      }
      return Math.round(totalSim / loopPts.length * 100);
    }

    function isClosed(pts) {
      if (pts.length < 30) return false;
      const first = pts[0];
      const last = pts[pts.length - 1];
      // 用第一點的半徑當基準
      const refDist = Math.hypot(first.x - CX, first.y - CY);
      const startEndDist = Math.hypot(first.x - last.x, first.y - last.y);
      // 終點離起點 < 基準半徑的 15%（更寬鬆）
      const closeOk = startEndDist < refDist * 0.15;
      // 繞夠 290°
      const angles = pts.map(p => Math.atan2(p.y - CY, p.x - CX));
      let total = 0;
      for (let i = 1; i < angles.length; i++) {
        let d = angles[i] - angles[i-1];
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += d;
      }
      return closeOk && Math.abs(total) >= MIN_ANGLE_COVERED;
    }

    // ── 動畫主迴圈 ──
    function loop() {
      phaseRotation += 0.005;
      drawBackground();
      drawTrail();
      rafId = requestAnimationFrame(loop);
    }

    function updateScoreLabel() {
      const score = computeRoundness(points);
      scoreNum.textContent = score + '%';
      scoreNum.className = 'coach-ritual-score-num ' + (
        score >= 98 ? 'is-ssr' :
        score >= 95 ? 'is-sr' :
        score >= 50 ? 'is-r' : 'is-low'
      );
    }

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (W / rect.width),
        y: (t.clientY - rect.top) * (H / rect.height),
      };
    }

    function pointerDown(e) {
      if (frozen) return;
      e.preventDefault();
      const p = pos(e);
      drawing = true;
      // 新一輪：清空當前 round 的軌跡 + 角度，但保留歷史 loopScores（已招募的 N/10）
      points = [p];
      totalAngle = 0;
      loopStartIdx = 0;
      // 只在第一次按下時清空進度（後續 round 維持進度）
      if (loopScores.length === 0 && progressNum) progressNum.textContent = '0';
      if (loopScores.length === 0 && progressPills) progressPills.innerHTML = '';
      startTime = performance.now();
      const remaining = maxLoops - loopScores.length;
      hintEl.textContent = maxLoops === 10
        ? `繼續畫 — 還差 ${remaining} 位招募滿`
        : '畫到回原點 → 自動完成';
      hintEl.classList.remove('is-warn');
      startTimer();
    }

    function pointerMove(e) {
      if (!drawing || frozen) return;
      e.preventDefault();
      const p = pos(e);
      const last = points[points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
      points.push(p);
      // 累積角度
      if (points.length >= 2) {
        const prev = points[points.length - 2];
        const angPrev = Math.atan2(prev.y - CY, prev.x - CX);
        const angCurr = Math.atan2(p.y - CY, p.x - CX);
        let d = angCurr - angPrev;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        totalAngle += d;
      }
      updateScoreLabel();
      // 檢查是否完成一圈（累積角度 >= 2π * (已完成圈數 + 1)）
      const targetAngle = (loopScores.length + 1) * Math.PI * 2;
      if (Math.abs(totalAngle) >= targetAngle) {
        completeLoop();
        // 達到上限 → 自動完成
        if (loopScores.length >= maxLoops) finishDraw();
      }
    }

    function pointerUp(e) {
      if (!drawing) return;
      drawing = false;
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      // 1 抽 mode：完成 1 圈才算成功、否則重畫
      if (maxLoops === 1) {
        if (loopScores.length >= 1) finishDraw();
        else flashRedraw('沒畫完整圈、再來一次');
        return;
      }
      // 10 連 mode：
      // - 完成 10 圈 → 結算
      // - 還沒滿 10 → 起新一輪 30 秒、保留 N/10 進度、清掉本次軌跡
      if (loopScores.length >= maxLoops) {
        finishDraw();
      } else {
        startNewRound();
      }
    }

    // 開啟新一輪 30 秒（保留 loopScores、清軌跡 + 計時）
    function startNewRound() {
      points = [];
      totalAngle = 0;
      loopStartIdx = 0;
      drawing = false;
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      timerNum.textContent = TIMEOUT_MS / 1000;
      scoreNum.textContent = '100%';
      scoreNum.className = 'coach-ritual-score-num is-ssr';
      const remaining = maxLoops - loopScores.length;
      hintEl.textContent = `已招募 ${loopScores.length}/${maxLoops} — 中心再按下、繼續招募剩餘 ${remaining} 位`;
      hintEl.classList.remove('is-warn');
      // 重畫背景（清掉軌跡）
      drawBackground();
    }

    // 完成一圈：計算該圈分數、記錄、UI 更新
    function completeLoop() {
      const loopPts = points.slice(loopStartIdx);
      const refDist = getRefDist();
      const score = computeLoopScore(loopPts, refDist);
      loopScores.push(score);
      loopStartIdx = points.length;   // 下一圈從這裡開始
      // 進度 UI
      if (progressNum) progressNum.textContent = loopScores.length;
      if (progressPills) {
        const pill = document.createElement('span');
        const rarity = score >= 98 ? 'ssr' : score >= 95 ? 'sr' : score >= 50 ? 'r' : 'fail';
        pill.className = `coach-ritual-progress-pill is-${rarity}`;
        pill.textContent = score;
        progressPills.appendChild(pill);
      }
      // 圈完成閃光
      flashCircleComplete();
    }

    function flashCircleComplete() {
      const refDist = getRefDist();
      if (refDist < 1) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,200,0.95)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffe680';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(CX, CY, refDist, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function startTimer() {
      let remain = TIMEOUT_MS / 1000;
      timerNum.textContent = remain;
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (frozen) { clearInterval(timerInterval); return; }
        remain--;
        timerNum.textContent = remain;
        if (remain <= 0) {
          clearInterval(timerInterval);
          // 1 抽 mode：超時 = 全部重畫
          if (maxLoops === 1) {
            flashRedraw('太久了、再來一次');
            return;
          }
          // 10 連 mode：超時不丟進度、起新一輪 30 秒
          drawing = false;
          if (loopScores.length >= maxLoops) {
            finishDraw();
          } else {
            startNewRound();
          }
        }
      }, 1000);
    }

    function flashRedraw(msg) {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      hintEl.textContent = '⚠️ ' + msg;
      hintEl.classList.add('is-warn');
      drawing = false;
      points = [];
      timerNum.textContent = 15;
      scoreNum.textContent = '100%';
      scoreNum.className = 'coach-ritual-score-num is-ssr';
      setTimeout(() => {
        hintEl.classList.remove('is-warn');
        hintEl.textContent = '準備好就在中心按下、開始畫圓';
      }, 1500);
    }

    function finishDraw() {
      if (frozen) return;
      // 10 連 mode：必須完成全部 10 圈才能結算（不夠就回新一輪）
      if (maxLoops === 10 && loopScores.length < 10) {
        startNewRound();
        return;
      }
      // 1 抽：必須至少 1 圈
      if (loopScores.length === 0) {
        flashRedraw('沒完成任何一圈、再來一次');
        return;
      }
      frozen = true;
      drawing = false;
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      // 1 抽：送第一圈分數；10 連：送全部 10 圈
      const scores = maxLoops === 10 ? loopScores.slice(0, 10) : [loopScores[0]];
      runSuccessAnimation(scores);
    }

    // ── 成功動畫：軌跡填滿 → 變足球 → 踢進螢幕 → 教練卡 ──
    async function runSuccessAnimation(scores) {
      const avgScore = Math.round(scores.reduce((s,n)=>s+n,0) / scores.length);
      hintEl.textContent = scores.length === 1
        ? `✨ 圓度 ${scores[0]}% — 招募中…`
        : `✨ ${scores.length} 圈完成（平均 ${avgScore}%）— 招募中…`;
      hintEl.classList.add('is-success');
      // 1. 填滿圓（fade fill）
      let fillT = 0;
      const fillStart = performance.now();
      const fillDuration = 600;
      const fillStep = () => {
        fillT = Math.min(1, (performance.now() - fillStart) / fillDuration);
        drawBackground();
        // 填滿軌跡
        ctx.save();
        ctx.globalAlpha = fillT;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        if (points.length > 2) {
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        // 軌跡邊框
        drawTrail();
        if (fillT < 1) requestAnimationFrame(fillStep);
        else setTimeout(drawSoccerBall, 100);
      };
      fillStep();

      function drawSoccerBall() {
        // 計算球的中心 + 半徑（從軌跡質心 + 平均半徑）
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
        const r = points.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / points.length;
        let scale = 1;
        const kickStart = performance.now();
        const kickDuration = 900;
        const kickStep = () => {
          const t = Math.min(1, (performance.now() - kickStart) / kickDuration);
          // ease-out 後退
          scale = 1 - Math.pow(t, 2) * 0.92;
          const rotation = t * Math.PI * 4;
          drawBackground();
          ctx.save();
          ctx.translate(cx, cy);
          // y 方向向上飛（負）+ 加 perspective
          ctx.translate(0, -t * 60);
          ctx.scale(scale, scale);
          ctx.rotate(rotation);
          // 球體
          const grd = ctx.createRadialGradient(-r/3, -r/3, 2, 0, 0, r);
          grd.addColorStop(0, '#ffffff');
          grd.addColorStop(0.6, '#e0e0e0');
          grd.addColorStop(1, '#808080');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.stroke();
          // 五邊形塊（簡化版）
          ctx.fillStyle = '#1a1a1a';
          const penta = 5;
          const inner = r * 0.4;
          ctx.beginPath();
          for (let i = 0; i < penta; i++) {
            const a = (i / penta) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * inner;
            const y = Math.sin(a) * inner;
            ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          if (t < 1) requestAnimationFrame(kickStep);
          else {
            cancelAnimationFrame(rafId);
            // 召喚成功 → 呼叫 RPC + 返回結果
            triggerSummonResult(scores);
          }
        };
        kickStep();
      }
    }

    async function triggerSummonResult(scores) {
      hintEl.textContent = `✨ 招募 ${scores.length} 位教練中…`;
      try {
        const result = await window.MyTeam.drawCoachBySpiral(scores);
        // 自動指派到空 slot（沿用 my-team-modal 的 auto-assign 邏輯）
        if (typeof window._mtAutoAssignCoaches === 'function') {
          await window._mtAutoAssignCoaches(result.coaches || []);
        }
        // 通知外層
        cleanup();
        if (typeof opts.onSuccess === 'function') opts.onSuccess(result);
      } catch (e) {
        console.error('[summon] failed', e);
        hintEl.textContent = '⚠️ 召喚失敗：' + (e.message || e);
        hintEl.classList.add('is-warn');
        setTimeout(() => {
          cleanup();
          if (typeof opts.onCancel === 'function') opts.onCancel();
        }, 2500);
      }
    }

    function cleanup() {
      if (rafId) cancelAnimationFrame(rafId);
      if (timerInterval) clearInterval(timerInterval);
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    }

    // ── pointer events ──
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    // touch fallback（一些瀏覽器 pointer 不觸發）
    canvas.addEventListener('touchstart', pointerDown, { passive: false });
    canvas.addEventListener('touchmove', pointerMove, { passive: false });
    canvas.addEventListener('touchend', pointerUp);

    overlay.querySelector('.coach-ritual-close').addEventListener('click', () => {
      cleanup();
      if (typeof opts.onCancel === 'function') opts.onCancel();
    });

    // 啟動背景動畫
    loop();
  }

  window.CoachSummonRitual = { open };
})();
