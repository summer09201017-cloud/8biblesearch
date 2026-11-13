// 版號一致測試(v105 2026-11-13 立)。單獨跑:node --test tests/version.test.mjs
// 頁尾「版本 vN(日期)· 更新紀錄」的版號只有一個來源 = index.html 的 APP_VERSIONS 第一筆,
// 它必須等於 sw.js 快取名 'bible-multi-vN' 的尾碼;不一致就紅。規則本體在 scripts/version-check.mjs
// (部署閘門 validate-deploy.mjs 也用同一支)。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkVersionSync, readAppVersion, readSwVersion, isRealDate } from '../scripts/version-check.mjs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const sw = readFileSync(new URL('sw.js', root), 'utf8');

test('更新紀錄第一筆的版號 = SW 快取名的版號', () => {
  const app = readAppVersion(html);
  const swv = readSwVersion(sw);
  assert.ok(app, 'index.html 讀不到 APP_VERSIONS 第一筆');
  assert.ok(swv, "sw.js 讀不到 CACHE_NAME = 'bible-multi-vN'");
  assert.equal(app.v, swv);
});

test('更新紀錄第一筆的日期是 YYYY-MM-DD', () => {
  assert.ok(isRealDate(readAppVersion(html).d), '日期格式錯:' + readAppVersion(html).d);
});

test('頁尾會顯示「版本 vN(日期)」,數字跟 SW 一樣', () => {
  const app = readAppVersion(html);
  const n = readSwVersion(sw).slice(1);
  // 頁面上的寫法:'版本 ' + APP_VERSIONS[0].v + '(' + APP_VERSIONS[0].d + ')'
  assert.equal('版本 ' + app.v + '(' + app.d + ')', `版本 v${n}(${app.d})`);
  assert.match(html, /id="appVerText"/, '頁尾版本列不見了');
  assert.match(html, /textContent\s*=\s*'版本 '\s*\+\s*window\.__appVersion/, '頁尾版本列不是從 APP_VERSIONS[0] 寫入');
});

test('整體檢查通過(與部署閘門同一套)', () => {
  assert.deepEqual(checkVersionSync(html, sw), []);
});

test('反例:版號錯一號、日期格式錯,檢查都要攔下', () => {
  const bumped = html.replace(/(APP_VERSIONS\s*=\s*\[\s*\{\s*"v"\s*:\s*"v)(\d+)/, (m, a, n) => a + (Number(n) + 1));
  assert.notEqual(bumped, html);
  assert.ok(checkVersionSync(bumped, sw).length > 0, '版號錯一號沒被攔下');
  const oldSw = sw.replace(/bible-multi-v(\d+)/, (m, n) => 'bible-multi-v' + (Number(n) - 1));
  assert.ok(checkVersionSync(html, oldSw).length > 0, 'SW 忘了升版沒被攔下');
  for (const d of ['2026/11/13', '2026-13-01', '11-13', '']) assert.equal(isRealDate(d), false, d);
});
