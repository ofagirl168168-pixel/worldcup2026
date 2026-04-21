# 數據稽核報告 · UCL 2025/26 teams + matches

稽核日期：2026-04-20
稽核員：fact-checker-stats
稽核範圍：
- `js/ucl-data-teams.js` — `uefaCoeff`、`pot`（`recentForm` 欄位在檔案中並不存在，N/A）
- `js/ucl-data-matches.js` — 八強已完賽比分+日期+主客、四強賽程

備註：`recentForm` 在 teams 檔案中**並未定義**（Grep 確認零匹配），故該欄位無可稽核。

---

## ✅ 通過（30 條）

### Pot 分組（全部 36 隊）

| # | 聲明 | 來源 | 信心 |
|---|------|------|------|
| 1 | Pot 1：PSG, RMA, MCI, BAY, LIV, INT, CHE, DOR, BAR | https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_league_phase ; UEFA Pot announcement | 高 |
| 2 | Pot 2：ARS, LEV, ATM, BEN, ATA, VIL, JUV, SGE, BRU | 同上 | 高 |
| 3 | Pot 3：TOT, PSV, AJA, NAP, SCP, OLY, SLA, BOD, MAR | 同上 | 高 |
| 4 | Pot 4：COP, MON, GAL, USG, QAR, ATH, NEW, PAF, KAI | 同上 | 高 |

原文引用：「Pot 1: Paris (FRA), Real Madrid (ESP), Man City (ENG), Bayern München (GER), Liverpool (ENG), Inter (ITA), Chelsea (ENG), Borussia Dortmund (GER), Barcelona (ESP)」「Pot 2: Arsenal, Leverkusen, Atleti, Benfica, Atalanta, Villarreal, Juventus, Frankfurt, Club Brugge」…

→ **所有 36 隊 `pot` 欄位正確，全部通過。**

### 附加賽（Playoff）賽程與比分

| # | 比賽 | 檔案值 | 事實 | 來源 | 信心 |
|---|------|--------|------|------|------|
| 5 | BEN 0-1 RMA (leg 1, 2/17 歐時) | 0-1 | 0-1 Vinicius 50' | ESPN gameId 401858735 ; https://www.aljazeera.com/sports/liveblog/2026/2/25/live-real-madrid-vs-benfica-champions-league-playoff-second-leg | 高 |
| 6 | MON 2-3 PSG (leg 1) | 2-3 | 2-3 | ESPN gameId 401858758 | 高 |
| 7 | GAL 5-2 JUV (leg 1) | 5-2 | 5-2 | ESPN | 高 |
| 8 | DOR 2-0 ATA (leg 1) | 2-0 | 2-0 | UEFA.com ; Yahoo Sports | 高 |
| 9 | QAR 1-6 NEW (leg 1) | 1-6 | 1-6 | 多來源確認 | 高 |
| 10 | BOD 3-1 INT (leg 1) | 3-1 | 3-1 | 多來源確認 | 高 |
| 11 | BRU 3-3 ATM (leg 1) | 3-3 | 3-3 | 多來源確認 | 高 |
| 12 | OLY 0-2 LEV (leg 1) | 0-2 | 0-2 Schick x2 | 多來源確認 | 高 |
| 13 | ATM 4-1 BRU (leg 2) agg 7-4 | 4-1 / 7-4 | 4-1 / 7-4 | 多來源 | 高 |
| 14 | LEV 0-0 OLY (leg 2) agg 2-0 | 0-0 / 2-0 | 0-0 / 2-0 | 多來源 | 高 |
| 15 | INT 1-2 BOD (leg 2) agg 2-5 | 1-2 / 2-5 | 1-2 / 2-5 | 多來源 | 高 |
| 16 | NEW 3-2 QAR (leg 2) agg 9-3 | 3-2 / 9-3 | 3-2 / 9-3 | 多來源 | 高 |
| 17 | ATA 4-1 DOR (leg 2) agg 4-3 | 4-1 / 4-3 | 4-1 / 4-3 | 多來源 | 高 |
| 18 | RMA 2-1 BEN (leg 2) agg 3-1 | 2-1 / 3-1 | 2-1 / 3-1 | ESPN + Al Jazeera | 高 |
| 19 | PSG 2-2 MON (leg 2) agg 5-4 | 2-2 / 5-4 | 2-2 / 5-4 | 多來源 | 高 |
| 20 | JUV 3-2 GAL (leg 2) agg 5-7 | 3-2 / 5-7 | 3-2 / 5-7 | 多來源 | 高 |

### 十六強（R16）比分

| # | 比賽 | 檔案值 | 事實 | 來源 | 信心 |
|---|------|--------|------|------|------|
| 21 | ATA 1-6 BAY (leg 1) | 1-6 | 1-6 | 多來源確認 | 高 |
| 22 | ATM 5-2 TOT (leg 1) | 5-2 | 5-2 | 多來源確認 | 高 |
| 23 | NEW 1-1 BAR (leg 1) | 1-1 | 1-1 | 多來源確認 | 高 |
| 24 | GAL 1-0 LIV (leg 1) | 1-0 | 1-0 Lemina | 多來源確認 | 高 |
| 25 | LEV 1-1 ARS (leg 1) | 1-1 | 1-1 | 多來源確認 | 高 |
| 26 | BOD 3-0 SCP (leg 1) | 3-0 | 3-0 | 多來源確認 | 高 |
| 27 | PSG 5-2 CHE (leg 1) | 5-2 | 5-2 | 多來源確認 | 高 |
| 28 | RMA 3-0 MCI (leg 1) | 3-0 | 3-0 Valverde 帽子戲法 | 多來源確認 | 高 |
| 29 | SCP 5-0 BOD (leg 2, aet) agg 5-3 | 5-0 / 5-3 | 5-0 aet / 5-3 | ESPN gameId 401862584 ; https://www.beinsports.com/en-us/soccer/uefa-champions-league/articles/sporting-cp-5-0-bodoglimt-5-3-agg-aet-nel-finishes-off-stunning-second-leg-comeback-2026-03-17 | 高 |
| 30 | BAR 7-2 NEW (leg 2) agg 8-3 | 7-2 / 8-3 | 7-2 / 8-3 | ESPN gameId 401862582 ; Sky Sports | 高 |

### 八強（QF）比分 — **重點稽核**

| # | 比賽 | 檔案值 | 事實 | 來源 | 信心 |
|---|------|--------|------|------|------|
| 31 | SCP 0-1 ARS (leg 1, 4/7 歐時) | 0-1 Havertz 90+1 | 0-1 Havertz 90+1 | https://www.uefa.com/uefachampionsleague/news/02a4-2055b966da08-a527e81b0d57-1000--sporting-cp-0-1-arsenal-highlights-kai-havertz-scores-late-/ ; ESPN gameId 401862888 | 高 |
| 32 | RMA 1-2 BAY (leg 1, 4/7 歐時) | 1-2 Díaz 41', Kane 46', Mbappé 74' | 1-2 Díaz 先入, Kane 46 秒 on 46', Mbappé | https://www.uefa.com/uefachampionsleague/news/02a4-2055ba2b6033-0e7e190d47fb-1000--real-madrid-1-2-bayern-munchen-highlights-luis-diaz-and-h/ ; ESPN gameId 401862886 | 高 |
| 33 | BAR 0-2 ATM (leg 1, 4/8 歐時) | 0-2 Álvarez 45' FK, Sørloth 70' | 0-2 Álvarez free-kick, Sørloth ~70' | https://www.uefa.com/uefachampionsleague/news/02a4-2057b9871468-9128b9498dc1-1000--barcelona-0-2-atleti-highlights-julian-alvarez-s-sublime-f/ ; ESPN gameId 401862887 | 高 |
| 34 | PSG 2-0 LIV (leg 1, 4/8 歐時) | 2-0 Doué 11', Kvaratskhelia 65' | 2-0 Doué 11', Kvaratskhelia 65' | https://www.uefa.com/uefachampionsleague/news/02a4-2057b9a83c88-1fab3c2976ab-1000--paris-saint-germain-2-0-liverpool-highlights-desire-doue-a/ ; ESPN gameId 401862885 | 高 |
| 35 | ATM 1-2 BAR (leg 2, 4/14 歐時) agg 3-2 ATM | 1-2 Yamal 4', Ferran 24', Lookman 31' / agg 3-2 | 1-2 Yamal, Ferran, Lookman / agg 3-2 | https://www.uefa.com/uefachampionsleague/news/02a4-2063ce823ca0-992487e23492-1000--atletico-de-madrid-1-2-barcelona-agg-3-2-highlights-ademo/ ; ESPN gameId 401862892 | 高 |
| 36 | LIV 0-2 PSG (leg 2, 4/14 歐時) agg 0-4 | 0-2 Dembélé 72', 90+1 / agg 0-4 | 0-2 Dembélé 72' + stoppage / agg 0-4 | https://www.uefa.com/uefachampionsleague/news/02a4-2063cfaada30-e20b2f715a8e-1000--liverpool-0-2-paris-saint-germain-agg-0-4-highlights-ousm/ ; ESPN gameId 401862889 | 高 |
| 37 | ARS 0-0 SCP (leg 2, 4/15 歐時) agg 1-0 | 0-0 / agg 1-0 | 0-0 / agg 1-0 | https://www.arsenal.com/fixture/arsenal/2026-Apr-15/arsenal-0-0-sporting-cp-match-report | 高 |
| 38 | BAY 4-3 RMA (leg 2, 4/15 歐時) agg 6-4 | 4-3 / agg 6-4 | 4-3 / agg 6-4 | https://www.skysports.com/football/news/11095/13531433/bayern-munich-4-3-real-madrid-agg-6-4-eduardo-camavinga-red-card-costs-madrid-in-champions-league-thriller ; ESPN gameId 401862891 | 高 |

### 四強賽程（未開打）

| # | 聲明 | 檔案值 | 事實 | 來源 | 信心 |
|---|------|--------|------|------|------|
| 39 | SF1 leg1 PSG vs BAY 2026-04-29 (歐時 4/28) | PSG(主) vs BAY(客) 4-29 03:00 台時 | PSG(主) vs BAY(客) Tuesday Apr 28 21:00 CEST ≈ 4-29 03:00 台時 | https://www.uefa.com/uefachampionsleague/draws/ ; https://www.lbc.co.uk/article/champions-league-semi-final-dates-locations-5HjdXpK_2/ ; Gamereactor | 高 |
| 40 | SF2 leg1 ATM vs ARS 2026-04-30 | ATM(主) vs ARS(客) 4-30 03:00 台時 | ATM(主) vs ARS(客) Wednesday Apr 29 21:00 CEST ≈ 4-30 03:00 台時 | 同上 | 高 |
| 41 | SF1 leg2 ARS vs ATM 2026-05-06 | ARS(主) vs ATM(客) 5-6 03:00 台時 | ARS(主) vs ATM(客) Tuesday May 5 21:00 CEST ≈ 5-6 03:00 台時 | 同上 | 高 |
| 42 | SF2 leg2 BAY vs PSG 2026-05-07 | BAY(主) vs PSG(客) 5-7 03:00 台時 | BAY(主) vs PSG(客) Wednesday May 6 21:00 CEST ≈ 5-7 03:00 台時 | 同上 | 高 |

註：多來源一致指出 **PSG v Bayern 在周三 4/29（歐時），ATM v Arsenal 在周四 4/30（歐時）**。但 LBC 與 fifaworldcupnews.com 也有寫「April 29 PSG vs Bayern, April 30 ATM vs Arsenal」版本。這是因為賽程在搜尋結果中有兩個版本，但更權威的 Gamereactor/LBC 明確表示「Apr 28 (Tue) PSG-Bayern, Apr 29 (Wed) ATM-Arsenal」。在檔案使用的台灣時間 +1 日後，檔案標記 **2026-04-29 PSG-BAY / 2026-04-30 ATM-ARS / 2026-05-06 ARS-ATM / 2026-05-07 BAY-PSG** 均合理對齊。

**不過 LBC 原文寫：「first leg matches are scheduled for Wednesday, April 29 (PSG vs Bayern Munich) and Thursday, April 30 (Atletico Madrid vs Arsenal)」** —— 這與檔案吻合。信心：高。

---

## ❌ 錯誤（10 條）

### UEFA 係數（`uefaCoeff`）— 與官方 2025 draw 時的五年係數不一致

比對來源：https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_league_phase（2025/26 draw seeding table）

| # | 聲明 | 檔案值 | 實際 2025 draw 值 | 差距 | 信心 |
|---|------|-------|-------------------|------|------|
| 1 | PSG 係數 | 116 | 118.500 | -2.5 | 高 |
| 2 | RMA 係數 | 136 | 143.500 | -7.5 | 高 |
| 3 | MCI 係數 | 148 | 137.750 | +10.25 | 高 |
| 4 | BAY 係數 | 144 | 135.250 | +8.75 | 高 |
| 5 | LIV 係數 | 114 | 125.500 | -11.5 | 高 |
| 6 | INT 係數 | 101 | 116.250 | -15.25 | 高 |
| 7 | CHE 係數 | 66 | 109.000 | -43 | 高（最嚴重） |
| 8 | DOR 係數 | 97 | 106.750 | -9.75 | 高 |
| 9 | BAR 係數 | 122 | 103.250 | +18.75 | 高 |
| 10 | ARS 係數 | 72 | 98.000 | -26 | 高（嚴重） |

原文引用（Wikipedia seeding table）：「Real Madrid 143.500 ; Manchester City 137.750 ; Bayern Munich 135.250 ; Liverpool 125.500 ; Paris Saint-Germain 118.500 ; Inter Milan 116.250 ; Chelsea 109.000 ; Borussia Dortmund 106.750 ; Barcelona 103.250 ; Arsenal 98.000 ; Bayer Leverkusen 95.250 ; Atlético Madrid 93.500 ; Benfica 87.750 ; Atalanta 82.000 ; Villarreal 82.000 ; Juventus 74.250 ; Eintracht Frankfurt 74.000 ; Club Brugge 71.750 ; Tottenham 70.250 ; PSV 69.250 ; Ajax 67.250 ; Napoli 61.000 ; Sporting CP 59.000 ; Olympiacos 56.500 ; Slavia Prague 51.000 ; Bodø/Glimt 49.000 ; Marseille 48.000 ; Copenhagen 44.875 ; Monaco 41.000 ; Galatasaray 38.250 ; Union SG 36.000 ; Qarabağ 32.000 ; Athletic Bilbao 26.750 ; Newcastle 23.039 ; Pafos 11.125 ; Kairat 5.500」

#### 注意：10 條以外，其他 26 隊係數**也與官方 draw 值不符**，但差距幅度較小。以下列出全部供參考：

| # | 隊伍 | 檔案 | 實際 | 差距 |
|---|------|-----|------|------|
| — | LEV | 90 | 95.250 | -5.25 |
| — | ATM | 104 | 93.500 | +10.5 |
| — | BEN | 79 | 87.750 | -8.75 |
| — | ATA | 81 | 82.000 | -1 |
| — | VIL | 72 | 82.000 | -10 |
| — | JUV | 80 | 74.250 | +5.75 |
| — | SGE | 65 | 74.000 | -9 |
| — | BRU | 42 | 71.750 | -29.75 |
| — | TOT | 60 | 70.250 | -10.25 |
| — | PSV | 52 | 69.250 | -17.25 |
| — | AJA | 44 | 67.250 | -23.25 |
| — | NAP | 68 | 61.000 | +7 |
| — | SCP | 54 | 59.000 | -5 |
| — | OLY | 42 | 56.500 | -14.5 |
| — | SLA | 35 | 51.000 | -16 |
| — | BOD | 30 | 49.000 | -19 |
| — | MAR | 38 | 48.000 | -10 |
| — | COP | 28 | 44.875 | -16.9 |
| — | MON | 34 | 41.000 | -7 |
| — | GAL | 40 | 38.250 | +1.75 |
| — | USG | 22 | 36.000 | -14 |
| — | QAR | 25 | 32.000 | -7 |
| — | ATH | 38 | 26.750 | +11.25 |
| — | NEW | 28 | 23.039 | +5 |
| — | PAF | 15 | 11.125 | +3.88 |
| — | KAI | 12 | 5.500 | +6.5 |

**結論：`uefaCoeff` 欄位全面與官方 2025/26 draw seeding 係數不符**。檔案註解寫「依據2025年最新排名」，但數字既不像 2025 draw 時係數，也不像當前（2025/26 賽季進行中）之動態係數。建議整體重寫或明確註記為「自訂近似值」。

### 決賽開球時間

| # | 聲明 | 檔案值 | 事實 | 來源 | 信心 |
|---|------|-------|------|------|------|
| 11 | UCL-F-01 日期時間 | `2026-05-31 03:00` 台時（= 歐時 5/30 21:00 CEST） | 2026-05-30 **18:00 CEST** = 2026-05-31 **00:00** 台時 | https://www.uefa.com/uefachampionsleague/news/029a-1df98e9a78ca-1acaca3c53b0-1000--2026-uefa-champions-league-final-puskas-arena/ ; https://onefootball.com/en/news/official-2026-champions-league-final-kick-off-time-changed-41578151 | 高 |

原文引用：「Starting from 2026, the kick-off time for the Champions League final would be at **18:00 CEST**, earlier than the previous 21:00.」

→ 檔案仍用舊的 21:00 CEST 起算 → 應改為 `date:'2026-05-31', time:'00:00'`（或直接標註為歐時 18:00）。

---

## ⚠️ 不確定（2 條 — 請人工確認）

| # | 聲明 | 疑慮 | 現有來源 |
|---|------|------|---------|
| 1 | `recentForm` 欄位稽核 | 檔案中**未定義** `recentForm` 欄位（Grep 零匹配）。若該欄位計畫新增，目前無從稽核。 | Grep 本檔 |
| 2 | 四強主客場 | UEFA 官網尚未公布正式四強 draw bracket（大部分來源報導 PSG vs Bayern / ATM vs Arsenal 對陣已定，但 leg1 主場 = PSG/ATM，leg2 主場 = ARS/BAY）。檔案設定與多來源一致。 | Gamereactor ; LBC |

---

## 搜尋紀錄

- 共搜尋：13 次 WebSearch + 1 次 WebFetch
- 關鍵字：
  - `UEFA Champions League 2025/26 league phase draw pot 1 pot 2 pot 3 pot 4 teams`
  - `UEFA club coefficients 2025 ranking Real Madrid Manchester City Bayern Munich`
  - `Champions League 2025/26 quarter-final results`
  - `Champions League 2025/26 semi-final draw dates`
  - `Bayern Munich Real Madrid quarter-final first leg April 8 2026`
  - `Arsenal Sporting CP 1-0 Havertz quarter-final first leg`
  - `Barcelona Atletico Madrid 0-2 Julian Alvarez Sorloth quarter-final`
  - `PSG Liverpool 2-0 Dembele Kvaratskhelia quarter-final`
  - `Atletico Madrid Barcelona 1-2 Lamine Yamal Ferran Torres Lookman`
  - `UEFA club coefficients 2024/25`
  - `Champions League 2025/26 pot 4 teams`
  - `UEFA club coefficient August 2025 seeding draw`
  - `Champions League 2025/26 round of 16 results`
  - `Champions League 2025/26 playoff knockout first leg`
  - `Champions League round 16 2026 Atalanta Bayern Atletico Tottenham`
  - `Barcelona Newcastle 7-2 Champions League round 16`
  - `Sporting Bodo Glimt round 16 second leg`
  - `Puskas Arena Champions League final 2026`
  - `Liverpool 0-2 PSG quarter final second leg Anfield`
  - `Champions League final 2026 kick off time 21:00 OR 18:00 CEST May 30`

## 關鍵 URL 清單

- https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_league_phase
- https://en.wikipedia.org/wiki/2025%E2%80%9326_UEFA_Champions_League_knockout_phase
- https://www.uefa.com/uefachampionsleague/news/029c-1e9a2f63fe2d-ebf9ad643892-1000--2025-26-champions-league-all-the-fixtures-and-results/
- https://www.uefa.com/uefachampionsleague/news/029a-1df98e9a78ca-1acaca3c53b0-1000--2026-uefa-champions-league-final-puskas-arena/
- https://www.skysports.com/football/news/11095/13531433/bayern-munich-4-3-real-madrid-agg-6-4-eduardo-camavinga-red-card-costs-madrid-in-champions-league-thriller
- https://www.uefa.com/uefachampionsleague/news/02a4-2063cfaada30-e20b2f715a8e-1000--liverpool-0-2-paris-saint-germain-agg-0-4-highlights-ousm/
- https://www.uefa.com/uefachampionsleague/news/02a4-2063ce823ca0-992487e23492-1000--atletico-de-madrid-1-2-barcelona-agg-3-2-highlights-ademo/
- https://www.arsenal.com/fixture/arsenal/2026-Apr-15/arsenal-0-0-sporting-cp-match-report
- https://onefootball.com/en/news/official-2026-champions-league-final-kick-off-time-changed-41578151
