# Tax.cal — implementation plan: shared tax core, India, and the ChatGPT plugin

_Written 2 October 2026, after a full read of the repository at commit `8abc8d6` and a
round of primary-source research. This document records what the code did before this
work, what was wrong with it, and the design that replaces it. It is kept up to date as
the work lands — see the status column in §13 and the changelog at the end._

---

## 1. Current architecture (before this work)

Tax.cal is a static, framework-free site served by **GitHub Pages from the root of
`main`** (`CNAME` → `taxcal.siddheshthapa.com`, `.nojekyll`, so files are served as-is).

| Piece | Files | Notes |
| --- | --- | --- |
| Calculator page | `index.html`, `styles.css`, `assets/app.js` | One page: inputs, results, comparison, Tax Freedom Day, tips, Tax Wrapped share card, early-access form (Formspree), Plausible events. |
| Tax data | `assets/tax-data.js` | Assigns `window.TAXCAL_DATA`: countries, VAT/category fractions, US states, Canadian provinces, FX, savings caps. |
| Tax engine | `assets/tax-engine.js` | Assigns `window.TaxEngine`: bracket tables (in code), per-country direct tax, indirect estimate, FX conversion, `estimateSavings`, `compute`. |
| Tax.cal Plus | `plus/index.html`, `assets/plus-*.js` | Questionnaire + rules engine (10 countries), optional save via the Plus API. |
| Plus API | `api/` (Cloudflare Worker + D1) | Saves/reopens/deletes a review behind an unguessable link. Hard-codes its own 10-country list. |
| Generated pages | `build-country-pages.mjs` → `country/*/`, `build-guide-pages.mjs` → `hidden-tax/`, `build-compare-page.mjs` → `tax-by-country/` | Each script `eval`s the two asset files with a fake `window`, so pages use live engine numbers. |
| Single-file builds | `build-artifact.mjs` → `dist/index.single.html`, `dist/taxcal-artifact.html` | Inlines CSS + the three scripts. |
| PWA | `manifest.webmanifest`, `sw.js` | Network-first for HTML/JS/CSS; cache key `taxcal-v18` plus `?v=18` on asset URLs. |
| SEO | `robots.txt`, `sitemap.xml`, JSON-LD in each page | IndexNow workflow (`.github/workflows/indexnow.yml`) submits the sitemap on every push to `main`. |

There was **no test suite, no CI, no dependency manifest beyond a script list**, and no
record in code of which source each number came from.

## 2. Current data model

`TAXCAL_DATA` = `{ meta, fxUSD, categories[6], countries{10}, order[10], usStates{51},
caProvinces{13}, regionTable{US,CA}, savingsCap }`.

* Each country carries display strings, `taxYear`, currency, a `note`, three tips, and
  indirect-tax **category fractions** (`cat`) with confidence labels (`catConf`) — or, for
  the US/Canada, a `catShare` that is multiplied by the chosen state/province sales tax
  using the tax-inclusive formula `r/(1+r)`.
* Income-tax **brackets live in the engine**, not the data file, so "update the data
  file only" (the file's own header) was not actually true.
* FX table: `GBP 1.27, USD 1.00, EUR 1.08` — **no CAD or AUD**.

## 3. Current tax-engine architecture

`directTaxFor(key, y, {status, region})` is a `switch` over ten hand-written country
functions returning `{income, social, state, total}`. `compute(input)` adds the indirect
estimate per category, a type breakdown, a cross-country comparison (salary converted at
the static FX table, direct tax only), Tax Freedom Day, and `estimateSavings` (marginal
rate × the country's main tax-advantaged cap, with a floor). All direct-tax lines are
labelled `conf: 'high'` ("known rate") in the UI regardless of how they are computed.

## 4. Current web flow

`boot()` → fill selects → UK £45,000 example (or the `#c=XX&s=YY` deep link) → prefill
spending at fixed fractions of salary → `compute` → `render`. Every input re-computes;
results, the hero "proof" line, the share card and the deep link all derive from the same
result object. The Plus page receives the current inputs through `sessionStorage`.

## 5. Current SEO / distribution architecture

WebApplication + FAQPage JSON-LD on the home page; FAQ + Breadcrumb JSON-LD on generated
pages; canonical URLs; Open Graph/Twitter cards; `sitemap.xml` (14 URLs); IndexNow on
push; Plausible for visits and the `calculate` / `email_signup` events.

## 6. Current Plus / API architecture

Plus is a client-side questionnaire with bespoke question sets per country
(`plus-questions.js`) and a rule library (`plus-engine.js`) that produces findings
estimated at the user's marginal rate. Saving is optional and goes to the Plus Worker
(`api/`), which stores no identity, hashes the secret token, rate-limits by salted IP
hash, sweeps expired rows and caps body size. **Plus is out of scope for India in this
release** (it would need its own researched question set); the Plus page is changed to
say so instead of offering India and failing.

## 7. Current deployment architecture

* Website: push to `main` → GitHub Pages (no build step on the server; generated files
  are committed). IndexNow runs on every push to `main`.
* Plus API: `npx wrangler deploy` from `api/` by hand → `taxcal-plus-api.onepanda2.workers.dev`.
* No CI.

## 8. Identified bugs (verified)

| # | Bug | Evidence / effect |
| --- | --- | --- |
| B1 | **FX table has no CAD or AUD**, and `convert()` falls back to `1`. | Canada and Australia are converted at USD parity in the comparison bars, the country-page comparison sentences and the published `/tax-by-country/` ranking (both shown on "$63,500" — the same figure as the US). |
| B2 | **Share card reads `r.usState`**, which the engine never returns. | US cards render "United States · undefined". |
| B3 | **Germany uses 2025 ceilings and rates labelled 2026**, applies the tariff to **gross pay**, and approximates §32a with straight-line brackets. | 2026 BBG are €69,750 (KV/PV) and €101,400 (RV/AV), not €66,150/€96,600; employee rate is 21.15% (21.75% childless) after the 2.9% average Zusatzbeitrag; the tariff applies to taxable income after the Werbungskosten- and Sonderausgaben-Pauschbeträge and deductible social contributions. At €55,000 the old engine charged €10,801 income tax; the statutory formula on the actual base gives about €8,000. |
| B4 | **France applies the barème to 90% of gross**, ignoring deductible social contributions; no décote. | At €45,000 the old engine charged €5,254 IR; with net imposable salary the barème gives under €3,000. |
| B5 | **Italy applies IRPEF to gross** (INPS not deducted), uses a flat €1,900 credit, and omits the 2025+ cuneo fiscale measures and the +1% INPS above €56,224. | Overstates IRPEF for most incomes. |
| B6 | **Spain does not deduct social security** from the IRPF base and omits the *reducción por rendimientos del trabajo*; 2026 SS rate/ceiling outdated. | 2026: 6.50% employee (incl. 0.15% MEI), base máxima €5,101.20/month. |
| B7 | **Canada omits the CPP/EI and Canada Employment Amount credits**, the enhanced-CPP deduction, the Ontario surtax and Health Premium, and the **Quebec abatement**; Quebec uses CPP/EI instead of QPP/QPIP/EI-QC. | Quebec federal tax overstated by ~16.5%; Ontario misses up to $900 OHP. |
| B8 | **Australia omits LITO**, the Medicare-levy low-income reduction and the new **$1,000 standard deduction for work-related expenses (law from 2026-27)**. | Overstates tax for low and middle incomes. |
| B9 | **Ireland applies 4.35% PRSI to all of 2026**; it applies only from 1 Oct 2026 (4.2% before). | Small overstatement. |
| B10 | **Netherlands approximates the arbeidskorting build-up linearly.** | Wrong below €45,592. |
| B11 | **US state income tax is a proxy** (federal taxable income as the state base, single brackets even for joint filers, no state credits; CA SDI omitted; CA brackets are 2025's) but is labelled "known rate". | Overclaims precision. |
| B12 | Website copy says direct tax is computed "precisely" for every country. | Not true for the proxies above. |
| B13 | Stale metadata: `package.json` and `manifest.webmanifest` describe **six** countries; data header says "verified September 2026" while carrying 2025 German values. | — |

## 9. Identified technical debt

* No tests, no CI, no lockfile; regression risk on every rate change.
* Build scripts load the engine with `eval` and a fake `window`.
* Brackets split between engine and data files; no sources, versions or verification
  dates attached to any number.
* Country lists hard-coded in several places (Plus API `COUNTRIES`, compare-page slug map,
  `EX` in the country-page builder, the `['UK','US','NL']` "the" list in two files).
* `compute()` returns the whole country object (tips and all) and a hard-coded Tax Freedom
  Day year.
* One confidence label per line hides which parts are proxies.

## 10. Proposed plugin architecture

```
packages/tax-core/          ← ONE source of truth (ES modules, no dependencies)
  src/rules/<cc>.js         structured TaxRuleSet per jurisdiction: parameters, sources,
                            assumptions, exclusions, confidence, ruleVersion, lastVerified
  src/calc/<cc>.js          pure calculators that read only their rule set
  src/indirect.js           category-fraction indirect-tax estimate (tax-inclusive)
  src/fx.js                 dated approximate FX (ECB reference rates), comparison only
  src/engine.js             compute() for the web, plus the API layer:
                            calculateTax / compareTaxRegimes / getTaxRules / compareCountries
  src/validate.js           strict input validation shared by every caller
  src/browser.js            builds the legacy window.TAXCAL_DATA / window.TaxEngine shape
assets/tax-core.js          GENERATED browser bundle (esbuild IIFE) — loaded by the site
build-*.mjs                 import the core as ESM (no more eval)
mcp/                        Cloudflare Worker: stateless MCP over Streamable HTTP
taxcal-plugin/              portable Agent Plugins package (plugin.json, mcp.json,
                            skills/tax-cal-analysis/SKILL.md, assets/)
tests/                      node:test suites (engine, India, MCP, privacy, package)
```

**Rules of the architecture**

1. The LLM never does tax arithmetic: every number comes from `packages/tax-core`.
2. The browser, the build scripts, the MCP server and the tests all import the same
   modules; the browser gets them through a generated bundle whose freshness is checked
   by a test (`npm test` fails if `assets/tax-core.js` is stale).
3. Every result carries `rule_version`, `last_verified`, sources, assumptions,
   exclusions and **per-component confidence** (`direct_tax`, `social_contributions`,
   `regional_tax`, `indirect_tax`).
4. Material inputs are never silently defaulted. Where a default is the legal default
   or the overwhelmingly common case (India: new regime, resident; UK: rest-of-UK bands)
   it is applied **and reported** in `defaults_applied`; where the population is split
   (US filing status, US state, Canadian province) the input is **required** and the tool
   returns a precise `missing_input` error instead of guessing.

**MCP server** (`mcp/`): a dependency-free Cloudflare Worker implementing MCP over
Streamable HTTP as a **dual-era, stateless** server — the `2026-07-28` revision
(per-request `_meta`, `server/discover`, `Mcp-Method`/`Mcp-Name` header validation,
`resultType`, cacheable `tools/list`) and the initialize-based `2025-11-25`,
`2025-06-18` and `2025-03-26` revisions (no session IDs issued). JSON responses only;
`GET`/`DELETE` → 405. Tools: `calculate_tax`, `compare_tax_regimes`, `get_tax_rules`,
`compare_countries`, all `readOnlyHint: true`, `destructiveHint: false`,
`openWorldHint: false`, `idempotentHint: true`, each with an `outputSchema` and
`structuredContent`. Security: Origin allow-list (403), 32 KB body cap, strict argument
validation (unknown keys, NaN/Infinity, prototype-pollution keys, oversized values
rejected), per-IP rate limiting (Cloudflare rate-limit binding when configured, in-memory
fallback), security headers, no CORS, **no logging of arguments** — one structured log
line per call with tool, country, outcome and duration only. `/health` for monitoring,
`/.well-known/openai-apps-challenge` serves the OpenAI domain-verification token from an
environment variable.

**Plugin package** (`taxcal-plugin/`): Agent Plugins 1.0.0 `plugin.json` (OpenAI
presentation and review data under `extensions["com.openai"]`), `mcp.json`
(`streamable-http`), the `tax-cal-analysis` skill, square logo and composer icon. A build
script zips it to `dist/taxcal-plugin.zip`; a test validates both manifests against the
official Agent Plugins JSON schemas and OpenAI's documented listing limits.

## 11. India integration plan

Researched from the Income-tax Act, 2025 (as amended by the Finance Act, 2026), the
Finance Act 2026 First Schedule, CBDT transition FAQs, GST Council / CBIC notifications
and PPAC/IOCL fuel price build-ups (full citations in `docs/TAX_RULE_SOURCES.md` and the
model in `docs/INDIA_TAX_MODEL.md`).

* **Two rule sets, never mixed:**
  * `IN-2026-27` — **Tax Year 2026-27** (1 Apr 2026 – 31 Mar 2027) under the
    **Income-tax Act, 2025**: §202 new regime (default), §19 standard deduction
    (₹75,000 new / ₹50,000 old), §156 rebate (₹60,000 up to ₹12 lakh with marginal relief;
    ₹12,500 up to ₹5 lakh in the old regime, residents only), Finance Act 2026 surcharge
    (10/15/25%, 37% old regime only, marginal relief) and 4% Health and Education Cess.
  * `IN-2025-26` — legacy **FY 2025-26 / AY 2026-27** under the **Income-tax Act, 1961**
    (§115BAC, §87A, §16(ia)); same amounts, different law. "AY 2026-27" maps here.
* Scope: individual, salaried, resident or non-resident, age band for the old regime,
  new vs old regime comparison with user-supplied old-regime deductions (80C/§123,
  80D/§126, NPS 80CCD(1B), home-loan interest, HRA exemption, other) capped at their
  statutory limits.
* Explicitly out of scope (clear `unsupported_scope` errors): business/professional
  income, capital gains, HUF/firms/companies/trusts, foreign income/assets, TDS/GST
  filing, ITR generation.
* Not modelled and stated: EPF (savings, not tax), ESI, state professional tax (≤ ₹2,500).
* Indirect tax: GST 2.0 (from 22 Sep 2025) category assumptions labelled
  known rate / estimate / rough; electricity (GST-exempt, state duty varies) left out of
  the utilities rate; fuel from the PPAC/IOCL Delhi price build-up (central excise
  ₹11.90/l after the March 2026 cut + Delhi VAT 19.40%), labelled *rough*.
* Website: India everywhere a country list exists, an India landing page at
  `/country/india/` (regime table at common salaries), an India-only regime card in the
  calculator, deep link `#c=IN`, sitemap, JSON-LD, metadata. The generic
  "you could keep up to" card is hidden for India (the new regime has almost no
  deductions, so the heuristic would mislead) and replaced by the regime comparison.

## 12. Testing plan

`node --test` (no test framework dependency). Suites:

* **Regression** — the pre-change engine output for 885 cases is frozen in
  `tests/fixtures/baseline-engine-v18.json`. Unchanged models (UK; US federal + FICA; US
  states other than California; every indirect-tax estimate) must match it exactly.
  Deliberately changed countries are asserted against new, sourced golden values.
* **India** — every slab edge (just below / at / just above), rebate edges (₹12,00,000,
  ₹12,70,588 marginal-relief end, ₹5,00,000 old), surcharge thresholds with marginal
  relief (₹50 lakh, ₹1 crore, ₹2 crore, ₹5 crore), cess, non-resident, senior bands, both
  rule sets, regime comparison and break-even deductions; golden figures from the Budget
  2025-26 annex (same slabs).
* **Boundaries** for every bracket table in every country; zero, very low and very high
  incomes; malformed and missing inputs.
* **Validation** — negative/NaN/Infinity/strings/objects, unknown keys, `__proto__`,
  oversized payloads, bad regions/filing statuses/years.
* **MCP** — schema shape, every tool, both protocol eras, header validation, error codes,
  notifications (202), GET/DELETE (405), Origin (403), body cap (413), rate limit (429);
  conformance against the official `@modelcontextprotocol/sdk` client.
* **Privacy** — no argument values ever reach logs (spy on `console`).
* **Package** — `plugin.json` / `mcp.json` validate against the Agent Plugins 1.0.0
  schemas; OpenAI listing limits (short description ≤ 30 chars, ≤ 3 prompts ≤ 128 chars,
  HTTPS URLs, square images ≥ 48 px); no secrets; ZIP contents.
* **Site** — generated bundle is fresh; every page builds; sitemap ↔ pages; share-card
  model uses only engine fields.

## 13. Deployment plan

1. `npm test` green; `npm run build:all` regenerates the bundle, pages, single-file builds
   and `docs/TAX_RULE_SOURCES.md`.
2. Website: push to `main` (GitHub Pages). CI (`.github/workflows/ci.yml`) runs the tests
   on every push and pull request.
3. MCP: `npx wrangler@4 deploy --config mcp/wrangler.toml --env staging`, smoke-test with
   `npm run mcp:smoke -- <url>`, then `--env=""` for production →
   `https://taxcal-mcp.onepanda2.workers.dev/mcp` (Workers Free plan; no database).
   `.github/workflows/mcp-health.yml` re-runs the smoke test every six hours once the
   repository variable `MCP_URL` is set.
4. Plugin: `npm run plugin:zip` → upload `dist/taxcal-plugin.zip` in the OpenAI dashboard
   (see `docs/OPENAI_SUBMISSION.md`).

| Step | Status |
| --- | --- |
| Audit + research + this plan | done |
| Shared core + bug fixes + regression tests | done (`packages/tax-core`, B1–B13 fixed or documented) |
| India | done (Tax Year 2026-27 + legacy FY 2025-26, both regimes, `/country/india/`) |
| MCP server | done (`mcp/`; tested with the official SDK v1 and v2 clients and inside workerd) |
| Plugin package + skill + docs | done (`taxcal-plugin/`, `docs/`) |
| Privacy/terms/support pages, README, stale-claim sweep | done |
| Golden tests with sources + every bracket edge | done (`tests/golden.test.mjs`) |
| Production deploy of the MCP Worker | needs the owner's Cloudflare login (`docs/OPENAI_SUBMISSION.md` §2) |
| OpenAI submission | needs the owner's verified OpenAI organisation and a walkthrough video (§1, §5) |

---

### Changelog

* 2026-10-02 — Plan written; baseline fixture of the v18 engine committed.
* 2026-10-02 — Shared engine (`packages/tax-core`) replaces `assets/tax-data.js` and
  `assets/tax-engine.js`; all ten countries re-verified (v2 rule sets); India added.
* 2026-10-02 — MCP server (`mcp/`), dual protocol era (2026-07-28 and 2025), strict
  validation, argument-free logging, rate limiting and security headers.
* 2026-10-02 — Plugin package (`taxcal-plugin/`), skill, submission files, privacy page
  for the three surfaces, `/terms/`, `/support/`, golden tests, generated source list,
  staging environment and health workflow.
