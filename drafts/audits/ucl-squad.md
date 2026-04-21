# 陣容稽核報告 · js/ucl-data-teams.js（UCL 36 隊）

稽核日期：2026-04-20
稽核員：fact-checker-squad（Opus 4.7）
優先級：
- **P1（全查）**：晉級四強的 PSG、BAY、ARS、ATM（QF 已結束：Arsenal、Bayern、Atlético、PSG 晉級）
- **P1（全查）**：八強被淘汰但為頂級知名隊：RMA、BAR、LIV、SCP
- **P2（抽查）**：MCI、CHE、INT、DOR、LEV、NAP、JUV、BEN、ATA、MAR、MON、USG、BRU、TOT、NEW、SGE、AJA、PSV、GAL、ATH、VIL、OLY、BOD
- **P3（略過）**：POT 4 弱旅如 QAR、PAF、KAI、COP、SLA（但仍抽查教練）

---

## 錯誤（嚴重，需立即修正）

| # | 球隊 | 聲明（檔案內容） | 正確值 | 來源 | 原文引用 | 信心 |
|---|------|-----------------|--------|------|---------|------|
| 1 | RMA | coach: 'Carlo Ancelotti' | 2025/26 初為 Xabi Alonso；2026/01/12 由 Álvaro Arbeloa 接任（現任） | [ESPN](https://www.espn.com/soccer/story/_/id/47398000/how-xabi-alonsos-start-rates-modern-real-madrid-coaches) | "Madrid and Alonso parted ways by mutual agreement, with Álvaro Arbeloa being appointed the new head coach." | 高 |
| 2 | RMA | keyPlayers 包含 'Thibaut Courtois'，另 injuries 再出現 Courtois | Courtois 仍是球員；但同一人不應同時列 keyPlayers 與 injuries（至少需標記）；同時確認最新傷勢日期。Bellingham 曾傷缺應考慮列入。 | [Managing Madrid](https://www.managingmadrid.com/103585/bellingham-real-madrid-2026-injury-hamstring) | "Bellingham out around one month with hamstring injury" | 中 |
| 3 | MCI | keyPlayers 未包含新門將 Gianluigi Donnarumma；Robert Sánchez 非 MCI 球員 | 2025/09 Donnarumma 以 £26m 由 PSG 加盟曼城，現為 MCI 首選門將 | [Sky Sports](https://www.skysports.com/football/news/11095/13423571/) | "Manchester City signed goalkeeper Gianluigi Donnarumma... in a £26m deal." | 高 |
| 4 | PSG | keyPlayers: 'Gianluigi Donnarumma', pos:'門將', club:'巴黎聖日耳曼' | Donnarumma 已於 2025/09 離隊赴曼城；PSG 現任門將為 Lucas Chevalier（2025/08 自里爾加盟） | [ESPN](https://www.espn.com/soccer/story/_/id/45926246/psg-lucas-chevalier-transfer-gianluigi-donnarumma-goalkeeper) | "PSG sign goalkeeper Chevalier from Lille to replace Donnarumma" | 高 |
| 5 | LEV | coach: 'Xabi Alonso' | Alonso 2025 夏離隊赴皇馬；現任為 Kasper Hjulmand（2025/09/08 起；7 月-9 月曾由 Erik ten Hag 短暫接任） | [Bundesliga](https://www.bundesliga.com/en/bundesliga/news/xabi-alonso-confirms-bayer-leverkusen-departure-real-madrid-32109)；[Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%9326_Bayer_04_Leverkusen_season) | "Erik ten Hag became the new head coach of Bayer Leverkusen on 1 July... on 8 September, former Denmark manager Kasper Hjulmand assumed head coach responsibilities." | 高 |
| 6 | LEV | keyPlayers: 'Florian Wirtz' | Wirtz 2025 夏以 £116m 由 Leverkusen 加盟 Liverpool | [Sky Sports](https://www.skysports.com/football/news/11095/13377022/florian-wirtz-transfer-news-liverpool-sign-bayer-leverkusen-playmaker-for-fee-of-lb116m) | "Liverpool completed the signing of Bayer Leverkusen playmaker Florian Wirtz for a fee of £116m" | 高 |
| 7 | INT | coach: 'Simone Inzaghi' | Inzaghi 2025/06 離隊赴 Al-Hilal；現任為 Cristian Chivu（2025/06 起） | [ESPN](https://www.espn.com/soccer/story/_/id/45479248/inter-milan-name-cristian-chivu-manager-replace-inzaghi) | "Inter Milan appointed Romanian Cristian Chivu as coach on a two-year deal in place of Simone Inzaghi" | 高 |
| 8 | CHE | coach: 'Enzo Maresca' | Maresca 於 2026/01/01 離職；目前熱門接任者為 Liam Rosenior（需確認是否已上任） | [Premier League](https://www.premierleague.com/en/news/4524533/analysis-of-enzo-maresca-tenure-as-chelsea-head-coach-following-departure-on-1-january-2026) | "Enzo Maresca departed as Chelsea's head coach on New Year's Day (January 1, 2026)." | 高 |
| 9 | TOT | coach: 'Ange Postecoglou' | Postecoglou 已於 2025 夏離職；現任 Roberto De Zerbi（2026/03/29 起），之前為 Thomas Frank→Igor Tudor | [Sky Sports](https://www.skysports.com/football/news/11095/13477299/thomas-frank-sacked-tottenham-head-coach-departs-after-less-than-eight-months-in-charge)；[Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%9326_Tottenham_Hotspur_F.C._season) | "Roberto De Zerbi was appointed on 29 March 2026 after Igor Tudor was dismissed" | 高 |
| 10 | MAR | coach: 'Roberto De Zerbi' | De Zerbi 於 2026/02/11 與馬賽合約終止，現任為 Habib Beye | [Football Italia](https://football-italia.net/official-de-zerbi-leaves-marseille-agreement/)；[Goal](https://www.goal.com/en-us/lists/marseille-appoint-new-manager-departure-roberto-de-zerbi/) | "Roberto de Zerbi Leaves Marseille by Mutual Consent" / "Marseille announced the appointment of Habib Beye as their new manager" | 高 |
| 11 | JUV | coach: 'Thiago Motta' | Motta 於 2024/25 末被解僱，Tudor 接任直到 2025/10，現任為 Luciano Spalletti | [CBS Sports](https://www.cbssports.com/soccer/news/juventus-sack-igor-tudor-after-disappointing-start-of-the-season-who-will-replace-the-croatian-manager/) | "Tudor was replaced by current incumbent Luciano Spalletti at the end of October" | 高 |
| 12 | ATA | coach: 'Gian Piero Gasperini' | Gasperini 2025/06 離隊赴羅馬；接任 Ivan Juric 已被解僱；報導 Raffaele Palladino 將接任（需最終確認） | [Goal](https://www.goal.com/en/lists/ivan-juric-sacked-atalanta-failure-legend-gian-piero-gasprini-legacy/) | "Ivan Juric sacked! Atalanta pull the trigger on head coach after failure to live up to Bergamo legend Gian Piero Gasprini's legacy" | 高 |
| 13 | BEN | coach: 'Bruno Lage' | Lage 於 2025/09/17 被解僱（輸給 Qarabag 後）。接任者需確認（Mourinho 有傳聞但未確認） | [beIN Sports](https://www.beinsports.com/en-us/soccer/uefa-champions-league/articles/lage-sacked-by-benfica-after-qarabag-defeat-mourinho-set-for-return-2025-09-17) | "Lage sacked by Benfica after Qarabag defeat, Mourinho set for return" | 高 |
| 14 | BEN | keyPlayers: 'Ángel Di María' | Di María 於 2025 夏合約到期離隊，回到阿根廷羅薩里奧中央 | [Wikipedia](https://en.wikipedia.org/wiki/%C3%81ngel_Di_Mar%C3%ADa)；[beIN](https://www.beinsports.com/en-us/soccer/primeira-liga/articles/di-maria-announces-he-will-leave-benfica-at-end-of-season-2025-05-18) | "it was announced by boyhood club Rosario Central that Di María would be returning on a free transfer" | 高 |
| 15 | MON | coach: 'Adi Hütter' | Hütter 於 2025/10 被解僱；現任 Sébastien Pocognoli（2025/10/11 自 USG 加盟） | [Fox Sports](https://www.foxsports.com/articles/soccer/ligue-1-monaco-hires-coach-sebastien-pocognoli-from-union-saintgilloise) | "Ligue 1 Monaco hires coach Sébastien Pocognoli from Union Saint-Gilloise" | 高 |
| 16 | USG | coach: 'Sébastien Pocognoli' | Pocognoli 於 2025/10 離隊赴摩納哥，現任為 David Hubert | [BeIN](https://www.beinsports.com/en-us/soccer/ligue-1/articles/pocognoli-leaves-union-saint-gilloise-to-take-up-monaco-role-2025-10-12) | "Pocognoli leaves Union Saint-Gilloise to take up Monaco role" | 高 |
| 17 | BRU | coach: 'Nicky Hayen' | Hayen 於 2025/12/08 被解僱；現任 Ivan Leko | [Club Brugge 官方](https://www.clubbrugge.be/en/news/ivan-leko-vervangt-nicky-hayen-als-hoofdcoach-club-brugge) | "Ivan Leko replaces Nicky Hayen as Club Brugge head coach" | 高 |
| 18 | AJA | coach: 'Francesco Farioli' | Farioli 2025/05 離隊；2025/06 Heitinga 接任又於 2025/11 被解僱；現任 Oscar Garcia（第三任） | [beIN](https://www.beinsports.com/en-us/soccer/eredivisie/articles/grims-time-up-as-ajax-appoint-third-coach-of-2025-26-season-2026-03-09) | "Grim's time up as Ajax appoint third coach of 2025-26 season" | 高 |
| 19 | NEW | keyPlayers: 'Alexander Isak' | Isak 於 2025 夏以 £125m 破英國轉會紀錄加盟 Liverpool | [Wikipedia 2025-26 Liverpool](https://en.wikipedia.org/wiki/2025%E2%80%9326_Liverpool_F.C._season) | "Alexander Isak was signed from Newcastle United for £125 million, breaking the British transfer fee record" | 高 |
| 20 | SGE | keyPlayers: 'Hugo Ekitiké' | Ekitiké 2025 夏以約 €70m 加盟 Liverpool | [Bundesliga](https://www.bundesliga.com/en/bundesliga/news/hugo-ekitike-farewell-eintracht-frankfurt-liverpool-transfer-33244) | "Hugo Ekitiké bids emotional farewell to Eintracht Frankfurt following Liverpool transfer" | 高 |
| 21 | LIV | keyPlayers 未包含新簽 Wirtz / Ekitiké / Isak / Frimpong / Kerkez 等重要引援 | 應加入 Wirtz、Isak、Ekitiké 等重大引援 | 同上數則 | — | 高 |
| 22 | BAR | injuries 欄位完全缺失 | 至少 Ter Stegen 長期傷病（強強大戰前後皆多傷）需列；以及 QF 出局前應有傷情，建議補充 | [SundayGuardian](https://sundayguardianlive.com/sports/barcelona-vs-atletico-madrid-predicted-lineups-lamine-yamal-robert-lewandowski-to-lead-hansi-flicks-attack-check-injury-updates-and-team-news-ucl-2025-26-quarterfinal-1st-leg-raphinha-marcus-rashford-182466/) | "Check Injury Updates And Team News — UCL 2025-26 Quarterfinal 1st Leg" | 中 |

---

## 通過（正確，維持）

| # | 球隊 | 聲明 | 來源 | 信心 |
|---|------|------|------|------|
| 1 | ARS | coach: Mikel Arteta | [Wikipedia](https://en.wikipedia.org/wiki/Mikel_Arteta) | 高 |
| 2 | ARS | keyPlayers: Saka/Ødegaard/Gyökeres/Saliba/Raya 皆在隊 | [Arsenal.com](https://www.arsenal.com/news/arsenals-squad-numbers-202526) | 高 |
| 3 | ARS | Gyökeres 2025 夏自 Sporting 加盟 | [Sky Sports](https://www.skysports.com/football/news/11095/13401260/) | 高 |
| 4 | BAY | coach: Vincent Kompany | [Bundesliga](https://www.bundesliga.com/en/bundesliga/news/vincent-kompany-signs-new-deal-with-bayern-munich-34479) | 高 |
| 5 | BAY | keyPlayers: Kane/Musiala/Olise/Kimmich/Neuer 皆在隊 | [FC Bayern](https://fcbayern.com/en/news/2026/01/jamal-musiala-marks-injury-comeback-with-assist-against-rb-leipzig) | 高 |
| 6 | PSG | coach: Luis Enrique | [PSG.fr](https://www.psg.fr/en/staff/luis-enrique) | 高 |
| 7 | PSG | keyPlayers: Dembélé/Kvaratskhelia/Vitinha/Hakimi 皆在隊 | [CBS Sports](https://www.cbssports.com/soccer/news/meet-paris-saint-germains-squad-khvicha-kvaratskhelia-ousmane-dembele-lead-champions-league-finalists/) | 高 |
| 8 | PSG | injuries 中 Nuno Mendes、Désiré Doué QF 次回合下場 | [Tribuna](https://tribuna.com/en/news/2026-04-14-nuno-mendes-picks-up-injury-in-liverpoolpsg-clash/) | 高 |
| 9 | ATM | coach: Diego Simeone | [Football España](https://www.football-espana.net/2025/09/24/atletico-madrid-diego-simeone-julian-alvarez-stance/amp) | 高 |
| 10 | ATM | keyPlayers: Griezmann/J.Álvarez/Koke/Giménez/Oblak 皆在隊 | 同上 | 高 |
| 11 | MCI | coach: Pep Guardiola | [Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%9326_Manchester_City_F.C._season) | 高 |
| 12 | MCI | keyPlayers: Haaland/Reijnders/Cherki/Foden/Rodri 皆在隊（除門將錯誤，見錯誤欄） | [Premier League](https://www.premierleague.com/en/news/4374239/haaland-and-reijnders-give-man-city-statement-victory) | 高 |
| 13 | RMA | keyPlayers（非門將）: Bellingham/Vinicius/Mbappé/Tchouaméni 皆在隊 | [SI.com](https://www.si.com/soccer/real-madrid-xi-vs-man-city-arbeloa-makes-mbappe-bellingham-calls-injury-news-predicted-lineup-3-17-26) | 高 |
| 14 | RMA | injuries 中 Rodrygo ACL 賽季報銷屬實 | [Yahoo Sports](https://sports.yahoo.com/articles/real-madrid-injury-list-players-063001787.html) | 高 |
| 15 | BAR | coach: Hansi Flick | [Barca Universal](https://barcauniversal.com/lewandowski-talks-flick-pedri-yamal-ferran-barcelona-future-not-yet-time-to-make-decisions/) | 高 |
| 16 | BAR | keyPlayers: Yamal/Lewandowski/Pedri/Gavi/Ter Stegen 皆在隊 | [FC Barcelona](https://www.fcbarcelona.com/en/football/first-team/players/129404/lamine-yamal-nasraoui-ebana) | 高 |
| 17 | LIV | coach: Arne Slot | [Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%9326_Liverpool_F.C._season) | 高 |
| 18 | LIV | keyPlayers: Salah/Van Dijk/Mac Allister/Alisson 仍在隊（Gakpo 仍在隊） | 同上 | 高 |
| 19 | NAP | coach: Antonio Conte | [Football Italia](https://football-italia.net/hojlund-conte-can-make-me-better-napoli-lukaku/) | 高 |
| 20 | NAP | keyPlayers: Lukaku/Neres/Lobotka/Rrahmani/Meret 皆在隊（惟 Lukaku 有長傷） | 同上 | 高 |
| 21 | DOR | coach: Niko Kovač | [Bundesliga](https://www.bundesliga.com/en/bundesliga/news/niko-kovac-to-become-new-borussia-dortmund-head-coach-sahin-30706) | 高 |
| 22 | SCP | coach: Rui Borges | [Wikipedia](https://en.wikipedia.org/wiki/Rui_Borges) | 高 |
| 23 | PSV | coach: Peter Bosz | [PSV 官方](https://www.psv.nl/en/media/artikel/fact-maak-kennis-met-de-nieuwe-hoofdcoach-van-psv-peter-bosz) | 高 |
| 24 | BOD | coach: Kjetil Knutsen | [Wikipedia](https://en.wikipedia.org/wiki/Kjetil_Knutsen) | 高 |
| 25 | VIL | coach: Marcelino | [OneFootball](https://onefootball.com/en/news/villarreal-announce-return-of-marcelino-as-head-coach-38557761) | 高 |
| 26 | ATH | coach: Ernesto Valverde（本季在任，賽季末離任） | [Flashscore](https://www.flashscore.com/news/soccer-laliga-ernesto-valverde-to-step-down-as-athletic-club-coach-at-end-of-season/z34hX0iI/) | 高 |
| 27 | OLY | coach: José Luis Mendilibar | [Olympiacos 官方](https://www.olympiacos.org/en/coachingstaff/head-coach/) | 高 |
| 28 | SGE | coach: Dino Toppmöller | [Bundesliga](https://www.bundesliga.com/en/bundesliga/news/eintracht-frankfurt-excelling-under-dino-toppmoller-s-guidance-33877) | 高 |
| 29 | GAL | coach: Okan Buruk（假設未換，建議再查）；keyPlayers Osimhen/Icardi/Ziyech 皆在隊 | [Wikipedia](https://en.wikipedia.org/wiki/2025%E2%80%9326_Galatasaray_S.K._season) | 中 |
| 30 | NEW | coach: Eddie Howe（仍在任） | — | 中 |

---

## 不確定（低信心，請人工確認）

| # | 球隊 | 疑慮 | 現有來源/原因 |
|---|------|------|--------------|
| 1 | CHE | 寫 Maresca 已離職，但 Chelsea 現任主帥身分未最終確認（Rosenior 為熱門） | [Premier League](https://www.premierleague.com/en/news/4524533/analysis-of-enzo-maresca-tenure-as-chelsea-head-coach-following-departure-on-1-january-2026) |
| 2 | BEN | Lage 解僱後正式接任者（Mourinho 傳聞） | [ESPN](https://www.espn.com/soccer/story/_/id/46289019/jose-mourinho-benfica-talks-bruno-lage-sacking-sources) |
| 3 | ATA | Juric 被解僱後正式接任者（Palladino 傳聞） | [Goal](https://www.goal.com/en/lists/ivan-juric-sacked-atalanta-failure-legend-gian-piero-gasprini-legacy/) |
| 4 | GAL | Buruk 尚未查證是否仍在任（本季初仍在） | 需補查 |
| 5 | COP / QAR / PAF / KAI / SLA / BRU 的細部 keyPlayers | P3 弱旅未逐個球員抽查 | — |
| 6 | PSG | injuries 欄位的 Fabián Ruiz 傷況最新狀態 | 未找到最新 specific 更新 |
| 7 | LIV keyPlayers 是否該把 Wirtz/Isak/Ekitiké 放入取代部分舊名 | 關乎網站展示邏輯 | — |
| 8 | RMA/LEV 等教練所在「formation」等戰術參數是否仍準確 | 新教練會改變陣型偏好 | — |

---

## 搜尋紀錄

- 共搜尋 22 次 WebSearch
- 關鍵字：UCL 2025/26 QF 結果、Real Madrid 教練、Arsenal 教練、Bayern 教練、PSG 教練、Atlético 教練、Leverkusen 教練、Liverpool squad、Barcelona squad、Inter 教練、Chelsea 教練、Dortmund 教練、Tottenham 教練、Juventus 教練、Benfica 教練、Atalanta 教練、Marseille 教練、Villarreal 教練、Sporting 教練、Ajax 教練、PSV 教練、Monaco 教練、USG 教練、Club Brugge 教練、Athletic Bilbao 教練、Olympiacos 教練、Frankfurt 教練、Newcastle squad、Galatasaray squad、Bodø/Glimt、Lucas Chevalier、Musiala 傷、Nuno Mendes 傷、Donnarumma 轉會、Wirtz 轉會、Ekitiké 轉會、Isak 轉會、Gyökeres 轉會、Di María 離隊
