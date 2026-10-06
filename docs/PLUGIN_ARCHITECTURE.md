# Plugin architecture

How the Tax.cal website, the MCP server and the ChatGPT plugin fit together, and why they are built this way. Read this before changing anything that crosses the boundary between them.

## One engine, two surfaces

```
packages/tax-core/            ← the only place tax rules and arithmetic live
  src/rules/<cc>.js             rule data: rates, thresholds, sources, versions, assumptions
  src/calc/<cc>.js              pure calculators
  src/engine.js                 compute() for the website; runDirect(); indirect estimates
  src/api.js                    calculateTax / compareTaxRegimes / getTaxRules / compareCountries
  src/validate.js               strict validation of untrusted arguments
        │                                   │
        ▼ esbuild (IIFE, es2019)            ▼ ES-module import
assets/tax-core.js                  mcp/src/tools.js → protocol.js → app.js → worker.js
(window.TAXCAL_DATA, TaxEngine)     (Cloudflare Worker, stateless)
        │                                   │
website, country pages, Plus,       ChatGPT (via taxcal-plugin/mcp.json)
single-file and Artifact builds     + skills/tax-cal-analysis (the workflow)
```

- **Website:** the browser loads `assets/tax-core.js`, a bundle of `packages/tax-core` that `tests/site.test.mjs` checks is up to date. Calculations run on the device, and nothing is sent anywhere.
- **MCP server:** `mcp/` imports the same modules directly. A result in ChatGPT and on the website for the same inputs is the same number, with the same `rule_version`.
- **Generated pages:** the country pages, guides, comparison page and `docs/TAX_RULE_SOURCES.md` are built from the same rule data (`npm run build:all`).

The model never does tax arithmetic. The skill tells it to call a tool for every figure, and every tool returns the figures, the breakdown, the defaults applied, per-component confidence, assumptions, exclusions, sources, `rule_version` and `last_verified`, so the model explains numbers rather than producing them.

## MCP server (`mcp/`)

| File | Responsibility |
|---|---|
| `src/worker.js` | Worker entry. Exports `{ fetch }` only, because workerd rejects any other named export from the entry module |
| `src/app.js` | Routing (`/mcp`, `/health`, `/.well-known/openai-apps-challenge`, `/`), HTTP guards, rate limiting, security headers and the one-line log |
| `src/protocol.js` | JSON-RPC 2.0 and MCP for both protocol eras |
| `src/tools.js` | Tool descriptors (JSON Schema 2020-12 input and output schemas, annotations) and dispatch to `packages/tax-core/src/api.js` |
| `dev-server.mjs` | Runs `app.js` on Node's `http`, for local use and the SDK tests |
| `smoke.mjs` | End-to-end check against any URL. Used after deploys and every six hours by `.github/workflows/mcp-health.yml` |
| `chatgpt-app-submission.json` | Import file for the OpenAI submission form: app info, tool hints with justifications, test cases |

### Protocol

- **Transport:** Streamable HTTP, POST only. Responses are single JSON objects; there is no SSE stream. GET and DELETE return 405. The server issues no `Mcp-Session-Id`, because it holds no state.
- **2026-07-28 (modern):** no handshake. Every request carries `params._meta["io.modelcontextprotocol/protocolVersion"]`, and the HTTP headers `MCP-Protocol-Version`, `Mcp-Method` and, for `tools/call`, `Mcp-Name` (plain or `=?base64?…?=`), which must match the body. A mismatch returns HTTP 400 with `-32020`. `server/discover` lists the supported versions. Results carry `resultType: "complete"` and `_meta["io.modelcontextprotocol/serverInfo"]`. `tools/list` is cacheable (`ttlMs`, `cacheScope: "public"`). An unsupported version returns 400 with `-32022` and the supported list. An unknown method returns 404 with `-32601`.
- **2025-11-25 / 2025-06-18 / 2025-03-26 (legacy):** `initialize` negotiates the version. Later requests send `MCP-Protocol-Version`; when it is absent, 2025-03-26 is assumed. Supports `ping`, `tools/list` and `tools/call`.
- **Verified with:** the official TypeScript SDK v1 client (`@modelcontextprotocol/sdk` 1.31) and the v2 client (`@modelcontextprotocol/client` 2.2) in legacy, auto-negotiated and pinned-2026-07-28 modes. Both run over real HTTP against `dev-server.mjs` in `tests/mcp.test.mjs`. The server was also smoke-tested inside workerd, Cloudflare's runtime, through `wrangler dev`.

### Tools

| Tool | Input (required in bold) | Output highlights |
|---|---|---|
| `calculate_tax` | **country**, **gross_income**, tax_year, filing_status (US, required there), region (US/CA required), regime, residency, age_band, old_regime_deductions, has_children, monthly_spending, include_indirect_estimate | direct_tax, social_contributions, regional_tax, total_direct_tax, indirect_tax_estimate (by category), effective_rate, net and monthly income, breakdown, defaults_applied, confidence per component, sources, rule_version, last_verified, tax_year_period, learn_more |
| `compare_tax_regimes` | **gross_income**, tax_year, residency, age_band, old_regime_deductions | regimes.new and regimes.old (full breakdowns), difference.lower_estimated_tax, old_regime_breakeven_deductions, explanation, eligibility_caveats |
| `get_tax_rules` | country (omit for the overview), tax_year, topic | the rules, scope, assumptions, exclusions, sources and versions. Without a country: every country's year, version and last-verified date, and the indirect-tax method |
| `compare_countries` | **gross_income**, **currency**, countries, include_indirect_estimate | rows in the requested order, with the FX source and date and caveats (not cost of living, not a ranking) |

All four tools are annotated `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true` and `openWorldHint: false`, and declare an `outputSchema`. `tests/mcp.test.mjs` validates 80+ real results against those schemas with Ajv in 2020-12 strict mode. Errors are `isError: true` results whose text begins with a sentence the model can relay (*"I need your filing status to calculate this accurately…"*), followed by a JSON error code.

### Validation (packages/tax-core/src/validate.js)

Every argument is untrusted.

- Arguments must be plain objects. Unknown keys and `__proto__`, `constructor` and `prototype` are rejected at every level.
- Amounts must be finite, non-negative numbers below a currency cap (1e9, or 1e11 for INR).
- Strings are at most 64 characters, and enums are checked.
- Region and filing status are validated per country. Fields that do not apply to a country are rejected (for example `regime` for the UK).
- Material fields (US filing status and state, Canadian province) return `missing_input` and are never defaulted. Every other default is reported in `defaults_applied`.

### Security and privacy controls (mcp/src/app.js)

| Control | Behaviour |
|---|---|
| Body size and time | 32 KB cap, enforced while streaming whether or not `Content-Length` is sent (413). The body must arrive within 10 s (408) |
| Methods | POST only (405 with `Allow: POST`) |
| Content negotiation | `Content-Type: application/json` required (415); `Accept` must allow JSON (406) |
| Origin | Browser Origins must be on `ALLOWED_ORIGINS` (403). Server-to-server clients such as ChatGPT send none |
| Rate limiting | The Cloudflare Rate Limiting binding (300 per minute per client IP per location), with an in-memory fallback. Returns 429 with `Retry-After` |
| Errors | Unexpected failures return a generic 500 that echoes nothing |
| Headers | `Cache-Control: no-store`, `nosniff`, CSP `default-src 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS. No CORS headers |
| Storage | None: no D1, KV, R2, Durable Objects or Cache API, and no outbound `fetch` (enforced by a test) |
| Logging | One JSON line per request: route, status, era, known method, tool, validated country code, ok, error code, ms. No argument value or free text. Unknown method names are logged as `other`. `tests/mcp.test.mjs` checks this with distinctive salary values |
| Secrets | None in the repo or the ZIP. The domain-verification token is a Wrangler secret |
| CPU | Under 1 ms per warm call, about 4 ms cold, well inside the Workers free-plan CPU limit. Indian digit grouping avoids Intl, which saves about 12 ms of ICU start-up |

The privacy page states the ChatGPT data flow: inputs are sent to the calculation service to perform the calculation, and are not retained for ordinary requests. That statement holds because of the controls above, and `tests/site.test.mjs` pins the wording.

## The plugin package (`taxcal-plugin/`)

An [Agent Plugins](https://agent-plugins.org/) 1.0.0 package with OpenAI's `extensions["com.openai"]`:

- `plugin.json`: identity (`taxcal`, displayed as "Tax.cal"), listing text, category Finance, capabilities, URLs (website, support, privacy, terms), three starter prompts, brand colours, icon and logo, the onboarding skill, the review test cases (exactly five positive and three negative), `commerce: false` and release notes.
- `mcp.json`: one streamable-HTTP server, `https://taxcal-mcp.onepanda2.workers.dev/mcp`, with no headers or credentials.
- `skills/tax-cal-analysis/`: the 12-step workflow, with India year terminology, per-country inputs and worked examples.
- `assets/`: a square PNG logo (512 px) and icon (192 px).
- `tests/cases.json`: 24 conversation cases (positive, clarifying and negative, including malformed input and unsupported jurisdictions). It stays in the repo; the ZIP ships only what clients load.

`scripts/plugin-package.mjs` validates the package against OpenAI's published limits (name and short description at most 30 characters, long description at most 4,000, at most 3 prompts of at most 128 characters, a category from the allowed list, at most 20 capabilities of at most 120 characters, https URLs, brand-colour contrast of at least 2:1, square PNG images of 48–4,096 px and at most 5 MiB, exactly 5 positive and 3 negative cases, release notes). It also checks the Agent Skills frontmatter rules and broken links, and scans every file for secrets, local paths and localhost URLs. `npm run plugin:zip` builds `dist/taxcal-plugin.zip` reproducibly (fixed timestamps, sorted entries) and refuses to build if any check fails. `tests/plugin.test.mjs` also validates the manifest against the Agent Plugins JSON schemas. It runs every review case through the real tools, so the amounts quoted to reviewers always match the engine.

There is no embedded UI in v1. The plugin is conversation, tools, skill and structured results, which keeps it simple to test and review. The one link to Tax.cal is the `learn_more` URL (`utm_source=chatgpt&utm_medium=plugin`), and the skill uses it at most once per answer.

## Versions

| Version | Where | Bump when |
|---|---|---|
| Rule version (`IN-2026-27-v1`) | each rule set | a rule set's data changes |
| `lastVerified` | each rule set | sources are re-checked |
| `ENGINE_VERSION` (2.0.0) | `packages/tax-core/src/engine.js` | calculation behaviour or output shape changes |
| `SERVER_VERSION` (1.0.0) | `mcp/src/app.js` | the MCP server's behaviour changes |
| Plugin `version` (1.0.0) | `taxcal-plugin/plugin.json` | the listing, skill or tools change |
| Site cache `taxcal-vNN` | `sw.js` and asset `?v=` | any website asset changes |

## Deployment and cost

| Piece | Host | Deploy | Cost |
|---|---|---|---|
| Website | GitHub Pages (`main`, repo root, `CNAME`) | push to `main` (IndexNow pings search engines) | free |
| MCP server | Cloudflare Workers, free plan (`taxcal-mcp.onepanda2.workers.dev`) | `npx wrangler@4 deploy --config mcp/wrangler.toml` (no `--env` = production; staging: `--env staging`) | free at current scale |
| Plus API (existing) | Cloudflare Workers + D1 (`taxcal-plus-api`) | unchanged | free tier |
| Health check | GitHub Actions cron (`mcp-health.yml`) | runs once `vars.MCP_URL` is set | free (public repository) |
| CI | GitHub Actions (`ci.yml`) | every push and pull request | free (public repository) |

There is no paid database, no paid analytics and no paid API. The only new external service is Cloudflare Workers, which the Plus API already uses. It is needed because ChatGPT can only call a public HTTPS endpoint, it costs nothing at this scale, and it can be removed by deleting the Worker without affecting the website.

## Usage analytics, without personal data

The per-request log line is the analytics event: for example `{"route":"mcp","tool":"calculate_tax","country":"IN","ok":true}`. Counts by tool, country, success or error code, and era answer "how many calculations", "which countries", "how much India" and "what is the error or unsupported rate". View them with `wrangler tail`, or enable Workers Logs to query them. Website visits from ChatGPT show up in Plausible through the `utm_source=chatgpt` links.

Repeat usage cannot be measured, by design: there is no user identifier, and none will be added for analytics.
