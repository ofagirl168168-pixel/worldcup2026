/* fx.js — 視覺特效：滑鼠光暈 + 足球踢擊 */

(function() {
  'use strict';

  // ── 1. 滑鼠光暈跟隨 ──────────────────────────────────────
  const glow = document.createElement('div');
  glow.className = 'fx-cursor-glow';
  document.body.appendChild(glow);

  let mx = -200, my = -200, gx = -200, gy = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
  });

  // 平滑跟隨（lerp）
  function animateGlow() {
    gx += (mx - gx) * 0.15;
    gy += (my - gy) * 0.15;
    glow.style.transform = `translate(${gx - 150}px, ${gy - 150}px)`;
    requestAnimationFrame(animateGlow);
  }
  animateGlow();

  // 滑過互動元素時加強光暈
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('button, .match-card, .upcoming-card, .badge-card, .champion-card, .filter-tab, .lb-row, a');
    glow.classList.toggle('fx-glow-bright', !!t);
  });

  // ── 2. 足球踢擊特效 ──────────────────────────────────────
  document.addEventListener('click', e => {
    // modal 內的按鈕等不觸發（避免干擾）
    if (e.target.closest('input, textarea, select')) return;

    const ball = document.createElement('div');
    ball.className = 'fx-ball';
    ball.textContent = '⚽';
    document.body.appendChild(ball);

    // 起始位置：畫面底部中央（第一人稱踢球視角）
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight + 20;
    const endX = e.clientX;
    const endY = e.clientY;

    ball.style.left = startX + 'px';
    ball.style.top = startY + 'px';

    // 計算飛行路徑
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.min(500, Math.max(250, dist * 0.4));

    // 設定 CSS 變數給動畫
    ball.style.setProperty('--fx-dx', dx + 'px');
    ball.style.setProperty('--fx-dy', dy + 'px');
    ball.style.setProperty('--fx-dur', duration + 'ms');
    ball.style.animationDuration = duration + 'ms';

    // 落點爆炸效果
    ball.addEventListener('animationend', () => {
      ball.remove();
      spawnImpact(endX, endY);
    });

    // 防止動畫未觸發時的清理
    setTimeout(() => ball.remove(), duration + 100);
  });

  function spawnImpact(x, y) {
    // 光環
    const ring = document.createElement('div');
    ring.className = 'fx-impact-ring';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());

    // 火花粒子
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'fx-spark';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const angle = (Math.PI * 2 / 6) * i + Math.random() * 0.5;
      const dist = 30 + Math.random() * 40;
      p.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  // ── 3. 手機裝置禁用（效能考量）───────────────────────────
  if ('ontouchstart' in window && window.innerWidth < 768) {
    glow.style.display = 'none';
    // 手機只保留簡化版點擊效果（無足球飛行）
    document.removeEventListener('click', arguments.callee);
  }

})();
