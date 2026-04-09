/* =============================================
   TOURNAMENT.JS — 賽事切換控制器
   支援世界盃 (wc) 與歐冠 (ucl) 雙賽事
   URL: ?t=ucl 可直接進入歐冠模式
   ============================================= */

(function () {
  'use strict';

  // ── 當前賽事 ─────────────────────────────────────
  const DEFAULT_TOURNAMENT = 'wc';
  let _current = DEFAULT_TOURNAMENT;

  // ── 賽事設定 ─────────────────────────────────────
  const TOURNAMENT_CONFIG = {
    wc: {
      id: 'wc',
      name: '2026 世界盃',
      shortName: '世界盃',
      emoji: '⚽',
      color: '#f0c040',        // 金色
      colorAccent: '#e6a817',
      lsPrefix: 'wc26_',
      hasGroups: true,
      hasKnockout: true,
      description: 'FIFA 2026 世界盃 — 美國、加拿大、墨西哥'
    },
    ucl: {
      id: 'ucl',
      name: '2025/26 歐冠',
      shortName: '歐冠',
      emoji: '🏆',
      color: '#1a56db',        // 歐冠藍
      colorAccent: '#0e3fa8',
      lsPrefix: 'ucl26_',
      hasGroups: false,         // 歐冠新制沒有小組賽
      hasKnockout: true,
      hasLeaguePhase: true,     // 聯賽階段
      description: 'UEFA Champions League 2025/26'
    }
  };

  // ── 取得當前賽事 ─────────────────────────────────
  function getCurrentTournament() { return _current; }
  function getTournamentConfig(t) { return TOURNAMENT_CONFIG[t || _current]; }
  function isUCL() { return _current === 'ucl'; }
  function isWC() { return _current === 'wc'; }

  // ── localStorage 鍵值產生器 ──────────────────────
  function gk(key) {
    const prefix = TOURNAMENT_CONFIG[_current].lsPrefix;
    return prefix + key;
  }

  // ── 切換賽事 ─────────────────────────────────────
  let _switching = false;
  function switchTournament(target) {
    if (!TOURNAMENT_CONFIG[target] || target === _current || _switching) return;
    _switching = true;

    const cfg = TOURNAMENT_CONFIG[target];

    // 播放轉場動畫
    _playTransition(cfg, () => {
      _current = target;

      // 更新 URL 不刷頁
      const url = new URL(window.location);
      if (target === DEFAULT_TOURNAMENT) {
        url.searchParams.delete('t');
      } else {
        url.searchParams.set('t', target);
      }
      history.replaceState(null, '', url);

      // 切換全域資料
      _swapGlobalData(target);

      // 更新 UI
      _updateSwitcherUI(target);

      // 內容淡入效果
      const main = document.getElementById('main-content');
      if (main) {
        main.classList.add('tt-content-enter');
        main.addEventListener('animationend', () => main.classList.remove('tt-content-enter'), { once: true });
      }

      // 觸發事件讓各模組知道
      window.dispatchEvent(new CustomEvent('tournamentChanged', { detail: { tournament: target } }));
      _switching = false;
    });
  }

  // ── 轉場動畫 ─────────────────────────────────────
  function _playTransition(cfg, onMid) {
    const overlay = document.createElement('div');
    overlay.className = 'tournament-transition';
    overlay.style.setProperty('--tt-color', cfg.color);

    // 色帶刷過
    overlay.innerHTML += '<div class="tt-wipe"></div>';
    // 中央光環爆發
    overlay.innerHTML += '<div class="tt-flash"></div>';
    // 邊框閃光
    overlay.innerHTML += '<div class="tt-border-flash"></div>';
    // 中央 Emblem
    overlay.innerHTML += `<div class="tt-emblem">
      <div class="tt-emblem-icon">${cfg.emoji}</div>
      <div class="tt-emblem-text">${cfg.shortName}</div>
    </div>`;

    // 粒子爆發（16顆）
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i + (Math.random() - 0.5) * 0.4;
      const dist = 120 + Math.random() * 200;
      const size = 4 + Math.random() * 8;
      const p = document.createElement('div');
      p.className = 'tt-particle';
      p.style.cssText = `width:${size}px;height:${size}px;left:${cx}px;top:${cy}px;` +
        `--tx:${Math.cos(angle) * dist}px;--ty:${Math.sin(angle) * dist}px;` +
        `animation:ttParticleFly 0.7s ${i * 15}ms cubic-bezier(0.25,0,0,1) forwards`;
      overlay.appendChild(p);
    }

    document.body.appendChild(overlay);

    // 動畫進行到一半時切換資料
    setTimeout(onMid, 350);

    // 動畫結束後移除
    setTimeout(() => {
      overlay.remove();
    }, 1000);
  }

  // ── 切換全域資料指標 ─────────────────────────────
  function _swapGlobalData(t) {
    if (t === 'ucl') {
      // 歐冠資料 → 全域
      if (window.UCL_TEAMS)    window._activeTeams = window.UCL_TEAMS;
      if (window.UCL_MATCHES)  window._activeMatches = window.UCL_MATCHES;
      if (window.UCL_DAILY_QUESTIONS) window._activeDailyQ = window.UCL_DAILY_QUESTIONS;
      if (window.UCL_ARTICLES) window._activeArticles = window.UCL_ARTICLES;
    } else {
      // 世界盃資料 → 全域（const 宣告不在 window 上，需用 typeof 檢查）
      if (typeof TEAMS !== 'undefined')           window._activeTeams = TEAMS;
      if (typeof SCHEDULE !== 'undefined')        window._activeMatches = SCHEDULE;
      if (typeof DAILY_QUESTIONS !== 'undefined') window._activeDailyQ = DAILY_QUESTIONS;
      if (typeof ARTICLES !== 'undefined')        window._activeArticles = ARTICLES;
    }

    // 更新 game.js 的 GK（localStorage key）
    if (window.GK) {
      const prefix = TOURNAMENT_CONFIG[t].lsPrefix;
      window.GK.team     = prefix + 'team';
      window.GK.champion = prefix + 'champion';
      window.GK.groups   = prefix + 'groups';
      window.GK.daily    = prefix + 'daily';
    }
  }

  // ── 更新切換器 UI ────────────────────────────────
  function _updateSwitcherUI(t) {
    const cfg = TOURNAMENT_CONFIG[t];
    // 切換按鈕狀態
    document.querySelectorAll('.tournament-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tournament === t);
    });
    // 更新主題色（CSS 變數）
    document.documentElement.style.setProperty('--tournament-color', cfg.color);
    document.documentElement.style.setProperty('--tournament-accent', cfg.colorAccent);
    // body class 切換（供 CSS 主題用）
    document.body.classList.toggle('ucl-mode', t === 'ucl');
    document.documentElement.setAttribute('data-tournament-active', t);
    // 更新數據頁 tabs
    _updateStatsTabs(t);
    // 更新標題
    const titleEl = document.querySelector('.tournament-title');
    if (titleEl) titleEl.textContent = cfg.emoji + ' ' + cfg.name;
  }

  // ── 更新數據頁 tabs ──────────────────────────────
  function _updateStatsTabs(t) {
    const tabsEl = document.querySelector('.stats-tabs');
    if (!tabsEl) return;
    if (t === 'ucl') {
      tabsEl.innerHTML = `
        <button class="stats-tab active" data-stats="standings">聯賽積分榜</button>
        <button class="stats-tab" data-stats="bracket">淘汰賽對陣</button>
        <button class="stats-tab" data-stats="rankings">UEFA係數排名</button>`;
    } else {
      tabsEl.innerHTML = `
        <button class="stats-tab active" data-stats="standings">小組積分榜</button>
        <button class="stats-tab" data-stats="scorers">射手榜</button>
        <button class="stats-tab" data-stats="assists">助攻榜</button>
        <button class="stats-tab" data-stats="keepers">門將數據</button>
        <button class="stats-tab" data-stats="rankings">FIFA排名</button>`;
    }
    // 重新綁定 click 事件
    tabsEl.querySelectorAll('.stats-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.stats-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.stats === 'bracket' && typeof renderUCLBracket === 'function') {
          renderUCLBracket();
        } else if (typeof renderStats === 'function') {
          renderStats(btn.dataset.stats);
        }
      });
    });
  }

  // ── 初始化：讀取 URL 參數 ────────────────────────
  function initTournament() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    if (t && TOURNAMENT_CONFIG[t]) {
      _current = t;
    }
    // 設定初始全域資料
    _swapGlobalData(_current);
    _updateSwitcherUI(_current);
  }

  // ── 綁定切換按鈕事件 ─────────────────────────────
  function bindSwitcher() {
    document.querySelectorAll('.tournament-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTournament(btn.dataset.tournament);
      });
    });
  }

  // ── 導出 ─────────────────────────────────────────
  window.Tournament = {
    init: initTournament,
    bind: bindSwitcher,
    switch: switchTournament,
    current: getCurrentTournament,
    config: getTournamentConfig,
    isUCL, isWC, gk,
    CONFIG: TOURNAMENT_CONFIG
  };

})();
