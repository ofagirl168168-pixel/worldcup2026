# EPL Player/Coach Fact-Check — 2026-04-21

稽核對象：`js/epl-data-teams.js`
稽核範圍：`coach` / `keyPlayers` / `strengths` / `weaknesses`（僅限具體人名）
已排除既知修正：CRY Eze→兵工廠、BOU Kerkez→利物浦、WHU Kudus→熱刺、WHU Álvarez→費內巴切（租）

---

## 錯誤清單

| 隊 | 欄位 | 現值 | 應為 | 來源 URL + 原文引用 | 信心 |
|---|---|---|---|---|---|
| BRE | keyPlayers | `Yoane Wissa` pos:前鋒 club:布倫特福德 | Wissa 已於 2025-09-01 轉會紐卡索（£50m），不再效力 BRE | https://en.wikipedia.org/wiki/Yoane_Wissa ；Brentford 官方："Yoane Wissa's transfer to fellow Premier League side Newcastle United"；本檔案其他球員描述亦寫「失去 Wissa」為既成事實 | 高 |
| BRE | keyPlayers | `Christian Nørgaard` pos:中場 club:布倫特福德 | 已於 2025-07-10 轉會兵工廠（£15m 含附加條款） | https://www.skysports.com/football/news/11670/13389106 "Arsenal sign Christian Norgaard from Brentford in £15m transfer deal"；https://www.arsenal.com/news/christian-norgaard-signs-arsenal | 高 |
| BRE | strengths | `Igor Thiago+Wissa雙前鋒火力兇猛` | Wissa 已離隊（同上） | 同上 | 高 |
| BRE | coach | `Keith Andrews` | 需人工複核（搜尋結果未明確提到 Andrews 是否仍在任） | 未取得決定性來源 | 需人工複核 |
| NFO | coach | `Vítor Pereira` | Pereira 已於 2026-02-15 重新接任 NFO（此前曾被解僱 2025 末），截至 2026-04 確認在任；值得留意的是檔案 Pereira 為 2026 年 2 月第 4 任，`Pereira 接手後防守體系重整中`敘述與時間線尚合理 | https://www.espn.com/soccer/story/_/id/47908746 ；https://www.nottinghamforest.co.uk/news/2026/february/15/ | 高（無錯誤） |
| BUR | keyPlayers | `Josh Brownhill` pos:中場 club:伯恩利 | 已於 2025 夏天合約到期離隊，簽沙特 Al Shabab | https://tribuna.com/en/news/2025-09-11-exburnley-captain-josh-brownhill-completes-al-shabab-move/ "Ex-Burnley captain Josh Brownhill completes Al Shabab move" | 高 |
| BUR | keyPlayers | `Jay Rodriguez` pos:前鋒 club:伯恩利 | 已於 2025-01-31 轉會 Wrexham（League One），18 個月約 | https://en.wikipedia.org/wiki/Jay_Rodriguez "On 31 January 2025, Rodriguez signed for EFL League One club Wrexham on an 18-month deal"；另 Burnley Express 報導 "the number nine shirt which was worn by Jay Rodriguez last season before his January move to Wrexham" | 高 |
| BUR | keyPlayers | `James Trafford` pos:門將 club:伯恩利 | 已於 2025-07-29 回歸曼城（£27m，可達£31m） | https://www.skysports.com/football/news/11679/13402939 "James Trafford transfer news: Man City complete deal to re-sign goalkeeper from Burnley"；https://www.espn.com/soccer/story/_/id/45820139 | 高 |
| SUN | keyPlayers | `Anthony Patterson` pos:門將 club:桑德蘭 | Patterson 於 2026-02-01 外借 Millwall 賽季末；現役一號門將為 Robin Roefs（本季表現極佳），桑德蘭亦簽 Melker Ellborg 補強 | https://www.sunderlandecho.com/sport/football/sunderland-afc/kristjaan-speakman-explains-anthony-pattersons-move-to-millwall-on-loan-as-sunderland-confirm-move-5498173 ；https://en.wikipedia.org/wiki/Anthony_Patterson "limited to just one appearance in the EFL Cup... due to the excellent form of Robin Roefs" | 高（球員仍屬 SUN 但不在陣中；若 keyPlayers 用意為「當前先發核心」則屬錯誤） |
| LEE | keyPlayers | `Largie Ramazani` pos:翼鋒 club:里茲聯 | Ramazani 本季外借至 Valencia（西甲），非目前在陣球員 | https://en.wikipedia.org/wiki/... ESPN squad 搜尋結果 "Largie Ramazani - On loan at Valencia, contracted through 2028" | 高（仍屬 LEE 合約內但不在英超陣中） |
| LEE | strengths | `年輕球員速度快`（未直接點名，無錯） | — | — | 通過 |
| NEW | weaknesses | `失去 Isak 後火力明顯下滑` | 正確（Isak 2025-09-01 以 £125m 轉會利物浦） | https://en.wikipedia.org/wiki/2025%E2%80%9326_Liverpool_F.C._season "Liverpool signed Alexander Isak from Newcastle United for £125 million" | 通過 |
| NFO | keyPlayers | `Callum Hudson-Odoi`、`Murillo` 等 | 未見轉會傳聞，抽查通過 | — | 通過 |
| WOL | keyPlayers | `Rayan Aït-Nouri` pos:左後衛 club:狼隊 | Aït-Nouri 已於 2025 夏天轉會曼城（€37m），不再效力狼隊 | "Rayan Ait-Nouri was sold to Manchester City for 37 million euros"（2025-26 Wolves 季節搜尋結果，及 Man City 官方簽下 Ait-Nouri 作為夏窗第 6 簽之一，見 Sky Sports / Sports Mole Wolves vs Man City lineup confirmation） | 高 |

---

## 抽查通過（無錯誤或僅已知修正）

- **ARS**：coach Arteta 確認；keyPlayers（Saka, Rice, Ødegaard, Saliba, Gyökeres）全部在陣；Gyökeres 為 2025 夏窗從 Sporting £55m+£8.5m 加盟。Merino 傷缺正確。strengths/weaknesses 中具體人名（Saka, Ødegaard, Gyökeres）皆正確。
- **LIV**：coach Slot 確認；keyPlayers（Salah, van Dijk, Mac Allister, Gravenberch, Szoboszlai）全部在陣。備註：檔案未列 Isak（£125m 新援），非錯誤只是遺漏，任務範圍不含此。
- **MCI**：coach Guardiola 確認；keyPlayers（Haaland, Reijnders, Cherki, Foden, Rodri）全部在陣；Reijnders/Cherki 為 2025 夏窗新援（Reijnders 來自米蘭，Cherki 來自里昂）。
- **CHE**：coach Liam Rosenior 確認（2026-01-06 六年半約接替 Maresca）；keyPlayers（Palmer, Enzo, Caicedo, R. James, Sánchez）全部在陣。
- **MUN**：coach Michael Carrick（interim）確認（2026-01-13 接替 Amorim）；keyPlayers（Bruno, Højlund, Mainoo, Garnacho, L. Martínez）全部在陣；注意 Garnacho 仍在 MUN（未見轉會確認）。
- **TOT**：coach Roberto De Zerbi 確認（2026-03 第三任主帥）；keyPlayers（Solanke, Maddison, Romero, van de Ven）全部在陣。
- **NEW**：coach Eddie Howe 確認；keyPlayers（Bruno Guimarães, Gordon, Tonali, Botman）全部在陣（Tonali/Gordon 有夏窗離隊傳聞但目前仍在）。
- **AVL**：coach Emery 確認；keyPlayers（Watkins, Rogers, Tielemans, Kamara, E. Martínez）全部在陣。
- **BHA**：coach Fabian Hürzeler 確認；keyPlayers（Mitoma, Baleba, Dunk, Minteh, Rutter）全部在陣。
- **BOU**：coach Andoni Iraola 確認；keyPlayers（Evanilson, Kluivert, Semenyo, L. Cook, Tavernier）全部在陣。
- **FUL**：coach Marco Silva 確認；keyPlayers（Muniz, A. Pereira, A. Robinson, Berge, Leno）全部在陣。
- **CRY**：coach Oliver Glasner 確認；keyPlayers（Sarr, Mateta, Wharton, Y. Pino, Henderson）全部在陣；weaknesses 提到「Eze 夏窗轉兵工廠、Guéhi 轉曼城」— 任務說 Eze 為已知修正，Guéhi→曼城由 MCI vs CHE 比賽（文件 goals 裡出現 Marc Guéhi 進球側為 `a`=MCI 客場）間接印證。
- **WHU**：coach Nuno Espírito Santo 確認；keyPlayers（Bowen, Paquetá, M. Fernandes, Diouf, Areola）全部在陣；Kudus / Álvarez 已知修正。
- **WOL**：coach Rob Edwards 確認（2025-11-12 接替 Pereira）；其餘 keyPlayers（Hwang, Lemina, Strand Larsen, José Sá）在陣；**Ait-Nouri 需移除（見錯誤清單）**。weaknesses `失去Cunha後進攻核心真空`正確（Cunha 2025 夏天 €74m 轉曼聯）。
- **EVE**：coach David Moyes 確認；keyPlayers（Doucouré, McNeil, Calvert-Lewin, Tarkowski, Pickford）全部在陣。**注意**：strengths 寫「Dyche 防守紀律嚴明」— Dyche 已於 2025-01-11 被 Moyes 取代，此描述不符（但任務說明僅驗證具體球員名字，此處 Dyche 為教練不列入報告，僅標註供參考）。
- **LEE**：coach Daniel Farke 確認；keyPlayers 除 Ramazani 外（Okafor, Gnonto, Ampadu, Meslier）在陣；Okafor 於 MUN vs LEE 比賽中進 2 球印證在陣。

---

## 注意事項 / 供人工複核

1. **EVE strengths 提到「Dyche」**（第 332 行）："Dyche防守紀律嚴明" — Sean Dyche 已於 2025-01-11 被 David Moyes 取代，此 strengths 描述未更新。嚴格說教練名不屬任務驗證範圍（任務只要球員），但描述明顯過時，建議人工修正為「Moyes」。
2. **BRE coach Keith Andrews**：搜尋結果未直接確認他在 2026-04 是否仍然在任，建議人工快速複核（Thomas Frank 已在 2025 夏天離任轉熱刺，Andrews 為升任主帥，至今未見解僱新聞）。
3. **SUN keyPlayers Patterson**：雖外借 Millwall，技術上仍屬 SUN 合約球員。若 keyPlayers 定義為「本季現役核心」則錯誤；若只要求「合約屬於該俱樂部」則通過。依文件其他隊的用法（如未列傷兵如 Ekitike），keyPlayers 較傾向「現役先發核心」，故列為錯誤。
4. **LEE keyPlayers Ramazani** 同上理由。

---

## 統計

- **確認錯誤筆數**：**8 筆**
  - BRE Wissa、BRE Nørgaard、BRE strengths (Wissa)
  - BUR Brownhill、BUR Jay Rodriguez、BUR Trafford
  - SUN Patterson（現役不在陣）
  - LEE Ramazani（外借 Valencia）
  - WOL Aït-Nouri
- **需人工複核**：2 項（BRE coach、EVE strengths Dyche 敘述過時）
- **抽查通過**：Big Six 全部、AVL、BHA、BOU、FUL、CRY、WHU、EVE（球員部分）、NFO、NEW

（註：上列錯誤筆數為 9 條，其中 BRE Wissa + strengths Wissa 為同一球員離隊連動，若合併算則 8 筆「人員不對」；門將 Trafford 一條即第 8 筆。）

實際不同「球員/人物」問題數：**8 人** — Wissa, Nørgaard, Brownhill, Jay Rodriguez, Trafford, Patterson, Ramazani, Aït-Nouri；另有 strengths 文字中 Wissa 需一併修正。
