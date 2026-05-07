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
    if (h > 24) return `${Math.floor(h / 24)} 天後開賽`;
    if (h > 0) return `${h} 小時 ${m} 分後開賽`;
    return `${m} 分鐘後開賽`;
  }
  function _crestImg(team) {
    if (team && team.crest) return `<img src="${team.crest}" alt="" class="pp-crest">`;
    if (team && team.flag) return `<span class="pp-flag">${team.flag}</span>`;
    return '<span class="pp-crest pp-crest-blank"></span>';
  }
  function renderPredictHomeHero() {
    const root = document.getElementById('home-pending-predict');
    const list = document.getElementById('pending-predict-list');
    const badge = document.getElementById('pending-predict-count');
    const streakEl = document.getElementById('pending-predict-streak');
    if (!root || !list) return;

    const pending = getPendingPredicts();
    if (!pending.length) { root.style.display = 'none'; return; }
    root.style.display = '';
    if (badge) badge.textContent = `${pending.length} 場`;

    // streak 顯示
    const streak = getPredictStreak();
    if (streakEl) {
      if (streak.current > 0) {
        streakEl.innerHTML = `<span class="pp-streak-flame">🔥</span> 連續 <b>${streak.current}</b> 天`;
      } else {
        streakEl.innerHTML = '';
      }
    }

    const teams = _getCurrentTeams();
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
          ${_crestImg(ht)}
          <span class="pp-team-name">${homeName}</span>
          <span class="pp-vs">VS</span>
          <span class="pp-team-name pp-team-name--away">${awayName}</span>
          ${_crestImg(at)}
        </div>
        <div class="pp-meta">
          <span class="pp-countdown">⏰ ${_fmtCountdown(msLeft)}</span>
          <button class="pp-go-btn" onclick="event.stopPropagation();openPredModal('${m.id}')">預測比分 →</button>
        </div>
      </div>`;
    }).join('');
  }
  window.renderPredictHomeHero = renderPredictHomeHero;

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

  function bumpPredictStreak() {
    const today = (typeof localDateStr === 'function') ? localDateStr() : new Date().toISOString().slice(0, 10);
    const s = getPredictStreak();
    if (s.lastDate === today) return { ...s, bumped: false };
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yesterday = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const next = {
      current: s.lastDate === yesterday ? s.current + 1 : 1,
      longest: 0,
      lastDate: today,
    };
    next.longest = Math.max(s.longest, next.current);
    localStorage.setItem(STORAGE_PREDICT_STREAK, JSON.stringify(next));
    return { ...next, bumped: true, prevCurrent: s.current };
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

    showShareCard({
      eventKey: 'predict-' + matchId,
      icon: 'predict',
      title: `${h} - ${a}`,
      subtitle: 'MY PREDICTION',
      bodyText: `${homeName} <b>vs</b> ${awayName}<br/>${winText}`,
      themeColor: '#42a5f5',
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
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_init, 1500));
  } else {
    setTimeout(_init, 1500);
  }
})();
