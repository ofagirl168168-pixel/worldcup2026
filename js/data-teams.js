/* =============================================
   DATA-TEAMS.JS — 2026 FIFA世界盃 35支球隊資料
   FIFA排名：依據2025年最新排名
   近期狀態：依據真實賽事結果（歐洲盃/美洲盃/非洲盃等）
   資料截止：2025年8月
   ============================================= */

const TEAMS = {

  // ===== 實際賽程A組球隊 =====
  'MEX': {
    name:'Mexico', nameCN:'墨西哥', flag:'🇲🇽', group:'A', conf:'CONCACAF', fifaRank:15,
    coach:'Javier Aguirre', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Santiago Giménez',pos:'中鋒',club:'費耶諾德'},
      {name:'Edson Álvarez',pos:'後腰',club:'西漢姆聯'},
      {name:'Hirving Lozano',pos:'右翼',club:'自由身'},
      {name:'Raúl Jiménez',pos:'前鋒',club:'富勒姆'},
      {name:'Guillermo Ochoa',pos:'門將',club:'待定'}
    ],
    radar:{attack:74,defense:72,midfield:74,speed:76,experience:84},
    style:'控球組織，中場串聯，利用邊路空間',
    strengths:['Giménez禁區效率高','主辦國之一，球迷支持強大','Aguirre大賽備戰豐富'],
    weaknesses:['連七屆十六強止步的心理魔咒','後衛線偶有失誤','缺乏穩定主力中場'],
    history:'連續七屆世界盃均止步十六強，2026主辦國之一',
    recentForm:['W','W','W','D','D'],
    predTitle:'打破十六強魔咒', predOdds:'16-1', predDesc:'主辦國之一，Giménez成長為世界級中鋒，2026必須突破詛咒'
  },
  'KOR': {
    name:'South Korea', nameCN:'韓國', flag:'🇰🇷', group:'A', conf:'AFC', fifaRank:25,
    coach:'Hong Myung-bo', formation:'4-3-3',
    keyPlayers:[
      {name:'Son Heung-min',pos:'左翼/前鋒',club:'LAFC'},
      {name:'Lee Kang-in',pos:'攻擊中場',club:'巴黎聖日耳曼'},
      {name:'Kim Min-jae',pos:'中後衛',club:'拜仁慕尼黑'},
      {name:'Hwang Hee-chan',pos:'前鋒',club:'狼隊'},
      {name:'Jo Hyeon-woo',pos:'門將',club:'蔚山'}
    ],
    radar:{attack:74,defense:74,midfield:76,speed:80,experience:80},
    style:'積極壓迫，快速轉換，以Son為進攻核心',
    strengths:['Son+Kim Min-jae+Lee Kang-in歐洲頂聯班底','整體壓迫紀律強','2002精神傳承'],
    weaknesses:['過度依賴Son','教練與球員溝通問題','右翼位置稍弱'],
    history:'2002年主場四強（傳奇）；近屆十六強常客',
    recentForm:['W','W','D','W','W'],
    predTitle:'亞洲最完整陣容', predOdds:'20-1', predDesc:'歐洲豪門球員密度創歷史新高，首次進八強並非遙不可及'
  },

  // ===== 實際賽程B組球隊 =====
  'CAN': {
    name:'Canada', nameCN:'加拿大', flag:'🇨🇦', group:'B', conf:'CONCACAF', fifaRank:30,
    coach:'Jesse Marsch', formation:'4-3-3',
    keyPlayers:[
      {name:'Alphonso Davies',pos:'左後衛',club:'拜仁慕尼黑'},
      {name:'Jonathan David',pos:'中鋒',club:'尤文圖斯'},
      {name:'Tajon Buchanan',pos:'翼鋒',club:'比利亞雷阿爾'},
      {name:'Cyle Larin',pos:'前鋒',club:'待定'},
      {name:'Milan Borjan',pos:'門將',club:'紅星'}
    ],
    radar:{attack:78,defense:70,midfield:70,speed:84,experience:62},
    style:'快速邊路衝擊，以Davies和Buchanan的速度撕裂對方',
    strengths:['Davies是世界最佳左後衛之一','David進球效率在歐洲頂尖','主辦國之一，主場優勢'],
    weaknesses:['中場組織欠成熟','防守線整體水準偏弱','大賽核心經驗稀少'],
    history:'2022年打破36年沉默首次世界盃；2024美洲盃四強',
    recentForm:['W','W','D','L','W'],
    predTitle:'北美主辦國驚喜', predOdds:'18-1', predDesc:'Davies+David是CONCACAF最危險組合，B組出線具備實力'
  },
  'SUI': {
    name:'Switzerland', nameCN:'瑞士', flag:'🇨🇭', group:'B', conf:'UEFA', fifaRank:19,
    coach:'Murat Yakin', formation:'3-4-2-1',
    keyPlayers:[
      {name:'Granit Xhaka',pos:'中場',club:'桑德蘭'},
      {name:'Manuel Akanji',pos:'後衛',club:'曼城'},
      {name:'Yann Sommer',pos:'門將',club:'國際米蘭'},
      {name:'Remo Freuler',pos:'中場',club:'諾丁漢森林'},
      {name:'Ruben Vargas',pos:'左翼',club:'奧格斯堡'}
    ],
    radar:{attack:72,defense:76,midfield:76,speed:70,experience:84},
    style:'三後衛穩固防線，中場積極搶斷，快速直傳',
    strengths:['防守組織嚴謹','Xhaka中場主導力強','連續多屆穩定出線'],
    weaknesses:['缺乏改變比賽的天才球員','進攻火力不足','大賽止步八強難突破'],
    history:'近四屆世界盃均晉級淘汰賽；2024歐洲盃八強負英格蘭',
    recentForm:['W','D','W','W','L'],
    predTitle:'歐洲最穩定中游強隊', predOdds:'35-1', predDesc:'出線幾乎是保障，但能否在淘汰賽打出驚喜？'
  },
  'QAT': {
    name:'Qatar', nameCN:'卡達', flag:'🇶🇦', group:'B', conf:'AFC', fifaRank:44,
    coach:'Marquez López', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Akram Afif',pos:'翼鋒',club:'Al-Sadd'},
      {name:'Almoez Ali',pos:'中鋒',club:'Al-Duhail'},
      {name:'Hassan Al-Haydos',pos:'中場',club:'Al-Sadd'},
      {name:'Bassam Al-Rawi',pos:'後衛',club:'Al-Duhail'},
      {name:'Meshaal Barsham',pos:'門將',club:'Al-Sadd'}
    ],
    radar:{attack:62,defense:62,midfield:60,speed:66,experience:60},
    style:'控球型打法，依賴Afif個人能力',
    strengths:['2023年亞洲盃衛冕冠軍','Afif是亞洲最佳球員之一','充足備戰時間'],
    weaknesses:['2022主場小組全敗陰影','缺乏頂尖聯賽歷練','整體與頂強差距明顯'],
    history:'2022主辦世界盃，史上首支主辦國小組出局球隊',
    recentForm:['W','D','D','L','W'],
    predTitle:'力求擺脫陰影', predOdds:'250-1', predDesc:'Afif帶領卡達以2023亞洲盃冠軍重建信心'
  },

  // ===== 實際賽程C組球隊 =====
  'BRA': {
    name:'Brazil', nameCN:'巴西', flag:'🇧🇷', group:'C', conf:'CONMEBOL', fifaRank:6,
    coach:'Carlo Ancelotti', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Vinícius Jr.',pos:'左翼',club:'皇家馬德里'},
      {name:'Rodrygo',pos:'右翼',club:'皇家馬德里'},
      {name:'Endrick',pos:'中鋒',club:'皇家馬德里'},
      {name:'Alisson',pos:'門將',club:'利物浦'},
      {name:'Marquinhos',pos:'中後衛',club:'巴黎聖日耳曼'}
    ],
    radar:{attack:90,defense:80,midfield:84,speed:92,experience:98},
    style:'快速邊路滲透，雙翼速度撕裂對方防線',
    strengths:['Vinícius Jr.是現役最具威脅的邊鋒','皇馬三劍客進攻威力驚人','五冠世界盃底蘊'],
    weaknesses:['中場核心缺乏Casemiro傳承者','關鍵淘汰賽心理包袱沉重','Ancelotti體系尚在磨合'],
    history:'五次世界盃冠軍（1958/1962/1970/1994/2002），史上最多',
    recentForm:['W','D','W','W','L'],
    predTitle:'奪冠熱門', predOdds:'4-1', predDesc:'Vinícius+Rodrygo+Endrick，三人均在皇馬效力，是本屆最強攻擊線之一'
  },
  'MAR': {
    name:'Morocco', nameCN:'摩洛哥', flag:'🇲🇦', group:'C', conf:'CAF', fifaRank:8,
    coach:'Mohamed Ouahbi', formation:'4-1-4-1',
    keyPlayers:[
      {name:'Achraf Hakimi',pos:'右後衛',club:'巴黎聖日耳曼'},
      {name:'Hakim Ziyech',pos:'翼鋒',club:'Wydad AC'},
      {name:'Youssef En-Nesyri',pos:'中鋒',club:'費內巴切'},
      {name:'Sofyan Amrabat',pos:'防守中場',club:'貝蒂斯（租借）'},
      {name:'Yassine Bounou',pos:'門將',club:'Al-Hilal'}
    ],
    radar:{attack:78,defense:84,midfield:76,speed:80,experience:82},
    style:'緊密防守組織，充分利用Hakimi邊路突破',
    strengths:['2022四強精神傳承','Hakimi是世界頂級右後衛','防守組織是非洲最佳'],
    weaknesses:['中場創造力有限','複製2022奇蹟的心理壓力','Amrabat去向影響中場穩定性'],
    history:'2022首支進四強的非洲/阿拉伯世界球隊',
    recentForm:['W','W','D','D','W'],
    predTitle:'非洲真正強隊', predOdds:'15-1', predDesc:'摩洛哥已非黑馬，而是世界級大賽強隊'
  },
  'SCO': {
    name:'Scotland', nameCN:'蘇格蘭', flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', group:'C', conf:'UEFA', fifaRank:43,
    coach:'Steve Clarke', formation:'3-4-3',
    keyPlayers:[
      {name:'Andrew Robertson',pos:'左後衛',club:'利物浦'},
      {name:'Scott McTominay',pos:'中場',club:'那不勒斯'},
      {name:'John McGinn',pos:'中場',club:'阿斯頓維拉'},
      {name:'Callum McGregor',pos:'中場',club:'凱爾特人'},
      {name:'Lyndon Dykes',pos:'前鋒',club:'待定'}
    ],
    radar:{attack:68,defense:72,midfield:72,speed:70,experience:68},
    style:'三後衛穩固防線，中場積極搶斷，快速推進',
    strengths:['Robertson世界頂級左後衛','McTominay那不勒斯大爆發','整體紀律嚴明'],
    weaknesses:['缺乏進攻火力','前鋒位置無世界級球員','2024歐洲盃小組出局陰影'],
    history:'多年未能參賽，2024歐洲盃小組未能出線',
    recentForm:['D','W','W','D','L'],
    predTitle:'蘇格蘭高地回歸', predOdds:'100-1', predDesc:'Robertson領銜，蘇格蘭目標在C組製造驚喜'
  },

  // ===== 實際賽程D組球隊 =====
  'USA': {
    name:'USA', nameCN:'美國', flag:'🇺🇸', group:'D', conf:'CONCACAF', fifaRank:16,
    coach:'Mauricio Pochettino', formation:'4-3-3',
    keyPlayers:[
      {name:'Christian Pulisic',pos:'翼鋒/攻擊中場',club:'AC米蘭'},
      {name:'Weston McKennie',pos:'中場',club:'尤文圖斯'},
      {name:'Tyler Adams',pos:'後腰',club:'伯恩茅斯'},
      {name:'Giovanni Reyna',pos:'攻擊中場',club:'門興格拉德巴赫'},
      {name:'Matt Turner',pos:'門將',club:'諾丁漢森林'}
    ],
    radar:{attack:74,defense:72,midfield:72,speed:78,experience:68},
    style:'積極壓迫，快速轉換，Pulisic主導進攻',
    strengths:['主辦國之一，主場優勢極大','Pulisic在AC米蘭成長為世界級','年輕陣容渴望成名'],
    weaknesses:['缺乏中鋒','後防整體不穩','大賽主場壓力難以預測'],
    history:'1994年主辦（八強），2022年十六強，2024美洲盃主辦但小組出局',
    recentForm:['W','D','L','W','W'],
    predTitle:'主場翻身的最大舞台', predOdds:'12-1', predDesc:'美國有史以來最強一代，Pulisic+Adams是中場核心'
  },
  'AUS': {
    name:'Australia', nameCN:'澳洲', flag:'🇦🇺', group:'D', conf:'AFC', fifaRank:27,
    coach:'Tony Popović', formation:'4-4-2',
    keyPlayers:[
      {name:'Mat Ryan',pos:'門將',club:'哥本哈根'},
      {name:'Harry Souttar',pos:'後衛',club:'萊切斯特城'},
      {name:'Mathew Leckie',pos:'右翼',club:'墨爾本城'},
      {name:'Martin Boyle',pos:'翼鋒',club:'帕納辛奈科斯'},
      {name:'Riley McGree',pos:'中場',club:'米德斯堡'}
    ],
    radar:{attack:66,defense:72,midfield:64,speed:70,experience:70},
    style:'積極逼搶，防守反擊，整體組織為主',
    strengths:['整體跑動積極，體能充沛','門將Mat Ryan穩定','大賽不怯場（2022十六強）'],
    weaknesses:['進攻缺乏創意','個人技術與頂強差距明顯','Popović執教首場大賽'],
    history:'2006年八強；2022年十六強，近屆表現逐步提升',
    recentForm:['W','D','W','L','W'],
    predTitle:'亞洲挑戰者', predOdds:'80-1', predDesc:'澳洲的積極整體足球可能令強隊感到不適'
  },

  // ===== 實際賽程E組球隊 =====
  'GER': {
    name:'Germany', nameCN:'德國', flag:'🇩🇪', group:'E', conf:'UEFA', fifaRank:10,
    coach:'Julian Nagelsmann', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Florian Wirtz',pos:'攻擊中場',club:'拜耳勒沃庫森'},
      {name:'Jamal Musiala',pos:'中場',club:'拜仁慕尼黑'},
      {name:'Joshua Kimmich',pos:'右後衛/後腰',club:'拜仁慕尼黑'},
      {name:'Kai Havertz',pos:'前鋒',club:'兵工廠'},
      {name:'Antonio Rüdiger',pos:'後衛',club:'皇家馬德里'}
    ],
    radar:{attack:84,defense:80,midfield:84,speed:80,experience:96},
    style:'高強度壓迫加快速傳控，Wirtz+Musiala雙核創造力',
    strengths:['Wirtz+Musiala是世界最令人興奮的中場組合','體系完整有深度','2024歐洲盃主場激情帶動'],
    weaknesses:['2018/2022小組出局心理陰影','中鋒位置未完全解決','克羅斯退役後中場組織稍弱'],
    history:'四次世界盃冠軍（1954/1974/1990/2014）；2024歐洲盃主場八強',
    recentForm:['W','W','W','W','W'],
    predTitle:'重返巔峰的戰車', predOdds:'6-1', predDesc:'Wirtz和Musiala的雙核心是本屆最令人期待的中場，德國渴望重現榮光'
  },
  'ECU': {
    name:'Ecuador', nameCN:'厄瓜多', flag:'🇪🇨', group:'E', conf:'CONMEBOL', fifaRank:23,
    coach:'Sebastián Beccacece', formation:'4-3-3',
    keyPlayers:[
      {name:'Moisés Caicedo',pos:'防守中場',club:'切爾西'},
      {name:'Piero Hincapié',pos:'後衛',club:'拜耳勒沃庫森'},
      {name:'Gonzalo Plata',pos:'翼鋒',club:'待定'},
      {name:'Jeremy Sarmiento',pos:'翼鋒',club:'布萊頓'},
      {name:'Alexander Domínguez',pos:'門將',club:'待定'}
    ],
    radar:{attack:70,defense:70,midfield:68,speed:72,experience:68},
    style:'快節奏直接打法，強調體能與速度',
    strengths:['Caicedo是世界最佳防守中場之一','Hincapié後防穩固','整體跑動積極'],
    weaknesses:['進攻創意有限','缺乏世界級中鋒','Beccacece上任初期尚在磨合'],
    history:'2022年以開幕戰登場亮相，十六強負塞內加爾',
    recentForm:['W','W','D','W','L'],
    predTitle:'南美黑馬', predOdds:'50-1', predDesc:'Caicedo在Chelsea的磨練讓厄瓜多中場質素大幅提升'
  },
  'CIV': {
    name:'Ivory Coast', nameCN:'象牙海岸', flag:'🇨🇮', group:'E', conf:'CAF', fifaRank:34,
    coach:'Emerse Faé', formation:'4-3-3',
    keyPlayers:[
      {name:'Sébastien Haller',pos:'中鋒',club:'烏特勒支'},
      {name:'Simon Adingra',pos:'翼鋒',club:'布萊頓'},
      {name:'Franck Kessié',pos:'中場',club:'Al-Ahli'},
      {name:'Yahia Fofana',pos:'門將',club:'昂熱'},
      {name:'Serge Aurier',pos:'右後衛',club:'待定'}
    ],
    radar:{attack:70,defense:66,midfield:68,speed:74,experience:72},
    style:'快速邊路進攻，Haller禁區終結',
    strengths:['2023非洲盃冠軍，信心高漲','Haller從重病康復後鬥志更強','Adingra速度出色'],
    weaknesses:['防守整體稍弱','中場組織創造力有限','Faé執教大賽經驗相對少'],
    history:'2023非洲盃主場奪冠；Drogba時代黃金記憶',
    recentForm:['W','D','W','W','L'],
    predTitle:'非洲盃冠軍衝擊世界', predOdds:'45-1', predDesc:'2023非洲盃捧盃後，象牙海岸整體信心與默契大幅提升'
  },

  // ===== 實際賽程F組球隊 =====
  'NED': {
    name:'Netherlands', nameCN:'荷蘭', flag:'🇳🇱', group:'F', conf:'UEFA', fifaRank:7,
    coach:'Ronald Koeman', formation:'4-3-3',
    keyPlayers:[
      {name:'Virgil van Dijk',pos:'中後衛',club:'利物浦'},
      {name:'Frenkie de Jong',pos:'中場',club:'巴塞隆納'},
      {name:'Xavi Simons',pos:'攻擊中場',club:'熱刺'},
      {name:'Cody Gakpo',pos:'翼鋒',club:'利物浦'},
      {name:'Tijjani Reijnders',pos:'中場',club:'曼城'}
    ],
    radar:{attack:84,defense:82,midfield:82,speed:80,experience:90},
    style:'全能足球現代詮釋，位置互換與逼搶並重',
    strengths:['Van Dijk是世界最佳中後衛之一','Simons是下一個天才','整體足球智商高'],
    weaknesses:['大賽關鍵時刻歷史性失常','中鋒位置選擇有限','更衣室歷史問題'],
    history:'三次世界盃亞軍（1974/1978/2010）；2024歐洲盃四強',
    recentForm:['W','W','L','W','D'],
    predTitle:'等待首冠的橙衣軍團', predOdds:'8-1', predDesc:'VVD+Simons+Gakpo，荷蘭陣容是近20年最強一代'
  },
  'JPN': {
    name:'Japan', nameCN:'日本', flag:'🇯🇵', group:'F', conf:'AFC', fifaRank:18,
    coach:'Hajime Moriyasu', formation:'4-3-3',
    keyPlayers:[
      {name:'Takefusa Kubo',pos:'右翼',club:'皇家社會'},
      {name:'Wataru Endo',pos:'後腰',club:'利物浦'},
      {name:'Hiroki Ito',pos:'後衛',club:'拜仁慕尼黑'},
      {name:'Junya Ito',pos:'翼鋒',club:'蘭斯'},
      {name:'Daichi Kamada',pos:'中場',club:'待定'}
    ],
    radar:{attack:76,defense:74,midfield:78,speed:82,experience:78},
    style:'高強度壓迫，快速短傳滲透，歐洲頂聯風格',
    strengths:['歐洲豪門球員比例創歷史新高','戰術紀律嚴明','2022擊敗德國西班牙底氣'],
    weaknesses:['身體對抗偏弱','缺乏世界級中鋒','大比分落後時容易崩潰'],
    history:'2022年爆冷德國、西班牙，十六強負克羅埃西亞（點球）',
    recentForm:['W','W','W','D','W'],
    predTitle:'亞洲最強挑戰者', predOdds:'22-1', predDesc:'2022的黑馬，2026的正規強隊，日本首進八強並非遙不可及'
  },
  'TUN': {
    name:'Tunisia', nameCN:'突尼西亞', flag:'🇹🇳', group:'F', conf:'CAF', fifaRank:44,
    coach:'Faouzi Benzarti', formation:'4-3-3',
    keyPlayers:[
      {name:'Hannibal Mejbri',pos:'中場',club:'塞維利亞'},
      {name:'Wahbi Khazri',pos:'前鋒',club:'待定'},
      {name:'Ellyes Skhiri',pos:'中場',club:'法蘭克福'},
      {name:'Aïssa Laïdouni',pos:'中場',club:'待定'},
      {name:'Aymen Dahmen',pos:'門將',club:'待定'}
    ],
    radar:{attack:62,defense:66,midfield:62,speed:66,experience:72},
    style:'防守嚴密，整體戰術，邊路快速反擊',
    strengths:['Hannibal Mejbri年輕天賦出色','整體紀律嚴明','曾擊敗2022法國正選陣容'],
    weaknesses:['缺乏世界級球員','進攻創意嚴重不足','教練組更換頻繁不穩定'],
    history:'2022擊敗衛冕冠軍法國（Deschamps輪換陣），但仍未出線',
    recentForm:['D','W','D','W','L'],
    predTitle:'北非伏兵', predOdds:'200-1', predDesc:'突尼西亞靠組織力量而非個人天才，冷門潛力不可忽視'
  },

  // ===== 實際賽程G組球隊 =====
  'BEL': {
    name:'Belgium', nameCN:'比利時', flag:'🇧🇪', group:'G', conf:'UEFA', fifaRank:9,
    coach:'Rudi Garcia', formation:'4-3-3',
    keyPlayers:[
      {name:'Kevin De Bruyne',pos:'中場',club:'拿坡里'},
      {name:'Romelu Lukaku',pos:'中鋒',club:'拿坡里'},
      {name:'Jeremy Doku',pos:'右翼',club:'曼城'},
      {name:'Thibaut Courtois',pos:'門將',club:'皇家馬德里'},
      {name:'Arthur Theate',pos:'後衛',club:'雷恩'}
    ],
    radar:{attack:82,defense:76,midfield:86,speed:78,experience:90},
    style:'De Bruyne組織，Lukaku終結，攻守皆強',
    strengths:['De Bruyne是世界最完整的中場之一','Courtois是世界頂級門將','Doku年輕爆發力強'],
    weaknesses:['黃金一代步入末期','後衛線老化','大賽關鍵時刻心理問題'],
    history:'黃金一代最佳成績2018三名，從未拿過主要冠軍',
    recentForm:['W','W','W','W','D'],
    predTitle:'黃金一代最後機會', predOdds:'8-1', predDesc:'De Bruyne+Lukaku+Courtois的最後同台，不拿冠軍將是永遠遺憾'
  },
  'IRN': {
    name:'Iran', nameCN:'伊朗', flag:'🇮🇷', group:'G', conf:'AFC', fifaRank:21,
    coach:'Amir Ghalenoei', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Mehdi Taremi',pos:'中鋒',club:'奧林匹亞科斯'},
      {name:'Alireza Jahanbakhsh',pos:'翼鋒',club:'費內巴切'},
      {name:'Sardar Azmoun',pos:'前鋒',club:'待定'},
      {name:'Ali Gholizadeh',pos:'翼鋒',club:'待定'},
      {name:'Alireza Beiranvand',pos:'門將',club:'待定'}
    ],
    radar:{attack:66,defense:72,midfield:65,speed:68,experience:76},
    style:'防守嚴密，依靠Taremi個人終結能力',
    strengths:['Taremi在國米磨練後水準大幅提升','整體組織穩定','亞洲最有韌性的球隊'],
    weaknesses:['除Taremi外進攻創造力有限','防守線趨向老化','缺乏快速邊翼'],
    history:'多次世界盃參賽；2022年在強組也能拿到積分',
    recentForm:['W','D','W','L','W'],
    predTitle:'亞洲最頑強球隊', predOdds:'90-1', predDesc:'Taremi在歐洲的蛻變讓伊朗進攻完全不同'
  },
  'EGY': {
    name:'Egypt', nameCN:'埃及', flag:'🇪🇬', group:'G', conf:'CAF', fifaRank:29,
    coach:'Hossam Hassan', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Mohamed Salah',pos:'右翼/前鋒',club:'利物浦'},
      {name:'Omar Marmoush',pos:'前鋒',club:'曼城'},
      {name:'Mohamed El-Shenawy',pos:'門將',club:'Al-Ahly'},
      {name:'Ahmed Hegazi',pos:'後衛',club:'待定'},
      {name:'Mostafa Mohamed',pos:'中鋒',club:'待定'}
    ],
    radar:{attack:76,defense:68,midfield:68,speed:72,experience:72},
    style:'以Salah為核心的進攻，強調邊路突破',
    strengths:['Salah是世界級球員，仍在狀態巔峰','Marmoush崛起提供第二威脅','七次非洲盃冠軍傳承'],
    weaknesses:['過度依賴Salah','防守整體水準偏弱','中場組織創造力不足'],
    history:'七次非洲盃冠軍（歷史最多）；世界盃出賽次數有限',
    recentForm:['W','D','W','D','W'],
    predTitle:'埃及法老最後衝擊', predOdds:'35-1', predDesc:'Salah+Marmoush組合，讓埃及擁有史上最強攻擊搭檔'
  },
  'NZL': {
    name:'New Zealand', nameCN:'紐西蘭', flag:'🇳🇿', group:'G', conf:'OFC', fifaRank:97,
    coach:'Darren Bazeley', formation:'4-4-2',
    keyPlayers:[
      {name:'Chris Wood',pos:'中鋒',club:'諾丁漢森林'},
      {name:'Joe Bell',pos:'中場',club:'待定'},
      {name:'Clayton Lewis',pos:'中場',club:'待定'},
      {name:'Liberato Cacace',pos:'後衛',club:'埃姆波利'},
      {name:'Michael Woud',pos:'門將',club:'待定'}
    ],
    radar:{attack:56,defense:58,midfield:54,speed:62,experience:52},
    style:'防守為主，依靠定位球與Chris Wood的制空權',
    strengths:['Chris Wood是有效率的禁區球員','整體拼勁十足','對抗強隊往往頑強到底'],
    weaknesses:['整體水準與頂強差距懸殊','缺乏頂尖聯賽球員','進攻手段單一'],
    history:'大洋洲代表，世界盃出賽次數稀少',
    recentForm:['W','L','D','W','L'],
    predTitle:'大洋洲代表', predOdds:'500-1', predDesc:'紐西蘭以奮戰精神和組織足球挑戰世界'
  },

  // ===== 實際賽程H組球隊 =====
  'ESP': {
    name:'Spain', nameCN:'西班牙', flag:'🇪🇸', group:'H', conf:'UEFA', fifaRank:2,
    coach:'Luis de la Fuente', formation:'4-3-3',
    keyPlayers:[
      {name:'Lamine Yamal',pos:'右翼',club:'巴塞隆納'},
      {name:'Pedri',pos:'中場',club:'巴塞隆納'},
      {name:'Rodri',pos:'後腰',club:'曼城'},
      {name:'Álvaro Morata',pos:'中鋒',club:'AC米蘭'},
      {name:'Dani Carvajal',pos:'右後衛',club:'皇家馬德里'}
    ],
    radar:{attack:87,defense:83,midfield:93,speed:82,experience:96},
    style:'傳控足球進化版，高強度逼搶加快速短傳',
    strengths:['中場天賦豐富，Pedri+Rodri無可匹敵','Yamal是本屆最令人期待的天才','2024歐洲盃衛冕'],
    weaknesses:['Rodri/Carvajal傷病後恢復情況存疑','中鋒位置長期問題','對平衡攻守依賴Rodri過深'],
    history:'一次世界盃（2010）＋三次歐洲盃（2008/2012/2024），傳控足球代名詞',
    recentForm:['W','D','W','W','D'],
    predTitle:'歐洲盃衛冕冠軍', predOdds:'4-1', predDesc:'連莊歐洲盃冠軍，Yamal橫空出世，西班牙是本屆最完整的球隊'
  },
  'URU': {
    name:'Uruguay', nameCN:'烏拉圭', flag:'🇺🇾', group:'H', conf:'CONMEBOL', fifaRank:17,
    coach:'Marcelo Bielsa', formation:'4-3-3',
    keyPlayers:[
      {name:'Darwin Núñez',pos:'中鋒',club:'Al-Hilal'},
      {name:'Federico Valverde',pos:'中場',club:'皇家馬德里'},
      {name:'Ronald Araújo',pos:'後衛',club:'巴塞隆納'},
      {name:'Rodrigo Bentancur',pos:'中場',club:'熱刺'},
      {name:'Sergio Rochet',pos:'門將',club:'Nacional'}
    ],
    radar:{attack:80,defense:82,midfield:80,speed:77,experience:90},
    style:'Bielsa高強度全場壓迫，快速直接南美風格',
    strengths:['Valverde是世界最完整的中場球員之一','Núñez爆發力驚人','Bielsa戰術革命成效顯著'],
    weaknesses:['Bielsa體系適應期','高壓迫消耗體能影響後半段','防守偶爾因壓迫過深而空虛'],
    history:'兩次世界盃冠軍（1930/1950）；2024美洲盃四強',
    recentForm:['W','D','W','D','D'],
    predTitle:'Bielsa的烏拉圭革命', predOdds:'18-1', predDesc:'Valverde是南美最被低估的球員，烏拉圭令人耳目一新'
  },
  'KSA': {
    name:'Saudi Arabia', nameCN:'沙烏地阿拉伯', flag:'🇸🇦', group:'H', conf:'AFC', fifaRank:56,
    coach:'Hervé Renard', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Salem Al-Dawsari',pos:'翼鋒',club:'Al-Hilal'},
      {name:'Mohammed Al-Owais',pos:'門將',club:'Al-Hilal'},
      {name:'Saleh Al-Shehri',pos:'前鋒',club:'Al-Hilal'},
      {name:'Saud Abdulhamid',pos:'後衛',club:'羅馬'},
      {name:'Mohammed Al-Qashawihe',pos:'中場',club:'Al-Nassr'}
    ],
    radar:{attack:65,defense:66,midfield:62,speed:66,experience:62},
    style:'緊密防守，尋找快速反擊與定位球機會',
    strengths:['2022爆冷阿根廷證明能力','Al-Hilal本土班底默契好','主聯賽水準提升'],
    weaknesses:['歐洲頂尖聯賽歷練不足','整體深度有限','缺乏創造力中場'],
    history:'2022年小組賽擊敗最終冠軍阿根廷，震驚全球',
    recentForm:['L','W','D','W','L'],
    predTitle:'潛在冷門製造者', predOdds:'200-1', predDesc:'曾讓阿根廷跌眼鏡，爆冷能力不可輕視'
  },

  // ===== 實際賽程I組球隊 =====
  'FRA': {
    name:'France', nameCN:'法國', flag:'🇫🇷', group:'I', conf:'UEFA', fifaRank:1,
    coach:'Didier Deschamps', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Kylian Mbappé',pos:'中鋒/翼鋒',club:'皇家馬德里'},
      {name:'Ousmane Dembélé',pos:'右翼',club:'巴黎聖日耳曼'},
      {name:'Aurélien Tchouaméni',pos:'防守中場',club:'皇家馬德里'},
      {name:'William Saliba',pos:'中後衛',club:'兵工廠'},
      {name:'Mike Maignan',pos:'門將',club:'AC米蘭'}
    ],
    radar:{attack:94,defense:85,midfield:88,speed:92,experience:96},
    style:'個人能力與整體配合並重，Mbappé主導快速轉換',
    strengths:['Mbappé是現役最快速最全面的球員','陣容深度驚人','冠軍基因強烈（1998/2018）'],
    weaknesses:['更衣室內部團結歷史問題','Deschamps戰術偏保守','Mbappé未必百分百與體系融合'],
    history:'兩次世界盃冠軍（1998/2018），2022年亞軍',
    recentForm:['W','W','W','W','W'],
    predTitle:'奪冠最大熱門', predOdds:'3-1', predDesc:'Mbappé在皇馬磨練後更成熟，法國是本屆奪冠最大熱門'
  },
  'SEN': {
    name:'Senegal', nameCN:'塞內加爾', flag:'🇸🇳', group:'I', conf:'CAF', fifaRank:14,
    coach:'Pape Thiaw', formation:'4-3-3',
    keyPlayers:[
      {name:'Sadio Mané',pos:'前鋒',club:'Al-Nassr'},
      {name:'Ismaila Sarr',pos:'翼鋒',club:'水晶宮'},
      {name:'Édouard Mendy',pos:'門將',club:'Al-Ahli'},
      {name:'Kalidou Koulibaly',pos:'後衛',club:'Al-Hilal'},
      {name:'Idrissa Gueye',pos:'中場',club:'伊芙頓'}
    ],
    radar:{attack:76,defense:74,midfield:72,speed:82,experience:76},
    style:'Mané為核心的快速進攻，強調邊路突破',
    strengths:['Mané雖年齡漸大但仍具決定性影響力','Koulibaly後防領袖','整體運動能力出色'],
    weaknesses:['Mané逐漸老化（33歲）','中場創造力不足','缺乏世界級終結者'],
    history:'2002年四強（非洲最佳）；2022年衛冕非洲盃冠軍後十六強出局',
    recentForm:['W','W','D','W','W'],
    predTitle:'非洲代表強隊', predOdds:'22-1', predDesc:'Mané帶領的塞內加爾是本屆最被期待的非洲球隊之一'
  },

  // ===== 實際賽程J組球隊 =====
  'ARG': {
    name:'Argentina', nameCN:'阿根廷', flag:'🇦🇷', group:'J', conf:'CONMEBOL', fifaRank:3,
    coach:'Lionel Scaloni', formation:'4-3-3',
    keyPlayers:[
      {name:'Lionel Messi',pos:'自由人/前鋒',club:'邁阿密國際'},
      {name:'Julián Álvarez',pos:'中鋒',club:'馬德里競技'},
      {name:'Enzo Fernández',pos:'中場',club:'切爾西'},
      {name:'Rodrigo De Paul',pos:'中場',club:'馬德里競技'},
      {name:'Emiliano Martínez',pos:'門將',club:'阿斯頓維拉'}
    ],
    radar:{attack:92,defense:80,midfield:85,speed:80,experience:99},
    style:'Messi自由串聯，充分利用各球員跑位空間',
    strengths:['Messi壓軸演出（最後世界盃）','2022冠軍班底幾乎完整','Álvarez是頂尖二前鋒'],
    weaknesses:['Messi年齡與體能問題','防線核心Otamendi老化','過度依賴Messi靈光一閃'],
    history:'三次世界盃冠軍（1978/1986/2022）；2024美洲盃衛冕冠軍',
    recentForm:['W','W','W','W','W'],
    predTitle:'衛冕冠軍', predOdds:'5-1', predDesc:'Messi最後一次世界盃，阿根廷全隊拼盡一切為他完成謝幕'
  },
  'AUT': {
    name:'Austria', nameCN:'奧地利', flag:'🇦🇹', group:'J', conf:'UEFA', fifaRank:24,
    coach:'Ralf Rangnick', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Marcel Sabitzer',pos:'中場',club:'多特蒙德'},
      {name:'Konrad Laimer',pos:'中場',club:'拜仁慕尼黑'},
      {name:'Christoph Baumgartner',pos:'攻擊中場',club:'萊比錫'},
      {name:'Marko Arnautović',pos:'前鋒',club:'貝爾格勒紅星'},
      {name:'Patrick Pentz',pos:'門將',club:'雷恩'}
    ],
    radar:{attack:74,defense:74,midfield:74,speed:74,experience:70},
    style:'Rangnick高強度全場壓迫體系，注重整體高效',
    strengths:['Rangnick戰術革命成效顯著','中場整體性強','2024歐洲盃小組頭名出線'],
    weaknesses:['缺乏超級巨星','David Alaba長期傷缺','進攻火力有限'],
    history:'多屆世界盃缺席後復出；2024歐洲盃八強負土耳其',
    recentForm:['W','W','W','D','L'],
    predTitle:'歐洲最大黑馬之一', predOdds:'35-1', predDesc:'Rangnick的奧地利是本屆最令人期待的中游強隊'
  },
  'ALG': {
    name:'Algeria', nameCN:'阿爾及利亞', flag:'🇩🇿', group:'J', conf:'CAF', fifaRank:28,
    coach:'Vladimir Petković', formation:'4-3-3',
    keyPlayers:[
      {name:'Riyad Mahrez',pos:'翼鋒',club:'Al-Ahli'},
      {name:'Ismaël Bennacer',pos:'中場',club:'AC米蘭'},
      {name:'Ramy Bensebaini',pos:'後衛',club:'多特蒙德'},
      {name:'Mohamed Amoura',pos:'前鋒',club:'沃爾夫斯堡'},
      {name:'Houssem Aouar',pos:'中場',club:'貝蒂斯'}
    ],
    radar:{attack:68,defense:66,midfield:68,speed:72,experience:74},
    style:'Mahrez個人能力主導，快速邊路進攻',
    strengths:['Mahrez仍是非洲最技術性球員之一','Bennacer中場組織強','2019非洲盃冠軍'],
    weaknesses:['Mahrez年齡逐漸成問題','2022未能出線的傷痛','整體配合時好時壞'],
    history:'2019非洲盃冠軍；2022未能出線世界盃',
    recentForm:['W','D','W','W','D'],
    predTitle:'北非技術流', predOdds:'70-1', predDesc:'Mahrez帶領阿爾及利亞重返世界盃，渴望重現2019榮光'
  },

  // ===== 實際賽程K組球隊 =====
  'POR': {
    name:'Portugal', nameCN:'葡萄牙', flag:'🇵🇹', group:'K', conf:'UEFA', fifaRank:5,
    coach:'Roberto Martínez', formation:'4-3-3',
    keyPlayers:[
      {name:'Bruno Fernandes',pos:'攻擊中場',club:'曼聯'},
      {name:'Bernardo Silva',pos:'中場',club:'曼城'},
      {name:'Rafael Leão',pos:'左翼',club:'AC米蘭'},
      {name:'Rúben Dias',pos:'後衛',club:'曼城'},
      {name:'Diogo Costa',pos:'門將',club:'波爾圖'}
    ],
    radar:{attack:88,defense:82,midfield:86,speed:78,experience:95},
    style:'依靠個人天才，兼顧控球與快速轉換',
    strengths:['Bruno+Bernardo世界頂級中場組合','Leão邊路爆發力驚人','Rúben Dias後防領袖'],
    weaknesses:['Ronaldo角色定位影響整體戰術','中鋒位置無明確接班人','更衣室壓力管理'],
    history:'2016歐洲盃冠軍；2019歐國聯冠軍；世界盃最佳四強（1966）',
    recentForm:['L','W','W','D','W'],
    predTitle:'葡萄牙最強一代', predOdds:'7-1', predDesc:'後Ronaldo時代，Bruno+Leão+Bernardo組成的葡萄牙更完整'
  },
  'COL': {
    name:'Colombia', nameCN:'哥倫比亞', flag:'🇨🇴', group:'K', conf:'CONMEBOL', fifaRank:13,
    coach:'Néstor Lorenzo', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Luis Díaz',pos:'左翼',club:'利物浦'},
      {name:'James Rodríguez',pos:'攻擊中場',club:'明尼蘇達聯'},
      {name:'Richard Ríos',pos:'中場',club:'帕梅拉斯'},
      {name:'Davinson Sánchez',pos:'後衛',club:'待定'},
      {name:'Camilo Vargas',pos:'門將',club:'待定'}
    ],
    radar:{attack:82,defense:72,midfield:80,speed:82,experience:80},
    style:'進攻創意豐富，James組織加Díaz突破',
    strengths:['2024美洲盃決賽，28場不敗紀錄','Díaz在利物浦打出世界級水準','James Rodríguez仍有大賽魔法'],
    weaknesses:['防守中場不夠強硬','後衛線整體偏弱','過度依賴James組織'],
    history:'2014年八強（James獲金靴）；2024美洲盃亞軍',
    recentForm:['W','W','W','W','L'],
    predTitle:'南美最強後起之秀', predOdds:'18-1', predDesc:'2024美洲盃亞軍，哥倫比亞達到近年最強狀態'
  },
  'UZB': {
    name:'Uzbekistan', nameCN:'烏茲別克', flag:'🇺🇿', group:'K', conf:'AFC', fifaRank:50,
    coach:'Srecko Katanec', formation:'4-4-2',
    keyPlayers:[
      {name:'Eldor Shomurodov',pos:'中鋒',club:'巴薩克赫爾'},
      {name:'Jaloliddin Masharipov',pos:'翼鋒',club:'待定'},
      {name:'Otabek Shukurov',pos:'門將',club:'待定'},
      {name:'Bobur Abdixoliqov',pos:'翼鋒',club:'待定'},
      {name:'Abbosbek Fayzullaev',pos:'中場',club:'待定'}
    ],
    radar:{attack:62,defense:60,midfield:58,speed:62,experience:50},
    style:'整體防守組織，尋找快速反擊',
    strengths:['Shomurodov在義甲的歷練','整體跑動積極','首次世界盃充滿動力'],
    weaknesses:['整體水準與強隊差距明顯','缺乏頂尖國際大賽經驗','陣容深度嚴重不足'],
    history:'首次參加世界盃決賽圈，中亞足球歷史性突破',
    recentForm:['W','D','W','L','D'],
    predTitle:'中亞首次亮相', predOdds:'600-1', predDesc:'烏茲別克的首次世界盃是整個中亞足球的驕傲'
  },

  // ===== 實際賽程L組球隊 =====
  'ENG': {
    name:'England', nameCN:'英格蘭', flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', group:'L', conf:'UEFA', fifaRank:4,
    coach:'Thomas Tuchel', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Jude Bellingham',pos:'中場',club:'皇家馬德里'},
      {name:'Harry Kane',pos:'中鋒',club:'拜仁慕尼黑'},
      {name:'Bukayo Saka',pos:'右翼',club:'兵工廠'},
      {name:'Phil Foden',pos:'中場',club:'曼城'},
      {name:'Jordan Pickford',pos:'門將',club:'艾佛頓'}
    ],
    radar:{attack:90,defense:82,midfield:87,speed:83,experience:86},
    style:'快速直接的現代英式足球，強調個人能力與高位逼搶',
    strengths:['Bellingham+Kane是世界最強中鋒中場搭檔之一','攻擊線陣容深度極強','2024歐洲盃決賽底氣'],
    weaknesses:['大賽關鍵時刻心理脆弱','後衛線偶有失誤','Tuchel體系磨合期'],
    history:'1966年唯一冠軍；近年2018四強、2021/2024歐洲盃亞軍',
    recentForm:['W','W','W','D','L'],
    predTitle:'等待60年的夢想', predOdds:'5-1', predDesc:'Bellingham和Kane組合無解，這一代是英格蘭史上最強'
  },
  'CRO': {
    name:'Croatia', nameCN:'克羅埃西亞', flag:'🇭🇷', group:'L', conf:'UEFA', fifaRank:11,
    coach:'Zlatko Dalić', formation:'4-3-3',
    keyPlayers:[
      {name:'Luka Modrić',pos:'中場',club:'AC米蘭'},
      {name:'Joško Gvardiol',pos:'後衛',club:'曼城'},
      {name:'Mateo Kovačić',pos:'中場',club:'曼城'},
      {name:'Andrej Kramarić',pos:'前鋒',club:'霍芬海姆'},
      {name:'Dominik Livaković',pos:'門將',club:'費內巴切'}
    ],
    radar:{attack:72,defense:80,midfield:86,speed:68,experience:96},
    style:'中場控制為核心，耐心持球，適時反擊',
    strengths:['Modrić的中場領導無可取代','Gvardiol是世界頂級後衛','2018亞軍2022季軍底氣'],
    weaknesses:['進攻火力有限','主力陣容老化','缺乏速度型邊鋒'],
    history:'2018亞軍、2022季軍，近兩屆連續四強',
    recentForm:['W','W','W','W','L'],
    predTitle:'老將最後出征', predOdds:'20-1', predDesc:'Modrić最後一屆世界盃，克羅埃西亞的中場韌性仍是一流'
  },
  'PAN': {
    name:'Panama', nameCN:'巴拿馬', flag:'🇵🇦', group:'L', conf:'CONCACAF', fifaRank:33,
    coach:'Thomas Christiansen', formation:'4-4-2',
    keyPlayers:[
      {name:'Ismael Díaz',pos:'前鋒',club:'波爾圖'},
      {name:'Adalberto Carrasquilla',pos:'中場',club:'待定'},
      {name:'Rolando Blackburn',pos:'前鋒',club:'待定'},
      {name:'José Luis Rodríguez',pos:'後衛',club:'待定'},
      {name:'Orlando Mosquera',pos:'門將',club:'待定'}
    ],
    radar:{attack:60,defense:64,midfield:58,speed:64,experience:60},
    style:'防守組織嚴密，五中場反擊',
    strengths:['防守紀律嚴明','Ismael Díaz是波爾圖新星','整體拼勁十足'],
    weaknesses:['進攻火力嚴重不足','個人技術有限','缺乏改變比賽的球員'],
    history:'2018年首次世界盃；2024年達到美洲盃四強',
    recentForm:['D','W','D','D','W'],
    predTitle:'中美洲守門員', predOdds:'400-1', predDesc:'巴拿馬靠防守與鬥志贏得出線，期望創造更多驚喜'
  },
  'GHA': {
    name:'Ghana', nameCN:'迦納', flag:'🇬🇭', group:'L', conf:'CAF', fifaRank:60,
    coach:'Otto Addo', formation:'4-3-3',
    keyPlayers:[
      {name:'Mohammed Kudus',pos:'攻擊中場/翼鋒',club:'熱刺'},
      {name:'Thomas Partey',pos:'後腰',club:'兵工廠'},
      {name:'Antoine Semenyo',pos:'翼鋒',club:'伯恩茅斯'},
      {name:'Jordan Ayew',pos:'前鋒',club:'待定'},
      {name:'Lawrence Ati-Zigi',pos:'門將',club:'聖加侖'}
    ],
    radar:{attack:70,defense:64,midfield:66,speed:74,experience:70},
    style:'個人能力驅動，依靠Kudus的創造力',
    strengths:['Kudus是西漢姆的明星','Partey後腰組織能力強','非洲之星傳統'],
    weaknesses:['防守不夠穩定','缺乏強力中鋒','整體配合有時鬆散'],
    history:'2010年距離四強僅差一個（Suárez）點球，非洲之星',
    recentForm:['W','D','W','L','W'],
    predTitle:'非洲技術流', predOdds:'65-1', predDesc:'Kudus+Partey的組合是迦納近年最佳中場陣容'
  }
};

// 洲際聯盟標籤
const CONF_LABELS = {
  'UEFA':'歐洲', 'CONMEBOL':'南美洲', 'CAF':'非洲',
  'AFC':'亞洲', 'CONCACAF':'北中美洲', 'OFC':'大洋洲'
};

// 分組定義（由 data-fix.js 覆蓋為正確分組）
const GROUPS = {
  A: { name:'A組', teams:['MEX','KOR','RSA','EUPD'], color:'#e53935' },
  B: { name:'B組', teams:['CAN','SUI','QAT','EUPA'], color:'#1e88e5' },
  C: { name:'C組', teams:['BRA','MAR','SCO','HAI'], color:'#43a047' },
  D: { name:'D組', teams:['USA','PAR','AUS','EUPC'], color:'#8e24aa' },
  E: { name:'E組', teams:['GER','ECU','CIV','CUW'], color:'#f4511e' },
  F: { name:'F組', teams:['NED','JPN','TUN','EUPB'], color:'#00acc1' },
  G: { name:'G組', teams:['BEL','IRN','EGY','NZL'], color:'#fdd835' },
  H: { name:'H組', teams:['ESP','URU','KSA','CPV'], color:'#f06292' },
  I: { name:'I組', teams:['FRA','SEN','NOR','ICP2'], color:'#26a69a' },
  J: { name:'J組', teams:['ARG','AUT','ALG','JOR'], color:'#7e57c2' },
  K: { name:'K組', teams:['POR','COL','UZB','ICP1'], color:'#ff7043' },
  L: { name:'L組', teams:['ENG','CRO','PAN','GHA'], color:'#66bb6a' }
};
