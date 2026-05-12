-- ============================================================
-- 我的球隊 Phase 1 — Schema migration
-- 設計依據：docs/my-team-design.md v0.7
-- 範圍：8 張表 + RLS
-- ============================================================

-- ── 1. 卡池母表（公開只讀；種子資料由後台塞）─────────────
CREATE TABLE IF NOT EXISTS player_card_pool (
  card_id          TEXT PRIMARY KEY,                    -- e.g. 'ssr-mufei-01'
  rarity           TEXT NOT NULL CHECK (rarity IN ('R','SR','SSR')),
  name             TEXT NOT NULL,                       -- 化名
  nickname         TEXT,                                -- 暱稱（可空）
  position         TEXT NOT NULL CHECK (position IN ('GK','DEF','MID','FWD')),
  base_attack      INTEGER NOT NULL CHECK (base_attack BETWEEN 0 AND 99),
  base_defense     INTEGER NOT NULL CHECK (base_defense BETWEEN 0 AND 99),
  base_speed       INTEGER NOT NULL CHECK (base_speed BETWEEN 0 AND 99),
  base_midfield    INTEGER NOT NULL CHECK (base_midfield BETWEEN 0 AND 99),
  base_stamina     INTEGER NOT NULL CHECK (base_stamina BETWEEN 0 AND 99),
  base_aura        INTEGER NOT NULL CHECK (base_aura BETWEEN 0 AND 99),
  talent           TEXT,                                -- 'speedster'|'bodybuilder'|'shooter'|'wall'|'magician'|null
  inspiration      TEXT,                                -- 開發者註記（前端不顯示）
  illustration     TEXT,                                -- sprite id 或圖路徑
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_rarity ON player_card_pool(rarity);
CREATE INDEX IF NOT EXISTS idx_cards_position ON player_card_pool(position);

ALTER TABLE player_card_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read cards"
  ON player_card_pool FOR SELECT
  USING (true);
-- write 不開放給 anon/authenticated → 只能 service_role


-- ── 2. 使用者球隊主表 ───────────────────────────────────
CREATE TABLE IF NOT EXISTS my_team (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name        TEXT NOT NULL CHECK (length(team_name) BETWEEN 1 AND 24),
  team_crest       TEXT NOT NULL DEFAULT '⚽',          -- emoji 或 sprite id
  coach_id         TEXT,                                 -- 預留：Phase 3 教練系統
  formation        TEXT NOT NULL DEFAULT '4-3-3',
  stadium_level    INTEGER NOT NULL DEFAULT 1 CHECK (stadium_level BETWEEN 1 AND 10),
  fans             INTEGER NOT NULL DEFAULT 100,
  -- 寶石（gem）與站內既有 wallet 共用 → 這欄不存，從站內既有寶石 wallet 取
  -- 抽券（ticket）為 my-team 專屬資源
  tickets          INTEGER NOT NULL DEFAULT 5,           -- 新人初始送 5 張
  ssr_select_tickets INTEGER NOT NULL DEFAULT 0,         -- SSR 自選券（賽季冠軍才有）
  stamina          INTEGER NOT NULL DEFAULT 5,           -- 體力，每日 cron 重置上限
  stamina_max      INTEGER NOT NULL DEFAULT 5,
  -- 4 種 RP
  rp_tactical      INTEGER NOT NULL DEFAULT 0,
  rp_physical      INTEGER NOT NULL DEFAULT 0,
  rp_heart         INTEGER NOT NULL DEFAULT 0,
  rp_idea          INTEGER NOT NULL DEFAULT 0,
  -- 抽卡保底
  pity_counter     INTEGER NOT NULL DEFAULT 0,           -- 0-30，30 時下次必出 SSR
  -- PvP 預留欄位（Phase 3 才用）
  is_pvp_visible   BOOLEAN NOT NULL DEFAULT false,
  pvp_elo          INTEGER NOT NULL DEFAULT 1000,
  -- 首抽 SSR 加成
  ssr_bonus_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE my_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own team"
  ON my_team FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own team"
  ON my_team FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own team"
  ON my_team FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 3. 球隊已擁有的球員 instance ─────────────────────────
CREATE TABLE IF NOT EXISTS team_player (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_user_id     UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  card_id          TEXT NOT NULL REFERENCES player_card_pool(card_id),
  level            INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 50),
  bond             INTEGER NOT NULL DEFAULT 0 CHECK (bond BETWEEN 0 AND 5),
  -- 訓練後的實際值（=base + 訓練累加）
  current_attack    INTEGER NOT NULL,
  current_defense   INTEGER NOT NULL,
  current_speed     INTEGER NOT NULL,
  current_midfield  INTEGER NOT NULL,
  current_stamina   INTEGER NOT NULL,
  current_aura      INTEGER NOT NULL,
  -- 首發 11 / 板凳
  in_starting_11    BOOLEAN NOT NULL DEFAULT false,
  position_slot     TEXT,                               -- 'GK'|'LB'|'CB1'|'CB2'|'RB'|'CM1'|'CM2'|'CAM'|'LW'|'RW'|'ST'
  obtained_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_player_team ON team_player(team_user_id);
CREATE INDEX IF NOT EXISTS idx_team_player_starting ON team_player(team_user_id, in_starting_11) WHERE in_starting_11 = true;

ALTER TABLE team_player ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own team players"
  ON team_player FOR SELECT
  USING (auth.uid() = team_user_id);

CREATE POLICY "user inserts own team players"
  ON team_player FOR INSERT
  WITH CHECK (auth.uid() = team_user_id);

CREATE POLICY "user updates own team players"
  ON team_player FOR UPDATE
  USING (auth.uid() = team_user_id)
  WITH CHECK (auth.uid() = team_user_id);

CREATE POLICY "user deletes own team players"
  ON team_player FOR DELETE
  USING (auth.uid() = team_user_id);


-- ── 4. 聯賽進度 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS league_progress (
  user_id          UUID PRIMARY KEY REFERENCES my_team(user_id) ON DELETE CASCADE,
  current_tier     INTEGER NOT NULL DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 10),
  season_num       INTEGER NOT NULL DEFAULT 1,
  matches_played   INTEGER NOT NULL DEFAULT 0,
  wins             INTEGER NOT NULL DEFAULT 0,
  draws            INTEGER NOT NULL DEFAULT 0,
  losses           INTEGER NOT NULL DEFAULT 0,
  goals_for        INTEGER NOT NULL DEFAULT 0,
  goals_against    INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE league_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own progress"
  ON league_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own progress"
  ON league_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user updates own progress"
  ON league_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 5. 訓練記錄 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_user_id     UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  player_id        UUID REFERENCES team_player(id) ON DELETE CASCADE,
  training_type    TEXT NOT NULL CHECK (training_type IN ('tactical','physical','heart','idea')),
  rp_spent         INTEGER NOT NULL,
  stat_gained      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_log_team ON training_log(team_user_id, created_at DESC);

ALTER TABLE training_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own training log"
  ON training_log FOR SELECT
  USING (auth.uid() = team_user_id);

CREATE POLICY "user inserts own training log"
  ON training_log FOR INSERT
  WITH CHECK (auth.uid() = team_user_id);


-- ── 6. 賽事歷史 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  opponent_type    TEXT NOT NULL CHECK (opponent_type IN ('ai_npc','ai_real','pvp')),
  opponent_data    JSONB NOT NULL,                     -- 對手隊伍 snapshot：teams/players/radar
  league_tier      INTEGER,
  is_boss          BOOLEAN NOT NULL DEFAULT false,     -- Tier 4+ 真實隊伍 boss 戰
  result           TEXT NOT NULL CHECK (result IN ('W','D','L')),
  score_home       INTEGER NOT NULL,
  score_away       INTEGER NOT NULL,
  match_log        JSONB DEFAULT '[]'::jsonb,          -- event timeline
  rp_earned        JSONB DEFAULT '{}'::jsonb,
  gems_earned      INTEGER NOT NULL DEFAULT 0,
  fans_delta       INTEGER NOT NULL DEFAULT 0,
  played_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_history_user ON match_history(user_id, played_at DESC);

ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own matches"
  ON match_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user inserts own matches"
  ON match_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ── 7. 贊助商狀態（預留 Phase 3）───────────────────────
CREATE TABLE IF NOT EXISTS sponsor_state (
  user_id          UUID PRIMARY KEY REFERENCES my_team(user_id) ON DELETE CASCADE,
  active_sponsors  JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_income   INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sponsor_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own sponsor state"
  ON sponsor_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user upserts own sponsor state"
  ON sponsor_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own sponsor state"
  ON sponsor_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 8. 設施狀態（預留 Phase 3）─────────────────────────
CREATE TABLE IF NOT EXISTS facility_state (
  user_id          UUID PRIMARY KEY REFERENCES my_team(user_id) ON DELETE CASCADE,
  facilities       JSONB NOT NULL DEFAULT '{}'::jsonb, -- { training_ground: 1, gym: 0, shop: 1, ... }
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE facility_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own facility state"
  ON facility_state FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user upserts own facility state"
  ON facility_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own facility state"
  ON facility_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── Helper: 抽卡 trigger — pity counter 自動更新 ────────
-- 注意：實際抽卡邏輯走 RPC（保密機率不被前端竄改），這個 trigger 是 fallback。
-- Phase 1.6 會寫 RPC `gacha_draw(p_user_id, p_count)` 真正執行抽卡。


-- ── Helper: my_team.updated_at 自動更新 ───────────────────
CREATE OR REPLACE FUNCTION update_my_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS my_team_updated_at ON my_team;
CREATE TRIGGER my_team_updated_at
  BEFORE UPDATE ON my_team
  FOR EACH ROW EXECUTE FUNCTION update_my_team_updated_at();

DROP TRIGGER IF EXISTS league_progress_updated_at ON league_progress;
CREATE TRIGGER league_progress_updated_at
  BEFORE UPDATE ON league_progress
  FOR EACH ROW EXECUTE FUNCTION update_my_team_updated_at();


-- ── 完成 ────────────────────────────────────────────────
-- 之後會 seed player_card_pool（230 張卡），seed file 走另一個 migration
