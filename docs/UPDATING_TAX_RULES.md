# Updating tax rules

Tax law changes every year. This is the procedure for a new tax year or a mid-year change. All the numbers are in one place, `packages/tax-core/src/rules/<country>.js`, and the website, the country pages, the comparison page, the docs and the MCP server are all generated from them or import them. Nothing year-specific belongs in front-end strings.

**Rule of thumb:** expected values in tests are worked out by hand from the source, never copied from the engine's output.

## The 11 steps

### 1. Find the official sources

Use the authority itself: legislation, the tax authority's rate pages, payroll formulas (HMRC, IRS revenue procedures, CRA T4127, ATO, Revenue.ie, BMF/EStG, impots.gouv/economie.gouv, Belastingdienst, AEAT/BOE, Agenzia Entrate, Income Tax Department / Finance Act / Gazette of India). Use secondary compilations only where no single official table exists (for example US state schedules), and label them as secondary in the source entry.

### 2. Update the structured data

In `rules/<country>.js`, add a new rule set keyed by its tax year (for example `'2027'` or `'2027-28'`), usually by copying the current one, and change:

- the rates, thresholds, allowances, credits and caps;
- `taxYear`, `taxYearLabel`, `legalBasis`, `currency`;
- `ruleVersion`: `<CC>-<year>-v1` for a new year, or bump `-vN` when you correct an existing year;
- `status`: the new set becomes `current`, and the old one becomes `legacy` if it is kept;
- `assumptions`, `exclusions` and `confidence` if the modelling changed;
- the indirect-tax category rates and reasons if VAT/GST or fuel duty changed.

Then point `DEFAULT_YEAR` at the new year and add any year aliases (India's `YEAR_ALIASES`).

### 3. Update the source metadata

Every rule set has `sources: [{ id, title, publisher, url, covers }]`. `covers` says which rule the source supports, with section numbers where they exist. Remove sources that no longer apply. Never leave a number without a source, or without a stated Tax.cal assumption.

### 4. Update the effective dates

Set `period: { start, end }` to the first and last day of the tax year, and set `lastVerified` to the date you checked the sources. These dates appear in every result (`tax_year_period`, `last_verified`) and in `docs/TAX_RULE_SOURCES.md`.

### 5. Update the tests

- `tests/engine-countries.test.mjs` and `tests/india.test.mjs`: hand-calculated values just below, at and just above every changed threshold.
- `tests/fixtures/golden.json`: worked examples with `source_ids`, `checked`, `tolerance` and `method`. Use the authority's own examples where it publishes them.
- `taxcal-plugin/plugin.json` review cases, `taxcal-plugin/tests/cases.json` and `mcp/chatgpt-app-submission.json`, if a quoted amount changes. `tests/plugin.test.mjs` fails until they match the engine.
- `tests/golden.test.mjs` checks every bracket table automatically, including new ones.

### 6. Run the regression suite

```bash
npm test
```

`tests/engine-regression.test.mjs` compares against `tests/fixtures/baseline-engine-v18.json`. When a change is deliberate, explain it in the test (as the UK taper fix is) rather than regenerating the baseline blindly.

### 7. Rebuild the website

```bash
npm run build:all
```

This rebuilds `assets/tax-core.js` (the browser bundle), the country pages, the guides, the comparison page, the single-file and Artifact builds, and `docs/TAX_RULE_SOURCES.md`. Bump the asset version and the service-worker cache together (`sw.js` `taxcal-vNN` and the `?v=NN` query strings in `index.html`, `plus/index.html`, `privacy/`, `terms/` and `support/`). `tests/site.test.mjs` checks that they match.

### 8. Rebuild the country pages

These are part of `build:all`. Check `country/<slug>/index.html` for the new year in the title, the worked examples and the FAQ. Update the year in the static FAQ and JSON-LD of `index.html` if it is mentioned there.

### 9. Redeploy the MCP server

```bash
npx wrangler@4 deploy --config mcp/wrangler.toml --env staging
npm run mcp:smoke -- https://taxcal-mcp-staging.onepanda2.workers.dev/mcp
npx wrangler@4 deploy --config mcp/wrangler.toml --env=""
npm run mcp:smoke -- https://taxcal-mcp.onepanda2.workers.dev/mcp
```

Bump `SERVER_VERSION` in `mcp/src/app.js` when the server's behaviour changes.

**OpenAI compares the live tool definitions with the published ones.** If the tool descriptions or schemas change (for example the tax-year text in `mcp/src/tools.js`), submit an update in the OpenAI Platform and keep the live server compatible with the published definition until it is approved. A data-only update (new numbers, same tools) needs no resubmission.

### 10. Verify the plugin output

In ChatGPT, run the five positive and three negative review prompts (`taxcal-plugin/plugin.json`). Check the tax year, `rule_version`, `last_verified` and the figures against your hand calculation.

### 11. Update the plugin documentation

Update `taxcal-plugin/skills/tax-cal-analysis/` (year terminology and the examples' quoted figures), `taxcal-plugin/README.md`, `docs/INDIA_TAX_MODEL.md` for India, `docs/RELEASE_NOTES.md` and the plugin `version` and `publication.release_notes` in `plugin.json`. Then run `npm run plugin:zip` and upload the new ZIP if the listing changed.

## Mid-year changes

Some changes start part-way through a year: Irish PRSI from 1 October 2026, Canadian provincial changes from 1 July, Indian fuel excise from 27 March 2026. Either blend them in proportion to the months they apply (as Irish PRSI is), or apply them from their start date and state that in `assumptions`. Bump the rule version (`-v2`, `-v3`) and `lastVerified`.

## Adding a country

1. Write `rules/<cc>.js` with `PROFILE`, `RULES` and `DEFAULT_YEAR`.
2. Write `calc/<cc>.js`, returning `{ taxableIncome, incomeTax, social, regional, lines, notes }`.
3. Register it in `countries.js` `ORDER` and `COUNTRIES`.
4. Add the currency to `fx.js`.
5. Add tests and run `npm run build:all`.

The site test fails until the country page, the sitemap entry and the bundle exist.
