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

  const TIMEOUT_MS = 15000;     // 15 秒沒畫完 → 重畫
  const MIN_SCORE = 50;          // 50 分才算成功
  const CLOSE_RADIUS_PCT = 0.10; // 終點離起點 < 10% 平均半徑才算封閉
  const MIN_ANGLE_COVERED = Math.PI * 1.6;  // 至少繞 290° 才算一圈

  function open(opts) {
    opts = opts || {};
    const overlay = document.createElement('div');
    overlay.className = 'coach-ritual-overlay';
    overlay.innerHTML = `
      <div class="coach-ritual-stage">
        <button class="coach-ritual-close" type="button" aria-label="關閉">×</button>
        <div class="coach-ritual-title">✨ 教練召喚儀式</div>
        <div class="coach-ritual-sub">以中心為圓心畫一個圓 — 越圓的圓召喚越強的教練</div>
        <div class="coach-ritual-canvas-wrap">
          <canvas class="coach-ritual-canvas" width="320" height="320"></canvas>
          <div class="coach-ritual-score">圓度 <span class="coach-ritual-score-num">0%</span></div>
          <div class="coach-ritual-timer">剩餘 <span class="coach-ritual-timer-num">15</span> 秒</div>
        </div>
        <div class="coach-ritual-rules">
          <span class="coach-ritual-rules-pill rule-r">50%+ R</span>
          <span class="coach-ritual-rules-pill rule-sr">85%+ SR</span>
          <span class="coach-ritual-rules-pill rule-ssr">95%+ SSR</span>
        </div>
        <div class="coach-ritual-hint" id="coach-ritual-hint">準備好就在中心按下、開始畫圓</div>
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

    // 背景：召喚陣（旋轉法陣 + 中心發光球場 + 粒子）
    function drawBackground() {
      ctx.clearRect(0, 0, W, H);
      // 外圈漸層暈
      const grd = ctx.createRadialGradient(CX, CY, 30, CX, CY, 160);
      grd.addColorStop(0, 'rgba(255,200,80,0.4)');
      grd.addColorStop(0.4, 'rgba(120,60,180,0.18)');
      grd.addColorStop(1, 'rgba(10,5,20,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // 法陣三層（不同速度旋轉）
      ctx.save();
      ctx.translate(CX, CY);
      // 第 1 圈：外圈虛線
      ctx.rotate(phaseRotation);
      ctx.strokeStyle = 'rgba(240,192,64,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // 第 2 圈：8 角星
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(-phaseRotation * 0.6);
      ctx.strokeStyle = 'rgba(155,135,245,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      const star = 8;
      for (let i = 0; i < star; i++) {
        const a = (i / star) * Math.PI * 2;
        const x = Math.cos(a) * 100;
        const y = Math.sin(a) * 100;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      // 第 3 圈：內圈實線
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(phaseRotation * 1.4);
      ctx.strokeStyle = 'rgba(255,213,74,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // 中心發光點（圓心參考）
      const pulse = 0.7 + Math.sin(phaseRotation * 4) * 0.3;
      ctx.fillStyle = `rgba(255,220,100,${pulse})`;
      ctx.beginPath();
      ctx.arc(CX, CY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${pulse * 0.8})`;
      ctx.beginPath();
      ctx.arc(CX, CY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 玩家筆跡（金黃漸層、發光）
    function drawTrail() {
      if (points.length < 2) return;
      const score = computeRoundness(points);
      const color = score >= 95 ? '#ffd54a' : score >= 85 ? '#b894ff' : score >= 50 ? '#ffe680' : '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ── 圓度計算 ──
    function computeRoundness(pts) {
      if (pts.length < 10) return 0;
      // 用中心點當參考圓心
      const cx = CX, cy = CY;
      // 距離陣列
      const dists = pts.map(p => Math.hypot(p.x - cx, p.y - cy));
      const mean = dists.reduce((s, d) => s + d, 0) / dists.length;
      // 半徑太小（< 30）→ 0 分（沒繞夠）
      if (mean < 30) return 0;
      // 標準差 / 平均 = 變異係數
      const variance = dists.reduce((s, d) => s + Math.pow(d - mean, 2), 0) / dists.length;
      const cv = Math.sqrt(variance) / mean;
      // cv 越小越圓、轉成 0-100 分
      // cv 0 → 100、cv 0.3 → 0
      const radialScore = Math.max(0, Math.min(100, (1 - cv / 0.3) * 100));
      // 還要看是否真的繞了一圈（角度覆蓋）
      const angles = pts.map(p => Math.atan2(p.y - cy, p.x - cx));
      let minA = Infinity, maxA = -Infinity;
      // 用 unwrap 累積角度（避免 -π/+π 跳變）
      let total = 0;
      for (let i = 1; i < angles.length; i++) {
        let d = angles[i] - angles[i-1];
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += d;
      }
      const angleCovered = Math.abs(total);
      const angleScore = Math.min(1, angleCovered / (Math.PI * 2));
      // 最終分數 = 半徑均勻度 × 角度覆蓋率
      return Math.round(radialScore * angleScore);
    }

    function isClosed(pts) {
      if (pts.length < 30) return false;
      const first = pts[0];
      const last = pts[pts.length - 1];
      const dists = pts.map(p => Math.hypot(p.x - CX, p.y - CY));
      const mean = dists.reduce((s, d) => s + d, 0) / dists.length;
      const startEndDist = Math.hypot(first.x - last.x, first.y - last.y);
      // 終點離起點 < 平均半徑的 12%（更寬鬆）
      const closeOk = startEndDist < mean * 0.12;
      // 也要繞夠 290°
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
        score >= 95 ? 'is-ssr' :
        score >= 85 ? 'is-sr' :
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
      points = [p];
      startTime = performance.now();
      hintEl.textContent = '畫到回原點 → 自動完成';
      startTimer();
    }

    function pointerMove(e) {
      if (!drawing || frozen) return;
      e.preventDefault();
      const p = pos(e);
      // 太近就跳過（減少 jitter）
      const last = points[points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
      points.push(p);
      updateScoreLabel();
      // 即時檢測封閉
      if (isClosed(points)) {
        finishDraw();
      }
    }

    function pointerUp(e) {
      if (!drawing) return;
      drawing = false;
      // 手放開 → 也檢查一次
      if (isClosed(points)) {
        finishDraw();
      } else {
        // 鬆手但沒封閉 → 重畫
        flashRedraw('沒畫完整圈、再來一次');
      }
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
          flashRedraw('太久了、再來一次');
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
      scoreNum.textContent = '0%';
      scoreNum.className = 'coach-ritual-score-num';
      setTimeout(() => {
        hintEl.classList.remove('is-warn');
        hintEl.textContent = '準備好就在中心按下、開始畫圓';
      }, 1500);
    }

    function finishDraw() {
      if (frozen) return;
      const score = computeRoundness(points);
      if (score < MIN_SCORE) {
        flashRedraw(`圓度只有 ${score}% — 再來一次`);
        return;
      }
      frozen = true;
      drawing = false;
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      runSuccessAnimation(score);
    }

    // ── 成功動畫：軌跡填滿 → 變足球 → 踢進螢幕 → 教練卡 ──
    async function runSuccessAnimation(score) {
      hintEl.textContent = `✨ 圓度 ${score}% — 召喚中…`;
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
            triggerSummonResult(score);
          }
        };
        kickStep();
      }
    }

    async function triggerSummonResult(score) {
      hintEl.textContent = '✨ 教練降臨…';
      try {
        const result = await window.MyTeam.drawCoachByCircle(score);
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
