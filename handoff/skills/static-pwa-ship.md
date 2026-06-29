---
name: static-pwa-ship
description: >-
  「無建置 static PWA」的上線把關一條龍——驗證內嵌 JS 能 parse、確認改了殼層就 bump Service Worker 版本、
  資料/資產健檢、再給部署提醒。專治這類專案最常重犯的雷：改了 index.html 卻忘了 bump SW，
  害已安裝 PWA 的使用者卡在舊殼層。當使用者說「上線前檢查 / ship / 部署前把關 / 忘了 bump SW /
  PWA 看不到新版 / 單檔網頁要上線 / 純靜態 PWA 部署」時使用。補上 deploy-aware / ship-game-online /
  pre-push-guard / game-smoke-test（那些偏 npm/vite 建置）沒涵蓋的「無 build、單一 HTML」路線。
  活範例：多譯本聖經查詢（summer09201017-cloud/8biblesearch，push main→Netlify 自動部署，sw.js=bible-multi-vN）。
---

# static-pwa-ship — 無建置 static PWA 上線把關（跨專案）

很多專案是「**單一 static HTML + Service Worker + 資料檔，無建置步驟**」（PWA），
push 到 Git 就自動部署（Netlify/GitHub Pages）。它們的頭號雷是：
**改了 `index.html`／manifest／icons 卻忘了 bump SW 的 cache 版本號 → 已安裝的人卡在舊殼層**。
這個 skill 把「上線前該做的事」變成一條龍，**只回報與必要小修（bump SW），不自行 commit/push**。

## 適用前提（先確認是這類專案）
- 有 `index.html`（前端多半內嵌在 `<script>`），且**沒有** build step（無 vite/webpack/tsc 產物）。
- 有 Service Worker（`sw.js` / `service-worker.js`），裡面有一個 `CACHE_NAME`/版本字串。
- 部署＝push 到某分支由平台自動上線（或手動 deploy）。
> 若是 npm/vite 建置型遊戲，請改用 [[deploy-aware]] / [[ship-game-online]] / [[game-smoke-test]]。

## 步驟

1. **驗證內嵌 JS 能 parse**（取代手動）：
   ```bash
   node -e "const fs=require('fs'),m=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log('JS OK')"
   ```
   - 多個 `<script>` 區塊時，逐塊 match 驗證。失敗 → 🔴 標出錯誤、停止，先修語法。

2. **判斷 SW 是否需要 bump**：
   - `git status --short` / `git diff --stat` 看自上次 commit 起，殼層檔（`index.html`、manifest、`icons/`、`vendor/`、CSS）有沒有改。
   - 找 SW 裡的版本字串（常見 `const CACHE_NAME = '<prefix>-vN'`）。
   - 殼層有改但版本沒 +1 → 🔴 **直接幫忙把 N+1**（edit SW）。殼層沒動 → 🟢 不需 bump。
   - 找不到版本字串 → 🟡 提醒：SW 沒有版本化策略，更新可能不會生效。

3. **資料／資產健檢**：列出 `data/`（或資料夾）內預期檔案是否存在且非 0 byte；缺檔 → 🟡 警告（該功能會空白）。SW 的 SHELL 預快取清單裡的檔案是否都存在。

4. **回報 + 下一步**：用紅綠燈條列「改了哪些檔 / SW 版本 / 可否安全 push」。要部署時提醒：
   ```
   git add -A && git commit -m "..."  &&  git push        # push 觸發自動部署
   ```

## 鐵則
- **不自行 commit/push**，除非使用者明講；只做必要小修（bump SW）。
- bump SW 是「只要殼層有改就一定要做」的硬規則，不是選配——這是這類專案最常見的線上事故。
- 不確定的部署方式/網址：讀 README/DEPLOY 既有事實，讀不到標「(待確認)」，別編。

## 落地成專案指令／hook（建議）
- 在該 repo 放一個 `.claude/commands/ship.md`，內容就是上面步驟（換成該專案的檔名/版本前綴）。
- 放一個 PostToolUse hook：改到 `index.html` 就提醒 bump SW（match `"file_path"[^,]*index\.html`）。
- 進階：git pre-push hook 跑步驟 1+2 擋壞版（見 [[pre-push-guard]]）。

## 相關
[[deploy-aware]]（建置型遊戲的部署地圖）、[[ship-game-online]]（第一次上架）、[[pre-push-guard]]（push 前閘門）、
[[classroom-game-deploy]]（離線/投影交付）、[[pwa-install-button]]（安裝鈕）。
