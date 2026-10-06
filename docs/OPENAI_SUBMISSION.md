# Submitting Tax.cal to OpenAI

A step-by-step checklist for listing the Tax.cal plugin in ChatGPT. It is based on OpenAI's plugin documentation as checked on 2 October 2026: [Package your plugin](https://developers.openai.com/plugins/build/plugins), [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission), [Remote MCP server review requirements](https://developers.openai.com/plugins/deploy/app-review), [Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors) and [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt). Those pages are the source of truth. If anything below disagrees with them, follow OpenAI's page and update this file.

Everything that can be prepared in the repository is prepared. The steps marked **(owner)** need the owner's own accounts and cannot be done from code.

## 0. What is already prepared

| Item | Where |
|---|---|
| Plugin package (manifest, MCP config, skill, logo, README) | `taxcal-plugin/` → `npm run plugin:zip` → `dist/taxcal-plugin.zip` |
| Name, subtitle, description, category, capabilities, URLs, starter prompts, colours | `taxcal-plugin/plugin.json` → `extensions["com.openai"].interface` |
| Five positive and three negative test cases | `plugin.json` → `review.test_cases` (also `mcp/chatgpt-app-submission.json`) |
| Tool hints with justifications | `mcp/chatgpt-app-submission.json` (the submission form's import file) |
| Release notes | `plugin.json` → `publication.release_notes` |
| Website, support, privacy and terms pages | https://taxcal.siddheshthapa.com/, `/support/`, `/privacy/`, `/terms/` |
| MCP server code and config | `mcp/` (Cloudflare Worker), `mcp/wrangler.toml` |
| Domain-verification endpoint | `GET /.well-known/openai-apps-challenge`, which serves the `OPENAI_APPS_CHALLENGE` secret |
| Health check | `GET /health`, plus `.github/workflows/mcp-health.yml` |

**No reviewer account is needed.** The server has no authentication, no sign-in and no user data, so there are no credentials to give reviewers. Do not create a demo account or put any credentials in the package or the form.

## 1. Prerequisites (owner)

- [ ] An OpenAI Platform organization that has completed **organization verification**.
- [ ] Your user has the **`api.apps.write`** permission (to create drafts and submit) and **`api.apps.read`** (to see review status). Organization owners have both.
- [ ] The Cloudflare account that runs `taxcal-plus-api` (workers.dev subdomain `onepanda2`).

## 2. Deploy the MCP server (owner)

The submitted server must be on a public HTTPS domain. Local or test endpoints are not accepted.

```bash
npm ci && npm test                                   # everything green first
npx wrangler@4 login
npx wrangler@4 deploy --config mcp/wrangler.toml --env staging
npm run mcp:smoke -- https://taxcal-mcp-staging.onepanda2.workers.dev/mcp
npx wrangler@4 deploy --config mcp/wrangler.toml                 # production: no --env
npm run mcp:smoke -- https://taxcal-mcp.onepanda2.workers.dev/mcp
```

With no `--env`, Wrangler uses the top-level (production) settings and warns that no environment was named; that warning is expected. Do not use `--env=""`: Windows PowerShell mangles it.

- [ ] The smoke test passes against production.
- [ ] `curl https://taxcal-mcp.onepanda2.workers.dev/health` shows 11 countries and the expected rule versions.
- [ ] Optional: set the repository variable `MCP_URL` to `https://taxcal-mcp.onepanda2.workers.dev/mcp` (GitHub → Settings → Secrets and variables → Actions → Variables) to turn on the six-hourly health check.

If Wrangler prints a different URL, rebuild the ZIP with `npm run plugin:zip -- --mcp-url <url>` and use that URL everywhere below.

## 3. Try it in ChatGPT before submitting (owner)

Follow OpenAI's [Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt) to add `https://taxcal-mcp.onepanda2.workers.dev/mcp` as a developer connection. Run every prompt in §7 and check the answers against the expected results. Expect the model to:

- call a tool for every figure;
- say so whenever it fills in an input itself. In testing on 5–6 October 2026, given no US filing status, ChatGPT assumed "single" and said so instead of asking. The review cases and the video therefore always state the filing status (P4);
- keep VAT/GST estimates separate from direct tax;
- show the tax year, rule version and a source;
- include at most one link to Tax.cal.

## 4. Build the ZIP

```bash
npm run plugin:zip        # → dist/taxcal-plugin.zip (refuses to build if any check fails)
```

The ZIP contains `plugin.json`, `mcp.json`, `README.md`, `skills/tax-cal-analysis/**` and `assets/logo.png` / `assets/icon.png`. It contains no secrets, credentials, local paths or test files. `tests/plugin.test.mjs` checks this.

## 5. Record the walkthrough video (owner)

MCP review needs a **reviewer-accessible video walkthrough**. In `plugin.json` this is `extensions["com.openai"].review.demo_recording_url`, which is left out until the video exists. Record about three minutes following the script in §8. Upload it somewhere a reviewer can open without signing in, such as an unlisted YouTube video. Then either add the URL to `plugin.json` and rebuild the ZIP, or paste it into the form.

## 6. Upload and submit (owner)

In the OpenAI Platform dashboard, following [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission):

- [ ] Create the plugin and upload `dist/taxcal-plugin.zip`. The manifest imports the listing, the test cases and the release notes. If the form offers an import for `chatgpt-app-submission.json`, upload `mcp/chatgpt-app-submission.json` to fill in the tool-hint justifications.
- [ ] **MCP server URL:** choose a **universal** URL (one endpoint for all users), `https://taxcal-mcp.onepanda2.workers.dev/mcp`. Not "Template".
- [ ] **Authentication:** none.
- [ ] **Domain verification:** copy the token the dashboard shows, then:

  ```bash
  npx wrangler@4 secret put OPENAI_APPS_CHALLENGE --config mcp/wrangler.toml   # no --env: production
  curl https://taxcal-mcp.onepanda2.workers.dev/.well-known/openai-apps-challenge   # must print exactly the token
  ```

  Then complete the challenge in the dashboard.
- [ ] **Tools:** check that all four tools show `readOnlyHint: true`, `openWorldHint: false` and `destructiveHint: false`, each with its justification from `chatgpt-app-submission.json`.
- [ ] **Test cases:** exactly 5 positive and 3 negative cases, already in the manifest. Uploads accept partial lists, so confirm all 8 imported.
- [ ] **Walkthrough video URL** from §5.
- [ ] **Release notes** imported from `publication.release_notes`.
- [ ] **Availability:** `publication.countries` is left out, so OpenAI's default availability applies. Add an allow-list such as `["IN", "GB", "US"]` only to restrict it deliberately.
- [ ] **Commerce:** none (`commerce: false`). Tax.cal sells nothing in ChatGPT.
- [ ] Submit. If the upload reports an error, see [Plugin submission errors](https://developers.openai.com/plugins/deploy/submission-errors).

## 7. Test cases (as submitted)

| # | Prompt | Tool | Expected |
|---|---|---|---|
| P1 | I earn ₹15 lakh salary in India. Estimate my income tax. | `calculate_tax` | ₹97,500 (new regime, Tax Year 2026-27). States the new regime and resident assumptions, rule version and source |
| P2 | Compare old and new Indian tax regimes for ₹20 lakh. | `compare_tax_regimes` | New ₹1,92,400 vs old ₹4,13,400. Says new is lower on these inputs without calling it better. Break-even about ₹7.08 lakh |
| P3 | I make £60,000 in the UK. What is my estimated total tax burden including VAT? | `calculate_tax` | Income tax £11,432 and NI £3,210.60. VAT shown separately as a labelled estimate. Assumes England, Wales or Northern Ireland |
| P4 | I make $120k in California, filing single. Estimate federal, FICA and California income tax. | `calculate_tax` | Federal $17,570, CA $6,770.86, FICA and SDI shown separately. Local taxes excluded |
| P5 | What assumptions does Tax.cal use for indirect tax? | `get_tax_rules` | The tax-inclusive category method, the typical spending profile and each country's tax. No calculation |
| N1 | File my Indian income tax return for me. | none | Declines. Calculation-only. Points to the e-filing portal or a professional |
| N2 | Guarantee that I can legally avoid ₹5 lakh of tax. | none | No guarantee. Eligibility depends on circumstances. May offer a regime comparison |
| N3 | Use Tax.cal to submit a tax payment to the government. | none | Refuses. Cannot pay, move money or contact authorities |

More cases, covering clarifications, malformed input and unsupported countries, regions, years and scope, are in `taxcal-plugin/tests/cases.json`.

## 8. Reviewer walkthrough script (for the video)

1. **Intro (10 s).** "Tax.cal estimates tax on a salary in 11 countries with deterministic rules. ChatGPT explains; Tax.cal calculates. No sign-in."
2. **P1.** Ask the India ₹15 lakh prompt. Point out that the tool was called, the ₹97,500 result, the "new regime / resident" defaults, Tax Year 2026-27, `IN-2026-27-v1` and the Income Tax Department source.
3. **P2.** Ask for the regime comparison at ₹20 lakh. Show both columns, the ~₹7.08 lakh break-even and the wording "lower estimated tax", not "better".
4. **P4.** Ask "I make $120k in California, filing single. Estimate federal, FICA and California income tax." Show federal $17,570 and California $6,770.86, with Social Security, Medicare and SDI as separate lines, and that local city taxes are excluded.
5. **P3.** Ask the UK prompt. Show income tax and NI as calculated figures, and VAT as a separate estimate with its confidence.
6. **P5.** Ask about the indirect-tax assumptions. Show the overview from `get_tax_rules`.
7. **Negatives.** Ask N1, N2 and N3 in turn. Show the refusals and that no tool runs.
8. **Privacy (10 s).** Open https://taxcal.siddheshthapa.com/privacy/#chatgpt: "inputs are sent to calculate and are not retained".

## 9. Instructions for reviewers (paste into the form's notes)

> Tax.cal needs no account, sign-in or credentials. All four tools are read-only and deterministic: the same inputs always return the same figures, with no side effects, and no outbound calls. Supported: salary income in the UK (not Scotland), US (filing status and state required), Canada (province required), Australia, Ireland, Germany, France, the Netherlands, Spain, Italy and India (Tax Year 2026-27 and the legacy FY 2025-26). Expected figures for the test prompts are in the test cases. Unsupported requests (other countries, business income, filing or paying tax) return a clear error or are declined. The server stores nothing and does not log tool arguments. Health: https://taxcal-mcp.onepanda2.workers.dev/health.

## 10. After approval

- Publish when ready. Keep the production server compatible with the **published** tool definitions: OpenAI periodically fetches the tools and compares descriptions, schemas and annotations.
- Data-only updates (new rule numbers, same tools) can be deployed directly. Changes to tool names, descriptions, schemas or annotations need a new submission, and the live server must stay compatible while the update is held. See `docs/UPDATING_TAX_RULES.md`, step 9.
- Watch the health workflow and `npx wrangler@4 tail taxcal-mcp`.
