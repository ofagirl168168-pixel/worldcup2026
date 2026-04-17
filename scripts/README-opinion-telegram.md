# 麥迪擂台 Telegram 題目確認流程

## 每日使用方法

1. **Claude 產生候選題**
   Claude 跑每日更新時會 WebSearch 當日熱門新聞，產生 3~5 道候選題，寫入 `scripts/opinion-candidates.json`

2. **執行腳本**
   ```bash
   node scripts/opinion-telegram.js scripts/opinion-candidates.json
   ```

3. **Telegram 操作**
   @maddy_arena_bot 會傳第 1 題給你，附三個按鈕：
   - ✅ **使用這題** → 寫入 [js/data-opinions.js](../js/data-opinions.js) 並結束
   - ➡️ **換下一題** → 傳下一道候選題
   - ❌ **全部取消** → 不加入任何題目，結束

4. **commit & push**
   腳本只負責寫檔，你自己決定何時 push。

## Bot 資訊

- Bot: [@maddy_arena_bot](https://t.me/maddy_arena_bot) (顯示名稱「麥迪擂台」)
- Token 存在 `scripts/.env.local`（gitignore）

## 候選題 JSON 格式

```json
[
  {
    "id": "op-YYYYMMDD",
    "date": "YYYY-MM-DD",
    "type": "trending|classic|fun|predict",
    "q": "題目文字",
    "opts": ["選項1 🔥", "選項2 💪"],
    "context": "背景說明（選填）"
  }
]
```

- `opts` 可 2~4 個
- `type` 會影響標籤顏色與文字
- `date` 讓題目在特定日期出現（getTodayOpinion 會優先拿日期匹配的）

## 翻題流程

1. 開場給你「時事候選」（來自 JSON）
2. 翻完時事 → 自動接「🌟 永恆題庫」的所有 classic 題
3. 翻完全部 → 循環回第 1 題

## 跨日自動採用

按鈕永遠保留，直到你按 ✅ 或 ❌。若到**本日 23:59:59** 都沒反應，腳本會：
1. 傳一則「⏰ 時間已到」通知
2. 自動把 **候選 JSON 第 1 題** 寫入 `js/data-opinions.js`
3. 結束

## 疑難排解

**getUpdates 一直拿不到 callback**
確認 `@maddy_arena_bot` 沒被其他程式佔用（Telegram Bot API 一個 token 同時只能一個 getUpdates 讀取者）

**訊息收不到**
先在 Telegram 裡對 `@maddy_arena_bot` 傳 `/start`

**想改 bot 或帳號**
編輯 `scripts/.env.local` 的 `MADDY_BOT_TOKEN` 和 `MADDY_CHAT_ID`
