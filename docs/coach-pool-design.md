# 教練池系統設計 v0.1

## 核心決定

- **與球員分池**：獨立扭蛋、獨立資源、獨立 SSR 機率
- **每隊一位主教練**：上場時 buff 整隊；可隨時更換（不消耗）
- **抽券來源**：「教練聘任券」獨立資源，不能用球員抽券換

理由：
1. 心理感受：玩家「想抽前鋒」時被塞教練 → 失望；想升級陣容時主動點教練池 → 正向期待
2. 機率設計：兩池各自獨立調整，不會稀釋球員 SSR 命中率
3. 經濟模型：兩種券、兩個 banner、活躍週期更長
4. 業內慣例：開羅遊戲、足球俱樂部物語、實況足球都採分池

---

## 一、教練稀有度 + buff 設計

| 稀有度 | 機率 | 數量 | trait 加成 | 設計重點 |
|---|---|---|---|---|
| R | 70% | 12 | 單一屬性 +3% | 入門用、初期訓練輔助 |
| SR | 25% | 12 | 兩屬性 +5% 或機制 trait | 中期主力 |
| SSR | 5% | 8 | 大幅 buff + 機制 trait | 真實 / 名人教練、終局目標 |

**保底**：連 30 抽無 SSR → 第 31 必出

---

## 二、Trait 類型

### 通用 buff trait

| Trait | 效果 | 適用稀有度 |
|---|---|---|
| `tactician` | 全隊 midfield +5% | R/SR |
| `motivator` | 全隊 aura +5% | R/SR |
| `defensive_master` | 全隊 defense +8% | SR |
| `offensive_master` | 全隊 attack +8% | SR |
| `speed_coach` | 全隊 speed +8% | SR |
| `physio` | 比賽後體力恢復 +20% | SR |
| `youth_developer` | 訓練 RP 效率 +25%（Lv. ≤ 20 球員） | SR |
| `veteran_handler` | 老將（>30 歲標記）戰力 +10% | SSR |
| `champion_mentality` | 1-0 領先後不會被翻盤的機率 +30% | SSR |
| `tiki_taka` | 中場控球時 attack +15% | SSR |
| `iron_wall` | 對手射門 -15% | SSR |
| `gegen_press` | 全隊 stamina 消耗 -20% | SSR |
| `dream_team` | 場上球員若 ≥3 位 SSR → 全屬性 +20% | SSR |

### 屬性 buff（給 R 用）

R 教練只給單一屬性 +3%：`attack_3 / defense_3 / speed_3 / midfield_3 / stamina_3 / aura_3`

---

## 三、SSR 教練名單（8 位真實名帥化名）

| 化名 | 原型 | 風格 | Trait | LPC look 重點 |
|---|---|---|---|---|
| 瓜帝 | Guardiola (曼城) | 戰術大師 | `tiki_taka` | 光頭 + olive 膚 + 短鬍 |
| 克羅普 | Klopp (利物浦/勒沃) | 重金屬熱情派 | `gegen_press` | 光頭 + blonde 大鬍子 + 眼鏡（眉毛上揚） |
| 安察 | Ancelotti (皇馬) | 老謀深算 | `champion_mentality` | balding-gray + 大眉 + 老 wrinkles |
| 阿提 | Arteta (兵工廠) | 紳士帥哥 | `youth_developer` | 短西裝頭 + 5oclock_shadow |
| 西蒙 | Simeone (馬競) | 鐵血漢 | `iron_wall` | 中長黑髮 + 滿臉鬍 + 兇眼 |
| 莫尼 | Mourinho (神秘老頭) | 經驗大師 | `veteran_handler` | 髮型 swoop + 5oclock + wrinkles |
| 三笘師 | 森保一 (日本) | 亞洲心 | `tactician` + `motivator` | 短黑髮 + 細框眼鏡 + 亞洲面孔 |
| 喵叔 | Mancini (跨國名帥) | 義式優雅 | `offensive_master` | swoop-gray + trimmed-gray |

⚠️ 眼鏡 / 細框眼鏡：LPC 是否有合適樣式待 rate-limit 解除後驗證；若無則用 `facial/glasses` 或其他替代。

---

## 四、SR 教練（12 位虛構）

依風格選 6 種 trait × 2 位（一個年輕路線、一個老成路線）：

- 戰術派 ×2（`tactician` + buff）
- 防守教練 ×2（`defensive_master`）
- 進攻教練 ×2（`offensive_master`）
- 速度教練 ×2（`speed_coach`）
- 體能教練 ×2（`physio`）
- 青訓 ×2（`youth_developer`）

LPC look：8 種風格組合（年輕 vs 老成），用 generateRandomCoachLook() server-side 生。

---

## 五、R 教練（12 位虛構）

R 教練只給單一屬性 +3%、6 種 × 2 位 = 12。

---

## 六、Schema

```sql
-- 1. 教練池母表
CREATE TABLE coach_pool (
  coach_id      TEXT PRIMARY KEY,
  rarity        TEXT NOT NULL CHECK (rarity IN ('R','SR','SSR')),
  name          TEXT NOT NULL,
  nickname      TEXT,
  trait         TEXT NOT NULL,        -- 'tiki_taka' 等
  trait_value   JSONB,                -- 額外參數，如 { attr: 'attack', pct: 0.05 }
  inspiration   TEXT,                 -- 開發者註記
  look_data     JSONB,                -- SSR 固定形象
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. 使用者已聘用教練 instance
CREATE TABLE user_coach (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES my_team(user_id) ON DELETE CASCADE,
  coach_id      TEXT NOT NULL REFERENCES coach_pool(coach_id),
  level         INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  bond          INTEGER NOT NULL DEFAULT 0 CHECK (bond BETWEEN 0 AND 5),
  look_data     JSONB,                -- R/SR 隨機形象
  hired_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. my_team 加欄位
ALTER TABLE my_team
  ADD COLUMN coach_tickets INT NOT NULL DEFAULT 1,    -- 新人贈 1 張
  ADD COLUMN coach_pity_counter INT NOT NULL DEFAULT 0,
  ADD COLUMN active_coach_id UUID REFERENCES user_coach(id);
```

---

## 七、券來源

| 來源 | 數量 | 頻率 |
|---|---|---|
| 新人禮 | 1 | 入坑送 |
| 每週連勝獎 | 1 | 週日結算（5 連勝以上） |
| 聯賽晉級 | 1 | Tier ↑ |
| 季賽冠軍 | 2 | season_num +1 |
| 完成任務 | 1-3 | 每月活動任務 |
| 寶石購買 | 1/300 寶石 | 寶石商店 |

預期：勤奮玩家每月可獲 5-8 張、佛系玩家 1-2 張。

---

## 八、UI / 體驗

- **教練扭蛋頁面**：跟球員 modal 同層級、加一個「教練池」tab
- **聘用動畫**：3D 翻牌 + 教練全身 LPC sprite（不是 portrait）
- **主教練欄位**：球隊資訊頁顯示當前主教練 + trait
- **更換教練**：免費、不消耗券（鼓勵玩家換配）

---

## 九、實作順序（之後）

1. ✅ 設計文件（this）
2. Migration：coach_pool + user_coach schema + my_team 加欄位
3. 30 位教練 hand-curated（8 SSR + 12 SR + 12 R）+ look_data
4. coach_gacha_draw RPC
5. JS：教練 portrait/full-body render（reuse LpcRenderer，差別在用 walk-right）
6. UI：教練扭蛋 tab + 主教練欄位
7. Match：套用主教練 trait 到屬性計算

預估工程量：1-2 週（看球員系統穩定後再開）
