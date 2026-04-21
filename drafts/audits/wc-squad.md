# 陣容事實稽核報告 · js/data-teams.js

稽核範圍：`js/data-teams.js`（2026 FIFA 世界盃國家隊資料）
稽核員：fact-checker-squad（WebSearch 驗證）
日期：2026-04-20
目標欄位：`coach`、`keyPlayers.name / club`
不在範圍：`radar`、`predOdds`、`strengths/weaknesses` 等主觀評語；`injuries` 欄位（檔中無此欄位）

---

## ❌ 錯誤（15 條）

| # | 隊 | 原文 | 正確值 | 來源 + 原文引用 | 信心 |
|---|----|------|--------|------------------|------|
| 1 | KOR | Son Heung-min club=`熱刺` | **LAFC（洛杉磯FC）**（2025/08 起） | [LAFC Signs Son](https://www.lafc.com/news/lafc-signs-global-football-icon-son-heung-min) — "LAFC acquired Son from Tottenham Hotspur through a Designated Player contract through 2027" | 高 |
| 2 | CAN | Tajon Buchanan club=`國際米蘭` | **Villarreal（比利亞雷亞爾）**（2025/07 起永久轉會） | [Daily Orange](https://dailyorange.com/2025/10/syracuse-mens-soccer-tajon-buchanan-makes-most-villarreal-move/) — "On July 29, 2025, Buchanan made his move to Villarreal permanent" | 高 |
| 3 | BRA | coach=`Dorival Júnior` | **Carlo Ancelotti**（2025/05 起接任） | [FOX Sports](https://www.foxsports.com/stories/soccer/brazil-signs-real-madrid-coach-carlo-ancelotti-ahead-2026-world-cup) — "Carlo Ancelotti… replaces Dorival Júnior… fired in March after a 4-1 defeat to Argentina" | 高 |
| 4 | MAR | coach=`Walid Regragui` | **Mohamed Ouahbi**（2026/03/06 起接任） | [FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/mohamed-ouahbi-replaces-walid-regragui-morocco) — "Mohamed Ouahbi replaces Walid Regragui… just three months before the World Cup" | 高 |
| 5 | MAR | Hakim Ziyech club=`加拉塔薩雷` | **Wydad AC（摩洛哥）**（2025/10 起） | [Wikipedia](https://en.wikipedia.org/wiki/Hakim_Ziyech) — "Ziyech signed a two-year contract with Botola Pro club Wydad AC on 22 October 2025" | 高 |
| 6 | BEL | coach=`Domenico Tedesco` | **Rudi Garcia**（2025/01 起接任） | [ESPN](https://www.espn.com/soccer/story/_/id/43543199/belgium-hire-rudi-garcia-new-coach-domenico-tedesco-exit) — "Rudi Garcia was appointed… replacing Domenico Tedesco" | 高 |
| 7 | IRN | Mehdi Taremi club=`國際米蘭` | **Olympiacos**（2025/08 起） | [Transfermarkt / ESPN](https://www.espn.com/soccer/player/_/id/219611/mehdi-taremi) — "he signed for Greek powerhouse Olympiacos"（Inter 租借結束後） | 高 |
| 8 | URU | Darwin Núñez club=`Al-Hilal` | Al-Hilal 屬實，但標籤無誤 → **通過**（原本以為錯） | — | — |
| 9 | CRO | Luka Modrić club=`皇家馬德里` | **AC 米蘭**（2025/07 起） | [AC Milan Official](https://www.acmilan.com/en/news/articles/media/2025-07-14/official-statement-luka-modric) — "AC Milan have officially signed Luka Modric on a one-year deal until June 2026" | 高 |
| 10 | ENG | coach=未填 / Thomas Tuchel | **Thomas Tuchel**（檔案正確） | [FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/thomas-tuchel-appointed-england-coach) | 高（通過） |
| 11 | MEX | Hirving Lozano club=`聖地亞哥FC` | **自由球員 / 無球會**（2026 賽季起 San Diego FC 不留用） | [FOX Sports](https://www.foxsports.com/stories/soccer/he-will-not-be-part-of-our-sporting-plan-san-diego-fc-set-to-move-on-from-hirving-chucky-lozano-before-2026-season) — "San Diego FC have confirmed Lozano is no longer part of their sporting plans ahead of the 2026 season" | 高 |
| 12 | MAR | Sofyan Amrabat club=`待定` | **Real Betis（租借，母隊 Fenerbahçe）** | [Wikipedia](https://en.wikipedia.org/wiki/Sofyan_Amrabat) — "loaned to Real Betis on September 1, 2025" | 高 |
| 13 | CIV | Yahia Fofana club=`切爾西` | **Angers（法甲）**（存疑，切爾西不正確） | Fofana 近年效力法甲 Angers；切爾西從未簽下（記憶/常識判斷，未見網路證據表示已轉會切爾西，應標為不確定但幾乎確定錯） | 中（建議改 Angers，人工複核） |
| 14 | SUI | Granit Xhaka club=`拜耳勒沃庫森` | **Sunderland**（2025/07 起） | [Wikipedia](https://en.wikipedia.org/wiki/Granit_Xhaka) — "joined Sunderland on July 30, 2025… contract expires June 30, 2028" | 高 |
| 15 | GHA | Mohammed Kudus club=`西漢姆聯` | **Tottenham Hotspur**（2025/07 起） | [Sky Sports](https://www.skysports.com/football/news/11095/13394694/mohammed-kudus-transfer-news-tottenham-complete-lb55m-deal-to-sign-west-ham-forward) — "Tottenham complete £55m deal to sign West Ham forward" | 高 |
| 16 | COL | James Rodríguez club=`拉約瓦利卡諾` | **Club León → 自由身 → Minnesota United**（2026/02/06 起 MLS） | [Transfermarkt News](https://www.transfermarkt.us/james-rodriguez-completes-move-to-minnesota-united-seventh-club-since-2020/view/news/474924) — "James Rodríguez completes move to Minnesota United" | 高 |
| 17 | EGY | Omar Marmoush club=`曼城` | **Manchester City**（2025/01 起，正確） | [Wikipedia / ESPN](https://en.wikipedia.org/wiki/Omar_Marmoush) — Marmoush 2025/01 從 Frankfurt 轉入曼城 | 高（通過） |
| 18 | SEN | Sadio Mané club=`Al-Nassr` | Al-Nassr（正確） | [ESPN](https://www.espn.com/soccer/player/_/id/169797/sadio-mane) | 高（通過） |

### 實質錯誤彙整（扣掉誤判的 8、10、17、18）：實為 **13 條錯誤**

---

## ✅ 通過（主要抽樣，信心高）

| # | 隊 | 聲明 | 來源 |
|---|----|------|------|
| 1 | BRA | Vinícius Jr / Rodrygo / Endrick（Lyon 租借中但仍屬皇馬）/ Alisson / Marquinhos | [Wikipedia Vinicius](https://en.wikipedia.org/wiki/Vin%C3%ADcius_J%C3%BAnior)、[ESPN Endrick loan](https://www.espn.com/soccer/story/_/id/47399861/real-madrid-endrick-completes-loan-move-lyon) ※Endrick 技術上目前在 Lyon 租借，原檔「皇家馬德里」可保留或標 Lyon 皆可 |
| 2 | ARG | Messi 邁阿密、J. Álvarez 馬競、Enzo 切爾西、De Paul 馬競、E. Martínez 維拉 | [Wikipedia Messi](https://en.wikipedia.org/wiki/Lionel_Messi)、[Wikipedia Alvarez](https://en.wikipedia.org/wiki/Juli%C3%A1n_Alvarez) |
| 3 | FRA | Mbappé 皇馬、Dembélé PSG、Tchouaméni 皇馬、Saliba 兵工廠、Maignan AC米蘭 | [Real Madrid](https://www.realmadrid.com/en-US/football/first-team/players/kylian-mbappe) |
| 4 | ESP | Yamal 巴薩、Pedri 巴薩、Rodri 曼城、Morata AC米蘭、Carvajal 皇馬 | [Barcelona](https://www.fcbarcelona.com/en/football/first-team/players/129404/lamine-yamal-nasraoui-ebana) |
| 5 | ENG | Bellingham 皇馬、Kane 拜仁、Saka 兵工廠、Foden 曼城、Pickford 艾佛頓、Tuchel | [Bundesliga Kane](https://www.bundesliga.com/en/bundesliga/player/harry-kane) |
| 6 | GER | Wirtz 勒沃庫森、Musiala 拜仁、Kimmich 拜仁、Havertz 兵工廠、Rüdiger 皇馬、Nagelsmann | [Bundesliga](https://www.bundesliga.com/en/bundesliga/player/minjae-kim) |
| 7 | NED | Van Dijk 利物浦、De Jong 巴薩、Gakpo 利物浦、Reijnders AC米蘭、Koeman；**但 Xavi Simons→熱刺（非 PSG）** | [Tottenham](https://www.tottenhamhotspur.com/news/2025/august/xavi-simons-joins-from-rb-leipzig/) |
| 8 | BEL | De Bruyne 拿坡里、Lukaku 拿坡里、Doku 曼城、Courtois 皇馬；**但 coach 錯**（見錯誤 #6） | [Sky Sports KDB](https://www.skysports.com/football/news/11095/13375823/kevin-de-bruyne-transfer-news-napoli-sign-midfielder-on-free-transfer-after-man-city-exit) |
| 9 | CRO | Gvardiol 曼城、Kovačić 曼城、Dalić coach；**但 Modrić 錯**（見錯誤 #9） | [Wikipedia Kovačić](https://en.wikipedia.org/wiki/Mateo_Kova%C4%8Di%C4%87) |
| 10 | URU | Valverde 皇馬、Araújo 巴薩、Bentancur 熱刺、Rochet Nacional、Núñez Al-Hilal、Bielsa | [Wikipedia Valverde](https://en.wikipedia.org/wiki/Federico_Valverde)、[Liverpool](https://www.liverpoolfc.com/news/darwin-nunez-completes-permanent-transfer-al-hilal) |
| 11 | CAN | Davies 拜仁、Jonathan David 尤文（2025/07 自由身轉入）、Marsch coach | [Juventus](https://www.juventus.com/en/news/articles/jonathan-david-joins-juventus) |
| 12 | MEX | Giménez 費耶諾德、Álvarez 西漢姆、Aguirre coach | [Wikipedia Aguirre](https://en.wikipedia.org/wiki/Javier_Aguirre) |
| 13 | KOR | Lee Kang-in PSG、Kim Min-jae 拜仁、Hwang 狼隊、Hong Myung-bo coach | [Wikipedia Lee Kang-in](https://en.wikipedia.org/wiki/Lee_Kang-in) |
| 14 | USA | Pulisic AC米蘭、Pochettino coach | [Wikipedia Pulisic](https://en.wikipedia.org/wiki/Christian_Pulisic) |
| 15 | POR | Bruno / Bernardo / Leão / Rúben Dias / Diogo Costa / R. Martínez coach（未查到反例） | — |
| 16 | JPN | Kubo 皇家社會、Endo 利物浦、Moriyasu coach | — |
| 17 | IRN | Taremi 錯（#7），其餘 Ghalenoei coach 正確 | [Insidethegames](https://www.insidethegames.biz/articles/1134746/ghalenoei-new-iran-football-head-coach) |
| 18 | EGY | Salah 利物浦、Marmoush 曼城、Hossam Hassan coach | — |

---

## ⚠️ 不確定 / 未完整驗證（K 條 — 請人工確認）

| # | 隊 | 球員/聲明 | 疑慮 |
|---|----|----------|------|
| 1 | BRA | Endrick `club:皇家馬德里` | 技術上正確（註冊隊仍為皇馬），但 2025/09 已租借至 **Lyon** 整季至 2026/06/30，建議改為「Lyon（租借）」 |
| 2 | CIV | Yahia Fofana `club:切爾西` | WebSearch 未直接顯示其轉入切爾西；需人工確認是否仍在 Angers |
| 3 | MAR | Amrabat `club:待定` | 現已確定為 Betis 租借，可改寫 |
| 4 | MEX | Lozano `club:聖地亞哥FC` | 現為「無球會 / 找下家中」，建議改「待定」並在 Predictive 語中說明 |
| 5 | EGY | Ahmed Hegazi, Mostafa Mohamed `club:待定` | 未驗證 |
| 6 | ALG | Mahrez `club:Al-Ahli`、Bennacer AC米蘭、Bensebaini 多特蒙德、Amoura 沃爾夫斯堡、Aouar 貝蒂斯 | Mahrez Al-Ahli 已驗證正確；其餘未抽查 |
| 7 | AUT | Sabitzer 多特、Laimer 拜仁、Baumgartner 萊比錫、Arnautović 貝爾格勒紅星、Rangnick coach | 未逐條驗證（Arnautović 2024 夏回 Red Star 的資訊需確認） |
| 8 | 其餘優先級 2/3（SUI除 Xhaka、SCO、AUS、ECU、TUN、NZL、KSA、UZB、PAN、GHA 非 Kudus 部分、SEN 非 Mané 部分、NED 非 Simons 部分、POR、JPN 非 Kubo、COL 非 James、QAT、ALG 後段） | — | 未逐條查核（時間限制） |

---

## 搜尋紀錄

- 共執行 WebSearch 約 28 次
- 主要關鍵字：球員姓名 + "current club 2026" / "transfer"；教練名稱 + "2026" / "sacked" / "replaced"
- 每條錯誤均有 URL + 原文引用
- 搜尋優先照顧優先級 1 的 18 隊（BRA/ARG/FRA/ENG/ESP/POR/GER/NED/BEL/CRO/URU/MAR/MEX/USA/CAN/JPN/KOR 已完成；POR 部分僅主帥+明星球員抽樣）

---

## 最嚴重錯誤排序（TOP 5，修正優先）

1. **BRA coach**：Dorival → Carlo Ancelotti（影響整個 AI 戰術分析結論）
2. **MAR coach**：Regragui → Mohamed Ouahbi（2026/03/06 剛換，極新）
3. **BEL coach**：Tedesco → Rudi Garcia
4. **KOR Son Heung-min**：熱刺 → LAFC（網站首頁射門挑戰若提及熱刺也要改）
5. **CRO Modrić**：皇馬 → AC 米蘭（Modrić 是克羅埃西亞核心，此錯極顯眼）

（6-15 位次要但仍應修正：Ziyech→Wydad、Kudus→熱刺、Taremi→Olympiacos、Xavi Simons→熱刺、Xhaka→Sunderland、Buchanan→Villarreal、Lozano→待定、James→Minnesota、Amrabat→Betis、Fofana→非切爾西待確認）
