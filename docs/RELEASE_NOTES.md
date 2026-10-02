# Release notes

## 2026-10-02: Tax.cal 2.0 (website), MCP server 1.0, ChatGPT plugin 1.0

### Website

- **India added**, the 11th country. It uses Tax Year 2026-27 under the Income-tax Act, 2025. The new regime is the default, with the old regime and the deductions at which they cost the same shown alongside. It covers residency and age band, rebate and surcharge marginal relief, 4% cess, GST and fuel-duty estimates, and the new page `/country/india/`. The legacy FY 2025-26 (AY 2026-27) rules are available under the 1961 Act.
- **One engine.** `packages/tax-core` replaces `assets/tax-data.js` and `assets/tax-engine.js`, and the browser loads a generated bundle (`assets/tax-core.js`). The country pages, guides, comparison page and single-file builds all use it.
- **Every country re-verified for 2026**, from official sources:
  - Germany: §32a formula on taxable income, 2026 contribution ceilings.
  - France: barème on net taxable salary, décote.
  - Italy: IRPEF after INPS, the 2026 employee and cuneo credits.
  - Spain: social security deducted, work-income reduction.
  - Canada: the federal and provincial credits, Ontario surtax and Health Premium, and Quebec's QPP, QPIP and abatement.
  - Australia: LITO, Medicare low-income shading, the $1,000 standard deduction.
  - Ireland: PRSI 4.2% then 4.35% from October.
  - Netherlands: the exact labour-credit segments.
  - UK: personal-allowance taper on taxable income.
  - California: 2026 schedule and SDI.
- **Fixes:**
  - Canada and Australia were converted at US-dollar parity in comparisons. Exchange rates are now dated ECB rates, and an unknown currency throws instead of defaulting to 1.
  - The share card printed "undefined" for US states.
  - The UK taper was applied at the wrong point.
  - Copy claimed "precise" figures for proxies.
  - Offline, the calculator could open as whichever page was visited last, because the service worker cached every page as the home page. Pages are now cached under their own URLs.
- **Transparency:** each rule set has a version, a tax-year period, a last-verified date and its sources (`docs/TAX_RULE_SOURCES.md`, generated). Confidence is reported per component. The US state proxy is labelled low confidence.
- **Pages:** new `/terms/` and `/support/`. The privacy page now covers the website calculator, Tax.cal Plus and the ChatGPT app separately.
- Service-worker cache `taxcal-v19`.

### MCP server 1.0 (`mcp/`)

- A stateless, read-only Cloudflare Worker with four tools: `calculate_tax`, `compare_tax_regimes`, `get_tax_rules` and `compare_countries`. All have output schemas and read-only annotations.
- It speaks MCP 2026-07-28 (`server/discover`, per-request metadata, header validation) and 2025-11-25 / 2025-06-18 / 2025-03-26.
- Inputs are strictly validated. Missing material inputs are asked for. No inputs are stored or logged, and there is rate limiting, a 32 KB body cap and security headers.

### ChatGPT plugin 1.0 (`taxcal-plugin/`)

- Tax estimates for salaried employees in 11 countries, a side-by-side comparison of India's new and old regimes for Tax Year 2026-27, lookups of the rules and sources, and cross-country comparisons. Every result states the tax year, rule version, confidence for each part and official sources.
- The `tax-cal-analysis` skill makes the model call a tool for every figure, ask only for missing material inputs, keep direct and indirect tax separate, handle India's year terminology, and decline filing, payment and advice requests.

### Engineering

- 120 automated tests, run in CI on every push:
  - golden figures with sources, and every bracket edge;
  - India;
  - validation;
  - the MCP server with the official SDK clients;
  - log privacy;
  - the plugin package;
  - site consistency.
- `npm run plugin:zip` builds a reproducible submission ZIP. A staging Worker environment and a six-hourly health check are included.
