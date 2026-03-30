/* app.js — 導覽 + 倒計時 + 首頁 */

// 首頁：冠軍預測
function renderChampions() {
  const top5 = [
    {code:'FRA', prob:'29%', desc:'陣容最均衡，Mbappé狀態巔峰'},
    {code:'BRA', prob:'24%', desc:'雙翼最強，渴望第六星'},
    {code:'ESP', prob:'20%', desc:'中場統治，Yamal橫空出世'},
    {code:'ENG', prob:'12%', desc:'Bellingham+Kane，等待54年'},
    {code:'ARG', prob:'8%',  desc:'衛冕冠軍，Messi告別之旅'}
  ];
  const el = document.getElementById('champion-cards');
  if (!el) return;
  el.innerHTML = top5.map((t,i) => {
    const tm = TEAMS[t.code];
    return `<div class="champion-card" onclick="showSection('teams')">
      <div class="champion-rank">#${i+1}</div>
      <div class="champion-flag">${tm.flag}</div>
      <div class="champion-name">${tm.nameCN}</div>
      <div class="champion-prob">${t.prob}</div>
      <div class="champion-desc">${t.desc}</div>
    </div>`;
  }).join('');
}

// 首頁：即將開賽（取前6場）
function renderUpcoming() {
  const el = document.getElementById('upcoming-matches');
  if (!el || !SCHEDULE.length) return;
  const upcoming = SCHEDULE.filter(m => m.home && m.away).slice(0, 6);
  el.innerHTML = upcoming.map(m => {
    const ht = TEAMS[m.home], at = TEAMS[m.away];
    if (!ht || !at) return '';
    const pred = calcPred(ht, at);
    return `<div class="upcoming-card" onclick="openPredModal('${m.id}')">
      <div class="upcoming-teams">
        <div class="upcoming-team"><div class="upcoming-flag">${ht.flag}</div><div class="upcoming-name">${ht.nameCN}</div></div>
        <div class="upcoming-vs">VS</div>
        <div class="upcoming-team"><div class="upcoming-flag">${at.flag}</div><div class="upcoming-name">${at.nameCN}</div></div>
      </div>
      <div class="upcoming-info">
        <div>
          <div class="upcoming-time">${m.twTime} 台灣時間</div>
          <div style="font-size:12px;color:var(--text-muted)">${m.twDate.slice(5).replace('-','/')} · ${GROUPS[m.group]?.name||''}</div>
        </div>
        <div class="upcoming-venue">${m.venue}<br/>${m.city}</div>
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

// 首頁：死亡組指數
function renderDeathGroups() {
  const el = document.getElementById('death-groups');
  if (!el) return;
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
      <div class="death-teams">${gd.teams.map(c => `<span class="death-team-pill">${TEAMS[c]?.flag||''} ${TEAMS[c]?.nameCN||c}</span>`).join('')}</div>
      <div class="death-bar"><div class="death-bar-fill" style="width:${score}%"></div></div>
    </div>`;
  }).join('');
}

// 首頁：十大看點
function renderHighlights() {
  const el = document.getElementById('highlights-grid');
  if (!el) return;
  const items = [
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
  // 從真實賽程中挑選6場精選比賽（找高知名度球隊的對決）
  const featuredPairs = [['BRA','MAR'],['FRA','NOR'],['ENG','CRO'],['ARG','AUT'],['ESP','URU'],['GER','ECU']];
  const featuredMatches = featuredPairs.map(([h,a]) =>
    SCHEDULE.find(m => m.home===h && m.away===a) ||
    SCHEDULE.find(m => m.home===a && m.away===h)
  ).filter(Boolean).slice(0,6);
  // 若真實賽程中不夠6場，補上前6場
  const fillMatches = SCHEDULE.filter(m => m.home && m.away);
  while (featuredMatches.length < 6 && fillMatches.length > featuredMatches.length) {
    const m = fillMatches[featuredMatches.length];
    if (!featuredMatches.find(x => x.id === m.id)) featuredMatches.push(m);
  }
  featEl.innerHTML = featuredMatches.map(m => {
    const ht = TEAMS[m.home], at = TEAMS[m.away];
    if (!ht||!at) return '';
    const p = calcPred(ht,at);
    return `<div class="featured-pred-card" onclick="openPredModal('${m.id}')">
      <div class="featured-pred-header">
        <span class="match-tag group">${GROUPS[m.group]?.name||''}</span>
        <span class="confidence-badge confidence-${p.conf}">${p.confLabel}</span>
      </div>
      <div class="featured-pred-teams">
        <div class="pred-team"><div class="pred-team-flag">${ht.flag}</div><div class="pred-team-name">${ht.nameCN}</div></div>
        <div class="pred-score-big">${p.score}</div>
        <div class="pred-team"><div class="pred-team-flag">${at.flag}</div><div class="pred-team-name">${at.nameCN}</div></div>
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

  const allMatches = SCHEDULE.filter(m => m.home && m.away).slice(0,30);
  listEl.innerHTML = allMatches.map(m => {
    const ht = TEAMS[m.home], at = TEAMS[m.away];
    if (!ht||!at) return '';
    const p = calcPred(ht,at);
    return `<div class="pred-list-card" onclick="openPredModal('${m.id}')">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:22px">${ht.flag}</span>
        <span style="font-weight:700">${ht.nameCN}</span>
      </div>
      <div style="text-align:center">
        <div style="font-size:16px;font-weight:800;color:var(--gold)">${p.score}</div>
        <div style="font-size:11px;color:var(--text-muted)">${m.twDate?.slice(5).replace('-','/')} ${m.twTime}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end">
        <span style="font-weight:700">${at.nameCN}</span>
        <span style="font-size:22px">${at.flag}</span>
      </div>
      <span class="confidence-badge confidence-${p.conf}">${p.hw}% - ${p.d}% - ${p.aw}%</span>
    </div>`;
  }).join('');
}

// 統一的比賽預測 Modal（所有入口都走這裡）
function openPredModal(id) {
  // 立即顯示 modal + loading 動畫，不讓用戶感覺沒反應
  const modal = document.getElementById('team-modal');
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `<div class="modal-loading">
    <div class="modal-spinner"></div>
    <div class="modal-loading-text">🤖 AI 正在分析賽事...</div>
    <div class="modal-loading-sub">比對歷史數據 · 計算勝率 · 生成預測</div>
  </div>`;
  modal.classList.add('open');

  // 下一幀再渲染完整內容（讓 loading 畫面先顯示）
  requestAnimationFrame(() => setTimeout(() => {
  try {
  let m = SCHEDULE.find(x => x.id === id);
  if (!m) {
    const parts = id.replace('GS-','').split('-');
    if (parts.length >= 2) m = SCHEDULE.find(x => x.home===parts[0] && x.away===parts[1]);
  }
  if (!m || !m.home || !m.away) { console.warn('openPredModal: match not found', id); return; }
  const ht = TEAMS[m.home], at = TEAMS[m.away];
  if (!ht || !at) { console.warn('openPredModal: team not found', m.home, m.away); return; }

  const p   = calcPred(ht, at);
  const pts = generateAnalysis(ht, at, p);
  const hForm = (ht.recentForm||['W','D','W','W','D']);
  const aForm = (at.recentForm||['W','D','W','W','D']);
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

  const phaseLabel = {group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賽'}[m.phase]||'';

  document.getElementById('modal-content').innerHTML = `
    <!-- 頂部：賽事資訊 -->
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">
        <span class="match-tag group">${GROUPS[m.group]?.name||''} · ${phaseLabel}</span>
        <span class="match-tag">🕒 ${m.twDate?.slice(5).replace('-','/')} ${m.twTime} 台灣時間</span>
        <span class="match-tag">📍 ${m.venue}, ${m.city}</span>
      </div>
    </div>

    <!-- 對陣 + 比分 -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:8px">
      <div style="text-align:center;flex:1;min-width:0">
        <div style="font-size:52px;margin-bottom:6px">${ht.flag}</div>
        <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ht.nameCN}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">FIFA #${ht.fifaRank}</div>
        <div style="font-size:11px;color:var(--text-muted)">${ht.formation}</div>
      </div>
      <div style="text-align:center;padding:0 8px;flex-shrink:0">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">AI 預測比分</div>
        <div style="font-size:44px;font-weight:900;color:var(--gold);letter-spacing:4px">${p.score}</div>
        <div style="font-size:11px;color:var(--text-muted);margin:4px 0">xG ${p.hXG} — ${p.aXG}</div>
        <div class="confidence-badge confidence-${p.conf}">${p.confLabel}</div>
      </div>
      <div style="text-align:center;flex:1;min-width:0">
        <div style="font-size:52px;margin-bottom:6px">${at.flag}</div>
        <div style="font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${at.nameCN}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">FIFA #${at.fifaRank}</div>
        <div style="font-size:11px;color:var(--text-muted)">${at.formation}</div>
      </div>
    </div>

    <!-- 關鍵球員（獨立區塊，不干擾頂部布局）-->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div class="modal-players-box">
        <div class="modal-players-title">${ht.flag} 關鍵球員</div>
        ${playerList(ht)}
      </div>
      <div class="modal-players-box">
        <div class="modal-players-title">${at.flag} 關鍵球員</div>
        ${playerList(at)}
      </div>
    </div>

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
        <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:6px">${ht.flag} ${ht.nameCN} 踢法</div>
        <div style="font-size:12px;color:var(--text-secondary)">${ht.style||''}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--green)">✓ ${(ht.strengths||['整體實力強'])[0]}</div>
        <div style="font-size:12px;color:#ef9a9a">✗ ${(ht.weaknesses||['有待觀察'])[0]}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px">
        <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:6px">${at.flag} ${at.nameCN} 踢法</div>
        <div style="font-size:12px;color:var(--text-secondary)">${at.style||''}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--green)">✓ ${(at.strengths||['整體實力強'])[0]}</div>
        <div style="font-size:12px;color:#ef9a9a">✗ ${(at.weaknesses||['有待觀察'])[0]}</div>
      </div>
    </div>

    <!-- 近期狀態 -->
    <div class="modal-section-title">📈 近期狀態（最近5場）</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:20px">${ht.flag}</span>${formDots(hForm)}
        <span style="font-size:12px;color:var(--text-muted)">${formScore(hForm)}分</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:20px">${at.flag}</span>${formDots(aForm)}
        <span style="font-size:12px;color:var(--text-muted)">${formScore(aForm)}分</span>
      </div>
    </div>

    <!-- 焦點球員對決 -->
    <div style="background:rgba(240,192,64,0.07);border-radius:10px;padding:14px;border-left:3px solid var(--gold)">
      <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:6px">⚽ 焦點球員對決</div>
      <div style="font-size:13px;color:var(--text-secondary)">
        <strong style="color:var(--text-primary)">${ht.keyPlayers?.[0]?.name||ht.nameCN}</strong>（${ht.keyPlayers?.[0]?.pos||'前鋒'}）
        vs
        <strong style="color:var(--text-primary)">${at.keyPlayers?.[0]?.name||at.nameCN}</strong>（${at.keyPlayers?.[0]?.pos||'前鋒'}）
      </div>
      ${ht.predDesc?`<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">💡 ${ht.predTitle||''}：${ht.predDesc||''}</div>`:''}
    </div>`;

  // modal 已在 loading 階段開啟，這裡只捲到頂部
  modal.scrollTop = 0;
  } catch(e) {
    console.error('openPredModal error:', e);
    mc.innerHTML = `<div style="padding:30px;text-align:center;color:#ef9a9a">⚠️ 載入預測時發生錯誤：${e.message}</div>`;
  }
  }, 120)); // 120ms：足夠渲染 loading 畫面，又不會讓用戶等太久
}

document.getElementById('hamburger-btn').addEventListener('click', () => {
  document.getElementById('mobile-nav').classList.toggle('open');
});

// 動態預測計算
// 近期狀態分數 (W=3, D=1, L=0)
function formScore(form) {
  return (form||['W','D','W','D','W']).reduce((s,r)=>s+(r==='W'?3:r==='D'?1:0),0);
}

function calcPred(ht, at) {
  const ha = ht.radar, aa = at.radar;

  // 用球隊名稱產生確定性種子，確保同場比賽永遠顯示相同預測
  const seed = Array.from(ht.nameCN+at.nameCN).reduce((s,c)=>s+c.charCodeAt(0),0) % 97;

  // 進攻效率 vs 對方防守 (考量防守壓制)
  const homeXG = ((ha.attack/100)*2.4) * (1 - aa.defense/220) * (1 + (ha.speed-70)*0.003) * (1 + (formScore(ht.recentForm)-9)*0.04);
  const awayXG = ((aa.attack/100)*2.0) * (1 - ha.defense/220) * (1 + (aa.speed-70)*0.003) * (1 + (formScore(at.recentForm)-9)*0.04);

  // 中場優勢調整
  const midAdv = (ha.midfield - aa.midfield) * 0.004;
  const hXG = Math.max(0.2, Math.min(3.5, homeXG + midAdv));
  const aXG = Math.max(0.2, Math.min(3.0, awayXG - midAdv));

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

  // FIFA排名修正 (每10名差距約±3%)
  const rankAdj = Math.min(18, Math.max(-18, (at.fifaRank - ht.fifaRank) * 0.35));
  hw = Math.min(78, Math.max(8, Math.round(hw + rankAdj)));
  aw = Math.min(78, Math.max(8, Math.round(aw - rankAdj)));
  d  = Math.max(10, 100 - hw - aw);

  // 先確定勝/平/負結果
  const outcome = hw > aw && hw > d ? 'home' : aw > hw && aw > d ? 'away' : 'draw';

  // ── 比分換算 ──
  // 放大係數依「優勢程度」而定：越強的熱門 → 比分差越大
  // 接近平衡的賽事維持保守（1-0、2-1），大懸殊賽事允許 3-0、4-1
  const rankGap = Math.abs(ht.fifaRank - at.fifaRank);
  const winnerHw = outcome === 'home' ? hw : outcome === 'away' ? aw : d;
  const scoreMult = winnerHw >= 70 ? 1.45 : winnerHw >= 62 ? 1.25 : winnerHw >= 55 ? 1.08 : 1.0;
  // 排名懸殊額外加成（50+ 差距才觸發，避免中等差距過度放大）
  const mismatchBonus = rankGap >= 55 ? 0.7 : rankGap >= 40 ? 0.45 : 0;
  const hScoreXG = hXG * scoreMult + (outcome === 'home' ? mismatchBonus : 0);
  const aScoreXG = aXG * scoreMult + (outcome === 'away' ? mismatchBonus : 0);

  // 種子決定用 floor / round / ceil
  const hMode = seed % 3;
  const aMode = (seed + 5) % 3;
  let hGoals = Math.max(0, hMode===0 ? Math.floor(hScoreXG) : hMode===2 ? Math.ceil(hScoreXG) : Math.round(hScoreXG));
  let aGoals = Math.max(0, aMode===0 ? Math.floor(aScoreXG) : aMode===2 ? Math.ceil(aScoreXG) : Math.round(aScoreXG));

  // 強制結果一致
  if (outcome === 'home') {
    if (hGoals <= aGoals) {
      aGoals = Math.max(0, hGoals - 1);
      if (hGoals === 0) hGoals = 1;
    }
  } else if (outcome === 'away') {
    if (aGoals <= hGoals) {
      hGoals = Math.max(0, aGoals - 1);
      if (aGoals === 0) aGoals = 1;
    }
  } else { // draw：平局用放大後的平均值
    const eq = Math.round((hScoreXG + aScoreXG) / 2);
    hGoals = eq; aGoals = eq;
  }
  hGoals = Math.min(5, hGoals);
  aGoals = Math.min(5, aGoals);

  const conf = Math.abs(hw-aw) >= 28 ? 'high' : Math.abs(hw-aw) >= 14 ? 'medium' : 'low';
  const confLabel = conf==='high'?'高信心':conf==='medium'?'中信心':'低信心';

  return {
    hw, d, aw,
    score:`${hGoals}-${aGoals}`,
    hXG: hXG.toFixed(1), aXG: aXG.toFixed(1),
    conf, confLabel, seed
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

// 倒計時
(function countdown() {
  const target = new Date('2026-06-11T19:00:00-06:00');
  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) { document.querySelector('.countdown-container').innerHTML = '<div class="countdown-label">🏆 世界盃已開幕！</div>'; return; }
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
  let list = SCHEDULE.filter(m => {
    if (phaseFilter && phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
    if (groupFilter && groupFilter !== 'all' && m.group !== groupFilter) return false;
    return true;
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
          <div style="font-size:16px;font-weight:700;color:var(--gold)">${m.label||'待定'}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:6px">🕒 ${m.twDate?.slice(5).replace('-','/')||''} ${m.twTime||''} 台灣時間 · 📍 ${m.venue||''}</div>
        </div></div>`;
    }
    const ht = TEAMS[m.home], at = TEAMS[m.away];
    if (!ht || !at) return header;
    const p = calcPred(ht, at);
    const phaseLabel = {group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賽'}[m.phase]||'';
    return header + `<div class="match-card" onclick="openPredModal('${m.id}')">
      <div class="match-team">
        <div class="match-team-flag">${ht.flag}</div>
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
        <div class="match-team-flag">${at.flag}</div>
        <div><div class="match-team-name">${at.nameCN}</div><div class="match-team-sub">FIFA #${at.fifaRank}</div></div>
      </div>
    </div>`;
  }).join('');
}

// 球隊頁
function renderTeams(confFilter, search) {
  const el = document.getElementById('teams-grid');
  if (!el) return;
  let list = Object.entries(TEAMS).filter(([code, t]) => {
    if (confFilter && confFilter !== 'all' && t.conf !== confFilter) return false;
    if (search && !t.nameCN.includes(search) && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  el.innerHTML = list.map(([code, t]) => `
    <div class="team-card" onclick="openTeamModal('${code}')">
      <div class="team-card-flag">${t.flag}</div>
      <div class="team-card-name">${t.nameCN}</div>
      <div class="team-card-conf">${CONF_LABELS[t.conf]||t.conf}</div>
      <div class="team-card-rank">FIFA 排名 #${t.fifaRank}</div>
      <div class="team-card-group">${GROUPS[t.group]?.name||''}</div>
    </div>`).join('');
}

// 數據頁
function renderStats(tab) {
  const el = document.getElementById('stats-content');
  if (!el) return;
  if (tab === 'standings') {
    el.innerHTML = Object.entries(GROUPS).map(([g, gd]) => {
      const rows = gd.teams.map((code,i) => {
        const t = TEAMS[code];
        const isQ = i < 2;
        return `<tr class="${isQ?'standings-qualify':''}">
          <td class="standings-pos">${i+1}</td>
          <td>${t.flag} ${t.nameCN}</td>
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
    const label = tab === 'scorers' ? '射手榜' : '助攻榜';
    const unit  = tab === 'scorers' ? '球' : '助攻';
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
          <div class="scorer-flag">${p.flag}</div>
          <div class="scorer-info"><div class="scorer-name">${p.name}</div><div class="scorer-sub">${p.sub}</div></div>
          <div class="scorer-goals">${p.val} <span>${unit}</span></div>
        </div>`).join('')}</div>`;
  } else if (tab === 'rankings') {
    const sorted = Object.entries(TEAMS).sort((a,b) => a[1].fifaRank - b[1].fifaRank);
    el.innerHTML = `<div class="scorers-list">${sorted.map(([code,t],i) => `
      <div class="scorer-card">
        <div class="scorer-rank ${i<3?['gold','silver','bronze'][i]:''}">${t.fifaRank}</div>
        <div class="scorer-flag">${t.flag}</div>
        <div class="scorer-info">
          <div class="scorer-name">${t.nameCN}</div>
          <div class="scorer-sub">${CONF_LABELS[t.conf]} · ${GROUPS[t.group]?.name||''}</div>
        </div>
        <div style="font-size:13px;color:var(--text-muted)">${t.predTitle||''}</div>
      </div>`).join('')}</div>`;
  } else {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">賽事開始後更新</div>';
  }
}

// 文章頁
function renderFocus() {
  const main = document.getElementById('focus-featured');
  const grid = document.getElementById('focus-articles');
  if (!main || !grid) return;
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

function openTeamModal(code) {
  const t = TEAMS[code];
  if (!t) return;
  const formDots = (t.recentForm||['W','D','W','W','D']).map(f => `<div class="form-dot ${f}">${f}</div>`).join('');
  const players = (t.keyPlayers||[]).map(p => `<div class="player-pill">⚽ ${p.name} <span style="color:var(--text-muted);font-size:11px">${p.pos}</span></div>`).join('');
  const strengths = (t.strengths||[]).map(s => `<div class="strength-item">${s}</div>`).join('');
  const weaknesses = (t.weaknesses||[]).map(w => `<div class="weakness-item">${w}</div>`).join('');
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-team-header">
      <div class="modal-flag">${t.flag}</div>
      <div>
        <div class="modal-team-name">${t.nameCN}</div>
        <div class="modal-team-sub">${t.name} · ${CONF_LABELS[t.conf]||t.conf}</div>
        <div class="modal-badges">
          <span class="match-tag group">${GROUPS[t.group]?.name||''}</span>
          <span class="match-tag">FIFA #${t.fifaRank}</span>
          <span class="match-tag">主帥：${t.coach}</span>
          <span class="match-tag">${t.formation}</span>
        </div>
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
    <div class="modal-section-title">近期狀態（最近5場）</div>
    <div class="form-dots">${formDots}</div>
    <div class="modal-section-title">歷史戰績</div>
    <p style="font-size:14px;color:var(--text-secondary)">${t.history}</p>
    <div style="margin-top:16px;padding:14px;background:rgba(240,192,64,0.07);border-radius:10px;border-left:3px solid var(--gold)">
      <div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:4px">${t.predTitle||''}</div>
      <div style="font-size:13px;color:var(--text-secondary)">${t.predDesc||''}</div>
    </div>`;
  document.getElementById('team-modal').classList.add('open');
}
