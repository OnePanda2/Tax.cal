/* The ChatGPT plugin package (taxcal-plugin/): Agent Plugins schemas, OpenAI's
   listing and review requirements, the skill format, no secrets or local
   paths, a reproducible ZIP, and test cases whose expectations are checked
   against the real MCP tools — so the numbers reviewers see cannot drift
   from the engine. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { checkPackage, packageEntries, packageFiles, buildZip, readZip, scanText, contrast } from '../scripts/plugin-package.mjs';
import { TOOLS, callTool } from '../mcp/src/tools.js';

const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const manifest = json('../taxcal-plugin/plugin.json');
const mcpConfig = json('../taxcal-plugin/mcp.json');
const cases = json('../taxcal-plugin/tests/cases.json').cases;
const submission = json('../mcp/chatgpt-app-submission.json');
const ext = manifest.extensions['com.openai'];
const TOOL_NAMES = TOOLS.map((t) => t.name);

test('plugin.json and mcp.json validate against the Agent Plugins 1.0.0 schemas', () => {
  const ajv = new Ajv2020({ allErrors: true });
  for (const [doc, schema] of [[manifest, json('./fixtures/agent-plugins/1.0.0/plugin.schema.json')], [mcpConfig, json('./fixtures/agent-plugins/1.0.0/mcp.schema.json')]]) {
    const ok = ajv.validate(schema, doc);
    assert.ok(ok, ajv.errorsText());
  }
});

test('the package meets OpenAI’s listing, review and skill requirements', () => {
  assert.deepEqual(checkPackage(), []);
});

test('the package check catches the problems it is meant to catch', () => {
  assert.ok(scanText('x.md', 'key: ' + ['sk', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')).length);   // built at runtime so no key-shaped string sits in the repo
  assert.ok(scanText('x.md', 'password: hunter2').length);
  assert.ok(scanText('x.md', 'see /home/alice/notes').length);
  assert.ok(scanText('x.md', 'C:\\Users\\alice\\plugin').length);
  assert.ok(scanText('x.md', 'url http://localhost:8787/mcp').length);
  assert.deepEqual(scanText('x.md', 'Tax.cal never stores your password-free calculations.'), []);
  assert.ok(checkPackage({ mcpUrl: 'http://example.com/mcp' }).some((p) => /https URL/.test(p)));
  assert.ok(contrast('#FFFF00', '#FFFFFF') < 2, 'yellow on white would fail the brand-colour rule');
});

test('identity: Tax.cal branding, honest positioning, https links on the Tax.cal site', () => {
  assert.equal(manifest.name, 'taxcal');
  assert.equal(ext.interface.displayName, 'Tax.cal');
  const copy = [manifest.description, ext.interface.shortDescription, ext.interface.longDescription, ...ext.interface.defaultPrompt].join(' ');
  assert.ok(!/most accurate|guarantee|official tax advis|100%|best tax/i.test(copy), 'no exaggerated claims');
  for (const k of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) assert.match(ext.interface[k], /^https:\/\/taxcal\.siddheshthapa\.com\//);
  assert.equal(ext.review.commerce, false);
  assert.equal(mcpConfig.mcpServers.taxcal.url, 'https://taxcal-mcp.onepanda2.workers.dev/mcp');
  const toml = readFileSync(new URL('../mcp/wrangler.toml', import.meta.url), 'utf8');
  assert.match(toml, /^name = "taxcal-mcp"$/m, 'mcp.json host follows the Worker name');
});

test('the pages the manifest links to exist in the site', () => {
  for (const page of ['privacy', 'terms', 'support']) {
    const html = readFileSync(new URL(`../${page}/index.html`, import.meta.url), 'utf8');
    assert.match(html, new RegExp(`<link rel="canonical" href="https://taxcal\\.siddheshthapa\\.com/${page}/">`));
  }
});

/* ---- review cases ↔ tools ------------------------------------------------- */
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function numbersIn(obj, out = new Set()) {
  if (typeof obj === 'number') out.add(Math.round(obj * 100) / 100);
  else if (obj && typeof obj === 'object') for (const v of Object.values(obj)) numbersIn(v, out);
  return out;
}

function runCase(c) {
  const { result } = callTool(c.call.tool, c.call.arguments);
  const e = c.expect;
  if (e.ok) {
    assert.equal(result.isError, false, `${c.id}: ${result.content[0].text.slice(0, 200)}`);
    const sc = result.structuredContent;
    for (const [path, want] of Object.entries(e.fields || {})) assert.deepEqual(get(sc, path), want, `${c.id}: ${path}`);
    for (const [path, want] of Object.entries(e.fields_match || {})) assert.ok(String(get(sc, path)).includes(want), `${c.id}: ${path}`);
    for (const path of e.has || []) assert.ok(get(sc, path) !== undefined, `${c.id}: missing ${path}`);
    if (e.notes_match) assert.ok(sc.notes.some((n) => n.includes(e.notes_match)), `${c.id}: notes`);
    return sc;
  }
  assert.equal(result.isError, true, c.id);
  const err = JSON.parse(result.content[0].text.split('\n').pop()).error;
  assert.equal(err.code, e.code, `${c.id}: ${err.message}`);
  if (e.field) assert.equal(err.field, e.field, c.id);
  if (e.message_match) assert.ok(err.message.includes(e.message_match), `${c.id}: ${err.message}`);
  return null;
}

test(`all ${cases.length} conversation test cases behave as documented when the expected tool call is made`, () => {
  assert.ok(cases.filter((c) => c.kind === 'positive').length >= 5);
  assert.ok(cases.filter((c) => c.kind === 'negative').length >= 3);
  const ids = new Set();
  for (const c of cases) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`); ids.add(c.id);
    assert.ok(['positive', 'negative', 'clarify'].includes(c.kind), c.id);
    assert.ok(c.prompt && c.behavior, c.id);
    if (c.call) { assert.ok(TOOL_NAMES.includes(c.call.tool), c.id); runCase(c); }
  }
});

test('every review case is backed by a checked conversation case, and the amounts it quotes come from the engine', () => {
  for (const r of ext.review.test_cases.positive) {
    const c = cases.find((x) => x.prompt === r.prompt);
    assert.ok(c && c.call, `review case "${r.description}" has no matching tests/cases.json entry`);
    assert.ok(r.tools_triggered.split(',').map((s) => s.trim()).every((t) => TOOL_NAMES.includes(t)), r.description);
    assert.ok(r.tools_triggered.includes(c.call.tool), r.description);
    const sc = runCase(c);
    const have = numbersIn(sc);
    // ₹1,92,400  £3,210.60  $6,770.86 — but not "₹7.08 lakh" (a rounded restatement)
    for (const [, amount, unit] of r.expected_behavior.matchAll(/[₹£$€](\d[\d,]*(?:\.\d+)?)(\s*(?:lakh|crore))?/g)) {
      if (unit) continue;
      const n = Number(amount.replace(/,/g, ''));
      assert.ok(have.has(n), `"${r.description}" quotes ${amount}, which the tool does not return`);
    }
  }
  for (const r of ext.review.test_cases.negative) {
    const c = cases.find((x) => x.prompt === r.prompt);
    assert.ok(c && c.kind === 'negative' && c.call === null, `negative review case "${r.description}" must not trigger a tool`);
  }
});

test('chatgpt-app-submission.json matches the tools and the review cases', () => {
  assert.equal(submission.schema_version, 1);
  assert.equal(submission.app_info.display_name, ext.interface.displayName);
  assert.equal(submission.app_info.subtitle, ext.interface.shortDescription);
  assert.ok(submission.app_info.subtitle.length <= 30);
  assert.equal(submission.app_info.category, 'FINANCE');
  assert.deepEqual(Object.keys(submission.tools).sort(), [...TOOL_NAMES].sort());
  for (const t of TOOLS) {
    const s = submission.tools[t.name];
    for (const h of ['readOnlyHint', 'openWorldHint', 'destructiveHint']) assert.equal(s.annotations[h], t.annotations[h], `${t.name}.${h}`);
    for (const j of ['read_only_justification', 'open_world_justification', 'destructive_justification']) assert.ok(s.justifications[j].length > 20, `${t.name}.${j}`);
  }
  assert.equal(submission.test_cases.length, 5);
  assert.equal(submission.negative_test_cases.length, 3);
  submission.test_cases.forEach((s, i) => {
    const r = ext.review.test_cases.positive[i];
    assert.deepEqual([s.user_prompt, s.tools_triggered, s.expected_output], [r.prompt, r.tools_triggered, r.expected_behavior]);
  });
  submission.negative_test_cases.forEach((s, i) => {
    const r = ext.review.test_cases.negative[i];
    assert.deepEqual([s.user_prompt, s.tools_triggered, s.expected_output], [r.prompt, null, r.expected_behavior]);
  });
});

/* ---- the ZIP -------------------------------------------------------------------- */
test('the ZIP holds exactly the package files, round-trips, and is reproducible', () => {
  const entries = packageEntries();
  const zip = buildZip(entries);
  assert.deepEqual(buildZip(packageEntries()), zip, 'same sources → same bytes');
  const files = readZip(zip);
  assert.deepEqual([...files.keys()].sort(), packageFiles().sort());
  for (const f of ['plugin.json', 'mcp.json', 'skills/tax-cal-analysis/SKILL.md', 'assets/logo.png', 'assets/icon.png', 'README.md']) assert.ok(files.has(f), f);
  for (const f of files.keys()) assert.ok(!/^tests\/|(^|\/)\.|\.env|\.dev\.vars|wrangler|node_modules/.test(f), `unexpected file in ZIP: ${f}`);
  assert.deepEqual(files.get('plugin.json'), readFileSync(new URL('../taxcal-plugin/plugin.json', import.meta.url)));
  assert.ok(zip.length < 1024 * 1024);
});

test('--mcp-url rewrites only mcp.json inside the ZIP', () => {
  const url = 'https://taxcal-mcp.example.workers.dev/mcp';
  const files = readZip(buildZip(packageEntries({ mcpUrl: url })));
  assert.equal(JSON.parse(files.get('mcp.json')).mcpServers.taxcal.url, url);
  assert.deepEqual(checkPackage({ mcpUrl: url }), []);
  assert.equal(json('../taxcal-plugin/mcp.json').mcpServers.taxcal.url, 'https://taxcal-mcp.onepanda2.workers.dev/mcp', 'the source file is untouched');
});
