# Google Drive 同步設定指南

本文件說明如何啟用「雲端同步 (Google Drive)」功能。**只有開發者需要做一次**——使用者不需要任何設定，登入 Google 帳號即可使用。

---

## ⏱️ 預計時間：15–20 分鐘

## 🎯 你會做什麼

1. 在 Google Cloud Console 建立一個專案
2. 啟用 Google Drive API
3. 設定 OAuth 同意畫面
4. 建立 OAuth Client ID（Web 應用程式）
5. 把 Client ID 填入 `index.html` 並推上 git

---

## Step 1：建立 Google Cloud 專案

1. 前往 <https://console.cloud.google.com/>
2. 左上角點專案下拉 → **新增專案**
3. 專案名稱：例如 `Bible Reader Sync`，點 **建立**
4. 等 30 秒讓專案建立完成，然後切換到這個新專案

> 💡 也可以用既有專案，只要該專案啟用了 Drive API 即可。

---

## Step 2：啟用 Google Drive API

1. 左側選單 → **API 和服務** → **程式庫**
2. 搜尋 `Google Drive API`
3. 點開 → 點 **啟用**
4. 等狀態變成「已啟用」

---

## Step 3：設定 OAuth 同意畫面

1. 左側選單 → **API 和服務** → **OAuth 同意畫面**
2. 使用者類型選 **外部 (External)** → **建立**
   - 如果你的 Google 帳號是 Workspace（企業/教會域），可選「內部」，會省去驗證步驟
3. 填寫表單：
   - **應用程式名稱**：`多譯本聖經查詢` 或你想顯示的名字
   - **使用者支援電子郵件**：選你自己的信箱
   - **應用程式標誌**：可略
   - **應用程式網域**：可略（測試階段不必填）
   - **開發人員聯絡資訊**：你自己的信箱
4. 點 **儲存並繼續**

5. **範圍 (Scopes)** 頁面：
   - 點 **新增或移除範圍**
   - 搜尋 `drive.appdata`，勾選 `.../auth/drive.appdata`
   - 也可勾 `.../auth/userinfo.email`、`.../auth/userinfo.profile`、`openid`（用來顯示登入信箱）
   - 點 **更新** → **儲存並繼續**

6. **測試使用者**頁面：
   - 點 **新增使用者**
   - 加入你自己的 Gmail，以及要參與測試的 1–2 位教友
   - 點 **儲存並繼續**

7. 確認摘要 → **返回資訊主頁**

> ⚠️ 在「測試中」狀態，最多支援 100 名測試者，且使用者會看到「未驗證的 App」警告畫面（點「進階」→「前往 App」即可繼續）。要拿掉警告需要送出驗證審查（要花 1–4 週），測試階段不必做。

---

## Step 4：建立 OAuth Client ID

1. 左側選單 → **API 和服務** → **憑證**
2. 上方點 **+ 建立憑證** → **OAuth 用戶端 ID**
3. 應用程式類型選 **網頁應用程式**
4. 名稱：例如 `Bible Reader Web Client`
5. **已授權的 JavaScript 來源**（重要！）：
   - 點 **+ 新增 URI**，加入下列每一個：
     - `http://localhost:8081`（本機測試）
     - `https://你的網站.netlify.app`（你的 Netlify 網址）
     - 若有自訂網域，也要加入
6. **已授權的重新導向 URI**：留空（GIS popup 模式不需要）
7. 點 **建立**
8. 跳出視窗會顯示你的 **用戶端 ID**，長得像：
   ```
   123456789012-abcdefghijklmnop.apps.googleusercontent.com
   ```
9. 複製這個 ID

---

## Step 5：把 Client ID 填入程式

1. 開啟 `index.html`
2. 找到這一行（搜尋 `GOOGLE_CLIENT_ID`）：
   ```js
   const GOOGLE_CLIENT_ID = '';
   ```
3. 把剛才複製的 Client ID 貼進去：
   ```js
   const GOOGLE_CLIENT_ID = '123456789012-abcdefghijklmnop.apps.googleusercontent.com';
   ```
4. 存檔，commit & push：
   ```powershell
   git add index.html
   git commit -m "feat: 啟用 Google Drive 同步"
   git push
   ```
5. Netlify 會自動部署。打開網站 → 設定/資料分頁 → 應該看到 **🔗 連結 Google 帳號** 按鈕。

---

## 🧪 測試流程（上線前自己跑一遍）

### 情境 1：第一次使用（雲端為空）
1. 設定/資料 → 連結 Google 帳號 → 看到同意畫面 → 點「進階 → 前往 App」（測試中會有警告）
2. 確認授權「在 Drive 中查看與管理 App 已建立的檔案」
3. 點「☁️ 備份到 Google Drive」→ 看到提示框（雲端 0 筆 vs 本地 N 筆）→ 確認
4. 應該看到「已備份到 Google Drive (bible_backup_a.json)」

### 情境 2：另一台裝置還原
1. 在另一台電腦/手機開啟網站
2. 連結同一個 Google 帳號
3. 點「📥 從 Google Drive 還原」→ 看到提示框 → 確認
4. 筆記應該全部回來

### 情境 3：保險絲驗證
1. 在 A 裝置加幾則筆記、上傳
2. 在 B 裝置故意刪一些筆記
3. 在 B 裝置「上傳」→ 應該跳出警告：雲端比本地多
4. 在 B 裝置「還原」→ 不會跳警告（本地比雲端少）
5. 取消後資料無變化，可重來

### 情境 4：本地快照保險絲
1. 先上傳備份
2. 設定 → 進階 → 應該看到一筆「上傳雲端前自動快照」
3. 還原一次後再看，應該多一筆「還原雲端前自動快照」
4. 點任一筆「還原」→ 確認 → 本地資料應該回到當時的狀態

---

## 🚨 疑難排解

### 「無法載入 Google 登入元件」
- 檢查網路（會去 `accounts.google.com/gsi/client`）
- 公司網路或 Windows 防火牆可能阻擋

### 「登入失敗：popup_closed_by_user」
- 使用者把彈窗關掉了，重試即可

### 「登入失敗：idpiframe_initialization_failed」或 OAuth Error
- **最常見原因**：JavaScript 來源沒設對
- 回 Cloud Console → 憑證 → 你的 OAuth Client → 確認你的網址（含 port）有列在「已授權的 JavaScript 來源」
- localhost 必須完整：`http://localhost:8081`，不能寫 `localhost:8081`

### 「Drive 上傳失敗 (403)」
- Drive API 沒啟用 → 回 Step 2 啟用
- Scope 沒對 → 應該是 `drive.appdata`，不是 `drive`

### 「Drive 上傳失敗 (401)」
- Token 過期，登出再登入

### 看到「This app isn't verified」警告畫面
- 測試中 App 的正常現象
- 點「進階」→「前往 [App 名稱] (unsafe)」即可繼續
- 要消除這個警告要把 App 提交審查（生產時再做）

---

## 🛡️ 安全提醒

- **Client ID 是公開的**，可以放在前端原始碼，不是機密
- **Client Secret 不要使用**——這是純前端 OAuth flow（implicit/PKCE），不需要 secret
- 範圍 `drive.appdata` 只能存取 App 自己的資料夾，**看不到使用者其他 Drive 檔案**——這是 Google 的硬性限制，比 `drive` 範圍安全很多

---

## 📋 上線檢核表

- [ ] Google Cloud 專案已建立
- [ ] Drive API 已啟用
- [ ] OAuth 同意畫面已設定（含 scope `drive.appdata`）
- [ ] OAuth Client ID 已建立
- [ ] JavaScript 來源含 localhost 與正式網址
- [ ] `GOOGLE_CLIENT_ID` 已填入 `index.html`
- [ ] 自己用測試帳號跑過情境 1–4
- [ ] 加了 1–2 位教友為測試使用者
- [ ] （未來）提交 OAuth 驗證審查移除「未驗證」警告
