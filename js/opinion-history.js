/* =============================================
   OPINION-HISTORY.JS — 麥迪擂台歷史題目瀏覽
   入口：window.showOpinionHistory()
   流程：列表 → 點題 → 結果 + 留言 → 返回
   ============================================= */

(function () {
  'use strict';

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function _todayStr() {
    if (typeof window.localDateStr === 'function') return window.localDateStr();
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function _typeBadge(type) {
    const map = {
      trending:  { label:'時事', cls:'trending' },
      classic:   { label:'永恆', cls:'classic' },
      fun:       { label:'趣味', cls:'fun' },
      predict:   { label:'預測', cls:'predict' },
    };
    const t = map[type] || { label:type, cls:'' };
    return `<span class="oh-type oh-type--${t.cls}">${t.label}</span>`;
  }

  function _shortLabel(opt) {
    return String(opt).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{2B00}-\u{2BFF}]/gu, '').trim().slice(0, 12);
  }

  // ── 列出過往題（有 date 且 < today，倒序） ─────────────
  function _listPastOpinions() {
    const all = (window.DAILY_OPINIONS || []).filter(o => o.date);
    const today = _todayStr();
    const past = all.filter(o => o.date < today);
    // 同日有重複（dup id）→ 用 id+date 去重保留第一筆
    const seen = new Set();
    const unique = [];
    for (const o of past) {
      const k = `${o.id}|${o.date}`;
      if (seen.has(k)) continue;
      seen.add(k); unique.push(o);
    }
    unique.sort((a, b) => b.date.localeCompare(a.date));
    return unique;
  }

  // ── 結果頁：拉真實票數 + 留言 ─────────────────────────
  async function _fetchTally(opinionId, optCount) {
    const zeros = Array(optCount).fill(0);
    if (!window.DB) return zeros;
    try {
      const { data, error } = await window.DB.rpc('opinion_vote_tally', { oid: opinionId });
      if (error) throw error;
      (data || []).forEach(row => {
        const s = typeof row.side === 'number' ? row.side : parseInt(row.side);
        if (s >= 0 && s < optCount) zeros[s] = Number(row.votes) || 0;
      });
      return zeros;
    } catch (e) {
      console.warn('[opinion-history] tally fail', e);
      return zeros;
    }
  }

  async function _fetchComments(opinionId) {
    if (!window.DB) return [];
    try {
      const { data, error } = await window.DB
        .from('opinion_comments')
        .select('id,opinion_id,side,nickname,content,likes,created_at')
        .eq('opinion_id', opinionId)
        .order('likes', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('[opinion-history] comments fail', e);
      return [];
    }
  }

  // ── 渲染 ─────────────────────────────────────────────
  function _ensureOverlay() {
    let o = document.getElementById('opinion-history-overlay');
    if (o) return o;
    o = document.createElement('div');
    o.id = 'opinion-history-overlay';
    o.className = 'oh-overlay';
    o.innerHTML = `
      <div class="oh-box" role="dialog">
        <button class="oh-close" type="button" aria-label="關閉">&times;</button>
        <div class="oh-content" id="oh-content"><div class="oh-loading">載入中…</div></div>
      </div>
    `;
    document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o) _close(); });
    o.querySelector('.oh-close').addEventListener('click', _close);
    return o;
  }

  function _close() {
    const o = document.getElementById('opinion-history-overlay');
    if (!o) return;
    o.classList.remove('open');
    setTimeout(() => o.remove(), 250);
  }

  function _renderList(overlay) {
    const past = _listPastOpinions();
    const content = overlay.querySelector('#oh-content');
    if (!past.length) {
      content.innerHTML = `
        <h3 class="oh-title">📜 擂台歷史</h3>
        <div class="oh-empty">還沒有過去的題目</div>
      `;
      return;
    }
    content.innerHTML = `
      <h3 class="oh-title">📜 擂台歷史 <span class="oh-count">${past.length} 題</span></h3>
      <p class="oh-sub">點題目看結果跟留言</p>
      <div class="oh-list">
        ${past.map(o => `
          <button class="oh-item" type="button" data-id="${_esc(o.id)}" data-date="${_esc(o.date)}">
            <div class="oh-item-meta">
              <span class="oh-item-date">${_esc(o.date)}</span>
              ${_typeBadge(o.type)}
            </div>
            <div class="oh-item-q">${_esc(o.q)}</div>
          </button>
        `).join('')}
      </div>
    `;
    content.querySelectorAll('.oh-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const date = btn.dataset.date;
        const o = past.find(x => x.id === id && x.date === date);
        if (o) _renderDetail(overlay, o);
      });
    });
  }

  async function _renderDetail(overlay, opinion) {
    const content = overlay.querySelector('#oh-content');
    content.innerHTML = `
      <button class="oh-back" type="button" id="oh-back">← 回列表</button>
      <h3 class="oh-title oh-title--detail">${_esc(opinion.q)}</h3>
      <div class="oh-meta-row">
        <span class="oh-item-date">${_esc(opinion.date || '')}</span>
        ${_typeBadge(opinion.type)}
      </div>
      ${opinion.context ? `<p class="oh-context">${_esc(opinion.context)}</p>` : ''}
      <div class="oh-result" id="oh-result"><div class="oh-loading">載入結果中…</div></div>
      <div class="oh-comments" id="oh-comments">
        <div class="oh-comments-head">💬 留言</div>
        <div class="oh-comments-list"><div class="oh-loading">載入留言中…</div></div>
      </div>
    `;
    content.querySelector('#oh-back').addEventListener('click', () => _renderList(overlay));

    const [tally, comments] = await Promise.all([
      _fetchTally(opinion.id, opinion.opts.length),
      _fetchComments(opinion.id),
    ]);

    // 結果條
    const total = tally.reduce((a, b) => a + b, 0);
    const maxV = Math.max(...tally, 1);
    const correctIdx = (typeof opinion.correctAnswer === 'number') ? opinion.correctAnswer : null;
    const resultEl = content.querySelector('#oh-result');
    if (!total) {
      resultEl.innerHTML = '<div class="oh-empty oh-empty--small">當天沒人投票</div>';
    } else {
      resultEl.innerHTML = `
        <div class="oh-bars">
          ${opinion.opts.map((opt, i) => {
            const pct = total > 0 ? Math.round(tally[i] / total * 100) : 0;
            const isWin = tally[i] === maxV && tally[i] > 0;
            const isCorrect = correctIdx === i;
            const widthPct = (tally[i] / maxV) * 100;
            return `
              <div class="oh-bar-row ${isWin ? 'oh-bar-row--win' : ''} ${isCorrect ? 'oh-bar-row--correct' : ''}">
                <div class="oh-bar-label">${_esc(_shortLabel(opt))}${isCorrect ? ' ✅' : ''}</div>
                <div class="oh-bar-track">
                  <div class="oh-bar-fill oh-bar-fill--${i}" style="width:${widthPct}%"></div>
                  <span class="oh-bar-pct">${pct}% · ${tally[i]} 票</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="oh-total">${total} 票</div>
      `;
    }

    // 留言
    const cBox = content.querySelector('#oh-comments .oh-comments-list');
    if (!comments.length) {
      cBox.innerHTML = '<div class="oh-empty oh-empty--small">沒人留言</div>';
    } else {
      const sideLabel = i => _shortLabel(opinion.opts[i] || `選項 ${i+1}`);
      cBox.innerHTML = comments.map(c => `
        <div class="oh-comment">
          <div class="oh-comment-head">
            <span class="oh-comment-nick">${_esc(c.nickname || '匿名')}</span>
            <span class="oh-comment-side">站「${_esc(sideLabel(c.side))}」</span>
            ${c.likes > 0 ? `<span class="oh-comment-likes">❤️ ${c.likes}</span>` : ''}
          </div>
          <div class="oh-comment-text">${_esc(c.content)}</div>
        </div>
      `).join('');
    }
  }

  // ── 公開 API ─────────────────────────────────────────
  function showOpinionHistory() {
    const overlay = _ensureOverlay();
    requestAnimationFrame(() => overlay.classList.add('open'));
    _renderList(overlay);
  }

  window.showOpinionHistory = showOpinionHistory;
})();
