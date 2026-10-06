/* ============================================================================
   MCP over Streamable HTTP — a stateless, dual-era server.

   Modern era (2026-07-28): no handshake; every request carries
     params._meta["io.modelcontextprotocol/protocolVersion"], and the HTTP
     headers MCP-Protocol-Version, Mcp-Method and (for tools/call) Mcp-Name,
     which must match the body. server/discover advertises versions. Results
     carry resultType: "complete". Errors use HTTP status codes.
   Legacy era (2025-11-25, 2025-06-18, 2025-03-26): an initialize request
     negotiates the version; later requests send MCP-Protocol-Version (absent
     means 2025-03-26). No session ID is ever issued — the server holds no
     state, so none is needed.

   Responses are always single JSON objects (never SSE). GET/DELETE → 405.
   Spec: modelcontextprotocol.io/specification/2026-07-28 (versioning,
   transports/streamable-http) and /2025-11-25 (lifecycle, transports).
   ========================================================================== */
import { toolDescriptors, hasTool, callTool } from './tools.js';

export const MODERN_VERSIONS = ['2026-07-28'];
export const LEGACY_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];
export const SUPPORTED_VERSIONS = [...MODERN_VERSIONS, ...LEGACY_VERSIONS];

const META_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER = 'io.modelcontextprotocol/serverInfo';

// JSON-RPC / MCP error codes
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const HEADER_MISMATCH = -32020;
export const UNSUPPORTED_PROTOCOL_VERSION = -32022;

export function serverInfo(version) {
  return {
    name: 'taxcal',
    title: 'Tax.cal',
    version,
    description: 'Deterministic personal tax estimates for 11 countries, with sources and per-component confidence.',
    websiteUrl: 'https://taxcal.siddheshthapa.com/'
  };
}

export const INSTRUCTIONS = [
  'Tax.cal calculates estimated personal tax with deterministic, sourced rules. Never do tax arithmetic yourself: call calculate_tax (one country), compare_tax_regimes (India, new vs old regime), compare_countries (same salary across countries) or get_tax_rules (what the rules and assumptions are).',
  'Supported: salary/employment income in the UK (not Scotland), US (filing status and state required), Canada (province required), Australia, Ireland, Germany, France, the Netherlands, Spain, Italy and India.',
  'India: "FY 2026-27" means Tax Year 2026-27 under the Income-tax Act, 2025; "AY 2026-27" means FY 2025-26 under the Income-tax Act, 1961. Convert lakh/crore to plain numbers (₹15 lakh = 1500000).',
  'Never fill in a required input the user has not given (for example the US filing status): ask first. For India, report which regime has the lower estimated tax on the inputs used; do not call one the winner or better or tell the user which to pick. When a tool returns missing_input, ask the user for exactly that field. Report the defaults_applied, assumptions and confidence with the numbers; indirect tax is an estimate. The tools are calculation-only: they cannot file returns, pay tax or give personal advice.'
].join(' ');

/* ---- small helpers -------------------------------------------------------- */
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const validId = (id) => typeof id === 'string' || (typeof id === 'number' && Number.isInteger(id));

function decodeHeaderValue(v) {
  if (v == null) return null;
  const m = /^=\?base64\?([A-Za-z0-9+/=]*)\?=$/.exec(v);
  if (!m) return v;
  try {
    const bin = atob(m[1]);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch { return undefined; }
}

const rpcError = (id, code, message, data) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: data === undefined ? { code, message } : { code, message, data } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });

/* Outcome of handling one POST body: { status, body (object|null), log } */
const out = (status, body, log) => ({ status, body, log });

/* ---- method implementations ----------------------------------------------- */
function listTools(modern) {
  const result = { tools: toolDescriptors() };
  if (modern) { result.ttlMs = 3600000; result.cacheScope = 'public'; }
  return result;
}

function runTool(params) {
  if (!isObj(params) || typeof params.name !== 'string') return { error: [INVALID_PARAMS, 'tools/call requires params.name'] };
  if (!hasTool(params.name)) return { error: [INVALID_PARAMS, `Unknown tool: ${String(params.name).slice(0, 64)}`] };
  if (params.arguments !== undefined && !isObj(params.arguments)) return { error: [INVALID_PARAMS, 'params.arguments must be an object'] };
  return callTool(params.name, params.arguments);
}

/* ---- the handler ------------------------------------------------------------ */
/* message: parsed JSON body. headers: a Headers-like object. serverVersion:
   the server's software version (for serverInfo). */
export function handleMessage(message, headers, serverVersion) {
  const info = serverInfo(serverVersion);

  if (Array.isArray(message)) {
    return out(400, rpcError(null, INVALID_REQUEST, 'Batch requests are not supported.'), { kind: 'invalid' });
  }
  if (!isObj(message) || message.jsonrpc !== '2.0') {
    return out(400, rpcError(null, INVALID_REQUEST, 'Expected a single JSON-RPC 2.0 message.'), { kind: 'invalid' });
  }

  // A response from the client (never solicited by this server) or a
  // notification: accept with 202 and no body.
  const isResponse = !('method' in message) && ('result' in message || 'error' in message);
  if (isResponse) return out(202, null, { kind: 'client_response' });
  if (typeof message.method !== 'string') return out(400, rpcError(message.id, INVALID_REQUEST, 'method must be a string.'), { kind: 'invalid' });
  if (!('id' in message)) return out(202, null, { kind: 'notification', method: message.method.slice(0, 64) });
  if (!validId(message.id)) return out(400, rpcError(null, INVALID_REQUEST, 'id must be a string or an integer.'), { kind: 'invalid' });

  const { id, method } = message;
  const params = message.params === undefined ? {} : message.params;
  if (!isObj(params)) return out(400, rpcError(id, INVALID_REQUEST, 'params must be an object.'), { kind: 'invalid', method });

  const metaVersion = isObj(params._meta) ? params._meta[META_VERSION] : undefined;
  const headerVersion = headers.get('mcp-protocol-version');

  /* ----- legacy era: initialize ----- */
  if (method === 'initialize' && metaVersion === undefined) {
    const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : null;
    const negotiated = requested && LEGACY_VERSIONS.includes(requested) ? requested : LEGACY_VERSIONS[0];
    return out(200, rpcResult(id, {
      protocolVersion: negotiated,
      capabilities: { tools: { listChanged: false } },
      serverInfo: info,
      instructions: INSTRUCTIONS
    }), { kind: 'request', era: 'legacy', method, version: negotiated });
  }

  /* ----- modern era: per-request metadata ----- */
  if (metaVersion !== undefined) {
    if (typeof metaVersion !== 'string' || headerVersion !== metaVersion) {
      return out(400, rpcError(id, HEADER_MISMATCH, `Header mismatch: MCP-Protocol-Version must equal _meta["${META_VERSION}"].`), { kind: 'request', era: 'modern', method, code: 'header_mismatch' });
    }
    if (!MODERN_VERSIONS.includes(metaVersion)) {
      return out(400, rpcError(id, UNSUPPORTED_PROTOCOL_VERSION, 'Unsupported protocol version', { supported: SUPPORTED_VERSIONS, requested: metaVersion.slice(0, 32) }), { kind: 'request', era: 'modern', method, code: 'unsupported_version' });
    }
    const hMethod = headers.get('mcp-method');
    if (hMethod !== method) {
      return out(400, rpcError(id, HEADER_MISMATCH, `Header mismatch: Mcp-Method header ${hMethod == null ? 'is missing' : 'does not match the body method'}.`), { kind: 'request', era: 'modern', method, code: 'header_mismatch' });
    }
    if (method === 'tools/call') {
      const hName = decodeHeaderValue(headers.get('mcp-name'));
      if (hName === undefined || hName !== (isObj(params) ? params.name : undefined)) {
        return out(400, rpcError(id, HEADER_MISMATCH, `Header mismatch: Mcp-Name header ${hName == null ? 'is missing' : 'does not match params.name'}.`), { kind: 'request', era: 'modern', method, code: 'header_mismatch' });
      }
    }
    const meta = { [META_SERVER]: info };
    if (method === 'server/discover') {
      return out(200, rpcResult(id, {
        resultType: 'complete',
        supportedVersions: SUPPORTED_VERSIONS,
        capabilities: { tools: {} },
        instructions: INSTRUCTIONS,
        ttlMs: 3600000, cacheScope: 'public',
        _meta: meta
      }), { kind: 'request', era: 'modern', method, version: metaVersion });
    }
    if (method === 'tools/list') {
      return out(200, rpcResult(id, { resultType: 'complete', ...listTools(true), _meta: meta }), { kind: 'request', era: 'modern', method, version: metaVersion });
    }
    if (method === 'tools/call') {
      const r = runTool(params);
      if (r.error) return out(200, rpcError(id, r.error[0], r.error[1]), { kind: 'request', era: 'modern', method, code: 'invalid_params' });
      return out(200, rpcResult(id, { resultType: 'complete', ...r.result, _meta: meta }), { kind: 'request', era: 'modern', method, version: metaVersion, ...r.meta });
    }
    return out(404, rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method.slice(0, 64)}`), { kind: 'request', era: 'modern', method, code: 'method_not_found' });
  }

  /* ----- legacy era: requests after initialize ----- */
  let version = '2025-03-26';   // no header = the pre-header revision
  if (headerVersion != null) {
    if (MODERN_VERSIONS.includes(headerVersion)) {
      return out(400, rpcError(id, HEADER_MISMATCH, `Header mismatch: MCP-Protocol-Version ${headerVersion} requires _meta["${META_VERSION}"] in the request.`), { kind: 'request', era: 'modern', method, code: 'header_mismatch' });
    }
    if (!LEGACY_VERSIONS.includes(headerVersion)) {
      return out(400, rpcError(id, UNSUPPORTED_PROTOCOL_VERSION, 'Unsupported protocol version', { supported: SUPPORTED_VERSIONS, requested: String(headerVersion).slice(0, 32) }), { kind: 'request', era: 'legacy', method, code: 'unsupported_version' });
    }
    version = headerVersion;
  }
  if (method === 'ping') return out(200, rpcResult(id, {}), { kind: 'request', era: 'legacy', method, version });
  if (method === 'tools/list') return out(200, rpcResult(id, listTools(false)), { kind: 'request', era: 'legacy', method, version });
  if (method === 'tools/call') {
    const r = runTool(params);
    if (r.error) return out(200, rpcError(id, r.error[0], r.error[1]), { kind: 'request', era: 'legacy', method, code: 'invalid_params' });
    return out(200, rpcResult(id, r.result), { kind: 'request', era: 'legacy', method, version, ...r.meta });
  }
  return out(200, rpcError(id, METHOD_NOT_FOUND, `Method not found: ${method.slice(0, 64)}`), { kind: 'request', era: 'legacy', method, code: 'method_not_found' });
}
