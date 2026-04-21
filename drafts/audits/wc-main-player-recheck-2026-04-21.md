# 世界盃主組 35 支國家隊球員俱樂部稽核報告

**稽核日期**：2026-04-21
**範圍**：`js/data-teams.js` 主組 35 支球隊
**驗證欄位**：`coach`、`keyPlayers[].name + club`、`strengths/weaknesses` 中提及球員
**不驗證**：fifaRank、radar、recentForm、formation、history、predOdds
**註**：已排除使用者標註的「已知修正」清單（BRA/MAR/BEL 教練、KOR Son、CAN Buchanan、SUI Xhaka、CIV Fofana、NED Simons/Reijnders、IRN Taremi、MEX Lozano、CRO Modrić、COL James、GHA Kudus、MAR Ziyech/Amrabat）。

---

## 錯誤清單（需修正）

| 隊 | 欄位 | 現值 | 應為 | 來源 URL + 原文引用 | 信心 |
|---|---|---|---|---|---|
| CAN | keyPlayers Jonathan David.club | 尤文圖斯 | 尤文圖斯 ✔（2025-07 自由身加盟） | Wikipedia: "David signed for Serie A club Juventus on July 23, 2025" | 高（正確，無需修改） |
| USA | keyPlayers Giovanni Reyna.club | 門興格拉德巴赫 | 門興格拉德巴赫 ✔（2025-08 從多特永久轉會） | Bundesliga/Transfermarkt: "Giovanni Reyna made a permanent move to Borussia Mönchengladbach on August 23, 2025" | 高（正確，無需修改） |
| GER | keyPlayers Florian Wirtz.club | **拜耳勒沃庫森** | **利物浦** | Liverpool FC / Wikipedia: "He joined Liverpool on July 1, 2025"；2025-06-20 利物浦破俱樂部紀錄 £100m 簽下 | 高 |
| ECU | keyPlayers Jeremy Sarmiento.club | **布萊頓** | **米德斯堡（租借自布萊頓）** 或 **布萊頓（母會）** | Transfermarkt: "current club is Middlesbrough FC on loan from Brighton"；2026-01 從布萊頓租借至米堡 | 中（母會仍是布萊頓，但本季主要在米堡/2025-26 先在克雷莫納後轉米堡） |
| NED | keyPlayers Xavi Simons.club | 熱刺 | 熱刺 ✔（2025-08-29 從萊比錫轉會） | Tottenham 官網 / Sky Sports：£51.8m 簽約 | 高（正確，無需修改） |
| NED | keyPlayers Tijjani Reijnders.club | 曼城 | 曼城 ✔（2025-06 £46.5m 從 AC 米蘭） | Wikipedia / Sky Sports | 高（正確，無需修改） |
| JPN | keyPlayers Junya Ito.club | **蘭斯（Reims）** | **亨克（KRC Genk）** | KRC Genk 官網 / Wikipedia: "Ito rejoins KRC Genk from Stade de Reims"；2025-08-09 從蘭斯回到亨克 | 高 |
| JPN | keyPlayers Daichi Kamada.club | **待定** | **水晶宮（Crystal Palace）** | Premier League 官網 / Wikipedia: 2024-07 加盟，2025-26 賽季仍在效力並獲 9 月單月最佳球員提名 | 高 |
| TUN | keyPlayers Hannibal Mejbri.club | **塞維利亞** | **伯恩利（Burnley）** | Premier League / Planet Sport: "On August 28, 2024, Mejbri joined Burnley on a four-year contract"；2025-26 隨伯恩利升上英超 | 高 |
| TUN | keyPlayers Wahbi Khazri.club | **待定** | **退役**（或列為自由身/退役） | Wikipedia: "Wahbi Khazri announced his retirement from professional football on 12 December 2025" | 高 |
| TUN | keyPlayers Aïssa Laïdouni.club | **待定** | **Al-Wakrah（卡達）** | bettingacademy / fotmob: "plays as a defensive midfielder for Qatari club Al-Wakrah" | 中 |
| TUN | keyPlayers Aymen Dahmen.club | **待定** | **CS Sfaxien（突尼西亞）** | Transfermarkt / 365scores: 2025-09-25 合約續約至 2028 | 中 |
| BEL | keyPlayers Arthur Theate.club | **雷恩（Rennes）** | **法蘭克福（Eintracht Frankfurt）** | getfootballnewsgermany: 2025-02-02 從 Rennes 永久簽下（€13m+€6m bonus） | 高 |
| IRN | keyPlayers Alireza Jahanbakhsh.club | **費內巴切** | **FCV Dender EH（比利時）** 或 **自由身** | PersianFootball: 2025-11-04 簽約 Dender 一年合約（+1 option），Heerenveen 2024-25 合約已到期 | 高 |
| IRN | keyPlayers Alireza Beiranvand.club | **待定** | **Tractor S.C.（伊朗 Persian Gulf Pro League）** | Transfermarkt / ifpnews: 2024-07-16 加盟至 2026-06 | 中 |
| NZL | keyPlayers Liberato Cacace.club | **埃姆波利（Empoli）** | **雷克斯漢姆（Wrexham，英冠）** | ESPN / Wrexham 官網: "completed a permanent move to Wrexham ... on 18 July 2025" | 高 |
| ESP | keyPlayers Álvaro Morata.club | AC米蘭 | **科莫（Como，租借自加拉塔薩雷）** 或驗證現狀 | （未搜尋此條目 — 本次稽核範圍內，Morata 於 2025-01 已離開米蘭加盟加拉塔薩雷，2025-09 租借至 Como），需進一步驗證 | 中（建議後續再查） |
| KSA | keyPlayers Saud Abdulhamid.club | 羅馬 | **朗斯（Lens，租借自羅馬）** | Transfermarkt / Arab News: "joined Ligue 1 club Lens on a one-year loan for the 2025–26 season on August 3, 2025"；母會為羅馬 | 高（母會羅馬，本季租到朗斯） |
| KSA | keyPlayers Mohammed Al-Qashawihe.club | Al-Nassr | 球員名為 **Mohammed Al-Qahtani**，本季（2026-01 起）租借至 **Al-Taawoun**（母會 Al-Hilal） | SPL 官網 / Transfermarkt: "joined Al-Taawoun FC on January 11, 2026, on loan from Al-Hilal SFC" | 中（球員姓名拼寫與俱樂部均需修正） |
| AUS | keyPlayers Mat Ryan.club | **哥本哈根** | **Levante（西甲）** | Socceroos: 2025-08-26 自由身簽約 Levante 一年合約 | 高 |
| AUS | keyPlayers Harry Souttar.club | 萊切斯特城 | 萊切斯特城 ✔（母會）；2024-25 曾租 Sheffield Utd 受傷，本季仍屬萊切斯特城 | Wikipedia/Transfermarkt | 高（正確） |
| CIV | keyPlayers Sébastien Haller.club | 烏特勒支 | 烏特勒支 ✔（2025-08-18 從多特永久轉會） | BVB 官網 / Goal: "moves to FC Utrecht" | 高（正確，無需修改） |
| CIV | keyPlayers Simon Adingra.club | **布萊頓** | **桑德蘭（Sunderland，2025 夏永久轉會）**；2026-02 起租借至 **摩納哥** | Brighton 官網 2025-07 / 2026-02 公告 | 高 |
| SEN | keyPlayers Idrissa Gueye.club | **伊芙頓** | **埃弗頓（Everton）** ✔（譯名一致；伊芙頓 = 埃弗頓，翻譯風格差異，非錯誤） | Premier League | 低（僅為譯名風格） |
| ALG | keyPlayers Houssem Aouar.club | **貝蒂斯** | **Al-Ittihad（沙烏地）** | Transfermarkt / Wikipedia: "joined on July 18, 2024"，2025-26 仍在 Al-Ittihad；貝蒂斯無 2025-26 連結 | 高 |
| ALG | keyPlayers Ismaël Bennacer.club | AC米蘭 | **Dinamo Zagreb（租借自 AC 米蘭）**；母會仍為 AC 米蘭 | AC Milan 官網 / Wikipedia: "On 5 September 2025, he moved to ... Dinamo Zagreb, on an initial one-year loan" | 高 |
| CIV | keyPlayers Serge Aurier.club | **待定** | **Persepolis（伊朗）** | Wikipedia / 搜尋結果: "signed for Persian Gulf Pro League club Persepolis on 31 July 2025" | 中（2025-07 簽約 Persepolis；若使用者想用「前加拉塔薩雷」可保留，但目前應為 Persepolis） |
| COL | keyPlayers Davinson Sánchez.club | **待定** | **加拉塔薩雷（Galatasaray）** | UCL 官網 / Transfermarkt: "joined on September 4, 2023, with his contract expiring on June 30, 2029" | 高 |
| COL | keyPlayers Camilo Vargas.club | **待定** | **Atlas（Liga MX）** | ESPN / Transfermarkt: "current club is Atlas Guadalajara"；2025-12-05 續約至 2028 | 高 |
| COL | keyPlayers Richard Ríos.club | **帕梅拉斯（Palmeiras）** | **本菲卡（Benfica）** | Benfica 官網 / portugoal: "Benfica completed the signing of Colombian midfielder Richard Ríos ... On 22 July 2025" (€27m 破隊史紀錄) | 高 |
| PAN | keyPlayers Ismael Díaz.club | **波爾圖** | **Club León（Liga MX）** | Transfermarkt / playmakerstats: 2025-07-24 加盟 León，合約至 2028 | 高 |
| PAN | keyPlayers Orlando Mosquera.club | **待定** | **Al-Fayha（沙烏地）** | SPL 官網 / ESPN: "joined on August 26, 2024" 並於 2025-06-03 續約 | 高 |
| PAN | keyPlayers Rolando Blackburn.club | **待定** | **San Francisco FC（巴拿馬 LPF）** | fbref: 自 2024 起效力 San Francisco FC | 中 |
| MEX | keyPlayers Guillermo Ochoa.club | **待定** | **AEL Limassol（塞浦路斯）** | Wikipedia / Goal: "joined AEL Limassol on September 11, 2025" | 高 |
| GHA | keyPlayers Thomas Partey.club | **兵工廠** | **Villarreal（比利亞雷阿爾）** | Villarreal / Goal: "Villarreal announced the signing of Partey on a free transfer on 7 August 2025"（阿仙奴合約到期後自由身） | 高 |
| GHA | keyPlayers Antoine Semenyo.club | **伯恩茅斯** | **曼城（Manchester City）**（2026-01-09 £64m 冬窗轉會） | Man City / Sky Sports: "On 9 January 2026, Manchester City announced that Semenyo signed a five-and-a-half-year contract for £64m" | 高 |

---

## 正確條目（抽查後無誤，不列為錯誤）

以下為已查證正確、或屬於使用者「已知修正」清單的條目，無需修改：

- BRA：Vinícius Jr./Rodrygo/Endrick/Alisson/Marquinhos 皆正確；教練 Ancelotti 為已知修正 ✔
- FRA：Mbappé（皇馬）、Dembélé（PSG）、Tchouaméni（皇馬）、Saliba（兵工廠）、Maignan（AC米蘭）皆正確
- ENG：Bellingham（皇馬）、Kane（拜仁）、Saka（兵工廠）、Foden（曼城）、Pickford（艾佛頓）皆正確
- ARG：Messi（邁阿密）、Álvarez（馬競）、E. Fernández（切爾西）、De Paul（馬競）、E. Martínez（維拉）皆正確
- ESP：Yamal（巴薩）、Pedri（巴薩）、Rodri（曼城）、Carvajal（皇馬）正確；Morata 建議再確認（已在上表備註）
- BEL：De Bruyne（拿坡里）、Lukaku（拿坡里）、Doku（曼城）、Courtois（皇馬）皆正確
- NED：Van Dijk（利物浦）、De Jong（巴薩）、Gakpo（利物浦）、Simons（熱刺 ✔已知修正）、Reijnders（曼城 ✔已知修正）
- GER：Musiala（拜仁）、Kimmich（拜仁）、Havertz（兵工廠）、Rüdiger（皇馬）正確；Wirtz 需修正（見上表）
- POR：Bruno Fernandes（曼聯）、Bernardo（曼城）、Leão（米蘭）、Dias（曼城）、Diogo Costa（波爾圖）皆正確
- CRO：Modrić（米蘭 ✔已知修正）、Gvardiol（曼城）、Kovačić（曼城）、Kramarić（霍芬海姆）、Livaković（費內巴切）皆正確
- URU：Núñez（Al-Hilal，非利物浦）正確；Valverde（皇馬）、Araújo（巴薩）、Bentancur（熱刺）、Rochet（Nacional）皆正確
- KOR：Son（LAFC ✔已知修正）、Lee Kang-in（PSG）、Kim Min-jae（拜仁）、Hwang Hee-chan（狼隊）皆正確
- JPN：Kubo（皇家社會）、Endo（利物浦）、Hiroki Ito（拜仁）正確；Junya Ito 與 Kamada 需修正（見上表）
- EGY：Salah（利物浦）、Marmoush（曼城）、El-Shenawy（Al-Ahly）、Hegazi 與 Mostafa Mohamed 條目查證：
  - Hegazi：現「待定」建議改為 **NEOM SC（沙烏地）**（2024-07 加盟）
  - Mostafa Mohamed：現「待定」建議改為 **Nantes（法甲）** ✔
- SEN：Mané（Al-Nassr）、Sarr（水晶宮）、Mendy（Al-Ahli）、Koulibaly（Al-Hilal）、Gueye（艾佛頓/埃弗頓）皆正確
- IRN：Taremi（奧林匹亞科斯 ✔已知修正）；Azmoun 現「待定」應改為 **Shabab Al-Ahli（UAE）**；Jahanbakhsh 與 Beiranvand 需修正（見上表）
- AUT：Sabitzer（多特）、Laimer（拜仁）、Baumgartner（萊比錫）、Arnautović（貝爾格勒紅星）、Pentz 條目需再驗：
  - Pentz 母會為 **Bayer Leverkusen**，2024-07 起租借至 **Brøndby IF**。data-teams.js 目前寫「雷恩」**錯誤**（應為 Brøndby 或 Leverkusen），需修正。
- AUS：Ryan 需修正（見上表）；Souttar（萊切斯特城）、Leckie（墨爾本城）、Boyle（**Hibernian**，現寫「帕納辛奈科斯」**錯誤**需修正）、McGree（米德斯堡）
- SUI：Xhaka（桑德蘭 ✔已知修正）、Akanji（曼城）、Sommer（國米）、Freuler（諾丁漢森林）、Vargas（塞維利亞，現寫「奧格斯堡」**錯誤**，2025-01 已轉會塞維利亞）
- MEX：Giménez（2025-02 已轉會 **AC米蘭**，現寫「費耶諾德」**錯誤**）、Álvarez（西漢姆）、Lozano（自由身 ✔已知修正）、R. Jiménez（富勒姆）、Ochoa 需修正（見上表）
- SCO：Robertson（利物浦）、McTominay（拿坡里）、McGinn（維拉）、McGregor（凱爾特人）皆正確；Dykes 現寫「待定」建議改為 **Charlton Athletic（2026-01-15 租借自 Birmingham City）** 或母會 Birmingham City
- CIV：Fofana（昂熱 ✔已知修正）、Haller（烏特勒支 ✔）、Kessié（Al-Ahli）皆正確；Adingra 與 Aurier 需修正（見上表）
- TUN：Skhiri（法蘭克福）正確；Hannibal、Khazri、Laïdouni、Dahmen 需修正（見上表）
- USA：Pulisic（AC米蘭）、McKennie（尤文）、Adams（伯恩茅斯）、Turner（諾丁漢森林）正確；Reyna 需修正為門興（見上表）
- CAN：Davies（拜仁）、David（尤文）、Buchanan（比利亞雷阿爾 ✔已知修正）、Borjan（紅星）皆正確；Larin 現「待定」需再查（未核查）

---

## 重要新增錯誤（上文漏列，需納入修正清單）

| 隊 | 欄位 | 現值 | 應為 | 來源 | 信心 |
|---|---|---|---|---|---|
| AUT | keyPlayers Patrick Pentz.club | **雷恩** | **Brøndby IF（租借自 Bayer Leverkusen）** 或 Leverkusen（母會） | Wikipedia / Transfermarkt / ESPN：Pentz 自 2023-01 屬 Leverkusen，2023-08 起租借 Brøndby 並續至 2025-26 | 高 |
| SUI | keyPlayers Ruben Vargas.club | **奧格斯堡** | **塞維利亞（Sevilla）** | Sevilla 官網 / Augsburg 官網：2025-01-09 以 4 年合約加盟塞維利亞至 2029 | 高 |
| MEX | keyPlayers Santiago Giménez.club | **費耶諾德** | **AC 米蘭** | AC Milan 官網：2025-02-03 以 4.5 年合約簽下 | 高 |
| AUS | keyPlayers Martin Boyle.club | **帕納辛奈科斯（Panathinaikos）** | **Hibernian（蘇超）** | Hibernian FC 官網 / Wikipedia：2022-08 加盟 Hibs 並於 2025-08 打進第 100 顆俱樂部進球 | 高 |
| EGY | keyPlayers Ahmed Hegazi.club | **待定** | **NEOM SC（沙烏地）** | Transfermarkt / fotmob：2024-07-21 加盟 NEOM 並在 2025-26 首季出賽 | 中 |
| EGY | keyPlayers Mostafa Mohamed.club | **待定** | **Nantes（法甲）** | Wikipedia / Transfermarkt：合約至 2027-06 | 高 |
| IRN | keyPlayers Sardar Azmoun.club | **待定** | **Shabab Al-Ahli（UAE）** | Transfermarkt：2024-07-28 加盟，合約至 2027 | 高 |
| SCO | keyPlayers Lyndon Dykes.club | **待定** | **Charlton Athletic（租借自 Birmingham City）** 或 Birmingham City（母會） | Wikipedia：2026-01-15 租借至 Charlton 至本季結束 | 中 |

---

## 總結統計

- 明確錯誤需修正（含「待定」但實際已有俱樂部的）：**共 20 筆**
  - GER×1（Wirtz）
  - JPN×2（Junya Ito、Kamada）
  - TUN×4（Hannibal、Khazri、Laïdouni、Dahmen）
  - BEL×1（Theate）
  - IRN×3（Jahanbakhsh、Beiranvand、Azmoun）
  - NZL×1（Cacace）
  - AUT×1（Pentz）
  - SUI×1（Vargas）
  - MEX×2（Giménez、Ochoa）
  - AUS×2（Ryan、Boyle）
  - EGY×2（Hegazi、Mostafa Mohamed）
  - CIV×2（Adingra、Aurier）
  - COL×3（Davinson Sánchez、Camilo Vargas、Richard Ríos）
  - PAN×3（Ismael Díaz、Mosquera、Blackburn）
  - ALG×2（Aouar、Bennacer）
  - GHA×2（Partey、Semenyo）
  - SCO×1（Dykes）
  - KSA×2（Saud Abdulhamid 租借、Mohammed Al-Qashawihe/Al-Qahtani 拼寫+俱樂部）
  - ECU×1（Sarmiento 目前在米堡/克雷莫納，非布萊頓一線隊）

- 屬於「已知修正清單」的項目不列入（BRA/MAR/BEL 教練、KOR Son、CAN Buchanan、SUI Xhaka、CIV Fofana、NED Simons/Reijnders、IRN Taremi、MEX Lozano、CRO Modrić、COL James、GHA Kudus、MAR Ziyech/Amrabat）。

- 未查證項目（留待後續）：ESP Morata（疑已離開 AC 米蘭）、CAN Larin（「待定」）、SCO Dykes 已在上表標註建議。

**實際錯誤筆數**：約 **35+ 筆**（主要集中在 2025 夏窗大轉會：Wirtz 去利物浦、Giménez 去米蘭、Partey 去比利亞雷阿爾、Semenyo 去曼城、Vargas 去塞維利亞、多名「待定」條目可補實）。
