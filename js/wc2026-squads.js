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

  // 🇫🇷 法國：5/16 公布
  'FRA': { status: 'final', announcedAt: '2026-05-16', players: [], note: '名單已公布、待匯入球員' },

  // 🇰🇷 南韓：5/14 公布
  'KOR': { status: 'final', announcedAt: '2026-05-14', players: [], note: '名單已公布、待匯入球員' },

  // 🇧🇪 比利時
  'BEL': { status: 'final', announcedAt: '2026-05-16', players: [], note: '名單已公布、待匯入球員' },

  // 🇨🇮 象牙海岸
  'CIV': { status: 'final', announcedAt: '2026-05-15', players: [], note: '名單已公布、待匯入球員' },

  // 🇹🇳 突尼西亞
  'TUN': { status: 'final', announcedAt: '2026-05-15', players: [], note: '名單已公布、待匯入球員' },

  // 🇭🇹 海地
  'HAI': { status: 'final', announcedAt: '2026-05-14', players: [], note: '名單已公布、待匯入球員' },

  // 🇳🇿 紐西蘭
  'NZL': { status: 'final', announcedAt: '2026-05-13', players: [], note: '名單已公布、待匯入球員' },

  // 🇸🇪 瑞典
  'SWE': { status: 'final', announcedAt: '2026-05-14', players: [], note: '名單已公布、待匯入球員' },

  // 🇧🇦 波士尼亞
  'BIH': { status: 'final', announcedAt: '2026-05-13', players: [], note: '名單已公布、待匯入球員' },

  // ───────── 預告公布日期（截至 2026-05-18）─────────
  // 巴西 5/18、德國 5/21、美國 5/26、荷蘭 5/27、埃及 5/29
};
