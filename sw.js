/* 多譯本聖經查詢 — Service Worker：離線殼層 + 本地譯本 JSON 快取 */
const CACHE_NAME = 'bible-multi-v93';   /* v93(0814):修 v92 的隱形地雷——註腳佔位符寫成「字面 NUL 位元組」而不是 '\0' 轉義,
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
