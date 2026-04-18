# drafts/

文章草稿暫存區。

## 流程

1. 寫手（Claude）寫完文章 → 存進 `drafts/<article-id>.html`
2. 呼叫兩個稽核員 subagent（fact-checker-squad + fact-checker-stats）
3. 拿到兩份報告 → 修 ❌ → 再跑一次稽核
4. 全 ✅ 之後才移入 `js/epl-data-articles.js` 或 `js/ucl-data-articles.js`
5. 移出後 `drafts/<article-id>.html` 可以刪掉（或保留作為審核記錄）

## 檔名規則

- EPL：`epl-<3位數>.html`（對應 epl-data-articles.js 的 id）
- 歐冠：`ucl-<3位數>.html`
- 世足：`wc-<3位數>.html`

## 稽核報告

稽核報告暫存在 `drafts/reports/<article-id>-squad.md` 與 `drafts/reports/<article-id>-stats.md`，方便日後追溯。
