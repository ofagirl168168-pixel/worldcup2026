/* =============================================
   AUTO-REFRESH.JS — 跨日自動刷新
   ============================================= */
// 問題：data-opinions.js / data-articles.js 等資料檔在頁面載入時被讀進 window 全域、
//      之後就不會再 fetch（即使 must-revalidate）。使用者開著 tab 跨日，看到的是昨天的擂台 / 文章。
//
// 修：用兩條觸發路徑檢測日期變動 + 重整：
//   1. visibilitychange — tab 切回前景就比對「載入時的日期」vs「現在的日期」
//   2. setInterval 60s — 在前景時也週期性檢查（防使用者整天不切 tab）
//
// 一旦偵測到跨日：
//   - 切 tab 回來這條：直接 location.reload()（使用者離開過頁面，靜默重整無感）
//   - 前景輪詢這條：顯示 toast「今天內容已更新，點此刷新」讓使用者主動觸發（避免打斷正在做的事）

(function () {
  'use strict';

  function todayStr() {
    if (typeof window.localDateStr === 'function') return window.localDateStr();
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const _initDate = todayStr();
  let _toastShown = false;

  function dateChanged() {
    return todayStr() !== _initDate;
  }

  // ─── tab 切回前景 → 跨日就重整 ───
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && dateChanged()) {
      console.log('[auto-refresh] 偵測跨日（visibilitychange） → reload');
      location.reload();
    }
  });

  // ─── 前景每分鐘檢查 → 跨日就 toast 提示 ───
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (!dateChanged() || _toastShown) return;
    _toastShown = true;

    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:rgba(15,20,40,0.96);color:#ffd700;border:1px solid rgba(255,215,0,0.35);' +
      'padding:14px 22px;border-radius:12px;cursor:pointer;z-index:99999;' +
      'font-size:14px;font-weight:700;letter-spacing:0.5px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.55);' +
      'display:flex;align-items:center;gap:10px;animation:fadeInUp 0.3s ease;';
    t.innerHTML = '🔄 今天的內容已更新，<span style="text-decoration:underline">點此刷新</span>';
    t.title = '今天的擂台 / 文章 / 比賽資料已更新';
    t.onclick = () => location.reload();
    document.body.appendChild(t);

    // 30 秒後自動消失（不重整，使用者選擇繼續看舊內容）
    setTimeout(() => { try { t.remove(); } catch (e) {} }, 30000);
  }, 60000);

  console.log(`[auto-refresh] 監看跨日中（載入日期 ${_initDate}）`);
})();
