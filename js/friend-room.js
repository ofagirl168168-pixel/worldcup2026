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
    // 真實開球時間扣 30 / 5 分；如果現在已經很接近真實開球（<30 分），
    // 自動加「現在開賽」「+10 分」備援，避免使用者選了過去
    const now = Date.now();
    const real = match.kickoff_ts;
    const opts = [];
    const t30 = real - 30 * 60000;
    const t5  = real - 5  * 60000;
    if (t30 > now + 30000) opts.push({ key: 'real-30', label: `真實比賽前 30 分（${_formatTime(t30)}）`, ts: t30 });
    if (t5  > now + 30000) opts.push({ key: 'real-5',  label: `真實比賽前 5 分（${_formatTime(t5)}）`,   ts: t5 });
    // 真實比賽結束後（賽後重看）— +120 分大概是 90 分鐘比賽結束後
    const tEnd = real + 120 * 60000;
    opts.push({ key: 'real+end', label: `真實比賽結束後（${_formatTime(tEnd)}）`, ts: tEnd });
    // 立即模式：5 分鐘後直接開（有些朋友想馬上玩，不等真實比賽）
    opts.push({ key: 'now+5', label: `5 分鐘後立刻開（${_formatTime(now + 5 * 60000)}）`, ts: now + 5 * 60000 });
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

  // ── 公開 API（後續 PR 會把 joinRoom/viewReplay 補上實作） ──
  window.FriendRoom = {
    loadLobby,
    openCreateModal,
    joinRoom(roomCode) {
      // PR-2d
      alert(`加入房間 #${roomCode}（PR-2d 接 score grid）`);
    },
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
  });
})();
