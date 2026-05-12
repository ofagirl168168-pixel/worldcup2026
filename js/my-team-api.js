/* my-team-api.js — Supabase 資料層
 * 設計依據：docs/my-team-design.md v0.7
 *
 * 提供：
 *   MyTeam.fetch()            → 取目前 user 的 my_team row（沒登入回 null、沒建隊回 'not_created'）
 *   MyTeam.create(name, crest) → 建隊（同時建 league_progress、發 5 抽券新人禮）
 *   MyTeam.fetchPlayers()     → 取目前球員
 *   MyTeam.awardTickets(n, source) → 給抽券（同步更新本機快取 → emit event 通知 UI）
 *   MyTeam.awardStamina(n, source) → 給體力（受 stamina_max 上限）
 *   MyTeam.awardGems(n, source)    → 包裝 gems.js 的 awardGem
 *   MyTeam.fetchCardPool()    → 拿全卡池（首載 cache）
 *
 * Event：window.dispatchEvent(new CustomEvent('my-team-changed'))
 *   FAB / hub modal 監聽此事件刷新顯示
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'my_team_cache_v1';
  let _cache = null;
  let _cardPoolCache = null;

  function _getUserId() {
    try {
      if (typeof currentUser !== 'undefined' && currentUser && currentUser.id) return currentUser.id;
    } catch (e) {}
    return null;
  }

  function _emitChange() {
    window.dispatchEvent(new CustomEvent('my-team-changed', { detail: { team: _cache } }));
  }

  function _saveCache() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache)); } catch (e) {}
  }

  function _loadCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) _cache = JSON.parse(raw);
    } catch (e) {}
  }
  _loadCache();

  async function fetch_() {
    const uid = _getUserId();
    if (!uid) return null;
    const { data, error } = await window.DB
      .from('my_team')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) { console.error('[my-team] fetch error', error); return null; }
    if (!data) return 'not_created';
    _cache = data;
    _saveCache();
    _emitChange();
    return data;
  }

  async function create(name, crest) {
    const uid = _getUserId();
    if (!uid) throw new Error('not logged in');
    const insertRow = {
      user_id: uid,
      team_name: (name || '').trim() || '我的球隊',
      team_crest: crest || '⚽',
      tickets: 5,  // 新人禮：5 張抽券
    };
    const { data, error } = await window.DB
      .from('my_team')
      .insert(insertRow)
      .select()
      .single();
    if (error) throw error;
    _cache = data;
    _saveCache();
    // 同時建 league_progress
    await window.DB.from('league_progress').insert({ user_id: uid });
    _emitChange();
    return data;
  }

  async function fetchPlayers() {
    const uid = _getUserId();
    if (!uid) return [];
    const { data, error } = await window.DB
      .from('team_player')
      .select('*, card:player_card_pool(*)')
      .eq('team_user_id', uid);
    if (error) { console.error('[my-team] fetchPlayers error', error); return []; }
    return data || [];
  }

  async function fetchCardPool() {
    if (_cardPoolCache) return _cardPoolCache;
    const { data, error } = await window.DB
      .from('player_card_pool')
      .select('*');
    if (error) { console.error('[my-team] fetchCardPool error', error); return []; }
    _cardPoolCache = data || [];
    return _cardPoolCache;
  }

  // 給抽券（不限上限；source 用於追蹤來源）
  async function awardTickets(n, source) {
    const uid = _getUserId();
    if (!uid || !n || n <= 0) return false;
    if (!_cache) await fetch_();
    if (!_cache || _cache === 'not_created') return false;
    const newTickets = (_cache.tickets || 0) + n;
    const { error } = await window.DB
      .from('my_team')
      .update({ tickets: newTickets })
      .eq('user_id', uid);
    if (error) { console.error('[my-team] awardTickets error', error); return false; }
    _cache.tickets = newTickets;
    _saveCache();
    _emitChange();
    console.log(`[my-team] +${n} 抽券（${source || 'unknown'}）→ 共 ${newTickets}`);
    return true;
  }

  // 給體力（受 stamina_max 上限）
  async function awardStamina(n, source) {
    const uid = _getUserId();
    if (!uid || !n || n <= 0) return false;
    if (!_cache) await fetch_();
    if (!_cache || _cache === 'not_created') return false;
    const newStamina = Math.min((_cache.stamina || 0) + n, _cache.stamina_max || 5);
    if (newStamina === _cache.stamina) return false; // 已滿
    const { error } = await window.DB
      .from('my_team')
      .update({ stamina: newStamina })
      .eq('user_id', uid);
    if (error) { console.error('[my-team] awardStamina error', error); return false; }
    _cache.stamina = newStamina;
    _saveCache();
    _emitChange();
    return true;
  }

  // 給寶石 — 走既有 gems.js 的 awardGem
  async function awardGems(n, source) {
    if (typeof window.awardGem === 'function') {
      return await window.awardGem(source || 'my-team', null);
    }
    return false;
  }

  // 給 SSR 自選券（賽季冠軍才有）
  async function awardSSRSelectTicket(n, source) {
    const uid = _getUserId();
    if (!uid || !n) return false;
    if (!_cache) await fetch_();
    if (!_cache || _cache === 'not_created') return false;
    const newCount = (_cache.ssr_select_tickets || 0) + n;
    const { error } = await window.DB
      .from('my_team')
      .update({ ssr_select_tickets: newCount })
      .eq('user_id', uid);
    if (error) return false;
    _cache.ssr_select_tickets = newCount;
    _saveCache();
    _emitChange();
    return true;
  }

  // 拿 cache（同步、不戳網路）
  function getCached() {
    return _cache;
  }

  // 強制清 cache（debug / 登出時）
  function clearCache() {
    _cache = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    _emitChange();
  }

  // ── 訓練 RPC ──
  async function trainPlayer(playerId, mode) {
    const { data, error } = await window.DB.rpc('train_player', {
      p_player_id: playerId,
      p_mode: mode || 'normal',
    });
    if (error) throw error;
    await fetch_(); // 重撈 team 反映 RP 扣除
    return data;
  }

  window.MyTeam = {
    fetch: fetch_,
    create,
    fetchPlayers,
    fetchCardPool,
    awardTickets,
    awardStamina,
    awardGems,
    awardSSRSelectTicket,
    trainPlayer,
    getCached,
    clearCache,
  };

  // 登入狀態變化時自動 refetch
  window.addEventListener('storage', (e) => {
    if (e.key === 'supabase.auth.token') {
      setTimeout(() => fetch_(), 500);
    }
  });
})();
