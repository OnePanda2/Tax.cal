/* Browser smoke test of the real website (Chromium via Playwright).
 * Not part of `npm test` (Playwright is not a dependency); run it locally with
 *   node scripts/browser-smoke.mjs
 * when Playwright is installed. Serves the repo root on a random port.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function serve() {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

let chromium;
try { chromium = createRequire(import.meta.url)('playwright').chromium; }
catch { try { chromium = (await import('playwright')).chromium; } catch { console.log('SKIP: playwright not installed'); process.exit(0); } }

const server = await serve();
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/plausible|fonts\.g|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
// Block third-party requests (analytics, fonts): the app must work without them.
await page.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); else console.log('  ok  ' + msg); };

await page.goto(base + '/index.html');
await page.waitForFunction(() => document.getElementById('ringPct').textContent !== '0%');
check((await page.textContent('#heroBig')).includes('£'), 'UK example renders a £ total');
check(await page.$eval('#saveCard', (n) => !n.classList.contains('hidden')), 'UK shows the savings card');
check(await page.$eval('#indiaCard', (n) => n.classList.contains('hidden')), 'UK hides the India card');
check(/UK-2026-27-v2/.test(await page.textContent('#rulesLine')), 'rules line shows the UK rule version');
check((await page.$$eval('#country option', (o) => o.map((x) => x.value))).join() === 'UK,US,CA,AU,IE,DE,FR,NL,ES,IT,IN', 'country selector lists 11 countries with India last');

await page.selectOption('#country', 'IN');
await page.fill('#salary', '1500000');
await page.waitForFunction(() => /₹/.test(document.getElementById('heroBig').textContent));
await page.waitForTimeout(300);
check(await page.$eval('#indiaFields', (n) => !n.classList.contains('hidden')), 'India inputs are shown');
check(await page.$eval('#indiaCard', (n) => !n.classList.contains('hidden')), 'India regime card is shown');
check(await page.$eval('#saveCard', (n) => n.classList.contains('hidden')), 'India hides the savings card');
const newTax = await page.textContent('#regNew .rg-v');
check(newTax.replace(/\s/g, '') === '₹97,500', 'India ₹15 lakh new regime = ₹97,500 (got ' + newTax + ')');
check((await page.textContent('#regOld .rg-v')).replace(/\s/g, '') === '₹2,57,400', 'India ₹15 lakh old regime (no deductions) = ₹2,57,400');
check(/Tax Year 2026-27/.test(await page.textContent('#rulesLine')), 'rules line says Tax Year 2026-27');
await page.selectOption('#inRegime', 'old');
await page.fill('#inDeductions', '175000');
await page.waitForTimeout(400);
check((await page.textContent('#regOld .rg-v')).replace(/\s/g, '') === '₹2,02,800', 'old regime with ₹1.75 lakh deductions = ₹2,02,800');
check(/c=IN/.test(page.url()), 'deep link updated to #c=IN');

await page.selectOption('#country', 'US');
await page.waitForTimeout(300);
await page.selectOption('#region', 'CA');
await page.fill('#salary', '120000');
await page.waitForTimeout(400);
const card = await page.evaluate(() => window.TaxEngine.shareCardModel(window.TaxEngine.compute({ countryKey: 'US', gross: 120000, filingStatus: 'single', region: 'CA', spend: {} })));
check(card.countryLine.includes('California') && !/undefined/.test(card.countryLine), 'share card names the state (was "undefined")');
check(/State income tax \(CA\)/.test(await page.textContent('#typeRows')), 'US breakdown has a state income tax row');
check(/CA SDI/.test(await page.textContent('#typeRows')), 'California shows SDI in the social row');

await page.goto('about:blank');  // a hash-only change would not reload the app
await page.goto(base + '/index.html#c=CA&s=QC');
await page.waitForTimeout(400);
check(await page.$eval('#region', (n) => n.value) === 'QC', 'deep link #c=CA&s=QC selects Quebec');

await page.goto(base + '/country/india/');
check(/Income tax on common salaries/.test(await page.content()), 'India landing page has the salary table');

await page.goto(base + '/plus/index.html');
await page.waitForTimeout(300);
const plusCountries = await page.$$eval('#pCountry option', (o) => o.map((x) => x.value));
check(!plusCountries.includes('IN') && plusCountries.length === 10, 'Plus offers only countries with a question set (no India)');

await page.goto(base + '/tax-by-country/');
check(/India/.test(await page.content()), 'tax-by-country includes India');

// Every original country still renders a sensible result (with a region where one is required).
for (const [c, s, sym] of [['UK', '', '£'], ['US', 'NY', '$'], ['CA', 'ON', '$'], ['AU', '', '$'], ['IE', '', '€'], ['DE', '', '€'], ['FR', '', '€'], ['NL', '', '€'], ['ES', '', '€'], ['IT', '', '€']]) {
  await page.goto('about:blank');
  await page.goto(base + '/index.html#c=' + c + (s ? '&s=' + s : ''));
  await page.waitForTimeout(150);
  await page.waitForFunction(() => /\d/.test(document.getElementById('heroBig').textContent));
  const hero = await page.textContent('#heroBig');
  const sub = await page.textContent('#heroSub');
  check(hero.includes(sym) && !/NaN|undefined/.test(hero + sub), `${c}${s ? ' ' + s : ''} renders a ${sym} result (${hero.trim()})`);
}

// Legal and help pages load without errors and link to each other.
for (const [path, heading] of [['/privacy/', 'What we store'], ['/terms/', 'Estimates to help you'], ['/support/', 'Something look']]) {
  await page.goto(base + path);
  check((await page.textContent('h1')).includes(heading), `${path} renders`);
}
check(/For the ChatGPT integration, your tax inputs are sent to Tax\.cal's calculation service/.test(await (await page.goto(base + '/privacy/')).text()), 'privacy page states the ChatGPT data flow');

// PWA: the service worker installs, controls the page, and the app works offline —
// and visiting other pages online must not replace the cached home page. "Offline"
// means the server is really gone: Playwright's offline emulation does not reach
// the service worker's own fetches.
const ctx = await browser.newContext();
await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());   // also covers the service worker's own fetches
const pwa = await ctx.newPage();
pwa.setDefaultTimeout(8000);
pwa.on('pageerror', (e) => errors.push('pwa pageerror: ' + e.message));
await pwa.goto(base + '/index.html');
await pwa.evaluate(() => navigator.serviceWorker.ready);
await pwa.reload();
check(await pwa.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
check(await pwa.evaluate(async () => (await caches.keys()).includes('taxcal-v19')), 'cache taxcal-v19 created');
await pwa.goto(base + '/privacy/');
await pwa.goto(base + '/country/india/');
server.closeAllConnections(); await new Promise((r) => server.close(r));   // the network is now gone
await pwa.goto(base + '/index.html');
await pwa.waitForTimeout(300);
check((await pwa.textContent('#heroBig').catch(() => '')).includes('£'), 'offline: the calculator still loads and computes');
await pwa.goto(base + '/');
check(!!(await pwa.$('#heroBig')), 'offline: / is the calculator, not the last page visited');
await pwa.goto(base + '/country/india/');
check(/Income tax on common salaries/.test(await pwa.content()), 'offline: a visited country page is available');
await ctx.close();

check(errors.length === 0, 'no page errors (' + errors.join(' | ') + ')');
await browser.close();
if (fails.length) { console.error('\nFAILED:\n - ' + fails.join('\n - ')); process.exit(1); }
console.log('\nbrowser smoke: all checks passed');
