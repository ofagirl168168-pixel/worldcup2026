/* =============================================
   FRIEND-ROOM.JS — 麥迪挑戰賽（朋友直播房）
   PR-2b：大廳列表 + 資料層
   後續 PR：建房 / 加入猜分 / 同步直播 / 結算
   ============================================= */

(function () {
  'use strict';

  const RT = { rooms: null, picks: null };
  let _lobbyCache = [];

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

  // ── 渲染 ────────────────────────────────────────────────
  function _typeBadge(room) {
    if (room.is_official) return `<span class="fr-type fr-type--official">官方 <i class="fas fa-check-circle"></i></span>`;
    if (!room.is_public) return `<span class="fr-type fr-type--private">私人 <i class="fas fa-lock"></i></span>`;
    return `<span class="fr-type fr-type--public">公開</span>`;
  }

  function _matchTitle(room) {
    const meta = room.match_meta || {};
    const home = meta.home_name || meta.home_code || '主隊';
    const away = meta.away_name || meta.away_code || '客隊';
    const homeFlag = meta.home_flag ? `<img src="${meta.home_flag}" alt="" class="fr-crest" />` : '';
    const awayFlag = meta.away_flag ? `<img src="${meta.away_flag}" alt="" class="fr-crest" />` : '';
    return `${homeFlag}${home} <span class="fr-vs">vs</span> ${awayFlag}${away}`;
  }

  function _countdown(kickoffISO) {
    const t = new Date(kickoffISO).getTime() - Date.now();
    if (t <= 0) return '<span class="fr-cd fr-cd--live">直播中</span>';
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
        <span class="fr-cell fr-cell--bet">${room.bet_amount > 0 ? `💎 ${room.bet_amount}` : '—'}</span>
        <span class="fr-cell fr-cell--count">${room.pick_count} 人</span>
        <span class="fr-cell fr-cell--act">${_joinButton(room)}</span>
      </div>`;
  }

  function _renderLobby(rooms) {
    const list = document.getElementById('fr-lobby-list');
    if (!list) return;
    if (!rooms || !rooms.length) {
      list.innerHTML = `
        <div class="fr-empty">
          <div class="fr-empty-icon">🏟️</div>
          <div class="fr-empty-title">目前沒有開放中的房間</div>
          <div class="fr-empty-desc">點右上角「+ 開房」當第一個房主</div>
        </div>`;
      return;
    }
    list.innerHTML = rooms.map(_renderRow).join('');
  }

  async function loadLobby() {
    const list = document.getElementById('fr-lobby-list');
    if (list && !_lobbyCache.length) {
      list.innerHTML = `<div class="fr-loading">載入大廳中…</div>`;
    }
    const rooms = await _fetchLobby();
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
          <label class="fr-form-label">1. 選比賽</label>
          <select class="fr-form-select" id="fr-form-match">
            ${matches.map(m =>
              `<option value="${m.league}|${m.id}">${_leagueIcon(m.league)} ${_formatTime(m.kickoff_ts)} · ${m.home_name} vs ${m.away_name}</option>`
            ).join('')}
          </select>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">2. 同步開賽時間</label>
          <div class="fr-form-options" id="fr-form-time-options"></div>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">3. 押注（每人）</label>
          <div class="fr-form-options">
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="0" checked /> <span>純娛樂</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="1" /> <span>1 💎</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="2" /> <span>2 💎</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-bet" value="3" /> <span>3 💎</span></label>
          </div>
        </div>

        <div class="fr-form-section">
          <label class="fr-form-label">4. 房型</label>
          <div class="fr-form-options">
            <label class="fr-form-opt"><input type="radio" name="fr-pub" value="public" checked /> <span>🔥 公開（任何人可加入）</span></label>
            <label class="fr-form-opt"><input type="radio" name="fr-pub" value="private" /> <span>🔒 私人（只有持邀請連結的人能進）</span></label>
          </div>
        </div>

        <div class="fr-form-actions">
          <button type="button" class="fr-btn fr-btn--cancel" id="fr-form-cancel">取消</button>
          <button type="button" class="fr-btn fr-btn--submit" id="fr-form-submit">建立房間</button>
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
      submitBtn.textContent = '建立中…';
      try {
        await _submitCreate(matches, overlay);
        close();
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = '建立房間';
      }
    });
  }

  async function _submitCreate(matches, overlay) {
    const [lg, id] = overlay.querySelector('#fr-form-match').value.split('|');
    const match = matches.find(x => x.league === lg && x.id === id);
    if (!match) throw new Error('找不到比賽');

    const tInput = overlay.querySelector('input[name="fr-time"]:checked');
    const kickoffTs = parseInt(tInput.dataset.ts);
    const betAmount = parseInt(overlay.querySelector('input[name="fr-bet"]:checked').value);
    const isPublic = overlay.querySelector('input[name="fr-pub"]:checked').value === 'public';
    const lockTs = kickoffTs - 60000; // lock 1 分鐘前
    const roomCode = _genRoomCode();

    const { error } = await window.DB.from('friend_rooms').insert({
      room_code: roomCode,
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
      },
      seed: roomCode,
      is_official: false,
      is_public: isPublic,
      bet_amount: betAmount,
      lock_at: new Date(lockTs).toISOString(),
      kickoff_at: new Date(kickoffTs).toISOString(),
      status: 'open',
    });
    if (error) {
      console.warn('[friend-room] create failed', error);
      alert('建立失敗：' + (error.message || '未知錯誤'));
      throw error;
    }

    loadLobby();
    _showInviteResult(roomCode, isPublic);
  }

  function _showInviteResult(roomCode, isPublic) {
    const url = `${location.origin}${location.pathname}#fr-room-${roomCode}`;
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

  async function joinRoom(roomCode) {
    if (!window.DB) { alert('連線中…請稍後再試'); return; }
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

      _renderRoomOverlay(room, existing || null);
      // URL hash 同步，讓 refresh / 分享連結 work
      try { history.replaceState(null, '', `#fr-room-${roomCode}`); } catch (e) {}
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

  function _renderRoomOverlay(room, existingPick) {
    const meta = room.match_meta || {};
    const overlay = document.createElement('div');
    overlay.className = 'fr-room-overlay';
    overlay.innerHTML = `
      <div class="fr-room-box">
        <button class="fr-modal-close" type="button" aria-label="關閉">&times;</button>

        <div class="fr-room-header">
          <div class="fr-room-id">#${room.room_code}</div>
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

        <div class="fr-room-body" id="fr-room-body">
          <!-- 依 phase 渲染 -->
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
      // 本人的 sim 是否已跑完。沒跑完的話即使 DB.status='ended' 也不切結果頁
      // → 速度慢 / 0.5x / 遲到加入的人都能看完整場才出結果
      // 注意：每次進房都從 false 開始；DB.status='ended' 只代表別人寫入結果，
      // 但本人沒看完就不該知道結果（符合「回放看完才出最終結果」設計）
      simEnded: false,
      _close: null, // 由下方 close fn 補
    };

    function close() {
      if (_roomTickInterval) { clearInterval(_roomTickInterval); _roomTickInterval = null; }
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 250);
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
    }
    state._close = close;
    overlay.querySelector('.fr-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    function rerender() {
      const phase = _phaseOf(state);
      _renderRoomStatus(overlay, state.room, phase);
      if (phase !== state.lastPhase) {
        _renderRoomBody(overlay, state, phase);
        state.lastPhase = phase;
      }
    }
    state._rerender = rerender;
    rerender();
    _roomTickInterval = setInterval(rerender, 1000);
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
      el.innerHTML = `<span class="fr-cd-label">直播開賽剩</span> <span class="fr-cd-num">${_formatCountdown(kickTs - now)}</span>`;
    } else if (phase === 'live') {
      el.innerHTML = `<span class="fr-cd-live">🔴 直播中</span>`;
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
          <span class="fr-cd-live">🔴 直播中</span>
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
    const picks = await _fetchAllPicks(state.room.room_code);
    const myKey = _voterKey();
    const exact = [], side = [], miss = [];
    for (const p of picks) {
      const k = _classifyPick(p, rh, ra);
      if (k === 'exact') exact.push(p);
      else if (k === 'side') side.push(p);
      else miss.push(p);
    }
    const winnersEl = body.querySelector('#fr-winners');
    if (!winnersEl) return;
    if (!picks.length) {
      winnersEl.innerHTML = '<div class="fr-winners-empty">本場沒人下注 🤷</div>';
      return;
    }
    const renderRow = p => {
      const me = p.voter_key === myKey ? ' fr-winner-row--me' : '';
      const overTag = p.is_over ? ' <span class="fr-winner-tag">自訂</span>' : '';
      return `
        <div class="fr-winner-row${me}">
          <span class="fr-winner-name">${_escapeHtml(p.nickname || '匿名')}${overTag}</span>
          <span class="fr-winner-score">${p.score_home}-${p.score_away}</span>
        </div>
      `;
    };
    const groups = [];
    if (exact.length) groups.push(`
      <div class="fr-winner-group fr-winner-group--exact">
        <div class="fr-winner-head">🎯 完全猜中（${exact.length} 人）</div>
        <div class="fr-winner-list">${exact.map(renderRow).join('')}</div>
      </div>
    `);
    if (side.length) groups.push(`
      <div class="fr-winner-group fr-winner-group--side">
        <div class="fr-winner-head">✅ 猜中勝負（${side.length} 人）</div>
        <div class="fr-winner-list">${side.map(renderRow).join('')}</div>
      </div>
    `);
    if (miss.length) groups.push(`
      <div class="fr-winner-group fr-winner-group--miss">
        <div class="fr-winner-head">❌ 沒中（${miss.length} 人）</div>
        <div class="fr-winner-list">${miss.map(renderRow).join('')}</div>
      </div>
    `);
    winnersEl.innerHTML = groups.join('');
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
    body.innerHTML = `
      <div class="fr-pick-title">你猜最終比分（含延長 / PK）</div>
      <div class="fr-pick-grid" id="fr-pick-grid"></div>
      <button class="fr-pick-over-btn" id="fr-pick-over">${sel && sel.over ? `自訂：${sel.sh} - ${sel.sa}` : '其他比分（>4，需指定主隊/客隊）'}</button>
      <div class="fr-pick-actions">
        <button class="fr-btn fr-btn--submit" id="fr-pick-submit" ${sel ? '' : 'disabled'}>${sel ? '送出' : '送出'}</button>
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

  async function _submitPick(body, state) {
    if (!state.pick) return;
    const sub = body.querySelector('#fr-pick-submit');
    sub.disabled = true;
    sub.textContent = '送出中…';
    try {
      const { error } = await window.DB.from('friend_picks').upsert({
        room_code: state.room.room_code,
        voter_key: _voterKey(),
        nickname: _resolveNickname(),
        score_home: state.pick.sh,
        score_away: state.pick.sa,
        is_over: !!state.pick.over,
      }, { onConflict: 'room_code,voter_key' });
      if (error) throw error;
      // 切到「已送出」頁（保留房間 overlay，使用者可選回大廳或改猜測）
      state.submitted = true;
      _renderSubmittedView(body, state);
      // 重抓大廳人數（非必要，realtime 也會推）
      loadLobby();
    } catch (e) {
      console.warn('[friend-room] submit pick failed', e);
      alert('送出失敗：' + (e.message || '未知錯誤'));
      sub.disabled = false;
      sub.textContent = '送出';
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
    // 邀請連結：#fr-room-XXXXXX → 自動進房
    const m = location.hash.match(/^#fr-room-([A-Z0-9]+)$/i);
    if (m) {
      setTimeout(() => joinRoom(m[1].toUpperCase()), 300);
    }
  });
})();
