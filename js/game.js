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

// ── 每日題庫（客觀事實題，每題均有正確答案）────────────────
const DAILY_QUESTIONS = [
  { q:'2026年世界盃共有幾支球隊參賽？',
    opts:['32支','36支','48支','40支'], correct:2 },
  { q:'2026年世界盃由哪幾個國家聯合主辦？',
    opts:['僅美國','美國、加拿大與墨西哥','美國與加拿大','美國與墨西哥'], correct:1 },
  { q:'2026年世界盃決賽將在哪座球場舉行？',
    opts:['SoFi Stadium','AT&T Stadium','Hard Rock Stadium','MetLife Stadium'], correct:3 },
  { q:'哪個國家贏得世界盃冠軍次數最多（5次）？',
    opts:['德國','義大利','巴西','阿根廷'], correct:2 },
  { q:'2022年卡達世界盃冠軍是哪支球隊？',
    opts:['法國','阿根廷','克羅埃西亞','摩洛哥'], correct:1 },
  { q:'2018年俄羅斯世界盃冠軍是哪支球隊？',
    opts:['法國','克羅埃西亞','比利時','英格蘭'], correct:0 },
  { q:'2014年巴西世界盃冠軍是哪支球隊？',
    opts:['巴西','阿根廷','德國','荷蘭'], correct:2 },
  { q:'2010年南非世界盃冠軍是哪支球隊？',
    opts:['荷蘭','德國','西班牙','阿根廷'], correct:2 },
  { q:'2026年世界盃共有幾場比賽？',
    opts:['64場','80場','96場','104場'], correct:3 },
  { q:'世界盃首屆於哪一年舉辦？',
    opts:['1920年','1924年','1930年','1934年'], correct:2 },
  { q:'首屆世界盃在哪個國家舉辦？',
    opts:['巴西','法國','義大利','烏拉圭'], correct:3 },
  { q:'首屆世界盃冠軍是哪支球隊？',
    opts:['烏拉圭','阿根廷','巴西','美國'], correct:0 },
  { q:'Miroslav Klose 的世界盃生涯總進球紀錄是幾球？',
    opts:['12球','14球','16球','18球'], correct:2 },
  { q:'哪支球隊在2014年世界盃準決賽以7:1大勝巴西？',
    opts:['阿根廷','德國','荷蘭','法國'], correct:1 },
  { q:'德國共贏得幾次世界盃冠軍？',
    opts:['3次','4次','5次','2次'], correct:1 },
  { q:'義大利共贏得幾次世界盃冠軍？',
    opts:['3次','4次','5次','2次'], correct:1 },
  { q:'阿根廷共贏得幾次世界盃冠軍（含2022年）？',
    opts:['1次','2次','3次','4次'], correct:2 },
  { q:'法國共贏得幾次世界盃冠軍？',
    opts:['1次','2次','3次','4次'], correct:1 },
  { q:'梅西在哪一年首次贏得世界盃冠軍？',
    opts:['2014年','2018年','2022年','2026年'], correct:2 },
  { q:'世界盃是每幾年舉辦一次？',
    opts:['2年','3年','4年','5年'], correct:2 },
  { q:'2026年世界盃小組賽共分幾組？',
    opts:['8組','10組','12組','16組'], correct:2 },
  { q:'葡萄牙在2006年世界盃的最終名次是？',
    opts:['第三名','亞軍','四強第四名','八強'], correct:0 },
  { q:'1994年世界盃決賽（巴西 vs 義大利）最終如何分勝負？',
    opts:['巴西加時進球','點球大戰（巴西勝）','正規時間巴西進球','義大利加時進球'], correct:1 },
  { q:'哪支球隊三度打入世界盃決賽但從未奪冠（截至2022年）？',
    opts:['捷克','匈牙利','荷蘭','克羅埃西亞'], correct:2 },
  { q:'2006年世界盃在哪個國家舉辦？',
    opts:['法國','德國','義大利','西班牙'], correct:1 },
  { q:'法國隊在哪一年首次奪得世界盃冠軍？',
    opts:['1994年','1998年','2002年','2006年'], correct:1 },
  { q:'2022年世界盃在哪個國家舉辦？',
    opts:['沙烏地阿拉伯','阿聯酋','卡達','巴林'], correct:2 },
  { q:'2026年世界盃32強賽共有幾場比賽？',
    opts:['8場','12場','16場','24場'], correct:2 },
  { q:'Pelé 在哪一年首次贏得世界盃冠軍（當時幾歲）？',
    opts:['1954年（13歲）','1958年（17歲）','1962年（21歲）','1966年（25歲）'], correct:1 },
  { q:'2022年世界盃決賽中，誰為法國完成帽子戲法但最終落敗？',
    opts:['格列茲曼','奧利維耶・吉魯','姆巴佩','本澤馬'], correct:2 },
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

// ── 取今日題目（以日期為索引循環）────────────────────────
function getTodayQuestion() {
  const today = new Date().toISOString().slice(0,10);
  const dayIdx = Math.floor((new Date(today) - new Date('2026-01-01')) / 86400000);
  return { ...DAILY_QUESTIONS[dayIdx % DAILY_QUESTIONS.length], date: today };
}

// ── 連勝天數計算 ──────────────────────────────────────────
function getDailyState() {
  return load(GK.daily) || { streak:0, lastDate:null, history:{} };
}

function recordDailyAnswer(optIdx) {
  const today = new Date().toISOString().slice(0,10);
  const state = getDailyState();
  if (state.history[today] !== undefined) return state; // 今天已答

  const { correct } = getTodayQuestion();
  const isCorrect = optIdx === correct;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const newStreak = isCorrect ? (state.lastDate === yesterday ? state.streak + 1 : 1) : 0;
  state.streak   = newStreak;
  state.lastDate = today;
  state.history[today] = { chosen: optIdx, isCorrect };
  save(GK.daily, state);

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
  const today      = new Date().toISOString().slice(0,10);
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

  const today      = new Date().toISOString().slice(0,10);
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
  const today      = new Date().toISOString().slice(0,10);
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
  const champFlag = champC1 ? `${champC1.flag} ${champC1.nameCN}` : '—';

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
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">+10 XP / 天</span>
          <span class="arena-card-cta">${dailyDone ? '已完成 ✓' : '立即作答 →'}</span>
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
        ${myChampion ? '<div class="arena-lock-hint">⏰ 開賽後永久鎖定</div>' : ''}
        <div class="arena-card-footer">
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">+50 XP</span>
          <span class="arena-card-cta">${myChampion ? '修改預測 →' : '開始預測 →'}</span>
        </div>
      </div>

      <!-- ③ 分組賽預測 -->
      <div class="arena-card ${groupsDone ? 'done' : ''}" onclick="openGroupPicks()">
        <div class="arena-card-badge">${groupsDone ? '✅ 全部填完' : `${groupCount}/12 組`}</div>
        <span class="arena-card-icon">📋</span>
        <div class="arena-card-title">分組賽預測</div>
        <div class="arena-card-desc">預測 12 組各自的前兩名出線隊伍，見證你的眼光</div>
        ${groupCount > 0 && !groupsDone ? `
        <div style="margin-top:12px">
          <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${Math.round(groupCount/12*100)}%;background:linear-gradient(90deg,#2196f3,#00bcd4);border-radius:999px;transition:width .5s ease"></div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:5px">${groupCount}/12 已完成</div>
        </div>` : ''}
        <div class="arena-card-footer">
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">+50 XP</span>
          <span class="arena-card-cta">${groupsDone ? '修改預測 →' : groupCount > 0 ? '繼續填寫 →' : '開始填寫 →'}</span>
        </div>
      </div>

      <!-- ④ 支持球隊 -->
      <div class="arena-card ${myTeam ? 'done' : ''}" onclick="openTeamSupport()">
        <div class="arena-card-badge">${myTeam ? '✅ 已宣示' : '尚未選擇'}</div>
        <span class="arena-card-icon" style="font-size:44px">${myTeam ? (TEAMS[myTeam]?.flag||'⚽') : '⚽'}</span>
        <div class="arena-card-title">宣示支持球隊</div>
        <div class="arena-card-desc">
          ${myTeam
            ? `你支持 <strong style="color:#e91e63">${TEAMS[myTeam]?.nameCN||myTeam}</strong>，全力加油！`
            : '選定一支你要整個世界盃陪伴的球隊'}
        </div>
        <div class="arena-card-footer">
          <span style="font-size:11px;color:rgba(255,255,255,0.3)">+30 XP</span>
          <span class="arena-card-cta">${myTeam ? '更換球隊 →' : '選擇球隊 →'}</span>
        </div>
      </div>

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
          <button class="link-btn" onclick="copyRefLink()">📨 邀請好友 +3💎</button>
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
      <span style="font-size:22px">${t.flag}</span>
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
              return `<div class="group-pick-team ${sel?'selected':''}" onclick="toggleGroupPick('${g}','${code}',this)">
                <span>${t.flag}</span>
                <span>${t.nameCN}</span>
              </div>`;
            }).join('')}
          </div>
          <div class="group-pick-hint" id="hint-${g}">${picked.length===2 ? '✓ 已選 2 隊' : `請再選 ${2-picked.length} 隊`}</div>
        </div>`;
      }).join('')}
    </div>
    <button class="btn-primary" style="width:100%;margin-top:20px" onclick="saveGroupPicks()">
      <i class="fas fa-save"></i> 儲存預測
    </button>`;

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
    const sel = [...container.querySelectorAll('.group-pick-team.selected')].map(el => {
      const flag = el.querySelector('span:first-child').textContent;
      return Object.keys(TEAMS).find(c => TEAMS[c].flag === flag) || '';
    }).filter(Boolean);
    groups[g] = sel;
    if (sel.length < 2) incomplete++;
  });
  if (incomplete > 0) {
    alert(`還有 ${incomplete} 組未選滿 2 隊，請完成後再儲存`);
    return;
  }
  save(GK.groups, groups);
  syncToSupabase?.();
  onFirstGroups?.();
  updateNavXP();
  checkAchievements();
  renderArena();
  closeModal();
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
          <div style="font-size:28px">${t.flag}</div>
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
