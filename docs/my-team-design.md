# 我的球隊（My Team）— 設計文件 v0.7

> Status: 第 6 輪審完、整合 user 回饋｜2026-05-12 起草｜啟發自開羅軟體《足球俱樂部物語》
>
> **v0.7 變更**：
> - **遊戲內寶石獎勵大幅調降**（v0.6 太爛了，會淹沒既有「1-2 寶石解鎖預測分析」的經濟）：贏球 5-20 → 1-3、連勝 3 場 50 → 10、賽季冠軍 tier×100 → tier×30 等
> - **免費房獎勵改每日首次**（v0.6 是每週、使用者想多開房）：建免費房上限 1/天、加入 1/天
> - **新增「即時抽卡觸發」機制**：基本動作（擂台首投、預測 5 場、預測精準、每日登入）獎勵的 1-3 張抽券**直接彈抽卡動畫 + 角色展示**，不進背包，刺激使用者「想看抽到的角色 → 進遊戲」的衝動

---

## 1. 目標與範圍

### 1.1 為何要做
站內目前的循環（每日預測 + 擂台 + 挑戰賽）偏短期、缺累積感。「我的球隊」加入**長期養成迴圈**：抽球員 → 訓練 → 比賽 → 升聯賽，配合等距像素美術，目標讓使用者「想每天回來顧球隊」。

### 1.2 範圍邊界
- ✅ 在做：球員養成、聯賽推進、AI 比賽（複用 [js/match-sim.js](../js/match-sim.js)）、等距 pixel art、贊助/設施/球場
- ✅ 預留接口：PvP 對戰、好友球隊排行
- ❌ 不做：真實英超球員授權（用化名）、即時 3D 球賽（保持 2D 等距）、抽卡課金（純寶石）

---

## 2. 資料模型（Supabase Schema）

### 2.1 表清單

| 表名 | 用途 | row 預估 |
|---|---|---|
| `player_card_pool` | 卡池母表：所有 R/SR/SSR 球員模板 | ~300 筆固定 |
| `my_team` | 使用者的球隊 metadata（隊名、隊徽、球場等級、教練） | 1/user |
| `team_player` | 球隊已擁有的球員（抽到後 instance） | ~30/team |
| `training_log` | 訓練記錄（誰、消耗哪種 RP、屬性變化） | 5-50/day/team |
| `league_progress` | 聯賽進度（目前在第幾階、本季戰績） | 1/team |
| `match_history` | 賽事歷史（含 AI 對手快照）— PvP 也共用 | 10-100/team |
| `sponsor_state` | 贊助商簽約狀態（Phase 3） | 1/team |
| `facility_state` | 設施建造狀態（Phase 3） | 1/team |

### 2.2 主表欄位（Phase 1 必要）

```sql
-- 卡池母表（固定資料，~300 筆）
CREATE TABLE player_card_pool (
  card_id        TEXT PRIMARY KEY,           -- e.g. 'ssr-msbf-01' (姆斯巴佛)
  rarity         TEXT NOT NULL,              -- 'R' | 'SR' | 'SSR'
  name           TEXT NOT NULL,              -- 化名
  nickname       TEXT,                       -- 暱稱（例：飛人）
  position       TEXT NOT NULL,              -- 'GK'|'DEF'|'MID'|'FWD'
  base_attack    INTEGER NOT NULL,           -- 0-99
  base_defense   INTEGER NOT NULL,
  base_speed     INTEGER NOT NULL,
  base_midfield  INTEGER NOT NULL,
  base_stamina   INTEGER NOT NULL,
  base_aura      INTEGER NOT NULL,           -- 必殺技充能上限相關
  talent         TEXT,                       -- 'speedster'|'bodybuilder'|'shooter'|'wall'|'magician'|null
  inspiration    TEXT,                       -- 化名靈感說明（給開發者看，前端不顯示）
  illustration   TEXT,                       -- spritesheet 路徑 + frame index
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 使用者球隊
CREATE TABLE my_team (
  user_id        UUID PRIMARY KEY REFERENCES auth.users,
  team_name      TEXT NOT NULL,
  team_crest     TEXT NOT NULL,              -- 隊徽 emoji 或 sprite id
  coach_id       TEXT,                       -- 引用 coach_pool（之後加表）
  formation      TEXT DEFAULT '4-3-3',
  stadium_level  INTEGER DEFAULT 1,          -- 1-10
  fans           INTEGER DEFAULT 100,        -- 球迷數
  coins          INTEGER DEFAULT 5000,
  rp_tactical    INTEGER DEFAULT 0,          -- 4 種 RP
  rp_physical    INTEGER DEFAULT 0,
  rp_heart       INTEGER DEFAULT 0,
  rp_idea        INTEGER DEFAULT 0,
  pity_counter   INTEGER DEFAULT 0,          -- 抽卡保底計數
  is_pvp_visible BOOLEAN DEFAULT false,      -- 預留 PvP（Phase 3 才開）
  pvp_elo        INTEGER DEFAULT 1000,       -- 預留 PvP
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- 已擁有的球員 instance（同卡可重複抽到 → 強化）
CREATE TABLE team_player (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_user_id   UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  card_id        TEXT NOT NULL REFERENCES player_card_pool,
  level          INTEGER DEFAULT 1,          -- 訓練升級
  bond           INTEGER DEFAULT 0,          -- 重複抽到累加（影響上限）
  current_attack  INTEGER,                   -- 訓練後的實際值
  current_defense INTEGER,
  current_speed   INTEGER,
  current_midfield INTEGER,
  current_stamina  INTEGER,
  current_aura    INTEGER,
  in_starting_11  BOOLEAN DEFAULT false,
  position_slot   TEXT,                      -- 'GK'|'LB'|'CB1'|...|'ST' (對應陣型槽)
  obtained_at    TIMESTAMPTZ DEFAULT now()
);

-- 聯賽進度
CREATE TABLE league_progress (
  user_id        UUID PRIMARY KEY REFERENCES my_team(user_id),
  current_tier   INTEGER DEFAULT 1,          -- 第幾階聯賽（1=新手 → 10=傳奇）
  season_num     INTEGER DEFAULT 1,
  matches_played INTEGER DEFAULT 0,
  wins           INTEGER DEFAULT 0,
  draws          INTEGER DEFAULT 0,
  losses         INTEGER DEFAULT 0,
  goals_for      INTEGER DEFAULT 0,
  goals_against  INTEGER DEFAULT 0
);

-- 訓練記錄（debugging + 防作弊）
CREATE TABLE training_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_user_id   UUID NOT NULL REFERENCES my_team(user_id),
  player_id      UUID REFERENCES team_player,
  training_type  TEXT NOT NULL,              -- 'tactical'|'physical'|'heart'|'idea'
  rp_spent       INTEGER NOT NULL,
  stat_gained    JSONB,                      -- { attack: +2, speed: +1 }
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 賽事歷史
CREATE TABLE match_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES my_team(user_id),
  opponent_type  TEXT NOT NULL,              -- 'ai'|'pvp'(預留)
  opponent_data  JSONB NOT NULL,             -- AI: 整支對手隊伍 snapshot；PvP: opponent_user_id
  league_tier    INTEGER,
  result         TEXT,                       -- 'W'|'D'|'L'
  score_home     INTEGER,
  score_away     INTEGER,
  match_log      JSONB,                      -- 進球/紅黃牌 event timeline
  rp_earned      JSONB,                      -- { tactical: 50, ... }
  coins_earned   INTEGER,
  fans_delta     INTEGER,
  played_at      TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 RLS 政策

- 所有表：使用者只能 R/W 自己的 row（`user_id = auth.uid()`）
- `player_card_pool`：全公開 read，no write（種子資料由後台塞）
- `match_history.opponent_data` 是 JSONB：PvP 時引用 opponent_user_id，但對方資料只 read 不修改

---

## 3. 球員屬性系統

### 3.1 6 屬性與 match-sim 的對應

| 屬性 | 0-99 範圍 | match-sim.js 對應 | 影響 |
|---|---|---|---|
| **攻擊 attack** | 0-99 | `radar.attack` | 射門機率、進球機率、強傳成功率 |
| **防守 defense** | 0-99 | `radar.defense` | 搶斷成功率、阻擋射門 |
| **速度 speed** | 0-99 | `radar.speed` | 場上跑動速度（line 554）、控球率（line 255）|
| **中場 midfield** | 0-99 | `radar.midfield` | 開球控球機率、傳球網絡 |
| **體力 stamina** | 0-99 | （新加）| 比賽後半屬性衰減程度、可訓練次數/天 |
| **光環 aura** | 0-99 | （新加）| Aura gauge 充能速度（Phase 3 必殺）|

**算法**：球隊 radar = 首發 11 人平均 + 教練加成。比賽時 sim 直接拿這個進。

### 3.2 球員等級 vs 強化（兩條軸）

- **Level**（1-50）：消耗 RP 訓練升等，每升 1 級隨機 +1~3 屬性
- **Bond**（0-5）：同張卡重複抽到（5 張封頂），每星 +5 上限 + 解鎖被動

---

## 4. RP 系統（4 種研究點）

### 4.1 賺取

| 來源 | 戰術 | 體能 | 心 | 靈感 |
|---|---|---|---|---|
| 贏一場比賽（基礎） | +20 | +20 | +20 | +20 |
| 平手 | +10 | +10 | +10 | +10 |
| 輸球 | +5 | +5 | +5 | +5 |
| 教練上課（每天 1 次） | +30 | 0 | 0 | 0 |
| 體能訓練（每天 1 次） | 0 | +30 | 0 | 0 |
| 球迷活動（消耗寶石） | 0 | 0 | +30 | 0 |
| 贊助商（Phase 3 月配發） | 因贊助商不同 | | | |

### 4.2 消耗

| 用途 | 戰術 | 體能 | 心 | 靈感 |
|---|---|---|---|---|
| 升 1 級球員（一般訓練） | 10 | 10 | 0 | 0 |
| 升 1 級球員（精緻訓練） | 30 | 30 | 10 | 10 |
| 簽贊助商（Phase 3） | 0 | 0 | 50 | 0 |
| 解鎖新陣型 | 0 | 0 | 0 | 100 |
| 升級球場 +1 階 | 100 | 100 | 100 | 100 |

**設計意圖**：戰術+體能是「日常」、心+靈感是「長期」，避免單刷一種卡死。

---

## 5. 抽卡系統

### 5.1 機率

| 階 | 機率 | 內容 |
|---|---|---|
| **R** | 75% | 隨機虛構球員，4-6 屬性區間 40-65 |
| **SR** | 20% | 隨機虛構球員 + 1 種 talent，4-6 屬性區間 60-80 |
| **SSR** | 5% | 從 30 個化名名師池抽，4-6 屬性區間 75-99 |

### 5.2 保底（Pity）

- 連抽 **30 次** 無 SSR → 第 31 次必出 SSR
- `pity_counter` 抽到 SSR 重置為 0、未抽到 SSR +1

### 5.3 成本

- **1 抽**：50 寶石
- **10 連**：450 寶石（省 50，且 10 連保證至少 1 張 SR+）

### 5.4 免費抽卡管道（v0.6：站外送券、遊戲內送寶石）

**核心設計（v0.6）**：
- **站外動作 → 送抽券**（強迫進 my-team 用 → 引流入遊戲）
- **遊戲內動作 → 送寶石**（強迫回站消費 → 引流回站）
- 雙向引流：站內 ↔ 遊戲互相導流量

#### A. 站外（網站既有功能）→ 送抽券

| 來源 | 抽券 | 上限 | 觸發時機 |
|---|---|---|---|
| **擂台投票（首次/天）** | **+1 抽券** | 1/天 | 投票當下（不再送體力）|
| 擂台投票連續 7 天 | **+5 抽券** | 1/週 | streak 達成 |
| 每日登入 | **+1 抽券** | 1/天 | 進站首次 |
| 連續登入 3 / 7 / 30 天 | **+3 / +10 / +30 抽券** | streak | 連登天數 |
| 預測 5 場比分 | **+2 抽券** + 體力（§6.4）| 1/天 | 第 5 場預測完 |
| 預測精準（完全比分對）| **+3 抽券** | 每次 | 揭曉那刻 |
| 擂台留言 + 收回應 | **+1 抽券** | 5/週 | 留言當下 |
| **挑戰賽**（見 §5.5）| 抽券 | 見表 | 各動作當下 / 結算 |

#### B. 遊戲內動作 → 送寶石（雙向引流，v0.7 大幅調降避免淹沒站內經濟）

**前提**：站內既有「解鎖預測分析」單次 1-2 寶石。遊戲內贏球如果一場 +20 會淹沒既有經濟，所以全部砍 1/5~1/3。

| 來源 | 寶石 | 抽券 | 觸發時機 |
|---|---|---|---|
| 贏一場 AI 比賽 | **+1~3**（tier÷4，Tier 10 = 2-3）| — | 場結束 |
| 連勝 3 場 | **+10** | — | 第 3 勝完 |
| 連勝 5 場 | **+25** | — | 第 5 勝完 |
| 擊敗真實隊伍 Boss（§7.5）| **+30~50** | +1 SR 抽券 | 場結束 |
| 完成賽季（10 場打完）| **+tier × 10** | — | 賽季結算 |
| **賽季冠軍**（Tier N）| **+tier × 30 寶石** | **+1 SSR 自選券** | 賽季結算 |
| 抽到 SSR（首次某 SSR）| **+10** | — | 抽到當下 |
| 抽到 SSR（重複）| **+5** | — | 抽到當下 |
| 球員 Bond 升滿 5 星 | **+30** | — | 第 5 張同卡 |

**換算（v0.7）**：
- 每天玩 5-10 場 AI ≈ **5-30 寶石**（足夠站內解鎖 5-15 個預測分析、剛好）
- Tier 10 賽季冠軍 ≈ **300 寶石**（仍是大爆發點、值得追求，但不會誇張）
- 完整推完 10 階 ≈ 累積 **800-1200 寶石** (4-6 週進度)，可在站內買其他東西

**設計意圖**：
- 站外做動作 → 抽券 → 遊戲抽卡 → 比賽贏寶石 → 寶石**少量回站消費**（不會把站內變廉價）
- SSR 自選券依然稀有：只有賽季冠軍才能拿、平均 1-2 週 1 張

#### C. 經濟流向圖

```
[站外動作: 擂台/預測/登入/挑戰賽]
        │
        ▼ 送抽券
[my-team: 抽卡] → 抽到卡 → 訓練 → 比賽
                              │
                              ▼ 送寶石
[寶石] → 回站消費 / 50 寶石 = 1 抽（保底）
```

### 5.5 挑戰賽（好友房）獎勵（v0.6：防刷設計）

**問題（v0.5）**：純送抽券會被刷 — 多開幾房就有券。
**解決（v0.6）**：免費房只有「**首次**/週」低額獎勵；**抽券大額只給「有經濟成本」的房**（押注房、官方聯賽），無法靠開假房刷。

#### A. 免費房（bet = 0）— 低額、每日首次（v0.7 改成每天，鼓勵多開）

| 動作 | 獎勵 | 上限 | 防刷邏輯 |
|---|---|---|---|
| 建免費房（首次/天）| +1 體力 | **1/天** | 每天可開、但只認 1 次 |
| 加入免費房（首次/天） | +1 體力 | **1/天** | 同上 |
| 免費房結算（任何結果） | — | — | 不送（怕雙人互開刷）|

**為什麼改每天**：使用者想鼓勵社交多開房；每天首次 +1 體力 = 不會被刷（同帳 1 天 1 次），但能讓每日活躍使用者建房。

#### B. 押注房（bet > 0）— 有經濟成本、抽券大額

| 動作 | 抽券 | 寶石 | 上限 |
|---|---|---|---|
| 加入押注房（任何 bet 額） | +1 | — | 5/天 |
| 押注房結算「猜中比分（含延長）」 | **+3** | — | 不限 |
| 押注房結算「猜中勝負」 | +1 | — | 不限 |
| 押注房結算「平手都中」 | **+5** | — | 不限 |
| 押注房贏家 | +1 | 既有 | 與既有累加 |

#### C. 官方聯賽房（系統建）— 中額、每場可領

| 動作 | 抽券 | 上限 |
|---|---|---|
| 加入官方聯賽房 | +1 | 每場 1 次（同場不重複）|
| 官方聯賽結算「猜中比分」 | **+2** | 不限 |
| 官方聯賽結算「平手都中」 | **+3** | 不限 |

**為什麼這樣設計**：
- **免費房送體力不送抽券**：體力等下次預測時自然會用、不會囤、抗刷
- **押注房 / 官方聯賽才大額送抽券**：押注有真金寶石成本，官方聯賽場次系統限制，**兩個都無法刷**
- **連 5 天 streak 條件**：移除（v0.5 有，會引發開假房維持 streak），改用既有寶石 streak 不另發抽券

### 5.6 即時抽卡觸發機制（v0.7 新增 — 把抽卡動畫當「廣告」）

**洞察**：傳統做法是「動作 → 抽券進背包 → 使用者下次自己來抽」，loss 一次轉換機會。
更好的做法：**讓使用者剛在站內完成動作的當下，直接看到精美抽卡動畫 + 抽到的角色**，刺激「想再來一次 / 想進遊戲看 / 想養這隻角色」的衝動。

#### 規則：

| 來源 | ≤3 抽券 | >3 抽券 |
|---|---|---|
| 觸發方式 | **直接彈抽卡動畫**（不進背包）| 進背包，提示「N 張未開抽券，去 my-team 開卡」 |

#### 直接觸發的動作（基本日常）：

| 動作 | 抽券 | 表現 |
|---|---|---|
| 擂台首投/天 | 1 抽 | 投票送出 → 半秒 toast 「擂台投票完成 🎉 免費抽卡！」→ 點擊或自動彈 → **全屏抽卡動畫 + 角色大頭 + 屬性卡 + 「進入我的球隊 →」CTA** |
| 每日登入 | 1 抽 | 進站第一個畫面就跳抽卡 modal（onboarding 風格）|
| 預測 5 場 | 2 抽 | 第 5 場預測按下後 → 抽卡動畫（2 連抽）|
| 預測精準揭曉 | 3 抽 | 揭曉 toast 後接抽卡動畫（3 連抽）|

#### 進背包的（大額/streak）：

- 擂台連 7 天 5 抽券
- 連登 3/7/30 → 3/10/30 抽券
- 挑戰賽結算抽券（多筆累積）

#### 抽卡動畫 UX：

```
[投票/預測動作完成]
        ↓
[Toast: 🎉 免費抽卡！]
        ↓ (3 秒後自動彈 或 點擊)
[全屏 modal]
  🎰 [洗卡動畫 1.5 秒]
  ✨ [角色大頭 + 名稱 + 屬性條]
  💎 [稀有度光效 SSR / SR / R]
        ↓
[兩個 CTA：]
  [收進球隊] → 卡片留在 my-team（背景）
  [進入我的球隊 →] → 跳 my-team modal（高轉化機會）
```

#### 為什麼有效：

- 抽卡動畫 + 角色立繪是 my-team 系統最爽的時刻，**站內看到 = 廣告**
- 「進入我的球隊」CTA 直接導流、轉化率比「下次自己進來抽」高 3-5×
- 抽到 SSR 的人立刻看到精美角色 + 屬性 → 想立刻組隊試試 → 進遊戲
- 抽到 R 也讓人想「下次再來抽看會不會更好」→ 培養回站習慣

---

## 6. 聯賽與賽季結構

### 6.1 10 階聯賽

| Tier | 名稱 | 對手平均能力 | 升級門檻 |
|---|---|---|---|
| 1 | 新手聯賽 | 40 | 4 勝 |
| 2 | 業餘聯賽 | 50 | 5 勝 |
| 3 | 地區聯賽 | 60 | 6 勝 |
| 4 | 全國次級 | 70 | 6 勝 |
| 5 | 全國聯賽 | 75 | 7 勝 |
| 6 | 大陸盃 | 80 | 7 勝 |
| 7 | 歐洲菁英 | 85 | 8 勝 |
| 8 | 世界次級 | 88 | 8 勝 |
| 9 | 世界聯賽 | 92 | 9 勝 |
| 10 | 傳奇聯賽 | 95 | 10 勝（無頭循環） |

### 6.2 賽季規則

- 1 賽季 = 10 場 AI 比賽
- 7+ 勝 → 升級到下一階；3- 勝 → 降級
- 賽季結束：依排名發 RP + 寶石 + 抽卡券

### 6.3 比賽節奏

- **每場耗時**：等距視覺下 3-5 分鐘（可加速 2×/4×）
- **每天限制**：用體力槽（基礎 5 場/天，看球隊平均體力上下調），鼓勵 retention 不爆肝
- **體力不能用寶石買**（避免 P2W）

### 6.4 免費體力獲取（v0.6：擂台改純送券、體力主走預測）

體力的本質是「**我現在想多打一場**」的即時資源。**擂台已分配給抽券**（§5.4）避免重複給予；體力主來源放預測 / 文章 / 我的球隊內部連勝。

| 來源 | 體力 | 上限 | 觸發時機 |
|---|---|---|---|
| **預測一場 EPL/UCL/WC 比分** | **+1** | **5/天**（最大來源）| 預測完當下 |
| 賽前文章閱讀 30 秒以上 | +1 | 2/天 | 閱讀計時達成 |
| 建免費挑戰賽房（首次/週）| +3 | 1/週 | 建房當下 |
| 加入免費挑戰賽房（首次/天）| +1 | 1/天 | 加房當下 |
| 我的球隊：連勝 3 場 AI 不換陣型 | +1 | 1/天 | 第 3 場結束當下 |

**v0.6 拿掉的體力來源**：
- ❌ 擂台投票 → 改純送抽券（§5.4）— **避免擂台 1 動作同時拿券 + 體力**
- ❌ 擂台留言 → 同上
- ❌ 完成每日任務全套（延遲）
- ❌ 賽季冠軍 / 押注房贏家 / 挑戰賽 streak（皆延遲，改抽券）

**設計意圖**：
- **預測 → 體力主來源（5/天上限）**，鼓勵使用者把「比分預測」當每日例行
- 擂台 → 純抽券；預測 → 體力為主 + 少量抽券；挑戰賽 → 看房型（免費房體力、押注/官方送抽券）
- 每日上限 ~12 場（5 基礎 + 5 預測 + 文章 2）— 重度玩家有衝刺空間，但不會無限刷

---

## 7. SSR 化名名師清單（30 個，本名音譯微調 v0.3）

> 命名原則：取真名常見中文音譯 → **改 1-2 字（同音字）** 或 **加雙關**，保留辨識度但不直接抄。
> 例：Mbappé 常譯「姆巴佩」→ **姆霸菲**（霸+菲）｜Saliba 常譯「薩利巴」→ **薩力霸**（力霸雙關）

| # | 化名 | 位置 | 靈感（原名 / 常見中譯）|
|---|---|---|---|
| 1 | 姆霸菲 | FWD | Mbappé / 姆巴佩 |
| 2 | 哈藍登 | FWD | Haaland / 哈蘭德 |
| 3 | 維尼休士 | FWD | Vinícius / 維尼修斯 |
| 4 | 薩拉霸 | FWD | Salah / 薩拉 |
| 5 | 貝鈴翰 | FWD | Bellingham / 貝林漢（Bell→鈴雙關）|
| 6 | 梅熹 | MID | Messi / 梅西（熹=明亮）|
| 7 | 羅納斗 | FWD | C.Ronaldo / 羅納度（斗=戰）|
| 8 | 莫德利祺 | MID | Modrić / 莫德里奇 |
| 9 | 德布琅內 | MID | De Bruyne / 德布勞內 |
| 10 | 羅得里 | MID | Rodri / 羅德里 |
| 11 | 楚阿明尼 | MID | Tchouaméni / 楚阿梅尼 |
| 12 | 維拉地 | MID | Verratti / 維拉蒂 |
| 13 | 卡賽米羅 | MID | Casemiro / 卡塞米羅 |
| 14 | 范泰克 | DEF | Van Dijk / 范戴克 |
| 15 | 魯本帝亞斯 | DEF | Rúben Dias / 魯本迪亞斯 |
| 16 | 薩力霸 | DEF | Saliba / 薩利巴（力霸=強壯雙關）|
| 17 | 佩德立 | MID | Pedri / 佩德里 |
| 18 | 馬魁諾 | DEF | Marquinhos / 馬奎尼奧 |
| 19 | 哈奇咪 | DEF | Hakimi / 哈基米 |
| 20 | 戴衛斯 | DEF | Davies / 戴維斯 |
| 21 | 亞瑪兒 | FWD | Yamal / 亞馬爾 |
| 22 | 阿哩松 | GK | Alisson / 阿利松 |
| 23 | 諾依爾 | GK | Neuer / 諾伊爾 |
| 24 | 酷圖瓦 | GK | Courtois / 庫圖瓦（酷=冷靜雙關）|
| 25 | 噹納魯馬 | GK | Donnarumma / 唐納魯馬 |
| 26 | 拉壓 | GK | Raya / 拉雅（拉壓=壓制雙關）|
| 27 | 內瑪而 | FWD | Neymar / 內馬爾 |
| 28 | 凱印 | FWD | Kane / 凱恩（印=刻印傳奇雙關）|
| 29 | 三笘 燻 | MID | 三笘薫（漢字微調「薰→燻」同音）|
| 30 | 玖保 健映 | MID | 久保建英（玖=玉、映=才能耀眼）|

**版權免責**：抽卡介面下方固定一行小字「角色為向世界球星致敬之虛構卡片，名稱與屬性皆為原創設計」。

---

## 7.5 後期解鎖真實隊伍對手（user 新需求）

**Tier 1-6（前期）**：對手都是 NPC 虛構隊（系統預生成）
**Tier 7-10（後期）**：解鎖**真實隊伍當對手** — 用站內已有的資料：
- `EPL_TEAMS`（20 隊）+ `UCL_TEAMS`（36 隊）
- 對手陣容直接用該隊 `keyPlayers` 真名（站內早就用真名，一致即可）
- 對手 radar 直接用站內各隊既有 radar 數值

**漸進解鎖節奏（v0.4 user 補：早點出 + 很難打贏 = Boss 戰）**：

| Tier | 名稱 | 本聯賽 10 場中真實隊伍佔比 | 範例對手 | 對手強度 |
|---|---|---|---|---|
| 1-3 | 新手 / 業餘 / 地區 | 0/10 | NPC 隊 | tier scaling |
| **4** | 全國次級 | **1/10**（首次 Boss 出現）| 1 隊真實 EPL/UCL 隊 | **真實 radar（~80）vs 玩家 tier (~70)，會很難贏** |
| **5** | 全國聯賽 | **2/10** | EPL 中後段（如富勒姆 / 伯恩茅斯）| 真實 radar |
| **6** | 大陸盃 | **3/10** | EPL 中游 / UCL 小組賽 | 真實 radar |
| **7** | 歐洲菁英 | **4-5/10** | EPL 上半 / UCL 16 強 | 真實 radar |
| **8** | 世界次級 | **6-7/10** | UCL 8 強級 | 真實 radar |
| **9** | 世界聯賽 | **8-9/10** | UCL 4 強 + EPL Top 4 | 真實 radar |
| **10** | 傳奇聯賽 | **10/10**（全真實）| PSG / 皇馬 / 兵工廠 / 拜仁，每場都是世界冠軍級 | 真實 radar |

**核心設計（v0.4）**：
- **強度不照 tier scaling** — 真實隊伍直接用站內 EPL/UCL radar（~80-95），所以在 Tier 4 遇到真實隊伍就是「**強敵亂入 Boss 戰**」，玩家可能要嘗試 3-5 次才打得贏
- **獎勵高**：擊敗真實隊伍 +200 寶石 + 1 SR 抽券（NPC 只給基礎 RP）
- **稀有感**：真實隊伍在賽程表上會標 ⭐ icon，玩家會「期待 / 緊張」這場
- **隨 tier 上升越來越普遍**：到 Tier 10 全部都是 boss，使用者已升級到能對抗世界級的程度

**為什麼可行**：站內已用真名顯示這些球隊，新 feature 不額外侵權；且使用者打到後期看到「我的小卡 SSR 隊 vs 真兵工廠」的時刻**極具成就感**。

---

## 8. AI 對手生成

每階聯賽預先生成 10 支 NPC 隊（種子固定，跨使用者一樣）：
- 隊名 + 隊徽 + 11 球員（屬性 = tier 平均 ± 隨機 8）
- 跨階差距明顯：tier 1 平均 40 / tier 10 平均 95
- 比賽時 sim 直接吃 NPC 的 radar 跑

**為什麼 AI 預生成而非每場 random**：玩家會記得「上次輸的那隊」想復仇，產生敘事感。

---

## 9. PvP 預留設計（Phase 3 才開）

- `my_team.is_pvp_visible` 開啟即放上排行
- `pvp_elo` ELO 制配對
- PvP 比賽用 `match_history` 同表，opponent_data 存對方 user_id + 快照
- 球員不消耗體力（避免 PvP 被搶光體力影響 AI 闖關）

---

## 10. 經濟平衡（粗估）

| 玩家投入 | 預估產出 |
|---|---|
| 每天 10 分鐘 | 跑 3 場、訓練 3 次、抽 1-2 張 |
| 每天 30 分鐘 | 跑 5 場、訓練 5 次、可累寶石抽 10 連 |
| 每週 5 小時 | 推進 1-2 個聯賽階 |
| 從 Tier 1 到 Tier 10 | 估 **4-6 週**（每天 20 分鐘） |

抽到第一張 SSR 預期：**第 5-8 抽**（不踩保底）或 **第 30 抽**（保底）。

---

## 11. v0.1 開放問題 — 已收 user 回覆

| # | 問題 | 結論 |
|---|---|---|
| Q1 | 寶石抽卡 1 抽價 | **50 寶石** ＋ §5.4 加免費管道（每日登入、任務、預測） |
| Q2 | SSR 機率 | **5%**，並加「Tier 7-10 解鎖真實隊伍對手」（§7.5） |
| Q3 | 30 SSR 化名 | **全做**，已改成台灣球迷常稱 + 雙關（§7） |
| Q4 | 球員可賣 | **可賣**（換寶石，避免卡爆滿） |
| Q5 | 薪資上限 | **否** |
| Q6 | 體力寶石購買 | **否**，但 §6.4 開「站內動作換體力」（預測/擂台/任務） |
| Q7 | 賽季冠軍獎勵 | tier × 100 寶石 + 1 張 SSR 自選券 |
| Q8 | 教練系統 | **做**（Phase 3） |
| Q9 | 球場升級 | **兩者都有**：視覺 + 主場 +5%/階 進球機率 |
| Q10 | 等距素材 | **靠 Claude 處理**（先試 CC0 拼裝，必要時請美術或 AI 生圖客製，最終提交可用版） |
| Q11 | 入口位置 | **懸浮 FAB + 網站背景裝飾換成自己球員**（§11.5 詳述） |
| Q12 | 強制建隊 | **強制**（不建不能玩，可跳過用預設隊名/隊徽） |

---

## 11.5 入口與全站整合（user 新需求 Q11 補）

**核心需求**：「我的球隊」不只是新增一個頁面，要**滲透全站背景**讓使用者擁有「這是我的世界」的感覺。

### 11.5.1 懸浮入口（FAB）

- 全站右下角懸浮按鈕：⚽ 形狀，圈中顯示球隊隊徽
- 浮動可點 → 開「我的球隊」全屏 modal
- 有未領獎勵 / 賽季可打時，按鈕加紅點+數字
- 行動裝置避開底部 nav bar 不擋路

### 11.5.2 背景球員 Sprite 替換（**Phase 1 不做，看效果再決定**）

⚠️ **v0.3 user 補**：使用者要求 Phase 1 先只做 FAB 看效果，背景替換等真正用過 sprite 美術風格後再評估要不要全站滲透。

未來如果走這條（Phase 2 之後再評估）：
- 首頁 hero 區背景：原本是靜態圖 → 改成等距 pixel 球員 5-7 個小人 idle 動畫
- 預測比分卡背景紋：放使用者球隊隊徽淡水印
- 頁面 footer 上方：一條「我的首發 11 人縮圖列」可點跳「我的球隊」
- 未登入 / 沒建隊：用預設範例球隊演示，誘導建隊

### 11.5.3 實作分階（v0.3 修訂）

| Phase | 範圍 | 備註 |
|---|---|---|
| **Phase 1** | **FAB 浮動入口 + 「我的球隊」全屏 modal**（不動其他頁背景） | 確定要做 |
| Phase 2 | 可選：hero 區 + footer 加裝飾性球員 sprite | **看 Phase 1 效果再決定** |
| Phase 3 | 可選：全站背景紋 + 頁面 transition 動畫加自家球員 | 看 Phase 2 效果再決定 |

---

## 12. 下一步（v0.2 確認後）

1. 你最後審 v0.2 — 主要是看：
   - §7 SSR 化名清單滿不滿意（特別是哪些需微調 / 換）
   - §7.5 後期遇真實隊伍邏輯 OK 嗎
   - §5.4 + §6.4 免費資源比例會不會太佛 / 太摳
   - §11.5 全站滲透設計（hero 區 / footer / FAB 三層整合）
2. 你點頭後我開始：
   - 寫 Supabase migration SQL（8 張表 + RLS）
   - Seed `player_card_pool` 30 SSR + ~50 SR + ~150 R 共 ~230 張卡
   - Phase 1 code：FAB + 抽卡 UI + 球隊管理 + 訓練 + 接 match-sim
3. 美術階段我會先試 Kenney / itch.io 找 CC0 等距足球 sprite；若拼湊不出滿意的、會回來確認要不要請 AI 生圖客製（如 Stable Diffusion / Midjourney 的 pixel art LoRA）
