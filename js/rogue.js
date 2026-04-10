/* rogue.js — ⚽ 足球肉鴿射門挑戰 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  //  常數
  // ═══════════════════════════════════════════════════════════
  const FIELD_HW    = 600;   // 球場半寬 (world) — 更寬
  const FIELD_DEPTH = 1200;  // 球場深度
  const GOAL_HW     = 140;   // 球門半寬
  const GOAL_Z      = FIELD_DEPTH;
  const FOCAL       = 200;   // 透視焦距（小=更平坦視角）
  const MAX_LIVES   = 3;
  const BALL_SPD    = 6;     // 基礎球速（調慢，讓球可見）
  const MAX_BALL_SPD = 14;   // 球速上限
  const BALL_R      = 10;    // 基礎球半徑 (world)
  const BASE_DMG    = 1;
  const SHOOT_CD    = 350;   // 射門冷卻 ms
  const BALL_TTL    = 4000;  // 球最長存活 ms
  const GK_BASE_SPD = 1.2;

  // ═══════════════════════════════════════════════════════════
  //  卡牌
  // ═══════════════════════════════════════════════════════════
  // 稀有度權重：common 出現最多，legendary 最少
  const RARITY_WEIGHT = { common: 50, rare: 25, epic: 10, legendary: 3 };

  const CARDS = [
    // ── 基礎數值卡 (common) ─────────────────
    { id:'dmg20',    name:'射門強化',   desc:'傷害 +20%',                icon:'👊', rarity:'common',    apply(s){ s.dmgMul *= 1.2; }},
    { id:'dmg30',    name:'力量訓練',   desc:'傷害 +30%',                icon:'💪', rarity:'common',    apply(s){ s.dmgMul *= 1.3; }},
    { id:'spd20',    name:'速度鞋',     desc:'球速 +20%',                icon:'👟', rarity:'common',    apply(s){ s.spdMul *= 1.2; }},
    { id:'spd40',    name:'閃電射門',   desc:'球速 +40%',                icon:'⚡', rarity:'common',    apply(s){ s.spdMul *= 1.4; }},
    { id:'bigball',  name:'大力丸',     desc:'球體增大 20%',             icon:'⭕', rarity:'common',    apply(s){ s.ballScale *= 1.2; }},
    { id:'bigball2', name:'巨型足球',   desc:'球體增大 40%',             icon:'🔵', rarity:'common',    apply(s){ s.ballScale *= 1.4; }},
    { id:'rapid',    name:'快速連射',   desc:'射門冷卻 -30%',            icon:'⏩', rarity:'common',    apply(s){ s.cdMul *= 0.7; }},
    { id:'multi1',   name:'雙重射擊',   desc:'連續射球數量 +1',          icon:'⚽', rarity:'common',    apply(s){ s.multiShot += 1; }},

    // ── 能力卡 (rare) ──────────────────────
    { id:'curve',    name:'弧線球',     desc:'足球帶隨機橫向飄移',       icon:'🌀', rarity:'rare',     apply(s){ s.curve = true; }},
    { id:'burn',     name:'火焰射擊',   desc:'命中附帶灼燒（每秒 1 傷害）',icon:'🔥', rarity:'rare',  apply(s){ s.burn = true; }},
    { id:'freeze',   name:'冰凍射擊',   desc:'命中後敵人減速 50%',       icon:'❄️', rarity:'rare',    apply(s){ s.freeze = true; }},
    { id:'explode',  name:'爆裂射擊',   desc:'命中時爆炸傷害周圍',       icon:'💥', rarity:'rare',    apply(s){ s.explode = true; }},
    { id:'sniper',   name:'狙擊射門',   desc:'傷害 ×2.5，球變小',        icon:'🔫', rarity:'rare',    apply(s){ s.dmgMul *= 2.5; s.ballScale *= 0.65; }},
    { id:'multi2',   name:'三重射擊',   desc:'連續射球數量 +2',          icon:'🎱', rarity:'rare',     apply(s){ s.multiShot += 2; }},

    // ── 進階卡 (epic) ──────────────────────
    { id:'pierce',   name:'貫穿射擊',   desc:'足球穿透敵人不反彈',       icon:'💨', rarity:'epic',     apply(s){ s.pierce = true; }},
    { id:'power2',   name:'重砲射擊',   desc:'傷害 ×2',                  icon:'🔨', rarity:'epic',     apply(s){ s.dmgMul *= 2; }},
    { id:'homing',   name:'追蹤導彈',   desc:'足球微幅追蹤最近敵人',     icon:'🎯', rarity:'epic',     apply(s){ s.homing = true; }},

    // ── 傳說卡 (legendary) ─────────────────
    { id:'ghost',    name:'幽靈球',     desc:'30% 機率穿過敵人',         icon:'👻', rarity:'legendary', apply(s){ s.ghostPct = Math.min(0.9, (s.ghostPct||0) + 0.3); }},
    { id:'vampire',  name:'吸血足球',   desc:'擊殺敵人回復 1 條命',      icon:'🧛', rarity:'legendary', apply(s){ s.vampire = true; }},
  ];

  // ═══════════════════════════════════════════════════════════
  //  防守員類型
  // ═══════════════════════════════════════════════════════════
  const DTYPE = {
    normal:  { label:'防守員',   fill:'#4fc3f7', hp:3,  spd:0.30, w:28, h:40 },
    fast:    { label:'快速前鋒', fill:'#fff176', hp:2,  spd:0.65, w:24, h:36 },
    tank:    { label:'中後衛',   fill:'#ef5350', hp:8,  spd:0.18, w:36, h:48 },
    captain: { label:'隊長',     fill:'#ce93d8', hp:5,  spd:0.28, w:32, h:44, aura:true },
  };

  // ═══════════════════════════════════════════════════════════
  //  執行期變數
  // ═══════════════════════════════════════════════════════════
  let overlay, cvs, ctx;
  let W, H, horizY;
  let G = null;          // game state — null = 遊戲未執行
  let rafId = null;
  let prevTs = 0;
  let shakeAmt = 0;
  let waveFlash = 0;     // Wave 公告倒數 ms

  // ═══════════════════════════════════════════════════════════
  //  初始化 / 狀態
  // ═══════════════════════════════════════════════════════════
  function freshState() {
    return {
      phase: 'title',           // title | playing | cards | gameover
      lives: MAX_LIVES,
      score: 0,
      wave: 1,

      // buffs
      dmgMul: 1, spdMul: 1, ballScale: 1, multiShot: 1, cdMul: 1,
      pierce: false, burn: false, freeze: false, homing: false,
      explode: false, curve: false, ghostPct: 0, vampire: false,
      collected: [],            // card ids

      // entities
      balls: [],
      defs: [],
      gk: { x: 0, dir: 1, spd: GK_BASE_SPD, w: 50, h: 45, z: GOAL_Z - 35 },
      particles: [],

      // shooting
      canShoot: true,
      shootCD: 0,

      // cards UI
      cardPick: [],
      _cardR: [],               // click rects
      _restartR: null,
      _closeR: null,

      // wave spawn
      spawnQueue: [],
      spawnTimer: 0,
    };
  }

  // ─── 透視投影 ────────────────────────────────────────────
  function proj(wx, wz) {
    const s = FOCAL / (FOCAL + wz);
    return { x: W / 2 + wx * s, y: horizY + (H - horizY) * s, s };
  }

  // ═══════════════════════════════════════════════════════════
  //  Wave 管理
  // ═══════════════════════════════════════════════════════════
  function waveConfig(w) {
    const count = Math.min(2 + w, 14);
    const types = ['normal'];
    if (w >= 2) types.push('fast');
    if (w >= 3) types.push('tank');
    if (w >= 5) types.push('captain');
    return { count, types, hpMul: 1 + (w - 1) * 0.15, spdMul: 1 + (w - 1) * 0.08 };
  }

  function makeDef(type, hpMul, spdMul) {
    const d = DTYPE[type];
    const hp = Math.ceil(d.hp * hpMul);
    return {
      type, x: (Math.random() - 0.5) * FIELD_HW * 1.4,
      z: FIELD_DEPTH * (0.5 + Math.random() * 0.4),
      hp, maxHp: hp,
      spd: d.spd * spdMul, w: d.w, h: d.h, fill: d.fill,
      frozen: 0, burning: 0, burnTick: 0,
    };
  }

  function beginWave() {
    const cfg = waveConfig(G.wave);
    G.spawnQueue = [];
    for (let i = 0; i < cfg.count; i++) {
      const t = cfg.types[Math.floor(Math.random() * cfg.types.length)];
      G.spawnQueue.push(makeDef(t, cfg.hpMul, cfg.spdMul));
    }
    // 立刻放一半，其餘排隊
    const immediate = Math.ceil(G.spawnQueue.length / 2);
    for (let i = 0; i < immediate; i++) G.defs.push(G.spawnQueue.shift());
    G.spawnTimer = 1500;

    waveFlash = 1800;
    G.gk.spd = GK_BASE_SPD + G.wave * 0.18;
  }

  // ═══════════════════════════════════════════════════════════
  //  射門
  // ═══════════════════════════════════════════════════════════
  function shoot(cx, cy) {
    if (!G.canShoot || G.phase !== 'playing') return;

    // 計算從畫面底部中央到點擊位置的方向向量
    const originX = W / 2;
    const originY = H;
    const dx = cx - originX;
    const dy = cy - originY;  // 負值（向上）
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // 歸一化方向，確保 vz 為正（向前）
    const dirX = dx / len;
    const dirY = -dy / len;   // 反轉：螢幕向上 = 世界向前

    // 實際球速（有上限）
    const spd = Math.min(BALL_SPD * G.spdMul, MAX_BALL_SPD);

    const n = G.multiShot;
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i - (n - 1) / 2) * 20 : 0;
      const b = {
        x: spread * 0.3, z: 10,
        vx: (dirX + spread * 0.005) * spd * 0.7,
        vz: Math.max(dirY * spd, spd * 0.4),  // 確保至少向前
        r: BALL_R * G.ballScale,
        alive: true, age: 0, trail: [],
      };
      if (G.curve) b.curveAcc = (Math.random() - 0.5) * 0.15;
      G.balls.push(b);
    }
    G.canShoot = false;
    G.shootCD = SHOOT_CD * G.cdMul;
  }

  // ═══════════════════════════════════════════════════════════
  //  粒子
  // ═══════════════════════════════════════════════════════════
  function addPart(x, z, text, dur) {
    G.particles.push({ x, z, text, age: 0, life: dur * 1000 });
  }

  // ═══════════════════════════════════════════════════════════
  //  更新
  // ═══════════════════════════════════════════════════════════
  function update(dt) {
    // screen shake decay
    shakeAmt *= 0.88;
    if (shakeAmt < 0.3) shakeAmt = 0;

    // wave flash
    if (waveFlash > 0) waveFlash -= dt;

    if (G.phase !== 'playing') return;

    // ── 射門冷卻 ──
    if (!G.canShoot) { G.shootCD -= dt; if (G.shootCD <= 0) G.canShoot = true; }

    // ── 排隊生成防守員 ──
    if (G.spawnQueue.length) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        G.defs.push(G.spawnQueue.shift());
        G.spawnTimer = 1800;
      }
    }

    // ── 守門員 ──
    const gk = G.gk;
    gk.x += gk.dir * gk.spd * (dt / 16);
    if (gk.x > GOAL_HW - gk.w / 2) { gk.x = GOAL_HW - gk.w / 2; gk.dir = -1; }
    if (gk.x < -GOAL_HW + gk.w / 2) { gk.x = -GOAL_HW + gk.w / 2; gk.dir = 1; }

    // ── 足球更新 ──
    for (const b of G.balls) {
      if (!b.alive) continue;
      b.age += dt;
      if (b.age > BALL_TTL) { b.alive = false; continue; }

      b.trail.push({ x: b.x, z: b.z });
      if (b.trail.length > 8) b.trail.shift();

      const step = dt / 16;

      // 追蹤導彈：微幅偏向最近敵人
      if (G.homing && G.defs.length) {
        let nearest = null, bestDist = Infinity;
        for (const d of G.defs) {
          if (d.hp <= 0) continue;
          const dist = Math.sqrt((b.x - d.x) ** 2 + (b.z - d.z) ** 2);
          if (dist < bestDist) { bestDist = dist; nearest = d; }
        }
        if (nearest && bestDist < 300) {
          const ax = (nearest.x - b.x) > 0 ? 0.08 : -0.08;
          b.vx += ax * step;
        }
      }

      b.x += b.vx * step;
      b.z += b.vz * step;
      if (b.curveAcc) b.vx += b.curveAcc * step;

      // 牆壁反彈
      if (b.x < -FIELD_HW + b.r) { b.x = -FIELD_HW + b.r; b.vx = Math.abs(b.vx); }
      if (b.x > FIELD_HW - b.r)  { b.x = FIELD_HW - b.r;  b.vx = -Math.abs(b.vx); }

      // 碰防守員
      let hitDef = false;
      for (const d of G.defs) {
        if (d.hp <= 0) continue;
        if (Math.abs(b.x - d.x) < b.r + d.w * 0.4 && Math.abs(b.z - d.z) < d.h * 0.5) {
          // ghost 穿過
          if (G.ghostPct > 0 && Math.random() < G.ghostPct) { addPart(d.x, d.z, '👻', 0.6); continue; }
          const dmg = Math.ceil(BASE_DMG * G.dmgMul);
          d.hp -= dmg;
          addPart(d.x, d.z, `-${dmg}`, 0.5);
          if (G.burn)   d.burning = 3000;
          if (G.freeze) d.frozen  = 3000;
          if (G.explode) explodeAOE(d, dmg);
          if (d.hp <= 0) onDefKill(d);
          if (!G.pierce) { b.alive = false; hitDef = true; break; }
        }
      }
      if (hitDef) continue;

      // 碰守門員
      if (b.z > gk.z - 20 && b.z < gk.z + 20 && Math.abs(b.x - gk.x) < gk.w * 0.55) {
        b.alive = false;
        addPart(gk.x, gk.z, '🧤', 0.8);
        shakeAmt = 4;
        continue;
      }

      // 進球判定（同一波只算一次）
      if (b.z >= GOAL_Z) {
        b.alive = false;
        if (Math.abs(b.x) < GOAL_HW && G.phase === 'playing') { onGoal(); return; }
      }
      // 飛出場外
      if (b.z < -50) b.alive = false;
    }
    G.balls = G.balls.filter(b => b.alive);

    // ── 防守員更新 ──
    for (const d of G.defs) {
      if (d.hp <= 0) continue;
      // 灼燒
      if (d.burning > 0) {
        d.burning -= dt;
        d.burnTick -= dt;
        if (d.burnTick <= 0) { d.hp -= 1; d.burnTick = 1000; addPart(d.x, d.z, '🔥', 0.3); if (d.hp <= 0) onDefKill(d); }
      }
      // 前進
      const sp = d.frozen > 0 ? d.spd * 0.5 : d.spd;
      if (d.frozen > 0) d.frozen -= dt;
      d.z -= sp * (dt / 16);
      d.x += Math.sin(Date.now() * 0.001 + d.z * 0.01) * 0.15;
      // 隊長光環
      if (DTYPE[d.type]?.aura) {
        for (const d2 of G.defs) {
          if (d2 === d || d2.hp <= 0) continue;
          if (Math.sqrt((d2.x - d.x) ** 2 + (d2.z - d.z) ** 2) < 100) d2.z -= 0.08 * (dt / 16);
        }
      }
      // 突破底線
      if (d.z <= 0) {
        G.lives--;
        d.hp = 0;
        shakeAmt = 12;
        addPart(d.x, 30, '🔴', 1.2);
        if (G.lives <= 0) { G.phase = 'gameover'; saveResult(); return; }
      }
    }
    G.defs = G.defs.filter(d => d.hp > 0);

    // ── 粒子 ──
    for (const p of G.particles) p.age += dt;
    G.particles = G.particles.filter(p => p.age < p.life);
  }

  function explodeAOE(src, dmg) {
    for (const d of G.defs) {
      if (d === src || d.hp <= 0) continue;
      if (Math.sqrt((d.x - src.x) ** 2 + (d.z - src.z) ** 2) < 80) {
        d.hp -= Math.ceil(dmg * 0.5);
        addPart(d.x, d.z, '💥', 0.4);
        if (d.hp <= 0) onDefKill(d);
      }
    }
  }

  function onDefKill(d) {
    G.score += 10;
    addPart(d.x, d.z, '💀', 0.7);
    if (G.vampire && G.lives < MAX_LIVES) { G.lives++; addPart(d.x, d.z, '❤️', 0.9); }
  }

  function onGoal() {
    G.score += 100;
    G.defs = [];
    G.spawnQueue = [];
    G.balls = [];          // 清除場上所有球
    shakeAmt = 10;
    addPart(0, GOAL_Z - 50, '⚽ GOAL!', 1.5);
    G.phase = 'cards';
    G.cardPick = pickCards(3);
  }

  function pickCards(n) {
    // 依稀有度權重抽卡，不重複
    const weighted = [];
    for (const c of CARDS) {
      const w = RARITY_WEIGHT[c.rarity] || 10;
      for (let i = 0; i < w; i++) weighted.push(c);
    }
    const picked = [];
    const usedIds = new Set();
    while (picked.length < n && weighted.length) {
      const idx = Math.floor(Math.random() * weighted.length);
      const c = weighted[idx];
      if (!usedIds.has(c.id)) { picked.push(c); usedIds.add(c.id); }
      weighted.splice(idx, 1);
    }
    return picked;
  }

  function selectCard(idx) {
    const c = G.cardPick[idx];
    c.apply(G);
    G.collected.push(c.id);
    G.phase = 'playing';
    G.wave++;
    setTimeout(() => { if (G && G.phase === 'playing') beginWave(); }, 400);
  }

  // ═══════════════════════════════════════════════════════════
  //  紀錄
  // ═══════════════════════════════════════════════════════════
  function saveResult() {
    const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
    if (!best.score || G.score > best.score) {
      best.score = G.score;
      best.wave  = G.wave;
      best.date  = new Date().toISOString().slice(0, 10);
      localStorage.setItem('rogue_best', JSON.stringify(best));
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  渲染
  // ═══════════════════════════════════════════════════════════
  function render() {
    ctx.save();
    // screen shake
    if (shakeAmt > 0.5) ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);

    if (G.phase === 'title') { drawTitle(); ctx.restore(); return; }

    drawField();
    drawGoal();

    // 依 z 排序繪製（遠→近）
    const ents = [];
    G.defs.forEach(d => { if (d.hp > 0) ents.push({ k: 'd', o: d, z: d.z }); });
    ents.push({ k: 'gk', o: G.gk, z: G.gk.z });
    G.balls.forEach(b => { if (b.alive) ents.push({ k: 'b', o: b, z: b.z }); });
    ents.sort((a, b) => b.z - a.z);
    for (const e of ents) {
      if (e.k === 'd')  drawDef(e.o);
      if (e.k === 'gk') drawGK(e.o);
      if (e.k === 'b')  drawBall(e.o);
    }

    drawParticles();
    drawHUD();

    // Wave 公告
    if (waveFlash > 0 && G.phase === 'playing') {
      const a = Math.min(1, waveFlash / 600);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(48, W * 0.08)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`Wave ${G.wave}`, W / 2, H * 0.38);
      ctx.globalAlpha = 1;
    }

    if (G.phase === 'cards')    drawCards();
    if (G.phase === 'gameover') drawGameOver();

    ctx.restore();
  }

  // ─── 球場 ────────────────────────────────────────────────
  function drawField() {
    // 天空
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizY);
    skyGrad.addColorStop(0, '#0a1628');
    skyGrad.addColorStop(1, '#16243a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizY);

    // 草地條紋
    const N = 24;
    for (let i = 0; i < N; i++) {
      const z0 = (i / N) * FIELD_DEPTH;
      const z1 = ((i + 1) / N) * FIELD_DEPTH;
      const p0 = proj(0, z0);
      const p1 = proj(0, z1);
      ctx.fillStyle = i % 2 === 0 ? '#2d7a3a' : '#268f35';
      ctx.fillRect(0, p1.y, W, p0.y - p1.y + 1);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;

    // 邊線
    line(proj(-FIELD_HW, 0), proj(-FIELD_HW, FIELD_DEPTH));
    line(proj(FIELD_HW, 0), proj(FIELD_HW, FIELD_DEPTH));

    // 中線
    const mz = FIELD_DEPTH / 2;
    line(proj(-FIELD_HW, mz), proj(FIELD_HW, mz));

    // 中圈
    const cc = proj(0, mz);
    ctx.beginPath();
    ctx.ellipse(cc.x, cc.y, 60 * cc.s, 35 * cc.s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 禁區
    const pw = GOAL_HW + 70, pz = FIELD_DEPTH - 160;
    polyLine([proj(-pw, pz), proj(-pw, FIELD_DEPTH), proj(pw, FIELD_DEPTH), proj(pw, pz)]);

    // 小禁區
    const sw = GOAL_HW + 20, sz = FIELD_DEPTH - 60;
    polyLine([proj(-sw, sz), proj(-sw, FIELD_DEPTH), proj(sw, FIELD_DEPTH), proj(sw, sz)]);
  }

  function line(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  function polyLine(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }

  // ─── 球門 ────────────────────────────────────────────────
  function drawGoal() {
    const pL = proj(-GOAL_HW, GOAL_Z);
    const pR = proj(GOAL_HW, GOAL_Z);
    const gh = 55 * pL.s;
    const lw = Math.max(3, 5 * pL.s);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(pL.x, pL.y); ctx.lineTo(pL.x, pL.y - gh);
    ctx.lineTo(pR.x, pR.y - gh); ctx.lineTo(pR.x, pR.y);
    ctx.stroke();

    // 網
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const nx = pL.x + (pR.x - pL.x) * t;
      ctx.beginPath(); ctx.moveTo(nx, pL.y); ctx.lineTo(nx, pL.y - gh); ctx.stroke();
    }
    for (let i = 1; i < 4; i++) {
      const ny = pL.y - gh * (i / 4);
      ctx.beginPath(); ctx.moveTo(pL.x, ny); ctx.lineTo(pR.x, ny); ctx.stroke();
    }
  }

  // ─── 防守員 ──────────────────────────────────────────────
  function drawDef(d) {
    const p = proj(d.x, d.z);
    const w = d.w * p.s, h = d.h * p.s;
    if (p.y < horizY - 10 || p.s < 0.05) return;

    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.5, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();

    const bx = p.x - w / 2, by = p.y - h;
    // 身體
    ctx.fillStyle = d.frozen > 0 ? '#90caf9' : d.fill;
    ctx.fillRect(bx, by + h * 0.25, w, h * 0.75);
    // 頭
    ctx.beginPath(); ctx.arc(p.x, by + h * 0.15, w * 0.35, 0, Math.PI * 2); ctx.fill();
    // 灼燒效果
    if (d.burning > 0) { ctx.fillStyle = 'rgba(255,80,0,0.35)'; ctx.fillRect(bx - 2, by, w + 4, h); }

    // 血條
    const bw = w * 1.2, bh = Math.max(3, 4 * p.s);
    const bxp = p.x - bw / 2, byp = by - bh - 2;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bxp, byp, bw, bh);
    const ratio = d.hp / d.maxHp;
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(bxp, byp, bw * ratio, bh);
  }

  // ─── 守門員 ──────────────────────────────────────────────
  function drawGK(gk) {
    const p = proj(gk.x, gk.z);
    const w = gk.w * p.s, h = gk.h * p.s;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, w * 0.5, h * 0.1, 0, 0, Math.PI * 2); ctx.fill();

    const bx = p.x - w / 2, by = p.y - h;
    ctx.fillStyle = '#c0ca33';
    ctx.fillRect(bx, by + h * 0.25, w, h * 0.75);
    ctx.beginPath(); ctx.arc(p.x, by + h * 0.15, w * 0.35, 0, Math.PI * 2); ctx.fill();

    // 手套
    ctx.fillStyle = '#ff8f00';
    const gloveW = Math.max(3, 5 * p.s), gloveH = Math.max(4, 8 * p.s);
    ctx.fillRect(bx - gloveW, by + h * 0.4, gloveW, gloveH);
    ctx.fillRect(bx + w, by + h * 0.4, gloveW, gloveH);
  }

  // ─── 足球 ────────────────────────────────────────────────
  function drawBall(b) {
    // 尾跡
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i], p = proj(t.x, t.z);
      const a = (i / b.trail.length) * 0.25;
      ctx.fillStyle = `rgba(255,200,0,${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y - b.r * p.s, b.r * p.s * 0.6, 0, Math.PI * 2); ctx.fill();
    }

    const p = proj(b.x, b.z), r = b.r * p.s;

    // 地面陰影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();

    // 球體
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 1.3, r * 0.1, p.x, p.y - r, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, '#bbb');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y - r, r, 0, Math.PI * 2); ctx.fill();

    // 五邊形花紋
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(p.x, p.y - r, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }

  // ─── 粒子 ────────────────────────────────────────────────
  function drawParticles() {
    for (const p of G.particles) {
      const pos = proj(p.x, p.z);
      const a = 1 - p.age / p.life;
      const fy = -(p.age / 1000) * 40;
      ctx.globalAlpha = a;
      ctx.font = `bold ${Math.max(12, 18 * pos.s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(p.text, pos.x, pos.y - 25 * pos.s + fy);
    }
    ctx.globalAlpha = 1;
  }

  // ─── HUD ─────────────────────────────────────────────────
  function drawHUD() {
    // 生命
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.globalAlpha = i < G.lives ? 1 : 0.25;
      ctx.fillText('❤️', 16 + i * 30, 32);
    }
    ctx.globalAlpha = 1;

    // 分數
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(20, W * 0.04)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`分數 ${G.score}`, W / 2, 28);

    // Wave
    ctx.textAlign = 'right';
    ctx.fillText(`Wave ${G.wave}`, W - 16, 28);

    // 已收集 buff
    if (G.collected.length) {
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      const uniq = [...new Set(G.collected)];
      uniq.forEach((id, i) => {
        const c = CARDS.find(x => x.id === id);
        if (c) ctx.fillText(c.icon, 16 + i * 22, 58);
      });
    }

    // 射門提示
    if (G.phase === 'playing' && G.canShoot) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.min(14, W * 0.03)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('點擊畫面射門 ⚽', W / 2, H - 16);
    }
  }

  // ─── 標題畫面 ────────────────────────────────────────────
  function drawTitle() {
    // 背景
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#0a1628');
    skyGrad.addColorStop(0.5, '#1a3a1a');
    skyGrad.addColorStop(1, '#2d7a3a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    // 標題
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(42, W * 0.08)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('⚽ 射門挑戰', W / 2, H * 0.25);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(18, W * 0.035)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('足球肉鴿生存遊戲', W / 2, H * 0.32);

    // 說明
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
    const rules = [
      '🎯 點擊畫面踢出足球，射進球門得分',
      '🛡️ 防守球員會向你逼近，踢球擊退他們',
      '🔴 防守員突破底線會失去生命（共 3 條）',
      '🃏 每次進球可選一張強化卡 Build 你的射門',
    ];
    rules.forEach((r, i) => ctx.fillText(r, W / 2, H * 0.42 + i * (Math.min(24, W * 0.045))));

    // 最高紀錄
    const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
    if (best.score) {
      ctx.fillStyle = 'rgba(255,215,0,0.6)';
      ctx.font = `${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(`🏆 最高紀錄：${best.score} 分（Wave ${best.wave}）`, W / 2, H * 0.68);
    }

    // 開始按鈕
    const btnW = Math.min(220, W * 0.45), btnH = 50;
    const btnX = W / 2 - btnW / 2, btnY = H * 0.75;
    G._startR = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = '#4caf50';
    rr(ctx, btnX, btnY, btnW, btnH, 14); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(20, W * 0.04)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('開始遊戲', W / 2, btnY + 33);
  }

  // ─── 選牌畫面 ────────────────────────────────────────────
  function drawCards() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(28, W * 0.05)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⚽ GOAL! 選擇一張強化卡', W / 2, H * 0.13);

    const cw = Math.min(170, W * 0.24);
    const ch = cw * 1.5;
    const gap = Math.min(20, W * 0.03);
    const total = G.cardPick.length * cw + (G.cardPick.length - 1) * gap;
    const sx = (W - total) / 2;
    const cy = (H - ch) / 2;

    G._cardR = [];

    const rarCol = { common:'#4a5568', rare:'#2563eb', epic:'#7c3aed', legendary:'#d97706' };
    const rarName = { common:'普通', rare:'稀有', epic:'史詩', legendary:'傳說' };

    G.cardPick.forEach((c, i) => {
      const cx = sx + i * (cw + gap);
      G._cardR.push({ x: cx, y: cy, w: cw, h: ch, idx: i });

      const bg = rarCol[c.rarity] || '#4a5568';

      // 光暈
      ctx.shadowColor = bg; ctx.shadowBlur = 18;
      ctx.fillStyle = bg;
      rr(ctx, cx, cy, cw, ch, 12); ctx.fill();
      ctx.shadowBlur = 0;

      // 內框
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(ctx, cx + 4, cy + 4, cw - 8, ch - 8, 10); ctx.fill();

      // 圖示
      ctx.font = `${cw * 0.28}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(c.icon, cx + cw / 2, cy + ch * 0.28);

      // 名稱
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(11, cw * 0.085)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(c.name, cx + cw / 2, cy + ch * 0.48);

      // 描述
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.max(9, cw * 0.07)}px "Noto Sans TC", sans-serif`;
      wrapCenter(ctx, c.desc, cx + cw / 2, cy + ch * 0.6, cw - 16, cw * 0.08);

      // 稀有度
      ctx.fillStyle = bg;
      ctx.font = `bold ${Math.max(9, cw * 0.06)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(rarName[c.rarity], cx + cw / 2, cy + ch - 14);
    });
  }

  // ─── 結算畫面 ────────────────────────────────────────────
  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#f44336';
    ctx.font = `bold ${Math.min(36, W * 0.07)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('🔴 終場哨響！', W / 2, H * 0.25);

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(24, W * 0.045)}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`最終分數：${G.score}`, W / 2, H * 0.36);
    ctx.fillText(`到達 Wave ${G.wave}`, W / 2, H * 0.43);

    if (G.collected.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(`收集了 ${G.collected.length} 張強化卡`, W / 2, H * 0.50);
    }

    const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
    if (best.score) {
      ctx.fillStyle = '#ffd700';
      ctx.font = `${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(`🏆 最高紀錄：${best.score} 分`, W / 2, H * 0.56);
    }

    // 按鈕
    const btnW = Math.min(200, W * 0.4), btnH = 46;
    const bx = W / 2 - btnW / 2;

    const y1 = H * 0.63;
    G._restartR = { x: bx, y: y1, w: btnW, h: btnH };
    ctx.fillStyle = '#4caf50';
    rr(ctx, bx, y1, btnW, btnH, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(17, W * 0.033)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('再來一局', W / 2, y1 + 30);

    const y2 = y1 + btnH + 14;
    G._closeR = { x: bx, y: y2, w: btnW, h: btnH };
    ctx.fillStyle = '#555';
    rr(ctx, bx, y2, btnW, btnH, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('返回網站', W / 2, y2 + 30);
  }

  // ─── 繪圖工具 ────────────────────────────────────────────
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function wrapCenter(ctx, text, x, y, maxW, lh) {
    // 簡易：若太長則拆兩行
    if (ctx.measureText(text).width <= maxW) {
      ctx.fillText(text, x, y);
    } else {
      const mid = Math.ceil(text.length / 2);
      ctx.fillText(text.slice(0, mid), x, y);
      ctx.fillText(text.slice(mid), x, y + lh);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  遊戲迴圈
  // ═══════════════════════════════════════════════════════════
  function loop(ts) {
    if (!G) return;
    const dt = Math.min(ts - prevTs, 50);
    prevTs = ts;
    update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  // ═══════════════════════════════════════════════════════════
  //  輸入
  // ═══════════════════════════════════════════════════════════
  function hitTest(x, y, r) { return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

  function onClick(e) {
    const rect = cvs.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (cvs.width / rect.width);
    const y = (e.clientY - rect.top) * (cvs.height / rect.height);

    if (G.phase === 'title') {
      if (hitTest(x, y, G._startR)) {
        G.phase = 'playing';
        beginWave();
      }
      return;
    }
    if (G.phase === 'playing') { shoot(x, y); return; }
    if (G.phase === 'cards') {
      for (const r of (G._cardR || [])) {
        if (hitTest(x, y, r)) { selectCard(r.idx); return; }
      }
      return;
    }
    if (G.phase === 'gameover') {
      if (hitTest(x, y, G._restartR)) { startGame(); return; }
      if (hitTest(x, y, G._closeR))   { closeGame(); return; }
    }
  }

  function onTouch(e) {
    e.preventDefault();
    const t = e.touches[0];
    onClick({ clientX: t.clientX, clientY: t.clientY });
  }

  // ═══════════════════════════════════════════════════════════
  //  Overlay 管理
  // ═══════════════════════════════════════════════════════════
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'rogue-overlay';
    overlay.innerHTML = '<canvas id="rogue-cvs"></canvas><button id="rogue-x" title="關閉">✕</button>';
    document.body.appendChild(overlay);

    cvs = document.getElementById('rogue-cvs');
    ctx = cvs.getContext('2d');
    document.getElementById('rogue-x').addEventListener('click', closeGame);
    cvs.addEventListener('click', onClick);
    cvs.addEventListener('touchstart', onTouch, { passive: false });

    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!cvs) return;
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width = W;
    cvs.height = H;
    horizY = H * 0.2;  // 更平坦的視角
  }

  function startGame() {
    if (!overlay) buildOverlay();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    G = freshState();
    prevTs = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function closeGame() {
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (rafId) cancelAnimationFrame(rafId);
    G = null;
  }

  // 公開 API
  window.startRogueGame = startGame;
})();
