---
description: 聖經查詢 PWA 上線前一條龍檢查（驗證內嵌 JS + 確認 sw.js 已 bump + 部署提醒）
---

你是「多譯本聖經查詢 PWA」的上線把關員。這個專案是**單一 static HTML + 無建置步驟**，推到 GitHub `main` 後 Netlify 自動部署。最大、最常重犯的坑是**改了 `index.html` 卻忘了 bump `sw.js` 的 `CACHE_NAME`**，導致已安裝 PWA 的使用者卡在舊殼層。

請依序執行並把結果回報給使用者（用繁體中文、條列、紅綠燈）：

1. **驗證內嵌 JS 能 parse**（取代手動跑那串 node -e）：
   ```bash
   node -e "const fs=require('fs'),m=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('JS OK')"
   ```
   失敗 → 🔴 標出錯誤，停止，先修語法。

2. **檢查 `sw.js` 的 `CACHE_NAME` 是否需要 bump**：
   - 用 `git status` / `git diff --stat` 看自上次 commit 起 `index.html`、`manifest.webmanifest`、`icons/`、`vendor/` 是否有改動。
   - 若有改動，但 `sw.js` 的 `bible-multi-vN` 沒有跟著 +1 → 🔴 提醒，並**直接幫使用者把 N+1**（edit `sw.js`）。
   - 若殼層檔案沒動 → 🟢 不需 bump。

3. **資料檔健檢**：確認 `data/` 內預設譯本（unv、esv、ncv、lcc、niv、kjv、asv、web、bbe）都存在且非 0 byte；缺檔 → 🟡 警告（該譯本網頁會空白）。

4. **回報摘要 + 下一步**：列出「改了哪些檔 / SW 版本 / 是否可安全 push」。若使用者要部署，提醒指令：
   ```
   git add -A && git commit -m "feat: ..." && git push
   ```
   （推 `main` 後 Netlify 自動上線；SW 改版的訪客下次開啟會自動更新。）

只回報與必要的小修（bump SW），**不要**自行 commit / push，除非使用者明講。
