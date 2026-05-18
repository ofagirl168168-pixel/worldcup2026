/**
 * LPC Portrait Renderer
 *
 * 取 look_data → 合成 portrait dataURL（卡片用 32×40 source、4× → 128×160）
 * 比賽走路用：renderLpcWalkSprite (TODO)
 *
 * 用法：
 *   const url = await window.LpcRenderer.portrait(lookData);
 *   imgEl.src = url;
 *
 * Look data 例：
 *   { body:'olive', eye_color:'brown', hair_style:'spiked', hair_color:'black',
 *     beard_style:'5oclock_shadow', beard_color:'black',
 *     mustache_style:'none', wrinkles:'none' }
 */
(function () {
  'use strict';

  const BASE = 'img/lpc-layers';
  const imgCache = new Map();   // url → Promise<HTMLImageElement>
  const portraitCache = new Map(); // JSON.stringify(look) → dataURL

  function loadImg(url) {
    if (imgCache.has(url)) return imgCache.get(url);
    const p = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('load fail: ' + url));
      im.src = url;
    });
    imgCache.set(url, p);
    return p;
  }

  async function getLayer(category, name) {
    return await loadImg(`${BASE}/${category}/${name}.png`);
  }

  async function getLayerSafe(category, name) {
    try { return await getLayer(category, name); }
    catch (e) { console.warn('LPC layer missing:', category, name); return null; }
  }

  // 依 look 取得 portrait 用的所有層（含 null 表示不畫）
  // 順序：body → head → wrinkles → eyes → eyebrows → beard → mustache → hair → headband
  async function getLayers(look) {
    const tasks = [
      getLayer('body', look.body),
      getLayer('head', look.body),
      look.wrinkles === 'on' ? getLayerSafe('wrinkles', look.body) : null,
      getLayer('eyes', look.eye_color),
      look.eyebrow_style && look.eyebrow_style !== 'none'
        ? getLayerSafe('eyebrows', `${look.eyebrow_style}-${look.eyebrow_color || look.hair_color}`) : null,
      look.beard_style && look.beard_style !== 'none'
        ? getLayerSafe('beard', `${look.beard_style}-${look.beard_color}`) : null,
      look.mustache_style && look.mustache_style !== 'none'
        ? getLayerSafe('mustache', `${look.mustache_style}-${look.beard_color}`) : null,
      look.hair_style && look.hair_style !== 'bald'
        ? getLayerSafe('hair', `${look.hair_style}-${look.hair_color}`) : null,
      look.headband_color && look.headband_color !== 'none'
        ? getLayerSafe('headband', look.headband_color) : null,
    ];
    return await Promise.all(tasks);
  }

  // 卡片頭像 — 取 walk-down idle frame、SY=640+4, SH=40 = 頭+軀幹
  // 可選 kit: { shirtColor, pantsColor, shoeColor }（穿球衣時用）
  async function portrait(look, opts = {}) {
    if (!look || !look.body) return '';
    const kit = opts.kit;
    const key = JSON.stringify(look) + (kit ? '|K|' + kit.shirtColor + '|' + kit.pantsColor : '');
    if (portraitCache.has(key)) return portraitCache.get(key);

    const SCALE = opts.scale || 4;
    const SX = 16, SY = 640 + 4, SW = 32, SH = 40;
    const W = SW * SCALE, H = SH * SCALE;

    const [body, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband] = await getLayers(look);
    let shirt = null, pants = null;
    if (kit) {
      [shirt, pants] = await Promise.all([
        getLayerSafe('shirt', `shortsleeve-${kit.shirtColor || 'red'}`),
        getLayerSafe('pants', kit.pantsColor || 'white'),
      ]);
    }

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // 順序：body → pants → shirt → head → wrinkles → eyes → eyebrows → beard → mustache → hair → headband
    for (const layer of [body, pants, shirt, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband]) {
      if (layer) ctx.drawImage(layer, SX, SY, SW, SH, 0, 0, W, H);
    }
    const url = cv.toDataURL('image/png');
    portraitCache.set(key, url);
    return url;
  }

  // 比賽走路 sprite — 4 方向 × 3 frames、回傳 canvas（用於 match-sim chibi）
  // Sheet layout: 4 rows (down/left/right/up) × 3 cols (frames 1,4,7)
  // 每 frame 32 wide × 40 tall = 96 × 160 sheet
  // 還會加 player 衣服/球鞋（match 場景需要看到球員 kit）
  const matchSheetCache = new Map();

  async function matchSpriteSheet(look, opts = {}) {
    if (!look || !look.body) return null;
    // kit 屬於 instance 而非 look_data — 用 opts 傳
    const kitShirt = opts.shirtColor || 'red';
    const kitPants = opts.pantsColor || 'blue';
    const kitShoes = opts.shoeColor || 'white';
    const key = JSON.stringify(look) + '|' + kitShirt + '|' + kitPants + '|' + kitShoes;
    if (matchSheetCache.has(key)) return matchSheetCache.get(key);

    const FRAME_W = 32, FRAME_H = 40;
    const FRAME_COLS = 3;       // walk frames 1, 4, 7
    const FRAME_ROWS = 4;       // up / left / right / down
    // LPC sheet rows: 8=up, 9=left, 10=down, 11=right
    // 我們 sprite sheet 順序：0=down, 1=left, 2=right, 3=up（跟 match-sim PIPOYA 一致）
    const ROW_TO_LPC_Y = [10*64, 9*64, 11*64, 8*64];  // down, left, right, up
    const FRAMES_TO_USE = [1, 4, 7];

    // 載入 layers（含 kit + eyebrows + headband）
    const SX = 16, SY_OFF = 4;
    const [body, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband, shirt, pants, shoes] = await Promise.all([
      getLayer('body', look.body),
      getLayer('head', look.body),
      look.wrinkles === 'on' ? getLayerSafe('wrinkles', look.body) : null,
      getLayer('eyes', look.eye_color),
      look.eyebrow_style && look.eyebrow_style !== 'none'
        ? getLayerSafe('eyebrows', `${look.eyebrow_style}-${look.eyebrow_color || look.hair_color}`) : null,
      look.beard_style && look.beard_style !== 'none'
        ? getLayerSafe('beard', `${look.beard_style}-${look.beard_color}`) : null,
      look.mustache_style && look.mustache_style !== 'none'
        ? getLayerSafe('mustache', `${look.mustache_style}-${look.beard_color}`) : null,
      look.hair_style && look.hair_style !== 'bald'
        ? getLayerSafe('hair', `${look.hair_style}-${look.hair_color}`) : null,
      look.headband_color && look.headband_color !== 'none'
        ? getLayerSafe('headband', look.headband_color) : null,
      getLayerSafe('shirt', `shortsleeve-${kitShirt}`),
      getLayerSafe('pants', kitPants),
      kitShoes !== 'none' ? getLayerSafe('shoes-flat', kitShoes) : null,
    ]);

    const cv = document.createElement('canvas');
    cv.width = FRAME_W * FRAME_COLS;
    cv.height = FRAME_H * FRAME_ROWS;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < FRAME_ROWS; row++) {
      const lpcY = ROW_TO_LPC_Y[row];
      for (let col = 0; col < FRAME_COLS; col++) {
        const lpcFrame = FRAMES_TO_USE[col];
        const srcX = lpcFrame * 64 + SX;
        const srcY = lpcY + SY_OFF;
        const dx = col * FRAME_W;
        const dy = row * FRAME_H;
        // 圖層順序：body → pants → shirt → shoes → head → wrinkles → eyes → eyebrows → beard → mustache → hair → headband
        for (const layer of [body, pants, shirt, shoes, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband]) {
          if (layer) ctx.drawImage(layer, srcX, srcY, FRAME_W, FRAME_H, dx, dy, FRAME_W, FRAME_H);
        }
      }
    }
    const result = { canvas: cv, frameW: FRAME_W, frameH: FRAME_H, cols: FRAME_COLS, rows: FRAME_ROWS };
    matchSheetCache.set(key, result);
    return result;
  }

  // ── 從 player（含 card join）取 look_data：實體優先、否則 fallback 卡池 ──
  function resolveLook(player) {
    if (!player) return null;
    if (player.look_data) return player.look_data;
    if (player.card && player.card.look_data) return player.card.look_data;
    return null;
  }

  // ── 主頁用：全身（含腳） 4 方向 × 3 frames sprite sheet ──
  // 跟 matchSpriteSheet 差別在 SH=60、含腳 + 比賽用 kit
  const fullBodyCache = new Map();

  async function walkingFullBody(look, opts = {}) {
    if (!look || !look.body) return null;
    const kitShirt = opts.shirtColor || 'red';
    const kitPants = opts.pantsColor || 'blue';
    const kitShoes = opts.shoeColor || 'white';
    // v5 = combat-idle row y 從 22 (up 背面) 改 24 (down 正面)、frames 改 [0,0,0] 靜止
    const key = JSON.stringify(look) + '|F|v5|' + kitShirt + '|' + kitPants + '|' + kitShoes;
    if (fullBodyCache.has(key)) return fullBodyCache.get(key);

    // 寬一點才裝得下 slash 揮腿、spellcast 舉手張開的手臂
    const FRAME_W = 48, FRAME_H = 64;
    const FRAME_COLS = 3, FRAME_ROWS = 10;
    // row 順序：0=walk-down, 1=walk-left, 2=walk-right, 3=walk-up,
    //          4=kick(slash-down), 5=cheer/stretch(spellcast-down),
    //          6=frustration(hurt 1-3), 7=tackle/slide(thrust-right 伸腿鏟球),
    //          8=GK dive(slash-up frames 2-3-4、手舉過頭、近似 1h_halfslash),
    //          9=combat-idle-down（正面戰備站立、靜止單幀）
    // LPC y 行：walk=8/9/10/11、slash=12-15、spellcast=0-3、hurt=20、thrust=4-7
    //   combat-idle=22(up背面)/23(left)/24(down正面)/25(right)：要正面用 24
    const ROW_TO_LPC_Y = [10*64, 9*64, 11*64, 8*64, 14*64, 2*64, 20*64, 7*64, 12*64, 24*64];
    const ROW_FRAMES = [
      [1, 4, 7],  // walk-down
      [1, 4, 7],
      [1, 4, 7],
      [1, 4, 7],
      [2, 4, 5],  // kick：slash-down 揮腿
      [1, 3, 5],  // cheer：spellcast-down 舉手
      [1, 2, 3],  // frustration：hurt 站不穩
      [3, 5, 7],  // tackle：thrust-right 伸腿撲擊
      [2, 3, 4],  // GK dive：slash-up 234（手舉肩→過頭頂→開始下揮、apex 過頭頂）
      [0, 0, 0],  // combat-idle-down：靜止單幀（不晃）、3 col 都用 frame 0
    ];

    const SX = 8, SY_OFF = 0;  // 寬 8-55、高 0-63 整個 frame、手臂 + 頂部頭髮都裝得下
    const [body, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband, shirt, pants, shoes] = await Promise.all([
      getLayer('body', look.body),
      getLayer('head', look.body),
      look.wrinkles === 'on' ? getLayerSafe('wrinkles', look.body) : null,
      getLayer('eyes', look.eye_color),
      look.eyebrow_style && look.eyebrow_style !== 'none'
        ? getLayerSafe('eyebrows', `${look.eyebrow_style}-${look.eyebrow_color || look.hair_color}`) : null,
      look.beard_style && look.beard_style !== 'none'
        ? getLayerSafe('beard', `${look.beard_style}-${look.beard_color}`) : null,
      look.mustache_style && look.mustache_style !== 'none'
        ? getLayerSafe('mustache', `${look.mustache_style}-${look.beard_color}`) : null,
      look.hair_style && look.hair_style !== 'bald'
        ? getLayerSafe('hair', `${look.hair_style}-${look.hair_color}`) : null,
      look.headband_color && look.headband_color !== 'none'
        ? getLayerSafe('headband', look.headband_color) : null,
      getLayerSafe('shirt', `shortsleeve-${kitShirt}`),
      getLayerSafe('pants', kitPants),
      kitShoes !== 'none' ? getLayerSafe('shoes-flat', kitShoes) : null,
    ]);

    const cv = document.createElement('canvas');
    cv.width = FRAME_W * FRAME_COLS;
    cv.height = FRAME_H * FRAME_ROWS;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 部分 LPC layer 是舊 21-row 版本（沒 climb 之後的 row、包括 combat-idle）
    // 該 layer 在缺 row 上時 fallback 到 walk-down 站立幀（lpcY=10*64, lpcFrame=4）
    // 這樣對手不會變光頭沒衣服、頂多 idle 上半身姿勢稍微不貼合 body
    const FALLBACK_LPC_Y = 10 * 64;
    const FALLBACK_LPC_FRAME = 4;
    for (let row = 0; row < FRAME_ROWS; row++) {
      const lpcY = ROW_TO_LPC_Y[row];
      const frames = ROW_FRAMES[row];
      for (let col = 0; col < FRAME_COLS; col++) {
        const lpcFrame = frames[col];
        const srcX = lpcFrame * 64 + SX;
        const srcY = lpcY + SY_OFF;
        const dx = col * FRAME_W;
        const dy = row * FRAME_H;
        for (const layer of [body, pants, shirt, shoes, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband]) {
          if (!layer) continue;
          let ux = srcX, uy = srcY;
          if (uy + FRAME_H > layer.naturalHeight) {
            uy = FALLBACK_LPC_Y + SY_OFF;
            ux = FALLBACK_LPC_FRAME * 64 + SX;
          }
          ctx.drawImage(layer, ux, uy, FRAME_W, FRAME_H, dx, dy, FRAME_W, FRAME_H);
        }
      }
    }
    const result = { canvas: cv, frameW: FRAME_W, frameH: FRAME_H, cols: FRAME_COLS, rows: FRAME_ROWS };
    fullBodyCache.set(key, result);
    return result;
  }

  // ── public API ──
  window.LpcRenderer = {
    portrait,             // (look, {scale}?) → Promise<dataURL>
    matchSpriteSheet,     // (look, {shirtColor,pantsColor,shoeColor}?) → Promise<{canvas, frameW, frameH, cols, rows}>
    walkingFullBody,      // 主頁全身 sheet 同 schema
    resolveLook,          // (player) → look_data | null
  };
})();
