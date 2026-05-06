# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A multi-translation Bible reader PWA (繁體中文介面). Single static HTML file + per-translation JSON data, no backend, no build step. Deploys to Netlify as-is. Local-first: all user data lives in `localStorage`; optional Google Drive sync writes to the user's own `appDataFolder`.

Production translations: 和合本 (unv) · ESV · NIV · WEB · BBE · 新譯本 (ncv) · 呂振中 (lcc) · ASV · KJV.

## Common commands

```powershell
# Local dev server (must be HTTP, not file://, because of fetch('data/*.json'))
py -3 -m http.server 8081
# or just double-click 啟動網站.bat
# Then open http://localhost:8081/

# Re-download all Chinese + public-domain English translations from 信望愛
node download_bible.js

# Re-fetch NIV (one of two options — see DEPLOY.md)
$env:API_BIBLE_KEY="..."; node fetch_niv_apibible.js   # licensed NIV via API.Bible
node fetch_niv_legal.js                                # BBE fallback when no key
```

There are **no tests, no linter, no build pipeline**. Validate JS syntax by extracting and parsing the inline script:

```bash
node -e "const fs=require('fs'),m=fs.readFileSync('index.html','utf8').match(/<script>([\\s\\S]*?)<\\/script>/);new Function(m[1]);console.log('JS OK')"
```

For local OAuth/Drive testing, the `http://localhost:8081` origin **must** be added to the OAuth Client's authorized JavaScript origins in Google Cloud Console (see `GOOGLE_DRIVE_SETUP.md`).

## Architecture

### Single-file design
Everything user-facing lives in `index.html` — CSS, HTML, and ~2700 lines of inline JS (≈5000 lines total). There is no module system. Globals (`bibleData`, `userData`, `activeVersions`, `userVersionOrder`, `_notesView`, `_notesTypeFilter`, etc.) are intentional. Don't introduce a build step or framework unless explicitly requested.

### Data shape (`data/<ver>.json`)
```
{ "<bid>": { "<chap>": { "<sec>": "經文..." } } }
```
`bid` = 1..66 (Protestant book order). All numbers are JSON string keys. Books are mapped to abbreviations and English names via the `BOOKS` array near the top of the script. Per-chapter verse counts are baked into `VERSE_COUNTS` (used to populate the verse selectors before data has loaded).

### 連讀模式（Continuous read）
`fetchVerses(opts)` accepts an optional `{ appendMode, bid, chap }` to append a chapter to the existing DOM instead of replacing it. When `_continuousRead` is on:
- 一個 `IntersectionObserver` 監看 `.verse-group:last-child`，進入視窗時自動 `appendNextChapter()`。
- `appendNextChapter()` 處理跨書卷邊界（馬太 28→馬可 1，創世記 50→出埃及記 1）。讀到啟示錄 22 章末才停下並顯示「📖 已讀至聖經末尾」。
- append 出來的 `.verse-group` 會打上 `data-continuous="1"`；關閉連讀時用此屬性清掉所有 append 內容，恢復為單章顯示。
- 連讀只影響閱讀分頁；搜尋／快速查詢／我的筆記不受影響。
- `bible-last-read` 只在使用者「主動查詢」（非 append）時更新；自動接章不會把「上次位置」推進到很遠。

### 筆記匯出（人類可讀格式）
設定/資料頁有兩個按鈕：「📋 匯出 Markdown」（modal 顯示文字 + 複製/下載）與「🖨 列印 / 另存 PDF」（新視窗 + 自動 `window.print()`）。兩者共用 `gatherNotesForExport()` 抽取資料，依「釘選優先 → 月份分組（updatedAt desc）」排版。

- Markdown：每則用 `### ref` 起頭，內容轉成 `> ` 引用塊；包含類型徽章、釘選/書籤標記、禱告/問題狀態、等候天數、標籤、建立/更新時間。
- HTML 列印：行內 CSS（無 var()，獨立於 App theme），用 `Noto Sans TC / PingFang TC / Microsoft JhengHei` 字體 stack，每則 `break-inside:avoid` 避免跨頁切斷。彈窗失敗時 fallback 到 `Blob` URL。
- 中文 PDF 用「瀏覽器列印 → 另存 PDF」獲得最佳效果，不引入 jsPDF（會帶 5MB+ 中文字體）。

### 快速查詢支援多段
`doQuickLookup()` 把輸入用 `[,，\n\r]+` 切成多段 ref，每段呼叫 `quickLookupSegment(seg, vers)`（已抽出的單段查詢函式）。多段模式下每段前面加 `.quick-segment-header` 標題，失敗的段以 `.quick-segment-error` 顯示警告但不中斷其他段。輸入框是 textarea 而非 input — Enter 送出，Shift+Enter 換行。

### 對讀比較分頁（Diff）
新分頁 `#panel-diff`，自選基準與對比版本的 diff，**中文用 dmp（diff-match-patch）+ cleanupSemantic、英文用自寫 word-level LCS**，支援單節或範圍，並支援 **3-way unified diff**。
- 9 個版本（中文 unv/ncv/lcc + 英文 esv/niv/kjv/web/asv/bbe），`DIFF_VERSIONS` 表帶 `lang:'zh'|'en'`。基準下拉用 `<optgroup>` 分中／英；對比下拉透過 `rebuildDiffCompOptions()` **只列出與基準同語言的選項**（中英不能跨）。
- 預設：基準=ESV、對比=NIV；切到 unv 為基準時對比預設自動切到 ncv。`DIFF_DEFAULT_COMP_BY_LANG = { zh:'ncv', en:'niv' }`。
- 範圍輸入：「起始節 / 結束節」沿用閱讀分頁的邏輯（start+end → 範圍；只有 start → 單節；都空 → 整章）。
- 中文路徑：`computeDiffChinese(a, b, baseVer, compVer)` 用 `dmp.diff_main()` + `dmp.diff_cleanupSemantic()`，把零碎 LCS 匹配（譬如「逗號被孤立成綠色」這種視覺噪音）合併成有意義的短語塊。`buildDiffHtmlFromDmp()` 把 `[op, text]` 段落直接轉成 baseHtml / compHtml（已 escHtml 處理）。和合本兩側都套 `normalizeUnvSpacesBeforeShen()` 去除「神」前空白。
- 英文路徑：保留原 `diffLcsMatch()` word-level LCS（純 LCS 對英文表現已足夠好，沒必要用 dmp 的 char-level）。
- dmp 懶載入：`loadDiffMatchPatch()` 在第一次中文 diff 時動態 inject `<script src="vendor/diff_match_patch.js">`（~78 KB unmin），之後 SW 預快取接手。dmp 載入失敗時 `computeDiffChinese()` 自動降級回 char-level LCS。
- SW v44 把 `/vendor/diff_match_patch.js` 加進 SHELL 預快取；`/vendor/*` 走 cache-first，PWA 離線可用。
- 卡片設計：每節一張 `.diff-card`，內含基準/對比兩個 `.diff-verse-row`（紅/綠 tag + 紅/綠高亮獨有字）。範圍模式上方多一張 `.diff-summary`，顯示「總相似度 X%」= 加權平均 `2 × ΣLCS / (Σ基準字數 + Σ對比字數)`。
- `.diff-verse-text.zh` 用 sans-serif 中文字體 stack，letter-spacing 加大；紅綠高亮 padding 縮小避免方塊矩陣感。
- 紅色高亮 **沒有刪除線**——避免「這些字應該刪掉」的誤導語意。
- 已驗證 dmp 在 J3:16：和合本 vs 新譯本 = 97%（只有「將/把」差異，標點完全乾淨）；和合本 vs 呂振中 = 29%（dmp 給整段 chunk，視覺結構符合人類「這兩段差很多」直覺，比舊 LCS 64% 散布的紅綠標點容易讀）。

#### 3-way unified diff
第三版本下拉 `#diff-sel-comp2` 預設「（不用）」=2-way 模式；選一個第三版本後切換成 3-way unified mode。
- **Lonely 規則**：某 token 高亮 ⇔ 在另外兩個版本中**都沒有匹配**（在 2 個以上版本出現的字 = 多數一致，不標）。這個規則的好處是只突顯「真正獨有的差異」，避免 3 色聖誕樹效果。
- 演算法：對 (A,B)、(A,C)、(B,C) 各做一次 pairwise diff（中文用 dmp + cleanupSemantic、英文用 LCS），把 6 個 match 陣列合成各版本的 lonely 陣列。verse 級長度三組 dmp/LCS 加起來毫無壓力。
- 助手 `dmpCharMatch(diffs, sideA)` 把 dmp 段落輸出展開成該邊每個字元的 matched 布林陣列。`renderLonelyGroups(items, lonelyArr, diffClass, joinSep)` 把連續 lonely 字元合併成一個 span（避免破碎效果）。
- 第三版本顏色：藍色 `.diff-comp2-unique` / `.diff-verse-tag.comp2`（紅綠藍三色組合在 sepia/dark/black 主題各有覆寫）。
- 卡片標題顯示 3 個 pairwise 相似度（譬如 `和合本↔新譯本 97%`、`和合本↔呂振中 30%`、`新譯本↔呂振中 30%`），讀者一眼看出版本之間的兩兩距離。範圍模式 summary 同樣顯示 3 個總相似度。
- 下拉相依鏈：`onDiffBaseChange()` 重建 comp1 + comp2；`onDiffComp1Change()` 只重建 comp2。`rebuildDiffComp2Options()` 排除 base 與 comp1 已選版本，且第一個選項永遠是「（不用）」。切換語言會把 comp2 退回 ''。
- 已驗證 J3:16 三方：和合本 lonely=「將」一字、新譯本 lonely=「把」一字、呂振中 lonely=「上帝這樣地…而」整段——精確命中 3 個版本各自的「真正獨有」訊號。

### Three render paths converge on `sortedVers()`
Read / Search / Quick-lookup all build a `verseMap` keyed by `chap:sec`, then render via `renderVerseGroup(...)` or inline equivalents. **All three paths sort their translation columns through `sortedVers()`**, which reads `userVersionOrder` from `localStorage`. If you add a new place that lists translations or builds copy/share text, run it through `sortedVers()` so the user's drag-to-reorder preference is respected.

`renderVerseGroup` accepts an optional `opts.copyHandler` string (a JS expression like `'copyReadSelection()'`) — when present, a 📋 button is added to the verse-header. The "read" path passes `copyReadSelection()`; the search path inlines a similar button calling `copyPickedSearchVerses()` directly in its template. Quick-lookup intentionally omits the inline copy button.

The inline 📋 button label is **dynamic**: it shows 「📋 複製 N 節」when N > 0 verses are checked in the same area, and 「📋 勾選後複製」when N = 0. Each button has a `data-copy-mode="read"` or `"search"` attribute so `updateCopyButtonCounts(mode)` can find them. Counts update via delegated `change` listeners on `#results-read` / `#results-search`. Programmatic toggles (`toggleAllReadPicks`, `toggleAllSearchPicks`) call `updateCopyButtonCounts(mode)` explicitly because setting `checked` in JS does not fire `change`.

### `verse-header` row layout
A `flex-wrap:wrap` row: book+chapter ref on the left, then the right-side action cluster `📖註釋 / 📝筆記 / 📋複製 / ☑勾選` (in that order) inside `.verse-read-pick`. On wide screens or short refs both stay on one line; on narrow screens or with long book names (e.g. 撒迦利亞) the cluster wraps to a second line — this is intentional and replaces an earlier `nowrap` design where 📝 筆記 visually overlapped 📖 註釋. Keep all four actions in the right cluster (don't put 📖 註釋 inside `.verse-ref-title` again — `text-overflow:ellipsis` can't truncate `<a>` children, and the layout breaks). On mobile the verse-read-check label is also hidden via CSS to keep the cluster compact.

### Translation visibility
- `VERSIONS[].hideInUi: true` — never appears as a toggle pill or in the order list, but data is still loadable if some other path activates it. (No version currently uses this; WEB used to be hidden but is now visible at the end of the order.)
- `VERSIONS` array order = the **default display order** for new users. WEB intentionally sits last (after KJV) because it duplicates the public-domain English niche already covered by ASV/KJV — keep it last unless you have a reason.
- `loadVersionOrder()` appends new versions to the end of an existing user's saved order via the `missing` patch — adding a new version to `VERSIONS` will not disturb the user's drag-reorder preference.
- `LOCAL_VERSIONS` — codes that have a `data/<code>.json`. The current code assumes everything is local; there is no remote fetch fallback.

### 和合本 search quirk
和合本 prepends an ideographic space before 神. `normalizeUnvSpacesBeforeShen()` strips those spaces before substring matching, and the highlight regex uses a parallel `escQUnvHighlight` so search still highlights the 神 even with the space. Preserve this behavior when touching `searchLocal()` or the search render path.

### localStorage keys (all writes are best-effort, wrapped in try/catch)
| Key | Contents |
|---|---|
| `bible-user-data` | `{ "<bid>-<chap>-<sec>": <NoteEntry> }` — see "Notes data shape" below |
| `bible-search-history`, `bible-quick-history` | last-10 query string arrays |
| `bible-version-order` | array of version codes (drag/reorder result) |
| `bible-verse-px`, `bible-comment-fs` | font-size sliders |
| `bible-note-fullscreen` | "1" / "0" — PC note modal fullscreen preference |
| `bible-last-backup-time`, `bible-backup-snooze-until` | reminder banner timing |
| `bible-local-snapshots` | up to 3 pre-sync snapshots (safety fuse #1) |
| `bible-theme` | `paper` (default) / `sepia` / `dark` / `black` |
| `bible-last-read` | `{bid, chap, secStart, secEnd, ts}` — last successful `fetchVerses()` query, restored on next launch |
| `bible-continuous-read` | `"1"` / `"0"` — 連讀模式開關（讀到章末自動接下一章） |
| `bible-layout-mode` | `"auto"` / `"stacked"` / `"parallel"` — 多譯本排版偏好。auto = 桌機並排手機堆疊；其他 = 強制 |
| `bible-seen-welcome` | `"1"` — 首次使用歡迎卡片已關閉的記號（設定頁有「重新顯示」按鈕） |
| `bible-auto-cloud-check` | `"1"` / `"0"` — 啟動時是否自動偵測雲端有無更新（半自動同步開關，預設 `"0"`） |
| `bible-cloud-linked` | `"1"` — 表示使用者曾成功連結 Google 帳號；啟動時用來決定是否要 silent refresh |
| `bible-cloud-token-cache` | `{access_token, expiry, email}` — 快取 Google access token（~1 小時）避免每次 reload 都打網路；登出或撤銷時清除 |

The export/import JSON in 設定/資料 includes `userData`, `historySearch`, `historyQuick`, `exportedAt`. The cloud sync payload (schema 3) additionally carries `versionOrder`, `noteCount`, `timestamp`. Schema bumped 2 → 3 when notes gained type/tags/dates/status fields, but no read-side branching exists — `schema` is just a label, all readers do best-effort field access with fallbacks.

### Notes data shape (`NoteEntry` in `bible-user-data`)
Each entry keyed by `bid-chap-sec`. Schema is **forward-only and tolerant** — readers must default-coalesce missing fields. Required (since v3):

```js
{
  note: '',                    // free text
  color: '',                   // '' or '#fff3cd'/'#d4edda'/'#f8d7da'/'#d1ecf1'
  type: '',                    // '' | 'devotion' | 'prayer' | 'question' | 'action' | 'sermon'
  tags: [],                    // string[]
  createdAt: 0,                // ms timestamp
  updatedAt: 0,                // ms timestamp
  pinnedAt: 0,                 // ms timestamp; 0 / absent = 未釘選；釘選永遠置頂於每個視圖
  bookmarkedAt: 0,             // ms timestamp; 0 / absent = 未加書籤；書籤視圖以此倒序
  // optional, only present when type matches:
  prayerStatus: 'open',        // 'open' | 'answered' | 'paused'  (only when type==='prayer')
  prayerAnsweredAt: 0,         // ms timestamp                     (only when type==='prayer' && prayerStatus==='answered')
  prayerAnswerNote: '',        // free text                        (only when type==='prayer')
  questionStatus: 'open',      // 'open' | 'resolved'              (only when type==='question')
  questionAnswer: '',          // free text                        (only when type==='question')
}
```

`NOTE_TYPES` is the single source of truth (id/label/icon) — read it instead of hard-coding the 5 types in new code. `NOTE_TYPE_MAP[id]` gives O(1) lookup.

`saveNote()` strips type-specific fields when the user changes type (e.g. switching prayer→devotion drops `prayerStatus`). This avoids polluted entries; readers should still tolerate stray fields from old data.

### `migrateUserDataLazy()` — pattern for schema upgrades
Called at every entry point that sets `userData`: page load, JSON import, snapshot restore, Drive restore. Idempotent — only writes back to `localStorage` when at least one entry is missing a required field. New schema versions should extend this function rather than do eager migration in a separate codepath. The function intentionally tolerates partial entries — it never deletes user data, only fills defaults.

### "我的筆記" tab views
Single state var `_notesView` ∈ `{'list', 'timeline', 'prayer', 'question', 'bookmark'}` drives `renderNotesList()`'s dispatch at the bottom. Bookmark view is "filter-only" (shows only entries with `bookmarkedAt`); prayer/question views also imply a `type` filter. The function:
1. Builds `allEntries` from `userData` once (used for both stats and filtering).
2. Updates view-chip selected state and `renderNotesStats(...)` using the unfiltered set.
3. Computes `effectiveType = viewType || _notesTypeFilter` (prayer/question views imply a type without the user picking).
4. Hides the type-filter row when `viewType` is set; status-filter row keys off `effectiveType`.
5. Splits entries into `pinnedEntries` / `otherEntries`; **pinned always sort to top** of every view. In list/prayer/question this is a flat prepend; in timeline pinned forms its own `📌 釘選 (N)` group above the month groups.
6. Sorts/groups per view: list = bid/chap/sec; timeline = `updatedAt` desc grouped by `YYYY 年 M 月`; prayer = `open(by createdAt asc) → paused → answered(by prayerAnsweredAt desc)`; question = `open → resolved` each `updatedAt` desc; bookmark = `bookmarkedAt` desc (most recently bookmarked first).
7. Cards rendered through shared `renderNoteCardHtml(e, opts)`. `opts.showWait` adds the "等候 N 天" chip used by the prayer wall; `opts.hideTypeChip` suppresses the type chip in views where it'd be redundant. Pinning shows a 📌 marker before the ref and a `.pinned` class on the card. `togglePinFromList(bid,chap,sec)` writes immediately to `userData` (no modal needed); modal-side toggle (`toggleNotePinInModal`) only updates `currentNotePinnedAt` and is persisted by `saveNote()`. Bookmarks (🔖) follow the same pattern: `toggleBookmarkFromList()` is immediate, `toggleNoteBookmarkInModal()` is staged. Pin and bookmark are independent — a note can be both, neither, or either.

When adding a new view, add a chip in the HTML, a branch in `setNotesView()` if it implies a type, and a branch in the dispatch — don't introduce a parallel render function.

### Theming
Four themes selectable from chips under the brand title: `paper` (default 米紙) / `sepia` (印刷棕) / `dark` (深色) / `black` (純黑/OLED). Implementation:
- All colors come from CSS variables on `:root` and `[data-theme="..."]`. Adding a new theme = adding one block of variable overrides.
- `setTheme(name)` toggles `document.documentElement.dataset.theme`, syncs `<meta name="theme-color">` (mobile status bar tint), and persists to `bible-theme`.
- Identity colors (translation badges, the red 📋 / 複製 gradient buttons) intentionally **stay constant across themes** — they're brand/recognition, not chrome.
- Highlight color classes (`hl-yellow/green/pink/blue`) are remapped per theme so user-saved highlights stay readable on dark backgrounds.
- The 信望愛 註釋 modal is an iframe to a third-party origin; theme cannot reach inside (cross-origin). Acceptable.

### Google Drive sync (manual, opt-in)
Lives entirely client-side using Google Identity Services (GIS) + Drive REST. Configured by setting `GOOGLE_CLIENT_ID` near the bottom of the script. Scope is `drive.appdata` only (cannot read user's other Drive files).

Five safety fuses are non-negotiable; do not remove any when refactoring:
1. **Local snapshot before every overwrite** — `snapshotLocal(reason)` keeps last 3.
2. **Cloud rotation** — `bible_backup_a/b/c.json` written round-robin (oldest replaced).
3. **Direction confirmation modal** — `openSyncConfirm(...)` always shown; warns red when local/cloud counts diverge by >5; warning block now includes a "數字差很多代表可能按錯方向" tip below the red banner.
4. **No silent overwrite** — uploads/restores always require a manual button click OR an explicit user confirmation in `openSyncConfirm`. The half-auto detection in `autoCheckCloudOnLaunch()` only *fetches* and *shows the modal*; it never writes without the user clicking 確定 in the modal.
5. **No-op when `GOOGLE_CLIENT_ID === ''`** — the UI shows a "not configured" notice and no sync code paths run.

#### Connection persistence (`autoRelinkOnLaunch`)
Critical UX fix — Google access tokens used to live only in memory, so every page reload / F5 / PWA restart forced the user to click 「🔗 連結 Google 帳號」 again. Now:
- On every successful sign-in/refresh, `persistCloudLinkedState()` writes `{access_token, expiry, email}` to `bible-cloud-token-cache` and sets `bible-cloud-linked = "1"`.
- Init script does a synchronous `restoreCachedToken()` before the first `updateSyncUi()` so the UI shows 「已連結」immediately (no flash of 「尚未連結」) when cache is fresh (<55 min old).
- 1.5s after page load, `autoRelinkOnLaunch()` runs — if cache is expired, it calls `silentTokenRefresh()` (i.e. `requestAccessToken({prompt:''})`), which uses the user's existing Google session cookie to mint a new token without any popup. Result is persisted again.
- On revoke/logout/access_denied error, both keys are cleared so we don't keep retrying a dead session.
- `gisSignOut()` calls `clearCloudLinkedState()` to forget the link explicitly.

Storing access tokens in localStorage is acceptable here because (a) the scope is `drive.appdata` only — no access to user's other Drive files, (b) the app is a static HTML with no user-generated HTML rendering paths (low XSS surface), (c) tokens self-expire in ~1 hour, (d) the alternative (popup every reload) is a worse UX for non-technical users.

#### Half-auto cloud detection (`autoCheckCloudOnLaunch`)
Opt-in checkbox 「🔄 啟動時自動偵測雲端」 inside `#sync-signed-in` (persisted in `bible-auto-cloud-check`, default off). When on:
1. ~1.5s after page load (delayed so initial render isn't blocked), runs *after* `autoRelinkOnLaunch()` so token is already valid.
2. Fetches the latest cloud backup, parses payload, compares `cloudTime` vs local `BACKUP_TIME_KEY`.
3. Only when `cloudTime > localTime + 60s` (clock-drift tolerance) does it call `openSyncConfirm(...)` — same modal as manual restore, with both counts and the >5 divergence warning.
4. User confirms → goes through the full restore path (snapshot before write, all storage keys, UI re-render). User cancels → silent.
5. When cloud is **not** newer, sets a status line 「雲端已是最新（HH:MM 檢查）」 so the user sees the check actually ran (otherwise the feature looked broken).
6. Any exception in auto mode → swallowed with `console.warn`. Never toasts errors to non-technical users.
7. Guarded by `_autoCloudCheckedThisSession` so reloads in the same tab don't re-trigger.
8. Manual mode: `autoCheckCloudOnLaunch({manual:true})` is wired to a 「🔍 立刻檢查雲端」 button — bypasses both the once-per-session guard and the toggle pref, and shows toasts/status on every outcome (good for debugging and on-demand checks).

Setup procedure for the OAuth Client ID is documented in `GOOGLE_DRIVE_SETUP.md`. Don't commit a real Client ID without the user's go-ahead — it's not secret but it ties the deployment to a specific Cloud project.

#### Sign-in UX wrapper for non-technical users
The "🔗 連結 Google 帳號" button calls `gisSignInWithWarning()`, **not** `gisSignIn()` directly. The wrapper pops a native `confirm()` first that explains:
- Google's "未驗證的 App" red warning is normal during the test phase (not a virus)
- The user must remember which Google account they linked, because cross-device restore requires the same account

Reasons for this layer:
- App users are non-technical (church members) — without this 80% bounce at the warning screen
- The "test phase" warning cannot be removed without going through Google's verification process (1–4 weeks)

The 雲端同步 section in 設定/資料 is wrapped in a `<details>` that **defaults to collapsed** with a「進階功能；建議先用 JSON 備份就夠了」tag, so non-technical users never trip on it. Inside, an **opened-by-default** `<details class="sync-tutorial">` walks through the 4-step linking flow with the "未驗證 App" warning highlighted in red. After link, a persistent orange `.sync-account-warning` reminds the user to remember the linked account; the upload/restore buttons each get a `.sync-button-hint` line explaining the direction (覆蓋雲端為本地版本 / 覆蓋本機為雲端版本).

Where backups actually live: in the linked Google account's `drive.appdata` (a hidden per-app folder). Not visible at drive.google.com; verifiable via Drive API Explorer with `q='appDataFolder' in parents` and `spaces=appDataFolder`. This invisibility is intentional Google design but **confuses non-technical users** — that's why the in-app status text (last sync time + cloud note count) is the primary affordance for "did it work?".

### Service Worker (`sw.js`)
- `CACHE_NAME = 'bible-multi-vN'` — **bump N when shipping any change to `index.html`, `manifest.webmanifest`, or icons**, otherwise installed PWA users keep the stale shell.
- `data/*.json` is cache-first (offline read), `index.html` is network-first with cache fallback.
- `netlify.toml` sets `Cache-Control: no-cache` on `sw.js` so the SW registration sees updates promptly.

### PWA manifest / install
`manifest.webmanifest` declares standalone mode. Install button visibility is platform-aware: iOS Safari can't `beforeinstallprompt`, so the button always shows on mobile and toggles a usage hint instead.

## Conventions

- **Commit messages**: Chinese, conventional-commit style (`feat:` / `fix:` / `style:` / `docs:`). Recent history is the reference.
- **Keep `index.html` editable**: prefer small, scoped edits; the file is large but each feature region is grouped (CSS → HTML → JS by section). Don't reformat or split files unless asked.
- **No backend**: every feature must work as a static page. If a feature seems to need a server, propose it before implementing.
- **Don't strip `localStorage` try/catch wrappers** — Safari Private Mode / iOS storage quotas throw on `setItem`, and the app's user is non-technical; silent degradation is intentional.
- **i18n / wording**: All UI strings are Traditional Chinese (zh-Hant). When adding strings, match the existing terse Chinese tone; English is acceptable inside developer-facing comments and `.md` files.

## Things that look like bugs but aren't

- **`download_bible.js` won't redownload existing files** — by design (skips when file exists and is "big enough"). Delete the file to force.
- **Empty `data/_tmp_bbe.json`** — gitignored scratch file from the download script.
- **`download_err.log` / `download.log`** — runtime logs, gitignored.
- **Most `NoteEntry` objects don't have `prayerStatus` / `questionStatus` / `questionAnswer` fields** — by design. They're only written when `type` matches; absence means "not applicable", not "data lost". Readers default-coalesce.
- **`createdAt` looks identical across many old notes after first launch of a new build** — `migrateUserDataLazy()` stamps `Date.now()` on entries that pre-date the v3 schema. Real creation dates for pre-v3 notes are unrecoverable; this is the best fallback.
- **`schema: 3` field in cloud payload is never read** — it's a label for humans/future-debugging, not a runtime gate. All payload fields are read with `?? defaults`.
- **`verse-header` wraps to 2 lines on narrow screens** — intentional fix for the long-book-name overlap bug; do not revert to `flex-wrap:nowrap`.
- **LINE 分享 / Email 分享 wrapped in `<span class="share-btn-group">`** — `flex-wrap:nowrap` keeps these two buttons glued together on every viewport; the outer search-actions row may still wrap them as a unit. Don't unwrap.
- **歡迎卡片 (`#welcome-modal`) middle area scrolls on mobile** — `.welcome-feature-list` is `flex:1 1 auto; overflow-y:auto; min-height:0`. The footer (「先看看」/「知道了，不再顯示」) is `flex-shrink:0` so it stays pinned to the bottom of the viewport. Without these, the two buttons get pushed below the fold and users can't dismiss the modal.
- **「☁️ 跨裝置自動同步」section is collapsed by default** (`<details class="sync-section-details">` without `open`) — intentional, see "Sign-in UX wrapper for non-technical users" above. The inner 4-step tutorial card (`<details class="sync-tutorial" open>`) **is** open by default so first-time users see it the moment they expand the section.
