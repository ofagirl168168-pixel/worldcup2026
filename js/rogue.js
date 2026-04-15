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

  // ─── 體力系統 ──────────────────────────────────────────────
  const STAMINA_MAX = 5;
  const STAMINA_REGEN_MS = 30 * 60 * 1000; // 30 分鐘回 1 點
  const STAMINA_KEY = 'rogue_stamina';
  const STAMINA_TS_KEY = 'rogue_stamina_ts'; // 上次更新時間

  function _loadStamina() {
    const saved = parseInt(localStorage.getItem(STAMINA_KEY));
    const ts = parseInt(localStorage.getItem(STAMINA_TS_KEY));
    if (isNaN(saved) || isNaN(ts)) {
      // 首次：給滿體力
      _saveStamina(STAMINA_MAX);
      return { stamina: STAMINA_MAX, updatedAt: Date.now() };
    }
    // 計算自然回復
    const elapsed = Date.now() - ts;
    const regen = Math.floor(elapsed / STAMINA_REGEN_MS);
    const cur = Math.min(STAMINA_MAX, saved + regen);
    // 更新時間戳（只推進已回復的量）
    const newTs = cur >= STAMINA_MAX ? Date.now() : ts + regen * STAMINA_REGEN_MS;
    if (regen > 0) {
      localStorage.setItem(STAMINA_KEY, cur);
      localStorage.setItem(STAMINA_TS_KEY, newTs);
    }
    return { stamina: cur, updatedAt: newTs };
  }

  function _saveStamina(val) {
    localStorage.setItem(STAMINA_KEY, Math.min(STAMINA_MAX, Math.max(0, val)));
    localStorage.setItem(STAMINA_TS_KEY, Date.now());
  }

  function getStamina() { return _loadStamina().stamina; }

  function useStamina() {
    const { stamina } = _loadStamina();
    if (stamina <= 0) return false;
    _saveStamina(stamina - 1);
    return true;
  }

  function addStamina(amount) {
    const { stamina } = _loadStamina();
    _saveStamina(Math.min(STAMINA_MAX, stamina + amount));
  }

  /** 下一點回復的剩餘毫秒（已滿則返回 0） */
  function staminaNextRegenMs() {
    const { stamina, updatedAt } = _loadStamina();
    if (stamina >= STAMINA_MAX) return 0;
    const elapsed = Date.now() - updatedAt;
    return Math.max(0, STAMINA_REGEN_MS - (elapsed % STAMINA_REGEN_MS));
  }

  /** 寶石補充體力（amount: 1 或 STAMINA_MAX） */
  let _refilling = false;
  async function _refillStamina(amount) {
    if (_refilling) return;
    const isMax = amount >= STAMINA_MAX;
    const cost = isMax ? 3 : 1;
    const spendType = isMax ? 'rogue_stamina_full' : 'rogue_stamina_1';

    // 已登入：走寶石扣款
    if (typeof currentUser !== 'undefined' && currentUser) {
      _refilling = true;
      const result = await spendGemForGame?.(spendType);
      _refilling = false;
      if (result?.error === '寶石不足') {
        G._staminaToast = '寶石不足'; G._staminaToastT = performance.now(); return;
      }
      if (result?.error) {
        G._staminaToast = result.error; G._staminaToastT = performance.now(); return;
      }
    } else {
      // 訪客：無法用寶石，提示登入
      G._staminaToast = '登入後可用寶石補充'; G._staminaToastT = performance.now(); return;
    }

    addStamina(isMax ? STAMINA_MAX : 1);
    G._staminaToast = `⚡ 體力 +${isMax ? '滿' : '1'}！`; G._staminaToastT = performance.now();
  }

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
  let sfxOn = localStorage.getItem('rogue_sfx') !== '0';
  let bgmOn = localStorage.getItem('rogue_bgm') !== '0';
  let bgmGain = null, sfxGain = null;
  let _bgmTimer = null, _bgmPlaying = false;

  // ── 預載音效檔 ──
  const SFX_FILES = {
    shoot:    'audio/sfx/shoot.mp3',
    hit:      'audio/sfx/hit.mp3',
    goal:     'audio/sfx/goal.mp3',
    block:    'audio/sfx/block.mp3',
    warning:  'audio/sfx/warning.mp3',
    card:     'audio/sfx/card.mp3',
    loselife: 'audio/sfx/loselife.mp3',
    gameover: 'audio/sfx/gameover.mp3',
    post:     'audio/sfx/post.mp3',
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
  function sfxPost()     { playSFX('post'); }

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
    '_title': 'audio/bgm-title.mp3',
    '_gameover': 'audio/bgm-gameover.mp3',
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
      audio.loop = sceneName !== '_gameover';
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
      phase: 'title',           // title | playing | paused | cards | gameover
      _pauseBtn: null,          // 暫停按鈕區域
      _pauseResumeR: null,      // 暫停選單：繼續按鈕
      _pauseQuitR: null,        // 暫停選單：離開按鈕
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
      _holdFiring: false,        // 長按連續射擊中
      _holdXY: null,             // 長按座標 {x,y}
      _holdTimer: null,          // 長按判定計時器
      _shootHintTimer: 8000,     // 射擊提示顯示時間（前8秒）

      // cards UI
      cardPick: [],
      _cardR: [],               // click rects
      _rerollR: null,           // reroll 按鈕區域
      _rerollsLeft: 2,          // 本波剩餘 reroll 次數
      _rerolling: false,        // reroll 請求中
      _restartR: null,
      _closeR: null,
      _reviveR: null,           // 復活按鈕區域
      _revived: false,          // 本局是否已復活
      _reviving: false,         // 復活請求中
      _resultSaved: false,      // 本局成績是否已儲存
      _deathFrame: null,        // 死亡瞬間的遊戲截圖 (dataURL)

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
    // 防守員數量：每階段上限 +2
    let maxCount;
    if (w <= 15)      maxCount = 16;
    else if (w <= 30) maxCount = 18;
    else if (w <= 50) maxCount = 20;
    else              maxCount = 22;
    const count = Math.min(3 + w, maxCount);
    const types = ['normal'];
    if (w >= 1) types.push('sentry');
    if (w >= 2) types.push('fast');
    if (w >= 3) { types.push('tank'); types.push('captain'); }
    // 中路守衛數量
    let maxSentry;
    if (w <= 15)      maxSentry = 4;
    else if (w <= 30) maxSentry = 5;
    else if (w <= 50) maxSentry = 6;
    else              maxSentry = 7;
    const sentryCount = Math.min(1 + Math.floor(w / 2), maxSentry);
    // 攔截者數量
    let maxCaptain;
    if (w <= 15)      maxCaptain = 3;
    else if (w <= 30) maxCaptain = 4;
    else if (w <= 50) maxCaptain = 5;
    else              maxCaptain = 6;
    const captainCount = w >= 3 ? Math.min(1 + Math.floor((w - 2) / 2), maxCaptain) : 0;
    // 血量成長：四階段加速
    let hpMul;
    if (w <= 30)      hpMul = Math.pow(1.20, w - 1);
    else if (w <= 50) hpMul = Math.pow(1.20, 29) * Math.pow(1.28, w - 30);
    else if (w <= 65) hpMul = Math.pow(1.20, 29) * Math.pow(1.28, 20) * Math.pow(1.35, w - 50);
    else              hpMul = Math.pow(1.20, 29) * Math.pow(1.28, 20) * Math.pow(1.35, 15) * Math.pow(1.45, w - 65);
    const spdMul = 1 + (w - 1) * 0.12;
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

    // 守門員加寬：wave 35、50 大幅加寬，55+ 每階微幅加寬（上限 110）
    if (G.wave === 35) G.gk.w = 65;
    else if (G.wave === 50) G.gk.w = 80;
    else if (G.wave >= 55 && G.wave % 5 === 0) G.gk.w = Math.min(110, G.gk.w + 3);

    // 每 5 波警告
    if (G.wave >= 5 && G.wave % 5 === 0) {
      let extraMsg = '';
      if (G.wave === 35) extraMsg = '⚠ 守門員體型加寬！封鎖角度增加';
      else if (G.wave === 50) extraMsg = '⚠ 守門員再次加寬！射門空間大幅縮小';
      G._warning = { timer: 3000, tier: gkTier, extraMsg };
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

    // ── 長按連續射擊 ──
    if (G._holdFiring && G._holdXY && G.canShoot) {
      shoot(G._holdXY.x, G._holdXY.y);
    }

    // ── 射擊提示倒數 ──
    if (G._shootHintTimer > 0) G._shootHintTimer -= dt;

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
      const effectiveGHW = Math.min(GOAL_HW * 1.6, GOAL_HW * (1 + (G.goalBonus || 0)));
      const smartGK = G.wave >= 40; // wave40+ 守門員只追會進球門的球
      let targetX = null, bestThreat = -Infinity;
      for (const b of G.balls) {
        if (!b.alive || b.vz <= 0) continue;
        const timeToGoal = (GOAL_Z - b.z) / b.vz;
        let predictX = b.x + b.vx * timeToGoal;
        while (predictX < -FIELD_HW || predictX > FIELD_HW) {
          if (predictX < -FIELD_HW) predictX = -2 * FIELD_HW - predictX;
          if (predictX > FIELD_HW) predictX = 2 * FIELD_HW - predictX;
        }
        // wave40+：預測落點不在球門範圍內的球直接忽略
        if (smartGK && Math.abs(predictX) > effectiveGHW + 20) continue;
        const threat = b.z;
        if (threat > bestThreat) { bestThreat = threat; targetX = predictX; }
      }
      // 也追蹤反彈球（vz < 0 但仍在場上且離球門近）
      if (targetX === null) {
        for (const b of G.balls) {
          if (!b.alive) continue;
          if (b.z > FIELD_DEPTH * 0.4) {
            // wave40+：不在球門範圍內的也忽略
            if (smartGK && Math.abs(b.x) > effectiveGHW + 30) continue;
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
    // 守門員巡邏範圍 = 球門判定寬度
    const effectiveGoalHW_ = Math.min(GOAL_HW * 1.6, GOAL_HW * (1 + (G.goalBonus || 0)));
    const gkPatrolHW = effectiveGoalHW_;
    if (gk.x > gkPatrolHW - gk.w / 2) { gk.x = gkPatrolHW - gk.w / 2; gk.dir = -1; }
    if (gk.x < -gkPatrolHW + gk.w / 2) { gk.x = -gkPatrolHW + gk.w / 2; gk.dir = 1; }

    // ── 足球更新 ──
    for (const b of G.balls) {
      if (!b.alive) continue;
      b.age += dt;
      // 門柱反彈球倒數消失
      if (b._postHitTimer !== undefined) {
        b._postHitTimer -= dt;
        if (b._postHitTimer <= 0) { b.alive = false; continue; }
      }

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
          if (b._split) dmg = Math.max(1, Math.ceil(dmg * 0.2));
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

      // 碰守門員（連續碰撞檢測：檢查球路徑是否穿過守門員 z）
      const prevZ = b.z - b.vz * step;
      const gkZmin = gk.z - 25, gkZmax = gk.z + 25;
      const crossedGK = (prevZ < gkZmax && b.z >= gkZmin) || (b.z >= gkZmin && b.z <= gkZmax);
      if (crossedGK) {
        // 計算球在守門員 z 位置時的 x（線性插值）
        let bxAtGK = b.x;
        if (Math.abs(b.vz) > 0.01) {
          const t = (gk.z - prevZ) / (b.vz * step);
          if (t >= 0 && t <= 1) bxAtGK = (b.x - b.vx * step) + b.vx * step * t;
        }
        if (Math.abs(bxAtGK - gk.x) < gk.w * 0.55) {
          b.alive = false;
          addPart(gk.x, gk.z, '', 0.8, 'block');
          sfxBlock();
          shakeAmt = 4;
          continue;
        }
      }

      // 進球判定（同一波只算一次）— 球中心必須在球門框內才算
      if (b.z >= GOAL_Z) {
        const effectiveGoalHW = Math.min(GOAL_HW * 1.6, GOAL_HW * (1 + (G.goalBonus || 0)));
        if (Math.abs(b.x) < effectiveGoalHW - b.r && G.phase === 'playing') {
          b.alive = false;
          onGoal(); return;
        }
        // 打到門柱：球反彈飛走 + 門柱特效（只觸發一次）
        if (!b._postHit && Math.abs(b.x) >= effectiveGoalHW - b.r - 15 && Math.abs(b.x) < effectiveGoalHW + 20) {
          const postX = Math.sign(b.x) * effectiveGoalHW;
          addPart(postX, GOAL_Z, '門柱！', 0.8, 'post_hit');
          sfxPost();
          shakeAmt = 6;
          b.vx = -b.vx * 0.6 + (Math.random() - 0.5) * 2;
          b.vz = -Math.abs(b.vz) * 0.4;
          b.z = GOAL_Z - 5;
          b._postHit = true;
          b._postHitTimer = 400; // 400ms 後消失
          continue;
        }
        // 完全偏離球門外 或 門柱反彈後再次飛出
        b.alive = false;
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
        if (G.lives <= 0) {
          // 先繪製死亡瞬間的遊戲畫面（不含 gameover overlay）作為分享截圖
          try { G._deathFrame = cvs.toDataURL('image/png'); } catch(e) { G._deathFrame = null; }
          G.phase = 'gameover'; G._holdFiring = false; G._holdXY = null; clearTimeout(G._holdTimer);
          G._gameoverStart = performance.now(); sfxGameOver(); startBGM('_gameover'); G._resultSaved = false; return;
        }
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
    G.phase = 'cards'; G._holdFiring = false; G._holdXY = null; clearTimeout(G._holdTimer);
    G.cardPick = pickCards(3);
    G._rerollsLeft = 2;  // 每波重置 reroll 次數
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
      const res = await fetch(`${FUNC_URL}/rogue-weekly-settle`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}' });
      const data = await res.json();
      // 結算成功且有得獎者 → 發放週徽章 + 寶石通知
      if (data.settled && data.winners?.length && typeof currentUser !== 'undefined' && currentUser) {
        const uid = currentUser.id;
        const myWin = data.winners.find(w => w.user_id === uid);
        if (myWin) {
          const wb = WEEKLY_BADGES[myWin.rank - 1]; // 前3名有徽章
          if (wb) {
            const existing = _loadWeeklyBadges();
            const weekKey = data.week || _weekKey();
            if (!existing.find(e => e.id === wb.id && e.week === weekKey)) {
              existing.push({ ...wb, date: new Date().toISOString(), week: weekKey });
              _saveWeeklyBadges(existing);
              if (typeof showToast === 'function') showToast(`${wb.icon} 恭喜獲得「${wb.name}」徽章！+${myWin.reward} 💎`);
            }
          } else if (myWin.reward) {
            // 第4~6名：只有寶石沒有徽章
            if (typeof showToast === 'function') showToast(`🎉 週排行第${myWin.rank}名！+${myWin.reward} 💎`);
          }
          if (typeof fetchGemBalance === 'function') fetchGemBalance().then(b => { if (typeof updateGemUI === 'function') updateGemUI(b); });
        }
      }
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

    // 檢查並頒發遊戲徽章（徽章附帶 XP）
    const newBadges = checkBadges(G.score, G.wave, G.collected.length, G._revived);
    if (newBadges.length > 0) {
      const badgeXP = newBadges.reduce((sum, b) => sum + (b.xp || 0), 0);
      if (badgeXP > 0) {
        const prevXP = parseInt(localStorage.getItem('rogue_total_xp') || '0') || 0;
        localStorage.setItem('rogue_total_xp', String(prevXP + badgeXP));
        if (typeof updateNavXP === 'function') updateNavXP();
        if (typeof syncXPToProfile === 'function') syncXPToProfile();
      }
      const names = newBadges.map(b => `${b.icon} ${b.name}${b.xp ? ` (+${b.xp}XP)` : ''}`).join('、');
      G._badgeToast = `🎉 新徽章：${names}`;
      G._badgeToastT = performance.now();
    }

    // 上傳 Supabase（已登入時）
    if (typeof currentUser !== 'undefined' && currentUser && typeof callEdge === 'function') {
      const _score = G.score, _wave = G.wave;
      callEdge('submit-rogue-score', { score: _score, wave: _wave }).then(res => {
        if (res.error) { console.warn('submit-rogue-score:', res.error); return; }
        console.log('分數已上傳:', _score, 'wave:', _wave);
        // 重新載入排行榜（遊戲內+首頁）
        _rogueBoardLoaded = false;
        loadRogueBoards().then(() => {
          if (typeof renderRogueLeaderboard === 'function') renderRogueLeaderboard();
        });
      });
    } else {
      console.log('未登入，分數未上傳');
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
      // 中二台詞
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
        '守門員突破次元壁！物理法則已不適用',
        '守門員：「這片球門，是我的領域」',
        '守門員進入永恆模式！時間在此靜止',
      ];
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(16, W * 0.032)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(msgs[Math.min(tier - 1, msgs.length - 1)], W / 2, H * 0.56);
      // 加寬特殊提示
      const extraMsg = G._warning.extraMsg;
      if (extraMsg) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
        ctx.fillText(extraMsg, W / 2, H * 0.61);
      }
      ctx.globalAlpha = 1;
    }

    if (G.phase === 'cards')    drawCards();
    if (G.phase === 'gameover') drawGameOver();
    if (G.phase === 'paused')   drawPaused();

    ctx.restore();
  }

  // ─── 暫停畫面 ─────────────────────────────────────────────
  function drawPaused() {
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H * 0.42;
    const fs = Math.min(28, W * 0.065);

    // 標題
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${fs}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('⏸ 暫停', cx, cy);

    // 按鈕共用
    const btnW = Math.min(200, W * 0.5);
    const btnH = 48;
    const btnR = 12;
    const btnFS = Math.min(17, W * 0.04);
    const gap = 20;

    // 繼續遊戲 按鈕
    const rY = cy + 30;
    ctx.save();
    rr(ctx, cx - btnW / 2, rY, btnW, btnH, btnR);
    ctx.fillStyle = 'rgba(76,175,80,0.8)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${btnFS}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('▶ 繼續遊戲', cx, rY + btnH * 0.62);
    ctx.restore();
    G._pauseResumeR = { x: cx - btnW / 2, y: rY, w: btnW, h: btnH };

    // 離開遊戲 按鈕
    const qY = rY + btnH + gap;
    ctx.save();
    rr(ctx, cx - btnW / 2, qY, btnW, btnH, btnR);
    ctx.fillStyle = 'rgba(239,68,68,0.7)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${btnFS}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('✕ 離開遊戲', cx, qY + btnH * 0.62);
    ctx.restore();
    G._pauseQuitR = { x: cx - btnW / 2, y: qY, w: btnW, h: btnH };

    // 小提示
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${Math.min(12, W * 0.028)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('離開將結束本局遊戲', cx, qY + btnH + 30);
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
        case 'post_hit': { // 門柱撞擊火花
          // 白色閃光
          const pr = sz * (0.6 + t * 2);
          ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, pr * 0.3, 0, Math.PI * 2); ctx.fill();
          // 金屬火花擴散
          ctx.strokeStyle = `rgba(255,200,50,${a})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(pos.x, pos.y + fy, pr, 0, Math.PI * 2); ctx.stroke();
          // 碎片粒子
          for (let si = 0; si < 6; si++) {
            const ang = (Math.PI * 2 / 6) * si + t * 2;
            const sd = pr * (0.5 + t * 0.8);
            const sx2 = pos.x + Math.cos(ang) * sd;
            const sy2 = pos.y + fy + Math.sin(ang) * sd;
            ctx.fillStyle = `rgba(255,${180 + si * 10},0,${a * 0.7})`;
            ctx.fillRect(sx2 - 2, sy2 - 2, 4, 4);
          }
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

    // 射門提示（前8秒，點擊後消失）
    if (G.phase === 'playing' && G._shootHintTimer > 0) {
      const fadeStart = 1500;
      const alpha = G._shootHintTimer > fadeStart ? 0.85
                   : G._shootHintTimer / fadeStart * 0.85;
      const fs = Math.min(14, W * 0.033);
      const iconSz = Math.min(36, W * 0.085);
      const rowH = iconSz + fs + 14;
      const yPos = H * 0.72;

      ctx.save();
      ctx.globalAlpha = alpha;

      // 背景膠囊
      const pw = Math.min(200, W * 0.5), ph = rowH * 2 + 30;
      const bx = (W - pw) / 2, by = yPos - ph / 2;
      const cr = 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.moveTo(bx + cr, by); ctx.lineTo(bx + pw - cr, by);
      ctx.quadraticCurveTo(bx + pw, by, bx + pw, by + cr);
      ctx.lineTo(bx + pw, by + ph - cr);
      ctx.quadraticCurveTo(bx + pw, by + ph, bx + pw - cr, by + ph);
      ctx.lineTo(bx + cr, by + ph);
      ctx.quadraticCurveTo(bx, by + ph, bx, by + ph - cr);
      ctx.lineTo(bx, by + cr);
      ctx.quadraticCurveTo(bx, by, bx + cr, by);
      ctx.closePath();
      ctx.fill();

      const midX = W / 2;

      // ── 第一行：點擊 + 閃爍發散線 ──
      const y1icon = by + 18 + iconSz / 2;
      _drawTapIcon(midX, y1icon, iconSz);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${fs}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('精準射擊', midX, y1icon + iconSz / 2 + fs + 4);

      // ── 第二行：長按 + 擴散波紋 ──
      const y2icon = y1icon + rowH + 4;
      _drawHoldIcon(midX, y2icon, iconSz);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${fs}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('連續射擊', midX, y2icon + iconSz / 2 + fs + 4);

      ctx.restore();
    }

    drawAudioBtns();
  }

  // ─── 音效/音樂開關按鈕（共用） ─────────────────────────────
  function drawAudioBtns() {
    const sz = Math.min(30, W * 0.06);
    const gap = 6;
    const bY = 14;
    // 關閉按鈕佔 right 12px + 36px = 48px，按鈕放在其左側
    const sfxX = W - 52 - sz;
    const bgmX = sfxX - sz - gap;

    // BGM 按鈕
    ctx.save();
    rr(ctx, bgmX, bY, sz, sz, 8);
    ctx.fillStyle = bgmOn ? 'rgba(76,175,80,0.5)' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.strokeStyle = bgmOn ? 'rgba(76,175,80,0.8)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5; ctx.stroke();
    // 音符圖示 ♪
    ctx.fillStyle = bgmOn ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.font = `${sz * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('♪', bgmX + sz / 2, bY + sz * 0.65);
    // 關閉時畫斜線
    if (!bgmOn) {
      ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bgmX + sz * 0.2, bY + sz * 0.8);
      ctx.lineTo(bgmX + sz * 0.8, bY + sz * 0.2);
      ctx.stroke();
    }
    ctx.restore();

    // SFX 按鈕
    ctx.save();
    rr(ctx, sfxX, bY, sz, sz, 8);
    ctx.fillStyle = sfxOn ? 'rgba(33,150,243,0.5)' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    ctx.strokeStyle = sfxOn ? 'rgba(33,150,243,0.8)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5; ctx.stroke();
    // 喇叭圖示
    ctx.fillStyle = sfxOn ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.font = `${sz * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🔊', sfxX + sz / 2, bY + sz * 0.65);
    // 關閉時畫斜線
    if (!sfxOn) {
      ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sfxX + sz * 0.2, bY + sz * 0.8);
      ctx.lineTo(sfxX + sz * 0.8, bY + sz * 0.2);
      ctx.stroke();
    }
    ctx.restore();

    G._bgmBtn = { x: bgmX, y: bY, w: sz, h: sz };
    G._sfxBtn = { x: sfxX, y: bY, w: sz, h: sz };

    // 暫停按鈕（僅 playing 階段，放左上角）
    if (G.phase === 'playing') {
      const pX = 14, pY = bY;
      ctx.save();
      rr(ctx, pX, pY, sz, sz, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5; ctx.stroke();
      // ⏸ 兩條豎線
      const bw = sz * 0.18, bh = sz * 0.45;
      const cx = pX + sz / 2, cy = pY + sz / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(cx - bw - 2, cy - bh / 2, bw, bh);
      ctx.fillRect(cx + 2, cy - bh / 2, bw, bh);
      ctx.restore();
      G._pauseBtn = { x: pX, y: pY, w: sz, h: sz };
    } else {
      G._pauseBtn = null;
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

    // ── 標題 ──
    const titleSz = Math.min(36, W * 0.07);
    const tTime = performance.now() * 0.001;
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18;
    ctx.font = `bold ${titleSz}px "Noto Sans TC", sans-serif`;
    ctx.fillText('射門挑戰：前進世界盃', W / 2, H * 0.06 + titleSz);
    ctx.shadowBlur = 0;
    const titleW = ctx.measureText('射門挑戰：前進世界盃').width;
    const ballDeco = Math.min(18, W * 0.035);
    // 兩側 ⚽ 彈跳
    const bounceL = Math.abs(Math.sin(tTime * 3)) * 7;
    const bounceR = Math.abs(Math.sin(tTime * 3 + 0.8)) * 7;
    const ballBaseY = H * 0.06 + titleSz;
    ctx.font = `${ballDeco}px sans-serif`;
    ctx.fillText('⚽', W / 2 - titleW / 2 - ballDeco - 6, ballBaseY - bounceL);
    ctx.fillText('⚽', W / 2 + titleW / 2 + ballDeco - 4, ballBaseY - bounceR);

    // ── 個人最高紀錄 + 本週最高 ──
    const best = JSON.parse(localStorage.getItem('rogue_best') || '{}');
    const bestY = H * 0.06 + titleSz + 24;
    const recFz = Math.min(13, W * 0.026);

    // 從週排行榜找自己的本週最高
    let weeklyBest = null;
    if (_rogueWeeklyBoard?.length && typeof currentUser !== 'undefined' && currentUser) {
      weeklyBest = _rogueWeeklyBoard.find(e => e.user_id === currentUser.id);
    }

    if (best.score || weeklyBest) {
      ctx.font = `bold ${recFz}px "Noto Sans TC", sans-serif`;
      // 歷史最高
      if (best.score) {
        ctx.fillStyle = 'rgba(255,215,0,0.7)';
        const allText = `🏆 歷史最高 ${best.score} 分 · W${best.wave}`;
        ctx.fillText(allText, W / 2, bestY);
      }
      // 本週最高
      if (weeklyBest) {
        ctx.fillStyle = 'rgba(79,195,247,0.8)';
        const weekText = `⚡ 本週最高 ${weeklyBest.score} 分 · W${weeklyBest.wave}`;
        ctx.fillText(weekText, W / 2, bestY + recFz + 4);
      } else if (best.score) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = `${Math.min(11, W * 0.022)}px "Noto Sans TC", sans-serif`;
        ctx.fillText('本週尚無紀錄', W / 2, bestY + recFz + 4);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('尚無紀錄，開始你的第一場挑戰！', W / 2, bestY);
    }

    // ── 三頁 Tab：排行 | 里程碑 | 徽章 ──
    if (!G._titleTab) G._titleTab = 'board';
    const panelW = Math.min(W * 0.92, 400);
    const panelX = (W - panelW) / 2;
    const tabStartY = bestY + recFz * 2 + 16;
    const tabH = Math.min(32, W * 0.06);
    const pr = 10;
    const tabKeys = [
      { key: 'board',  label: '⚡ 排行' },
      { key: 'miles',  label: '🎁 里程碑' },
      { key: 'badge',  label: '🏅 徽章' },
    ];
    const tabW = panelW / tabKeys.length;
    if (!G._titleTabR) G._titleTabR = [];
    tabKeys.forEach((tab, ti) => {
      const tx = panelX + ti * tabW;
      const active = G._titleTab === tab.key;
      ctx.save();
      ctx.beginPath();
      if (ti === 0) {
        ctx.moveTo(tx + pr, tabStartY); ctx.arcTo(tx + tabW, tabStartY, tx + tabW, tabStartY + tabH, 0);
        ctx.lineTo(tx + tabW, tabStartY + tabH); ctx.lineTo(tx, tabStartY + tabH);
        ctx.arcTo(tx, tabStartY, tx + pr, tabStartY, pr);
      } else if (ti === tabKeys.length - 1) {
        ctx.moveTo(tx, tabStartY); ctx.arcTo(tx + tabW, tabStartY, tx + tabW, tabStartY + tabH, pr);
        ctx.arcTo(tx + tabW, tabStartY + tabH, tx, tabStartY + tabH, 0);
        ctx.lineTo(tx, tabStartY + tabH); ctx.lineTo(tx, tabStartY);
      } else {
        ctx.rect(tx, tabStartY, tabW, tabH);
      }
      ctx.closePath();
      ctx.fillStyle = active ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.3)';
      ctx.fill();
      ctx.restore();
      const tabFz = Math.min(13, W * 0.026);
      ctx.font = `${active ? 'bold' : ''} ${tabFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = active ? '#ffd700' : 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, tx + tabW / 2, tabStartY + tabH * 0.68);
      if (active) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(tx + tabW * 0.1, tabStartY + tabH - 2, tabW * 0.8, 2);
      }
      G._titleTabR[ti] = { x: tx, y: tabStartY, w: tabW, h: tabH, key: tab.key };
    });

    // ── 內容面板區域 ──
    const contentY = tabStartY + tabH + 2;
    const btnH = 50;
    const btnY = H - btnH - Math.min(H * 0.04, 20);
    const contentH = btnY - contentY - 66; // 留空間給體力顯示

    // 面板背景
    rr(ctx, panelX, contentY, panelW, contentH, pr);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    rr(ctx, panelX, contentY, panelW, contentH, pr);
    ctx.strokeStyle = 'rgba(255,215,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();

    // 裁剪面板區域
    ctx.save();
    rr(ctx, panelX, contentY, panelW, contentH, pr);
    ctx.clip();

    if (G._titleTab === 'board') {
      _drawBoardTab(panelX, contentY, panelW, contentH);
    } else if (G._titleTab === 'miles') {
      _drawMilesTab(panelX, contentY, panelW, contentH, best);
    } else if (G._titleTab === 'badge') {
      _drawBadgeTab(panelX, contentY, panelW, contentH);
    }

    ctx.restore();

    // ── 體力顯示 ──
    const stCur = getStamina();
    const stFull = stCur >= STAMINA_MAX;
    const stEmpty = stCur <= 0;
    const stY = btnY - 52;
    const stFz = Math.min(14, W * 0.028);

    // 體力圖示 ⚡ N/5
    ctx.textAlign = 'center';
    ctx.font = `bold ${stFz}px "Noto Sans TC", sans-serif`;
    const stText = `⚡ ${stCur}/${STAMINA_MAX}`;
    ctx.fillStyle = stEmpty ? '#ef5350' : '#ffd740';
    ctx.fillText(stText, W / 2, stY + stFz);

    // 體力條
    const barW = Math.min(180, W * 0.36);
    const barH = 8;
    const barX = W / 2 - barW / 2;
    const barY = stY + stFz + 6;
    rr(ctx, barX, barY, barW, barH, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();
    if (stCur > 0) {
      rr(ctx, barX, barY, barW * (stCur / STAMINA_MAX), barH, 4);
      ctx.fillStyle = stEmpty ? '#ef5350' : '#ffd740'; ctx.fill();
    }

    // 倒數計時
    if (!stFull) {
      const regenMs = staminaNextRegenMs();
      const regenMin = Math.floor(regenMs / 60000);
      const regenSec = Math.floor((regenMs % 60000) / 1000);
      const pad = regenSec < 10 ? '0' : '';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.min(11, W * 0.022)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(`${regenMin}:${pad}${regenSec} 後回復 1 體力`, W / 2, barY + barH + 14);
    }

    // 體力不足時：寶石補充按鈕
    G._staminaRefill1R = null;
    G._staminaRefillFullR = null;
    if (stEmpty) {
      const rfBtnW = Math.min(130, W * 0.28);
      const rfBtnH = 32;
      const rfGap = 8;
      const rfY = barY + barH + 24;
      const rfX1 = W / 2 - rfBtnW - rfGap / 2;
      const rfX2 = W / 2 + rfGap / 2;

      // 1💎 +1
      rr(ctx, rfX1, rfY, rfBtnW, rfBtnH, 8);
      ctx.fillStyle = 'rgba(33,150,243,0.3)'; ctx.fill();
      ctx.strokeStyle = 'rgba(33,150,243,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#90caf9';
      ctx.font = `bold ${Math.min(12, W * 0.024)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('💎1 → ⚡+1', rfX1 + rfBtnW / 2, rfY + 21);
      G._staminaRefill1R = { x: rfX1, y: rfY, w: rfBtnW, h: rfBtnH };

      // 3💎 補滿
      rr(ctx, rfX2, rfY, rfBtnW, rfBtnH, 8);
      ctx.fillStyle = 'rgba(255,152,0,0.3)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,152,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffcc80';
      ctx.fillText('💎3 → ⚡滿', rfX2 + rfBtnW / 2, rfY + 21);
      G._staminaRefillFullR = { x: rfX2, y: rfY, w: rfBtnW, h: rfBtnH };
    }

    // ── 開始按鈕 ──
    const btnW = Math.min(220, W * 0.45);
    const btnX = W / 2 - btnW / 2;
    G._startR = stEmpty ? null : { x: btnX, y: btnY, w: btnW, h: btnH };
    const t = performance.now() * 0.001;

    // 漸層按鈕底色 + 呼吸光暈
    if (stEmpty) {
      ctx.fillStyle = 'rgba(100,100,100,0.5)';
      rr(ctx, btnX, btnY, btnW, btnH, 14); ctx.fill();
    } else {
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.5);
      // 外層光暈
      ctx.shadowColor = `rgba(76,175,80,${0.4 * pulse})`;
      ctx.shadowBlur = 16 + 8 * pulse;
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
      btnGrad.addColorStop(0, '#43a047');
      btnGrad.addColorStop(0.5, '#66bb6a');
      btnGrad.addColorStop(1, '#2e7d32');
      ctx.fillStyle = btnGrad;
      rr(ctx, btnX, btnY, btnW, btnH, 14); ctx.fill();
      ctx.shadowBlur = 0;
      // 高光掃過效果
      ctx.save();
      rr(ctx, btnX, btnY, btnW, btnH, 14); ctx.clip();
      const shineX = btnX - btnW + ((t * 0.3) % 1) * btnW * 3;
      const shine = ctx.createLinearGradient(shineX, btnY, shineX + btnW * 0.4, btnY);
      shine.addColorStop(0, 'rgba(255,255,255,0)');
      shine.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.restore();
    }

    // 按鈕文字
    const btnFz = Math.min(20, W * 0.04);
    ctx.textAlign = 'center';

    if (stEmpty) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `bold ${btnFz}px "Noto Sans TC", sans-serif`;
      ctx.fillText('體力不足', W / 2, btnY + 33);
    } else {
      // 主文字：開始遊戲
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${btnFz}px "Noto Sans TC", sans-serif`;
      const mainW = ctx.measureText('開始遊戲').width;
      const costFz = Math.min(12, W * 0.024);
      ctx.font = `bold ${costFz}px "Noto Sans TC", sans-serif`;
      const costW = ctx.measureText('⚡-1').width;
      const totalW = mainW + 10 + costW;
      const baseX = W / 2 - totalW / 2;

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${btnFz}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('開始遊戲', baseX, btnY + 33);

      // ⚡-1 標示（金色小字）
      ctx.font = `bold ${costFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = 'rgba(255,215,0,0.8)';
      ctx.fillText('⚡-1', baseX + mainW + 10, btnY + 33);
      ctx.textAlign = 'center';
    }

    // 體力 Toast
    if (G._staminaToast && performance.now() - (G._staminaToastT || 0) < 2500) {
      const sta = Math.min(1, (2500 - (performance.now() - G._staminaToastT)) / 500);
      ctx.globalAlpha = sta;
      const stw = Math.min(220, W * 0.55);
      rr(ctx, W / 2 - stw / 2, H * 0.45, stw, 32, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
      ctx.fillStyle = G._staminaToast.includes('不足') || G._staminaToast.includes('登入') ? '#ef5350' : '#ffd740';
      ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(G._staminaToast, W / 2, H * 0.45 + 22);
      ctx.globalAlpha = 1;
    }

    drawAudioBtns();
  }

  // ── 排行榜 Tab ──
  function _drawBoardTab(px, py, pw, ph) {
    const weeklyBoard = _rogueWeeklyBoard || [];
    const allTimeBoard = _rogueAllTimeBoard || [];
    if (weeklyBoard.length === 0 && allTimeBoard.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('尚無排行資料', px + pw / 2, py + ph / 2);
      return;
    }

    // 排行子 Tab（週排行 / 歷史排行）
    if (!G._lbTab) G._lbTab = 'weekly';
    const subTabH = Math.min(26, W * 0.048);
    const subTabs = [
      { key: 'weekly', label: '本週' },
      { key: 'alltime', label: '歷史' },
    ];
    const subTabW = pw * 0.35;
    if (!G._lbTabR) G._lbTabR = [];
    subTabs.forEach((st, si) => {
      const sx = px + pw / 2 - subTabs.length * subTabW / 2 + si * subTabW;
      const active = G._lbTab === st.key;
      rr(ctx, sx, py + 6, subTabW - 4, subTabH, 6);
      ctx.fillStyle = active ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'; ctx.fill();
      ctx.font = `${active ? 'bold' : ''} ${Math.min(12, W * 0.024)}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = active ? '#ffd700' : 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      ctx.fillText(st.label, sx + (subTabW - 4) / 2, py + 6 + subTabH * 0.65);
      G._lbTabR[si] = { x: sx, y: py + 6, w: subTabW - 4, h: subTabH, key: st.key };
    });

    const curBoard = G._lbTab === 'weekly' ? weeklyBoard : allTimeBoard;
    const rowH = Math.min(32, W * 0.060);
    const headerH = Math.min(26, W * 0.048);
    const startY = py + 6 + subTabH + 12;

    // 表頭
    const hdrFz = Math.min(12, W * 0.024);
    const colRank = px + pw * 0.10;
    const colName = px + pw * 0.38;
    const colScore = px + pw * 0.66;
    const colWave = px + pw * 0.88;
    ctx.font = `bold ${hdrFz}px "Noto Sans TC", sans-serif`;
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('#', colRank, startY);
    ctx.fillText('玩家', colName, startY);
    ctx.fillText('分數', colScore, startY);
    ctx.fillText('Wave', colWave, startY);

    // 排行列表
    const showCount = Math.min(curBoard.length, 5);
    const bodyFz = Math.min(13, W * 0.026);
    const medals = ['🥇', '🥈', '🥉'];
    const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
    for (let i = 0; i < showCount; i++) {
      const entry = curBoard[i];
      const ey = startY + headerH + i * rowH;
      if (i < 3) {
        ctx.fillStyle = ['rgba(255,215,0,0.1)', 'rgba(192,192,192,0.07)', 'rgba(205,127,50,0.06)'][i];
        rr(ctx, px + 6, ey - rowH * 0.6, pw - 12, rowH - 2, 4); ctx.fill();
      }
      ctx.font = `bold ${bodyFz}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      if (i < 3) { ctx.fillStyle = rankColors[i]; ctx.fillText(medals[i], colRank, ey); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillText(`${i + 1}`, colRank, ey); }
      ctx.font = `${bodyFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = i < 3 ? rankColors[i] : 'rgba(255,255,255,0.65)';
      ctx.fillText(entry.nickname || '???', colName, ey);
      ctx.font = `bold ${bodyFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = i === 0 ? '#fff' : i < 3 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)';
      ctx.fillText(`${entry.score}`, colScore, ey);
      ctx.font = `${bodyFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(`${entry.wave}`, colWave, ey);
    }

    // 週排行獎勵提示
    if (G._lbTab === 'weekly') {
      const tipY = startY + headerH + showCount * rowH + 12;
      const tipFz = Math.min(11, W * 0.022);
      ctx.font = `${tipFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = 'rgba(255,215,0,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('🏆1st +5💎  🥈2nd +3💎  🥉3rd +2💎  4~6th +1💎', px + pw / 2, tipY);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `${Math.min(10, W * 0.018)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('每週日結算', px + pw / 2, tipY + tipFz + 4);
    }
  }

  // ── 里程碑 Tab ──
  function _drawMilesTab(px, py, pw, ph, best) {
    const claimed = _loadMilestones();
    const bestScore = best.score || 0;
    const rowH = Math.min(58, ph / 5.5);
    const pad = 10;
    const iconSz = Math.min(38, rowH - 12);
    G._milestoneR = [];

    ctx.textAlign = 'left';

    MILESTONES.forEach((ms, i) => {
      const ry = py + 8 + i * (rowH + 4);
      const isClaimed = claimed.includes(ms.score);
      const canClaim = bestScore >= ms.score && !isClaimed;
      const progress = Math.min(1, bestScore / ms.score);

      // 行背景
      rr(ctx, px + pad, ry, pw - pad * 2, rowH, 8);
      ctx.fillStyle = canClaim ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)'; ctx.fill();
      ctx.strokeStyle = canClaim ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1; ctx.stroke();

      // 寶箱圖示
      const chestX = px + pad + 6 + iconSz / 2;
      const chestY = ry + rowH / 2;
      const chestImg = _iconCache[ms.chest];
      if (chestImg && chestImg.complete && chestImg.naturalWidth > 0) {
        ctx.globalAlpha = isClaimed ? 0.35 : 1;
        ctx.drawImage(chestImg, chestX - iconSz / 2, chestY - iconSz / 2, iconSz, iconSz);
        ctx.globalAlpha = 1;
      }

      // 目標文字
      const textX = px + pad + iconSz + 18;
      const nameFz = Math.min(13, W * 0.026);
      ctx.font = `bold ${nameFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = isClaimed ? 'rgba(255,255,255,0.35)' : ms.color;
      ctx.fillText(`${ms.tier}寶箱 — ${ms.score.toLocaleString()} 分`, textX, ry + 18);

      // 寶石獎勵
      const gemFz = Math.min(11, W * 0.022);
      ctx.font = `${gemFz}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = isClaimed ? 'rgba(255,255,255,0.25)' : 'rgba(255,215,0,0.7)';
      ctx.fillText(`💎 ×${ms.gems}`, textX, ry + 34);

      // 進度條
      const barX = textX;
      const barW = pw - pad * 2 - iconSz - 80;
      const barH = 8;
      const barY = ry + rowH - barH - 8;

      // 進度條背景
      rr(ctx, barX, barY, barW, barH, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
      // 進度條填充
      if (progress > 0) {
        rr(ctx, barX, barY, barW * progress, barH, 4);
        ctx.fillStyle = isClaimed ? 'rgba(255,255,255,0.15)' : ms.color;
        ctx.globalAlpha = isClaimed ? 0.4 : 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // 進度文字
      ctx.font = `${Math.min(10, W * 0.019)}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.min(bestScore, ms.score).toLocaleString()}/${ms.score.toLocaleString()}`, px + pw - pad - 6, barY + barH - 1);
      ctx.textAlign = 'left';

      // 領取按鈕 / 已領取標記
      const btnW2 = 52, btnH2 = 22;
      const btnX2 = px + pw - pad - btnW2 - 6;
      const btnY2 = ry + 6;
      if (isClaimed) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = `${Math.min(11, W * 0.022)}px "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('✓ 已領', btnX2 + btnW2 / 2, btnY2 + btnH2 / 2 + 4);
        ctx.textAlign = 'left';
      } else if (canClaim) {
        rr(ctx, btnX2, btnY2, btnW2, btnH2, 6);
        // 脈動光效
        const pulse = Math.sin(performance.now() * 0.004) * 0.15 + 0.85;
        ctx.fillStyle = `rgba(255,215,0,${pulse * 0.9})`;
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.min(11, W * 0.022)}px "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('領取', btnX2 + btnW2 / 2, btnY2 + btnH2 / 2 + 4);
        ctx.textAlign = 'left';
        G._milestoneR.push({ x: btnX2, y: btnY2, w: btnW2, h: btnH2, idx: i });
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        rr(ctx, btnX2, btnY2, btnW2, btnH2, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = `${Math.min(10, W * 0.02)}px "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🔒', btnX2 + btnW2 / 2, btnY2 + btnH2 / 2 + 4);
        ctx.textAlign = 'left';
      }
    });

    ctx.textAlign = 'center';
  }

  // ── 徽章 Tab ──
  function _drawBadgeTab(px, py, pw, ph) {
    const badges = _loadBadges();
    const weeklyBadges = _loadWeeklyBadges().filter(b => {
      return (Date.now() - new Date(b.date).getTime()) / 86400000 < 7;
    });

    const pad = 10;
    let curY = py + 12;
    const sectionFz = Math.min(13, W * 0.026);

    // ── 限定徽章（週冠軍～季軍）──
    if (weeklyBadges.length > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${sectionFz}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🔥 限定徽章（7天）', px + pw / 2, curY);
      curY += 20;

      const wbSize = Math.min(56, (pw - pad * 2) / 4);
      const wbGap = 10;
      const totalW = weeklyBadges.length * wbSize + (weeklyBadges.length - 1) * wbGap;
      weeklyBadges.forEach((wb, i) => {
        const bx = px + pw / 2 - totalW / 2 + i * (wbSize + wbGap);
        const by = curY;
        // 光圈
        ctx.save();
        ctx.shadowColor = wb.color; ctx.shadowBlur = 12;
        rr(ctx, bx, by, wbSize, wbSize, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
        ctx.strokeStyle = wb.border || wb.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        // 圖示
        ctx.font = `${Math.min(24, wbSize * 0.45)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(wb.icon, bx + wbSize / 2, by + wbSize * 0.45);
        // 名稱
        ctx.font = `bold ${Math.min(10, W * 0.02)}px "Noto Sans TC", sans-serif`;
        ctx.fillStyle = wb.color;
        ctx.fillText(wb.name, bx + wbSize / 2, by + wbSize - 6);
      });
      curY += wbSize + 16;
    }

    // ── 遊戲成就徽章 ──
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${sectionFz}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🏅 遊戲成就', px + pw / 2, curY);
    curY += 16;

    const cols = 3;
    const badgeW = Math.min(100, (pw - pad * 2 - (cols - 1) * 8) / cols);
    const badgeH = badgeW + 16;
    const gap = 8;

    BADGES.forEach((b, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = px + pad + col * (badgeW + gap);
      const by = curY + row * (badgeH + gap);
      const earned = !!badges[b.id];

      // 徽章卡背景
      rr(ctx, bx, by, badgeW, badgeH, 10);
      ctx.fillStyle = earned ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)'; ctx.fill();
      ctx.strokeStyle = earned ? b.color + '88' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = earned ? 1.5 : 0.5; ctx.stroke();

      // 圖示
      ctx.globalAlpha = earned ? 1 : 0.25;
      ctx.font = `${Math.min(28, badgeW * 0.32)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(b.icon, bx + badgeW / 2, by + badgeW * 0.4);

      // 名稱
      ctx.font = `bold ${Math.min(11, W * 0.022)}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = earned ? b.color : 'rgba(255,255,255,0.3)';
      ctx.fillText(b.name, bx + badgeW / 2, by + badgeW * 0.65);

      // 描述
      ctx.font = `${Math.min(9, W * 0.017)}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = earned ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';
      ctx.fillText(b.desc, bx + badgeW / 2, by + badgeW * 0.65 + 14);

      // XP 獎勵
      if (b.xp) {
        ctx.font = `bold ${Math.min(8, W * 0.015)}px "Noto Sans TC", sans-serif`;
        ctx.fillStyle = earned ? 'rgba(255,215,0,0.4)' : 'rgba(255,215,0,0.2)';
        ctx.fillText(`+${b.xp} XP`, bx + badgeW / 2, by + badgeW * 0.65 + 26);
      }

      // 日期（已獲得時）
      if (earned) {
        ctx.font = `${Math.min(8, W * 0.015)}px "Noto Sans TC", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillText(badges[b.id], bx + badgeW / 2, by + badgeH - 4);
      }

      ctx.globalAlpha = 1;
    });
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
      <defs><filter id="gl1"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g filter="url(#gl1)"><path d="M32 56 C6 36 6 16 20 12 C28 9 32 18 32 18 C32 18 36 9 44 12 C58 16 58 36 32 56Z" fill="#ef5350" stroke="#c62828" stroke-width="1.5"/></g>
      <path d="M20 16 C24 13 28 16 32 22 C28 16 22 14 20 16Z" fill="#fff" opacity="0.35"/>
      <text x="50" y="20" font-family="sans-serif" font-weight="bold" font-size="22" fill="#fff" stroke="#c62828" stroke-width="1">+1</text></svg>`,

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

    // ── 寶箱圖示（5 階級）──
    chest_bronze: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="cb1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d4a574"/><stop offset="100%" stop-color="#8b5e3c"/></linearGradient></defs>
      <rect x="8" y="28" width="48" height="28" rx="4" fill="url(#cb1)" stroke="#6d4c2a" stroke-width="2"/>
      <rect x="8" y="28" width="48" height="12" rx="4" fill="#c49660"/>
      <path d="M8 22 Q32 10 56 22 L56 32 Q32 20 8 32Z" fill="#d4a574" stroke="#6d4c2a" stroke-width="1.5"/>
      <rect x="27" y="34" width="10" height="10" rx="2" fill="#6d4c2a"/><circle cx="32" cy="39" r="3" fill="#ffd700"/></svg>`,
    chest_silver: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="cs1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8e8e8"/><stop offset="100%" stop-color="#a0a0a0"/></linearGradient></defs>
      <rect x="8" y="28" width="48" height="28" rx="4" fill="url(#cs1)" stroke="#707070" stroke-width="2"/>
      <rect x="8" y="28" width="48" height="12" rx="4" fill="#d0d0d0"/>
      <path d="M8 22 Q32 10 56 22 L56 32 Q32 20 8 32Z" fill="#e0e0e0" stroke="#888" stroke-width="1.5"/>
      <rect x="27" y="34" width="10" height="10" rx="2" fill="#707070"/><circle cx="32" cy="39" r="3" fill="#fff"/>
      <g opacity="0.3"><line x1="14" y1="44" x2="22" y2="44" stroke="#fff" stroke-width="1"/><line x1="42" y1="44" x2="50" y2="44" stroke="#fff" stroke-width="1"/></g></svg>`,
    chest_gold: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd700"/><stop offset="100%" stop-color="#b8860b"/></linearGradient>
      <filter id="cgl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="8" y="28" width="48" height="28" rx="4" fill="url(#cg1)" stroke="#8b6914" stroke-width="2"/>
      <rect x="8" y="28" width="48" height="12" rx="4" fill="#ffe066"/>
      <path d="M8 22 Q32 10 56 22 L56 32 Q32 20 8 32Z" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>
      <rect x="27" y="34" width="10" height="10" rx="2" fill="#8b6914"/><circle cx="32" cy="39" r="3" fill="#fff" filter="url(#cgl)"/>
      <g opacity="0.4"><circle cx="18" cy="20" r="2" fill="#fff"/><circle cx="46" cy="20" r="2" fill="#fff"/><circle cx="32" cy="14" r="1.5" fill="#fff"/></g></svg>`,
    chest_diamond: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="cd1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#64b5f6"/><stop offset="100%" stop-color="#1565c0"/></linearGradient>
      <filter id="cdl"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="8" y="28" width="48" height="28" rx="4" fill="url(#cd1)" stroke="#0d47a1" stroke-width="2"/>
      <rect x="8" y="28" width="48" height="12" rx="4" fill="#90caf9"/>
      <path d="M8 22 Q32 10 56 22 L56 32 Q32 20 8 32Z" fill="#64b5f6" stroke="#1565c0" stroke-width="1.5"/>
      <rect x="27" y="34" width="10" height="10" rx="2" fill="#0d47a1"/><polygon points="32,36 35,39 32,42 29,39" fill="#e0f7fa" filter="url(#cdl)"/>
      <g opacity="0.5"><circle cx="16" cy="18" r="2" fill="#e0f7fa"/><circle cx="48" cy="18" r="2" fill="#e0f7fa"/><circle cx="32" cy="12" r="2.5" fill="#e0f7fa"/></g></svg>`,
    chest_legendary: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="cl1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e040fb"/><stop offset="50%" stop-color="#7c4dff"/><stop offset="100%" stop-color="#ff6d00"/></linearGradient>
      <filter id="cll"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="8" y="28" width="48" height="28" rx="4" fill="url(#cl1)" stroke="#4a148c" stroke-width="2"/>
      <rect x="8" y="28" width="48" height="12" rx="4" fill="#ce93d8"/>
      <path d="M8 22 Q32 10 56 22 L56 32 Q32 20 8 32Z" fill="#e040fb" stroke="#7c4dff" stroke-width="1.5"/>
      <rect x="27" y="34" width="10" height="10" rx="2" fill="#4a148c"/><circle cx="32" cy="39" r="3.5" fill="#ffd700" filter="url(#cll)"/>
      <g opacity="0.6"><circle cx="14" cy="16" r="2.5" fill="#ffd740"/><circle cx="50" cy="16" r="2.5" fill="#ffd740"/><circle cx="32" cy="10" r="3" fill="#fff"/><circle cx="22" cy="13" r="1.5" fill="#e0f7fa"/><circle cx="42" cy="13" r="1.5" fill="#e0f7fa"/></g></svg>`,

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

  // ═══════════════════════════════════════════════════════════
  //  生涯里程碑 & 成就徽章系統
  // ═══════════════════════════════════════════════════════════
  const MILESTONES = [
    { score: 4000,  gems: 1, chest: 'chest_bronze',    tier: '銅', color: '#d4a574' },
    { score: 6000,  gems: 2, chest: 'chest_silver',    tier: '銀', color: '#c0c0c0' },
    { score: 8000,  gems: 3, chest: 'chest_gold',      tier: '金', color: '#ffd700' },
    { score: 10000, gems: 4, chest: 'chest_diamond',   tier: '鑽石', color: '#64b5f6' },
    { score: 12000, gems: 5, chest: 'chest_legendary', tier: '傳說', color: '#e040fb' },
  ];

  const BADGES = [
    { id: 'first_game',   name: '初試身手',   desc: '完成第一場遊戲',          icon: '⚽', color: '#4caf50', xp: 5 },
    { id: 'wave_10',      name: '小有實力',   desc: '單局達到 Wave 10',        icon: '⚡', color: '#2196f3', xp: 10 },
    { id: 'wave_20',      name: '射門高手',   desc: '單局達到 Wave 20',        icon: '🔥', color: '#ff9800', xp: 20 },
    { id: 'wave_30',      name: '傳奇射手',   desc: '單局達到 Wave 30',        icon: '💀', color: '#f44336', xp: 35 },
    { id: 'wave_50',      name: '不可阻擋',   desc: '單局達到 Wave 50',        icon: '👑', color: '#ffd700', xp: 50 },
    { id: 'cards_15',     name: '卡牌收藏家', desc: '單局收集 15 張強化卡',    icon: '🃏', color: '#ab47bc', xp: 15 },
    { id: 'cards_25',     name: '全副武裝',   desc: '單局收集 25 張強化卡',    icon: '💎', color: '#7c4dff', xp: 30 },
    { id: 'score_5000',   name: '五千分俱樂部', desc: '單局得分超過 5000',     icon: '🏅', color: '#ff6d00', xp: 25 },
    { id: 'phoenix',      name: '不死鳥',     desc: '復活後仍達到 Wave 15+',   icon: '🔄', color: '#e91e63', xp: 20 },
    { id: 'games_10',     name: '常客',       desc: '累計遊玩 10 場',          icon: '🎮', color: '#009688', xp: 15 },
    { id: 'games_50',     name: '射門狂人',   desc: '累計遊玩 50 場',          icon: '🏟️', color: '#3f51b5', xp: 30 },
  ];

  const WEEKLY_BADGES = [
    { rank: 1, id: 'weekly_1st', name: '週冠軍', icon: '🏆', color: '#ffd700', border: '#b8860b' },
    { rank: 2, id: 'weekly_2nd', name: '週亞軍', icon: '🥈', color: '#c0c0c0', border: '#888' },
    { rank: 3, id: 'weekly_3rd', name: '週季軍', icon: '🥉', color: '#cd7f32', border: '#8b5e3c' },
  ];

  // localStorage 存取
  function _loadMilestones() {
    try { return JSON.parse(localStorage.getItem('rogue_milestones') || '[]'); } catch { return []; }
  }
  function _saveMilestones(arr) { localStorage.setItem('rogue_milestones', JSON.stringify(arr)); }

  function _loadBadges() {
    try { return JSON.parse(localStorage.getItem('rogue_badges') || '{}'); } catch { return {}; }
  }
  function _saveBadges(obj) { localStorage.setItem('rogue_badges', JSON.stringify(obj)); }

  function _loadGameCount() {
    return parseInt(localStorage.getItem('rogue_game_count') || '0', 10);
  }
  function _incGameCount() {
    const c = _loadGameCount() + 1;
    localStorage.setItem('rogue_game_count', String(c));
    return c;
  }

  function _loadWeeklyBadges() {
    try { return JSON.parse(localStorage.getItem('rogue_weekly_badges') || '[]'); } catch { return []; }
  }
  function _saveWeeklyBadges(arr) { localStorage.setItem('rogue_weekly_badges', JSON.stringify(arr)); }

  // 領取里程碑寶箱
  async function claimMilestone(ms) {
    const claimed = _loadMilestones();
    if (claimed.includes(ms.score)) return;
    // 先嘗試伺服器發放寶石
    if (typeof awardGem === 'function') {
      const r = await awardGem(`rogue_milestone_${ms.score}`);
      if (r) {
        if (typeof showToast === 'function') showToast(`💎 里程碑 ${ms.score} 分！+${r.awarded} 寶石`);
      }
    }
    claimed.push(ms.score);
    _saveMilestones(claimed);
  }

  // 遊戲結束時檢查並頒發徽章
  function checkBadges(score, wave, cardsCount, revived) {
    const badges = _loadBadges();
    const gameCount = _incGameCount();
    let newBadges = [];

    const checks = [
      { id: 'first_game',   cond: true },
      { id: 'wave_10',      cond: wave >= 10 },
      { id: 'wave_20',      cond: wave >= 20 },
      { id: 'wave_30',      cond: wave >= 30 },
      { id: 'wave_50',      cond: wave >= 50 },
      { id: 'cards_15',     cond: cardsCount >= 15 },
      { id: 'cards_25',     cond: cardsCount >= 25 },
      { id: 'score_5000',   cond: score >= 5000 },
      { id: 'phoenix',      cond: revived && wave >= 15 },
      { id: 'games_10',     cond: gameCount >= 10 },
      { id: 'games_50',     cond: gameCount >= 50 },
    ];

    for (const { id, cond } of checks) {
      if (cond && !badges[id]) {
        badges[id] = new Date().toISOString().slice(0, 10);
        newBadges.push(BADGES.find(b => b.id === id));
      }
    }
    _saveBadges(badges);
    return newBadges;
  }

  // 清理過期週徽章（保留 7 天內的）
  function cleanWeeklyBadges() {
    const existing = _loadWeeklyBadges().filter(b => {
      return (Date.now() - new Date(b.date).getTime()) / 86400000 < 7;
    });
    _saveWeeklyBadges(existing);
    return existing;
  }

  function _weekKey() {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${wk}`;
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

    // 提示文字 + Reroll 按鈕（全部翻完才顯示）
    if (allRevealed) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `${Math.min(14, W * 0.03)}px "Noto Sans TC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('點擊卡片選擇', W / 2, H * 0.85);

      // Reroll 按鈕
      const hasLogin = typeof currentUser !== 'undefined' && !!currentUser;
      const canReroll = hasLogin && G._rerollsLeft > 0;
      const rbtnW = Math.min(220, W * 0.5), rbtnH = 38;
      const rbtnX = W / 2 - rbtnW / 2, rbtnY = H * 0.89;
      G._rerollR = canReroll ? { x: rbtnX, y: rbtnY, w: rbtnW, h: rbtnH } : null;

      if (canReroll) {
        rr(ctx, rbtnX, rbtnY, rbtnW, rbtnH, 10);
        ctx.fillStyle = G._rerolling ? 'rgba(156,39,176,0.3)' : 'rgba(156,39,176,0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(156,39,176,0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
        ctx.fillText(G._rerolling ? '處理中...' : `🔄 重新抽卡（💎1）剩 ${G._rerollsLeft} 次`, W / 2, rbtnY + 25);
      }

      // Reroll toast
      if (G._rerollToast && performance.now() - (G._rerollToastT || 0) < 2000) {
        const ta = Math.min(1, (2000 - (performance.now() - G._rerollToastT)) / 500);
        ctx.globalAlpha = ta;
        const tw = Math.min(200, W * 0.5);
        rr(ctx, W / 2 - tw / 2, H * 0.06, tw, 32, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
        ctx.fillStyle = '#ff5252';
        ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
        ctx.fillText(G._rerollToast, W / 2, H * 0.06 + 22);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ─── 結算畫面 ────────────────────────────────────────────
  // 成績評語
  function scorePraise(score, wave) {
    if (wave >= 50) return { text: '傳說級射手！你已突破極限！', color: '#ff4081' };
    if (wave >= 35) return { text: '世界級表現！守門員都怕你！', color: '#ffd700' };
    if (wave >= 25) return { text: '太強了！職業級的射門！', color: '#ff9800' };
    if (wave >= 15) return { text: '很不錯！潛力無限！', color: '#4fc3f7' };
    if (wave >= 8)  return { text: '不錯的開始，繼續加油！', color: '#81c784' };
    if (wave >= 3)  return { text: '初試身手，下次會更好！', color: '#aaa' };
    return { text: '別氣餒，再來一次！', color: '#aaa' };
  }

  // 分享遊戲成績（生成圖片）
  async function shareScore(score, wave) {
    const praise = scorePraise(score, wave);
    const url = window.location.origin + '?play=rogue';
    const shareText = `⚽ 射門挑戰：前進世界盃\n🏅 分數 ${score}｜Wave ${wave}\n${praise.text}\n你能打敗我嗎？來挑戰！👇\n${url}`;

    // 載入 QR Code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&color=0a0f1e&bgcolor=ffffff&margin=8`;
    const qrImg = await loadImg?.(qrUrl).catch(() => null);

    // 載入死亡截圖
    let deathImg = null;
    if (G._deathFrame) {
      try {
        deathImg = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = G._deathFrame;
        });
      } catch(e) { deathImg = null; }
    }

    // ── 生成分享圖片 ──
    const IW = 720, IH = 1280;
    const sc = document.createElement('canvas');
    sc.width = IW; sc.height = IH;
    const c = c2d(sc);

    // 背景
    const bg = c.createLinearGradient(0, 0, IW, IH);
    bg.addColorStop(0, '#050810'); bg.addColorStop(0.4, '#0d1030'); bg.addColorStop(1, '#050810');
    c.fillStyle = bg; c.fillRect(0, 0, IW, IH);

    const PAD = 36;
    c.textAlign = 'center'; c.textBaseline = 'middle';

    // ── 頂部標題 ──
    c.fillStyle = '#ffd700';
    c.font = `900 28px "Noto Sans TC", sans-serif`;
    c.fillText('⚽ 射門挑戰：前進世界盃', IW/2, 48);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = `500 14px "Noto Sans TC", sans-serif`;
    c.fillText(window.location.host, IW/2, 78);

    // 分隔線
    const divGrad = c.createLinearGradient(PAD, 0, IW-PAD, 0);
    divGrad.addColorStop(0, 'transparent'); divGrad.addColorStop(0.5, 'rgba(255,215,0,0.4)'); divGrad.addColorStop(1, 'transparent');
    c.strokeStyle = divGrad; c.lineWidth = 1;
    c.beginPath(); c.moveTo(PAD, 100); c.lineTo(IW-PAD, 100); c.stroke();

    // ── 遊戲截圖區域 ──
    const ssY = 116;
    const ssH = 340;
    const ssW = IW - PAD*2;
    // 圓角裁剪框
    c.save();
    rr(c, PAD, ssY, ssW, ssH, 12); c.clip();
    if (deathImg) {
      // 將死亡截圖等比填滿區域（cover）
      const imgRatio = deathImg.width / deathImg.height;
      const boxRatio = ssW / ssH;
      let sx = 0, sy = 0, sw = deathImg.width, sh = deathImg.height;
      if (imgRatio > boxRatio) {
        sw = deathImg.height * boxRatio;
        sx = (deathImg.width - sw) / 2;
      } else {
        sh = deathImg.width / boxRatio;
        sy = (deathImg.height - sh) / 2;
      }
      c.drawImage(deathImg, sx, sy, sw, sh, PAD, ssY, ssW, ssH);
      // 底部漸層遮罩
      const mask = c.createLinearGradient(0, ssY + ssH - 80, 0, ssY + ssH);
      mask.addColorStop(0, 'transparent'); mask.addColorStop(1, 'rgba(5,8,16,0.9)');
      c.fillStyle = mask; c.fillRect(PAD, ssY, ssW, ssH);
    } else {
      // 無截圖時顯示遊戲風格佔位
      const glow = c.createRadialGradient(IW/2, ssY + ssH/2, 0, IW/2, ssY + ssH/2, ssH);
      glow.addColorStop(0, 'rgba(255,215,0,0.08)'); glow.addColorStop(1, 'rgba(5,8,16,0.3)');
      c.fillStyle = glow; c.fillRect(PAD, ssY, ssW, ssH);
      c.fillStyle = 'rgba(255,255,255,0.15)';
      c.font = `900 48px "Noto Sans TC", sans-serif`;
      c.fillText('⚽', IW/2, ssY + ssH/2);
    }
    c.restore();
    // 截圖邊框
    rr(c, PAD, ssY, ssW, ssH, 12);
    c.strokeStyle = 'rgba(255,215,0,0.25)'; c.lineWidth = 2; c.stroke();
    // 截圖上角標 GAME OVER
    if (deathImg) {
      c.fillStyle = 'rgba(255,0,0,0.85)';
      rr(c, PAD + 12, ssY + 12, 130, 30, 6); c.fill();
      c.fillStyle = '#fff';
      c.font = `900 14px "Noto Sans TC", sans-serif`;
      c.fillText('GAME OVER', PAD + 12 + 65, ssY + 28);
    }

    // ── 評語（帶光暈）──
    const praiseY = ssY + ssH + 40;
    c.fillStyle = praise.color;
    c.shadowColor = praise.color; c.shadowBlur = 20;
    c.font = `900 30px "Noto Sans TC", sans-serif`;
    c.fillText(praise.text, IW/2, praiseY);
    c.shadowBlur = 0;

    // ── 分數大字 ──
    c.fillStyle = '#ffd700';
    c.shadowColor = '#ffd700'; c.shadowBlur = 30;
    c.font = `900 86px "Noto Sans TC", sans-serif`;
    c.fillText(`${score}`, IW/2, praiseY + 90);
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,215,0,0.5)';
    c.font = `600 16px "Noto Sans TC", sans-serif`;
    c.fillText('SCORE', IW/2, praiseY + 132);

    // ── Wave + 強化卡 數量 ──
    const statY = praiseY + 160;
    const statW = 180, statH = 64, statGap = 24;
    const stats = [
      { label: 'WAVE', value: `${wave}`, color: '#4fc3f7' },
      { label: '強化卡', value: `${G.collected.length} 張`, color: '#ab47bc' },
    ];
    stats.forEach((s, i) => {
      const sx = IW/2 - (stats.length * statW + (stats.length-1) * statGap) / 2 + i * (statW + statGap);
      rr(c, sx, statY, statW, statH, 12);
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fill();
      c.strokeStyle = `${s.color}44`; c.lineWidth = 1; c.stroke();
      c.fillStyle = s.color;
      c.font = `900 26px "Noto Sans TC", sans-serif`;
      c.fillText(s.value, sx + statW/2, statY + 28);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.font = `500 12px "Noto Sans TC", sans-serif`;
      c.fillText(s.label, sx + statW/2, statY + 52);
    });

    // ── 卡牌 Build 展示（帶圖示）──
    const cardY = statY + statH + 30;
    const rarCol = { common:'#4a5568', uncommon:'#16a34a', rare:'#2563eb', epic:'#7c3aed', legendary:'#d97706' };
    const rarBorder = { common:'#6b7280', uncommon:'#22c55e', rare:'#3b82f6', epic:'#8b5cf6', legendary:'#f59e0b' };
    const cardCount = {};
    G.collected.forEach(id => { cardCount[id] = (cardCount[id]||0) + 1; });
    const uniqueCards = [...new Set(G.collected)].map(id => {
      const card = CARDS.find(c2 => c2.id === id);
      return card ? { ...card, count: cardCount[id] } : null;
    }).filter(Boolean);
    const rarOrder = { legendary:0, epic:1, rare:2, uncommon:3, common:4 };
    uniqueCards.sort((a,b) => (rarOrder[a.rarity]||9) - (rarOrder[b.rarity]||9));

    let cardEndY = cardY;
    if (uniqueCards.length > 0) {
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.font = `600 14px "Noto Sans TC", sans-serif`;
      c.fillText('🃏 我的 Build', IW/2, cardY);

      const maxPerRow = 5;
      const cw = 110, ch = 48, cGap = 10;
      const iconSz = 30;
      uniqueCards.forEach((card, i) => {
        const row = Math.floor(i / maxPerRow);
        const col = i % maxPerRow;
        const rowCount = Math.min(maxPerRow, uniqueCards.length - row * maxPerRow);
        const rowW = rowCount * cw + (rowCount-1) * cGap;
        const cx = IW/2 - rowW/2 + col * (cw + cGap);
        const cy = cardY + 20 + row * (ch + cGap);

        // 卡牌背景
        rr(c, cx, cy, cw, ch, 8);
        c.fillStyle = rarCol[card.rarity] || '#4a5568'; c.fill();
        c.strokeStyle = rarBorder[card.rarity] || '#666'; c.lineWidth = 1; c.stroke();

        // 卡牌圖示
        const iconImg = _iconCache[card.id];
        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
          c.drawImage(iconImg, cx + 6, cy + (ch - iconSz) / 2, iconSz, iconSz);
        }

        // 卡牌名稱（圖示右側）
        c.fillStyle = '#fff';
        c.font = `bold 11px "Noto Sans TC", sans-serif`;
        c.textAlign = 'left';
        const label = card.count > 1 ? `${card.name}×${card.count}` : card.name;
        c.fillText(label, cx + 6 + iconSz + 4, cy + ch/2 + 1);
        c.textAlign = 'center';

        cardEndY = cy + ch + cGap;
      });
    }

    // ── 挑戰宣言（裂變核心）──
    const ctaY = uniqueCards.length > 0 ? cardEndY + 10 : cardY + 10;
    const ctaW = IW - PAD*2, ctaH = 100;
    rr(c, PAD, ctaY, ctaW, ctaH, 16);
    c.fillStyle = 'rgba(255,152,0,0.08)'; c.fill();
    c.strokeStyle = 'rgba(255,152,0,0.4)'; c.lineWidth = 2; c.stroke();

    c.fillStyle = '#ffa726';
    c.font = `900 26px "Noto Sans TC", sans-serif`;
    c.fillText('🔥 你能超越我嗎？', IW/2, ctaY + 38);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.font = `500 16px "Noto Sans TC", sans-serif`;
    c.fillText(`我在 Wave ${wave} 拿下 ${score} 分，你敢來挑戰嗎？`, IW/2, ctaY + 72);

    // ── 週排行榜位置 ──
    const board = _rogueWeeklyBoard || [];
    let rankText = '';
    if (board.length > 0) {
      const myRank = board.findIndex(e => e.score <= score);
      if (myRank === 0) rankText = '👑 本週第 1 名！';
      else if (myRank === 1) rankText = '🥈 本週第 2 名';
      else if (myRank === 2) rankText = '🥉 本週第 3 名';
      else if (myRank >= 0) rankText = `📊 本週第 ${myRank + 1} 名`;
      else rankText = `📊 超越 ${board.filter(e => score > e.score).length} 位玩家`;
    }
    if (rankText) {
      c.fillStyle = '#ffd700';
      c.font = `bold 18px "Noto Sans TC", sans-serif`;
      c.fillText(rankText, IW/2, ctaY + ctaH + 30);
    }

    // ── QR Code + 掃碼文字 ──
    const qrSize = 120;
    const qrX = IW - PAD - qrSize - 10;
    const footerY = IH - 180;
    c.textAlign = 'left';
    c.fillStyle = '#ffd700';
    c.font = `900 22px "Noto Sans TC", sans-serif`;
    c.fillText('掃碼立即挑戰！', PAD, footerY + 20);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.font = `500 14px "Noto Sans TC", sans-serif`;
    c.fillText('射門 × 卡牌 Build × 無盡生存', PAD, footerY + 48);
    c.fillText('打敗我，你就是最強射手！', PAD, footerY + 70);
    c.fillStyle = 'rgba(255,215,0,0.6)';
    c.font = `bold 13px "Noto Sans TC", sans-serif`;
    c.fillText(url.replace('https://',''), PAD, footerY + 96);

    c.textAlign = 'center';
    if (qrImg) {
      c.fillStyle = '#fff';
      rr(c, qrX - 6, footerY - 6, qrSize + 12, qrSize + 12, 10); c.fill();
      c.drawImage(qrImg, qrX, footerY, qrSize, qrSize);
      c.fillStyle = 'rgba(255,255,255,0.4)';
      c.font = `500 11px "Noto Sans TC", sans-serif`;
      c.fillText('掃碼開打', qrX + qrSize/2, footerY + qrSize + 18);
    }

    // 底部金條
    const bar = c.createLinearGradient(0, 0, IW, 0);
    bar.addColorStop(0, 'transparent'); bar.addColorStop(0.3, '#ffd700'); bar.addColorStop(0.7, '#ffd700'); bar.addColorStop(1, 'transparent');
    c.fillStyle = bar; c.fillRect(0, IH - 3, IW, 3);

    // ── 輸出圖片 ──
    sc.toBlob(async blob => {
      if (!blob) { G._shareToast = performance.now(); return; }
      const file = new File([blob], 'rogue-score.png', { type: 'image/png' });
      if (typeof _isMobile === 'function' && _isMobile() && navigator.share) {
        try { await navigator.clipboard.writeText(shareText); } catch {}
        const shareData = navigator.canShare?.({ files: [file], text: shareText })
          ? { files: [file], title: '⚽ 射門挑戰', text: shareText }
          : navigator.canShare?.({ files: [file] })
            ? { files: [file] }
            : { title: '⚽ 射門挑戰', text: shareText };
        G._shareToast = performance.now();
        try { await navigator.share(shareData); } catch {}
      } else if (typeof showDesktopShareModal === 'function') {
        showDesktopShareModal({ blob, link: url, filename: 'rogue-score.png', title: '⚽ 射門挑戰成績', text: shareText });
        // 關閉遊戲 overlay 讓分享 modal 可見
        if (overlay) overlay.classList.remove('active');
      } else {
        navigator.clipboard.writeText(shareText).then(() => { G._shareToast = performance.now(); }).catch(() => {});
      }
    }, 'image/png');
  }

  // 分享圖用的 2d context 取得器
  function c2d(canvas) { return canvas.getContext('2d'); }

  function drawGameOver() {
    const elapsed = performance.now() - (G._gameoverStart || 0);
    const fade = Math.min(1, elapsed / 1000);

    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    const isGuest = typeof currentUser === 'undefined' || !currentUser;
    const praise = scorePraise(G.score, G.wave);

    // ── 評語 ──
    ctx.fillStyle = praise.color;
    ctx.shadowColor = praise.color; ctx.shadowBlur = 12;
    ctx.font = `bold ${Math.min(22, W * 0.042)}px "Noto Sans TC", sans-serif`;
    ctx.fillText(praise.text, W / 2, H * 0.15);
    ctx.shadowBlur = 0;

    // ── 成績面板 ──
    const panelW = Math.min(W * 0.85, 340);
    const panelX = (W - panelW) / 2;
    const panelY = H * 0.19;
    const panelH = 120;
    rr(ctx, panelX, panelY, panelW, panelH, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 分數（大字）
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 10;
    ctx.font = `bold ${Math.min(44, W * 0.085)}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`${G.score}`, W / 2, panelY + 52);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.font = `${Math.min(12, W * 0.023)}px "Noto Sans TC", sans-serif`;
    ctx.fillText('SCORE', W / 2, panelY + 70);

    // Wave + 強化卡
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(18, W * 0.035)}px "Noto Sans TC", sans-serif`;
    const infoY = panelY + 100;
    const infoLeft = W / 2 - panelW * 0.22;
    const infoRight = W / 2 + panelW * 0.22;
    ctx.fillText(`Wave ${G.wave}`, infoLeft, infoY);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.min(14, W * 0.027)}px "Noto Sans TC", sans-serif`;
    ctx.fillText(`${G.collected.length} 張強化卡`, infoRight, infoY);

    // ── 未登入：引導登入區塊 ──
    let nextY = panelY + panelH + 16;
    if (isGuest) {
      const promptW = panelW;
      const promptX = panelX;
      const promptH = 82;
      rr(ctx, promptX, nextY, promptW, promptH, 10);
      ctx.fillStyle = 'rgba(255,200,0,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(14, W * 0.027)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('登入即可上排行榜！', W / 2, nextY + 24);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `${Math.min(11, W * 0.021)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('與其他玩家競爭，週排行前六名可獲得寶石', W / 2, nextY + 42);

      // 登入按鈕
      if (fade >= 1) {
        const lbtnW = promptW * 0.6;
        const lbtnH = 30;
        const lbtnX = W / 2 - lbtnW / 2;
        const lbtnY = nextY + 50;
        G._loginR = { x: lbtnX, y: lbtnY, w: lbtnW, h: lbtnH };
        rr(ctx, lbtnX, lbtnY, lbtnW, lbtnH, 8);
        ctx.fillStyle = '#f4b400';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
        ctx.fillText('Google 登入', W / 2, lbtnY + 21);
      }
      nextY += promptH + 10;
    } else {
      G._loginR = null;
    }

    // ── 週排行榜（精簡版） ──
    const goBoard = _rogueWeeklyBoard || [];
    if (goBoard.length > 0) {
      const lbFontSz = Math.min(11, W * 0.021);
      const lbLineH = Math.min(15, W * 0.028);
      const lbPanelW = panelW;
      const lbPanelX = panelX;
      const showCount = Math.min(goBoard.length, 5);
      const lbPanelH = 18 + lbLineH * (showCount + 1) + 6;

      rr(ctx, lbPanelX, nextY, lbPanelW, lbPanelH, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.min(12, W * 0.023)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('⚡ 本週排行', W / 2, nextY + 14);

      const colRank = lbPanelX + lbPanelW * 0.12;
      const colName = lbPanelX + lbPanelW * 0.38;
      const colScore = lbPanelX + lbPanelW * 0.66;
      const colWave = lbPanelX + lbPanelW * 0.88;
      const hY = nextY + 14 + lbLineH;
      ctx.fillStyle = 'rgba(255,215,0,0.4)';
      ctx.font = `bold ${lbFontSz}px "Noto Sans TC", sans-serif`;
      ctx.fillText('#', colRank, hY);
      ctx.fillText('玩家', colName, hY);
      ctx.fillText('分數', colScore, hY);
      ctx.fillText('Wave', colWave, hY);

      ctx.font = `${lbFontSz}px "Noto Sans TC", sans-serif`;
      for (let i = 0; i < showCount; i++) {
        const entry = goBoard[i];
        const ey = hY + (i + 1) * lbLineH;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.6)';
        ctx.fillText(`${medal}${i + 1}`, colRank, ey);
        const nick = entry.nickname || '???';
        ctx.fillText(nick, colName, ey);
        ctx.fillText(`${entry.score}`, colScore, ey);
        ctx.fillText(`${entry.wave}`, colWave, ey);
      }
      nextY += lbPanelH + 8;
    }

    // ── 復活按鈕 ──
    const hasLogin = typeof currentUser !== 'undefined' && !!currentUser;
    const canRevive = hasLogin && !G._revived && !G._reviving;
    if (canRevive && fade >= 1) {
      const rvW = Math.min(240, W * 0.5), rvH = 46;
      const rvX = W / 2 - rvW / 2, rvY = nextY + 4;
      G._reviveR = { x: rvX, y: rvY, w: rvW, h: rvH };

      // 閃光背景
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
      rr(ctx, rvX, rvY, rvW, rvH, 12);
      ctx.fillStyle = `rgba(255,152,0,${0.15 * pulse})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,152,0,${0.7 * pulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffa726';
      ctx.font = `bold ${Math.min(16, W * 0.032)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('💎 復活繼續（3 寶石）', W / 2, rvY + 20);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.min(11, W * 0.021)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('保留所有卡牌，復活 2 條命', W / 2, rvY + 38);

      nextY = rvY + rvH + 8;
    } else {
      G._reviveR = null;
      if (G._reviving) {
        ctx.fillStyle = '#ffa726';
        ctx.font = `bold ${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
        ctx.fillText('復活中...', W / 2, nextY + 20);
        nextY += 40;
      }
    }

    // 復活 toast
    if (G._reviveToast && performance.now() - (G._reviveToastT || 0) < 2500) {
      const ta = Math.min(1, (2500 - (performance.now() - G._reviveToastT)) / 500);
      ctx.globalAlpha = ta;
      const tw = Math.min(220, W * 0.55);
      rr(ctx, W / 2 - tw / 2, H * 0.06, tw, 32, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
      ctx.fillStyle = '#ff5252';
      ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      ctx.fillText(G._reviveToast, W / 2, H * 0.06 + 22);
      ctx.globalAlpha = 1;
    }

    // ── 按鈕區 ──
    if (fade >= 1) {
      const btnW = Math.min(200, W * 0.4), btnH = 42;
      const btnGap = 10;
      const bx = W / 2 - btnW / 2;

      // 分享按鈕
      const shareY = Math.max(nextY + 4, H * 0.78);
      G._shareR = { x: bx, y: shareY, w: btnW, h: btnH };
      rr(ctx, bx, shareY, btnW, btnH, 10);
      ctx.fillStyle = '#1da1f2';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(14, W * 0.028)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('📤 分享成績', W / 2, shareY + 27);

      // 再來一局
      const y1 = shareY + btnH + btnGap;
      G._restartR = { x: bx, y: y1, w: btnW, h: btnH };
      ctx.fillStyle = '#4caf50';
      rr(ctx, bx, y1, btnW, btnH, 10); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('再來一局', W / 2, y1 + 27);

      // 返回網站
      const y2 = y1 + btnH + btnGap;
      G._closeR = { x: bx, y: y2, w: btnW, h: btnH };
      ctx.fillStyle = '#555';
      rr(ctx, bx, y2, btnW, btnH, 10); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('返回網站', W / 2, y2 + 27);
    }

    // ── 分享 Toast ──
    if (G._shareToast && performance.now() - G._shareToast < 2000) {
      const ta = Math.min(1, (2000 - (performance.now() - G._shareToast)) / 500);
      ctx.globalAlpha = ta;
      const tw = Math.min(200, W * 0.5);
      rr(ctx, W / 2 - tw / 2, H * 0.08, tw, 32, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fill();
      ctx.fillStyle = '#4caf50';
      ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      ctx.fillText('已複製到剪貼簿！', W / 2, H * 0.08 + 22);
    }

    // ── 新徽章 Toast ──
    if (G._badgeToast && performance.now() - (G._badgeToastT || 0) < 4000) {
      const ta = Math.min(1, (4000 - (performance.now() - G._badgeToastT)) / 800);
      ctx.globalAlpha = ta;
      ctx.font = `bold ${Math.min(13, W * 0.025)}px "Noto Sans TC", sans-serif`;
      const tw2 = Math.min(ctx.measureText(G._badgeToast).width + 32, W * 0.9);
      rr(ctx, W / 2 - tw2 / 2, H * 0.14, tw2, 34, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.fillText(G._badgeToast, W / 2, H * 0.14 + 22);
    }

    ctx.globalAlpha = 1;
    drawAudioBtns();
  }

  // ─── 繪圖工具 ────────────────────────────────────────────
  // 點擊圖示：指尖圓點 + 閃爍發散線
  function _drawTapIcon(cx, cy, sz) {
    const r = sz * 0.18;
    // 實心圓點（指尖）
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    // 閃爍發散短線（8條）
    const blink = (Math.sin(performance.now() * 0.006) + 1) / 2; // 0~1 閃爍
    const lineAlpha = 0.3 + blink * 0.6;
    ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r1 = sz * 0.28, r2 = sz * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.stroke();
    }
  }

  // 長按圖示：指尖圓點 + 擴散波紋
  function _drawHoldIcon(cx, cy, sz) {
    const r = sz * 0.18;
    // 實心圓點（指尖）
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();

    // 擴散波紋（3圈循環）
    const pulse = (performance.now() % 1800) / 1800;
    for (let i = 0; i < 3; i++) {
      const p = (pulse + i * 0.33) % 1;
      const rr = sz * (0.22 + p * 0.35);
      const a = (1 - p) * 0.7;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, rr === 0 ? cy : cy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

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
      sfxOn = !sfxOn; localStorage.setItem('rogue_sfx', sfxOn ? '1' : '0'); return;
    }
    if (G._bgmBtn && x >= G._bgmBtn.x && x <= G._bgmBtn.x + G._bgmBtn.w &&
        y >= G._bgmBtn.y && y <= G._bgmBtn.y + G._bgmBtn.h) {
      bgmOn = !bgmOn;
      localStorage.setItem('rogue_bgm', bgmOn ? '1' : '0');
      if (bgmOn) startBGM(G.phase === 'title' ? '_title' : G.phase === 'gameover' ? '_gameover' : curScene.name); else stopBGM();
      return;
    }

    if (G.phase === 'title') {
      // 主 Tab 切換（排行 / 里程碑 / 徽章）
      if (G._titleTabR) {
        for (const tr of G._titleTabR) {
          if (tr && hitTest(x, y, tr)) { G._titleTab = tr.key; return; }
        }
      }
      // 排行榜子 Tab 切換
      if (G._titleTab === 'board' && G._lbTabR) {
        for (const tr of G._lbTabR) {
          if (tr && hitTest(x, y, tr)) { G._lbTab = tr.key; return; }
        }
      }
      // 里程碑領取
      if (G._titleTab === 'miles' && G._milestoneR) {
        for (const mr of G._milestoneR) {
          if (mr && hitTest(x, y, mr)) {
            const ms = MILESTONES[mr.idx];
            claimMilestone(ms);
            return;
          }
        }
      }
      // 寶石補充體力
      if (G._staminaRefill1R && hitTest(x, y, G._staminaRefill1R)) {
        _refillStamina(1); return;
      }
      if (G._staminaRefillFullR && hitTest(x, y, G._staminaRefillFullR)) {
        _refillStamina(STAMINA_MAX); return;
      }
      if (hitTest(x, y, G._startR)) {
        if (!useStamina()) return; // 體力不足
        G.phase = 'playing';
        startBGM(curScene.name);
        beginWave();
      }
      return;
    }
    if (G.phase === 'playing') return; // 由 onPointerDown 處理射擊
    if (G.phase === 'paused') {
      if (hitTest(x, y, G._pauseResumeR)) { G.phase = 'playing'; return; }
      if (hitTest(x, y, G._pauseQuitR))   { saveResult(); closeGame(); return; }
      return;
    }
    if (G.phase === 'cards') {
      // 卡片全部翻完才能點（每張 500ms，3 張 = 1500ms）
      const CARD_REVEAL_EACH = 500;
      const elapsed = performance.now() - (G._cardRevealStart || 0);
      if (elapsed < G.cardPick.length * CARD_REVEAL_EACH) return;
      // Reroll 按鈕
      if (hitTest(x, y, G._rerollR) && G._rerollsLeft > 0 && !G._rerolling) {
        G._rerolling = true;
        (async () => {
          const result = await spendGemForGame?.('rogue_reroll');
          G._rerolling = false;
          if (result?.error === '寶石不足') { G._rerollToast = '寶石不足'; G._rerollToastT = performance.now(); return; }
          if (result?.error) { G._rerollToast = result.error; G._rerollToastT = performance.now(); return; }
          // 成功：重新抽卡
          G._rerollsLeft--;
          G.cardPick = pickCards(3);
          G._cardRevealStart = performance.now();
        })();
        return;
      }
      for (const r of (G._cardR || [])) {
        if (hitTest(x, y, r)) { selectCard(r.idx); return; }
      }
      return;
    }
    if (G.phase === 'gameover') {
      // 死亡 1 秒內不能點
      if (performance.now() - (G._gameoverStart || 0) < 1000) return;
      // 復活按鈕
      if (hitTest(x, y, G._reviveR) && !G._revived && !G._reviving) {
        G._reviving = true;
        (async () => {
          const result = await spendGemForGame?.('rogue_revive');
          G._reviving = false;
          if (result?.error === '寶石不足') { G._reviveToast = '寶石不足'; G._reviveToastT = performance.now(); return; }
          if (result?.error) { G._reviveToast = result.error; G._reviveToastT = performance.now(); return; }
          // 復活成功
          G._revived = true;
          G.lives = 2;
          G.phase = 'playing';
          G.defs = G.defs.filter(d => d.z > 100); // 清除靠近底線的敵人
          startBGM(curScene.name);
        })();
        return;
      }
      if (hitTest(x, y, G._shareR))   { if (!G._resultSaved) { saveResult(); G._resultSaved = true; } shareScore(G.score, G.wave); return; }
      if (hitTest(x, y, G._loginR) && typeof loginWithGoogle === 'function') { loginWithGoogle(); return; }
      if (hitTest(x, y, G._restartR)) { if (!G._resultSaved) { saveResult(); G._resultSaved = true; } startGame(); return; }
      if (hitTest(x, y, G._closeR))   { if (!G._resultSaved) { saveResult(); G._resultSaved = true; } closeGame(); return; }
    }
  }

  function onTouch(e) {
    e.preventDefault();
    const t = e.touches[0];
    onPointerDown({ clientX: t.clientX, clientY: t.clientY });
  }
  function onTouchEnd(e) {
    e.preventDefault();
    onPointerUp();
  }
  function onTouchMove(e) {
    if (!G || !G._holdFiring) return;
    e.preventDefault();
    const t = e.touches[0];
    G._holdXY = _toLogical({ clientX: t.clientX, clientY: t.clientY });
  }

  // ── 長按連射 / 短按精準射擊 ──
  const HOLD_THRESHOLD = 200; // ms，超過此時間判定為長按

  function _toLogical(e) {
    const rect = cvs.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
  }

  function onPointerDown(e) {
    if (!G) return;
    const p = _toLogical(e);

    // 非 playing 階段走原本的 click 邏輯
    if (G.phase !== 'playing') {
      onClick(e);
      return;
    }

    // 暫停按鈕
    if (G._pauseBtn && hitTest(p.x, p.y, G._pauseBtn)) {
      G.phase = 'paused';
      G._holdFiring = false; G._holdXY = null; clearTimeout(G._holdTimer);
      return;
    }

    // 音效按鈕區域也走 click
    if ((G._sfxBtn && p.x >= G._sfxBtn.x && p.x <= G._sfxBtn.x + G._sfxBtn.w &&
         p.y >= G._sfxBtn.y && p.y <= G._sfxBtn.y + G._sfxBtn.h) ||
        (G._bgmBtn && p.x >= G._bgmBtn.x && p.x <= G._bgmBtn.x + G._bgmBtn.w &&
         p.y >= G._bgmBtn.y && p.y <= G._bgmBtn.y + G._bgmBtn.h)) {
      onClick(e);
      return;
    }

    // playing 階段：短按先射一發 + 開始長按偵測
    G._shootHintTimer = 0; // 一點擊就隱藏提示
    G._holdXY = p;
    G._holdFiring = false;
    clearTimeout(G._holdTimer);
    shoot(p.x, p.y);

    G._holdTimer = setTimeout(() => {
      if (!G || G.phase !== 'playing') return;
      G._holdFiring = true;
    }, HOLD_THRESHOLD);
  }

  function onPointerUp() {
    if (!G) return;
    clearTimeout(G._holdTimer);
    G._holdFiring = false;
    G._holdXY = null;
  }

  function onMouseMove(e) {
    if (!G || !G._holdFiring) return;
    G._holdXY = _toLogical(e);
  }

  // ═══════════════════════════════════════════════════════════
  //  Overlay 管理
  // ═══════════════════════════════════════════════════════════
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'rogue-overlay';
    overlay.innerHTML = '<div id="rogue-wrap"><canvas id="rogue-cvs"></canvas><button id="rogue-x" title="關閉">✕</button></div>';
    document.body.appendChild(overlay);

    cvs = document.getElementById('rogue-cvs');
    ctx = cvs.getContext('2d');
    document.getElementById('rogue-x').addEventListener('click', () => {
      if (G && (G.phase === 'playing' || G.phase === 'paused')) {
        // 遊戲進行中 → 暫停並顯示確認
        G.phase = 'paused';
        G._holdFiring = false; G._holdXY = null; clearTimeout(G._holdTimer);
      } else {
        closeGame();
      }
    });
    cvs.addEventListener('mousedown', onPointerDown);
    cvs.addEventListener('mouseup', onPointerUp);
    cvs.addEventListener('mouseleave', onPointerUp);
    cvs.addEventListener('mousemove', onMouseMove);
    cvs.addEventListener('touchstart', onTouch, { passive: false });
    cvs.addEventListener('touchend', onTouchEnd, { passive: false });
    cvs.addEventListener('touchcancel', onTouchEnd, { passive: false });
    cvs.addEventListener('touchmove', onTouchMove, { passive: false });

    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    H = window.innerHeight;
    // PC 版限制最大寬度（約 9:16 比例），保持畫面緊湊
    const maxW = Math.round(H * 0.65);
    W = Math.min(window.innerWidth, maxW);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    const wrap = document.getElementById('rogue-wrap');
    if (wrap) wrap.style.width = W + 'px';
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
    startBGM('_title');
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
  window.ROGUE_BADGES = BADGES;
  window.ROGUE_WEEKLY_BADGES = WEEKLY_BADGES;
  window.loadRogueBadges = _loadBadges;
  window.loadRogueWeeklyBadges = _loadWeeklyBadges;

  // ?play=rogue → 自動開啟遊戲（支援分享連結）
  function checkAutoPlay() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('play') === 'rogue') {
      // 移除 URL 參數（避免重整再次觸發）
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      startGame();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(checkAutoPlay, 300));
  } else {
    setTimeout(checkAutoPlay, 300);
  }
})();
