/* =============================================
   FRIEND-ROOM.JS — 麥迪挑戰賽（朋友直播房）
   PR-2b：大廳列表 + 資料層
   後續 PR：建房 / 加入猜分 / 同步直播 / 結算
   ============================================= */

(function () {
  'use strict';

  const RT = { rooms: null, picks: null };
  let _lobbyCache = [];
  let _lobbyView = 'all'; // 'all' = 大廳全部開放中房 / 'mine' = 我參與過的房（包括已結束）

  // 房號字元池（去掉容易混淆的 0/O/1/I/L）
  const CODE_POOL = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function _genRoomCode() {
    let s = '';
    for (let i = 0; i < 6; i++) {
      s += CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)];
    }
    return s;
  }

  function _voterKey() {
    // 沿用擂台投票同一支裝置碼（opinion-poll.js 用的是 'maddy_voter_key'）
    let k = localStorage.getItem('maddy_voter_key');
    if (!k) {
      k = 'v_' + Math.random().toString(36).slice(2, 10)
            + Math.random().toString(36).slice(2, 10)
            + Date.now().toString(36);
      localStorage.setItem('maddy_voter_key', k);
    }
    return k;
  }

  // 房主自己建的房存 localStorage → 大廳列表上能看到「進入」而不是 disabled「邀請制」
  // (host_voter_key 是裝置指紋，不該回傳給 client，所以走這條 local 旁路)
  const _HOSTING_KEY = 'fr_hosting_rooms';
  function _markAsHost(roomCode) {
    try {
      const list = JSON.parse(localStorage.getItem(_HOSTING_KEY) || '[]');
      if (!list.includes(roomCode)) {
        list.push(roomCode);
        // 上限 20 個（建超多房的話只記最近的）
        while (list.length > 20) list.shift();
        localStorage.setItem(_HOSTING_KEY, JSON.stringify(list));
      }
    } catch (e) {}
  }
  function _isHostOfRoom(roomCode) {
    try {
      const list = JSON.parse(localStorage.getItem(_HOSTING_KEY) || '[]');
      return list.includes(roomCode);
    } catch (e) { return false; }
  }

  function _resolveNickname() {
    // 同 opinion-poll.js:1329 邏輯：登入暱稱 → localStorage anon nick → 自動生成
    try {
      if (typeof window.currentProfile === 'object' && window.currentProfile && window.currentProfile.nickname) {
        return String(window.currentProfile.nickname).slice(0, 20);
      }
    } catch (e) {}
    let anon = localStorage.getItem('opinion_anon_nick');
    if (!anon) {
      const pool = ['路人甲','看球狼','PK魂','擂台客','熱血派','場邊記者','足球宅','替補中','VAR魔人','越位線'];
      anon = pool[Math.floor(Math.random() * pool.length)] + Math.floor(Math.random() * 90 + 10);
      localStorage.setItem('opinion_anon_nick', anon);
    }
    return anon;
  }

  // 從 EPL/UCL/WC 賽程拿出未開賽的比賽（過去 3h 仍可選，給「賽後重看」用）
  function _listUpcomingMatches() {
    const all = [];
    const now = Date.now();
    const eplTeams = window.EPL_TEAMS || {};
    const uclTeams = window.UCL_TEAMS || {};
    const wcTeams = (typeof TEAMS !== 'undefined') ? TEAMS : {};

    function add(matches, teams, league) {
      if (!Array.isArray(matches)) return;
      for (const m of matches) {
        if (!m.date || !m.time) continue;
        if (m.status === 'finished') continue;
        const dt = new Date(`${m.date}T${m.time}:00+08:00`).getTime();
        if (isNaN(dt) || dt < now - 3 * 3600 * 1000) continue;
        const home = teams[m.home];
        const away = teams[m.away];
        if (!home || !away) continue;
        all.push({
          id: m.id, league,
          date: m.date, time: m.time,
          kickoff_ts: dt,
          home_code: m.home, away_code: m.away,
          home_name: home.nameCN || home.name || m.home,
          away_name: away.nameCN || away.name || m.away,
          home_flag: home.flag || '',
          away_flag: away.flag || '',
        });
      }
    }
    add(window.EPL_MATCHES, eplTeams, 'epl');
    add(window.UCL_MATCHES, uclTeams, 'ucl');
    if (typeof SCHEDULE !== 'undefined') add(SCHEDULE, wcTeams, 'wc');

    return all.sort((a, b) => a.kickoff_ts - b.kickoff_ts);
  }

  // ── Supabase helpers ────────────────────────────────────
  async function _fetchLobby() {
    if (!window.DB) return [];
    try {
      const { data, error } = await window.DB.rpc('friend_rooms_lobby');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[friend-room] lobby fetch failed', e);
      return [];
    }
  }

  // 我參與過的房：抓 friend_picks where voter_key = my key，連同 friend_rooms 一起拿
  // 包含已結束的房，按建房時間倒序（最新在前）
  async function _fetchMyRooms() {
    if (!window.DB) return [];
    try {
      const myKey = _voterKey();
      const { data, error } = await window.DB
        .from('friend_picks')
        .select('score_home, score_away, is_over, created_at, room:friend_rooms!inner(*)')
        .eq('voter_key', myKey)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      // 把 nested room 解構成 row + 我的猜測欄位
      return (data || []).map(p => ({
        ...p.room,
        my_pick: { sh: p.score_home, sa: p.score_away, over: !!p.is_over },
        my_pick_at: p.created_at,
      }));
    } catch (e) {
      console.warn('[friend-room] my rooms fetch failed', e);
      return [];
    }
  }

  // ── 渲染 ────────────────────────────────────────────────
  function _typeBadge(room) {
    if (room.is_official) return `<span class="fr-type fr-type--official">官方 <i class="fas fa-check-circle"></i></span>`;
    if (!room.is_public) return `<span class="fr-type fr-type--private">私人 <i class="fas fa-lock"></i></span>`;
    return `<span class="fr-type fr-type--public">公開</span>`;
  }

  // 官方房沒設 room_name 時用 fallback 名稱
  function _displayRoomName(room) {
    if (room.room_name) return room.room_name;
    if (room.is_official) return '麥迪官方聯賽';
    return null;
  }

  function _matchTitle(room) {
    const meta = room.match_meta || {};
    const home = meta.home_name || meta.home_code || '主隊';
    const away = meta.away_name || meta.away_code || '客隊';
    const homeFlag = meta.home_flag ? `<img src="${meta.home_flag}" alt="" class="fr-crest" />` : '';
    const awayFlag = meta.away_flag ? `<img src="${meta.away_flag}" alt="" class="fr-crest" />` : '';
    const matchLine = `${homeFlag}${home} <span class="fr-vs">vs</span> ${awayFlag}${away}`;
    const name = _displayRoomName(room);
    if (name) {
      const safeName = name.replace(/[<>"'&]/g, c => ({
        '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'
      }[c]));
      return `<div class="fr-cell-name">${safeName}</div><div class="fr-cell-sub">${matchLine}</div>`;
    }
    return matchLine;
  }

  function _countdown(kickoffISO) {
    const t = new Date(kickoffISO).getTime() - Date.now();
    if (t <= 0) return '<span class="fr-cd fr-cd--live">進行中</span>';
    const m = Math.floor(t / 60000);
    if (m < 60) return `<span class="fr-cd">${m} 分後開賽</span>`;
    const h = Math.floor(m / 60);
    return `<span class="fr-cd">${h} 小時後</span>`;
  }

  function _joinButton(room) {
    const full = false; // 房間人數不限，預留欄位
    if (room.status === 'live') {
      return `<button class="fr-btn fr-btn--late" onclick="FriendRoom.joinRoom('${room.room_code}')">遲到加入</button>`;
    }
    if (room.status === 'ended') {
      return `<button class="fr-btn fr-btn--ended" onclick="FriendRoom.viewReplay('${room.room_code}')">看回放</button>`;
    }
    if (!room.is_public) {
      // 房主自己建的私人房 → 顯示「進入」，否則 disabled「邀請制」
      if (_isHostOfRoom(room.room_code)) {
        return `<button class="fr-btn fr-btn--join" onclick="FriendRoom.joinRoom('${room.room_code}')">進入</button>`;
      }
      return `<button class="fr-btn fr-btn--locked" disabled>邀請制 🔒</button>`;
    }
    if (full) return `<button class="fr-btn fr-btn--full" disabled>已額滿</button>`;
    return `<button class="fr-btn fr-btn--join" onclick="FriendRoom.joinRoom('${room.room_code}')">加入</button>`;
  }

  function _renderRow(room) {
    return `
      <div class="fr-row" data-room="${room.room_code}">
        <span class="fr-cell fr-cell--id">#${room.room_code}</span>
        <span class="fr-cell fr-cell--type">${_typeBadge(room)}</span>
        <span class="fr-cell fr-cell--match">${_matchTitle(room)}</span>
        <span class="fr-cell fr-cell--cd">${_countdown(room.kickoff_at)}</span>
        <span class="fr-cell fr-cell--bet">${room.bet_amount > 0 ? `💎 ${room.bet_amount}` : '<span class="fr-cell-bet-free">純娛樂</span>'}</span>
        <span class="fr-cell fr-cell--count">${room.pick_count} 人</span>
        <span class="fr-cell fr-cell--act">${_joinButton(room)}</span>
      </div>`;
  }

  // 「我的紀錄」用的 row：把「人數 / 押注」換成「我的猜測 / 結果」
  function _renderMyRow(room) {
    const pick = room.my_pick || {};
    const myPickStr = `<b>${pick.sh}-${pick.sa}</b>${pick.over ? ' <span class="fr-cell-bet-free">自訂</span>' : ''}`;
    let resultStr = '';
    if (room.status === 'ended' && room.result_home != null && room.result_away != null) {
      const exact = pick.sh === room.result_home && pick.sa === room.result_away;
      const dirHomeWin = pick.sh > pick.sa, realHomeWin = room.result_home > room.result_away;
      const dirDraw = pick.sh === pick.sa, realDraw = room.result_home === room.result_away;
      const sideHit = !exact && (
        (dirHomeWin && realHomeWin) ||
        (!dirHomeWin && !dirDraw && !realHomeWin && !realDraw) ||
        (dirDraw && realDraw)
      );
      const tag = exact ? '🎯 完全猜中' : (sideHit ? '✅ 猜中勝負' : '❌ 沒中');
      resultStr = `${room.result_home}-${room.result_away} <span class="fr-cell-bet-free">${tag}</span>`;
    } else if (room.status === 'live') {
      resultStr = '<span class="fr-cd fr-cd--live">進行中</span>';
    } else if (room.status === 'locked') {
      resultStr = '<span class="fr-cd">已鎖定</span>';
    } else if (room.status === 'cancelled') {
      resultStr = '<span class="fr-cell-bet-free">已取消</span>';
    } else {
      resultStr = `<span class="fr-cd">等待開賽</span>`;
    }
    // 「我的紀錄」一律可看（自己投過 = 有權限）→ 進入 / 看回放
    const action = (room.status === 'ended' || room.status === 'cancelled')
      ? `<button class="fr-btn fr-btn--ended" onclick="FriendRoom.viewReplay('${room.room_code}')">看回放</button>`
      : `<button class="fr-btn fr-btn--join" onclick="FriendRoom.joinRoom('${room.room_code}')">進入</button>`;
    return `
      <div class="fr-row" data-room="${room.room_code}">
        <span class="fr-cell fr-cell--id">#${room.room_code}</span>
        <span class="fr-cell fr-cell--type">${_typeBadge(room)}</span>
        <span class="fr-cell fr-cell--match">${_matchTitle(room)}</span>
        <span class="fr-cell fr-cell--cd">${_countdown(room.kickoff_at)}</span>
        <span class="fr-cell fr-cell--bet">${myPickStr}</span>
        <span class="fr-cell fr-cell--count">${resultStr}</span>
        <span class="fr-cell fr-cell--act">${action}</span>
      </div>`;
  }

  function _renderLobby(rooms) {
    const list = document.getElementById('fr-lobby-list');
    if (!list) return;
    if (!rooms || !rooms.length) {
      const isMine = _lobbyView === 'mine';
      list.innerHTML = `
        <div class="fr-empty">
          <div class="fr-empty-icon">${isMine ? '🗒️' : '🏟️'}</div>
          <div class="fr-empty-title">${isMine ? '你還沒參加過任何挑戰賽' : '目前沒有開放中的房間'}</div>
          <div class="fr-empty-desc">${isMine ? '到「大廳」找一場玩玩看吧' : '點右上角「+ 開房」當第一個房主'}</div>
        </div>`;
      return;
    }
    const rowFn = _lobbyView === 'mine' ? _renderMyRow : _renderRow;
    list.innerHTML = rooms.map(rowFn).join('');
  }

  // 把現有 filter row 裡的 pill 換成 「大廳 / 我的紀錄」雙 tab。Idempotent，多次呼叫不重複注入
  function _ensureLobbyTabs() {
    const filterRow = document.querySelector('.fr-lobby-filter');
    if (!filterRow) return;
    if (filterRow.querySelector('[data-fr-tab]')) return; // 已注入過

    // 拿掉原本的「本週開放中」靜態 pill（如果有）
    const oldPill = filterRow.querySelector('.fr-pill');
    if (oldPill && !oldPill.dataset.frTab) oldPill.remove();

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    wrap.innerHTML = `
      <button type="button" class="fr-pill fr-pill--active" data-fr-tab="all">大廳</button>
      <button type="button" class="fr-pill" data-fr-tab="mine">我的紀錄</button>
    `;
    filterRow.insertBefore(wrap, filterRow.firstChild);

    wrap.querySelectorAll('[data-fr-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.frTab;
        if (view === _lobbyView) return;
        _lobbyView = view;
        wrap.querySelectorAll('[data-fr-tab]').forEach(b =>
          b.classList.toggle('fr-pill--active', b.dataset.frTab === view));
        _lobbyCache = []; // 換 view 強制顯示「載入中」
        loadLobby();
      });
    });
  }

  async function loadLobby() {
    _ensureLobbyTabs();
    const list = document.getElementById('fr-lobby-list');
    if (list && !_lobbyCache.length) {
      list.innerHTML = `<div class="fr-loading">${_lobbyView === 'mine' ? '載入紀錄中…' : '載入大廳中…'}</div>`;
    }
    const rooms = _lobbyView === 'mine' ? await _fetchMyRooms() : await _fetchLobby();
    _lobbyCache = rooms;
    _renderLobby(rooms);
  }

  // ── Realtime：picks INSERT / rooms UPDATE → 重抓大廳 ────
  function _subscribeRealtime() {
    if (!window.DB || !window.DB.channel) return;
    if (RT.rooms) return;
    try {
      RT.rooms = window.DB
        .channel('friend-rooms-lobby')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'friend_rooms' },
          () => loadLobby())
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'friend_picks' },
          () => loadLobby())
        .subscribe();
    } catch (e) { console.warn('[friend-room] realtime sub failed', e); }
  }

  // ── 開房 modal ──────────────────────────────────────────
  function _formatTime(ts) {
    const d = new Date(ts);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${m}/${dd} ${hh}:${mm}`;
  }

  function _leagueIcon(lg) {
    return lg === 'epl' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : lg === 'ucl' ? '🇪🇺' : '🌍';
  }

  function _kickoffOptionsFor(match) {
    // 順序：立即派 → 對齊真實比賽派
    // 立即派（先）：5 分後 / 10 分後 — 給「想現在跟朋友玩」的人，不等真實比賽
    // 對齊派（後）：真實前 30 / 前 5 / 真實結束後 — 過去的時間自動隱藏
    const now = Date.now();
    const real = match.kickoff_ts;
    const opts = [];
    opts.push({ key: 'now+5',  label: `5 分鐘後立刻開（${_formatTime(now + 5 * 60000)}）`,  ts: now + 5  * 60000 });
    opts.push({ key: 'now+10', label: `10 分鐘後立刻開（${_formatTime(now + 10 * 60000)}）`, ts: now + 10 * 60000 });
    const t30 = real - 30 * 60000;
    const t5  = real - 5  * 60000;
    if (t30 > now + 30000) opts.push({ key: 'real-30', label: `真實比賽前 30 分（${_formatTime(t30)}）`, ts: t30 });
    if (t5  > now + 30000) opts.push({ key: 'real-5',  label: `真實比賽前 5 分（${_formatTime(t5)}）`,   ts: t5 });
    const tEnd = real + 120 * 60000;
    opts.push({ key: 'real+end', label: `真實比賽結束後（${_formatTime(tEnd)}）`, ts: tEnd });
    return opts;
  }

  // 房名檢查：禁不雅文字 + 宣傳文字
  function _validateRoomName(rawName) {
    const name = (rawName || '').trim();
    if (!name) return '請輸入房名';
    if (name.length > 30) return '房名 30 字內';
    const lower = name.toLowerCase();
    // 不雅 / 宣傳關鍵字（小集合，可日後擴增）
    const blocked = [
      // 中文不雅
      '幹你', '操你', '靠北', '靠杯', '三小', '智障', '腦殘', '白癡', '低能',
      '媽的', '機掰', '雞掰', '雞八', '幹爆', '草泥馬', '草尼馬', '幹他媽',
      // 英文
      'fuck', 'shit', 'bitch', 'asshole', 'cunt',
      // 性
      '色情', '援交', '一夜情', '上門', '叫小姐', '茶莊', '魚訊',
      // 宣傳/賭
      '加賴', '加我line', '加微信', 'wechat', 'wx:', 'qq:', '電報', 'telegram',
      '賭博', '博彩', '彩票', '六合彩', '北京賽車', '幸運飛艇', '彩金',
      '兼職', '日入', '日進', '輕鬆賺', '日領', '線上博',
    ];
    for (const w of blocked) {
      if (lower.includes(w.toLowerCase())) return `房名不能包含「${w}」這類字眼`;
    }
    if (/https?:\/\//i.test(name) || /www\./i.test(name)) return '房名不能放網址';
    if (/@[A-Za-z0-9_]{2,}/.test(name)) return '房名不能放 @ID';
    if (/\d{8,}/.test(name)) return '房名不能放電話 / 長串數字';
    return null;
  }

  function openCreateModal() {
    if (!window.DB) {
      alert('連線中…請稍後再試');
      return;
    }
    const matches = _listUpcomingMatches();
    if (!matches.length) {
      alert('目前沒有未開賽的比賽，請過陣子再來');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'fr-modal-overlay';
    overlay.innerHTML = `
      <div class="fr-modal" role="dialog" aria-label="開新房間">
        <button class="fr-modal-close" type="button" aria-label="關閉">&times;</button>
        <h3 class="fr-modal-title">開新房間</h3>
        <p class="fr-modal-sub">跟朋友一起猜真實比賽、看模擬賽直播決勝負</p>

        <div class="fr-form-section">
          <label class="fr-form-label">1. 房名（讓朋友認得，最多 30 字）</label>
          <input class="fr-form-input" id="fr-form-name" type="text" maxlength="30"
            placeholder="例：哥們週末挑戰賽" />
          <div class="fr-form-err" id="fr-form-name-err"></div>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">2. 選比賽</label>
          <select class="fr-form-select" id="fr-form-match">
            ${matches.map(m =>
              `<option value="${m.league}|${m.id}">${_leagueIcon(m.league)} ${_formatTime(m.kickoff_ts)} · ${m.home_name} vs ${m.away_name}</option>`
            ).join('')}
          </select>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">3. 同步開賽時間</label>
          <div class="fr-form-options" id="fr-form-time-options"></div>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">4. 押注（決定贏家可領的寶石）</label>
          <div class="fr-form-options">
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="0" checked /> <span>純娛樂</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="1" /> <span>1 💎</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="2" /> <span>2 💎</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="3" /> <span>3 💎</span></label>
          </div>
          <p class="fr-form-hint">
            <b>瓜分池機制</b>（需登入才能領）：<br>
            池子 = 押注額 × 登入參與人數<br>
            ・<b>60% 平分</b>給「完全猜中比分」的人<br>
            ・<b>40% 平分</b>給「猜中勝負」的人<br>
            ・沒人完全猜中 → 100% 給猜中勝負的人<br>
            ・人越多獎金越大；押越高池子越深
          </p>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">5. 房型</label>
          <div class="fr-form-options">
            <label class="fr-form-opt"><input type="radio" name="fr-pub" value="public" checked /> <span>🔥 公開（任何人可加入）</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-pub" value="private" /> <span>🔒 私人（只有持邀請連結的人能進）</span></label>
          </div>
        </div>

        <div class="fr-form-actions">
          <button type="button" class="fr-btn fr-btn--cancel" id="fr-form-cancel">取消</button>
          <button type="button" class="fr-btn fr-btn--submit" id="fr-form-submit">下一步：投自己的比分</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.fr-modal-close').addEventListener('click', close);
    overlay.querySelector('#fr-form-cancel').addEventListener('click', close);

    // 比賽改變 → 重算「同步開賽時間」選項
    const matchSel = overlay.querySelector('#fr-form-match');
    const timeBox = overlay.querySelector('#fr-form-time-options');
    function refreshTimeOpts() {
      const [lg, id] = matchSel.value.split('|');
      const m = matches.find(x => x.league === lg && x.id === id);
      if (!m) return;
      const opts = _kickoffOptionsFor(m);
      timeBox.innerHTML = opts.map((o, i) =>
        `<label class="fr-form-opt">
           <input type="radio" name="fr-time" value="${o.key}" data-ts="${o.ts}" ${i === 0 ? 'checked' : ''} />
           <span>${o.label}</span>
         </label>`).join('');
    }
    matchSel.addEventListener('change', refreshTimeOpts);
    refreshTimeOpts();

    overlay.querySelector('#fr-form-submit').addEventListener('click', async () => {
      const submitBtn = overlay.querySelector('#fr-form-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '處理中…';
      try {
        await _submitCreate(matches, overlay);
        close();
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = '下一步：投自己的比分';
      }
    });
  }

  async function _submitCreate(matches, overlay) {
    // 房名驗證
    const nameInput = overlay.querySelector('#fr-form-name');
    const nameErrEl = overlay.querySelector('#fr-form-name-err');
    const roomName = (nameInput?.value || '').trim();
    const nameErr = _validateRoomName(roomName);
    if (nameErr) {
      if (nameErrEl) nameErrEl.textContent = nameErr;
      nameInput?.focus();
      throw new Error(nameErr);
    }
    if (nameErrEl) nameErrEl.textContent = '';

    const [lg, id] = overlay.querySelector('#fr-form-match').value.split('|');
    const match = matches.find(x => x.league === lg && x.id === id);
    if (!match) throw new Error('找不到比賽');

    const tInput = overlay.querySelector('input[name="fr-time"]:checked');
    const kickoffKey = tInput.value;             // 'now+5'/'now+10'/'real-30'... 給後面 onPickSaved 重算 now+X
    const kickoffTs = parseInt(tInput.dataset.ts);
    const betAmount = parseInt(overlay.querySelector('input[name="fr-bet"]:checked').value);
    const isPublic = overlay.querySelector('input[name="fr-pub"]:checked').value === 'public';
    const lockTs = kickoffTs - 60000; // lock 1 分鐘前
    const roomCode = _genRoomCode();

    const newRoom = {
      room_code: roomCode,
      room_name: roomName,
      host_voter_key: _voterKey(),
      host_nickname: _resolveNickname(),
      match_ref: `${lg}-${id}`,
      match_meta: {
        league: lg, match_id: id,
        date: match.date, time: match.time,
        home_code: match.home_code, away_code: match.away_code,
        home_name: match.home_name, away_name: match.away_name,
        home_flag: match.home_flag, away_flag: match.away_flag,
        real_kickoff_ts: match.kickoff_ts,
        // 給 host 投完比分後重算 kickoff_at 用（now+5/now+10 才需要重算，real-X 不變）
        kickoff_option_key: kickoffKey,
      },
      seed: roomCode,
      is_official: false,
      is_public: isPublic,
      bet_amount: betAmount,
      lock_at: new Date(lockTs).toISOString(),
      kickoff_at: new Date(kickoffTs).toISOString(),
      status: 'open',
    };
    const { error } = await window.DB.from('friend_rooms').insert(newRoom);
    if (error) {
      console.warn('[friend-room] create failed', error);
      alert('建立失敗：' + (error.message || '未知錯誤'));
      throw error;
    }

    // 標記房主，讓他在大廳能看到「進入」按鈕（不是 disabled「邀請制」）
    _markAsHost(roomCode);

    // 背景跑 OG 縮圖 render + upload Supabase Storage（房主投比分時並行跑，~1 秒就好）
    // 對 now+X 選項，OG 上的時間是「建房當下 +X 分」(HH:MM 精度)；之後重算 kickoff_at
    // 房主投比分通常 < 1 分鐘，HH:MM 顯示通常不變；極端情況 ±1 分誤差，房內倒數還是準的
    if (window.FriendRoomOGClient && window.FriendRoomOGClient.generateAndUpload) {
      window.FriendRoomOGClient.generateAndUpload(newRoom).catch(() => {});
    }

    // 流程：建房後不進房，跳獨立投比分 modal（強制房主自己投到）
    // 此時 host_picked=false → 大廳不顯示這房 → 其他人看不到。送出後才打開
    _showHostFirstPickModal(newRoom);
    // 注意：loadLobby 在這時刻會把房主自己列表中也排除（因為 host_picked=false），
    // 等送出後 _submitPick 會 update host_picked=true 再 loadLobby
  }

  // ── 房主建房後的獨立「先投比分」modal ─────────────────────
  // 不進入房間 overlay，只彈一個聚焦在「你先投自己的」的 modal
  // 投完才把 host_picked=true（大廳開放給其他人）+ 跳出分享連結 modal
  function _showHostFirstPickModal(room) {
    const meta = room.match_meta || {};

    const overlay = document.createElement('div');
    overlay.className = 'fr-modal-overlay';
    overlay.innerHTML = `
      <div class="fr-modal" role="dialog" style="max-width:540px">
        <div style="text-align:center;padding:8px 0 18px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:18px">
          <div style="font-size:38px;line-height:1;margin-bottom:8px">🎯</div>
          <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:6px">等等，先投你的！</div>
          <div style="font-size:13px;color:var(--text-muted);line-height:1.6">
            投完比分才會 <b style="color:#ffd700">開放讓朋友加入</b><br>並 <b style="color:#ffd700">複製分享連結</b>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;font-size:15px;color:var(--text-secondary);margin-bottom:14px">
          ${meta.home_flag ? `<img src="${meta.home_flag}" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover" />` : ''}
          <span>${_escapeHtml(meta.home_name || '主隊')}</span>
          <span style="color:var(--text-muted);font-size:12px">vs</span>
          <span>${_escapeHtml(meta.away_name || '客隊')}</span>
          ${meta.away_flag ? `<img src="${meta.away_flag}" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover" />` : ''}
        </div>
        <div id="fr-host-pick-body"></div>
        <div style="text-align:center;margin-top:12px">
          <button type="button" id="fr-host-pick-cancel"
            style="background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer;text-decoration:underline">
            取消這次建房
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    };

    // 取消建房 → 把剛 insert 的房 status 改 cancelled（lobby 自動排除）
    overlay.querySelector('#fr-host-pick-cancel').addEventListener('click', async () => {
      if (!confirm('要取消這次建房嗎？沒投比分前還能取消。')) return;
      try {
        await window.DB.from('friend_rooms')
          .update({ status: 'cancelled' })
          .eq('room_code', room.room_code);
      } catch (e) { console.warn('[friend-room] cancel failed', e); }
      close();
      loadLobby();
    });

    // 復用 _renderPickGrid 邏輯：build 一個 mini state，掛 onPickSaved callback
    const body = overlay.querySelector('#fr-host-pick-body');
    const state = {
      room,
      pick: null,
      submitted: false,
      lastPhase: null,
      simEnded: false,
      _close: close,
      // 送出按鈕標題：房主第一次投比分這刻才真正「建立房間」
      submitLabel: '建立房間',
      // 投比分 upsert 成功後跑這個（覆蓋掉預設的「已送出」確認頁）
      onPickSaved: async (st) => {
        // 對「now+X 分鐘後立刻開」的選項，把 kickoff_at 從「現在」開始重算
        // → 房主慢慢投比分也不會吃掉朋友能加入的時間
        // 「real-X」「real+end」依然錨定真實比賽時間，不重算
        const meta = st.room.match_meta || {};
        const update = { host_picked: true };
        const key = meta.kickoff_option_key || '';
        const m = /^now\+(\d+)$/.exec(key);
        if (m) {
          const minutes = parseInt(m[1]);
          const newKick = Date.now() + minutes * 60_000;
          update.kickoff_at = new Date(newKick).toISOString();
          update.lock_at = new Date(newKick - 60_000).toISOString();
        }
        // 一次更新 host_picked + 重算 kickoff（把房主的等待時間吃掉）
        // OG 已在 _submitCreate 開房瞬間就 fire-and-forget render 了，這裡不重 render
        try {
          await window.DB.from('friend_rooms').update(update).eq('room_code', st.room.room_code);
        } catch (e) { console.warn('[friend-room] update host_picked + kickoff failed', e); }
        // refresh lobby（讓房主也看到自己的房在列表中）
        loadLobby();
        // 關掉本 modal
        close();
        // 跳分享連結 modal（OG 早就 ready 了，房主投比分這段時間夠用）
        _showInviteResult(st.room.room_code, st.room.is_public);
      },
    };

    _renderPickGrid(body, state);
  }

  function _showInviteResult(roomCode, isPublic) {
    const url = `${location.origin}/r/${roomCode}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});

    const overlay = document.createElement('div');
    overlay.className = 'fr-modal-overlay';
    overlay.innerHTML = `
      <div class="fr-modal fr-modal--narrow" role="dialog">
        <button class="fr-modal-close" type="button">&times;</button>
        <div class="fr-invite-icon">${isPublic ? '🎉' : '🔒'}</div>
        <h3 class="fr-modal-title">${isPublic ? '公開房' : '私人房'}建立成功</h3>
        <div class="fr-invite-code">#${roomCode}</div>
        <p class="fr-modal-sub">邀請連結已複製到剪貼簿</p>
        <div class="fr-invite-link">${url}</div>
        <div class="fr-form-actions">
          <button type="button" class="fr-btn fr-btn--submit" id="fr-invite-ok">好</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.fr-modal-close').addEventListener('click', close);
    overlay.querySelector('#fr-invite-ok').addEventListener('click', close);
  }

  // ── 進房間 + 猜比分 ─────────────────────────────────────
  let _roomTickInterval = null;

  async function joinRoom(roomCode, opts) {
    if (!window.DB) { alert('連線中…請稍後再試'); return; }
    opts = opts || {};
    try {
      const { data: room, error } = await window.DB
        .from('friend_rooms')
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle();
      if (error) throw error;
      if (!room) { alert('找不到此房間，可能已被取消或房號有誤'); return; }
      if (room.status === 'cancelled') { alert('此房間已被取消'); return; }

      const myKey = _voterKey();
      const { data: existing } = await window.DB
        .from('friend_picks')
        .select('*')
        .eq('room_code', roomCode)
        .eq('voter_key', myKey)
        .maybeSingle();

      _renderRoomOverlay(room, existing || null, opts);
      // URL 同步成 /r/CODE，refresh 會走 Cloudflare function 拿客製 OG
      try { history.replaceState(null, '', `/r/${roomCode}`); } catch (e) {}
    } catch (e) {
      console.warn('[friend-room] joinRoom failed', e);
      alert('進房失敗：' + (e.message || '未知錯誤'));
    }
  }

  // 進入 ended phase 的條件：本人的 sim 真的跑完（state.simEnded）
  // 而不是 DB 的 status='ended'（會讓較慢的 client 被切掉沒看完）
  function _phaseOf(state) {
    const now = Date.now();
    const room = state.room;
    const lockTs = new Date(room.lock_at).getTime();
    const kickTs = new Date(room.kickoff_at).getTime();
    if (state.simEnded) return 'ended';
    if (now >= kickTs) return 'live';
    if (now >= lockTs) return 'locked';
    return 'open';
  }

  function _formatCountdown(ms) {
    if (ms <= 0) return '已截止';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h} 小時 ${m} 分`;
    if (m > 0) return `${m} 分 ${ss} 秒`;
    return `${ss} 秒`;
  }

  function _renderRoomOverlay(room, existingPick, opts) {
    opts = opts || {};
    const meta = room.match_meta || {};
    const overlay = document.createElement('div');
    overlay.className = 'fr-room-overlay';
    overlay.innerHTML = `
      <div class="fr-room-action-bar">
        <button class="fr-room-action fr-room-action--share" id="fr-room-share" type="button" title="分享房間">
          <i class="fas fa-share-alt"></i><span class="fr-room-action-label"> 分享</span>
        </button>
        <button class="fr-room-action fr-room-action--close" type="button" aria-label="關閉">&times;</button>
      </div>

      <div class="fr-room-box">
        <div class="fr-room-header">
          ${(() => { const n = _displayRoomName(room); return n ? `<div class="fr-room-name">${_escapeHtml(n)}</div>` : ''; })()}
          <div class="fr-room-id-row">
            <div class="fr-room-id">#${room.room_code}</div>
          </div>
          <div class="fr-room-tags">
            ${room.is_official ? '<span class="fr-type fr-type--official">官方</span>' : ''}
            ${!room.is_public ? '<span class="fr-type fr-type--private">私人 🔒</span>' : '<span class="fr-type fr-type--public">公開</span>'}
            ${room.bet_amount > 0 ? `<span class="fr-type fr-type--bet">押 ${room.bet_amount} 💎</span>` : ''}
          </div>
          <div class="fr-room-host">房主 · ${_escapeHtml(room.host_nickname || '匿名')}</div>
        </div>

        <div class="fr-room-match">
          ${meta.home_flag ? `<img src="${meta.home_flag}" class="fr-room-crest" alt="" />` : ''}
          <div class="fr-room-team-name">${_escapeHtml(meta.home_name || '主隊')}</div>
          <div class="fr-room-vs">vs</div>
          <div class="fr-room-team-name">${_escapeHtml(meta.away_name || '客隊')}</div>
          ${meta.away_flag ? `<img src="${meta.away_flag}" class="fr-room-crest" alt="" />` : ''}
        </div>
        <div class="fr-room-times">
          <div>真實開球：${_formatTime(meta.real_kickoff_ts || Date.parse(`${meta.date}T${meta.time}:00+08:00`))}</div>
          <div>同步開賽：${_formatTime(new Date(room.kickoff_at).getTime())}</div>
        </div>

        <div class="fr-room-status" id="fr-room-status">
          <!-- 倒數/狀態文字，每秒更新 -->
        </div>

        <div class="fr-participants" id="fr-participants" style="display:none">
          <!-- pick / locked 階段顯示已投票名單 -->
        </div>

        <div class="fr-room-body" id="fr-room-body">
          <!-- 依 phase 渲染（pick grid / 結果頁 / 直播）— 一進來先看到要猜比分 -->
        </div>

        <div class="fr-team-data" id="fr-team-data" style="display:none">
          <!-- 兩隊資料當參考，放 pick grid 下方 -->
        </div>

        <div class="fr-chat" id="fr-chat">
          <div class="fr-chat-head">
            <span>💬 聊天室</span>
            <span class="fr-chat-tip">最近 50 則</span>
          </div>
          <div class="fr-chat-list" id="fr-chat-list">
            <div class="fr-chat-loading">載入中…</div>
          </div>
          <div class="fr-chat-input">
            <input type="text" id="fr-chat-input" maxlength="200" placeholder="說點什麼…（200 字內）" />
            <button class="fr-btn fr-btn--submit" id="fr-chat-send">送出</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    // State
    const state = {
      room,
      pick: existingPick ? {
        sh: existingPick.score_home,
        sa: existingPick.score_away,
        over: existingPick.is_over,
      } : null,
      // submitted=true → 顯示「已送出」確認頁；false → 顯示比分 grid
      submitted: !!existingPick,
      lastPhase: null,
      // 房主剛建房 → 進來先選比分，選完才跳分享 modal（給 OG render 時間 + 強制房主投到）
      showInviteAfterPick: !!opts.showInviteAfterPick,
      // 本人的 sim 是否已跑完。沒跑完的話即使 DB.status='ended' 也不切結果頁
      // → 速度慢 / 0.5x / 遲到加入的人都能看完整場才出結果
      // 注意：每次進房都從 false 開始；DB.status='ended' 只代表別人寫入結果，
      // 但本人沒看完就不該知道結果（符合「回放看完才出最終結果」設計）
      simEnded: false,
      _close: null, // 由下方 close fn 補
    };

    let chatChannel = null;
    let picksChannel = null;
    function close() {
      if (_roomTickInterval) { clearInterval(_roomTickInterval); _roomTickInterval = null; }
      if (chatChannel && window.DB && window.DB.removeChannel) {
        try { window.DB.removeChannel(chatChannel); } catch (e) {}
        chatChannel = null;
      }
      if (picksChannel && window.DB && window.DB.removeChannel) {
        try { window.DB.removeChannel(picksChannel); } catch (e) {}
        picksChannel = null;
      }
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      // 清掉 hash (#fr-room-XXX) 跟 path (/r/XXX) 兩種邀請 URL，讓使用者回首頁
      try {
        const cleanPath = /^\/r\//i.test(location.pathname) ? '/' : location.pathname;
        history.replaceState(null, '', cleanPath);
      } catch (e) {}
      // 邀請連結進來時 daily popup 被延後到現在 → 補彈
      if (window.__pendingDailyAfterFriendRoom) {
        window.__pendingDailyAfterFriendRoom = false;
        setTimeout(() => {
          if (typeof window.showOpinionPoll === 'function') {
            try {
              window.showOpinionPoll(() => {
                if (typeof window.showDailyTaskPopup === 'function') {
                  try { window.showDailyTaskPopup(); } catch (e) {}
                }
              });
            } catch (e) {}
          }
        }, 400);
      }
    }
    state._close = close;
    overlay.querySelector('.fr-room-action--close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // 分享按鈕：複製邀請連結（私人房特別重要，因為要連結才進得去）
    // 使用 path-based URL /r/CODE — Cloudflare function 能讀到 code 並回客製 OG meta
    // 社群預覽會顯示房名 + 對戰隊伍 + 開賽時間（不再是首頁通用預覽）
    const shareBtn = overlay.querySelector('#fr-room-share');
    if (shareBtn) {
      shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const url = `${location.origin}/r/${room.room_code}`;
        const shareText = `來陪我猜這場比賽！${room.match_meta?.home_name || ''} vs ${room.match_meta?.away_name || ''}`;
        if (navigator.share) {
          try {
            await navigator.share({ title: '麥迪挑戰賽', text: shareText, url });
            return;
          } catch (err) { /* 使用者取消 share 也走 fallback */ }
        }
        try {
          await navigator.clipboard.writeText(url);
          shareBtn.classList.add('fr-room-action--copied');
          shareBtn.innerHTML = '<i class="fas fa-check"></i><span class="fr-room-action-label"> 已複製</span>';
          setTimeout(() => {
            shareBtn.classList.remove('fr-room-action--copied');
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i><span class="fr-room-action-label"> 分享</span>';
          }, 1800);
        } catch (err) {
          alert('連結：\n' + url);
        }
      });
    }

    // ── 兩隊資料 ─────────────────────────────────────────
    _renderTeamData(overlay, state);

    // ── 聊天 ─────────────────────────────────────────────
    _initChat(overlay, room.room_code, ch => { chatChannel = ch; });

    // ── 參賽者名單（pick / locked 階段顯示）──────────────
    _initParticipants(overlay, state, ch => { picksChannel = ch; });

    function rerender() {
      const phase = _phaseOf(state);
      _renderRoomStatus(overlay, state.room, phase);
      if (phase !== state.lastPhase) {
        _renderRoomBody(overlay, state, phase);
        if (state._rerenderParticipants) state._rerenderParticipants();
        state.lastPhase = phase;
      }
    }
    state._rerender = rerender;
    rerender();
    _roomTickInterval = setInterval(rerender, 1000);
  }

  // ── 兩隊資料區（攻防能力、近況、主力、教練、傷兵） ──
  function _renderTeamData(overlay, state) {
    const el = overlay.querySelector('#fr-team-data');
    if (!el) return;
    const meta = state.room.match_meta || {};
    const { home, away } = _resolveTeamsForRoom(state.room);
    if (!home || !away || !home.radar || !away.radar) {
      el.style.display = 'none';
      return;
    }

    const safe = (s) => _escapeHtml(s == null ? '' : s);
    const homeName = meta.home_name || home.nameCN || '主隊';
    const awayName = meta.away_name || away.nameCN || '客隊';

    // 能力 5 維 — 兩條由中央向外的對比 bar
    function radarRow(label, hv, av) {
      hv = hv || 0; av = av || 0;
      const total = Math.max(hv, av, 1);
      // bar 寬度按該邊與較大值的比例（讓視覺差距清楚）
      const hPct = (hv / total) * 100;
      const aPct = (av / total) * 100;
      return `
        <div class="fr-radar-row">
          <div class="fr-radar-val">${hv}</div>
          <div class="fr-radar-bar fr-radar-bar--h">
            <div class="fr-radar-fill" style="width:${hPct}%"></div>
          </div>
          <div class="fr-radar-label">${label}</div>
          <div class="fr-radar-bar fr-radar-bar--a">
            <div class="fr-radar-fill" style="width:${aPct}%"></div>
          </div>
          <div class="fr-radar-val">${av}</div>
        </div>
      `;
    }

    const rH = home.radar, rA = away.radar;

    // 近 5 場 W/D/L badges
    function formBadges(arr) {
      const list = (arr || []).slice(-5);
      if (!list.length) return '<span class="fr-data-muted">—</span>';
      return list.map(r => {
        const cls = r === 'W' ? 'fr-fb fr-fb--w' : r === 'L' ? 'fr-fb fr-fb--l' : 'fr-fb fr-fb--d';
        return `<span class="${cls}">${safe(r)}</span>`;
      }).join('');
    }

    // 主力球員（最多 3 個）
    function keyPlayerList(team) {
      const list = (team.keyPlayers || []).slice(0, 3);
      if (!list.length) return '<span class="fr-data-muted">—</span>';
      return list.map(p =>
        `<div class="fr-kp"><span class="fr-kp-name">${safe(p.name)}</span><span class="fr-kp-pos">${safe(p.pos || '')}</span></div>`
      ).join('');
    }

    // 主要傷兵（最多 3 個）
    function injuryList(team) {
      const list = (team.injuries || []).slice(0, 3);
      if (!list.length) return '<span class="fr-data-muted">無</span>';
      return list.map(p =>
        `<div class="fr-inj"><span class="fr-inj-name">${safe(p.name)}</span><span class="fr-inj-status">${safe(p.status || '養傷中')}</span></div>`
      ).join('');
    }

    const hasInjuries = (home.injuries && home.injuries.length) || (away.injuries && away.injuries.length);

    el.innerHTML = `
      <button class="fr-data-toggle" type="button" id="fr-data-toggle">
        <span><i class="fas fa-chart-bar"></i> 兩隊資料</span>
        <i class="fas fa-chevron-down fr-data-chevron"></i>
      </button>
      <div class="fr-data-content">
        <div class="fr-data-team-head">
          <div class="fr-data-team-name fr-data-team-name--h">${safe(homeName)}</div>
          <div class="fr-data-vs">vs</div>
          <div class="fr-data-team-name fr-data-team-name--a">${safe(awayName)}</div>
        </div>

        <div class="fr-radar-list">
          ${radarRow('攻擊', rH.attack,     rA.attack)}
          ${radarRow('中場', rH.midfield,   rA.midfield)}
          ${radarRow('防守', rH.defense,    rA.defense)}
          ${radarRow('速度', rH.speed,      rA.speed)}
          ${radarRow('經驗', rH.experience, rA.experience)}
        </div>

        <div class="fr-data-section">
          <div class="fr-data-section-title">近 5 場戰績</div>
          <div class="fr-data-cols">
            <div class="fr-data-col">${formBadges(home.recentForm)}</div>
            <div class="fr-data-col fr-data-col--a">${formBadges(away.recentForm)}</div>
          </div>
        </div>

        <div class="fr-data-section">
          <div class="fr-data-section-title">主力</div>
          <div class="fr-data-cols">
            <div class="fr-data-col fr-kp-list">${keyPlayerList(home)}</div>
            <div class="fr-data-col fr-kp-list">${keyPlayerList(away)}</div>
          </div>
        </div>

        <div class="fr-data-section">
          <div class="fr-data-section-title">教練 / 陣型</div>
          <div class="fr-data-cols">
            <div class="fr-data-col">
              ${safe(home.coach || '—')}
              ${home.formation ? `<div class="fr-data-muted">${safe(home.formation)}</div>` : ''}
            </div>
            <div class="fr-data-col">
              ${safe(away.coach || '—')}
              ${away.formation ? `<div class="fr-data-muted">${safe(away.formation)}</div>` : ''}
            </div>
          </div>
        </div>

        ${hasInjuries ? `
        <div class="fr-data-section">
          <div class="fr-data-section-title">主要傷兵</div>
          <div class="fr-data-cols">
            <div class="fr-data-col fr-inj-list">${injuryList(home)}</div>
            <div class="fr-data-col fr-inj-list">${injuryList(away)}</div>
          </div>
        </div>` : ''}
      </div>
    `;
    el.style.display = 'block';

    // 放在 pick grid 下方了 → 預設收合所有階段，要看的人主動展開
    // (一進房先看到 pick grid 比較直覺，數據是可選參考)
    el.classList.add('fr-data--collapsed');

    el.querySelector('#fr-data-toggle').addEventListener('click', () => {
      el.classList.toggle('fr-data--collapsed');
    });
    state._teamDataEl = el;
  }

  // ── 參賽者名單（pick + locked 階段顯示，live/ended 隱藏） ──
  async function _initParticipants(overlay, state, onChannel) {
    const el = overlay.querySelector('#fr-participants');
    if (!el) return;
    const myKey = _voterKey();
    const picks = new Map(); // voter_key → { nickname }

    function rerender() {
      const phase = _phaseOf(state);
      // 只在 pick / locked 階段顯示，live/ended 不顯示（會被結果頁取代）
      if (phase !== 'open' && phase !== 'locked') {
        el.style.display = 'none';
        return;
      }
      const list = Array.from(picks.values());
      if (!list.length) {
        el.style.display = 'block';
        el.innerHTML = '<div class="fr-participants-empty">還沒有人猜，第一個下注吧 👇</div>';
        return;
      }
      el.style.display = 'block';
      el.innerHTML = `
        <div class="fr-participants-head">已猜（${list.length} 人）</div>
        <div class="fr-participants-list">
          ${list.map(p => {
            const me = p.voter_key === myKey ? ' fr-participant--me' : '';
            return `<span class="fr-participant${me}">${_escapeHtml(p.nickname || '匿名')}</span>`;
          }).join('')}
        </div>
      `;
    }

    // 載入既有 picks
    try {
      const { data } = await window.DB
        .from('friend_picks')
        .select('voter_key, nickname')
        .eq('room_code', state.room.room_code);
      (data || []).forEach(p => picks.set(p.voter_key, p));
      rerender();
    } catch (e) {
      console.warn('[friend-room] participants load failed', e);
    }

    // realtime 訂閱：新 pick 即時加進名單
    try {
      const ch = window.DB
        .channel('fr-picks-' + state.room.room_code)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'friend_picks', filter: `room_code=eq.${state.room.room_code}` },
          (payload) => {
            const m = payload.new;
            if (!m) return;
            picks.set(m.voter_key, { voter_key: m.voter_key, nickname: m.nickname });
            rerender();
          })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'friend_picks', filter: `room_code=eq.${state.room.room_code}` },
          (payload) => {
            const m = payload.new;
            if (!m) return;
            picks.set(m.voter_key, { voter_key: m.voter_key, nickname: m.nickname });
            rerender();
          })
        .subscribe();
      if (onChannel) onChannel(ch);
    } catch (e) { console.warn('[friend-room] picks sub failed', e); }

    // phase 換頁時也要 rerender 一次（讓 live/ended 隱藏起來）
    state._rerenderParticipants = rerender;
  }

  // ── 聊天 ───────────────────────────────────────────────
  async function _initChat(overlay, roomCode, onChannel) {
    const listEl = overlay.querySelector('#fr-chat-list');
    const inputEl = overlay.querySelector('#fr-chat-input');
    const sendBtn = overlay.querySelector('#fr-chat-send');
    if (!listEl || !inputEl || !sendBtn) return;

    function timeLabel(ts) {
      const d = new Date(ts);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
    function append(msg, prepend) {
      const myKey = _voterKey();
      const me = msg.voter_key === myKey;
      const div = document.createElement('div');
      div.className = 'fr-chat-msg' + (me ? ' fr-chat-msg--me' : '');
      div.innerHTML = `
        <div class="fr-chat-meta">
          <span class="fr-chat-nick">${_escapeHtml(msg.nickname || '匿名')}</span>
          <span class="fr-chat-time">${timeLabel(msg.created_at)}</span>
        </div>
        <div class="fr-chat-text">${_escapeHtml(msg.content)}</div>
      `;
      if (prepend) listEl.prepend(div);
      else listEl.appendChild(div);
    }

    // 歷史訊息
    try {
      const { data } = await window.DB
        .from('friend_room_messages')
        .select('voter_key, nickname, content, created_at')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: false })
        .limit(50);
      listEl.innerHTML = '';
      const msgs = (data || []).reverse(); // 重排成舊→新
      msgs.forEach(m => append(m, false));
      listEl.scrollTop = listEl.scrollHeight;
    } catch (e) {
      console.warn('[friend-room] chat history failed', e);
      listEl.innerHTML = '<div class="fr-chat-loading">無法載入聊天記錄</div>';
    }

    // realtime 訂閱
    try {
      const ch = window.DB
        .channel('fr-chat-' + roomCode)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'friend_room_messages', filter: `room_code=eq.${roomCode}` },
          (payload) => {
            const m = payload.new;
            if (!m) return;
            append({
              voter_key: m.voter_key,
              nickname: m.nickname,
              content: m.content,
              created_at: m.created_at,
            }, false);
            listEl.scrollTop = listEl.scrollHeight;
          })
        .subscribe();
      if (onChannel) onChannel(ch);
    } catch (e) {
      console.warn('[friend-room] chat sub failed', e);
    }

    // 送出訊息
    async function sendMsg() {
      const text = (inputEl.value || '').trim();
      if (!text || text.length > 200) return;
      sendBtn.disabled = true;
      try {
        const { error } = await window.DB.from('friend_room_messages').insert({
          room_code: roomCode,
          voter_key: _voterKey(),
          nickname: _resolveNickname(),
          content: text,
        });
        if (error) throw error;
        inputEl.value = '';
      } catch (e) {
        console.warn('[friend-room] send failed', e);
        alert('送出失敗：' + (e.message || '未知錯誤'));
      } finally {
        sendBtn.disabled = false;
        inputEl.focus();
      }
    }
    sendBtn.addEventListener('click', sendMsg);
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
      }
    });
  }

  function _renderRoomStatus(overlay, room, phase) {
    const el = overlay.querySelector('#fr-room-status');
    if (!el) return;
    const now = Date.now();
    const lockTs = new Date(room.lock_at).getTime();
    const kickTs = new Date(room.kickoff_at).getTime();
    if (phase === 'open') {
      el.innerHTML = `<span class="fr-cd-label">報名截止剩</span> <span class="fr-cd-num">${_formatCountdown(lockTs - now)}</span>`;
    } else if (phase === 'locked') {
      el.innerHTML = `<span class="fr-cd-label">開賽剩</span> <span class="fr-cd-num">${_formatCountdown(kickTs - now)}</span>`;
    } else if (phase === 'live') {
      el.innerHTML = `<span class="fr-cd-live">🔴 進行中</span>`;
    } else {
      el.innerHTML = `<span class="fr-cd-ended">已結束</span>`;
    }
  }

  function _renderRoomBody(overlay, state, phase) {
    const body = overlay.querySelector('#fr-room-body');
    if (!body) return;
    if (phase === 'open') {
      _renderPickPhase(body, state);
    } else if (phase === 'locked') {
      _renderLockedPhase(body, state);
    } else if (phase === 'live') {
      _renderLivePhase(body, state);
    } else {
      _renderEndedPhase(body, state);
    }
  }

  // 拿房間綁定的真實隊伍資料（含 radar 等 sim 需要的欄位）
  function _resolveTeamsForRoom(room) {
    const meta = room.match_meta || {};
    const lg = meta.league;
    const T = lg === 'epl' ? (window.EPL_TEAMS || {})
      : lg === 'ucl' ? (window.UCL_TEAMS || {})
      : (typeof TEAMS !== 'undefined' ? TEAMS : {});
    const home = T[meta.home_code];
    const away = T[meta.away_code];
    return { home, away };
  }

  function _renderLivePhase(body, state) {
    const matchId = `fr-${state.room.room_code}`;
    body.innerHTML = `
      <div class="fr-live-wrap">
        <div class="fr-live-header">
          <span class="fr-cd-live">🔴 進行中</span>
          <span class="fr-live-pick-tag">你猜：${state.pick ? _formatPick(state.pick) : '（沒投）'}</span>
        </div>
        <div id="sim-wrap-${matchId}" class="fr-live-sim"></div>
      </div>
    `;
    const container = body.querySelector(`#sim-wrap-${matchId}`);
    const { home, away } = _resolveTeamsForRoom(state.room);
    if (!home || !away) {
      container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 找不到此比賽的隊伍資料，無法模擬</div>';
      return;
    }
    if (!window.MatchSim || typeof window.MatchSim.runDirect !== 'function') {
      container.innerHTML = '<div style="color:#ef9a9a;text-align:center;padding:16px">⚠️ 模擬引擎未載入</div>';
      return;
    }
    window.MatchSim.runDirect(container, home, away, {
      seed: state.room.seed,           // 房號當 seed → 所有人結果一致
      hideReplay: true,                // 朋友局不要「再跑一次」
      hideSpeed: true,                 // 強制 1x 同步（速度鍵會破壞「同時看到一樣畫面」的體驗）
      matchId,
      onEnd: (score) => _onSimEnd(state, score),
    });
  }

  async function _onSimEnd(state, score) {
    // 本人看完才標記 → _phaseOf 會切到 ended phase
    state.simEnded = true;
    state.room.result_home = score.h;
    state.room.result_away = score.a;
    state.room.status = 'ended';
    if (state._rerender) state._rerender();
    // 持久化到 DB（race-safe：已經 ended 就不再寫）
    try {
      await window.DB.from('friend_rooms').update({
        status: 'ended',
        result_home: score.h,
        result_away: score.a,
      })
      .eq('room_code', state.room.room_code)
      .neq('status', 'ended');
    } catch (e) {
      console.warn('[friend-room] result persist failed', e);
    }
  }

  function _classifyPick(p, rh, ra) {
    if (p.score_home === rh && p.score_away === ra) return 'exact';
    const win = rh > ra ? 'h' : ra > rh ? 'a' : 'd';
    const my = p.score_home > p.score_away ? 'h' : p.score_away > p.score_home ? 'a' : 'd';
    return win === my ? 'side' : 'miss';
  }

  async function _fetchAllPicks(roomCode) {
    if (!window.DB) return [];
    try {
      const { data } = await window.DB
        .from('friend_picks')
        .select('voter_key, nickname, score_home, score_away, is_over, created_at')
        .eq('room_code', roomCode);
      return data || [];
    } catch (e) {
      console.warn('[friend-room] fetch picks failed', e);
      return [];
    }
  }

  function _renderEndedPhase(body, state) {
    const meta = state.room.match_meta || {};
    const rh = state.room.result_home;
    const ra = state.room.result_away;
    const haveResult = rh != null && ra != null;
    const myPick = state.pick;
    let myStatus = '';
    if (myPick && haveResult) {
      const klass = _classifyPick(
        { score_home: myPick.sh, score_away: myPick.sa }, rh, ra
      );
      if (klass === 'exact') myStatus = '<div class="fr-end-mine fr-end-mine--exact">🎯 完全猜中！</div>';
      else if (klass === 'side') myStatus = '<div class="fr-end-mine fr-end-mine--side">✅ 猜中勝負</div>';
      else myStatus = '<div class="fr-end-mine fr-end-mine--miss">❌ 沒中</div>';
    }
    body.innerHTML = `
      <div class="fr-ended">
        <div class="fr-ended-icon">🏁</div>
        <div class="fr-ended-title">比賽結束</div>
        ${haveResult ? `
          <div class="fr-ended-score">
            <span>${_escapeHtml(meta.home_name || '主隊')}</span>
            <b>${rh}</b>
            <span class="fr-ended-dash">-</span>
            <b>${ra}</b>
            <span>${_escapeHtml(meta.away_name || '客隊')}</span>
          </div>
        ` : '<div class="fr-ended-tip">結果計算中…</div>'}
        ${myPick ? `<div class="fr-ended-mypick">你猜：${_formatPick(myPick)}</div>` : ''}
        ${myStatus}
        <div class="fr-winners" id="fr-winners">
          <div class="fr-winners-loading">載入大家的猜測…</div>
        </div>
        <div class="fr-pick-actions" style="margin-top:18px">
          <button class="fr-btn fr-btn--submit" id="fr-end-back">回大廳</button>
        </div>
      </div>
    `;
    body.querySelector('#fr-end-back').addEventListener('click', () => {
      if (state._close) state._close();
    });
    // 非同步拉所有 picks 渲染得獎名單
    if (haveResult) {
      _renderWinnerList(body, state, rh, ra);
    }
  }

  async function _renderWinnerList(body, state, rh, ra) {
    // 用 RPC：第一個 caller 鎖房間發獎、後續 caller 只回讀
    let rows = [];
    try {
      const { data, error } = await window.DB.rpc('friend_room_settle', {
        p_room_code: state.room.room_code,
      });
      if (error) throw error;
      rows = data || [];
    } catch (e) {
      console.warn('[friend-room] settle rpc failed, fallback to direct fetch', e);
      // Fallback：RPC 失敗就 client side 自己分類（沒寶石發但畫面還能看）
      const picks = await _fetchAllPicks(state.room.room_code);
      rows = picks.map(p => ({
        ...p,
        classification: _classifyPick(p, rh, ra),
        awarded: 0,
      }));
    }

    const myKey = _voterKey();
    const exact = rows.filter(r => r.classification === 'exact');
    const side  = rows.filter(r => r.classification === 'side');
    const miss  = rows.filter(r => r.classification === 'miss');

    const winnersEl = body.querySelector('#fr-winners');
    if (!winnersEl) return;
    if (!rows.length) {
      winnersEl.innerHTML = '<div class="fr-winners-empty">本場沒人下注 🤷</div>';
      return;
    }

    const renderRow = p => {
      const me = p.voter_key === myKey ? ' fr-winner-row--me' : '';
      const overTag = p.is_over ? ' <span class="fr-winner-tag">自訂</span>' : '';
      const noLogin = (p.classification === 'exact' || p.classification === 'side')
        && state.room.bet_amount > 0 && !p.user_id
        ? ' <span class="fr-winner-tag fr-winner-tag--warn">未登入</span>' : '';
      const award = p.awarded > 0
        ? `<span class="fr-winner-award">+${p.awarded} 💎</span>`
        : '';
      return `
        <div class="fr-winner-row${me}">
          <span class="fr-winner-name">${_escapeHtml(p.nickname || '匿名')}${overTag}${noLogin}</span>
          <span class="fr-winner-score">${p.score_home}-${p.score_away}${award}</span>
        </div>
      `;
    };

    // 每組的實際獎金（從 RPC awarded 欄位讀，瓜分後的數字）
    const exactPer = exact.find(r => r.awarded > 0)?.awarded || 0;
    const sidePer  = side.find(r => r.awarded > 0)?.awarded || 0;

    const groups = [];
    if (exact.length) groups.push(`
      <div class="fr-winner-group fr-winner-group--exact">
        <div class="fr-winner-head">🎯 完全猜中（${exact.length} 人）${exactPer > 0 ? ` · 每人 +${exactPer} 💎` : (state.room.bet_amount > 0 ? ' · 沒人登入瓜分' : '')}</div>
        <div class="fr-winner-list">${exact.map(renderRow).join('')}</div>
      </div>
    `);
    if (side.length) {
      groups.push(`
        <div class="fr-winner-group fr-winner-group--side">
          <div class="fr-winner-head">✅ 猜中勝負（${side.length} 人）${sidePer > 0 ? ` · 每人 +${sidePer} 💎` : ''}</div>
          <div class="fr-winner-list">${side.map(renderRow).join('')}</div>
        </div>
      `);
    }
    if (miss.length) groups.push(`
      <div class="fr-winner-group fr-winner-group--miss">
        <div class="fr-winner-head">❌ 沒中（${miss.length} 人）</div>
        <div class="fr-winner-list">${miss.map(renderRow).join('')}</div>
      </div>
    `);
    winnersEl.innerHTML = groups.join('');

    // 結算後若本人有領寶石，敲一次 gem balance 重抓（讓 nav 上的 💎 數字立刻更新）
    const myRow = rows.find(r => r.voter_key === myKey);
    if (myRow && myRow.awarded > 0 && typeof window.refreshGemBalance === 'function') {
      try { window.refreshGemBalance(); } catch (e) {}
    }
  }

  function _formatPick(pick) {
    if (pick.over) return `${pick.sh} - ${pick.sa}（>4 客製）`;
    return `${pick.sh} - ${pick.sa}`;
  }

  function _renderPickPhase(body, state) {
    if (state.submitted && state.pick) {
      _renderSubmittedView(body, state);
    } else {
      _renderPickGrid(body, state);
    }
  }

  function _renderPickGrid(body, state) {
    const sel = state.pick;
    // 房主第一次投比分（state.submitLabel）→「建立房間」；一般投比分（後進的人）→「送出」
    const submitText = state.submitLabel || '送出';
    body.innerHTML = `
      <div class="fr-pick-title">你猜最終比分（含延長 / PK）</div>
      <div class="fr-pick-grid" id="fr-pick-grid"></div>
      <button class="fr-pick-over-btn" id="fr-pick-over">${sel && sel.over ? `自訂：${sel.sh} - ${sel.sa}` : '其他比分（>4，需指定主隊/客隊）'}</button>
      <div class="fr-pick-actions">
        <button class="fr-btn fr-btn--submit" id="fr-pick-submit" ${sel ? '' : 'disabled'}>${submitText}</button>
      </div>
    `;
    _drawGrid(body, state);
    body.querySelector('#fr-pick-over').addEventListener('click', () => _openCustomScore(body, state));
    body.querySelector('#fr-pick-submit').addEventListener('click', () => _submitPick(body, state));
  }

  function _renderSubmittedView(body, state) {
    const meta = state.room.match_meta || {};
    body.innerHTML = `
      <div class="fr-submitted">
        <div class="fr-submitted-icon">✅</div>
        <div class="fr-submitted-title">已送出</div>
        <div class="fr-submitted-pick">${state.pick.sh} <span class="fr-submitted-dash">-</span> ${state.pick.sa}</div>
        <div class="fr-submitted-side-row">
          <span>${_escapeHtml(meta.home_name || '主隊')} <b>${state.pick.sh}</b></span>
          <span class="fr-submitted-mid">vs</span>
          <span>${_escapeHtml(meta.away_name || '客隊')} <b>${state.pick.sa}</b></span>
        </div>
        ${state.pick.over ? '<div class="fr-submitted-tag">自訂（>4）</div>' : ''}
        <div class="fr-submitted-tip">開賽前都可以改</div>
        <div class="fr-submitted-actions">
          <button class="fr-btn fr-btn--cancel" id="fr-back-pick">改猜測</button>
          <button class="fr-btn fr-btn--submit" id="fr-back-lobby">回大廳</button>
        </div>
      </div>
    `;
    body.querySelector('#fr-back-pick').addEventListener('click', () => {
      state.submitted = false;
      _renderPickGrid(body, state);
    });
    body.querySelector('#fr-back-lobby').addEventListener('click', () => {
      if (state._close) state._close();
    });
  }

  function _drawGrid(body, state) {
    const grid = body.querySelector('#fr-pick-grid');
    if (!grid) return;
    const cells = [];
    // 表頭：客隊比分
    cells.push('<div class="fr-grid-corner"></div>');
    for (let a = 0; a <= 4; a++) cells.push(`<div class="fr-grid-head">${a}</div>`);
    for (let h = 0; h <= 4; h++) {
      cells.push(`<div class="fr-grid-head fr-grid-head--row">${h}</div>`);
      for (let a = 0; a <= 4; a++) {
        const isSel = state.pick && !state.pick.over && state.pick.sh === h && state.pick.sa === a;
        cells.push(`<button class="fr-grid-cell ${isSel ? 'fr-grid-cell--sel' : ''}" data-h="${h}" data-a="${a}">${h}-${a}</button>`);
      }
    }
    grid.innerHTML = cells.join('');
    grid.querySelectorAll('.fr-grid-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        const h = parseInt(btn.dataset.h);
        const a = parseInt(btn.dataset.a);
        state.pick = { sh: h, sa: a, over: false };
        // 重畫高亮
        grid.querySelectorAll('.fr-grid-cell').forEach(b => b.classList.remove('fr-grid-cell--sel'));
        btn.classList.add('fr-grid-cell--sel');
        // 解鎖送出鍵
        const sub = body.querySelector('#fr-pick-submit');
        if (sub) { sub.disabled = false; sub.textContent = '送出'; }
        // 清掉 >4 自訂顯示
        const overBtn = body.querySelector('#fr-pick-over');
        if (overBtn) overBtn.textContent = '其他比分（>4 任一邊）';
      });
    });
  }

  function _openCustomScore(body, state) {
    const overlay = document.createElement('div');
    overlay.className = 'fr-modal-overlay';
    overlay.innerHTML = `
      <div class="fr-modal fr-modal--narrow" role="dialog">
        <button class="fr-modal-close" type="button">&times;</button>
        <h3 class="fr-modal-title">自訂比分（5 球以上）</h3>
        <p class="fr-modal-sub">主隊 / 客隊必須完全對才算中（含延長 / PK）</p>
        <div class="fr-custom-row">
          <div class="fr-custom-side">
            <div class="fr-custom-side-label">${_escapeHtml(state.room.match_meta?.home_name || '主隊')}</div>
            <input type="number" id="fr-custom-h" min="0" max="20" value="${state.pick && state.pick.over ? state.pick.sh : 5}" />
          </div>
          <span class="fr-custom-dash">-</span>
          <div class="fr-custom-side">
            <div class="fr-custom-side-label">${_escapeHtml(state.room.match_meta?.away_name || '客隊')}</div>
            <input type="number" id="fr-custom-a" min="0" max="20" value="${state.pick && state.pick.over ? state.pick.sa : 0}" />
          </div>
        </div>
        <p class="fr-modal-sub" style="margin-top:6px">至少一邊要 ≥ 5 才需要走這個</p>
        <div class="fr-form-actions">
          <button class="fr-btn fr-btn--cancel" id="fr-custom-cancel">取消</button>
          <button class="fr-btn fr-btn--submit" id="fr-custom-ok">確定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.fr-modal-close').addEventListener('click', close);
    overlay.querySelector('#fr-custom-cancel').addEventListener('click', close);
    overlay.querySelector('#fr-custom-ok').addEventListener('click', () => {
      const h = parseInt(overlay.querySelector('#fr-custom-h').value);
      const a = parseInt(overlay.querySelector('#fr-custom-a').value);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 20 || a > 20) {
        alert('比分必須在 0–20 之間');
        return;
      }
      if (h <= 4 && a <= 4) {
        alert('5 球以下請直接點上面的格子');
        return;
      }
      state.pick = { sh: h, sa: a, over: true };
      // 反映回 grid + 按鈕
      const grid = body.querySelector('#fr-pick-grid');
      if (grid) grid.querySelectorAll('.fr-grid-cell').forEach(b => b.classList.remove('fr-grid-cell--sel'));
      const overBtn = body.querySelector('#fr-pick-over');
      if (overBtn) overBtn.textContent = `自訂：${h} - ${a}`;
      const sub = body.querySelector('#fr-pick-submit');
      if (sub) { sub.disabled = false; sub.textContent = '送出'; }
      close();
    });
  }

  // 抓登入用戶 id（沒登入回 null；押注房贏家發獎金需要它）
  function _currentUserId() {
    try {
      // supabase-client.js 的 module-level let → 對其他 script 可見
      if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) {
        return currentUser.id;
      }
    } catch (e) {}
    return null;
  }

  async function _submitPick(body, state) {
    if (!state.pick) return;
    const sub = body.querySelector('#fr-pick-submit');
    const restoreLabel = state.submitLabel || '送出';
    sub.disabled = true;
    sub.textContent = '處理中…';
    try {
      const userId = _currentUserId();
      // 押注房沒登入會白玩（贏了沒寶石），先提醒一下
      if (state.room.bet_amount > 0 && !userId) {
        const proceed = confirm(
          `這是押 ${state.room.bet_amount} 💎 的房間。沒登入的話即使猜中也拿不到寶石，要繼續送出嗎？`
        );
        if (!proceed) {
          sub.disabled = false;
          sub.textContent = restoreLabel;
          return;
        }
      }
      const { error } = await window.DB.from('friend_picks').upsert({
        room_code: state.room.room_code,
        voter_key: _voterKey(),
        user_id: userId,
        nickname: _resolveNickname(),
        score_home: state.pick.sh,
        score_away: state.pick.sa,
        is_over: !!state.pick.over,
      }, { onConflict: 'room_code,voter_key' });
      if (error) throw error;
      state.submitted = true;
      // 「房主先投」獨立 modal 用：成功送出後跑 onPickSaved（會關 modal、把 host_picked 標起來、跳分享）
      if (typeof state.onPickSaved === 'function') {
        try { await state.onPickSaved(state); } catch (cbe) { console.warn('onPickSaved cb', cbe); }
        return;
      }
      _renderSubmittedView(body, state);
      loadLobby();
      // 立刻更新「已加入房間」提示（nav / banner badge）
      if (window.FriendRoom && window.FriendRoom._refreshActiveBadge) {
        try { window.FriendRoom._refreshActiveBadge(); } catch (e) {}
      }
    } catch (e) {
      console.warn('[friend-room] submit pick failed', e);
      alert('送出失敗：' + (e.message || '未知錯誤'));
      sub.disabled = false;
      sub.textContent = restoreLabel;
    }
  }

  function _renderLockedPhase(body, state) {
    body.innerHTML = `
      <div class="fr-room-stub">
        <div style="font-size:32px;margin-bottom:8px">🔒</div>
        <div>報名已截止，等待開賽</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:10px">
          你的猜測：${state.pick ? _formatPick(state.pick) : '（沒投，純看戲）'}
        </div>
      </div>`;
  }

  function _escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ── 公開 API（後續 PR 會把 viewReplay 補上實作） ──
  window.FriendRoom = {
    loadLobby,
    openCreateModal,
    joinRoom,
    viewReplay(roomCode) {
      // PR-4
      alert(`回放 #${roomCode}（PR-4 接 deterministic 重跑）`);
    },
  };

  // 我已加入但還沒結束的房間（讓使用者開賽時間還久時也不會忘記）
  async function _checkActiveRooms() {
    if (!window.DB) return [];
    const myKey = _voterKey();
    try {
      const { data: myPicks } = await window.DB
        .from('friend_picks')
        .select('room_code')
        .eq('voter_key', myKey);
      if (!myPicks || !myPicks.length) return [];
      const codes = [...new Set(myPicks.map(p => p.room_code))];
      const { data: rooms } = await window.DB
        .from('friend_rooms')
        .select('room_code, kickoff_at, status, match_meta')
        .in('room_code', codes)
        .in('status', ['open', 'locked', 'live'])
        .order('kickoff_at', { ascending: true });
      return rooms || [];
    } catch (e) {
      console.warn('[friend-room] active rooms check failed', e);
      return [];
    }
  }

  function _renderActiveBadge(rooms) {
    const navBtns = document.querySelectorAll('[data-section="friend-room"]');
    const homeBanner = document.querySelector('.fr-home-banner');
    const has = rooms && rooms.length > 0;
    navBtns.forEach(btn => btn.classList.toggle('fr-has-active', has));
    if (homeBanner) homeBanner.classList.toggle('fr-has-active', has);
    // 漢堡選單聚合通知：任何模組要在 hamburger 顯示紅點時把 source 加進這個 Set
    // window.__hamburgerNotifSources.add('your-key') / .delete('your-key')
    // 之後呼叫 window.__refreshHamburgerNotif() 重畫
    window.__hamburgerNotifSources = window.__hamburgerNotifSources || new Set();
    if (has) window.__hamburgerNotifSources.add('friend-room');
    else window.__hamburgerNotifSources.delete('friend-room');
    if (typeof window.__refreshHamburgerNotif === 'function') {
      window.__refreshHamburgerNotif();
    } else {
      window.__refreshHamburgerNotif = () => {
        const ham = document.getElementById('hamburger-btn');
        if (ham) ham.classList.toggle('has-notif', window.__hamburgerNotifSources.size > 0);
      };
      window.__refreshHamburgerNotif();
    }
    _renderNotifPanel(rooms);
  }

  // 通知面板「已 dismiss」紀錄（依 (room_code, state) 去重）
  function _isNotifDismissed(roomCode, state) {
    try {
      const m = JSON.parse(localStorage.getItem('fr_notif_dismissed') || '{}');
      return m[`${roomCode}|${state}`] === true;
    } catch (e) { return false; }
  }
  function _markNotifDismissed(roomCode, state) {
    try {
      const m = JSON.parse(localStorage.getItem('fr_notif_dismissed') || '{}');
      m[`${roomCode}|${state}`] = true;
      const keys = Object.keys(m);
      if (keys.length > 50) keys.slice(0, keys.length - 50).forEach(k => delete m[k]);
      localStorage.setItem('fr_notif_dismissed', JSON.stringify(m));
    } catch (e) {}
  }

  function _classifyNotifState(room) {
    const ms = new Date(room.kickoff_at).getTime() - Date.now();
    if (room.status === 'ended') return 'ended';
    if (room.status === 'live' || ms <= 0) return 'live';
    if (ms <= 60000) return 'imminent'; // 倒數 1 分鐘內
    return 'joined';
  }

  function _findNotifRoom(rooms, ended) {
    // 優先順序：imminent > live > joined > ended
    const order = ['imminent', 'live', 'joined', 'ended'];
    const candidates = [
      ...((rooms || []).map(r => ({ r, s: _classifyNotifState(r) }))),
      ...((ended || []).map(r => ({ r, s: 'ended' }))),
    ];
    for (const ord of order) {
      const hit = candidates.find(c => c.s === ord && !_isNotifDismissed(c.r.room_code, c.s));
      if (hit) return hit;
    }
    return null;
  }

  async function _renderNotifPanel(rooms) {
    let panel = document.getElementById('fr-notif-panel');
    // 抓 24h 內已結束 + 我有 pick 的房（讓「已結束」也能彈通知）
    let endedRooms = [];
    try {
      const myKey = _voterKey();
      const { data: myPicks } = await window.DB
        .from('friend_picks')
        .select('room_code')
        .eq('voter_key', myKey);
      if (myPicks && myPicks.length) {
        const codes = [...new Set(myPicks.map(p => p.room_code))];
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data } = await window.DB
          .from('friend_rooms')
          .select('room_code, kickoff_at, status, settled_at, result_home, result_away, match_meta, room_name')
          .in('room_code', codes)
          .eq('status', 'ended')
          .gte('settled_at', since);
        endedRooms = data || [];
      }
    } catch (e) { /* 無聲失敗，沒結束通知就算了 */ }

    const hit = _findNotifRoom(rooms, endedRooms);
    if (!hit) {
      if (panel) panel.remove();
      return;
    }

    const meta = hit.r.match_meta || {};
    const teams = `${meta.home_name || ''} vs ${meta.away_name || ''}`;
    const title = hit.r.room_name ? hit.r.room_name : teams;
    const sub = hit.r.room_name ? teams : '';

    let icon, head, desc, action;
    if (hit.s === 'imminent') {
      const sec = Math.max(0, Math.ceil((new Date(hit.r.kickoff_at).getTime() - Date.now()) / 1000));
      icon = '⏰'; head = '準備開賽'; desc = `${title}${sub ? ' · ' + sub : ''} · ${sec} 秒後開始`;
      action = { label: '進入', onClick: () => joinRoom(hit.r.room_code) };
    } else if (hit.s === 'live') {
      icon = '🔴'; head = '進行中'; desc = `${title}${sub ? ' · ' + sub : ''}`;
      action = { label: '進入', onClick: () => joinRoom(hit.r.room_code) };
    } else if (hit.s === 'ended') {
      const rh = hit.r.result_home, ra = hit.r.result_away;
      icon = '🏁'; head = '已結束'; desc = `${title} · ${rh}-${ra}`;
      action = { label: '查看', onClick: () => joinRoom(hit.r.room_code) };
    } else { // joined
      const ms = new Date(hit.r.kickoff_at).getTime() - Date.now();
      const totalMin = Math.floor(ms / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const left = h > 0 ? `${h} 小時 ${m} 分` : `${m} 分`;
      icon = '✅'; head = '你已加入'; desc = `${title}${sub ? ' · ' + sub : ''} · ${left}後開賽`;
      action = { label: '進入', onClick: () => joinRoom(hit.r.room_code) };
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'fr-notif-panel';
      panel.className = 'fr-notif-panel';
      document.body.appendChild(panel);
    }
    // imminent 狀態不給關（只能進入）；其他狀態才有 ×
    const closeBtn = (hit.s === 'imminent')
      ? ''
      : `<button class="fr-notif-close" type="button" aria-label="關閉">&times;</button>`;
    panel.dataset.room = hit.r.room_code;
    panel.dataset.state = hit.s;
    panel.innerHTML = `
      <div class="fr-notif-icon">${icon}</div>
      <div class="fr-notif-main">
        <div class="fr-notif-head">${_escapeHtml(head)}</div>
        <div class="fr-notif-desc">${_escapeHtml(desc)}</div>
      </div>
      <button class="fr-notif-action" type="button">${_escapeHtml(action.label)} →</button>
      ${closeBtn}
    `;
    panel.querySelector('.fr-notif-action').onclick = () => { action.onClick(); };
    const cb = panel.querySelector('.fr-notif-close');
    if (cb) cb.onclick = () => {
      _markNotifDismissed(hit.r.room_code, hit.s);
      panel.remove();
    };
  }

  let _activeBadgeTimer = null;
  async function _refreshActiveBadge() {
    const rooms = await _checkActiveRooms();
    _renderActiveBadge(rooms);
    // 如果有正要開賽的（< 5 分鐘），加快檢查頻率
    const next = rooms[0];
    let nextDelay = 60000; // 1 分鐘
    if (next) {
      const ms = new Date(next.kickoff_at).getTime() - Date.now();
      if (ms < 5 * 60000 && ms > -2 * 60000) nextDelay = 10000; // 接近開賽 / 剛開 → 10 秒
    }
    if (_activeBadgeTimer) clearTimeout(_activeBadgeTimer);
    _activeBadgeTimer = setTimeout(_refreshActiveBadge, nextDelay);
  }

  // 切到該 section 時才載入大廳，避免首頁 noise
  document.addEventListener('DOMContentLoaded', () => {
    const navBtns = document.querySelectorAll('[data-section="friend-room"]');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        loadLobby();
        _subscribeRealtime();
      });
    });
    // 若 URL hash 是 #fr，直接打開大廳
    if (location.hash === '#fr') {
      setTimeout(() => {
        loadLobby();
        _subscribeRealtime();
      }, 200);
    }
    // 邀請連結 → 自動進房（兩種 URL 形式都支援）：
    //   舊：#fr-room-XXXXXX（hash，無 OG 預覽）
    //   新：/r/XXXXXX（path，Cloudflare function 給客製 OG，server inject <meta name="fr-room-code">）
    const hashM = location.hash.match(/^#fr-room-([A-Z0-9]+)$/i);
    const pathM = location.pathname.match(/^\/r\/([A-Z0-9]+)\/?$/i);
    const metaCode = document.querySelector('meta[name="fr-room-code"]');
    const code = (hashM && hashM[1]) || (pathM && pathM[1]) || (metaCode && metaCode.content) || null;
    if (code) {
      setTimeout(() => joinRoom(String(code).toUpperCase()), 300);
    }
    // 已加入房間提示：頁面載入後檢查一次，之後每 1 分鐘 refresh
    setTimeout(_refreshActiveBadge, 1500);
  });

  // 暴露給其他模組（投完票後可以呼叫立刻 refresh badge）
  window.FriendRoom = window.FriendRoom || {};
  window.FriendRoom._refreshActiveBadge = _refreshActiveBadge;
})();
