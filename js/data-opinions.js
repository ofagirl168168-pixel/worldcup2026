/* =============================================
   DATA-OPINIONS.JS — 每日觀點投票題庫
   type: 'trending'=時事 | 'classic'=永恆 | 'fun'=趣味 | 'predict'=預測
   opts: 2~4 個選項

   predict 型題目可在事後揭曉時加兩個欄位：
     resolveDate:'YYYY-MM-DD'  預計揭曉日（只是給人看，不影響結算）
     correctAnswer: N          opts[] 的正確選項 index (0-based)
   網站載入時會自動掃描：只要此題有 correctAnswer 且使用者投過、還沒領過獎，
   答對發 +20 XP，答錯也會 toast 告知正解。任何時點揭曉都可（隔天、一週、賽季末都 OK）。
   ============================================= */

const DAILY_OPINIONS = [

  // ── 本週時事 ─────────────────────────────────────────

  { id:'op-20260512-f', expiresAt:'2026-05-13T07:12:50.072Z', type:'trending',
    q:"#MbappéOut 連署破 7000 萬！明日法國公布名單，Deschamps 會排除他嗎？",
    opts:["Deschamps 不可能因為連署排除 Mbappé — 7000 萬簽名根本作弊水軍 🤖","Mbappé 傷後跑去義大利度假本來就不對 — 連署反映真實民意 🛥️","排除 Mbappé 法國等於少一條腿 — 結果重於形象 ⚽","Deschamps 該留他但不該給隊長 — 用 Griezmann 或 Maignan 帶隊更好 💪"],
    context:"「Mbappé Out」連署從 5/7 起傳遍社群媒體，最初目標 20 萬簽名、5/12 已突破 7000 萬，要求皇馬賣掉他。導火線是 Mbappé 「傷退休養」期間被拍到跟女星 Ester Exposito 在薩丁尼亞遊艇上度假，雖然皇馬醫療團隊事後說有批准。連署真實性被資安專家質疑機器人灌票。法國 Deschamps 將於明日（5/13）公布世界盃 55 人初選名單，最終 26 人 5/14 公布。Mbappé 本季皇馬 41 場 41 球，1998 法國世足冠軍 Petit 也警告「Mbappé 的自我可能給法國隊帶來麻煩」。" },

  { id:'op-20260513-a', date:'2026-05-13', type:'predict',
    q:"🔮 今晚補賽！曼城 vs 水晶宮，Guardiola 能追到只差 2 分嗎？",
    opts:["曼城大勝！Haaland 進球追到只差 2 分，冠軍壓力丟回 Arteta 🩵","曼城小勝，但水晶宮的反擊讓 Guardiola 捏一把冷汗 ⚡","水晶宮爆冷搶分！Mateta + Sarr 反擊得手，冠軍天平倒向兵工廠 🦅","悶戰 0-0 或 1-1，曼城錯失追分良機 😴"],
    context:"英超補賽：曼城（74分）主場迎戰水晶宮，贏球追至77分、與兵工廠（79分）只差2分且多一場在手。曼城主場本季僅1敗，上輪3-0布倫特福德。水晶宮近4場聯賽未勝，但已殺入歐會盃決賽士氣高。Rodri 傷癒可能復出。Glasner 可能輪換備戰5/27歐會盃決賽。" },

  { id:'op-20260511-a', expiresAt:'2026-05-12T08:45:00.000Z', type:'trending',
    q:"西漢姆 90+5 分鐘扳平被 VAR 取消！Gary Neville 稱「英超 VAR 史上最大判決」，你怎麼看？",
    opts:["判得對！Pablo 明顯拉住 Raya，守門員被犯規進球當然無效 ⚖️","太嚴格了！角球混戰本來就有身體接觸，不該取消進球 🔨","判決正確但流程有問題 — VAR 花了好幾分鐘反覆看回放，介入太久 ⏱️","這就是 VAR 的宿命：不管怎麼判都有人不服，乾脆廢掉算了 📺"],
    context:"英超第36輪：西漢姆 0-1 兵工廠（5/10 倫敦體育場）。Trossard 第 83 分鐘打破僵局，但 90+5 分鐘 Callum Wilson 混戰中補射破網扳平、全場瘋狂慶祝。裁判 Chris Kavanagh 原本判進球有效，但 VAR 介入長達數分鐘反覆回放後，認定西漢姆前鋒 Pablo 以手臂橫跨 Raya 胸口、阻礙守門員移動和接球，構成犯規。Kavanagh 到場邊看完螢幕後取消進球。Gary Neville 稱這是「VAR 史上最大的判決時刻」。西漢姆隊長 Bowen 抗議守門員不該在角球混戰中受到額外保護；但 Jamie Redknapp 和 Ian Wright 都認為判決正確。此結果讓兵工廠領先優勢回到 5 分、距封王只差兩勝；西漢姆第 18 敗幾乎宣告降級。" },

  { id:'op-20260512-b', date:'2026-05-12', type:'trending',
    q:"🔥 世界盃55人擴大名單今天截止！你最期待哪國的名單有驚喜？",
    opts:["法國：Mbappé 遊艇風波後還會入選嗎？Kanté 能回歸嗎？🇫🇷","英格蘭：Bellingham 傷勢 + Saka 歐冠決賽雙線作戰，誰被放棄？🏴󠁧󠁢󠁥󠁮󠁧󠁿","巴西：Neymar 到底選不選？傷兵潮後的巴西陣容大洗牌 🇧🇷","日本：久保建英領軍，亞洲最強軍團能帶幾個海外球員？🇯🇵"],
    context:"FIFA 規定 5/11 是世界盃55人擴大名單（preliminary list）截止日。名單不對外公布，但各國媒體會陸續爆料。法國焦點：Mbappé 身心狀態 + Kanté 35歲（費內巴切）是否回歸。巴西：Rodrygo 確定缺席、Neymar 狀態存疑、Alisson 傷勢反覆。英格蘭：Bellingham 可能有輕傷、Saka/Rice 歐冠決賽。日本：久保建英、三笘薫、遠藤航等歐洲軍團。最終26人名單6/2公佈。" },

  { id:'op-20260510-a', date:'2026-05-10', type:'predict',
    q:"英超第36輪：西漢姆主場 vs 兵工廠，鐵鎚幫保級絕命戰能從榜首身上搶分嗎？",
    opts:["兵工廠輕鬆客勝，保級隊擋不住冠軍級實力 🔴","西漢姆拚死搶下1分，保級希望續命 🔨","西漢姆爆冷擊敗兵工廠，保級奇蹟開啟！💥","兵工廠大勝3球以上，Arteta 為歐冠決賽演練陣型 🏆"],
    context:"英超第36輪：西漢姆 vs 兵工廠（5/10 23:30 台灣時間，倫敦體育場）。西漢姆第18名積36分深陷降級區，只剩3場求生。兵工廠英超榜首、歐冠決賽球隊，但 Arteta 可能輪換為 5/30 歐冠決賽留力。上輪西漢姆 0-3 敗布倫特福德、兵工廠歐冠次回合 1-0 勝馬競。Gyökeres、Saka 狀態火熱。倫敦德比火藥味十足。",
    resolveDate:'2026-05-11', correctAnswer:0 },

  { id:'op-20260509-a', date:'2026-05-09', type:'predict',
    q:"英超第36輪開幕戰：利物浦主場 vs 切爾西，傷兵滿營的紅軍能否守住歐冠席位？",
    opts:["利物浦主場取勝，安菲爾德之夜不可阻擋 🔴","切爾西爆冷客場搶分，6連敗止血 🔵","兩隊平手收場，都沒有解決問題 🤝","進球大戰 3+ 球，攻守失衡的兩隊上演混戰 🔥"],
    context:"英超第36輪：利物浦 vs 切爾西（5/9 19:30 台灣時間，安菲爾德）。利物浦第4名積58分，歐冠席位爭奪白熱化。切爾西第9名積48分、英超6連敗跌入本季最深泥淖。利物浦傷兵嚴重——Ekitike 阿基里斯腱斷裂賽季報銷，Isak 鼠蹊傷恢復訓練可能替補上陣，Salah 尚未歸隊。切爾西缺少 Estevão，但隊長 Reece James 傷癒可能復出。上輪利物浦 2-3 負曼聯，切爾西 1-3 負森林。",
    resolveDate:'2026-05-11', correctAnswer:2 },

  { id:'op-20260507-b', dates:['2026-05-07','2026-05-08'], type:'trending',
    q:"拜仁 1-1 PSG 出局！Neves 那次手球沒判點球，拜仁 CEO 公開質疑裁判經驗，你怎麼看？",
    opts:["規則內合理，是 Marquinhos 自家解圍踢出才碰到 Neves，沒有故意手球 ⚖️","應該判點球！拜仁本場至少兩次手球都被吃掉 🔴","拜仁球迷別再吵了，PSG 整場創造機會更多本來就該晉級 🔵","真正問題是 UEFA 派一個只執法 15 場歐冠的菜鳥裁判 — 制度問題 📺"],
    context:"拜仁主場 1-1 戰平 PSG，總比分 5-6 出局無緣決賽。Dembélé 開賽 2 分鐘進球、Kane 第 94 分鐘扳平。但 Bayern 上下對葡萄牙裁判 João Pinheiro 非常憤怒：(1) Marquinhos 解圍誤打中隊友 João Neves 伸開的手，VAR 沒判點球；(2) 上半場 Konrad Laimer 被吹手球但慢動作顯示其實是 Nuno Mendes 的手，Mendes 反而逃過第二張黃牌；(3) Kane 第 23 分鐘的反擊也被吹越位。Kompany 賽後公開不滿，拜仁 CEO Dreesen 直言「派一個只有 15 場歐冠經驗的裁判執法這種比賽，至少令人驚訝」。前德甲裁判 Manuel Gräfe 也認為 Neves 那球該判點球。" },

  { id:'op-20260508-a', date:'2026-05-08', type:'trending',
    q:"歐冠決賽對陣確定！PSG vs 兵工廠，衛冕冠軍對決 20 年首次殺入決賽的槍手，你看好誰？",
    opts:["兵工廠奪冠！Arteta 帶隊創造歷史 🔴","PSG 成功衛冕！Dembélé + Kvaratskhelia 太強 🔵","120 分鐘分不出勝負，PK 大戰定生死 ⚡","看好 PSG 但希望兵工廠贏，中立球迷支持弱者 🤞"],
    context:"歐冠決賽 5/30 布達佩斯普斯卡什球場。PSG 以總比分 6-5 淘汰拜仁、兵工廠以 2-1 淘汰馬競。PSG 是衛冕冠軍，若奪冠將成為繼皇馬 2016-18 三連霸後第二支衛冕成功的球隊。兵工廠本季歐冠僅失 6 球（全賽事最佳），Saka、Gyökeres、Rice 等核心球員狀態火熱。PSG 則有 Dembélé（淘汰賽 7 球）、Kvaratskhelia、Marquinhos 坐鎮。" },


  { id:'op-20260506-b', dates:['2026-05-06','2026-05-07'], type:'trending',
    q:"兵工廠 1-0 馬競晉級決賽！Calafiori 那一腳踩到 Griezmann 沒被吹點球，VAR 的判決你怎麼看？",
    opts:["肢體接觸很正常，兵工廠晉級沒有爭議 ⚪","根本就是犯規，馬競才應該進入決賽 🔴","馬競這屆歐冠也吃不少豆腐，這次剛好而已 ⚖️","VAR 制度有漏洞，類似爭議該介入卻沒介入 📺"],
    context:"兵工廠主場 1-0（Saka 進球）淘汰馬競晉級歐冠決賽（總比分 2-1），20 年後重返決賽。下半場第 56 分鐘 Calafiori 在禁區內踩到 Griezmann 的腳沒被吹點球，加上稍早 Giuliano Simeone 對 Gabriel 的禁區動作，馬競下半場兩次點球聲請都被 VAR 駁回。前英格蘭裁判 Mark Clattenburg 分析指出：因主裁先吹了 Pubill 對 Gabriel 的犯規，VAR 不能回頭看後續動作。Simeone 賽後直言「那就是點球，很明顯」並踩到 Arsenal 隊徽抗議，但同時表示不會用裁判作為敗北的藉口。" },

  { id:'op-20260506-a', date:'2026-05-06', type:'predict',
    q:"歐冠半決賽次回合：拜仁主場迎 PSG，能逆轉 5-4 落後晉級嗎？",
    opts:["拜仁安聯魔咒護身，主場逆轉晉級 🔴","PSG 鐵桶陣守住，1-1 晉級 🛡️","拖入加時或 PK 大戰決勝負 ⚽","Hakimi 缺陣 PSG 後防崩盤，拜仁 3-0 強勢晉級 💥"],
    context:"歐冠半決賽次回合：拜仁慕尼黑 vs 巴黎聖日耳曼（5/7 03:00 台灣時間，安聯球場）。首回合 PSG 主場 5-4 險勝。拜仁安聯本季歐冠 6 戰全勝、近 29 場主場僅輸 1。PSG 雙傷：Hakimi 腿後肌撕裂、Chevalier 大腿傷雙雙缺陣，門將由 Safonov 接替；拜仁 Gnabry/Guerreiro/Bischof 也傷退。拜仁 vs PSG 是史上首次「兩隊單季都進球破 40」的歐冠對決（PSG 43 球、拜仁 42 球）。Kompany 帶領拜仁渴望首座歐冠獎杯。注意：UEFA 2021/22 起廢除客場進球規則，總比分平手 → 加時 → PK 大戰決勝負。" },

  { id:'op-20260505-a', date:'2026-05-05', type:'predict',
    q:"歐冠半決賽次回合：兵工廠主場迎戰馬競，誰能挺進布達佩斯決賽？",
    opts:["兵工廠主場全勝延續，2-0 以上晉級 🔴","馬競鐵血防守拖入加時或點球大戰 🛡️","Gyökeres 大爆發，兵工廠輕鬆過關 ⚡","Simeone 的反擊哲學奏效，馬競客場進球逆轉 🇪🇸"],
    context:"歐冠半決賽次回合：兵工廠 vs 馬競（5/6 03:00 台灣時間，Emirates Stadium）。首回合馬德里 1-1 平手。兵工廠本季歐冠主場全勝，且聯賽階段曾 4-0 大勝馬競。Gyökeres 在對富勒姆梅開二度狀態火燙。馬競客場歐冠 W2 D1 L1，Simeone 的球隊以堅韌防守著稱。Arteta 距首座歐冠獎杯僅差兩場。" },

  { id:'op-20260504-a', date:'2026-05-04', type:'predict',
    q:"英超第 35 輪：切爾西 vs 諾丁漢森林，藍軍能止住頹勢嗎？",
    opts:["切爾西主場復甦，2-0 或以上大勝 🔵","客場搶分不易，1-1 悶平收場 🤝","諾丁漢森林爆冷贏球，藍軍主場再翻車 😱","進球大戰，雙方各有破門 🔥"],
    context:"英超第 35 輪：切爾西 vs 諾丁漢森林（5/4 23:00 台灣時間）。切爾西本季主場表現不穩，近 5 場英超 4 連敗、連續 4 場零進球。諾丁漢森林在 Nuno 帶領下穩居前十，客場戰績優異。Rosenior 接替 Maresca 後仍未找到解方。" },

  { id:'op-20260503-a', date:'2026-05-03', type:'predict',
    q:"英超雙紅會：曼聯 vs 利物浦，Old Trafford 誰能笑到最後？",
    opts:["曼聯主場延續強勢，Sesko + Fernandes 建功拿三分 🔴","利物浦即使沒 Salah 也能客場拿分，Wirtz 主宰中場 🟢","雙方互有攻守，1-1 悶平收場 🤝","進球大戰！兩隊後防都有漏洞，3 球以上 🔥"],
    context:"英超第 35 輪焦點：曼聯 vs 利物浦（5/3 23:30 台灣時間）。曼聯 61 分排第 3，近期主場 6 勝 1 負；利物浦 58 分排第 4，但客場近 5 場輸了 4 場。Salah 腿後肌傷缺席，Cunha 臀屈肌不適存疑。本季首回合利物浦 2-0 勝曼聯。Carrick 接手後曼聯近 4 場拿 10 分。" },

  { id:'op-20260502-d', date:'2026-05-02', type:'fun',
    q:"Dembélé 本季歐冠 8 球 + 金球獎得主，他現在是世界前三球員嗎？",
    opts:["當之無愧！金球獎 + 歐冠表現，前三沒問題 👑","前五但不到前三，Haaland 和 Vinícius 還是更強 🤔","歐冠大殺四方但聯賽不夠穩定，還差一點 📊","他就是現在最好的球員，沒有之一 🐐"],
    context:"Ousmane Dembélé 本季迎來生涯巔峰：金球獎得主、歐冠 8 球（巴黎隊內最佳射手）、八強次回合對利物浦梅開二度、半決賽首回合再次雙響助巴黎 5-4 勝拜仁。從巴薩「玻璃人」到巴黎絕對核心，Dembélé 的蛻變令人驚嘆。但也有人質疑法甲競爭力不如英超/西甲。" },

  { id:'op-20260501-b', date:'2026-05-01', type:'trending',
    q:"VAR 該不該推翻兵工廠第三個點球？Eze 是被犯規還是假摔？",
    opts:["明顯犯規！Hancko 碰到了 Eze 的腳 😤","正確判決！Eze 在接觸前就開始倒了 ✅","VAR 不應該介入，場上裁判的判斷應被尊重 ⚖️","規則有問題，VAR 讓足球越來越無聊 😴"],
    context:"馬競 vs 兵工廠半決賽首回合出現三個點球判罰，前兩個分別給了兵工廠和馬競。第三個在 78 分鐘給了兵工廠：Eze 在禁區被 Hancko 絆倒，主裁判罰點球後 VAR 介入推翻。裁判到場邊看回放後認定 Eze 先開始倒地，接觸不夠構成犯規。兵工廠球員圍住裁判抗議但判決不變。" },

  { id:'op-20260430-b', date:'2026-04-30', type:'trending',
    q:"九球史詩！PSG 5-4 拜仁，哪個進球最讓你起雞皮疙瘩？",
    opts:["Kane 17' 開門紅，客場先聲奪人 👑","Kvaratskhelia 24' 禁區內切入遠角，格魯吉亞魔翼爆發 🇬🇪","Olise 41' 世界級入球，金球候選人水準 ✨","Dembélé 45+5' 冰冷點球，半場前搶回領先 🧊"],
    context:"這場 9 球大戰是歐冠史上首次半決賽雙方都打入 4 球以上。22 次射門轟入 9 球，射門轉化率高達 40%。巴黎曾在 56-58 分鐘的 143 秒內連入 2 球一度 5-2 領先，但拜仁 65-68 分鐘連追 2 球將比分縮小到 5-4。" },

  { id:'op-20260429-a', date:'2026-04-29', type:'predict',
    q:"歐冠四強第二場：馬競主場迎戰兵工廠，你押誰？",
    opts:["馬競主場優勢 + Simeone 歐冠經驗，主隊過關 🔴⬜","兵工廠聯賽階段全勝，客場也能拿下 🔫","兩隊鐵桶對決，0-0 或 1-1 平手收場 🤝","馬競先進球但兵工廠逆轉，Arteta 歐冠進化 🔄"],
    context:"4/30（四）03:00 台灣時間，歐冠半決賽首回合在大都會球場開踢。兵工廠聯賽階段八戰全勝，本季歐冠至今不敗（W10 D2）；馬競則在八強淘汰巴薩（總比分3-2）。馬競最近15次對英超球隊的兩回合淘汰賽贏了11次，包括全部3次半決賽。但兵工廠10月聯賽階段曾4-0血洗馬競。Álvarez本季歐冠9球6助攻，Griezmann主場告別戰。兵工廠方面，Saka剛復出、Havertz和Eze帶傷，Merino賽季報銷。" },

  { id:'op-20260428-a', date:'2026-04-28', type:'predict',
    resolveDate:'2026-05-07',
    q:"歐冠四強：PSG vs 拜仁、兵工廠 vs 馬競，你覺得哪兩隊進決賽？",
    opts:["PSG + 兵工廠 🇫🇷🏴󠁧󠁢󠁥󠁮󠁧󠁿","拜仁 + 馬競 🇩🇪🇪🇸","PSG + 馬競 🇫🇷🇪🇸","拜仁 + 兵工廠 🇩🇪🏴󠁧󠁢󠁥󠁮󠁧󠁿"],
    context:"歐冠四強首回合 4/28-29 開踢。PSG 對拜仁是經典對決（2020 決賽重演），兵工廠則首度闖入四強要面對 Simeone 的馬競鐵桶陣。",
    correctAnswer:0 },

  { id:'op-20260427-a', date:'2026-04-27', type:'trending',
    q:"兵工廠 Havertz 和 Eze 雙雙傷退，歐冠半決賽 vs 馬競還能贏嗎？",
    opts:["照贏不誤，Arteta 板凳夠深 💪","影響巨大，馬競主場可能輸球 😰","Eze 能趕上，Havertz 比較危險 🤔","反正有 Odegaard 和 Rice，不怕 🔴"],
    context:"兵工廠 1-0 險勝紐卡索重返榜首，但 Havertz 上半場、Eze 下半場先後傷退。歐冠半決賽首回合 4/30 客場對馬競，Saka 也仍在養傷。Arteta 賽後說傷勢『不嚴重』，但球迷都在擔心。" },

  { id:'op-20260426-c', date:'2026-04-26', type:'trending',
    q:"Estevao 嚴重腿後肌傷，他的世界盃夢想還在嗎？",
    opts:["傷勢沒那麼嚴重，世界盃趕得上 🙏","需要手術，世界盃確定報銷 😢","就算恢復也不會冒險，巴西不缺人 🇧🇷","太年輕了，2030 再來也不遲 🌱"],
    context:"切爾西翼鋒 Estevao 對曼聯被迫退場，報導指可能是罕見的「Grade 4」腿後肌拉傷，或需手術、缺席數月。年僅 19 歲的他是巴西世界盃陣容重要棋子。" },

  { id:'op-20260425-from-op-classic-04', date:'2026-04-25', type:'classic',
    q:"英超 vs 西甲，哪個聯賽水準更高？",
    opts:["英超，競爭更激烈 🏴󠁧󠁢󠁥󠁮󠁧󠁿","西甲，技術更頂尖 🇪🇸"],
    context:"兩大聯賽的永恆之爭" },

  { id:'op-20260424-a', date:'2026-04-24', type:'trending',
    q:"曼城登頂！Haaland 5 分鐘破門送伯恩利降級，曼城能一路衝冠嗎？",
    opts:["穩了，Guardiola 收割模式 🏆","還早，Rodri 傷缺是隱患 ⚠️","兵工廠還有機會反撲 🔴"],
    context:"曼城 1-0 伯恩利後升至榜首，領先兵工廠（少賽一場）。但 Rodri 腹股溝傷缺 1-6 週，曼城得靠 O'Reilly 和 Bernardo Silva 頂住中場。" },

  { id:'op-20260424-a', date:'2026-04-24', type:'trending',
    q:"曼城登頂！Haaland 5 分鐘破門送伯恩利降級，曼城能一路衝冠嗎？",
    opts:["穩了，Guardiola 收割模式 🏆","還早，Rodri 傷缺是隱患 ⚠️","兵工廠還有機會反撲 🔴"],
    context:"曼城 1-0 伯恩利後升至榜首，領先兵工廠（少賽一場）。但 Rodri 腹股溝傷缺 1-6 週，曼城得靠 O'Reilly 和 Bernardo Silva 頂住中場。" },

  { id:'op-20260423-a', date:'2026-04-23', type:'trending',
    q:"布萊頓 3-0 切爾西！切爾西連 5 場零進球創 114 年最差，Rosenior 該下課嗎？",
    opts:["該換了，毫無起色 🔴","再給機會，傷兵太多 🟡","問題在管理層不是教練 🏢"],
    context:"切爾西自 1912 年以來首次連續 5 場英超零進球。Palmer 和 James 缺陣讓球隊創造力歸零，從歐冠區跌至第 7。" },

  { id:'op-20260422-a', date:'2026-04-22', type:'trending',
    q:"Rodri 腹股溝傷退 1-6 週，曼城補賽優勢還能守住嗎？",
    opts:["能，Guardiola 總有備案 🧠","不能，Rodri 無可取代 💔","要看傷多久，超過 4 週就危險 ⏳"],
    context:"Rodri 在 2-1 勝兵工廠第 88 分鐘傷退，檢查可能缺陣 1-6 週。曼城目前落後兵工廠 3 分但手握一場補賽。" },

  { id:'op-20260420-a', date:'2026-04-20', type:'trending',
    q:"曼城 2-1 逆轉兵工廠！差距剩 3 分，英超冠軍還有懸念嗎？",
    opts:["兵工廠穩，經驗夠 🔴","曼城翻盤，手上有補賽 🔵","利物浦才是最後贏家 ❤️"],
    context:"Cherki 16' 開球、Havertz 18' 靠 Donnarumma 失誤扳平、Haaland 65' 絕殺。差距 6→3 分，曼城還有一場補賽" },

  { id:'op-20260418-from-op-classic-01', date:'2026-04-18', type:'classic',
    q:"VAR 讓足球變更好了還是更無聊了？",
    opts:["更好，更公平 ⚖️","更無聊，破壞節奏 😤"],
    context:"自2018年世界盃引入以來，VAR一直是最具爭議的話題" },

  { id:'op-20260417', date:'2026-04-17', type:'trending',
    q:'熱刺真的會降級嗎？',
    opts:['會，完蛋了 😱','不會，太扯了 💪'],
    context:'De Zerbi 上任首戰就輸，目前排名第18，自1977年後從未降級' },


  { id:'op-20260419', date:'2026-04-19', type:'trending',
    q:'Camavinga 對 Kane 犯規的紅牌，判得對嗎？',
    opts:['對，犯規就是犯規','不對，太嚴格了'],
    context:'歐冠八強拜仁vs皇馬，86分鐘Camavinga第二黃離場，3分鐘後拜仁連進兩球逆轉' },


  { id:'op-20260421', date:'2026-04-21', type:'trending',
    q:'Ekitike 阿基里斯腱斷裂缺席世界盃，法國還是奪冠熱門嗎？',
    opts:['還是，人才太多了','不是了，打擊太大'],
    context:'利物浦前鋒在歐冠對PSG比賽中受傷，確定缺席整個世界盃' },



  // ── 永恆級 ─────────────────────────────────────────
  { id:'op-classic-01', type:'classic',
    q:'VAR 讓足球變更好了還是更無聊了？',
    opts:['更好，更公平 ⚖️','更無聊，破壞節奏 😤'],
    context:'自2018年世界盃引入以來，VAR一直是最具爭議的話題' },

  { id:'op-classic-02', type:'classic',
    q:'你能接受支持的球隊踢很醜但贏冠軍嗎？',
    opts:['能，冠軍最重要 🏆','不能，要贏得漂亮 ✨'],
    context:'Simeone式的防守反擊 vs Guardiola式的控球美學' },

  { id:'op-classic-03', type:'classic',
    q:'2002 韓國世界盃四強，靠實力還是裁判？',
    opts:['有實力成分 🇰🇷','裁判幫太多了 🤦'],
    context:'義大利和西班牙的淘汰過程至今爭議不斷' },

  { id:'op-classic-04', type:'classic',
    q:'英超 vs 西甲，哪個聯賽水準更高？',
    opts:['英超，競爭更激烈 🏴󠁧󠁢󠁥󠁮󠁧󠁿','西甲，技術更頂尖 🇪🇸'],
    context:'兩大聯賽的永恆之爭' },

  { id:'op-classic-05', type:'classic',
    q:'PK大戰是最好的淘汰賽決勝方式嗎？',
    opts:['是，最刺激 🎯','不是，太看運氣 🎲'],
    context:'從1976年歐洲盃開始，PK大戰創造了無數經典與心碎時刻' },

  // ── 台灣視角 ─────────────────────────────────────────
  { id:'op-tw-01', type:'fun',
    q:'台灣足球最缺的是什麼？',
    opts:['💰 錢','🏟️ 場地','👀 關注度','⚽ 青訓'],
    context:'台灣足球發展長期受限，你覺得最關鍵的問題是什麼？' },

  { id:'op-tw-02', type:'fun',
    q:'你覺得台灣人看世界盃最大的痛苦是？',
    opts:['😴 時差','🤷 沒人一起看','😵 不懂規則','💼 看完還是要上班'],
    context:'在台灣當足球迷的日常' },

  { id:'op-tw-03', type:'fun',
    q:'你有因為看球賽翹班或翹課過嗎？',
    opts:['有 🤫','沒有，不敢 😇'],
    context:'2014、2018、2022世界盃都讓不少台灣人掙扎過' },

  { id:'op-tw-04', type:'classic',
    q:'Son Heung-min 是亞洲足球史上最強球員嗎？',
    opts:['是，毫無疑問 🇰🇷','不是，還有別人更強'],
    context:'孫興慜在英超的成就前無古人，但中田英壽、朴智星、車範根也是傳奇' },

  { id:'op-tw-05', type:'predict',
    q:'日本 vs 韓國，2026世界盃誰走得更遠？',
    opts:['日本 🇯🇵','韓國 🇰🇷'],
    context:'兩支亞洲最強球隊，一個靠歐洲豪門兵團，一個靠孫興慜單核帶隊' },

  { id:'op-tw-06', type:'fun',
    q:'去運動酒吧看球 vs 在家沙發看球，你選哪個？',
    opts:['🍻 運動酒吧，有氣氛','🛋️ 在家沙發，更舒服'],
    context:'各有各的好，看你重視氣氛還是舒適度' },

  // ── 球員比較 ─────────────────────────────────────────
  { id:'op-player-01', type:'classic',
    q:'Haaland vs Mbappé，誰會定義下一個十年？',
    opts:['Haaland 💪','Mbappé ⚡'],
    context:'一個是純粹的進球機器，一個是全能的速度怪物' },

  { id:'op-player-02', type:'classic',
    q:'你願意花1.5億歐買誰？',
    opts:['Yamal 🇪🇸','Bellingham 🏴󠁧󠁢󠁥󠁮󠁧󠁿','Musiala 🇩🇪','Pedri 🇪🇸'],
    context:'四個 U23 中場天才，你會選誰建隊？' },

  { id:'op-player-03', type:'trending',
    q:'Igor Thiago 21球能搶走 Haaland 的金靴嗎？',
    opts:['能，他狀態太好了 🔥','不能，Haaland 穩的 🧊'],
    context:'布倫特福德射手本季21球僅落後Haaland 1球，金靴懸念十足' },

  // ── 預測型（有開獎的） ─────────────────────────────────
  { id:'op-predict-01', type:'predict',
    q:'2026世界盃冠軍你押誰？',
    opts:['🇧🇷 巴西','🇫🇷 法國','🇦🇷 阿根廷','🇪🇸 西班牙'],
    context:'48隊新制，哪支球隊能笑到最後？' },

  { id:'op-predict-02', type:'predict',
    q:'歐冠四強你最看好誰奪冠？',
    opts:['🔴 兵工廠','🔴⚪ 馬競','🔵🔴 巴黎','🔴 拜仁'],
    context:'四支風格迥異的球隊，5/31布達佩斯決賽見分曉' },

  { id:'op-predict-03', type:'predict',
    q:'亞洲球隊2026世界盃最遠能走到哪？',
    opts:['小組賽出局','十六強','八強','四強以上 🤯'],
    context:'日本、韓國、澳洲、沙烏地等都有機會創造歷史' }
];

// 判斷某題在今天是否要顯示：date 單值 OR dates 陣列裡有今天
function _opinionMatchesDate(o, today) {
  // 1. expiresAt 時戳優先（午後熱點題用，剛好 24h）
  //    剛上線到 24h 後自動消失，不卡到隔天
  if (o.expiresAt) {
    return Date.now() < new Date(o.expiresAt).getTime();
  }
  // 2. dates 陣列（跨日題，現存舊資料相容）
  if (Array.isArray(o.dates)) return o.dates.includes(today);
  // 3. 單日 date
  return o.date === today;
}

// 取得今日所有觀點題目（一天可有 1~2 題：主題 + 24h 回顧題）
// 排序：依 id 字典順遞增（id 內含 YYYYMMDD-x，所以等同於建立時間先後 → 越早越前）
function getTodayOpinions() {
  const today = localDateStr();
  // 1. 先找有指定日期的（date 單值或 dates 陣列含今天）
  const dated = DAILY_OPINIONS.filter(o => _opinionMatchesDate(o, today));
  if (dated.length) {
    return dated.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  // 2. 沒有指定日期的就從無日期題庫中按天數輪流（fallback）
  const undated = DAILY_OPINIONS.filter(o => !o.date && !o.dates && !o.expiresAt);
  if (!undated.length) return [DAILY_OPINIONS[0]];
  const dayNum = Math.floor((new Date() - new Date('2026-01-01')) / 86400000);
  return [undated[dayNum % undated.length]];
}

// 取得今日第一題（向後相容）
function getTodayOpinion() {
  return getTodayOpinions()[0] || null;
}

if (typeof window !== 'undefined') {
  window.DAILY_OPINIONS = DAILY_OPINIONS;
  window.getTodayOpinion = getTodayOpinion;
  window.getTodayOpinions = getTodayOpinions;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DAILY_OPINIONS, getTodayOpinion, getTodayOpinions };
}
