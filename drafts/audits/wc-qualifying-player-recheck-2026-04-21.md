# World Cup Qualifying Teams Fact-Check (2026-04-21)

Scope: `js/data-fix.js` 前半部 13 支附加賽出線球隊的 `coach` / `keyPlayers` / `strengths` / `weaknesses` 欄位。

已知修正（使用者指示不再報告）：
- EUPB Sweden: Isak→利物浦、Lindelöf→阿斯頓維拉
- EUPD Czechia: Coufal→霍芬海姆
- PAR: Almirón→亞特蘭大聯
- CUW: 教練 Bicentini→Advocaat
- ICP2 Iraq: 教練 Casas→Graham Arnold

---

## 錯誤清單

| 隊代碼 | 欄位 | 現值 | 應為 | 來源 URL + 原文引用 | 信心 |
|---|---|---|---|---|---|
| RSA | keyPlayers[0].club (Percy Tau) | `Al-Ahly` | `Thep Xanh Nam Dinh`（越南南定 FC） | https://en.wikipedia.org/wiki/Percy_Tau ；Goal.com：「Bafana Bafana star Percy Tau joins… after leaving Qatar SC」。原文「Tau parted ways with Qatar SC at the end of last season, and then signed with Vietnamese champions Thep Xanh Nam Dinh FC in August 2025」 | 高 |
| RSA | keyPlayers[2].club (Bongani Zungu) | `Amiens` | `AmaZulu FC`（現效力南非 AmaZulu，非法甲 Amiens） | https://www.transfermarkt.us/bongani-zungu/profil/spieler/240892 ；kickoff.com：「Former Sundowns Player Bongani Zungu Joins AmaZulu」 | 高 |
| HAI | coach | `Marc Collat` | `Sébastien Migné` | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/sebastien-mign-haiti-interview ；Wikipedia 原文「Migné became Haiti's head coach…」；outkick.com：「Haiti Reaches 2026 World Cup With Coach Who's Never Even Set Foot in the Country」指 Sébastien Migné | 高 |
| HAI | keyPlayers[0].club (Duckens Nazon) | `待定` | `Esteghlal F.C.`（伊朗） | https://www.fotmob.com/players/525445/duckens-nazon ；「Duckens Nazon is a 31-year-old football player who plays as a striker for Esteghlal as of 2026」 | 中高 |
| PAR | keyPlayers[1].club (Antonio Sanabria) | `托連奴`（Torino） | `克雷莫納`（Cremonese） | https://www.transfermarkt.us/antonio-sanabria/profil/spieler/234523 ；「Antonio Sanabria joined Cremonese on 21 August 2025」 | 高 |
| PAR | keyPlayers[2].club (Óscar Romero) | `River Plate` | `Huracán`（或 自由身 — 現值不正確，River Plate 無紀錄） | https://en.wikipedia.org/wiki/%C3%93scar_Romero_(footballer) ；Wikipedia：「plays as an attacking midfielder for Primera División club Huracán」；Transfermarkt 顯示 2026-01-01 起為自由身 | 中高 |
| CUW | keyPlayers[2].club (Tahith Chong) | `史特拉斯堡`（Strasbourg） | `Sheffield United`（英冠） | https://en.wikipedia.org/wiki/Tahith_Chong ；「plays as a wide midfielder… for EFL Championship club Sheffield United…He joined Sheffield United on a four-year deal on August 29, 2025」 | 高 |
| CUW | keyPlayers[1].club (Juninho Bacuna) | `比勒陀利亞大學` | `Volendam`（租借，母會 Gaziantep） | https://en.wikipedia.org/wiki/Juninho_Bacuna ；「On 3 February 2026, Bacuna joined Eredivisie side Volendam on a half-a-year long loan… on loan from Turkish club Gaziantep」 | 高 |
| CPV | keyPlayers[0].club (Djaniny) | `Al-Qadsiah` | `Al-Fateh FC`（沙烏地） | https://www.fotmob.com/players/281338/djaniny ；「his next match is on February 26, 2026 when Al Fateh FC face Damac FC in the Saudi Pro League」 | 中高 |
| JOR | coach | `Hussein Ammouta` | `Jamal Sellami` | https://en.wikipedia.org/wiki/Jamal_Sellami ；FIFA：「Sellami replaces Ammouta as Jordan head coach」；「became the manager of the Jordan national team in June 2024, after Hussein Ammouta」 | 高 |
| JOR | keyPlayers[0].club (Musa Al-Taamari) | `蒙彼利埃`（Montpellier） | `Stade Rennais`（雷恩） | https://en.wikipedia.org/wiki/Musa_Al-Taamari ；「On 3 February 2025, Al-Tamari joined Stade Rennais FC for a reported €9 million transfer fee, signing a contract until June 2028」 | 高 |
| EUPD | coach | `Ivan Hašek` | `Miroslav Koubek` | https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/czechia-ivan-hasek-departs ；tribalfootball：「74-year-old Koubek appointed Czech Republic coach before playoffs」；「Koubek replaced Ivan Hašek…signed a contract running until June 2028」 | 高 |
| EUPA | keyPlayers[0].club (Edin Džeko) | `費倫茨瓦羅斯`（Ferencváros） | `Schalke 04`（2. Bundesliga） | https://www.bundesliga.com/en/2bundesliga/news/edin-dzeko-joins-schalke-fiorentina-bosnia-striker-35656 ；「On 22 January 2026, Schalke 04 confirmed that they signed Džeko until the end of the season」；此前他於 2025 夏天曾由 Fenerbahçe 加盟 Fiorentina | 高 |
| EUPA | keyPlayers[1].club (Sead Kolašinac) | `馬賽`（Marseille） | `Atalanta`（意甲） | https://en.wikipedia.org/wiki/Sead_Kola%C5%A1inac ；UEFA 官方：「Sead Kolašinac \| Atalanta \| UEFA Champions League 2025/26」；「joined Atalanta on July 6, 2023」 | 高 |
| EUPC | keyPlayers[2].club (Cenk Tosun) | `待定` | `Kasımpaşa` | https://www.transfermarkt.us/cenk-tosun/profil/spieler/45671 ；「Cenk Tosun's current club is Kasimpasa, which he joined on January 15, 2026」 | 高 |
| EUPB | coach | `Jon Dahl Tomasson` | `Graham Potter` | https://www.flashscoreusa.com/news/soccer-world-cup-graham-potter-replaces-tomasson-as-head-coach-of-swedish-national-team/AaPvW9hn/ ；「Graham Potter has been named as the new manager of the Swedish men's national team…Potter replaces Jon Dahl Tomasson, whom the Swedish FA fired last week」（2025-10 解雇，2025-11 上任） | 高 |
| EUPB | weaknesses[0] | `Ibrahimović退役後中場組織稍弱` | 事實正確但敘述過時（Ibra 2023 退役，瑞典中場弱點仍成立） | 保留但建議更新表述 | 低（非事實錯誤） |
| ICP1 | keyPlayers[0].club (Chancel Mbemba) | `馬賽`（Marseille） | `LOSC Lille` | https://www.transfermarkt.us/chancel-mbemba/profil/spieler/203348 ；「Chancel Mbemba's current club in 2026 is LOSC Lille, which he joined on September 1, 2025」 | 高 |
| ICP1 | keyPlayers[2].club (Arthur Masuaku) | `貝西克塔斯`（Beşiktaş） | `RC Lens`（租借，母會 Sunderland） | https://en.wikipedia.org/wiki/Arthur_Masuaku ；「Arthur Masuaku joined Lens in Ligue 1 on loan on 27 January 2026… He signed a two-year contract with Sunderland in August 2025」 | 高 |
| ICP1 | strengths[0] | `Mbemba是法甲頂級後衛` | 技術上 Lille 確實在法甲，敘述仍成立（事實可保留） | 無需改（現仍於法甲 Lille） | 低（無錯誤） |
| ICP2 | keyPlayers[0].club (Aymen Hussein) | `Al-Zawraa` | `Al-Karma`（伊拉克星級聯賽） | https://www.transfermarkt.us/aymen-hussein/profil/spieler/401054 ；「He joined Al-Karma on July 31, 2025」 | 高 |
| ICP2 | keyPlayers[1].club (Ibrahim Bayesh) | `Al-Shorta` | `Al-Dhafra FC`（阿聯酋甲） | https://www.transfermarkt.us/ibrahim-bayesh/profil/spieler/560957 ；「Ibrahim Bayesh's current club as of 2026 is Al-Dhafra FC, which he joined on February 8, 2026」 | 高 |

---

## 已驗證「無誤」欄位（摘要，供參考）

- RSA coach Hugo Broos ✓（仍為南非主帥）
- RSA keyPlayers[1] Ronwen Williams / Mamelodi Sundowns ✓
- PAR coach Gustavo Alfaro ✓
- NOR coach Ståle Solbakken ✓
- NOR keyPlayers[0] Haaland / 曼城 ✓
- NOR keyPlayers[1] Ødegaard / 兵工廠 ✓
- NOR keyPlayers[2] Sørloth / 馬德里競技 ✓
- CPV coach Pedro "Bubista" Brito ✓
- EUPD keyPlayers[0] Souček / 西漢姆 ✓
- EUPD keyPlayers[1] Schick / 拜耳勒沃庫森 ✓
- EUPC coach Vincenzo Montella ✓
- EUPC keyPlayers[0] Çalhanoğlu / 國際米蘭 ✓
- EUPC keyPlayers[1] Arda Güler / 皇家馬德里 ✓
- EUPA coach Sergej Barbarez ✓
- EUPB keyPlayers[1] Kulusevski / 熱刺 ✓（雖然長期傷缺但合約歸屬仍為熱刺）
- ICP1 coach Sébastien Desabre ✓

---

## 錯誤統計

- 教練錯誤：**4** 筆（HAI、JOR、EUPD、EUPB）
- 球員俱樂部錯誤：**13** 筆（RSA ×2、HAI ×1、PAR ×2、CUW ×2、CPV ×1、JOR ×1、EUPA ×2、EUPC ×1、ICP1 ×2、ICP2 ×2 — 實際列出 13 列）
- 合計 **17 筆** 事實錯誤（教練 4 + 球員 13）
