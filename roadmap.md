# 多譯本聖經查詢 — Roadmap（對齊現況 2026-07-19）

> 給接手的人/AI：這份是「**已完成 vs 真正待做**」的單一真相。已完成的別重做；待做的按 CP 值排序。
> 線上：push `main` → Netlify 自動部署（**部署前會跑閘門** `scripts/validate-deploy.mjs --selftest`，失敗＝部署失敗、線上維持前一版）。repo `summer09201017-cloud/8biblesearch`。SW 目前 **v62**。

---

## ✅ 已完成（別重做）

**2026-07-19（agape250 機）白屏事故閉環＋部署閘門＋VERSE_COUNTS 修正**
- 🚨 **白屏事故修復**：07-19 凌晨的 play-stats beacon 批次把 snippet 插進 `buildNotesPrintHtml()` 模板字串（字串裡含 `</body></html>`），未跳脫的 `</script>` 提早關閉主腳本 → 整站 JS 變頁面文字。已把 beacon 移到真正頁尾獨立 `<script>`（統計功能保留，`ps-last-8biblesearch` 為 10 分去重鍵）。
- 🛡 **部署閘門 v2**（`scripts/validate-deploy.mjs`，netlify.toml `[build].command` 帶 `--selftest`）：真兇 fixture 常駐自測（`tests/fixtures/broken-20260719-whitescreen.html`，閘門抓不到它＝禁止部署）＋內嵌 JS 逐塊解析＋列印模板完整性＋git 衝突標記＋`data/*.json` 完整性＋**VERSE_COUNTS↔資料逐格一致**＋SW/manifest。另有全域 pre-push hook（skill `deploy-gate`）在本機 push 前跑同一支。
- 🐛 **VERSE_COUNTS 43+ 格錯值修正**：手抄常數民數記漏第 9 章（後 27 章位移）、箴言漏 10 章、撒上 20/23/24、林前 16 錯值——節選單錯了幾個月。已改「9 譯本資料檔最大值」程式化重生成（約 7:53 是版本差異故取最大）。教訓：常數由資料生成＋閘門對賬，不手抄。
- 📑 分頁順序：「📖 足跡」與「快速查詢」交換（足跡第 3 格）。現順序：閱讀／搜尋／📖 足跡／快速查詢／筆記／📊 對讀／設定。
- SW v58→**v62**（v59 beacon 批次、v60 白屏修復、v61 分頁交換、v62 VERSE_COUNTS）。

**2026-07-04（agape250 機）朗讀改進三件套（機器味＋破音字）**
- 🔊 選聲排序：Edge Natural 神經語音 > Google 國語 > 傳統 SAPI；設定頁「🔊 朗讀聲音」下拉＋試聽（localStorage 鍵 bible-speak-voice，''＝自動）。
- 🔊 斷句抑揚：標點切短句逐句唸，問句尾音升、感嘆稍強、末句放慢；朗讀佇列改 {text,lang,pitch,rate} 物件。
- 🔊 破音字同音替換 toSpeakable()＋TTS_PHRASES 字典（行傳→行撰、便雅憫→變雅憫、供物→貢物…）——只影響唸、不動畫面經文；唸錯回報一詞加一條。正本：skills 合輯 web-speech-scripture/assets/tts-fix.js。SW v57→**v58**。


**核心功能（更早就有）**
- 9 譯本離線閱讀：和合本 unv · 新譯本 ncv · 呂振中 lcc · ESV · NIV · KJV · ASV · WEB · BBE（`data/*.json`，SW cache-first 離線）。
- 三條 render path（閱讀／搜尋／快速查詢）皆過 `sortedVers()`，尊重拖曳排序。
- 關鍵字搜尋：多關鍵字 AND（空白／逗號分隔）、和合本「神」前空格處理、勾選複製／LINE／Email 分享。
- 快速查詢：多段 ref（逗號/換行切段），textarea Enter 送出。
- 對讀比較（Diff）：中文 dmp + cleanupSemantic、英文 word-level LCS，單節／範圍／**3-way unified diff**，相似度彙總。
- 我的筆記：type/tags/dates/status、釘選、書籤、五種視圖（list/timeline/prayer/question/bookmark）、Markdown 匯出 / 列印 PDF。
- 四主題（paper/sepia/dark/black）、字體大小、連讀模式、上次位置記憶。
- Google Drive 同步（drive.appdata，五道安全保險）、JSON 匯入匯出、本地快照。

**這輪做的（2026-06-29）**
- 🔊 **朗讀經文**（Web Speech API，零音檔、離線、免費）：讀目前分頁可見經文，連續逐節、中英自動選語音、無語音時靜默 fallback、切分頁自動停。
- 🔊 **朗讀版本選擇器**：下拉只列「畫面上有的譯本」，預設第一個譯本，可選任一中／英版，選擇記憶於 localStorage。
- 📱 **手機字體大小列移到底部固定**（避開瀏海／動態島把頂端拉桿蓋住；安全區留白）。
- 📱 **手機頂部精簡**：隱藏中文大標題；`brand-row` 把英文副標＋主題鈕並排同列（桌機 `display:contents` 不變）；護眼鈕 24→20px；安裝鈕由 header 移入 app-brand；空 header 塌成 0（去掉殘留棕條）。
- 📱 **經文卡片加寬**：`.container` 左右 padding 10→2px、卡片內距 12→10px，幾乎貼邊。
- 🛠 **`/ship` 指令**（repo `.claude/commands/ship.md`）：驗證內嵌 JS + 檢查/bump SW + 資料檔健檢 + 部署提醒。
- 🛠 **SW-bump 提醒 hook**（repo `.claude/settings.local.json`，PostToolUse）：改到 index.html 自動提醒 bump SW。
- 🔌 **cuv MCP 升級成 9 譯本**（`~/.claude/cuv-data/` 補 niv/web/bbe/lcc；零改碼、lazy load；已驗證 live）。

**這輪做的（2026-07-03）**
- 🔗 **「啟動時自動連結 Google」可手動關**（sync 區塊勾選框，`bible-auto-relink` 預設開）：關掉＝開 App 完全不碰 Google、顯示「尚未連結」，要備份再手動按連結（token 快取保留，重開開關即恢復）。三個啟動路徑（init 快取還原／1.5s autoRelink／autoCheckCloud）都有閘門。
- 📑 **分頁順序**：「📖 足跡」前移到第 4 格、「📊 對讀比較」退後（一眼看到足跡）。
- 📖 **讀經足跡**（新分頁「📖 足跡」）：查了就自動打卡——閱讀分頁顯示一章**停留 15 秒**、或快速查詢「整章」＝算讀過；關鍵字搜尋不計；啟動自動還原上次位置不計（`_autoQueryEnabled` 閘門）；同一章 30 分鐘內只算一次。統計卡（今日／連續天數／讀過章數／全卷 %）＋範圍切換（本月／近3月／近6月／近12月／歷年）＋熱區排行＋全卷 1189 章足跡地圖（點格子直接翻開那章）。可在設定停用（記錄保留）或清除。記錄按月分桶存 `bible-reading-log`，並已接進 JSON 匯出／匯入、本地快照、雲端同步 payload。手機分頁列改為可橫向捲動（容納第 7 個分頁）。

---

## 🔜 待做（按 CP 值 × 開發時間排序）

| # | 項目 | 類型 | ★價值 | ⏱開發 | 備註 |
|---|------|------|------|------|------|
| 1 | **每日金句／今日經文卡**（開啟依日期顯示一節，可朗讀） | 功能 | ★★★★ | ~2hr | 純 reader、會部署；可接 🔊；照 [[daily-verse]] skill「每天同一句要確定性」 |
| 2 | **讀完一卷書 → 彩帶＋里程碑**（足跡的 `m` 桶已能算出「某卷全部章都讀過」，偵測免費） | 功能複用 | ★★★★ | ~2hr | 複用 win-confetti；好玩、黏著；足跡上線後 CP 值大漲 |
| 3 | **一年讀經計畫模式**（麥琴表或一年表：今天該讀哪幾章 → 足跡自動打勾、落後提醒） | 功能 | ★★★★★ | ~1 天 | 足跡是現成的打卡底層,只差「計畫表」層;門訓剛需 |
| 4 | **清理巢狀舊 repo**（`聖經查詢CUR/聖經查詢CUR/...` 3 層） | 整理 | ★★★★ | ~30min | **需使用者點頭才刪 git**;另桌面 `聖經查詢CUR-交接-2026-06-29` 快照已過時可一併處理 |
| 5 | **足跡月報分享卡**（canvas 把本月足跡格子＋統計輸出成 PNG 傳 LINE 小組互相激勵） | 功能 | ★★★ | ~半天 | 照 [[share-card]] skill;小組讀經同行 |
| 6 | **經文分享圖卡**（canvas 產金句圖分享 LINE，取代純文字） | 功能 | ★★★ | ~半天 | 重度用 LINE |
| 7 | **朗讀增強**：跨章連續朗讀（接連讀模式）／每節獨立 🔊 鈕 | 功能 | ★★ | ~2hr | 看使用回饋再決定 |
| 8 | **README/CLAUDE 持續對齊**（每次大改後跑 /handoff） | 流程 | ★★ | — | 維持文件不脫節 |
| 9 | **部署後 Playwright smoke**（開線上首頁抓 console error/白屏——閘門管結構、這個管 runtime） | 流程 | ★★ | ~1hr | 派 web-smoke-verifier/deploy-verifier agent 即可,不進 Netlify build（燒 build 分鐘） |

> 舊 #5「pre-push-guard 裝到本 repo」已由更強的方案取代完成（07-19）：全域 deploy-gate hook＋Netlify 閘門雙保險。

---

## 🚫 刻意不做（有原因，別加）

- **搜尋的 OR／排除(-X)／片語引號／範圍語法** — tier-1 AND 已涵蓋 ~80% 需求，避免非技術教友的學習曲線。
- **jsPDF 中文匯出** — 會帶 5MB+ 字體；中文 PDF 用「瀏覽器列印 → 另存 PDF」。
- **建置步驟／框架** — 刻意維持單檔 static HTML、無 build。
- **WEB 譯本排前面** — 刻意放最後（與 ASV/KJV 公版英文重疊）。
- **雲端同步預設展開／自動覆寫** — 對非技術教友危險，預設收合 + 五道保險。

---

## 🧰 跨專案工具現況（skill / slash / agent / hook / MCP）

| 工具 | 類型 | 位置 | 狀態 |
|------|------|------|------|
| `cuv` 9 譯本經文查詢 | MCP | `~/.claude/cuv-data/cuv-mcp.mjs`（登記於 `~/.claude.json`） | ✅ **v1.2.0**（07-19）：+`parse_ref` 參照解析、+`search` AND 全文搜尋、lookup 吃英文書名；`--selftest` 21 條 |
| `deploy-gate` 部署閘門 | skill＋全域 hook | `~/.claude/skills/deploy-gate/`＋`~/.claude/hooks/deploy-gate-pre-push.mjs`（hooks-片段 §15） | ✅ 2026-07-19 新建（本 repo 閘門＝活範例；push 前自動跑 scripts/validate-deploy.mjs） |
| `bible-ref-kit` 聖經參照基礎件 | skill | `~/.claude/skills/bible-ref-kit/`（assets/bible-ref.js UMD） | ✅ 2026-07-19 新建（66 卷表＋1189 章節數＋多段參照解析，抽自本 repo，逐格驗證） |
| `web-speech-scripture` | skill | `~/.claude/skills/`（已存在） | ✅ 已套用到 reader |
| `static-pwa-ship` | skill（跨專案） | `~/.claude/skills/static-pwa-ship/` | ✅ |
| `reading-footprint` | skill（跨專案） | `~/.claude/skills/reading-footprint/`（skill 合輯已同步） | ✅ 2026-07-03 新建（本 repo 足跡＝活範例） |
| `bible-reader-reviewer` | agent（跨專案） | `~/.claude/agents/bible-reader-reviewer.md`（skill 合輯已同步） | ✅ 2026-07-03 新建（經文正確性/localStorage 安全/PWA/長輩友善 四維審查） |
| `/ship` | slash（本 repo） | `.claude/commands/ship.md` | ✅ |
| SW-bump 提醒 | hook（本 repo） | `.claude/settings.local.json` PostToolUse | ✅ |

**跨機器擴散規則（重要）**：跨專案 skill/agent 的「正本」在 `~/.claude/skills/`、`~/.claude/agents/`，用 `/sync-skills` 推進合輯 repo 給別台機器。**別手改 plugin marketplace 副本**。MCP 優先擴充現有 `cuv`，別新建。
