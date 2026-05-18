/* =============================================
   WC2026-SQUADS.JS — 2026 世界盃各隊 26 人大名單
   資料來源：各國協會官方公布 + 主流媒體（ESPN / BBC / Goal / 維基）
   status: 'final' 已公布最終 26 / 'preliminary' 還在初選 / 'tba' 未公布
   ============================================= */

window.WC_SQUADS = {

  // ───────── 已公布最終 26（截至 2026-05-18，共 10 支）─────────

  // 🇯🇵 日本：5/15 公布、三笘薰因傷落選、長友佑都 5 度世界盃
  'JPN': {
    status: 'final',
    announcedAt: '2026-05-15',
    note: '三笘薰、南野拓実、守田英正、町田浩樹皆因傷落選；39 歲長友佑都成亞洲史上首位 5 屆世界盃球員',
    players: [
      // 守門員
      { name: 'Zion Suzuki',      nameCN: '鈴木彩艷', pos: 'GK',  club: 'Parma',                    age: 23 },
      { name: 'Keisuke Osako',    nameCN: '大迫敬介', pos: 'GK',  club: '廣島三箭',                  age: 24 },
      { name: 'Tomoki Hayakawa',  nameCN: '早川友基', pos: 'GK',  club: '鹿島鹿角',                  age: 25 },
      // 後衛
      { name: 'Yuto Nagatomo',    nameCN: '長友佑都', pos: 'DEF', club: 'FC 東京',                  age: 39, note: '5 度世界盃' },
      { name: 'Shogo Taniguchi',  nameCN: '谷口彰悟', pos: 'DEF', club: '川崎前鋒',                  age: 34 },
      { name: 'Ko Itakura',       nameCN: '板倉滉',   pos: 'DEF', club: '門興格拉德巴赫',            age: 28 },
      { name: 'Tsuyoshi Watanabe',nameCN: '渡邊剛',   pos: 'DEF', club: '費耶諾德',                  age: 27 },
      { name: 'Takehiro Tomiyasu',nameCN: '冨安健洋', pos: 'DEF', club: '兵工廠',                    age: 27 },
      { name: 'Hiroki Ito',       nameCN: '伊藤洋輝', pos: 'DEF', club: '拜仁慕尼黑',                age: 26 },
      { name: 'Ayumu Seko',       nameCN: '瀨古步夢', pos: 'DEF', club: 'Le Havre',                 age: 24 },
      { name: 'Yukinari Sugawara',nameCN: '菅原由勢', pos: 'DEF', club: '南安普頓',                  age: 25 },
      { name: 'Junnosuke Suzuki', nameCN: '鈴木淳之介',pos: 'DEF', club: 'FC 哥本哈根',              age: 22 },
      // 中場
      { name: 'Wataru Endo',      nameCN: '遠藤航',   pos: 'MID', club: '利物浦',                    age: 32, note: '隊長' },
      { name: 'Daichi Kamada',    nameCN: '鎌田大地', pos: 'MID', club: '水晶宮',                    age: 29 },
      { name: 'Ao Tanaka',        nameCN: '田中碧',   pos: 'MID', club: '利茲聯',                    age: 27 },
      { name: 'Kaishu Sano',      nameCN: '佐野海舟', pos: 'MID', club: '美因茨',                    age: 25 },
      { name: 'Yuito Suzuki',     nameCN: '鈴木唯人', pos: 'MID', club: '布雷達根斯',                age: 24 },
      // 前鋒
      { name: 'Junya Ito',        nameCN: '伊東純也', pos: 'FWD', club: '蘭斯',                      age: 32 },
      { name: 'Takefusa Kubo',    nameCN: '久保建英', pos: 'FWD', club: '皇家社會',                  age: 25 },
      { name: 'Ritsu Doan',       nameCN: '堂安律',   pos: 'FWD', club: '法蘭克福',                  age: 27 },
      { name: 'Daizen Maeda',     nameCN: '前田大然', pos: 'FWD', club: '塞爾提克',                  age: 28 },
      { name: 'Ayase Ueda',       nameCN: '上田綺世', pos: 'FWD', club: '費耶諾德',                  age: 27 },
      { name: 'Koki Ogawa',       nameCN: '小川航基', pos: 'FWD', club: 'NEC',                       age: 27 },
      { name: 'Keito Nakamura',   nameCN: '中村敬斗', pos: 'FWD', club: '蘭斯',                      age: 25 },
      { name: 'Kento Shiogai',    nameCN: '塩貝健人', pos: 'FWD', club: '慶應義塾大學',              age: 23 },
      { name: 'Keisuke Goto',     nameCN: '後藤啓介', pos: 'FWD', club: '芝特芬荷蘭',                age: 21 },
    ],
  },

  // 🇫🇷 法國：5/15 公布、Mbappé 隊長、Camavinga 落選
  'FRA': {
    status: 'final',
    announcedAt: '2026-05-15',
    note: '姆巴佩擔任隊長；卡馬文加爆冷落選引爭議；Deschamps 帥位最後一屆',
    players: [
      // 守門員
      { name: 'Mike Maignan',       nameCN: '邁尼昂',       pos: 'GK',  club: 'AC 米蘭',          age: 30 },
      { name: 'Brice Samba',        nameCN: '桑巴',          pos: 'GK',  club: '雷恩',              age: 31 },
      { name: 'Robin Risser',       nameCN: '里塞',          pos: 'GK',  club: 'Strasbourg',        age: 22 },
      // 後衛
      { name: 'Lucas Digne',        nameCN: '迪涅',          pos: 'DEF', club: '阿斯頓維拉',        age: 32 },
      { name: 'Malo Gusto',         nameCN: '古斯托',        pos: 'DEF', club: '切爾西',            age: 23 },
      { name: 'Lucas Hernández',    nameCN: '盧卡斯·埃爾南德斯', pos: 'DEF', club: 'PSG',         age: 30 },
      { name: 'Theo Hernández',     nameCN: '特奧·埃爾南德斯', pos: 'DEF', club: '艾哈利',          age: 28 },
      { name: 'Ibrahima Konaté',    nameCN: '科納特',        pos: 'DEF', club: '利物浦',            age: 26 },
      { name: 'Jules Koundé',       nameCN: '孔德',          pos: 'DEF', club: '巴塞隆納',          age: 27 },
      { name: 'Maxence Lacroix',    nameCN: '拉克魯瓦',      pos: 'DEF', club: '水晶宮',            age: 26 },
      { name: 'William Saliba',     nameCN: '薩利巴',        pos: 'DEF', club: '兵工廠',            age: 25 },
      { name: 'Dayot Upamecano',    nameCN: '烏帕梅卡諾',    pos: 'DEF', club: '拜仁慕尼黑',        age: 27 },
      // 中場
      { name: "N'Golo Kanté",       nameCN: '坎特',          pos: 'MID', club: '吉達伊蒂哈德',      age: 35 },
      { name: 'Manu Koné',          nameCN: '科內',          pos: 'MID', club: '羅馬',              age: 25 },
      { name: 'Adrien Rabiot',      nameCN: '拉比奧',        pos: 'MID', club: '馬賽',              age: 31 },
      { name: 'Aurélien Tchouaméni',nameCN: '楚阿梅尼',      pos: 'MID', club: '皇家馬德里',        age: 26 },
      { name: 'Warren Zaïre-Emery', nameCN: '薩伊爾-埃梅里', pos: 'MID', club: 'PSG',               age: 20 },
      // 前鋒
      { name: 'Kylian Mbappé',      nameCN: '姆巴佩',        pos: 'FWD', club: '皇家馬德里',        age: 27, note: '隊長' },
      { name: 'Ousmane Dembélé',    nameCN: '登貝萊',        pos: 'FWD', club: 'PSG',               age: 28 },
      { name: 'Michael Olise',      nameCN: '奧利斯',        pos: 'FWD', club: '拜仁慕尼黑',        age: 24 },
      { name: 'Marcus Thuram',      nameCN: '圖拉姆',        pos: 'FWD', club: '國際米蘭',          age: 28 },
      { name: 'Bradley Barcola',    nameCN: '巴爾科拉',      pos: 'FWD', club: 'PSG',               age: 23 },
      { name: 'Rayan Cherki',       nameCN: '切爾基',        pos: 'FWD', club: '曼城',              age: 22 },
      { name: 'Désiré Doué',        nameCN: '杜埃',          pos: 'FWD', club: 'PSG',               age: 20 },
      { name: 'Jean-Philippe Mateta',nameCN: '馬泰塔',       pos: 'FWD', club: '水晶宮',            age: 28 },
      { name: 'Maghnes Akliouche',  nameCN: '阿克留什',      pos: 'FWD', club: '摩納哥',            age: 24 },
    ],
  },

  // 🇰🇷 南韓：5/16 公布、孫興慜隊長（4 度世界盃）、Jens Castrop 為首位混血血統球員
  'KOR': {
    status: 'final',
    announcedAt: '2026-05-16',
    note: '孫興慜擔任隊長（生涯第 4 屆世界盃）；德國出生的 Jens Castrop 成為首位混血血統入選的韓國球員',
    players: [
      // 守門員
      { name: 'Jo Hyeon-woo',    nameCN: '趙賢祐',   pos: 'GK',  club: '蔚山現代',      age: 34 },
      { name: 'Kim Seung-gyu',   nameCN: '金承奎',   pos: 'GK',  club: '艾沙巴布',      age: 35 },
      { name: 'Song Bum-keun',   nameCN: '宋範根',   pos: 'GK',  club: '全北現代',      age: 28 },
      // 後衛
      { name: 'Kim Min-jae',     nameCN: '金玟哉',   pos: 'DEF', club: '拜仁慕尼黑',    age: 29 },
      { name: 'Cho Yu-min',      nameCN: '趙裕民',   pos: 'DEF', club: '夏馬克',        age: 30 },
      { name: 'Lee Han-beom',    nameCN: '李韓凡',   pos: 'DEF', club: '密德蒂蘭',      age: 23 },
      { name: 'Kim Tae-hyeon',   nameCN: '金泰賢',   pos: 'DEF', club: 'FC 首爾',       age: 25 },
      { name: 'Park Jin-seob',   nameCN: '朴鎮燮',   pos: 'DEF', club: '蔚山現代',      age: 30 },
      { name: 'Lee Gi-hyuk',     nameCN: '李奇赫',   pos: 'DEF', club: '抱川市民',      age: 25 },
      { name: 'Lee Tae-seok',    nameCN: '李泰錫',   pos: 'DEF', club: '韓國',          age: 24 },
      { name: 'Seol Young-woo',  nameCN: '薛永祐',   pos: 'DEF', club: '蔚山現代',      age: 26 },
      { name: 'Jens Castrop',    nameCN: '卡斯特羅普', pos: 'DEF', club: '門興格拉德巴赫', age: 21, note: '首位混血' },
      { name: 'Kim Moon-hwan',   nameCN: '金紋奐',   pos: 'DEF', club: '全北現代',      age: 30 },
      // 中場
      { name: 'Hwang In-beom',   nameCN: '黃仁範',   pos: 'MID', club: '費耶諾德',      age: 29 },
      { name: 'Paik Seung-ho',   nameCN: '白昇浩',   pos: 'MID', club: 'Birmingham',    age: 28 },
      { name: 'Yang Hyun-jun',   nameCN: '楊玹埈',   pos: 'MID', club: '塞爾提克',      age: 23 },
      { name: 'Kim Jin-gyu',     nameCN: '金鎮奎',   pos: 'MID', club: '全北現代',      age: 28 },
      { name: 'Bae Jun-ho',      nameCN: '裴俊浩',   pos: 'MID', club: '斯托克城',      age: 22 },
      { name: 'Eom Ji-sung',     nameCN: '嚴志成',   pos: 'MID', club: '盧加諾',        age: 22 },
      { name: 'Lee Dong-gyeong', nameCN: '李東炅',   pos: 'MID', club: '蔚山現代',      age: 28 },
      { name: 'Lee Jae-sung',    nameCN: '李在城',   pos: 'MID', club: '美因茨',        age: 33 },
      // 前鋒
      { name: 'Son Heung-min',   nameCN: '孫興慜',   pos: 'FWD', club: 'LAFC',          age: 33, note: '隊長' },
      { name: 'Lee Kang-in',     nameCN: '李剛仁',   pos: 'FWD', club: 'PSG',           age: 25 },
      { name: 'Hwang Hee-chan',  nameCN: '黃喜燦',   pos: 'FWD', club: '狼隊',          age: 30 },
      { name: 'Oh Hyeon-gyu',    nameCN: '吳賢揆',   pos: 'FWD', club: '亨克',          age: 25 },
      { name: 'Cho Gue-sung',    nameCN: '趙圭成',   pos: 'FWD', club: '密德蒂蘭',      age: 28 },
    ],
  },

  // 🇧🇪 比利時：5/15 公布、Garcia 帶隊、De Bruyne + Courtois + Lukaku 黃金世代最後一舞
  'BEL': {
    status: 'final',
    announcedAt: '2026-05-15',
    note: 'De Bruyne + Courtois + Lukaku 領銜；魯卡庫帶傷入選、黃金世代最後一屆',
    players: [
      // 守門員
      { name: 'Thibaut Courtois',   nameCN: '庫爾圖瓦',    pos: 'GK',  club: '皇家馬德里',   age: 33 },
      { name: 'Senne Lammens',      nameCN: '拉門斯',       pos: 'GK',  club: '曼聯',         age: 22 },
      { name: 'Mike Penders',       nameCN: '彭德斯',       pos: 'GK',  club: '史特拉斯堡',   age: 21 },
      // 後衛
      { name: 'Timothy Castagne',   nameCN: '卡斯塔涅',    pos: 'DEF', club: '富勒姆',       age: 30 },
      { name: 'Zeno Debast',        nameCN: '德巴斯特',    pos: 'DEF', club: '葡萄牙體育',   age: 22 },
      { name: 'Maxim de Cuyper',    nameCN: '德庫珀',      pos: 'DEF', club: '布萊頓',       age: 25 },
      { name: 'Koni de Winter',     nameCN: '德溫特',      pos: 'DEF', club: 'AC 米蘭',      age: 24 },
      { name: 'Brandon Mechele',    nameCN: '梅切爾',      pos: 'DEF', club: '布魯日',       age: 33 },
      { name: 'Thomas Meunier',     nameCN: '梅尼耶',      pos: 'DEF', club: '里爾',         age: 34 },
      { name: 'Nathan Ngoy',        nameCN: '恩戈伊',      pos: 'DEF', club: '里爾',         age: 22 },
      { name: 'Joaquin Seys',       nameCN: '塞斯',         pos: 'DEF', club: '布魯日',       age: 22 },
      { name: 'Arthur Theate',      nameCN: '特亞特',      pos: 'DEF', club: '法蘭克福',     age: 26 },
      // 中場
      { name: 'Kevin De Bruyne',    nameCN: '德布勞內',    pos: 'MID', club: '拿坡里',       age: 34 },
      { name: 'Amadou Onana',       nameCN: '奧納納',      pos: 'MID', club: '阿斯頓維拉',   age: 24 },
      { name: 'Nicolas Raskin',     nameCN: '拉斯金',      pos: 'MID', club: '格拉斯哥流浪者', age: 25 },
      { name: 'Youri Tielemans',    nameCN: '蒂勒曼斯',    pos: 'MID', club: '阿斯頓維拉',   age: 29 },
      { name: 'Hans Vanaken',       nameCN: '范納肯',      pos: 'MID', club: '布魯日',       age: 33 },
      { name: 'Axel Witsel',        nameCN: '維特塞爾',    pos: 'MID', club: '吉羅納',       age: 37 },
      // 前鋒
      { name: 'Romelu Lukaku',      nameCN: '盧卡庫',      pos: 'FWD', club: '拿坡里',       age: 33 },
      { name: 'Jeremy Doku',        nameCN: '多庫',         pos: 'FWD', club: '曼城',         age: 24 },
      { name: 'Leandro Trossard',   nameCN: '特羅薩德',    pos: 'FWD', club: '兵工廠',       age: 31 },
      { name: 'Charles De Ketelaere', nameCN: '德凱特拉雷', pos: 'FWD', club: '亞特蘭大',    age: 25 },
      { name: 'Alexis Saelemaekers',nameCN: '薩雷馬可斯',  pos: 'FWD', club: 'AC 米蘭',      age: 26 },
      { name: 'Dodi Lukebakio',     nameCN: '盧科巴基奧',  pos: 'FWD', club: '本菲卡',       age: 28 },
      { name: 'Matias Fernandez-Pardo', nameCN: '費爾南德斯-帕爾多', pos: 'FWD', club: '里爾', age: 20 },
      { name: 'Diego Moreira',      nameCN: '迪亞戈·莫雷拉', pos: 'FWD', club: '史特拉斯堡', age: 21 },
    ],
  },

  // 🇸🇪 瑞典：5/12 公布、Potter 帶隊、Isak + Gyökeres 雙箭頭
  'SWE': {
    status: 'final',
    announcedAt: '2026-05-12',
    note: 'Graham Potter 接替 Tomasson 帶隊；Isak + Gyökeres 雙箭頭；Kulusevski 因傷落選',
    players: [
      // 守門員
      { name: 'Viktor Johansson',           nameCN: '約翰森',         pos: 'GK',  club: '斯托克城',    age: 27 },
      { name: 'Kristoffer Nordfeldt',       nameCN: '諾德菲爾特',    pos: 'GK',  club: 'AIK',         age: 36 },
      { name: 'Jacob Widell Zetterström',   nameCN: '茲特斯特倫',    pos: 'GK',  club: '德比郡',      age: 27 },
      // 後衛
      { name: 'Victor Lindelöf',  nameCN: '林德洛夫',      pos: 'DEF', club: '阿斯頓維拉',     age: 31, note: '隊長' },
      { name: 'Hjalmar Ekdal',    nameCN: '埃克達爾',      pos: 'DEF', club: '伯恩利',         age: 27 },
      { name: 'Isak Hien',        nameCN: '希恩',          pos: 'DEF', club: '亞特蘭大',       age: 27 },
      { name: 'Carl Starfelt',    nameCN: '斯塔費爾特',    pos: 'DEF', club: '塞爾塔',         age: 31 },
      { name: 'Gabriel Gudmundsson',nameCN: '古德孟松',    pos: 'DEF', club: '利茲聯',         age: 27 },
      { name: 'Daniel Svensson',  nameCN: '斯文森',        pos: 'DEF', club: '多特蒙德',       age: 24 },
      { name: 'Gustaf Lagerbielke',nameCN: '拉格比埃爾克', pos: 'DEF', club: '布拉加',         age: 26 },
      { name: 'Elliot Stroud',    nameCN: '斯特勞德',      pos: 'DEF', club: 'Mjällby',        age: 23 },
      { name: 'Emil Holm',        nameCN: '霍爾姆',        pos: 'DEF', club: '波隆那',         age: 25 },
      { name: 'Eric Smith',       nameCN: '史密斯',        pos: 'DEF', club: '聖保利',         age: 28 },
      // 中場
      { name: 'Yasin Ayari',      nameCN: '阿亞里',        pos: 'MID', club: '布萊頓',         age: 22 },
      { name: 'Lucas Bergvall',   nameCN: '貝里瓦爾',      pos: 'MID', club: '熱刺',           age: 20 },
      { name: 'Jesper Karlström', nameCN: '卡爾斯特倫',    pos: 'MID', club: '烏迪內斯',       age: 30 },
      { name: 'Ken Sema',         nameCN: '塞馬',          pos: 'MID', club: 'Pafos',          age: 32 },
      { name: 'Mattias Svanberg', nameCN: '斯萬貝里',      pos: 'MID', club: '沃夫斯堡',       age: 26 },
      { name: 'Besfort Zeneli',   nameCN: '澤內里',        pos: 'MID', club: '聯合聖吉爾',     age: 22 },
      { name: 'Taha Ali',         nameCN: '塔哈·阿里',     pos: 'MID', club: '奧地利克拉根福', age: 24 },
      // 前鋒
      { name: 'Alexander Isak',   nameCN: '伊薩克',        pos: 'FWD', club: '利物浦',         age: 26 },
      { name: 'Viktor Gyökeres',  nameCN: '約克雷斯',      pos: 'FWD', club: '兵工廠',         age: 27, note: '附加賽英雄' },
      { name: 'Anthony Elanga',   nameCN: '埃蘭加',        pos: 'FWD', club: '紐卡索',         age: 24 },
      { name: 'Benjamin Nygren',  nameCN: '尼格倫',        pos: 'FWD', club: '塞爾提克',       age: 24 },
      { name: 'Gustaf Nilsson',   nameCN: '尼爾森',        pos: 'FWD', club: '聯合柏林',       age: 28 },
      { name: 'Alexander Bernhardsson', nameCN: '伯恩哈德森', pos: 'FWD', club: '哥德堡',     age: 27 },
    ],
  },

  // 🇧🇦 波士尼亞：5/11 公布、Barbarez 帶隊、40 歲 Dzeko 仍是攻擊核心
  'BIH': {
    status: 'final',
    announcedAt: '2026-05-11',
    note: '40 歲 Edin Džeko 帶傷入選、黃金世代最後一人（Pjanić 已退役）；部分球員資料待補',
    players: [
      // 守門員
      { name: 'Nikola Vasilj',    nameCN: '瓦西利',        pos: 'GK',  club: '聖保利',         age: 29 },
      // 前鋒
      { name: 'Edin Džeko',       nameCN: '哲科',          pos: 'FWD', club: '沙爾克',         age: 40, note: '黃金世代' },
    ],
  },

  // 🇳🇿 紐西蘭：5/14 公布、Chris Wood 隊長、Wood + Tommy Smith 首位 2 屆世界盃紐西蘭球員
  'NZL': {
    status: 'final',
    announcedAt: '2026-05-14',
    note: 'Chris Wood 隊長；Wood + Tommy Smith 創紐西蘭史上首位 2 度世界盃紀錄',
    players: [
      // 守門員
      { name: 'Max Crocombe',     nameCN: '克羅孔貝',      pos: 'GK',  club: 'Millwall',       age: 32 },
      { name: 'Alex Paulsen',     nameCN: '保森',          pos: 'GK',  club: '萊基亞格但斯克', age: 23 },
      { name: 'Michael Woud',     nameCN: '伍德',          pos: 'GK',  club: '奧克蘭 FC',      age: 27 },
      // 後衛
      { name: 'Tyler Bindon',     nameCN: '賓登',          pos: 'DEF', club: '諾丁漢森林',     age: 21 },
      { name: 'Michael Boxall',   nameCN: '波克索爾',      pos: 'DEF', club: '明尼蘇達聯',     age: 37 },
      { name: 'Liberato Cacace',  nameCN: '卡卡塞',        pos: 'DEF', club: '雷克瑟姆',       age: 25 },
      { name: 'Francis De Vries', nameCN: '德弗里斯',      pos: 'DEF', club: '奧克蘭 FC',      age: 31 },
      { name: 'Callan Elliot',    nameCN: '艾略特',        pos: 'DEF', club: '奧克蘭 FC',      age: 26 },
      { name: 'Tim Payne',        nameCN: '佩恩',          pos: 'DEF', club: '威靈頓鳳凰',     age: 31 },
      { name: 'Nando Pijanker',   nameCN: '皮揚克',        pos: 'DEF', club: '奧克蘭 FC',      age: 24 },
      { name: 'Tommy Smith',      nameCN: '史密斯',        pos: 'DEF', club: 'Braintree',      age: 35, note: '第 2 度世界盃' },
      { name: 'Finn Surman',      nameCN: '塞曼',          pos: 'DEF', club: '波特蘭木材人',   age: 22 },
      // 中場
      { name: 'Lachlan Bayliss',  nameCN: '貝里斯',        pos: 'MID', club: 'Newcastle Jets', age: 22 },
      { name: 'Joe Bell',         nameCN: '貝爾',          pos: 'MID', club: '維京',           age: 26 },
      { name: 'Alex Rufer',       nameCN: '魯弗',          pos: 'MID', club: '威靈頓鳳凰',     age: 30 },
      { name: 'Marko Stamenić',   nameCN: '斯塔梅尼奇',    pos: 'MID', club: '斯旺西',         age: 23 },
      { name: 'Ryan Thomas',      nameCN: '湯瑪斯',        pos: 'MID', club: 'PEC 茲沃勒',     age: 30 },
      // 前鋒
      { name: 'Chris Wood',       nameCN: '伍德',          pos: 'FWD', club: '諾丁漢森林',     age: 34, note: '隊長 / 第 2 度世界盃' },
      { name: 'Kosta Barbarouses',nameCN: '巴爾巴魯塞',    pos: 'FWD', club: '西悉尼漫遊者',   age: 35 },
      { name: 'Matt Garbett',     nameCN: '加爾貝特',      pos: 'FWD', club: '彼得堡聯',       age: 23 },
      { name: 'Eli Just',         nameCN: '賈斯特',        pos: 'FWD', club: '馬瑟韋爾',       age: 26 },
      { name: 'Callum McCowatt',  nameCN: '麥考瓦特',      pos: 'FWD', club: '錫爾克堡',       age: 26 },
      { name: 'Ben Old',          nameCN: '奧爾德',        pos: 'FWD', club: '聖埃蒂安',       age: 23 },
      { name: 'Jesse Randall',    nameCN: '蘭德爾',        pos: 'FWD', club: '奧克蘭 FC',      age: 24 },
      { name: 'Ben Waine',        nameCN: '韋恩',          pos: 'FWD', club: '威靈頓鳳凰',     age: 24 },
    ],
  },

  // 🇨🇮 象牙海岸：5/15 公布、Fae 帶隊、Kessié 隊長
  'CIV': {
    status: 'final',
    announcedAt: '2026-05-15',
    note: 'Franck Kessié 隊長（破百出場）；Amad Diallo 首屆世界盃；部分球員資料待補',
    players: [
      { name: 'Franck Kessié',    nameCN: '凱西耶',        pos: 'MID', club: '阿哈利',         age: 29, note: '隊長' },
      { name: 'Evan Ndicka',      nameCN: '恩迪卡',        pos: 'DEF', club: '羅馬',           age: 26 },
      { name: 'Nicolas Pépé',     nameCN: '佩佩',          pos: 'FWD', club: '比利亞雷亞爾',   age: 30 },
      { name: 'Wilfried Singo',   nameCN: '辛戈',          pos: 'DEF', club: '摩納哥',         age: 25 },
      { name: 'Amad Diallo',      nameCN: '迪亞洛',        pos: 'FWD', club: '曼聯',           age: 23, note: '首屆世界盃' },
      { name: 'Evan Guessand',    nameCN: '蓋桑',          pos: 'FWD', club: '水晶宮',         age: 24, note: '首屆世界盃' },
      { name: 'Simon Adingra',    nameCN: '阿丁格拉',      pos: 'FWD', club: '摩納哥',         age: 24 },
      { name: 'Ange-Yoan Bonny',  nameCN: '邦尼',          pos: 'FWD', club: '國際米蘭',       age: 22, note: '剛轉籍' },
    ],
  },

  // 🇹🇳 突尼西亞：5/15 公布、Lamouchi 帶隊、Skhiri 隊長
  'TUN': {
    status: 'final',
    announcedAt: '2026-05-15',
    note: 'Ellyes Skhiri 隊長；老將 Msakni 落選引討論；部分球員資料待補',
    players: [
      // 守門員
      { name: 'Aymen Dahmen',     nameCN: '達赫曼',        pos: 'GK',  club: 'CS Sfaxien',     age: 28 },
      { name: 'Sabri Ben Hassen', nameCN: '本哈森',        pos: 'GK',  club: '蘇沙星辰',       age: 27 },
      { name: 'Abdelmouhib Chamakh', nameCN: '查馬克',     pos: 'GK',  club: '非洲俱樂部',     age: 27 },
      // 後衛
      { name: 'Montassar Talbi',  nameCN: '塔爾比',        pos: 'DEF', club: '洛里昂',         age: 27 },
      { name: 'Dylan Bronn',      nameCN: '布隆',          pos: 'DEF', club: '塞爾維特',       age: 30 },
      { name: 'Omar Rekik',       nameCN: '雷基克',        pos: 'DEF', club: 'NK 馬里博爾',    age: 24 },
      { name: 'Yan Valery',       nameCN: '瓦勒里',        pos: 'DEF', club: '伯爾尼年輕人',   age: 27 },
      { name: 'Ali Abdi',         nameCN: '阿卜迪',        pos: 'DEF', club: '尼斯',           age: 32 },
      // 中場
      { name: 'Ellyes Skhiri',    nameCN: '斯基里',        pos: 'MID', club: '法蘭克福',       age: 31, note: '隊長' },
      { name: 'Rani Khedira',     nameCN: '凱迪拉',        pos: 'MID', club: '聯合柏林',       age: 32 },
      { name: 'Hannibal Mejbri',  nameCN: '梅伊布里',      pos: 'MID', club: '伯恩茅斯',       age: 23 },
    ],
  },

  // 🇭🇹 海地：5/14 公布、Placide 隊長、僑民球員為主、平均 24 歲
  'HAI': {
    status: 'final',
    announcedAt: '2026-05-14',
    note: 'Placide 隊長；以歐美僑民球員為主、平均年齡 24 歲、史上第 2 度世界盃',
    players: [
      // 守門員
      { name: 'Johny Placide',    nameCN: '普拉西德',      pos: 'GK',  club: 'Bastia',         age: 37, note: '隊長' },
      { name: 'Alexandre Pierre', nameCN: '皮埃爾',        pos: 'GK',  club: 'Sochaux',        age: 27 },
      { name: 'Josué Duverger',   nameCN: '杜韋熱',        pos: 'GK',  club: '科布倫茨',       age: 25 },
      // 後衛
      { name: 'Ricardo Adé',      nameCN: '阿德',          pos: 'DEF', club: 'LDU Quito',      age: 25 },
      { name: 'Carlens Arcus',    nameCN: '阿庫斯',        pos: 'DEF', club: '昂熱',           age: 30 },
      { name: 'Jean-Kévin Duverne',nameCN: '杜韋恩',       pos: 'DEF', club: '根特',           age: 28 },
      { name: 'Hannes Delcroix',  nameCN: '德爾克羅',      pos: 'DEF', club: '盧加諾',         age: 27 },
      { name: 'Duke Lacroix',     nameCN: '拉克魯瓦',      pos: 'DEF', club: '科羅拉多溫泉',   age: 30 },
      // 中場
      { name: 'Danley Jean Jacques', nameCN: '讓·雅克',    pos: 'MID', club: '費城聯',         age: 25 },
      { name: 'Carl Sainté',      nameCN: '聖泰',          pos: 'MID', club: '艾爾帕索',       age: 23 },
      { name: 'Jean-Ricner Bellegarde', nameCN: '貝萊加德', pos: 'MID', club: '狼隊',          age: 27 },
      // 前鋒
      { name: 'Duckens Nazon',    nameCN: '納松',          pos: 'FWD', club: '艾斯特格拉',     age: 31 },
      { name: 'Frantzdy Pierrot', nameCN: '皮耶羅',        pos: 'FWD', club: '里澤體育',       age: 30 },
      { name: 'Derrick Etienne Jr.', nameCN: '埃蒂安',     pos: 'FWD', club: '多倫多 FC',      age: 29 },
      { name: 'Ruben Providence', nameCN: '普羅維登斯',    pos: 'FWD', club: '阿爾梅雷',       age: 24 },
      { name: 'Wilson Isidor',    nameCN: '伊西多爾',      pos: 'FWD', club: '桑德蘭',         age: 25 },
      { name: 'Lenny Joseph',     nameCN: '約瑟夫',        pos: 'FWD', club: '費倫茨瓦羅斯',   age: 24 },
    ],
  },

  // ───────── 預告公布日期（截至 2026-05-18）─────────
  // 巴西 5/18、德國 5/21、美國 5/26、荷蘭 5/27、埃及 5/29
};
