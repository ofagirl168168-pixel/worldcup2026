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
    { id:'dmg20',    name:'射門強化',   desc:'傷害 +20%',                icon:'👊', rarity:'common',    apply(s){ s.dmgMul *= 1.2; }},
    { id:'dmg30',    name:'力量訓練',   desc:'傷害 +30%',                icon:'💪', rarity:'common',    apply(s){ s.dmgMul *= 1.3; }},
    { id:'spd20',    name:'速度鞋',     desc:'球速 +20%',                icon:'👟', rarity:'common',    apply(s){ s.spdMul *= 1.2; }},
    { id:'spd40',    name:'閃電射門',   desc:'球速 +40%',                icon:'⚡', rarity:'common',    apply(s){ s.spdMul *= 1.4; }},
    { id:'bigball',  name:'大力丸',     desc:'球體+20%（增大也提升傷害，上限3倍）',icon:'⭕', rarity:'common',    apply(s){ s.ballScale = Math.min(3, s.ballScale * 1.2); }},
    { id:'bigball2', name:'巨型足球',   desc:'球體+40%（增大也提升傷害，上限3倍）',icon:'🔵', rarity:'common',    apply(s){ s.ballScale = Math.min(3, s.ballScale * 1.4); }},
    { id:'rapid',    name:'快速連射',   desc:'射門冷卻 -30%',            icon:'⏩', rarity:'common',    apply(s){ s.cdMul *= 0.7; }},
    { id:'rapid2',   name:'輕量化',     desc:'射門冷卻 -20%',            icon:'💨', rarity:'common',    apply(s){ s.cdMul *= 0.8; }},
    { id:'multi1',   name:'雙重射擊',   desc:'連續射球數量 +1',          icon:'⚽', rarity:'common',    apply(s){ s.multiShot += 1; }},
    { id:'ironleg',  name:'鐵腿',       desc:'傷害 +50%，球速 -15%',     icon:'🦵', rarity:'common',    apply(s){ s.dmgMul *= 1.5; s.spdMul *= 0.85; }},
    { id:'magnet',   name:'磁力門框',   desc:'球門判定寬度 +20%',        icon:'🧲', rarity:'common',    apply(s){ s.goalBonus = (s.goalBonus||0) + 0.2; }},

    // ── 能力卡 (rare) ──────────────────────
    { id:'burn',     name:'火焰射擊',   desc:'命中附帶灼燒（每秒 1 傷害）',icon:'🔥', rarity:'rare',  apply(s){ s.burn = true; }},
    { id:'freeze',   name:'冰凍射擊',   desc:'命中後敵人減速 50%',       icon:'❄️', rarity:'rare',    apply(s){ s.freeze = true; }},
    { id:'explode',  name:'爆裂射擊',   desc:'命中時爆炸傷害周圍',       icon:'💥', rarity:'rare',    apply(s){ s.explode = true; }},
    { id:'sniper',   name:'狙擊射門',   desc:'傷害 ×2.5，球變小',        icon:'🔫', rarity:'rare',    apply(s){ s.dmgMul *= 2.5; s.ballScale *= 0.65; }},
    { id:'multi2',   name:'三重射擊',   desc:'連續射球數量 +2',          icon:'🎱', rarity:'rare',     apply(s){ s.multiShot += 2; }},
    { id:'bounce',   name:'反彈射擊',   desc:'球碰敵人後反彈+1次（上限4）',icon:'🔄', rarity:'rare', apply(s){ s.bounce = Math.min(4, (s.bounce||0) + 1); }},
    { id:'crit',     name:'致命一擊',   desc:'每次射門 20% 機率暴擊 ×3', icon:'⚡', rarity:'rare',     apply(s){ s.critPct = Math.min(0.6, (s.critPct||0) + 0.2); }},
    { id:'gkSlow',   name:'守門員削弱', desc:'守門員移速 -30%',          icon:'🧤', rarity:'rare',     apply(s){ s.gkSlowMul = (s.gkSlowMul||1) * 0.7; }},
    { id:'extraLife', name:'鋼鐵防線', desc:'+1 條命（上限 5）',         icon:'🛡️', rarity:'rare',    apply(s){ if(s.lives < 5) s.lives++; }},
    { id:'guard',    name:'後衛守衛',   desc:'召喚一個守衛，敵人靠近時阻擋 5 秒',icon:'🏋️', rarity:'rare',  apply(s){ s._spawnGuard = (s._spawnGuard||0) + 1; }},

    // ── 進階卡 (epic) ──────────────────────
    { id:'power2',   name:'重砲射擊',   desc:'傷害 ×2',                  icon:'🔨', rarity:'epic',     apply(s){ s.dmgMul *= 2; }},
    { id:'split',    name:'分裂射擊',   desc:'命中敵人後分裂成 2 顆小球', icon:'💀', rarity:'epic',     apply(s){ s.split = true; }},
    { id:'timeSlow', name:'時間壓迫',   desc:'敵人全體速度永久 -20%',    icon:'⏱️', rarity:'epic',     apply(s){ s.globalSlow = (s.globalSlow||1) * 0.8; }},

    // ── 傳說卡 (legendary) ─────────────────
    { id:'ghost',    name:'幽靈球',     desc:'+10% 機率穿過敵人（上限30%）',icon:'👻', rarity:'legendary', apply(s){ s.ghostPct = Math.min(0.3, (s.ghostPct||0) + 0.1); }},
    { id:'vampire',  name:'吸血足球',   desc:'擊殺敵人回復 1 條命',      icon:'🧛', rarity:'legendary', apply(s){ s.vampire = true; }},
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
    G.gk.spd = (GK_BASE_SPD + G.wave * 0.3) * (G.gkSlowMul || 1);
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

    // ── 守門員（追蹤球） ──
    const gk = G.gk;
    const gkEffSpd = gk.spd * (G.globalSlow || 1);
    // 找最接近球門的球來追蹤
    let trackBall = null, bestZ = 0;
    for (const b of G.balls) {
      if (!b.alive) continue;
      if (b.z > bestZ) { bestZ = b.z; trackBall = b; }
    }
    if (trackBall) {
      // 追蹤球的 x 軸位置
      const diff = trackBall.x - gk.x;
      if (Math.abs(diff) > 3) {
        gk.x += Math.sign(diff) * gkEffSpd * (dt / 16);
      }
    } else {
      // 沒有球時左右巡邏
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
          if (G.ghostPct > 0 && Math.random() < G.ghostPct) { addPart(d.x, d.z, '👻', 0.6); continue; }
          // 傷害 = 基礎 × 倍率 × 球大小 × 暴擊
          let dmg = Math.ceil(BASE_DMG * G.dmgMul * G.ballScale);
          const isCrit = G.critPct > 0 && Math.random() < G.critPct;
          if (isCrit) { dmg *= 3; addPart(d.x, d.z - 20, '⚡暴擊!', 0.7); }
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
        addPart(gk.x, gk.z, '🧤', 0.8);
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
        if (d.burnTick <= 0) { d.hp -= 1; d.burnTick = 1000; addPart(d.x, d.z, '🔥', 0.3); if (d.hp <= 0) onDefKill(d); }
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
      // 越靠近主角，越往中間收攏（模擬包夾）
      const closeness = 1 - Math.max(0, d.z) / FIELD_DEPTH; // 0=球門端, 1=玩家端
      if (closeness > 0.4) {
        const pullStrength = (closeness - 0.4) * 0.03;
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
        addPart(d.x, 30, '🔴', 1.2);
        if (G.lives <= 0) { G.phase = 'gameover'; saveResult(); return; }
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
        addPart(d.x, d.z, '💥', 0.4);
        if (d.hp <= 0) onDefKill(d);
      }
    }
  }

  function onDefKill(d) {
    G.score += 10;
    addPart(d.x, d.z, '💀', 0.7);
    const maxLives = Math.max(MAX_LIVES, G.lives); // extraLife 可能超過初始上限
    if (G.vampire && G.lives < maxLives) { G.lives++; addPart(d.x, d.z, '❤️', 0.9); }
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
    const dispLives = Math.max(MAX_LIVES, G.lives);
    for (let i = 0; i < dispLives; i++) {
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
