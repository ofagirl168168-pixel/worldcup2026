/* =============================================
   EPL-DATA-TEAMS.JS — 2025/26 英超 20 支球隊資料
   隊徽：football-data.org CDN
   資料截止：2025/26 賽季（2026-05-01 日更）
   ============================================= */

const EPL_TEAMS = {

  // ===== BIG SIX + 強隊 =====
  'ARS': {
    name:'Arsenal', nameCN:'兵工廠', flag:'https://crests.football-data.org/57.png',
    league:'Premier League', eplRank:1, coach:'Mikel Arteta', formation:'4-3-3',
    keyPlayers:[
      {name:'Bukayo Saka',pos:'右翼',club:'兵工廠'},
      {name:'Declan Rice',pos:'中場',club:'兵工廠'},
      {name:'Martin Ødegaard',pos:'攻擊中場',club:'兵工廠'},
      {name:'William Saliba',pos:'中後衛',club:'兵工廠'},
      {name:'Viktor Gyökeres',pos:'前鋒',club:'兵工廠'}
    ],
    radar:{attack:90,defense:91,midfield:92,speed:87,experience:83},
    style:'高位壓迫，控球為主，邊路突破與定位球',
    strengths:['Arteta戰術體系成熟','Saka+Ødegaard創造力頂級','英超最穩固後防之一'],
    weaknesses:['關鍵戰偶有緊張','板凳深度不如曼城','Gyökeres體系磨合中'],
    recentForm:['W','W','L','L','W'],
    history:'13次英格蘭頂級聯賽冠軍，2003/04不敗賽季傳奇',
    injuries:[
      {name:'Bukayo Saka',pos:'右翼',status:'阿基里斯腱問題，已恢復訓練，Arteta 確認可出場',returnDate:'可出場'},
      {name:'Kai Havertz',pos:'前鋒',status:'肌肉傷勢（vs NEW 4/25），缺席馬競首回合，vs FUL（5/2）出場存疑',returnDate:'歐冠次回合（5/6）目標復出'},
      {name:'Eberechi Eze',pos:'攻擊中場',status:'小不適已恢復，Arteta 確認可出場',returnDate:'可出場'},
      {name:'Jurrien Timber',pos:'後衛',status:'腹股溝傷（3/14 起缺陣），確認缺席馬競首回合',returnDate:'賽季末評估'},
      {name:'Riccardo Calafiori',pos:'左後衛',status:'Arteta 確認可出場',returnDate:'可出場'},
      {name:'Mikel Merino',pos:'中場',status:'已脫護具但本季不預期回歸',returnDate:'賽季報銷'},
      {name:'Noni Madueke',pos:'右翼',status:'膝傷（歐冠八強次回合退場）',returnDate:'評估中'}
    ]
  },
  'LIV': {
    name:'Liverpool', nameCN:'利物浦', flag:'https://crests.football-data.org/64.png',
    league:'Premier League', eplRank:4, coach:'Arne Slot', formation:'4-3-3',
    keyPlayers:[
      {name:'Mohamed Salah',pos:'右翼',club:'利物浦'},
      {name:'Virgil van Dijk',pos:'中後衛',club:'利物浦'},
      {name:'Alexis Mac Allister',pos:'中場',club:'利物浦'},
      {name:'Ryan Gravenberch',pos:'中場',club:'利物浦'},
      {name:'Dominik Szoboszlai',pos:'攻擊中場',club:'利物浦'}
    ],
    radar:{attack:91,defense:89,midfield:90,speed:89,experience:88},
    style:'高強度壓迫，快速轉換，邊路推進',
    strengths:['Salah持續高效輸出','Slot體系穩定成熟','中場跑動覆蓋全場'],
    weaknesses:['Salah年齡漸長','傷兵時輪換選擇有限','對陣低位防守隊時偶有困難'],
    recentForm:['D','L','W','W','W'],
    history:'19次英格蘭頂級聯賽冠軍，6次歐冠冠軍',
    injuries:[
      {name:'Mohamed Salah',pos:'右翼',status:'左腿後肌撕裂（vs CRY 4/25），利物浦確認賽季結束前可復出',returnDate:'五月中旬（世界盃可趕上）'},
      {name:'Hugo Ekitike',pos:'前鋒',status:'阿基里斯腱斷裂（vs PSG受傷）',returnDate:'賽季報銷＋世界盃缺席'},
      {name:'Alisson',pos:'門將',status:'肌肉拉傷（缺席一個月），有機會回歸',returnDate:'評估中'},
      {name:'Mamardashvili',pos:'門將',status:'傷缺數週',returnDate:'評估中'},
      {name:'Wataru Endo',pos:'中場',status:'足部手術',returnDate:'賽季報銷（目標世界盃）'},
      {name:'Conor Bradley',pos:'右後衛',status:'膝蓋重傷手術',returnDate:'賽季報銷'},
      {name:'Giovanni Leoni',pos:'後衛',status:'前十字韌帶',returnDate:'賽季報銷'}
    ]
  },
  'MCI': {
    name:'Manchester City', nameCN:'曼城', flag:'https://crests.football-data.org/65.png',
    league:'Premier League', eplRank:2, coach:'Pep Guardiola', formation:'4-3-3',
    keyPlayers:[
      {name:'Erling Haaland',pos:'中鋒',club:'曼城'},
      {name:'Tijjani Reijnders',pos:'中場',club:'曼城'},
      {name:'Rayan Cherki',pos:'攻擊中場',club:'曼城'},
      {name:'Phil Foden',pos:'翼鋒/中場',club:'曼城'},
      {name:'Rodri',pos:'防守中場',club:'曼城'}
    ],
    radar:{attack:93,defense:88,midfield:93,speed:86,experience:90},
    style:'極致控球，位置輪轉，高位壓迫',
    strengths:['Haaland進球效率恐怖','Guardiola戰術無人能及','板凳深度聯賽最強'],
    weaknesses:['Rodri傷癒後狀態仍在回升','夏季新援（Reijnders/Cherki）磨合中','後防傷兵影響輪替'],
    recentForm:['L','W','W','W','W'],
    history:'9次英格蘭頂級聯賽冠軍，2022/23三冠王',
    injuries:[
      {name:'Joško Gvardiol',pos:'後衛',status:'脛骨骨折術後',returnDate:'賽季末可望回歸'},
      {name:'Rúben Dias',pos:'中後衛',status:'腳踝傷勢',returnDate:'四月底（本月報銷）'},
      {name:'John Stones',pos:'中後衛',status:'已回歸訓練，可出場',returnDate:'已歸隊'},
      {name:'Nico O\'Reilly',pos:'中場',status:'腿後肌傷（vs Chelsea下半場受傷）',returnDate:'評估中，已輕度訓練'},
      {name:'Rodri',pos:'防守中場',status:'腹股溝傷（足總盃半決賽未冒險上陣）',returnDate:'下場聯賽（5/4 vs 艾弗頓）目標復出'}
    ]
  },
  'CHE': {
    name:'Chelsea', nameCN:'切爾西', flag:'https://crests.football-data.org/61.png',
    league:'Premier League', eplRank:7, coach:'Calum McFarlane (interim)', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Cole Palmer',pos:'攻擊中場/右翼',club:'切爾西'},
      {name:'Enzo Fernández',pos:'中場',club:'切爾西'},
      {name:'Moisés Caicedo',pos:'防守中場',club:'切爾西'},
      {name:'Reece James',pos:'右後衛',club:'切爾西'},
      {name:'Robert Sánchez',pos:'門將',club:'切爾西'}
    ],
    radar:{attack:86,defense:82,midfield:85,speed:86,experience:72},
    style:'控球導向，中場掌控，快速轉換進攻',
    strengths:['Cole Palmer創造力爆表','年輕陣容潛力無限','中場組合強悍'],
    weaknesses:['陣容磨合仍在進行','經驗不足影響穩定性','防守偶有失誤'],
    recentForm:['L','L','L','L','L'],
    history:'6次英格蘭頂級聯賽冠軍，2次歐冠冠軍',
    injuries:[
      {name:'Reece James',pos:'右後衛',status:'腿後肌傷',returnDate:'五月初'},
      {name:'Cole Palmer',pos:'攻擊中場/右翼',status:'腿後腱緊繃（缺席 vs 布萊頓）',returnDate:'短期內'},
      {name:'Levi Colwill',pos:'中後衛',status:'長期傷缺',returnDate:'未定'},
      {name:'Estevao',pos:'翼鋒',status:'嚴重腿後肌傷（vs 曼聯退場），可能需手術',returnDate:'賽季報銷，世界盃存疑'},
      {name:'Filip Jorgensen',pos:'門將',status:'傷勢反覆',returnDate:'賽季報銷'},
      {name:'Jamie Gittens',pos:'翼鋒',status:'傷勢反覆',returnDate:'賽季報銷'}
    ]
  },
  'MUN': {
    name:'Manchester United', nameCN:'曼聯', flag:'https://crests.football-data.org/66.png',
    league:'Premier League', eplRank:3, coach:'Michael Carrick', formation:'3-4-3',
    keyPlayers:[
      {name:'Bruno Fernandes',pos:'攻擊中場',club:'曼聯'},
      {name:'Rasmus Højlund',pos:'前鋒',club:'曼聯'},
      {name:'Kobbie Mainoo',pos:'中場',club:'曼聯'},
      {name:'Alejandro Garnacho',pos:'左翼',club:'曼聯'},
      {name:'Lisandro Martínez',pos:'中後衛',club:'曼聯'}
    ],
    radar:{attack:82,defense:78,midfield:81,speed:84,experience:80},
    style:'三後衛體系，翼衛推進，快速反擊',
    strengths:['Bruno Fernandes核心創造力','年輕球員快速成長','Amorim戰術改造進行中'],
    weaknesses:['體系轉換需要時間','防守穩定性不足','傷兵問題嚴重'],
    recentForm:['W','D','L','W','W'],
    history:'20次英格蘭頂級聯賽冠軍，3次歐冠冠軍，英格蘭最成功俱樂部',
    injuries:[
      {name:'Patrick Dorgu',pos:'翼衛',status:'肌肉傷復健中，恢復進度中',returnDate:'賽季末'},
      {name:'Lisandro Martínez',pos:'中後衛',status:'MW35 停賽期滿，已可出場',returnDate:'已解禁'},
      {name:'Matheus Cunha',pos:'翼鋒',status:'髖屈肌不適（缺席 vs BRE 4/27），恢復進展良好',returnDate:'vs LIV（5/3）有望出場'}
    ]
  },
  'TOT': {
    name:'Tottenham Hotspur', nameCN:'熱刺', flag:'https://crests.football-data.org/73.png',
    league:'Premier League', eplRank:18, coach:'Roberto De Zerbi', formation:'4-3-3',
    keyPlayers:[
      {name:'Dominic Solanke',pos:'前鋒',club:'熱刺'},
      {name:'James Maddison',pos:'攻擊中場',club:'熱刺'},
      {name:'Cristian Romero',pos:'中後衛',club:'熱刺'},
      {name:'Micky van de Ven',pos:'中後衛',club:'熱刺'}
    ],
    radar:{attack:78,defense:75,midfield:77,speed:83,experience:72},
    style:'進攻足球，高位壓迫，後場出球',
    strengths:['De Zerbi 戰術體系導入中','後防線速度極快','Solanke/Maddison 進攻核心'],
    weaknesses:['賽季中三度換帥陣容動盪','傷兵名單長期居高不下','關鍵戰心態不穩'],
    recentForm:['D','L','L','D','W'],
    history:'2次英格蘭頂級聯賽冠軍，2019歐冠亞軍',
    injuries:[
      {name:'Dominic Solanke',pos:'前鋒',status:'肌肉傷（vs WOL 4/25），De Zerbi 稱不嚴重',returnDate:'評估中'},
      {name:'Xavi Simons',pos:'攻擊中場',status:'右膝前十字韌帶斷裂（vs WOL 4/25），需手術',returnDate:'賽季報銷＋世界盃報銷'},
      {name:'James Maddison',pos:'攻擊中場',status:'前十字韌帶傷（恢復中）',returnDate:'賽季報銷'},
      {name:'Cristian Romero',pos:'中後衛',status:'膝傷',returnDate:'賽季報銷（世界盃存疑）'},
      {name:'Mathys Tel',pos:'翼鋒',status:'大腿傷',returnDate:'評估中'}
    ]
  },
  'NEW': {
    name:'Newcastle United', nameCN:'紐卡索', flag:'https://crests.football-data.org/67.png',
    league:'Premier League', eplRank:14, coach:'Eddie Howe', formation:'4-3-3',
    keyPlayers:[
      {name:'Bruno Guimarães',pos:'中場',club:'紐卡索'},
      {name:'Anthony Gordon',pos:'左翼',club:'紐卡索'},
      {name:'Sandro Tonali',pos:'中場',club:'紐卡索'},
      {name:'Sven Botman',pos:'中後衛',club:'紐卡索'}
    ],
    radar:{attack:80,defense:82,midfield:84,speed:83,experience:74},
    style:'快速反擊，邊路衝擊，高強度防守',
    strengths:['中場Bruno+Tonali雙核強勢','Gordon速度突破','整體戰術執行力高'],
    weaknesses:['失去 Isak 後火力明顯下滑','板凳深度仍不夠頂級','近期狀態持續下探'],
    recentForm:['W','L','L','L','L'],
    history:'4次英格蘭頂級聯賽冠軍，近年在沙特資金注入後重返強隊行列',
    injuries:[
      {name:'Joelinton',pos:'中場',status:'停賽（第2場/共2場）',returnDate:'停賽結束後'},
      {name:'Tino Livramento',pos:'右後衛',status:'肌肉傷',returnDate:'賽季報銷'},
      {name:'Callum Wilson',pos:'前鋒',status:'長期傷缺',returnDate:'未定'}
    ]
  },
  'AVL': {
    name:'Aston Villa', nameCN:'阿斯頓維拉', flag:'https://crests.football-data.org/58.png',
    league:'Premier League', eplRank:5, coach:'Unai Emery', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Ollie Watkins',pos:'前鋒',club:'阿斯頓維拉'},
      {name:'Morgan Rogers',pos:'攻擊中場',club:'阿斯頓維拉'},
      {name:'Youri Tielemans',pos:'中場',club:'阿斯頓維拉'},
      {name:'Boubacar Kamara',pos:'防守中場',club:'阿斯頓維拉'},
      {name:'Emiliano Martínez',pos:'門將',club:'阿斯頓維拉'}
    ],
    radar:{attack:84,defense:83,midfield:84,speed:83,experience:77},
    style:'Emery體系，緊湊防守反擊，定位球威脅大',
    strengths:['Watkins全面的前鋒能力','Emery歐戰經驗豐富','團隊凝聚力強'],
    weaknesses:['頂級球星不足','多線作戰體能考驗','客場表現波動'],
    recentForm:['W','L','W','W','L'],
    history:'7次英格蘭頂級聯賽冠軍，1982年歐冠冠軍'
  },

  // ===== 中游球隊 =====
  'BHA': {
    name:'Brighton & Hove Albion', nameCN:'布萊頓', flag:'https://crests.football-data.org/397.png',
    league:'Premier League', eplRank:6, coach:'Fabian Hürzeler', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Kaoru Mitoma',pos:'左翼',club:'布萊頓'},
      {name:'Carlos Baleba',pos:'中場',club:'布萊頓'},
      {name:'Lewis Dunk',pos:'中後衛',club:'布萊頓'},
      {name:'Yankuba Minteh',pos:'右翼',club:'布萊頓'},
      {name:'Georginio Rutter',pos:'前鋒',club:'布萊頓'}
    ],
    radar:{attack:80,defense:77,midfield:80,speed:82,experience:65},
    style:'後場組織出球，控球進攻，數據驅動招募',
    strengths:['球探系統發掘天才','戰術執行力高','年輕球員發展好'],
    weaknesses:['關鍵球員被挖角風險','經驗不足','進攻終結效率偶有波動'],
    recentForm:['L','W','D','D','W'],
    history:'近年從英甲升至英超穩定中游，數據化管理典範'
  },
  'BOU': {
    name:'AFC Bournemouth', nameCN:'伯恩茅斯', flag:'https://crests.football-data.org/1044.png',
    league:'Premier League', eplRank:8, coach:'Andoni Iraola', formation:'4-3-3',
    keyPlayers:[
      {name:'Evanilson',pos:'前鋒',club:'伯恩茅斯'},
      {name:'Justin Kluivert',pos:'翼鋒',club:'伯恩茅斯'},
      {name:'Antoine Semenyo',pos:'右翼',club:'伯恩茅斯'},
      {name:'Lewis Cook',pos:'中場',club:'伯恩茅斯'},
      {name:'Marcus Tavernier',pos:'攻擊中場',club:'伯恩茅斯'}
    ],
    radar:{attack:78,defense:74,midfield:76,speed:80,experience:62},
    style:'高壓逼搶，快速轉換，直接進攻',
    strengths:['Iraola壓迫體系有效','球員拼搶意志強','反擊速度快'],
    weaknesses:['陣容深度不足','對陣強隊經驗少','定位球防守不穩'],
    recentForm:['D','W','L','W','D'],
    history:'2015年首次升上英超，近年穩定在英超中游'
  },
  'FUL': {
    name:'Fulham', nameCN:'富勒姆', flag:'https://crests.football-data.org/63.png',
    league:'Premier League', eplRank:12, coach:'Marco Silva', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Rodrigo Muniz',pos:'前鋒',club:'富勒姆'},
      {name:'Andreas Pereira',pos:'攻擊中場',club:'富勒姆'},
      {name:'Antonee Robinson',pos:'左後衛',club:'富勒姆'},
      {name:'Sander Berge',pos:'防守中場',club:'富勒姆'},
      {name:'Bernd Leno',pos:'門將',club:'富勒姆'}
    ],
    radar:{attack:76,defense:76,midfield:78,speed:77,experience:70},
    style:'控球穩健，邊路推進，防守組織嚴謹',
    strengths:['Marco Silva戰術紀律好','Robinson邊路推進犀利','整體平衡性佳'],
    weaknesses:['進攻火力不夠頂尖','板凳深度一般','客場表現較弱'],
    recentForm:['W','L','W','D','W'],
    history:'倫敦老牌球會，曾在2010年打進歐霸決賽'
  },
  'BRE': {
    name:'Brentford', nameCN:'布倫特福德', flag:'https://crests.football-data.org/402.png',
    league:'Premier League', eplRank:9, coach:'Keith Andrews', formation:'4-3-3',
    keyPlayers:[
      {name:'Igor Thiago',pos:'前鋒',club:'布倫特福德'},
      {name:'Kevin Schade',pos:'翼鋒',club:'布倫特福德'},
      {name:'Mikkel Damsgaard',pos:'攻擊中場',club:'布倫特福德'},
      {name:'Mathias Jensen',pos:'中場',club:'布倫特福德'},
      {name:'Nathan Collins',pos:'中後衛',club:'布倫特福德'}
    ],
    radar:{attack:78,defense:76,midfield:75,speed:78,experience:66},
    style:'直接打法，定位球威脅大，邊路傳中',
    strengths:['Igor Thiago獨撐前線終結力穩','Andrews延續Frank戰術遺產','定位球得分率高'],
    weaknesses:['失去Wissa(紐卡)與Nørgaard(兵工廠)攻守同減','對陣強隊防守壓力大','陣容深度有限'],
    recentForm:['W','D','L','D','L'],
    history:'2021年首次升上英超，以數據化管理聞名'
  },
  'NFO': {
    name:'Nottingham Forest', nameCN:'諾丁漢森林', flag:'https://crests.football-data.org/351.png',
    league:'Premier League', eplRank:16, coach:'Vítor Pereira', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Chris Wood',pos:'前鋒',club:'諾丁漢森林'},
      {name:'Morgan Gibbs-White',pos:'攻擊中場',club:'諾丁漢森林'},
      {name:'Callum Hudson-Odoi',pos:'翼鋒',club:'諾丁漢森林'},
      {name:'Murillo',pos:'中後衛',club:'諾丁漢森林'},
      {name:'Matz Sels',pos:'門將',club:'諾丁漢森林'}
    ],
    radar:{attack:74,defense:75,midfield:73,speed:76,experience:66},
    style:'紀律防守，快速反擊，硬朗對抗',
    strengths:['Pereira接手後防守體系重整中','Gibbs-White近期狀態回暖','定位球戰術仍有威脅'],
    weaknesses:['創造力不足','過度依賴反擊','關鍵球員深度不夠'],
    recentForm:['L','W','D','W','W'],
    history:'2次歐冠冠軍（1979、1980），英格蘭足球傳奇俱樂部',
    injuries:[
      {name:'Callum Hudson-Odoi',pos:'翼鋒',status:'大腿手術',returnDate:'賽季報銷'}
    ]
  },
  'CRY': {
    name:'Crystal Palace', nameCN:'水晶宮', flag:'https://crests.football-data.org/354.png',
    league:'Premier League', eplRank:14, coach:'Oliver Glasner', formation:'3-4-3',
    keyPlayers:[
      {name:'Ismaïla Sarr',pos:'右翼',club:'水晶宮'},
      {name:'Jean-Philippe Mateta',pos:'前鋒',club:'水晶宮'},
      {name:'Adam Wharton',pos:'中場',club:'水晶宮'},
      {name:'Yeremy Pino',pos:'右翼/前腰',club:'水晶宮'},
      {name:'Dean Henderson',pos:'門將',club:'水晶宮'}
    ],
    radar:{attack:76,defense:73,midfield:74,speed:82,experience:66},
    style:'邊路速度衝擊，定位球戰術，反擊犀利',
    strengths:['Sarr+Pino邊路速度優勢','Mateta終結效率穩定','Glasner戰術執行力佳'],
    weaknesses:['Eze夏窗轉兵工廠、Guéhi轉曼城後創造力與中衛深度雙降','進攻過度依賴個人能力','客場拿分困難'],
    recentForm:['L','D','W','W','L'],
    history:'倫敦南部老牌球會，從未贏得頂級聯賽冠軍'
  },
  'WHU': {
    name:'West Ham United', nameCN:'西漢姆', flag:'https://crests.football-data.org/563.png',
    league:'Premier League', eplRank:17, coach:'Nuno Espírito Santo', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Jarrod Bowen',pos:'右翼',club:'西漢姆'},
      {name:'Lucas Paquetá',pos:'攻擊中場',club:'西漢姆'},
      {name:'Mateus Fernandes',pos:'中場',club:'西漢姆'},
      {name:'El Hadji Malick Diouf',pos:'左後衛',club:'西漢姆'},
      {name:'Alphonse Areola',pos:'門將',club:'西漢姆'}
    ],
    radar:{attack:74,defense:70,midfield:72,speed:78,experience:70},
    style:'直接進攻，邊路傳中，定位球',
    strengths:['Bowen進攻穩定','Paquetá創造力仍在','Diouf夏窗補強左路'],
    weaknesses:['Kudus夏窗轉熱刺、Álvarez租借費內巴切，中前場創造力銳減','防守不夠穩固','陣容融合仍在進行'],
    recentForm:['L','L','W','D','W'],
    history:'1965年歐洲盃賽冠軍盃冠軍，2023年歐協聯冠軍'
  },
  'WOL': {
    name:'Wolverhampton Wanderers', nameCN:'狼隊', flag:'https://crests.football-data.org/76.png',
    league:'Premier League', eplRank:20, coach:'Rob Edwards', formation:'4-4-2',
    keyPlayers:[
      {name:'Hwang Hee-Chan',pos:'前鋒',club:'狼隊'},
      {name:'Mario Lemina',pos:'中場',club:'狼隊'},
      {name:'Jørgen Strand Larsen',pos:'前鋒',club:'狼隊'},
      {name:'João Gomes',pos:'中場',club:'狼隊'},
      {name:'José Sá',pos:'門將',club:'狼隊'}
    ],
    radar:{attack:68,defense:68,midfield:70,speed:76,experience:64},
    style:'快速轉換，反擊為主，身體對抗',
    strengths:['Rob Edwards接手後防守紀律改善','反擊速度快','葡萄牙系球員默契好'],
    weaknesses:['失去Cunha後進攻核心真空','陣容厚度不足','墊底球隊心態低迷'],
    recentForm:['L','W','D','L','L'],
    history:'3次英格蘭頂級聯賽冠軍，1970年代黃金時期'
  },
  'EVE': {
    name:'Everton', nameCN:'艾佛頓', flag:'https://crests.football-data.org/62.png',
    league:'Premier League', eplRank:10, coach:'David Moyes', formation:'4-4-2',
    keyPlayers:[
      {name:'Abdoulaye Doucouré',pos:'中場',club:'艾佛頓'},
      {name:'Dwight McNeil',pos:'翼鋒',club:'艾佛頓'},
      {name:'Dominic Calvert-Lewin',pos:'前鋒',club:'艾佛頓'},
      {name:'James Tarkowski',pos:'中後衛',club:'艾佛頓'},
      {name:'Jordan Pickford',pos:'門將',club:'艾佛頓'}
    ],
    radar:{attack:70,defense:73,midfield:71,speed:74,experience:74},
    style:'硬朗防守，直接長球，定位球',
    strengths:['Moyes防守紀律嚴明','Pickford撲救穩定','團隊拼搏精神強'],
    weaknesses:['進攻火力嚴重不足','財政公平法限制引援','創造力匱乏'],
    recentForm:['L','D','L','L','L'],
    history:'9次英格蘭頂級聯賽冠軍，利物浦同城宿敵'
  },

  // ===== 升班馬 / 下游球隊 =====
  'LEE': {
    name:'Leeds United', nameCN:'里茲聯', flag:'https://crests.football-data.org/341.png',
    league:'Premier League', eplRank:15, coach:'Daniel Farke', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Noah Okafor',pos:'前鋒',club:'里茲聯'},
      {name:'Joe Rodon',pos:'中後衛',club:'里茲聯'},
      {name:'Willy Gnonto',pos:'翼鋒',club:'里茲聯'},
      {name:'Ethan Ampadu',pos:'中場/中衛',club:'里茲聯'},
      {name:'Illan Meslier',pos:'門將',club:'里茲聯'}
    ],
    radar:{attack:74,defense:68,midfield:73,speed:79,experience:58},
    style:'控球進攻，高位壓迫，年輕有活力',
    strengths:['年輕球員速度快','主場氣氛狂熱','進攻人才儲備不錯'],
    weaknesses:['英超經驗不足','防守是最大弱點','對頂級球隊差距大'],
    recentForm:['L','D','W','D','W'],
    history:'3次英格蘭頂級聯賽冠軍，Don Revie時代傳奇，睽違一年重返英超'
  },
  'BUR': {
    name:'Burnley', nameCN:'伯恩利', flag:'https://crests.football-data.org/328.png',
    league:'Premier League', eplRank:20, coach:'Mike Jackson（代理）', formation:'4-4-2',
    keyPlayers:[
      {name:'Lyle Foster',pos:'前鋒',club:'伯恩利'},
      {name:'Jaidon Anthony',pos:'翼鋒/前鋒',club:'伯恩利'},
      {name:'Hannibal Mejbri',pos:'中場',club:'伯恩利'},
      {name:'Dara O\'Shea',pos:'中後衛',club:'伯恩利'},
      {name:'Max Weiß',pos:'門將',club:'伯恩利'}
    ],
    radar:{attack:68,defense:70,midfield:69,speed:73,experience:60},
    style:'硬朗防守，直接打法，身體對抗',
    strengths:['防守意志頑強','主場難以攻克','定位球戰術有效'],
    weaknesses:['進攻創造力嚴重不足','英超水平球員不夠','升班馬經驗限制'],
    recentForm:['L','L','L','L','L'],
    history:'2次英格蘭頂級聯賽冠軍，近年在英超與英冠間來回'
  },
  'SUN': {
    name:'Sunderland', nameCN:'桑德蘭', flag:'https://crests.football-data.org/71.png',
    league:'Premier League', eplRank:11, coach:'Régis Le Bris', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Wilson Isidor',pos:'前鋒',club:'桑德蘭'},
      {name:'Romaine Mundle',pos:'翼鋒',club:'桑德蘭'},
      {name:'Chris Rigg',pos:'中場',club:'桑德蘭'},
      {name:'Granit Xhaka',pos:'中場',club:'桑德蘭'},
      {name:'Robin Roefs',pos:'門將',club:'桑德蘭'}
    ],
    radar:{attack:76,defense:74,midfield:77,speed:76,experience:68},
    style:'年輕快速，高壓逼搶，團隊足球',
    strengths:['Xhaka中場穩定軍心','年輕陣容潛力爆發','主場光明球場氛圍狂熱'],
    weaknesses:['英超經驗稍嫌不足','面對頂級強隊仍有差距','陣容深度需觀察'],
    recentForm:['W','L','L','L','L'],
    history:'6次英格蘭頂級聯賽冠軍，英格蘭東北老牌豪門，睽違多年重返英超'
  }
};

// 導出到 window
window.EPL_TEAMS = EPL_TEAMS;

// EPL_MATCHES：已完賽比賽手動補充進球等詳情（API 免費方案不提供）
// API 即時資料由 epl-live-loader.js 合併，不會覆蓋已有的 goals
// 資料來源：ESPN、Sky Sports、BBC Sport（人工驗證）
window.EPL_MATCHES = [

  // ===== 第 32 輪 (2026-04-10 ~ 04-14 台灣時間) =====

  // 西漢姆 4-0 狼隊 | 04/11 01:30 台灣時間 | 裁判 Sam Barrott
  {id:'EPL-MW32-WHU-WOL', matchday:32, date:'2026-04-11', time:'03:00', home:'WHU', away:'WOL', stage:'league',
   status:'finished', score:{h:4,a:0}, halfTime:{h:1,a:0},
   goals:[
     {min:'42',player:'Konstantinos Mavropanos',side:'h'},
     {min:'66',player:'Valentín Castellanos',side:'h'},
     {min:'68',player:'Valentín Castellanos',side:'h'},
     {min:'83',player:'Konstantinos Mavropanos',side:'h'}
   ]},

  // 兵工廠 1-2 伯恩茅斯 | 04/11 04:00 台灣時間
  {id:'EPL-MW32-ARS-BOU', matchday:32, date:'2026-04-11', time:'19:30', home:'ARS', away:'BOU', stage:'league',
   status:'finished', score:{h:1,a:2}, halfTime:{h:1,a:1},
   goals:[
     {min:'17',player:'Junior Kroupi',side:'a'},
     {min:'35',player:'Viktor Gyökeres',side:'h',type:'pen'},
     {min:'74',player:'Alex Scott',side:'a'}
   ]},

  // 布倫特福德 2-2 愛華頓 | 04/11 04:00 台灣時間
  {id:'EPL-MW32-BRE-EVE', matchday:32, date:'2026-04-11', time:'22:00', home:'BRE', away:'EVE', stage:'league',
   status:'finished', score:{h:2,a:2}, halfTime:{h:1,a:1},
   goals:[
     {min:'3',player:'Igor Thiago',side:'h',type:'pen'},
     {min:'26',player:'Beto',side:'a'},
     {min:'76',player:'Igor Thiago',side:'h'},
     {min:'90+1',player:'Kiernan Dewsbury-Hall',side:'a'}
   ]},

  // 伯恩利 0-2 布萊頓 | 04/11 04:00 台灣時間
  {id:'EPL-MW32-BUR-BHA', matchday:32, date:'2026-04-11', time:'22:00', home:'BUR', away:'BHA', stage:'league',
   status:'finished', score:{h:0,a:2}, halfTime:{h:0,a:1},
   goals:[
     {min:'43',player:'Mats Wieffer',side:'a'},
     {min:'89',player:'Mats Wieffer',side:'a'}
   ]},

  // 利物浦 2-0 富勒姆 | 04/12 00:30 台灣時間
  {id:'EPL-MW32-LIV-FUL', matchday:32, date:'2026-04-12', time:'00:30', home:'LIV', away:'FUL', stage:'league',
   status:'finished', score:{h:2,a:0}, halfTime:{h:2,a:0},
   goals:[
     {min:'36',player:'Rio Ngumoha',side:'h'},
     {min:'40',player:'Mohamed Salah',side:'h'}
   ]},

  // 桑德蘭 1-0 熱刺 | 04/12 03:00 台灣時間
  {id:'EPL-MW32-SUN-TOT', matchday:32, date:'2026-04-12', time:'21:00', home:'SUN', away:'TOT', stage:'league',
   status:'finished', score:{h:1,a:0}, halfTime:{h:0,a:0},
   goals:[
     {min:'61',player:'Nordi Mukiele',side:'h'}
   ]},

  // 水晶宮 2-1 紐卡索 | 04/12 03:00 台灣時間
  {id:'EPL-MW32-CRY-NEW', matchday:32, date:'2026-04-12', time:'21:00', home:'CRY', away:'NEW', stage:'league',
   status:'finished', score:{h:2,a:1}, halfTime:{h:0,a:1},
   goals:[
     {min:'43',player:'William Osula',side:'a'},
     {min:'80',player:'Jean-Philippe Mateta',side:'h'},
     {min:'90+4',player:'Jean-Philippe Mateta',side:'h',type:'pen'}
   ]},

  // 諾丁漢森林 1-1 阿斯頓維拉 | 04/12 03:00 台灣時間
  {id:'EPL-MW32-NFO-AVL', matchday:32, date:'2026-04-12', time:'21:00', home:'NFO', away:'AVL', stage:'league',
   status:'finished', score:{h:1,a:1}, halfTime:{h:1,a:1},
   goals:[
     {min:'23',player:'Murillo',side:'a',type:'og'},
     {min:'38',player:'Neco Williams',side:'h'}
   ]},

  // 切爾西 0-3 曼城 | 04/12 23:30 台灣時間
  {id:'EPL-MW32-CHE-MCI', matchday:32, date:'2026-04-12', time:'23:30', home:'CHE', away:'MCI', stage:'league',
   status:'finished', score:{h:0,a:3}, halfTime:{h:0,a:0},
   goals:[
     {min:'51',player:'Nico O\'Reilly',side:'a'},
     {min:'57',player:'Marc Guéhi',side:'a'},
     {min:'68',player:'Jérémy Doku',side:'a'}
   ]},

  // 曼聯 1-2 里茲聯 | 04/14 03:00 台灣時間 | 裁判 Paul Tierney
  {id:'EPL-MW32-MUN-LEE', matchday:32, date:'2026-04-14', time:'03:00', home:'MUN', away:'LEE', stage:'league',
   status:'finished', score:{h:1,a:2}, halfTime:{h:0,a:2}, referee:'Paul Tierney',
   goals:[
     {min:'5',player:'Noah Okafor',side:'a'},
     {min:'29',player:'Noah Okafor',side:'a'},
     {min:'69',player:'Casemiro',side:'h'}
   ],
   bookings:[
     {min:'26',player:'Matheus Cunha',side:'h',card:'yellow'},
     {min:'56',player:'Lisandro Martínez',side:'h',card:'red'}
   ]},

  // ===== 第 33 輪 (2026-04-18 ~ 04-21 台灣時間) =====

  // 布倫特福德 0-0 富勒姆 | 04/18 19:30 台灣時間
  {id:'EPL-MW33-BRE-FUL', matchday:33, date:'2026-04-18', time:'19:30', home:'BRE', away:'FUL', stage:'league',
   status:'finished', score:{h:0,a:0}, halfTime:{h:0,a:0},
   goals:[]},

  // 紐卡索 1-2 伯恩茅斯 | 04/18 22:00 台灣時間
  {id:'EPL-MW33-NEW-BOU', matchday:33, date:'2026-04-18', time:'22:00', home:'NEW', away:'BOU', stage:'league',
   status:'finished', score:{h:1,a:2}, halfTime:{h:0,a:1},
   goals:[
     {min:'32',player:'Marcus Tavernier',side:'a'},
     {min:'68',player:'William Osula',side:'h'},
     {min:'85',player:'Adrien Truffert',side:'a'}
   ]},

  // 里茲聯 3-0 狼隊 | 04/18 22:00 台灣時間
  {id:'EPL-MW33-LEE-WOL', matchday:33, date:'2026-04-18', time:'22:00', home:'LEE', away:'WOL', stage:'league',
   status:'finished', score:{h:3,a:0}, halfTime:{h:2,a:0},
   goals:[
     {min:'18',player:'James Justin',side:'h'},
     {min:'20',player:'Noah Okafor',side:'h'},
     {min:'90+5',player:'Dominic Calvert-Lewin',side:'h',type:'pen'}
   ]},

  // 熱刺 2-2 布萊頓 | 04/19 00:30 台灣時間
  {id:'EPL-MW33-TOT-BHA', matchday:33, date:'2026-04-19', time:'00:30', home:'TOT', away:'BHA', stage:'league',
   status:'finished', score:{h:2,a:2}, halfTime:{h:1,a:1},
   goals:[
     {min:'39',player:'Pedro Porro',side:'h'},
     {min:'45+3',player:'Kaoru Mitoma',side:'a'},
     {min:'77',player:'Xavi Simons',side:'h'},
     {min:'90+5',player:'Georginio Rutter',side:'a'}
   ]},

  // 切爾西 0-1 曼聯 | 04/19 03:00 台灣時間
  {id:'EPL-MW33-CHE-MUN', matchday:33, date:'2026-04-19', time:'03:00', home:'CHE', away:'MUN', stage:'league',
   status:'finished', score:{h:0,a:1}, halfTime:{h:0,a:1},
   goals:[
     {min:'43',player:'Matheus Cunha',side:'a'}
   ]},

  // 諾丁漢森林 4-1 伯恩利 | 04/19 21:00 台灣時間
  {id:'EPL-MW33-NFO-BUR', matchday:33, date:'2026-04-19', time:'21:00', home:'NFO', away:'BUR', stage:'league',
   status:'finished', score:{h:4,a:1}, halfTime:{h:0,a:1},
   goals:[
     {min:'45+2',player:'Zian Flemming',side:'a'},
     {min:'62',player:'Morgan Gibbs-White',side:'h'},
     {min:'69',player:'Morgan Gibbs-White',side:'h'},
     {min:'77',player:'Morgan Gibbs-White',side:'h'},
     {min:'90+8',player:'Igor Jesus',side:'h'}
   ]},

  // 阿斯頓維拉 4-3 桑德蘭 | 04/19 21:00 台灣時間
  {id:'EPL-MW33-AVL-SUN', matchday:33, date:'2026-04-19', time:'21:00', home:'AVL', away:'SUN', stage:'league',
   status:'finished', score:{h:4,a:3}, halfTime:{h:2,a:1},
   goals:[
     {min:'2',player:'Ollie Watkins',side:'h'},
     {min:'9',player:'Chris Rigg',side:'a'},
     {min:'36',player:'Ollie Watkins',side:'h'},
     {min:'46',player:'Morgan Rogers',side:'h'},
     {min:'86',player:'Trai Hume',side:'a'},
     {min:'87',player:'Wilson Isidor',side:'a'},
     {min:'90+3',player:'Tammy Abraham',side:'h'}
   ]},

  // 艾佛頓 1-2 利物浦 | 04/19 21:00 台灣時間
  {id:'EPL-MW33-EVE-LIV', matchday:33, date:'2026-04-19', time:'21:00', home:'EVE', away:'LIV', stage:'league',
   status:'finished', score:{h:1,a:2}, halfTime:{h:0,a:1},
   goals:[
     {min:'29',player:'Mohamed Salah',side:'a'},
     {min:'54',player:'Beto',side:'h'},
     {min:'100',player:'Virgil van Dijk',side:'a'}
   ]},

  // 曼城 2-1 兵工廠 | 04/19 23:30 台灣時間
  {id:'EPL-MW33-MCI-ARS', matchday:33, date:'2026-04-19', time:'23:30', home:'MCI', away:'ARS', stage:'league',
   status:'finished', score:{h:2,a:1}, halfTime:{h:1,a:1},
   goals:[
     {min:'16',player:'Rayan Cherki',side:'h'},
     {min:'18',player:'Kai Havertz',side:'a'},
     {min:'65',player:'Erling Haaland',side:'h'}
   ]},

  // 水晶宮 0-0 西漢姆 | 04/21 04:00 台灣時間
  {id:'EPL-MW33-CRY-WHU', matchday:33, date:'2026-04-21', time:'03:00', home:'CRY', away:'WHU', stage:'league',
   status:'finished', score:{h:0,a:0}, halfTime:{h:0,a:0},
   goals:[]},

  // ===== 第 34 輪 (2026-04-21 ~ 04-25 台灣時間) =====

  // 布萊頓 3-0 切爾西 | 04/21 19:30 台灣時間
  {id:'EPL-MW34-BHA-CHE', matchday:34, date:'2026-04-22', time:'03:00', home:'BHA', away:'CHE', stage:'league',
   status:'finished', score:{h:3,a:0}, halfTime:{h:1,a:0},
   goals:[
     {min:'3',player:'Ferdi Kadioglu',side:'h'},
     {min:'56',player:'Jack Hinshelwood',side:'h'},
     {min:'90+1',player:'Danny Welbeck',side:'h'}
   ]},

  // 伯恩茅斯 2-2 里茲聯 | 04/23 03:00 台灣時間
  {id:'EPL-MW34-BOU-LEE', matchday:34, date:'2026-04-23', time:'03:00', home:'BOU', away:'LEE', stage:'league',
   status:'finished', score:{h:2,a:2}, halfTime:{h:0,a:0},
   goals:[
     {min:'60',player:'Junior Kroupi',side:'h'},
     {min:'68',player:'James Hill',side:'a',type:'og'},
     {min:'86',player:'Rayan',side:'h'},
     {min:'90+7',player:'Sean Longstaff',side:'a'}
   ]},

  // 伯恩利 0-1 曼城 | 04/23 03:00 台灣時間 | 伯恩利確定降級
  {id:'EPL-MW34-BUR-MCI', matchday:34, date:'2026-04-23', time:'03:00', home:'BUR', away:'MCI', stage:'league',
   status:'finished', score:{h:0,a:1}, halfTime:{h:0,a:1},
   goals:[
     {min:'5',player:'Erling Haaland',side:'a'}
   ]},

  // 桑德蘭 0-5 諾丁漢森林 | 04/25 03:00 台灣時間 | 森林保級大捷
  {id:'EPL-MW34-SUN-NFO', matchday:34, date:'2026-04-25', time:'03:00', home:'SUN', away:'NFO', stage:'league',
   status:'finished', score:{h:0,a:5}, halfTime:{h:0,a:4},
   goals:[
     {min:'17',player:'Trai Hume',side:'h',type:'og'},
     {min:'31',player:'Chris Wood',side:'a'},
     {min:'34',player:'Morgan Gibbs-White',side:'a'},
     {min:'37',player:'Igor Jesus',side:'a'},
     {min:'90+5',player:'Elliot Anderson',side:'a'}
   ]},

  // 富勒姆 1-0 阿斯頓維拉 | 04/25 19:30 台灣時間
  {id:'EPL-MW34-FUL-AVL', matchday:34, date:'2026-04-25', time:'19:30', home:'FUL', away:'AVL', stage:'league',
   status:'finished', score:{h:1,a:0}, halfTime:{h:1,a:0},
   goals:[
     {min:'43',player:'Ryan Sessegnon',side:'h'}
   ]},

  // 利物浦 3-1 水晶宮 | 04/25 22:00 台灣時間
  {id:'EPL-MW34-LIV-CRY', matchday:34, date:'2026-04-25', time:'22:00', home:'LIV', away:'CRY', stage:'league',
   status:'finished', score:{h:3,a:1}, halfTime:{h:2,a:0},
   goals:[
     {min:'35',player:'Alexander Isak',side:'h'},
     {min:'40',player:'Andrew Robertson',side:'h'},
     {min:'71',player:'Daniel Muñoz',side:'a'},
     {min:'90+6',player:'Florian Wirtz',side:'h'}
   ]},

  // 西漢姆 2-1 艾佛頓 | 04/25 22:00 台灣時間
  {id:'EPL-MW34-WHU-EVE', matchday:34, date:'2026-04-25', time:'22:00', home:'WHU', away:'EVE', stage:'league',
   status:'finished', score:{h:2,a:1}, halfTime:{h:0,a:0},
   goals:[
     {min:'52',player:'Tomáš Souček',side:'h'},
     {min:'88',player:'Kalvin Dewsbury-Hall',side:'a'},
     {min:'90+3',player:'Callum Wilson',side:'h'}
   ]},

  // 狼隊 0-1 熱刺 | 04/25 22:00 台灣時間 | 熱刺終結15場不勝
  {id:'EPL-MW34-WOL-TOT', matchday:34, date:'2026-04-25', time:'22:00', home:'WOL', away:'TOT', stage:'league',
   status:'finished', score:{h:0,a:1}, halfTime:{h:0,a:0},
   goals:[
     {min:'82',player:'João Palhinha',side:'a'}
   ]},

  // 兵工廠 1-0 紐卡索 | 04/26 00:30 台灣時間 | 兵工廠重返榜首
  {id:'EPL-MW34-ARS-NEW', matchday:34, date:'2026-04-26', time:'00:30', home:'ARS', away:'NEW', stage:'league',
   status:'finished', score:{h:1,a:0}, halfTime:{h:1,a:0},
   goals:[
     {min:'9',player:'Eberechi Eze',side:'h'}
   ]},

  // ===== 第 35 輪 (2026-04-28 ~ 開始) =====
  // 曼聯 vs 布倫特福德 | 04/28 03:00 台灣時間 (Old Trafford 20:00 BST)
  {id:'EPL-MW35-MUN-BRE', matchday:35, date:'2026-04-28', time:'03:00', home:'MUN', away:'BRE', stage:'league',
   status:'finished', score:{h:2,a:1}, halfTime:{h:2,a:0},
   goals:[
     {min:'11',player:'Casemiro',side:'h'},
     {min:'43',player:'Benjamin Sesko',side:'h'},
     {min:'87',player:'Mathias Jensen',side:'a'}
   ]},

  // 利茲 vs 伯恩利 | 05/02 04:00 台灣時間 (05/01 21:00 BST)
  {id:'EPL-MW35-LEE-BUR', matchday:35, date:'2026-05-02', time:'04:00', home:'LEE', away:'BUR', stage:'league',
   status:'finished', score:{h:3,a:1}, halfTime:{h:1,a:0},
   goals:[
     {min:'8',player:'Anton Stach',side:'h'},
     {min:'52',player:'Noah Okafor',side:'h'},
     {min:'56',player:'Dominic Calvert-Lewin',side:'h'},
     {min:'71',player:'Loum Tchaouna',side:'a'}
   ]},

  // 阿斯頓維拉 vs 熱刺 | 05/02 20:30 台灣時間 (05/02 13:30 BST)
  {id:'EPL-MW35-AVL-TOT', matchday:35, date:'2026-05-02', time:'20:30', home:'AVL', away:'TOT', stage:'league', status:'upcoming'},

  // 伯恩茅斯 vs 水晶宮 | 05/02 23:00 台灣時間 (05/02 16:00 BST)
  {id:'EPL-MW35-BOU-CRY', matchday:35, date:'2026-05-02', time:'23:00', home:'BOU', away:'CRY', stage:'league', status:'upcoming'},

  // 布倫特福德 3-0 西漢姆 | 05/02 23:00 台灣時間
  {id:'EPL-MW35-BRE-WHU', matchday:35, date:'2026-05-02', time:'23:00', home:'BRE', away:'WHU', stage:'league',
   status:'finished', score:{h:3,a:0}, halfTime:{h:1,a:0},
   goals:[
     {min:'15',player:'Konstantinos Mavropanos',side:'h',type:'og'},
     {min:'54',player:'Igor Thiago',side:'h',type:'pen'},
     {min:'82',player:'Mikkel Damsgaard',side:'h'}
   ]},

  // 紐卡索 3-1 布萊頓 | 05/02 23:00 台灣時間
  {id:'EPL-MW35-NEW-BHA', matchday:35, date:'2026-05-02', time:'23:00', home:'NEW', away:'BHA', stage:'league',
   status:'finished', score:{h:3,a:1}, halfTime:{h:2,a:0},
   goals:[
     {min:'12',player:'William Osula',side:'h'},
     {min:'24',player:'Dan Burn',side:'h'},
     {min:'61',player:'Jack Hinshelwood',side:'a'},
     {min:'90+5',player:'Harvey Barnes',side:'h'}
   ]},

  // 狼隊 1-1 桑德蘭 | 05/02 23:00 台灣時間
  {id:'EPL-MW35-WOL-SUN', matchday:35, date:'2026-05-02', time:'23:00', home:'WOL', away:'SUN', stage:'league',
   status:'finished', score:{h:1,a:1}, halfTime:{h:0,a:1},
   goals:[
     {min:'17',player:'Nordi Mukiele',side:'a'},
     {min:'54',player:'Santiago Bueno',side:'h'}
   ]},

  // 兵工廠 3-0 富勒姆 | 05/03 01:30 台灣時間 (05/02 18:30 BST)
  {id:'EPL-MW35-ARS-FUL', matchday:35, date:'2026-05-03', time:'01:30', home:'ARS', away:'FUL', stage:'league',
   status:'finished', score:{h:3,a:0}, halfTime:{h:3,a:0},
   goals:[
     {min:'9',player:'Viktor Gyökeres',side:'h'},
     {min:'40',player:'Bukayo Saka',side:'h'},
     {min:'45+4',player:'Viktor Gyökeres',side:'h'}
   ]},

  // 曼聯 vs 利物浦 | 05/03 23:30 台灣時間 (05/03 16:30 BST)
  {id:'EPL-MW35-MUN-LIV', matchday:35, date:'2026-05-03', time:'23:30', home:'MUN', away:'LIV', stage:'league', status:'upcoming'},

  // 切爾西 vs 諾丁漢森林 | 05/04 23:00 台灣時間 (05/04 16:00 BST)
  {id:'EPL-MW35-CHE-NFO', matchday:35, date:'2026-05-04', time:'23:00', home:'CHE', away:'NFO', stage:'league', status:'upcoming'},

  // 愛華頓 vs 曼城 | 05/05 04:00 台灣時間 (05/04 21:00 BST)
  {id:'EPL-MW35-EVE-MCI', matchday:35, date:'2026-05-05', time:'04:00', home:'EVE', away:'MCI', stage:'league', status:'upcoming'},

  // ===== 第 36 輪 (2026-05-09 ~ 05-11 台灣時間) =====

  // 利物浦 vs 切爾西 | 05/09 19:30 台灣時間 (05/09 12:30 BST)
  {id:'EPL-MW36-LIV-CHE', matchday:36, date:'2026-05-09', time:'19:30', home:'LIV', away:'CHE', stage:'league', status:'upcoming'},

  // 布萊頓 vs 狼隊 | 05/09 22:00 台灣時間 (05/09 15:00 BST)
  {id:'EPL-MW36-BHA-WOL', matchday:36, date:'2026-05-09', time:'22:00', home:'BHA', away:'WOL', stage:'league', status:'upcoming'},

  // 伯恩利 vs 阿斯頓維拉 | 05/09 22:00 台灣時間
  {id:'EPL-MW36-BUR-AVL', matchday:36, date:'2026-05-09', time:'22:00', home:'BUR', away:'AVL', stage:'league', status:'upcoming'},

  // 水晶宮 vs 愛華頓 | 05/09 22:00 台灣時間
  {id:'EPL-MW36-CRY-EVE', matchday:36, date:'2026-05-09', time:'22:00', home:'CRY', away:'EVE', stage:'league', status:'upcoming'},

  // 富勒姆 vs 伯恩茅斯 | 05/09 22:00 台灣時間
  {id:'EPL-MW36-FUL-BOU', matchday:36, date:'2026-05-09', time:'22:00', home:'FUL', away:'BOU', stage:'league', status:'upcoming'},

  // 桑德蘭 vs 曼聯 | 05/09 22:00 台灣時間
  {id:'EPL-MW36-SUN-MUN', matchday:36, date:'2026-05-09', time:'22:00', home:'SUN', away:'MUN', stage:'league', status:'upcoming'},

  // 曼城 vs 布倫特福德 | 05/10 00:30 台灣時間 (05/09 17:30 BST)
  {id:'EPL-MW36-MCI-BRE', matchday:36, date:'2026-05-10', time:'00:30', home:'MCI', away:'BRE', stage:'league', status:'upcoming'},

  // 諾丁漢森林 vs 紐卡索 | 05/10 21:00 台灣時間 (05/10 14:00 BST)
  {id:'EPL-MW36-NFO-NEW', matchday:36, date:'2026-05-10', time:'21:00', home:'NFO', away:'NEW', stage:'league', status:'upcoming'},

  // 西漢姆 vs 兵工廠 | 05/10 23:30 台灣時間 (05/10 16:30 BST)
  {id:'EPL-MW36-WHU-ARS', matchday:36, date:'2026-05-10', time:'23:30', home:'WHU', away:'ARS', stage:'league', status:'upcoming'},

  // 熱刺 vs 里茲聯 | 05/11 23:00 台灣時間 (05/11 16:00 BST)
  {id:'EPL-MW36-TOT-LEE', matchday:36, date:'2026-05-11', time:'23:00', home:'TOT', away:'LEE', stage:'league', status:'upcoming'},

];

