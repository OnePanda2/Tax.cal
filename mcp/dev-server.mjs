#!/usr/bin/env node
/* ============================================================================
   Local development server for the Tax.cal MCP Worker.

   Runs the Worker's own fetch handler on Node's http module, so the server
   can be tried and tested without Wrangler or a Cloudflare account. The
   request body is streamed to the Worker untouched, so its size cap,
   header checks and logging behave exactly as in production.

     npm run mcp:dev                 → http://127.0.0.1:8787/mcp
     PORT=9000 npm run mcp:dev
   ========================================================================== */
import http from 'node:http';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import worker from './src/worker.js';

export function createServer(env = {}) {
  return http.createServer(async (req, res) => {
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (Array.isArray(v)) for (const x of v) headers.append(k, x);
        else if (v != null) headers.set(k, v);
      }
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(`http://${req.headers.host || '127.0.0.1'}${req.url}`, {
        method: req.method,
        headers,
        body: hasBody ? Readable.toWeb(req) : undefined,
        duplex: 'half'
      });
      const response = await worker.fetch(request, env, { waitUntil() {} });
      const out = {};
      response.headers.forEach((v, k) => { out[k] = v; });
      res.writeHead(response.status, out);
      if (req.method === 'HEAD' || !response.body) { res.end(); return; }
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Dev server error');
    }
  });
}

/* Start on a port (0 = any free port). Resolves to { server, url, close }. */
export function start({ port = 8787, host = '127.0.0.1', env = {} } = {}) {
  const server = createServer(env);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const { port: actual } = server.address();
      const base = `http://${host}:${actual}`;
      resolve({ server, url: `${base}/mcp`, base, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = {};
  for (const k of ['ALLOWED_ORIGINS', 'RATE_LIMIT_PER_MINUTE', 'OPENAI_APPS_CHALLENGE']) if (process.env[k]) env[k] = process.env[k];
  const { url, base } = await start({ port: Number(process.env.PORT) || 8787, env });
  console.log(`Tax.cal MCP dev server\n  MCP endpoint: ${url}\n  Health:       ${base}/health`);
}
