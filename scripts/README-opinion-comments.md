# 麥迪擂台 留言審核機器人

前端留言寫進 Supabase `opinion_comments`，這支腳本用 Telegram 通知你並讓你手機上直接刪除。

## 一次性設定

### 1. 套用資料庫 migration

到 Supabase Dashboard → SQL Editor，貼上並執行：
```
supabase/migrations/add_opinion_comments.sql
```

或 CLI：
```bash
supabase db push
```

這會建立 `opinion_comments` 表、RLS 政策、`opinion_comment_like` RPC，以及 realtime publication。

### 2. 取得 service_role key

Supabase Dashboard → Project Settings → API → `service_role` secret（注意**不是** anon key）。
⚠️ 這把金鑰能繞過 RLS，**絕對不可**放到前端或 git。

### 3. 寫入 `scripts/.env.local`

```
MADDY_BOT_TOKEN=<bot token>
MADDY_CHAT_ID=<你的 chat id>
SUPABASE_URL=https://dwlngkspwtcsnacbsgct.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

（前兩個若已存在就不用動）

## 啟動

```bash
node scripts/opinion-comments-bot.js
```

跑起來後：
- 會先傳一則「🤖 機器人已啟動」到你的 Telegram
- 每 15 秒輪詢一次 Supabase，有新留言就推播過來
- 每則訊息附兩顆按鈕：
  - 🗑️ **刪除** → `deleted = true`（前端 realtime 會立刻移除）
  - ✅ **保留** → 只標記已審核，不動資料庫

想停：Ctrl+C。

## 小細節

- `scripts/.comments-cursor` 記錄最後看過的時間戳，重啟不會重送舊留言（該檔已在 `.gitignore`，不會誤推）。
- 要「重新推一遍最近的留言」：刪掉 `.comments-cursor` 重跑即可。
- 若要長期背景執行，考慮用 pm2 / nssm / systemd。

## 故障排除

| 症狀 | 可能原因 |
|------|---------|
| 啟動就 `缺少 SUPABASE_URL` | `.env.local` 沒寫或拼錯欄位名 |
| `Supabase 401 / invalid JWT` | service_role key 貼錯，或多了空白 |
| 新留言沒推過來 | 檢查 `opinion_comments` 表是否成功建立、deleted 欄位是否為 false |
| 按刪除後前端沒有消失 | 檢查 `ALTER PUBLICATION supabase_realtime ADD TABLE opinion_comments` 是否有跑過 |
