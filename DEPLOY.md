# 部署到 GitHub + Netlify

## 一、GitHub

1. 到 [github.com/new](https://github.com/new) 建立新儲存庫（例如 `bible-multi`），**不要**勾選加入 README（本機已有檔案）。
2. 在本專案資料夾開啟終端機，執行（請改成你的帳號與 repo 名）：

```bash
git init
git add .
git commit -m "Initial: 多譯本聖經查詢 + PWA"
git branch -M main
git remote add origin https://github.com/你的帳號/你的repo.git
git push -u origin main
```

> **備註**：`data/*.json` 約十幾 MB，若不想放 GitHub，可改 `.gitignore` 忽略 `data/`，並在 Netlify 用「建置時下載」或改放外部儲存；目前預設與網站一起發布最簡單。

## 二、Netlify

1. 登入 [Netlify](https://www.netlify.com/) → **Add new site** → **Import an existing project**。
2. 連結 **GitHub**，選剛推送的 repo。
3. 建置設定：
   - **Build command**：留空（純靜態）。
   - **Publish directory**：`.`（點，代表 repo 根目錄；本專案已含 `netlify.toml` 會自動套用）。
4. 部署完成後，網址會是 `https://xxx.netlify.app`，已自動 **HTTPS**，PWA 與 Service Worker 可正常運作。

## 三、PWA 安裝（手機）

- **Android Chrome**：開啟網站 → 選單「加到主畫面」或依提示安裝。
- **iOS Safari**：分享 → **加入主畫面**。
- 安裝後會以 **standalone** 開啟，較像 App；**ESV** 仍須網路（信望愛 API）；四個本地 JSON 譯本在曾載入過後可由 SW 快取離線閱讀。

## 四、更新網站

推送 commit 到 `main` 後，Netlify 會自動重新部署。若 SW 有改版，已註冊 `sw.js` 的訪客會在下次開啟時更新。
