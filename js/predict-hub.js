/* =============================================
   PREDICT-HUB.JS — 預測主動引導 + streak + 分享卡
   3 階段：
     A. 首頁 hero「待你預測」 + nav 紅點 + 數字
     B. 預測 streak 系統（連續 N 天每天至少預測 1 場）
     C. 預測完成後彈分享卡
   ============================================= */

(function () {
  'use strict';

  const STORAGE_PREDICT_STREAK = 'predict_streak_v1';

  // ── 工具：取所有目前賽事的 matches + 已預測表 ──
  function _getCurrentMatches() {
    const t = (window.Tournament && window.Tournament.current && window.Tournament.current()) || 'wc';
    if (t === 'epl') return window.EPL_MATCHES || [];
    if (t === 'ucl') return window.UCL_MATCHES || [];
    return (typeof SCHEDULE !== 'undefined') ? SCHEDULE : [];
  }
  function _getCurrentTeams() {
    const t = (window.Tournament && window.Tournament.current && window.Tournament.current()) || 'wc';
    if (t === 'epl') return window.EPL_TEAMS || {};
    if (t === 'ucl') return window.UCL_TEAMS || {};
    return (typeof TEAMS !== 'undefined') ? TEAMS : {};
  }
  function _getMyPreds() {
    const t = (window.Tournament && window.Tournament.current && window.Tournament.current()) || 'wc';
    const key = ({ ucl: 'ucl26_my_preds', epl: 'epl26_my_preds', wc: 'wc26_my_preds' })[t] || 'wc26_my_preds';
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  }

  function _kickoffMs(m) {
    if (m.date && m.time) return new Date(m.date + 'T' + m.time + ':00+08:00').getTime();
    if (m.twDate && m.twTime) return new Date(m.twDate + 'T' + m.twTime + ':00+08:00').getTime();
    return 0;
  }

  // 找出未來 48h 內、尚未預測的比賽（最多 5 場、最近的優先）
  function getPendingPredicts(hoursAhead = 48) {
    const matches = _getCurrentMatches();
    const myPreds = _getMyPreds();
    const now = Date.now();
    const cutoff = now + hoursAhead * 3600 * 1000;
    const STARTED = new Set(['live', 'finished', 'ended', 'started']);
    return matches
      .filter(m => {
        if (!m.home || !m.away || m.home === 'TBD' || m.away === 'TBD') return false;
        if (STARTED.has(m.status)) return false;
        if (myPreds[m.id]) return false;
        const ko = _kickoffMs(m);
        if (!ko) return false;
        return ko > now && ko < cutoff;
      })
      .sort((a, b) => _kickoffMs(a) - _kickoffMs(b))
      .slice(0, 5);
  }
  window.getPendingPredicts = getPendingPredicts;

  // ── A1: 更新 nav AI 預測紅點（數字 = 待預測場數）──
  function updatePredictNavBadge() {
    const badge = document.getElementById('nav-predict-badge');
    if (!badge) return;
    const pending = getPendingPredicts();
    if (pending.length > 0) {
      badge.textContent = pending.length;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
  window.updatePredictNavBadge = updatePredictNavBadge;

  // ── A2: 首頁 hero「待你預測」──
  function _fmtCountdown(ms) {
    if (ms <= 0) return '即將開賽';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)} 天後`;
    if (h > 0) return `${h} 小時 ${m} 分後`;
    return `${m} 分鐘後`;
  }
  // 把 kickoff 時間轉成「5/9 (五) 22:30」格式
  const _DOW = ['日','一','二','三','四','五','六'];
  function _fmtKickoff(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    // 轉成台灣時區
    const tw = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const mo = tw.getMonth() + 1;
    const dd = tw.getDate();
    const hh = String(tw.getHours()).padStart(2, '0');
    const mm = String(tw.getMinutes()).padStart(2, '0');
    return `${mo}/${dd} (${_DOW[tw.getDay()]}) ${hh}:${mm}`;
  }
  function _crestImg(team) {
    if (!team) return '<span class="pp-crest pp-crest-blank"></span>';
    // EPL/UCL: team.flag 是 URL（'https://crests.football-data.org/64.png'）
    // 世足: team.flag 是 emoji 國旗（'🇫🇷'），team.crest 也可能存在
    const v = team.crest || team.flag;
    if (!v) return '<span class="pp-crest pp-crest-blank"></span>';
    if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
      return `<img src="${v}" alt="" class="pp-crest" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<span class="pp-flag">${v}</span>`;
  }
  // 通用 render 函式（給多個位置共用 — 首頁、AI 預測頁等）
  function _renderPendingSection(rootId, listId, badgeId, streakId, pending, teams, streak) {
    const root = document.getElementById(rootId);
    const list = document.getElementById(listId);
    if (!root || !list) return;
    if (!pending.length) { root.style.display = 'none'; return; }
    root.style.display = '';

    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = `${pending.length} 場`;

    const streakEl = document.getElementById(streakId);
    if (streakEl) {
      if (streak.current > 0) {
        streakEl.innerHTML = `<span class="pp-streak-flame" title="沒比賽的日子不算斷 streak">🔥</span> 連續 <b>${streak.current}</b> 天`;
        streakEl.style.display = '';
      } else {
        streakEl.innerHTML = '';
        streakEl.style.display = 'none';
      }
    }

    const now = Date.now();
    list.innerHTML = pending.map(m => {
      const ht = teams[m.home] || {};
      const at = teams[m.away] || {};
      const ko = _kickoffMs(m);
      const msLeft = ko - now;
      const urgency = msLeft < 30 * 60000 ? 'urgent' : msLeft < 2 * 3600000 ? 'soon' : '';
      const homeName = ht.nameCN || ht.name || m.home;
      const awayName = at.nameCN || at.name || m.away;
      return `<div class="pp-card ${urgency}" onclick="openPredModal('${m.id}')">
        <div class="pp-teams">
          <div class="pp-team pp-team--home">
            ${_crestImg(ht)}
            <span class="pp-team-name">${homeName}</span>
          </div>
          <span class="pp-vs">VS</span>
          <div class="pp-team pp-team--away">
            <span class="pp-team-name">${awayName}</span>
            ${_crestImg(at)}
          </div>
        </div>
        <div class="pp-meta">
          <div class="pp-time">
            <span class="pp-kickoff">📅 ${_fmtKickoff(ko)}</span>
            <span class="pp-countdown">⏰ ${_fmtCountdown(msLeft)}</span>
          </div>
          <button class="pp-go-btn" onclick="event.stopPropagation();openPredModal('${m.id}')">預測比分 →</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderPredictHomeHero() {
    const pending = getPendingPredicts();
    const teams = _getCurrentTeams();
    const streak = getPredictStreak();
    // 首頁
    _renderPendingSection('home-pending-predict', 'pending-predict-list', 'pending-predict-count', 'pending-predict-streak', pending, teams, streak);
    // AI 預測頁（含英超/歐冠/世足，依當前 Tournament 切換）
    _renderPendingSection('predictions-pending-predict', 'predictions-pending-predict-list', 'predictions-pending-predict-count', 'predictions-pending-predict-streak', pending, teams, streak);
  }
  window.renderPredictHomeHero = renderPredictHomeHero;

  // ── A3: 每天首次造訪 → 跳 spotlight 通知有比賽可預測 ──
  // 比首頁 section 更醒目（黑幕 + 中央彈窗），但每天最多一次
  const STORAGE_SPOTLIGHT_PREFIX = 'predict_spotlight_';
  function _localDateStrTw() {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' });
    return fmt.format(new Date());
  }
  function maybeShowPredictSpotlight() {
    const today = _localDateStrTw();
    const key = STORAGE_SPOTLIGHT_PREFIX + today;
    if (localStorage.getItem(key)) return;
    // 等其他 overlay/引導跑完才彈，避免疊在一起
    const overlaySels = ['#share-card-overlay', '#opinion-overlay', '.cts-root', '.ob-overlay.show', '.predict-result-banner', '#predict-spotlight-overlay'];
    if (overlaySels.some(s => document.querySelector(s))) {
      setTimeout(maybeShowPredictSpotlight, 2000);
      return;
    }
    const pending = getPendingPredicts(48);
    if (!pending.length) return;
    showPredictSpotlight(pending);
    localStorage.setItem(key, '1');
  }
  function showPredictSpotlight(pending) {
    const teams = _getCurrentTeams();
    const top = pending.slice(0, 3);
    const top0 = top[0];
    const top0Home = (teams[top0.home] || {}).nameCN || top0.home;
    const top0Away = (teams[top0.away] || {}).nameCN || top0.away;

    const itemsHtml = top.map(m => {
      const ht = teams[m.home] || {};
      const at = teams[m.away] || {};
      const ko = _kickoffMs(m);
      const msLeft = ko - Date.now();
      const homeName = ht.nameCN || ht.name || m.home;
      const awayName = at.nameCN || at.name || m.away;
      const urgency = msLeft < 2 * 3600000 ? 'urgent' : '';
      return `<div class="ps-item ${urgency}" data-mid="${m.id}">
        <div class="ps-item-teams">
          ${_crestImg(ht)}
          <span class="ps-item-name">${homeName}</span>
          <span class="ps-item-vs">VS</span>
          <span class="ps-item-name">${awayName}</span>
          ${_crestImg(at)}
        </div>
        <div class="ps-item-meta">
          <span class="ps-item-time">📅 ${_fmtKickoff(ko)}</span>
          <span class="ps-item-countdown">⏰ ${_fmtCountdown(msLeft)}</span>
        </div>
      </div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'predict-spotlight-overlay';
    overlay.className = 'predict-spotlight-overlay';
    overlay.innerHTML = `
      <div class="predict-spotlight-card">
        <button class="ps-close" aria-label="關閉">×</button>
        <div class="ps-icon">🎯</div>
        <h2 class="ps-title">你還有 <b>${pending.length}</b> 場比賽可以預測</h2>
        <p class="ps-subtitle">以下比賽 48 小時內開賽 — 預測命中拿 <b>+20 XP</b> 跟 <b>1 💎</b></p>
        <div class="ps-list">${itemsHtml}</div>
        <button class="ps-go-first" data-mid="${top0.id}">
          🎯 預測第一場：${top0Home} vs ${top0Away} →
        </button>
        <button class="ps-skip">稍後再看</button>
        <p class="ps-tip">每天首次造訪才會彈一次，不會打擾你</p>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    function close() {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    }
    function goPredict(mid) {
      close();
      // 等彈窗淡出再開預測 modal，避免 z-index 打架
      setTimeout(() => { try { window.openPredModal(mid); } catch (e) {} }, 280);
    }
    overlay.querySelector('.ps-close').addEventListener('click', close);
    overlay.querySelector('.ps-skip').addEventListener('click', close);
    overlay.querySelector('.ps-go-first').addEventListener('click', () => goPredict(top0.id));
    overlay.querySelectorAll('.ps-item').forEach(el => {
      el.addEventListener('click', () => goPredict(el.dataset.mid));
    });
    // 點黑幕關閉
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  }
  window.maybeShowPredictSpotlight = maybeShowPredictSpotlight;

  // ── B: 預測 streak（連續 N 天至少預測 1 場）──
  function getPredictStreak() {
    try {
      const raw = localStorage.getItem(STORAGE_PREDICT_STREAK);
      if (!raw) return { current: 0, longest: 0, lastDate: null };
      const o = JSON.parse(raw) || {};
      return {
        current: (o.current | 0) || 0,
        longest: (o.longest | 0) || 0,
        lastDate: o.lastDate || null,
      };
    } catch { return { current: 0, longest: 0, lastDate: null }; }
  }
  window.getPredictStreak = getPredictStreak;

  // 某個日期是否「有真正可預測的比賽」（任一賽事任何一場都算）
  // 用全部三個賽事池一起查（使用者可能某天只有歐冠、某天只有英超）
  function _hadMatchesOnDate(dateStr) {
    const pools = [
      window.EPL_MATCHES || [],
      window.UCL_MATCHES || [],
      (typeof SCHEDULE !== 'undefined') ? SCHEDULE : [],
    ];
    for (const matches of pools) {
      for (const m of matches) {
        if (!m.home || !m.away || m.home === 'TBD' || m.away === 'TBD') continue;
        const md = m.date || m.twDate;
        if (md === dateStr) return true;
      }
    }
    return false;
  }
  function _yyyymmdd(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // 預測 streak bump（沒比賽的日子自動跳過、不算斷）
  function bumpPredictStreak() {
    const today = (typeof localDateStr === 'function') ? localDateStr() : _yyyymmdd(new Date());
    const s = getPredictStreak();
    if (s.lastDate === today) return { ...s, bumped: false };

    // 第一次預測 → current = 1
    if (!s.lastDate) {
      const next = { current: 1, longest: 1, lastDate: today };
      localStorage.setItem(STORAGE_PREDICT_STREAK, JSON.stringify(next));
      return { ...next, bumped: true, prevCurrent: 0 };
    }

    // 從昨天往回掃到 lastDate，途中如果遇到「有比賽但沒預測」→ streak 斷掉
    // 沒比賽的日子直接跳過（不算斷）
    const cursor = new Date(today + 'T00:00:00');
    cursor.setDate(cursor.getDate() - 1);
    let broken = false;
    let walks = 0;
    while (walks < 60) { // 最多回看 60 天，避免極端情境卡死
      const cs = _yyyymmdd(cursor);
      if (cs === s.lastDate) break;
      if (_hadMatchesOnDate(cs)) { broken = true; break; }
      cursor.setDate(cursor.getDate() - 1);
      walks++;
    }
    if (walks >= 60) broken = true;

    const next = {
      current: broken ? 1 : s.current + 1,
      longest: 0,
      lastDate: today,
    };
    next.longest = Math.max(s.longest, next.current);
    localStorage.setItem(STORAGE_PREDICT_STREAK, JSON.stringify(next));
    return { ...next, bumped: true, prevCurrent: s.current, brokenByMissedDay: broken };
  }
  window.bumpPredictStreak = bumpPredictStreak;

  // ── C: 預測完彈分享卡 ──
  function showPredictShareCard(matchId, h, a) {
    if (typeof window.showShareCard !== 'function') return;
    const teams = _getCurrentTeams();
    const matches = _getCurrentMatches();
    const m = matches.find(x => x.id === matchId);
    if (!m) return;
    const ht = teams[m.home] || {};
    const at = teams[m.away] || {};
    const homeName = ht.nameCN || ht.name || m.home;
    const awayName = at.nameCN || at.name || m.away;
    const winText = h > a ? `押 ${homeName} 贏` : a > h ? `押 ${awayName} 贏` : '押平手';

    // 隊徽 + 比分大字（取代預設的 SVG icon）
    const _crest = team => {
      const v = team.crest || team.flag;
      if (!v) return '<span class="sc-vs-blank"></span>';
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        return `<img src="${v}" alt="" class="sc-vs-crest">`;
      }
      return `<span class="sc-vs-flag">${v}</span>`;
    };
    const imagesHtml = `
      <div class="sc-vs-block">
        <div class="sc-vs-side">${_crest(ht)}<div class="sc-vs-team">${homeName}</div></div>
        <div class="sc-vs-score"><span class="sc-vs-h">${h}</span><span class="sc-vs-dash">-</span><span class="sc-vs-a">${a}</span></div>
        <div class="sc-vs-side">${_crest(at)}<div class="sc-vs-team">${awayName}</div></div>
      </div>`;

    showShareCard({
      eventKey: 'predict-' + matchId,
      icon: 'predict',
      imagesHtml,
      title: '我的預測',
      subtitle: 'MY PREDICTION',
      bodyText: winText,
      themeColor: '#42a5f5',
      previewLabel: `🎯 押好了 ${h}-${a}！告訴朋友你看好誰`,
      shareText: `🎯 我預測 ${homeName} ${h}-${a} ${awayName}！你猜呢？來 Soccer麥迪 較量比分準度。`,
    });
  }
  window.showPredictShareCard = showPredictShareCard;

  // 連勝里程碑分享卡
  function _maybeShowPredictStreakCard(streak, bonusXP) {
    if (typeof window.showShareCard !== 'function') return;
    showShareCard({
      eventKey: 'predict-streak-' + streak,
      icon: 'predict',
      badge: streak,
      title: `連續 ${streak} 天預測`,
      subtitle: 'PREDICT STREAK MILESTONE',
      bodyText: `每天都來預測比分，連續 <b>${streak}</b> 天<br/>球迷直覺 + AI 分析，雙重決策訓練`,
      reward: `+${bonusXP} XP 里程碑`,
      themeColor: '#42a5f5',
      previewLabel: `🔥 連 ${streak} 天每天預測！秀給朋友看`,
      shareText: `🎯 我在 Soccer麥迪 連續 ${streak} 天預測比賽！每天動腦不間斷，你也來挑戰？`,
    });
  }
  window._maybeShowPredictStreakCard = _maybeShowPredictStreakCard;

  // ── 啟動：頁面載入後渲染 + 每分鐘刷新 ──
  function _init() {
    updatePredictNavBadge();
    renderPredictHomeHero();
    // 賽事切換 → 重新渲染
    window.addEventListener('tournamentChanged', () => {
      setTimeout(() => {
        updatePredictNavBadge();
        renderPredictHomeHero();
      }, 400);
    });
    // 每分鐘刷新（倒數時間 + 進入 24h 內的場次也要排進來）
    setInterval(() => {
      updatePredictNavBadge();
      renderPredictHomeHero();
    }, 60 * 1000);
    // 每天首次造訪 → spotlight 提醒（5 秒後彈，等其他引導/分享卡跑完）
    setTimeout(maybeShowPredictSpotlight, 5000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_init, 1500));
  } else {
    setTimeout(_init, 1500);
  }
})();
