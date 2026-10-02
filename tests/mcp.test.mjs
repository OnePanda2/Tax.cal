/* MCP server: protocol conformance (2026-07-28 and the 2025 revisions), HTTP
   guards, schema conformance of every tool result, official SDK clients over
   real HTTP, and the privacy of what the server logs. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import worker from '../mcp/src/worker.js';
import { MAX_BODY_BYTES, logLine, memoryRateLimit, healthBody } from '../mcp/src/app.js';
import { TOOLS, toolDescriptors, callTool } from '../mcp/src/tools.js';
import { SUPPORTED_VERSIONS } from '../mcp/src/protocol.js';
import { start } from '../mcp/dev-server.mjs';
import { ORDER } from '../packages/tax-core/src/index.js';

const BASE = 'https://taxcal-mcp.test';
const MODERN = '2026-07-28';
const META = 'io.modelcontextprotocol/protocolVersion';

/* Capture everything the server logs, so the privacy test can inspect it and
   the test output stays clean. */
const logged = [];
const realLog = console.log;
before(() => { console.log = (...a) => logged.push(a.join(' ')); });
after(() => { console.log = realLog; });

async function send(path, init = {}, env = {}) {
  const res = await worker.fetch(new Request(BASE + path, init), env, {});
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, headers: res.headers, body };
}
function post(body, headers = {}, env = {}) {
  return send('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  }, env);
}
const legacy = (method, params = {}, id = 1, version = '2025-11-25') =>
  post({ jsonrpc: '2.0', id, method, params }, version ? { 'mcp-protocol-version': version } : {});
const modern = (method, params = {}, { id = 1, name, headers = {} } = {}) =>
  post({ jsonrpc: '2.0', id, method, params: { ...params, _meta: { [META]: MODERN } } },
    { 'mcp-protocol-version': MODERN, 'mcp-method': method, ...(name ? { 'mcp-name': name } : {}), ...headers });
const callLegacy = (name, args) => legacy('tools/call', { name, arguments: args });

/* ---- tool descriptors ------------------------------------------------------ */
test('tools/list describes four read-only, idempotent, closed-world tools', () => {
  const d = toolDescriptors();
  assert.deepEqual(d.map((t) => t.name), ['calculate_tax', 'compare_tax_regimes', 'get_tax_rules', 'compare_countries']);
  for (const t of d) {
    assert.ok(!('handler' in t), t.name);
    assert.ok(t.title && t.description.length > 80 && t.description.length < 2000, t.name);
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(t.inputSchema.additionalProperties, false, `${t.name} must reject unknown arguments`);
    assert.equal(t.outputSchema.type, 'object');
    assert.deepEqual(t.annotations, { title: t.annotations.title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
    assert.doesNotThrow(() => JSON.stringify(t));
  }
});

const ajv = new Ajv2020({ strict: true, allowUnionTypes: true, allErrors: true });
const validators = Object.fromEntries(TOOLS.map((t) => [t.name, { input: ajv.compile(t.inputSchema), output: ajv.compile(t.outputSchema) }]));

test('every input and output schema compiles under JSON Schema 2020-12 strict mode', () => {
  assert.equal(Object.keys(validators).length, 4);
});

/* ---- every result conforms to its outputSchema ----------------------------- */
const CALLS = [];
for (const k of ORDER) {
  for (const gross of k === 'IN' ? [0, 700000, 1200000, 1275010, 1500000, 5085000, 60000000] : [0, 20000, 55000, 120000, 600000]) {
    const args = { country: k, gross_income: gross };
    if (k === 'US') Object.assign(args, { filing_status: 'single', region: 'CA' });
    if (k === 'CA') args.region = 'QC';
    CALLS.push(['calculate_tax', args]);
  }
  CALLS.push(['get_tax_rules', { country: k }]);
}
CALLS.push(
  ['calculate_tax', { country: 'US', gross_income: 150000, filing_status: 'married_filing_jointly', region: 'TX', monthly_spending: { groceries: 900, fuel: 250 } }],
  ['calculate_tax', { country: 'UK', gross_income: 125140, region: 'wales', include_indirect_estimate: false }],
  ['calculate_tax', { country: 'DE', gross_income: 55000, has_children: true }],
  ['calculate_tax', { country: 'IN', gross_income: 1500000, regime: 'old', age_band: '60_to_79', old_regime_deductions: { section_80c: 150000, section_80d: 25000 } }],
  ['calculate_tax', { country: 'IN', gross_income: 1500000, residency: 'non_resident', tax_year: 'AY 2026-27' }],
  ['compare_tax_regimes', { gross_income: 2000000 }],
  ['compare_tax_regimes', { country: 'IN', gross_income: 1000000, old_regime_deductions: { section_80c: 150000, home_loan_interest: 200000, hra_exemption: 120000 } }],
  ['compare_tax_regimes', { gross_income: 50000000, residency: 'non_resident', tax_year: 'FY 2025-26' }],
  ['compare_countries', { gross_income: 60000, currency: 'EUR' }],
  ['compare_countries', { gross_income: 2500000, currency: 'INR', countries: ['IN', 'UK', 'US'], include_indirect_estimate: true }]
);
for (const topic of ['income_tax', 'social_contributions', 'regional_tax', 'indirect_tax', 'scope', 'sources']) CALLS.push(['get_tax_rules', { country: 'IN', topic }]);
CALLS.push(['get_tax_rules', {}], ['get_tax_rules', { topic: 'indirect_tax' }], ['get_tax_rules', { country: 'IN', tax_year: 'AY 2026-27' }]);

test(`all ${CALLS.length} sample calls validate against inputSchema and outputSchema`, () => {
  for (const [name, args] of CALLS) {
    const v = validators[name];
    assert.ok(v.input(args), `${name} input ${JSON.stringify(args)}: ${ajv.errorsText(v.input.errors)}`);
    const { result } = callTool(name, args);
    assert.equal(result.isError, false, `${name} ${JSON.stringify(args)}: ${result.content[0].text}`);
    assert.ok(v.output(result.structuredContent), `${name} ${JSON.stringify(args)}: ${ajv.errorsText(v.output.errors)}`);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent, 'text content mirrors structuredContent');
    assert.ok(!/NaN|Infinity|undefined/.test(result.content[0].text), `${name}: non-finite value in output`);
  }
});

test('tool errors are isError results with a code, never structuredContent', () => {
  const { result, meta } = callTool('calculate_tax', { country: 'US', gross_income: 85000, region: 'NY' });
  assert.equal(result.isError, true);
  assert.ok(!('structuredContent' in result));
  assert.match(result.content[0].text, /^I need your filing status to calculate this accurately/);
  assert.equal(JSON.parse(result.content[0].text.split('\n')[1]).error.code, 'missing_input');
  assert.deepEqual(meta, { tool: 'calculate_tax', country: null, ok: false, code: 'missing_input' });
});

/* ---- legacy era (2025-11-25 / 2025-06-18 / 2025-03-26) ---------------------- */
test('initialize negotiates a 2025 revision and issues no session', async () => {
  for (const [asked, got] of [['2025-11-25', '2025-11-25'], ['2025-06-18', '2025-06-18'], ['2025-03-26', '2025-03-26'], ['2024-11-05', '2025-11-25'], [MODERN, '2025-11-25']]) {
    const r = await post({ jsonrpc: '2.0', id: 'a', method: 'initialize', params: { protocolVersion: asked, capabilities: {}, clientInfo: { name: 't', version: '1' } } });
    assert.equal(r.status, 200);
    assert.equal(r.body.result.protocolVersion, got, asked);
    assert.equal(r.headers.get('mcp-session-id'), null);
    assert.deepEqual(r.body.result.capabilities, { tools: { listChanged: false } });
    assert.equal(r.body.result.serverInfo.name, 'taxcal');
    assert.match(r.body.result.instructions, /Never do tax arithmetic yourself/);
  }
});

test('notifications and client responses are accepted with 202 and no body', async () => {
  for (const msg of [{ jsonrpc: '2.0', method: 'notifications/initialized' }, { jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 1 } }, { jsonrpc: '2.0', id: 9, result: {} }]) {
    const r = await post(msg, { 'mcp-protocol-version': '2025-11-25' });
    assert.equal(r.status, 202);
    assert.equal(r.body, null);
  }
});

test('legacy requests: ping, tools/list, tools/call, and the 2025-03-26 default', async () => {
  assert.deepEqual((await legacy('ping')).body.result, {});
  const list = await legacy('tools/list', {}, 2, null);   // no header → 2025-03-26
  assert.equal(list.status, 200);
  assert.equal(list.body.result.tools.length, 4);
  assert.ok(!('ttlMs' in list.body.result), 'legacy results carry no 2026 fields');
  const call = await callLegacy('calculate_tax', { country: 'IN', gross_income: 1500000 });
  assert.equal(call.body.result.isError, false);
  assert.equal(call.body.result.structuredContent.total_direct_tax, 97500);
  assert.ok(!('resultType' in call.body.result));
});

test('legacy errors: unknown method, unknown tool, bad params, unsupported version', async () => {
  const unknown = await legacy('resources/list');
  assert.equal(unknown.body.error.code, -32601);
  const noTool = await legacy('tools/call', { name: 'file_tax_return', arguments: {} });
  assert.equal(noTool.body.error.code, -32602);
  assert.match(noTool.body.error.message, /Unknown tool/);
  for (const params of [{ arguments: {} }, { name: 'calculate_tax', arguments: [1, 2] }, { name: 'calculate_tax', arguments: 'IN 1500000' }]) {
    assert.equal((await legacy('tools/call', params)).body.error.code, -32602, JSON.stringify(params));
  }
  const old = await legacy('tools/list', {}, 3, '1999-01-01');
  assert.equal(old.status, 400);
  assert.equal(old.body.error.code, -32022);
  assert.deepEqual(old.body.error.data.supported, SUPPORTED_VERSIONS);
});

test('malformed JSON-RPC is rejected before any tool runs', async () => {
  const cases = [
    ['{"jsonrpc":"2.0","id":1,"method":', 400, -32700],
    [[{ jsonrpc: '2.0', id: 1, method: 'ping' }], 400, -32600],
    [{ jsonrpc: '1.0', id: 1, method: 'ping' }, 400, -32600],
    [{ jsonrpc: '2.0', id: { x: 1 }, method: 'ping' }, 400, -32600],
    [{ jsonrpc: '2.0', id: 1.5, method: 'ping' }, 400, -32600],
    [{ jsonrpc: '2.0', id: 1, method: 7 }, 400, -32600],
    [{ jsonrpc: '2.0', id: 1, method: 'tools/call', params: ['calculate_tax'] }, 400, -32600],
    ['"just a string"', 400, -32600],
    ['null', 400, -32600]
  ];
  for (const [body, status, code] of cases) {
    const r = await post(body, { 'mcp-protocol-version': '2025-11-25' });
    assert.equal(r.status, status, JSON.stringify(body));
    assert.equal(r.body.error.code, code, JSON.stringify(body));
  }
});

/* ---- modern era (2026-07-28) -------------------------------------------------- */
test('server/discover advertises every supported revision', async () => {
  const r = await modern('server/discover');
  assert.equal(r.status, 200);
  const res = r.body.result;
  assert.equal(res.resultType, 'complete');
  assert.deepEqual(res.supportedVersions, SUPPORTED_VERSIONS);
  assert.deepEqual(res.capabilities, { tools: {} });
  assert.equal(res._meta['io.modelcontextprotocol/serverInfo'].name, 'taxcal');
  assert.ok(typeof res.instructions === 'string' && res.ttlMs > 0 && res.cacheScope === 'public');
});

test('modern tools/list and tools/call carry resultType and server metadata', async () => {
  const list = await modern('tools/list');
  assert.equal(list.body.result.resultType, 'complete');
  assert.equal(list.body.result.tools.length, 4);
  assert.equal(list.body.result.cacheScope, 'public');
  const call = await modern('tools/call', { name: 'compare_tax_regimes', arguments: { gross_income: 2000000 } }, { name: 'compare_tax_regimes' });
  const res = call.body.result;
  assert.equal(res.resultType, 'complete');
  assert.equal(res.structuredContent.regimes.new.total_tax, 192400);
  assert.equal(res.structuredContent.regimes.old.total_tax, 413400);
  assert.equal(res.structuredContent.difference.lower_estimated_tax, 'new');
  assert.equal(res._meta['io.modelcontextprotocol/serverInfo'].version, '1.0.0');
});

test('modern header validation: Mcp-Method, Mcp-Name (incl. base64) and the version header', async () => {
  const args = { name: 'calculate_tax', arguments: { country: 'AU', gross_income: 90000 } };
  const ok = await modern('tools/call', args, { name: 'calculate_tax' });
  assert.equal(ok.status, 200);
  const b64 = await modern('tools/call', args, { name: '=?base64?' + Buffer.from('calculate_tax').toString('base64') + '?=' });
  assert.equal(b64.status, 200);
  const bad = [
    await modern('tools/call', args),                                                        // no Mcp-Name
    await modern('tools/call', args, { name: 'get_tax_rules' }),                             // wrong Mcp-Name
    await modern('tools/call', args, { name: 'calculate_tax', headers: { 'mcp-method': 'tools/list' } }),
    await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { [META]: MODERN } } }, { 'mcp-protocol-version': MODERN }),            // no Mcp-Method
    await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { [META]: MODERN } } }, { 'mcp-protocol-version': '2025-11-25', 'mcp-method': 'tools/list' }),
    await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, { 'mcp-protocol-version': MODERN, 'mcp-method': 'tools/list' })          // header without _meta
  ];
  for (const r of bad) {
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, -32020);
  }
});

test('modern: unsupported revision → -32022 with the supported list; unknown method → 404', async () => {
  const v = await post({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: { [META]: '2099-01-01' } } }, { 'mcp-protocol-version': '2099-01-01', 'mcp-method': 'server/discover' });
  assert.equal(v.status, 400);
  assert.equal(v.body.error.code, -32022);
  assert.deepEqual(v.body.error.data.supported, SUPPORTED_VERSIONS);
  assert.equal(v.body.error.data.requested, '2099-01-01');
  const m = await modern('prompts/list');
  assert.equal(m.status, 404);
  assert.equal(m.body.error.code, -32601);
});

/* ---- tool argument validation through the whole stack ----------------------- */
test('untrusted arguments: negative, non-numeric, absurd, oversized, unknown keys, prototype keys', async () => {
  const bad = [
    { country: 'UK', gross_income: -5 },
    { country: 'UK', gross_income: '45000' },
    { country: 'UK', gross_income: null },
    { country: 'UK', gross_income: 1e300 },
    { country: 'UK', gross_income: { value: 45000 } },
    { country: 'UK', gross_income: 45000, region: 'x'.repeat(500) },
    { country: 'UK', gross_income: 45000, salary_note: 'hi' },
    { country: 'ZZ', gross_income: 45000 },
    { country: 'UK', gross_income: 45000, monthly_spending: { groceries: -1 } },
    { country: 'IN', gross_income: 1500000, old_regime_deductions: { section_80c: 'lots' } }
  ];
  for (const args of bad) {
    const r = await callLegacy('calculate_tax', args);
    assert.equal(r.status, 200);
    assert.equal(r.body.result.isError, true, JSON.stringify(args).slice(0, 80));
    assert.match(r.body.result.content[0].text, /"code":"(invalid_input|out_of_range|unsupported_scope|unsupported_country)"/);
  }
  // JSON.parse creates an own "__proto__" property; it must be rejected, not merged.
  const proto = await post('{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate_tax","arguments":{"country":"UK","gross_income":45000,"__proto__":{"polluted":true}}}}', { 'mcp-protocol-version': '2025-11-25' });
  assert.equal(proto.body.result.isError, true);
  assert.equal({}.polluted, undefined);
  const ctor = await callLegacy('calculate_tax', { country: 'UK', gross_income: 45000, constructor: { prototype: { polluted: true } } });
  assert.equal(ctor.body.result.isError, true);
  assert.equal({}.polluted, undefined);
});

test('material fields are asked for, never silently defaulted', async () => {
  const fs = await callLegacy('calculate_tax', { country: 'US', gross_income: 85000, region: 'NY' });
  assert.match(fs.body.result.content[0].text, /I need your filing status to calculate this accurately/);
  const st = await callLegacy('calculate_tax', { country: 'US', gross_income: 85000, filing_status: 'single' });
  assert.match(st.body.result.content[0].text, /"code":"missing_input".*"field":"region"/);
  const pr = await callLegacy('calculate_tax', { country: 'CA', gross_income: 85000 });
  assert.match(pr.body.result.content[0].text, /"field":"region"/);
  const scope = await callLegacy('calculate_tax', { country: 'IN', gross_income: 1500000, income_type: 'business' });
  assert.match(scope.body.result.content[0].text, /"code":"unsupported_scope"/);
  const wrong = await callLegacy('compare_tax_regimes', { country: 'UK', gross_income: 45000 });
  assert.match(wrong.body.result.content[0].text, /India only/);
});

/* ---- HTTP guards ------------------------------------------------------------ */
test('only POST is served on /mcp (no SSE stream, no sessions to delete)', async () => {
  for (const method of ['GET', 'DELETE', 'PUT']) {
    const r = await send('/mcp', { method, headers: { accept: 'text/event-stream' } });
    assert.equal(r.status, 405, method);
    assert.equal(r.headers.get('allow'), 'POST');
  }
});

test('Origin allow-list, Content-Type and Accept checks', async () => {
  const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };
  assert.equal((await post(ping, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(ping, { origin: 'https://chatgpt.com' })).status, 200);
  assert.equal((await post(ping)).status, 200, 'server-to-server clients send no Origin');
  assert.equal((await post(ping, { origin: 'http://localhost:6274' }, { ALLOWED_ORIGINS: 'http://localhost:6274' })).status, 200);
  assert.equal((await post(ping, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post(ping, { accept: 'text/html' })).status, 406);
});

test(`request bodies over ${MAX_BODY_BYTES} bytes are refused with 413, with or without Content-Length`, async () => {
  const big = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', params: { pad: 'x'.repeat(MAX_BODY_BYTES) } });
  assert.equal((await post(big)).status, 413);
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
  const r = await worker.fetch(new Request(BASE + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' }), {}, {});
  assert.equal(r.status, 413);
});

test('rate limiting: the Cloudflare binding is honoured, with an in-memory fallback', async () => {
  const ping = { jsonrpc: '2.0', id: 1, method: 'ping' };
  const limited = await post(ping, {}, { RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal((await post(ping, {}, { RATE_LIMITER: { limit: async () => ({ success: true }) } })).status, 200);
  const env = { RATE_LIMIT_PER_MINUTE: '2' };
  const ip = { 'cf-connecting-ip': '203.0.113.77' };
  assert.equal((await post(ping, ip, env)).status, 200);
  assert.equal((await post(ping, ip, env)).status, 200);
  assert.equal((await post(ping, ip, env)).status, 429);
  const t = 1_800_000_000_000;
  assert.equal(memoryRateLimit('k', 1, t), true);
  assert.equal(memoryRateLimit('k', 1, t + 1), false);
  assert.equal(memoryRateLimit('k', 1, t + 60_000), true, 'a new minute resets the window');
});

test('security headers on every response', async () => {
  for (const r of [await post({ jsonrpc: '2.0', id: 1, method: 'ping' }), await send('/health'), await send('/nope'), await send('/mcp')]) {
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.match(r.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(r.headers.get('access-control-allow-origin'), null, 'no CORS: ChatGPT calls server-to-server');
  }
});

test('health, root, domain verification and unknown routes', async () => {
  const h = await send('/health');
  assert.equal(h.status, 200);
  assert.deepEqual(h.body, healthBody());
  assert.equal(h.body.countries, 11);
  assert.equal(h.body.rules.IN.rule_version, 'IN-2026-27-v1');
  assert.equal((await send('/health', { method: 'HEAD' })).status, 200);
  const root = await send('/');
  assert.equal(root.body.mcp_endpoint, BASE + '/mcp');
  assert.equal((await send('/.well-known/openai-apps-challenge')).status, 404);
  const res = await worker.fetch(new Request(BASE + '/.well-known/openai-apps-challenge'), { OPENAI_APPS_CHALLENGE: ' token-abc123 \n' }, {});
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'token-abc123');
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  assert.equal((await send('/admin')).status, 404);
});

test('an unexpected failure returns a generic 500 that echoes nothing', async () => {
  const broken = { url: BASE + '/mcp', method: 'POST', headers: { get() { throw new TypeError('secret 1500000'); } } };
  const res = await worker.fetch(broken, {}, {});
  assert.equal(res.status, 500);
  const text = await res.text();
  assert.ok(!/secret|1500000/.test(text));
  assert.match(text, /Internal error/);
});

/* ---- official SDK clients over real HTTP -------------------------------------- */
let dev;
before(async () => { dev = await start({ port: 0 }); });
after(async () => { await dev.close(); });

async function exercise(client, transport) {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['calculate_tax', 'compare_countries', 'compare_tax_regimes', 'get_tax_rules']);
  // The SDK validates structuredContent against the advertised outputSchema.
  const r = await client.callTool({ name: 'calculate_tax', arguments: { country: 'IN', gross_income: 1500000 } });
  assert.equal(r.isError, false);
  assert.equal(r.structuredContent.total_direct_tax, 97500);
  const e = await client.callTool({ name: 'calculate_tax', arguments: { country: 'US', gross_income: 85000, region: 'NY' } });
  assert.equal(e.isError, true);
  assert.match(e.content[0].text, /filing status/);
  const c = await client.callTool({ name: 'compare_countries', arguments: { gross_income: 100000, currency: 'USD', countries: ['US', 'UK', 'IN'] } });
  assert.deepEqual(c.structuredContent.rows.map((x) => x.country), ['US', 'UK', 'IN']);
}

test('official SDK v1 client (2025-11-25, Streamable HTTP)', async () => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const client = new Client({ name: 'taxcal-test', version: '1.0.0' });
  await exercise(client, new StreamableHTTPClientTransport(new URL(dev.url)));
  assert.equal(client.getServerVersion().name, 'taxcal');
  await client.close();
});

test('official SDK v2 client: legacy, auto-negotiated and pinned 2026-07-28 connections', async () => {
  const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client');
  for (const [mode, era] of [['legacy', 'legacy'], ['auto', 'modern'], [{ pin: MODERN }, 'modern']]) {
    const client = new Client({ name: 'taxcal-test', version: '1.0.0' }, { versionNegotiation: { mode } });
    await exercise(client, new StreamableHTTPClientTransport(new URL(dev.url)));
    assert.equal(client.getProtocolEra(), era, JSON.stringify(mode));
    if (era === 'modern') assert.equal(client.getNegotiatedProtocolVersion(), MODERN);
    await client.close();
  }
});

/* ---- privacy: what the server logs -------------------------------------------- */
test('logs carry operational fields only — never salaries, spending or free text', async () => {
  logged.length = 0;
  await callLegacy('calculate_tax', { country: 'US', gross_income: 987654.32, filing_status: 'single', region: 'NY', monthly_spending: { groceries: 4321.5 } });
  await callLegacy('calculate_tax', { country: 'IN', gross_income: 2345678, regime: 'old', old_regime_deductions: { section_80c: 135791 } });
  await callLegacy('compare_tax_regimes', { gross_income: 3456789, old_regime_deductions: { hra_exemption: 246802 } });
  await callLegacy('calculate_tax', { country: 'UK', gross_income: 45000, region: '<script>alert(1)</script>' });
  await post({ jsonrpc: '2.0', id: 1, method: 'secret_method_1234567', params: {} }, { 'mcp-protocol-version': '2025-11-25' });
  await post({ jsonrpc: '2.0', method: 'notifications/salary_8765432' });
  await post('{"broken json 5555555');
  assert.ok(logged.length >= 7);
  const ALLOWED = new Set(['svc', 'route', 'status', 'kind', 'era', 'method', 'version', 'tool', 'country', 'ok', 'code', 'ms']);
  for (const line of logged) {
    for (const needle of ['987654', '4321', '2345678', '135791', '3456789', '246802', 'script', 'secret', '1234567', '8765432', '5555555']) {
      assert.ok(!line.includes(needle), `log line leaks "${needle}": ${line}`);
    }
    const o = JSON.parse(line);
    for (const k of Object.keys(o)) assert.ok(ALLOWED.has(k), `unexpected log field ${k}`);
  }
  const sink = [];
  logLine({ route: 'mcp', code: 'free text with spaces', n: 1, obj: { a: 1 } }, (s) => sink.push(s));
  assert.deepEqual(JSON.parse(sink[0]), { svc: 'taxcal-mcp', route: 'mcp', code: 'other', n: 1 });
});

test('the Worker entry exports only its handler (workerd rejects other named exports)', async () => {
  const mod = await import('../mcp/src/worker.js');
  assert.deepEqual(Object.keys(mod), ['default']);
  assert.deepEqual(Object.keys(mod.default), ['fetch']);
});

test('the server stores nothing and calls nothing: no storage bindings, no outbound fetch', () => {
  const dir = new URL('../mcp/src/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} makes an outbound request`);
    assert.ok(!/\b(caches|KV|D1|DurableObject|localStorage|indexedDB)\b|\.put\(|\.prepare\(/.test(src), `${f} touches storage`);
  }
  const toml = readFileSync(new URL('../mcp/wrangler.toml', import.meta.url), 'utf8');
  assert.ok(!/^\s*\[\[?(d1_databases|kv_namespaces|durable_objects|r2_buckets|queues)/m.test(toml), 'wrangler.toml binds storage');
  assert.ok(!/^\s*OPENAI_APPS_CHALLENGE\s*=/m.test(toml), 'the verification token must be a secret, not a var');
});
