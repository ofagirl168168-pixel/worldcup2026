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

// ── 每日題庫 ──────────────────────────────────────────────
const DAILY_QUESTIONS = [
  { q:'你認為本屆世界盃冠軍最有可能來自哪個洲？',      opts:['歐洲','南美洲','非洲（大冷門）','亞洲（超級大冷門）'] },
  { q:'誰會是本屆世界盃射手王？',                      opts:['Kylian Mbappé（法國）','Vinicius Jr.（巴西）','Harry Kane（英格蘭）','出乎意料的黑馬'] },
  { q:'哪支球隊會是本屆最讓人失望的強隊？',            opts:['阿根廷','德國','葡萄牙','荷蘭'] },
  { q:'本屆最多進球的比賽，你猜幾球？',                opts:['6球','7球','8球','9球以上'] },
  { q:'哪個洲的代表會走得最遠（四強以上）？',          opts:['非洲（摩洛哥/塞內加爾）','亞洲（日本/韓國）','北中美（美國/墨西哥）','大洋洲'] },
  { q:'本屆最受矚目的新星是誰？',                      opts:['Lamine Yamal（西班牙）','Endrick（巴西）','Kobbie Mainoo（英格蘭）','其他新面孔'] },
  { q:'最終決賽會是什麼格局？',                        opts:['歐洲 vs 歐洲','歐洲 vs 南美','南美 vs 南美','其他大陸挑戰歐/南美'] },
  { q:'本屆冠軍賽比分你猜？',                          opts:['1-0 正規時間','2-1 激戰','加時賽才分勝負','PK 大戰決定'] },
  { q:'哪支非洲球隊最有機會打進四強？',                opts:['摩洛哥','塞內加爾','奈及利亞','埃及'] },
  { q:'日本能走到哪個階段？',                          opts:['小組賽出局','32強','16強','八強以上'] },
  { q:'美國在主場優勢下能走多遠？',                    opts:['小組賽出局','32強','16強','八強以上，刷新歷史'] },
  { q:'韓國能走多遠？',                                opts:['小組賽出局','32強','16強','八強以上'] },
  { q:'你最期待哪一場小組賽？',                        opts:['法國 vs 強敵對決','巴西 vs 南美鄰居','英格蘭 vs 歐陸勁旅','美國 vs 墨西哥'] },
  { q:'本屆最精彩的 PK 大戰，你猜在哪個階段？',        opts:['16強','八強','四強','決賽'] },
  { q:'哪位門將會成為本屆最大亮點？',                  opts:['Alisson（巴西）','Neuer（德國）','Maignan（法國）','黑馬門將'] },
  { q:'Cristiano Ronaldo 的本屆世界盃？',              opts:['小組賽告別','帶葡萄牙進四強','奪金靴獎','舉起世界盃'] },
  { q:'本屆最大冷門會出現在哪個階段？',                opts:['小組賽爆冷','32強翻盤','16強驚天逆轉','八強以後震驚世界'] },
  { q:'誰會是本屆最佳年輕球員獎？',                    opts:['Lamine Yamal','Warren Zaïre-Emery','Pedri','來自非歐美的黑馬'] },
  { q:'本屆進球最多的射手最終進幾球？',                opts:['6-7 球','8-9 球','10-11 球','12 球以上'] },
  { q:'哪支球隊讓你在小組賽出局最驚訝？',              opts:['葡萄牙','比利時','荷蘭','烏拉圭'] },
  { q:'三個地主國中表現最好的是？',                    opts:['美國（東道主優勢）','墨西哥（拉丁激情）','加拿大（黑馬之旅）','三國都讓人失望'] },
  { q:'本屆哪個教練的戰術最讓你印象深刻？',            opts:['Deschamps（法國）','Carlo Ancelotti（巴西）','Luis de la Fuente（西班牙）','黑馬教頭'] },
  { q:'你預計會看幾場直播？',                          opts:['1-10 場','11-30 場','31-60 場','全部 104 場我都看'] },
  { q:'本屆哪個時區比賽你最可能熬夜看？',              opts:['台灣凌晨 1-2 點','凌晨 3-4 點','清晨 5-6 點','全部熬夜'] },
  { q:'你覺得本屆最美麗的進球方式是？',                opts:['遠射死角','頭槌破門','個人盤帶過人後射門','任意球直接得分'] },
  { q:'Mbappé 在本屆的最終貢獻？',                     opts:['射手王','助攻王','最佳球員','帶法國奪冠'] },
  { q:'本屆哪場比賽你最想親臨現場？',                  opts:['開幕戰','同組強強對決','決賽','任何一場都好'] },
  { q:'Vinicius Jr. 本屆最終成就？',                   opts:['小組賽發揮失常','16強出局','帶巴西進四強','問鼎世界盃'] },
  { q:'本屆哪個城市的比賽氛圍最棒？',                  opts:['紐約（東部能量）','洛杉磯（好萊塢舞台）','墨西哥城（沸騰拉丁）','溫哥華（清新北美）'] },
  { q:'本屆 VAR 爭議最大的時刻，你猜在哪？',           opts:['取消重要進球','關鍵紅牌','傷停補時爭議','決定性點球判決'] },
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

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const newStreak = state.lastDate === yesterday ? state.streak + 1 : 1;
  state.streak   = newStreak;
  state.lastDate = today;
  state.history[today] = optIdx;
  save(GK.daily, state);
  return state;
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

  el.innerHTML = `
    <div class="page-hero">
      <h1><i class="fas fa-gamepad"></i> 預測競技場</h1>
      <p>賽前預測、每日挑戰、搶先成為最強預言家</p>
    </div>

    <!-- 個人戰況儀表板 -->
    <div class="arena-dashboard">
      <div class="arena-stat-card">
        <div class="arena-stat-icon">🔥</div>
        <div class="arena-stat-num">${dailyState.streak}</div>
        <div class="arena-stat-label">連續打卡天數</div>
      </div>
      <div class="arena-stat-card">
        <div class="arena-stat-icon">📋</div>
        <div class="arena-stat-num">${Object.keys(dailyState.history).length}</div>
        <div class="arena-stat-label">累計答題數</div>
      </div>
      <div class="arena-stat-card">
        <div class="arena-stat-icon">🏆</div>
        <div class="arena-stat-num">${myChampion ? '✓' : '—'}</div>
        <div class="arena-stat-label">冠軍預測</div>
      </div>
      <div class="arena-stat-card">
        <div class="arena-stat-icon">📊</div>
        <div class="arena-stat-num">${myGroups ? Object.keys(myGroups).length + '/12' : '0/12'}</div>
        <div class="arena-stat-label">分組預測完成</div>
      </div>
    </div>

    <!-- 四大功能卡 -->
    <div class="arena-grid">

      <!-- ① 每日一題 -->
      <div class="arena-card ${dailyDone ? 'done' : 'urgent'}" onclick="openDailyPick()">
        <div class="arena-card-badge">${dailyDone ? '✓ 今日已完成' : '🔔 今日未作答'}</div>
        <div class="arena-card-icon">❓</div>
        <div class="arena-card-title">每日一題</div>
        <div class="arena-card-desc">每天一個世界盃話題，累積連勝天數</div>
        <div class="arena-card-streak">🔥 ${dailyState.streak} 天連勝</div>
      </div>

      <!-- ② 冠軍預測 -->
      <div class="arena-card ${myChampion ? 'done' : ''}" onclick="openChampionPick()">
        <div class="arena-card-badge">${myChampion ? '✓ 已鎖定預測' : '尚未預測'}</div>
        <div class="arena-card-icon">🏆</div>
        <div class="arena-card-title">冠軍預測投票</div>
        <div class="arena-card-desc">
          ${myChampion
            ? `你選了 ${TEAMS[myChampion.c1]?.flag||''} ${TEAMS[myChampion.c1]?.nameCN||myChampion.c1} 奪冠`
            : '選出你心目中的冠、亞、季軍'}
        </div>
        ${myChampion ? '<div class="arena-lock-hint">⏰ 開賽前可修改</div>' : ''}
      </div>

      <!-- ③ 分組賽預測 -->
      <div class="arena-card ${myGroups && Object.keys(myGroups).length===12 ? 'done' : ''}" onclick="openGroupPicks()">
        <div class="arena-card-badge">${myGroups && Object.keys(myGroups).length===12 ? '✓ 全部填完' : `完成 ${myGroups ? Object.keys(myGroups).length : 0}/12 組`}</div>
        <div class="arena-card-icon">📋</div>
        <div class="arena-card-title">分組賽預測</div>
        <div class="arena-card-desc">預測 12 組各自的前兩名晉級隊伍</div>
      </div>

      <!-- ④ 支持球隊 -->
      <div class="arena-card ${myTeam ? 'done' : ''}" onclick="openTeamSupport()">
        <div class="arena-card-badge">${myTeam ? '✓ 已選定' : '尚未選擇'}</div>
        <div class="arena-card-icon">${myTeam ? (TEAMS[myTeam]?.flag||'⚽') : '⚽'}</div>
        <div class="arena-card-title">宣示支持球隊</div>
        <div class="arena-card-desc">
          ${myTeam ? `你支持 ${TEAMS[myTeam]?.nameCN||myTeam}，加油！` : '選定一支你要支持的球隊'}
        </div>
      </div>

    </div>`;
}

// ── ① 每日一題 Modal ──────────────────────────────────────
function openDailyPick() {
  const { q, opts, date } = getTodayQuestion();
  const state = getDailyState();
  const answered = state.history[date] !== undefined;
  const chosen   = state.history[date];

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
        <button class="daily-opt ${answered && chosen===i ? 'selected' : ''} ${answered && chosen!==i ? 'dimmed' : ''}"
          onclick="${answered ? '' : `submitDailyPick(${i})`}"
          style="${answered ? 'cursor:default' : ''}">
          <span class="daily-opt-letter">${'ABCD'[i]}</span>
          <span>${o}</span>
        </button>`).join('')}
    </div>
    ${answered ? `
      <div style="margin-top:16px;padding:12px;background:rgba(76,175,80,0.1);border-radius:10px;text-align:center;color:#4caf50;font-size:13px">
        ✅ 今日已作答！明天繼續保持連勝 🔥
      </div>` : ''}`;

  document.getElementById('team-modal').classList.add('open');
}

function submitDailyPick(idx) {
  const state = recordDailyAnswer(idx);
  renderArena();
  openDailyPick(); // 重新渲染 modal 顯示已選
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
  renderArena();
  closeModal();
}
