#!/usr/bin/env node
// 部署閘門 v2(品質守門員)。Netlify build 時執行(netlify.toml [build].command,帶 --selftest)。
// 任何檢查失敗 → exit 1 → 部署失敗 → 線上維持上一版。本機 push 前由全域 hook deploy-gate-pre-push.mjs 跑同一支。
//
// 起因(2026-07-19 兩起事故):
//   ① 白屏:beacon snippet 插進 buildNotesPrintHtml() 模板字串,未跳脫的 </script> 提早關閉主腳本。
//   ② VERSE_COUNTS 常數與資料檔脫節(民數記漏第 9 章、箴言漏 10 章、林前16=10),節選單錯 43+ 格。
//
// --selftest:先拿 tests/fixtures/broken-20260719-whitescreen.html(①的真兇)驗「閘門抓得到」,
//            再驗正式檔。守門員先驗自己,才不會有人日後重構時悄悄弄丟關鍵檢查。
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const SELFTEST = process.argv.includes('--selftest');
const FIXTURE = 'tests/fixtures/broken-20260719-whitescreen.html';

// ---- 可重用檢查核心:回傳 failures 陣列(空=通過) ----
function checkHtml(html, label) {
  const fails = [];
  if (!/<\/html>\s*$/.test(html)) fails.push(`${label} 結尾不是 </html>(檔案可能被截斷)`);
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (blocks.length < 2) fails.push(`${label} 內嵌 <script> 區塊只有 ${blocks.length} 個(預期 ≥2:主腳本＋頁尾 beacon)`);
  blocks.forEach((m, i) => {
    try { new Function(m[1]); } catch (e) { fails.push(`${label} script 區塊 ${i + 1} JS 語法錯誤:${e.message}`); }
  });
  if (blocks[0] && blocks[0][1].length < 100000) {
    fails.push(`${label} 主腳本只有 ${blocks[0][1].length} 字元(正常 >150k)——可能被字串裡的 </script> 提早關閉`);
  }
  // 列印模板字串(buildNotesPrintHtml)不得含未跳脫的 </script>
  const tplEnd = html.indexOf('</body></html>`');
  const firstClose = html.indexOf('</script>');
  if (tplEnd > -1 && firstClose > -1 && firstClose < tplEnd) {
    fails.push(`${label} 主腳本的 </script> 出現在列印模板字串結束之前——有 </script> 混進了模板字串`);
  }
  // git 衝突標記殘留
  if (/^(<{7}|={7}|>{7})( |$)/m.test(html)) fails.push(`${label} 殘留 git 衝突標記(<<<<<<< / ======= / >>>>>>>)`);
  return fails;
}

let failed = 0;
const fail = (m) => { console.error('❌ ' + m); failed = 1; };
const ok = (m) => console.log('✅ ' + m);

// ---- 0. selftest:閘門必須抓得到「真兇」fixture ----
if (SELFTEST) {
  if (!existsSync(FIXTURE)) fail(`selftest fixture 不見了:${FIXTURE}(守門員失憶——請從 git 歷史救回)`);
  else {
    const brokenFails = checkHtml(readFileSync(FIXTURE, 'utf8'), 'fixture');
    if (brokenFails.length === 0) fail('🚨 閘門對 07-19 白屏真兇 fixture 全部放行——關鍵檢查被弄丟了,禁止部署!');
    else ok(`selftest:真兇 fixture 被 ${brokenFails.length} 項檢查攔下(閘門健在)`);
  }
}

// ---- 1. index.html 結構完整性 ----
const htmlFails = checkHtml(readFileSync('index.html', 'utf8'), 'index.html');
htmlFails.forEach(fail);
if (htmlFails.length === 0) ok('index.html 結構完整(script 逐塊可解析/模板字串完整/無衝突標記)');

// ---- 2. sw.js ----
const sw = readFileSync('sw.js', 'utf8');
try { new Function(sw); ok('sw.js 可解析'); } catch (e) { fail('sw.js JS 語法錯誤:' + e.message); }
const ver = sw.match(/CACHE_NAME\s*=\s*'bible-multi-v(\d+)'/);
if (!ver) fail("sw.js 找不到 CACHE_NAME = 'bible-multi-vN'");
else ok('SW 版本 v' + ver[1]);

// ---- 3. 資料檔:data/*.json 都要能 JSON.parse(抓截斷/壞檔) ----
const html = readFileSync('index.html', 'utf8');
let dataFiles = [];
try { dataFiles = readdirSync('data').filter((f) => f.endsWith('.json') && !f.startsWith('_')); } catch (e) { fail('讀不到 data/ 目錄:' + e.message); }
const datasets = {};
for (const f of dataFiles) {
  try {
    const j = JSON.parse(readFileSync('data/' + f, 'utf8'));
    if (!j || Object.keys(j).length === 0) fail(`data/${f} 是空物件`);
    else datasets[f.replace('.json', '')] = j;
  } catch (e) { fail(`data/${f} JSON 解析失敗:${e.message}`); }
}
if (dataFiles.length && !failed) ok(`data/*.json ${dataFiles.length} 檔全部可解析`);

// ---- 4. VERSE_COUNTS 常數 ↔ 資料檔一致(07-19 事故②的迴歸防線) ----
// 規則:每章節數 = 所有譯本資料檔該章最大節號的最大值(涵蓋約7:53 這類版本差異)。
try {
  const vcSrc = /const VERSE_COUNTS = \{(.*?)\};/.exec(html);
  if (!vcSrc) fail('index.html 找不到 VERSE_COUNTS 常數');
  else {
    const vc = new Function('return {' + vcSrc[1] + '}')();
    let cellBad = 0;
    for (let bid = 1; bid <= 66; bid++) {
      const arr = vc[bid] || [];
      for (let c = 1; c <= arr.length; c++) {
        let mx = 0;
        for (const d of Object.values(datasets)) {
          const ch = d[String(bid)] && d[String(bid)][String(c)];
          if (ch) mx = Math.max(mx, ...Object.keys(ch).map(Number));
        }
        if (mx && arr[c - 1] !== mx) { cellBad++; if (cellBad <= 5) fail(`VERSE_COUNTS 書${bid} ${c}章=${arr[c - 1]},資料=${mx}`); }
      }
    }
    if (cellBad > 5) fail(`VERSE_COUNTS 共 ${cellBad} 格與資料不一致(僅列前 5)`);
    if (cellBad === 0) ok('VERSE_COUNTS 1189 章逐格與資料檔一致');
  }
} catch (e) { fail('VERSE_COUNTS 檢查失敗:' + e.message); }

// ---- 5. manifest ----
try { JSON.parse(readFileSync('manifest.webmanifest', 'utf8')); ok('manifest.webmanifest 可解析'); }
catch (e) { fail('manifest.webmanifest 壞了:' + e.message); }

if (failed) { console.error('\n🛑 部署閘門未通過,中止部署(線上維持前一版)'); process.exit(1); }
console.log('\n🟢 部署閘門全數通過');
