/**
 * 產生 data/niv.json（應用程式內仍用代碼 niv 載入此檔）
 *
 * 信望愛 qb.php?version=niv 目前無法使用；Zondervan NIV 亦不可任意重散佈。
 * 若要 **正版 NIV**，請改用 fetch_niv_apibible.js（API.Bible 金鑰）。
 * 此腳本改採公版英譯 BBE（Bible in Basic English），來源：
 *   https://github.com/thiagobodruk/bible/blob/master/json/en_bbe.json
 * （專案多為 MIT／資料為公版譯本，請自行參考該 repo 授權說明）
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const SOURCE_URL =
  'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json';
const OUT = path.join(__dirname, 'data', 'niv.json');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { timeout: 120000 }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject)
      .on('timeout', function () {
        this.destroy();
        reject(new Error('timeout'));
      });
  });
}

function cleanText(t) {
  if (!t) return '';
  return String(t).replace(/<\/?[^>]+(>|$)/g, '').trim();
}

function convert(arr) {
  if (!Array.isArray(arr) || arr.length !== 66) {
    throw new Error(`預期 66 卷，實際 ${arr ? arr.length : 0}`);
  }
  const result = {};
  for (let bi = 0; bi < 66; bi++) {
    const book = arr[bi];
    const bid = bi + 1;
    result[bid] = {};
    const chaps = book.chapters;
    if (!Array.isArray(chaps)) continue;
    for (let ci = 0; ci < chaps.length; ci++) {
      const chapNum = ci + 1;
      const verses = chaps[ci];
      if (!Array.isArray(verses)) continue;
      result[bid][chapNum] = {};
      for (let vi = 0; vi < verses.length; vi++) {
        result[bid][chapNum][vi + 1] = cleanText(verses[vi]);
      }
    }
  }
  return result;
}

async function main() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  console.log('下載 BBE JSON（公版英譯）…');
  let raw = await fetchText(SOURCE_URL);
  raw = raw.replace(/^\uFEFF/, '');
  const arr = JSON.parse(raw);
  const out = convert(arr);
  const json = JSON.stringify(out);
  fs.writeFileSync(OUT, json, 'utf8');
  console.log(`已寫入 ${OUT}（${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB）`);
  console.log('註：檔名維持 niv.json 以配合現有網頁代碼 niv；內容為 BBE，非 Zondervan NIV。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
