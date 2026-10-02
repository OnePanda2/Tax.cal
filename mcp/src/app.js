/* ============================================================================
   Tax.cal MCP server — request handling (the Worker entry is worker.js).

   Routes
     POST /mcp                               MCP (Streamable HTTP, stateless)
     GET  /health                            liveness + rule versions (no user data)
     GET  /.well-known/openai-apps-challenge OpenAI domain verification token
     GET  /                                  short description of the service

   Privacy: request bodies are never logged or stored. Each request writes one
   structured log line with the route, tool, validated country, outcome and
   duration — never salaries, spending or any other argument. There is no
   database, no KV and no outbound request.
   ========================================================================== */
import { handleMessage, PARSE_ERROR, INVALID_REQUEST, SUPPORTED_VERSIONS } from './protocol.js';
import { ENGINE_VERSION, ORDER, getRules } from '../../packages/tax-core/src/index.js';

export const SERVER_VERSION = '1.0.0';
export const MAX_BODY_BYTES = 32 * 1024;
const DEFAULT_ALLOWED_ORIGINS = ['https://chatgpt.com', 'https://chat.openai.com'];
const DEFAULT_RATE_PER_MINUTE = 300;

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY'
};

function json(body, status = 200, extra = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...(body === null ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...SECURITY_HEADERS, ...extra }
  });
}
function text(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS, ...extra } });
}

/* ---- logging: operational facts only --------------------------------------- */
const SAFE = /^[\w./-]{1,64}$/;
export function logLine(fields, sink = console.log) {
  const clean = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
    else if (typeof v === 'string') clean[k] = SAFE.test(v) ? v : 'other';
  }
  sink(JSON.stringify({ svc: 'taxcal-mcp', ...clean }));
}

/* ---- rate limiting ------------------------------------------------------------
   Prefer Cloudflare's Rate Limiting binding (RATE_LIMITER in wrangler.toml);
   fall back to a per-isolate fixed window. Keyed by client IP. Note that
   ChatGPT calls arrive from OpenAI's servers, so the limit is generous: it is
   a flood guard, not a per-user quota. */
const windows = new Map();
export function memoryRateLimit(key, limit, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const w = windows.get(key);
  if (!w || w.minute !== minute) {
    if (windows.size > 5000) windows.clear();
    windows.set(key, { minute, count: 1 });
    return true;
  }
  w.count += 1;
  return w.count <= limit;
}

async function allowed(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (env && env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
    try { const { success } = await env.RATE_LIMITER.limit({ key: ip }); return success; } catch { /* fall through */ }
  }
  const limit = Number(env && env.RATE_LIMIT_PER_MINUTE) || DEFAULT_RATE_PER_MINUTE;
  return memoryRateLimit(ip, limit);
}

function originAllowed(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return true;   // server-to-server clients (ChatGPT, SDKs) send none
  const list = env && env.ALLOWED_ORIGINS ? String(env.ALLOWED_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ALLOWED_ORIGINS;
  return list.includes(origin);
}

/* Read the body with a hard cap, whether or not Content-Length is sent. */
async function readBody(request) {
  const len = request.headers.get('content-length');
  if (len && Number(len) > MAX_BODY_BYTES) return { tooLarge: true };
  if (!request.body) return { text: '' };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { try { await reader.cancel(); } catch {} return { tooLarge: true }; }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.byteLength; }
  return { text: new TextDecoder().decode(all) };
}

/* ---- health ---------------------------------------------------------------- */
export function healthBody() {
  const rules = {};
  for (const k of ORDER) { const R = getRules(k); rules[k] = { tax_year: R.taxYear, rule_version: R.ruleVersion, last_verified: R.lastVerified }; }
  return { ok: true, service: 'taxcal-mcp', version: SERVER_VERSION, engine_version: ENGINE_VERSION, countries: ORDER.length, rules };
}

/* ---- MCP endpoint ---------------------------------------------------------- */
async function mcp(request, env, started) {
  if (request.method !== 'POST') {
    return { res: json({ jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Use POST. This server does not offer an SSE stream or sessions.' } }, 405, { Allow: 'POST' }), log: { route: 'mcp', status: 405 } };
  }
  if (!originAllowed(request, env)) {
    return { res: json({ jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Origin not allowed.' } }, 403), log: { route: 'mcp', status: 403 } };
  }
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  if (!ct.startsWith('application/json')) {
    return { res: json({ jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'Content-Type must be application/json.' } }, 415), log: { route: 'mcp', status: 415 } };
  }
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (accept && !/application\/json|\*\/\*|application\/\*/.test(accept)) {
    return { res: json({ jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: 'This server responds with application/json.' } }, 406), log: { route: 'mcp', status: 406 } };
  }
  if (!(await allowed(request, env))) {
    return { res: json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Too many requests. Please retry in a minute.' } }, 429, { 'Retry-After': '60' }), log: { route: 'mcp', status: 429 } };
  }
  const body = await readBody(request);
  if (body.tooLarge) {
    return { res: json({ jsonrpc: '2.0', id: null, error: { code: INVALID_REQUEST, message: `Request body exceeds ${MAX_BODY_BYTES} bytes.` } }, 413), log: { route: 'mcp', status: 413 } };
  }
  let message;
  try { message = JSON.parse(body.text); }
  catch { return { res: json({ jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error: body is not valid JSON.' } }, 400), log: { route: 'mcp', status: 400, code: 'parse_error' } }; }

  const r = handleMessage(message, request.headers, SERVER_VERSION);
  const log = { route: 'mcp', status: r.status, ...r.log };
  if (log.method !== undefined && !KNOWN_METHODS.has(log.method)) log.method = 'other';
  return { res: json(r.body, r.status), log };
}

/* Only these method names are logged verbatim; anything a client invents is
   logged as "other", so no free text from a request reaches the logs. */
const KNOWN_METHODS = new Set(['initialize', 'ping', 'tools/list', 'tools/call', 'server/discover', 'notifications/initialized', 'notifications/cancelled']);

export async function handle(request, env, ctx) {
  const started = Date.now();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  let res, log;
  try {
    if (path === '/mcp') {
      ({ res, log } = await mcp(request, env || {}, started));
    } else if (path === '/health' && (request.method === 'GET' || request.method === 'HEAD')) {
      res = json(healthBody()); log = { route: 'health', status: 200 };
    } else if (path === '/.well-known/openai-apps-challenge' && request.method === 'GET') {
      const token = env && env.OPENAI_APPS_CHALLENGE;
      res = token ? text(String(token).trim()) : text('Not configured', 404);
      log = { route: 'challenge', status: res.status };
    } else if (path === '/' && request.method === 'GET') {
      res = json({
        service: 'Tax.cal MCP server', mcp_endpoint: url.origin + '/mcp', transport: 'streamable-http',
        protocol_versions: SUPPORTED_VERSIONS,
        website: 'https://taxcal.siddheshthapa.com/', privacy: 'https://taxcal.siddheshthapa.com/privacy/', terms: 'https://taxcal.siddheshthapa.com/terms/'
      });
      log = { route: 'root', status: 200 };
    } else {
      res = json({ error: 'Not found' }, 404); log = { route: 'other', status: 404 };
    }
  } catch (err) {
    // Never echo internals or inputs; the error class is enough to debug.
    res = json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error. Nothing was stored.' } }, 500);
    log = { route: 'error', status: 500, code: err && err.name ? String(err.name) : 'Error' };
  }
  logLine({ ...log, ms: Date.now() - started });
  return res;
}
