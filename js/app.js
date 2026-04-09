/* ── 全站旗幟輔助（twemoji PNG，Windows/Linux 跨平台）── */
const _TWEMOJI = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72'
const _SUB_FLAGS = {
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': '1f3f4-e0067-e0062-e0065-e006e-e0067-e007f',
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': '1f3f4-e0067-e0062-e0073-e0063-e0074-e007f',
  '🏴󠁧󠁢󠁷󠁬󠁳󠁿': '1f3f4-e0067-e0062-e0077-e006c-e0073-e007f',
}
function getFlagImgUrl(emoji) {
  if (!emoji) return null
  if (emoji.startsWith('http') || emoji.startsWith('img/')) return emoji  // 隊徽 URL 直接回傳
  if (_SUB_FLAGS[emoji]) return `${_TWEMOJI}/${_SUB_FLAGS[emoji]}.png`
  const cps = [...emoji].map(c => c.codePointAt(0))
  const ri = cps.filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF)
  if (ri.length >= 2) return `${_TWEMOJI}/${ri.map(cp => cp.toString(16)).join('-')}.png`
  return null
}
function flagImg(src) {
  if (!src) return ''
  // 若已是 URL（隊徽 logo），直接用 img
  if (src.startsWith('http') || src.startsWith('img/')) return `<img src="${src}" class="flag-img" alt="logo">`
  const url = getFlagImgUrl(src)
  if (!url) return src
  return `<img src="${url}" class="flag-img" alt="${src}">`
}

/* 初始化賽事切換器 */
if (window.Tournament) {
  Tournament.init();
  Tournament.bind();
  updateHero();
  // 賽事切換時重新渲染當前頁面
  window.addEventListener('tournamentChanged', () => {
    const activeSection = document.querySelector('.page-section.active')?.id?.replace('section-','');
    updateHero();
    if (activeSection === 'home' || !activeSection) {
      renderChampions();
      renderUpcoming();
      renderDeathGroups();
      renderHighlights();
      if (typeof renderHomeDailyChallenge === 'function') renderHomeDailyChallenge();
    }
    if (activeSection === 'schedule')    renderSchedule('all','all');
    if (activeSection === 'teams')       renderTeams('all','');
    if (activeSection === 'stats')       renderStats('standings');
    if (activeSection === 'focus')       renderFocus();
    if (activeSection === 'predictions') renderPredictions();
    if (activeSection === 'arena')       renderArena();
    // 更新 header 標題
    const cfg = Tournament.config();
    const titleEl = document.querySelector('.logo-title');
    const subEl = document.querySelector('.logo-sub');
    if (cfg && titleEl) {
      titleEl.textContent = cfg.id === 'ucl' ? '歐冠預測' : '世界盃預測';
      subEl.textContent = cfg.id === 'ucl' ? 'AI 分析平台 2025/26' : 'AI 分析平台 2026';
    }
  });
}

/* ── 賽事感知資料取得器 ───────────────────────────── */
// 注意：WC 資料用 const 宣告（不在 window 上），UCL 資料有 window 導出
function _isUCL() { return window.Tournament?.isUCL?.() ?? false; }
function _teams() { return _isUCL() ? (window.UCL_TEAMS||{}) : (typeof TEAMS!=='undefined' ? TEAMS : {}); }
function _matches() {
  if (_isUCL()) return (window.UCL_MATCHES||[]);
  return (typeof SCHEDULE!=='undefined' && SCHEDULE.length) ? SCHEDULE : [];
}
function _articles() { return _isUCL() ? (window.UCL_ARTICLES||[]) : (typeof ARTICLES!=='undefined' ? ARTICLES : []); }
function _dailyQ() { return _isUCL() ? (window.UCL_DAILY_QUESTIONS||[]) : (typeof DAILY_QUESTIONS!=='undefined' ? DAILY_QUESTIONS : []); }

/* app.js — 導覽 + 倒計時 + 首頁 */

// 首頁：冠軍預測
function renderChampions() {
  const top5 = _isUCL() ? [
    {code:'BAR', prob:'22%', desc:'Yamal+Pedri黃金組合，Flick高壓成型'},
    {code:'LIV', prob:'20%', desc:'Slot首季帶隊勢如破竹'},
    {code:'RMA', prob:'18%', desc:'歐冠DNA，Mbappé加持'},
    {code:'MCI', prob:'15%', desc:'Haaland+Guardiola體系成熟'},
    {code:'BAY', prob:'10%', desc:'Kane進球機器，渴望歐冠金盃'}
  ] : [
    {code:'FRA', prob:'29%', desc:'陣容最均衡，Mbappé狀態巔峰'},
    {code:'BRA', prob:'24%', desc:'雙翼最強，渴望第六星'},
    {code:'ESP', prob:'20%', desc:'中場統治，Yamal橫空出世'},
    {code:'ENG', prob:'12%', desc:'Bellingham+Kane，等待54年'},
    {code:'ARG', prob:'8%',  desc:'衛冕冠軍，Messi告別之旅'}
  ];
  const el = document.getElementById('champion-cards');
  if (!el) return;

  const _T = _teams();
  const cards = top5.map((t, i) => {
    const tm = _T[t.code];
    const locked = !currentUser && i >= 2;
    return `<div class="champion-card${locked ? ' champion-card-locked' : ''}" onclick="${locked ? 'loginWithGoogle()' : "showSection('teams')"}">
      <div class="champion-rank">#${i+1}</div>
      <div class="champion-flag">${flagImg(tm.flag)}</div>
      <div class="champion-name">${tm.nameCN}</div>
      <div class="champion-prob" style="${locked ? 'filter:blur(6px);user-select:none' : ''}" id="champ-prob-${t.code}">${t.prob}</div>
      <div class="champion-desc" style="${locked ? 'filter:blur(5px);user-select:none' : ''}">${t.desc}</div>
      <div id="champ-votes-${t.code}" class="champion-votes"></div>
      ${locked ? `<div class="champion-lock-hint">🔒 登入查看</div>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = cards;

  // 未登入時在卡片下方加提示
  if (!currentUser) {
    document.getElementById('champion-login-cta')?.remove();
    el.insertAdjacentHTML('afterend', `
      <div id="champion-login-cta" style="text-align:center;margin-top:14px">
        <button onclick="loginWithGoogle()" style="padding:10px 24px;border-radius:999px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:var(--text-secondary);font-size:13px;cursor:pointer">
          登入即可查看完整奪冠預測 →
        </button>
      </div>`);
  }

  // 非同步填入真實票數
  if (typeof fetchChampionVotes === 'function') {
    fetchChampionVotes().then(({ counts, total }) => {
      if (total < 2) return
      top5.forEach(t => {
        const votesEl = document.getElementById(`champ-votes-${t.code}`)
        const cnt = counts[t.code] || 0
        if (votesEl && cnt > 0) {
          const pct = Math.round(cnt / total * 100)
          votesEl.textContent = `👥 ${cnt} 人預測・佔 ${pct}%`
        }
        // 更新機率為真實票數佔比
        const probEl = document.getElementById(`champ-prob-${t.code}`)
        if (probEl && cnt > 0) {
          const pct = Math.round(cnt / total * 100)
          probEl.textContent = `${pct}%`
        }
      })
    })
  }
}

// 首頁：即將開賽（取前6場）
function renderUpcoming() {
  const el = document.getElementById('upcoming-matches');
  if (!el) return;
  const _T = _teams();
  const schedule = _matches();
  if (!schedule.length) { el.innerHTML = ''; return; }

  // UCL: 找尚未結束的比賽；WC: 直接取前6場
  let upcoming;
  if (_isUCL()) {
    upcoming = schedule.filter(m => m.home && m.away && m.home !== 'TBD' && m.status === 'scheduled').slice(0, 6);
    if (!upcoming.length) upcoming = schedule.filter(m => m.home && m.away && m.home !== 'TBD').slice(-6);
  } else {
    upcoming = schedule.filter(m => m.home && m.away).slice(0, 6);
  }

  el.innerHTML = upcoming.map(m => {
    const ht = _T[m.home], at = _T[m.away];
    if (!ht || !at) return '';
    const pred = calcPred(ht, at);
    const stageLabel = _isUCL()
      ? {league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage] || ''
      : '';
    const dateStr = _isUCL() ? (m.date||'').slice(5).replace('-','/') : (m.twDate||'').slice(5).replace('-','/');
    const timeStr = _isUCL() ? (m.time||'') : (m.twTime||'');
    const subInfo = _isUCL()
      ? `${dateStr} · ${stageLabel}${m.md ? ' MD'+m.md : ''}`
      : `${dateStr} · ${GROUPS[m.group]?.name||''}`;
    return `<div class="upcoming-card" onclick="openPredModal('${m.id}')">
      <div class="upcoming-teams">
        <div class="upcoming-team"><div class="upcoming-flag">${flagImg(ht.flag)}</div><div class="upcoming-name">${ht.nameCN}</div></div>
        <div class="upcoming-vs">${m.status==='finished' && m.score ? m.score.h+' - '+m.score.a : 'VS'}</div>
        <div class="upcoming-team"><div class="upcoming-flag">${flagImg(at.flag)}</div><div class="upcoming-name">${at.nameCN}</div></div>
      </div>
      <div class="upcoming-info">
        <div>
          <div class="upcoming-time">${timeStr}${_isUCL() ? '' : ' 台灣時間'}</div>
          <div style="font-size:12px;color:var(--text-muted)">${subInfo}</div>
        </div>
      </div>
      <div class="prob-mini">
        <div class="prob-mini-bar prob-bar-win" style="width:${pred.hw}px;height:4px;border-radius:2px"></div>
        <div class="prob-mini-bar prob-bar-draw" style="width:${pred.d*0.5}px;height:4px;border-radius:2px;background:#546e7a"></div>
        <div class="prob-mini-bar prob-bar-lose" style="width:${pred.aw*0.5}px;height:4px;border-radius:2px"></div>
        <span>${pred.hw}% · ${pred.d}% · ${pred.aw}%</span>
      </div>
    </div>`;
  }).join('');
}

// 首頁：死亡組指數 / 歐冠聯賽排名
function renderDeathGroups() {
  const el = document.getElementById('death-groups');
  const header = document.getElementById('death-section-header');
  if (!el) return;

  if (_isUCL()) {
    // 更新標題
    if (header) header.innerHTML = `<h2><i class="fas fa-trophy"></i> 聯賽階段排名</h2><span class="section-badge">前8名直接晉級</span>`;

    // 覆蓋 death-grid 的 grid 佈局
    el.style.display = 'block';

    const standings = window.calcUCLStandings?.() || [];
    const _T = _teams();
    const top8 = standings.slice(0, 8);
    const next16 = standings.slice(8, 24);
    const cols = 'grid-template-columns:36px 32px 1fr 50px 50px 50px 60px 60px';

    el.innerHTML = `
      <div style="margin-bottom:28px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);letter-spacing:1px;margin-bottom:12px">🏆 直接晉級十六強</div>
        <div style="background:rgba(255,255,255,0.03);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
          <div style="display:grid;${cols};gap:0;padding:10px 16px;font-size:11px;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border)">
            <span>#</span><span></span><span>球隊</span><span style="text-align:center">賽</span><span style="text-align:center">勝</span><span style="text-align:center">負</span><span style="text-align:center">淨勝球</span><span style="text-align:right">積分</span>
          </div>
          ${top8.map((row, i) => {
            const t = _T[row.code];
            if (!t) return '';
            return `<div style="display:grid;${cols};gap:0;padding:12px 16px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);${i%2?'':'background:rgba(255,255,255,0.02)'}">
              <span style="font-size:16px;font-weight:800;color:var(--accent)">${i+1}</span>
              <span style="font-size:22px">${flagImg(t.flag)}</span>
              <div><div style="font-weight:700;font-size:14px">${t.nameCN}</div><div style="font-size:11px;color:var(--text-muted);margin-top:1px">${t.league||''}</div></div>
              <span style="text-align:center;font-size:13px;color:var(--text-secondary)">${row.w+row.d+row.l}</span>
              <span style="text-align:center;font-size:13px;font-weight:700;color:#4caf50">${row.w}</span>
              <span style="text-align:center;font-size:13px;color:#f44336">${row.l}</span>
              <span style="text-align:center;font-size:13px;font-weight:600;color:${row.gd>0?'#4caf50':row.gd<0?'#f44336':'var(--text-muted)'}">${row.gd>0?'+':''}${row.gd}</span>
              <div style="text-align:right"><span style="font-size:18px;font-weight:900;color:var(--accent)">${row.pts}</span></div>
            </div>`;
          }).join('')}
        </div>
      </div>
      ${next16.length ? `<div>
        <div style="font-size:12px;font-weight:700;color:var(--text-secondary);letter-spacing:1px;margin-bottom:12px">⚔️ 附加賽圈（第9-24名）</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px">
          ${next16.map((row, i) => {
            const t = _T[row.code];
            if (!t) return '';
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:rgba(255,255,255,0.03);border-radius:var(--radius-sm);border:1px solid var(--border)">
              <span style="font-size:13px;font-weight:800;color:var(--text-muted);width:24px;text-align:center">${i+9}</span>
              <span style="font-size:20px">${flagImg(t.flag)}</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:700">${t.nameCN}</div><div style="font-size:10px;color:var(--text-muted)">${row.w}勝${row.d}平${row.l}負</div></div>
              <div style="text-align:right"><span style="font-size:15px;font-weight:800;color:var(--text-secondary)">${row.pts}</span><span style="font-size:11px;color:var(--text-muted)"> 分</span></div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}`;
    return;
  }

  // 世足：還原標題和佈局
  if (header) header.innerHTML = `<h2><i class="fas fa-skull"></i> 分組死亡指數</h2><span class="section-badge">激烈程度排行</span>`;
  el.style.display = '';

  const scores = Object.entries(GROUPS).map(([g, gd]) => {
    const avgRank = gd.teams.reduce((s,c) => s + (TEAMS[c]?.fifaRank||50), 0) / 4;
    const deathScore = Math.round(100 - avgRank * 1.2);
    return {g, gd, score: Math.max(20, Math.min(99, deathScore))};
  }).sort((a,b) => b.score - a.score).slice(0, 6);
  el.innerHTML = scores.map(({g, gd, score}) => {
    const label = score >= 80 ? '極度激烈' : score >= 65 ? '競爭激烈' : '均衡';
    return `<div class="death-card">
      <div class="death-header">
        <span class="death-group">${gd.name}</span>
        <span class="death-score">${label}</span>
      </div>
      <div class="death-teams">${gd.teams.map(c => `<span class="death-team-pill">${flagImg(TEAMS[c]?.flag||'')} ${TEAMS[c]?.nameCN||c}</span>`).join('')}</div>
      <div class="death-bar"><div class="death-bar-fill" style="width:${score}%"></div></div>
    </div>`;
  }).join('');
}

// 首頁：十大看點
function renderHighlights() {
  const el = document.getElementById('highlights-grid');
  if (!el) return;

  const wcItems = [
    {title:'Messi的謝幕之旅',desc:'阿根廷衛冕，Messi最後一次世界盃，每場都可能是絕唱'},
    {title:'Ronaldo vs Messi最終章',desc:'兩大巨星同場世界盃，誰能笑到最後？'},
    {title:'日本能否首進八強？',desc:'亞洲足球的榮耀之戰，日本歐洲軍團組成史上最強陣'},
    {title:'摩洛哥能否複製奇蹟？',desc:'非洲之鷹2022四強再出發，目標更高'},
    {title:'美國主場夢',desc:'三國共辦，美國球迷的世界盃狂歡，本土優勢能走多遠？'},
    {title:'墨西哥十六強魔咒',desc:'連續七屆止步十六強，2026就在家門口，魔咒必須終結'},
    {title:'德國浴火重生',desc:'Wirtz+Musiala新雙核，德國要從2018、2022的噩夢中甦醒'},
    {title:'加拿大的首次大考',desc:'Davies領軍，第一次世界盃就有望衝擊八強'},
    {title:'比利時黃金一代謝幕',desc:'De Bruyne、Lukaku最後機會，不拿冠軍終成遺憾'},
    {title:'48隊新制帶來更多驚喜',desc:'首屆48隊制，更多黑馬、更多爆冷、更多意外'}
  ];

  const uclItems = [
    {title:'新制歐冠元年',desc:'36隊瑞士制取代傳統小組賽，8場聯賽階段讓每輪都充滿懸念'},
    {title:'皇馬王朝能否延續？',desc:'15冠豪門加入 Mbappé 後火力全開，劍指史無前例的連霸'},
    {title:'巴薩 Yamal 世代崛起',desc:'17歲的 Lamine Yamal 領軍，巴薩青春風暴席捲歐冠'},
    {title:'曼城的衛冕挑戰',desc:'Haaland+De Bruyne 組合能否再次征服歐洲，Guardiola 續寫傳奇？'},
    {title:'Arsenal 的歐冠回歸',desc:'闊別多年重返歐冠淘汰賽，Saka 領軍的槍手能走多遠？'},
    {title:'拜仁慕尼黑的復仇之路',desc:'去年準決賽出局，Kane+Musiala 組合誓言捲土重來'},
    {title:'PSG 後 Mbappé 時代',desc:'失去頭號球星後，Dembélé 能否扛起巴黎的歐冠夢？'},
    {title:'國際米蘭衛冕之路',desc:'意甲霸主再戰歐冠，Lautaro 領銜的藍黑軍團實力不容小覷'},
    {title:'多特蒙德黃牆再響',desc:'去年闖入決賽的黑馬能否再創奇蹟？黃牆威力依舊震撼'},
    {title:'VAR 與新越位技術',desc:'半自動越位系統全面啟用，科技如何改變歐冠的判罰爭議？'}
  ];

  const items = _isUCL() ? uclItems : wcItems;
  el.innerHTML = items.map((item,i) => `
    <div class="highlight-card">
      <div class="highlight-num">${String(i+1).padStart(2,'0')}</div>
      <div><div class="highlight-title">${item.title}</div><div class="highlight-desc">${item.desc}</div></div>
    </div>`).join('');
}

function showSection(id) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.querySelectorAll('[data-section="' + id + '"]').forEach(b => b.classList.add('active'));
  document.getElementById('mobile-nav').classList.remove('open');
  window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    showSection(btn.dataset.section);
    if (btn.dataset.section === 'schedule')    renderSchedule('all','all');
    if (btn.dataset.section === 'teams')       renderTeams('all','');
    if (btn.dataset.section === 'stats')       renderStats('standings');
    if (btn.dataset.section === 'focus')       renderFocus();
    if (btn.dataset.section === 'predictions') renderPredictions();
    if (btn.dataset.section === 'arena')       renderArena();
  });
});

// 賽程篩選
document.getElementById('phase-filter')?.addEventListener('click', e => {
  if (!e.target.dataset.phase) return;
  document.querySelectorAll('#phase-filter .filter-tab').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  const g = document.querySelector('#group-filter .filter-tab.active')?.dataset.group || 'all';
  renderSchedule(e.target.dataset.phase, g);
});
document.getElementById('group-filter')?.addEventListener('click', e => {
  if (!e.target.dataset.group) return;
  document.querySelectorAll('#group-filter .filter-tab').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  const p = document.querySelector('#phase-filter .filter-tab.active')?.dataset.phase || 'all';
  renderSchedule(p, e.target.dataset.group);
});

// 球隊篩選
document.getElementById('conf-filter')?.addEventListener('click', e => {
  if (!e.target.dataset.conf) return;
  document.querySelectorAll('#conf-filter .filter-tab').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  renderTeams(e.target.dataset.conf, document.getElementById('team-search')?.value || '');
});
document.getElementById('team-search')?.addEventListener('input', e => {
  const conf = document.querySelector('#conf-filter .filter-tab.active')?.dataset.conf || 'all';
  renderTeams(conf, e.target.value);
});

// 數據 Tab
document.querySelectorAll('.stats-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stats-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderStats(btn.dataset.stats);
  });
});

// AI預測頁
function renderPredictions() {
  const featEl = document.getElementById('featured-predictions');
  const listEl = document.getElementById('predictions-list');
  if (!featEl || !listEl) return;
  const _T = _teams();
  const schedule = _matches();

  let featuredMatches;
  if (_isUCL()) {
    // 歐冠：挑選即將進行的 or 最近的精選比賽
    const uclFeatPairs = [['BAR','BAY'],['LIV','INT'],['RMA','ATM'],['LEV','ARS'],['PSG','BAY'],['BAR','RMA']];
    featuredMatches = uclFeatPairs.map(([h,a]) =>
      schedule.find(m => m.home===h && m.away===a) ||
      schedule.find(m => m.home===a && m.away===h)
    ).filter(Boolean).slice(0,6);
    const fill = schedule.filter(m => m.home && m.away && m.home !== 'TBD');
    while (featuredMatches.length < 6 && fill.length > featuredMatches.length) {
      const m = fill[fill.length - 1 - (featuredMatches.length - uclFeatPairs.length)];
      if (m && !featuredMatches.find(x => x.id === m.id)) featuredMatches.push(m);
      else break;
    }
  } else {
    const featuredPairs = [['BRA','MAR'],['FRA','NOR'],['ENG','CRO'],['ARG','AUT'],['ESP','URU'],['GER','ECU']];
    featuredMatches = featuredPairs.map(([h,a]) =>
      schedule.find(m => m.home===h && m.away===a) ||
      schedule.find(m => m.home===a && m.away===h)
    ).filter(Boolean).slice(0,6);
    const fillMatches = schedule.filter(m => m.home && m.away);
    while (featuredMatches.length < 6 && fillMatches.length > featuredMatches.length) {
      const m = fillMatches[featuredMatches.length];
      if (!featuredMatches.find(x => x.id === m.id)) featuredMatches.push(m);
    }
  }
  featEl.innerHTML = featuredMatches.map(m => {
    const ht = _T[m.home], at = _T[m.away];
    if (!ht||!at) return '';
    const p = calcPred(ht,at);
    const tagLabel = _isUCL()
      ? ({league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage]||'')
      : (GROUPS[m.group]?.name||'');
    return `<div class="featured-pred-card" onclick="openPredModal('${m.id}')">
      <div class="featured-pred-header">
        <span class="match-tag group">${tagLabel}</span>
        ${m.status==='finished' ? '<span class="match-tag" style="background:#4caf50;color:#fff">已結束</span>' : `<span class="confidence-badge confidence-${p.conf}">${p.confLabel}</span>`}
      </div>
      <div class="featured-pred-teams">
        <div class="pred-team"><div class="pred-team-flag">${flagImg(ht.flag)}</div><div class="pred-team-name">${ht.nameCN}</div></div>
        ${m.status==='finished' && m.score
          ? `<div class="pred-score-big" style="color:#4caf50">${m.score.h} – ${m.score.a}</div>`
          : `<div class="pred-score-big" style="${window.unlockedMatchSet?.has(m.id) ? '' : 'filter:blur(8px);user-select:none'}">${p.score}</div>`}
        <div class="pred-team"><div class="pred-team-flag">${flagImg(at.flag)}</div><div class="pred-team-name">${at.nameCN}</div></div>
      </div>
      <div class="prob-row">
        <div class="prob-col win"><label>${ht.nameCN} 勝</label><div class="prob-val">${p.hw}%</div></div>
        <div class="prob-col draw"><label>平局</label><div class="prob-val">${p.d}%</div></div>
        <div class="prob-col lose"><label>${at.nameCN} 勝</label><div class="prob-val">${p.aw}%</div></div>
      </div>
      <div class="prob-track">
        <div class="prob-track-win" style="width:${p.hw}%"></div>
        <div class="prob-track-draw" style="width:${p.d}%"></div>
        <div class="prob-track-lose" style="width:${p.aw}%"></div>
      </div>
      <ul class="pred-key-points">${generateAnalysis(ht,at,p).slice(0,2).map(pt=>`<li>${pt}</li>`).join('')}</ul>
    </div>`;
  }).join('');

  const allMatches = schedule.filter(m => m.home && m.away && m.home !== 'TBD').slice(0,30);
  listEl.innerHTML = allMatches.map(m => {
    const ht = _T[m.home], at = _T[m.away];
    if (!ht||!at) return '';
    const p = calcPred(ht,at);
    return `<div class="pred-list-card" onclick="openPredModal('${m.id}')">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">${flagImg(ht.flag)}</span>
        <span style="font-weight:700">${ht.nameCN}</span>
      </div>
      <div style="text-align:center">
        ${m.status==='finished' && m.score
          ? `<div style="font-size:16px;font-weight:800;color:#4caf50">${m.score.h} – ${m.score.a}</div>
             <div style="font-size:10px;color:#4caf50;margin-top:1px">已結束</div>`
          : `<div style="font-size:16px;font-weight:800;color:var(--accent);${window.unlockedMatchSet?.has(m.id) ? '' : 'filter:blur(7px);user-select:none'}">${p.score}</div>`}
        <div style="font-size:11px;color:var(--text-muted)">${_isUCL() ? (m.date||'').slice(5).replace('-','/') + ' ' + (m.time||'') : (m.twDate?.slice(5).replace('-','/')||'') + ' ' + (m.twTime||'')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end">
        <span style="font-weight:700">${at.nameCN}</span>
        <span style="font-size:22px">${flagImg(at.flag)}</span>
      </div>
      <span class="confidence-badge confidence-${p.conf}">${p.hw}% - ${p.d}% - ${p.aw}%</span>
    </div>`;
  }).join('');
}

// 統一的比賽預測 Modal（所有入口都走這裡）
async function openPredModal(id) {
  const schedule = _matches();
  const match = schedule.find(x => x.id === id);
  const isKnockout = _isUCL()
    ? (match && match.stage && match.stage !== 'league')
    : (match && match.phase && match.phase !== 'group');
  const spendType = isKnockout ? 'unlock_knockout' : 'unlock_match'
  const cost = isKnockout ? 2 : 1

  // 立即顯示 modal + loading 動畫，不讓用戶感覺沒反應
  const modal = document.getElementById('team-modal');
  const mc = document.getElementById('modal-content');
  const _isMatchFinished = match && match.status === 'finished' && match.score;
  mc.innerHTML = `<div class="modal-loading">
    <div class="modal-spinner"></div>
    <div class="modal-loading-text">${_isMatchFinished ? '⚽ 載入賽事結果...' : '🤖 AI 正在分析賽事...'}</div>
    <div class="modal-loading-sub">${_isMatchFinished ? '統計數據 · 比分回顧 · 預測比較' : '比對歷史數據 · 計算勝率 · 生成預測'}</div>
  </div>`;
  modal.classList.add('open');

  // 下一幀再渲染完整內容（讓 loading 畫面先顯示）
  requestAnimationFrame(() => setTimeout(() => {
  try {
  const _T = _teams();
  let m = schedule.find(x => x.id === id);
  if (!m) {
    const parts = id.replace('GS-','').replace('UCL-','').split('-');
    if (parts.length >= 2) m = schedule.find(x => x.home===parts[0] && x.away===parts[1]);
  }
  if (!m || !m.home || !m.away) { console.warn('openPredModal: match not found', id); return; }
  const ht = _T[m.home], at = _T[m.away];
  if (!ht || !at) { console.warn('openPredModal: team not found', m.home, m.away); return; }

  // 判斷是否已解鎖
  const isUnlocked = !!(window.unlockedMatchSet?.has(id));

  const p   = calcPred(ht, at);

  // ── 已完成比賽：顯示賽果 + 數據 + 預測比較 ──────────────
  const isFinished = m.status === 'finished' && m.score;
  if (isFinished) {
    const isUcl = _isUCL();
    const phaseLabel = isUcl
      ? ({league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage]||'')
      : ({group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賽'}[m.phase]||'');
    const matchTag = isUcl
      ? `${phaseLabel}${m.md ? ' MD'+m.md : ''}${m.leg ? ' Leg'+m.leg : ''}`
      : `${GROUPS[m.group]?.name||''} · ${phaseLabel}`;
    const matchTime = isUcl
      ? `🕒 ${(m.date||'').slice(5).replace('-','/')} ${m.time||''}`
      : `🕒 ${m.twDate?.slice(5).replace('-','/')} ${m.twTime} 台灣時間`;
    const matchVenue = isUcl
      ? (m.venue ? `📍 ${m.venue}` : '')
      : `📍 ${m.venue||''}, ${m.city||''}`;
    const hRankLabel = isUcl ? `UEFA 係數 ${ht.uefaCoeff}` : `FIFA #${ht.fifaRank}`;
    const aRankLabel = isUcl ? `UEFA 係數 ${at.uefaCoeff}` : `FIFA #${at.fifaRank}`;

    // 判斷勝負
    const hGoal = m.score.h, aGoal = m.score.a;
    const resultText = hGoal > aGoal ? `${ht.nameCN} 勝` : aGoal > hGoal ? `${at.nameCN} 勝` : '平局';
    const resultColor = hGoal > aGoal ? 'var(--green)' : aGoal > hGoal ? 'var(--red)' : 'var(--text-secondary)';

    // AI 預測 vs 實際結果比較
    const predScore = p.score; // e.g. "2-1"
    const predParts = predScore.split('-').map(s => parseInt(s.trim()));
    const predH = isNaN(predParts[0]) ? 0 : predParts[0];
    const predA = isNaN(predParts[1]) ? 0 : predParts[1];
    const predCorrect = predH === hGoal && predA === aGoal;
    const predOutcome = predH > predA ? 'home' : predA > predH ? 'away' : 'draw';
    const actualOutcome = hGoal > aGoal ? 'home' : aGoal > hGoal ? 'away' : 'draw';
    const outcomeCorrect = predOutcome === actualOutcome;

    // 合計比分 (兩回合)
    const aggHTML = m.agg ? `<div style="font-size:13px;color:var(--text-muted);margin-top:4px">兩回合合計 ${m.agg.h} – ${m.agg.a}</div>` : '';

    // 用戶預測
    const myPreds = (() => { try { return JSON.parse(localStorage.getItem('wc26_my_preds'))||{}; } catch { return {}; } })();
    const mine = myPreds[m.id];


    document.getElementById('modal-content').innerHTML = `
      <!-- 賽事資訊 -->
      <div style="text-align:center;margin-bottom:16px">
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:8px">
          <span class="match-tag" style="background:#4caf50;color:#fff">已結束</span>
          <span class="match-tag group">${matchTag}</span>
          <span class="match-tag">${matchTime}</span>
          ${matchVenue ? `<span class="match-tag">${matchVenue}</span>` : ''}
        </div>
      </div>

      <!-- 比分結果（大字醒目）-->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px">
        <div style="text-align:center;flex:1;min-width:0">
          <div style="font-size:52px;margin-bottom:6px">${flagImg(ht.flag)}</div>
          <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ht.nameCN}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${hRankLabel}</div>
        </div>
        <div style="text-align:center;padding:0 8px;flex-shrink:0">
          <div style="font-size:52px;font-weight:900;color:#fff;letter-spacing:6px">${hGoal} – ${aGoal}</div>
          <div style="font-size:14px;font-weight:700;color:${resultColor};margin-top:4px">${resultText}</div>
          ${aggHTML}
        </div>
        <div style="text-align:center;flex:1;min-width:0">
          <div style="font-size:52px;margin-bottom:6px">${flagImg(at.flag)}</div>
          <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${at.nameCN}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${aRankLabel}</div>
        </div>
      </div>

      <!-- AI 預測 vs 實際結果 -->
      <div style="background:var(--accent-bg);border-radius:12px;padding:16px;margin:20px 0;border:1px solid var(--accent-border)">
        <div style="font-size:14px;font-weight:800;color:var(--accent);margin-bottom:12px;text-align:center">🤖 AI 預測 vs 實際結果</div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;text-align:center">
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">AI 賽前預測</div>
            <div style="font-size:28px;font-weight:900;color:var(--accent)">${predH} – ${predA}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${ht.nameCN}勝率 ${p.hw}%</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted)">vs</div>
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">實際結果</div>
            <div style="font-size:28px;font-weight:900;color:#4caf50">${hGoal} – ${aGoal}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${resultText}</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06)">
          ${predCorrect
            ? '<span style="color:#4caf50;font-weight:700;font-size:13px">🎯 AI 精準命中比分！</span>'
            : outcomeCorrect
              ? '<span style="color:var(--accent);font-weight:700;font-size:13px">✅ AI 成功預測勝負方向</span>'
              : '<span style="color:#ef9a9a;font-weight:700;font-size:13px">❌ AI 預測失誤</span>'
          }
        </div>
      </div>

      <!-- 進球時間線 -->
      ${m.goals && m.goals.length > 0 ? `
      <div style="margin:20px 0">
        <div class="modal-section-title">⚽ 進球紀錄</div>
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:12px">
          ${m.goals.map(g => {
            const isHome = g.side === 'h';
            const teamFlag = isHome ? flagImg(ht.flag) : flagImg(at.flag);
            const typeLabel = g.type === 'pen' ? ' (PK)' : g.type === 'og' ? ' (烏龍球)' : g.type === 'fk' ? ' (自由球)' : '';
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);${isHome ? '' : 'flex-direction:row-reverse;text-align:right'}">
              <div style="min-width:42px;font-size:13px;font-weight:800;color:var(--accent);${isHome ? 'text-align:right' : 'text-align:left'}">${g.min}'</div>
              <div style="font-size:16px">${teamFlag}</div>
              <div style="flex:1;${isHome ? '' : 'text-align:right'}">
                <div style="font-size:13px;font-weight:700;color:var(--text-primary)">${g.player}${typeLabel}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 賽事數據統計（真實數據）-->
      ${m.stats ? `
      <div style="margin:20px 0">
        <div class="modal-section-title">📊 賽事數據</div>
        <div style="background:rgba(255,255,255,0.03);border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
          <div style="display:grid;grid-template-columns:1fr auto 1fr;background:rgba(255,255,255,0.05);padding:10px 16px">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:14px">${flagImg(ht.flag)}</span>
              <span style="font-size:12px;font-weight:700">${ht.nameCN}</span>
            </div>
            <div></div>
            <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
              <span style="font-size:12px;font-weight:700">${at.nameCN}</span>
              <span style="font-size:14px">${flagImg(at.flag)}</span>
            </div>
          </div>
          ${[
            ['控球率', m.stats.poss[0], m.stats.poss[1], '%'],
            ['射門', m.stats.shots[0], m.stats.shots[1], ''],
            ['射正', m.stats.sot[0], m.stats.sot[1], ''],
            ['角球', m.stats.corners[0], m.stats.corners[1], ''],
            ['黃牌', m.stats.yellow[0], m.stats.yellow[1], ''],
            ['撲救', m.stats.saves[0], m.stats.saves[1], '']
          ].map(([label, hVal, aVal, unit]) => `
            <div style="display:grid;grid-template-columns:1fr auto 1fr;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.04)">
              <div style="font-size:15px;font-weight:800;${hVal>aVal?'color:var(--green)':'color:var(--text-secondary)'}">${hVal}${unit}</div>
              <div style="font-size:12px;color:var(--text-muted);text-align:center;min-width:60px">${label}</div>
              <div style="font-size:15px;font-weight:800;text-align:right;${aVal>hVal?'color:var(--green)':'color:var(--text-secondary)'}">${aVal}${unit}</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- 關鍵球員 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        <div class="modal-players-box">
          <div class="modal-players-title">${flagImg(ht.flag)} 關鍵球員</div>
          ${(ht.keyPlayers||[]).slice(0,3).map(pl=>
            `<div class="modal-player-row">
              <span class="modal-player-name">${pl.name}</span>
              <span class="modal-player-pos">${pl.pos}</span>
            </div>`
          ).join('')}
        </div>
        <div class="modal-players-box">
          <div class="modal-players-title">${flagImg(at.flag)} 關鍵球員</div>
          ${(at.keyPlayers||[]).slice(0,3).map(pl=>
            `<div class="modal-player-row">
              <span class="modal-player-name">${pl.name}</span>
              <span class="modal-player-pos">${pl.pos}</span>
            </div>`
          ).join('')}
        </div>
      </div>

      <!-- 數據對比雷達 -->
      <div class="modal-section-title">⚔️ 球隊實力對比</div>
      <div style="margin-bottom:16px">
        ${[
          ['⚔️ 攻擊力', ht.radar.attack, at.radar.attack],
          ['🛡️ 防守力', ht.radar.defense, at.radar.defense],
          ['⚙️ 中場控制', ht.radar.midfield, at.radar.midfield],
          ['💨 速度', ht.radar.speed, at.radar.speed],
          ['🏆 大賽經驗', ht.radar.experience, at.radar.experience]
        ].map(([label, hVal, aVal]) => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px">
              <span style="font-weight:700;color:${hVal>aVal?'var(--green)':'var(--text-secondary)'}">${hVal}</span>
              <span>${label}</span>
              <span style="font-weight:700;color:${aVal>hVal?'var(--green)':'var(--text-secondary)'}">${aVal}</span>
            </div>
            <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,0.07)">
              <div style="width:${hVal/(hVal+aVal)*100}%;background:linear-gradient(90deg,var(--blue),var(--green))"></div>
              <div style="width:${aVal/(hVal+aVal)*100}%;background:linear-gradient(90deg,var(--red),#ff7043)"></div>
            </div>
          </div>`).join('')}
      </div>

      <!-- 你的預測回顧 -->
      ${mine ? `
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,255,255,0.08)">
        <div class="modal-section-title" style="margin-bottom:12px">🎯 你的預測回顧</div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;text-align:center">
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">你的預測</div>
            <div style="font-size:24px;font-weight:900;color:var(--blue)">${mine.h} – ${mine.a}</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted)">vs</div>
          <div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">實際結果</div>
            <div style="font-size:24px;font-weight:900;color:#4caf50">${hGoal} – ${aGoal}</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:10px">
          ${mine.h == hGoal && mine.a == aGoal
            ? '<span style="color:#4caf50;font-weight:700">🎉 恭喜你精準命中！</span>'
            : (mine.h > mine.a && hGoal > aGoal) || (mine.h < mine.a && hGoal < aGoal) || (mine.h == mine.a && hGoal == aGoal)
              ? '<span style="color:var(--accent);font-weight:700">👍 方向正確！</span>'
              : '<span style="color:#ef9a9a;font-weight:700">😅 下次再接再厲</span>'
          }
        </div>
      </div>` : ''}
    `;
    modal.scrollTop = 0;
    return; // 已完成比賽不需要後續的預測/鎖定 UI
  }
  // ── END 已完成比賽 ──────────────────────────────────────

  const pts = generateAnalysis(ht, at, p);
  const hForm = p.hWC ? p.hWC.recentForm : (ht.recentForm||['W','D','W','W','D']);
  const aForm = p.aWC ? p.aWC.recentForm : (at.recentForm||['W','D','W','W','D']);
  const formDots = f => f.map(r=>`<span class="form-dot ${r}" style="width:24px;height:24px;font-size:11px">${r}</span>`).join('');
  const playerList = (t) => (t.keyPlayers||[]).slice(0,3).map(pl=>
    `<div class="modal-player-row">
      <span class="modal-player-name">${pl.name}</span>
      <span class="modal-player-pos">${pl.pos}</span>
    </div>`
  ).join('');
  const radarBar = (label, hVal, aVal) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px">
        <span style="font-weight:700;color:${hVal>aVal?'var(--green)':'var(--text-secondary)'}">${hVal}</span>
        <span>${label}</span>
        <span style="font-weight:700;color:${aVal>hVal?'var(--green)':'var(--text-secondary)'}">${aVal}</span>
      </div>
      <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,0.07)">
        <div style="width:${hVal/(hVal+aVal)*100}%;background:linear-gradient(90deg,var(--blue),var(--green))"></div>
        <div style="width:${aVal/(hVal+aVal)*100}%;background:linear-gradient(90deg,var(--red),#ff7043)"></div>
      </div>
    </div>`;

  const isUcl = _isUCL();
  const phaseLabel = isUcl
    ? ({league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage]||'')
    : ({group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賞'}[m.phase]||'');
  const matchTag = isUcl
    ? `${phaseLabel}${m.md ? ' MD'+m.md : ''}${m.leg ? ' Leg'+m.leg : ''}`
    : `${GROUPS[m.group]?.name||''} · ${phaseLabel}`;
  const matchTime = isUcl
    ? `🕒 ${(m.date||'').slice(5).replace('-','/')} ${m.time||''}`
    : `🕒 ${m.twDate?.slice(5).replace('-','/')} ${m.twTime} 台灣時間`;
  const matchVenue = isUcl
    ? (m.venue ? `📍 ${m.venue}` : '')
    : `📍 ${m.venue||''}, ${m.city||''}`;
  const hRankLabel = isUcl ? `UEFA 係數 ${ht.uefaCoeff}` : `FIFA #${ht.fifaRank}`;
  const aRankLabel = isUcl ? `UEFA 係數 ${at.uefaCoeff}` : `FIFA #${at.fifaRank}`;

  document.getElementById('modal-content').innerHTML = `
    <!-- 頂部：賽事資訊 -->
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">
        <span class="match-tag group">${matchTag}</span>
        <span class="match-tag">${matchTime}</span>
        ${matchVenue ? `<span class="match-tag">${matchVenue}</span>` : ''}
      </div>
    </div>

    <!-- 對陣（免費顯示：旗幟 + 球隊名 + 資訊）-->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:8px">
      <div style="text-align:center;flex:1;min-width:0">
        <div style="font-size:52px;margin-bottom:6px">${flagImg(ht.flag)}</div>
        <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ht.nameCN}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${hRankLabel}</div>
        <div style="font-size:11px;color:var(--text-muted)">${ht.formation}</div>
      </div>
      <div style="text-align:center;padding:0 8px;flex-shrink:0">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">AI 預測比分</div>
        <div style="font-size:44px;font-weight:900;color:var(--accent);letter-spacing:4px;${isUnlocked ? '' : 'filter:blur(10px);user-select:none'}">${p.score}</div>
        <div style="font-size:11px;color:var(--text-muted);margin:4px 0">xG ${p.hXG} — ${p.aXG}</div>
        <div class="confidence-badge confidence-${p.conf}">${p.confLabel}</div>
      </div>
      <div style="text-align:center;flex:1;min-width:0">
        <div style="font-size:52px;margin-bottom:6px">${flagImg(at.flag)}</div>
        <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${at.nameCN}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${aRankLabel}</div>
        <div style="font-size:11px;color:var(--text-muted)">${at.formation}</div>
      </div>
    </div>

    <!-- 免費顯示：關鍵球員 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div class="modal-players-box">
        <div class="modal-players-title">${flagImg(ht.flag)} 關鍵球員</div>
        ${playerList(ht)}
      </div>
      <div class="modal-players-box">
        <div class="modal-players-title">${flagImg(at.flag)} 關鍵球員</div>
        ${playerList(at)}
      </div>
    </div>

    <!-- 鎖定區塊：勝率 + 完整分析 -->
    <div class="pred-lock-container${isUnlocked ? '' : ' locked'}">
      <div class="pred-lock-content">

        <!-- 勝率條 -->
        <div style="margin-bottom:20px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;margin-bottom:6px">
            <div><div style="font-size:22px;font-weight:900;color:var(--green)">${p.hw}%</div><div style="font-size:11px;color:var(--text-muted)">${ht.nameCN} 勝</div></div>
            <div><div style="font-size:22px;font-weight:900;color:var(--text-secondary)">${p.d}%</div><div style="font-size:11px;color:var(--text-muted)">平局</div></div>
            <div><div style="font-size:22px;font-weight:900;color:var(--red)">${p.aw}%</div><div style="font-size:11px;color:var(--text-muted)">${at.nameCN} 勝</div></div>
          </div>
          <div style="display:flex;height:10px;border-radius:5px;overflow:hidden">
            <div style="width:${p.hw}%;background:var(--green)"></div>
            <div style="width:${p.d}%;background:#546e7a"></div>
            <div style="width:${p.aw}%;background:var(--red)"></div>
          </div>
        </div>

        <!-- 數據對比雷達 -->
        <div class="modal-section-title">📊 關鍵數據對比</div>
        <div style="margin-bottom:16px">
          ${radarBar('⚔️ 攻擊力', ht.radar.attack, at.radar.attack)}
          ${radarBar('🛡️ 防守力', ht.radar.defense, at.radar.defense)}
          ${radarBar('⚙️ 中場控制', ht.radar.midfield, at.radar.midfield)}
          ${radarBar('💨 速度', ht.radar.speed, at.radar.speed)}
          ${radarBar('🏆 大賽經驗', ht.radar.experience, at.radar.experience)}
        </div>

        <!-- AI 戰術分析 -->
        <div class="modal-section-title">🤖 AI 戰術分析</div>
        <ul class="pred-key-points" style="margin-bottom:16px">
          ${pts.map(pt=>`<li>${pt}</li>`).join('')}
        </ul>

        <!-- 球隊風格 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px">
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">${flagImg(ht.flag)} ${ht.nameCN} 踢法</div>
            <div style="font-size:12px;color:var(--text-secondary)">${ht.style||''}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--green)">✓ ${(ht.strengths||['整體實力強'])[0]}</div>
            <div style="font-size:12px;color:#ef9a9a">✗ ${(ht.weaknesses||['有待觀察'])[0]}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px">
            <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">${flagImg(at.flag)} ${at.nameCN} 踢法</div>
            <div style="font-size:12px;color:var(--text-secondary)">${at.style||''}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--green)">✓ ${(at.strengths||['整體實力強'])[0]}</div>
            <div style="font-size:12px;color:#ef9a9a">✗ ${(at.weaknesses||['有待觀察'])[0]}</div>
          </div>
        </div>

        <!-- 近期狀態 -->
        <div class="modal-section-title">📈 ${p.wcFormAdj ? '本屆賽中表現（已更新預測）' : '近期狀態（最近5場）'}</div>
        ${p.wcFormAdj ? `<div style="margin-bottom:10px;padding:8px 12px;background:rgba(76,175,80,0.1);border-radius:8px;border-left:3px solid #4caf50;font-size:12px;color:#4caf50">
          ⚡ 預測已根據本屆世界盃實際賽果動態調整
        </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span style="font-size:20px">${flagImg(ht.flag)}</span>${formDots(hForm)}
              <span style="font-size:12px;color:var(--text-muted)">${formScore(hForm)}分</span>
            </div>
            ${p.hWC ? `<div style="font-size:11px;color:var(--text-muted)">
              ${p.hWC.played}場：${p.hWC.win}勝${p.hWC.draw}平${p.hWC.lose}負
              · 進${p.hWC.gf}失${p.hWC.ga}（場均進球 ${p.hWC.gfPerGame}）
            </div>` : ''}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span style="font-size:20px">${flagImg(at.flag)}</span>${formDots(aForm)}
              <span style="font-size:12px;color:var(--text-muted)">${formScore(aForm)}分</span>
            </div>
            ${p.aWC ? `<div style="font-size:11px;color:var(--text-muted)">
              ${p.aWC.played}場：${p.aWC.win}勝${p.aWC.draw}平${p.aWC.lose}負
              · 進${p.aWC.gf}失${p.aWC.ga}（場均進球 ${p.aWC.gfPerGame}）
            </div>` : ''}
          </div>
        </div>

        <!-- 焦點球員對決 -->
        <div style="background:var(--accent-bg);border-radius:10px;padding:14px;border-left:3px solid var(--accent)">
          <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">⚽ 焦點球員對決</div>
          <div style="font-size:13px;color:var(--text-secondary)">
            <strong style="color:var(--text-primary)">${ht.keyPlayers?.[0]?.name||ht.nameCN}</strong>（${ht.keyPlayers?.[0]?.pos||'前鋒'}）
            vs
            <strong style="color:var(--text-primary)">${at.keyPlayers?.[0]?.name||at.nameCN}</strong>（${at.keyPlayers?.[0]?.pos||'前鋒'}）
          </div>
          ${ht.predDesc?`<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">💡 ${ht.predTitle||''}：${ht.predDesc||''}</div>`:''}
        </div>

        <!-- 深度分析解鎖 -->
        <div id="deep-analysis-${m.id}" style="margin-top:16px">
          <div class="deep-analysis-lock">
            <div style="font-size:28px;margin-bottom:8px">🔬</div>
            <div style="font-weight:800;font-size:15px;margin-bottom:6px">深度分析</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:2">
              <div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center">
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">🎯 大小球</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">🔁 讓球盤</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">🅱 雙方進球</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">⛳ 角球數</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">🟨 黃牌數</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">⏱ 半場比分</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">🏥 傷兵狀況</span>
                <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 7px">📋 陣型詳解</span>
              </div>
            </div>
            <button class="pred-unlock-btn" onclick="openDeepAnalysis('${m.id}','${m.home}','${m.away}')">
              <span class="gem-ico" style="width:12px;height:12px"></span>×2 解鎖深度分析
            </button>
          </div>
        </div>

      </div>

      <!-- 鎖定遮罩（未解鎖時顯示）-->
      ${!isUnlocked ? `
      <div class="pred-lock-overlay">
        <div class="pred-lock-box">
          <div style="font-size:32px;margin-bottom:10px">🔒</div>
          <div style="font-size:16px;font-weight:800;margin-bottom:6px">完整 AI 分析</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.7;text-align:center">
            解鎖本場 AI 勝負預測、比分預估<br>與完整數據雷達圖
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:14px">
            <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 8px;font-size:12px">⚽ 預測比分</span>
            <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 8px;font-size:12px">📊 勝平負%</span>
            <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 8px;font-size:12px">📈 數據雷達圖</span>
            <span style="background:rgba(255,255,255,0.07);border-radius:6px;padding:2px 8px;font-size:12px">🧠 AI 分析文字</span>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-bottom:14px;text-align:center">
            🔍 解鎖後可再升級深度分析（大小球、盤口、角球等）
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:16px;font-size:13px;color:rgba(255,255,255,0.5)">
            消耗 <span class="gem-ico" style="width:13px;height:13px"></span> ×${cost} 解鎖
          </div>
          ${currentUser
            ? (!window.firstFreeUsed
              ? `<button class="pred-unlock-btn" style="width:100%;background:linear-gradient(135deg,#43a047,#1b5e20)" onclick="unlockPredModal('${m.id}','first_free')">
                  🎁 首次免費解鎖
                </button>
                <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.3)">每位用戶限一次，之後需消耗寶石</div>`
              : `<button class="pred-unlock-btn" style="width:100%" onclick="unlockPredModal('${m.id}','${spendType}')">
                  解鎖查看分析
                </button>`)
            : `<button class="pred-unlock-btn" onclick="loginWithGoogle();closeModal()" style="width:100%;background:linear-gradient(135deg,#fff,#ddd);color:#222">
                <svg width="14" height="14" viewBox="0 0 24 24" style="flex-shrink:0"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                登入後解鎖
              </button>`
          }
        </div>
      </div>` : ''}
    </div>

    <!-- 你的預測（永遠免費）-->
    ${(()=>{
      const myPreds = (() => { try { return JSON.parse(localStorage.getItem('wc26_my_preds'))||{}; } catch { return {}; } })();
      const mine = myPreds[m.id];
      return `<div class="my-pred-section" id="my-pred-section-${m.id}">
        <div class="modal-section-title" style="margin-top:16px">🎯 你的預測</div>
        ${mine ? `
          <div class="my-pred-result">
            <div class="my-pred-score">${flagImg(ht.flag)} ${mine.h} – ${mine.a} ${flagImg(at.flag)}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px">
              已預測 · ${new Date(mine.savedAt).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
            </div>
            <button class="my-pred-edit-btn" onclick="openMyPredInput('${m.id}','${ht.nameCN}','${at.nameCN}')">修改</button>
          </div>` : `
          <div class="my-pred-prompt">
            <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:10px">你預測這場的比分是？</div>
            <button class="btn-primary" style="width:100%" onclick="openMyPredInput('${m.id}','${ht.nameCN}','${at.nameCN}')">
              ✏️ 填入我的預測
            </button>
          </div>`}
      </div>`;
    })()}`;

  // modal 已在 loading 階段開啟，這裡只捲到頂部
  modal.scrollTop = 0;

  // 若深度分析已解鎖，自動展開（不再消耗寶石）
  if (window.unlockedDeepSet?.has(m.id)) {
    setTimeout(() => openDeepAnalysis(m.id, m.home, m.away), 0)
  }
  } catch(e) {
    console.error('openPredModal error:', e);
    mc.innerHTML = `<div style="padding:30px;text-align:center;color:#ef9a9a">⚠️ 載入預測時發生錯誤：${e.message}</div>`;
  }
  }, 120));
}

// 解鎖後重新渲染 modal
async function unlockPredModal(id, spendType) {
  const ok = await spendGemForMatch?.(id, spendType)
  if (ok) {
    if (!window.unlockedMatchSet) window.unlockedMatchSet = new Set()
    window.unlockedMatchSet.add(id)
    openPredModal(id)
  }
}

document.getElementById('hamburger-btn').addEventListener('click', () => {
  document.getElementById('mobile-nav').classList.toggle('open');
});

// ── 深度分析解鎖 ──────────────────────────────────────────
async function openDeepAnalysis(matchId, homeCode, awayCode) {
  const ok = await unlockDeepAnalysis?.(matchId)
  if (!ok) return

  const _T = _teams();
  const ht = _T[homeCode], at = _T[awayCode]
  if (!ht || !at) return

  const container = document.getElementById(`deep-analysis-${matchId}`)
  if (!container) return

  // ── 重新計算預測數據 ──────────────────────────────────────
  const p = calcPred(ht, at)
  const hXG = parseFloat(p.hXG)
  const aXG = parseFloat(p.aXG)

  // 用預測比分作為盤口計算基礎，確保大小球與比分一致
  const [hGoalsPred, aGoalsPred] = p.score.split('-').map(Number)
  const lambda = hGoalsPred + aGoalsPred

  // Poisson 輔助：P(X=k | λ)
  const pois = (k, lam) => { let r = Math.exp(-lam); for (let i = 1; i <= k; i++) r *= lam / i; return r; }
  const poisCum = (maxK, lam) => { let s = 0; for (let k = 0; k <= maxK; k++) s += pois(k, lam); return s; }

  // ── 大小球機率 ────────────────────────────────────────────
  const pOver15 = Math.round((1 - poisCum(1, lambda)) * 100)
  const pOver25 = Math.round((1 - poisCum(2, lambda)) * 100)
  const pOver35 = Math.round((1 - poisCum(3, lambda)) * 100)

  // ── BTTS（用預測進球數判斷）──────────────────────────────
  const pHomeSc = Math.round((1 - Math.exp(-Math.max(hGoalsPred, hXG))) * 100)
  const pAwaySc = Math.round((1 - Math.exp(-Math.max(aGoalsPred, aXG))) * 100)
  const pBTTS   = Math.round((pHomeSc / 100) * (pAwaySc / 100) * 100)

  // ── 角球預測 ──────────────────────────────────────────────
  const hCorners = Math.round(4.5 + (ht.radar.attack / 100) * 3 + (ht.radar.speed / 100) * 1.5)
  const aCorners = Math.round(4.5 + (at.radar.attack / 100) * 3 + (at.radar.speed / 100) * 1.5)
  const totalCorners = hCorners + aCorners
  const cornerLine = totalCorners >= 12 ? 11.5 : totalCorners >= 10 ? 9.5 : 8.5
  const cornerOverProb = Math.min(95, Math.max(5, Math.round(50 + (totalCorners - cornerLine) * 10)))

  // ── 亞盤讓球 ──────────────────────────────────────────────
  const xgDiff = hXG - aXG
  let handicap, handicapNote
  if      (xgDiff >=  1.3) { handicap = `${ht.nameCN} -1.5`;      handicapNote = '主場強烈優勢' }
  else if (xgDiff >=  0.9) { handicap = `${ht.nameCN} -1 / -1.5`; handicapNote = '主場明顯優勢' }
  else if (xgDiff >=  0.5) { handicap = `${ht.nameCN} -0.5 / -1`; handicapNote = '主場輕微優勢' }
  else if (xgDiff >=  0.2) { handicap = `${ht.nameCN} -0.5`;      handicapNote = '主場小熱' }
  else if (xgDiff >= -0.2) { handicap = '平手盤 (0)';              handicapNote = '勢均力敵' }
  else if (xgDiff >= -0.5) { handicap = `${at.nameCN} -0.5`;      handicapNote = '客場小熱' }
  else if (xgDiff >= -0.9) { handicap = `${at.nameCN} -0.5 / -1`; handicapNote = '客場輕微優勢' }
  else if (xgDiff >= -1.3) { handicap = `${at.nameCN} -1 / -1.5`; handicapNote = '客場明顯優勢' }
  else                     { handicap = `${at.nameCN} -1.5`;       handicapNote = '客場強烈優勢' }

  // ── 上半場走向 ────────────────────────────────────────────
  const htHW = Math.round(p.hw * 0.60)
  const htAW = Math.round(p.aw * 0.60)
  const htD  = Math.max(5, 100 - htHW - htAW)
  const htLambda = lambda * 0.45
  const htOver05 = Math.round((1 - poisCum(0, htLambda)) * 100)
  const htOver15 = Math.round((1 - poisCum(1, htLambda)) * 100)

  // ── 黃牌預測 ──────────────────────────────────────────────
  const hCards = Math.max(1, Math.round(1.5 + (ht.radar.defense / 100) * 1.5 - (ht.radar.midfield / 100) * 0.8))
  const aCards = Math.max(1, Math.round(1.5 + (at.radar.defense / 100) * 1.5 - (at.radar.midfield / 100) * 0.8))
  const totalCards = hCards + aCards
  const cardsLine  = totalCards >= 5 ? 4.5 : 3.5
  const cardsOverProb = Math.min(95, Math.max(5, Math.round(50 + (totalCards - cardsLine) * 12)))

  // ── 歷史交手 + 傷兵 ───────────────────────────────────────
  const h2h = ht.h2h?.[awayCode] || { played: '—', wins: '—', draws: '—', losses: '—', gf: '—', ga: '—' }
  const hInjuries = (ht.injuries || []).slice(0, 3)
  const aInjuries = (at.injuries || []).slice(0, 3)

  // 機率條輔助
  const probBar = (prob, color) => `<div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.07);overflow:hidden;margin-top:4px"><div style="width:${prob}%;height:100%;background:${color};border-radius:3px"></div></div>`
  const pColor  = (prob) => prob >= 55 ? 'var(--green)' : 'var(--red)'

  container.innerHTML = `
    <div class="modal-section-title">🔬 深度分析</div>

    <!-- ── 盤口分析 ── -->
    <div class="modal-section-title" style="margin-top:4px;font-size:12px;letter-spacing:1px">🎰 盤口分析</div>

    <!-- 大小球 -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">⚽ 大小球（Poisson 模型）</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">預測比分 ${p.score}（總進球 <strong style="color:var(--text-primary)">${lambda}</strong>）· xG ${hXG}–${aXG}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        ${[['大 1.5', pOver15], ['大 2.5', pOver25], ['大 3.5', pOver35]].map(([label, prob]) => `
          <div style="text-align:center;background:rgba(255,255,255,0.03);border-radius:8px;padding:10px 8px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${label}</div>
            <div style="font-size:22px;font-weight:900;color:${pColor(prob)}">${prob}%</div>
            ${probBar(prob, pColor(prob))}
          </div>`).join('')}
      </div>
    </div>

    <!-- BTTS + 亞盤 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">🥅 兩隊都進球</div>
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:900;color:${pColor(pBTTS)}">${pBTTS}%</div>
          <div style="font-size:11px;color:var(--text-muted);margin:4px 0">${pBTTS >= 55 ? '較可能發生' : '較不可能'}</div>
          ${probBar(pBTTS, pColor(pBTTS))}
          <div style="font-size:10px;color:var(--text-muted);margin-top:6px">${flagImg(ht.flag)} ${pHomeSc}% · ${flagImg(at.flag)} ${pAwaySc}%</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">⚖️ 亞盤讓球</div>
        <div style="text-align:center">
          <div style="font-size:14px;font-weight:900;color:var(--text-primary);line-height:1.5">${handicap}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${handicapNote}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px">xG差：${xgDiff >= 0 ? '+' : ''}${xgDiff.toFixed(2)}</div>
        </div>
      </div>
    </div>

    <!-- 角球 + 黃牌 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">🚩 角球預測</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">${flagImg(ht.flag)}</div>
            <div style="font-size:22px;font-weight:800">${hCorners}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">合計</div>
            <div style="font-size:22px;font-weight:800;color:var(--accent)">${totalCorners}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">${flagImg(at.flag)}</div>
            <div style="font-size:22px;font-weight:800">${aCorners}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:center">盤口 ${cornerLine} 建議<strong style="color:${pColor(cornerOverProb)}">${cornerOverProb >= 55 ? '大' : '小'}</strong>（${cornerOverProb}%）</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">🟨 黃牌預測</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">${flagImg(ht.flag)}</div>
            <div style="font-size:22px;font-weight:800">${hCards}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">合計</div>
            <div style="font-size:22px;font-weight:800;color:#ffd54f">${totalCards}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:11px;color:var(--text-muted)">${flagImg(at.flag)}</div>
            <div style="font-size:22px;font-weight:800">${aCards}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:center">盤口 ${cardsLine} 建議<strong style="color:${pColor(cardsOverProb)}">${cardsOverProb >= 55 ? '大' : '小'}</strong>（${cardsOverProb}%）</div>
      </div>
    </div>

    <!-- 上半場分析 -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">⏱️ 上半場走向</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;margin-bottom:10px">
        <div><div style="font-size:18px;font-weight:900;color:var(--green)">${htHW}%</div><div style="font-size:11px;color:var(--text-muted)">${ht.nameCN} 領先</div></div>
        <div><div style="font-size:18px;font-weight:900;color:var(--text-secondary)">${htD}%</div><div style="font-size:11px;color:var(--text-muted)">平手</div></div>
        <div><div style="font-size:18px;font-weight:900;color:var(--red)">${htAW}%</div><div style="font-size:11px;color:var(--text-muted)">${at.nameCN} 領先</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">上半場大 0.5</div>
          <div style="font-size:18px;font-weight:800;color:${pColor(htOver05)}">${htOver05}%</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">上半場大 1.5</div>
          <div style="font-size:18px;font-weight:800;color:${pColor(htOver15)}">${htOver15}%</div>
        </div>
      </div>
    </div>

    <!-- ── 歷史 / 傷兵 / 陣型 ── -->
    <div class="modal-section-title" style="margin-top:4px;font-size:12px;letter-spacing:1px">📋 球隊資料</div>

    <!-- 歷史交手 -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:10px">⚔️ 歷史交手紀錄</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px">
        <div><div style="font-size:20px;font-weight:800;color:var(--green)">${h2h.wins ?? '—'}</div><div style="font-size:11px;color:var(--text-muted)">${ht.nameCN} 勝</div></div>
        <div><div style="font-size:20px;font-weight:800;color:var(--text-secondary)">${h2h.draws ?? '—'}</div><div style="font-size:11px;color:var(--text-muted)">平局</div></div>
        <div><div style="font-size:20px;font-weight:800;color:var(--red)">${h2h.losses ?? '—'}</div><div style="font-size:11px;color:var(--text-muted)">${at.nameCN} 勝</div></div>
      </div>
      ${h2h.played !== '—' ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px">共 ${h2h.played} 場 · ${ht.nameCN} ${h2h.gf} : ${h2h.ga} ${at.nameCN}</div>` : '<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:8px">歷史交手資料待更新</div>'}
    </div>

    <!-- 傷兵 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">${flagImg(ht.flag)} 傷兵名單</div>
        ${hInjuries.length ? hInjuries.map(pl => `<div style="font-size:12px;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="color:#ef9a9a">⚕</span> ${pl.name} <span style="color:var(--text-muted);font-size:11px">${pl.pos}</span></div>`).join('') : '<div style="font-size:12px;color:var(--text-muted)">暫無傷兵資料</div>'}
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px">${flagImg(at.flag)} 傷兵名單</div>
        ${aInjuries.length ? aInjuries.map(pl => `<div style="font-size:12px;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><span style="color:#ef9a9a">⚕</span> ${pl.name} <span style="color:var(--text-muted);font-size:11px">${pl.pos}</span></div>`).join('') : '<div style="font-size:12px;color:var(--text-muted)">暫無傷兵資料</div>'}
      </div>
    </div>

    <!-- 陣型詳解 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">${flagImg(ht.flag)} ${ht.formation}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${ht.formationDesc || ht.style || '陣型詳解待更新'}</div>
        ${ht.strengths?.length ? `<div style="margin-top:8px;font-size:11px;color:var(--green)">✓ ${ht.strengths[0]}</div>` : ''}
        ${ht.strengths?.[1] ? `<div style="font-size:11px;color:var(--green)">✓ ${ht.strengths[1]}</div>` : ''}
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
        <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:6px">${flagImg(at.flag)} ${at.formation}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${at.formationDesc || at.style || '陣型詳解待更新'}</div>
        ${at.strengths?.length ? `<div style="margin-top:8px;font-size:11px;color:var(--green)">✓ ${at.strengths[0]}</div>` : ''}
        ${at.strengths?.[1] ? `<div style="font-size:11px;color:var(--green)">✓ ${at.strengths[1]}</div>` : ''}
      </div>
    </div>`
}

// 動態預測計算
// 近期狀態分數 (W=3, D=1, L=0)
function formScore(form) {
  return (form||['W','D','W','D','W']).reduce((s,r)=>s+(r==='W'?3:r==='D'?1:0),0);
}

// ── 賽中狀態表（由 _liveStandings 建立，世界盃期間自動更新）─────
// 結構：{ 'teamName': { played, win, draw, lose, gf, ga, gd, pts, formFactor } }
// formFactor > 1 = 超越預期；< 1 = 低於預期；= 1 = 符合預期（賽前）
let _wcFormMap = {};

function buildTournamentForm() {
  if (!window._liveStandings || !window._liveStandings.length) return;

  // 建立 teamName → teamCode 映射
  const nameToCode = {};
  Object.entries(TEAMS).forEach(([code, t]) => {
    nameToCode[t.name]   = code;
    nameToCode[t.nameCN] = code;
  });

  _wcFormMap = {};
  window._liveStandings.forEach(group => {
    group.forEach(entry => {
      if (!entry.played) return; // 還沒踢過，不計入
      const code = nameToCode[entry.teamName];
      if (!code) return;

      // 積分率：實際積分 / 理論最高積分（全勝）
      const ptRate = entry.points / (entry.played * 3);
      // 場均得失球差
      const gdPerGame = entry.goalsDiff / entry.played;
      // 進球率（場均進球）
      const gfPerGame = entry.goalsFor / entry.played;

      // formFactor：0.75 ~ 1.35
      // ptRate 0=全敗→0.75, 0.33=全平→1.0, 1.0=全勝→1.35
      // gdPerGame 加成：每場均差 +1 → +0.06
      const formFactor = Math.max(0.75, Math.min(1.35,
        0.75 + ptRate * 0.6 + gdPerGame * 0.06
      ));

      // 把近期表現轉換為 recentForm 陣列（給 formScore 用）
      const syntheticForm = [];
      for (let i = 0; i < entry.win;  i++) syntheticForm.push('W');
      for (let i = 0; i < entry.draw; i++) syntheticForm.push('D');
      for (let i = 0; i < entry.lose; i++) syntheticForm.push('L');
      // 最多取最近 5 場（後面的是最新的）
      const recentForm = syntheticForm.slice(-5);

      _wcFormMap[code] = {
        played: entry.played,
        win: entry.win, draw: entry.draw, lose: entry.lose,
        gf: entry.goalsFor, ga: entry.goalsAgainst,
        gd: entry.goalsDiff, pts: entry.points,
        formFactor,
        recentForm,
        gfPerGame: gfPerGame.toFixed(2)
      };
    });
  });
}

function calcPred(ht, at) {
  const ha = ht.radar, aa = at.radar;

  // 用球隊名稱產生確定性種子，確保同場比賽永遠顯示相同預測
  const seed = Array.from(ht.nameCN+at.nameCN).reduce((s,c)=>s+c.charCodeAt(0),0) % 97;

  // 取得賽中狀態（有則用實際，無則用靜態）
  const hWC = _wcFormMap[ht.code] || null;
  const aWC = _wcFormMap[at.code] || null;
  const wcFormAdj = !!(hWC || aWC); // 是否有賽中資料

  const hForm = hWC ? hWC.recentForm : (ht.recentForm || ['W','D','W','D','W']);
  const aForm = aWC ? aWC.recentForm : (at.recentForm || ['W','D','W','D','W']);

  // 進攻效率 vs 對方防守
  const homeXG = ((ha.attack/100)*2.4) * (1 - aa.defense/220) * (1 + (ha.speed-70)*0.003) * (1 + (formScore(hForm)-9)*0.04);
  const awayXG = ((aa.attack/100)*2.0) * (1 - ha.defense/220) * (1 + (aa.speed-70)*0.003) * (1 + (formScore(aForm)-9)*0.04);

  // 中場優勢調整
  const midAdv = (ha.midfield - aa.midfield) * 0.004;
  let hXG = Math.max(0.2, Math.min(3.5, homeXG + midAdv));
  let aXG = Math.max(0.2, Math.min(3.0, awayXG - midAdv));

  // ── 賽中狀態修正（世界盃期間）────────────────────────────
  // 用 formFactor 直接縮放 xG：狀態好的隊進球力提升，差的降低
  if (hWC) hXG = Math.max(0.2, Math.min(3.8, hXG * hWC.formFactor));
  if (aWC) aXG = Math.max(0.2, Math.min(3.3, aXG * aWC.formFactor));

  // 勝負平機率（依xG差距）
  const xgDiff = hXG - aXG;
  let hw, d, aw;
  if      (xgDiff >  1.2) { hw=68; d=20; aw=12; }
  else if (xgDiff >  0.7) { hw=58; d=24; aw=18; }
  else if (xgDiff >  0.3) { hw=48; d=28; aw=24; }
  else if (xgDiff > -0.3) { hw=36; d=32; aw=32; }
  else if (xgDiff > -0.7) { hw=24; d=28; aw=48; }
  else if (xgDiff > -1.2) { hw=18; d=24; aw=58; }
  else                    { hw=12; d=20; aw=68; }

  // 排名/係數修正
  let rankAdj, rankGap;
  if (_isUCL()) {
    // 歐冠：用 UEFA 係數差（正值=主隊強，係數越高越強）
    const coeffDiff = (ht.uefaCoeff||50) - (at.uefaCoeff||50);
    rankAdj = Math.min(20, Math.max(-20, coeffDiff * 0.15));
    rankGap = Math.abs(coeffDiff);
  } else {
    // 世界盃：FIFA 排名（排名越低=越強，所以用客隊-主隊）
    rankAdj = Math.min(25, Math.max(-25, (at.fifaRank - ht.fifaRank) * 0.35));
    rankGap = Math.abs(ht.fifaRank - at.fifaRank);
  }
  hw = Math.min(88, Math.max(6, Math.round(hw + rankAdj)));
  aw = Math.min(88, Math.max(6, Math.round(aw - rankAdj)));
  d  = Math.max(6, 100 - hw - aw);

  // 先確定勝/平/負結果
  const outcome = hw > aw && hw > d ? 'home' : aw > hw && aw > d ? 'away' : 'draw';

  // ── 比分換算 ──
  const winnerProb = outcome === 'home' ? hw : outcome === 'away' ? aw : d;

  // 放大係數：勝率越高 → 比分差越懸殊（新增 80%+ 和 86%+ 超高倍率）
  const scoreMult = winnerProb >= 86 ? 2.2
                  : winnerProb >= 80 ? 1.85
                  : winnerProb >= 72 ? 1.55
                  : winnerProb >= 64 ? 1.3
                  : winnerProb >= 56 ? 1.12
                  : 1.0;

  // 排名差距加成（排名差越大 → 強隊進球數越多）
  // 參考：德8-0沙(差108)、西7-0哥(差57)
  const mismatchBonus = rankGap >= 100 ? 2.0
                      : rankGap >=  80 ? 1.4
                      : rankGap >=  60 ? 0.9
                      : rankGap >=  40 ? 0.45
                      : 0;

  const hScoreXG = hXG * scoreMult + (outcome === 'home' ? mismatchBonus : 0);
  const aScoreXG = aXG * scoreMult + (outcome === 'away' ? mismatchBonus : 0);

  const hMode = seed % 3;
  const aMode = (seed + 5) % 3;
  let hGoals = Math.max(0, hMode===0 ? Math.floor(hScoreXG) : hMode===2 ? Math.ceil(hScoreXG) : Math.round(hScoreXG));
  let aGoals = Math.max(0, aMode===0 ? Math.floor(aScoreXG) : aMode===2 ? Math.ceil(aScoreXG) : Math.round(aScoreXG));

  if (outcome === 'home') {
    if (hGoals <= aGoals) { aGoals = Math.max(0, hGoals - 1); if (hGoals === 0) hGoals = 1; }
  } else if (outcome === 'away') {
    if (aGoals <= hGoals) { hGoals = Math.max(0, aGoals - 1); if (aGoals === 0) aGoals = 1; }
  } else {
    const eq = Math.round((hScoreXG + aScoreXG) / 2);
    hGoals = eq; aGoals = eq;
  }
  // 上限提高至 8（反映真實世界盃大比分，但加上隨機因子避免全部預測最大值）
  const goalCap = rankGap >= 80 ? 8 : rankGap >= 50 ? 6 : 5;
  hGoals = Math.min(goalCap, hGoals);
  aGoals = Math.min(goalCap, aGoals);

  const conf = Math.abs(hw-aw) >= 28 ? 'high' : Math.abs(hw-aw) >= 14 ? 'medium' : 'low';
  const confLabel = conf==='high'?'高信心':conf==='medium'?'中信心':'低信心';

  return {
    hw, d, aw,
    score:`${hGoals}-${aGoals}`,
    hXG: hXG.toFixed(1), aXG: aXG.toFixed(1),
    conf, confLabel, seed,
    wcFormAdj,          // 是否套用賽中狀態
    hWC, aWC            // 各隊賽中資料（供 modal 顯示）
  };
}

// 針對每對球隊產生獨立的深度分析文字
function generateAnalysis(ht, at, pred) {
  const ha = ht.radar, aa = at.radar;
  const lines = [];

  // 戰術匹配分析
  const atkDiff  = ha.attack  - aa.defense;
  const defDiff  = ha.defense - aa.attack;
  const midDiff  = ha.midfield- aa.midfield;
  const spdDiff  = ha.speed   - aa.speed;

  if (atkDiff > 18)
    lines.push(`${ht.nameCN} 攻擊指數（${ha.attack}）對比 ${at.nameCN} 防守（${aa.defense}），進攻方擁有明顯優勢，預計前場創造大量機會`);
  else if (atkDiff < -12)
    lines.push(`${at.nameCN} 防守組織嚴謹（${aa.defense}），能有效壓制 ${ht.nameCN} 的進攻（${ha.attack}），預計比賽偏向低比分`);
  else
    lines.push(`雙方攻守指數接近（${ht.nameCN} 攻${ha.attack} vs ${at.nameCN} 防${aa.defense}），比賽懸念持續到最後`);

  if (midDiff > 12)
    lines.push(`${ht.nameCN} 中場控制力（${ha.midfield}）大幅優於對手（${aa.midfield}），將主導持球與節奏，讓 ${at.nameCN} 疲於奔命`);
  else if (midDiff < -12)
    lines.push(`${at.nameCN} 中場更強（${aa.midfield} vs ${ha.midfield}），預計 ${at.nameCN} 掌控比賽大部分時間`);
  else
    lines.push(`中場較量勢均力敵（${ha.midfield} vs ${aa.midfield}），雙方都依賴個別球員的靈光一閃打破僵局`);

  if (spdDiff > 12)
    lines.push(`${ht.nameCN} 速度優勢（${ha.speed} vs ${aa.speed}）在反擊中尤為致命，${at.nameCN} 後防線須特別注意身後空間`);
  else if (spdDiff < -12)
    lines.push(`${at.nameCN} 速度更快（${aa.speed} vs ${ha.speed}），反擊時段是 ${at.nameCN} 的最大威脅`);

  if (defDiff > 10)
    lines.push(`${ht.nameCN} 後防相對穩固（${ha.defense}），面對 ${at.nameCN} 的進攻（${aa.attack}）應能限制失球`);

  // 大賽經驗
  if (ha.experience - aa.experience > 15)
    lines.push(`大賽經驗差距顯著（${ha.experience} vs ${aa.experience}），${ht.nameCN} 在高壓淘汰賽場面更為冷靜老練`);
  else if (aa.experience - ha.experience > 15)
    lines.push(`${at.nameCN} 大賽經驗更豐富（${aa.experience} vs ${ha.experience}），關鍵時刻更能把握機會`);

  // 近期狀態
  const hForm = ht.recentForm||['W','D','W','W','D'];
  const aForm = at.recentForm||['W','D','W','W','D'];
  const hFS = formScore(hForm), aFS = formScore(aForm);
  if (hFS > aFS + 3)
    lines.push(`近期狀態 ${ht.nameCN}（${hForm.join('')}，${hFS}分）明顯優於 ${at.nameCN}（${aForm.join('')}，${aFS}分），士氣與信心是關鍵加分`);
  else if (aFS > hFS + 3)
    lines.push(`${at.nameCN} 近期狀態更佳（${aForm.join('')}，${aFS}分 vs ${hFS}分），來勢洶洶不可小覷`);
  else
    lines.push(`雙方近期狀態相當（${ht.nameCN} ${hFS}分 / ${at.nameCN} ${aFS}分），心理素質將是決勝關鍵`);

  // 比賽走向
  if (pred.hw >= 58)
    lines.push(`預測走向：${ht.nameCN} 從開場就掌控節奏，${at.nameCN} 以守反擊，但最終難擋 ${ht.nameCN} 的進攻效率`);
  else if (pred.aw >= 58)
    lines.push(`預測走向：${at.nameCN} 以高效進攻突破防線，${ht.nameCN} 雖努力追趕，但客隊實力今日更勝一籌`);
  else if (pred.d >= 28)
    lines.push(`預測走向：雙方防守謹慎，比賽節奏偏慢，定位球或個人靈感可能是唯一破門機會`);
  else
    lines.push(`預測走向：比賽預計膠著，雙方均有機會，任何細節失誤都可能決定勝負`);

  return lines;
}

function closeModal() {
  document.getElementById('team-modal').classList.remove('open');
}

// ── 首頁 Hero 區塊切換 ──────────────────────────────────
function updateHero() {
  const isUcl = _isUCL();
  const badge = document.getElementById('hero-badge');
  const title = document.getElementById('hero-title');
  const desc  = document.getElementById('hero-desc');
  const date  = document.getElementById('countdown-date');
  const stats = document.getElementById('hero-stats');
  const label = document.querySelector('.countdown-label');
  if (badge) badge.textContent = isUcl ? '🏆 UEFA CHAMPIONS LEAGUE 2025/26' : '🏆 2026 FIFA WORLD CUP';
  if (title) title.innerHTML   = isUcl ? '歐冠<br><span class="hero-highlight">預測分析平台</span>' : '世界盃<br><span class="hero-highlight">預測分析平台</span>';
  if (desc)  desc.textContent  = isUcl ? '結合AI數據分析，帶你深入解讀2025/26歐冠聯賽每一場對決' : '結合AI數據分析與專家洞察，帶你深入解讀2026美加墨世界盃每一場賽事';
  if (date)  date.textContent  = isUcl ? '2025年9月17日 開幕 · 歐洲各地' : '2026年6月11日 開幕 · 美國 / 加拿大 / 墨西哥';
  if (label) label.textContent = isUcl ? '歐冠賽季進行中' : '距離開幕還有';
  if (stats) stats.innerHTML   = isUcl
    ? `<div class="hero-stat"><span class="hero-stat-num">36</span><span class="hero-stat-label">參賽球會</span></div>
       <div class="hero-stat"><span class="hero-stat-num">189</span><span class="hero-stat-label">場比賽</span></div>
       <div class="hero-stat"><span class="hero-stat-num">8</span><span class="hero-stat-label">聯賽輪次</span></div>
       <div class="hero-stat"><span class="hero-stat-num">QF</span><span class="hero-stat-label">目前階段</span></div>`
    : `<div class="hero-stat"><span class="hero-stat-num">48</span><span class="hero-stat-label">參賽球隊</span></div>
       <div class="hero-stat"><span class="hero-stat-num">104</span><span class="hero-stat-label">場比賽</span></div>
       <div class="hero-stat"><span class="hero-stat-num">16</span><span class="hero-stat-label">比賽場館</span></div>
       <div class="hero-stat"><span class="hero-stat-num">39</span><span class="hero-stat-label">比賽天數</span></div>`;
}

// 倒計時
(function countdown() {
  function tick() {
    const isUcl = _isUCL();
    const target = isUcl
      ? new Date('2025-09-17T21:00:00+02:00')  // UCL 2025/26 開幕
      : new Date('2026-06-11T19:00:00-06:00');   // WC 2026 開幕
    const diff = target - Date.now();
    const openLabel = isUcl ? '🏆 歐冠賽季進行中！' : '🏆 世界盃已開幕！';
    if (diff <= 0) { document.querySelector('.countdown-container').innerHTML = `<div class="countdown-label">${openLabel}</div>`; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    document.getElementById('cd-days').textContent  = String(d).padStart(2,'0');
    document.getElementById('cd-hours').textContent = String(h).padStart(2,'0');
    document.getElementById('cd-mins').textContent  = String(m).padStart(2,'0');
    document.getElementById('cd-secs').textContent  = String(s).padStart(2,'0');
  }
  tick(); setInterval(tick, 1000);
})();

// 賽程頁
function renderSchedule(phaseFilter, groupFilter) {
  const el = document.getElementById('schedule-list');
  if (!el) return;
  const _T = _teams();

  if (_isUCL()) {
    // ── 歐冠賽程 ──
    const stageFilter = phaseFilter || 'all'; // reuse phaseFilter for stage
    let list = UCL_MATCHES.filter(m => {
      if (stageFilter !== 'all' && m.stage !== stageFilter) return false;
      if (groupFilter && groupFilter !== 'all') {
        // groupFilter reused as matchday filter for league stage
        if (m.stage === 'league' && m.md && 'md'+m.md !== groupFilter) return false;
      }
      return true;
    }).sort((a, b) => (a.date+a.time) < (b.date+b.time) ? -1 : 1);

    if (!list.length) { el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">暫無賽事資料</div>'; return; }

    // 更新篩選器 UI（歐冠專用）
    _renderUCLFilters();

    let lastDate = '';
    el.innerHTML = list.map(m => {
      let header = '';
      if (m.date && m.date !== lastDate) {
        lastDate = m.date;
        const d = new Date(m.date);
        const days = ['日','一','二','三','四','五','六'];
        header = `<div class="schedule-day-header">📅 ${m.date.replace(/-/g,'/')} （週${days[d.getDay()]}）</div>`;
      }
      if (!m.home || m.home === 'TBD') {
        const stageLabel = {league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage]||'';
        return header + `<div class="match-card" style="justify-content:center;grid-template-columns:1fr">
          <div style="text-align:center">
            <div style="font-size:16px;font-weight:700;color:var(--accent)">${stageLabel} — 待定</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:6px">🕒 ${m.date?.slice(5).replace('-','/')||''} ${m.time||''}${m.venue ? ' · 📍 '+m.venue : ''}</div>
          </div></div>`;
      }
      const ht = _T[m.home], at = _T[m.away];
      if (!ht || !at) return header;
      const stageLabel = {league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage]||'';
      const scoreDisplay = m.status === 'finished' && m.score ? `<div class="match-vs" style="font-size:20px;font-weight:800">${m.score.h} - ${m.score.a}</div>` : `<div class="match-vs">VS</div>`;
      const aggText = m.agg ? `<div style="font-size:11px;color:var(--text-muted)">總比分 ${m.agg.h}-${m.agg.a}</div>` : '';
      return header + `<div class="match-card" onclick="openPredModal('${m.id}')">
        <div class="match-team">
          <div class="match-team-flag">${flagImg(ht.flag)}</div>
          <div><div class="match-team-name">${ht.nameCN}</div><div class="match-team-sub">${ht.league}</div></div>
        </div>
        <div class="match-center">
          ${scoreDisplay}
          ${aggText}
          <div class="match-time">${m.time||''}</div>
          <div class="match-date">${m.date?.slice(5).replace('-','/')||''}</div>
          <div class="match-meta">
            <span class="match-tag group">${stageLabel}${m.md ? ' MD'+m.md : ''}${m.leg ? ' Leg'+m.leg : ''}</span>
          </div>
        </div>
        <div class="match-team away">
          <div class="match-team-flag">${flagImg(at.flag)}</div>
          <div><div class="match-team-name">${at.nameCN}</div><div class="match-team-sub">${at.league}</div></div>
        </div>
      </div>`;
    }).join('');
    return;
  }

  // ── 世界盃賽程（原邏輯）──
  let list = SCHEDULE.filter(m => {
    if (phaseFilter && phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
    if (groupFilter && groupFilter !== 'all' && m.group !== groupFilter) return false;
    return true;
  }).sort((a, b) => {
    const ka = (a.twDate || '') + (a.twTime || '');
    const kb = (b.twDate || '') + (b.twTime || '');
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  if (!list.length) { el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">暫無賽事資料</div>'; return; }
  let lastDate = '';
  el.innerHTML = list.map(m => {
    let header = '';
    if (m.twDate && m.twDate !== lastDate) {
      lastDate = m.twDate;
      const d = new Date(m.twDate);
      const days = ['日','一','二','三','四','五','六'];
      header = `<div class="schedule-day-header">📅 ${m.twDate.replace(/-/g,'/')} （週${days[d.getDay()]}）</div>`;
    }
    if (!m.home) {
      return header + `<div class="match-card" style="justify-content:center;grid-template-columns:1fr">
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--accent)">${m.label||'待定'}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:6px">🕒 ${m.twDate?.slice(5).replace('-','/')||''} ${m.twTime||''} 台灣時間 · 📍 ${m.venue||''}</div>
        </div></div>`;
    }
    const ht = TEAMS[m.home], at = TEAMS[m.away];
    if (!ht || !at) return header;
    const p = calcPred(ht, at);
    const phaseLabel = {group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賽'}[m.phase]||'';
    return header + `<div class="match-card" onclick="openPredModal('${m.id}')">
      <div class="match-team">
        <div class="match-team-flag">${flagImg(ht.flag)}</div>
        <div><div class="match-team-name">${ht.nameCN}</div><div class="match-team-sub">FIFA #${ht.fifaRank}</div></div>
      </div>
      <div class="match-center">
        <div class="match-vs">VS</div>
        <div class="match-time">${m.twTime} 台灣時間</div>
        <div class="match-date">${m.twDate?.slice(5).replace('-','/')||''}</div>
        <div class="match-meta">
          <span class="match-tag group">${GROUPS[m.group]?.name||''} MD${m.matchday}</span>
          <span class="match-tag">${phaseLabel}</span>
        </div>
      </div>
      <div class="match-team away">
        <div class="match-team-flag">${flagImg(at.flag)}</div>
        <div><div class="match-team-name">${at.nameCN}</div><div class="match-team-sub">FIFA #${at.fifaRank}</div></div>
      </div>
    </div>`;
  }).join('');
}

// 歐冠賽程篩選器
function _renderUCLFilters() {
  const phaseEl = document.getElementById('phase-filter');
  const groupEl = document.getElementById('group-filter');
  if (phaseEl) {
    phaseEl.innerHTML = ['all','league','playoff','r16','qf','sf','final'].map(s => {
      const label = {all:'全部',league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[s];
      return `<button class="filter-tab${s==='all'?' active':''}" data-phase="${s}">${label}</button>`;
    }).join('');
  }
  if (groupEl) {
    groupEl.innerHTML = '<button class="filter-tab active" data-group="all">全部比賽日</button>' +
      [1,2,3,4,5,6,7,8].map(d => `<button class="filter-tab" data-group="md${d}">MD${d}</button>`).join('');
  }
}

// 球隊頁
function renderTeams(confFilter, search) {
  const el = document.getElementById('teams-grid');
  if (!el) return;
  const _T = _teams();

  if (_isUCL()) {
    // 更新篩選器為 Pot
    _renderUCLTeamFilters();
    let list = Object.entries(_T).filter(([code, t]) => {
      if (confFilter && confFilter !== 'all' && 'pot'+t.pot !== confFilter) return false;
      if (search && !t.nameCN.includes(search) && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    el.innerHTML = list.map(([code, t]) => `
      <div class="team-card" onclick="openTeamModal('${code}')">
        <div class="team-card-flag">${flagImg(t.flag)}</div>
        <div class="team-card-name">${t.nameCN}</div>
        <div class="team-card-conf">${t.league}</div>
        <div class="team-card-rank">UEFA 係數 ${t.uefaCoeff}</div>
        <div class="team-card-group">第${t.pot}檔</div>
      </div>`).join('');
    return;
  }

  let list = Object.entries(_T).filter(([code, t]) => {
    if (confFilter && confFilter !== 'all' && t.conf !== confFilter) return false;
    if (search && !t.nameCN.includes(search) && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  el.innerHTML = list.map(([code, t]) => `
    <div class="team-card" onclick="openTeamModal('${code}')">
      <div class="team-card-flag">${flagImg(t.flag)}</div>
      <div class="team-card-name">${t.nameCN}</div>
      <div class="team-card-conf">${CONF_LABELS[t.conf]||t.conf}</div>
      <div class="team-card-rank">FIFA 排名 #${t.fifaRank}</div>
      <div class="team-card-group">${GROUPS[t.group]?.name||''}</div>
    </div>`).join('');
}

function _renderUCLTeamFilters() {
  const confEl = document.getElementById('conf-filter');
  if (confEl) {
    confEl.innerHTML = ['all','pot1','pot2','pot3','pot4'].map(p => {
      const label = p === 'all' ? '全部' : '第' + p.slice(3) + '檔';
      return `<button class="filter-tab${p==='all'?' active':''}" data-conf="${p}">${label}</button>`;
    }).join('');
  }
}

// 數據頁
function renderStats(tab) {
  const el = document.getElementById('stats-content');
  if (!el) return;

  if (_isUCL() && tab === 'standings') {
    // 歐冠：聯賽階段完整積分表
    const standings = window.calcUCLStandings?.() || [];
    const _T = _teams();
    const rows = standings.map((row, i) => {
      const t = _T[row.code];
      if (!t) return '';
      const zone = i < 8 ? 'standings-qualify' : i < 24 ? '' : 'standings-elim';
      return `<tr class="${zone}">
        <td class="standings-pos">${i+1}</td>
        <td>${flagImg(t.flag)} ${t.nameCN}</td>
        <td>${row.mp}</td><td>${row.w}</td><td>${row.d}</td><td>${row.l}</td>
        <td>${row.gf}</td><td>${row.ga}</td><td>${row.gd>0?'+':''}${row.gd}</td>
        <td><strong>${row.pts}</strong></td>
      </tr>`;
    }).join('');
    el.innerHTML = `
      <div style="margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap;font-size:12px">
        <span style="color:#4caf50">● 1-8 直接晉級十六強</span>
        <span style="color:var(--text-muted)">● 9-24 進入附加賽</span>
        <span style="color:#ef5350">● 25-36 淘汰</span>
      </div>
      <div class="standings-group">
        <h3>🏆 2025/26 歐冠聯賽階段積分表</h3>
        <table class="standings-table">
          <thead><tr><th>#</th><th>球隊</th><th>賽</th><th>勝</th><th>平</th><th>負</th><th>進</th><th>失</th><th>淨</th><th>積分</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    return;
  }

  if (_isUCL() && tab === 'rankings') {
    // 歐冠：UEFA 係數排名
    const _T = _teams();
    const sorted = Object.entries(_T).sort((a,b) => b[1].uefaCoeff - a[1].uefaCoeff);
    el.innerHTML = `<div class="scorers-list">${sorted.map(([code,t],i) => `
      <div class="scorer-card">
        <div class="scorer-rank ${i<3?['gold','silver','bronze'][i]:''}">${i+1}</div>
        <div class="scorer-flag">${flagImg(t.flag)}</div>
        <div class="scorer-info">
          <div class="scorer-name">${t.nameCN}</div>
          <div class="scorer-sub">${t.league} · 第${t.pot}檔</div>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--accent)">係數 ${t.uefaCoeff}</div>
      </div>`).join('')}</div>`;
    return;
  }

  if (tab === 'standings') {
    const myTeam = (() => { try { return JSON.parse(localStorage.getItem('wc26_team')); } catch { return null; } })();
    // 世界盃期間有即時積分榜資料時，直接套用
    if (window._liveStandings && window._liveStandings.length > 0) {
      const nameMap = {};
      Object.entries(TEAMS).forEach(([code, t]) => {
        nameMap[t.name] = { ...t, code };
        nameMap[t.nameCN] = { ...t, code };
      });
      el.innerHTML = `<div style="margin-bottom:16px;color:#4caf50;font-size:13px">🟢 即時積分榜</div>` +
        (myTeam ? `<div class="standings-myteam-banner">⚽ 你支持的球隊：${flagImg(TEAMS[myTeam]?.flag||'')} ${TEAMS[myTeam]?.nameCN||myTeam}</div>` : '') +
        window._liveStandings.map(group => {
          const groupName = group[0]?.group || '';
          const rows = group.map(entry => {
            const tm = nameMap[entry.teamName];
            const flag = tm ? tm.flag : '';
            const name = tm ? tm.nameCN : entry.teamName;
            const isQ = entry.rank <= 2;
            const isMine = tm && myTeam && tm.code === myTeam;
            return `<tr class="${isQ?'standings-qualify':''} ${isMine?'standings-myteam':''}">
              <td class="standings-pos">${entry.rank}</td>
              <td>${flagImg(flag)} ${name}${isMine?' <span class="my-team-tag">我的</span>':''}</td>
              <td>${entry.played}</td>
              <td>${entry.win}</td>
              <td>${entry.draw}</td>
              <td>${entry.lose}</td>
              <td>${entry.goalsFor}</td>
              <td>${entry.goalsAgainst}</td>
              <td>${entry.goalsDiff > 0 ? '+' : ''}${entry.goalsDiff}</td>
              <td><strong>${entry.points}</strong></td>
            </tr>`;
          }).join('');
          return `<div class="standings-group">
            <h3>${groupName}</h3>
            <table class="standings-table">
              <thead><tr><th>#</th><th>球隊</th><th>賽</th><th>勝</th><th>平</th><th>負</th><th>進</th><th>失</th><th>淨</th><th>積分</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
        }).join('');
      return;
    }
    // 賽前：顯示分組表（全 0）
    el.innerHTML = (myTeam ? `<div class="standings-myteam-banner">⚽ 你支持的球隊：${flagImg(TEAMS[myTeam]?.flag||'')} ${TEAMS[myTeam]?.nameCN||myTeam}</div>` : '') +
      Object.entries(GROUPS).map(([g, gd]) => {
      const rows = gd.teams.map((code,i) => {
        const t = TEAMS[code];
        const isQ = i < 2;
        const isMine = myTeam && code === myTeam;
        return `<tr class="${isQ?'standings-qualify':''} ${isMine?'standings-myteam':''}">
          <td class="standings-pos">${i+1}</td>
          <td>${flagImg(t.flag)} ${t.nameCN}${isMine?' <span class="my-team-tag">我的</span>':''}</td>
          <td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td>
          <td><strong>0</strong></td>
        </tr>`;
      }).join('');
      return `<div class="standings-group">
        <h3>${gd.name}</h3>
        <table class="standings-table">
          <thead><tr>
            <th>#</th><th>球隊</th><th>賽</th><th>勝</th><th>平</th><th>負</th><th>進</th><th>失</th><th>淨</th><th>積分</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }).join('');
  } else if (tab === 'scorers' || tab === 'assists') {
    const unit = tab === 'scorers' ? '球' : '助攻';
    // 世界盃期間有即時資料時使用
    const liveList = tab === 'scorers' ? (window._liveTopScorers || null) : (window._liveTopAssists || null);
    if (liveList && liveList.length > 0) {
      const valKey = tab === 'scorers' ? 'goals' : 'assists';
      el.innerHTML = `<div style="margin-bottom:16px;color:#4caf50;font-size:13px">🟢 即時更新資料</div>
        <div class="scorers-list">${liveList.map((p,i) => `
          <div class="scorer-card">
            <div class="scorer-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
            <div class="scorer-flag"></div>
            <div class="scorer-info"><div class="scorer-name">${p.name}</div><div class="scorer-sub">${p.nationality} · ${p.team}</div></div>
            <div class="scorer-goals">${p[valKey] ?? 0} <span>${unit}</span></div>
          </div>`).join('')}</div>`;
      return;
    }
    const placeholder = [
      {flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',name:'Harry Kane',sub:'英格蘭 · 拜仁慕尼黑',val:0},
      {flag:'🇧🇷',name:'Vinicius Jr.',sub:'巴西 · 皇家馬德里',val:0},
      {flag:'🇫🇷',name:'Kylian Mbappé',sub:'法國 · 皇家馬德里',val:0},
      {flag:'🇵🇹',name:'Cristiano Ronaldo',sub:'葡萄牙 · Al-Nassr',val:0},
      {flag:'🇦🇷',name:'Julián Álvarez',sub:'阿根廷 · 馬競',val:0}
    ];
    el.innerHTML = `<div style="margin-bottom:16px;color:var(--text-muted);font-size:13px">⏳ 賽事開始後即時更新</div>
      <div class="scorers-list">${placeholder.map((p,i) => `
        <div class="scorer-card">
          <div class="scorer-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
          <div class="scorer-flag">${flagImg(p.flag)}</div>
          <div class="scorer-info"><div class="scorer-name">${p.name}</div><div class="scorer-sub">${p.sub}</div></div>
          <div class="scorer-goals">${p.val} <span>${unit}</span></div>
        </div>`).join('')}</div>`;
  } else if (tab === 'rankings') {
    const sorted = Object.entries(TEAMS).sort((a,b) => a[1].fifaRank - b[1].fifaRank);
    el.innerHTML = `<div class="scorers-list">${sorted.map(([code,t],i) => `
      <div class="scorer-card">
        <div class="scorer-rank ${i<3?['gold','silver','bronze'][i]:''}">${t.fifaRank}</div>
        <div class="scorer-flag">${flagImg(t.flag)}</div>
        <div class="scorer-info">
          <div class="scorer-name">${t.nameCN}</div>
          <div class="scorer-sub">${CONF_LABELS[t.conf]} · ${GROUPS[t.group]?.name||''}</div>
        </div>
        <div style="font-size:13px;color:var(--text-muted)">${t.predTitle||''}</div>
      </div>`).join('')}</div>`;
  } else if (tab === 'keepers') {
    if (window._liveTopKeepers && window._liveTopKeepers.length > 0) {
      el.innerHTML = `<div style="margin-bottom:16px;color:#4caf50;font-size:13px">🟢 即時更新資料</div>
        <div class="scorers-list">${window._liveTopKeepers.map((p,i) => `
          <div class="scorer-card">
            <div class="scorer-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
            <div class="scorer-flag"></div>
            <div class="scorer-info"><div class="scorer-name">${p.name}</div><div class="scorer-sub">${p.nationality} · ${p.team}</div></div>
            <div class="scorer-goals">${p.saves ?? 0} <span>撲救</span></div>
          </div>`).join('')}</div>`;
    } else {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">賽事開始後更新</div>';
    }
  } else {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">賽事開始後更新</div>';
  }
}

// ── UCL 淘汰賽對陣圖 ─────────────────────────────────────
function renderUCLBracket() {
  const el = document.getElementById('stats-content');
  if (!el) return;
  const _T = _teams();
  const matches = window.UCL_MATCHES || [];

  function teamCell(code, score, isWinner) {
    if (!code || code === 'TBD') return `<div class="bracket-team tbd"><span class="bracket-team-name">待定</span></div>`;
    const t = _T[code];
    if (!t) return `<div class="bracket-team tbd"><span class="bracket-team-name">${code}</span></div>`;
    return `<div class="bracket-team${isWinner ? ' winner' : ''}">
      <span class="bracket-flag">${flagImg(t.flag)}</span>
      <span class="bracket-team-name">${t.nameCN}</span>
      ${score !== null ? `<span class="bracket-score">${score}</span>` : ''}
    </div>`;
  }

  function matchBox(stage, matchIdx) {
    // 找兩回合
    const leg1 = matches.find(m => m.stage === stage && m.id?.includes('-0' + (matchIdx*2-1)));
    const leg2 = matches.find(m => m.stage === stage && m.id?.includes('-0' + (matchIdx*2)));
    if (!leg1 && !leg2) {
      // 決賽只有一場
      const final = matches.find(m => m.stage === stage);
      if (final) {
        const hScore = final.score ? final.score.h : null;
        const aScore = final.score ? final.score.a : null;
        const hWin = hScore !== null && hScore > aScore;
        const aWin = aScore !== null && aScore > hScore;
        return `<div class="bracket-match">
          ${teamCell(final.home, hScore, hWin)}
          ${teamCell(final.away, aScore, aWin)}
        </div>`;
      }
      return `<div class="bracket-match">${teamCell('TBD',null,false)}${teamCell('TBD',null,false)}</div>`;
    }
    const home = leg1?.home || leg2?.away || 'TBD';
    const away = leg1?.away || leg2?.home || 'TBD';
    const aggH = (leg1?.score?.h||0) + (leg2?.score?.a||0);
    const aggA = (leg1?.score?.a||0) + (leg2?.score?.h||0);
    const finished = leg2?.status === 'finished';
    const hWin = finished && aggH > aggA;
    const aWin = finished && aggA > aggH;
    const aggText = finished ? `(${aggH}-${aggA})` : '';
    return `<div class="bracket-match">
      ${teamCell(home, finished ? aggH : null, hWin)}
      ${teamCell(away, finished ? aggA : null, aWin)}
      ${aggText ? `<div class="bracket-agg">${aggText}</div>` : ''}
    </div>`;
  }

  // 八強
  const qfMatches = [];
  for (let i = 1; i <= 4; i++) {
    const leg1 = matches.find(m => m.stage === 'qf' && m.id === `UCL-QF-0${i}`);
    const leg2 = matches.find(m => m.stage === 'qf' && m.id === `UCL-QF-0${i+4}`);
    const home = leg1?.home || 'TBD';
    const away = leg1?.away || 'TBD';
    const aggH = ((leg1?.score?.h)||0) + ((leg2?.score?.a)||0);
    const aggA = ((leg1?.score?.a)||0) + ((leg2?.score?.h)||0);
    const fin = leg2?.status === 'finished';
    qfMatches.push({ home, away, aggH: fin ? aggH : null, aggA: fin ? aggA : null, fin, leg1Date: leg1?.date });
  }

  // 四強
  const sfMatches = [];
  for (let i = 1; i <= 2; i++) {
    const leg1 = matches.find(m => m.stage === 'sf' && m.id === `UCL-SF-0${i}`);
    const leg2 = matches.find(m => m.stage === 'sf' && m.id === `UCL-SF-0${i+2}`);
    const home = leg1?.home || 'TBD';
    const away = leg1?.away || 'TBD';
    sfMatches.push({ home, away, aggH: null, aggA: null, fin: false });
  }

  // 決賽
  const finalMatch = matches.find(m => m.stage === 'final');

  function renderMatchCell(m) {
    const ht = _T[m.home], at = _T[m.away];
    const hWin = m.fin && m.aggH > m.aggA;
    const aWin = m.fin && m.aggA > m.aggH;
    return `<div class="bracket-match">
      ${teamCell(m.home, m.aggH, hWin)}
      ${teamCell(m.away, m.aggA, aWin)}
      ${m.fin ? `<div class="bracket-agg">(${m.aggH}-${m.aggA})</div>` : ''}
    </div>`;
  }

  el.innerHTML = `
    <div class="ucl-bracket">
      <div class="bracket-round">
        <div class="bracket-round-title">八強</div>
        ${qfMatches.map(m => renderMatchCell(m)).join('')}
      </div>
      <div class="bracket-round">
        <div class="bracket-round-title">四強</div>
        ${sfMatches.map(m => renderMatchCell(m)).join('')}
      </div>
      <div class="bracket-round bracket-final">
        <div class="bracket-round-title">決賽</div>
        <div class="bracket-match">
          ${teamCell(finalMatch?.home||'TBD', null, false)}
          ${teamCell(finalMatch?.away||'TBD', null, false)}
        </div>
        <div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px">
          📍 ${finalMatch?.venue || 'Allianz Arena, Munich'}<br>
          🗓️ ${finalMatch?.date || '2026-05-30'}
        </div>
      </div>
    </div>`;
}

// 文章頁
function renderFocus() {
  const main = document.getElementById('focus-featured');
  const grid = document.getElementById('focus-articles');
  if (!main || !grid) return;

  if (_isUCL()) {
    const arts = _articles();
    if (!arts.length) { main.innerHTML = ''; grid.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">暫無文章</div>'; return; }
    const [first, ...rest] = arts;
    main.innerHTML = `<div class="focus-main-card" onclick="openUCLArticle('${first.id}')">
      <div class="focus-cat">📌 ${first.category}</div>
      <div class="focus-main-title">${first.title}</div>
      <div class="focus-main-desc">${first.summary}</div>
      <div class="focus-meta"><span><i class="fas fa-calendar"></i> ${first.date}</span></div>
    </div>`;
    grid.innerHTML = rest.map(a => `
      <div class="focus-article-card" onclick="openUCLArticle('${a.id}')">
        <div class="focus-article-cat">${a.category}</div>
        <div class="focus-article-title">${a.title}</div>
        <div class="focus-article-desc">${a.summary}</div>
        <div class="focus-article-footer">
          <span>${a.date}</span>
          <span class="read-more">閱讀全文</span>
        </div>
      </div>`).join('');
    return;
  }

  const [first, ...rest] = ARTICLES;
  main.innerHTML = `<div class="focus-main-card" onclick="openArticle(${first.id})">
    <div class="focus-cat">📌 ${first.cat}</div>
    <div class="focus-main-title">${first.title}</div>
    <div class="focus-main-desc">${first.desc}</div>
    <div class="focus-meta">
      <span><i class="fas fa-calendar"></i> ${first.date}</span>
      <span><i class="fas fa-clock"></i> 閱讀時間 ${first.readTime}</span>
    </div>
  </div>`;
  grid.innerHTML = rest.map(a => `
    <div class="focus-article-card" onclick="openArticle(${a.id})">
      <div class="focus-article-cat">${a.cat.toUpperCase()}</div>
      <div class="focus-article-title">${a.title}</div>
      <div class="focus-article-desc">${a.desc}</div>
      <div class="focus-article-footer">
        <span>${a.date} · ${a.readTime}</span>
        <span class="read-more">閱讀全文</span>
      </div>
    </div>`).join('');
}

function openArticle(id) {
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return;
  let overlay = document.getElementById('article-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'article-modal-overlay';
    overlay.className = 'article-modal-overlay';
    overlay.innerHTML = `<div class="article-modal-box">
      <button class="modal-close" onclick="document.getElementById('article-modal-overlay').classList.remove('open')"><i class="fas fa-times"></i></button>
      <div id="article-modal-inner"></div>
    </div>`;
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.classList.remove('open'); });
    document.body.appendChild(overlay);
  }
  document.getElementById('article-modal-inner').innerHTML = `
    <div class="focus-cat">${a.cat}</div>
    <div class="article-modal-title">${a.title}</div>
    <div class="article-modal-meta">
      <span><i class="fas fa-calendar"></i> ${a.date}</span>
      <span><i class="fas fa-clock"></i> ${a.readTime}</span>
    </div>
    <div class="article-modal-body">${a.body}</div>`;
  overlay.classList.add('open');
}

function openUCLArticle(id) {
  const arts = _articles();
  const a = arts.find(x => x.id === id);
  if (!a) return;
  let overlay = document.getElementById('article-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'article-modal-overlay';
    overlay.className = 'article-modal-overlay';
    overlay.innerHTML = `<div class="article-modal-box">
      <button class="modal-close" onclick="document.getElementById('article-modal-overlay').classList.remove('open')"><i class="fas fa-times"></i></button>
      <div id="article-modal-inner"></div>
    </div>`;
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.classList.remove('open'); });
    document.body.appendChild(overlay);
  }
  // Convert markdown-ish content to HTML
  const bodyHtml = (a.content||'').replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^- \*\*(.+?)\*\*(.*)$/gm, '<div style="margin:6px 0"><strong>$1</strong>$2</div>')
    .replace(/^- (.+)$/gm, '<div style="margin:4px 0;padding-left:12px">• $1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>');
  document.getElementById('article-modal-inner').innerHTML = `
    <div class="focus-cat">${a.category}</div>
    <div class="article-modal-title">${a.title}</div>
    <div class="article-modal-meta"><span><i class="fas fa-calendar"></i> ${a.date}</span></div>
    <div class="article-modal-body">${bodyHtml}</div>`;
  overlay.classList.add('open');
}

function openTeamModal(code) {
  const _T = _teams();
  const t = _T[code];
  if (!t) return;
  const formDots = (t.recentForm||['W','D','W','W','D']).map(f => `<div class="form-dot ${f}">${f}</div>`).join('');
  const players = (t.keyPlayers||[]).map(p => `<div class="player-pill">⚽ ${p.name} <span style="color:var(--text-muted);font-size:11px">${p.pos}${p.club ? ' · '+p.club : ''}</span></div>`).join('');
  const strengths = (t.strengths||[]).map(s => `<div class="strength-item">${s}</div>`).join('');
  const weaknesses = (t.weaknesses||[]).map(w => `<div class="weakness-item">${w}</div>`).join('');

  const isUcl = _isUCL();
  const subLine = isUcl ? `${t.name} · ${t.league}` : `${t.name} · ${CONF_LABELS[t.conf]||t.conf}`;
  const badges = isUcl
    ? `<span class="match-tag group">第${t.pot}檔</span>
       <span class="match-tag">UEFA 係數 ${t.uefaCoeff}</span>
       <span class="match-tag">主帥：${t.coach}</span>
       <span class="match-tag">${t.formation}</span>`
    : `<span class="match-tag group">${GROUPS[t.group]?.name||''}</span>
       <span class="match-tag">FIFA #${t.fifaRank}</span>
       <span class="match-tag">主帥：${t.coach}</span>
       <span class="match-tag">${t.formation}</span>`;

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-team-header">
      <div class="modal-flag">${flagImg(t.flag)}</div>
      <div>
        <div class="modal-team-name">${t.nameCN}</div>
        <div class="modal-team-sub">${subLine}</div>
        <div class="modal-badges">${badges}</div>
      </div>
    </div>
    <div class="modal-section-title">關鍵球員</div>
    <div class="player-list">${players}</div>
    <div class="modal-section-title">球隊風格</div>
    <p style="font-size:14px;color:var(--text-secondary)">${t.style}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div><div class="modal-section-title">優勢</div><div class="strength-list">${strengths}</div></div>
      <div><div class="modal-section-title">弱點</div><div class="weakness-list">${weaknesses}</div></div>
    </div>
    ${t.recentForm ? `<div class="modal-section-title">近期狀態（最近5場）</div><div class="form-dots">${formDots}</div>` : ''}
    <div class="modal-section-title">歷史戰績</div>
    <p style="font-size:14px;color:var(--text-secondary)">${t.history}</p>
    ${t.predTitle ? `<div style="margin-top:16px;padding:14px;background:var(--accent-bg);border-radius:10px;border-left:3px solid var(--accent)">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px">${t.predTitle}</div>
      <div style="font-size:13px;color:var(--text-secondary)">${t.predDesc||''}</div>
    </div>` : ''}`;
  document.getElementById('team-modal').classList.add('open');
}

// ── 即時資料整合 ────────────────────────────────────────────
// 載入 GitHub Actions 定期更新的 data-live.json，將真實比賽資料覆蓋到畫面上
function applyLiveData() {
  fetch('js/data-live.json?t=' + Date.now())
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(data => {
      if (!data) return;

      // 顯示「最後更新」時間戳記
      const ts = new Date(data.updatedAt);
      const tsStr = ts.toLocaleString('zh-TW', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const existing = document.getElementById('live-update-badge');
      const badge = existing || document.createElement('div');
      badge.id = 'live-update-badge';
      badge.style.cssText = 'position:fixed;bottom:16px;right:16px;background:rgba(0,0,0,0.75);color:#aaa;font-size:11px;padding:6px 10px;border-radius:20px;z-index:9999;pointer-events:none';
      badge.textContent = '資料更新：' + tsStr;
      if (!existing) document.body.appendChild(badge);

      // 即時比賽橫幅改由 ESPN ticker 負責，此處不再處理
      if (data.isDuringWC) {
        const activeTab = document.querySelector('.stats-tab.active');

        // 積分榜
        if (data.standings && data.standings.length > 0) {
          window._liveStandings = data.standings;
          buildTournamentForm(); // 同步更新賽中狀態係數
          if (activeTab && activeTab.dataset.stats === 'standings') renderStats('standings');
        }

        // 射手榜
        if (data.topScorers && data.topScorers.length > 0) {
          window._liveTopScorers = data.topScorers;
          if (activeTab && activeTab.dataset.stats === 'scorers') renderStats('scorers');
        }

        // 助攻榜
        if (data.topAssists && data.topAssists.length > 0) {
          window._liveTopAssists = data.topAssists;
          if (activeTab && activeTab.dataset.stats === 'assists') renderStats('assists');
        }

        // 門將榜
        if (data.topKeepers && data.topKeepers.length > 0) {
          window._liveTopKeepers = data.topKeepers;
          if (activeTab && activeTab.dataset.stats === 'keepers') renderStats('keepers');
        }
      }
    });
}

// ── ESPN 即時比分 ticker ─────────────────────────────────────
// 直接從瀏覽器呼叫 ESPN 公開 API，無需 key，每 60 秒更新一次
// 比賽進行中：頁面頂端顯示即時比分橫幅；無比賽時自動隱藏
const _ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

function _isMatchWindow() {
  const h = new Date().getUTCHours();
  return h >= 14 || h <= 5;   // 北美 WC 賽事時段（UTC）
}

function _updateLiveBanner(matches) {
  let banner = document.getElementById('live-matches-banner');
  if (!matches || matches.length === 0) {
    if (banner) banner.remove();
    return;
  }
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'live-matches-banner';
    banner.style.cssText = [
      'background:linear-gradient(90deg,#b71c1c,#d32f2f)',
      'color:#fff',
      'padding:10px 20px',
      'text-align:center',
      'font-size:13px',
      'font-weight:600',
      'letter-spacing:.5px',
      'position:sticky',
      'top:64px',
      'z-index:100',
      'overflow:hidden',
      'white-space:nowrap',
      'text-overflow:ellipsis'
    ].join(';');
    const header = document.getElementById('main-header');
    if (header) header.insertAdjacentElement('afterend', banner);
  }
  banner.textContent = matches.map(m =>
    `🔴 ${m.home} ${m.homeScore} : ${m.awayScore} ${m.away}  ${m.clock}`
  ).join('　　　');
}

function _fetchESPN() {
  if (!_isMatchWindow()) return;
  fetch(_ESPN_URL)
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(data => {
      if (!data || !data.events) { _updateLiveBanner([]); return; }
      const live = data.events
        .filter(e => e.status.type.state === 'in')
        .map(e => {
          const comp = e.competitions[0];
          const home = comp.competitors.find(c => c.homeAway === 'home');
          const away = comp.competitors.find(c => c.homeAway === 'away');
          return {
            home: home?.team.shortDisplayName || home?.team.displayName || '?',
            away: away?.team.shortDisplayName || away?.team.displayName || '?',
            homeScore: home?.score ?? '-',
            awayScore: away?.score ?? '-',
            clock: e.status.type.shortDetail || ''
          };
        });
      _updateLiveBanner(live);

      // 即時更新數據頁的積分榜（若 ESPN 有完賽資料可補充）
      const finished = data.events.filter(e => e.status.type.state === 'post');
      if (finished.length > 0) {
        const badge = document.getElementById('live-update-badge');
        if (badge) badge.textContent = '比分已更新：' + new Date().toLocaleTimeString('zh-TW', {hour:'2-digit',minute:'2-digit'});
      }
    });
}

function initLiveScoreTicker() {
  _fetchESPN();                                    // 頁面載入立刻抓一次
  setInterval(_fetchESPN, 60 * 1000);             // 之後每 60 秒
}

// ── 使用者自訂預測 ────────────────────────────────────────
function openMyPredInput(matchId, hName, aName) {
  const myPreds = (() => { try { return JSON.parse(localStorage.getItem('wc26_my_preds'))||{}; } catch { return {}; } })();
  const mine = myPreds[matchId] || { h:0, a:0 };

  const overlay = document.createElement('div');
  overlay.id = 'my-pred-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:#1a1a2e;border-radius:20px;padding:28px 24px;max-width:320px;width:100%;border:1px solid var(--accent-border)">
      <div style="font-size:20px;font-weight:900;text-align:center;margin-bottom:6px;color:var(--accent)">🎯 你的預測</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:20px">${hName} vs ${aName}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:24px">
        <div style="text-align:center">
          <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:8px">${hName}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <button onclick="adjustMyPred('h',-1)" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:18px;cursor:pointer">−</button>
            <span id="my-pred-h" style="font-size:36px;font-weight:900;color:#fff;min-width:36px;text-align:center">${mine.h}</span>
            <button onclick="adjustMyPred('h',1)" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:18px;cursor:pointer">+</button>
          </div>
        </div>
        <div style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.3)">:</div>
        <div style="text-align:center">
          <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:8px">${aName}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <button onclick="adjustMyPred('a',-1)" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:18px;cursor:pointer">−</button>
            <span id="my-pred-a" style="font-size:36px;font-weight:900;color:#fff;min-width:36px;text-align:center">${mine.a}</span>
            <button onclick="adjustMyPred('a',1)" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:18px;cursor:pointer">+</button>
          </div>
        </div>
      </div>
      <button class="btn-primary" style="width:100%;margin-bottom:10px" onclick="saveMyPred('${matchId}')">
        確認預測
      </button>
      <button onclick="document.getElementById('my-pred-overlay').remove()"
        style="width:100%;background:none;border:none;color:rgba(255,255,255,0.3);font-size:13px;cursor:pointer;padding:8px">
        取消
      </button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function adjustMyPred(side, delta) {
  const el = document.getElementById(`my-pred-${side}`);
  if (!el) return;
  const val = Math.max(0, Math.min(15, parseInt(el.textContent) + delta));
  el.textContent = val;
}

function saveMyPred(matchId) {
  const h = parseInt(document.getElementById('my-pred-h')?.textContent || 0);
  const a = parseInt(document.getElementById('my-pred-a')?.textContent || 0);
  const myPreds = (() => { try { return JSON.parse(localStorage.getItem('wc26_my_preds'))||{}; } catch { return {}; } })();
  myPreds[matchId] = { h, a, savedAt: new Date().toISOString() };
  localStorage.setItem('wc26_my_preds', JSON.stringify(myPreds));
  document.getElementById('my-pred-overlay')?.remove();
  // 重新整理 modal 內的預測區塊
  openPredModal(matchId);
}
