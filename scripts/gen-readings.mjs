// 產生 data/readings.json:注音(漢語拼音、不含聲調)→ 同音字串。
// 用途:關鍵字查無結果時,把「同音異字」的候選排最前(察→查、巴→八、模→摩)。
// 來源:pinyin-pro(MIT)3.29.x,建置時跑一次;瀏覽器端只讀這個 JSON,不帶 pinyin-pro。
// 格式:{ "ba": "八巴吧把爸…", "cha": "察查茶…", … }  多音字會出現在每一個讀音底下。
import { pinyin } from 'pinyin-pro';
import { writeFileSync } from 'node:fs';
const out = {};
let chars = 0, entries = 0;
for (let cp = 0x4e00; cp <= 0x9fff; cp++) {
  const c = String.fromCodePoint(cp);
  const rs = pinyin(c, { toneType: 'none', type: 'array', multiple: true });
  if (!rs.length || rs[0] === c) continue;
  chars++;
  for (const r of new Set(rs)) {
    if (!/^[a-z]+$/.test(r)) continue;
    out[r] = (out[r] || '') + c;
    entries++;
  }
}
const keys = Object.keys(out).sort();
const sorted = {};
for (const k of keys) sorted[k] = out[k];
const json = JSON.stringify(sorted);
writeFileSync(process.argv[2] || 'readings.json', json);
console.log(`chars ${chars}, entries ${entries}, syllables ${keys.length}, bytes ${Buffer.byteLength(json)}`);
