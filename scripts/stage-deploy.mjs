// 部署資料夾 .deploy/:只放網站真正用到的檔(v105 2026-11-13 立)。
// 由來:publish="." 會把 CLAUDE.md、交接檔、腳本、測試全部發出去。netlify.toml 的 404 轉址只擋得住
//   「大小寫一模一樣」的網址——實測 Netlify 找檔案不分大小寫、轉址規則卻分,/claude.md 照樣吐出 CLAUDE.md。
//   ⇒ 根治=內部檔根本不上傳。netlify.toml 的 [build] command 跑完部署閘門就跑這支,publish 指向 .deploy。
// 新增網站要用到的檔或資料夾 ⇒ 加進下面的清單(漏了 = 線上 404,部署後 curl 會看到)。
import { rmSync, mkdirSync, cpSync, existsSync, readdirSync } from 'node:fs';

const OUT = '.deploy';
const FILES = ['index.html', 'sw.js', 'manifest.webmanifest'];
const DIRS = ['icons', 'vendor', 'data'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) {
  if (!existsSync(f)) { console.error('❌ 少了網站必要檔:' + f); process.exit(1); }
  cpSync(f, `${OUT}/${f}`);
}
for (const d of DIRS) {
  if (!existsSync(d)) { console.error('❌ 少了網站必要資料夾:' + d); process.exit(1); }
  // data/_tmp*.json 是下載過程的暫存檔(.gitignore 也排除),不上線
  cpSync(d, `${OUT}/${d}`, { recursive: true, filter: (src) => !/[\\/]_tmp[^\\/]*$/.test(src) });
}

// 自我檢查:頂層只能有清單上的東西(擋「有人往 .deploy 裡多塞文件」)
const top = readdirSync(OUT).sort();
const allowed = [...FILES, ...DIRS].sort();
if (JSON.stringify(top) !== JSON.stringify(allowed)) {
  console.error('❌ .deploy 頂層不是預期清單:' + top.join(', '));
  process.exit(1);
}
const n = (d) => readdirSync(`${OUT}/${d}`).length;
console.log(`✅ .deploy 已備妥:${FILES.join(' / ')} + icons(${n('icons')}) vendor(${n('vendor')}) data(${n('data')});文件、腳本、測試不上傳`);
