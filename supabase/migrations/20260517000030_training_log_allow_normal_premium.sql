-- training_log.training_type CHECK constraint 過時：只允許 tactical/physical/heart/idea
-- 但 train_player RPC 寫入的是 normal/premium → 違反 constraint → 整個 RPC 400
--   (使用者點精英特訓/集訓升等 確認 → POST 400、不消耗 RP 也不升等)
--
-- 修法：DROP 舊 CHECK + ADD 新 CHECK 允許新的 train mode + 保留舊值以防其他地方寫入
ALTER TABLE training_log DROP CONSTRAINT IF EXISTS training_log_training_type_check;
ALTER TABLE training_log ADD CONSTRAINT training_log_training_type_check
  CHECK (training_type IN (
    -- 現役 (train_player RPC)
    'normal', 'premium',
    -- 舊版本 / 集訓營 預留
    'tactical', 'physical', 'heart', 'idea',
    'tier1', 'tier2', 'tier3', 'tier4'
  ));
