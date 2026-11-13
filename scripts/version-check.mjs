// 版號一致檢查(v105 2026-11-13 立)。
// 畫面上唯一的版號 = index.html 的 APP_VERSIONS 第一筆(頁尾「版本 vN(日期)· 更新紀錄」由它寫入)。
// 規則:它必須等於 sw.js CACHE_NAME 'bible-multi-vN' 的 vN,日期必須是真的 YYYY-MM-DD。
// 部署閘門 scripts/validate-deploy.mjs 與 tests/version.test.mjs 共用這一支——不各寫一份規則。

/** 讀 APP_VERSIONS 第一筆的 v 與 d;格式被改壞就回 null。 */
export function readAppVersion(html) {
  const m = /APP_VERSIONS\s*=\s*\[\s*\{\s*"v"\s*:\s*"([^"]*)"\s*,\s*"d"\s*:\s*"([^"]*)"/.exec(String(html));
  return m ? { v: m[1], d: m[2] } : null;
}

/** 讀 sw.js 快取名的版號尾碼('bible-multi-v105' → 'v105');找不到回 null。 */
export function readSwVersion(sw) {
  const m = /CACHE_NAME\s*=\s*'bible-multi-(v\d+)'/.exec(String(sw));
  return m ? m[1] : null;
}

/** YYYY-MM-DD 且是日曆上真的有的一天(擋 2026-13-01、2026/11/13、11-13)。 */
export function isRealDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return false;
  const [y, mo, da] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, da));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === da;
}

/** 回傳失敗訊息陣列(空=通過)。 */
export function checkVersionSync(html, sw) {
  const fails = [];
  const app = readAppVersion(html);
  const swv = readSwVersion(sw);
  if (!app) fails.push('index.html 找不到 APP_VERSIONS 第一筆的 "v" / "d"(更新紀錄格式被改壞?)');
  if (!swv) fails.push("sw.js 找不到 CACHE_NAME = 'bible-multi-vN'");
  if (app && swv && app.v !== swv) {
    fails.push(`畫面版號 ${app.v}(更新紀錄第一筆)≠ SW 快取名的 ${swv}——改版時兩處要一起改`);
  }
  if (app && !isRealDate(app.d)) fails.push(`更新紀錄第一筆的日期「${app.d}」不是 YYYY-MM-DD`);
  if (!/id="appVerText"/.test(String(html)) || !/getElementById\('appVerText'\)/.test(String(html))) {
    fails.push('頁尾版本列 #appVerText,或把 APP_VERSIONS[0] 寫進它的程式不見了');
  }
  return fails;
}
