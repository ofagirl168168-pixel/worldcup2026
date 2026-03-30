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
      {name:'Martin Ødegaard',pos:'中場',club:'阿仙奴'},
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

  'EUPD': { name:'UEFA Playoff D Winner', nameCN:'歐洲附加賽D勝者', flag:'🏴', group:'A', conf:'UEFA', fifaRank:35,
    coach:'待定', formation:'4-3-3', keyPlayers:[], radar:{attack:68,defense:68,midfield:66,speed:68,experience:70},
    style:'待定', strengths:['附加賽淘汰賽磨練'], weaknesses:['確定性低'],
    history:'歐洲附加賽晉級', recentForm:['W','D','W','D','W'], predTitle:'歐洲附加賽代表', predOdds:'150-1', predDesc:'附加賽晉級球隊充滿鬥志' },

  'EUPA': { name:'UEFA Playoff A Winner', nameCN:'歐洲附加賽A勝者', flag:'🏴', group:'B', conf:'UEFA', fifaRank:38,
    coach:'待定', formation:'4-3-3', keyPlayers:[], radar:{attack:66,defense:66,midfield:64,speed:66,experience:68},
    style:'待定', strengths:['附加賽磨練'], weaknesses:['確定性低'],
    history:'歐洲附加賽晉級', recentForm:['W','D','W','D','W'], predTitle:'歐洲附加賽代表', predOdds:'180-1', predDesc:'附加賽代表，力爭小組突圍' },

  'EUPC': { name:'UEFA Playoff C Winner', nameCN:'歐洲附加賽C勝者', flag:'🏴', group:'D', conf:'UEFA', fifaRank:40,
    coach:'待定', formation:'4-3-3', keyPlayers:[], radar:{attack:65,defense:65,midfield:63,speed:65,experience:67},
    style:'待定', strengths:['附加賽磨練'], weaknesses:['確定性低'],
    history:'歐洲附加賽晉級', recentForm:['W','D','W','D','W'], predTitle:'歐洲附加賽代表', predOdds:'200-1', predDesc:'力爭出線' },

  'EUPB': { name:'UEFA Playoff B Winner', nameCN:'歐洲附加賽B勝者', flag:'🏴', group:'F', conf:'UEFA', fifaRank:36,
    coach:'待定', formation:'4-3-3', keyPlayers:[], radar:{attack:67,defense:67,midfield:65,speed:67,experience:69},
    style:'待定', strengths:['附加賽磨練'], weaknesses:['確定性低'],
    history:'歐洲附加賽晉級', recentForm:['W','D','W','D','W'], predTitle:'歐洲附加賽代表', predOdds:'170-1', predDesc:'力爭出線' },

  'ICP1': { name:'Inter-conf Playoff 1 Winner', nameCN:'洲際附加賽1勝者', flag:'🌐', group:'K', conf:'CONCACAF', fifaRank:45,
    coach:'待定', formation:'4-4-2', keyPlayers:[], radar:{attack:62,defense:62,midfield:60,speed:64,experience:55},
    style:'待定', strengths:['附加賽磨練'], weaknesses:['確定性低'],
    history:'洲際附加賽晉級', recentForm:['W','D','W','D','W'], predTitle:'洲際附加賽代表', predOdds:'300-1', predDesc:'力爭出線' },

  'ICP2': { name:'Inter-conf Playoff 2 Winner', nameCN:'洲際附加賽2勝者', flag:'🌐', group:'I', conf:'CAF', fifaRank:48,
    coach:'待定', formation:'4-4-2', keyPlayers:[], radar:{attack:61,defense:61,midfield:59,speed:63,experience:54},
    style:'待定', strengths:['附加賽磨練'], weaknesses:['確定性低'],
    history:'洲際附加賽晉級', recentForm:['W','D','W','D','W'], predTitle:'洲際附加賽代表', predOdds:'350-1', predDesc:'力爭出線' }
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
  A:[ ['MEX','RSA','2026-06-12','03:00','Estadio Azteca','墨西哥城','MEX'],
      ['KOR','EUPD','2026-06-12','10:00','Estadio Guadalajara','瓜達拉哈拉','MEX'] ],
  B:[ ['CAN','EUPA','2026-06-13','03:00','BMO Field','多倫多','CAN'],
      ['SUI','QAT','2026-06-14','03:00','Levi\'s Stadium','聖荷西','USA'] ],
  C:[ ['BRA','MAR','2026-06-14','06:00','MetLife Stadium','紐澤西','USA'],
      ['SCO','HAI','2026-06-15','01:00','Lincoln Financial','費城','USA'] ],
  D:[ ['USA','PAR','2026-06-13','09:00','SoFi Stadium','洛杉磯','USA'],
      ['AUS','EUPC','2026-06-14','01:00','Hard Rock Stadium','邁阿密','USA'] ],
  E:[ ['GER','CUW','2026-06-15','01:00','NRG Stadium','休士頓','USA'],
      ['ECU','CIV','2026-06-15','04:00','AT&T Stadium','達拉斯','USA'] ],
  F:[ ['NED','JPN','2026-06-15','07:00','Lumen Field','西雅圖','USA'],
      ['TUN','EUPB','2026-06-16','01:00','Mercedes-Benz Stadium','亞特蘭大','USA'] ],
  G:[ ['BEL','EGY','2026-06-16','04:00','SoFi Stadium','洛杉磯','USA'],
      ['IRN','NZL','2026-06-16','07:00','Rose Bowl','帕薩迪納','USA'] ],
  H:[ ['ESP','CPV','2026-06-17','00:00','Hard Rock Stadium','邁阿密','USA'],
      ['URU','KSA','2026-06-17','03:00','Arrowhead Stadium','堪薩斯城','USA'] ],
  I:[ ['FRA','SEN','2026-06-17','03:00','MetLife Stadium','紐澤西','USA'],
      ['NOR','ICP2','2026-06-17','06:00','Gillette Stadium','波士頓','USA'] ],
  J:[ ['ARG','ALG','2026-06-17','09:00','Arrowhead Stadium','堪薩斯城','USA'],
      ['AUT','JOR','2026-06-18','00:00','Levi\'s Stadium','聖荷西','USA'] ],
  K:[ ['POR','ICP1','2026-06-18','01:00','NRG Stadium','休士頓','USA'],
      ['COL','UZB','2026-06-18','10:00','Estadio Azteca','墨西哥城','MEX'] ],
  L:[ ['ENG','CRO','2026-06-18','04:00','AT&T Stadium','達拉斯','USA'],
      ['GHA','PAN','2026-06-18','07:00','BMO Field','多倫多','CAN'] ]
};

// MD2 (約June 19-24)
const realMD2 = {
  A:[ ['MEX','KOR','2026-06-22','09:00','Estadio Azteca','墨西哥城','MEX'],
      ['RSA','EUPD','2026-06-22','03:00','Estadio Monterrey','蒙特雷','MEX'] ],
  B:[ ['CAN','SUI','2026-06-21','03:00','BC Place','溫哥華','CAN'],
      ['QAT','EUPA','2026-06-21','06:00','Lumen Field','西雅圖','USA'] ],
  C:[ ['BRA','SCO','2026-06-22','06:00','Hard Rock Stadium','邁阿密','USA'],
      ['MAR','HAI','2026-06-22','06:00','Mercedes-Benz Stadium','亞特蘭大','USA'] ],
  D:[ ['USA','AUS','2026-06-22','07:00','SoFi Stadium','洛杉磯','USA'],
      ['PAR','EUPC','2026-06-21','04:00','Lincoln Financial','費城','USA'] ],
  E:[ ['GER','ECU','2026-06-23','03:00','MetLife Stadium','紐澤西','USA'],
      ['CIV','CUW','2026-06-23','07:00','NRG Stadium','休士頓','USA'] ],
  F:[ ['NED','EUPB','2026-06-23','10:00','Rose Bowl','帕薩迪納','USA'],
      ['JPN','TUN','2026-06-24','01:00','AT&T Stadium','達拉斯','USA'] ],
  G:[ ['BEL','IRN','2026-06-24','04:00','Gillette Stadium','波士頓','USA'],
      ['EGY','NZL','2026-06-24','07:00','Lincoln Financial','費城','USA'] ],
  H:[ ['ESP','URU','2026-06-25','03:00','Arrowhead Stadium','堪薩斯城','USA'],
      ['KSA','CPV','2026-06-25','07:00','Levi\'s Stadium','聖荷西','USA'] ],
  I:[ ['FRA','NOR','2026-06-25','06:00','MetLife Stadium','紐澤西','USA'],
      ['SEN','ICP2','2026-06-25','10:00','Mercedes-Benz Stadium','亞特蘭大','USA'] ],
  J:[ ['ARG','AUT','2026-06-26','03:00','Lumen Field','西雅圖','USA'],
      ['ALG','JOR','2026-06-26','07:00','Hard Rock Stadium','邁阿密','USA'] ],
  K:[ ['POR','COL','2026-06-26','06:00','SoFi Stadium','洛杉磯','USA'],
      ['UZB','ICP1','2026-06-26','10:00','Estadio Guadalajara','瓜達拉哈拉','MEX'] ],
  L:[ ['ENG','GHA','2026-06-27','03:00','AT&T Stadium','達拉斯','USA'],
      ['CRO','PAN','2026-06-27','07:00','NRG Stadium','休士頓','USA'] ]
};

// MD3 (June 27-30，同組兩場同時開踢)
const realMD3 = {
  A:[ ['MEX','EUPD','2026-06-30','03:00','Estadio Azteca','墨西哥城','MEX'],
      ['KOR','RSA','2026-06-30','03:00','Estadio Monterrey','蒙特雷','MEX'] ],
  B:[ ['CAN','QAT','2026-06-28','07:00','BMO Field','多倫多','CAN'],
      ['SUI','EUPA','2026-06-28','07:00','BC Place','溫哥華','CAN'] ],
  C:[ ['BRA','HAI','2026-06-29','07:00','Gillette Stadium','波士頓','USA'],
      ['MAR','SCO','2026-06-29','07:00','Lincoln Financial','費城','USA'] ],
  D:[ ['USA','EUPC','2026-06-29','03:00','SoFi Stadium','洛杉磯','USA'],
      ['PAR','AUS','2026-06-29','03:00','Rose Bowl','帕薩迪納','USA'] ],
  E:[ ['GER','CIV','2026-06-28','03:00','AT&T Stadium','達拉斯','USA'],
      ['ECU','CUW','2026-06-28','03:00','NRG Stadium','休士頓','USA'] ],
  F:[ ['NED','TUN','2026-06-28','10:00','Hard Rock Stadium','邁阿密','USA'],
      ['JPN','EUPB','2026-06-28','10:00','Mercedes-Benz Stadium','亞特蘭大','USA'] ],
  G:[ ['BEL','NZL','2026-06-30','07:00','Levi\'s Stadium','聖荷西','USA'],
      ['IRN','EGY','2026-06-30','07:00','Arrowhead Stadium','堪薩斯城','USA'] ],
  H:[ ['ESP','KSA','2026-06-30','10:00','MetLife Stadium','紐澤西','USA'],
      ['URU','CPV','2026-06-30','10:00','Lumen Field','西雅圖','USA'] ],
  I:[ ['FRA','ICP2','2026-07-01','07:00','Arrowhead Stadium','堪薩斯城','USA'],
      ['SEN','NOR','2026-07-01','07:00','Rose Bowl','帕薩迪納','USA'] ],
  J:[ ['ARG','JOR','2026-07-01','03:00','AT&T Stadium','達拉斯','USA'],
      ['AUT','ALG','2026-07-01','03:00','Hard Rock Stadium','邁阿密','USA'] ],
  K:[ ['POR','UZB','2026-07-01','10:00','SoFi Stadium','洛杉磯','USA'],
      ['COL','ICP1','2026-07-01','10:00','NRG Stadium','休士頓','USA'] ],
  L:[ ['ENG','PAN','2026-07-02','03:00','MetLife Stadium','紐澤西','USA'],
      ['CRO','GHA','2026-07-02','03:00','Mercedes-Benz Stadium','亞特蘭大','USA'] ]
};

// 重新建立 SCHEDULE（覆蓋 data-matches.js 的結果）
function buildRealSchedule() {
  const list = [];
  let idx = 1;
  ['md1','md2','md3'].forEach((md, mdIdx) => {
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
  // 首頁
  renderChampions();
  renderUpcoming();
  renderDeathGroups();
  renderHighlights();
  // 預先渲染賽程（讓使用者點進去就有資料）
  renderSchedule('all', 'all');
  // 預先渲染球隊
  renderTeams('all', '');
  // 預先渲染數據
  renderStats('standings');
  // 預先渲染文章
  renderFocus();
  // 預先渲染AI預測
  renderPredictions();
  // 載入 GitHub Actions 統計資料（積分榜、射手榜等）
  applyLiveData();
  // 啟動 ESPN 即時比分 ticker（每 60 秒，比賽進行中才顯示）
  initLiveScoreTicker();
  // 競技場：預先渲染 + 主動推送
  renderArena();
  renderHomeDailyChallenge();  // 首頁嵌入今日一題
  updateArenaBadge();          // 導覽列紅點
  showArenaWelcomeIfNeeded();  // 首次進站提示
});
