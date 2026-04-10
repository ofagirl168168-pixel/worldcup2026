/* gems.js — 寶石系統前端 */

const FUNC_URL = 'https://dwlngkspwtcsnacbsgct.supabase.co/functions/v1'

// ── 取得 JWT token ─────────────────────────────────────────
async function getToken() {
  const { data: { session } } = await DB.auth.getSession()
  return session?.access_token ?? null
}

// ── 呼叫 Edge Function ────────────────────────────────────
async function callEdge(fnName, body) {
  const token = await getToken()
  if (!token) return { error: '未登入' }
  try {
    const res = await fetch(`${FUNC_URL}/${fnName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok && !data.error) return { error: `HTTP ${res.status}` }
    return data
  } catch (e) {
    console.error('callEdge error:', fnName, e)
    return { error: e.message }
  }
}

// ── 領取寶石（伺服器驗證）────────────────────────────────
async function awardGem(type) {
  if (!currentUser) return null
  const result = await callEdge('award-gem', { type })
  if (result.error) {
    // 409 = 已領過，正常情況不需要提示
    if (!result.error.includes('已領取') && !result.error.includes('已領取過')) {
      console.warn('awardGem:', result.error)
    }
    return null
  }
  updateGemUI(result.balance)
  return result
}

// ── 消耗寶石解鎖（match / knockout / deep）────────────────
async function spendGemForMatch(matchId, spendType = 'unlock_match') {
  if (!currentUser) {
    showGemLoginPrompt()
    return false
  }
  const result = await callEdge('spend-gem', { match_id: matchId, spend_type: spendType })
  if (result.already_unlocked) {
    updateGemUI(result.balance)
    return true
  }
  if (result.error === '寶石不足') {
    showGemShortPrompt()
    return false
  }
  if (result.error) {
    showToast('❌ ' + result.error)
    return false
  }
  updateGemUI(result.balance)
  if (result.cost) showToast(`-${result.cost} 寶石（餘額 ${result.balance}）`)
  else if (result.unlocked) showToast('🎁 首次免費解鎖！')
  return true
}

// ── 深度分析解鎖 ──────────────────────────────────────────
async function unlockDeepAnalysis(matchId) {
  return await spendGemForMatch(matchId, 'unlock_deep')
}

// ── 取得目前寶石餘額 ──────────────────────────────────────
async function fetchGemBalance() {
  if (!currentUser) return 0
  const { data } = await DB.from('gem_balance')
    .select('balance').eq('user_id', currentUser.id).maybeSingle()
  return data?.balance ?? 0
}

// ── 取得已解鎖的比賽清單（從 gem_transactions 直接查詢）──
async function fetchUnlockedMatches() {
  if (!currentUser) return new Set()
  const { data } = await DB.from('gem_transactions')
    .select('ref_id')
    .eq('user_id', currentUser.id)
    .in('type', ['unlock_match', 'unlock_knockout', 'first_free'])
  return new Set((data ?? []).map(r => r.ref_id).filter(Boolean))
}

// ── 取得已解鎖深度分析的比賽清單 ────────────────────────
async function fetchUnlockedDeep() {
  if (!currentUser) return new Set()
  const { data } = await DB.from('gem_transactions')
    .select('ref_id')
    .eq('user_id', currentUser.id)
    .eq('type', 'unlock_deep')
  return new Set((data ?? []).map(r => r.ref_id).filter(Boolean))
}

// ── 更新導覽列寶石顯示 ────────────────────────────────────
function updateGemUI(balance) {
  const el = document.getElementById('nav-gem-count')
  if (el) el.textContent = balance ?? '?'
}

// ── 初始化寶石（登入後呼叫）──────────────────────────────
async function initGems() {
  if (!currentUser) {
    updateGemUI(null)
    return
  }
  const balance = await fetchGemBalance()
  updateGemUI(balance)

  // 載入已解鎖比賽清單（供 openPredModal 判斷是否顯示遮罩）
  window.unlockedMatchSet = await fetchUnlockedMatches()
  window.unlockedDeepSet  = await fetchUnlockedDeep()

  // 單獨確認 first_free 是否已使用（不依賴 unlockedMatchSet 大小）
  const { data: ffRow } = await DB.from('gem_transactions')
    .select('id').eq('user_id', currentUser.id).eq('type', 'first_free').maybeSingle()
  window.firstFreeUsed = !!ffRow

  // 處理邀請碼（從 URL ?ref=CODE）
  const urlRef = new URLSearchParams(window.location.search).get('ref')
  if (urlRef) {
    const token = await getToken()
    const res = await fetch(`${FUNC_URL}/referral-join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_code: urlRef })
    })
    const data = await res.json()
    if (data.success) {
      showToast('🎁 邀請獎勵已發放！+3 寶石')
      // 移除 URL 中的 ref 參數
      window.history.replaceState({}, '', window.location.pathname)
      await initGems()
    }
  }
}

// ── 一次性任務觸發點 ──────────────────────────────────────
async function onFirstAccount()   { const r = await awardGem('first_account');  if (r) showToast(`💎 首次綁定帳號！+${r.awarded} 寶石（餘額 ${r.balance}）`) }
async function onFirstChampion()  { const r = await awardGem('first_champion'); if (r) showToast(`💎 首次冠軍預測！+${r.awarded} 寶石（餘額 ${r.balance}）`) }
async function onFirstGroups()    { const r = await awardGem('first_groups');   if (r) showToast(`💎 首次分組預測！+${r.awarded} 寶石（餘額 ${r.balance}）`) }
async function onFirstTeam()      { const r = await awardGem('first_team');     if (r) showToast(`💎 首次支持球隊！+${r.awarded} 寶石（餘額 ${r.balance}）`) }

// 連勝里程碑
async function checkStreakGem(streak) {
  if (streak === 7)  { const r = await awardGem('streak_7');  if (r) showToast(`🔥 連勝 7 天！+${r.awarded} 寶石`) }
  if (streak === 14) { const r = await awardGem('streak_14'); if (r) showToast(`🔥 連勝 14 天！+${r.awarded} 寶石`) }
  if (streak === 30) { const r = await awardGem('streak_30'); if (r) showToast(`🔥 連勝 30 天！+${r.awarded} 寶石`) }
}

// 每日答對
async function onDailyCorrect() {
  const r = await awardGem('daily_correct')
  if (r) showToast(`💎 答對！+${r.awarded} 寶石（餘額 ${r.balance}）`)
}

// ── 邀請連結 ──────────────────────────────────────────────
function _shareBaseUrl() {
  const base = window.location.origin;
  const isUcl = window.Tournament?.isUCL?.() ?? false;
  return isUcl ? `${base}?t=ucl` : base;
}

async function getMyRefLink() {
  if (!currentUser) return null
  const { data } = await DB.from('profiles')
    .select('ref_code').eq('id', currentUser.id).single()
  if (!data?.ref_code) return null
  const isUcl = window.Tournament?.isUCL?.() ?? false;
  return isUcl
    ? `${window.location.origin}?t=ucl&ref=${data.ref_code}`
    : `${window.location.origin}?ref=${data.ref_code}`
}

async function copyRefLink() {
  const link = await getMyRefLink()
  if (!link) { showToast('請先登入'); return }
  navigator.clipboard.writeText(link).then(() => showToast('✅ 邀請連結已複製！'))
}

// ── 寶石不足提示 Modal ────────────────────────────────────
function showGemShortPrompt() {
  const mc = document.getElementById('modal-content')
  mc.innerHTML = `
    <div style="text-align:center;padding:10px 0">
      <div style="display:flex;justify-content:center;margin-bottom:12px">
        <span class="gem-ico" style="width:48px;height:48px;filter:drop-shadow(0 0 10px rgba(255,190,0,0.9))"></span>
      </div>
      <div style="font-size:20px;font-weight:800;margin-bottom:8px">寶石不足</div>
      <div style="font-size:14px;color:var(--text-muted);line-height:1.7;margin-bottom:24px">
        觀看預測分析需要 1 顆寶石<br>
        透過以下方式獲得更多寶石：
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;text-align:left;margin-bottom:24px">
        <div class="gem-earn-row"><span>❓</span><span>每日答題答對</span><span class="gem-earn-amt">+1 / 天</span></div>
        <div class="gem-earn-row"><span>🔥</span><span>連勝 7 天里程碑</span><span class="gem-earn-amt">+3</span></div>
        <div class="gem-earn-row"><span>👥</span><span>邀請好友加入</span><span class="gem-earn-amt">+3</span></div>
        <div class="gem-earn-row"><span>⬆️</span><span>等級提升獎勵</span><span class="gem-earn-amt">+2～10</span></div>
      </div>
      <button onclick="copyRefLink();closeModal()" style="width:100%;padding:14px;border-radius:12px;background:var(--accent);color:#000;font-weight:800;font-size:14px;border:none;cursor:pointer">
        複製邀請連結，邀請好友
      </button>
      <button onclick="closeModal()" style="width:100%;padding:12px;border-radius:12px;background:transparent;color:var(--text-muted);font-size:13px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;margin-top:10px">
        關閉
      </button>
    </div>`
  document.getElementById('team-modal').classList.add('open')
}

// ── 通知訂閱 ──────────────────────────────────────────────
function updateNotifyCard() {
  const subCard  = document.getElementById('notify-subscribe-card')
  const doneCard = document.getElementById('notify-subscribed-card')
  if (!subCard || !doneCard) return

  // 檢查瀏覽器通知權限
  const perm = Notification?.permission
  if (perm === 'granted') {
    subCard.style.display  = 'none'
    doneCard.style.display = 'flex'
  } else if (perm === 'denied') {
    subCard.style.display  = 'none'
    doneCard.style.display = 'none'
  } else {
    subCard.style.display  = 'flex'
    doneCard.style.display = 'none'
  }
}

async function subscribeNotification() {
  window.OneSignalDeferred = window.OneSignalDeferred || []
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.Notifications.requestPermission()
    updateNotifyCard()
  })
}

// ── 寶石說明面板開關 ──────────────────────────────────────
function toggleGemPanel() {
  const panel = document.getElementById('gem-panel')
  if (!panel) return
  panel.classList.toggle('open')
  if (panel.classList.contains('open')) {
    // 點面板外部關閉
    setTimeout(() => document.addEventListener('click', closeGemPanelOutside, { once: true }), 0)
  }
}
function closeGemPanelOutside(e) {
  const widget = document.getElementById('nav-gem-widget')
  if (widget && !widget.contains(e.target)) {
    document.getElementById('gem-panel')?.classList.remove('open')
  }
}

// ── 未登入提示 ────────────────────────────────────────────
function showGemLoginPrompt() {
  const mc = document.getElementById('modal-content')
  mc.innerHTML = `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:48px;margin-bottom:12px">🔒</div>
      <div style="font-size:20px;font-weight:800;margin-bottom:8px">需要登入</div>
      <div style="font-size:14px;color:var(--text-muted);line-height:1.7;margin-bottom:24px">
        觀看預測分析需要寶石<br>登入後即可獲得初始寶石
      </div>
      <button onclick="loginWithGoogle();closeModal()" style="width:100%;padding:14px;border-radius:12px;background:#fff;color:#222;font-weight:800;font-size:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Google 登入
      </button>
    </div>`
  document.getElementById('team-modal').classList.add('open')
}
