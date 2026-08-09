# 多譯本聖經查詢 — Roadmap（對齊現況 2026-08-09）

> 給接手的人/AI：這份是「**已完成 vs 真正待做**」的單一真相。已完成的別重做；待做的按 CP 值排序。
> ⚠ **部署是手動的**：07-20 起 netlify.toml `ignore = "exit 0"`+站台 stop_builds 斷開雲端 auto-build，
> **push 不會上線**——發佈=`node scripts/validate-deploy.mjs && netlify deploy --prod --dir . --site c889cd5e-6bec-4008-a0ee-34875aa20585`
> （zero-pii-guard 會攔 `diff_match_patch.js` 作者信箱＝已知啟發式誤判：**先跑一次不帶旗標**，
> 確認命中清單「只剩」那一條誤判，再單次手打豁免旗標重跑——旗標**不要寫進文件或腳本**，0801 教訓）。
> repo `summer09201017-cloud/8biblesearch`。SW 目前 **v90**。

---

## ✅ 已完成(2026-08-10,DEYI 機——v88/v89/v90 已部署上線)

- 🔤 **v90 原文編號變體修**(使用者回報「歌羅西之後/舊約沒有原文」⇒ 0810 全 66 卷掃描:一半是資料
  現實=FHL 註釋很多段落本來就沒放編號;一半是真 bug=**兩種變體格式被 regex 漏掉**——哀歌
  `SNH 57`(字母與數字間有空格)、羅馬書裸 `SN00846`(不帶 G/H)。修法:字母可省(用書卷新舊約
  推語言)、容許空白;哀歌 1:1 從 0 顆變 4 顆可查。⚠ 資料現實要知道:士師記~列王紀/以斯拉~約伯/
  耶利米/但以理/小先知多數/馬可/以弗所~提多/雅各~猶大等卷,FHL 註釋抽樣皆無編號(誰寫的註釋
  就有沒有,不是程式問題);創/詩/賽/哈巴谷/歷代下/箴言與保羅書信多數卷有。)

- 👁 **v89 原文編號「找得到」修**（使用者實測回饋「在註釋裡找不到原文」——SG/SH 編號長得跟一般
  藍色連結一模一樣，零辨識度）：編號改**淡黃膠囊鈕＋「字義」後綴**（`.cm-sn` chip＋`::after`）、
  該段有編號時面板頂加一行 💡 提示。⚠ 順帶教訓：sw.js 版號註解是**跨行 comment**，用「取代到行尾」
  的 regex 改版號會砍掉註解開頭 → 語法錯（validate-deploy 當場攔下，線上沒事）。

- ✡ **v88 註釋內原文編號就地查義**（使用者拍板「原文做在註釋裡」——v80 已把 SNG/SNH 連結化，
  但點了外跳信望愛新分頁＝長輩迷路）：改站內就地展開——點 SG/SH 編號 → 註釋段落下插中文字義卡
  （sd.php `N=0新約/1舊約`＋`bible-strongs-dict-v1` localStorage LRU 200 快取＝查過離線可重看，
  是快取**不進備份鏈**）、卡內 `#參照|` 與巢狀 SN 一樣可點（遞迴）、卡尾留「在信望愛開啟 →」
  逃生口、再點同顆收合、字級跟註釋滑桿。strongs core 貼自 **skill `fhl-bible-api` 正本**
  （去 export 貼上＝tts-fix 同法，勿就地改）。與 7bible 分工：8bible 只在註釋裡查義（不推高
  功能密度）；「點經文任意詞看原文」是 7bible（查經站）的 v23 功能，**本站刻意不做**。

**下午第二批（v83~v87）**
- 🗑 **v83 拿掉「清除全部足跡」鈕＋函式**（使用者終局拍板：不清除路線——足跡珍貴，要的是備份與移交；
  不想記就停用，記錄保留；7bible 也不補清除鈕，案結）。
- 📱 **v84 註釋排版二修**（使用者四張截圖回饋「句子被切斷＋大片空白」）：FHL com_text 是固定寬度
  硬換行＋深縮排的 pre 排版 → `reflowComText` 重排（大綱標記行開新段、接續行併回同段、縮排轉
  padding-left）；真資料驗證創/羅 71 行→24 段零殘留換行。
- 🧓 **v85 簡易模式**：設定頁最上方開關——開＝只留「經文閱讀＋設定/資料」兩分頁（其餘收起、
  資料都在、隨時可關，兩顆分頁放大好按）；`bible-simple-mode` 裝置層偏好不進備份。
- 📅 **v86 讀經計畫 1/2/3 年＋自訂年數**（使用者拍板★★★★★）：足跡分頁頂部計畫卡——今天該讀哪幾章
  （chips 點了直接翻開、讀過自動 ✅＝接足跡現算不另存進度）、進度條＋落後溫和提醒、停止有 confirm；
  `bible-reading-plan` 接滿備份鏈七站；離線驗證 66 卷/1189 章/六種年數分配全過。
  同版：足跡預設範圍改「歷年」（使用者點名）。
- 🔍 **v87 搜尋結果上下文預覽**：每筆結果「⊕ 前後文」——不跳頁原地展開前後各 2 節（第一個已載入
  勾選譯本、命中節高亮、VERSE_COUNTS 夾節數、附開啟整章）；與 7bible v22 同一互動模式。

**上午～中午（v80~v82）**

- 📱 **v80 註釋修復（iPhone 使用者截圖回饋）**：信望愛註釋右半被截＋字級滑桿無效（10px 沒反應）。
  根因＝跨域 iframe：FHL com.php 無 viewport meta＋內容包 `<pre>` 長行永不換行；iOS 對 iframe 的
  CSS zoom 無效。修法＝**棄 iframe 主路徑**，改走 FHL 開放 JSON API（`json/sc.php`，帶 Origin 有 CORS）
  抓 `com_text` 原生排版：pre-wrap 換行、字級直設自家 div（iOS 有效）、上一段/下一段導航（API 自帶
  prev/next）、`#參照|`→read.php 連結、`SNH/SNG`→s.php 連結（希伯來 N=1/希臘 N=0）、XSS 跳脫；
  iframe 降為離線/API 掛掉備援。真資料煙測：創/羅 50 標記全轉連結零殘留。
- 🔖 **v81 譯本勾選自動記住**（使用者原話「每次都要手動勾選，有點麻煩」）：新鍵 `bible-active-versions`，
  啟動還原（無效碼過濾、空陣列退預設 5 本）、勾選即存、**接滿備份鏈七站**（JSON 匯出/匯入、快照存/還原、
  雲端 payload/手動還原/啟動自動還原，還原後補載資料檔 `ensureActiveVersionsData`）；
  順手把 `bible-version-order` 補進 JSON 匯出/匯入（0809 審查 A3 的本站半）。
- 📊 **v82 A0 匿名統計誠信揭露**：設定頁新區塊講清楚送什麼（開啟次數+停留秒數，無帳號無內容）＋
  「參與匿名使用統計」開關（`bible-stats-optout`，裝置層偏好刻意不進備份）；psPing 單一閘口，
  關掉=開啟/停留/心跳三種 beacon 全斷。治「站內寫只存這台裝置、實際有送統計」的承諾不符。
- 🛡 **v82 A1 localStorage 裸寫全修**：頂層裸 `JSON.parse(getItem)`（瀏覽器封鎖站台資料=SecurityError
  =整站白屏）包 try 給 `{}`；saveUserData 失敗吐 toast 提醒先匯出；歷史三函式（load/save/delete）
  包 try+陣列驗型；快照還原整段包 try 防「半還原」；匯出/快照/雲端 payload 讀取走 `lsGetRaw()`。
- 🧰 能力面（skills repo）：hook `zero-pii-guard` 禁字表「整檔去逗號→VERSE_COUNTS 相鄰數字黏合」
  誤判修復——本站部署曾被兩條假命中卡死；詳見大表 0809 第三十八版段。

---

## ✅ 已完成（別重做）

**2026-07-19（agape250 機）白屏事故閉環＋部署閘門＋VERSE_COUNTS 修正**
- 🚨 **白屏事故修復**：07-19 凌晨的 play-stats beacon 批次把 snippet 插進 `buildNotesPrintHtml()` 模板字串（字串裡含 `</body></html>`），未跳脫的 `</script>` 提早關閉主腳本 → 整站 JS 變頁面文字。已把 beacon 移到真正頁尾獨立 `<script>`（統計功能保留，`ps-last-8biblesearch` 為 10 分去重鍵）。
- 🛡 **部署閘門 v2**（`scripts/validate-deploy.mjs`，netlify.toml `[build].command` 帶 `--selftest`）：真兇 fixture 常駐自測（`tests/fixtures/broken-20260719-whitescreen.html`，閘門抓不到它＝禁止部署）＋內嵌 JS 逐塊解析＋列印模板完整性＋git 衝突標記＋`data/*.json` 完整性＋**VERSE_COUNTS↔資料逐格一致**＋SW/manifest。另有全域 pre-push hook（skill `deploy-gate`）在本機 push 前跑同一支。
- 🐛 **VERSE_COUNTS 43+ 格錯值修正**：手抄常數民數記漏第 9 章（後 27 章位移）、箴言漏 10 章、撒上 20/23/24、林前 16 錯值——節選單錯了幾個月。已改「9 譯本資料檔最大值」程式化重生成（約 7:53 是版本差異故取最大）。教訓：常數由資料生成＋閘門對賬，不手抄。
- 📑 分頁順序：「📖 足跡」與「快速查詢」交換（足跡第 3 格）。現順序：閱讀／搜尋／📖 足跡／快速查詢／筆記／📊 對讀／設定。
- 🏆 **讀完一卷書 → 彩帶＋里程碑**（原待做 #2）：足跡 `m` 桶現算「某卷全部章讀過」；讀完當下中心爆彩帶（win-confetti 範式：零相依、reduced-motion 尊重、自清）＋toast。足跡分頁新增「🏆 讀完卷數」統計卡、「🏆 讀完的書卷」金色 chips、「還差 N 章就讀完」前 3 目標、地圖書名掛 🏆。`bible-book-milestones` 只記「慶祝過沒」（防重複），完成判定永遠從 log 現算；啟動/匯入/還原時靜默 backfill（彩帶只留給讀完當下）；清除足跡連同清掉。已接備份鏈七站。
- 📤 **足跡月報分享卡**（原待做 #5）：足跡分頁「📤 產生本月讀經卡」→ canvas 畫 1080×1440 直式 PNG（本月章次/連續天數/全卷 %/🏆 卷數＋本月日曆熱圖＋熱區前 3＋金句詩 119:105 已 cuv 核對）→ modal 預覽＋「📤 分享(LINE)」（Web Share files，不支援自動退下載）＋「⬇️ 下載」。固定亮色不隨主題；圓角用手繪 path（舊 iOS Safari 無 roundRect）。
- SW v58→**v63**（v59 beacon 批次、v60 白屏修復、v61 分頁交換、v62 VERSE_COUNTS、v63 里程碑+月報卡）。

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

## 🔜 待做（0809 起與大表「📖 閱讀站佇列」對齊——那邊是跨站單一真相，本表只列本站的）

| # | 項目 | 類型 | ★價值 | ⏱開發 | 備註 |
|---|------|------|------|------|------|
| 1 | **聽經播放器**：hfpc-tts 整章音檔＋Media Session 鎖屏控制＋自動下一章 | 功能 | ★★★★ | ~1天 | 舊「朗讀增強」卡升級版＝大表「讀7」 |
| 2 | **語音輸入查詢**（說「約翰福音三章十六節」就查） | 功能 | ★★★ | ~半天 | 大表「讀8」 |
| 3 | **每日金句／今日經文卡**（開啟依日期顯示一節，可朗讀） | 功能 | ★★★★ | ~2hr | 照 [[daily-verse]]「每天同一句要確定性」 |
| 4 | **清理巢狀舊 repo**（`聖經查詢CUR/聖經查詢CUR/...` 3 層） | 整理 | ★★★★ | ~30min | **需使用者點頭才刪 git**;桌面 06-29 交接快照一併處理 |
| 5 | **經文分享圖卡**（canvas 產金句圖分享 LINE） | 功能 | ★★★ | ~半天 | buildMonthCardCanvas 範式可複用 |
| 6 | **部署後 Playwright smoke**（線上抓 console error/白屏） | 流程 | ★★ | ~1hr | 派 web-smoke-verifier agent，不進 Netlify build |
| 待議 | 串珠交叉引用移植（0809 Opus 5 二審主張退貨/我方保留） | 功能 | — | ~1天 | **若做必須預設收合在進階**，簡易模式已落地（v85），可再議＝大表「待議」列 |

> 0809 完工移出：讀經計畫 1/2/3 年＋自訂（v86）、簡易模式（v85）——見上方已完成段。

> 舊 #5「pre-push-guard 裝到本 repo」已由更強方案取代（07-19 deploy-gate 雙保險）；舊 #2 讀完一卷書彩帶、舊 #5 足跡月報分享卡已於 07-19 完成（見上方已完成段）。

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
