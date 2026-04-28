/* =============================================
   EPL-DATA-DAILY.JS — 英超每日一題題庫
   type: 'normal'=一般 | 'hard'=高難度 | 'viral'=話題性
   ============================================= */

const EPL_DAILY_QUESTIONS = [

  // ── NORMAL ───────────────────────────────────────────────
  { type:'normal', q:'英超歷史上奪冠次數最多的球隊是？',
    opts:['利物浦','兵工廠','曼聯','曼城'], correct:2,
    explain:'曼聯以20次英格蘭頂級聯賽冠軍位居榜首，其中13次在英超時代（1992年至今）獲得。' },
  { type:'normal', q:'英超聯賽從哪一年開始？',
    opts:['1888年','1992年','1996年','2000年'], correct:1,
    explain:'英超聯賽於1992/93賽季正式成立，取代了原來的甲級聯賽（First Division）。' },
  { type:'normal', q:'哪位球員是英超歷史上進球最多的球員？',
    opts:['乙恩·魯尼','蒂埃里·亨利','乙倫·希勒','Harry Kane'], correct:2,
    explain:'乙倫·希勒（Alan Shearer）以260球高居英超歷史射手榜首位，這項紀錄至今無人能破。' },
  { type:'normal', q:'英超一個賽季有多少輪比賽？',
    opts:['34輪','36輪','38輪','40輪'], correct:2,
    explain:'英超20支球隊進行主客場雙循環，每隊踢38場比賽，全季共380場。' },
  { type:'normal', q:'2003/04賽季哪支球隊以不敗戰績奪冠？',
    opts:['曼聯','切爾西','利物浦','兵工廠'], correct:3,
    explain:'兵工廠在2003/04賽季以26勝12平0負的不敗紀錄奪冠，被稱為「無敵艦隊」（The Invincibles）。' },
  { type:'normal', q:'英超每賽季有幾支球隊降級？',
    opts:['2支','3支','4支','5支'], correct:1,
    explain:'英超每賽季積分榜最後3名降級至英冠，同時英冠前2名直接升級，第3-6名通過附加賽爭奪第3個升級名額。' },
  { type:'normal', q:'哪位球員保持英超單賽季進球紀錄？',
    opts:['Thierry Henry（31球）','Mohamed Salah（32球）','Andy Cole（34球）','Erling Haaland（36球）'], correct:3,
    explain:'Erling Haaland在2022/23賽季打入36球，打破了Andy Cole和Alan Shearer保持的34球紀錄。' },
  { type:'normal', q:'英超使用VAR（影像助理裁判）是從哪個賽季開始？',
    opts:['2017/18','2018/19','2019/20','2020/21'], correct:2,
    explain:'英超從2019/20賽季開始正式使用VAR系統，雖然爭議不斷，但已成為比賽的固定部分。' },
  { type:'normal', q:'哪支球隊連續四次奪得英超冠軍（2018-2023）？',
    opts:['利物浦','切爾西','曼聯','曼城'], correct:3,
    explain:'曼城在Guardiola帶領下於2020/21至2022/23連續三季奪冠（加上2018/19為四冠中的三連霸），2023/24由兵工廠中斷。' },
  { type:'normal', q:'英超歷史上紅牌最多的球員是？',
    opts:['Roy Keane','Patrick Vieira','Richard Dunne','Duncan Ferguson'], correct:1,
    explain:'Patrick Vieira和Richard Dunne各以8張紅牌並列英超紅牌紀錄保持者。Roy Keane也是紅牌榜常客。' },

  // ── HARD ───────────────────────────────────────────────
  { type:'hard', q:'英超歷史上最大比分的比賽是？',
    opts:['曼聯 9-0 伊普斯維奇','曼城 9-0 伯頓','曼聯 9-0 南安普敦','利物浦 9-0 伯恩茅斯'], correct:2,
    explain:'2021年2月，曼聯以9:0大勝南安普敦，追平了英超歷史最大比分紀錄（先前為曼聯1995年9:0伊普斯維奇）。' },
  { type:'hard', q:'英超單場個人進球紀錄是幾球？',
    opts:['4球','5球','6球','7球'], correct:1,
    explain:'英超單場個人進球紀錄為5球，由多位球員達成，包括Andy Cole、Alan Shearer、Jermain Defoe和Dimitar Berbatov等。' },
  { type:'hard', q:'英超歷史上助攻最多的球員是？',
    opts:['David Beckham','Cesc Fàbregas','Ryan Giggs','Kevin De Bruyne'], correct:2,
    explain:'Ryan Giggs以162次助攻位居英超歷史助攻榜首位，這得益於他在曼聯長達20多年的職業生涯。' },
  { type:'hard', q:'哪位門將保持英超單賽季最多零封紀錄？',
    opts:['Petr Čech（24次）','Edwin van der Sar（21次）','Ederson（20次）','Alisson（21次）'], correct:0,
    explain:'Petr Čech在2004/05賽季為切爾西完成24次零封，這項紀錄至今無人能破，也是切爾西該季奪冠的關鍵。' },
  { type:'hard', q:'英超歷史上連續不敗場次最長紀錄是？',
    opts:['38場','42場','49場','55場'], correct:2,
    explain:'兵工廠從2003年5月到2004年10月創下49場英超不敗紀錄，橫跨兩個賽季，最終在曼聯主場被終結。' },

  // ── VIRAL ───────────────────────────────────────────────
  { type:'viral', q:'「Fergie Time」（弗格森時間）指的是什麼現象？',
    opts:['弗格森總在賽前遲到','曼聯經常在傷停補時絕殺','弗格森暫停訓練的習慣','裁判給曼聯額外時間'], correct:1,
    explain:'「Fergie Time」形容曼聯在弗格森時代經常在傷停補時階段進球逆轉，這成為英超文化中的經典迷因。' },
  { type:'viral', q:'2011/12賽季英超最後一天發生了什麼經典時刻？',
    opts:['利物浦滑倒','曼城93:20奪冠','乙切斯特惡夢','Agüero！！！'], correct:3,
    explain:'Agüero在傷停補時第94分鐘打入絕殺，曼城以淨勝球優勢壓倒曼聯首次奪得英超冠軍。Martin Tyler的「AGÜEROOOO！！」解說成為英超最經典時刻。' },
  { type:'viral', q:'2015/16賽季最大的奇蹟是什麼？',
    opts:['曼城首次奪冠','兵工廠終結荒年','乙切斯特城奪冠','利物浦六連勝'], correct:2,
    explain:'乙切斯特城在賽前5000:1的奪冠賠率下贏得英超冠軍，被譽為體育史上最大奇蹟，Ranieri帶隊、Vardy和Mahrez大放異彩。' },
  { type:'viral', q:'Cole Palmer 2024/25賽季表現為何被稱為「Cold Palmer」？',
    opts:['他總穿短袖','進球後表情冷靜','他怕冷常戴手套','暱稱來自冷凍食品廣告'], correct:1,
    explain:'Cole Palmer因進球後極度冷靜的慶祝方式和淡定表情被球迷稱為「Cold Palmer」，成為社群媒體上的熱門迷因。' },
  { type:'viral', q:'哪位球員以「射門假動作」聞名英超社群？',
    opts:['Son Heung-Min','Bruno Fernandes','Mohamed Salah','Phil Foden'], correct:1,
    explain:'Bruno Fernandes的罰球假動作（stuttered run-up）多次騙過門將，也引發了大量社群迷因和討論。' }
];

window.EPL_DAILY_QUESTIONS = EPL_DAILY_QUESTIONS;
