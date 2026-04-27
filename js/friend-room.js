/* =============================================
   FRIEND-ROOM.JS — 麥迪挑戰賽（朋友直播房）
   PR-2b：大廳列表 + 資料層
   後續 PR：建房 / 加入猜分 / 同步直播 / 結算
   ============================================= */

(function () {
  'use strict';

  const RT = { rooms: null, picks: null };
  let _lobbyCache = [];

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

  // ── 公開 API（後續 PR 會把 createModal/joinRoom 實作補上） ──
  window.FriendRoom = {
    loadLobby,
    openCreateModal() {
      // PR-2c
      alert('開房功能即將推出（PR-2c）');
    },
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
