/* =============================================
   UCL-DATA-MATCHES.JS — 2025/26 歐冠聯賽賽程
   新制聯賽階段：36隊各踢8場（4主4客）
   淘汰賽：附加賽→16強→8強→4強→決賽
   時間皆為台灣時間（UTC+8）
   ============================================= */

const UCL_MATCHES = [

  // ===== 淘汰賽附加賽 第一回合 (2026-02-18 / 02-19 台灣時間) =====
  // 歐洲時間 Feb 17-18, 21:00/18:45 CET → 台灣 +1天 04:00/01:45
  {id:'UCL-PO-01', date:'2026-02-18', time:'04:00', home:'BEN', away:'RMA', stage:'playoff', leg:1, status:'finished', score:{h:0,a:1}},
  {id:'UCL-PO-02', date:'2026-02-18', time:'04:00', home:'MON', away:'PSG', stage:'playoff', leg:1, status:'finished', score:{h:2,a:3}},
  {id:'UCL-PO-03', date:'2026-02-18', time:'01:45', home:'GAL', away:'JUV', stage:'playoff', leg:1, status:'finished', score:{h:5,a:2}},
  {id:'UCL-PO-04', date:'2026-02-18', time:'04:00', home:'DOR', away:'ATA', stage:'playoff', leg:1, status:'finished', score:{h:2,a:0}},
  {id:'UCL-PO-05', date:'2026-02-19', time:'01:45', home:'QAR', away:'NEW', stage:'playoff', leg:1, status:'finished', score:{h:1,a:6}},
  {id:'UCL-PO-06', date:'2026-02-19', time:'04:00', home:'BOD', away:'INT', stage:'playoff', leg:1, status:'finished', score:{h:3,a:1}},
  {id:'UCL-PO-07', date:'2026-02-19', time:'04:00', home:'BRU', away:'ATM', stage:'playoff', leg:1, status:'finished', score:{h:3,a:3}},
  {id:'UCL-PO-08', date:'2026-02-19', time:'04:00', home:'OLY', away:'LEV', stage:'playoff', leg:1, status:'finished', score:{h:0,a:2}},

  // ===== 淘汰賽附加賽 第二回合 (2026-02-25 / 02-26 台灣時間) =====
  {id:'UCL-PO-09', date:'2026-02-25', time:'01:45', home:'ATM', away:'BRU', stage:'playoff', leg:2, status:'finished', score:{h:4,a:1}, agg:{h:7,a:4}},
  {id:'UCL-PO-10', date:'2026-02-25', time:'04:00', home:'LEV', away:'OLY', stage:'playoff', leg:2, status:'finished', score:{h:0,a:0}, agg:{h:2,a:0}},
  {id:'UCL-PO-11', date:'2026-02-25', time:'04:00', home:'INT', away:'BOD', stage:'playoff', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:2,a:5}},
  {id:'UCL-PO-12', date:'2026-02-25', time:'04:00', home:'NEW', away:'QAR', stage:'playoff', leg:2, status:'finished', score:{h:3,a:2}, agg:{h:9,a:3}},
  {id:'UCL-PO-13', date:'2026-02-26', time:'01:45', home:'ATA', away:'DOR', stage:'playoff', leg:2, status:'finished', score:{h:4,a:1}, agg:{h:4,a:3}},
  {id:'UCL-PO-14', date:'2026-02-26', time:'04:00', home:'RMA', away:'BEN', stage:'playoff', leg:2, status:'finished', score:{h:2,a:1}, agg:{h:3,a:1}},
  {id:'UCL-PO-15', date:'2026-02-26', time:'04:00', home:'PSG', away:'MON', stage:'playoff', leg:2, status:'finished', score:{h:2,a:2}, agg:{h:5,a:4}},
  {id:'UCL-PO-16', date:'2026-02-26', time:'04:00', home:'JUV', away:'GAL', stage:'playoff', leg:2, status:'finished', score:{h:3,a:2}, agg:{h:5,a:7}},

  // ===== 十六強 第一回合 (2026-03-11 / 03-12 台灣時間) =====
  // 歐洲 Mar 10-11, 21:00 CET → 台灣 +1天 04:00
  {id:'UCL-R16-01', date:'2026-03-11', time:'04:00', home:'ATA', away:'BAY', stage:'r16', leg:1, status:'finished', score:{h:1,a:6}},
  {id:'UCL-R16-02', date:'2026-03-11', time:'04:00', home:'ATM', away:'TOT', stage:'r16', leg:1, status:'finished', score:{h:5,a:2}},
  {id:'UCL-R16-03', date:'2026-03-11', time:'04:00', home:'NEW', away:'BAR', stage:'r16', leg:1, status:'finished', score:{h:1,a:1}},
  {id:'UCL-R16-04', date:'2026-03-11', time:'04:00', home:'GAL', away:'LIV', stage:'r16', leg:1, status:'finished', score:{h:1,a:0}},
  {id:'UCL-R16-05', date:'2026-03-12', time:'04:00', home:'LEV', away:'ARS', stage:'r16', leg:1, status:'finished', score:{h:1,a:1}},
  {id:'UCL-R16-06', date:'2026-03-12', time:'04:00', home:'BOD', away:'SCP', stage:'r16', leg:1, status:'finished', score:{h:3,a:0}},
  {id:'UCL-R16-07', date:'2026-03-12', time:'04:00', home:'PSG', away:'CHE', stage:'r16', leg:1, status:'finished', score:{h:5,a:2}},
  {id:'UCL-R16-08', date:'2026-03-12', time:'04:00', home:'RMA', away:'MCI', stage:'r16', leg:1, status:'finished', score:{h:3,a:0}},

  // ===== 十六強 第二回合 (2026-03-18 / 03-19 台灣時間) =====
  {id:'UCL-R16-09', date:'2026-03-18', time:'04:00', home:'SCP', away:'BOD', stage:'r16', leg:2, status:'finished', score:{h:5,a:0}, agg:{h:5,a:3}},
  {id:'UCL-R16-10', date:'2026-03-18', time:'04:00', home:'ARS', away:'LEV', stage:'r16', leg:2, status:'finished', score:{h:2,a:0}, agg:{h:3,a:1}},
  {id:'UCL-R16-11', date:'2026-03-18', time:'04:00', home:'CHE', away:'PSG', stage:'r16', leg:2, status:'finished', score:{h:0,a:3}, agg:{h:2,a:8}},
  {id:'UCL-R16-12', date:'2026-03-18', time:'04:00', home:'MCI', away:'RMA', stage:'r16', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:1,a:5}},
  {id:'UCL-R16-13', date:'2026-03-19', time:'04:00', home:'BAR', away:'NEW', stage:'r16', leg:2, status:'finished', score:{h:7,a:2}, agg:{h:8,a:3}},
  {id:'UCL-R16-14', date:'2026-03-19', time:'04:00', home:'LIV', away:'GAL', stage:'r16', leg:2, status:'finished', score:{h:4,a:0}, agg:{h:4,a:1}},
  {id:'UCL-R16-15', date:'2026-03-19', time:'04:00', home:'BAY', away:'ATA', stage:'r16', leg:2, status:'finished', score:{h:4,a:1}, agg:{h:10,a:2}},
  {id:'UCL-R16-16', date:'2026-03-19', time:'04:00', home:'TOT', away:'ATM', stage:'r16', leg:2, status:'finished', score:{h:3,a:2}, agg:{h:5,a:7}},

  // ===== 八強 第一回合 (2026-04-08 / 04-09 台灣時間) =====
  // 歐洲 Apr 7-8, 21:00 CEST → 台灣 +1天 03:00
  {id:'UCL-QF-01', date:'2026-04-08', time:'03:00', home:'SCP', away:'ARS', stage:'qf', leg:1, status:'finished', score:{h:0,a:1}},
  {id:'UCL-QF-02', date:'2026-04-08', time:'03:00', home:'RMA', away:'BAY', stage:'qf', leg:1, status:'finished', score:{h:1,a:2}},
  {id:'UCL-QF-03', date:'2026-04-09', time:'03:00', home:'BAR', away:'ATM', stage:'qf', leg:1, status:'finished', score:{h:0,a:2}},
  {id:'UCL-QF-04', date:'2026-04-09', time:'03:00', home:'PSG', away:'LIV', stage:'qf', leg:1, status:'finished', score:{h:2,a:0}},

  // ===== 八強 第二回合 (2026-04-15 / 04-16 台灣時間) =====
  {id:'UCL-QF-05', date:'2026-04-15', time:'03:00', home:'ATM', away:'BAR', stage:'qf', leg:2, status:'scheduled', score:null},
  {id:'UCL-QF-06', date:'2026-04-15', time:'03:00', home:'LIV', away:'PSG', stage:'qf', leg:2, status:'scheduled', score:null},
  {id:'UCL-QF-07', date:'2026-04-16', time:'03:00', home:'ARS', away:'SCP', stage:'qf', leg:2, status:'scheduled', score:null},
  {id:'UCL-QF-08', date:'2026-04-16', time:'03:00', home:'BAY', away:'RMA', stage:'qf', leg:2, status:'scheduled', score:null},

  // ===== 四強 (2026-04-29 / 04-30 & 05-06 / 05-07 台灣時間) =====
  {id:'UCL-SF-01', date:'2026-04-29', time:'03:00', home:'TBD', away:'TBD', stage:'sf', leg:1, status:'scheduled', score:null},
  {id:'UCL-SF-02', date:'2026-04-30', time:'03:00', home:'TBD', away:'TBD', stage:'sf', leg:1, status:'scheduled', score:null},
  {id:'UCL-SF-03', date:'2026-05-06', time:'03:00', home:'TBD', away:'TBD', stage:'sf', leg:2, status:'scheduled', score:null},
  {id:'UCL-SF-04', date:'2026-05-07', time:'03:00', home:'TBD', away:'TBD', stage:'sf', leg:2, status:'scheduled', score:null},

  // ===== 決賽 (2026-05-31 03:00 台灣時間 · 布達佩斯普斯卡什球場) =====
  {id:'UCL-F-01', date:'2026-05-31', time:'03:00', home:'TBD', away:'TBD', stage:'final', venue:'Puskás Aréna, Budapest', status:'scheduled', score:null}
];

// ── 聯賽階段最終積分表（已完結）──────────────────────
const UCL_LEAGUE_STANDINGS = [
  {pos:1,  code:'ARS', mp:8, w:8, d:0, l:0, gf:23, ga:4,  gd:19,  pts:24},
  {pos:2,  code:'BAY', mp:8, w:7, d:0, l:1, gf:22, ga:8,  gd:14,  pts:21},
  {pos:3,  code:'LIV', mp:8, w:6, d:0, l:2, gf:20, ga:8,  gd:12,  pts:18},
  {pos:4,  code:'TOT', mp:8, w:5, d:2, l:1, gf:17, ga:7,  gd:10,  pts:17},
  {pos:5,  code:'BAR', mp:8, w:5, d:1, l:2, gf:22, ga:14, gd:8,   pts:16},
  {pos:6,  code:'CHE', mp:8, w:5, d:1, l:2, gf:17, ga:10, gd:7,   pts:16},
  {pos:7,  code:'SCP', mp:8, w:5, d:1, l:2, gf:17, ga:11, gd:6,   pts:16},
  {pos:8,  code:'MCI', mp:8, w:5, d:1, l:2, gf:15, ga:9,  gd:6,   pts:16},
  {pos:9,  code:'RMA', mp:8, w:5, d:0, l:3, gf:21, ga:12, gd:9,   pts:15},
  {pos:10, code:'INT', mp:8, w:5, d:0, l:3, gf:15, ga:7,  gd:8,   pts:15},
  {pos:11, code:'PSG', mp:8, w:4, d:2, l:2, gf:21, ga:11, gd:10,  pts:14},
  {pos:12, code:'NEW', mp:8, w:4, d:2, l:2, gf:17, ga:7,  gd:10,  pts:14},
  {pos:13, code:'JUV', mp:8, w:3, d:4, l:1, gf:14, ga:10, gd:4,   pts:13},
  {pos:14, code:'ATM', mp:8, w:4, d:1, l:3, gf:17, ga:15, gd:2,   pts:13},
  {pos:15, code:'ATA', mp:8, w:4, d:1, l:3, gf:10, ga:10, gd:0,   pts:13},
  {pos:16, code:'LEV', mp:8, w:3, d:3, l:2, gf:13, ga:14, gd:-1,  pts:12},
  {pos:17, code:'DOR', mp:8, w:3, d:2, l:3, gf:19, ga:17, gd:2,   pts:11},
  {pos:18, code:'OLY', mp:8, w:3, d:2, l:3, gf:10, ga:14, gd:-4,  pts:11},
  {pos:19, code:'BRU', mp:8, w:3, d:1, l:4, gf:15, ga:17, gd:-2,  pts:10},
  {pos:20, code:'GAL', mp:8, w:3, d:1, l:4, gf:9,  ga:11, gd:-2,  pts:10},
  {pos:21, code:'MON', mp:8, w:2, d:4, l:2, gf:8,  ga:14, gd:-6,  pts:10},
  {pos:22, code:'QAR', mp:8, w:3, d:1, l:4, gf:13, ga:21, gd:-8,  pts:10},
  {pos:23, code:'BOD', mp:8, w:2, d:3, l:3, gf:14, ga:15, gd:-1,  pts:9},
  {pos:24, code:'BEN', mp:8, w:3, d:0, l:5, gf:10, ga:12, gd:-2,  pts:9},
  {pos:25, code:'MAR', mp:8, w:3, d:0, l:5, gf:11, ga:14, gd:-3,  pts:9},
  {pos:26, code:'PAF', mp:8, w:2, d:3, l:3, gf:8,  ga:11, gd:-3,  pts:9},
  {pos:27, code:'USG', mp:8, w:3, d:0, l:5, gf:8,  ga:17, gd:-9,  pts:9},
  {pos:28, code:'PSV', mp:8, w:2, d:2, l:4, gf:16, ga:16, gd:0,   pts:8},
  {pos:29, code:'ATH', mp:8, w:2, d:2, l:4, gf:9,  ga:14, gd:-5,  pts:8},
  {pos:30, code:'NAP', mp:8, w:2, d:2, l:4, gf:9,  ga:15, gd:-6,  pts:8},
  {pos:31, code:'COP', mp:8, w:2, d:2, l:4, gf:12, ga:21, gd:-9,  pts:8},
  {pos:32, code:'AJA', mp:8, w:2, d:0, l:6, gf:8,  ga:21, gd:-13, pts:6},
  {pos:33, code:'SGE', mp:8, w:1, d:1, l:6, gf:10, ga:21, gd:-11, pts:4},
  {pos:34, code:'SLA', mp:8, w:0, d:3, l:5, gf:5,  ga:19, gd:-14, pts:3},
  {pos:35, code:'VIL', mp:8, w:0, d:1, l:7, gf:5,  ga:18, gd:-13, pts:1},
  {pos:36, code:'KAI', mp:8, w:0, d:1, l:7, gf:7,  ga:22, gd:-15, pts:1}
];

// ── 聯賽階段積分表 ──────────────────────────
function calcUCLStandings() {
  // 直接回傳已確定的最終積分表
  return UCL_LEAGUE_STANDINGS.map(row => ({
    code: row.code,
    mp: row.mp, w: row.w, d: row.d, l: row.l,
    gf: row.gf, ga: row.ga, gd: row.gd, pts: row.pts
  }));
}

// 導出
if (typeof window !== 'undefined') {
  window.UCL_MATCHES = UCL_MATCHES;
  window.UCL_LEAGUE_STANDINGS = UCL_LEAGUE_STANDINGS;
  window.calcUCLStandings = calcUCLStandings;
}
