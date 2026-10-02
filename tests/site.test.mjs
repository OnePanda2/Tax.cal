/* The website must stay consistent with the engine: one generated bundle,
   one page per country, no stale country lists, and a share card that only
   uses fields the engine returns. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { ORDER, getEntry, compute, shareCardModel, defaultSpending } from '../packages/tax-core/src/index.js';
import { bundleCore, OUT } from '../scripts/build-core.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('assets/tax-core.js is up to date with packages/tax-core (run `npm run build:core`)', async () => {
  assert.equal(readFileSync(OUT, 'utf8'), await bundleCore());
});

test('the old duplicated engine files are gone and nothing loads them', () => {
  assert.ok(!existsSync(new URL('assets/tax-data.js', root)));
  assert.ok(!existsSync(new URL('assets/tax-engine.js', root)));
  for (const f of ['index.html', 'plus/index.html', 'build-artifact.mjs']) {
    assert.ok(!/tax-(data|engine)\.js/.test(read(f)), f);
  }
});

test('the browser bundle exposes the legacy globals with all 11 countries', () => {
  const ctx = { window: {} };
  vm.runInNewContext(read('assets/tax-core.js'), ctx);
  const D = ctx.window.TAXCAL_DATA, E = ctx.window.TaxEngine;
  assert.deepEqual([...D.order], [...ORDER]);
  assert.equal(D.order.length, 11);
  for (const k of ORDER) assert.ok(D.countries[k].name && D.countries[k].currency.code, k);
  for (const code of ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'INR']) assert.ok(D.fxUSD[code] > 0, code);
  const r = E.compute({ countryKey: 'IN', gross: 1500000, spend: {} });
  assert.equal(Math.round(r.direct.total), 97500);
});

test('every country has a generated landing page and a sitemap entry', () => {
  const sitemap = read('sitemap.xml');
  for (const k of ORDER) {
    const slug = getEntry(k).profile.slug;
    assert.ok(existsSync(new URL(`country/${slug}/index.html`, root)), slug);
    assert.ok(sitemap.includes(`https://taxcal.siddheshthapa.com/country/${slug}/`), `sitemap ${slug}`);
  }
  const pages = readdirSync(new URL('country/', root));
  assert.equal(pages.length, ORDER.length, 'no orphan country pages');
});

test('no stale country-count claims anywhere on the site or in the metadata', () => {
  const files = ['index.html', 'manifest.webmanifest', 'package.json', 'hidden-tax/index.html', 'tax-by-country/index.html', 'privacy/index.html'];
  for (const f of files) {
    const s = read(f);
    assert.ok(!/\bten countries\b|\b10 countries\b|six countries|all ten\b/i.test(s), `${f} still mentions an old country count`);
    assert.ok(!/Covers the UK, USA, Germany, France, Netherlands and Ireland/.test(s), f);
  }
});

test('the share card model only uses engine fields and names the region', () => {
  for (const [key, region, gross] of [['US', 'CA', 120000], ['US', 'TX', 50000], ['CA', 'QC', 80000], ['UK', null, 45000], ['IN', null, 1500000]]) {
    const r = compute({ countryKey: key, gross, filingStatus: 'single', region, spend: defaultSpending(gross) });
    const m = shareCardModel(r);
    for (const [k, v] of Object.entries(m)) assert.ok(!/undefined|NaN|null/.test(String(v)), `${key} ${k}: ${v}`);
    if (region) assert.ok(m.countryLine.includes(getEntry(key).regions[region].name), m.countryLine);
    assert.match(m.rate, /^\d+%$/);
    assert.match(m.footer, /taxcal\.siddheshthapa\.com/);
  }
});

test('the app draws the share card from the model, not from ad-hoc fields', () => {
  const app = read('assets/app.js');
  assert.ok(app.includes('ENGINE.shareCardModel(r)'));
  assert.ok(!app.includes('r.usState'));
});

test('the service worker cache and asset versions were bumped together', () => {
  const sw = read('sw.js');
  const v = sw.match(/taxcal-v(\d+)/)[1];
  assert.ok(read('index.html').includes(`assets/tax-core.js?v=${v}`));
  assert.ok(read('index.html').includes(`assets/app.js?v=${v}`));
  assert.ok(read('plus/index.html').includes(`assets/tax-core.js?v=${v}`));
});

test('the privacy page separates the website, Plus and ChatGPT, with the agreed ChatGPT wording', () => {
  const p = read('privacy/index.html');
  assert.ok(p.includes('For the ChatGPT integration, your tax inputs are sent to Tax.cal\'s calculation service to perform the requested calculation. Tax.cal does not retain those inputs for ordinary calculation requests.'));
  const kickers = ['The calculator on this website', 'Tax.cal Plus', 'Tax.cal in ChatGPT'].map((k) => p.indexOf(`<span class="kicker">${k}</span>`));
  assert.ok(kickers.every((i) => i > 0), 'one section per surface');
  // "Nothing leaves your device" is claimed for the browser calculator only.
  assert.equal(p.split('Nothing leaves your device').length - 1, 1);
  assert.ok(p.indexOf('Nothing leaves your device') < kickers[1]);
});

test('terms and support pages exist, are linked from the home page and listed in the sitemap', () => {
  const home = read('index.html');
  const sitemap = read('sitemap.xml');
  for (const page of ['privacy', 'terms', 'support']) {
    assert.ok(existsSync(new URL(`${page}/index.html`, root)), page);
    assert.ok(home.includes(`href="${page}/"`), `home links ${page}`);
    assert.ok(sitemap.includes(`https://taxcal.siddheshthapa.com/${page}/`), `sitemap ${page}`);
    assert.ok(read(`${page}/index.html`).includes('styles.css?v=' + read('sw.js').match(/taxcal-v(\d+)/)[1]), `${page} uses the current stylesheet`);
  }
});

test('docs/TAX_RULE_SOURCES.md is generated from the current rule data (run `npm run build:docs`)', async () => {
  const { render, OUT: DOC } = await import('../scripts/build-docs.mjs');
  assert.equal(readFileSync(DOC, 'utf8'), render());
});
