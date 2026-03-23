# 部署到 GitHub + Netlify

## 零、上傳前檢查清單

| 步驟 | 說明 |
|------|------|
| 1 | 確認 `data/` 內已有要上線的 `*.json`（至少含預設譯本：如 unv、esv、ncv、lcc、web 等；缺檔時網頁該譯本會空白） |
| 2 | **不要**提交 `.env`、API 金鑰；`data/_tmp*.json` 已列入 `.gitignore` |
| 3 | 在專案根目錄提交並推送（PowerShell 範例見下） |
| 4 | 到 GitHub **New repository** 建立空儲存庫（不要加 README） |
| 5 | Netlify：**Add new project** → **Import** → 選 GitHub 上的 repo → **Publish directory** 為 **`.`**（與 `netlify.toml` 一致） |

**PowerShell 推送範例**（請改成你的 repo 網址；若已 `git init` 過可略過該行）：

```powershell
cd "你的專案路徑\聖經查詢CUR"
git status
git add .
git commit -m "Deploy: 多譯本聖經查詢 PWA"
# 若尚未連結遠端：
# git remote add origin https://github.com/你的帳號/你的repo.git
git branch -M main
git push -u origin main
```

> **儲存庫體積**：`data/*.json` 合計可能達數十 MB，屬正常；若不想放 GitHub，可改 `.gitignore` 忽略整個 `data/`，並改用自己主機或建置腳本在 Netlify 建置時下載（需自行撰寫 build command）。

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

> **備註**：`data/*.json`（含 `lcc.json`、`esv.json`、`niv.json` 等）體積較大，若不想放 GitHub，可改 `.gitignore` 忽略 `data/`，並在 Netlify 用「建置時下載」或改放外部儲存；目前預設與網站一起發布最簡單。  
> **英文欄（`data/niv.json`）**（擇一，皆寫入同一檔名供網頁載入）  
> - **正版 NIV（推薦）**：至 [API.Bible](https://scripture.api.bible) 註冊取得 **`API_BIBLE_KEY`**，遵守其 [條款](https://api.bible/terms)。在專案根目錄執行：  
>   `PowerShell: $env:API_BIBLE_KEY="你的金鑰"; node fetch_niv_apibible.js`  
>   整本約 **1189 次**章節 API，請確認免費額度；必要時設定 `API_BIBLE_ID`（後台顯示的聖經 ID）。若 API 回傳的章節文字格式與預期不同，節號解析可能需微調腳本。  
> - **公版備援（非 NIV）**：無金鑰時可執行 `node fetch_niv_legal.js`，自 [thiagobodruk/bible](https://github.com/thiagobodruk/bible) 下載 **BBE**（Bible in Basic English）轉成 `niv.json`（介面仍顯示「NIV」時，實際為 BBE，請自行在教會內說明）。  
> `download_bible.js`（信望愛）**不含**此檔。  
> **離線資料**：在專案根目錄執行 `node download_bible.js`，會自 `https://bible.fhl.net/json/qb.php` 逐章下載 **unv、ncv、kjv、asv、lcc、esv、web、bbe**（`web.json`＝World English Bible，`bbe.json`＝Bible in Basic English；已存在且檔案夠大會跳過，刪除該檔可強制重下）。  
> **背景下載**：在 PowerShell 執行 `.\start-download.ps1`，進度寫入 `download.log`（勿同時開兩個下載，以免寫入同一檔案）。

## 二、Netlify

1. 登入 [Netlify](https://app.netlify.com/)，進入團隊的 **Projects** 頁面。
2. 點右上角青綠色按鈕 **Add new project**（新版介面已把舊版的「Add new site」改成這個名稱，功能相同）。
3. 在選單中選 **Import an existing project**（從 Git 匯入）。
4. 連結 **GitHub** 並授權後，選剛推送的 repo。
5. 建置設定：
   - **Build command**：留空（純靜態）。
   - **Publish directory**：`.`（點，代表 repo 根目錄；本專案已含 `netlify.toml` 會自動套用）。
6. 部署完成後，網址會是 `https://xxx.netlify.app`，已自動 **HTTPS**，PWA 與 Service Worker 可正常運作。

## 三、PWA 安裝（手機）

- 頁首 **「📲 安裝 App」**：在支援的瀏覽器（多為 Android Chrome／桌面 Chrome）會於可安裝時出現；iPhone／iPad 請依頁面提示用 Safari **分享 → 加入主畫面**。
- **Android Chrome**：亦可從選單「加到主畫面」安裝。
- 安裝後會以 **standalone** 開啟，較像 App；經文僅讀本地 JSON，**不需網路**；曾載入過的 `data/*.json` 可由 Service Worker 快取離線使用。

## 關鍵字搜尋：勾選、複製、分享

- 搜尋結果左側可**勾選**經節；**複製勾選經文**會依目前勾選的譯本（上方「顯示譯本」）輸出純文字。
- **LINE 分享**／**Email 分享**會帶入查詢摘要與勾選經文（LINE 網址長度有限，勾選過多時請改複製）。

## 四、更新網站

推送 commit 到 `main` 後，Netlify 會自動重新部署。若 SW 有改版，已註冊 `sw.js` 的訪客會在下次開啟時更新。
