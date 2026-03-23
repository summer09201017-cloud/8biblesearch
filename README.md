# 多譯本聖經查詢（PWA）

離線讀取 `data/*.json` 的多譯本聖經查詢網頁：經文閱讀、關鍵字搜尋、快速查詢、勾選複製／LINE／Email 分享，並支援安裝到手機主畫面。

## 本機預覽

在專案根目錄用靜態伺服器開啟（需能讀取 `data/`），例如：

```powershell
# Python 3
py -3 -m http.server 8080
```

瀏覽器開啟 `http://localhost:8080/`（或執行根目錄的 `啟動網站.bat`）。

## 資料檔

執行 `node download_bible.js` 自 [信望愛 qb.php](https://bible.fhl.net/json/qb.php) 下載譯本至 `data/`。詳見 **`DEPLOY.md`**。

## 部署到 GitHub + Netlify

完整步驟、Netlify 設定與注意事項請看 **`DEPLOY.md`**。

## 授權與聲明

經文版權各歸原譯本／來源所有；使用請遵守相關條款。NIV 等需 API 金鑰之流程見 `DEPLOY.md`。
