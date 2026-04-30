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
    context:"歐冠四強首回合 4/28-29 開踢。PSG 對拜仁是經典對決（2020 決賽重演），兵工廠則首度闖入四強要面對 Simeone 的馬競鐵桶陣。" },

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

// 取得今日觀點題目
function getTodayOpinion() {
  const today = localDateStr();
  // 1. 先找有指定日期的
  const dated = DAILY_OPINIONS.find(o => o.date === today);
  if (dated) return dated;
  // 2. 沒有指定日期的就從無日期題庫中按天數輪流
  const undated = DAILY_OPINIONS.filter(o => !o.date);
  if (!undated.length) return DAILY_OPINIONS[0];
  const dayNum = Math.floor((new Date() - new Date('2026-01-01')) / 86400000);
  return undated[dayNum % undated.length];
}

if (typeof window !== 'undefined') {
  window.DAILY_OPINIONS = DAILY_OPINIONS;
  window.getTodayOpinion = getTodayOpinion;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DAILY_OPINIONS, getTodayOpinion };
}
