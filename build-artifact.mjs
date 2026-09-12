/* Build single-file outputs from the source files.
 *   dist/index.single.html  — full standalone HTML (drop it on any static host)
 *   dist/taxcal-artifact.html — body-only, for publishing as a claude.ai Artifact
 * Run:  node build-artifact.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const css = read('./styles.css');
const js = [read('./assets/tax-data.js'), read('./assets/tax-engine.js'), read('./assets/app.js')].join('\n');

let html = read('./index.html');

// strip PWA-only bits (manifest link, theme-color meta, service-worker registration)
html = html.replace(/<!-- PWA:start -->[\s\S]*?<!-- PWA:end -->/g, '');

// Inline CSS and JS.
// NB: the replacement MUST be a function. As a plain string, `$` sequences are
// interpreted as replacement patterns — and `symbol: '$'` in tax-data.js contains
// `$'`, which means "everything after the match" and silently splices the tail of
// the document into the middle of the data file. Broke US, Canada and Australia.
html = html.replace(/<link rel="stylesheet" href="styles\.css(?:\?[^"]*)?">/, () => `<style>\n${css}\n</style>`);

// inline JS (data + engine + app in order)
html = html
  .replace(/<script src="assets\/tax-data\.js(?:\?[^"]*)?"><\/script>\s*/, '')
  .replace(/<script src="assets\/tax-engine\.js(?:\?[^"]*)?"><\/script>\s*/, '')
  .replace(/<script src="assets\/app\.js(?:\?[^"]*)?"><\/script>/, () => `<script>\n${js}\n</script>`);

// Sanity check: the CSS and JS must survive inlining byte-for-byte. This is the
// guard against the `$`-pattern class of bug above, which fails silently.
if (!html.includes(js)) throw new Error('Inlined JS does not match source — check for $ replacement patterns.');
if (!html.includes(css)) throw new Error('Inlined CSS does not match source — check for $ replacement patterns.');

mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });

// (a) standalone single file
writeFileSync(new URL('./dist/index.single.html', import.meta.url), html);

// (b) artifact body: strip the document wrapper (claude.ai injects head/charset/viewport)
let art = html
  .replace(/<!doctype html>/i, '')
  .replace(/<html[^>]*>/i, '')
  .replace(/<\/html>/i, '')
  .replace(/<head>/i, '')
  .replace(/<\/head>/i, '')
  .replace(/<body[^>]*>/i, '')
  .replace(/<\/body>/i, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<title>[\s\S]*?<\/title>/i, '<title>Tax.cal</title>')
  .trim();

writeFileSync(new URL('./dist/taxcal-artifact.html', import.meta.url), art);

console.log('Built dist/index.single.html and dist/taxcal-artifact.html');
