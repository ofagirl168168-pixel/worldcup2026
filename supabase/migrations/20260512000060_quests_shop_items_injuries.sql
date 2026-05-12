-- ============================================================
-- 我的球隊 Phase 3.2 — 任務 / 圖鑑 / 商店 / 道具 / 傷病
--   - quest_template / user_quest_state（任務）
--   - item_template / user_inventory（道具）
--   - team_player.injured_until（傷病）
-- 圖鑑用既有 player_card_pool + team_player，不需新表
-- 商店用 quest 系統的 RPC 直接消耗寶石、不需 schema
-- ============================================================

-- ── 1. 任務 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS quest_template (
  quest_id     TEXT PRIMARY KEY,
  quest_type   TEXT NOT NULL CHECK (quest_type IN ('daily','weekly','season')),
  name         TEXT NOT NULL,
  description  TEXT,
  action       TEXT NOT NULL,        -- 'gacha_draw' | 'match_play' | 'train' | 'predict_match' | 'arena_vote' | 'pvp_play'
  target_count INT  NOT NULL,
  reward       JSONB NOT NULL,       -- { tickets:1, gems:5, rp_tactical:5, ... }
  display_order INT DEFAULT 0
);
ALTER TABLE quest_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads quests" ON quest_template FOR SELECT USING (true);

-- 使用者進度（daily 每日 reset、weekly 每週一 reset）
CREATE TABLE IF NOT EXISTS user_quest_state (
  user_id        UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  quest_id       TEXT NOT NULL REFERENCES quest_template(quest_id),
  period_key     TEXT NOT NULL,             -- e.g. '2026-05-12' / '2026-W19'
  current_count  INT NOT NULL DEFAULT 0,
  claimed        BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, quest_id, period_key)
);
ALTER TABLE user_quest_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own quest state" ON user_quest_state FOR SELECT
  USING (auth.uid() = user_id);

-- ── 2. 道具 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_template (
  item_id      TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL,           -- emoji or svg id
  description  TEXT,
  effect       TEXT NOT NULL,           -- 'xp_book' | 'immunity' | 'rp_pack' | 'stamina_pot' | 'ticket' | 'gem'
  effect_value JSONB,                   -- { amount: 100, attr: 'tactical', ... }
  shop_cost_gems INT,                   -- null = 不在商店賣（活動專屬）
  display_order INT DEFAULT 0
);
ALTER TABLE item_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads items" ON item_template FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS user_inventory (
  user_id   UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  item_id   TEXT NOT NULL REFERENCES item_template(item_id),
  count     INT NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, item_id)
);
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own inventory" ON user_inventory FOR SELECT
  USING (auth.uid() = user_id);

-- ── 3. 傷病 ────────────────────────────────────
ALTER TABLE team_player
  ADD COLUMN IF NOT EXISTS injured_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_team_player_injured ON team_player(team_user_id, injured_until);

-- ── 4. 任務進度 RPC ─────────────────────────────
-- 用 daily/weekly period_key（Asia/Taipei）；任何 client 動作完呼叫
CREATE OR REPLACE FUNCTION track_quest(p_action TEXT, p_amount INT DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_completed JSONB := '[]'::jsonb;
  v_quest     RECORD;
  v_period    TEXT;
  v_tw_date   DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_state     RECORD;
BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;

  FOR v_quest IN SELECT * FROM quest_template WHERE action = p_action LOOP
    -- period_key
    v_period := CASE v_quest.quest_type
      WHEN 'daily'  THEN to_char(v_tw_date, 'YYYY-MM-DD')
      WHEN 'weekly' THEN to_char(v_tw_date, 'IYYY-"W"IW')
      WHEN 'season' THEN 'all-time'
    END;

    -- upsert state
    INSERT INTO user_quest_state (user_id, quest_id, period_key, current_count)
    VALUES (v_uid, v_quest.quest_id, v_period, p_amount)
    ON CONFLICT (user_id, quest_id, period_key)
    DO UPDATE SET current_count = LEAST(v_quest.target_count, user_quest_state.current_count + p_amount)
    RETURNING * INTO v_state;

    -- 通知前端有任務剛完成（claim 是另一個 action）
    IF v_state.current_count >= v_quest.target_count AND NOT v_state.claimed THEN
      v_completed := v_completed || jsonb_build_object(
        'quest_id', v_quest.quest_id, 'name', v_quest.name, 'reward', v_quest.reward
      );
    END IF;
  END LOOP;

  RETURN v_completed;
END;
$$;
GRANT EXECUTE ON FUNCTION track_quest(TEXT, INT) TO authenticated;

-- ── 5. 領取任務獎勵 RPC ──────────────────────
CREATE OR REPLACE FUNCTION claim_quest_reward(p_quest_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_quest  quest_template%ROWTYPE;
  v_state  user_quest_state%ROWTYPE;
  v_period TEXT;
  v_tw_date DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_reward JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_quest FROM quest_template WHERE quest_id = p_quest_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_QUEST'; END IF;

  v_period := CASE v_quest.quest_type
    WHEN 'daily'  THEN to_char(v_tw_date, 'YYYY-MM-DD')
    WHEN 'weekly' THEN to_char(v_tw_date, 'IYYY-"W"IW')
    WHEN 'season' THEN 'all-time'
  END;

  SELECT * INTO v_state FROM user_quest_state
    WHERE user_id = v_uid AND quest_id = p_quest_id AND period_key = v_period FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_PROGRESS'; END IF;
  IF v_state.claimed THEN RAISE EXCEPTION 'ALREADY_CLAIMED'; END IF;
  IF v_state.current_count < v_quest.target_count THEN RAISE EXCEPTION 'NOT_COMPLETED'; END IF;

  v_reward := v_quest.reward;
  -- 套用獎勵
  IF (v_reward ? 'tickets') THEN
    UPDATE my_team SET tickets = tickets + (v_reward->>'tickets')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'gems') THEN
    UPDATE profiles SET gems = gems + (v_reward->>'gems')::int WHERE id = v_uid;
  END IF;
  IF (v_reward ? 'coach_tickets') THEN
    UPDATE my_team SET coach_tickets = coach_tickets + (v_reward->>'coach_tickets')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'rp_all') THEN
    UPDATE my_team SET
      rp_tactical = rp_tactical + (v_reward->>'rp_all')::int,
      rp_physical = rp_physical + (v_reward->>'rp_all')::int,
      rp_heart    = rp_heart    + (v_reward->>'rp_all')::int,
      rp_idea     = rp_idea     + (v_reward->>'rp_all')::int
    WHERE user_id = v_uid;
  END IF;

  UPDATE user_quest_state SET claimed = true
  WHERE user_id = v_uid AND quest_id = p_quest_id AND period_key = v_period;

  RETURN jsonb_build_object('quest_id', p_quest_id, 'reward', v_reward);
END;
$$;
GRANT EXECUTE ON FUNCTION claim_quest_reward(TEXT) TO authenticated;

-- ── 6. 商店 RPC（買道具 / 把寶石換抽券）──
CREATE OR REPLACE FUNCTION buy_shop_item(p_item_id TEXT, p_count INT DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_item      item_template%ROWTYPE;
  v_total_cost INT;
  v_gems_cur  INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count < 1 OR p_count > 99 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  SELECT * INTO v_item FROM item_template WHERE item_id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_ITEM'; END IF;
  IF v_item.shop_cost_gems IS NULL THEN RAISE EXCEPTION 'NOT_FOR_SALE'; END IF;

  v_total_cost := v_item.shop_cost_gems * p_count;
  SELECT gems INTO v_gems_cur FROM profiles WHERE id = v_uid;
  IF COALESCE(v_gems_cur, 0) < v_total_cost THEN RAISE EXCEPTION 'INSUFFICIENT_GEMS'; END IF;

  UPDATE profiles SET gems = gems - v_total_cost WHERE id = v_uid;

  -- effect 'ticket'/'coach_ticket'/'gem'：直接給；其他 effect：進 inventory 等之後 use
  IF v_item.effect = 'ticket' THEN
    UPDATE my_team SET tickets = tickets + (v_item.effect_value->>'amount')::int * p_count
      WHERE user_id = v_uid;
  ELSIF v_item.effect = 'coach_ticket' THEN
    UPDATE my_team SET coach_tickets = coach_tickets + (v_item.effect_value->>'amount')::int * p_count
      WHERE user_id = v_uid;
  ELSIF v_item.effect = 'stamina_pot' THEN
    UPDATE my_team SET stamina = LEAST(stamina_max, stamina + (v_item.effect_value->>'amount')::int * p_count)
      WHERE user_id = v_uid;
  ELSE
    -- 進 inventory（之後用 use_item）
    INSERT INTO user_inventory (user_id, item_id, count) VALUES (v_uid, p_item_id, p_count)
    ON CONFLICT (user_id, item_id) DO UPDATE SET count = user_inventory.count + p_count;
  END IF;

  RETURN jsonb_build_object('item_id', p_item_id, 'count', p_count, 'gems_spent', v_total_cost);
END;
$$;
GRANT EXECUTE ON FUNCTION buy_shop_item(TEXT, INT) TO authenticated;

-- ── 7. 使用道具 RPC ──────────────────────────
CREATE OR REPLACE FUNCTION use_item(p_item_id TEXT, p_target_player_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_item    item_template%ROWTYPE;
  v_inv     user_inventory%ROWTYPE;
  v_amount  INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;

  SELECT * INTO v_item FROM item_template WHERE item_id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_ITEM'; END IF;

  SELECT * INTO v_inv FROM user_inventory WHERE user_id = v_uid AND item_id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_inv.count < 1 THEN RAISE EXCEPTION 'NOT_OWNED'; END IF;

  v_amount := COALESCE((v_item.effect_value->>'amount')::int, 1);

  -- 套用效果
  IF v_item.effect = 'xp_book' THEN
    -- 加目標球員 level（不超過 50）
    IF p_target_player_id IS NULL THEN RAISE EXCEPTION 'NEED_TARGET_PLAYER'; END IF;
    UPDATE team_player SET level = LEAST(50, level + v_amount)
    WHERE id = p_target_player_id AND team_user_id = v_uid;
  ELSIF v_item.effect = 'rp_pack' THEN
    UPDATE my_team SET
      rp_tactical = rp_tactical + v_amount,
      rp_physical = rp_physical + v_amount,
      rp_heart    = rp_heart    + v_amount,
      rp_idea     = rp_idea     + v_amount
    WHERE user_id = v_uid;
  ELSIF v_item.effect = 'recovery' THEN
    -- 治療指定球員傷病
    IF p_target_player_id IS NULL THEN RAISE EXCEPTION 'NEED_TARGET_PLAYER'; END IF;
    UPDATE team_player SET injured_until = NULL
    WHERE id = p_target_player_id AND team_user_id = v_uid;
  ELSE
    RAISE EXCEPTION 'UNSUPPORTED_EFFECT';
  END IF;

  -- 扣道具
  UPDATE user_inventory SET count = count - 1
  WHERE user_id = v_uid AND item_id = p_item_id;

  RETURN jsonb_build_object('item_id', p_item_id, 'applied', true);
END;
$$;
GRANT EXECUTE ON FUNCTION use_item(TEXT, UUID) TO authenticated;

-- ── 8. 受傷觸發（match-sim 結束後呼叫；3 天不能出賽）──
CREATE OR REPLACE FUNCTION injure_random_player(p_chance_pct INT DEFAULT 8)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_player  RECORD;
  v_days    INT;
BEGIN
  IF v_uid IS NULL THEN RETURN '[]'::jsonb; END IF;
  -- 隨機機率不傷 → 結束
  IF random() * 100 >= p_chance_pct THEN
    RETURN jsonb_build_object('injured', false);
  END IF;
  -- 從首發 11 隨機選 1（已傷的不選）
  SELECT tp.id, pc.name INTO v_player FROM team_player tp
  JOIN player_card_pool pc ON pc.card_id = tp.card_id
  WHERE tp.team_user_id = v_uid AND tp.in_starting_11
    AND (tp.injured_until IS NULL OR tp.injured_until < now())
  ORDER BY random() LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('injured', false); END IF;
  v_days := 2 + floor(random() * 3);  -- 2-4 天
  UPDATE team_player SET injured_until = now() + (v_days || ' days')::interval WHERE id = v_player.id;
  RETURN jsonb_build_object('injured', true, 'player_id', v_player.id, 'name', v_player.name, 'days', v_days);
END;
$$;
GRANT EXECUTE ON FUNCTION injure_random_player(INT) TO authenticated;
