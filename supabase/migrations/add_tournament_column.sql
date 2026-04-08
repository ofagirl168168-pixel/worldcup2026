-- 新增 tournament 欄位，區分世界盃與歐冠資料
-- 預設值 'wc' 確保現有資料不受影響

-- predictions 表
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'wc';

-- daily_answers 表
ALTER TABLE daily_answers
  ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'wc';

-- arena_picks 表
ALTER TABLE arena_picks
  ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'wc';

-- arena_daily 表
ALTER TABLE arena_daily
  ADD COLUMN IF NOT EXISTS tournament text NOT NULL DEFAULT 'wc';

-- 更新 unique constraint（如果存在）讓同一用戶可以有 wc 和 ucl 兩筆
-- predictions: 改為 (user_id, tournament) 唯一
-- 先嘗試刪除舊的 unique constraint
DO $$ BEGIN
  ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_key;
  ALTER TABLE predictions ADD CONSTRAINT predictions_user_tournament_key UNIQUE (user_id, tournament);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- arena_picks: 改為 (user_id, tournament) 唯一
DO $$ BEGIN
  ALTER TABLE arena_picks DROP CONSTRAINT IF EXISTS arena_picks_user_id_key;
  ALTER TABLE arena_picks ADD CONSTRAINT arena_picks_user_tournament_key UNIQUE (user_id, tournament);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- arena_daily: 改為 (user_id, tournament) 唯一
DO $$ BEGIN
  ALTER TABLE arena_daily DROP CONSTRAINT IF EXISTS arena_daily_user_id_key;
  ALTER TABLE arena_daily ADD CONSTRAINT arena_daily_user_tournament_key UNIQUE (user_id, tournament);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- daily_answers: 改為 (user_id, tournament) 唯一
DO $$ BEGIN
  ALTER TABLE daily_answers DROP CONSTRAINT IF EXISTS daily_answers_user_id_key;
  ALTER TABLE daily_answers ADD CONSTRAINT daily_answers_user_tournament_key UNIQUE (user_id, tournament);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 重建 leaderboard VIEW（加入 tournament 欄位）
DROP VIEW IF EXISTS leaderboard;
CREATE VIEW leaderboard AS
SELECT p.id, p.nickname, p.xp, p.correct_answers, p.total_answered, p.team_code, p.updated_at
FROM profiles p ORDER BY p.xp DESC;
