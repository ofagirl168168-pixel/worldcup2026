-- ============================================================
-- 修正：寶石不在 profiles 表（gem_balance 是 view、實際儲存在 gem_transactions）
-- 受影響：claim_quest_reward、buy_item — 都試圖 UPDATE profiles SET gems
-- 同時順便修正商店抽券定價（之前比直接抽卡還貴 → 改成有合理折扣）
-- ============================================================

-- ── 1. 修正 claim_quest_reward：寶石獎勵改 INSERT gem_transactions ──
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
  IF (v_reward ? 'tickets') THEN
    UPDATE my_team SET tickets = tickets + (v_reward->>'tickets')::int WHERE user_id = v_uid;
  END IF;
  IF (v_reward ? 'gems') THEN
    -- 寶石獎勵：寫 gem_transactions（type=quest_reward）
    INSERT INTO gem_transactions (user_id, amount, type, ref_id, date)
    VALUES (v_uid, (v_reward->>'gems')::int, 'quest_reward', p_quest_id, v_tw_date);
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

-- ── 2. 修正 buy_item：寶石檢查/扣除改用 gem_balance view + gem_transactions ──
CREATE OR REPLACE FUNCTION buy_item(p_item_id TEXT, p_count INT)
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
  v_tw_date   DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_LOGGED_IN'; END IF;
  IF p_count < 1 OR p_count > 99 THEN RAISE EXCEPTION 'INVALID_COUNT'; END IF;

  SELECT * INTO v_item FROM item_template WHERE item_id = p_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_ITEM'; END IF;
  IF v_item.shop_cost_gems IS NULL THEN RAISE EXCEPTION 'NOT_FOR_SALE'; END IF;

  v_total_cost := v_item.shop_cost_gems * p_count;
  SELECT COALESCE(balance, 0) INTO v_gems_cur FROM gem_balance WHERE user_id = v_uid;
  IF COALESCE(v_gems_cur, 0) < v_total_cost THEN RAISE EXCEPTION 'INSUFFICIENT_GEMS'; END IF;

  -- 扣寶石：寫負額 gem_transactions（type=shop_purchase）
  INSERT INTO gem_transactions (user_id, amount, type, ref_id, date)
  VALUES (v_uid, -v_total_cost, 'shop_purchase', p_item_id, v_tw_date);

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
    INSERT INTO user_inventory (user_id, item_id, count) VALUES (v_uid, p_item_id, p_count)
    ON CONFLICT (user_id, item_id) DO UPDATE SET count = user_inventory.count + p_count;
  END IF;

  RETURN jsonb_build_object('item_id', p_item_id, 'count', p_count, 'gems_spent', v_total_cost);
END;
$$;

-- ── 3. 修正商店抽券定價：之前比直接抽卡還貴 → 改成有合理折扣 ──
-- 直接抽卡價：1 抽 = 5 gems、10 抽 = 45 gems、1 教練 = 20 gems
-- 商店應更便宜（鼓勵囤券）
UPDATE item_template SET shop_cost_gems = 5  WHERE item_id = 'ticket_x1';      -- 原 8 → 5（同直抽價）
UPDATE item_template SET shop_cost_gems = 38 WHERE item_id = 'ticket_x10';     -- 原 60 → 38（15% off 直抽 45）
UPDATE item_template SET shop_cost_gems = 16 WHERE item_id = 'coach_ticket';   -- 原 25 → 16（20% off 直抽 20）
