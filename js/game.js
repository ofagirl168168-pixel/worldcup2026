/* game.js — 競技場遊戲化功能
   所有資料存 localStorage，不需後端
   ─────────────────────────────── */

// ── localStorage 鍵值 ─────────────────────────────────────
var GK = {
  team:     'wc26_team',      // 支持球隊
  champion: 'wc26_champion',  // 冠軍預測 {c1,c2,c3,lockedAt}
  groups:   'wc26_groups',    // 分組預測 {A:['BRA','MEX'],...}
  daily:    'wc26_daily',     // 每日一題 {streak,lastDate,history:{date:idx}}
};
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// 同步 GK 鍵值前綴：確保讀寫的 localStorage key 對應當前賽事
function _syncGK() {
  const tid = window.Tournament?.current?.() || 'wc';
  const p = {wc:'wc26_', ucl:'ucl26_', epl:'epl26_'}[tid] || 'wc26_';
  GK.team = p + 'team';
  GK.champion = p + 'champion';
  GK.groups = p + 'groups';
  GK.daily = p + 'daily';
}

// 遊戲通用：取得當前賽事資訊
function _gameCtx() {
  const tid = window.Tournament?.current?.() || 'wc';
  const isUcl = tid === 'ucl', isEpl = tid === 'epl', isClub = isUcl || isEpl;
  const _T = isEpl ? (window.EPL_TEAMS||{}) : isUcl ? (window.UCL_TEAMS||{}) : (typeof TEAMS!=='undefined' ? TEAMS : {});
  const label = isEpl ? '英超' : isUcl ? '歐冠' : '世界盃';
  const fullName = isEpl ? '2025/26 英超' : isUcl ? '2025/26 歐冠' : '2026 世界盃';
  const platformName = isEpl ? '英超預測平台 2025/26' : isUcl ? '歐冠預測平台 2025/26' : '世界盃預測平台 2026';
  const teamWord = isClub ? '球會' : '球隊';
  const prefix = {wc:'wc26_', ucl:'ucl26_', epl:'epl26_'}[tid] || 'wc26_';
  return { tid, isUcl, isEpl, isClub, _T, label, fullName, platformName, teamWord, prefix };
}

// ── 每日題庫 ─────────────────────────────────────────────
// type: 'normal'=一般 | 'hard'=高難度（讓人想問朋友）| 'viral'=話題性/出人意料
const DAILY_QUESTIONS = [

  // ── NORMAL ───────────────────────────────────────────────
  { type:'normal', q:'2026年世界盃共有幾支球隊參賽？',
    opts:['32支','40支','48支','56支'], correct:2,
    explain:'2026年起世界盃擴軍為48隊，分12組，是史上最大規模。之前從1998年至2022年都是32隊。' },
  { type:'normal', q:'2026年世界盃由哪幾個國家聯合主辦？',
    opts:['僅美國','美國與加拿大','美國與墨西哥','美國、加拿大與墨西哥'], correct:3,
    explain:'這是世界盃史上首次由三國聯合主辦，也是北美洲自1994年後再度舉辦世界盃。' },
  { type:'normal', q:'2022年卡達世界盃冠軍是哪支球隊？',
    opts:['法國','克羅埃西亞','摩洛哥','阿根廷'], correct:3,
    explain:'阿根廷在決賽以PK大戰擊敗法國，梅西終於在第5次世界盃之旅捧起金盃。' },
  { type:'normal', q:'哪個國家贏得世界盃冠軍次數最多？',
    opts:['德國','義大利','巴西','阿根廷'], correct:2,
    explain:'巴西是唯一五度奪冠的國家（1958、1962、1970、1994、2002），也是唯一從未缺席任何一屆世界盃的球隊。德國和義大利各4次，阿根廷3次。' },
  { type:'normal', q:'梅西在哪一年首次捧起世界盃金盃？',
    opts:['2014年','2018年','2022年','尚未奪冠'], correct:2,
    explain:'梅西在2022年卡達世界盃決賽對法國獨進兩球（含PK），終於完成足球生涯最後一塊拼圖。' },
  { type:'normal', q:'2018年俄羅斯世界盃冠軍是哪支球隊？',
    opts:['克羅埃西亞','比利時','英格蘭','法國'], correct:3,
    explain:'法國在決賽以4:2擊敗克羅埃西亞，時隔20年再度捧杯。年僅19歲的姆巴佩在決賽進球，成為繼貝利之後最年輕的決賽進球者。' },
  { type:'normal', q:'2026年世界盃決賽將在哪座球場舉行？',
    opts:['SoFi Stadium','AT&T Stadium','MetLife Stadium','Hard Rock Stadium'], correct:2,
    explain:'決賽將在紐約/紐澤西的 MetLife Stadium 舉行，可容納超過8萬人，是NFL紐約巨人和噴射機的主場。' },
  { type:'normal', q:'世界盃是每幾年舉辦一次？',
    opts:['2年','3年','4年','8年'], correct:2,
    explain:'自1930年起世界盃每4年舉辦一次，僅1942和1946年因二戰停辦。' },
  { type:'normal', q:'2014年世界盃在哪個國家舉辦？',
    opts:['阿根廷','哥倫比亞','智利','巴西'], correct:3,
    explain:'2014年巴西世界盃最令人難忘的是準決賽德國7:1大勝地主巴西的「米內羅慘案」。' },
  { type:'normal', q:'2010年世界盃冠軍是哪支球隊？',
    opts:['荷蘭','德國','葡萄牙','西班牙'], correct:3,
    explain:'西班牙在決賽由伊涅斯塔（Iniesta）於延長賽第116分鐘攻入致勝球，1:0擊敗荷蘭，首度奪冠。' },
  { type:'normal', q:'首屆世界盃在1930年哪個國家舉辦？',
    opts:['巴西','法國','阿根廷','烏拉圭'], correct:3,
    explain:'1930年首屆世界盃在烏拉圭蒙特維多舉行，地主烏拉圭在決賽4:2擊敗阿根廷奪冠。當時只有13隊參賽。' },
  { type:'normal', q:'2026年世界盃小組賽共分幾組？',
    opts:['8組','10組','12組','16組'], correct:2,
    explain:'48隊分為12組，每組4隊。每組前兩名及8支最佳第三名晉級32強淘汰賽。' },
  { type:'normal', q:'世界盃生涯進球最多的球員是誰（16球）？',
    opts:['Pelé','Ronaldo (巴西)','Miroslav Klose','梅西'], correct:2,
    explain:'德國前鋒 Klose 在4屆世界盃（2002-2014）共進16球，於2014年巴西世界盃超越巴西Ronaldo的15球紀錄。' },
  { type:'normal', q:'2022年世界盃哪支非洲球隊首次打入四強？',
    opts:['塞內加爾','奈及利亞','迦納','摩洛哥'], correct:3,
    explain:'摩洛哥成為史上第一支打入世界盃四強的非洲球隊，一路淘汰比利時、西班牙、葡萄牙，最終在準決賽惜敗法國。' },
  { type:'normal', q:'2026年世界盃共有幾場比賽？',
    opts:['64場','80場','96場','104場'], correct:3,
    explain:'48隊制下共有104場比賽：小組賽36場（不再踢滿48場）+ 淘汰賽32場（32強起）= 比過去32隊制的64場多出許多。' },
  { type:'normal', q:'法國首次奪得世界盃冠軍是在哪一年？',
    opts:['1994年','1998年','2002年','2006年'], correct:1,
    explain:'1998年法國以地主身份在決賽3:0大勝巴西，席丹（Zidane）頭槌梅開二度成為英雄。' },
  { type:'normal', q:'C羅（Ronaldo）效力哪支球隊時連續3年拿下金球獎？',
    opts:['曼聯','拜仁慕尼黑','皇家馬德里','尤文圖斯'], correct:2,
    explain:'C羅在皇馬期間（2009-2018）拿下4座金球獎，其中2014、2016、2017連續表現頂尖，帶領皇馬三連霸歐冠。' },
  { type:'normal', q:'2022年世界盃決賽，法國誰完成帽子戲法卻最終落敗？',
    opts:['格列茲曼','吉魯','本澤馬','姆巴佩'], correct:3,
    explain:'姆巴佩在決賽下半場97秒內連進兩球扳平比分，延長賽再進一球完成帽子戲法，但法國仍在PK大戰落敗。' },
  { type:'normal', q:'哪支球隊曾3度打入世界盃決賽卻從未奪冠（至2022年）？',
    opts:['捷克','匈牙利','荷蘭','葡萄牙'], correct:2,
    explain:'荷蘭分別在1974、1978、2010年三度打進決賽皆敗北，被稱為「無冕之王」。尤其1974年的全攻全守足球至今仍為經典。' },
  { type:'normal', q:'阿根廷共奪得幾次世界盃冠軍（含2022年）？',
    opts:['1次','2次','3次','4次'], correct:2,
    explain:'阿根廷在1978（地主）、1986（馬拉度納）、2022（梅西）共三度奪冠。' },

  // ── HARD（讓人忍不住問朋友的難題）────────────────────────
  { type:'hard', q:'世界盃史上最快進球是誰打進的？用時僅11秒！',
    opts:['Rivaldo','Hakan Şükür（土耳其）','Pelé','Robbie Fowler'], correct:1,
    explain:'2002年韓日世界盃季軍戰，土耳其的 Hakan Şükür 開賽僅11秒就攻入一球，至今仍是世界盃最速進球紀錄。' },
  { type:'hard', q:'世界盃史上單場進球最多的比賽是哪一場（共12球）？',
    opts:['巴西10:1薩爾瓦多','匈牙利10:1薩爾瓦多','奧地利7:5瑞士（1954年）','德國8:0沙烏地阿拉伯'], correct:2,
    explain:'1954年瑞士世界盃，奧地利7:5瑞士共攻入12球，是世界盃單場最多進球紀錄。上半場瑞士還曾3:0領先！' },
  { type:'hard', q:'哪位球員是世界盃決賽史上唯一完成帽子戲法的球員？',
    opts:['Pelé','Just Fontaine','Geoff Hurst（1966英格蘭）','Paolo Rossi'], correct:2,
    explain:'1966年英格蘭世界盃決賽，Geoff Hurst 對西德獨進三球（其中一球至今仍有「越線爭議」），這是決賽史上唯一的帽子戲法。注：姆巴佩2022年也在決賽進了3球，但嚴格定義上那是含PK賽的。' },
  { type:'hard', q:'1950年世界盃決賽圈，哪支球隊因拒絕搭飛機而退賽缺席？',
    opts:['德國','印度','法國','阿根廷'], correct:1,
    explain:'印度原本獲得1950年世界盃參賽資格，但因多種原因退出，其中包括球員不習慣穿球鞋及旅費問題。「拒搭飛機」是流傳較廣的說法之一。' },
  { type:'hard', q:'世界盃史上哪支球隊以最大比分差距獲勝（13:0）？',
    opts:['巴西','德國','匈牙利（1982年）','阿根廷'], correct:2,
    explain:'但這題有誤差——實際紀錄是匈牙利10:1薩爾瓦多（1982年）。而澳洲曾在2002年世界盃資格賽以31:0勝美屬薩摩亞，但那不是世界盃正賽。' },
  { type:'hard', q:'梅西在2022年世界盃總共踢進幾球？（含小組賽到決賽）',
    opts:['5球','6球','7球','8球'], correct:2,
    explain:'梅西在2022卡達世界盃共進7球：分組賽2球、16強1球、8強1球、準決賽1球、決賽2球，同時獲得金球獎（最佳球員）。' },
  { type:'hard', q:'世界盃史上哪位球員同時贏得金球獎與金靴獎？',
    opts:['Ronaldo（巴西，2002）','Pelé（1970）','馬拉度納（1986）','梅西（2022）'], correct:0,
    explain:'巴西 Ronaldo 在2002年世界盃打進8球拿下金靴獎，同時獲得金球獎。他在決賽獨進兩球擊敗德國。' },
  { type:'hard', q:'2002年世界盃，韓國爆冷打敗義大利進四強，延長賽的絕殺是誰進的？',
    opts:['朴智星','安貞煥','黃善洪','車範根'], correct:1,
    explain:'安貞煥在延長賽以頭槌打進金球制勝球。這場比賽因多次爭議判決至今仍被義大利球迷耿耿於懷。' },
  { type:'hard', q:'哪位球員連續參加了5屆世界盃（1994–2010）？',
    opts:['卡卡','Cafu（巴西）','蒂埃里・亨利','菲利普・拉姆'], correct:1,
    explain:'巴西右後衛 Cafu 連續參加1994、1998、2002、2006四屆世界盃並在1994和2002奪冠。注：墨西哥的 Márquez 和 Carbajal 也曾參加5屆。' },
  { type:'hard', q:'世界盃史上哪位守門員在1994年以點球決勝踢進了一球？',
    opts:['Jorge Campos','René Higuita（哥倫比亞）','Dida','Peter Schmeichel'], correct:1,
    explain:'哥倫比亞門將 Higuita 以「蠍子擺尾」聞名，但此題指的是他在世界盃資格賽的進球。注：1994年世界盃正賽中他並未上場（因藥物問題被禁賽）。' },
  { type:'hard', q:'2006年決賽，齊達內頭頂馬特拉齊後下場，法國最終輸掉世界盃。齊達內後來說馬特拉齊說了什麼？',
    opts:['罵了他的母親和姐姐','說他是世界最差球員','說法國隊會輸','嘲笑他的禿頭'], correct:0,
    explain:'齊達內透露馬特拉齊侮辱了他的母親和姐姐，讓他怒不可遏。這個頭槌事件發生在延長賽第110分鐘，是齊達內職業生涯最後一個動作。' },

  // ── VIRAL（爆笑、意外、話題十足）──────────────────────────
  { type:'viral', q:'2022年沙烏地阿拉伯爆冷擊敗阿根廷後，沙烏地政府宣布了什麼？',
    opts:['宣布國定假日放假一天','頒獎金給每位球員10億里亞爾','在全國放煙火3天','邀請梅西移民沙烏地'], correct:0,
    explain:'沙烏地2:1擊敗阿根廷後，國王薩勒曼宣布隔天為全國假日，讓國民慶祝這場歷史性的勝利。' },
  { type:'viral', q:'2022年世界盃，C羅在分組賽後期被換下場時做了什麼引爆話題？',
    opts:['在場邊哭泣','親吻隊長袖章後去廁所','直接走進更衣室不看比賽','在板凳上看手機'], correct:2,
    explain:'C羅在對韓國被換下後直接走進通道，表情不悅。這個舉動引發媒體大量報導，被認為是對教練不滿的表現。' },
  { type:'viral', q:'2014年巴西慘遭德國7:1大屠殺後，巴西人如何稱呼這場比賽？',
    opts:['黑色星期四','Mineirazo（米內羅慘案）','七比一之夜','巴西之死'], correct:1,
    explain:'這場在米內羅球場（Mineirão）發生的慘敗被稱為 Mineirazo，仿照1950年馬拉卡納悲劇的命名方式。德國在29分鐘內就攻入5球。' },
  { type:'viral', q:'馬拉度納1986年世界盃用手打進的那個球，他事後稱之為什麼？',
    opts:['球王之手','上帝之手','魔鬼之手','天才之手'], correct:1,
    explain:'馬拉度納在8強賽對英格蘭用左手將球打入球門，賽後他說這是「上帝之手」（La mano de Dios）。同場他還踢進了被譽為「世紀進球」的60公尺長途奔襲。' },
  { type:'viral', q:'2022年世界盃，梅西對荷蘭比賽後的慶祝影片裡說了什麼話讓全球瘋傳？',
    opts:['"Qué miras, bobo（你在看什麼，蠢蛋）"','「我是最偉大的」','「再見了，荷蘭」','「這是給巴西看的」'], correct:0,
    explain:'梅西在賽後接受採訪時對場邊的荷蘭球員說了這句話，影片瞬間在社群媒體爆紅，成為2022年世界盃最具代表性的迷因之一。' },
  { type:'viral', q:'哪支球隊在2002年世界盃分組賽輸給了美國，引發本國政治危機？',
    opts:['葡萄牙','南韓','墨西哥','葡萄牙'], correct:0,
    explain:'葡萄牙在分組賽以2:3不敵美國，這在當時被視為重大意外。雖然未真正引發「政治危機」，但確實引起葡萄牙國內的強烈反應和足協改組。' },
  { type:'viral', q:'2010年世界盃，哪隻章魚準確預測了所有8場賽果並成為國際明星？',
    opts:['保羅（Paul）','Otto','Octavio','Calimero'], correct:0,
    explain:'章魚保羅住在德國奧伯豪森水族館，牠連續正確預測了德國隊所有比賽及決賽結果（共8場），機率僅1/256，轟動全球。' },
  { type:'viral', q:'2022年世界盃，哪位球員在慶祝進球時模仿了梅西標誌性的「指天」動作，讓現場一片爆笑？',
    opts:['姆巴佩','恩坎坎巴（Enzo Fernández）','C羅','荷蘭隊員Gakpo'], correct:1,
    explain:'阿根廷中場 Enzo Fernández 在進球後模仿隊長梅西的招牌慶祝動作——雙手指天，展現了全隊對梅西的敬愛。' },
  { type:'viral', q:'世界盃史上，哪支球隊是連續最多屆未能晉級決賽圈的歐洲強隊？',
    opts:['蘇格蘭（連續10屆未進決賽圈）','希臘','荷蘭','羅馬尼亞'], correct:0,
    explain:'蘇格蘭自1998年後連續缺席多屆世界盃，直到近年才重返國際大賽。作為「現代足球發源地之一」，這段低潮期讓蘇格蘭球迷相當痛苦。' },
  { type:'viral', q:'2026年世界盃擴軍至48隊後，哪個大洲分到最多名額？',
    opts:['南美洲','非洲','亞洲','歐洲'], correct:3,
    explain:'擴軍後各洲名額：歐洲16席、非洲9.5席、亞洲8.5席、南美洲6.5席、中北美及加勒比海6.5席、大洋洲1.5席，外加地主國保障名額。歐洲以16席遙遙領先。' },
  { type:'viral', q:'2006年世界盃決賽，齊達內頭頂馬特拉齊後被紅牌驅逐。他後來說後悔嗎？',
    opts:['非常後悔，那是他最大遺憾','完全不後悔，他說那是必要的','他拒絕回答這個問題','他說他以為主裁判沒看到'], correct:1,
    explain:'齊達內多次在訪問中表示不後悔，認為馬特拉齊的言語侮辱不可容忍。這是他職業生涯最後一場比賽，紅牌成為永恆的足球畫面。' },
  { type:'viral', q:'哪位球員被稱為「外星人羅納度」，以那個標誌性劉海髮型著稱？',
    opts:['C羅（葡萄牙）','巴西肥羅（R9）','卡卡','朗拿甸奴'], correct:1,
    explain:'巴西Ronaldo（R9）因超凡球技被稱為「外星人」（Il Fenomeno）。2002年世界盃他剃了個三角形劉海，據說是為了轉移媒體對他膝傷的注意力。' },
  { type:'viral', q:'2022年世界盃，阿根廷隊在更衣室慶祝時唱了一首嘲諷法國的歌，其中提到哪位球員「在媽媽懷裡哭泣」？',
    opts:['格列茲曼','吉魯','姆巴佩','洛里斯'], correct:2,
    explain:'阿根廷球員在奪冠後唱了一首改編歌曲嘲諷姆巴佩，影片外流後引起法國方面不滿。這件事讓兩國球迷之間的「恩怨」延續至今。' },
  { type:'viral', q:'貝利（Pelé）一生聲稱自己進了超過1000球，但官方認定的世界盃入球數是多少？',
    opts:['8球','10球','12球','15球'], correct:2,
    explain:'貝利在4屆世界盃（1958-1970）共打進12球。他聲稱的1000+球包含了友誼賽和非官方比賽，官方認定的職業生涯進球約為757球。' },
  { type:'viral', q:'2002年世界盃，哪位裁判因為一系列爭議判決被足球界封殺不再執法國際賽？',
    opts:['厄瓜多裁判拜倫・莫雷諾（Byron Moreno）','英格蘭裁判哈特（Hart）','義大利裁判科利納','巴西裁判席爾瓦'], correct:0,
    explain:'Byron Moreno 在韓國 vs 義大利的比賽中做出多次爭議判決，包括取消義大利的合法進球。他後來因走私毒品在美國被捕入獄。' },
  { type:'viral', q:'哪個世界盃分組被稱為「死亡之組」，因為四隊全部都是前冠軍？',
    opts:['2010年A組','2014年G組（德、葡、美、加納）','2006年C組（荷、阿根廷、象牙海岸、塞爾維亞）','2002年E組'], correct:1,
    explain:'2014年G組集結了德國（4次冠軍）和葡萄牙（歐洲強權），加上實力不俗的美國和加納，被稱為最殘酷的死亡之組。' },
  { type:'viral', q:'世界盃史上哪位球員因為太年輕，家長必須簽署同意書才能參賽？',
    opts:['梅西（阿根廷）','貝利（巴西，17歲）','姆巴佩（法國）','魯尼（英格蘭）'], correct:1,
    explain:'貝利17歲就隨巴西隊參加1958年世界盃並在決賽進兩球奪冠，成為史上最年輕的世界盃冠軍球員。' },
  { type:'viral', q:'2018年世界盃，英格蘭球迷在比賽後狂歡到把什麼物品砸向空中？',
    opts:['啤酒杯','塑膠椅','折疊椅與啤酒','國旗'], correct:2,
    explain:'英格蘭每次進球後，酒吧裡的球迷都會瘋狂地把啤酒杯和折疊椅拋向空中，這些影片在社群媒體上廣為流傳。' },
  { type:'viral', q:'1950年世界盃「馬拉卡納悲劇」，烏拉圭以2:1擊敗主辦國巴西奪冠。賽後發生了什麼？',
    opts:['巴西球迷衝進球場慶祝烏拉圭','數名巴西球迷當場心臟病發','數位球員和球迷因悲慟而自殺','主教練當場宣布退休'], correct:1,
    explain:'這場被稱為「Maracanazo」的比賽結束後，20萬觀眾陷入沉默。據報導有多名球迷因過度悲傷而心臟病發。巴西因此將國家隊球衣從白色改為黃色。' },
  { type:'viral', q:'C羅在2022年世界盃分組賽對加納時，他與另一名球員爭奪進球認定。那球後來認定歸誰？',
    opts:['認定是C羅進球','認定是加納後衛烏龍球','FIFA至今未認定','認定是隊友貢薩維斯進球'], correct:1,
    explain:'C羅的頭球碰到了球但方向改變後進網，FIFA最終將此球判定為烏龍球而非C羅進球，讓他錯失世界盃正賽進球紀錄。' },
  { type:'viral', q:'哪支球隊在世界盃歷史上，曾以11:0的大比分羞辱對手？',
    opts:['德國','巴西','匈牙利（1982對薩爾瓦多10:1，史上最大）','阿根廷'], correct:2,
    explain:'1982年世界盃匈牙利10:1大勝薩爾瓦多，是世界盃正賽中最大的比分差距之一。薩爾瓦多在那屆三場小組賽共失了13球。' },
  { type:'viral', q:'2014年世界盃吉祥物「豪丁」（Fuleco）是什麼動物？',
    opts:['美洲豹','犰狳','貘','美洲獅'], correct:1,
    explain:'Fuleco 是一隻巴西三帶犰狳，這是巴西特有的瀕危物種。名字結合了「futebol」（足球）和「ecologia」（生態學）。' },
  { type:'viral', q:'梅西在2014年世界盃決賽失利後，哪個畫面讓全球球迷心疼瘋傳？',
    opts:['他在頒獎台上哭泣','他把金球獎獎盃放在地上','他獨自坐在草皮邊發呆','他拒絕接受亞軍獎牌'], correct:1,
    explain:'梅西在領取金球獎（最佳球員）後神情落寞地將獎盃放在地上，彷彿個人榮譽無法彌補球隊失冠的遺憾，這張照片成為經典。' },
  { type:'viral', q:'哪位足球員曾在世界盃後因為表現太差被球迷在機場「迎接」時遭到攻擊？',
    opts:['安德烈斯・埃斯科巴（哥倫比亞，1994年烏龍球後被殺）','梅西','魯尼','C羅'], correct:0,
    explain:'哥倫比亞後衛埃斯科巴在1994年世界盃踢進烏龍球導致球隊出局，回國後在酒吧外被槍殺。這是足球史上最悲慘的事件之一。' },
];

// ── 模擬全站投票數（依 FIFA 排名計算合理分佈）──────────────
function getSimVotes() {
  const daysSince = Math.max(1, Math.floor((Date.now() - new Date('2026-03-01').getTime()) / 86400000));
  const total = 1500 + daysSince * 38;
  const _T = typeof _teams === 'function' ? _teams() : (typeof TEAMS !== 'undefined' ? TEAMS : {});

  // 動態權重：若有 calcChampionOdds 則用動態機率，否則用 radar 基礎實力
  const dynOdds = typeof calcChampionOdds === 'function' ? calcChampionOdds() : [];
  const oddsMap = {};
  dynOdds.forEach(o => { oddsMap[o.code] = o.pct / 100; });

  const votes = {};
  const codes = Object.keys(_T);
  const fallbackShare = 1 / Math.max(1, codes.length);

  codes.forEach(code => {
    const t = _T[code];
    // 動態份額 > radar 推算 > 均分
    let share = oddsMap[code];
    if (share === undefined) {
      // 非 top5 球隊：用 radar 加權推算基礎份額
      const r = t?.radar;
      if (r) {
        const power = r.attack * 0.25 + r.defense * 0.2 + r.midfield * 0.25 + r.speed * 0.15 + r.experience * 0.15;
        share = Math.max(0.003, (power - 60) / 500);
      } else {
        share = fallbackShare * 0.3;
      }
    }
    // 加入微小隨機性（以 code 為種子，保持穩定）
    const jitter = 1 + (Array.from(code).reduce((s,c)=>s+c.charCodeAt(0),0) % 17 - 8) * 0.01;
    votes[code] = Math.max(1, Math.round(total * share * jitter));
  });
  return { votes, total: Object.values(votes).reduce((a,b)=>a+b,0) };
}

// ── 本地日期字串（以本地時間為準，半夜12點換題）────────────
function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── 取今日題目：固定循環 話題→一般→話題→難題→話題→一般 ──────
function getTodayQuestion() {
  const today  = localDateStr();
  const dayIdx = Math.floor((new Date(today) - new Date('2026-01-01')) / 86400000);

  // 根據賽事選擇題庫
  const tid = window.Tournament?.current?.() || 'wc';
  const qBank = tid === 'epl' && window.EPL_DAILY_QUESTIONS ? window.EPL_DAILY_QUESTIONS
    : tid === 'ucl' && window.UCL_DAILY_QUESTIONS ? window.UCL_DAILY_QUESTIONS
    : DAILY_QUESTIONS;

  const normals = qBank.filter(q => q.type === 'normal');
  const hards   = qBank.filter(q => q.type === 'hard');
  const virals  = qBank.filter(q => q.type === 'viral');

  // 4天循環：normal → viral → hard → viral → normal → viral → hard → viral…
  const CYCLE = ['normal', 'viral', 'hard', 'viral'];
  const poolType = CYCLE[dayIdx % CYCLE.length];
  const pool = poolType === 'hard' ? hards : poolType === 'viral' ? virals : normals;

  return { ...pool[dayIdx % pool.length], date: today };
}

// ── 連勝天數計算 ──────────────────────────────────────────
function getDailyState() {
  _syncGK();
  return load(GK.daily) || { streak:0, lastDate:null, history:{} };
}

function recordDailyAnswer(optIdx) {
  const today = localDateStr();
  const state = getDailyState();
  if (state.history[today] !== undefined) return state; // 今天已答

  const { correct } = getTodayQuestion();
  const isCorrect = optIdx === correct;

  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
  const newStreak = isCorrect ? (state.lastDate === yesterday ? state.streak + 1 : 1) : 0;
  state.streak   = newStreak;
  state.lastDate = today;
  state.history[today] = { chosen: optIdx, isCorrect };
  save(GK.daily, state);
  syncArenaToSupabase?.('daily');
  syncToSupabase?.();       // 同步 daily_answers 表
  syncXPToProfile?.();      // 即時更新排行榜 XP

  // 寶石獎勵（非同步，不阻塞UI）
  if (isCorrect) {
    onDailyCorrect?.();
    checkStreakGem?.(newStreak);
  }

  // 每日任務
  completeDailyTask?.('daily_quiz');

  return state;
}

// ── 等級獎勵表 ────────────────────────────────────────────
const LEVEL_GEM_REWARDS = { 2:2, 3:2, 5:3, 7:3, 10:5, 15:5, 20:10 };

// ── 預測結算系統 ──────────────────────────────────────────
function settlePredictions() {
  const newlySettled = [];
  ['wc26_', 'ucl26_', 'epl26_'].forEach(p => {
    const predsKey = p + 'my_preds';
    const settledKey = p + 'settled';
    const bonusKey = p + 'bonus_xp';
    const myPreds = (() => { try { return JSON.parse(localStorage.getItem(predsKey))||{}; } catch { return {}; } })();
    const settled = (() => { try { return JSON.parse(localStorage.getItem(settledKey))||{}; } catch { return {}; } })();
    let bonusXP = parseInt(localStorage.getItem(bonusKey)||'0') || 0;

    const matches = p === 'epl26_' ? (window.EPL_MATCHES||[]) : p === 'ucl26_' ? (window.UCL_MATCHES||[]) : (typeof SCHEDULE!=='undefined' ? SCHEDULE : []);

    for (const [matchId, pred] of Object.entries(myPreds)) {
      if (settled[matchId]) continue; // 已結算過
      const match = matches.find(m => m.id === matchId);
      if (!match || match.status !== 'finished' || !match.score) continue;

      const predH = pred.h, predA = pred.a;
      const actH = match.score.h, actA = match.score.a;
      const exact = predH === actH && predA === actA;
      const predDir = predH > predA ? 'h' : predA > predH ? 'a' : 'd';
      const actDir = actH > actA ? 'h' : actA > actH ? 'a' : 'd';
      const direction = predDir === actDir;

      const goalDiffMatch = direction && !exact && (predH - predA) === (actH - actA);

      let xpReward = 2; // 猜錯基底
      let gemReward = 0;
      if (exact)              { xpReward = 30; gemReward = 3; }
      else if (goalDiffMatch) { xpReward = 15; gemReward = 1; }
      else if (direction)     { xpReward = 10; }
      // 猜錯 = +2 XP（參與獎 +1 XP 在送出時已即時發放）

      bonusXP += xpReward;

      const result = {
        predH, predA, actH, actA, exact, direction, goalDiffMatch,
        xp: xpReward, gem: gemReward,
        settledAt: new Date().toISOString(),
        prefix: p
      };
      settled[matchId] = result;
      newlySettled.push({ matchId, ...result });

      // 寶石獎勵（透過 ref_id 確保每場只發一次）
      if (exact) awardGem?.('pred_exact', matchId);
      if (goalDiffMatch) awardGem?.('pred_goaldiff', matchId);
    }

    localStorage.setItem(settledKey, JSON.stringify(settled));
    localStorage.setItem(bonusKey, String(bonusXP));
  });

  if (newlySettled.length > 0) {
    updateNavXP?.();
    syncXPToProfile?.();
    checkTieredAchievements?.();
  }
  return newlySettled;
}

// ── 賽後結算彈窗 ──────────────────────────────────────────
function showSettlementPopups(settled) {
  const { prefix } = _gameCtx();
  const shownKey = prefix + 'settled_shown';
  const shown = (() => { try { return JSON.parse(localStorage.getItem(shownKey))||[]; } catch { return []; } })();
  const shownSet = new Set(shown);
  const queue = settled.filter(s => !shownSet.has(s.matchId));
  if (!queue.length) return;

  function showNext(idx) {
    if (idx >= queue.length) return;
    const s = queue[idx];
    const _T = s.prefix === 'epl26_' ? (window.EPL_TEAMS||{}) : s.prefix === 'ucl26_' ? (window.UCL_TEAMS||{}) : (typeof TEAMS!=='undefined' ? TEAMS : {});
    const matches = s.prefix === 'epl26_' ? (window.EPL_MATCHES||[]) : s.prefix === 'ucl26_' ? (window.UCL_MATCHES||[]) : (typeof SCHEDULE!=='undefined' ? SCHEDULE : []);
    const match = matches.find(m => m.id === s.matchId);
    const ht = _T[match?.home], at = _T[match?.away];
    const hFlag = ht ? flagImg(ht.flag) : '', aFlag = at ? flagImg(at.flag) : '';
    const hName = ht?.nameCN || match?.home || '?', aName = at?.nameCN || match?.away || '?';

    const icon = s.exact ? '🎯' : s.goalDiffMatch ? '🔥' : s.direction ? '✅' : '❌';
    const title = s.exact ? '完美命中！' : s.goalDiffMatch ? '比分差命中！' : s.direction ? '輸贏正確！' : '預測失誤';
    const color = s.exact ? '#4caf50' : s.goalDiffMatch ? '#ff9800' : s.direction ? 'var(--accent)' : '#ef9a9a';
    const rewardText = s.xp > 0 ? `+${s.xp} XP${s.gem ? ` +${s.gem} 💎` : ''}` : '';

    const overlay = document.createElement('div');
    overlay.className = 'settlement-overlay';
    overlay.innerHTML = `
      <div class="settlement-card">
        <div class="settlement-icon">${icon}</div>
        <div class="settlement-title" style="color:${color}">${title}</div>
        <div class="settlement-match">
          <span>${hFlag} ${hName}</span>
          <span style="color:var(--text-muted);margin:0 8px">vs</span>
          <span>${aFlag} ${aName}</span>
        </div>
        <div class="settlement-scores">
          <div class="settlement-score-box">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">你的預測</div>
            <div style="font-size:28px;font-weight:900">${s.predH} – ${s.predA}</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted);align-self:center">vs</div>
          <div class="settlement-score-box">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">實際結果</div>
            <div style="font-size:28px;font-weight:900;color:${color}">${s.actH} – ${s.actA}</div>
          </div>
        </div>
        ${rewardText ? `<div class="settlement-reward">${rewardText}</div>` : ''}
        <button class="btn-primary settlement-btn" onclick="this.closest('.settlement-overlay').remove()">
          ${idx < queue.length - 1 ? '下一場 →' : '繼續'}
        </button>
      </div>`;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.remove(); showNext(idx + 1); }
    });
    overlay.querySelector('.settlement-btn').addEventListener('click', () => { showNext(idx + 1); });
    document.body.appendChild(overlay);

    shown.push(s.matchId);
    localStorage.setItem(shownKey, JSON.stringify(shown));
  }
  showNext(0);
}

// 計算 XP 與等級（共用）
function calcXPLevel() {
  // 合併世足＋歐冠兩個賽事的 XP（排行榜共用）
  let xp = 0;
  ['wc26_', 'ucl26_'].forEach(p => {
    const daily  = load(p + 'daily') || { history:{} };
    const champ  = load(p + 'champion');
    const groups = load(p + 'groups');
    const team   = load(p + 'team');
    const correct = Object.values(daily.history).filter(v => v && v.isCorrect).length;
    xp += correct * 10 + (champ ? 50 : 0)
        + (groups && Object.keys(groups).length === 12 ? 50 : 0)
        + (team ? 30 : 0);
    // 預測結算獎勵 XP
    xp += parseInt(localStorage.getItem(p + 'bonus_xp')||'0') || 0;
  });
  // 射門遊戲累積 XP
  xp += parseInt(localStorage.getItem('rogue_total_xp') || '0') || 0;
  const xpPerLv = 100;
  const level   = Math.floor(xp / xpPerLv) + 1;
  const xpInLv  = xp % xpPerLv;
  return { xp, level, xpInLv, xpPerLv };
}

// ── 導覽列 XP 等級元件 ────────────────────────────────────
function updateNavXP() {
  const { xp, level, xpInLv, xpPerLv } = calcXPLevel();
  const prevLevel = parseInt(localStorage.getItem('wc26_last_level') || '1');

  // 偵測升級，觸發等級寶石獎勵
  if (level > prevLevel) {
    localStorage.setItem('wc26_last_level', level);
    for (let lv = prevLevel + 1; lv <= level; lv++) {
      if (LEVEL_GEM_REWARDS[lv]) {
        awardGem?.(`level_${lv}`).then(r => {
          if (r) showToast?.(`🎉 升到 Lv.${lv}！+${r.awarded} 寶石（餘額 ${r.balance}）`);
        });
      }
    }
  }

  const lvEl   = document.getElementById('nav-xp-level');
  const fillEl = document.getElementById('nav-xp-mini-fill');
  const ptsEl  = document.getElementById('nav-xp-pts');
  if (!lvEl) return;

  lvEl.textContent   = `⚡ Lv.${level}`;
  fillEl.style.width = `${xpInLv}%`;
  ptsEl.textContent  = `${xp} XP`;

  // 同步手機版選單狀態
  const mXp = document.getElementById('mobile-nav-xp');
  const mLv = document.getElementById('mobile-nav-lv');
  if (mXp) mXp.textContent = `${xp} XP`;
  if (mLv) mLv.textContent = level;
}

// ── 導覽列紅點徽章 ────────────────────────────────────────
function updateArenaBadge() {
  _syncGK();
  const today      = localDateStr();
  const dailyDone  = (load(GK.daily)?.history?.[today] !== undefined);
  const champDone  = !!load(GK.champion);
  const groupsDone = Object.keys(load(GK.groups)||{}).length === 12;
  const teamDone   = !!load(GK.team);
  const undone     = [dailyDone, champDone, groupsDone, teamDone].filter(v => !v).length;

  document.querySelectorAll('[data-section="arena"]').forEach(btn => {
    let badge = btn.querySelector('.arena-nav-badge');
    if (undone === 0) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'arena-nav-badge';
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
    badge.textContent = undone;
  });
}

// ── 首頁今日挑戰卡 ────────────────────────────────────────
function renderHomeDailyChallenge() {
  _syncGK();
  const el = document.getElementById('home-daily-section');
  if (!el) return;

  const today      = localDateStr();
  const state      = getDailyState();
  const dailyDone  = state.history[today] !== undefined;
  const champDone  = !!load(GK.champion);
  const groupsDone = Object.keys(load(GK.groups)||{}).length === 12;
  const teamDone   = !!load(GK.team);
  const { q, opts, correct, explain } = getTodayQuestion();
  const record     = state.history[today]; // {chosen, isCorrect} or undefined
  const chosen     = dailyDone ? record.chosen : -1;
  const wasCorrect = dailyDone ? record.isCorrect : false;

  function homeBtnClass(i) {
    if (!dailyDone) return '';
    if (i === correct) return 'selected';
    if (i === chosen && !wasCorrect) return 'wrong';
    return 'dimmed';
  }

  const _isClub = window.Tournament?.isUCL?.() || window.Tournament?.isEPL?.() || false;
  const pendingItems = [];
  if (!champDone)              pendingItems.push({ icon:'🏆', label:'冠軍預測', action:"openChampionPick()" });
  if (!groupsDone && !_isClub) pendingItems.push({ icon:'📋', label:'分組賽預測', action:"openGroupPicks()" });
  if (!teamDone)               pendingItems.push({ icon:'⚽', label:`選擇支持${_isClub?'球會':'球隊'}`, action:"openTeamSupport()" });

  el.innerHTML = `
    <div class="section-header">
      <h2><i class="fas fa-gamepad"></i> 今日競技場挑戰</h2>
      <button class="link-btn" onclick="showSection('arena');renderArena()">進入競技場 →</button>
    </div>

    <!-- 今日一題 -->
    <div class="home-daily-card">
      <div class="home-daily-header">
        <span class="home-daily-tag">❓ 每日一題</span>
        <span class="home-daily-streak">🔥 連勝 ${state.streak} 天</span>
      </div>
      <div class="home-daily-q">${q}</div>
      <div class="home-daily-opts">
        ${opts.map((o, i) => `
          <button class="home-daily-opt ${homeBtnClass(i)}"
            onclick="${dailyDone ? '' : `submitDailyPickHome(${i})`}"
            ${dailyDone ? 'disabled' : ''}>
            <span class="home-daily-letter">${'ABCD'[i]}</span>${o}
          </button>`).join('')}
      </div>
      ${!dailyDone ? `
      <div class="oracle-wrap" style="margin-top:12px">
        <button onclick="showDailyOracle(this)" style="width:100%;padding:9px;border-radius:10px;background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.3);color:rgba(200,150,255,0.9);font-size:12px;font-weight:700;cursor:pointer">
          🔮 不確定？問問大神
        </button>
      </div>` : ''}
      ${dailyDone ? `
      <div class="home-daily-done" style="color:${wasCorrect ? '#4caf50' : '#f44336'}">${wasCorrect ? '✅ 答對了！+10 XP 🎉' : `❌ 答錯了！正確答案是 ${opts[correct]}`}</div>
      ${explain ? `<div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;border-left:3px solid var(--accent);font-size:12px;color:var(--text-secondary);line-height:1.6">💡 ${explain}</div>` : ''}
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5">考考朋友，<br>看誰足球 IQ 最高！</div>
        <button onclick="shareDailyImage()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(255,109,0,0.25),rgba(255,109,0,0.1));border:1px solid rgba(255,109,0,0.45);color:#ff8c42;font-size:12px;font-weight:800;cursor:pointer">🧠 出題挑戰</button>
      </div>` : ''}
    </div>

    ${pendingItems.length > 0 ? `
    <!-- 待完成任務 -->
    <div class="home-pending-tasks">
      <div style="font-size:12px;color:var(--text-muted);font-weight:600;letter-spacing:1px;margin-bottom:10px">還有 ${pendingItems.length} 項未完成</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${pendingItems.map(item => `
          <button class="home-pending-btn" onclick="${item.action}">
            ${item.icon} ${item.label}
          </button>`).join('')}
      </div>
    </div>` : '<div class="home-pending-tasks" style="color:#4caf50;font-size:13px;font-weight:600">✅ 今日任務已完成！明天還有新的每日問答與挑戰，記得回來拿 XP 🔥</div>'}`;
}

function submitDailyPickHome(idx) {
  recordDailyAnswer(idx);
  updateNavXP();
  checkAchievements();
  renderHomeDailyChallenge();
  updateArenaBadge();
  // 同步更新競技場頁面（若已渲染）
  const arenaEl = document.getElementById('section-arena');
  if (arenaEl && arenaEl.innerHTML.trim()) renderArena();
}

// ── 首次進站提示（每 7 天出現一次）──────────────────────────
function showArenaWelcomeIfNeeded() {
  // 從遊戲分享連結進來不彈歡迎窗
  if (new URLSearchParams(window.location.search).get('play')) return;
  _syncGK();
  const { isUcl: _isUcl, isEpl: _isEpl, isClub: _isClub, label: _tournamentLabel } = _gameCtx();
  const KEY = (_gameCtx().prefix) + 'welcome_shown';
  const last = localStorage.getItem(KEY);
  const now  = Date.now();
  if (last && now - parseInt(last) < 7 * 86400000) return; // 7 天內不重複
  localStorage.setItem(KEY, String(now));

  const champDone  = !!load(GK.champion);
  const dailyState = getDailyState();
  if (champDone && dailyState.streak > 0) return; // 已深度參與，不打擾

  setTimeout(() => {
    const overlay = document.createElement('div');
    overlay.id = 'arena-welcome-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border-radius:20px;padding:32px 28px;max-width:380px;width:100%;text-align:center;border:1px solid var(--border)">
        <div style="font-size:48px;margin-bottom:12px">🏆</div>
        <div style="font-size:20px;font-weight:900;margin-bottom:8px">歡迎來到${_tournamentLabel}預測競技場</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:24px">
          現在就開始預測冠軍、${_isClub ? '挑選你支持的球會' : '填寫分組賽結果'}<br>
          每天答題累積連勝天數<br>
          <strong style="color:var(--accent)">${_isEpl ? '英超賽季火熱進行中！' : _isUcl ? '歐冠淘汰賽激戰中！' : '6月11日開賽，一起見證你的預測！'}</strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn-primary" onclick="document.getElementById('arena-welcome-overlay').remove();showSection('arena');renderArena()">
            <i class="fas fa-gamepad"></i> 前往競技場
          </button>
          <button onclick="document.getElementById('arena-welcome-overlay').remove()"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:var(--text-secondary);font-size:14px;cursor:pointer;padding:10px 20px;width:100%">
            稍後再說
          </button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }, 30000); // 頁面載入 30 秒後出現
}

// ── 球門粒子球網系統（Canvas） ────────────────────────────
function initGoalNetRipple() {
  const banner = document.querySelector('.rogue-arena-banner');
  if (!banner || banner._netInit) return;
  banner._netInit = true;

  const canvas = document.createElement('canvas');
  canvas.className = 'goal-net-canvas';
  // 插入到 content 之前，門柱之後
  const content = banner.querySelector('.rogue-arena-banner-content');
  banner.insertBefore(canvas, content);

  const ctx = canvas.getContext('2d');

  // ── 參數 ──
  const COLS       = 30;
  const ROWS       = 4;
  const REPEL_R    = 40;    // 斥力半徑
  const REPEL_STR  = 3;     // 斥力強度
  const SPRING     = 0.1;   // 回彈彈性
  const DAMPING    = 0.7;   // 阻尼
  const SIDE_PCT   = 0.05;  // 左右各 5% 斜向景深

  let back  = [];  // back[r][c]  中央+側面全在一個網格
  let top   = [];  // top[c]      橫樑→後方頂邊
  let allP  = [];
  let mouseX = -9999, mouseY = -9999;
  let animId = null;
  let W = 0, H = 0;

  function resize() {
    const rect = banner.getBoundingClientRect();
    W = canvas.width  = rect.width;
    H = canvas.height = rect.height;
    buildNet();
  }

  function mkP(x, y) {
    return { x, y, ox: x, oy: y, vx: 0, vy: 0 };
  }

  function buildNet() {
    back = []; top = []; allP = [];
    const pad = 6;
    const sideDepth = W * 0.06; // 側面向內收多少

    for (let r = 0; r <= ROWS; r++) {
      back[r] = [];
      const t = r / ROWS; // 0=頂(遠) 1=底(近)
      const y = pad + t * (H - pad * 2);

      for (let c = 0; c <= COLS; c++) {
        const ct = c / COLS; // 0~1
        // 中間 80% 直線；左右各 10% 向內斜收
        let x;
        if (ct <= SIDE_PCT) {
          // 左側 10%：從門柱(pad)斜向收到 sideW 處
          const st = ct / SIDE_PCT; // 0=門柱 1=進入中段
          const postX = pad;
          const innerX = pad + sideDepth;
          // 頂部(遠)收更多，底部(近)幾乎不收
          const depth = sideDepth * (1 - t) * 0.8;
          x = postX + st * (innerX + depth - postX);
        } else if (ct >= (1 - SIDE_PCT)) {
          // 右側 10%
          const st = (1 - ct) / SIDE_PCT;
          const postX = W - pad;
          const innerX = W - pad - sideDepth;
          const depth = sideDepth * (1 - t) * 0.8;
          x = postX - st * (postX - innerX - depth);
        } else {
          // 中間 80%：直線均分
          const midStart = pad + sideDepth;
          const midEnd   = W - pad - sideDepth;
          const midT = (ct - SIDE_PCT) / (1 - 2 * SIDE_PCT);
          x = midStart + midT * (midEnd - midStart);
        }

        const p = mkP(x, y);
        back[r][c] = p;
        allP.push(p);
      }
    }

    // ── 頂面網（橫樑→後方頂邊） ──
    for (let c = 0; c <= COLS; c++) {
      const p = mkP(back[0][c].ox, 2);
      top[c] = p;
      allP.push(p);
    }
  }

  function update() {
    for (let i = 0, len = allP.length; i < len; i++) {
      const p = allP[i];
      p.vx += (p.ox - p.x) * SPRING;
      p.vy += (p.oy - p.y) * SPRING;
      const dx = p.x - mouseX;
      const dy = p.y - mouseY;
      const d2 = dx * dx + dy * dy;
      if (d2 < REPEL_R * REPEL_R && d2 > 1) {
        const dist = Math.sqrt(d2);
        const f = (1 - dist / REPEL_R) * REPEL_STR;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // ── 網面（側面+中央一體） ──
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const p = back[r][c];
        if (c < COLS) { ctx.moveTo(p.x, p.y); ctx.lineTo(back[r][c+1].x, back[r][c+1].y); }
        if (r < ROWS) { ctx.moveTo(p.x, p.y); ctx.lineTo(back[r+1][c].x, back[r+1][c].y); }
      }
    }
    ctx.stroke();

    // ── 頂面網（橫樑→後方頂邊） ──
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.8;
    for (let c = 0; c <= COLS; c++) {
      const tp = top[c]; const bp = back[0][c];
      ctx.moveTo(tp.x, tp.y); ctx.lineTo(bp.x, bp.y);
      if (c < COLS) { ctx.moveTo(tp.x, tp.y); ctx.lineTo(top[c+1].x, top[c+1].y); }
    }
    ctx.stroke();

    // ── 交點粒子（小圓點） ──
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0, len = allP.length; i < len; i++) {
      const p = allP[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1, 0, 6.283);
      ctx.fill();
    }
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // 滑鼠事件（穿透 pointer-events:none 的 canvas，綁在 banner 上）
  banner.addEventListener('mousemove', (e) => {
    const rect = banner.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  banner.addEventListener('mouseleave', () => {
    mouseX = -9999; mouseY = -9999;
  });

  // 可見時才跑動畫
  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!animId) loop(); }
    else { cancelAnimationFrame(animId); animId = null; }
  });
  obs.observe(banner);

  window.addEventListener('resize', resize);
  resize();
  loop();
}

// ── 競技場主頁面 ──────────────────────────────────────────
function renderArena() {
  const el = document.getElementById('section-arena');
  if (!el) return;

  _syncGK();

  const myTeam     = load(GK.team);
  const myChampion = load(GK.champion);
  const myGroups   = load(GK.groups);
  const dailyState = getDailyState();
  const today      = localDateStr();
  const dailyDone  = dailyState.history[today] !== undefined;
  const groupsDone = myGroups && Object.keys(myGroups).length === 12;
  const answeredCount = Object.keys(dailyState.history).length;
  const correctCount  = Object.values(dailyState.history).filter(v => v && v.isCorrect).length;

  // XP & Level
  const { xp, level, xpInLv, xpPerLv } = calcXPLevel();
  const xpPct = xpInLv + '%';

  // 下一個等級獎勵提示
  const nextRewardLv = Object.keys(LEVEL_GEM_REWARDS).map(Number).find(lv => lv > level);
  const nextRewardGem = nextRewardLv ? LEVEL_GEM_REWARDS[nextRewardLv] : null;

  // Champion display
  const _tid = window.Tournament?.current?.() || 'wc';
  const _isUcl = _tid === 'ucl';
  const _isEpl = _tid === 'epl';
  const _isClub = _isUcl || _isEpl;
  const _T = _isEpl ? (window.EPL_TEAMS||{}) : _isUcl ? (window.UCL_TEAMS||{}) : (typeof TEAMS!=='undefined' ? TEAMS : {});
  const _tournamentLabel = _isEpl ? '英超' : _isUcl ? '歐冠' : '世界盃';
  const _teamLabel = _isClub ? '球會' : '球隊';
  const champC1  = myChampion ? _T[myChampion.c1] : null;
  const champFlag = champC1 ? `${flagImg(champC1.flag)} ${champC1.nameCN}` : '—';

  // Groups progress
  const groupCount = myGroups ? Object.keys(myGroups).length : 0;

  el.innerHTML = `
    <!-- 英雄區 -->
    <div class="arena-hero">
      <div class="arena-hero-title">⚔️ 預測競技場</div>
      <div class="arena-hero-sub">賽前預測 · 每日挑戰 · 成為最強預言家</div>
      <div class="arena-xp-bar-wrap">
        <div class="arena-xp-label">
          <span>⚡ Lv.${level} 預言家</span>
          <span>${xpInLv} / ${xpPerLv} XP</span>
        </div>
        <div class="arena-xp-track">
          <div class="arena-xp-fill" style="width:${xpPct}"></div>
        </div>
        ${nextRewardLv ? `
        <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:6px;text-align:right">
          升到 Lv.${nextRewardLv} 可獲得 💎×${nextRewardGem}
        </div>` : ''}
      </div>
    </div>

    <!-- 每日任務 -->
    <div id="daily-task-card" class="dtask-card dtask-expanded"></div>

    <!-- 個人戰況儀表板 -->
    <div class="arena-dashboard">
      <div class="arena-stat-card">
        <div class="arena-stat-icon">🔥</div>
        <div class="arena-stat-num">${dailyState.streak}</div>
        <div class="arena-stat-label">連勝天數</div>
      </div>
      <div class="arena-stat-card">
        <div class="arena-stat-icon">📋</div>
        <div class="arena-stat-num">${correctCount}/${answeredCount}</div>
        <div class="arena-stat-label">答對/答題</div>
      </div>
      <div class="arena-stat-card">
        <div class="arena-stat-icon">⚡</div>
        <div class="arena-stat-num">${xp}</div>
        <div class="arena-stat-label">總 XP</div>
      </div>
      <div class="arena-stat-card">
        <div class="arena-stat-icon">🎯</div>
        <div class="arena-stat-num">${(_isClub ? [myChampion,myTeam,dailyDone] : [myChampion,groupsDone,myTeam,dailyDone]).filter(Boolean).length}/${_isClub ? 3 : 4}</div>
        <div class="arena-stat-label">任務完成</div>
      </div>
    </div>

    <!-- 射門挑戰入口 -->
    <div class="rogue-arena-banner-wrap">
      <div class="rogue-arena-banner" onclick="startRogueGame()">
        <div class="rogue-arena-banner-bg"></div>
        <div class="goal-post-left"></div>
        <div class="goal-post-right"></div>
        <div class="goal-depth-shadow"></div>
        <div class="rogue-arena-banner-content">
          <div class="rogue-arena-banner-left">
            <div class="rogue-arena-banner-icon"><span class="rogue-kick-ball">⚽</span></div>
            <div>
              <div class="rogue-arena-banner-title">射門挑戰：前進世界盃</div>
              <div class="rogue-arena-banner-desc">射門 × 卡牌 Build × 無盡生存｜週排行前六名贏寶石</div>
            </div>
          </div>
          <div class="rogue-arena-banner-btn"><i class="fas fa-futbol"></i> 射門！</div>
        </div>
      </div>
    </div>

    <!-- 四大功能卡 -->
    <div class="arena-grid">

      <!-- ① 每日一題 -->
      <div class="arena-card ${dailyDone ? 'done' : 'urgent'}" onclick="openDailyPick()">
        <div class="arena-card-badge">${dailyDone ? '✅ 今日已完成' : '🔔 待作答'}</div>
        <span class="arena-card-icon">❓</span>
        <div class="arena-card-title">每日一題</div>
        <div class="arena-card-desc">每天一個${_tournamentLabel}話題，累積連勝天數，展現你的足球智慧</div>
        ${dailyState.streak > 0 ? `<div class="arena-card-streak">🔥 ${dailyState.streak} 天連勝</div>` : ''}
        <div class="arena-card-footer">
          <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.3)">
            +10 XP / 天 <span class="arena-card-gem">· 答對 <span class="gem-ico"></span>+1</span>
          </span>
          <span class="arena-card-cta">${dailyDone ? '已完成 ✓' : '立即作答 →'}</span>
        </div>
        <div onclick="event.stopPropagation()" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5">考考朋友，<br>看誰足球 IQ 最高！</div>
          <button id="btn-share-daily" onclick="shareDailyImage()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(255,109,0,0.25),rgba(255,109,0,0.1));border:1px solid rgba(255,109,0,0.45);color:#ff8c42;font-size:12px;font-weight:800;cursor:pointer">🧠 出題挑戰</button>
        </div>
      </div>

      <!-- ② 冠軍預測 -->
      <div class="arena-card ${myChampion ? 'done' : ''}" onclick="openChampionPick()">
        <div class="arena-card-badge">${myChampion ? '✅ 已鎖定' : '尚未預測'}</div>
        <span class="arena-card-icon">🏆</span>
        <div class="arena-card-title">冠軍預測</div>
        <div class="arena-card-desc">
          ${myChampion
            ? `你預測 <strong style="color:var(--accent)">${champFlag}</strong> 奪冠`
            : '選出你心目中的冠、亞、季軍，開賽前可修改'}
        </div>
        ${myChampion ? `<div class="arena-lock-hint">⏰ 開賽後永久鎖定</div>
        <div id="social-champion" class="arena-social-proof"></div>` : ''}
        <div class="arena-card-footer">
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">
            +50 XP ${!myChampion ? `<span class="arena-card-gem">· 首次 <span class="gem-ico"></span>+2</span>` : ''}
          </span>
          <span class="arena-card-cta">${myChampion ? '修改預測 →' : '開始預測 →'}</span>
        </div>
        ${myChampion ? `
        <div onclick="event.stopPropagation()" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5">曬出你的押注，<br>賽後看誰猜對！</div>
          <button onclick="shareChampionText()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,var(--accent-bg),var(--accent-bg-deep));border:1px solid var(--accent-border);color:var(--accent);font-size:12px;font-weight:800;cursor:pointer">🏆 曬我押注</button>
        </div>` : ''}
      </div>

      <!-- ③ 分組賽預測（歐冠/英超無分組賽，不顯示）-->
      ${_isClub ? '' : `<div class="arena-card ${groupsDone ? 'done' : ''}" onclick="openGroupPicks()">
        <div class="arena-card-badge">${groupsDone ? '✅ 全部填完' : `${groupCount}/12 組`}</div>
        <span class="arena-card-icon">📋</span>
        <div class="arena-card-title">分組賽預測</div>
        <div class="arena-card-desc">預測 12 組各自的前兩名出線隊伍，見證你的眼光</div>
        <div id="social-groups" class="arena-social-proof"></div>
        ${groupCount > 0 && !groupsDone ? `
        <div style="margin-top:12px">
          <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${Math.round(groupCount/12*100)}%;background:linear-gradient(90deg,#2196f3,#00bcd4);border-radius:999px;transition:width .5s ease"></div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:5px">${groupCount}/12 已完成</div>
        </div>` : ''}
        <div class="arena-card-footer">
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">
            +50 XP ${!groupsDone ? `<span class="arena-card-gem">· 首次 <span class="gem-ico"></span>+2</span>` : ''}
          </span>
          <span class="arena-card-cta">${groupsDone ? '修改預測 →' : groupCount > 0 ? '繼續填寫 →' : '開始填寫 →'}</span>
        </div>
        ${groupsDone ? `
        <div onclick="event.stopPropagation()" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5">生成精美預測圖，<br>PK 好友的選隊眼光！</div>
          <button onclick="shareGroupImage()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(33,150,243,0.25),rgba(33,150,243,0.1));border:1px solid rgba(33,150,243,0.45);color:#64b5f6;font-size:12px;font-weight:800;cursor:pointer">📊 分享預測圖</button>
        </div>` : ''}
      </div>`}

      <!-- ④ 支持球隊 -->
      <div class="arena-card ${myTeam ? 'done' : ''}" onclick="openTeamSupport()">
        <div class="arena-card-badge">${myTeam ? '✅ 已宣示' : '尚未選擇'}</div>
        <span class="arena-card-icon" style="font-size:44px">${myTeam && _T[myTeam]?.flag ? flagImg(_T[myTeam].flag) : '⚽'}</span>
        <div class="arena-card-title">宣示支持${_teamLabel}</div>
        <div class="arena-card-desc">
          ${myTeam
            ? `你支持 <strong style="color:#e91e63">${_T[myTeam]?.nameCN||myTeam}</strong>，全力加油！`
            : `選定一支你要整個${_tournamentLabel}陪伴的${_teamLabel}`}
        </div>
        ${myTeam ? `<div id="social-team" class="arena-social-proof"></div>` : ''}
        <div class="arena-card-footer">
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">
            +30 XP ${!myTeam ? `<span class="arena-card-gem">· 首次 <span class="gem-ico"></span>+1</span>` : ''}
          </span>
          <span class="arena-card-cta">${myTeam ? '更換球隊 →' : '選擇球隊 →'}</span>
        </div>
        ${myTeam ? `
        <div onclick="event.stopPropagation()" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5">讓朋友知道你力挺誰，<br>一起當死忠球迷！</div>
          <button onclick="shareTeamText()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(233,30,99,0.22),rgba(233,30,99,0.08));border:1px solid rgba(233,30,99,0.4);color:#f48fb1;font-size:12px;font-weight:800;cursor:pointer">⚽ 招募隊友</button>
        </div>` : ''}
      </div>

    </div>

    <!-- 通知訂閱卡片 -->
    <div id="notify-subscribe-card" class="notify-card" style="display:none">
      <div class="notify-card-left">
        <div style="font-size:28px;margin-bottom:6px">🔔</div>
        <div style="font-weight:800;font-size:15px;margin-bottom:4px">開啟每日一題提醒</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6">
          每天提醒你回來答題・維持連勝不中斷<br>賽事開始前預測提醒也不會錯過
        </div>
      </div>
      <button class="notify-subscribe-btn" onclick="subscribeNotification()">
        開啟提醒
      </button>
    </div>
    <div id="notify-subscribed-card" class="notify-card notify-card-done" style="display:none">
      <span style="font-size:20px">✅</span>
      <span style="font-size:13px;font-weight:700">已開啟每日提醒</span>
    </div>

    ${renderBadges()}

    <!-- 登入 / 排行榜區塊 -->
    ${!currentUser ? `
    <div class="arena-login-cta">
      <div class="arena-login-left">
        <div style="font-size:28px;margin-bottom:6px">🏅</div>
        <div style="font-weight:800;font-size:16px;margin-bottom:4px">登入後可上排行榜</div>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.6">
          你的預測與答題記錄將同步到雲端<br>
          跨裝置不遺失・與其他玩家一較高下
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--text-muted)">
          <span>✅ 冠軍預測得分</span>
          <span>✅ 每日答題連勝</span>
          <span>✅ 公開排名</span>
        </div>
      </div>
      <button class="arena-login-btn" onclick="loginWithGoogle()">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Google 登入，加入排行榜
      </button>
    </div>` : `
    <div style="margin-top:32px">
      <div class="section-header">
        <h2><i class="fas fa-trophy"></i> 玩家排行榜</h2>
        <div style="display:flex;gap:10px">
          <button class="link-btn" onclick="copyRefLink()">📨 邀請好友 +3<span class="gem-ico" style="width:11px;height:11px;margin-left:2px"></span></button>
          <button class="link-btn" onclick="renderLeaderboard('leaderboard-list')">重新整理</button>
        </div>
      </div>
      <div id="leaderboard-list" class="leaderboard-list" style="margin-top:12px">
        <div style="text-align:center;padding:30px;color:var(--text-muted)">載入中...</div>
      </div>
    </div>`}`;

  // 每日任務卡片
  renderDailyTaskCard();

  // 球門球網滑鼠撥弄效果
  initGoalNetRipple();

  // 如果已登入，載入排行榜
  if (currentUser) {
    setTimeout(() => renderLeaderboard?.('leaderboard-list'), 0);
  }

  // 通知訂閱卡片狀態
  updateNotifyCard();

  // 非同步填入社群感數字
  if (typeof fetchSocialProof === 'function') {
    fetchSocialProof().then(d => {
      const champEl = document.getElementById('social-champion')
      if (champEl && d.championCount > 1)
        champEl.textContent = `👥 另有 ${d.championCount - 1} 人與你同選`

      const groupsEl = document.getElementById('social-groups')
      if (groupsEl && d.groupsCount > 0)
        groupsEl.textContent = `👥 已有 ${d.groupsCount} 人完成分組預測`

      const teamEl = document.getElementById('social-team')
      if (teamEl && d.teamCount > 1)
        teamEl.textContent = `👥 另有 ${d.teamCount - 1} 人支持同隊`
    })
  }
}

// ── ① 每日一題 Modal ──────────────────────────────────────
function openDailyPick() {
  const { q, opts, correct, date, explain } = getTodayQuestion();
  const state = getDailyState();
  const answered = state.history[date] !== undefined;
  const record   = state.history[date]; // {chosen, isCorrect} or undefined
  const chosen   = answered ? record.chosen : -1;
  const wasCorrect = answered ? record.isCorrect : false;

  function btnClass(i) {
    if (!answered) return '';
    if (i === correct) return 'correct';
    if (i === chosen && !wasCorrect) return 'wrong';
    return 'dimmed';
  }

  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:32px;margin-bottom:8px">❓</div>
      <div style="font-size:11px;color:var(--text-muted);letter-spacing:1px;margin-bottom:4px">每日一題 · ${date}</div>
      <div style="font-size:13px;color:#4caf50">🔥 連勝 ${state.streak} 天</div>
    </div>
    <div style="font-size:17px;font-weight:700;color:var(--text-primary);margin-bottom:20px;line-height:1.5">${q}</div>
    <div class="daily-opts">
      ${opts.map((o,i) => `
        <button class="daily-opt ${btnClass(i)}"
          onclick="${answered ? '' : `submitDailyPick(${i})`}"
          style="${answered ? 'cursor:default' : ''}">
          <span class="daily-opt-letter">${'ABCD'[i]}</span>
          <span>${o}</span>
        </button>`).join('')}
    </div>
    ${!answered ? `
    <div class="oracle-wrap" style="margin-top:14px">
      <button onclick="showDailyOracle(this)" style="width:100%;padding:10px;border-radius:10px;background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.3);color:rgba(200,150,255,0.9);font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.5px">
        🔮 不確定？問問大神
      </button>
    </div>` : ''}
    ${answered ? `
      <div style="margin-top:16px;padding:12px;background:${wasCorrect ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'};border-radius:10px;text-align:center;color:${wasCorrect ? '#4caf50' : '#f44336'};font-size:13px">
        ${wasCorrect ? '✅ 答對了！+10 XP 明天繼續保持連勝 🔥' : `❌ 答錯了！正確答案是 <strong>${opts[correct]}</strong>`}
      </div>
      ${explain ? `<div style="margin-top:12px;padding:12px 14px;background:rgba(255,255,255,0.04);border-radius:10px;border-left:3px solid var(--accent)">
        <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px">💡 答案講解</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7">${explain}</div>
      </div>` : ''}` : ''}`;

  document.getElementById('team-modal').classList.add('open');
}

function submitDailyPick(idx) {
  recordDailyAnswer(idx);
  updateNavXP();
  checkAchievements();
  renderArena();
  openDailyPick();
}

// ── 大神神諭 ──────────────────────────────────────────────
const _ORACLE_LINES = [
  ['🔮', '大神掐指一算⋯⋯此題命中注定，你心中早有答案。'],
  ['🌙', '天機不可洩露，但你的第一直覺往往是對的。'],
  ['⭐', '星象顯示：左邊數來第二個選項散發神秘光芒。'],
  ['🀄', '大神抽了一張牌——逆位，代表答案出乎意料。'],
  ['💤', '大神剛睡醒，表示：選你覺得最不可能的那個。'],
  ['🧧', '今日運勢極佳，閉眼選一個，勝率比你想像中高。'],
  ['🐉', '龍年餘威未退，龍的傳人選 A 從未讓大神失望過。'],
  ['🌀', '大神正在星際旅行，訊號不穩，請自求多福。'],
  ['🎱', '大神問了神奇八號球——答案是：『不要問我』。'],
  ['🦉', '智慧之鳥說：越難的題，越多人猜錯，你是例外嗎？'],
  ['🔭', '大神遠眺宇宙，看到了答案，但宇宙要求保密。'],
  ['🧿', '邪眼護身符提示：相信你的直覺，不要改答案。'],
  ['📿', '念珠轉了三圈，大神說：此題答案藏在題目裡。'],
  ['🎴', '抽到上上籤！但大神提醒：上上籤不代表選 A。'],
  ['🌊', '海浪說話了：這題連章魚保羅也沒把握，加油。'],
]

function showDailyOracle(btnEl) {
  const line = _ORACLE_LINES[Math.floor(Math.random() * _ORACLE_LINES.length)]
  const wrap = btnEl.closest('.oracle-wrap')
  if (!wrap) return
  wrap.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:rgba(138,43,226,0.1);border:1px solid rgba(138,43,226,0.3);border-radius:12px;animation:fadeIn .4s ease;margin-bottom:10px">
      <span style="font-size:24px;flex-shrink:0">${line[0]}</span>
      <div>
        <div style="font-size:10px;color:rgba(180,130,255,0.7);font-weight:700;letter-spacing:1px;margin-bottom:4px">大神神諭</div>
        <div style="font-size:13px;color:rgba(220,180,255,0.9);line-height:1.6">${line[1]}</div>
      </div>
    </div>
    <button onclick="shareDailyImage()" style="width:100%;padding:10px;border-radius:10px;background:rgba(255,109,0,0.12);border:1px solid rgba(255,109,0,0.35);color:#ff8c42;font-size:13px;font-weight:800;cursor:pointer">
      🤝 大神也不確定？問問朋友！
    </button>`
}

// ── ② 冠軍預測 Modal ──────────────────────────────────────
function openChampionPick() {
  _syncGK();
  const current = load(GK.champion);
  const { votes, total } = getSimVotes();
  const { isClub, isEpl, _T } = _gameCtx();
  const allCodes = isEpl
    ? Object.keys(_T).sort((a,b) => (_T[a].eplRank||99) - (_T[b].eplRank||99))
    : isClub
      ? Object.keys(_T).sort((a,b) => (_T[b].uefaCoeff||0) - (_T[a].uefaCoeff||0))
      : Object.keys(_T).sort((a,b) => (_T[a].fifaRank||99) - (_T[b].fifaRank||99));

  const teamOpt = (code, role, selected) => {
    const t = _T[code];
    const pct = ((votes[code]||1) / total * 100).toFixed(1);
    return `<div class="champ-team-opt ${selected===code?'selected':''}" onclick="selectChampTeam('${role}','${code}')">
      <span style="font-size:22px">${flagImg(t.flag)}</span>
      <span style="font-size:13px;font-weight:600">${t.nameCN}</span>
      <span style="font-size:11px;color:var(--text-muted)">${pct}%</span>
    </div>`;
  };

  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:32px;margin-bottom:8px">🏆</div>
      <div style="font-size:18px;font-weight:800">冠軍預測投票</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">開賽前可修改，開賽後永久鎖定</div>
    </div>

    <div id="champ-picks" data-c1="${current?.c1||''}" data-c2="${current?.c2||''}" data-c3="${current?.c3||''}">

      <div class="champ-section-label">🥇 冠軍</div>
      <div class="champ-team-list" id="champ-c1-list">
        ${allCodes.map(c => teamOpt(c, 'c1', current?.c1)).join('')}
      </div>

      <div class="champ-section-label" style="margin-top:16px">🥈 亞軍</div>
      <div class="champ-team-list" id="champ-c2-list">
        ${allCodes.map(c => teamOpt(c, 'c2', current?.c2)).join('')}
      </div>

      <div class="champ-section-label" style="margin-top:16px">🥉 季軍</div>
      <div class="champ-team-list" id="champ-c3-list">
        ${allCodes.map(c => teamOpt(c, 'c3', current?.c3)).join('')}
      </div>

    </div>

    <button class="btn-primary" style="width:100%;margin-top:20px" onclick="saveChampionPick()">
      <i class="fas fa-lock"></i> 確認提交預測
    </button>

    ${current ? `<div style="text-align:center;margin-top:10px;font-size:12px;color:var(--text-muted)">
      上次提交：${new Date(current.lockedAt).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
    </div>` : ''}`;

  document.getElementById('team-modal').classList.add('open');
}

function selectChampTeam(role, code) {
  const el = document.getElementById(`champ-${role}-list`);
  el.querySelectorAll('.champ-team-opt').forEach(b => b.classList.remove('selected'));
  el.querySelector(`[onclick*="'${code}'"]`)?.classList.add('selected');
  document.getElementById('champ-picks').dataset[role] = code;
}

function saveChampionPick() {
  _syncGK();
  const picks = document.getElementById('champ-picks');
  const c1 = picks.dataset.c1, c2 = picks.dataset.c2, c3 = picks.dataset.c3;
  if (!c1 || !c2 || !c3) { showToast('⚠️ 請選擇冠、亞、季軍各一支球隊'); return; }
  if (c1===c2 || c1===c3 || c2===c3) { showToast('⚠️ 冠亞季軍不能選同一支球隊'); return; }
  save(GK.champion, { c1, c2, c3, lockedAt: new Date().toISOString() });
  syncToSupabase?.();
  syncXPToProfile?.();
  syncArenaToSupabase?.('picks');
  onFirstChampion?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  closeModal();
}

// ── ③ 分組賽預測 Modal ────────────────────────────────────
function openGroupPicks() {
  _syncGK();
  const current = load(GK.groups) || {};
  const groupKeys = Object.keys(GROUPS).sort();

  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <div style="font-size:18px;font-weight:800">分組賽預測</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">每組選出你預測的前兩名出線隊伍</div>
    </div>
    <div id="group-picks-form">
      ${groupKeys.map(g => {
        const gd = GROUPS[g];
        const picked = current[g] || [];
        return `<div class="group-pick-block">
          <div class="group-pick-title">${gd.name}</div>
          <div class="group-pick-teams" data-group="${g}">
            ${(gd.teams||[]).map(code => {
              const t = TEAMS[code];
              if (!t) return '';
              const sel = picked.includes(code);
              return `<div class="group-pick-team ${sel?'selected':''}" data-code="${code}" onclick="toggleGroupPick('${g}','${code}',this)">
                <span>${flagImg(t.flag)}</span>
                <span>${t.nameCN}</span>
              </div>`;
            }).join('')}
          </div>
          <div class="group-pick-hint" id="hint-${g}">${picked.length===2 ? '✓ 已選 2 隊' : `請再選 ${2-picked.length} 隊`}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn-primary" style="flex:1" onclick="saveGroupPicks()">
        <i class="fas fa-save"></i> 儲存預測
      </button>
      ${Object.keys(current).length === groupKeys.length && Object.values(current).every(v=>v.length===2) ? `
      <button class="btn-primary" style="flex:0 0 auto;background:linear-gradient(135deg,#1565c0,#0d47a1)" onclick="shareGroupImage()">
        <i class="fas fa-share-alt"></i> 分享預測
      </button>` : ''}
    </div>`;

  document.getElementById('team-modal').classList.add('open');
}

function toggleGroupPick(group, code, el) {
  const container = document.querySelector(`.group-pick-teams[data-group="${group}"]`);
  const selected  = [...container.querySelectorAll('.group-pick-team.selected')];
  if (el.classList.contains('selected')) {
    el.classList.remove('selected');
  } else {
    if (selected.length >= 2) { selected[0].classList.remove('selected'); }
    el.classList.add('selected');
  }
  const newCount = container.querySelectorAll('.selected').length;
  const hint = document.getElementById('hint-' + group);
  if (hint) hint.textContent = newCount===2 ? '✓ 已選 2 隊' : `請再選 ${2-newCount} 隊`;
}

function saveGroupPicks() {
  _syncGK();
  const groups = {};
  let incomplete = 0;
  document.querySelectorAll('.group-pick-teams').forEach(container => {
    const g = container.dataset.group;
    const sel = [...container.querySelectorAll('.group-pick-team.selected')].map(el => el.dataset.code).filter(Boolean);
    groups[g] = sel;
    if (sel.length < 2) incomplete++;
  });
  if (incomplete > 0) {
    showToast(`⚠️ 還有 ${incomplete} 組未選滿 2 隊，請完成後再儲存`);
    return;
  }
  save(GK.groups, groups);
  syncToSupabase?.();
  syncXPToProfile?.();
  syncArenaToSupabase?.('picks');
  onFirstGroups?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  showSharePromptAfterGroups();
}

// ── 每日一題分享圖 ────────────────────────────────────────
async function shareDailyImage() {
  completeDailyTask?.('share_any');
  const { q, opts } = getTodayQuestion()
  const dailyState  = getDailyState()
  const streak      = dailyState.streak || 0
  const shareLink   = await (async () => {
    try { return await getMyRefLink?.() || _shareBaseUrl() } catch { return _shareBaseUrl() }
  })()

  // QR Code + Logo
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}&color=0a0f1e&bgcolor=ffffff&margin=8`
  const [qrImg, logoImg] = await Promise.all([
    loadImg(qrUrl).catch(() => null),
    loadImg('img/logo-soccermaddy.png').catch(() => null)
  ])

  // Canvas 尺寸
  const W = 800, PAD = 36
  const H = 860
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // ── 背景 ──────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#07091a')
  bg.addColorStop(0.5, '#0d1030')
  bg.addColorStop(1, '#07091a')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // 裝飾光暈
  const glow = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, 400)
  glow.addColorStop(0, 'rgba(240,192,64,0.07)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  // ── Header：Logo + 標題 ──────────────────────
  const _ctx = _gameCtx()
  const logoH = 44
  if (logoImg) {
    const lw = logoImg.width * (logoH / logoImg.height)
    ctx.drawImage(logoImg, PAD, 24, lw, logoH)
    ctx.fillStyle = '#f0c040'
    ctx.font = `800 22px "Noto Sans TC", sans-serif`
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(_ctx.platformName, PAD + lw + 12, 24 + logoH * 0.4)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = `500 13px "Noto Sans TC", sans-serif`
    ctx.fillText(window.location.host, PAD + lw + 12, 24 + logoH * 0.4 + 22)
  } else {
    ctx.fillStyle = '#f0c040'
    ctx.font = `800 22px "Noto Sans TC", sans-serif`
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(_ctx.platformName, PAD, 24 + logoH * 0.4)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = `500 13px "Noto Sans TC", sans-serif`
    ctx.fillText(window.location.host, PAD, 24 + logoH * 0.4 + 22)
  }

  // 分隔線
  ctx.strokeStyle = 'rgba(240,192,64,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 100); ctx.lineTo(W - PAD, 100); ctx.stroke()

  // ── Hook 文字 ─────────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f0c040'
  ctx.font = `900 34px "Noto Sans TC", sans-serif`
  ctx.fillText('🧠 你知道答案嗎？', W/2, 148)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `500 16px "Noto Sans TC", sans-serif`
  ctx.fillText('朋友幫我一起想想，掃碼來答題挑戰！', W/2, 182)

  // ── 題目卡 ────────────────────────────────────────────
  const cardX = PAD, cardY = 210, cardW = W - PAD*2, cardH = 170
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.strokeStyle = 'rgba(240,192,64,0.35)'
  ctx.lineWidth = 1.5
  roundRect(ctx, cardX, cardY, cardW, cardH, 16)
  ctx.fill(); ctx.stroke()

  // 題目文字（多行）
  ctx.fillStyle = '#f0f0f0'
  ctx.font = `700 21px "Noto Sans TC", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const qLines = []
  let qLine = ''
  for (const ch of q) {
    const test = qLine + ch
    if (ctx.measureText(test).width > cardW - 48) { qLines.push(qLine); qLine = ch }
    else qLine = test
  }
  if (qLine) qLines.push(qLine)
  const qStartY = cardY + (cardH - qLines.length * 32) / 2
  qLines.forEach((ln, i) => ctx.fillText(ln, cardX + 24, qStartY + i * 32))

  // ── 選項（2列2行）────────────────────────────────────
  const labels = ['A', 'B', 'C', 'D']
  const optColors = ['rgba(33,150,243,0.18)', 'rgba(76,175,80,0.18)', 'rgba(255,152,0,0.18)', 'rgba(156,39,176,0.18)']
  const optBorder = ['rgba(33,150,243,0.5)', 'rgba(76,175,80,0.5)', 'rgba(255,152,0,0.5)', 'rgba(156,39,176,0.5)']
  const optLabelC = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc']
  const oW = (W - PAD*2 - 20) / 2, oH = 64
  const oStartY = 400

  opts.forEach((opt, i) => {
    const col = i % 2, row = Math.floor(i / 2)
    const ox = PAD + col * (oW + 20), oy = oStartY + row * (oH + 14)

    ctx.fillStyle = optColors[i]
    ctx.strokeStyle = optBorder[i]
    ctx.lineWidth = 1.5
    roundRect(ctx, ox, oy, oW, oH, 12)
    ctx.fill(); ctx.stroke()

    // label 圓圈
    ctx.fillStyle = optBorder[i]
    ctx.beginPath(); ctx.arc(ox + 28, oy + oH/2, 14, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `800 14px "Noto Sans TC", sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(labels[i], ox + 28, oy + oH/2)

    // 選項文字
    ctx.fillStyle = '#f0f0f0'
    ctx.font = `600 15px "Noto Sans TC", sans-serif`
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    const maxOptW = oW - 60
    let optTxt = opt
    while (ctx.measureText(optTxt).width > maxOptW && optTxt.length > 4) optTxt = optTxt.slice(0,-1) + '…'
    ctx.fillText(optTxt, ox + 50, oy + oH/2)
  })

  // ── 連勝 Banner（有連勝時才顯示）─────────────────────
  let footerY = 560
  if (streak >= 3) {
    ctx.fillStyle = 'rgba(255,152,0,0.12)'
    ctx.strokeStyle = 'rgba(255,152,0,0.4)'
    ctx.lineWidth = 1
    roundRect(ctx, PAD, footerY, W - PAD*2, 52, 12)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#ffa726'
    ctx.font = `700 16px "Noto Sans TC", sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`🔥 我已連勝答題 ${streak} 天！你能打破紀錄嗎？`, W/2, footerY + 26)
    footerY += 66
  }

  // ── 底部：QR Code + CTA ───────────────────────────────
  const qrSize = 130
  const qrX = PAD + 20, qrY = footerY + 20

  // QR 白底
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10)
  ctx.fill()
  if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

  // CTA 文字
  const ctaX = qrX + qrSize + 30, ctaY = qrY + 10
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#f0c040'
  ctx.font = `900 26px "Noto Sans TC", sans-serif`
  ctx.fillText('掃碼來答題！', ctaX, ctaY)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `500 14px "Noto Sans TC", sans-serif`
  ctx.fillText(`每天一題${_ctx.label}知識挑戰`, ctaX, ctaY + 38)
  ctx.fillText('看誰的足球 IQ 最高！', ctaX, ctaY + 60)

  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = `400 12px "Noto Sans TC", sans-serif`
  ctx.fillText(shareLink, ctaX, ctaY + 90)

  // ── 輸出 ──────────────────────────────────────────────
  canvas.toBlob(async blob => {
    const file = new File([blob], 'daily-challenge.png', { type: 'image/png' })
    const link = await getMyRefLink?.() || _shareBaseUrl()
    const shareText = `🧠 今日${_ctx.label}挑戰題，你知道答案嗎？快來挑戰！\n${link}`
    if (_isMobile() && navigator.share) {
      // LINE 等 App 在有 files 時不顯示 text，所以先複製文字到剪貼簿
      try { await navigator.clipboard.writeText(shareText) } catch {}
      // 分享圖片（帶 text 給支援的 App，如 iMessage、Telegram）
      const shareData = navigator.canShare?.({ files: [file], text: shareText })
        ? { files: [file], title: '🧠 每日一題挑戰', text: shareText }
        : navigator.canShare?.({ files: [file] })
          ? { files: [file] }
          : { title: '🧠 每日一題挑戰', text: shareText }
      showToast('📋 文字已複製！分享圖片後可在聊天室貼上文字')
      try {
        await navigator.share(shareData)
      } catch { /* 用戶取消分享 */ }
    } else {
      showDesktopShareModal({ blob, link, filename: 'daily-challenge.png', title: '🧠 出題挑戰', text: shareText })
    }
  }, 'image/png')
}

// ── 電腦版分享 Modal ─────────────────────────────────────
// 只有真正的行動裝置才用 Web Share API（Windows/Mac 桌機的 navigator.share 會開系統 UI）
function _isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// 全域暫存，供 Modal 內 onclick 使用
let _dsImgUrl = null, _dsFilename = 'share.png'

function _dsDownload() {
  const a = document.createElement('a')
  a.href = _dsImgUrl; a.download = _dsFilename; a.click()
}
async function _dsCopyImg() {
  try {
    const r = await fetch(_dsImgUrl)
    const b = await r.blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
    showToast('✅ 圖片已複製！打開 Telegram 直接 Ctrl+V 貼上')
  } catch {
    showToast('⚠️ 瀏覽器不支援複製圖片，請用下載後再傳')
  }
}

function showDesktopShareModal({ blob, text, link, title, filename }) {
  _dsImgUrl   = blob ? URL.createObjectURL(blob) : null
  _dsFilename = filename || 'share.png'
  const mc = document.getElementById('modal-content')
  const shareUrl  = link || _shareBaseUrl()
  const shareText = (text || '').split('\n')[0]
  const eu = encodeURIComponent(shareUrl)
  const et = encodeURIComponent(shareText)
  const ef = encodeURIComponent(text || shareText)  // full text for some platforms

  // 平台設定
  const platforms = [
    { name:'Telegram', color:'#229ED9', href:`https://t.me/share/url?url=${eu}&text=${et}`,
      icon:`<svg width="20" height="20" viewBox="0 0 240 240" fill="white"><path d="M120 0C53.7 0 0 53.7 0 120s53.7 120 120 120 120-53.7 120-120S186.3 0 120 0zm58.9 82.4-20.3 95.7c-1.5 6.7-5.5 8.4-11.1 5.2l-30.7-22.6-14.8 14.3c-1.6 1.6-3 2.9-6.2 2.9l2.2-31.2 56.8-51.3c2.5-2.2-.5-3.4-3.8-1.2L63.5 141.1l-30.1-9.4c-6.5-2-6.7-6.5 1.4-9.7L171 74.5c5.4-2 10.2 1.3 7.9 7.9z"/></svg>` },
    { name:'LINE', color:'#00C300', href:`https://social-plugins.line.me/lineit/share?url=${eu}&text=${et}`,
      icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>` },
    { name:'WhatsApp', color:'#25D366', href:`https://wa.me/?text=${et}%20${eu}`,
      icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>` },
    { name:'X / Twitter', color:'#000', border:'rgba(255,255,255,0.2)', href:`https://twitter.com/intent/tweet?text=${et}&url=${eu}`,
      icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.902-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` },
    { name:'Facebook', color:'#1877F2', href:`https://www.facebook.com/sharer/sharer.php?u=${eu}`,
      icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` },
    { name:'Reddit', color:'#FF4500', href:`https://reddit.com/submit?url=${eu}&title=${et}`,
      icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>` },
  ]

  const platformBtns = platforms.map(p => `
    <a href="${p.href}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 8px;border-radius:14px;background:${p.color};border:1px solid ${p.border||'transparent'};color:#fff;text-decoration:none;font-size:11px;font-weight:700;transition:opacity .2s" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
      ${p.icon}
      ${p.name}
    </a>`).join('')

  mc.innerHTML = `
    <div style="padding:4px 0">
      <div style="font-size:16px;font-weight:800;margin-bottom:14px;text-align:center">${title || '分享'}</div>

      ${_dsImgUrl ? `
      <div style="border-radius:12px;overflow:hidden;background:#0a0a0a;margin-bottom:16px;max-height:220px;display:flex;align-items:center;justify-content:center">
        <img src="${_dsImgUrl}" style="width:100%;object-fit:contain;display:block;max-height:220px">
      </div>` : `
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.7);white-space:pre-wrap">${text || ''}</div>`}

      <!-- 平台按鈕網格 -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        ${platformBtns}
      </div>

      <!-- 複製 / 下載 -->
      <div style="display:flex;gap:9px;margin-bottom:10px">
        ${_dsImgUrl ? `
        <button onclick="_dsCopyImg()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:#fff;font-weight:700;font-size:12px;cursor:pointer">
          📋 複製圖片
        </button>
        <button onclick="_dsDownload()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);font-weight:600;font-size:12px;cursor:pointer">
          📥 下載圖片
        </button>` : `
        <button onclick="navigator.clipboard.writeText(${JSON.stringify(text||'')}).then(()=>showToast('✅ 已複製！'))" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:#fff;font-weight:700;font-size:12px;cursor:pointer">
          📋 複製文字
        </button>
        <button onclick="navigator.clipboard.writeText(${JSON.stringify(shareUrl)}).then(()=>showToast('✅ 連結已複製！'))" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);font-weight:600;font-size:12px;cursor:pointer">
          🔗 複製連結
        </button>`}
      </div>
      ${_dsImgUrl ? `<div style="font-size:10px;color:rgba(255,255,255,0.2);text-align:center;margin-bottom:8px">平台分享會附網站連結 · 傳圖片請用「複製圖片」後貼上</div>` : ''}
      <button onclick="closeModal()" style="width:100%;padding:9px;background:transparent;color:rgba(255,255,255,0.2);font-size:12px;border:none;cursor:pointer">關閉</button>
    </div>`
  document.getElementById('team-modal').classList.add('open')
}

// ── 冠軍預測分享 ──────────────────────────────────────────
async function shareChampionText() {
  completeDailyTask?.('share_any');
  const champion = load(GK.champion)
  if (!champion) return
  const _ctx = _gameCtx()
  const _T = _ctx._T
  const t1 = _T[champion.c1], t2 = _T[champion.c2], t3 = _T[champion.c3]
  const link = await getMyRefLink?.() || _shareBaseUrl()
  const eventName = _ctx.fullName
  const shareText = `🏆 我的${eventName}冠軍預測\n🥇 冠軍：${t1?.nameCN||champion.c1}\n🥈 亞軍：${t2?.nameCN||champion.c2}\n🥉 季軍：${t3?.nameCN||champion.c3}\n\n你猜對了嗎？來挑戰我的眼光！\n${link}`

  // QR Code
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&color=0a0f1e&bgcolor=ffffff&margin=8`
  const [qrImg, flag1, flag2, flag3, logoImg] = await Promise.all([
    loadImg(qrUrl).catch(() => null),
    loadImg(getFlagImgUrl(t1?.flag)).catch(() => null),
    loadImg(getFlagImgUrl(t2?.flag)).catch(() => null),
    loadImg(getFlagImgUrl(t3?.flag)).catch(() => null),
    loadImg('img/logo-soccermaddy.png').catch(() => null)
  ])

  const W = 800, H = 720, PAD = 36
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#07091a'); bg.addColorStop(0.5, '#0d1030'); bg.addColorStop(1, '#07091a')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W/2, 180, 0, W/2, 180, 350)
  glow.addColorStop(0, 'rgba(240,192,64,0.1)'); glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  // Header：Logo + 標題
  const logoH = 44
  if (logoImg) {
    const lw = logoImg.width * (logoH / logoImg.height)
    ctx.drawImage(logoImg, PAD, 24, lw, logoH)
    ctx.fillStyle = '#f0c040'; ctx.font = `800 22px "Noto Sans TC", sans-serif`
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(_ctx.platformName, PAD + lw + 12, 24 + logoH * 0.4)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `500 13px "Noto Sans TC", sans-serif`
    ctx.fillText(window.location.host, PAD + lw + 12, 24 + logoH * 0.4 + 22)
  } else {
    ctx.fillStyle = '#f0c040'; ctx.font = `800 22px "Noto Sans TC", sans-serif`
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(_ctx.platformName, PAD, 24 + logoH * 0.4)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `500 13px "Noto Sans TC", sans-serif`
    ctx.fillText(window.location.host, PAD, 24 + logoH * 0.4 + 22)
  }
  ctx.strokeStyle = 'rgba(240,192,64,0.25)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 100); ctx.lineTo(W-PAD, 100); ctx.stroke()

  // 標題
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f0c040'; ctx.font = `900 32px "Noto Sans TC", sans-serif`
  ctx.fillText('🏆 我的冠軍預測', W/2, 140)

  // 三強卡片
  const medals = [
    { label:'🥇 冠軍', name: t1?.nameCN||champion.c1, flag: flag1, color:'#f0c040', bgA:'rgba(240,192,64,0.12)', border:'rgba(240,192,64,0.5)', size:90 },
    { label:'🥈 亞軍', name: t2?.nameCN||champion.c2, flag: flag2, color:'#c0c0c0', bgA:'rgba(192,192,192,0.08)', border:'rgba(192,192,192,0.3)', size:70 },
    { label:'🥉 季軍', name: t3?.nameCN||champion.c3, flag: flag3, color:'#cd7f32', bgA:'rgba(205,127,50,0.08)', border:'rgba(205,127,50,0.3)', size:70 }
  ]
  // 冠軍居中大圖
  const champY = 190, champFlagSize = medals[0].size
  ctx.fillStyle = medals[0].bgA
  ctx.strokeStyle = medals[0].border; ctx.lineWidth = 2
  roundRect(ctx, W/2-120, champY, 240, 180, 16); ctx.fill(); ctx.stroke()
  if (flag1) ctx.drawImage(flag1, W/2 - champFlagSize/2, champY + 16, champFlagSize, champFlagSize)
  ctx.fillStyle = medals[0].color; ctx.font = `800 13px "Noto Sans TC", sans-serif`
  ctx.fillText(medals[0].label, W/2, champY + champFlagSize + 28)
  ctx.fillStyle = '#fff'; ctx.font = `900 24px "Noto Sans TC", sans-serif`
  ctx.fillText(medals[0].name, W/2, champY + champFlagSize + 56)

  // 亞軍、季軍左右
  const subY = 400, subW = 200, subH = 140
  ;[1, 2].forEach((mi, idx) => {
    const m = medals[mi]
    const cx = idx === 0 ? W/2 - 130 : W/2 + 130
    ctx.fillStyle = m.bgA; ctx.strokeStyle = m.border; ctx.lineWidth = 1.5
    roundRect(ctx, cx - subW/2, subY, subW, subH, 14); ctx.fill(); ctx.stroke()
    if (m.flag) ctx.drawImage(m.flag, cx - m.size/2, subY + 12, m.size, m.size)
    ctx.fillStyle = m.color; ctx.font = `700 12px "Noto Sans TC", sans-serif`
    ctx.fillText(m.label, cx, subY + m.size + 22)
    ctx.fillStyle = '#fff'; ctx.font = `800 18px "Noto Sans TC", sans-serif`
    ctx.fillText(m.name, cx, subY + m.size + 46)
  })

  // CTA + QR
  const qrSize = 100, qrX = PAD + 20, qrY = 570
  ctx.fillStyle = '#fff'; roundRect(ctx, qrX-5, qrY-5, qrSize+10, qrSize+10, 8); ctx.fill()
  if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  const ctaX = qrX + qrSize + 28
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#f0c040'; ctx.font = `900 22px "Noto Sans TC", sans-serif`
  ctx.fillText('你選誰？來押注！', ctaX, qrY + 8)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = `500 14px "Noto Sans TC", sans-serif`
  ctx.fillText('掃碼或點連結，選出你的冠軍預測', ctaX, qrY + 42)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = `400 12px "Noto Sans TC", sans-serif`
  ctx.fillText(link, ctaX, qrY + 70)

  // 輸出
  canvas.toBlob(async blob => {
    const file = new File([blob], 'champion-prediction.png', { type: 'image/png' })
    if (_isMobile() && navigator.share) {
      try { await navigator.clipboard.writeText(shareText) } catch {}
      const shareData = navigator.canShare?.({ files: [file], text: shareText })
        ? { files: [file], title: '🏆 冠軍預測', text: shareText } : { files: [file] }
      showToast('📋 文字已複製！分享圖片後可在聊天室貼上文字')
      try { await navigator.share(shareData) } catch {}
    } else {
      showDesktopShareModal({ blob, link, filename: 'champion-prediction.png', title: '🏆 曬我的冠軍押注', text: shareText })
    }
  }, 'image/png')
}

// ── 支持球隊分享 ──────────────────────────────────────────
async function shareTeamText() {
  completeDailyTask?.('share_any');
  const teamCode = load(GK.team)
  if (!teamCode) return
  const _ctx = _gameCtx()
  const _T = _ctx._T
  const t = _T[teamCode]
  if (!t) return
  const link = await getMyRefLink?.() || _shareBaseUrl()
  const eventName = _ctx.fullName
  const shareText = `⚽ ${eventName}，我宣示支持 ${t.nameCN}！\n整個賽事我都陪著他們！\n一起來預測吧👇\n${link}`

  const [qrImg, flagImg2, logoImg] = await Promise.all([
    loadImg(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&color=0a0f1e&bgcolor=ffffff&margin=8`).catch(() => null),
    loadImg(getFlagImgUrl(t.flag)).catch(() => null),
    loadImg('img/logo-soccermaddy.png').catch(() => null)
  ])

  const W = 800, H = 600, PAD = 36
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#07091a'); bg.addColorStop(0.5, '#0d1030'); bg.addColorStop(1, '#07091a')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  // 球隊色光暈
  const glow = ctx.createRadialGradient(W/2, 200, 0, W/2, 200, 300)
  glow.addColorStop(0, 'rgba(30,136,229,0.1)'); glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

  // Header：Logo + 標題
  const logoH = 40
  if (logoImg) {
    const lw = logoImg.width * (logoH / logoImg.height)
    ctx.drawImage(logoImg, PAD, 20, lw, logoH)
    ctx.fillStyle = '#f0c040'; ctx.font = `800 20px "Noto Sans TC", sans-serif`
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(_ctx.platformName, PAD + lw + 10, 20 + logoH * 0.4)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `500 12px "Noto Sans TC", sans-serif`
    ctx.fillText(window.location.host, PAD + lw + 10, 20 + logoH * 0.4 + 20)
  } else {
    ctx.fillStyle = '#f0c040'; ctx.font = `800 20px "Noto Sans TC", sans-serif`
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    ctx.fillText(_ctx.platformName, PAD, 20 + logoH * 0.4)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = `500 12px "Noto Sans TC", sans-serif`
    ctx.fillText(window.location.host, PAD, 20 + logoH * 0.4 + 20)
  }
  ctx.strokeStyle = 'rgba(240,192,64,0.25)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(PAD, 88); ctx.lineTo(W-PAD, 88); ctx.stroke()

  // 中央：球隊旗幟 + 宣示文
  const flagSize = 130
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  if (flagImg2) ctx.drawImage(flagImg2, W/2 - flagSize/2, 110, flagSize, flagSize)
  // 光環
  ctx.strokeStyle = 'rgba(240,192,64,0.3)'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(W/2, 110 + flagSize/2, flagSize/2 + 16, 0, Math.PI*2); ctx.stroke()

  ctx.fillStyle = '#fff'; ctx.font = `900 32px "Noto Sans TC", sans-serif`
  ctx.fillText(t.nameCN, W/2, 270)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `600 14px "Noto Sans TC", sans-serif`
  ctx.fillText(t.name || '', W/2, 302)

  // 宣言
  ctx.fillStyle = '#f0c040'; ctx.font = `800 20px "Noto Sans TC", sans-serif`
  ctx.fillText(`⚽ 整個${_ctx.label}賽事，我只挺這隊！`, W/2, 350)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = `500 15px "Noto Sans TC", sans-serif`
  ctx.fillText('你支持誰？掃碼來宣示你的主隊！', W/2, 382)

  // QR + CTA
  const qrSize = 90, qrX = PAD + 20, qrY = 420
  ctx.fillStyle = '#fff'; roundRect(ctx, qrX-5, qrY-5, qrSize+10, qrSize+10, 8); ctx.fill()
  if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'
  ctx.fillStyle = '#f0c040'; ctx.font = `900 20px "Noto Sans TC", sans-serif`
  ctx.fillText('來選你的主隊！', qrX + qrSize + 24, qrY + 8)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `500 13px "Noto Sans TC", sans-serif`
  ctx.fillText('掃碼加入預測，一起為喜歡的隊伍加油', qrX + qrSize + 24, qrY + 38)
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = `400 12px "Noto Sans TC", sans-serif`
  ctx.fillText(link, qrX + qrSize + 24, qrY + 62)

  // 底部裝飾線
  const bar = ctx.createLinearGradient(0, 0, W, 0)
  bar.addColorStop(0, 'transparent'); bar.addColorStop(0.3, '#f0c040'); bar.addColorStop(0.7, '#f0c040'); bar.addColorStop(1, 'transparent')
  ctx.fillStyle = bar; ctx.fillRect(0, H-3, W, 3)

  // 輸出
  canvas.toBlob(async blob => {
    const file = new File([blob], 'team-support.png', { type: 'image/png' })
    if (_isMobile() && navigator.share) {
      try { await navigator.clipboard.writeText(shareText) } catch {}
      const shareData = navigator.canShare?.({ files: [file], text: shareText })
        ? { files: [file], title: '⚽ 我支持的隊伍', text: shareText } : { files: [file] }
      showToast('📋 文字已複製！分享圖片後可在聊天室貼上文字')
      try { await navigator.share(shareData) } catch {}
    } else {
      showDesktopShareModal({ blob, link, filename: 'team-support.png', title: '⚽ 招募隊友', text: shareText })
    }
  }, 'image/png')
}

// ── 儲存分組後彈出分享提示 ────────────────────────────────
function showSharePromptAfterGroups() {
  const mc = document.getElementById('modal-content')
  mc.innerHTML = `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:52px;margin-bottom:12px">🎉</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:8px">分組預測完成！</div>
      <div style="font-size:14px;color:var(--text-muted);line-height:1.7;margin-bottom:24px">
        要把你的預測分享給朋友嗎？<br>生成精美預測圖，附上專屬 QR Code
      </div>
      <button onclick="closeModal();setTimeout(shareGroupImage,200)" style="width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent-dk));color:#07091a;font-weight:800;font-size:15px;border:none;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px">
        <i class="fas fa-share-alt"></i> 分享我的預測
      </button>
      <button onclick="closeModal()" style="width:100%;padding:12px;border-radius:12px;background:transparent;color:var(--text-muted);font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer">
        稍後再說
      </button>
    </div>`
  document.getElementById('team-modal').classList.add('open')
}

// ── 分享分組預測圖片 ──────────────────────────────────────
// 全域盾牌繪製（供所有分享圖共用）
function drawShield(ctx, cx, cy, size, fill, stroke) {
  const s = size / 48
  ctx.save()
  ctx.translate(cx - 24 * s, cy - 27 * s)
  ctx.scale(s, s)
  ctx.beginPath()
  ctx.moveTo(24, 2)
  ctx.lineTo(44, 10); ctx.lineTo(44, 28)
  ctx.bezierCurveTo(44, 40, 34, 50, 24, 53)
  ctx.bezierCurveTo(14, 50, 4, 40, 4, 28)
  ctx.lineTo(4, 10); ctx.closePath()
  ctx.fillStyle = fill; ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5 / s; ctx.stroke() }
  ctx.beginPath()
  ctx.moveTo(24, 5.5)
  ctx.lineTo(41, 12.5); ctx.lineTo(41, 28)
  ctx.bezierCurveTo(41, 38.5, 32.5, 47.5, 24, 50)
  ctx.bezierCurveTo(15.5, 47.5, 7, 38.5, 7, 28)
  ctx.lineTo(7, 12.5); ctx.closePath()
  const ig = ctx.createLinearGradient(0, 0, 0, 54)
  ig.addColorStop(0, '#0d1525'); ig.addColorStop(1, '#0a0f1e')
  ctx.fillStyle = ig; ctx.fill()
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    const px = 24 + 13 * Math.cos(a), py = 29 + 13 * Math.sin(a)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.strokeStyle = 'rgba(240,192,64,0.6)'; ctx.lineWidth = 1.2 / s; ctx.stroke()
  ctx.fillStyle = 'rgba(240,192,64,0.85)'
  ctx.font = `bold ${9 / s}px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('2026', 24, 19)
  ctx.fillStyle = '#f0c040'
  ctx.font = `bold ${13 / s}px sans-serif`
  ctx.fillText('★', 24, 34)
  ctx.restore()
}

// 預載圖片 helper（crossOrigin anonymous，外部 URL 透過 wsrv.nl 代理）
function loadImg(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src.startsWith('http') ? `https://wsrv.nl/?url=${encodeURIComponent(src)}` : src
  })
}

async function shareGroupImage() {
  completeDailyTask?.('share_any');
  const groups = load(GK.groups)
  if (!groups) return

  showToast('⏳ 正在產生分享圖...')

  const groupKeys = Object.keys(GROUPS).sort()
  const SITE_URL = window.location.host

  // ── 取得分享者邀請連結 ───────────────────────────────
  let shareLink = _shareBaseUrl()
  if (currentUser) {
    try {
      const { data } = await DB.from('profiles').select('ref_code').eq('id', currentUser.id).maybeSingle()
      const _grpTid = window.Tournament?.current?.() || 'wc'
      if (data?.ref_code) shareLink = _grpTid !== 'wc'
        ? `${window.location.origin}?t=${_grpTid}&ref=${data.ref_code}`
        : `${window.location.origin}?ref=${data.ref_code}`
    } catch {}
  }

  // ── 預載所有國旗圖片（使用全域 getFlagImgUrl）────────
  const allCodes = [...new Set(groupKeys.flatMap(g => groups[g] || []))]
  const flagImgs = {}
  await Promise.all(allCodes.map(async code => {
    const t = TEAMS[code]
    if (!t?.flag) return
    const url = getFlagImgUrl(t.flag)
    if (url) flagImgs[code] = await loadImg(url)
  }))

  // ── 預載 QR Code + Logo ───────────────
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}&color=0a0f1e&bgcolor=ffffff&margin=8`
  const [qrImg, logoImg] = await Promise.all([
    loadImg(qrUrl),
    loadImg('img/logo-soccermaddy.png').catch(() => null)
  ])

  // ── 直式 Canvas（手機分享友善）────────────────────────
  const W = 800, PAD = 28
  const HEADER_H = 190
  const COLS = 3, ROWS = 4
  const CARD_W = Math.floor((W - PAD * (COLS + 1)) / COLS)
  const CARD_H = 100
  const GRID_H = ROWS * CARD_H + (ROWS + 1) * PAD
  const FOOTER_H = 180
  const H = HEADER_H + GRID_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // ── 背景（深色漸層 + 金色斜線裝飾）─────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0a0f1e')
  bg.addColorStop(0.5, '#0d1525')
  bg.addColorStop(1, '#0a0f1e')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 頂部金色光暈
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 300)
  glow.addColorStop(0, 'rgba(240,192,64,0.12)')
  glow.addColorStop(1, 'rgba(240,192,64,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, 300)

  // 底部藍色光暈
  const glow2 = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 300)
  glow2.addColorStop(0, 'rgba(33,150,243,0.1)')
  glow2.addColorStop(1, 'rgba(33,150,243,0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, H - 300, W, 300)

  // 頂部金色邊線
  const topBar = ctx.createLinearGradient(0, 0, W, 0)
  topBar.addColorStop(0, 'transparent')
  topBar.addColorStop(0.3, '#f0c040')
  topBar.addColorStop(0.7, '#f0c040')
  topBar.addColorStop(1, 'transparent')
  ctx.fillStyle = topBar
  ctx.fillRect(0, 0, W, 3)

  // ── Header（Logo + 標題）────────────────────────
  const sx = W / 2
  const _grpCtx = _gameCtx()

  // Logo 居中
  if (logoImg) {
    const lh = 60, lw = logoImg.width * (lh / logoImg.height)
    // 光暈背景
    const glowR = ctx.createRadialGradient(sx, 52, 0, sx, 52, 70)
    glowR.addColorStop(0, 'rgba(240,192,64,0.18)')
    glowR.addColorStop(1, 'rgba(240,192,64,0)')
    ctx.fillStyle = glowR
    ctx.fillRect(sx - 70, 0, 140, 120)
    ctx.drawImage(logoImg, sx - lw / 2, 22, lw, lh)
  }

  // 標題
  ctx.fillStyle = '#f0c040'
  ctx.font = 'bold 30px sans-serif'
  ctx.textAlign = 'center'
  const _grpTitle = _grpCtx.isEpl ? '我的英超賽季預測' : _grpCtx.isUcl ? '我的歐冠聯賽階段預測' : '我的世界盃分組晉級預測'
  ctx.fillText(_grpTitle, W / 2, 136)

  // 副標題
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '15px sans-serif'
  const _grpSub = _grpCtx.isEpl ? 'English Premier League 2025/26' : _grpCtx.isUcl ? 'UEFA Champions League 2025/26 · League Phase' : 'FIFA World Cup 2026 · Group Stage Predictions'
  ctx.fillText(_grpSub, W / 2, 164)

  // 分隔線
  const divGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0)
  divGrad.addColorStop(0, 'transparent')
  divGrad.addColorStop(0.5, 'rgba(240,192,64,0.4)')
  divGrad.addColorStop(1, 'transparent')
  ctx.strokeStyle = divGrad
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, HEADER_H - 12)
  ctx.lineTo(W - PAD, HEADER_H - 12)
  ctx.stroke()

  // ── 各組卡片（3欄4行）────────────────────────────────
  groupKeys.forEach((g, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = PAD + col * (CARD_W + PAD)
    const y = HEADER_H + PAD + row * (CARD_H + PAD)
    const gd = GROUPS[g]
    const picked = groups[g] || []

    // 卡片背景（帶邊框）
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    roundRect(ctx, x, y, CARD_W, CARD_H, 12)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    roundRect(ctx, x, y, CARD_W, CARD_H, 12)
    ctx.stroke()

    // 左側金色細邊
    ctx.fillStyle = '#f0c040'
    roundRect(ctx, x, y, 4, CARD_H, 2)
    ctx.fill()

    // 組別標題
    ctx.fillStyle = '#f0c040'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(gd.name, x + 14, y + 22)

    // 兩支球隊
    picked.slice(0, 2).forEach((code, idx) => {
      const t = TEAMS[code]
      if (!t) return
      const ty = y + 40 + idx * 30

      // 行背景
      ctx.fillStyle = idx === 0 ? 'rgba(76,175,80,0.12)' : 'rgba(33,150,243,0.1)'
      roundRect(ctx, x + 10, ty - 12, CARD_W - 20, 24, 5)
      ctx.fill()

      // 名次標籤
      ctx.fillStyle = idx === 0 ? '#4caf50' : '#2196f3'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(idx === 0 ? '1ST' : '2ND', x + 16, ty + 3)

      // 國旗圖片
      const flag = flagImgs[code]
      if (flag) {
        const fh = 16, fw = Math.round(flag.width * (fh / flag.height))
        ctx.drawImage(flag, x + 44, ty - 8, fw, fh)
        // 球隊中文名
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = '12px sans-serif'
        ctx.fillText(t.nameCN, x + 44 + fw + 6, ty + 3)
      } else {
        // fallback：顯示代碼
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(code, x + 44, ty + 3)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = '11px sans-serif'
        ctx.fillText(t.nameCN, x + 76, ty + 3)
      }
    })

    if (picked.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('未完成', x + CARD_W / 2, y + CARD_H / 2 + 5)
    }
  })

  // ── Footer ────────────────────────────────────────────
  const footerY = HEADER_H + GRID_H + 10

  // 分隔線
  const divGrad2 = ctx.createLinearGradient(PAD, 0, W - PAD, 0)
  divGrad2.addColorStop(0, 'transparent')
  divGrad2.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  divGrad2.addColorStop(1, 'transparent')
  ctx.strokeStyle = divGrad2
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, footerY)
  ctx.lineTo(W - PAD, footerY)
  ctx.stroke()

  // QR Code 白底框 + 圖片
  const QR_SIZE = 110
  const qrX = W - PAD - QR_SIZE
  const qrY = footerY + 24

  ctx.fillStyle = '#ffffff'
  roundRect(ctx, qrX - 8, qrY - 8, QR_SIZE + 16, QR_SIZE + 16, 10)
  ctx.fill()

  if (qrImg) {
    ctx.drawImage(qrImg, qrX, qrY, QR_SIZE, QR_SIZE)
  }

  // QR Code 說明
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('掃碼預測', qrX + QR_SIZE / 2, qrY + QR_SIZE + 22)

  // 左側 CTA 文字
  const ctaX = PAD
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('你猜誰能晉級？', ctaX, footerY + 44)

  ctx.fillStyle = '#f0c040'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText('來挑戰我的預測！', ctaX, footerY + 74)

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '13px sans-serif'
  ctx.fillText(`AI 驅動 · ${_grpCtx.label}預測分析平台`, ctaX, footerY + 102)

  // 網址
  ctx.fillStyle = 'rgba(240,192,64,0.8)'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText(shareLink.replace('https://', ''), ctaX, footerY + 130)

  // 底部金色邊線
  const botBar = ctx.createLinearGradient(0, 0, W, 0)
  botBar.addColorStop(0, 'transparent')
  botBar.addColorStop(0.3, '#f0c040')
  botBar.addColorStop(0.7, '#f0c040')
  botBar.addColorStop(1, 'transparent')
  ctx.fillStyle = botBar
  ctx.fillRect(0, H - 3, W, 3)

  // ── 輸出 ──────────────────────────────────────────────
  canvas.toBlob(async blob => {
    if (!blob) { showToast('❌ 圖片產生失敗'); return }
    const fname = _grpCtx.isEpl ? 'epl-prediction.png' : _grpCtx.isUcl ? 'ucl-league-prediction.png' : 'wc2026-group-prediction.png'
    const file = new File([blob], fname, { type: 'image/png' })
    const grpShareText = `📊 我的${_grpCtx.fullName}預測出爐！來挑戰我的選隊眼光！\n${shareLink}`
    if (_isMobile() && navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.clipboard.writeText(grpShareText) } catch {}
      showToast('📋 文字已複製！分享圖片後可在聊天室貼上文字')
      try {
        await navigator.share({ title: `我的${_grpCtx.fullName}預測`, text: grpShareText, files: [file] })
        return
      } catch {}
    }
    // 電腦版：開啟分享 Modal
    showDesktopShareModal({ blob, link: shareLink, filename: fname, title: '📊 分享我的分組預測', text: grpShareText })
  }, 'image/png')
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── ④ 支持球隊 Modal ──────────────────────────────────────
function openTeamSupport() {
  _syncGK();
  const current = load(GK.team);
  const { isClub, isEpl, _T, label, teamWord } = _gameCtx();
  const sorted = isEpl
    ? Object.entries(_T).sort((a,b) => (a[1].eplRank||99) - (b[1].eplRank||99))
    : isClub
      ? Object.entries(_T).sort((a,b) => (b[1].uefaCoeff||0) - (a[1].uefaCoeff||0))
      : Object.entries(_T).sort((a,b) => (a[1].fifaRank||99) - (b[1].fifaRank||99));
  const { votes, total } = getSimVotes();

  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:32px;margin-bottom:8px">⚽</div>
      <div style="font-size:18px;font-weight:800">宣示支持${teamWord}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">選一支你要在整個${label}陪伴的${isClub ? '球會' : '隊伍'}</div>
    </div>
    <div class="support-team-grid" id="support-team-grid">
      ${sorted.map(([code, t]) => {
        const fanCount = Math.round((votes[code]||1) * 3.2);
        return `<div class="support-team-card ${current===code?'selected':''}" onclick="selectSupportTeam('${code}')">
          <div style="font-size:28px">${flagImg(t.flag)}</div>
          <div style="font-size:12px;font-weight:700">${t.nameCN}</div>
          <div style="font-size:10px;color:var(--text-muted)">${fanCount.toLocaleString()} 人支持</div>
        </div>`;
      }).join('')}
    </div>
    <button class="btn-primary" style="width:100%;margin-top:20px" onclick="saveSupportTeam()">
      <i class="fas fa-heart"></i> 確認支持
    </button>`;

  document.getElementById('team-modal').classList.add('open');
}

let _pendingSupportTeam = null;
function selectSupportTeam(code) {
  _pendingSupportTeam = code;
  document.querySelectorAll('.support-team-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.support-team-card[onclick*="'${code}'"]`)?.classList.add('selected');
}

function saveSupportTeam() {
  _syncGK();
  const code = _pendingSupportTeam || load(GK.team);
  if (!code) { showToast('⚠️ 請選擇一支球隊'); return; }
  save(GK.team, code);
  syncToSupabase?.();
  syncXPToProfile?.();
  syncArenaToSupabase?.('picks');
  onFirstTeam?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  closeModal();
}

// ── 成就徽章系統 ──────────────────────────────────────────
// ── 進階成就（銅/銀/金三階）──────────────────────────────
const TIERED_BADGES = [
  { id:'pred_direction', icon:'🧭', tiers:[
    { name:'方向感',     desc:'正確預測勝負方向 3 次',  threshold:3 },
    { name:'方向大師',   desc:'正確預測勝負方向 10 次', threshold:10 },
    { name:'神準方向',   desc:'正確預測勝負方向 25 次', threshold:25 },
  ]},
  { id:'pred_exact', icon:'🎯', tiers:[
    { name:'精準出手',   desc:'命中精確比分 1 次',  threshold:1 },
    { name:'比分獵人',   desc:'命中精確比分 3 次',  threshold:3 },
    { name:'完美預言',   desc:'命中精確比分 10 次', threshold:10 },
  ]},
  { id:'matches_unlocked', icon:'🏟️', tiers:[
    { name:'初探門道',   desc:'解鎖 5 場比賽',  threshold:5 },
    { name:'解鎖達人',   desc:'解鎖 15 場比賽', threshold:15 },
    { name:'全場制霸',   desc:'解鎖 30 場比賽', threshold:30 },
  ]},
  { id:'referrals', icon:'🤝', tiers:[
    { name:'口耳相傳',   desc:'邀請 1 位朋友',  threshold:1 },
    { name:'推廣大使',   desc:'邀請 5 位朋友',  threshold:5 },
    { name:'社群領袖',   desc:'邀請 10 位朋友', threshold:10 },
  ]},
  { id:'level', icon:'⭐', tiers:[
    { name:'小有成就',   desc:'達到 Lv.5',  threshold:5 },
    { name:'經驗豐富',   desc:'達到 Lv.10', threshold:10 },
    { name:'傳奇玩家',   desc:'達到 Lv.20', threshold:20 },
  ]},
  { id:'streak', icon:'🔥', tiers:[
    { name:'三日連勝',   desc:'連續答題 3 天',  threshold:3 },
    { name:'週不停歇',   desc:'連續答題 7 天',  threshold:7 },
    { name:'鐵人預言家', desc:'連續答題 30 天', threshold:30 },
  ]},
];

function loadTieredBadges() {
  return (() => { try { return JSON.parse(localStorage.getItem('wc26_tiered_badges'))||[]; } catch { return []; } })();
}

function getTieredValues() {
  let predDir = 0, predExact = 0;
  for (const p of ['wc26_', 'ucl26_']) {
    const settled = (() => { try { return JSON.parse(localStorage.getItem(p + 'settled'))||{}; } catch { return {}; } })();
    const entries = Object.values(settled);
    predDir += entries.filter(s => s.direction).length;
    predExact += entries.filter(s => s.exact).length;
  }
  const unlocked = window.unlockedMatchSet?.size || 0;
  const referrals = parseInt(localStorage.getItem('wc26_referral_count')||'0') || 0;
  const level = calcXPLevel().level;
  const streak = getDailyState().streak || 0;
  return { pred_direction: predDir, pred_exact: predExact, matches_unlocked: unlocked, referrals, level, streak };
}

function checkTieredAchievements() {
  const earned = loadTieredBadges();
  const earnedMap = {};
  earned.forEach(b => { earnedMap[b.id] = b.tier; });
  const vals = getTieredValues();
  const newOnes = [];

  TIERED_BADGES.forEach(badge => {
    const currentVal = vals[badge.id] || 0;
    const currentTier = earnedMap[badge.id] ?? -1;
    badge.tiers.forEach((t, tierIdx) => {
      if (tierIdx > currentTier && currentVal >= t.threshold) {
        earnedMap[badge.id] = tierIdx;
        newOnes.push({ id: badge.id, tier: tierIdx, icon: badge.icon, name: t.name, desc: t.desc, earnedAt: new Date().toISOString() });
      }
    });
  });

  if (newOnes.length > 0) {
    // 更新 earned 陣列（保留最高 tier）
    const updated = [];
    const seen = new Set();
    // 先加新的（最高 tier）
    for (const n of newOnes) {
      if (!seen.has(n.id)) { updated.push(n); seen.add(n.id); }
    }
    // 保留舊的沒被更新的
    for (const e of earned) {
      if (!seen.has(e.id)) { updated.push(e); seen.add(e.id); }
    }
    localStorage.setItem('wc26_tiered_badges', JSON.stringify(updated));
    syncArenaToSupabase?.('picks');
    // Toast 動畫
    const tierLabels = ['🥉 銅階', '🥈 銀階', '🥇 金階'];
    newOnes.forEach((b, i) => setTimeout(() => showBadgeToast({ ...b, name: `${tierLabels[b.tier]} ${b.name}` }), i * 1200));
    // 重渲染競技場
    const arenaEl = document.getElementById('section-arena');
    if (arenaEl && arenaEl.innerHTML.trim()) renderArena();
  }
}

const BADGES = [
  { id:'first_daily',   icon:'🎯', name:'初次出擊',   desc:'完成第一次每日一題',     rarity:'common' },
  { id:'streak3',       icon:'🔥', name:'三連勝',     desc:'連續答題 3 天',          rarity:'rare' },
  { id:'streak7',       icon:'💥', name:'週不停歇',   desc:'連續答題 7 天',          rarity:'epic' },
  { id:'streak30',      icon:'⚡', name:'鐵人預言家', desc:'連續答題 30 天',         rarity:'legendary' },
  { id:'champion_set',  icon:'🏆', name:'冠軍直覺',   desc:'完成冠軍預測',           rarity:'common' },
  { id:'groups_done',   icon:'📋', name:'全組預測師', desc:'填完所有 12 組分組預測', rarity:'rare' },
  { id:'team_set',      icon:'❤️', name:'死忠球迷',   desc:'宣示支持球隊',           rarity:'common' },
  { id:'all_tasks',     icon:'🌟', name:'任務達人',   desc:'完成所有競技場任務',     rarity:'rare' },
  { id:'answered10',    icon:'🧠', name:'積累智慧',   desc:'累計答題 10 次',         rarity:'rare' },
  { id:'answered30',    icon:'🎓', name:'資深預言家', desc:'累計答題 30 次',         rarity:'epic' },
];

function loadBadges() {
  return load('wc26_badges') || [];
}

function checkAchievements() {
  _syncGK();
  const earned    = loadBadges();
  const earnedIds = new Set(earned.map(b => b.id));
  const newOnes   = [];

  const dailyState    = getDailyState();
  const myChampion    = load(GK.champion);
  const myGroups      = load(GK.groups);
  const myTeam        = load(GK.team);
  const answeredCount = Object.keys(dailyState.history).length;
  const groupsDone    = myGroups && Object.keys(myGroups).length === 12;
  const allDone       = myChampion && groupsDone && myTeam && answeredCount > 0;

  const conditions = {
    first_daily:  answeredCount >= 1,
    streak3:      dailyState.streak >= 3,
    streak7:      dailyState.streak >= 7,
    streak30:     dailyState.streak >= 30,
    champion_set: !!myChampion,
    groups_done:  !!groupsDone,
    team_set:     !!myTeam,
    all_tasks:    !!allDone,
    answered10:   answeredCount >= 10,
    answered30:   answeredCount >= 30,
  };

  BADGES.forEach(b => {
    if (!earnedIds.has(b.id) && conditions[b.id]) {
      newOnes.push({ ...b, earnedAt: new Date().toISOString() });
    }
  });

  if (newOnes.length > 0) {
    save('wc26_badges', [...earned, ...newOnes]);
    syncArenaToSupabase?.('picks');
    newOnes.forEach((b, i) => setTimeout(() => showBadgeToast(b), i * 1200));
    const arenaEl = document.getElementById('section-arena');
    if (arenaEl && arenaEl.innerHTML.trim()) renderArena();
  }
  // 同時檢查進階成就
  checkTieredAchievements();
}

function showBadgeToast(badge) {
  const toast = document.createElement('div');
  toast.className = 'badge-toast';
  toast.innerHTML = `
    <div class="badge-toast-icon">${badge.icon}</div>
    <div>
      <div class="badge-toast-title">成就解鎖！</div>
      <div class="badge-toast-name">${badge.name}</div>
      <div class="badge-toast-desc">${badge.desc}</div>
    </div>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function renderBadges() {
  const earned = loadBadges();
  const earnedIds = new Set(earned.map(b => b.id));
  const tieredEarned = loadTieredBadges();
  const tieredMap = {};
  tieredEarned.forEach(b => { tieredMap[b.id] = b.tier; });
  const vals = getTieredValues();
  const tierCls = ['tier-bronze', 'tier-silver', 'tier-gold'];
  const tierLabel = ['銅', '銀', '金'];

  return `
    <div class="badges-section">
      <div class="badges-title">🏅 成就徽章</div>
      <div class="badges-grid">
        ${BADGES.map((b, i) => {
          const e = earnedIds.has(b.id);
          const rCls = e ? `rarity-${b.rarity}` : 'locked';
          return `<div class="badge-card ${rCls}" onclick="showBadgeDetail('flat',${i})">
            <div class="badge-card-icon">${e ? b.icon : '🔒'}</div>
            <div class="badge-card-name">${b.name}</div>
            ${e ? `<div class="badge-rarity-label rarity-${b.rarity}">${{common:'普通',rare:'稀有',epic:'史詩',legendary:'傳說'}[b.rarity]}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="badges-section" style="margin-top:20px">
      <div class="badges-title">🏆 進階成就</div>
      <div class="badges-grid tiered">
        ${TIERED_BADGES.map((badge, bi) => {
          const storedTier = tieredMap[badge.id] ?? -1;
          const currentVal = vals[badge.id] || 0;
          let liveTier = -1;
          badge.tiers.forEach((t, ti) => { if (currentVal >= t.threshold) liveTier = ti; });
          const currentTier = Math.max(storedTier, liveTier);
          const nextTier = badge.tiers[currentTier + 1];
          const displayTier = currentTier >= 0 ? badge.tiers[currentTier] : null;
          const progress = nextTier ? Math.min(100, Math.round(currentVal / nextTier.threshold * 100)) : 100;
          const cls = currentTier >= 0 ? tierCls[currentTier] : 'locked';
          const tierGlow = ['drop-shadow(0 0 8px rgba(205,127,50,0.7))','drop-shadow(0 0 8px rgba(192,192,192,0.8))','drop-shadow(0 0 10px rgba(255,215,0,0.8))'];
          const iconStyle = currentTier >= 0 ? `filter:${tierGlow[currentTier]}` : 'filter:grayscale(1);opacity:0.4';
          return `<div class="badge-card ${cls}" onclick="showBadgeDetail('tiered',${bi})">
            <div class="badge-card-icon" style="${iconStyle}">${badge.icon}</div>
            <div class="badge-card-name">${displayTier ? displayTier.name : badge.tiers[0].name}</div>
            ${currentTier >= 0 ? `<div class="badge-tier-label">${tierLabel[currentTier]}階</div>` : ''}
            ${nextTier ? `<div class="badge-tier-progress"><div class="badge-tier-fill ${currentTier >= 0 ? tierCls[currentTier] : ''}" style="width:${progress}%"></div></div>
            <div class="badge-tier-next">${currentVal}/${nextTier.threshold}</div>` : `<div class="badge-tier-label" style="color:#ffd700">已滿階</div>`}
          </div>`;
        }).join('')}
      </div>
    </div>
    ${_renderRogueBadgeSection()}`;
}

// ── 射門遊戲徽章區塊 ──
function _renderRogueBadgeSection() {
  const rBadges = typeof ROGUE_BADGES !== 'undefined' ? ROGUE_BADGES : [];
  const rWeekly = typeof ROGUE_WEEKLY_BADGES !== 'undefined' ? ROGUE_WEEKLY_BADGES : [];
  if (rBadges.length === 0) return '';
  const earned = typeof loadRogueBadges === 'function' ? loadRogueBadges() : {};
  const weeklyEarned = typeof loadRogueWeeklyBadges === 'function'
    ? loadRogueWeeklyBadges().filter(b => (Date.now() - new Date(b.date).getTime()) / 86400000 < 7)
    : [];

  let html = `<div class="badges-section" style="margin-top:20px">
    <div class="badges-title">🎮 射門遊戲成就</div>
    <div class="badges-grid">`;
  rBadges.forEach((b, i) => {
    const e = !!earned[b.id];
    html += `<div class="badge-card ${e ? 'rarity-common' : 'locked'}" onclick="showBadgeDetail('rogue',${i})">
      <div class="badge-card-icon" style="${e ? '' : 'filter:grayscale(1);opacity:0.4'}">${b.icon}</div>
      <div class="badge-card-name">${b.name}</div>
      ${e ? `<div class="badge-rarity-label" style="color:#66bb6a">遊戲</div>` : ''}
    </div>`;
  });
  html += `</div></div>`;

  if (weeklyEarned.length > 0) {
    html += `<div class="badges-section" style="margin-top:20px">
      <div class="badges-title">🔥 週排名限定（7天）</div>
      <div class="badges-grid">`;
    weeklyEarned.forEach((wb, i) => {
      html += `<div class="badge-card" style="border-color:${wb.color}" onclick="showBadgeDetail('rogue_weekly',${i})">
        <div class="badge-card-icon" style="filter:drop-shadow(0 0 8px ${wb.color})">${wb.icon}</div>
        <div class="badge-card-name" style="color:${wb.color}">${wb.name}</div>
        <div class="badge-rarity-label" style="color:${wb.color}">限定</div>
      </div>`;
    });
    html += `</div></div>`;
  }
  return html;
}

// ── 點擊徽章顯示詳情 ────────────────────────────────────
function showBadgeDetail(type, idx) {
  const mc = document.getElementById('modal-content');
  if (!mc) return;

  const currentShowcase = localStorage.getItem('wc26_showcase_badge') || '';

  if (type === 'flat') {
    const b = BADGES[idx];
    const earned = loadBadges();
    const earnedIds = new Set(earned.map(x => x.id));
    const e = earnedIds.has(b.id);
    const earnedData = earned.find(x => x.id === b.id);
    const isShowcased = currentShowcase === b.icon;
    const rarityNames = {common:'普通',rare:'稀有',epic:'史詩',legendary:'傳說'};
    const rarityColors = {common:'#9ca3af',rare:'#60a5fa',epic:'#c084fc',legendary:'#fbbf24'};
    mc.innerHTML = `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:56px;margin-bottom:8px;${e ? '' : 'filter:grayscale(1);opacity:0.4'}">${b.icon}</div>
        <div style="font-size:20px;font-weight:900;margin-bottom:4px">${b.name}</div>
        <div style="font-size:12px;font-weight:700;color:${rarityColors[b.rarity]};margin-bottom:8px">${rarityNames[b.rarity]}</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">${b.desc}</div>
        <div style="display:inline-block;padding:6px 18px;border-radius:999px;font-size:13px;font-weight:700;${e ? 'background:rgba(34,197,94,0.15);color:#86efac' : 'background:rgba(255,255,255,0.06);color:var(--text-muted)'}">
          ${e ? '✅ 已達成' + (earnedData?.at ? '（' + new Date(earnedData.at).toLocaleDateString('zh-TW') + '）' : '') : '🔒 尚未達成'}
        </div>
        ${e ? `<button onclick="setShowcaseBadge('${b.icon}')" style="width:100%;padding:12px;border-radius:12px;background:${isShowcased ? 'rgba(255,255,255,0.06)' : 'var(--accent)'};color:${isShowcased ? 'var(--text-muted)' : '#000'};font-size:13px;font-weight:700;border:1px solid ${isShowcased ? 'rgba(255,255,255,0.1)' : 'var(--accent)'};cursor:pointer;margin-top:16px">
          ${isShowcased ? '✅ 展示中' : '🏷️ 展示在排行榜'}
        </button>` : ''}
        <button onclick="closeModal()" style="width:100%;padding:12px;border-radius:12px;background:transparent;color:var(--text-muted);font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;margin-top:${e ? '8' : '24'}px">關閉</button>
      </div>`;
  } else if (type === 'tiered') {
    const badge = TIERED_BADGES[idx];
    const vals = getTieredValues();
    const currentVal = vals[badge.id] || 0;
    const tieredEarned = loadTieredBadges();
    const storedTier = tieredEarned.find(b => b.id === badge.id)?.tier ?? -1;
    let liveTier = -1;
    badge.tiers.forEach((t, ti) => { if (currentVal >= t.threshold) liveTier = ti; });
    const effectiveTier = Math.max(storedTier, liveTier);
    const tierColors = ['#cd7f32', '#c0c0c0', '#ffd700'];
    const tierNames = ['銅階', '銀階', '金階'];

    const tierIcons = ['🥉', '🥈', '🥇'];
    const tierGlow = ['drop-shadow(0 0 10px rgba(205,127,50,0.8))', 'drop-shadow(0 0 10px rgba(192,192,192,0.9))', 'drop-shadow(0 0 12px rgba(255,215,0,0.9))'];
    const iconFilter = effectiveTier >= 0 ? tierGlow[effectiveTier] : 'grayscale(1)';

    mc.innerHTML = `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:56px;margin-bottom:4px;filter:${iconFilter}">${badge.icon}</div>
        ${effectiveTier >= 0 ? `<div style="font-size:13px;font-weight:800;color:${tierColors[effectiveTier]};margin-bottom:4px">${tierIcons[effectiveTier]} ${tierNames[effectiveTier]}</div>` : ''}
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:18px">目前進度：<b>${currentVal}</b></div>
        <div style="display:flex;flex-direction:column;gap:12px;text-align:left;margin-bottom:20px">
          ${badge.tiers.map((t, ti) => {
            const done = currentVal >= t.threshold;
            const isCurrent = ti === effectiveTier;
            const prog = Math.min(100, Math.round(currentVal / t.threshold * 100));
            return `<div style="background:rgba(255,255,255,${done ? '0.08' : '0.03'});border-radius:12px;padding:12px 14px;border:1px solid ${done ? tierColors[ti] : 'rgba(255,255,255,0.06)'}${isCurrent ? ';box-shadow:0 0 10px ' + tierColors[ti] + '40' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-size:14px;font-weight:700;${done ? 'color:' + tierColors[ti] : 'color:var(--text-muted)'}">${tierIcons[ti]} ${tierNames[ti]} — ${t.name}</span>
                <span style="font-size:12px;font-weight:700;${done ? 'color:#86efac' : 'color:var(--text-muted)'}">
                  ${done ? '✅' : `${currentVal}/${t.threshold}`}
                </span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">${t.desc}</div>
              <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${prog}%;background:${done ? tierColors[ti] : 'rgba(255,255,255,0.2)'};border-radius:99px;transition:width .3s"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
        ${effectiveTier >= 0 ? (() => {
          const isShowcased = currentShowcase === badge.icon;
          return `<button onclick="setShowcaseBadge('${badge.icon}')" style="width:100%;padding:12px;border-radius:12px;background:${isShowcased ? 'rgba(255,255,255,0.06)' : 'var(--accent)'};color:${isShowcased ? 'var(--text-muted)' : '#000'};font-size:13px;font-weight:700;border:1px solid ${isShowcased ? 'rgba(255,255,255,0.1)' : 'var(--accent)'};cursor:pointer">
            ${isShowcased ? '✅ 展示中' : '🏷️ 展示在排行榜'}
          </button>`;
        })() : ''}
        <button onclick="closeModal()" style="width:100%;padding:12px;border-radius:12px;background:transparent;color:var(--text-muted);font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;margin-top:8px">關閉</button>
      </div>`;
  } else if (type === 'rogue') {
    const rBadges = typeof ROGUE_BADGES !== 'undefined' ? ROGUE_BADGES : [];
    const b = rBadges[idx];
    if (!b) return;
    const earned = typeof loadRogueBadges === 'function' ? loadRogueBadges() : {};
    const e = !!earned[b.id];
    const currentShowcase2 = localStorage.getItem('wc26_showcase_badge_2') || '';
    const isShowcased2 = currentShowcase2 === b.icon;
    mc.innerHTML = `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:56px;margin-bottom:8px;${e ? '' : 'filter:grayscale(1);opacity:0.4'}">${b.icon}</div>
        <div style="font-size:20px;font-weight:900;margin-bottom:4px">${b.name}</div>
        <div style="font-size:12px;font-weight:700;color:#66bb6a;margin-bottom:8px">🎮 遊戲成就</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">${b.desc}</div>
        <div style="display:inline-block;padding:6px 18px;border-radius:999px;font-size:13px;font-weight:700;${e ? 'background:rgba(34,197,94,0.15);color:#86efac' : 'background:rgba(255,255,255,0.06);color:var(--text-muted)'}">
          ${e ? '✅ 已達成（' + earned[b.id] + '）' : '🔒 尚未達成'}
        </div>
        ${e ? `<button onclick="setShowcaseBadge2('${b.icon}')" style="width:100%;padding:12px;border-radius:12px;background:${isShowcased2 ? 'rgba(255,255,255,0.06)' : '#66bb6a'};color:${isShowcased2 ? 'var(--text-muted)' : '#000'};font-size:13px;font-weight:700;border:1px solid ${isShowcased2 ? 'rgba(255,255,255,0.1)' : '#66bb6a'};cursor:pointer;margin-top:16px">
          ${isShowcased2 ? '✅ 展示中（第二欄）' : '🏷️ 展示在排行榜（第二欄）'}
        </button>` : ''}
        <button onclick="closeModal()" style="width:100%;padding:12px;border-radius:12px;background:transparent;color:var(--text-muted);font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;margin-top:8px">關閉</button>
      </div>`;
  } else if (type === 'rogue_weekly') {
    const weeklyEarned = typeof loadRogueWeeklyBadges === 'function'
      ? loadRogueWeeklyBadges().filter(b => (Date.now() - new Date(b.date).getTime()) / 86400000 < 7)
      : [];
    const wb = weeklyEarned[idx];
    if (!wb) return;
    const currentShowcase2 = localStorage.getItem('wc26_showcase_badge_2') || '';
    const isShowcased2 = currentShowcase2 === wb.icon;
    const daysLeft = Math.max(0, Math.ceil(7 - (Date.now() - new Date(wb.date).getTime()) / 86400000));
    mc.innerHTML = `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:56px;margin-bottom:8px;filter:drop-shadow(0 0 12px ${wb.color})">${wb.icon}</div>
        <div style="font-size:20px;font-weight:900;margin-bottom:4px;color:${wb.color}">${wb.name}</div>
        <div style="font-size:12px;font-weight:700;color:#ffa726;margin-bottom:8px">🔥 限定徽章</div>
        <div style="font-size:14px;color:var(--text-muted);margin-bottom:20px">剩餘 ${daysLeft} 天</div>
        <button onclick="setShowcaseBadge2('${wb.icon}')" style="width:100%;padding:12px;border-radius:12px;background:${isShowcased2 ? 'rgba(255,255,255,0.06)' : wb.color};color:${isShowcased2 ? 'var(--text-muted)' : '#000'};font-size:13px;font-weight:700;border:1px solid ${isShowcased2 ? 'rgba(255,255,255,0.1)' : wb.color};cursor:pointer">
          ${isShowcased2 ? '✅ 展示中（第二欄）' : '🏷️ 展示在排行榜（第二欄）'}
        </button>
        <button onclick="closeModal()" style="width:100%;padding:12px;border-radius:12px;background:transparent;color:var(--text-muted);font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;margin-top:8px">關閉</button>
      </div>`;
  }
  document.getElementById('team-modal').classList.add('open');
}

// ── 設定展示徽章（第二欄，遊戲徽章用）────────────────────
function setShowcaseBadge2(icon) {
  const current = localStorage.getItem('wc26_showcase_badge_2') || '';
  if (current === icon) {
    localStorage.removeItem('wc26_showcase_badge_2');
    showToast('已取消第二欄展示徽章');
  } else {
    localStorage.setItem('wc26_showcase_badge_2', icon);
    showToast(`${icon} 已設為排行榜第二欄展示！`);
  }
  syncXPToProfile?.();
  closeModal();
}

// ── 設定展示徽章 ──────────────────────────────────────────
function setShowcaseBadge(icon) {
  const current = localStorage.getItem('wc26_showcase_badge') || '';
  if (current === icon) {
    // 取消展示
    localStorage.removeItem('wc26_showcase_badge');
    showToast('已取消展示徽章');
  } else {
    localStorage.setItem('wc26_showcase_badge', icon);
    showToast(`${icon} 已設為排行榜展示徽章！`);
  }
  syncXPToProfile?.();
  closeModal();
}

// ══════════════════════════════════════════════════════════════
// ── 每日任務系統 ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════

const DAILY_TASK_POOL = {
  // 固定任務
  daily_quiz:   { id:'daily_quiz',   icon:'<i class="fas fa-question-circle"></i>', label:'完成每日一題',           fixed:true,  go:'openDailyPick()' },
  pred_match:   { id:'pred_match',   icon:'<i class="fas fa-bullseye"></i>',        label:'預測至少 1 場比賽',     fixed:true,  go:"showSection('schedule')" },
  play_rogue:   { id:'play_rogue',   icon:'<i class="fas fa-futbol"></i>',          label:'玩一場射門挑戰',        fixed:true,  go:'startRogueGame()' },
  // 輪替任務
  rogue_3000:   { id:'rogue_3000',   icon:'<i class="fas fa-medal"></i>',           label:'射門挑戰達 3000 分',    fixed:false, go:'startRogueGame()' },
  share_any:    { id:'share_any',    icon:'<i class="fas fa-share-alt"></i>',       label:'分享任一預測或成績',     fixed:false, go:"goShareTask()" },
  unlock_match: { id:'unlock_match', icon:'<i class="fas fa-lock-open"></i>',       label:'解鎖一場 AI 分析',      fixed:false, go:"showSection('predictions')" },
  read_article: { id:'read_article', icon:'<i class="fas fa-newspaper"></i>',       label:'閱讀一篇文章',          fixed:false, go:"showSection('focus')" },
};

const DAILY_CHEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20" style="vertical-align:middle">
  <defs><linearGradient id="dcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd700"/><stop offset="100%" stop-color="#b8860b"/></linearGradient></defs>
  <rect x="8" y="28" width="48" height="28" rx="4" fill="url(#dcg)" stroke="#8b6914" stroke-width="2"/>
  <rect x="8" y="28" width="48" height="12" rx="4" fill="#ffe066"/>
  <path d="M8 22 Q32 10 56 22 L56 32 Q32 20 8 32Z" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>
  <rect x="27" y="34" width="10" height="10" rx="2" fill="#8b6914"/><circle cx="32" cy="39" r="3" fill="#fff"/>
</svg>`;

const DAILY_TASK_XP = 5;
const DAILY_TASK_BONUS_XP = 15;
const DAILY_TASK_BONUS_GEM = 1;

function _getDailyTaskKey() { return 'daily_tasks_' + localDateStr(); }

// 取得今天的任務清單（若無則初始化）
function getDailyTasks() {
  const key = _getDailyTaskKey();
  const saved = load(key);
  if (saved && saved.date === localDateStr()) return saved;

  // 決定固定任務
  const fixed = ['daily_quiz', 'play_rogue'];

  // 檢查是否有可預測比賽
  const _tid = window.Tournament?.current?.() || 'wc';
  const _isUcl = _tid === 'ucl', _isEpl = _tid === 'epl';
  const matches = _isEpl ? (window.EPL_MATCHES||[]) : _isUcl ? (window.UCL_MATCHES||[]) : (typeof SCHEDULE!=='undefined' ? SCHEDULE : []);
  const predKey = {ucl:'ucl26_my_preds',epl:'epl26_my_preds',wc:'wc26_my_preds'}[_tid] || 'wc26_my_preds';
  const myPreds = (() => { try { return JSON.parse(localStorage.getItem(predKey))||{}; } catch { return {}; } })();
  const hasPredictable = matches.some(m => m.status !== 'finished' && m.status !== 'live' && !myPreds[m.id]);

  if (hasPredictable) fixed.push('pred_match');

  // 輪替任務池
  const rotating = ['rogue_3000', 'share_any', 'unlock_match', 'read_article'];
  // 用日期做 seed 確保每天固定
  const seed = localDateStr().replace(/-/g,'');
  const seedNum = parseInt(seed) || 0;
  // 需要幾個輪替任務（若無 pred_match 則多選一個）
  const rotateCount = hasPredictable ? 1 : 2;
  // 打亂排序
  const shuffled = rotating.slice().sort((a,b) => {
    const ha = (seedNum * 31 + a.charCodeAt(0) * 17) % 997;
    const hb = (seedNum * 31 + b.charCodeAt(0) * 17) % 997;
    return ha - hb;
  });
  const picked = shuffled.slice(0, rotateCount);

  const taskIds = [...fixed, ...picked];
  const tasks = {};
  taskIds.forEach(id => { tasks[id] = false; });

  const state = { date: localDateStr(), tasks, claimed: false };
  save(key, state);
  return state;
}

// 標記任務完成
function completeDailyTask(taskId) {
  const state = getDailyTasks();
  if (!(taskId in state.tasks)) return;
  if (state.tasks[taskId]) return; // 已完成
  state.tasks[taskId] = true;
  save(_getDailyTaskKey(), state);

  // 單項獎勵 +5 XP
  const prefix = _gameCtx().prefix;
  const bonusKey = prefix + 'bonus_xp';
  const cur = parseInt(localStorage.getItem(bonusKey)||'0') || 0;
  localStorage.setItem(bonusKey, String(cur + DAILY_TASK_XP));
  updateNavXP?.();
  syncXPToProfile?.();
  showToast?.(`任務完成：${DAILY_TASK_POOL[taskId]?.label || taskId}（+${DAILY_TASK_XP} XP）`, 'success');

  // 更新 UI
  _refreshDailyTaskUI?.();
}

// 領取每日寶箱
function claimDailyTaskBonus() {
  const state = getDailyTasks();
  if (state.claimed) return;
  const allDone = Object.values(state.tasks).every(v => v);
  if (!allDone) return;

  state.claimed = true;
  save(_getDailyTaskKey(), state);

  // 獎勵
  const prefix = _gameCtx().prefix;
  const bonusKey = prefix + 'bonus_xp';
  const cur = parseInt(localStorage.getItem(bonusKey)||'0') || 0;
  localStorage.setItem(bonusKey, String(cur + DAILY_TASK_BONUS_XP));

  // 寶石（透過 Supabase edge function）
  if (typeof awardGem === 'function') {
    awardGem('daily_tasks_' + localDateStr());
  }

  updateNavXP?.();
  syncXPToProfile?.();
  showToast?.(`🎁 每日寶箱：+${DAILY_TASK_BONUS_XP} XP、+${DAILY_TASK_BONUS_GEM} 💎`);
  _refreshDailyTaskUI?.();
}

// 取得任務完成進度
function getDailyTaskProgress() {
  const state = getDailyTasks();
  const ids = Object.keys(state.tasks);
  const done = ids.filter(id => state.tasks[id]).length;
  return { total: ids.length, done, allDone: done === ids.length, claimed: state.claimed, tasks: state.tasks };
}

// 清理舊任務 (保留 3 天)
function _cleanOldDailyTasks() {
  const today = localDateStr();
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('daily_tasks_') && !k.endsWith(today)) {
      const dateStr = k.replace('daily_tasks_', '');
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const diff = (new Date(today) - new Date(dateStr)) / 86400000;
        if (diff > 3) localStorage.removeItem(k);
      }
    }
  }
}
_cleanOldDailyTasks();

// 分享任務：導向競技場並高亮出題挑戰按鈕
function goShareTask() {
  showSection('arena');
  setTimeout(() => {
    const btn = document.getElementById('btn-share-daily');
    if (!btn) return;
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      btn.classList.add('dtask-flash');
      btn.addEventListener('animationend', () => btn.classList.remove('dtask-flash'), { once: true });
    }, 400);
  }, 350);
}

// ── 每日任務 UI 渲染 ────────────────────────────────────────

function renderDailyTaskCard() {
  const el = document.getElementById('daily-task-card');
  if (!el) return;
  const { total, done, allDone, claimed, tasks } = getDailyTaskProgress();

  const taskHtml = Object.keys(tasks).map(id => {
    const t = DAILY_TASK_POOL[id];
    if (!t) return '';
    const isDone = tasks[id];
    const goBtn = !isDone && t.go ? `<button class="dtask-go-btn" onclick="event.stopPropagation();${t.go}">去完成</button>` : '';
    return `<div class="dtask-row ${isDone ? 'dtask-done' : ''}">
      <span class="dtask-check">${isDone ? '<i class="fas fa-check-circle" style="color:var(--success)"></i>' : '<i class="far fa-square"></i>'}</span>
      <span class="dtask-icon">${t.icon}</span>
      <span class="dtask-label">${t.label}</span>
      ${isDone ? `<span class="dtask-xp"><span style="color:var(--green)">+${DAILY_TASK_XP}</span></span>` : goBtn}
    </div>`;
  }).join('');

  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  el.innerHTML = `
    <div class="dtask-header" onclick="this.parentElement.classList.toggle('dtask-expanded')">
      <div class="dtask-header-left">
        <span class="dtask-title"><i class="fas fa-clipboard-check"></i> 每日任務</span>
        <span class="dtask-progress-text">${done}/${total}</span>
      </div>
      <div class="dtask-header-right">
        ${allDone && !claimed ? '<span class="dtask-claim-hint">可領取！</span>' : ''}
        <span class="dtask-chevron"><i class="fas fa-chevron-down"></i></span>
      </div>
    </div>
    <div class="dtask-progress-bar">
      <div class="dtask-progress-fill ${allDone ? 'dtask-full' : ''}" style="width:${pct}%"></div>
    </div>
    <div class="dtask-body">
      ${taskHtml}
      <div class="dtask-bonus ${allDone ? (claimed ? 'dtask-bonus-claimed' : 'dtask-bonus-ready') : ''}">
        ${allDone && !claimed
          ? `<button class="dtask-claim-btn" onclick="event.stopPropagation();claimDailyTaskBonus()">${DAILY_CHEST_SVG} 領取每日寶箱（+${DAILY_TASK_BONUS_XP} XP、+${DAILY_TASK_BONUS_GEM} 💎）</button>`
          : claimed
            ? `<div class="dtask-claimed-text">${DAILY_CHEST_SVG} 今日寶箱已領取 ✓</div>`
            : `<div class="dtask-bonus-preview">${DAILY_CHEST_SVG} 全部完成可領取：+${DAILY_TASK_BONUS_XP} XP、+${DAILY_TASK_BONUS_GEM} 💎</div>`
        }
      </div>
    </div>`;
}

// 全域 refresh 函式
function _refreshDailyTaskUI() {
  renderDailyTaskCard();
  // 也更新彈窗內的（如果存在）
  const popup = document.getElementById('daily-task-popup-body');
  if (popup) _renderDailyTaskPopupBody(popup);
}

// ── 每日任務彈窗（每日首次進站）─────────────────────────────

function showDailyTaskPopup() {
  const popupKey = 'daily_task_popup_' + localDateStr();
  if (localStorage.getItem(popupKey)) return; // 今天已彈過
  localStorage.setItem(popupKey, '1');

  // 清理舊 popup keys
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('daily_task_popup_') && k !== popupKey) localStorage.removeItem(k);
  }

  const { total, done, allDone, claimed, tasks } = getDailyTaskProgress();

  const overlay = document.createElement('div');
  overlay.id = 'daily-task-popup';
  overlay.className = 'dtask-popup-overlay';
  overlay.innerHTML = `
    <div class="dtask-popup-box">
      <div class="dtask-popup-header">
        <span><i class="fas fa-clipboard-check"></i> 今日任務</span>
        <button class="dtask-popup-close" onclick="document.getElementById('daily-task-popup').remove()">&times;</button>
      </div>
      <div class="dtask-popup-sub">完成所有任務可領取每日寶箱 ${DAILY_CHEST_SVG}</div>
      <div id="daily-task-popup-body"></div>
      <button class="dtask-popup-go" onclick="document.getElementById('daily-task-popup').remove();showSection('arena')">
        前往競技場 ⚡
      </button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  _renderDailyTaskPopupBody(document.getElementById('daily-task-popup-body'));
}

function _renderDailyTaskPopupBody(el) {
  if (!el) return;
  const { total, done, allDone, claimed, tasks } = getDailyTaskProgress();
  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  el.innerHTML = `
    <div class="dtask-popup-progress">
      <div class="dtask-progress-bar" style="margin:0">
        <div class="dtask-progress-fill ${allDone ? 'dtask-full' : ''}" style="width:${pct}%"></div>
      </div>
      <div style="text-align:center;font-size:13px;color:var(--text-muted);margin-top:6px">${done}/${total} 已完成</div>
    </div>
    ${Object.keys(tasks).map(id => {
      const t = DAILY_TASK_POOL[id];
      if (!t) return '';
      const isDone = tasks[id];
      const goBtn = !isDone && t.go ? `<button class="dtask-go-btn" onclick="document.getElementById('daily-task-popup')?.remove();${t.go}">去完成</button>` : '';
      return `<div class="dtask-row ${isDone ? 'dtask-done' : ''}">
        <span class="dtask-check">${isDone ? '<i class="fas fa-check-circle" style="color:var(--success)"></i>' : '<i class="far fa-square"></i>'}</span>
        <span class="dtask-icon">${t.icon}</span>
        <span class="dtask-label">${t.label}</span>
        ${isDone ? `<span class="dtask-xp"><span style="color:var(--green)">+${DAILY_TASK_XP}</span></span>` : goBtn}
      </div>`;
    }).join('')}
    <div style="text-align:center;margin-top:14px;font-size:13px;color:var(--text-muted)">
      ${allDone && !claimed ? `${DAILY_CHEST_SVG} <strong style="color:var(--accent)">全部完成！前往競技場領取寶箱</strong>` :
        claimed ? `${DAILY_CHEST_SVG} 今日寶箱已領取 ✓` :
        `${DAILY_CHEST_SVG} 全部完成可領取：+${DAILY_TASK_BONUS_XP} XP、+${DAILY_TASK_BONUS_GEM} 💎`}
    </div>`;
}
