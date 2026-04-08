/* =============================================
   UCL-DATA-MATCHES.JS — 2025/26 歐冠聯賽賽程
   新制聯賽階段：36隊各踢8場（4主4客）
   淘汰賽：16強→8強→4強→決賽
   ============================================= */

// ── 聯賽階段賽程（8個比賽日）──────────────────────────
// 每隊8場：4主4客，對手由UEFA抽籤決定
// status: 'scheduled' | 'live' | 'finished'
const UCL_MATCHES = [

  // ===== MATCHDAY 1 (2025-09-17 / 09-18) =====
  {id:'UCL-L-001', md:1, date:'2025-09-17', time:'21:00', home:'BAY', away:'DZA', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-002', md:1, date:'2025-09-17', time:'21:00', home:'RMA', away:'STU', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-003', md:1, date:'2025-09-17', time:'21:00', home:'JUV', away:'PSV', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-004', md:1, date:'2025-09-17', time:'21:00', home:'ATA', away:'ARS', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-005', md:1, date:'2025-09-17', time:'21:00', home:'ATM', away:'LEI', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-006', md:1, date:'2025-09-17', time:'21:00', home:'ACM', away:'LIV', stage:'league', status:'finished', score:{h:1,a:3}},
  {id:'UCL-L-007', md:1, date:'2025-09-17', time:'18:45', home:'SCP', away:'LIL', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-008', md:1, date:'2025-09-17', time:'18:45', home:'CEL', away:'SHA', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-009', md:1, date:'2025-09-18', time:'21:00', home:'BAR', away:'MON', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-010', md:1, date:'2025-09-18', time:'21:00', home:'MCI', away:'INT', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-011', md:1, date:'2025-09-18', time:'21:00', home:'PSG', away:'GAL', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-012', md:1, date:'2025-09-18', time:'21:00', home:'LEV', away:'FEY', stage:'league', status:'finished', score:{h:4,a:0}},
  {id:'UCL-L-013', md:1, date:'2025-09-18', time:'21:00', home:'BEN', away:'POR', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-014', md:1, date:'2025-09-18', time:'21:00', home:'DOR', away:'BRU', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-015', md:1, date:'2025-09-18', time:'18:45', home:'AVL', away:'NEW', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-016', md:1, date:'2025-09-18', time:'18:45', home:'BRE', away:'SAL', stage:'league', status:'finished', score:{h:4,a:0}},
  {id:'UCL-L-017', md:1, date:'2025-09-18', time:'18:45', home:'CHE', away:'NAP', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-018', md:1, date:'2025-09-18', time:'18:45', home:'MAR', away:'AJA', stage:'league', status:'finished', score:{h:1,a:2}},

  // ===== MATCHDAY 2 (2025-10-01 / 10-02) =====
  {id:'UCL-L-019', md:2, date:'2025-10-01', time:'21:00', home:'ARS', away:'PSG', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-020', md:2, date:'2025-10-01', time:'21:00', home:'SHA', away:'ATA', stage:'league', status:'finished', score:{h:0,a:3}},
  {id:'UCL-L-021', md:2, date:'2025-10-01', time:'21:00', home:'BAR', away:'MCI', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-022', md:2, date:'2025-10-01', time:'21:00', home:'LEV', away:'ACM', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-023', md:2, date:'2025-10-01', time:'21:00', home:'LIV', away:'LEI', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-024', md:2, date:'2025-10-01', time:'18:45', home:'SAL', away:'BRE', stage:'league', status:'finished', score:{h:0,a:4}},
  {id:'UCL-L-025', md:2, date:'2025-10-01', time:'18:45', home:'BRU', away:'DOR', stage:'league', status:'finished', score:{h:0,a:3}},
  {id:'UCL-L-026', md:2, date:'2025-10-01', time:'18:45', home:'GAL', away:'PSG', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-027', md:2, date:'2025-10-02', time:'21:00', home:'INT', away:'RMA', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-028', md:2, date:'2025-10-02', time:'21:00', home:'DZA', away:'BAY', stage:'league', status:'finished', score:{h:0,a:2}},
  {id:'UCL-L-029', md:2, date:'2025-10-02', time:'21:00', home:'PSV', away:'SCP', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-030', md:2, date:'2025-10-02', time:'21:00', home:'STU', away:'JUV', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-031', md:2, date:'2025-10-02', time:'21:00', home:'FEY', away:'LEV', stage:'league', status:'finished', score:{h:0,a:4}},
  {id:'UCL-L-032', md:2, date:'2025-10-02', time:'18:45', home:'POR', away:'BEN', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-033', md:2, date:'2025-10-02', time:'18:45', home:'NAP', away:'CHE', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-034', md:2, date:'2025-10-02', time:'18:45', home:'LIL', away:'RMA', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-035', md:2, date:'2025-10-02', time:'18:45', home:'NEW', away:'AVL', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-036', md:2, date:'2025-10-02', time:'18:45', home:'AJA', away:'MAR', stage:'league', status:'finished', score:{h:3,a:1}},

  // ===== MATCHDAY 3 (2025-10-22 / 10-23) =====
  {id:'UCL-L-037', md:3, date:'2025-10-22', time:'21:00', home:'RMA', away:'DOR', stage:'league', status:'finished', score:{h:5,a:2}},
  {id:'UCL-L-038', md:3, date:'2025-10-22', time:'21:00', home:'ACM', away:'BRU', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-039', md:3, date:'2025-10-22', time:'21:00', home:'ARS', away:'SHA', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-040', md:3, date:'2025-10-22', time:'21:00', home:'ATA', away:'CEL', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-041', md:3, date:'2025-10-22', time:'21:00', home:'LEV', away:'BRE', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-042', md:3, date:'2025-10-22', time:'18:45', home:'JUV', away:'STU', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-043', md:3, date:'2025-10-22', time:'18:45', home:'PSV', away:'SCP', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-044', md:3, date:'2025-10-22', time:'18:45', home:'SCP', away:'MCI', stage:'league', status:'finished', score:{h:4,a:1}},
  {id:'UCL-L-045', md:3, date:'2025-10-23', time:'21:00', home:'BAR', away:'BAY', stage:'league', status:'finished', score:{h:4,a:1}},
  {id:'UCL-L-046', md:3, date:'2025-10-23', time:'21:00', home:'LIV', away:'LEV', stage:'league', status:'finished', score:{h:4,a:0}},
  {id:'UCL-L-047', md:3, date:'2025-10-23', time:'21:00', home:'INT', away:'ARS', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-048', md:3, date:'2025-10-23', time:'21:00', home:'PSG', away:'ATM', stage:'league', status:'finished', score:{h:1,a:2}},
  {id:'UCL-L-049', md:3, date:'2025-10-23', time:'21:00', home:'CHE', away:'NAP', stage:'league', status:'finished', score:{h:4,a:1}},
  {id:'UCL-L-050', md:3, date:'2025-10-23', time:'18:45', home:'BEN', away:'FEY', stage:'league', status:'finished', score:{h:1,a:3}},
  {id:'UCL-L-051', md:3, date:'2025-10-23', time:'18:45', home:'POR', away:'LIL', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-052', md:3, date:'2025-10-23', time:'18:45', home:'GAL', away:'DZA', stage:'league', status:'finished', score:{h:3,a:3}},
  {id:'UCL-L-053', md:3, date:'2025-10-23', time:'18:45', home:'SAL', away:'MON', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-054', md:3, date:'2025-10-23', time:'18:45', home:'AVL', away:'LEI', stage:'league', status:'finished', score:{h:2,a:0}},

  // ===== MATCHDAY 4 (2025-11-05 / 11-06) =====
  {id:'UCL-L-055', md:4, date:'2025-11-05', time:'21:00', home:'BAY', away:'BEN', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-056', md:4, date:'2025-11-05', time:'21:00', home:'DOR', away:'ARS', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-057', md:4, date:'2025-11-05', time:'21:00', home:'MCI', away:'BAR', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-058', md:4, date:'2025-11-05', time:'21:00', home:'RMA', away:'ACM', stage:'league', status:'finished', score:{h:1,a:3}},
  {id:'UCL-L-059', md:4, date:'2025-11-05', time:'21:00', home:'LIV', away:'LEV', stage:'league', status:'finished', score:{h:4,a:0}},
  {id:'UCL-L-060', md:4, date:'2025-11-05', time:'18:45', home:'FEY', away:'SAL', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-061', md:4, date:'2025-11-05', time:'18:45', home:'LIL', away:'JUV', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-062', md:4, date:'2025-11-05', time:'18:45', home:'CEL', away:'LEI', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-063', md:4, date:'2025-11-06', time:'21:00', home:'INT', away:'PSG', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-064', md:4, date:'2025-11-06', time:'21:00', home:'ATM', away:'PSV', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-065', md:4, date:'2025-11-06', time:'21:00', home:'NAP', away:'ATA', stage:'league', status:'finished', score:{h:0,a:3}},
  {id:'UCL-L-066', md:4, date:'2025-11-06', time:'21:00', home:'STU', away:'ATA', stage:'league', status:'finished', score:{h:0,a:2}},
  {id:'UCL-L-067', md:4, date:'2025-11-06', time:'18:45', home:'SHA', away:'BAR', stage:'league', status:'finished', score:{h:0,a:5}},
  {id:'UCL-L-068', md:4, date:'2025-11-06', time:'18:45', home:'MAR', away:'BRE', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-069', md:4, date:'2025-11-06', time:'18:45', home:'NEW', away:'CHE', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-070', md:4, date:'2025-11-06', time:'18:45', home:'AJA', away:'POR', stage:'league', status:'finished', score:{h:1,a:2}},
  {id:'UCL-L-071', md:4, date:'2025-11-06', time:'18:45', home:'BRU', away:'SCP', stage:'league', status:'finished', score:{h:1,a:2}},
  {id:'UCL-L-072', md:4, date:'2025-11-06', time:'18:45', home:'DZA', away:'MON', stage:'league', status:'finished', score:{h:2,a:2}},

  // ===== MATCHDAY 5 (2025-11-26 / 11-27) =====
  {id:'UCL-L-073', md:5, date:'2025-11-26', time:'21:00', home:'BAR', away:'DOR', stage:'league', status:'finished', score:{h:3,a:2}},
  {id:'UCL-L-074', md:5, date:'2025-11-26', time:'21:00', home:'LEV', away:'INT', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-075', md:5, date:'2025-11-26', time:'21:00', home:'ARS', away:'DZA', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-076', md:5, date:'2025-11-26', time:'21:00', home:'PSG', away:'BAY', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-077', md:5, date:'2025-11-26', time:'21:00', home:'SCP', away:'ARS', stage:'league', status:'finished', score:{h:1,a:5}},
  {id:'UCL-L-078', md:5, date:'2025-11-26', time:'18:45', home:'ATA', away:'RMA', stage:'league', status:'finished', score:{h:2,a:3}},
  {id:'UCL-L-079', md:5, date:'2025-11-26', time:'18:45', home:'JUV', away:'MCI', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-080', md:5, date:'2025-11-26', time:'18:45', home:'BEN', away:'MON', stage:'league', status:'finished', score:{h:3,a:2}},
  {id:'UCL-L-081', md:5, date:'2025-11-27', time:'21:00', home:'LIV', away:'RMA', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-082', md:5, date:'2025-11-27', time:'21:00', home:'ACM', away:'NAP', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-083', md:5, date:'2025-11-27', time:'21:00', home:'CHE', away:'AVL', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-084', md:5, date:'2025-11-27', time:'21:00', home:'ATM', away:'SHA', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-085', md:5, date:'2025-11-27', time:'18:45', home:'POR', away:'FEY', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-086', md:5, date:'2025-11-27', time:'18:45', home:'SAL', away:'PSV', stage:'league', status:'finished', score:{h:0,a:2}},
  {id:'UCL-L-087', md:5, date:'2025-11-27', time:'18:45', home:'GAL', away:'CEL', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-088', md:5, date:'2025-11-27', time:'18:45', home:'BRU', away:'LIL', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-089', md:5, date:'2025-11-27', time:'18:45', home:'BRE', away:'AJA', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-090', md:5, date:'2025-11-27', time:'18:45', home:'STU', away:'MAR', stage:'league', status:'finished', score:{h:1,a:1}},

  // ===== MATCHDAY 6 (2025-12-10 / 12-11) =====
  {id:'UCL-L-091', md:6, date:'2025-12-10', time:'21:00', home:'RMA', away:'ATA', stage:'league', status:'finished', score:{h:3,a:2}},
  {id:'UCL-L-092', md:6, date:'2025-12-10', time:'21:00', home:'MCI', away:'JUV', stage:'league', status:'finished', score:{h:1,a:2}},
  {id:'UCL-L-093', md:6, date:'2025-12-10', time:'21:00', home:'BAY', away:'PSG', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-094', md:6, date:'2025-12-10', time:'21:00', home:'INT', away:'LEV', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-095', md:6, date:'2025-12-10', time:'21:00', home:'DOR', away:'BAR', stage:'league', status:'finished', score:{h:2,a:3}},
  {id:'UCL-L-096', md:6, date:'2025-12-10', time:'18:45', home:'MON', away:'BEN', stage:'league', status:'finished', score:{h:2,a:3}},
  {id:'UCL-L-097', md:6, date:'2025-12-10', time:'18:45', home:'LIL', away:'SCP', stage:'league', status:'finished', score:{h:1,a:2}},
  {id:'UCL-L-098', md:6, date:'2025-12-10', time:'18:45', home:'FEY', away:'POR', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-099', md:6, date:'2025-12-11', time:'21:00', home:'NAP', away:'ACM', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-100', md:6, date:'2025-12-11', time:'21:00', home:'AVL', away:'CHE', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-101', md:6, date:'2025-12-11', time:'21:00', home:'ATM', away:'LIV', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-102', md:6, date:'2025-12-11', time:'21:00', home:'DZA', away:'ARS', stage:'league', status:'finished', score:{h:0,a:3}},
  {id:'UCL-L-103', md:6, date:'2025-12-11', time:'18:45', home:'SHA', away:'ATM', stage:'league', status:'finished', score:{h:0,a:2}},
  {id:'UCL-L-104', md:6, date:'2025-12-11', time:'18:45', home:'PSV', away:'SAL', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-105', md:6, date:'2025-12-11', time:'18:45', home:'CEL', away:'GAL', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-106', md:6, date:'2025-12-11', time:'18:45', home:'AJA', away:'BRE', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-107', md:6, date:'2025-12-11', time:'18:45', home:'MAR', away:'STU', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-108', md:6, date:'2025-12-11', time:'18:45', home:'LEI', away:'BRU', stage:'league', status:'finished', score:{h:1,a:0}},

  // ===== MATCHDAY 7 (2026-01-21 / 01-22) =====
  {id:'UCL-L-109', md:7, date:'2026-01-21', time:'21:00', home:'BAR', away:'ATM', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-110', md:7, date:'2026-01-21', time:'21:00', home:'MCI', away:'BAR', stage:'league', status:'finished', score:{h:3,a:3}},
  {id:'UCL-L-111', md:7, date:'2026-01-21', time:'21:00', home:'LIV', away:'LIL', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-112', md:7, date:'2026-01-21', time:'21:00', home:'RMA', away:'SAL', stage:'league', status:'finished', score:{h:5,a:1}},
  {id:'UCL-L-113', md:7, date:'2026-01-21', time:'21:00', home:'PSG', away:'MCI', stage:'league', status:'finished', score:{h:4,a:2}},
  {id:'UCL-L-114', md:7, date:'2026-01-21', time:'18:45', home:'ARS', away:'DOR', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-115', md:7, date:'2026-01-21', time:'18:45', home:'INT', away:'MON', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-116', md:7, date:'2026-01-21', time:'18:45', home:'BAY', away:'SHA', stage:'league', status:'finished', score:{h:7,a:0}},
  {id:'UCL-L-117', md:7, date:'2026-01-22', time:'21:00', home:'ATA', away:'JUV', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-118', md:7, date:'2026-01-22', time:'21:00', home:'CHE', away:'PSV', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-119', md:7, date:'2026-01-22', time:'21:00', home:'NAP', away:'POR', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-120', md:7, date:'2026-01-22', time:'21:00', home:'ACM', away:'GAL', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-121', md:7, date:'2026-01-22', time:'18:45', home:'LEI', away:'BEN', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-122', md:7, date:'2026-01-22', time:'18:45', home:'SCP', away:'LEV', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-123', md:7, date:'2026-01-22', time:'18:45', home:'BRE', away:'CEL', stage:'league', status:'finished', score:{h:4,a:1}},
  {id:'UCL-L-124', md:7, date:'2026-01-22', time:'18:45', home:'FEY', away:'BEN', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-125', md:7, date:'2026-01-22', time:'18:45', home:'MAR', away:'NEW', stage:'league', status:'finished', score:{h:0,a:1}},
  {id:'UCL-L-126', md:7, date:'2026-01-22', time:'18:45', home:'STU', away:'AVL', stage:'league', status:'finished', score:{h:0,a:0}},

  // ===== MATCHDAY 8 (2026-01-29) =====
  // 最後一輪同時開踢
  {id:'UCL-L-127', md:8, date:'2026-01-29', time:'21:00', home:'BAR', away:'ATA', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-128', md:8, date:'2026-01-29', time:'21:00', home:'MCI', away:'BRU', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-129', md:8, date:'2026-01-29', time:'21:00', home:'BAY', away:'SHA', stage:'league', status:'finished', score:{h:4,a:0}},
  {id:'UCL-L-130', md:8, date:'2026-01-29', time:'21:00', home:'LIV', away:'PSV', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-131', md:8, date:'2026-01-29', time:'21:00', home:'INT', away:'MON', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-132', md:8, date:'2026-01-29', time:'21:00', home:'RMA', away:'BRE', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-133', md:8, date:'2026-01-29', time:'21:00', home:'PSG', away:'STU', stage:'league', status:'finished', score:{h:4,a:1}},
  {id:'UCL-L-134', md:8, date:'2026-01-29', time:'21:00', home:'LEV', away:'SCP', stage:'league', status:'finished', score:{h:2,a:1}},
  {id:'UCL-L-135', md:8, date:'2026-01-29', time:'21:00', home:'DOR', away:'SHA', stage:'league', status:'finished', score:{h:3,a:1}},
  {id:'UCL-L-136', md:8, date:'2026-01-29', time:'21:00', home:'ARS', away:'GAL', stage:'league', status:'finished', score:{h:4,a:1}},
  {id:'UCL-L-137', md:8, date:'2026-01-29', time:'21:00', home:'ATM', away:'NAP', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-138', md:8, date:'2026-01-29', time:'21:00', home:'ACM', away:'CEL', stage:'league', status:'finished', score:{h:1,a:0}},
  {id:'UCL-L-139', md:8, date:'2026-01-29', time:'21:00', home:'JUV', away:'BEN', stage:'league', status:'finished', score:{h:0,a:0}},
  {id:'UCL-L-140', md:8, date:'2026-01-29', time:'21:00', home:'CHE', away:'SAL', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-141', md:8, date:'2026-01-29', time:'21:00', home:'NEW', away:'LIL', stage:'league', status:'finished', score:{h:2,a:0}},
  {id:'UCL-L-142', md:8, date:'2026-01-29', time:'21:00', home:'AVL', away:'MAR', stage:'league', status:'finished', score:{h:1,a:1}},
  {id:'UCL-L-143', md:8, date:'2026-01-29', time:'21:00', home:'FEY', away:'LIL', stage:'league', status:'finished', score:{h:3,a:0}},
  {id:'UCL-L-144', md:8, date:'2026-01-29', time:'21:00', home:'AJA', away:'DZA', stage:'league', status:'finished', score:{h:2,a:0}},

  // ===== 淘汰賽附加賽（9-24名對決）(2026-02-11/12 & 02-18/19) =====
  // 第一回合
  {id:'UCL-PO-01', date:'2026-02-11', time:'21:00', home:'MCI', away:'ACM', stage:'playoff', leg:1, status:'finished', score:{h:2,a:1}},
  {id:'UCL-PO-02', date:'2026-02-11', time:'21:00', home:'BAY', away:'CEL', stage:'playoff', leg:1, status:'finished', score:{h:3,a:0}},
  {id:'UCL-PO-03', date:'2026-02-11', time:'21:00', home:'RMA', away:'CHE', stage:'playoff', leg:1, status:'finished', score:{h:2,a:0}},
  {id:'UCL-PO-04', date:'2026-02-12', time:'21:00', home:'PSG', away:'NAP', stage:'playoff', leg:1, status:'finished', score:{h:1,a:1}},
  {id:'UCL-PO-05', date:'2026-02-12', time:'21:00', home:'DOR', away:'FEY', stage:'playoff', leg:1, status:'finished', score:{h:2,a:0}},
  {id:'UCL-PO-06', date:'2026-02-12', time:'21:00', home:'JUV', away:'PSV', stage:'playoff', leg:1, status:'finished', score:{h:1,a:0}},
  {id:'UCL-PO-07', date:'2026-02-12', time:'21:00', home:'BEN', away:'MON', stage:'playoff', leg:1, status:'finished', score:{h:2,a:1}},
  {id:'UCL-PO-08', date:'2026-02-12', time:'21:00', home:'ATA', away:'BRU', stage:'playoff', leg:1, status:'finished', score:{h:3,a:0}},
  // 第二回合
  {id:'UCL-PO-09', date:'2026-02-18', time:'21:00', home:'ACM', away:'MCI', stage:'playoff', leg:2, status:'finished', score:{h:1,a:1}, agg:{h:2,a:3}},
  {id:'UCL-PO-10', date:'2026-02-18', time:'21:00', home:'CEL', away:'BAY', stage:'playoff', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:1,a:5}},
  {id:'UCL-PO-11', date:'2026-02-18', time:'21:00', home:'CHE', away:'RMA', stage:'playoff', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:1,a:4}},
  {id:'UCL-PO-12', date:'2026-02-19', time:'21:00', home:'NAP', away:'PSG', stage:'playoff', leg:2, status:'finished', score:{h:2,a:1}, agg:{h:3,a:2}},
  {id:'UCL-PO-13', date:'2026-02-19', time:'21:00', home:'FEY', away:'DOR', stage:'playoff', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:1,a:4}},
  {id:'UCL-PO-14', date:'2026-02-19', time:'21:00', home:'PSV', away:'JUV', stage:'playoff', leg:2, status:'finished', score:{h:2,a:1}, agg:{h:2,a:2}},
  {id:'UCL-PO-15', date:'2026-02-19', time:'21:00', home:'MON', away:'BEN', stage:'playoff', leg:2, status:'finished', score:{h:0,a:1}, agg:{h:1,a:3}},
  {id:'UCL-PO-16', date:'2026-02-19', time:'21:00', home:'BRU', away:'ATA', stage:'playoff', leg:2, status:'finished', score:{h:0,a:2}, agg:{h:0,a:5}},

  // ===== 十六強 (2026-03-04/05 & 03-11/12) =====
  // 第一回合
  {id:'UCL-R16-01', date:'2026-03-04', time:'21:00', home:'BAR', away:'NAP', stage:'r16', leg:1, status:'finished', score:{h:3,a:1}},
  {id:'UCL-R16-02', date:'2026-03-04', time:'21:00', home:'LIV', away:'MCI', stage:'r16', leg:1, status:'finished', score:{h:2,a:1}},
  {id:'UCL-R16-03', date:'2026-03-05', time:'21:00', home:'ARS', away:'BAY', stage:'r16', leg:1, status:'finished', score:{h:1,a:1}},
  {id:'UCL-R16-04', date:'2026-03-05', time:'21:00', home:'INT', away:'DOR', stage:'r16', leg:1, status:'finished', score:{h:2,a:0}},
  {id:'UCL-R16-05', date:'2026-03-05', time:'21:00', home:'ATM', away:'JUV', stage:'r16', leg:1, status:'finished', score:{h:1,a:0}},
  {id:'UCL-R16-06', date:'2026-03-05', time:'21:00', home:'LEV', away:'BEN', stage:'r16', leg:1, status:'finished', score:{h:2,a:0}},
  {id:'UCL-R16-07', date:'2026-03-04', time:'21:00', home:'RMA', away:'ATA', stage:'r16', leg:1, status:'finished', score:{h:3,a:2}},
  {id:'UCL-R16-08', date:'2026-03-04', time:'21:00', home:'SCP', away:'LEV', stage:'r16', leg:1, status:'finished', score:{h:0,a:1}},
  // 第二回合
  {id:'UCL-R16-09', date:'2026-03-11', time:'21:00', home:'NAP', away:'BAR', stage:'r16', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:2,a:5}},
  {id:'UCL-R16-10', date:'2026-03-11', time:'21:00', home:'MCI', away:'LIV', stage:'r16', leg:2, status:'finished', score:{h:1,a:1}, agg:{h:2,a:3}},
  {id:'UCL-R16-11', date:'2026-03-12', time:'21:00', home:'BAY', away:'ARS', stage:'r16', leg:2, status:'finished', score:{h:2,a:1}, agg:{h:3,a:2}},
  {id:'UCL-R16-12', date:'2026-03-12', time:'21:00', home:'DOR', away:'INT', stage:'r16', leg:2, status:'finished', score:{h:1,a:1}, agg:{h:1,a:3}},
  {id:'UCL-R16-13', date:'2026-03-12', time:'21:00', home:'JUV', away:'ATM', stage:'r16', leg:2, status:'finished', score:{h:1,a:0}, agg:{h:1,a:1}},
  {id:'UCL-R16-14', date:'2026-03-12', time:'21:00', home:'BEN', away:'LEV', stage:'r16', leg:2, status:'finished', score:{h:1,a:1}, agg:{h:1,a:3}},
  {id:'UCL-R16-15', date:'2026-03-11', time:'21:00', home:'ATA', away:'RMA', stage:'r16', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:3,a:5}},
  {id:'UCL-R16-16', date:'2026-03-11', time:'21:00', home:'LEV', away:'SCP', stage:'r16', leg:2, status:'finished', score:{h:2,a:0}, agg:{h:3,a:0}},

  // ===== 八強 (2026-04-07/08 & 04-14/15) =====
  // 第一回合
  {id:'UCL-QF-01', date:'2026-04-07', time:'21:00', home:'BAR', away:'BAY', stage:'qf', leg:1, status:'finished', score:{h:3,a:1}},
  {id:'UCL-QF-02', date:'2026-04-07', time:'21:00', home:'LIV', away:'INT', stage:'qf', leg:1, status:'finished', score:{h:2,a:0}},
  {id:'UCL-QF-03', date:'2026-04-08', time:'21:00', home:'RMA', away:'ATM', stage:'qf', leg:1, status:'finished', score:{h:2,a:1}},
  {id:'UCL-QF-04', date:'2026-04-08', time:'21:00', home:'LEV', away:'ARS', stage:'qf', leg:1, status:'scheduled', score:null},
  // 第二回合
  {id:'UCL-QF-05', date:'2026-04-14', time:'21:00', home:'BAY', away:'BAR', stage:'qf', leg:2, status:'scheduled', score:null},
  {id:'UCL-QF-06', date:'2026-04-14', time:'21:00', home:'INT', away:'LIV', stage:'qf', leg:2, status:'scheduled', score:null},
  {id:'UCL-QF-07', date:'2026-04-15', time:'21:00', home:'ATM', away:'RMA', stage:'qf', leg:2, status:'scheduled', score:null},
  {id:'UCL-QF-08', date:'2026-04-15', time:'21:00', home:'ARS', away:'LEV', stage:'qf', leg:2, status:'scheduled', score:null},

  // ===== 四強 (2026-04-29/30 & 05-06/07) =====
  {id:'UCL-SF-01', date:'2026-04-29', time:'21:00', home:'TBD', away:'TBD', stage:'sf', leg:1, status:'scheduled', score:null},
  {id:'UCL-SF-02', date:'2026-04-30', time:'21:00', home:'TBD', away:'TBD', stage:'sf', leg:1, status:'scheduled', score:null},
  {id:'UCL-SF-03', date:'2026-05-06', time:'21:00', home:'TBD', away:'TBD', stage:'sf', leg:2, status:'scheduled', score:null},
  {id:'UCL-SF-04', date:'2026-05-07', time:'21:00', home:'TBD', away:'TBD', stage:'sf', leg:2, status:'scheduled', score:null},

  // ===== 決賽 (2026-05-30 慕尼黑安聯球場) =====
  {id:'UCL-F-01', date:'2026-05-30', time:'21:00', home:'TBD', away:'TBD', stage:'final', venue:'Allianz Arena, Munich', status:'scheduled', score:null}
];

// ── 聯賽階段積分表計算 ──────────────────────────
function calcUCLStandings() {
  const table = {};
  // 初始化所有隊伍
  Object.keys(UCL_TEAMS).forEach(code => {
    table[code] = { code, mp:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
  });
  // 計算聯賽階段成績
  UCL_MATCHES.filter(m => m.stage === 'league' && m.status === 'finished' && m.score).forEach(m => {
    const h = table[m.home], a = table[m.away];
    if (!h || !a) return;
    h.mp++; a.mp++;
    h.gf += m.score.h; h.ga += m.score.a;
    a.gf += m.score.a; a.ga += m.score.h;
    if (m.score.h > m.score.a) { h.w++; h.pts += 3; a.l++; }
    else if (m.score.h < m.score.a) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
    h.gd = h.gf - h.ga;
    a.gd = a.gf - a.ga;
  });
  // 排序：積分 > 淨勝球 > 進球數
  return Object.values(table)
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

// 導出
if (typeof window !== 'undefined') {
  window.UCL_MATCHES = UCL_MATCHES;
  window.calcUCLStandings = calcUCLStandings;
}
