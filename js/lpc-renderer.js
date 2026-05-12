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
  async function portrait(look, opts = {}) {
    if (!look || !look.body) return ''; // 沒 look_data 時返回空
    const key = JSON.stringify(look);
    if (portraitCache.has(key)) return portraitCache.get(key);

    const SCALE = opts.scale || 4;
    const SX = 16, SY = 640 + 4, SW = 32, SH = 40;
    const W = SW * SCALE, H = SH * SCALE;

    const [body, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband] = await getLayers(look);

    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // 順序：body → head → wrinkles → eyes → eyebrows → beard → mustache → hair → headband
    for (const layer of [body, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband]) {
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
    const key = JSON.stringify(look) + '|F|' + kitShirt + '|' + kitPants + '|' + kitShoes;
    if (fullBodyCache.has(key)) return fullBodyCache.get(key);

    const FRAME_W = 32, FRAME_H = 60;
    const FRAME_COLS = 3, FRAME_ROWS = 4;
    // 方向順序：0=down, 1=left, 2=right, 3=up
    const ROW_TO_LPC_Y = [10*64, 9*64, 11*64, 8*64];
    const FRAMES_TO_USE = [1, 4, 7];

    const SX = 16, SY_OFF = 4;  // frame y=4 to y=64 = 60 高（含腳）
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
        for (const layer of [body, pants, shirt, shoes, head, wrinkles, eyes, eyebrows, beard, mustache, hair, headband]) {
          if (layer) ctx.drawImage(layer, srcX, srcY, FRAME_W, FRAME_H, dx, dy, FRAME_W, FRAME_H);
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
