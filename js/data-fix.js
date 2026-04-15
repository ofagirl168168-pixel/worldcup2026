/* data-fix.js — 根據FIFA官方資料修正分組與球隊 */

// 補充缺少的球隊
Object.assign(TEAMS, {
  'RSA': { name:'South Africa', nameCN:'南非', flag:'🇿🇦', group:'A', conf:'CAF', fifaRank:67,
    coach:'Hugo Broos', formation:'4-4-2',
    keyPlayers:[
      {name:'Percy Tau',pos:'前鋒',club:'Al-Ahly'},
      {name:'Ronwen Williams',pos:'門將',club:'Mamelodi Sundowns'},
      {name:'Bongani Zungu',pos:'中場',club:'Amiens'}
    ],
    radar:{attack:60,defense:64,midfield:59,speed:68,experience:60},
    style:'防守反擊，強調速度與集體紀律',
    strengths:['AFCON 2024 四強實力','Percy Tau個人能力突出','Ronwen Williams是非洲頂級門將'],
    weaknesses:['進攻創意有限','缺乏世界大賽經驗','中場組織偏弱'],
    history:'2010年主辦世界盃，是首個舉辦世界盃的非洲國家，2024年非洲盃四強',
    recentForm:['L','L','W','W','D'],
    predTitle:'非洲黑馬', predOdds:'200-1', predDesc:'2024非洲盃打入四強，有一定實力，但世界盃是全新挑戰' },

  'HAI': { name:'Haiti', nameCN:'海地', flag:'🇭🇹', group:'C', conf:'CONCACAF', fifaRank:83,
    coach:'Marc Collat', formation:'4-4-2',
    keyPlayers:[
      {name:'Duckens Nazon',pos:'前鋒',club:'待定'},
      {name:'James Léa Siliki',pos:'中場',club:'Stade Rennais'},
      {name:'Steeven Saba',pos:'前鋒',club:'待定'}
    ],
    radar:{attack:54,defense:54,midfield:51,speed:67,experience:44},
    style:'快速邊路，整體壓迫', strengths:['首次世界盃士氣高昂','速度優勢','雙法裔球員加強中場'],
    weaknesses:['整體水準與強隊差距大','大賽經驗極少'],
    history:'首次參加世界盃決賽圈，CONCACAF附加賽晉級',
    recentForm:['W','D','W','W','L'],
    predTitle:'加勒比海驚喜', predOdds:'800-1', predDesc:'海地史上首次世界盃，整個加勒比海地區的驕傲' },

  'PAR': { name:'Paraguay', nameCN:'巴拉圭', flag:'🇵🇾', group:'D', conf:'CONMEBOL', fifaRank:50,
    coach:'Gustavo Alfaro', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Miguel Almirón',pos:'中場',club:'紐卡素'},
      {name:'Antonio Sanabria',pos:'前鋒',club:'托連奴'},
      {name:'Óscar Romero',pos:'中場',club:'River Plate'}
    ],
    radar:{attack:65,defense:68,midfield:63,speed:68,experience:63},
    style:'防守嚴密，依賴Almirón推進反擊',
    strengths:['Almirón中場組織與突擊','防守整體紀律佳','南美資格賽磨練'],
    weaknesses:['進攻終結能力不足','缺乏世界級門將'],
    history:'2010年八強是歷史最佳成績，本屆時隔多年重返世界盃',
    recentForm:['W','D','W','L','D'],
    predTitle:'南美黑馬候選', predOdds:'150-1', predDesc:'Almirón是巴拉圭突圍的關鍵，能否闖進16強是焦點' },

  'CUW': { name:'Curaçao', nameCN:'庫拉索', flag:'🇨🇼', group:'E', conf:'CONCACAF', fifaRank:83,
    coach:'Remko Bicentini', formation:'4-3-3',
    keyPlayers:[
      {name:'Leandro Bacuna',pos:'中場',club:'待定'},
      {name:'Elson Hooi',pos:'翼鋒',club:'待定'},
      {name:'Cuco Martina',pos:'後衛',club:'退役教練組'}
    ],
    radar:{attack:55,defense:55,midfield:53,speed:64,experience:44},
    style:'整體配合，積極跑動壓迫', strengths:['小國大志，士氣高昂','整體紀律','速度優勢'],
    weaknesses:['整體水準與頂強差距明顯','缺乏高水準聯賽球員'],
    history:'首次參加世界盃決賽圈，中北美足球發展縮影',
    recentForm:['W','D','D','W','L'],
    predTitle:'小國奇蹟', predOdds:'1000-1', predDesc:'庫拉索的出線是中北美足球多元化發展的象徵' },

  'NOR': { name:'Norway', nameCN:'挪威', flag:'🇳🇴', group:'I', conf:'UEFA', fifaRank:21,
    coach:'Ståle Solbakken', formation:'4-3-3',
    keyPlayers:[
      {name:'Erling Haaland',pos:'中鋒',club:'曼城'},
      {name:'Martin Ødegaard',pos:'中場',club:'兵工廠'},
      {name:'Alexander Sørloth',pos:'前鋒',club:'馬德里競技'}
    ],
    radar:{attack:88,defense:72,midfield:80,speed:83,experience:62},
    style:'以Haaland為核心，直接足球配合邊路突擊',
    strengths:['Haaland是當今最高效中鋒','Ødegaard中場組織世界頂級','雙箭頭進攻威脅極大'],
    weaknesses:['防守整體仍有漏洞','過度依賴Haaland','首次世界盃大賽壓力'],
    history:'首次參加世界盃決賽圈，Haaland帶領挪威踏上最大舞台',
    recentForm:['W','W','W','W','D'],
    predTitle:'Haaland的首次世界盃', predOdds:'14-1', predDesc:'Haaland加Ødegaard是本屆最令人期待的進攻組合之一，八強目標合理' },

  'CPV': { name:'Cape Verde', nameCN:'維德角', flag:'🇨🇻', group:'H', conf:'CAF', fifaRank:55,
    coach:'Pedro Brito "Bubista"', formation:'4-4-2',
    keyPlayers:[
      {name:'Djaniny',pos:'前鋒',club:'Al-Qadsiah'},
      {name:'Ryan Mendes',pos:'翼鋒',club:'待定'},
      {name:'Kenny Rocha Santos',pos:'中場',club:'待定'}
    ],
    radar:{attack:62,defense:63,midfield:58,speed:71,experience:56},
    style:'快速邊路突破，積極逼搶，整體配合',
    strengths:['速度快，邊路威脅','Djaniny進攻效率高','AFCON常客，非洲賽場經驗豐富'],
    weaknesses:['整體水準與歐美強隊差距大','中場組織偏弱'],
    history:'AFCON常客，曾達2013年非洲盃八強，首次參加世界盃',
    recentForm:['W','W','W','D','W'],
    predTitle:'非洲島國驚喜', predOdds:'400-1', predDesc:'維德角實力在非洲名列前茅，但世界盃舞台是全新挑戰' },

  'JOR': { name:'Jordan', nameCN:'約旦', flag:'🇯🇴', group:'J', conf:'AFC', fifaRank:72,
    coach:'Hussein Ammouta', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Musa Al-Taamari',pos:'翼鋒',club:'蒙彼利埃'},
      {name:'Yazan Al-Naimat',pos:'前鋒',club:'待定'},
      {name:'Baha Faisal',pos:'中場',club:'待定'}
    ],
    radar:{attack:60,defense:63,midfield:57,speed:65,experience:54},
    style:'防守為主，快速反擊與邊路推進',
    strengths:['Al-Taamari個人能力出眾','2023亞洲盃亞軍磨練','整體防守紀律'],
    weaknesses:['進攻火力嚴重不足','缺乏世界級中場','面對頂級對手經驗有限'],
    history:'首次參加世界盃，2023年亞洲盃亞軍是歷史最佳成績，中東足球新力量',
    recentForm:['L','W','W','W','W'],
    predTitle:'亞洲盃亞軍挑世界', predOdds:'500-1', predDesc:'2023亞洲盃決賽資歷讓人刮目相看，Al-Taamari是最危險武器' },

  'EUPD': { name:'Czechia', nameCN:'捷克', flag:'🇨🇿', group:'A', conf:'UEFA', fifaRank:35,
    coach:'Ivan Hašek', formation:'4-2-3-1',
    keyPlayers:[
      {name:'Tomáš Souček',pos:'中場',club:'西漢姆'},
      {name:'Patrik Schick',pos:'前鋒',club:'拜耳勒沃庫森'},
      {name:'Vladimír Coufal',pos:'後衛',club:'西漢姆'}
    ],
    radar:{attack:68,defense:68,midfield:66,speed:68,experience:70},
    style:'防守穩健，依靠Souček中場控制，Schick提供進攻火力',
    strengths:['Schick禁區內威脅大','Souček體力與拼勁','歐洲賽事豐富經驗'],
    weaknesses:['陣容老化','進攻深度不足','整體速度偏慢'],
    history:'2021歐洲盃四強，擁有豐富大賽經驗，透過附加賽重返世界盃',
    recentForm:['W','D','W','L','W'], predTitle:'中歐老牌勁旅', predOdds:'150-1', predDesc:'Schick和Souček組合是捷克的核心競爭力，有望突圍小組賽' },

  'EUPA': { name:'Bosnia and Herzegovina', nameCN:'波士尼亞', flag:'🇧🇦', group:'B', conf:'UEFA', fifaRank:65,
    coach:'Sergej Barbarez', formation:'4-3-3',
    keyPlayers:[
      {name:'Edin Džeko',pos:'中鋒',club:'費倫茨瓦羅斯'},
      {name:'Sead Kolašinac',pos:'後衛',club:'馬賽'},
      {name:'Miralem Pjanić',pos:'中場',club:'退役'}
    ],
    radar:{attack:66,defense:64,midfield:64,speed:65,experience:68},
    style:'以Džeko為箭頭的進攻足球，中場控制配合邊路突擊',
    strengths:['Džeko豐富大賽經驗','老球員帶領年輕陣容','西巴爾幹足球文化底蘊'],
    weaknesses:['Džeko年齡偏大','整體陣容新舊交替','大賽經驗相對有限'],
    history:'首次參加世界盃（2014年巴西世界盃小組賽），透過附加賽重返舞台',
    recentForm:['W','W','D','W','L'], predTitle:'巴爾幹新挑戰', predOdds:'200-1', predDesc:'Džeko老驥伏櫪，帶領波黑再度踏上世界盃舞台' },

  'EUPC': { name:'Türkiye', nameCN:'土耳其', flag:'🇹🇷', group:'D', conf:'UEFA', fifaRank:28,
    coach:'Vincenzo Montella', formation:'4-3-3',
    keyPlayers:[
      {name:'Hakan Çalhanoğlu',pos:'中場',club:'國際米蘭'},
      {name:'Arda Güler',pos:'中場',club:'皇家馬德里'},
      {name:'Cenk Tosun',pos:'前鋒',club:'待定'}
    ],
    radar:{attack:72,defense:70,midfield:74,speed:72,experience:72},
    style:'中場控制為主，依賴Çalhanoğlu組織，Güler創造力突出',
    strengths:['Çalhanoğlu是世界頂級中場之一','Güler年輕天才','2024歐洲盃四強實力'],
    weaknesses:['前鋒效率有待提升','整體穩定性波動','面對頂強時容易失守'],
    history:'2002年世界盃季軍，2024年歐洲盃四強，中歐霸主級球隊',
    recentForm:['W','W','D','W','W'], predTitle:'歐洲盃四強霸主', predOdds:'35-1', predDesc:'Çalhanoğlu與Güler是最令人期待的中場組合，土耳其有實力挺進八強' },

  'EUPB': { name:'Sweden', nameCN:'瑞典', flag:'🇸🇪', group:'F', conf:'UEFA', fifaRank:25,
    coach:'Jon Dahl Tomasson', formation:'4-4-2',
    keyPlayers:[
      {name:'Victor Nilsson Lindelöf',pos:'後衛',club:'曼聯'},
      {name:'Dejan Kulusevski',pos:'中場',club:'熱刺'},
      {name:'Alexander Isak',pos:'前鋒',club:'紐卡素'}
    ],
    radar:{attack:72,defense:74,midfield:70,speed:73,experience:72},
    style:'防守組織嚴密，依靠Isak前場突破與Kulusevski推進',
    strengths:['Isak是英超頂級射手','Kulusevski創造力強','整體組織嚴謹'],
    weaknesses:['Ibrahimović退役後中場組織稍弱','中場深度略顯不足'],
    history:'2018年世界盃八強，北歐足球強國，本屆透過附加賽取得資格',
    recentForm:['W','W','W','D','W'], predTitle:'北歐強隊', predOdds:'45-1', predDesc:'Isak+Kulusevski是瑞典最具威脅的組合，有能力從強組出線' },

  'ICP1': { name:'DR Congo', nameCN:'剛果民主共和國', flag:'🇨🇩', group:'K', conf:'CAF', fifaRank:53,
    coach:'Sébastien Desabre', formation:'4-3-3',
    keyPlayers:[
      {name:'Chancel Mbemba',pos:'後衛',club:'馬賽'},
      {name:'Cédric Bakambu',pos:'前鋒',club:'待定'},
      {name:'Arthur Masuaku',pos:'後衛',club:'貝西克塔斯'}
    ],
    radar:{attack:65,defense:66,midfield:62,speed:72,experience:60},
    style:'快速反擊，依靠速度與身體對抗優勢',
    strengths:['Mbemba是法甲頂級後衛','整體速度快','非洲附加賽磨練'],
    weaknesses:['整體組織紀律有待加強','缺乏世界盃頂尖賽事經驗'],
    history:'首次以剛果民主共和國名義參加世界盃，透過洲際附加賽晉級',
    recentForm:['W','W','D','W','L'], predTitle:'非洲黑馬', predOdds:'300-1', predDesc:'剛果民主共和國的晉級是非洲足球多元化的展現，力爭創造歷史' },

  'ICP2': { name:'Iraq', nameCN:'伊拉克', flag:'🇮🇶', group:'I', conf:'AFC', fifaRank:58,
    coach:'Jesús Casas', formation:'4-4-2',
    keyPlayers:[
      {name:'Aymen Hussein',pos:'前鋒',club:'Al-Zawraa'},
      {name:'Ibrahim Bayesh',pos:'後衛',club:'Al-Shorta'},
      {name:'Amjed Attwan',pos:'中場',club:'待定'}
    ],
    radar:{attack:62,defense:63,midfield:60,speed:66,experience:56},
    style:'防守穩健，快速反擊，依靠整體配合',
    strengths:['中東賽場實戰豐富','整體紀律佳','洲際附加賽磨練'],
    weaknesses:['技術水準與頂強差距大','缺乏大型賽事曝光'],
    history:'首次以伊拉克身份透過洲際附加賽晉級世界盃，中東足球新崛起',
    recentForm:['W','D','W','W','D'], predTitle:'中東新星', predOdds:'400-1', predDesc:'伊拉克是本屆最大黑馬之一，透過洲際附加賽征服世界舞台' }
});

// 修正各球隊所屬組別（依FIFA官方抽籤結果）
const groupFix = {
  A:['MEX','KOR','RSA','EUPD'],
  B:['CAN','SUI','QAT','EUPA'],
  C:['BRA','MAR','SCO','HAI'],
  D:['USA','PAR','AUS','EUPC'],
  E:['GER','ECU','CIV','CUW'],
  F:['NED','JPN','TUN','EUPB'],
  G:['BEL','IRN','EGY','NZL'],
  H:['ESP','URU','KSA','CPV'],
  I:['FRA','SEN','NOR','ICP2'],
  J:['ARG','AUT','ALG','JOR'],
  K:['POR','COL','UZB','ICP1'],
  L:['ENG','CRO','PAN','GHA']
};

// 更新GROUPS
Object.entries(groupFix).forEach(([g, teams]) => {
  GROUPS[g].teams = teams;
  teams.forEach(code => { if (TEAMS[code]) TEAMS[code].group = g; });
});

// 更新真實賽程（小組賽MD1，依FIFA公告時間轉換台灣時間UTC+8）
// 原始時間 ET (UTC-4) 轉台灣: +12小時
// 原始時間 CT (UTC-5) 轉台灣: +13小時
// 原始時間 PT (UTC-7) 轉台灣: +15小時
// 原始時間 MEX CDT (UTC-5) 轉台灣: +13小時
const realMD1 = {
  // [主場隊, 客場隊, 台灣日期, 台灣時間, 場地, 城市, 國家]
  // 原始時間 ET (UTC-4) 轉台灣 UTC+8: +12小時
  A:[ ['MEX','RSA','2026-06-12','03:00','Estadio Azteca','墨西哥城','MEX'],
      ['KOR','EUPD','2026-06-12','10:00','Estadio Akron','瓜達拉哈拉','MEX'] ],
  B:[ ['CAN','EUPA','2026-06-13','03:00','BMO Field','多倫多','CAN'],
      ['QAT','SUI','2026-06-14','03:00','Levi\'s Stadium','聖荷西','USA'] ],
  C:[ ['BRA','MAR','2026-06-14','06:00','MetLife Stadium','紐澤西','USA'],
      ['HAI','SCO','2026-06-14','09:00','Gillette Stadium','波士頓','USA'] ],
  D:[ ['USA','PAR','2026-06-13','09:00','SoFi Stadium','洛杉磯','USA'],
      ['AUS','EUPC','2026-06-14','12:00','BC Place','溫哥華','CAN'] ],
  E:[ ['GER','CUW','2026-06-15','01:00','NRG Stadium','休士頓','USA'],
      ['CIV','ECU','2026-06-15','07:00','Lincoln Financial','費城','USA'] ],
  F:[ ['NED','JPN','2026-06-15','04:00','AT&T Stadium','達拉斯','USA'],
      ['EUPB','TUN','2026-06-15','10:00','Estadio BBVA','蒙特雷','MEX'] ],
  G:[ ['BEL','EGY','2026-06-16','03:00','Lumen Field','西雅圖','USA'],
      ['IRN','NZL','2026-06-16','09:00','SoFi Stadium','洛杉磯','USA'] ],
  H:[ ['ESP','CPV','2026-06-16','00:00','Mercedes-Benz Stadium','亞特蘭大','USA'],
      ['KSA','URU','2026-06-16','06:00','Hard Rock Stadium','邁阿密','USA'] ],
  I:[ ['FRA','SEN','2026-06-17','03:00','MetLife Stadium','紐澤西','USA'],
      ['ICP2','NOR','2026-06-17','06:00','Gillette Stadium','波士頓','USA'] ],
  J:[ ['ARG','ALG','2026-06-17','09:00','Arrowhead Stadium','堪薩斯城','USA'],
      ['AUT','JOR','2026-06-17','12:00','Levi\'s Stadium','聖荷西','USA'] ],
  K:[ ['POR','ICP1','2026-06-18','01:00','NRG Stadium','休士頓','USA'],
      ['UZB','COL','2026-06-18','10:00','Estadio Azteca','墨西哥城','MEX'] ],
  L:[ ['ENG','CRO','2026-06-18','04:00','AT&T Stadium','達拉斯','USA'],
      ['GHA','PAN','2026-06-18','07:00','BMO Field','多倫多','CAN'] ]
};

// MD2 (June 18-23，依FIFA官方時間)
const realMD2 = {
  A:[ ['EUPD','RSA','2026-06-19','00:00','Mercedes-Benz Stadium','亞特蘭大','USA'],
      ['MEX','KOR','2026-06-19','09:00','Estadio Akron','瓜達拉哈拉','MEX'] ],
  B:[ ['SUI','EUPA','2026-06-19','03:00','SoFi Stadium','洛杉磯','USA'],
      ['CAN','QAT','2026-06-19','06:00','BC Place','溫哥華','CAN'] ],
  C:[ ['SCO','MAR','2026-06-20','06:00','Gillette Stadium','波士頓','USA'],
      ['BRA','HAI','2026-06-20','09:00','Lincoln Financial','費城','USA'] ],
  D:[ ['EUPC','PAR','2026-06-20','12:00','Levi\'s Stadium','聖荷西','USA'],
      ['USA','AUS','2026-06-20','03:00','Lumen Field','西雅圖','USA'] ],
  E:[ ['GER','CIV','2026-06-21','04:00','BMO Field','多倫多','CAN'],
      ['ECU','CUW','2026-06-21','08:00','Arrowhead Stadium','堪薩斯城','USA'] ],
  F:[ ['NED','EUPB','2026-06-21','01:00','NRG Stadium','休士頓','USA'],
      ['TUN','JPN','2026-06-21','12:00','Estadio BBVA','蒙特雷','MEX'] ],
  G:[ ['BEL','IRN','2026-06-22','03:00','SoFi Stadium','洛杉磯','USA'],
      ['NZL','EGY','2026-06-22','09:00','BC Place','溫哥華','CAN'] ],
  H:[ ['ESP','KSA','2026-06-22','00:00','Mercedes-Benz Stadium','亞特蘭大','USA'],
      ['URU','CPV','2026-06-22','06:00','Hard Rock Stadium','邁阿密','USA'] ],
  I:[ ['FRA','ICP2','2026-06-23','05:00','Lincoln Financial','費城','USA'],
      ['NOR','SEN','2026-06-23','08:00','MetLife Stadium','紐澤西','USA'] ],
  J:[ ['ARG','AUT','2026-06-23','01:00','AT&T Stadium','達拉斯','USA'],
      ['JOR','ALG','2026-06-23','11:00','Levi\'s Stadium','聖荷西','USA'] ],
  K:[ ['POR','UZB','2026-06-24','01:00','NRG Stadium','休士頓','USA'],
      ['COL','ICP1','2026-06-24','10:00','Estadio Akron','瓜達拉哈拉','MEX'] ],
  L:[ ['ENG','GHA','2026-06-24','04:00','Gillette Stadium','波士頓','USA'],
      ['PAN','CRO','2026-06-24','07:00','BMO Field','多倫多','CAN'] ]
};

// MD3 (June 24-27，同組兩場同時開踢，依FIFA官方時間)
const realMD3 = {
  A:[ ['EUPD','MEX','2026-06-25','09:00','Estadio Azteca','墨西哥城','MEX'],
      ['RSA','KOR','2026-06-25','09:00','Estadio BBVA','蒙特雷','MEX'] ],
  B:[ ['SUI','CAN','2026-06-25','03:00','BC Place','溫哥華','CAN'],
      ['EUPA','QAT','2026-06-25','03:00','Lumen Field','西雅圖','USA'] ],
  C:[ ['SCO','BRA','2026-06-25','06:00','Hard Rock Stadium','邁阿密','USA'],
      ['MAR','HAI','2026-06-25','06:00','Mercedes-Benz Stadium','亞特蘭大','USA'] ],
  D:[ ['EUPC','USA','2026-06-26','10:00','SoFi Stadium','洛杉磯','USA'],
      ['PAR','AUS','2026-06-26','10:00','Levi\'s Stadium','聖荷西','USA'] ],
  E:[ ['CUW','CIV','2026-06-26','04:00','Lincoln Financial','費城','USA'],
      ['ECU','GER','2026-06-26','04:00','MetLife Stadium','紐澤西','USA'] ],
  F:[ ['JPN','EUPB','2026-06-26','07:00','AT&T Stadium','達拉斯','USA'],
      ['TUN','NED','2026-06-26','07:00','Arrowhead Stadium','堪薩斯城','USA'] ],
  G:[ ['EGY','IRN','2026-06-27','11:00','Lumen Field','西雅圖','USA'],
      ['NZL','BEL','2026-06-27','11:00','BC Place','溫哥華','CAN'] ],
  H:[ ['CPV','KSA','2026-06-27','08:00','NRG Stadium','休士頓','USA'],
      ['URU','ESP','2026-06-27','08:00','Estadio Akron','瓜達拉哈拉','MEX'] ],
  I:[ ['NOR','FRA','2026-06-27','03:00','Gillette Stadium','波士頓','USA'],
      ['SEN','ICP2','2026-06-27','03:00','BMO Field','多倫多','CAN'] ],
  J:[ ['ALG','AUT','2026-06-28','10:00','Arrowhead Stadium','堪薩斯城','USA'],
      ['JOR','ARG','2026-06-28','10:00','AT&T Stadium','達拉斯','USA'] ],
  K:[ ['COL','POR','2026-06-28','07:30','Hard Rock Stadium','邁阿密','USA'],
      ['ICP1','UZB','2026-06-28','07:30','Mercedes-Benz Stadium','亞特蘭大','USA'] ],
  L:[ ['PAN','ENG','2026-06-28','05:00','MetLife Stadium','紐澤西','USA'],
      ['CRO','GHA','2026-06-28','05:00','Lincoln Financial','費城','USA'] ]
};

// 重新建立 SCHEDULE（覆蓋 data-matches.js 的結果）
function buildRealSchedule() {
  const list = [];
  let idx = 1;
  ['md1','md2','md3'].forEach((_md, mdIdx) => {
    const srcMap = [realMD1, realMD2, realMD3][mdIdx];
    Object.entries(srcMap).forEach(([g, fixtures]) => {
      fixtures.forEach(([h,a,date,time,venue,city,country]) => {
        list.push({
          id:`GS-${g}${idx++}`, phase:'group', group:g, matchday:mdIdx+1,
          home:h, away:a, twDate:date, twTime:time, venue, city, country
        });
      });
    });
  });
  // 加入淘汰賽佔位
  const ko = typeof KNOCKOUT !== 'undefined' ? KNOCKOUT : [];
  return list.concat(ko);
}

// 覆蓋 SCHEDULE，並初始化所有頁面
window.addEventListener('load', () => {
  SCHEDULE = buildRealSchedule();
  // 安全執行：單一模組失敗不影響其他模組
  const _safe = (fn, label) => { try { fn(); } catch(e) { console.error('['+label+']', e); } };
  // 首頁
  _safe(() => renderChampions(), 'renderChampions');
  _safe(() => renderUpcoming(), 'renderUpcoming');
  _safe(() => renderHomeBracket(), 'renderHomeBracket');
  _safe(() => renderDeathGroups(), 'renderDeathGroups');
  _safe(() => renderHighlights(), 'renderHighlights');
  // 預先渲染賽程（讓使用者點進去就有資料）
  _safe(() => renderSchedule('all', 'all'), 'renderSchedule');
  // 預先渲染球隊
  _safe(() => renderTeams('all', ''), 'renderTeams');
  // 預先渲染數據
  _safe(() => renderStats('standings'), 'renderStats');
  // 預先渲染文章
  _safe(() => renderFocus(), 'renderFocus');
  // 預先渲染AI預測
  _safe(() => renderPredictions(), 'renderPredictions');
  // 載入 GitHub Actions 統計資料（積分榜、射手榜等）
  _safe(() => applyLiveData(), 'applyLiveData');
  // 啟動 ESPN 即時比分 ticker（每 60 秒，比賽進行中才顯示）
  _safe(() => initLiveScoreTicker(), 'initLiveScoreTicker');
  // 競技場：預先渲染 + 主動推送
  _safe(() => renderArena(), 'renderArena');
  _safe(() => renderHomeDailyChallenge(), 'renderHomeDailyChallenge');
  _safe(() => updateArenaBadge(), 'updateArenaBadge');
  _safe(() => updateNavXP(), 'updateNavXP');
  _safe(() => showArenaWelcomeIfNeeded(), 'showArenaWelcomeIfNeeded');
  // 預測結算（延遲執行，避免阻塞初始渲染）
  setTimeout(() => {
    _safe(() => {
      const settled = settlePredictions();
      if (settled.length) showSettlementPopups(settled);
    }, 'settlePredictions');
  }, 2000);
});
