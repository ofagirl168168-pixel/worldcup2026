/* =============================================
   EPL-DATA-TEAMS.JS — 2025/26 英超 20 支球隊資料
   隊徽：football-data.org CDN
   資料截止：2025/26 賽季（2026年4月）
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
      {name:'Kai Havertz',pos:'前鋒/中場',club:'兵工廠'}
    ],
    radar:{attack:90,defense:91,midfield:92,speed:87,experience:83},
    style:'高位壓迫，控球為主，邊路突破與定位球',
    strengths:['Arteta戰術體系成熟','Saka+Ødegaard創造力頂級','英超最穩固後防之一'],
    weaknesses:['關鍵戰偶有緊張','板凳深度不如曼城','缺乏頂級中鋒終結力'],
    recentForm:['W','W','D','W','W'],
    history:'13次英格蘭頂級聯賽冠軍，2003/04不敗賽季傳奇'
  },
  'LIV': {
    name:'Liverpool', nameCN:'利物浦', flag:'https://crests.football-data.org/64.png',
    league:'Premier League', eplRank:2, coach:'Arne Slot', formation:'4-3-3',
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
    recentForm:['W','W','W','D','W'],
    history:'19次英格蘭頂級聯賽冠軍，6次歐冠冠軍'
  },
  'MCI': {
    name:'Manchester City', nameCN:'曼城', flag:'https://crests.football-data.org/65.png',
    league:'Premier League', eplRank:3, coach:'Pep Guardiola', formation:'4-3-3',
    keyPlayers:[
      {name:'Erling Haaland',pos:'中鋒',club:'曼城'},
      {name:'Kevin De Bruyne',pos:'攻擊中場',club:'曼城'},
      {name:'Phil Foden',pos:'翼鋒/中場',club:'曼城'},
      {name:'Rodri',pos:'防守中場',club:'曼城'},
      {name:'Ederson',pos:'門將',club:'曼城'}
    ],
    radar:{attack:93,defense:88,midfield:93,speed:86,experience:92},
    style:'極致控球，位置輪轉，高位壓迫',
    strengths:['Haaland進球效率恐怖','Guardiola戰術無人能及','板凳深度聯賽最強'],
    weaknesses:['Rodri長期傷缺影響巨大','De Bruyne傷病風險','陣容老化需要更新'],
    recentForm:['W','D','W','L','W'],
    history:'9次英格蘭頂級聯賽冠軍，2022/23三冠王'
  },
  'CHE': {
    name:'Chelsea', nameCN:'乙爾西', flag:'https://crests.football-data.org/61.png',
    league:'Premier League', eplRank:4, coach:'Enzo Maresca', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Cole Palmer',pos:'攻擊中場/右翼',club:'乙爾西'},
      {name:'Enzo Fernández',pos:'中場',club:'乙爾西'},
      {name:'Moisés Caicedo',pos:'防守中場',club:'乙爾西'},
      {name:'Nicolas Jackson',pos:'前鋒',club:'乙爾西'},
      {name:'Levi Colwill',pos:'中後衛',club:'乙爾西'}
    ],
    radar:{attack:86,defense:82,midfield:85,speed:86,experience:72},
    style:'控球導向，中場掌控，快速轉換進攻',
    strengths:['Cole Palmer創造力爆表','年輕陣容潛力無限','中場組合強悍'],
    weaknesses:['陣容磨合仍在進行','經驗不足影響穩定性','防守偶有失誤'],
    recentForm:['W','D','W','W','L'],
    history:'6次英格蘭頂級聯賽冠軍，2次歐冠冠軍'
  },
  'MUN': {
    name:'Manchester United', nameCN:'曼聯', flag:'https://crests.football-data.org/66.png',
    league:'Premier League', eplRank:7, coach:'Rúben Amorim', formation:'3-4-3',
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
    recentForm:['L','W','D','W','L'],
    history:'20次英格蘭頂級聯賽冠軍，3次歐冠冠軍，英格蘭最成功俱樂部'
  },
  'TOT': {
    name:'Tottenham Hotspur', nameCN:'熱刺', flag:'https://crests.football-data.org/73.png',
    league:'Premier League', eplRank:8, coach:'Ange Postecoglou', formation:'4-3-3',
    keyPlayers:[
      {name:'Heung-Min Son',pos:'前鋒/左翼',club:'熱刺'},
      {name:'James Maddison',pos:'攻擊中場',club:'熱刺'},
      {name:'Dominic Solanke',pos:'前鋒',club:'熱刺'},
      {name:'Cristian Romero',pos:'中後衛',club:'熱刺'},
      {name:'Micky van de Ven',pos:'中後衛',club:'熱刺'}
    ],
    radar:{attack:85,defense:77,midfield:83,speed:87,experience:78},
    style:'進攻足球，高位壓迫，後場出球',
    strengths:['Son進攻效率依然頂級','後防線速度極快','Postecoglou進攻哲學吸引人'],
    weaknesses:['傷兵名單長期居高不下','關鍵戰心態不穩','陣容深度不足'],
    recentForm:['W','L','W','D','W'],
    history:'2次英格蘭頂級聯賽冠軍，2019歐冠亞軍'
  },
  'NEW': {
    name:'Newcastle United', nameCN:'紐卡索', flag:'https://crests.football-data.org/67.png',
    league:'Premier League', eplRank:5, coach:'Eddie Howe', formation:'4-3-3',
    keyPlayers:[
      {name:'Alexander Isak',pos:'前鋒',club:'紐卡索'},
      {name:'Bruno Guimarães',pos:'中場',club:'紐卡索'},
      {name:'Anthony Gordon',pos:'左翼',club:'紐卡索'},
      {name:'Sandro Tonali',pos:'中場',club:'紐卡索'},
      {name:'Sven Botman',pos:'中後衛',club:'紐卡索'}
    ],
    radar:{attack:87,defense:85,midfield:86,speed:86,experience:76},
    style:'快速反擊，邊路衝擊，高強度防守',
    strengths:['Isak進球效率英超頂尖','中場Bruno+Tonali雙核強勢','整體戰術執行力高'],
    weaknesses:['板凳深度仍不夠頂級','歐冠+英超雙線作戰疲勞','傷病時缺乏替代方案'],
    recentForm:['W','W','W','D','W'],
    history:'4次英格蘭頂級聯賽冠軍，近年在沙特資金注入後重返強隊行列'
  },
  'AVL': {
    name:'Aston Villa', nameCN:'阿斯頓維拉', flag:'https://crests.football-data.org/58.png',
    league:'Premier League', eplRank:6, coach:'Unai Emery', formation:'4-2-3-1',
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
    recentForm:['D','W','W','L','W'],
    history:'7次英格蘭頂級聯賽冠軍，1982年歐冠冠軍'
  },

  // ===== 中游球隊 =====
  'BHA': {
    name:'Brighton & Hove Albion', nameCN:'布萊頓', flag:'https://crests.football-data.org/397.png',
    league:'Premier League', eplRank:9, coach:'Fabian Hürzeler', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Kaoru Mitoma',pos:'左翼',club:'布萊頓'},
      {name:'João Pedro',pos:'前鋒',club:'布萊頓'},
      {name:'Carlos Baleba',pos:'中場',club:'布萊頓'},
      {name:'Lewis Dunk',pos:'中後衛',club:'布萊頓'},
      {name:'Yankuba Minteh',pos:'右翼',club:'布萊頓'}
    ],
    radar:{attack:80,defense:77,midfield:80,speed:82,experience:65},
    style:'後場組織出球，控球進攻，數據驅動招募',
    strengths:['球探系統發掘天才','戰術執行力高','年輕球員發展好'],
    weaknesses:['關鍵球員被挖角風險','經驗不足','進攻終結效率偶有波動'],
    recentForm:['D','W','L','W','D'],
    history:'近年從英甲升至英超穩定中游，數據化管理典範'
  },
  'BOU': {
    name:'AFC Bournemouth', nameCN:'伯恩茅斯', flag:'https://crests.football-data.org/1044.png',
    league:'Premier League', eplRank:10, coach:'Andoni Iraola', formation:'4-3-3',
    keyPlayers:[
      {name:'Dominic Solanke',pos:'前鋒',club:'伯恩茅斯'},
      {name:'Justin Kluivert',pos:'翼鋒',club:'伯恩茅斯'},
      {name:'Antoine Semenyo',pos:'右翼',club:'伯恩茅斯'},
      {name:'Lewis Cook',pos:'中場',club:'伯恩茅斯'},
      {name:'Milos Kerkez',pos:'左後衛',club:'伯恩茅斯'}
    ],
    radar:{attack:78,defense:74,midfield:76,speed:80,experience:62},
    style:'高壓逼搶，快速轉換，直接進攻',
    strengths:['Iraola壓迫體系有效','球員拼搶意志強','反擊速度快'],
    weaknesses:['陣容深度不足','對陣強隊經驗少','定位球防守不穩'],
    recentForm:['W','L','D','W','L'],
    history:'2015年首次升上英超，近年穩定在英超中游'
  },
  'FUL': {
    name:'Fulham', nameCN:'富勒姆', flag:'https://crests.football-data.org/63.png',
    league:'Premier League', eplRank:11, coach:'Marco Silva', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Rodrigo Muniz',pos:'前鋒',club:'富勒姆'},
      {name:'Andreas Pereira',pos:'攻擊中場',club:'富勒姆'},
      {name:'Antonee Robinson',pos:'左後衛',club:'富勒姆'},
      {name:'João Palhinha',pos:'防守中場',club:'富勒姆'},
      {name:'Bernd Leno',pos:'門將',club:'富勒姆'}
    ],
    radar:{attack:76,defense:76,midfield:78,speed:77,experience:70},
    style:'控球穩健，邊路推進，防守組織嚴謹',
    strengths:['Marco Silva戰術紀律好','Robinson邊路推進犀利','整體平衡性佳'],
    weaknesses:['進攻火力不夠頂尖','板凳深度一般','客場表現較弱'],
    recentForm:['D','D','W','L','W'],
    history:'倫敦老牌球會，曾在2010年打進歐霸決賽'
  },
  'BRE': {
    name:'Brentford', nameCN:'布倫特福德', flag:'https://crests.football-data.org/402.png',
    league:'Premier League', eplRank:12, coach:'Thomas Frank', formation:'4-3-3',
    keyPlayers:[
      {name:'Bryan Mbeumo',pos:'右翼/前鋒',club:'布倫特福德'},
      {name:'Yoane Wissa',pos:'前鋒',club:'布倫特福德'},
      {name:'Mikkel Damsgaard',pos:'攻擊中場',club:'布倫特福德'},
      {name:'Christian Nørgaard',pos:'中場',club:'布倫特福德'},
      {name:'Nathan Collins',pos:'中後衛',club:'布倫特福德'}
    ],
    radar:{attack:79,defense:74,midfield:76,speed:79,experience:64},
    style:'直接打法，定位球威脅大，邊路傳中',
    strengths:['Mbeumo進攻爆發力強','Thomas Frank戰術靈活','定位球得分率高'],
    weaknesses:['陣容深度有限','對陣強隊防守壓力大','長期傷兵影響'],
    recentForm:['W','L','W','D','L'],
    history:'2021年首次升上英超，以數據化管理聞名'
  },
  'NFO': {
    name:'Nottingham Forest', nameCN:'諾丁漢森林', flag:'https://crests.football-data.org/351.png',
    league:'Premier League', eplRank:13, coach:'Nuno Espírito Santo', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Chris Wood',pos:'前鋒',club:'諾丁漢森林'},
      {name:'Morgan Gibbs-White',pos:'攻擊中場',club:'諾丁漢森林'},
      {name:'Callum Hudson-Odoi',pos:'翼鋒',club:'諾丁漢森林'},
      {name:'Murillo',pos:'中後衛',club:'諾丁漢森林'},
      {name:'Matz Sels',pos:'門將',club:'諾丁漢森林'}
    ],
    radar:{attack:76,defense:78,midfield:75,speed:78,experience:68},
    style:'紀律防守，快速反擊，硬朗對抗',
    strengths:['Nuno防守體系穩固','Wood進球穩定性高','團隊防守意志強'],
    weaknesses:['創造力不足','過度依賴反擊','關鍵球員深度不夠'],
    recentForm:['D','W','L','W','D'],
    history:'2次歐冠冠軍（1979、1980），英格蘭足球傳奇俱樂部'
  },
  'CRY': {
    name:'Crystal Palace', nameCN:'水晶宮', flag:'https://crests.football-data.org/354.png',
    league:'Premier League', eplRank:14, coach:'Oliver Glasner', formation:'3-4-3',
    keyPlayers:[
      {name:'Eberechi Eze',pos:'攻擊中場',club:'水晶宮'},
      {name:'Michael Olise',pos:'右翼',club:'水晶宮'},
      {name:'Jean-Philippe Mateta',pos:'前鋒',club:'水晶宮'},
      {name:'Marc Guéhi',pos:'中後衛',club:'水晶宮'},
      {name:'Adam Wharton',pos:'中場',club:'水晶宮'}
    ],
    radar:{attack:78,defense:75,midfield:77,speed:82,experience:66},
    style:'邊路速度衝擊，定位球戰術，反擊犀利',
    strengths:['Eze創造力出色','邊路速度優勢明顯','Glasner戰術提升防守'],
    weaknesses:['陣容深度不足','進攻過度依賴個人能力','客場拿分困難'],
    recentForm:['L','D','W','W','L'],
    history:'倫敦南部老牌球會，從未贏得頂級聯賽冠軍'
  },
  'WHU': {
    name:'West Ham United', nameCN:'西漢姆', flag:'https://crests.football-data.org/563.png',
    league:'Premier League', eplRank:15, coach:'Julen Lopetegui', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Mohammed Kudus',pos:'攻擊中場/翼鋒',club:'西漢姆'},
      {name:'Jarrod Bowen',pos:'右翼',club:'西漢姆'},
      {name:'Lucas Paquetá',pos:'攻擊中場',club:'西漢姆'},
      {name:'Edson Álvarez',pos:'防守中場',club:'西漢姆'},
      {name:'Alphonse Areola',pos:'門將',club:'西漢姆'}
    ],
    radar:{attack:78,defense:73,midfield:77,speed:79,experience:72},
    style:'直接進攻，邊路傳中，定位球',
    strengths:['Kudus個人能力突出','Bowen進攻穩定','歐戰經驗有底蘊'],
    weaknesses:['防守不夠穩固','陣容融合仍在進行','主場優勢不夠明顯'],
    recentForm:['L','L','W','D','W'],
    history:'1965年歐洲盃賽冠軍盃冠軍，2023年歐協聯冠軍'
  },
  'WOL': {
    name:'Wolverhampton Wanderers', nameCN:'狼隊', flag:'https://crests.football-data.org/76.png',
    league:'Premier League', eplRank:16, coach:'Gary O\'Neil', formation:'4-4-2',
    keyPlayers:[
      {name:'Matheus Cunha',pos:'前鋒/攻擊中場',club:'狼隊'},
      {name:'Hwang Hee-Chan',pos:'前鋒',club:'狼隊'},
      {name:'Mario Lemina',pos:'中場',club:'狼隊'},
      {name:'Rayan Aït-Nouri',pos:'左後衛',club:'狼隊'},
      {name:'José Sá',pos:'門將',club:'狼隊'}
    ],
    radar:{attack:75,defense:72,midfield:73,speed:78,experience:66},
    style:'快速轉換，反擊為主，身體對抗',
    strengths:['Matheus Cunha攻擊核心','反擊速度快','葡萄牙系球員默契好'],
    weaknesses:['陣容厚度不足','整體質量差距','保級壓力下心態波動'],
    recentForm:['L','D','L','W','D'],
    history:'3次英格蘭頂級聯賽冠軍，1970年代黃金時期'
  },
  'EVE': {
    name:'Everton', nameCN:'艾佛頓', flag:'https://crests.football-data.org/62.png',
    league:'Premier League', eplRank:17, coach:'Sean Dyche', formation:'4-4-2',
    keyPlayers:[
      {name:'Abdoulaye Doucouré',pos:'中場',club:'艾佛頓'},
      {name:'Dwight McNeil',pos:'翼鋒',club:'艾佛頓'},
      {name:'Dominic Calvert-Lewin',pos:'前鋒',club:'艾佛頓'},
      {name:'James Tarkowski',pos:'中後衛',club:'艾佛頓'},
      {name:'Jordan Pickford',pos:'門將',club:'艾佛頓'}
    ],
    radar:{attack:70,defense:73,midfield:71,speed:74,experience:74},
    style:'硬朗防守，直接長球，定位球',
    strengths:['Dyche防守紀律嚴明','Pickford撲救穩定','團隊拼搏精神強'],
    weaknesses:['進攻火力嚴重不足','財政公平法限制引援','創造力匱乏'],
    recentForm:['L','D','L','D','L'],
    history:'9次英格蘭頂級聯賽冠軍，利物浦同城宿敵'
  },

  // ===== 升班馬 / 下游球隊 =====
  'LEE': {
    name:'Leeds United', nameCN:'里茲聯', flag:'https://crests.football-data.org/341.png',
    league:'Premier League', eplRank:18, coach:'Daniel Farke', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Crysencio Summerville',pos:'翼鋒',club:'里茲聯'},
      {name:'Georginio Rutter',pos:'攻擊中場',club:'里茲聯'},
      {name:'Willy Gnonto',pos:'翼鋒',club:'里茲聯'},
      {name:'Ethan Ampadu',pos:'中場/中衛',club:'里茲聯'},
      {name:'Illan Meslier',pos:'門將',club:'里茲聯'}
    ],
    radar:{attack:74,defense:68,midfield:73,speed:79,experience:58},
    style:'控球進攻，高位壓迫，年輕有活力',
    strengths:['年輕球員速度快','主場氣氛狂熱','進攻人才儲備不錯'],
    weaknesses:['英超經驗不足','防守是最大弱點','對頂級球隊差距大'],
    recentForm:['L','W','L','L','D'],
    history:'3次英格蘭頂級聯賽冠軍，Don Revie時代傳奇，睽違一年重返英超'
  },
  'BUR': {
    name:'Burnley', nameCN:'伯恩利', flag:'https://crests.football-data.org/328.png',
    league:'Premier League', eplRank:19, coach:'Scott Parker', formation:'4-4-2',
    keyPlayers:[
      {name:'Lyle Foster',pos:'前鋒',club:'伯恩利'},
      {name:'Sander Berge',pos:'中場',club:'伯恩利'},
      {name:'Josh Brownhill',pos:'中場',club:'伯恩利'},
      {name:'Dara O\'Shea',pos:'中後衛',club:'伯恩利'},
      {name:'James Trafford',pos:'門將',club:'伯恩利'}
    ],
    radar:{attack:68,defense:70,midfield:69,speed:73,experience:60},
    style:'硬朗防守，直接打法，身體對抗',
    strengths:['防守意志頑強','主場難以攻克','定位球戰術有效'],
    weaknesses:['進攻創造力嚴重不足','英超水平球員不夠','升班馬經驗限制'],
    recentForm:['L','L','D','L','L'],
    history:'2次英格蘭頂級聯賽冠軍，近年在英超與英冠間來回'
  },
  'SHU': {
    name:'Sheffield United', nameCN:'錫菲聯', flag:'https://crests.football-data.org/356.png',
    league:'Premier League', eplRank:20, coach:'Chris Wilder', formation:'3-5-2',
    keyPlayers:[
      {name:'Gus Hamer',pos:'中場',club:'錫菲聯'},
      {name:'Cameron Archer',pos:'前鋒',club:'錫菲聯'},
      {name:'Vini Souza',pos:'防守中場',club:'錫菲聯'},
      {name:'Anel Ahmedhodžić',pos:'中後衛',club:'錫菲聯'},
      {name:'Michael Cooper',pos:'門將',club:'錫菲聯'}
    ],
    radar:{attack:66,defense:68,midfield:67,speed:72,experience:56},
    style:'三後衛體系，翼衛推進，團隊防守',
    strengths:['Wilder戰術體系有經驗','團隊精神強','主場拼搶積極'],
    weaknesses:['個人能力差距大','進攻火力嚴重不足','降級區常客'],
    recentForm:['L','L','L','D','L'],
    history:'1次英格蘭頂級聯賽冠軍（1898），2019/20賽季表現驚艷全英超'
  }
};

// 導出到 window
window.EPL_TEAMS = EPL_TEAMS;

// 聯賽沒有固定賽程表 — 比賽資料由 API 即時取得
// EPL_MATCHES 初始為空陣列，由 epl-live-loader.js 填入
window.EPL_MATCHES = [];
