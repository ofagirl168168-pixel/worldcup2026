/* =============================================
   MATCH-SIM.JS — 90 分鐘模擬賽（持球者狀態機版）
   球員有真正的運動邏輯：持球者盤帶/傳球/射門、非持球者依角色回防或前插、
   對方靠近會搶斷、球跟著持球者或在傳球時沿直線飛行。
   ============================================= */

(function () {
  'use strict';

  // ── Seedable RNG ────────────────────────────────────────
  // 給「直播同步」功能用：相同 seed 必定產出相同比分/事件/球員位置
  // 沒帶 seed 時 fallback 到 Math.random，保留原有「每次模擬都不同」行為
  function makeSeededRng(seedStr) {
    let h = 2166136261 >>> 0;
    const s = String(seedStr);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    let state = h >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── 視覺參數 ────────────────────────────────────────────
  // 球場用較大的「邏輯尺寸」、canvas viewport 只顯示其中一部分 → 鏡頭追焦
  const PITCH_W = 480;            // 邏輯球場寬（球員座標 p.x ∈ [0,1] × PITCH_W）
  const PITCH_H = 280;            // 邏輯球場高
  const VIEW_W  = 320;            // canvas 視窗寬（顯示的球場區域）
  const VIEW_H  = 200;            // canvas 視窗高
  const FPS = 30;
  const MATCH_MINUTES = 90;
  const REAL_SECONDS = 110;        // 60 → 110 秒（開羅式慢節奏、看得清楚每個動作）
  const HT_PAUSE_SEC = 1.2;
  const GOAL_PAUSE_SEC = 4.5;      // 進球暫停 → 4.5 秒（看完慶祝 + GOAL banner）
  const TOTAL_FRAMES = FPS * REAL_SECONDS;

  // ── 陣型解析 ────────────────────────────────────────────
  function parseFormation(f) {
    const parts = String(f || '').split('-').map(n => parseInt(n)).filter(n => Number.isFinite(n));
    if (parts.length === 3) return { def: parts[0], mid: parts[1], amc: 0, fwd: parts[2] };
    if (parts.length === 4) return { def: parts[0], mid: parts[1], amc: parts[2], fwd: parts[3] };
    return { def: 4, mid: 3, amc: 0, fwd: 3 };
  }

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

  // 每個角色的戰術參數：前插能力、回防程度、搶斷意願、持球速度
  const ROLE = {
    GK:  { pushOn: 0.02, pullBack: 0.02, tackleRange: 0.03, sprint: 0.5 },
    DEF: { pushOn: 0.12, pullBack: 0.18, tackleRange: 0.055, sprint: 0.7 },
    MID: { pushOn: 0.20, pullBack: 0.15, tackleRange: 0.05, sprint: 0.85 },
    AMC: { pushOn: 0.28, pullBack: 0.10, tackleRange: 0.045, sprint: 0.9 },
    FWD: { pushOn: 0.32, pullBack: 0.06, tackleRange: 0.04, sprint: 1.0 },
  };

  // ────────── 球員 look_data 產生器（明星表 + 名字 hash fallback） ──────────
  // 明星表：手動配置出名球員的 LPC 樣貌，盡量貼近本人特徵
  const FAMOUS_LOOKS = {
    // ─── EPL 大牌 ───
    'Mohamed Salah':       { body:'amber', eye_color:'brown', hair_style:'curly_long',  hair_color:'black',  beard_style:'5oclock_shadow', beard_color:'black' },
    'Erling Haaland':      { body:'light', eye_color:'blue',  hair_style:'long',         hair_color:'blonde' },
    'Virgil van Dijk':     { body:'brown', eye_color:'brown', hair_style:'high_and_tight', hair_color:'black', beard_style:'trimmed', beard_color:'black' },
    'Bukayo Saka':         { body:'brown', eye_color:'brown', hair_style:'high_and_tight', hair_color:'black' },
    'Martin Ødegaard':     { body:'light', eye_color:'blue',  hair_style:'messy1',       hair_color:'blonde' },
    'Declan Rice':         { body:'light', eye_color:'brown', hair_style:'spiked',       hair_color:'black',  beard_style:'5oclock_shadow', beard_color:'black' },
    'Bruno Fernandes':     { body:'olive', eye_color:'brown', hair_style:'flat_top_fade',hair_color:'black',  beard_style:'5oclock_shadow', beard_color:'black' },
    'Cole Palmer':         { body:'light', eye_color:'blue',  hair_style:'mop',          hair_color:'blonde' },
    'Phil Foden':          { body:'light', eye_color:'blue',  hair_style:'messy1',       hair_color:'blonde' },
    'Son Heung-min':       { body:'light', eye_color:'brown', hair_style:'bangs',        hair_color:'black' },
    'Heung-Min Son':       { body:'light', eye_color:'brown', hair_style:'bangs',        hair_color:'black' },
    'Rodri':               { body:'olive', eye_color:'brown', hair_style:'long',         hair_color:'black',  beard_style:'trimmed', beard_color:'black' },
    'Kevin De Bruyne':     { body:'light', eye_color:'blue',  hair_style:'messy1',       hair_color:'ginger' },
    'William Saliba':      { body:'brown', eye_color:'brown', hair_style:'buzzcut',      hair_color:'black' },
    'Viktor Gyökeres':     { body:'light', eye_color:'blue',  hair_style:'long_messy',   hair_color:'blonde', beard_style:'trimmed', beard_color:'blonde' },
    'Alexis Mac Allister': { body:'light', eye_color:'brown', hair_style:'messy1',       hair_color:'brown' },
    'Ryan Gravenberch':    { body:'brown', eye_color:'brown', hair_style:'high_and_tight', hair_color:'black' },
    'Dominik Szoboszlai':  { body:'light', eye_color:'brown', hair_style:'spiked',       hair_color:'black' },
    'Tijjani Reijnders':   { body:'light', eye_color:'brown', hair_style:'short',        hair_color:'black' },
    'Rayan Cherki':        { body:'olive', eye_color:'brown', hair_style:'spiked',       hair_color:'black' },
    // ─── La Liga / 歐洲 ───
    'Jude Bellingham':     { body:'light', eye_color:'brown', hair_style:'high_and_tight', hair_color:'black' },
    'Kylian Mbappé':       { body:'brown', eye_color:'brown', hair_style:'buzzcut',      hair_color:'black' },
    'Vinicius Junior':     { body:'amber', eye_color:'brown', hair_style:'long',         hair_color:'black' },
    'Vinícius Júnior':     { body:'amber', eye_color:'brown', hair_style:'long',         hair_color:'black' },
    'Lamine Yamal':        { body:'olive', eye_color:'brown', hair_style:'curly_long',   hair_color:'black' },
    'Pedri':               { body:'light', eye_color:'brown', hair_style:'curly_long',   hair_color:'brown' },
    'Robert Lewandowski':  { body:'light', eye_color:'blue',  hair_style:'short',        hair_color:'blonde' },
    'Harry Kane':          { body:'light', eye_color:'brown', hair_style:'short',        hair_color:'brown',  beard_style:'5oclock_shadow', beard_color:'brown' },
    'Lionel Messi':        { body:'light', eye_color:'brown', hair_style:'messy1',       hair_color:'brown',  beard_style:'5oclock_shadow', beard_color:'brown' },
    'Cristiano Ronaldo':   { body:'olive', eye_color:'brown', hair_style:'high_and_tight', hair_color:'black' },
    'Neymar':              { body:'light', eye_color:'brown', hair_style:'mop',          hair_color:'blonde' },
    'Erling Braut Haaland':{ body:'light', eye_color:'blue',  hair_style:'long',         hair_color:'blonde' },
    'Florian Wirtz':       { body:'light', eye_color:'blue',  hair_style:'messy1',       hair_color:'brown' },
    'Jamal Musiala':       { body:'amber', eye_color:'brown', hair_style:'curly_long',   hair_color:'black' },
    'Lautaro Martínez':    { body:'olive', eye_color:'brown', hair_style:'short',        hair_color:'black',  beard_style:'5oclock_shadow', beard_color:'black' },
  };

  // 名字 hash → 確定性 look（同名字永遠產同一個樣子）
  function _generateGenericLook(seed) {
    let h = 0;
    for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const advance = () => { h = (h * 1664525 + 1013904223) >>> 0; };
    const pick = (arr) => { const v = arr[h % arr.length]; advance(); return v; };
    const bodies      = ['light','olive','amber','brown','bronze'];
    const eyeColors   = ['blue','brown','gray','green'];
    const hairStyles  = ['messy1','messy2','spiked','high_and_tight','curly_long','buzzcut','short','flat_top_fade','mop','bangs'];
    const hairColors  = ['black','blonde','brown','ginger'];
    const body        = pick(bodies);
    const eye_color   = pick(eyeColors);
    const hair_style  = pick(hairStyles);
    const hair_color  = (body === 'brown' || body === 'bronze' || body === 'amber') ? 'black' : pick(hairColors);
    advance();
    const hasBeard    = h % 3 === 0;
    advance();
    const beard_color = hair_color;
    return {
      body, eye_color, hair_style, hair_color,
      ...(hasBeard ? { beard_style:'5oclock_shadow', beard_color } : {})
    };
  }

  function _lookForPlayerName(name, pos) {
    if (!name) return _generateGenericLook(pos || 'unknown');
    // 嘗試精準 match（含原始大小寫 + 去除特殊字元）
    if (FAMOUS_LOOKS[name]) return FAMOUS_LOOKS[name];
    // 嘗試 normalize（變音符號移除）
    const norm = name.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (FAMOUS_LOOKS[norm]) return FAMOUS_LOOKS[norm];
    // 找 surname 配對（最後一個 token）
    const tokens = name.split(/\s+/);
    const lastName = tokens[tokens.length - 1];
    for (const key of Object.keys(FAMOUS_LOOKS)) {
      if (key.endsWith(' ' + lastName)) return FAMOUS_LOOKS[key];
    }
    return _generateGenericLook(name);
  }

  // ── 繪製 ────────────────────────────────────────────────
  // ────────── Phase 2.2 pixel sprite ──────────
  const _SPRITE_W = 12;
  const _SPRITE_H = 16;
  let _renderTick = 0;

  // 預先 render 1 個 2-frame walk cycle sprite（24×16 px：兩 frame 並排）
  function _makePlayerSprite(jerseyColor) {
    const cv = document.createElement('canvas');
    cv.width = _SPRITE_W * 2;
    cv.height = _SPRITE_H;
    const cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    const SKIN = '#f4c194', SHORT = '#fff', BOOT = '#1a1a2e';

    for (let f = 0; f < 2; f++) {
      const ox = f * _SPRITE_W;
      // 頭 4×4
      cx.fillStyle = SKIN;
      cx.fillRect(ox + 4, 0, 4, 4);
      // 球衣 6×4
      cx.fillStyle = jerseyColor;
      cx.fillRect(ox + 3, 4, 6, 4);
      // 球褲 4×2
      cx.fillStyle = SHORT;
      cx.fillRect(ox + 4, 8, 4, 2);
      // 腿 — 依 frame 走路
      cx.fillStyle = SKIN;
      if (f === 0) {
        cx.fillRect(ox + 4, 10, 1, 4);
        cx.fillRect(ox + 7, 10, 1, 4);
        cx.fillStyle = BOOT;
        cx.fillRect(ox + 4, 14, 1, 1);
        cx.fillRect(ox + 7, 14, 1, 1);
      } else {
        // 左腳抬起 = 短一格、boot 位置上移
        cx.fillRect(ox + 4, 10, 1, 3);
        cx.fillRect(ox + 7, 10, 1, 4);
        cx.fillStyle = BOOT;
        cx.fillRect(ox + 4, 13, 1, 1);
        cx.fillRect(ox + 7, 14, 1, 1);
      }
    }
    return cv;
  }
  // home/away 球衣色不同 + 守門員特別色（黃 vs 橘）
  const _SPRITE_CACHE = {
    h:    null, h_gk: null,
    a:    null, a_gk: null,
  };
  function _getSprite(team, isGK) {
    const key = team + (isGK ? '_gk' : '');
    if (!_SPRITE_CACHE[key]) {
      const colors = {
        h:    '#2196f3', // 主隊藍
        h_gk: '#ffeb3b', // 主隊 GK 黃
        a:    '#e53935', // 客隊紅
        a_gk: '#ff9800', // 客隊 GK 橘
      };
      _SPRITE_CACHE[key] = _makePlayerSprite(colors[key]);
    }
    return _SPRITE_CACHE[key];
  }

  function render(ctx, state) {
    _renderTick++;
    const { players, ball, flashTeam, flashAlpha, possessorIdx } = state;

    // 追焦鏡頭：每 frame 朝球位置 lerp，clamp 在球場內
    const targetCamX = ball.x * PITCH_W - VIEW_W / 2;
    const targetCamY = ball.y * PITCH_H - VIEW_H / 2;
    const LERP = 0.08;
    state.camera.x = state.camera.x + (targetCamX - state.camera.x) * LERP;
    state.camera.y = state.camera.y + (targetCamY - state.camera.y) * LERP;
    state.camera.x = Math.max(0, Math.min(PITCH_W - VIEW_W, state.camera.x));
    state.camera.y = Math.max(0, Math.min(PITCH_H - VIEW_H, state.camera.y));

    // 清掉視窗（黑底）
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    // 套用鏡頭位移
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    const grad = ctx.createLinearGradient(0, 0, 0, PITCH_H);
    grad.addColorStop(0, '#2e7d32');
    grad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);

    // 草紋
    for (let i = 0; i < PITCH_W; i += 40) {
      ctx.fillStyle = (i / 40) % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
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

    // 球員 — Phase 2.2++ PIPOYA 32×32 RPG sprite per-player
    // 每張卡 = 一個 PIPOYA 角色，4 方向走路 + 動畫
    ctx.imageSmoothingEnabled = false;
    const SPRITE_DRAW_W = 22;   // pitch 320 寬、22px chibi 容易看到
    const SPRITE_DRAW_H = 22;
    const FRAME_PX = 32;        // PIPOYA frame = 32×32
    // Y 排序：y 大的（畫面下方）後畫 → 蓋在上方球員前面、營造前景感
    // 鏟球者「鏟球」標籤 / 被搶者頭頂「!」都在 player loop 內畫，會跟著各自 Y 順位自動正確 z-order
    // 保留原 index i 給：possessorIdx 比對、fever 火花交錯動畫（avoid frame-to-frame twitch）
    const _possessor = possessorIdx >= 0 ? players[possessorIdx] : null;
    const _renderOrder = players
      .map((p, i) => ({ p, i }))
      .sort((a, b) => a.p.y - b.p.y);
    _renderOrder.forEach(({ p, i }) => {
      const isPos = p === _possessor;
      let cx = p.x * PITCH_W;
      let cy = p.y * PITCH_H;
      // 鏟球視覺位移：朝鏟球方向滑行（前半 fast slide、後半略 overshoot）
      if (p._tackleVisualUntil && state.frame < p._tackleVisualUntil) {
        const tAge = state.frame - (p._tackleStart || state.frame);
        const tNorm = Math.min(1, tAge / 24);
        const slideAmt = (1 - Math.pow(1 - tNorm, 2)) * 18;
        cx += (p._tackleDirX || 0) * slideAmt;
        cy += (p._tackleDirY || 0) * slideAmt;
      }
      // GK 撲球視覺位移：沿球門線僅 Y 軸、不偏 X（GK 不離開門線）
      const diving = p._diveUntil && state.frame < p._diveUntil;
      if (diving) {
        const dAge = state.frame - (p._diveStart || state.frame);
        const dDur = (p._diveUntil - p._diveStart) || 24;
        const t = Math.min(1, dAge / dDur);
        const maxSlide = (p._diveDistance || 0.06) * PITCH_H * 1.6;
        // 0~0.4：快速飛撲。0.4~1：定格保持 95% 撲出狀態
        const slide = t < 0.4
          ? (t / 0.4) * maxSlide
          : maxSlide * (0.95 + Math.sin((t - 0.4) * Math.PI / 0.6 / 2) * 0.05);
        cy += (p._diveDirY || 1) * slide;
      }

      // row 覆寫順序：dive (GK) > tackle > fulltime > celebrate > walk
      let dirRow, frame;
      const tackleActive = p._tackleVisualUntil && state.frame < p._tackleVisualUntil;
      if (diving) {
        // GK 撲球 (row 8 = hurt frame 5、整個橫躺)
        dirRow = 8;
        frame = 0;
      } else if (tackleActive) {
        // 鏟球 (row 7 = thrust)
        dirRow = 7;
        const tackleAge = state.frame - (p._tackleStart || state.frame);
        // 24 幀分 3 段（0→1→2→2 hold）
        frame = Math.min(2, Math.floor(tackleAge / 8));
      } else if (state.phase === 'fulltime') {
        // 全場結束：先播動畫到最有戲的那格、然後停住（不要一直 loop）
        // 平手：兩隊都拍手歡呼（一場好比賽、互敬）→ 都用 row 5
        // 有輸贏：贏方歡呼 row 5、輸方懊惱 row 6
        if (state.fulltimeWinner === 'd') {
          dirRow = 5;
        } else {
          dirRow = (p.team === state.fulltimeWinner) ? 5 : 6;
        }
        // 0~700ms 播 0→1→2、之後 hold 在 frame 2（歡呼最高 / 跪地最低）
        const elapsed = performance.now() - (state.fulltimeStart || performance.now());
        if (elapsed < 700) frame = Math.min(2, Math.floor(elapsed / 240));
        else frame = 2;
      } else if (state.phase === 'celebrate' && state.pauseFrames > 0) {
        // 得分隊歡呼 (row 5)、敵隊懊惱 (row 6)
        dirRow = (p.team === state.flashTeam) ? 5 : 6;
        frame = Math.floor(_renderTick / 16) % 3;
      } else {
        const dyMov = (p.ty || p.y) - p.y;
        const dxMov = (p.tx || p.x) - p.x;
        const movingAmt = Math.abs(dxMov) + Math.abs(dyMov);
        const moving = movingAmt > 0.0005;
        if (Math.abs(dyMov) > Math.abs(dxMov)) {
          dirRow = dyMov > 0 ? 0 : 3;
        } else {
          dirRow = dxMov < 0 ? 1 : 2;
        }
        frame = moving ? (Math.floor(_renderTick / 8) % 3) : 1;
      }

      // 鏟球時加大量塵土 + 動態線（更明顯）
      if (tackleActive) {
        const tAge = state.frame - (p._tackleStart || state.frame);
        const tNorm = Math.min(1, tAge / 24);
        // 多層灰雲 — 後方拖尾
        ctx.fillStyle = `rgba(220,200,160,${0.75 * (1 - tNorm * 0.4)})`;
        for (let d = 0; d < 6; d++) {
          const back = d * 4;
          const dustX = cx - (p._tackleDirX || 0) * back + (Math.random() - 0.5) * 4;
          const dustY = cy + SPRITE_DRAW_H / 2 - 1 - (p._tackleDirY || 0) * back + (Math.random() - 0.5) * 3;
          ctx.beginPath();
          ctx.ellipse(dustX, dustY, 3.5 - d * 0.4, 2 - d * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // 動態線：朝鏟球方向 3 條白線
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.3;
        for (let l = 0; l < 3; l++) {
          const lineLen = 8 + l * 2;
          const offY = (l - 1) * 3;
          ctx.beginPath();
          ctx.moveTo(cx - (p._tackleDirX || 0) * lineLen,
                     cy - (p._tackleDirY || 0) * lineLen + offY);
          ctx.lineTo(cx - (p._tackleDirX || 0) * (lineLen + 6),
                     cy - (p._tackleDirY || 0) * (lineLen + 6) + offY);
          ctx.stroke();
        }
        // 「鏟球」字向上飄（紅底白字、視覺最搶眼）
        const labelY = cy - SPRITE_DRAW_H / 2 - 8 - tNorm * 8;
        const labelOpacity = 1 - tNorm * 0.5;
        ctx.save();
        ctx.globalAlpha = labelOpacity;
        ctx.fillStyle = '#c0231a';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        const labelW = 28, labelH = 13;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(cx - labelW/2, labelY - labelH/2, labelW, labelH, 4)
                      : ctx.rect(cx - labelW/2, labelY - labelH/2, labelW, labelH);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px "Microsoft JhengHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('鏟球', cx, labelY);
        ctx.restore();
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
      // 個人狂熱光環（球員腳下發光）— 移除頭頂飄星星（使用者反映不需要）
      if (p.fever > 0) {
        const pulse = 0.7 + Math.sin(state.frame / 4) * 0.3;
        // 腳下金色發光圈
        const grd = ctx.createRadialGradient(cx, cy + SPRITE_DRAW_H / 2 - 1, 0, cx, cy + SPRITE_DRAW_H / 2 - 1, 14);
        grd.addColorStop(0, `rgba(255,213,74,${0.75 * pulse})`);
        grd.addColorStop(0.5, `rgba(255,165,30,${0.45 * pulse})`);
        grd.addColorStop(1, 'rgba(255,140,0,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(cx - 14, cy + SPRITE_DRAW_H / 2 - 8, 28, 14);
      }

      // 腳下影子：控球者用半透明白小點（不搶戲）、其他用黑影
      if (isPos) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + SPRITE_DRAW_H / 2 - 1, 4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + SPRITE_DRAW_H / 2 - 1, 5, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 隊伍識別小色圈（左上角小角標）
      const teamColor = p.team === 'h' ? '#2196f3' : '#e53935';
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(cx - SPRITE_DRAW_W / 2 + 2, cy - SPRITE_DRAW_H / 2 + 2, 2, 0, Math.PI * 2);
      ctx.fill();

      // 取 sprite sheet 並 drawImage
      // sheet 可能是 PIPOYA HTMLImageElement，或 LPC 預合成的 { canvas, frameW, frameH }
      const sheetEntry = state.spriteCache?.get(p.card_id);
      let sheet, frameW, frameH, drawW, drawH;
      if (sheetEntry && sheetEntry.canvas) {
        // LPC：{ canvas, frameW, frameH }
        sheet = sheetEntry.canvas;
        frameW = sheetEntry.frameW; frameH = sheetEntry.frameH;
        drawW = SPRITE_DRAW_W;
        drawH = Math.round(SPRITE_DRAW_W * (frameH / frameW));
      } else if (sheetEntry && sheetEntry.complete && sheetEntry.naturalWidth > 0) {
        // PIPOYA HTMLImageElement（舊路徑、fallback）
        sheet = sheetEntry;
        frameW = FRAME_PX; frameH = FRAME_PX;
        drawW = SPRITE_DRAW_W; drawH = SPRITE_DRAW_H;
      }

      if (sheet) {
        const srcX = frame * frameW;
        const srcY = dirRow * frameH;
        if (diving) {
          // 撲球：旋轉 ±75 度（朝 dive 方向橫躺）+ 略放大、加運動模糊感
          ctx.save();
          ctx.translate(cx, cy);
          const dAge = state.frame - (p._diveStart || state.frame);
          const t = Math.min(1, dAge / ((p._diveUntil - p._diveStart) || 24));
          // 前半快速轉到 75 度、後半保持
          const angleDeg = (t < 0.4 ? (t / 0.4) * 75 : 75) * (p._diveDirY || 1);
          ctx.rotate(angleDeg * Math.PI / 180);
          ctx.scale(1.1, 1.1);
          ctx.drawImage(sheet, srcX, srcY, frameW, frameH, -drawW / 2, -drawH / 2, drawW, drawH);
          ctx.restore();
        } else {
          const dx = Math.round(cx - drawW / 2);
          const dy = Math.round(cy - drawH / 2);
          ctx.drawImage(sheet, srcX, srcY, frameW, frameH, dx, dy, drawW, drawH);
        }
      } else {
        // fallback: 簡單色圈（sprite 還沒載入完成）
        ctx.fillStyle = teamColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 體力疲勞表現：gameTimeFrac × stamina 算當前疲勞度 + 鏟球額外消耗
      // 官方比賽（state.disableTeamMechanics）關閉體力影響
      // 天賦：💪 體能怪 → 完全免疲勞；⚡ 衝刺型 → 後半場（gtf > 0.5）疲勞減半
      const gtf = state.frame / TOTAL_FRAMES;
      const pStamina = p.stats?.stamina ?? 75;
      let fatigue;
      if (state.disableTeamMechanics) {
        fatigue = 0;
      } else if (p.talent === 'bodybuilder') {
        fatigue = 0;
      } else {
        fatigue = gtf * Math.max(0.1, 0.55 - pStamina / 250) + (p._tackleFatigue || 0);
        if (p.talent === 'speedster' && gtf > 0.5) fatigue *= 0.5;
      }

      // 頭頂體力條：持球者 + 正在鏟球的人都顯示
      const showStaminaBar = (isPos || tackleActive) && p.role !== 'GK';
      if (showStaminaBar) {
        const remaining = Math.max(0, Math.min(1, 1 - fatigue));
        const barW = 18, barH = 3;
        const bx = cx - barW / 2;
        const by = cy - SPRITE_DRAW_H / 2 - 7;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = remaining > 0.7 ? '#4caf50'
                       : remaining > 0.45 ? '#ffc107' : '#e53935';
        ctx.fillRect(bx, by, barW * remaining, barH);
      }

      // 疲勞汗珠：fatigue > 0.18 起、依疲勞度漸進 1→2→3 滴
      // 顯示在「頭髮側」= sprite 當前面向的反側
      //   dirRow 1 (面左) → 髮在右 → sweat 右；dirRow 2 (面右) → sweat 左
      //   dirRow 0/3 (面向上/下) → 用 team 預設（home 攻右、髮多在左）
      if (fatigue > 0.18 && p.role !== 'GK') {
        let sweatSign;
        if (dirRow === 1) sweatSign = +1;
        else if (dirRow === 2) sweatSign = -1;
        else sweatSign = p.team === 'h' ? -1 : 1;
        ctx.fillStyle = `rgba(140,200,255,${0.85})`;
        const headY = cy - SPRITE_DRAW_H / 2 + 7;
        const wig = Math.sin((state.frame + i * 7) / 8) * 0.8;
        // 第 1 滴
        ctx.beginPath();
        ctx.ellipse(cx + sweatSign * 4 + wig * sweatSign, headY + 2, 1.1, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // 第 2 滴（fatigue > 0.32）
        if (fatigue > 0.32) {
          ctx.beginPath();
          ctx.ellipse(cx + sweatSign * 5 + wig * 0.7 * sweatSign, headY - 2, 1, 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // 第 3 滴（fatigue > 0.48）
        if (fatigue > 0.48) {
          ctx.beginPath();
          ctx.ellipse(cx + sweatSign * 6 + wig * 0.4 * sweatSign, headY - 6, 0.9, 1.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 被搶球者頭頂「!」愣神特效（30 幀）
      if (p._stunUntil && state.frame < p._stunUntil) {
        const stunAge = state.frame - (p._stunUntil - 30);
        const wig = Math.sin(stunAge / 3) * 1.5;
        const sx = cx + wig;
        const sy = cy - SPRITE_DRAW_H / 2 - 4;
        ctx.fillStyle = '#ffeb3b';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        ctx.font = 'bold 14px Impact, Arial Black';
        ctx.textAlign = 'center';
        ctx.strokeText('!', sx, sy);
        ctx.fillText('!', sx, sy);
        ctx.textAlign = 'start';
      }
    });

    // 鏟球的視覺：鏟球者頭頂「鏟球」標籤 + 被搶者頭頂「!」（兩處都已在 player loop 內畫）
    // 之前還有「搶到!」金字 + 爆炸放射線，會跟「鏟球」標籤撞太近、互蓋 → 已移除

    // 球（帶陰影）— 視覺 y offset 9px 讓球在球員腳邊（之前剛好在胸口）
    // 鏟球後球的小彈跳：從原位置滑到新持球者（10 幀過渡）
    const BALL_VISUAL_Y_OFFSET = 9;
    let ballRenderX = ball.x, ballRenderY = ball.y;
    if (state.ballPopOff && state.frame < state.ballPopOff.endFrame) {
      const po = state.ballPopOff;
      const t = (state.frame - po.startFrame) / (po.endFrame - po.startFrame);
      const eased = 1 - Math.pow(1 - t, 2);
      ballRenderX = po.fromX + (po.toX - po.fromX) * eased;
      ballRenderY = po.fromY + (po.toY - po.fromY) * eased;
      // 球彈起的弧線（中間時最高）
      const hop = Math.sin(t * Math.PI) * 6;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(ballRenderX * PITCH_W, ballRenderY * PITCH_H + BALL_VISUAL_Y_OFFSET - hop, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(ball.x * PITCH_W, ball.y * PITCH_H + BALL_VISUAL_Y_OFFSET, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 還原鏡頭變換
    ctx.restore();
  }

  // ── HUD ─────────────────────────────────────────────────
  function buildHUD(container, teams) {
    container.innerHTML = `
      <div class="msim-hud">
        <div class="msim-hud-side">
          <div class="msim-hud-label">${teams.home.nameCN} 勝率</div>
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
          <div class="msim-hud-label">${teams.away.nameCN} 勝率</div>
          <div class="msim-hud-val msim-a-chance" style="color:#ef9a9a">—</div>
        </div>
      </div>
      <div class="msim-canvas-wrap">
        <canvas class="msim-canvas"></canvas>
        <div class="msim-goal-banner" hidden>
          <div class="msim-goal-banner-text">GOAL!</div>
          <div class="msim-goal-banner-team"></div>
        </div>
        <!-- 狂熱模式 banner（氣場觸發、團隊 buff 10 秒）-->
        <div class="msim-fever-banner" hidden>
          <div class="msim-fever-text">🔥 狂 熱 模 式</div>
          <div class="msim-fever-team"></div>
        </div>
        <!-- 全場結束 banner（在球員排隊定格時跳出）-->
        <div class="msim-fulltime-banner" hidden>
          <div class="msim-fulltime-label">全 場 結 束</div>
          <div class="msim-fulltime-matchup">
            <span class="msim-fulltime-home"></span>
            <span class="msim-fulltime-score">
              <span class="msim-fulltime-sh">0</span>
              <span class="msim-fulltime-dash">-</span>
              <span class="msim-fulltime-sa">0</span>
            </span>
            <span class="msim-fulltime-away"></span>
          </div>
          <div class="msim-fulltime-winner"></div>
        </div>
        <div class="msim-confetti"></div>
      </div>
      <div class="msim-speed-bar">
        <button class="msim-speed-btn" data-speed="0.5" title="慢放">🐢 0.5×</button>
        <button class="msim-speed-btn active" data-speed="1" title="正常">▶️ 1×</button>
        <button class="msim-speed-btn" data-speed="2" title="快轉">⏩ 2×</button>
      </div>
      <div class="msim-teamline">
        <span style="color:#2196f3;font-weight:800">${teams.home.nameCN}</span>
        <span style="opacity:0.5;font-size:11px;margin:0 6px">${teams.home.formation || ''} · vs · ${teams.away.formation || ''}</span>
        <span style="color:#e53935;font-weight:800">${teams.away.nameCN}</span>
      </div>
      <div class="msim-summary" style="display:none"></div>
    `;
    return {
      hChance: container.querySelector('.msim-h-chance'),
      aChance: container.querySelector('.msim-a-chance'),
      hScore: container.querySelector('.msim-h-score'),
      aScore: container.querySelector('.msim-a-score'),
      time: container.querySelector('.msim-time'),
      canvas: container.querySelector('.msim-canvas'),
      canvasWrap: container.querySelector('.msim-canvas-wrap'),
      goalBanner: container.querySelector('.msim-goal-banner'),
      goalBannerTeam: container.querySelector('.msim-goal-banner-team'),
      feverBanner: container.querySelector('.msim-fever-banner'),
      feverTeam: container.querySelector('.msim-fever-team'),
      fulltimeBanner: container.querySelector('.msim-fulltime-banner'),
      fulltimeHome: container.querySelector('.msim-fulltime-home'),
      fulltimeAway: container.querySelector('.msim-fulltime-away'),
      fulltimeSh: container.querySelector('.msim-fulltime-sh'),
      fulltimeSa: container.querySelector('.msim-fulltime-sa'),
      fulltimeWinner: container.querySelector('.msim-fulltime-winner'),
      confetti: container.querySelector('.msim-confetti'),
      summary: container.querySelector('.msim-summary'),
      speedBtns: container.querySelectorAll('.msim-speed-btn'),
    };
  }

  // 進球儀式 — banner + 彩花 + 視角縮放
  // 注意：「結束」由 _endGoalCelebration 控制、跟著 game pause 結束時呼叫，
  // 不再用 setTimeout 自動收 → 速度 2x/3x 時不會發生「歡呼還在跑、下一波已開始」
  function _triggerGoalCelebration(ui, teamName, teamSide) {
    if (!ui.goalBanner) return;
    // 先把上一次的痕跡清掉（避免連續進球時殘留）
    _endGoalCelebration(ui, /* immediate */ true);

    ui.goalBannerTeam.textContent = teamName + ' 進球!';
    ui.goalBanner.dataset.side = teamSide;
    ui.goalBanner.hidden = false;
    void ui.goalBanner.offsetWidth;
    ui.goalBanner.classList.add('msim-goal-show');
    // 視角 zoom in
    if (ui.canvasWrap) {
      void ui.canvasWrap.offsetWidth;
      ui.canvasWrap.classList.add('msim-zoom-in');
    }
    // 彩花
    if (ui.confetti) {
      const color = teamSide === 'h' ? ['#2196f3','#90caf9','#fff','#f0c040'] : ['#e53935','#ef9a9a','#fff','#f0c040'];
      ui.confetti.innerHTML = '';
      for (let i = 0; i < 30; i++) {
        const c = document.createElement('i');
        c.className = 'msim-conf-piece';
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = color[i % color.length];
        c.style.animationDelay = (Math.random() * 0.3) + 's';
        c.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;
        ui.confetti.appendChild(c);
      }
    }
  }

  // 個人狂熱 banner — 球員進入狂熱、3 秒後 fade out
  function _triggerFeverBanner(ui, side, playerName) {
    if (!ui.feverBanner) return;
    ui.feverTeam.textContent = (playerName || '?') + ' 狂熱中！';
    ui.feverBanner.dataset.side = side;
    ui.feverBanner.hidden = false;
    void ui.feverBanner.offsetWidth;
    ui.feverBanner.classList.remove('msim-fever-show');
    void ui.feverBanner.offsetWidth;
    ui.feverBanner.classList.add('msim-fever-show');
    // 3 秒後 fade（個人 banner 不需要持續 10 秒 — 給人看到即可）
    setTimeout(() => {
      if (ui.feverBanner) {
        ui.feverBanner.classList.remove('msim-fever-show');
        setTimeout(() => { if (ui.feverBanner) ui.feverBanner.hidden = true; }, 400);
      }
    }, 3000);
  }

  // 全場結束 banner（HomeTeam X-Y AwayTeam + 贏家標籤）— 跟 GOAL 同風格、in-canvas 顯示
  function _triggerFulltimeBanner(ui, home, away, score, winner) {
    if (!ui.fulltimeBanner) return;
    ui.fulltimeHome.textContent = home.nameCN || home.name || 'HOME';
    ui.fulltimeAway.textContent = away.nameCN || away.name || 'AWAY';
    ui.fulltimeSh.textContent = String(score.h);
    ui.fulltimeSa.textContent = String(score.a);
    // 贏家文字 + 顏色
    if (winner === 'h') {
      ui.fulltimeWinner.textContent = `🏆 ${home.nameCN || 'HOME'} 勝`;
      ui.fulltimeBanner.dataset.winner = 'h';
    } else if (winner === 'a') {
      ui.fulltimeWinner.textContent = `🏆 ${away.nameCN || 'AWAY'} 勝`;
      ui.fulltimeBanner.dataset.winner = 'a';
    } else {
      ui.fulltimeWinner.textContent = '🤝 平 手';
      ui.fulltimeBanner.dataset.winner = 'd';
    }
    ui.fulltimeBanner.hidden = false;
    void ui.fulltimeBanner.offsetWidth;
    ui.fulltimeBanner.classList.add('msim-ft-show');
    // 彩花（用贏家顏色）
    if (ui.confetti) {
      const color = winner === 'h' ? ['#2196f3','#90caf9','#fff','#f0c040']
                  : winner === 'a' ? ['#e53935','#ef9a9a','#fff','#f0c040']
                  : ['#ffd54a','#fff','#ccc'];
      ui.confetti.innerHTML = '';
      for (let i = 0; i < 40; i++) {
        const c = document.createElement('i');
        c.className = 'msim-conf-piece';
        c.style.left = (Math.random() * 100) + '%';
        c.style.background = color[i % color.length];
        c.style.animationDelay = (Math.random() * 0.6) + 's';
        c.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
        c.style.transform = `rotate(${Math.random() * 360}deg)`;
        ui.confetti.appendChild(c);
      }
    }
  }

  // 進球儀式結束：跟著比賽 pause 結束一起呼叫（從 stepOneFrame 觸發）
  // immediate=true：連續進球前的清乾淨（不能 setTimeout 設 hidden，否則會在
  // 下一次 _triggerGoalCelebration 設完 hidden=false 後才 fire、把新 banner 蓋掉）
  function _endGoalCelebration(ui, immediate) {
    if (!ui) return;
    // 清掉前一個 hide timer（避免 stale 把新 banner 蓋掉）
    if (ui._goalHideTimer) { clearTimeout(ui._goalHideTimer); ui._goalHideTimer = null; }
    if (ui.goalBanner) {
      ui.goalBanner.classList.remove('msim-goal-show');
      if (immediate) {
        // 立即收（給 _triggerGoalCelebration 接著重新顯示用）— 不能設 hidden=true
      } else {
        // 等 CSS transition 結束再 hidden
        ui._goalHideTimer = setTimeout(() => {
          if (ui.goalBanner) ui.goalBanner.hidden = true;
          ui._goalHideTimer = null;
        }, 300);
      }
    }
    if (ui.canvasWrap) ui.canvasWrap.classList.remove('msim-zoom-in');
    if (ui.confetti)   ui.confetti.innerHTML = '';
  }

  // ── 主模擬 ──────────────────────────────────────────────
  // opts: { seed?: string, onEnd?: (score) => void, hideReplay?: boolean, hideSpeed?: boolean }
  function runSim(container, home, away, matchId, opts) {
    opts = opts || {};
    // 帶 seed → 用 seedable RNG（朋友直播房需要每人結果一致）
    // 不帶 seed → 沿用 Math.random（單機隨便看的維持「每次不同」）
    const rng = opts.seed ? makeSeededRng(opts.seed) : Math.random;

    const ui = buildHUD(container, { home, away });
    // 朋友直播房強制 1x 同步：藏掉速度鍵 + speedMult 鎖死
    if (opts.hideSpeed) {
      const bar = container.querySelector('.msim-speed-bar');
      if (bar) bar.style.display = 'none';
    }
    const canvas = ui.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // canvas 視窗大小 = VIEW_W × VIEW_H（只顯示球場其中一部分，鏡頭追焦）
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = '560px';
    canvas.style.aspectRatio = `${VIEW_W} / ${VIEW_H}`;
    canvas.style.borderRadius = '8px';
    canvas.style.display = 'block';
    canvas.style.margin = '8px auto';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    // Phase 2.2：pixel sprite 不平滑（保持銳利）
    ctx.imageSmoothingEnabled = false;

    const hF = buildFormation(parseFormation(home.formation), true);
    const aF = buildFormation(parseFormation(away.formation), false);
    // 給每個球員獨特的 flair（站位微差 + 反應速度）讓整條線不再像旗
    const makeFlair = () => ({
      xJitter: (rng() - 0.5) * 0.035,
      yJitter: (rng() - 0.5) * 0.025,
      laziness: 0.78 + rng() * 0.44, // 0.78 ~ 1.22
    });
    // Phase 2.2+：assign card_id per player（PIPOYA sprite 用）
    function _cardIdFor(teamData, idx) {
      const kp = teamData.keyPlayers && teamData.keyPlayers[idx];
      if (kp && kp.card_id) return kp.card_id;
      const seed = (teamData.nameCN || '') + ':' + idx;
      let h = 0;
      for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return 'r-mid-' + String(71 + (h % 45)).padStart(3, '0');
    }
    // 每位球員的個人數據：優先用 keyPlayers[i].stats、否則從隊伍 radar + 角色 + jitter 推導
    // 角色加成：GK 守門加成大、DEF defense+、MID midfield+、FWD attack+
    function _statsFor(teamData, idx, role, isKeyStar) {
      const radar = teamData.radar || { attack:70, defense:70, midfield:70, speed:70, stamina:75 };
      const kp = teamData.keyPlayers && teamData.keyPlayers[idx];
      if (kp && kp.stats) return { ...kp.stats };
      // 角色基底
      let attack   = radar.attack;
      let defense  = radar.defense;
      let midfield = radar.midfield;
      let speed    = radar.speed;
      let stamina  = radar.stamina || 75;
      let goalkeeping = radar.defense;
      if (role === 'GK')  { goalkeeping = radar.defense + 12; defense += 8; attack -= 25; speed -= 10; }
      else if (role === 'DEF') { defense += 6; attack -= 10; midfield -= 3; }
      else if (role === 'MID') { midfield += 5; }
      else if (role === 'AMC') { midfield += 4; attack += 6; }
      else if (role === 'FWD') { attack += 7; speed += 4; defense -= 8; }
      // 球星加成（keyPlayers 前 5 位視為球星）
      if (isKeyStar) { attack += 4; defense += 2; midfield += 3; speed += 2; goalkeeping += 3; stamina += 4; }
      // 個人差異 jitter（±5 以內、固定 seed = 隊名+idx）
      const seed = (teamData.nameCN || teamData.name || 't') + ':' + idx;
      let h = 0;
      for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const jitter = () => { h = (h * 1664525 + 1013904223) >>> 0; return ((h % 100) - 50) / 10; };
      attack   = Math.max(20, Math.min(99, Math.round(attack + jitter())));
      defense  = Math.max(20, Math.min(99, Math.round(defense + jitter())));
      midfield = Math.max(20, Math.min(99, Math.round(midfield + jitter())));
      speed    = Math.max(20, Math.min(99, Math.round(speed + jitter())));
      stamina  = Math.max(20, Math.min(99, Math.round(stamina + jitter())));
      goalkeeping = Math.max(20, Math.min(99, Math.round(goalkeeping + jitter())));
      return { attack, defense, midfield, speed, stamina, goalkeeping };
    }
    // 天賦屬性加成（+5 到對應的主屬性）— 在 _statsFor 結果上疊加
    // 5 種：speedster / bodybuilder / shooter / wall / magician
    const TALENT_BONUS = {
      speedster:   { speed: 5 },
      bodybuilder: { stamina: 5 },
      shooter:     { attack: 5 },
      wall:        { defense: 5 },
      magician:    { midfield: 5 },
    };
    function _talentFor(teamData, idx) {
      const kp = teamData.keyPlayers && teamData.keyPlayers[idx];
      return kp?.talent || null;
    }
    function _applyTalentToStats(stats, talent) {
      const bonus = TALENT_BONUS[talent];
      if (!bonus) return stats;
      const out = { ...stats };
      Object.keys(bonus).forEach(k => {
        out[k] = Math.min(99, (out[k] || 50) + bonus[k]);
      });
      return out;
    }
    // 個人狂熱：accumGauge 從外部讀（跨場次保存）、個性 personality 賦予差異
    const initialGauges = opts.feverGauges || {};   // { card_id: number 0~100 }
    const makeFeverInit = (cardId) => ({
      feverGauge: Math.max(0, Math.min(100, initialGauges[cardId] || 0)),
      fever: 0,
      feverCooldown: 0,
      _feverPersonality: 0.7 + rng() * 0.6,    // 0.7~1.3 變異、避免大家同時爆
    });
    // helper：從 keyPlayers 找名字、找不到回退到 role+編號（保險）
    const _nameFor = (teamData, idx, role) => {
      const kp = teamData.keyPlayers && teamData.keyPlayers[idx];
      return (kp && kp.name) || `${role}${idx + 1}`;
    };
    const players = [
      ...hF.map((p, i) => {
        const tal = _talentFor(home, i);
        return {
          ...p, team: 'h',
          name: _nameFor(home, i, p.role),
          baseX: p.x, baseY: p.y, x: p.x, y: p.y, tx: p.x, ty: p.y,
          flair: makeFlair(),
          card_id: _cardIdFor(home, i),
          stats: _applyTalentToStats(_statsFor(home, i, p.role, i < 5), tal),
          talent: tal,
          ...makeFeverInit(_cardIdFor(home, i)),
        };
      }),
      ...aF.map((p, i) => {
        const tal = _talentFor(away, i);
        return {
          ...p, team: 'a',
          name: _nameFor(away, i, p.role),
          baseX: p.x, baseY: p.y, x: p.x, y: p.y, tx: p.x, ty: p.y,
          flair: makeFlair(),
          card_id: _cardIdFor(away, i),
          stats: _applyTalentToStats(_statsFor(away, i, p.role, i < 5), tal),
          talent: tal,
          ...makeFeverInit(_cardIdFor(away, i)),
        };
      }),
    ];

    // Phase 2.3+：preload LPC sprite per player（有 look_data 用 LPC、沒 look_data 也產一個）
    const _matchSpriteCache = new Map();
    const _getLookFor = (teamData, idx) => {
      const kp = teamData.keyPlayers && teamData.keyPlayers[idx];
      if (!kp) return _generateGenericLook(`${teamData.nameCN || teamData.name || 't'}:${idx}`);
      if (kp.look_data) return kp.look_data;
      // 沒 look_data → 依球員名字產（含明星表 + hash fallback）
      return _lookForPlayerName(kp.name, kp.pos);
    };
    // 隊伍 kit 顏色：home 從 teamData.kit 取（玩家自訂）、away 預設黑紅
    const homeKit = home.kit || { shirtColor: 'red', pantsColor: 'white', shoeColor: 'white' };
    const awayKit = away.kit || { shirtColor: 'black', pantsColor: 'red',   shoeColor: 'black' };

    players.forEach((p, idx) => {
      if (!p.card_id || _matchSpriteCache.has(p.card_id)) return;
      const teamData = p.team === 'h' ? home : away;
      const teamIdx = idx < 11 ? idx : idx - 11;
      const look = _getLookFor(teamData, teamIdx);
      const kit = p.team === 'h' ? homeKit : awayKit;

      if (look && window.LpcRenderer) {
        // 統一用 walkingFullBody（含腳 + kick/cheer/frustration row）
        const gen = window.LpcRenderer.walkingFullBody || window.LpcRenderer.matchSpriteSheet;
        gen(look, kit).then(result => {
          if (result) _matchSpriteCache.set(p.card_id, result);
        }).catch(e => console.warn('LPC sheet failed for', p.card_id, e));
      } else {
        // 沒 LpcRenderer（不應該發生）→ 退回 PIPOYA
        const img = new Image();
        img.src = (typeof window.MyTeamSprite === 'function')
          ? window.MyTeamSprite(p.card_id)
          : `img/sprites/${p.card_id}.png`;
        _matchSpriteCache.set(p.card_id, img);
      }
    });
    const ball = { x: 0.5, y: 0.5 };

    // 速度倍率（0.5x / 1x / 2x）— accumulator 在下方 tick() 內處理
    let speedMult = 1;
    ui.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        speedMult = parseFloat(btn.dataset.speed);
        ui.speedBtns.forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // 比賽狀態
    const state = {
      spriteCache: _matchSpriteCache,  // Phase 2.2+：每球員的 PIPOYA sprite
      // render() 是 IIFE 頂層函式、看不到 runSim 的 opts，把需要的旗標掛到 state
      disableTeamMechanics: !!opts.disableTeamMechanics,
      possession: 'h',       // 'h' | 'a'
      possessorIdx: -1,      // index into players[]
      phase: 'kickoff',      // 'kickoff' | 'dribble' | 'pass' | 'shoot' | 'celebrate' | 'halftime'
      ballFromX: 0.5, ballFromY: 0.5,
      ballTargetX: 0.5, ballTargetY: 0.5,
      ballTravelTotal: 0, ballTravelLeft: 0,
      score: { h: 0, a: 0 },
      stats: { h: { shots: 0, goals: 0, passes: 0 }, a: { shots: 0, goals: 0, passes: 0 } },
      frame: 0,
      pauseFrames: 0,
      flashAlpha: 0, flashTeam: null,
      halftimeDone: false,
      lastActionFrame: 0,
      players, ball,
      // 個人狂熱模式：每球員 feverGauge 0~100、滿了進狂熱（個人 +25% 屬性、持續 10s）
      // 球員物件上會有：feverGauge (0~100)、fever (剩餘 frames、>0 = 狂熱中)、feverShownAt (顯示 banner 用)
      // 追焦鏡頭：起始置於球場中央，每 frame 朝球位置 lerp
      camera: { x: (PITCH_W - VIEW_W) / 2, y: (PITCH_H - VIEW_H) / 2 },
      get possessorIdx() { return this._possessorIdx; },
      set possessorIdx(v) { this._possessorIdx = v; },
    };
    state.possessorIdx = -1;

    // 控球率計算：強弱差放大 2.5× 讓實力落差反映在控球時間
    // 原本近乎 50/50、強隊只有 ~55%；放大後 BIG 6 vs 保級可達 ~65%
    const _hMidRaw = home.radar.midfield + home.radar.speed * 0.5;
    const _aMidRaw = away.radar.midfield + away.radar.speed * 0.5;
    const _hPossRaw = _hMidRaw / (_hMidRaw + _aMidRaw);
    const _hPossAmplified = 0.5 + (_hPossRaw - 0.5) * 2.5;
    const hMidPoss = Math.min(0.75, Math.max(0.25, _hPossAmplified + 0.04));

    function getTeam(code) { return code === 'h' ? home : away; }

    function kickoff(whoHasBall) {
      state.possession = whoHasBall;
      state.phase = 'dribble';
      // 找中場球員持球
      const mids = players
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.team === whoHasBall && x.p.role === 'MID');
      const chosen = mids[Math.floor(mids.length / 2)] || mids[0]
        || players.map((p, i) => ({ p, i })).find(x => x.p.team === whoHasBall && x.p.role !== 'GK');
      state.possessorIdx = chosen ? chosen.i : 0;
      ball.x = 0.5; ball.y = 0.5;
      // 開球規則：全員退回己方半場（home x<0.5、away x>0.5）
      // 之前的「擠中線」感是因為形位 tx 跳遠後 max-step 暴衝、現在 setIdealTarget
      // 限制了每幀位移、即使 FWD 從 0.48 出發也是自然走到 0.85（不會暴衝）
      players.forEach(p => {
        p.x = p.baseX;
        p.y = p.baseY;
        if (p.team === 'h') p.x = Math.min(0.48, p.x);
        else p.x = Math.max(0.52, p.x);
        p.tx = p.x; p.ty = p.y;
        p._urgent = false;
      });
      // 持球者站到中圈
      const pos = players[state.possessorIdx];
      if (pos) { pos.x = 0.5; pos.y = 0.5; pos.tx = 0.5; pos.ty = 0.5; }
      // 對方一位前鋒上來接應（真實開球兩人站中圈）
      const myFwd = players
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.team === whoHasBall && x.p.role === 'FWD')[0];
      if (myFwd) {
        myFwd.p.x = whoHasBall === 'h' ? 0.52 : 0.48;
        myFwd.p.y = 0.5;
        myFwd.p.tx = myFwd.p.x; myFwd.p.ty = myFwd.p.y;
      }
      // 鏡頭直接 snap 到球（中圈）
      if (state.camera) {
        state.camera.x = Math.max(0, Math.min(PITCH_W - VIEW_W, ball.x * PITCH_W - VIEW_W / 2));
        state.camera.y = Math.max(0, Math.min(PITCH_H - VIEW_H, ball.y * PITCH_H - VIEW_H / 2));
      }
      // 套用 flipEase：開球後 40 幀 smoothness × 0.35→1，球員不會「卡中線然後暴衝前壓」
      state.possessionChangeFrame = state.frame;
      state.recentPassers = [];
      state.recentPassersSet = new Set();
    }

    function findNearestOpponent(p) {
      let best = null, bestD = Infinity;
      for (const q of players) {
        if (q.team === p.team) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) { bestD = d; best = q; }
      }
      return { player: best, dist: bestD };
    }

    function rankPassTargets(possessor) {
      const goalX = possessor.team === 'h' ? 1 : 0;
      const myDistToGoal = Math.abs(goalX - possessor.x);
      const iAmInBox = myDistToGoal < 0.22;
      const teammates = players
        .map((p, i) => ({ p, i }))
        .filter(x => x.p.team === possessor.team && x.i !== state.possessorIdx);
      return teammates
        .map(({ p, i }) => {
          const ahead = possessor.team === 'h' ? p.x > possessor.x : p.x < possessor.x;
          const distToGoal = Math.abs(goalX - p.x);
          const targetInBox = distToGoal < 0.22;
          const nearest = findNearestOpponent(p);
          const openness = Math.min(0.15, nearest.dist);
          const roleBonus = p.role === 'FWD' ? 0.15 : p.role === 'AMC' ? 0.12 : p.role === 'MID' ? 0.05 : 0;
          let score = (ahead ? 0.3 : 0) + openness + roleBonus - distToGoal * 0.4;
          // (1) 前場反向傳球扣分
          if (myDistToGoal < 0.3 && distToGoal > myDistToGoal + 0.05) {
            score -= 0.35;
          }
          // (2) 最近 3 個經手過球的隊友、60 幀內不要傳回去（避免 2/3 人繞圈）
          if (state.recentPassersSet && state.recentPassersSet.has(i)
              && state.frame - state.lastPassFrame < 60) {
            score -= 0.55;
          }
          // (3) 禁區內互傳硬懲罰：兩邊都在禁區 → 應該要射、不要傳
          if (iAmInBox && targetInBox) {
            score -= 0.55;
          }
          // (4) 長傳懲罰：避免 GK→FWD 一腳直塞跳過中場。真實足球絕大多數是短/中傳
          //     0-0.15 距離：無懲罰（短傳）
          //     0.15-0.30：輕懲罰（中傳）
          //     0.30+：重懲罰（長球，少見）
          const passDist = Math.hypot(p.x - possessor.x, p.y - possessor.y);
          let distPenalty = 0;
          if (passDist > 0.30) distPenalty = 0.40 + (passDist - 0.30) * 1.2;
          else if (passDist > 0.15) distPenalty = (passDist - 0.15) * 0.8;
          score -= distPenalty;
          // (5) 拉邊加成：中路持球 → 傳給邊路隊友拉開空間（真實足球「找邊鋒」戰術）
          const iAmCentral = Math.abs(possessor.y - 0.5) < 0.18;
          const targetIsWide = Math.abs(p.y - 0.5) > 0.22;
          if (iAmCentral && targetIsWide) score += 0.12;
          // 反之：邊路持球 → 如果目標在中路且在前場，加成（內切傳中給中路前鋒）
          const iAmWide = Math.abs(possessor.y - 0.5) > 0.22;
          const targetIsCentral = Math.abs(p.y - 0.5) < 0.18;
          if (iAmWide && targetIsCentral && ahead) score += 0.10;
          return { p, i, score };
        })
        .sort((a, b) => b.score - a.score);
    }

    function startPass(target) {
      state.ballFromX = ball.x;
      state.ballFromY = ball.y;
      // Lead prediction：朝接球者「跑去的方向」加一點預判（tx/ty - x/y 是他的運動向量）
      // 0.3 倍預判 = 給接球者一點時間跑到位、但不要 over-shoot
      const leadX = (target.p.tx - target.p.x) * 0.3;
      const leadY = (target.p.ty - target.p.y) * 0.3;
      state.ballTargetX = target.p.x + leadX;
      state.ballTargetY = target.p.y + leadY;
      const dist = Math.hypot(state.ballTargetX - ball.x, state.ballTargetY - ball.y);
      state.ballTravelTotal = Math.max(5, Math.round(dist * 60));
      state.ballTravelLeft = state.ballTravelTotal;
      state.phase = 'pass';
      state.passTargetIdx = target.i;
      // 記錄最近 3 個經手過球的隊友（不只上一個）
      // 避免「A→B→C→A」繞圈傳 — 60 幀內 A/B/C 互傳都會被扣分
      state.lastPassFromIdx = state.possessorIdx;
      state.lastPassFrame = state.frame;
      if (!state.recentPassers) state.recentPassers = [];
      state.recentPassers.push(state.possessorIdx);
      if (state.recentPassers.length > 3) state.recentPassers.shift();
      state.recentPassersSet = new Set(state.recentPassers);
      state.stats[state.possession].passes++;
    }

    function startShoot() {
      state.ballFromX = ball.x;
      state.ballFromY = ball.y;
      const goalX = state.possession === 'h' ? 1 : 0;
      // 射向球門範圍內一個點（稍微偏左右，不永遠中路）
      state.ballTargetX = goalX;
      state.ballTargetY = 0.38 + rng() * 0.24;
      const dist = Math.hypot(state.ballTargetX - ball.x, state.ballTargetY - ball.y);
      state.ballTravelTotal = Math.max(5, Math.round(dist * 50));
      state.ballTravelLeft = state.ballTravelTotal;
      state.phase = 'shoot';
      state.stats[state.possession].shots++;

      // 每次射門都觸發 GK 撲球視覺（沿球門線朝 ballTargetY 撲）
      const defTeam = state.possession === 'h' ? 'a' : 'h';
      const gkPlayer = players.find(p => p.team === defTeam && p.role === 'GK');
      if (gkPlayer) {
        gkPlayer._diveStart = state.frame;
        gkPlayer._diveUntil = state.frame + state.ballTravelTotal + 6;
        gkPlayer._diveDirY = Math.sign(state.ballTargetY - gkPlayer.y) || 1;
        gkPlayer._diveDistance = Math.min(0.10, Math.abs(state.ballTargetY - gkPlayer.y));
      }
    }

    function resolveShot() {
      // 個人化進球率：射門者的個人 attack vs 對方 GK 的個人 goalkeeping
      // 沒射門者就 fallback 到隊伍 radar
      const shooter = players[state.possessorIdx];
      const defTeam = state.possession === 'h' ? 'a' : 'h';
      const gk = players.find(p => p.team === defTeam && p.role === 'GK');
      // 個人狂熱加成：射手 + 25%、守門員狂熱 +20% 撲球
      // 🛡️ 城牆天賦：守門員撲球率 +30%（搶斷天賦對 GK 自動轉換成撲球加成）
      const shooterFevered = shooter && shooter.fever > 0;
      const gkFevered = gk && gk.fever > 0;
      const gkWall = gk && gk.talent === 'wall';
      const shooterAtk = (shooter?.stats?.attack ?? getTeam(state.possession).radar.attack)
                       * (shooterFevered ? 1.25 : 1);
      const gkSave     = (gk?.stats?.goalkeeping ?? getTeam(defTeam).radar.defense)
                       * (gkFevered ? 1.20 : 1)
                       * (gkWall ? 1.30 : 1);
      // 氣場：純影響狂熱條累積速度（見 line ~1634）、不再加成射門精準
      // （avoid double-dipping：高 aura 已經有狂熱期間 +25% 全屬性的收益）
      // 🎯 神射手天賦：禁區內射門 +20% 進球率（dist 到對方球門 < 0.15 算禁區）
      const goalX = state.possession === 'h' ? 1 : 0;
      const distToGoal = shooter ? Math.abs(shooter.x - goalX) : 1;
      const shooterTalentBonus = (shooter?.talent === 'shooter' && distToGoal < 0.15) ? 0.20 : 0;
      const goalProb = Math.max(0.10, Math.min(0.92,
        ((shooterAtk - gkSave * 0.55) / 100) * 0.78 + shooterTalentBonus
      ));
      const isGoal = rng() < goalProb;
      if (isGoal) {
        state.score[state.possession]++;
        state.stats[state.possession].goals++;
        state.flashTeam = state.possession;
        state.flashAlpha = 1;
        state.pauseFrames = Math.round(FPS * GOAL_PAUSE_SEC);
        state.phase = 'celebrate';
        ui.hScore.textContent = state.score.h;
        ui.aScore.textContent = state.score.a;
        // 進球儀式：banner + 彩花 + 視角 zoom
        const scoringTeam = state.possession === 'h' ? home : away;
        _triggerGoalCelebration(ui, scoringTeam.nameCN, state.possession);
        // 進球者 fever gauge +35（接近滿）
        if (shooter && shooter.fever === 0 && shooter.feverCooldown === 0) {
          shooter.feverGauge = Math.min(100, (shooter.feverGauge || 0) + 35);
        }
      } else {
        // 被撲 / 沒中 → 對方球門員帶球
        const newTeam = state.possession === 'h' ? 'a' : 'h';
        state.possession = newTeam;
        const gkIdx = players.findIndex(p => p.team === newTeam && p.role === 'GK');
        state.possessorIdx = gkIdx;
        state.phase = 'dribble';
        state.lastActionFrame = state.frame;
        ball.x = players[gkIdx].x;
        ball.y = players[gkIdx].y;
        // 換邊 → 清最近經手傳球者記錄、並記錄換邊時機（movePlayers 會降速避免瞬移）
        state.recentPassers = [];
        state.recentPassersSet = new Set();
        state.possessionChangeFrame = state.frame;
      }
    }

    // 每幀決策邏輯（dribble 階段）
    function tickDribble() {
      const pos = players[state.possessorIdx];
      if (!pos) return;
      const atkStats = getTeam(pos.team).radar;
      const defStats = getTeam(pos.team === 'h' ? 'a' : 'h').radar;
      const goalX = pos.team === 'h' ? 1 : 0;
      const distToGoal = Math.abs(pos.x - goalX);

      const framesInPossession = state.frame - state.lastActionFrame;
      // 持球時間越久，「出手壓力」越高 — 避免原地盤球過久
      // 0 幀時 0、25 幀時 0.5、50+ 幀時 1
      const urgency = Math.max(0, Math.min(1, (framesInPossession - 10) / 40));

      // 1) 射門決策（放寬到前場三分之一、距離越近機率越高）
      if (distToGoal < 0.32) {
        const near = findNearestOpponent(pos);
        const hasSpace = near.dist > 0.05;
        const dangerMul = distToGoal < 0.15 ? 1.5 : distToGoal < 0.22 ? 0.7 : 0.25;
        let shootChance;
        if (hasSpace) {
          shootChance = (atkStats.attack / 100) * 0.08 * dangerMul + urgency * 0.06;
        } else if (distToGoal < 0.18) {
          // 禁區內即使被防守者貼身也要「勉強射門」— 真實前鋒不會等完美空間
          shootChance = (atkStats.attack / 100) * 0.05 * dangerMul + urgency * 0.05;
        } else {
          shootChance = urgency * 0.02;
        }
        if (rng() < shootChance) {
          startShoot();
          return;
        }
      }

      // 2) 傳球決策（持球 8+ 幀後考慮，持球越久越積極傳）
      if (framesInPossession > 8) {
        const inMidfield = pos.x > 0.3 && pos.x < 0.7;
        const inAttackThird = (pos.team === 'h' && pos.x > 0.65) || (pos.team === 'a' && pos.x < 0.35);
        let passChance;
        if (inMidfield) passChance = 0.12 + (atkStats.midfield / 100) * 0.04;
        else if (inAttackThird) passChance = 0.03 + (atkStats.midfield / 100) * 0.02;
        else passChance = 0.08 + (atkStats.midfield / 100) * 0.03;
        passChance += urgency * 0.10;
        // ✨ 魔法師天賦：傳球決策 +15%（更頻繁、更積極地找人傳）
        if (pos.talent === 'magician') passChance *= 1.15;
        if (rng() < passChance) {
          const candidates = rankPassTargets(pos);
          // 魔法師對「不是太爛」的傳球也願意執行（score 門檻放寬）
          const threshold = pos.talent === 'magician' ? -0.25 : -0.15;
          if (candidates.length && candidates[0].score > threshold) {
            startPass(candidates[0]);
            state.lastActionFrame = state.frame;
            return;
          }
        }
      }

      // 3) 搶斷（加入「剛接到球 15 幀保護期」避免還沒穩球就被搶）
      if (framesInPossession > 15) {
        const near = findNearestOpponent(pos);
        if (near.player && near.dist < ROLE[near.player.role].tackleRange + 0.005) {
          // 個人化：搶斷者個人 defense vs 持球者個人 midfield（控球能力）
          // 狂熱中：搶斷者 +25% defense、持球者 +25% midfield（更難搶）
          const tFever = near.player.fever > 0 ? 1.25 : 1;
          const pFever = pos.fever > 0 ? 1.25 : 1;
          const indDef = (near.player.stats?.defense ?? defStats.defense) * tFever;
          const indMid = (pos.stats?.midfield ?? atkStats.midfield) * pFever;
          const indSpd = (near.player.stats?.speed ?? defStats.speed ?? 70) * tFever;
          // 體力疲勞影響：後半場 stamina 低的後衛 defense 效力下降 + 鏟過球的人更累
          // 天賦：💪 體能怪 → 完全免疲勞；⚡ 衝刺型 → 後半場疲勞減半
          const gtf = state.frame / TOTAL_FRAMES;
          const tStamina = near.player.stats?.stamina ?? 75;
          let tackleFatigueMult;
          if (opts.disableTeamMechanics || near.player.talent === 'bodybuilder') {
            tackleFatigueMult = 1;
          } else {
            const rawFatigue = gtf * Math.max(0.1, 0.4 - tStamina / 250) + (near.player._tackleFatigue || 0);
            const fatigueAfterTalent = (near.player.talent === 'speedster' && gtf > 0.5)
              ? rawFatigue * 0.5
              : rawFatigue;
            tackleFatigueMult = Math.max(0.55, 1 - fatigueAfterTalent);
          }
          let tackleChance = ((indDef / 100) * 0.04 - (indMid / 100) * 0.02 + (indSpd / 100) * 0.012) * tackleFatigueMult;
          if (distToGoal < 0.22) tackleChance *= 1.3;
          // 🛡️ 城牆天賦：搶斷率 +30%
          if (near.player.talent === 'wall') tackleChance *= 1.30;
          tackleChance = Math.max(0.005, Math.min(0.12, tackleChance));
          if (rng() < tackleChance) {
            state.possession = near.player.team;
            state.possessorIdx = players.indexOf(near.player);
            state.phase = 'dribble';
            state.lastActionFrame = state.frame;
            // 鏟球視覺：用 row 7（thrust）24 幀（~0.8 秒、明顯一點）
            near.player._tackleStart = state.frame;
            near.player._tackleVisualUntil = state.frame + 24;
            near.player._tackleDirX = pos.x - near.player.x;
            near.player._tackleDirY = pos.y - near.player.y;
            const tMag = Math.hypot(near.player._tackleDirX, near.player._tackleDirY) || 1;
            near.player._tackleDirX /= tMag;
            near.player._tackleDirY /= tMag;
            // 鏟球額外消耗體力（每次 +0.05、stamina 越差影響越久）
            near.player._tackleFatigue = (near.player._tackleFatigue || 0) + 0.05;
            // ── 鏟球視覺：被搶者頭頂「!」+ 鏟球者頭頂「鏟球」標籤（兩處都在 render player loop 內）──
            pos._stunUntil = state.frame + 30;          // 被搶者愣 30 幀（頭上「!」）
            // 球從原持球者位置彈到鏟球者位置（不再瞬移、有過渡）
            state.ballPopOff = {
              fromX: pos.x, fromY: pos.y,
              toX: near.player.x, toY: near.player.y,
              startFrame: state.frame,
              endFrame: state.frame + 10,
            };
            // 鏟球者 fever gauge +12（成功鏟球的爽感累積）
            if (near.player.fever === 0 && near.player.feverCooldown === 0) {
              near.player.feverGauge = Math.min(100, (near.player.feverGauge || 0) + 12);
            }
            // 換邊 → 清最近經手傳球者記錄、記錄換邊時機讓 movePlayers 降速
            state.recentPassers = [];
            state.recentPassersSet = new Set();
            state.possessionChangeFrame = state.frame;
            return;
          }
        }
      }

      // 4) 一直沒動作 → 強制出手（門前縮到 25 幀即射、中後場 45 幀才強制傳）
      const forceThreshold = distToGoal < 0.22 ? 25 : 45;
      if (framesInPossession > forceThreshold) {
        if (distToGoal < 0.35) {
          startShoot();
        } else {
          const candidates = rankPassTargets(pos);
          if (candidates.length) {
            startPass(candidates[0]);
            state.lastActionFrame = state.frame;
          }
        }
      }
    }

    // 更新球員 target 位置（最近的人壓球、次近的覆蓋、其他補位）
    function updatePlayerTargets() {
      const atkTeam = state.possession;
      const possessor = players[state.possessorIdx];
      const isLoose = state.phase === 'loose';

      // 先把非持球球員依「離球距離」排序（分隊）
      const rank = { h: [], a: [] };
      players.forEach((p, i) => {
        if (i === state.possessorIdx) return;
        if (p.role === 'GK') return; // GK 另行處理
        const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
        rank[p.team].push({ i, dist });
      });
      rank.h.sort((a, b) => a.dist - b.dist);
      rank.a.sort((a, b) => a.dist - b.dist);

      const rankIdx = {};
      rank.h.forEach((r, n) => rankIdx[r.i] = n);
      rank.a.forEach((r, n) => rankIdx[r.i] = n);

      // 攻方「站位上限」— 不能超過對方 GK（GK 在 0.05 / 0.95）
      const ATK_LIMIT_H = 0.88;
      const ATK_LIMIT_A = 0.12;

      // ★ 核心：tx/ty 不再是「絕對目標」，而是「每幀只能往理想位置走 naturalStep 距離」
      // sprintMult：rare 情況才用 — 散球追球 1.3、持球者 role.sprint × 1.1
      // 體力疲勞：後半場依個人 stamina 拉低速度 + 鏟球額外消耗
      const gameTimeFrac = Math.min(1, state.frame / TOTAL_FRAMES);
      const setIdealTarget = (p, idealTx, idealTy, sprintMult = 1) => {
        const speedMult = (p.role !== 'GK' && p.stats?.speed) ? p.stats.speed / 80 : 1;
        const staminaScore = (p.stats?.stamina ?? 75);
        const fatigueImpact = gameTimeFrac * Math.max(0.1, 0.55 - staminaScore / 250)
                            + (p._tackleFatigue || 0);
        const fatigueMult = Math.max(0.55, 1 - fatigueImpact);
        const naturalStep = 0.011 * speedMult * sprintMult * fatigueMult;
        const dxToIdeal = idealTx - p.x;
        const dyToIdeal = idealTy - p.y;
        const distMag = Math.hypot(dxToIdeal, dyToIdeal);
        if (distMag <= naturalStep) {
          p.tx = idealTx;
          p.ty = idealTy;
        } else {
          p.tx = p.x + (dxToIdeal / distMag) * naturalStep;
          p.ty = p.y + (dyToIdeal / distMag) * naturalStep;
        }
      };

      players.forEach((p, i) => {
        p._urgent = false;
        // 散球：兩隊最近的人朝球跑（會小衝刺）、其他人鬆動站回基本位置
        if (isLoose) {
          if (p.role === 'GK') {
            setIdealTarget(p, p.baseX, 0.5 + (ball.y - 0.5) * 0.25);
            return;
          }
          const myRank = rankIdx[i];
          if (myRank === 0) {
            p._urgent = true;
            // 散球：rank-0 衝刺去搶（1.3x natural speed）
            setIdealTarget(p, ball.x, ball.y, 1.3);
          } else {
            const fl = p.flair || { xJitter: 0, yJitter: 0 };
            setIdealTarget(p,
              p.baseX + (ball.x - 0.5) * 0.18 + fl.xJitter,
              p.baseY + (ball.y - p.baseY) * 0.30 + fl.yJitter);
          }
          return;
        }
        // 持球者：朝對方球門盤帶（用 role.sprint 作為 sprintMult，FWD 1.0、DEF 0.7）
        if (i === state.possessorIdx) {
          const role = ROLE[p.role] || ROLE.MID;
          const laneY = p.baseY * 0.6 + 0.5 * 0.4;
          const idealX = (p.team === 'h' ? Math.min(0.92, p.x + 0.1) : Math.max(0.08, p.x - 0.1))
                       + (rng() - 0.5) * 0.004;
          const idealY = laneY + (rng() - 0.5) * 0.006;
          setIdealTarget(p, idealX, idealY, role.sprint * 1.1);
          return;
        }

        // GK：永遠站門線、跟球左右
        if (p.role === 'GK') {
          setIdealTarget(p, p.baseX, 0.5 + (ball.y - 0.5) * 0.25);
          return;
        }

        const role = ROLE[p.role] || ROLE.MID;
        const sideSign = p.team === 'h' ? 1 : -1;
        const myTeamAttacking = p.team === atkTeam;
        const myRank = rankIdx[i] != null ? rankIdx[i] : 99;
        const fl = p.flair || { xJitter: 0, yJitter: 0, laziness: 1 };

        let idealX, idealY;

        if (!myTeamAttacking) {
          // ── 防守方 ──────────────────────────
          if (myRank === 0) {
            // 最近的去壓持球者
            p._urgent = true;
            idealX = ball.x - sideSign * 0.015 + (rng() - 0.5) * 0.006;
            idealY = ball.y + (rng() - 0.5) * 0.008;
          } else if (myRank === 1) {
            // 第二近的覆蓋
            p._urgent = true;
            idealX = ball.x - sideSign * 0.08;
            idealY = p.baseY + (ball.y - p.baseY) * 0.7;
          } else {
            // 其他：維持陣型但個人差異 + 近球側踩高/遠球側收腳
            const sameSide = Math.abs(ball.y - p.baseY) < 0.22;
            const stepAdj = sameSide ? 0.06 : -0.03;
            idealX = p.baseX - role.pullBack * sideSign + (ball.x - 0.5) * 0.20
                   + stepAdj * sideSign + fl.xJitter;
            idealY = p.baseY + (ball.y - p.baseY) * 0.42 + fl.yJitter;
          }
          // 所有防守者都不能跑到自家 GK 後面（GK 在 0.05 / 0.95）
          if (p.team === 'h') idealX = Math.max(0.10, idealX);
          else idealX = Math.min(0.90, idealX);
          setIdealTarget(p, idealX, idealY);
          return;
        }

        // ── 進攻方（非持球者）───────────────
        if (myRank === 0 && possessor) {
          p._urgent = true;
          const fwdOffset = 0.10 * sideSign;
          const sideOffset = (p.baseY < 0.5 ? -0.12 : 0.12);
          let newTx = possessor.x + fwdOffset;
          if (p.role === 'FWD' || p.role === 'AMC') {
            if (p.team === 'h') newTx = Math.max(newTx, p.x);
            else newTx = Math.min(newTx, p.x);
          }
          idealX = newTx + (rng() - 0.5) * 0.008;
          idealY = possessor.y + sideOffset + (rng() - 0.5) * 0.008;
          const atkLimit = p.team === 'h' ? ATK_LIMIT_H : ATK_LIMIT_A;
          idealX = p.team === 'h' ? Math.min(atkLimit, idealX) : Math.max(atkLimit, idealX);
          setIdealTarget(p, idealX, idealY);
          return;
        }
        // 其他：依角色前插 + 個人差異（y 維持自身 lane 為主，只微幅跟球）
        idealX = p.baseX + role.pushOn * sideSign + (ball.x - 0.5) * 0.22 + fl.xJitter;
        idealY = p.baseY + (ball.y - p.baseY) * 0.22 * role.sprint + fl.yJitter;
        const atkLimit = p.team === 'h' ? ATK_LIMIT_H : ATK_LIMIT_A;
        if (p.team === 'h') idealX = Math.min(atkLimit, idealX);
        else idealX = Math.max(atkLimit, idealX);
        setIdealTarget(p, idealX, idealY);
      });
    }

    function movePlayers() {
      // 剛換邊 40 幀內降低 smoothness，讓角色翻轉時球員用「小碎步」過渡
      // 之前 20 幀太短、smoothness 0.5 還是會看到一陣加速
      const flipFrames = state.frame - (state.possessionChangeFrame || -999);
      const justFlipped = flipFrames >= 0 && flipFrames < 40;
      // 0~20 幀 0.35x、20~40 幀漸進回到 1x
      const flipEase = justFlipped
        ? (flipFrames < 20 ? 0.35 : 0.35 + (flipFrames - 20) / 20 * 0.65)
        : 1;

      players.forEach((p, i) => {
        // tx/ty 由 updatePlayerTargets 的 setIdealTarget 保證「最多在 naturalStep 內」
        // → 距離永遠小、smoothness/maxStep 不會被 clamp、移動速度只由 setIdealTarget 控
        // 這裡用較大的 smoothness 確保能在 1-2 幀內跟上 tx 變化
        let smoothness = 0.50;
        let maxStep = 0.020;
        // 鏟球中：tx 不變、靠視覺 slide
        if (p._tackleVisualUntil && state.frame < p._tackleVisualUntil) {
          smoothness = 0.02;
          maxStep = 0.004;
        }
        smoothness *= flipEase;
        // 個人 speed 影響：80 為基準，95 快 19%、60 慢 25%（GK 不套）
        if (p.role !== 'GK' && p.stats?.speed) {
          const speedMult = p.stats.speed / 80;
          smoothness *= speedMult;
          maxStep    *= speedMult;
        }

        let stepX = (p.tx - p.x) * smoothness;
        let stepY = (p.ty - p.y) * smoothness;
        // 每幀最大位移 clamp — 即使 target 瞬間跳 0.5，每幀最多走 maxStep
        const stepMag = Math.hypot(stepX, stepY);
        if (stepMag > maxStep) {
          const r = maxStep / stepMag;
          stepX *= r; stepY *= r;
        }
        p.x += stepX; p.y += stepY;
        p.x = Math.max(0.01, Math.min(0.99, p.x));
        p.y = Math.max(0.04, Math.min(0.96, p.y));
      });
    }

    function moveBall() {
      if (state.phase === 'pass' || state.phase === 'shoot') {
        // 球飛直線到「起飛時鎖定的目標點」— 不再 homing 追接球者
        // → 接球者必須自己跑到目標點才能接到球，沒到就變散球
        state.ballTravelLeft--;
        const t = 1 - (state.ballTravelLeft / Math.max(1, state.ballTravelTotal));
        ball.x = state.ballFromX + (state.ballTargetX - state.ballFromX) * t;
        ball.y = state.ballFromY + (state.ballTargetY - state.ballFromY) * t;
        // 拋物線弧度
        ball.y -= 0.03 * (4 * t * (1 - t));
        if (state.ballTravelLeft <= 0) {
          if (state.phase === 'shoot') {
            resolveShot();
          } else {
            // pass 抵達：看誰最靠近球
            const newIdx = state.passTargetIdx;
            const target = newIdx != null ? players[newIdx] : null;
            const distToTarget = target
              ? Math.hypot(target.x - ball.x, target.y - ball.y)
              : Infinity;
            // 預期接球者離球 < 0.04 → 順利接到
            if (target && distToTarget < 0.04) {
              state.possessorIdx = newIdx;
              state.possession = target.team;
              state.phase = 'dribble';
              state.lastActionFrame = state.frame;
            } else {
              // 預期接球者不在 → 散球（任何最近球員都能撿）
              state.phase = 'loose';
              state.possessorIdx = -1;
              state.lastActionFrame = state.frame;
            }
          }
        }
      } else if (state.phase === 'loose') {
        // 散球：球停在原地（或微微滾），等最近的球員跑過來撿
        let nearest = null, nearestDist = Infinity;
        players.forEach((p, idx) => {
          const d = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (d < nearestDist) { nearestDist = d; nearest = { p, idx }; }
        });
        if (nearest && nearestDist < 0.025) {
          // 自然撿到球
          state.possessorIdx = nearest.idx;
          state.possession = nearest.p.team;
          state.phase = 'dribble';
          state.lastActionFrame = state.frame;
          state.recentPassers = [];
          state.recentPassersSet = new Set();
          state.possessionChangeFrame = state.frame;
        }
        // 散球期間球微微滾動阻力（不完全停住）
        // 已經被 moveBall 的 phase===pass 計算放下，這裡不做額外位移
      } else if (state.phase === 'dribble') {
        // 球跟著持球者
        const pos = players[state.possessorIdx];
        if (pos) {
          const goalX = pos.team === 'h' ? 1 : 0;
          const dirSign = goalX > pos.x ? 1 : -1;
          ball.x += (pos.x + dirSign * 0.012 - ball.x) * 0.35;
          ball.y += (pos.y - ball.y) * 0.35;
        }
      }
    }

    // 單幀邏輯（不含渲染，速度倍率會多次呼叫）
    function stepOneFrame() {
      if (state.pauseFrames > 0) {
        state.pauseFrames--;
        if (state.pauseFrames === 0 && state.phase === 'celebrate') {
          // 暫停結束：先收歡呼視覺、再 kickoff（kickoff 內會 snap 所有人回陣型）
          _endGoalCelebration(ui);
          kickoff(state.possession === 'h' ? 'a' : 'h');
        }
        // 進球暫停期間：所有東西凍結，讓球員在原地做歡呼/懊惱動作
        return;
      }

      // ── 個人狂熱模式：每球員氣場累積 gauge、滿了進個人狂熱 ──
      // 官方比賽（真實賽事模擬、朋友直播房）關閉狂熱 + 體力 — opts.disableTeamMechanics
      // gauge 跨場保存（opts.feverGauges in / opts.onFeverGaugeChange out）
      // 不一定要在 1 場內爆、累積夠了才釋放
      if (!opts.disableTeamMechanics) {
        const FEVER_DURATION = Math.round(FPS * 18);  // 18 秒（更長、影響更明顯）
        // base fill rate: 0.04 → 0.010（4× 慢）— 之前大家在 1 場內就全部爆、太頻繁
        const FEVER_BASE_FILL = 0.010;
        players.forEach((p, i) => {
          if (p.fever > 0) {
            p.fever--;
            if (p.fever === 0) {
              // 狂熱結束 → gauge 歸 0、cd 30 秒（比較難連發）
              p.feverGauge = 0;
              p.feverCooldown = Math.round(FPS * 30);
            }
          } else if (p.feverCooldown > 0) {
            p.feverCooldown--;
          } else {
            // 累積：aura 影響、但壓低指數（1.8 → 1.2）避免高氣場壓倒性快
            // 預期：aura 50 → 3 場才滿、aura 80 → 1.7 場、aura 99 → 1.3 場
            // 加上 1 場通常 1 進球 +35 + 1-2 抄球 +12 加成 → SSR 1 場底爆、R 要累積
            // 加入個人 _feverPersonality 變異（0.7~1.3、init 時隨機）避免大家同時爆
            const pAura = p.stats?.aura ?? 50;
            const auraSpeed = Math.pow(pAura / 50, 1.2);
            const personality = p._feverPersonality || 1;
            p.feverGauge = Math.min(100, (p.feverGauge || 0) + FEVER_BASE_FILL * auraSpeed * personality);
            if (p.feverGauge >= 100) {
              p.fever = FEVER_DURATION;
              p.feverShownAt = state.frame;
              if (typeof _triggerFeverBanner === 'function') {
                _triggerFeverBanner(ui, p.team, p.name || (p.team === 'h' ? '我方球員' : '對方球員'));
              }
              // 我方球員 → 把當前 gauge 狀態 push 給外層保存（跨場次）
              if (p.team === 'h' && typeof opts.onFeverGaugeChange === 'function') {
                opts.onFeverGaugeChange(p.card_id, 0);
              }
            }
          }
        });
      }

      const gameMin = (state.frame / TOTAL_FRAMES) * MATCH_MINUTES;
      const gameMinInt = Math.floor(gameMin);

      if (!state.halftimeDone && gameMinInt >= 45) {
        state.halftimeDone = true;
        state.pauseFrames = Math.round(FPS * HT_PAUSE_SEC);
        kickoff(rng() < hMidPoss ? 'a' : 'h');
      }

      if (state.phase === 'dribble') tickDribble();
      updatePlayerTargets();
      movePlayers();
      moveBall();
      state.frame++;
    }

    function updateHUD() {
      const remaining = Math.max(0, 1 - state.frame / TOTAL_FRAMES);
      const scoreDiff = state.score.h - state.score.a;
      const attackRatio = home.radar.attack / (home.radar.attack + away.radar.attack);
      const baseChance = attackRatio * 0.6 + 0.2;
      const scoreBoost = scoreDiff * 0.08 * (1 - remaining * 0.5);
      const hChance = Math.max(0.05, Math.min(0.95, baseChance + scoreBoost));
      ui.hChance.textContent = Math.round(hChance * 100) + '%';
      ui.aChance.textContent = Math.round((1 - hChance) * 100) + '%';

      const gameMin = (state.frame / TOTAL_FRAMES) * MATCH_MINUTES;
      const totalGameSec = Math.floor(gameMin * 60);
      const mm = String(Math.floor(totalGameSec / 60)).padStart(2, '0');
      const ss = String(totalGameSec % 60).padStart(2, '0');
      ui.time.textContent = `${mm}:${ss}`;
    }

    // ── 主 tick（fixed-timestep accumulator）─────────────────
    // 用 wall clock 累加而非 rAF 次數，避免 120Hz 螢幕跑兩倍速。
    // 60Hz 螢幕：~16.7ms 累一次 → 每 rAF 推 1 幀（同舊行為）
    // 120Hz 螢幕：~8.3ms 累一次 → 每 2 個 rAF 才推 1 幀（鎖到 60 步/秒）
    // 1x = 60 步/秒；2x = 120 步/秒；0.5x = 30 步/秒
    const STEP_INTERVAL_MS = 1000 / 60;
    let stepAccumulator = 0;
    let prevTickMs = 0;

    function tick(nowMs) {
      if (state.frame >= TOTAL_FRAMES) {
        // 進入「全場結束」階段：先排隊、走過去、然後慶祝/懊惱動畫
        if (state.phase !== 'fulltime' && state.phase !== 'ended') {
          state.phase = 'fulltime';
          state.fulltimeStart = performance.now();
          // 結算贏家
          const hScore = state.score.h, aScore = state.score.a;
          state.fulltimeWinner = hScore > aScore ? 'h' : aScore > hScore ? 'a' : 'd';
          // 收掉進球放大殘留
          if (typeof _endGoalCelebration === 'function') _endGoalCelebration(ui);
          // 觸發 in-canvas 全場結束 banner（球員排隊定格時跳出）
          if (typeof _triggerFulltimeBanner === 'function') {
            _triggerFulltimeBanner(ui, home, away, { h: hScore, a: aScore }, state.fulltimeWinner);
          }
          // 全部 22 人「直接 snap」排成一橫列（不用走過去）
          // home 在 x 0.04~0.46（中線以左）、away 在 x 0.54~0.96（中線以右）、y = 0.5
          const homeP = players.filter(p => p.team === 'h');
          const awayP = players.filter(p => p.team === 'a');
          const lineX = (idx, n, xStart, xEnd) =>
            xStart + idx * ((xEnd - xStart) / Math.max(1, n - 1));
          homeP.forEach((p, i) => {
            const px = lineX(i, homeP.length, 0.04, 0.46);
            p.x = px; p.tx = px;
            p.y = 0.50; p.ty = 0.50;
          });
          awayP.forEach((p, i) => {
            const px = lineX(i, awayP.length, 0.54, 0.96);
            p.x = px; p.tx = px;
            p.y = 0.50; p.ty = 0.50;
          });
          // 清掉 urgent / tackle 殘留
          players.forEach(p => { p._urgent = false; p._tackleVisualUntil = 0; });
          // 鏡頭拉回中央
          if (state.camera) {
            state.camera.x = (PITCH_W - VIEW_W) / 2;
            state.camera.y = (PITCH_H - VIEW_H) / 2;
          }
          // 球放回中圈
          ball.x = 0.5; ball.y = 0.5;
          state.possessorIdx = -1;
        }
        if (state.phase === 'fulltime') {
          // 球員已 snap 到排隊位置、不再移動 — 直接 render 慶祝/懊惱動畫
          // 3 秒後切到 ended、顯示 summary
          if (performance.now() - state.fulltimeStart > 3000) {
            state.phase = 'ended';
            showSummary();
            return;
          }
          render(ctx, state);
          requestAnimationFrame(tick);
          return;
        }
        return;
      }
      // 第一個 rAF 的 nowMs 拿來當基準（或瀏覽器某些情況不傳 → fallback performance.now）
      if (typeof nowMs !== 'number') nowMs = performance.now();
      if (!prevTickMs) prevTickMs = nowMs;

      let elapsed = nowMs - prevTickMs;
      prevTickMs = nowMs;
      // 上限保護：tab 在背景 → 回前景時不要瞬間衝幾百格
      if (elapsed > 100) elapsed = 100;

      stepAccumulator += elapsed * speedMult;
      let stepsTaken = 0;
      while (stepAccumulator >= STEP_INTERVAL_MS && state.frame < TOTAL_FRAMES) {
        stepOneFrame();
        stepAccumulator -= STEP_INTERVAL_MS;
        stepsTaken++;
      }

      updateHUD();
      render(ctx, state);
      state.flashAlpha = Math.max(0, state.flashAlpha - 0.04 * Math.max(1, stepsTaken));
      requestAnimationFrame(tick);
    }

    function showSummary() {
      ui.time.textContent = '全場';
      const { h, a } = state.stats;
      const winner = state.score.h > state.score.a ? home.nameCN
        : state.score.a > state.score.h ? away.nameCN
        : '平手';
      const winnerColor = state.score.h > state.score.a ? '#2196f3'
        : state.score.a > state.score.h ? '#e53935'
        : 'rgba(255,255,255,0.7)';
      ui.summary.style.display = 'block';
      const replayBtn = opts.hideReplay ? '' :
        `<button onclick="MatchSim.run('${matchId}')" style="margin-top:10px;padding:8px 18px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:12px;cursor:pointer">
          🔁 再跑一次
        </button>`;
      ui.summary.innerHTML = `
        <div style="font-size:14px;font-weight:800;color:${winnerColor};margin-bottom:6px">
          ${winner === '平手' ? '🤝 平手' : `🏆 ${winner} 勝`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:var(--text-muted)">
          <div>射正 ${h.shots}・關鍵傳球 ${h.passes}</div>
          <div style="text-align:right">射正 ${a.shots}・關鍵傳球 ${a.passes}</div>
          <div>進球 ${h.goals}</div>
          <div style="text-align:right">進球 ${a.goals}</div>
        </div>
        ${replayBtn}
        <div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.35)">
          模擬只計「威脅事件」(shots on target + key passes)，不是真實總傳球
        </div>
      `;
      // 朋友直播房用：sim 跑完通知外層算結果
      if (typeof opts.onEnd === 'function') {
        // 收集所有 home 球員的最終 fever gauge（傳給外層保存到 DB）
        const finalGauges = {};
        players.filter(p => p.team === 'h').forEach(p => {
          if (p.card_id) finalGauges[p.card_id] = Number((p.feverGauge || 0).toFixed(2));
        });
        try { opts.onEnd({ h: state.score.h, a: state.score.a, finalGauges }); } catch (e) { console.warn('[MatchSim] onEnd threw', e); }
      }
    }

    // 開球
    kickoff(rng() < hMidPoss ? 'h' : 'a');
    tick();
  }

  // ── 公開 API ────────────────────────────────────────────
  window.MatchSim = {
    // opts.seed: 給朋友直播房用的 seed，相同 seed 產出完全相同的比賽
    run(matchId, opts = {}) {
      // 從賽程資料庫跑的官方比賽 — 預設關閉狂熱 + 體力（真實比賽不該有遊戲機制）
      if (opts.disableTeamMechanics === undefined) opts.disableTeamMechanics = true;
      const containerId = `sim-wrap-${matchId}`;
      const container = document.getElementById(containerId);
      if (!container) { console.warn('[MatchSim] container not found:', containerId); return; }

      // WC 的 SCHEDULE / TEAMS 是 var / const 宣告，不一定會附到 window 上，
      // 需要用 typeof 檢查 fallback，不能只靠 window.SCHEDULE / window.TEAMS
      const isEPL = window.Tournament?.isEPL?.();
      const isUCL = window.Tournament?.isUCL?.();
      const schedule = isEPL ? (window.EPL_MATCHES || [])
        : isUCL ? (window.UCL_MATCHES || [])
        : (typeof SCHEDULE !== 'undefined' ? SCHEDULE : []);
      const m = schedule.find(x => x.id === matchId);
      if (!m) { console.warn('[MatchSim] match not found:', matchId); return; }
      const T = isEPL ? (window.EPL_TEAMS || {})
        : isUCL ? (window.UCL_TEAMS || {})
        : (typeof TEAMS !== 'undefined' ? TEAMS : {});
      const home = T[m.home];
      const away = T[m.away];
      if (!home || !away || !home.radar || !away.radar) {
        container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 此比賽缺少數據，無法模擬</div>';
        return;
      }

      runSim(container, home, away, matchId, opts);
    },

    // 朋友直播房用：直接給 container + 隊伍資料 + opts，不走 schedule lookup
    // opts: { seed, onEnd(score), hideReplay, matchId? }
    runDirect(container, home, away, opts = {}) {
      if (!container) { console.warn('[MatchSim] runDirect: no container'); return; }
      if (!home || !away || !home.radar || !away.radar) {
        if (container) container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 此比賽缺少數據，無法模擬</div>';
        return;
      }
      runSim(container, home, away, opts.matchId || 'fr-direct', opts);
    }
  };
})();
