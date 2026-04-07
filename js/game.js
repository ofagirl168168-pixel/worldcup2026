/* game.js — 競技場遊戲化功能
   所有資料存 localStorage，不需後端
   ─────────────────────────────── */

// ── localStorage 鍵值 ─────────────────────────────────────
const GK = {
  team:     'wc26_team',      // 支持球隊
  champion: 'wc26_champion',  // 冠軍預測 {c1,c2,c3,lockedAt}
  groups:   'wc26_groups',    // 分組預測 {A:['BRA','MEX'],...}
  daily:    'wc26_daily',     // 每日一題 {streak,lastDate,history:{date:idx}}
};
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ── 每日題庫 ─────────────────────────────────────────────
// type: 'normal'=一般 | 'hard'=高難度（讓人想問朋友）| 'viral'=話題性/出人意料
const DAILY_QUESTIONS = [

  // ── NORMAL ───────────────────────────────────────────────
  { type:'normal', q:'2026年世界盃共有幾支球隊參賽？',
    opts:['32支','40支','48支','56支'], correct:2 },
  { type:'normal', q:'2026年世界盃由哪幾個國家聯合主辦？',
    opts:['僅美國','美國與加拿大','美國與墨西哥','美國、加拿大與墨西哥'], correct:3 },
  { type:'normal', q:'2022年卡達世界盃冠軍是哪支球隊？',
    opts:['法國','克羅埃西亞','摩洛哥','阿根廷'], correct:3 },
  { type:'normal', q:'哪個國家贏得世界盃冠軍次數最多？',
    opts:['德國（4次）','義大利（4次）','巴西（5次）','阿根廷（3次）'], correct:2 },
  { type:'normal', q:'梅西在哪一年首次捧起世界盃金盃？',
    opts:['2014年','2018年','2022年','尚未奪冠'], correct:2 },
  { type:'normal', q:'2018年俄羅斯世界盃冠軍是哪支球隊？',
    opts:['克羅埃西亞','比利時','英格蘭','法國'], correct:3 },
  { type:'normal', q:'2026年世界盃決賽將在哪座球場舉行？',
    opts:['SoFi Stadium','AT&T Stadium','MetLife Stadium','Hard Rock Stadium'], correct:2 },
  { type:'normal', q:'世界盃是每幾年舉辦一次？',
    opts:['2年','3年','4年','8年'], correct:2 },
  { type:'normal', q:'2014年世界盃在哪個國家舉辦？',
    opts:['阿根廷','哥倫比亞','智利','巴西'], correct:3 },
  { type:'normal', q:'2010年世界盃冠軍是哪支球隊？',
    opts:['荷蘭','德國','葡萄牙','西班牙'], correct:3 },
  { type:'normal', q:'首屆世界盃在1930年哪個國家舉辦？',
    opts:['巴西','法國','阿根廷','烏拉圭'], correct:3 },
  { type:'normal', q:'2026年世界盃小組賽共分幾組？',
    opts:['8組','10組','12組','16組'], correct:2 },
  { type:'normal', q:'世界盃生涯進球最多的球員是誰（16球）？',
    opts:['Pelé','Ronaldo (巴西)','Miroslav Klose','梅西'], correct:2 },
  { type:'normal', q:'2022年世界盃哪支非洲球隊首次打入四強？',
    opts:['塞內加爾','奈及利亞','迦納','摩洛哥'], correct:3 },
  { type:'normal', q:'2026年世界盃共有幾場比賽？',
    opts:['64場','80場','96場','104場'], correct:3 },
  { type:'normal', q:'法國首次奪得世界盃冠軍是在哪一年？',
    opts:['1994年','1998年','2002年','2006年'], correct:1 },
  { type:'normal', q:'C羅（Ronaldo）效力哪支球隊時連續3年拿下金球獎？',
    opts:['曼聯','拜仁慕尼黑','皇家馬德里','尤文圖斯'], correct:2 },
  { type:'normal', q:'2022年世界盃決賽，法國誰完成帽子戲法卻最終落敗？',
    opts:['格列茲曼','吉魯','本澤馬','姆巴佩'], correct:3 },
  { type:'normal', q:'哪支球隊曾3度打入世界盃決賽卻從未奪冠（至2022年）？',
    opts:['捷克','匈牙利','荷蘭','葡萄牙'], correct:2 },
  { type:'normal', q:'阿根廷共奪得幾次世界盃冠軍（含2022年）？',
    opts:['1次','2次','3次','4次'], correct:2 },

  // ── HARD（讓人忍不住問朋友的難題）────────────────────────
  { type:'hard', q:'世界盃史上最快進球是誰打進的？用時僅11秒！',
    opts:['Rivaldo','Hakan Şükür（土耳其）','Pelé','Robbie Fowler'], correct:1 },
  { type:'hard', q:'世界盃史上單場進球最多的比賽是哪一場（共12球）？',
    opts:['巴西10:1薩爾瓦多','匈牙利10:1薩爾瓦多','奧地利7:5瑞士（1954年）','德國8:0沙烏地阿拉伯'], correct:2 },
  { type:'hard', q:'哪位球員是世界盃決賽史上唯一完成帽子戲法的球員？',
    opts:['Pelé','Just Fontaine','Geoff Hurst（1966英格蘭）','Paolo Rossi'], correct:2 },
  { type:'hard', q:'1950年世界盃決賽圈，哪支球隊因拒絕搭飛機而退賽缺席？',
    opts:['德國','印度','法國','阿根廷'], correct:1 },
  { type:'hard', q:'世界盃史上哪支球隊以最大比分差距獲勝（13:0）？',
    opts:['巴西','德國','匈牙利（1982年）','阿根廷'], correct:2 },
  { type:'hard', q:'梅西在2022年世界盃總共踢進幾球？（含小組賽到決賽）',
    opts:['5球','6球','7球','8球'], correct:2 },
  { type:'hard', q:'世界盃史上哪位球員同時贏得金球獎與金靴獎？',
    opts:['Ronaldo（巴西，2002）','Pelé（1970）','馬拉度納（1986）','梅西（2022）'], correct:0 },
  { type:'hard', q:'2002年世界盃，韓國爆冷打敗義大利進四強，延長賽的絕殺是誰進的？',
    opts:['朴智星','安貞煥','黃善洪','車範根'], correct:1 },
  { type:'hard', q:'哪位球員連續參加了5屆世界盃（1994–2010）？',
    opts:['卡卡','Cafu（巴西）','蒂埃里・亨利','菲利普・拉姆'], correct:1 },
  { type:'hard', q:'世界盃史上哪位守門員在1994年以點球決勝踢進了一球？',
    opts:['Jorge Campos','René Higuita（哥倫比亞）','Dida','Peter Schmeichel'], correct:1 },
  { type:'hard', q:'2006年決賽，齊達內頭頂馬特拉齊後下場，法國最終輸掉世界盃。齊達內後來說馬特拉齊說了什麼？',
    opts:['罵了他的母親和姐姐','說他是世界最差球員','說法國隊會輸','嘲笑他的禿頭'], correct:0 },

  // ── VIRAL（爆笑、意外、話題十足）──────────────────────────
  { type:'viral', q:'2022年沙烏地阿拉伯爆冷擊敗阿根廷後，沙烏地政府宣布了什麼？',
    opts:['宣布國定假日放假一天','頒獎金給每位球員10億里亞爾','在全國放煙火3天','邀請梅西移民沙烏地'], correct:0 },
  { type:'viral', q:'2022年世界盃，C羅在分組賽後期被換下場時做了什麼引爆話題？',
    opts:['在場邊哭泣','親吻隊長袖章後去廁所','直接走進更衣室不看比賽','在板凳上看手機'], correct:2 },
  { type:'viral', q:'2014年巴西慘遭德國7:1大屠殺後，巴西人如何稱呼這場比賽？',
    opts:['黑色星期四','Mineirazo（米內羅慘案）','七比一之夜','巴西之死'], correct:1 },
  { type:'viral', q:'馬拉度納1986年世界盃用手打進的那個球，他事後稱之為什麼？',
    opts:['球王之手','上帝之手','魔鬼之手','天才之手'], correct:1 },
  { type:'viral', q:'2022年世界盃，梅西對荷蘭比賽後的慶祝影片裡說了什麼話讓全球瘋傳？',
    opts:['"Qué miras, bobo（你在看什麼，蠢蛋）"','「我是最偉大的」','「再見了，荷蘭」','「這是給巴西看的」'], correct:0 },
  { type:'viral', q:'哪支球隊在2002年世界盃分組賽輸給了美國，引發本國政治危機？',
    opts:['葡萄牙','南韓','墨西哥','葡萄牙'], correct:0 },
  { type:'viral', q:'2010年世界盃，哪隻章魚準確預測了所有8場賽果並成為國際明星？',
    opts:['保羅（Paul）','Otto','Octavio','Calimero'], correct:0 },
  { type:'viral', q:'2022年世界盃，哪位球員在慶祝進球時模仿了梅西標誌性的「指天」動作，讓現場一片爆笑？',
    opts:['姆巴佩','恩坎坎巴（Enzo Fernández）','C羅','荷蘭隊員Gakpo'], correct:1 },
  { type:'viral', q:'世界盃史上，哪支球隊是連續最多屆未能晉級決賽圈的歐洲強隊？',
    opts:['蘇格蘭（連續10屆未進決賽圈）','希臘','荷蘭','羅馬尼亞'], correct:0 },
  { type:'viral', q:'2026年世界盃48支球隊中，哪個大洲的代表隊數量最多？',
    opts:['歐洲（16席）','非洲（9席）','亞洲（8席）','南美洲（6席）'], correct:0 },
  { type:'viral', q:'2006年世界盃決賽，齊達內頭頂馬特拉齊後被紅牌驅逐。他後來說後悔嗎？',
    opts:['非常後悔，那是他最大遺憾','完全不後悔，他說那是必要的','他拒絕回答這個問題','他說他以為主裁判沒看到'], correct:1 },
  { type:'viral', q:'哪位球員被稱為「外星人羅納度」，以那個標誌性劉海髮型著稱？',
    opts:['C羅（葡萄牙）','巴西肥羅（R9）','卡卡','朗拿甸奴'], correct:1 },
  { type:'viral', q:'2022年世界盃，阿根廷隊在更衣室慶祝時唱了一首嘲諷法國的歌，其中提到哪位球員「在媽媽懷裡哭泣」？',
    opts:['格列茲曼','吉魯','姆巴佩','洛里斯'], correct:2 },
  { type:'viral', q:'貝利（Pelé）一生聲稱自己進了超過1000球，但官方認定的世界盃入球數是多少？',
    opts:['8球','10球','12球','15球'], correct:1 },
  { type:'viral', q:'2002年世界盃，哪位裁判因為一系列爭議判決被足球界封殺不再執法國際賽？',
    opts:['厄瓜多裁判拜倫・莫雷諾（Byron Moreno）','英格蘭裁判哈特（Hart）','義大利裁判科利納','巴西裁判席爾瓦'], correct:0 },
  { type:'viral', q:'哪個世界盃分組被稱為「死亡之組」，因為四隊全部都是前冠軍？',
    opts:['2010年A組','2014年G組（德、葡、美、加納）','2006年C組（荷、阿根廷、象牙海岸、塞爾維亞）','2002年E組'], correct:1 },
  { type:'viral', q:'世界盃史上哪位球員因為太年輕，家長必須簽署同意書才能參賽？',
    opts:['梅西（阿根廷）','貝利（巴西，17歲）','姆巴佩（法國）','魯尼（英格蘭）'], correct:1 },
  { type:'viral', q:'2018年世界盃，英格蘭球迷在比賽後狂歡到把什麼物品砸向空中？',
    opts:['啤酒杯','塑膠椅','折疊椅與啤酒','國旗'], correct:2 },
  { type:'viral', q:'1950年世界盃「馬拉卡納悲劇」，烏拉圭以2:1擊敗主辦國巴西奪冠。賽後發生了什麼？',
    opts:['巴西球迷衝進球場慶祝烏拉圭','數名巴西球迷當場心臟病發','數位球員和球迷因悲慟而自殺','主教練當場宣布退休'], correct:1 },
  { type:'viral', q:'C羅在2022年世界盃分組賽對加納時，他與另一名球員爭奪進球認定。那球後來認定歸誰？',
    opts:['認定是C羅進球','認定是加納後衛烏龍球','FIFA至今未認定','認定是隊友貢薩維斯進球'], correct:1 },
  { type:'viral', q:'哪支球隊在世界盃歷史上，曾以11:0的大比分羞辱對手？',
    opts:['德國','巴西','匈牙利（1982對薩爾瓦多10:1，史上最大）','阿根廷'], correct:2 },
  { type:'viral', q:'2014年世界盃吉祥物「豪丁」（Fuleco）是什麼動物？',
    opts:['美洲豹','犰狳','貘','美洲獅'], correct:1 },
  { type:'viral', q:'梅西在2014年世界盃決賽失利後，哪個畫面讓全球球迷心疼瘋傳？',
    opts:['他在頒獎台上哭泣','他把金球獎獎盃放在地上','他獨自坐在草皮邊發呆','他拒絕接受亞軍獎牌'], correct:1 },
  { type:'viral', q:'哪位足球員曾在世界盃後因為表現太差被球迷在機場「迎接」時遭到攻擊？',
    opts:['安德烈斯・埃斯科巴（哥倫比亞，1994年烏龍球後被殺）','梅西','魯尼','C羅'], correct:0 },
];

// ── 模擬全站投票數（依 FIFA 排名計算合理分佈）──────────────
function getSimVotes() {
  const daysSince = Math.max(1, Math.floor((Date.now() - new Date('2026-03-01').getTime()) / 86400000));
  const total = 1500 + daysSince * 38;

  // 基礎份額（前段強隊）
  const base = { FRA:0.21, BRA:0.17, ESP:0.14, ENG:0.10, ARG:0.09,
                 GER:0.06, POR:0.04, NED:0.03, BEL:0.025, URU:0.015 };
  const used = Object.values(base).reduce((a,b)=>a+b,0);
  const perRemainder = (1 - used) / (48 - Object.keys(base).length);

  const votes = {};
  Object.keys(TEAMS).forEach(code => {
    const t = TEAMS[code];
    const share = base[code] ?? Math.max(0.002, perRemainder * (1 - (t.fifaRank||100)/200));
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

  const normals = DAILY_QUESTIONS.filter(q => q.type === 'normal');
  const hards   = DAILY_QUESTIONS.filter(q => q.type === 'hard');
  const virals  = DAILY_QUESTIONS.filter(q => q.type === 'viral');

  // 4天循環：normal → viral → hard → viral → normal → viral → hard → viral…
  const CYCLE = ['normal', 'viral', 'hard', 'viral'];
  const poolType = CYCLE[dayIdx % CYCLE.length];
  const pool = poolType === 'hard' ? hards : poolType === 'viral' ? virals : normals;

  return { ...pool[dayIdx % pool.length], date: today };
}

// ── 連勝天數計算 ──────────────────────────────────────────
function getDailyState() {
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

  // 寶石獎勵（非同步，不阻塞UI）
  if (isCorrect) {
    onDailyCorrect?.();
    checkStreakGem?.(newStreak);
  }

  return state;
}

// ── 等級獎勵表 ────────────────────────────────────────────
const LEVEL_GEM_REWARDS = { 2:2, 3:2, 5:3, 7:3, 10:5, 15:5, 20:10 };

// 計算 XP 與等級（共用）
function calcXPLevel() {
  const dailyState  = getDailyState();
  const myChampion  = load(GK.champion);
  const myGroups    = load(GK.groups);
  const myTeam      = load(GK.team);
  const groupsDone  = myGroups && Object.keys(myGroups).length === 12;
  const correctCount = Object.values(dailyState.history).filter(v => v && v.isCorrect).length;
  const xp      = correctCount * 10 + (myChampion ? 50 : 0) + (groupsDone ? 50 : 0) + (myTeam ? 30 : 0);
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
}

// ── 導覽列紅點徽章 ────────────────────────────────────────
function updateArenaBadge() {
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
  const el = document.getElementById('home-daily-section');
  if (!el) return;

  const today      = localDateStr();
  const state      = getDailyState();
  const dailyDone  = state.history[today] !== undefined;
  const champDone  = !!load(GK.champion);
  const groupsDone = Object.keys(load(GK.groups)||{}).length === 12;
  const teamDone   = !!load(GK.team);
  const { q, opts, correct } = getTodayQuestion();
  const record     = state.history[today]; // {chosen, isCorrect} or undefined
  const chosen     = dailyDone ? record.chosen : -1;
  const wasCorrect = dailyDone ? record.isCorrect : false;

  function homeBtnClass(i) {
    if (!dailyDone) return '';
    if (i === correct) return 'selected';
    if (i === chosen && !wasCorrect) return 'wrong';
    return 'dimmed';
  }

  const pendingItems = [];
  if (!champDone)  pendingItems.push({ icon:'🏆', label:'冠軍預測', action:"openChampionPick()" });
  if (!groupsDone) pendingItems.push({ icon:'📋', label:'分組賽預測', action:"openGroupPicks()" });
  if (!teamDone)   pendingItems.push({ icon:'⚽', label:'選擇支持球隊', action:"openTeamSupport()" });

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
      ${dailyDone ? `<div class="home-daily-done" style="color:${wasCorrect ? '#4caf50' : '#f44336'}">${wasCorrect ? '✅ 答對了！+10 XP 🎉' : `❌ 答錯了！正確答案是 ${opts[correct]}`}</div>` : ''}
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
    </div>` : '<div class="home-pending-tasks" style="color:#4caf50;font-size:13px;font-weight:600">🎉 所有挑戰已完成，開賽時見！</div>'}`;
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
  const KEY = 'wc26_welcome_shown';
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
        <div style="font-size:20px;font-weight:900;margin-bottom:8px">歡迎來到世界盃預測競技場</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:24px">
          現在就開始預測冠軍、填寫分組賽結果<br>
          每天答題累積連勝天數<br>
          <strong style="color:var(--gold)">6月11日開賽，一起見證你的預測！</strong>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn-primary" onclick="document.getElementById('arena-welcome-overlay').remove();showSection('arena');renderArena()">
            <i class="fas fa-gamepad"></i> 前往競技場
          </button>
          <button onclick="document.getElementById('arena-welcome-overlay').remove()"
            style="background:none;border:none;color:var(--text-muted);font-size:13px;cursor:pointer;padding:8px">
            稍後再說
          </button>
        </div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }, 3000); // 頁面載入 3 秒後出現
}

// ── 競技場主頁面 ──────────────────────────────────────────
function renderArena() {
  const el = document.getElementById('section-arena');
  if (!el) return;

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
  const champC1  = myChampion ? TEAMS[myChampion.c1] : null;
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
        <div class="arena-stat-num">${[myChampion,groupsDone,myTeam,dailyDone].filter(Boolean).length}/4</div>
        <div class="arena-stat-label">任務完成</div>
      </div>
    </div>

    <!-- 四大功能卡 -->
    <div class="arena-grid">

      <!-- ① 每日一題 -->
      <div class="arena-card ${dailyDone ? 'done' : 'urgent'}" onclick="openDailyPick()">
        <div class="arena-card-badge">${dailyDone ? '✅ 今日已完成' : '🔔 待作答'}</div>
        <span class="arena-card-icon">❓</span>
        <div class="arena-card-title">每日一題</div>
        <div class="arena-card-desc">每天一個世界盃話題，累積連勝天數，展現你的足球智慧</div>
        ${dailyState.streak > 0 ? `<div class="arena-card-streak">🔥 ${dailyState.streak} 天連勝</div>` : ''}
        <div class="arena-card-footer">
          <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.3)">
            +10 XP / 天 <span class="arena-card-gem">· 答對 <span class="gem-ico"></span>+1</span>
          </span>
          <span class="arena-card-cta">${dailyDone ? '已完成 ✓' : '立即作答 →'}</span>
        </div>
        <div onclick="event.stopPropagation()" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="font-size:11px;color:rgba(255,255,255,0.38);line-height:1.5">考考朋友，<br>看誰足球 IQ 最高！</div>
          <button onclick="shareDailyImage()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(255,109,0,0.25),rgba(255,109,0,0.1));border:1px solid rgba(255,109,0,0.45);color:#ff8c42;font-size:12px;font-weight:800;cursor:pointer">🧠 出題挑戰</button>
        </div>
      </div>

      <!-- ② 冠軍預測 -->
      <div class="arena-card ${myChampion ? 'done' : ''}" onclick="openChampionPick()">
        <div class="arena-card-badge">${myChampion ? '✅ 已鎖定' : '尚未預測'}</div>
        <span class="arena-card-icon">🏆</span>
        <div class="arena-card-title">冠軍預測</div>
        <div class="arena-card-desc">
          ${myChampion
            ? `你預測 <strong style="color:var(--gold)">${champFlag}</strong> 奪冠`
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
          <button onclick="shareChampionText()" style="flex-shrink:0;padding:7px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(240,192,64,0.22),rgba(240,192,64,0.08));border:1px solid rgba(240,192,64,0.4);color:var(--gold);font-size:12px;font-weight:800;cursor:pointer">🏆 曬我押注</button>
        </div>` : ''}
      </div>

      <!-- ③ 分組賽預測 -->
      <div class="arena-card ${groupsDone ? 'done' : ''}" onclick="openGroupPicks()">
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
      </div>

      <!-- ④ 支持球隊 -->
      <div class="arena-card ${myTeam ? 'done' : ''}" onclick="openTeamSupport()">
        <div class="arena-card-badge">${myTeam ? '✅ 已宣示' : '尚未選擇'}</div>
        <span class="arena-card-icon" style="font-size:44px">${myTeam && TEAMS[myTeam]?.flag ? flagImg(TEAMS[myTeam].flag) : '⚽'}</span>
        <div class="arena-card-title">宣示支持球隊</div>
        <div class="arena-card-desc">
          ${myTeam
            ? `你支持 <strong style="color:#e91e63">${TEAMS[myTeam]?.nameCN||myTeam}</strong>，全力加油！`
            : '選定一支你要整個世界盃陪伴的球隊'}
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
  const { q, opts, correct, date } = getTodayQuestion();
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
    ${answered ? `
      <div style="margin-top:16px;padding:12px;background:${wasCorrect ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)'};border-radius:10px;text-align:center;color:${wasCorrect ? '#4caf50' : '#f44336'};font-size:13px">
        ${wasCorrect ? '✅ 答對了！+10 XP 明天繼續保持連勝 🔥' : `❌ 答錯了！正確答案是 <strong>${opts[correct]}</strong>`}
      </div>` : ''}`;

  document.getElementById('team-modal').classList.add('open');
}

function submitDailyPick(idx) {
  recordDailyAnswer(idx);
  updateNavXP();
  checkAchievements();
  renderArena();
  openDailyPick();
}

// ── ② 冠軍預測 Modal ──────────────────────────────────────
function openChampionPick() {
  const current = load(GK.champion);
  const { votes, total } = getSimVotes();
  const allCodes = Object.keys(TEAMS).sort((a,b) => (TEAMS[a].fifaRank||99) - (TEAMS[b].fifaRank||99));

  const teamOpt = (code, role, selected) => {
    const t = TEAMS[code];
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
  const picks = document.getElementById('champ-picks');
  const c1 = picks.dataset.c1, c2 = picks.dataset.c2, c3 = picks.dataset.c3;
  if (!c1 || !c2 || !c3) { alert('請選擇冠、亞、季軍各一支球隊'); return; }
  if (c1===c2 || c1===c3 || c2===c3) { alert('冠亞季軍不能選同一支球隊'); return; }
  save(GK.champion, { c1, c2, c3, lockedAt: new Date().toISOString() });
  syncToSupabase?.();
  syncArenaToSupabase?.('picks');
  onFirstChampion?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  closeModal();
}

// ── ③ 分組賽預測 Modal ────────────────────────────────────
function openGroupPicks() {
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
  const groups = {};
  let incomplete = 0;
  document.querySelectorAll('.group-pick-teams').forEach(container => {
    const g = container.dataset.group;
    const sel = [...container.querySelectorAll('.group-pick-team.selected')].map(el => el.dataset.code).filter(Boolean);
    groups[g] = sel;
    if (sel.length < 2) incomplete++;
  });
  if (incomplete > 0) {
    alert(`還有 ${incomplete} 組未選滿 2 隊，請完成後再儲存`);
    return;
  }
  save(GK.groups, groups);
  syncToSupabase?.();
  syncArenaToSupabase?.('picks');
  onFirstGroups?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  showSharePromptAfterGroups();
}

// ── 每日一題分享圖 ────────────────────────────────────────
async function shareDailyImage() {
  const { q, opts } = getTodayQuestion()
  const dailyState  = getDailyState()
  const streak      = dailyState.streak || 0
  const shareLink   = await (async () => {
    try { return await getMyRefLink?.() || window.location.origin } catch { return window.location.origin }
  })()

  // QR Code
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}&color=0a0f1e&bgcolor=ffffff&margin=8`
  const qrImg = await loadImg(qrUrl).catch(() => null)

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

  // ── Header：Shield Logo + 標題 ──────────────────────
  const s = 44
  const shieldFill = (() => { const g = ctx.createLinearGradient(PAD - 24, 24, PAD + 24, 68); g.addColorStop(0,'#f5d26b'); g.addColorStop(1,'#e07800'); return g })()
  drawShield(ctx, PAD + s/2, 24 + s/2, s, shieldFill)
  ctx.fillStyle = '#f0c040'
  ctx.font = `800 22px "Noto Sans TC", sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText('世界盃預測平台 2026', PAD + s + 12, 24 + s * 0.5)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = `500 13px "Noto Sans TC", sans-serif`
  ctx.fillText('worldcup2026.pages.dev', PAD + s + 12, 24 + s * 0.5 + 22)

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
  ctx.fillText('每天一題世界盃知識挑戰', ctaX, ctaY + 38)
  ctx.fillText('看誰的足球 IQ 最高！', ctaX, ctaY + 60)

  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = `400 12px "Noto Sans TC", sans-serif`
  ctx.fillText(shareLink, ctaX, ctaY + 90)

  // ── 輸出 ──────────────────────────────────────────────
  canvas.toBlob(async blob => {
    const file = new File([blob], 'daily-challenge.png', { type: 'image/png' })
    const link = await getMyRefLink?.() || window.location.origin
    if (_isMobile() && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `🧠 今日世界盃挑戰題，你知道答案嗎？快來挑戰！\n${link}` }).catch(() => {})
    } else {
      showDesktopShareModal({ blob, link, filename: 'daily-challenge.png', title: '🧠 出題挑戰', text: `🧠 今日世界盃挑戰題，你知道答案嗎？快來挑戰！\n${link}` })
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
  const shareUrl  = link || window.location.origin
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
  const champion = load(GK.champion)
  if (!champion) return
  const c1 = TEAMS[champion.c1]?.nameCN || champion.c1
  const c2 = TEAMS[champion.c2]?.nameCN || champion.c2
  const c3 = TEAMS[champion.c3]?.nameCN || champion.c3
  const link = await getMyRefLink?.() || window.location.origin
  const text = `🏆 我的 2026 世界盃冠軍預測\n🥇 冠軍：${c1}\n🥈 亞軍：${c2}\n🥉 季軍：${c3}\n\n你猜對了嗎？來挑戰我的眼光！\n${link}`
  if (_isMobile() && navigator.share) {
    navigator.share({ text }).catch(() => {})
  } else {
    showDesktopShareModal({ text, link, title: '🏆 曬我的冠軍押注' })
  }
}

// ── 支持球隊分享 ──────────────────────────────────────────
async function shareTeamText() {
  const team = load(GK.team)
  if (!team) return
  const t = TEAMS[team]
  const link = await getMyRefLink?.() || window.location.origin
  const text = `⚽ 2026 世界盃，我宣示支持 ${t?.nameCN || team}！\n整個賽事我都陪著他們！\n一起來預測世界盃吧👇\n${link}`
  if (_isMobile() && navigator.share) {
    navigator.share({ text }).catch(() => {})
  } else {
    showDesktopShareModal({ text, link, title: '⚽ 招募隊友' })
  }
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
      <button onclick="closeModal();setTimeout(shareGroupImage,200)" style="width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--gold),#e0a020);color:#07091a;font-weight:800;font-size:15px;border:none;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px">
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

// 預載圖片 helper（crossOrigin anonymous，適用有 CORS header 的 CDN）
function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function shareGroupImage() {
  const groups = load(GK.groups)
  if (!groups) return

  showToast('⏳ 正在產生分享圖...')

  const groupKeys = Object.keys(GROUPS).sort()
  const SITE_URL = 'worldcup2026-9u0.pages.dev'

  // ── 取得分享者邀請連結 ───────────────────────────────
  let shareLink = `https://${SITE_URL}`
  if (currentUser) {
    try {
      const { data } = await DB.from('profiles').select('ref_code').eq('id', currentUser.id).maybeSingle()
      if (data?.ref_code) shareLink = `https://${SITE_URL}?ref=${data.ref_code}`
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

  // ── 預載 QR Code（指向分享者邀請連結）───────────────
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}&color=0a0f1e&bgcolor=ffffff&margin=8`
  const qrImg = await loadImg(qrUrl)

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

  // ── Header（盾牌 logo + 標題）────────────────────────
  const sx = W / 2, logoSize = 60

  // 光暈背景
  const glowR = ctx.createRadialGradient(sx, 52, 0, sx, 52, 70)
  glowR.addColorStop(0, 'rgba(240,192,64,0.18)')
  glowR.addColorStop(1, 'rgba(240,192,64,0)')
  ctx.fillStyle = glowR
  ctx.fillRect(sx - 70, 0, 140, 120)

  const shieldGrad = ctx.createLinearGradient(sx - 24, 20, sx + 24, 80)
  shieldGrad.addColorStop(0, '#f5d26b')
  shieldGrad.addColorStop(1, '#e07800')
  drawShield(ctx, sx, 52, logoSize, shieldGrad)

  // 標題
  ctx.fillStyle = '#f0c040'
  ctx.font = 'bold 30px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('我的世界盃分組晉級預測', W / 2, 136)

  // 副標題
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '15px sans-serif'
  ctx.fillText('FIFA World Cup 2026 · Group Stage Predictions', W / 2, 164)

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
  ctx.fillText('AI 驅動 · 世界盃預測分析平台', ctaX, footerY + 102)

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
    const file = new File([blob], 'wc2026-group-prediction.png', { type: 'image/png' })
    if (_isMobile() && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: '我的 2026 世界盃分組晉級預測', text: `來挑戰我的分組預測！${shareLink}`, files: [file] })
        return
      } catch {}
    }
    // 電腦版：開啟分享 Modal
    showDesktopShareModal({ blob, link: shareLink, filename: 'wc2026-group-prediction.png', title: '📊 分享我的分組預測', text: `📊 我的 2026 世界盃分組晉級預測出爐！來挑戰我的選隊眼光！\n${shareLink}` })
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
  const current = load(GK.team);
  const sorted  = Object.entries(TEAMS).sort((a,b) => (a[1].fifaRank||99) - (b[1].fifaRank||99));
  const { votes, total } = getSimVotes();

  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:32px;margin-bottom:8px">⚽</div>
      <div style="font-size:18px;font-weight:800">宣示支持球隊</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">選一支你要在整個世界盃陪伴的隊伍</div>
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
  const code = _pendingSupportTeam || load(GK.team);
  if (!code) { alert('請選擇一支球隊'); return; }
  save(GK.team, code);
  syncToSupabase?.();
  syncArenaToSupabase?.('picks');
  onFirstTeam?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  closeModal();
}

// ── 成就徽章系統 ──────────────────────────────────────────
const BADGES = [
  { id:'first_daily',   icon:'🎯', name:'初次出擊',   desc:'完成第一次每日一題' },
  { id:'streak3',       icon:'🔥', name:'三連勝',     desc:'連續答題 3 天' },
  { id:'streak7',       icon:'💥', name:'週不停歇',   desc:'連續答題 7 天' },
  { id:'streak30',      icon:'⚡', name:'鐵人預言家', desc:'連續答題 30 天' },
  { id:'champion_set',  icon:'🏆', name:'押注冠軍',   desc:'完成冠軍預測' },
  { id:'groups_done',   icon:'📋', name:'全組預測師', desc:'填完所有 12 組分組預測' },
  { id:'team_set',      icon:'❤️', name:'死忠球迷',   desc:'宣示支持球隊' },
  { id:'all_tasks',     icon:'🌟', name:'全能預言家', desc:'完成所有競技場任務' },
  { id:'answered10',    icon:'🧠', name:'積累智慧',   desc:'累計答題 10 次' },
  { id:'answered30',    icon:'🎓', name:'資深預言家', desc:'累計答題 30 次' },
];

function loadBadges() {
  return load('wc26_badges') || [];
}

function checkAchievements() {
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
    // 同步更新競技場（若已開啟）
    const arenaEl = document.getElementById('section-arena');
    if (arenaEl && arenaEl.innerHTML.trim()) renderArena();
  }
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
  return `
    <div class="badges-section">
      <div class="badges-title">🏅 成就徽章</div>
      <div class="badges-grid">
        ${BADGES.map(b => {
          const e = earnedIds.has(b.id);
          return `<div class="badge-card ${e ? 'earned' : 'locked'}" title="${b.desc}">
            <div class="badge-card-icon">${e ? b.icon : '🔒'}</div>
            <div class="badge-card-name">${b.name}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
