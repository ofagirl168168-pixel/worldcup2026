/* ====================================================================
   FRIEND-ROOM-OG-CLIENT.JS
   房主在瀏覽器即時 render OG 縮圖（1200×630）→ 上傳 Supabase Storage og-images/r/<CODE>.png
   為什麼：GHA cron 最快 5 分鐘，使用者建完房 30 秒內就會分享，社群會 cache 通用圖 7 天 → 永久錯版。
   這個 client-side render 在房主按下「建立」後立刻在他的 browser 跑，~1 秒就 ready。
   Render 失敗（CORS / 字型問題）會 silent fallback，function 會走後備靜態檔或通用圖。
   ==================================================================== */

(function () {
  'use strict';

  const W = 1200, H = 630;

  // 用相對路徑載 logo（同源）
  const LOGO_URL = '/img/logo-soccermaddy.png';
  let _logoCache = null;

  // 字型 fallback 鏈：盡量 match server 端用的微軟正黑感，行動裝置也有 PingFang / Noto
  const FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif';
  const FONT_BOLD = `bold ${FONT}`;

  function loadImage(url, useCors) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (useCors) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function getLogo() {
    if (_logoCache !== null) return _logoCache;
    try {
      _logoCache = await loadImage(LOGO_URL, false);
    } catch (e) {
      _logoCache = false;
    }
    return _logoCache;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fmtTaiwanTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (!isFinite(d)) return '';
    const tw = new Date(d.getTime() + 8 * 3600 * 1000);
    const m = String(tw.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(tw.getUTCDate()).padStart(2, '0');
    const hh = String(tw.getUTCHours()).padStart(2, '0');
    const mm = String(tw.getUTCMinutes()).padStart(2, '0');
    return `${m}/${dd} ${hh}:${mm}`;
  }

  // 把 home/away 隊徽透過自家 /cors-img proxy 載 → upstream 沒 CORS 也能畫到 canvas
  async function loadCrest(url) {
    if (!url || !/^https?:/.test(url)) return null;
    const proxied = `${location.origin}/cors-img?u=${encodeURIComponent(url)}`;
    try {
      return await loadImage(proxied, true);
    } catch (e) {
      // proxy 失敗（host 不在白名單 / upstream 503）就 skip 不畫 crest
      console.warn('[og-client] crest proxy fail (will skip)', url, e);
      return null;
    }
  }

  async function renderRoomOG(room) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const meta = room.match_meta || {};
    const home = String(meta.home_name || meta.home_code || '主隊');
    const away = String(meta.away_name || meta.away_code || '客隊');
    const roomName = String(room.room_name || (room.is_official ? '麥迪官方聯賽' : ''));
    const kickoff = fmtTaiwanTime(room.kickoff_at);
    const bet = room.bet_amount > 0 ? `押 ${room.bet_amount} 💎` : '純娛樂';

    // 背景漸變
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0a1230');
    grad.addColorStop(0.45, '#1a2c6a');
    grad.addColorStop(1, '#0e1430');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 角落金色光暈
    const glow1 = ctx.createRadialGradient(W * 0.85, 80, 0, W * 0.85, 80, 400);
    glow1.addColorStop(0, 'rgba(255,215,0,0.22)');
    glow1.addColorStop(1, 'rgba(255,215,0,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(80, H - 80, 0, 80, H - 80, 350);
    glow2.addColorStop(0, 'rgba(91,115,255,0.2)');
    glow2.addColorStop(1, 'rgba(91,115,255,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // 左上：logo + 麥迪挑戰賽
    const logo = await getLogo();
    let textX = 60;
    if (logo) {
      const logoSize = 64;
      const logoY = 80 - logoSize / 2 - 10;
      ctx.drawImage(logo, 60, logoY, logoSize, logoSize);
      textX = 60 + logoSize + 14;
    }
    ctx.font = `bold 32px ${FONT}`;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'left';
    ctx.fillText('麥迪挑戰賽', textX, 80);

    // 右上：房型 badge
    const badgeText = room.is_official ? '官方' : (room.is_public ? '公開' : '私人');
    const badgeColor = room.is_official ? '#ffd700' : (room.is_public ? '#6bd09e' : '#b8a4ff');
    ctx.font = `bold 22px ${FONT}`;
    const badgeW = ctx.measureText(badgeText).width + 36;
    const badgeX = W - 60 - badgeW;
    ctx.fillStyle = `${badgeColor}22`;
    roundRect(ctx, badgeX, 50, badgeW, 42, 21);
    ctx.fill();
    ctx.fillStyle = badgeColor;
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, badgeX + badgeW / 2, 79);

    // 房名
    if (roomName) {
      ctx.font = `bold 38px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      let title = roomName;
      if (ctx.measureText(title).width > W - 120) {
        while (title.length > 0 && ctx.measureText(title + '…').width > W - 120) title = title.slice(0, -1);
        title = title + '…';
      }
      ctx.fillText(title, 60, 140);
    }

    // 中央：兩隊隊徽 + 名稱 + VS（crest CORS fail 就 skip）
    const [homeCrest, awayCrest] = await Promise.all([
      loadCrest(meta.home_flag),
      loadCrest(meta.away_flag),
    ]);
    const cy = 320;
    const crestSize = 170;

    if (homeCrest) ctx.drawImage(homeCrest, W / 2 - 350 - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
    ctx.font = `bold 38px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    let homeText = home;
    while (homeText.length > 0 && ctx.measureText(homeText).width > 280) homeText = homeText.slice(0, -1);
    if (homeText.length < home.length) homeText = homeText.slice(0, -1) + '…';
    ctx.fillText(homeText, W / 2 - 350, cy + crestSize / 2 + 60);

    ctx.font = `bold 90px ${FONT}`;
    const vsGrad = ctx.createLinearGradient(W / 2 - 60, cy - 50, W / 2 + 60, cy + 50);
    vsGrad.addColorStop(0, '#ff5757');
    vsGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = vsGrad;
    ctx.fillText('VS', W / 2, cy + 30);

    if (awayCrest) ctx.drawImage(awayCrest, W / 2 + 350 - crestSize / 2, cy - crestSize / 2, crestSize, crestSize);
    ctx.font = `bold 38px ${FONT}`;
    ctx.fillStyle = '#fff';
    let awayText = away;
    while (awayText.length > 0 && ctx.measureText(awayText).width > 280) awayText = awayText.slice(0, -1);
    if (awayText.length < away.length) awayText = awayText.slice(0, -1) + '…';
    ctx.fillText(awayText, W / 2 + 350, cy + crestSize / 2 + 60);

    // 底部資訊條
    const footerY = H - 90;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, footerY - 30, W, 120);

    ctx.font = `500 26px ${FONT}`;
    ctx.textAlign = 'left';
    let statusText, statusColor;
    if (kickoff) {
      statusText = `⏱ ${kickoff} 同步開賽`;
      statusColor = '#fff';
    } else {
      statusText = '⏱ 開放報名中';
      statusColor = '#fff';
    }
    ctx.fillStyle = statusColor;
    ctx.fillText(statusText, 60, footerY + 12);

    ctx.fillStyle = room.bet_amount > 0 ? '#ffd700' : '#aaa';
    ctx.textAlign = 'right';
    ctx.fillText(bet, W - 60, footerY + 12);

    ctx.font = `400 16px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left';
    ctx.fillText(`#${room.room_code}`, 60, footerY + 50);

    // PNG 是無損格式，quality 參數會被忽略（瀏覽器 canvas.toBlob 不做進階壓縮 → 比 @napi-rs/canvas 大）
    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
  }

  async function uploadOG(roomCode, blob) {
    if (!window.DB) throw new Error('DB not ready');
    const { error } = await window.DB.storage
      .from('og-images')
      .upload(`r/${roomCode}.png`, blob, {
        upsert: true,
        contentType: 'image/png',
        cacheControl: '3600',
      });
    if (error) throw error;
  }

  // 給外部呼叫：build + upload，永遠 resolve（失敗只 warn 不 throw）
  async function generateAndUpload(room) {
    if (!room || !room.room_code) return false;
    const t0 = performance.now();
    try {
      const blob = await renderRoomOG(room);
      if (!blob) throw new Error('canvas.toBlob returned null');
      await uploadOG(room.room_code, blob);
      const ms = Math.round(performance.now() - t0);
      console.log(`[og-client] uploaded ${room.room_code} (${(blob.size / 1024).toFixed(1)}KB, ${ms}ms)`);
      return true;
    } catch (e) {
      console.warn('[og-client] failed (function 會 fallback)', e);
      return false;
    }
  }

  window.FriendRoomOGClient = { generateAndUpload };
})();
