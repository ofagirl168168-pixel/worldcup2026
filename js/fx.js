/* fx.js — 視覺特效：黑霧探照燈 + 隱藏標靶 + 足球踢擊 */

(function() {
  'use strict';

  const isMobile = 'ontouchstart' in window && window.innerWidth < 768;

  // ── 1 & 2. 黑霧 + 標靶（僅桌機） ─────────────────────────────
  let gx = -500, gy = -500;
  const targets = [];

  if (!isMobile) {
    const fog = document.createElement('div');
    fog.className = 'fx-fog';
    document.body.appendChild(fog);

    let mx = -500, my = -500;

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    });

    function animateFog() {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      fog.style.background = `radial-gradient(circle 180px at ${gx}px ${gy}px, transparent 0%, transparent 40%, rgba(0,0,0,0.35) 100%)`;
      requestAnimationFrame(animateFog);
    }
    animateFog();

    // ── 標靶系統 ──
    const TARGET_COUNT = 12;
    const TARGET_RESPAWN = 8000;

    const targetLayer = document.createElement('div');
    targetLayer.className = 'fx-target-layer';
    document.body.appendChild(targetLayer);

    function getContentHeight() {
      return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    }

    function spawnTarget() {
      const t = document.createElement('div');
      t.className = 'fx-target';
      t.innerHTML =
        '<div class="fx-target-board">' +
          '<div class="fx-ring r1"></div>' +
          '<div class="fx-ring r2"></div>' +
          '<div class="fx-ring r3"></div>' +
          '<div class="fx-bullseye"></div>' +
          '<div class="fx-crosshair ch-h"></div>' +
          '<div class="fx-crosshair ch-v"></div>' +
        '</div>' +
        '<div class="fx-target-stand">' +
          '<div class="fx-stand-pole"></div>' +
          '<div class="fx-stand-leg leg-l"></div>' +
          '<div class="fx-stand-leg leg-r"></div>' +
        '</div>';
      const pageH = getContentHeight();
      t.style.left = (8 + Math.random() * 84) + 'vw';
      const pageY = pageH * 0.05 + Math.random() * pageH * 0.9;
      t._pageY = pageY;
      t.style.animationDelay = (Math.random() * 3) + 's';
      targetLayer.appendChild(t);
      targets.push(t);
      return t;
    }

    for (let i = 0; i < TARGET_COUNT; i++) spawnTarget();

    function updateTargetScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      targets.forEach(t => {
        t.style.top = (t._pageY - scrollY) + 'px';
      });
      requestAnimationFrame(updateTargetScroll);
    }
    updateTargetScroll();

    function updateTargetVisibility() {
      targets.forEach(t => {
        if (t._hit) return;
        const rect = t.getBoundingClientRect();
        const tx = rect.left + rect.width / 2;
        const ty = rect.top + rect.height / 2;
        const dist = Math.sqrt((gx - tx) ** 2 + (gy - ty) ** 2);
        if (dist < 200) {
          const opacity = Math.max(0, 1 - dist / 200);
          t.style.opacity = opacity * 0.7;
        } else {
          t.style.opacity = 0;
        }
      });
      requestAnimationFrame(updateTargetVisibility);
    }
    updateTargetVisibility();

    // 標靶命中處理（掛到外層供足球碰撞用）
    window._fxOnTargetHit = function(target, x, y) {
      target._hit = true;
      target.classList.add('fx-target-hit');

      const score = [1, 2, 3, 5, 10, 15, 20, 50][Math.floor(Math.random() * 8)];
      const scoreEl = document.createElement('div');
      scoreEl.className = 'fx-score-fly';
      scoreEl.textContent = `+${score}`;
      scoreEl.style.left = x + 'px';
      scoreEl.style.top = y + 'px';
      const colors = ['#ffd700', '#ff6b6b', '#51cf66', '#748ffc', '#ff922b', '#e599f7'];
      scoreEl.style.color = colors[Math.floor(Math.random() * colors.length)];
      const flyX = (Math.random() - 0.5) * 80;
      scoreEl.style.setProperty('--fly-x', flyX + 'px');
      document.body.appendChild(scoreEl);
      scoreEl.addEventListener('animationend', () => scoreEl.remove());

      spawnImpactBig(x, y);

      setTimeout(() => {
        const idx = targets.indexOf(target);
        if (idx >= 0) targets.splice(idx, 1);
        target.remove();
        spawnTarget();
      }, TARGET_RESPAWN);
    };
  } // end !isMobile

  // ── 3. 足球踢擊（所有裝置） ──────────────────────────────────
  document.addEventListener('click', e => {
    if (e.target.closest('input, textarea, select, button, a, .fx-target')) return;

    const endX = e.clientX;
    const endY = e.clientY;

    const ball = document.createElement('div');
    ball.className = 'fx-ball';
    ball.textContent = '⚽';
    document.body.appendChild(ball);

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight + 20;
    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Math.min(500, Math.max(250, dist * 0.4));

    ball.style.left = startX + 'px';
    ball.style.top = startY + 'px';
    ball.style.setProperty('--fx-dx', dx + 'px');
    ball.style.setProperty('--fx-dy', dy + 'px');
    ball.style.animationDuration = duration + 'ms';

    ball.addEventListener('animationend', () => {
      ball.remove();
      const hitTarget = checkTargetHit(endX, endY);
      if (hitTarget) {
        window._fxOnTargetHit?.(hitTarget, endX, endY);
      } else {
        spawnImpact(endX, endY);
      }
    });
    setTimeout(() => ball.remove(), duration + 100);
  });

  function checkTargetHit(x, y) {
    for (const t of targets) {
      if (t._hit) continue;
      const rect = t.getBoundingClientRect();
      const tx = rect.left + rect.width / 2;
      const ty = rect.top + rect.height / 2;
      const dist = Math.sqrt((x - tx) ** 2 + (y - ty) ** 2);
      if (dist < 50) return t;
    }
    return null;
  }

  // ── 4. 落點效果 ──────────────────────────────────────────
  function spawnImpact(x, y) {
    const ring = document.createElement('div');
    ring.className = 'fx-impact-ring';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());

    for (let i = 0; i < 5; i++) {
      const p = document.createElement('div');
      p.className = 'fx-spark';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const angle = (Math.PI * 2 / 5) * i + Math.random() * 0.5;
      const d = 25 + Math.random() * 35;
      p.style.setProperty('--sx', Math.cos(angle) * d + 'px');
      p.style.setProperty('--sy', Math.sin(angle) * d + 'px');
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  function spawnImpactBig(x, y) {
    // 大光環
    const ring = document.createElement('div');
    ring.className = 'fx-impact-ring fx-ring-big';
    ring.style.left = x + 'px';
    ring.style.top = y + 'px';
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());

    // 很多火花
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'fx-spark fx-spark-big';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.3;
      const d = 40 + Math.random() * 60;
      p.style.setProperty('--sx', Math.cos(angle) * d + 'px');
      p.style.setProperty('--sy', Math.sin(angle) * d + 'px');
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

})();
