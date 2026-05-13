const fs = require('fs');
const kept = JSON.parse(fs.readFileSync('c:/Users/user/Documents/VS code/世足預測網站/js/_kept_teams.json','utf8'));

const CDN = 'https://crests.football-data.org';
const newTeams = {
  VIL: `
    name:'Villarreal', nameCN:'比利亞雷阿爾', flag:'img/villarreal.png', pot:2, league:'La Liga',
    uefaCoeff:72, coach:'Marcelino', formation:'4-4-2',
    keyPlayers:[{name:'Alexander Sørloth',pos:'前鋒',club:'比利亞雷阿爾'},{name:'Álex Baena',pos:'中場',club:'比利亞雷阿爾'},{name:'Yeremy Pino',pos:'右翼',club:'比利亞雷阿爾'},{name:'Dani Parejo',pos:'中場',club:'比利亞雷阿爾'},{name:'Filip Jörgensen',pos:'門將',club:'比利亞雷阿爾'}],
    radar:{attack:82,defense:78,midfield:83,speed:80,experience:75},
    style:'技術流西班牙足球，中場控制為主',
    strengths:['西甲中場控制傳統','Baena創造力突出','團隊戰術紀律佳'],
    weaknesses:['缺乏頂級球星','歐冠經驗有限','面對強隊防守壓力大'],
    history:'2005/06歐冠四強，2020/21歐霸冠軍'`,
  SGE: `
    name:'Eintracht Frankfurt', nameCN:'法蘭克福', flag:'${CDN}/19.png', pot:2, league:'Bundesliga',
    uefaCoeff:65, coach:'Dino Toppmöller', formation:'3-4-2-1',
    keyPlayers:[{name:'Omar Marmoush',pos:'前鋒',club:'法蘭克福'},{name:'Hugo Ekitiké',pos:'前鋒',club:'法蘭克福'},{name:'Mario Götze',pos:'攻擊中場',club:'法蘭克福'},{name:'Ellyes Skhiri',pos:'中場',club:'法蘭克福'},{name:'Kevin Trapp',pos:'門將',club:'法蘭克福'}],
    radar:{attack:80,defense:74,midfield:78,speed:82,experience:70},
    style:'快速反擊，高位壓迫，三後衛體系',
    strengths:['Marmoush進球效率極高','反擊速度快','主場氣氛佳'],
    weaknesses:['防守不夠穩定','板凳深度不足','大賽經驗欠缺'],
    history:'2021/22歐霸冠軍，重返歐冠舞台'`,
  TOT: `
    name:'Tottenham Hotspur', nameCN:'托特納姆熱刺', flag:'${CDN}/73.png', pot:3, league:'Premier League',
    uefaCoeff:60, coach:'Ange Postecoglou', formation:'4-3-3',
    keyPlayers:[{name:'Son Heung-min',pos:'前鋒/左翼',club:'熱刺'},{name:'James Maddison',pos:'攻擊中場',club:'熱刺'},{name:'Cristian Romero',pos:'中後衛',club:'熱刺'},{name:'Dejan Kulusevski',pos:'右翼',club:'熱刺'},{name:'Guglielmo Vicario',pos:'門將',club:'熱刺'}],
    radar:{attack:85,defense:78,midfield:82,speed:84,experience:76},
    style:'高位壓迫，進攻足球，控球為主',
    strengths:['Son個人能力頂級','Postecoglou進攻體系明確','英超競爭力強'],
    weaknesses:['防守端不穩定','傷兵問題多','歐冠決賽以來成績下滑'],
    history:'2018/19歐冠決賽亞軍'`,
  OLY: `
    name:'Olympiacos', nameCN:'奧林匹亞科斯', flag:'${CDN}/567.png', pot:3, league:'Super League Greece',
    uefaCoeff:42, coach:'José Luis Mendilibar', formation:'4-2-3-1',
    keyPlayers:[{name:'Ayoub El Kaabi',pos:'前鋒',club:'奧林匹亞科斯'},{name:'Rodinei',pos:'右後衛',club:'奧林匹亞科斯'},{name:'Santiago Hezze',pos:'中場',club:'奧林匹亞科斯'},{name:'Gelson Martins',pos:'翼鋒',club:'奧林匹亞科斯'},{name:'Konstantinos Tzolakis',pos:'門將',club:'奧林匹亞科斯'}],
    radar:{attack:74,defense:72,midfield:72,speed:76,experience:65},
    style:'務實防守，快速反擊',
    strengths:['El Kaabi進球效率高','歐協聯冠軍信心','主場氛圍狂熱'],
    weaknesses:['整體陣容實力有差距','聯賽競爭力不足','客場表現不穩'],
    history:'2023/24歐協聯冠軍，希臘豪門首座歐洲獎杯'`,
  SLA: `
    name:'Slavia Prague', nameCN:'布拉格斯拉維亞', flag:'${CDN}/396.png', pot:3, league:'Czech First League',
    uefaCoeff:35, coach:'Jindřich Trpišovský', formation:'4-2-3-1',
    keyPlayers:[{name:'Tomáš Chorý',pos:'前鋒',club:'布拉格斯拉維亞'},{name:'Lukáš Provod',pos:'中場',club:'布拉格斯拉維亞'},{name:'Oscar Dorley',pos:'中場',club:'布拉格斯拉維亞'},{name:'Igoh Ogbu',pos:'中後衛',club:'布拉格斯拉維亞'},{name:'Jindřich Staněk',pos:'門將',club:'布拉格斯拉維亞'}],
    radar:{attack:70,defense:72,midfield:70,speed:74,experience:60},
    style:'團隊足球，高壓逼搶，跑動量大',
    strengths:['跑動量聯賽最高','團隊凝聚力強','主場難攻不落'],
    weaknesses:['個人能力與頂級球隊差距大','國際賽經驗不足','關鍵球員可能被挖角'],
    history:'捷克傳統豪門，近年穩定出現在歐戰'`,
  BOD: `
    name:'Bodø/Glimt', nameCN:'博德/格利姆特', flag:'${CDN}/602.png', pot:3, league:'Eliteserien',
    uefaCoeff:30, coach:'Kjetil Knutsen', formation:'4-3-3',
    keyPlayers:[{name:'Kasper Junker',pos:'前鋒',club:'博德/格利姆特'},{name:'Patrick Berg',pos:'中場',club:'博德/格利姆特'},{name:'Ulrik Saltnes',pos:'中場',club:'博德/格利姆特'},{name:'Isak Määttä',pos:'翼鋒',club:'博德/格利姆特'},{name:'Nikita Haikin',pos:'門將',club:'博德/格利姆特'}],
    radar:{attack:75,defense:68,midfield:74,speed:78,experience:55},
    style:'北歐進攻足球，快速傳導，團隊配合',
    strengths:['Knutsen戰術體系獨特','團隊足球流暢','不怕強隊的心態'],
    weaknesses:['北極圈氣候影響賽程','球員流失嚴重','體能在密集賽程中是挑戰'],
    history:'挪威小城奇蹟，曾在歐洲賽場痛擊羅馬6:1'`,
  COP: `
    name:'FC Copenhagen', nameCN:'哥本哈根', flag:'img/copenhagen.png', pot:4, league:'Danish Superliga',
    uefaCoeff:28, coach:'Jacob Neestrup', formation:'3-4-2-1',
    keyPlayers:[{name:'Mohamed Elyounoussi',pos:'翼鋒',club:'哥本哈根'},{name:'Diogo Gonçalves',pos:'右翼衛',club:'哥本哈根'},{name:'Lukas Lerager',pos:'中場',club:'哥本哈根'},{name:'Denis Vavro',pos:'中後衛',club:'哥本哈根'},{name:'Kamil Grabara',pos:'門將',club:'哥本哈根'}],
    radar:{attack:72,defense:72,midfield:70,speed:74,experience:60},
    style:'丹麥務實足球，穩守反擊',
    strengths:['Grabara門將表現出色','防守組織嚴密','歐冠經驗累積中'],
    weaknesses:['進攻火力不足','聯賽水平限制球員成長','板凳深度不夠'],
    history:'2023/24歐冠16強，丹麥最成功的歐戰球隊'`,
  USG: `
    name:'Union Saint-Gilloise', nameCN:'聖吉爾聯合', flag:'${CDN}/2186.png', pot:4, league:'Jupiler Pro League',
    uefaCoeff:22, coach:'Sébastien Pocognoli', formation:'3-5-2',
    keyPlayers:[{name:'Cameron Puertas',pos:'攻擊中場',club:'聖吉爾聯合'},{name:'Kevin Mac Allister',pos:'中後衛',club:'聖吉爾聯合'},{name:'Mohammed Fuseini',pos:'翼鋒',club:'聖吉爾聯合'},{name:'Ross Sykes',pos:'中後衛',club:'聖吉爾聯合'},{name:'Anthony Moris',pos:'門將',club:'聖吉爾聯合'}],
    radar:{attack:70,defense:68,midfield:70,speed:72,experience:45},
    style:'比利時新派足球，進攻導向',
    strengths:['Puertas創造力突出','新興勁旅無畏氣勢','團隊戰術執行力好'],
    weaknesses:['歐冠零經驗','球員可能被大隊挖走','整體實力差距大'],
    history:'比利時足球新勢力，首次參加歐冠'`,
  QAR: `
    name:'Qarabağ FK', nameCN:'卡拉巴赫', flag:'img/qarabag.png', pot:4, league:'Azerbaijan Premier League',
    uefaCoeff:25, coach:'Gurban Gurbanov', formation:'4-2-3-1',
    keyPlayers:[{name:'Juninho',pos:'前鋒',club:'卡拉巴赫'},{name:'Abdellah Zoubir',pos:'翼鋒',club:'卡拉巴赫'},{name:'Richard Almeida',pos:'中場',club:'卡拉巴赫'},{name:'Kevin Medina',pos:'中場',club:'卡拉巴赫'},{name:'Shahrudin Mahammadaliyev',pos:'門將',club:'卡拉巴赫'}],
    radar:{attack:68,defense:66,midfield:66,speed:72,experience:50},
    style:'務實足球，密集防守，快速反擊',
    strengths:['Gurbanov長期執教體系穩定','球隊凝聚力強','小組賽不放棄精神'],
    weaknesses:['與歐洲頂級的實力差距','缺乏頂級球星','主場城市受戰爭影響'],
    history:'阿塞拜疆足球代表，多次參加歐冠正賽'`,
  ATH: `
    name:'Athletic Bilbao', nameCN:'畢爾包競技', flag:'${CDN}/77.png', pot:4, league:'La Liga',
    uefaCoeff:38, coach:'Ernesto Valverde', formation:'4-2-3-1',
    keyPlayers:[{name:'Nico Williams',pos:'左翼',club:'畢爾包競技'},{name:'Oihan Sancet',pos:'攻擊中場',club:'畢爾包競技'},{name:'Iñaki Williams',pos:'前鋒',club:'畢爾包競技'},{name:'Unai Simón',pos:'門將',club:'畢爾包競技'},{name:'Dani Vivian',pos:'中後衛',club:'畢爾包競技'}],
    radar:{attack:80,defense:78,midfield:78,speed:82,experience:68},
    style:'全巴斯克球員，高強度壓迫，永不放棄',
    strengths:['Nico Williams速度與技術頂級','巴斯克人精神永不言敗','Valverde戰術經驗豐富'],
    weaknesses:['只用巴斯克球員限制引援','板凳深度受限','歐冠經驗不足'],
    history:'西甲從未降級的三隊之一，只使用巴斯克球員的獨特傳統'`,
  PAF: `
    name:'Pafos FC', nameCN:'帕福斯', flag:'${CDN}/1044.png', pot:4, league:'Cypriot First Division',
    uefaCoeff:15, coach:'Juan Carlos Carcedo', formation:'4-3-3',
    keyPlayers:[{name:'Anderson Correia',pos:'前鋒',club:'帕福斯'},{name:'Jairo',pos:'翼鋒',club:'帕福斯'},{name:'Bruno Felipe',pos:'中場',club:'帕福斯'},{name:'Pierre Kunde',pos:'防守中場',club:'帕福斯'},{name:'Dorde Nikolić',pos:'門將',club:'帕福斯'}],
    radar:{attack:64,defense:62,midfield:64,speed:68,experience:40},
    style:'地中海務實足球，防守為先',
    strengths:['黑馬心態毫無壓力','團隊凝聚力強','主場氣氛佳'],
    weaknesses:['歐冠完全沒經驗','個人能力差距最大','塞浦路斯聯賽水平有限'],
    history:'塞浦路斯球隊首次打入歐冠正賽，史無前例'`,
  KAI: `
    name:'FC Kairat', nameCN:'凱拉特', flag:'${CDN}/6806.png', pot:4, league:'Kazakhstan Premier League',
    uefaCoeff:12, coach:'Aleksei Shpilevski', formation:'4-2-3-1',
    keyPlayers:[{name:'Vagner Love',pos:'前鋒',club:'凱拉特'},{name:'Bauyrzhan Islamkhan',pos:'攻擊中場',club:'凱拉特'},{name:'Gafurzhan Suyumbayev',pos:'中場',club:'凱拉特'},{name:'Marin Tomasov',pos:'翼鋒',club:'凱拉特'},{name:'Stas Pokatilov',pos:'門將',club:'凱拉特'}],
    radar:{attack:62,defense:60,midfield:62,speed:68,experience:35},
    style:'中亞足球風格，速度與力量',
    strengths:['主場人工草皮優勢','球迷狂熱支持','不怕失敗的精神'],
    weaknesses:['與歐洲強隊實力差距最大','長途客場旅程影響','缺乏國際賽經驗'],
    history:'哈薩克斯坦傳統強隊，首次參加歐冠正賽'`
};

// Pot -> team code ordering
const potOrder = {
  1: ['PSG','RMA','MCI','BAY','LIV','INT','CHE','DOR','BAR'],
  2: ['ARS','LEV','ATM','BEN','ATA','VIL','JUV','SGE','BRU'],
  3: ['TOT','PSV','AJA','NAP','SCP','OLY','SLA','BOD','MAR'],
  4: ['COP','MON','GAL','USG','QAR','ATH','NEW','PAF','KAI']
};

let output = `/* =============================================
   UCL-DATA-TEAMS.JS — 2025/26 歐冠聯賽 36支球隊資料
   UEFA係數：依據2025年最新排名
   資料截止：2025/26賽季
   ============================================= */

const UCL_TEAMS = {\n`;

for (const [pot, codes] of Object.entries(potOrder)) {
  output += `\n  // ===== POT ${pot} =====\n`;
  for (const code of codes) {
    if (kept[code]) {
      output += `  '${code}': {\n    ${kept[code]}\n  },\n`;
    } else if (newTeams[code]) {
      output += `  '${code}': {${newTeams[code]}\n  },\n`;
    } else {
      console.log('MISSING TEAM:', code);
    }
  }
}

output += `};

// 導出供 tournament.js 使用
if (typeof window !== 'undefined') window.UCL_TEAMS = UCL_TEAMS;
`;

fs.writeFileSync('c:/Users/user/Documents/VS code/世足預測網站/js/ucl-data-teams.js', output, 'utf8');
console.log('Done! Teams file written.');
