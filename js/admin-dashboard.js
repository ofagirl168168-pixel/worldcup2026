/* admin-dashboard.js
 * 數據儀表板：拉 admin_daily_stats RPC + admin_top_lists RPC、渲染表格 + 摘要卡 + 熱門 top
 * 顯示條件：currentUser.email 屬於白名單時、nav admin button 才顯示
 * RPC 那邊也會擋非 admin、雙重保險
 */
(function () {
  'use strict';

  const ADMIN_EMAILS = ['ofagirl168168@gmail.com'];

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
      const [statsResp, topResp] = await Promise.all([
        window.DB.rpc('admin_daily_stats', { p_days: days }),
        window.DB.rpc('admin_top_lists', { p_days: Math.min(days, 14), p_limit: 5 }),
      ]);
      if (statsResp.error) throw statsResp.error;
      const rows = statsResp.data || [];
      const top = topResp.data || { arenas: [], rooms: [] };

      _renderSummaryCards(cardsHost, rows);
      if (tableHost) _renderTable(tableHost, rows);
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
    const total = rows.reduce((acc, r) => {
      acc.gacha   += r.gacha_draws   || 0;
      acc.matches += r.matches       || 0;
      acc.votes   += r.arena_votes   || 0;
      acc.rooms   += r.friend_rooms  || 0;
      acc.picks   += r.friend_picks  || 0;
      acc.active  += r.active_my_team|| 0;
      return acc;
    }, { gacha:0, matches:0, votes:0, rooms:0, picks:0, active:0 });

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
      ${card('🎮', '我的隊伍活躍', today.active_my_team, ytd.active_my_team, total.active)}
      ${card('🎰', '球員抽卡', today.gacha_draws, ytd.gacha_draws, total.gacha)}
      ${card('⚔️', '比賽', today.matches, ytd.matches, total.matches)}
      ${card('🗳️', '擂台投票', today.arena_votes, ytd.arena_votes, total.votes)}
      ${card('🏠', '挑戰賽開房', today.friend_rooms, ytd.friend_rooms, total.rooms)}
      ${card('💰', '挑戰賽下注', today.friend_picks, ytd.friend_picks, total.picks)}
    `;
  }

  function _renderTable(host, rows) {
    if (!rows.length) return;
    const header = `<tr>
      <th>日期</th><th>活躍</th><th>新建隊</th><th>抽卡</th><th>教練</th>
      <th>訓練</th><th>比賽</th><th>射門</th><th>投票</th><th>留言</th><th>開房</th><th>下注</th>
    </tr>`;
    const body = rows.map(r => `<tr>
      <td><b>${fmtDay(r.day)}</b></td>
      <td>${r.active_my_team || 0}</td>
      <td>${r.new_teams || 0}</td>
      <td>${r.gacha_draws || 0}</td>
      <td>${r.coach_draws || 0}</td>
      <td>${r.trainings || 0}</td>
      <td>${r.matches || 0}</td>
      <td>${r.rogue_games || 0}</td>
      <td>${r.arena_votes || 0}</td>
      <td>${r.arena_comments || 0}</td>
      <td>${r.friend_rooms || 0}</td>
      <td>${r.friend_picks || 0}</td>
    </tr>`).join('');
    host.innerHTML = `<table class="admin-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
  }

  function _renderTopLists(host, top) {
    const arenas = (top.arenas || []).map((r, i) =>
      `<li>${i + 1}. <code>${escapeHtml(r.opinion_id)}</code> — <b>${r.votes}</b> 票</li>`
    ).join('') || '<li>無資料</li>';
    const rooms = (top.rooms || []).map((r, i) =>
      `<li>${i + 1}. <code>${escapeHtml(r.room_code)}</code> — <b>${r.picks}</b> 注</li>`
    ).join('') || '<li>無資料</li>';
    host.innerHTML = `
      <div class="admin-top-col">
        <div class="admin-top-title">🥊 擂台熱門</div>
        <ol class="admin-top-list">${arenas}</ol>
      </div>
      <div class="admin-top-col">
        <div class="admin-top-title">🤝 挑戰賽熱門</div>
        <ol class="admin-top-list">${rooms}</ol>
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
