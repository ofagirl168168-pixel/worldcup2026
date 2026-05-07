/* =============================================
   FEEDBACK-MODAL.JS — 麥迪信箱
   使用者回饋表單 → 寫進 supabase.user_feedback
   Telegram bot 輪詢推送給站長
   ============================================= */

(function () {
  'use strict';

  const STORAGE_LAST_SUBMIT = 'feedback_last_submit';
  const STORAGE_VOTER_KEY = 'opinion_voter_key'; // 共用 opinion-poll 的瀏覽器唯一碼
  const RATE_LIMIT_MS = 30 * 1000; // 30 秒一次（防 spam）

  function $(id) { return document.getElementById(id); }

  // 取得（或生成）瀏覽器唯一 voter_key — 用來綁回饋紀錄、讓使用者只看到自己寄過的
  function _ensureVoterKey() {
    let k = localStorage.getItem(STORAGE_VOTER_KEY);
    if (!k) {
      k = 'v_' + Math.random().toString(36).slice(2, 10)
            + Math.random().toString(36).slice(2, 10)
            + Date.now().toString(36);
      localStorage.setItem(STORAGE_VOTER_KEY, k);
    }
    return k;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }).replace(/\//g, '-');
    } catch (e) { return iso; }
  }

  // ── 我的紀錄 — 透過 RPC 抓 voter_key 對應的回饋 ──
  async function loadMyFeedback() {
    const list = $('feedback-my-list');
    if (!list) return;
    if (!window.DB) {
      list.innerHTML = '<div class="feedback-empty">⚠️ 未連線，無法載入</div>';
      return;
    }
    list.innerHTML = '<div class="feedback-empty">載入中…</div>';
    const vkey = _ensureVoterKey();
    try {
      const { data, error } = await window.DB.rpc('get_my_feedback', { vkey });
      if (error) throw error;
      if (!data || !data.length) {
        list.innerHTML = '<div class="feedback-empty">還沒寄過任何訊息</div>';
        return;
      }
      const CAT_ICON = { '建議': '💡', 'Bug': '🐛', '讚美': '❤️', '其他': '💬' };
      list.innerHTML = data.map(f => {
        let status;
        if (f.reply) {
          status = `<span class="fb-replied-mark">📬 站長已回覆 ${_fmtTime(f.replied_at || f.read_at)}</span>`;
        } else if (f.read_at) {
          status = `<span class="fb-read-mark">✓ 已讀 ${_fmtTime(f.read_at)}</span>`;
        } else {
          status = '<span class="fb-pending-mark">⏳ 等待查看</span>';
        }
        const replyBlock = f.reply ? `<div class="fb-item-reply">
          <div class="fb-reply-label">📬 站長回覆</div>
          <div class="fb-reply-content">${escapeHtml(f.reply)}</div>
        </div>` : '';
        return `<div class="fb-item${f.reply ? ' has-reply' : ''}">
          <div class="fb-item-head">
            <span class="fb-item-cat">${CAT_ICON[f.category] || '💬'} ${escapeHtml(f.category)}</span>
            <span class="fb-item-time">${escapeHtml(_fmtTime(f.created_at))}</span>
          </div>
          <div class="fb-item-content">${escapeHtml(f.content)}</div>
          ${replyBlock}
          <div class="fb-item-status">${status}</div>
        </div>`;
      }).join('');
    } catch (e) {
      console.warn('[feedback] load my feedback failed', e);
      list.innerHTML = '<div class="feedback-empty err">❌ 載入失敗：' + escapeHtml(e.message || '未知錯誤') + '</div>';
    }
  }

  window.openFeedbackModal = function openFeedbackModal() {
    const m = $('feedback-modal');
    if (!m) return;
    m.style.display = 'flex';
    requestAnimationFrame(() => m.classList.add('open'));
    // focus content
    setTimeout(() => $('feedback-content')?.focus(), 200);
  };

  window.closeFeedbackModal = function closeFeedbackModal() {
    const m = $('feedback-modal');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => { m.style.display = 'none'; }, 250);
  };

  // 類型按鈕切換
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.feedback-cat');
    if (!btn) return;
    document.querySelectorAll('.feedback-cat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // 寫信 / 我的紀錄 tab 切換
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.feedback-tab');
    if (!tab) return;
    const target = tab.dataset.tab;
    document.querySelectorAll('.feedback-tab').forEach(b => b.classList.toggle('active', b === tab));
    document.querySelectorAll('.feedback-tab-pane').forEach(p => {
      p.style.display = p.dataset.pane === target ? '' : 'none';
    });
    if (target === 'mine') loadMyFeedback();
  });

  // 字數計算
  document.addEventListener('input', (e) => {
    if (e.target.id === 'feedback-content') {
      const el = $('feedback-len');
      if (el) el.textContent = `${e.target.value.length}/500`;
    }
  });

  // 提交
  window.submitFeedback = async function submitFeedback(ev) {
    ev.preventDefault();
    const status = $('feedback-status');
    const submitBtn = $('feedback-submit-btn');
    if (!status || !submitBtn) return;

    // 速率限制
    const last = parseInt(localStorage.getItem(STORAGE_LAST_SUBMIT) || '0', 10);
    if (last && Date.now() - last < RATE_LIMIT_MS) {
      const wait = Math.ceil((RATE_LIMIT_MS - (Date.now() - last)) / 1000);
      status.textContent = `⚠️ 太頻繁了，再等 ${wait} 秒`;
      status.className = 'feedback-status err';
      return;
    }

    const cat = document.querySelector('.feedback-cat.active')?.dataset.cat || '其他';
    const nick = $('feedback-nick').value.trim() || null;
    const content = $('feedback-content').value.trim();
    if (!content) {
      status.textContent = '⚠️ 內容不能空白';
      status.className = 'feedback-status err';
      return;
    }
    if (content.length > 500) {
      status.textContent = '⚠️ 超過 500 字';
      status.className = 'feedback-status err';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '送出中…';
    status.textContent = '';
    status.className = 'feedback-status';

    try {
      if (!window.DB) throw new Error('Supabase 未連線');
      // 取目前登入使用者（如果有）
      let userId = null;
      try {
        const { data } = await window.DB.auth.getUser();
        userId = data?.user?.id || null;
      } catch (e) { /* 未登入 */ }

      const { error } = await window.DB.from('user_feedback').insert({
        category: cat,
        nickname: nick,
        content: content,
        user_id: userId,
        voter_key: _ensureVoterKey(),
        user_agent: (navigator.userAgent || '').slice(0, 200),
      });
      if (error) throw error;

      localStorage.setItem(STORAGE_LAST_SUBMIT, String(Date.now()));
      status.textContent = '✅ 收到！我會盡快看，謝謝你的回饋';
      status.className = 'feedback-status ok';
      // 清空表單
      $('feedback-content').value = '';
      $('feedback-nick').value = '';
      $('feedback-len').textContent = '0/500';
      // 2.5 秒後關閉
      setTimeout(() => closeFeedbackModal(), 2500);
    } catch (e) {
      console.warn('[feedback] submit failed', e);
      status.textContent = '❌ 送出失敗：' + (e.message || '未知錯誤');
      status.className = 'feedback-status err';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '📨 送出';
    }
  };
})();
