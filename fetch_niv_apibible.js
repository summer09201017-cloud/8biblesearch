/**
 * 自 API.Bible 下載 **正版 NIV** 全文，轉成與本專案相同結構後寫入 data/niv.json
 *
 * 說明：
 * - 網路上沒有可任意重散佈的「免費完整 NIV JSON」；NIV 為 Biblica／Zondervan 版權譯本。
 * - API.Bible 為官方合作 API，需註冊取得 api-key，並遵守 https://api.bible/terms
 * - 免費方案有呼叫次數上限；整本約需「每章 1 次」約 1189 次請求，請自行確認方案是否足夠。
 *
 * 使用方式（PowerShell）：
 *   $env:API_BIBLE_KEY="你的金鑰"
 *   node fetch_niv_apibible.js
 *
 * 若帳號內有多本聖經，可指定（選填）：
 *   $env:API_BIBLE_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *
 * 參考：https://scripture.api.bible/ ／ https://docs.api.bible/
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const HOST = 'api.scripture.api.bible';
const OUT = path.join(__dirname, 'data', 'niv.json');

// USFM 縮寫 → 與本專案相同的 bid（1–66，新教書序）
const USFM_TO_BID = {};
const ORDER = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI',
  '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER',
  'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAH', 'HAB', 'ZEP',
  'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL',
  'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE',
  '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV',
];
ORDER.forEach((u, i) => {
  USFM_TO_BID[u] = i + 1;
});
// 別名（部分 API 回傳不同縮寫）
USFM_TO_BID.EZE = USFM_TO_BID.EZK;
USFM_TO_BID.JOH = USFM_TO_BID.JHN;
USFM_TO_BID.SON = USFM_TO_BID.SNG;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function apiGet(apiKey, pathAndQuery) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: HOST,
      path: pathAndQuery,
      method: 'GET',
      headers: { 'api-key': apiKey },
      timeout: 60000,
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON 解析失敗: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

function stripTags(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 將章節純文字（含行首節號）拆成 { 1: '...', 2: '...' }
 */
function parseVersesFromText(raw) {
  const text = stripTags(raw);
  const map = {};
  if (!text) return map;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let cur = null;

  const tryMerge = (line) => {
    const m = line.match(/^(\d{1,3})\s+(.+)/);
    if (m) {
      cur = parseInt(m[1], 10);
      map[cur] = m[2].trim();
      return;
    }
    if (cur !== null) {
      map[cur] = (map[cur] || '') + ' ' + line;
    }
  };

  for (const line of lines) tryMerge(line);

  if (Object.keys(map).length === 0) {
    const global = [...text.matchAll(/\b(\d{1,3})\s+([^0-9][^]*?)(?=\s+\d{1,3}\s+|$)/g)];
    global.forEach((m) => {
      map[parseInt(m[1], 10)] = m[2].trim();
    });
  }

  return map;
}

async function resolveBibleId(apiKey) {
  const envId = process.env.API_BIBLE_ID && process.env.API_BIBLE_ID.trim();
  if (envId) {
    console.log('使用環境變數 API_BIBLE_ID:', envId);
    return envId;
  }
  const res = await apiGet(apiKey, '/v1/bibles?abbreviation=NIV');
  const list = res.data || [];
  const niv = list.find(
    (b) =>
      /^niv$/i.test(b.abbreviation || '') ||
      /new international version/i.test(b.name || '') ||
      /NIV/i.test(b.nameLocal || '')
  );
  if (!niv) {
    console.error(
      '找不到 NIV。請到 https://scripture.api.bible 後台查看你的金鑰可存取的聖經 ID，並設定：\n  set API_BIBLE_ID=你的-bibleId'
    );
    if (list.length) {
      console.error('目前金鑰可用的聖經（前 10 筆）：');
      list.slice(0, 10).forEach((b) => console.error(`  ${b.id}  ${b.abbreviation}  ${b.name}`));
    }
    process.exit(1);
  }
  console.log('使用聖經：', niv.name || niv.nameLocal, `(${niv.id})`);
  return niv.id;
}

function bookToBid(book) {
  const tokens = [book.id, book.abbreviation, book.name]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  for (const t of tokens) {
    if (USFM_TO_BID[t]) return USFM_TO_BID[t];
  }
  for (const t of tokens) {
    const m = t.match(/(GEN|EXO|LEV|NUM|DEU|JOS|JDG|RUT|1SA|2SA|1KI|2KI|1CH|2CH|EZR|NEH|EST|JOB|PSA|PRO|ECC|SNG|ISA|JER|LAM|EZK|DAN|HOS|JOL|AMO|OBA|JON|MIC|NAH|HAB|ZEP|HAG|ZEC|MAL|MAT|MRK|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JUD|REV)$/);
    if (m && USFM_TO_BID[m[1]]) return USFM_TO_BID[m[1]];
  }
  return null;
}

async function fetchChapterVerseMap(apiKey, bibleId, chapterId) {
  const base =
    `/v1/bibles/${encodeURIComponent(bibleId)}/chapters/${encodeURIComponent(chapterId)}?`;
  const common = [
    'include-verse-numbers=true',
    'include-chapter-numbers=false',
    'include-titles=false',
    'include-notes=false',
  ].join('&');

  for (const ct of ['text', 'html']) {
    try {
      const chRes = await apiGet(apiKey, `${base}content-type=${ct}&${common}`);
      const content = chRes.data && chRes.data.content;
      const raw = ct === 'html' ? stripTags(content) : content;
      const map = parseVersesFromText(raw);
      if (Object.keys(map).length > 0) return map;
    } catch (e) {
      /* 試下一種 content-type */
    }
  }
  return {};
}

async function main() {
  const apiKey = process.env.API_BIBLE_KEY && process.env.API_BIBLE_KEY.trim();
  if (!apiKey) {
    console.error('請設定環境變數 API_BIBLE_KEY（至 https://scripture.api.bible 註冊取得）');
    process.exit(1);
  }

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const bibleId = await resolveBibleId(apiKey);
  const booksRes = await apiGet(
    apiKey,
    `/v1/bibles/${encodeURIComponent(bibleId)}/books?include-chapters=true`
  );
  const books = booksRes.data || [];

  const result = {};
  for (let b = 1; b <= 66; b++) result[b] = {};

  let totalChapters = 0;
  for (const book of books) {
    const bid = bookToBid(book);
    if (bid) totalChapters += (book.chapters || []).length;
  }
  let done = 0;

  for (const book of books) {
    const bid = bookToBid(book);
    if (!bid) {
      console.warn('略過無法對應的書卷:', book.id, book.name);
      continue;
    }
    const chapters = book.chapters || [];

    for (const ch of chapters) {
      const chapNum = parseInt(ch.number, 10);
      if (!ch.id || Number.isNaN(chapNum)) continue;

      let retries = 3;
      while (retries > 0) {
        try {
          result[bid][chapNum] = await fetchChapterVerseMap(apiKey, bibleId, ch.id);
          break;
        } catch (e) {
          retries--;
          if (retries === 0) {
            console.error(`失敗 bid ${bid} 第${chapNum}章:`, e.message);
            result[bid][chapNum] = {};
          } else await sleep(1500);
        }
      }

      done++;
      if (done % 20 === 0 || done === totalChapters) {
        process.stdout.write(`\r  已下載 ${done} / ${totalChapters} 章…`);
      }
      await sleep(120);
    }
  }

  console.log('\n寫入檔案…');
  const json = JSON.stringify(result);
  fs.writeFileSync(OUT, json, 'utf8');
  console.log(`完成：${OUT}（${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB）`);
  console.log('請保留 API.Bible 版權／使用條款要求（例如應用內版權聲明）。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
