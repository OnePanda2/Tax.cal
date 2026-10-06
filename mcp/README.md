# Tax.cal MCP server

The backend of the Tax.cal ChatGPT plugin: a stateless, read-only [Model Context Protocol](https://modelcontextprotocol.io) server on Cloudflare Workers. Every number comes from the same engine as the website (`packages/tax-core`). The model supplies arguments and explains results; it never does tax arithmetic.

| | |
|---|---|
| Endpoint | `POST https://taxcal-mcp.onepanda2.workers.dev/mcp` (after deployment) |
| Transport | Streamable HTTP, JSON responses only (no SSE stream, no sessions) |
| Protocol revisions | `2026-07-28` (stateless, `server/discover`, per-request `_meta`) and `2025-11-25`, `2025-06-18`, `2025-03-26` (`initialize` handshake) |
| Auth | None. The tools are public, read-only calculations |
| Storage | None. No database, KV, cache or outbound request |
| Cost | Cloudflare Workers Free plan |

## Tools

| Tool | What it does |
|---|---|
| `calculate_tax` | One employee's estimated tax for a country and tax year: income tax, social contributions, regional tax, optional indirect-tax estimate, take-home pay, breakdown, per-component confidence, sources and rule version |
| `compare_tax_regimes` | India only: new vs old regime, side by side, with the break-even deductions. Reports numbers. It never says which regime is "better" |
| `get_tax_rules` | The rules, assumptions, exclusions, sources, rule version and last-verified date for a country and year |
| `compare_countries` | The same gross income across countries at dated, approximate ECB exchange rates. Compares tax rules only, not cost of living |

All four tools are annotated `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`, and declare an `outputSchema`. Results come back as `structuredContent` with the same JSON in a text block. Errors are `isError: true` results with a code (`missing_input`, `invalid_input`, `out_of_range`, `unsupported_scope`, `unsupported_country`, `unsupported_region`, `unsupported_tax_year`) and a sentence the model can relay, for example *"I need your filing status to calculate this accurately"*.

## Files

```
mcp/
  wrangler.toml     Worker config: name, rate-limit binding, allowed Origins. No secrets
  src/worker.js     Worker entry. Exports the fetch handler only (workerd rejects other exports)
  src/app.js        Routing, HTTP guards, rate limiting, logging, /health
  src/protocol.js   JSON-RPC + MCP for both protocol eras
  src/tools.js      Tool definitions (JSON Schema 2020-12) and dispatch to packages/tax-core
  dev-server.mjs    Runs the Worker on Node's http module, with no Wrangler needed
  smoke.mjs         End-to-end check against any running server, local or deployed
```

## Run and test locally

```bash
npm ci
npm test                 # includes tests/mcp.test.mjs (protocol, guards, schemas, SDK clients, log privacy)
npm run mcp:dev          # http://127.0.0.1:8787/mcp
npm run mcp:smoke        # in a second terminal
```

To run it inside Cloudflare's own runtime (workerd), use `npx wrangler@4 dev --config mcp/wrangler.toml --port 8788`, then `npm run mcp:smoke -- http://127.0.0.1:8788/mcp`.

## Security and privacy

- **Inputs are never stored or logged.** Each request writes one JSON log line with operational fields only: route, HTTP status, protocol era and version, a known method name, the tool name, the validated country code, success or failure, an error code and the duration. Salaries, spending, deductions and any free text never reach the logs. `tests/mcp.test.mjs` checks this.
- **Strict validation.** Every argument is untrusted. Unknown keys, wrong types, negative or absurd amounts, oversized strings and prototype keys (`__proto__`, `constructor`) are rejected with a clear error. Material fields (US filing status and state, Canadian province) are asked for and never defaulted silently.
- **HTTP guards.** POST only (other methods get 405). Bodies are capped at 32 KB (413), whether or not `Content-Length` is sent, and must arrive within 10 seconds (408). The server requires `Content-Type: application/json` (415) and an `Accept` header that allows JSON (406). Browser `Origin`s must be on an allow-list (403); ChatGPT connects server-to-server and sends none. Rate limiting returns 429 with `Retry-After`. Unexpected failures get a generic 500 that echoes nothing.
- **Headers.** `Cache-Control: no-store`, `nosniff`, `Content-Security-Policy: default-src 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS. No CORS headers, because no browser needs to read these responses.
- **No secrets in the repo.** The only secret-like value, the OpenAI domain-verification token, is set with `wrangler secret put`.

## Deploy (owner only)

You need the Cloudflare account that already runs `taxcal-plus-api`, which uses the `onepanda2` workers.dev subdomain.

```bash
npx wrangler@4 login
# staging first
npx wrangler@4 deploy --config mcp/wrangler.toml --env staging
npm run mcp:smoke -- https://taxcal-mcp-staging.onepanda2.workers.dev/mcp
# then production (no --env)
npx wrangler@4 deploy --config mcp/wrangler.toml
npm run mcp:smoke -- https://taxcal-mcp.onepanda2.workers.dev/mcp
```

With no `--env`, Wrangler uses the top-level (production) settings and warns that no environment was named; that warning is expected. Do not use `--env=""`: Windows PowerShell mangles it.

If Wrangler prints a different URL, change `taxcal-plugin/mcp.json` to match it, or pass `--mcp-url` to `npm run plugin:zip`.

**OpenAI domain verification.** The OpenAI Platform shows a token when you submit the app. Store it as a secret:

```bash
npx wrangler@4 secret put OPENAI_APPS_CHALLENGE --config mcp/wrangler.toml   # no --env: production
curl https://taxcal-mcp.onepanda2.workers.dev/.well-known/openai-apps-challenge   # prints the token
```

**Monitoring.** `.github/workflows/mcp-health.yml` runs the smoke test against production every six hours once the repository variable `MCP_URL` is set (Settings → Secrets and variables → Actions → Variables), and GitHub emails you if it fails.

**Logs.** `npx wrangler@4 tail taxcal-mcp` streams the argument-free log lines. Workers Logs (persistent) is off by default. You can enable it under `[observability]` in `wrangler.toml` without changing the privacy position, because the lines contain no inputs.

## Updating tax rules

The server has no rule data of its own. Update `packages/tax-core` (see `docs/UPDATING_TAX_RULES.md`), run `npm test`, then redeploy the Worker and push the website. Both read the same rule set, so `rule_version` in a ChatGPT answer matches the website.
