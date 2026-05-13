/* =============================================
   PERSONA-QUIZ.JS — 球迷人格測驗
   13 題 → 10 型人格 → 翻牌揭曉 → 分享卡片
   ============================================= */
(function (global) {
  'use strict';

  const STORAGE_RESULT = 'persona_quiz_result';

  let _state = null;

  /* ---------- 對外：開啟測驗 ---------- */
  function openPersonaQuiz(opts) {
    opts = opts || {};
    if (document.getElementById('pq-overlay')) return;
    const data = global.PERSONA_DATA;
    if (!data || !data.PERSONAS || !data.QUESTIONS) {
      console.warn('[persona-quiz] PERSONA_DATA 未載入');
      return;
    }
    _state = {
      personas: data.PERSONAS,
      questions: data.QUESTIONS,
      answers: Array(data.QUESTIONS.length).fill(null),
      qIdx: 0,
      phase: 'intro',
      onClose: opts.onClose || null,
    };
    _render();
  }

  /* ---------- 建立 overlay DOM ---------- */
  function _render() {
    const overlay = document.createElement('div');
    overlay.className = 'pq-overlay';
    overlay.id = 'pq-overlay';
    overlay.innerHTML = `
      <div class="pq-bg"></div>
      <div class="pq-stars"></div>
      <button class="pq-close" aria-label="關閉">×</button>
      <div class="pq-container" id="pq-container"></div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('pq-open');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('open'));
    });

    overlay.querySelector('.pq-close').addEventListener('click', _close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) _close();
    });

    _renderPhase();
  }

  function _renderPhase() {
    const box = document.getElementById('pq-container');
    if (!box) return;
    if (_state.phase === 'intro') box.innerHTML = _introHtml();
    else if (_state.phase === 'quiz') box.innerHTML = _quizHtml();
    else if (_state.phase === 'result') box.innerHTML = _resultHtml();
    _bindPhaseEvents();
    const overlay = document.getElementById('pq-overlay');
    if (overlay) overlay.scrollTop = 0;
  }

  /* ---------- 介面：intro ---------- */
  function _introHtml() {
    const sampleIcons = ['a1-poker-hand', 'a3-public-speaker', 'a7-t-rex-skull', 'a10-crown'];
    const icons = sampleIcons.map(n =>
      `<img src="assets/personas/${n}.svg" alt="" class="pq-intro-icon" />`
    ).join('');
    return `
      <div class="pq-phase pq-phase-intro">
        <div class="pq-intro-icons">${icons}</div>
        <h1 class="pq-title">你是哪一型<br/>球迷？</h1>
        <p class="pq-subtitle">13 題 · 測出你的球迷人格</p>
        <div class="pq-intro-meta">
          <span>🎲 10 種人格類型</span>
          <span>⏱️ 約 2 分鐘</span>
          <span>✨ 結果可儲存分享</span>
        </div>
        <button class="pq-start-btn" id="pq-start">開始測驗</button>
        <p class="pq-intro-hint">僅供娛樂 · 結果不會外流</p>
      </div>
    `;
  }

  /* ---------- 介面：quiz ---------- */
  function _quizHtml() {
    const q = _state.questions[_state.qIdx];
    const total = _state.questions.length;
    const pct = ((_state.qIdx + 1) / total) * 100;
    const isBonus = q.weight && q.weight >= 2;
    return `
      <div class="pq-phase pq-phase-quiz">
        <div class="pq-progress">
          <div class="pq-progress-bar">
            <div class="pq-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="pq-progress-text">
            ${_state.qIdx + 1} / ${total}
            ${isBonus ? '<span class="pq-bonus-tag">身份宣告 ×2</span>' : ''}
          </div>
        </div>
        <div class="pq-q-card">
          <div class="pq-q-num">Q${_state.qIdx + 1}</div>
          <div class="pq-q-text">${q.text}</div>
          <div class="pq-opts">
            ${q.opts.map((opt, i) => `
              <button class="pq-opt" data-idx="${i}">
                <span class="pq-opt-label">${opt.label}</span>
                <span class="pq-opt-text">${opt.text}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="pq-nav">
          ${_state.qIdx > 0 ? '<button class="pq-back-btn" id="pq-back">← 上一題</button>' : '<span></span>'}
        </div>
      </div>
    `;
  }

  /* ---------- 介面：result ---------- */
  function _resultHtml() {
    const persona = _pickPersona();
    _state.resultPersona = persona;
    try {
      localStorage.setItem(STORAGE_RESULT, JSON.stringify({
        id: persona.id, ts: Date.now(),
      }));
    } catch (e) {}
    const matchP = _state.personas.find(p => p.id === persona.match.id);
    const conflictP = _state.personas.find(p => p.id === persona.conflict.id);
    _state.matchP = matchP;
    _state.conflictP = conflictP;
    return `
      <div class="pq-phase pq-phase-result">
        <div class="pq-result-header">
          <div class="pq-result-label">你的球迷人格是</div>
        </div>
        <div class="pq-flip" id="pq-flip" style="--persona-color:${persona.color}">
          <div class="pq-flip-inner">
            <div class="pq-flip-face pq-flip-face-back" id="pq-face-back">
              ${_mysteryFaceHtml()}
            </div>
            <div class="pq-flip-face pq-flip-face-front">
              ${_visualFaceHtml(persona)}
            </div>
          </div>
          <div class="pq-flip-sparkles" aria-hidden="true"></div>
        </div>
        <div class="pq-flip-hint" id="pq-flip-hint" style="opacity:0">
          <i class="fas fa-sync-alt"></i> 點擊卡片翻到背面看 DNA 光譜
        </div>
        <div class="pq-result-body" id="pq-result-body" style="display:none">
          <div class="pq-result-desc">${persona.description}</div>
          <div class="pq-result-meta">
            <div class="pq-meta-row">
              <span class="pq-meta-label">代表球星</span>
              <span class="pq-meta-val">${persona.player}</span>
            </div>
            <div class="pq-meta-row">
              <span class="pq-meta-label">經典場景</span>
              <span class="pq-meta-val">${persona.scene}</span>
            </div>
          </div>
          <div class="pq-pair-row">
            <div class="pq-pair pq-pair-match" style="--pair-color:${matchP.color}">
              <div class="pq-pair-header">
                <span class="pq-pair-tag">🤝 天作之合</span>
              </div>
              <div class="pq-pair-main">
                <img src="${matchP.icon}" alt="" class="pq-pair-icon" />
                <div>
                  <div class="pq-pair-name">${matchP.name}</div>
                  <div class="pq-pair-reason">${persona.match.reason}</div>
                </div>
              </div>
            </div>
            <div class="pq-pair pq-pair-conflict" style="--pair-color:${conflictP.color}">
              <div class="pq-pair-header">
                <span class="pq-pair-tag">⚔️ 八字不合</span>
              </div>
              <div class="pq-pair-main">
                <img src="${conflictP.icon}" alt="" class="pq-pair-icon" />
                <div>
                  <div class="pq-pair-name">${conflictP.name}</div>
                  <div class="pq-pair-reason">${persona.conflict.reason}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="pq-result-actions">
            <button class="pq-btn pq-btn-primary" id="pq-share">
              <i class="fas fa-download"></i> 儲存分享圖
            </button>
            <button class="pq-btn pq-btn-secondary" id="pq-retry">
              <i class="fas fa-redo"></i> 重新測驗
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* ---------- 神秘背面（未揭曉） ---------- */
  function _mysteryFaceHtml() {
    return `
      <div class="pq-mystery">
        <div class="pq-mystery-pattern"></div>
        <div class="pq-mystery-inner">
          <span class="pq-mystery-q">?</span>
          <span class="pq-mystery-hint">點一下揭曉</span>
        </div>
      </div>
    `;
  }

  /* ---------- 正面：視覺人格卡（分享圖也用這個） ---------- */
  function _visualFaceHtml(persona) {
    const nameHtml = persona.name.split('').map((ch, i) =>
      `<span class="pq-pcard-letter" style="--li:${i}">${ch}</span>`
    ).join('');
    return `
      <div class="pq-pcard pq-pcard--visual" style="--persona-color:${persona.color}">
        <div class="pq-pcard-frame">
          <span class="pq-pcard-corner tl"></span>
          <span class="pq-pcard-corner tr"></span>
          <span class="pq-pcard-corner bl"></span>
          <span class="pq-pcard-corner br"></span>
        </div>
        <div class="pq-pcard-idtag">${persona.id}</div>
        <div class="pq-pcard-icon-wrap">
          <div class="pq-pcard-icon-glow"></div>
          <img src="${persona.icon}" alt="${persona.name}" class="pq-pcard-icon" />
        </div>
        <div class="pq-pcard-name">${nameHtml}</div>
        <div class="pq-pcard-tagline">「${persona.tagline}」</div>
        <div class="pq-pcard-rarity-row">
          <div class="pq-pcard-rarity-label">稀有度</div>
          <div class="pq-pcard-rarity-bar">
            <div class="pq-pcard-rarity-fill" data-pct="${persona.rarity}" style="width:0%"></div>
          </div>
          <div class="pq-pcard-rarity-val" data-target="${persona.rarity}">0%</div>
        </div>
        <div class="pq-pcard-brand">
          <i class="fas fa-futbol"></i> soccermaddy.com
        </div>
      </div>
    `;
  }

  /* ---------- 背面：人格 DNA 光譜 + 會員卡簽章 ---------- */
  function _spectrumFaceHtml(persona) {
    const scores = _state.scores || {};
    const maxScore = Math.max(1, ...Object.values(scores));
    const cardNum = _generateCardNumber(persona);
    const d = new Date();
    const dateStr =
      d.getFullYear() + '.' +
      String(d.getMonth() + 1).padStart(2, '0') + '.' +
      String(d.getDate()).padStart(2, '0');
    const barsHtml = _state.personas.map(p => {
      const s = scores[p.id] || 0;
      const pct = Math.round((s / maxScore) * 100);
      const isWinner = p.id === persona.id;
      return `
        <div class="pq-spec-row ${isWinner ? 'is-winner' : ''}">
          <div class="pq-spec-label-col">
            <span class="pq-spec-id">${p.id}</span>
            <span class="pq-spec-name">${p.name}</span>
          </div>
          <div class="pq-spec-bar">
            <div class="pq-spec-fill" style="--bar-color:${p.color};width:${pct}%"></div>
          </div>
          <div class="pq-spec-val">${s}</div>
        </div>
      `;
    }).join('');
    return `
      <div class="pq-pcard pq-pcard--spectrum" style="--persona-color:${persona.color}">
        <div class="pq-pcard-frame">
          <span class="pq-pcard-corner tl"></span>
          <span class="pq-pcard-corner tr"></span>
          <span class="pq-pcard-corner bl"></span>
          <span class="pq-pcard-corner br"></span>
        </div>
        <div class="pq-spec-head">
          <div class="pq-spec-head-title">PERSONALITY DNA</div>
          <div class="pq-spec-head-sub">人格光譜 · 13 題分析</div>
        </div>
        <div class="pq-spec-bars">${barsHtml}</div>
        <div class="pq-spec-cert">
          <div class="pq-spec-cert-row">
            <div>
              <div class="pq-cert-label">NO.</div>
              <div class="pq-cert-val">${cardNum}</div>
            </div>
            <div>
              <div class="pq-cert-label">DATE</div>
              <div class="pq-cert-val">${dateStr}</div>
            </div>
          </div>
          <div class="pq-spec-cert-sig">
            <span>CERTIFIED FAN</span>
            <span class="pq-cert-stamp">⚽</span>
          </div>
        </div>
      </div>
    `;
  }

  function _generateCardNumber(persona) {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `${persona.id}-${yy}${mm}${dd}-${rand}`;
  }

  /* ---------- 計分選出最匹配人格 ---------- */
  function _pickPersona() {
    const scores = {};
    _state.personas.forEach(p => { scores[p.id] = 0; });
    _state.answers.forEach((optIdx, qIdx) => {
      if (optIdx === null || optIdx === undefined) return;
      const q = _state.questions[qIdx];
      const opt = q.opts[optIdx];
      if (!opt || !opt.w) return;
      Object.entries(opt.w).forEach(([pid, w]) => {
        if (scores[pid] !== undefined) scores[pid] += w;
      });
    });
    _state.scores = scores;
    const sorted = Object.entries(scores).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const ra = _state.personas.find(p => p.id === a[0]).rarity;
      const rb = _state.personas.find(p => p.id === b[0]).rarity;
      return ra - rb;
    });
    const winId = sorted[0][0];
    return _state.personas.find(p => p.id === winId);
  }

  /* ---------- 綁定每個 phase 的事件 ---------- */
  function _bindPhaseEvents() {
    const overlay = document.getElementById('pq-overlay');
    if (!overlay) return;

    if (_state.phase === 'intro') {
      const btn = overlay.querySelector('#pq-start');
      if (btn) btn.addEventListener('click', () => {
        _state.phase = 'quiz';
        _renderPhase();
      });
    }

    if (_state.phase === 'quiz') {
      overlay.querySelectorAll('.pq-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          _state.answers[_state.qIdx] = idx;
          btn.classList.add('selected');
          setTimeout(() => {
            if (_state.qIdx + 1 >= _state.questions.length) {
              _state.phase = 'result';
            } else {
              _state.qIdx++;
            }
            _renderPhase();
          }, 220);
        });
      });
      const back = overlay.querySelector('#pq-back');
      if (back) back.addEventListener('click', () => {
        if (_state.qIdx > 0) {
          _state.qIdx--;
          _renderPhase();
        }
      });
    }

    if (_state.phase === 'result') {
      _state.flipState = 0; // 0=神秘, 1=視覺, 2=DNA光譜
      const flip = overlay.querySelector('#pq-flip');
      const faceBack = overlay.querySelector('#pq-face-back');
      const hint = overlay.querySelector('#pq-flip-hint');
      const body = overlay.querySelector('#pq-result-body');

      if (flip) flip.addEventListener('click', e => {
        if (e.target.closest('.pq-btn')) return;
        const s = _state.flipState;
        if (s === 0) {
          // 神秘 → 視覺：整張卡翻到 front
          flip.classList.add('flipped');
          flip.classList.add('bursting');
          _state.flipState = 1;
          setTimeout(() => flip.classList.remove('bursting'), 900);
          // 翻完後啟動正面進場動畫
          setTimeout(() => {
            const front = flip.querySelector('.pq-pcard--visual');
            if (front) {
              front.classList.add('animate');
              _animateRarity(front);
            }
          }, 350);
          // 背面內容：翻到 front 之後，把 back face 換成 DNA 光譜，等下次翻回來用
          setTimeout(() => {
            if (faceBack) faceBack.innerHTML = _spectrumFaceHtml(_state.resultPersona);
          }, 500);
          // 頁面下方描述 + 按鈕一起浮現
          setTimeout(() => {
            if (hint) { hint.style.opacity = ''; hint.classList.add('show'); }
            if (body) {
              body.style.display = '';
              requestAnimationFrame(() => body.classList.add('show'));
            }
          }, 1700);
        } else if (s === 1) {
          // 視覺 → DNA 光譜：翻回 back face，並觸發長條進場
          flip.classList.remove('flipped');
          _state.flipState = 2;
          setTimeout(() => {
            const spec = faceBack && faceBack.querySelector('.pq-pcard--spectrum');
            if (spec) spec.classList.add('animate');
          }, 400);
        } else {
          // DNA → 視覺：翻回 front
          flip.classList.add('flipped');
          _state.flipState = 1;
        }
      });

      // 按鈕在 body 裡（不是浮在 flip 下方），不需要 stopPropagation
      const share = overlay.querySelector('#pq-share');
      if (share) share.addEventListener('click', _generateShareCard);
      const retry = overlay.querySelector('#pq-retry');
      if (retry) retry.addEventListener('click', () => {
        _state.answers = Array(_state.questions.length).fill(null);
        _state.qIdx = 0;
        _state.phase = 'intro';
        _renderPhase();
      });
    }
  }

  /* ---------- 稀有度條從 0 爬升 + 數字計數 ---------- */
  function _animateRarity(front) {
    const fill = front.querySelector('.pq-pcard-rarity-fill');
    const val = front.querySelector('.pq-pcard-rarity-val');
    if (!fill || !val) return;
    const target = parseInt(val.dataset.target) || 0;
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(target * eased);
      fill.style.width = (cur * 5) + '%';           // 視覺放大（稀有度 20% 對應條滿）
      if (parseFloat(fill.style.width) > 100) fill.style.width = '100%';
      val.textContent = cur + '%';
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 產生可下載的分享圖（html2canvas） ---------- */
  async function _generateShareCard() {
    const persona = _state.resultPersona;
    if (!persona) return;
    if (typeof html2canvas === 'undefined') {
      alert('分享圖套件未載入，請重新整理後再試');
      return;
    }
    const btn = document.getElementById('pq-share');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 產生中…'; }

    const host = document.createElement('div');
    host.className = 'pq-share-host';
    host.innerHTML = `
      <div class="pq-share-card" style="--persona-color:${persona.color}">
        <div class="pq-share-brand">
          <span>SOCCER麥迪</span>
          <span>· 球迷人格測驗 ·</span>
        </div>
        ${_visualFaceHtml(persona)}
        <div class="pq-share-footer">
          <div class="pq-share-match">
            天作之合：${_state.personas.find(p => p.id === persona.match.id).name}
          </div>
          <div class="pq-share-site">worldcup2026-9u0.pages.dev</div>
        </div>
      </div>`;
    document.body.appendChild(host);

    // 讓 share host 的稀有度條呈現最終值（不跑動畫）
    const shareFill = host.querySelector('.pq-pcard-rarity-fill');
    const shareVal = host.querySelector('.pq-pcard-rarity-val');
    if (shareFill && shareVal) {
      const pct = parseInt(shareVal.dataset.target) || 0;
      shareFill.style.width = Math.min(100, pct * 5) + '%';
      shareVal.textContent = pct + '%';
    }
    // 字母逐字動畫在分享圖不需要 → 直接顯示
    host.querySelectorAll('.pq-pcard-letter').forEach(s => { s.style.opacity = '1'; s.style.transform = 'none'; });

    try {
      const card = host.querySelector('.pq-share-card');
      const canvas = await html2canvas(card, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement('a');
      a.download = `persona-${persona.id}-${persona.name}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch (e) {
      console.error('[persona-quiz] 分享圖產生失敗', e);
      alert('分享圖產生失敗，請再試一次');
    } finally {
      host.remove();
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> 儲存分享圖'; }
    }
  }

  /* ---------- 關閉 overlay ---------- */
  function _close() {
    const overlay = document.getElementById('pq-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('pq-open');
    setTimeout(() => {
      overlay.remove();
      if (_state && _state.onClose) _state.onClose();
      _state = null;
    }, 280);
  }

  global.openPersonaQuiz = openPersonaQuiz;
})(window);
