#!/usr/bin/env node
/**
 * 從 js/lpc-ssr-looks.js 的 SSR_LOOKS 產生 migration SQL
 *   - 加 look_data JSONB 欄到 player_card_pool / team_player
 *   - UPDATE 30 個 SSR 卡的 look_data
 *
 * 用法：node scripts/build-ssr-looks-migration.js
 * 輸出：supabase/migrations/20260512000010_lpc_look_data.sql
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { SSR_LOOKS } = require('../js/lpc-ssr-looks.js');

function escape(s) { return String(s).replace(/'/g, "''"); }

const updates = Object.entries(SSR_LOOKS).map(([cardId, look]) =>
  `UPDATE player_card_pool SET look_data = '${escape(JSON.stringify(look))}'::jsonb WHERE card_id = '${cardId}';`
).join('\n');

const sql = `-- ============================================================
-- 我的球隊 — LPC look_data 整合
-- 1. 加 look_data JSONB 欄到 player_card_pool（SSR 固定臉）/ team_player（SR/R 抽到的隨機臉）
-- 2. 30 SSR 真實球員形象 seed（依 js/lpc-ssr-looks.js）
-- 重跑：node scripts/build-ssr-looks-migration.js
-- ============================================================

ALTER TABLE player_card_pool
  ADD COLUMN IF NOT EXISTS look_data JSONB;

ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS look_data JSONB;

-- ── 30 SSR 真實球員形象 ──
${updates}

-- ── 完成 ──
`;

const outPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260512000010_lpc_look_data.sql');
fs.writeFileSync(outPath, sql);
console.log(`✅ 寫到 ${path.relative(path.join(__dirname, '..'), outPath)}`);
console.log(`   ${Object.keys(SSR_LOOKS).length} SSR 形象 seed`);
