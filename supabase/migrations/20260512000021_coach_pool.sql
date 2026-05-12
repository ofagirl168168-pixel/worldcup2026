-- ============================================================
-- 我的球隊 — 教練池系統
-- 設計依據 docs/coach-pool-design.md v0.1
-- ============================================================

-- ── 1. 教練池母表（公開只讀）─────────────────────────────
CREATE TABLE IF NOT EXISTS coach_pool (
  coach_id      TEXT PRIMARY KEY,
  rarity        TEXT NOT NULL CHECK (rarity IN ('R','SR','SSR')),
  name          TEXT NOT NULL,                  -- 化名
  nickname      TEXT,                            -- 標籤（如 "戰術大師"）
  trait         TEXT NOT NULL,                   -- e.g. 'tiki_taka', 'attack_3', 'youth_developer'
  trait_value   JSONB,                           -- 額外參數（attr / pct 等）
  inspiration   TEXT,                            -- 原型註記（開發者用）
  look_data     JSONB,                           -- SSR 固定形象（R/SR null = 隨機）
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_pool_rarity ON coach_pool(rarity);
ALTER TABLE coach_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read coach pool" ON coach_pool FOR SELECT USING (true);

-- ── 2. 已聘用教練 instance ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_coach (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  coach_id      TEXT NOT NULL REFERENCES coach_pool(coach_id),
  level         INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  bond          INTEGER NOT NULL DEFAULT 0 CHECK (bond BETWEEN 0 AND 5),
  look_data     JSONB,                          -- R/SR 隨機形象
  hired_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_coach_user ON user_coach(user_id);
ALTER TABLE user_coach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own coaches" ON user_coach FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "user inserts own coaches" ON user_coach FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own coaches" ON user_coach FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. my_team 加教練欄位 ──────────────────────────────
ALTER TABLE my_team
  ADD COLUMN IF NOT EXISTS coach_tickets INT NOT NULL DEFAULT 1,    -- 新人贈 1 張
  ADD COLUMN IF NOT EXISTS coach_pity_counter INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_coach_id UUID REFERENCES user_coach(id) ON DELETE SET NULL;

-- 已存在的使用者也送 1 張券（idempotent）
UPDATE my_team SET coach_tickets = 1 WHERE coach_tickets IS NULL OR coach_tickets = 0;

-- ── 4. 教練隨機 look 產生器（R/SR 用）──
CREATE OR REPLACE FUNCTION generate_random_coach_look()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_bodies      TEXT[] := ARRAY['light','olive','amber','brown','bronze'];
  v_eyes        TEXT[] := ARRAY['blue','brown','gray','green'];
  -- 教練偏熟齡：髮型多選 balding/buzzcut/swoop/plain/short
  v_hair_styles TEXT[] := ARRAY[
    'plain','plain','swoop','swoop','high_and_tight',
    'buzzcut','balding','balding','wavy','bedhead','spiked','curly_long'
  ];
  v_hair_colors TEXT[] := ARRAY['black','blonde','gray','white','ginger'];
  v_beards      TEXT[] := ARRAY['5oclock_shadow','basic','medium','trimmed'];
  v_hair_color  TEXT;
  v_hair_style  TEXT;
BEGIN
  v_hair_style := v_hair_styles[1 + floor(random() * array_length(v_hair_styles,1))];
  v_hair_color := v_hair_colors[1 + floor(random() * array_length(v_hair_colors,1))];

  RETURN jsonb_build_object(
    'body',           v_bodies[1 + floor(random() * array_length(v_bodies,1))],
    'eye_color',      v_eyes[1 + floor(random() * array_length(v_eyes,1))],
    'wrinkles',       CASE WHEN random() < 0.5 THEN 'on' ELSE 'none' END,  -- 教練 50% wrinkles
    'hair_style',     v_hair_style,
    'hair_color',     v_hair_color,
    'beard_style',    CASE WHEN random() < 0.6 THEN v_beards[1 + floor(random() * array_length(v_beards,1))] ELSE 'none' END,
    'mustache_style', 'none',
    'beard_color',    v_hair_color
  );
END;
$$;

-- ── 5. 教練扭蛋 RPC ──
CREATE OR REPLACE FUNCTION coach_gacha_draw(
  p_count INT,
  p_source TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_team         my_team%ROWTYPE;
  v_results      JSONB := '[]'::jsonb;
  v_coach        coach_pool%ROWTYPE;
  v_pity         INT;
  v_force_ssr    BOOLEAN;
  v_rarity       TEXT;
  v_roll         INT;
  v_look         JSONB;
  v_user_coach_id UUID;
  i              INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count < 1 OR p_count > 10 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  SELECT * INTO v_team FROM my_team WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_TEAM'; END IF;
  IF v_team.coach_tickets < p_count THEN RAISE EXCEPTION 'INSUFFICIENT_COACH_TICKETS'; END IF;

  v_pity := v_team.coach_pity_counter;

  FOR i IN 1..p_count LOOP
    -- 保底：連 30 抽無 SSR → 必中（同球員池）
    v_force_ssr := (v_pity >= 30);
    IF v_force_ssr THEN
      v_rarity := 'SSR'; v_pity := 0;
    ELSE
      v_roll := floor(random() * 100)::int;
      IF v_roll < 5 THEN v_rarity := 'SSR'; v_pity := 0;
      ELSIF v_roll < 30 THEN v_rarity := 'SR'; v_pity := v_pity + 1;
      ELSE v_rarity := 'R'; v_pity := v_pity + 1;
      END IF;
    END IF;

    SELECT * INTO v_coach FROM coach_pool
    WHERE rarity = v_rarity ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'NO_COACH_IN_POOL: %', v_rarity; END IF;

    -- look_data：SSR 用卡池固定；R/SR 隨機生
    IF v_rarity = 'SSR' AND v_coach.look_data IS NOT NULL THEN
      v_look := v_coach.look_data;
    ELSE
      v_look := generate_random_coach_look();
    END IF;

    INSERT INTO user_coach (user_id, coach_id, look_data)
    VALUES (v_uid, v_coach.coach_id, v_look)
    RETURNING id INTO v_user_coach_id;

    v_results := v_results || jsonb_build_object(
      'user_coach_id', v_user_coach_id,
      'coach_id',      v_coach.coach_id,
      'rarity',        v_coach.rarity,
      'name',          v_coach.name,
      'nickname',      v_coach.nickname,
      'trait',         v_coach.trait,
      'trait_value',   v_coach.trait_value,
      'look_data',     v_look,
      'forced_ssr',    v_force_ssr
    );
  END LOOP;

  UPDATE my_team
  SET coach_tickets = coach_tickets - p_count,
      coach_pity_counter = v_pity,
      updated_at = now()
  WHERE user_id = v_uid;

  RETURN jsonb_build_object('coaches', v_results, 'pity_after', v_pity, 'source', p_source);
END;
$$;

GRANT EXECUTE ON FUNCTION generate_random_coach_look() TO authenticated;
GRANT EXECUTE ON FUNCTION coach_gacha_draw(INT, TEXT) TO authenticated;

-- ── 6. 設定主教練 RPC ──
CREATE OR REPLACE FUNCTION set_active_coach(p_user_coach_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  -- 驗證該 user_coach 真的是這個使用者的
  IF p_user_coach_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM user_coach WHERE id = p_user_coach_id AND user_id = v_uid) INTO v_exists;
    IF NOT v_exists THEN RAISE EXCEPTION 'NOT_YOUR_COACH'; END IF;
  END IF;
  UPDATE my_team SET active_coach_id = p_user_coach_id WHERE user_id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION set_active_coach(UUID) TO authenticated;
