/* supabase-client.js — 登入、資料同步、排行榜 */

const SUPA_URL = 'https://dwlngkspwtcsnacbsgct.supabase.co';
const SUPA_KEY = 'sb_publishable_XOYghSiO49fG8nMsztm-cQ_l_Tt6V1u';
const DB = window.supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;

// ── 初始化（頁面載入時呼叫）─────────────────────────────────
async function initAuth() {
  const { data: { session } } = await DB.auth.getSession();
  currentUser = session?.user ?? null;
  updateAuthUI();
  if (currentUser) await handleUserLoggedIn(false);

  DB.auth.onAuthStateChange(async (_event, session) => {
    const prev = currentUser?.id;
    currentUser = session?.user ?? null;
    updateAuthUI();
    if (currentUser && currentUser.id !== prev) {
      await handleUserLoggedIn(true);
    }
    if (!currentUser) renderArena?.();
  });
}

// ── Google 登入 ───────────────────────────────────────────
function loginWithGoogle() {
  DB.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  });
}

// ── 登出 ─────────────────────────────────────────────────
async function logout() {
  await DB.auth.signOut();
  currentUser = null;
  updateAuthUI();
  renderArena?.();
}

// ── 登入後流程 ────────────────────────────────────────────
async function handleUserLoggedIn(isNew) {
  const profile = await getOrCreateProfile();
  if (!profile) return;

  const nameEl = document.getElementById('nav-user-name');
  if (nameEl) nameEl.textContent = profile.nickname || '設定暱稱';

  if (!profile.nickname) {
    openNicknameModal();
  } else if (isNew) {
    await syncToSupabase();
    showToast('✅ 已登入：' + profile.nickname);
  } else {
    await syncToSupabase();
  }
  updateNavXP?.();
  renderArena?.();
}

// ── 取得或建立 profile ────────────────────────────────────
async function getOrCreateProfile() {
  const { data, error } = await DB.from('profiles')
    .select('*').eq('id', currentUser.id).maybeSingle();

  if (error) { console.error(error); return null; }
  if (data) return data;

  const { data: created } = await DB.from('profiles')
    .insert({ id: currentUser.id }).select().single();
  return created;
}

// ── 更新導覽列 UI ─────────────────────────────────────────
function updateAuthUI() {
  const loginBtn  = document.getElementById('nav-login-btn');
  const userWidget = document.getElementById('nav-user-widget');
  if (!loginBtn) return;

  if (currentUser) {
    loginBtn.style.display  = 'none';
    userWidget.style.display = 'flex';
  } else {
    loginBtn.style.display  = 'flex';
    userWidget.style.display = 'none';
  }
}

// ── 暱稱驗證 ─────────────────────────────────────────────
function validateNickname(raw) {
  const name = raw.trim();
  if (name.length < 2 || name.length > 20)
    return '暱稱需在 2–20 字之間';
  if (/https?:\/\/|www\.|\.com|\.net|\.org|\.tw|\.io|\.me/i.test(name))
    return '暱稱不能包含網址';
  if (/09\d{8}|\+886|\d{10,}/.test(name))
    return '暱稱不能包含電話號碼';
  if (/line\.me|line:\/\//i.test(name))
    return '暱稱不能包含 LINE 連結';
  if (/@[a-zA-Z0-9_.]{3,}/.test(name))
    return '暱稱不能包含帳號 ID（@...）';
  if (/discord\.gg|t\.me|telegram|fb\.me|bit\.ly|invite|join/i.test(name))
    return '暱稱不能包含邀請連結';
  const banned = ['幹', '操', 'fuck', 'shit', 'bitch', '白痴', '賤人', '妓女', '屄', '屌'];
  for (const w of banned)
    if (name.toLowerCase().includes(w)) return '暱稱包含不適當內容';
  return null;
}

// ── 儲存暱稱 ─────────────────────────────────────────────
async function saveNickname(raw) {
  const name = raw.trim();
  const err = validateNickname(name);
  if (err) return { error: err };

  // 檢查重複
  const { data: dup } = await DB.from('profiles')
    .select('id').eq('nickname', name)
    .neq('id', currentUser.id).maybeSingle();
  if (dup) return { error: '此暱稱已被使用，請換一個' };

  const { error } = await DB.from('profiles')
    .update({ nickname: name, updated_at: new Date().toISOString() })
    .eq('id', currentUser.id);
  if (error) return { error: '儲存失敗，請再試一次' };
  return { ok: true };
}

// ── 暱稱設定 Modal ────────────────────────────────────────
function openNicknameModal(isEdit = false) {
  const mc = document.getElementById('modal-content');
  mc.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:40px;margin-bottom:10px">👤</div>
      <div style="font-size:20px;font-weight:800">${isEdit ? '修改暱稱' : '設定你的暱稱'}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:6px">將顯示在公開排行榜，請勿填入個人聯絡資訊</div>
    </div>
    <input id="nickname-input" type="text" maxlength="20"
      placeholder="2–20 字，不含電話/網址/LINE"
      style="width:100%;padding:14px 16px;border-radius:12px;
             border:1px solid rgba(255,255,255,0.15);
             background:rgba(255,255,255,0.05);
             color:var(--text-primary);font-size:15px;
             box-sizing:border-box;margin-bottom:8px;outline:none">
    <div id="nickname-error" style="color:#f44336;font-size:13px;min-height:20px;margin-bottom:14px"></div>
    <button onclick="submitNickname()"
      style="width:100%;padding:14px;border-radius:12px;
             background:var(--gold);color:#000;
             font-weight:800;font-size:15px;border:none;cursor:pointer">
      確認設定
    </button>
    ${isEdit ? `<button onclick="closeModal()"
      style="width:100%;padding:12px;border-radius:12px;
             background:transparent;color:var(--text-muted);
             font-size:14px;border:1px solid rgba(255,255,255,0.1);
             cursor:pointer;margin-top:10px">取消</button>` : ''}`;

  document.getElementById('team-modal').classList.add('open');
  setTimeout(() => document.getElementById('nickname-input')?.focus(), 100);
}

async function submitNickname() {
  const input  = document.getElementById('nickname-input');
  const errEl  = document.getElementById('nickname-error');
  if (!input) return;

  errEl.textContent = '確認中...';
  const result = await saveNickname(input.value);

  if (result.error) { errEl.textContent = result.error; return; }

  const nameEl = document.getElementById('nav-user-name');
  if (nameEl) nameEl.textContent = input.value.trim();
  closeModal();
  await syncToSupabase();
  showToast('✅ 暱稱已設定！');
  renderArena?.();
}

// ── localStorage → Supabase 同步 ─────────────────────────
async function syncToSupabase() {
  if (!currentUser) return;

  const champion = load(GK.champion);
  const groups   = load(GK.groups);
  const team     = load(GK.team);

  // 更新 team_code
  if (team) {
    await DB.from('profiles')
      .update({ team_code: team, updated_at: new Date().toISOString() })
      .eq('id', currentUser.id);
  }

  // 更新預測
  const pred = { user_id: currentUser.id, updated_at: new Date().toISOString() };
  if (champion) {
    pred.champion_c1 = champion.c1 ?? null;
    pred.champion_c2 = champion.c2 ?? null;
    pred.champion_c3 = champion.c3 ?? null;
    pred.champion_locked_at = champion.lockedAt ?? null;
  }
  if (groups) pred.groups_data = groups;

  if (champion || groups) {
    await DB.from('predictions').upsert(pred, { onConflict: 'user_id' });
  }

  // 同步每日答題（只上傳新格式 {chosen, isCorrect}）
  const dailyState = getDailyState?.();
  if (!dailyState) return;
  const entries = Object.entries(dailyState.history)
    .filter(([, v]) => v && typeof v === 'object' && v.chosen !== undefined);

  for (const [date, rec] of entries) {
    await DB.from('daily_answers').upsert({
      user_id: currentUser.id,
      question_date: date,
      chosen_idx: rec.chosen,
      is_correct: rec.isCorrect
    }, { onConflict: 'user_id,question_date', ignoreDuplicates: true });
  }
}

// ── 取得排行榜資料 ────────────────────────────────────────
async function fetchLeaderboard() {
  const { data, error } = await DB.from('leaderboard')
    .select('*').limit(50);
  if (error) { console.error('排行榜錯誤:', error); return []; }
  return data ?? [];
}

// ── 渲染排行榜（插入 arena 區塊後方）────────────────────────
async function renderLeaderboard(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)">載入中...</div>`;

  const rows = await fetchLeaderboard();

  if (rows.length === 0) {
    el.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-muted)">
        <div style="font-size:40px;margin-bottom:12px">🏅</div>
        <div>目前還沒有玩家上榜</div>
        <div style="font-size:13px;margin-top:6px">登入並完成任務，搶佔第一！</div>
      </div>`;
    return;
  }

  const myId = currentUser?.id;
  const medals = ['🥇', '🥈', '🥉'];

  el.innerHTML = rows.map((row, i) => {
    const team = row.team_code ? TEAMS?.[row.team_code] : null;
    const flag = team ? team.flag : '🌍';
    const accuracy = row.total_answered > 0
      ? Math.round(row.correct_answers / row.total_answered * 100) + '%'
      : '—';
    const isMe = row.id === myId;

    return `
      <div class="lb-row ${isMe ? 'lb-me' : ''}">
        <div class="lb-rank">${medals[i] ?? `#${i + 1}`}</div>
        <div class="lb-flag">${flag}</div>
        <div class="lb-name">${row.nickname}${isMe ? ' <span class="lb-you">你</span>' : ''}</div>
        <div class="lb-stats">
          <span class="lb-xp">⚡ ${row.xp} XP</span>
          <span class="lb-acc">🎯 ${accuracy}</span>
        </div>
      </div>`;
  }).join('');
}

// ── 簡易 Toast 通知 ───────────────────────────────────────
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'supa-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

// ── 用戶選單（下拉）─────────────────────────────────────
function toggleUserMenu() {
  const menu = document.getElementById('user-dropdown');
  if (!menu) return;
  menu.classList.toggle('open');
  // 點外面關閉
  const close = (e) => {
    if (!menu.contains(e.target) && e.target.id !== 'nav-user-widget') {
      menu.classList.remove('open');
      document.removeEventListener('click', close);
    }
  };
  if (menu.classList.contains('open'))
    setTimeout(() => document.addEventListener('click', close), 0);
}

// 頁面載入後初始化
document.addEventListener('DOMContentLoaded', initAuth);
