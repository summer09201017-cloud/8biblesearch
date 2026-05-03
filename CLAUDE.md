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
Everything user-facing lives in `index.html` — CSS, HTML, and ~2400 lines of inline JS. There is no module system. Globals (`bibleData`, `userData`, `activeVersions`, `userVersionOrder`) are intentional. Don't introduce a build step or framework unless explicitly requested.

### Data shape (`data/<ver>.json`)
```
{ "<bid>": { "<chap>": { "<sec>": "經文..." } } }
```
`bid` = 1..66 (Protestant book order). All numbers are JSON string keys. Books are mapped to abbreviations and English names via the `BOOKS` array near the top of the script. Per-chapter verse counts are baked into `VERSE_COUNTS` (used to populate the verse selectors before data has loaded).

### Three render paths converge on `sortedVers()`
Read / Search / Quick-lookup all build a `verseMap` keyed by `chap:sec`, then render via `renderVerseGroup(...)` or inline equivalents. **All three paths sort their translation columns through `sortedVers()`**, which reads `userVersionOrder` from `localStorage`. If you add a new place that lists translations or builds copy/share text, run it through `sortedVers()` so the user's drag-to-reorder preference is respected.

`renderVerseGroup` accepts an optional `opts.copyHandler` string (a JS expression like `'copyReadSelection()'`) — when present, a 📋 button is added to the verse-header. The "read" path passes `copyReadSelection()`; the search path inlines a similar button calling `copyPickedSearchVerses()` directly in its template. Quick-lookup intentionally omits the inline copy button.

### `verse-header` row layout
The header is a single `nowrap` flex row: book+chapter ref on the left (truncates with ellipsis if overflowing), then 📖註釋 / 📝筆記 / 📋複製 / ☑勾選 pinned right. Don't let the right-side cluster wrap — on mobile the verse-read-check label is hidden via CSS instead. Any new header action should be `flex-shrink:0` and join this cluster.

### Translation visibility
- `VERSIONS[].hideInUi: true` (currently WEB) — never appears as a toggle pill or in the order list, but data is still loadable if some other path activates it.
- `LOCAL_VERSIONS` — codes that have a `data/<code>.json`. The current code assumes everything is local; there is no remote fetch fallback.

### 和合本 search quirk
和合本 prepends an ideographic space before 神. `normalizeUnvSpacesBeforeShen()` strips those spaces before substring matching, and the highlight regex uses a parallel `escQUnvHighlight` so search still highlights the 神 even with the space. Preserve this behavior when touching `searchLocal()` or the search render path.

### localStorage keys (all writes are best-effort, wrapped in try/catch)
| Key | Contents |
|---|---|
| `bible-user-data` | `{ "<bid>-<chap>-<sec>": { note, color } }` — notes & highlights |
| `bible-search-history`, `bible-quick-history` | last-10 query string arrays |
| `bible-version-order` | array of version codes (drag/reorder result) |
| `bible-verse-px`, `bible-comment-fs` | font-size sliders |
| `bible-note-fullscreen` | "1" / "0" — PC note modal fullscreen preference |
| `bible-last-backup-time`, `bible-backup-snooze-until` | reminder banner timing |
| `bible-local-snapshots` | up to 3 pre-sync snapshots (safety fuse #1) |
| `bible-theme` | `paper` (default) / `sepia` / `dark` / `black` |

The export/import JSON in 設定/資料 includes `userData`, `historySearch`, `historyQuick`, `exportedAt`. The cloud sync payload (schema 2) additionally carries `versionOrder`, `noteCount`, `timestamp`.

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
