/* =============================================
   OPINION-POLL.JS — 觀點投票彈窗系統
   全螢幕投票 → 動畫結果 → 分享卡片
   ============================================= */

(function () {
  'use strict';

  const STORAGE_PREFIX = 'opinion_vote_';
  const STORAGE_SHOWN = 'opinion_shown_';
  const STORAGE_COMMENT = 'opinion_commented_';
  const STORAGE_LIKE = 'opinion_liked_';
  const STORAGE_VOTER_KEY = 'opinion_voter_key';
  const STORAGE_STREAK = 'opinion_streak'; // {current, longest, lastDate}
  const TAG_LABELS = { trending: '🔥 時事', classic: '⚽ 經典', fun: '🎉 趣味', predict: '🔮 預測' };
  const MAX_COMMENT_LEN = 100;
  let _commentChannel = null; // realtime subscription
  let _voteChannel = null;    // realtime vote tally 訂閱

  /* ---------- 顯示觀點投票彈窗 ---------- */
  function showOpinionPoll(onClose, opts) {
    opts = opts || {};
    // 同時間已有 overlay 就不重開
    if (document.getElementById('opinion-overlay')) {
      if (onClose) onClose();
      return;
    }
    const today = localDateStr();
    const shownKey = STORAGE_SHOWN + today;
    // 指定 pollId 時視同強制開啟（分享連結、歷史題永久連結）
    const forced = opts.force || !!opts.pollId;
    if (!forced && localStorage.getItem(shownKey)) {
      if (onClose) onClose();
      return;
    }

    // 指定 pollId → 依 id 找題；否則走今日題邏輯
    let opinion = null;
    if (opts.pollId && Array.isArray(window.DAILY_OPINIONS)) {
      opinion = window.DAILY_OPINIONS.find(o => o.id === opts.pollId) || null;
    }
    if (!opinion) opinion = getTodayOpinion();
    if (!opinion) { if (onClose) onClose(); return; }

    const voteKey = STORAGE_PREFIX + opinion.id;
    const existingVote = localStorage.getItem(voteKey);

    // 建立 overlay
    const overlay = document.createElement('div');
    overlay.className = 'opinion-overlay';
    overlay.id = 'opinion-overlay';

    const isMulti = opinion.opts.length > 2;
    const cardsClass = isMulti ? 'opinion-cards opinion-cards--multi' : 'opinion-cards';
    const tagClass = 'opinion-tag opinion-tag--' + (opinion.type || 'classic');

    overlay.innerHTML = `
      <div class="opinion-glow"></div>
      <div class="opinion-stars"></div>
      <div class="opinion-container">
        <div class="opinion-brand">
          <div class="opinion-brand-line"></div>
          <div class="opinion-brand-title">
            <span class="opinion-brand-vs left">VS</span>
            <span class="opinion-brand-name">麥迪擂台</span>
            <span class="opinion-brand-vs right">VS</span>
          </div>
          <div class="opinion-brand-line"></div>
        </div>
        <div class="opinion-brand-tagline">MADDY ARENA · 每天一題，選邊站</div>
        <span class="${tagClass}">${TAG_LABELS[opinion.type] || '⚽ 觀點'}</span>
        <div class="opinion-question">${opinion.q}</div>
        <div class="opinion-context">${opinion.context || ''}</div>
        <div class="${cardsClass}" id="opinion-cards">
          ${opinion.opts.map((opt, i) => {
            const parts = _splitEmoji(opt);
            const romans = ['I','II','III','IV'];
            return `<div class="opinion-card opinion-card--c${i}" data-idx="${i}">
              <div class="opinion-card-frame">
                <span class="opinion-card-corner tl"></span>
                <span class="opinion-card-corner tr"></span>
                <span class="opinion-card-corner bl"></span>
                <span class="opinion-card-corner br"></span>
                <span class="opinion-card-diamond top"></span>
                <span class="opinion-card-diamond bottom"></span>
              </div>
              ${parts.emoji ? `<div class="opinion-card-icon">${parts.emoji}</div>` : ''}
              <div class="opinion-card-divider"></div>
              <div class="opinion-card-text">${parts.text}</div>
              <div class="opinion-card-label">${romans[i] || ''}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="opinion-result" id="opinion-result"></div>
        <button class="opinion-skip" id="opinion-skip">先跳過</button>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('opinion-open');

    // 觸發入場動畫 (需要一幀延遲)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('open');
      });
    });

    // 標記「今天已彈過」——延遲到真的看到 overlay 後再寫，
    // 避免預載/瞬開瞬關把旗標預先設掉導致當天再也不彈
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        localStorage.setItem(shownKey, '1');
        _cleanOldKeys(STORAGE_SHOWN);
      }
    }, 800);

    // 如果已投過票，直接顯示結果
    if (existingVote !== null) {
      setTimeout(() => {
        _showResult(opinion, parseInt(existingVote), overlay, onClose);
      }, 600);
      return;
    }

    // 綁定卡片點擊 + hover 光暈（以卡片為中心）
    const cards = overlay.querySelectorAll('.opinion-card');
    const setGlowFromCard = (card, idx) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      overlay.style.setProperty('--glow-x', cx + 'px');
      overlay.style.setProperty('--glow-y', cy + 'px');
      // 切換配色
      overlay.classList.remove('glow-0', 'glow-1', 'glow-2', 'glow-3');
      overlay.classList.add('glow-' + idx);
      // 依卡片位置選同側遮罩（水平優先；若垂直偏移明顯則改用上下遮罩）
      overlay.classList.remove('glow-side-left', 'glow-side-right', 'glow-side-top', 'glow-side-bottom');
      const vw = window.innerWidth, vh = window.innerHeight;
      const dx = cx - vw / 2, dy = cy - vh / 2;
      if (Math.abs(dx) >= Math.abs(dy)) {
        overlay.classList.add(dx < 0 ? 'glow-side-left' : 'glow-side-right');
      } else {
        overlay.classList.add(dy < 0 ? 'glow-side-top' : 'glow-side-bottom');
      }
    };
    cards.forEach(card => {
      const idx = parseInt(card.dataset.idx);
      card.addEventListener('mouseenter', () => {
        if (overlay.dataset.voted) return;
        setGlowFromCard(card, idx);
        overlay.classList.add('hover-active');
      });
      card.addEventListener('mouseleave', () => {
        if (overlay.dataset.voted) return;
        overlay.classList.remove('hover-active');
      });
      card.addEventListener('click', function () {
        if (overlay.dataset.voted) return;
        overlay.dataset.voted = '1';
        setGlowFromCard(card, idx);
        overlay.classList.remove('hover-active');
        _handleVote(opinion, idx, cards, overlay, onClose);
      });
    });

    // 跳過按鈕
    overlay.querySelector('#opinion-skip').addEventListener('click', () => {
      _closeOverlay(overlay, onClose);
    });

    // 點背景關閉
    overlay.addEventListener('click', e => {
      if (e.target === overlay) _closeOverlay(overlay, onClose);
    });
  }

  /* ---------- 處理投票 ---------- */
  function _handleVote(opinion, chosenIdx, cards, overlay, onClose) {
    // 本機先記（立即生效，網路失敗也保留用戶立場）
    localStorage.setItem(STORAGE_PREFIX + opinion.id, chosenIdx);
    _cleanOldKeys(STORAGE_PREFIX);

    // 連續天數 +1（同日重複投不會重算）→ 供 _showResult 渲染
    overlay.dataset.streakBump = JSON.stringify(_bumpStreakToday());

    // 送到 Supabase（失敗不擋 UI）
    _insertVote(opinion.id, chosenIdx);

    // 觸發滿版光暈爆發（位置已在 click 時設好，切換為 burst 模式）
    overlay.classList.add('burst-active');

    // 動畫：選中放大、其他飛走
    cards.forEach((card, i) => {
      if (i === chosenIdx) {
        card.classList.add('voted-yes');
      } else {
        card.classList.add('voted-no');
      }
    });

    // 隱藏跳過按鈕
    const skipBtn = overlay.querySelector('#opinion-skip');
    if (skipBtn) skipBtn.style.display = 'none';

    // 延遲後顯示結果
    setTimeout(() => {
      _showResult(opinion, chosenIdx, overlay, onClose);
    }, 600);
  }

  /* ---------- 連續天數 streak（Duolingo 式 localStorage 單機紀錄） ---------- */
  function _getStreak() {
    try {
      const raw = localStorage.getItem(STORAGE_STREAK);
      if (!raw) return { current: 0, longest: 0, lastDate: null };
      const o = JSON.parse(raw) || {};
      return {
        current: (o.current | 0) || 0,
        longest: (o.longest | 0) || 0,
        lastDate: o.lastDate || null,
      };
    } catch (e) { return { current: 0, longest: 0, lastDate: null }; }
  }

  function _bumpStreakToday() {
    const today = localDateStr();
    const s = _getStreak();
    if (s.lastDate === today) return { ...s, bumped: false };
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear() + '-' +
              String(d.getMonth() + 1).padStart(2, '0') + '-' +
              String(d.getDate()).padStart(2, '0');
    const next = {
      current: s.lastDate === y ? s.current + 1 : 1,
      longest: 0,
      lastDate: today,
    };
    next.longest = Math.max(s.longest, next.current);
    localStorage.setItem(STORAGE_STREAK, JSON.stringify(next));
    return { ...next, bumped: true, prevCurrent: s.current };
  }

  /* ---------- 真實投票：裝置唯一碼、INSERT、聚合 RPC、realtime ---------- */
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

  async function _insertVote(opinionId, side) {
    if (!window.DB) return { ok: false, reason: 'no-db' };
    try {
      const voter_key = _ensureVoterKey();
      const { error } = await window.DB.from('opinion_votes').insert({
        opinion_id: opinionId, side, voter_key,
      });
      if (error) {
        // 同裝置已投過 → UNIQUE 違反，視為正常
        if (/duplicate|unique/i.test(error.message || error.code || '')) return { ok: true, duplicate: true };
        throw error;
      }
      return { ok: true };
    } catch (e) {
      console.warn('[opinion] 投票 INSERT 失敗', e);
      return { ok: false, error: e };
    }
  }

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
      console.warn('[opinion] tally 讀取失敗', e);
      return zeros;
    }
  }

  function _subscribeVotes(opinion, onInsert) {
    _unsubscribeVotes();
    if (!window.DB || !window.DB.channel) return;
    try {
      _voteChannel = window.DB
        .channel('opinion-votes-' + opinion.id)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'opinion_votes', filter: `opinion_id=eq.${opinion.id}` },
          (payload) => {
            const row = payload.new;
            if (!row) return;
            onInsert(row.side);
          })
        .subscribe();
    } catch (e) { console.warn('[opinion] 投票訂閱失敗', e); }
  }

  function _unsubscribeVotes() {
    if (_voteChannel && window.DB && window.DB.removeChannel) {
      try { window.DB.removeChannel(_voteChannel); } catch (e) {}
    }
    _voteChannel = null;
  }

  /* ---------- 顯示結果 ---------- */
  async function _showResult(opinion, chosenIdx, overlay, onClose) {
    const resultEl = overlay.querySelector('#opinion-result');
    if (!resultEl) return;

    // 先拉真實票數（RPC 聚合）
    const votes = await _fetchTally(opinion.id, opinion.opts.length);
    const totalVotes = votes.reduce((a, b) => a + b, 0);

    // 找少數派（至少有 2 人投票才判斷，避免首票就被叫少數派）
    const maxVotes = Math.max(...votes);
    const isMinority = totalVotes >= 2 && votes[chosenIdx] < maxVotes;

    // 連續天數：若剛投完票（_handleVote 寫入 dataset），用 bumped 後狀態；否則直接讀
    let streak;
    try {
      streak = overlay.dataset.streakBump ? JSON.parse(overlay.dataset.streakBump) : _getStreak();
    } catch (e) { streak = _getStreak(); }
    const streakHtml = (streak && streak.current > 0) ? `
      <div class="opinion-streak ${streak.bumped ? 'just-bumped' : ''}">
        <span class="opinion-streak-flame">🔥</span>
        <span class="opinion-streak-main">連續 <b>${streak.current}</b> 天戰場集合</span>
        ${streak.longest > streak.current ? `<span class="opinion-streak-best">個人最佳 ${streak.longest} 天</span>` : ''}
        ${streak.bumped && streak.current >= 2 ? `<span class="opinion-streak-tip">斷了就歸零，明天再來 💪</span>` : ''}
      </div>` : '';

    resultEl.innerHTML = `
      ${opinion.opts.map((opt, i) => {
        const pct = totalVotes > 0 ? Math.round(votes[i] / totalVotes * 100) : 0;
        const isMine = i === chosenIdx;
        return `<div class="opinion-result-bar">
          <span class="opinion-result-label">${_shortLabel(opt)}</span>
          <div class="opinion-result-track">
            <div class="opinion-result-fill opinion-result-fill--${i} ${isMine ? 'mine' : ''}" data-pct="${pct}">
              ${pct}%
            </div>
          </div>
        </div>`;
      }).join('')}
      <div class="opinion-total">${totalVotes} 人已投票</div>
      ${isMinority ? '<div class="opinion-minority">🤔 你是少數派！</div>' : ''}
      ${streakHtml}
      <div class="opinion-actions">
        <button class="opinion-btn opinion-btn--share" id="opinion-share-btn">
          <i class="fas fa-share-alt"></i> 分享立場
        </button>
        <button class="opinion-btn opinion-btn--close" id="opinion-close-btn">
          繼續 →
        </button>
      </div>
      <div class="opinion-comments" id="opinion-comments">
        <div class="opinion-comments-header">
          <span class="opinion-comments-title">💬 擂台留言</span>
          <span class="opinion-comments-count" id="opinion-comments-count">載入中…</span>
        </div>
        <div class="opinion-comments-list" id="opinion-comments-list"></div>
        <div class="opinion-comments-form">
          <input type="text" id="opinion-comment-input"
            maxlength="${MAX_COMMENT_LEN}"
            placeholder="說一句話撐你這邊…（${MAX_COMMENT_LEN}字內）" />
          <button id="opinion-comment-submit" class="opinion-comment-submit">送出</button>
        </div>
        <div class="opinion-comment-hint" id="opinion-comment-hint"></div>
      </div>`;

    resultEl.classList.add('show');

    // 結果顯示後把 overlay 捲回頂部（避免投完票後停在下方看不到題目/結果）
    try { overlay.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { overlay.scrollTop = 0; }

    // 動畫填充百分比條
    requestAnimationFrame(() => {
      resultEl.querySelectorAll('.opinion-result-fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    });

    // 繼續按鈕
    resultEl.querySelector('#opinion-close-btn').addEventListener('click', () => {
      _closeOverlay(overlay, onClose);
    });

    // 分享按鈕
    const shareBtn = resultEl.querySelector('#opinion-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        _shareOpinion(opinion, chosenIdx, votes, totalVotes);
      });
    }
    // 保留 window 版（外部呼叫備援）
    window._shareOpinion = () => _shareOpinion(opinion, chosenIdx, votes, totalVotes);

    // 擂台留言區
    _initComments(opinion, chosenIdx, resultEl);

    // 訂閱新票 → 即時更新百分比條
    _subscribeVotes(opinion, (side) => {
      if (side < 0 || side >= votes.length) return;
      votes[side]++;
      const newTotal = votes.reduce((a, b) => a + b, 0);
      // 更新每條百分比（寬度 + 文字）
      resultEl.querySelectorAll('.opinion-result-fill').forEach((bar, i) => {
        const pct = newTotal > 0 ? Math.round(votes[i] / newTotal * 100) : 0;
        bar.dataset.pct = pct;
        bar.style.width = pct + '%';
        bar.textContent = pct + '%';
        if (i === chosenIdx) bar.classList.add('mine');
      });
      // 更新總票數
      const totalEl = resultEl.querySelector('.opinion-total');
      if (totalEl) totalEl.textContent = newTotal + ' 人已投票';
    });
  }

  /* ---------- 分享功能（Canvas 產分享卡） ---------- */
  // 對應 .glow-0/1/2/3 的配色（見 css/components.css）
  const SHARE_PALETTE = [
    { c1: '#ff6b6b', c2: '#ee5a24' },
    { c1: '#7f73ff', c2: '#4834d4' },
    { c1: '#2ed573', c2: '#009432' },
    { c1: '#ffa502', c2: '#e67e22' },
  ];

  async function _shareOpinion(opinion, chosenIdx, votes, totalVotes) {
    console.log('[opinion] 分享流程啟動', { id: opinion.id, chosenIdx });
    const btn = document.querySelector('.opinion-btn--share');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 產生分享卡...';

    try {
      const blob = await _makeShareCard(opinion, chosenIdx, votes, totalVotes);
      console.log('[opinion] 分享卡產生完成，大小', blob && blob.size);
      const file = new File([blob], `maddy-arena-${opinion.id}.png`, { type: 'image/png' });
      const pct = totalVotes > 0 ? Math.round(votes[chosenIdx] / totalVotes * 100) : 0;
      const shareUrl = _buildPollUrl(opinion.id);
      const _maxVotes = Math.max(...votes);
      const _isMinority = totalVotes >= 2 && votes[chosenIdx] < _maxVotes;
      const _streak = _getStreak();
      // 依身份動態組 hook：少數派 > streak > 一般
      let hook;
      if (_isMinority) {
        hook = `我是那 ${pct}% 的少數派 ⚔️\n我選「${opinion.opts[chosenIdx]}」，你敢跟我站同邊嗎？`;
      } else if (_streak && _streak.current >= 3) {
        hook = `🔥 連續 ${_streak.current} 天戰場集合\n今天我選「${opinion.opts[chosenIdx]}」(${pct}% 的人跟我一樣)`;
      } else {
        hook = `我選了「${opinion.opts[chosenIdx]}」(${pct}% 的人跟我一樣)`;
      }
      const text = `⚽ 麥迪擂台 今日觀點：${opinion.q}\n${hook}\n來 Soccer麥迪 投下你的一票 👉`;

      // 1) 行動端：Web Share Level 2（含檔案）
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: '麥迪擂台', text, url: shareUrl, files: [file] }).catch(() => {});
        _resetShareBtn(btn);
        return;
      }
      // 2) 桌機：嘗試把圖片複製到剪貼簿
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          if (btn) btn.innerHTML = '<i class="fas fa-check"></i> 圖片已複製！';
          setTimeout(() => _resetShareBtn(btn), 2500);
          return;
        } catch (e) { /* fall through to download */ }
      }
      // 3) 退而求其次：直接下載 PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (btn) btn.innerHTML = '<i class="fas fa-download"></i> 已下載圖片';
      setTimeout(() => _resetShareBtn(btn), 2500);
    } catch (err) {
      console.error('[opinion] 分享卡產生失敗', err);
      if (btn) {
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 失敗：' + (err && err.message || err);
        setTimeout(() => _resetShareBtn(btn), 4000);
      }
    }
  }

  function _resetShareBtn(btn) {
    if (!btn) return;
    btn.innerHTML = '<i class="fas fa-share-alt"></i> 分享立場';
  }

  // 生成 1080x1350 分享卡：用 html2canvas 截網站的塔羅牌畫面 + 頁尾 logo/QR
  async function _makeShareCard(opinion, chosenIdx, votes, totalVotes) {
    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas 未載入');
    }
    const W = 1080, H = 1350;
    const isMulti = opinion.opts.length > 2;
    const romans = ['I', 'II', 'III', 'IV'];
    const tagText = TAG_LABELS[opinion.type] || '⚽ 觀點';
    const palette = SHARE_PALETTE[chosenIdx % SHARE_PALETTE.length];
    const url = _buildPollUrl(opinion.id);
    const host = location.host || 'soccermaddy.com';
    const totalStr = (typeof totalVotes === 'number' && totalVotes > 0)
      ? totalVotes.toLocaleString() + ' 人已投票'
      : '';

    // 身份徽章資料：少數派 %、連續天數 streak
    const myVotes = Array.isArray(votes) ? (votes[chosenIdx] || 0) : 0;
    const myPct = totalVotes > 0 ? Math.round(myVotes / totalVotes * 100) : 0;
    const maxVotes = Array.isArray(votes) ? Math.max(...votes) : 0;
    const isMinority = totalVotes >= 2 && myVotes < maxVotes;
    const streak = _getStreak();
    const hasStreakBadge = streak && streak.current >= 2;
    const hasMinorityBadge = isMinority && myPct > 0;
    const badgesHtml = (hasStreakBadge || hasMinorityBadge) ? `
      <div style="
        margin-top:18px; display:flex; gap:14px; justify-content:center; flex-wrap:wrap;
      ">
        ${hasMinorityBadge ? `
          <div style="
            padding:10px 22px; border-radius:999px;
            background:linear-gradient(135deg, rgba(255,71,87,0.25), rgba(255,165,2,0.18));
            border:2px solid rgba(255,71,87,0.65);
            font-size:22px; font-weight:900; color:#ff4757;
            letter-spacing:1.5px; text-shadow:0 0 12px rgba(255,71,87,0.5);
            display:flex; align-items:center; gap:10px;
          ">
            <span style="font-size:26px">⚔️</span>
            <span>少數派 ${myPct}%</span>
          </div>` : ''}
        ${hasStreakBadge ? `
          <div style="
            padding:10px 22px; border-radius:999px;
            background:linear-gradient(135deg, rgba(255,165,2,0.25), rgba(255,71,87,0.2));
            border:2px solid rgba(255,165,2,0.65);
            font-size:22px; font-weight:900; color:#ffb347;
            letter-spacing:1.5px; text-shadow:0 0 12px rgba(255,165,2,0.5);
            display:flex; align-items:center; gap:10px;
          ">
            <span style="font-size:26px">🔥</span>
            <span>連續 ${streak.current} 天戰場集合</span>
          </div>` : ''}
      </div>` : '';

    const cardsHtml = opinion.opts.map((opt, i) => {
      const parts = _splitEmoji(opt);
      return `<div class="opinion-card opinion-card--c${i}" style="
        min-width:${isMulti ? '180px' : '260px'};
        max-width:${isMulti ? '230px' : '320px'};
        padding:28px; border-radius:20px; font-size:${isMulti ? '22px' : '28px'};
        transform:none !important; opacity:1 !important; gap:18px;
        animation:none !important;
      ">
        <div class="opinion-card-frame">
          <span class="opinion-card-corner tl" style="width:26px;height:26px;top:22px;left:22px;border-width:2px"></span>
          <span class="opinion-card-corner tr" style="width:26px;height:26px;top:22px;right:22px;border-width:2px"></span>
          <span class="opinion-card-corner bl" style="width:26px;height:26px;bottom:22px;left:22px;border-width:2px"></span>
          <span class="opinion-card-corner br" style="width:26px;height:26px;bottom:22px;right:22px;border-width:2px"></span>
          <span class="opinion-card-diamond top" style="width:12px;height:12px;top:28px"></span>
          <span class="opinion-card-diamond bottom" style="width:12px;height:12px;bottom:28px"></span>
        </div>
        ${parts.emoji ? `<div class="opinion-card-icon" style="font-size:${isMulti ? '72px' : '90px'};animation:none !important">${parts.emoji}</div>` : ''}
        <div class="opinion-card-divider" style="width:60%"></div>
        <div class="opinion-card-text">${parts.text}</div>
        <div class="opinion-card-label" style="bottom:40px;font-size:14px">${romans[i] || ''}</div>
      </div>`;
    }).join('');

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed; left: -20000px; top: 0;
      width: ${W}px; height: ${H}px;
      background: radial-gradient(ellipse at 50% 35%, ${_rgba(palette.c1, 0.18)} 0%, #0a0a18 70%), #0a0a18;
      color: #fff; overflow: hidden; box-sizing: border-box;
      font-family: 'Noto Sans TC','Microsoft JhengHei',sans-serif;
      display: flex; flex-direction: column; align-items: center;
      padding: 60px 60px 40px;
      z-index: -1;
    `;

    wrapper.innerHTML = `
      <div class="opinion-overlay open glow-${chosenIdx}" style="
        position:static; background:transparent; width:100%;
        display:flex; justify-content:center; padding:0;
      ">
        <div class="opinion-container" style="
          max-width: 900px; width: 100%;
          transform:none !important; opacity:1 !important;
        ">
          <div class="opinion-brand" style="gap:20px;margin-bottom:10px;align-items:center">
            <div class="opinion-brand-line" style="max-width:180px;height:2px"></div>
            <div id="share-title-slot" style="display:flex;align-items:center;gap:22px"></div>
            <div class="opinion-brand-line" style="max-width:180px;height:2px"></div>
          </div>
          <div class="opinion-brand-tagline" style="font-size:18px;letter-spacing:5px;margin-bottom:36px">MADDY ARENA · 每天一題，選邊站</div>
          <div id="share-tag-slot" style="text-align:center;margin-bottom:28px;display:flex;justify-content:center"></div>
          <div class="opinion-question" style="font-size:46px;margin-bottom:14px;line-height:1.35;margin-top:16px">${opinion.q}</div>
          <div class="opinion-context" style="font-size:22px;margin-bottom:40px;line-height:1.55">${opinion.context || ''}</div>
          <div class="opinion-cards ${isMulti ? 'opinion-cards--multi' : ''}" style="gap:28px;${isMulti ? 'flex-wrap:wrap' : ''};perspective:none">
            ${cardsHtml}
          </div>
        </div>
      </div>

      <div style="
        margin-top: 42px; font-size: 34px; font-weight: 900; letter-spacing: 2px;
        color: ${palette.c1}; text-shadow: 0 0 18px ${_rgba(palette.c1, 0.7)};
        text-align: center;
      ">我選了：${opinion.opts[chosenIdx]}</div>
      ${totalStr ? `<div style="
        margin-top: 10px; font-size: 20px; font-weight: 600;
        color: rgba(255,255,255,0.55); letter-spacing: 1.5px; text-align: center;
      ">${totalStr}</div>` : ''}
      ${badgesHtml}

      <div style="
        margin-top:auto; width:100%;
        display:flex; align-items:center; justify-content:space-between;
        padding-top:28px; border-top:1px solid rgba(255,255,255,0.12);
      ">
        <div style="display:flex;align-items:center;gap:22px">
          <div id="share-logo-wrap" style="
            width:92px;height:92px;border-radius:50%;overflow:hidden;
            border:2px solid rgba(255,255,255,0.28);flex:none;
            background:rgba(255,255,255,0.05);
            display:flex;align-items:center;justify-content:center;
          "></div>
          <div>
            <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:1px">Soccer麥迪</div>
            <div style="font-size:20px;color:rgba(255,255,255,0.6);margin-top:6px">${host}</div>
            <div style="font-size:17px;color:rgba(255,255,255,0.45);margin-top:6px">掃 QR 加入戰局 →</div>
          </div>
        </div>
        <div id="share-qr-wrap" style="
          background:#fff;padding:10px;border-radius:10px;
          display:flex;align-items:center;justify-content:center;
        "></div>
      </div>
    `;

    document.body.appendChild(wrapper);

    // 標題：用 canvas 畫漸層字（html2canvas 對 background-clip:text 支援不佳）
    const titleSlot = wrapper.querySelector('#share-title-slot');
    if (titleSlot) {
      titleSlot.appendChild(_makeVsBadge('VS', '#ff4757', 'rgba(255,71,87,0.12)'));
      titleSlot.appendChild(_makeGradientTitle('麥迪擂台'));
      titleSlot.appendChild(_makeVsBadge('VS', '#686de0', 'rgba(104,109,224,0.12)'));
    }

    // 類型標籤：同樣用 canvas 畫，避免 emoji/文字 baseline 跟底框跑掉
    const tagSlot = wrapper.querySelector('#share-tag-slot');
    if (tagSlot) {
      const tagColors = {
        trending: { bg: '#ff4757', fg: '#fff' },
        classic:  { bg: '#ffa502', fg: '#1a1a2e' },
        fun:      { bg: '#2ed573', fg: '#1a1a2e' },
        predict:  { bg: '#3742fa', fg: '#fff' },
      };
      const t = tagColors[opinion.type] || tagColors.classic;
      tagSlot.appendChild(_makeTagPill(tagText, t.bg, t.fg));
    }

    // Logo：用 async Image + drawImage 到 canvas，避免 html2canvas 拿 <img> 時的 CORS 問題
    const logoWrap = wrapper.querySelector('#share-logo-wrap');
    try {
      const logo = await _loadImage('img/logo-soccermaddy.png');
      const lc = document.createElement('canvas');
      lc.width = 92; lc.height = 92;
      const lctx = lc.getContext('2d');
      lctx.save();
      lctx.beginPath();
      lctx.arc(46, 46, 46, 0, Math.PI * 2);
      lctx.clip();
      lctx.drawImage(logo, 0, 0, 92, 92);
      lctx.restore();
      lc.style.cssText = 'width:92px;height:92px;display:block';
      logoWrap.appendChild(lc);
    } catch (e) {
      logoWrap.innerHTML = '<div style="font-size:34px;font-weight:900;color:#ffa502">M</div>';
    }

    // QR：用 canvas 直接畫（不依賴 html2canvas 去解析外部資源）
    const qrWrap = wrapper.querySelector('#share-qr-wrap');
    if (qrWrap && typeof window.qrcode === 'function') {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        const modules = qr.getModuleCount();
        const size = 140;
        const cell = size / modules;
        const qc = document.createElement('canvas');
        qc.width = size; qc.height = size;
        const qctx = qc.getContext('2d');
        qctx.fillStyle = '#fff';
        qctx.fillRect(0, 0, size, size);
        qctx.fillStyle = '#000';
        for (let r = 0; r < modules; r++) {
          for (let c = 0; c < modules; c++) {
            if (qr.isDark(r, c)) qctx.fillRect(c * cell, r * cell, cell, cell);
          }
        }
        qc.style.cssText = 'width:140px;height:140px;display:block';
        qrWrap.appendChild(qc);
      } catch (e) { console.warn('[opinion] QR 產生失敗', e); }
    }

    try {
      const canvas = await window.html2canvas(wrapper, {
        width: W, height: H,
        windowWidth: W, windowHeight: H,
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
      if (!blob) throw new Error('toBlob 回傳 null（canvas 仍被污染）');
      return blob;
    } finally {
      wrapper.remove();
    }
  }

  // 用 canvas 畫漸層「麥迪擂台」
  function _makeGradientTitle(text) {
    const dpr = 2;
    const fontSize = 72;
    const font = `900 ${fontSize}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
    // 先量測寬度
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    const letterSpacing = 8;
    const w = Math.ceil(meas.measureText(text).width + letterSpacing * (text.length - 1) + 40);
    const h = Math.ceil(fontSize * 1.35);

    const c = document.createElement('canvas');
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.cssText = `width:${w}px;height:${h}px;display:block`;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ff6b6b');
    grad.addColorStop(0.5, '#ffa502');
    grad.addColorStop(1, '#686de0');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255,165,2,0.35)';
    ctx.shadowBlur = 16;

    // 逐字繪製（支援 letter-spacing）
    let x = 20;
    for (const ch of text) {
      ctx.fillText(ch, x, h / 2);
      x += ctx.measureText(ch).width + letterSpacing;
    }
    return c;
  }

  // 用 canvas 畫類型標籤（圓角藥丸，emoji + 文字精準垂直置中）
  function _makeTagPill(text, bg, fg) {
    const dpr = 2;
    const fontSize = 22;
    const padX = 28, padY = 12;
    const font = `700 ${fontSize}px "Noto Sans TC","Segoe UI Emoji","Apple Color Emoji",sans-serif`;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    const letterSpacing = 2;
    const textW = meas.measureText(text).width + letterSpacing * Math.max(0, text.length - 1);
    const w = Math.ceil(textW + padX * 2);
    const h = Math.ceil(fontSize + padY * 2);

    const c = document.createElement('canvas');
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.cssText = `width:${w}px;height:${h}px;display:block`;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    // 藥丸底
    const r = h / 2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();

    // 文字（逐字畫以支援 letter-spacing 並且手動做 baseline 校正）
    ctx.font = font;
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let x = padX;
    for (const ch of text) {
      ctx.fillText(ch, x, h / 2 + 1);
      x += ctx.measureText(ch).width + letterSpacing;
    }
    return c;
  }

  // 用 canvas 畫 VS 徽章（不用 skew 動畫，乾淨呈現）
  function _makeVsBadge(text, color, bg) {
    const dpr = 2;
    const fontSize = 30;
    const padX = 14, padY = 6;
    const font = `900 ${fontSize}px "Noto Sans TC",sans-serif`;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    const textW = meas.measureText(text).width;
    const w = Math.ceil(textW + padX * 2);
    const h = Math.ceil(fontSize + padY * 2);

    const c = document.createElement('canvas');
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.cssText = `width:${w}px;height:${h}px;display:block`;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景 + 邊框
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, h, r);
    ctx.arcTo(w, h, 0, h, r);
    ctx.arcTo(0, h, 0, 0, r);
    ctx.arcTo(0, 0, w, 0, r);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    // 文字
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(text, w / 2, h / 2 + 1);
    return c;
  }

  function _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // 同源圖不加 crossOrigin；外部資源才需要
      if (/^https?:\/\//i.test(src) && !src.startsWith(location.origin)) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function _buildPollUrl(pollId) {
    const base = (location.origin && location.origin !== 'null' && !location.origin.startsWith('file:'))
      ? location.origin + '/' : 'https://soccermaddy.com/';
    return base + '?poll=' + encodeURIComponent(pollId);
  }

  function _rgba(hex, a) {
    const m = hex.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (!m) return hex;
    return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
  }

  /* ---------- 工具 ---------- */
  function _shortLabel(opt) {
    // 去掉 emoji，取前 6 字
    return opt.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().slice(0, 8);
  }

  // 把選項文字拆成 emoji + 純文字（emoji 顯示在卡片上方作為 icon）
  function _splitEmoji(opt) {
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{2B00}-\u{2BFF}]/gu;
    const emojis = opt.match(emojiRegex) || [];
    const text = opt.replace(emojiRegex, '').trim();
    return { emoji: emojis.join(''), text: text || opt };
  }

  function _closeOverlay(overlay, onClose) {
    overlay.classList.remove('open');
    document.body.classList.remove('opinion-open');
    _unsubscribeComments();
    _unsubscribeVotes();
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 400);
  }

  /* ---------- 擂台留言 ---------- */
  async function _initComments(opinion, chosenIdx, resultEl) {
    const listEl = resultEl.querySelector('#opinion-comments-list');
    const countEl = resultEl.querySelector('#opinion-comments-count');
    const input = resultEl.querySelector('#opinion-comment-input');
    const submitBtn = resultEl.querySelector('#opinion-comment-submit');
    const hintEl = resultEl.querySelector('#opinion-comment-hint');

    if (!window.DB) {
      countEl.textContent = '（未連線）';
      input.disabled = true; submitBtn.disabled = true;
      return;
    }

    // 已留言過 → 鎖定輸入框
    const commentedKey = STORAGE_COMMENT + opinion.id;
    const alreadyCommented = localStorage.getItem(commentedKey);
    if (alreadyCommented) {
      input.disabled = true;
      submitBtn.disabled = true;
      submitBtn.textContent = '已留言';
      input.placeholder = '每題只能留一則喔 👀';
    }

    // 提交
    submitBtn.addEventListener('click', async () => {
      const text = (input.value || '').trim();
      if (!text) { _setHint(hintEl, '留言不能空白', 'warn'); return; }
      if (text.length > MAX_COMMENT_LEN) {
        _setHint(hintEl, `最多 ${MAX_COMMENT_LEN} 字`, 'warn'); return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = '送出中…';
      try {
        const nickname = _resolveNickname();
        const { data, error } = await window.DB.from('opinion_comments').insert({
          opinion_id: opinion.id,
          side: chosenIdx,
          nickname,
          content: text,
        }).select().single();
        if (error) throw error;
        // 本機立即渲染（realtime 也會送同一筆，用 id 去重）
        _renderComment(listEl, data, opinion, chosenIdx, { prepend: true });
        _bumpCount(countEl, +1);
        localStorage.setItem(commentedKey, '1');
        _cleanOldKeys(STORAGE_COMMENT);
        input.value = '';
        input.disabled = true;
        submitBtn.textContent = '已留言';
        _setHint(hintEl, '已發佈 ✅', 'ok');
      } catch (err) {
        console.warn('[opinion] 留言失敗', err);
        submitBtn.disabled = false;
        submitBtn.textContent = '送出';
        _setHint(hintEl, '送出失敗：' + (err.message || err), 'warn');
      }
    });

    // Enter 送出
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing && !submitBtn.disabled) submitBtn.click();
    });

    // 載入現有留言
    try {
      const { data, error } = await window.DB
        .from('opinion_comments')
        .select('id,opinion_id,side,nickname,content,likes,created_at')
        .eq('opinion_id', opinion.id)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      listEl.innerHTML = '';
      if (!data || !data.length) {
        countEl.textContent = '搶頭香';
      } else {
        countEl.textContent = data.length + ' 則';
        data.forEach(c => _renderComment(listEl, c, opinion, chosenIdx));
      }
    } catch (err) {
      console.warn('[opinion] 載入留言失敗', err);
      countEl.textContent = '（載入失敗）';
    }

    // 訂閱新留言（realtime）
    _subscribeComments(opinion, chosenIdx, listEl, countEl);
  }

  function _subscribeComments(opinion, chosenIdx, listEl, countEl) {
    _unsubscribeComments();
    if (!window.DB || !window.DB.channel) return;
    try {
      _commentChannel = window.DB
        .channel('opinion-comments-' + opinion.id)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'opinion_comments', filter: `opinion_id=eq.${opinion.id}` },
          (payload) => {
            const row = payload.new;
            if (!row || row.deleted) return;
            _renderComment(listEl, row, opinion, chosenIdx, { prepend: true, dedupe: true });
            _bumpCount(countEl, +1);
          })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'opinion_comments', filter: `opinion_id=eq.${opinion.id}` },
          (payload) => {
            const row = payload.new;
            const node = listEl.querySelector(`[data-cid="${row.id}"]`);
            if (!node) return;
            if (row.deleted) {
              node.remove();
              _bumpCount(countEl, -1);
              return;
            }
            const likeBtn = node.querySelector('.opinion-comment-like');
            if (likeBtn) likeBtn.textContent = `👍 ${row.likes}`;
          })
        .subscribe();
    } catch (e) { console.warn('[opinion] 訂閱失敗', e); }
  }

  function _unsubscribeComments() {
    if (_commentChannel && window.DB && window.DB.removeChannel) {
      try { window.DB.removeChannel(_commentChannel); } catch (e) {}
    }
    _commentChannel = null;
  }

  function _renderComment(listEl, c, opinion, chosenIdx, opt) {
    opt = opt || {};
    if (!listEl) return;
    // 去重
    if (opt.dedupe && listEl.querySelector(`[data-cid="${c.id}"]`)) return;
    const mine = c.side === chosenIdx;
    const sideLabel = _shortLabel(opinion.opts[c.side] || '');
    const likedKey = STORAGE_LIKE + c.id;
    const alreadyLiked = !!localStorage.getItem(likedKey);
    const node = document.createElement('div');
    node.className = `opinion-comment opinion-comment--c${c.side}` + (mine ? ' opinion-comment--mine' : '');
    node.dataset.cid = c.id;
    node.innerHTML = `
      <div class="opinion-comment-head">
        <span class="opinion-comment-nick">${_escape(c.nickname || '匿名觀眾')}</span>
        <span class="opinion-comment-side">站「${_escape(sideLabel)}」</span>
        ${mine ? '<span class="opinion-comment-mine-tag">我</span>' : ''}
      </div>
      <div class="opinion-comment-body">${_escape(c.content)}</div>
      <div class="opinion-comment-foot">
        <button class="opinion-comment-like${alreadyLiked ? ' liked' : ''}" type="button">👍 ${c.likes || 0}</button>
        <span class="opinion-comment-time">${_relTime(c.created_at)}</span>
      </div>`;

    const likeBtn = node.querySelector('.opinion-comment-like');
    likeBtn.addEventListener('click', async () => {
      if (likeBtn.classList.contains('liked')) return;
      likeBtn.classList.add('liked');
      localStorage.setItem(likedKey, '1');
      _cleanOldKeys(STORAGE_LIKE);
      // 樂觀更新
      const m = likeBtn.textContent.match(/\d+/);
      const cur = m ? parseInt(m[0]) : 0;
      likeBtn.textContent = `👍 ${cur + 1}`;
      try {
        await window.DB.rpc('opinion_comment_like', { cid: c.id });
      } catch (e) { /* 忽略，realtime UPDATE 會同步計數 */ }
    });

    if (opt.prepend) listEl.insertBefore(node, listEl.firstChild);
    else listEl.appendChild(node);
  }

  function _resolveNickname() {
    // 優先使用登入 profile 暱稱
    try {
      if (typeof window.currentProfile === 'object' && window.currentProfile && window.currentProfile.nickname) {
        return String(window.currentProfile.nickname).slice(0, 20);
      }
    } catch (e) {}
    // 其次：本機匿名暱稱（穩定）
    let anon = localStorage.getItem('opinion_anon_nick');
    if (!anon) {
      const pool = ['路人甲','看球狼','PK魂','擂台客','熱血派','場邊記者','足球宅','替補中','VAR魔人','越位線'];
      anon = pool[Math.floor(Math.random() * pool.length)] + Math.floor(Math.random() * 90 + 10);
      localStorage.setItem('opinion_anon_nick', anon);
    }
    return anon;
  }

  function _setHint(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'opinion-comment-hint' + (kind ? ' ' + kind : '');
    if (kind !== 'warn') setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
  }

  function _bumpCount(countEl, delta) {
    if (!countEl) return;
    const m = (countEl.textContent || '').match(/\d+/);
    const cur = m ? parseInt(m[0]) : 0;
    const next = Math.max(0, cur + delta);
    countEl.textContent = next ? next + ' 則' : '搶頭香';
  }

  function _escape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function _relTime(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!t) return '';
    const diff = Date.now() - t;
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小時前';
    return Math.floor(diff / 86400000) + ' 天前';
  }

  function _cleanOldKeys(prefix) {
    const today = localDateStr();
    const todayKey = prefix + today;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k !== todayKey) localStorage.removeItem(k);
    }
  }

  /* ---------- 匯出 ---------- */
  window.showOpinionPoll = showOpinionPoll;
})();
