-- 麥迪挑戰賽：補上 friend_picks 的 UPDATE policy
-- 之前只有 SELECT + INSERT，所以 upsert 觸發 UPDATE 時被 RLS 擋掉 → 「改猜測」失敗
-- MVP 信任 client：任何 anon 都可以 UPDATE（之後若要嚴格化可改用
-- WHERE voter_key = current_setting('request.headers')::json->>'x-voter-key'）

DROP POLICY IF EXISTS "anon update" ON friend_picks;
CREATE POLICY "anon update"
  ON friend_picks FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
