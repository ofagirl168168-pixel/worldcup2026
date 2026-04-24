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
    q:"布萊頓 3-0 乙爾西！乙爾西連 5 場零進球創 114 年最差，Rosenior 該下課嗎？",
    opts:["該換了，毫無起色 🔴","再給機會，傷兵太多 🟡","問題在管理層不是教練 🏢"],
    context:"乙爾西自 1912 年以來首次連續 5 場英超零進球。Palmer 和 James 缺陣讓球隊創造力歸零，從歐冠區跌至第 7。" },

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
