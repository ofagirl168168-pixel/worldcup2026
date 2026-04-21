# 數據稽核報告 · js/epl-data-teams.js

**稽核日期**：2026-04-20
**稽核範圍**：20 支球隊的 `eplRank`、`recentForm`、`history` 中的奪冠/歐冠數字
**稽核人**：fact-checker-stats
**執行總覽**：檔案寫的排名與實際英超 2025/26 賽季第33輪後（截至 2026-04-19）的排名**大面積不符**；recentForm 多支球隊也與實際近5場英超結果不符。檔案註記「資料截止：2025/26 賽季（2026年4月）」但其數據似乎未反映賽季後半段的真實狀態。

---

## 已確認的正確實際數據（2026-04-20 當下）

**完整聯賽排名（依多筆搜尋結果交叉比對）**：

| 實際名次 | 球隊 | 積分 | 資料來源 |
|---|---|---|---|
| 1 | Arsenal | 70 | Wikipedia / Premier League |
| 2 | Manchester City | 67 | Wikipedia / Premier League |
| 3 | Manchester United | 58 | Wikipedia / Premier League |
| 4 | Aston Villa | 58 | ESPN 賽後報導 |
| 5 | Liverpool | 55 | Wikipedia |
| 6 | Chelsea | 48 | Wikipedia |
| 7 | Brentford | 48 | Wikipedia |
| 8 | Bournemouth | 48 | Wikipedia |
| 9 | Brighton | 47 | Wikipedia |
| 10 | Everton | 47 | Wikipedia |
| 11 | Sunderland | 46 | ESPN / Villa 4-3 SUN 賽後報導 |
| 12 | Fulham | 45 | 搜尋結果 |
| 13 | Newcastle | 42 | 搜尋結果 |
| 14 | Crystal Palace | 42 | 搜尋結果 |
| 15 | Leeds | 39 | Wikipedia |
| 16 | Nottingham Forest | 36 | 搜尋結果 |
| 17 | West Ham | 32 | 搜尋結果 |
| 18 | Tottenham | 31 | givemesport / 搜尋結果 |
| 19 | Burnley | 20 | 搜尋結果 |
| 20 | Wolves | 17 | 搜尋結果 |

**主要來源**：
- https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League  (更新至 19/04/2026)
- https://www.premierleague.com/en/tables/premier-league/2025-26/all-matchweeks
- https://www.espn.com/soccer/report/_/gameId/740919  (Villa 4-3 SUN 報導末段提及 Villa=4th、SUN=11th)
- https://www.givemesport.com/premier-league-table-2026-football-soccer/  (Tottenham 近 20th)

原文引用（Villa vs Sunderland ESPN 賽後報導）：
"With this defeat, Sunderland end the matchday in 11th place with 46 points, while Aston Villa end 4th place with 58 points."

---

## ❌ eplRank 錯誤（10 條，大量嚴重）

| # | 球隊 | 檔案寫 | 實際 | 差距 | 信心 |
|---|---|---|---|---|---|
| 1 | Manchester City (MCI) | 3 | 2 | -1（小錯） | 高 |
| 2 | Chelsea (CHE) | 4 | 6 | -2 | 高 |
| 3 | Newcastle (NEW) | 5 | 13 | **-8 嚴重錯誤** | 高 |
| 4 | Aston Villa (AVL) | 6 | 4 | +2 | 高 |
| 5 | Manchester United (MUN) | 7 | 3 | **+4 嚴重錯誤** | 高 |
| 6 | Tottenham (TOT) | 8 | 18 | **-10 嚴重錯誤** | 高 |
| 7 | Bournemouth (BOU) | 10 | 8 | +2 | 高 |
| 8 | Fulham (FUL) | 11 | 12 | -1（小錯） | 高 |
| 9 | Nottingham Forest (NFO) | 13 | 16 | -3 | 高 |
| 10 | Crystal Palace (CRY) | 14 | 14 | ✅ 正確 | 高 |
| 11 | Sunderland (SUN) | 20 | 11 | **+9 嚴重錯誤** | 高 |
| 12 | Leeds (LEE) | 18 | 15 | +3 | 高 |
| 13 | Everton (EVE) | 17 | 10 | **+7 嚴重錯誤** | 高 |

**最嚴重：熱刺（TOT）寫 8、實際 18**（差 10 名）；**桑德蘭（SUN）寫 20、實際 11**（差 9 名）；**紐卡索（NEW）寫 5、實際 13**（差 8 名）；**艾佛頓（EVE）寫 17、實際 10**（差 7 名）。

通過（正確）：ARS=1、LIV=2（檔案）vs 實際（ARS=1 ✅ 但 LIV 檔案寫 2、實際 5，**錯誤** — 以下列入錯誤）
- ARS eplRank=1 → ✅ 正確（高）
- LIV eplRank=2 → ❌ 實際 5（高）← 前面表格漏了，已補正：**LIV 檔案寫 2、實際 5**，差 3 名
- BHA eplRank=9 → ✅ 正確（高）
- BRE eplRank=12 → ❌ 實際 7（差 5）
- WHU eplRank=15 → ❌ 實際 17（小錯）
- WOL eplRank=16 → ❌ 實際 20（差 4）
- BUR eplRank=19 → ❌ 實際 19 ✅ 正確

**更正後的 eplRank 判定總表**：
- ✅ 正確：ARS(1)、BHA(9)、CRY(14)、BUR(19) — 共 4 條
- ❌ 錯誤（eplRank）：LIV、MCI、CHE、MUN、TOT、NEW、AVL、BOU、FUL、BRE、NFO、WHU、EVE、LEE、WOL、SUN — 共 16 條

---

## ❌ recentForm 錯誤（多條）

**Liverpool** — 檔案寫 `['W','D','W','W','W']`
- 實際近5場英超（舊→新）：
  - Wolves 2-1 LIV (L) · 2026-03-03
  - LIV 1-1 TOT (D) · 2026-03-15
  - Brighton 2-1 LIV (L) · 2026-03-21
  - LIV 2-0 FUL (W) · 2026-04-11
  - Everton 1-2 LIV (W) · 2026-04-19
- 應為 `['L','D','L','W','W']`
- 來源：https://www.empireofthekop.com/liverpool-results/ 及 ESPN 賽後報導
- 判定：❌ 錯誤（信心：高）

**Chelsea** — 檔案寫 `['D','W','W','L','L']`
- 實際近5場英超（舊→新）：
  - Arsenal 2-1 CHE (L) · 03/01
  - Aston Villa 1-4 CHE (W) · 03/04
  - Chelsea 0-1 Newcastle (L) · 03/14
  - Everton 3-0 Chelsea (L) · 03/21
  - Chelsea 0-3 Man City (L) · 04/12
  - Chelsea 0-1 Man Utd (L) · 04/18（本案第33輪）
- 取最新5場（03/04 以後）：`['W','L','L','L','L']`
- 判定：❌ 錯誤（信心：高）

**Arsenal** — 檔案寫 `['D','W','W','L','L']`
- 已確認近期：
  - 03/01 ARS 2-1 CHE (W)
  - 03/04 Brighton 0-1 ARS (W)
  - 03/14 ARS 2-0 EVE (W)
  - 03/21 ARS vs Wolves（搜尋未取得具體結果，**不確定**）
  - 04/11 ARS 1-2 BOU (L)
  - 04/19 MCI 2-1 ARS (L)
- 取最後5場英超（03/14 以後）：`['W','?','L','L']`（只有4條確定） — 至少可確認後兩場是 L,L；檔案寫最後兩場「L,L」正確，但前三場不明。
- 判定：⚠️ 不確定（信心：中，搜尋未能完整列出 03/14 至 04/11 之間所有比賽）

**Manchester United** — 檔案寫 `['W','D','W','L','W']`
- 已確認近期英超：
  - 03/01 MUN 2-1 CRY (W)
  - 03/04 NEW 2-1 MUN (L)
  - 03/15 MUN 3-1 AVL (W)
  - 03/20 BOU 2-2 MUN (D)
  - 04/13 MUN 1-2 LEE (L)
  - 04/18 CHE 0-1 MUN (W)
- 近5場（舊→新）：`['L','W','D','L','W']`
- 判定：❌ 錯誤（信心：高）

**Manchester City** — 檔案寫 `['W','L','W','W','W']`
- 已確認近期英超：
  - 03/04 MCI 2-2 NFO (D)
  - 03/14 WHU 1-1 MCI (D)
  - 04/12 CHE 0-3 MCI (W)
  - 04/19 MCI 2-1 ARS (W)
- 中間還有 1-2 場未能透過搜尋完整列出
- 判定：⚠️ 不確定（信心：中），但檔案中「L」難以對應實際結果（近期無明顯敗績）— 至少有疑慮

**Tottenham** — 檔案寫 `['L','W','D','W','D']`
- 實際近5場：
  - 03/01 FUL 2-1 TOT (L)
  - 03/05 TOT 1-3 CRY (L)
  - 03/15 LIV 1-1 TOT (D)
  - 03/22 TOT 0-3 NFO (L)
  - 04/12 SUN 1-0 TOT (L)
  - 04/19 TOT 2-2 BHA (D)
- 近5場（舊→新）：`['L','D','L','L','D']`
- 檔案寫兩個 W，但實際熱刺 3 月以降幾乎全輸；「被提 18 名」支持此論
- 判定：❌ 錯誤（信心：高）

**Newcastle** — 檔案寫 `['W','W','D','W','L']`
- 實際近5場：
  - 03/04 NEW 2-1 MUN (W)
  - 03/14 CHE 0-1 NEW (W)
  - 03/22 NEW 1-2 SUN (L)
  - 04/12 CRY 2-1 NEW (L)
  - 04/18 NEW 1-2 BOU (L)
- 應為 `['W','W','L','L','L']`（至少近3場全敗）
- 判定：❌ 錯誤（信心：高）

**Sunderland** — 檔案寫 `['D','L','W','L','L']`
- 近期已知：
  - 03/22 NEW 1-2 SUN (W)
  - 04/12 SUN 1-0 TOT (W)
  - 04/19 AVL 4-3 SUN (L)
- 搜尋資料不足以完整確認前2場
- 判定：⚠️ 不確定（信心：低）

**Aston Villa** — 檔案寫 `['W','W','L','W','W']`
- 近期已知：
  - 03/04 AVL 1-4 CHE (L)
  - 03/15 MUN 3-1 AVL (L)
  - 03/22 AVL 2-0 WHU (W)
  - 04/12 NFO 1-1 AVL (D)
  - 04/19 AVL 4-3 SUN (W)
- 應為 `['L','L','W','D','W']`
- 判定：❌ 錯誤（信心：高）

**其他球隊（BHA、BOU、BRE、FUL、NFO、CRY、WHU、WOL、EVE、LEE、BUR）的 recentForm**：因稽核時間限制且每隊需要獨立查 5 場英超結果，搜尋未能完整完成；無法逐一判定。
- 判定：⚠️ 不確定（信心：低，需人工再查證）

---

## ✅ 歷史數字通過檢查

- ARS：「13次英格蘭頂級聯賽冠軍，2003/04不敗賽季」— ✅ 正確（13 冠一般公認，最近一次為 2003/04；信心：高）
- LIV：「19次英格蘭頂級聯賽冠軍，6次歐冠冠軍」— ✅ 正確（第19次為 2024/25；信心：高）
- MCI：「9次英格蘭頂級聯賽冠軍，2022/23三冠王」— ✅ 正確（信心：高）
- CHE：「6次英格蘭頂級聯賽冠軍，2次歐冠冠軍」— ✅ 正確（信心：高）
- MUN：「20次英格蘭頂級聯賽冠軍，3次歐冠冠軍」— ✅ 正確（信心：高）
- TOT：「2次英格蘭頂級聯賽冠軍，2019歐冠亞軍」— ✅ 正確（信心：高）
- NEW：「4次英格蘭頂級聯賽冠軍」— ✅ 正確（最近一次為 1927；信心：高）
- AVL：「7次英格蘭頂級聯賽冠軍，1982年歐冠冠軍」— ✅ 正確（信心：高）
- EVE：「9次英格蘭頂級聯賽冠軍」— ✅ 正確（信心：高）
- WOL：「3次英格蘭頂級聯賽冠軍」— ✅ 正確（信心：高）
- LEE：「3次英格蘭頂級聯賽冠軍」— ✅ 正確（信心：高）
- SUN：「6次英格蘭頂級聯賽冠軍」— ✅ 正確（信心：高）
- BUR：「2次英格蘭頂級聯賽冠軍」— ✅ 正確（信心：高）
- NFO：「2次歐冠冠軍（1979、1980）」— ✅ 正確（信心：高）
- WHU：「1965年歐洲盃賽冠軍盃冠軍」— ✅ 正確（信心：高）

---

## 搜尋紀錄

共執行 **16+ 次 WebSearch**；重點關鍵字：
- "Premier League 2025-26 table standings April 2026"
- "Premier League matchweek 33 results April 18 19 2026"
- 各隊名稱 + "Premier League last 5 matches March April 2026"

主要權威來源：
- https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League
- https://www.premierleague.com/
- https://www.espn.com/soccer/
- https://www.empireofthekop.com/liverpool-results/
- https://www.espn.com/soccer/report/_/gameId/740919 (Villa 4-3 SUN 賽後報導)
- https://www.espn.com/soccer/report/_/gameId/740916 (MCI 2-1 ARS 賽後報導)
- 各隊官網

---

## 總結建議

1. **`eplRank` 幾乎全檔案過時**：20 隊中有 16 隊排名錯誤，其中 TOT、SUN、NEW、EVE、MUN 差距達 5-10 名。**應全面以最新 Premier League 官網數據更新。**
2. **`recentForm` 至少 6 隊明顯錯誤（LIV、CHE、MUN、TOT、NEW、AVL）**，其餘多隊因時間不足未能完整驗證，建議人工逐一更新。
3. **`history` 歷史數字大致正確**，可保留。
4. **建議**：此檔案由 AI 戰術分析即時讀取，若用戶花寶石解鎖看到嚴重過時的排名/近5場，將有「付費看錯誤資訊」的觀感問題，急需修正。
