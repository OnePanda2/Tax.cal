/* ============================================================================
   Tax.cal Plus — API worker (Cloudflare Workers + D1).

   Scope on purpose: this stores a completed review so it survives a refresh,
   a new device, or coming back next week. That is all. It deliberately does
   not do accounts.

   Why no accounts, no passwords, no email:
     - A review is retrieved with an unguessable link (id + secret token).
       Whoever holds the link holds the review; nobody else can reach it.
     - That means we never store an email, a name, or a password, so a breach
       exposes no identity — only an anonymous set of answers.
     - Deletion is self-service, which satisfies the right to erasure without
       a support process.
     - Everything expires on its own, so old data does not accumulate.

   What is stored: the answers, the salary/country context they were given
   with, and a snapshot of the findings shown at the time. No IP address is
   retained — the rate limiter keeps a salted hash of it for one hour.
   ========================================================================== */

const MAX_BODY = 64 * 1024;          // a review is ~4 KB; this is a generous cap
const RETENTION_DAYS = 365;          // reviews delete themselves after a year
const RATE_LIMIT = 20;               // writes per IP per window
const RATE_WINDOW_S = 3600;

const ALLOWED_ORIGINS = [
  'https://taxcal.siddheshthapa.com',
  'http://127.0.0.1:8765',
  'http://localhost:8765'
];

const COUNTRIES = ['UK', 'US', 'CA', 'AU', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT'];

/* ---- helpers ------------------------------------------------------------ */

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors(origin)
    }
  });
}

// URL-safe random id. 16 bytes = 128 bits, far beyond guessing.
function randomId(bytes) {
  const b = new Uint8Array(bytes || 16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Compare without leaking position of the first difference through timing.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Reject anything we did not expect rather than storing whatever arrives.
   Returns { ok: true, value } or { ok: false, error }. */
function validateReview(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be an object.' };

  const ctx = body.ctx;
  if (!ctx || typeof ctx !== 'object') return { ok: false, error: 'Missing ctx.' };
  if (!COUNTRIES.includes(ctx.countryKey)) return { ok: false, error: 'Unknown country.' };

  const gross = Number(ctx.gross);
  if (!isFinite(gross) || gross < 0 || gross > 100000000) return { ok: false, error: 'Gross out of range.' };

  const marginal = Number(ctx.marginalRate);
  if (!isFinite(marginal) || marginal < 0 || marginal > 1) return { ok: false, error: 'Marginal rate out of range.' };

  if (typeof body.answers !== 'object' || body.answers === null) return { ok: false, error: 'Missing answers.' };
  if (!Array.isArray(body.findings)) return { ok: false, error: 'Missing findings.' };

  // Free text the user typed. Cap it so it cannot be used as blob storage.
  const other = {};
  if (body.other && typeof body.other === 'object') {
    for (const k of Object.keys(body.other).slice(0, 40)) {
      if (typeof body.other[k] === 'string') other[k] = body.other[k].slice(0, 2000);
    }
  }

  return {
    ok: true,
    value: {
      country: ctx.countryKey,
      region: typeof ctx.region === 'string' ? ctx.region.slice(0, 8) : null,
      filing_status: typeof ctx.filingStatus === 'string' ? ctx.filingStatus.slice(0, 16) : null,
      gross: Math.round(gross),
      marginal_rate: marginal,
      answers: JSON.stringify(body.answers).slice(0, 20000),
      other_text: JSON.stringify(other).slice(0, 20000),
      findings: JSON.stringify(body.findings).slice(0, 30000)
    }
  };
}

/* Per-IP write limiter. Stores a salted hash of the address for one window,
   never the address itself. */
async function rateLimited(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const salt = env.RATE_SALT || 'taxcal-default-salt';
  const windowStart = Math.floor(Date.now() / 1000 / RATE_WINDOW_S) * RATE_WINDOW_S;
  const key = await sha256(salt + ip + windowStart);

  await env.DB.prepare(
    'INSERT INTO rate_limit (key, hits, window_start) VALUES (?1, 1, ?2) ' +
    'ON CONFLICT(key) DO UPDATE SET hits = hits + 1'
  ).bind(key, windowStart).run();

  const row = await env.DB.prepare('SELECT hits FROM rate_limit WHERE key = ?1').bind(key).first();
  return row && row.hits > RATE_LIMIT;
}

/* Housekeeping: drop expired reviews and stale limiter rows. Cheap enough to
   run opportunistically, and it means retention is enforced by the system
   rather than by anyone remembering. */
async function sweep(env) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM reviews WHERE expires_at < ?1').bind(now),
    env.DB.prepare('DELETE FROM rate_limit WHERE window_start < ?1').bind(now - RATE_WINDOW_S * 2)
  ]);
}

/* ---- handlers ----------------------------------------------------------- */

async function createReview(request, env, origin) {
  if (request.headers.get('Content-Length') > MAX_BODY) {
    return json({ error: 'Review too large.' }, 413, origin);
  }
  if (await rateLimited(env, request)) {
    return json({ error: 'Too many saves from this connection. Try again later.' }, 429, origin);
  }

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'Invalid JSON.' }, 400, origin); }

  const v = validateReview(body);
  if (!v.ok) return json({ error: v.error }, 400, origin);

  const id = randomId(8);            // 64 bits — the public handle
  const token = randomId(24);        // 192 bits — the secret
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const expires = now + RETENTION_DAYS * 86400;
  const r = v.value;

  await env.DB.prepare(
    'INSERT INTO reviews (id, token_hash, country, region, filing_status, gross, marginal_rate,' +
    ' answers, other_text, findings, created_at, expires_at)' +
    ' VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)'
  ).bind(id, tokenHash, r.country, r.region, r.filing_status, r.gross, r.marginal_rate,
    r.answers, r.other_text, r.findings, now, expires).run();

  return json({ id, token, expiresAt: expires }, 201, origin);
}

async function getReview(id, token, env, origin) {
  const row = await env.DB.prepare('SELECT * FROM reviews WHERE id = ?1').bind(id).first();
  const now = Math.floor(Date.now() / 1000);

  // Same response whether the id is wrong, the token is wrong, or it expired.
  // Anything more specific would confirm which ids exist.
  const deny = () => json({ error: 'Not found, or the link is wrong or expired.' }, 404, origin);
  if (!row || row.expires_at < now) return deny();
  if (!safeEqual(await sha256(token || ''), row.token_hash)) return deny();

  return json({
    id: row.id,
    ctx: {
      countryKey: row.country, region: row.region, filingStatus: row.filing_status,
      gross: row.gross, marginalRate: row.marginal_rate
    },
    answers: JSON.parse(row.answers),
    other: JSON.parse(row.other_text || '{}'),
    findings: JSON.parse(row.findings),
    createdAt: row.created_at,
    expiresAt: row.expires_at
  }, 200, origin);
}

async function deleteReview(id, token, env, origin) {
  const row = await env.DB.prepare('SELECT token_hash FROM reviews WHERE id = ?1').bind(id).first();
  if (!row) return json({ deleted: true }, 200, origin);   // already gone; say so plainly
  if (!safeEqual(await sha256(token || ''), row.token_hash)) {
    return json({ error: 'Not found, or the link is wrong or expired.' }, 404, origin);
  }
  await env.DB.prepare('DELETE FROM reviews WHERE id = ?1').bind(id).run();
  return json({ deleted: true }, 200, origin);
}

/* ---- router ------------------------------------------------------------- */

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (path === '/' || path === '/health') {
      return json({ ok: true, service: 'taxcal-plus-api' }, 200, origin);
    }

    const m = path.match(/^\/review(?:\/([a-f0-9]{16}))?$/);
    if (!m) return json({ error: 'Not found.' }, 404, origin);

    const id = m[1];
    ctx.waitUntil(sweep(env));   // opportunistic cleanup, never blocks the response

    try {
      if (!id && request.method === 'POST') return await createReview(request, env, origin);
      if (id && request.method === 'GET') return await getReview(id, url.searchParams.get('t'), env, origin);
      if (id && request.method === 'DELETE') return await deleteReview(id, url.searchParams.get('t'), env, origin);
      return json({ error: 'Method not allowed.' }, 405, origin);
    } catch (err) {
      // Never leak internals to the client; the detail goes to the Worker log.
      console.error('review handler failed', err && err.message);
      return json({ error: 'Something went wrong saving that. Nothing was charged and nothing was lost — try again.' }, 500, origin);
    }
  }
};
