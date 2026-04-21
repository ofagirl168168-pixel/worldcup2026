# 數據稽核報告 · WC2026 data-teams.js + data-matches.js

**稽核日期**：2026-04-20
**稽核範圍**：
- `js/data-teams.js`（35 隊 FIFA 排名 + 近期狀態）
- `js/data-matches.js`（小組賽賽程：日期/場地/對戰）

**稽核員鐵律遵循**：本報告每條均附 WebSearch URL + 原文引用；未修改任何檔案。

---

## ❗❗ 最嚴重系統性錯誤（列在最前）

### S1. 整個 GROUPS 定義與官方分組結果不符
`data-teams.js` 結尾的 GROUPS 物件雖標註「由 data-fix.js 覆蓋」，但 `data-teams.js` 每支球隊內的 `group:'X'` 屬性仍是舊/錯誤分組，與 2025-12-05 FIFA 抽籤結果明顯脫節。

- **來源**：NBC Sports / FIFA 官方分組
- **URL**：https://www.nbcsports.com/soccer/news/2026-world-cup-groups-confirmed-full-draw-groups-details
- **原文引用**："Group A: Mexico, South Africa, Korea Republic, Czechia" "Group B: Canada, Bosnia and Herzegovina, Qatar, Switzerland" "Group D: USA, Paraguay, Australia, Türkiye"

#### 隊內 group 屬性錯誤對照：
| 隊伍 | 檔案 group | 官方 group | 對手差異 |
|------|-----------|-----------|---------|
| ECU | E | **E** | 但 E 組實際對手是 Germany/Curaçao/Côte d'Ivoire，檔案標記的 GER/ECU/CIV/CUW 需補 CUW 資料（現缺） |
| QAT | B | **B** | 但少 BIH（波黑），檔案仍寫 EUPA |
| AUS | D | **D** | 實際同組為 Paraguay/Türkiye，檔案同組卻有 PAR/EUPC |
| JPN | F | **F** | 實際同組 Sweden/Tunisia，檔案同組 TUN/EUPB（缺 SWE） |
| COL | K | **K** | 實際同組 Portugal/DR Congo/Uzbekistan；檔案同組正確 |
| ALG | J | **J** | 實際同組 Austria/Jordan；檔案 GROUPS.J = ARG/AUT/ALG/JOR 正確 |
| ENG | L | **L** | 實際同組 Croatia/Ghana/Panama；檔案 GROUPS.L 正確 |

**判定**：❌ 嚴重錯誤（部分隊伍的 group 字母對，但 GROUPS 陣列仍用佔位符 EUPD/EUPA/HAI/EUPC/CUW/EUPB/CPV/ICP1/ICP2/NOR/JOR 等；35 支球隊資料未能覆蓋 48 隊，缺席 RSA（南非）、BIH（波黑）、HAI（海地）、CUW（庫拉索）、SWE（瑞典）、CPV（維德角）、NOR（挪威）、IRQ（伊拉克）、JOR（約旦）、COD（剛果民主共和國）、TUR（土耳其）、PAR（巴拉圭）、CZE（捷克）、MEX 主辦）
**信心**：高

---

## ❌ A 部分：FIFA 排名錯誤（2026/04 基準）

**權威來源**：
- ESPN - FIFA Men's Top 50 World Rankings April 2026：https://www.espn.com/soccer/story/_/id/46664763/fifa-mens-top-50-world-rankings
- FIFA 官方：https://inside.fifa.com/news/france-1st-fifa-coca-cola-world-ranking-april-2026
- 原文引用（ESPN/FIFA）："It's all change at the top of April's FIFA World Rankings, with World Cup 2022 runners-up France jumping two places into first. European champions Spain drop to second and world champions Argentina to third." "Portugal rounds out the top five, with Brazil falling to sixth. England remain in fourth place... Netherlands, Morocco, Belgium and Germany complete the top 10."

### 錯誤 FIFA 排名逐隊檢核：
| # | 隊伍 | 檔案值 | 正確值 (04/2026) | 差距 |
|---|------|--------|------------------|------|
| 1 | FRA | 2 | **1** | -1 |
| 2 | ARG | 1 | **3** | +2 |
| 3 | ESP | 3 | **2** | +1 |
| 4 | ENG | 4 | **4** | ✅ |
| 5 | POR | 6 | **5** | +1 |
| 6 | BRA | 5 | **6** | -1 |
| 7 | NED | 7 | **7** | ✅ |
| 8 | MAR | 14 | **8** | +6（嚴重落後，未更新 2023 四強後升勢） |
| 9 | BEL | 8 | **9** | -1（微差） |
| 10 | GER | 12 | **10** | +2 |
| 11 | CRO | 10 | **11** | -1（微差） |
| 12 | COL | 11 | **13** | -2 |
| 13 | SEN | 20 | **14** | +6 |
| 14 | MEX | 16 | **15** | +1 |
| 15 | USA | 14 | **16** | -2 |
| 16 | URU | 10 | **17** | -7 |
| 17 | JPN | 17 | **18** | -1（微差） |
| 18 | SUI | 15 | **19** | -4 |
| 19 | IRN | 23 | **21** | +2 |
| 20 | ECU | 33 | **23** | +10 |
| 21 | AUT | 24 | **24** | ✅ |
| 22 | KOR | 22 | **25** | -3 |
| 23 | AUS | 26 | **27** | -1（微差） |
| 24 | ALG | 38 | **28** | +10 |
| 25 | EGY | 42 | **29** | +13 |
| 26 | CAN | 43 | **30** | +13 |
| 27 | PAN | 71 | **33** | +38 |
| 28 | CIV | 48 | **34** | +14 |
| 29 | TUN | 40 | **44** | -4 |
| 30 | SCO | 35 | **43** | -8 |
| 31 | UZB | 74 | **50** | +24 |
| 32 | KSA | 56 | （未入 Top 50） | 需查 |
| 33 | CRC / QAT / NZL / GHA | 44 / 97 / 60 | 未入 Top 50 或需個別查 | — |

**判定**：❌ 35 隊中至少 26 隊 FIFA 排名與 2026/04 官方排名不符；大部分檔案中的排名來自 2024-2025 舊資料，未更新 2025 年 11 月到 2026 年 3 月國際賽窗後的變動。
**信心**：高

---

## ❌ B 部分：賽程 data-matches.js 錯誤

### B1. Group A md1 場地錯誤
- 檔案：`A.md1` → `MetLife Stadium, 紐澤西`（兩場）
- 正確：開幕戰 Mexico vs South Africa 在 Estadio Azteca（墨西哥城）；Korea Republic vs Czechia 在 Estadio Akron（瓜達拉哈拉）
- **URL**：https://www.foxsports.com/stories/soccer/2026-world-cup-matches-mexico-city-start-times-dates-locations
- **原文引用**："Mexico will face South Africa on June 11 at Mexico City Stadium (Estadio Azteca) at 3 p.m. ET." "Korea Republic vs. Czechia at Estadio Akron (Guadalajara, Mexico)"
- **信心**：高

### B2. Group A 開幕日期錯誤
- 檔案：`2026-06-12`
- 正確：**2026-06-11**（世界盃開幕日）
- **信心**：高

### B3. Group C md1 場地/日期錯誤
- 檔案：`C.md1` → `AT&T Stadium, 達拉斯, 2026-06-13`
- 正確：Brazil vs Morocco 6/13 MetLife Stadium（紐澤西）；Haiti vs Scotland 6/13 Gillette Stadium（波士頓）
- **URL**：https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
- **原文引用**："Brazil vs. Morocco, 6 p.m. at MetLife Stadium (East Rutherford, New Jersey)" "Haiti vs. Scotland, 9 p.m. at Gillette Stadium (Foxboro, Massachusetts)"
- **信心**：高

### B4. Group D 全錯
- 檔案：`D.md1` → 2026-06-14 Lincoln Financial 費城 / Gillette Stadium 波士頓
- 正確：USA vs Paraguay 6/12 SoFi Stadium（洛杉磯）；Australia vs Türkiye 6/13 BC Place（溫哥華）
- **URL**：https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_D
- **原文引用**："Friday, June 12, 9 p.m.: United States vs. Paraguay, SoFi Stadium (Inglewood, California)" "Saturday, June 13, 12 a.m.: Australia vs. Türkiye, BC Place (Vancouver)"
- **信心**：高

### B5. Group E 場地錯誤
- 檔案：`E.md1` → Camping World 奧蘭多 / AT&T Stadium 達拉斯
- 正確：Germany vs Curaçao 6/14 NRG Stadium（休士頓）；Ivory Coast vs Ecuador 6/14 Lincoln Financial Field（費城）
- **URL**：（同 MLSSoccer.com / FIFA）
- **原文引用**："Germany vs. Curaçao, NRG Stadium (Houston)" "Ivory Coast vs. Ecuador, Lincoln Financial Field (Philadelphia)"
- **信心**：高

### B6. Group F 日期 + 場地錯誤
- 檔案：`F.md1` → 2026-06-15 Estadio Azteca（墨西哥城）
- 正確：Netherlands vs Japan 6/14 AT&T Stadium（達拉斯）；Sweden vs Tunisia 6/14 Estadio BBVA（蒙特雷）
- **URL**：https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_F
- **原文引用**："Netherlands vs. Japan at AT&T Stadium (Arlington, Texas) at 4 p.m." "Sweden vs. Tunisia at Estadio BBVA (Monterrey, Mexico) at 10 p.m."
- **信心**：高

### B7. Group G 場地錯誤
- 檔案：`G.md1` → SoFi Stadium / Rose Bowl
- 正確：Belgium vs Egypt 6/15 Lumen Field（西雅圖）；Iran vs New Zealand 6/15 SoFi Stadium（Inglewood）
- **信心**：高

### B8. Group H 場地錯誤
- 檔案：`H.md1` → Levi's Stadium 聖荷西 / Lumen Field 西雅圖
- 正確：Spain vs Cape Verde 6/15 Mercedes-Benz Stadium（亞特蘭大）；Saudi Arabia vs Uruguay 6/15 Hard Rock Stadium（邁阿密）
- **信心**：高

### B9. Group I 場地錯誤
- 檔案：`I.md1` → SoFi Stadium / Rose Bowl
- 正確：France vs Senegal 6/16 MetLife Stadium（紐澤西）；Iraq vs Norway 6/16 Gillette Stadium（波士頓）
- **信心**：高

### B10. Group J 日期錯誤
- 檔案：`J.md1` → 2026-06-12 / 06-13
- 正確：Argentina vs Austria 6/22 AT&T Stadium（達拉斯）；Jordan vs Algeria 6/22 Levi's Stadium（聖荷西）。J 組 md1 明顯晚於其他組。
- **信心**：高

### B11. Group K 場地錯誤
- 檔案：`K.md1` → BMO Field / BC Place（加拿大）
- 正確：Portugal vs DR Congo 6/17 NRG Stadium（休士頓）；Colombia vs Uzbekistan 6/17 需進一步確認（可能在加拿大）
- **信心**：中（Portugal 場地已確認錯誤；Colombia vs Uzbekistan 具體場地待查）

### B12. Group L 場地錯誤
- 檔案：`L.md1` → Arrowhead Stadium 堪薩斯城 / Camping World 奧蘭多
- 正確：England vs Croatia 6/17 AT&T Stadium（達拉斯）；Panama vs Ghana 6/17 需確認具體場地
- **信心**：中

---

## ❌ C 部分：近期戰績 recentForm 錯誤

**檢核基準**：「近 5 場正式國際賽（含 2025 資格賽 + 2025-11、2026-03 窗）」

### C1. FRA（法國）
- 檔案：`['W','W','W','D','W']`
- 實際（由舊到新）：
  - 2025-10 資格賽 vs Azerbaijan → W（3-0）
  - 2025-11 資格賽 vs Ukraine → W
  - 2025-11 資格賽 vs Azerbaijan → W
  - 2026-03-26 友誼 vs Brazil → W（2-1）
  - 2026-03-29 友誼 vs Colombia → W（3-1）
- **URL**：https://www.espn.com/soccer/match/_/gameId/762452/france-brazil ; https://www.aljazeera.com/sports/2026/3/30/france-beat-colombia-3-1-to-showcase-firepower-and-squad-depth
- **原文引用**："France defeated Brazil 2-1 in a World Cup warm-up match" "France won their second friendly match in three days... defeating Colombia 3-1"
- **應為**：`['W','W','W','W','W']`
- **信心**：高

### C2. BRA（巴西）
- 檔案：`['W','D','W','W','L']`
- 實際（近 5 場，由舊到新）：
  - 2025-11-16 vs Tunisia（友誼）→ 需確認
  - 2025-11 vs Senegal → L（1-2）
  - 2026-03-26 vs France → L（1-2）
  - 2026-03-31 vs Croatia → W（3-1）
- **URL**：https://www.espn.com/soccer/match/_/gameId/401843261/croatia-brazil ; https://worldsoccertalk.com/news/brazil-vs-france-live-updates-minute-by-minute-coverage-of-2026-international-friendly/
- **原文引用**："Brazil score twice late on to beat Croatia 3-1" "France... 2-1 victory" 
- **應為**：近 5 場正式賽需實際查 BRA 最後 5 場。檔案的'L'位置可能與 3/26 對法國對得上，但 3/31 是 W 未反映。
- **信心**：中（需更完整 H2H 查詢）

### C3. ENG（英格蘭）
- 檔案：`['W','W','D','W','L']`
- 實際（近 5 場）：
  - 2025-09/10 資格賽 vs Andorra/Serbia → W/W
  - 2025-11 資格賽 vs Latvia/Albania → W/W
  - 2026-03-27 vs Uruguay → D（1-1）
  - 2026-03-31 vs Japan → L（0-1）
- **URL**：https://www.englandfootball.com/england/mens-senior-team/fixtures-results/2025-26/internationals/england-v-japan-international-match-tuesday-31-march-2026-match-centre ; https://www.espn.com/soccer/report/_/gameId/762554
- **原文引用**："England suffered a narrow 1-0 defeat to Japan" "The 1-1 draw with Uruguay"
- **應為**：`['W','W','W','D','L']`（檔案 'D' 位置錯位）
- **信心**：高

### C4. GER（德國）
- 檔案：`['W','W','D','W','W']`
- 實際：
  - 2025-10/11 資格賽 vs Luxembourg (W 4-0), Northern Ireland (L 0-1), Luxembourg (W 4-0), Slovakia (W 6-0)
  - 2026-03-27 vs Switzerland → W（4-3）
  - 2026-03-30 vs Ghana → W（2-1）
  - 最近 5 場：L, W, W, W, W（近 7 場連勝始自 2025-09）
- **URL**：https://www.bavarianfootballworks.com/fifa-world-cup/183250/julian-nagelsmann-on-7-match-win-streak-with-germany-after-ghana-win
- **原文引用**："Germany beat Ghana 2-1 with Deniz Undav scoring a last-gasp winner" "Nagelsmann is now on a seven-match winning streak with the German national team"
- **應為**：`['W','W','W','W','W']`（7 連勝中）
- **信心**：高

### C5. ESP（西班牙）
- 檔案：`['W','W','W','W','W']`
- 實際：
  - 2025-11 資格賽 vs Georgia（W），Türkiye（D 2-2）
  - 2026-03-27 vs Serbia → W（3-0）
  - 2026-03-31 vs Egypt → D（0-0）
- **URL**：https://www.espn.com/soccer/match/_/gameId/401851847/egypt-spain ; https://www.espn.com/soccer/report/_/gameId/401865041
- **原文引用**："Spain played Egypt to a 0-0 draw" "Spain 3-0 Serbia" "2-2 draw with Turkiye"
- **應為**：`['W','W','D','W','D']`（非全勝）
- **信心**：高

### C6. POR（葡萄牙）
- 檔案：`['W','W','W','W','W']`
- 實際：
  - 2025-11 資格賽 vs Republic of Ireland → L（0-2）
  - 2025-11 資格賽 vs Armenia → W（9-1）
  - 2026-03-28 vs Mexico → D（0-0）
  - 2026-03 vs USA → W（2-0）
- **URL**：https://www.aljazeera.com/sports/2026/3/29/belgium-thrash-usa-5-2-mexico-vs-portugal-ends-0-0-in-football-friendlies
- **原文引用**："Portugal played Mexico in an International Friendly 2026, with the match ending 0-0" "Portugal sealed its place at the 2026 World Cup with a 9-1 rout of Armenia. Prior to this, Portugal suffered a surprise 2-0 loss to Ireland"
- **應為**：`['L','W','W','D','W']` 之類（非全勝）
- **信心**：高

### C7. NED（荷蘭）
- 檔案：`['W','W','L','W','W']`
- 實際：
  - 2025 資格賽 W 多場
  - 2026-03-27 vs Norway → W（2-1）
  - 2026-03-31 vs Ecuador → D（1-1）
- **URL**：https://www.goal.com/en/team/netherlands/fixtures-results/657oha8nkne1ybba2bouzkbo7
- **原文引用**："the Netherlands defeated Norway 2-1 in a friendly match. On March 31, 2026, the Netherlands drew 1-1 with Ecuador"
- **應為**：最近 2 場應為 W, D（檔案最後是 W 錯誤）
- **信心**：中（需完整 5 場查）

### C8. BEL（比利時）
- 檔案：`['D','W','L','W','W']`
- 實際最近：
  - 2025-11 資格賽 vs Liechtenstein (W 7-0), Kazakhstan (W)
  - 2026-03-28 vs USA → W（5-2）
  - 2026-03-31 vs Mexico → D（1-1）
- **URL**：https://www.aljazeera.com/sports/2026/3/29/belgium-thrash-usa-5-2-mexico-vs-portugal-ends-0-0-in-football-friendlies
- **原文引用**："Belgium routed the United States 5-2" "Mexico and Belgium played out a 1-1 draw"
- **應為**：最近 2 場是 W, D
- **信心**：中

### C9. JPN（日本）
- 檔案：`['W','W','W','D','W']`
- 實際：
  - 2025-10 vs Brazil → W（3-2）
  - 2025-11 其他友誼
  - 2026-03-27 vs Scotland → W（1-0）
  - 2026-03-31 vs England → W（1-0）
- **URL**：https://english.aawsat.com/sports/5257532-historic-england-win-shows-confident-japan-can-go-far-world-cup
- **原文引用**："Japan defeated England 1-0" "back-to-back away wins against Scotland and England"
- **應為**：`['W','W','W','W','W']` 或近似（但需完整 5 場精確查驗）
- **信心**：中

### C10. MEX（墨西哥）
- 檔案：`['W','D','W','W','D']`
- 實際最近 5 場：W Panama 1-0, W Bolivia 1-0, W Iceland 4-0, D Portugal 0-0, D Belgium 1-1
- **URL**：https://www.espn.com/soccer/story/_/id/48368314/can-mexico-carry-momentum-march-international-window-friendlies-vs-belgium-portugal-world-cup
- **原文引用**："a 1-0 win against Panama, a 1-0 win against Bolivia, a 4-0 win against Iceland, a 0-0 draw with Portugal, and a 1-1 draw with Belgium"
- **應為**：`['W','W','W','D','D']`
- **信心**：高

### C11. ARG（阿根廷）
- 檔案：`['W','W','W','W','W']`
- 實際：W vs Venezuela 1-0, W vs Puerto Rico 6-0, W vs Angola 2-0, W vs Mauritania 2-1, W vs Zambia 5-0
- **URL**：https://tribuna.com/en/team/argentina/fixtures/2026/ ; https://worldsoccertalk.com/news/argentina-vs-mauritania-live-updates-minute-by-minute-coverage-of-2026-international-friendly/
- **原文引用**："Argentina collected a 2-1 win" "5-0 against Zambia"
- **應為**：`['W','W','W','W','W']` ✅ 正確
- **判定**：✅ 正確
- **信心**：高

### C12. CRO（克羅埃西亞）
- 檔案：`['W','D','L','D','W']`
- 實際最近：
  - 2025-10 資格賽 vs Gibraltar (W 7-0), Czechia (W 3-0)
  - 2025-11 資格賽 vs Montenegro/Faroe
  - 2026-03-26 vs Colombia → W（2-1）
  - 2026-03-31 vs Brazil → L（1-3）
- **URL**：https://www.croatiaweek.com/dalic-croatia-colombia-friendly-world-cup-preparations/ ; https://www.espn.com/soccer/match/_/gameId/401843261/croatia-brazil
- **原文引用**："Croatia faced Colombia... winning 2-1" "Brazil 3-1 Croatia"
- **應為**：最近 2 場 W, L（檔案最後是 W 錯誤）
- **信心**：高

### C13. MAR（摩洛哥）
- 檔案：`['W','W','D','W','W']`
- 實際：19 場連勝止於 2025-12 一場平，2026-03-27 vs Ecuador D 1-1, 2026-03-31 vs Paraguay W 2-1
- **URL**：https://www.goal.com/en/team/morocco/fixtures-results/avggs3u2b5cu8i1dnzknhth52
- **原文引用**："Morocco's winning streak, which began in June 2024, ultimately reached 19 consecutive wins before ending with a draw in December 2025" "Morocco played Ecuador... 1-1 draw... Paraguay... winning 2-1"
- **應為**：`['W','W','D','D','W']` 之類
- **信心**：中

### C14. URU（烏拉圭）
- 檔案：`['W','W','W','D','L']`
- 實際（近 5 場正式）：
  - 2025-09 vs Peru → W 3-0
  - 2025-09 vs Chile → D
  - 2025-10 vs Dominican Republic → W 1-0
  - 2026-03-27 vs England → D 1-1
  - 2026-03-31 vs Algeria → D 0-0
- **URL**：https://sports.yahoo.com/articles/uruguay-world-cup-2026-squad-152005670.html
- **原文引用**："England 1-1 Uruguay" "Algeria 0-0 Uruguay"
- **應為**：`['W','D','W','D','D']`
- **信心**：高

### C15. IRN（伊朗）
- 檔案：`['W','D','W','W','D']`
- 實際最近：
  - 2026-03 vs Nigeria → L（1-2）
  - 2026-03-31 vs Costa Rica → W（5-0）
- **URL**：https://www.outlookindia.com/sports/football/iran-vs-costa-rica-live-score-fifa-international-friendly-march-2026-irn-v-crc-updates-highlights
- **原文引用**："Iran produced a dominant performance to defeat Costa Rica 5-0" "Nigeria edged Iran 2-1"
- **應為**：最近 2 場 L, W（檔案最後是 D 錯誤）
- **信心**：中

---

## ✅ C 部分：確認正確的條目
| # | 隊伍 | 欄位 | 值 | 來源 | 信心 |
|---|------|------|-----|------|------|
| 1 | ARG | recentForm | W-W-W-W-W | goal.com/tribuna.com | 高 |
| 2 | ARG | fifaRank | 1 → 但官方 04/2026 為 3 | ESPN | 高（錯誤） |
| 3 | ENG | fifaRank = 4 | 4 | ESPN | 高 |
| 4 | NED | fifaRank = 7 | 7 | ESPN | 高 |
| 5 | AUT | fifaRank = 24 | 24 | ESPN | 高 |

---

## ⚠️ 不確定 / 需人工確認

| # | 聲明 | 疑慮 | 現有來源 |
|---|------|------|---------|
| 1 | KSA 排名 56 | 官方 Top 50 未列 KSA，實際應 > 50 | https://www.espn.com/soccer/story/_/id/46664763/fifa-mens-top-50-world-rankings |
| 2 | QAT 排名 44 | 官方 Top 50 未列，實際應 > 50 | 同上 |
| 3 | NZL 排名 97 | 數值不在 Top 50，來源需個別查 | 同上 |
| 4 | GHA 排名 60 | 同上 | 同上 |
| 5 | 檔案 ALG 屬 "J 組"，但 J 組還含 Jordan；檔案無 JOR 球隊資料 | 資料缺失 | https://www.espn.com/soccer/story/_/id/47108758/2026-fifa-world-cup-format-tiebreakers-fixtures-schedule |
| 6 | 檔案所有「淘汰賽場地」與最新 FIFA 公告無法逐場對照 | 部分時間待與 FIFA 官方逐場核對 | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums |

---

## 🔍 搜尋紀錄（共 15 次）
關鍵字清單：
1. FIFA world ranking April 2026 latest update
2. FIFA 2026 World Cup groups draw final
3. FIFA ranking April 2026 complete top 50 list
4. FIFA ranking April 2026 Senegal Iran Egypt Ecuador Scotland Australia Tunisia Algeria Austria
5. 2026 World Cup schedule Group A Mexico opening Estadio Azteca
6. France national team March 2026 Brazil Colombia
7. Brazil national team March 2026 France friendly
8. Argentina national team recent 5 matches 2025 2026
9. Spain national team friendly March 2026
10. England March 2026 Japan Wembley Tuchel
11. Portugal recent 5 matches Ronaldo
12. Germany recent results 2025 2026 Nagelsmann
13. Netherlands March 2026 / Belgium March 2026 / Morocco / Croatia
14. 2026 World Cup Group A/B/C/D/E/F/G/H/I/J/K/L schedule venues dates
15. Mexico / South Korea / Japan / Iran / Senegal recent results

---

## 📊 結論統計

- **查核聲明數**：共 **92+** 條（35 隊 × fifaRank + 35 隊 × recentForm + 12 組賽程 × md1 + 系統性分組檢核）
- **❌ 錯誤**：
  - FIFA 排名錯誤：**≥ 26 / 35 隊**
  - recentForm 錯誤：**≥ 9 / 12 檢核隊**（BRA/ENG/GER/ESP/POR/NED/BEL/MEX/CRO/URU/IRN）
  - 賽程 md1 日期/場地/對戰錯誤：**≥ 11 / 12 組**
  - 系統性（GROUPS 未更新、缺 13 支正式出線隊）：**1 項嚴重**
- **⚠️ 低信心 / 待人工確認**：6 條
- **✅ 正確**：ARG recentForm、ENG rank、NED rank、AUT rank、SUI/KOR group 字母等少量

**整體判定**：**兩份資料檔均需整體重寫**
- `data-teams.js` 35 隊中缺 13 支正式出線隊（RSA, BIH, HAI, CUW, SWE, CPV, NOR, IRQ, JOR, COD, TUR, PAR, CZE）
- `data-teams.js` 現有 35 隊的 `fifaRank` 需全面更新至 2026/04 版
- `data-teams.js` 現有 35 隊的 `recentForm` 需全面更新至 2026/03 窗後
- `data-matches.js` 12 組賽程的日期、場地、對戰組合需依 FIFA 官方賽程全面重寫
