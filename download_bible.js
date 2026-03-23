const https = require('https');
const fs = require('fs');
const path = require('path');

// 信望愛 JSON API（路徑為 /json/qb.php，非 jason）
const API_BASE = 'https://bible.fhl.net/json/qb.php';
// lcc = 呂振中；esv = ESV；web = World English Bible；bbe = Bible in Basic English（信望愛 qb.php）。
// 英文「niv」槽請用 fetch_niv_apibible.js／fetch_niv_legal.js 產生 niv.json，勿在此用 qb.php 的 niv（信望愛 NIV 已壞且 NIV 有版權限制）
const VERSIONS = ['unv', 'ncv', 'kjv', 'asv', 'lcc', 'esv', 'web', 'bbe'];
const DATA_DIR = path.join(__dirname, 'data');

const BOOKS = [
  { bid:1, ch:'創', chapters:50 }, { bid:2, ch:'出', chapters:40 },
  { bid:3, ch:'利', chapters:27 }, { bid:4, ch:'民', chapters:36 },
  { bid:5, ch:'申', chapters:34 }, { bid:6, ch:'書', chapters:24 },
  { bid:7, ch:'士', chapters:21 }, { bid:8, ch:'得', chapters:4 },
  { bid:9, ch:'撒上', chapters:31 }, { bid:10, ch:'撒下', chapters:24 },
  { bid:11, ch:'王上', chapters:22 }, { bid:12, ch:'王下', chapters:25 },
  { bid:13, ch:'代上', chapters:29 }, { bid:14, ch:'代下', chapters:36 },
  { bid:15, ch:'拉', chapters:10 }, { bid:16, ch:'尼', chapters:13 },
  { bid:17, ch:'斯', chapters:10 }, { bid:18, ch:'伯', chapters:42 },
  { bid:19, ch:'詩', chapters:150 }, { bid:20, ch:'箴', chapters:31 },
  { bid:21, ch:'傳', chapters:12 }, { bid:22, ch:'歌', chapters:8 },
  { bid:23, ch:'賽', chapters:66 }, { bid:24, ch:'耶', chapters:52 },
  { bid:25, ch:'哀', chapters:5 }, { bid:26, ch:'結', chapters:48 },
  { bid:27, ch:'但', chapters:12 }, { bid:28, ch:'何', chapters:14 },
  { bid:29, ch:'珥', chapters:3 }, { bid:30, ch:'摩', chapters:9 },
  { bid:31, ch:'俄', chapters:1 }, { bid:32, ch:'拿', chapters:4 },
  { bid:33, ch:'彌', chapters:7 }, { bid:34, ch:'鴻', chapters:3 },
  { bid:35, ch:'哈', chapters:3 }, { bid:36, ch:'番', chapters:3 },
  { bid:37, ch:'該', chapters:2 }, { bid:38, ch:'亞', chapters:14 },
  { bid:39, ch:'瑪', chapters:4 }, { bid:40, ch:'太', chapters:28 },
  { bid:41, ch:'可', chapters:16 }, { bid:42, ch:'路', chapters:24 },
  { bid:43, ch:'約', chapters:21 }, { bid:44, ch:'徒', chapters:28 },
  { bid:45, ch:'羅', chapters:16 }, { bid:46, ch:'林前', chapters:16 },
  { bid:47, ch:'林後', chapters:13 }, { bid:48, ch:'加', chapters:6 },
  { bid:49, ch:'弗', chapters:6 }, { bid:50, ch:'腓', chapters:4 },
  { bid:51, ch:'西', chapters:4 }, { bid:52, ch:'帖前', chapters:5 },
  { bid:53, ch:'帖後', chapters:3 }, { bid:54, ch:'提前', chapters:6 },
  { bid:55, ch:'提後', chapters:4 }, { bid:56, ch:'多', chapters:3 },
  { bid:57, ch:'門', chapters:1 }, { bid:58, ch:'來', chapters:13 },
  { bid:59, ch:'雅', chapters:5 }, { bid:60, ch:'彼前', chapters:5 },
  { bid:61, ch:'彼後', chapters:3 }, { bid:62, ch:'約一', chapters:5 },
  { bid:63, ch:'約二', chapters:1 }, { bid:64, ch:'約三', chapters:1 },
  { bid:65, ch:'猶', chapters:1 }, { bid:66, ch:'啟', chapters:22 },
];

const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b.chapters, 0);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function cleanText(t) {
  if (!t) return '';
  return t.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

async function downloadVersion(version) {
  const result = {};
  let done = 0;
  const total = TOTAL_CHAPTERS;
  const startTime = Date.now();

  for (const book of BOOKS) {
    result[book.bid] = {};
    for (let chap = 1; chap <= book.chapters; chap++) {
      const url = `${API_BASE}?chineses=${encodeURIComponent(book.ch)}&chap=${chap}&version=${version}&gb=0&strong=0`;
      let retries = 3;
      while (retries > 0) {
        try {
          const data = await fetchJSON(url);
          if (data.status === 'success' && data.record) {
            const chapData = {};
            data.record.forEach(r => {
              chapData[r.sec] = cleanText(r.bible_text);
            });
            result[book.bid][chap] = chapData;
          }
          break;
        } catch (err) {
          retries--;
          if (retries === 0) {
            console.error(`  FAIL: ${book.ch} ${chap} - ${err.message}`);
            result[book.bid][chap] = {};
          } else {
            await sleep(1000);
          }
        }
      }
      done++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = ((done / total) * 100).toFixed(1);
      process.stdout.write(`\r  [${version}] ${pct}% (${done}/${total}) ${book.ch} ${chap}章 - ${elapsed}s`);
      await sleep(80);
    }
  }
  console.log();
  return result;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log(`下載聖經資料到 ${DATA_DIR}`);
  console.log(`共 ${VERSIONS.length} 個版本 × ${TOTAL_CHAPTERS} 章 = ${VERSIONS.length * TOTAL_CHAPTERS} 次 API 呼叫\n`);

  for (const ver of VERSIONS) {
    const outPath = path.join(DATA_DIR, `${ver}.json`);
    if (fs.existsSync(outPath)) {
      const stats = fs.statSync(outPath);
      if (stats.size > 100000) {
        console.log(`[${ver}] 已存在 (${(stats.size / 1024 / 1024).toFixed(1)} MB)，跳過。刪除檔案可重新下載。`);
        continue;
      }
    }
    console.log(`[${ver}] 開始下載...`);
    const data = await downloadVersion(ver);
    const json = JSON.stringify(data);
    fs.writeFileSync(outPath, json, 'utf8');
    console.log(`[${ver}] 完成！檔案大小: ${(Buffer.byteLength(json) / 1024 / 1024).toFixed(1)} MB`);
  }

  console.log('\n全部完成！');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
