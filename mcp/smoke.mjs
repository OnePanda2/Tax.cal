#!/usr/bin/env node
/* ============================================================================
   Smoke test for a running Tax.cal MCP server — local or deployed.

     npm run mcp:smoke                                   (http://127.0.0.1:8787/mcp)
     npm run mcp:smoke -- https://taxcal-mcp.onepanda2.workers.dev/mcp

   Plain fetch, no SDK: exercises both protocol eras, a real calculation, a
   missing-input error and the HTTP guards. Exits non-zero on any failure.
   ========================================================================== */
const url = process.argv[2] || process.env.MCP_URL || 'http://127.0.0.1:8787/mcp';
const base = url.replace(/\/mcp\/?$/, '');
const MODERN = '2026-07-28';
const META = 'io.modelcontextprotocol/protocolVersion';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

async function post(body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null };
}
const legacy = (id, method, params) => post({ jsonrpc: '2.0', id, method, params }, { 'MCP-Protocol-Version': '2025-11-25' });
const modern = (id, method, params = {}, name) => post(
  { jsonrpc: '2.0', id, method, params: { ...params, _meta: { [META]: MODERN } } },
  { 'MCP-Protocol-Version': MODERN, 'Mcp-Method': method, ...(name ? { 'Mcp-Name': name } : {}) }
);

try {
  const h = await fetch(`${base}/health`);
  const hb = await h.json();
  check('GET /health', h.status === 200 && hb.ok === true && hb.countries === 11, `${hb.service} ${hb.version}, engine ${hb.engine_version}`);

  const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'taxcal-smoke', version: '1' } } });
  check('legacy initialize', init.status === 200 && init.json.result.protocolVersion === '2025-11-25' && init.json.result.serverInfo.name === 'taxcal' && !init.headers.get('mcp-session-id'));

  const note = await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, { 'MCP-Protocol-Version': '2025-11-25' });
  check('notifications/initialized → 202', note.status === 202);

  const list = await legacy(2, 'tools/list', {});
  const names = list.json.result.tools.map((t) => t.name).sort().join(',');
  check('legacy tools/list', names === 'calculate_tax,compare_countries,compare_tax_regimes,get_tax_rules', names);

  const calc = await legacy(3, 'tools/call', { name: 'calculate_tax', arguments: { country: 'IN', gross_income: 1500000 } });
  const sc = calc.json.result.structuredContent;
  check('calculate_tax India ₹15 lakh (new regime)', sc && sc.total_direct_tax === 97500 && sc.tax_year === '2026-27', sc && `₹${sc.total_direct_tax}, ${sc.rule_version}`);

  const missing = await legacy(4, 'tools/call', { name: 'calculate_tax', arguments: { country: 'US', gross_income: 85000, region: 'NY' } });
  const mr = missing.json.result;
  check('US without filing status → missing_input', mr.isError === true && /filing status/.test(mr.content[0].text));

  const disc = await modern(5, 'server/discover');
  check('modern server/discover', disc.status === 200 && disc.json.result.supportedVersions.includes(MODERN) && disc.json.result.resultType === 'complete');

  const cmp = await modern(6, 'tools/call', { name: 'compare_tax_regimes', arguments: { gross_income: 2000000 } }, 'compare_tax_regimes');
  const r = cmp.json.result && cmp.json.result.structuredContent;
  check('modern compare_tax_regimes ₹20 lakh', r && r.regimes.new.total_tax === 192400 && r.regimes.old.total_tax === 413400, r && `new ₹${r.regimes.new.total_tax} vs old ₹${r.regimes.old.total_tax}`);

  const bad = await post({ jsonrpc: '2.0', id: 7, method: 'tools/list', params: { _meta: { [META]: MODERN } } }, { 'MCP-Protocol-Version': MODERN, 'Mcp-Method': 'tools/call' });
  check('modern header mismatch → 400', bad.status === 400 && bad.json.error.code === -32020);

  const get = await fetch(url, { method: 'GET', headers: { Accept: 'text/event-stream' } });
  check('GET /mcp → 405 (no SSE stream)', get.status === 405);
} catch (err) {
  check('server reachable', false, err.message);
}

console.log(failures ? `\n${failures} check(s) failed against ${url}` : `\nAll checks passed against ${url}`);
process.exit(failures ? 1 : 0);
