/**
 * 球隊隊徽 SVG 庫
 *
 * 用法：
 *   const svg = window.TeamCrests.getSvg('shield_star', '#c0392b', '#f1c40f');
 *   imgEl.outerHTML = svg;
 *
 *   // 或拿 dataURL：
 *   const url = window.TeamCrests.getDataUrl('shield_star', '#c0392b', '#f1c40f');
 *
 * Crest 設計：所有圖形用主色 + 強調色（盾的金邊、星星等）
 */
(function () {
  'use strict';

  // 每個 crest 是一個 function (primary, accent) → SVG string
  const CRESTS = {
    // 1. 經典盾形 + 三條斜紋
    shield_stripes: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 5 L 90 18 L 90 50 Q 90 78 50 95 Q 10 78 10 50 L 10 18 Z" fill="${p}" stroke="${a}" stroke-width="3"/>
      <path d="M 25 25 L 75 25 L 60 45 L 35 45 Z" fill="${a}" opacity="0.8"/>
      <path d="M 30 50 L 70 50 L 55 70 L 40 70 Z" fill="${a}" opacity="0.6"/>
      <circle cx="50" cy="80" r="5" fill="${a}"/>
    </svg>`,

    // 2. 雙獅徽（雄獅相對）
    twin_lions: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 5 L 90 18 L 90 55 Q 90 82 50 95 Q 10 82 10 55 L 10 18 Z" fill="${p}" stroke="${a}" stroke-width="3"/>
      <!-- 簡化雙獅輪廓（左右對稱）-->
      <path d="M 25 40 Q 28 32 35 32 L 45 38 L 48 50 L 45 60 L 35 65 Q 25 60 25 50 Z" fill="${a}"/>
      <path d="M 75 40 Q 72 32 65 32 L 55 38 L 52 50 L 55 60 L 65 65 Q 75 60 75 50 Z" fill="${a}"/>
      <circle cx="38" cy="40" r="1.5" fill="${p}"/>
      <circle cx="62" cy="40" r="1.5" fill="${p}"/>
      <path d="M 45 75 L 55 75 L 53 85 L 47 85 Z" fill="${a}"/>
    </svg>`,

    // 3. 飛鷹展翅
    eagle: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="${p}" stroke="${a}" stroke-width="3"/>
      <!-- 鷹身 + 翅膀 -->
      <path d="M 50 25 L 55 38 L 50 40 L 45 38 Z" fill="${a}"/>
      <path d="M 50 38 Q 25 42 18 55 Q 30 50 50 55 Z" fill="${a}"/>
      <path d="M 50 38 Q 75 42 82 55 Q 70 50 50 55 Z" fill="${a}"/>
      <path d="M 45 55 L 55 55 L 53 75 L 47 75 Z" fill="${a}"/>
      <path d="M 48 75 L 52 75 L 50 82 Z" fill="${a}"/>
    </svg>`,

    // 4. 皇冠
    crown: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 5 L 90 18 L 90 50 Q 90 78 50 95 Q 10 78 10 50 L 10 18 Z" fill="${p}" stroke="${a}" stroke-width="3"/>
      <path d="M 25 35 L 30 55 L 35 40 L 40 60 L 50 45 L 60 60 L 65 40 L 70 55 L 75 35 L 78 70 L 22 70 Z" fill="${a}"/>
      <circle cx="25" cy="35" r="3" fill="${a}"/>
      <circle cx="50" cy="45" r="3" fill="${a}"/>
      <circle cx="75" cy="35" r="3" fill="${a}"/>
    </svg>`,

    // 5. 五角星爆
    starburst: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="${p}" stroke="${a}" stroke-width="3"/>
      <polygon points="50,15 58,38 82,38 63,52 70,75 50,61 30,75 37,52 18,38 42,38"
        fill="${a}" stroke="${a}" stroke-width="1"/>
    </svg>`,

    // 6. 交叉劍
    swords: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 5 L 90 18 L 90 50 Q 90 78 50 95 Q 10 78 10 50 L 10 18 Z" fill="${p}" stroke="${a}" stroke-width="3"/>
      <path d="M 22 22 L 75 75 M 75 22 L 22 75" stroke="${a}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="22" cy="22" r="5" fill="${a}"/>
      <circle cx="75" cy="22" r="5" fill="${a}"/>
      <path d="M 22 75 L 30 70 L 22 65 L 14 70 Z" fill="${a}"/>
      <path d="M 75 75 L 83 70 L 75 65 L 67 70 Z" fill="${a}"/>
    </svg>`,

    // 7. 海浪/船錨
    anchor: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="${p}" stroke="${a}" stroke-width="3"/>
      <circle cx="50" cy="25" r="6" fill="none" stroke="${a}" stroke-width="3"/>
      <line x1="50" y1="31" x2="50" y2="75" stroke="${a}" stroke-width="4"/>
      <line x1="38" y1="42" x2="62" y2="42" stroke="${a}" stroke-width="4"/>
      <path d="M 25 65 Q 25 80 50 80 Q 75 80 75 65" stroke="${a}" stroke-width="4" fill="none"/>
      <path d="M 25 65 L 20 60 M 75 65 L 80 60" stroke="${a}" stroke-width="4"/>
    </svg>`,

    // 8. 雷霆閃電
    lightning: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 5 L 90 18 L 90 50 Q 90 78 50 95 Q 10 78 10 50 L 10 18 Z" fill="${p}" stroke="${a}" stroke-width="3"/>
      <path d="M 55 20 L 30 55 L 45 55 L 38 80 L 70 40 L 55 40 Z" fill="${a}"/>
    </svg>`,

    // 9. 雙圓圈（足球暗示）
    football: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="${p}" stroke="${a}" stroke-width="3"/>
      <circle cx="50" cy="50" r="28" fill="none" stroke="${a}" stroke-width="3"/>
      <polygon points="50,30 58,42 56,55 44,55 42,42" fill="${a}"/>
      <line x1="50" y1="30" x2="50" y2="22" stroke="${a}" stroke-width="2"/>
      <line x1="58" y1="42" x2="64" y2="38" stroke="${a}" stroke-width="2"/>
      <line x1="42" y1="42" x2="36" y2="38" stroke="${a}" stroke-width="2"/>
      <line x1="44" y1="55" x2="40" y2="62" stroke="${a}" stroke-width="2"/>
      <line x1="56" y1="55" x2="60" y2="62" stroke="${a}" stroke-width="2"/>
    </svg>`,

    // 10. 山形紋
    mountain: (p, a) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M 50 5 L 90 18 L 90 50 Q 90 78 50 95 Q 10 78 10 50 L 10 18 Z" fill="${p}" stroke="${a}" stroke-width="3"/>
      <path d="M 15 70 L 35 35 L 50 55 L 65 30 L 85 70 Z" fill="${a}"/>
      <circle cx="72" cy="25" r="4" fill="${a}"/>
    </svg>`,
  };

  // 預設色組合：給快速 picker 用
  const PRESET_COLOR_COMBOS = [
    ['#c0392b', '#f1c40f'],   // 紅金（曼聯式）
    ['#2980b9', '#ffffff'],   // 藍白（切爾西式）
    ['#1abc9c', '#ffffff'],   // 青綠
    ['#9b59b6', '#f1c40f'],   // 紫金
    ['#e67e22', '#34495e'],   // 橘黑
    ['#27ae60', '#ffffff'],   // 純綠
    ['#34495e', '#e74c3c'],   // 深藍紅（國米）
    ['#f39c12', '#34495e'],   // 黃藍
    ['#16a085', '#ecf0f1'],   // 海綠白
    ['#7f8c8d', '#f1c40f'],   // 灰金
  ];

  function getSvg(crestId, primary, accent) {
    const fn = CRESTS[crestId] || CRESTS.shield_stripes;
    return fn(primary || '#c0392b', accent || '#f1c40f');
  }

  function getDataUrl(crestId, primary, accent) {
    const svg = getSvg(crestId, primary, accent);
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function listCrests() {
    return Object.keys(CRESTS);
  }

  window.TeamCrests = { getSvg, getDataUrl, listCrests, PRESET_COLOR_COMBOS };
})();
