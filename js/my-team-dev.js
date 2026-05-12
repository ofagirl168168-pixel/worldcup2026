/* my-team-dev.js — 測試專用 devtools
 * 用法（瀏覽器 console）：
 *   MyTeamDev.enable()         // 開啟 beta（顯示 FAB + 啟用所有 hook）
 *   MyTeamDev.disable()        // 關閉 beta
 *   MyTeamDev.status()         // 顯示目前狀態
 *   MyTeamDev.reset()          // 完整重置：刪 my_team / team_player / league_progress + 清 localStorage flags
 *                              // 之後可以再試「進站→投票→抽卡→建隊」整個新人流程
 *   MyTeamDev.resetLocalOnly() // 只清 localStorage（不動 DB）→ 試「進站第一次彈擂台」之類
 *   MyTeamDev.addTickets(n)    // 直接加 n 張抽券（測試抽卡 UI 用）
 *   MyTeamDev.addRP(n)         // 直接加 RP 4 種各 n（測試訓練 UI）
 *   MyTeamDev.addStamina(n)    // 直接補滿體力
 *   MyTeamDev.simulateArenaVote()  // 模擬「擂台首投」flow，不用真投票
 *   MyTeamDev.simulateDailyLogin() // 模擬每日登入觸發
 *   MyTeamDev.simulatePredict5()   // 模擬完成 5 場預測觸發
 */
(function () {
  'use strict';

  function _uid() {
    try { if (typeof currentUser !== 'undefined' && currentUser?.id) return currentUser.id; }
    catch (e) {}
    return null;
  }

  function _localKeys() {
    return [
      'mt_beta',
      'mt_pending_gacha',
      'mt_arena_vote_date_v1',
      'mt_daily_login_date_v1',
      'my_team_cache_v1',
      // mt_predict_count_YYYY-MM-DD（多日累積）
    ];
  }

  async function enable() {
    localStorage.setItem('mt_beta', '1');
    console.log('✅ my-team beta 已開啟，重新整理頁面以顯示 FAB');
    console.log('   → location.reload()');
  }

  function disable() {
    localStorage.removeItem('mt_beta');
    console.log('✅ my-team beta 已關閉，重新整理頁面 FAB 會消失');
  }

  function status() {
    const enabled = localStorage.getItem('mt_beta') === '1';
    const uid = _uid();
    const team = window.MyTeam?.getCached();
    console.log('=== my-team status ===');
    console.log(`beta enabled: ${enabled}`);
    console.log(`user id: ${uid || '(not logged in)'}`);
    console.log(`team: `, team);
    console.log(`pending tickets (localStorage): ${localStorage.getItem('mt_pending_gacha') || 0}`);
    console.log(`arena_vote_date: ${localStorage.getItem('mt_arena_vote_date_v1') || '(none)'}`);
    console.log(`daily_login_date: ${localStorage.getItem('mt_daily_login_date_v1') || '(none)'}`);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    console.log(`predict count today: ${localStorage.getItem('mt_predict_count_' + today) || 0}`);
  }

  async function reset() {
    const uid = _uid();
    if (!uid) { console.error('❌ 沒登入'); return; }
    if (!confirm('⚠️ 完整重置：會刪掉你的球隊 / 球員 / 聯賽進度。確定？')) return;

    console.log('🧹 開始重置 my-team...');
    // 順序：team_player → training_log → match_history → league_progress → my_team
    // RLS 會檢查擁有權，自己刪自己的 row OK
    for (const t of ['team_player','training_log','match_history','sponsor_state','facility_state','league_progress']) {
      const col = (t === 'team_player' || t === 'training_log') ? 'team_user_id' : 'user_id';
      const { error } = await window.DB.from(t).delete().eq(col, uid);
      if (error) console.warn(`  ⚠️ ${t}: ${error.message}`);
      else console.log(`  ✓ cleared ${t}`);
    }
    // 最後刪 my_team
    const { error: te } = await window.DB.from('my_team').delete().eq('user_id', uid);
    if (te) console.warn(`  ⚠️ my_team: ${te.message}`);
    else console.log('  ✓ cleared my_team');

    resetLocalOnly();
    console.log('✅ 完整重置完成，重新整理頁面後可從頭測試');
  }

  function resetLocalOnly() {
    // 清所有 mt_* localStorage（包含每日累計 mt_predict_count_YYYY-MM-DD）
    const removed = [];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('mt_') || k === 'my_team_cache_v1')) {
        localStorage.removeItem(k);
        removed.push(k);
      }
    }
    // beta flag 保留以維持顯示，除非 reset() 全清
    localStorage.setItem('mt_beta', '1');
    console.log(`✅ 清掉 localStorage: ${removed.length} 個 key（beta flag 保留）`);
    console.log('   keys:', removed);
  }

  async function addTickets(n) {
    n = parseInt(n) || 1;
    const ok = await window.MyTeam?.awardTickets(n, 'devtool');
    console.log(ok ? `✓ +${n} 抽券` : '❌ 失敗（沒登入或沒建隊？）');
  }

  async function addRP(n) {
    n = parseInt(n) || 50;
    const uid = _uid();
    if (!uid) { console.error('❌ 沒登入'); return; }
    const team = window.MyTeam.getCached();
    if (!team || team === 'not_created') { console.error('❌ 還沒建隊'); return; }
    const { error } = await window.DB.from('my_team').update({
      rp_tactical: team.rp_tactical + n,
      rp_physical: team.rp_physical + n,
      rp_heart: team.rp_heart + n,
      rp_idea: team.rp_idea + n,
    }).eq('user_id', uid);
    if (error) console.error('❌', error.message);
    else {
      await window.MyTeam.fetch();
      console.log(`✓ 各 RP +${n}`);
    }
  }

  async function addStamina(n) {
    n = parseInt(n) || 5;
    const ok = await window.MyTeam?.awardStamina(n, 'devtool');
    console.log(ok ? `✓ +${n} 體力` : '❌ 失敗（已滿 or 沒建隊）');
  }

  async function simulateArenaVote() {
    // 清今天的 vote_date → 觸發 instant gacha
    localStorage.removeItem('mt_arena_vote_date_v1');
    console.log('模擬擂台首投 → 觸發 instant gacha 1 連');
    await window.MyTeam?.triggerInstantGacha?.(1, 'arena_vote');
  }

  async function simulateDailyLogin() {
    localStorage.removeItem('mt_daily_login_date_v1');
    console.log('模擬每日登入首次 → 觸發 instant gacha 1 連');
    await window.MyTeam?.triggerInstantGacha?.(1, 'daily_login');
  }

  async function simulatePredict5() {
    console.log('模擬完成 5 場預測 → 觸發 instant gacha 2 連');
    await window.MyTeam?.triggerInstantGacha?.(2, 'predict_5');
  }

  window.MyTeamDev = {
    enable, disable, status,
    reset, resetLocalOnly,
    addTickets, addRP, addStamina,
    simulateArenaVote, simulateDailyLogin, simulatePredict5,
  };

  // 在 console 顯示快速指南（僅 beta 開時提示）
  if (localStorage.getItem('mt_beta') === '1') {
    console.log('%c🎮 my-team 測試工具已載入', 'color:#f0c040;font-weight:bold');
    console.log('打 MyTeamDev.status() 看目前狀態');
    console.log('打 MyTeamDev.reset() 完全重置可從頭測新人流程');
  }
})();
