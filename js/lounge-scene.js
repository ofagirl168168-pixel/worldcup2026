/**
 * lounge-scene.js — Kenney roguelike-indoors 像素風休息室渲染
 *
 * 使用 Kenney CC0 Roguelike Indoors tileset (16×16 tiles, 1px margin)
 * 對外：window.LoungeScene.render(container, opts)
 *   opts.captainSprite: LPC walking sheet { canvas, frameW, frameH } 或 null
 *   opts.onHotspotClick: (id) => void  // 'gacha' | 'train' | 'match' 等
 */
(function () {
  'use strict';

  const SHEET_URL = 'img/kenney/roguelike-indoors/roguelikeIndoor_transparent.png';
  const TILE = 16;
  const MARGIN = 1;
  const STRIDE = TILE + MARGIN;

  // 場景網格大小（依 modal 寬度自適應）
  const COLS = 16;
  const ROWS = 11;
  const SCALE = 2;   // 16×16 → 32×32 顯示
  const CW = COLS * TILE * SCALE;
  const CH = ROWS * TILE * SCALE;

  // ── tile 座標表（依 Kenney roguelikeIndoor_transparent 的網格位置） ──
  // 註：tile id = (col, row) on the tilesheet
  // 我用人話命名、用時透過 TILE.xxx 查
  const T = {
    // 木地板（4 種變化、可隨機交錯）
    FLOOR_A: [0, 0],      // 主深色木紋
    FLOOR_B: [1, 0],
    FLOOR_C: [2, 0],
    FLOOR_D: [3, 0],
    // 牆（後排上邊 + 角落）
    WALL_TOP_L: [10, 0],
    WALL_TOP:   [11, 0],
    WALL_TOP_R: [12, 0],
    WALL_L:     [10, 1],
    WALL_R:     [12, 1],
    WALL_BTM_L: [10, 2],
    WALL_BTM_R: [12, 2],
    // 家具（暫定座標、需要實機調整）
    SOFA_H_L:   [4, 7],   // 沙發（橫向、左半）
    SOFA_H_R:   [5, 7],   // 沙發（橫向、右半）
    PIANO_L:    [6, 9],   // 鋼琴
    PIANO_R:    [7, 9],
    TABLE:      [12, 6],
    CHAIR_L:    [11, 6],
    CHAIR_R:    [13, 6],
    PLANT:      [18, 3],
    LAMP:       [20, 4],
    BOOKSHELF:  [22, 7],
    RUG_TL:     [14, 9],
    RUG_TR:     [15, 9],
    RUG_BL:     [14, 10],
    RUG_BR:     [15, 10],
    DOOR:       [24, 10],
    BED_H_L:    [0, 4],
    BED_H_R:    [1, 4],
  };

  // ── 場景配置：每個 tile 放什麼 ──
  // 格式：[col, row, T.XXX]  ; 或 [col, row, [tx, ty]] 直接指定座標
  // 也可以 [col, row, T.XXX, { hotspot: 'gacha' }] 標互動點
  function buildLayout() {
    const tiles = [];
    // ① 全鋪地板（隨機選 4 種變化）
    for (let r = 1; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const variants = [T.FLOOR_A, T.FLOOR_B, T.FLOOR_C, T.FLOOR_D];
        const v = variants[(c * 7 + r * 13) % variants.length];
        tiles.push({ col: c, row: r, tile: v });
      }
    }
    // ② 上方牆（row 0）
    tiles.push({ col: 0, row: 0, tile: T.WALL_TOP_L });
    for (let c = 1; c < COLS - 1; c++) {
      tiles.push({ col: c, row: 0, tile: T.WALL_TOP });
    }
    tiles.push({ col: COLS - 1, row: 0, tile: T.WALL_TOP_R });

    // ③ 家具擺設
    // 鋼琴（左上、佔 2 格）
    tiles.push({ col: 2, row: 1, tile: T.PIANO_L });
    tiles.push({ col: 3, row: 1, tile: T.PIANO_R });
    // 沙發（中央偏下、佔 2 格）— 點擊 = 進球員列表
    tiles.push({ col: 6, row: 6, tile: T.SOFA_H_L, hotspot: { id: 'roster', label: '球員' } });
    tiles.push({ col: 7, row: 6, tile: T.SOFA_H_R });
    // 桌椅
    tiles.push({ col: 9, row: 6, tile: T.CHAIR_L });
    tiles.push({ col: 10, row: 6, tile: T.TABLE });
    tiles.push({ col: 11, row: 6, tile: T.CHAIR_R });
    // 床（右上、佔 2 格）— 點擊 = 看比賽
    tiles.push({ col: 12, row: 1, tile: T.BED_H_L, hotspot: { id: 'match', label: '比賽' } });
    tiles.push({ col: 13, row: 1, tile: T.BED_H_R });
    // 書櫃 — 點擊 = 圖鑑
    tiles.push({ col: 0, row: 5, tile: T.BOOKSHELF, hotspot: { id: 'gallery', label: '圖鑑' } });
    // 植物
    tiles.push({ col: 0, row: 1, tile: T.PLANT });
    tiles.push({ col: COLS - 2, row: 8, tile: T.PLANT });
    // 燈
    tiles.push({ col: 5, row: 1, tile: T.LAMP });
    // 地毯（中央 2×2）
    tiles.push({ col: 7, row: 8, tile: T.RUG_TL });
    tiles.push({ col: 8, row: 8, tile: T.RUG_TR });
    tiles.push({ col: 7, row: 9, tile: T.RUG_BL });
    tiles.push({ col: 8, row: 9, tile: T.RUG_BR });
    // 門 — 點擊 = 抽卡
    tiles.push({ col: COLS - 1, row: ROWS - 2, tile: T.DOOR, hotspot: { id: 'gacha', label: '抽卡' } });

    return tiles;
  }

  let _sheetImg = null;
  function loadSheet() {
    if (_sheetImg) return Promise.resolve(_sheetImg);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { _sheetImg = img; resolve(img); };
      img.onerror = () => reject(new Error('failed to load Kenney sheet'));
      img.src = SHEET_URL;
    });
  }

  function drawTile(ctx, sheet, col, row, tile) {
    if (!tile) return;
    const [tx, ty] = tile;
    const sx = tx * STRIDE;
    const sy = ty * STRIDE;
    const dx = col * TILE * SCALE;
    const dy = row * TILE * SCALE;
    ctx.drawImage(sheet, sx, sy, TILE, TILE, dx, dy, TILE * SCALE, TILE * SCALE);
  }

  async function render(container, opts = {}) {
    if (!container) return;
    container.innerHTML = `
      <div class="lounge-wrap" style="width:100%;display:flex;justify-content:center">
        <div class="lounge-canvas-wrap" style="position:relative;width:${CW}px;max-width:100%;aspect-ratio:${CW}/${CH}">
          <canvas class="lounge-canvas" width="${CW}" height="${CH}" style="width:100%;height:100%;image-rendering:pixelated;display:block;border-radius:8px"></canvas>
          <div class="lounge-overlay" style="position:absolute;inset:0"></div>
        </div>
      </div>
    `;
    const canvas = container.querySelector('.lounge-canvas');
    const overlay = container.querySelector('.lounge-overlay');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const sheet = await loadSheet();
    const layout = buildLayout();

    // 排序：依 row 從上到下繪製、確保前景蓋住後景
    layout.sort((a, b) => a.row - b.row);
    layout.forEach(({ col, row, tile }) => drawTile(ctx, sheet, col, row, tile));

    // 隊長 chibi（LPC sprite）放在地毯中央
    const captainCol = 7.5;  // 兩 tile 中間
    const captainRow = 8;
    if (opts.captainSprite) {
      const { canvas: spriteCanvas, frameW, frameH } = opts.captainSprite;
      // 取 row 0 (down) frame 1 (idle)
      const sx = 1 * frameW, sy = 0 * frameH;
      const dw = TILE * SCALE * 1.6;
      const dh = dw * (frameH / frameW);
      const dx = captainCol * TILE * SCALE - dw / 2;
      const dy = (captainRow - 0.3) * TILE * SCALE - dh / 2;
      ctx.drawImage(spriteCanvas, sx, sy, frameW, frameH, dx, dy, dw, dh);
    }

    // 互動點（標籤 + 點擊區域）
    layout.filter(t => t.hotspot).forEach(t => {
      const hot = document.createElement('button');
      hot.className = 'lounge-hotspot';
      hot.style.cssText = `
        position: absolute;
        left: ${(t.col / COLS) * 100}%;
        top: ${(t.row / ROWS) * 100}%;
        width: ${(1 / COLS) * 100}%;
        height: ${(1 / ROWS) * 100}%;
        background: rgba(255,213,74,0);
        border: none;
        cursor: pointer;
        transition: background 0.15s;
      `;
      const label = document.createElement('div');
      label.textContent = t.hotspot.label;
      label.style.cssText = `
        position: absolute;
        left: 50%; top: -22px;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: #ffe680;
        font-size: 11px;
        font-weight: 900;
        padding: 2px 8px;
        border-radius: 999px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s;
        box-shadow: 0 2px 6px rgba(0,0,0,0.6);
      `;
      hot.appendChild(label);
      hot.addEventListener('mouseenter', () => {
        hot.style.background = 'rgba(255,213,74,0.3)';
        label.style.opacity = '1';
      });
      hot.addEventListener('mouseleave', () => {
        hot.style.background = 'rgba(255,213,74,0)';
        label.style.opacity = '0';
      });
      hot.addEventListener('click', () => {
        if (typeof opts.onHotspotClick === 'function') opts.onHotspotClick(t.hotspot.id);
      });
      overlay.appendChild(hot);
    });
  }

  window.LoungeScene = { render };
})();
