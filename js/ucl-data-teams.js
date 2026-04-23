/* =============================================
   UCL-DATA-TEAMS.JS — 2025/26 歐冠聯賽 36支球隊資料
   UEFA係數：2025/26 抽籤時官方五年係數（Wikipedia league phase table）
   資料截止：2025/26賽季
   ============================================= */

const UCL_TEAMS = {

  // ===== POT 1 =====
  'PSG': {
    name:'Paris Saint-Germain', nameCN:'巴黎聖日耳曼', flag:'https://crests.football-data.org/524.png', pot:1, league:'Ligue 1',
    uefaCoeff:118.5, coach:'Luis Enrique', formation:'4-3-3',
    keyPlayers:[
      {name:'Ousmane Dembélé',pos:'右翼',club:'巴黎聖日耳曼'},
      {name:'Khvicha Kvaratskhelia',pos:'左翼',club:'巴黎聖日耳曼'},
      {name:'Vitinha',pos:'中場',club:'巴黎聖日耳曼'},
      {name:'Achraf Hakimi',pos:'右後衛',club:'巴黎聖日耳曼'},
      {name:'Lucas Chevalier',pos:'門將',club:'巴黎聖日耳曼'}
    ],
    radar:{attack:88,defense:83,midfield:87,speed:90,experience:82},
    style:'高控球率，邊路突破，團隊足球',
    strengths:['Dembélé+Kvaratskhelia雙翼突破犀利','Luis Enrique戰術體系清晰','年輕陣容潛力大'],
    weaknesses:['Kvaratskhelia體系融合仍在進行','歐冠決賽經驗不足','關鍵戰抗壓能力存疑'],
    history:'2019/20首進歐冠決賽，歷史最佳成績亞軍',
    injuries:[
      {name:'Fabián Ruiz',pos:'中場',status:'膝傷',returnDate:'未定'},
      {name:'Nuno Mendes',pos:'左後衛',status:'肌肉傷（QF次回合退場）',returnDate:'評估中'},
      {name:'Désiré Doué',pos:'翼鋒',status:'碰撞傷（QF次回合退場）',returnDate:'評估中'}
    ]
  },
  'RMA': {
    name:'Real Madrid', nameCN:'皇家馬德里', flag:'https://crests.football-data.org/86.png', pot:1, league:'La Liga',
    uefaCoeff:143.5, coach:'Álvaro Arbeloa', formation:'4-3-1-2',
    keyPlayers:[
      {name:'Jude Bellingham',pos:'攻擊中場',club:'皇家馬德里'},
      {name:'Vinícius Jr.',pos:'左翼',club:'皇家馬德里'},
      {name:'Kylian Mbappé',pos:'前鋒',club:'皇家馬德里'},
      {name:'Aurélien Tchouaméni',pos:'防守中場',club:'皇家馬德里'},
      {name:'Thibaut Courtois',pos:'門將',club:'皇家馬德里'}
    ],
    radar:{attack:96,defense:88,midfield:93,speed:94,experience:98},
    style:'控球為主，快速反擊，個人能力突破',
    strengths:['Mbappé+Vinícius雙翼極速','歐冠DNA，大賽經驗無人能及','Bellingham關鍵時刻爆發力'],
    weaknesses:['後防老化隱憂','中場節奏控制偶有失衡','板凳深度相對薄弱'],
    history:'歐冠史上最成功球隊，15次奪冠，2023/24衛冕冠軍',
    injuries:[
      {name:'Rodrygo',pos:'右翼',status:'右膝前十字韌帶斷裂+半月板',returnDate:'賽季報銷'},
      {name:'Thibaut Courtois',pos:'門將',status:'右腿傷勢',returnDate:'四月底至五月初'},
      {name:'Dani Ceballos',pos:'中場',status:'小腿傷',returnDate:'四月下旬'}
    ]
  },
  'MCI': {
    name:'Manchester City', nameCN:'曼城', flag:'https://crests.football-data.org/65.png', pot:1, league:'Premier League',
    uefaCoeff:137.75, coach:'Pep Guardiola', formation:'4-3-3',
    keyPlayers:[
      {name:'Erling Haaland',pos:'中鋒',club:'曼城'},
      {name:'Tijjani Reijnders',pos:'中場',club:'曼城'},
      {name:'Rayan Cherki',pos:'攻擊中場',club:'曼城'},
      {name:'Phil Foden',pos:'翼鋒/中場',club:'曼城'},
      {name:'Gianluigi Donnarumma',pos:'門將',club:'曼城'}
    ],
    radar:{attack:95,defense:90,midfield:95,speed:88,experience:90},
    style:'極致控球，位置輪轉，高位壓迫',
    strengths:['Haaland禁區終結能力頂級','Guardiola戰術體系成熟','中場控制力聯賽最強'],
    weaknesses:['Rodri傷癒後狀態仍在回升','新援（Reijnders/Cherki）大賽經驗有限','後防傷兵影響輪替'],
    history:'2022/23首奪歐冠，近年穩定進入八強以上',
    injuries:[
      {name:'Joško Gvardiol',pos:'後衛',status:'脛骨骨折術後',returnDate:'賽季末'},
      {name:'Rúben Dias',pos:'中後衛',status:'腳踝傷勢',returnDate:'四月底（本月報銷）'},
      {name:'John Stones',pos:'中後衛',status:'小腿傷',returnDate:'恢復中'},
      {name:'Rodri',pos:'防守中場',status:'腹股溝傷（vs 兵工廠 88 分鐘退場）',returnDate:'檢查中，可能缺陣 1-6 週'}
    ]
  },
  'BAY': {
    name:'Bayern Munich', nameCN:'拜仁慕尼黑', flag:'https://crests.football-data.org/5.png', pot:1, league:'Bundesliga',
    uefaCoeff:135.25, coach:'Vincent Kompany', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Harry Kane',pos:'中鋒',club:'拜仁慕尼黑'},
      {name:'Jamal Musiala',pos:'攻擊中場',club:'拜仁慕尼黑'},
      {name:'Michael Olise',pos:'右翼',club:'拜仁慕尼黑'},
      {name:'Joshua Kimmich',pos:'中場/右後衛',club:'拜仁慕尼黑'},
      {name:'Manuel Neuer',pos:'門將',club:'拜仁慕尼黑'}
    ],
    radar:{attack:93,defense:87,midfield:90,speed:88,experience:95},
    style:'高位壓迫，邊路進攻，中路滲透',
    strengths:['Kane進球效率驚人','Musiala創造力頂級','德甲統治力保證信心'],
    weaknesses:['後防重建期不穩定','Kompany歐冠執教經驗不足','高線防守易被反擊'],
    history:'6次歐冠冠軍，2019/20最近一次奪冠',
    injuries:[
      {name:'Lennart Karl',pos:'前鋒',status:'右大腿肌肉撕裂',returnDate:'未定'},
      {name:'Serge Gnabry',pos:'翼鋒',status:'右大腿內收肌撕裂',returnDate:'賽季報銷（確定缺席世界盃）'}
    ]
  },
  'LIV': {
    name:'Liverpool', nameCN:'利物浦', flag:'https://crests.football-data.org/64.png', pot:1, league:'Premier League',
    uefaCoeff:125.5, coach:'Arne Slot', formation:'4-3-3',
    keyPlayers:[
      {name:'Mohamed Salah',pos:'右翼',club:'利物浦'},
      {name:'Virgil van Dijk',pos:'中後衛',club:'利物浦'},
      {name:'Florian Wirtz',pos:'攻擊中場',club:'利物浦'},
      {name:'Alexander Isak',pos:'中鋒',club:'利物浦'},
      {name:'Alisson',pos:'門將',club:'利物浦'}
    ],
    radar:{attack:91,defense:89,midfield:88,speed:90,experience:90},
    style:'高強度壓迫，快速轉換，邊路交叉',
    strengths:['Salah依然是頂級得分手','Van Dijk後防領袖','Slot帶來新戰術活力'],
    weaknesses:['陣容老化需要更新換代','Slot歐冠執教經驗有限','板凳深度不如曼城'],
    history:'6次歐冠冠軍，2018/19最近一次奪冠',
    injuries:[
      {name:'Alisson',pos:'門將',status:'傷勢恢復中',returnDate:'未定'},
      {name:'Wataru Endo',pos:'中場',status:'足部傷勢',returnDate:'賽季報銷'},
      {name:'Conor Bradley',pos:'右後衛',status:'長期傷缺',returnDate:'賽季報銷'}
    ]
  },
  'INT': {
    name:'Inter Milan', nameCN:'國際米蘭', flag:'https://crests.football-data.org/108.png', pot:1, league:'Serie A',
    uefaCoeff:116.25, coach:'Cristian Chivu', formation:'3-5-2',
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
  'CHE': {
    name:'Chelsea', nameCN:'乂爾西', flag:'https://crests.football-data.org/61.png', pot:1, league:'Premier League',
    uefaCoeff:109, coach:'Liam Rosenior', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Cole Palmer',pos:'攻擊中場/右翼',club:'乂爾西'},
      {name:'Enzo Fernández',pos:'中場',club:'乂爾西'},
      {name:'Moisés Caicedo',pos:'防守中場',club:'乂爾西'},
      {name:'Reece James',pos:'右後衛',club:'乂爾西'},
      {name:'Robert Sánchez',pos:'門將',club:'乂爾西'}
    ],
    radar:{attack:84,defense:78,midfield:82,speed:84,experience:70},
    style:'控球推進，年輕化快速足球',
    strengths:['Palmer創造力與進球能力頂級','年輕陣容充滿活力','中場Caicedo+Enzo組合強悍'],
    weaknesses:['陣容過於年輕缺乏經驗','防守穩定性不足','新教練體系磨合中'],
    history:'2020/21歐冠冠軍，2次奪冠（2012、2021）'
  },
  'DOR': {
    name:'Borussia Dortmund', nameCN:'多特蒙德', flag:'https://crests.football-data.org/4.png', pot:1, league:'Bundesliga',
    uefaCoeff:106.75, coach:'Niko Kovac', formation:'4-2-3-1',
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
    name:'FC Barcelona', nameCN:'巴塞隆納', flag:'https://crests.football-data.org/81.png', pot:1, league:'La Liga',
    uefaCoeff:103.25, coach:'Hansi Flick', formation:'4-3-3',
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

  // ===== POT 2 =====
  'ARS': {
    name:'Arsenal', nameCN:'兵工廠', flag:'https://crests.football-data.org/57.png', pot:2, league:'Premier League',
    uefaCoeff:98, coach:'Mikel Arteta', formation:'4-3-3',
    keyPlayers:[
      {name:'Bukayo Saka',pos:'右翼',club:'兵工廠'},
      {name:'Martin Ødegaard',pos:'攻擊中場',club:'兵工廠'},
      {name:'Viktor Gyökeres',pos:'前鋒',club:'兵工廠'},
      {name:'William Saliba',pos:'中後衛',club:'兵工廠'},
      {name:'David Raya',pos:'門將',club:'兵工廠'}
    ],
    radar:{attack:92,defense:90,midfield:90,speed:88,experience:78},
    style:'高位壓迫，定位球戰術強，控球推進',
    strengths:['Saka+Ødegaard右路連線致命','Gyökeres鋒線終結力頂級','Saliba後防磐石'],
    weaknesses:['歐冠經驗相對不足','Gyökeres體系融合仍在進行','面對低位防守時創造力不足'],
    history:'2005/06歐冠亞軍，近年重返歐冠行列',
    injuries:[
      {name:'Bukayo Saka',pos:'右翼',status:'阿基里斯腱問題',returnDate:'持續評估中'},
      {name:'Jurrien Timber',pos:'後衛',status:'腳踝傷勢（缺陣超過一個月）',returnDate:'存疑'},
      {name:'Riccardo Calafiori',pos:'左後衛',status:'不明傷勢',returnDate:'存疑'},
      {name:'Mikel Merino',pos:'中場',status:'長期傷缺',returnDate:'賽季報銷'},
      {name:'Noni Madueke',pos:'右翼',status:'膝傷（QF次回合退場）',returnDate:'評估中'}
    ]
  },
  'LEV': {
    name:'Bayer Leverkusen', nameCN:'勒沃庫森', flag:'https://crests.football-data.org/3.png', pot:2, league:'Bundesliga',
    uefaCoeff:95.25, coach:'Kasper Hjulmand', formation:'3-4-2-1',
    keyPlayers:[
      {name:'Patrik Schick',pos:'前鋒',club:'勒沃庫森'},
      {name:'Alejandro Grimaldo',pos:'左後衛',club:'勒沃庫森'},
      {name:'Edmond Tapsoba',pos:'中後衛',club:'勒沃庫森'},
      {name:'Aleix García',pos:'中場',club:'勒沃庫森'},
      {name:'Lukáš Hrádecký',pos:'門將',club:'勒沃庫森'}
    ],
    radar:{attack:82,defense:82,midfield:83,speed:82,experience:75},
    style:'Hjulmand接手後體系重整，注重防守紀律',
    strengths:['Schick進球穩定','Grimaldo定位球專家','歐戰底蘊尚在'],
    weaknesses:['失去Wirtz+Alonso後戰力下滑','教練三度更替影響穩定性','板凳深度有限'],
    history:'2023/24德甲不敗冠軍，歐冠最佳成績2001/02亞軍'
  },
  'ATM': {
    name:'Atlético Madrid', nameCN:'馬德里競技', flag:'https://crests.football-data.org/78.png', pot:2, league:'La Liga',
    uefaCoeff:93.5, coach:'Diego Simeone', formation:'3-5-2',
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
    history:'2013/14、2015/16兩次歐冠亞軍',
    injuries:[
      {name:'David Hancko',pos:'後衛',status:'腳踝傷（QF首回合退場）',returnDate:'存疑'},
      {name:'Jan Oblak',pos:'門將',status:'腹部不適',returnDate:'評估中'},
      {name:'Pablo Barrios',pos:'中場',status:'大腿傷',returnDate:'存疑'},
      {name:'Johnny Cardoso',pos:'中場',status:'內收肌問題',returnDate:'評估中'}
    ]
  },
  'BEN': {
    name:'Benfica', nameCN:'本菲卡', flag:'https://crests.football-data.org/1903.png', pot:2, league:'Liga Portugal',
    uefaCoeff:87.75, coach:'José Mourinho', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Vangelis Pavlidis',pos:'前鋒',club:'本菲卡'},
      {name:'Fredrik Aursnes',pos:'中場',club:'本菲卡'},
      {name:'António Silva',pos:'中後衛',club:'本菲卡'},
      {name:'Kerem Aktürkoğlu',pos:'翼鋒',club:'本菲卡'},
      {name:'Anatoliy Trubin',pos:'門將',club:'本菲卡'}
    ],
    radar:{attack:80,defense:80,midfield:78,speed:80,experience:76},
    style:'Mourinho接手後強化防守紀律，伺機反擊',
    strengths:['Mourinho大賽經驗豐富','Pavlidis進球效率','主場氣氛火爆'],
    weaknesses:['每季主力被挖角','歐冠淘汰賽穩定性差','關鍵位置深度不足'],
    history:'2次歐冠冠軍（1961、1962），2022/23八強'
  },
  'ATA': {
    name:'Atalanta', nameCN:'亞特蘭大', flag:'https://crests.football-data.org/102.png', pot:2, league:'Serie A',
    uefaCoeff:82, coach:'Raffaele Palladino', formation:'3-4-1-2',
    keyPlayers:[
      {name:'Ademola Lookman',pos:'前鋒',club:'亞特蘭大'},
      {name:'Charles De Ketelaere',pos:'攻擊中場',club:'亞特蘭大'},
      {name:'Éderson',pos:'中場',club:'亞特蘭大'},
      {name:'Marten de Roon',pos:'中場',club:'亞特蘭大'},
      {name:'Marco Carnesecchi',pos:'門將',club:'亞特蘭大'}
    ],
    radar:{attack:84,defense:82,midfield:85,speed:84,experience:74},
    style:'高強度壓迫，人盯人防守，全攻全守',
    strengths:['Palladino延續三後衛體系','Lookman大賽爆發力強','團隊默契極佳'],
    weaknesses:['缺乏頂級個人能力','歐冠經驗較淺','板凳深度不足'],
    history:'2023/24歐聯冠軍，歐冠最佳成績2019/20八強'
  },
  'VIL': {
    name:'Villarreal', nameCN:'比利亞雷阿爾', flag:'img/villarreal.png', pot:2, league:'La Liga',
    uefaCoeff:82, coach:'Marcelino', formation:'4-4-2',
    keyPlayers:[{name:'Alexander Sørloth',pos:'前鋒',club:'比利亞雷阿爾'},{name:'Santi Comesaña',pos:'中場',club:'比利亞雷阿爾'},{name:'Juan Foyth',pos:'中後衛',club:'比利亞雷阿爾'},{name:'Dani Parejo',pos:'中場',club:'比利亞雷阿爾'},{name:'Diego Conde',pos:'門將',club:'比利亞雷阿爾'}],
    radar:{attack:78,defense:78,midfield:80,speed:78,experience:75},
    style:'技術流西班牙足球，中場控制為主',
    strengths:['西甲中場控制傳統','Parejo組織經驗豐富','團隊戰術紀律佳'],
    weaknesses:['缺乏頂級球星','歐冠經驗有限','面對強隊防守壓力大'],
    history:'2005/06歐冠四強，2020/21歐霸冠軍'
  },
  'JUV': {
    name:'Juventus', nameCN:'尤文圖斯', flag:'https://crests.football-data.org/109.png', pot:2, league:'Serie A',
    uefaCoeff:74.25, coach:'Luciano Spalletti', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Dušan Vlahović',pos:'中鋒',club:'尤文圖斯'},
      {name:'Teun Koopmeiners',pos:'攻擊中場',club:'尤文圖斯'},
      {name:'Manuel Locatelli',pos:'中場',club:'尤文圖斯'},
      {name:'Gleison Bremer',pos:'中後衛',club:'尤文圖斯'},
      {name:'Michele Di Gregorio',pos:'門將',club:'尤文圖斯'}
    ],
    radar:{attack:82,defense:84,midfield:80,speed:82,experience:88},
    style:'穩固防守，伺機反擊，注重戰術紀律',
    strengths:['義式防守DNA','Vlahović禁區終結力強','Spalletti帶來新風格'],
    weaknesses:['進攻流暢度不足','中場創造力缺乏','近年歐冠成績下滑'],
    history:'2次歐冠冠軍（1985、1996），近年多次進入淘汰賽'
  },
  'SGE': {
    name:'Eintracht Frankfurt', nameCN:'法蘭克福', flag:'https://crests.football-data.org/19.png', pot:2, league:'Bundesliga',
    uefaCoeff:74, coach:'Albert Riera', formation:'3-4-2-1',
    keyPlayers:[{name:'Jonathan Burkardt',pos:'前鋒',club:'法蘭克福'},{name:'Ansgar Knauff',pos:'翼鋒',club:'法蘭克福'},{name:'Mario Götze',pos:'攻擊中場',club:'法蘭克福'},{name:'Ellyes Skhiri',pos:'中場',club:'法蘭克福'},{name:'Michael Zetterer',pos:'門將',club:'法蘭克福'}],
    radar:{attack:78,defense:74,midfield:78,speed:80,experience:70},
    style:'快速反擊，高位壓迫，三後衛體系',
    strengths:['Burkardt進攻終結效率不俗','反擊速度快','主場氣氛佳'],
    weaknesses:['防守不夠穩定','板凳深度不足','大賽經驗欠缺'],
    history:'2021/22歐霸冠軍，重返歐冠舞台'
  },
  'BRU': {
    name:'Club Brugge', nameCN:'布魯日', flag:'https://crests.football-data.org/851.png', pot:2, league:'Jupiler Pro League',
    uefaCoeff:71.75, coach:'Ivan Leko', formation:'4-3-3',
    keyPlayers:[
      {name:'Christos Tzolis',pos:'左翼',club:'布魯日'},
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

  // ===== POT 3 =====
  'TOT': {
    name:'Tottenham Hotspur', nameCN:'托特納姆熱刺', flag:'https://crests.football-data.org/73.png', pot:3, league:'Premier League',
    uefaCoeff:70.25, coach:'Roberto De Zerbi', formation:'4-3-3',
    keyPlayers:[{name:'Mohammed Kudus',pos:'攻擊中場/翼鋒',club:'熱刺'},{name:'Dominic Solanke',pos:'前鋒',club:'熱刺'},{name:'Cristian Romero',pos:'中後衛',club:'熱刺'},{name:'Xavi Simons',pos:'攻擊中場',club:'熱刺'},{name:'Guglielmo Vicario',pos:'門將',club:'熱刺'}],
    radar:{attack:80,defense:76,midfield:80,speed:83,experience:72},
    style:'De Zerbi控球哲學導入中，後場出球為主',
    strengths:['Kudus+Simons創造力雙核','Romero防守領袖','歐戰底蘊尚在'],
    weaknesses:['賽季中三度換帥陣容動盪','防守穩定性不足','傷兵問題長期嚴重'],
    history:'2018/19歐冠決賽亞軍'
  },
  'PSV': {
    name:'PSV Eindhoven', nameCN:'PSV恩荷芬', flag:'https://crests.football-data.org/674.png', pot:3, league:'Eredivisie',
    uefaCoeff:69.25, coach:'Peter Bosz', formation:'4-3-3',
    keyPlayers:[
      {name:'Johan Bakayoko',pos:'右翼',club:'PSV恩荷芬'},
      {name:'Ivan Perišić',pos:'翼鋒',club:'PSV恩荷芬'},
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
  'AJA': {
    name:'Ajax', nameCN:'阿賈克斯', flag:'https://crests.football-data.org/678.png', pot:3, league:'Eredivisie',
    uefaCoeff:67.25, coach:'Oscar Garcia', formation:'4-3-3',
    keyPlayers:[
      {name:'Brian Brobbey',pos:'中鋒',club:'阿賈克斯'},
      {name:'Mika Godts',pos:'翼鋒',club:'阿賈克斯'},
      {name:'Kenneth Taylor',pos:'中場',club:'阿賈克斯'},
      {name:'Josip Šutalo',pos:'中後衛',club:'阿賈克斯'},
      {name:'Remko Pasveer',pos:'門將',club:'阿賈克斯'}
    ],
    radar:{attack:78,defense:72,midfield:76,speed:80,experience:72},
    style:'全攻全守Cruyff哲學，青訓為本',
    strengths:['Johan Cruyff Arena主場','青訓持續產出','荷蘭足球DNA'],
    weaknesses:['近年競爭力大幅下滑','球星流失嚴重','歐冠小組賽表現不穩'],
    history:'4次歐冠冠軍，2018/19四強驚奇之旅'
  },
  'NAP': {
    name:'Napoli', nameCN:'拿坡里', flag:'https://crests.football-data.org/113.png', pot:3, league:'Serie A',
    uefaCoeff:61, coach:'Antonio Conte', formation:'3-4-2-1',
    keyPlayers:[
      {name:'Romelu Lukaku',pos:'中鋒',club:'拿坡里'},
      {name:'David Neres',pos:'翼鋒',club:'拿坡里'},
      {name:'Stanislav Lobotka',pos:'中場',club:'拿坡里'},
      {name:'Amir Rrahmani',pos:'中後衛',club:'拿坡里'},
      {name:'Alex Meret',pos:'門將',club:'拿坡里'}
    ],
    radar:{attack:86,defense:82,midfield:84,speed:86,experience:72},
    style:'Conte式鐵血防守，快速轉換進攻',
    strengths:['Lukaku禁區終結能力強悍','Neres盤帶突破犀利','Conte大賽執教經驗'],
    weaknesses:['核心球員流失需要重建','陣容磨合需要時間','歐冠淘汰賽經驗不足'],
    history:'歐冠最佳成績2022/23八強，隊史首次'
  },
  'SCP': {
    name:'Sporting CP', nameCN:'里斯本競技', flag:'https://crests.football-data.org/498.png', pot:3, league:'Liga Portugal',
    uefaCoeff:59, coach:'Rui Borges', formation:'3-4-3',
    keyPlayers:[
      {name:'Francisco Trincão',pos:'翼鋒',club:'里斯本競技'},
      {name:'Pedro Gonçalves',pos:'攻擊中場',club:'里斯本競技'},
      {name:'Hidemasa Morita',pos:'中場',club:'里斯本競技'},
      {name:'Gonçalo Inácio',pos:'中後衛',club:'里斯本競技'},
      {name:'Franco Israel',pos:'門將',club:'里斯本競技'}
    ],
    radar:{attack:76,defense:78,midfield:80,speed:80,experience:68},
    style:'三後衛高壓體系，團隊進攻為核心',
    strengths:['Borges延續Amorim戰術框架','Pedro Gonçalves創造力出色','葡超統治力帶來信心'],
    weaknesses:['鋒線進球效率不足','歐冠淘汰賽經驗不足','板凳深度有限'],
    history:'歐冠最佳成績2008/09十六強',
    injuries:[
      {name:'Fotis Ioannidis',pos:'前鋒',status:'膝傷',returnDate:'未定'},
      {name:'Nuno Santos',pos:'翼鋒',status:'腿後肌傷（長期）',returnDate:'賽季報銷'},
      {name:'Geovany Quenda',pos:'翼鋒',status:'足部骨折',returnDate:'未定'},
      {name:'Zeno Debast',pos:'後衛',status:'腿傷',returnDate:'評估中'}
    ]
  },
  'OLY': {
    name:'Olympiacos', nameCN:'奧林匹亞科斯', flag:'https://crests.football-data.org/567.png', pot:3, league:'Super League Greece',
    uefaCoeff:56.5, coach:'José Luis Mendilibar', formation:'4-2-3-1',
    keyPlayers:[{name:'Ayoub El Kaabi',pos:'前鋒',club:'奧林匹亞科斯'},{name:'Rodinei',pos:'右後衛',club:'奧林匹亞科斯'},{name:'Santiago Hezze',pos:'中場',club:'奧林匹亞科斯'},{name:'Gelson Martins',pos:'翼鋒',club:'奧林匹亞科斯'},{name:'Konstantinos Tzolakis',pos:'門將',club:'奧林匹亞科斯'}],
    radar:{attack:74,defense:72,midfield:72,speed:76,experience:65},
    style:'務實防守，快速反擊',
    strengths:['El Kaabi進球效率高','歐協聯冠軍信心','主場氛圍狂熱'],
    weaknesses:['整體陣容實力有差距','聯賽競爭力不足','客場表現不穩'],
    history:'2023/24歐協聯冠軍，希臘豪門首座歐洲獎杯'
  },
  'SLA': {
    name:'Slavia Prague', nameCN:'布拉格斯拉維亞', flag:'https://crests.football-data.org/396.png', pot:3, league:'Czech First League',
    uefaCoeff:51, coach:'Jindřich Trpišovský', formation:'4-2-3-1',
    keyPlayers:[{name:'Tomáš Chorý',pos:'前鋒',club:'布拉格斯拉維亞'},{name:'Lukáš Provod',pos:'中場',club:'布拉格斯拉維亞'},{name:'Oscar Dorley',pos:'中場',club:'布拉格斯拉維亞'},{name:'Igoh Ogbu',pos:'中後衛',club:'布拉格斯拉維亞'},{name:'Jindřich Staněk',pos:'門將',club:'布拉格斯拉維亞'}],
    radar:{attack:70,defense:72,midfield:70,speed:74,experience:60},
    style:'團隊足球，高壓逼搶，跑動量大',
    strengths:['跑動量聯賽最高','團隊凝聚力強','主場難攻不落'],
    weaknesses:['個人能力與頂級球隊差距大','國際賽經驗不足','關鍵球員可能被挖角'],
    history:'捷克傳統豪門，近年穩定出現在歐戰'
  },
  'BOD': {
    name:'Bodø/Glimt', nameCN:'博德/格利姆特', flag:'https://crests.football-data.org/602.png', pot:3, league:'Eliteserien',
    uefaCoeff:49, coach:'Kjetil Knutsen', formation:'4-3-3',
    keyPlayers:[{name:'Kasper Junker',pos:'前鋒',club:'博德/格利姆特'},{name:'Patrick Berg',pos:'中場',club:'博德/格利姆特'},{name:'Ulrik Saltnes',pos:'中場',club:'博德/格利姆特'},{name:'Isak Määttä',pos:'翼鋒',club:'博德/格利姆特'},{name:'Nikita Haikin',pos:'門將',club:'博德/格利姆特'}],
    radar:{attack:75,defense:68,midfield:74,speed:78,experience:55},
    style:'北歐進攻足球，快速傳導，團隊配合',
    strengths:['Knutsen戰術體系獨特','團隊足球流暢','不怕強隊的心態'],
    weaknesses:['北極圈氣候影響賽程','球員流失嚴重','體能在密集賽程中是挑戰'],
    history:'挪威小城奇蹟，曾在歐洲賽場痛擊羅馬6:1'
  },
  'MAR': {
    name:'Olympique Marseille', nameCN:'馬賽', flag:'https://crests.football-data.org/516.png', pot:3, league:'Ligue 1',
    uefaCoeff:48, coach:'Habib Beye', formation:'3-4-3',
    keyPlayers:[
      {name:'Mason Greenwood',pos:'前鋒',club:'馬賽'},
      {name:'Amine Harit',pos:'攻擊中場',club:'馬賽'},
      {name:'Pierre-Emile Højbjerg',pos:'中場',club:'馬賽'},
      {name:'Leonardo Balerdi',pos:'中後衛',club:'馬賽'},
      {name:'Pau López',pos:'門將',club:'馬賽'}
    ],
    radar:{attack:80,defense:74,midfield:78,speed:82,experience:72},
    style:'De Zerbi控球哲學，從後場建構進攻',
    strengths:['De Zerbi戰術體系吸引人','Vélodrome主場瘋狂','球員求勝慾望強'],
    weaknesses:['陣容穩定性差','歐冠近年表現糟糕','後防易被快速反擊擊穿'],
    history:'1992/93歐冠冠軍，法國唯一奪冠球隊'
  },

  // ===== POT 4 =====
  'COP': {
    name:'FC Copenhagen', nameCN:'哥本哈根', flag:'img/copenhagen.png', pot:4, league:'Danish Superliga',
    uefaCoeff:44.875, coach:'Jacob Neestrup', formation:'3-4-2-1',
    keyPlayers:[{name:'Mohamed Elyounoussi',pos:'翼鋒',club:'哥本哈根'},{name:'Diogo Gonçalves',pos:'右翼衛',club:'哥本哈根'},{name:'Lukas Lerager',pos:'中場',club:'哥本哈根'},{name:'Denis Vavro',pos:'中後衛',club:'哥本哈根'},{name:'Dominik Kotarski',pos:'門將',club:'哥本哈根'}],
    radar:{attack:72,defense:72,midfield:70,speed:74,experience:60},
    style:'丹麥務實足球，穩守反擊',
    strengths:['Kotarski門將表現出色','防守組織嚴密','歐冠經驗累積中'],
    weaknesses:['進攻火力不足','聯賽水平限制球員成長','板凳深度不夠'],
    history:'2023/24歐冠16強，丹麥最成功的歐戰球隊'
  },
  'MON': {
    name:'AS Monaco', nameCN:'摩納哥', flag:'https://crests.football-data.org/548.png', pot:4, league:'Ligue 1',
    uefaCoeff:41, coach:'Sébastien Pocognoli', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Folarin Balogun',pos:'前鋒',club:'摩納哥'},
      {name:'Aleksandr Golovin',pos:'攻擊中場',club:'摩納哥'},
      {name:'Denis Zakaria',pos:'中場',club:'摩納哥'},
      {name:'Vanderson',pos:'右後衛',club:'摩納哥'},
      {name:'Philipp Köhn',pos:'門將',club:'摩納哥'}
    ],
    radar:{attack:78,defense:74,midfield:78,speed:82,experience:62},
    style:'年輕快速，反擊為主，培養新星',
    strengths:['球員速度快','青訓與轉賣模式成熟','Pocognoli戰術紀律好'],
    weaknesses:['歐冠經驗嚴重不足','關鍵球員隨時可能離隊','整體實力與頂級隊伍有差距'],
    history:'2016/17歐冠四強，Mbappé成名之地'
  },
  'GAL': {
    name:'Galatasaray', nameCN:'加拉塔薩雷', flag:'img/galatasaray.png', pot:4, league:'Süper Lig',
    uefaCoeff:38.25, coach:'Okan Buruk', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Mauro Icardi',pos:'中鋒',club:'加拉塔薩雷'},
      {name:'Victor Osimhen',pos:'前鋒',club:'加拉塔薩雷'},
      {name:'Leroy Sané',pos:'翼鋒',club:'加拉塔薩雷'},
      {name:'Davinson Sánchez',pos:'中後衛',club:'加拉塔薩雷'},
      {name:'Uğurcan Çakır',pos:'門將',club:'加拉塔薩雷'}
    ],
    radar:{attack:80,defense:74,midfield:78,speed:78,experience:78},
    style:'球星驅動，狂熱主場，攻勢足球',
    strengths:['Türk Telekom Arena主場瘋狂','經驗豐富的外援','球迷第12人效應'],
    weaknesses:['客場戰力大幅下降','防守紀律性不足','陣容年齡偏大'],
    history:'歐冠最佳成績2000/01八強'
  },
  'USG': {
    name:'Union Saint-Gilloise', nameCN:'聖吉爾聯合', flag:'https://crests.football-data.org/2186.png', pot:4, league:'Jupiler Pro League',
    uefaCoeff:36, coach:'David Hubert', formation:'3-5-2',
    keyPlayers:[{name:'Cameron Puertas',pos:'攻擊中場',club:'聖吉爾聯合'},{name:'Kevin Mac Allister',pos:'中後衛',club:'聖吉爾聯合'},{name:'Mohammed Fuseini',pos:'翼鋒',club:'聖吉爾聯合'},{name:'Ross Sykes',pos:'中後衛',club:'聖吉爾聯合'},{name:'Anthony Moris',pos:'門將',club:'聖吉爾聯合'}],
    radar:{attack:70,defense:68,midfield:70,speed:72,experience:45},
    style:'比利時新派足球，進攻導向',
    strengths:['Puertas創造力突出','新興勁旅無畏氣勢','團隊戰術執行力好'],
    weaknesses:['歐冠零經驗','球員可能被大隊挖走','整體實力差距大'],
    history:'比利時足球新勢力，首次參加歐冠'
  },
  'QAR': {
    name:'Qarabağ FK', nameCN:'卡拉巴赫', flag:'img/qarabag.png', pot:4, league:'Azerbaijan Premier League',
    uefaCoeff:32, coach:'Gurban Gurbanov', formation:'4-2-3-1',
    keyPlayers:[{name:'Nariman Akhundzade',pos:'前鋒',club:'卡拉巴赫'},{name:'Abdellah Zoubir',pos:'翼鋒',club:'卡拉巴赫'},{name:'Richard Almeida',pos:'中場',club:'卡拉巴赫'},{name:'Kevin Medina',pos:'中場',club:'卡拉巴赫'},{name:'Shahrudin Mahammadaliyev',pos:'門將',club:'卡拉巴赫'}],
    radar:{attack:68,defense:66,midfield:66,speed:72,experience:50},
    style:'務實足球，密集防守，快速反擊',
    strengths:['Gurbanov長期執教體系穩定','球隊凝聚力強','小組賽不放棄精神'],
    weaknesses:['與歐洲頂級的實力差距','缺乏頂級球星','主場城市受戰爭影響'],
    history:'阿塞拜疆足球代表，多次參加歐冠正賽'
  },
  'ATH': {
    name:'Athletic Bilbao', nameCN:'畢爾包競技', flag:'https://crests.football-data.org/77.png', pot:4, league:'La Liga',
    uefaCoeff:26.75, coach:'Ernesto Valverde', formation:'4-2-3-1',
    keyPlayers:[{name:'Nico Williams',pos:'左翼',club:'畢爾包競技'},{name:'Oihan Sancet',pos:'攻擊中場',club:'畢爾包競技'},{name:'Iñaki Williams',pos:'前鋒',club:'畢爾包競技'},{name:'Unai Simón',pos:'門將',club:'畢爾包競技'},{name:'Dani Vivian',pos:'中後衛',club:'畢爾包競技'}],
    radar:{attack:80,defense:78,midfield:78,speed:82,experience:68},
    style:'全巴斯克球員，高強度壓迫，永不放棄',
    strengths:['Nico Williams速度與技術頂級','巴斯克人精神永不言敗','Valverde戰術經驗豐富'],
    weaknesses:['只用巴斯克球員限制引援','板凳深度受限','歐冠經驗不足'],
    history:'西甲從未降級的三隊之一，只使用巴斯克球員的獨特傳統'
  },
  'NEW': {
    name:'Newcastle United', nameCN:'紐卡索聯', flag:'https://crests.football-data.org/67.png', pot:4, league:'Premier League',
    uefaCoeff:23.039, coach:'Eddie Howe', formation:'4-3-3',
    keyPlayers:[
      {name:'Bruno Guimarães',pos:'中場',club:'紐卡索聯'},
      {name:'Anthony Gordon',pos:'左翼',club:'紐卡索聯'},
      {name:'Sandro Tonali',pos:'中場',club:'紐卡索聯'},
      {name:'Sven Botman',pos:'中後衛',club:'紐卡索聯'},
      {name:'Nick Pope',pos:'門將',club:'紐卡索聯'}
    ],
    radar:{attack:78,defense:80,midfield:83,speed:82,experience:62},
    style:'快速直接，強力衝擊，堅實防守',
    strengths:['Bruno+Tonali雙核中場','Gordon邊路突破','St. James\' Park主場氣勢'],
    weaknesses:['歐冠經驗幾乎為零','傷病陣容管理挑戰','面對頂級球隊戰術應變不足'],
    history:'歐冠最佳成績2002/03小組賽出線'
  },
  'PAF': {
    name:'Pafos FC', nameCN:'帕福斯', flag:'https://crests.football-data.org/1044.png', pot:4, league:'Cypriot First Division',
    uefaCoeff:11.125, coach:'Albert Celades', formation:'4-3-3',
    keyPlayers:[{name:'Anderson Correia',pos:'前鋒',club:'帕福斯'},{name:'Jairo',pos:'翼鋒',club:'帕福斯'},{name:'Bruno Felipe',pos:'中場',club:'帕福斯'},{name:'Pierre Kunde',pos:'防守中場',club:'帕福斯'},{name:'Dorde Nikolić',pos:'門將',club:'帕福斯'}],
    radar:{attack:64,defense:62,midfield:64,speed:68,experience:40},
    style:'地中海務實足球，防守為先',
    strengths:['黑馬心態毫無壓力','團隊凝聚力強','主場氣氛佳'],
    weaknesses:['歐冠完全沒經驗','個人能力差距最大','塞浦路斯聯賽水平有限'],
    history:'塞浦路斯球隊首次打入歐冠正賽，史無前例'
  },
  'KAI': {
    name:'FC Kairat', nameCN:'凱拉特', flag:'https://crests.football-data.org/6806.png', pot:4, league:'Kazakhstan Premier League',
    uefaCoeff:5.5, coach:'Rafael Urazbakhtin', formation:'4-2-3-1',
    keyPlayers:[{name:'Dastan Satpayev',pos:'前鋒',club:'凱拉特'},{name:'Bauyrzhan Islamkhan',pos:'攻擊中場',club:'凱拉特'},{name:'Gafurzhan Suyumbayev',pos:'中場',club:'凱拉特'},{name:'Marin Tomasov',pos:'翼鋒',club:'凱拉特'},{name:'Stas Pokatilov',pos:'門將',club:'凱拉特'}],
    radar:{attack:62,defense:60,midfield:62,speed:68,experience:35},
    style:'中亞足球風格，速度與力量',
    strengths:['主場人工草皮優勢','球迷狂熱支持','不怕失敗的精神'],
    weaknesses:['與歐洲強隊實力差距最大','長途客場旅程影響','缺乏國際賽經驗'],
    history:'哈薩克斯坦傳統強隊，首次參加歐冠正賽'
  },
};

// 導出供 tournament.js 使用
if (typeof window !== 'undefined') window.UCL_TEAMS = UCL_TEAMS;
