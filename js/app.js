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
  try { buildDynamicForm(); } catch(e) { console.error('[buildDynamicForm init]', e); }
  updateHero();
  // 賽事切換時重新渲染當前頁面
  window.addEventListener('tournamentChanged', () => {
    // 切換賽事時重新渲染所有頁面（try/catch 防止單一模組失敗阻擋其他）
    const _s = (fn) => { try { fn(); } catch(e) { console.error('[tournamentChanged]', e); } };
    _s(() => buildDynamicForm()); // 切換賽事時重建動態近況
    _s(() => updateHero());
    _s(() => renderChampions());
    _s(() => renderUpcoming());
    _s(() => renderHomeBracket());
    _s(() => renderDeathGroups());
    _s(() => renderHighlights());
    _s(() => { if (typeof renderHomeDailyChallenge === 'function') renderHomeDailyChallenge(); });
    _s(() => renderSchedule('all','all'));
    _s(() => renderTeams('all',''));
    _s(() => renderStats('standings'));
    _s(() => renderFocus());
    _s(() => renderPredictions());
    _s(() => renderArena());
    // 更新 header 標題
    const cfg = Tournament.config();
    const titleEl = document.querySelector('.logo-title');
    const subEl = document.querySelector('.logo-sub');
    if (cfg && titleEl) {
      const titles = { wc:'世界盃預測', ucl:'歐冠預測', epl:'英超預測' };
      titleEl.textContent = titles[cfg.id] || '足球預測';
      if (subEl) subEl.textContent = 'Soccer麥迪';
    }
  });
}

/* ── 賽事感知資料取得器 ───────────────────────────── */
function _isUCL() { return window.Tournament?.isUCL?.() ?? false; }
function _isEPL() { return window.Tournament?.isEPL?.() ?? false; }
function _tid() { return window.Tournament?.current?.() || 'wc'; }
function _teams() {
  const t = _tid();
  if (t === 'ucl') return (window.UCL_TEAMS||{});
  if (t === 'epl') return (window.EPL_TEAMS||{});
  return (typeof TEAMS!=='undefined' ? TEAMS : {});
}
function _matches() {
  const t = _tid();
  if (t === 'ucl') return (window.UCL_MATCHES||[]);
  if (t === 'epl') return (window.EPL_MATCHES||[]);
  return (typeof SCHEDULE!=='undefined' && SCHEDULE.length) ? SCHEDULE : [];
}
function _articles() {
  const t = _tid();
  if (t === 'ucl') return (window.UCL_ARTICLES||[]);
  if (t === 'epl') return (window.EPL_ARTICLES||[]);
  return (typeof ARTICLES!=='undefined' ? ARTICLES : []);
}
function _dailyQ() {
  const t = _tid();
  if (t === 'ucl') return (window.UCL_DAILY_QUESTIONS||[]);
  if (t === 'epl') return (window.EPL_DAILY_QUESTIONS||[]);
  return (typeof DAILY_QUESTIONS!=='undefined' ? DAILY_QUESTIONS : []);
}
// 是否為俱樂部賽事（非國家隊）
function _isClub() { return _isUCL() || _isEPL(); }

// ── 賽事數據 HTML 渲染 ──
function _renderStatsHTML(stats, ht, at) {
  const rows = [
    ['控球率', stats.poss?.[0], stats.poss?.[1], '%'],
    ['射門', stats.shots?.[0], stats.shots?.[1], ''],
    ['射正', stats.sot?.[0], stats.sot?.[1], ''],
    ['角球', stats.corners?.[0], stats.corners?.[1], ''],
    ['犯規', stats.fouls?.[0], stats.fouls?.[1], ''],
    ['越位', stats.offsides?.[0], stats.offsides?.[1], ''],
    ['黃牌', stats.yellow?.[0], stats.yellow?.[1], ''],
    ['撲救', stats.saves?.[0], stats.saves?.[1], ''],
  ].filter(([, h, a]) => h !== null && h !== undefined && a !== null && a !== undefined);

  if (!rows.length) return '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px">暫無賽事數據</div>';

  return `<div style="margin:20px 0">
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
      ${rows.map(([label, hVal, aVal, unit]) => {
        const hN = parseFloat(hVal) || 0, aN = parseFloat(aVal) || 0;
        return `<div style="display:grid;grid-template-columns:1fr auto 1fr;padding:10px 16px;border-top:1px solid rgba(255,255,255,0.04)">
          <div style="font-size:15px;font-weight:800;${hN>aN?'color:var(--green)':'color:var(--text-secondary)'}">${hVal}${unit}</div>
          <div style="font-size:12px;color:var(--text-muted);text-align:center;min-width:60px">${label}</div>
          <div style="font-size:15px;font-weight:800;text-align:right;${aN>hN?'color:var(--green)':'color:var(--text-secondary)'}">${aVal}${unit}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── 非同步載入賽事數據 ──
function _fetchMatchStats(home, away, date) {
  const league = _isEPL() ? 'epl' : _isUCL() ? 'ucl' : 'wc';
  const el = document.getElementById('modal-match-stats');
  if (!el) return;

  // 如果已有 stats，不需要再 fetch
  if (el.querySelector('.modal-section-title')) return;

  fetch(`/api/match-stats?home=${home}&away=${away}&date=${date}&league=${league}`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      console.log('[MatchStats]', home, 'vs', away, data.ok ? 'OK' : data.error);
      const el2 = document.getElementById('modal-match-stats');
      if (!el2) return; // modal 已關閉
      if (!data.ok || !data.stats) {
        el2.innerHTML = '';  // 靜默移除（無數據時不顯示任何東西）
        return;
      }
      // 從 data attributes 取得隊伍資訊
      const homeCN = el2.dataset.homeCn;
      const awayCN = el2.dataset.awayCn;
      const homeFlag = el2.dataset.homeFlag;
      const awayFlag = el2.dataset.awayFlag;
      const ht = { nameCN: homeCN, flag: homeFlag };
      const at = { nameCN: awayCN, flag: awayFlag };
      el2.innerHTML = _renderStatsHTML(data.stats, ht, at);
    })
    .catch(e => {
      console.warn('[MatchStats] fetch failed:', e.message);
      const el2 = document.getElementById('modal-match-stats');
      if (el2) el2.innerHTML = '';  // 靜默移除
    });
}

// 比賽元資料（modal 共用）
function _matchMeta(m) {
  const t = _tid();
  const isClub = _isClub();
  const _T = _teams();
  const ht = _T[m.home], at = _T[m.away];
  let phaseLabel, matchTag, matchTime, matchVenue, hRankLabel, aRankLabel;

  if (t === 'epl') {
    phaseLabel = m.matchday ? `第${m.matchday}輪` : '';
    matchTag = phaseLabel;
    matchTime = `🕒 ${(m.date||'').slice(5).replace('-','/')} ${m.time||''}`;
    matchVenue = '';
    hRankLabel = `英超 #${ht?.eplRank||'?'}`;
    aRankLabel = `英超 #${at?.eplRank||'?'}`;
  } else if (t === 'ucl') {
    phaseLabel = {league:'聯賽階段',playoff:'附加賽',r16:'十六強',qf:'八強',sf:'四強',final:'決賽'}[m.stage]||'';
    matchTag = `${phaseLabel}${m.md ? ' MD'+m.md : ''}${m.leg ? ' Leg'+m.leg : ''}`;
    matchTime = `🕒 ${(m.date||'').slice(5).replace('-','/')} ${m.time||''}`;
    matchVenue = m.venue ? `📍 ${m.venue}` : '';
    hRankLabel = `UEFA 係數 ${ht?.uefaCoeff||'?'}`;
    aRankLabel = `UEFA 係數 ${at?.uefaCoeff||'?'}`;
  } else {
    phaseLabel = {group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賽'}[m.phase]||'';
    matchTag = `${GROUPS[m.group]?.name||''} · ${phaseLabel}`;
    matchTime = `🕒 ${m.twDate?.slice(5).replace('-','/')} ${m.twTime} 台灣時間`;
    matchVenue = `📍 ${m.venue||''}, ${m.city||''}`;
    hRankLabel = `FIFA #${ht?.fifaRank||'?'}`;
    aRankLabel = `FIFA #${at?.fifaRank||'?'}`;
  }
  return { phaseLabel, matchTag, matchTime, matchVenue, hRankLabel, aRankLabel, isClub };
}

/* app.js — 導覽 + 倒計時 + 首頁 */

// ── 動態奪冠熱門預測（依剩餘球隊、近況、傷兵、對戰組合每日更新）──
function calcChampionOdds() {
  const t = _tid();
  const _T = _teams();
  const matches = _matches();
  if (!_T || !Object.keys(_T).length) return [];

  // 確保動態近況已建立
  if (typeof buildDynamicForm === 'function') buildDynamicForm();

  // ── 1. 找出仍存活的球隊 ──
  let aliveCodes;
  if (t === 'ucl') {
    // 歐冠淘汰賽：從比賽結果推算晉級隊伍
    aliveCodes = _getUCLAliveTeams(matches);
  } else if (t === 'epl') {
    // 英超：所有球隊都還在爭冠（但用排名加權）
    aliveCodes = Object.keys(_T);
  } else {
    // 世界盃：尚未開賽，所有球隊
    aliveCodes = Object.keys(_T);
  }

  // ── 2. 計算每隊奪冠力量分數 ──
  const scores = [];
  aliveCodes.forEach(code => {
    const team = _T[code];
    if (!team?.radar) return;
    const r = team.radar;

    // 基礎實力（加權平均 radar）
    const base = r.attack * 0.25 + r.defense * 0.2 + r.midfield * 0.25 + r.speed * 0.15 + r.experience * 0.15;

    // 傷兵扣分
    const inj = injuryImpact(team);
    const injPen = (inj.attack + inj.defense + inj.midfield + inj.speed) * 0.3;

    // 近況加成（動態 form 優先）
    const dynForm = _dynamicFormMap[code];
    const form = dynForm || team.recentForm || ['W','D','W','D','W'];
    const fScore = formScore(form);
    const formAdj = (fScore - 9) * 1.5; // 9=中位數(3W2D)，每分±1.5

    // 排名加成
    let rankAdj = 0;
    if (t === 'epl') {
      rankAdj = Math.max(0, 22 - (team.eplRank || 20)) * 1.2; // 排名越前加越多
    } else if (t === 'ucl') {
      rankAdj = (team.uefaCoeff || 50) * 0.12; // UEFA 係數加成
    } else {
      rankAdj = Math.max(0, 60 - (team.fifaRank || 50)) * 0.5; // FIFA 排名
    }

    const power = Math.max(1, base - injPen + formAdj + rankAdj);
    scores.push({ code, power, team, form, inj });
  });

  // ── 3. 歐冠：對戰組合難度調整（剩餘對手強度）──
  if (t === 'ucl' && scores.length <= 8) {
    const powerMap = {};
    scores.forEach(s => powerMap[s.code] = s.power);
    // 找出下一輪對手
    const sfMatches = matches.filter(m => m.stage === 'sf' && m.status === 'scheduled');
    const opponents = {};
    sfMatches.forEach(m => {
      if (powerMap[m.home] !== undefined) opponents[m.home] = m.away;
      if (powerMap[m.away] !== undefined) opponents[m.away] = m.home;
    });
    // 對手越弱，自己奪冠機率越高（反向加成）
    scores.forEach(s => {
      const opp = opponents[s.code];
      if (opp && powerMap[opp]) {
        const oppPower = powerMap[opp];
        s.power *= (1 + (s.power - oppPower) * 0.003); // 微調
      }
    });
  }

  // ── 4. 正規化為機率（指數放大強弱差距）──
  scores.sort((a, b) => b.power - a.power);
  const exponent = t === 'ucl' ? 3 : t === 'epl' ? 5 : 6;
  const expScores = scores.map(s => Math.pow(s.power, exponent));
  const totalExp = expScores.reduce((s, x) => s + x, 0);
  scores.forEach((s, i) => {
    s.pct = Math.max(1, Math.round(expScores[i] / totalExp * 100));
  });

  // ── 5. 取 top5 + 產生描述 ──
  const top = scores.slice(0, 5);
  top.forEach(s => {
    s.desc = _genChampionDesc(s, t);
  });

  return top;
}

// 取得歐冠仍存活球隊
function _getUCLAliveTeams(matches) {
  // 從淘汰賽結果推算：有 agg 的 leg:2 比賽 → 輸家被淘汰
  const eliminated = new Set();
  const koMatches = matches.filter(m =>
    ['playoff','r16','qf','sf'].includes(m.stage) && m.leg === 2 && m.status === 'finished' && m.agg
  );
  koMatches.forEach(m => {
    const hAgg = m.agg.h, aAgg = m.agg.a;
    if (hAgg > aAgg) eliminated.add(m.away);
    else if (aAgg > hAgg) eliminated.add(m.home);
    // 客場進球或 PK 的 edge case 略（目前資料夠明確）
  });

  // 從所有淘汰賽參賽隊中找仍存活的
  const allKO = new Set();
  matches.filter(m => ['playoff','r16','qf','sf','final'].includes(m.stage))
    .forEach(m => { if (m.home !== 'TBD') allKO.add(m.home); if (m.away !== 'TBD') allKO.add(m.away); });

  return [...allKO].filter(c => !eliminated.has(c));
}

// 動態產生奪冠描述
function _genChampionDesc(s, t) {
  const team = s.team;
  const kp = (team.keyPlayers || []).slice(0, 2).map(p => p.name.split(' ').pop()).join('+');
  const formW = (s.form || []).filter(f => f === 'W').length;
  const formL = (s.form || []).filter(f => f === 'L').length;
  const injCount = (team.injuries || []).length;

  let parts = [];
  // 核心球員
  if (kp) parts.push(`${kp}領銜`);
  // 近況
  if (formW >= 4) parts.push('近況火燙');
  else if (formW >= 3 && formL === 0) parts.push('近況穩定');
  else if (formL >= 2) parts.push('近況起伏');
  // 傷兵
  if (injCount >= 3) parts.push(`${injCount}人傷缺影響大`);
  else if (injCount >= 1) parts.push('小有傷兵隱患');
  // 風格
  if (team.style) {
    const styleShort = team.style.split('，')[0];
    if (styleShort.length <= 10) parts.push(styleShort);
  }

  return parts.slice(0, 3).join('，') || team.predDesc || '實力不容小覷';
}

// 首頁：冠軍預測
function renderChampions() {
  const t = _tid();
  const top5 = calcChampionOdds();
  const el = document.getElementById('champion-cards');
  if (!el) return;

  const _T = _teams();
  const cards = top5.map((t, i) => {
    const tm = _T[t.code];
    if (!tm) return '';
    const locked = !currentUser && i >= 2;
    return `<div class="champion-card${locked ? ' champion-card-locked' : ''}" onclick="${locked ? 'loginWithGoogle()' : "showSection('teams')"}">
      <div class="champion-rank">#${i+1}</div>
      <div class="champion-flag">${flagImg(tm.flag)}</div>
      <div class="champion-name">${tm.nameCN}</div>
      <div class="champion-prob" style="${locked ? 'filter:blur(6px);user-select:none' : ''}" id="champ-prob-${t.code}">${t.pct}%</div>
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
  if (!schedule.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">尚無賽程資料</div><div class="empty-state-desc">切換賽事或稍後再來看看</div></div>'; return; }

  // 俱樂部賽事: 進行中優先，再取尚未結束的比賽；WC: 直接取前6場
  let upcoming;
  if (_isClub()) {
    const live = schedule.filter(m => m.home && m.away && m.home !== 'TBD' && m.status === 'live');
    const sched = schedule.filter(m => m.home && m.away && m.home !== 'TBD' && m.status === 'scheduled');
    upcoming = [...live, ...sched].slice(0, 6);
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
      : _isEPL() ? (m.matchday ? `第${m.matchday}輪` : '') : '';
    const dateStr = _isClub() ? (m.date||'').slice(5).replace('-','/') : (m.twDate||'').slice(5).replace('-','/');
    const timeStr = _isClub() ? (m.time||'') : (m.twTime||'');
    const subInfo = _isEPL()
      ? `${dateStr} · ${stageLabel}`
      : _isUCL()
        ? `${dateStr} · ${stageLabel}${m.md ? ' MD'+m.md : ''}`
        : `${dateStr} · ${GROUPS[m.group]?.name||''}`;
    const isLive = m.status === 'live';
    const liveScore = isLive && m.score ? `${m.score.h} - ${m.score.a}` : null;
    const minuteText = isLive && m.minute ? `${m.minute}'` : '';
    return `<div class="upcoming-card${isLive ? ' match-live' : ''}" onclick="openPredModal('${m.id}')">
      ${isLive ? '<div class="live-badge"><span class="live-dot"></span>LIVE</div>' : ''}
      <div class="upcoming-teams">
        <div class="upcoming-team"><div class="upcoming-flag">${flagImg(ht.flag)}</div><div class="upcoming-name">${ht.nameCN}</div></div>
        <div class="upcoming-vs${isLive ? ' live-score' : ''}">${isLive && liveScore ? liveScore : m.status==='finished' && m.score ? m.score.h+' - '+m.score.a : 'VS'}${isLive && minuteText ? `<div class="live-minute">${minuteText}</div>` : ''}</div>
        <div class="upcoming-team"><div class="upcoming-flag">${flagImg(at.flag)}</div><div class="upcoming-name">${at.nameCN}</div></div>
      </div>
      <div class="upcoming-info">
        <div>
          <div class="upcoming-time">${isLive ? '⚽ 比賽進行中' : timeStr}${!isLive && !_isClub() ? ' 台灣時間' : ''}</div>
          <div style="font-size:12px;color:${isLive ? 'var(--accent)' : 'var(--text-muted)'}">${subInfo}</div>
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

// 首頁：歐冠淘汰賽對陣樹
function renderHomeBracket() {
  const section = document.getElementById('home-bracket-section');
  const el = document.getElementById('home-bracket');
  if (!section || !el) return;

  if (!_isUCL()) { section.style.display = 'none'; return; }
  // EPL 沒有淘汰賽樹（由上面條件已處理）
  section.style.display = '';

  const T = _teams(), M = window.UCL_MATCHES || [];
  const fm = id => M.find(m => m.id === id);

  // ── 兩回合 tie 結果 ──
  function tieR(id1, id2) {
    const l1 = fm(id1), l2 = fm(id2);
    const home = l1?.home || 'TBD', away = l1?.away || 'TBD';
    const aggH = (l1?.score?.h||0) + (l2?.score?.a||0);
    const aggA = (l1?.score?.a||0) + (l2?.score?.h||0);
    const done = l1?.status === 'finished' && l2?.status === 'finished';
    const partial = l1?.status === 'finished' && !done;
    const live = l1?.status === 'live' || l2?.status === 'live';
    const winner = done ? (aggH > aggA ? home : aggA > aggH ? away : null) : null;
    const dt = !done ? (l2?.date || l1?.date || '') : '';
    const clickId = l1?.status === 'finished' ? id2 : id1;
    const minute = live ? (l2?.status === 'live' ? l2?.minute : l1?.minute) : null;
    return { home, away, aggH, aggA, done, partial, live, winner, date: dt, clickId, minute };
  }

  // ── 單場結果（決賽）──
  function singleR(id) {
    const m = fm(id);
    const home = m?.home||'TBD', away = m?.away||'TBD';
    const done = m?.status === 'finished';
    return { home, away, aggH: m?.score?.h??null, aggA: m?.score?.a??null,
      done, partial: false, winner: done ? (m.score.h > m.score.a ? home : m.score.a > m.score.h ? away : null) : null,
      date: m?.date||'', venue: m?.venue, clickId: id };
  }

  // ── Bracket 資料（依對陣樹排列）──
  const r16 = [
    // 上半區 → QF(SCP/ARS) → SF(ATM vs ARS)
    tieR('UCL-R16-06','UCL-R16-09'), tieR('UCL-R16-05','UCL-R16-10'),
    // 上半區 → QF(BAR/ATM)
    tieR('UCL-R16-03','UCL-R16-13'), tieR('UCL-R16-02','UCL-R16-16'),
    // 下半區 → QF(RMA/BAY) → SF(PSG vs BAY)
    tieR('UCL-R16-08','UCL-R16-12'), tieR('UCL-R16-01','UCL-R16-15'),
    // 下半區 → QF(PSG/LIV)
    tieR('UCL-R16-07','UCL-R16-11'), tieR('UCL-R16-04','UCL-R16-14'),
  ];
  const qf = [
    tieR('UCL-QF-01','UCL-QF-07'), tieR('UCL-QF-03','UCL-QF-05'),
    tieR('UCL-QF-02','UCL-QF-08'), tieR('UCL-QF-04','UCL-QF-06'),
  ];
  const sf = [tieR('UCL-SF-01','UCL-SF-03'), tieR('UCL-SF-02','UCL-SF-04')];
  const fin = singleR('UCL-F-01');

  // ── 隊伍行 HTML ──
  function tmH(code, score, isW, isL) {
    if (code === 'TBD') return `<div class="hb-tm tbd"><span class="hb-n">待定</span></div>`;
    const t = T[code];
    return `<div class="hb-tm${isW?' w':''}${isL?' ld':''}">
      <span class="hb-f">${flagImg(t?.flag)}</span>
      <span class="hb-n">${t?.nameCN||code}</span>
      ${score !== null && score !== undefined ? `<span class="hb-s">${score}</span>` : ''}
    </div>`;
  }

  // ── 比賽卡片 HTML ──
  function mcH(d, col, rs, re, compact) {
    const { home, away, aggH, aggA, done, partial, live, winner, date, clickId, minute } = d;
    const show = done || partial || live;
    const hW = winner === home, aW = winner === away;
    const hL = (partial || live) && aggH > aggA, aL = (partial || live) && aggA > aggH;
    const cls = done ? 'done' : live ? 'live' : partial ? 'live' : 'soon';
    const hasTBD = home === 'TBD' || away === 'TBD';
    const click = (!hasTBD && clickId) ? ` onclick="openPredModal('${clickId}')"` : '';
    let foot = '';
    if (done) foot = `<div class="hb-agg">總 ${aggH}-${aggA}</div>`;
    else if (live) foot = `<div class="hb-dt live"><span class="live-dot"></span> LIVE${minute ? ` ${minute}'` : ''}</div>`;
    else if (partial) foot = `<div class="hb-dt live">🔴 次回合 ${date.slice(5).replace('-','/')}</div>`;
    else if (date) foot = `<div class="hb-dt">${date.slice(5).replace('-','/')}</div>`;
    return `<div class="hb-m hb-${cls}${compact?' compact':''}${click?' clickable':''}" style="grid-column:${col};grid-row:${rs}/${re}"${click}>
      ${tmH(home, show ? aggH : null, hW, hL)}
      ${tmH(away, show ? aggA : null, aW, aL)}
      ${foot}
    </div>`;
  }

  // ── 連接線 ──
  function connH(col, rs, re) {
    return `<div class="hb-c" style="grid-column:${col};grid-row:${rs}/${re}"></div>`;
  }

  // ── 組裝 HTML ──
  let html = '<div class="hb-tree">';

  // 標題列（row 1）
  html += `<div class="hb-lbl" style="grid-column:1;grid-row:1">十六強</div>`;
  html += `<div class="hb-lbl" style="grid-column:3;grid-row:1">八強</div>`;
  html += `<div class="hb-lbl hb-lbl-active" style="grid-column:5;grid-row:1">🔴 四強</div>`;
  html += `<div class="hb-lbl" style="grid-column:7;grid-row:1">🏆 決賽</div>`;

  // R16（col 1, rows 2-9）
  r16.forEach((d, i) => { html += mcH(d, 1, i + 2, i + 3, true); });

  // R16→QF 連接線（col 2）
  for (let i = 0; i < 4; i++) html += connH(2, i * 2 + 2, i * 2 + 4);

  // QF（col 3, 每場跨2行）
  qf.forEach((d, i) => { html += mcH(d, 3, i * 2 + 2, i * 2 + 4, false); });

  // QF→SF 連接線（col 4）
  html += connH(4, 2, 6);
  html += connH(4, 6, 10);

  // SF（col 5, 每場跨4行）
  html += mcH(sf[0], 5, 2, 6, false);
  html += mcH(sf[1], 5, 6, 10, false);

  // SF→Final 連接線（col 6）
  html += connH(6, 2, 10);

  // 決賽（col 7, 跨全部8行）
  const { home: fH, away: fA, aggH: fsH, aggA: fsA, done: fDone, winner: fW, date: fDate, venue: fVenue, clickId: fClick } = fin;
  const fHw = fW === fH, fAw = fW === fA;
  const fHasTBD = fH === 'TBD' || fA === 'TBD';
  const fClickAttr = (!fHasTBD && fClick) ? ` onclick="openPredModal('${fClick}')"` : '';
  let fFoot = '';
  if (fDone) fFoot = `<div class="hb-final-score">${fsH} - ${fsA}</div>`;
  else fFoot = `<div class="hb-dt">${(fDate||'').slice(5).replace('-','/')}${fVenue ? '<br>📍 ' + fVenue : ''}</div>`;
  html += `<div class="hb-m hb-final-m${fDone ? ' done' : ' soon'}${fClickAttr?' clickable':''}" style="grid-column:7;grid-row:2/10"${fClickAttr}>
    <div class="hb-trophy">🏆</div>
    ${tmH(fH, fDone ? fsH : null, fHw, false)}
    <div class="hb-vs">VS</div>
    ${tmH(fA, fDone ? fsA : null, fAw, false)}
    ${fFoot}
  </div>`;

  html += '</div>';
  el.innerHTML = html;
}

// 首頁：死亡組指數 / 歐冠聯賽排名
function renderDeathGroups() {
  const el = document.getElementById('death-groups');
  const header = document.getElementById('death-section-header');
  if (!el) return;

  if (_isEPL()) {
    // 英超：顯示即時積分榜前8名
    if (header) header.innerHTML = `<h2><i class="fas fa-table"></i> 聯賽積分榜</h2><span class="section-badge">即時排名</span>`;
    el.style.display = 'block';
    const standings = window._eplStandings || [];
    const _T = _teams();
    if (!standings.length) {
      el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">⏳ 載入積分榜中...</div>';
      // 首頁若尚未載入過積分榜，主動 fetch 一次（不等使用者切到數據頁）
      if (!window._eplStandingsFetching) {
        window._eplStandingsFetching = true;
        fetch('/api/epl-standings').then(r => r.json()).then(data => {
          window._eplStandingsFetching = false;
          if (data?.ok && data.standings?.length) {
            window._eplStandings = data.standings;
            window._eplCurrentMatchday = data.matchday;
            renderDeathGroups(); // 重新渲染
          } else {
            el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">📊 暫無積分榜資料</div>';
          }
        }).catch(() => {
          window._eplStandingsFetching = false;
          el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">⚠️ 積分榜載入失敗</div>';
        });
      }
      return;
    }
    const top8 = standings.slice(0, 8);
    const cols = 'grid-template-columns:36px 32px 1fr 50px 50px 50px 60px 60px';
    const zoneColor = (pos) => pos <= 4 ? '#4caf50' : pos <= 6 ? '#ff9800' : pos <= 7 ? '#2196f3' : 'var(--text-muted)';
    const zoneLabel = (pos) => pos <= 4 ? 'UCL' : pos <= 6 ? 'UEL' : pos <= 7 ? 'UECL' : '';
    el.innerHTML = `
      <div style="margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap;font-size:12px">
        <span style="color:var(--success)">● 1-4 歐冠</span>
        <span style="color:var(--warning)">● 5-6 歐霸</span>
        <span style="color:#2196f3">● 7 歐協聯</span>
        <span style="color:var(--danger)">● 18-20 降級</span>
      </div>
      <div style="background:rgba(255,255,255,0.03);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
        <div style="display:grid;${cols};gap:0;padding:10px 16px;font-size:11px;color:var(--text-muted);font-weight:600;border-bottom:1px solid var(--border)">
          <span>#</span><span></span><span>球隊</span><span style="text-align:center">賽</span><span style="text-align:center">勝</span><span style="text-align:center">負</span><span style="text-align:center">淨勝球</span><span style="text-align:right">積分</span>
        </div>
        ${top8.map((row, i) => {
          const code = row.teamTla;
          const t = _T[code];
          const crest = t?.flag || row.teamCrest || '';
          const name = t?.nameCN || row.team;
          const gd = row.goalDifference;
          return `<div class="home-standings-row" onclick="showSection('stats')" style="display:grid;${cols};gap:0;padding:12px 16px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s;${i%2?'':'background:rgba(255,255,255,0.02)'}">
            <span style="font-size:16px;font-weight:800;color:${zoneColor(row.position)}">${row.position}</span>
            <span style="font-size:22px">${flagImg(crest)}</span>
            <div><div style="font-weight:700;font-size:14px">${name}</div></div>
            <span style="text-align:center;font-size:13px;color:var(--text-secondary)">${row.playedGames}</span>
            <span style="text-align:center;font-size:13px;font-weight:700;color:#4caf50">${row.won}</span>
            <span style="text-align:center;font-size:13px;color:#f44336">${row.lost}</span>
            <span style="text-align:center;font-size:13px;font-weight:600;color:${gd>0?'#4caf50':gd<0?'#f44336':'var(--text-muted)'}">${gd>0?'+':''}${gd}</span>
            <div style="text-align:right"><span style="font-size:18px;font-weight:900;color:var(--accent)">${row.points}</span></div>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:center;margin-top:12px">
        <button onclick="showSection('stats')" style="padding:8px 20px;border-radius:999px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:var(--text-secondary);font-size:13px;cursor:pointer">
          查看完整積分榜 →
        </button>
      </div>`;
    return;
  }

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
            return `<div class="home-standings-row" onclick="showSection('stats')" style="display:grid;${cols};gap:0;padding:12px 16px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s;${i%2?'':'background:rgba(255,255,255,0.02)'}">
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
            return `<div class="home-standings-row" onclick="showSection('stats')" style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:rgba(255,255,255,0.03);border-radius:var(--radius-sm);border:1px solid var(--border);cursor:pointer;transition:background 0.15s">
              <span style="font-size:13px;font-weight:800;color:var(--text-muted);width:24px;text-align:center">${i+9}</span>
              <span style="font-size:20px">${flagImg(t.flag)}</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:700">${t.nameCN}</div><div style="font-size:10px;color:var(--text-muted)">${row.w}勝${row.d}平${row.l}負</div></div>
              <div style="text-align:right"><span style="font-size:15px;font-weight:800;color:var(--text-secondary)">${row.pts}</span><span class="text-muted-sm"> 分</span></div>
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
    {title:'四強對決即將登場',desc:'馬競 vs 兵工廠、巴黎 vs 拜仁，四支勁旅爭奪布達佩斯決賽門票'},
    {title:'拜仁 4-3 皇馬史詩之戰',desc:'八強次回合7球大戰，Güler 梅開二度仍無力回天，拜仁總比數 6-4 晉級'},
    {title:'巴黎後 Mbappé 時代蛻變',desc:'Dembélé 雙響淘汰利物浦、總比數 4-0 強勢晉級，巴黎重建成功'},
    {title:'馬競逆轉巴薩晉級',desc:'Lookman 關鍵進球助馬競總比數 3-2 淘汰巴薩，Simeone 再展鐵血本色'},
    {title:'Arsenal 歐冠四強新里程',desc:'兵工廠連續兩年晉級八強後首次殺入四強，Arteta 體系日趨成熟'},
    {title:'Kane 本季49球追逐金靴',desc:'Harry Kane 八強再度建功，本季各項賽事已攻入49球，劍指歐冠金靴'},
    {title:'Güler 紅牌爭議收場',desc:'皇馬新星 Arda Güler 八強梅開二度卻染紅離場，賽季遺憾告終'},
    {title:'Simeone 的防守哲學',desc:'馬競總比數 3-2 淘汰巴薩，Simeone 以少勝多的戰術再次奏效'},
    {title:'決賽在布達佩斯',desc:'2025/26 歐冠決賽移師匈牙利普斯卡什球場，中歐足球盛宴'},
    {title:'VAR 與半自動越位技術',desc:'科技持續改變歐冠判罰，爭議是否因此減少？'}
  ];

  const eplItems = [
    {title:'兵工廠能否終結20年聯賽荒？',desc:'Arteta打造的兵工廠已連續多季挑戰冠軍，今年能否終於圓夢？'},
    {title:'Salah的紅軍告別季？',desc:'合約即將到期的Salah能否用英超冠軍為利物浦生涯畫下完美句點？'},
    {title:'曼城王朝是否終結？',desc:'Rodri長期傷缺、陣容老化，Guardiola的曼城還能維持統治嗎？'},
    {title:'Cold Palmer統治英超',desc:'Cole Palmer連續兩季數據爆炸，他已經是英超最佳球員嗎？'},
    {title:'紐卡索的歐冠夢',desc:'沙特入主後穩步上升，Isak+Gordon組合帶隊重返歐洲之巔'},
    {title:'Amorim能拯救曼聯嗎？',desc:'三後衛體系改造進行中，曼聯能否重返英超前四？'},
    {title:'升班馬的生存戰',desc:'每年升班馬都面臨殘酷考驗，今年誰能在英超站穩腳跟？'},
    {title:'英超金靴之爭',desc:'Haaland vs Isak vs Salah，三方混戰的金靴競爭白熱化'},
    {title:'VAR持續引發爭議',desc:'影像助理裁判是否讓比賽更公平？球迷、教練意見兩極'},
    {title:'英超的全球化浪潮',desc:'日本、韓國、美國球員在英超大放異彩，全球化趨勢不可逆'}
  ];

  const items = _isEPL() ? eplItems : _isUCL() ? uclItems : wcItems;
  el.innerHTML = items.map((item,i) => `
    <div class="highlight-card">
      <div class="highlight-num">${String(i+1).padStart(2,'0')}</div>
      <div><div class="highlight-title">${item.title}</div><div class="highlight-desc">${item.desc}</div></div>
    </div>`).join('');
}

function showSection(id, scrollToId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.querySelectorAll('[data-section="' + id + '"]').forEach(b => b.classList.add('active'));
  document.getElementById('mobile-nav').classList.remove('open');
  if (scrollToId) {
    let _tries = 0;
    const _scroll = () => {
      const t = document.getElementById(scrollToId);
      if (t) { t.scrollIntoView({ behavior: 'smooth' }); }
      else if (++_tries < 30) { setTimeout(_scroll, 100); }
    };
    setTimeout(_scroll, 200);
  } else {
    window.scrollTo(0, 0);
  }
  // 觸發對應頁面渲染（確保切換賽事後資料正確）
  const _r = (fn) => { try { fn(); } catch(e) { console.error('[showSection]', e); } };
  if (id === 'home') {
    _r(() => updateHero());
    _r(() => renderChampions());
    _r(() => renderUpcoming());
    _r(() => renderHomeBracket());
    _r(() => renderDeathGroups());
    _r(() => renderHighlights());
    _r(() => { if (typeof renderHomeDailyChallenge === 'function') renderHomeDailyChallenge(); });
  }
  if (id === 'schedule')    _r(() => renderSchedule('all','all'));
  if (id === 'teams')       _r(() => renderTeams('all',''));
  if (id === 'stats')       _r(() => renderStats('standings'));
  if (id === 'focus')       _r(() => renderFocus());
  if (id === 'predictions') { _r(() => renderPredictions()); }
  if (id === 'arena')       _r(() => renderArena());
}

document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    showSection(btn.dataset.section);
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

// 我的預測記錄 Modal 篩選
document.getElementById('modal-pred-filter')?.addEventListener('click', e => {
  if (!e.target.dataset.mypred) return;
  document.querySelectorAll('#modal-pred-filter .filter-tab').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  renderMyPredHistory(e.target.dataset.mypred);
});

// AI預測頁
function renderPredictions() {
  const featEl = document.getElementById('featured-predictions');
  const listEl = document.getElementById('predictions-list');
  if (!featEl || !listEl) return;
  const _T = _teams();
  const schedule = _matches();

  let featuredMatches;
  if (_isEPL()) {
    // 英超：精選德比和Big Six對決
    const eplFeatPairs = [['ARS','LIV'],['MCI','ARS'],['LIV','MCI'],['CHE','TOT'],['MUN','LIV'],['NEW','ARS']];
    featuredMatches = eplFeatPairs.map(([h,a]) =>
      schedule.find(m => m.home===h && m.away===a) ||
      schedule.find(m => m.home===a && m.away===h)
    ).filter(Boolean).slice(0,6);
    // 補滿：取最近的比賽
    const fill = schedule.filter(m => m.home && m.away && m.home !== 'TBD');
    while (featuredMatches.length < 6 && fill.length > featuredMatches.length) {
      const m = fill[fill.length - 1 - featuredMatches.length];
      if (m && !featuredMatches.find(x => x.id === m.id)) featuredMatches.push(m);
      else break;
    }
  } else if (_isUCL()) {
    // 歐冠：挑選即將進行的 or 最近的精選比賽
    const uclFeatPairs = [['ATM','ARS'],['PSG','BAY'],['ARS','ATM'],['BAY','PSG'],['BAY','RMA'],['LIV','PSG']];
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
    const tagLabel = _isEPL()
      ? (m.matchday ? `第${m.matchday}輪` : '')
      : _isUCL()
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
          ? `<div class="pred-score-big" style="color:var(--success)">${m.score.h} – ${m.score.a}</div>`
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
        <div class="text-muted-sm">${_isClub() ? (m.date||'').slice(5).replace('-','/') + ' ' + (m.time||'') : (m.twDate?.slice(5).replace('-','/')||'') + ' ' + (m.twTime||'')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end">
        <span style="font-weight:700">${at.nameCN}</span>
        <span style="font-size:22px">${flagImg(at.flag)}</span>
      </div>
      <span class="confidence-badge confidence-${p.conf}">${p.hw}% - ${p.d}% - ${p.aw}%</span>
    </div>`;
  }).join('');
}

// ── 我的預測記錄 ──────────────────────────────────────────
function renderMyPredHistory(filter = 'all') {
  const el = document.getElementById('modal-pred-history');
  if (!el) return;

  // 收集所有賽事的預測
  const entries = [];
  ['wc26_', 'ucl26_', 'epl26_'].forEach(p => {
    const myPreds = (() => { try { return JSON.parse(localStorage.getItem(p + 'my_preds'))||{}; } catch { return {}; } })();
    const settled = (() => { try { return JSON.parse(localStorage.getItem(p + 'settled'))||{}; } catch { return {}; } })();
    const matches = p === 'epl26_' ? (window.EPL_MATCHES||[]) : p === 'ucl26_' ? (window.UCL_MATCHES||[]) : (typeof SCHEDULE!=='undefined' ? SCHEDULE : []);
    const teams = p === 'epl26_' ? (window.EPL_TEAMS||{}) : p === 'ucl26_' ? (window.UCL_TEAMS||{}) : (typeof TEAMS!=='undefined' ? TEAMS : {});
    const label = p === 'epl26_' ? '英超' : p === 'ucl26_' ? '歐冠' : '世界盃';

    for (const [matchId, pred] of Object.entries(myPreds)) {
      const m = matches.find(x => x.id === matchId);
      if (!m) continue;
      const ht = teams[m.home], at = teams[m.away];
      if (!ht || !at) continue;
      const s = settled[matchId] || null;
      entries.push({ matchId, pred, match: m, ht, at, settled: s, label, prefix: p });
    }
  });

  if (!entries.length) {
    el.innerHTML = `<div class="empty-hint">
      <div style="font-size:40px;margin-bottom:12px">🎯</div>
      <div>你還沒有任何預測紀錄</div>
      <div style="font-size:13px;margin-top:6px">在賽事預測頁面選擇比賽，開始你的第一場預測！</div>
    </div>`;
    return;
  }

  // 排序：未結算在前（按比賽日期升序），已結算在後（按結算時間降序）
  entries.sort((a, b) => {
    const aSettled = !!a.settled, bSettled = !!b.settled;
    if (aSettled !== bSettled) return aSettled ? 1 : -1;
    if (!aSettled) return (a.match.date||'') < (b.match.date||'') ? -1 : 1;
    return (b.settled.settledAt||'') < (a.settled.settledAt||'') ? -1 : 1;
  });

  // 篩選
  const filtered = filter === 'settled' ? entries.filter(e => e.settled)
    : filter === 'pending' ? entries.filter(e => !e.settled)
    : entries;

  // 統計
  const totalPreds = entries.length;
  const settledCount = entries.filter(e => e.settled).length;
  const correctDir = entries.filter(e => e.settled?.direction).length;
  const exactCount = entries.filter(e => e.settled?.exact).length;
  const accuracy = settledCount > 0 ? Math.round(correctDir / settledCount * 100) : 0;

  let html = `<div class="my-pred-stats" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
    <div class="pred-stat-card"><span class="pred-stat-num">${totalPreds}</span><span class="pred-stat-label">總預測</span></div>
    <div class="pred-stat-card"><span class="pred-stat-num">${settledCount}</span><span class="pred-stat-label">已結算</span></div>
    <div class="pred-stat-card"><span class="pred-stat-num" style="color:var(--success)">${correctDir}</span><span class="pred-stat-label">猜對方向</span></div>
    <div class="pred-stat-card"><span class="pred-stat-num" style="color:#f5a623">${exactCount}</span><span class="pred-stat-label">精準比分</span></div>
    <div class="pred-stat-card"><span class="pred-stat-num">${accuracy}%</span><span class="pred-stat-label">準確率</span></div>
  </div>`;

  html += filtered.map(e => {
    const { pred, match: m, ht, at, settled: s, label } = e;
    const isClub = e.prefix !== 'wc26_';
    const dateStr = isClub ? (m.date||'').slice(5).replace('-','/') : (m.twDate||m.date||'').slice(5).replace('-','/');
    const time = isClub ? (m.time||'') : (m.twTime||m.time||'');

    let resultHtml, statusCls;
    if (s) {
      if (s.exact) {
        resultHtml = `<span class="pred-result pred-exact">🎯 精準命中</span>`;
        statusCls = 'pred-row-exact';
      } else if (s.goalDiffMatch) {
        resultHtml = `<span class="pred-result pred-goaldiff">✅ 猜中比分差</span>`;
        statusCls = 'pred-row-correct';
      } else if (s.direction) {
        resultHtml = `<span class="pred-result pred-correct">✅ 方向正確</span>`;
        statusCls = 'pred-row-correct';
      } else {
        resultHtml = `<span class="pred-result pred-wrong">❌ 未命中</span>`;
        statusCls = 'pred-row-wrong';
      }
      resultHtml += ` <span class="pred-xp-reward">+${s.xp} XP${s.gem ? ` +${s.gem}💎` : ''}</span>`;
    } else {
      resultHtml = `<span class="pred-result pred-pending">⏳ 等待開賽</span>`;
      statusCls = 'pred-row-pending';
    }

    return `<div class="pred-history-row ${statusCls}" onclick="closePredModal();openPredModal('${e.matchId}')">
      <div class="pred-h-meta">
        <span class="pred-h-label">${label}</span>
        <span class="pred-h-date">${dateStr} ${time}</span>
      </div>
      <div class="pred-h-match">
        <span class="pred-h-team">${flagImg(ht.flag)} ${ht.nameCN}</span>
        <span class="pred-h-score">${pred.h} - ${pred.a}</span>
        <span class="pred-h-team">${at.nameCN} ${flagImg(at.flag)}</span>
      </div>
      ${s ? `<div class="pred-h-actual">實際比分：${s.actH} - ${s.actA}</div>` : ''}
      <div class="pred-h-result">${resultHtml}</div>
    </div>`;
  }).join('');

  el.innerHTML = html;
}

// 開啟預測記錄 Modal
function openMyPredModal() {
  const modal = document.getElementById('pred-history-modal');
  if (!modal) return;
  // 重置 filter
  document.querySelectorAll('#modal-pred-filter .filter-tab').forEach(b => b.classList.remove('active'));
  document.querySelector('#modal-pred-filter .filter-tab[data-mypred="all"]')?.classList.add('active');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderMyPredHistory('all');
  // 標記已讀：記錄當前已結算數
  _markPredSeen();
  // 關閉 dropdown
  document.getElementById('user-dropdown')?.classList.remove('open');
}
function closePredModal() {
  const modal = document.getElementById('pred-history-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Badge 通知：計算未讀預測數（新預測 + 新結算都算）
function _getPredTotal() {
  let preds = 0, settled = 0;
  ['wc26_', 'ucl26_', 'epl26_'].forEach(p => {
    try { preds += Object.keys(JSON.parse(localStorage.getItem(p + 'my_preds'))||{}).length; } catch {}
    try { settled += Object.keys(JSON.parse(localStorage.getItem(p + 'settled'))||{}).length; } catch {}
  });
  return preds + settled;
}
function _markPredSeen() {
  localStorage.setItem('pred_seen_total', _getPredTotal());
  _updatePredBadge();
}
function _updatePredBadge() {
  const seen = parseInt(localStorage.getItem('pred_seen_total'))||0;
  const total = _getPredTotal();
  const unseen = Math.max(0, total - seen);
  // dropdown 內的 badge
  const badge = document.getElementById('pred-badge');
  if (badge) {
    badge.textContent = unseen;
    badge.style.display = unseen > 0 ? 'inline-flex' : 'none';
  }
  // nav widget 上的小紅點
  const navBadge = document.getElementById('nav-pred-badge');
  if (unseen > 0) {
    if (!navBadge) {
      const w = document.getElementById('nav-user-widget');
      if (w) {
        const b = document.createElement('span');
        b.id = 'nav-pred-badge'; b.className = 'nav-pred-badge';
        b.textContent = unseen;
        w.appendChild(b);
      }
    } else { navBadge.textContent = unseen; navBadge.style.display = 'flex'; }
  } else if (navBadge) { navBadge.style.display = 'none'; }
}

// 頁面載入時更新 badge
document.addEventListener('DOMContentLoaded', () => setTimeout(_updatePredBadge, 1500));

// 統一的比賽預測 Modal（所有入口都走這裡）
async function openPredModal(id) {
  const schedule = _matches();
  const match = schedule.find(x => x.id === id);
  const isKnockout = _isClub()
    ? false
    : (match && match.phase && match.phase !== 'group');
  const spendType = isKnockout ? 'unlock_knockout' : 'unlock_match'
  const cost = isKnockout ? 2 : 1

  // 立即顯示 modal + loading 動畫，不讓用戶感覺沒反應
  const modal = document.getElementById('team-modal');
  const mc = document.getElementById('modal-content');
  const _isMatchFinished = match && match.status === 'finished' && match.score;
  const _isMatchLive = match && match.status === 'live';
  mc.innerHTML = `<div class="modal-loading">
    <div class="modal-spinner"></div>
    <div class="modal-loading-text">${_isMatchLive ? '⚽ 載入即時數據...' : _isMatchFinished ? '⚽ 載入賽事結果...' : '⚡ AI 正在分析賽事...'}</div>
    <div class="modal-loading-sub">${_isMatchLive ? '即時比分 · 進球紀錄 · 比賽數據' : _isMatchFinished ? '統計數據 · 比分回顧 · 預測比較' : '比對歷史數據 · 計算勝率 · 生成預測'}</div>
  </div>`;
  modal.classList.add('open');

  // 下一幀再渲染完整內容（讓 loading 畫面先顯示）
  requestAnimationFrame(() => setTimeout(async () => {
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

  // ── 未開賽比賽：即時拉取兩隊最新近況 ──────────────────────
  if (m.status === 'scheduled' && m.home !== 'TBD') {
    try {
      const league = _isEPL() ? 'epl' : _isUCL() ? 'ucl' : 'wc';
      const resp = await fetch(`/api/team-form?teams=${m.home},${m.away}&league=${league}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.ok && json.data) {
          // 將 API 回傳的即時近況寫入動態 map
          Object.entries(json.data).forEach(([code, info]) => {
            if (info.form && info.form.length >= 2) {
              _dynamicFormMap[code] = info.form;
            }
          });
          // 更新 loading 訊息
          const loadingText = mc.querySelector('.modal-loading-text');
          if (loadingText) loadingText.textContent = '⚡ 即時數據已取得，生成分析中...';
          window._lastLiveFormData = json.data; // 保存供 modal 顯示
          window._lastLiveFormTime = json.updated;
        }
      }
    } catch (e) {
      console.warn('[team-form API]', e.message); // 失敗不阻斷，用靜態資料
    }
  }

  // 判斷是否已解鎖
  const isUnlocked = !!(window.unlockedMatchSet?.has(id));

  const p   = calcPred(ht, at);

  // ── 已完成比賽：顯示賽果 + 數據 + 預測比較 ──────────────
  const isFinished = m.status === 'finished' && m.score;
  if (isFinished) {
    const meta = _matchMeta(m);
    const { matchTag, matchTime, matchVenue, hRankLabel, aRankLabel } = meta;

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
          ${m.referee ? `<span class="match-tag">🧑‍⚖️ ${m.referee}</span>` : ''}
        </div>
      </div>

      <!-- 比分結果（大字醒目）-->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px">
        <div style="text-align:center;flex:1;min-width:0">
          <div class="icon-xl">${flagImg(ht.flag)}</div>
          <div class="team-name-truncate">${ht.nameCN}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${hRankLabel}</div>
        </div>
        <div style="text-align:center;padding:0 8px;flex-shrink:0">
          <div style="font-size:52px;font-weight:900;color:#fff;letter-spacing:6px">${hGoal} – ${aGoal}</div>
          <div style="font-size:14px;font-weight:700;color:${resultColor};margin-top:4px">${resultText}</div>
          ${aggHTML}
        </div>
        <div style="text-align:center;flex:1;min-width:0">
          <div class="icon-xl">${flagImg(at.flag)}</div>
          <div class="team-name-truncate">${at.nameCN}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${aRankLabel}</div>
        </div>
      </div>

      <!-- AI 預測 vs 實際結果 -->
      <div style="background:var(--accent-bg);border-radius:12px;padding:16px;margin:20px 0;border:1px solid var(--accent-border)">
        <div style="font-size:14px;font-weight:800;color:var(--accent);margin-bottom:12px;text-align:center">🤖 AI 預測 vs 實際結果</div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;text-align:center">
          <div>
            <div class="text-muted-sm-mb">AI 賽前預測</div>
            <div style="font-size:28px;font-weight:900;color:var(--accent)">${predH} – ${predA}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${ht.nameCN}勝率 ${p.hw}%</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted)">vs</div>
          <div>
            <div class="text-muted-sm-mb">實際結果</div>
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
        <div class="panel-subtle">
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

      <!-- 半場比分 -->
      ${m.halfTime ? `
      <div style="text-align:center;margin:8px 0;font-size:12px;color:var(--text-muted)">
        半場比分 ${m.halfTime.h} – ${m.halfTime.a}
      </div>` : ''}

      <!-- 黃紅牌紀錄 -->
      ${m.bookings && m.bookings.length > 0 ? `
      <div style="margin:16px 0">
        <div class="modal-section-title">🟨 犯規紀錄</div>
        <div class="panel-subtle">
          ${m.bookings.map(b => {
            const isHome = b.side === 'h';
            const cardIcon = b.card === 'red' ? '🟥' : b.card === 'yellow_red' ? '🟨🟥' : '🟨';
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);${isHome ? '' : 'flex-direction:row-reverse;text-align:right'}">
              <div style="min-width:42px;font-size:13px;font-weight:800;color:var(--text-muted);${isHome ? 'text-align:right' : 'text-align:left'}">${b.min}'</div>
              <div style="font-size:14px">${cardIcon}</div>
              <div style="flex:1;font-size:13px;color:var(--text-secondary)">${b.player}</div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 換人紀錄 -->
      ${m.substitutions && m.substitutions.length > 0 ? `
      <div style="margin:16px 0">
        <div class="modal-section-title">🔄 換人紀錄</div>
        <div class="panel-subtle">
          ${m.substitutions.map(s => {
            const isHome = s.side === 'h';
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);${isHome ? '' : 'flex-direction:row-reverse;text-align:right'}">
              <div style="min-width:42px;font-size:13px;font-weight:800;color:var(--text-muted);${isHome ? 'text-align:right' : 'text-align:left'}">${s.min}'</div>
              <div style="flex:1;${isHome ? '' : 'text-align:right'}">
                <span style="font-size:12px;color:#4caf50">▲ ${s.playerIn}</span>
                <span style="font-size:11px;color:var(--text-muted);margin:0 4px">←</span>
                <span style="font-size:12px;color:#ef5350">▼ ${s.playerOut}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 賽事數據統計（需付費 API，暫時隱藏）-->
      ${m.stats ? _renderStatsHTML(m.stats, {nameCN: typeof ht?.nameCN==='string'?ht.nameCN:'', flag: ht?.flag||''}, {nameCN: typeof at?.nameCN==='string'?at.nameCN:'', flag: at?.flag||''}) : ''}

      <!-- 關鍵球員 -->
      <div class="modal-players-grid">
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
            <div class="text-muted-sm-mb">你的預測</div>
            <div style="font-size:24px;font-weight:900;color:var(--blue)">${mine.h} – ${mine.a}</div>
          </div>
          <div style="font-size:20px;color:var(--text-muted)">vs</div>
          <div>
            <div class="text-muted-sm-mb">實際結果</div>
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

  // ── 進行中比賽：即時比分 + 進球 + 數據 ──────────────
  const isLive = m.status === 'live';
  if (isLive) {
    const meta = _matchMeta(m);
    const { matchTag, matchVenue, hRankLabel, aRankLabel } = meta;
    const hGoal = m.score?.h ?? 0, aGoal = m.score?.a ?? 0;
    const minuteText = m.minute ? `${m.minute}'` : '進行中';

    document.getElementById('modal-content').innerHTML = `
      <!-- 賽事資訊 -->
      <div style="text-align:center;margin-bottom:16px">
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:8px">
          <span class="live-badge" style="font-size:13px;padding:4px 12px"><span class="live-dot"></span>LIVE ${minuteText}</span>
          <span class="match-tag group">${matchTag}</span>
          ${matchVenue ? `<span class="match-tag">${matchVenue}</span>` : ''}
          ${m.referee ? `<span class="match-tag">🧑‍⚖️ ${m.referee}</span>` : ''}
        </div>
      </div>

      <!-- 即時比分（大字醒目 + 脈動效果）-->
      <div style="background:linear-gradient(135deg, rgba(255,69,58,0.12), rgba(255,69,58,0.04));border:1px solid rgba(255,69,58,0.3);border-radius:16px;padding:24px 16px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="text-align:center;flex:1;min-width:0">
            <div class="icon-xl">${flagImg(ht.flag)}</div>
            <div class="team-name-truncate">${ht.nameCN}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${hRankLabel}</div>
          </div>
          <div style="text-align:center;padding:0 8px;flex-shrink:0">
            <div class="live-score-big" style="font-size:56px;font-weight:900;letter-spacing:8px">${hGoal} – ${aGoal}</div>
            <div style="margin-top:6px"><span class="live-badge"><span class="live-dot"></span>${minuteText}</span></div>
          </div>
          <div style="text-align:center;flex:1;min-width:0">
            <div class="icon-xl">${flagImg(at.flag)}</div>
            <div class="team-name-truncate">${at.nameCN}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${aRankLabel}</div>
          </div>
        </div>
      </div>

      <!-- 進球時間線 -->
      ${m.goals && m.goals.length > 0 ? `
      <div style="margin:16px 0">
        <div class="modal-section-title">⚽ 進球紀錄</div>
        <div class="panel-subtle">
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
      </div>` : `
      <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:14px">⚽ 暫無進球</div>`}

      <!-- 半場比分 -->
      ${m.halfTime ? `
      <div style="text-align:center;margin:8px 0;font-size:12px;color:var(--text-muted)">
        半場比分 ${m.halfTime.h} – ${m.halfTime.a}
      </div>` : ''}

      <!-- 黃紅牌紀錄 -->
      ${m.bookings && m.bookings.length > 0 ? `
      <div style="margin:16px 0">
        <div class="modal-section-title">🟨 犯規紀錄</div>
        <div class="panel-subtle">
          ${m.bookings.map(b => {
            const isHome = b.side === 'h';
            const cardIcon = b.card === 'red' ? '🟥' : b.card === 'yellow_red' ? '🟨🟥' : '🟨';
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);${isHome ? '' : 'flex-direction:row-reverse;text-align:right'}">
              <div style="min-width:42px;font-size:13px;font-weight:800;color:var(--text-muted);${isHome ? 'text-align:right' : 'text-align:left'}">${b.min}'</div>
              <div style="font-size:14px">${cardIcon}</div>
              <div style="flex:1;font-size:13px;color:var(--text-secondary)">${b.player}</div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 換人紀錄 -->
      ${m.substitutions && m.substitutions.length > 0 ? `
      <div style="margin:16px 0">
        <div class="modal-section-title">🔄 換人紀錄</div>
        <div class="panel-subtle">
          ${m.substitutions.map(s => {
            const isHome = s.side === 'h';
            return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);${isHome ? '' : 'flex-direction:row-reverse;text-align:right'}">
              <div style="min-width:42px;font-size:13px;font-weight:800;color:var(--text-muted);${isHome ? 'text-align:right' : 'text-align:left'}">${s.min}'</div>
              <div style="flex:1;${isHome ? '' : 'text-align:right'}">
                <span style="font-size:12px;color:#4caf50">▲ ${s.playerIn}</span>
                <span style="font-size:11px;color:var(--text-muted);margin:0 4px">←</span>
                <span style="font-size:12px;color:#ef5350">▼ ${s.playerOut}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 賽事數據統計（需付費 API，暫時隱藏）-->

      <!-- AI 賽前預測 -->
      <div style="background:var(--accent-bg);border-radius:12px;padding:16px;margin:16px 0;border:1px solid var(--accent-border)">
        <div style="font-size:14px;font-weight:800;color:var(--accent);margin-bottom:12px;text-align:center">🤖 AI 賽前預測</div>
        <div style="display:flex;justify-content:center;gap:24px;text-align:center">
          <div>
            <div class="text-muted-sm-mb">${ht.nameCN} 勝率</div>
            <div style="font-size:22px;font-weight:900;color:var(--accent)">${p.hw}%</div>
          </div>
          <div>
            <div class="text-muted-sm-mb">平局</div>
            <div style="font-size:22px;font-weight:900;color:var(--text-secondary)">${p.d}%</div>
          </div>
          <div>
            <div class="text-muted-sm-mb">${at.nameCN} 勝率</div>
            <div style="font-size:22px;font-weight:900;color:var(--accent)">${p.aw}%</div>
          </div>
        </div>
        <div style="text-align:center;margin-top:10px;font-size:12px;color:var(--text-muted)">預測比分 ${p.score}</div>
      </div>

      <!-- 球隊實力對比 -->
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

      <div style="text-align:center;padding:12px;font-size:12px;color:var(--text-muted);border-top:1px solid rgba(255,255,255,0.06)">
        即時數據每 60 秒自動更新 · <a href="javascript:void(0)" onclick="(_isEPL()?EPLLive:UCLLive).refresh().then(()=>openPredModal('${m.id}'))" style="color:var(--accent);text-decoration:none">🔄 手動刷新</a>
      </div>
    `;
    modal.scrollTop = 0;
    return;
  }
  // ── END 進行中比賽 ──────────────────────────────────────

  const pts = generateAnalysis(ht, at, p);
  const hForm = p.hForm || (p.hWC ? p.hWC.recentForm : (ht.recentForm||['W','D','W','W','D']));
  const aForm = p.aForm || (p.aWC ? p.aWC.recentForm : (at.recentForm||['W','D','W','W','D']));
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

  const meta = _matchMeta(m);
  const { matchTag, matchTime, matchVenue, hRankLabel, aRankLabel } = meta;

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
        <div class="icon-xl">${flagImg(ht.flag)}</div>
        <div class="team-name-truncate">${ht.nameCN}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${hRankLabel}</div>
        <div class="text-muted-sm">${ht.formation}</div>
      </div>
      <div style="text-align:center;padding:0 8px;flex-shrink:0">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">AI 預測比分</div>
        <div style="font-size:44px;font-weight:900;color:var(--accent);letter-spacing:4px;${isUnlocked ? '' : 'filter:blur(10px);user-select:none'}">${p.score}</div>
        <div style="font-size:11px;color:var(--text-muted);margin:4px 0">xG ${p.hXG} — ${p.aXG}</div>
        <div class="confidence-badge confidence-${p.conf}">${p.confLabel}</div>
      </div>
      <div style="text-align:center;flex:1;min-width:0">
        <div class="icon-xl">${flagImg(at.flag)}</div>
        <div class="team-name-truncate">${at.nameCN}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${aRankLabel}</div>
        <div class="text-muted-sm">${at.formation}</div>
      </div>
    </div>

    <!-- 你的預測（含鎖定倒數）— 移到最上方 -->
    ${(()=>{
      const _predPrefix = {ucl:'ucl26_my_preds',epl:'epl26_my_preds',wc:'wc26_my_preds'}[_tid()] || 'wc26_my_preds';
      const myPreds = (() => { try { return JSON.parse(localStorage.getItem(_predPrefix))||{}; } catch { return {}; } })();
      const mine = myPreds[m.id];
      let kickoffMs = 0;
      if (_isClub() && m.date && m.time) kickoffMs = new Date(m.date+'T'+m.time+':00+08:00').getTime();
      else if (m.twDate && m.twTime) kickoffMs = new Date(m.twDate+'T'+m.twTime+':00+08:00').getTime();
      const now = Date.now();
      const matchStatus = m.status || (kickoffMs > 0 && now >= kickoffMs ? 'started' : 'scheduled');
      const isLocked = matchStatus !== 'scheduled' || (kickoffMs > 0 && now >= kickoffMs);
      const msLeft = kickoffMs > 0 ? kickoffMs - now : 0;
      const showCountdown = !isLocked && msLeft > 0 && msLeft < 48 * 3600000;
      const urgencyClass = msLeft < 30*60000 ? 'urgent' : msLeft < 2*3600000 ? 'warn' : '';

      return `<div class="my-pred-section pred-top" id="my-pred-section-${m.id}">
        ${showCountdown ? `<div class="pred-countdown ${urgencyClass}" id="pred-cd-${m.id}" data-kickoff="${kickoffMs}">⏰ 計算中...</div>` : ''}
        ${isLocked ? `
          ${mine ? `
            <div class="my-pred-result">
              <div class="my-pred-score">${flagImg(ht.flag)} ${mine.h} – ${mine.a} ${flagImg(at.flag)}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px">🔒 預測已鎖定</div>
              <button class="my-pred-share-btn" style="margin-top:8px" onclick="shareMyPrediction('${m.id}')">📤 分享預測</button>
            </div>` : `
            <div class="my-pred-prompt">
              <div style="font-size:13px;color:rgba(255,69,58,0.7);text-align:center;padding:12px">🔒 比賽已開始，無法填寫預測</div>
            </div>`}
        ` : `
          ${mine ? `
            <div class="my-pred-result">
              <div class="my-pred-score">${flagImg(ht.flag)} ${mine.h} – ${mine.a} ${flagImg(at.flag)}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px">
                已預測 · ${new Date(mine.savedAt).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
              </div>
              <div style="display:flex;gap:8px;justify-content:center;margin-top:6px">
                <button class="my-pred-edit-btn" onclick="openMyPredInput('${m.id}','${ht.nameCN}','${at.nameCN}')">修改</button>
                <button class="my-pred-share-btn" onclick="shareMyPrediction('${m.id}')">📤 分享</button>
              </div>
            </div>` : `
            <div class="my-pred-prompt pred-cta">
              <div style="font-size:15px;font-weight:800;margin-bottom:6px">🎯 預測這場比分</div>
              <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;font-size:11px;color:var(--text-muted);margin-bottom:4px;line-height:1.8">
                <span>參與 <b style="color:var(--text-muted)">+1 XP</b></span>
                <span>失敗 <b style="color:#ef9a9a">+2 XP</b></span>
                <span>輸贏 <b style="color:var(--green)">+10 XP</b></span>
                <span>比分差 <b style="color:var(--warning)">+15 XP +1💎</b></span>
                <span>精準 <b style="color:var(--accent)">+30 XP +3💎</b></span>
              </div>
              <div class="pred-countdown" id="pred-cd-${m.id}" data-kickoff="${kickoffMs}" style="margin-bottom:10px">⏰ 計算中...</div>
              <button class="btn-primary" style="width:100%;font-size:14px;padding:12px" onclick="openMyPredInput('${m.id}','${ht.nameCN}','${at.nameCN}')">
                ✏️ 填入我的預測
              </button>
            </div>`}
        `}
      </div>`;
    })()}

    <!-- 免費顯示：關鍵球員 -->
    <div class="modal-players-grid">
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
            <div><div style="font-size:22px;font-weight:900;color:var(--green)">${p.hw}%</div><div class="text-muted-sm">${ht.nameCN} 勝</div></div>
            <div><div style="font-size:22px;font-weight:900;color:var(--text-secondary)">${p.d}%</div><div class="text-muted-sm">平局</div></div>
            <div><div style="font-size:22px;font-weight:900;color:var(--red)">${p.aw}%</div><div class="text-muted-sm">${at.nameCN} 勝</div></div>
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
        <div class="modal-section-title">⚡ AI 戰術分析</div>
        <ul class="pred-key-points" style="margin-bottom:16px">
          ${pts.map(pt=>`<li>${pt}</li>`).join('')}
        </ul>

        <!-- 球隊風格 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px">
            <div class="text-accent-sm" style="margin-bottom:6px">${flagImg(ht.flag)} ${ht.nameCN} 踢法</div>
            <div style="font-size:12px;color:var(--text-secondary)">${ht.style||''}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--green)">✓ ${(ht.strengths||['整體實力強'])[0]}</div>
            <div style="font-size:12px;color:#ef9a9a">✗ ${(ht.weaknesses||['有待觀察'])[0]}</div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px">
            <div class="text-accent-sm" style="margin-bottom:6px">${flagImg(at.flag)} ${at.nameCN} 踢法</div>
            <div style="font-size:12px;color:var(--text-secondary)">${at.style||''}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--green)">✓ ${(at.strengths||['整體實力強'])[0]}</div>
            <div style="font-size:12px;color:#ef9a9a">✗ ${(at.weaknesses||['有待觀察'])[0]}</div>
          </div>
        </div>

        <!-- 近期狀態 -->
        <div class="modal-section-title">📈 ${p.wcFormAdj ? '滾動式動態分析（已更新預測）' : '近期狀態（最近5場）'}</div>
        ${p.wcFormAdj ? `<div style="margin-bottom:10px;padding:8px 12px;background:rgba(76,175,80,0.1);border-radius:8px;border-left:3px solid #4caf50;font-size:12px;color:#4caf50">
          ⚡ 預測已根據實際賽果與傷兵狀況動態調整
          ${window._lastLiveFormTime ? `<br><span style="opacity:0.7">📡 即時數據取得時間：${new Date(window._lastLiveFormTime).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>` : ''}
        </div>` : ''}
        ${(ht.injuries?.length || at.injuries?.length) ? `<div style="margin-bottom:10px;padding:8px 12px;background:rgba(255,152,0,0.1);border-radius:8px;border-left:3px solid #ff9800;font-size:12px;color:#ff9800">
          🏥 傷兵影響已納入預測模型：${ht.injuries?.length ? ht.nameCN+' '+ht.injuries.length+'人傷缺' : ''}${ht.injuries?.length && at.injuries?.length ? '、' : ''}${at.injuries?.length ? at.nameCN+' '+at.injuries.length+'人傷缺' : ''}
        </div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span style="font-size:20px">${flagImg(ht.flag)}</span>${formDots(hForm)}
              <span style="font-size:12px;color:var(--text-muted)">${formScore(hForm)}分</span>
            </div>
            ${p.hWC ? `<div class="text-muted-sm">
              ${p.hWC.played}場：${p.hWC.win}勝${p.hWC.draw}平${p.hWC.lose}負
              · 進${p.hWC.gf}失${p.hWC.ga}（場均進球 ${p.hWC.gfPerGame}）
            </div>` : ''}
            ${(() => { const ld = window._lastLiveFormData?.[m.home]; return ld?.matches ? `<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">${ld.matches.slice(0,3).map(x=>`<div style="padding:2px 0">${x.venue==='H'?'主':'客'} vs ${x.opponent} <b>${x.score}</b></div>`).join('')}</div>` : ''; })()}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
              <span style="font-size:20px">${flagImg(at.flag)}</span>${formDots(aForm)}
              <span style="font-size:12px;color:var(--text-muted)">${formScore(aForm)}分</span>
            </div>
            ${p.aWC ? `<div class="text-muted-sm">
              ${p.aWC.played}場：${p.aWC.win}勝${p.aWC.draw}平${p.aWC.lose}負
              · 進${p.aWC.gf}失${p.aWC.ga}（場均進球 ${p.aWC.gfPerGame}）
            </div>` : ''}
            ${(() => { const ld = window._lastLiveFormData?.[m.away]; return ld?.matches ? `<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">${ld.matches.slice(0,3).map(x=>`<div style="padding:2px 0">${x.venue==='H'?'主':'客'} vs ${x.opponent} <b>${x.score}</b></div>`).join('')}</div>` : ''; })()}
          </div>
        </div>

        <!-- 焦點球員對決 -->
        <div style="background:var(--accent-bg);border-radius:10px;padding:14px;border-left:3px solid var(--accent)">
          <div class="text-accent-sm" style="margin-bottom:6px">⚽ 焦點球員對決</div>
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
                <span class="tag-subtle">🎯 大小球</span>
                <span class="tag-subtle">🔁 讓球盤</span>
                <span class="tag-subtle">🅱 雙方進球</span>
                <span class="tag-subtle">⛳ 角球數</span>
                <span class="tag-subtle">🟨 黃牌數</span>
                <span class="tag-subtle">⏱ 半場比分</span>
                <span class="tag-subtle">🏥 傷兵狀況</span>
                <span class="tag-subtle">📋 陣型詳解</span>
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

    `;

  // modal 已在 loading 階段開啟，這裡只捲到頂部
  modal.scrollTop = 0;
  // 啟動預測鎖定倒數計時
  startPredCountdowns();

  // 若深度分析已解鎖，自動展開（不再消耗寶石）
  if (window.unlockedDeepSet?.has(m.id)) {
    setTimeout(() => openDeepAnalysis(m.id, m.home, m.away), 0)
  }

  // 賽事數據統計：需付費 API（API-Football），暫時停用
  // if ((m.status === 'finished' || m.status === 'live') && !m.stats && m.date) {
  //   _fetchMatchStats(m.home, m.away, m.date);
  // }
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
    completeDailyTask?.('unlock_match');
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
      <div class="text-accent-sm" style="margin-bottom:6px">⚽ 大小球（Poisson 模型）</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">預測比分 ${p.score}（總進球 <strong style="color:var(--text-primary)">${lambda}</strong>）· xG ${hXG}–${aXG}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        ${[['大 1.5', pOver15], ['大 2.5', pOver25], ['大 3.5', pOver35]].map(([label, prob]) => `
          <div style="text-align:center;background:rgba(255,255,255,0.03);border-radius:8px;padding:10px 8px">
            <div class="text-muted-sm-mb">${label}</div>
            <div style="font-size:22px;font-weight:900;color:${pColor(prob)}">${prob}%</div>
            ${probBar(prob, pColor(prob))}
          </div>`).join('')}
      </div>
    </div>

    <!-- BTTS + 亞盤 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div class="text-accent-sm" style="margin-bottom:10px">🥅 兩隊都進球</div>
        <div style="text-align:center">
          <div style="font-size:28px;font-weight:900;color:${pColor(pBTTS)}">${pBTTS}%</div>
          <div style="font-size:11px;color:var(--text-muted);margin:4px 0">${pBTTS >= 55 ? '較可能發生' : '較不可能'}</div>
          ${probBar(pBTTS, pColor(pBTTS))}
          <div style="font-size:10px;color:var(--text-muted);margin-top:6px">${flagImg(ht.flag)} ${pHomeSc}% · ${flagImg(at.flag)} ${pAwaySc}%</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div class="text-accent-sm" style="margin-bottom:10px">⚖️ 亞盤讓球</div>
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
        <div class="text-accent-sm" style="margin-bottom:10px">🚩 角球預測</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="text-align:center">
            <div class="text-muted-sm">${flagImg(ht.flag)}</div>
            <div style="font-size:22px;font-weight:800">${hCorners}</div>
          </div>
          <div style="text-align:center">
            <div class="text-muted-sm">合計</div>
            <div style="font-size:22px;font-weight:800;color:var(--accent)">${totalCorners}</div>
          </div>
          <div style="text-align:center">
            <div class="text-muted-sm">${flagImg(at.flag)}</div>
            <div style="font-size:22px;font-weight:800">${aCorners}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:center">盤口 ${cornerLine} 建議<strong style="color:${pColor(cornerOverProb)}">${cornerOverProb >= 55 ? '大' : '小'}</strong>（${cornerOverProb}%）</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px">
        <div class="text-accent-sm" style="margin-bottom:10px">🟨 黃牌預測</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="text-align:center">
            <div class="text-muted-sm">${flagImg(ht.flag)}</div>
            <div style="font-size:22px;font-weight:800">${hCards}</div>
          </div>
          <div style="text-align:center">
            <div class="text-muted-sm">合計</div>
            <div style="font-size:22px;font-weight:800;color:#ffd54f">${totalCards}</div>
          </div>
          <div style="text-align:center">
            <div class="text-muted-sm">${flagImg(at.flag)}</div>
            <div style="font-size:22px;font-weight:800">${aCards}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);text-align:center">盤口 ${cardsLine} 建議<strong style="color:${pColor(cardsOverProb)}">${cardsOverProb >= 55 ? '大' : '小'}</strong>（${cardsOverProb}%）</div>
      </div>
    </div>

    <!-- 上半場分析 -->
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:10px">
      <div class="text-accent-sm" style="margin-bottom:10px">⏱️ 上半場走向</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;margin-bottom:10px">
        <div><div style="font-size:18px;font-weight:900;color:var(--green)">${htHW}%</div><div class="text-muted-sm">${ht.nameCN} 領先</div></div>
        <div><div style="font-size:18px;font-weight:900;color:var(--text-secondary)">${htD}%</div><div class="text-muted-sm">平手</div></div>
        <div><div style="font-size:18px;font-weight:900;color:var(--red)">${htAW}%</div><div class="text-muted-sm">${at.nameCN} 領先</div></div>
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
      <div class="text-accent-sm" style="margin-bottom:10px">⚔️ 歷史交手紀錄</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:8px">
        <div><div style="font-size:20px;font-weight:800;color:var(--green)">${h2h.wins ?? '—'}</div><div class="text-muted-sm">${ht.nameCN} 勝</div></div>
        <div><div style="font-size:20px;font-weight:800;color:var(--text-secondary)">${h2h.draws ?? '—'}</div><div class="text-muted-sm">平局</div></div>
        <div><div style="font-size:20px;font-weight:800;color:var(--red)">${h2h.losses ?? '—'}</div><div class="text-muted-sm">${at.nameCN} 勝</div></div>
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
        <div class="text-accent-sm" style="margin-bottom:6px">${flagImg(ht.flag)} ${ht.formation}</div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">${ht.formationDesc || ht.style || '陣型詳解待更新'}</div>
        ${ht.strengths?.length ? `<div style="margin-top:8px;font-size:11px;color:var(--green)">✓ ${ht.strengths[0]}</div>` : ''}
        ${ht.strengths?.[1] ? `<div style="font-size:11px;color:var(--green)">✓ ${ht.strengths[1]}</div>` : ''}
      </div>
      <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:12px">
        <div class="text-accent-sm" style="margin-bottom:6px">${flagImg(at.flag)} ${at.formation}</div>
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

// ── 動態近況計算（從實際比賽結果推算 recentForm）──────────────
let _dynamicFormMap = {};

function buildDynamicForm() {
  _dynamicFormMap = {};
  const matches = _matches();
  if (!matches || !matches.length) return;

  // 收集每支球隊已完成比賽的勝負平
  const teamResults = {};
  const finished = matches
    .filter(m => m.status === 'finished' && m.score && m.home && m.away)
    .sort((a,b) => ((a.date||'')+(a.time||'')) < ((b.date||'')+(b.time||'')) ? -1 : 1);

  finished.forEach(m => {
    const hGoals = m.score.h, aGoals = m.score.a;
    if (!teamResults[m.home]) teamResults[m.home] = [];
    if (!teamResults[m.away]) teamResults[m.away] = [];
    teamResults[m.home].push(hGoals > aGoals ? 'W' : hGoals < aGoals ? 'L' : 'D');
    teamResults[m.away].push(aGoals > hGoals ? 'W' : aGoals < hGoals ? 'L' : 'D');
  });

  // 取最近5場作為動態 recentForm
  Object.entries(teamResults).forEach(([code, results]) => {
    if (results.length >= 2) {
      _dynamicFormMap[code] = results.slice(-5);
    }
  });
}

// ── 傷兵影響計算（根據傷兵名單降低 radar 值）─────────────────
function injuryImpact(team) {
  const injuries = team.injuries || [];
  if (!injuries.length) return { attack:0, defense:0, midfield:0, speed:0 };

  let atkPen = 0, defPen = 0, midPen = 0, spdPen = 0;
  const keyNames = (team.keyPlayers||[]).map(p => p.name);

  injuries.forEach(inj => {
    const isKey = keyNames.some(n => inj.name.includes(n) || n.includes(inj.name));
    const weight = isKey ? 1.5 : 0.6; // 主力球員影響更大
    const pos = (inj.pos||'').toLowerCase();

    if (pos.includes('前鋒') || pos.includes('翼') || pos.includes('攻擊')) {
      atkPen += 4 * weight;
      spdPen += 2 * weight;
    } else if (pos.includes('中場')) {
      midPen += 4 * weight;
      atkPen += 1.5 * weight;
    } else if (pos.includes('後衛') || pos.includes('後')) {
      defPen += 4 * weight;
      spdPen += 1 * weight;
    } else if (pos.includes('門將')) {
      defPen += 3 * weight;
    }
  });

  // 上限：每項最多扣 15 分
  return {
    attack:  Math.min(15, Math.round(atkPen)),
    defense: Math.min(15, Math.round(defPen)),
    midfield:Math.min(15, Math.round(midPen)),
    speed:   Math.min(10, Math.round(spdPen))
  };
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
  if (!ht?.radar || !at?.radar) return { hw:33, d:34, aw:33, score:'0-0', hXG:'0.0', aXG:'0.0', conf:'low', confLabel:'低信心', seed:0, wcFormAdj:false, hWC:null, aWC:null, hForm:[], aForm:[], hInj:{attack:0,defense:0,midfield:0,speed:0}, aInj:{attack:0,defense:0,midfield:0,speed:0}, dynamicAdj:false };
  // ── 傷兵影響：動態降低 radar 值 ────────────────────────────
  const hInj = injuryImpact(ht), aInj = injuryImpact(at);
  const ha = {
    attack:  Math.max(40, (ht.radar.attack||70)  - hInj.attack),
    defense: Math.max(40, (ht.radar.defense||70) - hInj.defense),
    midfield:Math.max(40, (ht.radar.midfield||70)- hInj.midfield),
    speed:   Math.max(40, (ht.radar.speed||70)   - hInj.speed),
    experience: ht.radar.experience || 50
  };
  const aa = {
    attack:  Math.max(40, (at.radar.attack||70)  - aInj.attack),
    defense: Math.max(40, (at.radar.defense||70) - aInj.defense),
    midfield:Math.max(40, (at.radar.midfield||70)- aInj.midfield),
    speed:   Math.max(40, (at.radar.speed||70)   - aInj.speed),
    experience: at.radar.experience || 50
  };

  // 用球隊名稱產生確定性種子，確保同場比賽永遠顯示相同預測
  const seed = Array.from(ht.nameCN+at.nameCN).reduce((s,c)=>s+c.charCodeAt(0),0) % 97;

  // 取得賽中狀態（有則用實際，無則用靜態）
  const hWC = _wcFormMap[ht.code] || null;
  const aWC = _wcFormMap[at.code] || null;
  const wcFormAdj = !!(hWC || aWC); // 是否有賽中資料

  // ── 動態近況：優先用比賽結果推算，其次賽中資料，最後靜態 ──
  const hDynForm = _dynamicFormMap[ht.code || ht.name];
  const aDynForm = _dynamicFormMap[at.code || at.name];
  const hForm = hDynForm || (hWC ? hWC.recentForm : (ht.recentForm || ['W','D','W','D','W']));
  const aForm = aDynForm || (aWC ? aWC.recentForm : (at.recentForm || ['W','D','W','D','W']));
  const dynamicAdj = !!(hDynForm || aDynForm || hWC || aWC);

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
  if (_isEPL()) {
    // 英超：用 eplRank 差（排名越低=越強，用客隊-主隊 + 主場優勢）
    const rankDiff = (at.eplRank||10) - (ht.eplRank||10);
    rankAdj = Math.min(20, Math.max(-20, rankDiff * 1.2));
    rankAdj += 3; // 英超主場優勢加成
    rankGap = Math.abs(rankDiff);
  } else if (_isUCL()) {
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
    wcFormAdj: wcFormAdj || dynamicAdj, // 是否套用動態狀態
    hWC, aWC,           // 各隊賽中資料（供 modal 顯示）
    hForm, aForm,       // 實際使用的近況（供分析文字用）
    hInj, aInj,         // 傷兵影響值（供分析文字用）
    dynamicAdj          // 是否有動態調整
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

  // 近期狀態（優先使用 calcPred 計算的動態近況）
  const hForm = pred.hForm || ht.recentForm || ['W','D','W','W','D'];
  const aForm = pred.aForm || at.recentForm || ['W','D','W','W','D'];
  const hFS = formScore(hForm), aFS = formScore(aForm);
  if (hFS > aFS + 3)
    lines.push(`近期狀態 ${ht.nameCN}（${hForm.join('')}，${hFS}分）明顯優於 ${at.nameCN}（${aForm.join('')}，${aFS}分），士氣與信心是關鍵加分`);
  else if (aFS > hFS + 3)
    lines.push(`${at.nameCN} 近期狀態更佳（${aForm.join('')}，${aFS}分 vs ${hFS}分），來勢洶洶不可小覷`);
  else
    lines.push(`雙方近期狀態相當（${ht.nameCN} ${hFS}分 / ${at.nameCN} ${aFS}分），心理素質將是決勝關鍵`);

  // 傷兵影響分析
  const hInjuries = ht.injuries || [], aInjuries = at.injuries || [];
  if (hInjuries.length >= 3)
    lines.push(`⚠️ ${ht.nameCN} 傷兵嚴重（${hInjuries.length}人缺陣），包括${hInjuries.slice(0,2).map(i=>i.name).join('、')}等主力，整體戰力大打折扣`);
  else if (hInjuries.length >= 1)
    lines.push(`${ht.nameCN} 有${hInjuries.length}名球員傷缺（${hInjuries.map(i=>i.name).join('、')}），陣容完整度受影響`);
  if (aInjuries.length >= 3)
    lines.push(`⚠️ ${at.nameCN} 傷兵嚴重（${aInjuries.length}人缺陣），包括${aInjuries.slice(0,2).map(i=>i.name).join('、')}等主力，整體戰力大打折扣`);
  else if (aInjuries.length >= 1)
    lines.push(`${at.nameCN} 有${aInjuries.length}名球員傷缺（${aInjuries.map(i=>i.name).join('、')}），陣容完整度受影響`);

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
  window._lastLiveFormData = null;
  window._lastLiveFormTime = null;
}

// ── 首頁 Hero 區塊切換 ──────────────────────────────────
function updateHero() {
  const t = _tid();
  const isUcl = t === 'ucl', isEpl = t === 'epl';
  const badge = document.getElementById('hero-badge');
  const title = document.getElementById('hero-title');
  const desc  = document.getElementById('hero-desc');
  const date  = document.getElementById('countdown-date');
  const stats = document.getElementById('hero-stats');
  const label = document.querySelector('.countdown-label');
  if (badge) badge.textContent = isEpl ? '🦁 PREMIER LEAGUE 2025/26' : isUcl ? '🏆 UEFA CHAMPIONS LEAGUE 2025/26' : '🏆 2026 FIFA WORLD CUP';
  if (title) title.innerHTML   = isEpl ? '英超<br><span class="hero-highlight">預測分析平台</span>' : isUcl ? '歐冠<br><span class="hero-highlight">預測分析平台</span>' : '世界盃<br><span class="hero-highlight">預測分析平台</span>';
  if (desc)  desc.textContent  = isEpl ? '結合AI數據分析，帶你深入解讀2025/26英格蘭超級聯賽每一場對決' : isUcl ? '結合AI數據分析，帶你深入解讀2025/26歐冠聯賽每一場對決' : '結合AI數據分析與專家洞察，帶你深入解讀2026美加墨世界盃每一場賽事';
  if (date)  date.textContent  = isEpl ? '2025年8月16日 開幕 · 英格蘭' : isUcl ? '2025年9月17日 開幕 · 歐洲各地' : '2026年6月11日 開幕 · 美國 / 加拿大 / 墨西哥';
  if (label) label.textContent = isEpl ? '英超賽季進行中' : isUcl ? '歐冠賽季進行中' : '距離開幕還有';
  if (stats) stats.innerHTML   = isEpl
    ? `<div class="hero-stat"><span class="hero-stat-num">20</span><span class="hero-stat-label">參賽球會</span></div>
       <div class="hero-stat"><span class="hero-stat-num">380</span><span class="hero-stat-label">場比賽</span></div>
       <div class="hero-stat"><span class="hero-stat-num">38</span><span class="hero-stat-label">比賽週</span></div>
       <div class="hero-stat"><span class="hero-stat-num">${window._eplCurrentMatchday || '—'}</span><span class="hero-stat-label">目前輪次</span></div>`
    : isUcl
    ? `<div class="hero-stat"><span class="hero-stat-num">36</span><span class="hero-stat-label">參賽球會</span></div>
       <div class="hero-stat"><span class="hero-stat-num">189</span><span class="hero-stat-label">場比賽</span></div>
       <div class="hero-stat"><span class="hero-stat-num">8</span><span class="hero-stat-label">聯賽輪次</span></div>
       <div class="hero-stat"><span class="hero-stat-num">SF</span><span class="hero-stat-label">目前階段</span></div>`
    : `<div class="hero-stat"><span class="hero-stat-num">48</span><span class="hero-stat-label">參賽球隊</span></div>
       <div class="hero-stat"><span class="hero-stat-num">104</span><span class="hero-stat-label">場比賽</span></div>
       <div class="hero-stat"><span class="hero-stat-num">16</span><span class="hero-stat-label">比賽場館</span></div>
       <div class="hero-stat"><span class="hero-stat-num">39</span><span class="hero-stat-label">比賽天數</span></div>`;
}

// 倒計時
(function countdown() {
  function tick() {
    const t = _tid();
    const target = t === 'epl'
      ? new Date('2025-08-16T12:30:00+01:00')  // EPL 2025/26 開幕
      : t === 'ucl'
      ? new Date('2025-09-17T21:00:00+02:00')  // UCL 2025/26 開幕
      : new Date('2026-06-11T19:00:00-06:00');   // WC 2026 開幕
    const diff = target - Date.now();
    const openLabel = t === 'epl' ? '🦁 英超賽季進行中！' : t === 'ucl' ? '🏆 歐冠賽季進行中！' : '🏆 世界盃已開幕！';
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

// 賽程頁：自動滑動到即將進行的比賽
function _scrollToUpcoming(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    // 優先找 live 比賽
    let target = container.querySelector('.match-card[data-match-status="live"]');
    if (!target) {
      // 找第一場 scheduled 比賽
      target = container.querySelector('.match-card[data-match-status="scheduled"]');
    }
    if (!target) {
      // 所有比賽都結束了，找最後一場 finished
      const all = container.querySelectorAll('.match-card[data-match-status="finished"]');
      target = all.length ? all[all.length - 1] : null;
    }
    if (!target) return;

    // 找到對應的日期 header（前一個兄弟元素）
    const header = target.previousElementSibling?.classList.contains('schedule-day-header')
      ? target.previousElementSibling : target;

    // 計算滾動位置：目標元素距離頁面頂部，減去 header 高度和一些間距
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68;
    const y = header.getBoundingClientRect().top + window.scrollY - headerH - 20;

    setTimeout(() => {
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }, 100);
  });
}

// 賽程頁
function renderSchedule(phaseFilter, groupFilter) {
  const el = document.getElementById('schedule-list');
  if (!el) return;
  const _T = _teams();

  if (_isEPL()) {
    // ── 英超賽程 ──
    _renderEPLFilters();
    const mdFilter = groupFilter || 'all';
    let list = (window.EPL_MATCHES||[]).filter(m => {
      if (mdFilter !== 'all') {
        const mdNum = parseInt(mdFilter.replace('mw',''));
        if (m.matchday && m.matchday !== mdNum) return false;
      }
      return true;
    }).sort((a, b) => (a.date+a.time) < (b.date+b.time) ? -1 : 1);

    if (!list.length) {
      el.innerHTML = '<div class="empty-hint"><div class="icon-lg">⏳</div>載入英超賽程中...<br><small>資料從 football-data.org 即時取得</small></div>';
      return;
    }

    let lastDate = '';
    el.innerHTML = list.map(m => {
      let header = '';
      if (m.date && m.date !== lastDate) {
        lastDate = m.date;
        const d = new Date(m.date);
        const days = ['日','一','二','三','四','五','六'];
        header = `<div class="schedule-day-header">📅 ${m.date.replace(/-/g,'/')} （週${days[d.getDay()]}）</div>`;
      }
      const ht = _T[m.home], at = _T[m.away];
      if (!ht || !at) return header;
      const isLive = m.status === 'live';
      const scoreDisplay = isLive && m.score
        ? `<div class="match-vs live-score" style="font-size:20px;font-weight:800">${m.score.h} - ${m.score.a}</div>${m.minute ? `<div class="live-minute">${m.minute}'</div>` : ''}`
        : m.status === 'finished' && m.score
          ? `<div class="match-vs" style="font-size:20px;font-weight:800">${m.score.h} - ${m.score.a}</div>`
          : `<div class="match-vs">VS</div>`;
      const eplPreds = (() => { try { return JSON.parse(localStorage.getItem('epl26_my_preds'))||{}; } catch { return {}; } })();
      const eplMine = eplPreds[m.id];
      const eplPredTag = (m.status === 'finished' || m.status === 'live') ? '' : eplMine
        ? `<div class="match-pred-tag predicted">${eplMine.h}-${eplMine.a} 已預測</div>`
        : `<div class="match-pred-tag">🎯 預測比分</div>`;
      return header + `<div class="match-card${isLive ? ' match-live' : ''}" data-match-status="${m.status||'scheduled'}" data-match-date="${m.date||''}" onclick="openPredModal('${m.id}')">
        ${isLive ? '<div class="live-badge"><span class="live-dot"></span>LIVE</div>' : ''}
        <div class="match-team">
          <div class="match-team-flag">${flagImg(ht.flag)}</div>
          <div><div class="match-team-name">${ht.nameCN}</div><div class="match-team-sub">英超 #${ht.eplRank||''}</div></div>
        </div>
        <div class="match-center">
          ${scoreDisplay}
          <div class="match-time">${isLive ? '⚽ 進行中' : m.time||''}</div>
          <div class="match-date">${m.date?.slice(5).replace('-','/')||''}</div>
          <div class="match-meta">
            <span class="match-tag group">${m.matchday ? '第'+m.matchday+'輪' : ''}</span>
          </div>
          ${eplPredTag}
        </div>
        <div class="match-team away">
          <div class="match-team-flag">${flagImg(at.flag)}</div>
          <div><div class="match-team-name">${at.nameCN}</div><div class="match-team-sub">英超 #${at.eplRank||''}</div></div>
        </div>
      </div>`;
    }).join('');
    _scrollToUpcoming(el);
    return;
  }

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

    if (!list.length) { el.innerHTML = '<div class="empty-hint">暫無賽事資料</div>'; return; }

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
      const isLive = m.status === 'live';
      const scoreDisplay = isLive && m.score
        ? `<div class="match-vs live-score" style="font-size:20px;font-weight:800">${m.score.h} - ${m.score.a}</div>${m.minute ? `<div class="live-minute">${m.minute}'</div>` : ''}`
        : m.status === 'finished' && m.score
          ? `<div class="match-vs" style="font-size:20px;font-weight:800">${m.score.h} - ${m.score.a}</div>`
          : `<div class="match-vs">VS</div>`;
      const aggText = m.agg ? `<div class="text-muted-sm">總比分 ${m.agg.h}-${m.agg.a}</div>` : '';
      const uclPreds = (() => { try { return JSON.parse(localStorage.getItem('ucl26_my_preds'))||{}; } catch { return {}; } })();
      const uclMine = uclPreds[m.id];
      const uclKo = (m.date && m.time) ? new Date(m.date+'T'+m.time+':00+08:00').getTime() : 0;
      const uclPredTag = (m.status === 'finished' || m.status === 'live') ? '' : uclMine
        ? `<div class="match-pred-tag predicted">${uclMine.h}-${uclMine.a} 已預測</div>`
        : `<div class="match-pred-tag" data-pred-cd="${uclKo}">🎯 預測比分</div>`;
      return header + `<div class="match-card${isLive ? ' match-live' : ''}" data-match-status="${m.status||'scheduled'}" data-match-date="${m.date||''}" onclick="openPredModal('${m.id}')">
        ${isLive ? '<div class="live-badge"><span class="live-dot"></span>LIVE</div>' : ''}
        <div class="match-team">
          <div class="match-team-flag">${flagImg(ht.flag)}</div>
          <div><div class="match-team-name">${ht.nameCN}</div><div class="match-team-sub">${ht.league}</div></div>
        </div>
        <div class="match-center">
          ${scoreDisplay}
          ${aggText}
          <div class="match-time">${isLive ? '⚽ 進行中' : m.time||''}</div>
          <div class="match-date">${m.date?.slice(5).replace('-','/')||''}</div>
          <div class="match-meta">
            <span class="match-tag group">${stageLabel}${m.md ? ' MD'+m.md : ''}${m.leg ? ' Leg'+m.leg : ''}</span>
          </div>
          ${uclPredTag}
        </div>
        <div class="match-team away">
          <div class="match-team-flag">${flagImg(at.flag)}</div>
          <div><div class="match-team-name">${at.nameCN}</div><div class="match-team-sub">${at.league}</div></div>
        </div>
      </div>`;
    }).join('');
    _scrollToUpcoming(el);
    return;
  }

  // ── 世界盃賽程（原邏輯）── 還原篩選器
  _renderWCScheduleFilters();
  let list = SCHEDULE.filter(m => {
    if (phaseFilter && phaseFilter !== 'all' && m.phase !== phaseFilter) return false;
    if (groupFilter && groupFilter !== 'all' && m.group !== groupFilter) return false;
    return true;
  }).sort((a, b) => {
    const ka = (a.twDate || '') + (a.twTime || '');
    const kb = (b.twDate || '') + (b.twTime || '');
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  if (!list.length) { el.innerHTML = '<div class="empty-hint">暫無賽事資料</div>'; return; }
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
    const wcPreds = (() => { try { return JSON.parse(localStorage.getItem('wc26_my_preds'))||{}; } catch { return {}; } })();
    const wcMine = wcPreds[m.id];
    const wcKo = (m.twDate && m.twTime) ? new Date(m.twDate+'T'+m.twTime+':00+08:00').getTime() : 0;
    const wcStarted = wcKo > 0 && Date.now() >= wcKo;
    const wcPredTag = wcStarted ? '' : wcMine
      ? `<div class="match-pred-tag predicted">${wcMine.h}-${wcMine.a} 已預測</div>`
      : `<div class="match-pred-tag" data-pred-cd="${wcKo}">🎯 預測比分</div>`;
    return header + `<div class="match-card" data-match-status="${m.status||'scheduled'}" data-match-date="${m.twDate||''}" onclick="openPredModal('${m.id}')">
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
        ${wcPredTag}
      </div>
      <div class="match-team away">
        <div class="match-team-flag">${flagImg(at.flag)}</div>
        <div><div class="match-team-name">${at.nameCN}</div><div class="match-team-sub">FIFA #${at.fifaRank}</div></div>
      </div>
    </div>`;
  }).join('');
  _scrollToUpcoming(el);
}

// 歐冠賽程篩選器
function _renderEPLFilters() {
  const phaseEl = document.getElementById('phase-filter');
  const groupEl = document.getElementById('group-filter');
  if (phaseEl) {
    phaseEl.innerHTML = '<button class="filter-tab active" data-phase="all">全部</button>';
  }
  if (groupEl) {
    // 顯示比賽週篩選器（取得已有的 matchday）
    const matchdays = [...new Set((window.EPL_MATCHES||[]).map(m => m.matchday).filter(Boolean))].sort((a,b) => a-b);
    const currentMD = window._eplCurrentMatchday || matchdays[matchdays.length - 1] || 1;
    groupEl.innerHTML = '<button class="filter-tab active" data-group="all">全部</button>' +
      matchdays.slice(-10).map(d => `<button class="filter-tab${d===currentMD?' highlight':''}" data-group="mw${d}">第${d}輪</button>`).join('');
    const label = groupEl.closest('.filter-group')?.querySelector('label');
    if (label) label.textContent = '比賽週';
  }
}

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

function _renderWCScheduleFilters() {
  const phaseEl = document.getElementById('phase-filter');
  const groupEl = document.getElementById('group-filter');
  if (phaseEl) {
    phaseEl.innerHTML = ['all','group','r32','r16','qf','sf','final'].map(s => {
      const label = {all:'全部',group:'小組賽',r32:'32強',r16:'16強',qf:'八強',sf:'四強',final:'決賽'}[s];
      return `<button class="filter-tab${s==='all'?' active':''}" data-phase="${s}">${label}</button>`;
    }).join('');
  }
  if (groupEl) {
    groupEl.innerHTML = '<button class="filter-tab active" data-group="all">全部</button>' +
      'ABCDEFGHIJKL'.split('').map(g => `<button class="filter-tab" data-group="${g}">${g}組</button>`).join('');
  }
  // 還原 label
  const label = groupEl?.closest('.filter-group')?.querySelector('label');
  if (label) label.textContent = '小組篩選';
}

// 球隊頁
function renderTeams(confFilter, search) {
  const el = document.getElementById('teams-grid');
  if (!el) return;
  const _T = _teams();

  if (_isEPL()) {
    _renderEPLTeamFilters();
    let list = Object.entries(_T).filter(([code, t]) => {
      if (confFilter && confFilter !== 'all') {
        if (confFilter === 'top6' && (t.eplRank||99) > 6) return false;
        if (confFilter === 'mid' && ((t.eplRank||0) <= 6 || (t.eplRank||0) > 14)) return false;
        if (confFilter === 'bottom' && (t.eplRank||0) <= 14) return false;
      }
      if (search && !t.nameCN.includes(search) && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a,b) => (a[1].eplRank||99) - (b[1].eplRank||99));
    el.innerHTML = list.map(([code, t]) => `
      <div class="team-card" onclick="openTeamModal('${code}')">
        <div class="team-card-flag">${flagImg(t.flag)}</div>
        <div class="team-card-name">${t.nameCN}</div>
        <div class="team-card-conf">英超</div>
        <div class="team-card-rank">排名 #${t.eplRank||'?'}</div>
        <div class="team-card-group">${t.coach||''}</div>
      </div>`).join('');
    return;
  }

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

  // 世界盃：還原篩選器為聯盟
  _renderWCTeamFilters();
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

function _renderEPLTeamFilters() {
  const confEl = document.getElementById('conf-filter');
  if (confEl) {
    confEl.innerHTML = [['all','全部'],['top6','前六'],['mid','中游'],['bottom','後段']].map(([v,l]) =>
      `<button class="filter-tab${v==='all'?' active':''}" data-conf="${v}">${l}</button>`
    ).join('');
  }
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

function _renderWCTeamFilters() {
  const confEl = document.getElementById('conf-filter');
  if (!confEl) return;
  const confs = [
    ['all','全部'],['UEFA','歐洲'],['CONMEBOL','南美'],['CAF','非洲'],
    ['AFC','亞洲'],['CONCACAF','北中美'],['OFC','大洋洲']
  ];
  confEl.innerHTML = confs.map(([v,l]) =>
    `<button class="filter-tab${v==='all'?' active':''}" data-conf="${v}">${l}</button>`
  ).join('');
}

// 數據頁
function renderStats(tab) {
  const el = document.getElementById('stats-content');
  if (!el) return;

  // ── 英超數據頁 ──
  if (_isEPL() && tab === 'standings') {
    el.innerHTML = `<div class="empty-hint">
      <div class="icon-lg">⏳</div>載入積分榜中...</div>`;
    fetch('/api/epl-standings').then(r => r.json()).then(data => {
      if (!data.ok || !data.standings?.length) {
        el.innerHTML = `<div class="empty-hint">
          <div class="icon-lg">📊</div>暫無數據</div>`;
        return;
      }
      window._eplStandings = data.standings;
      window._eplCurrentMatchday = data.matchday;
      const _T = _teams();
      const rows = data.standings.map((row, i) => {
        const code = row.teamTla;
        const t = _T[code];
        const crest = t?.flag || row.teamCrest || '';
        const name = t?.nameCN || row.team;
        const zone = row.position <= 4 ? 'standings-qualify' : row.position >= 18 ? 'standings-elim' : '';
        return `<tr class="${zone}">
          <td class="standings-pos">${row.position}</td>
          <td>${flagImg(crest)} ${name}</td>
          <td>${row.playedGames}</td><td>${row.won}</td><td>${row.draw}</td><td>${row.lost}</td>
          <td>${row.goalsFor}</td><td>${row.goalsAgainst}</td><td>${row.goalDifference>0?'+':''}${row.goalDifference}</td>
          <td><strong>${row.points}</strong></td>
          <td style="font-size:11px;letter-spacing:1px">${(row.form||'').split(',').map(f => f === 'W' ? '<span style="color:var(--success)">W</span>' : f === 'L' ? '<span style="color:var(--danger)">L</span>' : '<span style="color:var(--warning)">D</span>').join('')}</td>
        </tr>`;
      }).join('');
      el.innerHTML = `
        <div style="margin-bottom:12px;display:flex;gap:12px;flex-wrap:wrap;font-size:12px">
          <span style="color:var(--success)">● 1-4 歐冠資格</span>
          <span style="color:var(--warning)">● 5-6 歐霸</span>
          <span style="color:var(--danger)">● 18-20 降級區</span>
          <span style="color:var(--text-muted)">🟢 即時數據（football-data.org）· 第 ${data.matchday||'?'} 輪</span>
        </div>
        <div class="standings-group">
          <h3>🦁 2025/26 英超積分榜</h3>
          <table class="standings-table">
            <thead><tr><th>#</th><th>球隊</th><th>賽</th><th>勝</th><th>平</th><th>負</th><th>進</th><th>失</th><th>淨</th><th>積分</th><th>狀態</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).catch(() => {
      el.innerHTML = `<div class="empty-hint">
        <div class="icon-lg">⚠️</div>載入失敗，請稍後再試</div>`;
    });
    return;
  }

  if (_isEPL() && (tab === 'epl-scorers' || tab === 'epl-assists')) {
    const isScorers = tab === 'epl-scorers';
    el.innerHTML = `<div class="empty-hint">
      <div class="icon-lg">⏳</div>載入中...</div>`;
    fetch('/api/epl-scorers').then(r => r.json()).then(data => {
      if (!data.ok || (!data.topScorers?.length && !data.topAssists?.length)) {
        el.innerHTML = `<div class="empty-hint">
          <div class="icon-lg">📊</div>暫無數據</div>`;
        return;
      }
      const list = isScorers ? data.topScorers : data.topAssists;
      const valKey = isScorers ? 'goals' : 'assists';
      const unit = isScorers ? '球' : '助攻';
      const title = isScorers ? '⚽ 英超射手榜' : '🅰️ 英超助攻榜';
      el.innerHTML = `
        <div style="margin-bottom:12px;color:#4caf50;font-size:13px">🟢 即時數據（football-data.org）</div>
        <h3 style="margin-bottom:16px">${title}</h3>
        <div class="scorers-list">${(list || []).slice(0, 15).map((p, i) => `
          <div class="scorer-card">
            <div class="scorer-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
            <div class="scorer-flag">${p.teamCrest ? `<img src="${p.teamCrest}" style="height:20px;width:20px;object-fit:contain" alt="">` : ''}</div>
            <div class="scorer-info">
              <div class="scorer-name">${p.name}</div>
              <div class="scorer-sub">${p.team}${p.playedMatches ? ` · ${p.playedMatches}場` : ''}${isScorers && p.assists ? ` · ${p.assists}助攻` : ''}${!isScorers && p.goals ? ` · ${p.goals}球` : ''}</div>
            </div>
            <div class="scorer-stat">${p[valKey]} ${unit}</div>
          </div>`).join('')}</div>`;
    }).catch(() => {
      el.innerHTML = `<div class="empty-hint">
        <div class="icon-lg">⚠️</div>載入失敗，請稍後再試</div>`;
    });
    return;
  }

  if (_isEPL() && tab === 'rankings') {
    const _T = _teams();
    const sorted = Object.entries(_T).sort((a,b) => {
      const ra = a[1].radar, rb = b[1].radar;
      const sa = ra.attack + ra.defense + ra.midfield + ra.speed + ra.experience;
      const sb = rb.attack + rb.defense + rb.midfield + rb.speed + rb.experience;
      return sb - sa;
    });
    el.innerHTML = `<div class="scorers-list">${sorted.map(([code,t],i) => {
      const total = t.radar.attack + t.radar.defense + t.radar.midfield + t.radar.speed + t.radar.experience;
      return `<div class="scorer-card">
        <div class="scorer-rank ${i<3?['gold','silver','bronze'][i]:''}">${i+1}</div>
        <div class="scorer-flag">${flagImg(t.flag)}</div>
        <div class="scorer-info">
          <div class="scorer-name">${t.nameCN}</div>
          <div class="scorer-sub">${t.coach} · ${t.formation}</div>
        </div>
        <div style="font-size:14px;font-weight:700;color:var(--accent)">實力 ${total}</div>
      </div>`;
    }).join('')}</div>`;
    return;
  }

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
        <span style="color:var(--success)">● 1-8 直接晉級十六強</span>
        <span style="color:var(--text-muted)">● 9-24 進入附加賽</span>
        <span style="color:var(--danger)">● 25-36 淘汰</span>
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

  if (_isUCL() && (tab === 'ucl-scorers' || tab === 'ucl-assists')) {
    // 歐冠：射手榜 / 助攻榜（從 API 即時取得）
    const isScorers = tab === 'ucl-scorers';
    el.innerHTML = `<div class="empty-hint">
      <div class="icon-lg">⏳</div>載入中...</div>`;
    fetch('/api/ucl-scorers').then(r => r.json()).then(data => {
      if (!data.ok || (!data.topScorers?.length && !data.topAssists?.length)) {
        el.innerHTML = `<div class="empty-hint">
          <div class="icon-lg">📊</div>暫無數據（賽季尚未開始或 API 無資料）</div>`;
        return;
      }
      const list = isScorers ? data.topScorers : data.topAssists;
      const valKey = isScorers ? 'goals' : 'assists';
      const unit = isScorers ? '球' : '助攻';
      const title = isScorers ? '⚽ 歐冠射手榜' : '🅰️ 歐冠助攻榜';
      el.innerHTML = `
        <div style="margin-bottom:12px;color:#4caf50;font-size:13px">🟢 即時數據（football-data.org）</div>
        <h3 style="margin-bottom:16px">${title}</h3>
        <div class="scorers-list">${(list || []).slice(0, 15).map((p, i) => `
          <div class="scorer-card">
            <div class="scorer-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
            <div class="scorer-flag">${p.teamCrest ? `<img src="${p.teamCrest}" style="height:20px;width:20px;object-fit:contain" alt="">` : ''}</div>
            <div class="scorer-info">
              <div class="scorer-name">${p.name}</div>
              <div class="scorer-sub">${p.team}${p.playedMatches ? ` · ${p.playedMatches}場` : ''}${isScorers && p.assists ? ` · ${p.assists}助攻` : ''}${!isScorers && p.goals ? ` · ${p.goals}球` : ''}</div>
            </div>
            <div class="scorer-stat">${p[valKey]} ${unit}</div>
          </div>`).join('')}</div>`;
    }).catch(() => {
      el.innerHTML = `<div class="empty-hint">
        <div class="icon-lg">⚠️</div>載入失敗，請稍後再試</div>`;
    });
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
      el.innerHTML = '<div class="empty-hint">賽事開始後更新</div>';
    }
  } else {
    el.innerHTML = '<div class="empty-hint">賽事開始後更新</div>';
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

  // 八強（按 bracket 路徑排列：上半區 QF1+QF3，下半區 QF2+QF4）
  const qfOrder = [1, 3, 2, 4];
  const qfMatches = [];
  for (const i of qfOrder) {
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

  if (_isClub()) {
    const arts = [..._articles()].sort((a, b) => b.date.localeCompare(a.date));
    if (!arts.length) { main.innerHTML = ''; grid.innerHTML = '<div class="empty-hint">暫無文章</div>'; return; }
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

  const [first, ...rest] = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
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
  completeDailyTask?.('read_article');
  _pushArticleUrl(a.id);
  _ensureArticleOverlay();
  document.getElementById('article-modal-inner').innerHTML = `
    <div class="focus-cat">${a.cat}</div>
    <div class="article-modal-title">${a.title}</div>
    <div class="article-modal-meta">
      <span><i class="fas fa-calendar"></i> ${a.date}</span>
      <span><i class="fas fa-clock"></i> ${a.readTime}</span>
    </div>
    <div class="article-modal-body">${a.body}</div>
    ${_renderShareBar(a.id, a.title)}`;
  document.getElementById('article-modal-overlay').classList.add('open');
}

function openUCLArticle(id) {
  const arts = _articles();
  const a = arts.find(x => x.id === id);
  if (!a) return;
  completeDailyTask?.('read_article');
  _pushArticleUrl(a.id);
  _ensureArticleOverlay();
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
    <div class="article-modal-body">${bodyHtml}</div>
    ${_renderShareBar(a.id, a.title)}`;
  document.getElementById('article-modal-overlay').classList.add('open');
}

// ── 文章 modal overlay 建立與路由 ─────────────────────────
function _ensureArticleOverlay() {
  let overlay = document.getElementById('article-modal-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'article-modal-overlay';
  overlay.className = 'article-modal-overlay';
  overlay.innerHTML = `<div class="article-modal-box">
    <button class="modal-close" onclick="closeArticleModal()"><i class="fas fa-times"></i></button>
    <div id="article-modal-inner"></div>
  </div>`;
  overlay.addEventListener('click', e => { if(e.target===overlay) closeArticleModal(); });
  document.body.appendChild(overlay);
  return overlay;
}

function closeArticleModal() {
  const overlay = document.getElementById('article-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  try {
    // 若 URL 還在 /article/... 就 pop 回上一個或換成首頁
    if (location.pathname.startsWith('/article/')) {
      if (history.state && history.state.__article) history.back();
      else history.replaceState({}, '', '/');
    } else if (new URLSearchParams(location.search).get('article')) {
      const url = new URL(location.href);
      url.searchParams.delete('article');
      history.replaceState({}, '', url.pathname + url.search);
    }
  } catch(e) {}
  // 文章落地訪客：關閉文章後才彈每日任務
  if (window.__pendingDailyTaskAfterArticle) {
    window.__pendingDailyTaskAfterArticle = false;
    setTimeout(() => {
      if (typeof showDailyTaskPopup === 'function') showDailyTaskPopup();
    }, 400);
  }
}

function _pushArticleUrl(id) {
  try {
    const path = '/article/' + encodeURIComponent(id);
    if (location.pathname === path) return;
    history.pushState({ __article: String(id) }, '', path);
  } catch(e) {}
}

function _renderShareBar(id, title) {
  const url = `${location.origin}/article/${encodeURIComponent(id)}`;
  const t = String(title || '').replace(/"/g,'&quot;').replace(/'/g,"\\'");
  const enc = encodeURIComponent;
  return `
    <div class="article-share-bar">
      <div class="article-share-label"><i class="fas fa-share-nodes"></i> 分享這篇</div>
      <button class="article-share-btn copy" type="button" onclick="copyArticleLink('${url}', event)"><i class="fas fa-link"></i> 複製連結</button>
      <a class="article-share-btn line" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${enc(url)}&text=${enc(title)}"><i class="fab fa-line"></i> LINE</a>
      <a class="article-share-btn fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}"><i class="fab fa-facebook-f"></i> Facebook</a>
      <a class="article-share-btn x" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}"><i class="fab fa-x-twitter"></i> X</a>
    </div>`;
}

function copyArticleLink(url, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  const done = () => {
    const btn = ev?.target?.closest?.('.article-share-btn');
    if (btn) {
      const prev = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> 已複製';
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = prev; btn.classList.remove('copied'); }, 1600);
    }
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(done).catch(() => prompt('複製此連結：', url));
  } else {
    prompt('複製此連結：', url);
  }
}

// 初次載入或直接進 /article/<id> 時自動開啟文章
function _openArticleByIdFromUrl(id) {
  if (!id) return false;
  const inWC = (typeof ARTICLES !== 'undefined') ? ARTICLES.find(a => String(a.id) === String(id)) : null;
  if (inWC) {
    if (window.Tournament?.current() !== 'wc') window.Tournament?.switch('wc');
    openArticle(inWC.id);
    return true;
  }
  const inEPL = (window.EPL_ARTICLES || []).find(a => a.id === id);
  if (inEPL) {
    if (window.Tournament?.current() !== 'epl') window.Tournament?.switch('epl');
    setTimeout(() => openUCLArticle(id), window.Tournament?.current() === 'epl' ? 0 : 700);
    return true;
  }
  const inUCL = (window.UCL_ARTICLES || []).find(a => a.id === id);
  if (inUCL) {
    if (window.Tournament?.current() !== 'ucl') window.Tournament?.switch('ucl');
    setTimeout(() => openUCLArticle(id), window.Tournament?.current() === 'ucl' ? 0 : 700);
    return true;
  }
  return false;
}

function _initArticleRouter() {
  // 已初始化過就略過
  if (window.__articleRouterInited) return;
  window.__articleRouterInited = true;

  window.addEventListener('popstate', () => {
    const m = location.pathname.match(/^\/article\/(.+)$/);
    if (m) {
      _openArticleByIdFromUrl(decodeURIComponent(m[1]));
    } else {
      const overlay = document.getElementById('article-modal-overlay');
      overlay?.classList.remove('open');
    }
  });

  const m = location.pathname.match(/^\/article\/(.+)$/);
  const q = new URLSearchParams(location.search).get('article');
  const id = m ? decodeURIComponent(m[1]) : q;
  if (!id) return;

  // 等資料與 Tournament 載好再開
  let tries = 0;
  const tryOpen = () => {
    tries++;
    const ready = window.Tournament && (
      (typeof ARTICLES !== 'undefined') || window.EPL_ARTICLES || window.UCL_ARTICLES
    );
    if (ready) {
      if (_openArticleByIdFromUrl(id) && q) {
        // 從 ?article= 進來的，替換 URL 成漂亮版
        try { history.replaceState({ __article: String(id) }, '', '/article/' + encodeURIComponent(id)); } catch(e){}
      }
    } else if (tries < 40) {
      setTimeout(tryOpen, 100);
    }
  };
  setTimeout(tryOpen, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initArticleRouter);
} else {
  _initArticleRouter();
}

function openTeamModal(code) {
  const _T = _teams();
  const t = _T[code];
  if (!t) return;
  const formDots = (t.recentForm||['W','D','W','W','D']).map(f => `<div class="form-dot ${f}">${f}</div>`).join('');
  const players = (t.keyPlayers||[]).map(p => `<div class="player-pill">⚽ ${p.name} <span style="color:var(--text-muted);font-size:11px">${p.pos}${p.club ? ' · '+p.club : ''}</span></div>`).join('');
  const strengths = (t.strengths||[]).map(s => `<div class="strength-item">${s}</div>`).join('');
  const weaknesses = (t.weaknesses||[]).map(w => `<div class="weakness-item">${w}</div>`).join('');

  const tid = _tid();
  const subLine = _isClub() ? `${t.name} · ${t.league||''}` : `${t.name} · ${CONF_LABELS[t.conf]||t.conf}`;
  const badges = tid === 'epl'
    ? `<span class="match-tag group">英超 #${t.eplRank||'?'}</span>
       <span class="match-tag">主帥：${t.coach}</span>
       <span class="match-tag">${t.formation}</span>`
    : tid === 'ucl'
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
  // 鎖定檢查：比賽已開始則拒絕
  const match = _matches().find(m => m.id === matchId);
  if (match) {
    let ko = 0;
    if (_isClub() && match.date && match.time) ko = new Date(match.date+'T'+match.time+':00+08:00').getTime();
    else if (match.twDate && match.twTime) ko = new Date(match.twDate+'T'+match.twTime+':00+08:00').getTime();
    const started = (match.status && match.status !== 'scheduled') || (ko > 0 && Date.now() >= ko);
    if (started) {
      showToast?.('🔒 比賽已開始，無法修改預測');
      document.getElementById('my-pred-overlay')?.remove();
      return;
    }
  }
  const h = parseInt(document.getElementById('my-pred-h')?.textContent || 0);
  const a = parseInt(document.getElementById('my-pred-a')?.textContent || 0);
  const predKey = {ucl:'ucl26_my_preds',epl:'epl26_my_preds',wc:'wc26_my_preds'}[_tid()] || 'wc26_my_preds';
  const myPreds = (() => { try { return JSON.parse(localStorage.getItem(predKey))||{}; } catch { return {}; } })();
  const isNew = !myPreds[matchId];
  myPreds[matchId] = { h, a, savedAt: new Date().toISOString() };
  localStorage.setItem(predKey, JSON.stringify(myPreds));
  _updatePredBadge();
  completeDailyTask?.('pred_match');

  // 首次預測立即給 +1 XP 參與獎
  if (isNew) {
    const bonusKey = {ucl:'ucl26_',epl:'epl26_',wc:'wc26_'}[_tid()] + 'bonus_xp';
    const cur = parseInt(localStorage.getItem(bonusKey)||'0') || 0;
    localStorage.setItem(bonusKey, String(cur + 1));
    updateNavXP?.();
    showToast?.('🎉 參與獎 +1 XP');
  }

  document.getElementById('my-pred-overlay')?.remove();
  openPredModal(matchId);
}

// ── 分享預測圖片 ──
async function shareMyPrediction(matchId) {
  const _T = _teams();
  const schedule = _matches();
  const m = schedule.find(x => x.id === matchId);
  if (!m) return;
  const ht = _T[m.home], at = _T[m.away];
  if (!ht || !at) return;

  const predKey = {ucl:'ucl26_my_preds',epl:'epl26_my_preds',wc:'wc26_my_preds'}[_tid()] || 'wc26_my_preds';
  const myPreds = (() => { try { return JSON.parse(localStorage.getItem(predKey))||{}; } catch { return {}; } })();
  const mine = myPreds[matchId];
  if (!mine) return;
  completeDailyTask?.('share_any');

  showToast?.('📤 正在生成分享圖...');

  const meta = _matchMeta(m);
  const p = calcPred(ht, at);
  const DPR = 2;
  const w = 640, h = 780;
  const cvs = document.createElement('canvas');
  cvs.width = w * DPR; cvs.height = h * DPR;
  const ctx = cvs.getContext('2d');
  ctx.scale(DPR, DPR);

  // helpers
  const roundRect = (x, y, rw, rh, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + rw - r, y); ctx.arcTo(x + rw, y, x + rw, y + r, r);
    ctx.lineTo(x + rw, y + rh - r); ctx.arcTo(x + rw, y + rh, x + rw - r, y + rh, r);
    ctx.lineTo(x + r, y + rh); ctx.arcTo(x, y + rh, x, y + rh - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };
  const pill = (cx, cy, text, bgColor, borderColor, textColor, font) => {
    ctx.font = font;
    const tw = ctx.measureText(text).width + 20;
    roundRect(cx - tw/2, cy - 13, tw, 26, 13);
    ctx.fillStyle = bgColor; ctx.fill();
    ctx.strokeStyle = borderColor; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.fillText(text, cx, cy + 5);
  };

  // 載入隊徽/國旗（透過 wsrv.nl 代理加上 CORS 標頭）
  const loadImg = (src) => new Promise(resolve => {
    if (!src) return resolve(null);
    const url = (src.startsWith('http') || src.startsWith('img/')) ? src : getFlagImgUrl(src);
    if (!url) return resolve(null);
    const proxied = url.startsWith('http') ? `https://wsrv.nl/?url=${encodeURIComponent(url)}` : url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = proxied;
  });

  // 組合分享連結（帶賽事 + 個人邀請碼）
  const tid = _tid();
  let siteUrl = window.location.origin + (tid !== 'wc' ? `?t=${tid}` : '');
  if (typeof getMyRefLink === 'function') {
    const refLink = await getMyRefLink();
    if (refLink) siteUrl = refLink;
  }
  const loadQR = () => new Promise(async resolve => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(siteUrl)}&bgcolor=0a0e1a&color=ffffff&margin=0`;
      const resp = await fetch(qrUrl);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(objUrl); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null); };
      img.src = objUrl;
    } catch { resolve(null); }
  });

  const [hImg, aImg, qrImg, logoImg] = await Promise.all([loadImg(ht.flag), loadImg(at.flag), loadQR(), loadImg('img/logo-soccermaddy.png')]);

  // ── 背景 ──
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0a0e1a');
  bg.addColorStop(0.5, '#111827');
  bg.addColorStop(1, '#0a0e1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 頂部金色裝飾線
  const topLine = ctx.createLinearGradient(0, 0, w, 0);
  topLine.addColorStop(0, 'rgba(245,166,35,0)');
  topLine.addColorStop(0.3, '#f5a623');
  topLine.addColorStop(0.7, '#f5a623');
  topLine.addColorStop(1, 'rgba(245,166,35,0)');
  ctx.fillStyle = topLine;
  ctx.fillRect(0, 0, w, 3);

  // Logo（左上角）
  if (logoImg) {
    const lh = 28, lw = logoImg.width * (lh / logoImg.height);
    ctx.drawImage(logoImg, 20, 10, lw, lh);
  }

  // ── 頂部標籤 ──
  const dateStr = _isClub() ? `${(m.date||'').slice(5).replace('-','/')} ${m.time||''}` : `${(m.twDate||'').slice(5).replace('-','/')} ${m.twTime||''}`;
  ctx.textAlign = 'center';

  // 標籤膠囊 + 時間膠囊
  const tagText = meta.matchTag;
  const timeText = `🕒 ${dateStr}`;
  pill(w/2 - 70, 32, tagText, 'rgba(245,166,35,0.15)', 'rgba(245,166,35,0.4)', '#f5a623', '600 13px "Noto Sans TC", sans-serif');
  pill(w/2 + 70, 32, timeText, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.6)', '500 12px "Noto Sans TC", sans-serif');

  // ── 隊徽 + 隊名 + 排名 ──
  const crestY = 65;
  const crestSize = 72;
  const teamX_h = w * 0.22;
  const teamX_a = w * 0.78;

  if (hImg) ctx.drawImage(hImg, teamX_h - crestSize/2, crestY, crestSize, crestSize);
  if (aImg) ctx.drawImage(aImg, teamX_a - crestSize/2, crestY, crestSize, crestSize);

  ctx.textAlign = 'center';
  ctx.font = '800 20px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(ht.nameCN, teamX_h, crestY + crestSize + 24);
  ctx.fillText(at.nameCN, teamX_a, crestY + crestSize + 24);

  ctx.font = '400 11px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(meta.hRankLabel, teamX_h, crestY + crestSize + 42);
  ctx.fillText(meta.aRankLabel, teamX_a, crestY + crestSize + 42);

  // ── 中間 AI 預測比分（打碼）──
  ctx.font = '400 12px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('AI 預測比分', w/2, crestY + 16);

  // 打碼方塊取代數字
  const maskY = crestY + 28;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(w/2 - 48, maskY, 32, 40, 6); ctx.fill();
  roundRect(w/2 + 16, maskY, 32, 40, 6); ctx.fill();
  ctx.font = '700 28px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText('?', w/2 - 32, maskY + 29);
  ctx.fillText('?', w/2 + 32, maskY + 29);
  ctx.font = '700 20px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillText('–', w/2, maskY + 27);

  // xG
  ctx.font = '400 11px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(`xG ${p.hXG} — ${p.aXG}`, w/2, crestY + 80);

  // 信心膠囊
  const confColor = p.conf === 'high' ? '#22c55e' : p.conf === 'medium' ? '#f5a623' : '#ef4444';
  pill(w/2, crestY + 100, p.confLabel, confColor + '20', confColor + '60', confColor, '700 11px "Noto Sans TC", sans-serif');

  // ── 我的預測卡片 ──
  const cardY = 210;
  const cardH = 140;
  roundRect(32, cardY, w - 64, cardH, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,166,35,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 標題
  ctx.font = '600 13px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('🎯 我的預測', w/2, cardY + 26);

  // 隊徽小圖 + 大比分
  const predCY = cardY + cardH/2 + 6;
  const miniCrest = 40;
  if (hImg) ctx.drawImage(hImg, w/2 - 140, predCY - miniCrest/2, miniCrest, miniCrest);
  if (aImg) ctx.drawImage(aImg, w/2 + 100, predCY - miniCrest/2, miniCrest, miniCrest);

  ctx.font = '900 56px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#f5a623';
  ctx.fillText(`${mine.h}`, w/2 - 38, predCY + 20);
  ctx.fillText(`${mine.a}`, w/2 + 38, predCY + 20);
  ctx.font = '700 32px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText('–', w/2, predCY + 16);

  // 預測時間
  const savedDate = new Date(mine.savedAt).toLocaleDateString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  ctx.font = '400 11px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillText(`已預測 · ${savedDate}`, w/2, predCY + 44);

  // ── 勝率條 ──
  const barY = 378;
  ctx.font = '800 18px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#22c55e'; ctx.textAlign = 'left'; ctx.fillText(`${p.hw}%`, 42, barY);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'center'; ctx.fillText(`${p.d}%`, w/2, barY);
  ctx.fillStyle = '#ef4444'; ctx.textAlign = 'right'; ctx.fillText(`${p.aw}%`, w - 42, barY);

  ctx.font = '400 10px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textAlign = 'left'; ctx.fillText(`${ht.nameCN} 勝`, 42, barY + 16);
  ctx.textAlign = 'center'; ctx.fillText('平局', w/2, barY + 16);
  ctx.textAlign = 'right'; ctx.fillText(`${at.nameCN} 勝`, w - 42, barY + 16);

  // 勝率長條
  const barX = 42, barW2 = w - 84, barH2 = 8, barTop = barY + 24;
  roundRect(barX, barTop, barW2, barH2, 4); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
  const hBarW = barW2 * (p.hw / 100);
  roundRect(barX, barTop, hBarW, barH2, 4); ctx.fillStyle = '#22c55e'; ctx.fill();
  const aBarW = barW2 * (p.aw / 100);
  roundRect(barX + barW2 - aBarW, barTop, aBarW, barH2, 4); ctx.fillStyle = '#ef4444'; ctx.fill();

  // ── 完整 AI 分析解鎖區 ──
  const lockY = 438;
  const lockH = 195;
  roundRect(32, lockY, w - 64, lockH, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  // 鎖頭 icon
  ctx.font = '400 28px sans-serif';
  ctx.fillStyle = 'rgba(245,166,35,0.7)';
  ctx.fillText('🔒', w/2, lockY + 32);

  ctx.font = '700 16px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('完整 AI 分析', w/2, lockY + 56);

  ctx.font = '400 12px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('解鎖本場 AI 勝負預測、比分預估', w/2, lockY + 76);
  ctx.fillText('與完整數據雷達圖', w/2, lockY + 93);

  // 四個功能標籤
  const tagRow1Y = lockY + 118;
  const tagRow2Y = lockY + 146;
  const tagFont = '600 12px "Noto Sans TC", sans-serif';
  const tagBg = 'rgba(255,255,255,0.06)';
  const tagBorder = 'rgba(255,255,255,0.1)';
  const tags = [
    { icon: '⚽', text: '預測比分', x: w/2 - 80, y: tagRow1Y },
    { icon: '📊', text: '勝平負%', x: w/2 + 80, y: tagRow1Y },
    { icon: '📈', text: '數據雷達圖', x: w/2 - 80, y: tagRow2Y },
    { icon: '🧠', text: 'AI 分析文字', x: w/2 + 80, y: tagRow2Y },
  ];
  tags.forEach(t => {
    pill(t.x, t.y, `${t.icon} ${t.text}`, tagBg, tagBorder, 'rgba(255,255,255,0.7)', tagFont);
  });

  // ── 底部：QR code + CTA ──
  const bottomY = 655;

  // QR code
  const qrSize = 72;
  const qrX = w - 42 - qrSize;
  if (qrImg) {
    // QR 背景
    roundRect(qrX - 4, bottomY - 4, qrSize + 8, qrSize + 8, 8);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.drawImage(qrImg, qrX, bottomY, qrSize, qrSize);
    ctx.font = '400 9px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('掃碼預測', qrX + qrSize/2, bottomY + qrSize + 14);
  }

  // 左側 CTA 文字
  ctx.textAlign = 'left';
  ctx.font = '700 18px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#f5a623';
  ctx.fillText('你覺得誰會贏？', 42, bottomY + 20);
  ctx.font = '400 13px "Noto Sans TC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('一起來預測比分，精準猜中贏寶石！', 42, bottomY + 42);

  // 網站連結（顯示完整邀請連結）
  ctx.font = '400 11px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(siteUrl.replace('https://', ''), 42, bottomY + 64);

  // 底部裝飾線
  const btmLine = ctx.createLinearGradient(0, 0, w, 0);
  btmLine.addColorStop(0, 'rgba(245,166,35,0)');
  btmLine.addColorStop(0.3, 'rgba(245,166,35,0.3)');
  btmLine.addColorStop(0.7, 'rgba(245,166,35,0.3)');
  btmLine.addColorStop(1, 'rgba(245,166,35,0)');
  ctx.fillStyle = btmLine;
  ctx.fillRect(0, h - 3, w, 3);

  // ── 轉成 blob 分享 ──
  cvs.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], 'prediction.png', { type: 'image/png' });
    const shareText = `我預測 ${ht.nameCN} ${mine.h}-${mine.a} ${at.nameCN}，你覺得呢？一起來預測！`;

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ text: shareText, url: siteUrl, files: [file] });
        return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    // fallback: 下載圖片 + 複製文字
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `prediction-${matchId}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
    try { await navigator.clipboard.writeText(shareText + '\n' + siteUrl); } catch {}
    showToast?.('📤 圖片已下載，分享文字已複製');
  }, 'image/png');
}

// ── 預測倒數計時器（Modal 內）──
function startPredCountdowns() {
  document.querySelectorAll('.pred-countdown[data-kickoff]').forEach(el => {
    const kickoff = parseInt(el.dataset.kickoff);
    function tick() {
      const ms = kickoff - Date.now();
      if (ms <= 0) { el.textContent = '🔒 預測已鎖定'; el.className = 'pred-countdown urgent'; return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const parts = [];
      if (d > 0) parts.push(`${d}天`);
      if (h > 0) parts.push(`${h}小時`);
      if (m > 0) parts.push(`${m}分鐘`);
      parts.push(`${s}秒`);
      el.textContent = `⏰ 距離鎖定還有 ${parts.join(' ')}`;
      el.className = 'pred-countdown' + (ms < 30*60000 ? ' urgent' : ms < 2*3600000 ? ' warn' : '');
    }
    tick();
    const iv = setInterval(tick, 1000);
    el._cdInterval = iv;
  });
}

// ── 賽程卡片預測倒數（全局刷新）──
function startSchedulePredCountdowns() {
  function tick() {
    document.querySelectorAll('.match-pred-tag[data-pred-cd]').forEach(el => {
      const ko = parseInt(el.dataset.predCd);
      if (!ko) return;
      const ms = ko - Date.now();
      if (ms <= 0) {
        el.textContent = '🔒 已截止';
        el.className = 'match-pred-tag expired';
        return;
      }
      // 超過 3 天：只顯示一行
      if (ms > 3 * 86400000) {
        el.innerHTML = '🎯 預測比分';
        el.className = 'match-pred-tag';
        return;
      }
      // 3 天內：顯示倒數
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      let cdText;
      if (d > 0) cdText = `${d}天${h}時${m}分`;
      else if (h > 0) cdText = `${h}時${m}分${s}秒`;
      else cdText = `${m}分${s}秒`;
      el.innerHTML = `🎯 預測比分<br><span class="pred-cd-text">🔒 ${cdText}</span>`;
      el.className = 'match-pred-tag' + (ms < 2*3600000 ? ' urgent' : ms < 24*3600000 ? ' soon' : '');
    });
  }
  tick();
  setInterval(tick, 1000);
}

// 頁面載入後啟動
document.addEventListener('DOMContentLoaded', () => setTimeout(startSchedulePredCountdowns, 1500));

/* ========== 回到頂部按鈕 ========== */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
});

/* ========== 帳號選單捷徑 ========== */
function scrollToDailyTask() {
  setTimeout(() => {
    const el = document.getElementById('daily-task-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 400);
}
function scrollToAchievements() {
  setTimeout(() => {
    const el = document.querySelector('.badges-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 400);
}

/* ========== 射門排行榜展開/收合 ========== */
function toggleRogueLb() {
  const lb = document.getElementById('rogue-home-leaderboard');
  const btn = document.getElementById('rogue-lb-toggle');
  if (!lb || !btn) return;
  const collapsed = lb.classList.toggle('rogue-lb-collapsed');
  if (!collapsed) lb.style.maxHeight = lb.scrollHeight + 'px';
  else lb.style.maxHeight = '0';
  btn.textContent = collapsed ? '展開排行榜 ↓' : '收合排行榜 ↑';
}

/* ========== 分組死亡指數展開/收合 ========== */
function toggleDeathGroups() {
  const grid = document.getElementById('death-groups');
  const btn = document.getElementById('death-toggle');
  if (!grid || !btn) return;
  const collapsed = grid.classList.toggle('highlights-collapsed');
  btn.textContent = collapsed ? '展開全部 ↓' : '收合 ↑';
}

/* ========== 看點展開/收合 ========== */
function toggleHighlights() {
  const grid = document.getElementById('highlights-grid');
  const btn = document.getElementById('highlights-toggle');
  if (!grid || !btn) return;
  const collapsed = grid.classList.toggle('highlights-collapsed');
  btn.textContent = collapsed ? '展開全部 ↓' : '收合 ↑';
}
