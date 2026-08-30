/* 多譯本聖經查詢 — Service Worker：離線殼層 + 本地譯本 JSON 快取 */
const CACHE_NAME = 'bible-multi-v100';   /* v100(0830):📖 閱讀「結束節=末節」修(使用者回報:起始節選任一節、結束節留「末節」,結果只出現起始節那一節)。根因=fetchVerses 把「只有 start」當單節,但選項標籤寫「末節」,語意應=讀到本章最後一節。修:fetchVerses 與 copyReadSelection 的「末節」都改成該譯本這一章實際的最後一節(getLocalChapter 現算,不吃 VERSE_COUNTS 的 30 fallback);Diff 分頁維持「留空=只比一節」(畫面說明文字即如此承諾),但把騙人的「末節」標籤改成「單節」。 */   /* v99(0827):帖撒羅尼迦後書在手機書卷下拉裡折成兩行修（使用者回報）——原生 <select> 展開後的清單是作業系統畫的，CSS 管不到，唯一的槓桿是把字變短；手機（≤600px）的書卷 option 只留中文全名（最長 95px，本來加上「 (2 Thess)」是 158px），桌機維持中英並列；b.engs 是 FHL API 的書卷代碼，只改顯示、沒動資料。順手收斂：閱讀與對讀比較兩個書卷下拉本來各寫一份標籤格式，現在共用 bookOptionLabel()。側效：手機上書卷/章/起始節/結束節 四個控制項現在排得進同一行。 */      /* v97(0820):📱🖥 psPing 帶 dev=m|p(停留分裝置,使用者拍板)——/stats 停留兩欄多一行手機/電腦分開統計;判裝置含 iPad 桌面模式救回(Mac+多點觸控=iPad)。零個資不變:只多一個位元分類,不送 UA。 */   /* v96(0816):併節記號修——使用者截圖回報「查詢結果出現 a」(撒上25:31 和合本/呂振中)。真相:那是信望愛資料庫的「併節」記號(內容在上一節),中文三譯本共 144 節,API 上游即如此、重抓無用。修法照 FHL 自家閱讀器慣例顯示【併於上節】,在 index.html 載入點一次正規化,data/*.json 不動(已快取的離線資料不必重抓)。 v95(0814):🎙 即時朗讀改神經人聲(曉臻)——使用者拍板 A 案。不再用 Web Speech(那就是他在 iPhone 聽到的機器聲);_speakNext/_pickVoice 已移除,無退路(守門 #27)。走 hfpc-tts Worker,伺服器 SSML 真調速,邊播邊抓下一段;拿不到音檔明說「需要連線」。同修 hfpc-tts 的 Edge 版本字串過期(見該 repo)。 v94(0814):🔊 朗讀唸標點修(使用者回報 iPhone「連標點符號一起朗讀」)——
   根因=v58(0704)加「斷句抑揚」後,切點在 。 之後,句尾的 」 會自成一段送給語音引擎;
   v58 之前是整節一句送出所以沒有這問題 ⇒ 這就是「以前都是好的」的那個以前。
   修法:沒有可唸內容(純標點)的碎片一律併回前一段 + _speakNext 第二道保險絲。
   同版:和修本譯註標記 [1] 不再混進朗讀/存語音文字(cloneNode 拔掉再讀);
   📊 對讀比較接和修本(和合本↔和修本=看同一譯本的修訂差異,神/上帝、獨生子/獨一的兒子;
   線上譯本先 ensureOnlineChapter,沒取到明說是連線問題而不是「沒有此節」)。 v93(0814):修 v92 的隱形地雷——註腳佔位符寫成「字面 NUL 位元組」而不是 '\0' 轉義,
   等於把 2 個 U+0000 直接烤進 index.html。功能正常(線上實測過),但 NUL 在原始碼裡完全看不見,
   且 git 的 binary 判定只掃前 8000 位元組 ⇒ index.html 的 NUL 在 offset 13 萬處所以躲過了、
   同一份程式抄進 7bible 的 rcuv-core.js(4KB)就被判成 binary(diff 顯示 - -)才暴露出來。
   改成 '\0' 轉義,原始碼全 ASCII、零 NUL。行為完全相同。 v92(0814):+和修本(rcuv)線上譯本=第10本(qb.php 逐章即時查;abv.php 標 candownload=0 故刻意不打包),段落標題外提、註腳做成可點開標記,純淨經文進 bibleData⇒複製/朗讀自動乾淨;全文搜尋不含線上譯本並明示;v91=彈窗頂固定本節原文;v90=變體修;v89=膠囊鈕+提示;v88=註釋內原文就地查義 */
/* ⚠ 和修本走 https://bible.fhl.net(跨來源)。第 26 行的 origin 早退是必要的:
   若讓 SW 攔跨域請求並用 caches.match('/') 當退路,Overpass/FHL 這類 API 會拿到我們自己的首頁 HTML
   而 res.ok 仍是 true ⇒ 壞得像成功(0812 sheepflock3d 實錘)。勿刪那一行。 */
/* ⚠ 版號史:git 曾停在 v73,但線上 07-24 已部署過(未 push 的)v74/v75 ⇒ 0802 我在 git 又發了同名 v74/v75=同名不同內容。
   v76 起兩線合一;以後懷疑「線上比 git 新」先跑 netlify api listSiteDeploys 比對部署時間 vs git log。 */
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/vendor/diff_match_patch.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // 本地譯本 JSON：優先快取（離線可讀四譯本）
  if (path.startsWith('/data/') && path.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          if (resp.ok) await cache.put(request, resp.clone());
          return resp;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // HTML：網路優先，失敗再用快取
  if (path === '/' || path.endsWith('/index.html')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put('/index.html', copy));
          }
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // manifest、圖示、本機 vendor 函式庫：快取優先
  if (path.endsWith('.webmanifest') || path.startsWith('/icons/') || path.startsWith('/vendor/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((resp) => {
        if (resp.ok) caches.open(CACHE_NAME).then((c) => c.put(request, resp.clone()));
        return resp;
      }))
    );
  }
});

// 🏷️ 版號回報(0820 全艦隊批次):頁尾徽章問「實際執行中的版本」,答案=本 SW 的快取名。
self.addEventListener('message', function (e) {
  if (e && e.data === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'SW_VERSION', v: CACHE_NAME });
});
