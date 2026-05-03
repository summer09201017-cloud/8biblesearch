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
Everything user-facing lives in `index.html` — CSS, HTML, and ~2600 lines of inline JS (≈4000 lines total). There is no module system. Globals (`bibleData`, `userData`, `activeVersions`, `userVersionOrder`, `_notesView`, `_notesTypeFilter`, etc.) are intentional. Don't introduce a build step or framework unless explicitly requested.

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

### 快速查詢支援多段
`doQuickLookup()` 把輸入用 `[,，\n\r]+` 切成多段 ref，每段呼叫 `quickLookupSegment(seg, vers)`（已抽出的單段查詢函式）。多段模式下每段前面加 `.quick-segment-header` 標題，失敗的段以 `.quick-segment-error` 顯示警告但不中斷其他段。輸入框是 textarea 而非 input — Enter 送出，Shift+Enter 換行。

### Three render paths converge on `sortedVers()`
Read / Search / Quick-lookup all build a `verseMap` keyed by `chap:sec`, then render via `renderVerseGroup(...)` or inline equivalents. **All three paths sort their translation columns through `sortedVers()`**, which reads `userVersionOrder` from `localStorage`. If you add a new place that lists translations or builds copy/share text, run it through `sortedVers()` so the user's drag-to-reorder preference is respected.

`renderVerseGroup` accepts an optional `opts.copyHandler` string (a JS expression like `'copyReadSelection()'`) — when present, a 📋 button is added to the verse-header. The "read" path passes `copyReadSelection()`; the search path inlines a similar button calling `copyPickedSearchVerses()` directly in its template. Quick-lookup intentionally omits the inline copy button.

### `verse-header` row layout
A `flex-wrap:wrap` row: book+chapter ref on the left, then the right-side action cluster `📖註釋 / 📝筆記 / 📋複製 / ☑勾選` (in that order) inside `.verse-read-pick`. On wide screens or short refs both stay on one line; on narrow screens or with long book names (e.g. 撒迦利亞) the cluster wraps to a second line — this is intentional and replaces an earlier `nowrap` design where 📝 筆記 visually overlapped 📖 註釋. Keep all four actions in the right cluster (don't put 📖 註釋 inside `.verse-ref-title` again — `text-overflow:ellipsis` can't truncate `<a>` children, and the layout breaks). On mobile the verse-read-check label is also hidden via CSS to keep the cluster compact.

### Translation visibility
- `VERSIONS[].hideInUi: true` (currently WEB) — never appears as a toggle pill or in the order list, but data is still loadable if some other path activates it.
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
3. **Direction confirmation modal** — `openSyncConfirm(...)` always shown; warns red when local/cloud counts diverge by >5.
4. **No auto-sync** — only manual buttons.
5. **No-op when `GOOGLE_CLIENT_ID === ''`** — the UI shows a "not configured" notice and no sync code paths run.

Setup procedure for the OAuth Client ID is documented in `GOOGLE_DRIVE_SETUP.md`. Don't commit a real Client ID without the user's go-ahead — it's not secret but it ties the deployment to a specific Cloud project.

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

- **`web` version is hidden from the UI** (`hideInUi: true`) — kept for data completeness.
- **`download_bible.js` won't redownload existing files** — by design (skips when file exists and is "big enough"). Delete the file to force.
- **Empty `data/_tmp_bbe.json`** — gitignored scratch file from the download script.
- **`download_err.log` / `download.log`** — runtime logs, gitignored.
- **Most `NoteEntry` objects don't have `prayerStatus` / `questionStatus` / `questionAnswer` fields** — by design. They're only written when `type` matches; absence means "not applicable", not "data lost". Readers default-coalesce.
- **`createdAt` looks identical across many old notes after first launch of a new build** — `migrateUserDataLazy()` stamps `Date.now()` on entries that pre-date the v3 schema. Real creation dates for pre-v3 notes are unrecoverable; this is the best fallback.
- **`schema: 3` field in cloud payload is never read** — it's a label for humans/future-debugging, not a runtime gate. All payload fields are read with `?? defaults`.
- **`verse-header` wraps to 2 lines on narrow screens** — intentional fix for the long-book-name overlap bug; do not revert to `flex-wrap:nowrap`.
