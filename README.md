# Tax.cal

**See the tax you really pay.** Tax.cal estimates someone's *total* tax burden on a salary: income tax, social contributions, state, provincial or regional tax, and the VAT, GST, sales tax and fuel duty inside everyday spending. It shows them as one effective rate, with a shareable "Tax Wrapped" card.

It is used in two ways, both powered by one deterministic tax engine:

- **The website**, https://taxcal.siddheshthapa.com, is a fast, installable web app (PWA) that calculates entirely in the browser.
- **The Tax.cal plugin for ChatGPT** uses an MCP server that runs the same engine, so ChatGPT can answer tax questions with sourced, versioned figures instead of doing the arithmetic itself.

> ⚠️ **Estimates only, not tax advice.** Direct taxes are calculated from each country's published rules. Indirect tax is a transparent estimate with confidence labels. Tax.cal never files returns or makes payments.

## Supported countries

| Country | Tax year | Notes |
|---|---|---|
| 🇬🇧 United Kingdom | 2026/27 | England, Wales, Northern Ireland (Scotland not supported) |
| 🇺🇸 United States | 2026 | Federal + FICA + all 50 states and DC. California exact; other states a proxy |
| 🇨🇦 Canada | 2026 | Federal + every province and territory, including Quebec (QPP, QPIP, abatement) |
| 🇦🇺 Australia | 2026-27 | Residents; LITO and Medicare levy |
| 🇮🇪 Ireland | 2026 | PAYE, USC and PRSI |
| 🇩🇪 Germany | 2026 | §32a tariff, solidarity surcharge, social insurance |
| 🇫🇷 France | 2026 | Barème, décote, salary contributions |
| 🇳🇱 Netherlands | 2026 | Box 1 with the general and labour credits |
| 🇪🇸 Spain | 2026 | Representative state + regional IRPF scale |
| 🇮🇹 Italy | 2026 | IRPEF with the 2026 credits; Milan/Lombardy surcharges |
| 🇮🇳 India | Tax Year 2026-27 | New regime (default) and old regime; legacy FY 2025-26 (AY 2026-27) |

Every rule set has a version (for example `IN-2026-27-v1`), its tax-year period, the date it was last verified, and its sources. The full list is [docs/TAX_RULE_SOURCES.md](docs/TAX_RULE_SOURCES.md), generated from the code.

## India

Tax.cal implements the **Income-tax Act, 2025**, in force from 1 April 2026, which uses a single **tax year** instead of "previous year" and "assessment year". It covers:

- Tax Year 2026-27 for a salaried individual, resident or non-resident;
- the new regime (§202) and the old regime side by side;
- the ₹75,000 / ₹50,000 standard deduction;
- the §156 rebate (no tax up to ₹12 lakh of taxable income, so up to ₹12.75 lakh of salary) with marginal relief;
- surcharge with marginal relief, and 4% cess;
- old-regime deductions at their statutory caps;
- the deductions at which the two regimes cost the same;
- monthly tax and take-home pay.

"AY 2026-27" is recognised as FY 2025-26 under the 1961 Act and is never confused with Tax Year 2026-27. Business income, capital gains, HUFs, firms, companies, foreign income, TDS, GST filing and return preparation are out of scope and refused clearly. GST and fuel duty are category estimates. Details: [docs/INDIA_TAX_MODEL.md](docs/INDIA_TAX_MODEL.md).

## How calculations work

All rules and arithmetic live in **`packages/tax-core`**:

```
packages/tax-core/src/
  rules/<country>.js   rates, thresholds, credits, caps, sources, versions, assumptions, exclusions
  calc/<country>.js    pure calculators (gross → taxable → tax, line by line)
  engine.js            website results (direct + indirect, effective rate, share card)
  api.js               the four tool operations used by the MCP server
  validate.js          strict validation of untrusted input
  categories.js, fx.js spending profile; dated ECB exchange rates (comparisons only)
```

The browser bundle `assets/tax-core.js` is built from it with esbuild (`npm run build:core`). The MCP server imports it directly. There is one source of truth, and a test fails if the bundle is out of date.

### What is precise, and what is estimated

- **Calculated from the law, high confidence:** national income tax and employee social contributions for the stated profile (single employee, salary only). India's slabs, rebate, surcharge and cess. California's state tax.
- **Simplified, medium confidence:** France (one tax part), Spain (a representative regional scale), Italy (Milan surcharges; cash bonuses below €20k not modelled), Canadian provincial credits.
- **Proxy, low confidence:** US state income tax outside California (federal taxable income on the state's single schedule).
- **Estimated, low to medium confidence:** the tax inside spending (VAT, GST, sales tax, fuel duty). This is spending × an effective rate per category, computed tax-inclusively. Without the user's spending, a typical-household profile is used and reported.
- **Not included:** local and city income taxes, church tax, student loans, pension contributions, credits for dependants, and anything beyond salary income.

Each result reports confidence **per component**, never as a single score.

## The website

- Pick a country (and a state, province or Indian regime), enter a salary, adjust monthly spending, and see direct and indirect tax, the effective rate, tax freedom day, tips, a comparison with other countries, and the Tax Wrapped share card.
- Calculations run **in the browser**: nothing is sent anywhere. The only data on the device is the theme preference.
- Country pages (`/country/<slug>/`, including `/country/india/`), the hidden-tax guide and the tax-by-country comparison are generated from the engine.
- Deep links: `#c=IN`, `#c=US&s=CA`, `#c=CA&s=QC`.
- It works offline as a PWA (`sw.js`, cache `taxcal-vNN`).
- **Tax.cal Plus** is a questionnaire for reviewing your situation. It stores your answers only if you press Save, behind a private link (`api/`, Cloudflare Worker + D1). It covers the original ten countries.
- **"You could keep up to …"** is an illustrative ceiling: your marginal rate × your country's main tax-advantaged allowance. It is labelled as a typical case, not advice, and is not shown for India.

## The MCP server

`mcp/` is a stateless, read-only MCP server on Cloudflare Workers (free plan). It speaks the MCP 2026-07-28 revision (with `server/discover`) and the 2025 revisions (with `initialize`), and returns JSON only. Its tools are:

| Tool | Purpose |
|---|---|
| `calculate_tax` | Tax, take-home pay and breakdown for one salary and country |
| `compare_tax_regimes` | India: new vs old regime and the break-even deductions |
| `get_tax_rules` | The rules, assumptions, sources and versions (one country, or an overview) |
| `compare_countries` | One salary across countries (tax rules, not cost of living) |

All are annotated read-only, idempotent and closed-world, with output schemas. Inputs are strictly validated. Missing material inputs (a US filing status or state, a Canadian province) are asked for, never guessed. Details: [mcp/README.md](mcp/README.md) and [docs/PLUGIN_ARCHITECTURE.md](docs/PLUGIN_ARCHITECTURE.md).

## The plugin

`taxcal-plugin/` is a portable [Agent Plugins](https://agent-plugins.org/) package with OpenAI's extension. It contains:

- `plugin.json`: the listing, starter prompts, review test cases and release notes;
- `mcp.json`: the server URL;
- `skills/tax-cal-analysis`: the workflow the model follows;
- the logo.

`npm run plugin:zip` builds the upload ZIP after checking OpenAI's limits and scanning for secrets. There is no embedded UI in v1. Each answer includes at most one link to Tax.cal.

## Privacy

| Surface | What happens to your figures |
|---|---|
| Website calculator | Calculated in your browser. Nothing leaves your device |
| Tax.cal Plus | Stays on your device unless you press Save; then stored behind a private link you can delete. No name, email or password |
| ChatGPT plugin | Sent to Tax.cal's calculation service to compute the answer and **not retained**. The service has no database, and its logs contain only the tool, the country code, the outcome and the duration, never your figures |

Analytics are aggregate only. The website uses Plausible (no cookies). The plugin counts calculations by tool and country from those log lines. No salary or other tax detail is ever an analytics dimension. Full policy: https://taxcal.siddheshthapa.com/privacy/.

## Run it locally

```bash
npm ci                     # dev tools only: esbuild, ajv, MCP SDK clients
npm start                  # website on http://localhost:8080 (python -m http.server)
npm run mcp:dev            # MCP server on http://127.0.0.1:8787/mcp
npm run mcp:smoke          # end-to-end check of the MCP server
```

Use `http://`, not `file://`, because the site registers a service worker.

## Test

```bash
npm test
```

The suite covers:

- **Regression:** the existing ten countries against a baseline.
- **Golden figures:** official tables and hand calculations, each with its source, date and tolerance.
- **Bracket edges:** every bracket table just below, at and just above each threshold.
- **India:** slabs, rebate and marginal relief, surcharge, cess, regimes, years and scope.
- **Validation:** negative, NaN, absurd, malformed, prototype-pollution and oversized input.
- **The MCP server:** both protocol eras, header checks, HTTP guards, output schemas, the official SDK v1 and v2 clients, and log privacy.
- **The plugin package:** schemas, OpenAI limits, review cases checked against the tools, and the ZIP.
- **The website:** bundle freshness, country pages, sitemap, share card, privacy wording and the generated docs.

CI runs it on every push (`.github/workflows/ci.yml`).

## Update tax rules

Follow [docs/UPDATING_TAX_RULES.md](docs/UPDATING_TAX_RULES.md). In short:

1. Edit `packages/tax-core/src/rules/<country>.js` from official sources.
2. Bump the rule version and `lastVerified`.
3. Update the hand-calculated tests.
4. Run `npm test`, then `npm run build:all`.
5. Bump the service-worker cache.
6. Redeploy the MCP server.
7. Check the plugin's answers.

## Deploy

**Website (GitHub Pages).** Pushing `main` deploys: Pages serves the repo root. Keep `CNAME` (`taxcal.siddheshthapa.com`), `.nojekyll` and the DNS record `CNAME taxcal → onepanda2.github.io`. The IndexNow workflow pings search engines on each push. The domain appears in `index.html`, `robots.txt`, `sitemap.xml`, the build scripts (`SITE`), `packages/tax-core/src/api.js` and `share.js`.

**Single-file builds.** `npm run build` writes `dist/index.single.html` (the whole app in one file) and `dist/taxcal-artifact.html` (the body-only Artifact build).

**MCP server (Cloudflare).**

```bash
npx wrangler@4 deploy --config mcp/wrangler.toml --env staging
npx wrangler@4 deploy --config mcp/wrangler.toml                 # production: no --env
```

With no `--env`, Wrangler uses the top-level (production) settings and warns that no environment was named; that warning is expected. Do not use `--env=""`: Windows PowerShell mangles it. This deploys to `https://taxcal-mcp.onepanda2.workers.dev/mcp`. After deploying, run `npm run mcp:smoke -- <url>`, and set the repository variable `MCP_URL` to enable the six-hourly health check.

**Plus API.** See [api/README.md](api/README.md).

## Submit the plugin

Follow [docs/OPENAI_SUBMISSION.md](docs/OPENAI_SUBMISSION.md). It covers organization verification, deploying the server, domain verification, building the ZIP, the walkthrough video, the test cases and the reviewer notes. No reviewer account is needed, because the tools need no sign-in.

## Email capture (Formspree)

The early-access form posts to Formspree (`CONFIG.formspree` in `assets/app.js`) with the selected country, so sign-ups show which markets are interested. If the endpoint is blanked out, the form degrades gracefully.

## Distribution and SEO

- `WebApplication` and `FAQPage` JSON-LD, canonical URLs, social metadata, `sitemap.xml` and `robots.txt`.
- One genuinely useful page per country, with worked examples and an FAQ (including India: new vs old regime, ₹12 lakh, Tax Year 2026-27), plus `/hidden-tax/` and `/tax-by-country/`.
- Fast and light: no framework, one stylesheet. The only third-party script is Plausible's cookieless counter.

Next steps: Search Console and Bing Webmaster Tools (Bing powers ChatGPT search), directory listings (Product Hunt, Show HN, Indie Hackers, AlternativeTo), and PageSpeed checks.

## Docs

| Document | What it covers |
|---|---|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Architecture decisions, audit findings, status |
| [docs/TAX_RULE_SOURCES.md](docs/TAX_RULE_SOURCES.md) | Every rule set, source, assumption and exclusion (generated) |
| [docs/INDIA_TAX_MODEL.md](docs/INDIA_TAX_MODEL.md) | The India model in depth |
| [docs/PLUGIN_ARCHITECTURE.md](docs/PLUGIN_ARCHITECTURE.md) | Engine, MCP server, plugin, security, versions, cost |
| [docs/UPDATING_TAX_RULES.md](docs/UPDATING_TAX_RULES.md) | The annual update procedure |
| [docs/OPENAI_SUBMISSION.md](docs/OPENAI_SUBMISSION.md) | Submission checklist, reviewer script |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | What changed, by release |

---

© 2026 Tax.cal · Estimates only, not tax advice.
