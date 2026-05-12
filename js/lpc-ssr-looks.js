/**
 * 30 SSR 真實球員的 LPC look_data 映射
 *
 * 規則：
 * - 依球員 2025-2026 賽季的現役形象（髮型/膚色/鬍子/眼色）
 * - 鬍子顏色一律跟髮色一樣（除非該球員染髮）
 * - 球衣/球褲/球鞋色不在這裡設—等抽到時用持卡使用者的隊伍主色覆蓋
 *
 * 用法：
 *   const { SSR_LOOKS } = window.LPC_SSR_LOOKS;
 *   const look = SSR_LOOKS['ssr-meihsi-01'];   // Messi 的 look
 *
 * 抽 R/SR 時：隨機生成 look_data（不會用到這裡）
 */
'use strict';

const SSR_LOOKS = {
  // ── 攻擊核心 ──
  'ssr-mufeimui-01': {   // Mbappé — 法國快馬、橄欖膚、短黑髮、無鬍
    body: 'olive', eye_color: 'brown',
    hair_style: 'shorthawk', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-halandeng-01': {  // Haaland — 北歐金毛長髮、藍眼、無鬍
    body: 'light', eye_color: 'blue',
    hair_style: 'long', hair_color: 'blonde',
    beard_style: 'none', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },
  'ssr-vini-01': {       // Vinícius — 巴西黑膚、捲短髮、無鬍
    body: 'brown', eye_color: 'brown',
    hair_style: 'mop', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-salaba-01': {     // Salah — 法老王、橄欖膚、滿頭捲、滿臉鬍
    body: 'amber', eye_color: 'brown',
    hair_style: 'curly_long', hair_color: 'black',
    beard_style: 'medium', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-belling-01': {    // Bellingham — 英倫天才、亮膚、深短髮、無鬍
    body: 'light', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-meihsi-01': {     // Messi — 橄欖膚、淺褐長髮、短鬚
    body: 'olive', eye_color: 'brown',
    hair_style: 'bangslong', hair_color: 'blonde',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },
  'ssr-luonadou-01': {   // C.Ronaldo — 葡萄牙傳奇、橄欖膚、招牌頭頂尖刺
    body: 'olive', eye_color: 'brown',
    hair_style: 'spiked', hair_color: 'black',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },

  // ── 中場大師 ──
  'ssr-modeli-01': {     // Modrić — 克羅、亮膚、長卷金髮、短鬚（老將）
    body: 'light', eye_color: 'blue',
    hair_style: 'long_messy', hair_color: 'blonde',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'on',  // 39 歲，老將標記
  },
  'ssr-debulong-01': {   // De Bruyne — 紅髮魔術師、亮膚、短紅髮、藍眼
    body: 'light', eye_color: 'blue',
    hair_style: 'messy1', hair_color: 'ginger',
    beard_style: 'none', mustache_style: 'none', beard_color: 'ginger',
    wrinkles: 'none',
  },
  'ssr-luodeli-01': {    // Rodri — 西班牙、亮膚、短栗髮
    body: 'light', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'blonde',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },
  'ssr-chuamning-01': {  // Tchouaméni — 法國非裔、深膚、平頭
    body: 'brown', eye_color: 'brown',
    hair_style: 'flat_top_fade', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-weiladi-01': {    // Verratti — 義大利、橄欖膚、頭髮稀疏（balding）+ 短鬚
    body: 'olive', eye_color: 'brown',
    hair_style: 'balding', hair_color: 'blonde',
    beard_style: 'basic', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },
  'ssr-kasaimi-01': {    // Casemiro — 巴西、橄欖膚、捲短髮、滿臉鬍
    body: 'amber', eye_color: 'brown',
    hair_style: 'curly_long', hair_color: 'black',
    beard_style: 'medium', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-peideli-01': {    // Pedri — 西班牙、橄欖膚、短黑髮、無鬍（年輕）
    body: 'olive', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },

  // ── 後防巨牆 ──
  'ssr-fantaike-01': {   // Van Dijk — 荷蘭、橄欖膚（混血）、寸頭、短鬍
    body: 'amber', eye_color: 'brown',
    hair_style: 'high_and_tight', hair_color: 'black',
    beard_style: 'medium', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-lubendiya-01': {  // Rúben Dias — 葡萄牙、亮膚、短黑髮、短鬍
    body: 'light', eye_color: 'green',
    hair_style: 'plain', hair_color: 'black',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-salihba-01': {    // Saliba — 法國非裔、深膚、短黑髮
    body: 'brown', eye_color: 'brown',
    hair_style: 'pixie', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-makuino-01': {    // Marquinhos — 巴西、橄欖膚、短黑髮、短鬍
    body: 'olive', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'black',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-haqimi-01': {     // Hakimi — 摩洛哥、橄欖膚、短黑髮
    body: 'olive', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'black',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-daiweisi-01': {   // Davies — 加拿大裔非裔、深膚、短髮
    body: 'brown', eye_color: 'brown',
    hair_style: 'pixie', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },

  // ── 新生代 ──
  'ssr-yamaer-01': {     // Yamal — 巴薩新星、橄欖膚（西班牙摩洛哥裔）、短黑髮（年輕無鬍）
    body: 'olive', eye_color: 'brown',
    hair_style: 'messy1', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },

  // ── 門將 ──
  'ssr-alisong-01': {    // Alisson — 巴西、亮膚、短栗髮、短鬍
    body: 'light', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'blonde',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },
  'ssr-nuoyier-01': {    // Neuer — 德意志、亮膚、短栗髮、藍眼、短鬍（老將）
    body: 'light', eye_color: 'blue',
    hair_style: 'plain', hair_color: 'blonde',
    beard_style: 'basic', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'on',  // 39 歲
  },
  'ssr-kutuwa-01': {     // Courtois — 比利時、亮膚、短栗髮
    body: 'light', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'blonde',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },
  'ssr-dangna-01': {     // Donnarumma — 義大利、橄欖膚、長黑髮、短鬍
    body: 'olive', eye_color: 'brown',
    hair_style: 'long', hair_color: 'black',
    beard_style: 'trimmed', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-laya-01': {       // Raya — 西班牙、亮膚、短黑髮
    body: 'olive', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'black',
    beard_style: '5oclock_shadow', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },

  // ── 巴西+英倫經典 ──
  'ssr-neima-01': {      // Neymar — 巴西舞者、橄欖膚、招牌染金髮頂、短鬍
    body: 'olive', eye_color: 'brown',
    hair_style: 'spiked', hair_color: 'blonde',  // 染金
    beard_style: 'trimmed', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-kaiyin-01': {     // Kane — 英格蘭、亮膚、短金髮稍稀疏、短鬍、藍眼
    body: 'light', eye_color: 'blue',
    hair_style: 'plain', hair_color: 'blonde',
    beard_style: 'trimmed', mustache_style: 'none', beard_color: 'blonde',
    wrinkles: 'none',
  },

  // ── 亞洲之星 ──
  'ssr-santo-01': {      // 三笘薫 — 日本、亮膚、短黑髮、無鬍
    body: 'light', eye_color: 'brown',
    hair_style: 'plain', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
  'ssr-jiubao-01': {     // 久保建英 — 日本、亮膚、短瀏海黑髮
    body: 'light', eye_color: 'brown',
    hair_style: 'bangs', hair_color: 'black',
    beard_style: 'none', mustache_style: 'none', beard_color: 'black',
    wrinkles: 'none',
  },
};

// 隨機 look 生成器（給 SR/R 用）
function generateRandomLook(seed) {
  const rand = seed ? rngFromSeed(seed) : Math.random;
  const pick = a => a[Math.floor(rand() * a.length)];

  const bodies = ['light', 'olive', 'amber', 'brown', 'bronze'];
  const eyeColors = ['blue', 'brown', 'gray', 'green'];
  const hairStyles = ['messy1', 'messy2', 'spiked', 'plain', 'bangs', 'bangslong',
    'pixie', 'shorthawk', 'wavy', 'swoop', 'high_and_tight', 'mop', 'flat_top_fade',
    'long_messy', 'curly_long', 'bedhead', 'afro', 'dreadlocks_long', 'buzzcut'];
  const hairColors = ['black', 'blonde', 'red', 'white', 'ginger', 'gray'];
  const beardStyles = ['5oclock_shadow', 'basic', 'medium', 'trimmed'];

  const hair_color = pick(hairColors);
  const eyebrowStyles = ['thick', 'thin'];
  const headbandColors = ['red','blue','black','white','green','yellow','purple'];
  return {
    body: pick(bodies),
    eye_color: pick(eyeColors),
    wrinkles: rand() < 0.1 ? 'on' : 'none',
    hair_style: rand() < 0.05 ? 'bald' : pick(hairStyles),
    hair_color,
    eyebrow_style: rand() < 0.6 ? pick(eyebrowStyles) : 'none',
    eyebrow_color: hair_color,
    beard_style: rand() < 0.1 ? pick(beardStyles) : 'none',
    mustache_style: rand() < 0.05 ? pick(['basic', 'handlebar', 'walrus', 'chevron']) : 'none',
    beard_color: hair_color,
    headband_color: rand() < 0.05 ? pick(headbandColors) : 'none',
  };
}

function rngFromSeed(seed) {
  let x = typeof seed === 'string'
    ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)
    : seed;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return Math.abs(x / 233280);
  };
}

if (typeof window !== 'undefined') {
  window.LPC_SSR_LOOKS = { SSR_LOOKS, generateRandomLook };
}
if (typeof module !== 'undefined') {
  module.exports = { SSR_LOOKS, generateRandomLook };
}
