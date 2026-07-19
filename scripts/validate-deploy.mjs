#!/usr/bin/env node
// 部署閘門：Netlify build 時執行（見 netlify.toml [build].command）。
// 任何檢查失敗 → exit 1 → 部署失敗 → 線上維持上一版好的部署。
//
// 起因（2026-07-19 白屏事故）：批次注入腳本把 snippet 插進 buildNotesPrintHtml()
// 模板字串裡的 </body> 前，字串內未跳脫的 </script> 提早關閉主腳本，
// 整站 JS 變成頁面文字。本閘門的「逐塊 new Function」檢查會攔下同類錯誤：
// 只要有 </script> 混進字串裡，該區塊就會在字串中間被切斷而解析失敗。
import { readFileSync } from 'node:fs';

let failed = 0;
const fail = (msg) => { console.error('❌ ' + msg); failed = 1; };
const ok = (msg) => console.log('✅ ' + msg);

// ---- index.html ----
const html = readFileSync('index.html', 'utf8');

if (!/<\/html>\s*$/.test(html)) fail('index.html 結尾不是 </html>（檔案可能被截斷）');

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (blocks.length < 2) {
  fail(`index.html 內嵌 <script> 區塊只有 ${blocks.length} 個（預期 ≥2：主腳本＋頁尾 beacon）——` +
       '若主腳本被字串裡的 </script> 提早關閉，區塊數與大小都會異常');
}
blocks.forEach((m, i) => {
  try {
    new Function(m[1]);
    ok(`script 區塊 ${i + 1} 可解析（${m[1].length} 字元）`);
  } catch (e) {
    fail(`script 區塊 ${i + 1} JS 語法錯誤：${e.message}`);
  }
});
if (blocks[0] && blocks[0][1].length < 100000) {
  fail(`主腳本只有 ${blocks[0][1].length} 字元（正常 >150k）——可能被提早關閉，剩餘程式碼會變成頁面文字`);
}

// 列印模板字串（buildNotesPrintHtml）不得含未跳脫的 </script>
const tplEnd = html.indexOf('</body></html>`');
const firstClose = html.indexOf('</script>');
if (tplEnd > -1 && firstClose > -1 && firstClose < tplEnd) {
  fail('主腳本的 </script> 出現在列印模板字串結束之前——有 </script> 混進了模板字串');
} else if (tplEnd > -1) {
  ok('列印模板字串完整（主腳本在其之後才關閉）');
}

// ---- sw.js ----
const sw = readFileSync('sw.js', 'utf8');
try { new Function(sw); ok('sw.js 可解析'); } catch (e) { fail('sw.js JS 語法錯誤：' + e.message); }
const ver = sw.match(/CACHE_NAME\s*=\s*'bible-multi-v(\d+)'/);
if (!ver) fail("sw.js 找不到 CACHE_NAME = 'bible-multi-vN'");
else ok('SW 版本 v' + ver[1]);

if (failed) { console.error('\n🛑 驗證未通過，中止部署（線上維持前一版）'); process.exit(1); }
console.log('\n🟢 部署前驗證全數通過');
