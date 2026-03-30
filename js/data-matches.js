/* data-matches.js — 自動生成所有賽程 */
var PREDS = {}; // 預測由 calcPred() 動態計算，此為空佔位

// 每組3輪的台灣時間 [日期, 時間, 場地, 城市, 國家]
const GS = {
  A:{ md1:[['2026-06-12','10:00','MetLife Stadium','紐澤西','USA'],['2026-06-12','04:00','MetLife Stadium','紐澤西','USA']],
      md2:[['2026-06-20','07:00','Gillette Stadium','波士頓','USA'],['2026-06-20','10:00','MetLife Stadium','紐澤西','USA']],
      md3:[['2026-06-27','07:00','MetLife Stadium','紐澤西','USA'],['2026-06-27','07:00','Gillette Stadium','波士頓','USA']] },
  B:{ md1:[['2026-06-12','07:00','Hard Rock Stadium','邁阿密','USA'],['2026-06-13','04:00','Hard Rock Stadium','邁阿密','USA']],
      md2:[['2026-06-20','04:00','Lincoln Financial','費城','USA'],['2026-06-21','07:00','Hard Rock Stadium','邁阿密','USA']],
      md3:[['2026-06-28','07:00','Hard Rock Stadium','邁阿密','USA'],['2026-06-28','07:00','Lincoln Financial','費城','USA']] },
  C:{ md1:[['2026-06-13','07:00','AT&T Stadium','達拉斯','USA'],['2026-06-13','10:00','AT&T Stadium','達拉斯','USA']],
      md2:[['2026-06-21','04:00','Arrowhead Stadium','堪薩斯城','USA'],['2026-06-21','10:00','AT&T Stadium','達拉斯','USA']],
      md3:[['2026-06-28','04:00','AT&T Stadium','達拉斯','USA'],['2026-06-28','04:00','Arrowhead Stadium','堪薩斯城','USA']] },
  D:{ md1:[['2026-06-14','04:00','Lincoln Financial','費城','USA'],['2026-06-14','07:00','Gillette Stadium','波士頓','USA']],
      md2:[['2026-06-22','07:00','MetLife Stadium','紐澤西','USA'],['2026-06-22','10:00','Gillette Stadium','波士頓','USA']],
      md3:[['2026-06-29','07:00','Lincoln Financial','費城','USA'],['2026-06-29','07:00','MetLife Stadium','紐澤西','USA']] },
  E:{ md1:[['2026-06-14','10:00','Camping World','奧蘭多','USA'],['2026-06-15','04:00','AT&T Stadium','達拉斯','USA']],
      md2:[['2026-06-22','04:00','AT&T Stadium','達拉斯','USA'],['2026-06-23','07:00','Camping World','奧蘭多','USA']],
      md3:[['2026-06-29','04:00','Camping World','奧蘭多','USA'],['2026-06-29','04:00','AT&T Stadium','達拉斯','USA']] },
  F:{ md1:[['2026-06-15','07:00','Estadio Azteca','墨西哥城','MEX'],['2026-06-15','10:00','Estadio Azteca','墨西哥城','MEX']],
      md2:[['2026-06-23','04:00','Estadio BBVA','蒙特雷','MEX'],['2026-06-23','10:00','Estadio Azteca','墨西哥城','MEX']],
      md3:[['2026-06-30','04:00','Estadio Azteca','墨西哥城','MEX'],['2026-06-30','04:00','Estadio BBVA','蒙特雷','MEX']] },
  G:{ md1:[['2026-06-16','04:00','SoFi Stadium','洛杉磯','USA'],['2026-06-16','07:00','Rose Bowl','帕薩迪納','USA']],
      md2:[['2026-06-24','07:00','SoFi Stadium','洛杉磯','USA'],['2026-06-24','10:00','Rose Bowl','帕薩迪納','USA']],
      md3:[['2026-06-30','07:00','SoFi Stadium','洛杉磯','USA'],['2026-06-30','07:00','Rose Bowl','帕薩迪納','USA']] },
  H:{ md1:[['2026-06-16','10:00','Levi\'s Stadium','聖荷西','USA'],['2026-06-17','04:00','Lumen Field','西雅圖','USA']],
      md2:[['2026-06-24','04:00','Levi\'s Stadium','聖荷西','USA'],['2026-06-25','07:00','Lumen Field','西雅圖','USA']],
      md3:[['2026-07-01','04:00','Levi\'s Stadium','聖荷西','USA'],['2026-07-01','04:00','Lumen Field','西雅圖','USA']] },
  I:{ md1:[['2026-06-17','07:00','SoFi Stadium','洛杉磯','USA'],['2026-06-17','10:00','Rose Bowl','帕薩迪納','USA']],
      md2:[['2026-06-25','04:00','SoFi Stadium','洛杉磯','USA'],['2026-06-25','10:00','Rose Bowl','帕薩迪納','USA']],
      md3:[['2026-07-01','07:00','SoFi Stadium','洛杉磯','USA'],['2026-07-01','07:00','Rose Bowl','帕薩迪納','USA']] },
  J:{ md1:[['2026-06-12','01:00','Estadio Azteca','墨西哥城','MEX'],['2026-06-13','01:00','Estadio Akron','瓜達拉哈拉','MEX']],
      md2:[['2026-06-20','01:00','Estadio BBVA','蒙特雷','MEX'],['2026-06-21','01:00','Estadio Azteca','墨西哥城','MEX']],
      md3:[['2026-06-27','01:00','Estadio Azteca','墨西哥城','MEX'],['2026-06-27','01:00','Estadio Akron','瓜達拉哈拉','MEX']] },
  K:{ md1:[['2026-06-13','09:00','BMO Field','多倫多','CAN'],['2026-06-14','01:00','BC Place','溫哥華','CAN']],
      md2:[['2026-06-21','09:00','BC Place','溫哥華','CAN'],['2026-06-22','01:00','BMO Field','多倫多','CAN']],
      md3:[['2026-06-28','09:00','BMO Field','多倫多','CAN'],['2026-06-28','09:00','BC Place','溫哥華','CAN']] },
  L:{ md1:[['2026-06-15','01:00','Arrowhead Stadium','堪薩斯城','USA'],['2026-06-16','01:00','Camping World','奧蘭多','USA']],
      md2:[['2026-06-23','01:00','Arrowhead Stadium','堪薩斯城','USA'],['2026-06-24','01:00','Camping World','奧蘭多','USA']],
      md3:[['2026-06-30','01:00','Arrowhead Stadium','堪薩斯城','USA'],['2026-06-30','01:00','Camping World','奧蘭多','USA']] }
};

// 自動生成72場小組賽
function buildGroupMatches() {
  const matches = [];
  for (const g in GROUPS) {
    const [t0,t1,t2,t3] = GROUPS[g].teams;
    const s = GS[g];
    const fixtures = [
      {md:1, h:t0, a:t1, slot:0}, {md:1, h:t2, a:t3, slot:1},
      {md:2, h:t0, a:t2, slot:0}, {md:2, h:t1, a:t3, slot:1},
      {md:3, h:t0, a:t3, slot:0}, {md:3, h:t1, a:t2, slot:1}
    ];
    fixtures.forEach((f,i) => {
      const [date, time, venue, city, country] = s[`md${f.md}`][f.slot];
      matches.push({
        id: `GS-${g}${i+1}`, phase:'group', group:g, matchday:f.md,
        home:f.h, away:f.a, twDate:date, twTime:time,
        venue, city, country,
        pred: PREDS[`${f.h}-${f.a}`] || {hw:50,d:25,aw:25,score:'1-1',conf:'medium',pts:[]}
      });
    });
  }
  return matches;
}

// 淘汰賽佔位
const KNOCKOUT = [
  {id:'R32-1', phase:'r32', label:'32強 第1場', twDate:'2026-07-03', twTime:'07:00', venue:'MetLife Stadium', city:'紐澤西'},
  {id:'R32-2', phase:'r32', label:'32強 第2場', twDate:'2026-07-03', twTime:'10:00', venue:'AT&T Stadium', city:'達拉斯'},
  {id:'R32-3', phase:'r32', label:'32強 第3場', twDate:'2026-07-04', twTime:'07:00', venue:'SoFi Stadium', city:'洛杉磯'},
  {id:'R32-4', phase:'r32', label:'32強 第4場', twDate:'2026-07-04', twTime:'10:00', venue:'Hard Rock Stadium', city:'邁阿密'},
  {id:'R32-5', phase:'r32', label:'32強 第5場', twDate:'2026-07-05', twTime:'07:00', venue:'Estadio Azteca', city:'墨西哥城'},
  {id:'R32-6', phase:'r32', label:'32強 第6場', twDate:'2026-07-05', twTime:'10:00', venue:'BMO Field', city:'多倫多'},
  {id:'R32-7', phase:'r32', label:'32強 第7場', twDate:'2026-07-06', twTime:'07:00', venue:'Rose Bowl', city:'帕薩迪納'},
  {id:'R32-8', phase:'r32', label:'32強 第8場', twDate:'2026-07-06', twTime:'10:00', venue:'Gillette Stadium', city:'波士頓'},
  {id:'QF-1',  phase:'qf',  label:'八強 第1場', twDate:'2026-07-14', twTime:'07:00', venue:'MetLife Stadium', city:'紐澤西'},
  {id:'QF-2',  phase:'qf',  label:'八強 第2場', twDate:'2026-07-14', twTime:'10:00', venue:'AT&T Stadium', city:'達拉斯'},
  {id:'QF-3',  phase:'qf',  label:'八強 第3場', twDate:'2026-07-15', twTime:'07:00', venue:'SoFi Stadium', city:'洛杉磯'},
  {id:'QF-4',  phase:'qf',  label:'八強 第4場', twDate:'2026-07-15', twTime:'10:00', venue:'Hard Rock Stadium', city:'邁阿密'},
  {id:'SF-1',  phase:'sf',  label:'四強 第1場', twDate:'2026-07-17', twTime:'07:00', venue:'MetLife Stadium', city:'紐澤西'},
  {id:'SF-2',  phase:'sf',  label:'四強 第2場', twDate:'2026-07-18', twTime:'07:00', venue:'AT&T Stadium', city:'達拉斯'},
  {id:'3RD',   phase:'final',label:'季軍賽',    twDate:'2026-07-18', twTime:'07:00', venue:'Hard Rock Stadium', city:'邁阿密'},
  {id:'FINAL', phase:'final',label:'🏆 決賽',   twDate:'2026-07-19', twTime:'09:00', venue:'MetLife Stadium', city:'紐澤西'}
];

var SCHEDULE = []; // 由 data-fix.js 的 buildRealSchedule() 覆蓋
