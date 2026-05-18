/* admin-dashboard.js
 * 數據儀表板：拉 admin_daily_stats RPC + admin_top_lists RPC、渲染表格 + 摘要卡 + 熱門 top
 * 顯示條件：currentUser.email 屬於白名單時、nav admin button 才顯示
 * RPC 那邊也會擋非 admin、雙重保險
 */
(function () {
  'use strict';

  const ADMIN_EMAILS = ['ofagirl168168@gmail.com', 'timls61004@gmail.com', 'dick61004@gmail.com'];

  function _isAdmin() {
    try {
      const u = window.currentUser;
      return !!(u && u.email && ADMIN_EMAILS.includes(u.email));
    } catch (e) { return false; }
  }

  // 入口：登入狀態變動時呼叫、決定是否顯示 nav admin button
  function updateAdminNavVisibility() {
    const desktop = document.getElementById('nav-admin-btn');
    const mobile = document.getElementById('mobile-nav-admin-btn');
    const show = _isAdmin();
    if (desktop) desktop.style.display = show ? '' : 'none';
    if (mobile) mobile.style.display = show ? '' : 'none';
  }

  // 拉資料 + 渲染整個 section
  async function renderDashboard(days = 14) {
    const cardsHost = document.getElementById('admin-summary-cards');
    const tableHost = document.getElementById('admin-table-wrap');
    const topHost = document.getElementById('admin-top-lists');
    if (!cardsHost) return;

    if (!_isAdmin()) {
      cardsHost.innerHTML = '<div class="admin-empty">⚠️ 此頁面僅限 admin 帳號</div>';
      if (tableHost) tableHost.innerHTML = '';
      if (topHost) topHost.innerHTML = '';
      return;
    }

    cardsHost.innerHTML = '<div class="admin-loading">載入中…</div>';
    if (tableHost) tableHost.innerHTML = '';
    if (topHost) topHost.innerHTML = '';

    try {
      const [statsResp, topResp, streakResp] = await Promise.all([
        window.DB.rpc('admin_daily_stats', { p_days: days }),
        window.DB.rpc('admin_top_lists', { p_days: Math.min(days, 14), p_limit: 5 }),
        window.DB.rpc('admin_streak_distribution'),
      ]);
      if (statsResp.error) throw statsResp.error;
      const rows = statsResp.data || [];
      const top = topResp.data || { arenas: [], rooms: [], articles: [], tabs: [], tournaments: [] };
      const streak = streakResp.data || [];

      _renderSummaryCards(cardsHost, rows);
      if (tableHost) _renderTable(tableHost, rows, streak);
      if (topHost) _renderTopLists(topHost, top);
    } catch (e) {
      console.error('[admin] load err', e);
      const msg = String(e.message || e);
      if (msg.includes('NOT_ADMIN')) {
        cardsHost.innerHTML = '<div class="admin-empty">⚠️ 此 RPC 拒絕：你不在 admin 白名單</div>';
      } else if (msg.includes('admin_daily_stats')) {
        cardsHost.innerHTML = '<div class="admin-empty">⚠️ RPC 尚未建立、請到 Supabase Dashboard 跑 <code>20260518000180_admin_daily_stats_rpc.sql</code></div>';
      } else {
        cardsHost.innerHTML = `<div class="admin-empty">⚠️ 載入失敗：${escapeHtml(msg)}</div>`;
      }
    }
  }

  // 摘要卡：今日 / 昨日 / N 天合計 / 日均
  function _renderSummaryCards(host, rows) {
    if (!rows.length) {
      host.innerHTML = '<div class="admin-empty">區間內無數據</div>';
      return;
    }
    // rows 由 RPC 已 ORDER BY day DESC、所以 rows[0] 是今天、rows[1] 昨天
    const today = rows[0] || {};
    const ytd = rows[1] || {};
    const days = rows.length;
    const sum = (key) => rows.reduce((a, r) => a + (r[key] || 0), 0);
    const card = (icon, label, today, yd, total) => {
      const delta = (today != null && yd != null) ? (today - yd) : null;
      const deltaTxt = delta == null ? '' : (delta > 0 ? `+${delta}` : `${delta}`);
      const deltaCls = delta == null ? '' : delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : '';
      return `<div class="admin-card">
        <div class="admin-card-label">${icon} ${label}</div>
        <div class="admin-card-today">${today ?? '—'}</div>
        <div class="admin-card-meta">
          昨日 ${yd ?? '—'}
          ${deltaTxt ? `<span class="admin-card-delta ${deltaCls}">${deltaTxt}</span>` : ''}
        </div>
        <div class="admin-card-total">${days} 天合計 ${total}</div>
      </div>`;
    };

    host.innerHTML = `
      ${card('🆕', '新註冊',          today.new_users,        ytd.new_users,        sum('new_users'))}
      ${card('🎮', '我的隊伍活躍',    today.active_my_team,   ytd.active_my_team,   sum('active_my_team'))}
      ${card('👥', '擂台活躍',        today.active_arena,     ytd.active_arena,     sum('active_arena'))}
      ${card('🎰', '球員抽卡',        today.gacha_draws,      ytd.gacha_draws,      sum('gacha_draws'))}
      ${card('⚔️', 'PvP 對戰',        today.matches_pvp,      ytd.matches_pvp,      sum('matches_pvp'))}
      ${card('🤖', 'AI 聯賽',         today.matches_pve,      ytd.matches_pve,      sum('matches_pve'))}
      ${card('🗳️', '擂台投票',        today.arena_votes,      ytd.arena_votes,      sum('arena_votes'))}
      ${card('🏠', '挑戰賽開房',      today.friend_rooms,     ytd.friend_rooms,     sum('friend_rooms'))}
      ${card('💰', '挑戰賽下注',      today.friend_picks,     ytd.friend_picks,     sum('friend_picks'))}
      ${card('📰', '文章閱讀',        today.event_articles,   ytd.event_articles,   sum('event_articles'))}
      ${card('📑', '頁面切換',        today.event_tab_views,  ytd.event_tab_views,  sum('event_tab_views'))}
      ${card('🔗', '分享',            today.event_shares,     ytd.event_shares,     sum('event_shares'))}
    `;
  }

  function _renderTable(host, rows, streakBuckets) {
    if (!rows.length) return;
    const header = `<tr>
      <th>日期</th><th>新註冊</th><th>活躍隊</th><th>擂台活躍</th>
      <th>新建隊</th><th>抽卡</th><th>教練</th>
      <th>RP 訓練</th><th>集訓營</th>
      <th>PvP</th><th>AI</th><th>射門</th>
      <th>投票</th><th>留言</th><th>開房</th><th>下注</th>
      <th>頁面</th><th>文章</th><th>分享</th>
    </tr>`;
    const body = rows.map(r => `<tr>
      <td><b>${fmtDay(r.day)}</b></td>
      <td>${r.new_users || 0}</td>
      <td>${r.active_my_team || 0}</td>
      <td>${r.active_arena || 0}</td>
      <td>${r.new_teams || 0}</td>
      <td>${r.gacha_draws || 0}</td>
      <td>${r.coach_draws || 0}</td>
      <td>${r.trainings_normal || 0}</td>
      <td>${r.trainings_focus || 0}</td>
      <td>${r.matches_pvp || 0}</td>
      <td>${r.matches_pve || 0}</td>
      <td>${r.rogue_games || 0}</td>
      <td>${r.arena_votes || 0}</td>
      <td>${r.arena_comments || 0}</td>
      <td>${r.friend_rooms || 0}</td>
      <td>${r.friend_picks || 0}</td>
      <td>${r.event_tab_views || 0}</td>
      <td>${r.event_articles || 0}</td>
      <td>${r.event_shares || 0}</td>
    </tr>`).join('');
    let html = `<table class="admin-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
    // streak 分布直方圖
    if (Array.isArray(streakBuckets) && streakBuckets.length) {
      const maxN = Math.max(...streakBuckets.map(b => b.count || 0), 1);
      const totalUsers = streakBuckets.reduce((a, b) => a + (b.count || 0), 0);
      const barRows = streakBuckets.map(b => {
        const pct = Math.round((b.count / maxN) * 100);
        return `<div class="admin-streak-row">
          <div class="admin-streak-bucket">${escapeHtml(b.bucket)} 天</div>
          <div class="admin-streak-bar-wrap"><div class="admin-streak-bar" style="width:${pct}%"></div></div>
          <div class="admin-streak-count">${b.count} 人</div>
        </div>`;
      }).join('');
      html += `<div class="admin-streak-card">
        <div class="admin-streak-title">🔥 連續登入天數分布（${totalUsers} 人）</div>
        ${barRows}
      </div>`;
    }
    host.innerHTML = html;
  }

  function _renderTopLists(host, top) {
    const renderList = (items, labelKey, countKey, suffix) => {
      const list = (items || []);
      if (!list.length) return '<li>無資料</li>';
      return list.map((r, i) => `<li>${i + 1}. <code>${escapeHtml(r[labelKey])}</code> — <b>${r[countKey]}</b> ${suffix}</li>`).join('');
    };

    const arenas      = renderList(top.arenas,      'opinion_id', 'votes',    '票');
    const rooms       = renderList(top.rooms,       'room_code',  'picks',    '注');
    const articles    = renderList(top.articles,    'article_id', 'views',    '次');
    const tabs        = renderList(top.tabs,        'tab',        'views',    '次');
    const tournaments = renderList(top.tournaments, 'tournament', 'switches', '次');

    host.innerHTML = `
      <div class="admin-top-col">
        <div class="admin-top-title">🥊 擂台熱門</div>
        <ol class="admin-top-list">${arenas}</ol>
      </div>
      <div class="admin-top-col">
        <div class="admin-top-title">🤝 挑戰賽熱門</div>
        <ol class="admin-top-list">${rooms}</ol>
      </div>
      <div class="admin-top-col">
        <div class="admin-top-title">📰 文章熱門</div>
        <ol class="admin-top-list">${articles}</ol>
      </div>
      <div class="admin-top-col">
        <div class="admin-top-title">📑 各 Tab 流量</div>
        <ol class="admin-top-list">${tabs}</ol>
      </div>
      <div class="admin-top-col">
        <div class="admin-top-title">🏆 賽事切換</div>
        <ol class="admin-top-list">${tournaments}</ol>
      </div>
    `;
  }

  function fmtDay(d) {
    if (!d) return '';
    const s = String(d);
    return s.length >= 10 ? s.slice(5, 10).replace('-', '/') : s;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 事件綁定
  function _bind() {
    const refreshBtn = document.getElementById('admin-refresh-btn');
    const daysSel = document.getElementById('admin-days-select');
    if (refreshBtn) refreshBtn.addEventListener('click', () => renderDashboard(parseInt(daysSel?.value || '14', 10)));
    if (daysSel) daysSel.addEventListener('change', () => renderDashboard(parseInt(daysSel.value, 10)));
  }

  // 監聽 section change：切到 admin 才載
  function _onSectionShown(sec) {
    if (sec === 'admin') {
      renderDashboard(parseInt(document.getElementById('admin-days-select')?.value || '14', 10));
    }
  }

  // 登入狀態變動時更新 admin nav 可見性
  function _onAuthChanged() {
    updateAdminNavVisibility();
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { _bind(); updateAdminNavVisibility(); });
  } else {
    _bind();
    updateAdminNavVisibility();
  }
  // hook showSection（如果該頁切到 admin 才觸發載入）
  const _origShowSection = window.showSection;
  if (typeof _origShowSection === 'function') {
    window.showSection = function (sec, ...rest) {
      _origShowSection.apply(this, [sec, ...rest]);
      _onSectionShown(sec);
    };
  } else {
    // showSection 還沒定義，輪詢一下再 wrap
    const t = setInterval(() => {
      if (typeof window.showSection === 'function') {
        const orig = window.showSection;
        window.showSection = function (sec, ...rest) {
          orig.apply(this, [sec, ...rest]);
          _onSectionShown(sec);
        };
        clearInterval(t);
      }
    }, 200);
    setTimeout(() => clearInterval(t), 8000);
  }

  // 暴露給 app.js 在登入成功 / 登出時呼叫
  window.AdminDashboard = {
    updateNavVisibility: updateAdminNavVisibility,
    render: renderDashboard,
  };
})();
