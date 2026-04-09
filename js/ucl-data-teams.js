/* =============================================
   UCL-DATA-TEAMS.JS — 2025/26 歐冠聯賽 36支球隊資料
   UEFA係數：依據2025年最新排名
   資料截止：2025/26賽季
   ============================================= */

const UCL_TEAMS = {

  // ===== POT 1 =====
  'RMA': {
    name:'Real Madrid', nameCN:'皇家馬德里', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/80px-Real_Madrid_CF.svg.png', pot:1, league:'La Liga',
    uefaCoeff:136, coach:'Carlo Ancelotti', formation:'4-3-1-2',
    keyPlayers:[
      {name:'Jude Bellingham',pos:'攻擊中場',club:'皇家馬德里'},
      {name:'Vinícius Jr.',pos:'左翼',club:'皇家馬德里'},
      {name:'Kylian Mbappé',pos:'前鋒',club:'皇家馬德里'},
      {name:'Toni Kroos',pos:'中場',club:'皇家馬德里'},
      {name:'Thibaut Courtois',pos:'門將',club:'皇家馬德里'}
    ],
    radar:{attack:96,defense:88,midfield:93,speed:94,experience:98},
    style:'控球為主，快速反擊，個人能力突破',
    strengths:['Mbappé+Vinícius雙翼極速','歐冠DNA，大賽經驗無人能及','Bellingham關鍵時刻爆發力'],
    weaknesses:['後防老化隱憂','中場節奏控制偶有失衡','板凳深度相對薄弱'],
    history:'歐冠史上最成功球隊，15次奪冠，2023/24衛冕冠軍'
  },
  'MCI': {
    name:'Manchester City', nameCN:'曼城', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/80px-Manchester_City_FC_badge.svg.png', pot:1, league:'Premier League',
    uefaCoeff:148, coach:'Pep Guardiola', formation:'4-3-3',
    keyPlayers:[
      {name:'Erling Haaland',pos:'中鋒',club:'曼城'},
      {name:'Kevin De Bruyne',pos:'攻擊中場',club:'曼城'},
      {name:'Phil Foden',pos:'翼鋒/中場',club:'曼城'},
      {name:'Rodri',pos:'防守中場',club:'曼城'},
      {name:'Ederson',pos:'門將',club:'曼城'}
    ],
    radar:{attack:95,defense:90,midfield:95,speed:88,experience:92},
    style:'極致控球，位置輪轉，高位壓迫',
    strengths:['Haaland禁區終結能力頂級','Guardiola戰術體系成熟','中場控制力聯賽最強'],
    weaknesses:['De Bruyne傷病風險','歐冠淘汰賽心態波動','對陣強隊反擊時後防空間大'],
    history:'2022/23首奪歐冠，近年穩定進入八強以上'
  },
  'BAY': {
    name:'Bayern Munich', nameCN:'拜仁慕尼黑', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg/80px-FC_Bayern_M%C3%BCnchen_logo_%282024%29.svg.png', pot:1, league:'Bundesliga',
    uefaCoeff:144, coach:'Vincent Kompany', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Harry Kane',pos:'中鋒',club:'拜仁慕尼黑'},
      {name:'Jamal Musiala',pos:'攻擊中場',club:'拜仁慕尼黑'},
      {name:'Leroy Sané',pos:'右翼',club:'拜仁慕尼黑'},
      {name:'Joshua Kimmich',pos:'中場/右後衛',club:'拜仁慕尼黑'},
      {name:'Manuel Neuer',pos:'門將',club:'拜仁慕尼黑'}
    ],
    radar:{attack:93,defense:87,midfield:90,speed:88,experience:95},
    style:'高位壓迫，邊路進攻，中路滲透',
    strengths:['Kane進球效率驚人','Musiala創造力頂級','德甲統治力保證信心'],
    weaknesses:['後防重建期不穩定','Kompany歐冠執教經驗不足','高線防守易被反擊'],
    history:'6次歐冠冠軍，2019/20最近一次奪冠'
  },
  'PSG': {
    name:'Paris Saint-Germain', nameCN:'巴黎聖日耳曼', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/80px-Paris_Saint-Germain_F.C..svg.png', pot:1, league:'Ligue 1',
    uefaCoeff:116, coach:'Luis Enrique', formation:'4-3-3',
    keyPlayers:[
      {name:'Ousmane Dembélé',pos:'右翼',club:'巴黎聖日耳曼'},
      {name:'Bradley Barcola',pos:'左翼',club:'巴黎聖日耳曼'},
      {name:'Vitinha',pos:'中場',club:'巴黎聖日耳曼'},
      {name:'Achraf Hakimi',pos:'右後衛',club:'巴黎聖日耳曼'},
      {name:'Gianluigi Donnarumma',pos:'門將',club:'巴黎聖日耳曼'}
    ],
    radar:{attack:88,defense:83,midfield:87,speed:90,experience:82},
    style:'高控球率，邊路突破，團隊足球',
    strengths:['Dembélé速度與盤帶頂級','Luis Enrique戰術體系清晰','年輕陣容潛力大'],
    weaknesses:['後Mbappé時代缺乏核心射手','歐冠決賽經驗不足','關鍵戰抗壓能力存疑'],
    history:'2019/20首進歐冠決賽，歷史最佳成績亞軍'
  },
  'LIV': {
    name:'Liverpool', nameCN:'利物浦', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/80px-Liverpool_FC.svg.png', pot:1, league:'Premier League',
    uefaCoeff:114, coach:'Arne Slot', formation:'4-3-3',
    keyPlayers:[
      {name:'Mohamed Salah',pos:'右翼',club:'利物浦'},
      {name:'Virgil van Dijk',pos:'中後衛',club:'利物浦'},
      {name:'Alexis Mac Allister',pos:'中場',club:'利物浦'},
      {name:'Darwin Núñez',pos:'中鋒',club:'利物浦'},
      {name:'Alisson',pos:'門將',club:'利物浦'}
    ],
    radar:{attack:91,defense:89,midfield:88,speed:90,experience:90},
    style:'高強度壓迫，快速轉換，邊路交叉',
    strengths:['Salah依然是頂級得分手','Van Dijk後防領袖','Slot帶來新戰術活力'],
    weaknesses:['陣容老化需要更新換代','Slot歐冠執教經驗有限','板凳深度不如曼城'],
    history:'6次歐冠冠軍，2018/19最近一次奪冠'
  },
  'INT': {
    name:'Inter Milan', nameCN:'國際米蘭', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/FC_Internazionale_Milano_2021.svg/80px-FC_Internazionale_Milano_2021.svg.png', pot:1, league:'Serie A',
    uefaCoeff:101, coach:'Simone Inzaghi', formation:'3-5-2',
    keyPlayers:[
      {name:'Lautaro Martínez',pos:'前鋒',club:'國際米蘭'},
      {name:'Nicolò Barella',pos:'中場',club:'國際米蘭'},
      {name:'Hakan Çalhanoğlu',pos:'中場',club:'國際米蘭'},
      {name:'Marcus Thuram',pos:'前鋒',club:'國際米蘭'},
      {name:'Yann Sommer',pos:'門將',club:'國際米蘭'}
    ],
    radar:{attack:88,defense:90,midfield:89,speed:84,experience:88},
    style:'三後衛穩固防守，中場控制，雙前鋒配合',
    strengths:['Lautaro+Thuram鋒線組合犀利','三後衛防守體系成熟','Barella中場引擎'],
    weaknesses:['陣容年齡偏大','翼衛體能消耗大','面對極速反擊時三後衛易被打穿'],
    history:'3次歐冠冠軍，2022/23打入決賽'
  },
  'DOR': {
    name:'Borussia Dortmund', nameCN:'多特蒙德', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Borussia_Dortmund_logo.svg/80px-Borussia_Dortmund_logo.svg.png', pot:1, league:'Bundesliga',
    uefaCoeff:97, coach:'Nuri Şahin', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Karim Adeyemi',pos:'翼鋒',club:'多特蒙德'},
      {name:'Julian Brandt',pos:'攻擊中場',club:'多特蒙德'},
      {name:'Marcel Sabitzer',pos:'中場',club:'多特蒙德'},
      {name:'Nico Schlotterbeck',pos:'中後衛',club:'多特蒙德'},
      {name:'Gregor Kobel',pos:'門將',club:'多特蒙德'}
    ],
    radar:{attack:82,defense:80,midfield:83,speed:86,experience:82},
    style:'快速反擊，邊路突破，黃牆主場氣勢',
    strengths:['年輕球員爆發力強','Signal Iduna Park主場優勢','反擊速度極快'],
    weaknesses:['關鍵球員流失風險','防守穩定性不足','聯賽成績波動影響信心'],
    history:'1996/97歐冠冠軍，2023/24打入決賽'
  },
  'BAR': {
    name:'FC Barcelona', nameCN:'巴塞隆納', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/80px-FC_Barcelona_%28crest%29.svg.png', pot:1, league:'La Liga',
    uefaCoeff:122, coach:'Hansi Flick', formation:'4-3-3',
    keyPlayers:[
      {name:'Lamine Yamal',pos:'右翼',club:'巴塞隆納'},
      {name:'Robert Lewandowski',pos:'中鋒',club:'巴塞隆納'},
      {name:'Pedri',pos:'中場',club:'巴塞隆納'},
      {name:'Gavi',pos:'中場',club:'巴塞隆納'},
      {name:'Marc-André ter Stegen',pos:'門將',club:'巴塞隆納'}
    ],
    radar:{attack:92,defense:82,midfield:91,speed:88,experience:86},
    style:'Tiki-taka傳控，青訓新星為核心',
    strengths:['Yamal天賦驚人，17歲即世界級','中場Pedri+Gavi黃金組合','Flick高壓戰術改造成功'],
    weaknesses:['財務問題限制補強','ter Stegen傷病影響','後防線高度不足'],
    history:'5次歐冠冠軍，2014/15最近一次奪冠'
  },
  'LEV': {
    name:'Bayer Leverkusen', nameCN:'勒沃庫森', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/5/59/Bayer_04_Leverkusen_logo.svg/80px-Bayer_04_Leverkusen_logo.svg.png', pot:1, league:'Bundesliga',
    uefaCoeff:90, coach:'Xabi Alonso', formation:'3-4-2-1',
    keyPlayers:[
      {name:'Florian Wirtz',pos:'攻擊中場',club:'勒沃庫森'},
      {name:'Granit Xhaka',pos:'中場',club:'勒沃庫森'},
      {name:'Alejandro Grimaldo',pos:'左後衛',club:'勒沃庫森'},
      {name:'Jonathan Tah',pos:'中後衛',club:'勒沃庫森'},
      {name:'Lukáš Hrádecký',pos:'門將',club:'勒沃庫森'}
    ],
    radar:{attack:87,defense:85,midfield:89,speed:86,experience:78},
    style:'高位壓迫，流暢傳控，後場出球',
    strengths:['Wirtz是歐洲最佳新星之一','Xabi Alonso戰術革命','2023/24賽季不敗奪冠信心'],
    weaknesses:['歐冠深度經驗不足','關鍵球員被挖角風險','板凳深度有限'],
    history:'2023/24德甲不敗冠軍，歐冠最佳成績2001/02亞軍'
  },

  // ===== POT 2 =====
  'ATM': {
    name:'Atlético Madrid', nameCN:'馬德里競技', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Atletico_Madrid_Logo_2024.svg/80px-Atletico_Madrid_Logo_2024.svg.png', pot:2, league:'La Liga',
    uefaCoeff:104, coach:'Diego Simeone', formation:'3-5-2',
    keyPlayers:[
      {name:'Antoine Griezmann',pos:'前鋒/攻擊中場',club:'馬德里競技'},
      {name:'Julián Álvarez',pos:'前鋒',club:'馬德里競技'},
      {name:'Koke',pos:'中場',club:'馬德里競技'},
      {name:'José María Giménez',pos:'中後衛',club:'馬德里競技'},
      {name:'Jan Oblak',pos:'門將',club:'馬德里競技'}
    ],
    radar:{attack:85,defense:90,midfield:84,speed:82,experience:94},
    style:'鐵血防守，強悍對抗，高效反擊',
    strengths:['Simeone防守體系歐洲最佳','Álvarez帶來新鋒線活力','大賽經驗極其豐富'],
    weaknesses:['進攻創造力偶有不足','陣容老化趨勢','控球率低時易被壓制'],
    history:'2013/14、2015/16兩次歐冠亞軍'
  },
  'ATA': {
    name:'Atalanta', nameCN:'亞特蘭大', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/6/66/AtalantaBC.svg/80px-AtalantaBC.svg.png', pot:2, league:'Serie A',
    uefaCoeff:81, coach:'Gian Piero Gasperini', formation:'3-4-1-2',
    keyPlayers:[
      {name:'Ademola Lookman',pos:'前鋒',club:'亞特蘭大'},
      {name:'Charles De Ketelaere',pos:'攻擊中場',club:'亞特蘭大'},
      {name:'Éderson',pos:'中場',club:'亞特蘭大'},
      {name:'Teun Koopmeiners',pos:'中場',club:'亞特蘭大'},
      {name:'Marco Carnesecchi',pos:'門將',club:'亞特蘭大'}
    ],
    radar:{attack:84,defense:82,midfield:85,speed:84,experience:74},
    style:'高強度壓迫，人盯人防守，全攻全守',
    strengths:['Gasperini獨特戰術體系','Lookman大賽爆發力強','團隊默契極佳'],
    weaknesses:['缺乏頂級個人能力','歐冠經驗較淺','板凳深度不足'],
    history:'2023/24歐聯冠軍，歐冠最佳成績2019/20八強'
  },
  'JUV': {
    name:'Juventus', nameCN:'尤文圖斯', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Juventus_FC_-_logo_black_%28Italy%2C_2020%29.svg/80px-Juventus_FC_-_logo_black_%28Italy%2C_2020%29.svg.png', pot:2, league:'Serie A',
    uefaCoeff:80, coach:'Thiago Motta', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Dušan Vlahović',pos:'中鋒',club:'尤文圖斯'},
      {name:'Federico Chiesa',pos:'翼鋒',club:'尤文圖斯'},
      {name:'Manuel Locatelli',pos:'中場',club:'尤文圖斯'},
      {name:'Gleison Bremer',pos:'中後衛',club:'尤文圖斯'},
      {name:'Wojciech Szczęsny',pos:'門將',club:'尤文圖斯'}
    ],
    radar:{attack:82,defense:84,midfield:80,speed:82,experience:88},
    style:'穩固防守，伺機反擊，注重戰術紀律',
    strengths:['義式防守DNA','Vlahović禁區終結力強','Motta帶來新風格'],
    weaknesses:['進攻流暢度不足','中場創造力缺乏','近年歐冠成績下滑'],
    history:'2次歐冠冠軍（1985、1996），近年多次進入淘汰賽'
  },
  'BEN': {
    name:'Benfica', nameCN:'本菲卡', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/a/a2/SL_Benfica_logo.svg/80px-SL_Benfica_logo.svg.png', pot:2, league:'Liga Portugal',
    uefaCoeff:79, coach:'Roger Schmidt', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Ángel Di María',pos:'右翼',club:'本菲卡'},
      {name:'Orkun Kökçü',pos:'中場',club:'本菲卡'},
      {name:'António Silva',pos:'中後衛',club:'本菲卡'},
      {name:'Rafa Silva',pos:'翼鋒',club:'本菲卡'},
      {name:'Anatoliy Trubin',pos:'門將',club:'本菲卡'}
    ],
    radar:{attack:82,defense:78,midfield:80,speed:84,experience:76},
    style:'積極壓迫，快速轉換，青訓造血',
    strengths:['Di María經驗與創造力','青訓產線持續產出頂級球員','主場氣氛火爆'],
    weaknesses:['每季主力被挖角','歐冠淘汰賽穩定性差','關鍵位置深度不足'],
    history:'2次歐冠冠軍（1961、1962），2022/23八強'
  },
  'ARS': {
    name:'Arsenal', nameCN:'兵工廠', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/80px-Arsenal_FC.svg.png', pot:2, league:'Premier League',
    uefaCoeff:72, coach:'Mikel Arteta', formation:'4-3-3',
    keyPlayers:[
      {name:'Bukayo Saka',pos:'右翼',club:'兵工廠'},
      {name:'Martin Ødegaard',pos:'攻擊中場',club:'兵工廠'},
      {name:'Declan Rice',pos:'防守中場',club:'兵工廠'},
      {name:'William Saliba',pos:'中後衛',club:'兵工廠'},
      {name:'David Raya',pos:'門將',club:'兵工廠'}
    ],
    radar:{attack:89,defense:90,midfield:90,speed:88,experience:78},
    style:'高位壓迫，定位球戰術強，控球推進',
    strengths:['Saka+Ødegaard右路連線致命','Saliba後防磐石','定位球得分能力頂級'],
    weaknesses:['歐冠經驗相對不足','鋒線缺少頂級中鋒','面對低位防守時創造力不足'],
    history:'2005/06歐冠亞軍，近年重返歐冠行列'
  },
  'ACM': {
    name:'AC Milan', nameCN:'AC米蘭', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/80px-Logo_of_AC_Milan.svg.png', pot:2, league:'Serie A',
    uefaCoeff:76, coach:'Paulo Fonseca', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Rafael Leão',pos:'左翼',club:'AC米蘭'},
      {name:'Christian Pulisic',pos:'右翼/攻擊中場',club:'AC米蘭'},
      {name:'Theo Hernández',pos:'左後衛',club:'AC米蘭'},
      {name:'Tijjani Reijnders',pos:'中場',club:'AC米蘭'},
      {name:'Mike Maignan',pos:'門將',club:'AC米蘭'}
    ],
    radar:{attack:84,defense:80,midfield:82,speed:88,experience:82},
    style:'快速反擊，邊路突破，技術型足球',
    strengths:['Leão速度與技術頂級','Theo攻守兼備','San Siro主場氣勢'],
    weaknesses:['防守穩定性不足','比賽專注度波動大','中場硬度不夠'],
    history:'7次歐冠冠軍，2022/23四強'
  },
  'NAP': {
    name:'Napoli', nameCN:'拿坡里', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/SSC_Napoli_2025_%28white_and_azure%29.svg/80px-SSC_Napoli_2025_%28white_and_azure%29.svg.png', pot:2, league:'Serie A',
    uefaCoeff:68, coach:'Antonio Conte', formation:'3-4-2-1',
    keyPlayers:[
      {name:'Victor Osimhen',pos:'中鋒',club:'拿坡里'},
      {name:'Khvicha Kvaratskhelia',pos:'左翼',club:'拿坡里'},
      {name:'Stanislav Lobotka',pos:'中場',club:'拿坡里'},
      {name:'Kim Min-jae',pos:'中後衛',club:'拿坡里'},
      {name:'Alex Meret',pos:'門將',club:'拿坡里'}
    ],
    radar:{attack:86,defense:82,midfield:84,speed:86,experience:72},
    style:'Conte式鐵血防守，快速轉換進攻',
    strengths:['Osimhen身體素質與跑位頂級','Kvara盤帶突破犀利','Conte大賽執教經驗'],
    weaknesses:['2023/24賽季信心受創','陣容磨合需要時間','歐冠淘汰賽經驗不足'],
    history:'歐冠最佳成績2022/23八強，隊史首次'
  },
  'CHE': {
    name:'Chelsea', nameCN:'乂爾西', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/80px-Chelsea_FC.svg.png', pot:2, league:'Premier League',
    uefaCoeff:66, coach:'Enzo Maresca', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Cole Palmer',pos:'攻擊中場/右翼',club:'乂爾西'},
      {name:'Nicolas Jackson',pos:'中鋒',club:'乂爾西'},
      {name:'Enzo Fernández',pos:'中場',club:'乂爾西'},
      {name:'Moisés Caicedo',pos:'防守中場',club:'乂爾西'},
      {name:'Robert Sánchez',pos:'門將',club:'乂爾西'}
    ],
    radar:{attack:84,defense:78,midfield:82,speed:84,experience:70},
    style:'控球推進，年輕化快速足球',
    strengths:['Palmer創造力與進球能力頂級','年輕陣容充滿活力','中場Caicedo+Enzo組合強悍'],
    weaknesses:['陣容過於年輕缺乏經驗','防守穩定性不足','新教練體系磨合中'],
    history:'2020/21歐冠冠軍，2次奪冠（2012、2021）'
  },
  'MON': {
    name:'AS Monaco', nameCN:'摩納哥', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/c/cf/LogoASMonacoFC2021.svg/80px-LogoASMonacoFC2021.svg.png', pot:2, league:'Ligue 1',
    uefaCoeff:34, coach:'Adi Hütter', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Wissam Ben Yedder',pos:'前鋒',club:'摩納哥'},
      {name:'Aleksandr Golovin',pos:'攻擊中場',club:'摩納哥'},
      {name:'Youssouf Fofana',pos:'中場',club:'摩納哥'},
      {name:'Vanderson',pos:'右後衛',club:'摩納哥'},
      {name:'Philipp Köhn',pos:'門將',club:'摩納哥'}
    ],
    radar:{attack:78,defense:74,midfield:78,speed:82,experience:62},
    style:'年輕快速，反擊為主，培養新星',
    strengths:['球員速度快','青訓與轉賣模式成熟','Hütter戰術紀律好'],
    weaknesses:['歐冠經驗嚴重不足','關鍵球員隨時可能離隊','整體實力與頂級隊伍有差距'],
    history:'2016/17歐冠四強，Mbappé成名之地'
  },

  // ===== POT 3 =====
  'SCP': {
    name:'Sporting CP', nameCN:'里斯本競技', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/9/95/Sporting_CP_crest.svg/80px-Sporting_CP_crest.svg.png', pot:3, league:'Liga Portugal',
    uefaCoeff:54, coach:'Rúben Amorim', formation:'3-4-3',
    keyPlayers:[
      {name:'Viktor Gyökeres',pos:'中鋒',club:'里斯本競技'},
      {name:'Pedro Gonçalves',pos:'攻擊中場',club:'里斯本競技'},
      {name:'Hidemasa Morita',pos:'中場',club:'里斯本競技'},
      {name:'Sebastián Coates',pos:'中後衛',club:'里斯本競技'},
      {name:'Franco Israel',pos:'門將',club:'里斯本競技'}
    ],
    radar:{attack:84,defense:78,midfield:80,speed:84,experience:68},
    style:'三後衛高壓體系，Gyökeres為進攻核心',
    strengths:['Gyökeres進球效率驚人','Amorim戰術體系獨特','葡超統治力帶來信心'],
    weaknesses:['歐冠淘汰賽經驗不足','球員被挖角風險高','板凳深度有限'],
    history:'歐冠最佳成績2008/09十六強'
  },
  'PSV': {
    name:'PSV Eindhoven', nameCN:'PSV恩荷芬', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/PSV_Eindhoven.svg/80px-PSV_Eindhoven.svg.png', pot:3, league:'Eredivisie',
    uefaCoeff:52, coach:'Peter Bosz', formation:'4-3-3',
    keyPlayers:[
      {name:'Johan Bakayoko',pos:'右翼',club:'PSV恩荷芬'},
      {name:'Luuk de Jong',pos:'中鋒',club:'PSV恩荷芬'},
      {name:'Malik Tillman',pos:'攻擊中場',club:'PSV恩荷芬'},
      {name:'Jerdy Schouten',pos:'中場',club:'PSV恩荷芬'},
      {name:'Walter Benítez',pos:'門將',club:'PSV恩荷芬'}
    ],
    radar:{attack:80,defense:74,midfield:78,speed:82,experience:66},
    style:'荷蘭全攻全守，控球進攻為主',
    strengths:['Bakayoko速度與技術出色','荷甲冠軍帶來信心','整體配合流暢'],
    weaknesses:['歐冠對陣頂級球隊經驗不足','防守強度不夠','關鍵球員可能被挖角'],
    history:'1987/88歐冠冠軍，近年重返歐冠'
  },
  'FEY': {
    name:'Feyenoord', nameCN:'飛燕諾', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Feyenoord_logo_since_2024.svg/80px-Feyenoord_logo_since_2024.svg.png', pot:3, league:'Eredivisie',
    uefaCoeff:46, coach:'Brian Priske', formation:'4-3-3',
    keyPlayers:[
      {name:'Santiago Giménez',pos:'中鋒',club:'飛燕諾'},
      {name:'Quinten Timber',pos:'中場',club:'飛燕諾'},
      {name:'Igor Paixão',pos:'翼鋒',club:'飛燕諾'},
      {name:'Lutsharel Geertruida',pos:'右後衛',club:'飛燕諾'},
      {name:'Justin Bijlow',pos:'門將',club:'飛燕諾'}
    ],
    radar:{attack:80,defense:74,midfield:76,speed:80,experience:64},
    style:'快速直接，前場壓迫，邊路進攻',
    strengths:['Giménez進球效率高','De Kuip主場氣氛強烈','團隊拼搏精神'],
    weaknesses:['歐冠經驗淺','陣容深度不如五大聯賽','防守端穩定性差'],
    history:'1969/70歐冠冠軍，2022/23重返歐冠'
  },
  'CEL': {
    name:'Celtic', nameCN:'塞爾提克', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Celtic_FC_crest.svg/80px-Celtic_FC_crest.svg.png', pot:3, league:'Scottish Premiership',
    uefaCoeff:32, coach:'Brendan Rodgers', formation:'4-3-3',
    keyPlayers:[
      {name:'Kyogo Furuhashi',pos:'中鋒',club:'塞爾提克'},
      {name:'Matt O\'Riley',pos:'攻擊中場',club:'塞爾提克'},
      {name:'Reo Hatate',pos:'中場',club:'塞爾提克'},
      {name:'Cameron Carter-Vickers',pos:'中後衛',club:'塞爾提克'},
      {name:'Joe Hart',pos:'門將',club:'塞爾提克'}
    ],
    radar:{attack:76,defense:70,midfield:74,speed:78,experience:68},
    style:'積極控球，高位壓迫，快速傳切',
    strengths:['Celtic Park主場氣氛狂熱','Rodgers戰術組織能力','球隊團結與拼搏精神'],
    weaknesses:['蘇超強度與歐冠差距大','個人能力與頂級球隊有差距','歐冠小組賽成績差'],
    history:'1966/67歐冠冠軍（里斯本雄獅），歷史悠久'
  },
  'AVL': {
    name:'Aston Villa', nameCN:'阿斯頓維拉', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Aston_Villa_FC_new_crest.svg/80px-Aston_Villa_FC_new_crest.svg.png', pot:3, league:'Premier League',
    uefaCoeff:30, coach:'Unai Emery', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Ollie Watkins',pos:'中鋒',club:'阿斯頓維拉'},
      {name:'Moussa Diaby',pos:'右翼',club:'阿斯頓維拉'},
      {name:'John McGinn',pos:'中場',club:'阿斯頓維拉'},
      {name:'Pau Torres',pos:'中後衛',club:'阿斯頓維拉'},
      {name:'Emiliano Martínez',pos:'門將',club:'阿斯頓維拉'}
    ],
    radar:{attack:82,defense:80,midfield:80,speed:82,experience:68},
    style:'Emery式高壓，快速轉換，邊路交叉',
    strengths:['Emery歐戰經驗豐富','Martínez門將位置頂級','Watkins進球穩定'],
    weaknesses:['歐冠經驗極度缺乏','雙線作戰體能挑戰','陣容深度仍有提升空間'],
    history:'1981/82歐冠冠軍，時隔40年重返歐冠'
  },
  'NEW': {
    name:'Newcastle United', nameCN:'紐卡索聯', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Newcastle_United_Logo.svg/80px-Newcastle_United_Logo.svg.png', pot:3, league:'Premier League',
    uefaCoeff:28, coach:'Eddie Howe', formation:'4-3-3',
    keyPlayers:[
      {name:'Alexander Isak',pos:'中鋒',club:'紐卡索聯'},
      {name:'Bruno Guimarães',pos:'中場',club:'紐卡索聯'},
      {name:'Anthony Gordon',pos:'左翼',club:'紐卡索聯'},
      {name:'Sven Botman',pos:'中後衛',club:'紐卡索聯'},
      {name:'Nick Pope',pos:'門將',club:'紐卡索聯'}
    ],
    radar:{attack:84,defense:82,midfield:82,speed:84,experience:62},
    style:'快速直接，強力衝擊，堅實防守',
    strengths:['Isak禁區內頂級終結者','Bruno中場組織核心','St. James\' Park主場氣勢'],
    weaknesses:['歐冠經驗幾乎為零','傷病陣容管理挑戰','面對頂級球隊戰術應變不足'],
    history:'歐冠最佳成績2002/03小組賽出線'
  },
  'STU': {
    name:'VfB Stuttgart', nameCN:'斯圖加特', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/VfB_Stuttgart_1893_Logo.svg/80px-VfB_Stuttgart_1893_Logo.svg.png', pot:3, league:'Bundesliga',
    uefaCoeff:26, coach:'Sebastian Hoeneß', formation:'3-4-2-1',
    keyPlayers:[
      {name:'Serhou Guirassy',pos:'中鋒',club:'斯圖加特'},
      {name:'Chris Führich',pos:'翼鋒',club:'斯圖加特'},
      {name:'Enzo Millot',pos:'攻擊中場',club:'斯圖加特'},
      {name:'Waldemar Anton',pos:'中後衛',club:'斯圖加特'},
      {name:'Alexander Nübel',pos:'門將',club:'斯圖加特'}
    ],
    radar:{attack:80,defense:76,midfield:78,speed:80,experience:58},
    style:'三後衛進攻足球，高位壓迫',
    strengths:['Guirassy德甲頂級射手','整體戰術執行力強','年輕球員衝勁十足'],
    weaknesses:['歐冠新兵缺乏經驗','板凳深度不足','雙線作戰體能考驗'],
    history:'歐冠最佳成績2009/10十六強'
  },
  'LIL': {
    name:'LOSC Lille', nameCN:'里爾', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/3/3f/Lille_OSC_2018_logo.svg/80px-Lille_OSC_2018_logo.svg.png', pot:3, league:'Ligue 1',
    uefaCoeff:36, coach:'Paulo Fonseca', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Jonathan David',pos:'中鋒',club:'里爾'},
      {name:'Rémy Cabella',pos:'攻擊中場',club:'里爾'},
      {name:'Tiago Santos',pos:'右後衛',club:'里爾'},
      {name:'Leny Yoro',pos:'中後衛',club:'里爾'},
      {name:'Lucas Chevalier',pos:'門將',club:'里爾'}
    ],
    radar:{attack:78,defense:76,midfield:76,speed:80,experience:64},
    style:'務實防守反擊，青訓出品',
    strengths:['Jonathan David進球效率高','Chevalier潛力門將','團隊防守紀律好'],
    weaknesses:['球星流失嚴重','聯賽環境競爭力不如英超','整體陣容厚度不夠'],
    history:'2020/21歐冠十六強，法甲黑馬'
  },
  'MAR': {
    name:'Olympique Marseille', nameCN:'馬賽', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Olympique_Marseille_logo.svg/80px-Olympique_Marseille_logo.svg.png', pot:3, league:'Ligue 1',
    uefaCoeff:38, coach:'Roberto De Zerbi', formation:'3-4-3',
    keyPlayers:[
      {name:'Pierre-Emerick Aubameyang',pos:'前鋒',club:'馬賽'},
      {name:'Amine Harit',pos:'攻擊中場',club:'馬賽'},
      {name:'Jordan Veretout',pos:'中場',club:'馬賽'},
      {name:'Samuel Gigot',pos:'中後衛',club:'馬賽'},
      {name:'Pau López',pos:'門將',club:'馬賽'}
    ],
    radar:{attack:80,defense:74,midfield:78,speed:82,experience:72},
    style:'De Zerbi控球哲學，從後場建構進攻',
    strengths:['De Zerbi戰術體系吸引人','Vélodrome主場瘋狂','球員求勝慾望強'],
    weaknesses:['陣容穩定性差','歐冠近年表現糟糕','後防易被快速反擊擊穿'],
    history:'1992/93歐冠冠軍，法國唯一奪冠球隊'
  },

  // ===== POT 4 =====
  'BRU': {
    name:'Club Brugge', nameCN:'布魯日', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/d/d0/Club_Brugge_KV_logo.svg/80px-Club_Brugge_KV_logo.svg.png', pot:4, league:'Jupiler Pro League',
    uefaCoeff:42, coach:'Nicky Hayen', formation:'4-3-3',
    keyPlayers:[
      {name:'Andreas Skov Olsen',pos:'右翼',club:'布魯日'},
      {name:'Hugo Vetlesen',pos:'中場',club:'布魯日'},
      {name:'Hans Vanaken',pos:'攻擊中場',club:'布魯日'},
      {name:'Brandon Mechele',pos:'中後衛',club:'布魯日'},
      {name:'Simon Mignolet',pos:'門將',club:'布魯日'}
    ],
    radar:{attack:74,defense:74,midfield:74,speed:76,experience:72},
    style:'比利時傳統控球，穩健務實',
    strengths:['Vanaken大賽經驗豐富','Mignolet門將穩定','比甲霸主信心足'],
    weaknesses:['歐冠實力差距明顯','球員個人能力有限','面對強隊難以控球'],
    history:'歐冠最佳成績2022/23十六強'
  },
  'SHA': {
    name:'Shakhtar Donetsk', nameCN:'頓內茨克礦工', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/a/a1/FC_Shakhtar_Donetsk.svg/80px-FC_Shakhtar_Donetsk.svg.png', pot:4, league:'Ukrainian Premier League',
    uefaCoeff:48, coach:'Marino Pušić', formation:'4-1-4-1',
    keyPlayers:[
      {name:'Georgiy Sudakov',pos:'攻擊中場',club:'頓內茨克礦工'},
      {name:'Kevin',pos:'翼鋒',club:'頓內茨克礦工'},
      {name:'Marlon Gomes',pos:'中場',club:'頓內茨克礦工'},
      {name:'Dmytro Riznyk',pos:'門將',club:'頓內茨克礦工'},
      {name:'Valeriy Bondar',pos:'中後衛',club:'頓內茨克礦工'}
    ],
    radar:{attack:76,defense:72,midfield:76,speed:78,experience:72},
    style:'巴西球員為骨幹，技術流控球',
    strengths:['Sudakov是烏克蘭最佳新星','巴西球員技術好','歐冠常客經驗豐富'],
    weaknesses:['戰爭影響無法使用主場','球員心理壓力大','陣容流失嚴重'],
    history:'歐冠常客，最佳成績2010/11八強'
  },
  'POR': {
    name:'Porto', nameCN:'波爾圖', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/f/f1/FC_Porto.svg/80px-FC_Porto.svg.png', pot:4, league:'Liga Portugal',
    uefaCoeff:56, coach:'Vítor Bruno', formation:'4-4-2',
    keyPlayers:[
      {name:'Galeno',pos:'左翼',club:'波爾圖'},
      {name:'Mehdi Taremi',pos:'前鋒',club:'波爾圖'},
      {name:'Alan Varela',pos:'中場',club:'波爾圖'},
      {name:'Pepe',pos:'中後衛',club:'波爾圖'},
      {name:'Diogo Costa',pos:'門將',club:'波爾圖'}
    ],
    radar:{attack:80,defense:78,midfield:78,speed:80,experience:80},
    style:'務實強悍，定位球戰術精準',
    strengths:['Diogo Costa門將位置出色','葡超經驗豐富','主場龍之巢氣勢足'],
    weaknesses:['球星持續外流','財力不如五大聯賽球隊','近年歐冠成績下滑'],
    history:'2次歐冠冠軍（1987、2004），2003/04 Mourinho率隊奪冠'
  },
  'AJA': {
    name:'Ajax', nameCN:'阿賈克斯', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Logo_AFC_Ajax_%281928-1991%2C_2025-%29.png/80px-Logo_AFC_Ajax_%281928-1991%2C_2025-%29.png', pot:4, league:'Eredivisie',
    uefaCoeff:44, coach:'Francesco Farioli', formation:'4-3-3',
    keyPlayers:[
      {name:'Brian Brobbey',pos:'中鋒',club:'阿賈克斯'},
      {name:'Steven Bergwijn',pos:'翼鋒',club:'阿賈克斯'},
      {name:'Kenneth Taylor',pos:'中場',club:'阿賈克斯'},
      {name:'Jorrel Hato',pos:'左後衛',club:'阿賈克斯'},
      {name:'Remko Pasveer',pos:'門將',club:'阿賈克斯'}
    ],
    radar:{attack:78,defense:72,midfield:76,speed:80,experience:72},
    style:'全攻全守Cruyff哲學，青訓為本',
    strengths:['Johan Cruyff Arena主場','青訓持續產出','荷蘭足球DNA'],
    weaknesses:['近年競爭力大幅下滑','球星流失嚴重','歐冠小組賽表現不穩'],
    history:'4次歐冠冠軍，2018/19四強驚奇之旅'
  },
  'GAL': {
    name:'Galatasaray', nameCN:'加拉塔薩雷', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Galatasaray_S.K._Logo_2026_5-stars.svg/80px-Galatasaray_S.K._Logo_2026_5-stars.svg.png', pot:4, league:'Süper Lig',
    uefaCoeff:40, coach:'Okan Buruk', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Mauro Icardi',pos:'中鋒',club:'加拉塔薩雷'},
      {name:'Dries Mertens',pos:'前鋒/攻擊中場',club:'加拉塔薩雷'},
      {name:'Hakim Ziyech',pos:'右翼',club:'加拉塔薩雷'},
      {name:'Davinson Sánchez',pos:'中後衛',club:'加拉塔薩雷'},
      {name:'Fernando Muslera',pos:'門將',club:'加拉塔薩雷'}
    ],
    radar:{attack:80,defense:74,midfield:78,speed:78,experience:78},
    style:'球星驅動，狂熱主場，攻勢足球',
    strengths:['Türk Telekom Arena主場瘋狂','經驗豐富的外援','球迷第12人效應'],
    weaknesses:['客場戰力大幅下降','防守紀律性不足','陣容年齡偏大'],
    history:'歐冠最佳成績2000/01八強'
  },
  'SAL': {
    name:'Red Bull Salzburg', nameCN:'薩爾茨堡紅牛', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/7/77/FC_Red_Bull_Salzburg_logo.svg/80px-FC_Red_Bull_Salzburg_logo.svg.png', pot:4, league:'Austrian Bundesliga',
    uefaCoeff:38, coach:'Pepijn Lijnders', formation:'4-4-2',
    keyPlayers:[
      {name:'Oscar Gloukh',pos:'攻擊中場',club:'薩爾茨堡紅牛'},
      {name:'Karim Konaté',pos:'前鋒',club:'薩爾茨堡紅牛'},
      {name:'Amar Dedić',pos:'右後衛',club:'薩爾茨堡紅牛'},
      {name:'Strahinja Pavlović',pos:'中後衛',club:'薩爾茨堡紅牛'},
      {name:'Janis Blaswich',pos:'門將',club:'薩爾茨堡紅牛'}
    ],
    radar:{attack:76,defense:72,midfield:74,speed:82,experience:56},
    style:'紅牛系高壓逼搶，快速轉換',
    strengths:['Red Bull體系培養年輕球員','高壓戰術令對手不適','球員速度快'],
    weaknesses:['每季核心流失','奧超實力差距太大','歐冠成績起伏不定'],
    history:'歐冠常客，最佳成績2021/22十六強'
  },
  'DZA': {
    name:'Dinamo Zagreb', nameCN:'薩格勒布迪納摩', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Logo_GNK_Dinamo_Zagreb_%282019%29.svg/80px-Logo_GNK_Dinamo_Zagreb_%282019%29.svg.png', pot:4, league:'HNL',
    uefaCoeff:36, coach:'Sergej Jakirović', formation:'4-3-3',
    keyPlayers:[
      {name:'Bruno Petković',pos:'前鋒',club:'薩格勒布迪納摩'},
      {name:'Arijan Ademi',pos:'中場',club:'薩格勒布迪納摩'},
      {name:'Martin Baturina',pos:'攻擊中場',club:'薩格勒布迪納摩'},
      {name:'Sadegh Moharrami',pos:'右後衛',club:'薩格勒布迪納摩'},
      {name:'Dominik Livaković',pos:'門將',club:'薩格勒布迪納摩'}
    ],
    radar:{attack:74,defense:70,midfield:72,speed:76,experience:70},
    style:'克羅埃西亞技術流，快速傳切',
    strengths:['Livaković門將表現穩定','Baturina年輕有潛力','主場優勢'],
    weaknesses:['整體實力與五大聯賽差距大','歐冠小組賽常墊底','球員持續外流'],
    history:'歐冠常客，最佳成績1998/99八強'
  },
  'BRE': {
    name:'Stade Brestois', nameCN:'布雷斯特', flag:'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Stade_Brestois_29_logo.svg/80px-Stade_Brestois_29_logo.svg.png', pot:4, league:'Ligue 1',
    uefaCoeff:18, coach:'Éric Roy', formation:'4-3-3',
    keyPlayers:[
      {name:'Martin Satriano',pos:'前鋒',club:'布雷斯特'},
      {name:'Hugo Magnetti',pos:'中場',club:'布雷斯特'},
      {name:'Pierre Lees-Melou',pos:'中場',club:'布雷斯特'},
      {name:'Brendan Chardonnet',pos:'中後衛',club:'布雷斯特'},
      {name:'Marco Bizot',pos:'門將',club:'布雷斯特'}
    ],
    radar:{attack:72,defense:72,midfield:72,speed:76,experience:52},
    style:'團隊足球，務實防守，快速反擊',
    strengths:['黑馬精神毫無壓力','團隊凝聚力強','教練戰術安排務實'],
    weaknesses:['歐冠完全沒有經驗','球員個人能力有限','財力在歐冠最低'],
    history:'隊史首次參加歐冠，法甲驚奇黑馬'
  },
  'LEI': {
    name:'Bologna', nameCN:'博洛尼亞', flag:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Bologna_F.C._1909_logo.svg/80px-Bologna_F.C._1909_logo.svg.png', pot:4, league:'Serie A',
    uefaCoeff:20, coach:'Vincenzo Italiano', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Joshua Zirkzee',pos:'前鋒',club:'博洛尼亞'},
      {name:'Lewis Ferguson',pos:'中場',club:'博洛尼亞'},
      {name:'Riccardo Orsolini',pos:'右翼',club:'博洛尼亞'},
      {name:'Sam Beukema',pos:'中後衛',club:'博洛尼亞'},
      {name:'Łukasz Skorupski',pos:'門將',club:'博洛尼亞'}
    ],
    radar:{attack:76,defense:76,midfield:76,speed:78,experience:54},
    style:'意式務實足球，快速轉換進攻',
    strengths:['Italiano帶來攻勢足球','Ferguson中場核心穩定','團隊戰術執行力好'],
    weaknesses:['歐冠零經驗','球星可能被挖走','面對頂級球隊信心不足'],
    history:'隊史首次參加歐冠，2023/24義甲第五名'
  }
};

// 導出供 tournament.js 使用
if (typeof window !== 'undefined') window.UCL_TEAMS = UCL_TEAMS;
