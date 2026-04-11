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
  const BALL_SPD    = 4.5;   // 基礎球速（調慢，讓球可見）
  const MAX_BALL_SPD = 14;   // 球速上限
  const BALL_R      = 10;    // 基礎球半徑 (world)
  const BASE_DMG    = 1;
  const SHOOT_CD    = 900;   // 射門冷卻 ms（較長，靠卡牌縮短）
  const BALL_TTL    = 8000;  // 球最長存活 ms
  const GK_BASE_SPD = 1.2;

  // ═══════════════════════════════════════════════════════════
  //  卡牌
  // ═══════════════════════════════════════════════════════════
  // 稀有度權重：common 出現最多，legendary 最少
  const RARITY_WEIGHT = { common: 50, rare: 25, epic: 10, legendary: 3 };

  const CARDS = [
    // ── 基礎數值卡 (common) ─────────────────
    { id:'dmg20',    name:'射門強化',   desc:'傷害 +20%',                rarity:'common',    apply(s){ s.dmgMul *= 1.2; }},
    { id:'dmg30',    name:'力量訓練',   desc:'傷害 +30%',                rarity:'common',    apply(s){ s.dmgMul *= 1.3; }},
    { id:'spd20',    name:'速度鞋',     desc:'球速 +20%',                rarity:'common',    apply(s){ s.spdMul *= 1.2; }},
    { id:'spd40',    name:'閃電射門',   desc:'球速 +40%',                rarity:'common',    apply(s){ s.spdMul *= 1.4; }},
    { id:'bigball',  name:'大力丸',     desc:'球體+20%（增大也提升傷害，上限3倍）', rarity:'common', apply(s){ s.ballScale = Math.min(3, s.ballScale * 1.2); }},
    { id:'bigball2', name:'巨型足球',   desc:'球體+40%（增大也提升傷害，上限3倍）', rarity:'common', apply(s){ s.ballScale = Math.min(3, s.ballScale * 1.4); }},
    { id:'rapid',    name:'快速連射',   desc:'射門冷卻 -30%',            rarity:'common',    apply(s){ s.cdMul *= 0.7; }},
    { id:'rapid2',   name:'輕量化',     desc:'射門冷卻 -20%',            rarity:'common',    apply(s){ s.cdMul *= 0.8; }},
    { id:'multi1',   name:'雙重射擊',   desc:'連續射球數量 +1',          rarity:'common',    apply(s){ s.multiShot += 1; }},
    { id:'ironleg',  name:'鐵腿',       desc:'傷害 +50%，球速 -15%',     rarity:'common',    apply(s){ s.dmgMul *= 1.5; s.spdMul *= 0.85; }},
    { id:'magnet',   name:'磁力門框',   desc:'球門判定寬度 +20%',        rarity:'common',    apply(s){ s.goalBonus = (s.goalBonus||0) + 0.2; }},

    // ── 能力卡 (rare) ──────────────────────
    { id:'burn',     name:'火焰射擊',   desc:'命中附帶灼燒（每秒 1 傷害）', rarity:'rare',  apply(s){ s.burn = true; }},
    { id:'freeze',   name:'冰凍射擊',   desc:'命中後敵人減速 50%',       rarity:'rare',    apply(s){ s.freeze = true; }},
    { id:'explode',  name:'爆裂射擊',   desc:'命中時爆炸傷害周圍',       rarity:'rare',    apply(s){ s.explode = true; }},
    { id:'sniper',   name:'狙擊射門',   desc:'傷害 ×2.5，球變小',        rarity:'rare',    apply(s){ s.dmgMul *= 2.5; s.ballScale *= 0.65; }},
    { id:'multi2',   name:'三重射擊',   desc:'連續射球數量 +2',          rarity:'rare',     apply(s){ s.multiShot += 2; }},
    { id:'bounce',   name:'反彈射擊',   desc:'球碰敵人後反彈+1次（上限4）', rarity:'rare', apply(s){ s.bounce = Math.min(4, (s.bounce||0) + 1); }},
    { id:'crit',     name:'致命一擊',   desc:'每次射門 20% 機率暴擊 ×3', rarity:'rare',     apply(s){ s.critPct = Math.min(0.6, (s.critPct||0) + 0.2); }},
    { id:'gkSlow',   name:'守門員削弱', desc:'守門員移速 -30%',          rarity:'rare',     apply(s){ s.gkSlowMul = (s.gkSlowMul||1) * 0.7; }},
    { id:'extraLife', name:'鋼鐵防線', desc:'+1 條命（上限 5）',         rarity:'rare',    apply(s){ if(s.lives < 5) s.lives++; }},
    { id:'guard',    name:'後衛守衛',   desc:'召喚一個守衛，敵人靠近時阻擋 5 秒', rarity:'rare', apply(s){ s._spawnGuard = (s._spawnGuard||0) + 1; }},

    // ── 進階卡 (epic) ──────────────────────
    { id:'power2',   name:'重砲射擊',   desc:'傷害 ×2',                  rarity:'epic',     apply(s){ s.dmgMul *= 2; }},
    { id:'split',    name:'分裂射擊',   desc:'命中敵人後分裂成 2 顆小球', rarity:'epic',     apply(s){ s.split = true; }},
    { id:'timeSlow', name:'時間壓迫',   desc:'敵人全體速度永久 -20%',    rarity:'epic',     apply(s){ s.globalSlow = (s.globalSlow||1) * 0.8; }},

    // ── 傳說卡 (legendary) ─────────────────
    { id:'ghost',    name:'幽靈球',     desc:'+10% 機率穿過敵人（上限30%）', rarity:'legendary', apply(s){ s.ghostPct = Math.min(0.3, (s.ghostPct||0) + 0.1); }},
    { id:'vampire',  name:'吸血足球',   desc:'擊殺敵人回復 1 條命',      rarity:'legendary', apply(s){ s.vampire = true; }},
  ];

  // ═══════════════════════════════════════════════════════════
  //  防守員類型
  // ═══════════════════════════════════════════════════════════
  const DTYPE = {
    normal:  { label:'防守員',   fill:'#4fc3f7', hp:3,  spd:0.30, w:44, h:62 },
    fast:    { label:'快速前鋒', fill:'#fff176', hp:1,  spd:0.42, w:38, h:54 },
    tank:    { label:'中後衛',   fill:'#ef5350', hp:8,  spd:0.18, w:56, h:72 },
    captain: { label:'攔截者',   fill:'#ce93d8', hp:5,  spd:0.12, w:50, h:66, tracker:true },
    sentry:  { label:'中路守衛', fill:'#81d4fa', hp:4,  spd:0.12, w:48, h:64 },
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
      pierce: false, burn: false, freeze: false,
      explode: false, ghostPct: 0, vampire: false,
      bounce: 0, split: false,
      critPct: 0, goalBonus: 0, gkSlowMul: 1, globalSlow: 1,
      _spawnGuard: 0,
      collected: [],            // card ids

      // entities
      balls: [],
      defs: [],
      allies: [],               // guard allies
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
    const count = Math.min(3 + w, 16);
    const types = ['normal'];
    if (w >= 1) types.push('sentry');  // 每波都有中路守衛擋住直射
    if (w >= 2) types.push('fast');
    if (w >= 3) { types.push('tank'); types.push('captain'); }
    // 確保至少 1~2 個 sentry 擋中路
    const sentryCount = Math.min(1 + Math.floor(w / 2), 4);
    // 保底紫色攔截者數量（wave3 起）
    const captainCount = w >= 3 ? Math.min(1 + Math.floor((w - 2) / 2), 3) : 0;
    // 血量成長（緩和）
    const hpMul  = Math.pow(1.20, w - 1);        // wave3=1.44x, wave5=2.07x, wave8=3.58x, wave10=5.16x
    const spdMul = 1 + (w - 1) * 0.12;           // wave1=1x, wave5=1.48x, wave10=2.08x
    return { count, types, hpMul, spdMul, sentryCount, captainCount };
  }

  function makeDef(type, hpMul, spdMul) {
    const d = DTYPE[type];
    const hp = Math.ceil(d.hp * hpMul);
    // 中路守衛均勻分佈覆蓋球門全寬（由 beginWave 傳入 sentryIdx/sentryTotal）
    const isSentry = type === 'sentry';
    let startX;
    if (isSentry && arguments[3] !== undefined) {
      // 均勻分佈在球門寬度內
      const idx = arguments[3], total = arguments[4];
      startX = -GOAL_HW + (GOAL_HW * 2) * ((idx + 0.5) / total);
    } else if (isSentry) {
      startX = (Math.random() - 0.5) * GOAL_HW * 2;
    } else {
      startX = (Math.random() - 0.5) * FIELD_HW * 0.9;  // 可視範圍內生成
    }
    const startZ = isSentry
      ? FIELD_DEPTH * (0.65 + Math.random() * 0.2)
      : FIELD_DEPTH * (0.5 + Math.random() * 0.4);
    // 斜向移動速度（x 軸）— 非守衛的敵人大幅度斜走
    let vx = 0;
    if (!isSentry) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      vx = dir * (0.3 + Math.random() * 0.5) * d.spd * spdMul;  // 明顯的斜向移動
    }
    return {
      type, x: startX, z: startZ, vx,
      hp, maxHp: hp,
      spd: d.spd * spdMul, w: d.w, h: d.h, fill: d.fill,
      frozen: 0, burning: 0, burnTick: 0,
    };
  }

  function beginWave() {
    const cfg = waveConfig(G.wave);
    G.spawnQueue = [];
    // 先放保底的中路守衛（均勻分佈覆蓋球門全寬）
    for (let i = 0; i < cfg.sentryCount; i++) {
      G.spawnQueue.push(makeDef('sentry', cfg.hpMul, cfg.spdMul, i, cfg.sentryCount));
    }
    // 保底紫色攔截者
    for (let i = 0; i < cfg.captainCount; i++) {
      G.spawnQueue.push(makeDef('captain', cfg.hpMul, cfg.spdMul));
    }
    // 其餘隨機類型
    const rest = cfg.count - cfg.sentryCount - cfg.captainCount;
    for (let i = 0; i < rest; i++) {
      const nonFixed = cfg.types.filter(t => t !== 'sentry' && t !== 'captain');
      const t = nonFixed[Math.floor(Math.random() * nonFixed.length)];
      G.spawnQueue.push(makeDef(t, cfg.hpMul, cfg.spdMul));
    }
    // 立刻放一半，其餘排隊
    const immediate = Math.ceil(G.spawnQueue.length / 2);
    for (let i = 0; i < immediate; i++) G.defs.push(G.spawnQueue.shift());
    G.spawnTimer = 1500;

    waveFlash = 1800;
    // 守門員速度：每 5 波才提升一次
    const gkTier = Math.floor(G.wave / 5); // wave5=1, wave10=2, wave15=3...
    G.gk.spd = (GK_BASE_SPD + gkTier * 1.0) * (G.gkSlowMul || 1);
    G.gk.tracking = G.wave >= 5; // wave5 起才追蹤球

    // 每 5 波警告
    if (G.wave >= 5 && G.wave % 5 === 0) {
      G._warning = { timer: 3000, tier: gkTier };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  射門
  // ═══════════════════════════════════════════════════════════
  // 螢幕座標 → 世界座標（反投影）
  function unproj(sx, sy) {
    // proj: s = FOCAL/(FOCAL+z), screenX = W/2 + wx*s, screenY = horizY + (H-horizY)*s
    // 反推：s = (sy - horizY) / (H - horizY), z = FOCAL/s - FOCAL, wx = (sx - W/2) / s
    const s = Math.max(0.05, (sy - horizY) / (H - horizY));
    const wz = FOCAL / s - FOCAL;
    const wx = (sx - W / 2) / s;
    return { x: wx, z: Math.max(10, wz) };
  }

  function shoot(cx, cy) {
    if (!G.canShoot || G.phase !== 'playing') return;

    // 反投影點擊位置到世界座標，計算射球方向
    const target = unproj(cx, cy);
    const dx = target.x - 0;    // 球起始 x=0
    const dz = target.z - 10;   // 球起始 z=10
    const len = Math.sqrt(dx * dx + dz * dz) || 1;

    // 實際球速（有上限）
    const spd = Math.min(BALL_SPD * G.spdMul, MAX_BALL_SPD);

    const vx = (dx / len) * spd;
    const vz = Math.max((dz / len) * spd, spd * 0.3);
    const n = G.multiShot;
    for (let i = 0; i < n; i++) {
      const delay = i * 120; // 每顆間隔 120ms
      setTimeout(() => {
        if (!G || G.phase !== 'playing') return;
        const b = {
          x: 0, z: 10,
          vx, vz,
          r: BALL_R * G.ballScale,
          alive: true, age: 0, trail: [],
        };
        G.balls.push(b);
      }, delay);
    }
    G.canShoot = false;
    G.shootCD = SHOOT_CD * G.cdMul + (n - 1) * 120; // 冷卻包含連射時間
  }

  // ═══════════════════════════════════════════════════════════
  //  粒子
  // ═══════════════════════════════════════════════════════════
  function addPart(x, z, text, dur, type) {
    G.particles.push({ x, z, text, age: 0, life: dur * 1000, type: type || 'text' });
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
    // warning timer
    if (G._warning && G._warning.timer > 0) G._warning.timer -= dt;

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
    const gkEffSpd = gk.spd * (G.globalSlow || 1);
    if (gk.tracking) {
      // 找最具威脅的球：預判球到達球門線時的 x 位置
      let targetX = null, bestThreat = -Infinity;
      for (const b of G.balls) {
        if (!b.alive || b.vz <= 0) continue; // 只追正在飛向球門的球
        // 預測球到球門 z 時的 x 位置（考慮牆壁反彈）
        const timeToGoal = (GOAL_Z - b.z) / b.vz; // frames
        let predictX = b.x + b.vx * timeToGoal;
        // 簡易牆壁反彈預測
        while (predictX < -FIELD_HW || predictX > FIELD_HW) {
          if (predictX < -FIELD_HW) predictX = -2 * FIELD_HW - predictX;
          if (predictX > FIELD_HW) predictX = 2 * FIELD_HW - predictX;
        }
        // 威脅度 = z 越高越危險
        const threat = b.z;
        if (threat > bestThreat) { bestThreat = threat; targetX = predictX; }
      }
      // 也追蹤反彈球（vz < 0 但仍在場上且離球門近）
      if (targetX === null) {
        for (const b of G.balls) {
          if (!b.alive) continue;
          if (b.z > FIELD_DEPTH * 0.4) {
            const threat = b.z;
            if (threat > bestThreat) { bestThreat = threat; targetX = b.x; }
          }
        }
      }
      if (targetX !== null) {
        const diff = targetX - gk.x;
        if (Math.abs(diff) > 2) gk.x += Math.sign(diff) * gkEffSpd * (dt / 16);
      } else {
        gk.x += gk.dir * gkEffSpd * (dt / 16);
      }
    } else {
      // wave1~4：左右巡邏
      gk.x += gk.dir * gkEffSpd * (dt / 16);
    }
    if (gk.x > GOAL_HW - gk.w / 2) { gk.x = GOAL_HW - gk.w / 2; gk.dir = -1; }
    if (gk.x < -GOAL_HW + gk.w / 2) { gk.x = -GOAL_HW + gk.w / 2; gk.dir = 1; }

    // ── 足球更新 ──
    for (const b of G.balls) {
      if (!b.alive) continue;
      b.age += dt;

      b.trail.push({ x: b.x, z: b.z });
      if (b.trail.length > 8) b.trail.shift();

      const step = dt / 16;

      b.x += b.vx * step;
      b.z += b.vz * step;

      // 牆壁反彈
      if (b.x < -FIELD_HW + b.r) { b.x = -FIELD_HW + b.r; b.vx = Math.abs(b.vx); }
      if (b.x > FIELD_HW - b.r)  { b.x = FIELD_HW - b.r;  b.vx = -Math.abs(b.vx); }

      // 碰防守員
      let hitDef = false;
      for (const d of G.defs) {
        if (d.hp <= 0) continue;
        if (Math.abs(b.x - d.x) < b.r + d.w * 0.4 && Math.abs(b.z - d.z) < d.h * 0.5) {
          // ghost 穿過
          if (G.ghostPct > 0 && Math.random() < G.ghostPct) { addPart(d.x, d.z, '', 0.6, 'ghost'); continue; }
          // 傷害 = 基礎 × 倍率 × 球大小 × 暴擊
          let dmg = Math.ceil(BASE_DMG * G.dmgMul * G.ballScale);
          const isCrit = G.critPct > 0 && Math.random() < G.critPct;
          if (isCrit) { dmg *= 3; addPart(d.x, d.z - 20, 'CRIT!', 0.7, 'crit'); }
          // 反彈球傷害減半
          if (b._bounced) dmg = Math.max(1, Math.ceil(dmg * 0.5));
          // 分裂小球傷害減半
          if (b._split) dmg = Math.max(1, Math.ceil(dmg * 0.5));
          d.hp -= dmg;
          addPart(d.x, d.z, isCrit ? `-${dmg}!` : `-${dmg}`, 0.5);
          if (G.burn)   d.burning = 3000;
          if (G.freeze) d.frozen  = 3000;
          if (G.explode) explodeAOE(d, dmg);
          if (d.hp <= 0) onDefKill(d);
          // 分裂：命中時產生 2 顆小球繼續飛
          if (G.split && !b._split) {
            for (let si = 0; si < 2; si++) {
              const angle = (si === 0 ? -0.4 : 0.4);
              const cos = Math.cos(angle), sin = Math.sin(angle);
              const spd = Math.sqrt(b.vx * b.vx + b.vz * b.vz) * 0.8;
              const nvx = cos * b.vx - sin * b.vz;
              const nvz = sin * b.vx + cos * b.vz;
              const len = Math.sqrt(nvx * nvx + nvz * nvz) || 1;
              G.balls.push({
                x: b.x, z: b.z, vx: (nvx / len) * spd, vz: (nvz / len) * spd,
                r: b.r * 0.7, alive: true, age: 0, trail: [], _split: true,
              });
            }
          }
          // 反彈：球反向繼續飛（可多次反彈）
          const maxBounce = G.bounce || 0;
          const curBounce = b._bounceCount || 0;
          if (maxBounce > 0 && curBounce < maxBounce) {
            b.vz = -b.vz * 0.7;
            b.vx += (Math.random() - 0.5) * 2;
            b._bounceCount = curBounce + 1;
            b._bounced = true;
            hitDef = false; // 不消滅球
          } else if (!G.pierce) {
            b.alive = false; hitDef = true;
          }
          break;
        }
      }
      if (hitDef) continue;

      // 碰守門員
      if (b.z > gk.z - 20 && b.z < gk.z + 20 && Math.abs(b.x - gk.x) < gk.w * 0.55) {
        b.alive = false;
        addPart(gk.x, gk.z, '', 0.8, 'block');
        shakeAmt = 4;
        continue;
      }

      // 進球判定（同一波只算一次）
      if (b.z >= GOAL_Z) {
        b.alive = false;
        const effectiveGoalHW = GOAL_HW * (1 + (G.goalBonus || 0));
        if (Math.abs(b.x) < effectiveGoalHW && G.phase === 'playing') { onGoal(); return; }
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
        if (d.burnTick <= 0) { d.hp -= 1; d.burnTick = 1000; addPart(d.x, d.z, '', 0.3, 'flame'); if (d.hp <= 0) onDefKill(d); }
      }
      // 被守衛抱住時完全無法移動
      if (d._grabbed) continue;
      // 前進 + 斜向移動（速度上限 0.8）
      const rawSp = (d.frozen > 0 ? d.spd * 0.5 : d.spd) * (G.globalSlow || 1);
      const sp = Math.min(rawSp, 0.8);
      if (d.frozen > 0) d.frozen -= dt;
      const step = dt / 16;
      d.z -= sp * step;
      d.x += (d.vx || 0) * (G.globalSlow || 1) * step;
      // 越靠近主角，越往中間收攏（模擬包夾）— 很早就開始
      const closeness = 1 - Math.max(0, d.z) / FIELD_DEPTH; // 0=球門端, 1=玩家端
      if (closeness > 0.4) {
        const pullStrength = (closeness - 0.4) * 0.2;
        d.x += (d.x > 0 ? -pullStrength : pullStrength) * step;
      }
      // 碰牆反彈 x 方向（限制在可視範圍內）
      const xBound = FIELD_HW * 0.85;
      if (d.x < -xBound + d.w) { d.x = -xBound + d.w; d.vx = Math.abs(d.vx || 0); }
      if (d.x > xBound - d.w)  { d.x = xBound - d.w;  d.vx = -Math.abs(d.vx || 0); }
      // 攔截者：球在 z 軸接近時才高速 x 軸追蹤（鏟球感）
      if (DTYPE[d.type]?.tracker) {
        let nearBall = null, nbd = Infinity;
        for (const b of G.balls) {
          if (!b.alive) continue;
          const dist = Math.abs(b.z - d.z);
          if (dist < nbd) { nbd = dist; nearBall = b; }
        }
        if (nearBall) {
          const zDist = Math.abs(nearBall.z - d.z);
          const zRange = 300; // 球在 z 軸 300 以內才開始反應
          if (zDist < zRange) {
            const xDist = Math.abs(nearBall.x - d.x);
            // z 越近追蹤越快：遠處慢慢移動，近處瘋狂鏟球
            const zUrgency = 1 - zDist / zRange; // 0（剛進範圍）~1（同一z軸）
            const xProximity = Math.max(0, 1 - xDist / 400);
            const trackSpd = (0.5 + zUrgency * 4.0 + xProximity * 2.5) * (G.globalSlow || 1);
            if (nearBall.x > d.x + 3) d.x += trackSpd * step;
            else if (nearBall.x < d.x - 3) d.x -= trackSpd * step;
          }
        }
      }
      // 突破底線
      if (d.z <= 0) {
        G.lives--;
        d.hp = 0;
        shakeAmt = 12;
        addPart(d.x, 30, '', 1.2, 'breach');
        if (G.lives <= 0) { G.phase = 'gameover'; G._gameoverStart = performance.now(); saveResult(); return; }
      }
    }
    G.defs = G.defs.filter(d => d.hp > 0);

    // ── 守衛盟友（抱住敵人機制） ──
    const SAFETY_Z = FIELD_DEPTH * 0.3;
    // 收集已被守衛鎖定的敵人，確保多個守衛不會搶同一個
    const grabbedDefs = new Set();
    for (const a of G.allies) {
      if (a._target && a._target.hp > 0) grabbedDefs.add(a._target);
    }
    for (const a of G.allies) {
      if (a.grabbing) {
        // 抱住中：倒計時，敵人完全無法移動（位置鎖定在守衛身上）
        a.blockTimer -= dt;
        if (a.blockTimer <= 0 || !a._target || a._target.hp <= 0) {
          if (a._target) a._target._grabbed = false;
          a.alive = false; continue;
        }
        // 守衛貼在敵人身上
        a.x = a._target.x;
        a.z = a._target.z;
        // 敵人完全停住
        a._target._grabbed = true;
      } else {
        // 尚未抱住：尋找越過安全線的敵人
        let nearest = null, lowestZ = Infinity;
        for (const d of G.defs) {
          if (d.hp <= 0 || d._grabbed || grabbedDefs.has(d)) continue;
          if (d.z < SAFETY_Z && d.z < lowestZ) { lowestZ = d.z; nearest = d; }
        }
        if (nearest) {
          a._target = nearest;
          grabbedDefs.add(nearest); // 立刻標記，防止同幀其他守衛搶
          const dx = nearest.x - a.x, dz = nearest.z - a.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const rushSpd = 2.5;
          a.x += (dx / len) * rushSpd * (dt / 16);
          a.z += (dz / len) * rushSpd * (dt / 16);
          // 接觸 → 抱住
          if (len < 45) {
            a.grabbing = true;
            a.blockTimer = 5000;
            nearest._grabbed = true;
          }
        }
      }
    }
    G.allies = G.allies.filter(a => a.alive);

    // ── 粒子 ──
    for (const p of G.particles) p.age += dt;
    G.particles = G.particles.filter(p => p.age < p.life);
  }

  function explodeAOE(src, dmg) {
    for (const d of G.defs) {
      if (d === src || d.hp <= 0) continue;
      if (Math.sqrt((d.x - src.x) ** 2 + (d.z - src.z) ** 2) < 80) {
        d.hp -= Math.ceil(dmg * 0.5);
        addPart(d.x, d.z, '', 0.4, 'explode');
        if (d.hp <= 0) onDefKill(d);
      }
    }
  }

  function onDefKill(d) {
    G.score += 10;
    addPart(d.x, d.z, '', 0.7, 'kill');
    const maxLives = Math.max(MAX_LIVES, G.lives); // extraLife 可能超過初始上限
    if (G.vampire && G.lives < maxLives) { G.lives++; addPart(d.x, d.z, '', 0.9, 'heal'); }
  }

  function onGoal() {
    G.score += 100;
    G.defs = [];
    G.spawnQueue = [];
    G.balls = [];          // 清除場上所有球
    shakeAmt = 10;
    addPart(0, GOAL_Z - 50, 'GOAL!', 1.5, 'goal');
    G.phase = 'cards';
    G.cardPick = pickCards(3);
    G._cardRevealStart = performance.now(); // 卡片逐張進場計時
  }

  // 可無限疊加的純數值卡
  const STACKABLE = new Set(['dmg20','dmg30','spd20','spd40','bigball','bigball2','rapid','rapid2','multi1','multi2','power2','ironleg','magnet','crit','bounce','guard']);
  // 有次數上限的疊加卡
  const STACK_LIMIT = { ghost: 3 };

  function pickCards(n) {
    // 過濾卡池：純數值無限疊、ghost 限 3 次、其餘能力卡選過就移除
    const pool = CARDS.filter(c => {
      if (STACKABLE.has(c.id)) return true;
      if (STACK_LIMIT[c.id]) {
        const count = G.collected.filter(id => id === c.id).length;
        return count < STACK_LIMIT[c.id];
      }
      return !G.collected.includes(c.id);
    });

    // 依稀有度權重抽卡，不重複
    const weighted = [];
    for (const c of pool) {
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
    // 守衛卡：生成盟友（每張卡+1個）
    while (G._spawnGuard > 0) {
      G._spawnGuard--;
      G.allies.push({
        x: (Math.random() - 0.5) * FIELD_HW * 0.6,
        z: FIELD_DEPTH * 0.15,
        alive: true, grabbing: false, blockTimer: 5000,
      });
    }
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
    // 清除畫布（防殘影）— 用實際像素大小清除
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.restore();

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
    G.allies.forEach(a => { if (a.alive) ents.push({ k: 'a', o: a, z: a.z }); });
    ents.sort((a, b) => b.z - a.z);
    for (const e of ents) {
      if (e.k === 'd')  drawDef(e.o);
      if (e.k === 'gk') drawGK(e.o);
      if (e.k === 'b')  drawBall(e.o);
      if (e.k === 'a')  drawAlly(e.o);
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

    // 每 5 波警告
    if (G._warning && G._warning.timer > 0) {
      const wt = G._warning.timer;
      const wa = Math.min(1, wt / 800);
      ctx.globalAlpha = wa;
      // 紅色閃爍背景條
      const flash = Math.sin(Date.now() * 0.008) * 0.15 + 0.25;
      ctx.fillStyle = `rgba(255,0,0,${flash})`;
      ctx.fillRect(0, H * 0.44, W, H * 0.18);
      // 警告圖示與文字
      ctx.fillStyle = '#ff1744';
      ctx.font = `bold ${Math.min(36, W * 0.065)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('WARNING', W / 2, H * 0.50);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(18, W * 0.035)}px "Noto Sans TC", sans-serif`;
      const tier = G._warning.tier;
      const msgs = [
        '守門員覺醒！開始自動追蹤球路',
        '守門員強化！移動速度大幅提升',
        '守門員狂暴！反應速度接近極限',
        '守門員究極體！幾乎無法突破',
        '守門員超越極限！已進入神域',
        '守門員異次元反應！球路無所遁形',
        '守門員時間靜止！射門窗口趨近於零',
        '守門員已成神！你確定要繼續嗎？',
        '傳說守門員降臨！放棄抵抗吧',
        '守門員：「你的射門...我全都看得見」',
      ];
      const msg = msgs[Math.min(tier - 1, msgs.length - 1)];
      ctx.fillText(msg, W / 2, H * 0.56);
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
  // 顏色工具：變亮/變暗
  function shadeColor(hex, amt) {
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    r = Math.min(255, Math.max(0, r + amt));
    g = Math.min(255, Math.max(0, g + amt));
    b = Math.min(255, Math.max(0, b + amt));
    return `rgb(${r},${g},${b})`;
  }

  function drawDef(d) {
    const p = proj(d.x, d.z);
    const w = d.w * p.s, h = d.h * p.s;
    if (p.y < horizY - 10 || p.s < 0.05) return;

    const baseColor = d.frozen > 0 ? '#90caf9' : d.fill;
    const darkSide = shadeColor(baseColor, -50);
    const highlight = shadeColor(baseColor, 40);
    const bx = p.x - w / 2, by = p.y - h;

    // 地面陰影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, w * 0.55, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    // ── 雙腿 ──
    const legW = w * 0.22, legH = h * 0.32;
    const legY = p.y - legH;
    // 左腿（暗面）
    ctx.fillStyle = darkSide;
    rr(ctx, p.x - w * 0.28, legY, legW, legH, legW * 0.3); ctx.fill();
    // 右腿（亮面）
    ctx.fillStyle = baseColor;
    rr(ctx, p.x + w * 0.08, legY, legW, legH, legW * 0.3); ctx.fill();

    // ── 身體（主體圓角矩形 + 側面厚度） ──
    const bodyY = by + h * 0.28, bodyH = h * 0.42;
    // 暗面（右側厚度感）
    ctx.fillStyle = darkSide;
    rr(ctx, bx + w * 0.08, bodyY + 2, w * 0.88, bodyH, w * 0.15); ctx.fill();
    // 主體正面
    const bodyGrad = ctx.createLinearGradient(bx, bodyY, bx + w, bodyY);
    bodyGrad.addColorStop(0, highlight);
    bodyGrad.addColorStop(0.4, baseColor);
    bodyGrad.addColorStop(1, darkSide);
    ctx.fillStyle = bodyGrad;
    rr(ctx, bx, bodyY, w * 0.92, bodyH, w * 0.15); ctx.fill();

    // 球衣號碼線條（裝飾）
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = Math.max(1, 1.5 * p.s);
    const midY = bodyY + bodyH * 0.5;
    ctx.beginPath(); ctx.moveTo(p.x - w * 0.15, midY - bodyH * 0.15);
    ctx.lineTo(p.x + w * 0.05, midY + bodyH * 0.15); ctx.stroke();

    // ── 雙肩（圓形，增加厚度感） ──
    const shoulderR = w * 0.18;
    ctx.fillStyle = baseColor;
    ctx.beginPath(); ctx.arc(bx + shoulderR * 0.6, bodyY + shoulderR * 0.5, shoulderR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = darkSide;
    ctx.beginPath(); ctx.arc(bx + w * 0.92 - shoulderR * 0.6, bodyY + shoulderR * 0.5, shoulderR * 0.9, 0, Math.PI * 2); ctx.fill();

    // ── 頭部（球形漸層） ──
    const headR = w * 0.32;
    const headY = by + h * 0.18;
    const headGrad = ctx.createRadialGradient(p.x - headR * 0.3, headY - headR * 0.3, headR * 0.1, p.x, headY, headR);
    headGrad.addColorStop(0, highlight);
    headGrad.addColorStop(1, darkSide);
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(p.x, headY, headR, 0, Math.PI * 2); ctx.fill();

    // 灼燒效果
    if (d.burning > 0) {
      ctx.fillStyle = 'rgba(255,80,0,0.25)';
      rr(ctx, bx - 2, by, w + 4, h, w * 0.1); ctx.fill();
    }

    // ── 血條 ──
    const bw = w * 1.2, bh = Math.max(3, 4 * p.s);
    const bxp = p.x - bw / 2, byp = by - bh - 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rr(ctx, bxp, byp, bw, bh, 2); ctx.fill();
    const ratio = d.hp / d.maxHp;
    ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
    rr(ctx, bxp, byp, bw * ratio, bh, 2); ctx.fill();
  }

  // ─── 守門員（3D 風格） ─────────────────────────────────────
  function drawGK(gk) {
    const p = proj(gk.x, gk.z);
    const w = gk.w * p.s, h = gk.h * p.s;
    const bx = p.x - w / 2, by = p.y - h;
    const baseColor = '#c0ca33';

    // 地面陰影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, w * 0.55, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    // 雙腿
    const legW = w * 0.22, legH = h * 0.3;
    ctx.fillStyle = shadeColor(baseColor, -40);
    rr(ctx, p.x - w * 0.28, p.y - legH, legW, legH, legW * 0.3); ctx.fill();
    ctx.fillStyle = baseColor;
    rr(ctx, p.x + w * 0.08, p.y - legH, legW, legH, legW * 0.3); ctx.fill();

    // 身體
    const bodyY = by + h * 0.28, bodyH = h * 0.42;
    const gkGrad = ctx.createLinearGradient(bx, bodyY, bx + w, bodyY);
    gkGrad.addColorStop(0, shadeColor(baseColor, 40));
    gkGrad.addColorStop(0.4, baseColor);
    gkGrad.addColorStop(1, shadeColor(baseColor, -50));
    ctx.fillStyle = gkGrad;
    rr(ctx, bx, bodyY, w * 0.92, bodyH, w * 0.15); ctx.fill();

    // 肩膀
    const sr = w * 0.18;
    ctx.fillStyle = baseColor;
    ctx.beginPath(); ctx.arc(bx + sr * 0.6, bodyY + sr * 0.5, sr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shadeColor(baseColor, -50);
    ctx.beginPath(); ctx.arc(bx + w * 0.92 - sr * 0.6, bodyY + sr * 0.5, sr * 0.9, 0, Math.PI * 2); ctx.fill();

    // 手套（伸展）
    ctx.fillStyle = '#ff8f00';
    const gloveR = Math.max(4, w * 0.16);
    ctx.beginPath(); ctx.arc(bx - gloveR * 0.3, bodyY + bodyH * 0.3, gloveR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shadeColor('#ff8f00', -30);
    ctx.beginPath(); ctx.arc(bx + w * 0.92 + gloveR * 0.3, bodyY + bodyH * 0.3, gloveR * 0.9, 0, Math.PI * 2); ctx.fill();

    // 頭部
    const headR = w * 0.32;
    const headY = by + h * 0.18;
    const hGrad = ctx.createRadialGradient(p.x - headR * 0.3, headY - headR * 0.3, headR * 0.1, p.x, headY, headR);
    hGrad.addColorStop(0, shadeColor(baseColor, 50));
    hGrad.addColorStop(1, shadeColor(baseColor, -40));
    ctx.fillStyle = hGrad;
    ctx.beginPath(); ctx.arc(p.x, headY, headR, 0, Math.PI * 2); ctx.fill();
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

  // ─── 守衛盟友 ──────────────────────────────────────────────
  function drawAlly(a) {
    const p = proj(a.x, a.z);
    const w = 42 * p.s, h = 60 * p.s;
    if (p.y < horizY - 10 || p.s < 0.05) return;

    const remaining = a.grabbing ? Math.max(0, a.blockTimer / 5000) : 1;
    ctx.globalAlpha = a.grabbing ? Math.min(1, remaining * 2) : 1;

    const baseColor = '#43a047';
    const darkSide = shadeColor(baseColor, -45);
    const highlight = shadeColor(baseColor, 50);
    const bx = p.x - w / 2, by = p.y - h;

    // 地面陰影
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, w * 0.55, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    // ── 雙腿 ──
    const legW = w * 0.22, legH = h * 0.32;
    const legY = p.y - legH;
    ctx.fillStyle = darkSide;
    rr(ctx, p.x - w * 0.28, legY, legW, legH, legW * 0.3); ctx.fill();
    ctx.fillStyle = baseColor;
    rr(ctx, p.x + w * 0.08, legY, legW, legH, legW * 0.3); ctx.fill();

    // ── 身體（漸層厚度） ──
    const bodyY = by + h * 0.28, bodyH = h * 0.42;
    ctx.fillStyle = darkSide;
    rr(ctx, bx + w * 0.08, bodyY + 2, w * 0.88, bodyH, w * 0.15); ctx.fill();
    const bodyGrad = ctx.createLinearGradient(bx, bodyY, bx + w, bodyY);
    bodyGrad.addColorStop(0, highlight);
    bodyGrad.addColorStop(0.4, baseColor);
    bodyGrad.addColorStop(1, darkSide);
    ctx.fillStyle = bodyGrad;
    rr(ctx, bx, bodyY, w * 0.92, bodyH, w * 0.15); ctx.fill();

    // 盾牌裝飾（身體正面）
    ctx.fillStyle = 'rgba(255,213,79,0.6)';
    ctx.beginPath(); ctx.arc(p.x, bodyY + bodyH * 0.5, w * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f9a825'; ctx.lineWidth = Math.max(1, 1.5 * p.s);
    ctx.stroke();

    // ── 雙肩 ──
    const shoulderR = w * 0.18;
    ctx.fillStyle = baseColor;
    ctx.beginPath(); ctx.arc(bx + shoulderR * 0.6, bodyY + shoulderR * 0.5, shoulderR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = darkSide;
    ctx.beginPath(); ctx.arc(bx + w * 0.92 - shoulderR * 0.6, bodyY + shoulderR * 0.5, shoulderR * 0.9, 0, Math.PI * 2); ctx.fill();

    // ── 頭部（球形漸層） ──
    const headR = w * 0.32;
    const headY = by + h * 0.18;
    const headGrad = ctx.createRadialGradient(p.x - headR * 0.3, headY - headR * 0.3, headR * 0.1, p.x, headY, headR);
    headGrad.addColorStop(0, highlight);
    headGrad.addColorStop(1, darkSide);
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(p.x, headY, headR, 0, Math.PI * 2); ctx.fill();

    // 倒計時條（抱住中才顯示）
    if (a.grabbing) {
      const bw = w * 1.2, bh = Math.max(3, 4 * p.s);
      const bxp = p.x - bw / 2, byp = by - bh - 4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      rr(ctx, bxp, byp, bw, bh, 2); ctx.fill();
      ctx.fillStyle = '#76ff03';
      rr(ctx, bxp, byp, bw * remaining, bh, 2); ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  // ─── 粒子 ────────────────────────────────────────────────
  // ─── 紅心 ──────────────────────────────────────────────────
  function drawHeart(cx, cy, sz) {
    ctx.save();
    ctx.fillStyle = '#e53935';
    ctx.shadowColor = '#e53935'; ctx.shadowBlur = sz * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + sz * 0.6);
    ctx.bezierCurveTo(cx - sz, cy, cx - sz, cy - sz * 0.8, cx, cy - sz * 0.35);
    ctx.bezierCurveTo(cx + sz, cy - sz * 0.8, cx + sz, cy, cx, cy + sz * 0.6);
    ctx.fill();
    ctx.restore();
  }

  // ─── 獎盃 ──────────────────────────────────────────────────
  function drawTrophy(cx, cy, sz) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = sz * 0.3;
    // 杯身
    ctx.beginPath();
    ctx.moveTo(cx - sz * 0.5, cy - sz * 0.6);
    ctx.lineTo(cx + sz * 0.5, cy - sz * 0.6);
    ctx.lineTo(cx + sz * 0.3, cy + sz * 0.1);
    ctx.lineTo(cx - sz * 0.3, cy + sz * 0.1);
    ctx.closePath(); ctx.fill();
    // 底座
    ctx.fillRect(cx - sz * 0.2, cy + sz * 0.1, sz * 0.4, sz * 0.2);
    ctx.fillRect(cx - sz * 0.35, cy + sz * 0.3, sz * 0.7, sz * 0.15);
    // 把手
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = sz * 0.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx - sz * 0.55, cy - sz * 0.25, sz * 0.2, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sz * 0.55, cy - sz * 0.25, sz * 0.2, Math.PI * 0.5, -Math.PI * 0.5); ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    for (const pt of G.particles) {
      const pos = proj(pt.x, pt.z);
      const t = pt.age / pt.life; // 0→1
      const a = 1 - t;
      const fy = -t * 40;
      const sz = Math.max(8, 16 * pos.s);

      ctx.globalAlpha = a;
      ctx.save();

      switch (pt.type) {
        case 'ghost': { // 半透明紫光擴散
          const gr = sz * (1 + t * 2);
          const gg = ctx.createRadialGradient(pos.x, pos.y + fy, 0, pos.x, pos.y + fy, gr);
          gg.addColorStop(0, 'rgba(179,136,255,0.5)');
          gg.addColorStop(1, 'rgba(179,136,255,0)');
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, gr, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'crit': { // 紅色閃電+文字
          ctx.fillStyle = '#ff1744';
          ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 12;
          ctx.font = `bold ${sz * 1.3}px "Noto Sans TC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('CRIT!', pos.x, pos.y - sz * 1.5 + fy);
          ctx.shadowBlur = 0;
          break;
        }
        case 'block': { // 黃色擋球光環
          const br = sz * (0.8 + t * 1.5);
          ctx.strokeStyle = `rgba(255,143,0,${a})`;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, br, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = `rgba(255,224,130,${a * 0.5})`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, br * 0.6, 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case 'flame': { // 火焰粒子（橘紅漸層上飄）
          const fr = sz * 0.6;
          const fg = ctx.createRadialGradient(pos.x, pos.y + fy, 0, pos.x, pos.y + fy, fr);
          fg.addColorStop(0, `rgba(255,109,0,${a})`);
          fg.addColorStop(0.5, `rgba(255,145,0,${a * 0.6})`);
          fg.addColorStop(1, 'rgba(255,214,0,0)');
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy * 2, fr, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'breach': { // 紅色警告環
          const rr2 = sz * (1 + t * 3);
          ctx.strokeStyle = `rgba(244,67,54,${a})`;
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, rr2, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(244,67,54,${a * 0.3})`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, rr2, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'explode': { // 爆炸星芒
          const er = sz * (0.5 + t * 2);
          ctx.fillStyle = `rgba(255,109,0,${a})`;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ea = (Math.PI / 4) * i;
            const or2 = (i % 2 === 0) ? er : er * 0.4;
            const px = pos.x + Math.cos(ea) * or2, py = pos.y + fy + Math.sin(ea) * or2;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'kill': { // 白色 X 標記
          const ks = sz * 0.8;
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(pos.x - ks, pos.y + fy - ks); ctx.lineTo(pos.x + ks, pos.y + fy + ks); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(pos.x + ks, pos.y + fy - ks); ctx.lineTo(pos.x - ks, pos.y + fy + ks); ctx.stroke();
          break;
        }
        case 'heal': { // 綠色+紅心形
          ctx.fillStyle = `rgba(76,175,80,${a})`;
          const hs = sz * 0.7;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y + fy + hs * 0.7);
          ctx.bezierCurveTo(pos.x - hs, pos.y + fy, pos.x - hs, pos.y + fy - hs * 0.7, pos.x, pos.y + fy - hs * 0.3);
          ctx.bezierCurveTo(pos.x + hs, pos.y + fy - hs * 0.7, pos.x + hs, pos.y + fy, pos.x, pos.y + fy + hs * 0.7);
          ctx.fill();
          break;
        }
        case 'goal': { // 金色 GOAL 文字 + 光環
          ctx.fillStyle = '#ffd700';
          ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
          ctx.font = `bold ${sz * 2}px "Noto Sans TC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('GOAL!', pos.x, pos.y + fy);
          ctx.shadowBlur = 0;
          const gr2 = sz * (1 + t * 4);
          ctx.strokeStyle = `rgba(255,215,0,${a * 0.4})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, gr2, 0, Math.PI * 2); ctx.stroke();
          break;
        }
        default: { // 普通文字粒子（傷害數字等）
          ctx.font = `bold ${Math.max(12, 18 * pos.s)}px sans-serif`;
          ctx.textAlign = 'center';
          // 傷害數字用紅色，其他白色
          const isNeg = pt.text && pt.text.startsWith('-');
          ctx.fillStyle = isNeg ? '#ff5252' : '#fff';
          if (isNeg) { ctx.shadowColor = '#ff5252'; ctx.shadowBlur = 6; }
          ctx.fillText(pt.text, pos.x, pos.y - 25 * pos.s + fy);
          break;
        }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ─── HUD ─────────────────────────────────────────────────
  function drawHUD() {
    // 生命（Canvas 紅心）
    const dispLives = Math.max(MAX_LIVES, G.lives);
    for (let i = 0; i < dispLives; i++) {
      ctx.globalAlpha = i < G.lives ? 1 : 0.25;
      drawHeart(16 + i * 26 + 10, 24, 10);
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

    // 已收集 buff（Canvas 圖示）
    if (G.collected.length) {
      const uniq = [...new Set(G.collected)];
      uniq.forEach((id, i) => {
        drawIcon(id, 24 + i * 22, 55, 16);
      });
    }

    // 射門提示
    if (G.phase === 'playing' && G.canShoot) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.min(14, W * 0.03)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('點擊畫面射門', W / 2, H - 16);
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
    ctx.fillText('射門挑戰', W / 2, H * 0.25);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(18, W * 0.035)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('足球肉鴿生存遊戲', W / 2, H * 0.32);

    // 說明
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
    const rules = [
      '點擊畫面踢出足球，射進球門得分',
      '防守球員會向你逼近，踢球擊退他們',
      '防守員突破底線會失去生命（共 3 條）',
      '每次進球可選一張強化卡強化你的射門',
    ];
    rules.forEach((r, i) => ctx.fillText(r, W / 2, H * 0.42 + i * (Math.min(24, W * 0.045))));

    // 最高紀錄
    const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
    if (best.score) {
      ctx.fillStyle = 'rgba(255,215,0,0.6)';
      ctx.font = `${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      drawTrophy(W / 2 - ctx.measureText(`最高紀錄：${best.score} 分（Wave ${best.wave}）`).width / 2 - 16, H * 0.68 - 6, 12);
      ctx.fillText(`最高紀錄：${best.score} 分（Wave ${best.wave}）`, W / 2, H * 0.68);
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

  // ─── 卡片圖標繪製系統 ────────────────────────────────────
  function drawIcon(c, cx, cy, sz) {
    const id = typeof c === 'string' ? c : c.id;
    const r = sz / 2;
    ctx.save();
    ctx.translate(cx, cy);

    switch (id) {
      case 'dmg20': // 射門強化 — 上箭頭
        ctx.fillStyle = '#ef5350';
        ctx.shadowColor = '#ef5350'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, r * 0.2); ctx.lineTo(r * 0.25, r * 0.2);
        ctx.lineTo(r * 0.25, r); ctx.lineTo(-r * 0.25, r); ctx.lineTo(-r * 0.25, r * 0.2);
        ctx.lineTo(-r * 0.7, r * 0.2); ctx.closePath(); ctx.fill();
        break;
      case 'dmg30': // 力量訓練 — 雙上箭頭
        ctx.fillStyle = '#ff7043';
        ctx.shadowColor = '#ff7043'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, -r * 0.1); ctx.lineTo(r * 0.2, -r * 0.1);
        ctx.lineTo(r * 0.2, r * 0.15); ctx.lineTo(-r * 0.2, r * 0.15); ctx.lineTo(-r * 0.2, -r * 0.1);
        ctx.lineTo(-r * 0.6, -r * 0.1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.lineTo(r * 0.6, r * 0.7); ctx.lineTo(r * 0.2, r * 0.7);
        ctx.lineTo(r * 0.2, r); ctx.lineTo(-r * 0.2, r); ctx.lineTo(-r * 0.2, r * 0.7);
        ctx.lineTo(-r * 0.6, r * 0.7); ctx.closePath(); ctx.fill();
        break;
      case 'spd20': // 速度鞋 — 右雙箭頭（風）
        ctx.strokeStyle = '#42a5f5'; ctx.lineWidth = sz * 0.12; ctx.lineCap = 'round';
        ctx.shadowColor = '#42a5f5'; ctx.shadowBlur = sz * 0.3;
        for (let i = -1; i <= 1; i++) {
          const y = i * r * 0.45;
          ctx.beginPath(); ctx.moveTo(-r * 0.6, y); ctx.lineTo(r * 0.3, y);
          ctx.lineTo(r * 0.1, y - r * 0.2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(r * 0.3, y); ctx.lineTo(r * 0.1, y + r * 0.2); ctx.stroke();
        }
        break;
      case 'spd40': // 閃電射門 — 閃電
        ctx.fillStyle = '#ffca28';
        ctx.shadowColor = '#ffca28'; ctx.shadowBlur = sz * 0.4;
        ctx.beginPath(); ctx.moveTo(r * 0.1, -r); ctx.lineTo(-r * 0.5, r * 0.05);
        ctx.lineTo(-r * 0.05, r * 0.05); ctx.lineTo(-r * 0.2, r);
        ctx.lineTo(r * 0.5, -r * 0.1); ctx.lineTo(r * 0.05, -r * 0.1);
        ctx.closePath(); ctx.fill();
        break;
      case 'bigball': // 大力丸 — 圓環 + 上箭頭
        ctx.strokeStyle = '#ab47bc'; ctx.lineWidth = sz * 0.1;
        ctx.shadowColor = '#ab47bc'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ab47bc';
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.3, -r * 0.5);
        ctx.lineTo(-r * 0.3, -r * 0.5); ctx.closePath(); ctx.fill();
        break;
      case 'bigball2': // 巨型足球 — 大實心圓
        ctx.shadowColor = '#7e57c2'; ctx.shadowBlur = sz * 0.4;
        const bg2 = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.05, 0, 0, r * 0.7);
        bg2.addColorStop(0, '#b39ddb'); bg2.addColorStop(1, '#512da8');
        ctx.fillStyle = bg2;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#311b92';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
        break;
      case 'rapid': // 快速連射 — 三重右箭頭
      case 'rapid2':
        const rc = id === 'rapid' ? '#26c6da' : '#80deea';
        ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = sz * 0.3;
        for (let i = 0; i < 3; i++) {
          const ox = (i - 1) * r * 0.5;
          ctx.beginPath(); ctx.moveTo(ox - r * 0.2, -r * 0.4);
          ctx.lineTo(ox + r * 0.25, 0); ctx.lineTo(ox - r * 0.2, r * 0.4);
          ctx.closePath(); ctx.fill();
        }
        break;
      case 'multi1': // 雙重射擊 — 雙圓
        ctx.shadowColor = '#fff'; ctx.shadowBlur = sz * 0.2;
        const mg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.02, 0, 0, r * 0.35);
        mg.addColorStop(0, '#fff'); mg.addColorStop(1, '#aaa');
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
        break;
      case 'ironleg': // 鐵腿 — 靴子形
        ctx.fillStyle = '#78909c';
        ctx.shadowColor = '#90a4ae'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.moveTo(-r * 0.3, -r); ctx.lineTo(r * 0.1, -r);
        ctx.lineTo(r * 0.1, r * 0.3); ctx.lineTo(r * 0.7, r * 0.5);
        ctx.lineTo(r * 0.7, r); ctx.lineTo(-r * 0.5, r);
        ctx.lineTo(-r * 0.5, r * 0.3); ctx.lineTo(-r * 0.3, r * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(-r * 0.5, r * 0.6, r * 1.2, r * 0.4);
        break;
      case 'magnet': // 磁力門框 — U型磁鐵
        ctx.lineWidth = sz * 0.14; ctx.lineCap = 'round';
        ctx.shadowColor = '#e53935'; ctx.shadowBlur = sz * 0.3;
        ctx.strokeStyle = '#e53935';
        ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.6); ctx.lineTo(-r * 0.55, r * 0.1);
        ctx.arc(0, r * 0.1, r * 0.55, Math.PI, 0, true);
        ctx.lineTo(r * 0.55, -r * 0.6); ctx.stroke();
        ctx.strokeStyle = '#1565c0';
        ctx.beginPath(); ctx.moveTo(-r * 0.55, -r * 0.6); ctx.lineTo(-r * 0.55, -r * 0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.6); ctx.lineTo(r * 0.55, -r * 0.9); ctx.stroke();
        break;
      case 'burn': // 火焰 — 火苗形
        ctx.shadowColor = '#ff6d00'; ctx.shadowBlur = sz * 0.4;
        const fg = ctx.createLinearGradient(0, -r, 0, r);
        fg.addColorStop(0, '#ff6d00'); fg.addColorStop(0.6, '#ff9100'); fg.addColorStop(1, '#ffd600');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.moveTo(0, -r);
        ctx.bezierCurveTo(r * 0.6, -r * 0.3, r * 0.7, r * 0.3, r * 0.2, r);
        ctx.lineTo(0, r * 0.5);
        ctx.lineTo(-r * 0.2, r);
        ctx.bezierCurveTo(-r * 0.7, r * 0.3, -r * 0.6, -r * 0.3, 0, -r);
        ctx.fill();
        break;
      case 'freeze': // 冰凍 — 六角雪花
        ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = sz * 0.08; ctx.lineCap = 'round';
        ctx.shadowColor = '#4fc3f7'; ctx.shadowBlur = sz * 0.4;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const ex = Math.cos(a) * r * 0.85, ey = Math.sin(a) * r * 0.85;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ex, ey); ctx.stroke();
          // 分支
          const mx = ex * 0.55, my = ey * 0.55;
          const pa = a + Math.PI / 6, pb = a - Math.PI / 6;
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(pa) * r * 0.25, my + Math.sin(pa) * r * 0.25); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mx, my);
          ctx.lineTo(mx + Math.cos(pb) * r * 0.25, my + Math.sin(pb) * r * 0.25); ctx.stroke();
        }
        break;
      case 'explode': // 爆裂 — 星芒放射
        ctx.shadowColor = '#ff6d00'; ctx.shadowBlur = sz * 0.4;
        ctx.fillStyle = '#ff6d00';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i - Math.PI / 2;
          const or = (i % 2 === 0) ? r * 0.9 : r * 0.4;
          const px = Math.cos(a) * or, py = Math.sin(a) * or;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd600';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
        break;
      case 'sniper': // 狙擊 — 十字準星
        ctx.strokeStyle = '#e53935'; ctx.lineWidth = sz * 0.08;
        ctx.shadowColor = '#e53935'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, r * 0.85); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.85, 0); ctx.lineTo(r * 0.85, 0); ctx.stroke();
        ctx.fillStyle = '#e53935';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill();
        break;
      case 'multi2': // 三重射擊 — 三圓
        ctx.shadowColor = '#fff'; ctx.shadowBlur = sz * 0.2;
        const m3g = ctx.createRadialGradient(-r * 0.1, -r * 0.1, r * 0.02, 0, 0, r * 0.28);
        m3g.addColorStop(0, '#fff'); m3g.addColorStop(1, '#999');
        ctx.fillStyle = m3g;
        [-r * 0.4, 0, r * 0.4].forEach(ox => {
          ctx.beginPath(); ctx.arc(ox, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
        });
        break;
      case 'bounce': // 反彈 — 折線箭頭
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = sz * 0.1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = '#66bb6a'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.6);
        ctx.lineTo(0, r * 0.4); ctx.lineTo(r * 0.7, -r * 0.6); ctx.stroke();
        // 箭頭
        ctx.fillStyle = '#66bb6a';
        ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.6);
        ctx.lineTo(r * 0.9, -r * 0.2); ctx.lineTo(r * 0.4, -r * 0.35); ctx.closePath(); ctx.fill();
        break;
      case 'crit': // 暴擊 — 閃電（紅）
        ctx.fillStyle = '#ff1744';
        ctx.shadowColor = '#ff1744'; ctx.shadowBlur = sz * 0.5;
        ctx.beginPath(); ctx.moveTo(r * 0.1, -r); ctx.lineTo(-r * 0.5, r * 0.05);
        ctx.lineTo(-r * 0.05, r * 0.05); ctx.lineTo(-r * 0.2, r);
        ctx.lineTo(r * 0.5, -r * 0.1); ctx.lineTo(r * 0.05, -r * 0.1);
        ctx.closePath(); ctx.fill();
        break;
      case 'gkSlow': // 守門員削弱 — 手套+向下箭頭
        ctx.fillStyle = '#ff8f00';
        ctx.shadowColor = '#ff8f00'; ctx.shadowBlur = sz * 0.3;
        ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e65100';
        ctx.beginPath(); ctx.moveTo(0, r * 0.3); ctx.lineTo(r * 0.4, r * 0.3);
        ctx.lineTo(0, r); ctx.lineTo(-r * 0.4, r * 0.3); ctx.closePath(); ctx.fill();
        break;
      case 'extraLife': // 鋼鐵防線 — 盾牌
        ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = sz * 0.4;
        const sg = ctx.createLinearGradient(0, -r, 0, r);
        sg.addColorStop(0, '#ffd54f'); sg.addColorStop(1, '#f9a825');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.85);
        ctx.lineTo(r * 0.75, -r * 0.45); ctx.lineTo(r * 0.65, r * 0.3);
        ctx.lineTo(0, r * 0.9); ctx.lineTo(-r * 0.65, r * 0.3);
        ctx.lineTo(-r * 0.75, -r * 0.45); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#f57f17'; ctx.lineWidth = sz * 0.06;
        ctx.stroke();
        // 十字
        ctx.strokeStyle = '#fff'; ctx.lineWidth = sz * 0.08;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.35); ctx.lineTo(0, r * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke();
        break;
      case 'guard': // 後衛守衛 — 人形盾
        ctx.fillStyle = '#43a047';
        ctx.shadowColor = '#43a047'; ctx.shadowBlur = sz * 0.3;
        // 頭
        ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.28, 0, Math.PI * 2); ctx.fill();
        // 身體
        ctx.fillRect(-r * 0.3, -r * 0.28, r * 0.6, r * 0.7);
        // 盾
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f57f17'; ctx.lineWidth = sz * 0.05;
        ctx.stroke();
        break;
      case 'power2': // 重砲 — 雙倍箭頭
        ctx.fillStyle = '#ff5252';
        ctx.shadowColor = '#ff5252'; ctx.shadowBlur = sz * 0.5;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.95);
        ctx.lineTo(r * 0.8, 0); ctx.lineTo(r * 0.3, 0);
        ctx.lineTo(r * 0.3, r * 0.95); ctx.lineTo(-r * 0.3, r * 0.95);
        ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.8, 0);
        ctx.closePath(); ctx.fill();
        // ×2 文字
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${sz * 0.28}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('×2', 0, r * 0.45);
        break;
      case 'split': // 分裂 — 一圓分三
        ctx.shadowColor = '#ba68c8'; ctx.shadowBlur = sz * 0.3;
        ctx.fillStyle = '#ba68c8';
        ctx.beginPath(); ctx.arc(0, -r * 0.35, r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9c27b0';
        ctx.beginPath(); ctx.arc(-r * 0.35, r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.35, r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
        // 連線
        ctx.strokeStyle = 'rgba(186,104,200,0.5)'; ctx.lineWidth = sz * 0.05;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(-r * 0.25, r * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -r * 0.1); ctx.lineTo(r * 0.25, r * 0.2); ctx.stroke();
        break;
      case 'timeSlow': // 時間壓迫 — 時鐘
        ctx.strokeStyle = '#90caf9'; ctx.lineWidth = sz * 0.08;
        ctx.shadowColor = '#90caf9'; ctx.shadowBlur = sz * 0.4;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = sz * 0.07;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.3, r * 0.1); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2); ctx.fill();
        break;
      case 'ghost': // 幽靈 — 半透明飄浮體
        ctx.shadowColor = '#b388ff'; ctx.shadowBlur = sz * 0.5;
        ctx.fillStyle = 'rgba(179,136,255,0.6)';
        ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.55, Math.PI, 0);
        ctx.lineTo(r * 0.55, r * 0.5);
        // 波浪底
        ctx.lineTo(r * 0.35, r * 0.3); ctx.lineTo(r * 0.15, r * 0.55);
        ctx.lineTo(-r * 0.1, r * 0.3); ctx.lineTo(-r * 0.35, r * 0.55);
        ctx.lineTo(-r * 0.55, r * 0.3);
        ctx.closePath(); ctx.fill();
        // 眼睛
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.2, r * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#311b92';
        ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.18, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.17, -r * 0.18, r * 0.06, 0, Math.PI * 2); ctx.fill();
        break;
      case 'vampire': // 吸血 — 血滴 + 牙
        ctx.shadowColor = '#d50000'; ctx.shadowBlur = sz * 0.4;
        const vg = ctx.createLinearGradient(0, -r, 0, r);
        vg.addColorStop(0, '#f44336'); vg.addColorStop(1, '#b71c1c');
        ctx.fillStyle = vg;
        ctx.beginPath(); ctx.moveTo(0, -r * 0.85);
        ctx.bezierCurveTo(r * 0.7, -r * 0.1, r * 0.6, r * 0.6, 0, r * 0.85);
        ctx.bezierCurveTo(-r * 0.6, r * 0.6, -r * 0.7, -r * 0.1, 0, -r * 0.85);
        ctx.fill();
        // 牙
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-r * 0.15, -r * 0.05); ctx.lineTo(-r * 0.08, r * 0.25);
        ctx.lineTo(-r * 0.01, -r * 0.05); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r * 0.01, -r * 0.05); ctx.lineTo(r * 0.08, r * 0.25);
        ctx.lineTo(r * 0.15, -r * 0.05); ctx.closePath(); ctx.fill();
        break;
      default:
        // fallback：圓形+問號
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${sz * 0.4}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 0);
    }
    ctx.restore();
  }

  // ─── 選牌畫面 ────────────────────────────────────────────
  function drawCards() {
    const CARD_REVEAL_EACH = 500; // 每張卡 500ms 進場
    const elapsed = performance.now() - (G._cardRevealStart || 0);
    const allRevealed = elapsed >= G.cardPick.length * CARD_REVEAL_EACH;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffd700';
    ctx.font = `bold ${Math.min(28, W * 0.05)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('GOAL! 選擇一張強化卡', W / 2, H * 0.13);

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
      const cardStart = i * CARD_REVEAL_EACH;
      const cardElapsed = elapsed - cardStart;
      if (cardElapsed < 0) return; // 尚未輪到

      // 進場動畫：從下方飛入 + 縮放 + 透明度
      const t = Math.min(1, cardElapsed / 400); // 400ms 動畫
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const offsetY = (1 - ease) * 120;
      const scale = 0.5 + ease * 0.5;
      const alpha = ease;

      const cx2 = sx + i * (cw + gap);
      const drawW = cw * scale, drawH = ch * scale;
      const drawX = cx2 + (cw - drawW) / 2;
      const drawY = cy + (ch - drawH) / 2 + offsetY;

      // 只有完全顯示後才註冊點擊區
      if (allRevealed) {
        G._cardR.push({ x: cx2, y: cy, w: cw, h: ch, idx: i });
      }

      ctx.globalAlpha = alpha;
      const bg = rarCol[c.rarity] || '#4a5568';

      // 光暈
      ctx.shadowColor = bg; ctx.shadowBlur = 18 * ease;
      ctx.fillStyle = bg;
      rr(ctx, drawX, drawY, drawW, drawH, 12 * scale); ctx.fill();
      ctx.shadowBlur = 0;

      // 內框
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(ctx, drawX + 4 * scale, drawY + 4 * scale, drawW - 8 * scale, drawH - 8 * scale, 10 * scale); ctx.fill();

      // 圖示（Canvas 繪製）
      drawIcon(c, drawX + drawW / 2, drawY + drawH * 0.22, drawW * 0.38);

      // 名稱
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(11, drawW * 0.085)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(c.name, drawX + drawW / 2, drawY + drawH * 0.48);

      // 描述
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.max(9, drawW * 0.07)}px "Noto Sans TC", sans-serif`;
      wrapCenter(ctx, c.desc, drawX + drawW / 2, drawY + drawH * 0.6, drawW - 16 * scale, drawW * 0.08);

      // 稀有度
      ctx.fillStyle = bg;
      ctx.font = `bold ${Math.max(9, drawW * 0.06)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(rarName[c.rarity], drawX + drawW / 2, drawY + drawH - 14 * scale);

      ctx.globalAlpha = 1;
    });

    // 提示文字（全部翻完才顯示）
    if (allRevealed) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.min(14, W * 0.03)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('點擊卡片選擇', W / 2, H * 0.88);
    }
  }

  // ─── 結算畫面 ────────────────────────────────────────────
  function drawGameOver() {
    const elapsed = performance.now() - (G._gameoverStart || 0);
    const fade = Math.min(1, elapsed / 1000); // 1 秒漸入

    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#f44336';
    ctx.font = `bold ${Math.min(36, W * 0.07)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('終場哨響！', W / 2, H * 0.25);

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
      drawTrophy(W / 2 - ctx.measureText(`最高紀錄：${best.score} 分`).width / 2 - 16, H * 0.56 - 6, 12);
      ctx.fillText(`最高紀錄：${best.score} 分`, W / 2, H * 0.56);
    }

    // 按鈕（漸入完成才顯示）
    if (fade >= 1) {
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

    ctx.globalAlpha = 1;
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
    // 使用邏輯座標（與繪製座標一致）
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);

    if (G.phase === 'title') {
      if (hitTest(x, y, G._startR)) {
        G.phase = 'playing';
        beginWave();
      }
      return;
    }
    if (G.phase === 'playing') { shoot(x, y); return; }
    if (G.phase === 'cards') {
      // 卡片全部翻完才能點（每張 500ms，3 張 = 1500ms）
      const CARD_REVEAL_EACH = 500;
      const elapsed = performance.now() - (G._cardRevealStart || 0);
      if (elapsed < G.cardPick.length * CARD_REVEAL_EACH) return;
      for (const r of (G._cardR || [])) {
        if (hitTest(x, y, r)) { selectCard(r.idx); return; }
      }
      return;
    }
    if (G.phase === 'gameover') {
      // 死亡 1 秒內不能點
      if (performance.now() - (G._gameoverStart || 0) < 1000) return;
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
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);  // 所有繪製自動縮放
    horizY = H * 0.08;
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
