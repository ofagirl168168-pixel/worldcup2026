/* rogue.js — ⚽ 足球射門挑戰：前進世界盃 */
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

  // ─── 場景系統 ──────────────────────────────────────────────
  const SCENES = [
    { name:'巴西',
      sky: ['#1a0a2e','#4a1942','#8e2424','#b35418'],
      grass: ['#2a8a30','#22a028'],
      line: 'rgba(255,240,200,0.3)' },
    { name:'阿根廷',
      sky: ['#2a6ab0','#4a8ac0','#6aa0cc'],
      grass: ['#2a7a35','#258a30'],
      line: 'rgba(255,255,255,0.35)' },
    { name:'德國',
      sky: ['#3a4a5c','#5a6a7c','#7a8a9c'],
      grass: ['#2a6830','#266030'],
      line: 'rgba(255,255,255,0.25)' },
    { name:'義大利',
      sky: ['#1a3a6a','#3a6a9a','#5a8aba'],
      grass: ['#2d7a3a','#268f35'],
      line: 'rgba(255,255,255,0.35)' },
    { name:'英格蘭',
      sky: ['#1a1030','#2d2045','#3a2860'],
      grass: ['#1e5528','#1a4d24'],
      line: 'rgba(200,200,255,0.25)',
      lightning: true },
    { name:'法國',
      sky: ['#0a1628','#16243a','#1e3050'],
      grass: ['#1e5a3a','#1a5535'],
      line: 'rgba(200,220,255,0.3)' },
    { name:'日本',
      sky: ['#0a0a0a','#1a1200','#2a1e00'],
      grass: ['#1e5528','#1a5024'],
      line: 'rgba(255,215,0,0.3)',
      golden: true },
  ];
  let curScene = SCENES[0];

  // ═══════════════════════════════════════════════════════════
  //  卡牌
  // ═══════════════════════════════════════════════════════════
  // 稀有度權重：common 出現最多，legendary 最少
  const RARITY_WEIGHT = { common: 50, uncommon: 35, rare: 25, epic: 10, legendary: 3 };

  const CARDS = [
    // ── 基礎數值卡 (common 白色) ────────────
    { id:'dmg20',    name:'射門強化',   desc:'傷害 +20%',                rarity:'common',    apply(s){ s.dmgMul *= 1.2; }},
    { id:'spd20',    name:'速度鞋',     desc:'球速 +20%',                rarity:'common',    apply(s){ s.spdMul *= 1.2; }},
    { id:'bigball',  name:'大力丸',     desc:'球體+20%（增大也提升傷害，上限3倍）', rarity:'common', apply(s){ s.ballScale = Math.min(3, s.ballScale * 1.2); }},
    { id:'rapid2',   name:'輕量化',     desc:'射門冷卻 -20%',            rarity:'common',    apply(s){ s.cdMul *= 0.8; }},
    { id:'multi1',   name:'雙重射擊',   desc:'連續射球數量 +1',          rarity:'common',    apply(s){ s.multiShot += 1; }},
    { id:'magnet',   name:'磁力門框',   desc:'球門判定寬度 +10%',        rarity:'rare',      apply(s){ s.goalBonus = (s.goalBonus||0) + 0.1; }},
    { id:'magnet2',  name:'強力磁場',   desc:'球門判定寬度 +20%',        rarity:'epic',      apply(s){ s.goalBonus = (s.goalBonus||0) + 0.2; }},

    // ── 進階數值卡 (uncommon 綠色) ──────────
    { id:'dmg30',    name:'力量訓練',   desc:'傷害 +30%',                rarity:'uncommon',  apply(s){ s.dmgMul *= 1.3; }},
    { id:'spd40',    name:'閃電射門',   desc:'球速 +40%',                rarity:'uncommon',  apply(s){ s.spdMul *= 1.4; }},
    { id:'bigball2', name:'巨型足球',   desc:'球體+40%（增大也提升傷害，上限3倍）', rarity:'uncommon', apply(s){ s.ballScale = Math.min(3, s.ballScale * 1.4); }},
    { id:'rapid',    name:'快速連射',   desc:'射門冷卻 -30%',            rarity:'uncommon',  apply(s){ s.cdMul *= 0.7; }},
    { id:'ironleg',  name:'鐵腿',       desc:'傷害 +50%，球速 -15%',     rarity:'uncommon',  apply(s){ s.dmgMul *= 1.5; s.spdMul *= 0.85; }},
    { id:'critG',    name:'銳利直覺',   desc:'每次射門 10% 機率暴擊 ×3', rarity:'uncommon',  apply(s){ s.critPct = Math.min(0.6, (s.critPct||0) + 0.1); }},

    // ── 能力卡 (rare 藍色) ──────────────────
    { id:'burn',     name:'火焰射擊',   desc:'命中附帶灼燒（每秒 1 傷害）', rarity:'rare',  apply(s){ s.burn = true; }},
    { id:'freeze',   name:'冰凍射擊',   desc:'命中後敵人減速 50%',       rarity:'rare',    apply(s){ s.freeze = true; }},
    { id:'explode',  name:'爆裂射擊',   desc:'命中時爆炸傷害周圍',       rarity:'rare',    apply(s){ s.explode = true; }},
    { id:'sniper',   name:'狙擊射門',   desc:'傷害 ×2.5，球變小',        rarity:'rare',    apply(s){ s.dmgMul *= 2.5; s.ballScale *= 0.65; }},
    { id:'multi2',   name:'三重射擊',   desc:'連續射球數量 +2',          rarity:'rare',     apply(s){ s.multiShot += 2; }},
    { id:'bounce',   name:'反彈射擊',   desc:'球碰到敵人後反彈繼續飛+1次（上限5）', rarity:'rare', apply(s){ s.bounce = Math.min(5, (s.bounce||0) + 1); }},
    { id:'crit',     name:'致命一擊',   desc:'每次射門 20% 機率暴擊 ×3', rarity:'rare',     apply(s){ s.critPct = Math.min(0.6, (s.critPct||0) + 0.2); }},
    { id:'gkSlow',   name:'守門員削弱', desc:'守門員移速 -30%',          rarity:'rare',     apply(s){ s.gkSlowMul = (s.gkSlowMul||1) * 0.7; }},
    { id:'extraLife', name:'鋼鐵防線', desc:'+1 條命（上限 5）',         rarity:'rare',    apply(s){ if(s.lives < 5) s.lives++; }},
    { id:'guard',    name:'後衛守衛',   desc:'召喚一個守衛，敵人靠近時阻擋 5 秒', rarity:'rare', apply(s){ s._spawnGuard = (s._spawnGuard||0) + 1; }},

    // ── 進階卡 (epic) ──────────────────────
    { id:'power2',   name:'重砲射擊',   desc:'傷害 ×2',                  rarity:'epic',     apply(s){ s.dmgMul *= 2; }},
    { id:'split',    name:'分裂射擊',   desc:'命中敵人後分裂成 2 顆小球', rarity:'epic',     apply(s){ s.split = true; }},
    { id:'timeSlow', name:'時間壓迫',   desc:'敵人全體速度永久 -20%',    rarity:'epic',     apply(s){ s.globalSlow = (s.globalSlow||1) * 0.8; }},

    // ── 傳說卡 (legendary) ─────────────────
    { id:'ghost',      name:'幽靈球',     desc:'+10% 機率穿過敵人（上限30%）', rarity:'legendary', apply(s){ s.ghostPct = Math.min(0.3, (s.ghostPct||0) + 0.1); }},
    { id:'vampire',    name:'吸血足球',   desc:'擊殺敵人回復 1 條命',      rarity:'legendary', apply(s){ s.vampire = true; }},
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
  //  音效系統（音檔 + Web Audio API 備援）
  // ═══════════════════════════════════════════════════════════
  let audioCtx = null;
  let sfxOn = false, bgmOn = false;
  let bgmGain = null, sfxGain = null;
  let _bgmTimer = null, _bgmPlaying = false;

  // ── 預載音效檔 ──
  const SFX_FILES = {
    shoot:    'audio/sfx/shoot.mp3',
    hit:      'audio/sfx/hit.ogg',
    goal:     'audio/sfx/goal.mp3',
    block:    'audio/sfx/block.ogg',
    warning:  'audio/sfx/warning.mp3',
    card:     'audio/sfx/card.wav',
    loselife: 'audio/sfx/loselife.mp3',
    gameover: 'audio/sfx/gameover.mp3',
  };
  const sfxPool = {};   // { name: [Audio, Audio, ...] }
  const SFX_POOL_SIZE = 3;
  let sfxLoaded = false;

  function preloadSFX() {
    if (sfxLoaded) return;
    sfxLoaded = true;
    for (const [name, src] of Object.entries(SFX_FILES)) {
      sfxPool[name] = [];
      for (let i = 0; i < SFX_POOL_SIZE; i++) {
        const a = new Audio(src);
        a.preload = 'auto';
        a.volume = 0.4;
        sfxPool[name].push(a);
      }
    }
  }

  function playSFX(name) {
    if (!sfxOn) return;
    preloadSFX();
    const pool = sfxPool[name];
    if (!pool) return;
    // 找到一個空閒的 Audio 元素
    for (const a of pool) {
      if (a.paused || a.ended) {
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
    }
    // 全部忙碌：強制重用第一個
    pool[0].currentTime = 0;
    pool[0].play().catch(() => {});
  }

  function ensureAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    bgmGain = audioCtx.createGain(); bgmGain.gain.value = 0.18; bgmGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.25; sfxGain.connect(audioCtx.destination);
  }

  function playNote(freq, dur, type, dest, delay) {
    if (!audioCtx) return;
    const t = audioCtx.currentTime + (delay || 0);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur);
  }

  // ── 音效 ──
  function sfxShoot()    { playSFX('shoot'); }
  function sfxHit()      { playSFX('hit'); }
  function sfxGoal()     { playSFX('goal'); }
  function sfxBlock()    { playSFX('block'); }
  function sfxWarning()  { playSFX('warning'); }
  function sfxCard()     { playSFX('card'); }
  function sfxLoseLife() { playSFX('loselife'); }
  function sfxGameOver() { playSFX('gameover'); }

  // ── BGM：先嘗試載入音檔，無檔案則用程式生成旋律 ──
  let _bgmAudio = null;  // 音檔 BGM 用

  const COUNTRY_BGM_FILES = {
    '巴西': 'audio/bgm-brazil.mp3',
    '阿根廷': 'audio/bgm-argentina.mp3',
    '德國': 'audio/bgm-germany.mp3',
    '義大利': 'audio/bgm-italy.mp3',
    '英格蘭': 'audio/bgm-england.mp3',
    '法國': 'audio/bgm-france.mp3',
    '日本': 'audio/bgm-japan.mp3',
  };

  const COUNTRY_MUSIC = {
    '巴西': {
      scale: [262, 294, 330, 392, 440, 523, 587, 659],
      tempo: 180, type: 'sine',
      pattern: [0,2,4,5,4,2,0,2, 4,5,6,7,6,5,4,2],
    },
    '阿根廷': {
      scale: [262, 294, 311, 370, 415, 466, 523, 554],
      tempo: 130, type: 'triangle',
      pattern: [0,1,2,3,4,3,2,1, 4,5,6,7,6,5,4,3],
    },
    '德國': {
      scale: [262, 294, 330, 349, 392, 440, 494, 523],
      tempo: 140, type: 'square',
      pattern: [0,0,4,4,5,5,4,4, 3,3,2,2,1,1,0,0],
    },
    '義大利': {
      scale: [330, 370, 415, 440, 494, 523, 587, 659],
      tempo: 120, type: 'sine',
      pattern: [0,2,4,6,7,6,4,2, 1,3,5,7,6,4,2,0],
    },
    '英格蘭': {
      scale: [262, 294, 330, 349, 392, 440, 494, 523],
      tempo: 110, type: 'triangle',
      pattern: [0,0,1,2,2,3,4,4, 5,5,4,3,2,1,0,0],
    },
    '法國': {
      scale: [330, 370, 440, 494, 523, 587, 659, 698],
      tempo: 150, type: 'sine',
      pattern: [0,4,2,4,0,4,2,4, 1,5,3,5,1,5,3,5],
    },
    '日本': {
      scale: [262, 294, 349, 392, 466, 523, 587, 698],
      tempo: 100, type: 'sine',
      pattern: [0,2,3,4,3,2,0,2, 4,6,7,6,4,3,2,0],
    },
  };

  function startBGM(sceneName) {
    stopBGM();
    if (!bgmOn) return;

    // 嘗試載入音檔
    const filePath = COUNTRY_BGM_FILES[sceneName];
    if (filePath) {
      const audio = new Audio(filePath);
      audio.loop = true;
      audio.volume = 0.25;
      audio.play().then(() => {
        _bgmAudio = audio;
      }).catch(() => {
        // 音檔不存在或無法播放，改用程式生成
        startProceduralBGM(sceneName);
      });
      return;
    }
    startProceduralBGM(sceneName);
  }

  function startProceduralBGM(sceneName) {
    ensureAudio();
    const music = COUNTRY_MUSIC[sceneName];
    if (!music) return;
    _bgmPlaying = true;
    let step = 0;
    const beatMs = 60000 / music.tempo;

    function playStep() {
      if (!_bgmPlaying || !bgmOn) return;
      const idx = music.pattern[step % music.pattern.length];
      const freq = music.scale[idx];
      playNote(freq, beatMs / 1000 * 0.8, music.type, bgmGain);
      if (step % 4 === 0) {
        const bassG = audioCtx.createGain();
        bassG.gain.value = 0.08; bassG.connect(bgmGain);
        playNote(freq / 2, beatMs / 1000 * 1.5, 'triangle', bassG);
      }
      step++;
      _bgmTimer = setTimeout(playStep, beatMs);
    }
    playStep();
  }

  function stopBGM() {
    _bgmPlaying = false;
    if (_bgmTimer) { clearTimeout(_bgmTimer); _bgmTimer = null; }
    if (_bgmAudio) { _bgmAudio.pause(); _bgmAudio = null; }
  }

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
    // 防守員數量：每階段上限 +1
    let maxCount;
    if (w <= 15)      maxCount = 16;
    else if (w <= 30) maxCount = 17;
    else if (w <= 50) maxCount = 18;
    else              maxCount = 19;
    const count = Math.min(3 + w, maxCount);
    const types = ['normal'];
    if (w >= 1) types.push('sentry');  // 每波都有中路守衛擋住直射
    if (w >= 2) types.push('fast');
    if (w >= 3) { types.push('tank'); types.push('captain'); }
    // 中路守衛數量：每階段 +1
    let maxSentry;
    if (w <= 15)      maxSentry = 4;
    else if (w <= 30) maxSentry = 5;
    else if (w <= 50) maxSentry = 6;
    else              maxSentry = 7;
    const sentryCount = Math.min(1 + Math.floor(w / 2), maxSentry);
    // 攔截者數量：每階段 +1
    let maxCaptain;
    if (w <= 15)      maxCaptain = 3;
    else if (w <= 30) maxCaptain = 4;
    else if (w <= 50) maxCaptain = 5;
    else              maxCaptain = 6;
    const captainCount = w >= 3 ? Math.min(1 + Math.floor((w - 2) / 2), maxCaptain) : 0;
    // 血量成長：wave 50 前維持原幅度，50 後加速
    let hpMul;
    if (w <= 50)      hpMul = Math.pow(1.20, w - 1);                                    // 前~中期 1.2x
    else if (w <= 65) hpMul = Math.pow(1.20, 49) * Math.pow(1.28, w - 50);              // 後期 1.28x
    else              hpMul = Math.pow(1.20, 49) * Math.pow(1.28, 15) * Math.pow(1.35, w - 65); // 極後期 1.35x
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
    generateCornerProps(); // 每波隨機更換角落物件
    generateBgEggs();     // 每波隨機更換背景彩蛋
    // 守門員速度：每 5 波提升，後期加速更快
    const gkTier = Math.floor(G.wave / 5); // wave5=1, wave10=2, wave15=3...
    let gkBonus = 0;
    for (let t = 1; t <= gkTier; t++) {
      if (t <= 3)       gkBonus += 1.0;  // wave 5-15：每階 +1.0
      else if (t <= 6)  gkBonus += 1.5;  // wave 20-30：每階 +1.5
      else if (t <= 10) gkBonus += 2.5;  // wave 35-50：每階 +2.5
      else              gkBonus += 4.0;  // wave 55+：每階 +4.0（接近瞬移）
    }
    G.gk.spd = (GK_BASE_SPD + gkBonus) * (G.gkSlowMul || 1);
    G.gk.tracking = G.wave >= 5; // wave5 起才追蹤球

    // 每 5 波警告
    if (G.wave >= 5 && G.wave % 5 === 0) {
      G._warning = { timer: 3000, tier: gkTier };
      sfxWarning();
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
    sfxShoot();
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
    const gkPatrolHW = Math.min(GOAL_HW * 1.6, GOAL_HW * (1 + (G.goalBonus || 0)));
    if (gk.x > gkPatrolHW - gk.w / 2) { gk.x = gkPatrolHW - gk.w / 2; gk.dir = -1; }
    if (gk.x < -gkPatrolHW + gk.w / 2) { gk.x = -gkPatrolHW + gk.w / 2; gk.dir = 1; }

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
          // ghost 穿過（記錄已穿透的敵人，避免重複碰撞）
          if (!b._ghosted) b._ghosted = new Set();
          if (b._ghosted.has(d)) continue; // 已穿透過此敵人，直接跳過
          if (G.ghostPct > 0 && Math.random() < G.ghostPct) {
            b._ghosted.add(d);
            addPart(d.x, d.z, '穿透!', 0.6, 'ghost');
            continue;
          }
          // 傷害 = 基礎 × 倍率 × 球大小 × 暴擊
          let dmg = Math.ceil(BASE_DMG * G.dmgMul * G.ballScale);
          const isCrit = G.critPct > 0 && Math.random() < G.critPct;
          if (isCrit) { dmg *= 3; addPart(d.x, d.z - 20, 'CRIT!', 0.7, 'crit'); }
          // 反彈球傷害減半
          if (b._bounced) dmg = Math.max(1, Math.ceil(dmg * 0.5));
          // 分裂小球傷害減半
          if (b._split) dmg = Math.max(1, Math.ceil(dmg * 0.5));
          d.hp -= dmg;
          sfxHit();
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
        sfxBlock();
        shakeAmt = 4;
        continue;
      }

      // 進球判定（同一波只算一次）
      if (b.z >= GOAL_Z) {
        b.alive = false;
        const effectiveGoalHW = Math.min(GOAL_HW * 1.6, GOAL_HW * (1 + (G.goalBonus || 0)));
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
      // 判定線：z < FIELD_DEPTH * 0.20 後直接朝中心點(0,0)直線前進（不減速，用原始速度）
      if (d.z < FIELD_DEPTH * 0.20) {
        const rushSp = rawSp; // 不受 0.8 上限，全速衝刺
        const dx = -d.x, dz = -d.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 1) {
          d.x += (dx / dist) * rushSp * step;
          d.z += (dz / dist) * rushSp * step;
        } else {
          d.z -= rushSp * step;
        }
      } else {
        d.z -= sp * step;
        d.x += (d.vx || 0) * (G.globalSlow || 1) * step;
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
        sfxLoseLife();
        addPart(d.x, 30, '', 1.2, 'breach');
        if (G.lives <= 0) { G.phase = 'gameover'; G._gameoverStart = performance.now(); sfxGameOver(); stopBGM(); saveResult(); return; }
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
    sfxGoal();
    addPart(0, GOAL_Z - 50, 'GOAL!', 1.5, 'goal');
    G.phase = 'cards';
    G.cardPick = pickCards(3);
    G._cardRevealStart = performance.now(); // 卡片逐張進場計時
  }

  // 可無限疊加的純數值卡
  const STACKABLE = new Set(['dmg20','dmg30','spd20','spd40','bigball','bigball2','rapid','rapid2','multi1','multi2','power2','ironleg','magnet','magnet2','guard']);
  // 有次數上限的疊加卡（critG 和 crit 共用暴擊率上限 60%，分開計數）
  const STACK_LIMIT = { ghost: 3, bounce: 5, crit: 3, critG: 6 };

  function pickCards(n) {
    // 過濾卡池：純數值無限疊、ghost 限 3 次、其餘能力卡選過就移除
    const pool = CARDS.filter(c => {
      // 磁鐵達到球門寬度上限就不再出現
      if ((c.id === 'magnet' || c.id === 'magnet2') && (G.goalBonus || 0) >= 0.6) return false;
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
    sfxCard();
    const c = G.cardPick[idx];
    c.apply(G);
    G.collected.push(c.id);
    // 守衛卡：生成盟友（每張卡+1個）
    while (G._spawnGuard > 0) {
      G._spawnGuard--;
      G.allies.push({
        x: (Math.random() - 0.5) * FIELD_HW * 0.6,
        z: FIELD_DEPTH * 0.20,
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
  // 射門挑戰排行榜快取
  let _rogueWeeklyBoard = null;
  let _rogueAllTimeBoard = null;
  let _rogueBoardLoaded = false;

  async function loadRogueBoards() {
    if (_rogueBoardLoaded) return;
    _rogueBoardLoaded = true;
    try {
      if (typeof DB === 'undefined') return;
      const [{ data: weekly }, { data: allTime }] = await Promise.all([
        DB.from('rogue_weekly_leaderboard').select('*').order('score', { ascending: false }).limit(10),
        DB.from('rogue_alltime_leaderboard').select('*').order('score', { ascending: false }).limit(10),
      ]);
      _rogueWeeklyBoard = weekly ?? [];
      _rogueAllTimeBoard = allTime ?? [];
    } catch (e) { console.warn('loadRogueBoards:', e); }
  }

  // 嘗試觸發週結算（任何人載入遊戲時，若已過週日則呼叫）
  async function tryWeeklySettle() {
    try {
      if (typeof FUNC_URL === 'undefined') return;
      await fetch(`${FUNC_URL}/rogue-weekly-settle`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}' });
    } catch (_) {}
  }

  function saveResult() {
    // localStorage 備份（離線用）
    const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
    if (!best.score || G.score > best.score) {
      best.score = G.score;
      best.wave  = G.wave;
      best.date  = new Date().toISOString().slice(0, 10);
      localStorage.setItem('rogue_best', JSON.stringify(best));
    }

    // 上傳 Supabase（已登入時）
    if (typeof currentUser !== 'undefined' && currentUser && typeof callEdge === 'function') {
      callEdge('submit-rogue-score', { score: G.score, wave: G.wave }).then(res => {
        if (res.error) console.warn('submit-rogue-score:', res.error);
        // 重新載入排行榜
        _rogueBoardLoaded = false;
        loadRogueBoards();
      });
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
    drawBgEggs();
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
      // 場景名稱
      ctx.font = `${Math.min(16, W * 0.03)}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(curScene.name, W / 2, H * 0.44);
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
    const sc = curScene;

    // 天空（延伸到球門投影位置，覆蓋 horizY 以下的透視空隙）
    const skyBottom = proj(0, FIELD_DEPTH).y + 10;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyBottom);
    const skyStops = sc.sky;
    skyStops.forEach((c, i) => skyGrad.addColorStop(i / (skyStops.length - 1), c));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, skyBottom);

    // 極光效果（低調波紋）
    if (sc.aurora) {
      const t = performance.now() * 0.0003;
      ctx.save();
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 3; i++) {
        const y0 = skyBottom * (0.2 + i * 0.25);
        const grad = ctx.createLinearGradient(0, y0 - 20, 0, y0 + 20);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.5, i % 2 === 0 ? '#66ffaa' : '#aa66ff');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let x = 0; x <= W; x += 20) {
          ctx.lineTo(x, y0 + Math.sin(x * 0.008 + t + i * 2) * 12);
        }
        ctx.lineTo(W, y0 + 30);
        ctx.lineTo(0, y0 + 30);
        ctx.fill();
      }
      ctx.restore();
    }

    // 閃電效果（低頻閃爍）
    if (sc.lightning && Math.random() < 0.006) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, skyBottom);
      ctx.restore();
    }

    // 金色光暈（從上方微弱散射）
    if (sc.golden) {
      const gGrad = ctx.createRadialGradient(W / 2, skyBottom * 0.3, 0, W / 2, skyBottom * 0.3, W * 0.5);
      gGrad.addColorStop(0, 'rgba(255,200,50,0.06)');
      gGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, 0, W, skyBottom);
    }

    // 草地條紋
    const N = 24;
    for (let i = 0; i < N; i++) {
      const z0 = (i / N) * FIELD_DEPTH;
      const z1 = ((i + 1) / N) * FIELD_DEPTH;
      const p0 = proj(0, z0);
      const p1 = proj(0, z1);
      ctx.fillStyle = i % 2 === 0 ? sc.grass[0] : sc.grass[1];
      ctx.fillRect(0, p1.y, W, p0.y - p1.y + 1);
    }

    ctx.strokeStyle = sc.line;
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

    // 禁區（封閉四邊）
    const pw = GOAL_HW + 70, pz = FIELD_DEPTH - 160;
    polyLine([proj(-pw, pz), proj(-pw, FIELD_DEPTH), proj(pw, FIELD_DEPTH), proj(pw, pz), proj(-pw, pz)]);

    // 小禁區（封閉四邊）
    const sw = GOAL_HW + 20, sz2 = FIELD_DEPTH - 60;
    polyLine([proj(-sw, sz2), proj(-sw, FIELD_DEPTH), proj(sw, FIELD_DEPTH), proj(sw, sz2), proj(-sw, sz2)]);

    // 球場上緣背景物件（樹、燈柱）
    drawSceneProps();
    // 球場兩側觀眾
    drawSideCrowd();
  }

  function line(a, b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  function polyLine(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }

  // ─── 背景物件（每個場景固定設計） ──────────────────────────────
  function drawSceneProps() {
    const goalP = proj(0, FIELD_DEPTH);
    const baseY = goalP.y;
    const u = Math.min(1, W / 500);
    ctx.save();

    const name = curScene.name;

    if (name === '巴西') {
      drawCristoRedentor(W * 0.5, baseY, u);
      [0.06, 0.18, 0.82, 0.94].forEach(xp => drawPalmTree(W * xp, baseY, u));
      drawSugarloaf(W * 0.12, baseY, u);
    }

    else if (name === '阿根廷') {
      drawObelisco(W * 0.5, baseY, u);
      [0.1, 0.3, 0.7, 0.9].forEach(xp => drawStadiumLight(W * xp, baseY, u * 0.8, true));
      [0.22, 0.78].forEach(xp => drawFlag(W * xp, baseY, u, '#75aadb'));
    }

    else if (name === '德國') {
      drawBrandenburgGate(W * 0.5, baseY, u);
      drawBeerBarrel(W * 0.12, baseY, u);
      drawBeerBarrel(W * 0.88, baseY, u);
      [0.25, 0.75].forEach(xp => drawStadiumLight(W * xp, baseY, u * 0.7, true));
    }

    else if (name === '義大利') {
      drawPisaTower(W * 0.5, baseY, u);
      drawColosseum(W * 0.82, baseY, u);
      [0.06, 0.22, 0.94].forEach(xp => drawCypressTree(W * xp, baseY, u));
    }

    else if (name === '英格蘭') {
      drawBigBen(W * 0.5, baseY, u);
      drawLondonEye(W * 0.88, baseY, u);
      [0.15, 0.35, 0.7].forEach(xp => drawStadiumLight(W * xp, baseY, u * 0.8, true));
    }

    else if (name === '法國') {
      drawEiffelTower(W * 0.5, baseY, u);
      drawArcDeTriomphe(W * 0.15, baseY, u);
      [0.35, 0.65, 0.85].forEach(xp => drawStadiumLight(W * xp, baseY, u * 0.7, true));
    }

    else if (name === '日本') {
      drawTorii(W * 0.5, baseY, u);
      drawFujiSan(W * 0.85, baseY, u);
      [0.06, 0.3, 0.7].forEach(xp => drawSakuraTree(W * xp, baseY, u));
    }

    ctx.restore();
  }

  // ── 繪製元件 ─────────────────���────────────────────────────
  function drawStadiumLight(x, baseY, u, glow) {
    const pH = 30 * u, pW = 2.5 * u;
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(x - pW / 2, baseY - pH, pW, pH);
    const armW = 10 * u;
    ctx.fillRect(x - armW / 2, baseY - pH, armW, 2.5 * u);
    if (glow) {
      const g = ctx.createRadialGradient(x, baseY - pH, 0, x, baseY - pH + 15 * u, 22 * u);
      g.addColorStop(0, 'rgba(255,240,180,0.2)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(x - 25 * u, baseY - pH - 5 * u, 50 * u, 40 * u);
    }
    ctx.fillStyle = glow ? '#fff3b0' : '#b0bec5';
    [-0.3, 0, 0.3].forEach(off => {
      ctx.beginPath(); ctx.arc(x + armW * off, baseY - pH - 1.5 * u, 1.8 * u, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawPalmTree(x, baseY, u) {
    const tH = 26 * u;
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x - 1.5 * u, baseY - tH, 3 * u, tH);
    ctx.strokeStyle = '#2e5a1e'; ctx.lineWidth = 2 * u;
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI * 0.8 + i * Math.PI * 0.4 / 4;
      ctx.beginPath(); ctx.moveTo(x, baseY - tH);
      ctx.quadraticCurveTo(x + Math.cos(ang) * 14 * u, baseY - tH + Math.sin(ang) * 6 * u - 6 * u,
        x + Math.cos(ang) * 18 * u, baseY - tH + Math.sin(ang) * 10 * u + 2 * u);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function drawFlag(x, baseY, u, color) {
    const pH = 24 * u;
    ctx.fillStyle = '#78909c';
    ctx.fillRect(x - 1 * u, baseY - pH, 2 * u, pH);
    ctx.fillStyle = color || '#c62828';
    ctx.beginPath();
    ctx.moveTo(x + 1 * u, baseY - pH); ctx.lineTo(x + 10 * u, baseY - pH + 3 * u);
    ctx.lineTo(x + 1 * u, baseY - pH + 7 * u); ctx.closePath(); ctx.fill();
  }

  // ── 國家地標繪製 ────────────────────────────────────────────

  // 巴西：基督像
  function drawCristoRedentor(x, baseY, u) {
    const h = 40 * u;
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.moveTo(x - 8 * u, baseY); ctx.lineTo(x - 5 * u, baseY - 8 * u);
    ctx.lineTo(x + 5 * u, baseY - 8 * u); ctx.lineTo(x + 8 * u, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x - 2 * u, baseY - 8 * u - h * 0.65, 4 * u, h * 0.65);
    ctx.fillRect(x - 18 * u, baseY - 8 * u - h * 0.6, 36 * u, 3 * u);
    ctx.beginPath(); ctx.arc(x, baseY - 8 * u - h * 0.7, 3 * u, 0, Math.PI * 2); ctx.fill();
  }

  // 巴西：糖麵包山
  function drawSugarloaf(x, baseY, u) {
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.moveTo(x - 14 * u, baseY);
    ctx.quadraticCurveTo(x - 4 * u, baseY - 28 * u, x, baseY - 30 * u);
    ctx.quadraticCurveTo(x + 4 * u, baseY - 28 * u, x + 14 * u, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(x - 4 * u, baseY);
    ctx.quadraticCurveTo(x - 2 * u, baseY - 24 * u, x, baseY - 30 * u);
    ctx.quadraticCurveTo(x + 1 * u, baseY - 26 * u, x + 2 * u, baseY);
    ctx.closePath(); ctx.fill();
  }

  // 阿根廷：方尖碑
  function drawObelisco(x, baseY, u) {
    const h = 45 * u;
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(x, baseY - h);
    ctx.lineTo(x - 4 * u, baseY - h + 8 * u);
    ctx.lineTo(x - 3 * u, baseY); ctx.lineTo(x + 3 * u, baseY);
    ctx.lineTo(x + 4 * u, baseY - h + 8 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, baseY - h);
    ctx.lineTo(x + 4 * u, baseY - h + 8 * u);
    ctx.lineTo(x + 3 * u, baseY); ctx.lineTo(x, baseY);
    ctx.closePath(); ctx.fill();
  }

  // 德國：布蘭登堡門
  function drawBrandenburgGate(x, baseY, u) {
    const gw = 36 * u, gh = 32 * u;
    ctx.fillStyle = '#bdb76b';
    for (let i = 0; i < 6; i++) {
      const px = x - gw / 2 + i * gw / 5;
      ctx.fillRect(px - 1.2 * u, baseY - gh, 2.4 * u, gh);
    }
    ctx.fillStyle = '#a0975a';
    ctx.fillRect(x - gw / 2 - 2 * u, baseY - gh - 3 * u, gw + 4 * u, 3 * u);
    ctx.fillRect(x - gw / 2, baseY - gh - 6 * u, gw, 3 * u);
    ctx.fillStyle = '#8a7e40';
    ctx.beginPath();
    ctx.moveTo(x - 5 * u, baseY - gh - 6 * u);
    ctx.lineTo(x - 3 * u, baseY - gh - 12 * u);
    ctx.lineTo(x + 3 * u, baseY - gh - 12 * u);
    ctx.lineTo(x + 5 * u, baseY - gh - 6 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 7 * u, baseY - gh - 9 * u, 14 * u, 2 * u);
  }

  // 德國：啤酒桶
  function drawBeerBarrel(x, baseY, u) {
    ctx.fillStyle = '#8d6e46';
    ctx.beginPath(); ctx.ellipse(x, baseY - 8 * u, 7 * u, 8 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.ellipse(x, baseY - 12 * u, 6 * u, 2 * u, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, baseY - 4 * u, 6 * u, 2 * u, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(x - 3 * u, baseY - 22 * u, 6 * u, 8 * u);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x, baseY - 22 * u, 3.5 * u, 1.5 * u, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 義大利：比薩斜塔
  function drawPisaTower(x, baseY, u) {
    const h = 42 * u, lean = 4 * u;
    ctx.save(); ctx.translate(x, baseY);
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-4 * u + lean, -h); ctx.lineTo(4 * u + lean, -h);
    ctx.lineTo(4 * u, 0); ctx.lineTo(-4 * u, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.5;
    for (let i = 1; i <= 6; i++) {
      const y = -i * h / 7, lx = lean * (i / 7);
      ctx.beginPath(); ctx.moveTo(-4 * u + lx, y); ctx.lineTo(4 * u + lx, y); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(lean, -h - 2 * u, 3 * u, 2 * u, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d8d0c0'; ctx.fill();
    ctx.restore();
  }

  // 義大利：羅馬競技場
  function drawColosseum(x, baseY, u) {
    const w = 30 * u, h = 22 * u;
    ctx.fillStyle = '#c4a87c';
    ctx.beginPath(); ctx.ellipse(x, baseY - h * 0.4, w, h * 0.6, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - w, baseY - h * 0.4, w * 2, h * 0.4);
    ctx.fillStyle = '#8b7355';
    for (let i = -3; i <= 3; i++) {
      const ax = x + i * 7 * u;
      ctx.beginPath(); ctx.arc(ax, baseY - h * 0.55, 2.5 * u, Math.PI, 0); ctx.fill();
      ctx.fillRect(ax - 2.5 * u, baseY - h * 0.55, 5 * u, 4 * u);
      ctx.beginPath(); ctx.arc(ax, baseY - h * 0.2, 2.5 * u, Math.PI, 0); ctx.fill();
      ctx.fillRect(ax - 2.5 * u, baseY - h * 0.2, 5 * u, 4 * u);
    }
  }

  // 義大利：柏樹
  function drawCypressTree(x, baseY, u) {
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x - 1 * u, baseY - 8 * u, 2 * u, 8 * u);
    ctx.fillStyle = '#2e5a1e';
    ctx.beginPath(); ctx.ellipse(x, baseY - 8 * u - 12 * u, 4 * u, 14 * u, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b4e15';
    ctx.beginPath(); ctx.ellipse(x + 1 * u, baseY - 8 * u - 10 * u, 3 * u, 12 * u, 0, 0, Math.PI * 2); ctx.fill();
  }

  // 英格蘭：大笨鐘
  function drawBigBen(x, baseY, u) {
    const h = 48 * u;
    ctx.fillStyle = '#c4a87c';
    ctx.fillRect(x - 5 * u, baseY - h, 10 * u, h);
    ctx.fillStyle = '#f5f5dc';
    ctx.beginPath(); ctx.arc(x, baseY - h * 0.7, 4 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(x, baseY - h * 0.7, 4 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1 * u;
    ctx.beginPath(); ctx.moveTo(x, baseY - h * 0.7); ctx.lineTo(x, baseY - h * 0.7 - 3 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, baseY - h * 0.7); ctx.lineTo(x + 2 * u, baseY - h * 0.7); ctx.stroke();
    ctx.fillStyle = '#8a7e40';
    ctx.beginPath();
    ctx.moveTo(x, baseY - h - 8 * u);
    ctx.lineTo(x - 4 * u, baseY - h); ctx.lineTo(x + 4 * u, baseY - h);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;
  }

  // 英格蘭：倫敦眼
  function drawLondonEye(x, baseY, u) {
    const r = 20 * u;
    ctx.strokeStyle = '#78909c'; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY - r - 5 * u); ctx.stroke();
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.arc(x, baseY - r - 5 * u, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(144,164,174,0.4)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(x, baseY - r - 5 * u);
      ctx.lineTo(x + Math.cos(a) * r, baseY - r - 5 * u + Math.sin(a) * r); ctx.stroke();
    }
    ctx.fillStyle = '#42a5f5';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, baseY - r - 5 * u + Math.sin(a) * r, 2 * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1;
  }

  // 法國：艾菲爾鐵塔
  function drawEiffelTower(x, baseY, u) {
    const h = 50 * u;
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.moveTo(x - 12 * u, baseY); ctx.lineTo(x - 2 * u, baseY - h * 0.65);
    ctx.lineTo(x + 2 * u, baseY - h * 0.65); ctx.lineTo(x + 12 * u, baseY);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 2 * u, baseY - h * 0.65); ctx.lineTo(x - 0.5 * u, baseY - h);
    ctx.lineTo(x + 0.5 * u, baseY - h); ctx.lineTo(x + 2 * u, baseY - h * 0.65);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 0.3 * u, baseY - h - 5 * u, 0.6 * u, 5 * u);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(x, baseY, 6 * u, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x - 8 * u, baseY - h * 0.35, 16 * u, 1.5 * u);
    ctx.fillRect(x - 3 * u, baseY - h * 0.65, 6 * u, 1.5 * u);
  }

  // 法國：凱旋門
  function drawArcDeTriomphe(x, baseY, u) {
    const w = 20 * u, h = 28 * u;
    ctx.fillStyle = '#c4a87c';
    ctx.fillRect(x - w / 2, baseY - h, w, h);
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.arc(x, baseY - h * 0.35, 5 * u, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 5 * u, baseY - h * 0.35, 10 * u, h * 0.35);
    ctx.fillStyle = '#a0975a';
    ctx.fillRect(x - w / 2 - 1 * u, baseY - h - 2 * u, w + 2 * u, 2 * u);
    ctx.fillRect(x - w / 2 + 2 * u, baseY - h - 4 * u, w - 4 * u, 2 * u);
  }

  // 日本：鳥居
  function drawTorii(x, baseY, u) {
    const h = 35 * u;
    ctx.fillStyle = '#c62828';
    ctx.fillRect(x - 12 * u, baseY - h, 3 * u, h);
    ctx.fillRect(x + 9 * u, baseY - h, 3 * u, h);
    ctx.beginPath();
    ctx.moveTo(x - 16 * u, baseY - h + 1 * u);
    ctx.quadraticCurveTo(x, baseY - h - 3 * u, x + 16 * u, baseY - h + 1 * u);
    ctx.lineTo(x + 16 * u, baseY - h + 3 * u);
    ctx.quadraticCurveTo(x, baseY - h - 1 * u, x - 16 * u, baseY - h + 3 * u);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 13 * u, baseY - h + 6 * u, 26 * u, 2 * u);
  }

  // 日本：富士山
  function drawFujiSan(x, baseY, u) {
    ctx.fillStyle = '#3949ab';
    ctx.beginPath();
    ctx.moveTo(x - 20 * u, baseY); ctx.lineTo(x, baseY - 32 * u); ctx.lineTo(x + 20 * u, baseY);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 5 * u, baseY - 24 * u); ctx.lineTo(x, baseY - 32 * u); ctx.lineTo(x + 5 * u, baseY - 24 * u);
    ctx.quadraticCurveTo(x + 2 * u, baseY - 22 * u, x, baseY - 25 * u);
    ctx.quadraticCurveTo(x - 2 * u, baseY - 22 * u, x - 5 * u, baseY - 24 * u);
    ctx.closePath(); ctx.fill();
  }

  // 日本：櫻花樹
  function drawSakuraTree(x, baseY, u) {
    const tH = 14 * u;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 1.5 * u, baseY - tH, 3 * u, tH);
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.moveTo(x, baseY - tH); ctx.lineTo(x - 8 * u, baseY - tH - 6 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, baseY - tH); ctx.lineTo(x + 8 * u, baseY - tH - 5 * u); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f8bbd0';
    ctx.beginPath(); ctx.arc(x, baseY - tH - 6 * u, 7 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 7 * u, baseY - tH - 5 * u, 5 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7 * u, baseY - tH - 4 * u, 5 * u, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f48fb1';
    ctx.beginPath(); ctx.arc(x - 3 * u, baseY - tH - 8 * u, 4 * u, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4 * u, baseY - tH - 7 * u, 4 * u, 0, Math.PI * 2); ctx.fill();
  }

  // ─── 球場兩側場景 ──────────────────────────────────────────
  // 場景邊線配置：護欄、觀眾剪影、特殊物件
  const SCENE_SIDE = {
    '巴西': {
      barrier: '#1a6b30', barrierH: '#228b3a',
      crowd: '#0d4020', crowdH: '#165028',
      specials: [
        { z: 300, side: -1, type: 'palm' },
        { z: 700, side: 1, type: 'palm' },
        { z: 500, side: -1, type: 'bird' },
      ]
    },
    '阿根廷': {
      barrier: '#1565c0', barrierH: '#1976d2',
      crowd: '#0d47a1', crowdH: '#1565c0',
      specials: [
        { z: 200, side: -1, type: 'flag' },
        { z: 500, side: 1, type: 'flag' },
        { z: 800, side: -1, type: 'balloon' },
        { z: 400, side: 1, type: 'balloon' },
      ]
    },
    '德國': {
      barrier: '#455a64', barrierH: '#546e7a',
      crowd: '#37474f', crowdH: '#455a64',
      specials: [
        { z: 300, side: -1, type: 'banner' },
        { z: 600, side: 1, type: 'banner' },
        { z: 450, side: 1, type: 'flag' },
      ]
    },
    '義大利': {
      barrier: '#1a237e', barrierH: '#283593',
      crowd: '#0d1440', crowdH: '#162060',
      specials: [
        { z: 250, side: -1, type: 'flag' },
        { z: 550, side: 1, type: 'flag' },
        { z: 800, side: -1, type: 'banner' },
      ]
    },
    '英格蘭': {
      barrier: '#1a1a2e', barrierH: '#252540',
      crowd: '#121225', crowdH: '#1a1a35',
      specials: [
        { z: 400, side: -1, type: 'umbrella' },
        { z: 700, side: 1, type: 'umbrella' },
        { z: 250, side: 1, type: 'banner' },
      ]
    },
    '法國': {
      barrier: '#1a2840', barrierH: '#203248',
      crowd: '#0f1830', crowdH: '#152038',
      specials: [
        { z: 300, side: -1, type: 'flag' },
        { z: 600, side: 1, type: 'flag' },
        { z: 800, side: -1, type: 'balloon' },
      ]
    },
    '日本': {
      barrier: '#4a3800', barrierH: '#5a4400',
      crowd: '#2a1e00', crowdH: '#3a2800',
      specials: [
        { z: 250, side: -1, type: 'vipflag' },
        { z: 550, side: 1, type: 'vipflag' },
        { z: 800, side: -1, type: 'camera' },
      ]
    },
  };

  // ─── 左上/右上三角空地 ─────────────────────────────────────
  // 每場景可用的物件類型池，每波隨機生成
  const CORNER_TYPES = {
    '巴西': ['rock','bush','cone','bush','rock'],
    '阿根廷': ['bench','cooler','bench','cone','bush'],
    '德國': ['bench','bin','cone','bench','cone'],
    '義大利': ['rock','bush','bench','rock','bush'],
    '英格蘭': ['puddle','cone','puddle','bin','puddle'],
    '法國': ['bench','bush','cone','bench','bush'],
    '日本': ['vipchair','speaker','vipchair','speaker','vipchair'],
  };

  // 地面彩蛋：每次 WARNING（每5波）解鎖
  const EGGS = [
    { minWave: 5,  weight: 10, type: 'cat' },
    { minWave: 5,  weight: 10, type: 'bird_nest' },
    { minWave: 5,  weight: 8,  type: 'football' },
    { minWave: 10, weight: 7,  type: 'campfire' },
    { minWave: 10, weight: 6,  type: 'mushroom' },
    { minWave: 15, weight: 5,  type: 'treasure' },
    { minWave: 15, weight: 5,  type: 'robot' },
    { minWave: 20, weight: 4,  type: 'dragon' },
    { minWave: 20, weight: 4,  type: 'unicorn' },
    { minWave: 25, weight: 3,  type: 'rocket' },
    { minWave: 30, weight: 3,  type: 'crown' },
    { minWave: 35, weight: 3,  type: 'tent' },       // 帳篷
    { minWave: 40, weight: 2,  type: 'portal' },     // 傳送門
    { minWave: 45, weight: 2,  type: 'tank' },       // 玩具坦克
    { minWave: 50, weight: 2,  type: 'crystal' },    // 水晶
    { minWave: 55, weight: 1,  type: 'totem' },      // 圖騰柱
    { minWave: 60, weight: 1,  type: 'alien' },      // 外星人
    { minWave: 65, weight: 1,  type: 'phoenix_nest' }, // 鳳凰巢
    { minWave: 70, weight: 1,  type: 'blackhole' },  // 黑洞
    { minWave: 75, weight: 1,  type: 'worldcup' },   // 世界盃
  ];

  // 天空彩蛋：專屬天空的物件，有動畫
  const SKY_EGGS = [
    { minWave: 5,  weight: 10, type: 'sky_bird' },      // 飛鳥群
    { minWave: 5,  weight: 8,  type: 'sky_cloud' },     // 小雲朵
    { minWave: 10, weight: 7,  type: 'sky_plane' },     // 小飛機
    { minWave: 10, weight: 6,  type: 'sky_kite' },      // 風箏
    { minWave: 15, weight: 5,  type: 'sky_balloon' },   // 熱氣球
    { minWave: 20, weight: 4,  type: 'sky_ufo' },       // UFO（緩飄）
    { minWave: 25, weight: 4,  type: 'sky_blimp' },     // 飛船
    { minWave: 30, weight: 3,  type: 'sky_firework' },  // 煙火
    { minWave: 35, weight: 2,  type: 'sky_santa' },     // 聖誕老人雪橇
    { minWave: 40, weight: 2,  type: 'sky_witch' },     // 騎掃帚巫師
    { minWave: 45, weight: 2,  type: 'sky_pegasus' },   // 飛馬
    { minWave: 50, weight: 2,  type: 'sky_rocket' },    // 飛行火箭（噴焰）
    { minWave: 55, weight: 1,  type: 'sky_dragon' },    // 飛龍
    { minWave: 60, weight: 1,  type: 'sky_whale' },     // 天空鯨魚
    { minWave: 65, weight: 1,  type: 'sky_castle' },    // 天空之城
    { minWave: 70, weight: 1,  type: 'sky_phoenix' },   // 鳳凰
    { minWave: 75, weight: 1,  type: 'sky_star' },      // 流星雨
  ];

  let _cornerProps = []; // 當前波的角落物件

  function generateCornerProps() {
    const types = CORNER_TYPES[curScene.name];
    if (!types) { _cornerProps = []; return; }
    const wave = G ? G.wave : 1;
    const props = [];
    const slots = [
      { zMin: 0.85, zMax: 0.95, xMin: 200, xMax: 600 },
      { zMin: 0.75, zMax: 0.85, xMin: 180, xMax: 500 },
      { zMin: 0.65, zMax: 0.75, xMin: 150, xMax: 450 },
      { zMin: 0.55, zMax: 0.65, xMin: 130, xMax: 380 },
      { zMin: 0.45, zMax: 0.55, xMin: 110, xMax: 300 },
      { zMin: 0.3, zMax: 0.45, xMin: 80, xMax: 200 },
      { zMin: 0.15, zMax: 0.3, xMin: 60, xMax: 150 },
    ];

    // 計算這波可出現的彩蛋數量（每過一次 WARNING 多 1 個）
    const eggCount = Math.min(8, Math.floor(wave / 5));
    // 篩選可用彩蛋
    const available = EGGS.filter(e => wave >= e.minWave);

    // 加權隨機選彩蛋
    function pickEgg() {
      if (!available.length) return null;
      const total = available.reduce((s, e) => s + e.weight, 0);
      let r = Math.random() * total;
      for (const e of available) { r -= e.weight; if (r <= 0) return e.type; }
      return available[available.length - 1].type;
    }

    // 先收集所有 slot 位置
    const allSlots = [];
    for (const side of [-1, 1]) {
      for (const slot of slots) {
        allSlots.push({ side, slot });
      }
    }

    // 隨機選幾個 slot 放彩蛋
    const eggSlots = new Set();
    const shuffled = allSlots.map((_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < eggCount && i < shuffled.length; i++) {
      eggSlots.add(shuffled[i]);
    }

    allSlots.forEach((s, idx) => {
      const { side, slot } = s;
      const zPct = slot.zMin + Math.random() * (slot.zMax - slot.zMin);
      const xOff = slot.xMin + Math.random() * (slot.xMax - slot.xMin);
      let type;
      if (eggSlots.has(idx)) {
        type = pickEgg() || types[Math.floor(Math.random() * types.length)];
      } else {
        type = types[Math.floor(Math.random() * types.length)];
      }
      props.push({ side, zPct, xOff, type });
    });

    _cornerProps = props;
  }

  function drawCornerAreas(cfg) {
    const name = curScene.name;
    const topY = proj(0, FIELD_DEPTH).y; // 場地上緣 y（水平截止線）

    for (const side of [-1, 1]) {
      // 沿邊線的投影點
      const edgePts = [];
      for (let z = 0; z <= FIELD_DEPTH; z += 40) {
        edgePts.push(proj(side * FIELD_HW, z));
      }

      // 三角區域：水平頂邊 → 邊線 → 底邊，不超過 topY
      ctx.beginPath();
      const farX = side === -1 ? 0 : W;
      ctx.moveTo(farX, topY);
      // 沿邊線從遠到近
      for (let i = edgePts.length - 1; i >= 0; i--) {
        if (edgePts[i].y < topY) continue; // 跳過超出上緣的
        ctx.lineTo(edgePts[i].x, edgePts[i].y);
      }
      ctx.lineTo(farX, H);
      ctx.closePath();

      // 底色
      const cornerColors = {
        '巴西': '#1a1510', '阿根廷': '#1a3a20',
        '德國': '#2a3038', '義大利': '#0a1020',
        '英格蘭': '#0e0e1a', '法國': '#0a1820',
        '日本': '#0e0a00',
      };
      ctx.fillStyle = cornerColors[name] || '#111';
      ctx.fill();

      // 質感 + 物件（clip 到三角內）
      ctx.save();
      ctx.clip();

      // 場外地面質感
      const tints = {
        '巴西': 'rgba(120,90,50,0.06)',
        '阿根廷': 'rgba(40,100,40,0.08)',
        '德國': 'rgba(60,70,80,0.06)',
        '義大利': 'rgba(100,80,60,0.08)',
        '英格蘭': 'rgba(30,30,50,0.05)',
        '法國': 'rgba(200,220,240,0.04)',
        '日本': 'rgba(200,170,0,0.05)',
      };
      if (tints[name]) {
        ctx.fillStyle = tints[name];
        for (let z = 50; z < FIELD_DEPTH; z += 100) {
          const p = proj(side * (FIELD_HW + 80), z);
          if (p.y < topY) continue;
          ctx.beginPath(); ctx.arc(p.x, p.y, 14 * p.s * 5, 0, Math.PI * 2); ctx.fill();
        }
      }

      // 角落物件
      if (_cornerProps.length) {
        for (const pr of _cornerProps) {
          if (pr.side !== side) continue;
          const z = FIELD_DEPTH * pr.zPct;
          const p = proj(pr.side * (FIELD_HW + pr.xOff), z);
          if (p.y < topY) continue;
          const s = p.s * 5;
          switch (pr.type) {
            case 'bench': _drawCornerBench(p.x, p.y, s); break;
            case 'cone': _drawCornerCone(p.x, p.y, s); break;
            case 'rock': _drawCornerRock(p.x, p.y, s); break;
            case 'cactus': _drawCornerCactus(p.x, p.y, s); break;
            case 'bush': _drawCornerBush(p.x, p.y, s); break;
            case 'cooler': _drawCornerCooler(p.x, p.y, s); break;
            case 'puddle': _drawCornerPuddle(p.x, p.y, s); break;
            case 'bin': _drawCornerBin(p.x, p.y, s); break;
            case 'igloo': _drawCornerIgloo(p.x, p.y, s); break;
            case 'snowpile': _drawCornerSnowpile(p.x, p.y, s); break;
            case 'speaker': _drawCornerSpeaker(p.x, p.y, s); break;
            case 'vipchair': _drawCornerVIPChair(p.x, p.y, s); break;
            // 彩蛋
            case 'cat': _drawEggCat(p.x, p.y, s); break;
            case 'bird_nest': _drawEggNest(p.x, p.y, s); break;
            case 'football': _drawEggFootball(p.x, p.y, s); break;
            case 'campfire': _drawEggCampfire(p.x, p.y, s); break;
            case 'ufo': _drawEggUFO(p.x, p.y, s); break;
            case 'mushroom': _drawEggMushroom(p.x, p.y, s); break;
            case 'treasure': _drawEggTreasure(p.x, p.y, s); break;
            case 'robot': _drawEggRobot(p.x, p.y, s); break;
            case 'dragon': _drawEggDragon(p.x, p.y, s); break;
            case 'unicorn': _drawEggUnicorn(p.x, p.y, s); break;
            case 'rocket': _drawEggRocket(p.x, p.y, s); break;
            case 'crown': _drawEggCrown(p.x, p.y, s); break;
            case 'tent': _drawEggTent(p.x, p.y, s); break;
            case 'portal': _drawEggPortal(p.x, p.y, s); break;
            case 'tank': _drawEggTank(p.x, p.y, s); break;
            case 'crystal': _drawEggCrystal(p.x, p.y, s); break;
            case 'totem': _drawEggTotem(p.x, p.y, s); break;
            case 'alien': _drawEggAlien(p.x, p.y, s); break;
            case 'phoenix_nest': _drawEggPhoenixNest(p.x, p.y, s); break;
            case 'blackhole': _drawEggBlackhole(p.x, p.y, s); break;
            case 'worldcup': _drawEggWorldcup(p.x, p.y, s); break;
          }
        }
      }

      ctx.restore();
    }
  }

  // ── 角落物件（簡約單/雙色） ────────────────────────────────
  function _drawCornerBench(x, y, s) {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 8 * s, y - 3 * s, 16 * s, 2 * s); // 座面
    ctx.fillRect(x - 7 * s, y - 1 * s, 2 * s, 3 * s);   // 左腳
    ctx.fillRect(x + 5 * s, y - 1 * s, 2 * s, 3 * s);   // 右腳
  }

  function _drawCornerCone(x, y, s) {
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.moveTo(x, y - 8 * s);
    ctx.lineTo(x - 3 * s, y);
    ctx.lineTo(x + 3 * s, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 2 * s, y - 4 * s, 4 * s, 1.5 * s);
  }

  function _drawCornerRock(x, y, s) {
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y);
    ctx.lineTo(x - 4 * s, y - 5 * s);
    ctx.lineTo(x + 2 * s, y - 6 * s);
    ctx.lineTo(x + 6 * s, y - 3 * s);
    ctx.lineTo(x + 5 * s, y);
    ctx.closePath(); ctx.fill();
  }

  function _drawCornerCactus(x, y, s) {
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(x - 1.5 * s, y - 12 * s, 3 * s, 12 * s);
    ctx.fillRect(x + 1.5 * s, y - 10 * s, 5 * s, 2 * s);
    ctx.fillRect(x + 4.5 * s, y - 14 * s, 2 * s, 6 * s);
    ctx.fillRect(x - 6.5 * s, y - 8 * s, 5 * s, 2 * s);
    ctx.fillRect(x - 6.5 * s, y - 12 * s, 2 * s, 6 * s);
  }

  function _drawCornerBush(x, y, s) {
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.arc(x, y - 3 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath(); ctx.arc(x - 3 * s, y - 2 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4 * s, y - 2 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawCornerCooler(x, y, s) {
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(x - 5 * s, y - 5 * s, 10 * s, 5 * s);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x - 5 * s, y - 6 * s, 10 * s, 1.5 * s);
  }

  function _drawCornerPuddle(x, y, s) {
    ctx.fillStyle = 'rgba(100,130,160,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y - 1 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  }

  function _drawCornerBin(x, y, s) {
    ctx.fillStyle = '#455a64';
    ctx.fillRect(x - 3 * s, y - 7 * s, 6 * s, 7 * s);
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(x - 3.5 * s, y - 8 * s, 7 * s, 1.5 * s);
  }

  function _drawCornerIgloo(x, y, s) {
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.arc(x, y, 7 * s, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.arc(x, y, 3 * s, Math.PI, 0);
    ctx.closePath(); ctx.fill();
  }

  function _drawCornerSnowpile(x, y, s) {
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath(); ctx.arc(x, y - 2 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eceff1';
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 3 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawCornerSpeaker(x, y, s) {
    ctx.fillStyle = '#212121';
    ctx.fillRect(x - 4 * s, y - 8 * s, 8 * s, 8 * s);
    ctx.fillStyle = '#424242';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawCornerVIPChair(x, y, s) {
    ctx.fillStyle = '#4a3800';
    ctx.fillRect(x - 4 * s, y - 3 * s, 8 * s, 3 * s); // 座墊
    ctx.fillRect(x - 4 * s, y - 8 * s, 1.5 * s, 8 * s); // 椅背左
    ctx.fillRect(x + 2.5 * s, y - 8 * s, 1.5 * s, 8 * s); // 椅背右
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(x - 3.5 * s, y - 3.5 * s, 7 * s, 1 * s); // 金邊
  }

  // ── 彩蛋物件繪製（簡約雙色風格） ──────────────────────────
  function _drawEggCat(x, y, s) {
    // 蜷縮的貓
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5 * s, y - 7 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    // 耳朵
    ctx.beginPath(); ctx.moveTo(x + 3 * s, y - 10 * s); ctx.lineTo(x + 5 * s, y - 13 * s); ctx.lineTo(x + 7 * s, y - 10 * s); ctx.fill();
    // 尾巴
    ctx.strokeStyle = '#ff8f00'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 4 * s);
    ctx.quadraticCurveTo(x - 10 * s, y - 10 * s, x - 7 * s, y - 12 * s); ctx.stroke();
    // zzz
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${3 * s}px sans-serif`; ctx.textAlign = 'left';
    ctx.fillText('z', x + 8 * s, y - 10 * s);
    ctx.fillText('z', x + 10 * s, y - 13 * s);
    ctx.lineWidth = 1;
  }

  function _drawEggNest(x, y, s) {
    // 鳥巢 + 蛋
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.ellipse(x, y - 2 * s, 7 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath(); ctx.ellipse(x, y - 3 * s, 5 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 蛋
    ctx.fillStyle = '#eceff1';
    [-2, 0, 2].forEach(dx => {
      ctx.beginPath(); ctx.ellipse(x + dx * s, y - 4 * s, 1.5 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  function _drawEggFootball(x, y, s) {
    // 被遺忘的足球
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#424242';
    // 五角形花紋
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 2 * s, y - 4 * s + Math.sin(a) * 2 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    }
  }

  function _drawEggCampfire(x, y, s) {
    // 木頭
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 5 * s, y - 2 * s, 4 * s, 2 * s);
    ctx.fillRect(x + 1 * s, y - 2 * s, 4 * s, 2 * s);
    // 火焰
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.moveTo(x, y - 10 * s); ctx.quadraticCurveTo(x - 4 * s, y - 4 * s, x - 3 * s, y - 2 * s);
    ctx.lineTo(x + 3 * s, y - 2 * s); ctx.quadraticCurveTo(x + 4 * s, y - 4 * s, x, y - 10 * s); ctx.fill();
    ctx.fillStyle = '#ffd600';
    ctx.beginPath(); ctx.moveTo(x, y - 8 * s); ctx.quadraticCurveTo(x - 2 * s, y - 4 * s, x - 1.5 * s, y - 2 * s);
    ctx.lineTo(x + 1.5 * s, y - 2 * s); ctx.quadraticCurveTo(x + 2 * s, y - 4 * s, x, y - 8 * s); ctx.fill();
  }

  function _drawEggUFO(x, y, s) {
    // 飛碟
    ctx.fillStyle = '#78909c';
    ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath(); ctx.arc(x, y - 9 * s, 4 * s, Math.PI, 0); ctx.fill();
    // 光束
    ctx.fillStyle = 'rgba(130,255,130,0.15)';
    ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 5 * s); ctx.lineTo(x - 6 * s, y + 2 * s);
    ctx.lineTo(x + 6 * s, y + 2 * s); ctx.lineTo(x + 3 * s, y - 5 * s); ctx.fill();
    // 燈
    ctx.fillStyle = '#76ff03';
    [-3, 0, 3].forEach(dx => {
      ctx.beginPath(); ctx.arc(x + dx * s, y - 6 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    });
  }

  function _drawEggMushroom(x, y, s) {
    // 蘑菇
    ctx.fillStyle = '#efebe9';
    ctx.fillRect(x - 1.5 * s, y - 5 * s, 3 * s, 5 * s);
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(x, y - 6 * s, 5 * s, Math.PI, 0); ctx.fill();
    // 白點
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 8 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 7 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 10 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggTreasure(x, y, s) {
    // 寶箱
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 5 * s, y - 5 * s, 10 * s, 5 * s);
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath(); ctx.arc(x, y - 5 * s, 5 * s, Math.PI, 0); ctx.fill();
    // 金邊
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(x - 5 * s, y - 5.5 * s, 10 * s, 1 * s);
    // 鎖
    ctx.beginPath(); ctx.arc(x, y - 5 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    // 金光
    ctx.fillStyle = 'rgba(255,215,0,0.2)';
    ctx.beginPath(); ctx.arc(x, y - 5 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggRobot(x, y, s) {
    // 小機器人
    ctx.fillStyle = '#78909c';
    ctx.fillRect(x - 4 * s, y - 8 * s, 8 * s, 8 * s); // 身
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(x - 3 * s, y - 14 * s, 6 * s, 6 * s); // 頭
    // 眼睛
    ctx.fillStyle = '#76ff03';
    ctx.fillRect(x - 2 * s, y - 12 * s, 1.5 * s, 1.5 * s);
    ctx.fillRect(x + 0.5 * s, y - 12 * s, 1.5 * s, 1.5 * s);
    // 天線
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(x - 0.4 * s, y - 17 * s, 0.8 * s, 3 * s);
    ctx.fillStyle = '#ff1744';
    ctx.beginPath(); ctx.arc(x, y - 17.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggDragon(x, y, s) {
    // 小龍
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(x, y - 5 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); // 身
    ctx.beginPath(); ctx.arc(x + 6 * s, y - 9 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill(); // 頭
    // 角
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath(); ctx.moveTo(x + 5 * s, y - 12 * s); ctx.lineTo(x + 4 * s, y - 16 * s); ctx.lineTo(x + 7 * s, y - 12 * s); ctx.fill();
    // 眼
    ctx.fillStyle = '#ff1744';
    ctx.beginPath(); ctx.arc(x + 7.5 * s, y - 10 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    // 翅膀
    ctx.fillStyle = 'rgba(76,175,80,0.5)';
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 7 * s);
    ctx.quadraticCurveTo(x - 1 * s, y - 16 * s, x + 5 * s, y - 12 * s); ctx.lineTo(x + 2 * s, y - 7 * s); ctx.fill();
    // 火焰
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.moveTo(x + 9 * s, y - 9 * s); ctx.lineTo(x + 15 * s, y - 8 * s); ctx.lineTo(x + 9 * s, y - 7 * s); ctx.fill();
  }

  function _drawEggUnicorn(x, y, s) {
    // 獨角獸
    ctx.fillStyle = '#e1bee7';
    ctx.beginPath(); ctx.ellipse(x, y - 5 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); // 身
    ctx.beginPath(); ctx.arc(x + 6 * s, y - 9 * s, 3 * s, 0, Math.PI * 2); ctx.fill(); // 頭
    // 角
    ctx.fillStyle = '#ffd600';
    ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 12 * s); ctx.lineTo(x + 5.5 * s, y - 18 * s); ctx.lineTo(x + 7.5 * s, y - 12 * s); ctx.fill();
    // 鬃毛
    ctx.fillStyle = '#f48fb1';
    ctx.beginPath(); ctx.moveTo(x + 4 * s, y - 10 * s);
    ctx.quadraticCurveTo(x + 1 * s, y - 14 * s, x - 1 * s, y - 8 * s); ctx.lineTo(x + 2 * s, y - 7 * s); ctx.fill();
    // 腿
    ctx.fillStyle = '#e1bee7';
    [-3, -1, 1, 3].forEach(dx => ctx.fillRect(x + dx * s, y - 1 * s, 1.5 * s, 4 * s));
  }

  function _drawEggRocket(x, y, s) {
    // 火箭
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x - 2.5 * s, y - 16 * s, 5 * s, 12 * s);
    // 頭錐
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.moveTo(x, y - 22 * s); ctx.lineTo(x - 2.5 * s, y - 16 * s); ctx.lineTo(x + 2.5 * s, y - 16 * s); ctx.fill();
    // 尾翼
    ctx.fillStyle = '#1565c0';
    ctx.beginPath(); ctx.moveTo(x - 2.5 * s, y - 4 * s); ctx.lineTo(x - 5 * s, y); ctx.lineTo(x - 2.5 * s, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 2.5 * s, y - 4 * s); ctx.lineTo(x + 5 * s, y); ctx.lineTo(x + 2.5 * s, y); ctx.fill();
    // 火焰
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 4 * s); ctx.quadraticCurveTo(x, y + 4 * s, x + 2 * s, y - 4 * s); ctx.fill();
    // 窗
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath(); ctx.arc(x, y - 12 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggCrown(x, y, s) {
    // 皇冠
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y);
    ctx.lineTo(x - 6 * s, y - 6 * s);
    ctx.lineTo(x - 3 * s, y - 3 * s);
    ctx.lineTo(x, y - 8 * s);
    ctx.lineTo(x + 3 * s, y - 3 * s);
    ctx.lineTo(x + 6 * s, y - 6 * s);
    ctx.lineTo(x + 6 * s, y);
    ctx.closePath(); ctx.fill();
    // 寶石
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2196f3';
    ctx.beginPath(); ctx.arc(x - 3 * s, y - 2.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3 * s, y - 2.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    // 金光
    ctx.fillStyle = 'rgba(255,215,0,0.15)';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggTent(x, y, s) {
    // 帳篷
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(x, y - 12 * s);
    ctx.lineTo(x - 8 * s, y);
    ctx.lineTo(x + 8 * s, y);
    ctx.closePath(); ctx.fill();
    // 門
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(x, y - 2 * s);
    ctx.lineTo(x - 3 * s, y);
    ctx.lineTo(x + 3 * s, y);
    ctx.closePath(); ctx.fill();
    // 旗子
    ctx.strokeStyle = '#8b4513'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x, y - 16 * s); ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x, y - 16 * s); ctx.lineTo(x + 4 * s, y - 14.5 * s); ctx.lineTo(x, y - 13 * s);
    ctx.closePath(); ctx.fill();
  }

  function _drawEggPortal(x, y, s) {
    // 傳送門 — 旋轉光環
    const t = Date.now() * 0.003;
    ctx.save();
    ctx.translate(x, y - 6 * s);
    // 外環光暈
    ctx.fillStyle = 'rgba(138,43,226,0.12)';
    ctx.beginPath(); ctx.ellipse(0, 0, 10 * s, 12 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 旋轉環
    for (let i = 0; i < 3; i++) {
      const a = t + i * Math.PI * 2 / 3;
      ctx.strokeStyle = `hsla(${270 + i * 30}, 80%, 60%, 0.6)`;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.ellipse(0, 0, 7 * s, 9 * s, a, 0, Math.PI * 2); ctx.stroke();
    }
    // 中心
    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath(); ctx.ellipse(0, 0, 3 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function _drawEggTank(x, y, s) {
    // 迷你坦克
    // 履帶
    ctx.fillStyle = '#444';
    ctx.fillRect(x - 7 * s, y - 3 * s, 14 * s, 3 * s);
    // 車身
    ctx.fillStyle = '#5a6e3a';
    ctx.fillRect(x - 5 * s, y - 7 * s, 10 * s, 4 * s);
    // 砲塔
    ctx.fillStyle = '#4a5e2a';
    ctx.beginPath(); ctx.arc(x, y - 8 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    // 砲管
    ctx.strokeStyle = '#3a4e1a'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(x + 3 * s, y - 8 * s); ctx.lineTo(x + 9 * s, y - 9 * s); ctx.stroke();
    // 星星標記
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(x, y - 5 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggCrystal(x, y, s) {
    // 水晶
    const t = Date.now() * 0.002;
    const glow = 0.3 + Math.sin(t) * 0.15;
    // 光暈
    ctx.fillStyle = `rgba(100,200,255,${glow * 0.3})`;
    ctx.beginPath(); ctx.arc(x, y - 7 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
    // 主體
    ctx.fillStyle = `rgba(130,220,255,${0.7 + glow * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * s);
    ctx.lineTo(x - 4 * s, y - 5 * s);
    ctx.lineTo(x - 2 * s, y);
    ctx.lineTo(x + 2 * s, y);
    ctx.lineTo(x + 4 * s, y - 5 * s);
    ctx.closePath(); ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - 1 * s, y - 12 * s);
    ctx.lineTo(x - 3 * s, y - 5 * s);
    ctx.lineTo(x - 1 * s, y - 4 * s);
    ctx.closePath(); ctx.fill();
  }

  function _drawEggTotem(x, y, s) {
    // 圖騰柱
    // 柱身
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(x - 3 * s, y - 16 * s, 6 * s, 16 * s);
    // 第一層臉
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 4 * s, y - 16 * s, 8 * s, 5 * s);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 1.5 * s, y - 14 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1.5 * s, y - 14 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x - 1.5 * s, y - 14 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1.5 * s, y - 14 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    // 第二層臉
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x - 4 * s, y - 10 * s, 8 * s, 5 * s);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 1.5 * s, y - 8 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1.5 * s, y - 8 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    // 翅膀
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 8 * s); ctx.lineTo(x - 7 * s, y - 10 * s); ctx.lineTo(x - 4 * s, y - 6 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, y - 8 * s); ctx.lineTo(x + 7 * s, y - 10 * s); ctx.lineTo(x + 4 * s, y - 6 * s);
    ctx.closePath(); ctx.fill();
  }

  function _drawEggAlien(x, y, s) {
    // 外星人
    // 身體
    ctx.fillStyle = '#7dcea0';
    ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 頭
    ctx.fillStyle = '#7dcea0';
    ctx.beginPath(); ctx.ellipse(x, y - 11 * s, 4 * s, 3.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 大眼睛
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(x - 2 * s, y - 11 * s, 1.5 * s, 2 * s, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 2 * s, y - 11 * s, 1.5 * s, 2 * s, 0.2, 0, Math.PI * 2); ctx.fill();
    // 眼睛高光
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 2.3 * s, y - 11.5 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1.7 * s, y - 11.5 * s, 0.5 * s, 0, Math.PI * 2); ctx.fill();
    // 觸角
    ctx.strokeStyle = '#7dcea0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 14 * s); ctx.lineTo(x - 3 * s, y - 17 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 2 * s, y - 14 * s); ctx.lineTo(x + 3 * s, y - 17 * s); ctx.stroke();
    ctx.fillStyle = '#abebc6';
    ctx.beginPath(); ctx.arc(x - 3 * s, y - 17 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3 * s, y - 17 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggPhoenixNest(x, y, s) {
    // 鳳凰巢
    const t = Date.now() * 0.003;
    // 巢
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(x, y - 1 * s, 7 * s, 3 * s, 0, 0, Math.PI); ctx.fill();
    // 枝條紋理
    ctx.strokeStyle = '#6d3a0a'; ctx.lineWidth = 0.8;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 2 * s, y - 1 * s);
      ctx.quadraticCurveTo(x + i * 1.5 * s, y - 3 * s, x + i * 2.5 * s, y - 2 * s);
      ctx.stroke();
    }
    // 火焰蛋
    const flicker = Math.sin(t) * 0.2;
    ctx.fillStyle = `rgba(255,${100 + Math.sin(t * 1.3) * 50},0,${0.7 + flicker})`;
    ctx.beginPath(); ctx.ellipse(x, y - 5 * s, 3 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 火焰
    ctx.fillStyle = `rgba(255,200,0,${0.4 + flicker})`;
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y - 7 * s);
    ctx.quadraticCurveTo(x, y - 13 * s, x + 2 * s, y - 7 * s);
    ctx.closePath(); ctx.fill();
    // 火花
    ctx.fillStyle = 'rgba(255,255,100,0.5)';
    ctx.beginPath(); ctx.arc(x + Math.sin(t * 2) * 2 * s, y - 10 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawEggBlackhole(x, y, s) {
    // 黑洞
    const t = Date.now() * 0.002;
    ctx.save();
    ctx.translate(x, y - 6 * s);
    // 吸積盤光暈
    for (let i = 3; i >= 0; i--) {
      const r = (6 + i * 3) * s;
      ctx.fillStyle = `rgba(${100 + i * 40},${50 + i * 20},${200 - i * 30},${0.1 + i * 0.03})`;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    // 旋轉吸積盤
    ctx.strokeStyle = 'rgba(200,150,255,0.4)'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.ellipse(0, 0, 8 * s, 3 * s, t, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,100,0.3)'; ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.ellipse(0, 0, 6 * s, 2 * s, t + 0.5, 0, Math.PI * 2); ctx.stroke();
    // 核心黑洞
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(0, 0, 3 * s, 0, Math.PI * 2); ctx.fill();
    // 事件視界光環
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(0, 0, 3.5 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function _drawEggWorldcup(x, y, s) {
    // 世界盃獎盃
    // 光暈
    const t = Date.now() * 0.002;
    const glow = 0.2 + Math.sin(t) * 0.1;
    ctx.fillStyle = `rgba(255,215,0,${glow})`;
    ctx.beginPath(); ctx.arc(x, y - 8 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
    // 底座
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(x - 4 * s, y - 2 * s, 8 * s, 2 * s);
    ctx.fillRect(x - 3 * s, y - 3 * s, 6 * s, 1 * s);
    // 柱子
    ctx.fillStyle = '#daa520';
    ctx.fillRect(x - 1.5 * s, y - 7 * s, 3 * s, 4 * s);
    // 杯身
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 14 * s);
    ctx.quadraticCurveTo(x - 6 * s, y - 8 * s, x - 1.5 * s, y - 7 * s);
    ctx.lineTo(x + 1.5 * s, y - 7 * s);
    ctx.quadraticCurveTo(x + 6 * s, y - 8 * s, x + 5 * s, y - 14 * s);
    ctx.closePath(); ctx.fill();
    // 杯口
    ctx.beginPath(); ctx.ellipse(x, y - 14 * s, 5 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc800'; ctx.fill();
    // 地球圖案
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(x, y - 10 * s, 2 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 10 * s); ctx.lineTo(x + 2 * s, y - 10 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x, y - 8 * s); ctx.stroke();
  }

  // ─── 天空彩蛋（球場上緣～技能條下緣） ─────────────────────
  let _bgEggs = [];

  function generateBgEggs() {
    _bgEggs = [];
    if (!G) return;
    const wave = G.wave;
    const available = SKY_EGGS.filter(e => wave >= e.minWave);
    if (!available.length) return;
    const count = Math.min(5, Math.floor(wave / 5));
    if (count <= 0) return;
    const total = available.reduce((s, e) => s + e.weight, 0);
    for (let i = 0; i < count; i++) {
      let r = Math.random() * total;
      let type = available[available.length - 1].type;
      for (const e of available) { r -= e.weight; if (r <= 0) { type = e.type; break; } }
      _bgEggs.push({
        type,
        xPct: Math.random(),
        yPct: 0.05 + Math.random() * 0.5,  // 限制在上半部，不要飛太低
        scale: 0.5 + Math.random() * 0.5,
        alpha: 0.2 + Math.random() * 0.15,
        spd: 0.08 + Math.random() * 0.12,   // 飛行速度（加快）
        dir: Math.random() < 0.5 ? 1 : -1,  // 隨機左或右
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawBgEggs() {
    if (!_bgEggs.length || !G) return;
    const goalY = proj(0, FIELD_DEPTH).y;
    const barBottom = 70;
    const zoneTop = barBottom;
    const zoneH = goalY - barBottom;
    if (zoneH <= 10) return;
    const t = performance.now() * 0.001;

    ctx.save();
    for (const egg of _bgEggs) {
      // 持續飛行位移
      egg.xPct += egg.spd * egg.dir * 0.0005;
      if (egg.xPct < -0.1) egg.xPct = 1.1;
      if (egg.xPct > 1.1) egg.xPct = -0.1;

      const x = W * egg.xPct;
      const baseY = zoneTop + zoneH * egg.yPct;
      const bob = Math.sin(t * 1.5 + egg.phase) * 3; // 上下浮動
      const y = baseY + bob;
      const s = egg.scale * Math.min(1, W / 500) * 2;
      ctx.globalAlpha = egg.alpha;

      switch (egg.type) {
        case 'sky_bird': _drawSkyBird(x, y, s, t + egg.phase); break;
        case 'sky_cloud': _drawSkyCloud(x, y, s); break;
        case 'sky_plane': _drawSkyPlane(x, y, s, egg.dir); break;
        case 'sky_kite': _drawSkyKite(x, y, s, t + egg.phase); break;
        case 'sky_balloon': _drawSkyBalloon(x, y, s); break;
        case 'sky_ufo': _drawSkyUFO(x, y, s, t + egg.phase); break;
        case 'sky_blimp': _drawSkyBlimp(x, y, s, egg.dir); break;
        case 'sky_firework': _drawSkyFirework(x, y, s, t + egg.phase); break;
        case 'sky_santa': _drawSkySanta(x, y, s, egg.dir); break;
        case 'sky_witch': _drawSkyWitch(x, y, s, egg.dir); break;
        case 'sky_pegasus': _drawSkyPegasus(x, y, s, egg.dir, t + egg.phase); break;
        case 'sky_rocket': _drawSkyRocket(x, y, s, t + egg.phase); break;
        case 'sky_dragon': _drawSkyDragon(x, y, s, egg.dir, t + egg.phase); break;
        case 'sky_whale': _drawSkyWhale(x, y, s, egg.dir); break;
        case 'sky_castle': _drawSkyCastle(x, y, s); break;
        case 'sky_phoenix': _drawSkyPhoenix(x, y, s, t + egg.phase); break;
        case 'sky_star': _drawSkyStar(x, y, s, t + egg.phase); break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 天空彩蛋繪製 ──────────────────────────────────────────
  function _drawSkyBird(x, y, s, t) {
    // V字鳥群（3隻）
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = 1.2 * s;
    for (let i = -1; i <= 1; i++) {
      const bx = x + i * 8 * s, by = y + Math.abs(i) * 3 * s;
      const flap = Math.sin(t * 6 + i) * 3 * s;
      ctx.beginPath();
      ctx.moveTo(bx - 4 * s, by + flap); ctx.lineTo(bx, by); ctx.lineTo(bx + 4 * s, by + flap);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function _drawSkyCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 5 * s, y + 1 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5 * s, y + 1 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 2 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawSkyPlane(x, y, s, dir) {
    ctx.save();
    ctx.translate(x, y);
    if (dir < 0) ctx.scale(-1, 1);
    // 機身
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.moveTo(10 * s, 0);
    ctx.quadraticCurveTo(12 * s, -1.5 * s, 8 * s, -1.5 * s);
    ctx.lineTo(-8 * s, -1.5 * s);
    ctx.lineTo(-10 * s, -0.5 * s);
    ctx.lineTo(-10 * s, 1 * s);
    ctx.lineTo(-8 * s, 1.5 * s);
    ctx.lineTo(8 * s, 1.5 * s);
    ctx.quadraticCurveTo(12 * s, 1.5 * s, 10 * s, 0);
    ctx.closePath(); ctx.fill();
    // 主翼
    ctx.fillStyle = '#bdbdbd';
    ctx.beginPath();
    ctx.moveTo(2 * s, -1.5 * s); ctx.lineTo(0, -7 * s);
    ctx.lineTo(-3 * s, -7 * s); ctx.lineTo(-1 * s, -1.5 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2 * s, 1.5 * s); ctx.lineTo(0, 7 * s);
    ctx.lineTo(-3 * s, 7 * s); ctx.lineTo(-1 * s, 1.5 * s);
    ctx.closePath(); ctx.fill();
    // 尾翼
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(-8 * s, -1.5 * s); ctx.lineTo(-10 * s, -4 * s);
    ctx.lineTo(-11 * s, -4 * s); ctx.lineTo(-10 * s, -1.5 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8 * s, 1.5 * s); ctx.lineTo(-10 * s, 4 * s);
    ctx.lineTo(-11 * s, 4 * s); ctx.lineTo(-10 * s, 1.5 * s);
    ctx.closePath(); ctx.fill();
    // 窗戶
    ctx.fillStyle = '#42a5f5';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc((5 - i * 3) * s, -0.3 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
    }
    // 駕駛艙
    ctx.fillStyle = '#64b5f6';
    ctx.beginPath();
    ctx.ellipse(9 * s, 0, 2 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function _drawSkyKite(x, y, s, t) {
    // 菱形風箏
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s); ctx.lineTo(x + 4 * s, y); ctx.lineTo(x, y + 6 * s); ctx.lineTo(x - 4 * s, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fdd835';
    ctx.beginPath();
    ctx.moveTo(x, y - 6 * s); ctx.lineTo(x + 4 * s, y); ctx.lineTo(x, y); ctx.lineTo(x - 4 * s, y);
    ctx.closePath(); ctx.fill();
    // 飄帶尾巴
    ctx.strokeStyle = '#e53935'; ctx.lineWidth = 1 * s;
    ctx.beginPath(); ctx.moveTo(x, y + 6 * s);
    for (let i = 1; i <= 4; i++) ctx.lineTo(x + Math.sin(t * 3 + i) * 3 * s, y + 6 * s + i * 4 * s);
    ctx.stroke(); ctx.lineWidth = 1;
  }

  function _drawSkyBalloon(x, y, s) {
    // 熱氣球
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(x, y - 5 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.arc(x, y - 5 * s, 7 * s, Math.PI * 0.3, Math.PI * 0.7); ctx.lineTo(x, y - 5 * s); ctx.fill();
    // 籃子
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 0.8 * s;
    ctx.beginPath(); ctx.moveTo(x - 4 * s, y + 2 * s); ctx.lineTo(x - 2 * s, y + 5 * s);
    ctx.lineTo(x + 2 * s, y + 5 * s); ctx.lineTo(x + 4 * s, y + 2 * s); ctx.stroke();
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x - 2.5 * s, y + 4 * s, 5 * s, 3 * s);
    ctx.lineWidth = 1;
  }

  function _drawSkyUFO(x, y, s, t) {
    ctx.fillStyle = '#78909c';
    ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath(); ctx.arc(x, y - 3 * s, 5 * s, Math.PI, 0); ctx.fill();
    // 旋轉燈
    const blink = Math.sin(t * 8) > 0;
    ctx.fillStyle = blink ? '#76ff03' : '#00e5ff';
    [-4, 0, 4].forEach(dx => {
      ctx.beginPath(); ctx.arc(x + dx * s, y, 1 * s, 0, Math.PI * 2); ctx.fill();
    });
  }

  function _drawSkyBlimp(x, y, s, dir) {
    ctx.fillStyle = '#546e7a';
    ctx.beginPath(); ctx.ellipse(x, y, 14 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 吊艙
    ctx.fillStyle = '#37474f';
    ctx.fillRect(x - 4 * s, y + 5 * s, 8 * s, 3 * s);
    // 文字
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${3 * s}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('GOAL', x, y + 1.5 * s);
  }

  function _drawSkyFirework(x, y, s, t) {
    const phase = (t * 2) % 3;
    if (phase < 1.5) {
      // 上升
      ctx.fillStyle = '#ffd600';
      ctx.beginPath(); ctx.arc(x, y + (1.5 - phase) * 10 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    } else {
      // 爆開
      const expand = (phase - 1.5) / 1.5;
      const colors = ['#e53935','#fdd835','#42a5f5','#66bb6a','#ff7043','#ab47bc'];
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI * 2 / 8;
        const r = expand * 12 * s;
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha *= (1 - expand);
        ctx.beginPath(); ctx.arc(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 1.5 * s, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha /= Math.max(0.01, 1 - expand);
      }
    }
  }

  function _drawSkySanta(x, y, s, dir) {
    // 雪橇
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 6 * s, y + 2 * s, 12 * s, 2 * s);
    // 聖誕老人
    ctx.fillStyle = '#c62828';
    ctx.fillRect(x - 2 * s, y - 4 * s, 5 * s, 6 * s);
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath(); ctx.arc(x + 0.5 * s, y - 6 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c62828';
    ctx.beginPath(); ctx.arc(x + 0.5 * s, y - 6 * s, 2.5 * s, Math.PI, 0); ctx.fill();
    // 馴鹿剪影
    ctx.fillStyle = '#5d4037';
    const rx = x + dir * 12 * s;
    ctx.beginPath(); ctx.ellipse(rx, y - 1 * s, 4 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rx + dir * 4 * s, y - 3 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawSkyWitch(x, y, s, dir) {
    // 掃帚
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(x - 8 * s, y + 1 * s, 16 * s, 1.5 * s);
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.moveTo(x - 8 * s * dir, y); ctx.lineTo(x - 12 * s * dir, y - 2 * s);
    ctx.lineTo(x - 12 * s * dir, y + 4 * s); ctx.lineTo(x - 8 * s * dir, y + 2.5 * s); ctx.fill();
    // 巫師
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - 2 * s, y - 5 * s, 4 * s, 6 * s);
    // 尖帽
    ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x - 3 * s, y - 5 * s); ctx.lineTo(x + 3 * s, y - 5 * s); ctx.fill();
  }

  function _drawSkyPegasus(x, y, s, dir, t) {
    ctx.fillStyle = '#e0e0e0';
    // 身體
    ctx.beginPath(); ctx.ellipse(x, y, 7 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 頭
    ctx.beginPath(); ctx.arc(x + dir * 7 * s, y - 3 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    // 翅膀（拍動）
    const flap = Math.sin(t * 5) * 4 * s;
    ctx.fillStyle = 'rgba(224,224,224,0.7)';
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y - 3 * s); ctx.lineTo(x, y - 10 * s + flap); ctx.lineTo(x + 4 * s, y - 3 * s);
    ctx.fill();
  }

  function _drawSkyRocket(x, y, s, t) {
    // 火箭飛行
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(x - 2 * s, y - 8 * s, 4 * s, 10 * s);
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.moveTo(x, y - 12 * s); ctx.lineTo(x - 2 * s, y - 8 * s); ctx.lineTo(x + 2 * s, y - 8 * s); ctx.fill();
    // 噴焰（動畫閃爍）
    const fl = 4 + Math.sin(t * 12) * 2;
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.moveTo(x - 1.5 * s, y + 2 * s); ctx.lineTo(x, y + (2 + fl) * s); ctx.lineTo(x + 1.5 * s, y + 2 * s); ctx.fill();
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.moveTo(x - 0.8 * s, y + 2 * s); ctx.lineTo(x, y + (2 + fl * 0.6) * s); ctx.lineTo(x + 0.8 * s, y + 2 * s); ctx.fill();
  }

  function _drawSkyDragon(x, y, s, dir, t) {
    ctx.fillStyle = '#4caf50';
    // 身體蛇形
    ctx.beginPath();
    ctx.moveTo(x - dir * 10 * s, y + Math.sin(t * 3) * 3 * s);
    ctx.quadraticCurveTo(x, y + Math.sin(t * 3 + 1) * 3 * s, x + dir * 10 * s, y + Math.sin(t * 3 + 2) * 3 * s);
    ctx.lineWidth = 4 * s; ctx.strokeStyle = '#4caf50'; ctx.stroke(); ctx.lineWidth = 1;
    // 頭
    ctx.beginPath(); ctx.arc(x + dir * 10 * s, y + Math.sin(t * 3 + 2) * 3 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
    // 翅膀
    const flap = Math.sin(t * 5) * 3 * s;
    ctx.fillStyle = 'rgba(76,175,80,0.5)';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 * s, y - 8 * s + flap); ctx.lineTo(x + 5 * s, y); ctx.fill();
    // 火焰
    ctx.fillStyle = '#ff6d00';
    const fx = x + dir * 13 * s, fy = y + Math.sin(t * 3 + 2) * 3 * s;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + dir * 6 * s, fy - 1 * s); ctx.lineTo(fx + dir * 4 * s, fy + 1 * s); ctx.fill();
  }

  function _drawSkyWhale(x, y, s, dir) {
    ctx.fillStyle = '#1565c0';
    ctx.beginPath(); ctx.ellipse(x, y, 14 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#90caf9';
    ctx.beginPath(); ctx.ellipse(x + dir * 2 * s, y + 2 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 尾
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.moveTo(x - dir * 14 * s, y); ctx.lineTo(x - dir * 20 * s, y - 5 * s); ctx.lineTo(x - dir * 20 * s, y + 5 * s);
    ctx.closePath(); ctx.fill();
    // 眼
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + dir * 10 * s, y - 2 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawSkyCastle(x, y, s) {
    ctx.fillStyle = 'rgba(200,200,220,0.6)';
    // 主體
    ctx.fillRect(x - 8 * s, y - 6 * s, 16 * s, 10 * s);
    // 塔
    ctx.fillRect(x - 10 * s, y - 12 * s, 5 * s, 16 * s);
    ctx.fillRect(x + 5 * s, y - 12 * s, 5 * s, 16 * s);
    // 塔頂
    ctx.fillStyle = 'rgba(180,180,200,0.7)';
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y - 12 * s); ctx.lineTo(x - 7.5 * s, y - 16 * s); ctx.lineTo(x - 5 * s, y - 12 * s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 5 * s, y - 12 * s); ctx.lineTo(x + 7.5 * s, y - 16 * s); ctx.lineTo(x + 10 * s, y - 12 * s); ctx.fill();
    // 雲底
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 5 * s, 14 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
  }

  function _drawSkyPhoenix(x, y, s, t) {
    const flap = Math.sin(t * 4) * 5 * s;
    // 身體
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.ellipse(x, y, 5 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 翅膀（展開+火焰）
    ctx.fillStyle = '#ffd600';
    ctx.beginPath(); ctx.moveTo(x - 3 * s, y); ctx.lineTo(x - 12 * s, y - 6 * s + flap); ctx.lineTo(x - 5 * s, y + 2 * s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 3 * s, y); ctx.lineTo(x + 12 * s, y - 6 * s + flap); ctx.lineTo(x + 5 * s, y + 2 * s); ctx.fill();
    // 尾焰
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath(); ctx.moveTo(x - 4 * s, y + 1 * s);
    ctx.quadraticCurveTo(x - 8 * s, y + 8 * s + Math.sin(t * 6) * 2 * s, x - 2 * s, y + 12 * s);
    ctx.quadraticCurveTo(x, y + 6 * s, x + 2 * s, y + 12 * s);
    ctx.quadraticCurveTo(x + 8 * s, y + 8 * s + Math.sin(t * 6 + 1) * 2 * s, x + 4 * s, y + 1 * s);
    ctx.fill();
    // 頭
    ctx.fillStyle = '#e53935';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
  }

  function _drawSkyStar(x, y, s, t) {
    // 流星（多條）
    for (let i = 0; i < 3; i++) {
      const sx = x + i * 12 * s;
      const sy = y + i * 5 * s;
      const trail = (t * 4 + i * 2) % 5;
      if (trail > 3) continue;
      ctx.strokeStyle = '#ffd600'; ctx.lineWidth = 1.5 * s;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 10 * s, sy + 5 * s); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx, sy, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1;
  }

  function drawSideCrowd() {
    const cfg = SCENE_SIDE[curScene.name];
    if (!cfg) return;
    const margin = FIELD_HW + 60;
    ctx.save();

    // ── 左上/右上三角空地填充 ──
    drawCornerAreas(cfg);

    // 兩側護欄（沿透視邊線）
    for (const side of [-1, 1]) {
      // 護欄用線段沿邊線繪製
      ctx.beginPath();
      for (let z = 0; z <= FIELD_DEPTH; z += 30) {
        const p = proj(side * margin, z);
        if (z === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = cfg.barrier;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = cfg.barrierH;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 觀眾剪影（沿邊線排列，隨透視由近到遠縮小）
    for (const side of [-1, 1]) {
      for (let z = 20; z < FIELD_DEPTH - 30; z += 55) {
        const p = proj(side * (margin + 20), z);
        if (p.s < 0.04) continue;
        const s = p.s * 5;
        const headR = 3.5 * s;
        const bodyH = 5 * s;
        const oh = ((z % 110) < 55 ? -1.5 : 0) * s; // 交錯高低
        ctx.fillStyle = cfg.crowd;
        ctx.fillRect(p.x - 3.5 * s, p.y - bodyH + oh, 7 * s, bodyH);
        ctx.fillStyle = cfg.crowdH;
        ctx.beginPath();
        ctx.arc(p.x, p.y - bodyH - headR * 0.5 + oh, headR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 特殊物件
    for (const sp of cfg.specials) {
      const p = proj(sp.side * (margin + 15), sp.z);
      if (p.s < 0.04) continue;
      const s = p.s * 5;
      switch (sp.type) {
        case 'banner': _drawBanner(p.x, p.y, s, cfg.barrier); break;
        case 'palm': _drawSidePalm(p.x, p.y, s); break;
        case 'bird': _drawBird(p.x, p.y, s); break;
        case 'balloon': _drawBalloon(p.x, p.y, s); break;
        case 'flag': _drawSideFlag(p.x, p.y, s); break;
        case 'umbrella': _drawSideUmbrella(p.x, p.y, s); break;
        case 'dog': _drawSideDog(p.x, p.y, s); break;
        case 'penguin': _drawSidePenguin(p.x, p.y, s); break;
        case 'snowman': _drawSnowman(p.x, p.y, s); break;
        case 'vipflag': _drawVIPFlag(p.x, p.y, s); break;
        case 'trophy': _drawSideTrophy(p.x, p.y, s); break;
        case 'camera': _drawSideCamera(p.x, p.y, s); break;
      }
    }

    ctx.restore();
  }

  // ── 場邊特殊物件（簡約單/雙色） ────────────────────────────
  function _drawBanner(x, y, s, color) {
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(x - 0.8 * s, y - 22 * s, 1.6 * s, 22 * s);
    ctx.fillStyle = color;
    ctx.fillRect(x + 0.8 * s, y - 20 * s, 10 * s, 6 * s);
  }

  function _drawSidePalm(x, y, s) {
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x - 1 * s, y - 20 * s, 2 * s, 20 * s);
    ctx.fillStyle = '#2e5a1e';
    for (let i = 0; i < 4; i++) {
      const ang = -Math.PI * 0.7 + i * 0.47;
      ctx.beginPath();
      ctx.moveTo(x, y - 20 * s);
      ctx.quadraticCurveTo(x + Math.cos(ang) * 10 * s, y - 20 * s + Math.sin(ang) * 5 * s - 4 * s, x + Math.cos(ang) * 14 * s, y - 20 * s + Math.sin(ang) * 8 * s + 2 * s);
      ctx.lineWidth = 2 * s;
      ctx.strokeStyle = '#2e5a1e';
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function _drawBird(x, y, s) {
    // V 字鳥剪影
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 16 * s);
    ctx.quadraticCurveTo(x, y - 20 * s, x, y - 18 * s);
    ctx.quadraticCurveTo(x, y - 20 * s, x + 5 * s, y - 16 * s);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function _drawBalloon(x, y, s) {
    ctx.strokeStyle = 'rgba(150,150,150,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1 * s, y - 22 * s);
    ctx.stroke();
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(x + 1 * s, y - 26 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
  }

  function _drawSideFlag(x, y, s) {
    ctx.fillStyle = '#78909c';
    ctx.fillRect(x - 0.6 * s, y - 20 * s, 1.2 * s, 20 * s);
    ctx.fillStyle = '#c62828';
    ctx.beginPath();
    ctx.moveTo(x + 0.6 * s, y - 20 * s);
    ctx.lineTo(x + 8 * s, y - 17 * s);
    ctx.lineTo(x + 0.6 * s, y - 14 * s);
    ctx.closePath();
    ctx.fill();
  }

  function _drawSideUmbrella(x, y, s) {
    // 傘剪影
    ctx.fillStyle = '#546e7a';
    ctx.beginPath();
    ctx.arc(x, y - 18 * s, 8 * s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 0.6 * s, y - 18 * s, 1.2 * s, 14 * s);
  }

  function _drawSideDog(x, y, s) {
    ctx.fillStyle = '#5d4037';
    // 身體
    ctx.fillRect(x - 5 * s, y - 5 * s, 10 * s, 4 * s);
    // 頭
    ctx.beginPath(); ctx.arc(x + 6 * s, y - 6 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
    // 尾
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 5 * s);
    ctx.quadraticCurveTo(x - 8 * s, y - 12 * s, x - 6 * s, y - 13 * s);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function _drawSidePenguin(x, y, s) {
    // 雙色企鵝剪影
    ctx.fillStyle = '#1a2030';
    ctx.beginPath(); ctx.ellipse(x, y - 6 * s, 4 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0c8d0';
    ctx.beginPath(); ctx.ellipse(x, y - 4.5 * s, 2.5 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // 頭
    ctx.fillStyle = '#1a2030';
    ctx.beginPath(); ctx.arc(x, y - 13 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
    // 嘴
    ctx.fillStyle = '#e68a00';
    ctx.beginPath();
    ctx.moveTo(x - 1.2 * s, y - 12 * s);
    ctx.lineTo(x, y - 10 * s);
    ctx.lineTo(x + 1.2 * s, y - 12 * s);
    ctx.closePath(); ctx.fill();
  }

  function _drawSnowman(x, y, s) {
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath(); ctx.arc(x, y - 4 * s, 5 * s, 0, Math.PI * 2); ctx.fill(); // 底
    ctx.beginPath(); ctx.arc(x, y - 12 * s, 4 * s, 0, Math.PI * 2); ctx.fill(); // 中
    ctx.beginPath(); ctx.arc(x, y - 18 * s, 3 * s, 0, Math.PI * 2); ctx.fill(); // 頭
    // 眼+嘴
    ctx.fillStyle = '#37474f';
    ctx.beginPath(); ctx.arc(x - 1 * s, y - 19 * s, 0.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 1 * s, y - 19 * s, 0.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e68a00';
    ctx.beginPath();
    ctx.moveTo(x, y - 17.5 * s);
    ctx.lineTo(x + 3 * s, y - 17 * s);
    ctx.lineTo(x, y - 16.5 * s);
    ctx.closePath(); ctx.fill();
  }

  function _drawVIPFlag(x, y, s) {
    ctx.fillStyle = '#5a4400';
    ctx.fillRect(x - 0.6 * s, y - 22 * s, 1.2 * s, 22 * s);
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(x + 0.6 * s, y - 22 * s, 9 * s, 6 * s);
  }

  function _drawSideTrophy(x, y, s) {
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y - 14 * s);
    ctx.quadraticCurveTo(x - 4 * s, y - 6 * s, x - 2 * s, y - 5 * s);
    ctx.lineTo(x + 2 * s, y - 5 * s);
    ctx.quadraticCurveTo(x + 4 * s, y - 6 * s, x + 3 * s, y - 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 2 * s, y - 5 * s, 4 * s, 1.5 * s);
    ctx.fillRect(x - 3 * s, y - 3.5 * s, 6 * s, 1.5 * s);
  }

  function _drawSideCamera(x, y, s) {
    // 攝影機剪影
    ctx.fillStyle = '#37474f';
    ctx.fillRect(x - 0.8 * s, y - 16 * s, 1.6 * s, 16 * s); // 腳架
    ctx.fillRect(x - 4 * s, y - 20 * s, 8 * s, 5 * s); // 機身
    ctx.fillStyle = '#546e7a';
    ctx.beginPath(); ctx.arc(x + 4 * s, y - 17.5 * s, 2 * s, 0, Math.PI * 2); ctx.fill(); // 鏡頭
  }

  // ─── 球門 ────────────────────────────────────────────────
  function drawGoal() {
    const effectiveGoalHW = Math.min(GOAL_HW * 1.6, GOAL_HW * (1 + (G.goalBonus || 0)));
    const pL = proj(-effectiveGoalHW, GOAL_Z);
    const pR = proj(effectiveGoalHW, GOAL_Z);
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

    // 灼燒效果 — 沿身體輪廓的火焰（強化版）
    if (d.burning > 0) {
      const ft = Date.now() * 0.008;
      const flames = [
        { ox: -w * 0.35, oy: h * 0.05 },
        { ox: 0,         oy: -h * 0.05 },
        { ox: w * 0.35,  oy: h * 0.1 },
        { ox: -w * 0.2,  oy: h * 0.35 },
        { ox: w * 0.2,   oy: h * 0.3 },
        { ox: 0,         oy: h * 0.55 },
        { ox: -w * 0.1,  oy: h * 0.7 },
        { ox: w * 0.1,   oy: h * 0.65 },
      ];
      // 底層光暈
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glowR = Math.max(w, h) * 0.7;
      const glow = ctx.createRadialGradient(p.x, by + h * 0.4, 0, p.x, by + h * 0.4, glowR);
      glow.addColorStop(0, 'rgba(255,120,0,0.25)');
      glow.addColorStop(0.5, 'rgba(255,60,0,0.1)');
      glow.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - glowR, by + h * 0.4 - glowR, glowR * 2, glowR * 2);

      for (let fi = 0; fi < flames.length; fi++) {
        const f = flames[fi];
        const sway = Math.sin(ft * 1.5 + fi * 2.3) * 2 * p.s;
        const fx = p.x + f.ox + sway;
        const fy = by + f.oy;
        const fh = (10 + Math.sin(ft + fi * 1.7) * 5) * p.s;
        const fw = (5 + Math.sin(ft * 1.3 + fi * 2.1) * 2) * p.s;
        // 外焰（橘紅）
        ctx.fillStyle = `rgba(255,${50 + Math.floor(Math.sin(ft + fi) * 30)},0,${0.7 + Math.sin(ft * 2 + fi) * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(fx - fw, fy);
        ctx.quadraticCurveTo(fx - fw * 0.3, fy - fh * 0.5, fx + sway * 0.3, fy - fh);
        ctx.quadraticCurveTo(fx + fw * 0.3, fy - fh * 0.5, fx + fw, fy);
        ctx.closePath(); ctx.fill();
        // 中焰（亮橘）
        ctx.fillStyle = `rgba(255,160,20,${0.6 + Math.sin(ft * 2.2 + fi) * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(fx - fw * 0.55, fy);
        ctx.quadraticCurveTo(fx, fy - fh * 0.75, fx + fw * 0.55, fy);
        ctx.closePath(); ctx.fill();
        // 內焰（亮黃白）
        ctx.fillStyle = `rgba(255,240,100,${0.55 + Math.sin(ft * 3 + fi) * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(fx - fw * 0.25, fy);
        ctx.quadraticCurveTo(fx, fy - fh * 0.55, fx + fw * 0.25, fy);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
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
  // SVG 愛心預載
  const _heartImg = new Image();
  _heartImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <defs><linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff5252"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient>
    <filter id="hg"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g filter="url(#hg)"><path d="M16 28C8 20 2 15 2 10 2 5 6 2 10 2c3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 3 8 8 0 5-6 10-14 18z" fill="url(#h1)"/>
    <path d="M10 4c-3 0-6 2-6 6 0 1 0 2 1 3" stroke="#ff8a80" stroke-width="1.2" fill="none" opacity="0.5" stroke-linecap="round"/></g></svg>`
  );

  function drawHeart(cx, cy, sz) {
    if (_heartImg.complete && _heartImg.naturalWidth > 0) {
      ctx.drawImage(_heartImg, cx - sz, cy - sz, sz * 2, sz * 2);
    } else {
      ctx.save();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(cx, cy + sz * 0.6);
      ctx.bezierCurveTo(cx - sz, cy, cx - sz, cy - sz * 0.8, cx, cy - sz * 0.35);
      ctx.bezierCurveTo(cx + sz, cy - sz * 0.8, cx + sz, cy, cx, cy + sz * 0.6);
      ctx.fill();
      ctx.restore();
    }
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
        case 'ghost': { // 半透明紫光擴散 + 穿透文字
          const gr = sz * (1 + t * 2);
          const gg = ctx.createRadialGradient(pos.x, pos.y + fy, 0, pos.x, pos.y + fy, gr);
          gg.addColorStop(0, 'rgba(179,136,255,0.5)');
          gg.addColorStop(1, 'rgba(179,136,255,0)');
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, gr, 0, Math.PI * 2); ctx.fill();
          // 穿透文字
          ctx.fillStyle = `rgba(179,136,255,${a})`;
          ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 8;
          ctx.font = `bold ${sz * 1.1}px "Noto Sans TC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('穿透!', pos.x, pos.y - sz * 1.2 + fy);
          ctx.shadowBlur = 0;
          break;
        }
        case 'crit': { // 紅色暴擊文字+光暈
          ctx.fillStyle = '#ff1744';
          ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 12;
          ctx.font = `bold ${sz * 1.3}px "Noto Sans TC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('暴擊!', pos.x, pos.y - sz * 1.5 + fy);
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
        case 'kill': { // 骷髏頭
          const ks = sz * 1.2;
          const kx = pos.x, ky = pos.y + fy;
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          // 頭骨
          ctx.beginPath(); ctx.arc(kx, ky - ks * 0.15, ks * 0.45, 0, Math.PI * 2); ctx.fill();
          // 下巴
          ctx.beginPath();
          ctx.moveTo(kx - ks * 0.3, ky + ks * 0.15);
          ctx.quadraticCurveTo(kx, ky + ks * 0.5, kx + ks * 0.3, ky + ks * 0.15);
          ctx.fill();
          // 眼睛
          ctx.fillStyle = `rgba(0,0,0,${a})`;
          ctx.beginPath(); ctx.arc(kx - ks * 0.15, ky - ks * 0.15, ks * 0.1, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(kx + ks * 0.15, ky - ks * 0.15, ks * 0.1, 0, Math.PI * 2); ctx.fill();
          // 鼻子（三角）
          ctx.beginPath(); ctx.moveTo(kx, ky - ks * 0.02); ctx.lineTo(kx - ks * 0.05, ky + ks * 0.08);
          ctx.lineTo(kx + ks * 0.05, ky + ks * 0.08); ctx.closePath(); ctx.fill();
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
        default: { // 普通文字粒子（傷害數字等）— 白色簡潔風
          ctx.font = `bold ${Math.max(12, 18 * pos.s)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
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

    // 音效/音樂開關按鈕（暫時隱藏，等音檔備齊後再開放）
    // const btnSz = 20, btnY = 8, btnGap = 6;
    // const bgmBtnX = W - btnSz * 3 - btnGap * 2 - 50;
    // const sfxBtnX = bgmBtnX + btnSz + btnGap + 10;
    // ctx.fillStyle = sfxOn ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
    // ctx.font = `${btnSz - 4}px sans-serif`;
    // ctx.textAlign = 'center';
    // ctx.fillText(sfxOn ? 'SFX' : 'SFX', sfxBtnX + btnSz / 2, btnY + btnSz - 4);
    // if (!sfxOn) {
    //   ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2;
    //   ctx.beginPath(); ctx.moveTo(sfxBtnX, btnY); ctx.lineTo(sfxBtnX + btnSz, btnY + btnSz); ctx.stroke();
    //   ctx.lineWidth = 1;
    // }
    // ctx.fillStyle = bgmOn ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';
    // ctx.fillText(bgmOn ? 'BGM' : 'BGM', bgmBtnX + btnSz / 2, btnY + btnSz - 4);
    // if (!bgmOn) {
    //   ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2;
    //   ctx.beginPath(); ctx.moveTo(bgmBtnX, btnY); ctx.lineTo(bgmBtnX + btnSz, btnY + btnSz); ctx.stroke();
    //   ctx.lineWidth = 1;
    // }
    G._sfxBtn = null;
    G._bgmBtn = null;
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
    const titleSz = Math.min(42, W * 0.08);
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18;
    ctx.font = `bold ${titleSz}px "Noto Sans TC", sans-serif`;
    ctx.fillText('射門挑戰：前進世界盃', W / 2, H * 0.25);
    ctx.shadowBlur = 0;
    // 標題兩側足球
    const titleW = ctx.measureText('射門挑戰：前進世界盃').width;
    const ballDeco = Math.min(24, W * 0.045);
    drawIcon('multi1', W / 2 - titleW / 2 - ballDeco - 4, H * 0.25 - titleSz * 0.3, ballDeco);
    drawIcon('multi1', W / 2 + titleW / 2 + ballDeco + 4, H * 0.25 - titleSz * 0.3, ballDeco);

    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(18, W * 0.035)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('足球生存射門遊戲', W / 2, H * 0.32);

    // 裝飾分隔線
    const lineW = Math.min(180, W * 0.35);
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - lineW / 2, H * 0.35);
    ctx.lineTo(W / 2 + lineW / 2, H * 0.35);
    ctx.stroke();

    // 說明（帶圖示）
    const ruleIconSize = Math.min(22, W * 0.042);
    const ruleFontSz = Math.min(14, W * 0.028);
    const ruleLineH = Math.min(28, W * 0.052);
    const ruleStartY = H * 0.40;
    const ruleIcons = ['multi1', 'bounce', 'guard', 'crit'];
    const rules = [
      '點擊畫面踢出足球，射進球門得分',
      '防守球員會向你逼近，踢球擊退他們',
      '防守員突破底線會失去生命（共 3 條）',
      '每次進球可選一張強化卡強化你的射門',
    ];
    ctx.font = `${ruleFontSz}px "Noto Sans TC", sans-serif`;
    rules.forEach((r, i) => {
      const y = ruleStartY + i * ruleLineH;
      const textW = ctx.measureText(r).width;
      const totalW = ruleIconSize + 6 + textW;
      const startX = W / 2 - totalW / 2;
      // 圖示
      const iconId = ruleIcons[i];
      if (i === 2) {
        // 第三條用 SVG 愛心
        drawHeart(startX + ruleIconSize / 2, y - ruleFontSz * 0.3, ruleIconSize * 0.45);
      } else {
        drawIcon(iconId, startX + ruleIconSize / 2, y - ruleFontSz * 0.3, ruleIconSize);
      }
      // 文字
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${ruleFontSz}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(r, startX + ruleIconSize + 6, y);
      ctx.textAlign = 'center';
    });

    // 排行榜（週排行 + 歷史排行，來自 Supabase）
    const weeklyBoard = _rogueWeeklyBoard || [];
    const allTimeBoard = _rogueAllTimeBoard || [];
    const hasBoard = weeklyBoard.length > 0 || allTimeBoard.length > 0;

    if (hasBoard) {
      const lbY = H * 0.56;
      const lbFontSz = Math.min(11, W * 0.021);
      const lbLineH = Math.min(16, W * 0.03);
      const lbHeaderSz = Math.min(13, W * 0.026);
      const colRank = W * 0.18, colName = W * 0.4, colScore = W * 0.65, colWave = W * 0.82;

      function drawBoard(title, board, startY) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${lbHeaderSz}px "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(title, W / 2, startY);

        const headerY = startY + lbLineH;
        ctx.fillStyle = 'rgba(255,215,0,0.45)';
        ctx.font = `bold ${lbFontSz}px "Noto Sans TC", sans-serif`;
        ctx.fillText('#', colRank, headerY);
        ctx.fillText('玩家', colName, headerY);
        ctx.fillText('分數', colScore, headerY);
        ctx.fillText('Wave', colWave, headerY);

        const showCount = Math.min(board.length, 5);
        ctx.font = `${lbFontSz}px "Noto Sans TC", sans-serif`;
        for (let i = 0; i < showCount; i++) {
          const entry = board[i];
          const ey = headerY + (i + 1) * lbLineH;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
          ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.6)';
          ctx.fillText(`${medal}${i + 1}`, colRank, ey);
          const nick = (entry.nickname || '???').length > 6 ? (entry.nickname || '???').slice(0, 6) + '…' : (entry.nickname || '???');
          ctx.fillText(nick, colName, ey);
          ctx.fillText(`${entry.score}`, colScore, ey);
          ctx.fillText(`${entry.wave}`, colWave, ey);
        }
        // 週排行前 3 名提示寶石獎勵
        if (title.includes('週') && showCount > 0) {
          ctx.fillStyle = 'rgba(255,215,0,0.35)';
          ctx.font = `${Math.min(10, W * 0.019)}px "Noto Sans TC", sans-serif`;
          ctx.fillText('🏆 週排行 1st +3💎  2nd +2💎  3rd +1💎（每週日結算）', W / 2, headerY + (showCount + 1) * lbLineH + 2);
        }
        return headerY + (showCount + 1) * lbLineH + (title.includes('週') ? lbLineH + 4 : 4);
      }

      let nextY = lbY;
      if (weeklyBoard.length > 0) {
        nextY = drawBoard('⚡ 本週排行', weeklyBoard, nextY);
      }
      if (allTimeBoard.length > 0) {
        drawBoard('👑 歷史排行', allTimeBoard, nextY + 6);
      }
    } else {
      // 無 Supabase 資料時顯示本地最高紀錄
      const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
      if (best.score) {
        ctx.fillStyle = 'rgba(255,215,0,0.6)';
        ctx.font = `${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        drawTrophy(W / 2 - ctx.measureText(`最高紀錄：${best.score} 分（Wave ${best.wave}）`).width / 2 - 16, H * 0.60 - 6, 12);
        ctx.fillText(`最高紀錄：${best.score} 分（Wave ${best.wave}）`, W / 2, H * 0.60);
      }
    }

    // 開始按鈕
    const btnW = Math.min(220, W * 0.45), btnH = 50;
    const btnX = W / 2 - btnW / 2, btnY = H * 0.88;
    G._startR = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = '#4caf50';
    rr(ctx, btnX, btnY, btnW, btnH, 14); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(20, W * 0.04)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('開始遊戲', W / 2, btnY + 33);
  }

  // ─── SVG 卡片圖標系統 ─────────────────────────────────────
  // 精緻 SVG 圖標：預載為 Image，drawIcon 直接 drawImage
  const ICON_SVGS = {
    dmg20: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)">
      <circle cx="32" cy="32" r="22" fill="none" stroke="#ef5350" stroke-width="3" opacity="0.3"/>
      <path d="M32 10 L32 6 M32 54 L32 58 M10 32 L6 32 M54 32 L58 32" stroke="#ef5350" stroke-width="2" opacity="0.3"/>
      <text x="32" y="40" text-anchor="middle" font-size="28" font-weight="bold" fill="#ef5350" font-family="sans-serif">+20</text>
      <text x="32" y="52" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffcdd2" font-family="sans-serif">ATK</text>
      </g></svg>`,

    dmg30: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)">
      <circle cx="32" cy="32" r="22" fill="none" stroke="#ff7043" stroke-width="3" opacity="0.3"/>
      <path d="M32 10 L32 6 M32 54 L32 58 M10 32 L6 32 M54 32 L58 32" stroke="#ff7043" stroke-width="2" opacity="0.3"/>
      <text x="32" y="40" text-anchor="middle" font-size="28" font-weight="bold" fill="#ff7043" font-family="sans-serif">+30</text>
      <text x="32" y="52" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffab91" font-family="sans-serif">ATK</text>
      </g>
      <g stroke="#ff7043" stroke-width="2" stroke-linecap="round" opacity="0.5">
      <line x1="8" y1="12" x2="14" y2="18"/><line x1="50" y1="12" x2="56" y2="6"/><line x1="50" y1="52" x2="56" y2="58"/></g></svg>`,

    spd20: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#42a5f5"/><stop offset="100%" stop-color="#1565c0"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><path d="M20 12L28 12L30 32L48 36L48 50L14 50L14 36L18 30Z" fill="url(#s1)"/>
      <rect x="14" y="44" width="34" height="6" rx="2" fill="#0d47a1"/>
      <path d="M22 18h4v8h-4z" fill="#1565c0" opacity="0.4"/>
      <line x1="36" y1="38" x2="44" y2="40" stroke="#90caf9" stroke-width="1"/></g>
      <g stroke="#42a5f5" stroke-width="2.5" stroke-linecap="round" opacity="0.7">
      <line x1="2" y1="20" x2="12" y2="20"/><line x1="4" y1="30" x2="12" y2="30"/><line x1="2" y1="40" x2="10" y2="40"/></g></svg>`,

    spd40: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="l1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff176"/><stop offset="100%" stop-color="#f57f17"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><polygon points="36,2 22,28 32,28 26,62 44,24 34,24" fill="url(#l1)"/>
      <polygon points="36,2 22,28 32,28 26,62 44,24 34,24" fill="none" stroke="#fff" stroke-width="1" opacity="0.4"/></g>
      <line x1="30" y1="18" x2="34" y2="10" stroke="#fff" stroke-width="1.5" opacity="0.6"/></svg>`,

    bigball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <radialGradient id="g2" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#ccc"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g stroke="#ab47bc" stroke-width="1.5" opacity="0.45" fill="none">
      <line x1="15" y1="44" x2="26" y2="12"/><line x1="17" y1="55" x2="50" y2="35"/></g>
      <circle cx="10" cy="50" r="8" fill="url(#g1)" filter="url(#gl1)"/>
      <g fill="#444" opacity="0.3"><path d="M10 47l-2-1-1-2 1-2 3 0 1 2-1 2z"/></g>
      <circle cx="38" cy="24" r="18" fill="url(#g2)" filter="url(#gl1)"/>
      <g fill="#444" opacity="0.3"><path d="M38 18l-4-2-2-5 3-3 6 0 3 3-2 5z"/><path d="M28 26l-2-4 3-2 4 3 1 4-3 2z"/><path d="M48 26l2-4-3-2-4 3-1 4 3 2z"/><path d="M32 35l1-3 4 0 3 2-1 4-4 1z"/><path d="M44 35l-1-3-4 0-3 2 1 4 4 1z"/></g>
      <g stroke="#555" stroke-width="0.6" fill="none" opacity="0.2"><line x1="34" y1="18" x2="28" y2="22"/><line x1="42" y1="18" x2="48" y2="22"/><line x1="28" y1="30" x2="32" y2="35"/><line x1="48" y1="30" x2="44" y2="35"/></g></svg>`,

    bigball2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#ccc"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="#7e57c2" stroke-width="2" opacity="0.35" filter="url(#gl1)"/>
      <circle cx="32" cy="32" r="24" fill="none" stroke="#b39ddb" stroke-width="1" opacity="0.3"/>
      <circle cx="32" cy="32" r="22" fill="url(#g1)" filter="url(#gl1)"/>
      <g fill="#444" opacity="0.3"><path d="M32 25l-5-2-2-5 3-3 7 0 3 3-2 5z"/><path d="M21 33l-2-5 3-2 5 3 1 5-3 2z"/><path d="M43 33l2-5-3-2-5 3-1 5 3 2z"/><path d="M24 44l2-4 5 0 3 3-1 5-5 1z"/><path d="M40 44l-2-4-5 0-3 3 1 5 5 1z"/></g>
      <g stroke="#555" stroke-width="0.7" fill="none" opacity="0.2"><line x1="27" y1="25" x2="21" y2="28"/><line x1="37" y1="25" x2="43" y2="28"/><line x1="21" y1="36" x2="24" y2="40"/><line x1="43" y1="36" x2="40" y2="40"/><line x1="32" y1="18" x2="32" y2="25"/><line x1="29" y1="44" x2="32" y2="50"/><line x1="35" y1="44" x2="32" y2="50"/></g></svg>`,

    rapid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="16" cy="32" r="11" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M16 32l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/>
      <g stroke="#26c6da" stroke-width="3" stroke-linecap="round" filter="url(#gl1)">
      <line x1="32" y1="16" x2="48" y2="16"/><line x1="32" y1="32" x2="52" y2="32"/><line x1="32" y1="48" x2="48" y2="48"/></g>
      <g fill="#26c6da" filter="url(#gl1)"><polygon points="48,10 56,16 48,22"/><polygon points="52,26 60,32 52,38"/><polygon points="48,42 56,48 48,54"/></g></svg>`,

    rapid2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="16" cy="32" r="11" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M16 32l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/>
      <g stroke="#80deea" stroke-width="2.5" stroke-linecap="round" filter="url(#gl1)">
      <line x1="32" y1="22" x2="46" y2="22"/><line x1="34" y1="32" x2="50" y2="32"/><line x1="32" y1="42" x2="46" y2="42"/></g>
      <g fill="#80deea"><polygon points="46,17 52,22 46,27"/><polygon points="50,27 56,32 50,37"/><polygon points="46,37 52,42 46,47"/></g></svg>`,

    multi1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="38%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="20" cy="32" r="14" fill="url(#g1)" filter="url(#gl1)"/>
      <g fill="#444" opacity="0.35"><path d="M20 28l-3-1-1-3 2-2 4 0 2 2-1 3z"/><path d="M13 35l-1-3 2-1 3 2 0 3-2 1z"/><path d="M27 35l1-3-2-1-3 2 0 3 2 1z"/><path d="M16 41l1-2 3 0 2 2-1 3-3 0z"/><path d="M24 41l-1-2-3 0-2 2 1 3 3 0z"/></g>
      <g stroke="#555" stroke-width="0.5" fill="none" opacity="0.2"><line x1="17" y1="28" x2="13" y2="32"/><line x1="23" y1="28" x2="27" y2="32"/><line x1="13" y1="38" x2="17" y2="41"/><line x1="27" y1="38" x2="23" y2="41"/><line x1="20" y1="24" x2="20" y2="28"/></g>
      <circle cx="44" cy="32" r="14" fill="url(#g1)" filter="url(#gl1)"/>
      <g fill="#444" opacity="0.35" transform="translate(24,0)"><path d="M20 28l-3-1-1-3 2-2 4 0 2 2-1 3z"/><path d="M13 35l-1-3 2-1 3 2 0 3-2 1z"/><path d="M27 35l1-3-2-1-3 2 0 3 2 1z"/><path d="M16 41l1-2 3 0 2 2-1 3-3 0z"/><path d="M24 41l-1-2-3 0-2 2 1 3 3 0z"/></g>
      <g stroke="#555" stroke-width="0.5" fill="none" opacity="0.2" transform="translate(24,0)"><line x1="17" y1="28" x2="13" y2="32"/><line x1="23" y1="28" x2="27" y2="32"/><line x1="13" y1="38" x2="17" y2="41"/><line x1="27" y1="38" x2="23" y2="41"/><line x1="20" y1="24" x2="20" y2="28"/></g>
      <text x="32" y="58" text-anchor="middle" font-size="10" font-weight="bold" fill="#aaa">×2</text></svg>`,

    multi2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="38%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="32" cy="16" r="11" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M32 16l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/>
      <circle cx="16" cy="44" r="11" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M16 44l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/>
      <circle cx="48" cy="44" r="11" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M48 44l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/>
      <text x="32" y="62" text-anchor="middle" font-size="9" font-weight="bold" fill="#aaa">×3</text></svg>`,

    ironleg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="l1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b0bec5"/><stop offset="50%" stop-color="#78909c"/><stop offset="100%" stop-color="#546e7a"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><path d="M18 4h12v30l18 6v4l-18 4v8H14v-8l-2-4v-4l8-6z" fill="url(#l1)"/>
      <rect x="12" y="48" width="38" height="8" rx="3" fill="#455a64"/>
      <path d="M30 4h0v30" stroke="#90a4ae" stroke-width="1.5" opacity="0.4"/>
      <rect x="14" y="52" width="4" height="4" rx="1" fill="#37474f"/>
      <rect x="22" y="52" width="4" height="4" rx="1" fill="#37474f"/>
      <rect x="30" y="52" width="4" height="4" rx="1" fill="#37474f"/></g></svg>`,

    magnet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="6" y="4" width="14" height="18" rx="3" fill="#e53935"/>
      <rect x="44" y="4" width="14" height="18" rx="3" fill="#c62828"/>
      <rect x="6" y="16" width="14" height="6" fill="#1565c0"/>
      <rect x="44" y="16" width="14" height="6" fill="#0d47a1"/>
      <path d="M13 22v14a19 19 0 0 0 38 0V22" stroke="#b0bec5" stroke-width="8" fill="none"/>
      <path d="M13 22v14a19 19 0 0 0 38 0V22" stroke="#e0e0e0" stroke-width="4" fill="none"/>
      <g stroke="#42a5f5" stroke-width="1.5" opacity="0.6" stroke-linecap="round">
      <path d="M24 36c-4-2-6 2-2 4"/><path d="M40 36c4-2 6 2 2 4"/><path d="M30 42c-2 2 0 4 4 2"/></g>
      <text x="32" y="60" text-anchor="middle" font-size="9" font-weight="bold" fill="#42a5f5">+10%</text></svg>`,

    magnet2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="6" y="4" width="14" height="18" rx="3" fill="#e53935"/>
      <rect x="44" y="4" width="14" height="18" rx="3" fill="#c62828"/>
      <rect x="6" y="16" width="14" height="6" fill="#7b1fa2"/>
      <rect x="44" y="16" width="14" height="6" fill="#4a148c"/>
      <path d="M13 22v14a19 19 0 0 0 38 0V22" stroke="#9e9e9e" stroke-width="8" fill="none"/>
      <path d="M13 22v14a19 19 0 0 0 38 0V22" stroke="#ce93d8" stroke-width="4" fill="none"/>
      <g stroke="#ab47bc" stroke-width="1.5" opacity="0.6" stroke-linecap="round">
      <path d="M24 36c-4-2-6 2-2 4"/><path d="M40 36c4-2 6 2 2 4"/><path d="M30 42c-2 2 0 4 4 2"/></g>
      <text x="32" y="60" text-anchor="middle" font-size="9" font-weight="bold" fill="#ce93d8">+20%</text></svg>`,

    burn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="f1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff6d00"/><stop offset="50%" stop-color="#ff9100"/><stop offset="100%" stop-color="#ffd600"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><path d="M32 2C38 14 50 22 48 38c-1 8-6 14-12 16-2-4-1-10 2-14-4 4-10 6-12 14C20 50 16 42 18 32c1-6 4-10 8-16 2-4 4-10 6-14z" fill="url(#f1)"/>
      <path d="M32 60c-4-6-2-14 2-18 0 6 4 10 6 14-2 2-5 4-8 4z" fill="#fff9c4" opacity="0.7"/></g></svg>`,

    freeze: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g stroke="#4fc3f7" stroke-linecap="round" filter="url(#gl1)">
      <line x1="32" y1="4" x2="32" y2="60" stroke-width="3"/>
      <line x1="7" y1="18" x2="57" y2="46" stroke-width="3"/>
      <line x1="7" y1="46" x2="57" y2="18" stroke-width="3"/>
      <g stroke-width="2"><line x1="32" y1="14" x2="26" y2="10"/><line x1="32" y1="14" x2="38" y2="10"/>
      <line x1="32" y1="50" x2="26" y2="54"/><line x1="32" y1="50" x2="38" y2="54"/>
      <line x1="14" y1="22" x2="10" y2="28"/><line x1="14" y1="22" x2="12" y2="16"/>
      <line x1="50" y1="42" x2="54" y2="36"/><line x1="50" y1="42" x2="52" y2="48"/>
      <line x1="14" y1="42" x2="10" y2="36"/><line x1="14" y1="42" x2="12" y2="48"/>
      <line x1="50" y1="22" x2="54" y2="28"/><line x1="50" y1="22" x2="52" y2="16"/></g></g>
      <circle cx="32" cy="32" r="4" fill="#e1f5fe"/></svg>`,

    explode: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="e1" cx="50%" cy="50%"><stop offset="0%" stop-color="#fff"/><stop offset="30%" stop-color="#ffd600"/><stop offset="70%" stop-color="#ff6d00"/><stop offset="100%" stop-color="#e65100"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><polygon points="32,2 37,22 56,10 42,26 62,32 42,38 56,54 37,42 32,62 27,42 8,54 22,38 2,32 22,26 8,10 27,22" fill="url(#e1)"/></g>
      <circle cx="32" cy="32" r="8" fill="#fff" opacity="0.8"/></svg>`,

    sniper: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g stroke="#e53935" stroke-width="2.5" filter="url(#gl1)">
      <circle cx="32" cy="32" r="22" fill="none"/>
      <line x1="32" y1="2" x2="32" y2="18"/><line x1="32" y1="46" x2="32" y2="62"/>
      <line x1="2" y1="32" x2="18" y2="32"/><line x1="46" y1="32" x2="62" y2="32"/></g>
      <circle cx="32" cy="32" r="10" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M32 32l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/></svg>`,

    bounce: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g opacity="0.8"><circle cx="32" cy="14" r="7" fill="#4fc3f7"/><rect x="24" y="20" width="16" height="18" rx="3" fill="#4fc3f7"/></g>
      <path d="M10 56L30 30" stroke="#66bb6a" stroke-width="2" stroke-dasharray="4,3" fill="none" opacity="0.5"/>
      <circle cx="30" cy="30" r="3" fill="#ffd600" opacity="0.7"/>
      <path d="M30 30L54 56" stroke="#66bb6a" stroke-width="2.5" stroke-dasharray="4,3" fill="none" filter="url(#gl1)"/>
      <circle cx="54" cy="56" r="7" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M54 56l-2-1 1-3 1 0 2 0 1 3z" fill="#555" opacity="0.3"/></svg>`,

    crit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff5252"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><polygon points="36,2 20,28 30,28 24,62 46,22 36,22" fill="url(#c1)"/>
      <polygon points="36,2 20,28 30,28 24,62 46,22 36,22" fill="none" stroke="#ffcdd2" stroke-width="1" opacity="0.5"/></g>
      <text x="32" y="52" text-anchor="middle" font-size="14" font-weight="bold" fill="#ff8a80" opacity="0.8">!</text></svg>`,

    critG: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><polygon points="36,2 20,28 30,28 24,62 46,22 36,22" fill="url(#c1)"/>
      <polygon points="36,2 20,28 30,28 24,62 46,22 36,22" fill="none" stroke="#c8e6c9" stroke-width="1" opacity="0.5"/></g>
      <text x="32" y="52" text-anchor="middle" font-size="14" font-weight="bold" fill="#a5d6a7" opacity="0.8">!</text></svg>`,

    gkSlow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="gk1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffa726"/><stop offset="100%" stop-color="#e65100"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)">
      <path d="M12 10C12 6 18 2 32 2s20 4 20 8v20c0 8-8 16-20 16S12 38 12 30z" fill="url(#gk1)"/>
      <path d="M16 14h6v10h-6zM42 14h6v10h-6z" fill="#ffcc80" rx="2"/>
      <path d="M22 18h20v8H22z" fill="#fff3e0" opacity="0.3"/></g>
      <g filter="url(#gl1)"><polygon points="32,46 40,46 32,60 24,46" fill="#e65100"/>
      <line x1="32" y1="50" x2="32" y2="58" stroke="#ff6d00" stroke-width="1.5"/></g></svg>`,

    extraLife: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="sh1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#f9a825"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><path d="M32 4L54 16L50 44L32 58L14 44L10 16Z" fill="url(#sh1)" stroke="#f57f17" stroke-width="2"/>
      <path d="M32 4L54 16L50 44L32 58L14 44L10 16Z" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/></g>
      <line x1="32" y1="18" x2="32" y2="44" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <line x1="22" y1="31" x2="42" y2="31" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <path d="M32 12l4 8h-8z" fill="#fff" opacity="0.3"/></svg>`,

    guard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></linearGradient>
      <linearGradient id="s1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#f9a825"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><circle cx="32" cy="12" r="9" fill="url(#g1)"/>
      <rect x="22" y="20" width="20" height="24" rx="4" fill="url(#g1)"/>
      <rect x="16" y="24" width="8" height="6" rx="3" fill="#43a047"/>
      <rect x="40" y="24" width="8" height="6" rx="3" fill="#43a047"/></g>
      <g filter="url(#gl1)"><path d="M32 34L42 40L40 52L32 56L24 52L22 40Z" fill="url(#s1)" stroke="#f57f17" stroke-width="1.5"/></g>
      <line x1="32" y1="40" x2="32" y2="50" stroke="#fff" stroke-width="2" opacity="0.6"/>
      <line x1="27" y1="45" x2="37" y2="45" stroke="#fff" stroke-width="2" opacity="0.6"/></svg>`,

    power2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="22" cy="24" r="13" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M22 24l-4-3 2-5 4 1 4-1 2 5z" fill="#555" opacity="0.3"/>
      <g filter="url(#gl1)" stroke="#ff5252" stroke-width="2" fill="none" opacity="0.6">
      <path d="M38 24a4 4 0 0 1 4-8"/><path d="M42 24a6 6 0 0 1 6-12"/><path d="M46 24a8 8 0 0 1 8-16"/></g>
      <text x="40" y="54" text-anchor="middle" font-size="18" font-weight="bold" fill="#ff5252" filter="url(#gl1)">×2</text></svg>`,

    split: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><radialGradient id="g1" cx="40%" cy="35%"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#bbb"/></radialGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="32" cy="14" r="11" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M32 14l-3-2 1-4 3 0 3 0 1 4z" fill="#555" opacity="0.3"/>
      <g stroke="#ba68c8" stroke-width="2" stroke-dasharray="3,2"><line x1="28" y1="24" x2="18" y2="38"/><line x1="36" y1="24" x2="46" y2="38"/></g>
      <circle cx="14" cy="48" r="9" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M14 48l-2-2 1-3 2 0 2 0 1 3z" fill="#555" opacity="0.3"/>
      <circle cx="50" cy="48" r="9" fill="url(#g1)" filter="url(#gl1)"/>
      <path d="M50 48l-2-2 1-3 2 0 2 0 1 3z" fill="#555" opacity="0.3"/>
      <circle cx="32" cy="22" r="2" fill="#ba68c8" opacity="0.6"/></svg>`,

    timeSlow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="t1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e3f2fd"/><stop offset="100%" stop-color="#90caf9"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="32" cy="34" r="24" fill="none" stroke="#90caf9" stroke-width="3" filter="url(#gl1)"/>
      <circle cx="32" cy="34" r="22" fill="none" stroke="#bbdefb" stroke-width="1"/>
      <rect x="29" y="6" width="6" height="6" rx="2" fill="#90caf9"/>
      <line x1="32" y1="34" x2="32" y2="18" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <line x1="32" y1="34" x2="44" y2="38" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="32" cy="34" r="3" fill="#e3f2fd"/>
      <g fill="#90caf9" font-size="7" text-anchor="middle" opacity="0.5">
      <text x="32" y="17">12</text><text x="52" y="37">3</text><text x="32" y="57">6</text><text x="13" y="37">9</text></g></svg>`,

    ghost: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="gh1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d1c4e9"/><stop offset="100%" stop-color="#7c4dff"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)" opacity="0.75"><path d="M32 6C20 6 12 16 12 26v24l6-6 6 8 8-8 8 8 6-8 6 6V26C52 16 44 6 32 6z" fill="url(#gh1)"/>
      <path d="M32 6C20 6 12 16 12 26v24l6-6 6 8 8-8 8 8 6-8 6 6V26C52 16 44 6 32 6z" fill="none" stroke="#b388ff" stroke-width="1"/></g>
      <ellipse cx="24" cy="24" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="40" cy="24" rx="5" ry="6" fill="#fff"/>
      <circle cx="25" cy="25" r="2.5" fill="#311b92"/>
      <circle cx="41" cy="25" r="2.5" fill="#311b92"/></svg>`,

    vampire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="v1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ef5350"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient>
      <filter id="gl1"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><path d="M32 4C36 16 48 22 46 36c-1 8-6 14-14 18C24 50 19 44 18 36 16 22 28 16 32 4z" fill="url(#v1)"/>
      <path d="M32 4C36 16 48 22 46 36c-1 8-6 14-14 18" stroke="#ffcdd2" stroke-width="1" fill="none" opacity="0.3"/></g>
      <path d="M26 34l2 10 4-2 4 2 2-10" stroke="#fff" stroke-width="1.5" fill="none"/>
      <polygon points="28,34 30,42 32,36" fill="#fff"/>
      <polygon points="36,34 34,42 32,36" fill="#fff"/>
      <circle cx="26" cy="28" r="2" fill="#fff" opacity="0.3"/>
      <circle cx="38" cy="28" r="2" fill="#fff" opacity="0.3"/></svg>`,

  };

  // 預載 SVG → Image 快取
  const _iconCache = {};
  (function preloadIcons() {
    for (const [id, svg] of Object.entries(ICON_SVGS)) {
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      _iconCache[id] = img;
    }
  })();

  function drawIcon(c, cx, cy, sz) {
    const id = typeof c === 'string' ? c : c.id;
    const img = _iconCache[id];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, cx - sz / 2, cy - sz / 2, sz, sz);
    } else {
      // fallback：圓形+問號
      ctx.save();
      ctx.fillStyle = '#666';
      ctx.beginPath(); ctx.arc(cx, cy, sz * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${sz * 0.4}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy);
      ctx.restore();
    }
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

    const rarCol = { common:'#4a5568', uncommon:'#16a34a', rare:'#2563eb', epic:'#7c3aed', legendary:'#d97706' };
    const rarName = { common:'普通', uncommon:'進階', rare:'稀有', epic:'史詩', legendary:'傳說' };

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
      ctx.fillText(`收集了 ${G.collected.length} 張強化卡`, W / 2, H * 0.48);
    }

    // 未登入提示
    if (typeof currentUser === 'undefined' || !currentUser) {
      ctx.fillStyle = 'rgba(255,200,0,0.5)';
      ctx.font = `${Math.min(12, W * 0.023)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('💡 登入後分數會自動上傳排行榜', W / 2, H * 0.52);
    }

    // 週排行榜（精簡版）
    const goBoard = _rogueWeeklyBoard || [];
    if (goBoard.length > 0) {
      const lbFontSz = Math.min(11, W * 0.021);
      const lbLineH = Math.min(15, W * 0.028);
      const lbY = H * 0.52;
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 本週排行', W / 2, lbY);

      const colRank = W * 0.18, colName = W * 0.4, colScore = W * 0.65, colWave = W * 0.82;
      ctx.fillStyle = 'rgba(255,215,0,0.45)';
      ctx.font = `bold ${lbFontSz}px "Noto Sans TC", sans-serif`;
      const hY = lbY + lbLineH;
      ctx.fillText('#', colRank, hY);
      ctx.fillText('玩家', colName, hY);
      ctx.fillText('分數', colScore, hY);
      ctx.fillText('Wave', colWave, hY);

      const showCount = Math.min(goBoard.length, 5);
      ctx.font = `${lbFontSz}px "Noto Sans TC", sans-serif`;
      for (let i = 0; i < showCount; i++) {
        const entry = goBoard[i];
        const ey = hY + (i + 1) * lbLineH;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.6)';
        ctx.fillText(`${medal}${i + 1}`, colRank, ey);
        const nick = (entry.nickname || '???').length > 6 ? (entry.nickname || '???').slice(0, 6) + '…' : (entry.nickname || '???');
        ctx.fillText(nick, colName, ey);
        ctx.fillText(`${entry.score}`, colScore, ey);
        ctx.fillText(`${entry.wave}`, colWave, ey);
      }
    }

    // 按鈕（漸入完成才顯示）
    if (fade >= 1) {
      const btnW = Math.min(200, W * 0.4), btnH = 46;
      const bx = W / 2 - btnW / 2;

      const y1 = H * 0.82;
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

    // 音效/音樂開關判定
    if (G._sfxBtn && x >= G._sfxBtn.x && x <= G._sfxBtn.x + G._sfxBtn.w &&
        y >= G._sfxBtn.y && y <= G._sfxBtn.y + G._sfxBtn.h) {
      sfxOn = !sfxOn; return;
    }
    if (G._bgmBtn && x >= G._bgmBtn.x && x <= G._bgmBtn.x + G._bgmBtn.w &&
        y >= G._bgmBtn.y && y <= G._bgmBtn.y + G._bgmBtn.h) {
      bgmOn = !bgmOn;
      if (bgmOn) startBGM(curScene.name); else stopBGM();
      return;
    }

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

    // 載入排行榜 & 嘗試週結算
    loadRogueBoards();
    tryWeeklySettle();

    G = freshState();
    curScene = SCENES[Math.floor(Math.random() * SCENES.length)];
    ensureAudio();
    startBGM(curScene.name);
    prevTs = performance.now();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function closeGame() {
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (rafId) cancelAnimationFrame(rafId);
    stopBGM();
    G = null;
  }

  // ── 首頁排行榜渲染 ──────────────────────────────────────
  async function renderHomeLeaderboard() {
    const el = document.getElementById('rogue-home-leaderboard');
    if (!el) return;
    if (typeof DB === 'undefined') return;

    try {
      const [{ data: weekly }, { data: allTime }] = await Promise.all([
        DB.from('rogue_weekly_leaderboard').select('*').order('score', { ascending: false }).limit(5),
        DB.from('rogue_alltime_leaderboard').select('*').order('score', { ascending: false }).limit(5),
      ]);

      const wRows = weekly ?? [];
      const aRows = allTime ?? [];
      if (wRows.length === 0 && aRows.length === 0) {
        el.innerHTML = `<div class="rogue-home-lb-empty">
          <span>🏅</span> 還沒有人上榜，成為第一個挑戰者！
        </div>`;
        return;
      }

      const medals = ['🥇','🥈','🥉'];
      function buildTable(rows) {
        return rows.map((r, i) => `
          <div class="rogue-lb-row ${i < 3 ? 'rogue-lb-top3' : ''}">
            <span class="rogue-lb-rank">${medals[i] ?? '#' + (i+1)}</span>
            <span class="rogue-lb-name">${r.nickname || '???'}</span>
            <span class="rogue-lb-score">${r.score} 分</span>
            <span class="rogue-lb-wave">Wave ${r.wave}</span>
          </div>`).join('');
      }

      let html = '<div class="rogue-lb-tabs">';
      html += '<button class="rogue-lb-tab active" data-tab="weekly">⚡ 本週排行</button>';
      html += '<button class="rogue-lb-tab" data-tab="alltime">👑 歷史排行</button>';
      html += '</div>';
      html += `<div class="rogue-lb-panel" id="rogue-lb-weekly">${wRows.length ? buildTable(wRows) : '<div class="rogue-home-lb-empty">本週還沒有紀錄</div>'}</div>`;
      html += `<div class="rogue-lb-panel" id="rogue-lb-alltime" style="display:none">${aRows.length ? buildTable(aRows) : '<div class="rogue-home-lb-empty">還沒有紀錄</div>'}</div>`;

      el.innerHTML = html;

      // Tab 切換
      el.querySelectorAll('.rogue-lb-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          el.querySelectorAll('.rogue-lb-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('rogue-lb-weekly').style.display = btn.dataset.tab === 'weekly' ? '' : 'none';
          document.getElementById('rogue-lb-alltime').style.display = btn.dataset.tab === 'alltime' ? '' : 'none';
        });
      });
    } catch (e) { console.warn('renderHomeLeaderboard:', e); }
  }

  // 頁面載入後自動渲染首頁排行榜
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(renderHomeLeaderboard, 500));
  } else {
    setTimeout(renderHomeLeaderboard, 500);
  }

  // 公開 API
  window.startRogueGame = startGame;
  window.renderRogueLeaderboard = renderHomeLeaderboard;
})();
