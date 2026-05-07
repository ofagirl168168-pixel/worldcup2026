/* =============================================
   FEEDBACK-MODAL.JS — 麥迪信箱
   使用者回饋表單 → 寫進 supabase.user_feedback
   Telegram bot 輪詢推送給站長
   ============================================= */

(function () {
  'use strict';

  const STORAGE_LAST_SUBMIT = 'feedback_last_submit';
  const RATE_LIMIT_MS = 30 * 1000; // 30 秒一次（防 spam）

  function $(id) { return document.getElementById(id); }

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
    const contact = $('feedback-contact').value.trim() || null;
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
        contact: contact,
        content: content,
        user_id: userId,
        user_agent: (navigator.userAgent || '').slice(0, 200),
      });
      if (error) throw error;

      localStorage.setItem(STORAGE_LAST_SUBMIT, String(Date.now()));
      status.textContent = '✅ 收到！我會盡快看，謝謝你的回饋';
      status.className = 'feedback-status ok';
      // 清空表單
      $('feedback-content').value = '';
      $('feedback-nick').value = '';
      $('feedback-contact').value = '';
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
